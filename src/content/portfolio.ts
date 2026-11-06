export type Locale = "en" | "it";

export const locales: readonly Locale[] = ["en", "it"];
export const defaultLocale: Locale = "en";

export type ExternalLink = {
  label: string;
  href: string;
};

export type Capability = {
  code: string;
  title: string;
  description: string;
  proof: string;
};

export type CaseStudy = {
  id: string;
  code: string;
  title: string;
  kind: string;
  period: string;
  status: string;
  summary: string;
  context: string;
  role: string;
  /** Overrides the drawer label when the list describes scope rather than decisions. */
  decisionsLabel?: string;
  decisions: string[];
  technologies: string[];
  outcome: string;
  links: ExternalLink[];
  evidence: string;
};

export type ListItem = {
  time: string;
  title: string;
  note: string;
  link?: ExternalLink;
};

export type ChapterId = "identity" | "about" | "capabilities" | "work" | "experience" | "contact";

export type Chapter = {
  id: ChapterId;
  code: string;
  label: string;
};

export type ContactChannel = {
  kind: string;
  label: string;
  href: string;
  external: boolean;
};

export type PortfolioContent = {
  meta: { title: string; description: string };
  profile: {
    name: string;
    role: string;
    base: string;
    availability: string;
    thesis: { lead: string; emphasis: string };
    heroLede: string;
  };
  ui: {
    skipLink: string;
    languageGroup: string;
    languageNames: Record<Locale, string>;
    entryMeta: string;
    entryResolution: string;
    entryKicker: string;
    entryTitle: { lead: string; emphasis: string };
    entryButton: string;
    entryNoteMotion: string;
    entryNoteReduced: string;
    hudHome: string;
    hudNav: string;
    hudDepth: string;
    instrument: string;
    scrollCue: string;
    heroWork: string;
    heroEmail: string;
    visualLoading: string;
    visualFailed: string;
    visualRetry: string;
    drawerReport: string;
    drawerClose: string;
    drawerStatus: string;
    drawerPeriod: string;
    drawerContext: string;
    drawerRole: string;
    drawerDecisions: string;
    drawerTechnologies: string;
    drawerOutcome: string;
    drawerLinks: string;
    opensNewTab: string;
    footerNote: string;
  };
  chapters: Chapter[];
  about: {
    kicker: string;
    title: { lead: string; emphasis: string };
    lead: string;
    paragraphs: string[];
    facts: string[];
  };
  capabilitiesSection: { kicker: string; title: string };
  capabilities: Capability[];
  work: {
    kicker: string;
    title: string;
    intro: string;
    openSourceTitle: string;
    labTitle: string;
  };
  caseStudies: CaseStudy[];
  openSource: ListItem[];
  lab: ListItem[];
  experienceSection: {
    kicker: string;
    title: string;
    educationTitle: string;
  };
  experience: ListItem[];
  education: ListItem[];
  contact: {
    kicker: string;
    title: { lead: string; emphasis: string };
    body: string;
    note: string;
    channels: ContactChannel[];
  };
};

export const contactEmail = "thomasbasadonne@gmail.com";

const links = {
  email: `mailto:${contactEmail}`,
  github: "https://github.com/Thomas-Basadonne",
  linkedin: "https://www.linkedin.com/in/thomasbasadonne",
  promptify: "https://github.com/Thomas-Basadonne/promptify-raycast",
  ragsidian: "https://github.com/Thomas-Basadonne/obsidian-RAG",
  portfolio: "https://github.com/Thomas-Basadonne/portfolio",
  missionControl:
    "https://github.com/albidev/hermes-mission-control/pulls?q=is%3Apr+author%3AThomas-Basadonne+is%3Amerged",
  codexBar: "https://github.com/steipete/CodexBar/pull/4308",
} as const;

const technologies = {
  mapei: ["React", "PWA Studio", "Venia / Peregrine", "Apollo Client", "GraphQL", "Adobe Commerce"],
  twin: ["PHP", "Neo4j", "React 19", "TypeScript", "Sigma", "React Flow", "Docker"],
  privacyGuard: ["Tauri 2", "React", "TypeScript", "Rust", "Python sidecar", "On-device ML"],
  fetuseria: ["Next.js 16", "React 19", "Supabase", "PostgreSQL RLS", "Tailwind CSS", "PWA"],
  promptify: ["TypeScript", "React", "Raycast API", "Ollama"],
};

