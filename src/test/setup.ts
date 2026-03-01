import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock canvas for imageCompressor tests
HTMLCanvasElement.prototype.getContext = () => null;

// Mock getUserMedia
Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [],
    }),
  },
  writable: true,
});
