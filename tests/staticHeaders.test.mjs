import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// public/_headers is copied verbatim into dist/ and applied by Cloudflare Workers static assets.
// Cloudflare drops an invalid file without failing the deploy, so its limits are checked here.
const MAX_RULES = 100;
const MAX_LINE = 2_000;

const parse = (text) =>
  text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const [path, ...lines] = block.split("\n");
      return { path, headers: Object.fromEntries(lines.map((line) => line.trim().split(/:\s(.*)/s).slice(0, 2))) };
    });

describe("static _headers", () => {
  it("keeps the security and cache rules within the Cloudflare limits", async () => {
    const text = await readFile("public/_headers", "utf8");
    const rules = parse(text);

    expect(rules.map((rule) => rule.path)).toEqual(["/*", "/assets/*", "/fonts/*", "/favicon*", "/", "/*.html"]);
    expect(rules.length).toBeLessThanOrEqual(MAX_RULES);
    expect(text.split("\n").every((line) => line.length <= MAX_LINE)).toBe(true);
    expect(Object.keys(rules[0].headers)).toEqual([
      "Content-Security-Policy",
      "Cross-Origin-Opener-Policy",
      "Cross-Origin-Resource-Policy",
      "Permissions-Policy",
      "Referrer-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
    ]);
    expect(rules[0].headers["Content-Security-Policy"]).toMatch(/^default-src 'self';.*frame-ancestors 'none'/);
    expect(rules[1].headers["Cache-Control"]).toBe("public, max-age=31536000, immutable");
  });

  it("indents every header line under its path", async () => {
    const lines = (await readFile("public/_headers", "utf8")).split("\n").filter((line) => line.trim() !== "");
    for (const line of lines) expect(line.startsWith("/") || /^ {2}[A-Za-z-]+: \S/.test(line)).toBe(true);
  });
});
