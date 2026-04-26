# Fix Environment on Windows

## Problem
Your node_modules is corrupted and files are locked by running processes.

## Step 1: Close Everything

**Close these if running:**
- VS Code (completely close, not just minimize)
- Any terminal windows
- Any browser tabs with localhost:5173 or dev server
- Task Manager → End any Node.js processes

## Step 2: Delete node_modules

**Option A: Windows Explorer (Easiest)**
1. Open File Explorer
2. Navigate to `D:\AI Projects\Freelance\Afia-App`
3. Right-click `node_modules` folder
4. Click "Delete"
5. If it says "file in use", restart your computer first

**Option B: Command Line (After closing everything)**
```cmd
rmdir /s /q node_modules
```

**Option C: PowerShell (If CMD fails)**
```powershell
Remove-Item -Recurse -Force node_modules
```

## Step 3: Clean Install

```cmd
npm ci
```

This reads `package-lock.json` and does a clean install.

## Step 4: Verify It Works

```cmd
npm run validate
```

Should now work without errors.

## Step 5: Install Husky

```cmd
npm install --save-dev husky lint-staged
npx husky init
echo npx lint-staged > .husky\pre-commit
```

## If Still Locked

**Nuclear Option: Restart Computer**
1. Save all work
2. Restart Windows
3. After restart, delete node_modules
4. Run `npm ci`

## Alternative: Skip Local Fix, Use CI

If you can't fix it now:
1. Commit your changes: `git add . && git commit -m "fix: resolve CI errors"`
2. Push: `git push`
3. Let CI validate (it has a clean environment)
4. Fix your local environment later

---

**Current Status:** Files locked by running processes. Close everything and try again.
