import { useEffect, useRef } from "react";
import type { CaseStudy, PortfolioContent } from "../content/portfolio";
import { CaseMediaGallery } from "./CaseMediaFigure";

type CaseStudyDrawerProps = {
  caseStudy: CaseStudy | null;
  ui: PortfolioContent["ui"];
  onClose: () => void;
};

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div className="case-field">
      <dt className="mono-label">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function CaseStudyDrawer({ caseStudy, ui, onClose }: CaseStudyDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const isOpen = caseStudy !== null;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      // Move focus ourselves instead of trusting native tabbing: Safari skips links by default,
      // so relying on it would let focus leave the dialog whenever a link is the last stop.
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? (focusable[index - 1] ?? last)
        : (focusable[index + 1] ?? first);
      event.preventDefault();
      next.focus();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!caseStudy) return null;

  return (
    <div className="case-overlay" role="presentation" onMouseDown={onClose}>
      <div
        ref={drawerRef}
        className="case-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="case-drawer__header">
          <div>
            <span className="mono-label">
              {caseStudy.code} / {ui.drawerReport}
            </span>
            <h2 id="case-drawer-title">{caseStudy.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} data-cursor="engage" autoFocus>
            {ui.drawerClose} <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="case-drawer__status mono-label">
          <span>{caseStudy.kind}</span>
          <strong>
            {caseStudy.status} · {caseStudy.period}
          </strong>
        </div>

        <p className="case-drawer__summary">{caseStudy.summary}</p>

        {caseStudy.media && (
          <CaseMediaGallery key={caseStudy.id} items={caseStudy.media} ui={ui} onFocusLost={() => closeRef.current?.focus()} />
        )}

        <dl className="case-drawer__fields">
          <DataField label={ui.drawerContext} value={caseStudy.context} />
          <DataField label={ui.drawerRole} value={caseStudy.role} />
          <div className="case-field">
            <dt className="mono-label">{caseStudy.decisionsLabel ?? ui.drawerDecisions}</dt>
            <dd>
              <ol>
                {caseStudy.decisions.map((decision) => (
                  <li key={decision}>{decision}</li>
                ))}
              </ol>
            </dd>
          </div>
          <div className="case-field">
            <dt className="mono-label">{ui.drawerTechnologies}</dt>
            <dd className="case-drawer__tags">
              {caseStudy.technologies.map((technology) => (
                <span key={technology}>{technology}</span>
              ))}
            </dd>
          </div>
          <DataField label={ui.drawerOutcome} value={caseStudy.outcome} />
          {caseStudy.links.length > 0 && (
            <div className="case-field">
              <dt className="mono-label">{ui.drawerLinks}</dt>
              <dd>
                {caseStudy.links.map((link) => (
                  <a
                    key={link.href}
                    className="item-link mono-label"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                    <span aria-hidden="true"> ↗</span>
                    <span className="visually-hidden"> {ui.opensNewTab}</span>
                  </a>
                ))}
              </dd>
            </div>
          )}
        </dl>

        <p className="case-drawer__footnote mono-label">{caseStudy.evidence}</p>
      </div>
    </div>
  );
}
