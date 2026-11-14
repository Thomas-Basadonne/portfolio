# Portfolio master copy — estratto sanificato

> **ARCHIVIO — fonte del 5 novembre 2026, con note fino al 12 novembre, non descrizione del sito corrente.**
> Estratto preparato per SYS-01; pubblicazione autorizzata il 14 novembre 2026.
> Conservati identity sheet e copy selezionato: §§1, 3.1–3.3, 3.5, 3.7, 3.11–3.12.
> Le sezioni non pertinenti o non pubblicabili sono omesse integralmente. Non è una copia completa.
> Gli originali locali sono preservati; nessun allegato o file referenziato è incluso.
> I testi al presente e le proposte nelle sezioni seguenti appartengono alla data della fonte.
> Per lo stato corrente: [`src/content/portfolio.ts`](../../src/content/portfolio.ts), decisioni GitHub
> e `docs/SYS-01_AUDIT.md` (audit del 13 novembre). Questo archivio non autorizza patch.

Il nome «master» identifica il documento di provenienza, non una nuova fonte unica.
Il copy effettivo, incluse didascalie, evidenze e stati, vive nel modulo contenuto.
OG/title e microcopy qui possono essere superati dalle decisioni #44 e #26.
Legenda della fonte: [F] verificato nella ricognizione originaria; [T] dichiarato da Thomas.
Non sono verifiche ripetute durante SYS-01.

## 1. Identity sheet

