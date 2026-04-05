# Afia Oil Tracker - Client Summary

**Prepared by:** Ahmed | **Date:** February 27, 2026 | **Status:** Ready for Implementation

---

## The Problem

> Home cooking oil consumers have **no practical way** to track how much oil they've consumed from a bottle.

- Visual estimation is unreliable
- Measuring before every use is disruptive
- No existing product bridges the gap between physical cooking and dietary tracking
- Health-conscious users want calorie/fat awareness without manual effort

---

## The Solution

**Afia Oil Tracker** is a Progressive Web App (PWA) that uses **AI vision** to estimate cooking oil bottle fill levels from a single phone photo.

```
  QR Code on Bottle  -->  Phone Camera  -->  AI Analysis  -->  Instant Results
       (0 sec)            (1 tap)           (3-5 sec)         (ml, tbsp, cups + nutrition)
```

### What Makes It Special

| Differentiator | Description |
|---|---|
| **Zero Friction** | QR code on bottle -> instant access. No app download, no account, no onboarding |
| **Hybrid AI + Math** | AI estimates fill %; precise volume calculated from known bottle geometry |
| **Self-Improving** | Every scan is a labeled training example. The product IS the data engine |
| **Zero Cost (POC)** | $0/month on free tiers; Full Launch: $3–30/month at 10K–100K scans |

---

## How It Works

### User Journey (Under 8 Seconds)

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|  1. SCAN QR CODE  | --> |  2. TAKE PHOTO    | --> |  3. GET RESULTS   |
|                   |     |                   |     |                   |
|  QR on bottle     |     |  Rear camera      |     |  Fill %           |
|  opens PWA with   |     |  activates with   |     |  Volume (ml/tbsp/ |
|  bottle context   |     |  alignment guide   |     |  cups)            |
|  pre-loaded       |     |  User captures    |     |  Nutrition facts  |
|                   |     |  bottle photo     |     |  Confidence level |
+-------------------+     +-------------------+     +-------------------+
                                                            |
                                                            v
                                                    +-------------------+
                                                    |                   |
                                                    |  4. FEEDBACK      |
                                                    |                   |
                                                    |  "Was this right?"|
                                                    |  Feeds training   |
                                                    |  data pipeline    |
                                                    +-------------------+
```

### Detailed Data Flow

```
                          USER'S PHONE
  +----------------------------------------------------------+
  |                                                          |
  |   QR Scan --> PWA Loads --> Camera --> Capture Photo      |
  |                                         |                |
  |                           Compress (800px JPEG, ~70KB)   |
  |                                         |                |
  +----------------------------|-----------------------------+
                               |
                               v  POST /analyze
  +----------------------------------------------------------+
  |              CLOUDFLARE WORKER (Edge Proxy)               |
  |                                                          |
  |  [Origin Check] --> [Rate Limit] --> [Size Guard]        |
  |                                         |                |
  |                          Store image to R2               |
  |                                         |                |
  |                      +------------------+--------+       |
  |                      |                           |       |
  |               Gemini 2.5 Flash           Groq Fallback   |
  |               (Primary AI)              (Auto-failover)  |
  |                      |                           |       |
  |                      +------------------+--------+       |
  |                                         |                |
  |                    { fillPercentage: 42,                 |
  |                      confidence: "high" }                |
  |                                         |                |
  |                     Store metadata to R2                 |
  +----------------------------|-----------------------------+
                               |
                               v  Response
  +----------------------------------------------------------+
  |                      PWA (Client-Side)                   |
  |                                                          |
  |   Volume = 500ml x 42% = 210ml remaining                |
  |   Consumed = 290ml                                       |
  |   Tablespoons = 14.2 tbsp remaining                     |
  |   Cups = 0.89 cups remaining                             |
  |   Nutrition = 290ml consumed x USDA data                 |
  |                                                          |
  |   Display: Fill gauge + volumes + nutrition facts        |
  +----------------------------------------------------------+
```

---

## System Architecture

```
+----------------------------------------------------------------------+
|                        SYSTEM ARCHITECTURE                           |
+----------------------------------------------------------------------+

  FRONTEND (Cloudflare Pages)          BACKEND (Cloudflare Worker)
  +---------------------------+        +---------------------------+
  |  React 19 + TypeScript    |        |  Hono.js Framework        |
  |  Vite 7 Build System      |  <-->  |  Zero Cold Starts         |
  |  PWA (Service Worker)     |  HTTP  |  Rate Limiting (KV)       |
  |  Mobile-First CSS         |        |  R2 Storage Binding       |
  +---------------------------+        +---------------------------+
                                              |           |
                                              v           v
                                    +-----------+   +-----------+
                                    | AI Vision |   | Cloudflare|
                                    | Providers |   |    R2     |
                                    |           |   |           |
                                    | Gemini 2.5|   | Images    |
                                    | Flash     |   | Metadata  |
                                    |     |     |   | Feedback  |
                                    | Groq Llama|   |           |
                                    | 4 Scout   |   | 10GB Free |
                                    +-----------+   +-----------+
