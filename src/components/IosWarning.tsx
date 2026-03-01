import "./IosWarning.css";

export function IosWarning() {
  return (
    <div className="ios-warning-screen" role="main">
      <div className="ios-warning-card card">
        <div className="ios-warning-icon" aria-hidden="true">📱</div>
        <h1 className="ios-warning-title">Open in Safari</h1>
        <p className="ios-warning-body">
          For best experience and camera access, please open this page in Safari.
        </p>
        <ol className="ios-warning-steps">
          <li>Tap the <strong>Share</strong> button (□↑)</li>
          <li>Select <strong>"Open in Safari"</strong></li>
        </ol>
        <p className="ios-warning-note text-caption text-secondary">
          Camera access requires Safari on iOS devices.
        </p>
      </div>
    </div>
  );
}
