import { describe, it, expect, beforeEach } from "vitest";
import { useIosInAppBrowser } from "../hooks/useIosInAppBrowser.ts";

describe("useIosInAppBrowser", () => {
  const originalUserAgent = navigator.userAgent;
  const originalStandalone = (navigator as Navigator & { standalone?: boolean })
    .standalone;

  beforeEach(() => {
    // Reset to original values
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "standalone", {
      value: originalStandalone,
      writable: true,
      configurable: true,
    });
  });

  it("should return false for non-iOS devices", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      writable: true,
      configurable: true,
    });

    expect(useIosInAppBrowser()).toBe(false);
  });

  it("should return false for iOS Safari (normal browser)", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "standalone", {
      value: false,
      writable: true,
      configurable: true,
    });

    expect(useIosInAppBrowser()).toBe(false);
  });

  it("should return true for iOS standalone PWA mode", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "standalone", {
      value: true,
      writable: true,
      configurable: true,
    });

    expect(useIosInAppBrowser()).toBe(true);
  });

  it("should return true for Facebook in-app browser", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 FBAN/FBIOS",
      writable: true,
      configurable: true,
    });

    expect(useIosInAppBrowser()).toBe(true);
  });

  it("should return true for Instagram in-app browser", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram",
      writable: true,
      configurable: true,
    });

    expect(useIosInAppBrowser()).toBe(true);
  });

  it("should return true for LinkedIn in-app browser", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 LinkedInApp",
      writable: true,
      configurable: true,
    });

    expect(useIosInAppBrowser()).toBe(true);
  });

  it("should return true for Twitter/X in-app browser", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Twitter",
      writable: true,
      configurable: true,
    });

    expect(useIosInAppBrowser()).toBe(true);
  });

  it("should return true for TikTok in-app browser", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 TikTok",
      writable: true,
      configurable: true,
    });

    expect(useIosInAppBrowser()).toBe(true);
  });

  it("should return true for iPad in-app browsers", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram",
      writable: true,
      configurable: true,
    });

    expect(useIosInAppBrowser()).toBe(true);
  });
});
