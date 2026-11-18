import { expect, test } from "@playwright/test";

// Browser auto-translation (Chrome Translate) rewrites every text node React owns; the page is bilingual with its
// own switch, so the document opts out. The opt-out must also survive the locale switch, which rewrites `lang`.
test("the document opts out of browser translation, in both languages", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="google"]')).toHaveAttribute("content", "notranslate");
  expect(await page.evaluate(() => document.documentElement.translate)).toBe(false);

  await page.goto("/?lang=it");
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  expect(await page.evaluate(() => document.documentElement.translate)).toBe(false);
});

test("the crash fallback is covered by the opt-out too", async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (key === "tb:entry-seen") throw new Error("Application startup failure fixture");
      return getItem.call(this, key);
    };
  });
  await page.goto("/");
  await expect(page.locator(".app-fallback")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.translate)).toBe(false);
});
