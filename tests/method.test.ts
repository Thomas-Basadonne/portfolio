import { describe, expect, it } from "vitest";
import { portfolioContent } from "../src/content/portfolio";
import methodFlow from "../src/content/method-flow.json";

/*
 * AST-01 (#47): the Method chapter's contract, approved by Thomas on 2026-11-23. The criteria are the document's
 * rejection rules (§1, §4): written as tests before the chapter renders, in both languages.
 */

const BOUNDARY = {
  en: "Hermes Agent is an open-source project by Nous Research; Asterion is my configuration on top of it. The Compiler's core is a metaphor: it runs nothing.",
  it: "Hermes Agent è un progetto open source di Nous Research; Asterion è la mia configurazione sopra di esso. Il nucleo del Compiler è una metafora: non esegue nulla.",
};

/** Never published (§3, §4): models, providers, paths, scheduled jobs by name, identifiers, the old memory. */
const FORBIDDEN = [
  /\b(claude|anthropic|openai|gpt|deepseek|ollama|gemini|opus|sonnet|haiku|kimi|qwen|llama|mistral)\b/i,
  /\/Users\/|~\/|\.hermes|localhost|127\.0\.0\.1|:\d{4}\b/i,
  /\b(cron|curator|memory-audit|skill-usage|downloads?-organi[sz]er)\b/i,
  /\b(honcho|discord|session|token|api key)\b/i,
];

const locales = ["en", "it"] as const;

function chapterText(locale: (typeof locales)[number]) {
  const { method } = portfolioContent[locale];
  return [
    method.kicker, method.title.lead, method.title.emphasis, method.intro, method.boundary, method.profilesTitle,
    ...method.profiles.flatMap((profile) => [profile.name, profile.role]), method.memory, method.flowTitle,
    ...methodFlow.flow[locale].flatMap((step) => [step.step, step.text]),
  ];
}

describe("Method chapter contract (#47)", () => {
  it("sits between Experience and Contact, as chapter 05; Contact becomes 06", () => {
    for (const locale of locales) {
      const { chapters, method, contact } = portfolioContent[locale];
      expect(chapters.map((chapter) => chapter.id)).toEqual(["identity", "about", "capabilities", "work", "experience", "method", "contact"]);
      expect(chapters.map((chapter) => chapter.code)).toEqual(["00", "01", "02", "03", "04", "05", "06"]);
      expect(method.kicker.startsWith("05 / ")).toBe(true);
      expect(contact.kicker.startsWith("06 / ")).toBe(true);
    }
  });

  it("states the boundary word for word", () => {
    for (const locale of locales) expect(portfolioContent[locale].method.boundary).toBe(BOUNDARY[locale]);
  });

  it("names six specialists, in English, with one line each", () => {
    const names = ["researcher", "builder", "reviewer", "qa", "operator", "knowledge-keeper"];
    for (const locale of locales) {
      const { profiles } = portfolioContent[locale].method;
      expect(profiles.map((profile) => profile.name)).toEqual(names);
      for (const profile of profiles) expect(profile.role).toMatch(/^[^.]+\.$/);
    }
  });

  it("publishes nothing outside the inventory, in either language", () => {
    for (const locale of locales) {
      for (const text of chapterText(locale)) {
        for (const pattern of FORBIDDEN) expect(text, `${locale}: ${text}`).not.toMatch(pattern);
      }
    }
  });

  it("describes the typical flow, not one task: same steps in both languages, no issue, pull request or link", () => {
    expect(methodFlow.flow.en.length).toBe(7);
    expect(methodFlow.flow.it.length).toBe(methodFlow.flow.en.length);
    for (const locale of locales) {
      for (const step of methodFlow.flow[locale]) expect(`${step.step} ${step.text}`, locale).not.toMatch(/#\d|https?:|\d{1,2}[/:]\d{2}/);
    }
  });

  it("keeps the four working rules inside the flow (Thomas, 23/11/2026)", () => {
    const rules = {
      en: [/worktree and a branch of its own/, /breaking the code on purpose/, /in a form/, /until I say so/],
      it: [/worktree e in un branch dedicati/, /rompendo il codice di proposito/, /in un form/, /finché non lo dico io/],
    };
    for (const locale of locales) {
      const text = methodFlow.flow[locale].map((step) => step.text).join(" ");
      for (const rule of rules[locale]) expect(text, locale).toMatch(rule);
    }
  });
});
