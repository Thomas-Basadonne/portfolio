// Local-only material study: never imported from the production entry.
import * as THREE from "three";
import { createGunmetalMaterial } from "../../src/experience/tb001/materials";
import { createStudioEnvironment } from "../../src/experience/tb001/studio";
import { createMachineTextures } from "../../src/experience/tb001/textures";
import { createMachine } from "../../src/experience/tb001/machine";

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("canvas")!, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(innerWidth, innerHeight - 90, false);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, innerWidth / (innerHeight - 90), 0.1, 100);
camera.position.set(0, 0.5, 9);
camera.lookAt(0, 0, 0);
const geometry = new THREE.SphereGeometry(0.66, 64, 32);
const textures = createMachineTextures("high");
const gun = createGunmetalMaterial("high", textures.wear);
const graphite = new THREE.MeshStandardMaterial({ color: "#4a4c50", metalness: 0, roughness: 0.65 });
const bone = new THREE.MeshStandardMaterial({ color: "#e9e5da", metalness: 0, roughness: 0.42 });
for (const [i, material] of [gun, graphite, bone].entries()) {
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.x = (i - 1) * 1.7;
  scene.add(sphere);
}
// Same numeric emission and faceted shape as the actual core. Not a PBR light source.
const coreMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff5a1f").multiplyScalar(1.2), toneMapped: false });
const coreGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
const core = new THREE.Mesh(coreGeometry, coreMaterial);
core.position.set(0, -1, 0);
core.rotation.set(0.3, 0.6, 0);
scene.add(core);
const pmrem: { quality: string; elapsedMs: number; width: number; height: number }[] = [];
const environments = new Map<string, THREE.WebGLRenderTarget>();
let quality: "high" | "low" = "high";
let firstUsefulFrameMs: number | null = null;
const started = performance.now();
let renders = 0;
function render() {
  renderer.render(scene, camera);
  renderer.getContext().finish(); // Completion-inclusive diagnostic, not uninstrumented GPU time.
  renders++;
  firstUsefulFrameMs ??= performance.now() - started;
}
function set(next: { quality?: "high" | "low"; environment?: boolean; surface?: "dark" | "light"; tone?: "neutral" | "aces" }) {
  quality = next.quality ?? quality;
  gun.roughnessMap = quality === "high" ? textures.wear : null;
  gun.anisotropy = quality === "high" ? 0.55 : 0;
  gun.needsUpdate = true;
  if (next.environment !== false) {
    if (!environments.has(quality)) {
      renderer.getContext().finish();
      const start = performance.now();
      const target = createStudioEnvironment(renderer, quality);
      renderer.getContext().finish();
      pmrem.push({ quality, elapsedMs: performance.now() - start, width: target.width, height: target.height });
      environments.set(quality, target);
    }
    scene.environment = environments.get(quality)!.texture;
  } else scene.environment = null;
  scene.environmentIntensity = 1.12;
  scene.background = new THREE.Color(next.surface === "light" ? "#e9e5da" : "#0b0b0a");
  document.body.style.background = next.surface === "light" ? "#e9e5da" : "#0b0b0a";
  document.body.style.color = next.surface === "light" ? "#0b0b0a" : "#e9e5da";
  renderer.toneMapping = next.tone === "aces" ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
  render();
}

// Exercise the real seam fragment with a constant point on its meridian, so its color
// can be compared to a standard material independently of geometry/antialiasing.
function seamSwatch() {
  const machine = createMachine({ quality: "low", textures: createMachineTextures("low") });
  const seam = machine.root.getObjectByName("seams") as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  const material = seam.material.clone();
  material.uniforms.uK.value = 0.25;
  material.transparent = false;
  material.blending = THREE.NoBlending;
  material.vertexShader = "varying vec3 vP; void main(){vP=vec3(1.,0.,0.); gl_Position=vec4(position,1.);}";
  const quad = new THREE.PlaneGeometry(2, 2);
  const swatch = new THREE.Scene();
  swatch.add(new THREE.Mesh(quad, material));
  // Read the default framebuffer, as in the product. An sRGB render target can
  // apply hardware encoding and conceal the missing shader output conversion.
  renderer.setRenderTarget(null);
  renderer.render(swatch, camera);
  const gl = renderer.getContext();
  const pixel = new Uint8Array(4);
  gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  const expected = new THREE.Color("#ff6a10").multiplyScalar(1.7 * 0.25).convertLinearToSRGB().toArray().map(x => Math.round(x * 255));
  quad.dispose(); material.dispose(); machine.dispose();
  render();
  return { actual: Array.from(pixel).slice(0, 3), expected };
}
function sample() {
  const gl = renderer.getContext();
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    quality, renders, pmrem, firstUsefulFrameMs,
    memory: { ...renderer.info.memory },
    calls: renderer.info.render.calls,
    pipeline: { toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace, colorManagement: THREE.ColorManagement.enabled },
    gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    materials: [gun, graphite, bone].map(m => ({ color: m.color.getHexString(), metalness: m.metalness, roughness: m.roughness })),
  };
}
function dispose() {
  scene.environment = null;
  for (const target of environments.values()) target.dispose();
  environments.clear();
  for (const texture of Object.values(textures)) texture?.dispose();
  for (const material of [gun, graphite, bone, coreMaterial]) material.dispose();
  geometry.dispose(); coreGeometry.dispose(); scene.clear();
  render();
  const memory = { ...renderer.info.memory };
  renderer.dispose();
  return memory;
}
Object.assign(window, { lookdevReview: { set, sample, seamSwatch, dispose } });
set({});
