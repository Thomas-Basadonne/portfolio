import { BOOT_CAP_MS, bootPercent, type BootStage, type GateMode } from "./gatePolicy";

/**
 * Drives the static boot loader of index.html (#boot). Everything it animates while the scene is built is
 * CSS on transform/opacity, so it keeps moving through the long task of the first compile; the numbers it writes
 * are the real stages reached, never a timer.
 */
const LABEL: Record<BootStage, string> = {
  shell: "Calibrating",
  app: "Assembling the interface",
  fonts: "Setting the type",
  instrument: "Loading the instrument",
  scene: "Optics aligned",
};

const reached = new Set<BootStage>(["shell"]);
let mode: GateMode = "interactive";
let finished = false;
let shown = 0;
let tween = 0;
let cap = 0;

const listeners = new Set<() => void>();

/** Called once the loader leaves (at once if it already has). */
export function onBootFinished(listener: () => void) {
  if (finished) listener();
  else listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const node = () => (typeof document === "undefined" ? null : document.getElementById("boot"));

function paint(target: number, label: string) {
  const root = node();
  if (!root) return;
  root.style.setProperty("--boot", String(target / 100));
  const stage = root.querySelector(".boot__stage");
  if (stage) stage.textContent = label;
  const count = root.querySelector(".boot__count b");
  window.cancelAnimationFrame(tween);
  const from = shown, start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 450);
    shown = Math.round(from + (target - from) * (1 - (1 - t) ** 3));
    if (count) count.textContent = String(shown).padStart(3, "0");
    if (t < 1) tween = window.requestAnimationFrame(step);
  };
  tween = window.requestAnimationFrame(step);
}

/** Removes the loader. `immediate` for visits that skip the gate (deep link, reload): nothing to reveal. */
export function finishBoot(immediate = false) {
  const root = node();
  if (finished) return;
  finished = true;
  window.clearTimeout(cap);
  for (const listener of listeners) listener();
  listeners.clear();
  if (!root) return;
  if (immediate) {
    root.remove();
    return;
  }
  paint(100, LABEL.scene);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The count lands on 100 before the panel lifts: the exit is the reveal, not a wait.
  window.setTimeout(() => root.classList.add("is-done"), reduce ? 0 : 180);
  window.setTimeout(() => root.remove(), reduce ? 300 : 1300);
}

export function startBoot(gate: GateMode) {
  mode = gate;
  if (finished) return;
  window.clearTimeout(cap);
  cap = window.setTimeout(() => finishBoot(), BOOT_CAP_MS);
  reachBoot("app");
}

export function setBootMode(gate: GateMode) {
  mode = gate;
  if (!finished && bootPercent(reached, mode) === 100) finishBoot();
}

export function reachBoot(stage: BootStage) {
  if (finished) return;
  reached.add(stage);
  const percent = bootPercent(reached, mode);
  if (percent === 100) {
    finishBoot();
    return;
  }
  // The label names the work still under way, not the stage just done.
  const next = (["app", "fonts", "instrument", "scene"] as const).find((step) => !reached.has(step)) ?? stage;
  paint(percent, LABEL[next]);
}
