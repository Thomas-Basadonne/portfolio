import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createStudioScene } from "../src/experience/tb001/studio";

describe("TB-001 procedural studio", () => {
  it("recreates the approved seven reflection cards without external assets", () => {
    const studio = createStudioScene("high");
    expect(studio.scene.children).toHaveLength(8);
    expect(studio.scene.children.filter((o) => o.name.startsWith("studio.card"))).toHaveLength(7);
    expect(studio.scene.background).toBeNull();
    expect(studio.scene.environment).toBeNull();
    const dome = studio.scene.getObjectByName("studio.dome") as THREE.Mesh;
    expect(dome.material).toBeInstanceOf(THREE.ShaderMaterial);
    const materials = studio.scene.children.map((o) => (o as THREE.Mesh).material as THREE.Material);
    const geometries = studio.scene.children.map((o) => (o as THREE.Mesh).geometry);
    const spies = [...materials, ...geometries].map((o) => vi.spyOn(o, "dispose"));
    studio.dispose();
    studio.dispose();
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
    expect(studio.scene.children).toHaveLength(0);
  });
});
