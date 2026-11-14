# Portfolio content audit — estratto sanificato

> **ARCHIVIO — fonte del 17 luglio 2026, non descrizione del sito corrente.**
> Estratto preparato per SYS-01; pubblicazione autorizzata il 14 novembre 2026.
> Conservata la tabella editoriale ED-001–ED-018, esclusa la voce archive non pertinente.
> Le sezioni non pertinenti o non pubblicabili sono omesse integralmente. Non è una copia completa.
> Gli originali locali sono preservati; nessun allegato o file referenziato è incluso.
> I testi al presente e le proposte nelle sezioni seguenti appartengono alla data della fonte.
> Per lo stato corrente: [`src/content/portfolio.ts`](../../src/content/portfolio.ts), decisioni GitHub
> e `docs/SYS-01_AUDIT.md` (audit del 13 novembre). Questo archivio non autorizza patch.

## Finding editoriali — fotografia storica del 17 luglio

La colonna «attuale» si riferisce a luglio, non alla baseline SYS-01. In particolare il ruolo
«Commerce & Interactive Systems» era una proposta: il ruolo approvato è quello del contenuto corrente.

| ID | Area | Testo/stato attuale (luglio) | Problema | Impatto | Proposta storica | Priorità storica | Informazione mancante allora | Verifica proposta allora |
|---|---|---|---|---|---|---|---|---|
| ED-001 | Entry | `Measure what survives complexity.` | Prima schermata memorabile ma non dice chi è Thomas | Alto | Mostrare nome e ruolo nell'entry; mantenere la frase come thesis secondaria | P0 | Nessuna | Test di comprensione a 5 secondi |
| ED-002 | Hero | `Frontend & Creative Developer` | Non comunica commerce, UI complesse o AI; `creative` può sembrare design-only | Alto | `Frontend Developer · Commerce & Interactive Systems` | P0 | Titolo professionale preferito | Coerenza con LinkedIn/CV |
| ED-003 | Hero | `Built to hold. Wired to wonder.` | Ottima tesi, ma non è una value proposition autonoma | Medio | Mantenerla e aggiungere una subheadline concreta | P0 | Nessuna | Verificare lunghezza/layout |
| ED-004 | About | `systems that stay clear under pressure` | Astratto: non indica quali sistemi o pressioni | Alto | Nominare commerce, UI complesse, GraphQL e vincoli reali | P0 | Responsabilità enterprise | Thomas conferma il perimetro |
| ED-005 | About | `move between browser, backend and workbench` | Formula elegante ma vaga e potenzialmente AI-like | Medio | Collegare browser/backend a Promptify, RAGsidian e portfolio | P1 | Ruolo personale nei progetti | Repository + Thomas |
| ED-006 | Skill | `One core. Five operating fields.` | Cinque campi danno la stessa importanza a professione e hobby | Alto | Tre livelli: core work, professional domain, experiments | P0 | Livello reale per stack | Thomas + case study |
| ED-007 | Commerce | Claim Adobe Commerce/ACO/PWA/GraphQL | Nessuna prova o responsabilità collegata | Molto alto | Case study anonimo con problema, ruolo, vincoli e decisioni | P0 | Tutti i dati del case | Autorizzazione aziendale |
| ED-008 | AI | `Intelligent products` | Categoria generica mentre esistono prodotti nominabili | Alto | Presentare Promptify e RAGsidian per nome e problema | P0 | Stato/release/ruolo | Repository + Thomas |
| ED-009 | Maker | `Physical curiosity` | Sembra hobby vago e occupa spazio pari al core | Medio | Spostare 3D printing/hardware in una nota About o Lab | P2 | Progetto pubblico concreto | Thomas |
| ED-010 | Projects | Un solo case study sul portfolio | Il contenitore diventa la prova principale di se stesso | Molto alto | Aggiungere Promptify, RAGsidian e un case commerce | P0 | Materiale case commerce | Fonte locale non inclusa |
| ED-011 | Case study | Drawer con 5 campi | Mancano contesto, vincoli, processo, difficoltà, outcome e riflessione | Alto | Usare la struttura completa proposta | P1 | Riflessione personale | Thomas |
| ED-012 | Case links | Nessun link in `Tolerance / 0.01` | Il visitatore non può aprire source o live build dal case | Alto | `Open live portfolio` e `Review source code` | P0 | Nessuna | HTTP 200 verificato |
| ED-014 | Experience | `NOW / CØDESTORM` | Nessun ruolo, data, responsabilità o scope | Molto alto | Scheda esperienza con titolo esatto e 2–4 contributi | P0 | Titolo, date, responsabilità | Thomas/LinkedIn |
| ED-015 | Experience | Experis più dettagliata del lavoro attuale | Fa percepire il profilo come ancora formativo | Alto | Ridurre formazione e dare priorità al lavoro corrente | P1 | Dati CØDESTORM | Thomas |
| ED-016 | Contact | Solo LinkedIn e GitHub | Nessun canale diretto o contesto per il contatto | Molto alto | Email, disponibilità, opportunità, CV aggiornato | P0 | Preferenze/availability/CV | Thomas |
| ED-017 | CTA | `Open channel` | Label tematica non descrittiva | Medio | `Message on LinkedIn`, `Review code on GitHub`, `Email Thomas` | P1 | Nessuna | Controllo accessibilità |
| ED-018 | Metadata | `Tolerance / 0.01` domina il title | Il concept è più visibile del ruolo nelle condivisioni e ricerche | Medio | Title professionale; concept nell'OG subtitle | P1 | Dominio definitivo | Preview social |
