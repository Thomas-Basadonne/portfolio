import { describe, expect, it } from "vitest";
import reference from "./fixtures/tb001-reference.json";
import {
  BELT_OPEN,
  JOINTS_EXT,
  PARTS,
  PETALS,
  REAR_TWIST,
  SPEC,
  STATES,
  clamp01,
  createPose,
  innerDir,
  lerp,
  petalDir,
  pose,
  smoother,
  ss,
  stateAt,
  writePose,
  type MachinePose,
  type PartId,
  type VectorTuple,
} from "../src/experience/tb001/pose";

const expectClose = (actual: number, expected: number, digits = 12) =>
  expect(actual).toBeCloseTo(expected, digits);

const expectFiniteTree = (value: unknown): void => {
  if (typeof value === "number") {
    expect(Number.isFinite(value)).toBe(true);
  } else if (Array.isArray(value)) {
    value.forEach(expectFiniteTree);
  } else if (value !== null && typeof value === "object") {
    Object.values(value).forEach(expectFiniteTree);
  }
};

describe("TB-001 pose primitives and specification", () => {
  it("exports the v0.4 mechanical constants and stable part IDs", () => {
    expect(REAR_TWIST).toBe(26);
    expect(STATES.map(({ id }) => id)).toEqual(["01", "02", "03", "04"]);
    expect(PARTS.map(({ id }) => id)).toEqual([
      "shellFront", "ringOuter", "ringMid", "ringInner", "process", "core", "joints", "inner", "shellRear",
    ] satisfies PartId[]);
    expect(PETALS).toHaveLength(8);
    expect(BELT_OPEN).toEqual({ d: 0.3, win: [0.48, 0.64] });
    expect(JOINTS_EXT).toEqual({ d: 0.32, win: [0.62, 0.82] });
    expect(SPEC.shell.r0).toBe(0.96);
    expect(SPEC.core.showRot).toBe(5.13);
  });

  it("clamps and eases progress with the spike's smoothstep", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(smoother(0.5)).toBe(0.5);
    expect(ss(2, 4, 3)).toBe(0.5);
    expect(lerp(2, 6, 0.25)).toBe(3);
  });

  it("selects the half-open state windows", () => {
    expect(stateAt(0).id).toBe("01");
    expect(stateAt(0.2).id).toBe("02");
    expect(stateAt(0.45).id).toBe("03");
    expect(stateAt(0.75).id).toBe("04");
    expect(stateAt(1).id).toBe("04");
  });

  it("returns typed unit directions for petal and inner sectors", () => {
    const p: VectorTuple = petalDir(PETALS[0]);
    const n: VectorTuple = innerDir(0);
    expect(p).toHaveLength(3);
    expectClose(Math.hypot(...p), 1);
    expectClose(Math.hypot(...n), 1);
  });
});

