import { expect, test, type Page } from "@playwright/test";
import { requireWebGL } from "./webgl";
import { portfolioContent } from "../../src/content/portfolio";

/*
 * WOW-09 (#21), decided by Thomas on 23/11/2026: option C (the exploded model is Work's scene, no part stands for a
 * case). A Work row under a fine pointer or with keyboard focus turns the model a little, the same for every case;
 * touch opens a case with one tap; with the case open the model holds the chapter's pose behind the drawer and the
 * scene is paused; closing returns to the chapter's pose as it is now (after a resize too).
 */

const SCENE_TIMEOUT = 20_000;
const stage = (page: Page) => page.locator("[data-scene-stage]");
const rows = (page: Page) => page.locator(".case-index__item");

/** Counts every WebGL draw call: a paused scene draws nothing. */
async function countDraws(page: Page) {
  await page.addInitScript(() => {
    const counter = { draws: 0 };
    Reflect.set(window, "__drawProbe", counter);
    const patched = new Set<object>();
    for (const kind of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!kind) continue;
      for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
        let owner = kind.prototype;
        while (owner && !Object.hasOwn(owner, name)) owner = Object.getPrototypeOf(owner);
        if (!owner || patched.has(Reflect.get(owner, name))) continue;
        const original = Reflect.get(owner, name);
        const wrapped = function (this: WebGLRenderingContext, ...args: unknown[]) {
          counter.draws += 1;
          return Reflect.apply(original, this, args);
        };
        patched.add(wrapped);
        Reflect.set(owner, name, wrapped);
      }
    }
  });
  return () => page.evaluate(() => Number(Reflect.get(window, "__drawProbe").draws));
}

async function enterWork(page: Page, locale: "en" | "it" = "en") {
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  await page.goto(`/?lang=${locale}#work`);
  // Hydrated: a click before hydration would reach a button without its handler.
  await expect(page.locator(".hud__readout")).toBeVisible();
}

async function sceneReady(page: Page) {
  await requireWebGL(page);
  await expect(page.locator("[data-visual-ready]")).toBeAttached({ timeout: SCENE_TIMEOUT });
}

async function toWork(page: Page) {
  await page.locator("#work").evaluate((section) => section.scrollIntoView({ block: "start", behavior: "instant" }));
}

test("a Work row turns the model under the pointer and with keyboard focus, and lets it go", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWork(page);
  await sceneReady(page);
  await toWork(page);
  await page.mouse.move(2, 2);
  await expect(stage(page)).not.toHaveAttribute("data-inspecting");

  for (const index of [0, 2]) {
    await rows(page).nth(index).hover();
    await expect(stage(page)).toHaveAttribute("data-inspecting", "", { timeout: SCENE_TIMEOUT });
    await page.mouse.move(2, 2);
    await expect(stage(page)).not.toHaveAttribute("data-inspecting", { timeout: SCENE_TIMEOUT });
  }

  // Keyboard focus on a row: the same turn; leaving the rows lets it go. WebKit does not Tab to buttons by default:
  // a key press then focus() gives the same keyboard modality (the row matches :focus-visible).
  await page.keyboard.press("Shift");
  await rows(page).first().focus();
  await expect(rows(page).first()).toBeFocused();
  expect(await rows(page).first().evaluate((row) => row.matches(":focus-visible"))).toBe(true);
  await expect(stage(page)).toHaveAttribute("data-inspecting", "", { timeout: SCENE_TIMEOUT });
  await rows(page).first().evaluate((row) => row.blur());
  await expect(stage(page)).not.toHaveAttribute("data-inspecting", { timeout: SCENE_TIMEOUT });
});

test("a touch contact does not turn the model; a fine pointer over the same row does", async ({ page }) => {
  // React's pointer enter/leave are built from pointerover/pointerout: a touch contact sends them with pointerType
  // "touch" before the tap. Sent here without the click, so the scene stays open to show what they did.
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWork(page);
  await sceneReady(page);
  await toWork(page);
  const row = rows(page).first();
  const over = (pointerType: string) => row.evaluate((element, type) => {
    element.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: type, isPrimary: true }));
  }, pointerType);
  await over("touch");
  await page.waitForTimeout(800);
  await expect(stage(page)).not.toHaveAttribute("data-inspecting");
  await over("mouse");
  await expect(stage(page)).toHaveAttribute("data-inspecting", "", { timeout: SCENE_TIMEOUT });
});

test("reduced motion keeps the model still over the Work rows", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWork(page);
  await sceneReady(page);
  await toWork(page);
  await rows(page).first().hover();
  await page.keyboard.press("Shift");
  await rows(page).nth(1).focus();
  await page.waitForTimeout(800);
  await expect(stage(page)).not.toHaveAttribute("data-inspecting");
});

test.describe("touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("one tap opens a case, with no preview turn first", async ({ page }) => {
    await enterWork(page);
    const dialog = page.getByRole("dialog", { name: "Project Twin" });
    const row = page.getByRole("button", { name: /project twin/i });
    await row.scrollIntoViewIfNeeded();
    await row.tap();
    await expect(dialog).toBeVisible();
    await expect(stage(page)).not.toHaveAttribute("data-inspecting");
    await dialog.getByRole("button", { name: /close/i }).tap();
    await expect(dialog).toBeHidden();
    await expect(row).toBeFocused();
  });
});

