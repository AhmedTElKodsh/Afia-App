import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock canvas for imageCompressor tests (only for specific use cases)
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(...args) {
  // Return null only for specific test cases that need it
  // Otherwise, use the original implementation
  try {
    return originalGetContext.apply(this, args as any);
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
// Use setTimeout to prevent infinite recursion in tests
let frameId = 0;
Object.defineProperty(globalThis, "requestAnimationFrame", {
  value: vi.fn((callback) => {
    const id = ++frameId;
    setTimeout(() => callback(performance.now()), 0);
    return id;
  }),
  writable: true,
});

// Mock cancelAnimationFrame
Object.defineProperty(globalThis, "cancelAnimationFrame", {
  value: vi.fn((id) => {
    // No-op in test environment
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
