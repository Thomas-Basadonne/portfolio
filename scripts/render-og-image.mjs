// Renders public/assets/og-image.png from og-image.svg with Chromium, so the share image cannot drift
// from its source again: the PNG committed until #44 had lost the rings, the grid and the background.
// Run after editing the SVG: `pnpm og:image`. The SVG asks for Arial, so render on a machine that has it
// (macOS does); the result is committed, nothing renders it at build time.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";

const source = new URL("../public/assets/og-image.svg", import.meta.url);
const target = new URL("../public/assets/og-image.png", import.meta.url);
const svg = await readFile(source, "utf8");
const [, width, height] = svg.match(/<svg[^>]*width="(\d+)"[^>]*height="(\d+)"/) ?? [];
if (!width || !height) throw new Error("og-image.svg must declare a pixel width and height.");

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: Number(width), height: Number(height) },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`);
  await page.locator("svg").screenshot({ path: target.pathname });
} finally {
  await browser.close();
}
console.log(`Rendered ${target.pathname} (${width}x${height}).`);
