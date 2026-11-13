import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Quaternion, Vector3, type PerspectiveCamera, type Texture } from "three";
import { experienceStore, type RenderQuality } from "../lib/experienceStore";
import { createMachine } from "./tb001/machine";
import { createMachineTextures } from "./tb001/textures";
import { pose, writePose, type MachinePose } from "./tb001/pose";
import { createStudioEnvironment } from "./tb001/studio";
import { createPresentation, writePresentation } from "./tb001/presentation";

type TB001ModelProps = {
  quality: RenderQuality;
  /** Mutates the preallocated pose. Its controller owns motion/pauses and calls invalidate. */
  drive: (target: MachinePose, delta: number) => void;
  /** Called once, after the first frame drawn with the model. */
  onBuilt?: () => void;
  /** A build step that throws: the build runs outside React's render, so the error boundary would not see it. */
  onFailure?: (error: unknown) => void;
};

type Built = { machine: ReturnType<typeof createMachine>; environment: ReturnType<typeof createStudioEnvironment> };

/** One build step per task: the input and the browser get a turn between them. */
const nextTask = () => new Promise<void>((resolve) => { window.setTimeout(resolve, 0); });

/**
 * Reusable R3F model. Allocates GPU resources only in committed effects (StrictMode safe).
 * The build is split into tasks (environment, textures, geometry, programs): done in one go it was a single long task
 * of ~200 ms at 4x CPU (110 ms of it the geometry), which landed in the first seconds once the gate preloads the scene
 * (#17) and pushed Lighthouse's mobile TBT to its limit. A rebuild (quality change) keeps the previous model on
 * screen until the new one is complete.
 */
export function TB001Model({ quality, drive, onBuilt, onFailure }: TB001ModelProps) {
  const { gl, scene, camera, invalidate } = useThree();
  const model = useRef<Built["machine"] | null>(null);
  const built = useRef<Built | null>(null);
  const announced = useRef(false);
  const readyFrame = useRef(0);
  const callbacks = useRef({ onBuilt, onFailure });
  callbacks.current = { onBuilt, onFailure };
  const currentPose = useMemo(() => pose(0, 0, 0), []);

  // Release committed resources on failure as well as unmount: a failed preload can remain on the entry gate.
  const disposeBuilt = useCallback(() => {
    window.cancelAnimationFrame(readyFrame.current);
    const current = built.current;
    if (!current) return;
    built.current = null;
    model.current = null;
    scene.remove(current.machine.root);
    current.machine.dispose();
    if (scene.environment === current.environment.texture) scene.environment = null;
    current.environment.dispose();
    invalidate();
  }, [scene, invalidate]);
  useEffect(() => disposeBuilt, [disposeBuilt]);

  useEffect(() => {
    let cancelled = false;
    let environment: Built["environment"] | null = null;
    let textures: Texture[] = [];
    let machine: Built["machine"] | null = null;
    const build = async () => {
      environment = createStudioEnvironment(gl, quality);
      await nextTask();
      if (cancelled) return;
      const set = createMachineTextures(quality);
      textures = [set.wear, set.panelBump, set.panels, set.oblo].filter((texture): texture is Texture => texture !== null);
      await nextTask();
      if (cancelled) return;
      machine = createMachine({ quality, textures: set });
      textures = []; // owned by the machine from here on
      machine.root.name = "TB-001";
      machine.update(currentPose);
      await nextTask();
      if (cancelled) return;
      const previous = built.current;
      if (previous) {
        scene.remove(previous.machine.root);
        previous.machine.dispose();
        previous.environment.dispose();
      }
      scene.environment = environment.texture;
      scene.environmentIntensity = 1.12;
      scene.add(machine.root);
      built.current = { machine, environment };
      model.current = machine;
      environment = null;
      machine = null;
      // Start linking every program now (hidden parts included: three walks the whole graph) so the driver can
      // build them in parallel instead of one after another on the first draw. `compileAsync` is deliberately
      // not used: its readiness poll cannot be cancelled and throws when the materials are disposed first.
      gl.compile(scene, camera);
      invalidate();
    };
    const disposePending = () => {
      for (const texture of textures) texture.dispose();
      textures = [];
      machine?.dispose();
      machine = null;
      environment?.dispose();
      environment = null;
    };
    build().catch((error: unknown) => {
      disposePending();
      if (!cancelled) {
        disposeBuilt();
        callbacks.current.onFailure?.(error);
      }
    });
    return () => {
      cancelled = true;
      // Parts of a build that never reached the scene.
      disposePending();
    };
  }, [quality, gl, scene, camera, invalidate, currentPose, disposeBuilt]);

  useFrame((_, delta) => {
    if (!model.current) return;
    drive(currentPose, Math.min(delta, 0.05));
    model.current.update(currentPose);
    if (!announced.current) {
      announced.current = true;
      // After this frame is on screen.
      readyFrame.current = window.requestAnimationFrame(() => callbacks.current.onBuilt?.());
    }
  });
  return null;
}

