import type { Locale } from "../content/portfolio";
import "./motion-control.css";

type MotionControlProps = {
  locale: Locale;
  paused: boolean;
  onToggle: () => void;
};

/** Compact media control with a localized accessible name and tooltip; it sits in a stage corner, clear of the model. */
export function MotionControl({ locale, paused, onToggle }: MotionControlProps) {
  const label = locale === "it"
    ? paused ? "Riprendi animazione" : "Pausa animazione"
    : paused ? "Resume animation" : "Pause animation";
  return (
    <button className="motion-control" type="button" aria-label={label} title={label} onClick={onToggle}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        {paused
          ? <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
          : <path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor" />}
      </svg>
    </button>
  );
}
