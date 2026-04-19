---
project_name: 'Afia-App'
user_name: 'Ahmed'
date: '2026-04-17'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality_rules', 'workflow_rules', 'critical_rules']
status: 'complete'
optimized_for_llm: true
existing_patterns_found: 54
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Technologies

**Frontend (PWA):**
- React 19.2.0 + React DOM 19.2.0 (versions MUST match exactly)
- TypeScript 5.9.3 (strict mode enabled)
- Vite 7.3.1 (build tool + dev server)
- TailwindCSS 4.2.1 (utility-first styling)

**AI/ML Stack:**
- @tensorflow/tfjs 4.17.0 (local inference)
- onnxruntime-web 1.24.3 (ONNX model support)

**Internationalization:**
- i18next 25.8.17 + react-i18next 16.5.6
- i18next-browser-languagedetector 8.2.1

**PWA & Offline:**
- vite-plugin-pwa 0.21.1 (service worker generation)
- workbox-window 7.4.0 (runtime caching)
- idb 8.0.0 (IndexedDB wrapper)

**Backend (Cloudflare Worker):**
- Hono (edge routing framework)
- @supabase/supabase-js 2.103.3 (PostgreSQL client)
- Sharp 0.34.5 (server-side image processing, adds ~500KB WASM to bundle)
- Wrangler 4.71.0 (Cloudflare deployment CLI)

