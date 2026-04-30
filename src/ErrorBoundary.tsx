import { Component, type ReactNode, type ErrorInfo } from 'react';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 32, color: '#fff', background: '#111', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <h1>Something went wrong</h1>
        <p>Reload the page to retry.</p>
        <button
          onClick={() => location.reload()}
          style={{ padding: '12px 24px', marginTop: 16 }}
        >
          Reload
        </button>
      </div>
    );
  }
}
