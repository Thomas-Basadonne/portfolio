import * as THREE from "three";

const visible = (o: THREE.Object3D) => {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
};
const isMesh = (o: THREE.Object3D): o is THREE.Mesh => o instanceof THREE.Mesh;

/** Real geometry inventory, not renderer calls (which are read separately after a frame). */
export function inventory(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let triangles = 0, instances = 0, instancedMeshes = 0;
  root.traverse((o) => {
    if (!isMesh(o)) return;
    geometries.add(o.geometry);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) {
      materials.add(mat);
      for (const value of Object.values(mat)) if (value instanceof THREE.Texture) textures.add(value);
    }
    const count = o instanceof THREE.InstancedMesh ? o.count : 1;
    if (o instanceof THREE.InstancedMesh) { instances += count; instancedMeshes++; }
    if (visible(o)) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * count;
  });
  return { geometries: geometries.size, materials: materials.size, textures: textures.size, triangles, instances, instancedMeshes };
}

/** Project the actual visible geometry, not corners of an enclosing world AABB (which exaggerate perspective). */
export function boundsOnScreen(root: THREE.Object3D, camera: THREE.Camera) {
  root.updateMatrixWorld(true);
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const point = new THREE.Vector3();
  const instance = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  root.traverse(o => {
    if (!isMesh(o) || !visible(o)) return;
    const vertices = o.geometry.attributes.position;
    const count = o instanceof THREE.InstancedMesh ? o.count : 1;
    for (let k = 0; k < count; k++) {
      if (o instanceof THREE.InstancedMesh) {
        o.getMatrixAt(k, instance);
        world.multiplyMatrices(o.matrixWorld, instance);
      } else world.copy(o.matrixWorld);
      for (let i = 0; i < vertices.count; i++) {
        point.fromBufferAttribute(vertices, i).applyMatrix4(world).project(camera);
        min.min(point); max.max(point);
      }
    }
  });
  return { min: min.toArray(), max: max.toArray() };
}

/** v0.4 surface ray probe. Graphic layers are not solid occluders; cage counts as core. */
export function coreVisibility(root: THREE.Object3D, camera: THREE.Camera, n = 10) {
  root.updateMatrixWorld(true);
  const cube = root.getObjectByName("core.cube") as THREE.Mesh | undefined;
  const core = root.getObjectByName("core");
  if (!cube || !core) throw new Error("Named core geometry missing: the probe cannot claim zero occlusion");
  const coreSet = new Set<THREE.Object3D>();
  core.traverse(o => coreSet.add(o));
  const skip = new Set<THREE.Object3D>();
  for (const name of ["seams", "orbits"]) root.getObjectByName(name)?.traverse(o => skip.add(o));
  const solids: THREE.Mesh[] = [];
  root.traverse(o => { if (isMesh(o) && !skip.has(o) && visible(o)) solids.push(o); });
  const cam = camera.getWorldPosition(new THREE.Vector3());
  const ray = new THREE.Raycaster();
  const h = 0.15;
  let seen = 0, total = 0;
  const by: Record<string, number> = {};
  for (let f = 0; f < 6; f++) {
    const ax = f >> 1, sg = f & 1 ? -1 : 1;
    const normal = new THREE.Vector3().setComponent(ax, sg).transformDirection(cube.matrixWorld);
    const center = new THREE.Vector3().setComponent(ax, sg * h).applyMatrix4(cube.matrixWorld);
    if (normal.dot(cam.clone().sub(center)) <= 0) continue;
    const [u, v] = [0, 1, 2].filter(k => k !== ax);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const point = new THREE.Vector3().setComponent(ax, sg * h * 1.001)
        .setComponent(u, ((i + 0.5) / n - 0.5) * 2 * h * 0.96)
        .setComponent(v, ((j + 0.5) / n - 0.5) * 2 * h * 0.96).applyMatrix4(cube.matrixWorld);
      const dir = point.sub(cam), distance = dir.length();
      ray.set(cam, dir.divideScalar(distance)); ray.far = distance + 0.01;
      const hit = ray.intersectObjects(solids, false)[0];
      total++;
      if (!hit || coreSet.has(hit.object)) seen++;
      else by[hit.object.name || hit.object.parent?.name || "?"] = (by[hit.object.name || hit.object.parent?.name || "?"] ?? 0) + 1;
    }
  }
  return { vis: total ? seen / total : 0, by };
}

