import { Coffee } from "lucide-react";
import { ML_PER_VOLUME_STEP } from "../../shared/volumeCalculator.ts";
import "./CupVisualization.css";

interface CupVisualizationProps {
  volumeMl: number;
}

/**
 * Visualizes consumed volume in 55ml "Tea Cup" increments.
 * 110ml = 1 Full Cup
 * 55ml = 1/2 Cup
 */
export function CupVisualization({ volumeMl }: CupVisualizationProps) {
  const halfCupsCount = Math.floor(volumeMl / ML_PER_VOLUME_STEP);
  const fullCups = Math.floor(halfCupsCount / 2);
  const hasHalfCup = halfCupsCount % 2 === 1;

  const cupElements = [];

  // Add full cups
  for (let i = 0; i < fullCups; i++) {
    cupElements.push(
      <div key={`full-${i}`} className="cup-container full">
        <Coffee className="cup-icon fill-full" size={24} />
      </div>
    );
  }

  // Add the trailing half cup if necessary
  if (hasHalfCup) {
    cupElements.push(
      <div key="half" className="cup-container half">
        <Coffee className="cup-icon fill-half" size={24} />
      </div>
    );
  }

  return (
    <div className="cup-visualization">
      <div className="cup-grid">
        {cupElements}
      </div>
      <div className="cup-text">
        {fullCups > 0 || hasHalfCup ? (
          <span>
            {fullCups > 0 ? `${fullCups} ` : ""}
            {hasHalfCup ? (fullCups > 0 ? "+ 1/2 " : "1/2 ") : ""}
            {fullCups === 1 && !hasHalfCup ? "Cup" : "Cups"}
          </span>
        ) : (
          <span>0 Cups</span>
        )}
      </div>
    </div>
  );
}
