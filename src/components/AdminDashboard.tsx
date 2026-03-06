import { useState, useEffect } from "react";
import { bottleRegistry } from "../data/bottleRegistry";
import type { BottleEntry } from "../data/bottleRegistry";
import { useScanHistory } from "../hooks/useScanHistory";
import { exportToCSV, exportToJSON } from "../utils/exportResults";
import { BottleManager } from "./BottleManager";
import "./AdminDashboard.css";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";
const SESSION_KEY = "afia_admin_session";

export function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "bottles" | "export">("overview");
  
  const { scans, getStats } = useScanHistory();
  const stats = getStats();

  // Check for existing session
  useEffect(() => {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session === "authenticated") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "authenticated");
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Invalid password");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="login-card">
          <h1>🔐 Admin Access</h1>
          <p className="text-secondary">Enter admin password to continue</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="password-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="btn btn-primary btn-full">
              Login
            </button>
          </form>
          <button className="btn btn-link" onClick={() => window.history.back()}>
            ← Back to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-content">
          <h1>⚙️ Admin Dashboard</h1>
          <button className="btn btn-outline" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={activeTab === "bottles" ? "active" : ""}
          onClick={() => setActiveTab("bottles")}
        >
          Bottle Registry
        </button>
        <button
          className={activeTab === "export" ? "active" : ""}
          onClick={() => setActiveTab("export")}
        >
          Export Data
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === "overview" && (
          <OverviewTab stats={stats} scans={scans} />
        )}
        {activeTab === "bottles" && (
          <BottleManager />
        )}
        {activeTab === "export" && (
          <ExportTab scans={scans} />
        )}
      </main>
    </div>
  );
}

// Overview Tab Component
interface OverviewTabProps {
  stats: ReturnType<ReturnType<typeof useScanHistory>["getStats"]>;
  scans: ReturnType<typeof useScanHistory>["scans"];
}

function OverviewTab({ stats, scans }: OverviewTabProps) {
  const recentScans = scans.slice(0, 10);

  return (
    <div className="overview-tab">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <span className="metric-value">{stats.totalScans}</span>
            <span className="metric-label">Total Scans</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💧</div>
          <div className="metric-content">
            <span className="metric-value">{stats.totalConsumedMl}</span>
            <span className="metric-label">Total ml Consumed</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <span className="metric-value">{stats.scansLast7Days}</span>
            <span className="metric-label">Scans (7 Days)</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📅</div>
          <div className="metric-content">
            <span className="metric-value">{stats.scansLast30Days}</span>
            <span className="metric-label">Scans (30 Days)</span>
          </div>
        </div>
      </div>

      <div className="recent-scans">
        <h3>Recent Scans</h3>
        {recentScans.length === 0 ? (
          <p className="no-data">No scans yet</p>
        ) : (
          <table className="scans-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bottle</th>
                <th>Fill %</th>
                <th>Consumed</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {recentScans.map((scan) => (
                <tr key={scan.id}>
                  <td>{new Date(scan.timestamp).toLocaleDateString()}</td>
                  <td>{scan.bottleName}</td>
                  <td>{scan.fillPercentage}%</td>
                  <td>{scan.consumedMl}ml</td>
                  <td>
                    <span className={`confidence-badge-${scan.confidence}`}>
                      {scan.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Export Tab Component
interface ExportTabProps {
  scans: ReturnType<typeof useScanHistory>["scans"];
}

function ExportTab({ scans }: ExportTabProps) {
  const [dateRange, setDateRange] = useState<"all" | 7 | 30>("all");

  const filteredScans = scans.filter((scan) => {
    if (dateRange === "all") return true;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange);
    return new Date(scan.timestamp) >= cutoff;
  });

  const handleExportJSON = () => {
    if (filteredScans.length === 0) {
      alert("No scans to export");
      return;
    }
    exportToJSON(filteredScans.map(s => ({
      ...s,
      analysisResult: {
        scanId: s.id,
        fillPercentage: s.fillPercentage,
        confidence: s.confidence,
        aiProvider: "gemini" as const,
        latencyMs: 0,
      }
    })));
  };

  const handleExportCSV = () => {
    if (filteredScans.length === 0) {
      alert("No scans to export");
      return;
    }
    exportToCSV(filteredScans.map(s => ({
      ...s,
      analysisResult: {
        scanId: s.id,
        fillPercentage: s.fillPercentage,
        confidence: s.confidence,
        aiProvider: "gemini" as const,
        latencyMs: 0,
      }
    })));
  };

  return (
    <div className="export-tab">
      <h3>Export Scan Data</h3>
      <p className="text-secondary">
        Download your scan history in CSV or JSON format
      </p>

      <div className="export-controls">
        <div className="date-range">
          <label>Date Range:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
          >
            <option value="all">All Time</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
          </select>
        </div>

        <div className="export-stats">
          <span>{filteredScans.length} scans will be exported</span>
        </div>
      </div>

      <div className="export-buttons">
        <button
          className="btn btn-primary"
          onClick={handleExportJSON}
          disabled={filteredScans.length === 0}
        >
          📄 Export JSON
        </button>
        <button
          className="btn btn-primary"
          onClick={handleExportCSV}
          disabled={filteredScans.length === 0}
        >
          📊 Export CSV
        </button>
      </div>

      <div className="export-info">
        <h4>What's Included:</h4>
        <ul>
          <li>Scan date and time</li>
          <li>Bottle SKU and name</li>
          <li>Fill percentage</li>
          <li>Remaining and consumed volumes</li>
          <li>Confidence level</li>
          <li>Feedback rating (if provided)</li>
        </ul>
      </div>
    </div>
  );
}
