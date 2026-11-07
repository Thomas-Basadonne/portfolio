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
  chapter: 0,
  stageProgress: 0,
  stageVisible: true,
  motionTime: 0,
  interacting: false,
  quality: "high" as RenderQuality,
  requestRender: null as null | (() => void),
};

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const smoothRange = (value: number, start: number, end: number) => {
  const normalized = clamp01((value - start) / (end - start));
  return normalized * normalized * (3 - 2 * normalized);
};
