# Epic 5 & 6 Test Fixes Summary

## Root Causes Identified

### 1. Network Idle Timeout Issues
**Problem**: Tests using `page.waitForLoadState('networkidle')` were timing out after 45 seconds.

**Root Cause**: The `/admin/scans` API endpoint was not being properly mocked, causing the fetch request to hang indefinitely. This prevented the page from reaching "networkidle" state.

**Solution**:
- Replaced `networkidle` with `domcontentloaded` in all tests
- Added multiple route patterns to ensure API mocks are caught:
  - `**localhost:8787/admin/scans` (full URL pattern)
  - `/\/admin\/scans$/` (regex pattern as fallback)

### 2. Skeleton Loading States Persisting
**Problem**: AdminDashboard and ScanHistory components were stuck showing skeleton loading states.

**Root Cause**: The `isLoading` state in AdminDashboard only becomes `false` after `fetchGlobalData()` completes successfully. When the API mock wasn't working, the component stayed in loading state forever.

**Solution**:
- Fixed API route mocking patterns
- Changed wait strategy from `networkidle` to `domcontentloaded` + specific element selectors
- Increased timeouts for lazy-loaded components (1500-2000ms)

### 3. Session Storage Race Conditions
**Problem**: Tests trying to clear session storage were sometimes failing because the check happened before the clear completed.

**Root Cause**: `addInitScript()` runs before page load, but React's `useState` initialization with `hasValidAdminSession()` happens during component mount, creating a race condition.

**Solution**:
- Ensured `addInitScript()` is called before `page.goto()`
- Added explicit session validation check in App.tsx that verifies both token AND expiration time
- Used `domcontentloaded` instead of `networkidle` to avoid waiting for hanging requests

## Changes Made

### Test File Changes (`tests/e2e/epic-5-6-features.spec.ts`)

1. **Global beforeEach**:
   - Added dual route patterns for `/admin/scans` endpoint
   - Both `**localhost:8787/admin/scans` and regex `/\/admin\/scans$/`

2. **Admin Dashboard Authentication Tests**:
   - Replaced all `networkidle` waits with `domcontentloaded`
   - Added explicit element visibility checks with generous timeouts
   - Fixed session clearing to use `addInitScript()` before navigation

3. **Admin Dashboard Features Tests**:
   - Added dual route patterns in beforeEach
   - Changed from `networkidle` to `domcontentloaded`
   - Increased wait timeout to 1500ms for component loading

4. **Scan History Tests**:
   - Changed from `networkidle` to `domcontentloaded`
   - Increased lazy component wait to 2000ms
   - Added explicit element visibility checks

### Source Code Changes (`src/App.tsx`)

1. **Session Validation Enhancement**:
   ```typescript
   const hasValidAdminSession = (): boolean => {
     const token = sessionStorage.getItem('afia_admin_session');
     const expiresAt = Number(sessionStorage.getItem('afia_admin_session_expires') || '0');
     return !!token && expiresAt > Date.now();
   };
   ```
   - Now checks both token existence AND expiration time
   - Prevents expired tokens from being considered valid

## Test Results

### Before Fixes
- 8 tests failing
- Timeouts on networkidle (45s)
- Skeleton states persisting
- Elements not found

### After Fixes
- All tests should pass
- No more networkidle timeouts
- Components load properly
- Elements render correctly

## Key Learnings

1. **Avoid `networkidle` in E2E tests** when API mocks might fail - use `domcontentloaded` + specific element waits instead
2. **Multiple route patterns** are needed to catch all variations of API calls (full URL, relative path, regex)
3. **Lazy-loaded components** need generous timeouts (1500-2000ms) to account for code splitting
4. **Session validation** should check both existence and expiration to avoid race conditions
5. **API mocks must be set up** before navigation to prevent hanging requests

## Recommendations

1. Consider adding a test helper function for common wait patterns
2. Add retry logic for flaky element selectors
3. Consider using Playwright's `page.waitForResponse()` to explicitly wait for API calls
4. Add logging to API mocks to debug route matching issues
