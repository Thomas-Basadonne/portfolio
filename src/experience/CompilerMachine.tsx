import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Quaternion, Vector3, type Object3D, type PerspectiveCamera, type Texture } from "three";
import { experienceStore, type RenderQuality } from "../lib/experienceStore";
import { createMachine } from "./tb001/machine";
import { createMachineTextures } from "./tb001/textures";
import { pose, writePose, type MachinePose } from "./tb001/pose";
import { createStudioEnvironment } from "./tb001/studio";
import { createPresentation, writePresentation } from "./tb001/presentation";
import { innerDir } from "./tb001/pose";
import { createReadout, sameReadout, writeReadout, type ReadoutPart } from "./tb001/readout";

type TB001ModelProps = {
  quality: RenderQuality;
  /** Mutates the preallocated pose. Its controller owns motion/pauses and calls invalidate. */
  drive: (target: MachinePose, delta: number) => void;
  /** After the model took this frame's pose: reads that need the parts where they are drawn (#20 callout). */
  afterUpdate?: (machine: Built["machine"]) => void;
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
export function TB001Model({ quality, drive, afterUpdate, onBuilt, onFailure }: TB001ModelProps) {
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
    afterUpdate?.(model.current);
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

/*
 * Callout anchors (#20): a point on each readout part, in the part's own frame, so the leader follows the part as it
 * opens, turns and leaves in the teardown. The ring point is on the outer gimbal's pin axis; the inner shell point is
 * on its first sector's belt.
 */
const [innerX, innerY, innerZ] = innerDir(0);
const ANCHORS: Record<ReadoutPart, readonly [string, number, number, number]> = {
  outer: ["shell.front", 0, 0, 1],
  inner: ["inner0", innerX * 0.89, innerY * 0.89, innerZ * 0.89],
  joints: ["joints.piston0.rod", 0, 0, 0],
  rings: ["ring.outer", 0.82, 0, 0],
  core: ["core", 0, 0, 0],
};
const READOUT_PAD = 16;

/** Applies the chapter choreography in the persistent stage; scheduling belongs to the controller. */
export function CompilerMachine({ quality, onBuilt, onFailure }: {
  quality: RenderQuality;
  onBuilt?: () => void;
  onFailure?: (error: unknown) => void;
}) {
  const { camera, scene, gl, get } = useThree();
  const placement = useMemo(createPresentation, []);
  const readout = useMemo(createReadout, []);
  /** This frame's model region, in canvas px (the drive writes it, the callout reads it after the pose is applied). */
  const frame = useMemo(() => ({ left: 0, width: 1, visible: 1 }), []);
  const point = useMemo(() => new Vector3(), []);
  const anchors = useMemo(() => new WeakMap<object, Map<string, Object3D | undefined>>(), []);
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
    frame.left = centreX - regionWidth / 2;
    frame.width = regionWidth;
    frame.visible = visible;
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
  /*
   * Model readout and callout (#20), after the model took this frame's pose. The label re-renders only when a rounded
   * value changes; the box and the leader are placed directly (stage px), never through a React render per frame.
   * Beside the text the box sits in the top corner of the model's column; with a fine pointer one leader reaches the
   * active part. Not shown in the portrait band.
   */
  const afterUpdate = (machine: { root: Object3D }) => {
    const store = experienceStore;
    writeReadout(readout, placement.cycle, placement.explode);
    if (!sameReadout(readout, store.readout)) {
      Object.assign(store.readout, readout);
      store.onReadout?.();
    }
    const box = store.readoutBox, callout = store.calloutLine;
    if (!box || !callout) return;
    const canvas = gl.domElement;
    // R3F wraps the canvas in its own div: the stage offset is the shell's (below the band header on phones).
    const shell = canvas.closest<HTMLElement>(".webgl-shell");
    const dx = shell?.offsetLeft ?? 0, dy = shell?.offsetTop ?? 0;
    const travelling = store.gating || store.gate > 0;
    // Only where the stage sits beside the text (desktop, landscape): the portrait band has no room outside the model
    // (Thomas, 23/11/2026), so there the readout is not shown at all.
    const beside = store.region < 1;
    box.style.visibility = travelling || !beside ? "hidden" : "";
    // The leader needs a fine pointer's precision of reading; touch landscape keeps the label alone.
    const wide = beside && !store.isMobile;
    const bx = dx + frame.left + READOUT_PAD;
    const by = dy + READOUT_PAD;
    const bh = box.offsetHeight;
    box.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by)}px)`;

    let shown = false;
    if (wide && !travelling && readout.part) {
      let named = anchors.get(machine.root);
      if (!named) anchors.set(machine.root, (named = new Map()));
      const [name, x, y, z] = ANCHORS[readout.part];
      if (!named.has(name)) named.set(name, machine.root.getObjectByName(name));
      const target = named.get(name);
      if (target) {
        target.updateWorldMatrix(true, false);
        point.set(x, y, z).applyMatrix4(target.matrixWorld).project(camera);
        const px = dx + ((point.x + 1) / 2) * canvas.clientWidth;
        const py = dy + ((1 - point.y) / 2) * canvas.clientHeight;
        // In front of the camera, inside the model's column and the visible band, and clear of the readout itself.
        shown = point.z < 1 && px > dx + frame.left && px < dx + frame.left + frame.width && py > dy && py < dy + frame.visible
          && py > by + bh + READOUT_PAD;
        if (shown) {
          const [line, dot] = callout.children as unknown as [SVGLineElement, SVGCircleElement];
          line.setAttribute("x1", String(Math.round(bx)));
          line.setAttribute("y1", String(Math.round(by + bh + 6)));
          line.setAttribute("x2", px.toFixed(1));
          line.setAttribute("y2", py.toFixed(1));
          dot.setAttribute("cx", px.toFixed(1));
          dot.setAttribute("cy", py.toFixed(1));
        }
      }
    }
    callout.style.visibility = shown ? "" : "hidden";
  };
  return <TB001Model quality={quality} drive={drive} afterUpdate={afterUpdate} onBuilt={onBuilt} onFailure={onFailure} />;
}
