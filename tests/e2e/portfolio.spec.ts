import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectHudContrast, expectHudGeometry } from "./hud-contrast";

async function bypassEntry(page: Page) {
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
}

async function scrollToEnd(page: Page) {
  await expect(page.locator(".hud__readout")).toBeVisible();
  await page.evaluate(async () => {
    // Let hydration's fragment navigation and optional font metrics settle first.
    // Otherwise WebKit can replay #contact after our intentional bottom scroll.
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
  });
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
  const webglSupported = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  });

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  const enterButton = page.getByRole("button", { name: /calibrate/i });
  await enterButton.focus();
  await expect(enterButton).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.locator(".entry-sequence")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".site-shell")).not.toHaveAttribute("inert", "");
  if (webglSupported) {
    await expect.poll(() => visualRequests.length).toBeGreaterThan(0);
  } else {
    await expect(page.getByText(/visual layer unavailable/i)).toBeVisible();
    expect(visualRequests).toHaveLength(0);
  }
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
  await page.goto("/#capabilities");
  await expect(page.locator("#capabilities")).toBeInViewport();

  await page.getByRole("link", { name: /03 work/i }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work")).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/#capabilities$/);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  await page.reload();
  await expect(page.locator(".entry-sequence")).toHaveAttribute("aria-hidden", "true");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("case drawer traps focus and restores it", async ({ page }) => {
  await bypassEntry(page);
  await page.goto("/#work");
  const trigger = page.getByRole("button", { name: /project twin/i });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Project Twin" });
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
  await expect(page.getByRole("navigation", { name: "Portfolio sections" })).toBeVisible();
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

test("critical interaction path has no unexpected console warnings or errors", async ({ page }) => {
  const unexpectedLogs: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    const isHeadlessDriverNoise =
      message.type() === "warning" &&
      (/GL Driver Message .*GPU stall due to ReadPixels/.test(text) ||
        /Failed to create WebGL context: WebGL creation failed/.test(text));
    const isOptionalFontPreloadNoise =
      message.type() === "warning" &&
      /was preloaded using link preload but not used/.test(text) &&
      /\/fonts\/(manrope|dm-mono|instrument-serif)-latin/.test(text);
    if (
      ["error", "warning"].includes(message.type()) &&
      !isHeadlessDriverNoise &&
      !isOptionalFontPreloadNoise
    ) {
      unexpectedLogs.push(text);
    }
  });
  page.on("pageerror", (error) => unexpectedLogs.push(error.message));
  await bypassEntry(page);
  await page.goto("/");
  await page.getByRole("link", { name: /03 work/i }).click();
  await page.getByRole("button", { name: /promptify/i }).click();
  await page.getByRole("button", { name: /close/i }).click();
  await page.getByRole("button", { name: "Italiano" }).click();
  await page.getByRole("link", { name: /05 contatti/i }).click();
  expect(unexpectedLogs).toEqual([]);
});

test("automated accessibility scan is clean", async ({ page }) => {
  await bypassEntry(page);
  await page.goto("/");
  await expect(page.locator("#main-content")).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("semantic portfolio remains available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Thomas Basadonne" })).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
  await expect(page.getByRole("link", { name: "thomasbasadonne@gmail.com" })).toBeVisible();
  await context.close();
});

test("language switch translates the page, persists and keeps a shareable URL", async ({ page }) => {
  await bypassEntry(page);
  await page.goto("/#work");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Italiano" }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page.getByRole("button", { name: "Italiano" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2, name: /progetti, aperti fino alle decisioni/i })).toBeVisible();
  await expect(page).toHaveURL(/\?lang=it#work$/);
  await expect(page).toHaveTitle(/Thomas Basadonne/);

  await page.getByRole("button", { name: /la fetuseria/i }).click();
  await expect(page.getByRole("dialog", { name: "La Fetuseria" }).getByText("Contesto")).toBeVisible();
  await page.getByRole("button", { name: /chiudi/i }).click();

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).not.toHaveURL(/lang=/);
});

test("legacy section links land on the renamed chapter", async ({ page }) => {
  await bypassEntry(page);
  await page.goto("/#cases");
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work")).toBeInViewport();
});

