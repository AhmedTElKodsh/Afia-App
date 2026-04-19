# Troubleshooting Model Loading Issues

This guide helps diagnose and resolve common issues with local model loading in the Afia Oil Tracker PWA.

## Quick Diagnostics

### Check Model Loading Status

Open browser DevTools Console and look for these log messages:

**Success:**
```
[ModelLoader] Loading from IndexedDB cache
[ModelLoader] Model loaded successfully on backend: webgl
```

**Failure:**
```
[ModelLoader] Failed to read from IndexedDB: ...
[ModelLoader] Download attempt 1/3 failed: ...
[ErrorTelemetry] model_loading: { type: 'Error', message: '...' }
```

### Check IndexedDB

1. Open DevTools → Application → Storage → IndexedDB
2. Look for database: `afia-models`
3. Check object store: `models`
4. Verify entry with version: `1.0.0`

### Check Network

1. Open DevTools → Network tab
2. Filter by: `model.json`
3. Look for request to: `https://pub-models.afia.app/models/fill-regressor/v1.0.0/model.json`
4. Check status code (should be 200)

## Common Issues

### Issue 1: Model Download Fails

**Symptoms:**
- Error: "Model download failed after 3 retries"
- Network tab shows 404 or 500 errors
- Analysis falls back to LLM every time

**Causes:**
- Model not deployed to R2
- Incorrect model URL
- Network connectivity issues
- CORS misconfiguration

**Solutions:**

1. **Verify Model Deployment:**
   ```bash
   curl -I https://pub-models.afia.app/models/fill-regressor/v1.0.0/model.json
   ```
   Should return `200 OK`

2. **Check CORS Headers:**
   ```bash
   curl -H "Origin: https://afia.app" -I https://pub-models.afia.app/models/fill-regressor/v1.0.0/model.json
   ```
   Should include:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, HEAD
   ```

3. **Test Network Connectivity:**
   - Try accessing model URL in browser
   - Check if behind corporate firewall
   - Verify DNS resolution

4. **Clear Cache and Retry:**
   ```javascript
   // In DevTools Console
   indexedDB.deleteDatabase('afia-models');
   location.reload();
   ```

### Issue 2: IndexedDB Quota Exceeded

**Symptoms:**
- Error: "IndexedDB quota exceeded"
- Model downloads but doesn't cache
- Works on first load, fails on subsequent loads

**Causes:**
- Storage quota full (usually 50-100MB on mobile)
- Multiple model versions cached
- Other apps using storage

**Solutions:**

1. **Check Storage Usage:**
   ```javascript
   // In DevTools Console
   navigator.storage.estimate().then(estimate => {
     console.log(`Used: ${estimate.usage / 1024 / 1024} MB`);
     console.log(`Quota: ${estimate.quota / 1024 / 1024} MB`);
   });
   ```

2. **Clear Old Models:**
   ```javascript
   // In DevTools Console
   const db = await indexedDB.open('afia-models', 1);
   const tx = db.transaction('models', 'readwrite');
   const store = tx.objectStore('models');
   await store.clear();
   ```

3. **Request Persistent Storage:**
   ```javascript
   // In DevTools Console
   navigator.storage.persist().then(granted => {
     console.log('Persistent storage:', granted);
   });
   ```

4. **Reduce Storage Usage:**
   - Clear browser cache
   - Remove unused PWAs
   - Free up device storage

### Issue 3: Model Parse Error

**Symptoms:**
- Error: "Invalid model format"
- Model downloads successfully but fails to load
- Cache cleared automatically

**Causes:**
- Corrupt model file
- Incomplete download
- Model format incompatible with TF.js version

**Solutions:**

1. **Verify Model Integrity:**
   ```bash
   # Download model locally
   curl -o model.json https://pub-models.afia.app/models/fill-regressor/v1.0.0/model.json
   
   # Check file size (should be ~500KB)
   ls -lh model.json
   
   # Validate JSON
   python -m json.tool model.json > /dev/null
   ```

2. **Check TF.js Version:**
   ```javascript
   // In DevTools Console
   console.log('TF.js version:', tf.version);
   ```
   Should be `4.17.0` or compatible

3. **Re-export Model:**
   ```python
   # In model training script
   import tensorflowjs as tfjs
   tfjs.converters.save_keras_model(model, 'models/fill-regressor/v1.0.0')
   ```

4. **Clear Cache and Retry:**
   ```javascript
   indexedDB.deleteDatabase('afia-models');
   location.reload();
   ```

### Issue 4: WebGL Backend Fails

**Symptoms:**
- Warning: "WebGL backend not available, using fallback"
- Inference slower than expected (> 200ms)
- Works but performance degraded

**Causes:**
- WebGL not supported on device
- WebGL disabled in browser settings
- GPU blacklisted
- Too many WebGL contexts

**Solutions:**

1. **Check WebGL Support:**
   ```javascript
   // In DevTools Console
   const canvas = document.createElement('canvas');
   const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
   console.log('WebGL supported:', !!gl);
   ```

2. **Enable WebGL in Browser:**
   - Chrome: `chrome://flags/#ignore-gpu-blocklist`
   - Firefox: `about:config` → `webgl.disabled` → `false`
   - Safari: Preferences → Advanced → Show Develop menu → Develop → Experimental Features → WebGL

