import { useState, useMemo } from "react";
import { useScanHistory, type StoredScan } from "../hooks/useScanHistory";
import { formatDate, formatTime } from "../utils/formatters";
import "./ScanHistory.css";

type DateRange = "all" | 7 | 30;

export function ScanHistory() {
  const { scans, searchScans, getScansByDateRange, deleteScan, clearHistory, getStats } = useScanHistory();
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScan, setSelectedScan] = useState<StoredScan | null>(null);

  // Filter scans by date range and search
  const filteredScans = useMemo(() => {
    let filtered = dateRange === "all" 
      ? scans 
      : getScansByDateRange(dateRange as number);
    
    if (searchQuery.trim()) {
      filtered = searchScans(searchQuery);
    }
    
    return filtered;
  }, [scans, dateRange, searchQuery, getScansByDateRange, searchScans]);

  const stats = getStats();

  if (scans.length === 0) {
    return (
      <div className="scan-history scan-history-empty">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>No scan history yet</h2>
          <p className="text-secondary">
            Your scanned bottles will appear here once you complete your first scan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-history">
      <header className="history-header">
        <h2>Scan History</h2>
        <div className="history-stats">
          <span className="stat">{stats.totalScans} scans</span>
          <span className="stat">{stats.totalConsumedMl}ml total</span>
        </div>
      </header>

      {/* Filters */}
      <div className="history-filters">
        <div className="date-range-filter">
          <button
            className={dateRange === 7 ? "active" : ""}
            onClick={() => setDateRange(7)}
          >
            Last 7 days
          </button>
          <button
            className={dateRange === 30 ? "active" : ""}
            onClick={() => setDateRange(30)}
          >
            Last 30 days
          </button>
          <button
            className={dateRange === "all" ? "active" : ""}
            onClick={() => setDateRange("all")}
          >
            All time
          </button>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Search bottles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search bottles"
        />
      </div>

      {/* Scan list */}
      <div className="history-list">
        {filteredScans.length === 0 ? (
          <p className="no-results">No scans match your filters</p>
        ) : (
          filteredScans.map((scan) => (
            <div
              key={scan.id}
              className="history-item"
              onClick={() => setSelectedScan(scan)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelectedScan(scan)}
            >
              <div className="history-info">
                <h3 className="bottle-name">{scan.bottleName}</h3>
                <div className="history-meta">
                  <span className="date">{formatDate(scan.timestamp)}</span>
                  <span className="time">{formatTime(scan.timestamp)}</span>
                </div>
              </div>
              <div className="history-result">
                <div className="fill-badge">{scan.fillPercentage}%</div>
                <div className="consumed">{scan.consumedMl}ml</div>
              </div>
              <div className={`confidence-badge-${scan.confidence}`}>
                {scan.confidence === "high" && "●"}
                {scan.confidence === "medium" && "◐"}
                {scan.confidence === "low" && "○"}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clear history button */}
      {scans.length > 0 && (
        <div className="history-actions">
          <button
            className="btn btn-danger"
            onClick={clearHistory}
            aria-label="Clear all history"
          >
            Clear History
          </button>
        </div>
      )}

      {/* Scan detail modal */}
      {selectedScan && (
        <ScanDetailModal
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
          onDelete={() => {
            deleteScan(selectedScan.id);
            setSelectedScan(null);
          }}
        />
      )}
    </div>
  );
}

// Detail Modal Component
interface ScanDetailModalProps {
  scan: StoredScan;
  onClose: () => void;
  onDelete: () => void;
}

function ScanDetailModal({ scan, onClose, onDelete }: ScanDetailModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>Scan Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <div className="detail-section">
            <h4>Bottle</h4>
            <p className="detail-value">{scan.bottleName}</p>
            <p className="detail-meta">SKU: {scan.sku}</p>
          </div>

          <div className="detail-section">
            <h4>Date & Time</h4>
            <p className="detail-value">{formatDate(scan.timestamp)}</p>
            <p className="detail-meta">{formatTime(scan.timestamp)}</p>
          </div>

          <div className="detail-section">
            <h4>Fill Level</h4>
            <div className="fill-detail">
              <span className="fill-percent">{scan.fillPercentage}%</span>
              <span className="fill-label">remaining</span>
            </div>
          </div>

          <div className="detail-section">
            <h4>Volume</h4>
            <div className="volume-detail">
              <div>
                <span className="volume-label">Remaining</span>
                <span className="volume-value">{scan.remainingMl}ml</span>
              </div>
              <div>
                <span className="volume-label">Consumed</span>
                <span className="volume-value">{scan.consumedMl}ml</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>Confidence</h4>
            <div className={`confidence-detail-${scan.confidence}`}>
              {scan.confidence.charAt(0).toUpperCase() + scan.confidence.slice(1)}
            </div>
          </div>

          {scan.feedbackRating && (
            <div className="detail-section">
              <h4>Your Feedback</h4>
              <p className="detail-value">{scan.feedbackRating.replace("_", " ")}</p>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button className="btn btn-danger" onClick={onDelete}>
            Delete
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
