import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { experienceStore } from "../lib/experienceStore";
import { reportClientError } from "../lib/reportClientError";
import { ToleranceMachine } from "./ToleranceMachine";

type ExperienceCanvasProps = {
  onReady: () => void;
  onFailure: () => void;
};

type NavigatorCapabilities = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

function initialQuality(): "low" | "high" {
  const capabilities = navigator as NavigatorCapabilities;
  const constrained =
    window.matchMedia("(max-width: 760px)").matches ||
    capabilities.connection?.saveData === true ||
    (capabilities.deviceMemory !== undefined && capabilities.deviceMemory <= 4) ||
    navigator.hardwareConcurrency <= 4;
  return constrained ? "low" : "high";
}

function RenderBridge() {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    experienceStore.requestRender = invalidate;
    invalidate();
    return () => {
      if (experienceStore.requestRender === invalidate) experienceStore.requestRender = null;
    };
  }, [invalidate]);

  return null;
}

function SceneLifecycle({
  quality,
  onDecline,
  onReady,
}: {
  quality: "low" | "high";
  onDecline: () => void;
  onReady: () => void;
}) {
  const slowFrames = useRef(0);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useFrame((_, delta) => {
    if (quality === "low") return;
    slowFrames.current = delta > 0.04 ? slowFrames.current + 1 : Math.max(0, slowFrames.current - 1);
    if (slowFrames.current >= 5) onDecline();
  });

  return null;
}

export function ExperienceCanvas({ onReady, onFailure }: ExperienceCanvasProps) {
  const [quality, setQuality] = useState<"low" | "high">(initialQuality);

  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 760px)");
    const update = () => setQuality(initialQuality());
    viewport.addEventListener("change", update);
    return () => viewport.removeEventListener("change", update);
  }, []);

  const applyQuality = (nextQuality: "low" | "high") => {
    experienceStore.quality = nextQuality;
    setQuality(nextQuality);
    experienceStore.requestRender?.();
  };

  return (
    <div className="webgl-shell" aria-hidden="true">
      <Canvas
        camera={{ fov: 38, near: 0.1, far: 70, position: [0, 0, 7.1] }}
        dpr={quality === "high" ? [1, 1.5] : [0.65, 1]}
        frameloop="demand"
        gl={{
          alpha: true,
          antialias: quality === "high",
          powerPreference: quality === "high" ? "high-performance" : "default",
        }}
        onCreated={({ gl }) => {
          gl.domElement.dataset.contextGuard = "ready";
          gl.domElement.addEventListener(
            "webglcontextlost",
            (event) => {
              event.preventDefault();
              reportClientError("visual", new Error("WebGL context lost"));
              onFailure();
            },
            { once: true },
          );
        }}
      >
        <RenderBridge />
        <SceneLifecycle
          quality={quality}
          onDecline={() => applyQuality("low")}
          onReady={onReady}
        />
        <Suspense fallback={null}>
          <ToleranceMachine quality={quality} />
        </Suspense>
      </Canvas>
    </div>
  );
}
