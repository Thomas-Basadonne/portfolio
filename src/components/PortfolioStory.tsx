import type { Dispatch, SetStateAction } from "react";
import {
  archive,
  capabilities,
  caseStudies,
  profile,
  socials,
  trace,
  type CaseStudy,
} from "../content/portfolio";

type PortfolioStoryProps = {
  onSelectCase: Dispatch<SetStateAction<CaseStudy | null>>;
};

export function PortfolioStory({ onSelectCase }: PortfolioStoryProps) {
  return (
    <main id="main-content" tabIndex={-1}>
      <section className="story-section identity-section" id="identity" data-chapter="00">
        <div className="story-section__content story-section__content--wide">
          <div className="hero-spec mono-label">
            <span>Instrument TB–001</span>
            <span>Operating from {profile.location}</span>
          </div>
          <h1 className="hero-title">
            <span>Thomas</span>
            <span>Basadonne</span>
          </h1>
          <div className="hero-thesis">
            <p>{profile.role}</p>
            <h2>
              Built to hold.
              <em> Wired to wonder.</em>
            </h2>
          </div>
          <div className="scroll-cue mono-label" aria-hidden="true">
            <span>Turn to inspect</span>
            <i />
          </div>
        </div>
      </section>

      <section className="story-section" id="principle" data-chapter="01" data-align="end">
        <div className="story-section__content reading-panel">
          <span className="chapter-kicker mono-label">01 / Operating principle</span>
          <h2>
            Precision is not the opposite of <em>play.</em>
          </h2>
          <p className="lead-copy">{profile.introduction}</p>
          <p>{profile.extended}</p>
          <div className="principle-equation" aria-label="Reliability plus curiosity equals useful systems">
            <span>Reliability</span>
            <b>+</b>
            <span>Curiosity</span>
            <b>=</b>
            <span>Useful systems</span>
          </div>
        </div>
      </section>

      <section className="story-section fields-section" id="fields" data-chapter="02" data-align="start">
        <div className="story-section__content story-section__content--fields">
          <span className="chapter-kicker mono-label">02 / Working range</span>
          <h2>One core. Five operating fields.</h2>
          <ol className="capability-list">
            {capabilities.map((capability) => (
              <li key={capability.code}>
                <span className="capability-list__code mono-label">{capability.code}</span>
                <div>
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                  <small>{capability.detail}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="story-section cases-section" id="cases" data-chapter="03" data-align="end">
        <div className="story-section__content story-section__content--cases">
          <span className="chapter-kicker mono-label">03 / Case-file chamber</span>
          <div className="section-heading-row">
            <h2>Work, opened to the decisions inside.</h2>
            <p>
              These three report slots are ready for verified case-study material. Their empty state is
              visible by design—nothing here pretends to be client work.
            </p>
          </div>

          <div className="case-index">
            {caseStudies.map((caseStudy) => (
              <button
                key={caseStudy.id}
                type="button"
                className="case-index__item"
                onClick={() => onSelectCase(caseStudy)}
                data-cursor="inspect"
              >
                <span className="case-index__code mono-label">{caseStudy.code}</span>
                <span className="case-index__title">
                  <small>{caseStudy.kind}</small>
                  <strong>{caseStudy.title}</strong>
                  <em>{caseStudy.summary}</em>
                </span>
                <span className="case-index__status mono-label">Data requested</span>
                <span className="case-index__arrow" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>

          <aside className="archive-strip" aria-labelledby="archive-title">
            <h3 id="archive-title" className="mono-label">Public experiment trace</h3>
            {archive.map((item) => (
              <div key={item.title}>
                <span className="mono-label">{item.year}</span>
                <strong>{item.title}</strong>
                <p>{item.note}</p>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section className="story-section trace-section" id="trace" data-chapter="04" data-align="start">
        <div className="story-section__content reading-panel">
          <span className="chapter-kicker mono-label">04 / Trace history</span>
          <h2>Systems leave traces. Keep the useful ones.</h2>
          <ol className="trace-list">
            {trace.map((item) => (
              <li key={`${item.time}-${item.title}`} className={item.incomplete ? "is-incomplete" : undefined}>
                <span className="mono-label">{item.time}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="story-section contact-section" id="contact" data-chapter="05">
        <div className="story-section__content story-section__content--contact">
          <span className="chapter-kicker mono-label">05 / Transmission open</span>
          <h2>
            Send a difficult problem.
            <em> Or a strange idea.</em>
          </h2>
          <p>
            The best work usually needs both: enough structure to survive reality and enough curiosity
            to avoid the obvious answer.
          </p>

          <div className="contact-links">
            {socials.map((social) =>
              social.placeholder ? (
                <span key={social.label} className="contact-link is-placeholder" aria-disabled="true">
                  <small className="mono-label">Add verified URL</small>
                  <strong>{social.label}</strong>
                  <span aria-hidden="true">—</span>
                </span>
              ) : (
                <a key={social.label} className="contact-link" href={social.href} target="_blank" rel="noreferrer">
                  <small className="mono-label">Open channel</small>
                  <strong>{social.label}</strong>
                  <span aria-hidden="true">↗</span>
                </a>
              ),
            )}
          </div>

          <footer className="site-footer mono-label">
            <span>Thomas Basadonne / {new Date().getFullYear()}</span>
            <span>Designed as one continuous instrument</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
