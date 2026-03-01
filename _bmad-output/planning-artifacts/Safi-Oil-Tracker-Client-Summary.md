**SAFI OIL TRACKER**

━━━━━━━━━━━━━━━━━━━━

AI-Powered Cooking Oil Tracking

**Scan. Snap. Know.**

Client Summary Document

Prepared by: Ahmed \| February 27, 2026

**Status: Ready for Implementation**

The Problem

+----------------------------------------------------------------------+
| > Home cooking oil consumers have no practical way to track how much |
| > oil they\'ve consumed from a bottle.                               |
+----------------------------------------------------------------------+

-   Visual estimation is unreliable

-   Measuring before every use is disruptive

-   No existing product bridges the gap between physical cooking and
    dietary tracking

-   Health-conscious users want calorie/fat awareness without manual
    effort

Our Solution

Safi Oil Tracker is a Progressive Web App (PWA) that uses AI vision to
estimate cooking oil bottle fill levels from a single phone photo.

+---------------+---+------------+---+--------------+---+-------------+
| **QR Code**   | → | **Phone**  | → | **AI**       | → | **Instant** |
|               |   |            |   |              |   |             |
| **on Bottle** |   | **Camera** |   | **Analysis** |   | **Results** |
+---------------+---+------------+---+--------------+---+-------------+

What Makes It Special

  -------------------- --------------------------------------------------------------------------------
  **Differentiator**   **Description**
  Zero Friction        QR code on bottle → instant access. No app download, no account, no onboarding
  Hybrid AI + Math     AI estimates fill %; precise volume calculated from known bottle geometry
  Self-Improving       Every scan is a labeled training example. The product IS the data engine
  Zero Cost            \$0/month infrastructure on Cloudflare + Gemini free tiers
  -------------------- --------------------------------------------------------------------------------

How It Works

User Journey (Under 8 Seconds)

1.  **Scan QR Code** on bottle --- pre-loads bottle context

2.  **Take Photo** with alignment guide overlay

3.  **AI Analyzes** using Gemini 2.5 Flash (3-5 seconds)

4.  **View Results** --- fill %, volumes (ml/tbsp/cups), nutrition facts

5.  **Give Feedback** --- training data for continuous improvement

Data Flow

User\'s phone captures and compresses photo (800px JPEG, \~70KB), sends
to Cloudflare Worker edge proxy. The worker validates origin, checks
rate limits, then routes to Gemini 2.5 Flash (with Groq online-only
auto-fallback). AI returns fill percentage and confidence. Client-side
calculates precise volumes from known bottle geometry and USDA nutrition
data. Note: In POC, R2 storage is deferred (credit card required) ---
images are processed but not persisted.

System Architecture

Pattern: Thin-Client PWA + Serverless Edge Proxy + Object Storage. All
domain logic (volume calculation, unit conversion, nutrition lookup)
runs in the PWA client. The Cloudflare Worker is a security proxy with
data persistence responsibilities. No application server. No database
server.

Architecture Layers

  ------------------------ -------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------
  **Layer**                **Technology**                   **Responsibility**
  ① User Device --- PWA    React 19 + TypeScript + Vite 7   QR scan → camera → compress to 800px JPEG (\~70KB) → POST to Worker. All volume/nutrition logic runs locally.
  ② Edge Proxy             Cloudflare Worker + Hono.js      Origin validation · Rate limiting (10 req/min/IP) · Payload guard (\<4MB) · LLM routing (Gemini → Groq) · R2 storage binding
  ③ AI Vision (Primary)    Gemini 2.5 Flash                 Receives base64 JPEG + SKU context. Returns JSON: { fill_percentage, confidence }. Free: 500 req/day.
  ④ AI Vision (Fallback)   Groq + Llama 4 Scout             Online-only fallback. OpenAI-compatible API. Auto-failover if Gemini fails. Post-POC: replace with fine-tuned Qwen2.5-VL 7B (offline-capable).
  ⑤ Object Storage         Cloudflare R2                    images/{scanId}.jpg + metadata/{scanId}.json. 10 GB free (\~140K scans). \$0 egress. ⚠ Requires credit card activation --- deferred to post-POC.
  ⑥ Hosting                Cloudflare Pages                 Unlimited bandwidth. Custom domains. PR preview deployments. CDN-distributed globally.
  ⑦ Rate Limiting          Cloudflare KV                    Sliding window: 10 requests/min/IP. Stored in KV store (zero latency at edge).
  ⑧ CI/CD                  GitHub Actions                   Auto-deploy on push to main. Runs 34 unit tests. Uses wrangler-action\@v3 for Worker deploys.
  ------------------------ -------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------

