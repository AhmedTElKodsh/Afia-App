import { useState } from "react";
import "./PrivacyNotice.css";

const STORAGE_KEY = "safi_privacy_accepted";

export function hasAcceptedPrivacy(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

interface PrivacyNoticeProps {
  onAccepted: () => void;
}

export function PrivacyNotice({ onAccepted }: PrivacyNoticeProps) {
  const [expanded, setExpanded] = useState(false);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onAccepted();
  };

  return (
    <div className="privacy-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="privacy-card card">
        <h2 id="privacy-title" className="privacy-title">Before Your First Scan</h2>

        <p className="privacy-body">
          Scan images are stored to improve AI accuracy.
        </p>
        <p className="privacy-body">
          No personal information is collected.
        </p>

        {expanded && (
          <div className="privacy-details">
            <p>When you photograph your oil bottle:</p>
            <ul>
              <li>The image is sent to our AI analysis server</li>
              <li>It is stored alongside the AI estimate for model training</li>
              <li>Your optional feedback rating is stored with the image</li>
              <li>Images are not linked to any personal identity</li>
              <li>Images may be reviewed to improve AI accuracy over time</li>
            </ul>
          </div>
        )}

        <button
          className="privacy-learn-more text-caption"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Learn more"}
        </button>

        <button className="btn btn-primary btn-full privacy-accept" onClick={handleAccept}>
          I Understand
        </button>
      </div>
    </div>
  );
}
