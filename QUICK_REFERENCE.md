# 🚀 Quick Reference - Image Upload

## One-Line Commands

### Windows (Easiest)
```bash
scripts\run-upload.bat
```

### Cross-Platform
```bash
cd scripts && npm install && npm run upload
```

---

## Step-by-Step

### 1. Install
```bash
cd scripts
npm install
```

### 2. Upload
```bash
npm run upload
```
**OR**
```bash
scripts\run-upload.bat
```

### 3. Verify
```bash
npm run verify
```
**OR**
```bash
scripts\verify-results.bat
```

---

## What You Get

- ✅ ~10,000-12,000 images uploaded
- ✅ Organized by 29 fill levels
- ✅ ~500-800 MB total (within 1GB free tier)
- ✅ Deduplicated (no duplicates)
- ✅ Manifest file: `upload_manifest.json`

---

## File Locations

### Scripts
- `scripts/upload-images.js` - Upload script
- `scripts/verify-upload.js` - Verification
- `scripts/run-upload.bat` - Windows batch file
- `scripts/verify-results.bat` - Windows verify

### Config
- `.env` - Credentials (already configured ✅)
- `scripts/package.json` - Dependencies

### Output
- `upload_manifest.json` - Generated after upload

---

## Supabase Info

- **URL**: https://anfgqdgcbvmyegbfvvfh.supabase.co
- **Bucket**: `training-images` (already created ✅)
- **Access**: Private (requires auth)
- **Limit**: 5MB per file, 1GB total

---

## Access Images

### JavaScript
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// List
const { data } = await supabase.storage.from('training-images').list('550ml/');

// Download
const { data: file } = await supabase.storage.from('training-images').download('550ml/image.jpg');
```

### Python
```python
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

# List
files = supabase.storage.from_('training-images').list('550ml/')

# Download
data = supabase.storage.from_('training-images').download('550ml/image.jpg')
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Module not found" | `npm install` |
| "Node not found" | Install Node.js |
| Upload slow | Normal (30-60 min) |
| Files skipped | > 5MB (automatic) |

---

## Documentation

📖 **Full Guide**: `UPLOAD_COMPLETE_GUIDE.md`
📋 **Setup**: `scripts/SETUP_AND_RUN.md`
📊 **Summary**: `FINAL_SUMMARY.md`

---

## Status

✅ **Bucket**: Created
✅ **Config**: Ready
✅ **Scripts**: Ready
⏳ **Upload**: Run `npm run upload`

---

**Ready?** Run: `scripts\run-upload.bat`
