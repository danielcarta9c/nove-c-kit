#!/usr/bin/env node
// index.mjs — Server MCP stdio (locale, per dev).
//
// Per uso in produzione (Claude web/mobile/desktop) usa il Worker HTTP:
// vedi worker.mjs + wrangler.toml. Questo entry point resta utile per
// testare i tool da Claude Desktop in mancanza di rete o per debug locale.

import { createClient } from "./client.mjs";       // ← la tua factory
import { createTools } from "./tools.mjs";         // ← i tuoi tool
import { dispatch } from "./mcp-dispatcher.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const WORKSPACE_ID = process.env.PROJECT_WORKSPACE_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  process.stderr.write("[mcp] Env mancanti: SUPABASE_URL + SUPABASE_SERVICE_KEY richiesti.\n");
  process.exit(1);
}

const client = createClient({ url: SUPABASE_URL, key: SUPABASE_KEY, workspaceId: WORKSPACE_ID });
const tools = createTools(client);

function send(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }
function logErr(msg) { process.stderr.write(`[mcp] ${msg}\n`); }

let buffer = "";
process.stdin.on("data", async (chunk) => {
  buffer += chunk.toString("utf-8");
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      const response = await dispatch(msg, tools);
      if (response) send(response);
    } catch (e) {
      logErr(`error: ${e.message}`);
    }
  }
});

process.stdin.on("end", () => { logErr("stdin closed"); process.exit(0); });

logErr(`<nome-progetto>-mcp stdio avviato. ${tools.TOOLS.length} tool. Workspace: ${client.workspaceId}`);
