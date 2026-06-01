# snippets

Frammenti di codice testati in produzione Nove C, pronti da copia-incollare
nel tuo `index.html` (o equivalente) e adattare ai nomi delle tue entità.

| File | Cosa risolve | Riferimento PLAYBOOK |
|------|--------------|----------------------|
| `markDirty-saveNow.mjs` | Save debounced 350ms invece di N round-trip per ogni keystroke | §6 + §25 |
| `handleRemoteChange.mjs` | Realtime listener Supabase senza scollegare i form aperti | §5 + §26 |
| `audit-log.mjs` | Batched fire-and-forget audit logger client-side | §7 + §27 |
| `multi-tenant-audit-soft-delete.sql` | Schema trasversale: workspaces, current_workspace_id(), audit_log, soft delete, RLS workspace-scoped | §9 + §28 |
| `attachKanDrag.mjs` | Drag&drop Kanban touch-friendly su iPhone (long-press + passive: false) | §10 + §29 |
| `bootHarness.mjs` | Test harness Playwright headless: server statico + Supabase prod bloccato | §21 + §31 |
| `ops-auto-commit-workflow.yml` | Scheletro GitHub Actions: esegue un'op cloud (psql, wrangler…) e auto-committa il log nel repo | §35 |
| `selftest-autolog.yml` | Workflow usa-e-getta per verificare end-to-end la catena auto-commit prima di usarla davvero | §35 |
| `mcp-deploy-workflow.yml` | Auto-deploy del Worker MCP via wrangler con trigger-file (`mcp-server/deploy.trigger`) + auto-commit log + smoke-test DB opzionale | §35 Esempio B |
| `sql-ops-workflow.yml` | Esegue uno script SQL su Postgres/Supabase via psql + auto-commit del log in `sql/ops/out/`. Doppio trigger: `workflow_dispatch` (PM) + trigger-file `ops/run-sql.txt` (agente AI) | §35 Esempio A |
| `run-sql.txt.example` | File trigger d'esempio per `sql-ops-workflow.yml` — copia in `ops/run-sql.txt` del tuo repo | §35 Esempio A |

## Come usarli

1. Apri il file, leggi il commento di testa (3-5 righe di "cosa risolve, quando usarlo").
2. Copia il codice nel tuo progetto.
3. Cerca i placeholder `<entity>`, `<entity_a>`, `<table_name>`, `state.data.<x>`
   e sostituiscili con i nomi della tua app.
4. Annota nel commit: `// adapted from nove-c-kit v1 snippets/<file>`.

## Anti-pattern

- **NON `npm install` da qui**. Sono snippet, non una libreria. Copia il codice.
- **NON modificare il file nel kit** per il tuo caso d'uso. Modifica la
  copia nel tuo progetto. Se il pattern stesso va migliorato, apri PR qui.
