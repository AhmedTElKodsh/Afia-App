# Afia App — Project Documentation Index

> Generated: 2026-03-01 | Scan Level: Exhaustive | Mode: Initial Scan

## Project Summary

**Afia App** (formerly Afia Oil Tracker) is a mobile-first PWA that uses AI vision to estimate cooking oil bottle fill levels from a single photo. Multi-part project: React 19 frontend + Cloudflare Worker backend.

- **Repository Type**: Multi-part (frontend + worker)
- **Frontend**: React 19 + TypeScript 5.9 + Vite 7 (PWA)
- **Backend**: Cloudflare Workers + Hono 4.7
- **AI**: Gemini 2.5 Flash (primary) + Groq Llama 4 Scout (fallback)
- **Status**: POC complete (5 epics, 38 stories)

## Documentation

| Document | Description |
|----------|-------------|
| [Project Overview](./project-overview.md) | What the app does, problem/solution, tech stack, project status |
| [Source Tree Analysis](./source-tree-analysis.md) | Complete directory structure, critical directories, entry points, integration points |
| [Architecture](./architecture.md) | System architecture, state machine, component hierarchy, data flow, security, deployment |
| [Component Inventory](./component-inventory.md) | All components, hooks, utilities, data modules, worker modules with props and behavior |
| [API Contracts](./api-contracts.md) | REST endpoints (POST /analyze, POST /feedback, GET /health), request/response schemas, error codes |
| [Data Models](./data-models.md) | All TypeScript interfaces, static data registries, data flow diagram, local storage |
| [Development Guide](./development-guide.md) | Setup instructions, npm scripts, testing, building, deployment, environment variables, conventions |
| [Known Issues](./known-issues.md) | Code duplication, R2 disabled, naming inconsistency, missing test coverage, security notes |

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
