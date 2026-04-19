# Image Upload Guide

## Overview
This guide helps you merge, organize, and upload augmented training images from both source folders to Supabase Storage.

## Prerequisites

1. **Python 3.8+** installed
2. **Supabase project** with credentials
3. **Environment variables** configured

## Setup

### 1. Install Dependencies

```bash
cd scripts
pip install -r requirements-upload.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the project root or set these environment variables:

```bash
# Get these from your Supabase project settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these:**
- Go to your Supabase project dashboard
- Navigate to **Settings** → **API**
- Copy the **Project URL** (SUPABASE_URL)
- Copy the **service_role** key (SUPABASE_SERVICE_ROLE_KEY) - NOT the anon key

### 3. Run the Upload Script

```bash
python scripts/organize_and_upload_images.py
```

## What the Script Does

1. **Scans both source directories:**
   - `d:\AI Projects\Freelance\Afia-App\augmented-output`
   - `d:\AI Projects\Freelance\Afia-App\oil-bottle-augmented`

2. **Deduplicates images** using MD5 hashing to avoid uploading the same image twice

3. **Organizes by fill level:**
   - Creates folders in Supabase Storage: `55ml/`, `110ml/`, `165ml/`, ..., `1500ml/`, `empty/`

4. **Uploads to Supabase Storage:**
   - Creates a bucket called `training-images`
   - Uploads images with structure: `{fill_level}/{filename}.jpg`
   - Skips already uploaded files

5. **Generates manifest:**
   - Creates `upload_manifest.json` with complete inventory

## Storage Structure

```
training-images/
├── 55ml/
│   ├── aug-550ml-0000-brightness_minus.jpg
│   ├── orig_550ml_t0000.00s_f0000.jpg
│   └── ...
├── 110ml/
│   └── ...
├── empty/
│   └── ...
└── 1500ml/
    └── ...
```

## Free Tier Considerations

The script is configured for Supabase free tier:
- **File size limit:** 5MB per file (enforced)
- **Storage limit:** 1GB total (monitor usage)
- **Bandwidth:** 2GB/month (uploads count toward this)

## Troubleshooting

### "SUPABASE_URL not set"
Make sure you've set the environment variables or created a `.env` file.

### "Permission denied"
Ensure you're using the **service_role** key, not the anon key.

### "Bucket already exists"
This is normal - the script will use the existing bucket.

### Upload failures
- Check file sizes (must be < 5MB)
- Verify internet connection
- Check Supabase project status

## Querying Uploaded Images

After upload, you can query images via Supabase Storage API:

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# List all images in a fill level
files = supabase.storage.from_('training-images').list('550ml/')

# Get public URL for an image
url = supabase.storage.from_('training-images').get_public_url('550ml/image.jpg')
```

## Next Steps

After uploading:
1. Update your training scripts to load images from Supabase
2. Consider adding RLS policies if needed
3. Monitor storage usage in Supabase dashboard
4. Update the `scans` table to reference storage paths

## Support

For issues:
- Check Supabase logs in the dashboard
- Review the upload manifest for missing files
- Verify bucket permissions in Supabase Storage settings
