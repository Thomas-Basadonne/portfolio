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

## Content editing

All published facts, links and case-study records live in `src/content/portfolio.ts`. The current
case file documents this portfolio itself so every technical statement remains inspectable; private
client names, metrics and unverified employment details are deliberately omitted.

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
