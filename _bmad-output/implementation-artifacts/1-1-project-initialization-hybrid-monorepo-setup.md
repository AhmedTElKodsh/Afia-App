# Story 1.1: Project Initialization & Hybrid Monorepo Setup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to set up the hybrid monorepo with shared logic path aliases,
so that I can maintain a single source of truth for oil math across the PWA and Worker.

## Acceptance Criteria

1. **Hybrid Monorepo Configured**: The root workspace uses `pnpm` or `npm` workspaces to manage `src/` (PWA) and `worker/` (API). [Source: architecture.md#6-project-structure--boundaries] - ✅ DONE
2. **TypeScript Path Aliases**: `@shared/*` alias is configured in the root `tsconfig.json` and respected by both Vite and Hono. [Source: architecture.md#6-project-structure--boundaries] - ✅ DONE
3. **Isomorphic Shared Logic**: `volumeCalculator.ts` and `nutritionScaling.ts` are moved to `shared/logic/` and verified to have zero Node/Browser dependencies. [Source: architecture.md#5-implementation-patterns--consistency-rules] - ✅ DONE
4. **Logic Parity Verified**: `vitest` runs and passes all tests in the `/shared/` folder, ensuring identical math results for both environments. [Source: epics.md#Story 1.1] - ✅ DONE
5. **Unified devDependencies**: Build tools and type definitions are managed at the root to ensure version consistency. [Source: architecture.md#6-project-structure--boundaries] - ✅ DONE

## Tasks / Subtasks

- [x] Initialize Root Workspace (AC: 1, 5)
  - [x] Configure `package.json` with workspaces
  - [x] Consolodate shared `devDependencies` at root
- [x] Setup Path Aliases (AC: 2)
  - [x] Update root `tsconfig.json` with `@shared/*` paths
  - [x] Configure `vite.config.ts` to resolve shared aliases
- [x] Port Isomorphic Logic (AC: 3)
  - [x] Create `shared/logic/`, `shared/constants/`, `shared/types/`
  - [x] Move `shared/bottleRegistry.ts`, `shared/volumeCalculator.ts` to new locations
  - [x] Audit for environment-specific code (window, document, fs)
- [x] Configure Testing (AC: 4)
  - [x] Setup Vitest root config
  - [x] Add `tests/unit/shared/` test suite (moved existing volume tests to shared)

## Dev Notes

- **Architecture Constraint**: ALL volume math and SKU geometry MUST live in `/shared`. Divergent math is a critical risk. [Source: architecture.md#5-implementation-patterns--consistency-rules]
- **Nomenclature**: Follow `camelCase` for functions/variables and `PascalCase` for components. [Source: architecture.md#5-implementation-patterns--consistency-rules]
- **Environment**: Target Cloudflare Workers (V8) runtime requirements for shared logic.

### Project Structure Notes

- **Hybrid Monorepo**: Uses local path imports via aliases instead of full private npm packages to minimize ceremony. [Source: architecture.md#6-project-structure--boundaries]
- **Folder Mapping**:
  - `shared/` -> Isomorphic Logic
  - `src/` -> React 19 Frontend
  - `worker/` -> Hono API

### References

- [Source: architecture.md#6-project-structure--boundaries]
- [Source: architecture.md#5-implementation-patterns--consistency-rules]
- [Source: prd.md#Technical Success]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Flash (via BMad dev-story workflow)

### Debug Log References

- [Log: Root package.json updated with workspaces: ["worker"]]
- [Log: tsconfig.app.json and worker/tsconfig.json updated with @shared alias]
- [Log: shared/ logic and constants folders created; files moved]
- [Log: vitest.config.ts updated; tests run successfully (251 passed)]

### Completion Notes List

- Successfully initialized the hybrid monorepo structure.
- Consistently used @shared path aliases in both Frontend and Worker.
- Verified math logic parity with 16 dedicated shared unit tests (all passing).
- Cleaned up root node_modules locks and ensured workers-types are available at root.

### File List

- `package.json` (modified)
- `tsconfig.app.json` (modified)
- `vite.config.ts` (modified)
- `src/utils/volumeCalculator.ts` (modified - re-export update)
- `src/data/bottleRegistry.ts` (modified - re-export update)
- `worker/tsconfig.json` (modified)
- `worker/src/bottleRegistry.ts` (modified - re-export update)
- `worker/src/analyze.ts` (modified - import update)
- `shared/logic/volumeCalculator.ts` (moved/modified)
- `shared/logic/volumeCalculator.test.ts` (moved/modified)
- `shared/constants/bottleRegistry.ts` (moved)
