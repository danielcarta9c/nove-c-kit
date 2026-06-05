# Changelog

## Non rilasciato (post-v1.2)

- **HANDOFF design INVERTITO** — l'iterazione precedente (12 sezioni
  auto-contenute, "next-Claude legge solo HANDOFF") codificava il
  comportamento osservato sbagliato. Ora `HANDOFF.md` è un **CANCELLO
  DI LETTURA**, non un riassunto: 9 sezioni che impongono l'ordine di
  lettura di tutti i doc del progetto + kit, sentinel checks che
  bloccano Claude se parte senza contesto, e SOLO il delta della
  sessione (in-flight, decisioni recenti, quirks emersi). Le sezioni
  "duplicate" della v2 (profilo PM, metodologia, regole hard, pattern
  codice) **rimosse** dal template: vivono nei loro luoghi canonici
  (CLAUDE.md, PLAYBOOK, ADR, EXAMPLES.md). PLAYBOOK §32.5 riscritta col
  nuovo principio meta. AGENT_BOOTSTRAP regola #16 riformulata per
  coprire sia scrittura sia lettura ("segui il reading order, rispondi
  alle sentinel prima di toccare codice").

- **`EXAMPLES.md` (nuovo, root)** — 4 esempi code-level ❌/✅ con diff veri:
  Surgical Changes (fix realtime senza drive-by refactor + logging senza
  style drift), Simplicity First (no Strategy pattern per 1 backend),
  Goal-Driven (bug-hunt con Playwright test che riproduce PRIMA del fix),
  e la tecnica "3 interpretazioni con stima" per quando chiedere al PM è
  necessario. Ispirato/adattato dalla skill open-source
  `andrej-karpathy-skills` (MIT). Non importati i 4 principi come sezioni
  separate: 3 di 4 già coperti dal kit, 1 (ask when uncertain generico)
  conflittava con §36; risolto dalla tecnica "3 interpretazioni".
- AGENT_BOOTSTRAP — nuova regola #15 **"Surgical changes"** col test di
  Karpathy verbatim. Titolo "le 14" → "le 15".
- PLAYBOOK §13 (anti-overengineering) — adottata la frase di Karpathy
  *"Good code is code that solves today's problem simply, not tomorrow's
  problem prematurely"* come chiusura del punto 4, con attribuzione e
  rimando a `EXAMPLES.md` §2.
- PLAYBOOK §11 (anti-pattern) — nuova riga **"Drive-by refactor / scope
  creep"**: fix di un bug + cambi adiacenti non richiesti (JSDoc,
  TypeScript, stile, refactor di codice che funziona).
- PLAYBOOK §32.1 — nuova **tecnica "3 interpretazioni con stima"** per
  quando l'ambiguità è di prodotto (scope/costo/UX) e §36 non vieta di
  chiedere. Risolve la tensione apparente fra "non chiedere il come" e
  "ask when uncertain".
- README — nuova sezione **Crediti** con attribuzione esplicita a
  multica-ai/andrej-karpathy-skills.

- PLAYBOOK §12 inventario — **n8n dismesso** (a pagamento, cancellato a
  mag 2026). L'unico flow attivo (redattore SEO che pubblica sul blog di
  `nove-c.com`) è stato migrato con successo su GitHub Actions: conferma
  sul campo che per workflow automation semplici il trittico ops Actions
  (§35) è sufficiente, niente orchestratore esterno a pagamento.
  Riattivabile se serve. Spostato dalla sezione "Basso utilizzo" alla
  nuova "Valutati e dismessi".

- PLAYBOOK §35 — nuova sottosezione **"Lanciare un workflow da agente AI
  senza permesso di dispatch (pattern trigger-file)"** prima degli Esempi
  A e B, con sintomo concreto (HTTP 403 → loop di workaround), causa
  (sandbox blocca `workflow_dispatch`, NON è auth), soluzione passo-passo.
  Limite #1 della lista riformulato per puntare esplicitamente al
  pattern. Anti-pattern §11: nuova riga "Agente tenta dispatch → 403 →
  cerca workaround". AGENT_BOOTSTRAP regola #14: "Mai dispatch via API,
  sempre trigger-file". La vecchia sottosezione "Trigger-file: gotcha
  comune ai pattern A e B" assorbita nella nuova sezione centrale (era
  scatter, ora unica fonte). Risolve il caso visto in produzione: nuove
  sessioni Claude perse in loop di 403 prima di trovare il pattern.
