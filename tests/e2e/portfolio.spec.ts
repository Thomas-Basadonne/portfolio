import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectHudContrast, expectHudGeometry } from "./hud-contrast";
import { portfolioContent } from "../../src/content/portfolio";
import { MOTION_RATES } from "../../src/lib/motionPolicy";
import { chapterRailFit, controlInventory, focusVisibility, midWordBreaks, typeInventory } from "./readability";

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

for (const locale of ["en", "it"]) {
  for (const viewport of [
    { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 667, height: 375 },
    { width: 768, height: 1024 }, { width: 1024, height: 500 }, { width: 1440, height: 900 },
    { width: 2560, height: 1080 }, { width: 720, height: 450 }, { width: 844, height: 390 }, { width: 932, height: 430 },
  ]) {
    test(`readability type and targets ${locale} ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/?lang=${locale}`);
      await expect(page.locator(".entry-sequence")).toBeVisible();
      const entryLabels = await typeInventory(page);
      const entryBoxes = await page.locator(".entry-sequence__meta, .entry-sequence__statement, .calibrate-button")
        .evaluateAll((elements) => elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { name: element.className, top: box.top, bottom: box.bottom, left: box.left, right: box.right };
        }));
      for (const box of entryBoxes) {
        expect.soft(box.left, box.name).toBeGreaterThanOrEqual(0);
        expect.soft(box.right, box.name).toBeLessThanOrEqual(viewport.width);
        expect.soft(box.top, box.name).toBeGreaterThanOrEqual(0);
        expect.soft(box.bottom, box.name).toBeLessThanOrEqual(viewport.height);
      }
      const [meta, statement, action] = entryBoxes;
      expect.soft(statement.top).toBeGreaterThanOrEqual(meta.bottom);
      expect.soft(statement.right <= action.left || statement.bottom <= action.top).toBe(true);
      await page.getByRole("button", { name: /calibr/i }).click();
      await page.locator(".chapter-nav a[href='#work']").click();
      await expect(page.locator(".hud__identity")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const labels = await typeInventory(page);
      const targets = await controlInventory(page);
      // Collapsed grid tracks split words without overflowing; the rail must not scroll chapters out of view.
      const breaks = await midWordBreaks(page);
      const rail = await chapterRailFit(page);
      await page.getByRole("button", { name: /project twin/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      const drawerLabels = await typeInventory(page);
      const drawerTargets = await controlInventory(page);
      await info.attach("readability-inventory", {
        body: JSON.stringify({ entryLabels, entryBoxes, labels, targets, breaks, rail, drawerLabels, drawerTargets }, null, 2), contentType: "application/json",
      });
      expect.soft(breaks, "words split between two letters").toEqual([]);
      expect.soft(rail).toEqual({ hidden: [], collisions: [], scrollable: false });
      for (const row of [...entryLabels, ...labels, ...drawerLabels]) {
        // 12px is the project's label design floor, NOT a WCAG text-size rule.
        expect.soft(row.fontSize, `${row.selector}: ${row.text}`).toBeGreaterThanOrEqual(12);
        // An informational label must be painted: a transparent fill would make it unmeasurable and unreadable.
        expect.soft(row.fill, `${row.selector}: ${row.text}`).not.toBe("rgba(0, 0, 0, 0)");
      }
      for (const row of [...targets, ...drawerTargets]) {
        // 44px is the ergonomic project target; WCAG 2.5.8 has a different minimum/exceptions.
        expect.soft(row.width, row.text).toBeGreaterThanOrEqual(44);
        expect.soft(row.height, row.text).toBeGreaterThanOrEqual(44);
      }
      await expectNoHorizontalOverflow(page);
      const drawerOverflow = await page.locator(".case-drawer").evaluate((drawer) => drawer.scrollWidth - drawer.clientWidth);
      expect(drawerOverflow).toBeLessThanOrEqual(1);
    });
  }
}

