# Portfolio QA Checklist

> **Esecuzione release 17 luglio 2026:** i controlli automatizzabili sono coperti da `pnpm check`, 45
> scenari Playwright, axe e sei run Lighthouse; le verifiche manuali eseguite nel browser sono
> descritte in [`PORTFOLIO_REMEDIATION_REPORT.md`](./PORTFOLIO_REMEDIATION_REPORT.md). Le caselle
> relative a hardware o screen reader non presenti restano intenzionalmente non selezionate: una
> verifica non eseguita non viene trasformata in un pass.

Checklist manuale riutilizzabile dopo ogni fase di correzione. Registrare per ogni sessione:

- commit/deploy verificato;
- data, tester, browser/versione, OS e device;
- rete/CPU/GPU e impostazioni accessibilità;
- esito `Pass`, `Fail`, `N/A` e link all'evidenza;
- finding/backlog ID per ogni fail.

Un controllo non eseguito non equivale a `Pass`.

## 1. Preflight repository e build

- [ ] Worktree compreso; nessuna modifica inattesa inclusa nel test.
- [ ] Versione Node conforme a `engines` e pnpm conforme a `packageManager`.
- [ ] Installazione pulita/frozen da lockfile riuscita.
- [ ] Typecheck riuscito senza warning.
- [ ] Build production riuscita senza warning ignorati.
- [ ] Lint riuscito.
- [ ] Test unit/integration riusciti.
- [ ] Test E2E riusciti.
- [ ] Dependency audit senza vulnerabilità non accettate.
- [ ] Dependency tree senza duplicazioni sostanziali non motivate.
- [ ] Bundle report archiviato; budget JS/CSS/font/WebGL rispettati.
- [ ] Nessuna source map pubblica involontaria.
- [ ] Nessun `console.log`, warning, errore o hydration mismatch in produzione.

## 2. Browser e device minimi

### Desktop

- [ ] Chrome stabile macOS/Windows.
- [ ] Safari stabile macOS.
- [ ] Firefox stabile macOS/Windows.
- [ ] Edge stabile Windows.
- [ ] Display standard 1× e Retina/HiDPI.

### Mobile/tablet reali

- [ ] iPhone compatto Safari.
- [ ] iPhone moderno con notch/Dynamic Island Safari.
- [ ] Android compatto Chromium.
- [ ] Android moderno Chromium.
- [ ] iPad/tablet WebKit portrait e landscape.
- [ ] Android tablet portrait e landscape.

Per ogni browser/device:

- [ ] font, blend mode, mask, clip-path, shader e colori coerenti;
- [ ] nessun errore console/network;
- [ ] scrolling, fixed HUD, nav e drawer fluidi;
- [ ] fallback funzionante se il browser limita il WebGL.

## 3. Viewport matrix

Eseguire almeno questi viewport CSS e conservare screenshot regression:

- [ ] 320×568 — mobile minimo.
- [ ] 360×800 — mobile compatto.
- [ ] 390×844 — mobile moderno.
- [ ] 430×932 — mobile alto.
- [ ] 568×320 — mobile landscape minimo.
- [ ] 667×375 — mobile landscape critico.
- [ ] 740×360 — mobile landscape largo/basso.
- [ ] 768×1024 — tablet portrait / bordo breakpoint.
- [ ] 1024×768 — tablet landscape.
- [ ] 1024×500 — laptop/viewport basso.
- [ ] 1280×720 — laptop compatto.
- [ ] 1440×900 — desktop target.
- [ ] 1920×1080 — desktop ampio.
- [ ] 2560×1080 — ultrawide.

Per ciascun viewport:

- [ ] nessun overflow orizzontale non intenzionale;
- [ ] nessun testo troncato, sovrapposto o fuori viewport;
- [ ] hero spec, nome, thesis, HUD e nav non collidono;
- [ ] pannelli leggibili e con ritmo coerente;
- [ ] canvas non copre il DOM e il DOM non nasconde il soggetto 3D in modo accidentale;
- [ ] target touch/focus ring interamente visibili;
- [ ] fixed/sticky non coprono contenuto o controlli;
- [ ] safe area rispettata;
- [ ] versione mobile appare reinterpretata, non soltanto ridotta.

## 4. Ingresso e primo caricamento

### Cold load

