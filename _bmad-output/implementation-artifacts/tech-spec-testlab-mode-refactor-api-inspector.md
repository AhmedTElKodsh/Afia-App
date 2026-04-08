---
title: 'TestLab Mode Selector Refactor + API Inspector Tab'
slug: 'testlab-mode-refactor-api-inspector'
created: '2026-04-07'
status: 'completed'
stepsCompleted: [1, 2, 3, 4, 5]
tech_stack: ['React 18', 'TypeScript', 'Vite', 'i18next', 'Lucide React', 'CSS custom properties']
files_to_modify:
  - src/components/TestLab.tsx
  - src/components/TestLab.css
  - src/components/ApiInspector.tsx (new)
  - src/components/ApiInspector.css (new)
  - src/i18n/locales/en/translation.json
  - src/i18n/locales/ar/translation.json
  - tests/e2e/test-lab-full-flow.spec.ts
code_patterns:
  - 'Worker endpoint accepts JSON {sku, imageBase64} via analyzeBottle() from apiClient.ts'
  - 'imageBase64 is pure base64 — no data:image prefix'
  - 'CSS vars: --color-primary-glow for muted bg, --glass-border for borders, no --color-primary-muted or --color-surface-hover'
  - 'PROXY_URL used by apiClient internally; ApiInspector imports analyzeBottle, not raw fetch'
test_patterns:
  - 'E2E: tests/e2e/test-lab-full-flow.spec.ts — 8 occurrences of .test-mode-card must be updated'
  - 'Unit tests in src/test/apiClient.test.ts — not affected'
---

# Tech-Spec: TestLab Mode Selector Refactor + API Inspector Tab

**Created:** 2026-04-07

## Overview

### Problem Statement

The `SELECT TEST MODE` section in `TestLab.tsx` presents two large card-style toggles — "USER SIMULATION" and "API INSPECTOR" — whose only behavioral difference is whether `AdminToolsOverlay` auto-opens after a scan completes. This is a preference, not a mode. The "User Simulation" mode is also redundant: the "Open as Real User" link already provides the actual user experience in a separate tab. The section occupies significant vertical real estate for minimal value, and there is no true camera-free API inspection path (one that POSTs directly to the Worker without going through the scan UX).

### Solution

1. Remove the two-card `SELECT TEST MODE` section and the `testMode` state entirely.
2. Replace with a small **"Show debug panel after scan"** checkbox that controls whether `AdminToolsOverlay` auto-opens.
3. Add tab navigation — `[Flow Test]` / `[API Inspector]` — at the TestLab level.
4. Build a new `ApiInspector` component (tab 2) that calls `analyzeBottle()` directly via image upload or a quick-fire test button, then displays the raw response via `AdminToolsOverlay`.
5. Relocate the "Open as Real User" link into the TestLab header (persistent, not buried in mode UI).

### Scope

**In Scope:**
- Remove `TestModeType` export, `testMode` state, `handleModeChange` callback, mode-card JSX block, `test-lab-section--mode` section, `analytics.testModeChanged` call
- Remove `Wrench` import (only used in deleted debug-hint paragraph)
- Add `activeTab: "flow" | "inspector"` state and tab nav JSX
- Add `showDebugPanel: boolean` state with checkbox toggle
- Rewire `AdminToolsOverlay` auto-open to `showDebugPanel` instead of mode check
- New `src/components/ApiInspector.tsx` — Upload + Quick Fire, uses `analyzeBottle()`
- New `src/components/ApiInspector.css`
- Delete all `test-mode-*` CSS blocks from `TestLab.css` (base + responsive + theme variants)
- Add tab nav and debug toggle CSS to `TestLab.css`
- Move "Open as Real User" `<a>` to the TestLab header section
- Update EN + AR i18n: remove 7 obsolete keys, add tab/toggle/inspector keys
- Update `test-lab-full-flow.spec.ts` — replace 8 `.test-mode-card` selector references

