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
    let lastChapter = -1;
    let lastPercent = -1;

    const applyCapabilities = () => {
      experienceStore.reducedMotion = motionQuery.matches;
      experienceStore.isMobile = mobileQuery.matches;
      experienceStore.quality = mobileQuery.matches ? "low" : experienceStore.quality;
      setReducedMotion(motionQuery.matches);
    };

    const readScroll = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      experienceStore.targetProgress = clamp01(window.scrollY / scrollable);
    };

    const readPointer = (event: PointerEvent) => {
      if (experienceStore.reducedMotion || event.pointerType === "touch") return;
      experienceStore.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      experienceStore.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
    };

    const tick = () => {
      const difference = experienceStore.targetProgress - experienceStore.progress;
      experienceStore.progress = experienceStore.reducedMotion
        ? experienceStore.targetProgress
        : experienceStore.progress + difference * 0.075;

      const percent = Math.round(experienceStore.progress * 100);
      const chapter = Math.min(
        chapters.length - 1,
        Math.max(0, Math.round(experienceStore.progress * (chapters.length - 1))),
      );

      document.documentElement.style.setProperty("--scroll-progress", String(experienceStore.progress));

      if (percent !== lastPercent) {
        lastPercent = percent;
        setProgressPercent(percent);
      }

      if (chapter !== lastChapter) {
        lastChapter = chapter;
        setActiveChapter(chapter);
      }

      frame = window.requestAnimationFrame(tick);
    };

    applyCapabilities();
    readScroll();
    motionQuery.addEventListener("change", applyCapabilities);
    mobileQuery.addEventListener("change", applyCapabilities);
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll, { passive: true });
    window.addEventListener("pointermove", readPointer, { passive: true });
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      motionQuery.removeEventListener("change", applyCapabilities);
      mobileQuery.removeEventListener("change", applyCapabilities);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
      window.removeEventListener("pointermove", readPointer);
    };
  }, []);

  return { activeChapter, progressPercent, reducedMotion };
}
