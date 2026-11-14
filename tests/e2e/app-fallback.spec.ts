import { expect, test } from "@playwright/test";

test("an initial application crash removes the boot overlay and exposes the resilient fallback", async ({ page }) => {
  // A failure before App commits never starts its boot timeout. The boundary must release the static overlay.
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (key === "tb:entry-seen") throw new Error("Application startup failure fixture");
      return getItem.call(this, key);
    };
  });
  await page.goto("/");
  await expect(page.locator(".app-fallback")).toBeVisible();
  await expect(page.locator("#boot")).toHaveCount(0);
  await page.getByRole("link", { name: "Continue on LinkedIn" }).click({ trial: true });
});
