import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getContent, legacySectionIds, type CaseStudy } from "./content/portfolio";
import { CaseStudyDrawer } from "./components/CaseStudyDrawer";
import { CustomCursor } from "./components/CustomCursor";
import { EntrySequence } from "./components/EntrySequence";
import { Hud } from "./components/Hud";
import { MotionControl } from "./components/MotionControl";
import { PortfolioStory } from "./components/PortfolioStory";
import { VisualLayerBoundary } from "./components/VisualLayerBoundary";
import { useExperienceController } from "./hooks/useExperienceController";
import {
  experienceReducer,
  getInitialExperiencePhase,
  supportsWebGL,
} from "./lib/experienceState";
import { useLocale } from "./lib/locale";

const ExperienceCanvas = lazy(() =>
  import("./experience/ExperienceCanvas").then((module) => ({ default: module.ExperienceCanvas })),
);

// How far the page must move from a deep-link landing before it counts as the reader scrolling away.
const READER_SCROLL = 48;

export default function App() {
  const [phase, dispatch] = useReducer(
    experienceReducer,
    undefined,
    getInitialExperiencePhase,
  );
  const { locale, setLocale } = useLocale();
  const content = getContent(locale);
  const [mountCanvas, setMountCanvas] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [stageNode, setStageNode] = useState<HTMLDivElement | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const selectedCase = content.caseStudies.find((entry) => entry.id === selectedCaseId) ?? null;
  const siteRef = useRef<HTMLDivElement>(null);
  const caseTriggerRef = useRef<HTMLElement | null>(null);
  const entered = phase !== "entry";
  const { activeChapter, progressPercent, reducedMotion, motionAvailable } = useExperienceController(entered, {
    ready: phase === "ready", drawerOpen: selectedCase !== null, userPaused, layoutKey: locale,
  });
  const selectCase = useCallback((caseStudy: CaseStudy) => {
    caseTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedCaseId(caseStudy.id);
  }, []);
  const closeCase = useCallback(() => {
    const trigger = caseTriggerRef.current;
    setSelectedCaseId(null);
    window.requestAnimationFrame(() => {
      trigger?.focus();
      caseTriggerRef.current = null;
    });
  }, []);
  const visualFailed = useCallback(() => dispatch({ type: "CANVAS_FAILED" }), []);
  const visualReady = useCallback(() => dispatch({ type: "CANVAS_READY" }), []);

  const enter = useCallback(() => {
    window.sessionStorage.setItem("tb:entry-seen", "1");
    dispatch({ type: "ENTER" });
  }, []);

  const focusMain = useCallback(() => {
    enter();
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#main-content")?.focus({ preventScroll: true });
    });
  }, [enter]);



  /*
   * A deep link lands on its chapter, and the landing is redone when the scene changes phase, because the staged and
   * fallback layouts put the chapter elsewhere. Only while the reader is still there: once they scroll away, a redo
   * pulled them back to the chapter start (on production: /#work, scroll to 5515px, scene ready, back at 4069px).
   * Browser scroll anchoring stays off until then: on the layout change it moves the page by hundreds of pixels
   * (WebKit: 820-900px when the scene fails), which would read as the reader leaving and skip the redo.
   */
  const deepLink = useRef<{ top: number; done: boolean } | null>(null);
  useEffect(() => {
    if (!entered || window.location.hash.length < 2) return;
    const requestedId = decodeURIComponent(window.location.hash.slice(1));
    const targetId = legacySectionIds[requestedId] ?? requestedId;
    if (targetId !== requestedId) {
      const url = new URL(window.location.href);
      url.hash = targetId;
      window.history.replaceState(window.history.state, "", url);
    }
    if (deepLink.current?.done) return;
    const root = document.documentElement;
    root.style.setProperty("overflow-anchor", "none");
    const frame = window.requestAnimationFrame(() => {
      if (deepLink.current?.done) return;
      // Instant, like the browser's own landing on a hash: a smooth scroll would still be moving when recorded.
      document.getElementById(targetId)?.scrollIntoView({ behavior: "instant" });
      // Once the scene has settled this layout is the last one to follow, and anchoring can come back.
      const settled = phase !== "loading";
      deepLink.current = { top: window.scrollY, done: settled };
      if (settled) root.style.removeProperty("overflow-anchor");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [entered, phase]);

  useEffect(() => {
    if (!entered) return;
    const onScroll = () => {
      const landing = deepLink.current;
      // Engines still nudge the landing by a few pixels on their own (Firefox: 10px while the scene loads).
      if (!landing || landing.done || Math.abs(window.scrollY - landing.top) <= READER_SCROLL) return;
      landing.done = true;
      document.documentElement.style.removeProperty("overflow-anchor");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [entered]);

  useEffect(() => {
    if (!entered || phase === "failed" || mountCanvas) return;
    if (!supportsWebGL()) {
      visualFailed();
      return;
    }

    const requestIdle = Reflect.get(window, "requestIdleCallback") as
      | typeof window.requestIdleCallback
      | undefined;
    const idleId = requestIdle
      ? requestIdle(() => setMountCanvas(true), { timeout: 450 })
      : window.setTimeout(() => setMountCanvas(true), 120);

    return () => {
      if (requestIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, [entered, mountCanvas, phase, visualFailed]);

  const backgroundBlocked = !entered || selectedCase !== null;
  const { ui } = content;

  return (
    <>
      <a className="skip-link" href="#main-content" onClick={focusMain}>
        {ui.skipLink}
      </a>
      <EntrySequence
        entered={entered}
        reducedMotion={reducedMotion}
        onEnter={enter}
        content={content}
        locale={locale}
        onLocaleChange={setLocale}
      />
      <div
        ref={siteRef}
        className="site-shell scene-staged"
        data-scene-layout={phase !== "failed" ? "" : undefined}
        data-visual-ready={phase === "ready" ? "" : undefined}
        inert={backgroundBlocked || undefined}
        aria-hidden={backgroundBlocked}
      >
        {mountCanvas && phase !== "failed" && stageNode ? createPortal(
          <VisualLayerBoundary onFailure={visualFailed}>
            <Suspense fallback={null}>
              <ExperienceCanvas
                onReady={visualReady}
                onFailure={visualFailed}
              />
            </Suspense>
          </VisualLayerBoundary>,
          stageNode,
        ) : (
          <div className="webgl-fallback" aria-hidden="true" />
        )}
        <div className="paper-grain" aria-hidden="true" />
        <Hud
          activeChapter={activeChapter}
          progressPercent={progressPercent}
          content={content}
          locale={locale}
          onLocaleChange={setLocale}
        />
        {phase === "ready" && motionAvailable && stageNode && createPortal(
          <MotionControl locale={locale} paused={userPaused} onToggle={() => setUserPaused((paused) => !paused)} />,
          stageNode,
        )}
        <PortfolioStory content={content} onSelectCase={selectCase} stageRef={setStageNode} />
      </div>

      {entered && phase === "loading" && (
        <p className="visual-status visually-hidden mono-label" role="status">
          {ui.visualLoading}
        </p>
      )}
      {phase === "failed" && (
        <div className="visual-status visual-status--failed" role="status">
          <span className="mono-label">{ui.visualFailed}</span>
          <button type="button" onClick={() => window.location.reload()}>
            {ui.visualRetry}
          </button>
        </div>
      )}
      <CaseStudyDrawer caseStudy={selectedCase} ui={ui} onClose={closeCase} />
      <CustomCursor reducedMotion={reducedMotion} />
    </>
  );
}