- PLAYBOOK §12 — nuova sottosezione "Servizi e abbonamenti disponibili
  (inventario)": elenco qualitativo delle subscription Nove C già attive
  (Claude Pro Max, ChatGPT Premium, OpenAI API, GitHub, Cloudflare,
  Netlify, Supabase, Browserbase, dominio nove-c.com, n8n in basso
  utilizzo). Include lo stato critico Supabase free **2/2 progetti**.
  Un Claude fresco prima di proporre uno strumento nuovo legge qui.
- AGENT_BOOTSTRAP — pointer all'inventario in "Stack di default da
  proporre", con il caveat esplicito sulla soglia Supabase. Chiude la
  lacuna emersa nell'audit fresh-Claude.

- `snippets/sql-ops-workflow.yml` (nuovo) — workflow per eseguire script
  SQL su Postgres/Supabase via `psql` + auto-commit del log in `sql/ops/out/`.
  **Doppio trigger**: `workflow_dispatch` per il PM + trigger-file
  `ops/run-sql.txt` per l'agente AI (selezione script a cascata:
  dispatch input → trigger-file → default).
- `snippets/run-sql.txt.example` (nuovo) — file trigger d'esempio.
- PLAYBOOK §35 Esempio A esteso con 3 nuovi gotcha vissuti sul campo:
  pattern doppio trigger, `ON_ERROR_STOP=1` obbligatorio (senza, metà
  migrazione applicata in silenzio), check esplicito `PGPASSWORD` vuoto.
- PLAYBOOK §35 — nuova sottosezione "Trigger-file: gotcha comune ai
  pattern Esempio A e B": `on: push: paths` scatta solo se il contenuto
  CAMBIA davvero; per ri-eseguire serve timestamp/commento variabile.
- Promozione dal repo KB (`REGOLE.md` workflow di promozione progetto-vivo
  → kit), completa il trittico ops: scaffold generico + deploy MCP + SQL ops.

- `snippets/mcp-deploy-workflow.yml` (nuovo) — workflow auto-deploy del
  Worker MCP via `wrangler` + auto-commit del log + smoke-test DB opzionale.
  Pattern **trigger-file** (`mcp-server/deploy.trigger`) invece di
  `workflow_dispatch`: l'agente AI può deployare in autonomia senza
  permessi di triggerare workflow manualmente.
- `mcp-template/deploy.trigger` (nuovo) — file di esempio del trigger,
  viaggia col template MCP quando lo copi in un nuovo progetto.
- `mcp-template/README.md` — nuova sezione "Auto-deploy via GitHub
  Actions" con setup, secret richiesti, distinzione fra secret GitHub e
  secret runtime del Worker.
- PLAYBOOK §35 Esempio B esteso: pattern trigger-file, `ref: main`
  obbligatorio (deployare da branch con `wrangler.toml` placeholder
  scollega gli utenti OAuth), `working-directory` che non eredita allo
  step di commit, drift di `npx wrangler` se non pinnato, secret runtime
  mancanti = Worker "non configurato". Promozione dal repo KB
  (`REGOLE.md` workflow di promozione progetto-vivo → kit).

## v1.2 — 2026-05-31

- Process: attivato sul repo il flag **"Automatically delete head branches"**
  (Settings → General → Pull Requests). Dal merge di questa PR in poi ogni
  branch sorgente di una PR squash-mergiata viene cancellato in automatico.
- PLAYBOOK "Perimetro dei file": disclaimer che la tabella descrive il
  layout dentro un repo-prodotto (doc sotto `docs/`), non il kit stesso.

