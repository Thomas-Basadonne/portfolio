import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function bypassEntry(page: Page) {
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("entry isolates the portfolio and delays the visual bundle", async ({ page }) => {
  const visualRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("ExperienceCanvas-")) visualRequests.push(request.url());
  });

  await page.goto("/");
  await expect(page.getByRole("dialog", { name: /measure what survives complexity/i })).toBeVisible();
  await expect(page.locator(".site-shell")).toHaveAttribute("inert", "");
  expect(visualRequests).toHaveLength(0);

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  const enterButton = page.getByRole("button", { name: /calibrate/i });
  await enterButton.focus();
  await expect(enterButton).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.locator(".entry-sequence")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".site-shell")).not.toHaveAttribute("inert", "");
  await expect.poll(() => visualRequests.length).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { level: 1, name: /thomas basadonne/i })).toBeVisible();
});

test("skip link moves focus to main content", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.locator(".entry-sequence")).toHaveAttribute("aria-hidden", "true");
});

test("chapter navigation, history and refresh preserve context", async ({ page }) => {
  await bypassEntry(page);
  await page.goto("/#fields");
  await expect(page.locator("#fields")).toBeInViewport();

  await page.getByRole("link", { name: /03 case files/i }).click();
  await expect(page).toHaveURL(/#cases$/);
  await expect(page.locator("#cases")).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/#fields$/);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  await page.reload();
  await expect(page.locator(".entry-sequence")).toHaveAttribute("aria-hidden", "true");
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("case drawer traps focus and restores it", async ({ page }) => {
  await bypassEntry(page);
  await page.goto("/#cases");
  const trigger = page.getByRole("button", { name: /tolerance \/ 0.01/i });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Tolerance / 0.01" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /close/i })).toBeFocused();
  await expect(page.locator(".site-shell")).toHaveAttribute("inert", "");
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: /close/i })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 667, height: 375 },
  { width: 768, height: 1024 },
  { width: 1024, height: 500 },
  { width: 2560, height: 1080 },
]) {
  test(`responsive geometry ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await bypassEntry(page);
    await page.goto("/");
    await expectNoHorizontalOverflow(page);

    if (viewport.width <= 760) {
      const targets = await page.locator(".chapter-nav a").evaluateAll((links) =>
        links.map((link) => {
          const box = link.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
      );
      for (const target of targets) {
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
      }
    }

    if (viewport.width === 667) {
      const overlap = await page.evaluate(() => {
        const selectors = [".hero-spec", ".hero-title", ".hero-thesis", ".chapter-nav"];
        const boxes = selectors.map((selector) => ({
          selector,
          box: document.querySelector(selector)?.getBoundingClientRect(),
        }));
        return boxes.some((first, index) =>
          boxes.slice(index + 1).some((second) => {
            if (!first.box || !second.box) return false;
            return !(
              first.box.right <= second.box.left ||
              first.box.left >= second.box.right ||
              first.box.bottom <= second.box.top ||
              first.box.top >= second.box.bottom
            );
          }),
        );
      });
      expect(overlap).toBe(false);
    }
  });
}

test("reduced motion and forced colors keep a stable native interaction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await bypassEntry(page);
  await page.goto("/");
  await expect(page.locator(".cursor")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("visual chunk failure leaves the complete portfolio usable", async ({ page }) => {
  await page.route(/ExperienceCanvas-.*\.js/, (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: /calibrate/i }).click();
  await expect(page.getByText(/visual layer unavailable/i)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /thomas basadonne/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Inspection chapters" })).toBeVisible();
});

test("WebGL context loss switches to the deterministic fallback", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "The Chromium SwiftShader profile exposes WEBGL_lose_context.");
  await bypassEntry(page);
  await page.goto("/");
  const canvas = page.locator(".webgl-shell canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-context-guard", "ready");
  const contextLost = await canvas.evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext("webgl2") ?? element.getContext("webgl");
    const extension = context?.getExtension("WEBGL_lose_context");
    extension?.loseContext();
    return Boolean(extension);
  });
  expect(contextLost).toBe(true);
  await expect(page.getByText(/visual layer unavailable/i)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /thomas basadonne/i })).toBeVisible();
});

test("critical interaction path has no unexpected console or page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await bypassEntry(page);
  await page.goto("/");
  await page.getByRole("link", { name: /03 case files/i }).click();
  await page.getByRole("button", { name: /tolerance \/ 0.01/i }).click();
  await page.getByRole("button", { name: /close/i }).click();
  await page.getByRole("link", { name: /05 transmit/i }).click();
  expect(errors).toEqual([]);
});

test("automated accessibility scan is clean", async ({ page }) => {
  await bypassEntry(page);
  await page.goto("/");
  await expect(page.locator("#main-content")).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("semantic portfolio remains available without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.getByRole("heading", { level: 1, name: "Thomas Basadonne" })).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
  await context.close();
});
