"""
Verify uploaded images and check storage statistics.
"""
import os
from pathlib import Path
from supabase import create_client
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = "training-images"

def verify_upload():
    """Verify uploaded images and show statistics."""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("=" * 60)
    print("📊 Verifying Upload to Supabase Storage")
    print("=" * 60)
    
    try:
        # Get bucket info
        bucket = supabase.storage.get_bucket(BUCKET_NAME)
        print(f"\n✓ Bucket found: {BUCKET_NAME}")
        print(f"  Public: {bucket.get('public', False)}")
        
    except Exception as e:
        print(f"\n✗ Error accessing bucket: {e}")
        return
    
    # List all files and organize by fill level
    print("\n📂 Scanning uploaded files...")
    
    fill_levels = defaultdict(lambda: {"count": 0, "total_size": 0})
    total_files = 0
    total_size = 0
    
    # Expected fill levels
    expected_levels = [
        "55ml", "110ml", "165ml", "220ml", "275ml", "330ml", "385ml", "440ml",
        "495ml", "550ml", "605ml", "660ml", "715ml", "770ml", "825ml", "880ml",
        "935ml", "990ml", "1045ml", "1100ml", "1155ml", "1210ml", "1265ml",
        "1320ml", "1375ml", "1430ml", "1485ml", "1500ml", "empty"
    ]
    
    for level in expected_levels:
        try:
            files = supabase.storage.from_(BUCKET_NAME).list(level)
            
            if files:
                level_count = len(files)
                level_size = sum(f.get("metadata", {}).get("size", 0) for f in files)
                
                fill_levels[level]["count"] = level_count
                fill_levels[level]["total_size"] = level_size
                
                total_files += level_count
                total_size += level_size
                
        except Exception as e:
            print(f"  ⚠ Could not access {level}: {e}")
    
    # Display results
    print("\n" + "=" * 60)
    print("📈 Upload Statistics")
    print("=" * 60)
    
    print(f"\n{'Fill Level':<15} {'Files':<10} {'Size (MB)':<12}")
    print("-" * 40)
    
    for level in sorted(fill_levels.keys(), key=lambda x: (x != "empty", int(x.replace("ml", "")) if x != "empty" else 0)):
        count = fill_levels[level]["count"]
        size_mb = fill_levels[level]["total_size"] / (1024 * 1024)
        print(f"{level:<15} {count:<10} {size_mb:>10.2f} MB")
    
    print("-" * 40)
    print(f"{'TOTAL':<15} {total_files:<10} {total_size / (1024 * 1024):>10.2f} MB")
    
    # Free tier warning
    free_tier_limit_gb = 1.0
    usage_percent = (total_size / (1024 * 1024 * 1024)) / free_tier_limit_gb * 100
    
    print("\n" + "=" * 60)
    print("💾 Storage Usage")
    print("=" * 60)
    print(f"Used: {total_size / (1024 * 1024 * 1024):.3f} GB / {free_tier_limit_gb} GB")
    print(f"Usage: {usage_percent:.1f}%")
    
    if usage_percent > 80:
        print("⚠️  WARNING: Approaching free tier limit!")
    elif usage_percent > 50:
        print("⚠️  Moderate usage - monitor closely")
    else:
        print("✓ Well within free tier limits")
    
    print("\n" + "=" * 60)
    
    # Sample file access test
    print("\n🔍 Testing file access...")
    if total_files > 0:
        # Try to get a URL for a sample file
        sample_level = next(iter(fill_levels.keys()))
        try:
            files = supabase.storage.from_(BUCKET_NAME).list(sample_level)
            if files:
                sample_file = files[0]["name"]
                sample_path = f"{sample_level}/{sample_file}"
                
                # Get signed URL (for private buckets)
                url = supabase.storage.from_(BUCKET_NAME).create_signed_url(
                    sample_path, 
                    60  # 60 seconds expiry
                )
                
                print(f"✓ Sample file accessible: {sample_path}")
                print(f"  Signed URL generated successfully")
        except Exception as e:
            print(f"⚠ Could not access sample file: {e}")
    
    print("\n✅ Verification complete!")

if __name__ == "__main__":
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        exit(1)
    
    verify_upload()
