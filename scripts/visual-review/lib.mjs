import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const sourcePathspecs = ["src", "public", "index.html", "vite.config.ts", "package.json", "pnpm-lock.yaml"];

export function discoverSourceFiles(root) {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", ...sourcePathspecs], { cwd: root });
  return [...new Set(output.toString("utf8").split(String.fromCharCode(0)).filter(Boolean))]
    .sort()
    .filter((file) => existsSync(resolve(root, file)));
}

export async function finalizeReview({ cleanup, manifest, writeManifest }) {
  const errors = [];
  for (const operation of cleanup) {
    try { await operation(); } catch (error) {
      errors.push(String(error));
      manifest.success = false;
    }
  }
  if (errors.length) manifest.cleanupErrors = errors;
  await writeManifest();
  return errors;
}

// Browser-only init script; never imported by application code.
export function installDrawProbe() {
  const contexts = new Map();
  let browserFrames = 0;
  let frameTime = -1;
  let visibilityChanges = 0;
  const originalRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => originalRaf((time) => {
    frameTime = time;
    callback(time);
  });
  const heartbeat = () => { browserFrames += 1; window.requestAnimationFrame(heartbeat); };
  window.requestAnimationFrame(heartbeat);
  document.addEventListener("visibilitychange", () => { visibilityChanges += 1; });

  const count = (gl, name) => {
    if (!contexts.has(gl)) contexts.set(gl, { draws: {}, sceneFrames: 0, lastFrame: null });
    const record = contexts.get(gl);
    record.draws[name] = (record.draws[name] ?? 0) + 1;
    // A scene frame means an animation-frame timestamp with >=1 GL draw, not a useFrame callback.
    if (record.lastFrame !== frameTime) {
      record.lastFrame = frameTime;
      record.sceneFrames += 1;
    }
  };
  const patch = (owner, name, context) => {
    if (!owner || typeof owner[name] !== "function") return;
    const original = owner[name];
    owner[name] = function (...args) {
      const result = Reflect.apply(original, this, args);
      count(context ?? this, name);
      return result;
    };
  };
  const methods = ["drawArrays", "drawElements", "drawRangeElements", "drawArraysInstanced", "drawElementsInstanced"];
  // WebGL2 may inherit from WebGL1 on some engines: patch each defining prototype only once.
  const patched = new Set();
  for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!type) continue;
    for (const name of methods) {
      let owner = type.prototype;
      while (owner && !Object.hasOwn(owner, name)) owner = Object.getPrototypeOf(owner);
      if (!owner) continue;
      const key = `${name}:${patched.size}`;
      if ([...patched].some((entry) => entry.owner === owner && entry.name === name)) continue;
      patch(owner, name);
      patched.add({ owner, name, key });
    }
  }
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...args) {
    const gl = Reflect.apply(getContext, this, args);
    if (gl && ["webgl", "experimental-webgl", "webgl2"].includes(args[0]) && !contexts.has(gl)) {
      contexts.set(gl, { draws: {}, sceneFrames: 0, lastFrame: null });
      const getExtension = gl.getExtension.bind(gl);
      const extensions = new WeakSet();
      gl.getExtension = (name) => {
        const extension = getExtension(name);
        if (extension && !extensions.has(extension)) {
          extensions.add(extension);
          for (const method of ["drawArraysInstancedANGLE", "drawElementsInstancedANGLE", "multiDrawArraysWEBGL", "multiDrawElementsWEBGL", "multiDrawArraysInstancedWEBGL", "multiDrawElementsInstancedWEBGL"]) {
            patch(extension, method, gl);
          }
        }
        return extension;
      };
    }
    return gl;
  };
  window.__visualReviewProbe = {
    snapshot() {
      const canvases = document.querySelectorAll(".webgl-shell canvas");
      const canvas = canvases.length === 1 ? canvases[0] : null;
      const pair = [...contexts].find(([gl]) => gl.canvas === canvas);
      const gl = pair?.[0];
      const record = pair?.[1];
      const box = canvas?.getBoundingClientRect();
      return {
        installed: true, visibility: document.visibilityState, visibilityChanges, browserFrames,
        canvas: canvas && gl ? {
          ready: canvas.dataset.contextGuard === "ready", width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight, contextLost: gl.isContextLost(),
          displayed: canvas.isConnected && canvas.checkVisibility() && box.width > 0 && box.height > 0,
        } : null,
        draws: { ...record?.draws },
        totalDraws: Object.values(record?.draws ?? {}).reduce((sum, value) => sum + value, 0),
        sceneFrames: record?.sceneFrames ?? 0,
      };
    },
  };
}

export function assertProbeReady(sample, visibility = "visible") {
  const fail = (reason) => { throw new Error(`WebGL probe precondition: ${reason}`); };
  if (!sample?.installed) fail("init script missing");
  if (sample.visibility !== visibility) fail(`expected ${visibility} tab, got ${sample.visibility}`);
  if (!sample.canvas) fail("exactly one scene canvas with an observed context is required");
  if (!sample.canvas.ready) fail("context guard not ready");
  if (sample.canvas.contextLost) fail("context lost");
  if (!sample.canvas.displayed || sample.canvas.width <= 0 || sample.canvas.height <= 0) fail("canvas is not displayed or has an empty drawing buffer");
  if (sample.totalDraws <= 0) fail("context has never drawn; zero is not a valid measurement");
}

export function probeDelta(start, end, durationMs, visibility = "visible") {
  assertProbeReady(start, visibility);
  assertProbeReady(end, visibility);
  if (start.visibilityChanges !== end.visibilityChanges) throw new Error("Visibility changed inside the measurement window");
  if (!(durationMs > 0)) throw new Error("Measurement duration must be positive");
  const draws = Object.fromEntries([...new Set([...Object.keys(start.draws), ...Object.keys(end.draws)])]
    .map((name) => [name, (end.draws[name] ?? 0) - (start.draws[name] ?? 0)]));
  const drawCalls = end.totalDraws - start.totalDraws;
  const browserFrames = end.browserFrames - start.browserFrames;
  const sceneFrames = end.sceneFrames - start.sceneFrames;
  if ([drawCalls, browserFrames, sceneFrames, ...Object.values(draws)].some((value) => value < 0)) throw new Error("Probe counters reset during measurement");
  return {
    durationMs, visibility, draws, drawCalls, browserFrames, sceneFrames,
    drawCallsPerSceneFrame: sceneFrames ? drawCalls / sceneFrames : null,
    browserRafHz: browserFrames * 1000 / durationMs, sceneRafHz: sceneFrames * 1000 / durationMs,
  };
}

export function chapterStops(sections, viewportHeight, scrollHeight) {
  const maximum = Math.max(0, scrollHeight - viewportHeight);
  return sections.flatMap((section) => ["start", "middle", "end"].map((position, index) => ({
    name: `${section.chapter}-${section.id}-${position}`,
    section: section.id, position,
    y: Math.round(Math.min(maximum, Math.max(0, section.top + Math.max(0, section.height - viewportHeight) * index / 2))),
  })));
}
