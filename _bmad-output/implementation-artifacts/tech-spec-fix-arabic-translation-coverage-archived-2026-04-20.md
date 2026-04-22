---
title: 'Fix Incomplete Arabic Translation Coverage Across Admin and User Pages'
slug: 'fix-arabic-translation-coverage'
created: '2026-04-19'
status: 'review'
stepsCompleted: [1, 2, 3]
tech_stack: ['React', 'TypeScript', 'react-i18next', 'Vite', 'Lucide Icons']
files_to_modify: ['src/components/AdminDashboard.tsx', 'src/components/BottleManager.tsx', 'src/components/QrMockGenerator.tsx', 'src/components/TestLab.tsx', 'src/components/ApiInspector.tsx', 'src/components/AdminToolsOverlay.tsx', 'src/components/QrLanding.tsx', 'src/components/ResultDisplay.tsx', 'src/components/FillConfirmScreen/FillConfirmScreen.tsx', 'src/components/ScanHistory.tsx']
code_patterns: ['useTranslation hook pattern', 't() function calls for translations', 'RTL detection via i18n.dir()', 'Conditional rendering based on i18n.language']
test_patterns: ['Manual testing via language toggle', 'Visual verification of RTL layout', 'Console error checking for missing keys']
---

# Tech-Spec: Fix Incomplete Arabic Translation Coverage Across Admin and User Pages

**Created:** 2026-04-19

## Overview

### Problem Statement

When Arabic language is selected via the language toggle, only the navigation bar displays Arabic text (mixed with some English titles). All other page content across both Admin and User interfaces remains in English, including:
- Admin Dashboard pages (Overview, Bottles, QR Codes, Export, Test Lab, API Inspector)
- User pages (QR Landing, Camera Viewfinder, Results Display, Fill Confirm, Scan History)

The i18n infrastructure is correctly configured and working for the navigation component, but hardcoded English strings throughout the application are not using the translation system.

### Solution

Systematically audit all components to identify hardcoded English text and replace with `t()` translation calls from react-i18next. All translation keys already exist in `src/i18n/locales/ar/translation.json`, so this is purely a code refactoring task to use existing translations consistently.

### Scope

**In Scope:**
- Replace hardcoded English strings with `t()` calls in all Admin Dashboard components
- Replace hardcoded English strings with `t()` calls in all User-facing components
- Ensure all buttons, labels, headings, descriptions, error messages, and UI text use translations
- Verify RTL layout applies correctly after translation fixes
- Test language switching between English and Arabic on all pages

**Out of Scope:**
- Adding new translation keys (all Arabic translations already exist)
- Modifying i18n configuration or setup (already working correctly)
- Changing language switcher functionality
- Adding new languages beyond English and Arabic
- Modifying component logic or functionality (only text replacement)

## Context for Development

### Codebase Patterns

**i18n Setup:**
- Configuration: `src/i18n/config.ts` - already properly configured with RTL detection
- Translation files: `src/i18n/locales/en/translation.json` and `src/i18n/locales/ar/translation.json`
- Hook usage: Components import `useTranslation` from 'react-i18next' and destructure `{ t }` or `{ t, i18n }`
- Translation call pattern: `t('key.path')` for simple strings, `t('key', { variable })` for interpolation

**Current Working Example (Navigation):**
```typescript
const { t } = useTranslation();
<span className="nav-label">{t('nav.scan')}</span>
```

**RTL Support:**
- CSS: `html[dir="rtl"]` selectors in `src/index.css`
- Direction set automatically by `setDirection()` in `src/i18n/config.ts`
- Components can check: `i18n.language === 'ar'` or `i18n.dir() === 'rtl'`

**Investigation Findings:**

**AdminDashboard.tsx** - Hardcoded strings found:
- Tab labels: "Overview", "Bottles", "QR Codes", "Export", "Test Lab", "API Inspector", "Failures"
- Metric labels: "Total Scans", "Total Consumed", "Scans (7 Days)", "Avg Fill %", "Avg Confidence"
- Table headers: "Date", "Bottle", "Fill %", "Consumed", "Confidence", "Reason", "Details"
- Pagination: "Previous", "Next", "Page X of Y"
- Empty states: "No scans yet", "Start scanning bottles to see analytics here", "Scan a Bottle"
- Status messages: "Loading...", "Error loading data"
- All translation keys exist in ar/translation.json under `admin.overview.*`, `admin.bottles.*`, etc.

