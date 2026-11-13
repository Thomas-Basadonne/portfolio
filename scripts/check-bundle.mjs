import { gzipSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const dist = new URL("../dist", import.meta.url);
// Runtime dependency JS baseline approved by Thomas on 2026-11-13 (#77):
// entry 98,000 / visual 255,000 / total 350,000 gzip; performance gates are unchanged.
// CSS retains #76's separate 42,000-byte allowance for the boot loader and entry gate.
// Measurements and the explicit trade-offs: docs/DEPENDENCY_BUDGETS.md and docs/PERFORMANCE.md.
const limits = { entryJs: 98_000, visualJs: 255_000, css: 42_000, totalJs: 350_000 };

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? filesIn(path) : path;
      }),
    )
  ).flat();
}

const files = await filesIn(dist.pathname);
const maps = files.filter((file) => extname(file) === ".map");
if (maps.length) throw new Error(`Public source maps found: ${maps.join(", ")}`);

const assets = [];
for (const file of files.filter((candidate) => [".js", ".css"].includes(extname(candidate)))) {
  const bytes = await readFile(file);
  assets.push({
    file: relative(dist.pathname, file),
    raw: (await stat(file)).size,
    gzip: gzipSync(bytes).byteLength,
  });
}

const javascript = assets.filter((asset) => asset.file.endsWith(".js"));
const styles = assets.filter((asset) => asset.file.endsWith(".css"));
const entry = javascript.find((asset) => /assets\/index-/.test(asset.file));
const visual = javascript.find((asset) => /ExperienceCanvas-/.test(asset.file));

if (!entry || entry.gzip > limits.entryJs) throw new Error(`Entry JS exceeds ${limits.entryJs} gzip bytes.`);
if (!visual || visual.gzip > limits.visualJs) throw new Error(`Visual JS exceeds ${limits.visualJs} gzip bytes.`);
if (styles.some((asset) => asset.raw > limits.css)) throw new Error(`CSS exceeds ${limits.css} raw bytes.`);
if (javascript.reduce((sum, asset) => sum + asset.gzip, 0) > limits.totalJs) {
  throw new Error(`Total JS exceeds ${limits.totalJs} gzip bytes.`);
}

console.table(assets);
