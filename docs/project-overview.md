# Afia App — Project Overview

## What is Afia App?

Afia App (formerly Safi Oil Tracker) is a mobile-first Progressive Web App (PWA) that uses AI computer vision to estimate the fill level of cooking oil bottles from a single photograph. Users access the app by scanning a QR code printed on their oil bottle, photograph it through the device camera, and receive an instant breakdown of remaining oil volume, consumed volume, and nutrition facts.

## Problem Statement

Consumers have no easy way to track how much cooking oil they've used from a bottle. This makes it difficult to plan purchases, monitor dietary fat intake, or estimate nutrition for home-cooked meals.

## Solution

A zero-install camera-based tool that:
1. Identifies the bottle via QR code (SKU-based lookup)
2. Uses AI vision (Gemini 2.0 Flash / Groq Llama 4 Scout / OpenRouter / Mistral Pixtral) to estimate fill level as a percentage
3. Applies geometric formulas (cylinder/frustum) to convert percentage to exact milliliters
4. Calculates nutrition facts from USDA per-100g data and oil density
5. Collects user feedback to build a validated training dataset for future model improvement

## Key User Flow

```
QR Code Scan → Landing Page → Camera Capture → Photo Preview → AI Analysis → Results (Fill %, Volume, Nutrition) → Feedback
```

## Project Status

| Epic | Stories | Status |
|------|---------|--------|
| 1: Core Scan Experience | 14 | Complete |
| 2: Rich Consumption Insights | 7 | Complete |
| 3: Continuous Improvement Loop | 8 | Complete |
| 4: Resilience & Edge Cases | 7 | Complete |
| 5: Deployment & Operations | 2 | Complete |

**POC is fully functional** with all 5 epics (38 stories) implemented. The app is deployed on Cloudflare Pages (frontend) and Cloudflare Workers (backend).

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 19.2 |
| Language | TypeScript | 5.9 |
| Build Tool | Vite | 7.3 |
| PWA | vite-plugin-pwa | 1.2 |
| Styling | CSS Custom Properties (no UI library) | — |
| Backend Framework | Hono | 4.7 |
| Backend Runtime | Cloudflare Workers | — |
| AI Primary | Google Gemini 2.0 Flash | gemini-2.0-flash |
| AI Fallback | Groq Llama 4 Scout → OpenRouter → Mistral Pixtral | 17b |
| Object Storage | Cloudflare R2 | — |
| KV Storage | Cloudflare KV (rate limiting) | — |
| Testing | Vitest | 4.0 |
| Test Utilities | @testing-library/react | 16.3 |
| CI/CD | GitHub Actions → Cloudflare Pages + Workers | — |

## Repository Structure

Multi-part monorepo:
- **`/` (root)** — Frontend PWA (React + Vite)
- **`/worker/`** — Backend API (Cloudflare Worker + Hono)

Both parts share a bottle registry and feedback validation logic (manually synchronized).

## Key Design Decisions

1. **`display: "browser"` for PWA** — iOS WebKit has a bug where `getUserMedia` fails in standalone mode. Browser mode keeps the address bar but ensures camera works on all iOS devices.

2. **Hybrid AI + Deterministic Math** — LLM estimates fill percentage; cylinder/frustum formulas calculate exact volume. Reliable volumes even with minor AI inaccuracy.

3. **Training Data Pipeline from Day One** — Every scan stores the image and metadata to R2. Feedback is validated (4 flags: too_fast, boundary_value, contradictory, extreme_delta) before marking as training-eligible.

4. **Gemini Primary, Groq Fallback** — Dual LLM provider strategy with automatic failover. Multiple Gemini API keys for load distribution.

5. **No Authentication** — QR-code-initiated sessions; no user accounts needed for the core scanning flow.

6. **Security Headers** — CSP, X-Frame-Options, Permissions-Policy configured via Cloudflare `_headers` file. CORS restricted to known origins. Rate limiting at 10 req/min/IP.
