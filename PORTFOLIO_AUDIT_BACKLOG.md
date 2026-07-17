# Portfolio Audit Backlog

> **Stato: chiuso.** BL-001…BL-022 sono implementati e coperti dai gate automatici; BL-023 è stato
> eseguito con Chromium, Firefox, WebKit e browser in-app per la parte disponibile nell'ambiente.
> Risultati e limiti di evidenza sono registrati in
> [`PORTFOLIO_REMEDIATION_REPORT.md`](./PORTFOLIO_REMEDIATION_REPORT.md).

Backlog tecnico derivato da `PORTFOLIO_TECHNICAL_AUDIT.md`. L'ordine è intenzionale: prima rende
l'esperienza deterministica e accessibile, poi ottimizza e infine aggiunge polish. Le complessità sono
relative (`XS`, `S`, `M`, `L`, `XL`) e non rappresentano stime temporali.

## Vista ordinata

| Ordine | Task | Priorità | Area | Complessità | Dipende da |
|---:|---|---|---|---|---|
| 1 | BL-001 — Modello stato entry/canvas/error | P1 | Stabilizzazione | M | — |
| 2 | BL-002 — Isolare focus e accessibility tree dell'entry | P1 | Accessibilità | M | BL-001 |
| 3 | BL-003 — Correggere mobile landscape e short viewport | P1 | Responsive | M | — |
| 4 | BL-004 — Ritardare bootstrap WebGL | P1 | Performance | M | BL-001 |
| 5 | BL-005 — Eliminare CLS dei font | P1 | Performance | S/M | — |
| 6 | BL-006 — Completare reduced motion realtime | P1 | Accessibilità | M | BL-004 |
| 7 | BL-007 — Correggere contrasto e accessible name | P1 | Accessibilità | XS/S | — |
| 8 | BL-008 — Rendere loop e rendering quiescenti | P1 | Performance/WebGL | L | BL-004, BL-006 |
| 9 | BL-009 — Error boundary esterno e fallback chunk | P1 | Robustezza | M | BL-001 |
| 10 | BL-010 — Metadata, favicon e social preview | P1 | SEO/Identity | M | asset brand |
| 11 | BL-011 — Prerender, robots, sitemap e schema | P1 | SEO/Resilienza | M | BL-010 |
| 12 | BL-012 — Cache Netlify e security headers | P1 | Deployment/Sicurezza | S/M | — |
| 13 | BL-013 — Introdurre quality gates e CI | P1 | QA | M | baseline P1 |
| 14 | BL-014 — Policy refresh, hash e session entry | P2 | UX | S/M | BL-001, BL-002 |
| 15 | BL-015 — Ampliare target nav e safe area | P2 | Touch/Compatibilità | S | BL-003 |
| 16 | BL-016 — Source map private e monitoraggio errori | P2 | Operatività/Sicurezza | S/M | BL-009 |
| 17 | BL-017 — Profilare/ridurre il bundle realtime | P2 | Performance | L | BL-004, BL-008 |
| 18 | BL-018 — Quality tier e context-loss recovery | P2 | WebGL | L | BL-008, BL-009 |
| 19 | BL-019 — Damping frame-independent | P2 | Motion architecture | M | BL-008 |
| 20 | BL-020 — Forced colors e cursore resiliente | P2 | Accessibilità/Compatibilità | S | — |
| 21 | BL-021 — Tokenizzare layer, breakpoint e motion | P3 | Design system | M | BL-003, BL-019 |
| 22 | BL-022 — Stati pressed/loading/failure | P3 | UI polish | S/M | BL-001, BL-004 |
| 23 | BL-023 — QA cross-browser/device e soak finale | P1 | Release QA | L | BL-001…BL-022 applicabili |

## Task assegnabili

### BL-001 — Definire il modello di stato entry/canvas/error

- **Priorità:** P1
- **Area:** Stabilizzazione
- **Complessità:** M
- **Finding:** PERF-001, ROB-001, UX-001
- **Obiettivo:** sostituire i boolean impliciti con stati espliciti come `entry`, `loading`, `ready`,
  `failed`, senza cambiare il concept.
- **File probabili:** `src/App.tsx`, `src/lib/experienceStore.ts`, `src/components/EntrySequence.tsx`.
- **Implementazione:** documentare transizioni; separare “utente ha dato consenso” da “canvas pronto”;
  prevedere fallback e retry singolo; evitare stati impossibili HUD/entry.
- **Accettazione:** ogni transizione ha un solo proprietario; entry, skip, deep link, failure e reload
  producono UI deterministica; nessuna regressione drawer/nav.
- **Verifica:** unit test reducer/state machine + E2E per cold load, skip, enter, failure e reload.

### BL-002 — Isolare focus e accessibility tree dell'entry

