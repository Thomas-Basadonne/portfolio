import { useEffect, useRef, useState } from "react";
import type { Locale, PortfolioContent } from "../content/portfolio";
import { experienceStore } from "../lib/experienceStore";
import { onBootFinished } from "../lib/bootLoader";
import { GATE_TIMING, shortestAngle, travelAt, type GateMode } from "../lib/gatePolicy";
import { LanguageSwitch } from "./LanguageSwitch";

type EntrySequenceProps = {
  entered: boolean;
  reducedMotion: boolean;
  onEnter: () => void;
  content: PortfolioContent;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  /** Which gate this visit gets (gatePolicy; null until chosen after hydration), and whether the preloaded Compiler
   * is on screen yet. */
  gate: GateMode | null;
  gateReady: boolean;
};

/** Drag response: radians per pixel, inertia time constant, pitch limit and pitch spring (1/s²). */
const YAW_PER_PX = 0.0085;
const PITCH_PER_PX = 0.0055;
const INERTIA_TAU = 0.32;
const PITCH_LIMIT = 0.55;
const PITCH_SPRING = 26;
const IDLE_FPS = 30;

/** The final place of the scene canvas (the stage probe), in viewport px: the hero end of the travel. */
function measureHero() {
  const rect = document.querySelector(".scene-stage__probe")?.getBoundingClientRect();
  if (rect && rect.width > 0 && rect.height > 0) {
    experienceStore.heroBox = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  }
}

/**
 * While the gate owns the Compiler the canvas covers the viewport (`body.is-gating`), so the travel is one canvas
 * with two framings. At either end the canvas changes box once, and is redrawn in the same frame.
 */
function setGating(on: boolean) {
  if (document.body.classList.contains("is-gating") === on) return;
  document.body.classList.toggle("is-gating", on);
  experienceStore.gating = on;
  measureHero();
  experienceStore.settleCanvas?.();
}

/**
 * The gate's own scheduler (the story controller is paused until entry): breathing at 30 fps, drag at display rate,
 * inertia after release, and the travel both ways — to the hero on entry, back to the gate on a recalibration.
 */
