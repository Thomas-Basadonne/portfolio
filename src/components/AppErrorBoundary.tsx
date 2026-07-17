import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportClientError } from "../lib/reportClientError";

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { failed: boolean };

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError("application", error, info.componentStack ?? undefined);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="app-fallback">
        <p className="mono-label">TB / resilient mode</p>
        <h1>Thomas Basadonne</h1>
        <p>
          Frontend and creative developer working across resilient commerce systems,
          intelligent products and unusual interfaces.
        </p>
        <a href="https://it.linkedin.com/in/thomasbasadonne">Continue on LinkedIn</a>
      </main>
    );
  }
}
