import { expect, test, type Page } from "@playwright/test";
import { requireWebGL } from "./webgl";
import { portfolioContent } from "../../src/content/portfolio";
import { readFileSync } from "node:fs";

type Flow = { flow: Record<"en" | "it", { step: string; text: string }[]> };
const log = JSON.parse(readFileSync(new URL("../../src/content/method-flow.json", import.meta.url), "utf8")) as Flow;

/*
 * AST-01 (#47): the Method chapter, approved by Thomas on 2026-11-23. Copy and contract are unit-tested
 * (tests/method.test.ts); here: the chapter in the story, its flow loaded outside the entry, the static page
 * without JS, and the core: hover (breath + cursor) and tap (L1).
 */

const SCENE_TIMEOUT = 20_000;

async function enter(page: Page, locale: "en" | "it", hash = "") {
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  await page.goto(`/?lang=${locale}${hash}`);
  await expect(page.locator(".hud__readout")).toBeVisible();
}

for (const locale of ["en", "it"] as const) {
  const { method, chapters } = portfolioContent[locale];

  test(`the Method chapter sits between Experience and Contact and loads its flow (${locale})`, async ({ page }) => {
    const chunks: string[] = [];
    page.on("request", (request) => { if (/method-flow-.*\.js/.test(request.url())) chunks.push(request.url()); });
    await enter(page, locale, "#method");
    const nav = page.locator(".chapter-nav a");
    await expect(nav).toHaveCount(chapters.length);
    const order = await nav.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(order.slice(-3)).toEqual(["#experience", "#method", "#contact"]);
    const section = page.locator("#method");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText(method.title.lead + method.title.emphasis);
    await expect(section.getByText(method.boundary, { exact: true })).toBeVisible();
    for (const profile of method.profiles) await expect(section.getByRole("heading", { name: profile.name, exact: true })).toBeAttached();
    // The flow: every step, in order, with no link to a specific task.
    await expect(section.getByText(method.flowTitle, { exact: true })).toBeAttached();
    const items = section.locator(".trace-list").last().locator("li");
    await expect(items).toHaveCount(log.flow[locale].length);
    await expect(items.locator("h3")).toHaveText(log.flow[locale].map((step) => step.step));
    await expect(items.locator("a")).toHaveCount(0);
    expect(chunks.length, "the flow arrives as its own chunk").toBe(1);
  });
}

test("without JavaScript the static page carries the Method chapter and its flow", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  // The prerendered root and the <noscript> block carry the same static page: check the first.
  const section = page.locator("#method-static").first();
  await expect(section.getByRole("heading", { level: 2 })).toHaveText(`${portfolioContent.en.method.title.lead}${portfolioContent.en.method.title.emphasis}`);
  await expect(section.getByText(portfolioContent.en.method.boundary)).toBeVisible();
  await expect(section.getByText(/^How a task runs:/)).toBeVisible();
  await expect(section.locator("a")).toHaveCount(0);
  await expect(page.locator('nav a[href="#method-static"]').first()).toBeVisible();
  await context.close();
});

/** Brings the Method chapter to the top and waits for the model to read it (the core). */
async function showMethod(page: Page) {
  await page.locator("#method").evaluate((section) => section.scrollIntoView({ block: "start", behavior: "instant" }));
  await expect(page.locator(".scene-readout")).toContainText(portfolioContent.en.ui.readout.parts.core, { timeout: SCENE_TIMEOUT });
}

/** The core's drawn position once the camera has settled (two equal reads 300 ms apart), canvas px. */
async function settledCore(page: Page) {
  const stage = page.locator("[data-scene-stage]");
  await expect(stage).toHaveAttribute("data-core", /^\d+ \d+ \d+$/, { timeout: SCENE_TIMEOUT });
  let last = "";
  await expect.poll(async () => {
    const now = (await stage.getAttribute("data-core")) ?? "";
    const settled = now !== "" && now === last;
    last = now;
    return settled;
  }, { intervals: [300], timeout: SCENE_TIMEOUT }).toBe(true);
  return last.split(" ").map(Number) as [number, number, number];
}

/** Clicks the drawn core at the position the frame loop publishes on the stage (canvas px). */
async function tapCore(page: Page, touch = false) {
  const [x, y] = await settledCore(page);
  const box = (await page.locator(".webgl-shell canvas").boundingBox())!;
  if (touch) await page.touchscreen.tap(box.x + x, box.y + y);
  else await page.mouse.click(box.x + x, box.y + y);
}

