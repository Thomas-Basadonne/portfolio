import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMachine } from "../src/experience/tb001/machine";
import { type MachineTextures } from "../src/experience/tb001/textures";
import { pose } from "../src/experience/tb001/pose";
import { collisions, coreVisibility } from "./helpers/tb001-probes";
import { filmAt } from "./helpers/tb001-film";

function testTextures(): MachineTextures {
  const texture = () => new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
  return { wear: texture(), panelBump: texture(), panels: texture(), oblo: texture() };
}

function machine(quality: "high" | "low" = "high") {
  return createMachine({ quality, textures: testTextures() });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TB-001 procedural machine", () => {
  for (const quality of ["high", "low"] as const) {
    it(`keeps all tagged solids clear over the 501-pose approved film (${quality})`, () => {
      const result = machine(quality);
      const camera = new THREE.PerspectiveCamera(30, 1440 / 900, 0.1, 100);
      let minimumCore = 1;
      let minimumTeardown = 1;
      try {
        for (let i = 0; i <= 500; i++) {
          const time = i / 20;
          const frame = filmAt(time);
          result.update(pose(frame.cycle, frame.explode, time));
          expect(collisions(result.root), `collision at ${time}s`).toEqual({});
          if ((time >= 7.6 && time <= 13.6) || (time >= 17.2 && time <= 19.8)) {
            camera.position.set(...frame.camera);
            camera.lookAt(0, 0, 0);
            camera.updateMatrixWorld();
            const visibility = coreVisibility(result.root, camera).vis;
            if (time < 14) minimumCore = Math.min(minimumCore, visibility);
            else minimumTeardown = Math.min(minimumTeardown, visibility);
          }
        }
        expect(minimumCore).toBeGreaterThanOrEqual(0.9);
        expect(minimumTeardown).toBeGreaterThanOrEqual(0.95);
      } finally { result.dispose(); }
    }, 120000);
  }

  it("detects the known-bad 34-degree rear twist rather than returning a vacuous green", () => {
    const result = machine();
    const pairs = new Set<string>();
    // The regression is in transit, not in the fully opened hold where travel already cleared the neighbours.
    for (let i = 0; i <= 50; i++) {
      const invalid = pose(0.5 + i / 200, 0, 8);
      for (const petal of invalid.petals) if (petal.band === 1) petal.twist *= 34 / 26;
      result.update(invalid);
      for (const pair of Object.keys(collisions(result.root))) pairs.add(pair);
    }
    expect(pairs.has("petal.rear0|petal.rear3")).toBe(true);
    expect(pairs.has("petal.rear1|petal.rear2")).toBe(true);
    result.dispose();
  });

  it("builds finite, identified v0.4 geometry with solid metadata", () => {
    const result = machine();
    const names = new Set<string>();
    let hasPetal = false;
    let hasCube = false;
    result.root.traverse((object) => {
      if (object.name) names.add(object.name);
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh && !mesh.isInstancedMesh) return;
      const geometry = mesh.geometry;
      if (geometry.userData.solid) hasPetal ||= object.name.startsWith("petal.");
      for (const attributeName of ["position", "normal", "uv"]) {
        const attribute = geometry.getAttribute(attributeName);
        if (!attribute) continue;
        expect(attribute.array.every(Number.isFinite)).toBe(true);
      }
      if (object.name === "core.cube") hasCube = true;
    });
    expect(names).toContain("shell.front");
    expect(names).toContain("shell.rear");
    expect(names).toContain("core");
    expect(names).toContain("orbits");
    expect(names).toContain("seams");
    expect(hasPetal).toBe(true);
    expect(hasCube).toBe(true);
    result.dispose();
  });

  it("converts the custom signal shader to the renderer output color space", () => {
    const result = machine("low");
    const seam = result.root.getObjectByName("seams") as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    expect(seam.material.toneMapped).toBe(false); // Signal is deliberately independent of PBR exposure.
    expect(seam.material.fragmentShader).toContain("#include <colorspace_fragment>");
    result.dispose();
  });

  it("preserves the six structural struts connecting the cage to the process frame", () => {
    const result = machine();
    const struts = result.root.getObjectByName("core.struts") as THREE.InstancedMesh | undefined;
    expect(struts).toBeInstanceOf(THREE.InstancedMesh);
    expect(struts?.count).toBe(6);
    result.dispose();
  });

  it("updates the existing scene and instanced buffers across poses", () => {
    const result = machine();
    const objects: THREE.Object3D[] = [];
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    result.root.traverse((object) => {
      objects.push(object);
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => materials.add(material));
      else if (mesh.material) materials.add(mesh.material);
    });
    result.update(pose(0.25, 0, 0));
    const front = result.root.getObjectByName("shell.front");
    expect(front?.position.z).toBeCloseTo(0, 8);
    result.update(pose(0.9, 0.8, 3));
    expect(result.root.getObjectByName("shell.front")?.position.z).toBeGreaterThan(0);
    expect(result.root.getObjectByName("shell.rear")?.position.z).toBeLessThan(0);
    expect(result.root.getObjectByName("orbits.nodes")).toBeInstanceOf(THREE.InstancedMesh);
    const after: THREE.Object3D[] = [];
    result.root.traverse((object) => after.push(object));
    expect(after).toEqual(objects);
    const finalGeometries = new Set<THREE.BufferGeometry>();
    const finalMaterials = new Set<THREE.Material>();
    result.root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) finalGeometries.add(mesh.geometry);
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => finalMaterials.add(material));
      else if (mesh.material) finalMaterials.add(mesh.material);
    });
    expect(finalGeometries).toEqual(geometries);
    expect(finalMaterials).toEqual(materials);
    result.dispose();
  });

  it("moves a petal outward during activation and closes it for teardown", () => {
    const result = machine();
    const petal = result.root.getObjectByName("petal.front0");
    result.update(pose(0.7, 0, 0));
    const openDistance = petal?.position.length() ?? 0;
    expect(openDistance).toBeGreaterThan(0.1);
    result.update(pose(0.7, 0.8, 0));
    expect(petal?.position.length()).toBeCloseTo(0, 8);
    result.dispose();
  });

  it("provides lower-topology low quality without dropping the panel maps", () => {
    const high = machine("high");
    const low = machine("low");
    expect(low.stats.triangles).toBeLessThan(high.stats.triangles);
    expect(low.stats.instances).toBeLessThanOrEqual(high.stats.instances);
    for (const result of [high, low]) {
    const petalGroup = result.root.getObjectByName("petal.front0");
      const petal = petalGroup?.children[0] as THREE.Mesh;
      expect(petal.material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
      expect((petal.material as THREE.MeshPhysicalMaterial).map).not.toBeNull();
      result.dispose();
    }
  });

  it("refreshes bounds of animated instances so teardown rivets are not culled at their old position", () => {
    const result = machine();
    const rivets = result.root.getObjectByName("rivets") as THREE.InstancedMesh;
    rivets.computeBoundingSphere();
    const oldRadius = rivets.boundingSphere!.radius;
    result.update(pose(1, 1, 17.5));
    expect(rivets.boundingSphere!.radius).toBeGreaterThan(oldRadius * 2);
    result.dispose();
  });

  it("counts resident triangles including every instance rather than one copy of an instanced mesh", () => {
    const result = machine();
    let triangles = 0;
    result.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const count = object.geometry.index?.count ?? object.geometry.attributes.position.count;
      triangles += count / 3 * (object instanceof THREE.InstancedMesh ? object.count : 1);
    });
    expect(result.stats.triangles).toBe(triangles);
    result.dispose();
  });

  it("disposes owned resources exactly once and detaches its root", () => {
    const textures = testTextures();
    const textureDisposals = Object.values(textures).filter((texture): texture is THREE.Texture => texture !== null).map((texture) => vi.spyOn(texture, "dispose"));
    const result = createMachine({ quality: "low", textures });
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const instancedMeshes: THREE.InstancedMesh[] = [];
    result.root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if ((object as THREE.InstancedMesh).isInstancedMesh) instancedMeshes.push(object as THREE.InstancedMesh);
      if (Array.isArray(mesh.material)) mesh.material.forEach((material) => materials.add(material));
      else if (mesh.material) materials.add(mesh.material);
    });
    const geometryDisposals = [...geometries].map((geometry) => vi.spyOn(geometry, "dispose"));
    const materialDisposals = [...materials].map((material) => vi.spyOn(material, "dispose"));
    const instanceDisposals = instancedMeshes.map((mesh) => vi.spyOn(mesh, "dispose"));
    const parent = new THREE.Group();
    parent.add(result.root);
    result.dispose();
    result.dispose();
    expect(result.root.parent).toBeNull();
    for (const spy of [...textureDisposals, ...geometryDisposals, ...materialDisposals, ...instanceDisposals]) expect(spy).toHaveBeenCalledTimes(1);
  });
});
