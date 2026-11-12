import { useEffect } from "react";
import type { Locale, PortfolioContent } from "../content/portfolio";
import { LanguageSwitch } from "./LanguageSwitch";

type EntrySequenceProps = {
  entered: boolean;
  reducedMotion: boolean;
  onEnter: () => void;
  content: PortfolioContent;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
};

export function EntrySequence({
  entered,
  reducedMotion,
  onEnter,
  content,
  locale,
  onLocaleChange,
}: EntrySequenceProps) {
  const { ui } = content;

  useEffect(() => {
    if (!entered) {
      document.body.classList.add("is-calibrating");
    } else {
      document.body.classList.remove("is-calibrating");
    }

    return () => document.body.classList.remove("is-calibrating");
  }, [entered]);

  return (
    <section
      className={`entry-sequence${entered ? " is-complete" : ""}`}
      role="dialog"
      aria-modal={!entered || undefined}
      aria-hidden={entered}
      aria-labelledby="entry-title"
      inert={entered || undefined}
    >
      <div className="entry-sequence__meta mono-label">
        <span>{ui.entryMeta}</span>
        <LanguageSwitch locale={locale} ui={ui} onChange={onLocaleChange} />
        <span>{ui.entryResolution}</span>
      </div>

      <div className="calibration-mark" aria-hidden="true">
        <span className="calibration-mark__ring calibration-mark__ring--outer" />
        <span className="calibration-mark__ring calibration-mark__ring--inner" />
        <span className="calibration-mark__axis calibration-mark__axis--x" />
        <span className="calibration-mark__axis calibration-mark__axis--y" />
        <strong>±</strong>
      </div>

      <div className="entry-sequence__statement">
        <p className="mono-label">{ui.entryKicker}</p>
        <h2 id="entry-title">
          {ui.entryTitle.lead}
          <em>{ui.entryTitle.emphasis}</em>
        </h2>
      </div>

      <button className="calibrate-button" type="button" onClick={onEnter} data-cursor="engage">
        <span>{ui.entryButton}</span>
        <span aria-hidden="true">→</span>
      </button>

      <p className="entry-sequence__note mono-label">
        {reducedMotion ? ui.entryNoteReduced : ui.entryNoteMotion}
      </p>
    </section>
  );
}
