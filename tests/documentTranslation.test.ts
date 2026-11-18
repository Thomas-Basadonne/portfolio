import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Browser auto-translation (Chrome Translate) replaces every text node with <font> wrappers. React then loses the
// nodes it owns and the app lands in its crash fallback (seen on a visitor's Chrome with an Italian UI: first load,
// and again on «Recalibrate»). The page is bilingual with its own switch, so the document opts out of translation.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("document translation opt-out", () => {
  it("the root element declares translate=\"no\"", () => {
    expect(html.match(/<html\b[^>]*>/)?.[0]).toMatch(/\stranslate="no"/);
  });

  it("the Google notranslate meta is present for Chrome Translate", () => {
    expect(html).toMatch(/<meta name="google" content="notranslate" \/>/);
  });
});
