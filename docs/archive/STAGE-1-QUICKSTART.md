# Stage 1 Quick Start Guide

## What is Stage 1?

Stage 1 focuses on testing the AI image analysis without needing mobile camera integration. You can test with images already on your PC.

## Getting Started (5 minutes)

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Open Test Mode

Navigate to: `http://localhost:5173/?test=true`

You should see the test harness interface with:

- 🧪 AI Analysis Test Harness header
- Bottle selection dropdown
- Image upload button

### 3. Run Your First Test

1. **Select a Bottle**: Choose any bottle from the dropdown (e.g., "Filippo Berio Extra Virgin Olive Oil")

2. **Upload an Image**:
   - Click "Select Image"
   - Choose any photo of an oil bottle from your PC
   - You'll see a preview

3. **Analyze**:
   - Click "Analyze Image"
   - Wait a few seconds
   - See the results!

### 4. Review Results

The results show:

- **Fill Level**: Percentage (e.g., 65%)
- **Remaining**: Volume in ml
- **Confidence**: How confident the AI is (high/medium/low)
- **Scan ID**: Unique identifier

### 5. Export Data

After running multiple tests:

- Click "Export CSV" for spreadsheet analysis
- Click "Export JSON" for programmatic analysis

## What to Test

### Quick Test Set

1. **Find or take 3-5 photos** of oil bottles at different fill levels
2. **Test each image** with the correct bottle SKU
3. **Note the accuracy**: Is the AI close to the actual fill level?
4. **Export results** to analyze patterns

### Image Tips

- ✅ Good lighting
- ✅ Bottle upright and centered
- ✅ Clear view of oil level
- ✅ Clean bottle (no smudges)
- ❌ Avoid harsh shadows
- ❌ Avoid blurry images

## Common Questions

**Q: Where do I get test images?**
A: Take photos with your phone, transfer to PC, or use existing bottle photos.

**Q: What if I don't have the exact bottle?**
A: Test with any bottle - just note that accuracy may vary if the geometry doesn't match.

**Q: The analysis failed - what's wrong?**
A: Check that:

- The backend worker is running (`cd worker && npm run dev`)
- `VITE_PROXY_URL` is set in `.env.local`
- Your image is a valid format (JPG, PNG)

**Q: How accurate should it be?**
A: Within ±5-10% is good. Document any patterns you notice.

**Q: Can I test multiple bottles?**
A: Yes! The test history tracks all your tests in the current session.

## Next Steps

1. **Collect diverse images**: Different lighting, angles, fill levels
2. **Test systematically**: Same bottle, different conditions
3. **Export and analyze**: Look for patterns in the CSV data
4. **Document findings**: What works well? What doesn't?
5. **Prepare for Stage 2**: Mobile camera integration

## Troubleshooting

### Backend Not Running

```bash
cd worker
npm install
npm run dev
```

### Environment Variables

Check `.env.local` has:

```
VITE_PROXY_URL=http://localhost:8787
```

### Image Won't Upload

- Try a smaller image (<5MB)
- Ensure it's JPG or PNG format
- Check browser console for errors

## Full Documentation

See [TEST-MODE.md](./TEST-MODE.md) for complete testing guide.

## Support

Having issues? Check:

1. Browser console (F12) for errors
2. Network tab for API failures
3. Worker logs for backend issues

Happy testing! 🧪
