import { describe, expect, it } from "vitest";
import {
  capabilityQuality,
  createFrameMonitor,
  FRAME_WINDOW,
  QUALITY_TIERS,
  type CapabilitySignals,
} from "../src/lib/qualityPolicy";

const capable: CapabilitySignals = { narrowViewport: false, saveData: false, deviceMemory: 8, hardwareConcurrency: 10 };

describe("capability tier", () => {
  it("starts high on a capable desktop and low on every constrained signal", () => {
    expect(capabilityQuality(capable)).toBe("high");
    for (const constrained of [
      { narrowViewport: true }, { saveData: true }, { deviceMemory: 4 }, { hardwareConcurrency: 4 },
    ]) expect(capabilityQuality({ ...capable, ...constrained }), JSON.stringify(constrained)).toBe("low");
  });

  it("never treats a signal the browser does not expose as constrained", () => {
    expect(capabilityQuality({ narrowViewport: false, saveData: false })).toBe("high");
    expect(capabilityQuality({ ...capable, hardwareConcurrency: 0 })).toBe("high");
  });

  it("documents both tiers statically, the low one strictly cheaper", () => {
    const { high, low } = QUALITY_TIERS;
    expect(low.dpr[1]).toBeLessThan(high.dpr[1]);
    expect(low.environmentSize).toBeLessThan(high.environmentSize);
    expect(low.antialias).toBe(false);
  });
});

describe("frame monitor", () => {
  const feed = (deltas: number[]) => {
    const monitor = createFrameMonitor();
    return deltas.map((delta) => monitor.push(delta)).lastIndexOf(true);
  };
  const smooth = (count: number) => Array.from({ length: count }, () => 16.7);
  const choppy = (count: number) => Array.from({ length: count }, () => 70);

  it("declines after one window of sustained slow frames, and only then", () => {
    expect(feed(choppy(FRAME_WINDOW.frames))).toBe(FRAME_WINDOW.frames - 1);
    expect(feed(choppy(FRAME_WINDOW.frames - 1))).toBe(-1);
  });

  it("keeps the tier through isolated hiccups", () => {
    const hiccups = smooth(FRAME_WINDOW.frames * 4).map((delta, index) => (index % 10 === 0 ? 120 : delta));
    expect(feed(hiccups)).toBe(-1);
  });

  it("does not read a pause or resume gap as a slow frame, but a slow still frame counts", () => {
    // The old rule fed raw deltas of a demand loop to its counter: every wake-up after idle was a "slow frame".
    const wakeUps = Array.from({ length: 200 }, (_, index) => (index % 3 === 0 ? 2500 : 16.7));
    expect(feed(wakeUps)).toBe(-1);
    expect(feed([...choppy(FRAME_WINDOW.frames - 1), FRAME_WINDOW.pauseMs + 1, ...choppy(1)])).toBe(-1);
  });

  it("starts a fresh window after reset and after a verdict", () => {
    const monitor = createFrameMonitor();
    for (const delta of choppy(FRAME_WINDOW.frames - 1)) monitor.push(delta);
    monitor.reset();
    expect(monitor.push(70)).toBe(false);
    const verdicts = choppy(FRAME_WINDOW.frames * 2).map((delta) => monitor.push(delta)).filter(Boolean);
    expect(verdicts.length).toBeGreaterThanOrEqual(1);
  });

  it("ignores non-finite or non-positive deltas", () => {
    expect(feed([Number.NaN, -5, 0, ...smooth(10)])).toBe(-1);
  });
});
