# Proposta aggiornamento nove-c-kit — lezioni sessione KB (2026-05-30/31)

> Analisi di cosa MANCA nel kit (`github.com/danielcarta9c/nove-c-kit`) e cosa
> aggiungere, dopo la sessione che ha portato la Knowledge Base all'MVP.
> Non posso scrivere sul kit dai miei tool (ristretti a knowledge-base-9c):
> questo e' il materiale pronto da copiare, organizzato come il kit.
>
> **Contesto**: il kit oggi copre web-app vanilla (sync realtime, audit, drag&drop,
> RLS multi-tenant, MCP OAuth skeleton) + metodologia PM. NON copre: RAG/embedding,
> pipeline di ingestion dati, ops infrastrutturali (CI/CD, manutenzione DB,
> deploy automatizzato). La KB e' il primo progetto Nove C "pipeline dati + MCP"
> invece che "web-app": ha generato un intero filone nuovo da capitalizzare.

---

## A. Cosa il kit GIA' copre (verificato, NON riscrivere)

- PLAYBOOK §1: MCP custom connector OAuth 2.1 su Worker — c'e'.
- PLAYBOOK §2/§3/§3b: Supabase keys publishable/secret, Project URL nudo, Data
  API GRANT su schema public — c'e' (li abbiamo ri-usati: lo schema `01` aveva
  gia' i GRANT giusti).
- PLAYBOOK §8/§27/§28: soft delete + audit log + RLS workspace-scoped — c'e' e
  l'abbiamo riusato nello schema KB.
- PLAYBOOK §10: multi-tenant da subito single-tenant nell'uso — c'e', applicato.
- PLAYBOOK §26: "Notte autonoma" — c'e' MA va esteso (vedi C.5: il pattern
  Actions+auto-commit lo rende davvero possibile per le ops).
- PLAYBOOK §34: parsimonia build credits CI/CD ("1 push per concept") — c'e', ed
  e' stato VIOLATO oggi (decine di push di fix). Vedi C.6.
- mcp-template/: skeleton OAuth generico — c'e'. Gli manca la variante RAG (B.1).

## B. Cosa MANCA del tutto — nuovo filone "RAG / pipeline dati"

### B.1 — Variante RAG del mcp-template (tool search_kb)
Il template MCP e' generico. Aggiungere un esempio `tools.search-kb.example.mjs`:
embedda la query, chiama una RPC `match_*_chunks` su pgvector, ritorna chunk +
link fonte. E' il pattern del nostro `mcp-server/client.mjs` + `tools.mjs`.

### B.2 — Snippet: schema pgvector + RPC match (SQL)
`snippets/pgvector-rag.sql`: tabelle documents/chunks(embedding vector(N)) +
indice HNSW `vector_cosine_ops` + funzione `match_chunks(query_embedding, k,
filtri)` con `1 - (embedding <=> q)` come similarity. Additive-only, RLS, GRANT.
Gia' scritto e collaudato in `sql/01-schema.sql` della KB.

### B.3 — Snippet: ingestion job idempotente (Graph/sorgente -> pgvector)
Pattern del nostro `ingestion/`: delta sync con token persistito, filtro scope
(include/exclude path), dedup, chunking a caratteri, embedding batch, upsert
file-per-file. Punti che SOLO una run reale rivela (vedi C.1-C.4).

### B.4 — ADR template per la dimensione embedding (Matryoshka)
Decisione ricorrente: dimensione vettori = costo storage. text-embedding-3-small
supporta `dimensions` (Matryoshka): si tronca 1536->768 (-50% storage, <1% MTEB)
senza ri-embeddare (troncare+rinormalizzare i vettori esistenti ==
output API a 768). Da mettere come ADR di riferimento. (nostro ADR 0003)

---

## C. Lezioni DURE da promuovere ad anti-pattern / regole (PLAYBOOK §12 e §23)

> Queste sono le piu' preziose: costate ore oggi. Vanno nella tabella anti-pattern.

### C.1 — [ANTI-PATTERN] Bulk-load senza stima di dimensione finale
Indicizzato l'intero corpus a 1536 dim senza stimare quanti chunk -> Supabase
saturo, read-only. **Correzione**: PRIMA di un ingest massivo, una modalita'
"SCAN" che conta i file in-scope dai soli METADATI (no download) e stima
chunk/spazio. Decidere lo scope sui NUMERI, non sui nomi delle cartelle.

### C.2 — [ANTI-PATTERN] Estrazione che carica l'intero file in memoria
pdf-parse/xlsx caricano tutto il file prima che tu possa troncare il testo ->
OOM su PDF scansionati / xlsx enormi. **Correzione**: skippare i file sopra una
soglia di BYTE *prima* del download (la size arriva gratis dai metadati). +
tetto ai caratteri estratti. + `--max-old-space-size` ADEGUATO al runner (il
runner GitHub ha 16GB: NON metterlo a 3GB "per prudenza" — fu un autogol che
causava l'OOM invece di prevenirlo) + `global.gc()` periodico con `--expose-gc`
(pdf-parse trattiene memoria tra i file).

### C.3 — [ANTI-PATTERN] Testo grezzo dentro Postgres senza sanitize
`.txt`/estrazioni con byte NUL/control char -> "unsupported Unicode escape
sequence", insert fallito, file perso. **Correzione**: rimpiazzare i control
char (preservando \t \n \r) prima di salvare.

### C.4 — [ANTI-PATTERN] Chiamate API senza retry sul rate limit
Embedding 429 (TPM OpenAI) senza backoff -> file persi silenziosamente.
**Correzione**: retry con backoff che rispetta il "try again in Xs" del provider.

### C.5 — [PATTERN NUOVO] Job ingest ripartibile + scrittura file-per-file
L'ingest scrive ogni file appena pronto: un crash/timeout NON perde il lavoro
fatto. + flag per saltare i gia' indicizzati (etag) -> un rilancio riprende da
dove era. Conseguenza mentale IMPORTANTE: dati nel DB possono essere il deposito
PARZIALE di un run morto a meta', non "lavoro finito". Non fidarsi del fatto che
"i dati ci sono".

### C.6 — [REGOLA] Storage Supabase: capire il regime PRIMA di riempire
Free = cap DATABASE 500MB; piani a disco = ~95% del disco. Sapere quale si applica
(empiricamente: a che soglia sei andato read-only) cambia tutto. + il disco
cresciuto NON si restringe da solo. + `pg_relation_size` (vivo) vs
`pg_total_relation_size` (con TOAST+indici): i vettori stanno nel TOAST, non nel
"vivo" — non scambiare la differenza per bloat (errore fatto oggi: il VACUUM FULL
trovo' 0 dead rows). Misurare il bloat (dead tuples) prima di vacuum-are.

---

## D. IL filone piu' importante — Ops via GitHub Actions + auto-commit log

> Documento completo gia' pronto: `docs/PATTERN-automazione-actions.md` (copiarlo
> nel kit come `PLAYBOOK` §nuovo + `snippets/ops/`). Riassunto del perche':

Il kit assume "web-app deployata su Netlify, sviluppo da PC". La KB ha rotto
questo assunto: infra cloud (Supabase, Cloudflare, M365) gestita spesso da
TELEFONO, con l'agente AI che non ha le credenziali. Ne e' nato un pattern:

- **Ogni operazione cloud = un workflow Actions** che gira coi secret del runner
  e **auto-committa l'output in un file nel repo** -> l'agente lo legge con
  `git pull`, zero copia-incolla.
- Esempi collaudati: SQL via `psql` (pooler IPv4 5432, password come `PGPASSWORD`
  separato per evitare url-encoding dei caratteri speciali; niente
  `--single-transaction` cosi VACUUM/CREATE INDEX CONCURRENTLY girano); deploy
  Cloudflare via `wrangler` (token "Edit Workers", KV id REALE committato nel
  wrangler.toml o si aggancia al KV sbagliato e gli utenti OAuth perdono il
  consenso; i `wrangler secret` sono persistenti, il deploy non li tocca).
- **Verificare la catena con un self-test `on: push`** (parte all'istante; il
  cron ha 5-15min di latenza). Il push del bot via GITHUB_TOKEN non ri-triggera
  (no loop), `[skip ci]` per sicurezza. TESTATO: commit del bot in ~15s.
- Note dure: `working-directory: .` sullo step di commit se il job ha un default
  (altrimenti path raddoppiato), `if: always()` per committare anche gli errori.

Questo **estende §26 "Notte autonoma"**: con questo pattern l'agente puo'
diagnosticare/correggere/ri-testare ops di notte leggendo i log da git, non solo
scrivere codice. Limite onesto: il PRIMO trigger (o l'attivazione cron) lo fa
l'umano una volta; copre solo cio' che il runner raggiunge coi secret presenti.

---

## E. Micro-gotcha tecnici da appuntare (riga ciascuno)

- Supabase read-only su free si scavalca 15min da UI (banner "Override") o via
  `SET TRANSACTION READ WRITE` come PRIMA istruzione della sessione SQL.
- `DROP INDEX` libera spazio SENZA scrivere file temporanei -> gira anche a disco
  pieno (utile per uscire dal read-only quando il VACUUM non parte).
- SQL editor Supabase avvolge tutto in una transazione -> VACUUM e CREATE INDEX
  CONCURRENTLY NON girano li': serve psql.
- pgvector >= 0.7 ha `subvector()` e `l2_normalize()` (servono per il troncamento
  Matryoshka in-place) e `cosine_distance()` (alternativa all'operatore `<=>`
  che si rompe se incollato da telefono).
- Copia-incolla da telefono: `nome.id` viene trasformato in link (`.id` =
  dominio Indonesia) -> usa `"id"` tra virgolette; `<=>` viene maciullato -> usa
  `cosine_distance()`.
- GitHub Actions: un workflow `workflow_dispatch` compare solo se il file e' sul
  branch di DEFAULT (main). Su un branch non lo lanci.
- Default dei workflow_dispatch: mettere i default = caso d'uso reale piu' comune
  (es. run completo), non il caso di test — l'utente non deve ricordarsi di
  cambiare 3 campi a ogni run.
