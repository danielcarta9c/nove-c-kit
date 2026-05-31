# Changelog

## Non rilasciato (post-v1.1)

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
