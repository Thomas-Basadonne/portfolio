# Evidenze SYS-01

Baseline `d909b1b`, raccolta locale del 13 novembre 2026. Report: [`../../SYS-01_AUDIT.md`](../../SYS-01_AUDIT.md).

## Registri

- `summary.json`: aggregazione dei 240 casi e dei 720 stati; 72 peggioramenti del wrapping in hover.
- `measurements.json`: due motori × due lingue × due font × due layout × 15 viewport.
  Tre stati per caso: normale, hover reale, focus in modalità tastiera. Le misure di testo e colonne
  ripetute sono conservate solo nei campioni tipografici rappresentativi per ridurre il peso.
- `live-checks.json`: 12 casi con renderer pronto, motion normale, feedback assestato a 450 ms;
  click pausa (o alternativa tastiera dichiarata), scansioni axe pagina/drawer, capability hover.
  **Le violazioni axe transitorie qui contenute non sono finding confermati.**
- `settled-checks.json`: 8 casi con attesa 1600 ms; stili nav stabili attorno alla scansione axe;
  touch emulato sui telefoni, hit-test per pausa. Questo è il controllo che scarta i transitori.
- `detector.json`: output del detector sul built HTML, con il path normalizzato. Tre segnalazioni,
  contestualizzate e non trasformate automaticamente in difetti.
- `verification.json`: gate realmente eseguiti, senza attribuire una suite completa ai quattro test mirati.

## Immagini

- `email-default-hover.jpg`: confronto **default/hover**, non “before/after fix”: nessuna patch applicata.
- `email-*-1920-{normal,hover,focus}.jpg`: indirizzo e righe contatto alla stessa viewport.
- `live-identity-*`: vista della hero con renderer; `live-work-*`: finestra di lettura in Work,
  non la totalità della sezione. Il punto/anello è il cursore di prova, non un hotspot del prodotto.
- `touch-pause-*`: aspetto alla fine del tentativo di tap; per la posizione prima dell'azione e il
  bersaglio intercettante fanno fede `pause.box`, `pause.identity` e i punti di hit-test nel JSON.
  Il tentativo può scorrere la pagina: lo screenshot non va confuso con la misura pre-tap.
- `drawer-*`: drawer Twin, nome e contenuto della fixture già pubblici; il limite inferiore è lo scroll,
  non un taglio del contenuto.

Le catture per elemento di sezioni più alte della viewport possono includere chrome fisso traslato:
quelle ambigue sono escluse dal pacchetto, mantenute solo in scratch privata. Nessun nuovo difetto
è stato dedotto da quelle sovrapposizioni. Non ci sono screenshot di clienti o file privati.

## Riprodurre (nessuna dipendenza nuova)

Dalla root di una worktree con le dipendenze installate e una build recente:

```sh
pnpm run build
pnpm exec vite preview --host 127.0.0.1 --port 15181 --strictPort
```

In un altro terminale, scegliere una **directory nuova sotto la scratch Hermes**, non sovrascrivere
le evidenze di questo audit. I comandi eseguono ogni matrice completa (non usarli per un singolo caso):

```sh
export AUDIT_BASE_URL=http://127.0.0.1:15181
export AUDIT_OUTPUT="$HOME/.hermes/cache/scratch/portfolio-sys01-replay"
mkdir -p "$AUDIT_OUTPUT"
node docs/evidence/issue-51/audit-harness.mjs
node docs/evidence/issue-51/live-harness.mjs
node docs/evidence/issue-51/settled-harness.mjs
```

Gli harness sono sonde dell'audit, non nuovi test di regressione nella CI. La matrice CSS trattiene
il renderer; le altre due lo avviano davvero. Non confrontare frame reduced-motion con frame animati
per giudicare le pose. Gli harness non misurano FPS o performance di un dispositivo fisico.
Chiudere solo il server posseduto dalla sessione dopo la raccolta.

## Limiti

Local preview senza CSP di produzione; Playwright WebKit macOS non è Safari su iPhone.
Nessun Firefox, screen reader, zoom nativo, verifica di tutti i drawer o benchmark LCP.
Il report distingue i difetti osservati da regole proposte, decisioni aperte e controlli non eseguiti.