| Campo | Valore | Fonte |
|---|---|---|
| Nome | Thomas Basadonne | [F] |
| Titolo pubblico | **Frontend Developer · Commerce & AI tools** | approvato 10/11/2026 (DEC-00 #45) |
| Datore di lavoro | **CØDESTORM**, frontend developer in consulenza; dal 2024 su progetti cliente, da gennaio 2025 su Mapei | [F] LinkedIn + [T] |
| Base | **Italy · Remote** | [T] |
| Email pubblica | `thomasbasadonne@gmail.com` | [T] |
| Telefono | non pubblicato | scelta di privacy |
| Lingua del sito | **EN di default, IT secondaria** | [T] |
| Cerca | progetti AI · siti per clienti · progetti open source fuori dagli schemi | [T] |
| Link | GitHub `github.com/Thomas-Basadonne` · LinkedIn `linkedin.com/in/thomasbasadonne` · Portfolio `thomas-basadonne-portfolio.thomasbasadonne.workers.dev` (dal 10/11/2026; prima `netlify.app`) | [F] |

### 3.1 Metadata

- **Title:** `Thomas Basadonne — Frontend Developer · Commerce & AI tools`
- **Description (EN):** `Frontend developer building enterprise B2B commerce with React and PWA Studio, and local-first AI tools that run on your own machine. Based in Italy, working remotely.`
- **Description (IT):** `Frontend developer: e-commerce B2B enterprise con React e PWA Studio e strumenti AI local-first che girano sul tuo computer. In Italia, da remoto.`
- **OG title:** `Thomas Basadonne — Built to hold. Wired to wonder.`
- **OG image alt:** `The Tolerance instrument: a calibrated machine opening into rings, with the name Thomas Basadonne.`

### 3.2 Hero

**EN**
> **Thomas Basadonne**
> Frontend Developer · Commerce & AI tools
>
> # Built to hold. Wired to wonder.
>
> I build storefronts that survive enterprise B2B traffic, and AI tools that keep your data on your own machine.
>
> [See selected work] [Email me]
> `Italy · Remote — open to AI projects, client sites and ambitious open source.`

**IT**
> **Thomas Basadonne**
> Frontend Developer · Commerce & AI tools
>
> # Costruito per reggere. Cablato per stupire.
>
> Costruisco storefront che reggono il traffico B2B enterprise e strumenti AI che tengono i tuoi dati sul tuo computer.
>
> [Guarda i progetti] [Scrivimi]
> `Italia · Remote — disponibile per progetti AI, siti per clienti e open source ambizioso.`

### 3.3 About

**EN**
> I'm a frontend developer at CØDESTORM. Since January 2025 I've been on the team building Mapei's B2B e-commerce: a headless PWA Studio storefront on Magento 2, with custom product logic, dynamic PDF generation, the full purchase flow and integrations with external systems.
>
> Outside client work I build tools I actually use. Most of them run locally: a desktop app that strips personal data before it reaches a cloud AI, a Raycast extension that turns rough prompts into structured ones with a local model, and a static-analysis engine that maps a Magento codebase into a navigable graph without an LLM.
>
> I don't chase theoretical perfection. I care about interfaces that are fast, readable and honest about what they do, and about shipping things that work.

**IT**
> Sono frontend developer in CØDESTORM. Da gennaio 2025 lavoro nel team che sviluppa l'e-commerce B2B di Mapei: storefront headless PWA Studio su Magento 2, con logiche di prodotto custom, PDF dinamici, l'intero flusso d'acquisto e integrazioni con sistemi esterni.
>
> Fuori dai progetti cliente costruisco strumenti che uso davvero, quasi sempre in locale: un'app desktop che rimuove i dati personali prima che arrivino a un'AI in cloud, un'estensione Raycast che trasforma prompt grezzi in prompt strutturati con un modello locale, e un motore di analisi statica che mappa una codebase Magento in un grafo navigabile, senza LLM.
>
> Non inseguo la perfezione teorica: punto a interfacce veloci, chiare e oneste su ciò che fanno, e a consegnare cose che funzionano.

### 3.5 Selected work: card

**01 · Mapei B2B Commerce** — *Client work via CØDESTORM · 2025–present*
> Headless PWA Studio storefront on Magento 2 for Mapei's B2B e-commerce: custom product logic, dynamic PDFs, the full purchase flow and external integrations, built inside a large enterprise team.
> `React · PWA Studio · GraphQL · Adobe Commerce`

**02 · Project Twin** — *Side project · 2026*
> A local "digital twin" of a Magento codebase. Static analysis of PHP, XML, GraphQL and PWA code becomes a Neo4j knowledge graph you can explore, explain and impact-check, with no LLM involved.
> `PHP · Neo4j · React 19 · Sigma · React Flow · Docker`

**03 · Privacy Guard** — *Co-developed with Alberto Sigismondi · 2026*
> A desktop app that redacts personal data from text and documents before you paste them into a cloud AI. Detection runs on-device with OpenAI's Privacy Filter model and falls back to deterministic rules.
> `Tauri 2 · React · Rust · on-device ML`

**04 · La Fetuseria** — *Client project · 2026*
> A mobile-first operations agenda for a small hospitality business with six rooms, a restaurant and events. Stays, breakfasts, bookings and reminders that used to live in paper, WhatsApp and phone calls now sit in one installable app.
> `Next.js 16 · Supabase · Tailwind · PWA`

**05 · Promptify** — *Open source · 2025*
> A Raycast extension that rewrites a rough selection into a structured prompt using a local Ollama model, with presets for general, image and code prompts plus exportable history.
> `TypeScript · React · Raycast API · Ollama`

**06 · SGAGGIO — Side hustle · 2026**
> Card pubblicata: il copy vive in `src/content/portfolio.ts` (`id: "sgaggio"`, EN e IT) e non è ripetuto qui.

### 3.7 Open source

> **Hermes Mission Control** — Merged contributions to a public, MIT-licensed local-first dashboard for the Hermes agent. Work includes provider-usage cards, a log view with search and level filters, a navigation command palette, Kanban scoping, preserved config drafts, telemetry burst handling and sidebar/shell redesigns. Credited in the release notes.
> `github.com/albidev/hermes-mission-control/pulls?q=author:Thomas-Basadonne`
>
> **CodexBar** — fixed Ollama free-plan usage parsing (#4308, merged 7 Oct 2026), credited in the v0.73.0 release notes.
> `github.com/steipete/CodexBar/pull/4308`

### 3.11 Contact

**EN**
> ## Let's build something that holds.
> I'm open to AI product work, websites for businesses that care about the details, and open-source projects that sound slightly unreasonable.
> **[thomasbasadonne@gmail.com]** · [GitHub] · [LinkedIn]
> `Italy · Remote · replies in English or Italian`

**IT**
> ## Costruiamo qualcosa che regga.
> Sono disponibile per progetti AI, siti per aziende che tengono ai dettagli e progetti open source un po' irragionevoli.
> **[thomasbasadonne@gmail.com]** · [GitHub] · [LinkedIn]
> `Italia · Remote · rispondo in italiano o inglese`

### 3.12 Nav e microcopy

- Nav EN: `About · Work · Open source · Lab · Experience · Contact` (i codici capitolo 00–05 restano come label visive).
- Nav IT: `Chi sono · Progetti · Open source · Lab · Esperienza · Contatti`
- Language switch: `EN / IT`, con `aria-label="Switch language to Italian"` e la versione IT corrispondente.
- Etichette di stato dei progetti: `Live` (solo con URL 200 verificato) · `Private beta` · `In field test` · `Prototype` · `Archived`.
- Etichetta di ownership: `Solo` · `Co-developed with Alberto Sigismondi` · `Team project` · `Contributor`.

## Precedenza delle decisioni correnti

- #44: identità e metadata coerenti col ruolo pubblico.
- #26: titolo inglese identico IT/EN, lessico dello strumento e grana conservati; frecce interne/esterne distinte.
- #48: SGAGGIO come side hustle, senza promesse commerciali.
- #49: regia portrait e banda di lettura approvate.
- #51: audit del sistema; implementazione nei follow-up #79–#82, non in questo archivio.