3. **Check GPU Status:**
   - Chrome: `chrome://gpu`
   - Look for "WebGL: Hardware accelerated"

4. **Reduce WebGL Context Usage:**
   - Close other tabs using WebGL
   - Disable browser extensions using GPU
   - Restart browser

### Issue 5: Inference Timeout

**Symptoms:**
- Error: "Image preprocessing timeout: failed to load image"
- Analysis hangs for 5+ seconds
- Eventually falls back to LLM

**Causes:**
- Invalid image data
- Corrupt base64 encoding
- Image too large
- Browser memory pressure

**Causes:**
- Invalid image data
- Corrupt base64 encoding
- Image too large
- Browser memory pressure

**Solutions:**

1. **Validate Image Data:**
   ```javascript
   // In DevTools Console
   const img = new Image();
   img.onload = () => console.log('Image valid:', img.width, 'x', img.height);
   img.onerror = () => console.error('Image invalid');
   img.src = 'data:image/jpeg;base64,...'; // Your base64 data
   ```

2. **Check Image Size:**
   ```javascript
   // In DevTools Console
   const base64 = 'data:image/jpeg;base64,...';
   const sizeKB = (base64.length * 3 / 4) / 1024;
   console.log('Image size:', sizeKB, 'KB');
   ```
   Should be < 5MB

3. **Reduce Image Quality:**
   ```javascript
   // In capture code
   canvas.toDataURL('image/jpeg', 0.8); // 80% quality
   ```

4. **Check Memory Usage:**
   - Chrome: DevTools → Performance Monitor
   - Look for "JS heap size"
   - Reload page if > 100MB

### Issue 6: Offline Mode Not Working

**Symptoms:**
- Error: "Cannot analyze offline without cached model"
- Works online but fails offline
- Model not persisting

**Causes:**
- Model not cached before going offline
- IndexedDB cleared by browser
- Private/incognito mode
- Storage quota exceeded

**Solutions:**

1. **Verify Model Cached:**
   ```javascript
   // In DevTools Console (while online)
   const db = await indexedDB.open('afia-models', 1);
   const tx = db.transaction('models', 'readonly');
   const store = tx.objectStore('models');
   const model = await store.get('1.0.0');
   console.log('Model cached:', !!model);
   ```

2. **Test Offline:**
   - DevTools → Network → Throttling → Offline
   - Try analysis
   - Should work if model cached

3. **Request Persistent Storage:**
   ```javascript
   navigator.storage.persist();
   ```

4. **Avoid Private Mode:**
   - IndexedDB cleared on browser close
   - Use normal browsing mode

## Performance Issues

### Slow First Load (> 15s)

**Causes:**
- Slow network connection
- Large model size
- Server latency

**Solutions:**
- Use faster network (WiFi vs 4G)
- Optimize model size (quantization)
- Use CDN for model hosting
- Show progress indicator to user

### Slow Inference (> 100ms)

**Causes:**
- CPU backend (WebGL failed)
- Device too slow
- Memory pressure

**Solutions:**
- Enable WebGL (see Issue 4)
- Close other apps
- Restart device
- Consider model quantization

### High Memory Usage

**Causes:**
- Tensors not disposed
- Multiple models loaded
- Memory leak

**Solutions:**
- Check tensor count: `tf.memory().numTensors`
- Should be < 10 between inferences
- Reload page if growing

## Error Telemetry

All errors are logged to the error telemetry service. To view:

```javascript
// In DevTools Console
import { getErrorHistory } from './src/services/errorTelemetry';
console.table(getErrorHistory());
```

**Error Categories:**
- `model_loading`: Model download/parse issues
- `inference`: Inference execution errors
- `network`: Network connectivity problems
- `storage`: IndexedDB quota/access issues

## Getting Help

If issues persist:

1. **Collect Diagnostics:**
   ```javascript
   // In DevTools Console
   const diagnostics = {
     tfVersion: tf.version,
     backend: tf.getBackend(),
     memory: tf.memory(),
     storage: await navigator.storage.estimate(),
     online: navigator.onLine,
     errors: getErrorHistory()
   };
   console.log(JSON.stringify(diagnostics, null, 2));
   ```

2. **Check Browser Console:**
   - Copy all error messages
   - Include stack traces
   - Note timestamps

3. **Report Issue:**
   - Include diagnostics JSON
   - Describe steps to reproduce
   - Mention device/browser version

## Prevention

### Best Practices

1. **Pre-cache Model:**
   - Load model on app install
   - Use service worker to cache
   - Request persistent storage

2. **Monitor Performance:**
   - Track inference times
   - Alert on degradation
   - Log to analytics

3. **Handle Errors Gracefully:**
   - Always fall back to LLM
   - Show user-friendly messages
   - Retry failed operations

4. **Test Offline:**
   - Test with airplane mode
   - Verify cache persistence
   - Check queue processing

5. **Update Models:**
   - Version model files
   - Clear old versions
   - Notify users of updates

## References

- [Local Inference Architecture](./local-inference-architecture.md)
- [TensorFlow.js Troubleshooting](https://www.tensorflow.org/js/guide/platform_environment)
- [IndexedDB Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- [Story 7.4 Specification](../_bmad-output/implementation-artifacts/7-4-client-side-model-integration.md)
