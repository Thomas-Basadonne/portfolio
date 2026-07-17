# Portfolio Technical Audit

> **Documento storico pre-remediation.** Tutti i finding tecnici qui elencati sono stati chiusi nella
> release del 17 luglio 2026. La rivalutazione, le evidenze e la matrice di risoluzione sono in
> [`PORTFOLIO_REMEDIATION_REPORT.md`](./PORTFOLIO_REMEDIATION_REPORT.md). Il voto 6,3/10 sottostante
> descrive esclusivamente la baseline precedente alle correzioni.

Audit eseguito il 17 luglio 2026 sul repository locale e su
<https://thomas-basadonne-portfolio.netlify.app/>. In questa sessione non è stato modificato il
codice applicativo e non è stata valutata la qualità editoriale del copy.

## Perimetro, metodo e affidabilità delle evidenze

Sono stati usati quattro livelli di evidenza:

1. lettura completa del repository, inclusi sorgenti, CSS, configurazioni, documentazione e output
   di build;
2. verifica locale con installazione bloccata da lockfile, typecheck, build, dependency audit e
   controllo delle versioni;
3. uso reale del sito pubblicato con browser Chromium, interazioni, drawer, skip link, refresh,
   back/forward, resize dinamico e viewport da 320 px a 2560 px;
4. misure Lighthouse mobile e desktop, più richieste HTTP passive per status, header, cache,
   compressione, file SEO/PWA e source map.

Le etichette usate nei finding sono:

- **Confermato**: riprodotto nel browser, misurato oppure direttamente dimostrato dall'output
  pubblicato;
- **Confermato dal codice**: comportamento deterministico nel sorgente, anche se la specifica
  modalità di sistema non era emulabile;
- **Rischio**: plausibile e localizzato, ma non riprodotto sull'hardware/browser richiesto;
- **Soggettivo**: giudizio di polish esplicitamente separato dai bug.

### Matrice di verifica realmente eseguita

| Verifica | Esito / copertura |
|---|---|
| `pnpm install --frozen-lockfile` | superato, lockfile coerente |
| `pnpm typecheck` | superato |
| `pnpm build` | superato, 583 moduli, nessun warning di compilazione |
| lint | non disponibile: nessuno script o configurazione |
| test unit/integration/E2E | non disponibili |
| `pnpm audit --prod` | nessuna vulnerabilità nota |
| `pnpm outdated` | solo `three` e `@types/three`: 0.182.0 → 0.185.1; nessun aggiornamento eseguito |
| Browser manuale | Chromium in-app; ingresso, scroll/anchor, drawer, focus iniziale/ripristino, Escape, refresh, back/forward, resize |
| Viewport | 320×568, 360×800, 390×844, 667×375, 768×1024, 1024×768, 1024×500, 1280×720, 1440×900, 2560×1080 |
| Lighthouse mobile | Performance 63, Accessibilità 100, Best Practices 96, SEO 100 |
| Lighthouse desktop | Performance 92, Accessibilità 95, Best Practices 96, SEO 100 |
| HTTP passivo | root, 404, robots, sitemap, manifest, favicon, bundle, source map, compressione e cache |

I punteggi Lighthouse sono singole misure di laboratorio, non dati field/RUM. Non è quindi lecito
dedurre INP reale, stabilità su sessioni lunghe o prestazioni dei dispositivi deboli dai soli valori
qui riportati.

Il dependency tree installato contiene 272 pacchetti. Tutte le dipendenze dirette risultano usate;
React e Three non sono duplicati. Il subtree molto ampio di Drei porta duplicazioni transitive come
Zustand 4/5 e fflate 0.6/0.8, ma non è stato contato come difetto senza prova che quei moduli entrino
nel bundle effettivo: il finding PERF-004 usa coverage e output build, non la sola dimensione del tree.

## 1. Executive summary

### Giudizio complessivo

**Voto tecnico complessivo attuale: 6,3/10.**

Il portfolio ha un concept distintivo, una composizione desktop memorabile e un'architettura molto
più disciplinata della media dei portfolio WebGL: un solo canvas, geometria procedurale, contenuto
DOM semantico, TypeScript strict, contenuti centralizzati e un adattamento grafico già pensato.
L'esecuzione non è però ancora da release eccellente. Il caricamento iniziale attiva il chunk WebGL
prima che l'utente entri e, in simulazione mobile, produce **1.120 ms di TBT**; i font generano
**CLS 0,175 mobile e 0,165 desktop**; la composizione a **667×375** collassa in sovrapposizioni
illeggibili; la schermata di calibrazione non isola dal focus il sito sottostante. A questi difetti si
aggiungono metadata/share/browser identity incompleti, cache non immutabile sugli asset hashati,
source map pubbliche e assenza quasi totale di quality gates.

La distanza dal “10 e lode” non è il 3D e non richiede di normalizzare il progetto in una landing.
Richiede invece di far coincidere la qualità ingegneristica con quella art direction: caricare il
realtime al momento giusto, garantire una composizione intenzionale anche in landscape e zoom,
completare accessibilità/metadata/hardening e rendere regressioni misurabili in CI.

### Aspetti tecnici più riusciti

- Concept e sistema visivo coerenti dall'ingresso al contatto; il 3D è parte della narrazione, non
  decorazione arbitraria.
- Un solo canvas persistente, nessun modello, texture, video o post-processing scaricato.
- Geometria stimata dal codice contenuta: circa 13 draw call e ordine di grandezza di 34k triangoli
  in qualità alta, molto meno in bassa; dato stimato, non misurato con profiler GPU.
- DOM completo e semanticamente ordinato quando JavaScript è attivo: `main`, `section`, heading,
  liste, navigazione, dialog e skip link.
- Drawer solido: focus iniziale, `Escape`, focus trap, blocco scroll e ripristino focus verificati.
- TypeScript strict senza `any`, soppressioni o cast pericolosi diffusi; listener e RAF hanno cleanup.
- Fallback visuale WebGL e DPR/particle/geometry adaptation già presenti.
- Build piccola fuori dal realtime: main 211,08 kB raw / 66,33 kB gzip; CSS 29,02 kB raw /
  9,10 kB gzip.
- Nessun analytics, cookie, form o script terzo: base privacy molto pulita.
- HSTS e Brotli attivi sul deployment; 404 restituisce correttamente status 404.

### Debolezze principali

- Il lazy chunk realtime è montato subito e non dopo l'ingresso: la schermata di calibrazione
  nasconde lavoro già costoso.
- Mobile landscape e viewport equivalenti al 200% di zoom non hanno un'art direction dedicata.
- L'overlay iniziale lascia raggiungibili navigation e controlli sottostanti.
- Font `swap` senza metrica/preload provocano un CLS sopra la soglia “good” di 0,1.
- `prefers-reduced-motion` ferma il CSS ma non tutti gli shader né il RAF del cursore.
- SEO tecnico e identità browser sono minimi nonostante Lighthouse SEO 100.
- Asset hashati serviti con `max-age=0,must-revalidate`; source map da 0,88 MB e 3,81 MB pubbliche.
- Mancano lint, test, CI, regressione visuale/a11y, Lighthouse CI e budget bundle.

### Maturità e rischi prima della pubblicazione definitiva

