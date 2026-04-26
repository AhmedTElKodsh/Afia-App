# Afia App - Mock QR Codes (Stage 1)

For testing different bottle sizes in Stage 1, use the following URL patterns to trigger the app with the correct SKU context.

## QR Code URLs

### 1. Afia Corn Oil 1.5L (Standard)
**SKU:** `afia-corn-1.5l`  
**URL:** `https://afia-app.pages.dev/?sku=afia-corn-1.5l`

### 2. Afia Corn Oil 2.5L (New Mock)
**SKU:** `afia-corn-2.5l`  
**URL:** `https://afia-app.pages.dev/?sku=afia-corn-2.5l`

## How to generate QR codes
1. Go to any QR code generator (e.g., [qr-code-generator.com](https://www.qr-code-generator.com/))
2. Select "URL" as the type.
3. Paste the corresponding URL from above.
4. Download and print/display the QR code.

## Behavior in Stage 1
- **1.5L:** Full AI analysis with calibrated volume math.
- **2.5L:** AI analysis will still run, but volume math uses the 2.5L geometry (currently using 1.5L geometry placeholder in `bottleRegistry.ts`).

## Testing Local Development
If running locally, replace `afia-app.pages.dev` with `localhost:5173`:
- `http://localhost:5173/?sku=afia-corn-2.5l`
