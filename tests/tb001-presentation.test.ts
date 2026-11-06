import { describe, expect, it } from "vitest";
import { createPresentation, writePresentation } from "../src/experience/tb001/presentation";

const input = { progress: 0, isMobile: false, reducedMotion: false, pointerX: 0, pointerY: 0 };
describe("TB-001 integration without chapter choreography", () => {
  it("keeps the current six lateral slots and maps progress directly to the operating cycle", () => {
    const result = createPresentation();
    for (const [progress, x] of [[0, -0.55], [0.2, -1.2], [0.4, 1.15], [0.6, -1.05], [0.8, 1.12], [1, 0]]) {
      expect(writePresentation(result, { ...input, progress })).toBe(result);
      expect(result.x).toBe(x);
      expect(result.cycle).toBe(progress);
      expect(result.explode).toBe(0);
    }
  });

  it("fits the operational orbit radius in a 390x844 viewport without a fixed desktop crop", () => {
    const result = writePresentation(createPresentation(), { ...input, progress: 1, isMobile: true, aspect: 390 / 844 });
    const horizontalHalfWidth = result.cameraZ * Math.tan((38 * Math.PI) / 360) * (390 / 844);
    expect(horizontalHalfWidth).toBeGreaterThanOrEqual(1.86 / 0.88);
    expect(result.x).toBe(0);
  });
});