describe("TB-001 pose", () => {
  it("matches the approved spike's recorded poses without changing the kinematics", () => {
    for (const sample of reference.poses) {
      // The JSON reference cannot encode signed zero; compare the same serialized representation.
      expect(JSON.parse(JSON.stringify(pose(sample.cycle, sample.explode, sample.time)))).toEqual(sample.expected);
    }
  });
  it("matches the approved closed and fully deployed spike poses", () => {
    const closed = pose(0, 0, 0);
    expect(closed.readout).toEqual({
      state: "01 STANDBY", note: "Chiuso / compatto", cycle: 0, explode: 0, active: "Involucro esterno",
    });
    expect(closed.light.seams).toBe(0.775);
    expect(closed.petals).toHaveLength(8);

    const open = pose(0.75, 0, 0);
    expect(open.oblo).toEqual({ rotZ: -40 * Math.PI / 180, z: 0.12, hinge: 95 * Math.PI / 180 });
    expect(open.petals[0].d).toBe(0.48);
    expect(open.petals[0].twist).toBeCloseTo(34 * Math.PI / 180);
    expect(open.petals[4].d).toBe(0.42);
    expect(open.petals[4].twist).toBeCloseTo(26 * Math.PI / 180);
    expect(open.rings.a1).toBeCloseTo(30 * Math.PI / 180);
    expect(open.rings.a2).toBeCloseTo(-40 * Math.PI / 180);
    expect(open.light.core).toBe(1);
  });

  it("starts petal travel before twist and staggers by band and quadrant", () => {
    const travel = pose(0.43);
    const twist = pose(0.64);
    expect(travel.petals[0].d).toBeGreaterThan(0);
    expect(travel.petals[0].twist).toBe(0);
    expect(twist.petals[0].twist).toBeGreaterThan(0);
    expect(travel.petals[0].d).toBeGreaterThan(travel.petals[7].d);
  });

  it("preserves teardown windows, nested clearance, and light semantics", () => {
    expect(pose(0.8, 0.3).offsets.shellFront).toBe(0);
    expect(pose(0.8, 0.45).offsets.shellFront).toBeGreaterThan(0);
    const teardown = pose(0.8, 1, 7);
    expect(teardown.offsets.shellFront).toBe(2.9);
    expect(teardown.offsets.shellRear).toBe(-3);
    expect(teardown.offsets.ringOuter).toBe(2.1);
    expect(teardown.offsets.inner).toBe(-1.45);
    expect(teardown.inner[0].d).toBe(0.3);
    expect(teardown.jointsExt).toBe(0.32);
    expect(teardown.light.core).toBe(0.6);
    expect(teardown.core.rot).toBe(5.13);
    expect(pose(0.75, 0).light.seams).toBe(0);
  });

  it("keeps continuous motion dependent only on t and path-independent", () => {
    const first = pose(0.85, 0.25, 3);
    const later = pose(0.85, 0.25, 9);
    expect(first.core.innerRot).not.toBe(later.core.innerRot);
    expect(first.offsets).toEqual(later.offsets);
    expect(first.petals).toEqual(later.petals);
    expect(pose(0.85, 0.25, 3)).toEqual(first);
  });

  it("clamps invalid cycle and explode inputs and remains finite", () => {
    for (const cycle of [-Infinity, -1, 0, 1, 2, Infinity, NaN]) {
      for (const explode of [-Infinity, -1, 0, 1, 2, Infinity, NaN]) {
        const result = pose(cycle, explode, NaN);
        expectFiniteTree(result);
        expect(result.cycle).toBeGreaterThanOrEqual(0);
        expect(result.cycle).toBeLessThanOrEqual(1);
        expect(result.teardown).toBeGreaterThanOrEqual(0);
        expect(result.teardown).toBeLessThanOrEqual(1);
      }
    }
  });

  it("writes into an existing pose tree and matches the allocating API", () => {
    const target: MachinePose = createPose();
    const refs = {
      state: target.state,
      oblo: target.oblo,
      petals: target.petals,
      petal: target.petals[0],
      inner: target.inner,
      innerSector: target.inner[0],
      rings: target.rings,
      light: target.light,
      core: target.core,
      orbits: target.orbits,
      offsets: target.offsets,
      readout: target.readout,
    };
    expect(writePose(target, 0.85, 1, 7)).toBe(target);
    expect(target).toEqual(pose(0.85, 1, 7));
    expect(target.state).toBe(refs.state);
    expect(target.oblo).toBe(refs.oblo);
    expect(target.petals).toBe(refs.petals);
    expect(target.petals[0]).toBe(refs.petal);
    expect(target.inner).toBe(refs.inner);
    expect(target.inner[0]).toBe(refs.innerSector);
    expect(target.rings).toBe(refs.rings);
    expect(target.light).toBe(refs.light);
    expect(target.core).toBe(refs.core);
    expect(target.orbits).toBe(refs.orbits);
    expect(target.offsets).toBe(refs.offsets);
    expect(target.readout).toBe(refs.readout);
  });
});