La maturità percepita è **prototipo avanzato / beta visivamente rifinita**, non prodotto chiuso. I
rischi principali sono regressioni non intercettate, esperienza mobile lenta su CPU modesta,
inaccessibilità della schermata iniziale per tastiera/screen reader e condivisione social priva di
preview. I placeholder di case study, GitHub, CV ed email sono intenzionali e onesti: non sono un bug
tecnico e il copy resta fuori scope; sono comunque una dipendenza esplicita che impedisce di definire
la versione attuale “pubblicazione definitiva”.

### Voti non diplomatici

| Area | Voto | Motivazione sintetica |
|---|---:|---|
| Concept ed esecuzione tecnica | 8,0 | idea originale e sistema coerente; l'esecuzione perde rigore nei bordi |
| UI | 8,2 | desktop e portrait molto forti; landscape mobile rompe la composizione |
| UX | 6,4 | flusso chiaro, ma refresh, ingresso modale e anchor mobile sono fragili |
| Motion e interazioni | 6,8 | linguaggio consistente; loop continui, smoothing frame-dependent e reduced motion incompleto |
| Responsive | 5,8 | 320–430 portrait regge bene; 667×375 è oggettivamente illeggibile |
| Accessibilità | 6,2 | buona base semantica e drawer; quattro difetti WCAG concreti |
| Performance | 5,9 | desktop buono; mobile 63 con TBT 1.120 ms non è livello showcase eccellente |
| SEO tecnico | 4,8 | base minima corretta, ma canonical/social image/robots/sitemap/schema/favicon assenti |
| Qualità del codice | 7,6 | strict e leggibile; nessun lint/test e alcuni loop/contratti impliciti |
| Architettura | 7,7 | ottima proporzione per la dimensione; store globale e CSS monolitico limitano l'evoluzione |
| Compatibilità | 5,8 | solo Chromium verificato; WebGL/CSS avanzato non coperto altrove |
| Robustezza | 5,7 | fallback presente ma confini errore e context-loss non sono completi |
| Sicurezza e privacy | 6,3 | superficie minima e privacy buona; header e source map da hardenizzare |
| Production readiness | 5,4 | build verde, ma mancano gate, metadata, cache e prove cross-browser |

## 2. Scorecard

| Area | Voto attuale | Obiettivo | Problema principale | Impatto | Priorità |
|---|---:|---:|---|---|---|
| Performance mobile | 5,0 | 9,5 | WebGL eseguito prima dell'ingresso; TBT 1.120 ms | alto | P1 |
| Performance desktop | 8,5 | 9,5 | CLS 0,165 e JS inutilizzato | medio | P1 |
| Responsive | 5,8 | 10 | sovrapposizioni a 667×375 | alto | P1 |
| Accessibilità | 6,2 | 9,5 | focus dietro l'entry, contrasto, label-in-name, motion | alto | P1 |
| SEO/share | 4,8 | 9,5 | metadata e file tecnici incompleti | alto | P1 |
| Robustezza | 5,7 | 9,0 | lazy import e context-loss senza recovery completo | medio | P1 |
| Sicurezza | 6,3 | 9,0 | header assenti, source map pubbliche | medio | P1/P2 |
| Cache/CDN | 5,5 | 9,5 | asset hashati non immutabili | medio | P1 |
| Architettura realtime | 7,3 | 9,5 | RAF continui e quality state poco reattivo | medio | P2 |
| Design system | 7,0 | 9,0 | motion/z-index/breakpoint non tokenizzati | medio | P2/P3 |
| QA operativa | 3,5 | 9,0 | nessun lint, test o CI | alto | P1 |
| Privacy | 9,0 | 9,5 | nessun tracker/cookie; resta da documentare la scelta | basso | P3 |

## 3. Problemi bloccanti

Non sono state trovate vulnerabilità **Critical** o perdite di dati. Questi elementi bloccano però la
qualifica di release professionale o di portfolio “10 e lode”:

1. **PERF-001** — main thread mobile bloccato dal realtime prima dell'ingresso.
2. **RESP-001** — hero illeggibile in mobile landscape / viewport basso equivalente a zoom 200%.
3. **A11Y-001** — controlli sottostanti raggiungibili mentre l'entry copre tutto lo schermo.
4. **PERF-002** — CLS 0,165–0,175 causato dai font.
5. **SEO-001 / SEO-002** — identità browser/social e infrastruttura crawl/share incomplete.
6. **QA-001** — nessun sistema automatico impedisce di reintrodurre gli stessi difetti.

Dipendenza di release fuori scope editoriale: i case study e due canali di contatto sono placeholder
espliciti. La loro onestà è positiva, ma la release finale non può considerarli funzionalità concluse.

## 4. Finding dettagliati

### PERF-001 — Il WebGL viene scaricato ed eseguito prima dell'ingresso

- **Categoria:** Performance / WebGL
- **Severità:** High
- **Priorità:** P1
- **Stato:** Confermato
- **Evidenza:** Lighthouse mobile 63; FCP 2,1 s, LCP 2,7 s, TBT 1.120 ms, Max Potential FID
  1.010 ms, 3 long task. `ExperienceCanvas` consuma 1.157 ms di CPU mobile. La catena network mostra
  `index.js → ExperienceCanvas.js` già nel caricamento iniziale.
- **Posizione nel codice:** `src/App.tsx:10-12,30-32`; `src/experience/ExperienceCanvas.tsx:38-61`.
- **Ambiente / viewport:** Lighthouse mobile emulato Moto G Power/slow 4G; riproducibile prima di
  premere “Calibrate / enter”.
- **Passaggi per riprodurre:** cold load; non interagire; registrare trace Lighthouse/Performance.
- **Risultato attuale:** il lazy import è differito rispetto al main chunk ma il componente viene
  montato subito, dietro l'overlay.
- **Risultato atteso:** entry interattiva rapidamente; bootstrap realtime dopo consenso/idle con
  transizione controllata e senza bloccare il primo input.
- **Impatto:** perdita di responsività proprio nel primo gesto e spreco su utenti che non entrano.
- **Proposta di soluzione:** gate del canvas su `entered` o strategia idle/intent; preparare fallback
  statico durante il bootstrap; valutare worker/off-main-thread solo dopo aver eliminato l'eager work.
- **Complessità:** M
- **Dipendenze:** ROB-001, PERF-003.
- **Criterio di accettazione:** TBT mobile ≤200 ms in 3 run mediani; bottone utilizzabile senza long
  task >50 ms; nessun download del chunk WebGL prima della policy scelta.
- **Verifica correzione:** waterfall + trace Lighthouse cold mobile, input immediato, throttling CPU 4×.

### RESP-001 — Hero mobile landscape illeggibile

- **Categoria:** Responsive / UI
- **Severità:** High
- **Priorità:** P1
- **Stato:** Confermato visivamente
- **Evidenza:** a 667×375, role, thesis, nome e nav si sovrappongono. Bounding box: hero thesis
  76–252 px, hero title 156–340 px, nav 311–359 px. Screenshot browser conferma testo intrecciato.
- **Posizione nel codice:** `src/styles/index.css:1233-1526`, soprattutto regole portrait riutilizzate
  senza media query sull'altezza (`hero-thesis` assoluta e nav fixed).
- **Ambiente / viewport:** 667×375; rappresentativo di telefono landscape e di parte dei casi a zoom
  200% su laptop.
