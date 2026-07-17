import { useEffect } from "react";

type EntrySequenceProps = {
  entered: boolean;
  reducedMotion: boolean;
  onEnter: () => void;
};

export function EntrySequence({ entered, reducedMotion, onEnter }: EntrySequenceProps) {
  useEffect(() => {
    if (!entered) {
      document.body.classList.add("is-calibrating");
    } else {
      document.body.classList.remove("is-calibrating");
    }

    return () => document.body.classList.remove("is-calibrating");
  }, [entered]);

  return (
    <div className={`entry-sequence${entered ? " is-complete" : ""}`} aria-hidden={entered}>
      <div className="entry-sequence__meta mono-label">
        <span>TB / PERSONAL INSTRUMENT</span>
        <span>RESOLUTION 00.01</span>
      </div>

      <div className="calibration-mark" aria-hidden="true">
        <span className="calibration-mark__ring calibration-mark__ring--outer" />
        <span className="calibration-mark__ring calibration-mark__ring--inner" />
        <span className="calibration-mark__axis calibration-mark__axis--x" />
        <span className="calibration-mark__axis calibration-mark__axis--y" />
        <strong>±</strong>
      </div>

      <div className="entry-sequence__statement">
        <p className="mono-label">A machine for useful deviations</p>
        <h2>
          Measure what
          <em> survives complexity.</em>
        </h2>
      </div>

      <button className="calibrate-button" type="button" onClick={onEnter} data-cursor="engage">
        <span>Calibrate / enter</span>
        <span aria-hidden="true">↗</span>
      </button>

      <p className="entry-sequence__note mono-label">
        {reducedMotion ? "Reduced-motion protocol active" : "Scroll controls inspection depth"}
      </p>
    </div>
  );
}
