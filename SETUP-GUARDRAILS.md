# CI/CD Error Prevention Setup

## Problem
Errors keep slipping through to CI because local development environment doesn't match CI configuration.

## Root Causes Identified
1. **Configuration drift** - Local ESLint/TypeScript config differs from CI
2. **No pre-commit validation** - Bad code reaches the branch without checks
3. **Missing IDE enforcement** - Errors not surfaced in real-time during development

## Solution: Three-Layer Defense

### Layer 1: IDE Real-Time Feedback (Immediate)
**Status:** ✅ Configured

VS Code settings added (`.vscode/settings.json`):
- ESLint auto-fix on save
- TypeScript strict mode warnings in editor
- Consistent formatting rules

**Action Required:** Reload VS Code window to apply settings

### Layer 2: Pre-Commit Hooks (Short-term)
**Status:** ⚠️ Needs Manual Installation

Install husky and lint-staged:

```bash
# Close any running dev servers first
npm install --save-dev husky lint-staged

# The prepare script will automatically set up husky
# Create pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

**What it does:**
- Runs `eslint --fix --max-warnings 0` on staged files
- Runs `tsc --noEmit` to check types
- Blocks commit if errors exist

**Configuration:** `.lintstagedrc.json` (already created)

### Layer 3: New npm Scripts (Sustainable)
**Status:** ✅ Added to package.json

New commands available:
- `npm run lint:fix` - Auto-fix linting errors
- `npm run type-check` - Check TypeScript without building
- `npm run validate` - Run both lint and type-check (use before pushing)

## Immediate Action Plan

### 1. Fix Current Errors (Done ✅)
All type errors and lint warnings have been fixed:
- ✅ Fixed `any` types in test files
- ✅ Fixed `any` types in hooks
- ✅ Fixed i18n type signature in CupVisualization
- ✅ Fixed React Hook dependency warnings

### 2. Install Pre-Commit Hooks (Do Now)
```bash
# Stop any running processes (dev server, tests)
# Then run:
npm install --save-dev husky lint-staged
# The prepare script will automatically set up husky during install
echo "npx lint-staged" > .husky/pre-commit
```

### 3. Verify Setup (Test It)
```bash
# This should pass now
npm run validate

# Try to commit - hooks should run automatically
git add .
git commit -m "test: verify pre-commit hooks"
```

## Expected Behavior After Setup

### Before Commit:
1. You save a file → ESLint auto-fixes it
2. TypeScript errors show in VS Code immediately
3. You try to commit → Pre-commit hook runs
4. If errors exist → Commit blocked with clear error message
5. You fix errors → Commit succeeds

### In CI:
- Same checks run, but now they should always pass
- No more surprises in CI pipeline

## Troubleshooting

### "Husky install failed"
- Make sure you're in the project root
- Check that `.git` folder exists
- The `prepare` script runs automatically during `npm install`
- If needed, run `npm run prepare` manually

### "Pre-commit hook not running"
- Check `.husky/pre-commit` exists and is executable
- On Windows, ensure Git Bash is configured
- Try: `git config core.hooksPath .husky`

### "Type check is slow"
- This is normal for first run
- Subsequent runs use incremental compilation
- Consider running `npm run lint` only in pre-commit if too slow

## Files Created/Modified

- ✅ `.vscode/settings.json` - IDE configuration
- ✅ `.lintstagedrc.json` - Pre-commit hook configuration
- ✅ `package.json` - Added new scripts
- ⚠️ `.husky/pre-commit` - Needs manual creation (see step 2)

## Next Steps

1. **Install hooks** (5 minutes)
2. **Test locally** - Try committing a file with an error
3. **Push to CI** - Should pass now
4. **Document for team** - Share this setup with other developers