- **Passaggi per riprodurre:** entrare; ruotare il viewport a 667×375; tornare a `#identity`.
- **Risultato attuale:** quattro livelli tipografici occupano lo stesso spazio e la nav copre il nome.
- **Risultato atteso:** composizione landscape dedicata, leggibile e navigabile senza perdere il 3D.
- **Impatto:** identità e CTA principali non decodificabili.
- **Proposta di soluzione:** breakpoint combinato `max-height`/landscape; ridurre/ricomporre hero,
  trasformare la thesis in flusso, compattare o spostare nav, testare 568×320 e 844×390 ruotati.
- **Complessità:** M
- **Dipendenze:** nessuna.
- **Criterio di accettazione:** nessuna intersezione tra bounding box testuali/focus ring a 568×320,
  667×375, 740×360 e zoom 200%; contenuto principale visibile senza scroll obbligatorio ambiguo.
- **Verifica correzione:** screenshot regression e test manuale su iOS/Android landscape.

### A11Y-001 — La schermata di ingresso non isola il sito sottostante

- **Categoria:** Accessibilità / Focus management
- **Severità:** High
- **Priorità:** P1
- **Stato:** Confermato dal DOM e dal codice
- **Evidenza:** prima dell'ingresso lo snapshot accessibile contiene entry, HUD, sei link di capitolo,
  tre bottoni case study e link LinkedIn. Solo lo scroll è bloccato; il background non è `inert`.
- **Posizione nel codice:** `src/App.tsx:20-37`; `src/components/EntrySequence.tsx:10-21`;
  `src/styles/index.css:23-31,128-167`.
- **Ambiente / viewport:** tutti; maggiore impatto su tastiera e screen reader.
- **Passaggi per riprodurre:** cold load; usare Tab oltre skip link e bottone entry oppure leggere con
  screen reader la struttura iniziale.
- **Risultato attuale:** il focus può proseguire verso controlli visivamente coperti; l'ordine
  accessibile comunica due esperienze contemporanee.
- **Risultato atteso:** solo skip link e entry attivi finché la calibrazione non termina.
- **Impatto:** focus invisibile, perdita di orientamento; WCAG 2.4.3, 2.4.11 e 3.2.1.
- **Proposta di soluzione:** applicare `inert` e `aria-hidden` al background, gestire un focus scope
  dell'entry e mantenere lo skip link come bypass esplicito; al termine focalizzare coerentemente il
  primo contenuto o preservare il gesto dell'utente.
- **Complessità:** M
- **Dipendenze:** UX-001.
- **Criterio di accettazione:** la sequenza Tab pre-entry contiene solo skip e bottone; axe non vede
  controlli focusabili in regioni nascoste; VoiceOver/NVDA annunciano una sola superficie.
- **Verifica correzione:** tastiera completa, Accessibility Tree, VoiceOver macOS/iOS e NVDA/Firefox.

### PERF-002 — I font provocano CLS sopra la soglia “good”

- **Categoria:** Performance / Typography
- **Severità:** High
- **Priorità:** P1
- **Stato:** Confermato
- **Evidenza:** CLS 0,175 mobile e 0,165 desktop. Lighthouse attribuisce l'unico shift a Manrope,
  DM Mono e Instrument Serif; nodi colpiti “Wired to wonder” mobile e “THOMAS” desktop.
- **Posizione nel codice:** `src/main.tsx:3-5`; font-face generati con `font-display: swap`.
- **Ambiente / viewport:** Lighthouse mobile e desktop cold cache.
- **Passaggi per riprodurre:** pulire cache; applicare rete lenta; registrare Layout Shifts.
- **Risultato attuale:** il fallback ha metriche diverse e la tipografia salta dopo il paint.
- **Risultato atteso:** CLS totale ≤0,1, idealmente ≤0,05.
- **Impatto:** peggiora Core Web Vitals e precisione percepita dell'hero.
- **Proposta di soluzione:** preload dei soli tre file Latin critici, fallback metric-compatible con
  `size-adjust`/override metriche, o inline/subset calibrato; non usare `font-display:block` come
  scorciatoia senza misurare FCP/LCP.
- **Complessità:** S/M
- **Dipendenze:** PERF-001.
- **Criterio di accettazione:** mediana di 3 run CLS ≤0,1 mobile/desktop; nessun layout-shift da font.
- **Verifica correzione:** Lighthouse, Performance trace e filmstrip cold cache.

### A11Y-002 — `prefers-reduced-motion` non ferma tutto il motion realtime

- **Categoria:** Accessibilità / Motion
- **Severità:** Medium
- **Priorità:** P1
- **Stato:** Confermato dal codice; emulazione OS non eseguita
- **Evidenza:** CSS annulla animazioni, ParticleDust e parte della macchina rispettano il flag, ma
  `ScanField` aggiorna sempre `uTime`; il core shader riceve sempre il tempo e il cursore ha un RAF
  indipendente privo di media query reduced-motion.
- **Posizione nel codice:** `src/experience/ScanField.tsx:44-48`;
  `src/experience/ToleranceMachine.tsx:71-152`; `src/components/CustomCursor.tsx:26-34`;
  `src/styles/index.css:1542-1558`.
- **Ambiente / viewport:** utenti con `prefers-reduced-motion: reduce` e pointer fine.
- **Passaggi per riprodurre:** attivare Reduce Motion; entrare; osservare scan shader/cursore e CPU.
- **Risultato attuale:** il sito dichiara protocollo reduced-motion ma mantiene animazioni temporali.
- **Risultato atteso:** stato statico o movimento strettamente azionato dall'utente, senza drift/scan.
- **Impatto:** possibile trigger vestibolare e promessa UX non mantenuta; WCAG 2.3.3.
- **Proposta di soluzione:** congelare `uTime`, usare `frameloop="demand"` o FPS limitato e disabilitare
  smoothing del cursore; preservare le trasformazioni necessarie alla comprensione dello scroll.
- **Complessità:** M
- **Dipendenze:** PERF-003.
- **Criterio di accettazione:** zero animazioni autonome dopo stabilizzazione; CPU idle trascurabile.
- **Verifica correzione:** OS reduce motion reale, video comparativo e Performance trace 30 s.

### A11Y-003 — Signal orange su bone non raggiunge AA

- **Categoria:** Accessibilità / Contrasto
- **Severità:** Medium
- **Priorità:** P1
- **Stato:** Confermato
- **Evidenza:** axe/Lighthouse desktop misura 2,64:1 su “NOW” e “EARLIER”; richiesto 4,5:1 per testo
  normale.
- **Posizione nel codice:** `src/styles/index.css:923-925`; token `--signal` e `--bone` a righe 4-6.
- **Ambiente / viewport:** desktop; lo stesso abbinamento va ricontrollato in ogni tema.
- **Passaggi per riprodurre:** aprire `#trace`; eseguire axe o contrast checker sui label incompleti.
- **Risultato attuale:** colore informativo insufficiente sul panel chiaro.
- **Risultato atteso:** ≥4,5:1 o segnale non affidato al solo colore.
- **Impatto:** WCAG 1.4.3 AA.
- **Proposta di soluzione:** token signal-dark dedicato alle superfici bone o combinazione colore+
  peso/marker; non alterare il signal su graphite, che funziona.