```

### Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + TypeScript + Vite 7 | Fast dev, optimized builds, type safety |
| PWA | vite-plugin-pwa | Offline shell, auto-update, installable |
| AI Primary | Gemini 2.5 Flash | Free tier, JSON mode, best accuracy |
| AI Fallback | Groq + Llama 4 Scout | Auto-failover, fast inference |
| API Proxy | Cloudflare Worker (Hono) | Zero cold start, edge security |
| Storage | Cloudflare R2 | Zero egress, training data |
| Rate Limiting | Cloudflare KV | 10 req/min/IP protection |
| CI/CD | GitHub Actions | Auto-deploy on push |
| Hosting | Cloudflare Pages | Unlimited bandwidth, PR previews |

---

## Supported Bottles (POC)

```
  +---+          +---+          +----+
  | | |          | | |          |    |
  +---+          +---+          +----+
  |   |          |   |          |    |
  |   |          |   |          |    |
  |   |          |   |          |    |
  |   |          |   |          |    |
  |   |          |   |          |    |
  |   |          |   |          |    |
  +---+          |   |          |    |
                 |   |          |    |
  Filippo Berio  +---+          +----+
  500ml
  Cylinder        Bertolli      Afia
  65mm x 220mm    750ml         Sunflower
                  Frustum       1000ml
                  70/85mm       Cylinder
                  x 280mm       80mm x 275mm
```

| SKU | Bottle | Volume | Shape | Oil Type |
|-----|--------|--------|-------|----------|
| `filippo-berio-500ml` | Filippo Berio Extra Virgin | 500ml | Cylinder | Extra Virgin Olive |
| `bertolli-750ml` | Bertolli Classico | 750ml | Frustum | Pure Olive |
| `afia-sunflower-1l` | Afia Sunflower Oil | 1000ml | Cylinder | Sunflower |

---

## UX Design Highlights

### Design System

```
  Color Palette (Olive Green Theme)
  +--------+  +--------+  +--------+  +--------+  +--------+
  |#2D6A4F |  |#40916C |  |#FFFFFF |  |#E9A820 |  |#D64045 |
  |Primary |  |Primary |  |Surface |  |Warning |  |Danger  |
  |        |  |Light   |  |        |  |        |  |        |
  +--------+  +--------+  +--------+  +--------+  +--------+
  Deep Olive   Hover       Cards       Medium      Low
  Green        State       Background  Confidence  Confidence
```

### Screen Flow

```
  +----------+    +----------+    +----------+    +----------+    +----------+
  |          |    |          |    |          |    |          |    |          |
  | QR       |--->| Camera   |--->| Photo    |--->| Analyzing|--->| Result   |
  | Landing  |    | View-    |    | Preview  |    | State    |    | Display  |
  |          |    | finder   |    |          |    |          |    |          |
  | Bottle   |    | + Guide  |    | Retake / |    | Animated |    | Fill %   |
  | Info     |    | Overlay  |    | Use      |    | Bottle   |    | Volumes  |
  | Start    |    | Capture  |    | Photo    |    | Fill     |    | Nutrition|
  | Scan     |    | Button   |    |          |    | 3-8 sec  |    | Feedback |
  +----------+    +----------+    +----------+    +----------+    +----------+
                       ^                                               |
                       |                                               v
                       +<------------ Retake / Scan Again <-----------+
```

### Result Screen Layout

```
  +----------------------------------+
  |                                  |
  |     +--------+                   |
  |     |   ##   |    68%            |
  |     |  ####  |    Fill Level     |
  |     | ###### |                   |
  |     | ###### |    High           |
  |     +--------+    Confidence     |
  |                                  |
  |  +------------------------------+|
  |  | Remaining        Consumed    ||
  |  | 340 ml           160 ml      ||
  |  | 23.0 tbsp        10.8 tbsp   ||
  |  | 1.4 cups         0.7 cups    ||
  |  +------------------------------+|
  |                                  |
  |  +------------------------------+|
  |  | Nutrition (consumed)         ||
  |  | Calories        1,325 cal    ||
  |  | Total Fat       149.8 g      ||
  |  | Sat. Fat        20.7 g       ||
  |  +------------------------------+|
  |                                  |
  |  Was this accurate?              |
  |  [About right]  [Too high]       |
  |  [Too low]      [Way off]        |
  +----------------------------------+
