"""
Load local video frames into Supabase training_samples table.

Reads from:
  - oil-bottle-frames/      (base frames, source_type='scan')
  - oil-bottle-augmented/   (augmented variants, source_type='augmented')

Folder name encodes remaining oil volume in ml, e.g. "550ml" → 550/1500 × 100 = 36.67%.
"empty" → 0%, "1500ml" → 100%.

Usage:
  python scripts/load-frames-to-supabase.py [--dry-run] [--limit=N] [--frames-only] [--augmented-only]

Requires (in .env at project root or environment):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

The Supabase storage bucket 'training-images' must exist and be public for
the stored URLs to work with the training data loader. Run setup_supabase_storage.py
first if the bucket doesn't exist. To make the bucket public, set it via the
Supabase dashboard: Storage → training-images → Edit bucket → Public ON.
"""

import os
import sys
import hashlib
import json
from pathlib import Path
from typing import Optional

try:
    from supabase import create_client, Client
    from dotenv import load_dotenv
    from tqdm import tqdm
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip install -r scripts/requirements.txt")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

TOTAL_VOLUME_ML = 1500
BOTTLE_SKU = "afia-corn-1.5l"
BUCKET_NAME = "training-images"

PROJECT_ROOT = Path(__file__).parent.parent
FRAMES_DIR = PROJECT_ROOT / "oil-bottle-frames"
AUGMENTED_DIR = PROJECT_ROOT / "oil-bottle-augmented"

# Supported image formats
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'}

# ── Argument parsing ──────────────────────────────────────────────────────────

args = sys.argv[1:]
DRY_RUN = "--dry-run" in args
FRAMES_ONLY = "--frames-only" in args
AUGMENTED_ONLY = "--augmented-only" in args
limit_arg = next((a for a in args if a.startswith("--limit=")), None)
LIMIT: Optional[int] = int(limit_arg.split("=")[1]) if limit_arg else None

# By default, process both folders unless a specific flag is set
PROCESS_FRAMES = not AUGMENTED_ONLY
PROCESS_AUGMENTED = not FRAMES_ONLY

# ── Env ───────────────────────────────────────────────────────────────────────

env_path = PROJECT_ROOT / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_fill_percentage(folder_name: str) -> float:
    """Convert folder name to fill % (0-100). Raises ValueError if unparseable."""
    name = folder_name.lower().strip()
    if name == "empty":
        return 0.0
    if name.endswith("ml"):
        ml = float(name[:-2])
        return round(ml / TOTAL_VOLUME_ML * 100, 2)
    raise ValueError(f"Cannot parse fill level from folder: {folder_name!r}")


def assign_split(filename: str) -> str:
    """Deterministic 80/10/10 train/val/test split by filename hash."""
    h = int(hashlib.md5(filename.encode()).hexdigest(), 16) % 100
    if h < 80:
        return "train"
    elif h < 90:
        return "val"
    return "test"


def storage_url(path: str) -> str:
    """Construct Supabase public URL for a storage path."""
    base = SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/object/public/{BUCKET_NAME}/{path}"


def file_content_type(path: Path) -> str:
    """Return MIME type for image file."""
    suffix = path.suffix.lower()
    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".bmp": "image/bmp",
        ".gif": "image/gif",
        ".webp": "image/webp"
    }
    return mime_types.get(suffix, "image/jpeg")


# ── Supabase client ───────────────────────────────────────────────────────────

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def ensure_bucket_public() -> None:
    """Warn if bucket doesn't exist or isn't public — don't force update."""
    try:
        info = supabase.storage.get_bucket(BUCKET_NAME)
        if not getattr(info, "public", True):
            print(
                f"WARNING: Bucket '{BUCKET_NAME}' is private. "
                "Image URLs won't be accessible for training. "
                "Set it public via Supabase dashboard: Storage → training-images → Edit → Public ON."
            )
    except Exception:
        print(f"WARNING: Could not verify bucket '{BUCKET_NAME}'. Ensure it exists (run setup_supabase_storage.py).")


def load_existing_urls() -> set:
    """Load all image_url values already in training_samples to skip re-insertion."""
    print("Loading existing training_samples URLs...")
    existing = set()
    page = 0
    page_size = 1000
    while True:
        resp = (
            supabase.table("training_samples")
            .select("image_url")
            .range(page * page_size, (page + 1) * page_size - 1)
            .execute()
        )
        rows = resp.data or []
        for row in rows:
            existing.add(row["image_url"])
        if len(rows) < page_size:
            break
        page += 1
    print(f"  Found {len(existing)} existing entries")
    return existing


def upload_image(img_path: Path, storage_path: str) -> bool:
    """Upload image to Supabase Storage. Returns True if uploaded, False if already exists."""
    with open(img_path, "rb") as f:
        content = f.read()
    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            storage_path,
            content,
            file_options={"content-type": file_content_type(img_path), "upsert": "false"},
        )
        return True
    except Exception as e:
        msg = str(e).lower()
        if "already exists" in msg or "duplicate" in msg or "409" in msg:
            return False  # already there, not an error
        raise


def insert_batch(records: list) -> None:
    supabase.table("training_samples").insert(records).execute()


# ── Collection ────────────────────────────────────────────────────────────────