- **Complessità:** XS
- **Dipendenze:** DESIGN-001.
- **Criterio di accettazione:** tutti i testi normali ≥4,5:1; large text ≥3:1.
- **Verifica correzione:** axe desktop/mobile e verifica manuale dei token.

### A11Y-004 — Il nome accessibile dell'identità HUD non include tutta la label visibile

- **Categoria:** Accessibilità / Semantica
- **Severità:** Medium
- **Priorità:** P2
- **Stato:** Confermato
- **Evidenza:** Lighthouse/axe segnala `label-content-name-mismatch` con impatto serious. Testo visibile
  “TB Thomas Basadonne Frontend / Creative developer”, `aria-label` “Thomas Basadonne, back to start”.
- **Posizione nel codice:** `src/components/Hud.tsx:10-17`.
- **Ambiente / viewport:** desktop e mobile (su mobile resta visibile “TB”).
- **Passaggi per riprodurre:** Lighthouse accessibility o axe sul link HUD.
- **Risultato attuale:** la label pronunciata non contiene la stringa visibile completa.
- **Risultato atteso:** visible label contenuta nell'accessible name; azione aggiuntiva annunciata.
- **Impatto:** WCAG 2.5.3, soprattutto voice control.
- **Proposta di soluzione:** rimuovere `aria-label` e aggiungere testo screen-reader per “back to
  start”, oppure includere la label visibile senza cancellarne parti.
- **Complessità:** XS
- **Dipendenze:** nessuna.
- **Criterio di accettazione:** audit axe superato e comando vocale “click TB/Thomas Basadonne” valido.
- **Verifica correzione:** axe, Accessibility Tree, Voice Control.

### PERF-003 — Rendering e RAF continuano anche quando non portano valore

- **Categoria:** Performance / Runtime
- **Severità:** Medium
- **Priorità:** P1
- **Stato:** Confermato dal codice
- **Evidenza:** RAF globale di controller e cursore ricorsivi; Canvas usa frameloop continuo; shader
  temporali rendono sempre. Il controller scrive ogni frame `--scroll-progress`, variabile mai letta
  dal CSS.
- **Posizione nel codice:** `src/hooks/useExperienceController.ts:45-79`;
  `src/components/CustomCursor.tsx:26-34`; `src/experience/ScanField.tsx:44-48`;
  `src/styles/index.css:12`.
- **Ambiente / viewport:** tutti; maggiore impatto su laptop a batteria/mobile e con drawer aperto.
- **Passaggi per riprodurre:** entrare, non interagire per 30 s, registrare CPU/GPU e frame.
- **Risultato attuale:** rAF e render non entrano in stato quiescente.
- **Risultato atteso:** pause/decadimento quando tab nascosto, entry sopra il canvas, drawer aperto,
  reduced motion o scena stabile; refresh solo quando serve.
- **Impatto:** batteria, temperatura, stabilità FPS e memoria su sessioni lunghe.
- **Proposta di soluzione:** orchestratore unico, `visibilitychange`, gating con stato esperienza,
  frameloop demand/always adattivo o cap FPS; rimuovere la custom property inutilizzata.
- **Complessità:** L
- **Dipendenze:** PERF-001, A11Y-002.
- **Criterio di accettazione:** idle 30 s senza long task e con CPU/GPU sensibilmente ridotte; nessun
  cambiamento visivo inatteso.
- **Verifica correzione:** Chrome Performance/Performance Monitor, tab background, drawer e 5 min soak.

### PERF-004 — Chunk realtime con 133 KiB stimati di JavaScript inutilizzato

- **Categoria:** Performance / Bundle
- **Severità:** Medium
- **Priorità:** P2
- **Stato:** Confermato
- **Evidenza:** build: `ExperienceCanvas` 876,39 kB raw / 234,78 kB gzip; Lighthouse: 221,8 kB
  transfer e 114,1 kB potenzialmente inutilizzati (51,4%); main altri 22,5 kB. Totale pagina 349 KiB.
- **Posizione nel codice:** `src/experience/*`; import da `@react-three/drei` in
  `ExperienceCanvas.tsx:2`; configurazione `vite.config.ts:6-11`.
- **Ambiente / viewport:** Lighthouse mobile e desktop cold load.
- **Passaggi per riprodurre:** build production; Lighthouse unused JS/coverage.
- **Risultato attuale:** il budget commentato <240 kB gzip è rispettato, ma il costo CPU mobile resta
  elevato e il warning raw è silenziato a 1.000 kB.
- **Risultato atteso:** budget correlato a transfer e CPU, non solo gzip.
- **Impatto:** parse/evaluation e TBT su CPU modesta.
- **Proposta di soluzione:** prima gate PERF-001; poi coverage e bundle analyzer, import più mirati,
  verifica costo di Drei/R3F e possibile scena Three più sottile solo se il guadagno misurato giustifica
  la complessità.
- **Complessità:** L
- **Dipendenze:** PERF-001.
- **Criterio di accettazione:** riduzione misurabile del transfer/CPU; budget CI esplicito e non
  aggirato da `chunkSizeWarningLimit` permissivo.
- **Verifica correzione:** bundle visualizer, coverage, Lighthouse e trace su CPU 4×.

### SEO-001 — Preview social e identità browser incomplete

- **Categoria:** SEO tecnico / Browser identity
- **Severità:** High
- **Priorità:** P1
- **Stato:** Confermato
- **Evidenza:** presenti title, description, `og:title`, `og:description`, `og:type`, theme-color.
  Assenti canonical, `og:url`, `og:image` e dimensioni, `og:site_name`, Twitter card, favicon SVG/ICO,
  PNG, Apple touch icon e manifest. `/favicon.ico` restituisce 404 e causa l'unico errore console di
  Lighthouse; `/manifest.webmanifest` restituisce 404. Un URL inesistente restituisce correttamente
  404, ma usa la pagina generica Netlify invece dell'identità del portfolio.
- **Posizione nel codice:** `index.html:3-17`; nessun asset `public/`.
- **Ambiente / viewport:** HTTP pubblico e Lighthouse mobile/desktop.
- **Passaggi per riprodurre:** leggere head; richiedere favicon/manifest; usare un social debugger.
- **Risultato attuale:** tab generica e condivisioni senza immagine/URL canonico garantito.
- **Risultato atteso:** identità coerente su tab, home screen e piattaforme social.
- **Impatto:** qualità percepita, CTR, anteprime incoerenti e console non pulita.
- **Proposta di soluzione:** set completo di icone derivate da un simbolo leggibile, OG image
  1200×630, metadata assoluti/canonical e Twitter card; manifest solo se utile come contenitore icone,
  senza trasformare il sito in PWA per abitudine; aggiungere una 404 coerente con link di recupero.
- **Complessità:** M
- **Dipendenze:** asset brand approvati.
- **Criterio di accettazione:** zero 404; preview valida su LinkedIn/X/Slack; icona nitida light/dark.
- **Verifica correzione:** curl/head, browser tab, Apple touch icon, social validators.

### SEO-002 — Crawl infrastructure e contenuto raw HTML sono minimi

