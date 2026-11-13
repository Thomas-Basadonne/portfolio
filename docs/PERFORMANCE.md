# Render tiers, frame monitor and warm-up — #22 (WOW-10), first slice

What this document records is implemented in `src/lib/qualityPolicy.ts`, `src/experience/ExperienceCanvas.tsx` and
`src/experience/CompilerMachine.tsx`. Values marked *design target* are proposals awaiting the owner's approval, not
benchmarks and not a promise of 60 fps. Measurements are local samples (Chromium 149, ANGLE Metal, Apple M4 Pro): no
phone, no weak integrated GPU, no statistics. SwiftShader/headless numbers are never compared with hardware ones.

## Static tiers

| | high | low |
|---|---|---|
| Starts when | none of the signals below | viewport ≤ 760 px, `saveData`, `deviceMemory` ≤ 4 or `hardwareConcurrency` ≤ 4 |
| Pixel ratio | 1 – 1.5 | 0.65 – 1 |
| Antialiasing | on | off |
| Power preference | high-performance | default |
| Studio environment (PMREM) | 256 | 128 |
| Machine geometry / textures | `machine.ts`, `textures.ts` (`high ?` branches) | half the segments, no wear map, no panel bump, no anisotropy |
| Cadence, idle / active | 30 / 60 | 15 / 30 (`motionPolicy.ts`) |
| Post-processing | none | none |

Unknown signals never count as constrained. Antialiasing is fixed when the WebGL context is created: a later
downgrade keeps the antialiased buffer and lowers everything else.

Measured on the actual model (same camera and pose, `pnpm test:lookdev`): 52–71 draw calls in both tiers; triangles
71,948–83,420 high vs 23,340–25,692 low; PMREM 17–23 ms (256) and 9–10 ms (128); resources stable across three
remounts (42 geometries / 4 textures in low) and 0 geometries after unmount.

## Downgrade

The scene renders on demand, so the time between two frames mostly measures the cadence policy and pauses, not the
GPU. The monitor counts every rendered frame — a 140 ms frame is slow whether or not the reader is scrolling — and
drops any gap above 400 ms (idle wake-up, hidden tab, closed drawer, resume). *Design target:* a window of 45 frames
with at least 40 % of them above 50 ms (20 fps or less) lowers the tier. A first version counted only frames rendered
while the controller was *interacting*; on the software renderer used by the E2E suite that never fired, the tier
stayed high and the page kept rendering 140 ms frames at 30 fps.

There is **no automatic upgrade**: every switch rebuilds the environment and the whole model, and an upgrade is the
step that makes a borderline device oscillate. A measured slowdown is final for the session; a viewport that turns
narrow lowers the tier, widening it again restores the capability tier only if no slowdown was measured.

The canvas is the only owner of the tier: it publishes it to the store that the motion controller reads (before this
change a 4-core desktop drew the low tier at the high cadence) and as `data-quality` on `.webgl-shell`.

## Warm-up and failure

After the model is added, `gl.compile(scene, camera)` starts linking every program, including the parts that are
hidden at rest (seams, orbits, pistons: three traverses the whole graph, not only visible objects). With
`KHR_parallel_shader_compile` the driver links them in parallel instead of one by one on the first draw. Text and CTAs
do not wait for it.

`compileAsync` was **not** used. It polls readiness with an uncancellable `setTimeout`; when the materials are
disposed first (quality switch, unmount) the poll throws `Uncaught TypeError: Cannot read properties of undefined
(reading 'isReady')` and never resolves. Reproduced on three 0.182 with a fixture that disposes the materials right
after the call. No installed-version private property is read.

A shader that fails to link calls `renderer.debug.onShaderError` → `reportClientError` → the same deterministic
fallback used for context loss or a failed visual chunk. Context loss, chunk abort, pause, drawer, reduced motion and
forced colors keep their existing E2E tests.

### Before / after, first useful frame (`pnpm test:lookdev`, 3 runs each, ms)

| Viewport | Entry → first draw | First draw → completed (`finish()`) | Entry → completed |
|---|---|---|---|
| 1440 base | 512 / 558 / 523 | 44 / 44 / 43 | 556 / 602 / 566 (mean 575) |
| 1440 now | 563 / 526 / 560 | 8 / 8 / 8 | 572 / 534 / 568 (mean 558) |
| 390 base | 530 / 500 / 514 | 37 / 33 / 34 | 566 / 533 / 547 (mean 549) |
| 390 now | 516 / 520 / 526 | 8 / 8 / 6 | 524 / 528 / 532 (mean 528) |

The consistent change is the stall after the first draw (about 40 → 8 ms). The total moves by about 20 ms, which is
inside the run-to-run spread of entry → draw: three runs do not prove more than that.

### Payload

Visual chunk 241,896 → 242,227 gzip bytes (+331, limit 250,000); entry unchanged at 78,275 (limit 90,000). Budgets
untouched.

## Shader ranges

