import { describe, expect, it } from "vitest";
import { pose, type MachinePose } from "../src/experience/tb001/pose";
import { READOUT_PARTS, createReadout, sameReadout, writeReadout, type ReadoutPart } from "../src/experience/tb001/readout";

const read = (cycle: number, explode = 0) => ({ ...writeReadout(createReadout(), cycle, explode) });

describe("TB-001 model readout (#20)", () => {
  it("reads known fixtures: state, contextual percentage and active part", () => {
    expect(read(0)).toEqual({ state: 0, metric: "cycle", value: 0, part: null });
    expect(read(0.2)).toEqual({ state: 1, metric: "cycle", value: 20, part: "outer" });
    expect(read(0.35)).toEqual({ state: 1, metric: "cycle", value: 35, part: "outer" });
    expect(read(0.5)).toEqual({ state: 2, metric: "cycle", value: 50, part: "rings" });
    expect(read(0.745)).toEqual({ state: 2, metric: "cycle", value: 75, part: "outer" });
    expect(read(0.75)).toEqual({ state: 3, metric: "cycle", value: 75, part: "rings" });
    expect(read(0.85)).toEqual({ state: 3, metric: "cycle", value: 85, part: "core" });
    expect(read(1)).toEqual({ state: 3, metric: "cycle", value: 100, part: "core" });
    expect(read(1, 0.2)).toEqual({ state: 3, metric: "explode", value: 20, part: "outer" });
    expect(read(1, 0.48)).toEqual({ state: 3, metric: "explode", value: 48, part: "inner" });
    expect(read(1, 0.62)).toEqual({ state: 3, metric: "explode", value: 62, part: "joints" });
    expect(read(1, 0.66)).toEqual({ state: 3, metric: "explode", value: 66, part: "rings" });
    expect(read(1, 0.72)).toEqual({ state: 3, metric: "explode", value: 72, part: "core" });
    expect(read(1, 1)).toEqual({ state: 3, metric: "explode", value: 100, part: "core" });
  });

  it("switches the percentage on the model value, not on the chapter", () => {
    // Work completes the cycle (0.68 → 1) before the parts separate: that stretch still reads CYCLE.
    expect(read(0.9, 0).metric).toBe("cycle");
    expect(read(1, 0.001).metric).toBe("explode");
    expect(read(1, 0.001).value).toBe(0);
  });

  it("clamps, rounds and normalises its inputs", () => {
    expect(read(2, -1)).toEqual(read(1, 0));
    expect(read(Number.NaN, Number.NaN)).toEqual(read(0, 0));
    expect(read(0.125).value).toBe(13);
    expect(read(0.124).value).toBe(12);
    expect(read(1, 0.995).value).toBe(100);
  });

  it("reuses its target and compares by value", () => {
    const target = createReadout();
    expect(writeReadout(target, 0.6, 0)).toBe(target);
    expect(sameReadout(read(0.6), read(0.601))).toBe(true);
    expect(sameReadout(read(0.6), read(0.62))).toBe(false);
  });
});

/*
 * The approved invariant, measured on the real pose: the named part moves (its drivers change between x - h and x + h),
 * or nothing mechanical moves and the name is the last part that moved; one exception, the core in cycle [0.85, 1].
 * t = 1 so the inner ring's oscillation amplitude (cycle 0.75–0.85) shows in its angle.
 */
const T = 1;
const H = 1e-3;
const drivers = (p: MachinePose): Record<ReadoutPart, number[]> => ({
  outer: [p.oblo.rotZ, p.oblo.z, p.oblo.hinge, ...p.petals.flatMap((petal) => [petal.d, petal.twist]), p.offsets.shellFront, p.offsets.shellRear],
  inner: [...p.inner.flatMap((sector) => [sector.d, sector.dx]), p.offsets.inner],
  joints: [p.jointsExt, p.offsets.joints],
  rings: [p.rings.a1, p.rings.a2, p.rings.a3, p.offsets.ringOuter, p.offsets.ringMid, p.offsets.ringInner],
  core: [p.offsets.core, p.offsets.process, p.core.rot],
});
const moving = (before: MachinePose, after: MachinePose) => {
  const a = drivers(before), b = drivers(after);
  return READOUT_PARTS.filter((part) => a[part].some((value, index) => Math.abs(b[part][index] - value) > 1e-9));
};

describe("TB-001 readout invariant on the real pose", () => {
  for (const axis of ["cycle", "explode"] as const) {
    it(`names a part that actually moves along ${axis}`, () => {
      const failures: string[] = [];
      let last: ReadoutPart | null = null;
      for (let i = 0; i <= 1000; i += 1) {
        const x = i / 1000;
        const at = (v: number) => (axis === "cycle" ? pose(v, 0, T) : pose(1, v, T));
        const name = axis === "cycle" ? read(x).part : read(1, x).part;
        // Explode 0 is the cycle's end state; the teardown readout starts above it.
        if (axis === "explode" && x === 0) continue;
        const now = moving(at(Math.max(0, x - H)), at(Math.min(1, x + H)));
        const ok = name === null ? now.length === 0
          : now.includes(name) || (now.length === 0 && name === last)
            || (axis === "cycle" && x >= 0.85 && name === "core");
        if (!ok) failures.push(`${axis} ${x.toFixed(3)}: named ${name}, moving [${now.join(", ")}], last ${last}`);
        if (now.length) last = now.includes(name as ReadoutPart) ? name : now.at(-1)!;
      }
      expect(failures).toEqual([]);
    });
  }
});
