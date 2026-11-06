import * as THREE from "three";

export interface ShellSegmentOptions {
  bevel?: number;
}

const direction = (theta: number, phi: number, radius: number): THREE.Vector3 => new THREE.Vector3(
  Math.sin(theta) * Math.cos(phi) * radius,
  Math.sin(theta) * Math.sin(phi) * radius,
  Math.cos(theta) * radius,
);

/** Closed spherical shell sector with outward/inward faces, cut walls and a narrow edge chamfer. */
export function shellSegment(
  r0: number,
  r1: number,
  th0: number,
  th1: number,
  ph0: number,
  ph1: number,
  nt = 18,
  np = 18,
  planarUV = 0,
  options: ShellSegmentOptions = {},
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const bevel = options.bevel ?? 0.014;
  const hasTh0 = th0 > 1e-4;
  const hasTh1 = th1 < Math.PI - 1e-4;
  const hasPhi = ph1 - ph0 < Math.PI * 2 - 1e-4;
  const inset = bevel / r1;
  const grid = (min: number, max: number, count: number, edge0: boolean, edge1: boolean): number[] => {
    const lo = edge0 ? min + inset : min;
    const hi = edge1 ? max - inset : max;
    const middle = Array.from({ length: count + 1 }, (_, i) => lo + ((hi - lo) * i) / count);
    return [...(edge0 ? [min] : []), ...middle, ...(edge1 ? [max] : [])];
  };
  const thetas = grid(th0, th1, nt, hasTh0, hasTh1);
  const phis = grid(ph0, ph1, np, hasPhi, hasPhi);
  const uvAt = (theta: number, phi: number): [number, number] => planarUV
    ? [0.5 + (Math.sin(theta) * Math.cos(phi)) / (2 * planarUV), 0.5 + (Math.sin(theta) * Math.sin(phi)) / (2 * planarUV)]
    : [(phi - ph0) / (ph1 - ph0), (theta - th0) / (th1 - th0)];
  const pushTriangle = (
    points: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
    ns: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
    tex: [[number, number], [number, number], [number, number]],
  ): void => {
    const cross = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    const average = ns[0].clone().add(ns[1]).add(ns[2]);
    const order = cross.dot(average) < 0 ? [0, 2, 1] as const : [0, 1, 2] as const;
    for (const index of order) {
      const point = points[index];
      const normal = ns[index];
      const uv = tex[index];
      positions.push(point.x, point.y, point.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(uv[0], uv[1]);
    }
  };
  const onEdge = (i: number, j: number): boolean => (hasTh0 && i === 0)
    || (hasTh1 && i === thetas.length - 1)
    || (hasPhi && (j === 0 || j === phis.length - 1));

  for (const outer of [true, false]) {
    for (let i = 0; i < thetas.length - 1; i++) {
      for (let j = 0; j < phis.length - 1; j++) {
        const gridPoints = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]] as const;
        const strip = [outer && hasTh0 && i === 0, outer && hasTh1 && i === thetas.length - 2,
          outer && hasPhi && j === 0, outer && hasPhi && j === phis.length - 2];
        const points = gridPoints.map(([ti, pi]) => direction(thetas[ti], phis[pi], outer ? (onEdge(ti, pi) ? r1 - bevel : r1) : r0));
        const faceNormals = gridPoints.map(([ti, pi]) => {
          const normal = direction(thetas[ti], phis[pi], outer ? 1 : -1);
          if (outer && strip.some(Boolean)) {
            if (strip[0]) normal.add(new THREE.Vector3(Math.cos(th0) * Math.cos(phis[pi]), Math.cos(th0) * Math.sin(phis[pi]), -Math.sin(th0)).negate());
            if (strip[1]) normal.add(new THREE.Vector3(Math.cos(th1) * Math.cos(phis[pi]), Math.cos(th1) * Math.sin(phis[pi]), -Math.sin(th1)));
            if (strip[2]) normal.add(new THREE.Vector3(-Math.sin(ph0), Math.cos(ph0), 0).negate());
            if (strip[3]) normal.add(new THREE.Vector3(-Math.sin(ph1), Math.cos(ph1), 0));
          }
          return normal.normalize();
        });
        const tex = gridPoints.map(([ti, pi]) => uvAt(thetas[ti], phis[pi]));
        pushTriangle([points[0], points[1], points[2]], [faceNormals[0], faceNormals[1], faceNormals[2]], [tex[0], tex[1], tex[2]]);
        pushTriangle([points[0], points[2], points[3]], [faceNormals[0], faceNormals[2], faceNormals[3]], [tex[0], tex[2], tex[3]]);
      }
    }
  }
  const wall = (edge: Array<[number, number, THREE.Vector3]>): void => {
    const count = edge.length - 1;
    for (let i = 0; i < count; i++) {
      const [ta, pa, normal] = edge[i];
      const [tb, pb] = edge[i + 1];
      const points = [direction(ta, pa, r0), direction(ta, pa, r1 - bevel), direction(tb, pb, r1 - bevel), direction(tb, pb, r0)] as const;
      const uvsAt: [[number, number], [number, number], [number, number], [number, number]] = [[i / count, 0], [i / count, 1], [(i + 1) / count, 1], [(i + 1) / count, 0]];
      const n = normal.clone().normalize();
      pushTriangle([points[0], points[1], points[2]], [n, n, n], [uvsAt[0], uvsAt[1], uvsAt[2]]);
      pushTriangle([points[0], points[2], points[3]], [n, n, n], [uvsAt[0], uvsAt[2], uvsAt[3]]);
    }
  };
  if (hasTh0) wall(phis.map((phi) => [th0, phi, new THREE.Vector3(Math.cos(th0) * Math.cos(phi), Math.cos(th0) * Math.sin(phi), -Math.sin(th0)).negate()]));
  if (hasTh1) wall(phis.map((phi) => [th1, phi, new THREE.Vector3(Math.cos(th1) * Math.cos(phi), Math.cos(th1) * Math.sin(phi), -Math.sin(th1))]));
  if (hasPhi) {
    wall(thetas.map((theta) => [theta, ph0, new THREE.Vector3(-Math.sin(ph0), Math.cos(ph0), 0).negate()]));
    wall(thetas.map((theta) => [theta, ph1, new THREE.Vector3(-Math.sin(ph1), Math.cos(ph1), 0)]));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.userData.solid = { kind: "shell", r0, r1, th0, th1, ph0, ph1 };
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}
