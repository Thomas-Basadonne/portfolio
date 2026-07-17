export type SocialLink = {
  label: string;
  href: string;
};

export type Capability = {
  code: string;
  title: string;
  description: string;
  detail: string;
};

export type CaseStudy = {
  id: string;
  code: string;
  title: string;
  kind: string;
  summary: string;
  problem: string;
  role: string;
  decisions: string[];
  technologies: string[];
  impact: string;
  status: "published";
};

export const profile = {
  name: "Thomas Basadonne",
  shortName: "TB",
  role: "Frontend & Creative Developer",
  location: "Ancona, Italy",
  employer: "CØDESTORM",
  thesis: "Built to hold. Wired to wonder.",
  introduction:
    "I design frontend systems that stay clear under pressure — then use code, AI and physical experiments to discover what the interface could become.",
  extended:
    "My center of gravity is frontend architecture: React, TypeScript and complex commerce. Around it I build full-stack tools, AI workflows and hands-on experiments that move between browser, backend and workbench.",
} as const;

export const socials: SocialLink[] = [
  {
    label: "LinkedIn",
    href: "https://it.linkedin.com/in/thomasbasadonne",
  },
  {
    label: "GitHub",
    href: "https://github.com/Thomas-Basadonne",
  },
];

export const capabilities: Capability[] = [
  {
    code: "01",
    title: "Frontend systems",
    description: "React, TypeScript and architecture for interfaces that need to scale without losing clarity.",
    detail: "Component systems · state and data flows · performance · maintainability",
  },
  {
    code: "02",
    title: "Enterprise commerce",
    description: "Complex B2B and e-commerce experiences built around real operational constraints.",
    detail: "Adobe Commerce · Storefront / ACO · PWA Studio · GraphQL",
  },
  {
    code: "03",
    title: "Intelligent products",
    description: "AI features that earn their place through useful context, retrieval and workflow design.",
    detail: "LLM products · RAG · local AI · intelligent workflows",
  },
  {
    code: "04",
    title: "Tools & automation",
    description: "Backend services and internal tooling that remove friction from complicated work.",
    detail: "APIs · integrations · automation · developer experience",
  },
  {
    code: "05",
    title: "Physical curiosity",
    description: "Creative coding and hardware experiments where software becomes something tangible.",
    detail: "Realtime 3D · 3D printing · prototypes · personal research",
  },
];

export const caseStudies: CaseStudy[] = [
  {
    id: "tolerance-machine",
    code: "CF–01",
    title: "Tolerance / 0.01",
    kind: "Portfolio / realtime system",
    summary: "A procedural portfolio where a metrology instrument turns scrolling into inspection depth.",
    problem:
      "Create a memorable portfolio without allowing WebGL to compromise content, accessibility or the first interaction.",
    role: "Concept, art direction, interaction design and implementation by Thomas Basadonne.",
    decisions: [
      "Keep the complete narrative in semantic HTML and treat the canvas as a progressive visual layer.",
      "Build one procedural artifact with no downloaded models, textures or post-processing stack.",
      "Load realtime code only after entry, render on demand and adapt geometry and DPR to the device.",
    ],
    technologies: ["React", "TypeScript", "React Three Fiber", "Three.js", "Vite", "Playwright"],
    impact:
      "A single-page experience whose navigation and complete story remain usable when motion is reduced or WebGL is unavailable.",
    status: "published",
  },
];

export const archive = [
  {
    year: "2024",
    title: "GSAP4NOOBS",
    note: "A responsive Vue and GSAP learning experiment, publicly described by Thomas on LinkedIn.",
  },
  {
    year: "2024",
    title: "Task Manager",
    note: "A Vue, Tailwind and local-storage task tool, publicly described by Thomas on LinkedIn.",
  },
];

export const trace = [
  {
    time: "NOW",
    title: "CØDESTORM",
    note: "Current company listed on Thomas’s public profile; private client details are intentionally omitted.",
  },
  {
    time: "2024",
    title: "Public learning experiments",
    note: "GSAP4NOOBS and Task Manager explored responsive Vue interfaces, motion and local-first state.",
  },
  {
    time: "2023",
    title: "Java & Spring · Experis Academy",
    note: "Six-week intensive academy covering Java, Spring and databases.",
  },
];

export const chapters = [
  { id: "identity", code: "00", label: "Calibration" },
  { id: "principle", code: "01", label: "Operating principle" },
  { id: "fields", code: "02", label: "Fields" },
  { id: "cases", code: "03", label: "Case files" },
  { id: "trace", code: "04", label: "Trace" },
  { id: "contact", code: "05", label: "Transmit" },
] as const;
