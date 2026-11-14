# Runtime dependency budget decision — PR #77

Thomas explicitly confirmed keeping all dependency upgrades on **2026-11-14**, with
these gzip-byte ceilings: **entry 98,000**, **visual 255,000**, **total JS 350,000**.
Lighthouse, accessibility, unit/E2E assertions, source-map prohibition and CSP/link
checks are unchanged. CSS is not part of this decision: the original independent
#77 retained 40,000 raw bytes. This branch now integrates the reviewed #76 and #78
heads, retaining the gate's separately approved **42,000-byte** allowance.
Merge #78 and #76 before #77; the combined resolution is already on this branch.

## Why this is a budget decision, not a code fix

The group upgrades React/React DOM 19.2.7 → 19.3.1, R3F 9.6.1 → 9.8.2, three
Fontsource packages to 5.3.0, and React types to 19.3.0. Three remains pinned at
0.182.0. Runtime transitive upgrades include scheduler, its-fine, zustand,
use-sync-external-store and @babel/runtime. The Fontsource package upgrades do
not regenerate or replace this repo's existing public font assets.

The original #77 fails the entry budget; a measurement of every chunk also
shows that the total JS exceeds its ceiling. Reducing only the entry chunk
would hide the remaining total-byte failure. An isolated build using the old
React/React DOM/scheduler with new R3F still exceeds the 330,000-byte total.
Keeping the upgrades is therefore an explicit larger-runtime trade-off, not
an optimization or an exception that disables a gate.

## Reproduced measurements

`pnpm install --frozen-lockfile`, `pnpm build`, then `gzipSync(readFileSync(file))`
(the exact compressor/options in `scripts/check-bundle.mjs`). Node 26.10.0,
pnpm 11.1.3, Vite 8.3.7, macOS. Bytes can differ slightly by Node/zlib version;
CI measures its own output rather than trusting this table. Vite's displayed
compressed-size estimate is not this gate's compressor.

| Candidate | Entry gzip | Visual gzip | Total JS gzip |
|---|---:|---:|---:|
| main `d909b1b` (also unchanged runtime tree of #78) | 85,053 | 241,439 | 326,492 |
| original #77 `92c84e2` | 93,661 | 247,623 | 341,284 |
| #77 with old React/React DOM/scheduler (diagnostic aliases, not shipped) | 85,053 | 247,623 | 332,676 |
| original #76 + #77 + #78, local merge tree `b8bcca8` | 96,759 | 248,188 | 344,947 |
| reviewed #76 `b1a7e07` + #77 + #78, final 2026-11-14 build | 96,814 | 248,231 | 345,045 |

Final CSS: **41,901 / 42,000 raw bytes** (99 bytes remaining). The final row includes
the startup crash fallback fix, not just the original gate. Regression coverage:
138 unit tests and the initial-crash E2E on Chromium, Firefox and WebKit; real-GPU
gate/entry/recalibrate probes on EN/IT desktop and phone-sized viewports.

The final combined-tree measurements and CI SHA are recorded in the PR review.
The ceilings include the reviewed gate plus these dependencies, not permission
for unrelated features to spend more. This supersedes only the JS ceilings in
`docs/PERFORMANCE.md`; that document's historical gate measurements remain
historical. Physical-phone/weak-GPU performance is still unverified.
