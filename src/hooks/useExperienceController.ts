import { useEffect, useRef, useState } from "react";
import { clamp01, experienceStore } from "../lib/experienceStore";
import { motionCadence } from "../lib/motionPolicy";
import { bandCutPx, bandOpenTarget, type BandGap } from "../lib/readingBand";

type ControllerOptions = { ready: boolean; drawerOpen: boolean; userPaused: boolean; layoutKey: string };
type ExperienceController = {
  activeChapter: number;
  progressPercent: number;
  reducedMotion: boolean;
  motionAvailable: boolean;
};

/** Where the reader is: the section crossing this fraction of the viewport is the chapter being read. */
const READING_LINE = 0.42;
/** Spring rate of the story position (1/s): scroll steps become continuous motion with a little weight. */
const STORY_RATE = 4.2;
const SETTLED = 0.0004;
/** Layout with the model beside the text (must match scene-stages.css). */
export const SIDE_BY_SIDE_QUERY = "(min-width: 1081px), (orientation: landscape) and (min-width: 600px)";
/** Portrait layout with the stage band over the reading flow: the only one where the band narrows. */
export const PORTRAIT_BAND_QUERY = "(max-width: 1080px) and (orientation: portrait)";
/** Column the model takes in each chapter (0 = left, 1 = right); the text takes the other one. */
export const MODEL_SIDE = [1, 0, 1, 0, 1, 0] as const;
/**
 * A side change is centred on the empty band between two chapters' texts (half a viewport tall in the
 * side-by-side layout) crossing the middle of the viewport, and spans CROSSING_TRAVEL of the viewport.
 */
const CROSSING_TRAVEL = 0.5;

/**
 * Single application scheduler for the one persistent stage.
 * The story position is continuous over the whole page (chapter index + progress through it) and follows the
 * scroll through a spring; the scene renders at the policy cadence while anything moves, then idles.
 */
