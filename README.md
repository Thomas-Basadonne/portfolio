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

## Content editing

All facts, links and case-study records live in `src/content/portfolio.ts`. Search for
`CONTENT NEEDED` to find every value that requires Thomas’s verified information. Placeholder
records are visibly marked in the interface and must not be treated as published case studies.

## Architecture

- `src/experience` — procedural WebGL scene and adaptive rendering
- `src/components` — interface, content chapters and accessible overlays
- `src/lib` — centralized experience state and capability detection
- `src/content` — editable portfolio facts and placeholders
- `docs/CONCEPT.md` — narrative, design system and research synthesis

The page remains readable if WebGL fails, respects reduced motion, preserves keyboard navigation
and reduces render complexity on narrow or slower devices.
