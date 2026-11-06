const D2R = Math.PI / 180;

export const clamp01 = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

export const smoother = (value: number): number => {
  const u = clamp01(value);
  return u * u * u * (u * (u * 6 - 15) + 10);
};

/** Eased progress of x between a and b. */
export const ss = (a: number, b: number, x: number): number => smoother((x - a) / (b - a));
export const lerp = (a: number, b: number, amount: number): number => a + (b - a) * amount;

export const REAR_TWIST = 26;

export const SPEC = {
  shell: { r0: 0.96, r1: 1, oblo: 19.5 * D2R, cap: 160.5 * D2R, gap: 1.6 * D2R },
  seams: { r: 0.99 },
  inner: { r0: 0.875, r1: 0.9, th0: 50 * D2R, th1: 130 * D2R, gap: 2 * D2R },
  rings: [
    { id: "ring.outer", r: 0.82, h: 0.05, t: 0.03 },
    { id: "ring.mid", r: 0.72, h: 0.05, t: 0.03 },
    { id: "ring.inner", r: 0.62, h: 0.05, t: 0.03 },
  ],
  flange: { z: 0.42, ri: 0.12, ro: 0.42, th: 0.03, spokes: 6 },
  shaft: { r: 0.03, z0: -0.96, z1: -0.42 },
  cage: { R: 0.36, tube: 0.012 },
  core: { edge: 0.3, inner: 0.14, showRot: 5.13 },
  piston: { base: 0.62 },
  orbits: [
    { a: 1.72, b: 1.56, tilt: [62, 0, 18] },
    { a: 1.86, b: 1.62, tilt: [-48, 30, -10] },
    { a: 1.64, b: 1.52, tilt: [12, -64, 40] },
  ],
} as const;

export type MachineState = { id: string; name: string; note: string; from: number; to: number };
export const STATES: readonly MachineState[] = [
  { id: "01", name: "STANDBY", note: "Chiuso / compatto", from: 0, to: 0.2 },
  { id: "02", name: "ATTIVAZIONE", note: "Apertura involucro", from: 0.2, to: 0.45 },
  { id: "03", name: "ESPANSIONE", note: "Esposizione del core", from: 0.45, to: 0.75 },
  { id: "04", name: "OPERATIVO", note: "Sistema attivo", from: 0.75, to: 1.0001 },
];
export const stateAt = (cycle: number): MachineState =>
  STATES.find((state) => cycle >= state.from && cycle < state.to) ?? STATES[3];

export const PARTS = [
  { id: "shellFront", label: "Involucro esterno", dz: 2.9, win: [0.3, 0.6] },
  { id: "ringOuter", label: "Anelli di stabilizzazione", dz: 2.1, win: [0.66, 0.95] },
  { id: "ringMid", label: null, dz: 1.75, win: [0.66, 0.95] },
  { id: "ringInner", label: null, dz: 1.4, win: [0.66, 0.95] },
  { id: "process", label: "Modulo di processo", dz: 0.85, win: [0.72, 1] },
  { id: "core", label: "Core computazionale", dz: -0.3, win: [0.72, 1] },
  { id: "joints", label: "Sistema di giunti", dz: -1.45, win: [0.62, 0.9] },
  { id: "inner", label: "Involucro interno", dz: -1.45, win: [0.62, 0.9] },
  { id: "shellRear", label: "Involucro esterno (posteriore)", dz: -3, win: [0.3, 0.6] },
] as const;
export type PartId = (typeof PARTS)[number]["id"];

export const BELT_OPEN = { d: 0.3, win: [0.48, 0.64] as const };
export const JOINTS_EXT = { d: 0.32, win: [0.62, 0.82] as const };

export type PetalDescriptor = { band: 0 | 1; q: 0 | 1 | 2 | 3 };
export const PETALS: readonly PetalDescriptor[] = [
  { band: 0, q: 0 }, { band: 0, q: 1 }, { band: 0, q: 2 }, { band: 0, q: 3 },
  { band: 1, q: 0 }, { band: 1, q: 1 }, { band: 1, q: 2 }, { band: 1, q: 3 },
];
export type VectorTuple = [number, number, number];

export const petalDir = ({ band, q }: PetalDescriptor): VectorTuple => {
  const theta = band === 0 ? (SPEC.shell.oblo + Math.PI / 2) / 2 : (Math.PI / 2 + SPEC.shell.cap) / 2;
  const phi = q * (Math.PI / 2) + Math.PI / 4;
  return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
};
export const innerDir = (q: number): VectorTuple => {
  const phi = q * (Math.PI / 2) + Math.PI / 4;
  return [Math.cos(phi), Math.sin(phi), 0];
};

type PetalPose = PetalDescriptor & { i: number; d: number; twist: number };
type InnerPose = { q: number; d: number; dx: number };
type Readout = { state: string; note: string; cycle: number; explode: number; active: string };
type PoseShape = {
  cycle: number;
  explode: number;
  teardown: number;
  jointsExt: number;
  state: MachineState;
  oblo: { rotZ: number; z: number; hinge: number };
  petals: PetalPose[];
  inner: InnerPose[];
  rings: { a1: number; a2: number; a3: number };
  light: { seams: number; slits: number; core: number };
  core: { rot: number; innerRot: number };
  orbits: { alpha: number; phase: number };
  offsets: Record<PartId, number>;
  readout: Readout;
};

