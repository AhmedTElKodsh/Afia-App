# Self-Hosting Google Fonts Guide

## Steps to Self-Host Outfit Font

1. **Download the font files:**
   - Visit: https://fonts.google.com/specimen/Outfit
   - Click "Download family"
   - Extract the ZIP file

2. **Create fonts directory:**
   ```bash
   mkdir -p public/fonts/outfit
   ```

3. **Copy font files:**
   - Copy the `.ttf` or `.woff2` files for weights 300, 400, 500, 600, 700
   - Place them in `public/fonts/outfit/`

4. **Update `src/index.css`:**
   Replace the Google Fonts import with:

   ```css
   @font-face {
     font-family: 'Outfit';
     font-style: normal;
     font-weight: 300;
     font-display: swap;
     src: url('/fonts/outfit/Outfit-Light.woff2') format('woff2');
   }

   @font-face {
     font-family: 'Outfit';
     font-style: normal;
     font-weight: 400;
     font-display: swap;
     src: url('/fonts/outfit/Outfit-Regular.woff2') format('woff2');
   }

   @font-face {
     font-family: 'Outfit';
     font-style: normal;
     font-weight: 500;
     font-display: swap;
     src: url('/fonts/outfit/Outfit-Medium.woff2') format('woff2');
   }

   @font-face {
     font-family: 'Outfit';
     font-style: normal;
     font-weight: 600;
     font-display: swap;
     src: url('/fonts/outfit/Outfit-SemiBold.woff2') format('woff2');
   }

   @font-face {
     font-family: 'Outfit';
     font-style: normal;
     font-weight: 700;
     font-display: swap;
     src: url('/fonts/outfit/Outfit-Bold.woff2') format('woff2');
   }
   ```

5. **Update CSP in `public/_headers`:**
   Remove the Google Fonts domains:
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://Afia-worker.savola.workers.dev https://pub-models.afia.app; worker-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests
   ```

## Benefits of Self-Hosting:
- ✅ Stricter CSP (no external font domains)
- ✅ Better privacy (no requests to Google)
- ✅ Faster loading (no DNS lookup to Google)
- ✅ Works offline
- ✅ No GDPR concerns

## Current Status:
The CSP has been updated to allow Google Fonts. This is a valid and widely-used approach.
If you want maximum security, follow the steps above to self-host.
