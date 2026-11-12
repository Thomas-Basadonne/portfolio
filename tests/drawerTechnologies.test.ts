import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseStudyDrawer } from "../src/components/CaseStudyDrawer";
import { portfolioContent, type CaseStudy, type Locale } from "../src/content/portfolio";

const render = (entry: CaseStudy, locale: Locale) =>
  renderToStaticMarkup(createElement(CaseStudyDrawer, { caseStudy: entry, ui: portfolioContent[locale].ui, onClose: () => {} }));

describe("case study drawer technologies", () => {
  const mapei = portfolioContent.en.caseStudies.find((entry) => entry.id === "mapei-b2b")!;

  it("leaves out the Technologies field instead of rendering an empty label", () => {
    expect(render({ ...mapei, technologies: [] }, "en")).not.toContain(portfolioContent.en.ui.drawerTechnologies);
  });

  it("still renders it for a case that has technologies", () => {
    expect(mapei.technologies.length).toBeGreaterThan(0);
    expect(render(mapei, "en")).toContain(portfolioContent.en.ui.drawerTechnologies);
  });
});
