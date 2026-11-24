/**
 * Click/tap on the Compiler's core (#47, L1). The core is a metaphor: under a mouse it breathes and the cursor changes,
 * so the click is discoverable; tapping it lights it and, where the readout is shown, a fixed line on the method
 * replaces the readings for a few seconds. Pure helpers, tested without a renderer.
 */

/** Half of the 44 px target (#49): a small core on a phone still gets a full-size target. */
export const CORE_TARGET_RADIUS = 22;
/** How long the readout shows the note (Thomas, 23/11/2026: a few seconds, then the model's reading returns). */
export const CORE_NOTE_MS = 4000;
/** Length of the light pulse; under reduced motion or a pause it is a plain on/off of the same length. */
export const CORE_FLASH_MS = 1200;

export type CoreOnScreen = { x: number; y: number; r: number; visible: boolean };

/** Whether a point (canvas px) falls on the projected core, never smaller than the 44 px target. */
export function hitsCore(x: number, y: number, core: CoreOnScreen) {
  return core.visible && Math.hypot(x - core.x, y - core.y) <= Math.max(CORE_TARGET_RADIUS, core.r);
}

/** Period of the hover breath (ms). */
export const CORE_HOVER_MS = 1400;

/** Extra core light (0..1) while the mouse is over the core: a slow breath, or a steady glow when motion is off. */
export function coreHover(now: number, still: boolean) {
  if (still) return 0.6;
  return 0.4 + 0.3 * Math.sin((now / CORE_HOVER_MS) * 2 * Math.PI);
}

/** Extra core light (0..1) at `elapsed` ms into the pulse: eased out, or held flat when motion is off. */
export function coreFlash(elapsed: number, still: boolean) {
  if (elapsed < 0 || elapsed >= CORE_FLASH_MS) return 0;
  if (still) return 1;
  const left = 1 - elapsed / CORE_FLASH_MS;
  return left * left;
}