`tests/shaderSources.test.ts` fails on any literal `smoothstep(edge0, edge1, …)` with reversed edges in
`src/experience/` and on a non-positive seam width. `ScanField.tsx`, named in the issue, no longer exists; the
current shaders (studio dome, seam) were checked and are ordered. NaN/precision/AO-clipping concerns were not
reproduced and were left untouched.

## Entry gate preload — #17

The entry gate shows the Compiler alive, so wherever WebGL runs (`src/lib/gatePolicy.ts`: not with reduced motion,
forced colors or `saveData`; phones and low tiers included, owner's decision of 12/11) the visual chunk is loaded and
the scene built **before** entry, under a full-page boot loader (`index.html` `#boot`, `src/lib/bootLoader.ts`). This
reverses «canvas only after entry» for those visits. The static poster (`public/gate/*.webp`) is used for the other
visits and when the loader has to leave before the scene: `BOOT_CAP_MS` = 5 s after hydration (owner, 13/11).

**Software rasterizers get the poster.** On CI (no GPU) Chrome renders WebGL with SwiftShader, and the live gate
measured performance 0.48–0.65 and TBT 125 s in Lighthouse. The gate's probe is `webglRenderer(true)`: a context with
`failIfMajorPerformanceCaveat`, which a browser falling back to software refuses at once (1 ms, instead of the
~0.7–0.9 s Chrome spends starting SwiftShader on the main thread for the first context), plus the renderer's name
(`isSoftwareRenderer`) for a rasterizer chosen explicitly, where the caveat does not refuse. After entry the scene
still loads on any WebGL, as before #17.

What keeps the first paint and the main thread where they were:

- **The chunk starts after the gate is painted** (`afterGatePaint` in `App.tsx`): the largest-paint entry for the
  gate, or 500 ms where the gate is not the largest paint (phones), then idle. Started on `load` + idle it was on the
  path of the gate's h2 in Lighthouse's simulation: mobile LCP 3.5 s in 4 runs of 6.
- **The poster is not requested by interactive visits**: the gate mode is `null` until the policy runs, so the first
  render no longer fetches it (−26 KB).
- **The scene is built in four tasks** (environment, textures, geometry, programs; `TB001Model`). In one go it was a
  single task of ~200 ms at 4× CPU; the longest is now ~130 ms at 4× on desktop (the program link, not split) and
  ~100 ms on a phone viewport.

### Measured (13/11, same machine and method as above)

Lighthouse, repo config, per-run reports (`lhci` asserts on the best run, so every run is read):

| | Performance | LCP (ms) | TBT (ms) | CLS | Weight |
|---|---|---|---|---|---|
| mobile, `main` before #17 | 99 | 1,974 | 0 | 0 | 160 KB |
| mobile, gate (12 runs) | 95–99 | 1,980–2,000 | 59–113, one run 213 | 0.002 | 397 KB |
| desktop, gate (3 runs) | 99–100 | 451–453 | 0 | 0.0006 | 397 KB |

The TBT is the scene build, now during loading instead of after entry; the limit is 200 and one run in twelve
exceeded it.

Same Lighthouse config with Chrome falling back to software (`--disable-gpu --enable-unsafe-swiftshader`, the CI
case): poster gate, no chunk before entry, mobile 99 / LCP 2,104–2,106 / TBT 0, desktop 100 / TBT 0, 186 KB. With
SwiftShader forced as the GPU (`--use-angle=swiftshader`, which needs the flag) the caveat does not refuse, the name
check still picks the poster, but the probe itself costs mobile TBT 739–909: not a configuration visitors run. Boot loader on screen (Playwright, median of 3, Chromium with GPU):

| | fast network | slow 4G + CPU 4× |
|---|---|---|
| desktop 1440×900 | 0.99 s | 3.55 s |
| phone 390×844 | 0.87 s | 3.86 s |

Click → hero readable: 1.20–1.30 s, with the Compiler already in the hero.

### Budgets

CSS raw 40,000 → **42,000** (`scripts/check-bundle.mjs`): the loader and the new gate add ~3.6 KB of rules; ~1.6 KB
of dead rules (old gate, the pre-#49 shell sizing) were removed. Now 41,886.

Total JS 330,000 → **331,000** gzip (owner, 13/11): the software-renderer probe took it to 330,116 (entry 88,118,
limit 90,000; visual chunk 241,998). The +0.3% is spent on #17; the next feature (#47) has to make its own room.

### Not verified

No real phone or weak GPU: the cost of 242 KB + the scene build before entry on a mid-range Android or an iPhone on
cellular is unknown. The 5 s cap bounds the wait, not the work.

## Still open on #22

- GPU table on an integrated GPU and at least one real phone (limit declared until then); Lighthouse and soak on the
  final build.
- A/B of contact shadow / AO / bloom against the reference. Bloom is in tension with `docs/CONCEPT.md` rule 4 and
  needs an explicit product decision; `@react-three/postprocessing` is not installed and no dependency was added.
- Approval of the design targets above (window, thresholds, cadences) and of the no-upgrade rule.
