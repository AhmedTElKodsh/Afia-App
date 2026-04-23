import { useTranslation } from "react-i18next";
import { Smartphone, Beaker, TestTube } from "lucide-react";

export type TestLabTab = "flow" | "inspector" | "visuals";

interface TestLabTabsProps {
  activeTab: TestLabTab;
  onTabChange: (tab: TestLabTab) => void;
}

export function TestLabTabs({ activeTab, onTabChange }: TestLabTabsProps) {
  const { t } = useTranslation();
  return (
    <div className="test-lab-tabs" role="tablist">
      <button
        className={`test-lab-tab ${activeTab === "flow" ? "active" : ""}`}
        onClick={() => onTabChange("flow")}
        type="button"
        role="tab"
        aria-selected={activeTab === "flow"}
      >
        <Smartphone size={16} strokeWidth={2} />
        {t('admin.testLab.tabFlow')}
      </button>
      <button
        className={`test-lab-tab ${activeTab === "inspector" ? "active" : ""}`}
        onClick={() => onTabChange("inspector")}
        type="button"
        role="tab"
        aria-selected={activeTab === "inspector"}
      >
        <Beaker size={16} strokeWidth={2} />
        {t('admin.testLab.tabInspector')}
      </button>
      <button
        className={`test-lab-tab ${activeTab === "visuals" ? "active" : ""}`}
        onClick={() => onTabChange("visuals")}
        type="button"
        role="tab"
        aria-selected={activeTab === "visuals"}
      >
        <TestTube size={16} strokeWidth={2} />
        {t('admin.testLab.tabVisuals', 'Visuals')}
      </button>
    </div>
  );
}
