# Generating Test Images for Oil Level Detection

## Option 1: AI-Generated Images (Quick Start)

I can help generate synthetic oil bottle images at different fill levels using AI image generation.

### Using Hugging Face Image Generation

We have access to the Z-Image Turbo model that can generate realistic images. Here's how:

**Prompts for Different Fill Levels:**

1. **Empty Bottle (0-10%)**

   ```
   A clear glass cooking oil bottle standing upright on a white surface,
   nearly empty with just a thin layer of golden oil at the bottom,
   professional product photography, bright even lighting, clean background
   ```

2. **Low Fill (25%)**

   ```
   A clear glass cooking oil bottle standing upright on a white surface,
   filled to 25% with golden yellow cooking oil, professional product
   photography, bright even lighting, clean background
   ```

3. **Half Full (50%)**

   ```
   A clear glass cooking oil bottle standing upright on a white surface,
   half filled with golden yellow cooking oil, professional product
   photography, bright even lighting, clean background
   ```

4. **High Fill (75%)**

   ```
   A clear glass cooking oil bottle standing upright on a white surface,
   filled to 75% with golden yellow cooking oil, professional product
   photography, bright even lighting, clean background
   ```

5. **Full (95%)**
   ```
   A clear glass cooking oil bottle standing upright on a white surface,
   nearly full with golden yellow cooking oil, professional product
   photography, bright even lighting, clean background
   ```

### Variations to Generate

For each fill level, create variations with:

- Different lighting conditions (bright, dim, natural light)
- Different angles (straight on, slight angle)
- Different bottle types (cylindrical, tapered)
- Different oil colors (golden, light yellow, amber)

## Option 2: Real Photos (Most Accurate)

### Equipment Needed

- Smartphone camera (any modern phone works)
- Clear glass bottle (cooking oil bottle)
- Cooking oil or colored water
- Good lighting (natural daylight or bright indoor light)
- Plain background (white wall or paper)

### Photography Setup

1. **Lighting Setup**
   - Use natural daylight from a window (best)
   - Or use 2-3 bright LED lights
   - Avoid direct flash
   - Ensure even lighting, no harsh shadows

2. **Background**
   - White wall or large white paper/poster board
   - Keep it clean and uncluttered
   - Ensure good contrast with the bottle

3. **Camera Position**
   - Hold phone at bottle's mid-height
   - Keep phone level (not tilted)
   - Distance: 2-3 feet from bottle
   - Bottle should fill 60-70% of frame

4. **Bottle Preparation**
   - Clean exterior (no fingerprints)
   - Remove any condensation
   - Ensure label is visible if needed
   - Place on stable surface

### Shooting Process

For each bottle type (e.g., 500ml, 750ml, 1L):

1. **Fill to 100%** → Take 3-5 photos from slightly different angles
2. **Pour out to 90%** → Take 3-5 photos
3. **Pour out to 75%** → Take 3-5 photos
4. **Pour out to 50%** → Take 3-5 photos
5. **Pour out to 25%** → Take 3-5 photos
6. **Pour out to 10%** → Take 3-5 photos
7. **Pour out to 5%** (nearly empty) → Take 3-5 photos

**Total per bottle type: ~25-35 images**

### Measuring Fill Levels Accurately

**Method 1: Volume Measurement**

- Use measuring cup to pour exact amounts
- Example for 1000ml bottle:
  - 100% = 1000ml
  - 75% = 750ml
  - 50% = 500ml
  - 25% = 250ml

**Method 2: Visual Markers**

- Use tape to mark fill levels on bottle
- Measure with ruler from bottom
- Calculate percentage based on total height

**Method 3: Weight**

- Weigh empty bottle
- Weigh full bottle
- Calculate intermediate weights for each percentage

## Option 3: Hybrid Approach (Recommended)

1. **Start with AI-generated images** (5-10 images per fill level)
   - Quick validation of AI analysis
   - Test the system end-to-end
   - Identify any obvious issues

2. **Follow up with real photos** (20-30 images per bottle type)
   - More accurate for training
   - Captures real-world variations
   - Better for final validation

## Organizing Your Images

```
public/test-images/
├── generated/
│   ├── bottle-generic/
│   │   ├── empty-01.png
│   │   ├── empty-02.png
│   │   ├── low-01.png
│   │   ├── medium-01.png
│   │   ├── high-01.png
│   │   └── full-01.png
│   └── metadata.json
│
└── real-photos/
    ├── filippo-berio-500ml/
    │   ├── 100-percent-01.jpg
    │   ├── 100-percent-02.jpg
    │   ├── 75-percent-01.jpg
    │   ├── 50-percent-01.jpg
    │   ├── 25-percent-01.jpg
    │   └── 05-percent-01.jpg
    ├── bertolli-750ml/
    │   └── ...
    └── metadata.json
```

## Metadata File Format

Create a `metadata.json` for each set:

```json
{
  "images": [
    {
      "filename": "100-percent-01.jpg",
      "sku": "filippo-berio-500ml",
      "actualFillPercentage": 100,
      "actualVolumeMl": 500,
      "lightingCondition": "natural-daylight",
      "angle": "straight-on",
      "notes": "Clean bottle, good lighting"
    },
    {
      "filename": "75-percent-01.jpg",
      "sku": "filippo-berio-500ml",
      "actualFillPercentage": 75,
      "actualVolumeMl": 375,
      "lightingCondition": "natural-daylight",
      "angle": "straight-on",
      "notes": "Measured with measuring cup"
    }
  ]
}
```

## Quality Checklist

Before using images for testing:

- [ ] Image is in focus (not blurry)
- [ ] Bottle is fully visible in frame
- [ ] Oil level is clearly visible
- [ ] Lighting is adequate (not too dark)
- [ ] No extreme glare or reflections
- [ ] Background is clean
- [ ] Bottle is upright (not tilted)
- [ ] Image resolution is at least 1080p
- [ ] File size is reasonable (<5MB)
- [ ] Actual fill level is documented

## Testing Workflow

1. **Generate/Capture Images** → Organize in folders
2. **Document Metadata** → Create metadata.json
3. **Upload to Test Mode** → Use `?test=true`
4. **Run Analysis** → Test each image
5. **Export Results** → Download CSV/JSON
6. **Compare** → AI result vs actual fill level
7. **Calculate Accuracy** → Average error, confidence distribution
8. **Iterate** → Identify patterns, improve

## Expected Accuracy Targets

- **High Confidence**: ±5% of actual fill level
- **Medium Confidence**: ±10% of actual fill level
- **Low Confidence**: ±15% of actual fill level

## Tips for Best Results

1. **Consistency**: Use same setup for all photos of one bottle type
2. **Variety**: Test different lighting, angles, conditions
3. **Documentation**: Record everything - you'll need it later
4. **Multiple Shots**: Take 3-5 photos per fill level
5. **Validation**: Measure fill levels accurately
6. **Iteration**: Start small, learn, then scale up

## Need Help?

If you want me to generate AI images for you:

1. Tell me which fill levels you need (e.g., 0%, 25%, 50%, 75%, 100%)
2. How many variations per level (e.g., 3-5)
3. Any specific requirements (bottle type, lighting, etc.)

I can generate them using the Hugging Face Z-Image Turbo model!
