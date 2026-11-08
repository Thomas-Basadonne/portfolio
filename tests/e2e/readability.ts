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
 * Words split between two letters inside the reading flow. The email and the mobile contact display type
 * break anywhere by design; everything else must wrap at word boundaries, so a grid track that collapses
 * below its longest word shows up here even when nothing overflows horizontally.
 */
export async function midWordBreaks(page: Page) {
  return page.evaluate(() => {
    const breaks: string[] = [];
    const walker = document.createTreeWalker(document.querySelector("main")!, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const letter = /[\p{L}\p{N}]/u;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent ?? "";
      const parent = node.parentElement;
      if (!parent || !text.trim() || !parent.checkVisibility()) continue;
      if (parent.closest(".visually-hidden, .contact-link strong, .story-section__content--contact h2")) continue;
      // Vertical type (the scroll cue) advances per glyph along the block axis by design.
      if (getComputedStyle(parent).writingMode !== "horizontal-tb") continue;
      let previousTop: number | null = null;
      for (let index = 0; index < text.length; index += 1) {
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rect = range.getClientRects()[0];
        if (!rect) { previousTop = null; continue; }
        if (previousTop !== null && rect.top > previousTop + 2 && letter.test(text[index]) && letter.test(text[index - 1])) {
          breaks.push(`${text.slice(Math.max(0, index - 10), index)}|${text.slice(index, index + 10)}`);
        }
        previousTop = rect.top;
      }
    }
    return breaks;
  });
}

/** Every chapter link is painted inside the rail and the viewport, and the rail clears the other fixed controls. */
export async function chapterRailFit(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector(".chapter-nav")!;
    const box = nav.getBoundingClientRect();
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const hidden = Array.from(nav.querySelectorAll("a"))
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        return rect.top < box.top - 0.5 || rect.bottom > box.bottom + 0.5 || rect.top < 0 || rect.bottom > innerHeight;
      })
      .map((link) => link.textContent?.trim());
    const collisions = Array.from(document.querySelectorAll(".hud__identity, .hud__tools, .motion-control"))
      .filter((element) => element.checkVisibility() && intersects(box, element.getBoundingClientRect()))
      .map((element) => element.className);
    return { hidden, collisions, scrollable: nav.scrollHeight - nav.clientHeight > 1 };
  });
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
    // The criterion is "not entirely obscured": any usable band inside the reading window counts.
    // Full visibility of section tails is asserted separately.
    const required = 1;
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
