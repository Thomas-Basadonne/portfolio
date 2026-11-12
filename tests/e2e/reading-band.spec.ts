import { expect, test, type Page } from "@playwright/test";
import { requireWebGL } from "./webgl";

/*
 * MOB-01 (#49), direction A «strumento in tasca». Portrait phones: the stage band keeps its layout height (the text
 * never moves) and narrows to the reading band while a reading chapter is read (--band-cut, a clip from the bottom).
 * The band is full in the hero and in every change of chapter; at the finale it stops above the contact block, never
 * above the reading band. Work is full over the empty spaces around its heading and narrows over the case index.
 * Everything here is geometry, not vision. The scene chunk is held (as in the hero tests), so the layout is the same
 * on engines without WebGL.
 */

const PORTRAIT = [{ width: 375, height: 667 }, { width: 390, height: 844 }];
const READING = ["about", "capabilities", "experience"] as const;

async function bypassEntry(page: Page) {
  await page.addInitScript(() => window.sessionStorage.setItem("tb:entry-seen", "1"));
}

async function holdScene(page: Page) {
  await page.route(/ExperienceCanvas-.*\.js/, (route) =>
    route.fulfill({ contentType: "text/javascript", body: "await new Promise(() => {});" }));
}

async function open(page: Page, viewport: { width: number; height: number }, reduced = false, lang?: "en" | "it") {
  await holdScene(page);
  await bypassEntry(page);
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(viewport);
  await page.goto(lang ? `/?lang=${lang}` : "/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".scene-staged")).toHaveAttribute("data-scene-layout", "");
}

/** Scroll so that the section's top sits `offset` px below the page top (instant, like a deep link). */
async function scrollToSection(page: Page, id: string, offset = 120) {
  await page.evaluate(([id, offset]) => {
    const section = document.getElementById(id)!;
    window.scrollTo({ top: Math.max(0, section.getBoundingClientRect().top + window.scrollY - offset), behavior: "instant" });
  }, [id, offset] as const);
}

/**
 * Waits until the band's cut stops changing (the spring settles; reduced motion settles at once). Six equal readings
 * in a row make a stable state; if the cut never settles the measurement is refused, not taken on a moving band.
 */
async function settleBand(page: Page) {
  let last = "";
  let stable = 0;
  for (let attempt = 0; attempt < 120 && stable < 6; attempt += 1) {
    const value = await page.evaluate(() => new Promise<string>((resolve) => requestAnimationFrame(() =>
      resolve(getComputedStyle(document.querySelector<HTMLElement>("[data-scene-stage]")!).getPropertyValue("--band-cut")))));
    stable = value === last ? stable + 1 : 0;
    last = value;
    await page.waitForTimeout(50);
  }
  if (stable < 6) throw new Error(`band cut kept changing (last ${JSON.stringify(last)}): not a stable state`);
  return last;
}

const bandGeometry = (page: Page) => page.evaluate(() => {
  const stage = document.querySelector<HTMLElement>("[data-scene-stage]")!;
  const box = stage.getBoundingClientRect();
  const cut = parseFloat(getComputedStyle(stage).getPropertyValue("--band-cut")) || 0;
  const dock = document.querySelector(".chapter-nav")!.getBoundingClientRect();
  const visibleBottom = box.bottom - cut;
  return {
    cut,
    stageHeight: box.height,
    visibleBottom,
    readingShare: (dock.top - visibleBottom) / innerHeight,
  };
});

test("reading chapters leave at least 60% of the screen to the text at 375x667 and 390x844", async ({ page }) => {
  for (const viewport of PORTRAIT) {
    await open(page, viewport);
    for (const id of READING) {
      await scrollToSection(page, id);
      await settleBand(page);
      const geometry = await bandGeometry(page);
      expect(geometry.readingShare, `${viewport.width}x${viewport.height} ${id}`).toBeGreaterThanOrEqual(0.6);
    }
  }
});

test("the reading band narrows the stage without moving the text or resizing the canvas", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  const textTops = () => page.evaluate(() => Array.from(document.querySelectorAll("main p, main h2, main h3, main li"))
    .map((element) => Math.round(element.getBoundingClientRect().top + window.scrollY)));

  await scrollToSection(page, "about");
  await settleBand(page);
  const closed = await bandGeometry(page);
  const closedText = await textTops();
  expect(closed.cut).toBeGreaterThan(0);

  await scrollToSection(page, "identity", 0);
  await settleBand(page);
  const full = await bandGeometry(page);
  expect(full.cut).toBe(0);
  expect(await textTops()).toEqual(closedText);
  expect(full.stageHeight).toBe(closed.stageHeight);
});

