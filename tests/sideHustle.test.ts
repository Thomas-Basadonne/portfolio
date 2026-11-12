import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CaseStudyDrawer } from "../src/components/CaseStudyDrawer";
import { portfolioContent, type CaseStudy, type Locale } from "../src/content/portfolio";

// STU-01 (#48): SGAGGIO is a side hustle at an early stage. The card must not promise anything the
// studio cannot show yet, and it must stay a different kind of entry from the case studies.
const locales: Locale[] = ["en", "it"];
const sideHustle = (locale: Locale) => {
  const entry = portfolioContent[locale].caseStudies.find((candidate) => candidate.id === "sgaggio");
  if (!entry) throw new Error(`The SGAGGIO card is missing in ${locale}`);
  return entry;
};

// Everything a visitor reads as a claim. Media text is checked on its own below: it cites the logo version ("v2").
const claims = (entry: CaseStudy) =>
  [entry.summary, entry.context, entry.role, ...entry.decisions, entry.outcome, entry.evidence].join("\n");

describe("SGAGGIO side-hustle card", () => {
  for (const locale of locales) {
    describe(locale, () => {
      const get = () => sideHustle(locale);

      it("is a side hustle with its own code, not a case file", () => {
        expect(get().kind).toBe("Side hustle");
        expect(get().code).toMatch(/^SH–\d\d$/);
        const others = portfolioContent[locale].caseStudies.filter((candidate) => candidate.id !== "sgaggio");
        expect(others.every((candidate) => candidate.code.startsWith("CF–"))).toBe(true);
      });

      it("links nowhere until there is something public to point to", () => {
        expect(get().links).toEqual([]);
        expect(claims(get())).not.toMatch(/https?:|www\.|@/i);
      });

      it("states no figure, price or date", () => {
        expect(claims(get())).not.toMatch(/\d|€|\$|£/);
        expect(get().period).toBe("2026");
      });

      it("takes no title and makes no quality promise", () => {
        expect(claims(get())).not.toMatch(/founder|fondator|\bceo\b|titolare/i);
        expect(claims(get())).not.toMatch(/\b(fast|veloc\w*|rapid\w*|always|sempre|guarantee\w*|garanti\w*|best|migliore)\b/i);
      });

      it("does not name a client or the people it was never tied to", () => {
        expect(claims(get())).not.toMatch(/fetuseria|travel means|giulia|mapei|asterion|hermes/i);
      });

      // Media text is read in the drawer too. It may name the logo version ("v2"), never a date.
      it("dates nothing in the media text either", () => {
        const media = (get().media ?? []).flatMap((item) => [item.alt, item.caption, item.provenance]).join("\n");
        expect(media).not.toMatch(/\b(19|20)\d\d\b|\b\d{1,2}[./]\d{1,2}\b/);
        expect(media).not.toMatch(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
        expect(media).not.toMatch(/\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/i);
      });

      it("ships the logo as its only media, with real alt, caption and provenance", () => {
        expect(get().media).toHaveLength(1);
        expect(get().media?.[0].src).toBe("/case-media/sgaggio/logo-1440.webp");
      });
    });
  }

  it("is the same card in both languages, apart from the words", () => {
    const [en, it] = locales.map(sideHustle);
    expect([it.id, it.code, it.period, it.technologies, it.links]).toEqual([en.id, en.code, en.period, en.technologies, en.links]);
    expect(it.decisions).toHaveLength(en.decisions.length);
  });
});

describe("SGAGGIO drawer", () => {
  it("renders no empty Technologies label, in both languages", () => {
    for (const locale of locales) {
      const html = renderToStaticMarkup(
        createElement(CaseStudyDrawer, { caseStudy: sideHustle(locale), ui: portfolioContent[locale].ui, onClose: () => {} }),
      );
      expect(html).not.toContain(portfolioContent[locale].ui.drawerTechnologies);
    }
  });
});

describe("no-JS work list", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const work = html.match(/<section id="work-static">([\s\S]*?)<\/section>/)?.[1] ?? "";

  it("names every card of the Work list, so a visitor without JavaScript meets the same entries", () => {
    for (const entry of portfolioContent.en.caseStudies) expect(work, entry.title).toContain(`<strong>${entry.title}</strong>`);
  });
});
