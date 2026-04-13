/// <reference types="vite/client" />

declare global {
  interface Window {
    vConsole?: unknown;
    __AFIA_TEST_MODE__?: boolean | { bypassQualityChecks?: boolean };
    __AFIA_FORCE_READY__?: () => void;
    __AFIA_TRIGGER_ANALYZE__?: () => void;
  }
}

export {};
