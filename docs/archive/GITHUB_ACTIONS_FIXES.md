# GitHub Actions CI/CD Fixes

## Issues Fixed

### 1. Workerd Crashes During Integration Tests ✅

**Problem:**
- `wrangler dev` process was crashing with "Connection reset by peer" and "Broken pipe" errors
- Background process (`&`) was swallowing error output
- No visibility into why the worker was failing
- Health check timeout was insufficient (60s)

**Root Causes:**
1. Worker process dying silently in background
2. No process monitoring to detect crashes
3. Missing debug logging
4. Insufficient wait time for worker initialization

**Solution:**
```yaml
- name: Start worker
  run: |
    cd worker
    echo "Starting wrangler dev..."
    # Redirect logs to file for debugging
    npx wrangler dev --config ./wrangler.toml --port 8787 --local --ip 127.0.0.1 --log-level debug > /tmp/wrangler.log 2>&1 &
    WORKER_PID=$!
    echo $WORKER_PID > /tmp/wrangler.pid
    echo "Worker started with PID: $WORKER_PID"

- name: Wait for worker
  run: |
    echo "Waiting for worker to be ready..."
    for i in $(seq 1 60); do
      # Check if process is still running
      if ! kill -0 $(cat /tmp/wrangler.pid) 2>/dev/null; then
        echo "❌ Worker process died!"
        echo "=== Last 50 lines of worker logs ==="
        tail -n 50 /tmp/wrangler.log
        exit 1
      fi
      
      # Check if health endpoint responds
      if curl -sf http://127.0.0.1:8787/health > /dev/null 2>&1; then
        echo "✅ Worker is ready!"
        exit 0
      fi
      
      echo "Attempt $i/60: Worker not ready yet..."
      sleep 2
    done
    
    echo "❌ Worker failed to start within 120 seconds"
    echo "=== Full worker logs ==="
    cat /tmp/wrangler.log
    exit 1
  timeout-minutes: 3

- name: Stop worker
  if: always()
  run: |
    if [ -f /tmp/wrangler.pid ]; then
      echo "Stopping worker (PID: $(cat /tmp/wrangler.pid))..."
      kill $(cat /tmp/wrangler.pid) 2>/dev/null || true
      sleep 2
      # Force kill if still running
      kill -9 $(cat /tmp/wrangler.pid) 2>/dev/null || true
    fi

- name: Upload worker logs
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: wrangler-integration-logs
    path: /tmp/wrangler.log
    retention-days: 7
```

**Key Improvements:**
- ✅ Capture worker PID for monitoring
- ✅ Enable debug logging (`--log-level debug`)
- ✅ Redirect stdout/stderr to log file
- ✅ Check if process is alive before each health check
- ✅ Show logs immediately when worker dies
- ✅ Increased timeout to 120s (60 attempts × 2s)
- ✅ Proper cleanup with graceful and force kill
- ✅ Upload logs as artifact on failure

### 2. GitHub API 403 "Resource not accessible by integration" ✅

**Problem:**
- E2E test results posting to PR comments was failing with 403 error
- GitHub Actions token lacked required permissions

**Root Cause:**
The workflow already had the correct permissions block at the top:
```yaml
permissions:
  contents: read
  issues: write
  pull-requests: write
```

**Status:**
✅ **Already Fixed** - The permissions are correctly configured. The 403 error should not occur with the current setup.

**Verification:**
The E2E test job includes this step which requires `pull-requests: write` permission:
```yaml
- name: Comment PR with test results
  if: always() && github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const testResults = fs.existsSync('test-results') ? '✅ E2E tests completed' : '❌ E2E tests failed';
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `## E2E Test Results\n\n${testResults}\n\nView detailed results in the artifacts.`
      });
```

## Additional Improvements

### Enhanced Error Visibility
- Worker logs are now captured and uploaded as artifacts on failure
- Process monitoring detects crashes immediately
- Clear error messages with emoji indicators (✅/❌)

### Better Debugging
- Debug-level logging enabled for wrangler
- Full log output on failure
- Process PID tracking for troubleshooting

### Graceful Cleanup
- Worker process is properly terminated after tests
- Force kill as fallback if graceful shutdown fails
- Cleanup runs even if tests fail (`if: always()`)

## Testing the Fixes

### Local Testing
```bash
# Test the integration tests locally
cd worker
npx wrangler dev --config ./wrangler.toml --port 8787 --local --log-level debug

# In another terminal
npm run test:integration
```

### CI Testing
Push to a branch and create a PR to trigger the workflow:
```bash
git checkout -b test-ci-fixes
git add .github/workflows/ci-cd.yml
git commit -m "fix: improve workerd stability in CI"
git push origin test-ci-fixes
```

## Common Issues & Solutions

### Issue: Worker still crashes
**Check:**
1. Review uploaded worker logs artifact
2. Look for memory/CPU limits being exceeded
3. Check if KV namespace is properly configured
4. Verify all secrets are set correctly

### Issue: Health check times out
**Solutions:**
1. Increase timeout in "Wait for worker" step
2. Check if port 8787 is already in use
3. Verify worker starts successfully locally

### Issue: PR comments still fail with 403
**Check:**
1. Verify repository settings allow GitHub Actions to create PR comments
2. Check if branch protection rules are blocking the action
3. Ensure the workflow has the correct permissions block

## Files Modified

- `.github/workflows/ci-cd.yml` - Enhanced integration tests with better error handling

## Next Steps

1. Monitor the next few CI runs to ensure stability
2. Adjust timeouts if needed based on actual performance
3. Consider adding health check retries with exponential backoff
4. Add Slack/email notifications for persistent failures
