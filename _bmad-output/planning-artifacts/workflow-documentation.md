# Afia App Workflow Documentation

## Overview
This document describes the complete workflow for the Afia Oil Bottle Analysis application, from QR code scanning to oil level measurement and consumption tracking.

## Workflow Stages

### Stage 1: QR Code Scanning
- User scans the barcode on the Afia oil bottle
- Different QR codes for different bottle sizes (1.5L and 2.5L)
- Currently focusing on 1.5L bottles for MVP
- QR code redirects to Cloudflare-deployed web application

### Stage 2: Camera Activation & Bottle Outline Matching
- Camera opens automatically after QR scan
- User is directed to photograph the front side of the bottle
- Static bottle outline appears on screen (using `oil-bottle-frames/bottle-camera-outline2.png`)
- Outline serves as visual guidance (no auto-detection functionality)
- User manually adjusts position and angle to match bottle with outline
- Visual feedback: Red/Orange → Green when properly aligned
- Auto-capture when alignment is confirmed

### Stage 3: Logo Verification (Local)
- **Method**: Template Matching (OpenCV.js) or lightweight MobileNetV2 (TensorFlow.js)
- **Target**: "Afia" branding (Arabic/English text within the locked frame)
- **Fail-safe**: If logo detection fails but geometry is correct, proceeds with "Low Logo Confidence" flag
- **Error Handling**: Bad lighting or positioning triggers user guidance for retake
- All errors logged to admin dashboard for review

### Stage 4: Image Analysis (3-Stage Strategy)

#### POC/Prototype Phase (Current)
- **Primary**: LLM API analysis (Gemini free-tier with multiple keys, Grok as fallback)
- **Process**: 
  - Send image with text prompt
  - Include reference data and few-shot examples (optimized for size/tokens)
  - Receive oil level analysis
- **Data Collection**: Store all images and results in Supabase for model training

#### Stage 2 (Development)
- **Primary**: Local lightweight model (trained on collected data)
- **Fallback**: LLM API if local analysis fails
- **Training Data**: Real images + AI-augmented images from video frames
- Both local and fallback results saved to admin dashboard

#### Stage 3 (Production)
- Refined local model with acceptable accuracy
- LLM API as backup only

### Stage 5: Result Display & Consumption Tracking

#### Oil Level Display
- Image shows bottle with red line marking current oil level
- Text displays consumed and remaining oil amounts
- Positioned to left or right of bottle image

#### Interactive Consumption Slider
- **Starting Position**: Aligned with red line (current oil level)
- **Increment**: 55ml per step (1/4 standard tea cup = 55ml, full cup = 220ml)
- **Direction**: User drags DOWN to indicate oil being taken out
- **Range**: Top = current level, Bottom = last 55ml mark
- **Edge Case**: If <55ml remaining, slider disabled with message

#### Cup Visualization
- Single cup icon that fills progressively
- Shows real-time as user drags slider
- Display format: "You're taking out: Xml = Y cups" + "Will remain: Zml = W cups"
- Cup resets at each full cup milestone
- Haptic feedback every 55ml

### Stage 6: Admin Dashboard Features

#### Data Review
- View all captured images with metadata
- Review local model results vs LLM fallback results
- Flag inaccurate measurements

#### Manual Correction
- Mark results as "too big" or "too small"
- Manually enter correct oil level
- Trigger LLM API fallback for re-analysis

#### Image Upload
- Upload images with metadata and oil level
- Contribute to training dataset

#### Model Training
- All corrections and uploads used for model refinement
- Continuous improvement of local model accuracy

## Technical Implementation

### Frontend
- React with TypeScript
- Vite build system
- Tailwind CSS v4
- i18n support (Arabic/English)

### Backend
- Cloudflare Workers for API
- Cloudflare Pages for hosting
- Cloudflare R2 for image storage
- Supabase for database

### AI/ML
- OpenCV.js for logo detection
- TensorFlow.js for local model
- Gemini API (multiple keys) for LLM analysis
- Grok API as fallback

### Testing
- Playwright for E2E tests
- Jest for unit tests
- Integration tests for API

## CI/CD Pipeline
- Automated testing on push/PR
- Deployment to Cloudflare (Workers + Pages)
- Environment-specific configurations (stage1/stage2)
- Security scanning and code quality checks

## Recent Updates (2026-04-26)
- ✅ Simplified camera outline to static guidance (removed auto-detection)
- ✅ Implemented consumption slider with cup visualization
- ✅ Corrected cup measurement (55ml = 1/4 cup, not 1/2 cup)
- ✅ Added haptic feedback for better UX
- ✅ Enhanced error handling and user guidance

## Future Enhancements
- Support for 2.5L bottles
- Improved local model accuracy
- Additional language support
- Advanced analytics in admin dashboard
