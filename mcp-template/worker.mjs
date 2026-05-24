// worker.mjs — Server MCP HTTP per Cloudflare Workers con OAuth 2.1 + DCR.
//
// Stack:
// - @cloudflare/workers-oauth-provider gestisce token, registrazione client,
//   metadata discovery (.well-known/oauth-authorization-server).
// - KV namespace OAUTH_KV memorizza client registrati e grant.
// - L'UI di /authorize è implementata qui: chiede al PM di incollare
//   MCP_AUTH_TOKEN come "consent password" prima di emettere il code.
//
// Endpoints risultanti:
//   POST /mcp                                       — JSON-RPC MCP (richiede token OAuth)
//   GET  /                                          — status page HTML
//   GET  /authorize                                 — form di consenso (UI)
//   POST /authorize                                 — submit del consenso
//   POST /oauth/token                               — token endpoint (lib)
//   POST /oauth/register                            — DCR endpoint (lib)
//   GET  /.well-known/oauth-authorization-server    — metadata discovery (lib)
//   GET  /.well-known/oauth-protected-resource      — resource metadata (lib)
//
// TODO progetto: sostituisci gli import sottostanti con la tua factory
// client (es. Supabase/Postgres/altro) e i tuoi tool. Lascia il resto.

import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { createClient } from "./client.mjs";       // ← la tua factory (vedi client-factory.example.mjs)
import { createTools } from "./tools.mjs";         // ← i tuoi tool (vedi tools.example.mjs)
import { dispatch, escapeHtml, SERVER_INFO } from "./mcp-dispatcher.mjs";

// =========================================================================
// API handler — riceve solo richieste autorizzate da OAuthProvider.
// =========================================================================

const apiHandler = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/mcp") {
      return jsonResponse({ error: "Endpoint MCP: POST /mcp" }, { status: 404 });
    }

    if (request.method === "GET") {
      return jsonResponse({ ok: true, server: SERVER_INFO });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      return jsonResponse(
        { error: "Server non configurato: secrets SUPABASE_URL/SUPABASE_SERVICE_KEY mancanti." },
        { status: 500 }
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(
        { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
        { status: 400 }
      );
    }

    const client = createClient({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_SERVICE_KEY,
      workspaceId: env.PROJECT_WORKSPACE_ID
    });
    const tools = createTools(client);

    if (Array.isArray(payload)) {
      const responses = [];
      for (const msg of payload) {
        const r = await dispatch(msg, tools);
        if (r) responses.push(r);
      }
      return jsonResponse(responses);
    }

    const response = await dispatch(payload, tools);
    if (!response) return new Response(null, { status: 204 });
    return jsonResponse(response);
  }
};

// =========================================================================
// Default handler — status page, /authorize UI (non protetto da OAuth).
// =========================================================================

const defaultHandler = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return statusPage();
    }

    if (url.pathname === "/authorize") {
      if (request.method === "GET") return renderConsentForm(request, env);
      if (request.method === "POST") return handleConsentSubmit(request, env);
      return new Response("Method Not Allowed", { status: 405 });
    }

    return new Response("Not Found", { status: 404 });
  }
};

// =========================================================================
// /authorize — UI di consenso single-tenant.
// =========================================================================
// TODO progetto: adatta titolo, sottotitolo e palette CSS al brand del cliente.
// Vedi PLAYBOOK Nove C §11b ("Design language brand-aware") prima di
// inventare colori.