for (const locale of ["en", "it"]) {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 720, height: 450 }]) {
    for (const fallback of [false, true]) {
      test(`readability scrolling and keyboard ${locale} ${viewport.width} fallback=${fallback}`, async ({ page }, info) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ reducedMotion: "reduce" });
        if (fallback) await page.route(/ExperienceCanvas-.*\.js/, (route) => route.abort());
        await bypassEntry(page);
        await page.goto(`/?lang=${locale}`);
        // Headless Firefox has no WebGL and takes the fallback path; both are a complete page.
        await expect(page.locator(fallback ? ".visual-status--failed" : ".hud__identity")).toBeVisible();
        await expect(page.locator(".site-shell")).not.toHaveAttribute("inert", "");
        await page.evaluate(() => document.fonts.ready);
        const tails = [
          ".hero-actions a:last-child", ".principle-equation li:last-child", ".capability-list li:last-child small",
          ".archive-strip:last-child > div:last-child .item-link:last-child", ".trace-list:last-child li:last-child p", ".site-footer span:last-child",
        ];
        const measurements = [];
        for (const selector of tails) {
          const target = page.locator(selector);
          await target.evaluate((element) => element.scrollIntoView({ block: "end", behavior: "instant" }));
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const geometry = await target.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const overlays = Array.from(document.querySelectorAll(".chapter-nav, .hud__identity, .hud__tools, .visual-status--failed, .scene-stage"))
              .filter((overlay) => overlay.checkVisibility() && getComputedStyle(overlay).position !== "static"
                && (!overlay.classList.contains("scene-stage") || matchMedia("(max-width: 1080px) and (orientation: portrait)").matches))
              .map((overlay) => ({ name: overlay.className, box: overlay.getBoundingClientRect() }));
            return {
              top: box.top, bottom: box.bottom, viewport: innerHeight,
              occluding: overlays.filter(({ box: other }) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top).map(({ name }) => name),
            };
          });
          measurements.push({ selector, ...geometry });
          expect.soft(geometry.top, selector).toBeGreaterThanOrEqual(0);
          expect.soft(geometry.bottom, selector).toBeLessThanOrEqual(viewport.height);
          expect.soft(geometry.occluding, selector).toEqual([]);
        }
        await info.attach("section-tail-geometry", { body: JSON.stringify(measurements, null, 2), contentType: "application/json" });
        // Native Tab/Shift+Tab, not a collection of programmatic scrollIntoView calls.
        await page.locator(".hero-actions a").first().focus();
        const count = await page.locator("main a, main button").count();
        for (const key of ["Tab", "Shift+Tab"]) {
          for (let step = 0; step < count; step += 1) {
            if (await page.evaluate(() => document.activeElement?.closest("main") !== null)) {
              await expect.poll(async () => (await focusVisibility(page)).visible, { message: `Focus stays in the reading area: ${key} ${step}` }).toBe(true);
            }
            await page.keyboard.press(key);
          }
        }
        await expectNoHorizontalOverflow(page);
      });
    }
  }
}

for (const viewport of [{ width: 761, height: 400 }, { width: 844, height: 390 }, { width: 932, height: 430 }, { width: 1024, height: 500 }]) {
  test(`readability chapter rail fits a short ${viewport.width}x${viewport.height} window with the motion control`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await bypassEntry(page);
    await page.goto("/?lang=it");
    await expect(page.locator(".hud__identity")).toBeVisible();
    await expect(page.locator(".site-shell")).not.toHaveAttribute("inert", "");
    // The motion control exists only with the visual layer; the rail must fit with or without it.
    await page.locator(".motion-control, .visual-status--failed").first().waitFor({ timeout: 10_000 }).catch(() => {});
    for (const id of ["identity", "contact"]) {
      await page.locator(`.chapter-nav a[href='#${id}']`).click();
      await expect(page.locator(".chapter-nav a[aria-current=location]")).toHaveAttribute("href", `#${id}`);
      expect(await chapterRailFit(page)).toEqual({ hidden: [], collisions: [], scrollable: false });
    }
    // Compact cells keep each chapter's label in its accessible name.
    await expect(page.locator(".chapter-nav a[href='#contact']")).toHaveAccessibleName(/05.*Contatti/);
  });
}

