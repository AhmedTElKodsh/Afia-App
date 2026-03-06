import { useMemo, useState } from "react";
import { useScanHistory } from "../hooks/useScanHistory";
import "./ConsumptionTrends.css";

type TimeRange = 7 | 30 | 90;
type Unit = "ml" | "tbsp" | "cups";

const ML_PER_TBSP = 14.7868;
const ML_PER_CUP = 236.588;

interface DailyData {
  date: string;
  label: string;
  consumedMl: number;
  scanCount: number;
}

export function ConsumptionTrends() {
  const { scans, getStats } = useScanHistory();
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [unit, setUnit] = useState<Unit>("ml");

  const stats = getStats();

  // Aggregate scans by day
  const dailyData = useMemo(() => {
    if (scans.length === 0) return [];

    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeRange);

    // Group by date
    const groups: Record<string, DailyData> = {};

    scans
      .filter((s) => new Date(s.timestamp) >= cutoff)
      .forEach((scan) => {
        const date = new Date(scan.timestamp);
        const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
        
        if (!groups[dateKey]) {
          groups[dateKey] = {
            date: dateKey,
            label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            consumedMl: 0,
            scanCount: 0,
          };
        }

        groups[dateKey].consumedMl += scan.consumedMl;
        groups[dateKey].scanCount += 1;
      });

    // Convert to array and sort by date
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  }, [scans, timeRange]);

  // Convert to selected unit
  const convertValue = (ml: number): number => {
    switch (unit) {
      case "tbsp":
        return ml / ML_PER_TBSP;
      case "cups":
        return ml / ML_PER_CUP;
      default:
        return ml;
    }
  };

  const formatValue = (ml: number): string => {
    const value = convertValue(ml);
    switch (unit) {
      case "ml":
        return `${Math.round(value)}ml`;
      case "tbsp":
        return `${value.toFixed(1)} tbsp`;
      case "cups":
        return `${value.toFixed(2)} cups`;
    }
  };

  // Calculate chart dimensions
  const maxValue = Math.max(...dailyData.map((d) => d.consumedMl), 1);
  const chartHeight = 200;
  const chartWidth = 100; // percentage

  if (scans.length === 0) {
    return (
      <div className="consumption-trends">
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <h3>No trends yet</h3>
          <p className="text-secondary">
            Complete some scans to see your consumption trends
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="consumption-trends">
      <header className="trends-header">
        <h3>Consumption Trends</h3>
        <div className="trends-controls">
          <div className="time-range">
            <button
              className={timeRange === 7 ? "active" : ""}
              onClick={() => setTimeRange(7)}
            >
              7D
            </button>
            <button
              className={timeRange === 30 ? "active" : ""}
              onClick={() => setTimeRange(30)}
            >
              30D
            </button>
            <button
              className={timeRange === 90 ? "active" : ""}
              onClick={() => setTimeRange(90)}
            >
              90D
            </button>
          </div>
          <div className="unit-toggle">
            <button
              className={unit === "ml" ? "active" : ""}
              onClick={() => setUnit("ml")}
            >
              ml
            </button>
            <button
              className={unit === "tbsp" ? "active" : ""}
              onClick={() => setUnit("tbsp")}
            >
              tbsp
            </button>
            <button
              className={unit === "cups" ? "active" : ""}
              onClick={() => setUnit("cups")}
            >
              cups
            </button>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="trends-summary">
        <div className="summary-stat">
          <span className="stat-value">{stats.totalScans}</span>
          <span className="stat-label">Total Scans</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{formatValue(stats.totalConsumedMl)}</span>
          <span className="stat-label">Total Consumed</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">
            {dailyData.length > 0
              ? formatValue(stats.totalConsumedMl / dailyData.length)
              : "0"}
          </span>
          <span className="stat-label">Avg/Day</span>
        </div>
      </div>

      {/* Chart */}
      <div className="trends-chart">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="chart-svg"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={chartHeight * (y / 100)}
              x2={chartWidth}
              y2={chartHeight * (y / 100)}
              stroke="#e0e0e0"
              strokeWidth="0.5"
            />
          ))}

          {/* Bars */}
          {dailyData.map((day, index) => {
            const barWidth = chartWidth / dailyData.length;
            const barHeight = (day.consumedMl / maxValue) * (chartHeight - 20);
            const x = index * barWidth;
            const y = chartHeight - barHeight;

            return (
              <g key={day.date}>
                <rect
                  x={x + 1}
                  y={y}
                  width={barWidth - 2}
                  height={barHeight}
                  fill="var(--color-primary)"
                  opacity="0.8"
                  rx="1"
                />
                <title>
                  {day.label}: {formatValue(day.consumedMl)} ({day.scanCount} scans)
                </title>
              </g>
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div className="chart-labels">
          {dailyData.length > 0 && (
            <>
              <span className="label-start">
                {dailyData[0].label}
              </span>
              <span className="label-end">
                {dailyData[dailyData.length - 1].label}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