test("a click on the core shows the fixed line on the method for a few seconds, then the model's reading returns", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await enter(page, "en", "#method");
  await requireWebGL(page);
  await expect(page.locator("[data-visual-ready]")).toBeAttached({ timeout: SCENE_TIMEOUT });
  await showMethod(page);
  const readout = page.locator(".scene-readout");
  const labels = portfolioContent.en.ui.readout;
  await tapCore(page);
  await expect(readout).toHaveText(labels.note);
  // The note stays inside the model's column, clear of the chapter's text.
  const clear = await page.evaluate(() => {
    const note = document.querySelector(".scene-readout")!.getBoundingClientRect();
    const text = document.querySelector("#method .story-section__content")!.getBoundingClientRect();
    return note.right <= text.left || note.left >= text.right || note.bottom <= text.top || note.top >= text.bottom;
  });
  expect(clear).toBe(true);
  await expect(readout).toContainText(labels.parts.core, { timeout: 6_000 });
  await expect(readout).not.toContainText("Asterion");
});

test("under the mouse the core breathes and the cursor turns into the click ring; off the core both stop", async ({ page }) => {
  // Scene, settled core and 1.8 s of samples: the default 30 s ran out once on a loaded machine (full run, 4 workers).
  test.setTimeout(60_000);
  // A smaller canvas: the scene runs unpaused here (the custom cursor needs motion) and software GL is slow.
  await page.setViewportSize({ width: 1100, height: 700 });
  await enter(page, "en", "#method");
  await requireWebGL(page);
  await showMethod(page);
  const [x, y, r] = await settledCore(page);
  const box = (await page.locator(".webgl-shell canvas").boundingBox())!;
  const cursor = page.locator(".cursor");
  await page.mouse.move(box.x + x, box.y + y, { steps: 4 });
  await expect(cursor).toHaveClass(/\bis-core\b/);
  // Unblended over the core (`difference` turned it dark on the orange), and breathing: its size rises and falls.
  expect(await cursor.evaluate((node) => getComputedStyle(node).mixBlendMode)).toBe("normal");
  const ring = () => cursor.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { size: box.width, x: box.left + box.width / 2, y: box.top + box.height / 2 };
  });
  // Sampled every frame for a breath and a bit (1.8 s): the diameter swings by ~12px (42–54px), > 5px for slow frames.
  const sizes = await cursor.evaluate((node) => new Promise<number[]>((resolve) => {
    const seen: number[] = [];
    const start = performance.now();
    const sample = () => {
      seen.push(node.getBoundingClientRect().width);
      if (performance.now() - start < 1800) requestAnimationFrame(sample);
      else resolve(seen);
    };
    requestAnimationFrame(sample);
  }));
  expect(Math.max(...sizes) - Math.min(...sizes), "the ring breathes").toBeGreaterThan(5);
  // ...while staying centred on the pointer (a `scale` once multiplied its translate and threw it away).
  for (let sample = 0; sample < 6; sample += 1) {
    const { x: ringX, y: ringY } = await ring();
    expect(Math.hypot(ringX - (box.x + x), ringY - (box.y + y)), "ring centred on the pointer").toBeLessThan(3);
    await page.waitForTimeout(120);
  }
  await page.mouse.move(box.x + x + Math.max(22, r) + 40, box.y + y, { steps: 4 });
  await expect(cursor).not.toHaveClass(/\bis-core\b/);
  // It eases back instead of snapping: the size transition is still running just after leaving.
  expect(await cursor.evaluate((node) => node.style.getPropertyValue("--r"))).toBe("");
  expect(await cursor.evaluate((node) => getComputedStyle(node).transitionProperty)).toContain("width");
});

test("with reduced motion there is no custom cursor: the system pointer shows the click instead", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await enter(page, "en", "#method");
  await requireWebGL(page);
  await showMethod(page);
  const [x, y, r] = await settledCore(page);
  const box = (await page.locator(".webgl-shell canvas").boundingBox())!;
  const bodyCursor = () => page.evaluate(() => document.body.style.cursor);
  await page.mouse.move(box.x + x, box.y + y, { steps: 4 });
  await expect.poll(bodyCursor).toBe("pointer");
  await page.mouse.move(box.x + x + Math.max(22, r) + 40, box.y + y, { steps: 4 });
  await expect.poll(bodyCursor).toBe("");
});

test("a click elsewhere, or on a control over the model, does not touch the core", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await enter(page, "en", "#method");
  await requireWebGL(page);
  await showMethod(page);
  const [x, y, r] = await settledCore(page);
  const box = (await page.locator(".webgl-shell canvas").boundingBox())!;
  await page.mouse.click(box.x + x + Math.max(22, r) + 30, box.y + y);
  await page.waitForTimeout(400);
  await expect(page.locator(".scene-readout")).not.toContainText("Asterion");
});

test.describe("portrait band", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("a tap on the core lights it but shows no note: the band has no readout", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enter(page, "en", "#method");
    await requireWebGL(page);
    await page.locator("#method").evaluate((section) => section.scrollIntoView({ block: "start", behavior: "instant" }));
    await tapCore(page, true);
    await page.waitForTimeout(600);
    await expect(page.locator(".scene-readout")).toBeHidden();
    await expect(page.locator(".scene-readout")).not.toContainText("Asterion");
  });
});
