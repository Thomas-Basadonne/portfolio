import { clamp01, smoothRange } from "../../lib/experienceStore";

type PresentationInput = {
  progress: number;
  isMobile: boolean;
  reducedMotion: boolean;
  pointerX: number;
  pointerY: number;
  aspect?: number;
};
const desktopOffsets = [-0.55, -1.2, 1.15, -1.05, 1.12, 0];

export const createPresentation = () => ({
  cycle: 0, explode: 0, x: 0, y: 0, rotationX: 0, rotationY: 0, cameraX: 0, cameraY: 0.1, cameraZ: 7.1, lookY: 0,
});

/** Temporary adapter, not #16's chapter storyboard. Reuses the current six lateral slots. */
export function writePresentation(target: ReturnType<typeof createPresentation>, input: PresentationInput) {
  const progress = clamp01(input.progress);
  const motion = input.reducedMotion ? 0 : 1;
  target.cycle = progress;
  target.explode = 0; // the independent teardown axis awaits the approved #16/#21 mapping
  target.x = input.isMobile ? 0 : desktopOffsets[Math.min(5, Math.round(progress * 5))];
  target.y = input.isMobile ? -0.7 : 0;
  // Keep the hatch facing the visitor. The old 1.48π turn would expose only TB-001's rear.
  target.rotationX = (12 * Math.PI) / 180 + input.pointerY * 0.06 * motion;
  target.rotationY = ((-32 + 50 * progress) * Math.PI) / 180 + input.pointerX * 0.11 * motion;
  target.cameraX = input.pointerX * 0.18 * motion;
  target.cameraY = 0.1 + input.pointerY * 0.12 * motion;
  // Fit the maximum orbit envelope, including perspective depth (a bounding sphere, not a flat disc).
  const aspect = Math.max(0.1, input.aspect ?? 1);
  const radius = 1.05 + 0.81 * smoothRange(progress, 0.2, 0.92);
  const halfFov = Math.atan(Math.tan((38 * Math.PI) / 360) * Math.min(1, aspect) * 0.88);
  target.cameraZ = input.isMobile
    ? Math.max(8.7, radius / Math.sin(halfFov))
    : 7.1 - Math.sin(progress * Math.PI) * 0.35;
  target.lookY = input.isMobile ? -0.58 : 0;
  return target;
}