const en: PortfolioContent = {
  meta: {
    title: "Thomas Basadonne — Frontend Developer · Commerce & AI tools",
    description:
      "Frontend developer building enterprise B2B commerce with React and PWA Studio, and local-first AI tools that run on your own machine. Based in Italy, working remotely.",
  },
  profile: {
    name: "Thomas Basadonne",
    role: "Frontend Developer · Commerce & AI tools",
    base: "Italy · Remote",
    availability: "Open to AI projects, client sites and ambitious open source.",
    thesis: { lead: "Built to hold.", emphasis: " Wired to wonder." },
    heroLede:
      "I build storefronts that survive enterprise B2B traffic, and AI tools that keep your data on your own machine.",
  },
  ui: {
    skipLink: "Skip to content",
    languageGroup: "Language",
    languageNames: { en: "English", it: "Italiano" },
    entryMeta: "TB / Personal instrument",
    entryResolution: "Resolution 00.01",
    entryKicker: "A machine for useful deviations",
    entryTitle: { lead: "Measure what", emphasis: " survives complexity." },
    entryButton: "Calibrate / enter",
    entryNoteMotion: "Scroll controls inspection depth",
    entryNoteReduced: "Reduced-motion protocol active",
    hudHome: "Thomas Basadonne, frontend developer — back to start",
    hudNav: "Portfolio sections",
    hudDepth: "Inspection depth",
    instrument: "Instrument TB–001",
    scrollCue: "Turn to inspect",
    heroWork: "See selected work",
    heroEmail: "Email me",
    visualLoading: "Calibrating optional visual layer…",
    visualFailed: "Visual layer unavailable. Content remains complete.",
    visualRetry: "Retry visual layer",
    drawerReport: "inspection report",
    drawerClose: "Close",
    drawerStatus: "Status",
    drawerPeriod: "Period",
    drawerContext: "Context",
    drawerRole: "Role",
    drawerDecisions: "Decisions",
    drawerTechnologies: "Technologies",
    drawerOutcome: "Outcome",
    drawerLinks: "Links",
    opensNewTab: "(opens in a new tab)",
    footerNote: "Designed as one continuous instrument",
  },
  chapters: [
    { id: "identity", code: "00", label: "Start" },
    { id: "about", code: "01", label: "About" },
    { id: "capabilities", code: "02", label: "Capabilities" },
    { id: "work", code: "03", label: "Work" },
    { id: "experience", code: "04", label: "Experience" },
    { id: "contact", code: "05", label: "Contact" },
  ],
  about: {
    kicker: "01 / About",
    title: { lead: "Enterprise by day.", emphasis: " Local AI by night." },
    lead:
      "I'm a frontend developer at CØDESTORM. Since January 2025 I've been on the team building Mapei's B2B e-commerce: a headless PWA Studio storefront on Magento 2.",
    paragraphs: [
      "That work means custom product logic, dynamic PDF generation, the full purchase flow and integrations with external systems — inside a large codebase shared with many other developers.",
      "Outside client work I build tools I actually use, and most of them run locally: a desktop app that strips personal data before it reaches a cloud AI, a Raycast extension that turns rough prompts into structured ones with a local model, and an engine that maps a Magento codebase into a navigable graph without an LLM.",
      "I don't chase theoretical perfection. I care about interfaces that are fast, readable and honest about what they do — and about shipping things that work.",
    ],
    facts: ["Frontend at CØDESTORM", "Mapei B2B since 2025", "Italy · Remote"],
  },
  capabilitiesSection: {
    kicker: "02 / Capabilities",
    title: "One core. Six proven fields.",
  },
  capabilities: [
    {
      code: "01",
      title: "Core frontend",
      description: "React, TypeScript, Next.js App Router, Vite, Tailwind CSS and accessible, measurable UI.",
      proof: "Proof · Mapei · La Fetuseria · Mission Control · this site",
    },
    {
      code: "02",
      title: "Commerce",
      description: "Adobe Commerce / Magento 2 storefronts with PWA Studio, Venia, Peregrine, GraphQL and Apollo.",
      proof: "Proof · Mapei B2B",
    },
    {
      code: "03",
      title: "Product & backend",
      description: "Supabase and PostgreSQL with row-level security, Node, REST and GraphQL integrations, Odoo jobs.",
      proof: "Proof · La Fetuseria · Project Twin · Moto Morini",
    },
    {
      code: "04",
      title: "Local AI",
      description: "Ollama, on-device detection models and retrieval over personal knowledge with ChromaDB.",
      proof: "Proof · Privacy Guard · Promptify · RAGsidian",
    },
    {
      code: "05",
      title: "Desktop & tooling",
      description: "Tauri 2 apps, Raycast extensions, static analysis, Neo4j graphs and Docker-based workflows.",
      proof: "Proof · Privacy Guard · Promptify · Project Twin",
    },
    {
      code: "06",
      title: "Interactive & quality",
      description: "React Three Fiber and Remotion, backed by Vitest, Playwright, axe and Lighthouse gates.",
      proof: "Proof · Tolerance / 0.01 · Project Twin · La Fetuseria",
    },
  ],
  work: {
    kicker: "03 / Selected work",
    title: "Work, opened to the decisions inside.",
    intro:
      "Five projects with their context, my role and the decisions that shaped them. Co-developed work is labelled as such; client metrics stay with the client.",
    openSourceTitle: "Open source",
    labTitle: "Lab",
  },
  caseStudies: [
    {
      id: "mapei-b2b",
      code: "CF–01",
      title: "Mapei B2B Commerce",
      kind: "Client work via CØDESTORM",
      period: "Jan 2025 — present",
      status: "Ongoing",
      summary:
        "Headless PWA Studio storefront on Magento 2 for Mapei's B2B e-commerce, built inside a large enterprise team.",
      context:
        "Mapei's B2B e-commerce runs on Adobe Commerce with a headless PWA Studio storefront: a large monorepo with many contributors, long-lived branches, several languages and integrations with external systems.",
      role:
        "Frontend developer in a multi-developer team, assigned through CØDESTORM.",
      decisionsLabel: "Scope",
      decisions: [
        "Custom product and pricing logic in the PWA Studio storefront, on top of Venia and Peregrine.",
        "The purchase flow end to end: cart and ordering, stock and quantities, quick order and wishlist on mobile.",
        "Dynamic PDF generation, translations and integrations with external systems.",
        "Performance, UX refinements and internal automation for the enterprise team.",
      ],
      technologies: technologies.mapei,
      outcome:
        "An ongoing engagement on Mapei's B2B storefront. Business metrics belong to the client and are intentionally not published here.",
      links: [],
      evidence: "Evidence boundary: no client screenshots, code or internal numbers are shown.",
    },
    {
      id: "project-twin",
      code: "CF–02",
      title: "Project Twin",
      kind: "Side project",
      period: "Oct 2026",
      status: "Private · v0.7",
      summary:
        "A local digital twin of a Magento codebase: static analysis becomes a Neo4j graph you can explore, explain and impact-check — no LLM involved.",
      context:
        "Knowledge of a Magento project is spread across PHP classes, XML configuration (DI, plugins, events), GraphQL schemas and the PWA frontend. Onboarding usually means reading all of it by hand.",
      role:
        "Sole author: concept, scanner, graph model, explorer and release process. Started as a personal side project and presented to engineering teams.",
      decisions: [
        "No LLM in the core: every answer must be reproducible and traceable to a file and line.",
        "The graph models declarations, not execution — the UI says so and never implies an absence of bugs.",
        "Local and safe by default: one instance per user, source mounted read-only, scanner without network, database not exposed.",
        "Unresolved references are kept with a reason instead of being silently dropped.",
      ],
      technologies: technologies.twin,
      outcome:
        "Seven tagged releases in two weeks, CI quality gates, an extensive test suite, decision records and a one-click macOS launcher.",
      links: [],
      evidence: "Evidence boundary: the repository is private and real screenshots would expose client code.",
    },
    {
      id: "privacy-guard",
      code: "CF–03",
      title: "Privacy Guard",
      kind: "Co-developed with Alberto Sigismondi",
      period: "2026",
      status: "Private beta",
      summary:
        "A desktop app that redacts personal data from text and documents before they reach a cloud AI, with detection running on-device.",
      context:
        "People paste contracts, tickets and spreadsheets full of names, emails, IBANs and secrets into AI chats. Regex-only filters miss context; cloud DLP still sends the data out.",
      role:
        "Co-developer. My work concentrated on the React interface, the Tauri integration, documentation and the public website.",
      decisions: [
        "React UI → Tauri 2 IPC → Rust core → bundled model sidecar, so users never install Python.",
        "OpenAI's Privacy Filter model runs locally, with a deterministic Rust fallback when the model is unavailable.",
        "Documents (PDF, DOCX, XLSX, CSV, Markdown) are parsed on the device; redaction can mask, use placeholders or hash deterministically.",
        "A redaction eval suite enforces minimum precision and recall thresholds in the core's tests.",
      ],
      technologies: technologies.privacyGuard,
      outcome: "Private beta. The desktop release and its core repositories are not public yet.",
      links: [],
      evidence: "Evidence boundary: shared ownership; no download or open-source claim until the release is public.",
    },
    {
      id: "la-fetuseria",
      code: "CF–04",
      title: "La Fetuseria",
      kind: "Client project",
      period: "Sep 2026 — present",
      status: "In field test",
      summary:
        "A mobile-first operations agenda for a small hospitality business with six rooms, a restaurant and private events.",
      context:
        "The owner ran the day across a paper diary, WhatsApp and phone calls. The most frequent mistake was a booking on the wrong day.",
      role:
        "Sole developer: product discovery, UX, data model, implementation, tests and the project proposal.",
      decisions: [
        "The agenda is the single source of truth for availability; external requests are transcribed by hand in phase one instead of fragile integrations.",
        "Breakfasts derive from stays, so nothing is entered twice.",
        "Every save asks for an explicit confirmation of type, date and time — the error that mattered most.",
        "The public website is separate from the app: visitors can only send requests, which wait for approval.",
      ],
      technologies: technologies.fetuseria,
      outcome:
        "In field test with the owner. Row-level security is tested in SQL, and every change passes lint, typecheck, tests and build in CI.",
      links: [],
      evidence: "Evidence boundary: the app holds real customer data, so it is not publicly linked.",
    },
    {
      id: "promptify",
      code: "CF–05",
      title: "Promptify",
      kind: "Open source",
      period: "2025",
      status: "Public · sideload",
      summary:
        "A Raycast extension that rewrites a rough selection into a structured prompt with a local Ollama model.",
      context:
        "Good prompts follow a structure that nobody types by hand at speed. The fix had to live where the text already is, and work without sending it to a cloud API.",
      role: "Sole author: product, interface, provider layer and documentation.",
      decisions: [
        "Run on a local Ollama model by default, so selections never leave the machine.",
        "Three presets — general, image and code — plus custom presets with JSON import and export.",
        "Keep a bounded, exportable history instead of an opaque log.",
      ],
      technologies: technologies.promptify,
      outcome:
        "Public repository, installable through Raycast's developer mode. The Store submission was closed without review, so it is not listed there.",
      links: [{ label: "Source on GitHub", href: links.promptify }],
      evidence: "Evidence boundary: everything described here is inspectable in the public repository.",
    },
  ],
  openSource: [
    {
      time: "2026",
      title: "Hermes Mission Control",
      note:
        "15 merged pull requests to a local-first agent dashboard: provider-usage cards, searchable logs, a navigation palette, Kanban scoping, preserved config drafts and shell redesigns.",
      link: { label: "Merged pull requests", href: links.missionControl },
    },
    {
      time: "2026",
      title: "CodexBar",
      note: "Fixed Ollama free-plan usage parsing (#4308), credited in the v0.73.0 release notes.",
      link: { label: "Pull request #4308", href: links.codexBar },
    },
  ],
  lab: [
    {
      time: "2026",
      title: "Tolerance / 0.01",
      note: "This site: one React Three Fiber canvas, semantic HTML chapters, adaptive rendering and accessibility gates.",
      link: { label: "Source", href: links.portfolio },
    },
    {
      time: "2026",
      title: "AI apparel design platform",
      note: "Co-developed a live Next.js platform where customers design clothing with AI image generation and a canvas editor.",
    },
    {
      time: "2026",
      title: "RAG workspace SDK",
      note: "Contributed to the typed TypeScript SDK, its contract tests and OIDC npm release pipeline, plus frontend work, for a document RAG product.",
    },
    {
      time: "2026",
      title: "AI video digest pipeline",
      note: "Co-developed a pipeline that turns sources into vertical video digests with LLM curation, local TTS and Remotion.",
    },
    {
      time: "2024",
      title: "RAGsidian",
      note: "Chat with an Obsidian vault entirely on-device, with ChromaDB and Ollama. The public repository is the 2024 version.",
      link: { label: "Source", href: links.ragsidian },
    },
  ],
  experienceSection: {
    kicker: "04 / Experience",
    title: "Systems leave traces. Keep the useful ones.",
    educationTitle: "Education",
  },
  experience: [
    {
      time: "2025 —",
      title: "Frontend Developer · Mapei — CØDESTORM",
      note: "Headless PWA Studio frontend on Magento 2 for Mapei's B2B e-commerce: custom product logic, dynamic PDFs, full purchase flow, integrations, performance and UX.",
    },
    {
      time: "2024",
      title: "Backend Developer · Moto Morini — CØDESTORM",
      note: "Custom Odoo cron jobs for automatic FTP transfers: order and product sync and two-way price-list exchange with external systems.",
    },
    {
      time: "2024",
      title: "Frontend Developer · DonnaD — CØDESTORM",
      note: "A custom UI component library in vanilla JavaScript and BEM-structured SCSS, plus refactoring for performance and consistency.",
    },
    {
      time: "2024",
      title: "Frontend Developer · DR Automobiles — CØDESTORM",
      note: "Frontend of a custom AngularJS CRM: leads, customers, appointments, dynamic charts, interactive calendars and PDF reports.",
    },
  ],
  education: [
    {
      time: "2023",
      title: "Experis Academy · Java & Spring",
      note: "Web development intensive covering Java, Spring and databases.",
    },
    {
      time: "2022",
      title: "Boolean · Jr. Full-Stack Web Developer",
      note: "Full-time intensive programme: HTML, CSS, JavaScript, Vue, PHP, Laravel and team projects.",
    },
    {
      time: "2020",
      title: "I.I.S. Savoia Benincasa · Applied Sciences",
      note: "High-school diploma, 2015–2020.",
    },
  ],
  contact: {
    kicker: "05 / Contact",
    title: { lead: "Let's build something", emphasis: " that holds." },
    body:
      "I'm open to AI product work, websites for businesses that care about the details, and open-source projects that sound slightly unreasonable.",
    note: "Italy · Remote · replies in English or Italian",
    channels: [
      { kind: "Email", label: contactEmail, href: links.email, external: false },
      { kind: "Code", label: "GitHub", href: links.github, external: true },
      { kind: "Profile", label: "LinkedIn", href: links.linkedin, external: true },
    ],
  },
};