- **Priorità:** P1
- **Area:** Accessibilità
- **Complessità:** M
- **Dipendenze:** BL-001
- **Finding:** A11Y-001
- **File probabili:** `src/App.tsx`, `src/components/EntrySequence.tsx`, `src/styles/index.css`.
- **Implementazione:** rendere background `inert`/`aria-hidden` durante entry; focus scope con skip link
  esterno; definire focus all'uscita; impedire focus invisibile dietro overlay.
- **Accettazione:** pre-entry Tab raggiunge solo skip ed enter; screen reader espone una superficie;
  skip focalizza `main-content`; nessun warning `aria-hidden` su focus attivo.
- **Verifica:** axe, Accessibility Tree, tastiera, VoiceOver e NVDA.

### BL-003 — Correggere mobile landscape e viewport a bassa altezza

- **Priorità:** P1
- **Area:** Responsive/UI
- **Complessità:** M
- **Finding:** RESP-001
- **File probabili:** `src/styles/index.css`.
- **Implementazione:** introdurre composizione `orientation: landscape`/`max-height`; rimuovere
  sovrapposizioni tra hero spec, thesis, title e nav; mantenere protagonista il 3D.
- **Accettazione:** zero intersezioni di contenuto/focus a 568×320, 667×375, 740×360, 844×390
  landscape e zoom 200%; nav sempre utilizzabile.
- **Verifica:** screenshot regression per tutti i viewport e test device iOS/Android.

### BL-004 — Ritardare bootstrap e mount del WebGL

- **Priorità:** P1
- **Area:** Performance/WebGL
- **Complessità:** M
- **Dipendenze:** BL-001
- **Finding:** PERF-001
- **File probabili:** `src/App.tsx`, `src/experience/ExperienceCanvas.tsx`.
- **Implementazione:** caricare/montare canvas dopo intent/entry secondo policy misurata; fornire stato
  visuale durante bootstrap; non bloccare l'input.
- **Accettazione:** chunk realtime assente dal waterfall prima della policy scelta; TBT mobile mediano
  ≤200 ms; transizione non mostra flash/blank.
- **Verifica:** 3 Lighthouse mobile cold run, trace CPU 4× e click immediato sul bottone.

### BL-005 — Eliminare il CLS dei font

- **Priorità:** P1
- **Area:** Performance/Typography
- **Complessità:** S/M
- **Finding:** PERF-002
- **File probabili:** `index.html`, `src/main.tsx`, eventuale CSS font dedicato.
- **Implementazione:** preload soli font Latin critici; fallback con metric override/`size-adjust`;
  valutare subset senza peggiorare LCP.
- **Accettazione:** CLS mediano ≤0,1 mobile e desktop, nessun layout shift attribuito ai font.
- **Verifica:** filmstrip/trace cold cache e 3 run Lighthouse per profilo.

### BL-006 — Completare il protocollo reduced motion

- **Priorità:** P1
- **Area:** Accessibilità/Motion
- **Complessità:** M
- **Dipendenze:** BL-004
- **Finding:** A11Y-002
- **File probabili:** `ScanField.tsx`, `ToleranceMachine.tsx`, `CustomCursor.tsx`,
  `ExperienceCanvas.tsx`.
- **Implementazione:** congelare time uniform e drift; disabilitare smoothing cursor; demand render o
  FPS limitato; conservare solo movimento necessario all'azione dell'utente.
- **Accettazione:** nessuna animazione autonoma a scena stabile con reduce motion; testo entry coerente.
- **Verifica:** OS setting reale, video comparativo, CPU trace idle e axe motion review.

### BL-007 — Correggere contrasto e label-in-name

- **Priorità:** P1
- **Area:** Accessibilità
- **Complessità:** XS/S
- **Finding:** A11Y-003, A11Y-004
- **File probabili:** `src/styles/index.css`, `src/components/Hud.tsx`.
- **Implementazione:** token signal-dark sulle superfici bone; accessible name HUD contenente la label
  visibile e l'azione.
- **Accettazione:** contrasto testo ≥4,5:1; axe zero `color-contrast` e
  `label-content-name-mismatch`.
- **Verifica:** contrast checker, axe desktop/mobile, Voice Control.

### BL-008 — Rendere loop e rendering quiescenti

- **Priorità:** P1
- **Area:** Performance/WebGL
- **Complessità:** L
- **Dipendenze:** BL-004, BL-006
- **Finding:** PERF-003
- **File probabili:** controller, cursor, Canvas e componenti scena.
- **Implementazione:** unificare scheduling; pause su entry/drawer/hidden/reduce; rimuovere custom
  property inutilizzata; scegliere frameloop demand/adattivo o cap FPS misurato.
- **Accettazione:** trace idle 30 s senza long task; CPU/GPU significativamente inferiori; nessun
  freeze durante scroll e nessun salto al resume.