- **PLAYBOOK riordinato**: Parte D fisicamente contigua. Prima l'ordine
  era `§13-§24, §32, [Parte E §25-§31], §33, §34, §35, §36` (la metodologia
  spezzata in due dall'inserto Parte E); ora è `§13-§24, §32, §33, §34, §35,
  §36, Parte E §25-§31`. Niente rinumerazione → zero cross-ref rotti, anchor
  link tutti ancora validi.
- PLAYBOOK §27 `audit_log` allineato al snippet canonico: `id BIGSERIAL`
  (era `uuid`), col riferimento al GRANT della sequenza in §3b. Tolta la
  contraddizione fra §27 inline e `snippets/multi-tenant-audit-soft-delete.sql`.
- AGENT_BOOTSTRAP — "Identità" ridetta come "piena confidenza architetturale
  e sistemica, non legge il dettaglio del codice", con rimando al "Profilo
  del PM" sotto (toglie la potenziale contraddizione con "non legge codice/
  diff/log").
- AGENT_BOOTSTRAP — "Quando fermarsi e chiedere" preceduto da un blockquote
  che punta a "Profilo del PM"/§36 come fonte autoritativa del principio
  ("autonomia sul rischio, non sul ruolo").
- AGENT_BOOTSTRAP — sezione "Regole non negoziabili (le 10 + 1)" rinominata
  in "(le 13)": erano 13, il titolo sbagliato.
- PLAYBOOK §14 — frase "Copia da questo Playbook gli snippet della Parte E"
  riformulata: i snippet canonici stanno in `nove-c-kit/snippets/`, la
  Parte E ne è il razionale.
- PLAYBOOK Parte E intro — aggiunta riga della tabella per
  `ops-auto-commit-workflow.yml` + `selftest-autolog.yml` (§35).
- PLAYBOOK — riferimenti interni Scadenzario riquadrati: subheader
  "Riferimenti file (Scadenzario)" → "Riferimenti interni (repo
  Scadenzario, privato)"; tolte le line-number anchors (`index.html:NNN`,
  `sql/04-*`) che invecchiavano; §30 redirige a `mcp-template/` del kit
  invece del privato `mcp-server/`.

- PLAYBOOK §36 (nuova, Parte D) — "Profilazione del PM e calibrazione
  dell'autonomia": 4 domande di profilo + 5 regole derivate (porta solo
  decisioni di prodotto, intuizioni del non-tecnico verificate nel codice,
  autonomia sul rischio non sul ruolo, autorizzazioni a tempo).
- AGENT_BOOTSTRAP — nuova sezione "Profilo del PM (Daniel) e calibrazione
  dell'autonomia" subito dopo "Identità": template operativo del §36, con
  cosa portare al PM, cosa NO, cosa fare da solo, cosa NO.
- PLAYBOOK §32.5 (nuova) — "Handoff di fine sessione": sintomi di contesto
  saturo (tool che non caricano, ripetizioni), il deliverable HANDOFF.md
  in 4 sezioni, da referenziare come prima lettura del prossimo turno.
- `templates/HANDOFF.md` — skeleton del documento di handoff.
- PLAYBOOK §35 — nuova sottosezione "Trappole silenziose" con le 2 cause-
  radice verificate sul campo (`*.log` nel `.gitignore` ingoia i log; `git
  push` rifiutato per `main` avanzato → `pull --rebase --autostash` + retry
  3x); nuovo 4° limite onesto (runner free = 1 job concorrente); ripristinato
  bullet `if: always()` ora che lo scaffold ha due step.
- `snippets/ops-auto-commit-workflow.yml` — struttura a 2 step: run con
  heartbeat (commit ogni 60s + `push_with_retry`) + step `if: always()`
  finale come rete (belt-and-braces).
- PLAYBOOK §11 — 3 nuove righe anti-pattern (`*.log` gitignored che ingoia
  i log ops, push bot rifiutato per main avanzato, cache cTag/eTag dove
  `eTag` cambia anche solo spostando il file).
- PLAYBOOK §3d — corretta la regola: `REGOLE.md` vuole "1-2 sprint di
  maturità in produzione su un caso reale", **una sola implementazione
  basta** (avevo scritto "almeno due", troppo stretto per uno studio
  piccolo dove i filoni rari non vedranno mai un secondo caso).
- PLAYBOOK §35 — aggiunta sottosezione "Job lunghi e timeout: heartbeat commit
  (non aspettare la fine)" + principio generale: ogni workflow auto-trigger
  può non arrivare in fondo (timeout/cancel/runner killato), serve far
  arrivare lo stato parziale al repo PRIMA, non DOPO. Scaffold
  `snippets/ops-auto-commit-workflow.yml` riscritto con heartbeat
  (commit ogni 60s in background + commit finale + `stdbuf -oL` per line-buffering).
- PLAYBOOK §3d — tolto il "in promozione" come IOU: `pgvector`/`ingestion`/
  `search-kb` restano nel repo KB. `REGOLE.md` prescrive due progetti reali
  prima di promuovere; una sola implementazione non è ancora una regolarità.
- PLAYBOOK §35 — nuovo pattern PM "Automazione ops via GitHub Actions +
  auto-commit log": ogni op cloud (psql, wrangler…) diventa un workflow che
  scrive l'output in un file del repo. Estende §24 "Notte autonoma" alle ops
  infrastrutturali (l'agente legge gli esiti via `git pull`, zero copia-incolla).
  Scaffold pronti in `snippets/ops-auto-commit-workflow.yml` e
  `snippets/selftest-autolog.yml`.
- PLAYBOOK §3c — Supabase: regime di storage (free 500MB vs disco), uscire dal
  read-only (Override, `SET TRANSACTION READ WRITE`, `DROP INDEX` per liberare
  spazio), `pg_total_relation_size` vs `pg_relation_size` (i vettori sono nel
  TOAST), SQL editor = una transazione (per `VACUUM`/`CREATE INDEX CONCURRENTLY`
  serve psql), gotcha mobile copia-incolla (`.id` auto-link, `<=>` mangiato).
- PLAYBOOK §3d — filone RAG/ingestion pipeline (lezioni KB): stima prima/
  indicizza dopo, job ripartibile file-per-file, Matryoshka per dimezzare lo
  storage senza ri-embeddare, estrazione testo che evita l'OOM, sanitize prima
  dell'insert, retry sul 429. Snippet pgvector/ingestion/tool MCP search-kb
  segnati "in promozione" dal repo KB.
- PLAYBOOK §11 — 6 nuove righe alla tabella anti-pattern (estrazione full-file
  in memoria, bulk-load senza scan, testo non sanitizzato, no-retry 429,
  `VACUUM FULL` senza misurare, loop copia-incolla per ops cloud).
- PLAYBOOK §3b — breaking change Supabase 2026: la schema `public` non è più
  esposta al Data API di default (progetti nuovi dal 30 mag 2026, esistenti dal
  30 ott 2026). Spiega date, grant ≠ RLS, e la forma Nove C (`authenticated` +
  `service_role`, no `anon`).
- `snippets/multi-tenant-audit-soft-delete.sql` — aggiunti i `GRANT` Data API
  per tabella business + `audit_log` (incl. sequenza BIGSERIAL). Riferimento in
  §14 (setup Giorno 2).

## v1.1 — 2026-05-24

- `templates/` — skeleton dei doc vivi da copiare nel nuovo progetto
  (`PROJECT_STATE.md` con sezione "Ambienti live", formato ADR).
- `mcp-template/.dev.vars.example` — template env per `wrangler dev`
  (era citato in doc ma il file mancava).
- `mcp-template/claude_desktop_config.example.json` — config stdio per
  agganciare `index.mjs` a Claude Desktop (completa il path stdio già
  presente nel template).
- Doc: chiarito che il `PLAYBOOK.md` vive nel kit (non nello Scadenzario),
  aggiunto entry-point di bootstrap per Claude nel README, wiring del
  checklist giorno 1-3 di `AGENT_BOOTSTRAP.md` ai file del kit, sezione
  versioning allineata al solo tag `v1`.

## v1 — 2026-05-24

Prima release del kit, estratta dallo Scadenzario Commercialisti
(primo prodotto Nove C costruito interamente con questa metodologia).

### mcp-template
- `worker.mjs` — Cloudflare Worker MCP HTTP con OAuth 2.1 + DCR via
  `@cloudflare/workers-oauth-provider`. Pagina `/authorize` brandizzabile
  con consent token.
- `mcp-dispatcher.mjs` — Dispatcher JSON-RPC condiviso stdio + HTTP.
- `index.mjs` — Runner stdio per debug locale (Claude Desktop).
- `tools.example.mjs` + `client-factory.example.mjs` — Pattern factory
  con 1 tool fittizio (`ping`) e 1 con I/O (`listEntities`).
- `wrangler.toml`, `.dev.vars.example`, `package.json`, `setup-mcp.ps1`
  (helper Windows PowerShell).

### snippets
- `markDirty-saveNow.mjs` — Sync engine debounced 350ms.
- `handleRemoteChange.mjs` — Realtime listener con `Object.assign` +
  self-echo skip.
- `audit-log.mjs` — Batched fire-and-forget audit logger client-side.
- `multi-tenant-audit-soft-delete.sql` — Schema trasversale: workspaces,
  workspace_members, current_workspace_id(), audit_log, soft delete,
  RLS workspace-scoped.
- `attachKanDrag.mjs` — Drag & drop touch-friendly per Kanban iOS
  (long-press + pointer events + passive: false su touchmove).
- `bootHarness.mjs` — Test harness Playwright headless con server statico
  interno + network bloccata verso Supabase produzione.
