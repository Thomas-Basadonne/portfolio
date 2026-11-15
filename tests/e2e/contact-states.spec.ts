import { expect, test, type Page } from "@playwright/test";

/*
 * SYS-02 (#79, finding SYS-01 of the #51 audit). Hover and focus used to add 1rem of padding per side to the contact
 * rows: the e-mail lost 32px of measure and took one more line (1920x1080: the final `m` alone on the second line).
 * Contract: the address keeps the same lines, line height and reserved box in default, hover, focus and active, after
 * the transitions settle; where it breaks, it never leaves an orphan letter and never overflows its row.
 * Geometry only, measured with Range rects and bounding boxes, in EN/IT, web/fallback font, staged/fallback layout.
 */

const VIEWPORTS = [
  { width: 320, height: 568 }, { width: 375, height: 548 }, { width: 390, height: 664 }, { width: 760, height: 430 },
  { width: 761, height: 1000 }, { width: 1024, height: 768 }, { width: 1081, height: 1400 }, { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

type Snapshot = {
  lines: number;
  lastLine: string;
  textWidth: number;
  textHeight: number;
  linkLeft: number;
  linkWidth: number;
  linkHeight: number;
  overflow: number;
  background: string;
};

async function prepare(page: Page, layout: "staged" | "fallback", font: "web" | "fallback") {
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  if (font === "fallback") await page.route(/manrope-.*\.woff2/, (route) => route.abort());
  if (layout === "staged") {
    // As holdStagedLayout (portfolio.spec.ts): the staged layout is CSS, so the scene chunk is held and only the WebGL
    // probe gets a context; the layout is the same on every engine, Firefox on CI included.
    await page.route(/ExperienceCanvas-.*\.js/, (route) =>
      route.fulfill({ contentType: "text/javascript", body: "await new Promise(() => {});" }));
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      Reflect.set(HTMLCanvasElement.prototype, "getContext", function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return Reflect.apply(original, this, [type, ...rest]) ?? (type.startsWith("webgl") ? {} : null);
      });
    });
  } else {
    // No WebGL at all: the app keeps the fallback layout from the start.
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      Reflect.set(HTMLCanvasElement.prototype, "getContext", function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return type.startsWith("webgl") ? null : Reflect.apply(original, this, [type, ...rest]);
      });
    });
  }
}

const snapshot = (page: Page) => page.locator(".contact-link[href^='mailto:']").evaluate((link): Snapshot => {
  const strong = link.querySelector("strong")!;
  const range = document.createRange();
  range.selectNodeContents(strong);
  const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
  const tops = [...new Set(rects.map((rect) => Math.round(rect.top)))].sort((a, b) => a - b);
  // Text of every visual line, character by character (the address is split around its <wbr>).
  const walker = document.createTreeWalker(strong, NodeFilter.SHOW_TEXT);
  const byLine = new Map<number, string>();
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    for (let index = 0; index < node.length; index += 1) {
      const char = document.createRange();
      char.setStart(node, index);
      char.setEnd(node, index + 1);
      const box = char.getBoundingClientRect();
      if (box.width > 0) {
        const top = tops.find((value) => Math.abs(value - box.top) < box.height / 2) ?? Math.round(box.top);
        byLine.set(top, (byLine.get(top) ?? "") + node.data[index]);
      }
    }
  }
  const lineTexts = [...byLine.entries()].sort((a, b) => a[0] - b[0]).map(([, text]) => text.trim());
  const strongBox = strong.getBoundingClientRect();
  const linkBox = link.getBoundingClientRect();
  return {
    lines: tops.length,
    lastLine: lineTexts.join(" | "),
    textWidth: Math.round(strongBox.width * 10) / 10,
    textHeight: Math.round(strongBox.height * 10) / 10,
    linkLeft: Math.round(linkBox.left * 10) / 10,
    linkWidth: Math.round(linkBox.width * 10) / 10,
    linkHeight: Math.round(linkBox.height * 10) / 10,
    overflow: Math.max(strong.scrollWidth - strong.clientWidth, Math.ceil(strongBox.right - linkBox.right),
      document.documentElement.scrollWidth - document.documentElement.clientWidth),
    background: `${getComputedStyle(link).color} ${getComputedStyle(link).backgroundColor}`,
  };
});

