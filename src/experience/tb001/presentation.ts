import { clamp01, smoothRange } from "../../lib/experienceStore";
import { CYCLE_SUPPORT, ENVELOPE_ANGLES, ENVELOPE_SAMPLES, TEARDOWN_SUPPORT } from "./envelope";

type PresentationInput = {
  progress: number;
  chapter?: number;
  stageProgress?: number;
  isMobile: boolean;
  reducedMotion: boolean;
  userPaused?: boolean;
  pointerX: number;
  pointerY: number;
  aspect?: number;
  /** Ambient motion time (s); advances only while motion is allowed. */
  time?: number;
};

export const createPresentation = () => ({
  cycle: 0, explode: 0, x: 0, y: 0, rotationX: 0, rotationY: 0, rotationZ: 0, cameraX: 0, cameraY: 0, cameraZ: 7.1, lookY: 0,
  /** Turn about the model's own hatch axis (model Z), applied before the Euler rotation. */
  spin: 0,
});

const TAN_HALF_FOV = Math.tan((38 * Math.PI) / 360);
/** Share of the stage half-extent the silhouette may use; the rest is breathing room. */
const FILL = 0.9;
const ANGLE_STEP = Math.PI / 2 / (ENVELOPE_ANGLES - 1);
const SIN_STEP = Math.sin(ANGLE_STEP);
const support = new Float64Array(ENVELOPE_ANGLES);
const axes = new Float64Array(9);

/** Linear interpolation of the envelope rows; written into a preallocated buffer. */
function sampleSupport(table: readonly (readonly number[])[], amount: number) {
  const position = clamp01(amount) * (ENVELOPE_SAMPLES - 1);
  const from = Math.floor(position);
  const to = Math.min(ENVELOPE_SAMPLES - 1, from + 1);
  const t = position - from;
  for (let angle = 0; angle < ENVELOPE_ANGLES; angle += 1) {
    support[angle] = table[from][angle] + (table[to][angle] - table[from][angle]) * t;
  }
}

/**
 * Upper bound of the profile's support at angle φ from the two tabulated constraints around it: the direction is
 * a positive combination of their normals, so the bound is exact for those constraints and always conservative.
 */
function profileSupport(phi: number) {
  const index = Math.min(ENVELOPE_ANGLES - 2, Math.floor(phi / ANGLE_STEP));
  const offset = phi - index * ANGLE_STEP;
  return (support[index] * Math.sin(ANGLE_STEP - offset) + support[index + 1] * Math.sin(offset)) / SIN_STEP;
}

const fit = { distance: 0, x: 0, y: 0 };

/**
 * Camera distance and lateral offset that keep the envelope inside the stage, the model rotated in three.js
 * Euler ZXY order. Each frustum side requires D ≥ z ± x/kx (or ± y/ky): a linear functional (a, b, c) in model
 * axes, whose maximum over a solid of revolution is L·h(φ) with L = |(hypot(a, b), |c|)| and φ its elevation.
 * Perspective makes the near end of the model larger, so opposite sides need different distances; shifting the
 * model by the half difference centres the silhouette and lets both sides meet at their mean.
 */
function writeFit(rx: number, ry: number, rz: number, aspect: number) {
  const sx = Math.sin(rx), cx = Math.cos(rx), sy = Math.sin(ry), cy = Math.cos(ry), sz = Math.sin(rz), cz = Math.cos(rz);
  for (let axis = 0; axis < 3; axis += 1) {
    const x0 = axis === 0 ? 1 : 0, y0 = axis === 1 ? 1 : 0, z0 = axis === 2 ? 1 : 0;
    const x1 = cy * x0 + sy * z0, z1 = -sy * x0 + cy * z0;
    const y2 = cx * y0 - sx * z1;
    axes[axis * 3] = cz * x1 - sz * y2;
    axes[axis * 3 + 1] = sz * x1 + cz * y2;
    axes[axis * 3 + 2] = sx * y0 + cx * z1;
  }
  const kx = FILL * TAN_HALF_FOV * aspect, ky = FILL * TAN_HALF_FOV;
  const side = (fx: number, fy: number) => {
    const ring = Math.hypot(fx * axes[0] + fy * axes[1] + axes[2], fx * axes[3] + fy * axes[4] + axes[5]);
    const along = Math.abs(fx * axes[6] + fy * axes[7] + axes[8]);
    return Math.hypot(ring, along) * profileSupport(Math.atan2(along, ring));
  };
  const right = side(1 / kx, 0), left = side(-1 / kx, 0), top = side(0, 1 / ky), bottom = side(0, -1 / ky);
  fit.distance = Math.max((right + left) / 2, (top + bottom) / 2);
  // Moving the model by -offset shifts every point's x by -offset: right needs (right - offset/kx), left the converse.
  fit.x = (kx * (right - left)) / 2;
  fit.y = (ky * (top - bottom)) / 2;
}

/**
 * Camera path: the model's yaw/pitch at each chapter's hold, blended continuously between consecutive chapters.
 * Gated holds (expansion, teardown, operational) sit on the approved #19 angles plus whole turns: About swings
 * to the back and returns, Experience comes round to the front and Contact turns a half orbit.
 * Work does not orbit the exploded stack (a long stack swinging end-on would make an exact fit pump the camera
 * by more than half); the stack turns once about its own axis instead, which leaves its envelope unchanged.
 */
