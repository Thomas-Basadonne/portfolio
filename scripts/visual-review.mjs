import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import { preview } from "vite";
import { launchReviewBrowser } from "./visual-review/browser.mjs";
import { assertProbeReady, chapterStops, installDrawProbe, probeDelta, discoverSourceFiles, finalizeReview } from "./visual-review/lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({ options: {
  label: { type: "string", default: "review" }, compare: { type: "string" },
  lang: { type: "string", default: "en" },
} });
if (!/^[a-z0-9-]+$/i.test(values.label)) throw new Error("--label must contain only letters, numbers and hyphens");
if (!["en", "it"].includes(values.lang)) throw new Error("--lang must be en or it");
const output = join(root, "visual-review", `${new Date().toISOString().replace(/[:.]/g, "-")}-${values.label}`);
await mkdir(output, { recursive: true });
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = (name, data) => writeFile(join(output, name), `${JSON.stringify(data, null, 2)}\n`);
const escape = (text) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

async function fingerprint(files) {
  const entries = await Promise.all(files.sort().map(async (file) => [file, hash(await readFile(join(root, file)))]));
  return { sha256: hash(JSON.stringify(entries)), files: Object.fromEntries(entries) };
}
const source = await fingerprint(discoverSourceFiles(root));
const manifest = {
  schema: 1, label: values.label, startedAt: new Date().toISOString(), success: false,
  baseline: { commit: git("rev-parse", "HEAD"), branch: git("branch", "--show-current"), workingTree: git("status", "--porcelain=v1"), source },
  build: null, language: values.lang, captures: [], probes: [], errors: [],
  pose: { reducedMotion: "reduce", settling: "Repeated scroll invalidation for at least 4 seconds, then 350ms idle; no clock-only freeze or production seam" },
  comparison: { channelTolerance: 8, policy: "Descriptive pixel counts, not an arbitrary CI pass/fail threshold; GPU differences remain visible" },
  limits: ["Chromium only. Mobile is viewport/touch emulation on this host GPU, not iOS or physical device performance.",
    "Pose captures use the real reduced-motion path; they do not certify the normal-motion timeline. The separate probe uses real time and no-preference.",
    "Draw calls are GL API invocations (one multi-draw invocation is one call); sceneFrames are rAF timestamps containing draws, not useFrame updates or display FPS.",
    "Short chapters or document edges can alias start/middle/end; actual coordinates are recorded.",
    "No bit-for-bit cross-GPU guarantee. Inspect silhouettes, material, focus, occlusion, cutaway and viewport-relative margins manually."],
};
let server;
let owned;
try {
  // Always build here; never silently measure an old dist or somebody else's running server.
  execFileSync("pnpm", ["build"], { cwd: root, stdio: "inherit" });
  const built = (await readdir(join(root, "dist"), { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile()).map((entry) => relative(root, join(entry.parentPath, entry.name)));
  manifest.build = { command: "pnpm build", fingerprint: await fingerprint(built), node: process.version };
  server = await preview({ root, preview: { host: "127.0.0.1", port: 0, open: false } });
  const address = server.httpServer.address();
  const url = `http://127.0.0.1:${address.port}/?lang=${values.lang}`;
  owned = await launchReviewBrowser(output);
  manifest.browser = { version: owned.browser.version(), ownership: owned.ownership };
  const browserCdp = await owned.browser.newBrowserCDPSession();
  const system = await browserCdp.send("SystemInfo.getInfo");
  manifest.browser.gpu = system.gpu;
  const context = owned.context;
  await context.addInitScript(installDrawProbe);
  await context.addInitScript(() => {
    if (location.protocol === "http:") sessionStorage.removeItem("tb:entry-seen");
  });
  const page = context.pages()[0];
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => manifest.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") manifest.errors.push(message.text());
  });
  const cdp = await context.newCDPSession(page);

  async function snapshot() { return page.evaluate(() => window.__visualReviewProbe?.snapshot()); }
  async function ready() {
    await page.locator(".webgl-shell canvas[data-context-guard=ready]").waitFor({ state: "visible" });
    await page.waitForFunction(() => window.__visualReviewProbe?.snapshot().totalDraws > 0);
    assertProbeReady(await snapshot());
  }
  async function configure(viewport, reducedMotion) {
    await page.bringToFront();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile });
    await page.emulateMedia({ reducedMotion, colorScheme: "light" });
  }
  async function geometry() {
    return page.evaluate(() => ({
      width: innerWidth, height: innerHeight, scrollHeight: document.documentElement.scrollHeight,
      scrollY, lang: document.documentElement.lang,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      coarsePointer: matchMedia("(pointer: coarse)").matches,
      sections: [...document.querySelectorAll("[data-chapter]")].map((section) => ({
        id: section.id, chapter: section.dataset.chapter, top: section.getBoundingClientRect().top + scrollY,
        height: section.getBoundingClientRect().height,
      })),
    }));
  }
  async function settlePose(y) {
    // Reduced motion eliminates all integrated rotations and shader time. Keep invalidating until
    // damping also converges: simply freezing the clock would leave a path-dependent partial pose.
    await page.evaluate(async (target) => {
      window.scrollTo({ top: target, behavior: "instant" });
      const start = performance.now();
      await new Promise((done) => {
        const tick = () => {
          window.dispatchEvent(new Event("scroll"));
          if (performance.now() - start >= 4000) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, y);
    await delay(350);
    assertProbeReady(await snapshot());
  }
  async function capture(viewport, name, extra = {}) {
    const file = `${viewport.name}/${name}.png`;
    await mkdir(dirname(join(output, file)), { recursive: true });
    const state = await geometry();
    if (state.width !== viewport.width || state.height !== viewport.height || state.lang !== values.lang) throw new Error(`Capture environment mismatch: ${name}`);
    const bytes = await page.screenshot({ path: join(output, file), animations: "disabled" });
    manifest.captures.push({ viewport: viewport.name, name, file, sha256: hash(bytes), ...state, ...extra });
    console.log(`Captured ${viewport.name}/${name}`);
    await json("manifest.json", manifest);
  }
  async function sampleWindow(viewport, label, action, visibility = "visible") {
    const start = await snapshot();
    assertProbeReady(start, visibility);
    const startedAt = performance.now();
    if (action) await action();
    else await delay(1000);
    const end = await snapshot();
    const measurement = probeDelta(start, end, performance.now() - startedAt, visibility);
    manifest.probes.push({ viewport: viewport.name, label, ...measurement, start, end });
    console.log(`Probe ${viewport.name}/${label}: ${measurement.drawCalls} draws / ${measurement.sceneFrames} scene frames / ${measurement.browserFrames} browser frames`);
    return measurement;
  }

  const viewports = [
    { name: "desktop", width: 1440, height: 900, mobile: false },
    { name: "mobile", width: 390, height: 844, mobile: true },
  ];
  for (const viewport of viewports) {
    await configure(viewport, "reduce");
    // A document boundary clears the scene and its integrated state between viewports.
    await page.goto("about:blank");
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".entry-sequence[aria-hidden=false]").waitFor();
    await capture(viewport, "entry", { entry: "not-entered" });
    await page.locator(".calibrate-button").click();
    await ready();
    await settlePose(0);
    await capture(viewport, "hero", { entry: "entered" });
    const layout = await geometry();
    if (layout.sections.length !== 6) throw new Error(`Expected six real chapters; found ${layout.sections.length}`);
    for (const stop of chapterStops(layout.sections, viewport.height, layout.scrollHeight)) {
      await settlePose(stop.y);
      const actualY = await page.evaluate(() => scrollY);
      if (Math.abs(actualY - stop.y) > 1) throw new Error(`Scroll did not settle at ${stop.name}: ${actualY} vs ${stop.y}`);
      await capture(viewport, stop.name, { requested: stop });
    }
    await settlePose(layout.scrollHeight - viewport.height);
    await capture(viewport, "finale");
    const trigger = page.getByRole("button", { name: /project twin/i });
    await trigger.scrollIntoViewIfNeeded();
    await settlePose(await page.evaluate(() => scrollY));
    await trigger.click();
    await page.getByRole("dialog", { name: "Project Twin", exact: true }).waitFor();
    await capture(viewport, "drawer");
    await page.keyboard.press("Escape");

    // Independent normal-motion run. No frozen time, reduced motion or pose invalidation here.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("about:blank");
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".calibrate-button").click();
    await ready();
    await delay(2000);
    await sampleWindow(viewport, "idle");
    const input = await sampleWindow(viewport, "input", async () => {
      for (let index = 0; index < 20; index += 1) {
        // Real browser wheel input on both profiles, not a claim about physical touch hardware.
        await page.mouse.wheel(0, index < 10 ? 35 : -35);
        await delay(50);
      }
    });
    if (!input.drawCalls || !input.sceneFrames) throw new Error("Input produced no scene frames; probe not validated");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await page.getByRole("dialog", { name: "Project Twin", exact: true }).waitFor();
    await delay(1000);
    await sampleWindow(viewport, "pause");
    await page.keyboard.press("Escape");
    await delay(2000);
    const cover = await context.newPage();
    try {
      await cover.goto("about:blank");
      await cover.bringToFront();
      await page.waitForFunction(() => document.visibilityState === "hidden");
      await delay(500);
      await sampleWindow(viewport, "hidden", null, "hidden");
      await page.bringToFront();
      await page.waitForFunction(() => document.visibilityState === "visible");
      const resumed = await sampleWindow(viewport, "resume", async () => {
        await page.mouse.wheel(0, 120);
        await delay(1000);
      });
      if (!resumed.drawCalls) throw new Error("Scene did not draw after resume and real input");
    } finally { await cover.close(); await page.bringToFront(); }
  }

  for (const viewport of viewports) {
    const frames = manifest.captures.filter((frame) => frame.viewport === viewport.name);
    if (frames.length !== 22) throw new Error(`Incomplete ${viewport.name} capture set: ${frames.length}/22`);
    const figures = await Promise.all(frames.map(async (frame) => `<figure><img src="data:image/png;base64,${(await readFile(join(output, frame.file))).toString("base64")}"><figcaption>${escape(frame.name)} · y=${frame.scrollY}</figcaption></figure>`));
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escape(values.label)} — ${viewport.name}</title><style>body{margin:0;padding:20px;font:14px system-ui;background:#ddd;color:#222}h1{font-size:20px}main{display:grid;grid-template-columns:repeat(${viewport.mobile ? 5 : 3},1fr);gap:12px}figure{margin:0}img{display:block;width:100%}figcaption{padding:6px 0;font-size:11px}</style><h1>${escape(values.label)} / ${viewport.name} / ${manifest.baseline.commit.slice(0, 12)} / ${values.lang} / reduced-motion pose</h1><main>${figures.join("")}</main></html>`;
    await writeFile(join(output, `${viewport.name}-sheet.html`), html);
    const sheet = await context.newPage();
    try {
      await sheet.setViewportSize({ width: 1440, height: 900 });
      await sheet.setContent(html);
      await sheet.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      await sheet.screenshot({ path: join(output, `${viewport.name}-sheet.png`), fullPage: true });
    } finally { await sheet.close(); }
  }
  if (values.compare) {
    const previousPath = resolve(values.compare);
    const previous = JSON.parse(await readFile(previousPath, "utf8"));
    if (!previous.success || previous.language !== manifest.language) throw new Error("Comparison needs a successful manifest in the same language");
    const comparisonPage = await context.newPage();
    try {
      const comparisons = [];
      for (const frame of manifest.captures) {
        const before = previous.captures.find((entry) => entry.viewport === frame.viewport && entry.name === frame.name);
        if (!before || before.width !== frame.width || before.height !== frame.height || before.scrollY !== frame.scrollY) throw new Error(`Comparison state mismatch: ${frame.file}`);
        const data = await Promise.all([join(dirname(previousPath), before.file), join(output, frame.file)]
          .map(async (path) => `data:image/png;base64,${(await readFile(path)).toString("base64")}`));
        const metrics = await comparisonPage.evaluate(async ({ data, tolerance }) => {
          const images = await Promise.all(data.map(async (src) => { const image = new Image(); image.src = src; await image.decode(); return image; }));
          const canvas = document.createElement("canvas"); canvas.width = images[0].width; canvas.height = images[0].height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          const pixels = images.map((image) => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, canvas.width, canvas.height).data; });
          let differentPixels = 0; let maxChannelDelta = 0; let totalDelta = 0;
          for (let index = 0; index < pixels[0].length; index += 4) {
            let different = false;
            for (let channel = 0; channel < 4; channel += 1) {
              const delta = Math.abs(pixels[0][index + channel] - pixels[1][index + channel]);
              maxChannelDelta = Math.max(maxChannelDelta, delta); totalDelta += delta;
              if (delta > tolerance) different = true;
            }
            if (different) differentPixels += 1;
          }
          return { differentPixels, differentPixelRatio: differentPixels / (canvas.width * canvas.height), maxChannelDelta, meanChannelDelta: totalDelta / pixels[0].length };
        }, { data, tolerance: manifest.comparison.channelTolerance });
        comparisons.push({ viewport: frame.viewport, name: frame.name, ...metrics });
      }
      if (previous.captures.length !== comparisons.length) throw new Error("Comparison frame count differs");
      manifest.comparison = { ...manifest.comparison, previousManifest: previousPath, frames: comparisons };
    } finally { await comparisonPage.close(); }
  }
  if ((await fingerprint(discoverSourceFiles(root))).sha256 !== source.sha256) throw new Error("Application source changed during capture; evidence invalid");
  if (manifest.errors.length) throw new Error(`Browser errors: ${manifest.errors.join(" | ")}`);
  manifest.success = true;
} catch (error) {
  manifest.failure = error.stack;
  process.exitCode = 1;
  console.error(error);
} finally {
  const cleanupErrors = await finalizeReview({
    cleanup: [
      async () => { await owned?.close(); },
      async () => {
        if (server) await new Promise((done, reject) => server.httpServer.close((error) => error ? reject(error) : done()));
      },
    ],
    manifest,
    writeManifest: async () => {
      manifest.finishedAt = new Date().toISOString();
      await json("manifest.json", manifest);
    },
  });
  if (cleanupErrors.length) {
    process.exitCode = 1;
    console.error(`Cleanup failed: ${cleanupErrors.join(" | ")}`);
  }
  await writeFile(join(output, "REVIEW.md"), `# ${values.label}\n\nManifest: manifest.json\nCommit: ${manifest.baseline.commit}\nWorking tree is recorded explicitly; this is not implicitly main.\n\n- [ ] Materials and silhouette readable\n- [ ] One dominant visual focus per frame\n- [ ] Text not covered by the object or HUD\n- [ ] Cutaway readable where present (N/A otherwise)\n- [ ] Adequate viewport-relative border / safe area; no imposed mobile 60px rule\n- [ ] Review both contact sheets and full-resolution frames\n\nPose is reduced-motion; inspect normal-motion separately. No private images are uploaded.\n`);
  console.log(`Evidence: ${output}/manifest.json`);
}
