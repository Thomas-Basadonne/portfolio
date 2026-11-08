import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

// This is real browser zoom via tabs.setZoom, not CSS zoom, page scale or a viewport proxy.
const out = resolve(process.env.READABILITY_ZOOM_OUT ?? "test-results/readability-zoom");
const origin = new URL(process.env.READABILITY_REVIEW_URL ?? "http://127.0.0.1:4173");
assert(["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname), "Loopback review only");
await mkdir(out, { recursive: true });
const scratch = process.env.READABILITY_ZOOM_PROFILE_ROOT ?? join(tmpdir(), "portfolio-zoom");
await mkdir(scratch, { recursive: true });
const root = await mkdtemp(join(scratch, "portfolio-zoom-"));
const extension = join(root, "extension");
await mkdir(extension);
await writeFile(join(extension, "manifest.json"), JSON.stringify({
  manifest_version: 3, name: "Local readability zoom probe", version: "1.0",
  permissions: ["tabs"], background: { service_worker: "worker.js" },
}));
await writeFile(join(extension, "worker.js"), "chrome.runtime.onInstalled.addListener(() => {});");
let context;
const record = { cases: [], errors: [], success: false, profileRemoved: false };
try {
  context = await chromium.launchPersistentContext(join(root, "profile"), {
    channel: "chromium", headless: true, viewport: null, ignoreDefaultArgs: ["--disable-extensions"],
    args: ["--use-mock-keychain", "--window-size=1440,1043", "--use-gl=angle", "--use-angle=swiftshader",
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const page = context.pages()[0] ?? await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => sessionStorage.setItem("tb:entry-seen", "1"));
  page.on("pageerror", (error) => record.errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  const capture = async (name) => {
    await page.bringToFront();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Native tabs.setZoom is outside Playwright's emulated scale bookkeeping.
    // Capture the actual composited surface over CDP, not a rescaled clip.
    const image = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    const bytes = Buffer.from(image.data, "base64");
    await writeFile(join(out, name), bytes);
  };
  for (const locale of ["en", "it"]) {
    await page.goto(new URL(`/?lang=${locale}`, origin).href);
    await page.waitForSelector(".hud__identity");
    const setZoom = (factor) => worker.evaluate(async ({ url, factor }) => {
      const [tab] = await chrome.tabs.query({ url: `${url}/*` });
      await chrome.tabs.setZoom(tab.id, factor);
      return chrome.tabs.getZoom(tab.id);
    }, { url: origin.origin, factor });
    assert.equal(await setZoom(1), 1);
    const before = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    assert.equal(await setZoom(2), 2);
    await page.waitForFunction((width) => Math.abs(innerWidth * 2 - width) <= 2, before.width);
    await page.evaluate(() => document.fonts.ready);
    await page.bringToFront();
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
    const sections = [];
    for (const id of ["identity", "about", "capabilities", "work", "experience", "contact"]) {
      await page.locator(`#${id} .story-section__content`).evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(overflow <= 1, `${locale}/${id}: horizontal overflow ${overflow}`);
      sections.push({ id, overflow });
      if (["work", "contact"].includes(id)) {
        await capture(`zoom-200-${locale}-${id}.png`);
      }
    }
    await page.getByRole("button", { name: /project twin/i }).click();
    await page.getByRole("dialog").waitFor();
    const drawer = await page.locator(".case-drawer").evaluate((element) => ({ overflow: element.scrollWidth - element.clientWidth }));
    assert(drawer.overflow <= 1);
    await capture(`zoom-200-${locale}-drawer.png`);
    await page.keyboard.press("Escape");
    record.cases.push({ locale, zoom: 2, before, viewport, sections, drawer });
  }
  assert.equal(record.errors.length, 0);
  record.success = true;
} finally {
  await context?.close();
  await rm(root, { recursive: true, force: true });
  record.profileRemoved = await access(root).then(() => false, () => true);
  await writeFile(join(out, "zoom-200.json"), JSON.stringify(record, null, 2));
}
console.log(JSON.stringify(record, null, 2));
