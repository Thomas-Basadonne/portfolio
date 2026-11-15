import { expect, test, type Browser, type Page } from "@playwright/test";
import { requireWebGL } from "./webgl";

/*
 * SYS-03 (#80, finding SYS-02 of the #51 audit). On short portrait phones the pause control was laid out from the dock
 * clearance inside the stage band, so it rose under the HUD identity: 44x44 on paper, 55/121 points reachable at
 * 390x664 and taps on its centre landing on "TB". Contract: a real 44x44 slot inside the visible part of the stage,
 * clear of HUD, dock and reading text, whose centre and 11x11 inner grid hit the control, before every action (the
 * hit-test runs on the pre-event coordinates: Playwright may scroll while acting). Taps on phones with a coarse pointer
 * really emulated, clicks elsewhere, Enter and Space everywhere.
 */

const PHONES = [
  { width: 320, height: 568 }, { width: 375, height: 548 }, { width: 390, height: 664 }, { width: 414, height: 622 },
  { width: 390, height: 844 }, { width: 760, height: 430 },
];
/*
 * Short landscape phones (SYS-03b #85): the chapter rail fills the stage corner's lane (22/121 points reachable at
 * 667x375, 0/121 at 740x360), so in the whole branch (index.css: landscape, up to 760x500) the control moves into the
 * HUD tools, 760x430 included. 812x375 is outside the branch and keeps its corner.
 */
const SHORT_LANDSCAPE = [PHONES[5], { width: 667, height: 375 }, { width: 740, height: 360 }];
PHONES.push(SHORT_LANDSCAPE[1], SHORT_LANDSCAPE[2], { width: 812, height: 375 });
const WIDE = [{ width: 1024, height: 768 }, { width: 1440, height: 900 }];
const SCENE_TIMEOUT = 20_000;
const NAMES = {
  en: { pause: "Pause animation", resume: "Resume animation" },
  it: { pause: "Pausa animazione", resume: "Riprendi animazione" },
} as const;

type Slot = { reachable: number; docked: boolean; centre: boolean; inside: boolean; clear: string[]; box: number[] };

/** Hit-test of the control as it stands now: centre and an 11x11 grid inside its box, plus its clearances. */
const slot = (page: Page) => page.locator(".motion-control").evaluate((control): Slot => {
  const box = control.getBoundingClientRect();
  const hits = (x: number, y: number) => Boolean(document.elementFromPoint(x, y)?.closest(".motion-control"));
  let reachable = 0;
  for (let i = 0; i < 11; i += 1) {
    for (let j = 0; j < 11; j += 1) {
      if (hits(box.left + 1 + (box.width - 2) * (i / 10), box.top + 1 + (box.height - 2) * (j / 10))) reachable += 1;
    }
  }
  const stage = document.querySelector<HTMLElement>("[data-scene-stage]")!;
  const stageBox = stage.getBoundingClientRect();
  const cut = parseFloat(getComputedStyle(stage).getPropertyValue("--band-cut")) || 0;
  // Docked in the HUD tools (short landscape, #85) the control is fixed chrome like a stage corner held fixed.
  const docked = Boolean(control.closest(".hud__tools"));
  const fixed = docked || getComputedStyle(control).position === "fixed";
  const visibleTop = fixed ? 0 : Math.max(0, stageBox.top);
  const visibleBottom = fixed ? innerHeight : Math.min(innerHeight, stageBox.bottom - cut);
  const inside = box.left >= 0 && box.right <= innerWidth && box.top >= visibleTop && box.bottom <= visibleBottom;
  const overlaps = (other: DOMRect) => other.width > 0 && other.height > 0
    && !(box.right <= other.left || box.left >= other.right || box.bottom <= other.top || box.top >= other.bottom);
  // Inside the portrait band the reading text scrolls beneath the opaque stage, so only the fixed corner can cover it.
  const text = "[data-chapter] h1, [data-chapter] h2, [data-chapter] h3, [data-chapter] p, [data-chapter] a, [data-chapter] button";
  // Docked, its own row is the one container it may overlap: the other tools in the row may not.
  const clear = [".hud__identity", docked ? ".hud__tools > *" : ".hud__tools", ".chapter-nav", ...(fixed ? [text] : [])]
    .flatMap((selector) => [...document.querySelectorAll(selector)]
      .filter((element) => !element.closest(".motion-control") && overlaps(element.getBoundingClientRect()))
      .map((element) => element.className || element.tagName));
  return {
    reachable,
    docked,
    centre: hits(box.left + box.width / 2, box.top + box.height / 2),
    inside,
    clear,
    box: [box.left, box.top, box.width, box.height].map((value) => Math.round(value * 10) / 10),
  };
});

