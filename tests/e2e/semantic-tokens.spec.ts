import { expect, test } from "@playwright/test";
import { holdLayout, settleLayout } from "./hold-layout";

/*
 * SYS-05 (#82), option A (Thomas, 15/11/2026).
 * - Capabilities are information, not actions: hovering a row moved its text 11.2px inwards and lit its rule in
 *   signal orange, the feedback of a control that does not exist (at 1440 it also rewrapped the first proof line).
 * Values are read from the DOM (computed style and boxes), never from screenshots.
 */

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
