import * as THREE from "three";

/**
 * Orbit alpha range over which the symbolic orbits enter the camera fit (generator) — below the lower bound they
 * are ignored, above the upper bound they are framed like solid parts. Containment is asserted for them only once
 * fully framed: a fading ring at under a fifth of its opacity may leave the frame as it disappears.
 */
export const ORBIT_FRAMING = [0.25, 0.75] as const;

/** Hides the orbits from geometric probes while they are not fully framed; returns a restore callback. */
export function hideUnframedOrbits(root: THREE.Object3D, alpha: number) {
  const orbits = root.getObjectByName("orbits");
  if (!orbits || alpha >= ORBIT_FRAMING[1]) return () => {};
  const previous = orbits.visible;
  orbits.visible = false;
  return () => { orbits.visible = previous; };
}