/** Reads the state until two readings 120ms apart agree (transitions settled). */
async function settled(page: Page) {
  let last = "";
  // Past the 0.3s transitions first, then two equal readings.
  await page.waitForTimeout(350);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.waitForTimeout(120);
    const value = await snapshot(page);
    const key = JSON.stringify(value);
    if (key === last) return value;
    last = key;
  }
  throw new Error(`the contact row kept changing: ${last}`);
}

const geometry = ({ background: _background, ...rest }: Snapshot) => rest;

for (const locale of ["en", "it"] as const) {
  for (const layout of ["staged", "fallback"] as const) {
    for (const font of ["web", "fallback"] as const) {
      test(`the e-mail keeps its lines in hover, focus and active (${locale}, ${layout} layout, ${font} font)`, async ({ page }) => {
        test.setTimeout(120_000);
        await prepare(page, layout, font);
        await page.setViewportSize(VIEWPORTS[0]);
        await page.goto(`/?lang=${locale}#contact`);
        await expect(page.locator(".hud__readout")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const shell = page.locator(".scene-staged");
        if (layout === "staged") await expect(shell).toHaveAttribute("data-scene-layout", "");
        else await expect(shell).not.toHaveAttribute("data-scene-layout", "");
        const faces = await page.evaluate(() => [...document.fonts].filter((face) => /manrope/i.test(face.family)).map((face) => face.status));
        if (font === "fallback") expect(faces.every((status) => status !== "loaded")).toBe(true);

        const link = page.locator(".contact-link[href^='mailto:']");
        const failures: string[] = [];
        for (const viewport of VIEWPORTS) {
          await page.setViewportSize(viewport);
          await page.mouse.move(0, 0);
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
          await link.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
          const base = await settled(page);
          const label = `${viewport.width}x${viewport.height}`;
          if (base.overflow > 1) failures.push(`${label} default: overflow ${base.overflow}px`);
          // One line where it fits; otherwise only the deliberate break after "@", never a stray letter.
          if (base.lines > 1 && !/^[^|]+@ \| [^|]+$/.test(base.lastLine)) failures.push(`${label} default: uncontrolled break "${base.lastLine}"`);

          // No mailto navigation from the pointer presses below.
          await link.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
          await link.hover();
          const hover = await settled(page);
          await page.mouse.move(0, 0);

          // A keyboard event first, so that programmatic focus matches :focus-visible in every engine.
          await page.keyboard.press("Shift");
          await link.focus();
          const focus = await settled(page);
          // WebKit does not match :focus-visible on programmatic focus: there only the geometry of the state is checked.
          const focusVisible = await link.evaluate((element) => element.matches(":focus-visible"));
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

          const box = (await link.boundingBox())!;
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          const active = await settled(page);
          // Released on the link (Firefox keeps :active when released elsewhere); the click is prevented above.
          await page.mouse.up();
          await page.mouse.move(0, 0);
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

          for (const [state, value] of [["hover", hover], ["focus", focus], ["active", active]] as const) {
            const same = JSON.stringify(geometry(value)) === JSON.stringify(geometry(base));
            if (!same) failures.push(`${label} ${state}: ${JSON.stringify(geometry(base))} -> ${JSON.stringify(geometry(value))}`);
            // The feedback is a surface, not a reflow.
            if (state === "focus" && !focusVisible) continue;
            if (value.background === base.background) failures.push(`${label} ${state}: no visible surface change`);
          }
        }
        expect(failures).toEqual([]);
      });
    }
  }
}
