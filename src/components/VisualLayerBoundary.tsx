import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportClientError } from "../lib/reportClientError";

type VisualLayerBoundaryProps = {
  children: ReactNode;
  onFailure: () => void;
};

type VisualLayerBoundaryState = { failed: boolean };

export class VisualLayerBoundary extends Component<
  VisualLayerBoundaryProps,
  VisualLayerBoundaryState
> {
  state: VisualLayerBoundaryState = { failed: false };

  static getDerivedStateFromError(): VisualLayerBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError("visual", error, info.componentStack ?? undefined);
    this.props.onFailure();
  }

  render() {
    if (this.state.failed) return <div className="webgl-fallback" aria-hidden="true" />;
    return this.props.children;
  }
}