- [ ] nessun flash bianco o stile non applicato.
- [ ] entry leggibile prima che il realtime sia pronto.
- [ ] “Calibrate / enter” disponibile rapidamente e con focus visibile.
- [ ] nessun long task impedisce il primo input.
- [ ] fallback/loading del canvas ha uno stato intenzionale.
- [ ] nessun controllo sottostante è focusabile/esposto prima dell'ingresso.
- [ ] skip link è il primo focus utile e bypassa correttamente l'entry.

### Uscita dall'entry

- [ ] mouse click funziona.
- [ ] Enter e Space funzionano.
- [ ] touch tap funziona senza double activation.
- [ ] reduced motion elimina la transizione non essenziale.
- [ ] focus dopo enter/skip è coerente e non perso.
- [ ] nessun layout shift o flash canvas.

### Slow/failure

- [ ] slow 4G e CPU 4× mantengono bottone responsivo.
- [ ] chunk WebGL lento mostra stato loading senza bloccare il DOM.
- [ ] chunk WebGL 404/abort mostra fallback e portfolio completo.
- [ ] main bundle failure lascia un fallback HTML utile.

## 5. Scroll e narrazione completa

- [ ] scroll dall'inizio alla fine con wheel.
- [ ] scroll con trackpad.
- [ ] scroll touch/inertia e overscroll.
- [ ] scroll con PageDown/Space/arrow keys.
- [ ] tutte le sei sezioni appaiono nell'ordine previsto.
- [ ] active chapter corrisponde alla sezione percepita.
- [ ] depth/progress è monotono e raggiunge 100% al fondo.
- [ ] 3D reagisce allo scroll senza frame drop evidente.
- [ ] DOM e WebGL conservano continuità narrativa.
- [ ] non esistono zone vuote/non comprensibili durante gli anchor jump mobile.
- [ ] footer e ultimo contenuto sono raggiungibili senza essere coperti dalla nav.

## 6. Navigazione, URL e history

Per ogni link capitolo `00–05`:

- [ ] click/tap porta alla sezione corretta;
- [ ] hash URL corretto;
- [ ] focus/annuncio non causa disorientamento;
- [ ] `aria-current` segue lo stato;
- [ ] scroll-margin evita contenuto coperto.

History/state:

- [ ] browser Back ripristina hash e posizione corretti.
- [ ] browser Forward ripristina hash e posizione corretti.
- [ ] refresh a top segue la policy entry.
- [ ] refresh a metà pagina segue la policy entry.
- [ ] accesso diretto a `/#principle`, `/#cases`, `/#contact` è coerente.
- [ ] nuova tab/sessione segue la policy documentata.
- [ ] resize dinamico attraverso 760 px non lascia quality/layout state stale.
- [ ] orientation change portrait↔landscape non produce sovrapposizioni.
- [ ] perdita e recupero focus/tab non crea salti o loop attivi inutili.

## 7. Case-study drawer

Per ciascuno dei tre case:

- [ ] apertura con mouse.
- [ ] apertura con tastiera.
- [ ] apertura con touch.
- [ ] titolo dialog corretto e unico.
- [ ] `role=dialog`, `aria-modal` e label corretti.
- [ ] focus iniziale sul Close o primo controllo utile.
- [ ] Tab e Shift+Tab restano nel dialog.
- [ ] `Escape` chiude.
- [ ] Close click/tap chiude.
- [ ] click/tap overlay segue la policy prevista.
- [ ] background non è navigabile da screen reader/focus.
- [ ] body non scrolla mentre drawer è aperto.
- [ ] drawer scrolla fino al fondo su viewport basso.
- [ ] chiusura ripristina scroll e focus all'elemento origine.
- [ ] reduced motion accorcia/elimina l'animazione.
- [ ] nessun contenuto/tag esce dai bordi.

## 8. Link e contatti

- [ ] LinkedIn apre la destinazione corretta.
- [ ] link esterni usano `noopener`/`noreferrer` secondo policy.
- [ ] apertura nuova tab è comunicata in modo accessibile.
- [ ] GitHub/CV/email non sono placeholder nella release definitiva.
- [ ] link disabilitati non sono focusabili né sembrano attivi.
- [ ] nessun link rotto nel DOM, metadata, sitemap o JSON-LD.
- [ ] anchor text resta comprensibile senza contesto visuale.

## 9. Tastiera e screen reader

### Tastiera

