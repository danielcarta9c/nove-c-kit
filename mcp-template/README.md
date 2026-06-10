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

## Scegliere il backend: Supabase REST vs R2 (object store)

Il template fornisce due varianti di factory client. **Scegline una sola** e
rinomina in `client.mjs`.

| Caratteristica | Supabase REST (default) | Cloudflare R2 |
|---|---|---|
| File factory | `client-factory.example.mjs` | `client-factory-r2.example.mjs` |
| Modello dati | Tabelle relazionali (Postgres) | Oggetti per chiave (no schema) |
| Auth | Sì (RLS server-side, service_role per MCP) | No (sicurezza solo a livello Worker) |
| Realtime | Sì (Supabase Realtime) | No |
| Query / filtri | SQL-like via PostgREST | `list(prefix)` + iterazione client |
| Full-text search | RLS-aware via SQL | Iterazione manuale (costoso, vedi cap nel file) |
| Config | Secrets `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | Binding `[[r2_buckets]]` nel `wrangler.toml` (nessun secret) |
| Quando sceglierlo | CRM, scadenzari, app con entità relazionali e RLS multi-tenant | Vault di file (Markdown, PDF), archivio documenti, cache statica condivisa |

**Esempi**: il pattern Supabase REST è quello nato dallo Scadenzario (CRM
Nove C, audit log, RLS multi-tenant). Il pattern R2 è nato esponendo un
**vault di file Markdown** (es. Obsidian) come tool MCP — quando ti serve
"leggi/scrivi file" più che "query relazionale".

> Quando usi R2: il `worker.mjs` del template è scritto per Supabase. Devi
> adattare il check degli env (R2 è un binding, non un secret → non servono
> `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`, basta `MCP_AUTH_TOKEN`) e
> sostituire l'import della factory.

## File del template

| File | Cosa fa | Da modificare? |
|------|---------|----------------|
| `worker.mjs` | Entry point Cloudflare Worker (OAuth + routing /mcp + /authorize) | Solo la palette/testi della pagina `/authorize` |
| `mcp-dispatcher.mjs` | JSON-RPC handler condiviso stdio + HTTP | Solo il `name` in `SERVER_INFO` |
| `index.mjs` | Runner stdio per dev locale (Claude Desktop) | Niente |
| `client-factory.example.mjs` | Pattern factory client per backend **Supabase REST** (default) — rinomina in `client.mjs` | **Sì**: implementa i tuoi metodi REST |
| `client-factory-r2.example.mjs` | Variante factory client per backend **Cloudflare R2** (object store: vault Markdown, archivio file) — rinomina in `client.mjs` | **Sì**: alternativa al Supabase factory, vedi "Scegliere il backend" |
| `tools.example.mjs` | Registry tool MCP (rinomina in `tools.mjs`) | **Sì**: aggiungi i tuoi tool |
| `wrangler.toml` | Config Cloudflare Workers | `name` + l'id KV (auto-popolato da setup-mcp.ps1) |
| `package.json` | Deps NPM | `name` + `description` |
| `setup-mcp.ps1` | Helper PowerShell (Windows) per setup KV + deploy | Niente |
| `.dev.vars.example` | Template env per `wrangler dev` | Copia in `.dev.vars` (gitignored) |
| `claude_desktop_config.example.json` | Config stdio da incollare in Claude Desktop (dev locale) | Path assoluto a `index.mjs` + env |
| `deploy.trigger` | File trigger del workflow di auto-deploy via Actions (cambia il contenuto e pusha per deployare) | Aggiorna il timestamp prima di pushare |

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

## Uso stdio locale (Claude Desktop, opzionale)

Per il prodotto usa l'HTTP (sopra). Lo stdio serve solo per debug rapido da
Claude Desktop, senza deploy. `index.mjs` è già il runner stdio (`npm run stdio`).
Per agganciarlo a Claude Desktop, copia il contenuto di
`claude_desktop_config.example.json` nel file di config di Claude Desktop:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Poi sistema il **path assoluto** a `index.mjs` e compila il blocco `env`.
Lo stdio NON usa `MCP_AUTH_TOKEN` (è solo per l'OAuth del Worker HTTP): bastano
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY` e, se serve, `PROJECT_WORKSPACE_ID`.
Riavvia Claude Desktop dopo aver salvato.

## Auto-deploy via GitHub Actions