test("readability visible control labels are included in accessible names", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".entry-sequence button[lang='en']")).toHaveAccessibleName(/^EN.*English$/);
  await expect(page.locator(".entry-sequence button[lang='it']")).toHaveAccessibleName(/^IT.*Italiano$/);
  await page.getByRole("button", { name: /calibrate/i }).click();
  await expect(page.locator(".hud__identity")).toHaveAccessibleName(/TB.*Thomas Basadonne.*Commerce & AI tools/);
  await expect(page.locator(".hud button[lang='en']")).toHaveAccessibleName(/^EN.*English$/);
  await expect(page.locator(".hud button[lang='it']")).toHaveAccessibleName(/^IT.*Italiano$/);
  const results = await new AxeBuilder({ page }).withRules(["label-content-name-mismatch"]).analyze();
  expect(results.violations).toEqual([]);
});

for (const locale of ["en", "it"]) {
  for (const width of [390, 1440]) {
    test(`readability composited text contrast and axe ${locale} ${width}`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/?lang=${locale}`);
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectHudContrast(page, info, "entry", ".entry-sequence", 1);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByRole("button", { name: /calibr/i }).click();
      await expect(page.locator(".site-shell")).not.toHaveAttribute("inert", "");
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      for (const id of ["about", "capabilities", "work", "experience", "contact"]) {
        const selector = `#${id} .story-section__content`;
        for (const block of ["start", "end"] as const) {
          await page.locator(selector).evaluate((element, block) => element.scrollIntoView({ block, behavior: "instant" }), block);
          await expectHudContrast(page, info, `${id}-${block}`, selector, 1);
        }
      }
      const project = page.getByRole("button", { name: /project twin/i });
      await project.hover();
      const index = await project.evaluate((element) => Array.from(element.parentElement!.children).indexOf(element) + 1);
      await expectHudContrast(page, info, "case-hover", `.case-index__item:nth-child(${index})`, 1);
      await project.focus();
      await page.keyboard.press("Tab");
      await project.focus();
      expect(await project.evaluate((element) => getComputedStyle(element).outlineColor)).toBe("rgb(11, 11, 10)");
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectHudContrast(page, info, "drawer", ".case-drawer", 1);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.keyboard.press("Escape");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
}

for (const { viewport, insets } of [
  { viewport: { width: 390, height: 844 }, insets: { top: 24, left: 12, right: 12, bottom: 34 } },
  { viewport: { width: 667, height: 375 }, insets: { top: 0, left: 44, right: 44, bottom: 21 } },
]) {
  for (const locale of ["en", "it"]) {
    test(`readability nonzero safe-area ${locale} ${viewport.width} keeps entry, dock and drawer reachable`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "Nonzero env() insets use Chromium's CDP emulation, not physical iOS hardware.");
      await page.setViewportSize(viewport);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/?lang=${locale}`);
      const entry = await page.locator(".entry-sequence__meta").boundingBox();
      expect(entry!.y).toBeGreaterThanOrEqual(insets.top);
      const enter = page.getByRole("button", { name: /calibr/i });
      const button = await enter.boundingBox();
      expect(button!.y + button!.height).toBeLessThanOrEqual(viewport.height - insets.bottom);
      await enter.click();
      const dock = await page.locator(".chapter-nav").boundingBox();
      expect(dock!.x).toBeGreaterThanOrEqual(insets.left);
      expect(dock!.x + dock!.width).toBeLessThanOrEqual(viewport.width - insets.right);
      expect(dock!.y + dock!.height).toBeLessThanOrEqual(viewport.height - insets.bottom);
      await page.locator(".site-footer span:last-child").evaluate((element) => element.scrollIntoView({ block: "end", behavior: "instant" }));
      const footer = (await page.locator(".site-footer").boundingBox())!;
      expect(footer.x + footer.width <= dock!.x || footer.y + footer.height <= dock!.y).toBe(true);
      // scrollY is rounded to a CSS pixel; DOM rectangles retain their fractional remainder.
      expect(Math.round(footer.y + footer.height)).toBeLessThanOrEqual(viewport.height - insets.bottom);
      await page.getByRole("button", { name: /project twin/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      const padding = await page.locator(".case-drawer").evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom));
      expect(padding).toBeGreaterThanOrEqual(insets.bottom);
      await expectNoHorizontalOverflow(page);
    });
  }
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
  const close = dialog.getByRole("button", { name: /close/i });
  await expect(close).toBeFocused();
  await expect(page.locator(".site-shell")).toHaveAttribute("inert", "");
  // Project Twin has no case links: the stops are close, then one full-size link per evidence image.
  const mediaLinks = dialog.getByRole("link", { name: /view full size/i });
  const stops = await mediaLinks.count();
  expect(stops).toBeGreaterThan(1);
  for (let index = 0; index < stops; index += 1) {
    await page.keyboard.press("Tab");
    await expect(mediaLinks.nth(index)).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(mediaLinks.nth(stops - 1)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
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

/**
 * The visual-layer tests need a browser profile that exposes WebGL (headless Firefox on CI does not): the app then
 * takes its fallback path, which has its own tests. Same probe as `supportsWebGL()`; a profile WITH WebGL whose
 * visual layer still fails is not skipped and fails the test.
 */
async function requireWebGL(page: Page) {
  const available = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  });
  test.skip(!available, "This browser profile exposes no WebGL; the fallback path is covered separately.");
}

test("motion pause remains explicit across drawer and language changes", async ({ page }) => {
  await bypassEntry(page);
  await page.goto("/#work");
  await requireWebGL(page);
  const pause = page.getByRole("button", { name: "Pause animation", exact: true });
  await expect(pause).toBeVisible();
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Resume animation", exact: true })).toBeFocused();
  await page.getByRole("button", { name: /project twin/i }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Resume animation", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "IT — Italiano", exact: true }).click();
  await expect(page.getByRole("button", { name: "Riprendi animazione", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /05 contatti/i }).click();
  await expect(page.locator(".chapter-nav a[aria-current=location]")).toHaveAttribute("href", "#contact");
  const resume = page.getByRole("button", { name: "Riprendi animazione", exact: true });
  await expect(resume).toBeVisible();
  // One control for the whole story, never over reading text.
  await expect.poll(async () => resume.evaluate((button) => {
    const control = button.getBoundingClientRect();
    return Array.from(document.querySelectorAll("[data-chapter] h1, [data-chapter] h2, [data-chapter] h3, [data-chapter] p, [data-chapter] a"))
      .map((element) => element.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0)
      .every((box) => control.right <= box.left || control.left >= box.right || control.bottom <= box.top || control.top >= box.bottom);
  })).toBe(true);
});

test("visible idle renders until the user pauses animation", async ({ page }) => {
  await page.addInitScript(() => {
    const counter = { draws: 0 };
    Reflect.set(window, "__motionProbe", counter);
    const patched = new Map<object, Set<string>>();
    for (const kind of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!kind) continue;
      for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
        let owner = kind.prototype;
        while (owner && !Object.hasOwn(owner, name)) owner = Object.getPrototypeOf(owner);
        if (!owner || patched.get(owner)?.has(name)) continue;
        const original = Reflect.get(owner, name);
        patched.set(owner, (patched.get(owner) ?? new Set()).add(name));
        Reflect.set(owner, name, function (this: WebGLRenderingContext, ...args: unknown[]) {
          const value = Reflect.apply(original, this, args);
          counter.draws += 1;
          return value;
        });
      }
    }
  });
  await bypassEntry(page);
  await page.goto("/");
  await requireWebGL(page);
  const pause = page.getByRole("button", { name: "Pause animation", exact: true });
  await expect(pause).toBeVisible();
  await page.waitForTimeout(1200);
  const draws = () => page.evaluate(() => Number(Reflect.get(window, "__motionProbe").draws));
  const idleStart = await draws();
  expect(idleStart).toBeGreaterThan(0);
  await page.waitForTimeout(700);
  expect(await draws()).toBeGreaterThan(idleStart);
  await pause.click();
  await page.waitForTimeout(700);
  const pausedStart = await draws();
  await page.waitForTimeout(700);
  expect(await draws()).toBe(pausedStart);
});

test("a constrained device renders in the low tier at the low cadence", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
    const counter = { frames: 0 };
    Reflect.set(window, "__frameProbe", counter);
    // three clears the target once per rendered frame; counting it counts frames without assuming draw calls.
    for (const kind of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!kind) continue;
      const original = kind.prototype.clear;
      kind.prototype.clear = function (this: WebGLRenderingContext, mask: number) {
        counter.frames += 1;
        return original.call(this, mask);
      };
    }
  });
  await bypassEntry(page);
  await page.goto("/");
  await requireWebGL(page);
  const shell = page.locator(".webgl-shell");
  await expect(shell.locator("canvas")).toHaveAttribute("data-context-guard", "ready");
  await expect(shell).toHaveAttribute("data-quality", "low");
  await page.waitForTimeout(1500);
  const frames = () => page.evaluate(() => Number(Reflect.get(window, "__frameProbe").frames));
  const start = await frames();
  await page.waitForTimeout(2000);
  const rendered = (await frames()) - start;
  // The store used to keep the high cadence (30 fps idle) while the canvas drew the low tier.
  expect(rendered).toBeGreaterThan(0);
  expect(rendered).toBeLessThanOrEqual(MOTION_RATES.low.idle * 2 + 4);
});

const CHAPTERS = ["identity", "about", "capabilities", "work", "experience", "contact"] as const;

test("one persistent stage holds the model while chapters alternate around it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await bypassEntry(page);
  await page.goto("/");
  await requireWebGL(page);
  await expect(page.locator(".webgl-shell canvas")).toHaveAttribute("data-context-guard", "ready");
  await expect(page.locator("[data-scene-stage]")).toHaveCount(1);
  const stageBox = () => page.locator("[data-scene-stage]").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return [box.left, box.top, box.width, box.height].map(Math.round);
  });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    const sideBySide = await page.evaluate(() =>
      matchMedia("(min-width: 1081px), (orientation: landscape) and (min-width: 600px)").matches);
    let first: number[] | undefined;
    for (const [index, id] of CHAPTERS.entries()) {
      await page.locator(`.chapter-nav a[href="#${id}"]`).click();
      await expect(page.locator(".chapter-nav a[aria-current=location]")).toHaveAttribute("href", `#${id}`);
      // The stage never moves or resizes between chapters: only the model inside it does.
      first ??= await stageBox();
      expect(await stageBox(), `${viewport.width}x${viewport.height} ${id}`).toEqual(first);
      const geometry = await page.locator(`#${id}`).evaluate((section) => {
        const main = document.getElementById("main-content")!;
        const style = getComputedStyle(main);
        const left = main.getBoundingClientRect().left + parseFloat(style.paddingLeft);
        const right = main.getBoundingClientRect().right - parseFloat(style.paddingRight);
        const boxes = Array.from(section.children).map((child) => child.getBoundingClientRect()).filter((box) => box.height > 0);
        const stage = document.querySelector("[data-scene-stage]")!.getBoundingClientRect();
        const heading = section.querySelector("h1, h2")!.getBoundingClientRect();
        return {
          middle: (left + right) / 2,
          textLeft: Math.min(...boxes.map((box) => box.left)),
          textRight: Math.max(...boxes.map((box) => box.right)),
          headingTop: heading.top,
          stageBottom: stage.bottom,
        };
      });
      if (sideBySide) {
        // Text takes the column the model leaves: left for 00/02/04, right for 01/03/05.
        if (index % 2 === 0) expect(geometry.textRight, id).toBeLessThanOrEqual(geometry.middle + 1);
        else expect(geometry.textLeft, id).toBeGreaterThanOrEqual(geometry.middle - 1);
      } else if (id !== "identity") {
        // Portrait: a chapter reached from the navigation starts below the sticky band.
        expect(geometry.headingTop, id).toBeGreaterThanOrEqual(geometry.stageBottom - 1);
      }
    }
  }
});

