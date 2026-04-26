# 🚀 Simple Upload Instructions

Due to path issues with spaces in "AI Projects", here's the simplest way to upload:

## Option 1: Manual NPM Install (Recommended)

1. **Open Command Prompt or PowerShell**

2. **Navigate to scripts folder:**
   ```
   cd "D:\AI Projects\Freelance\Afia-App\scripts"
   ```

3. **Install dependencies:**
   ```
   npm install
   ```

4. **Run upload:**
   ```
   node upload-images.js
   ```

5. **Verify:**
   ```
   node verify-upload.js
   ```

## Option 2: Use Supabase Dashboard (No Code)

1. Go to: https://anfgqdgcbvmyegbfvvfh.supabase.co

2. Navigate to: **Storage** → **training-images** bucket (already created ✅)

3. Create folders and upload manually:
   - Create folder: `55ml`
   - Upload images from: `D:\AI Projects\Freelance\Afia-App\augmented-output\55ml\`
   - Upload images from: `D:\AI Projects\Freelance\Afia-App\oil-bottle-augmented\55ml\`
   - Repeat for all 29 fill levels

## Option 3: PowerShell Direct

Open PowerShell in the scripts folder and run:

```powershell
cd "D:\AI Projects\Freelance\Afia-App\scripts"
npm install
node upload-images.js
```

## Troubleshooting Path Issues

The issue is the space in "AI Projects". Solutions:

### A. Use quotes:
```
cd "D:\AI Projects\Freelance\Afia-App\scripts"
```

### B. Use short path:
```
cd D:\AIPRO~1\Freelance\Afia-App\scripts
```

### C. Move project (if possible):
Move to: `D:\Afia-App\` (no spaces)

## What You Need

The upload script needs these npm packages:
- `@supabase/supabase-js`
- `dotenv`

Install with:
```
npm install @supabase/supabase-js dotenv
```

## Quick Test

To verify everything works:

```
cd "D:\AI Projects\Freelance\Afia-App\scripts"
node --version
npm --version
npm install
node upload-images.js
```

## Expected Output

```
============================================================
🚀 Afia App - Image Upload to Supabase
============================================================

[1/3] Collecting images from source directories...

📂 Collecting images...

Scanning augmented-output...
  55ml: 280 unique images (0 duplicates skipped)
  ...

✓ Found 10,500 unique images across 29 fill levels
✓ Total size: 650.25 MB

[2/3] Saving upload manifest...
✓ Manifest saved to upload_manifest.json

[3/3] Uploading images to Supabase Storage...
...
```

## Still Having Issues?

If npm install fails, you can also:

1. **Use Python script** (already installed):
   ```
   cd "D:\AI Projects\Freelance\Afia-App"
   python scripts/upload_via_mcp.py
   ```
   This will analyze and create a manifest, then provide instructions.

2. **Use Supabase CLI**:
   ```
   npm install -g supabase
   supabase login
   # Then use CLI to upload
   ```

3. **Manual upload via dashboard** (Option 2 above)

## Need Help?

The core issue is the space in the folder path. The easiest fix is to:

1. Open Command Prompt
2. Type: `cd "D:\AI Projects\Freelance\Afia-App\scripts"`
3. Type: `npm install`
4. Type: `node upload-images.js`

This should work! The batch file has issues with the path, but direct commands work fine.
