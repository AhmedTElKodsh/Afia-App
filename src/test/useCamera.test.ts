import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCamera } from "../hooks/useCamera.ts";

describe("useCamera", () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockStream: MediaStream;
  let mockTrack: MediaStreamTrack;

  beforeEach(() => {
    // Create mock track
    mockTrack = {
      stop: vi.fn(),
      kind: "video",
    } as unknown as MediaStreamTrack;

    // Create mock stream
    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    } as unknown as MediaStream;

    // Mock getUserMedia (mediaDevices already defined in setup.ts)
    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    navigator.mediaDevices.getUserMedia = mockGetUserMedia;

    // Mock video element
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with inactive state", () => {
    const { result } = renderHook(() => useCamera());

    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.videoRef.current).toBeNull();
  });

  it("should start camera successfully", async () => {
    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
    });
    expect(result.current.isActive).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should handle camera permission denied", async () => {
    mockGetUserMedia.mockRejectedValue(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBe("camera_denied");
  });

  it("should handle camera not found", async () => {
    mockGetUserMedia.mockRejectedValue(
      new DOMException("No camera found", "NotFoundError"),
    );

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBe("camera_not_found");
  });

  it("should handle generic camera error", async () => {
    mockGetUserMedia.mockRejectedValue(new Error("Unknown error"));

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBe("camera_error");
  });

  it("should stop camera and cleanup tracks", async () => {
    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.stopCamera();
    });

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(result.current.isActive).toBe(false);
  });

  it("should cleanup on unmount", async () => {
    const { result, unmount } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    unmount();

    await waitFor(() => {
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });

  it("should return null when capturing without active camera", async () => {
    const { result } = renderHook(() => useCamera());

    const photo = await act(async () => {
      return await result.current.capturePhoto();
    });

    expect(photo).toBeNull();
  });
});
