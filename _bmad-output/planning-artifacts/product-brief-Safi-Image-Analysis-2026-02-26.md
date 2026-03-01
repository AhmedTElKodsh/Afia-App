---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - research/technical-oil-bottle-ai-app-poc-research-2026-02-26.md
date: 2026-02-26
author: Ahmed
---

# Product Brief: Safi Oil Tracker

## Problem

Home cooking oil consumers have no practical way to know how much oil they've consumed from a bottle. Visual estimation is unreliable, measuring before every use is disruptive, and no existing product bridges the gap between physical cooking and dietary tracking. This matters for calorie-conscious users and people managing fat intake.

## Solution

A Progressive Web App accessed via QR code on the oil bottle. The user photographs their bottle with their phone camera. AI vision estimates the fill level. The app calculates remaining and consumed volume (ml, tablespoons, cups) using known bottle geometry, then displays nutritional facts for the consumed amount.

## Key Insight: The "Ruler vs. Guesser" Hybrid Approach

We don't rely solely on the AI's "guess." We use a hybrid approach that separates subjective vision from objective physics:
- **The AI as a "Digital Ruler":** The AI estimates only the relative **fill percentage** (not absolute volume) from the photo. AI is exceptionally good at finding the liquid line (meniscus) relative to the bottle's height.
- **The Registry as the "Guesser's Anchor":** Precise volume is calculated using **100% deterministic math** on pre-registered bottle geometry (cylinders/frustums) stored in our registry.

By anchoring the AI's percentage estimate to rigid geometry, we achieve ±15% accuracy without hardware or specialized CV models—a "marriage" of flexible AI vision and rigid physics.

## Target User

Health-conscious home cooks aged 25–50 who want passive dietary awareness without manual measuring. Access is incidental — the QR code lives on a product they already bought.

## Differentiator

Zero friction. QR code on bottle → camera open in 2 taps → result in under 8 seconds. No account, no download, no manual entry. The dietary insight arrives at the moment of maximum motivation — right after cooking.

## POC Scope

- Single oil company, 2–3 clear glass bottle SKUs
- Starting level = full bottle (100% baseline)
- Gemini 2.5 Flash (primary) + Groq Llama 4 Scout (fallback, online-only) for AI vision
- All infrastructure on free tiers: Cloudflare Pages + Worker, Gemini free, Groq free
- Cloudflare R2 storage deferred (free tier requires credit card activation) — images stored transiently during POC
- First priority: test AI accuracy with client-provided bottle photos (no QR/barcode step needed), split into training + test sets
- Prompt refinement loop tested with sample data before full scan flow deployment
- $0/month target cost

## Success Metrics

### POC Targets
- Photo-to-result latency < 8 seconds (p95)
- LLM fill accuracy ≤ 15% MAE vs user corrections
- Feedback submission rate ≥ 30%
- ≥ 50 real scans in first month
- $0/month infrastructure cost
- 34 unit tests passing + CI/CD auto-deploy

### Full Launch Targets
- Photo-to-result latency < 5 seconds
- LLM fill accuracy ≤ 8% MAE (after fine-tuning on 1,000+ images)
- 10K+ monthly active scans
- Scan completion rate ≥ 80%
- $3–30/month (10K–100K scans)

## Constraints

- Clear glass bottles only (accuracy drops on opaque/dark)
- Requires internet for AI analysis (offline: app shell loads, scan does not)
- iOS must use Safari browser mode (WebKit bug in standalone PWA camera)
- No user accounts, no scan history, no admin dashboard in POC

## Strategic Value

The POC is simultaneously a consumer product and a data collection engine. Every scan generates a labeled training example. The feedback loop (image + AI estimate + user correction) enables future model fine-tuning without a separate data collection phase. The oil company gains a direct digital consumer touchpoint.

---

_Product Brief produced: 2026-02-26_
_Author: Ahmed_
