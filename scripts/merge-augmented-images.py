"""
Merge images from oil-bottle-augmented/augmented-output into parent folders.

This script moves all images from augmented-output subdirectories into their
corresponding parent directories in oil-bottle-augmented.

Usage:
  python scripts/merge-augmented-images.py [--dry-run]
"""

import sys
from pathlib import Path
from shutil import move
from tqdm import tqdm

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).parent.parent
AUGMENTED_DIR = PROJECT_ROOT / "oil-bottle-augmented"
OUTPUT_DIR = AUGMENTED_DIR / "augmented-output"

# ── Argument parsing ──────────────────────────────────────────────────────────

args = sys.argv[1:]
DRY_RUN = "--dry-run" in args

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Merge Augmented Images")
    print("=" * 60)
    if DRY_RUN:
        print("DRY RUN — no files will be moved\n")

    if not OUTPUT_DIR.exists():
        print(f"ERROR: {OUTPUT_DIR} does not exist")
        sys.exit(1)

    # Collect all image files to move
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'}
    moves = []

    print(f"Scanning {OUTPUT_DIR.name}...\n")

    for level_dir in sorted(OUTPUT_DIR.iterdir()):
        if not level_dir.is_dir():
            continue

        target_dir = AUGMENTED_DIR / level_dir.name

        # Ensure target directory exists
        if not target_dir.exists():
            print(f"Creating directory: {target_dir.name}")
            if not DRY_RUN:
                target_dir.mkdir(parents=True, exist_ok=True)

        # Collect images to move
        for img_file in level_dir.iterdir():
            if img_file.is_file() and img_file.suffix.lower() in image_extensions:
                target_path = target_dir / img_file.name

                # Check for name conflicts
                if target_path.exists():
                    print(f"WARNING: {target_path.name} already exists in {target_dir.name}, skipping")
                    continue

                moves.append((img_file, target_path))

    if not moves:
        print("\nNo images to move.")
        return

    print(f"Found {len(moves)} images to merge\n")

    # Perform moves
    moved = 0
    errors = 0

    for src, dst in tqdm(moves, unit="img"):
        try:
            if not DRY_RUN:
                move(str(src), str(dst))
            moved += 1
        except Exception as e:
            tqdm.write(f"ERROR moving {src.name}: {e}")
            errors += 1

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"  Images moved    : {moved if not DRY_RUN else f'{moved} (dry run)'}")
    print(f"  Errors          : {errors}")
    print("=" * 60)

    if DRY_RUN:
        print("\nDRY RUN complete — re-run without --dry-run to move files.")
    else:
        print("\n✓ Merge complete!")
        print(f"\nYou can now delete the empty {OUTPUT_DIR.name} directory if desired:")
        print(f"  rmdir /s /q \"{OUTPUT_DIR}\"")


if __name__ == "__main__":
    main()