const HATCH_AXIS = new Vector3(0, 0, 1);
/**
 * Entry gate (#17) framing region relative to its box. The model scales with the region (setViewOffset maps the
 * frustum on `region` px): at 1 it spans ~87% of the box height (highlights included, measured), at 1.06 ~92%.
 */
const GATE_SCALE = 1.06;
const spin = new Quaternion();

/** Applies the chapter choreography in the persistent stage; scheduling belongs to the controller. */
export function CompilerMachine({ quality, onBuilt, onFailure }: {
  quality: RenderQuality;
  onBuilt?: () => void;
  onFailure?: (error: unknown) => void;
}) {
  const { camera, scene, gl, get } = useThree();
  const placement = useMemo(createPresentation, []);
  const input = useMemo(() => ({
    progress: 0, chapter: 0, stageProgress: 0, isMobile: false, reducedMotion: false, userPaused: false,
    pointerX: 0, pointerY: 0, aspect: 1, time: 0,
  }), []);
  const drive = (target: MachinePose) => {
    // Before entry the story is paused, but the gate still drives the Compiler it shows.
    const gate = experienceStore.gate;
    if (experienceStore.paused && gate === 0) return;
    input.chapter = experienceStore.chapter;
    input.stageProgress = experienceStore.stageProgress;
    input.userPaused = experienceStore.userPaused;
    input.progress = experienceStore.progress;
    input.isMobile = experienceStore.isMobile;
    input.reducedMotion = experienceStore.reducedMotion;
    input.pointerX = experienceStore.pointerX;
    input.pointerY = experienceStore.pointerY;
    // The model is framed in its region (a column or the whole band) and the projection is shifted off-axis so
    // the region sits where the layout puts it: the canvas never resizes and the model never distorts. A narrowed
    // reading band hides the bottom of the canvas (clip on the stage): the model is framed in what stays visible.
    // The store's size, not the render's: the canvas may have been resized in this very frame (settleCanvas).
    const { size } = get();
    const width = Math.max(1, size.width), height = Math.max(1, size.height);
    // While the gate owns the canvas it covers the viewport; the hero framing is computed for the box the
    // canvas takes back in the page and placed at its offset, so both ends of the travel match the page exactly.
    const rect = experienceStore.gating ? gl.domElement.getBoundingClientRect() : null;
    const hero = rect && experienceStore.heroBox;
    const heroWidth = hero ? hero.width : width, heroHeight = hero ? hero.height : height;
    const offsetX = hero && rect ? hero.x - rect.left : 0, offsetY = hero && rect ? hero.y - rect.top : 0;
    const visible = Math.max(1, heroHeight - experienceStore.bandCut);
    let regionWidth = heroWidth * experienceStore.region;
    let regionHeight = visible;
    let centreX = offsetX + regionWidth / 2 + (heroWidth - regionWidth) * (Number.isFinite(experienceStore.side) ? experienceStore.side : 0.5);
    let centreY = offsetY + visible / 2;
    if (gate > 0 && rect) {
      // The gate frames the Compiler in a square box at the centre of the viewport; the travel to the hero is a
      // blend of the two regions in one canvas, so the model never jumps.
      const box = experienceStore.gateBox;
      const gateRegion = box.size * GATE_SCALE;
      const blend = (from: number, to: number) => from + (to - from) * gate;
      regionWidth = blend(regionWidth, gateRegion);
      regionHeight = blend(regionHeight, gateRegion);
      centreX = blend(centreX, box.x - rect.left);
      centreY = blend(centreY, box.y - rect.top);
    }
    const lens = camera as PerspectiveCamera;
    lens.aspect = regionWidth / regionHeight;
    lens.setViewOffset(regionWidth, regionHeight, regionWidth / 2 - centreX, regionHeight / 2 - centreY, width, height);
    input.aspect = regionWidth / regionHeight;
    input.time = experienceStore.motionTime;
    writePresentation(placement, input);
    // The visitor's drag rides on the hero orientation and fades out with the gate: it returns the short way round.
    placement.rotationX += experienceStore.gatePitch * gate;
    placement.rotationY += experienceStore.gateYaw * gate;
    writePose(target, placement.cycle, placement.explode, experienceStore.motionTime);
    const root = scene.getObjectByName("TB-001");
    if (root) {
      root.position.set(placement.x, placement.y, 0);
      root.rotation.set(placement.rotationX, placement.rotationY, placement.rotationZ, "ZXY");
      root.quaternion.multiply(spin.setFromAxisAngle(HATCH_AXIS, placement.spin));
    }
    // Crossing between columns the camera eases back a little: the model travels as a smaller object and
    // regains its size on arrival.
    const crossing = experienceStore.region < 1 ? 4 * experienceStore.side * (1 - experienceStore.side) : 0;
    camera.position.set(placement.cameraX, placement.cameraY, placement.cameraZ * (1 + 0.18 * crossing));
    camera.lookAt(0, placement.lookY, 0);
  };
  return <TB001Model quality={quality} drive={drive} onBuilt={onBuilt} onFailure={onFailure} />;
}