/*
 * Layout-shift entries exist only in Chromium: elsewhere this check would pass without measuring anything. The
 * geometry test above (text tops and stage height unchanged) is the proof that runs on every engine.
 */
test("the band change causes no layout shift", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "layout-shift entries are Chromium-only; the geometry test covers the other engines");
  await open(page, { width: 390, height: 844 });
  await page.evaluate(() => {
    const shift: number[] = [];
    Reflect.set(window, "__shifts", shift);
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) shift.push(entry.startTime);
    }).observe({ type: "layout-shift", buffered: true });
  });
  await scrollToSection(page, "about");
  await settleBand(page);
  expect((await bandGeometry(page)).cut).toBeGreaterThan(0);
  await scrollToSection(page, "identity", 0);
  await settleBand(page);
  expect((await bandGeometry(page)).cut).toBe(0);
  const shifts = await page.evaluate(() => (Reflect.get(window, "__shifts") as number[]).length);
  expect(shifts, "layout shifts during the band change").toBe(0);
});

/*
 * The canvas is the one object of the stage: its box and its drawing buffer keep their size while the band narrows
 * and widens (the model is framed in the visible part instead). Needs a WebGL profile, like the other visual tests.
 */
test("the canvas keeps its size while the band narrows and widens", async ({ page }) => {
  await bypassEntry(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await requireWebGL(page);
  await expect(page.locator(".scene-staged")).toHaveAttribute("data-visual-ready", "", { timeout: 20_000 });
  const canvasSize = () => page.evaluate(() => {
    const shell = document.querySelector(".scene-stage .webgl-shell")!.getBoundingClientRect();
    const canvas = document.querySelector<HTMLCanvasElement>(".webgl-shell canvas")!;
    return [shell.width, shell.height, canvas.width, canvas.height];
  });
  await scrollToSection(page, "identity", 0);
  await settleBand(page);
  const hero = await canvasSize();
  await scrollToSection(page, "about");
  await settleBand(page);
  expect((await bandGeometry(page)).cut).toBeGreaterThan(0);
  expect(await canvasSize()).toEqual(hero);
});

test("the hero keeps the full band", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  await scrollToSection(page, "identity", 0);
  await settleBand(page);
  expect((await bandGeometry(page)).cut).toBe(0);
});

/** Scrolls to the true end of the page: stops once the bottom is reached on two consecutive frames. */
async function scrollToEnd(page: Page) {
  let atEnd = 0;
  for (let attempt = 0; attempt < 40 && atEnd < 2; attempt += 1) {
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    atEnd = await page.evaluate((previous) => (Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1 ? previous + 1 : 0), atEnd);
  }
}

/*
 * Finale (direction A), the contract approved by Thomas on 12/11 (PR #74). On portrait phones the whole contact block
 * (kicker, title, paragraph, links, footer) does not fit between the header and the dock, so the contract is:
 * (a) at max scroll every contact link sits fully between the band's visible bottom and the dock top;
 * (b) the kicker, the title and the paragraph are each fully readable at SOME step of the scroll into the finale:
 *     fully below the visible band bottom and fully above the dock top;
 * (c) they are never under the WIDENED band: at every step where the band is wider than the reading band, no rect of
 *     kicker, title, paragraph or links meets the widened zone (between the reading band bottom and the visible band
 *     bottom). Text passing under the reading band is normal reading and allowed.
 * (b) and (c) are swept from the Work→Contact boundary to max scroll in steps of at most 1/8 viewport, every step
 * settled. The band stop is measured, never above the reading band (readingBand.ts).
 */