- **Categoria:** SEO tecnico / Rendering
- **Severità:** Medium
- **Priorità:** P1
- **Stato:** Confermato
- **Evidenza:** `/robots.txt` e `/sitemap.xml` restituiscono 404. Nessun JSON-LD Person/WebSite/
  CreativeWork. L'HTML pubblico contiene root vuoto e solo un breve `noscript`; tutti i contenuti
  semantici richiedono esecuzione React. Lighthouse SEO 100 non copre questi requisiti.
- **Posizione nel codice:** `index.html:19-28`; `src/main.tsx:9-12`.
- **Ambiente / viewport:** fetch HTTP senza JavaScript.
- **Passaggi per riprodurre:** `curl` root/robots/sitemap; View Source.
- **Risultato attuale:** crawler JS-capable può renderizzare; crawler/social bot semplice no.
- **Risultato atteso:** pagina principale indicizzabile in HTML iniziale, policy crawl esplicita e
  dati strutturati coerenti.
- **Impatto:** dipendenza dal rendering client, segnali SEO incompleti e discovery più fragile.
- **Proposta di soluzione:** prerender/SSG della singola pagina mantenendo l'idratazione creativa;
  aggiungere robots, sitemap, canonical e JSON-LD verificato.
- **Complessità:** M
- **Dipendenze:** SEO-001; URL definitivo.
- **Criterio di accettazione:** contenuto principale e heading in source HTML; Rich Results/schema
  validator senza errori; robots e sitemap 200.
- **Verifica correzione:** curl senza JS, Search Console/URL Inspection, validator schema.

### OPS-001 — Asset hashati senza cache immutabile

- **Categoria:** Performance / Deployment
- **Severità:** Medium
- **Priorità:** P1
- **Stato:** Confermato
- **Evidenza:** main JS, chunk WebGL e source map rispondono `cache-control:
  public,max-age=0,must-revalidate`, nonostante filename hashati. Brotli e CDN Netlify sono attivi.
- **Posizione nel codice:** nessun `netlify.toml` o file `_headers` nel repository.
- **Ambiente / viewport:** HTTP/2 pubblico.
- **Passaggi per riprodurre:** HEAD su `/assets/index-*.js` e `/assets/ExperienceCanvas-*.js`.
- **Risultato attuale:** ogni visita deve rivalidare asset immutabili.
- **Risultato atteso:** HTML no-cache/revalidate; `/assets/*` cache pubblica 1 anno + immutable.
- **Impatto:** repeat visit e navigazioni più lente, traffico edge inutile.
- **Proposta di soluzione:** header Netlify per path hashati; preservare revalidation dell'HTML.
- **Complessità:** S
- **Dipendenze:** SEC-002 per escludere/gestire mappe.
- **Criterio di accettazione:** asset fingerprint `max-age=31536000, immutable`; deploy nuovo cambia hash.
- **Verifica correzione:** HEAD cold/warm e Network panel repeat load.

### ROB-001 — Il boundary WebGL non copre il fallimento del lazy chunk o dell'intera app

- **Categoria:** Robustezza / Error handling
- **Severità:** Medium
- **Priorità:** P1
- **Stato:** Rischio confermato dal posizionamento dei boundary
- **Evidenza:** `WebGLBoundary` vive dentro `ExperienceCanvas`; una rejection del dynamic import
  avviene prima che quel boundary esista. Non esiste un root error boundary. Il fallback Suspense
  gestisce attesa, non errori.
- **Posizione nel codice:** `src/App.tsx:10-12,30-32`;
  `src/experience/ExperienceCanvas.tsx:9-26`.
- **Ambiente / viewport:** rete interrotta/CDN chunk failure, errore React fuori dal canvas.
- **Passaggi per riprodurre:** bloccare il chunk WebGL o restituire 500; ricaricare.
- **Risultato attuale:** rischio di unhandled lazy rejection e root vuoto.
- **Risultato atteso:** contenuto DOM sempre disponibile; retry/fallback controllato.
- **Impatto:** perdita totale del portfolio per un errore opzionale del layer visuale.
- **Proposta di soluzione:** boundary esterno al lazy import e root boundary separato; retry una sola
  volta per chunk stale, telemetria senza dettagli sensibili e fallback semantico stabile.
- **Complessità:** M
- **Dipendenze:** PERF-001, QA-001.
- **Criterio di accettazione:** chunk WebGL bloccato non rimuove contenuto/nav; messaggio/fallback non
  intrusivo; nessun loop di retry.
- **Verifica correzione:** network request blocking, test E2E e simulated chunk 404.

### SEC-001 — Header di sicurezza incompleti

- **Categoria:** Sicurezza / Hardening
- **Severità:** Medium
- **Priorità:** P1
- **Stato:** Confermato
- **Evidenza:** HSTS presente (`max-age=31536000; includeSubDomains; preload`). Assenti CSP,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e protezione framing tramite
  `frame-ancestors`/X-Frame-Options.
- **Posizione nel codice:** configurazione deploy assente.
- **Ambiente / viewport:** risposta root e asset Netlify.
- **Passaggi per riprodurre:** HEAD sul dominio.
- **Risultato attuale:** browser riceve policy di default.
- **Risultato atteso:** policy minima esplicita compatibile con shader/font same-origin.
- **Impatto:** superficie statica bassa, ma hardening inferiore allo standard professionale.
- **Proposta di soluzione:** CSP inizialmente report-only, poi enforce; nosniff, strict referrer,
  deny di camera/mic/geolocation e `frame-ancestors 'none'` se non serve embedding.
- **Complessità:** S
- **Dipendenze:** verificare eventuali future analytics/form.
- **Criterio di accettazione:** securityheaders/CSP evaluator senza finding sostanziali e sito intatto.
- **Verifica correzione:** HEAD, console CSP e smoke test WebGL.

### SEC-002 — Source map di produzione pubbliche e molto grandi

- **Categoria:** Sicurezza / Deployment / Payload
- **Severità:** Medium
- **Priorità:** P2
- **Stato:** Confermato
- **Evidenza:** `sourcemap:true`; mappe pubbliche HTTP 200 da 882.244 byte e 3.810.991 byte.
- **Posizione nel codice:** `vite.config.ts:9`.
- **Ambiente / viewport:** deployment pubblico.
- **Passaggi per riprodurre:** richiedere i due URL `.js.map` o leggere `sourceMappingURL`.
- **Risultato attuale:** sorgenti e struttura dipendenze ricostruibili; mappe non cacheabili.
- **Risultato atteso:** nessuna mappa pubblica, oppure upload privato al sistema di error monitoring.
- **Impatto:** esposizione non necessaria e 4,7 MB servibili; rischio moderato perché nessun segreto è
  stato trovato e il repo potrebbe essere pubblico.
- **Proposta di soluzione:** `hidden` sourcemap + upload privato, o disabilitazione in produzione.
- **Complessità:** XS/S
- **Dipendenze:** eventuale error monitoring.
- **Criterio di accettazione:** URL map 404/403; stack trace production ancora simbolicati privatamente.
- **Verifica correzione:** build manifest, HEAD map e test reporting.

### UX-001 — Refresh a metà pagina riproduce l'ingresso sopra lo scroll restaurato

- **Categoria:** UX / State continuity
- **Severità:** Medium
- **Priorità:** P2
- **Stato:** Confermato
- **Evidenza:** refresh da area case study ha ripristinato `scrollY=2913` ma `entered=false`; l'entry è
  tornata visibile e il body bloccato. Dopo l'ingresso si ritorna alla posizione intermedia.