- [ ] sequenza Tab completa e logica.
- [ ] Shift+Tab completa e logica.
- [ ] focus ring sempre percepibile su dark, bone e signal.
- [ ] nessun keyboard trap fuori dai dialog intenzionali.
- [ ] nessun elemento cliccabile non semantico.
- [ ] Space non scrolla quando deve attivare un button.
- [ ] skip link visibile al focus e focalizza `main-content`.

### Screen reader

- [ ] VoiceOver Safari macOS.
- [ ] VoiceOver Safari iOS.
- [ ] NVDA Firefox/Chrome Windows.
- [ ] TalkBack Chrome Android.
- [ ] landmarks unici e comprensibili.
- [ ] un solo H1; gerarchia H2/H3 coerente.
- [ ] nav ha nome e current location corretti.
- [ ] label visibile inclusa nel nome accessibile.
- [ ] canvas decorativo ignorato; contenuto alternativo nel DOM.
- [ ] placeholder/disabled annunciati correttamente.
- [ ] link nuova finestra annunciato.
- [ ] nessun contenuto coperto ma esposto durante entry/drawer.

## 10. Contrasto, zoom e modalità di sistema

- [ ] testo normale ≥4,5:1.
- [ ] testo grande ≥3:1.
- [ ] componenti/focus/non-text ≥3:1.
- [ ] informazione non affidata al solo colore.
- [ ] browser zoom 200% senza perdita di contenuto/funzione.
- [ ] reflow a 320 CSS px.
- [ ] text-only zoom quando disponibile.
- [ ] Windows High Contrast / forced colors utilizzabile.
- [ ] dark/light browser chrome e favicon coerenti.
- [ ] selection resta leggibile.

## 11. Motion e custom cursor

### Motion standard

- [ ] scroll motion ha gerarchia e significato.
- [ ] pointer parallax resta subordinata allo scroll.
- [ ] easing/settling coerente a 30, 60, 90, 120 e 144 fps.
- [ ] nessun flashing oltre soglie WCAG.
- [ ] nessun movimento continua inutilmente con drawer/tab nascosto.

### Reduced motion

- [ ] entry statico/istantaneo.
- [ ] grain disabilitato.
- [ ] shader scan/time congelati.
- [ ] particle drift disabilitato.
- [ ] cursor smoothing disabilitato o cursor nativo.
- [ ] scroll-driven state resta comprensibile.
- [ ] CPU/GPU idle ridotte.

### Cursor

- [ ] native cursor nascosto solo quando custom cursor è funzionante.
- [ ] custom cursor visibile su ogni superficie.
- [ ] hover state si aggiorna anche dopo scroll/layout change.
- [ ] pointer leave/blur resetta lo stato.
- [ ] touch/coarse pointer non mostra cursor custom.
- [ ] forced colors ripristina cursor nativo.

## 12. WebGL e hardware

- [ ] WebGL2 disponibile: scena corretta.
- [ ] WebGL non disponibile: fallback e DOM completo.
- [ ] context lost: recovery o fallback deterministico.
- [ ] context restored: niente duplicazione risorse.
- [ ] quality high: geometria/materiali/antialias corretti.
- [ ] quality low: riduzione visibile ma non degradante.
- [ ] DPR cap rispettato su Retina.
- [ ] orientation/resize aggiorna DPR e quality tier.
- [ ] save-data/hardware debole segue policy.
- [ ] canvas non renderizza prima della policy entry.
- [ ] canvas pausa/riduce lavoro con tab hidden e drawer.
- [ ] nessun warning shader o WebGL console.
- [ ] draw call, triangoli, shader time e GPU memory misurati con profiler.
- [ ] soak 10 minuti: memoria stabile e FPS non degrada.

## 13. Performance lab e field

Eseguire almeno 3 run cold e usare la mediana.

### Mobile

- [ ] Lighthouse Performance ≥90.
- [ ] FCP target definito e rispettato.
- [ ] LCP ≤2,5 s.
- [ ] CLS ≤0,1, preferibilmente ≤0,05.
- [ ] TBT ≤200 ms.
- [ ] nessun long task >50 ms nel primo input path.
- [ ] total transfer e unused JS entro budget.

### Desktop

- [ ] Lighthouse Performance ≥95.
- [ ] LCP ≤2,5 s.
- [ ] CLS ≤0,1.
- [ ] TBT ≤100 ms.

