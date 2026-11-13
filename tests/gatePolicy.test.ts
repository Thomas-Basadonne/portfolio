import { describe, expect, it } from "vitest";
import { BOOT_CAP_MS, bootPercent, returnAt, GATE_TIMING, gateMode, shortestAngle, travelAt } from "../src/lib/gatePolicy";

const desktop = { webgl: true, reducedMotion: false, forcedColors: false, narrowViewport: false, saveData: false };

describe("gate mode (#17)", () => {
  it("is interactive wherever WebGL runs, phones and low tiers included (Thomas, 12/11)", () => {
    expect(gateMode(desktop)).toBe("interactive");
    expect(gateMode({ ...desktop, narrowViewport: true })).toBe("interactive");
    expect(gateMode({ ...desktop, deviceMemory: 4, hardwareConcurrency: 4 })).toBe("interactive");
  });

  it("falls back to the poster with no preload for no WebGL, reduced motion, forced colors and save-data", () => {
    expect(gateMode({ ...desktop, webgl: false })).toBe("poster");
    expect(gateMode({ ...desktop, reducedMotion: true })).toBe("poster");
    expect(gateMode({ ...desktop, saveData: true })).toBe("poster");
    expect(gateMode({ ...desktop, forcedColors: true })).toBe("poster");
  });
});

describe("boot loader progress", () => {
  it("reaches 100 only once every stage the visit needs is done", () => {
    expect(bootPercent(new Set(["shell"]), "interactive")).toBeLessThan(100);
    expect(bootPercent(new Set(["shell", "app", "fonts", "instrument"]), "interactive")).toBeLessThan(100);
    expect(bootPercent(new Set(["shell", "app", "fonts", "instrument", "scene"]), "interactive")).toBe(100);
    // The poster gate has no instrument to wait for.
    expect(bootPercent(new Set(["shell", "app", "fonts"]), "poster")).toBe(100);
  });

  it("never goes backwards as stages arrive, in any order", () => {
    const order = ["shell", "fonts", "app", "scene", "instrument"] as const;
    const reached = new Set<(typeof order)[number]>();
    let last = 0;
    for (const stage of order) {
      reached.add(stage);
      const value = bootPercent(reached, "interactive");
      expect(value).toBeGreaterThanOrEqual(last);
      last = value;
    }
    expect(last).toBe(100);
  });

  it("caps the wait: a slow network gets the gate, not an endless loader", () => {
    expect(BOOT_CAP_MS).toBe(5000);
  });
});

describe("gate travel", () => {
  it("returns a spun Compiler the short way round", () => {
    expect(shortestAngle(0, 0.5)).toBeCloseTo(0.5);
    expect(shortestAngle(0, 2 * Math.PI + 0.5)).toBeCloseTo(0.5);
    expect(shortestAngle(0, -2 * Math.PI - 0.5)).toBeCloseTo(-0.5);
    expect(Math.abs(shortestAngle(3, -3))).toBeLessThanOrEqual(Math.PI);
  });

  it("starts at the gate, never overshoots and rests at the hero by the end of the travel", () => {
    const samples = Array.from({ length: 23 }, (_, index) => travelAt(index * 50));
    expect(samples[0]).toBe(0);
    for (let index = 1; index < samples.length; index += 1) expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1]);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(travelAt(GATE_TIMING.travelMs)).toBe(1);
  });

  it("jumps straight to the hero under reduced motion", () => {
    expect(travelAt(0, true)).toBe(1);
  });

  it("runs the same curve back to the gate on a recalibration", () => {
    for (const t of [0, 200, 550, 900, 1100]) expect(returnAt(t)).toBeCloseTo(1 - travelAt(t));
  });

  it("keeps the hero readable within 1.2 s of the click", () => {
    expect(GATE_TIMING.heroReadableMs).toBeLessThanOrEqual(1200);
    expect(GATE_TIMING.travelMs).toBeLessThanOrEqual(GATE_TIMING.heroReadableMs);
  });
});
