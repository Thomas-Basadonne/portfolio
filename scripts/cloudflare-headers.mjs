// Writes dist/_headers for Cloudflare Workers from the [[headers]] blocks of netlify.toml.
// While Netlify stays live as the rollback host, netlify.toml remains the single source of truth:
// both hosts serve the same rules by construction. Netlify ignores this step (it is only part of
// `build:cloudflare`); once Netlify is retired, the rules can move to public/_headers.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Cloudflare limits (Workers static assets): 100 rules, 2,000 characters per line.
const MAX_RULES = 100;
const MAX_LINE = 2_000;

export const netlifyHeadersToCloudflare = (toml) => {
  const blocks = toml.split(/^\[\[headers\]\]\s*$/m).slice(1);
  const rules = blocks.map((block) => {
    const path = block.match(/^\s*for\s*=\s*"([^"]+)"/m)?.[1];
    const values = block.split(/^\s*\[headers\.values\]\s*$/m)[1] ?? "";
    const headers = [...values.matchAll(/^\s*([A-Za-z0-9-]+)\s*=\s*"([^"]*)"\s*$/gm)].map(
      ([, name, value]) => `${name}: ${value}`,
    );
    if (!path || headers.length === 0) throw new Error(`Unparseable [[headers]] block:\n${block}`);
    return { path, headers };
  });

  if (rules.length > MAX_RULES) throw new Error(`${rules.length} header rules exceed ${MAX_RULES}.`);
  const text = `${rules.map(({ path, headers }) => [path, ...headers.map((h) => `  ${h}`)].join("\n")).join("\n\n")}\n`;
  const long = text.split("\n").find((line) => line.length > MAX_LINE);
  if (long) throw new Error(`A _headers line exceeds ${MAX_LINE} characters: ${long.slice(0, 80)}…`);
  return { rules, text };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const { rules, text } = netlifyHeadersToCloudflare(await readFile(resolve("netlify.toml"), "utf8"));
  await writeFile(resolve("dist", "_headers"), text);
  console.log(`Wrote dist/_headers with ${rules.length} rules from netlify.toml.`);
}
