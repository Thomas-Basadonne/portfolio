import { readFileSync, writeFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createMachine } from "../src/experience/tb001/machine";
import { pose } from "../src/experience/tb001/pose";
import { CYCLE_SUPPORT, ENVELOPE_ANGLES, ENVELOPE_SAMPLES, TEARDOWN_SUPPORT } from "../src/experience/tb001/envelope";
import { ORBIT_FRAMING } from "./helpers/tb001-framing";
import { smoothRange } from "../src/lib/experienceStore";

/**
 * Guard and generator for src/experience/tb001/envelope.ts: the support function of the real geometry's profile
 * of revolution around the hatch axis, h(φ) = max(ρ·cos φ + |z|·sin φ), over both quality tiers and idle time,
 * for the cycle path (explode 0) and the teardown path (cycle 1); symbolic orbits weigh by their visibility
 * (ORBIT_FRAMING). Regenerate after geometry/pose changes:
 *   UPDATE_ENVELOPE=1 pnpm exec vitest run --config vitest.config.ts tests/tb001-envelope.test.ts
 */
const ANGLES = ENVELOPE_ANGLES;
const directions = Array.from({ length: ANGLES }, (_, index) => {
  const angle = (index / (ANGLES - 1)) * (Math.PI / 2);
  return [Math.cos(angle), Math.sin(angle)] as const;
});
const TIMES = [0, 0.9, 1.9, 3.1, 4.4, 5.7, 7.3, 9.1];
/** Margin for interpolation between samples and idle phases not sampled. */
const INFLATE = 1.02;
/** Maximum change of a support value per unit of cycle/explode: anticipates rises and delays drops. */
const SLOPE = 8;
const texture = () => new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);

function measure() {
  const raw = { cycle: [] as number[][], teardown: [] as number[][] };
  for (const quality of ["low", "high"] as const) {
    const machine = createMachine({ quality, textures: { wear: texture(), panelBump: texture(), panels: texture(), oblo: texture() } });
    const point = new THREE.Vector3(), instance = new THREE.Matrix4(), world = new THREE.Matrix4();
    const supports = (cycle: number, explode: number) => {
      const support = Array.from({ length: ANGLES }, () => 0);
      for (const time of TIMES) {
        const state = pose(cycle, explode, time);
        machine.update(state);
        machine.root.updateMatrixWorld(true);
        // Symbolic orbits are framed in proportion to how visible they are: fading rings must not hold the camera
        // back from the body (the frame would shrink the machine around near-invisible lines).
        const orbitWeight = smoothRange(state.orbits.alpha, ORBIT_FRAMING[0], ORBIT_FRAMING[1]);
        const body = Array.from({ length: ANGLES }, () => 0), orbit = Array.from({ length: ANGLES }, () => 0);
        machine.root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          let inOrbits = false;
          for (let node: THREE.Object3D | null = object; node; node = node.parent) {
            if (!node.visible) return;
            if (node.name === "orbits") inOrbits = true;
          }
          const bucket = inOrbits ? orbit : body;
          const positions = object.geometry.attributes.position;
          const count = object instanceof THREE.InstancedMesh ? object.count : 1;
          for (let index = 0; index < count; index += 1) {
            if (object instanceof THREE.InstancedMesh) { object.getMatrixAt(index, instance); world.multiplyMatrices(object.matrixWorld, instance); }
            else world.copy(object.matrixWorld);
            for (let vertex = 0; vertex < positions.count; vertex += 1) {
              point.fromBufferAttribute(positions, vertex).applyMatrix4(world);
              const radius = Math.hypot(point.x, point.y), axial = Math.abs(point.z);
              for (let angle = 0; angle < ANGLES; angle += 1) {
                bucket[angle] = Math.max(bucket[angle], radius * directions[angle][0] + axial * directions[angle][1]);
              }
            }
          }
        });
        for (let angle = 0; angle < ANGLES; angle += 1) {
          const framed = body[angle] + Math.max(0, orbit[angle] - body[angle]) * orbitWeight;
          support[angle] = Math.max(support[angle], framed);
        }
      }
      return support;
    };
    const target = (path: number[][], index: number, support: number[]) => {
      path[index] = (path[index] ?? support).map((value, angle) => Math.max(value, support[angle]));
    };
    for (let index = 0; index < ENVELOPE_SAMPLES; index += 1) {
      const amount = index / (ENVELOPE_SAMPLES - 1);
      target(raw.cycle, index, supports(amount, 0));
      target(raw.teardown, index, supports(1, amount));
    }
    machine.dispose();
  }
  return raw;
}

/**
 * Inflate, then slope-limit both ways over the joint path: cycle 0→1, then teardown 0→1. The last cycle sample and
 * the first teardown sample are the same pose, so they share one row and the camera is continuous at the handover.
 */
function envelopeOf(raw: { cycle: number[][]; teardown: number[][] }) {
  const path = [...raw.cycle, ...raw.teardown.slice(1)].map((row) => row.map((value) => value * INFLATE));
  const step = SLOPE / (ENVELOPE_SAMPLES - 1);
  for (let angle = 0; angle < ANGLES; angle += 1) {
    for (let index = path.length - 2; index >= 0; index -= 1) path[index][angle] = Math.max(path[index][angle], path[index + 1][angle] - step);
    for (let index = 1; index < path.length; index += 1) path[index][angle] = Math.max(path[index][angle], path[index - 1][angle] - step);
  }
  const round = (rows: number[][]) => rows.map((row) => row.map((value) => Math.ceil(value * 1000) / 1000));
  return { cycle: round(path.slice(0, ENVELOPE_SAMPLES)), teardown: round(path.slice(ENVELOPE_SAMPLES - 1)) };
}

describe("TB-001 framing envelope", () => {
  it("dominates the real geometry on every sample, angle, tier and idle phase", () => {
    const raw = measure();
    if (process.env.UPDATE_ENVELOPE) {
      const envelope = envelopeOf(raw);
      const file = new URL("../src/experience/tb001/envelope.ts", import.meta.url);
      const rows = (name: string, data: number[][]) =>
        `export const ${name}: readonly (readonly number[])[] = [\n${data.map((row) => `  [${row.join(", ")}],`).join("\n")}\n];`;
      const header = readFileSync(file, "utf8").split("// <generated>")[0];
      writeFileSync(file, `${header}// <generated>\n${rows("CYCLE_SUPPORT", envelope.cycle)}\n${rows("TEARDOWN_SUPPORT", envelope.teardown)}\n`);
      return;
    }
    for (const [name, committed, measured] of [["cycle", CYCLE_SUPPORT, raw.cycle], ["teardown", TEARDOWN_SUPPORT, raw.teardown]] as const) {
      for (let index = 0; index < ENVELOPE_SAMPLES; index += 1) {
        for (let angle = 0; angle < ANGLES; angle += 1) {
          expect(committed[index]?.[angle] ?? 0, `${name}[${index}] angle ${angle}: regenerate with UPDATE_ENVELOPE=1`)
            .toBeGreaterThanOrEqual(measured[index][angle]);
        }
      }
    }
  }, 600000);

  it("is continuous where the cycle path hands over to the teardown", () => {
    expect(TEARDOWN_SUPPORT).toHaveLength(ENVELOPE_SAMPLES);
    expect(TEARDOWN_SUPPORT[0]).toEqual(CYCLE_SUPPORT[ENVELOPE_SAMPLES - 1]);
  });
});
