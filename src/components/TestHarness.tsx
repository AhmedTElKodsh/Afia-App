import { useState } from "react";
import { bottleRegistry } from "../data/bottleRegistry";
import { analyzeBottle } from "../api/apiClient";
import { ImageUpload } from "./ImageUpload";
import type { AnalysisResult } from "../state/appState";
import type { TestResult } from "../utils/exportResults";
import { exportToJSON, exportToCSV } from "../utils/exportResults";
import "./TestHarness.css";

export function TestHarness() {
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  const handleImageSelect = (base64Data: string, fileName: string) => {
    setImageData(base64Data);
    setImageName(fileName);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedSku || !imageData) {
      setError("Please select a bottle and upload an image");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeBottle(selectedSku, imageData);
      setCurrentResult(result);

      // Add to history
      const bottle = bottleRegistry.find((b) => b.sku === selectedSku);
      const testResult: TestResult = {
        id: result.scanId,
        timestamp: new Date().toISOString(),
        sku: selectedSku,
        bottleName: bottle?.name || "Unknown",
        imageName,
        analysisResult: result,
      };
      setTestHistory((prev) => [testResult, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setCurrentResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImageData(null);
    setImageName("");
    setCurrentResult(null);
    setError(null);
  };

  const handleExportJSON = () => {
    if (testHistory.length === 0) {
      alert("No test results to export");
      return;
    }
    exportToJSON(testHistory);
  };

  const handleExportCSV = () => {
    if (testHistory.length === 0) {
      alert("No test results to export");
      return;
    }
    exportToCSV(testHistory);
  };

  return (
    <div className="test-harness">
      <header className="test-header">
        <h1 className="text-section">🧪 Test Harness</h1>
        <p className="text-caption text-secondary">Stage 1: Test image analysis with pre-captured photos</p>
      </header>

      <div className="card test-container">
        <div className="test-controls">
          <div className="control-group">
            <label htmlFor="sku-select">Select Bottle:</label>
            <select
              id="sku-select"
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="sku-select"
            >
              <option value="">-- Choose a bottle --</option>
              {bottleRegistry.map((bottle) => (
                <option key={bottle.sku} value={bottle.sku}>
                  {bottle.name} ({bottle.sku}) - {bottle.totalVolumeMl}ml
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Upload Image:</label>
            <ImageUpload onImageSelect={handleImageSelect} />
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              disabled={!selectedSku || !imageData || isAnalyzing}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Image"}
            </button>
            <button
              className="btn btn-outline"
              onClick={handleReset}
              disabled={isAnalyzing}
            >
              Reset
            </button>
          </div>

          {error && (
            <div className="error-message">
              <span aria-hidden="true">⚠️</span>
              <div>
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}
        </div>

        {currentResult && (
          <div className="current-result">
            <h2>Latest Result</h2>
            <div className="card card-compact result-card">
              <div className="result-row">
                <span className="label">Fill Level:</span>
                <span className="value">{currentResult.fillPercentage}%</span>
              </div>
              <div className="result-row">
                <span className="label">Remaining:</span>
                <span className="value">{currentResult.remainingMl} ml</span>
              </div>
              <div className="result-row">
                <span className="label">Confidence:</span>
                <span
                  className={`value confidence-${currentResult.confidence}`}
                >
                  {currentResult.confidence}
                </span>
              </div>
              <div className="result-row">
                <span className="label">Scan ID:</span>
                <span className="value small">{currentResult.scanId}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="test-history">
        <div className="history-header">
          <h2>Test History ({testHistory.length})</h2>
          <div className="export-buttons">
            <button
              className="btn btn-outline btn-sm"
              onClick={handleExportJSON}
              disabled={testHistory.length === 0}
            >
              Export JSON
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleExportCSV}
              disabled={testHistory.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>

        {testHistory.length === 0 ? (
          <p className="empty-state">No tests run yet</p>
        ) : (
          <div className="history-list">
            {testHistory.map((test) => (
              <div key={test.id} className="card card-compact history-item">
                <div className="history-info">
                  <strong>{test.bottleName}</strong>
                  <span className="history-meta">
                    {test.imageName} &middot;{" "}
                    {new Date(test.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="history-result">
                  <span className="fill-level">
                    {test.analysisResult.fillPercentage}%
                  </span>
                  <span
                    className={`confidence confidence-${test.analysisResult.confidence}`}
                    style={{ fontSize: 'var(--font-size-caption)', textTransform: 'uppercase' }}
                  >
                    {test.analysisResult.confidence}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
