import { describe, expect, it } from "vitest";
import { CORE_FLASH_MS, CORE_HOVER_MS, CORE_TARGET_RADIUS, coreFlash, coreHover, hitsCore } from "../src/experience/tb001/coreTap";

describe("core tap (#47, L1)", () => {
  it("hits within the projected core, never with a target under 44 px", () => {
    const small = { x: 100, y: 100, r: 6, visible: true };
    expect(hitsCore(100 + CORE_TARGET_RADIUS, 100, small)).toBe(true);
    expect(hitsCore(100 + CORE_TARGET_RADIUS + 1, 100, small)).toBe(false);
    const large = { x: 100, y: 100, r: 60, visible: true };
    expect(hitsCore(150, 120, large)).toBe(true);
    expect(hitsCore(100, 100, { ...large, visible: false })).toBe(false);
  });

  it("pulses the light down to nothing, or holds it flat without motion", () => {
    expect(coreFlash(0, false)).toBe(1);
    expect(coreFlash(CORE_FLASH_MS / 2, false)).toBeCloseTo(0.25);
    expect(coreFlash(CORE_FLASH_MS, false)).toBe(0);
    expect(coreFlash(CORE_FLASH_MS / 2, true)).toBe(1);
    expect(coreFlash(CORE_FLASH_MS, true)).toBe(0);
    expect(coreFlash(-1, false)).toBe(0);
  });

  it("breathes under the mouse, and holds a steady glow when motion is off", () => {
    const samples = Array.from({ length: 8 }, (_, i) => coreHover((i / 8) * CORE_HOVER_MS, false));
    expect(Math.min(...samples)).toBeGreaterThan(0);
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.4);
    expect(coreHover(0, true)).toBe(coreHover(CORE_HOVER_MS / 4, true));
    expect(coreHover(0, true)).toBeGreaterThan(0);
  });
});
