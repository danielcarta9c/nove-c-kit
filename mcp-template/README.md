# mcp-template

Scheletro Cloudflare Worker per esporre il tuo progetto come **custom MCP
connector** verso Claude (web / mobile / desktop) tramite OAuth 2.1 + DCR.

## Architettura

```
Claude.ai  ──HTTPS──>  Cloudflare Worker  ──HTTPS──>  Supabase (o altro)
                       ├── OAuthProvider (token + DCR)
                       ├── KV: client registrati + grant
                       ├── /authorize: pagina consent token
                       └── /mcp: JSON-RPC dispatcher
```

## File del template

| File | Cosa fa | Da modificare? |
|------|---------|----------------|
| `worker.mjs` | Entry point Cloudflare Worker (OAuth + routing /mcp + /authorize) | Solo la palette/testi della pagina `/authorize` |
| `mcp-dispatcher.mjs` | JSON-RPC handler condiviso stdio + HTTP | Solo il `name` in `SERVER_INFO` |
| `index.mjs` | Runner stdio per dev locale (Claude Desktop) | Niente |
| `client-factory.example.mjs` | Pattern factory client (rinomina in `client.mjs`) | **Sì**: implementa i tuoi metodi REST |
| `tools.example.mjs` | Registry tool MCP (rinomina in `tools.mjs`) | **Sì**: aggiungi i tuoi tool |
| `wrangler.toml` | Config Cloudflare Workers | `name` + l'id KV (auto-popolato da setup-mcp.ps1) |
| `package.json` | Deps NPM | `name` + `description` |
| `setup-mcp.ps1` | Helper PowerShell (Windows) per setup KV + deploy | Niente |
| `.dev.vars.example` | Template env per `wrangler dev` | Copia in `.dev.vars` (gitignored) |

## Setup (Windows PowerShell)

```powershell
# 0. Prerequisiti (una volta)
# - Account Cloudflare free attivo: https://dash.cloudflare.com/sign-up
# - Node 22+ installato
npx wrangler login                                    # OAuth nel browser

# 1. Copia il template nel tuo progetto
mkdir mio-progetto\mcp-server
copy nove-c-kit\mcp-template\* mio-progetto\mcp-server\
cd mio-progetto\mcp-server

# 2. Rinomina <nome-progetto> nei file
#    (worker.mjs, mcp-dispatcher.mjs, wrangler.toml, package.json, README.md,
#     setup-mcp.ps1)

# 3. Rinomina i template .example
ren client-factory.example.mjs client.mjs
ren tools.example.mjs tools.mjs
# → adattali al tuo dominio (vedi commenti dentro i file)

# 4. Setta i secrets (interattivo, no echo)
npx wrangler secret put SUPABASE_URL                  # Project URL Supabase
npx wrangler secret put SUPABASE_SERVICE_KEY          # Secret key (sb_secret_...)
npx wrangler secret put MCP_AUTH_TOKEN                # genera 32 char random

# 5. Setup completo (KV + deploy)
.\setup-mcp.ps1
# → output: https://<nome-progetto>-mcp.<subdomain>.workers.dev
```

## Setup (macOS / Linux bash)

Stessa procedura, ma sostituisci `setup-mcp.ps1` con i comandi manuali:

```bash
npm install
npx wrangler kv namespace create OAUTH_KV
# copia l'id mostrato nel wrangler.toml (sostituisce PLACEHOLDER_KV_NAMESPACE_ID)
npx wrangler deploy
```

## Test locale prima del deploy

```bash
# Copia .dev.vars.example in .dev.vars e compilalo
cp .dev.vars.example .dev.vars
nano .dev.vars

# Lancia wrangler dev (porta 8787 di default)
npx wrangler dev

# In un altro terminale, testa:
curl -X POST http://localhost:8787/mcp \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
# In dev mode il provider accetta qualsiasi token
```

## Collegamento a Claude

1. Settings → Connectors → **Add custom connector**
2. URL: `https://<tuo-worker>.workers.dev/mcp`
3. OAuth Client ID / Secret: **vuoti** (li registra DCR automaticamente)
4. Salva, premi "Connect"
5. Pagina di consenso → incolla `MCP_AUTH_TOKEN`
6. "Autorizza" → connessione attiva

## Gotcha (vissuti in produzione, non rifare)

- **`/authorize` non è fornita dal provider lib** — la pagina HTML è
  inline nel `worker.mjs`. Senza, vedresti pagina vuota.
- **DCR endpoint `/oauth/register` è obbligatorio** — il provider lo monta
  in automatico se passi `clientRegistrationEndpoint`. Già fatto nel template.
- **Bearer-only NON basta più** dal late 2025: Claude richiede OAuth completo.
- **`completeAuthorization()` vuole un oggetto `OAuthRequest`**, non il
  `Request` HTTP. Il template lo ricostruisce serializzandolo in base64
  nel form HTML.
- **Project URL vs API URL Supabase**: usa il Project URL **nudo**
  (`https://abc.supabase.co`), MAI `https://abc.supabase.co/rest/v1/`.
  L'SDK ci appende ancora `/rest/v1/` → path doppio → 404 muto.
- **Nomenclatura key 2026**: dì "Secret" (`sb_secret_...`), non
  "service_role" (legacy). L'env var resta `SUPABASE_SERVICE_KEY` per
  retrocompat di naming.
- **Worker + KV separati per ogni progetto**: NON riusare l'`OAUTH_KV`
  di un altro progetto, anche se fosse lo stesso account Cloudflare.
  Blast radius limitato in caso di key rotation o bug.

## Quando i tool diventano molti

Quando hai >6-8 tool, splitta `tools.mjs` per dominio:

```
mcp-server/
├── tools.mjs                  # entry: importa e concatena
└── tools/
    ├── entity-a.mjs           # CRUD entity_a
    ├── entity-b.mjs           # CRUD entity_b
    └── workflows.mjs          # tool composti
```

`tools.mjs` diventa solo:
```js
import { entityATools } from "./tools/entity-a.mjs";
import { entityBTools } from "./tools/entity-b.mjs";
export function createTools(client) {
  const TOOLS = [...entityATools(client), ...entityBTools(client)];
  return { TOOLS, findTool: (name) => TOOLS.find(t => t.name === name) };
}
```
