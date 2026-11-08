# TB-001 look-dev — WOW-02 / #14

## Scope and decisions

The November 5 update of #14 overrides its original ToleranceMachine brief. That object has
already been removed by #19. The approved #18 v0.4 seven-card studio and gunmetal are already
on `main`; this work completes their reusable material and verification infrastructure rather
than replacing the approved look or rebuilding the old icosahedron.

- **Keep the dark graphite stage** and the existing procedural softbox PMREM. No HDR download,
  new dependency, external texture, point light, bloom or AO. The light stage exists only in the
  test fixture; it does not change the site's surfaces or introduce a theme switch.
- **Keep Neutral tone mapping, exposure 1, sRGB output, Three color management enabled.** The
  renderer's existing output/exposure defaults are now explicit. The controlled Neutral/ACES
  comparison is a review aid, not evidence that one operator is universally more correct. Neutral
  retains the approved response; the comparison did not justify changing it.
- **Extract the exact approved gunmetal**, not a new preset: `createGunmetalMaterial(quality, wear)`
  in `src/experience/tb001/materials.ts`, shared by the machine and study sphere. Color `#7a7e85`,
  metalness 1, roughness 0.32; high has wear and anisotropy 0.55, low omits both. The caller owns
  the material; the existing texture owner retains the shared wear map.
- **Fix the custom seam shader's output encoding.** Unlike built-in Basic/Standard/Physical
  materials, this ShaderMaterial did not include `colorspace_fragment`. Its linear signal values
  were displayed too dark/red. Add the output conversion without changing its color, gain,
  additive blending, pose-dependent strength or `toneMapped: false` policy. The studio dome is
  different: it writes linear radiance into the PMREM target and must not be display-encoded.
- **One orange signal family, not a second brand hue.** The approved core, slits and seams remain
  orange. There is no orange point light washing the metal. The core is a small faceted object
  inside dark metal; the CTA is a flat, labeled `#ff4d00` control in the reading column. Their
  distinction uses spatial separation, area, form and face luminance, not an expectation that
  every emissive pixel equals the CSS hex. No geometry, choreography, typography or copy change.

These are choices within the approved brief. A preference for another roughness, stage or tone
operator is not a certified technical defect.

