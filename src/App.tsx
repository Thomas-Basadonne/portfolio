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
  webglRenderer,
} from "./lib/experienceState";
import { useLocale } from "./lib/locale";
import { gateMode, type GateMode } from "./lib/gatePolicy";
import { finishBoot, reachBoot, startBoot } from "./lib/bootLoader";

const ExperienceCanvas = lazy(() =>
  import("./experience/ExperienceCanvas").then((module) => ({ default: module.ExperienceCanvas })),
);

// How far the page must move from a deep-link landing before it counts as the reader scrolling away.
const READER_SCROLL = 48;

/**
 * Calls `then` once the gate has been painted: the largest-paint entry for an element of the gate (its h2). Capped at
 * GATE_PAINT_WAIT_MS, which is also the whole wait where no entry comes: the gate is not the largest paint on phones
 * (the loader's name is larger), and WebKit has no such entry. Returns a cancel.
 */
const GATE_PAINT_WAIT_MS = 500;
function afterGatePaint(then: () => void) {
  let observer: PerformanceObserver | undefined;
  const stop = () => {
    window.clearTimeout(timer);
    observer?.disconnect();
  };
  const finish = () => {
    stop();
    then();
  };
  const timer = window.setTimeout(finish, GATE_PAINT_WAIT_MS);
  if (PerformanceObserver.supportedEntryTypes?.includes("largest-contentful-paint")) {
    observer = new PerformanceObserver((list) => {
      if (list.getEntries().some((entry) => (entry as PerformanceEntry & { element?: Element | null }).element
        ?.closest(".entry-sequence"))) finish();
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
  }
  return stop;
}

function chooseGate() {
  const renderer = webglRenderer(true);
  const capabilities = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return gateMode({
    webgl: renderer !== null,
    renderer,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    forcedColors: window.matchMedia("(forced-colors: active)").matches,
    narrowViewport: window.matchMedia("(max-width: 760px)").matches,
    saveData: capabilities.connection?.saveData === true,
    deviceMemory: capabilities.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  });
}

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
  // Entry gate (#17): chosen after hydration (gatePolicy). Until then neither the poster nor the scene is requested:
  // a first render that assumed the poster fetched it on every visit. A visit that starts entered never sees a gate.
  const [gate, setGate] = useState<GateMode | null>(null);
  const [gateReady, setGateReady] = useState(false);
  const earlyReady = useRef(false);
  const earlyFailed = useRef(false);
  const arrivedAtGate = useRef(phase === "entry");
  useEffect(() => {
    // A visit that skips the gate has nothing to reveal: the boot loader goes at once.
    if (!arrivedAtGate.current) {
      finishBoot(true);
      return;
    }
    // Accelerated WebGL only: a software rasterizer gets the poster (gatePolicy).
    const mode = chooseGate();
    setGate(mode);
    startBoot(mode);
    void document.fonts?.ready.then(() => reachBoot("fonts"));
    // Chosen once on arrival: since 12/11 it no longer depends on the viewport, so a resize cannot invalidate it.
  }, []);
  const { activeChapter, progressPercent, reducedMotion, motionAvailable } = useExperienceController(entered, {
    ready: phase === "ready", drawerOpen: selectedCase !== null, userPaused, layoutKey: locale,
  });
  // The trigger is the element that was clicked, not document.activeElement: Safari (WebKit) does not focus
  // a button on mouse click, so the active element would be <body> and focus would be lost on close.
  const selectCase = useCallback((caseStudy: CaseStudy, trigger: HTMLElement) => {
    caseTriggerRef.current = trigger;
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
  const visualFailed = useCallback(() => {
    // Before entry the reducer keeps the gate: remember the failure, fall back to the poster, apply it on entry.
    earlyFailed.current = true;
    finishBoot();
    setGate("poster");
    setGateReady(false);
    dispatch({ type: "CANVAS_FAILED" });
  }, []);
  const visualReady = useCallback(() => {
    earlyReady.current = true;
    reachBoot("scene");
    setGateReady(true);
    dispatch({ type: "CANVAS_READY" });
  }, []);

  const enter = useCallback(() => {
    window.sessionStorage.setItem("tb:entry-seen", "1");
    // Controls that mount on entry arrive with the hero, not on top of the dissolving gate.
    document.body.classList.add("is-arriving");
    window.setTimeout(() => document.body.classList.remove("is-arriving"), 1300);
    dispatch({ type: "ENTER" });
    // A scene preloaded on the gate is already on screen: the story starts ready (or failed) at once.
    if (earlyFailed.current) dispatch({ type: "CANVAS_FAILED" });
    else if (earlyReady.current) dispatch({ type: "CANVAS_READY" });
  }, []);

  /** The landing on a deep link (see the effect below); a recalibration closes it. */
  const deepLink = useRef<{ top: number; done: boolean } | null>(null);

  // Recalibrate: back to the gate from the story. The page rewinds to the top first (the Compiler runs back through
  // the chapters with it), then the Compiler travels to the centre and the gate fades in over the hero.
  const recalibrate = useCallback(() => {
    // Back at the start: the chapter in the address goes, and with it any pending landing on it. Otherwise a scene
    // that settles during the rewind lands the page back on the chapter (seen under load: the gate over /#work).
    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(window.history.state, "", url);
    deepLink.current = { top: 0, done: true };
    document.documentElement.style.removeProperty("overflow-anchor");
    // A deep link, reload or returning visit has never chosen a gate. Choose it only when requested.
    if (gate === null) setGate(chooseGate());
    const back = () => dispatch({ type: "EXIT" });
    if (window.scrollY < 2) {
      back();
      return;
    }
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: instant ? "instant" : "smooth" });
    const started = performance.now();
    const wait = () => {
      if (window.scrollY < 2 || performance.now() - started > 1600) back();
      else window.requestAnimationFrame(wait);
    };
    window.requestAnimationFrame(wait);
  }, [gate]);

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
    const preload = !entered && gate === "interactive";
    if ((!entered && !preload) || phase === "failed" || mountCanvas) return;
    if (!supportsWebGL()) {
      visualFailed();
      return;
    }
    // The gate preloads only once it has been painted, then on idle. Its h2 is the largest paint; a request started
    // before that paint is on its path in Lighthouse's simulation (mobile LCP 3.5 s in 4 of 6 runs with a start on
    // `load` + idle: here `load` fires at ~30 ms, before the JS-rendered gate is painted), loader or not.

    const requestIdle = Reflect.get(window, "requestIdleCallback") as
      | typeof window.requestIdleCallback
      | undefined;
    const mount = () => {
      if (preload) void import("./experience/ExperienceCanvas").then(() => reachBoot("instrument"), () => undefined);
      setMountCanvas(true);
    };
    let idleId = 0;
    const schedule = () => {
      idleId = requestIdle ? requestIdle(mount, { timeout: 450 }) : window.setTimeout(mount, 120);
    };
    const stopWaiting = preload ? afterGatePaint(schedule) : (schedule(), () => undefined);

    return () => {
      stopWaiting();
      if (requestIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, [entered, gate, mountCanvas, phase, visualFailed]);

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
        gate={gate}
        gateReady={gateReady}
      />
      <div
        ref={siteRef}
        className="site-shell scene-staged"
        data-scene-layout={phase !== "failed" ? "" : undefined}
        data-visual-ready={phase === "ready" ? "" : undefined}
        data-gate-ready={gateReady && !entered ? "" : undefined}
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
          onRecalibrate={recalibrate}
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
