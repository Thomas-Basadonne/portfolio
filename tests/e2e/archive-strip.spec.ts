import { expect, test } from "@playwright/test";
import { holdLayout, settleLayout } from "./hold-layout";

/*
 * SYS-04 D4 (#81): the Open source / Lab archive. Its notes sat in a 1fr track of a three-column strip whose only
 * stacking rule queried the chapter (25rem), a container that exists in the staged layout alone. At 1280x800 staged
 * the notes measured 76px (17 lines), 99px at 1440, 118px at 800x1100 in both layouts. The strip now follows its own
 * width: three columns, then the title on its own row over two, then one. Geometry from the DOM, EN/IT, both layouts.
 */

const VIEWPORTS = [
  { width: 320, height: 568 }, { width: 390, height: 664 }, { width: 760, height: 430 }, { width: 800, height: 1100 },
  { width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 },
];
// In em of the note's own font size: about 28 characters at the narrowest, 70 at the widest.
const MIN_MEASURE = 15;
const MAX_MEASURE = 40;

for (const locale of ["en", "it"] as const) {
  for (const layout of ["staged", "fallback"] as const) {
    test(`archive notes keep a reading measure (${locale}, ${layout} layout)`, async ({ page }) => {
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
        const notes = await page.locator(".archive-strip p").evaluateAll((items) => items.map((note) => {
          const strip = note.closest(".archive-strip")!.getBoundingClientRect();
          const box = note.getBoundingClientRect();
          return {
            text: note.textContent!.slice(0, 24), measure: box.width / parseFloat(getComputedStyle(note).fontSize),
            inside: box.left >= strip.left - 0.5 && box.right <= strip.right + 0.5,
          };
        }));
        const label = `${viewport.width}x${viewport.height}`;
        expect(notes.length, label).toBeGreaterThan(0);
        for (const note of notes) {
          if (note.measure < MIN_MEASURE || note.measure > MAX_MEASURE || !note.inside) {
            failures.push(`${label}: «${note.text}» ${note.measure.toFixed(1)}em inside=${note.inside}`);
          }
        }
      }
      expect(failures).toEqual([]);
    });
  }
}