### Runtime/field

- [ ] INP field ≤200 ms al p75 quando disponibile.
- [ ] Web Vitals raccolti con privacy policy coerente.
- [ ] first load e repeat load verificati.
- [ ] cache hit evita download/rivalidazioni inutili.
- [ ] rete offline/lenta produce fallback comprensibile.

## 14. SEO tecnico e identity

- [ ] root status 200.
- [ ] URL inesistente status 404 con pagina personalizzata.
- [ ] title unico e descrittivo.
- [ ] meta description presente.
- [ ] canonical assoluto corretto.
- [ ] robots meta coerente.
- [ ] `robots.txt` status 200 e valido.
- [ ] sitemap status 200, valida e con URL canonico.
- [ ] lingua documento corretta.
- [ ] OG title/description/type/url completi.
- [ ] OG image 1200×630 accessibile con dimensioni e alt.
- [ ] Twitter/X card completa.
- [ ] preview LinkedIn, X, Slack e WhatsApp verificata.
- [ ] JSON-LD Person/WebSite valido.
- [ ] CreativeWork/SoftwareSourceCode usato solo per elementi reali e verificati.
- [ ] contenuto essenziale presente in source HTML.
- [ ] link crawlable (`a[href]`) e non solo handler.
- [ ] heading/landmark coerenti.
- [ ] favicon ICO/SVG/PNG e Apple touch icon 200.
- [ ] favicon leggibile in dark/light mode.
- [ ] manifest, se presente, valido e coerente.

## 15. HTTP, cache, sicurezza e privacy

### HTTP/cache

- [ ] HTTPS e HSTS attivi.
- [ ] HTML revalidato/non cacheato in modo stale.
- [ ] asset fingerprint `max-age=31536000, immutable`.
- [ ] Brotli/gzip attivo.
- [ ] content type corretto per HTML, JS, CSS, font e immagini.
- [ ] nessun 404 in Network/console.

### Security headers

- [ ] CSP enforce senza `unsafe-*` non motivati.
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] `Referrer-Policy` esplicita.
- [ ] `Permissions-Policy` minima.
- [ ] `frame-ancestors`/framing policy esplicita.
- [ ] nessun segreto/chiave/source map nel deployment pubblico.
- [ ] dependency audit pulito.
- [ ] link `_blank` protetti.

### Privacy

- [ ] nessun tracker/cookie inatteso.
- [ ] analytics eventuale privacy-friendly, documentato e consensuale quando necessario.
- [ ] form eventuali validano, proteggono spam e spiegano trattamento dati.
- [ ] error monitoring non invia PII o contenuti sensibili.

## 16. PWA/offline — decisione consapevole

La PWA non è obbligatoria per questo portfolio.

- [ ] decisione “non PWA” documentata, oppure requisiti PWA approvati.
- [ ] se non PWA: nessun manifest/service worker stale o incompleto.
- [ ] se PWA: installability, icon maskable, splash, offline fallback, update e cache strategy testati.
- [ ] reload offline non mostra una pagina ingannevole o dati obsoleti.

## 17. Osservabilità e release operations

- [ ] error monitoring testato con errore controllato.
- [ ] source map private collegate alla release.
- [ ] Web Vitals/performance monitoring attivo se approvato.
- [ ] deployment preview per PR.
- [ ] CI esegue build, typecheck, lint, test, E2E, axe e visual regression.
- [ ] Lighthouse CI e bundle budget bloccano regressioni.
- [ ] broken-link check include metadata, sitemap e JSON-LD.
- [ ] dependency update strategy configurata.
- [ ] rollback deployment documentato.

## 18. Gate finale di release

- [ ] Nessun P0/P1 aperto.
- [ ] Ogni P2 rinviato ha motivazione e rischio accettato.
- [ ] Tutti i placeholder funzionali della release definitiva sono sostituiti con dati verificati.
- [ ] Audit automatici verdi e verifiche manuali firmate.
- [ ] Misure performance archiviate con data/configurazione.
- [ ] Cross-browser/device matrix completata realmente.
- [ ] Accessibility manuale completata realmente.
- [ ] Security/cache/header verificati sul dominio definitivo.
- [ ] Social preview verificata dopo il deploy definitivo.
- [ ] Nessuna affermazione “testato” senza evidenza associata.