const FINALE = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 414, height: 736 },
  { width: 430, height: 932 },
] as const;

async function openFinale(page: Page, viewport: { width: number; height: number }, lang: "en" | "it") {
  await open(page, viewport, false, lang);
  await scrollToEnd(page);
  await settleBand(page);
}

type Box = { top: number; bottom: number };
type FinaleStep = {
  scroll: number;
  full: number;
  read: number;
  /** Visible bottom of the band (its clip removed). */
  bandBottom: number;
  /** Bottom of the reading band (the part that is always visible). */
  readingBottom: number;
  dockTop: number;
  kicker: Box;
  title: Box;
  paragraph: Box;
  links: Box[];
};

/** Visible band bottom, reading band bottom, dock top and the rects of the contact block, at the current scroll. */
const finaleStep = (page: Page) => page.evaluate(() => {
  const stage = document.querySelector<HTMLElement>("[data-scene-stage]")!;
  const box = stage.getBoundingClientRect();
  const cut = parseFloat(getComputedStyle(stage).getPropertyValue("--band-cut")) || 0;
  const read = Math.min(box.height, parseFloat(getComputedStyle(stage, "::before").height) || 0);
  const rect = (selector: string) => {
    const element = document.querySelector(selector)!.getBoundingClientRect();
    return { top: element.top, bottom: element.bottom };
  };
  return {
    scroll: window.scrollY,
    full: box.height,
    read,
    bandBottom: box.bottom - cut,
    readingBottom: box.top + read,
    dockTop: rect(".chapter-nav").top,
    kicker: rect("#contact .chapter-kicker"),
    title: rect("#contact h2"),
    paragraph: rect("#contact .story-section__content > p"),
    links: Array.from(document.querySelectorAll(".contact-link")).map((link) => {
      const element = link.getBoundingClientRect();
      return { top: element.top, bottom: element.bottom };
    }),
  } satisfies FinaleStep;
});

/** Sweeps from the Work→Contact boundary to max scroll in steps of at most 1/8 viewport; every step is settled. */
async function sweepFinale(page: Page, viewport: { height: number }) {
  const step = Math.floor(viewport.height / 8);
  const start = await page.evaluate(() => Math.max(0, document.getElementById("contact")!.getBoundingClientRect().top + window.scrollY - window.innerHeight));
  const max = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  const positions: number[] = [];
  for (let y = start; y < max; y += step) positions.push(y);
  const samples: FinaleStep[] = [];
  for (const y of positions) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await settleBand(page);
    samples.push(await finaleStep(page));
  }
  await scrollToEnd(page);
  await settleBand(page);
  samples.push(await finaleStep(page));
  return samples;
}

/** Fully between the visible band bottom and the dock top. */
const fullyReadable = (box: Box, step: FinaleStep) => box.top >= step.bandBottom - 0.5 && box.bottom <= step.dockTop + 0.5;

/** Px of a box inside the widened zone: from the reading band bottom down to the visible band bottom. */
const widenedOverlap = (box: Box, step: FinaleStep) =>
  Math.max(0, Math.min(box.bottom, step.bandBottom) - Math.max(box.top, step.readingBottom));

