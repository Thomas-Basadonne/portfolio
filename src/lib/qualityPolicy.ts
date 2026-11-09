import type { RenderQuality } from "./experienceStore";

/**
 * Static render tiers. Design targets, not measurements: see docs/PERFORMANCE.md for what each one costs.
 * Geometry and texture sizes per tier live next to the code that builds them (machine.ts, textures.ts);
 * the cadence per tier lives in motionPolicy.ts.
 */
export const QUALITY_TIERS = {
  high: { dpr: [1, 1.5], antialias: true, powerPreference: "high-performance", environmentSize: 256 },
  low: { dpr: [0.65, 1], antialias: false, powerPreference: "default", environmentSize: 128 },
} as const satisfies Record<RenderQuality, {
  dpr: readonly [number, number];
  antialias: boolean;
  powerPreference: WebGLPowerPreference;
  environmentSize: number;
}>;

export type CapabilitySignals = {
  narrowViewport: boolean;
  saveData: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

/** The tier a device starts in. Unknown signals never count as constrained. */
export function capabilityQuality(signals: CapabilitySignals): RenderQuality {
  const constrained =
    signals.narrowViewport ||
    signals.saveData ||
    (signals.deviceMemory !== undefined && signals.deviceMemory <= 4) ||
    (signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency > 0 && signals.hardwareConcurrency <= 4);
  return constrained ? "low" : "high";
}

/**
 * Downgrade criterion, measured over continuously rendered frames. The scene renders on demand, so the time
 * between two frames after an idle stretch, a hidden tab or a closed drawer says nothing about the GPU; those
 * gaps are dropped, while a frame that takes long even when nothing moves still counts.
 */
export const FRAME_WINDOW = {
  /** Active frames per evaluation window. */
  frames: 45,
  /** A frame this far from the previous one is slow: 20 fps or less, below the 30 fps low-tier active target. */
  slowMs: 50,
  /** A gap this long is a pause or a resume, not a frame time: it is dropped and the window starts over. */
  pauseMs: 400,
  /** Share of slow frames in a full window that triggers the downgrade. */
  slowShare: 0.4,
} as const;

export type FrameMonitor = {
  /** Feed the time since the previous rendered frame. Returns true once when a full window was sustained slow. */
  push(deltaMs: number): boolean;
  /** Call whenever frames stop being continuous (idle, paused, hidden). */
  reset(): void;
};

export function createFrameMonitor(window: typeof FRAME_WINDOW = FRAME_WINDOW): FrameMonitor {
  let frames = 0;
  let slow = 0;
  const reset = () => { frames = 0; slow = 0; };
  return {
    reset,
    push(deltaMs) {
      if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > window.pauseMs) { reset(); return false; }
      frames += 1;
      if (deltaMs > window.slowMs) slow += 1;
      if (frames < window.frames) return false;
      const sustained = slow / frames >= window.slowShare;
      reset();
      return sustained;
    },
  };
}
