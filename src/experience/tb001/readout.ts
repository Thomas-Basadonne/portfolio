import { clamp01 } from "./pose";

/*
 * The model readout (#20), approved on 23/11/2026: state, one contextual percentage and the active part, all pure
 * functions of (cycle, explode) — the same inputs as the pose. No timer, no random: a paused, hidden or resumed tab and
 * a reverse scroll read the same values. TB-001 is an illustrative concept: the percentages describe the model's
 * mechanics, not physical quantities or work results.
 */

export const READOUT_PARTS = ["outer", "inner", "joints", "rings", "core"] as const;
export type ReadoutPart = (typeof READOUT_PARTS)[number];

export type ModelReadout = {
  /** 0 STANDBY · 1 ACTIVATION · 2 EXPANSION · 3 OPERATIONAL (SPEC v0.4 cycle windows). */
  state: number;
  /** CYCLE outside the teardown, EXPLODED as soon as the parts separate: the number always describes what moves. */
  metric: "cycle" | "explode";
  /** 0..100, rounded; the unrounded value is the clamped model input. */
  value: number;
  /** The part in motion, or null in standby. */
  part: ReadoutPart | null;
};

/*
 * Active part, measured on pose.ts (scroll-driven motion only). Cycle: the named part moves in its whole span; above
 * 0.85 no mechanical part moves with the scroll and the core is the part in operation (the one approved exception).
 * Teardown: the part that started last and still moves; windows start in order, so the sequence is monotonic.
 */
const CYCLE_PARTS: readonly (readonly [number, ReadoutPart | null])[] = [
  [0.2, null], [0.5, "outer"], [0.74, "rings"], [0.75, "outer"], [0.85, "rings"], [Infinity, "core"],
];
const TEARDOWN_PARTS: readonly (readonly [number, ReadoutPart])[] = [
  [0.48, "outer"], [0.62, "inner"], [0.66, "joints"], [0.72, "rings"], [Infinity, "core"],
];

const partAt = <T>(table: readonly (readonly [number, T])[], value: number): T =>
  table.find(([below]) => value < below)![1];

export const createReadout = (): ModelReadout => ({ state: 0, metric: "cycle", value: 0, part: null });

export function writeReadout(target: ModelReadout, cycle: number, explode: number): ModelReadout {
  const c = clamp01(cycle);
  const e = clamp01(explode);
  target.state = c < 0.2 ? 0 : c < 0.45 ? 1 : c < 0.75 ? 2 : 3;
  target.metric = e > 0 ? "explode" : "cycle";
  target.value = Math.round((e > 0 ? e : c) * 100);
  target.part = e > 0 ? partAt(TEARDOWN_PARTS, e) : partAt(CYCLE_PARTS, c);
  return target;
}

export const sameReadout = (a: ModelReadout, b: ModelReadout) =>
  a.state === b.state && a.metric === b.metric && a.value === b.value && a.part === b.part;
