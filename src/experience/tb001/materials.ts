import * as THREE from "three";
import type { RenderQuality } from "../../lib/experienceStore";

/** Approved #18 gunmetal. Caller owns the material; the texture owner retains the shared wear map. */
export function createGunmetalMaterial(quality: RenderQuality, wear: THREE.Texture | null) {
  return new THREE.MeshPhysicalMaterial({
    color: "#7a7e85",
    metalness: 1,
    roughness: 0.32,
    roughnessMap: quality === "high" ? wear : null,
    anisotropy: quality === "high" ? 0.55 : 0,
    envMapIntensity: 1,
  });
}