const STATE_LABELS = ["01 STANDBY", "02 ATTIVAZIONE", "03 ESPANSIONE", "04 OPERATIVO"] as const;
const ACTIVE_LABELS = ["Involucro esterno", "Sistema di giunti", "Anelli di stabilizzazione", "Core computazionale"] as const;
const EXPLODED_LABEL = "Tutte (esploso)";

/** Allocate a reusable pose tree for writePose. */
export const createPose = (): MachinePose => ({
  cycle: 0,
  explode: 0,
  teardown: 0,
  jointsExt: 0,
  state: { ...STATES[0] },
  oblo: { rotZ: 0, z: 0, hinge: 0 },
  petals: PETALS.map((petal, i) => ({ ...petal, i, d: 0, twist: 0 })),
  inner: [0, 1, 2, 3].map((q) => ({ q, d: 0, dx: 0 })),
  rings: { a1: 0, a2: 0, a3: 0 },
  light: { seams: 0, slits: 0, core: 0 },
  core: { rot: 0, innerRot: 0 },
  orbits: { alpha: 0, phase: 0 },
  offsets: {
    shellFront: 0, ringOuter: 0, ringMid: 0, ringInner: 0, process: 0,
    core: 0, joints: 0, inner: 0, shellRear: 0,
  },
  readout: { state: STATE_LABELS[0], note: STATES[0].note, cycle: 0, explode: 0, active: ACTIVE_LABELS[0] },
});

/** Fill a preallocated pose; no objects, arrays, or dynamic strings are allocated per call. */
export const writePose = (target: MachinePose, cycle: number, explode = 0, t = 0): MachinePose => {
  const c = clamp01(cycle);
  const ex = clamp01(explode);
  const time = Number.isFinite(t) ? t : 0;
  const close = 1 - ss(0, 0.28, ex);
  const e = ss(0.3, 1, ex);
  const state = c < 0.2 ? STATES[0] : c < 0.45 ? STATES[1] : c < 0.75 ? STATES[2] : STATES[3];
  target.cycle = c;
  target.explode = e;
  target.teardown = ex;
  target.state.id = state.id;
  target.state.name = state.name;
  target.state.note = state.note;
  target.state.from = state.from;
  target.state.to = state.to;

  const unscrew = ss(0.2, 0.3, c);
  target.oblo.rotZ = -40 * D2R * unscrew * close;
  target.oblo.z = 0.12 * unscrew * close;
  target.oblo.hinge = 95 * D2R * ss(0.45, 0.64, c) * close;

  for (let i = 0; i < PETALS.length; i += 1) {
    const petal = PETALS[i];
    const output = target.petals[i];
    const lag = petal.band * 0.05 + petal.q * 0.04;
    const travel = 0.18 * ss(0.28 + lag, 0.42 + lag, c)
      + (petal.band === 0 ? 0.3 : 0.24) * ss(0.48 + lag * 0.5, 0.68 + lag * 0.5, c);
    output.d = travel * close;
    output.twist = (petal.q % 2 ? -1 : 1) * (petal.band === 0 ? 34 : REAR_TWIST) * D2R
      * ss(0.5 + lag * 0.5, 0.72, c) * close;
  }

  const beltOut = BELT_OPEN.d * ss(BELT_OPEN.win[0], BELT_OPEN.win[1], ex);
  for (let q = 0; q < target.inner.length; q += 1) {
    const output = target.inner[q];
    output.d = 0.09 * ss(0.52 + q * 0.02, 0.7, c) * close + beltOut;
    output.dx = beltOut;
  }

  const g = ss(0.5, 0.74, c) * close;
  const spin = ss(0.75, 0.85, c) * close;
  target.rings.a1 = 30 * D2R * g;
  target.rings.a2 = -40 * D2R * g;
  target.rings.a3 = 14 * D2R * g + spin * 10 * D2R * Math.sin(time * 0.7);

  const breathe = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.3));
  const coreGlow = ss(0.46, 0.6, c);
  target.light.seams = breathe * (1 - ss(0.26, 0.4, c)) * close;
  target.light.slits = ss(0.5, 0.7, c);
  target.light.core = Math.max(coreGlow, e) * (1 - 0.4 * e);
  target.core.rot = lerp(time * 0.4, SPEC.core.showRot, e);
  target.core.innerRot = -time * 0.9;
  target.orbits.alpha = ss(0.78, 0.92, c) * close;
  target.orbits.phase = time * 0.25;

  for (let i = 0; i < PARTS.length; i += 1) {
    const part = PARTS[i];
    target.offsets[part.id] = part.dz * ss(part.win[0], part.win[1], ex);
  }

  target.jointsExt = JOINTS_EXT.d * ss(JOINTS_EXT.win[0], JOINTS_EXT.win[1], ex);
  target.readout.state = STATE_LABELS[Number(state.id) - 1];
  target.readout.note = state.note;
  target.readout.cycle = Math.round(c * 100);
  target.readout.explode = Math.round(ex * 100);
  target.readout.active = ex > 0.05 ? EXPLODED_LABEL : ACTIVE_LABELS[Number(state.id) - 1];
  return target;
};

/** Allocate a fresh pose, preserving the spike's convenient public API. */
export function pose(cycle: number, explode = 0, t = 0): PoseShape {
  return writePose(createPose(), cycle, explode, t);
}

export type MachinePose = ReturnType<typeof pose>;
