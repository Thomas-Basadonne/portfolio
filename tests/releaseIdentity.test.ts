import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { portfolioContent } from "../src/content/portfolio";

// REL-01 (#44): one public identity everywhere a recruiter meets it first. The role is DEC-00 n. 5.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const decode = (value: string) => value.replaceAll("&amp;", "&");
const html = read("index.html");
const meta = (attribute: "name" | "property", key: string) => {
  const match = html.match(new RegExp(`<meta ${attribute}="${key}" content="([^"]*)"`));
  if (!match) throw new Error(`Missing <meta ${attribute}="${key}">`);
  return decode(match[1]);
};

const { title } = portfolioContent.en.meta;
const { role } = portfolioContent.en.profile;

describe("release identity", () => {
  it("social previews carry the name and the public role, like the document title", () => {
    expect(decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "")).toBe(title);
    expect(meta("property", "og:title")).toBe(title);
    expect(meta("name", "twitter:title")).toBe(title);
    expect(title).toContain(role);
  });

  it("the share image is the declared 1200x630 PNG", () => {
    const png = readFileSync(new URL("../public/assets/og-image.png", import.meta.url));
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
      Number(meta("property", "og:image:width")),
      Number(meta("property", "og:image:height")),
    ]);
    expect(meta("property", "og:image:alt")).toBe(meta("name", "twitter:image:alt"));
  });

  it("the crash fallback does not bring back the retired role", () => {
    expect(read("src/components/AppErrorBoundary.tsx")).not.toMatch(/creative developer/i);
  });
});
