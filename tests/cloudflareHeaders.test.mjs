import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
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

  it("stops a block at the next top-level table", () => {
    const toml = '[[headers]]\n  for = "/*"\n  [headers.values]\n    X-A = "1"\n\n[[redirects]]\n  from = "/old"\n  to = "/new"\n';
    expect(netlifyHeadersToCloudflare(toml).rules).toEqual([{ path: "/*", headers: ["X-A: 1"] }]);
  });

  it("fails loudly on a header line it cannot read", () => {
    const toml = '[[headers]]\n  for = "/*"\n  [headers.values]\n    X-A = "1"\n    "X-Frame-Options" = "DENY"\n';
    expect(() => netlifyHeadersToCloudflare(toml)).toThrow(/Unreadable header line/);
  });

  it("writes dist/_headers when run from a path with spaces", async () => {
    const root = await mkdtemp(join(tmpdir(), "cf headers "));
    await mkdir(join(root, "scripts"));
    await mkdir(join(root, "dist"));
    await copyFile("scripts/cloudflare-headers.mjs", join(root, "scripts", "cloudflare-headers.mjs"));
    await writeFile(join(root, "netlify.toml"), '[[headers]]\n  for = "/*"\n  [headers.values]\n    X-A = "1"\n');
    await promisify(execFile)(process.execPath, ["scripts/cloudflare-headers.mjs"], { cwd: root });
    expect(await readFile(join(root, "dist", "_headers"), "utf8")).toBe("/*\n  X-A: 1\n");
  });
});
