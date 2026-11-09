# Hosting — Netlify and the Cloudflare Workers pilot

Issue #52. Netlify stays the **production and rollback host** until the pilot is accepted and #44 picks the
canonical domain. No DNS change and no production deploy happens without Thomas's explicit approval.

## How the two hosts stay identical

| Concern | Netlify | Cloudflare Workers |
|---|---|---|
| Build | `VITE_COMMIT_REF=$COMMIT_REF pnpm build` (`netlify.toml`) | `pnpm build:cloudflare` → same build with `VITE_COMMIT_REF=$WORKERS_CI_COMMIT_SHA`, then `dist/_headers` |
| Node / pnpm | `NODE_VERSION=22`, `PNPM_VERSION=11.1.3` | `.node-version` (22); pnpm from `packageManager` via Corepack |
| Headers | `[[headers]]` in `netlify.toml` (**single source**) | `scripts/cloudflare-headers.mjs` writes them into `dist/_headers` (100 rules / 2,000 chars per line checked) |
| `/api/client-error` | `netlify/functions/client-error.mjs`, rate limit 10/60 s per IP | `worker/index.mjs` via `run_worker_first: ["/api/*"]`, Rate Limiting binding 10/60 s per IP |
| Handler logic | `server/client-error.mjs` (shared) | same module |
| 404 | `404.html` | `not_found_handling: "404-page"` |

`_headers` rules do not apply to Worker responses: the API route sets `no-store`, `nosniff` and CORP itself.
The Cloudflare limiter is approximate and per location (documented behaviour), enough for a log endpoint.

## Verified locally — 9 November 2026 (`wrangler dev --local`, wrangler 4.158.0)

- Security headers (CSP with hash, COOP, CORP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options)
  identical to live Netlify on `/`, `/nope`, `/assets/*`, `/fonts/*`, `/favicon.*`, `robots.txt`, `sitemap.xml`.
- Cache-Control: same values; Netlify strips the spaces after commas (cosmetic).
- Known difference: `/index.html` and `/404.html` answer **307** to `/` and `/404` on Workers
  (`html_handling` default), **200** on Netlify. Nothing in the site links them.
- API: 10 × 204 then 429; GET → 404 page; emails redacted in the Workers log; `release` = build commit.
- Largest static file 0.9 MB, 17 files: far from the 25 MiB per file / 20,000 files limits.
- e2e (Chromium): failures on Cloudflare local are a subset of those on live Netlify (23 vs 25), so no
  Cloudflare-specific regression. The suite is not green on any host: 11 failures even on `vite preview`.
  WebKit locally is not meaningful: `upgrade-insecure-requests` makes WebKit fetch `https://127.0.0.1`.
  It must be re-run against the `workers.dev` HTTPS preview.

## Order of the pilot (decided 9 November 2026)

1. **First deploy by hand, with Thomas's explicit approval**, on `workers.dev` of the personal account. Workers
   Builds stays disconnected so that nothing publishes automatically before the manual run is validated.
   ```sh
   pnpm exec wrangler login        # Thomas authorises in the browser; check with: pnpm exec wrangler whoami
   pnpm build:cloudflare           # VITE_COMMIT_REF: export WORKERS_CI_COMMIT_SHA=$(git rev-parse HEAD) first
   pnpm exec wrangler deploy       # only after the explicit OK; the first run may ask to register a workers.dev subdomain
   ```
2. Verification over real HTTPS, against Netlify as the baseline:
   - `node scripts/compare-hosts.mjs https://thomas-basadonne-portfolio.netlify.app <workers.dev URL> --rate-limit`
   - `PORTFOLIO_TEST_BASE_URL=<url> pnpm exec playwright test --project=chromium --project=webkit`, once per host; compare the
     sets of failing tests, not the counts (the suite is not green on any host today)
   - Lighthouse (lab measure) on both hosts: `pnpm exec lhci collect --no-lighthouserc --url=<url> --numberOfRuns=3
     --settings.preset=desktop` (and the mobile settings of `lighthouserc.mobile.json`)
   - Workers Logs: the probe reports appear redacted, with `release` = the deployed commit
3. Only after that: connect Workers Builds (build `pnpm build:cloudflare`, deploy `npx wrangler deploy`), merge, and the
   custom domain after #44. A Workers Custom Domain needs the zone on the same Cloudflare account (nameservers on
   Cloudflare). Then `canonical`, `og:url` and JSON-LD move in one commit.

The `workers.dev` URL is public and not `noindex`: canonical, `og:url` and JSON-LD still point to Netlify, and a
`noindex` header would break the SEO assertion that the Lighthouse comparison relies on.

## Rollback

Until cut-over the public URL is Netlify, so there is nothing to roll back. After cut-over: point DNS back to
Netlify (kept live), or `wrangler rollback` to the previous Worker version. Netlify is removed only after the
observation period, with Thomas's explicit OK.