- **Verifica:** Chrome Performance/Monitor, tab background, drawer, 5 min soak.

### BL-009 — Aggiungere boundary esterno e fallback per il chunk

- **Priorità:** P1
- **Area:** Robustezza
- **Complessità:** M
- **Dipendenze:** BL-001
- **Finding:** ROB-001
- **File probabili:** `src/App.tsx`, nuovo boundary dedicato.
- **Implementazione:** boundary sopra `lazy`; root boundary per DOM; retry singolo solo per chunk stale;
  fallback che non blocchi contenuto.
- **Accettazione:** bloccando `ExperienceCanvas-*.js`, tutte le sezioni e nav restano usabili; nessun
  infinite retry o white screen.
- **Verifica:** E2E request abort/404 e test error injection.

### BL-010 — Completare metadata, favicon e social preview

- **Priorità:** P1
- **Area:** SEO/Identity
- **Complessità:** M
- **Dipendenze:** asset brand e URL definitivo
- **Finding:** SEO-001
- **File probabili:** `index.html`, `public/`.
- **Implementazione:** canonical, OG/Twitter assoluti, image 1200×630 con dimensioni, favicon SVG/ICO/
  PNG, Apple touch, theme colors light/dark; manifest solo se utile.
- **Accettazione:** zero 404 console; preview corretta su LinkedIn/X/Slack; icona nitida in tab e home.
- **Verifica:** curl, DevTools, social validators e device Apple/Android.

### BL-011 — Prerenderizzare contenuto e aggiungere crawl infrastructure

- **Priorità:** P1
- **Area:** SEO/Resilienza
- **Complessità:** M
- **Dipendenze:** BL-010
- **Finding:** SEO-002, A11Y-005
- **File probabili:** build config, entry rendering, `public/robots.txt`, sitemap, JSON-LD.
- **Implementazione:** SSG/prerender della singola pagina; idratazione del layer interattivo; Person e
  WebSite schema; robots/sitemap.
- **Accettazione:** source HTML contiene heading/sezioni/link essenziali; JS off leggibile; robots e
  sitemap 200; schema valido.
- **Verifica:** curl, browser JS-off, Search Console e schema validator.

### BL-012 — Configurare cache e security headers Netlify

- **Priorità:** P1
- **Area:** Deployment/Sicurezza
- **Complessità:** S/M
- **Finding:** OPS-001, SEC-001
- **File probabili:** `netlify.toml` o `public/_headers`.
- **Implementazione:** immutable per asset fingerprint; HTML revalidate; CSP report-only→enforce;
  nosniff, referrer, permissions e frame policy.
- **Accettazione:** asset 1y immutable, HTML non stale; nessuna violazione CSP funzionale; HSTS
  preservato.
- **Verifica:** HEAD, CSP console, security header scanner e smoke WebGL/font.

### BL-013 — Introdurre quality gates e CI

- **Priorità:** P1
- **Area:** QA/Operatività
- **Complessità:** M
- **Dipendenze:** baseline P1 definita
- **Finding:** QA-001
- **File probabili:** `package.json`, lint config, test config, workflow CI.
- **Implementazione:** lint; E2E entry/nav/drawer/reload; axe; screenshot viewport critici;
  Lighthouse CI; bundle budget; broken link check; audit dipendenze.
- **Accettazione:** una regressione intenzionale per categoria fallisce la PR; baseline documentata.
- **Verifica:** eseguire pipeline verde e prove negative controllate.

### BL-014 — Definire policy refresh, hash e session entry

- **Priorità:** P2
- **Area:** UX
- **Complessità:** S/M
- **Dipendenze:** BL-001, BL-002
- **Finding:** UX-001
- **Implementazione:** decidere prima visita vs ogni reload; gestire scroll restoration e hash senza
  mismatch; usare solo stato sessione effimero.
- **Accettazione:** top reload, mid reload, deep hash, back/forward e nuova sessione rispettano una
  matrice documentata.
- **Verifica:** E2E dedicato su ciascun caso.

### BL-015 — Ampliare target nav e gestire safe area

- **Priorità:** P2
- **Area:** Touch/Compatibilità
- **Complessità:** S
- **Dipendenze:** BL-003
- **Finding:** UX-002, COMPAT-001
- **File probabili:** `src/styles/index.css`, viewport meta se necessario.
- **Implementazione:** hit area ~44 px; padding `env(safe-area-inset-*)` dove serve; non alterare la
  densità visiva del segno.
- **Accettazione:** target misurabili ≥44×44; nav non coperta da home indicator/notch.
- **Verifica:** iPhone/Android reali portrait/landscape e overlay hit target.

### BL-016 — Rendere private le source map e collegare error monitoring