## Reproduce the controlled study

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:lookdev
```

This command owns a loopback Vite fixture server, a disposable full Chromium, a fresh production
build and a separate loopback preview. It closes them on success and failure. It never attaches
to a user's browser/server. Output is a fresh timestamped directory under **`visual-review/lookdev/`**,
ignored by Git and deliberately outside `test-results/` (Playwright clears that directory).
No images or data are uploaded.

The GPU encoding guard is an explicit local acceptance command (`pnpm test:lookdev`), not part
of `pnpm check` or the existing Playwright CI job. The unit include assertion is a narrower removal
guard, not a substitute for the GPU probe. Re-run the local command for future shader changes.

Artifacts:

- `record.json`: commit, branch, dirty status, SHA-256 source/fixture/harness fingerprints, browser,
  actual GPU, material properties, observed color pipeline, requests, timing, payload hashes and
  cleanup. Sources must be unchanged through the run.
- `sheet.png` / `sheet.html` and ten full-size frames: three identical spheres with genuinely
  different gunmetal, graphite polymer and bone ceramic materials; dark/light stage × high/low
  quality × environment off/on, plus a Neutral/ACES pair. Camera, geometry and exposure are fixed.
  **High/low means quality, not exposure.** Bone/polymer are comparison targets, not new production
  materials. Environment-off is an unlit diagnostic, not a representation of today's `main`.
- `model/record.json` and twenty frames: the actual `TB001Model` in 01–04 and teardown at 1440×900
  and 390×844, high and low. Reuses the existing #19 fixture, ray/collision checks and lifecycle
  runner instead of introducing a second model or animation scheduler.
- `production-{1440,390}.png` and `firstUsefulFrames`: the actual lazy-loaded production entry,
  fresh browser contexts, reduced motion. The probe ignores offscreen PMREM passes and observes
  the first scene draw to the default framebuffer, then a following animation frame plus
  `gl.finish()`. Timings include entry-click dispatch, lazy import and setup, not just PMREM.
  This is a local completion-inclusive diagnostic, **not** FCP/LCP or an uninstrumented GPU timer.
  The per-draw wrapper's `closest`/`getParameter` checks also run during PMREM and add synchronous
  overhead before the first default-framebuffer draw. `visibleAtMs` is a later polled opaque-stage
  readiness bound; the real-model fixture's `firstUsefulFrameMs` is navigation-relative
  `performance.now()` at frame completion, not a PMREM duration.
- `payload`: actual production JS names, raw/gzip bytes and hashes; the existing bundle gate runs
  after the build. `NODE_ENV=production` is explicit for the build subprocess because starting a
  programmatic Vite dev server sets the parent process's environment to development.

The real-model runner records each PMREM generation/disposal and verifies one live environment,
no regeneration during pose changes, all targets released on unmount, and stable resource counts
through three remounts on each viewport. Its additional instrumentation lives only in `tests/`.
The studio, generator and generated target retain their existing ownership boundaries.

### Regression proof

The GPU test uses the **actual machine seam fragment**, rendered at a constant meridian point and
strength 0.25, then reads the default framebuffer. It compares the result with Three's linear-to-sRGB
conversion. The RED run used a detached worktree pinned to `main` at `9fbbd75`, with the candidate
look-dev fixtures/runner and extracted material factory overlaid as untracked test infrastructure;
`machine.ts` (and therefore its seam fragment) remained the unmodified base implementation. In that
run actual `[108,16,1]` differs from expected `[174,70,7]`, so the test fails. Reproduce by copying
`tests/fixtures/lookdev.{html,ts}`, `tests/fixtures/tb001.tsx`, `tests/review/{lookdev,tb001}.mjs` and
`src/experience/tb001/materials.ts` to a disposable base worktree with installed dependencies, then
run `node tests/review/lookdev.mjs`. This is not a command available on pristine base without that
test overlay. With the output conversion it reads `[174,70,7]` and passes (±1 quantization allowance).
An sRGB render target is deliberately not used: hardware framebuffer conversion can conceal this
missing shader conversion. This swatch tests encoding, **not** artistic approval of the full object.

## Recorded verification (November 7, 2026)

Host/browser: Chromium 149.0.7827.55, ANGLE Metal / Apple M4 Pro. Measurements below are local samples,
not mobile-hardware guarantees or statistical performance claims.

| Check | Recorded result |
|---|---|
| Controlled study | 10 frames; three distinct materials; same camera/exposure |
| Actual model | 20 cases; no clipped bounds or tagged-solid collisions; exposed-core rays ≥0.9, teardown ≥0.95 |
| Custom shader output | RED on base, GREEN on candidate, exact expected RGB |
| PMREM factory | High/low sizes 256/128; generated targets 768×1024 / 384×512; one recorded full-factory sample 57.4 / 25.9 ms |
| Production first useful frame | Entry → completed draw 611.7 / 611.9 ms (desktop/mobile); opaque visible-stage readiness observed by 629.6 / 623.9 ms |
| Pose changes | No additional PMREM generation |
| Unmount | 0 geometries, 1 renderer-owned fallback texture; all owned targets disposed |
| Three low-tier remounts | 42 geometries / 4 textures each time, no growth |
| Production payload | Visual 241,827 → 241,896 gzip bytes (+69); entry 78,189 → 78,190 (+1) |
| Budgets | Visual <250,000, entry <90,000, total JS <330,000 gzip bytes; no budget changed |
| `pnpm check` | 59 unit tests plus typecheck, lint, build, bundle and links pass |
| Chromium + WebKit E2E | 69 passed, 1 existing capability skip (WebKit context-loss extension unavailable) |

The successful look-dev records carry exact timing samples. The measured factory and PMREM-only
intervals are different: the sphere records the whole `createStudioEnvironment` call plus GPU
completion; the real-model fixture records `PMREMGenerator.fromScene` plus GPU completion.
Do not sum them or call either one a mobile benchmark. PMREM is built once per committed model
setup/tier, not every frame; explicit unmount/remount necessarily regenerates it.

### Full-page comparison and visual review

Use the existing #12 production harness independently:

```sh
pnpm test:visual --label before
pnpm test:visual --label after --compare /absolute/path/to/before/manifest.json
```

The recorded before/after runs each contain **44 frames and ten WebGL windows**. Thirty frames are
pixel-identical; fourteen hero/about frames change where the custom seam is visible. Desktop hero
changes affect 0.73% of pixels, mobile hero 0.42%, at the harness's descriptive 8/255 channel tolerance.
The open-machine chapters, drawer and contact frames are unchanged. The new conversion brightens
the thin seam; it does not recolor the metal, replace the focal core or move the machine into text.

The reviewed sheets and selected full-resolution model frames show distinct metal/core and no
new gross crop, highlight washout or text occlusion. The low-tier lower shell is deliberately dark
and has less micro-detail than high; it remains an edge-contrast watchpoint, not a reason to alter
the approved look in this ticket. The cube and CTA remain separated in the actual page, including
the existing bone and orange reading surfaces. The sphere sheet alone does not certify that.

The full-page mobile `03-work-middle` composition has a visually empty upper stage in both base
and candidate (pixel-identical in this run); this ticket does not repair that inherited framing
watchpoint. The existing mid-address email wrap is also not changed here. These are separate
composition/responsive concerns, not regressions introduced by the material infrastructure.

Actual normal-motion probe: idle is still active (30 desktop / 15 mobile scene frames per sampled
second), input/resume draw, drawer pause and hidden windows draw zero. Rendering has not been
silenced to produce a misleading idle zero. Reduced motion, fallback, forced colors, context loss,
keyboard navigation and surface crossings are also covered by the existing E2E tests.

## Limits / rollback

No physical phone, iOS Safari or cross-GPU pixel equivalence is certified. Firefox is left to the
repository CI rather than claiming a local run. The inherited Vite raw-chunk warning already exists
on the base; the authoritative gzip budget passes unchanged. Geometry probes retain #19's vertex
sampling/exclusion limits; no new displacement or tessellation is introduced. No baseline screenshots
or generated study assets enter the production bundle. Revert this commit to restore the previous
seam encoding/material location; no persisted data, migration or external asset needs rollback.
