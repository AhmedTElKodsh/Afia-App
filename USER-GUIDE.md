# 👋 Welcome to Afia Oil Tracker!

**Your AI-powered cooking oil consumption tracker**

---

## 📱 What is Afia Oil Tracker?

Afia Oil Tracker helps you monitor your cooking oil consumption using AI-powered bottle scanning. Simply take a photo of your oil bottle, and our AI estimates the fill level, calculates remaining volume, and tracks your nutritional intake.

### Key Features

- 📷 **AI Bottle Scanning** - Take a photo, get instant fill level estimates
- 📊 **Consumption Tracking** - Track how much oil you've used over time
- 📈 **Trend Charts** - Visualize your consumption patterns
- 🫒 **Multi-Bottle Support** - Switch between different oil bottles
- 📤 **Data Export** - Export your history as PDF, CSV, or JSON
- 🔐 **Admin Dashboard** - Manage bottles and view system metrics

---

## 🚀 Getting Started

### First Time Setup

1. **Open the App**
   - Navigate to the app URL in your browser
   - On mobile: Add to home screen for PWA experience

2. **Accept Privacy Notice**
   - Read the privacy notice on first launch
   - Tap "Accept" to continue

3. **Select Your Bottle**
   - Use the bottle selector at the top
   - Choose from available bottles (e.g., Filippo Berio, Bertolli, Afia)

---

## 📷 How to Scan Your Bottle

### Step-by-Step Guide

#### 1. Start Scan
- Tap the **"Start Scan"** button on the main screen
- Camera will activate automatically

#### 2. Position Your Bottle
- Hold your phone steady
- Align the bottle within the framing guide (dashed rectangle)
- Ensure good lighting
- Make sure the bottle is fully visible

#### 3. Capture Photo
- Tap the large circular **capture button**
- Your photo will freeze for preview

#### 4. Review Photo
- Check if the image is clear
- **Retake** if blurry or poorly framed
- **Use Photo** if satisfied

#### 5. Wait for Analysis
- You'll see "Analyzing your bottle..."
- This takes 3-8 seconds
- AI is processing your image

#### 6. View Results
- **Fill Percentage** - How much oil remains (e.g., 75%)
- **Confidence Level** - How accurate the estimate is
  - 🟢 High confidence
  - 🟡 Medium confidence
  - 🔴 Low confidence
- **Volume Breakdown** - Remaining and consumed in ml, tbsp, cups
- **Nutrition Info** - Calories, total fat, saturated fat

#### 7. Provide Feedback (Optional)
- Tap your accuracy rating:
  - "About right" - One-tap submit
  - "Too high/low" - Slider appears to correct
  - "Way off" - Slider to provide your estimate
- Submit to help improve the AI

---

## 📊 Viewing Your History

### Access History

1. Tap the **📊 History** tab at the bottom
2. You'll see two tabs:
   - **History** - List of all your scans
   - **Trends** - Consumption chart

### History Features

**Search:**
- Type bottle name in the search bar
- Results filter automatically

**Filter by Date:**
- Tap **Last 7 days**, **Last 30 days**, or **All time**

**View Scan Details:**
- Tap any scan to see full details
- Shows: date, time, bottle, fill %, volume, confidence
- Delete individual scans if needed

**Clear History:**
- Scroll to bottom
- Tap **Clear History** (confirm first)

---

## 📈 Understanding Trends

### Access Trends

1. Go to **History** tab
2. Tap **Trends** at the top

### Trend Chart Features

**Time Ranges:**
- **7D** - Last 7 days
- **30D** - Last 30 days (default)
- **90D** - Last 90 days

**Unit Toggle:**
- **ml** - Milliliters
- **tbsp** - Tablespoons
- **cups** - Cups

**Summary Stats:**
- **Total Scans** - Number of scans in period
- **Total Consumed** - Total oil used
- **Avg/Day** - Average daily consumption

**Reading the Chart:**
- Each bar = one day
- Bar height = amount consumed
- Hover/tap bar for exact value and scan count

---

## 🫒 Switching Bottles

### Select a Different Bottle

1. Tap the **bottle selector** at the top of the main screen
2. Dropdown shows all available bottles
3. Tap the bottle you want to track
4. App updates automatically

**Your selection is saved** - The app remembers your choice for next time.

### Built-in Bottles

The app comes with these bottles pre-loaded:
- **Filippo Berio Extra Virgin Olive Oil** (500ml)
- **Bertolli Classico Olive Oil** (750ml)
- **Afia Sunflower Oil** (1000ml)

---

## 📤 Exporting Your Data

### Export from Admin Dashboard

1. Tap **⚙️ Admin** tab
2. Enter admin password (default: `admin123`)
3. Go to **Export Data** tab
4. Select date range:
   - All Time
   - Last 7 Days
   - Last 30 Days
5. Tap export format:
   - **📄 Export JSON** - Full data for developers
   - **📊 Export CSV** - Spreadsheet-compatible
   - **📄 Export PDF** - Printable report

### What's Included in Export

- Scan date and time
- Bottle SKU and name
- Fill percentage
- Remaining volume (ml)
- Confidence level
- Feedback rating (if provided)

---

## ⚙️ Admin Dashboard

### Access Admin Features

1. Tap **⚙️ Admin** tab at bottom
2. Enter password
   - Default: `admin123`
   - Change in `.env` file: `VITE_ADMIN_PASSWORD`

### Admin Tabs

#### 1. Overview
- **Total Scans** - All-time scan count
- **Total ml Consumed** - Cumulative consumption
- **Scans (7 Days)** - Recent activity
- **Scans (30 Days)** - Monthly activity
- **Recent Scans Table** - Last 10 scans

