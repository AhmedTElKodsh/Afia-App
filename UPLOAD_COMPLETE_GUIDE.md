# 🎯 Complete Image Upload Guide

## ✅ What's Ready

Your Supabase storage bucket is **already created** and ready to receive images!

- **Bucket name**: `training-images`
- **Status**: ✅ Created
- **Access**: Private (secure)
- **File limit**: 5MB per file
- **Storage limit**: 1GB (free tier)

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd scripts
npm install
```

### Step 2: Upload Images

```bash
npm run upload
```

### Step 3: Verify Upload

```bash
npm run verify
```

Done! 🎉

## 📁 What Gets Uploaded

### Source Folders
1. `D:\AI Projects\Freelance\Afia-App\augmented-output`
   - Augmented images with transformations
   - ~280 images per fill level
   - Variations: brightness, contrast, rotation, JPEG quality, flips

2. `D:\AI Projects\Freelance\Afia-App\oil-bottle-augmented`
   - Video frame extractions
   - ~84 images per fill level
   - Original and augmented frames with timestamps

### Destination Structure
```
training-images/
├── 55ml/
│   ├── aug-550ml-0000-brightness_minus.jpg
│   ├── aug_000_550ml_t0000.00s_f0000.jpg
│   └── orig_550ml_t0000.00s_f0000.jpg
├── 110ml/
├── 165ml/
├── ...
├── 1500ml/
└── empty/
```

### Fill Levels (29 categories)
```
55ml, 110ml, 165ml, 220ml, 275ml, 330ml, 385ml, 440ml, 495ml, 550ml,
605ml, 660ml, 715ml, 770ml, 825ml, 880ml, 935ml, 990ml, 1045ml, 1100ml,
1155ml, 1210ml, 1265ml, 1320ml, 1375ml, 1430ml, 1485ml, 1500ml, empty
```

## 🔧 Technical Details

### Upload Script Features
- ✅ **Deduplication**: MD5 hash-based across both folders
- ✅ **Size filtering**: Skips files > 5MB automatically
- ✅ **Resume support**: Skips already uploaded files
- ✅ **Progress tracking**: Shows upload progress
- ✅ **Error handling**: Continues on individual failures
- ✅ **Manifest generation**: Creates detailed JSON inventory

### Files Created
- `upload-images.js` - Main upload script (Node.js)
- `verify-upload.js` - Verification script
- `package.json` - Node.js dependencies
- `upload_manifest.json` - Generated after upload (inventory)

## 📊 Expected Results

### Estimated Totals
- **Images per level**: ~300-400 (after deduplication)
- **Total images**: ~10,000-12,000 across all levels
- **Total size**: ~500-800 MB (well within 1GB limit)
- **Upload time**: ~30-60 minutes (depends on connection)

### Upload Output
```
============================================================
🚀 Afia App - Image Upload to Supabase
============================================================

[1/3] Collecting images from source directories...

📂 Collecting images...

Scanning augmented-output...
  55ml: 280 unique images (0 duplicates skipped)
  110ml: 280 unique images (0 duplicates skipped)
  ...

✓ Found 10,500 unique images across 29 fill levels
✓ Total size: 650.25 MB

[2/3] Saving upload manifest...
✓ Manifest saved to upload_manifest.json

[3/3] Uploading images to Supabase Storage...

📤 Uploading 55ml (280 images)...
  Progress: 50/280
  Progress: 100/280
  ...
  ✓ Completed 55ml

...

============================================================
📊 Upload Summary
============================================================
✓ Uploaded: 10,500
⊘ Skipped (already exists): 0
✗ Failed: 0
📦 Total unique images: 10,500
🗂️  Fill levels: 29
============================================================

🎉 All images processed successfully!
```

## 🔍 Verification Output

```bash
npm run verify
```

Shows:
```
============================================================
📊 Verifying Upload to Supabase Storage
============================================================

✓ Bucket found: training-images
  Public: false

📂 Scanning uploaded files...

============================================================
📈 Upload Statistics
============================================================

Fill Level     Files      Size (MB)
----------------------------------------
55ml           280        45.20 MB
110ml          280        45.20 MB
...
empty          280        45.20 MB
----------------------------------------
TOTAL          10500      650.25 MB

============================================================
💾 Storage Usage
============================================================
Used: 0.635 GB / 1 GB
Usage: 63.5%
✓ Well within free tier limits