- **Priorità:** P2
- **Area:** Operatività/Sicurezza
- **Complessità:** S/M
- **Dipendenze:** BL-009
- **Finding:** SEC-002
- **Implementazione:** hidden source map + upload privato o disable; release ID; scrub dati.
- **Accettazione:** URL `.map` pubblici 404/403; stack production simbolicato nel servizio scelto.
- **Verifica:** HEAD map e test errore controllato.

### BL-017 — Profilare e ridurre bundle/CPU realtime

- **Priorità:** P2
- **Area:** Performance
- **Complessità:** L
- **Dipendenze:** BL-004, BL-008
- **Finding:** PERF-004
- **Implementazione:** coverage + analyzer; individuare costo Drei/R3F/Three; import mirati; ridurre
  codice solo con benchmark A/B e senza sacrificare il concept.
- **Accettazione:** budget transfer/CPU stabilito e migliorato; nessun `chunkSizeWarningLimit` usato per
  nascondere regressioni.
- **Verifica:** analyzer, coverage, Lighthouse e device low-end.

### BL-018 — Aggiungere quality tier e context-loss recovery

- **Priorità:** P2
- **Area:** WebGL/Robustezza
- **Complessità:** L
- **Dipendenze:** BL-008, BL-009
- **Finding:** ROB-002
- **Implementazione:** capability probe; tier GPU/device/save-data; context lost/restored; static
  fallback e scelta utente se necessaria.
- **Accettazione:** WebGL off/context loss non genera blank; low-end mantiene contenuto e input fluidi.
- **Verifica:** lose-context extension, software renderer, Safari/Firefox e device reali.

### BL-019 — Rendere il damping indipendente dal refresh rate

- **Priorità:** P2
- **Area:** Motion architecture
- **Complessità:** M
- **Dipendenze:** BL-008
- **Finding:** ARCH-001
- **Implementazione:** exponential damping con delta per scroll/cursor; token di settling time.
- **Accettazione:** settling time ±10% tra 30 e 144 fps; motion feel approvato.
- **Verifica:** throttling frame rate e video comparativo.

### BL-020 — Supportare forced colors e cursore resiliente

- **Priorità:** P2
- **Area:** Accessibilità/Compatibilità
- **Complessità:** S
- **Finding:** COMPAT-001, UI-001
- **Implementazione:** ripristinare native cursor in forced colors/failure; reset custom cursor su
  leave/blur/scroll; garantire focus visibile.
- **Accettazione:** nessun caso con cursor invisibile; Windows High Contrast utilizzabile.
- **Verifica:** forced colors reale, JS failure e pointer leave.

### BL-021 — Tokenizzare layer, breakpoint e motion

- **Priorità:** P3
- **Area:** Design system
- **Complessità:** M
- **Dipendenze:** BL-003, BL-019
- **Finding:** DESIGN-001
- **Implementazione:** source of truth breakpoint; layer map; duration/easing/spacing tokens; split CSS
  per responsabilità mantenendo classi leggibili.
- **Accettazione:** niente duplicazione critica 760 px; z-index e motion documentati; visual invariata.
- **Verifica:** search statica e screenshot regression completa.

### BL-022 — Completare stati pressed/loading/failure

- **Priorità:** P3
- **Area:** UI polish
- **Complessità:** S/M
- **Dipendenze:** BL-001, BL-004
- **Finding:** UI-001
- **Implementazione:** matrice stati per entry, case, nav, external link e canvas; pressed/touch feedback
  coerente con la grammatica meccanica.
- **Accettazione:** ogni controllo ha tutti gli stati applicabili e feedback non basato solo su hover.
- **Verifica:** mouse, touch, tastiera, slow network e screenshot states.

### BL-023 — Eseguire QA cross-browser, device e soak finale

- **Priorità:** P1 (gate di release)
- **Area:** Release QA
- **Complessità:** L
- **Dipendenze:** tutte le correzioni incluse nella release
- **Obiettivo:** chiudere le verifiche non eseguibili dell'audit.
- **Copertura minima:** Safari macOS/iOS, Firefox, Edge, Android Chromium; VoiceOver, NVDA, TalkBack;
  reduce motion, forced colors, zoom 200%; WebGL off/context loss; 10 min soak; field/RUM quando
  disponibile.
- **Accettazione:** checklist `PORTFOLIO_QA_CHECKLIST.md` firmata senza P0/P1 aperti; deviazioni P2/P3
  documentate e approvate.
- **Verifica:** report di esecuzione con device/browser/versione, screenshot e misure.

## Dipendenza editoriale fuori dal backlog tecnico

La sostituzione dei placeholder di case study, GitHub, CV ed email è richiesta per una release finale,
ma non viene trasformata qui in task di copy. Il backlog tecnico deve solo garantire che dati e link
verificati possano essere inseriti senza modificare l'architettura o rompere accessibilità/layout.
