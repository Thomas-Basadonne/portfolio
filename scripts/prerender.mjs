import { readFile, writeFile } from "node:fs/promises";

const indexPath = new URL("../dist/index.html", import.meta.url);
const source = await readFile(indexPath, "utf8");
const noScriptMain = source.match(/<noscript>[\s\S]*?(<main class="static-portfolio">[\s\S]*?<\/main>)[\s\S]*?<\/noscript>/);

if (!noScriptMain) throw new Error("The semantic no-script portfolio could not be found.");

const prerendered = noScriptMain[1].replace(
  'class="static-portfolio"',
  'class="prerender-shell" data-prerendered="true"',
);
const output = source.replace('<div id="root"></div>', `<div id="root">${prerendered}</div>`);

if (output === source) throw new Error("The root mount point could not be prerendered.");

await writeFile(indexPath, output);
