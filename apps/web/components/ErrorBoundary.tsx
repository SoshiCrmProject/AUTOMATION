import { Component, ReactNode } from 'react';
import { useTranslation } from 'next-i18next';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry, LogRocket, etc.
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '40px',
            textAlign: 'center',
            background: 'var(--color-surface)',
          }}
          role="alert"
          aria-live="assertive"
        >
          <div
            style={{
              fontSize: '64px',
              marginBottom: '24px',
              opacity: 0.5,
            }}
          >
            ⚠️
          </div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--color-text)',
              marginBottom: '12px',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--color-text-muted)',
              marginBottom: '32px',
              maxWidth: '500px',
            }}
          >
            We're sorry, but something unexpected happened. Please try refreshing the page.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div
              style={{
                background: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '24px',
                maxWidth: '600px',
                textAlign: 'left',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            >
              <strong style={{ color: 'var(--color-error)' }}>
                {this.state.error.name}: {this.state.error.message}
              </strong>
              {this.state.error.stack && (
                <pre
                  style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '200px',
                  }}
                >
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}
          <button
            className="btn"
            onClick={() => window.location.reload()}
            style={{ minWidth: '200px' }}
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;