```

---

## Training Data Pipeline

### How Scans Become Training Data

```
  SCAN CAPTURED                  FEEDBACK COLLECTED              VALIDATION
  +------------------+          +------------------+          +------------------+
  |                  |          |                  |          |                  |
  | Image (JPEG)     |   --->   | "Too low"        |   --->   | Layer 1 Checks:  |
  | AI Prediction    |          | User estimate:   |          | - Response time   |
  | - fill: 42%      |          |   55%            |          | - Boundary values |
  | - confidence:    |          |                  |          | - Contradictions  |
  |   high           |          |                  |          | - Extreme delta   |
  | Device metadata  |          |                  |          |                  |
  |                  |          |                  |          | Status: ACCEPTED  |
  +------------------+          +------------------+          +------------------+
                                                                      |
                                                                      v
                                                              +------------------+
                                                              | Training Record  |
                                                              |                  |
                                                              | Image + Label    |
                                                              | trainingEligible |
                                                              | = true           |
                                                              +------------------+
```

### Feedback Validation (Layer 1)

| Flag | Rule | Example |
|------|------|---------|
| `too_fast` | Response < 3 seconds | User tapped randomly |
| `boundary_value` | Estimate is 0% or 100% | Suspicious edge value |
| `contradictory` | "Too low" but estimate < AI's | Logically inconsistent |
| `extreme_delta` | Difference > 30% from AI | Signal quality concern |

### Model Evolution Roadmap

```
  50+ Scans          100+ Scans         500+ Scans         1000+ Scans
  +-----------+      +-----------+      +-----------+      +-----------+
  |           |      |           |      |           |      |           |
  | Prompt    | ---> | Few-Shot  | ---> | Fine-Tune | ---> | Fine-Tune |
  | Refinement|      | Examples  |      | Qwen2.5   |      | Gemini    |
  |           |      |           |      | VL 7B     |      | Flash     |
  | Error     |      | Best      |      |           |      |           |
  | pattern   |      | labeled   |      | Open      |      | Google    |
  | analysis  |      | pairs in  |      | source    |      | AI Studio |
  |           |      | prompt    |      | control   |      |           |
  +-----------+      +-----------+      +-----------+      +-----------+
       $0                 $0             ~$50/run          ~$100/run
```

---

## Security Architecture

```
  +------------------------------------------------------------------+
  |                      SECURITY LAYERS                             |
  +------------------------------------------------------------------+
  |                                                                  |
  |  1. ORIGIN VALIDATION                                            |
  |     Only allow: afia-oil-tracker.pages.dev + localhost            |
  |                                                                  |
  |  2. RATE LIMITING                                                |
  |     10 requests/minute per IP (KV-backed sliding window)         |
  |                                                                  |
  |  3. PAYLOAD GUARD                                                |
  |     Reject requests > 4MB                                        |
  |                                                                  |
  |  4. API KEY PROTECTION                                           |
  |     Secrets in Cloudflare Worker only (never in client/git)      |
  |                                                                  |
  |  5. DATA PRIVACY                                                 |
  |     No PII collected. No accounts. No names/emails.              |
  |     R2 bucket not publicly accessible.                           |
  |                                                                  |
  |  6. TRANSPORT SECURITY                                           |
  |     All traffic over HTTPS (Cloudflare enforced)                 |
  |                                                                  |
  +------------------------------------------------------------------+
```

---

## Success Criteria

### User Success

| Metric | Target |
|--------|--------|
| Scan completion time | < 8 seconds (photo to result) |
| Feedback submission rate | >= 30% of scans |
| Scan completion rate | >= 80% of initiated scans reach result |

### Business Success

| Metric | Target |
|--------|--------|
| Real scans collected (month 1) | >= 50 with usable training data |
| LLM accuracy (MAE) | <= 15% fill level delta |
| Feedback acceptance rate | >= 60% pass Layer 1 validation |
| Infrastructure cost | $0/month |

### Technical Success

| Metric | Target |
|--------|--------|
| API latency (p95) | < 8 seconds |
| Unit tests | All 34 passing |
| CI/CD | Clean deploys on every push |
| Offline shell | Loads from service worker cache |

---

## Product Roadmap

```
  NOW                   PHASE 2              PHASE 3             PHASE 4           PHASE 5
  POC v1                User Engagement      Model Intelligence  Platform Scale    Business Intel
  +-----------+         +-----------+        +-----------+       +-----------+     +-----------+
  |           |         |           |        |           |       |           |     |           |
  | QR->Scan  |   -->   | User      |  -->   | Prompt    | -->   | Native    | --> | Analytics |
  | ->Result  |         | Accounts  |        | Refinement|       | Mobile    |     | Dashboard |
  |           |         |           |        |           |       | App       |     |           |
  | 3 Bottles |         | Scan      |        | Few-Shot  |       |           |     | Regional  |
  | AI Vision |         | History   |        | Learning  |       | Barcode   |     | Patterns  |
  | Feedback  |         |           |        |           |       | Scanning  |     |           |
  | Training  |         | Custom    |        | Fine-     |       |           |     | Size      |
  | Data      |         | Starting  |        | Tuning    |       | Multi-    |     | Insights  |
  |           |         | Level     |        |           |       | Brand     |     |           |
  | CI/CD     |         |           |        | Admin     |       | Registry  |     | Loyalty   |
  |           |         | Push      |        | Dashboard |       |           |     | Program   |
  | $0/month  |         | Notifs    |        |           |       | Multi-    |     |           |
  +-----------+         +-----------+        +-----------+       | Language  |     +-----------+
  2-4 weeks              Post-POC             100+ Scans         +-----------+
  1 Developer            Validation                               Scale
