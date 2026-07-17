export type RenderQuality = "low" | "high";

export const experienceStore = {
  progress: 0,
  targetProgress: 0,
  pointerX: 0,
  pointerY: 0,
  reducedMotion: false,
  isMobile: false,
  entered: false,
  quality: "high" as RenderQuality,
};

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const smoothRange = (value: number, start: number, end: number) => {
  const normalized = clamp01((value - start) / (end - start));
  return normalized * normalized * (3 - 2 * normalized);
};
