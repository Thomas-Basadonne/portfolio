import { useEffect, useState } from "react";
import type { Locale } from "../content/portfolio";

type Step = { step: string; text: string };
type Flow = { flow: Record<Locale, Step[]> };

/**
 * The Method chapter's flow (#47): how a task typically runs with Asterion, from the issue to the merge. It loads
 * with the chapter, outside the entry bundle (approved budget, variant A); without JS the static page carries it too.
 */
export function MethodFlow({ locale, title }: { locale: Locale; title: string }) {
  const [flow, setFlow] = useState<Flow | null>(null);
  useEffect(() => {
    let alive = true;
    void import("../content/method-flow.json").then((module) => { if (alive) setFlow(module.default as Flow); });
    return () => { alive = false; };
  }, []);
  return (
    <>
      <h3 className="timeline-heading mono-label">{title}</h3>
      <ol className="trace-list">
        {flow?.flow[locale].map((step, index) => (
          <li key={step.step}>
            <span className="mono-label">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{step.step}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
