import type { ReactNode } from "react";
import "./AdminTabNav.css";

export interface AdminTabItem<T extends string = string> {
  id: T;
  label: string;
  icon: ReactNode;
}

interface AdminTabNavProps<T extends string> {
  tabs: AdminTabItem<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
}

export function AdminTabNav<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: AdminTabNavProps<T>) {
  return (
    <nav className="admin-tab-nav" role="tablist" aria-label="Admin sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls="admin-main"
          id={`tab-${tab.id}`}
          className={`admin-tab-btn${activeTab === tab.id ? " active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="admin-tab-icon">{tab.icon}</span>
          <span className="admin-tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
