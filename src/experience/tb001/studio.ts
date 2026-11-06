import * as THREE from "three";
import type { RenderQuality } from "../../lib/experienceStore";

/** Reflection rig from the approved #18 v0.4 spike; no HDR, lights, background or post. */
export function createStudioScene(quality: RenderQuality) {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(30, quality === "high" ? 48 : 24, quality === "high" ? 24 : 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: /* glsl */ `
        varying vec3 vD;
        void main() {
          vD = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vD;
        void main() {
          float y = vD.y;
          vec3 top = vec3(0.50, 0.50, 0.52);
          vec3 hor = vec3(0.30, 0.29, 0.28);
          vec3 flo = vec3(0.17, 0.16, 0.15);
          vec3 c = y > 0.0
            ? mix(hor, top, smoothstep(0.0, 0.8, y))
            : mix(hor, flo, smoothstep(0.0, 0.35, -y));
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    }),
  );
  dome.name = "studio.dome";
  scene.add(dome);
  const card = (w: number, h: number, pos: [number, number, number], k: number, color = "#ffffff") => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }),
    );
    mesh.name = `studio.card${scene.children.length}`;
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  card(16, 10, [-2, 14, 4], 0.7);
  card(2.2, 18, [-12, 2, 7], 1.6);
  card(2.2, 18, [11, 1, -7], 1.6, "#ffe2cc");
  card(14, 1.6, [0, 3, -14], 1.6);
  card(14, 1.6, [2, -6, -11], 1.8);
  card(0.9, 14, [-9, 4, 10], 2.6);
  card(18, 3.5, [0, -5, 12], 0.9, "#d8cfc6");
  let disposed = false;
  return {
    scene,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const child of scene.children) {
        const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      scene.clear();
    },
  };
}

/** The caller owns the render target; generator and temporary rig never escape. */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer, quality: RenderQuality) {
  const studio = createStudioScene(quality);
  const generator = new THREE.PMREMGenerator(renderer);
  try {
    return generator.fromScene(studio.scene, 0.04, 0.1, 100, { size: quality === "high" ? 256 : 128 });
  } finally {
    generator.dispose();
    studio.dispose();
  }
}