function useGateMotion(active: boolean, entered: boolean, reducedMotion: boolean,
  surface: React.RefObject<HTMLDivElement | null>, stage: React.RefObject<HTMLDivElement | null>) {
  const state = useRef({
    dragging: false, x: 0, y: 0, vx: 0, vy: 0, lastMove: 0, frame: 0, last: 0, lastRender: 0,
    /** +1 = to the hero, -1 = back to the gate, 0 = none. */
    direction: 0, startedAt: 0, run: () => {},
  });
  const reduced = useRef(reducedMotion);
  reduced.current = reducedMotion;

  useEffect(() => {
    if (!active) return;
    const s = state.current;
    const box = () => {
      const rect = stage.current?.getBoundingClientRect();
      // The box can be wider than tall (short phones): the Compiler fits its smaller side.
      if (rect) experienceStore.gateBox = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: Math.min(rect.width, rect.height) };
      measureHero();
      experienceStore.requestRender?.();
    };
    if (experienceStore.gate === 0 && !document.body.classList.contains("is-gating")) {
      experienceStore.gate = 1;
      setGating(true);
    }
    box();
    window.addEventListener("resize", box, { passive: true });

    const tick = (now: number) => {
      s.frame = 0;
      const dt = Math.min(0.05, Math.max(0, (now - (s.last || now)) / 1000));
      s.last = now;
      let moving = s.dragging;
      if (s.direction !== 0) {
        const travel = travelAt(now - s.startedAt, reduced.current);
        experienceStore.gate = s.direction > 0 ? 1 - travel : travel;
        measureHero();
        moving = true;
        if (travel === 1) {
          if (s.direction > 0) setGating(false);
          s.direction = 0;
        }
      } else if (experienceStore.gate === 1 && !s.dragging) {
        // Inertia on yaw, a damped spring on pitch: a short coast, then the Compiler settles upright.
        const decay = Math.exp(-dt / INERTIA_TAU);
        experienceStore.gateYaw += s.vx * dt;
        s.vx *= decay;
        const spring = -PITCH_SPRING * experienceStore.gatePitch - 2 * Math.sqrt(PITCH_SPRING) * s.vy;
        s.vy += spring * dt;
        experienceStore.gatePitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, experienceStore.gatePitch + s.vy * dt));
        moving = Math.abs(s.vx) > 0.01 || Math.abs(s.vy) > 0.01 || Math.abs(experienceStore.gatePitch) > 0.002;
      }
      const onGate = experienceStore.gate > 0;
      if (onGate && !experienceStore.reducedMotion) experienceStore.motionTime += dt;
      if (moving || (onGate && now - s.lastRender >= 1000 / IDLE_FPS - 1)) {
        s.lastRender = now;
        experienceStore.requestRender?.();
      }
      // At rest in the hero the story controller schedules the frames: the gate loop sleeps until it is needed.
      if (!onGate && s.direction === 0) { s.last = 0; return; }
      s.frame = window.requestAnimationFrame(tick);
    };
    s.run = () => { if (!s.frame) s.frame = window.requestAnimationFrame(tick); };
    s.run();

    const node = surface.current;
    const down = (event: PointerEvent) => {
      if (s.direction !== 0 || experienceStore.gate < 1 || event.button > 0) return;
      s.dragging = true;
      s.x = event.clientX; s.y = event.clientY; s.vx = 0; s.vy = 0; s.lastMove = event.timeStamp;
      node?.setPointerCapture(event.pointerId);
      s.run();
    };
    const move = (event: PointerEvent) => {
      if (!s.dragging) return;
      const dx = event.clientX - s.x, dy = event.clientY - s.y;
      const dt = Math.max(1, event.timeStamp - s.lastMove) / 1000;
      s.x = event.clientX; s.y = event.clientY; s.lastMove = event.timeStamp;
      experienceStore.gateYaw += dx * YAW_PER_PX;
      experienceStore.gatePitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, experienceStore.gatePitch + dy * PITCH_PER_PX));
      // Release velocity: a short exponential average, so a flick coasts and a slow stop does not.
      s.vx = 0.6 * s.vx + 0.4 * ((dx * YAW_PER_PX) / dt);
      s.vy = 0.6 * s.vy + 0.4 * ((dy * PITCH_PER_PX) / dt);
    };
    const up = (event: PointerEvent) => {
      if (!s.dragging) return;
      s.dragging = false;
      // A pointer held still before release does not throw the Compiler.
      if (event.timeStamp - s.lastMove > 80) { s.vx = 0; s.vy = 0; }
      if (node?.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
    };
    node?.addEventListener("pointerdown", down);
    node?.addEventListener("pointermove", move);
    node?.addEventListener("pointerup", up);
    node?.addEventListener("pointercancel", up);
    return () => {
      window.cancelAnimationFrame(s.frame);
      s.frame = 0;
      s.run = () => {};
      // A gate downgraded to the poster (scene failure) hands the canvas back to the page.
      experienceStore.gate = 0;
      setGating(false);
      window.removeEventListener("resize", box);
      node?.removeEventListener("pointerdown", down);
      node?.removeEventListener("pointermove", move);
      node?.removeEventListener("pointerup", up);
      node?.removeEventListener("pointercancel", up);
    };
  }, [active, stage, surface]);

  const wasEntered = useRef(entered);
  useEffect(() => {
    if (!active || wasEntered.current === entered) return;
    wasEntered.current = entered;
    const s = state.current;
    s.dragging = false;
    s.vx = 0; s.vy = 0;
    if (entered) {
      // Return the short way round from wherever the visitor left it.
      experienceStore.gateYaw = shortestAngle(0, experienceStore.gateYaw);
      s.direction = 1;
    } else {
      // Recalibration: the Compiler leaves its hero place for the centre of the gate, upright.
      experienceStore.gateYaw = 0;
      experienceStore.gatePitch = 0;
      setGating(true);
      s.direction = -1;
    }
    s.startedAt = performance.now();
    s.run();
  }, [active, entered]);
}

