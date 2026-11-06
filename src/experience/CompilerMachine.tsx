import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
  const { gl, scene, invalidate } = useThree();
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
  }, [quality, gl, scene, invalidate, currentPose]);

  useFrame((_, delta) => {
    if (!model.current) return;
    drive(currentPose, Math.min(delta, 0.05));
    model.current.update(currentPose);
  });
  return null;
}

/** Product adapter only: existing demand scheduling and lateral slots, no #16 choreography. */
export function CompilerMachine({ quality }: { quality: RenderQuality }) {
  const { camera, size, scene } = useThree();
  const time = useRef(0);
  const placement = useMemo(createPresentation, []);
  const input = useMemo(() => ({ ...experienceStore, aspect: 1 }), []);
  const drive = (target: MachinePose, delta: number) => {
    if (experienceStore.paused) return;
    if (!experienceStore.reducedMotion) time.current += delta;
    input.progress = experienceStore.progress;
    input.isMobile = experienceStore.isMobile;
    input.reducedMotion = experienceStore.reducedMotion;
    input.pointerX = experienceStore.pointerX;
    input.pointerY = experienceStore.pointerY;
    input.aspect = size.width / Math.max(1, size.height);
    writePresentation(placement, input);
    writePose(target, placement.cycle, placement.explode, experienceStore.reducedMotion ? 0 : time.current);
    const root = scene.getObjectByName("TB-001");
    if (root) {
      root.position.set(placement.x, placement.y, 0);
      root.rotation.set(placement.rotationX, placement.rotationY, 0);
    }
    camera.position.set(placement.cameraX, placement.cameraY, placement.cameraZ);
    camera.lookAt(0, placement.lookY, 0);
  };
  return <TB001Model quality={quality} drive={drive} />;
}
