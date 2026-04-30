import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { useCamera } from "../hooks/useCamera.ts";
import { OrientationGuide } from "./OrientationGuide";
import "./CameraCapture.css";

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const { t } = useTranslation();
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
    // iPadOS 13+ reports as desktop Safari — detect via maxTouchPoints
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return (
      <div className="camera-error">
        <div className="camera-error-icon" aria-hidden="true">
          <AlertTriangle size={44} strokeWidth={1.5} />
        </div>
        <h2>{t('camera.accessRequired')}</h2>
        <p className="text-secondary">
          {isIOS
            ? t('camera.iosSettingsInstructions')
            : t('camera.androidSettingsInstructions')}
        </p>
        <button className="btn btn-primary" onClick={startCamera}>
          {t('camera.tryAgain')}
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
        <h2>{t('camera.unavailable')}</h2>
        <p className="text-secondary">
          {t('camera.deviceSettings')}
        </p>
        <button className="btn btn-primary" onClick={startCamera}>
          {t('camera.tryAgain')}
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
            <OrientationGuide visible={isActive} />
            <p className="guide-text">{t('camera.guideText')}</p>
          </>
        )}
      </div>
      <div className="capture-controls">
        <button
          className="capture-button"
          onClick={handleCapture}
          disabled={!isActive}
          aria-label={t('camera.capturePhotoAriaLabel')}
        >
          <span className="capture-inner" />
        </button>
      </div>
    </div>
  );
}
