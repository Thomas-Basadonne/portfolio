import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { chapterStops, assertProbeReady, probeDelta, installDrawProbe, discoverSourceFiles, finalizeReview } from "../scripts/visual-review/lib.mjs";

describe("visual review source identity", () => {
  it("includes untracked source and rediscovers newly created files with NUL-safe paths", async () => {
    await mkdir(join(process.cwd(), "visual-review"), { recursive: true });
    const fixture = await mkdtemp(join(process.cwd(), "visual-review", "source-fixture-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: fixture });
      await mkdir(join(fixture, "src"), { recursive: true });
      await writeFile(join(fixture, "src", "tracked.ts"), "tracked");
      execFileSync("git", ["add", "src/tracked.ts"], { cwd: fixture });
      await writeFile(join(fixture, "src", "new file.ts"), "untracked");
      await writeFile(join(fixture, ".gitignore"), "src/ignored.ts\n");
      await writeFile(join(fixture, "src", "ignored.ts"), "secret");
      const initial = discoverSourceFiles(fixture);
      expect(initial).toContain("src/new file.ts");
      expect(initial).not.toContain("src/ignored.ts");
      await writeFile(join(fixture, "src", "later.ts"), "created during review");
      expect(discoverSourceFiles(fixture)).toContain("src/later.ts");
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });
});

describe("visual review cleanup finalization", () => {
  it("attempts each cleanup independently and writes a failed manifest after rejections", async () => {
    const manifest = { success: true };
    const attempted = [];
    let written = false;
    const errors = await finalizeReview({
      cleanup: [
        async () => { attempted.push("browser"); throw new Error("browser close failed"); },
        async () => { attempted.push("server"); throw new Error("server close failed"); },
      ],
      manifest,
      writeManifest: async () => { written = true; },
    });
    expect(attempted).toEqual(["browser", "server"]);
    expect(errors).toHaveLength(2);
    expect(manifest.success).toBe(false);
    expect(written).toBe(true);
  });
});

describe("visual review capture positions", () => {
  it("uses actual chapter bounds, clamps the last viewport and retains short-section aliases", () => {
    const stops = chapterStops([
      { id: "identity", chapter: "00", top: 0, height: 1200 },
      { id: "contact", chapter: "05", top: 1200, height: 600 },
    ], 900, 1800);
    expect(stops.map(({ y }) => y)).toEqual([0, 150, 300, 900, 900, 900]);
    expect(stops.map(({ name }) => name)).toEqual([
      "00-identity-start", "00-identity-middle", "00-identity-end",
      "05-contact-start", "05-contact-middle", "05-contact-end",
    ]);
  });
});

const ready = {
  installed: true, visibility: "visible", visibilityChanges: 0, browserFrames: 50,
  canvas: { ready: true, width: 1440, height: 900, displayed: true, contextLost: false },
  draws: { drawElements: 26 }, sceneFrames: 2, totalDraws: 26,
};

describe("WebGL probe preconditions and units", () => {
  it("rejects an absent, hidden, unready, lost or never-drawn canvas instead of reporting zero", () => {
    expect(() => assertProbeReady(ready)).not.toThrow();
    for (const sample of [
      { ...ready, installed: false }, { ...ready, visibility: "hidden" },
      { ...ready, canvas: null }, { ...ready, totalDraws: 0 },
      ...[{ ready: false }, { width: 0 }, { displayed: false }, { contextLost: true }]
        .map((canvas) => ({ ...ready, canvas: { ...ready.canvas, ...canvas } })),
    ]) expect(() => assertProbeReady(sample)).toThrow(/probe precondition/i);
  });

  it("allows a verified hidden window only when requested and rejects visibility transitions", () => {
    const hidden = { ...ready, visibility: "hidden" };
    expect(() => assertProbeReady(hidden, "hidden")).not.toThrow();
    expect(() => probeDelta(ready, { ...ready, visibilityChanges: 1 }, 1000)).toThrow(/visibility/i);
  });

  it("keeps draw calls, rendered animation frames and browser rAF separate", () => {
    const result = probeDelta(ready, {
      ...ready, draws: { drawElements: 52, drawArrays: 2 }, totalDraws: 54,
      browserFrames: 110, sceneFrames: 4,
    }, 1000);
    expect(result.drawCalls).toBe(28);
    expect(result.browserFrames).toBe(60);
    expect(result.sceneFrames).toBe(2);
    expect(result.drawCallsPerSceneFrame).toBe(14);
    expect(result.browserRafHz).toBe(60);
    expect(result.sceneRafHz).toBe(2);
  });

  it("instruments standard, instanced and extension calls once, scoped to the scene canvas", () => {
    class GL {
      constructor(canvas) { this.canvas = canvas; this.drawingBufferWidth = 300; this.drawingBufferHeight = 150; }
      drawArrays() {}
      drawElements() {}
      getExtension() { return this.extension ??= { drawArraysInstancedANGLE() {}, multiDrawArraysWEBGL() {} }; }
      isContextLost() { return this.lost ?? false; }
    }
    class GL2 extends GL {
      drawArraysInstanced() {}
      drawElementsInstanced() {}
    }
    class Canvas {
      dataset = { contextGuard: "ready" };
      isConnected = true;
      getContext() { return this.gl ??= new GL2(this); }
      getBoundingClientRect() { return { width: 300, height: 150 }; }
      checkVisibility() { return true; }
    }
    const canvas = new Canvas();
    let raf;
    const window = {
      WebGLRenderingContext: GL, WebGL2RenderingContext: GL2,
      requestAnimationFrame(callback) { raf = callback; },
    };
    const document = { visibilityState: "visible", addEventListener() {}, querySelectorAll: () => [canvas] };
    runInNewContext(`(${installDrawProbe.toString()})()`, { window, document, HTMLCanvasElement: Canvas });
    const gl = canvas.getContext("webgl2");
    expect(() => assertProbeReady(window.__visualReviewProbe.snapshot())).toThrow(/never drawn/);
    gl.drawArrays(); gl.drawElements(); gl.drawArraysInstanced(); gl.drawElementsInstanced();
    gl.getExtension().drawArraysInstancedANGLE(); gl.getExtension().multiDrawArraysWEBGL();
    new Canvas().getContext().drawArrays();
    const first = window.__visualReviewProbe.snapshot();
    assertProbeReady(first);
    expect(first.totalDraws).toBe(6);
    expect(first.draws).toEqual({ drawArrays: 1, drawElements: 1, drawArraysInstanced: 1, drawElementsInstanced: 1, drawArraysInstancedANGLE: 1, multiDrawArraysWEBGL: 1 });
    raf(16);
    gl.drawElements();
    expect(window.__visualReviewProbe.snapshot().sceneFrames).toBe(2);
    gl.lost = true;
    expect(() => assertProbeReady(window.__visualReviewProbe.snapshot())).toThrow(/lost/);
  });
});
