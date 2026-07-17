import { useEffect, useState } from "react";
import { chapters } from "../content/portfolio";
import { clamp01, experienceStore } from "../lib/experienceStore";

type ExperienceController = {
  activeChapter: number;
  progressPercent: number;
  reducedMotion: boolean;
};

export function useExperienceController(entered: boolean): ExperienceController {
  const [activeChapter, setActiveChapter] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    experienceStore.entered = entered;
  }, [entered]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    let frame = 0;
    let lastTime = performance.now();
    let activityUntil = 0;
    let lastChapter = -1;
    let lastPercent = -1;

    const applyCapabilities = () => {
      experienceStore.reducedMotion = motionQuery.matches;
      experienceStore.isMobile = mobileQuery.matches;
      experienceStore.quality = mobileQuery.matches ? "low" : experienceStore.quality;
      setReducedMotion(motionQuery.matches);
      schedule(0);
    };

    const readScroll = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      experienceStore.targetProgress = clamp01(window.scrollY / scrollable);
      schedule(240);
    };

    const readPointer = (event: PointerEvent) => {
      if (experienceStore.reducedMotion || event.pointerType === "touch") return;
      experienceStore.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      experienceStore.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
      schedule(320);
    };

    function schedule(activeForMilliseconds: number) {
      activityUntil = Math.max(activityUntil, performance.now() + activeForMilliseconds);
      if (frame || document.hidden || experienceStore.paused) return;
      lastTime = performance.now();
      frame = window.requestAnimationFrame(tick);
    }

    const readActiveChapter = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
      const viewportCenter = window.innerHeight * 0.5;
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      sections.forEach((section, index) => {
        const bounds = section.getBoundingClientRect();
        const distance = Math.abs(bounds.top + Math.min(bounds.height, window.innerHeight) * 0.5 - viewportCenter);
        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }
      });
      return nearest;
    };

    function tick(now: number) {
      frame = 0;
      if (document.hidden || experienceStore.paused) return;
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const difference = experienceStore.targetProgress - experienceStore.progress;
      experienceStore.progress = experienceStore.reducedMotion
        ? experienceStore.targetProgress
        : experienceStore.progress + difference * (1 - Math.exp(-5.2 * delta));

      const percent = Math.round(experienceStore.progress * 100);
      const chapter = Math.min(chapters.length - 1, readActiveChapter());

      if (percent !== lastPercent) {
        lastPercent = percent;
        setProgressPercent(percent);
      }

      if (chapter !== lastChapter) {
        lastChapter = chapter;
        setActiveChapter(chapter);
      }
      experienceStore.requestRender?.();

      const unsettled = Math.abs(difference) > 0.00015;
      if (unsettled || now < activityUntil) frame = window.requestAnimationFrame(tick);
    }

    const onVisibilityChange = () => {
      if (!document.hidden) schedule(0);
    };

    applyCapabilities();
    readScroll();
    motionQuery.addEventListener("change", applyCapabilities);
    mobileQuery.addEventListener("change", applyCapabilities);
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll, { passive: true });
    window.addEventListener("pointermove", readPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule(0);

    return () => {
      window.cancelAnimationFrame(frame);
      motionQuery.removeEventListener("change", applyCapabilities);
      mobileQuery.removeEventListener("change", applyCapabilities);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
      window.removeEventListener("pointermove", readPointer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return { activeChapter, progressPercent, reducedMotion };
}