- **Posizione nel codice:** `src/App.tsx:15`; `src/components/EntrySequence.tsx:10-18`.
- **Ambiente / viewport:** Chromium desktop; reload dopo navigazione a `#cases`.
- **Passaggi per riprodurre:** entrare, navigare a cases, refresh, premere enter.
- **Risultato attuale:** rituale iniziale ripetuto fuori contesto con HUD/progress sottostante già
  avanzato.
- **Risultato atteso:** policy esplicita: ingresso solo alla prima visita/sessione oppure reset
  intenzionale a top; deep/hash access coerente.
- **Impatto:** disorientamento e sensazione di stato non deterministico.
- **Proposta di soluzione:** session flag o derivazione da hash/scroll restoration; non memorizzare
  dati personali, solo stato effimero dell'esperienza.
- **Complessità:** S/M
- **Dipendenze:** A11Y-001.
- **Criterio di accettazione:** matrice refresh top/mid/hash definita e testata; nessun mismatch HUD/entry.
- **Verifica correzione:** E2E reload, direct hash, back/forward e nuova sessione.

### UX-002 — Target della chapter nav mobile sotto la raccomandazione touch

- **Categoria:** UX / Touch targets
- **Severità:** Low
- **Priorità:** P2
- **Stato:** Confermato
- **Evidenza:** a 320 px i sei link misurano circa 34×29 px. Superano il minimo WCAG 2.2 AA di
  24×24 ma restano sotto la raccomandazione 44×44 per touch comodo.
- **Posizione nel codice:** `src/styles/index.css:1313-1345`.
- **Ambiente / viewport:** 320×568 e 360×800.
- **Passaggi per riprodurre:** misurare bounding box link in mobile.
- **Risultato attuale:** interazione precisa richiesta vicino ai bordi.
- **Risultato atteso:** area tappabile generosa senza rendere la barra invasiva.
- **Impatto:** errori di tap, soprattutto con mobilità ridotta.
- **Proposta di soluzione:** espandere hit-area/padding fino a circa 44 px mantenendo il segno visivo.
- **Complessità:** XS/S
- **Dipendenze:** RESP-001.
- **Criterio di accettazione:** target ≥44×44 dove possibile e nessuna sovrapposizione.
- **Verifica correzione:** overlay hit target e test su device reale.

### QA-001 — Nessun gate automatico oltre typecheck/build

- **Categoria:** Quality assurance / Operatività
- **Severità:** Medium
- **Priorità:** P1
- **Stato:** Confermato
- **Evidenza:** package script solo dev/build/preview/typecheck; nessun ESLint, unit test, E2E, CI,
  visual regression, axe regression, bundle budget, Lighthouse CI o broken-link check.
- **Posizione nel codice:** `package.json:10-15`; nessuna workflow directory/configurazione CI.
- **Ambiente / viewport:** repository.
- **Passaggi per riprodurre:** ispezionare script e file.
- **Risultato attuale:** qualità dipende da controllo manuale non ripetibile.
- **Risultato atteso:** pipeline minima che blocchi regressioni oggettive.
- **Impatto:** alto rischio di rompere landscape, focus, metadata o performance durante il polish.
- **Proposta di soluzione:** lint, test E2E di flussi chiave, axe, screenshot per viewport critici,
  Lighthouse CI con budget e link checker; dependency update bot con review.
- **Complessità:** M
- **Dipendenze:** prima fissare baseline dei finding P1.
- **Criterio di accettazione:** PR non mergiabile se build/typecheck/lint/E2E/a11y/budget falliscono.
- **Verifica correzione:** eseguire pipeline su una regressione intenzionale controllata.

### ARCH-001 — Smoothing dipendente dal refresh rate e controller non quiescente

- **Categoria:** Architettura motion
- **Severità:** Medium
- **Priorità:** P2
- **Stato:** Confermato dal codice
- **Evidenza:** scroll usa `progress += difference * 0.075` e cursore `*0.22` per frame, senza delta;
  a 120 Hz convergono circa due volte più rapidamente che a 60 Hz. Il WebGL usa invece damp con delta.
- **Posizione nel codice:** `src/hooks/useExperienceController.ts:45-49`;
  `src/components/CustomCursor.tsx:26-30`; confronto con `ToleranceMachine.tsx:57-58,85-150`.
- **Ambiente / viewport:** display 60/90/120/144 Hz e frame drop.
- **Passaggi per riprodurre:** registrare tempo di convergenza a refresh diversi.
- **Risultato attuale:** timing non coerente tra dispositivi.
- **Risultato atteso:** costante temporale indipendente dal frame rate.
- **Impatto:** motion feel diverso proprio sui device premium e lenti.
- **Proposta di soluzione:** exponential damping basato su delta, motion token condivisi e test del
  tempo di settling.
- **Complessità:** M
- **Dipendenze:** PERF-003, DESIGN-001.
- **Criterio di accettazione:** stesso settling time ±10% tra 30 e 144 fps.
- **Verifica correzione:** frame-throttled test e video a refresh diversi.

### A11Y-005 — Il fallback senza JavaScript non contiene il portfolio completo

- **Categoria:** Accessibilità / Progressive enhancement
- **Severità:** Medium
- **Priorità:** P2
- **Stato:** Confermato
- **Evidenza:** source HTML mostra solo una breve bio nel `noscript`; il README afferma leggibilità
  semantica in caso WebGL, che è vera con JS, ma non in caso JS assente.
- **Posizione nel codice:** `index.html:20-27`; `src/main.tsx:9-12`.
- **Ambiente / viewport:** JavaScript disabilitato, bot non-JS, errore main bundle.
- **Passaggi per riprodurre:** disabilitare JS o leggere HTML raw.
- **Risultato attuale:** capability, trace, case index e contatti non disponibili.
- **Risultato atteso:** contenuto essenziale disponibile senza realtime; l'interazione può richiedere JS.
- **Impatto:** resilienza e inclusione, oltre a SEO-002.
- **Proposta di soluzione:** SSG/prerender della struttura DOM; evitare duplicazione manuale del copy.
- **Complessità:** M
- **Dipendenze:** SEO-002.
- **Criterio di accettazione:** JS off mostra tutte le sezioni essenziali e link utili.
- **Verifica correzione:** browser JS-off, curl e screen reader.

### ROB-002 — Fallback hardware e context-loss non sono verificati né espliciti

- **Categoria:** WebGL / Robustezza
- **Severità:** Medium
- **Priorità:** P2
- **Stato:** Rischio
- **Evidenza:** error boundary e low/high quality esistono; non c'è gestione esplicita di
  `webglcontextlost`, recovery, save-data/battery/GPU tier o scelta utente. Un resize desktop→mobile
  aggiorna lo store, ma lo state locale `quality` dipende poi dal PerformanceMonitor.
- **Posizione nel codice:** `src/experience/ExperienceCanvas.tsx:28-60`;
  `src/hooks/useExperienceController.ts:27-31`.
- **Ambiente / viewport:** GPU limitata, context loss, WebGL2 assente, orientation/resize dinamico.
- **Passaggi per riprodurre:** DevTools lose context, software renderer e device reali low-end.
- **Risultato attuale:** fallback per errori React, non prova di recovery runtime completo.
- **Risultato atteso:** degradazione deterministica e possibilità di restare nel DOM portfolio.
- **Impatto:** canvas nero o consumo eccessivo su una parte dei device.
- **Proposta di soluzione:** capability gate, static fallback, context lost/restored policy e tier
  adattivi; conservare il 3D sui device capaci.
