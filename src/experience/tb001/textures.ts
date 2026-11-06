import * as THREE from "three";

export interface MachineTextures {
  wear: THREE.Texture | null;
  panelBump: THREE.Texture | null;
  panels: THREE.Texture;
  oblo: THREE.Texture;
}

function canvas(size: number): HTMLCanvasElement {
  if (typeof document === "undefined") throw new Error("TB-001 canvas textures require a browser document; inject textures in non-browser environments.");
  const element = document.createElement("canvas");
  element.width = size;
  element.height = size;
  return element;
}

function seededWear(size: number): THREE.CanvasTexture {
  const surface = canvas(size);
  const context = surface.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable for TB-001 wear texture.");
  let seed = 7;
  const random = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  context.fillStyle = "#a0a0a0";
  context.fillRect(0, 0, size, size);
  for (let i = 0; i < 2400; i++) {
    const y = random() * size;
    const x = random() * size;
    const length = 8 + random() * 60;
    const value = 90 + random() * 90;
    context.strokeStyle = `rgba(${value},${value},${value},${0.08 + random() * 0.12})`;
    context.lineWidth = random() < 0.04 ? 1.4 : 0.6;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y + (random() - 0.5) * 2);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(surface);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function panelTextures(size: number, includeBump: boolean): { bump: THREE.CanvasTexture | null; map: THREE.CanvasTexture } {
  const mapCanvas = canvas(size);
  const bumpCanvas = includeBump ? canvas(size) : null;
  const draw = (context: CanvasRenderingContext2D, background: string, line: string, width: number): void => {
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = line;
    context.lineWidth = width;
    context.lineCap = "square";
    const lineSegment = (x0: number, y0: number, x1: number, y1: number): void => {
      context.beginPath();
      context.moveTo(x0 * size, y0 * size);
      context.lineTo(x1 * size, y1 * size);
      context.stroke();
    };
    lineSegment(0, 0.52, 1, 0.52);
    lineSegment(0.5, 0, 0.5, 0.52);
    lineSegment(0.62, 0.52, 0.62, 1);
    context.strokeRect(0.14 * size, 0.66 * size, 0.3 * size, 0.2 * size);
    context.fillStyle = line;
    for (const [x, y] of [[0.17, 0.69], [0.41, 0.69], [0.17, 0.83], [0.41, 0.83]]) {
      context.beginPath();
      context.arc(x * size, y * size, width * 0.9, 0, Math.PI * 2);
      context.fill();
    }
  };
  const bumpContext = bumpCanvas?.getContext("2d") ?? null;
  const mapContext = mapCanvas.getContext("2d");
  if (!mapContext || (includeBump && !bumpContext)) throw new Error("Canvas 2D context is unavailable for TB-001 panel textures.");
  if (bumpContext) {
    bumpContext.filter = "blur(2.5px)";
    draw(bumpContext, "#ffffff", "#000000", 7);
  }
  draw(mapContext, "#ffffff", "#7c7c7c", 3);
  const bump = bumpCanvas ? new THREE.CanvasTexture(bumpCanvas) : null;
  const map = new THREE.CanvasTexture(mapCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  if (bump) bump.anisotropy = includeBump ? 8 : 1;
  map.anisotropy = includeBump ? 8 : 1;
  return { bump, map };
}

function obloTexture(): THREE.CanvasTexture {
  const surface = canvas(512);
  const context = surface.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable for TB-001 oblò texture.");
  context.fillStyle = "#7d7f83";
  context.fillRect(0, 0, 512, 512);
  context.strokeStyle = "#2a2b2d";
  for (const [radius, width] of [[236, 6], [212, 2], [120, 2]]) {
    context.lineWidth = width;
    context.beginPath();
    context.arc(256, 256, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = "#d9d6cf";
  context.font = '600 64px "JetBrains Mono", monospace';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("TB-001 —", 256, 262);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Creates deterministic, per-machine texture resources; caller transfers ownership to createMachine. */
export function createMachineTextures(quality: "high" | "low"): MachineTextures {
  const { bump, map } = panelTextures(quality === "high" ? 512 : 256, quality === "high");
  return {
    wear: quality === "high" ? seededWear(256) : null,
    panelBump: bump,
    panels: map,
    oblo: obloTexture(),
  };
}
