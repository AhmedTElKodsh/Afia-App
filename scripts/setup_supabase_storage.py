"""
Setup Supabase Storage bucket and policies for training images.
Run this before uploading images.
"""
import os
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = "training-images"

def setup_storage():
    """Setup storage bucket with proper configuration."""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("🔧 Setting up Supabase Storage...")
    
    # Create bucket
    try:
        supabase.storage.create_bucket(
            BUCKET_NAME,
            options={
                "public": False,  # Private bucket for security
                "file_size_limit": 5242880,  # 5MB per file
                "allowed_mime_types": ["image/jpeg", "image/jpg", "image/png"]
            }
        )
        print(f"✓ Created bucket: {BUCKET_NAME}")
    except Exception as e:
        if "already exists" in str(e).lower():
            print(f"✓ Bucket already exists: {BUCKET_NAME}")
        else:
            print(f"✗ Error creating bucket: {e}")
            return
    
    # Create RLS policies for authenticated access
    policies_sql = f"""
    -- Allow authenticated users to read training images
    CREATE POLICY IF NOT EXISTS "Allow authenticated read access"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = '{BUCKET_NAME}');
    
    -- Allow service role to manage all files
    CREATE POLICY IF NOT EXISTS "Allow service role full access"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = '{BUCKET_NAME}');
    """
    
    try:
        # Note: RLS policies are typically set via Supabase dashboard or SQL editor
        print("\n📋 RLS Policies to apply (run in Supabase SQL Editor):")
        print(policies_sql)
        print("\n✓ Setup complete!")
        print(f"\n📦 Bucket: {BUCKET_NAME}")
        print("🔒 Access: Private (authenticated users only)")
        print("📏 File limit: 5MB per file")
        print("🖼️  Allowed: JPEG, JPG, PNG")
        
    except Exception as e:
        print(f"⚠ Note: {e}")

if __name__ == "__main__":
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        exit(1)
    
    setup_storage()
