# Fonti editoriali di SYS-01

Estratti sanificati dei quattro documenti locali usati come input della #51. La consegna in repository
è autorizzata da Thomas il **14 novembre 2026**, in un commit fonti separato e precedente al commit audit.
Gli originali untracked nel checkout principale sono preservati; **non si pubblicano le copie integrali**.

## Contenuto e provenienza

| File | Fonte | Selezione conservata |
|---|---|---|
| `PORTFOLIO_CONTENT_AUDIT.md` | 17 luglio 2026 | Finding editoriali ED-001–ED-018, senza la voce archive non pertinente. Non descrive il sito corrente. |
| `PORTFOLIO_COPY_PROPOSAL.md` | Bozza di luglio 2026 | §§1–5, 7, 15–18: direzione, interfaccia, contatti, stati e metadata. Non è una lista di patch autorizzate. |
| `PORTFOLIO_MASTER_COPY.md` | 5 novembre, note fino al 12 novembre 2026 | Identity sheet e copy selezionato §§3.1–3.3, 3.5, 3.7, 3.11–3.12; dettagli dei dossier non riprodotti. |
| `PORTFOLIO_CONTENT_BACKLOG.md` | Luglio, note del 10 novembre 2026 | Voci editoriali/interfaccia CT-001/002/008–013/015/020/022/025/027–030. Priorità e domande restano storiche. |

Gli ID originali restano riconoscibili anche quando non consecutivi. Le omissioni sono per sezioni
complete, non frasi rese anonime a metà. Date, qualificatori e placeholder nei brani conservati
appartengono alla fonte: non sono una nuova verifica o una richiesta di pubblicare quei testi.

## Precedenza e stato corrente

1. Decisioni esplicite di Thomas registrate nelle issue.
2. Contenuto effettivo e test di contratto: [`src/content/portfolio.ts`](../../src/content/portfolio.ts).
3. Audit del sistema **`docs/SYS-01_AUDIT.md`**, ricognizione del 13 novembre 2026, distinto dall'audit editoriale di luglio qui archiviato.
4. Questi estratti, utilizzabili come provenienza delle domande, non come stato attuale.

Il ruolo pubblico è `Frontend Developer · Commerce & AI tools`, non l'alternativa storica
`Commerce & Interactive Systems`. Email, capitoli, prove e media sono già nel sito: le loro vecchie
assenze non generano automaticamente nuove issue. #44, #23, #24, #25, #26, #48 e #49 registrano le
scelte implementate. Il lavoro corrente di SYS-01 è tracciato da **#79–#82**.
Le verifiche dei canali e il CV restano fuori da SYS-01, nel perimetro del check finale #46.

## Confine pubblico

- Non inclusi PDF/export privati, dossier di progetti, inventari di checkout, dettagli dell'ambiente
  cliente, statistiche interne, percorsi macchina, note riservate e valutazioni di repository estranei.
- I nomi dei prodotti da tenere anonimi non sono riprodotti, neppure in slug o rimandi agli originali.
- I collaboratori già nominati nel sito restano attribuiti: sanificare non cancella l'ownership altrui.
- Nessun allegato, project plan o file menzionato nei brani storici è importato automaticamente.
  Gli ID CT-* non inclusi sono riferimenti alla fonte, non link a file mancanti da recuperare.
- Nessun file di questa cartella è in `public/` o importato dall'app: nessun costo runtime.
- Gli originali sono stati verificati invariati tramite hash. L'ordine Git è fonti → audit;
  la ricognizione del 13 novembre precede comunque i commit del 14 novembre e non viene retrodatata.
