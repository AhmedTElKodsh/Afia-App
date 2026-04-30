/**
 * Detects problematic iOS browser contexts where camera may not work:
 * - In-app browsers (Instagram, Facebook, LinkedIn, Twitter/X)
 * - Standalone PWA mode (iOS WebKit camera bug)
 *
 * Safari on iOS is the only safe context for getUserMedia.
 */
export function useIosInAppBrowser(): boolean {
  const ua = navigator.userAgent;

  // Not iOS — not our concern
  const isIos = /iphone|ipad|ipod/i.test(ua);
  if (!isIos) return false;

  // Standalone PWA mode (navigator.standalone is iOS Safari-specific)
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
    return true;
  }

  // Common in-app browsers that embed WebKit without full camera access
  const inAppPatterns = [
    /FBAN|FBAV/i,        // Facebook
    /Instagram/i,         // Instagram
    /LinkedInApp/i,       // LinkedIn
    /Twitter/i,           // Twitter/X
    /Snapchat/i,          // Snapchat
    /TikTok/i,            // TikTok
    /GSA\//i,             // Google Search App
    /MicroMessenger/i,    // WeChat
  ];

  return inAppPatterns.some((pattern) => pattern.test(ua));
}
