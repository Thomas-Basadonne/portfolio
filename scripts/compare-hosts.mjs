// Compares two live hosts of the portfolio (e.g. Netlify and the workers.dev pilot).
// Usage: node scripts/compare-hosts.mjs <baseline-url> <candidate-url> [--rate-limit]
// --rate-limit sends 11 synthetic error reports to the candidate only and expects 10 × 204, then 429.
const [baseline, candidate] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (!baseline || !candidate) {
  console.error("Usage: node scripts/compare-hosts.mjs <baseline-url> <candidate-url> [--rate-limit]");
  process.exit(2);
}

const paths = ["/", "/nope", "/robots.txt", "/sitemap.xml", "/favicon.ico", "/favicon.svg", "/noscript.css"];
const headers = [
  "content-security-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "permissions-policy",
  "referrer-policy",
  "x-content-type-options",
  "x-frame-options",
  "cache-control",
];
// Netlify drops the spaces after commas in Cache-Control: compare the values, not the formatting.
const normalize = (name, value) => (value && name === "cache-control" ? value.replace(/,\s*/g, ",") : value);

const read = async (base, path) => {
  const response = await fetch(new URL(path, base), { redirect: "manual" });
  await response.body?.cancel();
  return response;
};

// Fingerprinted assets differ between builds: take the first /assets/ and /fonts/ file of each host.
const firstAsset = async (base, prefix) => {
  const html = await (await fetch(base)).text();
  return html.match(new RegExp(`(?:href|src)="(${prefix}[^"]+)"`))?.[1];
};

const differences = [];
for (const prefix of ["/assets/", "/fonts/"]) {
  const [a, b] = await Promise.all([firstAsset(baseline, prefix), firstAsset(candidate, prefix)]);
  if (a && b) paths.push([a, b]);
}

for (const entry of paths) {
  const [pathA, pathB] = Array.isArray(entry) ? entry : [entry, entry];
  const [a, b] = await Promise.all([read(baseline, pathA), read(candidate, pathB)]);
  const label = pathA === pathB ? pathA : `${pathA} | ${pathB}`;
  if (a.status !== b.status) differences.push(`${label}: status ${a.status} vs ${b.status}`);
  for (const name of headers) {
    const [va, vb] = [normalize(name, a.headers.get(name)), normalize(name, b.headers.get(name))];
    if (va !== vb) differences.push(`${label}: ${name}\n    baseline:  ${va}\n    candidate: ${vb}`);
  }
  console.log(`${label.padEnd(48)} ${a.status} / ${b.status}`);
}

if (process.argv.includes("--rate-limit")) {
  const statuses = [];
  for (let i = 0; i < 11; i += 1) {
    const response = await fetch(new URL("/api/client-error", candidate), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "probe", message: "compare-hosts rate limit probe", release: "probe" }),
    });
    statuses.push(response.status);
  }
  console.log(`rate limit on candidate: ${statuses.join(" ")}`);
  // The Cloudflare limiter is approximate and per location: a 429 must appear, the exact index may vary.
  if (!statuses.includes(429)) differences.push("rate limit: no 429 after 11 requests");
}

if (differences.length) {
  console.error(`\n${differences.length} difference(s):\n${differences.join("\n")}`);
  process.exit(1);
}
console.log("\nNo differences.");