const it: PortfolioContent = {
  meta: {
    title: "Thomas Basadonne — Frontend Developer · Commerce & AI tools",
    description:
      "Frontend developer: e-commerce B2B enterprise con React e PWA Studio e strumenti AI local-first che girano sul tuo computer. In Italia, da remoto.",
  },
  profile: {
    name: "Thomas Basadonne",
    role: "Frontend Developer · Commerce & AI tools",
    base: "Italia · Remote",
    availability: "Disponibile per progetti AI, siti per clienti e open source ambizioso.",
    thesis: { lead: "Costruito per reggere.", emphasis: " Cablato per stupire." },
    heroLede:
      "Costruisco storefront che sostengono il traffico B2B enterprise e strumenti AI che tengono i tuoi dati sul tuo computer.",
  },
  ui: {
    skipLink: "Vai al contenuto",
    languageGroup: "Lingua",
    languageNames: { en: "English", it: "Italiano" },
    entryMeta: "TB / Strumento personale",
    entryResolution: "Risoluzione 00.01",
    entryKicker: "Una macchina per deviazioni utili",
    entryTitle: { lead: "Misura ciò che", emphasis: " regge la complessità." },
    entryButton: "Calibra / entra",
    entryNoteMotion: "Lo scroll controlla la profondità",
    entryNoteReduced: "Protocollo movimento ridotto attivo",
    hudHome: "Thomas Basadonne, frontend developer — torna all'inizio",
    hudNav: "Sezioni del portfolio",
    hudDepth: "Profondità di ispezione",
    instrument: "Strumento TB–001",
    scrollCue: "Scorri per ispezionare",
    heroWork: "Guarda i progetti",
    heroEmail: "Scrivimi",
    visualLoading: "Calibrazione del livello visivo opzionale…",
    visualFailed: "Livello visivo non disponibile. Il contenuto resta completo.",
    visualRetry: "Riprova il livello visivo",
    drawerReport: "rapporto di ispezione",
    drawerClose: "Chiudi",
    drawerStatus: "Stato",
    drawerPeriod: "Periodo",
    drawerContext: "Contesto",
    drawerRole: "Ruolo",
    drawerDecisions: "Decisioni",
    drawerTechnologies: "Tecnologie",
    drawerOutcome: "Risultato",
    drawerLinks: "Link",
    opensNewTab: "(si apre in una nuova scheda)",
    footerNote: "Progettato come un unico strumento continuo",
  },
  chapters: [
    { id: "identity", code: "00", label: "Inizio" },
    { id: "about", code: "01", label: "Chi sono" },
    { id: "capabilities", code: "02", label: "Competenze" },
    { id: "work", code: "03", label: "Progetti" },
    { id: "experience", code: "04", label: "Esperienza" },
    { id: "contact", code: "05", label: "Contatti" },
  ],
  about: {
    kicker: "01 / Chi sono",
    title: { lead: "Enterprise di giorno.", emphasis: " AI locale di notte." },
    lead:
      "Sono frontend developer in CØDESTORM. Da gennaio 2025 lavoro nel team che sviluppa l'e-commerce B2B di Mapei: uno storefront headless PWA Studio su Magento 2.",
    paragraphs: [
      "Vuol dire logiche di prodotto custom, PDF dinamici, l'intero flusso d'acquisto e integrazioni con sistemi esterni, dentro una codebase ampia condivisa con molti altri sviluppatori.",
      "Fuori dai progetti cliente costruisco strumenti che uso davvero, quasi sempre in locale: un'app desktop che rimuove i dati personali prima che arrivino a un'AI in cloud, un'estensione Raycast che trasforma prompt grezzi in prompt strutturati con un modello locale, e un motore che mappa una codebase Magento in un grafo navigabile, senza LLM.",
      "Non inseguo la perfezione teorica: punto a interfacce veloci, chiare e oneste su ciò che fanno, e a consegnare cose che funzionano.",
    ],
    facts: ["Frontend in CØDESTORM", "Mapei B2B dal 2025", "Italia · Remote"],
  },
  capabilitiesSection: {
    kicker: "02 / Competenze",
    title: "Un nucleo. Sei campi dimostrati.",
  },
  capabilities: [
    {
      code: "01",
      title: "Frontend",
      description: "React, TypeScript, Next.js App Router, Vite, Tailwind CSS e interfacce accessibili e misurabili.",
      proof: "Prove · Mapei · La Fetuseria · Mission Control · questo sito",
    },
    {
      code: "02",
      title: "Commerce",
      description: "Storefront Adobe Commerce / Magento 2 con PWA Studio, Venia, Peregrine, GraphQL e Apollo.",
      proof: "Prove · Mapei B2B",
    },
    {
      code: "03",
      title: "Prodotto & backend",
      description: "Supabase e PostgreSQL con row-level security, Node, integrazioni REST e GraphQL, job Odoo.",
      proof: "Prove · La Fetuseria · Project Twin · Moto Morini",
    },
    {
      code: "04",
      title: "AI locale",
      description: "Ollama, modelli di rilevamento on-device e retrieval su conoscenza personale con ChromaDB.",
      proof: "Prove · Privacy Guard · Promptify · RAGsidian",
    },
    {
      code: "05",
      title: "Desktop & tooling",
      description: "App Tauri 2, estensioni Raycast, analisi statica, grafi Neo4j e flussi basati su Docker.",
      proof: "Prove · Privacy Guard · Promptify · Project Twin",
    },
    {
      code: "06",
      title: "Interattività & qualità",
      description: "React Three Fiber e Remotion, con gate Vitest, Playwright, axe e Lighthouse.",
      proof: "Prove · Tolerance / 0.01 · Project Twin · La Fetuseria",
    },
  ],
  work: {
    kicker: "03 / Progetti",
    title: "Progetti, aperti fino alle decisioni.",
    intro:
      "Cinque progetti con contesto, il mio ruolo e le decisioni che li hanno definiti. Il lavoro co-sviluppato è indicato come tale; le metriche dei clienti restano ai clienti.",
    openSourceTitle: "Open source",
    labTitle: "Lab",
  },
  caseStudies: [
    {
      id: "mapei-b2b",
      code: "CF–01",
      title: "Mapei B2B Commerce",
      kind: "Progetto cliente con CØDESTORM",
      period: "Gen 2025 — oggi",
      status: "In corso",
      summary:
        "Storefront headless PWA Studio su Magento 2 per l'e-commerce B2B di Mapei, sviluppato dentro un ampio team enterprise.",
      context:
        "L'e-commerce B2B di Mapei gira su Adobe Commerce con uno storefront headless PWA Studio: un monorepo ampio con molti contributor, branch di lunga durata, più lingue e integrazioni con sistemi esterni.",
      role: "Frontend developer in un team di più sviluppatori, in consulenza tramite CØDESTORM.",
      decisionsLabel: "Perimetro",
      decisions: [
        "Logiche di prodotto e prezzo custom nello storefront PWA Studio, su Venia e Peregrine.",
        "Il flusso d'acquisto end to end: carrello e ordini, stock e quantità, quick order e wishlist su mobile.",
        "Generazione di PDF dinamici, traduzioni e integrazioni con sistemi esterni.",
        "Performance, rifiniture UX e automazioni interne per il team enterprise.",
      ],
      technologies: technologies.mapei,
      outcome:
        "Un progetto in corso sullo storefront B2B di Mapei. Le metriche di business sono del cliente e volutamente non sono pubblicate.",
      links: [],
      evidence: "Limite delle prove: nessuno screenshot, codice o numero interno del cliente.",
    },
    {
      id: "project-twin",
      code: "CF–02",
      title: "Project Twin",
      kind: "Progetto personale",
      period: "Ott 2026",
      status: "Privato · v0.7",
      summary:
        "Un digital twin locale di una codebase Magento: l'analisi statica diventa un grafo Neo4j da esplorare, spiegare e valutare per impatto, senza LLM.",
      context:
        "La conoscenza di un progetto Magento è distribuita tra classi PHP, configurazione XML (DI, plugin, eventi), schemi GraphQL e frontend PWA. L'onboarding di solito significa leggere tutto a mano.",
      role:
        "Autore unico: ideazione, scanner, modello del grafo, interfaccia di esplorazione e processo di release. Il progetto è nato come lavoro personale ed è stato presentato ai team di sviluppo.",
      decisions: [
        "Nessun LLM nel core: ogni risposta deve essere riproducibile e riconducibile a un file e a una riga.",
        "Il grafo rappresenta dichiarazioni, non esecuzione: la UI lo dice e non suggerisce mai l'assenza di bug.",
        "Locale e sicuro di default: un'istanza per utente, codice sorgente montato in sola lettura, scanner senza rete, database non esposto.",
        "I riferimenti non risolti restano nel grafo con un motivo, invece di sparire in silenzio.",
      ],
      technologies: technologies.twin,
      outcome:
        "Sette release taggate in due settimane, quality gate in CI, una suite di test ampia, decision record e un launcher macOS con un clic.",
      links: [],
      evidence: "Limite delle prove: il repository è privato e screenshot reali esporrebbero codice cliente.",
    },
    {
      id: "privacy-guard",
      code: "CF–03",
      title: "Privacy Guard",
      kind: "Co-sviluppato con Alberto Sigismondi",
      period: "2026",
      status: "Beta privata",
      summary:
        "Un'app desktop che rimuove i dati personali da testi e documenti prima che arrivino a un'AI in cloud, con il rilevamento che gira sul dispositivo.",
      context:
        "Le persone incollano nelle chat AI contratti, ticket e fogli di calcolo pieni di nomi, email, IBAN e segreti. I filtri solo regex perdono il contesto; i DLP in cloud i dati li mandano fuori comunque.",
      role:
        "Co-developer. Il mio lavoro si è concentrato su interfaccia React, integrazione Tauri, documentazione e sito pubblico.",
      decisions: [
        "UI React → IPC Tauri 2 → core Rust → sidecar del modello incluso, così l'utente non deve installare Python.",
        "Il modello Privacy Filter di OpenAI gira in locale, con un fallback deterministico in Rust quando il modello non è disponibile.",
        "I documenti (PDF, DOCX, XLSX, CSV, Markdown) vengono letti sul dispositivo; la redazione può mascherare, usare placeholder o un hash deterministico.",
        "Una suite di eval sulla redazione impone soglie minime di precision e recall nei test del core.",
      ],
      technologies: technologies.privacyGuard,
      outcome: "Beta privata. La release desktop e i repository del core non sono ancora pubblici.",
      links: [],
      evidence: "Limite delle prove: ownership condivisa; nessun download o claim open source finché la release non è pubblica.",
    },
    {
      id: "la-fetuseria",
      code: "CF–04",
      title: "La Fetuseria",
      kind: "Progetto cliente",
      period: "Set 2026 — oggi",
      status: "In prova sul campo",
      summary:
        "Un'agenda operativa mobile-first per una piccola struttura ricettiva con sei camere, ristorante ed eventi privati.",
      context:
        "La titolare gestiva la giornata tra agenda cartacea, WhatsApp e telefono. L'errore più frequente era una prenotazione nel giorno sbagliato.",
      role:
        "Unico sviluppatore: analisi del prodotto, UX, modello dati, implementazione, test e proposta di progetto.",
      decisions: [
        "L'agenda è l'unica fonte di verità sulla disponibilità; nella prima fase le richieste esterne si trascrivono a mano invece di usare integrazioni fragili.",
        "Le colazioni derivano dai soggiorni, così niente si inserisce due volte.",
        "Ogni salvataggio chiede conferma esplicita di tipo, data e ora: l'errore che contava di più.",
        "Il sito pubblico è separato dall'app: i visitatori possono solo inviare richieste, che restano in attesa di approvazione.",
      ],
      technologies: technologies.fetuseria,
      outcome:
        "In prova sul campo con la titolare. La row-level security è testata in SQL e ogni modifica passa lint, typecheck, test e build in CI.",
      links: [],
      evidence: "Limite delle prove: l'app contiene dati reali dei clienti, quindi non ha un link pubblico.",
    },
    {
      id: "promptify",
      code: "CF–05",
      title: "Promptify",
      kind: "Open source",
      period: "2025",
      status: "Pubblico · sideload",
      summary:
        "Un'estensione Raycast che riscrive una selezione grezza in un prompt strutturato con un modello Ollama locale.",
      context:
        "I buoni prompt seguono una struttura che nessuno scrive a mano quando va di fretta. La soluzione doveva vivere dove il testo già si trova, senza mandarlo a un'API in cloud.",
      role: "Autore unico: prodotto, interfaccia, livello provider e documentazione.",
      decisions: [
        "Usare per default un modello Ollama locale, così la selezione non lascia mai il computer.",
        "Tre preset — generale, immagini e codice — più preset personalizzati con import ed export JSON.",
        "Tenere uno storico limitato ed esportabile invece di un log opaco.",
      ],
      technologies: technologies.promptify,
      outcome:
        "Repository pubblico, installabile tramite la developer mode di Raycast. La submission allo Store è stata chiusa senza revisione, quindi non è elencata lì.",
      links: [{ label: "Codice su GitHub", href: links.promptify }],
      evidence: "Limite delle prove: tutto ciò che è descritto qui è verificabile nel repository pubblico.",
    },
  ],
  openSource: [
    {
      time: "2026",
      title: "Hermes Mission Control",
      note:
        "15 pull request merged in una dashboard local-first per agenti: card di utilizzo dei provider, log ricercabili, palette di navigazione, scoping del Kanban, bozze di configurazione preservate e redesign della shell.",
      link: { label: "Pull request merged", href: links.missionControl },
    },
    {
      time: "2026",
      title: "CodexBar",
      note: "Corretto il parsing dell'utilizzo del piano gratuito di Ollama (#4308), citato nelle release notes della v0.73.0.",
      link: { label: "Pull request #4308", href: links.codexBar },
    },
  ],
  lab: [
    {
      time: "2026",
      title: "Tolerance / 0.01",
      note: "Questo sito: un solo canvas React Three Fiber, capitoli HTML semantici, rendering adattivo e gate di accessibilità.",
      link: { label: "Codice", href: links.portfolio },
    },
    {
      time: "2026",
      title: "Piattaforma AI per il design di abbigliamento",
      note: "Co-sviluppata una piattaforma Next.js in produzione dove i clienti disegnano capi con generazione di immagini AI e un editor su canvas.",
    },
    {
      time: "2026",
      title: "SDK per workspace RAG",
      note: "Contributo all'SDK TypeScript tipizzato, ai suoi contract test e alla pipeline di release npm via OIDC, più lavoro frontend, per un prodotto RAG su documenti.",
    },
    {
      time: "2026",
      title: "Pipeline AI di video digest",
      note: "Co-sviluppata una pipeline che trasforma fonti in video verticali con curatela LLM, TTS locale e Remotion.",
    },
    {
      time: "2024",
      title: "RAGsidian",
      note: "Chat con un vault Obsidian interamente sul dispositivo, con ChromaDB e Ollama. Il repository pubblico è la versione 2024.",
      link: { label: "Codice", href: links.ragsidian },
    },
  ],
  experienceSection: {
    kicker: "04 / Esperienza",
    title: "I sistemi lasciano tracce. Tieni quelle utili.",
    educationTitle: "Formazione",
  },
  experience: [
    {
      time: "2025 —",
      title: "Frontend Developer · Mapei — CØDESTORM",
      note: "Frontend headless PWA Studio su Magento 2 per l'e-commerce B2B di Mapei: logiche di prodotto custom, PDF dinamici, flusso d'acquisto completo, integrazioni, performance e UX.",
    },
    {
      time: "2024",
      title: "Backend Developer · Moto Morini — CØDESTORM",
      note: "Cron job Odoo personalizzati per trasferimenti FTP automatici: sincronizzazione di ordini e prodotti e scambio bidirezionale dei listini con sistemi esterni.",
    },
    {
      time: "2024",
      title: "Frontend Developer · DonnaD — CØDESTORM",
      note: "Una libreria di componenti UI custom in JavaScript vanilla e SCSS strutturato in BEM, più refactoring per performance e coerenza.",
    },
    {
      time: "2024",
      title: "Frontend Developer · DR Automobiles — CØDESTORM",
      note: "Frontend di un CRM custom in AngularJS: lead, clienti, appuntamenti, grafici dinamici, calendari interattivi e report PDF.",
    },
  ],
  education: [
    {
      time: "2023",
      title: "Experis Academy · Java & Spring",
      note: "Corso intensivo di web development su Java, Spring e database.",
    },
    {
      time: "2022",
      title: "Boolean · Jr. Full-Stack Web Developer",
      note: "Corso intensivo full-time: HTML, CSS, JavaScript, Vue, PHP, Laravel e progetti in team.",
    },
    {
      time: "2020",
      title: "I.I.S. Savoia Benincasa · Scienze Applicate",
      note: "Diploma, 2015–2020.",
    },
  ],
  contact: {
    kicker: "05 / Contatti",
    title: { lead: "Costruiamo qualcosa", emphasis: " che regga." },
    body:
      "Sono disponibile per progetti AI, siti per aziende che tengono ai dettagli e progetti open source un po' irragionevoli.",
    note: "Italia · Remote · rispondo in italiano o inglese",
    channels: [
      { kind: "Email", label: contactEmail, href: links.email, external: false },
      { kind: "Codice", label: "GitHub", href: links.github, external: true },
      { kind: "Profilo", label: "LinkedIn", href: links.linkedin, external: true },
    ],
  },
};

export const portfolioContent: Record<Locale, PortfolioContent> = { en, it };

export function getContent(locale: Locale): PortfolioContent {
  return portfolioContent[locale];
}

export const chapterCount = en.chapters.length;

/** Section ids used before the November 2026 refresh, kept so old shared links still land. */
export const legacySectionIds: Record<string, ChapterId> = {
  principle: "about",
  fields: "capabilities",
  cases: "work",
  trace: "experience",
};
