# Portfolio content backlog — estratto sanificato

> **ARCHIVIO — fonte del 17 luglio 2026, con note del 10 novembre, non descrizione del sito corrente.**
> Estratto preparato per SYS-01; pubblicazione autorizzata il 14 novembre 2026.
> Conservate solo voci editoriali/interfaccia CT-001/002/008–013/015/020/022/025/027–030.
> Le sezioni non pertinenti o non pubblicabili sono omesse integralmente. Non è una copia completa.
> Gli originali locali sono preservati; nessun allegato o file referenziato è incluso.
> I testi al presente e le proposte nelle sezioni seguenti appartengono alla data della fonte.
> Per lo stato corrente: [`src/content/portfolio.ts`](../../src/content/portfolio.ts), decisioni GitHub
> e `docs/SYS-01_AUDIT.md` (audit del 13 novembre). Questo archivio non autorizza patch.

Le priorità, stime, dipendenze e domande sono quelle della fonte storica. Gli ID saltati non
sono task spariti dalla board: le sezioni corrispondenti non fanno parte di questo estratto.
Le decisioni successive prevalgono; il tracking operativo di SYS-01 è in #79–#82.

### CT-001 — Confermare l'identità professionale unica

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P0
- **Dipendenze:** nessuna
- **Area:** positioning / cross-channel
- **Complessità:** S
- **Descrizione:** scegliere titolo, sede/base, lingua primaria e formula breve da usare in portfolio,
  GitHub, LinkedIn e CV. Default proposto: `Frontend Developer · Commerce & Interactive Systems`.
- **File/pagina:** hero portfolio, GitHub bio, LinkedIn headline, CV header
- **Risultato atteso:** una scheda fonte con titolo ufficiale, titolo pubblico, luogo, remote policy e
  mercato prioritario.
- **Criterio di accettazione:** le quattro proprietà usano la stessa gerarchia; non compaiono più
  contemporaneamente `Frontend & Creative Developer`, `Full-Stack + AI enthusiast` e formule junior.
- **Informazioni richieste a Thomas:** titolo contrattuale, titolo preferito, base attuale, modalità di
  lavoro, mercato e lingua.
