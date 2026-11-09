import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { netlifyHeadersToCloudflare } from "../scripts/cloudflare-headers.mjs";

describe("cloudflare _headers", () => {
  it("mirrors every [[headers]] rule of netlify.toml", async () => {
    const toml = await readFile("netlify.toml", "utf8");
    const { rules, text } = netlifyHeadersToCloudflare(toml);

    expect(rules.map((rule) => rule.path)).toEqual(["/*", "/assets/*", "/fonts/*", "/favicon*", "/", "/*.html"]);
    expect(rules[0].headers).toHaveLength(7);
    const csp = toml.match(/Content-Security-Policy = "([^"]+)"/)?.[1];
    expect(text).toContain(`  Content-Security-Policy: ${csp}\n`);
  });

  it("fails loudly on a block it cannot read", () => {
    expect(() => netlifyHeadersToCloudflare('[[headers]]\n  for = "/x"\n')).toThrow(/Unparseable/);
  });
});