**BottleManager.tsx** - Hardcoded strings found:
- Form labels: "Bottle Name", "SKU Code", "Capacity (ml)", "Brand", "Product Type"
- Buttons: "Add New Bottle", "Edit Bottle", "Delete Bottle", "Save", "Cancel"
- Search: "Search bottles..."
- Filters: "All", "Built-in", "Custom"
- Validation messages: "Please fill all required fields"
- All keys exist under `admin.bottles.*`

**QrMockGenerator.tsx** - Hardcoded strings found:
- Titles: "QR Code Generator", "Generate Test QR"
- Form fields: "Bottle ID", "Fill Level", "Batch Number"
- Buttons: "Generate QR", "Download", "Print"
- Status: "Generating...", "Ready"
- All keys exist under `admin.qr.*`

**TestLab.tsx** - Hardcoded strings found:
- Instructions: "Test the scanning flow", "Capture a photo to test AI analysis"
- Buttons: "Start Test Scan", "Capture Photo", "Reset"
- Status: "Analyzing with AI...", "Ready for new test", "Test complete"
- All keys exist under `admin.testLab.*`

**ApiInspector.tsx** - Hardcoded strings found:
- Labels: "API Inspector", "Quick Fire Test", "Endpoint", "Method", "Headers"
- Buttons: "Send Request", "Clear", "Copy Response"
- Status: "Sending request...", "Request failed", "Success"
- All keys exist under `admin.api.*`

**AdminToolsOverlay.tsx** - Hardcoded strings found:
- Form labels: "Test Result", "Bottle ID", "Fill Level", "Confidence Score"
- Metrics: "Response Time", "AI Provider", "Model Version"
- Buttons: "Save Test Result", "Copy JSON", "Close"
- All keys exist under `admin.tools.*`

**QrLanding.tsx** - Hardcoded strings found:
- Headings: "Scan Your Bottle", "How It Works"
- Instructions: "Point your camera at the QR code", "Hold steady for best results"
- Buttons: "Start Scanning", "View History"
- All keys exist under `scan.*`

**ResultDisplay.tsx** - Hardcoded strings found:
- Labels: "Scan Results", "Fill Level", "Bottle Information", "Nutrition Facts"
- Buttons: "Scan Again", "View Details", "Share"
- Status: "Analyzing...", "Scan Complete"
- All keys exist under `results.*`

**FillConfirmScreen.tsx** - Hardcoded strings found:
- Headings: "Confirm Fill Level", "Adjust if needed"
- Slider labels: "Empty", "Full", "Current: X%"
- Buttons: "Confirm", "Rescan", "Cancel"
- All keys exist under `fillConfirm.*`

**ScanHistory.tsx** - Hardcoded strings found:
- Headers: "Scan History", "Recent Scans", "All Time"
- Filters: "Today", "This Week", "This Month", "All"
- Empty state: "No scans yet", "Start scanning to build your history"
- All keys exist under `history.*`