> **Quando NON ti serve**: se il Worker è personale (un solo deploy alla
> volta dal tuo PC, `wrangler login` già fatto), il **deploy diretto** è più
> semplice: lancia `setup-mcp.ps1` (Windows) o `npx wrangler deploy` (mac/Linux)
> e basta. Il pattern git + Actions sotto serve per **progetti condivisi**,
> CI ripetibile, o per permettere all'agente AI di deployare senza tirare
> in ballo la tua macchina locale.

Per non re-deployare a mano ogni volta (e per permettere all'agente AI di
deployare in autonomia senza permessi di `workflow_dispatch`), il template
include il pattern **trigger-file + auto-commit log**. Razionale completo:
PLAYBOOK §35 Esempio B.

**Setup (una volta):**

1. Copia `nove-c-kit/snippets/mcp-deploy-workflow.yml` nel tuo repo come
   `.github/workflows/deploy-mcp.yml`.
2. Il file `mcp-template/deploy.trigger` è già qui: viene copiato nel tuo
   `mcp-server/` insieme al resto del template.
3. Setta i secret GitHub (Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_API_TOKEN` — token custom "Edit Cloudflare Workers" (vedi
     "Setup" sopra per i permessi). Niente Client IP filter.
   - `CLOUDFLARE_ACCOUNT_ID` — dashboard Cloudflare → Workers & Pages →
     colonna destra. Non è davvero segreto.
4. Verifica che `.gitignore` del repo non ingoi `mcp-server/out/`: aggiungi
   l'eccezione `!mcp-server/out/` dopo l'eventuale `*.log`. Vedi PLAYBOOK
   §35 "Trappole silenziose".
5. **NON** rimettere a ogni deploy i secret di RUNTIME del Worker
   (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `MCP_AUTH_TOKEN`): si settano
   UNA volta con `wrangler secret put` (passi 3-4 di "Setup") e sono
   persistenti — il deploy non li tocca.

**Deploy:**

```bash
# Cambia il contenuto di mcp-server/deploy.trigger (es. timestamp ISO)
echo "deploy-at: $(date -u +%Y-%m-%dT%H:%M:%SZ)" > mcp-server/deploy.trigger
git add mcp-server/deploy.trigger && git commit -m "deploy" && git push
```

Il workflow parte, scarica il log in `mcp-server/out/deploy-<ts>.log`, fa
`wrangler deploy` da `ref: main`, e committa il log nel repo. L'agente lo
legge via `git pull` — zero copia-incolla.

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
  Mischierebbe i grant OAuth degli utenti gia' collegati ai due Worker.
  Usa un nome di namespace project-specifico (es. `<nome-progetto>-oauth`);
  il binding interno resta `OAUTH_KV` perche' lo legge la lib.
- **`account_id` esplicito quando l'auto-detect fallisce**: se vedi
  `"Failed to retrieve account IDs"` (account multipli o token a scope
  ridotti), decommenta `account_id = "<your-account-id>"` nel
  `wrangler.toml`. Vedi anche PLAYBOOK §35 Esempio B.

### Gotcha specifici Windows / PowerShell

- **`node_modules` dentro OneDrive** (e progetti dentro cartelle
  sincronizzate): npm > v7 cancella le directory junction a ogni
  `install`, e OneDrive Files On-Demand tratta i file come reparse point
  che si rompono in modi sottili. Soluzione robusta:
  1. `npm install` normalmente nella cartella del progetto.
  2. **Sposta** `node_modules` fuori da OneDrive con `robocopy /MOVE`.
  3. Crea una **directory junction** da `<progetto>/node_modules` →
     `<percorso-fuori-onedrive>/node_modules`. **Il target DEVE terminare
     in `node_modules`**: Node usa il realpath e cerca cartelle chiamate
     `node_modules` risalendo l'albero. Se la junction punta a
     `<percorso>/deps`, Node fallisce con `Cannot find module 'esbuild'`.
  4. Verifica con `(Get-Item .\node_modules).Target` — non basta
     `ReparsePoint`, perche' anche i file On-Demand di OneDrive lo sono.
- **`wrangler secret put` su PowerShell aggiunge `\r\n` se piped**:
  `"token" | wrangler secret put NAME` salva un valore che NON combacia
  col token pulito (es. nel consenso OAuth). Usa il metodo file senza
  newline:
  ```powershell
  $f = New-TemporaryFile
  [IO.File]::WriteAllText($f, $tok, (New-Object System.Text.UTF8Encoding($false)))
  cmd /c "npx wrangler secret put NAME < `"$f`""
  Remove-Item $f
  ```

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
