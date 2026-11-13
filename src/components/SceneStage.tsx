import type { Ref } from "react";
import "./scene-stages.css";

/**
 * The single persistent stage. A sticky column on wide screens and a sticky band on portrait screens;
 * the scene canvas and the pause control are portalled into it, so the machine never leaves and never crosses text.
 */
export function SceneStage({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div className="scene-rail">
      <div ref={ref} className="scene-stage" data-scene-stage="">
        {/* Where the canvas sits in the page, measured while the gate holds it over the viewport. */}
        <div className="scene-stage__probe" aria-hidden="true" />
      </div>
    </div>
  );
}