async function renderConsentForm(request, env, errorMsg) {
  const oauthReq = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  let clientName = "Client OAuth";
  try {
    const info = await env.OAUTH_PROVIDER.lookupClient(oauthReq.clientId);
    if (info && info.clientName) clientName = info.clientName;
    else if (info && info.redirectUris && info.redirectUris[0]) clientName = new URL(info.redirectUris[0]).hostname;
  } catch {}

  const oauthReqB64 = btoa(JSON.stringify(oauthReq));

  const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Autorizza &lt;nome-progetto&gt; MCP</title>
<style>
:root{--ink:#1f2937;--accent:#3b82f6;--bg:#f9fafb;--card:#fff;--err:#dc2626;--muted:#6b7280}
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--ink);margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;line-height:1.5}
.card{background:var(--card);border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:480px;width:100%;padding:32px}
h1{margin:0 0 8px;font-size:22px;color:var(--accent)}
.sub{color:var(--muted);font-size:14px;margin:0 0 24px}
.client{background:#f3f4f6;padding:12px 16px;border-radius:8px;font-size:14px;margin-bottom:24px}
.client strong{color:var(--ink)}
label{display:block;font-size:14px;font-weight:600;margin-bottom:8px}
.help{font-size:13px;color:var(--muted);margin-bottom:12px}
input[type=password]{width:100%;padding:12px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;font-family:ui-monospace,SFMono-Regular,monospace}
input[type=password]:focus{outline:none;border-color:var(--accent)}
.err{background:#fef2f2;color:var(--err);padding:12px 16px;border-radius:8px;font-size:14px;margin-bottom:16px;border:1px solid #fecaca}
.buttons{display:flex;gap:12px;margin-top:24px}
button{flex:1;padding:14px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
.primary{background:var(--accent);color:#fff}
.primary:hover{filter:brightness(.95)}
.secondary{background:#e5e7eb;color:var(--ink)}
.secondary:hover{background:#d1d5db}
.footer{margin-top:20px;font-size:12px;color:var(--muted);text-align:center}
</style>
</head>
<body>
<div class="card">
  <h1>Autorizza &lt;nome-progetto&gt;</h1>
  <p class="sub">Stai per dare accesso al tuo progetto a un'applicazione esterna.</p>
  <div class="client">
    Applicazione richiedente: <strong>${escapeHtml(clientName)}</strong>
  </div>
  ${errorMsg ? `<div class="err">${escapeHtml(errorMsg)}</div>` : ""}
  <form method="POST" action="/authorize">
    <input type="hidden" name="oauthReq" value="${oauthReqB64}">
    <label for="token">Token di consenso</label>
    <p class="help">Incolla il valore di <code>MCP_AUTH_TOKEN</code> che hai salvato durante il setup (lo stesso che hai passato a <code>wrangler secret put</code>).</p>
    <input type="password" id="token" name="token" autocomplete="off" autofocus required>
    <div class="buttons">
      <button type="submit" name="action" value="approve" class="primary">Autorizza</button>
      <button type="submit" name="action" value="deny" class="secondary">Annulla</button>
    </div>
  </form>
  <p class="footer">Server: ${SERVER_INFO.name} v${SERVER_INFO.version}</p>
</div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

async function handleConsentSubmit(request, env) {
  const form = await request.formData();
  const action = form.get("action");
  const oauthReqB64 = form.get("oauthReq");
  const token = form.get("token") || "";

  let oauthReq;
  try {
    oauthReq = JSON.parse(atob(oauthReqB64));
  } catch {
    return new Response("Richiesta di autorizzazione malformata.", { status: 400 });
  }

  if (action === "deny") {
    // Lo standard OAuth richiede redirect al client con error=access_denied
    const u = new URL(oauthReq.redirectUri);
    u.searchParams.set("error", "access_denied");
    u.searchParams.set("error_description", "L'utente ha annullato l'autorizzazione");
    if (oauthReq.state) u.searchParams.set("state", oauthReq.state);
    return Response.redirect(u.toString(), 302);
  }

  if (!env.MCP_AUTH_TOKEN) {
    return new Response("Server non configurato: secret MCP_AUTH_TOKEN mancante.", { status: 500 });
  }

  if (token !== env.MCP_AUTH_TOKEN) {
    const fakeGet = reconstructGetRequest(request, oauthReq);
    return renderConsentForm(fakeGet, env, "Token errato. Verifica di aver incollato esattamente il valore di MCP_AUTH_TOKEN.");
  }

  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReq,
    userId: "project-default",
    metadata: { label: "<nome-progetto> consent", grantedAt: new Date().toISOString() },
    scope: oauthReq.scope || ["mcp"],
    props: { userId: "project-default", workspaceId: env.PROJECT_WORKSPACE_ID || null }
  });

  return Response.redirect(redirectTo, 302);
}

function reconstructGetRequest(originalPostRequest, oauthReq) {
  const u = new URL(originalPostRequest.url);
  u.searchParams.set("response_type", oauthReq.responseType || "code");
  u.searchParams.set("client_id", oauthReq.clientId);
  u.searchParams.set("redirect_uri", oauthReq.redirectUri);
  if (oauthReq.scope) u.searchParams.set("scope", (oauthReq.scope || []).join(" "));
  if (oauthReq.state) u.searchParams.set("state", oauthReq.state);
  if (oauthReq.codeChallenge) u.searchParams.set("code_challenge", oauthReq.codeChallenge);
  if (oauthReq.codeChallengeMethod) u.searchParams.set("code_challenge_method", oauthReq.codeChallengeMethod);
  return new Request(u.toString(), { method: "GET" });
}

// =========================================================================
// Helpers
// =========================================================================

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) }
  });
}

function statusPage() {
  return new Response(
    `<!doctype html><meta charset=utf-8><title>${SERVER_INFO.name} MCP</title>
<style>body{font-family:system-ui;max-width:640px;margin:60px auto;padding:0 20px;color:#1f2937;line-height:1.55}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}h1{color:#3b82f6}</style>
<h1>${SERVER_INFO.name} MCP server</h1>
<p>Server MCP HTTP attivo con OAuth 2.1 + Dynamic Client Registration.</p>
<p><strong>Endpoint API:</strong> <code>POST /mcp</code> (richiede access token Bearer)</p>
<p><strong>Metadata discovery:</strong> <a href="/.well-known/oauth-authorization-server">/.well-known/oauth-authorization-server</a></p>
<p>Per connetterlo a Claude:</p>
<ol><li>Settings → Connectors → Add custom connector</li>
<li>URL: questo indirizzo + <code>/mcp</code></li>
<li>Lascia OAuth Client ID/Secret vuoti</li>
<li>Salva, premi Connetti, completa il consenso</li></ol>
<p style=color:#666>Versione ${SERVER_INFO.version}</p>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// =========================================================================
// Export — OAuthProvider wrappa apiHandler e defaultHandler.
// =========================================================================

export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler,
  defaultHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  scopesSupported: ["mcp"],
  accessTokenTTL: 3600,
  refreshTokenTTL: 2592000
});
