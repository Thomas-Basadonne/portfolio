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

export async function focusVisibility(page: Page) {
  return page.evaluate(() => {
    const target = document.activeElement!;
    const box = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - 1, box.left + box.width / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, box.top + box.height / 2));
    const painted = document.elementFromPoint(x, y);
    const stage = document.querySelector(".scene-stage")?.getBoundingClientRect();
    const stickyBand = matchMedia("(max-width: 1080px) and (orientation: portrait)").matches
      && document.querySelector(".scene-staged[data-scene-layout]") && !matchMedia("(forced-colors: active)").matches;
    return {
      text: target.textContent?.trim(), top: box.top, bottom: box.bottom,
      visible: box.top >= 0 && box.bottom <= innerHeight
        && (target.contains(painted) || painted?.contains(target) === true)
        && (!stickyBand || box.top >= (stage?.bottom ?? 0)),
    };
  });
}
