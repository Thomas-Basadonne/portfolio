import { expect, type Page, type TestInfo } from "@playwright/test";

/** Measure resolved text colors against pixels actually composited under each text run.
 * Hide glyphs only for the background capture: translucent surfaces still composite
 * over the real chapter/WebGL, and antialiasing cannot masquerade as the background.
 */
export async function expectHudContrast(page: Page, info: TestInfo, label: string) {
  // Focus-induced scrolling can update the active chapter on the next frame.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const runs = await page.locator(".hud").evaluate((hud) => {
    const walker = document.createTreeWalker(hud, NodeFilter.SHOW_TEXT);
    const result = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim() || !parent.checkVisibility({ checkOpacity: true })) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const style = getComputedStyle(parent);
      let opacity = 1;
      for (let ancestor: Element | null = parent; ancestor; ancestor = ancestor.parentElement) {
        const ancestorStyle = getComputedStyle(ancestor);
        opacity *= Number(ancestorStyle.opacity);
        if (ancestorStyle.mixBlendMode !== "normal" || ancestorStyle.filter !== "none") {
          throw new Error("Functional HUD text must not depend on blend modes or filters");
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
    return result;
  });
  expect(runs.length).toBeGreaterThan(10);
  await info.attach(`${label}-visual`, { body: await page.screenshot({ scale: "css" }), contentType: "image/png" });
  const mask = await page.addStyleTag({ content: ".hud, .hud * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }" });
  let background: Awaited<ReturnType<Page["screenshot"]>>;
  try {
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    background = await page.screenshot({ scale: "css" });
  } finally {
    await mask.evaluate((element) => element.parentNode?.removeChild(element));
  }
  const measurements = await page.evaluate(async ({ image, textRuns }) => {
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
  await info.attach(`${label}-contrast`, { body: JSON.stringify(measurements, null, 2), contentType: "application/json" });
  for (const run of measurements) {
    expect.soft(run.minimum, `${label}: ${run.text} (${run.color}) against composited pixels`).toBeGreaterThanOrEqual(run.required);
  }
}

export async function expectHudGeometry(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const boxes = await page.locator(".hud__identity, .hud__readout, .hud .lang-switch, .chapter-nav, .visual-status--failed").evaluateAll((elements) => elements.map((element) => {
    const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
    return { name: element.className, x, y, right, bottom, width, height };
  }));
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