```

---

## Implementation Progress

### Epics Overview

```
  Epic 1: Core Scan Experience          [##########] 14 stories  IMPLEMENTED
  Epic 2: Rich Consumption Insights     [##########]  7 stories  IMPLEMENTED
  Epic 3: Continuous Improvement Loop   [##########]  8 stories  IMPLEMENTED
  Epic 4: Resilience & Edge Cases       [##########]  7 stories  IMPLEMENTED
  Epic 5: Deployment & Operations       [##########]  2 stories  IMPLEMENTED
                                         ----------
                                         38 stories total
```

### Key Deliverables

| Deliverable | Status |
|-------------|--------|
| Product Requirements Document (PRD) | Complete (463 lines, 39 FRs, 30 NFRs) |
| Architecture Decision Document | Complete (928 lines, 14 sections) |
| UX Design Specification | Complete (9 screens, full design system) |
| Epics & User Stories | Complete (38 stories across 5 epics) |
| API Specification | Complete (2 endpoints, full contracts) |
| Data Schemas | Complete (TypeScript interfaces) |
| LLM Prompt Engineering | Complete (3 providers) |
| Deployment Guide | Complete (local + production + CI/CD) |
| Implementation Readiness Assessment | **READY FOR IMPLEMENTATION** |
| Source Code (Frontend) | Complete (11 React components, 3 hooks, 4 utils) |
| Source Code (Backend) | Complete (Cloudflare Worker, 2 AI providers) |
| Unit Tests | Complete (34 tests passing) |
| CI/CD Pipeline | Complete (GitHub Actions) |

---

## Infrastructure Cost Analysis

```
  +-------------------------------------------+
  |         MONTHLY COST: $0                  |
  +-------------------------------------------+
  |                                           |
  |  Cloudflare Pages     FREE                |
  |  - Unlimited bandwidth                    |
  |  - Custom domains                         |
  |  - PR preview deploys                     |
  |                                           |
  |  Cloudflare Worker    FREE                |
  |  - 100,000 requests/day                   |
  |  - Zero cold starts                       |
  |                                           |
  |  Cloudflare R2        FREE                |
  |  - 10 GB storage (~140,000 scans)         |
  |  - 1M write ops/month                     |
  |  - $0 egress (always)                     |
  |                                           |
  |  Gemini 2.5 Flash     FREE                |
  |  - 1,500 requests/day                     |
  |  - JSON response mode                     |
  |                                           |
  |  Groq (Fallback)      FREE                |
  |  - Fast inference                         |
  |  - Auto-failover only                     |
  |                                           |
  |  GitHub Actions       FREE                |
  |  - CI/CD pipeline                         |
  |  - Auto-deploy on push                    |
  |                                           |
  +-------------------------------------------+
```

---

## Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| iOS camera bug in standalone PWA | High | Browser mode enforced; "Open in Safari" fallback |
| AI inaccuracy on dark bottles | High | POC scoped to clear glass; +-15% framing |
| API latency > 8s | Medium | Disabled AI thinking; 800px compression; Groq fallback |
| Gemini rate limits | Medium | Auto-fallback to Groq; per-IP rate limiting |
| Unreliable user feedback | Medium | Layer 1 validation flags contradictions/speed/boundaries |

---

## Competitive Advantage

```
                    HIGH PRECISION
                         |
                         |
           Smart Scales  |
           (hardware)    |
                         |
                         |
  HIGH     -------------|------------- LOW
  FRICTION               |              FRICTION
                         |
           MyFitnessPal  |    AFIA OIL
           (manual log)  |    TRACKER
                         |    (QR + AI)
                         |
                    LOW PRECISION
                    (improving with data)
```

**Afia occupies an uncontested niche:** passive dietary tracking via product-embedded QR + AI vision, zero hardware, zero friction.

---

## Summary

Afia Oil Tracker is a **fully planned and implemented** POC that proves AI-powered cooking oil tracking is viable, useful, and achievable at **zero infrastructure cost**. The system is designed to improve with every scan, creating a compounding data advantage.

**Next step:** Deploy to production and begin collecting real-world scans.

---

*Document produced: February 27, 2026*
*Author: Ahmed*
*Status: POC v1 - Ready for Deployment*
