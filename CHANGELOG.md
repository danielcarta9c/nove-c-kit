# Changelog

## Non rilasciato (post-v1)

- `templates/` — skeleton dei doc vivi da copiare nel nuovo progetto
  (`PROJECT_STATE.md` con sezione "Ambienti live", formato ADR).
- `mcp-template/.dev.vars.example` — template env per `wrangler dev`
  (era citato in doc ma il file mancava).
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
