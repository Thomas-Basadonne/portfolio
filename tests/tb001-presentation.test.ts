import * as THREE from "three";
import { afterAll, describe, expect, it } from "vitest";
import { createMachine } from "../src/experience/tb001/machine";
import { pose } from "../src/experience/tb001/pose";
import { createPresentation, writePresentation } from "../src/experience/tb001/presentation";
import { boundsOnScreen, coreVisibility } from "./helpers/tb001-probes";
import { hideUnframedOrbits } from "./helpers/tb001-framing";

const input = { progress: 0, chapter: 0, stageProgress: 0, isMobile: false, reducedMotion: false, pointerX: 0, pointerY: 0 };
/** The arc is monotonic: Experience recomposes into the operational state and Contact holds it (no reopening). */
const anchors = [[0, 0, 0], [1, 0.35, 0], [2, 0.68, 0], [3, 1, 1], [4, 1, 0], [5, 1, 0]] as const;
/**
 * Aspect of the region the model is framed in, measured in the browser (scene-stages.css): one column of the
 * side-by-side layout at 1100×700 … 1920×1080 and on landscape phones, or the sticky band on portrait screens.
 */
const REGION_ASPECTS = {
  "1100x700": 0.8, "1440x900": 0.82, "667x375": 0.87, "1024x600": 0.89, "1920x1080": 0.93, "844x390": 1.09,
  "390x844": 1.44, "360x740": 1.52, "820x1180": 2.17,
} as const;
const aspects = Object.values(REGION_ASPECTS);
const pairs = anchors.flatMap(([chapter]) => aspects.map((aspect) => [chapter, aspect] as const));

const texture = () => new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
const machine = createMachine({ quality: "low", textures: { wear: texture(), panelBump: texture(), panels: texture(), oblo: texture() } });
afterAll(() => machine.dispose());

/** Applies the presentation exactly as CompilerMachine does and projects the real geometry. */
function frame(chapter: number, stageProgress: number, aspect: number) {
  const placement = writePresentation(createPresentation(), { ...input, chapter, stageProgress, aspect });
  const state = pose(placement.cycle, placement.explode, 0);
  machine.update(state);
  machine.root.position.set(placement.x, placement.y, 0);
  machine.root.rotation.set(placement.rotationX, placement.rotationY, placement.rotationZ, "ZXY");
  machine.root.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), placement.spin));
  const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 70);
  camera.position.set(placement.cameraX, placement.cameraY, placement.cameraZ);
  camera.lookAt(0, placement.lookY, 0);
  camera.updateMatrixWorld();
  const restore = hideUnframedOrbits(machine.root, state.orbits.alpha);
  const { min, max } = boundsOnScreen(machine.root, camera);
  restore();
  // NDC x spans the stage width: scale it by aspect to compare real pixel proportions.
  const width = ((max[0] - min[0]) * aspect) / 2, height = (max[1] - min[1]) / 2;
  return { placement, camera, min, max, width, height, fill: Math.max(max[0] - min[0], max[1] - min[1]) / 2 };
}

describe("TB-001 semantic chapter choreography", () => {
  it("resolves all chapter anchors independently of document length or the prior scroll path", () => {
    const result = createPresentation();
    for (const [chapter, cycle, explode] of [...anchors, ...anchors.toReversed()]) {
      expect(writePresentation(result, { ...input, progress: 0.12, chapter, stageProgress: 1 })).toBe(result);
      expect(result.cycle).toBeCloseTo(cycle);
      expect(result.explode).toBeCloseTo(explode);
      const first = { ...result };
      expect(writePresentation(result, { ...input, progress: 0.98, chapter, stageProgress: 1 })).toEqual(first);
    }
  });

  it("never runs the opening and the teardown at the same time", () => {
    const result = createPresentation();
    for (const chapter of [3, 4]) {
      for (let step = 0; step <= 100; step += 1) {
        writePresentation(result, { ...input, chapter, stageProgress: step / 100 });
        if (result.explode > 0.001) expect(result.cycle).toBeCloseTo(1, 6);
      }
    }
  });

  it("keeps the real geometry inside every stage aspect through each transition", () => {
    for (const aspect of aspects) {
      for (const [chapter] of anchors) {
        for (let step = 0; step <= 40; step += 1) {
          const { min, max } = frame(chapter, step / 40, aspect);
          expect(Math.max(-min[0], max[0], -min[1], max[1]), `chapter ${chapter} u=${step / 40} aspect ${aspect}`)
            .toBeLessThanOrEqual(0.95);
        }
      }
    }
  }, 120000);

  it("gives each held pose most of its stage instead of a small object in empty space", () => {
    // Measured: closed 0.88, opening 0.83, expanded 0.76, teardown 0.79 desktop / 0.87 mobile. The operational pose
    // holds 0.71: its tilted symbolic orbits are bounded as a solid of revolution, the price of containment at
    // every idle orbit phase and pointer angle.
    for (const [chapter, aspect] of pairs) {
      expect(frame(chapter, 1, aspect).fill, `chapter ${chapter} aspect ${aspect}`).toBeGreaterThanOrEqual(0.7);
    }
  }, 60000);

  it("moves the camera continuously inside a chapter (no pops at orbit or teardown thresholds)", () => {
    // A pop is a step that stays large however finely the chapter is sampled; a continuous curve's largest step
    // halves when the sampling doubles. Fast but continuous camera moves are legitimate: the exact fit follows
    // the parts, so the machine keeps its size on screen while the camera travels.
    const result = createPresentation();
    const largestSteps = (chapter: number, aspect: number, samples: number) => {
      writePresentation(result, { ...input, chapter, stageProgress: 0, aspect });
      let distance = result.cameraZ, x = result.x, y = result.y, depth = 0, offset = 0;
      for (let step = 1; step <= samples; step += 1) {
        writePresentation(result, { ...input, chapter, stageProgress: step / samples, aspect });
        depth = Math.max(depth, Math.abs(result.cameraZ - distance));
        offset = Math.max(offset, Math.hypot(result.x - x, result.y - y));
        distance = result.cameraZ; x = result.x; y = result.y;
      }
      return { depth, offset };
    };
    for (const aspect of aspects) {
      for (const [chapter] of anchors) {
        const coarse = largestSteps(chapter, aspect, 2000), fine = largestSteps(chapter, aspect, 4000);
        const label = `chapter ${chapter} aspect ${aspect}`;
        expect(coarse.depth, label).toBeLessThan(0.15);
        expect(fine.depth, label).toBeLessThanOrEqual(coarse.depth * 0.6 + 1e-4);
        expect(fine.offset, `offset, ${label}`).toBeLessThanOrEqual(coarse.offset * 0.6 + 1e-4);
      }
    }
  });

  it("lays the teardown along the long side of the stage", () => {
    const tall = frame(3, 1, REGION_ASPECTS["1100x700"]);
    expect(tall.height).toBeGreaterThan(tall.width * 1.15);
    const wide = frame(3, 1, REGION_ASPECTS["820x1180"]);
    expect(wide.width).toBeGreaterThan(wide.height * 1.15);
  }, 30000);

  it("keeps the approved core-visibility gates in the chapter camera", () => {
    for (const aspect of aspects) {
      for (const [chapter, gate] of [[2, 0.9], [3, 0.95], [5, 0.9]] as const) {
        const { camera } = frame(chapter, 1, aspect);
        expect(coreVisibility(machine.root, camera).vis, `chapter ${chapter} aspect ${aspect}`).toBeGreaterThanOrEqual(gate);
      }
    }
  }, 60000);
});
