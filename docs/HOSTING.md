# Hosting — Cloudflare Workers

Issue #52 (migration) and #44 (canonical URL). Production runs on **Cloudflare Workers** since 10 November 2026.
Netlify is retired: the old URL only answers with a permanent redirect (see below).

## Canonical URL

`https://thomas-basadonne-portfolio.thomasbasadonne.workers.dev/`, decided by Thomas on 10 November 2026 (#44):
no custom domain for now (`thomasbasadonne.it` has lapsed and is unregistered), so the canonical is the Worker's
`workers.dev` URL. `canonical`, `og:url`, `og:image`, `twitter:image`, JSON-LD `url`, `robots.txt` and
`sitemap.xml` all point to it. A future domain changes them in one commit, after the Workers Custom Domain is
live (it needs the zone on the same Cloudflare account, nameservers on Cloudflare).

## How the site is served

| Concern | Where |
|---|---|
| Worker | `thomas-basadonne-portfolio` on the personal account, `wrangler.jsonc` |
| Build | `pnpm build:cloudflare` = `pnpm build` with `VITE_COMMIT_REF=$WORKERS_CI_COMMIT_SHA` (the `release` of error reports) |
| Deploy | Workers Builds, connected to `Thomas-Basadonne/portfolio`: every push to `main` runs the build, then `npx wrangler deploy` |
| Node / pnpm | `.node-version` (22); pnpm from `packageManager` via Corepack |
| Headers | `public/_headers`, copied to `dist/` by Vite (**single source**). `tests/staticHeaders.test.mjs` checks the rules and the Cloudflare limits (100 rules, 2,000 chars per line); `pnpm check:links` checks the inline-script CSP hash against `dist/_headers` |
| `/api/client-error` | `worker/index.mjs` via `run_worker_first: ["/api/*"]`, handler in `server/client-error.mjs`, Rate Limiting binding 10/60 s per IP |
| 404 | `404.html`, `not_found_handling: "404-page"` |
| Logs | Workers Logs (`observability.enabled`): reports are redacted, `release` = deployed commit |

`_headers` rules do not apply to Worker responses: the API route sets `no-store`, `nosniff` and CORP itself.
The rate limiter is approximate and per Cloudflare location (documented behaviour). Thomas accepted it on
10 November 2026: it bounds abuse of a log endpoint, it is not an exact quota.

Known difference from the former host: `/index.html` and `/404.html` answer **307** to `/` and `/404`
(`html_handling` default). Nothing in the site links them. Static limits (25 MiB per file, 20,000 files) are far
away: the largest file is under 1 MB.

## The old Netlify URL

`https://thomas-basadonne-portfolio.netlify.app` is kept only so that existing links (LinkedIn, CV, shares) keep
working: every path answers **301** to the same path on the canonical URL. The Netlify site has builds stopped and
no longer reads this repository; its only deploy is a redirect stub published by hand with this `_redirects`:

```text
/*  https://thomas-basadonne-portfolio.thomasbasadonne.workers.dev/:splat  301!
```

## Verifying a deploy

```sh
curl -sI https://thomas-basadonne-portfolio.thomasbasadonne.workers.dev/ | grep -iE '^(HTTP|content-security|cache-control)'
node scripts/compare-hosts.mjs <production URL> <preview or version URL> [--rate-limit]
PORTFOLIO_TEST_BASE_URL=<url> pnpm exec playwright test --project=chromium --project=webkit
pnpm exec lhci collect --no-lighthouserc --url=<url> --numberOfRuns=3 --settings.preset=desktop
pnpm exec wrangler deployments list   # active version and its source
```

WebKit is only meaningful over real HTTPS: locally, `upgrade-insecure-requests` makes it fetch `https://127.0.0.1`.
The e2e suite is green in CI (Linux); local macOS runs have known failures on every host, so compare sets of
failing tests in the same environment, not counts.

## Rollback

- Bad Worker version: `pnpm exec wrangler rollback` (or the previous version in the dashboard). The Rate Limiting
  binding holds no data, so nothing else needs rolling back.
- A failed build on `main` does not replace the live version: Workers Builds deploys only after a successful build.

## History

- 9 November 2026: pilot code (#56), verified locally with `wrangler dev`.
- 10 November 2026: test deploy on `workers.dev` from `edb15c0` (headers and status identical to Netlify, e2e and
  Lighthouse equivalent), then deleted. Results in the #52 comments.
- 10 November 2026: cut-over. Canonical moved to `workers.dev`, Netlify code removed, Netlify reduced to a redirect.
