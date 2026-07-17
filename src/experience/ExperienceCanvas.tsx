import { Component, Suspense, useState, type ErrorInfo, type ReactNode } from "react";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { experienceStore } from "../lib/experienceStore";
import { ToleranceMachine } from "./ToleranceMachine";

type BoundaryState = { failed: boolean };

class WebGLBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("WebGL layer disabled; semantic portfolio remains available.", error, info);
  }

  render() {
    if (this.state.failed) {
      return <div className="webgl-fallback" aria-hidden="true" />;
    }
    return this.props.children;
  }
}

export function ExperienceCanvas() {
  const [quality, setQuality] = useState<"low" | "high">(() =>
    experienceStore.isMobile || window.matchMedia("(max-width: 760px)").matches ? "low" : "high",
  );

  const applyQuality = (nextQuality: "low" | "high") => {
    experienceStore.quality = nextQuality;
    setQuality(nextQuality);
  };

  return (
    <div className="webgl-shell" aria-hidden="true">
      <WebGLBoundary>
        <Canvas
          camera={{ fov: 38, near: 0.1, far: 70, position: [0, 0, 7.1] }}
          dpr={quality === "high" ? [1, 1.65] : [0.65, 1]}
          gl={{
            alpha: true,
            antialias: quality === "high",
            powerPreference: "high-performance",
          }}
        >
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => applyQuality("low")}
            onIncline={() => {
              if (!experienceStore.isMobile) applyQuality("high");
            }}
          />
          <AdaptiveDpr pixelated />
          <Suspense fallback={null}>
            <ToleranceMachine quality={quality} />
          </Suspense>
        </Canvas>
      </WebGLBoundary>
    </div>
  );
}