**Out of Scope:**
- Changes to `AdminToolsOverlay` internals
- Changes to `CameraViewfinder`, `ResultDisplay`, or core scan flow
- Any Worker / backend changes
- Persisting `showDebugPanel` to `localStorage`
- History/diff comparison between API Inspector runs
- New analytics events for tab switching

## Context for Development

### Codebase Patterns

- Named exports, co-located CSS files, `useTranslation` from `react-i18next`.
- i18n: `admin.testLab.*` namespace for existing TestLab strings; add new `admin.inspector.*` namespace for `ApiInspector` strings. Arabic mirror in `src/i18n/locales/ar/translation.json`.
- **Worker API**: endpoint accepts `POST` with `Content-Type: application/json` body `{ sku: string, imageBase64: string }` — `imageBase64` is pure base64, no `data:` prefix. Encapsulated in `analyzeBottle(sku, base64)` from `src/api/apiClient.ts`. `ApiInspector` MUST use this function, not raw fetch.
- `VITE_WORKER_URL` is used only for the feedback endpoint in `TestLab.tsx`. `analyzeBottle` uses `VITE_PROXY_URL` internally — `ApiInspector` does not reference either env var directly.
- **CSS variables confirmed present**: `--color-primary`, `--color-primary-glow`, `--color-bg-elevated`, `--glass-border`, `--glass-border-strong`, `--space-xs` (4px), `--space-sm` (8px), `--space-md` (16px), `--space-lg` (24px), `--radius-md` (12px), `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`. **`--color-primary-muted` and `--color-surface-hover` do NOT exist** — use `--color-primary-glow` for tinted backgrounds and `--glass-border` for borders.
- RTL: `isRTL = i18n.language === 'ar'` → `dir={isRTL ? 'rtl' : 'ltr'}` on root element.
- Existing CSS class `.analyzing-state` / `.analyzing-spinner` in `TestLab.css` — reuse in `ApiInspector` loading state.
- Lucide icons in use: `Beaker`, `QrCode`, `Smartphone`, `RefreshCcw`, `AlertTriangle`, `TestTube`, `ExternalLink`. `Wrench` is safe to remove after deleting the debug-hint paragraph.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| [src/components/TestLab.tsx](src/components/TestLab.tsx) | Main edit target — remove mode, add tabs, toggle, relocate link |
| [src/components/TestLab.css](src/components/TestLab.css) | Delete test-mode-* CSS; add tab + toggle styles |
| [src/components/AdminToolsOverlay.tsx](src/components/AdminToolsOverlay.tsx) | Reused in ApiInspector — `isOpen={true}`, no-op callbacks |
| [src/api/apiClient.ts](src/api/apiClient.ts) | Import `analyzeBottle` — do not duplicate |
| [src/state/appState.ts](src/state/appState.ts) | `AnalysisResult` type: `{ scanId, fillPercentage, remainingMl, confidence, aiProvider, latencyMs, imageQualityIssues? }` |
| [src/i18n/locales/en/translation.json](src/i18n/locales/en/translation.json) | Remove 7 keys, add tab/toggle/inspector keys |
| [src/i18n/locales/ar/translation.json](src/i18n/locales/ar/translation.json) | Mirror EN changes in Arabic |
| [tests/e2e/test-lab-full-flow.spec.ts](tests/e2e/test-lab-full-flow.spec.ts) | Update 8 `.test-mode-card` selector references |

### Technical Decisions

