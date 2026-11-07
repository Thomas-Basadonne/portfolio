# Chapter direction and motion — #16 + #13

Direction approved by the owner on 2026-11-06 (chapter poses, pause/cadence policy, artifact naming), revised the
same day after a preview: one persistent stage instead of a stage per chapter, with the machine alternating columns.
This document records what is implemented; values are design anchors and requested cadences, not benchmarks.

## Chapter → pose (#16)

Each chapter owns a semantic, reversible pose. The pose depends on the chapter and on the progress through it
(`stageProgress`, 0–1, from the moment the chapter is read to the next one), never on document length or on the path
taken to get there: deep links, reloads, Back/Forward and reverse scrolling resolve the same pose.

| Chapter | Pose | Transition through the chapter |
|---|---|---|
| 00 Identity | Standby, closed sphere | settles into its first angle (`cycle 0`) |
| 01 About | Activation, hatch unlocks | `cycle 0 → 0.35`, swinging round to the back |
| 02 Capabilities | Expansion, core and structure readable | `cycle 0.35 → 0.68`, back to the front |
| 03 Work | Complete teardown, core readable | `cycle 0.68 → 1`, then `explode 0 → 1`; one turn about the hatch axis |
| 04 Experience | Recomposition into the operational state | `explode 1 → 0` at cycle 1, then a turn to the front |
| 05 Contact | Operational: core and orbits as symbolic connections | holds `cycle 1`, half an orbit |

The arc is monotonic: the machine ends operational and never closes and reopens between chapters. Inside the
teardown the approved #19 mechanics still retract the open machine before separating it (explode 0–0.28) and
reopen it after recomposing. The opening and the teardown never run at the same time. Reduced motion shows each
chapter's held pose, statically. Source: `src/experience/tb001/presentation.ts`; tests:
`tests/tb001-presentation.test.ts`.

Work does not orbit the exploded stack: a long stack swinging end-on would make an exact fit pump the camera by more
than half its distance. The stack turns once about its own axis instead, which leaves its envelope — and the frame —
unchanged. Gated holds (expansion, teardown, operational) sit on the approved #19 angles plus whole turns.

## One persistent stage

- `SceneStage` is a sticky stage holding the single R3F canvas and the pause control (both portalled into it). It
  never moves or resizes while the story scrolls; only the model inside it does.
- **Wide screens and landscape phones** (`SIDE_BY_SIDE_QUERY`): the stage spans the content box behind the text and
  the chapters alternate columns — text left for 00/02/04, right for 01/03/05 — while the model takes the other one.
  The model is framed in its column and the projection is shifted off-axis (`setViewOffset`), so it slides between
  columns without distortion or canvas resize. Each chapter ends with half a viewport of open stage; the side change
  is centred on that beat and the camera eases back slightly while crossing. Text cards stay above the canvas, so the
  machine can pass behind a card's edge but never over a paragraph. The chapter rail keeps its own right lane.
- **Portrait screens**: a sticky band from the top of the viewport (it backs the header strip) with the reading flow
  beneath it. Chapters reached from the navigation start below the band (`scroll-margin-top`).
- Story position (chapter + progress) and the model's side follow the scroll through a spring (rate 4.2/s), so wheel
  steps become continuous motion; reduced motion applies them directly.
- The layout is reserved from entry, not from canvas readiness: the page does not shift when the visual layer
  arrives. It is released only if the visual layer fails. With forced colours the canvas is removed (existing rule)
  and the stage gives its space back to the text.

### Framing

The camera fits the real geometry, not a fixed distance. `src/experience/tb001/envelope.ts` holds the support
function of the machine's profile of revolution about the hatch axis, `h(φ) = max(ρ·cos φ + |z|·sin φ)`, sampled
along the cycle and teardown paths over both quality tiers and eight idle phases, inflated 2% and slope-limited.
Symbolic orbits count in proportion to their visibility (`tests/helpers/tb001-framing.ts`): fading rings no longer
hold the camera back from the body, which used to shrink the closed machine to about a third of the stage before the
teardown. Per frame the four frustum sides are solved in closed form; the silhouette is centred and fills 90% of its
region. Sway and pointer parallax are excluded from framing. The exploded stack lies along the region's long side.

`tests/tb001-envelope.test.ts` fails if the geometry outgrows the table. Regenerate after any geometry or pose change:

```sh
UPDATE_ENVELOPE=1 pnpm exec vitest run --config vitest.config.ts tests/tb001-envelope.test.ts
```

Measured on-screen fill of the real projected geometry through every chapter, at region aspects 0.8 (desktop
column), 1.44 (phone band) and 2.17 (tablet band): 0.59–0.88. The low end is the instant fading orbits are excluded
from the measure while still faintly drawn; held poses stay at or above 0.70.

## Motion and pause (#13)

`frameloop="demand"` is kept, with a single application scheduler (`src/hooks/useExperienceController.ts`).
The R3F component applies the requested pose; it never starts its own loop.

| Phase | High | Low |
|---|---|---|
| Interaction / spring settling / visible transition | up to 60 fps | up to 30 fps |
| Visible idle (every chapter: slow sway, seam breathing, orbit nodes) | 30 fps | 15 fps |
| Suspended | no continuous loop | no continuous loop |

These are requested draw cadences (`src/lib/motionPolicy.ts`), not hardware frame-rate guarantees. Single frames
needed to reflect navigation are always drawn. Motion time advances only while motion is allowed: there is no
catch-up after a pause, a hidden tab or a drawer.

| State | Reading state (nav, DEPTH) | Static frames for navigation | Ambient motion |
|---|---|---|---|
| Entry not completed | — | no | off |
| Visual layer loading / failed | follows scroll | no | off |
| Stage visible, normal | follows scroll | yes | on |
| User pause | follows scroll | yes | off, phase kept |
| Reduced motion | follows scroll | yes, held poses | off |
| Opaque drawer open | frozen, state kept | no | off |
| Hidden tab | refreshed on return | no | off |
| Forced colours | follows scroll | no (canvas removed) | off |

The pause control is a single 44 × 44 px media button whose accessible name and tooltip are localized (**Pause
animation / Resume animation**, **Pausa animazione / Riprendi animazione**). It is keyboard and touch operable, keeps
focus after toggling and is offered only when the visual layer is ready and motion is allowed. An explicit pause
survives drawers, language changes, chapter navigation and hidden tabs; nothing resumes it automatically. The
preference lasts for the page session; no cookie or storage key is added. It sits in the rail lane's bottom corner on
wide screens and in the band's corner on portrait screens, never over reading text.

## Verification

- Unit: chapter anchors and path independence, opening/teardown exclusivity, containment of the real projected
  geometry through every transition at measured region aspects, held-pose fill, camera continuity (a pop does not
  shrink when the sampling doubles), teardown along the long side, core-visibility gates, envelope domination,
  cadence policy.
- Browser (Chromium, WebKit): explicit pause across drawer/language/navigation and clear of text, idle draws stop on
  pause, one stage fixed across chapters with alternating text columns at 1440×900 and 667×375 and chapters below
  the band at 390×844, canvas size and place constant while scrolling, forced colours keeping navigation in sync, no
  layout shift when the visual layer arrives, plus the existing HUD/contrast/fallback suites.

## Known limits

- While the model changes column it can pass behind the edge of an incoming or outgoing text card.
- On wide screens the header chips can sit over the top of the reading column as it scrolls under them (#24).
- Cadences are requested, not measured on physical hardware; tier policy, warm-up and post remain #22.
- Firefox and Lighthouse were not run locally for this change.
