import { describe, expect, it } from "vitest";
import { MOTION_RATES, motionCadence, type MotionConditions } from "../src/lib/motionPolicy";

const visible: MotionConditions = {
  entered: true, ready: true, drawerOpen: false, hidden: false, forcedColors: false, reducedMotion: false,
  userPaused: false, stageVisible: true, interacting: false, ambient: true, quality: "high",
};

describe("motion cadence policy", () => {
  it("requests the idle cadence for a visible ambient stage and the active cadence while interacting", () => {
    expect(motionCadence(visible)).toBe(MOTION_RATES.high.idle);
    expect(motionCadence({ ...visible, quality: "low" })).toBe(MOTION_RATES.low.idle);
    expect(motionCadence({ ...visible, interacting: true })).toBe(MOTION_RATES.high.active);
    expect(motionCadence({ ...visible, interacting: true, ambient: false })).toBe(MOTION_RATES.high.active);
  });

  it("holds chapters without ambient gestures still when nothing is happening", () => {
    expect(motionCadence({ ...visible, ambient: false })).toBe(0);
  });

  it("stops continuous motion for every suspension cause", () => {
    for (const cause of [
      { entered: false }, { ready: false }, { drawerOpen: true }, { hidden: true }, { forcedColors: true },
      { reducedMotion: true }, { userPaused: true }, { stageVisible: false },
    ]) {
      expect(motionCadence({ ...visible, interacting: true, ...cause }), JSON.stringify(cause)).toBe(0);
    }
  });
});
