# Afia App — Project Documentation Index

> Generated: 2026-04-20 | Scan Level: Quick | Mode: Full Rescan | **Three-Stage Architecture Documented**

## Project Summary

**Afia Oil Tracker** is a mobile-first PWA that uses AI vision to estimate cooking oil bottle fill levels from a single photo. Multi-part project: React 19 frontend + Cloudflare Worker backend.

- **Repository Type**: Multi-part (frontend + worker)
- **Frontend**: React 19 + TypeScript 5.9 + Vite 7 (PWA)
- **Backend**: Cloudflare Workers + Hono 4.7
- **AI Strategy**: Three-stage evolution (LLM Only → Local + LLM Fallback → Local Only)
- **Current Stage**: Stage 1 (LLM Only) deployed, Stage 2 (Hybrid) in progress
- **Status**: POC complete (5 epics, 54 stories)

## Three-Stage Architecture Vision

The project is designed to evolve through three distinct stages:

1. **Stage 1: LLM Only** (Current) - Cloud-based Gemini/Groq for rapid POC
2. **Stage 2: Local Model + LLM Fallback** (In Progress) - ONNX model in browser with cloud fallback
3. **Stage 3: Local Model Only** (Future) - 100% offline-capable with no cloud dependency

**See [Architecture](./architecture.md) for complete diagrams of all three stages.**

## Documentation

| Document | Description | Status |
|----------|-------------|--------|
| [Project Overview](./project-overview.md) | Executive summary, three-stage vision, tech stack, local-first philosophy | ✅ Complete |
| [Architecture](./architecture.md) | **THREE comprehensive Mermaid diagrams** (one per stage), data flow, components | ✅ Complete |
| [Local Development Guide](./LOCAL-DEVELOPMENT.md) | Local-first development workflow, testing strategies | ✅ Complete |
| [Source Tree Analysis](./source-tree-analysis.md) | Directory structure, critical folders, entry points | ✅ Existing |
| [Component Inventory](./component-inventory.md) | All components, hooks, utilities, data modules | ✅ Complete |
| [API Contracts](./api-contracts.md) | REST endpoints, request/response schemas, error codes | ✅ Complete |
| [Data Models](./data-models.md) | TypeScript interfaces, static data registries, data flow | ✅ Complete |
| [Development Guide](./development-guide.md) | Setup, npm scripts, testing, building, deployment | ⏳ To be generated |
| [Known Issues](./known-issues.md) | Code duplication, R2 disabled, naming inconsistency | ✅ Existing |

## Quick Reference

### Run Locally
```bash
npm install && npm run dev          # Frontend → localhost:5173
cd worker && npm install && npm run dev  # Worker → localhost:8787
```

### Test
```bash
npm test                            # 34 unit tests
cd worker && npm run type-check     # Worker type checking
```

### Deploy
```bash
cd worker && npx wrangler deploy    # Deploy Worker
npm run build && npx wrangler pages deploy dist --project-name=Afia-oil-tracker  # Deploy frontend
```

### Test URLs
- `http://localhost:5173/?sku=filippo-berio-500ml`
- `http://localhost:5173/?sku=bertolli-750ml`
- `http://localhost:5173/?sku=Afia-sunflower-1l`