for (const lang of ["en", "it"] as const) {
  for (const viewport of FINALE) {
    const label = `${lang} ${viewport.width}x${viewport.height}`;

    test(`finale ${label}: every contact link sits between the band and the dock`, async ({ page }) => {
      await openFinale(page, viewport, lang);
      const geometry = await finaleStep(page);
      expect(geometry.links.length, `${label} contact links`).toBe(3);
      geometry.links.forEach((link, index) => {
        expect(link.top, `${label} link ${index + 1} under the band`).toBeGreaterThanOrEqual(geometry.bandBottom - 0.5);
        expect(link.bottom, `${label} link ${index + 1} under the dock`).toBeLessThanOrEqual(geometry.dockTop + 0.5);
      });
      const footerBottom = await page.evaluate(() => document.querySelector(".site-footer")!.getBoundingClientRect().bottom);
      expect(footerBottom, `${label} footer under the dock`).toBeLessThanOrEqual(geometry.dockTop + 0.5);
    });

    test(`finale ${label}: kicker, title and paragraph each readable at some step (b); no contact text under the widened band (c)`, async ({ page }) => {
      await open(page, viewport, false, lang);
      const samples = await sweepFinale(page, viewport);
      const first = (key: "kicker" | "title" | "paragraph") => samples.findIndex((step) => fullyReadable(step[key], step));
      const widened = samples.filter((step) => step.bandBottom > step.readingBottom + 0.5);
      const worst = samples.flatMap((step) => [step.kicker, step.title, step.paragraph, ...step.links]
        .map((box) => ({ scroll: step.scroll, px: widenedOverlap(box, step) })))
        .reduce((a, b) => (b.px > a.px ? b : a));
      const at = (key: "kicker" | "title" | "paragraph") => {
        const index = first(key);
        return index < 0 ? null : { scroll: samples[index].scroll, step: index };
      };
      console.log("finale-evidence", JSON.stringify({
        label,
        steps: samples.length,
        fullyVisible: { kicker: at("kicker"), title: at("title"), paragraph: at("paragraph") },
        widenedSteps: widened.length,
        bandFull: Math.round(samples[0].full),
        bandRead: Math.round(samples[0].read),
        maxCutPx: Math.round(Math.max(...samples.map((step) => step.bandBottom - step.readingBottom))),
        maxWidenedOverlapPx: Number(worst.px.toFixed(2)),
        worstScroll: worst.scroll,
        maxScroll: samples[samples.length - 1].scroll,
      }));

      for (const key of ["kicker", "title", "paragraph"] as const) {
        expect(first(key), `${label} ${key} never fully between the band and the dock in ${samples.length} steps`).toBeGreaterThanOrEqual(0);
      }
      // A widened step must exist wherever the reading band is shorter than the full band, or (c) would pass vacuously.
      if (samples.some((step) => step.full > step.read + 0.5)) {
        expect(widened.length, `${label} the sweep never saw the band widened at the finale`).toBeGreaterThan(0);
      }
      expect(worst.px, `${label} contact text under the widened band at scroll ${worst.scroll}`).toBeLessThanOrEqual(0.5);
    });
  }
}

test("the finale paragraph clears the band on a tall phone, where the band stops at the reading band", async ({ page }) => {
  for (const lang of ["en", "it"] as const) {
    await openFinale(page, { width: 430, height: 932 }, lang);
    const geometry = await finaleStep(page);
    const label = `${lang} 430x932`;
    expect(geometry.bandBottom, `${label} band above the paragraph`).toBeLessThanOrEqual(geometry.paragraph.top + 0.5);
    expect(geometry.paragraph.bottom, `${label} paragraph above the dock`).toBeLessThanOrEqual(geometry.dockTop + 0.5);
    expect(geometry.bandBottom, `${label} band never above the reading band`).toBeGreaterThanOrEqual(geometry.readingBottom - 0.5);
  }
});

/*
 * The full band at the start of Work is allowed only while its zone (between the reading band and the full band)
 * sits in the empty space before the heading. The sweep moves the start of Work through that window in small steps,
 * settled at each step, and asserts that no kicker, heading or intro paragraph is under the full band at any step.
 */
test("the full band never covers the intro of Work", async ({ page }) => {
  // Reduced motion lands each band change at once, so every step is a steady state and the sweep stays in budget.
  await open(page, { width: 390, height: 844 }, true);
  const workTop = await page.evaluate(() => document.getElementById("work")!.getBoundingClientRect().top + window.scrollY);
  let fullSteps = 0;
  for (let offset = 120; offset <= 360; offset += 8) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), workTop - offset);
    await settleBand(page);
    const sample = await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>("[data-scene-stage]")!;
      const box = stage.getBoundingClientRect();
      const cut = parseFloat(getComputedStyle(stage).getPropertyValue("--band-cut")) || 0;
      const read = parseFloat(getComputedStyle(stage, "::before").height) || 0;
      const zoneTop = Math.min(box.height, read);
      const zoneBottom = box.height;
      const under = Array.from(document.querySelectorAll("#work .chapter-kicker, #work .section-heading-row h2, #work .section-heading-row p"))
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.height > 0 && rect.top < zoneBottom && rect.bottom > zoneTop)
        .length;
      return { cut, under };
    });
    if (sample.cut === 0) {
      fullSteps += 1;
      expect(sample.under, `Work intro under the full band at offset ${offset}`).toBe(0);
    }
  }
  expect(fullSteps, "the sweep reaches the full band at the start of Work").toBeGreaterThan(0);
});

