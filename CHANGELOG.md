# Changelog

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
