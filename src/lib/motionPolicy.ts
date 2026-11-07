import type { RenderQuality } from "./experienceStore";

/** Requested draw cadence, not a guarantee about hardware FPS or GPU execution time. */
export const MOTION_RATES = { high: { active: 60, idle: 30 }, low: { active: 30, idle: 15 } } as const;

export type MotionConditions = {
  entered: boolean;
  ready: boolean;
  drawerOpen: boolean;
  hidden: boolean;
  forcedColors: boolean;
  reducedMotion: boolean;
  userPaused: boolean;
  stageVisible: boolean;
  interacting: boolean;
  ambient: boolean;
  quality: RenderQuality;
};

export function motionCadence(state: MotionConditions): number {
  if (!state.entered || !state.ready || state.drawerOpen || state.hidden || state.forcedColors ||
    state.reducedMotion || state.userPaused || !state.stageVisible) return 0;
  if (state.interacting) return MOTION_RATES[state.quality].active;
  return state.ambient ? MOTION_RATES[state.quality].idle : 0;
}