**Pattern Observed:**
- All components already import `useTranslation` hook
- Most components destructure `{ t }` but don't use it consistently
- Some components use `t()` for some strings but have hardcoded English for others
- All required translation keys already exist in `ar/translation.json`
- No new translation keys need to be created
- Simple find-and-replace pattern: hardcoded string → `t('existing.key')`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/i18n/locales/en/translation.json` | English translation keys (reference for structure) |
| `src/i18n/locales/ar/translation.json` | Arabic translations (all keys already exist) |
| `src/App.tsx` | Navigation component - working example of translations |
| `src/components/AdminDashboard.tsx` | Main admin component - needs translation fixes |
| `src/components/BottleManager.tsx` | Bottle management - form labels, buttons, search |
| `src/components/QrMockGenerator.tsx` | QR generator - all UI text needs translation |
| `src/components/TestLab.tsx` | Test lab - instructions and buttons |
| `src/components/ApiInspector.tsx` | API inspector - labels and descriptions |
| `src/components/AdminToolsOverlay.tsx` | Admin tools - validation form, metrics |
| `src/components/QrLanding.tsx` | User landing page content |
| `src/components/ResultDisplay.tsx` | Results screen |
| `src/components/FillConfirmScreen/FillConfirmScreen.tsx` | Confirmation UI |
| `src/components/ScanHistory.tsx` | History list |

### Technical Decisions

1. **Use existing translation keys** - Do not create new keys; all required translations exist
2. **Import pattern** - Add `import { useTranslation } from 'react-i18next';` if missing
3. **Hook placement** - Call `const { t } = useTranslation();` at component top level
4. **Preserve functionality** - Only replace text strings; do not modify component logic
5. **Test both directions** - Verify English and Arabic display correctly after changes
6. **RTL verification** - Check layout, icons, and text direction in Arabic mode
7. **Systematic approach** - Prioritize by user visibility (Admin Dashboard Overview first)

## Implementation Plan

### Tasks

#### Task 1: Fix AdminDashboard.tsx Translation Coverage

- [ ] **File:** `src/components/AdminDashboard.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Tab labels: Replace `"Overview"` → `t('admin.tabs.overview')`, `"Bottles"` → `t('admin.tabs.bottles')`, `"QR Codes"` → `t('admin.tabs.qrCodes')`, `"Export"` → `t('admin.tabs.export')`, `"Test Lab"` → `t('admin.tabs.testLab')`, `"API Inspector"` → `t('admin.tabs.apiInspector')`, `"Failures"` → `t('admin.tabs.failures')`
  - Metric labels in OverviewTab: `"Total Scans"` → `t('admin.overview.totalScans')`, `"Total Consumed"` → `t('admin.overview.totalConsumed')`, `"Scans (7 Days)"` → `t('admin.overview.scans7Days')`, `"Avg Fill %"` → `t('admin.overview.avgFill')`, `"Avg Confidence"` → `t('admin.overview.avgConfidence')`
  - Table headers: `"Date"` → `t('admin.overview.table.date')`, `"Bottle"` → `t('admin.overview.table.bottle')`, `"Fill %"` → `t('admin.overview.table.fill')`, `"Consumed"` → `t('admin.overview.table.consumed')`, `"Confidence"` → `t('admin.overview.table.confidence')`
  - Pagination: `"Previous"` → `t('admin.overview.pagination.previous')`, `"Next"` → `t('admin.overview.pagination.next')`, `"Page {current} of {total}"` → `t('admin.overview.pagination.pageOf', { current, total })`
  - Empty states: `"No scans yet"` → `t('admin.overview.emptyTitle')`, `"Start scanning bottles to see analytics here"` → `t('admin.overview.emptyDescription')`, `"Scan a Bottle"` → `t('admin.overview.emptyCta')`
  - FailuresTab: `"Camera Guidance Rejections"` → `t('admin.failures.title')`, `"Reason"` → `t('admin.failures.reason')`, `"Details"` → `t('admin.failures.details')`
- [ ] **Notes:** Component already has `useTranslation` imported; verify `isRTL` is used for date formatting

#### Task 2: Fix BottleManager.tsx Translation Coverage

- [ ] **File:** `src/components/BottleManager.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Form labels: `"Bottle Name"` → `t('admin.bottles.form.name')`, `"SKU Code"` → `t('admin.bottles.form.sku')`, `"Capacity (ml)"` → `t('admin.bottles.form.capacity')`, `"Brand"` → `t('admin.bottles.form.brand')`, `"Product Type"` → `t('admin.bottles.form.productType')`
  - Buttons: `"Add New Bottle"` → `t('admin.bottles.addNew')`, `"Edit Bottle"` → `t('admin.bottles.edit')`, `"Delete Bottle"` → `t('admin.bottles.delete')`, `"Save"` → `t('admin.bottles.save')`, `"Cancel"` → `t('admin.bottles.cancel')`
  - Search: `"Search bottles..."` → `t('admin.bottles.searchPlaceholder')`
  - Filters: `"All"` → `t('admin.bottles.filter.all')`, `"Built-in"` → `t('admin.bottles.filter.builtin')`, `"Custom"` → `t('admin.bottles.filter.custom')`
  - Validation: `"Please fill all required fields"` → `t('admin.bottles.validation.required')`
- [ ] **Notes:** Ensure form validation messages use translation keys

#### Task 3: Fix QrMockGenerator.tsx Translation Coverage

- [ ] **File:** `src/components/QrMockGenerator.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Titles: `"QR Code Generator"` → `t('admin.qr.title')`, `"Generate Test QR"` → `t('admin.qr.generateTest')`
  - Form fields: `"Bottle ID"` → `t('admin.qr.form.bottleId')`, `"Fill Level"` → `t('admin.qr.form.fillLevel')`, `"Batch Number"` → `t('admin.qr.form.batchNumber')`
  - Buttons: `"Generate QR"` → `t('admin.qr.generate')`, `"Download"` → `t('admin.qr.download')`, `"Print"` → `t('admin.qr.print')`
  - Status: `"Generating..."` → `t('admin.qr.status.generating')`, `"Ready"` → `t('admin.qr.status.ready')`
