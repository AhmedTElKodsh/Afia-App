# Afia Oil Tracker - Project Overview

**Generated:** 2026-04-20 | **Scan Level:** Quick | **Mode:** Full Rescan

## Executive Summary

**Afia Oil Tracker** is a mobile-first Progressive Web App (PWA) that uses AI vision to estimate cooking oil bottle fill levels from a single photograph. Users scan a QR code on their bottle, capture an image, and instantly receive fill percentage, remaining volume (ml, tbsp, cups), and nutrition facts for consumed oil.

**Current Status:** POC Complete (5 epics, 54 stories) - **Local-First Development Mode Active**

## Project Vision: Three-Stage Architecture Evolution

The project is designed to evolve through three distinct stages, prioritizing **local-first development** before cloud deployment:

### Stage 1: LLM Only (Current - Cloud-Based)
- **AI Provider:** Gemini 2.5 Flash (primary) + Groq Llama 4 Scout (fallback)
- **Deployment:** Cloudflare Workers + Pages
- **Development:** Local testing with mock services
- **Status:** ✅ Complete and deployed

### Stage 2: Local Model + LLM Fallback (In Progress)
- **Primary:** Local ONNX model running in browser
- **Fallback:** Cloud LLM when local model confidence is low
- **Development:** Fully local testing with real ONNX inference
- **Status:** 🚧 Architecture documented, implementation planned

### Stage 3: Local Model Only (Future)
- **AI Provider:** 100% local ONNX model (no cloud dependency)
- **Deployment:** Fully offline-capable PWA
- **Development:** Complete local development and testing
- **Status:** 📋 Planned

## Local-First Development Philosophy

**Critical:** This project follows a **local-first development approach**:

1. **Develop Locally** - All features are built and tested locally first
2. **Test Locally** - Unit tests, integration tests, and E2E tests run without cloud services
3. **Mock Services** - LLM responses and database operations can be mocked
4. **Deploy to Cloud** - Only after local validation is complete

**Current Local Development Setup:**
- Frontend: `npm run dev` → http://localhost:5173
- Worker: `cd worker && npm run dev` → http://localhost:8787
- Tests: `npm test` (34 unit tests, all passing)
- E2E: `npm run test:e2e` (Playwright tests)

**Automated Cloudflare deployments are currently PAUSED** to focus on local testing and Stage 2 implementation.

## Repository Structure

**Type:** Multi-part project (Frontend + Worker)

```
afia-oil-tracker/
├── src/                    # Frontend (React 19 PWA)
├── worker/                 # Backend (Cloudflare Worker)
├── docs/                   # Project documentation
├── scripts/                # Training data pipeline
├── models/                 # ONNX models (Stage 2+)
└── tests/                  # E2E and visual regression tests
```

## Technology Stack

### Frontend (Part 1: Web PWA)

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | React | 19.2.0 | UI components and state management |
| Language | TypeScript | 5.9.3 | Type-safe development |
| Build Tool | Vite | 7.3.1 | Fast dev server and optimized builds |
| PWA | vite-plugin-pwa | 0.21.1 | Service worker, offline support |
| Styling | CSS Custom Properties | - | Design system tokens |
| AI (Stage 2+) | ONNX Runtime Web | 1.24.3 | Local model inference |
| Testing | Vitest | 4.0.18 | Unit tests (34 tests) |
| E2E Testing | Playwright | 1.58.2 | Browser automation |

### Worker (Part 2: Backend API)

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Cloudflare Workers | - | Edge compute platform |
| Framework | Hono | 4.7.0 | Lightweight HTTP router |
| Language | TypeScript | 5.7.3 | Type-safe API development |
| AI Primary | Gemini 2.5 Flash | latest | Image analysis (Stage 1) |
| AI Fallback | Groq Llama 4 Scout | - | Backup AI provider (Stage 1) |
| Storage | Cloudflare R2 | - | Training data storage |
| Rate Limiting | Cloudflare KV | - | 10 req/min/IP sliding window |

### Shared Dependencies

