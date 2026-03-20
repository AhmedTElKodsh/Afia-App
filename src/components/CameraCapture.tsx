import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useCamera } from "../hooks/useCamera.ts";
import "./CameraCapture.css";

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const { videoRef, isActive, error, startCamera, capturePhoto } = useCamera();

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleCapture = async () => {
    const base64 = await capturePhoto();
    if (base64) {
      onCapture(base64);
    }
  };

  if (error === "camera_denied") {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return (
      <div className="camera-error">
        <div className="camera-error-icon" aria-hidden="true">
          📷
        </div>
        <h2>Camera access required</h2>
        <p className="text-secondary">
          {isIOS
            ? "Go to Settings → Safari → Camera → Allow"
            : "Go to Settings → Apps → Browser → Permissions → Camera → Allow"}
        </p>
        <button className="btn btn-primary" onClick={startCamera}>
          Try Again
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="camera-error">
        <div className="camera-error-icon" aria-hidden="true">
          <AlertTriangle size={44} strokeWidth={1.5} />
        </div>
        <h2>Camera unavailable</h2>
        <p className="text-secondary">
          Could not access camera. Please check your device settings.
        </p>
        <button className="btn btn-primary" onClick={startCamera}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="camera-capture">
      <div className="viewfinder-container">
        <video
          ref={videoRef}
          className="viewfinder"
          autoPlay
          playsInline
          muted
        />
        {isActive && (
          <>
            <div className="camera-guide" aria-hidden="true" />
            <p className="guide-text">Align bottle in frame</p>
          </>
        )}
      </div>
      <div className="capture-controls">
        <button
          className="capture-button"
          onClick={handleCapture}
          disabled={!isActive}
          aria-label="Capture photo"
        >
          <span className="capture-inner" />
        </button>
      </div>
    </div>
  );
}
