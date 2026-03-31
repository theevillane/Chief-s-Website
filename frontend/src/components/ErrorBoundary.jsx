import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <div style={{ width: '100%', maxWidth: 500, textAlign: 'center' }}>
            <div style={{ fontSize: 54, marginBottom: 10 }}>⚠️</div>
            <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: 'var(--ink-light)', marginBottom: 18 }}>
              An unexpected error occurred in this part of the portal. Your data is safe.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={this.handleReset}>Try Again</button>
              <button className="btn btn-outline" onClick={() => { window.location.href = '/'; }}>Go to Home</button>
            </div>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre style={{ marginTop: 16, background: 'var(--cream)', fontSize: 12, overflow: 'auto', padding: 12, borderRadius: 'var(--radius-sm)', textAlign: 'left' }}>
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