export function EntrySequence({
  entered,
  reducedMotion,
  onEnter,
  content,
  locale,
  onLocaleChange,
  gate,
  gateReady,
}: EntrySequenceProps) {
  const { ui, profile } = content;
  const surface = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const interactive = gate === "interactive";
  useGateMotion(interactive, entered, reducedMotion, surface, stage);

  useEffect(() => {
    if (!entered) {
      document.body.classList.add("is-calibrating");
    } else {
      document.body.classList.remove("is-calibrating");
    }

    return () => document.body.classList.remove("is-calibrating");
  }, [entered]);

  // Back on the gate after a recalibration, focus goes to the way in (the gate is no longer inert at this point).
  const hadEntered = useRef(entered);
  const enterButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (hadEntered.current && !entered) enterButton.current?.focus({ preventScroll: true });
    hadEntered.current = entered;
  }, [entered]);

  const note = gate === "poster" ? ui.entryPoster : gateReady ? ui.entryDrag : ui.entryLoading;
  // The interactive gate is revealed with its scene ready: the poster only stands in when the loader had to leave
  // first (slow network, BOOT_CAP_MS) or the scene failed. Not fetched otherwise.
  const [booted, setBooted] = useState(false);
  useEffect(() => onBootFinished(() => setBooted(true)), []);
  const showPoster = gate === "poster" || (interactive && booted && !gateReady);

  return (
    <>
      {/* The paper grid lies under the scene, never over the Compiler. */}
      <div className={`gate-grid${entered ? " is-complete" : ""}`} aria-hidden="true" />
      <section
        className={`entry-sequence entry-sequence--gate${interactive ? " is-interactive" : ""}${gateReady ? " is-gate-ready" : ""}${entered ? " is-complete" : ""}`}
        role="dialog"
        aria-modal={!entered || undefined}
        aria-hidden={entered}
        aria-labelledby="entry-title"
        inert={entered || undefined}
        style={{ "--gate-dissolve": `${reducedMotion ? 200 : GATE_TIMING.dissolveMs}ms` } as React.CSSProperties}
      >
        <div ref={surface} className="gate-drag" aria-hidden="true" />

        {/* The HUD's geometry (shared rules, own classes): on entry the header does not move, it changes tone. */}
        <header className="gate-bar">
          {/* CT-009: name and role are readable before and during the entry. */}
          <p className="gate-bar__identity">
            <span className="gate-bar__monogram" aria-hidden="true">TB</span>
            <span>{profile.name}<small>{profile.role}</small></span>
          </p>
          <div className="gate-bar__tools">
            <p className="gate-bar__status mono-label" aria-hidden="true">
              <span>TB-001</span><strong>{gateReady || gate === "poster" ? ui.entryStatus : "···"}</strong>
            </p>
            <LanguageSwitch locale={locale} ui={ui} onChange={onLocaleChange} />
          </div>
        </header>

        <div ref={stage} className="gate-stage" aria-hidden="true">
          {showPoster && (
            <img className="gate-poster" src="/gate/compiler-gate-720.webp"
              srcSet="/gate/compiler-gate-720.webp 720w, /gate/compiler-gate-1080.webp 1080w"
              sizes="(max-width: 760px) 92vw, min(100vw, 34rem)" width="1080" height="1080" alt="" decoding="async"
              fetchPriority="high" />
          )}
          <p className="gate-stage__caption mono-label">
            <span aria-live="polite">{interactive && gateReady ? "↻ " : ""}{note}</span>
            <span>{ui.entryResolution}</span>
          </p>
        </div>

        <div className="entry-sequence__statement">
          <p className="mono-label">{ui.entryKicker}</p>
          <h2 id="entry-title">
            {ui.entryTitle.lead}
            <em>{ui.entryTitle.emphasis}</em>
          </h2>
        </div>

        <button ref={enterButton} className="calibrate-button" type="button" onClick={onEnter} data-cursor="engage">
          <span>{ui.entryButton}</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </>
  );
}
