import { useRef, useState, useCallback, useEffect } from "react";
import { compressImage } from "../utils/imageCompressor.ts";

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<string | null>;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);

    if (!window.isSecureContext) {
      setError("camera_insecure_context");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("camera_unsupported");
      return;
    }

    // Stop any existing stream before starting a new one (prevents track leaks)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video is playing and ready before allowing capture
        await videoRef.current.play();
      }

      setIsActive(true);
    } catch (err) {
      console.error("Camera start error:", err);
      // Ensure we don't leak hardware resources if play() or state updates fail
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (err instanceof DOMException) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError("camera_denied");
        } else if (err.name === "NotFoundError") {
          setError("camera_not_found");
        } else {
          setError("camera_error");
        }
      } else {
        setError("camera_error");
      }
    }
  }, []);

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current;
    if (!video || !isActive) return null;

    // Guard: video element must have decoded frames and valid dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        setError("canvas_error");
        return null;
      }

      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      // Compress to 800px width
      return await compressImage(dataUrl);
    } catch (err) {
      console.error("Capture/Compression error:", err);
      setError("capture_error");
      return null;
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return { videoRef, isActive, error, startCamera, stopCamera, capturePhoto };
}