for (const locale of ["en", "it"]) {
  test(`HUD composited contrast through contact and reverse scroll (${locale})`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await bypassEntry(page);
    await page.goto(`/?lang=${locale}`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator(".hud__readout strong")).toHaveText("000");
    await expectHudContrast(page, info, "graphite");
    const positions = await page.locator(".story-section__content--contact").evaluate((panel) => {
      const top = panel.getBoundingClientRect().top + window.scrollY;
      const end = document.documentElement.scrollHeight - window.innerHeight;
      return [top - window.innerHeight * 0.8, top - 50, (top + end) / 2, end];
    });
    // Include a bone panel under the fixed tools, then both edges of signal.
    const boneTop = await page.locator(".story-section__content--cases").evaluate((panel) => panel.getBoundingClientRect().top + window.scrollY);
    for (const [label, y] of [
      ["bone", boneTop], ["contact-start", positions[0]], ["contact-boundary", positions[1]],
      ["contact-middle", positions[2]], ["contact-end", positions[3]],
      ["reverse-middle", positions[2]], ["reverse-boundary", positions[1]], ["reverse-start", positions[0]],
    ] as const) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      const expected = await page.evaluate(() => Math.round(window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100));
      await expect(page.locator(".hud__readout strong")).toHaveText(String(expected).padStart(3, "0"));
      await expect(page.locator(".hud__progress")).toHaveAttribute("value", String(expected));
      await expectHudGeometry(page);
      await expectHudContrast(page, info, label);
    }
    await scrollToEnd(page);
    await expect(page.locator(".hud__readout strong")).toHaveText("100");
    for (const selector of [".chapter-nav a[href='#contact']", ".hud .lang-switch button[aria-pressed='false']", ".hud__identity"]) {
      const control = page.locator(selector);
      await control.hover();
      await expectHudContrast(page, info, `hover-${selector}`);
      await page.keyboard.press("Tab");
      await control.focus();
      await expect(control).toBeFocused();
      const outline = await control.evaluate((element) => getComputedStyle(element).outlineStyle);
      expect(outline).not.toBe("none");
      await expectHudContrast(page, info, `focus-${selector}`);
    }
  });
}

for (const viewport of [
  { width: 320, height: 568 }, { width: 667, height: 375 }, { width: 768, height: 1024 },
  { width: 1024, height: 500 }, { width: 2560, height: 1080 },
  // 1440x900 at browser zoom 200% has this CSS viewport, not a CSS transform.
  { width: 720, height: 450 },
]) {
  test(`HUD contact geometry and contrast ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await bypassEntry(page);
    await page.goto("/?lang=it#contact");
    await scrollToEnd(page);
    await expect(page.locator(".hud__readout strong")).toHaveText("100");
    await expectNoHorizontalOverflow(page);
    await expectHudGeometry(page);
    await expectHudContrast(page, info, `contact-${viewport.width}`);
  });
}

test("HUD contact fits at 320px when optional fonts fail", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/fonts/**", (route) => route.abort());
  await bypassEntry(page);
  await page.goto("/?lang=it#contact");
  await scrollToEnd(page);
  await expect(page.locator(".hud__readout strong")).toHaveText("100");
  await expectNoHorizontalOverflow(page);
  await expectHudGeometry(page);
  await expectHudContrast(page, info, "fallback-fonts-320");
});

for (const locale of ["en", "it"]) {
  test(`HUD fallback and drawer retain readable isolated chrome (${locale})`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route(/ExperienceCanvas-.*\.js/, (route) => route.abort());
    await page.route("**/fonts/**", (route) => route.abort());
    await bypassEntry(page);
    await page.goto(`/?lang=${locale}#contact`);
    await expect(page.locator(".visual-status--failed")).toBeVisible();
    await scrollToEnd(page);
    await expect(page.locator(".hud__readout strong")).toHaveText("100");
    for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 500 }, { width: 320, height: 568 }, { width: 667, height: 375 }]) {
      await page.setViewportSize(viewport);
      await scrollToEnd(page);
      await expect(page.locator(".hud__readout strong")).toHaveText("100");
      await expectHudGeometry(page);
      await expectHudContrast(page, info, `fallback-contact-${viewport.width}`);
    }
    await page.locator(".chapter-nav a[href='#work']").click();
    await page.getByRole("button", { name: /project twin/i }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Project Twin" })).toBeVisible();
    await expect(page.locator(".site-shell")).toHaveAttribute("inert", "");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: /project twin/i })).toBeFocused();
    await expectHudGeometry(page);
  });
}

test("HUD contact forced colors preserve text and keyboard focus", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await bypassEntry(page);
  await page.goto("/?lang=it#contact");
  await scrollToEnd(page);
  await expect(page.locator(".hud__readout strong")).toHaveText("100");
  await expectHudGeometry(page);
  const selectedColors = await page.locator(".hud .lang-switch button[aria-pressed='true']").evaluate((button) => {
    const probe = document.createElement("span");
    probe.style.cssText = "color: Canvas; background: CanvasText";
    document.body.append(probe);
    const expected = getComputedStyle(probe);
    const actual = getComputedStyle(button);
    const colors = { actual: [actual.color, actual.backgroundColor], expected: [expected.color, expected.backgroundColor] };
    probe.remove();
    return colors;
  });
  expect.soft(selectedColors.actual, "Use inverse Canvas colors: OS Highlight pairs can be below 4.5:1").toEqual(selectedColors.expected);
  await expectHudContrast(page, info, "forced-colors");
  const nav = page.locator(".chapter-nav a[href='#contact']");
  await page.keyboard.press("Tab");
  await nav.focus();
  await expect(nav).toBeFocused();
  expect(await nav.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await expectHudContrast(page, info, "forced-colors-focus");
});
