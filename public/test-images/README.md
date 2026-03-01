# Test Images Directory

This directory is for storing test images to validate the AI oil level detection.

## Directory Structure

Organize your test images by bottle SKU:

```
test-images/
├── bottle-001/
│   ├── empty.jpg
│   ├── low.jpg
│   ├── medium.jpg
│   ├── high.jpg
│   └── full.jpg
├── bottle-002/
│   └── ...
└── notes.txt
```

## Image Guidelines

### Technical Requirements

- **Format**: JPG, PNG, or WebP
- **Resolution**: 1080p or higher recommended
- **File Size**: Under 5MB for faster uploads
- **Orientation**: Portrait (vertical)

### Photography Tips

1. **Lighting**
   - Use natural daylight or bright indoor lighting
   - Avoid harsh shadows
   - No direct flash on the bottle

2. **Positioning**
   - Bottle should be upright and centered
   - Camera at bottle's mid-height level
   - Fill the frame but include full bottle

3. **Background**
   - Plain, neutral background preferred
   - Avoid busy patterns or similar colors to oil

4. **Bottle Condition**
   - Clean exterior (no fingerprints or smudges)
   - Remove any condensation
   - Ensure label is visible if needed

### Fill Levels to Test

Create images at these approximate fill levels:

- **Empty**: 0-10% (just residue)
- **Low**: 10-30% (bottom quarter)
- **Medium-Low**: 30-50% (below half)
- **Medium**: 50% (half full)
- **Medium-High**: 50-70% (above half)
- **High**: 70-90% (top quarter)
- **Full**: 90-100% (nearly full)

### Naming Convention

Use descriptive names:

- `{sku}_{level}_{condition}.jpg`
- Examples:
  - `001_empty_good-light.jpg`
  - `001_medium_low-light.jpg`
  - `002_full_outdoor.jpg`

## Testing Process

1. **Capture Images**: Take photos at different fill levels
2. **Organize**: Sort into folders by bottle SKU
3. **Document**: Note conditions (lighting, angle, etc.)
4. **Test**: Use test mode (`?test=true`) to analyze
5. **Record**: Export results and compare to actual levels
6. **Iterate**: Identify patterns and improve

## Sample Test Log

Keep a log file with your images:

```
Image: 001_empty_good-light.jpg
Actual Fill: 5%
AI Result: 8%
Confidence: High
Notes: Good lighting, slight overestimate

Image: 001_medium_low-light.jpg
Actual Fill: 50%
AI Result: 42%
Confidence: Medium
Notes: Low light affected accuracy
```

## What to Look For

### Good Results

- Fill percentage within ±5% of actual
- High confidence on clear images
- Consistent results across similar conditions

### Issues to Document

- Systematic over/underestimation
- Low confidence on good images
- Inconsistent results on similar images
- Specific bottle types with problems

## Next Steps

After collecting test data:

1. Analyze exported CSV/JSON results
2. Calculate average accuracy per bottle type
3. Identify problematic conditions
4. Provide feedback for AI improvement
5. Prepare for Stage 2 (mobile testing)

## Notes

- This directory is not tracked in git (add to .gitignore)
- Keep original images for reference
- Back up test results regularly
- Share findings with the development team