- [ ] **Notes:** Check if component needs `useTranslation` import added

#### Task 4: Fix TestLab.tsx Translation Coverage

- [ ] **File:** `src/components/TestLab.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Instructions: `"Test the scanning flow"` → `t('admin.testLab.instructions')`, `"Capture a photo to test AI analysis"` → `t('admin.testLab.captureInstructions')`
  - Buttons: `"Start Test Scan"` → `t('admin.testLab.startTest')`, `"Capture Photo"` → `t('admin.testLab.capture')`, `"Reset"` → `t('admin.testLab.reset')`
  - Status: `"Analyzing with AI..."` → `t('admin.testLab.status.analyzing')`, `"Ready for new test"` → `t('admin.testLab.status.ready')`, `"Test complete"` → `t('admin.testLab.status.complete')`
- [ ] **Notes:** Verify camera permission messages are also translated

#### Task 5: Fix ApiInspector.tsx Translation Coverage

- [ ] **File:** `src/components/ApiInspector.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Labels: `"API Inspector"` → `t('admin.api.title')`, `"Quick Fire Test"` → `t('admin.api.quickTest')`, `"Endpoint"` → `t('admin.api.endpoint')`, `"Method"` → `t('admin.api.method')`, `"Headers"` → `t('admin.api.headers')`
  - Buttons: `"Send Request"` → `t('admin.api.send')`, `"Clear"` → `t('admin.api.clear')`, `"Copy Response"` → `t('admin.api.copyResponse')`
  - Status: `"Sending request..."` → `t('admin.api.status.sending')`, `"Request failed"` → `t('admin.api.status.failed')`, `"Success"` → `t('admin.api.status.success')`
- [ ] **Notes:** Ensure JSON response display remains untranslated

#### Task 6: Fix AdminToolsOverlay.tsx Translation Coverage

- [ ] **File:** `src/components/AdminToolsOverlay.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Form labels: `"Test Result"` → `t('admin.tools.testResult')`, `"Bottle ID"` → `t('admin.tools.bottleId')`, `"Fill Level"` → `t('admin.tools.fillLevel')`, `"Confidence Score"` → `t('admin.tools.confidence')`
  - Metrics: `"Response Time"` → `t('admin.tools.responseTime')`, `"AI Provider"` → `t('admin.tools.aiProvider')`, `"Model Version"` → `t('admin.tools.modelVersion')`
  - Buttons: `"Save Test Result"` → `t('admin.tools.save')`, `"Copy JSON"` → `t('admin.tools.copyJson')`, `"Close"` → `t('admin.tools.close')`
- [ ] **Notes:** Check if overlay needs RTL positioning adjustments

#### Task 7: Fix QrLanding.tsx Translation Coverage

- [ ] **File:** `src/components/QrLanding.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Headings: `"Scan Your Bottle"` → `t('scan.title')`, `"How It Works"` → `t('scan.howItWorks')`
  - Instructions: `"Point your camera at the QR code"` → `t('scan.instructions.point')`, `"Hold steady for best results"` → `t('scan.instructions.holdSteady')`
  - Buttons: `"Start Scanning"` → `t('scan.startButton')`, `"View History"` → `t('scan.viewHistory')`
- [ ] **Notes:** Verify camera permission prompts are translated

#### Task 8: Fix ResultDisplay.tsx Translation Coverage

- [ ] **File:** `src/components/ResultDisplay.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Labels: `"Scan Results"` → `t('results.title')`, `"Fill Level"` → `t('results.fillLevel')`, `"Bottle Information"` → `t('results.bottleInfo')`, `"Nutrition Facts"` → `t('results.nutritionFacts')`
  - Buttons: `"Scan Again"` → `t('results.scanAgain')`, `"View Details"` → `t('results.viewDetails')`, `"Share"` → `t('results.share')`
  - Status: `"Analyzing..."` → `t('results.status.analyzing')`, `"Scan Complete"` → `t('results.status.complete')`
- [ ] **Notes:** Ensure nutrition facts labels are also translated

#### Task 9: Fix FillConfirmScreen.tsx Translation Coverage

- [ ] **File:** `src/components/FillConfirmScreen/FillConfirmScreen.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Headings: `"Confirm Fill Level"` → `t('fillConfirm.title')`, `"Adjust if needed"` → `t('fillConfirm.subtitle')`
  - Slider labels: `"Empty"` → `t('fillConfirm.slider.empty')`, `"Full"` → `t('fillConfirm.slider.full')`, `"Current: {percent}%"` → `t('fillConfirm.slider.current', { percent })`
  - Buttons: `"Confirm"` → `t('fillConfirm.confirm')`, `"Rescan"` → `t('fillConfirm.rescan')`, `"Cancel"` → `t('fillConfirm.cancel')`
