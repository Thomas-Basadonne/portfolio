import * as THREE from "three";

export interface MachineResources {
  dispose(): void;
  readonly geometryCount: number;
  readonly materialCount: number;
  readonly textureCount: number;
}

/** Owns distinct scene resources, including InstancedMesh GPU buffers and injected textures. */
export function ownMachineResources(
  root: THREE.Object3D,
  textures: Array<THREE.Texture | null>,
  temporary: Array<THREE.BufferGeometry | THREE.Material> = [],
): MachineResources {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const instanced = new Set<THREE.InstancedMesh>();
  const ownedTextures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const renderable = object as THREE.Mesh;
    if (renderable.geometry) geometries.add(renderable.geometry);
    if (renderable.material) {
      if (Array.isArray(renderable.material)) renderable.material.forEach((material) => materials.add(material));
      else materials.add(renderable.material);
    }
    if ((object as THREE.InstancedMesh).isInstancedMesh) instanced.add(object as THREE.InstancedMesh);
  });
  for (const resource of temporary) {
    if (resource instanceof THREE.BufferGeometry) geometries.add(resource);
    else materials.add(resource);
  }
  for (const texture of textures) if (texture) ownedTextures.add(texture);
  let disposed = false;
  return {
    geometryCount: geometries.size,
    materialCount: materials.size,
    textureCount: ownedTextures.size,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const mesh of instanced) mesh.dispose();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of ownedTextures) texture.dispose();
    },
  };
}
