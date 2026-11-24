import { useEffect, useLayoutEffect, useReducer, useRef } from "react";
import type { PortfolioContent } from "../content/portfolio";
import { experienceStore } from "../lib/experienceStore";

/**
 * The model readout (#20): state, one contextual percentage and the active part of TB-001, read from the pose by the
 * frame loop. It lives in the stage and only while the scene is ready: without WebGL there is no model to read. The
 * frame loop places the box; this component re-renders only when a rounded value changes. No leader to the model
 * (Thomas, 23/11/2026). Decorative for assistive technology, as DEPTH: no live region, no high-frequency announcement.
 */
export function SceneReadout({ labels }: { labels: PortfolioContent["ui"]["readout"] }) {
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    experienceStore.readoutBox = box.current;
    return () => { experienceStore.readoutBox = null; };
  }, []);
  useEffect(() => {
    experienceStore.onReadout = refresh;
    // The frame loop may have written the readout before this subscription (a deep link with reduced motion renders
    // one frame): without this render the box kept «01 Standby 000%» until a rounded value changed (#47).
    refresh();
    // Place the box at once, without waiting for the next scroll.
    experienceStore.requestRender?.();
    return () => { experienceStore.onReadout = null; };
  }, []);
  // A language change re-renders the labels; the frame loop re-measures the box on its next frame.
  useEffect(() => { experienceStore.requestRender?.(); }, [labels]);

  const { state, metric, value, part } = experienceStore.readout;
  const note = experienceStore.readoutNote;
  return (
    <div ref={box} className="scene-readout mono-label" aria-hidden="true" data-readout-part={part ?? ""}>
      {note ? <span>{labels.note}</span> : <>
        <span>{labels.states[state]}</span>
        <span>{metric === "cycle" ? labels.cycle : labels.explode} {String(value).padStart(3, "0")}%</span>
        <span>{part ? labels.parts[part] : labels.rest}</span>
      </>}
    </div>
  );
}
