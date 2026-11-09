import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Quaternion, Vector3, type PerspectiveCamera } from "three";
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
};

/** Reusable R3F model. Allocates GPU resources only in the committed effect (StrictMode safe). */
export function TB001Model({ quality, drive }: TB001ModelProps) {
  const { gl, scene, camera, invalidate } = useThree();
  const model = useRef<ReturnType<typeof createMachine> | null>(null);
  const currentPose = useMemo(() => pose(0, 0, 0), []);

  useLayoutEffect(() => {
    const environment = createStudioEnvironment(gl, quality);
    const previousEnvironment = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    let machine: ReturnType<typeof createMachine> | null = null;
    try {
      machine = createMachine({ quality, textures: createMachineTextures(quality) });
      machine.root.name = "TB-001";
      machine.update(currentPose);
      scene.environment = environment.texture;
      scene.environmentIntensity = 1.12;
      scene.add(machine.root);
      model.current = machine;
      // Start linking every program now (hidden parts included: three walks the whole graph) so the driver can
      // build them in parallel instead of one after another on the first draw. `compileAsync` is deliberately
      // not used: its readiness poll cannot be cancelled and throws when the materials are disposed first.
      gl.compile(scene, camera);
      invalidate();
    } catch (error) {
      machine?.dispose();
      environment.dispose();
      throw error;
    }
    return () => {
      model.current = null;
      scene.remove(machine.root);
      machine.dispose();
      if (scene.environment === environment.texture) {
        scene.environment = previousEnvironment;
        scene.environmentIntensity = previousIntensity;
      }
      environment.dispose();
      invalidate();
    };
  }, [quality, gl, scene, camera, invalidate, currentPose]);

  useFrame((_, delta) => {
    if (!model.current) return;
    drive(currentPose, Math.min(delta, 0.05));
    model.current.update(currentPose);
  });
  return null;
}

const HATCH_AXIS = new Vector3(0, 0, 1);
const spin = new Quaternion();

/** Applies the chapter choreography in the persistent stage; scheduling belongs to the controller. */
export function CompilerMachine({ quality }: { quality: RenderQuality }) {
  const { camera, size, scene } = useThree();
  const placement = useMemo(createPresentation, []);
  const input = useMemo(() => ({
    progress: 0, chapter: 0, stageProgress: 0, isMobile: false, reducedMotion: false, userPaused: false,
    pointerX: 0, pointerY: 0, aspect: 1, time: 0,
  }), []);
  const drive = (target: MachinePose) => {
    if (experienceStore.paused) return;
    input.chapter = experienceStore.chapter;
    input.stageProgress = experienceStore.stageProgress;
    input.userPaused = experienceStore.userPaused;
    input.progress = experienceStore.progress;
    input.isMobile = experienceStore.isMobile;
    input.reducedMotion = experienceStore.reducedMotion;
    input.pointerX = experienceStore.pointerX;
    input.pointerY = experienceStore.pointerY;
    // The model is framed in its region (a column or the whole band) and the projection is shifted off-axis so
    // the region sits where the layout puts it: the canvas never resizes and the model never distorts.
    const width = Math.max(1, size.width), height = Math.max(1, size.height);
    const regionWidth = width * experienceStore.region;
    const centre = regionWidth / 2 + (width - regionWidth) * experienceStore.side;
    const lens = camera as PerspectiveCamera;
    lens.aspect = regionWidth / height;
    lens.setViewOffset(regionWidth, height, regionWidth / 2 - centre, 0, width, height);
    input.aspect = regionWidth / height;
    input.time = experienceStore.motionTime;
    writePresentation(placement, input);
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
  return <TB001Model quality={quality} drive={drive} />;
}