def collect_images(source_dir: Path, source_type: str) -> list:
    """
    Walk source_dir, collect (img_path, fill_pct, storage_path, metadata).
    Skips non-image files and unrecognised folder names.
    """
    items = []
    for level_dir in sorted(source_dir.iterdir()):
        if not level_dir.is_dir():
            continue
        try:
            fill_pct = parse_fill_percentage(level_dir.name)
        except ValueError:
            continue  # skip refs, SVG dirs, etc.

        # Process all supported image formats
        for img_file in sorted(level_dir.iterdir()):
            if not img_file.is_file() or img_file.suffix.lower() not in IMAGE_EXTENSIONS:
                continue

            split = assign_split(img_file.name)
            storage_path = f"{source_type}/{level_dir.name}/{img_file.name}"
            items.append({
                "img_path": img_file,
                "fill_pct": fill_pct,
                "storage_path": storage_path,
                "split": split,
                "level_folder": level_dir.name,
            })
    return items


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Afia — Load Frames into training_samples")
    print("=" * 60)
    if DRY_RUN:
        print("DRY RUN — no data will be written\n")

    ensure_bucket_public()
    existing_urls = load_existing_urls()

    # Collect items to process
    items = []

    if PROCESS_FRAMES:
        if FRAMES_DIR.exists():
            print(f"\nScanning {FRAMES_DIR.name}...")
            items += collect_images(FRAMES_DIR, "scan")
        else:
            print(f"WARNING: {FRAMES_DIR} does not exist, skipping")

    if PROCESS_AUGMENTED:
        if AUGMENTED_DIR.exists():
            print(f"Scanning {AUGMENTED_DIR.name}...")
            items += collect_images(AUGMENTED_DIR, "augmented")
        else:
            print(f"WARNING: {AUGMENTED_DIR} does not exist, skipping")

    print(f"Total images found: {len(items)}")

    if LIMIT:
        items = items[:LIMIT]
        print(f"Applying --limit={LIMIT}: processing {len(items)} images")

    # Filter already-inserted
    to_process = [
        it for it in items
        if storage_url(it["storage_path"]) not in existing_urls
    ]
    print(f"New (not yet in DB): {len(to_process)}")

    if not to_process:
        print("\nNothing to do — all images already in training_samples.")
        return

    # Stats counters
    uploaded = 0
    skipped_storage = 0
    inserted = 0
    errors = 0

    BATCH_SIZE = 50
    batch_records: list = []

    def flush_batch():
        nonlocal inserted
        if not batch_records or DRY_RUN:
            batch_records.clear()
            return
        try:
            insert_batch(batch_records)
            inserted += len(batch_records)
        except Exception as e:
            print(f"\nERROR inserting batch: {e}")
        batch_records.clear()

    print(f"\nProcessing {len(to_process)} images...\n")
    for item in tqdm(to_process, unit="img"):
        img_path: Path = item["img_path"]
        storage_path: str = item["storage_path"]
        fill_pct: float = item["fill_pct"]
        split: str = item["split"]
        level_folder: str = item["level_folder"]
        source_type = "scan" if "scan" in storage_path else "augmented"

        # Upload to storage
        if not DRY_RUN:
            try:
                newly_uploaded = upload_image(img_path, storage_path)
                if newly_uploaded:
                    uploaded += 1
                else:
                    skipped_storage += 1
            except Exception as e:
                tqdm.write(f"UPLOAD ERROR {img_path.name}: {e}")
                errors += 1
                continue
        else:
            uploaded += 1

        url = storage_url(storage_path)

        record = {
            "source_type": source_type,
            "source_id": None,
            "image_url": url,
            "sku": BOTTLE_SKU,
            "label_percentage": fill_pct,
            "weight": 1.0,
            "metadata": {
                "split": split,
                "source_folder": level_folder,
                "filename": img_path.name,
                "total_volume_ml": TOTAL_VOLUME_ML,
            },
        }
        batch_records.append(record)

        if len(batch_records) >= BATCH_SIZE:
            flush_batch()

    flush_batch()  # remaining

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"  Images uploaded to storage : {uploaded}")
    print(f"  Already in storage (skip)  : {skipped_storage}")
    print(f"  Rows inserted              : {inserted if not DRY_RUN else '(dry run)'}")
    print(f"  Errors                     : {errors}")

    # Count totals now in DB
    if not DRY_RUN:
        total_resp = (
            supabase.table("training_samples")
            .select("*", count="exact", head=True)
            .execute()
        )
        total = total_resp.count or "?"
        base_resp = (
            supabase.table("training_samples")
            .select("*", count="exact", head=True)
            .eq("source_type", "scan")
            .execute()
        )
        base_total = base_resp.count or "?"
        print(f"\n  training_samples total     : {total}")
        print(f"  base scans (source='scan') : {base_total}")
        if isinstance(base_total, int) and base_total >= 500:
            print("  ✓ 500-sample threshold reached — ready to run train-fill-regressor.py")
        elif isinstance(base_total, int):
            print(f"  ⏳ Need {500 - base_total} more base scans to reach training threshold")
    print("=" * 60)

    if DRY_RUN:
        print("\nDRY RUN complete — re-run without --dry-run to write data.")


if __name__ == "__main__":
    main()
