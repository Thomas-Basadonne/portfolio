import { expect, test, type Page } from "@playwright/test";
import { requireWebGL } from "./webgl";
import { portfolioContent } from "../../src/content/portfolio";

/*
 * WOW-08 (#20): the model readout. Approved table (23/11/2026): state, one contextual percentage (CYCLE until the parts
 * separate, then EXPLODED) and the active part, all read from the pose. With reduced motion every chapter rests on its
 * final pose, so the expected values are exact. Shown where the stage sits beside the text; not in the portrait band
 * (Thomas, 23/11/2026); absent without a model.
 */

const SCENE_TIMEOUT = 20_000;

// The content strings (mono-label sets the case on screen).
const readoutText = (page: Page) => page.locator(".scene-readout").evaluate((box) =>
  Array.from(box.children).map((line) => line.textContent!.trim()));

/*
 * The readout is aria-hidden, which the composited-contrast helper skips by design (as DEPTH). Its worst case is
 * analytic: the text against its translucent panel composited over pure white, the lightest pixel the model can put
 * behind it.
 */
const worstContrast = (page: Page) => page.locator(".scene-readout").evaluate((box) => {
  const parse = (value: string) => value.match(/[\d.]+/g)!.map(Number);
  const [r, g, b] = parse(getComputedStyle(box.firstElementChild!).color);
  const [br, bg, bb, alpha = 1] = parse(getComputedStyle(box).backgroundColor);
  const over = (channel: number) => channel * alpha + 255 * (1 - alpha);
  const luminance = (channels: number[]) => {
    const [lr, lg, lb] = channels.map((c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  };
  const text = luminance([r, g, b]), panel = luminance([over(br), over(bg), over(bb)]);
  return (Math.max(text, panel) + 0.05) / (Math.min(text, panel) + 0.05);
});

async function enterWithScene(page: Page, locale: "en" | "it", hash = "") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  await page.goto(`/?lang=${locale}${hash}`);
  await requireWebGL(page);
  await expect(page.locator("[data-visual-ready]")).toBeAttached({ timeout: SCENE_TIMEOUT });
  await page.evaluate(() => document.fonts.ready);
}

async function goToChapter(page: Page, id: string) {
  await page.locator(`#${id}`).evaluate((section) => section.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.mouse.move(2, 2);
}

for (const locale of ["en", "it"] as const) {
  const labels = portfolioContent[locale].ui.readout;
  const expected = {
    about: [labels.states[1], `${labels.cycle} 035%`, labels.parts.outer],
    capabilities: [labels.states[2], `${labels.cycle} 068%`, labels.parts.rings],
    work: [labels.states[3], `${labels.explode} 100%`, labels.parts.core],
    experience: [labels.states[3], `${labels.cycle} 100%`, labels.parts.core],
    contact: [labels.states[3], `${labels.cycle} 100%`, labels.parts.core],
  };

  test(`model readout follows the pose chapter by chapter (${locale})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await enterWithScene(page, locale);
    const box = page.locator(".scene-readout");
    for (const [id, lines] of Object.entries(expected)) {
      await goToChapter(page, id);
      // mono-label sets the case; the DOM text is the content string.
      await expect.poll(() => readoutText(page), { timeout: SCENE_TIMEOUT }).toEqual(lines);
      await expect(box).toBeVisible();
      // Inside the model's column, never over the chapter's text.
      const overlap = await page.evaluate(() => {
        const readout = document.querySelector(".scene-readout")!.getBoundingClientRect();
        return Array.from(document.querySelectorAll(".story-section__content")).some((content) => {
          const r = content.getBoundingClientRect();
          return readout.left < r.right && readout.right > r.left && readout.top < r.bottom && readout.bottom > r.top;
        });
      });
      expect(overlap, id).toBe(false);
    }
    await expect(box).toHaveAttribute("aria-hidden", "true");
    expect(await page.locator(".scene-readout [aria-live], .scene-readout[aria-live]").count()).toBe(0);
    expect(await worstContrast(page)).toBeGreaterThanOrEqual(4.5);
  });
}

test("model readout re-labels on a language change and holds across the drawer", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWithScene(page, "en", "#work");
  const en = portfolioContent.en.ui.readout, it = portfolioContent.it.ui.readout;
  await goToChapter(page, "work");
  await expect.poll(() => readoutText(page), { timeout: SCENE_TIMEOUT }).toEqual([en.states[3], `${en.explode} 100%`, en.parts.core]);
  await page.getByRole("button", { name: "IT — Italiano", exact: true }).click();
  await expect.poll(() => readoutText(page), { timeout: SCENE_TIMEOUT }).toEqual([it.states[3], `${it.explode} 100%`, it.parts.core]);
  await page.locator(".case-index__item").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(() => readoutText(page), { timeout: SCENE_TIMEOUT }).toEqual([it.states[3], `${it.explode} 100%`, it.parts.core]);
});

test("the leader reaches the active part inside the model's column", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterWithScene(page, "en");
  await goToChapter(page, "capabilities");
  const callout = page.locator(".scene-callout");
  await expect.poll(() => callout.evaluate((svg) => getComputedStyle(svg).visibility), { timeout: SCENE_TIMEOUT }).toBe("visible");
  const geometry = await page.evaluate(() => {
    const stage = document.querySelector(".scene-stage")!.getBoundingClientRect();
    const box = document.querySelector(".scene-readout")!.getBoundingClientRect();
    const line = document.querySelector(".scene-callout line")!;
    const read = (name: string) => Number(line.getAttribute(name));
    return { stage: [stage.left, stage.top, stage.width, stage.height], box: [box.left, box.top, box.width, box.height],
      start: [stage.left + read("x1"), stage.top + read("y1")], end: [stage.left + read("x2"), stage.top + read("y2")] };
  });
  // The leader starts under the readout and ends inside the stage, below the box.
  expect(Math.abs(geometry.start[0] - geometry.box[0])).toBeLessThan(2);
  expect(geometry.start[1]).toBeGreaterThan(geometry.box[1] + geometry.box[3]);
  expect(geometry.end[0]).toBeGreaterThan(geometry.stage[0]);
  expect(geometry.end[0]).toBeLessThan(geometry.stage[0] + geometry.stage[2]);
  expect(geometry.end[1]).toBeGreaterThan(geometry.box[1] + geometry.box[3]);
  expect(geometry.end[1]).toBeLessThan(geometry.stage[1] + geometry.stage[3]);
});

test("no readout in the portrait band or without a model", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await enterWithScene(page, "en", "#capabilities");
  await expect(page.locator(".scene-readout")).toBeHidden();
  await expect(page.locator(".scene-callout")).toBeHidden();

  const fallback = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await fallback.route(/ExperienceCanvas-.*\.js/, (route) => route.abort());
  await fallback.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  await fallback.goto("/#capabilities");
  await expect(fallback.locator(".visual-status--failed")).toBeVisible();
  await expect(fallback.locator(".scene-readout")).toHaveCount(0);
  await fallback.close();
});
