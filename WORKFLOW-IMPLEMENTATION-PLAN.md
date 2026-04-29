# Workflow Implementation Plan - Afia Oil Tracker

## Current Status
- ✅ Stage 1 (LLM-only) implementation complete
- ✅ CI/CD pipeline operational
- ✅ Supabase power installed
- ✅ 21stdev MCP configured
- ✅ Agent Browser MCP configured

## Workflow Improvements from workflow.txt

### Phase 1: Camera & Capture Workflow
**Status**: Needs refinement based on new requirements

#### Current Implementation
- Camera opens with general guidance
- User manually captures photo
- Basic shape detection

#### Required Changes
1. **Barcode Scanning**
   - Add QR code scanning for 1.5L and 2.5L bottles
   - Different mock QR codes for different bottle sizes
   - Focus on 1.5L bottles for MVP

2. **Camera Guidance Enhancement**
   - Static outline overlay (using bottle-camera-outline2.png)
   - Remove auto-detect/auto-capture complexity
   - Keep outline as visual guidance only
   - Add directional messages (move closer/farther, adjust angle)
   - Color-coded feedback (red/orange → green when aligned)

3. **Logo Verification**
   - Local logo detection using OpenCV.js or MobileNetV2
   - Detect "Afia" branding (Arabic/English)
   - Fail-safe: proceed with "Low Logo Confidence" flag if geometry is perfect

4. **Quality Checks**
   - Lighting condition detection
   - Position guidance
   - Error logging for admin review

### Phase 2: Analysis Workflow (3-Stage Strategy)
**Status**: Partially implemented, needs enhancement

#### Stage 1: LLM API Direct (Current - POC/Prototype)
- ✅ Gemini API with Groq fallback
- ✅ Prompt engineering for accuracy
- ⚠️ Needs: Enhanced prompt with reference images
- ⚠️ Needs: Few-shot examples (size & token optimized)

#### Stage 2: Hybrid (In Progress)
- Build Supabase database with:
  - Real images from video frames
  - AI-augmented images
  - Training data collection
- Train lightweight local model for mobile browsers
- LLM API as fallback mechanism

#### Stage 3: Local-First (Future)
- Local model as primary
- LLM API as fallback only
- Acceptable accuracy threshold before launch

### Phase 3: Results Display & Interaction
**Status**: Needs implementation

#### Required Features
1. **Visual Display**
   - Bottle image with red line marking oil level
   - Consumed & remaining oil text display

2. **Interactive Slider**
   - Starts at red line (remaining oil level)
   - 55ml increments (1/4 tea cup)
   - Visual cup representation below slider
   - Cup filling animation (1/4, 1/2, 3/4, full, etc.)
   - Stops at last 55ml increment if remaining < 55ml

3. **Admin Features**
   - Manual correction capability
   - LLM API fallback trigger
   - Upload image with metadata
   - Training data management

## Tools & Integrations to Add

### High Priority
1. **Context7 MCP** - Documentation and code examples
2. **Tavily MCP** - Web search and research
3. **Playwright** - Already in devDependencies, needs integration
4. **OpenCV.js** - For logo detection

### Medium Priority
5. **Autoresearch** - Research automation
6. **RAG-Anything** - RAG capabilities
7. **Grill-me** - Testing/validation
8. **Superpowers** - Additional capabilities

### Low Priority (Future)
9. **Remotion** - Video generation
10. **Tailwind v4** - Already using Tailwind, consider upgrade

## Implementation Steps

### Immediate (This Session)
1. ✅ Review current state
2. ✅ Create implementation plan
3. Add Context7 MCP configuration
4. Add Tavily MCP configuration
5. Update workflow documentation

### Next Session
1. Implement enhanced camera guidance
2. Add logo detection
3. Implement interactive slider
4. Set up Supabase training database

### Future Sessions
1. Train local model
2. Implement hybrid analysis
3. Admin dashboard enhancements
4. Performance optimization

## Technical Decisions

### Camera Workflow
- **Decision**: Use static outline overlay instead of auto-detect
- **Rationale**: Simpler, more reliable, better UX
- **Implementation**: CSS overlay with bottle-camera-outline2.png

### Logo Detection
- **Decision**: OpenCV.js template matching or lightweight MobileNetV2
- **Rationale**: Runs locally, no API calls, fast
- **Fallback**: Proceed with flag if geometry is perfect

### Analysis Strategy
- **Decision**: 3-stage approach (LLM → Hybrid → Local)
- **Rationale**: Gradual improvement, data collection, risk mitigation
- **Timeline**: Stage 1 (now), Stage 2 (next month), Stage 3 (launch)

### Slider Implementation
- **Decision**: 55ml increments with visual cup representation
- **Rationale**: User-friendly, matches cooking measurements
- **Library**: Radix UI Slider (already in dependencies)

## Success Metrics

### Stage 1 (Current)
- ✅ LLM accuracy > 80%
- ✅ Response time < 3s
- ✅ Fallback mechanism working

### Stage 2 (Target)
- Local model accuracy > 85%
- Response time < 1s
- Training data > 1000 images

### Stage 3 (Launch)
- Local model accuracy > 90%
- Response time < 500ms
- User satisfaction > 4/5

## Next Actions
1. Add Context7 and Tavily MCPs
2. Review and update camera capture component
3. Design slider component
4. Set up Supabase training database schema
