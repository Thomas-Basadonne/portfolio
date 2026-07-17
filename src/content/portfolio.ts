export type SocialLink = {
  label: string;
  href: string;
  placeholder?: boolean;
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
  status: "content-needed" | "published";
};

export const CONTENT_NEEDED = "CONTENT NEEDED — replace this value in src/content/portfolio.ts";

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
  availability: CONTENT_NEEDED,
  email: CONTENT_NEEDED,
} as const;

export const socials: SocialLink[] = [
  {
    label: "LinkedIn",
    href: "https://it.linkedin.com/in/thomasbasadonne",
  },
  {
    label: "GitHub",
    href: "#content-needed",
    placeholder: true,
  },
  {
    label: "CV / Résumé",
    href: "#content-needed",
    placeholder: true,
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

const missingDecisions = [
  "Add the verified architectural constraint and the alternatives considered.",
  "Add the decision Thomas owned and why it mattered.",
  "Add one implementation detail that a developer would want to inspect.",
];

export const caseStudies: CaseStudy[] = [
  {
    id: "commerce",
    code: "CF–01",
    title: "Enterprise commerce case file",
    kind: "Reserved specimen / commerce",
    summary: "A reserved case-study slot for the strongest verified Adobe Commerce or B2B project.",
    problem: CONTENT_NEEDED,
    role: CONTENT_NEEDED,
    decisions: missingDecisions,
    technologies: ["Add verified project stack"],
    impact: CONTENT_NEEDED,
    status: "content-needed",
  },
  {
    id: "ai",
    code: "CF–02",
    title: "Intelligent product case file",
    kind: "Reserved specimen / AI",
    summary: "A reserved case-study slot for an LLM, RAG, local AI or intelligent-workflow product.",
    problem: CONTENT_NEEDED,
    role: CONTENT_NEEDED,
    decisions: missingDecisions,
    technologies: ["Add verified project stack"],
    impact: CONTENT_NEEDED,
    status: "content-needed",
  },
  {
    id: "experiment",
    code: "CF–03",
    title: "Experimental build case file",
    kind: "Reserved specimen / workshop",
    summary: "A reserved case-study slot for hardware, 3D printing or a creative-code experiment.",
    problem: CONTENT_NEEDED,
    role: CONTENT_NEEDED,
    decisions: missingDecisions,
    technologies: ["Add verified project stack"],
    impact: CONTENT_NEEDED,
    status: "content-needed",
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
    title: "Frontend development · CØDESTORM",
    note: "Current company verified from the public profile. Exact role title and dates still need confirmation.",
    incomplete: true,
  },
  {
    time: "2023",
    title: "Java & Spring · Experis Academy",
    note: "Six-week intensive academy covering Java, Spring and databases.",
    incomplete: false,
  },
  {
    time: "EARLIER",
    title: "Trace data requested",
    note: "Add verified roles, education and dates in this file to complete the professional path.",
    incomplete: true,
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
