import { existsSync, readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseMediaGallery } from "../src/components/CaseMediaFigure";
import { portfolioContent, type CaseMedia } from "../src/content/portfolio";
import { caseMediaSizes, caseMediaSrcSet } from "../src/lib/caseMedia";

/**
 * SYNTHETIC FIXTURE — not a project asset and never shipped. It only exercises the
 * media contract so the UI can be tested without publishing any real screenshot.
 */
const SYNTHETIC: CaseMedia = {
  src: "/case-media/__synthetic__/full-1200.webp",
  width: 1200,
  height: 750,
  variants: [{ src: "/case-media/__synthetic__/small-600.webp", width: 600 }],
  alt: "SYNTHETIC FIXTURE: grey rectangle standing in for a screenshot",
  caption: "SYNTHETIC FIXTURE caption.",
  provenance: "SYNTHETIC FIXTURE — not a real product screen.",
};

/** Pixel size from a WebP header (lossy VP8, lossless VP8L or extended VP8X). */
function webpSize(file: Buffer) {
  if (file.toString("ascii", 0, 4) !== "RIFF" || file.toString("ascii", 8, 12) !== "WEBP") throw new Error("not a WebP");
  const chunk = file.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + file.readUIntLE(24, 3), height: 1 + file.readUIntLE(27, 3) };
  if (chunk === "VP8L") {
    const bits = file.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (chunk === "VP8 ") return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff };
  throw new Error(`unknown WebP chunk ${chunk}`);
}

describe("case media srcset", () => {
  it("lists the variants and the default rendition by ascending width", () => {
    expect(caseMediaSrcSet(SYNTHETIC)).toBe(
      "/case-media/__synthetic__/small-600.webp 600w, /case-media/__synthetic__/full-1200.webp 1200w",
    );
  });

  it("falls back to the default rendition when there are no variants", () => {
    expect(caseMediaSrcSet({ ...SYNTHETIC, variants: undefined })).toBe(
      "/case-media/__synthetic__/full-1200.webp 1200w",
    );
  });

  it("declares a full-width size for the lead image and a narrower one for tiles", () => {
    expect(caseMediaSizes.hero).toContain("100vw");
    expect(caseMediaSizes.tile).toContain("100vw");
    expect(caseMediaSizes.tile).not.toBe(caseMediaSizes.hero);
  });
});

describe("CaseMediaGallery markup (synthetic fixture)", () => {
  const ui = { drawerMediaOpen: "View full size", opensNewTab: "(opens in a new tab)" };
  const second: CaseMedia = { ...SYNTHETIC, src: "/case-media/__synthetic__/second-1200.webp", variants: undefined, alt: "SYNTHETIC FIXTURE second image" };
  const third: CaseMedia = { ...SYNTHETIC, src: "/case-media/__synthetic__/third-1200.webp", variants: undefined, alt: "SYNTHETIC FIXTURE third image" };
  const html = renderToStaticMarkup(createElement(CaseMediaGallery, { items: [SYNTHETIC, second, third], ui }));

  it("renders nothing when a case has no media", () => {
    expect(renderToStaticMarkup(createElement(CaseMediaGallery, { items: [], ui }))).toBe("");
  });

  it("renders one figure per item, the first as the lead and the rest as tiles", () => {
    expect(html.match(/<figure\b/g)).toHaveLength(3);
    expect(html).toContain("case-media--lead");
    expect(html.match(/case-media--tile/g)).toHaveLength(2);
  });

  it("reserves the layout box with intrinsic dimensions; the lead loads first, the tiles lazily", () => {
    expect(html.match(/width="1200"/g)).toHaveLength(3);
    expect(html.match(/height="750"/g)).toHaveLength(3);
    // The gallery renders only inside the open drawer, where the lead is in view: no reason to defer it.
    const images = html.match(/<img\b[^>]*>/g) ?? [];
    expect(images[0]).toContain('loading="eager"');
    // HTML attribute names are case-insensitive; React's server output writes fetchPriority.
    expect(images[0]).toMatch(/fetchpriority="high"/i);
    for (const tile of images.slice(1)) {
      expect(tile).toContain('loading="lazy"');
      expect(tile).not.toMatch(/fetchpriority/i);
    }
    expect(html.match(/decoding="async"/g)).toHaveLength(3);
    expect(html).toContain(`sizes="${caseMediaSizes.hero}"`);
    expect(html).toContain(`sizes="${caseMediaSizes.tile}"`);
  });

  it("exposes alt text, a caption and the provenance line", () => {
    expect(html).toContain(`alt="${SYNTHETIC.alt}"`);
    expect(html).toContain("<figcaption");
    expect(html).toContain(SYNTHETIC.caption);
    expect(html).toContain(SYNTHETIC.provenance);
  });

  it("adds exactly one focus stop per image: a full-size link to its largest rendition", () => {
    const anchors = html.match(/<a\b[^>]*>/g) ?? [];
    expect(anchors).toHaveLength(3);
    expect(anchors[0]).toContain(`href="${SYNTHETIC.src}"`);
    expect(anchors[1]).toContain(`href="${second.src}"`);
    for (const anchor of anchors) {
      expect(anchor).toContain('target="_blank"');
      expect(anchor).toContain('rel="noopener noreferrer"');
    }
    expect(html).toContain("View full size");
    expect(html).toContain("(opens in a new tab)");
    expect(html).not.toMatch(/<(button|input|video)\b/);
    expect(html).not.toContain("tabindex");
  });
});

