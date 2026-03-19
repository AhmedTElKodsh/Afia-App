/**
 * QR Mock Generator Component
 * 
 * Dynamic QR code generator for mobile testing.
 * Automatically detects current environment and generates QR codes
 * that work with HTTPS tunnel URLs (ngrok/cloudflared).
 * 
 * Features:
 * - Auto-detects current URL origin
 * - Generates QR codes for all bottle SKUs
 * - Works with ngrok/cloudflared tunnels
 * - Includes scan instructions
 * - vConsole toggle for mobile debugging
 */

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { bottleRegistry } from '../../shared/bottleRegistry';
import { Camera, QrCode, Smartphone, Bug, Copy, Check, Droplets } from 'lucide-react';
import './QrMockGenerator.css';

export function QrMockGenerator() {
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [vConsoleEnabled, setVConsoleEnabled] = useState(false);

  // Detect current environment URL
  useEffect(() => {
    const origin = window.location.origin;
    
    // Check if running in tunnel mode (ngrok/cloudflared)
    const isTunnel = origin.includes('ngrok') || 
                     origin.includes('trycloudflare.com') ||
                     origin.includes('app.ngrok');
    
    if (!isTunnel && !origin.startsWith('https://')) {
      console.warn('⚠️ WARNING: Running on HTTP without HTTPS tunnel!');
      console.warn('Camera will NOT work on mobile devices.');
      console.warn('Start a tunnel: npx ngrok http 5173');
    }
    
    setBaseUrl(origin);
  }, []);

  // Enable vConsole for mobile debugging
  useEffect(() => {
    if (vConsoleEnabled) {
      import('vconsole').then((VConsoleModule) => {
        const VConsole = VConsoleModule.default;
        if (VConsole && !window.vConsole) {
          window.vConsole = new VConsole();
          console.log('✅ vConsole enabled for mobile debugging');
        }
      });
    }
  }, [vConsoleEnabled]);

  const copyToClipboard = async (text: string, sku: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getFullUrl = (sku: string) => {
    return `${baseUrl}/?sku=${sku}&mode=scan`;
  };

  // Check if running in secure context
  const isSecure = window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost';

  return (
    <div className="qr-mock-generator">
      {/* Header with Status */}
      <div className="qrmg-header">
        <div className="qrmg-title-section">
          <QrCode size={28} strokeWidth={2} />
          <h2>Mock QR Code Generator</h2>
        </div>
        
        <div className={`qrmg-status ${isSecure ? 'qrmg-status-ok' : 'qrmg-status-warning'}`}>
          {isSecure ? (
            <>
              <Check size={16} />
              <span>HTTPS Active - Camera Will Work</span>
            </>
          ) : (
            <>
              <Camera size={16} />
              <span>⚠️ HTTP - Camera Blocked on Mobile</span>
            </>
          )}
        </div>
      </div>

      {/* Environment Info */}
      <div className="qrmg-env-info card card-compact">
        <div className="qrmg-env-row">
          <strong>Current Origin:</strong>
          <code>{baseUrl}</code>
        </div>
        <div className="qrmg-env-row">
          <strong>Protocol:</strong>
          <span>{window.location.protocol}</span>
        </div>
        {!isSecure && (
          <div className="qrmg-env-row qrmg-warning">
            <strong>⚠️ Action Required:</strong>
            <span>Run: <code>npx ngrok http 5173</code></span>
          </div>
        )}
      </div>

      {/* vConsole Toggle */}
      <div className="qrmg-vconsole-toggle card card-compact">
        <div className="qrmg-toggle-header">
          <Bug size={20} strokeWidth={2} />
          <strong>Mobile Debugging Console</strong>
        </div>
        <p className="text-caption text-secondary">
          Enable vConsole to see JavaScript errors directly on your phone screen
        </p>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={vConsoleEnabled}
            onChange={(e) => setVConsoleEnabled(e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">
            {vConsoleEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {/* QR Code Grid */}
      <div className="qrmg-grid">
        {bottleRegistry.map((bottle) => {
          const fullUrl = getFullUrl(bottle.sku);
          const isCopied = copiedSku === bottle.sku;

          return (
            <div key={bottle.sku} className="qrmg-card card">
              <div className="qrmg-card-header">
                <span className="qrmg-bottle-icon"><Droplets size={22} style={{ color: "var(--color-primary)" }} /></span>
                <h3 className="qrmg-bottle-name">{bottle.name}</h3>
                <span className="qrmg-sku">{bottle.sku}</span>
              </div>

              {/* QR Code */}
              <div className="qrmg-qr-container">
                <QRCodeSVG
                  value={fullUrl}
                  size={180}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: '/afia-logo.png',
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              {/* URL Display */}
              <div className="qrmg-url-section">
                <div className="qrmg-url-display">
                  <Smartphone size={14} />
                  <code>{fullUrl}</code>
                </div>
                
                <button
                  className="qrmg-copy-btn"
                  onClick={() => copyToClipboard(fullUrl, bottle.sku)}
                  type="button"
                  aria-label={isCopied ? 'Copied to clipboard' : 'Copy URL'}
                >
                  {isCopied ? (
                    <>
                      <Check size={16} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scan Instructions */}
              <div className="qrmg-instructions">
                <div className="qrmg-step">
                  <Camera size={14} />
                  <span>1. Open phone camera</span>
                </div>
                <div className="qrmg-step">
                  <QrCode size={14} />
                  <span>2. Point at QR code</span>
                </div>
                <div className="qrmg-step">
                  <Smartphone size={14} />
                  <span>3. Tap notification</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Start Guide */}
      <div className="qrmg-quickstart card card-compact">
        <h3>🚀 Quick Start Guide</h3>
        <ol className="qrmg-steps">
          <li>
            <strong>Start Tunnel:</strong>
            <code>npx ngrok http 5173</code>
          </li>
          <li>
            <strong>Open Admin:</strong>
            <code>https://[ngrok-url]/?mode=admin</code>
          </li>
          <li>
            <strong>Navigate:</strong> Go to "Mock QRs" tab
          </li>
          <li>
            <strong>Scan:</strong> Point phone camera at QR code on screen
          </li>
          <li>
            <strong>Test:</strong> App opens with bottle pre-selected
          </li>
          <li>
            <strong>Debug:</strong> Enable vConsole to see errors on phone
          </li>
        </ol>
      </div>

      {/* Troubleshooting */}
      <div className="qrmg-troubleshooting card card-compact">
        <h3>🔧 Troubleshooting</h3>
        
        <div className="qrmg-issue">
          <strong>Camera not working on mobile?</strong>
          <ul>
            <li>Ensure you're using HTTPS tunnel (ngrok/cloudflared)</li>
            <li>Check browser permissions: Settings → Safari/Chrome → Camera</li>
            <li>Restart browser if permissions were denied</li>
          </ul>
        </div>

        <div className="qrmg-issue">
          <strong>QR code not scanning?</strong>
          <ul>
            <li>Increase screen brightness</li>
            <li>Hold phone 15-20cm from screen</li>
            <li>Ensure QR code is fully visible</li>
            <li>Try manual URL (click "Copy URL" and paste)</li>
          </ul>
        </div>

        <div className="qrmg-issue">
          <strong>vConsole not appearing?</strong>
          <ul>
            <li>Enable toggle in "Mobile Debugging Console" section</li>
            <li>Refresh page after enabling</li>
            <li>Look for green "Console" button on mobile screen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