export function useExperienceController(entered: boolean, options: ControllerOptions): ExperienceController {
  const [activeChapter, setActiveChapter] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionAvailable, setMotionAvailable] = useState(false);
  const gates = useRef({ entered, ...options });
  gates.current = { entered, ...options };
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const forcedQuery = window.matchMedia("(forced-colors: active)");
    const sideQuery = window.matchMedia(SIDE_BY_SIDE_QUERY);
    const portraitQuery = window.matchMedia(PORTRAIT_BAND_QUERY);
    const stage = document.querySelector<HTMLElement>("[data-scene-stage]");
    let starts: number[] = [];
    let crossings: number[] = [];
    // Band geometry in document coordinates (the band itself is sticky at the top of the viewport).
    let band = { full: 0, read: 0, caseTop: Number.POSITIVE_INFINITY, gaps: [] as BandGap[] };
    let bandTarget = 1;
    let bandCut = 0;
    let sideTarget: number = MODEL_SIDE[0];
    let layoutDirty = true;
    let storyTarget = 0;
    let frame = 0;
    let lastTime = performance.now();
    let lastRender = Number.NEGATIVE_INFINITY;
    let activityUntil = 0;
    let dirty = true;
    let lastChapter = -1;
    let lastPercent = -1;
    let alive = true;

    const readingBlocked = () => !gates.current.entered || gates.current.drawerOpen || document.hidden;
    const visualBlocked = () => readingBlocked() || !gates.current.ready || forcedQuery.matches;
    const publishGates = () => {
      experienceStore.entered = gates.current.entered;
      experienceStore.paused = visualBlocked();
      experienceStore.userPaused = gates.current.userPaused;
    };

    function schedule(activeForMilliseconds = 0) {
      publishGates();
      dirty = true;
      activityUntil = Math.max(activityUntil, performance.now() + activeForMilliseconds);
      if (readingBlocked()) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        lastRender = Number.NEGATIVE_INFINITY;
        return;
      }
      if (frame) return;
      lastTime = performance.now();
      frame = window.requestAnimationFrame(tick);
    }
    const invalidate = () => { layoutDirty = true; schedule(240); };
    wake.current = invalidate;

    /** Scroll offsets where each chapter starts being read; the last chapter ends at the end of the document. */
    const measure = () => {
      const readingInset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const line = Math.max(innerHeight * READING_LINE, readingInset + 1);
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
      starts = sections.map((section) => Math.max(0, section.getBoundingClientRect().top + scrollY - line));
      starts[0] = 0;
      // Where the model changes side: the middle of the empty band between one chapter's text and the next.
      const extent = (section: HTMLElement) => {
        let top = Number.POSITIVE_INFINITY, bottom = Number.NEGATIVE_INFINITY;
        for (const child of Array.from(section.children)) {
          const box = child.getBoundingClientRect();
          if (box.height === 0) continue;
          top = Math.min(top, box.top + scrollY);
          bottom = Math.max(bottom, box.bottom + scrollY);
        }
        const box = section.getBoundingClientRect();
        return Number.isFinite(top) ? [top, bottom] : [box.top + scrollY, box.bottom + scrollY];
      };
      crossings = sections.map((section, index) =>
        index === 0 ? 0 : (extent(sections[index - 1])[1] + extent(section)[0]) / 2);
      // The empty band between two chapters' text: the reading band may widen only while it sits under the full band.
      band.gaps = sections.slice(1).map((section, index) => ({
        top: extent(sections[index])[1], bottom: extent(section)[0],
      }));
      const caseIndex = document.querySelector<HTMLElement>(".case-index");
      band.caseTop = caseIndex ? caseIndex.getBoundingClientRect().top + scrollY : Number.POSITIVE_INFINITY;
      band.full = stage?.getBoundingClientRect().height ?? 0;
      band.read = stage ? parseFloat(getComputedStyle(stage, "::before").height) || 0 : 0;
      layoutDirty = false;
    };
    const readStory = () => {
      if (layoutDirty) measure();
      const end = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      let chapter = 0;
      for (let index = 0; index < starts.length; index += 1) if (starts[index] <= scrollY) chapter = index;
      const from = starts[chapter] ?? 0;
      const to = Math.max(from + 1, Math.min(end, starts[chapter + 1] ?? end));
      storyTarget = Math.min(starts.length - 0.0001, chapter + clamp01((scrollY - from) / (to - from)));
      bandTarget = bandOpenTarget({
        chapter: Math.floor(storyTarget),
        narrowable: portraitQuery.matches,
        zoneTop: Math.min(band.full, band.read),
        zoneBottom: band.full,
        gaps: band.gaps.map((gap) => ({ top: gap.top - scrollY, bottom: gap.bottom - scrollY })),
        caseIndexTop: band.caseTop - scrollY,
      });
      const travel = innerHeight * CROSSING_TRAVEL;
      const middle = scrollY + innerHeight / 2;
      sideTarget = MODEL_SIDE[0];
      for (let index = 1; index < crossings.length && index < MODEL_SIDE.length; index += 1) {
        const t = clamp01((middle - crossings[index]) / travel + 0.5);
        sideTarget += (MODEL_SIDE[index] - MODEL_SIDE[index - 1]) * t * t * (3 - 2 * t);
      }
      experienceStore.region = sideQuery.matches ? 0.5 : 1;
      if (!sideQuery.matches) sideTarget = 0.5;
      if (chapter !== lastChapter) { lastChapter = chapter; setActiveChapter(chapter); }
    };

    const applyCapabilities = () => {
      experienceStore.reducedMotion = motionQuery.matches;
      experienceStore.isMobile = mobileQuery.matches;
      if (mobileQuery.matches) experienceStore.quality = "low";
      setReducedMotion(motionQuery.matches);
      setMotionAvailable(!motionQuery.matches && !forcedQuery.matches);
      invalidate();
    };
    const readScroll = () => {
      experienceStore.targetProgress = clamp01(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
      schedule(240);
    };
    const readPointer = (event: PointerEvent) => {
      if (experienceStore.reducedMotion || gates.current.userPaused || event.pointerType === "touch") return;
      experienceStore.pointerX = (event.clientX / innerWidth) * 2 - 1;
      experienceStore.pointerY = -((event.clientY / innerHeight) * 2 - 1);
      schedule(320);
    };

    function tick(now: number) {
      frame = 0;
      publishGates();
      if (readingBlocked()) return;
      const delta = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      const difference = experienceStore.targetProgress - experienceStore.progress;
      experienceStore.progress = experienceStore.reducedMotion
        ? experienceStore.targetProgress
        : experienceStore.progress + difference * (1 - Math.exp(-5.2 * delta));
      const percent = Math.round(experienceStore.progress * 100);
      if (percent !== lastPercent) { lastPercent = percent; setProgressPercent(percent); }
      readStory();
      const story = experienceStore.story;
      experienceStore.story = experienceStore.reducedMotion || !Number.isFinite(story)
        ? storyTarget
        : story + (storyTarget - story) * (1 - Math.exp(-STORY_RATE * delta));
      const side = experienceStore.side;
      experienceStore.side = experienceStore.reducedMotion || !Number.isFinite(side)
        ? sideTarget
        : side + (sideTarget - side) * (1 - Math.exp(-STORY_RATE * delta));
      const sideMoving = Math.abs(sideTarget - experienceStore.side) > SETTLED;
      if (!sideMoving) experienceStore.side = sideTarget;
      const open = experienceStore.bandOpen;
      experienceStore.bandOpen = experienceStore.reducedMotion || !Number.isFinite(open)
        ? bandTarget
        : open + (bandTarget - open) * (1 - Math.exp(-STORY_RATE * delta));
      if (Math.abs(bandTarget - experienceStore.bandOpen) <= SETTLED) experienceStore.bandOpen = bandTarget;
      const bandMoving = experienceStore.bandOpen !== bandTarget;
      const cut = bandCutPx({ open: experienceStore.bandOpen, full: band.full, reading: band.read });
      if (cut !== bandCut && stage) {
        bandCut = cut;
        experienceStore.bandCut = cut;
        stage.style.setProperty("--band-cut", `${cut}px`);
      }
      const moving = Math.abs(storyTarget - experienceStore.story) > SETTLED || sideMoving || bandMoving;
      if (Math.abs(storyTarget - experienceStore.story) <= SETTLED) experienceStore.story = storyTarget;
      experienceStore.chapter = Math.floor(experienceStore.story);
      experienceStore.stageProgress = experienceStore.story - experienceStore.chapter;
      const unsettled = Math.abs(difference) > 0.00015 || moving;

      let cadence = 0;
      if (!visualBlocked()) {
        experienceStore.interacting = now < activityUntil || moving;
        cadence = motionCadence({
          ...gates.current, hidden: document.hidden, forcedColors: forcedQuery.matches,
          reducedMotion: motionQuery.matches, stageVisible: experienceStore.stageVisible,
          interacting: experienceStore.interacting, ambient: true, quality: experienceStore.quality,
        });
        // Motion time only advances while motion is allowed: no catch-up after pauses or hidden periods.
        if (cadence > 0) experienceStore.motionTime += delta;
        if (experienceStore.stageVisible && (dirty || moving || (cadence > 0 && now - lastRender >= 1000 / cadence - 1))) {
          dirty = false;
          lastRender = now;
          experienceStore.requestRender?.();
        }
      }
      if (unsettled || now < activityUntil || cadence > 0) frame = window.requestAnimationFrame(tick);
    }

    const visibility = new IntersectionObserver(([entry]) => {
      experienceStore.stageVisible = Boolean(entry?.isIntersecting);
      schedule();
    });
    if (stage) visibility.observe(stage);
    const resizeObserver = new ResizeObserver(invalidate);
    for (const node of document.querySelectorAll<HTMLElement>("[data-chapter]")) resizeObserver.observe(node);
    const mutations = new MutationObserver(invalidate);
    const main = document.getElementById("main-content");
    if (main) mutations.observe(main, { childList: true, subtree: true, characterData: true });
    const onFonts = () => { if (alive) invalidate(); };
    void document.fonts.ready.then(onFonts);
    document.fonts.addEventListener("loadingdone", onFonts);
    const onVisibilityChange = () => { readScroll(); };

    experienceStore.story = Number.NaN;
    experienceStore.side = Number.NaN;
    applyCapabilities();
    readScroll();
    motionQuery.addEventListener("change", applyCapabilities);
    mobileQuery.addEventListener("change", applyCapabilities);
    forcedQuery.addEventListener("change", applyCapabilities);
    sideQuery.addEventListener("change", invalidate);
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    window.addEventListener("pointermove", readPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      visibility.disconnect();
      resizeObserver.disconnect();
      mutations.disconnect();
      document.fonts.removeEventListener("loadingdone", onFonts);
      if (wake.current === invalidate) wake.current = () => {};
      motionQuery.removeEventListener("change", applyCapabilities);
      mobileQuery.removeEventListener("change", applyCapabilities);
      forcedQuery.removeEventListener("change", applyCapabilities);
      sideQuery.removeEventListener("change", invalidate);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("pointermove", readPointer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => { wake.current(); }, [entered, options.ready, options.drawerOpen, options.userPaused, options.layoutKey]);
  return { activeChapter, progressPercent, reducedMotion, motionAvailable };
}
