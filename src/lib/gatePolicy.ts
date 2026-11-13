import type { CapabilitySignals } from "./qualityPolicy";

/**
 * Which entry gate (#17) a visit gets.
 * - "interactive": the 3D chunk is preloaded under the boot loader and the Compiler is mounted behind the gate,
 *   orientable by drag.
 * - "poster": a static silhouette of the Compiler; the chunk loads only after entry.
 * Thomas, 12/11/2026: phones get the animated gate too. This revises HOME-01 (#50), which kept the low tier on the
 * poster; the quality tier now decides how the Compiler is drawn, not whether it is. The poster stays for no WebGL,
 * reduced motion, forced colors and save-data (the visitor asked for less), and for a software rasterizer: the live
 * gate before entry blocks the page there (Lighthouse on CI, SwiftShader: TBT 125 s). After entry the scene still
 * loads on it, as before #17.
 */
export type GateMode = "interactive" | "poster";

export type GateSignals = CapabilitySignals & {
  webgl: boolean;
  /** The WebGL renderer's name, when the browser tells it. */
  renderer?: string | null;
  reducedMotion: boolean;
  forcedColors: boolean;
};

/** A software rasterizer (SwiftShader, llvmpipe, Windows' Basic Render Driver), by the renderer's name. */
export function isSoftwareRenderer(renderer: string | null | undefined) {
  return /swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(renderer ?? "");
}

export function gateMode(signals: GateSignals): GateMode {
  if (!signals.webgl || signals.reducedMotion || signals.forcedColors || signals.saveData) return "poster";
  return isSoftwareRenderer(signals.renderer) ? "poster" : "interactive";
}

/** Shortest signed angle from `from` to `to` (radians), so a spun Compiler returns the short way round. */
export function shortestAngle(from: number, to: number) {
  const turn = 2 * Math.PI;
  return ((((to - from) % turn) + 1.5 * turn) % turn) - Math.PI;
}

/**
 * Gate → hero travel (0 = gate, 1 = hero), click at t = 0 (ms). The interface dissolves in 0-400 ms, the Compiler
 * travels in 0-1100 ms, the hero reads from 600 ms and is complete at 1200.
 */
export const GATE_TIMING = { dissolveMs: 400, travelMs: 1100, heroFromMs: 600, heroReadableMs: 1200 } as const;

export function travelAt(elapsedMs: number, reducedMotion = false) {
  if (reducedMotion) return 1;
  const t = Math.min(1, Math.max(0, elapsedMs / GATE_TIMING.travelMs));
  // Symmetric smootherstep: it leaves gently while the interface dissolves, travels, and settles without overshoot.
  // (An ease-out quint put half the travel in the first 150 ms and read as a snap.)
  const eased = t * t * t * (t * (6 * t - 15) + 10);
  return eased > 0.999 ? 1 : eased;
}

/** Hero → gate on a recalibration: the same curve, run back (1 = still at the hero, 0 = back on the gate). */
export function returnAt(elapsedMs: number, reducedMotion = false) {
  return 1 - travelAt(elapsedMs, reducedMotion);
}

/**
 * Boot loader. The loader is in the static HTML and covers the page until what the visit needs is ready: the app,
 * the fonts and, for the interactive gate, the 3D chunk and the first frame of the scene. It never waits on purpose:
 * a cached visit sees it for as long as the work takes. BOOT_CAP_MS after hydration it leaves anyway (Thomas, 13/11: 5 s); the gate
 * then shows the poster and the scene replaces it when it arrives.
 */
export type BootStage = "shell" | "app" | "fonts" | "instrument" | "scene";

const BOOT_WEIGHT: Record<BootStage, number> = { shell: 8, app: 22, fonts: 15, instrument: 35, scene: 20 };
const BOOT_NEEDS: Record<GateMode, readonly BootStage[]> = {
  interactive: ["shell", "app", "fonts", "instrument", "scene"],
  poster: ["shell", "app", "fonts"],
};

export const BOOT_CAP_MS = 5000;

export function bootPercent(reached: ReadonlySet<BootStage>, mode: GateMode) {
  const needs = BOOT_NEEDS[mode];
  if (needs.every((stage) => reached.has(stage))) return 100;
  const total = needs.reduce((sum, stage) => sum + BOOT_WEIGHT[stage], 0);
  const done = needs.reduce((sum, stage) => sum + (reached.has(stage) ? BOOT_WEIGHT[stage] : 0), 0);
  return Math.min(99, Math.round((done / total) * 100));
}
