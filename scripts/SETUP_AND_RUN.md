# 🚀 Setup and Run - Image Upload

## Quick Start

### 1. Install Node.js Dependencies

```bash
cd scripts
npm install
```

This installs:
- `@supabase/supabase-js` - Supabase JavaScript client
- `dotenv` - Environment variable loader

### 2. Run the Upload

```bash
npm run upload
```

Or directly:
```bash
node upload-images.js
```

## What Happens

The script will:

1. **Scan both folders:**
   - `D:\AI Projects\Freelance\Afia-App\augmented-output`
   - `D:\AI Projects\Freelance\Afia-App\oil-bottle-augmented`

2. **Deduplicate images** using MD5 hashing

3. **Upload to Supabase Storage:**
   - Bucket: `training-images` ✅ (already created)
   - Structure: `{fill_level}/{filename}.jpg`
   - Skip files > 5MB
   - Skip already uploaded files

4. **Generate manifest:**
   - Creates `upload_manifest.json` with complete inventory

## Expected Output

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

Scanning oil-bottle-augmented...
  55ml: 84 unique images (0 duplicates skipped)
  ...

✓ Found XXXX unique images across 29 fill levels
✓ Total size: XXX.XX MB

[2/3] Saving upload manifest...
✓ Manifest saved to upload_manifest.json

[3/3] Uploading images to Supabase Storage...

📤 Uploading 55ml (XXX images)...
  Progress: 50/XXX
  Progress: 100/XXX
  ✓ Completed 55ml

...

============================================================
📊 Upload Summary
============================================================
✓ Uploaded: XXXX
⊘ Skipped (already exists): 0
✗ Failed: 0
📦 Total unique images: XXXX
🗂️  Fill levels: 29
============================================================

🎉 All images processed successfully!
```

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
Run: `npm install` in the scripts directory

### "SUPABASE_URL is not defined"
Make sure `.env` file exists in the project root (not in scripts folder)

### Upload failures
- Check internet connection
- Verify Supabase project is active
- Check file sizes (must be < 5MB)

### Files skipped (too large)
Some images may be > 5MB. The script will skip them and report the count.

## After Upload

### Verify Upload
Check the Supabase dashboard:
1. Go to: https://anfgqdgcbvmyegbfvvfh.supabase.co
2. Navigate to: **Storage** → **training-images**
3. Browse folders by fill level

### Access Images in Code

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// List files in a fill level
const { data: files } = await supabase.storage
  .from('training-images')
  .list('550ml/');

// Get signed URL (for private bucket)
const { data: signedUrl } = await supabase.storage
  .from('training-images')
  .createSignedUrl('550ml/image.jpg', 3600); // 1 hour expiry

// Download file
const { data: fileData } = await supabase.storage
  .from('training-images')
  .download('550ml/image.jpg');
```

## Storage Info

- **Bucket**: `training-images` (already created ✅)
- **Access**: Private (requires authentication)
- **File limit**: 5MB per file
- **Total limit**: 1GB (free tier)

## Re-running

The script is safe to re-run:
- Skips already uploaded files
- Only uploads new/changed files
- Generates fresh manifest each time

## Next Steps

1. ✅ Upload complete
2. Update training scripts to load from Supabase
3. Monitor storage usage in dashboard
4. Update `scans` table to reference storage paths

---

**Need Help?**
- Check `upload_manifest.json` for details
- Review console output for errors
- Check Supabase dashboard for uploaded files
