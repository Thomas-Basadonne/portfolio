# Creative and technical research

Research pass completed 17 July 2026. The references below were used to calibrate production
quality and interaction principles only. No visual concept, model, scene or layout was copied.

## Award ecosystems

- [Awwwards — current 3D website collection](https://www.awwwards.com/websites/3d/) — recent
  developer-award work confirms that realtime 3D is most effective when the scene is the navigation
  model, not an ornamental hero.
- [Awwwards — Mobile Excellence guidelines](https://www.awwwards.com/mobile-excellence-guidelines.pdf)
  — fast first interaction, legibility and mobile-specific behavior were treated as constraints of
  the concept rather than a later optimization pass.
- [CSS Design Awards — 3D Web Lab 2.0](https://www.cssdesignawards.com/sites/3d-web-lab/46828/)
  — high innovation scores are not enough on their own; the lower relative UX score is a useful
  warning against letting manipulation obscure content.
- [The FWA](https://thefwa.com/) — used as a benchmark for installation-like digital experiences and
  a reminder that a site can behave like a time-based object. Recent individual case pages were not
  reliably exposed to automated indexing, so no FWA-specific visual device was used as a reference.

## Creative-development case studies

- [Podium: Building a Website Where Running Becomes Storytelling](https://tympanus.net/codrops/2026/06/23/podium-building-a-website-where-running-becomes-storytelling/)
  — one continuous sequence, deliberate pacing and restraint are more memorable than dense effects.
- [More Than a Portfolio: Building a Scroll-Driven 3D World](https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/)
  — a 3D world succeeds when every technical choice serves a message.
- [Letting the Creative Process Shape a WebGL Portfolio](https://tympanus.net/codrops/2025/11/27/letting-the-creative-process-shape-a-webgl-portfolio/)
  — effects that stop supporting the emerging visual language should be removed.
- [The Underdog’s Crown](https://tympanus.net/codrops/2025/10/14/the-underdogs-crown-clay-boans-3d-playground-of-design-motion-and-gsap-magic/)
  — one renderer, adaptive GPU behavior and shared interaction state are proven production patterns.
- [Ten Years Away](https://tympanus.net/codrops/2026/07/08/ten-years-away-designing-an-interactive-comic-for-studio375s-tenth-anniversary/)
  — hard-coded art direction inside one WebGL canvas can be a deliberate strength when the sequence
  is authored as a composition.

## Technical references

- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) — selected for modular React 19
  scene composition without abstracting away Three.js capabilities.
- [Three.js WebGPU post-processing example](https://threejs.org/examples/webgpu_postprocessing.html)
  — reviewed as a current capability benchmark; post-processing was intentionally omitted because
  the concept works through geometry, light and material rather than a camera filter.
- [Three.js WebGPU community showcase](https://discourse.threejs.org/t/interactive-3d-scene-built-with-three-js-webgpu-and-tsl/90492)
  — reinforced that strong results can come from a small procedural system without large assets.

## Decisions carried into the build

1. One procedural artifact persists from entry to contact.
2. One canvas owns all realtime rendering and is lazy-loaded behind semantic HTML.
3. Scroll is a depth control; pointer motion is a secondary physical force.
4. No downloaded 3D models, textures, stock imagery or uncertain licenses.
5. No post-processing stack: the signature comes from form, typography and timing.
6. Render quality falls before content quality: DPR, geometry and particles adapt independently.
7. Mobile is a staged instrument above a stable reading plane, not a reduced desktop scene.