/** v0.4 analytic tagged-solid probe. Vertices only; edge/edge-only intersections can escape. */
export function collisions(root: THREE.Object3D, stride = 1) {
  const EPS = 0.003, TAU = Math.PI * 2;
  const designed = new Set(["bracket|flange.front", "bracket|oblo", "cap|shaft", "flange.rear|shaft"]);
  root.updateMatrixWorld(true);
  const solids: THREE.Mesh[] = [];
  root.traverse(o => { if (isMesh(o) && o.geometry.userData.solid && visible(o)) solids.push(o); });
  if (!solids.length) throw new Error("No tagged solids: collision precondition missing");
  const inv = new THREE.Matrix4(), lp = new THREE.Vector3(), scale = new THREE.Vector3();
  const depth = (o: THREE.Mesh, point: THREE.Vector3) => {
    const s = o.geometry.userData.solid;
    inv.copy(o.matrixWorld).invert(); lp.copy(point).applyMatrix4(inv); scale.setFromMatrixScale(o.matrixWorld);
    const { x, y, z } = lp;
    if (s.kind === "shell") {
      const r = lp.length();
      if (r < s.r0 || r > s.r1) return -1;
      const th = Math.acos(Math.min(1, Math.max(-1, z / r)));
      if (th < s.th0 || th > s.th1) return -1;
      const span = s.ph1 - s.ph0, angle = (((Math.atan2(y, x) - s.ph0) % TAU) + TAU) % TAU;
      const full = span > TAU - 1e-4;
      if (!full && angle > span) return -1;
      return Math.min(r - s.r0, s.r1 - r, s.th0 > 1e-4 ? r * (th - s.th0) : 9,
        s.th1 < Math.PI - 1e-4 ? r * (s.th1 - th) : 9, full ? 9 : r * Math.sin(th) * angle, full ? 9 : r * Math.sin(th) * (span - angle));
    }
    if (s.kind === "annulus") return Math.min(Math.hypot(x, y) - s.ri, s.ro - Math.hypot(x, y), s.h / 2 - Math.abs(z)) * scale.x;
    if (s.kind === "box") return Math.min((s.hx - Math.abs(x)) * scale.x, (s.hy - Math.abs(y)) * scale.y, (s.hz - Math.abs(z)) * scale.z);
    if (s.kind === "cylY") return Math.min(s.r - Math.hypot(x, z), (s.hy - Math.abs(y)) * scale.y);
    if (s.kind === "cylZ") return Math.min(s.r - Math.hypot(x, y), s.hz - Math.abs(z));
    return -1;
  };
  const boxes = new Map(solids.map(o => [o, new THREE.Box3().setFromObject(o).expandByScalar(EPS)]));
  const point = new THREE.Vector3();
  // Keep v0.4 contact identities when the port's scene names become hierarchical.
  const solidName = (o: THREE.Mesh) => o.name
    .replace(/^oblo\.bracket$/, "bracket")
    .replace(/^oblo\.panel$/, "oblo")
    .replace(/^shell\.cap$/, "cap")
    .replace(/^joints\.(piston\d+)\.(sleeve|rod)$/, "$1");
  const result: Record<string, { n: number; depth: number }> = {};
  for (const a of solids) for (const b of solids) {
    if (a === b || solidName(a) === solidName(b)) continue;
    const key = [solidName(a), solidName(b)].sort().join("|");
    if (designed.has(key) || !boxes.get(a)!.intersectsBox(boxes.get(b)!)) continue;
    const position = a.geometry.attributes.position;
    for (let i = 0; i < position.count; i += stride) {
      point.fromBufferAttribute(position, i).applyMatrix4(a.matrixWorld);
      if (!boxes.get(b)!.containsPoint(point)) continue;
      const d = depth(b, point);
      if (d > EPS) { const hit = result[key] ??= { n: 0, depth: 0 }; hit.n++; hit.depth = Math.max(hit.depth, d); }
    }
  }
  return result;
}
