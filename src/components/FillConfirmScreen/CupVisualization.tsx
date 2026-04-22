import { useTranslation } from "react-i18next";
import { CupIcon } from "./CupIcon.tsx";

interface CupVisualizationProps {
  waterMl: number;
}

const ML_PER_CUP = 220;
const ML_PER_QUARTER_CUP = 55;

function calculateCupStates(waterMl: number) {
  const fullCups = Math.floor(waterMl / ML_PER_CUP);
  const remainder = waterMl % ML_PER_CUP;
  
  // Snap to nearest quarter cup for visualization
  const quarters = Math.round(remainder / ML_PER_QUARTER_CUP);
  
  let partialFill: "empty" | "quarter" | "half" | "three-quarters" | "full" = "empty";
  
  if (quarters === 1) partialFill = "quarter";
  else if (quarters === 2) partialFill = "half";
  else if (quarters === 3) partialFill = "three-quarters";
  else if (quarters === 4) {
    return { fullCups: fullCups + 1, partialFill: "empty" as const };
  }
  
  return { fullCups, partialFill };
}

function formatCupText(fullCups: number, partialFill: string, t: any): string {
  let fraction = "";
  if (partialFill === "quarter") fraction = "1/4";
  else if (partialFill === "half") fraction = "1/2";
  else if (partialFill === "three-quarters") fraction = "3/4";
  
  const totalValue = fullCups + (partialFill === "quarter" ? 0.25 : partialFill === "half" ? 0.5 : partialFill === "three-quarters" ? 0.75 : 0);
  
  if (fullCups === 0 && fraction) {
    return `${fraction} ${t("common.cup", "Cup")}`;
  }
  
  const cupWord = totalValue === 1 
    ? t("common.cup", "Cup") 
    : t("common.cups", "Cups");
  
  if (fraction) {
    return `${fullCups} ${fraction} ${cupWord}`;
  }
  
  return `${fullCups} ${cupWord}`;
}

export function CupVisualization({ waterMl }: CupVisualizationProps) {
  const { t } = useTranslation();
  const { fullCups, partialFill } = calculateCupStates(waterMl);
  const totalCups = fullCups + (partialFill !== "empty" ? 1 : 0);
  
  // Show icons only for reasonable counts (≤ 5 total cups shown)
  const showIcons = totalCups <= 5;
  
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {showIcons && (
        <div className="flex flex-row gap-1" dir={document.documentElement.dir}>
          {/* Render full cup icons */}
          {Array.from({ length: fullCups }).map((_, i) => (
            <CupIcon key={`full-${i}`} fill="full" />
          ))}
          {/* Render partial cup icon if needed */}
          {partialFill !== "empty" && <CupIcon key="partial" fill={partialFill} />}
          
          {/* If 0 ml, show one empty cup for context */}
          {fullCups === 0 && partialFill === "empty" && <CupIcon fill="empty" />}
        </div>
      )}
      <span className="text-sm font-medium text-gray-700">
        {formatCupText(fullCups, partialFill, t)}
      </span>
    </div>
  );
}
