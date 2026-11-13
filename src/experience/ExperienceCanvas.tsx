import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { experienceStore, type RenderQuality } from "../lib/experienceStore";
import { capabilityQuality, createFrameMonitor, QUALITY_TIERS } from "../lib/qualityPolicy";
import { reportClientError } from "../lib/reportClientError";
import { NeutralToneMapping, SRGBColorSpace } from "three";
import { CompilerMachine } from "./CompilerMachine";

type ExperienceCanvasProps = {
  onReady: () => void;
  onFailure: () => void;
};

type NavigatorCapabilities = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

function deviceQuality(): RenderQuality {
  const capabilities = navigator as NavigatorCapabilities;
  return capabilityQuality({
    narrowViewport: window.matchMedia("(max-width: 760px)").matches,
    saveData: capabilities.connection?.saveData === true,
    deviceMemory: capabilities.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  });
}

function RenderBridge() {
  const invalidate = useThree((state) => state.invalidate);
  const get = useThree((state) => state.get);

  useEffect(() => {
    experienceStore.requestRender = invalidate;
    // The entry gate (#17) moves the canvas between the viewport and its page box. Waiting for the resize observer
    // would show one frame of the old buffer in the new box: resize and draw now, before the browser paints.
    const settle = () => {
      const { gl, setSize, advance } = get();
      const box = gl.domElement.parentElement?.getBoundingClientRect();
      if (!box || box.width < 1 || box.height < 1) return;
      setSize(box.width, box.height, box.top, box.left);
      advance(performance.now());
    };
    experienceStore.settleCanvas = settle;
    invalidate();
    return () => {
      if (experienceStore.requestRender === invalidate) experienceStore.requestRender = null;
      if (experienceStore.settleCanvas === settle) experienceStore.settleCanvas = null;
    };
  }, [get, invalidate]);

  return null;
}

function SceneLifecycle({
  quality,
  onDecline,
}: {
  quality: RenderQuality;
  onDecline: () => void;
}) {
  const monitor = useMemo(createFrameMonitor, []);
  const lastFrame = useRef(0);

  // Every rendered frame counts, scrolling or not: a frame that takes 140 ms is slow even while the page is still.
  // What is dropped is the gap that is not a frame time — after a pause, a hidden tab or a closed drawer.
  useFrame(() => {
    const now = performance.now();
    const previous = lastFrame.current;
    lastFrame.current = now;
    if (quality === "low") return;
    if (experienceStore.paused || previous === 0) monitor.reset();
    else if (monitor.push(now - previous)) onDecline();
  });

  return null;
}

export function ExperienceCanvas({ onReady, onFailure }: ExperienceCanvasProps) {
  const [capable, setCapable] = useState<RenderQuality>(deviceQuality);
  // A measured slowdown is final for the session: no upgrade, so no flapping between tiers (each switch
  // rebuilds the environment and the model).
  const [declined, setDeclined] = useState(false);
  const quality: RenderQuality = declined ? "low" : capable;
  const tier = QUALITY_TIERS[quality];

  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 760px)");
    const update = () => setCapable(deviceQuality());
    viewport.addEventListener("change", update);
    return () => viewport.removeEventListener("change", update);
  }, []);

  // One source of truth: the controller's cadence reads the store, the canvas reads this component's state.
  useEffect(() => {
    experienceStore.quality = quality;
    experienceStore.requestRender?.();
  }, [quality]);

  return (
    <div className="webgl-shell" aria-hidden="true" data-quality={quality}>
      <Canvas
        camera={{ fov: 38, near: 0.1, far: 70, position: [0, 0, 7.1] }}
        dpr={[...tier.dpr]}
        frameloop="demand"
        gl={{
          alpha: true,
          toneMapping: NeutralToneMapping,
          toneMappingExposure: 1,
          outputColorSpace: SRGBColorSpace,
          // Fixed when the context is created: a later downgrade keeps the antialiased buffer.
          antialias: tier.antialias,
          powerPreference: tier.powerPreference,
        }}
        onCreated={({ gl }) => {
          // A shader that fails to link would otherwise leave an empty stage: hand over to the fallback.
          gl.debug.onShaderError = () => {
            reportClientError("visual", new Error("WebGL shader failed to compile"));
            onFailure();
          };
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
          onDecline={() => setDeclined(true)}
        />
        <Suspense fallback={null}>
          {/* Ready once the model is drawn: its build is split over several tasks. */}
          <CompilerMachine quality={quality} onBuilt={onReady} onFailure={(error) => {
            reportClientError("visual", error);
            onFailure();
          }} />
        </Suspense>
      </Canvas>
    </div>
  );
}
