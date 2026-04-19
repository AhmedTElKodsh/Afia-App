import './OrientationGuide.css';

interface OrientationGuideProps {
  visible: boolean;
}

export function OrientationGuide({ visible }: OrientationGuideProps) {
  if (!visible) return null;
  
  return (
    <div className="orientation-guide" role="status" aria-live="polite">
      <span className="orientation-text">Handle on Right →</span>
    </div>
  );
}
