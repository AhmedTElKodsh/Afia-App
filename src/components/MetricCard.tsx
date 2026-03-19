import type { ReactNode } from "react";
import "./MetricCard.css";

interface MetricCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  period?: string;
}

export function MetricCard({ icon, value, label, period }: MetricCardProps) {
  return (
    <div className="metric-card-glass">
      <div className="metric-card-icon-row">
        <div className="metric-card-icon">{icon}</div>
        {period && <span className="metric-card-period">{period}</span>}
      </div>
      <div className="metric-card-value">{value}</div>
      <div className="metric-card-label">{label}</div>
    </div>
  );
}
