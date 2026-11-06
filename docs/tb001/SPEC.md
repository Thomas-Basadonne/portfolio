<!-- Ported reference for #19. The body below is the approved #18 v0.4 spike specification,
not a claim that the portfolio already implements #16 choreography or #22 post-processing.
Integration decisions and executed checks live in ../TB001.md. -->

# TB-001 «The Compiler» — specifica v0.4 (spike #18; meccanica e look approvati da Thomas il 5/11/2026)

Fonte: tavola e render di Thomas (5/11/2026), issue https://github.com/Thomas-Basadonne/portfolio/issues/18.
Questa specifica **sostituisce le immagini come fonte di verità**. Unità: R = raggio esterno = 1.
Asse principale **Z** = asse dell'oblò (verso la camera nella vista frontale). È anche l'unico asse dell'esploso.

## Parti (raggi annidati)

| ID | Parte (nome tavola) | Geometria | Raggi / quote |
|---|---|---|---|
| `shell.oblo` | Involucro esterno — oblò «TB-001 —» | calotta sferica frontale con incisione | r 0.96–1.00, apertura polare 19.5° (diametro ≈ 1/3 della sfera) |
| `shell.front[0..3]` | Involucro esterno — petali anteriori | settore di guscio con spessore | r 0.96–1.00, θ 19.5°–90°, 4 quadranti in φ, gap 1.6° |
| `shell.rear[0..3]` | Involucro esterno — petali posteriori | idem | θ 90°–160.5° |
| `shell.cap` | Involucro esterno — calotta posteriore | calotta fissa al telaio | θ 160.5°–180° |
| `seams` | Fughe emissive | sfera emissiva nello spessore del guscio, visibile solo dalle fughe; si spegne quando i petali partono | r 0.99 |
| `inner[0..3]` | Involucro interno | fascia equatoriale in 4 settori (i poli restano aperti sul core) | r 0.875–0.90, θ 50°–130° |
| `ring.outer / mid / inner` | Anelli di stabilizzazione | banda piatta con feritoie emissive | r 0.82 / 0.72 / 0.62, altezza 0.05, spessore 0.03 |
| `process.front / rear` | Modulo di processo | anteriore: anello aperto (niente davanti al core); posteriore: flangia con mozzo e 6 razze | z ±0.42, anello r 0.37–0.42 |
| `process.shaft` | Modulo di processo — albero | cilindro sull'asse Z, solo posteriore | z −0.96 → −0.42, r 0.03 |
| `core.cage` | Core — gabbia | spigoli di dodecaedro (tubi) | raggio circoscritto 0.36 |
| `core.cube / core.inner` | Core computazionale | cubo emissivo (facce a intensità diverse, tre facce in camera) + cubo annidato controrotante | spigolo 0.30 / 0.14 |
| `joints.piston[0..7]` | Sistema di giunti | pistone telescopico: base sulla fascia interna, punta sul lato interno del petalo | manicotto r 0.034, stelo r 0.018 |
| `joints.pin` | Sistema di giunti — perni gimbal | cilindri sugli assi dei gimbal | — |
| `orbits` | Connessioni dinamiche | 3 ellissi sottili + 9 nodi | a 1.64–1.86, fuori dai petali aperti (r max 1.48 < semiasse minore 1.52); **elemento grafico, non meccanico** |

Verifiche di ingombro (in `test-kin.mjs`): bordo della flangia (z 0.42, r 0.42) a 0.594 dal centro < 0.605, bordo interno dell'anello più piccolo che ruota: nessun contatto. Core: semidiagonale del cubo 0.260 < raggio inscritto della gabbia (0.36 × 0.795 = 0.286).

## Cinematica (risolve le incoerenze 1–8 della #18)