#### 2. Bottle Registry
- **View All Bottles** - Built-in + custom
- **Search Bottles** - By name or SKU
- **Add Bottle** - Create custom bottle
  - Tap **+ Add Bottle**
  - Fill in all fields
  - Choose shape (cylinder/frustum)
  - Enter dimensions
  - Save
- **Edit Bottle** - Modify custom bottles
- **Delete Bottle** - Remove custom bottles

#### 3. Export Data
- Export your scan history
- Choose date range
- Select format (PDF, CSV, JSON)

---

## 🧪 Test Mode

### For Developers & Testing

Access the test harness to test AI analysis with pre-captured photos:

1. Add `?test=true` to app URL
   - Example: `http://localhost:5173/?test=true`
2. Test harness appears
3. Select bottle
4. Upload test image
5. View analysis results
6. Export test data

---

## 💡 Tips for Best Results

### Taking Great Photos

✅ **Do:**
- Use good lighting (near window or light source)
- Hold phone steady
- Center bottle in frame
- Ensure bottle is fully visible
- Avoid reflections and glare
- Use rear camera (automatic)

❌ **Don't:**
- Take photos in dark rooms
- Use flash (causes reflections)
- Partially obscure the bottle
- Take angled photos
- Include background clutter

### Understanding Confidence Levels

**🟢 High Confidence:**
- Clear image
- Good lighting
- Bottle fully visible
- Estimate is highly reliable

**🟡 Medium Confidence:**
- Acceptable image quality
- Some minor issues
- Estimate is reasonable
- Consider retaking if critical

**🔴 Low Confidence:**
- Poor image quality
- Blur, bad lighting, or obstruction
- Estimate may be inaccurate
- **Recommendation:** Retake photo

### When to Retake

Retake your photo if:
- Confidence is low
- Image is blurry
- Lighting is poor
- Bottle is partially hidden
- Strong reflections visible
- You're not satisfied with the estimate

---

## ❓ Troubleshooting

### Camera Won't Activate

**Problem:** Camera doesn't start when tapping "Start Scan"

**Solutions:**
1. **Check permissions**
   - iOS: Settings → Safari → Camera → Allow
   - Android: Settings → Apps → Browser → Permissions → Camera → Allow

2. **Refresh the app**
   - Close and reopen browser
   - Try again

3. **Check browser compatibility**
   - Use Safari (iOS) or Chrome (Android)
   - Avoid in-app browsers (Facebook, Instagram)

### "Unknown Bottle" Error

**Problem:** QR code shows "This bottle is not yet supported"

**Solutions:**
1. Verify QR code is correct
2. Check SKU parameter in URL
3. Contact admin to add bottle to registry

### AI Analysis Fails

**Problem:** "Analysis failed" error message

**Solutions:**
1. **Check internet connection**
   - AI analysis requires network

2. **Check image quality**
   - Ensure photo is clear
   - Retake if blurry

3. **Retry**
   - Tap "Retry" button
   - If still fails, retake photo

### App Won't Load

**Problem:** App doesn't load or shows blank screen

**Solutions:**
1. **Clear browser cache**
   - Settings → Clear browsing data

2. **Check browser compatibility**
   - Update to latest version
   - Try different browser

3. **Check network**
   - Ensure you have internet connection

---

## 🔐 Privacy & Data

### What Data is Stored

**On Your Device (localStorage):**
- Scan history (up to 500 scans)
- Selected bottle preference
- Privacy notice acceptance

**In Cloud (Cloudflare R2):**
- Scan images (for AI training)
- Analysis results
- Feedback ratings

### Data Usage

Your data is used to:
- Provide scan results
- Track your consumption
- Improve AI accuracy
- Generate insights and trends

### Data Deletion

**Delete Individual Scans:**
1. Go to History
2. Tap scan to view details
3. Tap "Delete"

**Clear All History:**
1. Go to History
2. Scroll to bottom
3. Tap "Clear History"

**Delete Account:**
- Contact support to delete all cloud data

---

## 📞 Support

### Getting Help

**In-App:**
- Check this user guide
- View error messages for guidance

**Online:**
- Email: support@afia-oil-tracker.com
- Documentation: [Link to docs]

### Reporting Issues

When reporting a problem, include:
- Device model (e.g., iPhone 14, Samsung Galaxy S23)
- Browser (e.g., Safari 17, Chrome 120)
- Error message (screenshot if possible)
- Steps to reproduce

---

## 🎯 Quick Reference

### Navigation

| Icon | Tab | Purpose |
|------|-----|---------|
| 📷 | Scan | Main scanning interface |
| 📊 | History | View scan history & trends |
| 🧪 | Test | Test harness (developers) |
| ⚙️ | Admin | Admin dashboard |

### Keyboard Shortcuts

None currently available (mobile-first app)

### Gesture Controls

- **Tap** - Select items, activate buttons
- **Swipe** - Scroll through lists
- **Pinch** - Not supported

---

## 📋 Checklist: First Week

**Day 1:**
- [ ] Set up app
- [ ] Accept privacy notice
- [ ] Select your bottle
- [ ] Complete first scan

**Day 2-3:**
- [ ] Scan bottle again
- [ ] Check confidence level
- [ ] Provide feedback

**Day 4-7:**
- [ ] View history tab
- [ ] Check trends chart
- [ ] Export data (optional)

**Ongoing:**
- [ ] Scan when you use oil
- [ ] Review trends weekly
- [ ] Provide feedback for accuracy

---

## 🎉 You're All Set!

You now know everything you need to get the most out of Afia Oil Tracker.

**Happy tracking! 🫒**

---

**Last Updated:** March 6, 2026  
**Version:** 1.0.0  
**App:** Afia Oil Tracker
