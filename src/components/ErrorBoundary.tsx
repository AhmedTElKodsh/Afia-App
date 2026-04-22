import { Component, type ReactNode, type ErrorInfo } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw } from "lucide-react";
import "./ErrorBoundary.css";

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays fallback UI instead of crashing.
 */

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { t, i18n } = this.props;
    const isRTL = i18n.language === 'ar';

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-root" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="error-boundary-card card card-compact">
            <div className="error-boundary-icon">
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>

            <h2 className="error-boundary-title">{t('errorBoundary.title')}</h2>

            <p className="error-boundary-description">
              {t('errorBoundary.description')}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>{t('errorBoundary.details')}</summary>
                <pre className="error-boundary-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-boundary-actions">
              <button
                className="btn btn-primary"
                onClick={this.handleRetry}
              >
                <RefreshCw size={18} strokeWidth={2} />
                {t('errorBoundary.retry')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryClass);

