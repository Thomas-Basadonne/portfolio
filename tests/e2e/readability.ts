import type { Page } from "@playwright/test";

/** Informational labels, not the hidden loading text or decorative scroll-cue. */
export const informativeLabels = [
  ".entry-sequence .mono-label", ".hud__identity small", ".hud__monogram", ".hud__readout", ".lang-switch button",
  ".chapter-nav a", ".hero-spec", ".hero-thesis > p:first-child", ".hero-actions a",
  ".chapter-kicker", ".principle-equation", ".capability-list small",
  ".case-index__code", ".case-index__title small", ".case-index__title em", ".case-index__status",
  ".archive-strip .mono-label", ".archive-strip p", ".trace-list .mono-label", ".timeline-heading",
  ".contact-link small", ".site-footer", ".case-drawer .mono-label", ".case-drawer__tags span",
  ".visual-status--failed .mono-label",
].join(", ");

export async function typeInventory(page: Page) {
  return page.locator(informativeLabels).evaluateAll((elements) => elements
    .filter((element) => element.checkVisibility({ checkOpacity: true }))
    .map((element) => {
      const style = getComputedStyle(element);
      return {
        selector: element.className || `${element.parentElement?.className} > ${element.tagName.toLowerCase()}`,
        text: element.textContent?.trim(),
        fontSize: parseFloat(style.fontSize), lineHeight: style.lineHeight,
        color: style.color, opacity: style.opacity,
        fill: style.webkitTextFillColor || style.color,
      };
    }));
}

/** Includes the complete hit area, not just the painted monogram or close glyph. */
export async function controlInventory(page: Page) {
  return page.locator(".hud__identity, .hud .lang-switch button, .chapter-nav a, .case-drawer__header button")
    .evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { text: element.textContent?.trim(), width: box.width, height: box.height };
    }));
}

/**
 * WCAG 2.4.11 asks that the focused element is not *entirely* obscured. A partially
 * clipped element that keeps a usable band in the reading window passes.
 */
export async function focusVisibility(page: Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const safeTop = Math.max(0, parseFloat(root.scrollPaddingTop) || 0);
    const safeBottom = innerHeight - Math.max(0, parseFloat(root.scrollPaddingBottom) || 0);
    const target = document.activeElement!;
    const box = target.getBoundingClientRect();
    const visibleTop = Math.max(box.top, safeTop);
    const visibleBottom = Math.min(box.bottom, safeBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    // Subpixel clipping of a fully visible control must not count as occlusion.
    const required = Math.min(box.height, 24) - 1;
    const x = Math.max(0, Math.min(innerWidth - 1, box.left + box.width / 2));
    const y = Math.max(safeTop, Math.min(safeBottom - 1, visibleTop + visibleHeight / 2));
    const painted = document.elementFromPoint(x, y);
    return {
      text: target.textContent?.trim(), top: box.top, bottom: box.bottom,
      visible: visibleHeight >= required
        && (target.contains(painted) || painted?.contains(target) === true),
    };
  });
}
