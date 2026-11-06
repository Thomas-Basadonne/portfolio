// Dedicated dev-only fixture. Never imported by the product or shipped by Vite's production entry.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TB001Model } from "../../src/experience/CompilerMachine";
import { writePose, type MachinePose } from "../../src/experience/tb001/pose";
import { coreVisibility, collisions, inventory, boundsOnScreen } from "../helpers/tb001-probes";

type ReviewInput = { cycle: number; explode: number; time: number; az: number; el: number; distance: number };
const input: ReviewInput = { cycle: 0, explode: 0, time: 0.5, az: 32, el: 12, distance: 5.6 };
let tick = 0;

function Fixture() {
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [mounted, setMounted] = useState(true);
  const state = useThree();
  useFrame(() => { tick++; });
  const drive = (pose: MachinePose) => {
    writePose(pose, input.cycle, input.explode, input.time);
    const { camera, size } = state;
    // Same camera angles and desktop distance as the v0.4 reference; fit the full Z explode on portrait.
    const fit = Math.max(1, (1.2 + 0.15 * input.explode) / (size.width / size.height));
    const d = input.distance * fit;
    const az = input.az * Math.PI / 180;
    const el = input.el * Math.PI / 180;
    camera.position.set(d * Math.cos(el) * Math.sin(az), d * Math.sin(el), d * Math.cos(el) * Math.cos(az));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  };
  Object.assign(window, { tb001Review: {
    set(next: Partial<ReviewInput> & { quality?: "high" | "low"; mounted?: boolean }) {
      Object.assign(input, next);
      if (next.quality) setQuality(next.quality);
      if (next.mounted !== undefined) setMounted(next.mounted);
      state.invalidate();
      return tick;
    },
    sample() {
      const root = state.scene.getObjectByName("TB-001");
      state.scene.updateMatrixWorld(true);
      const context = state.gl.getContext();
      const debug = context.getExtension("WEBGL_debug_renderer_info");
      return {
        tick, mounted: Boolean(root), quality,
        gpu: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
        calls: state.gl.info.render.calls, triangles: state.gl.info.render.triangles,
        memory: { ...state.gl.info.memory },
        environment: state.scene.environment?.uuid ?? null,
        model: root ? inventory(root) : null,
        bounds: root ? boundsOnScreen(root, state.camera) : null,
        core: root ? coreVisibility(root, state.camera) : null,
      };
    },
    collisions(stride = 1) {
      const root = state.scene.getObjectByName("TB-001");
      if (!root) throw new Error("TB-001 is not mounted");
      return collisions(root, stride);
    },
  } });
  return mounted ? <TB001Model quality={quality} drive={drive} /> : null;
}
createRoot(document.getElementById("root")!).render(
  <StrictMode><Canvas frameloop="demand" camera={{ fov: 30, near: 0.1, far: 100 }} dpr={1} gl={{ alpha: true, antialias: true, toneMapping: THREE.NeutralToneMapping }}><Fixture /></Canvas></StrictMode>,
);
