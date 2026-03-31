import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Something went wrong. Please try again later.';
      let errorDetails = null;

      try {
        // Try to parse our custom Firestore error JSON
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore ${parsed.operationType} error at ${parsed.path || 'unknown path'}.`;
            errorDetails = parsed.error;
          }
        }
      } catch (e) {
        // Not a JSON error, use the standard message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-surface-container rounded-3xl border border-outline/20 text-center">
          <div className="w-12 h-12 bg-error/10 text-error rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-headline font-black text-on-surface uppercase tracking-tight mb-2">
            Application Error
          </h2>
          <p className="text-on-surface-variant text-sm mb-6 max-w-md">
            {errorMessage}
          </p>
          {errorDetails && (
            <pre className="text-[10px] bg-surface-container-highest p-3 rounded-lg mb-6 max-w-full overflow-auto font-mono text-error">
              {errorDetails}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={16} />
            <span>Reload App</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
