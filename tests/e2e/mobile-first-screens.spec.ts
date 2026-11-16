import { expect, test, type Page } from "@playwright/test";
import { portfolioContent } from "../../src/content/portfolio";

/*
 * Mobile first screens (follow-up of the 16/11/2026 review on iPhone, both languages). Portrait phones, from the
 * smallest Safari window in the hero contract to the largest common screen. Geometry only, from the DOM.
 * - Splash title: it sat in a 9ch box, four lines of one word each, using about half of the column (EN 190/358px).
 * - Splash caption: the hint and the resolution shared one row on the stage's lower edge; in Italian they no longer
 *   fit (166 + 135px against 307px at 390) and both broke onto two lines; the loading text is longer still. Now a
 *   two-line legend under the instrument box: one label per line, flush left, never over the Compiler.
 */

const PHONES = [
  { width: 320, height: 568 }, { width: 375, height: 548 }, { width: 375, height: 667 }, { width: 390, height: 664 },
  { width: 414, height: 622 }, { width: 360, height: 740 }, { width: 390, height: 844 }, { width: 430, height: 932 },
];

/** Painted rows of a heading, from its text nodes (an inline element's own box would count as a row). */
const titleRows = (page: Page) => page.locator("#entry-title").evaluate((title) => {
  const rows = new Map<number, [number, number]>();
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.width < 1) continue;
      const key = Math.round(rect.top);
      const row = rows.get(key);
      rows.set(key, row ? [Math.min(row[0], rect.left), Math.max(row[1], rect.right)] : [rect.left, rect.right]);
    }
  }
  const column = title.parentElement!.getBoundingClientRect();
  return { column: [column.left, column.right], rows: [...rows.values()] };
});

for (const locale of ["en", "it"] as const) {
  test(`the splash title spans the column on phones, lead and emphasis on a line each (${locale})`, async ({ page }) => {
    await page.setViewportSize(PHONES[0]);
    await page.goto(`/?lang=${locale}`);
    await expect(page.locator(".calibrate-button")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const failures: string[] = [];
    for (const viewport of PHONES) {
      await page.setViewportSize(viewport);
      const { column, rows } = await titleRows(page);
      const width = column[1] - column[0];
      const widest = Math.max(...rows.map(([left, right]) => right - left));
      const label = `${viewport.width}x${viewport.height}`;
      if (rows.length !== 2) failures.push(`${label}: ${rows.length} lines`);
      if (widest < 0.85 * width) failures.push(`${label}: widest line ${Math.round(widest)} of ${Math.round(width)}px`);
      if (rows.some(([left, right]) => left < column[0] - 1 || right > column[1] + 1)) failures.push(`${label}: a line leaves the column`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test(`the splash caption keeps each label on one line on phones, in every gate state (${locale})`, async ({ page }) => {
    const { ui } = portfolioContent[locale];
    await page.setViewportSize(PHONES[0]);
    await page.goto(`/?lang=${locale}`);
    await expect(page.locator(".calibrate-button")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const failures: string[] = [];
    for (const viewport of PHONES) {
      await page.setViewportSize(viewport);
      // The hint changes with the gate's state; the longest one must fit as well as the one on screen.
      for (const note of [ui.entryLoading, ui.entryPoster, `↻ ${ui.entryDrag}`]) {
        const found = await page.evaluate((text) => {
          // A copy of the caption with the same classes, next to it: React owns the live one (rewriting its text node
          // crashed the app in Firefox at the next gate state).
          const live = document.querySelector<HTMLElement>(".gate-stage__caption")!;
          const copy = live.cloneNode(true) as HTMLElement;
          live.after(copy);
          const spans = [...copy.querySelectorAll<HTMLElement>(":scope > span")];
          spans[0].textContent = text;
          const box = (element: Element) => element.getBoundingClientRect();
          const lines = (element: Element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return new Set([...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top))).size;
          };
          const meet = (a: DOMRect, b: DOMRect) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
          const stage = box(document.querySelector(".gate-stage")!);
          const others = [".gate-bar__identity", ".gate-bar__tools", ".entry-sequence__statement", ".calibrate-button"]
            .map((selector) => [selector, box(document.querySelector(selector)!)] as const);
          const problems: string[] = [];
          spans.forEach((span, index) => {
            const rect = box(span);
            if (lines(span) !== 1) problems.push(`label ${index + 1} on ${lines(span)} lines`);
            if (rect.left < stage.left || rect.right > stage.right) problems.push(`label ${index + 1} leaves the stage`);
            // Under the box the Compiler is framed on, so it can never sit behind the text.
            if (rect.top < stage.bottom - 0.5) problems.push(`label ${index + 1} inside the instrument box`);
            for (const [name, other] of others) if (meet(rect, other)) problems.push(`label ${index + 1} meets ${name}`);
          });
          if (meet(box(spans[0]), box(spans[1]))) problems.push("the labels meet");
          // One legend, not two loose labels: both start on the same edge.
          if (Math.abs(box(spans[0]).left - box(spans[1]).left) > 1) problems.push("the labels are not aligned");
          copy.remove();
          return problems;
        }, note);
        if (found.length) failures.push(`${viewport.width}x${viewport.height} «${note}»: ${found.join("; ")}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}
