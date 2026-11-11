import { expect, type Page, type TestInfo } from "@playwright/test";

/** Measure resolved text colors against pixels actually composited under each text run.
 * Hide glyphs only for the background capture: translucent surfaces still composite
 * over the real chapter/WebGL, and antialiasing cannot masquerade as the background.
 *
 * The mask is a constructable stylesheet (CSSOM), not an injected <style>: the production CSP
 * (`style-src 'self'`) blocks inline sheets, which left the text visible and measured against itself
 * on every real host (#62). A mask that does not apply fails loudly instead of measuring nothing.
 * It also stops transitions: `color` animates over 0.25s on nav links, and a transition outranks
 * `!important`, so two frames later the glyphs would still be mostly painted.
 */
const MASK_KEY = "__contrastProbeMask";

async function setMask(page: Page, css: string | null) {
  await page.evaluate(({ css, key }) => {
    const store = window as unknown as Record<string, CSSStyleSheet | undefined>;
    const sheet = store[key] ?? (store[key] = new CSSStyleSheet());
    sheet.replaceSync(css ?? "");
    const others = document.adoptedStyleSheets.filter((adopted) => adopted !== sheet);
    document.adoptedStyleSheets = css ? [...others, sheet] : others;
    // Flush styles now, so the next change starts from this state.
    void document.documentElement.offsetHeight;
  }, { css, key: MASK_KEY });
}

