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

console.log(`Verified ${localPaths.length} local resources and required metadata.`);
