import { expect, test, type Page } from "@playwright/test";
import { holdLayout, settleLayout } from "./hold-layout";

/*
 * SYS-05 (#82), option A (Thomas, 15/11/2026).
 * - Capabilities are information, not actions: hovering a row moved its text 11.2px inwards and lit its rule in
 *   signal orange, the feedback of a control that does not exist (at 1440 it also rewrapped the first proof line).
 * - Secondary text on bone had four near-identical greys (#5d5b55, #5f5d57, #626059, #68665f) with no role between
 *   them; they share one alias now, the darkest (5.39:1 on bone). In forced colors the hex greys stayed on Canvas
 *   (3.09:1 on a black Canvas); the alias maps to CanvasText with the rest of the palette.
 * Values are read from the DOM (computed style and boxes), never from screenshots.
 */

const MUTED_INK = "rgb(93, 91, 85)";
const ON_BONE = [".case-index__title small", ".archive-strip p", ".trace-list p"];
const ON_GATE = [".gate-bar .gate-bar__identity small", ".gate-bar__status", ".entry-sequence .lang-switch button[aria-pressed='false']"];

const colors = (page: Page, selectors: string[]) => page.evaluate((selectors) => selectors.map((selector) => {
  const element = document.querySelector(selector);
  return [selector, element ? getComputedStyle(element).color : "missing"];
}), selectors);

/** The color a system keyword resolves to on this page, read from a detached probe (no React-owned node is touched). */
const resolved = (page: Page, keyword: string) => page.evaluate((keyword) => {
  const probe = document.createElement("span");
  probe.style.color = keyword;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}, keyword);

for (const layout of ["staged", "fallback"] as const) {
  test(`capabilities give no action feedback on hover (${layout} layout)`, async ({ page }) => {
    await holdLayout(page, layout);
    await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#capabilities");
    await expect(page.locator(".hud__readout")).toBeVisible();
    await settleLayout(page, layout);
    await page.evaluate(() => document.fonts.ready);

    const items = page.locator(".capability-list li");
    expect(await items.count()).toBeGreaterThan(0);
    // Semantic content: no focus stop, role or handler-bearing control is invented on the rows.
    expect(await items.evaluateAll((rows) => rows.filter((row) => row.hasAttribute("tabindex") || row.hasAttribute("role")
      || row.querySelector("a, button, [tabindex]")).length)).toBe(0);

    const read = (index: number) => items.nth(index).evaluate((row) => {
      const style = getComputedStyle(row);
      const text = row.querySelector("p")!.getBoundingClientRect();
      return {
        padding: [style.paddingLeft, style.paddingRight], rule: style.borderTopColor, cursor: style.cursor,
        text: [text.left, text.width, text.height].map((value) => Math.round(value * 10) / 10),
      };
    });
    for (let index = 0; index < await items.count(); index += 1) {
      await items.nth(index).scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const before = await read(index);
      await items.nth(index).hover();
      // Longer than any transition the row had (0.35s), so an animated change has landed.
      await page.waitForTimeout(450);
      expect(await read(index), `capability ${index + 1} on hover`).toEqual(before);
      expect(before.cursor).not.toBe("pointer");
    }
  });
}

test("secondary text on bone shares one alias on the gate and in the story", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  for (const [selector, color] of await colors(page, ON_GATE)) expect(color, selector).toBe(MUTED_INK);

  // A different query, so this is a document load (a hash-only change would stay on the gate) and the story is entered.
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  await page.goto("/?lang=en#work");
  await expect(page.locator("#work")).toBeVisible();
  for (const [selector, color] of await colors(page, ON_BONE)) expect(color, selector).toBe(MUTED_INK);
});

test("forced colors resolve secondary text on bone to CanvasText", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active", colorScheme: "dark" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  const canvasText = await resolved(page, "CanvasText");
  // The premise: the keyword resolves to something other than the hex grey it replaces.
  expect(canvasText).not.toBe(MUTED_INK);
  for (const [selector, color] of await colors(page, ON_GATE)) expect(color, selector).toBe(canvasText);

  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  await page.goto("/?lang=en#work");
  await expect(page.locator("#work")).toBeVisible();
  for (const [selector, color] of await colors(page, ON_BONE)) expect(color, selector).toBe(canvasText);
});
