import { describe, expect, it } from "vitest";
import { experienceReducer, resolveInitialExperiencePhase } from "../src/lib/experienceState";

describe("experience state", () => {
  it("shows entry only for a first top-level visit", () => {
    expect(
      resolveInitialExperiencePhase({ hasDeepLink: false, isReload: false, wasEntered: false }),
    ).toBe("entry");
  });

  it.each([
    { hasDeepLink: true, isReload: false, wasEntered: false },
    { hasDeepLink: false, isReload: true, wasEntered: false },
    { hasDeepLink: false, isReload: false, wasEntered: true },
  ])("skips entry for navigation that already has context", (input) => {
    expect(resolveInitialExperiencePhase(input)).toBe("loading");
  });

  it("goes back to the gate on a recalibration, from any phase (#17)", () => {
    for (const phase of ["loading", "ready", "failed", "entry"] as const) {
      expect(experienceReducer(phase, { type: "EXIT" })).toBe("entry");
    }
    // Entering again runs the usual path: the scene kept on the gate makes it ready at once.
    expect(experienceReducer(experienceReducer("ready", { type: "EXIT" }), { type: "ENTER" })).toBe("loading");
  });

  it("allows only valid visual-layer transitions", () => {
    expect(experienceReducer("entry", { type: "CANVAS_READY" })).toBe("entry");
    expect(experienceReducer("entry", { type: "ENTER" })).toBe("loading");
    expect(experienceReducer("loading", { type: "CANVAS_READY" })).toBe("ready");
    expect(experienceReducer("loading", { type: "CANVAS_FAILED" })).toBe("failed");
  });
});
