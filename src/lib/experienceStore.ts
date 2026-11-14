export type RenderQuality = "low" | "high";

export const experienceStore = {
  progress: 0,
  targetProgress: 0,
  pointerX: 0,
  pointerY: 0,
  reducedMotion: false,
  isMobile: false,
  entered: false,
  paused: true,
  userPaused: false,
  /** Continuous story position (chapter index + progress through it), spring-smoothed. */
  story: 0,
  /** Horizontal place of the model in the stage: 0 = left column, 1 = right column (spring-smoothed). */
  side: 0.5,
  /** Share of the stage width the model is framed in: one column (0.5) beside the text, or the whole band. */
  region: 1,
  /** Portrait reading band: 1 = full band, 0 = reading band (spring-smoothed, instant under reduced motion). */
  bandOpen: 1,
  /** Pixels of the band hidden from its bottom edge; the camera frames the model in what stays visible. */
  bandCut: 0,
  chapter: 0,
  stageProgress: 0,
  stageVisible: true,
  motionTime: 0,
  interacting: false,
  quality: "high" as RenderQuality,
  requestRender: null as null | (() => void),
  /**
   * Entry gate (#17). `gate` blends the framing: 1 = the Compiler centred in `gateBox` (viewport px), 0 = its hero
   * place. `gateYaw`/`gatePitch` are the visitor's drag on top of the hero orientation (radians).
   */
  gate: 0,
  gateYaw: 0,
  gatePitch: 0,
  gateBox: { x: 0, y: 0, size: 0 },
  /**
   * While `gating`, the canvas covers the viewport and the hero framing is computed for `heroBox`, the box the
   * canvas takes back in the page (viewport px). `settleCanvas` resizes and redraws the canvas in the same frame.
   */
  gating: false,
  heroBox: null as null | { x: number; y: number; width: number; height: number },
  settleCanvas: null as null | (() => void),
};

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const smoothRange = (value: number, start: number, end: number) => {
  const normalized = clamp01((value - start) / (end - start));
  return normalized * normalized * (3 - 2 * normalized);
};
