import * as THREE from "three";
import { innerDir, petalDir, PETALS, pose, SPEC, type MachinePose } from "./pose";
import { ownMachineResources } from "./resources";
import { shellSegment } from "./shell";
import type { MachineTextures } from "./textures";

export interface MachineStats {
  triangles: number;
  instances: number;
  geometries: number;
  materials: number;
  textures: number;
}

export interface MachineOptions {
  quality: "high" | "low";
  textures: MachineTextures;
}

export interface Machine {
  root: THREE.Group;
  update(pose: MachinePose): void;
  dispose(): void;
  stats: MachineStats;
}

const ORANGE = new THREE.Color("#ff5a1f");
const DEG = Math.PI / 180;
type Segment = { mesh: THREE.Mesh; pivot: THREE.Group; direction: THREE.Vector3; band: number; q: number };

function markSolid<T extends THREE.BufferGeometry>(geometry: T, solid: Record<string, number | string>): T {
  geometry.userData.solid = solid;
  return geometry;
}

export function createMachine({ quality, textures }: MachineOptions): Machine {
  const high = quality === "high";
  const root = new THREE.Group();
  root.name = "tb001.machine";
  const shellFront = new THREE.Group(); shellFront.name = "shell.front";
  const shellRear = new THREE.Group(); shellRear.name = "shell.rear";
  root.add(shellFront, shellRear);
  const segments: Segment[] = [];
  const tracked = new Set<THREE.BufferGeometry>();
  const tempGeometries: THREE.BufferGeometry[] = [];
  const tempMaterials: THREE.Material[] = [];
  const track = <T extends THREE.BufferGeometry>(geometry: T): T => { tracked.add(geometry); return geometry; };
  const radialSegments = high ? 30 : 15;
  const angularSegments = high ? 34 : 17;
  const sphereSegments = high ? 96 : 48;
  const wear = textures.wear;
  const steel = new THREE.MeshStandardMaterial({ color: "#a4a6aa", metalness: 0.85, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: "#4a4c50", metalness: 0.55, roughness: 0.52, roughnessMap: high ? wear : null, envMapIntensity: 0.9 });
  const gun = new THREE.MeshPhysicalMaterial({ color: "#7a7e85", metalness: 1, roughness: 0.32, roughnessMap: high ? wear : null, anisotropy: high ? 0.55 : 0, envMapIntensity: 1 });
  const panelGun = gun.clone();
  panelGun.map = textures.panels;
  if (high) { panelGun.bumpMap = textures.panelBump; panelGun.bumpScale = 4; }
  const emissive = (intensity: number): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: ORANGE.clone().multiplyScalar(intensity), toneMapped: false });
  const seamMaterial = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 1 }, uCol: { value: new THREE.Color("#ff6a10") }, uObl: { value: SPEC.shell.oblo }, uCap: { value: SPEC.shell.cap }, uGap: { value: SPEC.shell.gap * 1.6 } },
    vertexShader: "varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: "uniform float uK,uObl,uCap,uGap; uniform vec3 uCol; varying vec3 vP; void main(){vec3 d=normalize(vP); float th=acos(clamp(d.z,-1.0,1.0)); float ph=atan(d.y,d.x); float q=abs(mod(ph+6.2831853,1.5707963)); q=min(q,1.5707963-q); float s=1.0-smoothstep(0.0,uGap,q*sin(th)); s=max(s,1.0-smoothstep(0.0,uGap,abs(th-1.5707963))); s=max(s,1.0-smoothstep(0.0,uGap,abs(th-uObl))); s=max(s,1.0-smoothstep(0.0,uGap,abs(th-uCap))); gl_FragColor=vec4(uCol*1.7*uK*s,1.0);}",
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const { r0, r1, oblo, cap, gap } = SPEC.shell;
  const obloMaterial = new THREE.MeshStandardMaterial({ map: textures.oblo, metalness: 0.75, roughness: 0.4 });
  const hatchGroup = new THREE.Group(); hatchGroup.name = "oblo"; shellFront.add(hatchGroup);
  const hingePoint = new THREE.Vector3(0, -Math.sin(oblo) * r1, Math.cos(oblo) * r1 + 0.012);
  const hinge = new THREE.Group(); hinge.position.copy(hingePoint); hatchGroup.add(hinge);
  const spin = new THREE.Group(); spin.position.copy(hingePoint).negate(); hinge.add(spin);
  const hatch = new THREE.Mesh(track(shellSegment(r0 + 0.005, r1 + 0.012, 0, oblo - gap / 2, 0, Math.PI * 2, high ? 8 : 4, sphereSegments, Math.sin(oblo))), obloMaterial);
  hatch.name = "oblo.panel"; spin.add(hatch);
  const hingeAxle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.018, 0.018, 0.16, high ? 12 : 6).rotateZ(Math.PI / 2)), steel);
  hingeAxle.position.copy(hingePoint); hatchGroup.add(hingeAxle);
  const bracketStart = hingePoint.clone();
  const bracketEnd = new THREE.Vector3(0, -SPEC.flange.ro, SPEC.flange.z);
  const bracket = new THREE.Mesh(track(new THREE.BoxGeometry(0.012, 1, 0.04)), dark);
  bracket.name = "oblo.bracket";
  bracket.position.copy(bracketStart).add(bracketEnd).multiplyScalar(0.5);
  bracket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bracketEnd.clone().sub(bracketStart).normalize());
  bracket.scale.y = bracketStart.distanceTo(bracketEnd);
  markSolid(bracket.geometry, { kind: "box", hx: 0.006, hy: 0.5, hz: 0.02 });
  hatchGroup.add(bracket);
  const frontPetals: Segment[] = [];
  for (const petal of PETALS) {
    const phi0 = petal.q * Math.PI / 2 + gap / 2;
    const phi1 = (petal.q + 1) * Math.PI / 2 - gap / 2;
    const theta0 = petal.band === 0 ? oblo + gap / 2 : Math.PI / 2 + gap / 2;
    const theta1 = petal.band === 0 ? Math.PI / 2 - gap / 2 : cap - gap / 2;
    const geometry = track(shellSegment(r0, r1, theta0, theta1, phi0, phi1, radialSegments, angularSegments));
    const mesh = new THREE.Mesh(geometry, panelGun);
    mesh.name = `petal.${petal.band ? "rear" : "front"}${petal.q}`;
    const pivot = new THREE.Group(); pivot.name = mesh.name; pivot.add(mesh);
    (petal.band === 0 ? shellFront : shellRear).add(pivot);
    const entry = { mesh, pivot, direction: new THREE.Vector3(...petalDir(petal)), band: petal.band, q: petal.q };
    segments.push(entry); frontPetals.push(entry);
  }
  const capMesh = new THREE.Mesh(track(shellSegment(r0, r1, cap + gap / 2, Math.PI, 0, Math.PI * 2, high ? 8 : 4, sphereSegments)), gun);
  capMesh.name = "shell.cap"; shellRear.add(capMesh);
  const seam = new THREE.Mesh(track(new THREE.SphereGeometry(SPEC.seams.r, sphereSegments, high ? 64 : 32)), seamMaterial);
  seam.name = "seams"; root.add(seam);

  const rivetGeometry = track(new THREE.SphereGeometry(0.012, high ? 12 : 6, high ? 6 : 3, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2));
  const rivetMaterial = steel;
  const rivetEntries: Array<{ band: number; q: number; matrix: THREE.Matrix4 }> = [];
  for (const petal of PETALS) {
    const phi0 = petal.q * Math.PI / 2 + gap / 2 + 0.035;
    const phi1 = (petal.q + 1) * Math.PI / 2 - gap / 2 - 0.035;
    const thetaA = (petal.band === 0 ? oblo : Math.PI / 2) + gap / 2 + 0.035;
    const thetaB = (petal.band === 0 ? Math.PI / 2 : cap) - gap / 2 - 0.035;
    for (let i = 0; i <= 5; i++) for (const theta of [thetaA, thetaB]) {
      const phi = phi0 + (phi1 - phi0) * i / 5;
      const direction = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta));
      const matrix = new THREE.Matrix4().compose(direction.clone().multiplyScalar(r1 + 0.003), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction), new THREE.Vector3(1, 1, 1));
      rivetEntries.push({ band: petal.band, q: petal.q, matrix });
    }
  }
  const rivets = new THREE.InstancedMesh(rivetGeometry, rivetMaterial, rivetEntries.length);
  rivets.name = "rivets"; root.add(rivets);

  const innerGroup = new THREE.Group(); innerGroup.name = "inner"; root.add(innerGroup);
  const innerMeshes: THREE.Mesh[] = [];
  for (let q = 0; q < 4; q++) {
    const geometry = track(shellSegment(SPEC.inner.r0, SPEC.inner.r1, SPEC.inner.th0, SPEC.inner.th1, q * Math.PI / 2 + SPEC.inner.gap / 2, (q + 1) * Math.PI / 2 - SPEC.inner.gap / 2, high ? 14 : 7, high ? 12 : 6));
    const mesh = new THREE.Mesh(geometry, dark); mesh.name = `inner${q}`; innerGroup.add(mesh); innerMeshes.push(mesh);
  }

  const rings: THREE.Group[] = [];
  const ringMaterial = gun;
  const slitMaterial = emissive(2.6);
  const slitGeometry = track(new THREE.BoxGeometry(0.004, 0.032, 0.018));
  const ringSlits: THREE.InstancedMesh[] = [];
  for (let index = 0; index < SPEC.rings.length; index++) {
    const spec = SPEC.rings[index];
    const group = new THREE.Group(); group.name = spec.id;
    if (index === 0) root.add(group); else rings[index - 1].add(group);
    rings.push(group);
    const profile = [new THREE.Vector2(spec.r - spec.t / 2, -spec.h / 2), new THREE.Vector2(spec.r + spec.t / 2, -spec.h / 2), new THREE.Vector2(spec.r + spec.t / 2, spec.h / 2), new THREE.Vector2(spec.r - spec.t / 2, spec.h / 2), new THREE.Vector2(spec.r - spec.t / 2, -spec.h / 2)];
    const ringGeo = track(new THREE.LatheGeometry(profile, high ? 96 : 48).rotateX(Math.PI / 2));
    markSolid(ringGeo, { kind: "annulus", ri: spec.r - spec.t / 2, ro: spec.r + spec.t / 2, h: spec.h });
    const ring = new THREE.Mesh(ringGeo, ringMaterial); ring.name = spec.id; group.add(ring);
    const slitCount = high ? [36, 30, 26][index] : [18, 15, 13][index];
    const slits = new THREE.InstancedMesh(slitGeometry, slitMaterial, slitCount); slits.name = `${spec.id}.slits`;
    for (let k = 0; k < slitCount; k++) {
      const angle = k / slitCount * Math.PI * 2;
      slits.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(angle) * (spec.r + spec.t / 2 + 0.0015), Math.sin(angle) * (spec.r + spec.t / 2 + 0.0015), 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle), new THREE.Vector3(1, 1, 1)));
    }
    group.add(slits); ringSlits.push(slits);
  }
  const pinGeo = track(new THREE.CylinderGeometry(0.014, 0.014, 0.07, high ? 12 : 6).rotateZ(Math.PI / 2));
  for (const sign of [-1, 1]) {
    const pin = new THREE.Mesh(pinGeo, steel); pin.position.set(sign * (SPEC.rings[0].r + 0.045), 0, 0); rings[0].add(pin);
  }
  const midPinGeometry = track(new THREE.CylinderGeometry(0.014, 0.014, SPEC.rings[0].r - SPEC.rings[1].r, high ? 12 : 6));
  const innerPinGeometry = track(new THREE.CylinderGeometry(0.014, 0.014, SPEC.rings[1].r - SPEC.rings[2].r, high ? 12 : 6).rotateZ(Math.PI / 2));
  for (const sign of [-1, 1]) {
    const midPin = new THREE.Mesh(midPinGeometry, steel);
    midPin.position.set(0, sign * ((SPEC.rings[0].r + SPEC.rings[1].r) / 2), 0);
    rings[1].add(midPin);
    const innerPin = new THREE.Mesh(innerPinGeometry, steel);
    innerPin.position.set(sign * ((SPEC.rings[1].r + SPEC.rings[2].r) / 2), 0, 0);
    rings[2].add(innerPin);
  }

  const process = new THREE.Group(); process.name = "process"; root.add(process);
  const flangeProfile = [new THREE.Vector2(0.37, -SPEC.flange.th / 2), new THREE.Vector2(SPEC.flange.ro, -SPEC.flange.th / 2), new THREE.Vector2(SPEC.flange.ro, SPEC.flange.th / 2), new THREE.Vector2(0.37, SPEC.flange.th / 2), new THREE.Vector2(0.37, -SPEC.flange.th / 2)];
  const flangeGeometry = track(new THREE.LatheGeometry(flangeProfile, high ? 72 : 36).rotateX(Math.PI / 2));
  markSolid(flangeGeometry, { kind: "annulus", ri: 0.37, ro: SPEC.flange.ro, h: SPEC.flange.th });
  const slotMaterial = emissive(1);
  for (const sign of [-1, 1]) {
    const flange = new THREE.Mesh(flangeGeometry, gun); flange.name = sign > 0 ? "flange.front" : "flange.rear"; flange.position.z = sign * SPEC.flange.z; process.add(flange);
    if (sign < 0) {
      const hub = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 24).rotateX(Math.PI / 2)), steel); hub.position.z = sign * SPEC.flange.z; process.add(hub);
      for (let k = 0; k < SPEC.flange.spokes; k++) {
        const angle = k / SPEC.flange.spokes * Math.PI * 2;
        const spoke = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.022, 0.018)), dark);
        spoke.position.set(Math.cos(angle) * 0.215, Math.sin(angle) * 0.215, sign * SPEC.flange.z); spoke.rotation.z = angle; process.add(spoke);
      }
    }
    const slot = new THREE.Mesh(track(new THREE.TorusGeometry(0.395, 0.004, 6, high ? 72 : 36)), slotMaterial);
    slot.position.z = sign * (SPEC.flange.z + SPEC.flange.th / 2 + 0.001); process.add(slot);
  }
  const shaft = new THREE.Mesh(markSolid(track(new THREE.CylinderGeometry(SPEC.shaft.r, SPEC.shaft.r, SPEC.shaft.z1 - SPEC.shaft.z0, high ? 16 : 8).rotateX(Math.PI / 2)), { kind: "cylZ", r: SPEC.shaft.r, hz: (SPEC.shaft.z1 - SPEC.shaft.z0) / 2 }), steel);
  shaft.position.z = (SPEC.shaft.z0 + SPEC.shaft.z1) / 2; shaft.name = "shaft"; shellRear.add(shaft);

  const core = new THREE.Group(); core.name = "core"; root.add(core);
  const dodecahedron = new THREE.DodecahedronGeometry(SPEC.cage.R, 0);
  const edges = new THREE.EdgesGeometry(dodecahedron);
  const edgePositions = edges.getAttribute("position");
  const edgeCount = edgePositions.count / 2;
  const cageGeometry = track(new THREE.CylinderGeometry(SPEC.cage.tube, SPEC.cage.tube, 1, 8));
  const cage = new THREE.InstancedMesh(cageGeometry, steel, edgeCount); cage.name = "core.cage";
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < edgeCount; i++) {
    const a = new THREE.Vector3().fromBufferAttribute(edgePositions, i * 2);
    const b = new THREE.Vector3().fromBufferAttribute(edgePositions, i * 2 + 1);
    const delta = b.clone().sub(a);
    cage.setMatrixAt(i, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, delta.clone().normalize()), new THREE.Vector3(1, delta.length(), 1)));
  }
  core.add(cage);
  // v0.4 struts: nearest three cage vertices to each pole, with the front ends on the open flange.
  const vertices = new Map<string, THREE.Vector3>();
  for (let i = 0; i < edgePositions.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(edgePositions, i);
    vertices.set(vertex.toArray().map((value) => value.toFixed(4)).join(), vertex);
  }
  const struts = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.008, 0.008, 1, high ? 8 : 4)), steel, 6);
  struts.name = "core.struts";
  let strutIndex = 0;
  for (const sign of [-1, 1]) {
    const pole = new THREE.Vector3(0, 0, sign * SPEC.cage.R);
    const near = [...vertices.values()].sort((a, b) => a.distanceTo(pole) - b.distanceTo(pole)).slice(0, 3);
    for (const vertex of near) {
      const radius = Math.hypot(vertex.x, vertex.y) || 1;
      const hub = sign < 0
        ? new THREE.Vector3(0, 0, sign * (SPEC.flange.z - 0.03))
        : new THREE.Vector3(vertex.x / radius * 0.37, vertex.y / radius * 0.37, SPEC.flange.z - 0.02);
      const delta = vertex.clone().sub(hub);
      struts.setMatrixAt(strutIndex++, new THREE.Matrix4().compose(
        hub.clone().add(vertex).multiplyScalar(0.5),
        new THREE.Quaternion().setFromUnitVectors(up, delta.clone().normalize()),
        new THREE.Vector3(1, delta.length(), 1),
      ));
    }
  }
  core.add(struts);
  tempGeometries.push(dodecahedron, edges);
  const coreMaterial = new THREE.MeshBasicMaterial({ color: ORANGE.clone().multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0.92 });
  const innerCoreMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd2a6").multiplyScalar(4), toneMapped: false });
  const cubeTilt = new THREE.Group(); cubeTilt.rotation.set(0.42, Math.PI / 4, 0.12); core.add(cubeTilt);
  const cubeGeometry = track(new THREE.BoxGeometry(SPEC.core.edge, SPEC.core.edge, SPEC.core.edge));
  const faceFactors = [0.9, 0.42, 1.25, 0.6, 0.78, 0.7];
  const faceMaterials = faceFactors.map(() => { const material = coreMaterial.clone(); tempMaterials.push(material); return material; });
  const cube = new THREE.Mesh(cubeGeometry, faceMaterials); cube.name = "core.cube"; cubeTilt.add(cube);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: "#ffe3c8", toneMapped: false });
  const cubeEdges = new THREE.LineSegments(track(new THREE.EdgesGeometry(cubeGeometry)), edgeMaterial);
  cubeEdges.name = "core.cube.edges"; cubeTilt.add(cubeEdges);
  const innerCube = new THREE.Mesh(track(new THREE.BoxGeometry(SPEC.core.inner, SPEC.core.inner, SPEC.core.inner)), innerCoreMaterial); innerCube.name = "core.inner"; cubeTilt.add(innerCube);
  tempMaterials.push(coreMaterial);

  const joints = new THREE.Group(); joints.name = "joints"; root.add(joints);
  const sleeveGeometry = track(markSolid(new THREE.CylinderGeometry(0.034, 0.034, 1, 14), { kind: "cylY", r: 0.034, hy: 0.5 }));
  const rodGeometry = track(markSolid(new THREE.CylinderGeometry(0.018, 0.018, 1, 12), { kind: "cylY", r: 0.018, hy: 0.5 }));
  const pistons = PETALS.map((petal, index) => {
    const sleeve = new THREE.Mesh(sleeveGeometry, dark); sleeve.name = `joints.piston${index}.sleeve`;
    const rod = new THREE.Mesh(rodGeometry, steel); rod.name = `joints.piston${index}.rod`;
    joints.add(sleeve, rod); return { sleeve, rod, petal };
  });

  const orbits = new THREE.Group(); orbits.name = "orbits"; root.add(orbits);
  const orbitMaterial = new THREE.MeshBasicMaterial({ color: ORANGE.clone().multiplyScalar(1.6), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: ORANGE.clone().multiplyScalar(4), toneMapped: false, transparent: true, depthWrite: false });
  const orbitCurves: THREE.CatmullRomCurve3[] = [];
  const orbitRotations: THREE.Quaternion[] = [];
  for (const spec of SPEC.orbits) {
    const group = new THREE.Group(); group.rotation.set(spec.tilt[0] * DEG, spec.tilt[1] * DEG, spec.tilt[2] * DEG);
    orbitRotations.push(group.quaternion.clone());
    const ellipse = new THREE.EllipseCurve(0, 0, spec.a, spec.b, 0, Math.PI * 2, false, 0);
    const points = ellipse.getSpacedPoints(high ? 160 : 80).map((point) => new THREE.Vector3(point.x, point.y, 0));
    const curve = new THREE.CatmullRomCurve3(points, true); orbitCurves.push(curve);
    group.add(new THREE.Mesh(track(new THREE.TubeGeometry(curve, high ? 220 : 110, 0.0025, high ? 5 : 3, true)), orbitMaterial)); orbits.add(group);
  }
  const nodes = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.02, high ? 12 : 6, high ? 8 : 4)), nodeMaterial, 9); nodes.name = "orbits.nodes"; orbits.add(nodes);
  const nodeOffsets = Array.from({ length: 9 }, () => new THREE.Vector3());
  const innerDirections = [0, 1, 2, 3].map((q) => new THREE.Vector3(...innerDir(q)));
  const nodeQuaternion = new THREE.Quaternion();
  const temp = new THREE.Vector3();
  const temp2 = new THREE.Vector3();
  const temp3 = new THREE.Vector3();
  const temp4 = new THREE.Vector3();
  const tempMatrix = new THREE.Matrix4();
  const tempScale = new THREE.Vector3(1, 1, 1);
  const petalQuat = new THREE.Quaternion();
  const place = (mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3): void => {
    temp4.copy(to).sub(from);
    const length = Math.max(1e-4, temp4.length());
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(up, temp4.divideScalar(length));
    mesh.scale.set(1, length, 1);
  };
  const stats: MachineStats = { triangles: 0, instances: 0, geometries: 0, materials: 0, textures: 0 };
  const resources = ownMachineResources(root, [textures.wear, textures.panelBump, textures.panels, textures.oblo], [...tempGeometries, ...tempMaterials]);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh instanceof THREE.Mesh) {
      const triangles = (mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position").count) / 3;
      stats.triangles += triangles * (mesh instanceof THREE.InstancedMesh ? mesh.count : 1);
    }
    if ((object as THREE.InstancedMesh).isInstancedMesh) stats.instances += (object as THREE.InstancedMesh).count;
  });
  stats.geometries = resources.geometryCount;
  stats.materials = resources.materialCount;
  stats.textures = resources.textureCount;

  function update(current: MachinePose): void {
    const offset = current.offsets;
    shellFront.position.z = offset.shellFront;
    shellRear.position.z = offset.shellRear;
    hatchGroup.position.z = current.oblo.z;
    hinge.rotation.x = current.oblo.hinge;
    hatch.rotation.z = current.oblo.rotZ;
    for (const segment of segments) {
      const state = current.petals[segment.band * 4 + segment.q];
      petalQuat.setFromAxisAngle(segment.direction, state.twist);
      segment.pivot.quaternion.copy(petalQuat);
      segment.pivot.position.copy(segment.direction).multiplyScalar(state.d);
    }
    for (let i = 0; i < rivetEntries.length; i++) {
      const entry = rivetEntries[i];
      const segment = segments[entry.band * 4 + entry.q];
      temp.set(0, 0, entry.band === 0 ? offset.shellFront : offset.shellRear).add(segment.pivot.position);
      tempMatrix.compose(temp, segment.pivot.quaternion, tempScale).multiply(entry.matrix);
      rivets.setMatrixAt(i, tempMatrix);
    }
    rivets.instanceMatrix.needsUpdate = true;
    rivets.computeBoundingSphere();
    rivets.computeBoundingBox();
    seamMaterial.uniforms.uK.value = current.light.seams;
    seam.visible = current.light.seams > 0.02 && current.explode < 0.5;
    innerGroup.position.z = offset.inner;
    for (let q = 0; q < innerMeshes.length; q++) innerMeshes[q].position.copy(innerDirections[q]).multiplyScalar(current.inner[q].d);
    rings[0].position.z = offset.ringOuter;
    rings[1].position.z = offset.ringMid - offset.ringOuter;
    rings[2].position.z = offset.ringInner - offset.ringMid;
    rings[0].rotation.set(current.rings.a1, 0, 0);
    rings[1].rotation.set(0, current.rings.a2, 0);
    rings[2].rotation.set(current.rings.a3, 0, 0);
    slitMaterial.color.copy(ORANGE).multiplyScalar(0.15 + 0.75 * current.light.slits);
    slotMaterial.color.copy(ORANGE).multiplyScalar(0.15 + 0.8 * current.light.slits);
    process.position.z = offset.process;
    core.position.z = offset.core;
    cubeTilt.rotation.y = Math.PI / 4 + current.core.rot;
    innerCube.rotation.set(current.core.innerRot, current.core.innerRot * 0.7, 0);
    const glow = current.light.core;
    for (let i = 0; i < faceMaterials.length; i++) {
      faceMaterials[i].color.copy(ORANGE).multiplyScalar((0.12 + 1.7 * glow) * faceFactors[i]);
      faceMaterials[i].opacity = 0.55 + 0.37 * glow;
    }
    innerCoreMaterial.color.set("#ffd2a6").multiplyScalar(0.15 + 2.2 * glow);
    edgeMaterial.color.set("#ffe3c8").multiplyScalar(0.3 + 1.6 * glow);
    joints.position.z = offset.joints;
    for (let i = 0; i < pistons.length; i++) {
      const { petal } = pistons[i];
      const state = current.petals[i];
      const inward = temp2.copy(innerDirections[petal.q]).multiplyScalar(current.inner[petal.q].d);
      const direction = segments[i].direction;
      const base = temp.copy(direction).multiplyScalar(SPEC.inner.r1 + 0.004).add(inward);
      const tip = temp3.copy(direction).multiplyScalar(r0 - 0.002 + state.d + current.jointsExt).addScaledVector(innerDirections[petal.q], current.inner[petal.q].dx);
      const sleeveEnd = temp2.copy(base).addScaledVector(direction, 0.05);
      place(pistons[i].sleeve, base, sleeveEnd);
      place(pistons[i].rod, base, tip);
      const visible = state.d > 0.01 && current.explode < 0.02 || current.explode > 0.02;
      pistons[i].sleeve.visible = visible; pistons[i].rod.visible = visible;
    }
    orbits.visible = current.orbits.alpha > 0.01;
    orbitMaterial.opacity = current.orbits.alpha * 0.45;
    nodeMaterial.opacity = current.orbits.alpha;
    for (let orbit = 0; orbit < orbitCurves.length; orbit++) {
      for (let item = 0; item < 3; item++) {
        const u = (((current.orbits.phase * (1 + orbit * 0.27) + item / 3 + orbit * 0.17) % 1) + 1) % 1;
        orbitCurves[orbit].getPointAt(u, nodeOffsets[orbit * 3 + item]);
        nodeOffsets[orbit * 3 + item].applyQuaternion(orbitRotations[orbit]);
        tempMatrix.compose(nodeOffsets[orbit * 3 + item], nodeQuaternion, tempScale);
        nodes.setMatrixAt(orbit * 3 + item, tempMatrix);
      }
    }
    nodes.instanceMatrix.needsUpdate = true;
    nodes.computeBoundingSphere();
    nodes.computeBoundingBox();
  }

  update(pose(0, 0, 0));
  return { root, update, dispose: resources.dispose, stats };
}