test("Work narrows over the case index", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  await page.evaluate(() => {
    const index = document.querySelector(".case-index")!.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: index - 260, behavior: "instant" });
  });
  await settleBand(page);
  expect((await bandGeometry(page)).cut, "over the case index").toBeGreaterThan(0);
});

test("a change of chapter widens the band only over the empty band between two chapters", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  const gap = await page.evaluate(() => {
    // Text boxes, not section children: a container's padding must not widen the empty band the test places itself in.
    const textBoxes = (id: string) => Array.from(document.getElementById(id)!.querySelectorAll("p, h2, h3, li, small, strong, .chapter-kicker"))
      .map((element) => element.getBoundingClientRect()).filter((box) => box.height > 0);
    const bottom = Math.max(...textBoxes("about").map((box) => box.bottom + window.scrollY));
    const top = Math.min(...textBoxes("capabilities").map((box) => box.top + window.scrollY));
    return { top: bottom, bottom: top };
  });
  const geometry = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>("[data-scene-stage]")!.getBoundingClientRect();
    return { full: stage.height, read: parseFloat(getComputedStyle(document.querySelector<HTMLElement>("[data-scene-stage]")!, "::before").height) };
  });
  // Zone of the full band below the reading band, placed in the middle of the empty band.
  const middle = (gap.top + gap.bottom) / 2;
  const scroll = middle - (geometry.read + geometry.full) / 2;
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scroll);
  await settleBand(page);
  expect((await bandGeometry(page)).cut, "in the empty band").toBe(0);
  const text = await page.evaluate((zone) => Array.from(document.querySelectorAll("main p, main h2, main h3, main li, main small, main strong"))
    .map((element) => element.getBoundingClientRect())
    .filter((box) => box.height > 0)
    .map((box) => ({ top: box.top + window.scrollY, bottom: box.bottom + window.scrollY }))
    .filter((box) => box.top < zone.bottom && box.bottom > zone.top).length, {
    top: scroll + geometry.read, bottom: scroll + geometry.full,
  });
  expect(text, "paragraphs under the widened band").toBe(0);
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scroll - 300);
  await settleBand(page);
  expect((await bandGeometry(page)).cut, "in the reading chapter").toBeGreaterThan(0);
});

test("reduced motion changes the band at once", async ({ page }) => {
  await open(page, { width: 390, height: 844 }, true);
  await scrollToSection(page, "identity", 0);
  await settleBand(page);
  await scrollToSection(page, "about");
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const cut = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector<HTMLElement>("[data-scene-stage]")!).getPropertyValue("--band-cut")));
  const expected = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>("[data-scene-stage]")!;
    return stage.getBoundingClientRect().height - parseFloat(getComputedStyle(stage, "::before").height);
  });
  expect(cut).toBeGreaterThan(0);
  expect(Math.abs(cut - expected)).toBeLessThanOrEqual(0.5);
});

test("the landscape layout keeps the band as it is", async ({ page }) => {
  await open(page, { width: 844, height: 390 });
  await scrollToSection(page, "about");
  await settleBand(page);
  expect((await bandGeometry(page)).cut).toBe(0);
});

/*
 * Rotating from portrait to landscape: the clip goes away at once (no spring), so the camera never frames the model in
 * a visible height that no longer has a clip. Two frames after the resize the cut must already be 0.
 */
test("rotating to landscape drops the band cut at once", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  await scrollToSection(page, "about");
  await settleBand(page);
  expect((await bandGeometry(page)).cut).toBeGreaterThan(0);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const cut = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector<HTMLElement>("[data-scene-stage]")!).getPropertyValue("--band-cut")) || 0);
  expect(cut, "band cut two frames after the rotation").toBe(0);
});
