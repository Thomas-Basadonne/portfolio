import type { Ref } from "react";
import type { CaseStudy, ListItem, PortfolioContent } from "../content/portfolio";
import { SceneStage } from "./SceneStage";

type PortfolioStoryProps = {
  content: PortfolioContent;
  onSelectCase: (caseStudy: CaseStudy, trigger: HTMLElement) => void;
  stageRef?: Ref<HTMLDivElement>;
};

function ItemLink({ item, newTabLabel }: { item: ListItem; newTabLabel: string }) {
  if (!item.link) return null;
  return (
    <a className="item-link mono-label" href={item.link.href} target="_blank" rel="noopener noreferrer">
      {item.link.label}
      <span aria-hidden="true"> ↗</span>
      <span className="visually-hidden"> {newTabLabel}</span>
    </a>
  );
}

function Timeline({ items }: { items: ListItem[] }) {
  return (
    <ol className="trace-list">
      {items.map((item) => (
        <li key={`${item.time}-${item.title}`}>
          <span className="mono-label">{item.time}</span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.note}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PortfolioStory({ content, onSelectCase, stageRef }: PortfolioStoryProps) {
  const { profile, ui, about, capabilitiesSection, capabilities, work, caseStudies, openSource, lab } =
    content;
  const { experienceSection, experience, education, contact } = content;

  return (
    <main id="main-content" tabIndex={-1}>
      <SceneStage ref={stageRef} />
      <section className="story-section identity-section" id="identity" data-chapter="00">
        <div className="story-section__content story-section__content--wide">
          <div className="hero-spec mono-label">
            <span>{ui.instrument}</span>
            <span>{profile.base}</span>
          </div>
          <h1 className="hero-title">
            <span>Thomas</span>
            <span>Basadonne</span>
          </h1>
          <div className="hero-thesis">
            <p>{profile.role}</p>
            <h2>
              {profile.thesis.lead}
              <em>{profile.thesis.emphasis}</em>
            </h2>
            <p className="hero-lede">{profile.heroLede}</p>
            <div className="hero-actions">
              <a href="#work">{ui.heroWork}</a>
              <a href={contact.channels[0].href}>{ui.heroEmail}</a>
            </div>
          </div>
        </div>
      </section>

      <section className="story-section" id="about" data-chapter="01" data-align="end">
        <div className="story-section__content reading-panel">
          <span className="chapter-kicker mono-label">{about.kicker}</span>
          <h2>
            {about.title.lead}
            <em>{about.title.emphasis}</em>
          </h2>
          <p className="lead-copy">{about.lead}</p>
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <ul className="principle-equation">
            {about.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="story-section fields-section"
        id="capabilities"
        data-chapter="02"
        data-align="start"
      >
        <div className="story-section__content story-section__content--fields">
          <span className="chapter-kicker mono-label">{capabilitiesSection.kicker}</span>
          <h2>{capabilitiesSection.title}</h2>
          <ol className="capability-list">
            {capabilities.map((capability) => (
              <li key={capability.code}>
                <span className="capability-list__code mono-label">{capability.code}</span>
                <div>
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                  <small>{capability.proof}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="story-section cases-section" id="work" data-chapter="03" data-align="end">
        <div className="story-section__content story-section__content--cases">
          <span className="chapter-kicker mono-label">{work.kicker}</span>
          <div className="section-heading-row">
            <h2>{work.title}</h2>
            <p>{work.intro}</p>
          </div>

          <div className="case-index">
            {caseStudies.map((caseStudy) => (
              <button
                key={caseStudy.id}
                type="button"
                className="case-index__item"
                onClick={(event) => onSelectCase(caseStudy, event.currentTarget)}
                data-cursor="inspect"
              >
                <span className="case-index__code mono-label">{caseStudy.code}</span>
                <span className="case-index__title">
                  <small>
                    {caseStudy.kind} · <span className="nowrap">{caseStudy.period}</span>
                  </small>
                  <strong>{caseStudy.title}</strong>
                  <em>{caseStudy.summary}</em>
                </span>
                <span className="case-index__status mono-label">{caseStudy.status}</span>
                <span className="case-index__arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>

          {[
            { id: "open-source", title: work.openSourceTitle, items: openSource },
            { id: "lab", title: work.labTitle, items: lab },
          ].map((group) => (
            <section key={group.id} className="archive-strip" aria-labelledby={`${group.id}-title`}>
              <h3 id={`${group.id}-title`} className="mono-label">
                {group.title}
              </h3>
              {group.items.map((item) => (
                <div key={item.title}>
                  <span className="mono-label">{item.time}</span>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                  <ItemLink item={item} newTabLabel={ui.opensNewTab} />
                </div>
              ))}
            </section>
          ))}
        </div>
      </section>

      <section
        className="story-section trace-section"
        id="experience"
        data-chapter="04"
        data-align="start"
      >
        <div className="story-section__content reading-panel">
          <span className="chapter-kicker mono-label">{experienceSection.kicker}</span>
          <h2>{experienceSection.title}</h2>
          <Timeline items={experience} />
          <h3 className="timeline-heading mono-label">{experienceSection.educationTitle}</h3>
          <Timeline items={education} />
        </div>
      </section>

      <section className="story-section contact-section" id="contact" data-chapter="05">
        <div className="story-section__content story-section__content--contact">
          <span className="chapter-kicker mono-label">{contact.kicker}</span>
          <h2>
            {contact.title.lead}
            <em>{contact.title.emphasis}</em>
          </h2>
          <p>{contact.body}</p>

          <div className="contact-links">
            {contact.channels.map((channel) => (
              <a
                key={channel.href}
                className="contact-link"
                href={channel.href}
                {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <small className="mono-label">{channel.kind}</small>
                <strong>{channel.label}</strong>
                <span aria-hidden="true">↗</span>
                {channel.external && <span className="visually-hidden"> {ui.opensNewTab}</span>}
              </a>
            ))}
          </div>

          <footer className="site-footer mono-label">
            <span>
              {profile.name} / {new Date().getFullYear()}
            </span>
            <span>{contact.note}</span>
            <span>{ui.footerNote}</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
