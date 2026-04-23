import { BottleFillGauge } from "./BottleFillGauge.tsx";
import { ConfidenceBadge } from "./ConfidenceBadge.tsx";
import { FeedbackGrid } from "./FeedbackGrid.tsx";
import "./VisualRegressionHarness.css";

export function VisualRegressionHarness() {
  return (
    <div className="visual-regression-harness" data-testid="visual-harness">
      <section className="harness-section">
        <h2>BottleFillGauge</h2>
        <div className="harness-grid">
          <div className="harness-item" data-testid="gauge-75">
            <span className="harness-label">75%</span>
            <BottleFillGauge percentage={75} animate={false} />
          </div>
          <div className="harness-item" data-testid="gauge-40">
            <span className="harness-label">40%</span>
            <BottleFillGauge percentage={40} animate={false} />
          </div>
          <div className="harness-item" data-testid="gauge-15">
            <span className="harness-label">15%</span>
            <BottleFillGauge percentage={15} animate={false} />
          </div>
        </div>
      </section>

      <section className="harness-section">
        <h2>ConfidenceBadge</h2>
        <div className="harness-grid">
          <div className="harness-item" data-testid="confidence-high">
            <span className="harness-label">High</span>
            <ConfidenceBadge level="high" />
          </div>
          <div className="harness-item" data-testid="confidence-medium">
            <span className="harness-label">Medium</span>
            <ConfidenceBadge level="medium" />
          </div>
          <div className="harness-item" data-testid="confidence-low">
            <span className="harness-label">Low</span>
            <ConfidenceBadge level="low" />
          </div>
        </div>
      </section>

      <section className="harness-section">
        <h2>FeedbackGrid</h2>
        <div className="harness-grid">
          <div className="harness-item" data-testid="feedback-default">
            <span className="harness-label">Default</span>
            <FeedbackGrid 
              onSubmit={() => {}} 
              isSubmitting={false}
              hasSubmitted={false}
            />
          </div>
          <div className="harness-item" data-testid="feedback-selected">
            <span className="harness-label">Submitting</span>
            <FeedbackGrid 
              onSubmit={() => {}} 
              isSubmitting={true}
              hasSubmitted={false}
            />
          </div>
          <div className="harness-item" data-testid="feedback-confirmed">
            <span className="harness-label">Confirmed</span>
            <FeedbackGrid 
              onSubmit={() => {}} 
              isSubmitting={false}
              hasSubmitted={true}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
