import { expect, test, type Page } from "@playwright/test";
import { holdLayout, settleLayout } from "./hold-layout";

/*
 * SYS-04 (#81). Each Work row was a grid of its own with an `auto` track for the status badge, so every badge took a
 * different bite out of the reading column: at 1440x900 staged the summaries measured 130-217px (IT) and 146-225px (EN).
 * Below 1081px the status was hidden, so on phones nothing said "private beta" or "in field test".
 * Decision (Thomas, 16/11/2026): anatomy B without the side branch — the status is the last line of the row's text
 * column, under the summary; the summary stays hidden on phones, the status does not; compact prose at 14px.
 * Geometry only, from the DOM, in EN/IT and in the staged and fallback layouts.
 */

const VIEWPORTS = [
  { width: 390, height: 664 }, { width: 760, height: 430 }, { width: 800, height: 1100 },
  { width: 1024, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 },
];

type Row = { id: string; text: number[]; status: number[] | null; statusLines: number; summary: number[] | null };

const rows = (page: Page) => page.locator(".case-index__item").evaluateAll((items): Row[] => items.map((item) => {
  const box = (element: Element | null) => {
    if (!element || getComputedStyle(element).display === "none") return null;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 ? [rect.left, rect.top, rect.right, rect.bottom] : null;
  };
  const status = item.querySelector(".case-index__status");
  let statusLines = 0;
  if (box(status)) {
    const range = document.createRange();
    range.selectNodeContents(status!);
    statusLines = new Set([...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top))).size;
  }
  return {
    id: item.querySelector(".case-index__code")!.textContent!,
    text: box(item.querySelector(".case-index__title"))!,
    status: box(status),
    statusLines,
    summary: box(item.querySelector(".case-index__title em")),
  };
}));

for (const locale of ["en", "it"] as const) {
  for (const layout of ["staged", "fallback"] as const) {
    test(`Work rows keep one reading measure and show the status (${locale}, ${layout} layout)`, async ({ page }) => {
      test.setTimeout(120_000);
      await holdLayout(page, layout);
      await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
      await page.setViewportSize(VIEWPORTS[0]);
      await page.goto(`/?lang=${locale}#work`);
      await expect(page.locator(".hud__readout")).toBeVisible();
      await settleLayout(page, layout);

      const failures: string[] = [];
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => document.fonts.ready);
        const found = await rows(page);
        const label = `${viewport.width}x${viewport.height}`;
        const widths = found.map((row) => row.text[2] - row.text[0]);
        if (Math.max(...widths) - Math.min(...widths) > 1) failures.push(`${label}: text widths ${widths.map(Math.round).join("/")}`);
        for (const row of found) {
          if (!row.status) { failures.push(`${label} ${row.id}: status hidden`); continue; }
          if (row.statusLines !== 1) failures.push(`${label} ${row.id}: status on ${row.statusLines} lines`);
          // Inside the text column, after the rest of the text: the badge never narrows the prose.
          if (row.status[0] < row.text[0] - 0.5 || row.status[2] > row.text[2] + 0.5) failures.push(`${label} ${row.id}: status outside the text column`);
          if (row.summary && row.status[1] < row.summary[3]) failures.push(`${label} ${row.id}: status not under the summary`);
          // Phones keep the summary hidden (D2): the row stays short, the status is what it adds.
          if (viewport.width <= 760 && row.summary) failures.push(`${label} ${row.id}: summary shown on a phone`);
        }
      }
      expect(failures, failures.join("\n")).toEqual([]);
    });
  }
}

test("compact prose reads at 14px, labels stay at 12px", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#work");
  await expect(page.locator(".hud__readout")).toBeVisible();
  const sizes = await page.evaluate(() => Object.fromEntries([
    ".case-index__title em", ".trace-list p", ".capability-list p", ".case-index__title small", ".case-index__status",
  ].map((selector) => [selector, parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize)])));
  expect(sizes).toEqual({
    ".case-index__title em": 14, ".trace-list p": 14, ".capability-list p": 14,
    ".case-index__title small": 12, ".case-index__status": 12,
  });
});