test("an open case pauses the scene, a resize behind it draws no loop, closing resumes", async ({ page }) => {
  const draws = await countDraws(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWork(page);
  await sceneReady(page);
  await toWork(page);
  await page.waitForTimeout(1000);
  const before = await draws();
  await page.waitForTimeout(700);
  // Idle ambient motion draws while nothing covers the scene.
  expect(await draws()).toBeGreaterThan(before);

  const row = page.getByRole("button", { name: /project twin/i });
  await row.click();
  const dialog = page.getByRole("dialog", { name: "Project Twin" });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(400);
  const paused = await draws();
  await page.waitForTimeout(1500);
  expect(await draws(), "no draws while the case is open").toBe(paused);

  // A resize behind the drawer: at most the canvas's own redraw, then nothing.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(600);
  const afterResize = await draws();
  await page.waitForTimeout(1500);
  expect(await draws(), "no loop after a resize behind the drawer").toBe(afterResize);
  await page.mouse.move(700, 400);
  await page.mouse.move(900, 500);
  await page.waitForTimeout(500);
  expect(await draws(), "the pointer over the drawer draws nothing").toBe(afterResize);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(row).toBeFocused();
  const closed = await draws();
  await expect.poll(draws, { timeout: SCENE_TIMEOUT }).toBeGreaterThan(closed);
});

test("closing a case returns to the chapter's pose as it is now, after a resize too", async ({ page }) => {
  // Reduced motion: every pose is exact (no ambient time, no pointer, no turn), so two frames of the same state match.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await enterWork(page);
  await sceneReady(page);
  const canvas = page.locator(".webgl-shell canvas");
  const readout = page.locator(".scene-readout");
  // A page capture clipped to the canvas: a locator capture would scroll the page, which is a new state.
  const shot = async () => page.screenshot({ clip: (await canvas.boundingBox())! });
  const settled = async () => {
    let last = await shot();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await page.waitForTimeout(250);
      const next = await shot();
      if (next.equals(last)) return next;
      last = next;
    }
    throw new Error("the stage kept changing");
  };
  await toWork(page);
  const reference = await settled();
  const referenceReadout = await readout.innerText();
  const scroll = await page.evaluate(() => scrollY);

  // Opened at another size, resized back behind the drawer, closed: the frame is the chapter's, not the one drawn
  // before the resize.
  await page.setViewportSize({ width: 1440, height: 900 });
  await toWork(page);
  const row = page.getByRole("button", { name: /project twin/i });
  await row.click();
  const dialog = page.getByRole("dialog", { name: "Project Twin" });
  await expect(dialog).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(row).toBeFocused();
  // The row's focus ring and hover are page chrome, not the model: compare the same page state.
  await row.evaluate((element) => element.blur());
  await page.mouse.move(2, 2);
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scroll);
  await expect.poll(() => readout.innerText(), { timeout: SCENE_TIMEOUT }).toBe(referenceReadout);
  expect((await settled()).equals(reference), "the closed frame matches the chapter's pose at this size").toBe(true);
});

test("a quick open and close, repeated, leaves the story running and focus on the row", async ({ page }) => {
  const draws = await countDraws(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWork(page);
  await sceneReady(page);
  await toWork(page);
  const row = page.getByRole("button", { name: /project twin/i });
  const dialog = page.getByRole("dialog", { name: "Project Twin" });
  for (let round = 0; round < 4; round += 1) {
    await row.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(row).toBeFocused();
  }
  await row.click();
  await dialog.getByRole("button", { name: /close/i }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeFocused();
  await expect(page.locator(".site-shell")).not.toHaveAttribute("inert");
  const closed = await draws();
  await expect.poll(draws, { timeout: SCENE_TIMEOUT }).toBeGreaterThan(closed);
});

test("a case reopened after a language change reads in the new language and returns focus", async ({ page }) => {
  // The language switch lives in the HUD, which is inert while a case is open: the language changes between two
  // openings, never under an open case.
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWork(page, "en");
  const en = portfolioContent.en, it = portfolioContent.it;
  const twinEn = en.caseStudies.find((entry) => entry.id === "project-twin")!;
  const twinIt = it.caseStudies.find((entry) => entry.id === "project-twin")!;
  const row = page.getByRole("button", { name: /project twin/i });
  await row.click();
  let dialog = page.getByRole("dialog", { name: twinEn.title });
  await expect(dialog.locator(".case-drawer__summary")).toHaveText(twinEn.summary);
  await expect(page.locator(".hud").getByRole("button", { name: "IT — Italiano", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(row).toBeFocused();

  await page.getByRole("button", { name: "IT — Italiano", exact: true }).click();
  await row.click();
  dialog = page.getByRole("dialog", { name: twinIt.title });
  await expect(dialog.locator(".case-drawer__summary")).toHaveText(twinIt.summary);
  await expect(dialog.getByRole("button", { name: new RegExp(it.ui.drawerClose) })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(row).toBeFocused();
});
