# 📸 Afia App - Training Images Upload System

Complete solution for uploading augmented training images to Supabase Storage.

## 🎯 Quick Start

**Windows users** (easiest):
```bash
scripts\run-upload.bat
```

**Everyone else**:
```bash
cd scripts
npm install
npm run upload
```

## 📚 Documentation Index

### Getting Started
1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** ⭐ Start here!
   - One-line commands
   - Quick troubleshooting
   - Essential info only

2. **[FINAL_SUMMARY.md](FINAL_SUMMARY.md)** 
   - What was created
   - System overview
   - Checklist

### Detailed Guides
3. **[UPLOAD_COMPLETE_GUIDE.md](UPLOAD_COMPLETE_GUIDE.md)**
   - Complete walkthrough
   - Code examples
   - Troubleshooting
   - Next steps

4. **[scripts/SETUP_AND_RUN.md](scripts/SETUP_AND_RUN.md)**
   - Installation steps
   - Expected output
   - Verification

### Reference
5. **[IMAGE_UPLOAD_SUMMARY.md](IMAGE_UPLOAD_SUMMARY.md)**
   - Technical details
   - Architecture
   - Features

## 🗂️ Project Structure

```
Afia-App/
├── .env                              # ✅ Credentials configured
├── QUICK_REFERENCE.md                # ⭐ Start here
├── FINAL_SUMMARY.md                  # Overview
├── UPLOAD_COMPLETE_GUIDE.md          # Full guide
├── IMAGE_UPLOAD_SUMMARY.md           # Technical details
├── README_UPLOAD.md                  # This file
│
├── scripts/
│   ├── upload-images.js              # Main upload script
│   ├── verify-upload.js              # Verification script
│   ├── package.json                  # Node.js config
│   ├── run-upload.bat                # Windows batch file
│   ├── verify-results.bat            # Windows verify
│   ├── SETUP_AND_RUN.md              # Setup guide
│   └── requirements-upload.txt       # Python deps (backup)
│
└── Source Folders:
    ├── augmented-output/             # Augmented images
    └── oil-bottle-augmented/         # Video frames
```

## ✅ What's Ready

- [x] Supabase bucket created (`training-images`)
- [x] Environment variables configured (`.env`)
- [x] Upload script ready (`upload-images.js`)
- [x] Verification script ready (`verify-upload.js`)
- [x] Windows batch files created
- [x] Complete documentation
- [ ] **Run upload** ← You are here!

## 🚀 Three Ways to Upload

### Option 1: Windows Batch File (Easiest)
```bash
scripts\run-upload.bat
```

### Option 2: NPM Scripts
```bash
cd scripts
npm install
npm run upload
npm run verify
```

### Option 3: Direct Node.js
```bash
cd scripts
npm install
node upload-images.js
node verify-upload.js
```

## 📊 What Happens

1. **Scans** both source folders
2. **Deduplicates** using MD5 hashing
3. **Filters** files > 5MB
4. **Uploads** to Supabase Storage
5. **Organizes** by fill level (29 categories)
6. **Generates** manifest JSON

## 🎯 Expected Results

- **Images**: ~10,000-12,000 (after deduplication)
- **Size**: ~500-800 MB (within 1GB free tier)
- **Time**: ~30-60 minutes
- **Levels**: 29 (55ml - 1500ml + empty)

## 🔍 After Upload

### Verify Results
```bash
npm run verify
```
**OR**
```bash
scripts\verify-results.bat
```

### Check Dashboard
https://anfgqdgcbvmyegbfvvfh.supabase.co
→ Storage → training-images

### Review Manifest
Open `upload_manifest.json` for complete inventory

## 💻 Access Images

### JavaScript
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// List files
const { data } = await supabase.storage
  .from('training-images')
  .list('550ml/');

// Download
const { data: file } = await supabase.storage
  .from('training-images')
  .download('550ml/image.jpg');
```

### Python
```python
from supabase import create_client
import os

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# List files
files = supabase.storage.from_('training-images').list('550ml/')

# Download
data = supabase.storage.from_('training-images').download('550ml/image.jpg')
```

## 🛠️ Troubleshooting

### Common Issues

**"Cannot find module"**
```bash
cd scripts
npm install
```

**"Node.js not found"**
- Install from: https://nodejs.org/

**Upload slow**
- Normal for large datasets
- Expect 30-60 minutes

**Files skipped**
- Files > 5MB are automatically skipped
- Check console for count

### Get Help

1. Check console output for errors
2. Review `upload_manifest.json`
3. Run verification: `npm run verify`
4. Check Supabase dashboard

## 📈 Monitoring

### Storage Usage
- Free tier: 1GB
- Expected: ~650MB (65%)
- Monitor in dashboard

### Verification
```bash
npm run verify
```

Shows:
- Files per level
- Storage usage
- Free tier percentage
- Sample file test

## 🎓 Next Steps

1. ✅ Run upload
2. ✅ Verify results
3. Update training scripts
4. Add storage paths to database
5. Monitor usage regularly

## 📚 Full Documentation

- **Quick Start**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Complete Guide**: [UPLOAD_COMPLETE_GUIDE.md](UPLOAD_COMPLETE_GUIDE.md)
- **Summary**: [FINAL_SUMMARY.md](FINAL_SUMMARY.md)
- **Setup**: [scripts/SETUP_AND_RUN.md](scripts/SETUP_AND_RUN.md)

## 🔐 Security

- ✅ Private bucket (not public)
- ✅ Requires authentication
- ✅ Credentials in `.env` (not committed)
- ✅ Service role key secured

## ✨ Features

- ✅ Automatic deduplication
- ✅ Size filtering (5MB limit)
- ✅ Resume support
- ✅ Progress tracking
- ✅ Error handling
- ✅ Free tier compatible
- ✅ Manifest generation

---

## 🎊 Ready to Upload!

**Windows**:
```bash
scripts\run-upload.bat
```

**Cross-platform**:
```bash
cd scripts && npm install && npm run upload
```

---

**Questions?** Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) or [UPLOAD_COMPLETE_GUIDE.md](UPLOAD_COMPLETE_GUIDE.md)

**Status**: 🟢 Ready for production use
