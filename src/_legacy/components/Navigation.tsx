import { Camera, History, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

export type CurrentView = "scan" | "history" | "admin";

interface NavigationProps {
  currentView: CurrentView;
  onViewChange: (view: CurrentView) => void;
  isAdminMode: boolean;
}

export function Navigation({ currentView, onViewChange, isAdminMode }: NavigationProps) {
  const { t } = useTranslation();

  const tabs: Array<{
    key: CurrentView;
    label: string;
    icon: ReactNode;
  }> = [
    {
      key: "scan",
      // Backward-compatible label expected by existing E2E admin flows.
      label: isAdminMode ? t("navigation.testLab", "Test Lab") : t("navigation.scan", "Scan"),
      icon: <Camera size={18} />,
    },
    { key: "history", label: t("navigation.history", "History"), icon: <History size={18} /> },
  ];

  if (isAdminMode) {
    tabs.push({
      key: "admin",
      label: t("navigation.admin", "Admin"),
      icon: <LayoutDashboard size={18} />,
    });
  }

  return (
    <nav className="main-navigation" aria-label={t("navigation.main", "Main navigation")}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`nav-item${currentView === tab.key ? " active" : ""}`}
          onClick={() => onViewChange(tab.key)}
          aria-pressed={currentView === tab.key}
          aria-label={tab.label}
        >
          <span className="nav-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