- [ ] **Notes:** Verify slider interaction works correctly in RTL mode

#### Task 10: Fix ScanHistory.tsx Translation Coverage

- [ ] **File:** `src/components/ScanHistory.tsx`
- [ ] **Action:** Replace all hardcoded English strings with `t()` calls
- [ ] **Specific Changes:**
  - Headers: `"Scan History"` → `t('history.title')`, `"Recent Scans"` → `t('history.recent')`, `"All Time"` → `t('history.allTime')`
  - Filters: `"Today"` → `t('history.filter.today')`, `"This Week"` → `t('history.filter.thisWeek')`, `"This Month"` → `t('history.filter.thisMonth')`, `"All"` → `t('history.filter.all')`
  - Empty state: `"No scans yet"` → `t('history.emptyTitle')`, `"Start scanning to build your history"` → `t('history.emptyDescription')`
- [ ] **Notes:** Ensure date formatting uses locale-aware formatting (isRTL check)

### Acceptance Criteria

**AC1: Admin Dashboard Overview - Complete Arabic Translation**
- **Given** the user switches to Arabic language
- **When** viewing the Admin Dashboard Overview tab
- **Then** all metrics (Total Scans, Total Consumed, Scans 7 Days, Avg Fill %, Avg Confidence) display in Arabic
- **And** all table headers (Date, Bottle, Fill %, Consumed, Confidence) display in Arabic
- **And** pagination controls (Previous, Next, Page X of Y) display in Arabic
- **And** empty state messages display in Arabic
- **And** no English text remains visible

**AC2: Admin Bottles Tab - Complete Arabic Translation**
- **Given** the user switches to Arabic language
- **When** viewing the Admin Bottles tab
- **Then** all form labels (Bottle Name, SKU Code, Capacity, Brand, Product Type) display in Arabic
- **And** all buttons (Add New Bottle, Edit, Delete, Save, Cancel) display in Arabic
- **And** search placeholder displays in Arabic
- **And** filter options (All, Built-in, Custom) display in Arabic
- **And** validation messages display in Arabic

**AC3: Admin QR Codes, Export, Test Lab, API Inspector Tabs - Complete Arabic Translation**
- **Given** the user switches to Arabic language
- **When** viewing any of these admin tabs
- **Then** all titles, labels, instructions, and buttons display in Arabic
- **And** all status messages display in Arabic
- **And** no English text remains visible

**AC4: User Pages - Complete Arabic Translation**
- **Given** the user switches to Arabic language
- **When** viewing any user page (Scan, History, Results, Fill Confirm)
- **Then** all headings, instructions, labels, and buttons display in Arabic
- **And** empty states display in Arabic
- **And** no English text remains visible

**AC5: Bidirectional Language Switching**
- **Given** the user is viewing any page in Arabic
- **When** the user switches back to English via the language toggle
- **Then** all text immediately returns to English
- **And** no Arabic text remains visible
- **And** the page layout adjusts from RTL to LTR

**AC6: No Mixed Language States**
- **Given** the user switches between English and Arabic
- **When** viewing any page or component
- **Then** all text is consistently in the selected language
- **And** no page shows mixed English/Arabic text
- **And** navigation bar language matches page content language

**AC7: RTL Layout Integrity**
- **Given** the user switches to Arabic language
- **When** viewing any page
- **Then** text alignment is right-to-left
- **And** buttons and controls are positioned correctly for RTL
- **And** table columns flow from right to left
- **And** no text overflow or truncation occurs
- **And** icons that should mirror (arrows, chevrons) are flipped correctly

**AC8: Date and Number Formatting**
- **Given** the user switches to Arabic language
- **When** viewing dates in tables or history
- **Then** dates are formatted using Arabic locale (ar-SA)
- **And** numbers display correctly for the Arabic locale
- **And** when switching back to English, dates use English locale (en-US)

