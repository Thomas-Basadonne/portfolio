# TOLERANCE / 0.01

## Concept note

The portfolio is an impossible metrology instrument: a machine built to inspect systems at a
resolution of one hundredth. It starts sealed and calibrated. As the visitor scrolls, the same
artifact separates into rings, fields and internal structures, revealing Thomas through the way
the machine is built rather than through a conventional stack of portfolio sections.

The metaphor holds both sides of the profile together. Enterprise commerce requires systems that
survive pressure, precise interfaces and disciplined architecture. Creative development, AI and
hardware experiments begin where the expected tolerances are deliberately exceeded. The machine
therefore measures two things at once: reliability and useful deviation.

The opening line — “Built to hold. Wired to wonder.” — is the thesis. The visitor first calibrates
the instrument, then passes through six depths: identity, operating principles, fields of practice,
case files, trace history and transmission/contact. Scroll is treated as a physical depth control.
Pointer movement applies a small parallax force; projects open as inspection reports; the final
state turns the instrument into a transmitter.

## Atmosphere

- Precision laboratory, not science-fiction cockpit.
- Warm bone paper, almost-black graphite and one safety-orange signal color.
- Editorial serif headlines collide with condensed technical labels.
- Motion feels damped, weighty and mechanically related: rotate, separate, align, transmit.
- Procedural geometry and shaders keep the identity original and licensing clean.

## Design system

### Type

- Display: Instrument Serif — expressive, human and used sparingly.
- Interface: Manrope — compact and highly readable.
- Data: DM Mono — coordinates, chapter codes and machine labels only.

### Color

- `graphite`: `#0b0b0a`
- `bone`: `#e9e5da`
- `signal`: `#ff4d00`
- `oxide`: `#a8b6ac`
- `muted`: `#8a877e`

### Layout

The artifact is TB-001 “The Compiler”; “Tolerance / 0.01” remains the editorial frame of precision, not a
physical measurement or a performance of the machine. Its orbits and nodes are symbolic connections.

One persistent stage holds the artifact while semantic HTML chapters move past it, served by a single WebGL
canvas. On wide screens the machine and the text swap columns chapter by chapter, the machine travelling across
the open beat between two chapters; on mobile the artifact becomes an upper-stage object above a stable reading
plane. The machine never sits over a paragraph. No desktop layout is merely scaled down.

### Motion rules

1. Every major transform is derived from the chapter being shown and its stage's progress, never from
   document length; any chapter can be reached directly and resolves the same pose.
2. Objects never appear randomly; they separate from or return to the core.
3. Pointer response is subordinate to scroll and is disabled for reduced motion.
4. No post-processing is required for the visual thesis.
5. Rendering quality is adaptive: pixel ratio and particle density fall before readability does.

## Technical rationale

Vite, React and strict TypeScript keep a static portfolio lean and deployable anywhere. A single
React Three Fiber canvas owns all realtime rendering. The hero artifact is code-generated from
primitive geometry and a small custom shader. DOM content remains complete without WebGL.
Animation state is centralized in a mutable experience controller so the render loop does not force
React to re-render on every frame.

## TB-001 look-dev decision — WOW-02

The approved dark-stage gunmetal direction is retained: the procedural seven-softbox PMREM supplies
reflections without an external HDR or an orange point light. The extracted gunmetal factory shares
its exact PBR settings with a test-only sphere study. Low quality uses the same rig at half PMREM
face resolution, without wear or anisotropy; the study did not justify adding compensating lights.

Neutral tone mapping, exposure 1 and sRGB output remain the display policy. The custom seam shader
now explicitly converts linear color to the output space, as built-in materials already do; the
studio dome intentionally stays linear for PMREM. The core/slits/seams share one orange family, while
UI signal remains a flat labeled control, separated by position, shape and luminance. The existing
face-to-face core variation is retained. Dark versus light stage and Neutral versus ACES comparisons
are review fixtures, not new site themes or a claim of universally better taste. No further geometry,
normal/displacement or post-processing change is warranted by this infrastructure ticket.

See [LOOKDEV.md](LOOKDEV.md) for reproducible A/B sheets, actual-model and lifecycle checks, GPU
encoding regression, first-frame/PMREM diagnostics, payload budgets and the remaining device limits.

## Content integrity

The source repository was empty. Only facts stated in the brief or found on Thomas’s public
LinkedIn profile are presented as facts. Case-study metrics, dates, links, CV and project details
are explicit placeholders in `src/content/portfolio.ts`; none are silently invented.

## Research synthesis

Recent award and creative-development case studies consistently favor one shared canvas, a single
narrative sequence, restrained effects and performance adaptation. This concept adopts those
production principles without borrowing a visual motif, scene, model or layout from a reference.
