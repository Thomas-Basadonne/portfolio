import { chapters } from "../content/portfolio";

type HudProps = {
  activeChapter: number;
  progressPercent: number;
};

export function Hud({ activeChapter, progressPercent }: HudProps) {
  return (
    <header className="hud">
      <a
        className="hud__identity"
        href="#identity"
        aria-label="Thomas Basadonne, Frontend / Creative developer — back to start"
      >
        <span className="hud__monogram">TB</span>
        <span>
          Thomas Basadonne
          <small>Frontend / Creative developer</small>
        </span>
      </a>

      <div className="hud__readout mono-label" aria-hidden="true">
        <span>DEPTH</span>
        <strong>{String(progressPercent).padStart(3, "0")}</strong>
        <span>%</span>
      </div>

      <nav className="chapter-nav" aria-label="Inspection chapters">
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
        aria-label={`Inspection depth: ${progressPercent}%`}
      />
    </header>
  );
}
