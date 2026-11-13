import type { Locale, PortfolioContent } from "../content/portfolio";
import { LanguageSwitch } from "./LanguageSwitch";

type HudProps = {
  activeChapter: number;
  progressPercent: number;
  content: PortfolioContent;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  /** Back to the entry gate (#17). */
  onRecalibrate?: () => void;
};

export function Hud({ activeChapter, progressPercent, content, locale, onLocaleChange, onRecalibrate }: HudProps) {
  const { ui, profile, chapters } = content;

  return (
    <header className="hud">
      <a className="hud__identity" href="#identity" aria-labelledby="hud-monogram hud-name hud-purpose" title={ui.hudHome}>
        <span id="hud-monogram" className="hud__monogram">TB</span>{" "}
        <span id="hud-name">
          {profile.name}{" "}
          <small>{profile.role}</small>
        </span>
        <span id="hud-purpose" className="visually-hidden"> — {ui.hudHome}</span>
      </a>

      <div className="hud__tools">
        {onRecalibrate && (
          <button className="hud__recalibrate mono-label" type="button" onClick={onRecalibrate}
            aria-label={ui.hudRecalibrate.name} data-cursor="engage">
            {/* A drawn arc at the text's size: the ↺ glyph rendered small and thin next to the label. */}
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M3.2 9.5A5 5 0 1 0 4.6 4.4M4.4 1.6v3h3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span>{ui.hudRecalibrate.label}</span>
          </button>
        )}
        <div className="hud__readout mono-label" aria-hidden="true">
          <span>DEPTH</span>
          <strong>{String(progressPercent).padStart(3, "0")}</strong>
          <span>%</span>
        </div>
        <LanguageSwitch locale={locale} ui={ui} onChange={onLocaleChange} />
      </div>

      <nav className="chapter-nav" aria-label={ui.hudNav}>
        <ol>
          {chapters.map((chapter, index) => (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                className={activeChapter === index ? "is-active" : undefined}
                aria-current={activeChapter === index ? "location" : undefined}
              >
                <span>{chapter.code}</span>
                <em>{chapter.label}</em>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <progress
        className="hud__progress"
        max="100"
        value={progressPercent}
        aria-label={`${ui.hudDepth}: ${progressPercent}%`}
      />
    </header>
  );
}
