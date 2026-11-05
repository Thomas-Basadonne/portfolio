import { describe, expect, it } from "vitest";
import { legacySectionIds, portfolioContent, type PortfolioContent } from "../src/content/portfolio";
import { resolveLocale } from "../src/lib/locale";

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, shape(entry)]),
    );
  }
  return typeof value;
}

describe("locale resolution", () => {
  it("defaults to English", () => {
    expect(resolveLocale({ search: "", stored: null })).toBe("en");
  });

  it("prefers an explicit URL choice over the stored one", () => {
    expect(resolveLocale({ search: "?lang=it", stored: "en" })).toBe("it");
    expect(resolveLocale({ search: "?lang=IT", stored: null })).toBe("it");
  });

  it("falls back to the stored choice and ignores unknown values", () => {
    expect(resolveLocale({ search: "", stored: "it" })).toBe("it");
    expect(resolveLocale({ search: "?lang=fr", stored: "it" })).toBe("it");
    expect(resolveLocale({ search: "?lang=fr", stored: "de" })).toBe("en");
  });
});

describe("portfolio content", () => {
  const { en, it: italian } = portfolioContent;

  it("keeps the Italian dictionary structurally identical to English", () => {
    expect(shape(italian)).toEqual(shape(en));
  });

  it("keeps ids, links and technologies aligned across languages", () => {
    const stable = (content: PortfolioContent) => ({
      chapters: content.chapters.map((chapter) => [chapter.id, chapter.code]),
      cases: content.caseStudies.map((entry) => [entry.id, entry.code, entry.technologies]),
      caseLinks: content.caseStudies.map((entry) => entry.links.map((link) => link.href)),
      openSource: content.openSource.map((entry) => entry.link?.href),
      lab: content.lab.map((entry) => entry.link?.href),
      channels: content.contact.channels.map((channel) => channel.href),
    });
    expect(stable(italian)).toEqual(stable(en));
  });

  it("maps every legacy section id to an existing chapter", () => {
    const ids = new Set(en.chapters.map((chapter) => chapter.id));
    for (const target of Object.values(legacySectionIds)) expect(ids.has(target)).toBe(true);
  });

  it("only links to https or mailto destinations", () => {
    for (const content of [en, italian]) {
      const hrefs = [
        ...content.caseStudies.flatMap((entry) => entry.links.map((link) => link.href)),
        ...content.openSource.map((entry) => entry.link?.href),
        ...content.lab.map((entry) => entry.link?.href),
        ...content.contact.channels.map((channel) => channel.href),
      ].filter(Boolean) as string[];
      for (const href of hrefs) expect(href).toMatch(/^(https:\/\/|mailto:)/);
    }
  });
});