| Category | Technology | Purpose |
|----------|-----------|---------|
| Database | Supabase | User data, scan history (optional) |
| Internationalization | i18next | Multi-language support (EN/AR) |
| Icons | Lucide React | Consistent icon system |

## Architecture Pattern

**Multi-tier Architecture with Edge Computing:**

- **Presentation Layer:** React PWA (client-side rendering)
- **API Layer:** Cloudflare Worker (edge compute)
- **AI Layer:** Gemini/Groq (Stage 1) → ONNX (Stage 2+)
- **Storage Layer:** Cloudflare R2 + Supabase (optional)

**State Management:** Finite State Machine pattern
- States: `qr-landing`, `camera-capture`, `analyzing`, `result-display`, `feedback-prompt`
- Transitions driven by user actions and API responses

## Key Features

### Core Functionality (Epic 1)
- ✅ QR code landing page with bottle information
- ✅ Camera capture with rear camera activation
- ✅ AI-powered fill level estimation
- ✅ Visual fill gauge with animation
- ✅ Volume breakdown (remaining + consumed)

### Rich Insights (Epic 2)
- ✅ Multi-unit display (ml, tbsp, cups)
- ✅ USDA nutrition facts (calories, fat, saturated fat)
- ✅ Consumption tracking
- ✅ Oil type information

### Continuous Improvement (Epic 3)
- ✅ User feedback collection (accuracy rating)
- ✅ Corrected estimate capture
- ✅ Feedback validation (4 flags: too_fast, boundary_value, contradictory, extreme_delta)
- ✅ Training data pipeline to R2

### Resilience (Epic 4)
- ✅ Offline detection and graceful degradation
- ✅ iOS in-app browser detection and warnings
- ✅ Unknown SKU handling
- ✅ Privacy notice and consent

### Operations (Epic 5)
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Rate limiting (10 req/min/IP)
- ✅ CORS security
- ✅ Error tracking and logging

## Development Workflow

### Local Development (Recommended)

```bash
# 1. Install dependencies
npm install
cd worker && npm install && cd ..

# 2. Configure environment
cp .env.example .env.local
cp worker/.dev.vars.example worker/.dev.vars

# 3. Start services
# Terminal 1 - Worker
cd worker && npm run dev

# Terminal 2 - Frontend
npm run dev

# 4. Access application
# Frontend: http://localhost:5173/?sku=afia-corn-1.5l
# Worker: http://localhost:8787
```

### Testing

```bash
# Unit tests (34 tests)
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run build
cd worker && npm run type-check
```

### Cloud Deployment (After Local Validation)

```bash
# Deploy Worker
cd worker && npx wrangler deploy

# Deploy Frontend
npm run build
npx wrangler pages deploy dist --project-name=afia-oil-tracker
```

## Project Scope

**Current POC Scope:** Single SKU (Afia Pure Corn Oil 1.5L)

The application is currently focused on one bottle type to validate the core concept. Multi-bottle support (Epic 7) was retired in favor of a focused POC pilot.

**Supported Bottle:**
- SKU: `afia-corn-1.5l`
- Brand: Afia
- Type: Pure Corn Oil
- Volume: 1500ml
- Geometry: Cylindrical

**Unknown/Legacy SKUs:** Gracefully degrade to "not supported" state with clear messaging.

## Key Design Decisions

### 1. Local-First Development
**Decision:** Prioritize local development and testing before cloud deployment.

**Rationale:**
- Faster iteration cycles
- No API costs during development
- Easier debugging and testing
- Supports offline development

### 2. Three-Stage Architecture Evolution
**Decision:** Plan for progressive enhancement from cloud LLM → hybrid → fully local.

**Rationale:**
- Stage 1 validates concept quickly
- Stage 2 reduces API costs and improves privacy
- Stage 3 enables fully offline operation
- Each stage builds on previous learnings

### 3. PWA with Browser Display Mode
**Decision:** Use `display: "browser"` instead of `standalone`.

**Rationale:**
- iOS WebKit bug: `getUserMedia` fails in standalone mode
- Browser mode keeps address bar but ensures camera works
- Trade-off: Less immersive, but functional on all devices

