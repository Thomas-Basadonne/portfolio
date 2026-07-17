import { lazy, Suspense, useCallback, useState } from "react";
import type { CaseStudy } from "./content/portfolio";
import { CaseStudyDrawer } from "./components/CaseStudyDrawer";
import { CustomCursor } from "./components/CustomCursor";
import { EntrySequence } from "./components/EntrySequence";
import { Hud } from "./components/Hud";
import { PortfolioStory } from "./components/PortfolioStory";
import { useExperienceController } from "./hooks/useExperienceController";

const ExperienceCanvas = lazy(() =>
  import("./experience/ExperienceCanvas").then((module) => ({ default: module.ExperienceCanvas })),
);

export default function App() {
  const [entered, setEntered] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);
  const { activeChapter, progressPercent, reducedMotion } = useExperienceController(entered);
  const closeCase = useCallback(() => setSelectedCase(null), []);

  return (
    <>
      <a className="skip-link" href="#main-content" onClick={() => setEntered(true)}>
        Skip to content
      </a>
      <EntrySequence
        entered={entered}
        reducedMotion={reducedMotion}
        onEnter={() => setEntered(true)}
      />
      <Suspense fallback={<div className="webgl-fallback" aria-hidden="true" />}>
        <ExperienceCanvas />
      </Suspense>
      <div className="paper-grain" aria-hidden="true" />
      <Hud activeChapter={activeChapter} progressPercent={progressPercent} />
      <PortfolioStory onSelectCase={setSelectedCase} />
      <CaseStudyDrawer caseStudy={selectedCase} onClose={closeCase} />
      <CustomCursor />
    </>
  );
}