export async function expectHudContrast(page: Page, info: TestInfo, label: string, selector = ".hud", minimumRuns = 10) {
  // Focus-induced scrolling can update the active chapter on the next frame.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  // Instrumentation must not leak between measurements.
  await setMask(page, null);
  const readRuns = () => page.locator(selector).evaluate((hud, visibleOnly) => {
    const walker = document.createTreeWalker(hud, NodeFilter.SHOW_TEXT);
    const result = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim() || !parent.checkVisibility({ checkOpacity: true })) continue;
      // Visually hidden text is not painted text in any state.
      if (parent.closest(".visually-hidden")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = visibleOnly ? Array.from(range.getClientRects()) : [range.getBoundingClientRect()];
      for (const rect of rects) {
        if (!rect.width || !rect.height) continue;
        const style = getComputedStyle(parent);
        if (visibleOnly && (rect.top < 0 || rect.bottom > innerHeight || rect.left < 0 || rect.right > innerWidth
          || parent.closest(".visually-hidden, [aria-hidden='true']"))) continue;
        // A transparent fill has no foreground to measure; the type inventory asserts that no
        // informational label uses one (outlined display type paints its stroke instead).
        if (style.color === "rgba(0, 0, 0, 0)") continue;
        if (visibleOnly && parent.closest("main")) {
          if (rect.top < parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)) continue;
          // A line currently passing behind fixed chrome is an occlusion, not a text-color defect.
          // Its ability to reach the reading zone is asserted separately by the scrolling tests.
          const occluded = Array.from(document.querySelectorAll(".chapter-nav, .hud__identity, .hud__tools, .visual-status--failed"))
            .some((overlay) => {
              const box = overlay.getBoundingClientRect();
              return rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top;
            });
          if (occluded) continue;
        }
        let opacity = 1;
        for (let ancestor: Element | null = parent; ancestor; ancestor = ancestor.parentElement) {
          const ancestorStyle = getComputedStyle(ancestor);
          opacity *= Number(ancestorStyle.opacity);
          if (ancestorStyle.mixBlendMode !== "normal" || ancestorStyle.filter !== "none") {
            throw new Error("Functional text must not depend on blend modes or filters");
          }
        }
        result.push({
          text: node.textContent.trim(),
          color: style.color,
          opacity,
          fontSize: Number.parseFloat(style.fontSize),
          fontWeight: Number.parseFloat(style.fontWeight),
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      }
    }
    return result;
  }, selector !== ".hud");
  // Colors are read first and the background is shot afterwards, so both must come from one state. The HUD
  // retones asynchronously after a scroll (light chapters invert it); under load that lands between the two
  // and the text of one tone was compared with the chips of the other (#62). Re-read after the shots and
  // measure only a state that held still.
  let runs: Awaited<ReturnType<typeof readRuns>>;
  let visual: Awaited<ReturnType<Page["screenshot"]>>;
  let background: Awaited<ReturnType<Page["screenshot"]>>;
  for (let attempt = 1; ; attempt += 1) {
    runs = await readRuns();
    visual = await page.screenshot({ scale: "css" });
    background = await captureBackground(page, selector, label);
    if (JSON.stringify(await readRuns()) === JSON.stringify(runs)) break;
    if (attempt === 5) throw new Error(`${label}: the measured text kept changing across 5 attempts; nothing stable to measure.`);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  expect(runs.length).toBeGreaterThan(minimumRuns);
  await info.attach(`${label}-visual`, { body: visual, contentType: "image/png" });
  const measurements = await measure(page, background, runs);
  await info.attach(`${label}-contrast`, { body: JSON.stringify(measurements, null, 2), contentType: "application/json" });
  for (const run of measurements) {
    expect.soft(run.minimum, `${label}: ${run.text} (${run.color}) against composited pixels`).toBeGreaterThanOrEqual(run.required);
  }
}

async function captureBackground(page: Page, selector: string, label: string) {
  try {
    await setMask(page, `:is(${selector}), :is(${selector}) * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; transition: none !important; }`);
    const unmasked = await page.locator(selector).first().evaluate((root) => {
      const probe = [root, ...root.querySelectorAll("*")].find((element) => element.textContent?.trim());
      return probe && getComputedStyle(probe).color !== "rgba(0, 0, 0, 0)" ? getComputedStyle(probe).color : null;
    });
    if (unmasked) {
      throw new Error(`${label}: the glyph mask did not apply (text still ${unmasked}); the background capture would measure the text against itself.`);
    }
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    return await page.screenshot({ scale: "css" });
  } finally {
    // Restore the colors while transitions are still off, then the transitions: removed together, WebKit
    // animates the text back in from transparent and the next read sees an in-between color.
    await setMask(page, `:is(${selector}), :is(${selector}) * { transition: none !important; }`);
    await setMask(page, null);
  }
}

type TextRun = { text: string; color: string; opacity: number; fontSize: number; fontWeight: number;
  rect: { x: number; y: number; width: number; height: number } };

function measure(page: Page, background: Awaited<ReturnType<Page["screenshot"]>>, runs: TextRun[]) {
  return page.evaluate(async ({ image, textRuns }) => {
    const bytes = Uint8Array.from(atob(image), (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const luminance = (rgb: number[]) => rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    return textRuns.map((run) => {
      const rgba = run.color.match(/[\d.]+/g)!.map(Number);
      const alpha = (rgba[3] ?? 1) * run.opacity;
      const samples = [0.2, 0.5, 0.8].flatMap((x) => [0.25, 0.75].map((y) => {
        const px = Math.floor(run.rect.x + run.rect.width * x);
        const py = Math.floor(run.rect.y + run.rect.height * y);
        if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return { background: [], ratio: 0 };
        const rgb = Array.from(context.getImageData(px, py, 1, 1).data).slice(0, 3);
        const foreground = rgba.slice(0, 3).map((channel, index) => channel * alpha + rgb[index] * (1 - alpha));
        const first = luminance(foreground);
        const second = luminance(rgb);
        return { background: rgb, ratio: (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05) };
      }));
      const large = run.fontSize >= 24 || (run.fontSize >= 18.667 && run.fontWeight >= 700);
      return { ...run, samples, minimum: Math.min(...samples.map((sample) => sample.ratio)), required: large ? 3 : 4.5 };
    });
  }, { image: background.toString("base64"), textRuns: runs });
}

export async function expectHudGeometry(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const boxes = await page.locator(".hud__identity, .hud__readout, .hud .lang-switch, .chapter-nav, .visual-status--failed").evaluateAll((elements) => elements.map((element) => {
    const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
    return { name: element.className, x, y, right, bottom, width, height };
  }));
  const fallbackControls = await page.locator(".visual-status--failed").evaluateAll((notices) => notices.map((notice) => {
    const outer = notice.getBoundingClientRect();
    const button = notice.querySelector("button")!.getBoundingClientRect();
    return { left: button.left - outer.left, right: outer.right - button.right, top: button.top - outer.top, bottom: outer.bottom - button.bottom };
  }));
  for (const control of fallbackControls) {
    for (const clearance of Object.values(control)) expect.soft(clearance, "Retry button stays within its notice").toBeGreaterThanOrEqual(0);
  }
  const viewport = page.viewportSize()!;
  for (const box of boxes) {
    expect.soft(box.x, box.name).toBeGreaterThanOrEqual(0);
    expect.soft(box.y, box.name).toBeGreaterThanOrEqual(0);
    expect.soft(box.right, box.name).toBeLessThanOrEqual(viewport.width);
    expect.soft(box.bottom, box.name).toBeLessThanOrEqual(viewport.height);
  }
  for (const [index, first] of boxes.entries()) {
    for (const second of boxes.slice(index + 1)) {
      // Reserve the 4px outline offset plus its 2px stroke, not just the text boxes.
      const separated = first.right + 6 <= second.x || second.right + 6 <= first.x || first.bottom + 6 <= second.y || second.bottom + 6 <= first.y;
      expect.soft(separated, `${first.name} / ${second.name} focus clearance`).toBe(true);
    }
  }
}
