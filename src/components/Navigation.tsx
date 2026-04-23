import { useTranslation } from "react-i18next";
import { Camera, History, LayoutDashboard, FlaskConical } from "lucide-react";
import "./Navigation.css";

export type CurrentView = "scan" | "history" | "admin";

interface NavigationProps {
  currentView: CurrentView;
  onViewChange: (view: CurrentView) => void;
  isAdminMode: boolean;
}

export function Navigation({ currentView, onViewChange, isAdminMode }: NavigationProps) {
  const { t } = useTranslation();
  return (
    <nav className={`main-navigation${isAdminMode ? " main-navigation--admin" : ""}`}>
      {isAdminMode ? (
        // Admin Mode Navigation: Test Lab | History | Dashboard
        <>
          <button
            className={`nav-item ${currentView === "scan" ? "active" : ""}`}
            onClick={() => onViewChange("scan")}
            aria-label={t('nav.testLab')}
          >
            <span className="nav-icon"><FlaskConical size={20} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.testLab')}</span>
          </button>
          <button
            className={`nav-item ${currentView === "history" ? "active" : ""}`}
            onClick={() => onViewChange("history")}
            aria-label={t('nav.history')}
          >
            <span className="nav-icon"><History size={20} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.history')}</span>
          </button>
          <button
            className={`nav-item ${currentView === "admin" ? "active" : ""}`}
            onClick={() => onViewChange("admin")}
            aria-label={t('nav.dashboard')}
          >
            <span className="nav-icon"><LayoutDashboard size={18} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.dashboard')}</span>
          </button>
        </>
      ) : (
        // User Mode Navigation: Scan | History
        <>
          <button
            className={`nav-item ${currentView === "scan" ? "active" : ""}`}
            onClick={() => onViewChange("scan")}
            aria-label={t('nav.scan')}
          >
            <span className="nav-icon"><Camera size={20} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.scan')}</span>
          </button>
          <button
            className={`nav-item ${currentView === "history" ? "active" : ""}`}
            onClick={() => onViewChange("history")}
            aria-label={t('nav.history')}
          >
            <span className="nav-icon"><History size={20} strokeWidth={2} /></span>
            <span className="nav-label">{t('nav.history')}</span>
          </button>
        </>
      )}
    </nav>
  );
}
