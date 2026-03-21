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

// Mock canvas for imageCompressor tests (only for specific use cases)
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(...args) {
  // Return null only for specific test cases that need it
  // Otherwise, use the original implementation
  try {
    return (originalGetContext as (...args: unknown[]) => RenderingContext | null).apply(this, args);
  } catch {
    return null;
  }
};

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
