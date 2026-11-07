import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createGunmetalMaterial } from "../src/experience/tb001/materials";

// These values reproduce the approved #18 surface, not a new look.
describe("TB-001 reusable gunmetal", () => {
  for (const quality of ["high", "low"] as const) {
    it(`preserves the approved PBR response (${quality})`, () => {
      const wear = new THREE.Texture();
      const material = createGunmetalMaterial(quality, wear);
      expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
      expect(material.color.getHexString()).toBe("7a7e85");
      expect(material.metalness).toBe(1);
      expect(material.roughness).toBe(0.32);
      expect(material.envMapIntensity).toBe(1);
      expect(material.roughnessMap).toBe(quality === "high" ? wear : null);
      expect(material.anisotropy).toBe(quality === "high" ? 0.55 : 0);
      expect(material.toneMapped).toBe(true);
      let disposed = false;
      wear.addEventListener("dispose", () => { disposed = true; });
      material.dispose();
      expect(disposed).toBe(false); // The texture owner, not the material, releases shared maps.
      wear.dispose();
    });
  }
});