describe("case study media in the real content", () => {
  const { en, it: italian } = portfolioContent;
  const withMedia = en.caseStudies.filter((entry) => entry.media?.length);
  const mediaOf = (entry: { media?: CaseMedia[] }) => entry.media ?? [];

  it("keeps media aligned across languages, with localized alt and caption", () => {
    for (const entry of en.caseStudies) {
      const other = italian.caseStudies.find((candidate) => candidate.id === entry.id);
      expect(mediaOf(other ?? {}).length, `${entry.id}: media count differs between en and it`).toBe(mediaOf(entry).length);
      mediaOf(entry).forEach((media, index) => {
        const twin = mediaOf(other ?? {})[index];
        expect(twin.src).toBe(media.src);
        expect(twin.width).toBe(media.width);
        expect(twin.height).toBe(media.height);
        expect(twin.variants).toEqual(media.variants);
      });
    }
  });

  it("ships alt, caption and provenance for every asset, distinct inside a case", () => {
    for (const content of [en, italian]) {
      for (const entry of content.caseStudies) {
        const items = mediaOf(entry);
        expect(items.length, `${entry.id} has too many images for a drawer`).toBeLessThanOrEqual(4);
        for (const media of items) {
          expect(media.alt.trim().length, `${entry.id} alt`).toBeGreaterThan(20);
          expect(media.caption.trim().length, `${entry.id} caption`).toBeGreaterThan(10);
          expect(media.provenance.trim().length, `${entry.id} provenance`).toBeGreaterThan(10);
        }
        expect(new Set(items.map((media) => media.src)).size, `${entry.id} repeats an image`).toBe(items.length);
        expect(new Set(items.map((media) => media.alt)).size, `${entry.id} repeats an alt`).toBe(items.length);
      }
    }
  });

  it("only points at local, existing, correctly sized static files", () => {
    for (const entry of withMedia) {
      for (const media of mediaOf(entry)) {
        const renditions = [{ src: media.src, width: media.width }, ...(media.variants ?? [])];
        for (const rendition of renditions) {
          expect(rendition.src, `${entry.id} src`).toMatch(/^\/case-media\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/);
          const file = new URL(`../public${rendition.src}`, import.meta.url);
          expect(existsSync(file), `${rendition.src} missing`).toBe(true);
          expect(statSync(file).size, `${rendition.src} too heavy`).toBeLessThanOrEqual(150 * 1024);
        }
        const widths = (media.variants ?? []).map((variant) => variant.width);
        for (const rendition of renditions) {
          // The declared size reserves the layout box and drives srcset: read it from the file, not from memory.
          const actual = webpSize(readFileSync(new URL(`../public${rendition.src}`, import.meta.url)));
          expect(actual.width, `${rendition.src} width`).toBe(rendition.width);
          expect(Math.abs(actual.height - (media.height * rendition.width) / media.width), `${rendition.src} height`)
            .toBeLessThanOrEqual(1);
        }
        expect(widths.every((width) => width < media.width)).toBe(true);
        expect(media.height).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the repository free of the synthetic fixture", () => {
    const source = readFileSync(new URL("../src/content/portfolio.ts", import.meta.url), "utf8");
    expect(source).not.toContain("__synthetic__");
    expect(source).not.toContain("SYNTHETIC FIXTURE");
  });
});
