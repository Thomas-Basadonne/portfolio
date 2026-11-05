import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { getContent, legacySectionIds, type CaseStudy } from "./content/portfolio";
import { CaseStudyDrawer } from "./components/CaseStudyDrawer";
import { CustomCursor } from "./components/CustomCursor";
import { EntrySequence } from "./components/EntrySequence";
import { Hud } from "./components/Hud";
import { PortfolioStory } from "./components/PortfolioStory";
import { VisualLayerBoundary } from "./components/VisualLayerBoundary";
import { useExperienceController } from "./hooks/useExperienceController";
import { experienceStore } from "./lib/experienceStore";
import {
  experienceReducer,
  getInitialExperiencePhase,
  supportsWebGL,
} from "./lib/experienceState";
import { useLocale } from "./lib/locale";

const ExperienceCanvas = lazy(() =>
  import("./experience/ExperienceCanvas").then((module) => ({ default: module.ExperienceCanvas })),
);

export default function App() {
  const [phase, dispatch] = useReducer(
    experienceReducer,
    undefined,
    getInitialExperiencePhase,
  );
  const { locale, setLocale } = useLocale();
  const content = getContent(locale);
  const [mountCanvas, setMountCanvas] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const selectedCase = content.caseStudies.find((entry) => entry.id === selectedCaseId) ?? null;
  const siteRef = useRef<HTMLDivElement>(null);
  const caseTriggerRef = useRef<HTMLElement | null>(null);
  const entered = phase !== "entry";
  const { activeChapter, progressPercent, reducedMotion } = useExperienceController(entered);
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

  useEffect(() => {
    const blocked = !entered || selectedCase !== null;
    experienceStore.entered = entered;
    experienceStore.paused = blocked || document.hidden;
    if (!blocked) experienceStore.requestRender?.();
  }, [entered, selectedCase]);

  useEffect(() => {
    if (!entered || window.location.hash.length < 2) return;
    const requestedId = decodeURIComponent(window.location.hash.slice(1));
    const targetId = legacySectionIds[requestedId] ?? requestedId;
    if (targetId !== requestedId) {
      const url = new URL(window.location.href);
      url.hash = targetId;
      window.history.replaceState(window.history.state, "", url);
    }
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "auto" });
    });
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
        className="site-shell"
        inert={backgroundBlocked || undefined}
        aria-hidden={backgroundBlocked}
      >
        {mountCanvas && phase !== "failed" ? (
          <VisualLayerBoundary onFailure={visualFailed}>
            <Suspense fallback={<div className="webgl-fallback" aria-hidden="true" />}>
              <ExperienceCanvas
                onReady={visualReady}
                onFailure={visualFailed}
              />
            </Suspense>
          </VisualLayerBoundary>
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
        <PortfolioStory content={content} onSelectCase={selectCase} />
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
