# 🚀 Quick Start - Image Upload

## One-Command Upload (Windows)

```bash
scripts\upload_images.bat
```

This runs all steps automatically!

---

## Manual Steps

### 1️⃣ Install
```bash
pip install -r scripts/requirements-upload.txt
```

### 2️⃣ Configure
Create `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

### 3️⃣ Upload
```bash
python scripts/organize_and_upload_images.py
```

### 4️⃣ Verify
```bash
python scripts/verify_upload.py
```

---

## What Gets Uploaded?

**Source Folders:**
- `d:\AI Projects\Freelance\Afia-App\augmented-output`
- `d:\AI Projects\Freelance\Afia-App\oil-bottle-augmented`

**Destination:**
- Supabase Storage bucket: `training-images`
- Organized by fill level: `55ml/`, `110ml/`, ..., `1500ml/`, `empty/`

**Features:**
- ✅ Automatic deduplication
- ✅ Progress tracking
- ✅ Skip existing files
- ✅ Free tier compatible (5MB limit per file)

---

## Get Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project
3. **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## Troubleshooting

**"Environment variables not set"**
→ Create `.env` file with credentials

**"Permission denied"**
→ Use service_role key, not anon key

**"File too large"**
→ Files must be < 5MB (script enforces this)

---

## After Upload

Update your training scripts:

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load images
files = supabase.storage.from_('training-images').list('550ml/')
```

---

## Need Help?

📖 Full docs: `scripts/README_IMAGE_UPLOAD.md`
📋 Detailed guide: `scripts/UPLOAD_GUIDE.md`
