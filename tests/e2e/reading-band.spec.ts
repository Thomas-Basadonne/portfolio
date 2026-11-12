import { expect, test, type Page } from "@playwright/test";

/*
 * MOB-01 (#49), direction A «strumento in tasca». Portrait phones: the stage band keeps its layout height (the text
 * never moves) and narrows to the reading band while a reading chapter is read (--band-cut, a clip from the bottom).
 * The band is full in the hero, in the finale and in every change of chapter; Work is full at its start and narrows
 * over the case index. Everything here is geometry, not vision. The scene chunk is held (as in the hero tests), so
 * the layout is the same on engines without WebGL.
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

async function open(page: Page, viewport: { width: number; height: number }, reduced = false) {
  await holdScene(page);
  await bypassEntry(page);
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(viewport);
  await page.goto("/");
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

/** Waits until the band's cut stops changing (the spring settles; reduced motion settles at once). */
async function settleBand(page: Page) {
  let last = "";
  let stable = 0;
  for (let attempt = 0; attempt < 80 && stable < 6; attempt += 1) {
    const value = await page.evaluate(() => new Promise<string>((resolve) => requestAnimationFrame(() =>
      resolve(getComputedStyle(document.querySelector<HTMLElement>("[data-scene-stage]")!).getPropertyValue("--band-cut")))));
    stable = value === last ? stable + 1 : 0;
    last = value;
    await page.waitForTimeout(50);
  }
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
  await page.evaluate(() => {
    const shift: number[] = [];
    Reflect.set(window, "__shifts", shift);
    if (PerformanceObserver.supportedEntryTypes?.includes("layout-shift")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) shift.push(entry.startTime);
      }).observe({ type: "layout-shift", buffered: true });
    }
  });
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
  const available = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  });
  test.skip(!available, "This browser profile exposes no WebGL; the fallback path is covered separately.");
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

test("the hero keeps the full band and the finale too", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  await scrollToSection(page, "identity", 0);
  await settleBand(page);
  expect((await bandGeometry(page)).cut).toBe(0);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await settleBand(page);
  expect((await bandGeometry(page)).cut).toBe(0);
});

test("Work starts with the full band and narrows over the case index", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  await scrollToSection(page, "work", 120);
  await settleBand(page);
  expect((await bandGeometry(page)).cut, "work start").toBe(0);
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
    const boxes = (id: string) => Array.from(document.getElementById(id)!.children)
      .map((child) => child.getBoundingClientRect()).filter((box) => box.height > 0);
    const bottom = Math.max(...boxes("about").map((box) => box.bottom + window.scrollY));
    const top = Math.min(...boxes("capabilities").map((box) => box.top + window.scrollY));
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
