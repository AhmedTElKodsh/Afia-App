# Test Mode - Stage 1 Development

## Overview

Stage 1 focuses on testing AI image analysis and oil level detection using pre-captured images on PC, without requiring mobile camera integration.

## Accessing Test Mode

Open the app with the test parameter:

```
http://localhost:5173/?test=true
```

Or on the deployed site:

```
https://your-app.pages.dev/?test=true
```

## Features

### 1. Bottle Selection

- Dropdown menu with all registered bottles
- Shows bottle name, SKU, and total volume
- Select the bottle type that matches your test image

### 2. Image Upload

- Click "Select Image" to choose a photo from your PC
- Supports all common image formats (JPG, PNG, etc.)
- Preview shows before analysis
- Can change image before analyzing

### 3. Analysis

- Click "Analyze Image" to send to AI
- Shows loading state during processing
- Displays results immediately

### 4. Results Display

- **Fill Level**: Percentage of oil remaining
- **Remaining ML**: Actual volume in milliliters
- **Confidence**: AI confidence level (high/medium/low)
- **Scan ID**: Unique identifier for this analysis

### 5. Test History

- Keeps track of all tests in current session
- Shows timestamp, bottle, image name, and results
- Persists until page refresh

### 6. Export Options

- **Export JSON**: Full detailed data for programmatic analysis
- **Export CSV**: Spreadsheet-compatible format for Excel/Google Sheets
- Includes all test results with timestamps

## Preparing Test Images

### Image Requirements

- Clear view of the bottle
- Good lighting
- Bottle should be upright
- Oil level clearly visible
- Recommended resolution: 1080p or higher

### Suggested Test Set

Create a test set with bottles at different fill levels:

1. **Empty** (0-10%): Nearly empty bottle
2. **Low** (10-30%): Quarter full
3. **Medium** (30-70%): Half full
4. **High** (70-90%): Three-quarters full
5. **Full** (90-100%): Nearly full bottle

### Organizing Test Images

Create a folder structure like:

```
test-images/
├── bottle-sku-001/
│   ├── empty.jpg
│   ├── low.jpg
│   ├── medium.jpg
│   ├── high.jpg
│   └── full.jpg
├── bottle-sku-002/
│   └── ...
└── README.txt (notes about each image)
```

## Testing Workflow

1. **Prepare Images**: Take or collect photos of bottles at various fill levels
2. **Open Test Mode**: Navigate to `?test=true`
3. **Select Bottle**: Choose the correct SKU from dropdown
4. **Upload Image**: Select your test image
5. **Analyze**: Click analyze and review results
6. **Record**: Note the accuracy - is it correct?
7. **Repeat**: Test multiple images and fill levels
8. **Export**: Download results for analysis

## Evaluating Results

### Confidence Levels

- **High**: AI is very confident (>80% certainty)
- **Medium**: Moderate confidence (50-80% certainty)
- **Low**: Low confidence (<50% certainty)

### Accuracy Assessment

For each test, ask:

- Is the fill percentage close to actual? (±5% is good)
- Does the confidence match the image quality?
- Are there patterns in errors (e.g., always overestimates)?

### Common Issues to Check

- Does lighting affect accuracy?
- Do certain bottle types work better?
- Does bottle angle matter?
- Are labels or reflections causing problems?

## Analyzing Exported Data

### CSV Analysis

Open in Excel/Google Sheets to:

- Calculate average accuracy
- Identify problematic bottles
- Track confidence distribution
- Compare different lighting conditions

### JSON Analysis

Use for programmatic analysis:

```javascript
const results = JSON.parse(exportedData);
const avgFillLevel =
  results.reduce((sum, r) => sum + r.analysisResult.fillPercentage, 0) /
  results.length;
```

## Next Steps

After Stage 1 testing validates the AI analysis:

**Stage 2** will add:

- QR code scanning
- Mobile camera integration
- Real-time capture
- On-device testing

## Troubleshooting

### "Analysis failed" error

- Check that the backend is running
- Verify VITE_PROXY_URL is set correctly
- Check browser console for details

### Image won't upload

- Ensure file is an image format
- Try a smaller file size (<5MB recommended)
- Check file isn't corrupted

### Results seem inaccurate

- Verify correct bottle SKU selected
- Check image quality and lighting
- Try different angles
- Document patterns for improvement

## Tips for Best Results

1. **Consistent Lighting**: Use similar lighting for all test images
2. **Standard Angle**: Take photos from the same angle
3. **Clean Bottles**: Remove condensation or dirt
4. **Multiple Tests**: Test each fill level 3-5 times
5. **Document Everything**: Note conditions for each photo
6. **Compare Results**: Look for patterns in accuracy

## Support

If you encounter issues or have questions about test mode, check:

- Browser console for error messages
- Network tab for API failures
- Exported data for patterns
