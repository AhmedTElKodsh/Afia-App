import "@testing-library/jest-dom";
import { vi } from "vitest";

// Global react-i18next mock — t(key) returns actual EN translation strings
// so tests can query rendered output by human-readable English text.
// vi.mock is NOT hoisted in setupFiles, so we can use an async factory safely.
vi.mock('react-i18next', async () => {
  const { default: en } = await import('../i18n/locales/en/translation.json');
  type Obj = { [k: string]: string | Obj };

  function t(key: string, vars?: Record<string, unknown>): string {
    const val = key.split('.').reduce<string | Obj | undefined>(
      (acc, k) => (acc && typeof acc === 'object' ? (acc as Obj)[k] : undefined),
      en as unknown as Obj
    );
    if (typeof val !== 'string') return key;
    if (!vars) return val;
    return val.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? k));
  }

  return {
    useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: vi.fn() } }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock canvas for image processing tests
HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) {
  if (type === '2d') {
    const canvas = this;
    return {
      canvas: canvas,
      drawImage: vi.fn(),
      getImageData: vi.fn(function(x = 0, y = 0, w = canvas.width, h = canvas.height) {
        return {
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        };
      }),
      putImageData: vi.fn(),
      createImageData: vi.fn(function(w: number, h: number) {
        return {
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        };
      }),
      setTransform: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      arc: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      fillText: vi.fn(),
    } as any;
  }
  
  return null;
};

// Mock toDataURL for canvas - required for image capture tests
HTMLCanvasElement.prototype.toDataURL = vi.fn(function(type = 'image/png', quality?: number) {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
});

// Mock getUserMedia
Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [],
    }),
  },
  writable: true,
});

// Mock requestAnimationFrame for tests
// Track pending timeouts so cancelAnimationFrame can actually cancel them
const pendingFrames = new Map<number, ReturnType<typeof setTimeout>>();
let frameId = 0;
Object.defineProperty(globalThis, "requestAnimationFrame", {
  value: vi.fn((callback) => {
    const id = ++frameId;
    const timeoutId = setTimeout(() => {
      pendingFrames.delete(id);
      callback(performance.now());
    }, 0);
    pendingFrames.set(id, timeoutId);
    return id;
  }),
  writable: true,
});

// Mock cancelAnimationFrame — must actually cancel the timeout to prevent
// post-teardown "window is not defined" errors when components unmount mid-animation
Object.defineProperty(globalThis, "cancelAnimationFrame", {
  value: vi.fn((id: number) => {
    const timeoutId = pendingFrames.get(id);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      pendingFrames.delete(id);
    }
  }),
  writable: true,
});

// Mock matchMedia for responsive tests
Object.defineProperty(globalThis, "matchMedia", {
  value: vi.fn((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

// Mock ResizeObserver for components that track container size
// Used by AnnotatedImagePanel and Radix UI Slider
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
