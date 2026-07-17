import { useEffect, useRef } from "react";
import type { CaseStudy } from "../content/portfolio";

type CaseStudyDrawerProps = {
  caseStudy: CaseStudy | null;
  onClose: () => void;
};

function DataField({ label, value }: { label: string; value: string }) {
  const missing = value.startsWith("CONTENT NEEDED");
  return (
    <div className="case-field">
      <dt className="mono-label">{label}</dt>
      <dd className={missing ? "is-placeholder" : undefined}>{value}</dd>
    </div>
  );
}

export function CaseStudyDrawer({ caseStudy, onClose }: CaseStudyDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!caseStudy) return;
    const previousFocus = document.activeElement as HTMLElement | null;
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

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [caseStudy, onClose]);

  if (!caseStudy) return null;

  return (
    <div className="case-overlay" role="presentation" onMouseDown={onClose}>
      <article
        ref={drawerRef}
        className="case-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="case-drawer__header">
          <div>
            <span className="mono-label">{caseStudy.code} / inspection report</span>
            <h2 id="case-drawer-title">{caseStudy.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} data-cursor="engage">
            Close <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="case-drawer__status mono-label">
          <span>Status</span>
          <strong>{caseStudy.status === "content-needed" ? "Awaiting verified data" : "Published"}</strong>
        </div>

        <dl className="case-drawer__fields">
          <DataField label="Problem" value={caseStudy.problem} />
          <DataField label="Role" value={caseStudy.role} />
          <div className="case-field">
            <dt className="mono-label">Technical decisions</dt>
            <dd>
              <ol>
                {caseStudy.decisions.map((decision) => (
                  <li key={decision}>{decision}</li>
                ))}
              </ol>
            </dd>
          </div>
          <div className="case-field">
            <dt className="mono-label">Technologies</dt>
            <dd className="case-drawer__tags">
              {caseStudy.technologies.map((technology) => (
                <span key={technology}>{technology}</span>
              ))}
            </dd>
          </div>
          <DataField label="Impact" value={caseStudy.impact} />
        </dl>

        <p className="case-drawer__footnote mono-label">
          This slot is deliberately honest: no client, metric or outcome is shown until it can be verified.
        </p>
      </article>
    </div>
  );
}