const YAW = [-32, -150, 16, 58, 150, 378];
const PITCH = [12, 18, 12, 22, -4, 12];
/** The hero settles into its first hold, so even the opening screen answers the scroll. */
const YAW_START = -50;
const PITCH_START = 6;
const DEGREE = Math.PI / 180;

type ChapterState = { cycle: number; explode: number; rx: number; ry: number; rz: number; spin: number };
const current: ChapterState = { cycle: 0, explode: 0, rx: 0, ry: 0, rz: 0, spin: 0 };

/**
 * Mechanical state and choreographed rotation at progress p (0..1) through a chapter. The arc is monotonic:
 * standby → activation → expansion → teardown → recomposition into the operational state, which Contact holds.
 */
function writeChapterState(out: ChapterState, chapter: number, p: number, aspect: number) {
  // The transition fills most of the chapter's scroll, with a short hold on arrival and a longer one before leaving.
  const u = clamp01((p - 0.06) / 0.74);
  const ease = (v: number) => smoothRange(v, 0, 1);
  out.explode = 0;
  switch (chapter) {
    case 0: out.cycle = 0; break;
    case 1: out.cycle = 0.35 * ease(u); break;
    case 2: out.cycle = 0.35 + 0.33 * ease(u); break;
    case 3:
      out.cycle = 0.68 + 0.32 * ease(u / 0.4);
      out.explode = ease((u - 0.4) / 0.58);
      break;
    case 4:
      out.cycle = 1;
      out.explode = 1 - ease(u / 0.8);
      break;
    default: out.cycle = 1;
  }
  // Work turns over its whole scroll; recomposition turns only once the parts are back together (an exploded
  // stack seen end-on reads as scattered fragments).
  const blend = chapter === 3 ? p : chapter === 4 ? ease((u - 0.7) / 0.3) : ease(u);
  const fromPitch = chapter === 0 ? PITCH_START : PITCH[chapter - 1];
  const fromYaw = chapter === 0 ? YAW_START : YAW[chapter - 1];
  out.rx = (fromPitch + (PITCH[chapter] - fromPitch) * blend) * DEGREE;
  out.ry = (fromYaw + (YAW[chapter] - fromYaw) * blend) * DEGREE;
  // Lay the teardown along the stage's long side: steep in a column, nearly level in a wide band. The yawed
  // stack is foreshortened, so the roll leans well past the plain diagonal (aspect⁴ instead of aspect). It turns
  // while the stack is still compact: rolling a long stack would widen it and pump the camera back and forth.
  out.rz = Math.atan2(1, aspect ** 4) * smoothRange(out.explode, 0, 0.45);
  // One whole turn about the hatch axis through Work: the parts keep moving, the frame does not.
  out.spin = chapter === 3 ? 2 * Math.PI * smoothRange(p, 0, 1) : 0;
}

/** Camera fit of a state; the teardown only runs at full cycle (asserted by tests), so one path applies. */
function fitState(state: ChapterState, aspect: number) {
  if (state.explode > 0) sampleSupport(TEARDOWN_SUPPORT, state.explode);
  else sampleSupport(CYCLE_SUPPORT, state.cycle);
  writeFit(state.rx, state.ry, state.rz, aspect);
  return fit.distance;
}

/** Direct, reversible poses. Document depth never selects a chapter or mechanical state. */
export function writePresentation(target: ReturnType<typeof createPresentation>, input: PresentationInput) {
  const chapter = Math.min(5, Math.max(0, Math.trunc(input.chapter ?? 0)));
  const p = input.reducedMotion ? 1 : clamp01(input.stageProgress ?? 0);
  const aspect = Math.max(0.1, input.aspect ?? 1);
  const motion = input.reducedMotion || input.userPaused ? 0 : 1;

  // The exact fit follows the parts as they leave and return, so the machine keeps its size on screen; a
  // scripted dolly ran ahead of the outside-in teardown and shrank the still-compact stack to under half.
  writeChapterState(current, chapter, p, aspect);
  const distance = fitState(current, aspect);
  target.cycle = current.cycle;
  target.explode = current.explode;
  target.rotationZ = current.rz;
  target.spin = current.spin;

  const time = input.time ?? 0;
  const swayX = motion * 1.2 * DEGREE * Math.sin(time * 0.31 + 1);
  const swayY = motion * 3 * DEGREE * Math.sin(time * 0.23);
  // Framing uses the choreographed rotation only: sway and pointer parallax (a few degrees) must not zoom or
  // shift the camera; they stay inside the margin between FILL and the stage edge.
  target.rotationX = current.rx + swayX + input.pointerY * 0.025 * motion;
  target.rotationY = current.ry + swayY + input.pointerX * 0.035 * motion;
  target.x = -fit.x;
  target.y = -fit.y;
  target.cameraX = 0;
  target.cameraY = 0;
  target.cameraZ = distance;
  target.lookY = 0;
  return target;
}