- **`ApiInspector` props**: `{ selectedSku: string }` only — no `workerUrl` prop needed.
- **Quick Fire payload**: module-level pure base64 constant (no `data:` prefix), passed directly to `analyzeBottle()`.
- **File upload flow**: `FileReader.readAsDataURL` → strip prefix with `.replace(/^data:image\/[^;]+;base64,/, '')` → `analyzeBottle(selectedSku, base64Only)`.
- **`AdminToolsOverlay` in inspector tab**: always open, `onSaveValidation={() => {}}` (no feedback POST in inspector context — that's a scan-history concern).
- **Tab state in `TestLab`**: `activeTab` resets `showAdminTools` to false when switching to inspector tab (inspector manages its own open state).
- **`Wrench` import**: safe to remove — only consumer was the deleted debug-hint paragraph (lines 312–317 of current `TestLab.tsx`).
- **`ExternalLink` import**: keep — used by the relocated "Open as Real User" link.

## Implementation Plan

### Tasks

- [x] **Task 1 — Remove mode state and mode-card JSX from `TestLab.tsx`**
  - File: `src/components/TestLab.tsx`
  - Delete the line: `export type TestModeType = "user" | "debug";`
  - Delete the line: `const [testMode, setTestMode] = useState<TestModeType>("user");`
  - Delete the `handleModeChange` callback — identified by its content: `const handleModeChange = useCallback((mode: TestModeType) => {` through its closing `}, [testMode]);`. This includes the `analytics.testModeChanged(testMode, mode)` call inside it.
  - Delete the `useEffect` that auto-opens admin tools — identified by: `if (scanState === "complete" && testMode === "debug") {`. Delete the entire `useEffect` block containing this condition. (Will be replaced in Task 4.)
  - Delete the entire `{/* Test Mode Selector */}` JSX section — identified by the comment `{/* Test Mode Selector */}` through the closing `</div>` of `<div className="test-lab-section test-lab-section--mode">`. This block contains both `test-mode-card` buttons and the `open-user-view-link` anchor.
  - Delete the `testMode === "debug"` conditional paragraph — identified by: `{testMode === "debug" && (` followed by a `<p className="test-lab-debug-hint">` element. Delete the full conditional block.
  - Remove `Wrench` from the lucide-react import — grep for `Wrench` first to confirm it has no other usages. If zero other usages, remove it from the import.
  - Remove `analytics.testModeChanged` from the session-start `useEffect` if present — grep for `testModeChanged` in `TestLab.tsx` and remove any remaining reference.
  - **Verification**: After all deletions, grep `TestLab.tsx` for `testMode` and `TestModeType` — must return zero matches.

- [x] **Task 2 — Add `activeTab` state and tab nav JSX to `TestLab.tsx`**
  - File: `src/components/TestLab.tsx`
  - Add state (after existing state declarations, ~line 52): `const [activeTab, setActiveTab] = useState<"flow" | "inspector">("flow");`
  - Add import: `import { ApiInspector } from "./ApiInspector.tsx";`
  - Add tab nav JSX immediately after the closing `</div>` of `test-lab-header` and before the first `test-lab-section`:
    ```tsx
    <div className="test-lab-tabs">
      <button
        className={`test-lab-tab ${activeTab === "flow" ? "active" : ""}`}
        onClick={() => { setActiveTab("flow"); setShowAdminTools(false); }}
        type="button"
      >
        <Smartphone size={16} strokeWidth={2} />
        {t('admin.testLab.tabFlow')}
      </button>
      <button
        className={`test-lab-tab ${activeTab === "inspector" ? "active" : ""}`}
        onClick={() => setActiveTab("inspector")}
        type="button"
      >
        <Beaker size={16} strokeWidth={2} />
        {t('admin.testLab.tabInspector')}
      </button>
    </div>
    ```
  - Wrap the entire existing scan-flow content (idle section, scanning section, analyzing section, results section, error section) in `{activeTab === "flow" && (<>...</>)}`.
  - After the flow block, add: `{activeTab === "inspector" && <ApiInspector selectedSku={selectedSku} />}`
  - Notes: `Beaker` and `Smartphone` are already imported. `setShowAdminTools(false)` on flow tab click prevents stale overlay state.

- [x] **Task 3 — Relocate "Open as Real User" link to TestLab header**
  - File: `src/components/TestLab.tsx`
  - Move the `<a href={`/?sku=${ACTIVE_SKU}`} target="_blank" rel="noopener noreferrer" className="open-user-view-link">` element (and its children `<ExternalLink ... />` and `{t('admin.testLab.openUserView')}`) into the `test-lab-title-section` div, after the closing `</div>` of the inner content div (after the subtitle `<p>` tag).
  - The link markup and class name are unchanged — only its position in the JSX moves.
  - Notes: `ExternalLink` import stays. `open-user-view-link` CSS class stays (styles already appropriate for header placement).

- [x] **Task 4 — Add `showDebugPanel` toggle to Flow Test tab**
  - File: `src/components/TestLab.tsx`
  - Add state (after `activeTab` state): `const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);`
  - Add toggle JSX inside the flow content block, immediately before the `{scanState === "idle" && ...}` block:
    ```tsx
    <div className="test-lab-debug-toggle">
      <label className="test-lab-debug-toggle-label">
        <input
          type="checkbox"
          checked={showDebugPanel}
          onChange={(e) => setShowDebugPanel(e.target.checked)}
        />
        {t('admin.testLab.showDebugPanel')}
      </label>
    </div>
    ```
  - Add new `useEffect` (replaces the one deleted in Task 1):
    ```ts
    useEffect(() => {
      if (scanState === "complete" && showDebugPanel) {
        setShowAdminTools(true);
      }
    }, [scanState, showDebugPanel]);
    ```
  - Notes: `showDebugPanel` is independent of `activeTab` — no need to reset it when switching tabs.

- [x] **Task 5 — Create `src/components/ApiInspector.tsx`**
  - New file. Full content:
    ```tsx
    import { useState, useCallback } from "react";
    import { useTranslation } from "react-i18next";
    import { analyzeBottle } from "../api/apiClient.ts";
    import { AdminToolsOverlay } from "./AdminToolsOverlay.tsx";
    import type { AnalysisResult } from "../state/appState.ts";
    import "./ApiInspector.css";

    // 1×1 white JPEG — pure base64, no data: prefix
    const QUICK_FIRE_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAD/9k=';

    export function ApiInspector({ selectedSku }: { selectedSku: string }) {
      const { t, i18n } = useTranslation();
      const isRTL = i18n.language === 'ar';

      const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
      const [result, setResult] = useState<AnalysisResult | null>(null);
      const [rawError, setRawError] = useState<string | null>(null);

      const runAnalysis = useCallback(async (base64: string) => {
        setStatus("loading");
        setResult(null);
        setRawError(null);
        try {
          const res = await analyzeBottle(selectedSku, base64);
          setResult(res);
          setStatus("success");
        } catch (err) {
          setRawError(err instanceof Error ? err.message : String(err));
          setStatus("error");
        }
      }, [selectedSku]);

      const handleQuickFire = useCallback(() => {
        runAnalysis(QUICK_FIRE_BASE64);
      }, [runAnalysis]);

      const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64Only = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
          runAnalysis(base64Only);
        };
        reader.readAsDataURL(file);
      }, [runAnalysis]);

      return (
        <div className="api-inspector" dir={isRTL ? 'rtl' : 'ltr'}>
          <p className="api-inspector-description">{t('admin.inspector.description')}</p>

          <button
            className="entry-point-button entry-point-button--primary"
            onClick={handleQuickFire}
            disabled={status === "loading"}
            type="button"
          >
            {t('admin.inspector.quickFireButton')}
          </button>
          <p className="api-inspector-hint">{t('admin.inspector.quickFireHint')}</p>

          <div className="api-inspector-divider">{t('admin.inspector.uploadLabel')}</div>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={status === "loading"}
          />

          {status === "loading" && (
            <div className="analyzing-state">
              <div className="analyzing-spinner" />
              <p className="analyzing-text">{t('admin.inspector.loading')}</p>
            </div>
          )}

          {status === "success" && result && (
            <AdminToolsOverlay
              result={result}
              isOpen={true}
              onClose={() => {}}
              onOpen={() => {}}
              onSaveValidation={() => {}}
            />
          )}

          {status === "error" && (
            <pre className="api-inspector-error">{rawError}</pre>
          )}
        </div>
      );
    }
    ```
  - Notes: Reuses `.entry-point-button--primary` and `.analyzing-state` / `.analyzing-spinner` CSS classes from TestLab — no duplication needed.

- [x] **Task 6 — Update `src/components/TestLab.css`**
  - **Delete** every CSS block whose selector contains `test-mode` — run grep for `test-mode` to find all occurrences (base styles ~lines 127–215, responsive ~lines 534–542, light-theme variants ~lines 581–615). Delete the full block for each match.
  - **Add** after the existing `.test-lab-header` styles:
    ```css
    .test-lab-tabs {
      display: flex;
      gap: var(--space-xs);
      padding: 0 var(--space-lg) var(--space-md);
      border-bottom: 1px solid var(--glass-border);
    }
    .test-lab-tab {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-xs) var(--space-md);
      border-radius: var(--radius-md);
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
    }
    .test-lab-tab:hover {
      background: var(--color-primary-glow);
      color: var(--color-text-primary);
    }
    .test-lab-tab.active {
      background: var(--color-primary-glow);
      color: var(--color-primary);
      font-weight: 600;
    }
    .test-lab-debug-toggle {
      padding: var(--space-sm) 0;
      display: flex;
      justify-content: flex-end;
    }
    .test-lab-debug-toggle-label {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      cursor: pointer;
    }
    ```

- [x] **Task 7 — Create `src/components/ApiInspector.css`**
  - New file:
    ```css
    .api-inspector {
      padding: var(--space-lg);
    }
    .api-inspector-description {
      color: var(--color-text-secondary);
      margin-bottom: var(--space-md);
      font-size: 0.875rem;
    }
    .api-inspector-hint {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      margin-top: var(--space-xs);
      margin-bottom: var(--space-sm);
    }
    .api-inspector-divider {
      text-align: center;
      color: var(--color-text-tertiary);
      font-size: 0.8125rem;
      margin: var(--space-md) 0;
    }
    .api-inspector-error {
      background: var(--color-bg-elevated);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      margin-top: var(--space-md);
    }
    ```

- [x] **Task 8 — Update `src/i18n/locales/en/translation.json`**
  - Under `admin.testLab`, **remove** these 7 keys:
    - `selectMode`, `userFlow`, `userFlowDesc`, `debugMode`, `debugModeDesc`, `debugHint`, `selected`
  - Under `admin.testLab`, **add** these 2 keys (keep `openUserView` unchanged):
    ```json
    "tabFlow": "Flow Test",
    "tabInspector": "API Inspector",
    "showDebugPanel": "Show debug panel after scan"
    ```
  - **Add** a new `admin.inspector` object at the same level as `admin.testLab`:
    ```json
    "inspector": {
      "title": "API Inspector",
      "description": "Test the Worker endpoint directly — no camera required.",
      "quickFireButton": "Fire Test Request",
      "quickFireHint": "Sends a minimal test image to check endpoint health",
      "uploadLabel": "— or upload an image —",
      "loading": "Sending request...",
      "errorTitle": "Request failed"
    }
    ```

- [x] **Task 9 — Update `src/i18n/locales/ar/translation.json`**
  - Mirror all changes from Task 8. Remove the same 7 keys. Add:
    ```json
    "tabFlow": "اختبار التدفق",
    "tabInspector": "مفتش API",
    "showDebugPanel": "إظهار لوحة التصحيح بعد المسح"
    ```
  - Add `admin.inspector` Arabic translations:
    ```json
    "inspector": {
      "title": "مفتش API",
      "description": "اختبر نقطة نهاية العامل مباشرةً — دون الحاجة إلى كاميرا.",
      "quickFireButton": "إطلاق طلب تجريبي",
      "quickFireHint": "يُرسل صورة اختبارية صغيرة للتحقق من صحة نقطة النهاية",
      "uploadLabel": "— أو قم بتحميل صورة —",
      "loading": "جارٍ إرسال الطلب...",
      "errorTitle": "فشل الطلب"
    }
    ```

- [x] **Task 10 — Update `tests/e2e/test-lab-full-flow.spec.ts`**
  - Grep the file for `.test-mode-card` — there are 8 occurrences. Update each:
    - **Visible-on-load checks** (the two assertions that `.test-mode-card` is visible): replace with assertions that `.test-lab-tab` buttons are visible — `await expect(page.locator('.test-lab-tab').first()).toBeVisible()` and `await expect(page.locator('.test-lab-tab').last()).toBeVisible()`.
    - **Card click → active class checks** (the block that clicks `.test-mode-card.first()` and `.test-mode-card.last()` and checks `active`): replace with — `await page.locator('.test-lab-tab').first().click()` (Flow Test) and `await page.locator('.test-lab-tab').last().click()` (API Inspector). Assert active class: `await expect(page.locator('.test-lab-tab').first()).toHaveClass(/active/)`.
    - **Debug mode auto-open overlay test** (the block that clicks `.test-mode-card.last()` then asserts overlay opens): rewrite as:
      ```ts
      // Check the debug panel toggle
      await page.locator('.test-lab-debug-toggle-label input[type="checkbox"]').check();
      // Run a scan (existing scan trigger logic from the test)
      // ... existing scan steps ...
      // Assert overlay auto-opened
      await expect(page.locator('.admin-tools-overlay.open')).toBeVisible();
      ```
      Also add a complementary assertion: with checkbox unchecked, after scan completes, overlay should NOT be open — `await expect(page.locator('.admin-tools-overlay.open')).not.toBeVisible()`.
  - Do not delete any test blocks — rewrite them in place. If a test cannot be cleanly rewritten, add a comment `// TODO: QA agent — regenerate after mode refactor` and leave the test skipped with `test.skip(...)` rather than broken.

### Acceptance Criteria

- [ ] **AC-1 — Mode selector removed**
  Given the admin opens TestLab, when the page loads, then no element with class `test-mode-card` or `test-lab-section--mode` exists in the DOM, and no "SELECT TEST MODE" heading is visible.

- [ ] **AC-2 — Tab navigation renders**
  Given the admin is on TestLab, when the page loads, then two tab buttons are visible: "Flow Test" and "API Inspector". "Flow Test" is active by default (has `.active` class).

- [ ] **AC-3 — Tab switching shows correct content**
  Given the admin is on the Flow Test tab, when they click "API Inspector", then the scan flow UI (`test-lab-section--bottle`, `CameraViewfinder`, etc.) is not visible, and the `ApiInspector` component renders. When they click "Flow Test" again, the scan flow returns and ApiInspector unmounts.

- [ ] **AC-4 — Switching to Flow Test clears overlay state**
  Given the admin is on the API Inspector tab with a result showing, when they click "Flow Test", then `showAdminTools` is reset to false (overlay collapsed on return to Flow Test).

- [ ] **AC-5 — Show debug panel checkbox controls auto-open**
  Given the "Show debug panel after scan" checkbox is unchecked, when a scan completes, then `AdminToolsOverlay` does NOT auto-open. Given the checkbox is checked, when a scan completes, then `AdminToolsOverlay` auto-opens.

- [ ] **AC-6 — AdminToolsOverlay manual toggle still works regardless of checkbox**
  Given the checkbox is unchecked and a scan completes, when the admin manually clicks the overlay toggle button, then AdminToolsOverlay opens normally.

- [ ] **AC-7 — "Open as Real User" link is in the header**
  Given the admin opens TestLab, then the "Open as Real User ↗" link is visible in the TestLab header area at all times, not inside a mode selector section.

- [ ] **AC-8 — Quick Fire sends a request and shows result**
  Given the admin is on the API Inspector tab, when they click "Fire Test Request", then a loading state is shown, a POST is made via `analyzeBottle(ACTIVE_SKU, QUICK_FIRE_BASE64)`, and on success `AdminToolsOverlay` renders with the response data (`isOpen={true}`).

- [ ] **AC-9 — Image upload sends a request and shows result**
  Given the admin is on the API Inspector tab, when they select a valid image file via the file input, then the same analysis flow triggers and result renders on success.

- [ ] **AC-10 — API Inspector error state**
  Given `analyzeBottle` throws (e.g. Worker offline or 4xx/5xx), when the request completes, then a `<pre class="api-inspector-error">` block is displayed with the error message, and no `AdminToolsOverlay` renders.

- [ ] **AC-11 — Controls disabled during loading**
  Given the admin clicks "Fire Test Request" or selects a file, when the request is in-flight (`status === "loading"`), then the Quick Fire button (`disabled={true}`) and the file upload `<input>` (`disabled={true}`) are both non-interactive. The top-level tab nav buttons (`Flow Test` / `API Inspector`) are NOT disabled — navigating away mid-request is acceptable; the in-flight promise resolves silently.

- [ ] **AC-12 — Both EN and AR render without missing keys**
  Given the admin switches language to Arabic, then all new tab labels, toggle label, and inspector strings render in Arabic with no fallback i18n keys (no `admin.testLab.tabFlow`-style raw key visible).

## Additional Context

### Dependencies

- No new npm packages required.
- `analyzeBottle` (`src/api/apiClient.ts`) — existing, no changes.
- `AdminToolsOverlay` (`src/components/AdminToolsOverlay.tsx`) — existing, no changes; `onSaveValidation` accepts a no-op in ApiInspector context since no scan history integration is in scope.
- `AnalysisResult` (`src/state/appState.ts`) — existing type, no changes.
- `.analyzing-state` / `.analyzing-spinner` CSS classes — before using them in `ApiInspector.tsx`, grep `TestLab.css` for `.analyzing-state`. **If found**: the classes are in the global stylesheet cascade and `ApiInspector.tsx` can use them with no further action. **If not found** (e.g. they were renamed or scoped): copy the `.analyzing-state` and `.analyzing-spinner` block verbatim into `ApiInspector.css`.

### Testing Strategy

- **E2E (Task 10)**: Update `test-lab-full-flow.spec.ts` — replace 8 `.test-mode-card` selectors with new `.test-lab-tab` and checkbox selectors. Rewrite the debug-mode overlay auto-open test to use the checkbox.
- **Unit**: `src/test/apiClient.test.ts` is unaffected — `analyzeBottle` signature unchanged.
- **Manual smoke test**:
  1. Load TestLab → confirm no mode cards, two tabs visible, "Open as Real User" in header.
  2. Flow Test tab: run a scan with checkbox unchecked → overlay stays closed. Check box → run scan → overlay auto-opens.
  3. API Inspector tab: click "Fire Test Request" → loading state → result or error renders.
  4. API Inspector tab: upload a real bottle photo → result renders with `AdminToolsOverlay` open.
  5. Switch to Arabic → all strings render correctly.

### Notes

- `analytics.testModeChanged` is deleted with `handleModeChange`. If tab-switch analytics is wanted later, `analytics.ts` will need a new event type — out of scope here.
- The `test-lab-section--mode` CSS class (if it has its own styles beyond layout) should be checked before deletion — the `.test-lab-section` base class handles padding/margin and should be sufficient.
- The 1×1 JPEG `QUICK_FIRE_BASE64` constant is a valid minimal JPEG. The Worker will receive a real (tiny) image and respond with an analysis result. If the Worker validates minimum image dimensions, this may return an `imageQualityIssues` flag rather than an error — acceptable behaviour for an endpoint health check.
- `AdminToolsOverlay` in `ApiInspector` passes `onSaveValidation={() => {}}`. The "Save" button in the validation section will appear to succeed but do nothing. **This is intentional and accepted** — do NOT add a `readOnly` prop to `AdminToolsOverlay` to hide the validation section. That is out of scope. Leave it as a known no-op; it can be addressed in a dedicated follow-up story.