async function settle(page: Page) {
  let last = "";
  let stable = 0;
  for (let attempt = 0; attempt < 80 && stable < 4; attempt += 1) {
    await page.waitForTimeout(60);
    const value = JSON.stringify(await slot(page));
    stable = value === last ? stable + 1 : 0;
    last = value;
  }
}

async function openStory(browser: Browser, viewport: { width: number; height: number }, locale: "en" | "it", phone: boolean) {
  const context = await browser.newContext({ viewport, hasTouch: phone });
  await context.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
  const page = await context.newPage();
  await page.goto(`/?lang=${locale}`);
  return { context, page };
}

const positions = [
  { name: "top", id: null },
  { name: "about", id: "about" },
  { name: "experience", id: "experience" },
] as const;

for (const locale of ["en", "it"] as const) {
  for (const viewport of [...PHONES, ...WIDE]) {
    const phone = PHONES.includes(viewport);
    test(`the pause control is a real 44x44 target (${locale} ${viewport.width}x${viewport.height})`, async ({ browser }) => {
      test.setTimeout(120_000);
      const { context, page } = await openStory(browser, viewport, locale, phone);
      try {
        await requireWebGL(page);
        if (phone) expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
        const names = NAMES[locale];
        await expect(page.getByRole("button", { name: names.pause, exact: true })).toBeVisible({ timeout: SCENE_TIMEOUT });
        await page.evaluate(() => document.fonts.ready);
        const failures: string[] = [];
        let paused = false;
        for (const position of positions) {
          if (position.id) {
            await page.evaluate((id) => {
              const section = document.getElementById(id)!;
              window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY + 40, behavior: "instant" });
            }, position.id);
          }
          await settle(page);
          const state = await slot(page);
          const label = `${position.name}`;
          if (state.box[2] < 44 || state.box[3] < 44) failures.push(`${label}: box ${state.box}`);
          if (!state.centre) failures.push(`${label}: centre misses the control ${state.box}`);
          if (state.reachable !== 121) failures.push(`${label}: ${state.reachable}/121 points reach the control ${state.box}`);
          if (!state.inside) failures.push(`${label}: not inside the visible region ${state.box}`);
          if (state.clear.length) failures.push(`${label}: overlaps ${state.clear.join(", ")}`);
          if (state.docked !== SHORT_LANDSCAPE.includes(viewport)) failures.push(`${label}: docked in the HUD = ${state.docked}`);
          if (!state.centre) continue;

          // Pointer activation on the hit-tested centre (pre-event coordinates), no force.
          const [x, y] = [state.box[0] + state.box[2] / 2, state.box[1] + state.box[3] / 2];
          if (phone) await page.touchscreen.tap(x, y);
          else await page.mouse.click(x, y);
          paused = !paused;
          const expected = paused ? names.resume : names.pause;
          await expect(page.locator(".motion-control")).toHaveAttribute("aria-label", expected);
        }
        // Keyboard: Enter and Space toggle the same state.
        const control = page.locator(".motion-control");
        await control.focus();
        for (const key of ["Enter", "Space"]) {
          await page.keyboard.press(key);
          paused = !paused;
          await expect(control).toHaveAttribute("aria-label", paused ? names.resume : names.pause);
        }
        // The state survives a resize and a change of language.
        await page.keyboard.press("Enter");
        paused = !paused;
        await page.setViewportSize({ width: viewport.height, height: viewport.width });
        await page.setViewportSize(viewport);
        const other = locale === "en" ? "it" : "en";
        await page.getByRole("button", { name: other === "it" ? "IT — Italiano" : "EN — English", exact: true }).click();
        await expect(control).toHaveAttribute("aria-label", paused ? NAMES[other].resume : NAMES[other].pause);
        expect(failures).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
}
