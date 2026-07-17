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

A fixed WebGL field occupies the viewport while semantic HTML chapters move through it. Content
alternates around the machine on wide screens. On mobile, the artifact becomes an upper-stage
object and content occupies a stable lower reading plane; no desktop layout is merely scaled down.

### Motion rules

1. Every major transform is derived from one normalized scroll timeline.
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

## Content integrity

The source repository was empty. Only facts stated in the brief or found on Thomas’s public
LinkedIn profile are presented as facts. Case-study metrics, dates, links, CV and project details
are explicit placeholders in `src/content/portfolio.ts`; none are silently invented.

## Research synthesis

Recent award and creative-development case studies consistently favor one shared canvas, a single
narrative sequence, restrained effects and performance adaptation. This concept adopts those
production principles without borrowing a visual motif, scene, model or layout from a reference.
