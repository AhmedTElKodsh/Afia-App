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
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { activeBottleRegistry } from '../../shared/bottleRegistry';
import { Camera, QrCode, Smartphone, Bug, Copy, Check, Droplets } from 'lucide-react';
import './QrMockGenerator.css';

export function QrMockGenerator() {
  const { t, i18n } = useTranslation();
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [vConsoleEnabled, setVConsoleEnabled] = useState(false);
  const isRTL = i18n.language === 'ar';

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
    // Check if clipboard API is available (requires secure context)
    if (!navigator.clipboard || !window.isSecureContext) {
      console.warn("Clipboard API not available - not in secure context");
      return;
    }
    
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
  const host = window.location.hostname;
  const isLoopbackHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const isSecure = window.location.protocol === 'https:' || isLoopbackHost;

  return (
    <div className="qr-mock-generator" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header with Status */}
      <div className="qrmg-header">
        <div className="qrmg-title-section">
          <QrCode size={28} strokeWidth={2} />
          <h2>{t('qrmock.title')}</h2>
        </div>
        
        <div className={`qrmg-status ${isSecure ? 'qrmg-status-ok' : 'qrmg-status-warning'}`}>
          {isSecure ? (
            <>
              <Check size={16} />
              <span>{t('qrmock.statusHttps')}</span>
            </>
          ) : (
            <>
              <Camera size={16} />
              <span>{t('qrmock.statusHttp')}</span>
            </>
          )}
        </div>
      </div>

      {/* vConsole Toggle */}
      <div className="qrmg-vconsole-toggle card card-compact">
        <div className="qrmg-toggle-header">
          <Bug size={20} strokeWidth={2} />
          <strong>{t('qrmock.vconsoleTitle')}</strong>
        </div>
        <p className="text-caption text-secondary">
          {t('qrmock.vconsoleDesc')}
        </p>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={vConsoleEnabled}
            onChange={(e) => setVConsoleEnabled(e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">
            {vConsoleEnabled ? t('qrmock.enabled') : t('qrmock.disabled')}
          </span>
        </label>
      </div>

      {/* QR Code Grid */}
      <div className="qrmg-grid">
        {activeBottleRegistry.map((bottle) => {
          const fullUrl = getFullUrl(bottle.sku);
          const isCopied = copiedSku === bottle.sku;

          return (
            <div key={bottle.sku} className="qrmg-card card">
              <div className="qrmg-card-header">
                <span className="qrmg-bottle-icon"><Droplets size={22} style={{ color: "var(--color-primary)" }} /></span>
                <h3 className="qrmg-bottle-name">{t(`bottles.${bottle.sku}`, { defaultValue: bottle.name })}</h3>
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
                    src: '/icons/afia-logo.png',
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
                  aria-label={isCopied ? t('qrmock.copied') : t('qrmock.copyUrl')}
                >
                  {isCopied ? (
                    <>
                      <Check size={16} />
                      <span>{t('qrmock.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>{t('qrmock.copyUrl')}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scan Instructions */}
              <div className="qrmg-instructions">
                <div className="qrmg-step">
                  <Camera size={14} />
                  <span>{t('qrmock.step1')}</span>
                </div>
                <div className="qrmg-step">
                  <QrCode size={14} />
                  <span>{t('qrmock.step2')}</span>
                </div>
                <div className="qrmg-step">
                  <Smartphone size={14} />
                  <span>{t('qrmock.step3')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Troubleshooting */}
      <div className="qrmg-troubleshooting card card-compact">
        <h3>{t('qrmock.troubleshootingTitle')}</h3>
        
        <div className="qrmg-issue">
          <strong>{t('qrmock.issue1')}</strong>
          <ul>
            <li>{t('qrmock.issue1Step1')}</li>
            <li>{t('qrmock.issue1Step2')}</li>
            <li>{t('qrmock.issue1Step3')}</li>
          </ul>
        </div>

        <div className="qrmg-issue">
          <strong>{t('qrmock.issue2')}</strong>
          <ul>
            <li>{t('qrmock.issue2Step1')}</li>
            <li>{t('qrmock.issue2Step2')}</li>
            <li>{t('qrmock.issue2Step3')}</li>
            <li>{t('qrmock.issue2Step4')}</li>
          </ul>
        </div>

        <div className="qrmg-issue">
          <strong>{t('qrmock.issue3')}</strong>
          <ul>
            <li>{t('qrmock.issue3Step1')}</li>
            <li>{t('qrmock.issue3Step2')}</li>
            <li>{t('qrmock.issue3Step3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
