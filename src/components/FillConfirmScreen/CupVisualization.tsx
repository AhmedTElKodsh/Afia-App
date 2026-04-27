import { useTranslation } from "react-i18next";
import { CupIcon } from "./CupIcon.tsx";
import { formatCupText } from "../../utils/formatters.ts";

interface CupVisualizationProps {
  waterMl: number;
}

const ML_PER_CUP = 220;
const ML_PER_QUARTER = 55;

type FillState = "empty" | "quarter" | "half" | "three-quarters" | "full";

function getFillState(ml: number): FillState {
  if (ml === 0) return "empty";
  const remainder = ml % ML_PER_CUP;
  const quarters = Math.round(remainder / ML_PER_QUARTER);
  // quarters === 0 means exact cup boundary → show full
  if (quarters === 0 || quarters === 4) return "full";
  if (quarters === 1) return "quarter";
  if (quarters === 2) return "half";
  return "three-quarters";
}

/**
 * Single cup icon that fills progressively and resets at each full cup.
 * When past the first cup, a count badge is shown to the left of the icon.
 *
 * Examples:
 *   55ml  → [quarter-cup]           (no badge — still first cup)
 *   220ml → 1 [full-cup]
 *   275ml → 1 [quarter-cup]
 *   440ml → 2 [full-cup]
 */
export function CupVisualization({ waterMl }: CupVisualizationProps) {
  const { t } = useTranslation();
  const fill = getFillState(waterMl);
  const completedCups = Math.floor(waterMl / ML_PER_CUP);

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="flex flex-row items-center gap-1">
        {completedCups > 0 && (
          <span
            className="text-base font-bold text-blue-600 leading-none"
            aria-hidden="true"
          >
            {completedCups}
          </span>
        )}
        <CupIcon fill={fill} />
      </div>
      <span className="text-sm font-medium text-gray-700">
        {formatCupText(waterMl, t)}
      </span>
    </div>
  );
}
