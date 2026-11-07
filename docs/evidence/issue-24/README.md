# Issue #24 — readability evidence

Baseline: `9fbbd7584db95953be8021eb90d0d4c4d52d64f2` (main before this branch). Candidate: the exact source hashes in `measurements.json`.

## What was reproduced

| Finding | Baseline evidence | Candidate |
|---|---|---|
| Informational labels below the 12 px project floor | `measurements.json → before.types`: 8.32–10.56 px | every sampled label is ≥ 12 px; `after.types` |
| Desktop targets under the 44 px project target | `before.targets`: minimum height 28.8 px (chapter rail) | `after.targets`: 44 × 44 minimum |
| Last line of a section hidden behind fixed chrome | baseline scrolling test: tails under `.chapter-nav`, contact footer 568.02 at a 568 px viewport | 32 cases (4 viewports × IT/EN × visual/fallback), 6 tails each, plus native Tab/Shift+Tab |
| Visible label lost from the accessible name (WCAG 2.5.3) | baseline test received names `English`, `Italiano` and `Thomas Basadonne, frontend developer…` | `EN — English`, `IT — Italiano`, `TB Thomas Basadonne Frontend Developer · Commerce & AI tools`; axe rule clean |
| Case-row metadata unreadable on the orange hover | `contrast-summary.json → baseline`: 1.73:1 for row kind, bullet and period | 5.92:1 on the candidate; 0 failures in 52 states |
| Nonzero safe-area ignored | baseline entry meta at y=16 px with a 24 px top inset | portrait and landscape insets, IT/EN, dock, footer and drawer checked |
| Invalid `role="dialog"` on `<article>` | axe `aria-allowed-role` reported the drawer | dialog is now a `<div>`; axe clean |

The baseline run of the new tests is `browser-checks.json → baseline` (7 failed, 0 passed) and the candidate run is `browser-checks.json → candidate` (**147 passed, 5 expected skips, 0 flaky**). The suite was run on Chromium and WebKit; WebGL-specific cases skip where the environment exposes no WebGL.

## Measurements

- `measurements.json` — per-selector font size, line-height and colour in the before/after capture; control sizes; source hashes.
- `contrast-summary.json` — all 292 baseline and 866 candidate text runs measured against the pixels composited under each run (52 measured states). Small text requires 4.5:1, large text 3:1; the candidate minimum is 4.57:1.
- `archive-order.json` — every archive entry keeps title → body order and body containment at 667 and 1440.
- `zoom-200.json` — native `chrome.tabs.setZoom` at 2 (CSS viewport 720 × 478), six sections and the drawer in IT and EN, zero horizontal overflow, zero page errors, profile removed.
- `browser-checks.json` — full machine record of both suite runs (including the tests that are not about readability, so the regression baseline is visible).

## Visual receipts

`before-after.jpg` is the one side-by-side deliverable: IT 390 work tail and IT 320 contact, baseline left, candidate right. The contact footer is cut by the dock in the baseline and clear in the candidate.

- `zoom-200-it-drawer.jpg`, `zoom-200-it-contact.jpg` — actual composited output at native 200 % browser zoom, captured over CDP because Playwright's CSS-scale screenshot was blank under `tabs.setZoom`.
- `work-reading-landscape.jpg`, `work-reading-desktop.jpg` — the archive at 667 landscape and 1440 with the reading position under the fixed chrome.

## Limits

- Firefox on macOS cannot launch headless in this environment (`RenderCompositorSWGL`); the Firefox cell of the matrix is CI-only, not locally observed.
- The nonzero safe-area cases use Chromium's CDP inset emulation, not physical iOS hardware.
- 12 px is this project's label design floor, not a WCAG text-size criterion; 44 px is the project ergonomic target, distinct from WCAG 2.5.8's minimum and exceptions.
- The portrait band and the failed-layer inset use `:has()` only as a progressive enhancement (`@supports selector(:has(*))`); without it the shell keeps a sized band and the sections keep their own `scroll-margin-top`, which is the previous, tested behaviour.
- The zoom probe needs `channel: "chromium"` (unbranded Chromium disables the extension API); the run records the real `tabs.getZoom() === 2` and the real viewport, so it is not a CSS-zoom or small-viewport proxy.