test("the scene canvas keeps its size and place while the story scrolls", async ({ page }) => {
  await bypassEntry(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#work");
  await requireWebGL(page);
  await expect(page.locator(".scene-staged")).toHaveAttribute("data-visual-ready", "");
  const state = () => page.locator(".webgl-shell canvas").evaluate((element: HTMLCanvasElement) => {
    const box = element.getBoundingClientRect();
    return { width: element.width, height: element.height, left: Math.round(box.left), top: Math.round(box.top) };
  });
  const before = await state();
  for (const delta of [40, 400, -260, 1200]) {
    await page.mouse.wheel(0, delta);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await state()).toEqual(before);
  }
});

test("forced colors keep chapter navigation in sync while the visual layer is hidden", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await bypassEntry(page);
  await page.goto("/");
  await expect(page.locator(".webgl-shell")).toBeHidden();
  for (const id of ["experience", "about"]) {
    await page.evaluate((target) => document.getElementById(target)!.scrollIntoView(), id);
    await expect(page.locator(".chapter-nav a[aria-current=location]")).toHaveAttribute("href", `#${id}`);
  }
});

test("the visual layer arriving does not shift the reading layout", async ({ page }) => {
  await page.route(/ExperienceCanvas-.*\.js/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });
  await bypassEntry(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await requireWebGL(page);
  await page.evaluate(() => document.fonts.ready);
  const positions = () => page.evaluate(() => ["about", "work", "contact"].map((id) =>
    Math.round(document.getElementById(id)!.getBoundingClientRect().top + scrollY)));
  const before = await positions();
  await expect(page.locator(".webgl-shell canvas")).toHaveAttribute("data-context-guard", "ready");
  await expect(page.locator(".scene-staged")).toHaveAttribute("data-visual-ready", "");
  expect(await positions()).toEqual(before);
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

test("a shader that fails to link switches to the deterministic fallback", async ({ page }) => {
  await page.addInitScript(() => {
    for (const kind of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!kind) continue;
      const original = kind.prototype.getProgramParameter;
      kind.prototype.getProgramParameter = function (this: WebGLRenderingContext, program: WebGLProgram, name: number) {
        return name === this.LINK_STATUS ? false : original.call(this, program, name);
      };
    }
  });
  await bypassEntry(page);
  await page.goto("/");
  await requireWebGL(page);
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

const mediaCases = portfolioContent.en.caseStudies.filter((entry) => entry.media?.length);
const textOnlyCase = portfolioContent.en.caseStudies.find((entry) => !entry.media?.length);

async function openCase(page: Page, locale: "en" | "it", title: string) {
  await bypassEntry(page);
  await page.goto(locale === "it" ? "/?lang=it#work" : "/#work");
  // The page is prerendered: a click before hydration is silently dropped. The HUD only exists once React runs.
  await expect(page.locator(".hud__readout")).toBeVisible();
  await page.getByRole("button", { name: new RegExp(title, "i") }).click();
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const entry of mediaCases) {
  const items = entry.media!;
  const lead = items[0];

  test.describe(`case media: ${entry.id}`, () => {
    test("requests nothing before the drawer opens, then reserves every box and lazy-loads", async ({ page }) => {
      const requested: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/case-media/")) requested.push(request.url());
      });
      // The files are held back until the test releases them, so the "before load" state is deterministic.
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/case-media/**", async (route) => {
        await gate;
        await route.continue();
      });

      await bypassEntry(page);
      await page.goto("/#work");
      await scrollToEnd(page);
      expect(requested, "case assets must not load while the drawer is closed").toEqual([]);

      await page.getByRole("button", { name: new RegExp(entry.title, "i") }).click();
      const dialog = page.getByRole("dialog", { name: entry.title });
      const images = dialog.locator("img.case-media__image");
      await expect(images).toHaveCount(items.length);
      for (const [index, media] of items.entries()) {
        const image = images.nth(index);
        await expect(image).toHaveAttribute("loading", "lazy");
        await expect(image).toHaveAttribute("width", String(media.width));
        await expect(image).toHaveAttribute("height", String(media.height));
        await expect(image).toHaveAttribute("alt", media.alt);
        // Before the (held-back) file arrives the box already has its final aspect ratio.
        const box = (await image.boundingBox())!;
        expect(box.height / box.width).toBeCloseTo(media.height / media.width, 1);
      }

      const leadImage = images.first();
      expect(await leadImage.evaluate((node: HTMLImageElement) => node.complete)).toBe(false);
      const before = (await leadImage.boundingBox())!;
      release();
      // Generous: the WebGL scene behind the drawer can keep the main thread busy when workers run in parallel.
      await expect
        .poll(() => leadImage.evaluate((node: HTMLImageElement) => node.naturalWidth), { timeout: 20_000 })
        .toBeGreaterThan(0);
      const after = (await leadImage.boundingBox())!;
      expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
      expect(requested.length).toBeGreaterThan(0);
      expect(requested.every((url) => new URL(url).pathname.endsWith(".webp"))).toBe(true);
    });

    for (const locale of ["en", "it"] as const) {
      test(`shows localized alt, caption and provenance for every image (${locale})`, async ({ page }) => {
        const localized = portfolioContent[locale].caseStudies.find((candidate) => candidate.id === entry.id)!;
        const dialog = await openCase(page, locale, localized.title);
        for (const [index, media] of localized.media!.entries()) {
          await expect(dialog.locator("img.case-media__image").nth(index)).toHaveAttribute("alt", media.alt);
          const caption = dialog.locator("figcaption").nth(index);
          await expect(caption).toContainText(media.caption);
          await expect(caption).toContainText(media.provenance);
        }
      });
    }

    test("missing files keep every text field and link, and leave no gap", async ({ page }) => {
      await page.route("**/case-media/**", (route) => route.fulfill({ status: 404, body: "not found" }));
      const dialog = await openCase(page, "en", entry.title);
      await expect(dialog.locator(".case-media")).toHaveCount(0);
      expect(await dialog.locator(".case-media-set").evaluate((node) => node.getBoundingClientRect().height)).toBe(0);
      await expect(dialog.locator(".case-drawer__summary")).toHaveText(entry.summary);
      await expect(dialog.locator(".case-field")).not.toHaveCount(0);
      for (const link of entry.links) await expect(dialog.locator(`a[href="${link.href}"]`)).toBeVisible();
      expect(await dialog.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    });

    test("one failed image removes only its own figure", async ({ page }) => {
      test.skip(items.length < 2, "needs at least two images");
      await page.route(`**${lead.src}`, (route) => route.fulfill({ status: 404, body: "not found" }));
      await page.route(`**${lead.variants?.[0]?.src ?? lead.src}`, (route) => route.fulfill({ status: 404, body: "not found" }));
      const dialog = await openCase(page, "en", entry.title);
      await expect(dialog.locator("figure")).toHaveCount(items.length - 1);
      await expect(dialog.locator(".case-field")).not.toHaveCount(0);
    });

    test("adds one predictable focus stop per image and does not overflow on a phone", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const dialog = await openCase(page, "en", entry.title);
      const focusable = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const expectedStops = 1 + items.length + entry.links.length; // close + one full-size link per image + case links
      expect(await dialog.locator(focusable).count()).toBe(expectedStops);
      const mediaStops = dialog.locator("figure").locator(focusable);
      await expect(mediaStops).toHaveCount(items.length);
      for (const [index, media] of items.entries()) await expect(mediaStops.nth(index)).toHaveAttribute("href", media.src);
      expect(await dialog.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);

      await expect(dialog.getByRole("button", { name: /close/i })).toBeFocused();
      for (let step = 0; step < expectedStops; step += 1) await page.keyboard.press("Tab");
      await expect(dialog.getByRole("button", { name: /close/i })).toBeFocused();
    });
  });
}

test("a case without approved media keeps its text-only drawer", async ({ page }) => {
  test.skip(!textOnlyCase, "every case has media");
  const dialog = await openCase(page, "en", textOnlyCase!.title);
  await expect(dialog.locator("figure")).toHaveCount(0);
  await expect(dialog.locator(".case-drawer__summary")).toHaveText(textOnlyCase!.summary);
});

/*
 * Hero text blocks must never sit on top of each other. The bug this pins: in portrait windows between 761px
 * and 1080px the hero section is only as tall as the title, while the thesis and the scroll cue were still
 * absolutely anchored to its bottom, so they landed on the name. Landscape and short windows never showed it,
 * so the matrix mixes both orientations on purpose. The two title lines overlap by design (line-height < 1) and
 * are measured as one block.
 */
const HERO_VIEWPORTS = [
  ...[761, 800, 861].flatMap((width) => [700, 768, 821, 900, 1000, 1180].map((height) => ({ width, height }))),
  { width: 1024, height: 1366 },
  { width: 1080, height: 1400 },
];

async function heroCollisions(page: Page) {
  return page.evaluate(() => {
    const blocks: { name: string; el: Element }[] = [];
    const add = (name: string, selector: string) =>
      document.querySelectorAll(selector).forEach((el, index) => blocks.push({ name: `${name}${index || ""}`, el }));
    add("spec", ".hero-spec span");
    add("title", ".hero-title");
    add("role", ".hero-thesis > p:not(.hero-lede)");
    add("thesis", ".hero-thesis h2");
    add("lede", ".hero-lede");
    add("action", ".hero-actions a");
    add("cue", ".scroll-cue");
    add("hud-identity", ".hud__identity");
    add("hud-tools", ".hud__tools");
    add("rail", ".chapter-nav");
    add("motion", ".motion-control");
    const boxes = blocks
      .map(({ name, el }) => ({ name, rect: el.getBoundingClientRect(), shown: getComputedStyle(el).display !== "none" }))
      .filter((box) => box.shown && box.rect.width > 1 && box.rect.height > 1);
    const found: string[] = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i].rect;
        const b = boxes[j].rect;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 1 && h > 1) found.push(`${boxes[i].name}×${boxes[j].name} ${Math.round(w)}x${Math.round(h)}`);
      }
    }
    return found;
  });
}

for (const locale of ["en", "it"] as const) {
  for (const layout of ["staged", "fallback"] as const) {
    test(`hero text blocks never overlap, 761–1080px, both orientations (${locale}, ${layout} layout)`, async ({ page }) => {
      if (layout === "fallback") await page.route(/ExperienceCanvas-.*\.js/, (route) => route.abort());
      await bypassEntry(page);
      await page.setViewportSize({ width: 800, height: 900 });
      await page.goto(locale === "it" ? "/?lang=it" : "/");
      await page.evaluate(() => document.fonts.ready);
      if (layout === "staged") await expect(page.locator(".scene-staged")).toHaveAttribute("data-scene-layout", "");
      else await expect(page.locator(".scene-staged")).not.toHaveAttribute("data-scene-layout", "");

      const failures: string[] = [];
      for (const viewport of HERO_VIEWPORTS) {
        await page.setViewportSize(viewport);
        // No frame wait: the scene behind can keep the main thread busy, and reading rects forces a fresh layout.
        await page.evaluate(() => window.scrollTo(0, 0));
        const found = await heroCollisions(page);
        if (found.length) failures.push(`${viewport.width}x${viewport.height}: ${found.join(", ")}`);
      }
      expect(failures, `hero overlaps:\n${failures.join("\n")}`).toEqual([]);
    });
  }
}