- **Decisione 10/11/2026 (DEC-00 #45, punto 5):** titolo pubblico = `Frontend Developer · Commerce &
  AI tools`, già in `<title>`, hero e `PORTFOLIO_MASTER_COPY.md`. Supera il default
  `Commerce & Interactive Systems` proposto sopra. `Creative Developer` si rivaluta quando il layer 3D
  è prova pubblica. Restano aperti: titolo contrattuale, base, mercato e lingua. Applicazione
  cross-channel in REL-01 (#44). Residui `creative` da rimuovere: `public/assets/og-image.png`/`.svg`
  («FRONTEND / CREATIVE DEVELOPER») e fallback `src/components/AppErrorBoundary.tsx:29`.

### CT-002 — Sostituire il dominio GitHub non funzionante

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P0
- **Dipendenze:** decisione provvisoria o definitiva sul dominio
- **Area:** links / GitHub
- **Complessità:** XS
- **Descrizione:** sostituire `thomasbasadonne.it` con il deployment Netlify attivo, oppure con il
  dominio definitivo solo dopo verifica DNS/HTTPS.
- **File/pagina:** campo Website del profilo GitHub
- **Risultato atteso:** il link pubblico del profilo apre il portfolio corrente.
- **Criterio di accettazione:** HTTP 200, canonical coerente e nessun redirect verso il vecchio sito.
- **Informazioni richieste a Thomas:** intenzione di recuperare il dominio e URL definitivo.
- **Nota 10/11/2026 (#44, #61):** fatto. Niente dominio per ora: il campo Website del profilo e
  l'homepage del repository `portfolio` puntano a `https://thomas-basadonne-portfolio.thomasbasadonne.workers.dev/`
  (HTTP 200, canonical coerente). Il deployment Netlify è ritirato e fa solo redirect 301.

### CT-008 — Aggiungere un contatto diretto verificato

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P0
- **Dipendenze:** conferma email e availability
- **Area:** contact / conversion
- **Complessità:** S
- **Descrizione:** aggiungere email con label descrittiva e dichiarare, se desiderato, il tipo di
  opportunità cercata. Non pubblicare automaticamente il telefono del CV storico.
- **File/pagina:** hero CTA, contact section, footer, metadata/profile links
- **Risultato atteso:** un visitatore può contattare Thomas senza dipendere da LinkedIn.
- **Criterio di accettazione:** `mailto:` corretto e testato; testo di availability specifico o
  intenzionalmente omesso; scelta privacy sul telefono documentata.
- **Informazioni richieste a Thomas:** email preferita, availability, ruoli/collaborazioni, sede e
  decisione sul telefono.

### CT-009 — Pubblicare una hero professionale concreta

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P0
- **Dipendenze:** CT-001
- **Area:** hero / positioning
- **Complessità:** S
- **Descrizione:** usare nome, ruolo, headline concreta, subheadline e CTA della proposta copy;
  mantenere `Built to hold. Wired to wonder.` come firma, non come unica value proposition.
- **File/pagina:** entry e hero; fonte copy `PORTFOLIO_COPY_PROPOSAL.md`
- **Risultato atteso:** ruolo, ambito, stack principale e azione successiva sono leggibili entro la
  prima schermata utile.
- **Criterio di accettazione:** un test di comprensione a cinque secondi restituisce `frontend`,
  `complex interfaces/commerce` e almeno una CTA; nome e ruolo compaiono anche prima/durante l'entry.
- **Informazioni richieste a Thomas:** approvazione titolo e versione prudente/commerce della
  subheadline.
- **Nota 10/11/2026 (DEC-00 #45):** titolo approvato (vedi CT-001). Il gate d'ingresso resta come
  focus interattivo sul Compiler (#17): il criterio «nome e ruolo compaiono anche prima/durante
  l'entry» diventa vincolo dello spike. Composizione della hero rimandata a HOME-01 (#50) → #23.

### CT-010 — Ridurre le capability a una gerarchia verificabile

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P0
- **Dipendenze:** CT-001; conferma stack
- **Area:** skills / credibility
- **Complessità:** M
- **Descrizione:** sostituire i cinque campi equivalenti con core frontend, professional domain,
  product/backend, local AI, interactive systems ed exploring.
- **File/pagina:** sezione Capabilities; GitHub profile README; LinkedIn Skills
- **Risultato atteso:** ogni tecnologia pubblicata ha un progetto o una responsabilità collegabile.
- **Criterio di accettazione:** nessuna badge wall; core/professional/personal/exploring sono distinti;
  prodotti Adobe hanno nomenclatura e livello confermati.
- **Informazioni richieste a Thomas:** stack usato professionalmente, profondità, tecnologie in sola
  esplorazione e interesse reale per hardware/3D printing.

### CT-011 — Completare e collegare il case Tolerance

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P0
- **Dipendenze:** riflessione di Thomas; nessuna dipendenza tecnica per il testo principale
- **Area:** case study / selected work
- **Complessità:** M
- **Descrizione:** sostituire il drawer breve con il case completo già proposto e aggiungere link a
  live build, source e note.
- **File/pagina:** sezione Selected Work e case `Tolerance / 0.01`; fonte copy
  `PORTFOLIO_COPY_PROPOSAL.md`
- **Risultato atteso:** il progetto dimostra problema, ruolo, vincoli, decisioni e outcome.
- **Criterio di accettazione:** tutte le sezioni minime del case sono presenti; i link sono HTTP 200;
  il risultato non contiene metriche inventate; il tipo è `Personal project`.
- **Informazioni richieste a Thomas:** cosa rifarebbe diversamente e conferma del ruolo individuale.

### CT-012 — Preparare un case study enterprise NDA-safe

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P0
- **Dipendenze:** CT-001; autorizzazione e dati aziendali
- **Area:** experience / case study / commerce
- **Complessità:** XL
- **Descrizione:** scegliere un progetto commerce rappresentativo e documentare contesto, ownership,
  vincoli, decisioni e risultato con il template fornito.
- **File/pagina:** nuovo case nella sezione Selected Work; LinkedIn Featured; CV
- **Risultato atteso:** prima prova pubblica credibile dell'esperienza commerce di Thomas.
- **Criterio di accettazione:** disclosure approvata; ownership distinta dal lavoro del team; stack
  confermato; outcome verificabile; nessun dato cliente o dettaglio sensibile.
- **Informazioni richieste a Thomas:** tutti i campi elencati nel project plan §5.2 e referente per
  approvazione.

### CT-013 — Dare contenuto all'esperienza CØDESTORM

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P0
- **Dipendenze:** CT-001; può precedere CT-012 usando una descrizione prudente
- **Area:** experience
- **Complessità:** M
- **Descrizione:** aggiungere titolo, date, base/remote, descrizione e 2–4 contributi reali; ridurre la
  prominenza della formazione rispetto al lavoro corrente.
- **File/pagina:** sezione Experience, LinkedIn Experience e CV
- **Risultato atteso:** il visitatore comprende cosa fa Thomas oggi e con quale responsabilità.
- **Criterio di accettazione:** nessun placeholder resta online; ogni bullet descrive contesto + azione
  e, se disponibile, risultato; le tre fonti usano gli stessi dati.
- **Informazioni richieste a Thomas:** titolo, date, responsabilità, contributi e formulazione
  approvata.

### CT-015 — Produrre demo e case Promptify

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P1
- **Dipendenze:** CT-014
- **Area:** project assets / case study
- **Complessità:** L
- **Descrizione:** registrare un flusso di 45–60 secondi, selezionare tre screenshot e completare
  difficoltà, outcome e riflessione nella bozza case.
- **File/pagina:** Selected Work, media portfolio, README Promptify
- **Risultato atteso:** Promptify diventa una prova comprensibile senza leggere l'intero repository.
- **Criterio di accettazione:** video leggibile senza audio; dati non sensibili; card e case indicano
  local AI, stato di installazione e limiti; link funzionanti.
- **Informazioni richieste a Thomas:** difficoltà reale, uso/feedback reale e cosa rifarebbe.

### CT-020 — Rendere menu e CTA descrittivi

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P1
- **Dipendenze:** struttura delle sezioni definitiva
- **Area:** navigation / CTA / accessibility
- **Complessità:** S
- **Descrizione:** sostituire `Operating principle`, `Fields`, `Case files`, `Trace`, `Transmit` con
  About, Capabilities, Selected Work, Experience e Contact; sostituire `Open channel` con azioni.
- **File/pagina:** navigazione, contact links, fallback e no-script
- **Risultato atteso:** ogni label predice la destinazione senza perdere il tema visivo.
- **Criterio di accettazione:** menu comprensibile fuori contesto; link esterni indicano piattaforma e
  azione; accessible name e testo visibile non sono in conflitto.
- **Informazioni richieste a Thomas:** nessuna, salvo approvazione editoriale.

### CT-022 — Aggiornare metadata e social preview

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P1
- **Dipendenze:** CT-001, dominio definitivo o URL provvisorio deciso
- **Area:** metadata / sharing
- **Complessità:** S
- **Descrizione:** usare title, description e OG copy professionali; mantenere il concept come
  sottotitolo; allineare canonical, sitemap e profili.
- **File/pagina:** `index.html`, metadata/social asset, sitemap/robots se applicabili
- **Risultato atteso:** anteprime e risultati di ricerca descrivono Thomas prima del concept.
- **Criterio di accettazione:** title include nome + ruolo; description è concreta; OG image ha alt;
  URL canonico risponde 200 e coincide con i profili.
- **Informazioni richieste a Thomas:** dominio e approvazione del titolo pubblico.
- **Nota 10/11/2026 (DEC-00 #45):** titolo pubblico approvato (CT-001); dominio ancora aperto in
  REL-01 (#44). Stato live: `<title>` già conforme; `og:title` = «Thomas Basadonne — Built to hold.
  Wired to wonder.» senza ruolo; OG image con «FRONTEND / CREATIVE DEVELOPER».
- **Nota 10/11/2026 (#44, #61):** URL canonico deciso (`workers.dev`, nessun dominio). `canonical`,
  `og:url`, JSON-LD, sitemap e profilo GitHub coincidono. Restano `og:title`, OG image e alt.

### CT-025 — Produrre il pacchetto visuale dei progetti

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P2
- **Dipendenze:** CT-011, CT-015, CT-016 e CT-017
- **Area:** project assets
- **Complessità:** XL
- **Descrizione:** creare cover, screenshot annotati, video e diagrammi secondo la matrice del project
  plan, con dati sintetici e alt text.
- **File/pagina:** asset portfolio e README selezionati
- **Risultato atteso:** sistema visuale coerente che mostra comportamenti, non solo mockup decorativi.
- **Criterio di accettazione:** ogni featured project ha cover + almeno due prove; video senza audio è
  comprensibile; nessun dato sensibile; asset ottimizzati e link stabili.
- **Informazioni richieste a Thomas:** materiale sorgente, autorizzazioni e preferenze di narrazione.

### CT-027 — Definire una strategia linguistica stabile

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P2
- **Dipendenze:** CT-001
- **Area:** cross-channel / localization
- **Complessità:** S
- **Descrizione:** mantenere portfolio e GitHub in inglese; usare inglese come profilo LinkedIn
  principale e italiano come versione secondaria, se utile al mercato.
- **File/pagina:** portfolio, GitHub, LinkedIn e CV
- **Risultato atteso:** nessun miscuglio casuale di lingue tra headline, descrizioni e repository.
- **Criterio di accettazione:** lingua dichiarata per ogni canale; nomi propri e stack invariati;
  traduzioni aggiornate dalla stessa fonte.
- **Informazioni richieste a Thomas:** mercato principale e necessità del CV italiano.

### CT-028 — Applicare microcopy e stati coerenti

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P3
- **Dipendenze:** CT-009 e CT-020
- **Area:** microcopy / resilience
- **Complessità:** S
- **Descrizione:** uniformare loader, drawer, external-link labels, error, 404 e no-script usando la
  proposta copy.
- **File/pagina:** componenti/stati corrispondenti e pagine fallback
- **Risultato atteso:** il tema della calibrazione resta riconoscibile senza nascondere l'azione.
- **Nota 10/11/2026 (DEC-00 #45):** il microcopy d'ingresso («Calibrate / enter») dipende dal nuovo
  gate interattivo (#17); non va fissato prima dello spike.
- **Criterio di accettazione:** ogni errore spiega cosa è successo e offre un'azione; prototype/release
  status non sono ambigui; stringhe accessibili sono specifiche.
- **Informazioni richieste a Thomas:** nessuna.

### CT-029 — Istituire un controllo trimestrale di contenuti e link

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P3
- **Dipendenze:** vetrina iniziale pubblicata
- **Area:** maintenance
- **Complessità:** S per ciclo
- **Descrizione:** verificare ogni tre mesi link, availability, pin, stato progetti, metadata, CV e
  coerenza delle date.
- **File/pagina:** tutti i canali pubblici; usare il link audit come checklist iniziale
- **Risultato atteso:** nessuna promessa o destinazione diventa obsoleta senza essere rilevata.
- **Criterio di accettazione:** registro con data, link controllati, problemi, owner e decisione;
  nessun 404 nelle CTA pubbliche.
- **Informazioni richieste a Thomas:** owner del controllo e frequenza desiderata.

### CT-030 — Misurare la comprensione del posizionamento

> Voce storica: non rappresenta automaticamente lavoro ancora aperto.

- **Priorità:** P3
- **Dipendenze:** CT-009, CT-011, CT-013
- **Area:** editorial QA
- **Complessità:** M
- **Descrizione:** mostrare entry/hero e selected work a 5–7 persone del pubblico target e chiedere chi
  è Thomas, quale lavoro fa, quale progetto ricordano e perché lo contatterebbero.
- **File/pagina:** portfolio pubblicato
- **Risultato atteso:** feedback qualitativo su chiarezza, non preferenze estetiche generiche.
- **Criterio di accettazione:** almeno l'80% identifica frontend come focus; commerce non è confuso con
  e-commerce personale; AI/3D sono letti come estensioni; problemi ricorrenti generano revisioni.
- **Informazioni richieste a Thomas:** pubblico target e persone reclutabili per il test.