- **Complessità:** L
- **Dipendenze:** PERF-001, QA-001.
- **Criterio di accettazione:** nessun blank screen con WebGL off/context lost; recovery o fallback chiaro.
- **Verifica correzione:** Chrome/Safari/Firefox, WebGL report, context-loss test e device low-end.

### COMPAT-001 — Forced colors, safe area e browser non Chromium restano scoperti

- **Categoria:** Compatibilità / Accessibilità
- **Severità:** Low
- **Priorità:** P2
- **Stato:** Rischio non verificato
- **Evidenza:** cursor nativo nascosto su pointer fine, nessuna regola `forced-colors`; nessun uso di
  safe-area env; uso intensivo di `svh`, mask, clip-path, blend-mode, WebGL e shader.
- **Posizione nel codice:** `src/styles/index.css:1152-1204,1233-1526`; `index.html:5`.
- **Ambiente / viewport:** Windows High Contrast, iPhone con notch/home indicator, Safari/Firefox.
- **Passaggi per riprodurre:** attivare forced colors; testare device reali e browser indicati.
- **Risultato attuale:** nessuna prova sufficiente per dichiarare compatibilità.
- **Risultato atteso:** cursore e focus sempre percepibili; nav fuori dalle safe area; fallback CSS/WebGL.
- **Impatto:** rischio localizzato di controllo invisibile o UI coperta.
- **Proposta di soluzione:** media query forced-colors che ripristini il cursore nativo; safe-area
  padding dove necessario; matrice BrowserStack/device.
- **Complessità:** S
- **Dipendenze:** RESP-001, QA-001.
- **Criterio di accettazione:** checklist cross-browser completa senza perdita di controllo/contenuto.
- **Verifica correzione:** test reale, non user-agent simulation.

### DESIGN-001 — Il design system non copre motion, z-index e responsive logic

- **Categoria:** Design system / Manutenibilità
- **Severità:** Low
- **Priorità:** P3
- **Stato:** Confermato; impatto in parte soggettivo
- **Evidenza:** palette e gutter sono tokenizzati; durate/easing, font scale, breakpoint, z-index e molti
  valori di layout sono magic numbers distribuiti in 1.559 righe di CSS. Breakpoint 760 è duplicato in
  CSS e due file TS.
- **Posizione nel codice:** `src/styles/index.css`; `src/hooks/useExperienceController.ts:22`;
  `src/experience/ExperienceCanvas.tsx:30`.
- **Ambiente / viewport:** manutenzione e nuove sezioni.
- **Passaggi per riprodurre:** cercare z-index, duration, media query e `760px`.
- **Risultato attuale:** sistema visivo coerente ma governato da correzioni locali.
- **Risultato atteso:** token/contratti condivisi per dimensioni, layer e motion.
- **Impatto:** aumenta il costo di evitare regressioni come RESP-001.
- **Proposta di soluzione:** custom properties/TS constants generate o documentate; layer map; split CSS
  per responsabilità senza frammentare eccessivamente.
- **Complessità:** M
- **Dipendenze:** risolvere prima P1 per estrarre regole corrette.
- **Criterio di accettazione:** un solo source of truth per breakpoint critici; layer/motion documentati.
- **Verifica correzione:** search statica e visual regression.

### UI-001 — Stati pressed/loading e feedback del realtime sono sottodefiniti

- **Categoria:** UI / Interaction polish
- **Severità:** Polish
- **Priorità:** P3
- **Stato:** Soggettivo con base verificabile
- **Evidenza:** hover e focus sono curati; non esistono regole `:active`/pressed significative né uno
  stato visibile di bootstrap WebGL. Il cursore aggiorna `is-active` solo su pointermove e può restare
  stale durante scroll o uscita finestra.
- **Posizione nel codice:** `src/styles/index.css` per button/link; `src/components/CustomCursor.tsx:17-24`.
- **Ambiente / viewport:** mouse, trackpad e touch.
- **Passaggi per riprodurre:** tenere premuti case/entry; scrollare senza muovere il mouse; uscire dal viewport.
- **Risultato attuale:** il polish è forte in hover, più debole negli stati transitori.
- **Risultato atteso:** feedback coerente per press, loading, failure e pointer leave.
- **Impatto:** precisione percepita e affidabilità dell'interazione.
- **Proposta di soluzione:** motion/state tokens, `:active`, stato canvas ready e reset cursor su leave/blur.
- **Complessità:** S/M
- **Dipendenze:** PERF-001.
- **Criterio di accettazione:** matrice stati completa per ogni controllo.
- **Verifica correzione:** test manuale mouse/touch/tastiera e screenshot states.

## 5. Quick wins

1. **A11Y-003**: introdurre un signal scuro su bone — XS, impatto WCAG immediato.
2. **A11Y-004**: correggere accessible name HUD — XS.
3. **SEC-002**: non pubblicare source map — XS/S.
4. **OPS-001**: cache immutable per asset hashati — S.
5. **SEC-001**: aggiungere header statici Netlify, iniziando CSP report-only — S.
6. **UX-002**: ampliare hit area della nav mobile — XS/S.
7. Rimuovere la scrittura RAF della custom property `--scroll-progress` non usata — XS.
8. Aggiungere favicon minima per eliminare subito il 404 console — S; completare poi SEO-001.
9. Aggiungere script lint e una prima smoke suite E2E — S/M.
10. Definire una policy deterministica per refresh/deep link — S/M.

## 6. Piano di remediation

### Stabilizzazione

- ROB-001: boundary esterno e fallback per chunk.
- UX-001: policy refresh/deep link.
- PERF-001: ritardare il bootstrap realtime.
- Dipendenza: definire prima lo stato `entered/loading/ready/failed`.

### Accessibilità e semantica

- A11Y-001: inert/focus scope dell'entry.
- A11Y-003 e A11Y-004: contrasto e label-in-name.
- A11Y-002: reduced motion completo.
- A11Y-005: contenuto prerenderizzato.

### Responsive e compatibilità

- RESP-001: composizione landscape/short viewport.
- UX-002: target nav.
- COMPAT-001: forced colors, safe area e device/browser reali.

### Performance

- PERF-002: eliminare CLS font.
- PERF-003 e ARCH-001: loop quiescenti e damping a delta.
- PERF-004: ottimizzare bundle solo dopo gating e profiling.
- ROB-002: tier hardware/context-loss.

### SEO e metadata

- SEO-001: icone, canonical e social card.
- SEO-002/A11Y-005: prerender, robots, sitemap, JSON-LD.

### UI/UX polish

- UI-001: pressed/loading/failure/pointer state.
- DESIGN-001: estrarre token dalle soluzioni consolidate.

### Hardening produttivo

- OPS-001: cache immutable.
- SEC-001: header e CSP.
- SEC-002: source map private.
- Documentare esplicitamente assenza di analytics/cookie e policy privacy.

### Quality assurance finale

- QA-001: CI completa e budget.
- Eseguire la checklist riutilizzabile in `PORTFOLIO_QA_CHECKLIST.md`.
- Usare almeno tre run mediani per performance e dispositivi reali per i gate cross-browser.

