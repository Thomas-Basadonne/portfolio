import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dist = resolve("dist");
const html = await readFile(resolve(dist, "index.html"), "utf8");
const attributes = [...html.matchAll(/(?:href|src|content)="(\/[^"]+)"/g)].map((match) => match[1]);
const localPaths = [...new Set(attributes)]
  .filter((path) => !path.startsWith("//") && !path.includes("#"))
  .map((path) => path.split("?")[0]);

const missing = [];
for (const path of localPaths) {
  try {
    await access(resolve(dist, `.${path}`));
  } catch {
    missing.push(path);
  }
}

if (missing.length) throw new Error(`Missing local resources: ${missing.join(", ")}`);

for (const required of ["canonical", "og:image", "twitter:card", "application/ld+json"]) {
  if (!html.includes(required)) throw new Error(`Required metadata is missing: ${required}`);
}

// Read from dist/ on purpose: it proves public/_headers reached the deployed assets directory.
const csp = (await readFile(resolve(dist, "_headers"), "utf8")).match(/Content-Security-Policy: (.+)/)?.[1] ?? "";
if (!csp) throw new Error("dist/_headers has no Content-Security-Policy.");
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
for (const script of inlineScripts) {
  const hash = `sha256-${createHash("sha256").update(script).digest("base64")}`;
  if (!csp.includes(`'${hash}'`)) throw new Error(`Inline script hash ${hash} is missing from the CSP in public/_headers.`);
}

console.log(
  `Verified ${localPaths.length} local resources, required metadata and ${inlineScripts.length} CSP inline-script hash(es).`,
);
