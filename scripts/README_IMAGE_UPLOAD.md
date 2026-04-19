# 🖼️ Afia App - Training Images Upload System

Complete solution for merging, organizing, and uploading augmented training images to Supabase Storage.

## 📋 Overview

This system handles:
- ✅ Merging images from two source folders
- ✅ Deduplication using MD5 hashing
- ✅ Organization by fill level (55ml - 1500ml + empty)
- ✅ Upload to Supabase Storage (free tier compatible)
- ✅ Verification and statistics

## 🗂️ Source Folders

1. **augmented-output**: Contains augmented images with transformations
   - Brightness adjustments
   - Contrast variations
   - Rotations
   - JPEG quality variations
   - Horizontal flips

2. **oil-bottle-augmented**: Contains video frame extractions
   - Original frames (orig_ prefix)
   - Augmented frames (aug_ prefix)
   - Timestamped sequences

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r scripts/requirements-upload.txt
```

### 2. Set Environment Variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Get your credentials:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **service_role** key

### 3. Setup Storage Bucket

```bash
python scripts/setup_supabase_storage.py
```

This creates the `training-images` bucket with:
- Private access (authenticated users only)
- 5MB file size limit
- JPEG/PNG only

### 4. Upload Images

```bash
python scripts/organize_and_upload_images.py
```

This will:
- Scan both source directories
- Remove duplicates
- Upload organized by fill level
- Generate `upload_manifest.json`

### 5. Verify Upload

```bash
python scripts/verify_upload.py
```

Shows:
- Files per fill level
- Storage usage
- Free tier status
- Sample file access test

## 📊 Expected Results

### Fill Levels
```
55ml, 110ml, 165ml, 220ml, 275ml, 330ml, 385ml, 440ml, 495ml, 550ml,
605ml, 660ml, 715ml, 770ml, 825ml, 880ml, 935ml, 990ml, 1045ml, 1100ml,
1155ml, 1210ml, 1265ml, 1320ml, 1375ml, 1430ml, 1485ml, 1500ml, empty
```

### Storage Structure
```
training-images/
├── 55ml/
│   ├── aug-550ml-0000-brightness_minus.jpg
│   ├── aug_000_550ml_t0000.00s_f0000.jpg
│   └── orig_550ml_t0000.00s_f0000.jpg
├── 110ml/
├── ...
└── empty/
```

## 💾 Free Tier Limits

Supabase Free Tier:
- **Storage**: 1 GB total
- **Bandwidth**: 2 GB/month
- **File size**: 5 MB per file (enforced by script)

The script monitors usage and warns when approaching limits.

## 🔧 Scripts Reference

### `setup_supabase_storage.py`
Creates and configures the storage bucket.

**Usage:**
```bash
python scripts/setup_supabase_storage.py
```

### `organize_and_upload_images.py`
Main upload script with deduplication.

**Features:**
- MD5 hash-based deduplication
- Progress tracking
- Skip existing files
- Error handling
- Manifest generation

**Usage:**
```bash
python scripts/organize_and_upload_images.py
```

### `verify_upload.py`
Verification and statistics tool.

**Shows:**
- Files per fill level
- Storage usage (MB/GB)
- Free tier percentage
- Sample file access test

**Usage:**
```bash
python scripts/verify_upload.py
```

## 🔍 Accessing Uploaded Images

### Python (Supabase Client)

```python
from supabase import create_client
import os

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# List files in a fill level
files = supabase.storage.from_('training-images').list('550ml/')

# Get signed URL (private bucket)
url = supabase.storage.from_('training-images').create_signed_url(
    '550ml/image.jpg',
    3600  # 1 hour expiry
)

# Download file
data = supabase.storage.from_('training-images').download('550ml/image.jpg')
```

### Update Training Scripts

Modify your training scripts to load from Supabase:

```python
def load_training_images(fill_level: str):
    """Load training images from Supabase Storage."""
    files = supabase.storage.from_('training-images').list(fill_level)
    
    images = []
    for file in files:
        path = f"{fill_level}/{file['name']}"
        data = supabase.storage.from_('training-images').download(path)
        # Process image data...
        images.append(data)
    
    return images
```

## 🛠️ Troubleshooting

### "Environment variables not set"
Ensure `.env` file exists or variables are exported:
```bash
export SUPABASE_URL="https://..."
export SUPABASE_SERVICE_ROLE_KEY="..."
```

### "Permission denied"
- Use **service_role** key, not anon key
- Check bucket policies in Supabase dashboard

### "File too large"
- Script enforces 5MB limit
- Compress images if needed
- Check file sizes in source folders

### "Bucket already exists"
- Normal if running setup multiple times
- Script will use existing bucket

### Upload failures
- Check internet connection
- Verify Supabase project is active
- Check free tier limits
- Review error messages in console

## 📈 Monitoring

### Supabase Dashboard
1. Go to **Storage** in Supabase dashboard
2. Select `training-images` bucket
3. View files and usage

### Usage Tracking
Run verification script regularly:
```bash
python scripts/verify_upload.py
```

## 🔄 Re-running Upload

The script is idempotent:
- Skips already uploaded files
- Safe to run multiple times
- Only uploads new/changed files

## 📝 Manifest File

`upload_manifest.json` contains:
- Total image count
- Files per fill level
- Source paths for reference

Use for:
- Audit trail
- Debugging
- Documentation

## 🎯 Next Steps

After successful upload:

1. **Update training pipeline** to load from Supabase
2. **Add metadata tracking** (optional)
3. **Set up RLS policies** if needed
4. **Monitor storage usage** regularly
5. **Update `scans` table** to reference storage paths

## 📚 Additional Resources

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Python Client Docs](https://supabase.com/docs/reference/python/introduction)
- [Storage Pricing](https://supabase.com/pricing)

## ⚠️ Important Notes

- **Backup**: Keep local copies until verified
- **Free Tier**: Monitor usage to avoid overages
- **Security**: Never commit `.env` file
- **Service Role Key**: Keep secret, has admin access

## 🆘 Support

For issues:
1. Check error messages in console
2. Review Supabase logs
3. Verify credentials
4. Check network connectivity
5. Review manifest file

---

**Status**: Ready for production use ✅
**Free Tier Compatible**: Yes ✅
**Tested**: Windows environment ✅