Request Flow --- Happy Path

6.  User scans QR → Browser opens:
    https://safi-oil-tracker.pages.dev/?sku=filippo-berio-500ml

7.  PWA loads bottle geometry from local bottleRegistry.js

8.  User captures photo → canvas → JPEG @ 800px, quality 0.78 (\~70KB)

9.  POST /analyze { image: base64, sku: \"filippo-berio-500ml\" }

10. Worker validates origin, rate limit, payload → stores image to R2
    (deferred in POC)

11. Gemini 2.5 Flash returns: { fill_percentage: 42, confidence:
    \"high\" }

12. Worker stores metadata → returns { scanId, fillPercentage: 42,
    confidence, provider }

13. PWA calculates: 500ml × 42% = 210ml remaining, 290ml consumed → 14.2
    tbsp, 0.89 cups

14. User gives feedback → POST /feedback → Worker validates → updates
    metadata/{scanId}.json

Why This Architecture

  ------------------------------- ------------------------------------------------------- --------------------------------
  **Principle**                   **Implementation**                                      **Benefit**
  Zero cold starts                Cloudflare Workers run on V8 isolates, not containers   \< 50ms startup globally
  API keys never in browser       Gemini/Groq keys in Worker env vars only                No key leakage via DevTools
  No database server              Flat files in R2 (images + JSON)                        Zero infra to manage
  Client-side domain logic        volumeCalculator.js + nutritionCalculator.js in PWA     No server round-trips for math
  Same platform native bindings   Worker has direct R2 binding                            Faster than HTTP API calls
  ------------------------------- ------------------------------------------------------- --------------------------------

+----------------------------------------------------------------------+
| > All serverless. All free tier. Zero cold starts. Zero egress fees. |
| > No database server. No application server.                         |
+----------------------------------------------------------------------+

Supported Bottles (POC)

  --------------------- ---------------------------- ------------ ---------------------------
  **SKU**               **Bottle**                   **Volume**   **Shape**
  filippo-berio-500ml   Filippo Berio Extra Virgin   500ml        Cylinder (65mm × 220mm)
  bertolli-750ml        Bertolli Classico            750ml        Frustum (70/85mm × 280mm)
  safi-sunflower-1l     Safi Sunflower Oil           1000ml       Cylinder (80mm × 275mm)
  --------------------- ---------------------------- ------------ ---------------------------

User Experience Design

Design System

+----------------+-----------+-------------+------------------+---------------+
| **Primary**    | **Hover** | **Surface** | **Warning**      | **Danger**    |
|                |           |             |                  |               |
| **Deep Olive** | **State** | **Cards**   | **Medium Conf.** | **Low Conf.** |
+----------------+-----------+-------------+------------------+---------------+

Screen Flow

9 screens designed: QR Landing → Camera Viewfinder → Photo Preview →
Analyzing State → Result Display → Feedback → Confirmation → Error
States → iOS Warning

-   Mobile-first design (375-430px viewport)

-   WCAG 2.1 AA accessible

-   Fill gauge with animated bottle visualization

-   Single-page linear flow (no navigation complexity)

PWA vs Native App

Safi Oil Tracker uses a Progressive Web App (PWA) approach for both POC
and Full Launch. A native mobile app is a Phase 4 option after 1,000+
scans validate the concept.

  --------------- -------------------------------------------------------------------- ----------------------------------
  **Factor**      **PWA (Our Choice)**                                                 **Native App (Phase 4)**
  Distribution    No App Store submission needed                                       App Store review required
  Codebase        Single codebase (iOS + Android)                                      Separate iOS + Android codebases
  Camera Access   Browser Camera API (sufficient)                                      Full hardware access
  Offline         App shell via Service Worker                                         Full offline capability
  Dev Cost        Low (web technologies)                                               High (platform-specific)
  iOS Caveat      Must use Safari browser mode (WebKit camera bug in standalone PWA)   No browser limitations
  --------------- -------------------------------------------------------------------- ----------------------------------

+----------------------------------------------------------------------+
| > Decision: PWA for POC + Full Launch. Native only after 1,000+      |
| > scans prove market fit and justify the higher development cost.    |
+----------------------------------------------------------------------+

AI & Continuous Improvement

Every scan automatically becomes a labeled training example. User
feedback is validated through 4 sanity checks before being accepted as
training data.

Feedback Validation

  ---------------- ----------------------------------- ------------------------
  **Flag**         **Rule**                            **Example**
  too_fast         Response \< 3 seconds               User tapped randomly
  boundary_value   Estimate is 0% or 100%              Suspicious edge value
  contradictory    \"Too low\" but estimate \< AI\'s   Logically inconsistent
  extreme_delta    Difference \> 30% from AI           Signal quality concern
  ---------------- ----------------------------------- ------------------------

Model Evolution Roadmap

  --------------- --------------------------------------------- -------------
  **Milestone**   **Action**                                    **Cost**
  50+ Scans       Prompt refinement based on error patterns     \$0
  100+ Scans      Few-shot examples from best labeled pairs     \$0
  500+ Scans      Fine-tune open source model (Qwen2.5 VL 7B)   \~\$50/run
  1000+ Scans     Fine-tune Gemini Flash via Google AI Studio   \~\$100/run
  --------------- --------------------------------------------- -------------

Security & Privacy

  -------------------- ----------------------------------------------------------------------------------------
  **Layer**            **Protection**
  Origin Validation    CORS whitelist: only safi-oil-tracker.pages.dev + localhost
  Rate Limiting        10 requests/minute per IP (KV-backed sliding window)
  Payload Guard        Reject requests \> 4MB
  API Key Protection   Secrets in Cloudflare Worker only (never in client/git)
  Data Privacy         No PII collected. No accounts, no names, no emails. R2 bucket not publicly accessible.
  Transport Security   All traffic over HTTPS (Cloudflare enforced)
  -------------------- ----------------------------------------------------------------------------------------

Success Criteria

POC v1 Targets (Current)

  -------------------------- ----------------------------------------------
  **Metric**                 **POC Target**
  Scan-to-Result Time        \< 8 seconds
  Real Scans (Month 1)       ≥ 50 with usable training data
  AI Fill-Level MAE          ≤ 15% vs user ground truth
  Feedback Submission Rate   ≥ 30% of scans
  Monthly Cost               \$0 (all free tiers)
  Tests + CI/CD              34 tests passing · auto-deploy on every push
  -------------------------- ----------------------------------------------

Full Launch Targets

  ---------------------- -----------------------------------------------------
  **Metric**             **Launch Target**
  Scan-to-Result Time    \< 5 seconds (optimized prompts + fine-tuned model)
  Monthly Active Scans   10,000+
  AI Fill-Level MAE      ≤ 8% (after fine-tuning on 1,000+ labeled images)
  Scan Completion Rate   ≥ 80% of initiated scans reach result
  Monthly Cost           \$3--30 (10K--100K scans, Gemini Flash)
  ---------------------- -----------------------------------------------------

Product Roadmap

+------------------------------+
| **Phase 1 (NOW) --- POC v1** |
|                              |
| -   QR → Scan → Result flow  |
|                              |
| -   3 bottle SKUs            |
|                              |
| -   AI vision analysis       |
|                              |
| -   User feedback collection |
|                              |
| -   Training data pipeline   |
|                              |
| -   CI/CD auto-deploy        |
+------------------------------+

+-------------------------------------------------------+
| **Phase 2 (After 50+ scans) --- Post-POC Validation** |
|                                                       |
| -   Activate Cloudflare R2 (requires credit card)     |
|                                                       |
| -   User accounts (D1 + KV)                           |
|                                                       |
| -   Scan history per user                             |
|                                                       |
| -   Custom starting level                             |
|                                                       |
| -   Push notifications                                |
|                                                       |
| -   More bottle SKUs                                  |
+-------------------------------------------------------+

+------------------------------------+
| **Phase 3 --- Model Intelligence** |
|                                    |
| -   Prompt refinement              |
|                                    |
| -   Few-shot learning              |
|                                    |
| -   Model fine-tuning              |
|                                    |
| -   Admin dashboard                |
+------------------------------------+

+--------------------------------+
| **Phase 4 --- Platform Scale** |
|                                |
| -   Native mobile app          |
|                                |
| -   Barcode scanning           |
|                                |
| -   Multi-brand registry       |
|                                |
| -   Multi-language support     |
+--------------------------------+

+-----------------------------------+
| **Phase 5 --- Business Intel**    |
|                                   |
| -   Analytics dashboard           |
|                                   |
| -   Regional consumption patterns |
|                                   |
| -   Size-based insights           |
|                                   |
| -   Loyalty program integration   |
+-----------------------------------+

Infrastructure Cost

+-------------------------------------------------------------------+
| **POC v1 --- \$0 / month**                                        |
|                                                                   |
| Entire stack on free tiers · Valid for up to \~15,000 scans/month |
+-------------------------------------------------------------------+

  ---------------------- ----------------- -----------------------------------------------------------------------------
  **Service**            **POC Tier**      **Free Capacity**
  Cloudflare Pages       FREE              Unlimited bandwidth, custom domains, PR previews
  Cloudflare Worker      FREE              100,000 req/day · Zero cold starts
  Cloudflare R2          FREE (deferred)   10 GB storage · \~140K scans · \$0 egress · Requires credit card activation
  Gemini 2.5 Flash       FREE              500 req/day (15,000/mo) · JSON mode vision
  Groq + Llama 4 Scout   FREE              Online-only auto-failover · Fast inference
  GitHub Actions CI/CD   FREE              Auto-deploy on push
  ---------------------- ----------------- -----------------------------------------------------------------------------

Full Launch Cost Estimate

Once volume exceeds free tier limits, costs scale linearly and remain
very low. At 10,000--100,000 scans/month:

\~1,550 tokens/scan (1,500 input + 50 output) using Gemini 2.5 Flash:

  --------------- ------------------- ---------------- -------------------
  **Volume**      **AI Token Cost**   **R2 Storage**   **Total / month**
  10,000 scans    \$2.55              \$0 (700MB)      \~\$3 / mo
  50,000 scans    \$12.75             \$0 (3.5GB)      \~\$13 / mo
  100,000 scans   \$25.50             \~\$3.50         \~\$30 / mo
  --------------- ------------------- ---------------- -------------------

Gemini API Token Pricing (Paid Tier)

  ------------------ --------------------------- ---------------------------- -------------------------------
  **Model**          **Input (per 1M tokens)**   **Output (per 1M tokens)**   **Free Tier Limit**
  Gemini 2.5 Flash   \$0.15                      \$0.60                       500 req/day · 100K tokens/min
  Gemini 2.5 Pro     \$1.25                      \$10.00                      50 req/day · 32K tokens/min
  ------------------ --------------------------- ---------------------------- -------------------------------

+----------------------------------------------------------------------+
| > **Cost Per Scan (Gemini 2.5 Flash --- Paid Tier)**                 |
| >                                                                    |
| > \~1,500 input tokens + \~50 output tokens per scan                 |
| >                                                                    |
| > = (1,500 × \$0.15/M) + (50 × \$0.60/M) = \$0.000225 + \$0.00003 ≈  |
| > **\$0.00026 per scan**                                             |
| >                                                                    |
| > At 100,000 scans: \~\$26 in AI token costs alone. Storage +        |
| > compute add \~\$10--20.                                            |
+----------------------------------------------------------------------+

Competitive Advantage

No direct competitor exists for AI oil tracking via QR + camera.

  ------------------ -------------------- -------------------------------------------
  **Competitor**     **Approach**         **Limitation**
  MyFitnessPal       Manual logging       High friction, user must type every entry
  Smart Scales       Hardware weighing    Requires purchase, not portable
  Receipt Scanning   Label/barcode scan   Scans labels, not actual content levels
  ------------------ -------------------- -------------------------------------------

+----------------------------------------------------------------------+
| > Safi Oil Tracker = Zero friction + Zero hardware + Self-improving  |
| > AI. An uncontested niche.                                          |
+----------------------------------------------------------------------+

Implementation Status

+--------------+-------+------------+----------+
| **38**       | **5** | **34**     | **100%** |
|              |       |            |          |
| User Stories | Epics | Unit Tests | Complete |
+--------------+-------+------------+----------+

Key Deliverables

  ------------------------------------- ----------------------------------------------
  **Deliverable**                       **Status**
  Product Requirements Document (PRD)   Complete (39 FRs, 30 NFRs)
  Architecture Decision Document        Complete (14 sections)
  UX Design Specification               Complete (9 screens, full design system)
  Epics & User Stories                  Complete (38 stories across 5 epics)
  API Specification                     Complete (2 endpoints, full contracts)
  Data Schemas                          Complete (TypeScript interfaces)
  LLM Prompt Engineering                Complete (3 providers)
  Deployment Guide                      Complete (local + production + CI/CD)
  Source Code (Frontend)                Complete (11 components, 3 hooks, 4 utils)
  Source Code (Backend)                 Complete (Cloudflare Worker, 2 AI providers)
  Unit Tests                            Complete (34 tests passing)
  CI/CD Pipeline                        Complete (GitHub Actions)
  ------------------------------------- ----------------------------------------------

+----------------------------------------------------------------------+
| > READY FOR IMPLEMENTATION ✔ --- All planning artifacts complete and |
| > verified.                                                          |
+----------------------------------------------------------------------+

Risk Mitigation

  ---------------------------------- -------------- ----------------------------------------------------------
  **Risk**                           **Severity**   **Mitigation**
  iOS camera bug in standalone PWA   High           Browser mode enforced; \"Open in Safari\" fallback
  AI inaccuracy on dark bottles      High           POC scoped to clear glass; ±15% framing
  API latency \> 8s                  Medium         Disabled AI thinking; 800px compression; Groq fallback
  Gemini rate limits                 Medium         Auto-fallback to Groq; per-IP rate limiting
  Unreliable user feedback           Medium         Layer 1 validation flags contradictions/speed/boundaries
  ---------------------------------- -------------- ----------------------------------------------------------

Next Steps

1.  **Test AI with Client-Provided Photos** --- Client sends bottle
    images directly (no QR step needed). Split into training set +
    held-out test set to measure baseline AI accuracy.

2.  **Refine Prompts Using Feedback Loop** --- Iteratively improve
    Gemini prompts using test results. Basic prompt-refinement loop
    works with sample data, no R2 or credit card needed.

3.  **Deploy + Validate QR Code Scan Flow** --- Push to Cloudflare
    Pages + Worker. Print QR codes for 3 SKUs. Verify end-to-end flow
    (standard functionality, no innovation risk).

4.  **Collect 50+ Real-World Scans** --- Live scan collection with
    feedback. Each scan produces a labeled training pair (image +
    user-corrected fill level).

5.  **Go / No-Go Decision: Scale Beyond POC** --- If AI accuracy hits
    ≤15% MAE and feedback rate ≥30%: greenlight Phase 2 (activate R2,
    add user accounts, scan history, notifications, more SKUs; \$0--5/mo
    added). If not: iterate prompts or pivot.

  --
  --

**Safi Oil Tracker**

**Scan. Snap. Know.**

Ahmed \| February 2026
