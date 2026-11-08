import { chromium } from "@playwright/test";
import { NeutralToneMapping } from "three";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../../", import.meta.url));
const out = process.env.TB001_REVIEW_OUT;
assert(out, "Set TB001_REVIEW_OUT to a fresh evidence directory (e.g. test-results/tb001-review/run-1)");
const origin = new URL(process.env.TB001_REVIEW_URL ?? "http://127.0.0.1:4200");
assert(["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname), "Review is local-only");
await mkdir(out, { recursive: true });
async function fingerprint() {
  const paths = ["src/experience/CompilerMachine.tsx", "tests/fixtures/tb001.tsx", "tests/helpers/tb001-probes.ts"];
  for (const entry of await readdir(new URL("../../src/experience/tb001/", import.meta.url))) paths.push("src/experience/tb001/" + entry);
  const result = {};
  for (const path of paths) result[path] = createHash("sha256").update(await readFile(root + path)).digest("hex");
  return result;
}
const hashes = await fingerprint();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM,
  args: ["--use-mock-keychain"],
});
const result = { base: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), browser: browser.version(), hashes, origin: origin.origin, cases: [], errors: [], success: false };
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("pageerror", error => result.errors.push(error.message));
    page.on("console", msg => { if (msg.type() === "error") result.errors.push(msg.text()); });
    await page.goto(new URL("/tests/fixtures/tb001.html", origin).href);
    await page.waitForFunction(() => window.tb001Review?.sample().model?.triangles > 0, null, { timeout: 20000 });
    for (const quality of ["high", "low"]) {
      await page.evaluate(quality => window.tb001Review.set({ quality }), quality);
      await page.waitForTimeout(300);
      const prepared = await page.evaluate(() => window.tb001Review.sample());
      assert.equal(prepared.pmrem.filter(p => !p.disposed).length, 1, "Exactly one owned PMREM may remain live");
      assert.deepEqual(prepared.pipeline, { toneMapping: NeutralToneMapping, exposure: 1, outputColorSpace: "srgb", colorManagement: true });
      assert(prepared.firstUsefulFrameMs > 0, "No completed useful frame");
      for (const testCase of [
        { name: "01", cycle: 0, explode: 0, time: 0.5, az: 32, el: 12, distance: 5.6 },
        { name: "02", cycle: 0.35, explode: 0, time: 4.5, az: 22, el: 10, distance: 6 },
        { name: "03", cycle: 0.68, explode: 0, time: 8.6, az: 0, el: 14, distance: 6.6 },
        { name: "04", cycle: 1, explode: 0, time: 12.6, az: -18, el: 12, distance: 6.9 },
        { name: "teardown", cycle: 1, explode: 1, time: 17.5, az: -58, el: 22, distance: 11.2 },
      ]) {
        const before = await page.evaluate(p => window.tb001Review.set(p), testCase);
        await page.waitForFunction(tick => window.tb001Review.sample().tick > tick, before);
        const sample = await page.evaluate(() => window.tb001Review.sample());
        const hits = await page.evaluate(() => window.tb001Review.collisions());
        const path = `${out}/${viewport.width}-${quality}-${testCase.name}.png`;
        await page.screenshot({ path });
        result.cases.push({ viewport, quality, ...testCase, ...sample, collisions: hits, path });
        assert(sample.calls > 0);
        assert.equal(sample.pmrem.length, prepared.pmrem.length, "A pose change must not rebuild PMREM");
        assert(sample.bounds.min[0] >= -0.98 && sample.bounds.max[0] <= 0.98 && sample.bounds.min[1] >= -0.98 && sample.bounds.max[1] <= 0.98, `cropped ${viewport.width}/${quality}/${testCase.name}: ${JSON.stringify(sample.bounds)}`);
        assert.deepEqual(hits, {}, `collision in ${quality}/${testCase.name}`);
        if (["03", "04"].includes(testCase.name)) assert(sample.core.vis >= 0.9, `core occluded: ${JSON.stringify(sample.core)}`);
        if (testCase.name === "teardown") assert(sample.core.vis >= 0.95);
      }
    }
    // Real StrictMode mount, quality changes, unmount/remount on the same renderer.
    const baseline = await page.evaluate(() => window.tb001Review.sample());
    const start = await page.evaluate(() => window.tb001Review.set({ mounted: false }));
    await page.waitForFunction(t => !window.tb001Review.sample().mounted && window.tb001Review.sample().tick > t, start);
    const empty = await page.evaluate(() => window.tb001Review.sample());
    assert.equal(empty.environment, null);
    assert(empty.pmrem.every(p => p.disposed), "Every owned PMREM target must release on unmount");
    assert(empty.memory.geometries < baseline.memory.geometries, "geometry memory did not release");
    assert(empty.memory.textures < baseline.memory.textures, "texture memory did not release");
    const counts = [];
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.tb001Review.set({ mounted: true }));
      await page.waitForFunction(() => window.tb001Review.sample().mounted);
      await page.waitForTimeout(100);
      counts.push(await page.evaluate(() => window.tb001Review.sample().memory));
      await page.evaluate(() => window.tb001Review.set({ mounted: false }));
      await page.waitForFunction(() => !window.tb001Review.sample().mounted);
    }
    assert.deepEqual(counts[0], counts[1]);
    assert.deepEqual(counts[1], counts[2]);
    (result.lifecycle ??= []).push({ viewport, empty, remountCounts: counts });
    await context.close();
  }
  assert.deepEqual(result.errors, []);
  assert.deepEqual(await fingerprint(), hashes, "Sources changed during review: rerun into a fresh directory");
  result.success = true;
} catch (error) {
  result.failure = String(error.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(out + "/record.json", JSON.stringify(result, null, 2));
}
console.log(JSON.stringify({ success: result.success, cases: result.cases.length, errors: result.errors, failure: result.failure }));