### 4. Hybrid AI + Math Approach
**Decision:** LLM estimates fill percentage; deterministic formulas calculate volume.

**Rationale:**
- Reliable volume calculations even with minor LLM inaccuracies
- Cylinder/frustum formulas are exact
- Separates estimation from calculation concerns

### 5. Training Data from Day One
**Decision:** Store every scan to R2 with metadata.

**Rationale:**
- Builds labeled dataset automatically
- User feedback creates ground truth
- Enables future model training (Stage 2+)
- Validation flags ensure data quality

### 6. Feedback Validation
**Decision:** Implement 4-flag validation system before marking data as training-eligible.

**Rationale:**
- Filters out low-quality feedback
- Prevents gaming/spam
- Ensures training data integrity
- Flags: `too_fast`, `boundary_value`, `contradictory`, `extreme_delta`

## Performance Metrics

### Bundle Sizes (Production)
- **JavaScript:** ~209KB (65KB gzipped)
- **CSS:** ~9KB
- **Total First Load:** <100KB gzipped

### API Latency (Stage 1)
- **Gemini 2.5 Flash:** ~800-1200ms average
- **Groq Llama 4 Scout:** ~600-900ms average
- **Worker Processing:** <50ms

### Test Coverage
- **Unit Tests:** 34 tests across 3 core modules
- **Coverage:** volumeCalculator (16), nutritionCalculator (7), feedbackValidator (11)
- **E2E Tests:** Camera capture, scan flow, feedback submission

## Security & Privacy

### Data Handling
- **Images:** Stored in R2 with scan metadata (for training)
- **User Consent:** Privacy notice on first scan (localStorage)
- **No PII:** No user accounts or personal information collected
- **Feedback:** Anonymous accuracy ratings and corrections

### API Security
- **CORS:** Allowlist of approved origins
- **Rate Limiting:** 10 requests/min/IP (Cloudflare KV)
- **Input Validation:** SKU validation, image size limits
- **Secrets:** API keys stored in Cloudflare secrets (not in code)

### Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Known Limitations

### Current Constraints
1. **Single SKU:** Only `afia-corn-1.5l` supported in POC
2. **Camera Required:** No file upload option
3. **iOS Standalone:** Camera fails in standalone PWA mode
4. **API Dependency:** Stage 1 requires cloud LLM (Gemini/Groq)
5. **Rate Limiting:** 10 scans per minute per IP

### Planned Improvements (Stage 2+)
1. Local ONNX model for offline inference
2. Hybrid approach with LLM fallback
3. Multi-bottle support (future epic)
4. Enhanced training data pipeline
5. Model performance monitoring

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System architecture with three-stage diagrams |
| [API Contracts](./api-contracts.md) | REST endpoints and schemas |
| [Component Inventory](./component-inventory.md) | All React components and hooks |
| [Data Models](./data-models.md) | TypeScript interfaces and data structures |
| [Development Guide](./development-guide.md) | Setup, testing, and deployment |
| [Local Development](./LOCAL-DEVELOPMENT.md) | Local-first development guide |
| [Source Tree Analysis](./source-tree-analysis.md) | Directory structure and organization |
| [Known Issues](./known-issues.md) | Current bugs and technical debt |

## Next Steps

### Immediate (Stage 2 Preparation)
1. ✅ Document three-stage architecture
2. 🚧 Implement ONNX model loading
3. 🚧 Create local inference pipeline
4. 🚧 Add confidence threshold logic
5. 🚧 Test hybrid approach locally

### Short-term (Stage 2 Implementation)
1. Train ONNX model from collected data
2. Implement browser-based inference
3. Add LLM fallback logic
4. Performance testing and optimization
5. Deploy Stage 2 to production

### Long-term (Stage 3)
1. Improve local model accuracy
2. Remove cloud LLM dependency
3. Fully offline PWA
4. Multi-bottle support
5. Enhanced training pipeline

---

**For detailed architecture diagrams including all three stages, see [Architecture](./architecture.md).**
