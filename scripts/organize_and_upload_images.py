"""
Organize and upload augmented images to Supabase Storage.
Merges images from both augmented folders and uploads them organized by fill level.
"""
import os
import json
from pathlib import Path
from typing import Dict, List
import hashlib
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for admin operations

# Source directories
SOURCE_DIRS = [
    r"d:\AI Projects\Freelance\Afia-App\augmented-output",
    r"d:\AI Projects\Freelance\Afia-App\oil-bottle-augmented"
]

# Storage bucket name
BUCKET_NAME = "training-images"

def init_supabase() -> Client:
    """Initialize Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def create_bucket_if_not_exists(supabase: Client):
    """Create storage bucket if it doesn't exist."""
    try:
        # Try to get bucket
        supabase.storage.get_bucket(BUCKET_NAME)
        print(f"✓ Bucket '{BUCKET_NAME}' already exists")
    except Exception:
        # Create bucket (public=False for security, file_size_limit for free tier)
        supabase.storage.create_bucket(
            BUCKET_NAME,
            options={
                "public": False,
                "file_size_limit": 5242880,  # 5MB limit per file
                "allowed_mime_types": ["image/jpeg", "image/jpg", "image/png"]
            }
        )
        print(f"✓ Created bucket '{BUCKET_NAME}'")

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
    Returns: {fill_level: [{"path": Path, "hash": str, "source": str}]}
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
                
                # Skip duplicates across folders
                if file_hash in seen_hashes:
                    duplicate_count += 1
                    continue
                
                seen_hashes.add(file_hash)
                images_by_level[fill_level].append({
                    "path": img_file,
                    "hash": file_hash,
                    "source": source_name
                })
                image_count += 1
            
            print(f"  {fill_level}: {image_count} unique images ({duplicate_count} duplicates skipped)")
    
    return images_by_level

def upload_images(supabase: Client, images_by_level: Dict[str, List[Dict]]):
    """Upload images to Supabase Storage organized by fill level."""
    
    total_uploaded = 0
    total_skipped = 0
    total_failed = 0
    
    for fill_level, images in sorted(images_by_level.items()):
        print(f"\n📤 Uploading {fill_level} ({len(images)} images)...")
        
        for idx, img_info in enumerate(images, 1):
            img_path = img_info["path"]
            source = img_info["source"]
            
            # Create storage path: fill_level/source_filename
            storage_path = f"{fill_level}/{img_path.name}"
            
            try:
                # Check if file already exists
                try:
                    supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
                    total_skipped += 1
                    if idx % 50 == 0:
                        print(f"  Progress: {idx}/{len(images)} (skipped existing)")
                    continue
                except:
                    pass  # File doesn't exist, proceed with upload
                
                # Upload file
                with open(img_path, "rb") as f:
                    supabase.storage.from_(BUCKET_NAME).upload(
                        storage_path,
                        f,
                        file_options={"content-type": "image/jpeg"}
                    )
                
                total_uploaded += 1
                
                if idx % 50 == 0:
                    print(f"  Progress: {idx}/{len(images)}")
                    
            except Exception as e:
                print(f"  ✗ Failed to upload {img_path.name}: {e}")
                total_failed += 1
        
        print(f"  ✓ Completed {fill_level}")
    
    return total_uploaded, total_skipped, total_failed

def create_metadata_table(supabase: Client):
    """Create a metadata table to track uploaded images."""
    sql = """
    CREATE TABLE IF NOT EXISTS training_images_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        storage_path TEXT UNIQUE NOT NULL,
        fill_level TEXT NOT NULL,
        source_folder TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        file_size_bytes INTEGER,
        
        -- Indexes for efficient querying
        CONSTRAINT unique_hash UNIQUE(file_hash)
    );
    
    CREATE INDEX IF NOT EXISTS idx_fill_level ON training_images_metadata(fill_level);
    CREATE INDEX IF NOT EXISTS idx_source ON training_images_metadata(source_folder);
    """
    
    try:
        supabase.postgrest.rpc("exec_sql", {"sql": sql}).execute()
        print("✓ Metadata table created/verified")
    except Exception as e:
        print(f"⚠ Could not create metadata table: {e}")

def save_upload_manifest(images_by_level: Dict[str, List[Dict]], output_file: str = "upload_manifest.json"):
    """Save manifest of all images for reference."""
    manifest = {
        "total_images": sum(len(imgs) for imgs in images_by_level.values()),
        "fill_levels": {
            level: {
                "count": len(images),
                "files": [str(img["path"]) for img in images]
            }
            for level, images in images_by_level.items()
        }
    }
    
    with open(output_file, "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n✓ Manifest saved to {output_file}")

def main():
    """Main execution flow."""
    print("=" * 60)
    print("🚀 Afia App - Image Organization & Upload to Supabase")
    print("=" * 60)
    
    # Step 1: Collect images
    print("\n[1/4] Collecting images from source directories...")
    images_by_level = collect_images()
    
    total_images = sum(len(imgs) for imgs in images_by_level.values())
    print(f"\n✓ Found {total_images} unique images across {len(images_by_level)} fill levels")
    
    # Step 2: Save manifest
    print("\n[2/4] Saving upload manifest...")
    save_upload_manifest(images_by_level)
    
    # Step 3: Initialize Supabase
    print("\n[3/4] Initializing Supabase connection...")
    supabase = init_supabase()
    create_bucket_if_not_exists(supabase)
    
    # Step 4: Upload images
    print("\n[4/4] Uploading images to Supabase Storage...")
    uploaded, skipped, failed = upload_images(supabase, images_by_level)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Upload Summary")
    print("=" * 60)
    print(f"✓ Uploaded: {uploaded}")
    print(f"⊘ Skipped (already exists): {skipped}")
    print(f"✗ Failed: {failed}")
    print(f"📦 Total unique images: {total_images}")
    print(f"🗂️  Fill levels: {len(images_by_level)}")
    print("=" * 60)
    
    if failed > 0:
        print("\n⚠ Some uploads failed. Check the logs above for details.")
    else:
        print("\n🎉 All images processed successfully!")

if __name__ == "__main__":
    main()
