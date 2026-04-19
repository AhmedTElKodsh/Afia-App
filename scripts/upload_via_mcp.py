"""
Upload images to Supabase using MCP tools.
This script organizes and uploads training images using the Supabase MCP integration.
"""
import os
import json
import hashlib
from pathlib import Path
from typing import Dict, List
from collections import defaultdict

# Source directories
SOURCE_DIRS = [
    r"d:\AI Projects\Freelance\Afia-App\augmented-output",
    r"d:\AI Projects\Freelance\Afia-App\oil-bottle-augmented"
]

def get_file_hash(filepath: Path) -> str:
    """Calculate MD5 hash of file for deduplication."""
    hash_md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def collect_images() -> Dict[str, List[Dict]]:
    """
    Collect all images from source directories, organized by fill level.
    Returns: {fill_level: [{"path": Path, "hash": str, "source": str, "size": int}]}
    """
    images_by_level = {}
    seen_hashes = set()
    
    for source_dir in SOURCE_DIRS:
        source_path = Path(source_dir)
        if not source_path.exists():
            print(f"⚠ Warning: {source_dir} not found, skipping")
            continue
        
        source_name = source_path.name
        print(f"\n📂 Scanning {source_name}...")
        
        # Iterate through fill level folders
        for level_dir in source_path.iterdir():
            if not level_dir.is_dir():
                continue
            
            fill_level = level_dir.name  # e.g., "550ml", "empty"
            
            if fill_level not in images_by_level:
                images_by_level[fill_level] = []
            
            # Collect images from this level
            image_count = 0
            duplicate_count = 0
            
            for img_file in level_dir.glob("*.jpg"):
                file_hash = get_file_hash(img_file)
                file_size = img_file.stat().st_size
                
                # Skip duplicates across folders
                if file_hash in seen_hashes:
                    duplicate_count += 1
                    continue
                
                # Skip files larger than 5MB (free tier limit)
                if file_size > 5 * 1024 * 1024:
                    print(f"  ⚠ Skipping {img_file.name} (too large: {file_size / (1024*1024):.2f} MB)")
                    continue
                
                seen_hashes.add(file_hash)
                images_by_level[fill_level].append({
                    "path": img_file,
                    "hash": file_hash,
                    "source": source_name,
                    "size": file_size
                })
                image_count += 1
            
            print(f"  {fill_level}: {image_count} unique images ({duplicate_count} duplicates skipped)")
    
    return images_by_level

def save_upload_manifest(images_by_level: Dict[str, List[Dict]], output_file: str = "upload_manifest.json"):
    """Save manifest of all images for reference."""
    manifest = {
        "total_images": sum(len(imgs) for imgs in images_by_level.values()),
        "total_size_mb": sum(
            sum(img["size"] for img in imgs) 
            for imgs in images_by_level.values()
        ) / (1024 * 1024),
        "fill_levels": {
            level: {
                "count": len(images),
                "size_mb": sum(img["size"] for img in images) / (1024 * 1024),
                "files": [
                    {
                        "name": img["path"].name,
                        "path": str(img["path"]),
                        "source": img["source"],
                        "size_bytes": img["size"],
                        "hash": img["hash"]
                    }
                    for img in images
                ]
            }
            for level, images in images_by_level.items()
        }
    }
    
    with open(output_file, "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n✓ Manifest saved to {output_file}")
    return manifest

def generate_upload_instructions(images_by_level: Dict[str, List[Dict]]):
    """Generate instructions for manual upload via Supabase dashboard."""
    
    print("\n" + "=" * 60)
    print("📋 Upload Instructions")
    print("=" * 60)
    
    print("\nDue to library compatibility issues, please upload via Supabase Dashboard:")
    print("\n1. Go to: https://anfgqdgcbvmyegbfvvfh.supabase.co")
    print("2. Navigate to: Storage → Create new bucket")
    print("3. Bucket name: training-images")
    print("4. Settings:")
    print("   - Public: No (keep private)")
    print("   - File size limit: 5MB")
    print("   - Allowed MIME types: image/jpeg, image/jpg, image/png")
    
    print("\n5. Upload files by fill level:")
    for level in sorted(images_by_level.keys()):
        count = len(images_by_level[level])
        size_mb = sum(img["size"] for img in images_by_level[level]) / (1024 * 1024)
        print(f"   - Create folder: {level}/ ({count} files, {size_mb:.2f} MB)")
    
    print("\n6. Or use the Supabase CLI:")
    print("   npm install -g supabase")
    print("   supabase login")
    print("   # Then upload files programmatically")
    
    print("\n" + "=" * 60)

def main():
    """Main execution flow."""
    print("=" * 60)
    print("🚀 Afia App - Image Organization for Supabase Upload")
    print("=" * 60)
    
    # Step 1: Collect images
    print("\n[1/2] Collecting images from source directories...")
    images_by_level = collect_images()
    
    total_images = sum(len(imgs) for imgs in images_by_level.values())
    total_size_mb = sum(
        sum(img["size"] for img in imgs) 
        for imgs in images_by_level.values()
    ) / (1024 * 1024)
    
    print(f"\n✓ Found {total_images} unique images across {len(images_by_level)} fill levels")
    print(f"✓ Total size: {total_size_mb:.2f} MB")
    
    # Step 2: Save manifest
    print("\n[2/2] Saving upload manifest...")
    manifest = save_upload_manifest(images_by_level)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Collection Summary")
    print("=" * 60)
    print(f"📦 Total unique images: {total_images}")
    print(f"💾 Total size: {total_size_mb:.2f} MB")
    print(f"🗂️  Fill levels: {len(images_by_level)}")
    print(f"📄 Manifest: upload_manifest.json")
    
    # Check free tier
    free_tier_limit_gb = 1.0
    usage_percent = (total_size_mb / 1024) / free_tier_limit_gb * 100
    print(f"\n💡 Free tier usage: {usage_percent:.1f}% of 1GB")
    
    if usage_percent > 80:
        print("⚠️  WARNING: Will use >80% of free tier!")
    elif usage_percent > 50:
        print("⚠️  Moderate usage - monitor closely")
    else:
        print("✓ Well within free tier limits")
    
    # Generate upload instructions
    generate_upload_instructions(images_by_level)
    
    print("\n🎉 Analysis complete! Check upload_manifest.json for details.")

if __name__ == "__main__":
    main()