**AC9: No Console Errors**
- **Given** the user switches between languages
- **When** viewing any page
- **Then** no missing translation key warnings appear in console
- **And** no i18n errors appear in console
- **And** no React errors or warnings appear

**AC10: Navigation Consistency Maintained**
- **Given** the navigation bar already works correctly with translations
- **When** the user switches languages
- **Then** navigation continues to work as before
- **And** all other pages match navigation's translation quality
- **And** active tab highlighting works correctly

### Dependencies

**External Libraries:**
- react-i18next (already installed and configured)
- i18next (already installed and configured)
- No additional dependencies required

**Translation Files:**
- `src/i18n/locales/en/translation.json` - English translations (reference)
- `src/i18n/locales/ar/translation.json` - Arabic translations (all keys exist)

**Configuration:**
- `src/i18n/config.ts` - i18n configuration (already working correctly)

**Other Dependencies:**
- None - all translation keys already exist
- No API changes required
- No database changes required
- No backend changes required

### Testing Strategy

**Manual Testing:**
1. **Language Toggle Test**
   - Start application in English
   - Navigate to Admin Dashboard Overview
   - Switch to Arabic via language toggle
   - Verify all text displays in Arabic
   - Switch back to English
   - Verify all text returns to English
   - Repeat for all admin tabs and user pages

2. **RTL Layout Test**
   - Switch to Arabic language
   - Check text alignment (should be right-to-left)
   - Check button positioning (should mirror)
   - Check table column order (should flow right-to-left)
   - Check icon direction (arrows/chevrons should flip)
   - Check modal/overlay positioning
   - Verify no text overflow or truncation

3. **Component-by-Component Test**
   - Admin Dashboard Overview: Verify metrics, tables, pagination
   - Admin Bottles: Verify forms, buttons, search, filters
   - Admin QR Codes: Verify all UI elements
   - Admin Export: Verify all UI elements
   - Admin Test Lab: Verify instructions, buttons, status
   - Admin API Inspector: Verify labels, buttons, status
   - User Scan: Verify landing page, instructions, buttons
   - User History: Verify headers, filters, empty states
   - User Results: Verify labels, buttons, nutrition facts
   - User Fill Confirm: Verify slider, buttons, labels

4. **Edge Cases Test**
   - Empty states (no data) - verify Arabic messages
   - Error states - verify Arabic error messages
   - Loading states - verify Arabic loading messages
   - Long Arabic text - verify no overflow
   - Date formatting - verify Arabic locale (ar-SA)

**Console Verification:**
- Open browser DevTools console
- Switch between languages
- Verify no missing translation key warnings
- Verify no i18n errors
- Verify no React errors or warnings

**Browser Testing:**
- Test in Chrome (primary)
- Test in Firefox (secondary)
- Test in Safari (if available)
- Test on mobile viewport (responsive)

**No Automated Tests Required:**
- This is a UI translation task
- Manual visual verification is sufficient
- No unit tests needed (translation keys are static)
- No integration tests needed (i18n library handles logic)

### Notes

**High-Risk Items:**
- **Text Overflow:** Arabic text can be longer than English - verify button widths and container sizes accommodate Arabic text without truncation
- **RTL Layout Breaks:** Some CSS may not handle RTL correctly - test all layouts thoroughly in Arabic mode
- **Date Formatting:** Ensure `isRTL` variable is used consistently for locale-aware date formatting
- **Interpolation:** Some translation keys use variables (e.g., `{current}`, `{total}`) - verify these work correctly

**Known Limitations:**
- JSON response data in API Inspector will remain in English (technical data, not UI text)
- Console logs and error stack traces will remain in English (developer-facing)
- Image alt text may need separate handling if images contain text

**Future Considerations (Out of Scope):**
- Adding more languages beyond English and Arabic
- Translating dynamic content from database (bottle names, descriptions)
- Translating error messages from backend API
- Adding language-specific number formatting (Arabic numerals vs Western numerals)
- Implementing language persistence (localStorage/cookies)

**Implementation Notes:**
- All components already import `useTranslation` - no new imports needed
- All translation keys already exist - no new keys to add
- Pattern is consistent: replace `"English String"` with `t('translation.key')`
- Use existing `isRTL` variable for locale-aware formatting
- Test each component after changes before moving to next

**Rollback Plan:**
- If issues arise, changes can be reverted file-by-file
- Each component is independent - no cascading dependencies
- Git history will show exact changes for easy rollback
- No database migrations or API changes to rollback
