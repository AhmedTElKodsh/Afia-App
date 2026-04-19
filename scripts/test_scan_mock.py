import json
import time
import os
import signal
import subprocess
from playwright.sync_api import sync_playwright

def run():
    # Start Vite server in background
    print('Starting Vite server...')
    env = os.environ.copy()
    env['VITE_PROXY_URL'] = 'http://localhost:8787' # Mock proxy URL
    # Using 'shell=True' on Windows for 'npm'
    is_windows = os.name == 'nt'
    process = subprocess.Popen(['npm', 'run', 'dev', '--', '--port', '5173'], env=env, shell=is_windows, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Wait for server to start
    print('Waiting for server (10s)...')
    time.sleep(10)

    try:
        with sync_playwright() as p:
            print('Launching browser...')
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={'width': 375, 'height': 667}) # iPhone size
            page = context.new_page()
            
            # 1. Setup Mock API Response
            print('Setting up mock API route...')
            mock_response = {
                'scanId': 'mock-scan-123',
                'fillPercentage': 65,
                'remainingMl': 975,
                'confidence': 'high',
                'aiProvider': 'mock-provider',
                'latencyMs': 150
            }
            
            # Using a regex to match the analyze endpoint
            page.route('**/analyze', lambda route: route.fulfill(
                status=200,
                content_type='application/json',
                body=json.dumps(mock_response)
            ))
            
            # 2. Navigate to Landing Page
            print('Navigating to landing page with SKU...')
            page.goto('http://localhost:5173/?sku=afia-corn-1.5l')
            page.wait_for_load_state('networkidle')
            
            # Accept privacy and enable test mode in localStorage
            print('Setting state in localStorage...')
            page.evaluate('''() => {
                localStorage.setItem("afia_privacy_accepted", "true");
                localStorage.setItem("afia_test_mode", "true");
                window.__AFIA_TEST_MODE__ = true;
            }''')
            
            # Reload to apply changes
            print('Reloading page...')
            page.reload()
            page.wait_for_load_state('networkidle')
            
            # Double check test mode is active
            page.evaluate('() => { window.__AFIA_TEST_MODE__ = true; }')
            
            # 4. Trigger Scan via hook
            print('Triggering scan via __AFIA_TRIGGER_ANALYZE__ hook...')
            page.evaluate('() => { if (window.__AFIA_TRIGGER_ANALYZE__) window.__AFIA_TRIGGER_ANALYZE__(); }')
            
            # 5. Wait for result (it might be in FILL_CONFIRM state first)
            print('Waiting for result or confirm screen...')
            # Wait for either result display or the confirm screen (which has the "65%" value often)
            page.wait_for_selector('.result-display, .fill-confirm', timeout=20000)
            
            # 6. Take screenshot
            time.sleep(2) # Brief wait for animations
            page.screenshot(path='mock_scan_result.png', full_page=True)
            print('Screenshot saved to mock_scan_result.png')
            
            # 7. Print result for verification
            content = page.content()
            if '65' in content or '975' in content:
                print('SUCCESS: Found scan results in rendered UI')
                # Try to extract exact values
                try:
                    text = page.locator('body').inner_text()
                    print('Captured Text:', text)
                except:
                    pass
            else:
                print('FAILURE: Scan results not found in UI')
                print('Rendered Text Snippet:', page.locator('body').inner_text()[:500])
            
            browser.close()
    finally:
        # Terminate Vite process and its children
        print('Terminating Vite server...')
        if is_windows:
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(process.pid)])
        else:
            process.terminate()

if __name__ == '__main__':
    run()