## 7. Checklist “10 e lode”

### Esperienza e responsive

- [ ] Nessuna sovrapposizione a tutti i viewport della QA checklist, inclusi landscape e short height.
- [ ] La narrazione mobile è intenzionale in portrait e landscape, non una semplice scala desktop.
- [ ] Refresh, hash, back/forward e nuova sessione seguono una policy documentata.
- [ ] Ogni controllo ha hover, focus, pressed, loading, disabled e failure quando applicabili.
- [ ] Touch target principali ≥44×44 oppure eccezione motivata e comunque WCAG 2.2 conforme.

### Accessibilità WCAG 2.2 AA

- [ ] Entry e drawer isolano il background e mantengono focus visibile/ordine corretto.
- [ ] Tutti i controlli sono operabili con tastiera e screen reader.
- [ ] Contrasto testo AA e contrasto non-testuale 3:1.
- [ ] Zoom 200% e reflow 320 CSS px senza perdita di contenuto/funzione.
- [ ] Reduced motion elimina ogni animazione autonoma non essenziale, inclusi shader/cursor.
- [ ] Forced colors mantiene cursore, focus e controllo.
- [ ] Canvas decorativo resta `aria-hidden`; tutto il contenuto utile è nel DOM.
- [ ] axe automatico zero serious/critical, seguito da test manuale VoiceOver e NVDA.

### Performance/WebGL

- [ ] Mobile lab mediane: Performance ≥90, LCP ≤2,5 s, CLS ≤0,1, TBT ≤200 ms.
- [ ] Field data, quando disponibile: INP ≤200 ms al 75° percentile.
- [ ] Nessun realtime costoso prima della policy di ingresso scelta.
- [ ] Idle, drawer, tab hidden e reduced motion riducono render/RAF.
- [ ] Budget JS/CSS/font e long task in CI.
- [ ] DPR, geometria, particle count e FPS si adattano al dispositivo.
- [ ] WebGL off/context lost mostra fallback leggibile senza perdere il portfolio.
- [ ] Soak test 10 minuti senza crescita memoria o degradazione FPS.

### SEO, identity e sharing

- [ ] Title, description, canonical, robots e lingua corretti.
- [ ] OG/Twitter completi con immagine 1200×630 verificata.
- [ ] robots.txt e sitemap 200 e validi.
- [ ] JSON-LD Person/WebSite ed eventuale CreativeWork validato.
- [ ] Contenuto essenziale presente nel source HTML/prerender.
- [ ] Favicon SVG/ICO/PNG, Apple touch e theme color coerenti.
- [ ] 404 personalizzata, status 404 e link di recupero.

### Sicurezza, privacy e operatività

- [ ] HSTS, CSP, nosniff, referrer, permissions e frame policy verificati.
- [ ] Source map non pubbliche e nessun segreto nel bundle.
- [ ] Asset hashati immutable; HTML revalidato; Brotli attivo.
- [ ] Dependency audit pulito e update strategy documentata.
- [ ] Nessun tracker/cookie non dichiarato; analytics eventuale privacy-friendly e consensuale.
- [ ] Error monitoring, Web Vitals e source map private configurati se adottati.
- [ ] CI blocca build, typecheck, lint, E2E, a11y, visual, link e performance regressions.

## 8. Cose già fatte bene

- **Non rimuovere il 3D.** È il navigational model e sostiene il concept.
- **Non aggiungere post-processing per prestigio.** L'attuale scelta geometria/luce/shader è più
  coerente e meno fragile.
- **Mantenere il single-canvas.** Per questa esperienza evita duplicazione di renderer/context.
- **Mantenere il DOM semantico separato dal canvas.** È la decisione più importante per resilienza,
  SEO e accessibilità.
- **Mantenere contenuti centralizzati e placeholder espliciti.** Evita dati inventati; completare i
  contenuti è una dipendenza, non motivo per riscrivere l'architettura.
- **Mantenere TypeScript strict e target moderno dichiarato.** Nessun bisogno di compatibilità legacy
  indiscriminata.
- **Mantenere il drawer come dialog.** La gestione Escape/focus/scroll verificata è buona; serve solo
  regressione automatica e, se necessario, `inert` del background.
- **Mantenere la palette e la grammatica tipografica.** Occorre un token signal-dark, non una nuova
  direzione visiva.
- **Mantenere l'assenza di tracker e asset terzi.** È un vantaggio privacy e performance.
- **Mantenere qualità high/low e DPR cap.** Vanno resi più deterministici, non sostituiti.
- **Mantenere la trasparenza del 404 status.** Il server restituisce correttamente 404; va solo
  personalizzata l'esperienza.

## 9. Verifiche non eseguibili in questa sessione

Non sono dichiarate come superate:

- **Safari desktop, Firefox, Edge e Chrome estensione reale:** l'uso interattivo è stato eseguito solo
  nel browser Chromium in-app e Lighthouse Headless Chrome 150.
- **Mobile Safari e Chromium Android reali:** viewport override non emula touch, browser chrome,
  memoria, thermal throttling, safe area o font rasterization del device.
- **Screen reader reale:** DOM/accessibility tree e focus sono stati ispezionati, ma VoiceOver, NVDA,
  TalkBack e rotor navigation non sono stati eseguiti.
- **Touch gesture reale:** tap/overscroll/orientation fisici non testati.
- **Reduced motion e forced colors OS:** analizzati dal codice; non emulati nel browser disponibile.
- **Zoom browser 200% esatto:** approssimato tramite viewport CSS equivalente; il difetto short/
  landscape è confermato, ma il controllo zoom nativo va ripetuto.
- **WebGL assente, context loss, software renderer e GPU debole:** boundary analizzato, fallimento non
  iniettato in questo browser.
- **FPS, draw call e memoria GPU con profiler:** draw call/triangoli sono stime dal codice; usare Spector
  o profiler equivalente su device target.
- **Sessione lunga/memory leak:** cleanup ispezionato, ma nessun soak test ≥10 minuti.
- **INP field, CrUX e dispositivi reali:** INP è N/A nei run Lighthouse; serve RUM o field data.
- **Rete offline/service worker:** non esiste service worker. Non è un difetto: una PWA installabile non
  è necessaria per questo concept; decidere esplicitamente se mantenere questo stato.
- **Condivisione social reale:** mancano ancora gli asset; verificare LinkedIn, X, Slack, WhatsApp dopo
  l'implementazione.
- **Destinazione LinkedIn:** l'href e le protezioni `_blank` sono stati verificati nel DOM, ma la pagina
  esterna non è stata attraversata perché può richiedere sessione/autenticazione.
- **Form, audio, video, fullscreen ed easter egg:** non presenti, quindi non applicabili.
- **Dati/editorial content:** esclusi per richiesta; i placeholder sono stati osservati solo come stato
  funzionale e dipendenza di release.

### Come completare le verifiche mancanti

Usare la checklist `PORTFOLIO_QA_CHECKLIST.md` su almeno un iPhone Safari, un Android Chromium, Safari
macOS, Firefox e Edge; abbinare test assistivi reali, Performance trace/Spector, throttling termico e
soak test. I risultati devono aggiornare questo audit senza trasformare un rischio non riprodotto in un
bug inventato.
