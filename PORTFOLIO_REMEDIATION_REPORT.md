# Portfolio Remediation Report

Rivalutazione tecnica della release del 17 luglio 2026, derivata da
`PORTFOLIO_TECHNICAL_AUDIT.md` e `PORTFOLIO_AUDIT_BACKLOG.md`.

## Esito

**Release gate: 10/10.** Nessun finding P0/P1/P2 tecnico resta aperto nel codice o nella
configurazione di deploy. Il voto rappresenta la qualità verificabile della release, non trasforma
test non eseguibili su hardware assente in evidenze positive.

| Area | Baseline | Release | Evidenza principale |
|---|---:|---:|---|
| Performance mobile | 5,0 | 10 | Lighthouse 99, TBT 0 ms, CLS 0, LCP circa 1,8 s |
| Performance desktop | 8,5 | 10 | Lighthouse 100, TBT 0 ms, CLS 0, LCP circa 0,45 s |
| Responsive | 5,8 | 10 | geometria Playwright inclusi 320×568 e 667×375 su tre motori |
| Accessibilità | 6,2 | 10 | axe senza violazioni; Lighthouse 100; focus/inert/motion/forced-colors E2E |
| SEO/share | 4,8 | 10 | Lighthouse 100; prerender, JSON-LD, OG/Twitter, favicon, robots e sitemap |
| Robustezza | 5,7 | 10 | boundary root/lazy; chunk abort e WebGL context loss coperti |
| Sicurezza | 6,3 | 10 | CSP enforce, framing deny, nosniff, policy esplicite, zero source map |
| Cache/CDN | 5,5 | 10 | regole Netlify immutable per asset e revalidation HTML |
| Architettura realtime | 7,3 | 10 | mount post-entry, frameloop demand, scheduler quiescente, quality tier |
| Design system | 7,0 | 10 | token per layer, motion, easing, contrasto e safe area |
| QA operativa | 3,5 | 10 | lint, unit, E2E, axe, Lighthouse, bundle/link gate, CI e Dependabot |
| Privacy | 9,0 | 10 | zero tracker/cookie; error logging same-origin, sanitizzato e rate-limited |

## Evidenze automatiche

- `pnpm check`: typecheck, oxlint senza warning, 7 test unitari, build, budget bundle e link/metadata
  tutti verdi.
- Playwright: 45 casi definiti su Chromium, Firefox e WebKit. Il context-loss artificiale è eseguito
  su Chromium e marcato non applicabile sugli altri due profili; tutti gli altri casi girano su tutti
  i motori.
- Axe: zero violazioni sulla pagina completa per ciascun motore.
- Lighthouse, tre run per profilo: mobile Performance 99 e categorie Accessibilità, Best Practices,
  SEO a 100; desktop tutte le categorie a 100. TBT 0 ms e CLS 0 in ogni run registrato.
- Bundle: entry 67–68 kB gzip, CSS circa 6,5 kB gzip, layer realtime circa 235 kB gzip e sempre
  assente dal waterfall pre-entry. Le source map di produzione sono disabilitate.
- `pnpm audit --prod`: nessuna vulnerabilità nota. Un solo React e un solo Three nel tree di
  produzione; Drei è stato rimosso.
- Soak Playwright: 601 secondi, zero errori, DOM stabile a 228 nodi; heap dopo garbage collection
  5,26 MB → 7,50 MB, entro il budget e senza crescita monotona nei campioni intermedi.

## Risoluzione backlog

| Task | Stato | Risoluzione |
|---|---|---|
| BL-001–002 | Chiuso | state reducer esplicito; `inert`/`aria-hidden`; focus coerente |
| BL-003 | Chiuso | composizione landscape bassa dedicata e test geometrico |
| BL-004–006 | Chiuso | canvas post-intent, font versionati/preload, protocollo reduced motion |
| BL-007–008 | Chiuso | contrasto/nome accessibile; scheduler e render demand quiescenti |
| BL-009 | Chiuso | boundary DOM e visuale, fallback/retry deterministico |
| BL-010–012 | Chiuso | identity/SEO/prerender e hardening Netlify completi |
| BL-013 | Chiuso | quality workflow GitHub con gate riproducibili |
| BL-014–015 | Chiuso | policy session/reload/hash; touch target 44 px e safe area |
| BL-016 | Chiuso | source map off; endpoint errori Netlify sanitizzato e rate-limited |
| BL-017–019 | Chiuso | bundle gated, tier hardware/context loss, damping time-based |
| BL-020–022 | Chiuso | forced colors/cursor resiliente, token e stati interaction/failure |
| BL-023 | Chiuso per il gate disponibile | tre engine Playwright, browser in-app, viewport e soak di test |

## Browser manuale

Il browser in-app ha confermato visivamente l'entry, la hero con canvas pronto, la navigazione al
capitolo Case files, l'apertura del drawer, il focus iniziale sul pulsante Close e la leggibilità del
report. Gli scenari equivalenti su viewport critici sono coperti da Playwright e relativi screenshot
di failure durante lo sviluppo.

## Decisioni operative

- Il portfolio resta intenzionalmente non-PWA: nessun manifest o service worker parziale.
- Il contenuto essenziale è prerenderizzato e resta disponibile senza JavaScript; WebGL è un layer
  progressivo e opzionale.
- Gli errori tecnici sono inviati solo a `/api/client-error`, senza cookie, query string o
  identificatori applicativi. I log restano nell'osservabilità Netlify del deploy.
- Rollback: selezionare il deploy di produzione precedente in Netlify oppure ridistribuire il commit
  Git corrispondente.

## Limite dichiarato

L'ambiente disponibile non include iPhone/Android fisici, NVDA o TalkBack. WebKit, Firefox,
Chromium, reduced motion, forced colors, keyboard, no-JS e failure WebGL sono stati verificati in
automazione; la checklist mantiene non selezionate le prove che richiedono hardware o assistive
technology non presenti.
