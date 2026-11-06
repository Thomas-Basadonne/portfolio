# Local visual review and WebGL evidence (WOW-00)

This harness reuses Playwright and the real production build. It adds no application hook,
production dependency, alternative CI gate, or pixel threshold. `pnpm check`, E2E and Lighthouse
remain the release gates. No image is uploaded by this command.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:visual --label before
pnpm test:visual --label after --compare visual-review/<before-run>/manifest.json
# Optional separate Italian baseline (never compare different languages):
pnpm test:visual --label italian --lang it
```

Run from this checkout. Each invocation builds with `pnpm build`, owns a new loopback Vite preview
on a free port, and launches a disposable headless Chromium. It does not reuse or kill a user's
server/browser. The command takes several minutes because each pose gets a real damping settle.
Output lives under **`/visual-review/`**, ignored by Git. Keep the directory while its PR is under
review. Copy it to private local storage before deleting a worktree. Do not upload private images
or client assets. Nothing under `src/` imports the harness.

`before` and `after` are labels, not claims that either checkout equals `main`. To compare a design
change, run before editing and again after editing, or use the same harness revision in two
worktrees. Point `--compare` at the first absolute manifest path when crossing worktrees.
The harness rejects incompatible language, frame identities, viewport sizes or scroll coordinates;
layout changes require a new baseline and manual review, not a silently resized pixel diff.

## Output and identity

- `manifest.json`: success/failure (including partial runs), exact commit, branch and porcelain
  working-tree status; SHA-256 per relevant source/build file plus aggregate fingerprints;
  build command, Node/browser version, GPU information, language, actual viewport, input capability,
  motion preference, scroll coordinates, entry state, named frames, probe windows and limitations.
- `desktop/*.png`, `mobile/*.png`: **22 frames per viewport**, 1440×900 and 390×844 at DPR 1.
  Entry, hero, start/middle/end of all six **real `[data-chapter]` section bounds**, drawer and finale.
  Short sections and document-end clamping can produce coordinate aliases; this is recorded, not
  disguised as independent compositions.
- `{desktop,mobile}-sheet.html` and `.png`: self-contained, labeled contact sheets composed with
  Playwright itself. No image-processing dependency. Full-resolution frames remain authoritative.
- `REVIEW.md`: manual review checklist. Record findings here; a successful run is capture/probe
  success, **not** artistic or accessibility approval.

The source is fingerprinted before and after capture; a concurrent application edit invalidates
the run. A build fingerprint identifies actual served bytes, not a remembered branch name.
A dirty checkout is valid evidence only with its recorded working-tree status and file hashes.

## Pose versus real timeline

Pose screenshots deliberately exercise the **real reduced-motion path**: shader time and integrated
rotations stop. Repeated scroll invalidation for at least four seconds also converges damping and
camera transforms at each target, followed by 350ms idle. Merely freezing a clock would leave
path-dependent transforms. There is no test global in the production application and no public
pose control. Screenshots disable CSS animations through Playwright.

Two complete invocations plus `--compare` yield per-frame pixel counts, max/mean channel delta and
fraction of pixels with any RGBA channel delta **greater than 8/255**. This tolerance is descriptive,
not a CI budget: it discounts small antialiasing differences without hiding the raw max/mean delta.
The report does not promise bitwise identity across GPU, browser, font rasterizer or OS versions.
Inspect large differences; do not declare them acceptable because the command exited zero.

Separately, the probe reloads the real build with **`no-preference` and wall-clock time**. It uses
real wheel input on both viewport profiles. This verifies actual input-driven rendering and
suspension; it is not a deterministic pose or a touch-performance benchmark.

## Probe contract and units

The init script is installed **before navigation and renderer creation**. It observes WebGL1/2
`drawArrays`, `drawElements`, range/instanced variants, ANGLE instancing and WEBGL multi-draw when
available. Counts are scoped to the one displayed `.webgl-shell canvas`, not detached capability
checks. One multi-draw API invocation counts as one call, not its internal sub-draw count.

Before each window: the script must exist, exactly one displayed canvas must have a ready context
guard, nonzero drawing buffer, unlost context, and at least one prior observed draw. Otherwise the
command fails explicitly: an uninitialized/hidden renderer is not a valid idle zero. Visibility
must match the requested state at both ends and must not change during a window.

Each viewport records approximately one-second windows for **idle, input, pause (open case drawer),
hidden and resume**. Hidden is a **real background tab**, verified through `document.visibilityState`,
not an overridden getter or a synthetic visibility event. A normal Playwright browser forces focus
emulation; this harness instead connects to its own disposable browser with the supported
`noDefaults` CDP option, using only that browser's default context. Input and resume must actually
produce draws or the run fails. Idle/pause/hidden counts are observations, not hard-coded zeros.

- `drawCalls` and `draws`: actual intercepted GL API calls, including method breakdown.
- `browserFrames` / `browserRafHz`: a separate browser `requestAnimationFrame` heartbeat.
- `sceneFrames` / `sceneRafHz`: distinct animation-frame timestamps containing at least one scene
  draw; **not** R3F `useFrame` calls, monitor refresh, presented FPS or GPU utilization.
- `drawCallsPerSceneFrame`: calls divided by frames containing draws; `null` if none rendered.
- `durationMs`: measured wall time, not assumed interval duration.

The probe itself adds a small rAF heartbeat and wrappers. These are diagnostic counts, not an
uninstrumented performance benchmark. Mobile emulation uses this host's Chromium/GPU with touch
capability and a phone viewport: it does not reproduce iOS Safari, thermal limits, device memory,
physical safe-area insets, or real mobile throughput. Keep physical-device acceptance separate.

## Manual review

For both sheets, then selected full-resolution frames:

- distinguish material and silhouette;
- one dominant visual focus per frame;
- no text obscured by object/HUD;
- readable cutaway where one is present (otherwise mark N/A);
- viewport-appropriate breathing room, borders and safe area — **60px is not a mobile rule**;
- entry/drawer/finale readable and reachable, with normal-motion interaction checked separately.

Known design defects should be recorded, not fixed in this foundation ticket. Other WOW issues own
the redesign. Keep the baseline and candidate manifests, exact command lines and findings in the
PR, but reference local artifact paths rather than uploading private assets.