**Testing:**
- Vitest 4.0.18 (unit tests - uses `vi.fn()` not `jest.fn()`)
- @playwright/test 1.58.2 (E2E tests - requires `npx playwright install` in CI)
- @testing-library/react 16.3.2 + @testing-library/jest-dom 6.9.1
- jsdom 28.1.0 (DOM environment - doesn't support all browser APIs, camera mocks required)

**Development Tools:**
- ESLint 9.39.1 + typescript-eslint 8.48.0
- @vitejs/plugin-react 5.1.1
- @cloudflare/vite-plugin 1.26.1

### Critical Version Constraints & Failure Modes

**⚠️ React 19.2.0 Breaking Changes:**
- React and react-dom versions MUST match exactly - mismatched versions cause cryptic errors
- MUST use `react-dom/client` import and `createRoot()` - old `ReactDOM.render()` removed
- Testing Library requires `@testing-library/react@16.3.2+` minimum
- Code breaks without these - not optional

**⚠️ TypeScript 5.9.3 Strict Mode:**
- `strict: true` in tsconfig.app.json - no implicit `any` allowed
- `noUnusedLocals: true` and `noUnusedParameters: true` enforced
- During development, comment unused vars: `// eslint-disable-next-line @typescript-eslint/no-unused-vars`
- `erasableSyntaxOnly: true` affects type-only imports - use `import type { ... }`
- All function parameters need explicit types

**⚠️ Vite 7.3.1 + PWA Plugin Override:**
- vite-plugin-pwa 0.21.1 requires Vite 7.x
- **CRITICAL:** Override in package.json MUST be preserved: `"vite-plugin-pwa": { "vite": "$vite" }`
- Without this override, `npm install` fails
- Agents modifying package.json must not remove this override

**⚠️ TensorFlow.js 4.17.0:**
- WebGL backend preferred but NOT guaranteed - iOS Safari has WebGL limitations
- MUST implement backend detection with graceful degradation (WebGL → WASM → CPU)
- Never assume WebGL availability
- Model files must be served with correct MIME types or loading fails silently
- IndexedDB quota can be exceeded - implement error handling for model caching
- WebGL context loss requires manual model reload - not automatic recovery
- Model weights cached in IndexedDB for offline support

**⚠️ Cloudflare Worker Constraints:**
- Separate `worker/` directory with its own package.json and node_modules
- Running `npm install` at project root does NOT install worker dependencies
- Workers have 1MB bundle size limit - affects library choices
- NO Node.js APIs available (no `fs`, `path`, `crypto` from Node)
- Hono is NOT Express - different middleware patterns, don't assume Express compatibility
- Sharp 0.34.5 requires WASM - adds ~500KB to Worker bundle

**⚠️ Supabase Service Role Key (SECURITY CRITICAL):**
- Worker MUST use service role key (SUPABASE_SERVICE_KEY), NOT anon key
- Using anon key in Worker exposes your database with client-level permissions
- Service role key bypasses Row Level Security (RLS) - use carefully
- Never commit service role key to git - use Wrangler secrets: `wrangler secret put SUPABASE_SERVICE_KEY`

**⚠️ Testing Stack Gotchas:**
- Vitest uses different globals than Jest - use `vi.fn()` not `jest.fn()`, `vi.mock()` not `jest.mock()`
- Playwright requires browser binaries - CI must run `npx playwright install chromium`
- jsdom doesn't support camera APIs - all camera tests require mocks in `src/test/setup.ts`
- Service Worker APIs not available in jsdom - mock or skip SW tests

### Don't "Fix" These Working Combinations

These version combinations are tested and stable - upgrading "to latest" will break builds:

- React 19.2.0 + React DOM 19.2.0 (exact match required)
- TypeScript 5.9.3 with strict mode (downgrading loses safety, upgrading may break)
- Vite 7.3.1 + vite-plugin-pwa 0.21.1 (this combo works, don't change)
- TensorFlow.js 4.17.0 with IndexedDB caching (newer versions may break model loading)

---

## Language-Specific Rules (TypeScript/JavaScript)

### TypeScript Configuration Requirements

**Strict Mode Enforcement:**
- All `.ts` and `.tsx` files must pass strict type checking
- No implicit `any` types allowed - use `unknown` and narrow with type guards
- All function parameters require explicit types
- Return types recommended for exported functions

**Common Strict Mode Fixes:**
- `Object is possibly undefined` → use optional chaining: `obj?.prop`
- `Type X is not assignable to type Y` → check if you need `as const` assertion
- `Parameter implicitly has any type` → add explicit type annotation
- `noUnusedLocals` during refactoring → prefix with underscore `_unusedVar` or use `// eslint-disable-next-line @typescript-eslint/no-unused-vars`

**Type Safety vs Pragmatism:**
- Allow `unknown` + type guards for external data (API responses, localStorage)
- Allow `any` ONLY for third-party library types that are broken (document with `// @ts-expect-error: library types incomplete` comment)
- Never use `any` for your own code - fix the types properly

### Import/Export Patterns

**Type-Only Imports (Required):**
```typescript
// Correct - required by erasableSyntaxOnly: true
import type { AnalysisResult } from './types/analysis';
import type { BottleData } from './data/bottleRegistry';

// Wrong - will fail build
import { AnalysisResult } from './types/analysis';
```

**Named vs Default Exports:**
- **Named exports** for utilities (enables tree-shaking, reduces bundle size)
- **Default exports** for React components only (required by `React.lazy()`)
- **Barrel exports** (`index.ts`) only in `src/types/`, `src/config/`, `src/data/`
- **Never use barrel exports in components** - causes circular dependencies

**Supabase Import Pattern:**
- Never import `@supabase/supabase-js` directly in PWA code
- Always use `src/config/supabase.ts` wrapper
- Test alias to stub is ONLY for Vite test resolution - Worker build uses real package

### Module System & Boundaries

**ESM Only:**
- `"type": "module"` in package.json - no CommonJS allowed
- Use `.js` extensions in imports when required by bundler
- Dynamic imports for code splitting: `const Component = lazy(() => import('./Component'))`

**Module Boundary Rules (Prevents Circular Dependencies):**
- `src/api/` calls Worker endpoints - never import Worker code directly into PWA
- `src/services/` contains business logic - can be imported anywhere
- `src/utils/` are pure functions - no side effects, no imports from services
- `src/hooks/` can import from utils and services, but not from components
- Violating these boundaries causes circular dependencies and breaks builds

### Error Handling Patterns

**Async/Await Required:**
- All async operations use `async/await` - no raw Promises
- Always wrap async calls in try-catch blocks
- Error objects typed with narrowing pattern:

```typescript
try {
  await someAsyncOperation();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  errorTelemetry.logError(message, error);
}
```

**Context-Specific Error Patterns:**
- **Worker errors:** Return JSON: `{ error: 'rate_limit_exceeded' }`
- **PWA errors:** Throw: `throw new Error('Camera permission denied')`
- **API errors:** Check `response.ok` before parsing JSON
- **React render errors:** Never throw in render - use Error Boundaries

**Error Telemetry:**
- Use `errorTelemetry.logError()` from `src/services/errorTelemetry.ts` for production errors
- Never throw errors in React render - use Error Boundaries
- API errors return structured format: `{ error: string, details?: unknown }`

**Error Boundary Placement:**
- **Root level:** `<ErrorBoundary>` wraps entire app
- **Route level:** Admin dashboard has separate boundary
- **Component level:** Camera capture has boundary for permission errors
- Don't add boundaries everywhere - only at failure isolation points

### React Patterns

**Hooks Only - No Class Components:**
- All components are functional with hooks
- Custom hooks in `src/hooks/` directory
- Hook naming: MUST start with `use` prefix or ESLint fails (e.g., `useCamera`, `useOnlineStatus`)

**React Hooks Gotchas:**
- Hooks can't be called conditionally - workaround: early return AFTER all hooks
- `useEffect` cleanup functions REQUIRED for subscriptions, timers, event listeners
- Custom hooks must start with `use` or ESLint fails

**State Management Architecture:**
- **No global state library** (intentional - keeps bundle small)
- **Local state:** `useState` for component-level state
- **Persistent state:** localStorage with `useEffect` sync
- **Size threshold:** <1MB → localStorage, >1MB → IndexedDB
- **Pattern:** Scan history in localStorage (small), model weights in IndexedDB (large)

**localStorage Pattern:**
```typescript
// Write on change, read on mount, sync with useEffect
const [scans, setScans] = useState<Scan[]>([]);

useEffect(() => {
  const stored = localStorage.getItem('scans');
  if (stored) setScans(JSON.parse(stored));
}, []);

useEffect(() => {
  localStorage.setItem('scans', JSON.stringify(scans));
}, [scans]);
```

**IndexedDB Pattern:**
- Use `idb` wrapper from `src/utils/db.ts`
- Never use raw IndexedDB API
- Used for: model weights, large scan images

**Component Structure:**
- One component per file
- Co-located CSS module: `Component.tsx` + `Component.css`
- CSS modules use camelCase class names: `styles.className`
- Test file: `Component.test.tsx` in same directory or `src/test/`
- All components must handle loading and error states explicitly

### Performance Rules & Trade-offs

**Memoization (Use Sparingly):**
- `useMemo` has overhead - only use for calculations >10ms
- `useCallback` prevents re-renders but adds memory - only use when passing to memoized children
- `React.memo()` only on components that re-render frequently: `BottleFillGauge`, `FeedbackGrid`, `ConfidenceBadge`

**Code Splitting Strategy:**
- Lazy load routes: `const Admin = lazy(() => import('./components/AdminDashboard'))`
- Lazy load heavy libraries: TensorFlow.js models loaded on-demand via `modelLoader.ts` service
- **Do NOT split main scan flow** - intentional for performance (no network delay)
- Code splitting adds network requests - only split routes and heavy libraries, not small components

### Anti-Patterns to Avoid

❌ **Never use `any` type** - use `unknown` and narrow with type guards  
❌ **Never mutate state directly** - always use setState functions  
❌ **Never use `var`** - use `const` by default, `let` when reassignment needed  
❌ **Never use `==`** - always use `===` for equality checks  
❌ **Never ignore TypeScript errors** - fix them, don't suppress with `@ts-ignore`  
❌ **Never import Worker code into PWA** - use API calls only  
❌ **Never use barrel exports in components** - causes circular dependencies  
❌ **Never call hooks conditionally** - all hooks must run on every render  

---

## Framework-Specific Rules (React + PWA)

### React Component Patterns

**Component Architecture:**
- Functional components only - no class components
- One component per file with co-located styles
- Default exports for components (required by `React.lazy()`)
- Named exports for utilities and hooks
- **Small helper components (<20 lines)** can live in same file as parent - use named exports
- Larger helpers (>20 lines) get their own files

**Hooks Rules:**
- All custom hooks MUST start with `use` prefix (ESLint enforces this)
- Hooks cannot be called conditionally - all hooks run on every render
- Workaround for conditional logic: call all hooks first, then early return
- `useEffect` cleanup functions REQUIRED for subscriptions, timers, event listeners
- Custom hooks in `src/hooks/` directory

**State Management:**
- No global state library (intentional - keeps bundle small)
- Local state: `useState` for component-level state
- Persistent state: localStorage (<1MB) or IndexedDB (>1MB)
- Scan history in localStorage, model weights in IndexedDB

**Component Structure:**
- Loading states MUST be handled explicitly (no silent failures)
- Error states MUST be handled explicitly (use Error Boundaries)
- Error Boundaries at: root level, route level, camera component level
- Don't add boundaries everywhere - only at failure isolation points

### Error Boundary Recovery Actions

**Root Level Boundary (`src/App.tsx`):**
- Shows full-page error with "Reload Page" button
- Logs error to `errorTelemetry.logError()` for monitoring
- Clears localStorage on reload to recover from corrupted state
- Pattern: `<ErrorBoundary FallbackComponent={FullPageError}>`

**Route Level Boundary (Admin Dashboard):**
- Shows inline error within dashboard layout
- Provides "Return to Home" link
- Does NOT clear localStorage (admin data preserved)
- Pattern: `<ErrorBoundary FallbackComponent={InlineError}>`

**Camera Component Boundary:**
- Falls back to file upload input on camera permission errors
- Shows user-friendly message: "Camera unavailable - upload photo instead"
- Logs permission denial for analytics
- Pattern: `<ErrorBoundary FallbackComponent={FileUploadFallback}>`

**Error Handling in Render:**
- Never throw errors directly in render - causes full app crash
- For async errors: use error state + `useEffect` pattern
- For sync errors: wrap in Error Boundary
- Alternative pattern for recoverable errors:

```typescript
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  loadData().catch(err => setError(err.message));
}, []);

if (error) return <ErrorMessage message={error} onRetry={() => setError(null)} />;
```

### PWA-Specific Rules

**Service Worker Patterns:**
- Generated by vite-plugin-pwa - never edit `dist/sw.js` manually
- Workbox strategies configured in `vite.config.ts` only
- Service worker updates require user confirmation (no auto-reload)
- Cache-first for static assets, network-first for API calls

**Service Worker Update Flow (CRITICAL):**
- Update detected via `workbox-window` `waiting` event
- Show toast notification: "New version available - Click to update"
- Toast persists until user clicks or dismisses (no auto-hide)
- On click: call `skipWaiting()` then `window.location.reload()`
- On dismiss: update installs on next page load
- Implementation in `src/services/serviceWorkerRegistration.ts`
- Never force reload without user action - breaks user's current work

**Offline Support:**
- IndexedDB for model weights and large scan images
- localStorage for scan history and user preferences
- Network status detection with `useOnlineStatus` hook
- Graceful degradation when offline (show cached data)

**Offline Degradation Patterns (CONCRETE EXAMPLES):**

**Scan History View (Offline):**
- Show cached scans from localStorage with "Offline" badge
- Disable "Sync" button (grayed out)
- Show last sync timestamp: "Last synced 2 hours ago"
- Queue new scans in localStorage with `pending: true` flag

**Camera Capture (Offline):**
- Allow photo capture (camera works offline)
- Show "Will upload when online" message
- Store image in IndexedDB with upload queue
- Auto-upload when `useOnlineStatus` detects reconnection

**Admin Dashboard (Offline):**
- Show cached analytics data with "Viewing cached data" banner
- Disable real-time updates
- Show "Reconnecting..." spinner when online status changes
- Refresh data automatically on reconnection

**Install Prompt:**
- PWA install prompt triggered by user action, not automatically
- `beforeinstallprompt` event captured and stored in state
- Install button only shown on supported browsers (Chrome, Edge, Safari 16.4+)

**PWA Install Trigger Logic (SPECIFIC CONDITIONS):**
- Trigger after user completes first successful scan (engagement signal)
- OR after 3 page visits within 7 days (returning user)
- Show install prompt as dismissible banner at bottom of screen
- Never show more than once per 30 days if dismissed
- Store dismissal timestamp in localStorage: `pwa_install_dismissed`
- Implementation in `src/hooks/useInstallPrompt.ts`

### Styling Strategy (CSS Modules vs Tailwind)

**When to Use Tailwind (Default):**
- Layout and spacing: `flex`, `grid`, `p-4`, `mt-2`
- Responsive design: `md:flex-row`, `lg:w-1/2`
- Common UI patterns: buttons, cards, forms
- Utility-first approach for rapid development
- **95% of styling should be Tailwind**

**When to Use CSS Modules:**
- Complex animations requiring `@keyframes`
- Component-specific styles with many pseudo-selectors (`:hover`, `:focus`, `:disabled`)
- Styles that need CSS variables for theming
- Third-party library style overrides that can't be done with Tailwind
- **Only 5% of styling - use sparingly**

**CSS Module Naming:**
- File: `Component.module.css` (not `Component.css`)
- Import: `import styles from './Component.module.css'`
- Usage: `className={styles.componentName}` (camelCase)
- Never mix global CSS with CSS modules in same file

### Performance Optimization

**Code Splitting:**
- Lazy load routes: `const Admin = lazy(() => import('./components/AdminDashboard'))`
- Lazy load heavy libraries: TensorFlow.js models loaded on-demand
- **Do NOT split main scan flow** - intentional for performance
- **Why:** Scan flow is time-sensitive - network latency would hurt UX (adds 100-300ms delay)
- Code splitting adds network requests - only split routes and heavy libraries, not small components

**Memoization (Use Sparingly):**
- `useMemo` has overhead - only use for calculations >10ms
- `useCallback` prevents re-renders but adds memory - only use when passing to memoized children
- `React.memo()` only on components that re-render frequently: `BottleFillGauge`, `FeedbackGrid`, `ConfidenceBadge`

**How to Measure Memoization Threshold:**
- Use React DevTools Profiler to measure render time
- Or wrap calculation in `console.time()` / `console.timeEnd()` during development
- Profile in production mode (`npm run build` + `npm run preview`) - dev mode is slower
- Only memoize if profiling shows >10ms consistently
- Don't guess - measure first, then optimize

**Image Optimization:**
- Camera captures at 1920x1080 max resolution
- Images compressed before upload (Sharp in Worker)
- Thumbnails generated server-side for history view
- No full-resolution images stored in localStorage

### React 19.2.0 Specific Rules

**Breaking Changes from React 18:**
- MUST use `react-dom/client` import and `createRoot()` - old `ReactDOM.render()` removed
- React and react-dom versions MUST match exactly
- Testing Library requires `@testing-library/react@16.3.2+` minimum

**New Features Used:**
- Automatic batching for all state updates (no manual batching needed)
- **IMPLICATION:** Don't wrap state updates in `startTransition` or `flushSync` unless you have a specific reason
- **Coming from React 18?** Remove manual batching code - it's automatic now
- Transitions API not used (not needed for this app)
- Server Components not used (PWA is client-only)

### localStorage Error Handling (CRITICAL)

**Parse Error Pattern:**
```typescript
// WRONG - crashes on corrupted data
const stored = localStorage.getItem('scans');
if (stored) setScans(JSON.parse(stored)); // throws on bad JSON

// CORRECT - handles parse errors gracefully
const stored = localStorage.getItem('scans');
if (stored) {
  try {
    setScans(JSON.parse(stored));
  } catch (error) {
    console.error('Failed to parse localStorage:', error);
    localStorage.removeItem('scans'); // clear corrupted data
    setScans([]); // reset to default
  }
}
```

**Quota Exceeded Handling:**
```typescript
try {
  localStorage.setItem('scans', JSON.stringify(scans));
} catch (error) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    // Remove oldest scans to free space
    const trimmedScans = scans.slice(-50); // keep last 50
    localStorage.setItem('scans', JSON.stringify(trimmedScans));
  }
}
```

**IndexedDB Quota Handling:**
- Check quota before storing large files: `navigator.storage.estimate()`
- If quota exceeded, delete oldest cached model weights
- Show user notification: "Storage full - clearing old data"
- Fallback: disable offline model caching, use network-only mode

### Anti-Patterns to Avoid

❌ **Never throw errors in render** - use Error Boundaries or error state  
❌ **Never mutate state directly** - always use setState functions  
❌ **Never call hooks conditionally** - all hooks must run on every render  
❌ **Never use inline functions passed to memoized children** - causes unnecessary re-renders  
❌ **Never store large data in component state** - use IndexedDB for >1MB data  
❌ **Never edit generated service worker** - configure via `vite.config.ts` instead  
❌ **Never auto-reload on service worker update** - requires user confirmation  
❌ **Never use `JSON.parse()` without try-catch on localStorage data** - corrupted data crashes app  
❌ **Never assume localStorage has infinite space** - implement quota handling  
❌ **Never use CSS Modules for simple utility styles** - use Tailwind instead  
❌ **Never add manual batching in React 19** - it's automatic now  

---

## Testing Rules

### Test Organization

**Test File Structure:**
- Unit tests: `Component.test.tsx` co-located with component OR in `src/test/`
- Integration tests: `src/test/integration/` directory
- E2E tests: `e2e/` directory at project root
- Test utilities: `src/test/utils/` for shared helpers
- Test setup: `src/test/setup.ts` for global mocks and configuration

**Test Naming Convention:**
- Test files: `*.test.ts` or `*.test.tsx` (Vitest convention)
- E2E files: `*.spec.ts` (Playwright convention)
- Describe blocks: Component or feature name
- Test cases: "should [expected behavior] when [condition]"

### Vitest-Specific Rules

**Vitest vs Jest Differences (CRITICAL):**
- Use `vi.fn()` NOT `jest.fn()` - different global namespace
- Use `vi.mock()` NOT `jest.mock()` - different API
- Use `vi.spyOn()` NOT `jest.spyOn()` - different implementation
- Import from `vitest`: `import { describe, it, expect, vi } from 'vitest'`
- Vitest uses Vite's module resolution - respects `vite.config.ts` aliases

**Mock Patterns:**
```typescript
// Mock entire module
vi.mock('./services/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' })
}));

// Mock specific function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Spy on existing function
const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
```

**Camera API Mocks (REQUIRED):**
- jsdom doesn't support `navigator.mediaDevices.getUserMedia()`
- All camera tests MUST mock in `src/test/setup.ts`
- Mock pattern:
```typescript
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    })
  }
});
```

### Playwright-Specific Rules

**Browser Installation (CI CRITICAL):**
- Playwright requires browser binaries - NOT included in npm package
- CI MUST run: `npx playwright install chromium` before tests
- Local development: `npx playwright install` (one-time setup)
- Without this, E2E tests fail with "Executable doesn't exist" error

**E2E Test Patterns:**
- Use `page.goto()` for navigation
- Use `page.locator()` for element selection (NOT `page.$()`)
- Wait for network idle: `await page.waitForLoadState('networkidle')`
- Use `expect(page).toHaveURL()` for navigation assertions
- Use `expect(locator).toBeVisible()` for element assertions

**Camera Testing in E2E:**
- Use `page.context().grantPermissions(['camera'])` to grant permissions
- Mock camera stream with `page.route()` to intercept media requests
- Test file upload fallback when camera unavailable

### Test Coverage Requirements

**Coverage Thresholds:**
- Overall coverage: 80% minimum
- Critical paths: 100% coverage required
- Critical paths: camera capture, AI inference, scan history, offline sync
- Utility functions: 90% coverage minimum
- UI components: 70% coverage acceptable (focus on logic, not styling)

**What NOT to Test:**
- Third-party library internals (TensorFlow.js, React internals)
- Generated code (service worker, Vite build output)
- Type definitions (TypeScript handles this)
- Trivial getters/setters with no logic

### Integration vs Unit Test Rules

**Unit Tests (Fast, Isolated):**
- Test single function or component in isolation
- Mock all external dependencies (API calls, localStorage, IndexedDB)
- Run in milliseconds - no network, no file I/O
- Use for: utilities, hooks, pure functions, component logic

**Integration Tests (Slower, Real Dependencies):**
- Test multiple components working together
- Use real localStorage and IndexedDB (not mocked)
- Mock only external APIs (Worker endpoints)
- Use for: user flows, state management, data persistence

**E2E Tests (Slowest, Full Stack):**
- Test entire user journey in real browser
- Real camera, real network, real storage
- Mock only external services (Supabase, LLM APIs)
- Use for: critical user paths, cross-browser compatibility

**Test Boundary Decision Tree:**
- Testing single function? → Unit test
- Testing component with hooks? → Unit test with mocked dependencies
- Testing data flow between components? → Integration test
- Testing user journey across pages? → E2E test

### Mock Usage Patterns

**When to Mock:**
- External APIs (Worker endpoints, Supabase, LLM APIs)
- Browser APIs not supported in jsdom (camera, geolocation, notifications)
- Time-dependent code (`Date.now()`, `setTimeout`)
- Random number generation (`Math.random()`)
- File system operations (in Worker tests)

**When NOT to Mock:**
- React hooks (test real behavior)
- localStorage/IndexedDB in integration tests (test real persistence)
- Pure utility functions (test real implementation)
- Component rendering (test real DOM output)

**Mock Cleanup (CRITICAL):**
```typescript
afterEach(() => {
  vi.clearAllMocks(); // clear call history
  vi.restoreAllMocks(); // restore original implementations
  localStorage.clear(); // clear test data
});
```

### Service Worker Testing

**Service Worker Limitations:**
- jsdom doesn't support Service Worker APIs
- Can't test service worker registration in unit tests
- Can't test cache strategies in unit tests

**Service Worker Test Strategy:**
- Unit test: Mock `navigator.serviceWorker` and test registration logic
- E2E test: Test actual service worker behavior in Playwright
- Skip service worker tests in jsdom: `it.skipIf(!('serviceWorker' in navigator))`

### Anti-Patterns to Avoid

❌ **Never use `jest.fn()` in Vitest tests** - use `vi.fn()` instead  
❌ **Never forget to install Playwright browsers in CI** - tests will fail  
❌ **Never test implementation details** - test behavior, not internals  
❌ **Never mock everything** - integration tests need real dependencies  
❌ **Never forget mock cleanup** - causes test pollution and flaky tests  
❌ **Never test third-party library internals** - trust the library  
❌ **Never skip E2E tests for critical paths** - unit tests aren't enough  
❌ **Never assume jsdom supports all browser APIs** - mock camera, service workers, etc.  

---

## Code Quality & Style Rules

### Linting & Formatting

**ESLint Configuration:**
- ESLint 9.39.1 with flat config format (`eslint.config.js`)
- typescript-eslint 8.48.0 for TypeScript rules
- @eslint/js for base JavaScript rules
- eslint-plugin-react-hooks for React-specific rules
- Strict mode enabled - no warnings allowed in production builds

**ESLint Rules Enforced:**
- `no-unused-vars` - enforced by TypeScript `noUnusedLocals` (error)
- `no-console` - allowed in development, **error in production** (except `console.error`, `console.warn`)
- `react-hooks/rules-of-hooks` - error (enforces hooks rules)
- `react-hooks/exhaustive-deps` - warn (missing dependencies in useEffect)
- `@typescript-eslint/no-explicit-any` - error (use `unknown` instead)
- `@typescript-eslint/no-unused-vars` - error (with underscore prefix exception)

**Console Enforcement Mechanism:**
```javascript
// In eslint.config.js
rules: {
  'no-console': process.env.NODE_ENV === 'production' 
    ? ['error', { allow: ['error', 'warn'] }] 
    : 'off'
}
```

**Import Order (NOT Enforced by ESLint):**
- No `eslint-plugin-import` installed - import order is **convention only**
- Agents should follow the order manually, but it's not auto-enforced
- If you want enforcement, install: `npm install -D eslint-plugin-import`
- Then add rule: `'import/order': ['error', { groups: [...] }]`

**Prettier (NOT USED):**
- No Prettier in this project - ESLint handles formatting
- Use ESLint autofix: `npm run lint:fix`
- **If you find Prettier config:** Delete `.prettierrc` and remove from package.json
- Don't add Prettier - creates conflicts with ESLint

**ESLint Autofix Limitations:**
- `npm run lint:fix` fixes: formatting, import order (if plugin added), unused imports
- **Does NOT fix:** type errors, logic errors, missing dependencies in hooks
- After autofix, **manual review required** for remaining errors
- Run `npm run lint` to see remaining issues

### Code Organization

**File & Folder Structure:**
```
src/
├── components/        # React components (one per file)
├── hooks/            # Custom React hooks
├── services/         # Business logic (API clients, AI inference)
├── utils/            # Pure utility functions
├── types/            # TypeScript type definitions
├── config/           # Configuration files
├── data/             # Static data (bottle registry, constants)
├── test/             # Test utilities and setup
└── App.tsx           # Root component
```

**Directory Structure Thresholds:**
- Keep directories flat until **>15 files** in a single directory
- Then create subdirectories by feature or domain
- Example: `services/` with 20 files → split into `services/ai/`, `services/api/`, `services/storage/`
- Never create subdirectories with only 1-2 files - premature abstraction

**Cross-Cutting Concerns Location:**
- **Error Boundaries:** `src/components/ErrorBoundary.tsx` (single file, used in multiple places)
- **Context Providers:** `src/contexts/` directory (e.g., `ThemeContext.tsx`, `AuthContext.tsx`)
- **HOCs (if any):** `src/hocs/` directory (currently none in this project)
- **Layout Components:** `src/components/layouts/` (e.g., `MainLayout.tsx`, `AdminLayout.tsx`)

**Import Order (Convention - Not Enforced):**
1. External dependencies (React, third-party libraries)
2. Internal absolute imports (types, config, data)
3. Internal relative imports (components, hooks, utils)
4. CSS/style imports (last)

**Example:**
```typescript
// 1. External
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// 2. Internal absolute
import type { AnalysisResult } from '@/types/analysis';
import { API_CONFIG } from '@/config/api';

// 3. Internal relative
import { useCamera } from '../hooks/useCamera';
import { analyzeImage } from '../services/aiInference';

// 4. Styles
import styles from './Component.module.css';
```

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `CameraCapture.tsx`)
- Hooks: `camelCase.ts` (e.g., `useCamera.ts`)
- Utilities: `camelCase.ts` (e.g., `imageProcessing.ts`)
- Types: `camelCase.ts` (e.g., `analysis.ts`)
- Tests: `*.test.tsx` or `*.spec.ts`

**Variables & Functions:**
- Variables: `camelCase` (e.g., `scanHistory`, `isLoading`)
- Functions: `camelCase` (e.g., `analyzeImage`, `fetchData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_ENDPOINT`, `MAX_FILE_SIZE`)
- React components: `PascalCase` (e.g., `CameraCapture`, `ScanHistory`)
- Custom hooks: `use` prefix + `PascalCase` (e.g., `useCamera`, `useOnlineStatus`)

**Types & Interfaces:**
- Interfaces: `PascalCase` without `I` prefix (e.g., `AnalysisResult` not `IAnalysisResult`)
- Types: `PascalCase` (e.g., `ScanStatus`, `BottleData`)
- Enums: `PascalCase` (e.g., `AnalysisStatus`)
- Generic types: Single uppercase letter or descriptive (e.g., `T`, `TData`, `TResponse`)

**Boolean Variables:**
- Prefix with `is`, `has`, `should`, `can` (e.g., `isLoading`, `hasError`, `shouldRetry`)
- **Never use negative names** (e.g., `isNotReady` ❌, use `isReady` ✅)
- **Why:** Negative booleans create double negatives in conditionals (`if (!isNotReady)` is confusing)

### Documentation Requirements

**JSDoc Comments (Required For):**
- Exported functions **>10 lines** (complexity threshold)
- All exported classes and their public methods
- Complex utility functions with non-obvious logic
- Public API methods
- Type definitions with non-obvious usage

**JSDoc Format:**
```typescript
/**
 * Analyzes bottle image using local CNN model with LLM fallback
 * @param imageData - Base64 encoded image data
 * @param options - Analysis configuration options
 * @returns Analysis result with confidence score and bottle data
 * @throws {Error} If image format is invalid or model fails to load
 */
export async function analyzeImage(
  imageData: string,
  options?: AnalysisOptions
): Promise<AnalysisResult> {
  // implementation
}
```

**Inline Comments (Use Sparingly):**
- Explain "why" not "what" - code should be self-documenting
- Use for non-obvious business logic or workarounds
- Use for complex algorithms or performance optimizations
- Use `// TODO:` for temporary code that needs improvement
- Use `// FIXME:` for known bugs that need fixing
- Use `// NOTE:` for important context or gotchas

**TODO/FIXME/NOTE Tracking:**
- These are **informal** - not tracked by any tool
- Use for local context and reminders
- Before committing, review all TODOs - resolve or convert to issues
- Don't let TODOs accumulate - they become stale and forgotten

**What NOT to Comment:**
- Obvious code (e.g., `// increment counter` for `count++`)
- Type information (TypeScript handles this)
- Commented-out code (delete it - git history preserves it)

**Commented-Out Code Rule:**
- **Never commit commented-out code** - delete it before committing
- **Okay during debugging** - comment out temporarily while troubleshooting
- **Before commit:** Delete commented code or uncomment and fix it
- Git history preserves deleted code - you can always recover it

### Code Complexity Rules

**Function Length:**
- Max 50 lines per function (excluding blank lines and comments)
- **Line counting:** Count only code lines (statements, expressions, JSX)
- **Blank lines and comments don't count** toward the 50-line limit
- If longer, extract helper functions
- **Exception:** React components can be longer if **>70% JSX**
- **JSX ratio calculation:** (JSX lines / total code lines) × 100
- **Inline event handlers count** toward the limit - extract to methods if component is long

**Example - JSX Ratio:**
```typescript
// Component with 80 lines total, 60 lines JSX = 75% JSX ratio
// This is acceptable even though >50 lines
function ProductCard() {
  const [isOpen, setIsOpen] = useState(false); // 1 line logic
  
  return ( // 60 lines JSX
    <div>
      {/* lots of JSX */}
    </div>
  );
}
```

**Cyclomatic Complexity:**
- Max 10 branches per function (if/else, switch cases, ternaries, loops)
- **Measurement tool:** Use ESLint plugin: `eslint-plugin-complexity`
- **Not currently enforced** - manual review required
- If higher, extract conditional logic into separate functions
- Use early returns to reduce nesting

**How to Measure Complexity:**
```javascript
// Add to eslint.config.js to enforce
rules: {
  'complexity': ['error', 10] // max 10 branches
}
```

**Nesting Depth:**
- Max 3 levels of nesting
- Use early returns to flatten logic (called "guard clauses")
- Extract nested logic into helper functions

**Example - Guard Clauses Pattern:**
```typescript
// Bad - deep nesting
function processData(data: Data | null) {
  if (data) {
    if (data.isValid) {
      if (data.items.length > 0) {
        return data.items.map(item => item.value);
      }
    }
  }
  return [];
}

// Good - guard clauses (early returns)
function processData(data: Data | null) {
  if (!data) return [];
  if (!data.isValid) return [];
  if (data.items.length === 0) return [];
  return data.items.map(item => item.value);
}
```

### Magic Numbers Rule

**Definition:**
- Numbers **>10** should be extracted to named constants
- Numbers **≤10** are self-documenting and don't need constants
- Exception: `0`, `1`, `-1` are always self-documenting

**Examples:**
```typescript
// Bad - magic number >10
if (scans.length > 50) { /* ... */ }

// Good - named constant
const MAX_SCAN_HISTORY = 50;
if (scans.length > MAX_SCAN_HISTORY) { /* ... */ }

// Okay - small numbers are self-documenting
if (retryCount < 3) { /* ... */ }
const doubled = value * 2;
```

### Anti-Patterns to Avoid

❌ **Never commit code with ESLint errors** - fix them first  
❌ **Never use `any` type** - use `unknown` and narrow with type guards  
❌ **Never commit commented-out code** - delete it (git preserves history)  
❌ **Never use magic numbers >10** - extract to named constants  
❌ **Never write functions >50 lines** (unless >70% JSX) - extract helper functions  
❌ **Never nest >3 levels deep** - use guard clauses (early returns)  
❌ **Never ignore TypeScript errors** - fix them properly  
❌ **Never add Prettier to this project** - ESLint handles formatting  
❌ **Never use negative boolean names** - creates double negatives in conditionals  
❌ **Never create subdirectories with <3 files** - premature abstraction  
❌ **Never let TODOs accumulate** - resolve before committing  

---

## Development Workflow Rules

### Git & Repository Rules

**Branch Naming:**
- Feature branches: `feature/short-description` (e.g., `feature/camera-capture`)
- Bug fixes: `bugfix/issue-description` (e.g., `bugfix/camera-permission`)
- Hotfixes: `hotfix/critical-issue` (e.g., `hotfix/model-loading`)
- Main branch: `main` (default branch for production)
- Development branch: `develop` (if using GitFlow - currently not used)

**Commit Message Format:**
- Use conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Scope: component or feature area (e.g., `camera`, `ai`, `storage`)
- Description: imperative mood, lowercase, no period at end
- Examples:
  - `feat(camera): add file upload fallback`
  - `fix(ai): handle model loading timeout`
  - `docs(readme): update installation instructions`

**Pull Request Requirements:**
- All PRs require passing CI checks (lint, type-check, tests)
- PR title follows conventional commit format
- PR description includes: what changed, why, testing done
- Link related issues: `Closes #123` or `Fixes #456`
- Request review from at least one team member
- Squash commits on merge to keep history clean

### Build & Deployment

**Build Commands:**
- Development: `npm run dev` (Vite dev server on port 5173)
- Production build: `npm run build` (outputs to `dist/`)
- Preview production: `npm run preview` (serves `dist/` locally)
- Type check: `npm run type-check` (TypeScript compiler check)
- Lint: `npm run lint` (ESLint check)
- Lint fix: `npm run lint:fix` (ESLint autofix)
- Test: `npm run test` (Vitest unit tests)
- E2E: `npm run test:e2e` (Playwright E2E tests)

**Deployment Patterns:**
- PWA deploys to Cloudflare Pages (automatic on push to `main`)
- Worker deploys separately: `cd worker && npm run deploy`
- Environment variables set in Cloudflare dashboard
- Secrets managed via Wrangler: `wrangler secret put SECRET_NAME`

**Pre-Deployment Checklist:**
- [ ] All tests passing (`npm run test` and `npm run test:e2e`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Service worker updates tested locally
- [ ] Environment variables configured in Cloudflare

### Environment Management

**Environment Files:**
- `.env.local` - local development (gitignored)
- `.env.production` - production values (gitignored)
- `.env.example` - template with dummy values (committed)

**Environment Variables:**
- `VITE_API_URL` - Worker API endpoint
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (public)
- Worker secrets (not in .env): `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`

**Worker Environment Setup:**
- Worker has separate environment from PWA
- Set secrets: `cd worker && wrangler secret put SECRET_NAME`
- List secrets: `wrangler secret list`
- Never commit secrets to git - use Wrangler secrets only

### Development Best Practices

**Before Starting Work:**
1. Pull latest changes: `git pull origin main`
2. Create feature branch: `git checkout -b feature/description`
3. Install dependencies if package.json changed: `npm install`
4. Run dev server: `npm run dev`

**During Development:**
- Run tests in watch mode: `npm run test -- --watch`
- Check types frequently: `npm run type-check`
- Lint before committing: `npm run lint:fix`
- Test in multiple browsers (Chrome, Safari, Firefox)

**Before Committing:**
1. Run full test suite: `npm run test`
2. Fix all ESLint errors: `npm run lint:fix`
3. Fix all TypeScript errors: `npm run type-check`
4. Test production build: `npm run build && npm run preview`
5. Review changes: `git diff`
6. Stage changes: `git add .`
7. Commit with conventional format: `git commit -m "feat(scope): description"`

**Before Creating PR:**
1. Rebase on main: `git rebase main`
2. Run full CI locally: `npm run lint && npm run type-check && npm run test`
3. Test E2E: `npm run test:e2e`
4. Push branch: `git push origin feature/description`
5. Create PR with descriptive title and description

### Anti-Patterns to Avoid

❌ **Never commit directly to `main`** - always use feature branches  
❌ **Never skip tests before committing** - broken code blocks others  
❌ **Never commit with ESLint or TypeScript errors** - fix them first  
❌ **Never commit secrets or API keys** - use environment variables  
❌ **Never deploy without testing production build** - dev mode hides issues  
❌ **Never forget to update Worker separately** - it's a separate deployment  
❌ **Never use `git push --force` on shared branches** - destroys others' work  

---

## Critical Don't-Miss Rules

### Architecture-Specific Gotchas

**PWA + Worker Separation (CRITICAL):**
- PWA and Worker are **completely separate codebases** with separate node_modules
- Running `npm install` at root does NOT install Worker dependencies
- Must run: `cd worker && npm install` separately
- Agents importing Worker code into PWA will break the build
- Communication ONLY via HTTP API calls - never direct imports

**Worker Down Handling:**
- If Worker is unavailable, PWA shows error: "Service temporarily unavailable"
- No request queuing - user must retry manually
- Check Worker health on app load: `fetch('/api/health')`
- If health check fails, disable scan button and show maintenance message
- Implementation in `src/services/apiClient.ts`

**API Version Compatibility:**
- No formal API versioning currently implemented
- Breaking changes require coordinated deployment (Worker first, then PWA)
- Future: Add version header `X-API-Version: 1.0` to all requests
- Worker returns 400 if version mismatch detected
- PWA shows "Please refresh page" message on version mismatch

**Dual AI Pipeline Complexity:**
- Local CNN runs first (TensorFlow.js in browser)
- LLM fallback only if CNN confidence <70%
- Never skip CNN and go straight to LLM - wastes API credits
- Never run both in parallel - sequential pipeline is intentional

**CNN Failure Path (CRITICAL):**
- If CNN model fails to load: fall back to LLM immediately (skip CNN entirely)
- If CNN inference times out (>10 seconds): fall back to LLM
- If CNN throws error during inference: log error, fall back to LLM
- Show user message: "Using cloud analysis" (don't expose technical details)
- Implementation in `src/services/aiInference.ts`

**CNN Timeout Threshold:**
- CNN inference timeout: **10 seconds** (measured from model.predict() call)
- If exceeded, cancel inference and fall back to LLM
- Timeout implementation: `Promise.race([inference, timeout])`
- Log timeout events for monitoring: `errorTelemetry.logError('CNN timeout')`

**Bilingual RTL Support:**
- Arabic requires RTL layout - not just translated text
- CSS must handle both LTR (English) and RTL (Arabic)
- Use logical properties: `margin-inline-start` not `margin-left`
- Test all UI in both languages - layout breaks are common

**RTL Migration Strategy:**
- **New code:** Use logical properties only (`inline-start`, `inline-end`, `block-start`, `block-end`)
- **Existing code:** Convert on touch - don't do mass refactor
- **Third-party components:** Wrap in RTL-aware container with direction override
- **Testing:** Switch language in app settings and verify all pages

### Security Gotchas

**Supabase Key Confusion (SECURITY CRITICAL):**
- PWA uses anon key (public, safe to expose)
- Worker uses service role key (private, bypasses RLS)
- **Never use service role key in PWA** - exposes full database access
- **Never use anon key in Worker** - insufficient permissions for admin operations
- Service role key must be in Wrangler secrets, never in code

**Image Upload Security:**
- User-uploaded images are untrusted input
- Validate file type and size before processing
- Sharp in Worker validates images server-side
- Never trust client-side validation alone

**File Upload Limits (CONCRETE VALUES):**
- **Max file size:** 10MB (enforced client-side and server-side)
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`
- **Max dimensions:** 4096x4096 pixels (Sharp validation)
- Client validation in `src/utils/imageValidation.ts`
- Server validation in `worker/src/middleware/validateImage.ts`
- Return 413 Payload Too Large if exceeded

### Performance Gotchas

**TensorFlow.js Backend Detection:**
- WebGL backend is fastest but not guaranteed (iOS Safari issues)
- Must implement fallback: WebGL → WASM → CPU
- Never assume WebGL availability - causes silent failures
- Backend detection happens at runtime, not build time

**Backend Performance Implications:**
- **WebGL:** ~200ms inference time (baseline)
- **WASM:** ~800ms inference time (4x slower than WebGL)
- **CPU:** ~3000ms inference time (15x slower than WebGL)
- Show loading indicator if backend is WASM or CPU
- Log backend type for analytics: `analytics.track('inference_backend', { backend })`

**IndexedDB Quota Limits:**
- Browser storage quota varies by device (50MB - 10GB+)
- Model weights are ~30MB - can exceed quota on low-end devices
- Must implement quota checking before storing large files
- Fallback: delete old cached models or disable offline mode

**Model Deletion Strategy (When Quota Exceeded):**
1. Check available quota: `navigator.storage.estimate()`
2. If <50MB available, delete models in this order:
   - Oldest cached models first (by timestamp)
   - Keep current model version always
   - Delete max 2 old versions per cleanup
3. If still insufficient space, disable offline mode
4. Show user notification: "Storage full - offline mode disabled"
5. Implementation in `src/services/modelCache.ts`

**Service Worker Cache Invalidation:**
- Service worker caches aggressively - can serve stale assets
- Cache busting via versioning in `vite.config.ts`
- Users must manually update when prompted - no auto-reload
- Testing service worker updates requires hard refresh (Ctrl+Shift+R)

**Cache Versioning Mechanism:**
- Version set in `vite.config.ts`: `workbox.version = '1.0.0'`
- Increment version on every deployment (manual process)
- Service worker compares cached version to new version
- If different, triggers update prompt
- User clicks "Update" → `skipWaiting()` → `window.location.reload()`

### Data Persistence Gotchas

**localStorage Corruption:**
- `JSON.parse()` throws on corrupted data - crashes app
- Always wrap in try-catch with fallback to default values
- Quota exceeded errors are silent - check before writing
- Clear corrupted data, don't try to repair it

**Corruption Detection:**
- **Parse errors:** `JSON.parse()` throws `SyntaxError`
- **Type mismatches:** Parsed data doesn't match expected schema
- **Missing required fields:** Object missing critical properties
- **Invalid values:** Numbers are NaN, dates are invalid
- Validation pattern:
```typescript
try {
  const data = JSON.parse(stored);
  if (!isValidSchema(data)) throw new Error('Invalid schema');
  return data;
} catch {
  localStorage.removeItem(key);
  return defaultValue;
}
```

**IndexedDB Transaction Failures:**
- Transactions auto-commit if not kept alive
- Must keep transaction active with continuous operations
- Closing tab during transaction can corrupt database
- Implement transaction error handlers for all operations

**Transaction Timing:**
- Transactions stay alive for **~1 second** of inactivity
- Keep alive by chaining operations without delays
- Don't use `await` between operations in same transaction
- Pattern: `tx.objectStore().add().onsuccess = () => tx.objectStore().add()`
- If operations take >1 second, use multiple transactions

### Testing Gotchas

**jsdom Limitations:**
- No camera API - must mock `navigator.mediaDevices`
- No service worker API - must mock or skip tests
- No WebGL - TensorFlow.js tests require mocking
- No file system - Worker tests need different approach

**Playwright Browser Installation:**
- CI must run `npx playwright install chromium` before tests
- Browsers not included in npm package - separate download
- Missing browsers cause cryptic "Executable doesn't exist" errors
- Local development needs one-time setup

### Build & Deployment Gotchas

**Vite PWA Plugin Override:**
- package.json MUST have: `"vite-plugin-pwa": { "vite": "$vite" }`
- Without this override, `npm install` fails
- Agents modifying package.json must preserve this override
- This is a workaround for version compatibility issue

**Worker Bundle Size Limit:**
- Cloudflare Workers have 1MB bundle size limit
- Sharp adds ~500KB WASM - leaves only 500KB for code
- Must tree-shake unused code aggressively
- Large libraries (like full Supabase SDK) won't fit

**Tree-Shaking Strategies for Worker:**
- **Import only what you need:** `import { createClient } from '@supabase/supabase-js'` (not `import * as Supabase`)
- **Avoid Hono helpers:** Use native `Response` instead of `c.json()` when possible
- **Remove unused Sharp features:** Only import transforms you use
- **Check bundle size:** `npm run build` shows final size
- **If over 1MB:** Remove features or split into multiple Workers

**Separate Worker Deployment:**
- PWA deploys automatically on push to main (Cloudflare Pages)
- Worker must be deployed manually: `cd worker && npm run deploy`
- Forgetting Worker deployment breaks API calls
- Worker and PWA versions can get out of sync

### Edge Cases & Boundary Conditions

**Camera Permission Denied:**
- User can deny camera permission - app must handle gracefully
- Fallback to file upload input
- Show user-friendly message, not technical error
- Test on iOS Safari - permission flow is different

**Fallback Timing (SPECIFIC):**
- Show file upload fallback **immediately** on permission denial
- Don't retry or prompt again - respect user's choice
- Show message: "Camera unavailable - upload a photo instead"
- File input appears below message
- Implementation in `src/components/CameraCapture.tsx`

**Offline Mode Edge Cases:**
- User can go offline mid-scan - queue upload for later
- Model weights might not be cached - show appropriate error
- localStorage might be full - implement quota handling
- Service worker might not be registered - fallback to online-only

**Upload Queue Implementation:**
- Queue stored in **localStorage** (not IndexedDB - simpler for small data)
- Key: `upload_queue`, Value: JSON array of pending uploads
- Each item: `{ id, imageData, timestamp, retryCount }`
- Max queue size: 10 items (prevent localStorage overflow)
- Auto-upload on reconnection via `useOnlineStatus` hook
- Prevent duplicates: check `id` before uploading
- Implementation in `src/services/uploadQueue.ts`

**Bottle Handle Orientation (CRITICAL MISSING FEATURE):**
- **Issue:** PRD mandates handle on right side for valid analysis
- **Impact:** CNN model trained on this orientation only
- **Current state:** No validation or guidance in implementation
- **User impact:** Wrong orientation → low confidence scores → LLM fallback (costs money)
- **Severity:** **Enhancement, not blocker** - app works but accuracy suffers
- **Recommended fix:** Add visual overlay in viewfinder showing correct orientation
- **Story reference:** Consider adding Story 6.5 (Vision Guidance) or updating Story 1.5 (Viewfinder)

### Anti-Patterns to Avoid

❌ **Never import Worker code into PWA** - use API calls only  
❌ **Never skip CNN and go straight to LLM** - wastes API credits  
❌ **Never use service role key in PWA** - security vulnerability  
❌ **Never assume WebGL availability** - implement backend fallback  
❌ **Never use `JSON.parse()` without try-catch** - corrupted data crashes app  
❌ **Never forget to deploy Worker separately** - breaks API calls  
❌ **Never remove Vite PWA plugin override** - breaks npm install  
❌ **Never test only in Chrome** - Safari and Firefox have different behaviors  
❌ **Never assume localStorage has infinite space** - implement quota handling  
❌ **Never auto-reload on service worker update** - breaks user's work  
❌ **Never use `await` between IndexedDB operations in same transaction** - transaction times out  
❌ **Never exceed 1MB Worker bundle** - deployment fails  
❌ **Never deploy PWA without checking Worker is deployed** - API calls fail  
❌ **Never ignore CNN timeout** - user waits forever  

---


---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in this project
- Follow ALL rules exactly as documented - they prevent production bugs
- When in doubt, prefer the more restrictive option
- If you discover new patterns or gotchas, suggest adding them to this file

**For Humans:**
- Keep this file lean and focused on agent needs - remove obvious rules over time
- Update when technology stack changes or new patterns emerge
- Review quarterly to remove outdated rules and optimize for LLM context
- This file should contain only unobvious details that agents might miss

**Maintenance Schedule:**
- Update immediately when: technology versions change, new critical patterns discovered
- Review quarterly: remove rules that became obvious, optimize for clarity
- Archive old versions: keep history of what rules were needed at different project stages

**Last Updated:** 2026-04-17

---

_This project context was generated using the BMad Generate Project Context workflow. It captures 54 existing implementation patterns discovered across 10 completed epics and 54 stories in the Afia-App project._