- **Petali:** torsione di 34° per la banda anteriore e di **26°** per la posteriore. La posteriore converge su un'apertura più piccola: a 34° gli angoli entravano nei vicini, la scansione segna il primo contatto fra 30° e 32°, quindi 26° lasciano circa 4° di margine. Ogni petalo trasla lungo la propria direzione centrale `n` (pistone) e ruota attorno a `n` (torsione «a girandola»). Prima traslazione (≥ 0.15) e poi torsione: niente collisioni tra petali vicini. Corsa 0.48 per la banda anteriore e 0.42 per la posteriore: il fronte si apre di più, così il core si vede. Ordine sfalsato per quadrante (+0.04 di ciclo) e banda (gli anteriori per primi).
- **Oblò:** in 02 si svita (−40° sul proprio asse) ed esce di +0.12 su Z; in 03 ruota di 95° su una cerniera **inferiore** (asse X sul bordo, perno e staffa verso la flangia anteriore) e resta orizzontale, sotto le linee di vista. Con la cerniera in alto la camera, più alta, ci guardava attraverso.
- **Anelli:** gimbal veri. Anello esterno su X (perni sul telaio), medio su Y (perni sull'esterno), interno su X (perni sul medio). In Standby complanari (normale Z); in Espansione si inclinano a 30° / −40° / 14°; in Operativo l'interno oscilla di ±10° sul proprio perno, senza rotazione continua, così nessun anello passa davanti al core.
- **Core:** sospeso nella gabbia, gabbia collegata alle flange da 8 montanti. **Nessun albero lo attraversa.** Albero solo posteriore (calotta → flangia posteriore). Nessun secondo asse verticale.
- **Ingranaggi:** rimossi. Gli anelli sono mossi dai perni, senza trasmissione esplicita.
- **Core sempre visibile e acceso** da 03 Espansione in poi.

## Contratto di posa

`pose(cycle, explode, t)` è una funzione pura (`kin.js`, nessun three.js).

- `cycle ∈ [0,1]`: 01 Standby [0, 0.20) · 02 Attivazione [0.20, 0.45) · 03 Espansione [0.45, 0.75) · 04 Operativo [0.75, 1].
- `explode ∈ [0,1]` è uno smontaggio in sequenza, dall'esterno verso l'interno (v0.4). Muovere tutto insieme faceva passare i pezzi uno dentro l'altro: la scansione delle collisioni ha trovato anelli contro flangia, pistoni contro flangia e anelli contro involucro interno.
  1. **0–0.28: ritiro.** Petali, oblò, gimbal e involucro interno tornano nella posa chiusa.
  2. **0.30–0.60: gusci esterni fuori.** Anteriore e oblò a +2.9 su Z, posteriore con calotta e albero a −3.0.
  3. **0.48–0.64: l'involucro interno si apre.** I quattro settori escono di +0.3 in senso radiale; serve perché gli anelli (r 0.835) passino dal bordo della fascia (r 0.67 a θ 50°).
  4. **0.62–0.90: l'involucro interno arretra** a −1.45 portando con sé i pistoni. Da 0.62 a 0.82 i pistoni si estendono di 0.32 e formano una raggiera.
  5. **0.66–0.95: gli anelli escono in avanti** a +2.1 / +1.75 / +1.4.
  6. **0.72–1: modulo di processo a +0.85, core a −0.3.** Il core si allontana dalla flangia posteriore, che ne copriva il 15%, e ruota fino a `showRot`, così mostra tre facce alla camera del teardown.
  Ogni gruppo si muove come `dz · ss(win)`. La ricomposizione è la stessa funzione percorsa all'indietro.
- `t` (secondi) solo per i moti continui: respiro delle fughe, rotazione del core, nodi sulle orbite. Non cambia la meccanica.
- Le letture (stato, % ciclo, % esploso, parte attiva) escono dalla stessa funzione: niente telemetria inventata.

## Look (palco scuro) — v0.3

- **Pannellature (v0.4):** bump e mappa per i soli petali. Una fuga traversale, due fughe sfalsate e una piastrina di servizio con quattro bulloni, come nella tavola. Le linee del bump sono sfumate (pendenza, non gradino), così il solco prende luce e ombra.
- **Gunmetal spazzolato:** `MeshPhysicalMaterial` con color `#7a7e85`, metalness 1, roughness 0.32 modulata da una texture di usura, anisotropia 0.55 lungo la latitudine. Scelto in A/B tra quattro varianti: le tre più chiare leggevano come alluminio o plastica.
- **Smussi:** chamfer a 45° di 0.014 R su ogni bordo tagliato dei petali, generato nella geometria. Catturano la linea di luce.
- **Luce:** solo l'environment da studio, senza file HDR. Cupola a gradiente, key morbida dall'alto, due strisce verticali, una striscia dura, due rim posteriori e un bounce basso. Nessuna luce puntiforme: le sue macchie tonde leggono come plastica, e quella nel core bruciava un riflesso bianco sugli anelli.
- **Emissivo:** il core è l'unico elemento sopra la soglia di bloom. Feritoie e slot delle flange restano sotto. Le facce del cubo hanno intensità diverse perché si legga come cubo e non come esagono. Nel teardown bloom e core si attenuano.
- Fondo `#0b0b0a` con un leggero gradiente radiale dietro l'oggetto.

## Stato dello spike (5/11/2026, v0.4)

Gate: `tb001/check.sh`. Esegue i controlli di posa, poi la build, poi le due sonde sulla GPU; esce con codice ≠ 0 al primo fallimento.
- `test-kin.mjs`: 10 controlli sulla posa, senza GPU.
- `probe-collide.mjs`: tutto il film, t 0–25 s a passo 0.05 (501 pose), ogni vertice di ogni solido contro tutti gli altri. Petali, oblò, calotta, settori interni, anelli, flange, pistoni, staffa e albero sono descritti come solidi analitici; una penetrazione oltre 0.003 R fa fallire il gate. **0 coppie in collisione.** Prova che la sonda trova davvero qualcosa: con la torsione posteriore a 34° il gate fallisce e riporta rear0↔rear3 e rear1↔rear2 con 0.018 R.
- `probe-core.mjs`: visibilità del cubo. **Minimo 0.917** su t 7.6–13.6 (soglia 0.9) e **1.000** sulla pausa del teardown (soglia 0.95).

Collisioni trovate e corrette in v0.4:
- staffa della cerniera contro petali front2/front3, per tutto il film: era larga 0.05 in una fuga di 0.028, ora 0.012;
- torsione dei petali posteriori;
- teardown simultaneo: anelli, flange, pistoni e fascia si attraversavano;
- raggiera dei pistoni: attraversava anelli e flangia;
- punta dei pistoni: nel teardown seguiva il guscio e si allungava;
- razze della flangia posteriore: finivano a r 0.3 e l'anello flottava.

Limiti dichiarati:
- La sonda campiona i **vertici**: due solidi che si incrociano spigolo contro spigolo, senza vertici l'uno dentro l'altro, possono sfuggire.
- Non scansiona rivetti, perni dei gimbal, mozzo, gabbia, montanti e feritoie: piccoli, fissati per costruzione, controllati solo a occhio.
- Contatti voluti esclusi: staffa ↔ flangia anteriore e oblò, albero ↔ calotta e flangia posteriore.
- Nel teardown la raggiera dei pistoni si legge solo in parte: da questa camera gli steli si sovrappongono alla fascia e al guscio posteriore.
- Il passaggio dalla posa chiusa ai tre blocchi (t 15.2–15.6) è rapido; va rivisto con la regia di #16.