============================================================
🔍 Testing file access...
✓ Sample file accessible: 55ml/aug-550ml-0000-brightness_minus.jpg
  Signed URL generated successfully

✅ Verification complete!
```

## 💻 Accessing Images in Code

### JavaScript/Node.js

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// List all images in a fill level
const { data: files } = await supabase.storage
  .from('training-images')
  .list('550ml/');

console.log(`Found ${files.length} images in 550ml/`);

// Get signed URL (for private bucket)
const { data: signedUrl } = await supabase.storage
  .from('training-images')
  .createSignedUrl('550ml/image.jpg', 3600); // 1 hour expiry

// Download file
const { data: fileData } = await supabase.storage
  .from('training-images')
  .download('550ml/image.jpg');
```

### Python (for training scripts)

```python
from supabase import create_client
import os

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# List files
files = supabase.storage.from_('training-images').list('550ml/')

# Get signed URL
url = supabase.storage.from_('training-images').create_signed_url(
    '550ml/image.jpg',
    3600  # 1 hour
)

# Download file
data = supabase.storage.from_('training-images').download('550ml/image.jpg')
```

## 🔄 Re-running Upload

The script is **idempotent** and safe to re-run:
- Checks if files already exist before uploading
- Only uploads new/changed files
- Generates fresh manifest each time
- No duplicate uploads

To re-run:
```bash
npm run upload
```

## 🛠️ Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
**Solution**: Run `npm install` in the scripts directory

### "SUPABASE_URL is not defined"
**Solution**: Ensure `.env` file exists in project root (already created ✅)

### Upload failures
**Causes**:
- Internet connection issues
- Supabase project inactive
- File size > 5MB

**Solution**: Check console output for specific errors

### Files skipped (too large)
**Normal**: Some images may exceed 5MB limit
**Action**: Script reports count of skipped files

### Slow upload
**Normal**: Large number of files takes time
**Estimate**: ~30-60 minutes for full upload
**Tip**: Script shows progress every 50 files

## 📈 Monitoring

### During Upload
- Watch console for progress updates
- Check for error messages
- Monitor `upload_manifest.json` after completion

### After Upload
1. Run verification: `npm run verify`
2. Check Supabase dashboard: https://anfgqdgcbvmyegbfvvfh.supabase.co
3. Navigate to: **Storage** → **training-images**
4. Browse folders by fill level

### Storage Usage
- Free tier: 1GB total
- Current estimate: ~650MB (65% usage)
- Monitor in Supabase dashboard

## 🎓 Next Steps

### 1. Update Training Scripts
Modify your training pipeline to load images from Supabase:

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

### 2. Update Database Schema
Add storage path reference to `scans` table:

```sql
ALTER TABLE scans 
ADD COLUMN storage_path TEXT;

-- Example: storage_path = 'training-images/550ml/image.jpg'
```

### 3. Create Image Metadata Table (Optional)

```sql
CREATE TABLE training_images_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_path TEXT UNIQUE NOT NULL,
    fill_level TEXT NOT NULL,
    source_folder TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    file_size_bytes INTEGER
);

CREATE INDEX idx_fill_level ON training_images_metadata(fill_level);
```

### 4. Monitor Usage
- Run `npm run verify` regularly
- Check Supabase dashboard weekly
- Watch for approaching storage limits

## 📚 Documentation Reference

- **Quick Setup**: `scripts/SETUP_AND_RUN.md`
- **Node.js Script**: `scripts/upload-images.js`
- **Verification**: `scripts/verify-upload.js`
- **Manifest**: `upload_manifest.json` (generated after upload)

## 🔐 Security Notes

- ✅ Bucket is **private** (not publicly accessible)
- ✅ Requires authentication to access
- ✅ Use signed URLs for temporary access
- ✅ Service role key has admin access - keep secret
- ✅ Never commit `.env` file to git

## ✨ Summary

You now have:
- ✅ Supabase storage bucket created
- ✅ Upload script ready to run
- ✅ Verification script for checking results
- ✅ Complete documentation
- ✅ Environment configured
- ✅ Free tier compatible setup

**Ready to upload!** Just run:
```bash
cd scripts
npm install
npm run upload
```

---

**Questions?**
- Check `upload_manifest.json` for upload details
- Review console output for errors
- Verify in Supabase dashboard
- Re-run verification: `npm run verify`

**Status**: 🟢 Ready for production use
