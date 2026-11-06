# Thomas Basadonne — TOLERANCE / 0.01

An experimental, scroll-driven portfolio built as a procedural metrology instrument. The experience
uses one React Three Fiber canvas, semantic HTML content and a strict centralized content model.

## Run locally

```bash
pnpm install
pnpm dev
```

Production verification:

```bash
pnpm typecheck
pnpm build
```

The full release gate is `pnpm check`, followed by `pnpm test:e2e` and
`pnpm test:lighthouse`. Production source maps are disabled; bundle and metadata budgets are enforced
by scripts in `scripts/`.

## Visual review

`pnpm test:visual --label before` builds locally and captures desktop/mobile chapter frames,
contact sheets and labeled WebGL probe windows. See [docs/VISUAL_REVIEW.md](docs/VISUAL_REVIEW.md)
for before/after comparison, identity manifests, review checklist and emulation limits.
Evidence stays in the Git-ignored `visual-review/` directory; no images are uploaded.

## Content editing

All published facts, links and case-study records live in `src/content/portfolio.ts`, with one
complete English (default) and Italian dictionary. Visitors switch language from the HUD or the entry
screen; the choice is kept in `?lang=it` and `localStorage`. The prerendered and no-script markup in
`index.html` is English and must be updated by hand when the English copy changes.

Copy rules: every claim must be traceable to a repository, a public profile or an explicit approval;
co-developed work names its collaborators; client metrics are never published.

`pnpm check:links` also verifies that every inline script in `dist/index.html` has its SHA-256 hash in
the Content-Security-Policy of `netlify.toml`: edit the JSON-LD and the check tells you the new hash.

## Architecture

- `src/experience` — procedural WebGL scene and adaptive rendering
- `src/components` — interface, content chapters and accessible overlays
- `src/lib` — centralized experience state and capability detection
- `src/content` — centralized, publication-ready portfolio facts
- `docs/CONCEPT.md` — narrative, design system and research synthesis

The page remains readable if WebGL fails, respects reduced motion, preserves keyboard navigation
and reduces render complexity on narrow or slower devices.

## Operations and privacy

Netlify serves immutable fingerprinted assets, a strict CSP and a custom 404. A same-origin,
rate-limited function records only sanitized technical failures in Netlify function logs. It stores
no cookies, query strings, form data or user identifiers. Deploys are immutable in Netlify: rollback
by selecting the previous successful production deploy in the Netlify UI, or redeploying that commit.
