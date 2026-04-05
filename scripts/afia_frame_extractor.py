#!/usr/bin/env python3
"""
afia_frame_extractor.py
-----------------------
Extracts high-quality frames from Afia 1.5L bottle video files,
filters blurry frames, deduplicates near-duplicates, and organizes
output into angle-labeled folders.

Required:
    pip install opencv-python-headless numpy

Optional (better deduplication):
    pip install Pillow imagehash

Optional (progress bars):
    pip install tqdm

Usage examples:
    # Process a folder of videos — auto-detect angle from filename
    python scripts/afia_frame_extractor.py --input ./bottle_videos --output ./frames

    # Single video with explicit angle label
    python scripts/afia_frame_extractor.py --input front.mp4 --angle front --output ./frames

    # PNG output, extract every 1 second, stricter blur filter
    python scripts/afia_frame_extractor.py --input ./videos --output ./frames \\
        --format png --interval 1.0 --blur-threshold 150

    # Use FFmpeg for extraction (higher quality, supports more codecs)
    python scripts/afia_frame_extractor.py --input ./videos --output ./frames --use-ffmpeg
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterator, Optional

import cv2
import numpy as np

# ── Optional dependencies ──────────────────────────────────────────────────

try:
    import imagehash
    from PIL import Image as PILImage
    HAS_IMAGEHASH = True
except ImportError:
    HAS_IMAGEHASH = False

try:
    from tqdm import tqdm as _tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

# ── Constants ──────────────────────────────────────────────────────────────

VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".mts", ".ts"}

DEFAULT_INTERVAL_SEC: float = 0.5       # extract a frame every N seconds
DEFAULT_BLUR_THRESHOLD: float = 100.0   # Laplacian variance; below = blurry
DEFAULT_HASH_THRESHOLD: int = 10        # Hamming distance; below = near-duplicate
DEFAULT_MIN_HEIGHT: int = 1080          # upscale if frame height is below this

# Keyword → canonical angle name
ANGLE_MAP: dict[str, list[str]] = {
    "front":    ["front", "frt", "f-view", "0deg", "0°"],
    "back":     ["back", "rear", "behind"],
    "side":     ["side", "lateral", "90deg", "90°", "side-90"],
    "side-45":  ["side-45", "side45", "45deg", "45°", "diagonal", "quarter"],
    "top":      ["top", "overhead", "bird", "above", "topdown", "top-down"],
    "bottom":   ["bottom", "base", "under", "below"],
    "label":    ["label", "barcode", "text", "code"],
}

logging.basicConfig(
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    level=logging.INFO,
)
log = logging.getLogger("afia_extractor")


# ── Utilities ──────────────────────────────────────────────────────────────

def detect_angle(path: Path) -> str:
    """Infer angle label from filename keywords; fallback to stem."""
    stem = path.stem.lower().replace("-", " ").replace("_", " ")
    for canonical, keywords in ANGLE_MAP.items():
        for kw in keywords:
            if re.search(r"\b" + re.escape(kw.replace("-", " ").replace("_", " ")) + r"\b", stem):
                return canonical
    # No keyword found — use sanitised filename stem
    safe = re.sub(r"[^\w-]", "-", path.stem).strip("-")
    return safe or "unknown"


def blur_score(frame_bgr: np.ndarray) -> float:
    """Return Laplacian variance — higher means sharper."""
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def frame_hash(frame_bgr: np.ndarray, use_phash: bool = True) -> str:
    """Return a perceptual or content hash string for deduplication."""
    if use_phash and HAS_IMAGEHASH:
        small = cv2.resize(frame_bgr, (256, 256))
        pil = PILImage.fromarray(cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
        return str(imagehash.phash(pil))

    # Fallback: MD5 of 32×32 grayscale thumbnail
    small = cv2.resize(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY), (32, 32))
    return hashlib.md5(small.tobytes()).hexdigest()


def phash_distance(h1: str, h2: str) -> int:
    """Hamming distance between two hex pHash strings; returns 0–64."""
    try:
        a = int(h1, 16)
        b = int(h2, 16)
        return bin(a ^ b).count("1")
    except ValueError:
        # MD5 fallback: equal or not
        return 0 if h1 == h2 else 65


def ensure_min_height(frame_bgr: np.ndarray, min_height: int) -> np.ndarray:
    """Upscale frame so height >= min_height, preserving aspect ratio."""
    if min_height == 0:
        return frame_bgr
    h, w = frame_bgr.shape[:2]
    if h >= min_height:
        return frame_bgr
    scale = min_height / h
    new_w = int(round(w * scale))
    return cv2.resize(frame_bgr, (new_w, min_height), interpolation=cv2.INTER_LANCZOS4)


def save_frame(
    frame_bgr: np.ndarray,
    dest: Path,
    fmt: str,
    jpeg_quality: int = 95,
) -> None:
    """Write frame to disk as JPEG or PNG."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "png":
        ok = cv2.imwrite(str(dest), frame_bgr, [cv2.IMWRITE_PNG_COMPRESSION, 1])
    else:
        ok = cv2.imwrite(str(dest), frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
    if not ok:
        raise IOError(f"cv2.imwrite failed for {dest}")


# ── FFmpeg-based extraction ────────────────────────────────────────────────

def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def extract_frames_ffmpeg(
    video_path: Path,
    interval_sec: float,
    tmp_dir: Path,
) -> list[Path]:
    """
    Use FFmpeg to extract frames at regular intervals into tmp_dir.
    Returns sorted list of extracted frame paths.
    """
    # Use decimal fps string to avoid non-integer denominators in FFmpeg's fps filter
    fps_val = round(1.0 / interval_sec, 6)
    pattern = str(tmp_dir / "frame_%06d.jpg")
    cmd = [
        "ffmpeg",
        "-loglevel", "error",  # must be before -i
        "-i", str(video_path),
        "-vf", f"fps={fps_val}",
        "-q:v", "1",           # highest JPEG quality
        "-y", pattern,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log.error("FFmpeg error: %s", result.stderr.strip())
        raise RuntimeError(f"FFmpeg failed on {video_path.name}")
    return sorted(tmp_dir.glob("frame_*.jpg"))


def frames_from_ffmpeg(
    video_path: Path,
    interval_sec: float,
) -> Iterator[tuple[int, float, np.ndarray]]:
    """Yield (frame_index, timestamp_sec, bgr_array) using FFmpeg extraction."""
    with tempfile.TemporaryDirectory(prefix="afia_ffmpeg_") as tmp:
        tmp_dir = Path(tmp)
        paths = extract_frames_ffmpeg(video_path, interval_sec, tmp_dir)
        for idx, p in enumerate(paths):
            frame = cv2.imread(str(p))
            if frame is not None:
                yield idx, idx * interval_sec, frame


# ── OpenCV-based extraction ────────────────────────────────────────────────

def frames_from_opencv(
    video_path: Path,
    interval_sec: float,
) -> Iterator[tuple[int, float, np.ndarray]]:
    """Yield (frame_index, timestamp_sec, bgr_array) using OpenCV."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise IOError(f"Cannot open video: {video_path}")

    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_step = max(1, int(round(fps * interval_sec)))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        frame_idx = 0
        extracted_idx = 0

        while True:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ok, frame = cap.read()
            if not ok or frame is None:
                break
            timestamp = frame_idx / fps
            yield extracted_idx, timestamp, frame
            extracted_idx += 1
            frame_idx += frame_step
            if total_frames > 0 and frame_idx >= total_frames:
                break
    finally:
        cap.release()


# ── Per-video processor ────────────────────────────────────────────────────

def process_video(
    video_path: Path,
    output_dir: Path,
    angle: str,
    interval_sec: float,
    blur_threshold: float,
    hash_threshold: int,
    min_height: int,
    fmt: str,
    use_ffmpeg: bool,
    jpeg_quality: int,
    stats: dict,
) -> None:
    angle_dir = output_dir / angle
    angle_dir.mkdir(parents=True, exist_ok=True)

    log.info("Processing %-50s  →  %s/", video_path.name, angle)

    use_phash = HAS_IMAGEHASH
    if not use_phash:
        log.warning("imagehash not installed — using MD5 fallback for deduplication")

    frame_iter = (
        frames_from_ffmpeg(video_path, interval_sec)
        if use_ffmpeg
        else frames_from_opencv(video_path, interval_sec)
    )

    seen_hashes: list[str] = []
    total = blurry = dupes = saved = 0
    stem = video_path.stem

    for idx, ts, frame in frame_iter:
        total += 1

        # ── 1. Blur filter ─────────────────────────────────────────────────
        score = blur_score(frame)
        if score < blur_threshold:
            log.debug("  [blur] frame %04d  score=%.1f  <  %.1f", idx, score, blur_threshold)
            blurry += 1
            continue

        # ── 2. Near-duplicate filter ───────────────────────────────────────
        h = frame_hash(frame, use_phash)
        is_dupe = False
        for prev_h in seen_hashes:
            if use_phash:
                if phash_distance(h, prev_h) < hash_threshold:
                    is_dupe = True
                    break
            else:
                if h == prev_h:
                    is_dupe = True
                    break

        if is_dupe:
            dupes += 1
            continue

        seen_hashes.append(h)

        # ── 3. Resolution check ────────────────────────────────────────────
        frame = ensure_min_height(frame, min_height)

        # ── 4. Save ────────────────────────────────────────────────────────
        filename = f"{stem}_t{ts:07.2f}s_f{idx:04d}.{fmt}"
        save_frame(frame, angle_dir / filename, fmt, jpeg_quality)
        saved += 1

    log.info(
        "  done  total=%-5d  blurry=%-4d  dupes=%-4d  saved=%-4d",
        total, blurry, dupes, saved,
    )

    stats["total"] += total
    stats["blurry"] += blurry
    stats["dupes"] += dupes
    stats["saved"] += saved
    stats["videos"] += 1


# ── Main ───────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Extract, filter, and organise frames from Afia bottle videos.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument(
        "--input", "-i", required=True,
        help="Path to a single video file OR a directory containing video files.",
    )
    p.add_argument(
        "--output", "-o", default="./frames",
        help="Root output directory (default: ./frames).",
    )
    p.add_argument(
        "--angle", "-a", default=None,
        help=(
            "Override angle label for ALL input videos. "
            "If omitted, the label is inferred from each filename."
        ),
    )
    p.add_argument(
        "--interval", type=float, default=DEFAULT_INTERVAL_SEC, metavar="SEC",
        help=f"Extract one frame every N seconds (default: {DEFAULT_INTERVAL_SEC}).",
    )
    p.add_argument(
        "--blur-threshold", type=float, default=DEFAULT_BLUR_THRESHOLD, metavar="VAL",
        help=(
            f"Laplacian variance threshold (default: {DEFAULT_BLUR_THRESHOLD}). "
            "Lower = keep more frames. Increase to discard more."
        ),
    )
    p.add_argument(
        "--hash-threshold", type=int, default=DEFAULT_HASH_THRESHOLD, metavar="N",
        help=(
            f"pHash Hamming distance threshold (default: {DEFAULT_HASH_THRESHOLD}). "
            "Lower = stricter deduplication (0 = exact only)."
        ),
    )
    p.add_argument(
        "--min-height", type=int, default=DEFAULT_MIN_HEIGHT, metavar="PX",
        help=f"Minimum output frame height in pixels (default: {DEFAULT_MIN_HEIGHT}). Set 0 to disable.",
    )
    p.add_argument(
        "--format", choices=["jpg", "png"], default="jpg",
        help="Output image format (default: jpg).",
    )
    p.add_argument(
        "--jpeg-quality", type=int, default=95, metavar="1-100",
        help="JPEG quality 1–100 (default: 95).",
    )
    p.add_argument(
        "--use-ffmpeg", action="store_true",
        help="Use FFmpeg for frame extraction instead of OpenCV (requires ffmpeg in PATH).",
    )
    p.add_argument(
        "--dry-run", action="store_true",
        help="Scan and report counts without writing any files.",
    )
    p.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable debug-level logging.",
    )
    return p


def collect_videos(input_path: Path) -> list[Path]:
    if input_path.is_file():
        if input_path.suffix.lower() not in VIDEO_EXTENSIONS:
            log.warning("File extension '%s' not in known video extensions.", input_path.suffix)
        return [input_path]
    if input_path.is_dir():
        found = sorted(
            p for p in input_path.rglob("*")
            if p.suffix.lower() in VIDEO_EXTENSIONS
        )
        if not found:
            log.error("No video files found in %s", input_path)
        return found
    log.error("Input path does not exist: %s", input_path)
    return []


def print_summary(stats: dict, output_dir: Path) -> None:
    log.info("─" * 60)
    log.info("Summary")
    log.info("  Videos processed : %d", stats["videos"])
    log.info("  Frames examined  : %d", stats["total"])
    log.info("  Blurry rejected  : %d", stats["blurry"])
    log.info("  Dupes rejected   : %d", stats["dupes"])
    log.info("  Frames saved     : %d", stats["saved"])
    log.info("  Output directory : %s", output_dir.resolve())
    log.info("─" * 60)

    # Write machine-readable summary
    summary_path = output_dir / "extraction_summary.json"
    with open(summary_path, "w", encoding="utf-8") as fh:
        json.dump(
            {
                **stats,
                "output_dir": str(output_dir.resolve()),
                "angle_dirs": [str(p) for p in sorted(output_dir.iterdir()) if p.is_dir()],
            },
            fh,
            indent=2,
        )
    log.info("Summary written to: %s", summary_path)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.verbose:
        log.setLevel(logging.DEBUG)

    if args.use_ffmpeg and not ffmpeg_available():
        log.error("--use-ffmpeg requested but 'ffmpeg' not found in PATH.")
        return 1

    if not HAS_IMAGEHASH:
        log.warning(
            "imagehash / Pillow not installed. "
            "Install with: pip install Pillow imagehash  "
            "for better near-duplicate detection."
        )

    input_path = Path(args.input).expanduser().resolve()
    output_dir = Path(args.output).expanduser().resolve()

    videos = collect_videos(input_path)
    if not videos:
        return 1

    log.info("Found %d video(s) to process.", len(videos))
    output_dir.mkdir(parents=True, exist_ok=True)

    stats: dict = {"videos": 0, "total": 0, "blurry": 0, "dupes": 0, "saved": 0}

    for video_path in videos:
        angle_label = args.angle or detect_angle(video_path)

        if args.dry_run:
            log.info("[dry-run] Would process: %s  →  %s/", video_path.name, angle_label)
            stats["videos"] += 1
            continue

        try:
            process_video(
                video_path=video_path,
                output_dir=output_dir,
                angle=angle_label,
                interval_sec=args.interval,
                blur_threshold=args.blur_threshold,
                hash_threshold=args.hash_threshold,
                min_height=args.min_height,
                fmt=args.format,
                use_ffmpeg=args.use_ffmpeg,
                jpeg_quality=args.jpeg_quality,
                stats=stats,
            )
        except Exception as exc:
            log.error("Failed to process %s: %s", video_path.name, exc, exc_info=args.verbose)

    if stats["videos"] > 0:
        if args.dry_run:
            log.info("[dry-run] %d video(s) would be processed.", stats["videos"])
        else:
            print_summary(stats, output_dir)

    return 0


if __name__ == "__main__":
    sys.exit(main())
