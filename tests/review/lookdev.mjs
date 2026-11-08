import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, preview } from "vite";
import { launchReviewBrowser } from "../../scripts/visual-review/browser.mjs";
import { discoverSourceFiles, finalizeReview } from "../../scripts/visual-review/lib.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const out = resolve(root, "visual-review/lookdev", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(out, { recursive: true });
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
async function fingerprint() {
  const paths = [...discoverSourceFiles(root), "tests/fixtures/lookdev.ts", "tests/fixtures/lookdev.html", "tests/fixtures/tb001.tsx", "tests/review/lookdev.mjs", "tests/review/tb001.mjs"];
  return Object.fromEntries(await Promise.all(paths.sort().map(async path => [path, createHash("sha256").update(await readFile(resolve(root, path))).digest("hex")])));
}
const result = { commit: git("rev-parse", "HEAD"), branch: git("branch", "--show-current"), status: git("status", "--porcelain"), hashes: await fingerprint(), success: false, cases: [], errors: [] };
let server, production, owned;
try {
  server = await createServer({ root, server: { host: "127.0.0.1", port: 0, open: false } });
  await server.listen();
  result.port = server.httpServer.address().port;
  owned = await launchReviewBrowser(out);
  result.browser = { version: owned.browser.version(), ownership: owned.ownership };
  const page = owned.context.pages()[0];
  await page.setViewportSize({ width: 1100, height: 680 });
  page.on("pageerror", error => result.errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") result.errors.push(message.text()); });
  const requests = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto(`http://127.0.0.1:${result.port}/tests/fixtures/lookdev.html`);
  await page.waitForFunction(() => window.lookdevReview?.sample().renders > 0);
  // Every column shares exactly the same geometry, camera, exposure, white balance and light rig.
  for (const surface of ["dark", "light"]) {
    for (const quality of ["high", "low"]) {
      for (const environment of [false, true]) {
        const settings = { surface, quality, environment, tone: "neutral" };
        await page.evaluate(settings => window.lookdevReview.set(settings), settings);
        const file = `${surface}-${quality}-${environment ? "studio" : "no-environment"}.png`;
        await page.screenshot({ path: resolve(out, file) });
        const sample = await page.evaluate(() => window.lookdevReview.sample());
        assert.equal(sample.pipeline.outputColorSpace, "srgb");
        assert.equal(sample.pipeline.exposure, 1);
        assert(sample.calls > 0);
        result.cases.push({ ...settings, file, ...sample });
      }
    }
  }
  for (const tone of ["neutral", "aces"]) {
    await page.evaluate(tone => window.lookdevReview.set({ surface: "dark", quality: "high", environment: true, tone }), tone);
    const file = `tone-${tone}.png`;
    await page.screenshot({ path: resolve(out, file) });
    result.cases.push({ tone, file, ...await page.evaluate(() => window.lookdevReview.sample()) });
  }
  result.seam = await page.evaluate(() => window.lookdevReview.seamSwatch());
  // Check the real shader, not a copied formula: pre-fix returns the linear channels as sRGB.
  for (let i = 0; i < 3; i++) assert(Math.abs(result.seam.actual[i] - result.seam.expected[i]) <= 1, `seam output mismatch: ${JSON.stringify(result.seam)}`);
  const sample = await page.evaluate(() => window.lookdevReview.sample());
  assert.equal(sample.pmrem.length, 2, "PMREM must be generated only once per tier, not per draw/surface/tone");
  assert.deepEqual(sample.pmrem.map(p => p.quality).sort(), ["high", "low"]);
  result.cleanup = await page.evaluate(() => window.lookdevReview.dispose());
  assert.equal(result.cleanup.geometries, 0);
  assert(result.cleanup.textures <= 1, "Only the renderer's fallback texture may survive disposal");
  result.requests = requests;
  assert(requests.every(url => new URL(url).hostname === "127.0.0.1"), "Unexpected external asset");
  assert.deepEqual(result.errors, []);
  const model = await promisify(execFile)(process.execPath, ["tests/review/tb001.mjs"], {
    cwd: root,
    env: { ...process.env, TB001_REVIEW_URL: `http://127.0.0.1:${result.port}`, TB001_REVIEW_OUT: resolve(out, "model"), CHROMIUM: process.env.CHROMIUM ?? chromium.executablePath() },
    timeout: 180000,
  });
  result.model = JSON.parse(await readFile(resolve(out, "model/record.json"), "utf8"));
  assert(result.model.success, model.stdout);
  // Measure the actual lazy-loaded production entry, not Vite's unbundled fixture startup.
  execFileSync("pnpm", ["build"], { cwd: root, env: { ...process.env, NODE_ENV: "production" }, stdio: "inherit" });
  execFileSync("pnpm", ["check:bundle"], { cwd: root, stdio: "inherit" });
  result.payload = await Promise.all((await readdir(resolve(root, "dist/assets"))).filter(file => file.endsWith(".js")).map(async file => {
    const bytes = await readFile(resolve(root, "dist/assets", file));
    return { file, raw: bytes.length, gzip: gzipSync(bytes).length, sha256: createHash("sha256").update(bytes).digest("hex") };
  }));
  production = await preview({ root, preview: { host: "127.0.0.1", port: 0, open: false } });
  result.productionPort = production.httpServer.address().port;
  result.firstUsefulFrames = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await owned.browser.newContext({ viewport, reducedMotion: "reduce", isMobile: viewport.width === 390, hasTouch: viewport.width === 390 });
    await context.addInitScript(() => {
      const owner = WebGL2RenderingContext.prototype;
      for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
        const original = owner[name];
        owner[name] = function (...args) {
          const value = Reflect.apply(original, this, args);
          if (!window.__lookdevFirst && this.canvas.closest(".webgl-shell") && this.getParameter(this.FRAMEBUFFER_BINDING) === null) {
            window.__lookdevFirst = { drawAt: performance.now(), completedAt: null };
            requestAnimationFrame(() => { this.finish(); window.__lookdevFirst.completedAt = performance.now(); });
          }
          return value;
        };
      }
    });
    const measured = await context.newPage();
    measured.on("pageerror", error => result.errors.push(error.message));
    await measured.goto(`http://127.0.0.1:${result.productionPort}/?lang=en`);
    const start = await measured.evaluate(() => performance.now());
    await measured.locator(".calibrate-button").click();
    await measured.waitForFunction(() => {
      const shell = document.querySelector(".webgl-shell");
      return window.__lookdevFirst?.completedAt > 0 && shell?.checkVisibility() && Number(getComputedStyle(shell).opacity) >= 0.99;
    });
    const visibleAtMs = await measured.evaluate(() => performance.now());
    result.firstUsefulFrames.push({ viewport, entryStartMs: start, visibleAtMs, ...await measured.evaluate(() => window.__lookdevFirst) });
    await measured.screenshot({ path: resolve(out, `production-${viewport.width}.png`) });
    await context.close();
  }
  assert.deepEqual(result.errors, []);
  assert.deepEqual(await fingerprint(), result.hashes, "Sources changed during review");
  result.success = true;
} catch (error) {
  result.failure = String(error.stack);
  process.exitCode = 1;
} finally {
  // Compose with the existing browser; no imaging dependency and no private uploads.
  if (owned && result.cases.length) {
    try {
      const tiles = await Promise.all(result.cases.map(async c => `<figure><figcaption>${c.file}</figcaption><img src="data:image/png;base64,${(await readFile(resolve(out, c.file))).toString("base64")}"></figure>`));
      const html = `<html><style>body{margin:0;background:#252525;color:#eee;font:15px system-ui}h1{padding:12px}main{display:grid;grid-template-columns:1fr 1fr;width:1100px}figure{margin:6px}img{width:100%}</style><h1>TB-001 · controlled material / environment / tone study</h1><main>${tiles.join("")}</main></html>`;
      await writeFile(resolve(out, "sheet.html"), html);
      const sheet = await owned.context.newPage();
      await sheet.setViewportSize({ width: 1100, height: 800 });
      await sheet.setContent(html);
      await sheet.screenshot({ path: resolve(out, "sheet.png"), fullPage: true });
    } catch (error) { result.success = false; result.sheetError = String(error); process.exitCode = 1; }
  }
  await finalizeReview({
    cleanup: [
      () => production ? new Promise((done, fail) => production.httpServer.close(error => error ? fail(error) : done())) : Promise.resolve(),
      () => server?.close(),
      () => owned?.close(),
    ],
    manifest: result,
    writeManifest: () => writeFile(resolve(out, "record.json"), JSON.stringify(result, null, 2)),
  });
  if (!result.success) process.exitCode = 1;
}
console.log(JSON.stringify({ out, success: result.success, cases: result.cases.length, seam: result.seam, failure: result.failure }));
