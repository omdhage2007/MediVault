import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Activity, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches unexpected rendering errors so a single broken screen cannot blank
 * the whole app. Technical details are logged in development only; users see
 * a plain-language message with a retry and a reload action.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Do not log exception objects or component stacks: rendering errors can
    // contain record metadata, and MediVault must not put medical data in logs.
    void error;
    void info;
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div data-theme="light" className="grid min-h-screen place-items-center bg-[var(--bg)] p-6">
        <div
          role="alert"
          className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-xl"
        >
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[var(--primary)] text-white">
            <Activity className="h-6 w-6" strokeWidth={2.2} aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-[var(--text)]">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            MediVault hit an unexpected problem on this screen. Nothing was sent anywhere — reload to keep going.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--tint)]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
