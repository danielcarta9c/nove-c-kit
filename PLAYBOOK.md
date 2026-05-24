# Playbook — Studio Nove C

Documento **trasversale**, non specifico dello Scadenzario. Raccoglie le
ricette che vogliamo riusare nei prossimi progetti SaaS / consulenziali.

> "Come è fatto il sistema" → `docs/ARCHITECTURE.md`.
> "Come si fa X in generale" → questo file.

Lo Scadenzario è il primo prodotto Nove C costruito interamente con questa
metodologia. Quando partiremo con il prodotto numero 2, vogliamo che il
nuovo Claude della prima sessione apra questo file e parta con un metro
di vantaggio.

---

## Perimetro dei file di progetto (chi dice cosa)

Quando in un repo Nove C apri un file, queste sono le responsabilità.
**Non duplicare contenuto fra file**: ogni informazione ha una sola casa.

| File | Risponde a | Vita |
|------|------------|------|
| `README.md` | "Come setto e lancio il progetto?" | Quasi statico |
| `CLAUDE.md` | "Regole non negoziabili per ogni sessione di sviluppo" | Cresce di rado |
| `PROJECT_STATE.md` | "A che punto siamo *oggi*? Cosa è in doing, cosa next, cosa fatto?" | **Vivissimo**, cambia a ogni commit |
| `docs/ARCHITECTURE.md` | "Come è fatto **questo** prodotto?" | Cresce con i moduli |
| `docs/USER_GUIDE.md` | "Come si usa l'app lato utente finale?" | Cresce con le feature |
| `docs/ROADMAP.md` | "Cosa viene dopo, in che ordine, perché?" | Cambia ogni sprint |
| `docs/RUNBOOK_*.md` | "Cosa fare quando si rompe X?" | Cresce con gli incidenti |
| `docs/adr/000N-*.md` | "Una decisione architetturale presa **una volta**: contesto, motivazione, conseguenze" | Immutabile dopo l'approvazione |
| `docs/PLAYBOOK.md` (questo) | "Come si lavora in Nove C? Pattern e snippet **riusabili** in altri progetti" | Cresce di rado |
| `docs/AGENT_BOOTSTRAP.md` | "Lettera al Claude che apre il primo giorno di un nuovo progetto Nove C" | Quasi statico |
| `PRD_*.md` (in SharePoint) | "Cosa fa il prodotto e perché — visione + user story" | Cambia di rado dopo MVP |

> **Regola**: prima di aggiungere una sezione nuova, chiediti in quale file
> dovrebbe vivere. Se è "come lavoriamo in generale" → questo file. Se è
> "come è fatto il prodotto X" → `ARCHITECTURE.md` di X. Se è "lo stato di
> oggi" → `PROJECT_STATE.md`. Se è "una decisione" → un nuovo ADR.

---

## Indice

**Parte A — Scoperte 2026** (cose che 12 mesi fa si facevano diversamente):

1. [MCP custom connector per Claude (web/mobile/desktop)](#1-mcp-custom-connector-per-claude-webmobiledesktop)
2. [Supabase API keys: nuova nomenclatura publishable/secret](#2-supabase-api-keys-nuova-nomenclatura)
3. [Project URL vs API URL su Supabase (gotcha del path doppio)](#3-project-url-vs-api-url-il-gotcha-del-path-doppio)
4. [Cloudflare Workers + KV come "backend per piccoli servizi"](#4-cloudflare-workers--kv-come-backend-per-piccoli-servizi)

**Parte B — Pattern consolidati Nove C** (lezioni dal CRM Nove C v6, riusate qui):

5. [Real-time sync senza scollegare i form: `Object.assign` vs reassign](#5-real-time-sync-senza-scollegare-i-form)
6. [`markDirty` + `saveNow` debounced 350ms](#6-markdirty--savenow-debounced-350ms)
7. [Soft delete + audit log su tutte le tabelle business](#7-soft-delete--audit-log-su-tutte-le-tabelle-business)
8. [Motore di generazione idempotente](#8-motore-di-generazione-idempotente)
9. [Schema multi-tenant da subito, single-tenant nell'uso](#9-schema-multi-tenant-da-subito-single-tenant-nelluso)
10. [Drag&drop touch che non rompe lo scroll](#10-dragdrop-touch-che-non-rompe-lo-scroll)
11. [Anti-pattern noti — non rifare](#11-anti-pattern-noti)
11b. [Design language brand-aware (palette + font dal sito del cliente)](#11b-design-language-brand-aware)

**Parte C — Stack di default Nove C** (la "ricetta base" per un nuovo progetto):

12. [Stack di default e perché](#12-stack-di-default-nove-c)

**Parte D — Metodologia PM Nove C** (come si lavora, non come è fatto il codice):

13. [Filosofia di lavoro](#13-filosofia-di-lavoro)
14. [Setup di un nuovo progetto (giorno 1-3)](#14-setup-di-un-nuovo-progetto-giorno-1-3)
15. [Workflow di sessione Claude](#15-workflow-di-sessione-claude)
16. [Sprint + PROJECT_STATE come single source of truth](#16-sprint--project_state-come-single-source-of-truth)
17. [Definition of Done](#17-definition-of-done)
18. [Quando creare un ADR](#18-quando-creare-un-adr)
19. [Bug-hunt come pratica](#19-bug-hunt-come-pratica)
20. [Dogfooding come fase obbligatoria](#20-dogfooding-come-fase-obbligatoria)
21. [Strategia di test](#21-strategia-di-test)
22. [Convenzioni di commit, branch, PR](#22-convenzioni-di-commit-branch-pr)
23. [Stile di comunicazione PM↔Claude](#23-stile-di-comunicazione-pmclaude)
24. ["Notte autonoma": Claude lavora da solo](#24-notte-autonoma-claude-lavora-da-solo)
32. [Audit del contesto prima di chiedere + stato operativo cloud](#32-audit-del-contesto-prima-di-chiedere--stato-operativo-cloud)
33. [Design discovery prima di codice (mockup HTML statici)](#33-design-discovery-prima-di-codice)
34. [Parsimonia su build credits CI/CD (batch grandi, push singoli)](#34-parsimonia-su-build-credits)

**Parte E — Snippet riusabili** (copia-incolla, già testati in produzione):

25. [`markDirty` + `saveNow` + `isPlaceholder`](#25-markdirty--savenow--isplaceholder)
26. [`handleRemoteChange` con self-echo skip](#26-handleremotechange-con-self-echo-skip)
27. [Audit log batched (client + SQL)](#27-audit-log-batched-client--sql)
28. [Soft delete + RLS workspace-scoped (SQL)](#28-soft-delete--rls-workspace-scoped-sql)
29. [`attachKanDrag` — drag touch iOS](#29-attachkandrag--drag-touch-ios)
30. [`OAuthProvider` Worker MCP skeleton](#30-oauthprovider-worker-mcp-skeleton)
31. [`bootHarness` — server statico + Playwright + cloud bloccato](#31-bootharness--server-statico--playwright--cloud-bloccato)

---

# Parte A — Scoperte 2026

## 1. MCP custom connector per Claude (web/mobile/desktop)

**Cosa è cambiato vs 2025.** Fino a metà 2025 un MCP server custom era *stdio
locale*: giravi un eseguibile sulla macchina dell'utente e Claude Desktop lo
istanziava al volo. Questo limitava il tool ai soli utenti con Claude
**Desktop installato + competenze tecniche per editare un JSON di config**.

Da fine 2025 Claude (web, mobile, Desktop) supporta i **custom connector
remoti**: l'utente incolla un URL HTTPS e si autentica via OAuth. Niente
binary da installare, niente JSON da editare, funziona anche da iPhone.

### Architettura tipica (oggi)

```
┌─────────────────┐         ┌──────────────────────────┐
│ Claude.ai       │ HTTPS   │  Cloudflare Worker       │
│ (web/mobile/    │ ←─────→ │  ┌──────────────────┐    │         ┌────────────┐
│  desktop)       │         │  │ OAuthProvider    │    │         │  Supabase  │
└─────────────────┘         │  │ (+ KV storage)   │    │  HTTPS  │  (o altro) │
                            │  └──────────────────┘    │ ←─────→ └────────────┘
                            │  ┌──────────────────┐    │
                            │  │ MCP dispatcher   │    │
                            │  │ (JSON-RPC)       │    │
                            │  └──────────────────┘    │
                            └──────────────────────────┘
```

### Cosa serve

| Pezzo | Perché | Costo |
|-------|--------|-------|
| Cloudflare Workers | Hosting HTTPS sempre acceso, cold start <50ms | Free fino a 100k req/giorno |
| Cloudflare KV | Storage token OAuth + client registrati | Free fino a 100k read/giorno |
| `@cloudflare/workers-oauth-provider` | Implementazione OAuth 2.1 + DCR pronta | Open source |
| Wrangler CLI | Deploy + secrets + KV | Free |
| Pagina `/authorize` brandizzata | Form di consenso che l'utente vede | Scrivila tu in HTML |

### Step-by-step generico (replicabile per qualsiasi progetto)

```bash
# 1. Crea folder + dipendenze
mkdir mio-mcp && cd mio-mcp
npm init -y
npm install @cloudflare/workers-oauth-provider

# 2. Login a Cloudflare (una volta per macchina, OAuth nel browser)
npx wrangler login

# 3. Crea il KV per i token (output: ti dà l'id da incollare)
npx wrangler kv namespace create OAUTH_KV

# 4. Setta i secrets (chiavi del tuo backend, mai in git)
npx wrangler secret put MIO_API_KEY
npx wrangler secret put MCP_AUTH_TOKEN  # "consent password" che l'utente incolla al primo login

# 5. Deploy
npx wrangler deploy
# → output: https://mio-mcp.<subdomain>.workers.dev
```

In Claude: Settings → Connectors → Add custom connector → URL = `https://.../mcp`.
OAuth Client ID/Secret vuoti (li registra il provider via DCR). Salva, premi
"Connect", incolla `MCP_AUTH_TOKEN` nel form di consenso, fatto.

### Anatomia del file `worker.mjs` (template)

```js
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { dispatchMCP } from './mcp-dispatcher.mjs';

export default new OAuthProvider({
  apiRoute: '/mcp',                      // dove Claude POSTa le JSON-RPC
  apiHandler: { fetch: handleMCP },
  defaultHandler: { fetch: handleConsent }, // pagina /authorize la fai tu
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
});

async function handleMCP(req, env, ctx) {
  // qui dentro req è già autenticata: ctx.props ha il grant
  const body = await req.json();
  const result = await dispatchMCP(body, makeClient(env));
  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json' },
  });
}

async function handleConsent(req, env) {
  // serve la tua pagina HTML brandizzata con form
  // → POST al /authorize con il token + redirect_uri + scope
  // → completeAuthorization() del provider
}
```

### Gotcha (cose che ci hanno fatto perdere tempo)

- **La pagina `/authorize` non è fornita dal provider**: devi scriverla tu in
  HTML inline nel Worker, brandizzata. Default = pagina vuota → utente confuso.
- **`completeAuthorization()` vuole `request` come istanza `OAuthRequest`**,
  non il `Request` HTTP nativo. Devi parsare i query param e passare oggetto.
- **DCR (Dynamic Client Registration)**: la spec moderna richiede che il
  server accetti POST a `/register` con `redirect_uris` dal client. Senza,
  Claude moderna non si registra. Il provider lib lo fa automaticamente se
  esponi l'endpoint nel manifesto.
- **Bearer token-only NON basta più**: Claude moderna (>= ottobre 2025)
  rifiuta MCP server che fanno solo `Authorization: Bearer <token>` senza
  OAuth flow. Se stai vedendo `WWW-Authenticate: Bearer` rifiutato, è questo.
- **Test con `curl` prima del deploy live**: `wrangler dev` espone tutto su
  `localhost:8787`. `curl -X POST .../mcp -H "Authorization: Bearer test"`
  funziona perché il provider in dev mode accetta token finti.

### Quando usare stdio vs HTTP

| | stdio | HTTP (Worker) |
|---|-------|---------------|
| Setup | npm + edit JSON | npm + 1 comando |
| Funziona su iPhone/web | ❌ | ✅ |
| Per utente finale non-tecnico | ❌ | ✅ |
| Debug rapido lato dev | ✅ (no deploy) | ❌ (deploy 5s) |
| Costi | 0 | 0 (free tier) |

**Regola Nove C**: HTTP per il prodotto, stdio per dev locale.

### Riferimenti file (nello Scadenzario)

- Implementazione: `mcp-server/worker.mjs`
- Dispatcher condiviso stdio+HTTP: `mcp-server/mcp-dispatcher.mjs`
- Setup helper PowerShell: `mcp-server/setup-mcp.ps1`
- Doc operativa step-by-step: `mcp-server/README.md`

### Scheletro riusabile (nuovo progetto)

Per un nuovo progetto NON ripartire dal codice Scadenzario (è pieno di tool
dominio). Clona invece il template sterilizzato dal kit pubblico:
[`nove-c-kit/mcp-template/`](https://github.com/danielcarta9c/nove-c-kit/tree/v1/mcp-template).
Contiene `worker.mjs` + `mcp-dispatcher.mjs` + factory client/tools `.example`
+ `wrangler.toml` + `setup-mcp.ps1`, tutto parametrizzato con `<nome-progetto>`
e con README operativo + lista gotcha.

---

## 2. Supabase API keys: nuova nomenclatura

Da **inizio 2026** Supabase ha introdotto un nuovo sistema di API key che
**coesiste** col vecchio per retrocompat. Nel dashboard sotto Settings →
API Keys vedi due tab:

| Tab UI | Chiavi visibili | Cosa fa | Dove va |
|--------|-----------------|---------|---------|
| **Publishable and secret API keys** (nuovo) | `sb_publishable_...`, `sb_secret_...` | RLS-safe / RLS-bypass | Client / Server |
| **Legacy anon, service_role API keys** | `anon` JWT (`eyJ...`), `service_role` JWT (`eyJ...`) | Stesso scope dei nuovi | Compat |

### Mapping equivalente (scope-wise, NON byte-wise)

- **`Publishable` ≡ vecchia `anon`** — RLS-safe, browser-visible, va in git nel client.
- **`Secret` ≡ vecchia `service_role`** — RLS-bypass, server-only, MAI in git.

### Vocabolario quando parli col PM

**Non dire "service_role"**, dì "**Secret**". Le UI mostrano "Secret" e il PM
si confonde se senti termini misti. Nelle env var **lascia il naming legacy**
(`SUPABASE_SERVICE_KEY`) per retrocompat dei progetti: tanto la variabile
accetta sia legacy JWT (`eyJ...`) sia nuova (`sb_secret_...`).

### Dove la trovi

- **Publishable**: Settings → API Keys → tab nuovo → "Publishable keys".
  Una sola, sempre visibile, copiala quando vuoi.
- **Secret**: Settings → API Keys → tab nuovo → "Secret keys" → "+ New secret key".
  **La vedi UNA SOLA VOLTA** al momento della creazione. Copiala subito in un
  password manager. Se la perdi, ne crei un'altra e revochi la vecchia.

---

## 3. Project URL vs API URL — il gotcha del path doppio

Nel dashboard Supabase, **Settings → Data API**, vedi due URL:

| Campo | Valore esempio | A cosa serve |
|-------|----------------|--------------|
| **Project URL** | `https://abc123.supabase.co` | Lo passi al client SDK |
| **API URL** | `https://abc123.supabase.co/rest/v1/` | Endpoint REST grezzo, raramente serve |

**Trappola**: se per errore copi l'API URL nel env var `SUPABASE_URL`, il
client SDK ci appende ANCORA `/rest/v1/` → ottieni `.../rest/v1//rest/v1/clienti`
→ 404 senza messaggio di errore chiaro. Il bug sembra "il client non
funziona" ma è solo un path doppio.

**Regola**: usa sempre il **Project URL** (quello base, senza `/rest/v1/`).

---

## 4. Cloudflare Workers + KV come "backend per piccoli servizi"

Quando il prodotto principale è frontend + Supabase ma serve **uno strato
servlet leggero** (es. webhook handler, OAuth proxy, MCP server, cron job),
la combinazione default Nove C è:

- **Cloudflare Workers** per il codice. JS/TS, fetch handler, deploy in
  secondi, scala a zero, free tier generoso (100k req/giorno).
- **Cloudflare KV** per stato persistente piccolo (max ~25 MB per chiave,
  eventually consistent ~60s). Token OAuth, session store, feature flags,
  config dinamica.
- **Secrets via `wrangler secret put`** invece di env var: criptati at rest,
  non in git, modificabili senza redeploy.

**Quando NON usarli**:
- Serve un DB relazionale → vai su Supabase / Neon.
- Serve esecuzione lunga (>30s) → vai su Render / Fly.
- Serve consistenza forte cross-region → Durable Objects (più complesso) o
  un DB tradizionale.

**Costi reali per un singolo studio**: zero. 100k req/giorno = 1.2 req/sec
sostenute, gli studi ne fanno <50 al giorno.

### Comando-chiave da ricordare

```bash
# Login (una volta per macchina, OAuth browser)
npx wrangler login

# Crea KV
npx wrangler kv namespace create NOME_KV
# → output: id da incollare in wrangler.toml

# Set secret (interattivo, no echo)
npx wrangler secret put NOME_VAR

# Deploy
npx wrangler deploy

# Dev locale (legge da .dev.vars)
npx wrangler dev

# Tail logs in tempo reale
npx wrangler tail
```

---

# Parte B — Pattern consolidati Nove C

## 5. Real-time sync senza scollegare i form

**Il bug v6.0.2 del CRM**: quando un altro device pushava una modifica al
record che l'utente stava editando in un form, il form perdeva ogni
riferimento e il `<input>` smetteva di rispecchiare i cambi locali.

**Causa**: nel listener realtime stavamo facendo
```js
state.data[i] = newRow;   // ❌ sostituisce il riferimento
```
Tutti i form binding (`oninput`, two-way refs) puntavano al vecchio
oggetto, ora orfano.

**Pattern corretto**:
```js
function handleRemoteChange(row) {
  // Skip self-echo: l'utente sta editando proprio questo record,
  // non sovrascrivere mentre digita
  if (state.selectedId === row.id) return;

  const existing = state.data.find(d => d.id === row.id);
  if (existing) {
    Object.assign(existing, row);   // ✅ muta in-place, ref preservato
  } else {
    state.data.push(row);            // nuovo record, ref non c'era prima
  }
  renderAll();
}
```

**Regole derivate**:
- Mai `state.x = newObj` se qualcuno ha già un ref a `state.x`. Sempre
  `Object.assign(state.x, newObj)`.
- Self-echo skip: se l'utente sta editando proprio quel record, ignora.
  Il tuo prossimo `saveNow()` riallineerà comunque.
- Filtro placeholder prima di pushare al cloud: mai upsertare record con
  id `temp_*` o vuoto. `isPlaceholder(record)` come prima cosa nel push.

---

## 6. `markDirty` + `saveNow` debounced 350ms

**Mai** chiamare `cloudUpsertX(record)` inline dentro un handler. Se l'utente
digita 8 caratteri in 2 secondi, hai 8 round-trip al server, ognuno che
trigger un realtime ai client connessi, che retriggerano save sui form
aperti dei collaboratori. Cascade.

**Pattern corretto**:
```js
let dirtyQueue = new Set();
let saveTimer = null;

function markDirty({id, table}) {
  dirtyQueue.add(`${table}:${id}`);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 350);
}

async function saveNow() {
  const batch = [...dirtyQueue];
  dirtyQueue.clear();
  saveTimer = null;
  for (const key of batch) {
    const [table, id] = key.split(':');
    const record = findRecord(table, id);
    if (isPlaceholder(record)) continue;   // skip placeholder
    await cloudUpsert(table, record);
  }
}
```

**Regola**: ogni handler che modifica state chiama solo `markDirty()`.
`saveNow()` viene chiamato dal debounce o esplicitamente a chiusura modal /
beforeunload.

---

## 7. Soft delete + audit log su tutte le tabelle business

**Soft delete** (`deleted_at` timestamp nullable):

```sql
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- RLS filtra automaticamente
CREATE POLICY clienti_select ON clienti
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND workspace_id = current_workspace_id());

-- DELETE diventa UPDATE
-- client: supabase.from('clienti').update({deleted_at: new Date()}).eq('id', id)
-- recovery: supabase.from('clienti').update({deleted_at: null}).eq('id', id)
```

**Audit log** (fire-and-forget, batched):

```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  actor_id uuid REFERENCES auth.users(id),   -- null se sistema/MCP
  action text NOT NULL,                       -- 'create', 'update', 'delete', 'login', ...
  entity_type text,                           -- 'utente', 'ordine', 'documento', ...
  entity_id uuid,
  payload jsonb,                              -- diff o snapshot
  created_at timestamptz DEFAULT now()
);
```

**Pattern client**:
```js
const auditQueue = [];
let auditTimer = null;

function logAudit(entry) {
  auditQueue.push({...entry, workspace_id: state.currentWorkspaceId});
  if (auditTimer) return;
  auditTimer = setTimeout(flushAudit, 2000);
}

async function flushAudit() {
  const batch = auditQueue.splice(0);
  auditTimer = null;
  if (!batch.length) return;
  await supabase.from('audit_log').insert(batch);  // fire-and-forget
}
```

**Regola**: ogni CUD operativo chiama `logAudit({action, entity_type, entity_id})`.
Mai await — il log non deve mai bloccare l'UI.

**Punti d'aggancio minimi**: login, CUD su ogni entità business,
operazioni batch (import, generazione, reset periodici), modifiche di
configurazione critica (template, regole, permessi, membership).

---

## 8. Motore di generazione idempotente

Per prodotti che generano "istanze" annuali/ricorrenti da "template"
(scadenze fiscali, abbonamenti, fatture ricorrenti), la regola è
**idempotenza assoluta**.

### Unicità

Match su tupla deterministica, es. `(cliente_id, template_id, anno)` o
`(utente_id, prodotto_id, mese)`. Constraint UNIQUE nel DB **e** check
prima dell'INSERT lato app.

### Mai sovrascrivere stati avanzati

```js
function generaIstanze(anno, scopeIds) {
  const proposte = [];
  for (const template of attiviTemplates()) {
    for (const cliente of scopeIds) {
      if (!cliente.attivo) continue;                           // RB-07
      if (!applicabile(template.applicabile_a, cliente)) continue;

      const esistente = findByKey(cliente.id, template.id, anno);
      if (esistente?.stato === 'done') continue;               // RB-01
      if (esistente?.stato === 'importato') continue;          // RB-02

      proposte.push({cliente, template, anno, esistente});
    }
  }
  return proposte;  // mostra anteprima all'utente PRIMA di applicare
}
```

### Anteprima obbligatoria

**Mai** applicare in batch senza show + confirm. Il motore restituisce
una lista di "proposte", la UI mostra "creerò X nuovi, aggiornerò Y
esistenti, salterò Z perché completati". Utente conferma → applica.

---

## 9. Schema multi-tenant da subito, single-tenant nell'uso

Vedi `docs/adr/0003-multi-tenant-schema.md` per i dettagli. La sintesi:

- **Ogni tabella business ha `workspace_id UUID NOT NULL`**, default a un
  UUID stabile (es. `00000000-0000-0000-0000-000000000001`).
- **RLS workspace-scoped**: `USING (workspace_id = current_workspace_id() AND deleted_at IS NULL)`.
- **Funzione DB** `current_workspace_id()` legge da `workspace_members` di
  `auth.uid()`.
- **L'app oggi** hardcoda un singolo workspace; quando vorrai N studi
  basterà aggiungere un selector e popolare `state.currentWorkspaceId`.

**Costo retrofit a 18 mesi** con 200k record: 1-2 settimane + rischio data
leak. **Costo upfront ora**: 1 ora di SQL. È un no-brainer.

---

## 10. Drag&drop touch che non rompe lo scroll

**Il bug dei Kanban iOS**: prima del fix, drag&drop tra colonne funzionava
con mouse ma su iPhone Safari il dito non riusciva mai a "prendere" la
card — o, se la prendeva, lo scroll si bloccava a metà.

**Cause**:
1. `touchmove` di default è passivo: non puoi chiamare `preventDefault()`.
2. `touch-action: none` su tutto il body blocca lo scroll di pagina.
3. Listener registrato senza `{passive: false}`.

**Pattern corretto** (vedi `attachKanDrag` in `STARTERCODE.html`):

```js
element.addEventListener('touchstart', onTouchStart, {passive: false});
element.addEventListener('touchmove', onTouchMove, {passive: false});
// CSS:
// .card { touch-action: auto; }                  ← default: scroll OK
// .card.is-dragging { touch-action: none; }      ← solo durante drag
```

E nel handler:
```js
function onTouchMove(e) {
  if (!isDragging) return;            // non sto dragging → lascia scroll
  e.preventDefault();                  // sto dragging → blocca scroll
  updateGhostPosition(e.touches[0]);
}
```

**Regola**: `touch-action: auto` di default ovunque. `none` **solo** sull'elemento
in stato `.is-dragging`, attivato all'inizio del drag e tolto a fine.

---

## 11. Anti-pattern noti

Non rifare questi, ognuno ci è costato almeno mezza giornata:

| Anti-pattern | Conseguenza | Pattern giusto |
|--------------|-------------|----------------|
| Cloud upsert su record con id placeholder (`temp_*`, vuoto, null) | Record fantasma nel DB | `if (isPlaceholder(r)) return;` prima di ogni upsert |
| Realtime listener: `state.data[i] = row` | Form scollegato | `Object.assign(existing, row)` (vedi §5) |
| Trigger riusato tra tabelle | Trigger su `contatti` riusa funzione di `trattativa` → cancella i campi sbagliati | Ogni tabella ha il suo trigger |
| `touchmove` senza `{passive: false}` + `preventDefault()` | Scroll si blocca a metà gesto su iPhone | Vedi §10 |
| Tap target < 44×44 px + `confirm()` iOS | Modal bloccato, utente non può confermare | Tap ≥ 44×44, mai `confirm()` native con modal aperto |
| Feature rimossa: pulisci solo la logica, lasci il markup | Banner residui nell'UI | Cancella anche HTML + CSS + handler |
| `DROP COLUMN` in migrazione SQL | Perdi dati di produzione | Solo `ADD COLUMN IF NOT EXISTS` con default sicuro |
| Service key (Secret) lato client | RLS bypassata, sicurezza azzerata | Solo lato server (Worker, Edge Function) |
| MCP server stdio per utenti finali | Solo Desktop, no mobile, install JSON | HTTP su Worker + OAuth (vedi §1) |
| `confirm()`/`prompt()`/`alert()` nativi su iOS con modal aperto | UI bloccata, modal non chiudibile | `<dialog showModal>` + inline UI |
| `state.x = await fetch()` dentro un onInput | Cascade di network call | `markDirty()` + debounce 350ms (vedi §6) |
| Polish CSS sopra layout 2018 e chiamarlo "wow" | Il PM vede ancora "gestionale italiano". Dark mode + ⌘K + skeleton non bastano se la *struttura* delle schede è "muro di form" | Ridisegno *strutturale* (section card, hero, toggle iOS, select-row): vedi §11b + §33 |
| Generic palette teal/blu/red Tailwind quando il cliente ha già un sito brandizzato | App "uno tra tanti", il cliente non riconosce il proprio brand nella sua app | Estrarre la palette UFFICIALE dal sito del cliente (kit Elementor/WordPress, computed style, screenshot OCR): vedi §11b |

---

## 11b. Design language brand-aware

**Il vincolo che cambia tutto**: se il cliente ha un sito web, ha *già* un'identità
visiva. Inventare una palette generica (Tailwind teal, Material blue) sopra
la sua è un autogol — il cliente non riconoscerà il suo brand nella sua
app, e il prodotto sembrerà "uno tra tanti".

**Lezione dal primo prodotto**: per i primi 4 sprint di Wave 2 (Sprint UX-A, B, C, D
Wave 1) abbiamo lavorato con una palette `--brand-navy: #1a365d + --brand-teal: #2eb08e`
inventata sul momento. Il PM ha bocciato con "prodotto cheap". Quando abbiamo
estratto la palette VERA dal sito reale del cliente (teal `#148D9A` + navy
`#374A64` + arancione `#FFBC7D` + serif Libre Baskerville) la percezione è
cambiata istantaneamente: "ci siamo, è la nostra app".

### Quando vale la pena
- Il cliente è uno studio professionale (avvocato, commercialista, architetto)
  con sito web esistente — palette + font sono *prove di brand* da preservare.
- Il prodotto vivrà visibile al cliente del cliente (es. commercialista mostra
  la sua dashboard al cliente finale) — coerenza brand = trust.
- Stai vendendo "implementazione personalizzata" non "SaaS off-the-shelf" —
  la personalizzazione cromatica è parte del valore percepito.

**Quando NON serve**: prototipo interno, MVP in cui il cliente non è ancora
identificato, demo prodotto generico.

### Come estrarre palette + font (3 strade)

**Strada 1 — Elementor / WordPress (la maggioranza dei siti italiani 2026)**

I siti Elementor pubblicano un CSS "kit globale" con le variabili
`--e-global-color-primary/secondary/text/accent` e
`--e-global-typography-*-font-family` esplicite. Trovarlo:

```bash
# Trova il kit ID
curl -s "https://www.cliente.it" | grep -oE "elementor-kit-[0-9]+" | head -1
# → elementor-kit-830

# Scarica il CSS del kit
curl -s "https://www.cliente.it/wp-content/uploads/elementor/css/post-830.css"
# → contiene --e-global-color-primary: #148D9A, etc.
```

Bingo: in 30 secondi hai 4 colori brand + 3 famiglie font ufficiali, gratis,
zero ambiguità.

**Strada 2 — Computed style via DevTools (fallback)**

Apri il sito su Chrome → Inspect → seleziona logo + bottoni primari + body
text → leggi `Computed` panel → annota i `color`/`background-color` esatti.

**Strada 3 — Screenshot + analisi manuale (ultima risorsa)**

Se il sito non espone CSS leggibili (es. è un PNG centrato in un div),
screenshot del logo + bottoni + sezione hero → tool tipo ColorZilla o
[coolors.co](https://coolors.co) per estrarre HEX dei pixel chiave.

### Cosa estrarre (la lista minima)

| Slot | Cosa cercare nel sito | Esempio |
|------|----------------------|---------------|
| **Primary brand** | Colore dei link nei testi + bottoni CTA principali | `#148D9A` teal |
| **Secondary brand** | Colore dei titoli h1/h2 + sfondi sezioni "navigation" | `#374A64` navy |
| **Highlight/CTA** | Colore "in evidenza" o "page transition" — quello caldo che bilancia i freddi | `#FFBC7D` arancione |
| **Body bg** | Bianco off-white o cool-white del sito? Mai `#ffffff` puro | `#FAFAF7` warm |
| **Font headings** | `font-family` degli h1/h2 — quasi sempre un serif italiano | Libre Baskerville |
| **Font body** | `font-family` dei paragrafi — sans humanist (Raleway/Open Sans/Source Sans) | Raleway |

Adatta semantic: `--danger` (rosso terracotta italiana, non vermillon Tailwind),
`--warning` (ocra/zafferano, non amber), `--accent-soft` (versione 8% del primary
brand). Verifica WCAG contrast su `--ink` su `--paper` → almeno 7:1 (AAA body).

### Quando NON è 1:1

Il sito del cliente è ottimizzato per "marketing": è denso, colorato, ha
gradient ricchi. La SUA app interna **non** può essere così — deve essere
calma, sobria, ergonomica. Quindi la palette del sito è la *base*, non il
*risultato finale*. Adatta:

- Usa il primary brand per **azioni primarie** (CTA, toggle on, link, badge)
  non per sfondi grandi.
- Usa il secondary brand come **testo principale** + bottoni primari "Salva".
- L'highlight caldo per **pochi accenti** (warning soft, urgenze) — mai
  decoratico.
- Sfondi sempre warm off-white o navy dark (dark mode), MAI puro nero/bianco.

### Output per il PM (cosa pushare)

Prima di toccare `index.html`: deliverable in `docs/design-discovery/`:
1. `DESIGN_LANGUAGE_v1.md` — palette + font + 7 pattern + roadmap implementazione
2. 2-3 mockup HTML statici (esempio: scheda dettaglio, form anagrafica, editor
   complesso) — autonomi, niente dipendenze JS, si aprono in browser desktop
   *o* via URL del branch deploy su iPhone Safari per il feel touch reale
3. README.md della cartella con istruzioni e domande aperte

Il PM giudica i mockup *prima* di approvare l'implementazione. Cambiare
una palette su 3 HTML statici è 10 minuti; cambiarla su 25 KB di CSS già
applicato è 2 giorni di refactor. Vedi §33 per la metodologia.

### Riferimenti file (Scadenzario)

- `docs/design-discovery/DESIGN_LANGUAGE_v1.md` — documento di v1
- `docs/design-discovery/mockup-{01,02,03}-*.html` — i 3 mockup approvati
- `index.html:62` — tokens `:root` con `--brand-teal/-navy/-orange` aliasati
  verso `--accent/-text/-bg/-warning` per swap istantaneo in tutta l'app
- `index.html:1812` — pattern brand v2 (section-card, toggle iOS, select-row,
  hero-avatar, stat-card) come componenti CSS riusabili
- `index.html` head — Google Fonts Libre Baskerville + Raleway

---

# Parte C — Stack di default Nove C

## 12. Stack di default Nove C

Quando partiamo un nuovo progetto SaaS Nove C, parti da qui salvo controindicazioni:

### Frontend
- **Vanilla JS + HTML + CSS, single file `index.html`**. Niente bundler,
  niente framework, niente build step. (Vedi `docs/adr/0001-vanilla-js.md`)
- Hosting statico (Netlify gratis), funziona anche da `file://`.
- Mobile-first, tap target ≥ 44×44 px. Palette + tipografia: estratte
  dal brand del cliente (vedi §11b), MAI inventate generiche. Per MVP
  interni senza cliente identificato, palette sobria temporanea che si
  cambierà al primo lancio brand-aware.

### Backend dati
- **Supabase**: Postgres + Auth + Realtime + Storage + RLS. (Vedi `docs/adr/0002-supabase-backend.md`)
- Schema **multi-tenant da subito** (§9), **soft delete** ovunque, **audit log**.
- Realtime publication sulle tabelle "live" (es. quelle che vedi nei dashboard).
- Storage bucket privato per allegati, path convenzionale.

### Backend logica leggera (se serve)
- **Cloudflare Workers + KV** (§4). MCP server, webhook handler, OAuth proxy.

### Auth
- **Supabase Auth** (magic link + password). MFA da abilitare presto.

### MCP custom (se l'AI è parte del prodotto)
- **Worker HTTP + OAuth 2.1 + DCR** (§1). Connettore unico per web/mobile/desktop.

### Test
- **Playwright headless**, eseguito contro `index.html` servito da server
  statico interno. Niente test contro Supabase production: cloud mockato
  via factory funzione (es. `bootCloud()`).

### Versioning
- Branch convention `claude/<feature-slug>` → PR squash → `main`.
- Netlify auto-deploy da `main`.
- Commit message: tipo(scope): descrizione + perché in body.

### Documentazione minima richiesta in repo

| File | Cosa |
|------|------|
| `README.md` | Setup + intro 1 pagina |
| `CLAUDE.md` | Regole non negoziabili per sessioni Claude Code |
| `PROJECT_STATE.md` | Sprint, doing, done — vivo |
| `docs/ARCHITECTURE.md` | Come è fatto il sistema, 1-2 pagine |
| `docs/USER_GUIDE.md` | Come si usa, lato utente finale |
| `docs/RUNBOOK_BACKUP.md` | Cosa fare in caso di DR |
| `docs/ROADMAP.md` | Cosa viene dopo |
| `docs/adr/000N-*.md` | Decisioni architetturali, una per file |
| `docs/PLAYBOOK.md` | (questo) Cose trasversali Nove C |

### Strumenti del PM
- **Desktop Windows + PowerShell**. Mai assumere Mac/bash/`~`/`brew`.
- **Claude Desktop config path Windows**: `%APPDATA%\Claude\claude_desktop_config.json`.
- Mobile iPhone (per dogfooding + uso quotidiano via Claude mobile).

---

# Parte D — Metodologia PM Nove C

> Questa parte risponde alla domanda: "come si lavora in Nove C?".
> Niente codice. Solo come si imposta un progetto, come si tiene traccia
> delle cose, come si fanno test e dogfooding, come si comunica.

## 13. Filosofia di lavoro

Quattro principi, in ordine di importanza:

1. **Lean radicale.** Niente Jira, niente Notion, niente Asana, niente
   Confluence. Tutto in **file di testo nel repo**, versionati con git.
   Lo stato vivo sta in `PROJECT_STATE.md`, le decisioni in ADR, la
   metodologia in `PLAYBOOK.md`. Tre file aperti in editor coprono il
   90% delle domande.

2. **Single file finché possibile.** Sia il codice (vanilla `index.html`)
   sia la documentazione tendono al monolite leggibile. Splittiamo solo
   quando il dolore è insostenibile, non per estetica.

3. **Il "perché" prima del "come".** Ogni commit, ADR, sezione di doc
   inizia spiegando il problema o il vincolo. Il "come" è la conseguenza.
   Questo è il motivo per cui i ADR sono il documento più importante a
   lungo termine: tra 18 mesi non ti ricorderai *perché* avevi deciso
   in un certo modo.

4. **Anti-overengineering.** Non si aggiunge un livello d'astrazione,
   un framework, una libreria, un microservizio per "potenziali esigenze
   future". Si aggiunge quando il dolore presente è chiaro e quantificato.
   Tre righe duplicate sono meglio di un'astrazione prematura.

## 14. Setup di un nuovo progetto (giorno 1-3)

Quando inizi il prodotto Nove C numero N, **NON aprire `index.html` per
primo**. Apri i documenti in quest'ordine:

### Giorno 1 — Inquadramento

1. Crea il repo (privato su GitHub, `danielcarta9c/<nome-prodotto>`).
2. Copia il **`docs/AGENT_BOOTSTRAP.md`** dallo Scadenzario nel nuovo repo
   come `CLAUDE.md`. È la lettera al Claude della prima sessione: gli dice
   chi sei, come lavori, cosa leggere, quali domande farti.
3. Crea un `README.md` di **mezza pagina**: nome, cosa fa in 2 frasi,
   stato (alpha/MVP/beta), link a PRD su SharePoint se esiste.
4. Crea `PROJECT_STATE.md` con tre sezioni vuote: **Now** (cosa sto facendo
   adesso), **Next** (backlog ordinato), **Done log** (commit + descrizione).
5. **Conversazione di scoperta con Claude**: gli racconti cosa fa il prodotto,
   chi è l'utente, qual è il problema centrale. Claude prende appunti in un
   nuovo file `PRD_<nome>.md` (oppure su SharePoint se preferisci).

### Giorno 2 — Schema dati + prima ADR

1. Insieme a Claude, abbozza lo **schema dati** in `sql/01-schema.sql`
   (template: vedi §28 di questo Playbook).
2. Crea `docs/adr/0001-stack.md` che dichiara: vanilla JS + Supabase + (eventuale)
   Worker MCP. È la "Costituzione" del progetto.
3. Lancia gli script SQL su un progetto Supabase fresco. Configura RLS,
   Storage bucket, Realtime publication.
4. Aggiorna `README.md` con i 5 step di setup (vedi quello dello Scadenzario
   come template).

### Giorno 3 — Primo codice + primo test

1. Apri `index.html` vuoto. Crea i 4 blocchi base: CONFIG, STATE, BLOCK 1
   (sync engine), BLOCK 2 (auth).
2. Copia da questo Playbook gli snippet della Parte E (`markDirty` §25,
   `handleRemoteChange` §26, audit log §27).
3. Crea `test/setup.mjs` (vedi §31) + un primo test di smoke
   `test/01-base-flow.mjs`.
4. **Primo commit**, primo push, prima entry in `PROJECT_STATE.md` Done log.

Da qui in poi si lavora a **micro-sprint settimanali** (vedi §16).

## 15. Workflow di sessione Claude

**Ogni volta** che apri una sessione su un repo Nove C, l'ordine è:

1. **Leggi `CLAUDE.md`**: regole non negoziabili specifiche del progetto.
2. **Leggi `PROJECT_STATE.md`**: a che punto siamo *oggi*.
3. **Se nuovo o reset**: leggi `docs/ARCHITECTURE.md` (5 min) +
   `docs/PLAYBOOK.md` (10 min). Questi due insieme bastano per orientarsi.
4. **Ricapitola al PM in 3 frasi**: cosa hai capito dallo stato. Conferma
   o correzione → si parte.

**Durante** la sessione:

- Aggiorna `PROJECT_STATE.md` **alla fine** del task, mai durante. Una
  riga in "Now" → al commit diventa una riga in "Done log".
- Se la sessione produce una **decisione architetturale**, crea l'ADR
  **prima** del codice che la implementa. L'ADR è il contratto.
- Se trovi un pattern che non c'è nel Playbook ma vale per altri progetti,
  **proponi** al PM di aggiungerlo (non aggiungerlo unilateralmente — il
  Playbook è curato).

**A fine** sessione:

- Commit (vedi §22 per il formato).
- Aggiorna "Done log" di `PROJECT_STATE.md` con hash + descrizione.
- Se hai aperto domande senza risposta, lasciale come ❓ in "Now".

## 16. Sprint + PROJECT_STATE come single source of truth

**Sprint = 1 settimana**, da lunedì a venerdì. Niente cerimonie, niente
standup, niente retrospective formali.

`PROJECT_STATE.md` ha **3 sezioni** in ordine fisso:

```markdown
# PROJECT_STATE

## Now (in corso)
- [ ] task corrente — 1-2 righe di contesto
- [ ] eventuale secondo task in parallelo
- ❓ domanda aperta in attesa di risposta del PM

## Next (backlog ordinato per priorità)
1. ⭐ task ad alta priorità — 1 riga
2. task — 1 riga
3. task — 1 riga
...

## Done log (anti-cronologico, ultimo in cima)
| Commit | Cosa |
|--------|------|
| `abc1234` | feat(scope): titolo conciso |
| `def5678` | fix(scope): titolo conciso |
```

**Regole**:
- "Now" ha **massimo 3 voci**. Se ne hai 5, non stai facendo sprint, stai
  facendo wishlist.
- "Next" è ordinato per **priorità reale**, non per data di inserimento.
  Riordina ogni lunedì.
- "Done log" tiene **l'hash del commit** così è cliccabile da GitHub.
- Cose che non finiranno mai → eliminale, non lasciarle a marcire.

A fine settimana, **2 minuti di review** con Claude:
- "Cosa abbiamo chiuso?" → guarda Done log
- "Cosa è scivolato?" → guarda Now
- "Cosa cambia in priorità per la settimana prossima?" → riordina Next

Niente burndown chart. Niente velocity. Niente story point.

## 17. Definition of Done

Un task è "done" quando **tutte e 3** queste cose sono vere:

1. **Il codice è committato e pushato** sul branch corretto
   (`claude/<feature-slug>`, vedi §22).
2. **Esiste almeno un test** che verifica il comportamento principale
   (eccezione: refactor puri senza cambio di comportamento). Il test
   passa in CI o in locale via `node test/run-all.mjs`.
3. **Il PM (Daniel) lo ha visto funzionare** in dogfooding reale, o ha
   esplicitamente delegato la verifica al test.

**Non è done** se:
- "Funziona sulla mia macchina" senza commit
- "I test passano ma non l'ho mai aperto in browser"
- "L'ho fatto ma non l'ho ancora scritto nel Done log"

## 18. Quando creare un ADR

ADR (Architecture Decision Record) = decisione che **costerà ri-cambiare**
o che **vincolerà altre scelte**. **Crealo** in questi casi:

- Scelta di stack (linguaggio, framework, DB, hosting) → ADR 0001
- Scelta di backend principale → ADR 0002
- Scelta di pattern dati strutturale (multi-tenant, soft delete) → ADR 0003
- Integrazione con sistema esterno (MCP, OAuth provider, pagamenti) → ADR 000N
- Decisione di **non** fare X (esplicito) quando X è la scelta naturale

**Non** crearlo per:
- Refactor estetici
- Bug fix
- Scelte locali (nome di una variabile, layout di una funzione)
- Scelte facilmente reversibili (cambiare un colore, riordinare campi)

**Formato** (vedi `docs/adr/000N-*.md` come template):

```markdown
# ADR 000N — Titolo dichiarativo

**Stato**: accettato — <mese anno>
**Contesto**: 2-3 frasi sul problema.

## Decisione
Cosa abbiamo deciso, in modo telegrafico.

## Motivazione
Perché. Alternative considerate. Trade-off.

## Conseguenze
Cosa diventa più facile, cosa diventa più difficile.

## Quando rivedere
I trigger che farebbero riaprire la decisione.
```

ADR sono **immutabili dopo l'approvazione**. Se cambia idea: crei un
**nuovo** ADR che supersede il precedente, citandolo.

## 19. Bug-hunt come pratica

Periodicamente (ogni 2-3 sprint, o quando senti che il prodotto "scricchiola"),
fai una **sessione bug-hunt**:

1. Apri l'app in modalità utente, **non in modalità dev**.
2. Prova flussi reali per 30-60 minuti. Annota **ogni** stranezza.
3. A fine sessione: classifica le voci in:
   - **bug critico** (perdita dato, crash, sicurezza) → fix subito
   - **bug fastidioso** (UX, regressione) → next sprint
   - **odore** (è strano ma non rompe) → in `PROJECT_STATE.md` con tag `bug-hunt-NN`

Convenzione: ogni round di bug-hunt ha un numero progressivo (`bug-hunt-01`,
`02`, ...) usato come **scope nei commit** dei fix successivi.

Esempio dal repo: `fix(bug-hunt-08): computePriority NPE + hash decoding + tap target 36px`.

**Perché funziona**: i bug si trovano in batch quando ti immergi nel
prodotto da utente, non da dev. Lavorando a feature passi accanto a 10 bug
ogni giorno senza vederli.

## 20. Dogfooding come fase obbligatoria

**Dogfooding** = il PM (Daniel) **usa il prodotto per il suo lavoro reale**
per 3-7 giorni consecutivi prima di considerarlo "spedibile".

Non è test. Non è QA. È **usare** il prodotto come lo userebbe l'utente
finale reale, con dati veri, su dispositivi veri (iPhone + desktop
Windows).

**Output del dogfooding**:
- Lista di frustrazioni reali → diventano task in `Next`
- Conferma che i flussi "felici" funzionano davvero
- Scoperta di edge case che il test non coprirebbe (es. nomi clienti
  con apostrofi, allegati da 18 MB, sessione lasciata aperta una notte)

**Quando programmare il dogfooding**:
- Sempre **prima** di considerare uno sprint "chiuso"
- Sempre prima di un'eventuale demo a un cliente
- Sempre prima di toccare uno schema SQL in modo non banale (così sai
  cosa stai per rompere)

Nello Scadenzario è registrato in `PROJECT_STATE.md` come voce di "Doing":
`Doing = dogfooding 3-7gg`. Non è una metafora.

## 21. Strategia di test

Tre livelli, in ordine di priorità inversa (il primo è il più importante):

### Livello 1 — Dogfooding (vedi §20)
Il test umano insostituibile. Trova quello che gli altri due non vedono.

### Livello 2 — Test E2E Playwright headless
Sta in `test/`, esegue contro `index.html` servito da un server statico
interno (vedi §31 per il template). **Network bloccata** verso Supabase
produzione: i test girano contro stato locale stubbato in memoria.

**Cosa testare a questo livello**:
- I flussi delle user story principali (US-01, US-02, …)
- `handleRemoteChange` con payload finti
- Edge case del motore di generazione idempotente
- Regressioni di bug-hunt (un test per ogni `bug-hunt-NN` chiuso)

**Cosa NON testare**:
- Layout pixel-perfect (cambierà spesso)
- Performance assoluta (i numeri dipendono dal CI runner)
- Integrazione vera con Supabase (è troppo flaky; mock locale)

### Livello 3 — Test unitari di funzioni pure
Solo per **funzioni pure non triviali** (es. `computePriority(record, oggi)`,
parser CSV, validatori di formato come email/IBAN/CF/P.IVA, normalizzatori
di stringhe). File `test/unit-*.mjs`, zero dipendenze. Sono "extra" — il
livello 2 li copre indirettamente.

### Niente test contro Supabase produzione
Mai. Mai. **Mai.** Anche un test innocuo può lasciare righe orfane,
trigger di realtime indesiderati, audit log spurio. Solo locale stubbato.

## 22. Convenzioni di commit, branch, PR

### Branch

```
claude/<verbo-tema-NhashCorto>
```

Esempi reali:
- `claude/review-project-docs-gmQer`
- `claude/sprint-4-mcp-aBxYz`
- `claude/bug-hunt-08-fixes-Qwert`

**Mai pushare direttamente su `main`**. PR squash → main.

### Commit message

Formato:
```
tipo(scope): titolo conciso (≤72 char)

Body opzionale di 2-5 righe sul *perché* (non sul cosa: il diff già
mostra il cosa). Cita issue/ADR rilevanti.
```

**Tipi ammessi**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`.

**Scope** = modulo o tema: `mcp`, `kanban`, `sync`, `auth`, `db`, `bug-hunt-NN`.

Esempi reali dal repo:
- `feat(mcp): worker Cloudflare HTTP + factory client/tools + smoke test worker`
- `fix(bug-hunt-08): computePriority NPE + hash decoding + tap target 36px`
- `docs(refresh): PLAYBOOK trasversale + ADR 0004 + ARCHITECTURE aggiornata`

### PR

- Titolo = primo commit message (squashato).
- Body = lista bullet di **cosa cambia** + sezione "Note per il review"
  se ci sono punti di attenzione.
- **Niente PR auto-merge** in early stage. Sempre review umana di Daniel.
- Squash merge sempre, no merge commit.

## 23. Stile di comunicazione PM↔Claude

Regole di stile, **non opzionali**:

1. **Italiano** per default. Termini tecnici inglesi quando standard
   (commit, branch, debounce). Niente itanglese forzato (es. "schedulare"
   sì, "actionare" no).

2. **Frasi corte. Niente filler.** Non "vorrei segnalarti gentilmente che",
   ma "guarda che". Non "potrebbe essere utile considerare", ma "valuta".

3. **PM-to-PM, non assistant-to-user.** Claude è un collega senior, non
   un sottoposto. Può **dissentire** se ha un argomento, può **proporre**
   alternative, può dire "questo è una pessima idea perché". Il PM non
   vuole servilismo.

4. **"Perché" prima di "come"**, sempre. In una risposta tecnica:
   - 1 frase: cosa proponi
   - 1-3 frasi: perché (motivazione + alternative scartate)
   - Poi il codice/comando

5. **Confidenza calibrata.** Se sei sicuro, sii diretto. Se sei incerto,
   dichiaralo: "non sono sicuro che funzioni in tutti i browser, vale la
   pena un test rapido". Mai falsa modestia, mai falsa sicurezza.

6. **Lunghezza calibrata al canale.** Il PM legge dal telefono in
   metropolitana. Risposte brevi di default. **Approfondisci** solo
   quando il PM lo chiede esplicitamente.

7. **Niente emoji nei file di codice**, **emoji moderato nelle chat**
   solo se aggiunge senso (✅ test pass, ❌ test fail, ⭐ priorità, ❓ aperto).

## 24. "Notte autonoma": Claude lavora da solo

Pratica Nove C ricorrente: il PM lascia Claude lavorare **per ore senza
supervisione** su un task ben definito (es. "implementa il modulo X
secondo lo spec, scrivi i test, aggiorna i doc, committa"). Al mattino
il PM rivede.

**Vincoli della notte autonoma**:

- Il task deve avere un **definition of done** scritto **prima** di iniziare.
- Claude può prendere **decisioni minori** (naming, struttura interna)
  senza chiedere, ma deve **documentarle** in commit message + eventuale
  ADR.
- Per **decisioni grosse** (cambio di stack, schema breaking, dipendenza
  nuova non pianificata): Claude **si ferma** e lascia un commento in
  `PROJECT_STATE.md` ↳ `Now` con un ❓.
- Mai operazioni distruttive autonome (DROP, DELETE prod, force push,
  rebase su main).
- A fine notte: commit chiari + entry in Done log + 3-5 righe di
  riepilogo dei punti aperti.

**Esempi storici dal repo**:
- `docs(notte): human scenarios + USER_GUIDE + SENIOR_ANALYSIS + ROADMAP + PROJECT_STATE`
- `feat(mcp): server MCP custom per Claude (16 tool read+write, JSON-RPC stdio)`

---

## 32. Audit del contesto prima di chiedere + stato operativo cloud

Due regole gemelle, nate da un episodio concreto del 23 maggio 2026 in cui
Claude ha chiesto al PM informazioni che (a) erano già state scritte da
Claude stesso poche risposte prima nella sessione, (b) erano scritte in
modo obsoleto nei doc del repo perché il PM aveva agito sul cloud senza
aggiornarli. Risultato: il PM si è chiesto "ma allucina?". La risposta è
stata "no, ma ho un buco di processo". Questa sezione chiude il buco.

### 32.1 Audit del contesto prima di chiedere

**Prima di ogni `AskUserQuestion` o domanda di chiarimento**, fai
esplicitamente questo filtro in 3 pass:

1. **Cosa ho scritto io stesso in questa sessione** che risponde a parti
   della domanda? Le mie risposte precedenti sono contesto a tutti gli
   effetti — usale.
2. **Cosa è nei doc del repo** (`CLAUDE.md`, `PROJECT_STATE.md`, `README.md`,
   `docs/`)? Sono autorevoli per il codice committato.
3. **Cosa il PM ha menzionato a voce in questa chat** (anche en passant)?
   Una sola menzione vale come fatto noto per il resto della sessione.

Chiedi al PM **solo** ciò che resta dopo questo filtro. Quando chiedi,
**dichiara esplicitamente cosa sai già** e cosa stai chiedendo. Esempio:

> "Ho dal contesto: branch `claude/foo`, repo `org/bar`, Worker su
> `xyz.workers.dev`. Mi serve solo l'URL Netlify produzione."

Così il PM vede subito se hai ricostruito bene, e se hai allucinato qualcosa
ti corregge **prima** di darti l'info nuova.

**Anti-pattern**: leggere i doc del repo come prima azione e usarli come
fonte unica. I doc raccontano lo stato del codice; la chat racconta lo
stato del momento. Quando divergono, **la chat batte i doc** (e segnala
che i doc vanno aggiornati).

### 32.2 Doc del repo ≠ source of truth per stato operativo cloud

I doc nel repo sono autorevoli per il **codice committato**. Per lo **stato
operativo cloud** (URL produzione, servizi collegati, account attivi,
chiavi ruotate, collaboratori invitati, branch deployati, domini comprati)
sono solo *l'ultimo stato conosciuto e documentato*. Se il PM ha agito sul
cloud senza aggiornare il doc, **il doc è obsoleto e silenziosamente
sbagliato** — uno scenario peggiore di "doc mancante", perché induce in
errore con sicurezza.

**Regola operativa**: ogni volta che il PM tocca infrastruttura cloud
fuori dal repo (collegare/scollegare un servizio, comprare un dominio,
ruotare una secret, deployare un nuovo Worker, dare accesso a un
collaboratore, cambiare branch di deploy, upgradare un plan), **la stessa
sessione** in cui lo fa deve aggiornare la sezione **"Ambienti live"** di
`PROJECT_STATE.md`. Se non lo fa il PM, Claude glielo chiede prima di
chiudere: *"hai appena fatto X — aggiorno il doc operativo?"*.

**Quando rispondi su qualcosa di cloud, verifica al PM la freschezza del
fatto** prima di basarci sopra un piano. Una riga: *"Verifico: oggi
Netlify è collegato e serve il branch X, giusto?"*. Costa nulla, e il PM
preferisce essere chiesto due volte che lasciarti partire su un piano
sbagliato.

### 32.3 La sezione "Ambienti live" — schema

In `PROJECT_STATE.md`, subito dopo l'header. Per ogni componente cloud
elenca: URL pubblico, provider, account, branch/ambiente sorgente, plan,
secrets (riferimento "dove vivono", **mai il valore**), eventuali note.

Esempio reale dallo Scadenzario, vedi `PROJECT_STATE.md` sezione
"Ambienti live": 4 sub-sezioni (Frontend Netlify · Backend Supabase · MCP
Worker Cloudflare · Repo GitHub) con tutti i fatti operativi.

### 32.4 Esempio storico

> Il PM ha collegato Netlify il giorno X e l'app è live da allora. I doc
> del repo dicevano ancora "non ancora configurato". Claude ha letto i
> doc come fonte di verità, ha chiesto al PM "vogliamo configurare
> Netlify?", il PM ha giustamente reagito "ma siamo live da giorni, perché
> non lo sai?". Fix: questa sezione + la sezione "Ambienti live" in
> `PROJECT_STATE.md`. Vedi commit del 23 maggio 2026 nel Done log.

---

# Parte E — Snippet riusabili

> I template che seguono sono **estratti dal codice reale dello Scadenzario**,
> già testati in produzione. Copia-incolla nel prodotto numero 2.
> Riferimento `file:riga` come "vedi esempio originale".

> **Copia canonica sterilizzata → `nove-c-kit` (repo pubblico)**
> Gli snippet di questa Parte E + lo scheletro MCP della §30 vivono anche,
> in versione **parametrizzata e dominio-free**, nel kit pubblico
> [`danielcarta9c/nove-c-kit`](https://github.com/danielcarta9c/nove-c-kit).
> Un Claude di un altro progetto può recuperarli senza accesso a questo repo
> via `raw.githubusercontent.com/danielcarta9c/nove-c-kit/v1/<path>`.
> Gli snippet qui sotto restano la versione "caso di studio" (con i nomi reali
> Scadenzario, leggibile offline); il kit è la versione "pronta da clonare".
> **Copia, non importare** (vedi `nove-c-kit/README.md`).
>
> | Sezione | File nel kit (`v1`) |
> |---------|---------------------|
> | §25 markDirty/saveNow | `snippets/markDirty-saveNow.mjs` |
> | §26 handleRemoteChange | `snippets/handleRemoteChange.mjs` |
> | §27 audit log | `snippets/audit-log.mjs` |
> | §28 soft delete + RLS | `snippets/multi-tenant-audit-soft-delete.sql` |
> | §29 attachKanDrag | `snippets/attachKanDrag.mjs` |
> | §30 Worker MCP skeleton | `mcp-template/` (intera cartella) |
> | §31 bootHarness | `snippets/bootHarness.mjs` |

## 25. `markDirty` + `saveNow` + `isPlaceholder`

Pattern: l'utente modifica state → marchiamo "dirty" + schedulato debounced
350ms → un solo round di upsert al cloud, batched, **mai sui placeholder**.

Vedi `index.html:1818-1864` per la versione live.

```js
const PLACEHOLDER_ID_REGEX = /^(new|temp|placeholder)[-_:]/i;
const isPlaceholder = obj => !obj || !obj.id || PLACEHOLDER_ID_REGEX.test(obj.id);

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...args); }, ms);
  };
}

function markDirty(opts) {
  state.dirty = true;
  if (!state._dirty) {
    state._dirty = { records: new Set(), all: false };
  }
  if (opts?.recordId) state._dirty.records.add(opts.recordId);
  else state._dirty.all = true;
  setStatus("dirty", "Salvataggio…");
  scheduleSave();
}

const scheduleSave = debounce(saveNow, 350);

async function saveNow() {
  if (state.saving || !state._dirty) return;
  state.saving = true;
  setStatus("dirty", "Salvataggio…");
  try {
    let toUpsert;
    if (state._dirty.all) {
      toUpsert = state.data.records.filter(r => !isPlaceholder(r));
    } else {
      toUpsert = [...state._dirty.records]
        .map(id => state.data.records.find(r => r.id === id))
        .filter(r => r && !isPlaceholder(r));
    }
    if (toUpsert.length) await cloudUpsertBatch(toUpsert);
    state._dirty = { records: new Set(), all: false };
    state.dirty = false;
    setStatus("ok", "Sincronizzato");
  } catch (e) {
    console.error(e);
    setStatus("err", "Errore sync");
    toast("Errore sincronizzazione: " + (e.message || e), 4000);
  } finally {
    state.saving = false;
  }
}
```

**Punti chiave**:
- `state.dirty` boolean per UI (banner "salvataggio…"), `state._dirty` per logica.
- Doppia modalità: per id specifici (efficiente) o full batch (fallback).
- **Sempre** filtro `isPlaceholder` prima di upsertare. **Mai dimenticarlo**:
  un placeholder pushato sul cloud diventa un record fantasma indistruttibile.
- `try/finally` rilascia `state.saving` anche su errore.

## 26. `handleRemoteChange` con self-echo skip

Pattern realtime: il server pusha una modifica → noi aggiorniamo state
**preservando i riferimenti** (`Object.assign`, mai assegnamento) e
**saltando self-echo** se l'utente sta editando proprio quel record.

Vedi `index.html:1986-2016` per la versione live.

```js
function handleRemoteChange(table, payload) {
  if (table === "records") {
    if (payload.eventType === "DELETE") {
      state.data.records = state.data.records.filter(r => r.id !== payload.old.id);
    } else {
      const row = payload.new;
      // Self-echo: l'utente sta editando proprio questo record.
      // Ignora: il prossimo saveNow() riallineerà comunque.
      if (state.selectedId === row.id) return;
      const idx = state.data.records.findIndex(r => r.id === row.id);
      if (idx >= 0) {
        // CRITICO: Object.assign muta in-place, preserva i ref dei form.
        // MAI state.data.records[idx] = row → form scollegato (bug v6.0.2 CRM).
        Object.assign(state.data.records[idx], row);
      } else {
        state.data.records.unshift(row);
      }
    }
  }
  renderAll();
}

// Subscription:
const channel = sb
  .channel("records-realtime")
  .on("postgres_changes",
      { event: "*", schema: "public", table: "records" },
      payload => handleRemoteChange("records", payload))
  .subscribe();
```

**Punti chiave**:
- `Object.assign(existing, row)` — **mai** riassegnare l'oggetto.
- Self-echo skip su `state.selectedId === row.id`.
- DELETE è gestito a parte (rimozione array).
- INSERT inietta in cima per visibilità (`unshift`); cambia se vuoi ordine diverso.

## 27. Audit log batched (client + SQL)

Pattern: ogni operazione CUD logga un evento → coda in memoria → flush ogni
2 secondi in background → **mai blocca** l'UI.

### Tabella SQL

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  actor_id    uuid REFERENCES auth.users(id),  -- null se sistema o MCP server
  action      text NOT NULL,                    -- 'create', 'update', 'delete', 'login', 'backup_export', ...
  entity_type text,                              -- 'utente', 'ordine', 'documento', 'template', ...
  entity_id   uuid,                              -- nullable: alcune azioni non hanno entità singola
  payload     jsonb,                             -- diff, snapshot, o context
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_workspace_select ON audit_log
  FOR SELECT TO authenticated
  USING (workspace_id = current_workspace_id());

CREATE POLICY audit_log_workspace_insert ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = current_workspace_id());

CREATE INDEX audit_log_workspace_created_idx ON audit_log(workspace_id, created_at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log(entity_type, entity_id);
```

### Client batched (fire-and-forget)

```js
const auditQueue = [];
let auditTimer = null;

function logAudit(action, entityType, entityId, payload) {
  auditQueue.push({
    workspace_id: state.currentWorkspaceId,
    actor_id: state.user?.id || null,
    action,
    entity_type: entityType || null,
    entity_id: entityId || null,
    payload: payload || null,
  });
  if (!auditTimer) auditTimer = setTimeout(flushAudit, 2000);
}

async function flushAudit() {
  auditTimer = null;
  if (!auditQueue.length || !sb) return;
  const batch = auditQueue.splice(0);
  try {
    await sb.from("audit_log").insert(batch);
  } catch (e) {
    console.warn("audit log flush failed", e);
    // Re-enqueue se vuoi retry; oppure accetta la perdita (audit ≠ critico).
  }
}

window.addEventListener("beforeunload", () => {
  if (auditQueue.length && sb) {
    // Best-effort sync su tab close: usa sendBeacon se l'endpoint REST lo supporta.
    sb.from("audit_log").insert(auditQueue.splice(0));
  }
});
```

**Punti chiave**:
- **Fire-and-forget**: l'audit non deve mai bloccare l'utente.
- Batch ogni 2s: 1 INSERT con 20 righe è meglio di 20 INSERT.
- `actor_id` nullable: scritture da MCP server o cron job non hanno utente loggato.
- `payload` JSONB: ci metti dentro quello che serve (diff, snapshot, motivo).
- `beforeunload` per non perdere gli ultimi eventi su chiusura tab.

## 28. Soft delete + RLS workspace-scoped (SQL)

Pattern: ogni tabella business ha `workspace_id` + `deleted_at`. RLS
filtrano automaticamente per workspace dell'utente e nascondono i
soft-deleted.

```sql
-- 1. Tabelle infrastrutturali (workspace + membership)

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO workspaces (id, nome) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ruolo text NOT NULL DEFAULT 'member',
  PRIMARY KEY (workspace_id, user_id)
);

-- 2. Funzione per leggere il workspace dell'utente loggato

CREATE OR REPLACE FUNCTION current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM workspace_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 3. Pattern per ogni tabella business (esempio: records)

CREATE TABLE IF NOT EXISTS records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id)
    DEFAULT '00000000-0000-0000-0000-000000000001',
  -- ... campi business ...
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL    -- soft delete
);

ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: solo workspace dell'utente, escludi soft-deleted
CREATE POLICY records_select ON records
  FOR SELECT TO authenticated
  USING (workspace_id = current_workspace_id() AND deleted_at IS NULL);

-- Policy INSERT: solo nel proprio workspace
CREATE POLICY records_insert ON records
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = current_workspace_id());

-- Policy UPDATE: solo nel proprio workspace; permette anche soft-delete
CREATE POLICY records_update ON records
  FOR UPDATE TO authenticated
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- Niente policy DELETE: si usa soft-delete via UPDATE deleted_at = now()
```

**Punti chiave**:
- `DEFAULT '00000000-0000-0000-0000-000000000001'` sul workspace così l'app
  single-tenant funziona senza ricordarsi di settarlo.
- `SECURITY DEFINER` su `current_workspace_id()` per saltare RLS sul
  lookup membership (altrimenti loop).
- **Mai** policy DELETE: l'app fa solo UPDATE `deleted_at`. La policy SELECT
  esclude i deleted automaticamente.
- Index su `(workspace_id, deleted_at)` se il filtro diventa lento.

Esempio reale in produzione: `sql/04-multi-tenant-audit-soft-delete.sql`.

## 29. `attachKanDrag` — drag touch iOS

Pattern: drag&drop tra colonne Kanban che funziona su iPhone Safari
**senza rompere** lo scroll di pagina.

Vedi `index.html:2121` per la versione live.

```html
<style>
  .card { touch-action: auto; }              /* default: scroll normale */
  .card.is-dragging { touch-action: none; }   /* solo durante drag */
</style>
```

```js
function attachKanDrag(card, onDrop, opts = {}) {
  const isTouch = "ontouchstart" in window;
  let dragging = false;
  let startX = 0, startY = 0;
  let ghost = null;

  function onStart(e) {
    const pt = isTouch ? e.touches[0] : e;
    startX = pt.clientX; startY = pt.clientY;
    // Aspetta soglia di 8px per distinguere tap da drag
  }

  function onMove(e) {
    const pt = isTouch ? e.touches[0] : e;
    const dx = pt.clientX - startX, dy = pt.clientY - startY;
    if (!dragging) {
      if (Math.hypot(dx, dy) < 8) return;  // ancora tap
      dragging = true;
      card.classList.add("is-dragging");
      ghost = card.cloneNode(true);
      ghost.classList.add("drag-ghost");
      document.body.appendChild(ghost);
    }
    if (isTouch) e.preventDefault();  // blocca scroll SOLO durante drag
    ghost.style.left = pt.clientX + "px";
    ghost.style.top = pt.clientY + "px";
  }

  function onEnd(e) {
    if (dragging) {
      const pt = isTouch ? e.changedTouches[0] : e;
      const target = document.elementFromPoint(pt.clientX, pt.clientY);
      const column = target?.closest(".kan-column");
      if (column) onDrop(card, column);
    }
    cleanup();
  }

  function cleanup() {
    dragging = false;
    card.classList.remove("is-dragging");
    if (ghost) { ghost.remove(); ghost = null; }
  }

  if (isTouch) {
    // CRITICO: { passive: false } altrimenti preventDefault non funziona
    card.addEventListener("touchstart", onStart, { passive: false });
    card.addEventListener("touchmove", onMove, { passive: false });
    card.addEventListener("touchend", onEnd);
    card.addEventListener("touchcancel", cleanup);
  } else {
    card.addEventListener("mousedown", onStart);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
  }
}
```

**Punti chiave**:
- `touch-action: auto` di default, `none` SOLO quando `.is-dragging`.
- `{passive: false}` obbligatorio sui listener touch, altrimenti
  `preventDefault()` è no-op (Safari iOS).
- Soglia 8px prima di considerare "drag": distingue tap accidentali.
- `elementFromPoint` per trovare il bersaglio sotto il dito al rilascio.

## 30. `OAuthProvider` Worker MCP skeleton

Vedi §1 per il razionale e `mcp-server/worker.mjs` per la versione live
con tutti i tool. Qui il **minimo** per un MCP server HTTP con OAuth 2.1 + DCR.

### `wrangler.toml`

```toml
name = "<nome-progetto>-mcp"
main = "worker.mjs"
compatibility_date = "2025-01-01"

[[kv_namespaces]]
binding = "OAUTH_KV"
id = "PLACEHOLDER_SOSTITUISCI"

# Secrets via `npx wrangler secret put NOME`:
# - MCP_AUTH_TOKEN     (consent password)
# - BACKEND_URL        (es. Supabase project URL)
# - BACKEND_SECRET_KEY (es. Supabase Secret)
```

### `worker.mjs`

```js
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { dispatchMCP } from "./mcp-dispatcher.mjs";

const oauth = new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: { fetch: handleMCP },
  defaultHandler: { fetch: handleHTTP },
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});

export default {
  fetch: (req, env, ctx) => oauth.fetch(req, env, ctx),
};

async function handleMCP(req, env, ctx) {
  const body = await req.json();
  const client = makeBackendClient(env);
  const result = await dispatchMCP(body, client);
  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" },
  });
}

async function handleHTTP(req, env, ctx) {
  const url = new URL(req.url);
  if (url.pathname === "/authorize" && req.method === "GET") {
    return new Response(renderConsentPage(url.search), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (url.pathname === "/authorize" && req.method === "POST") {
    const form = await req.formData();
    if (form.get("token") !== env.MCP_AUTH_TOKEN) {
      return new Response("Token non valido", { status: 401 });
    }
    // completeAuthorization: vedi docs workers-oauth-provider
    return ctx.props.completeAuthorization({
      request: ctx.props.oauthRequest,
      userId: "studio",
      metadata: {},
      scope: ["mcp"],
      props: {},
    });
  }
  return new Response("<nome-progetto> MCP", { status: 200 });
}

function renderConsentPage(query) {
  return `<!doctype html><html><head><meta charset="utf-8">
    <title>Autorizza connector</title>
    <style>
      body { font-family: system-ui; max-width: 480px; margin: 4rem auto; padding: 1rem; }
      h1 { color: #1a365d; } button { background: #2eb08e; color: white;
        border: 0; padding: .75rem 1.5rem; border-radius: 8px; font-size: 1rem; }
      input { width: 100%; padding: .5rem; font-size: 1rem; margin: .5rem 0; }
    </style></head><body>
    <h1>Autorizza Claude</h1>
    <p>Claude sta chiedendo di collegarsi al tuo &lt;nome-progetto&gt;.
       Inserisci il <strong>token di consenso</strong> per autorizzare.</p>
    <form method="POST" action="/authorize${query}">
      <label>Token di consenso</label>
      <input type="password" name="token" required autofocus>
      <button type="submit">Autorizza</button>
    </form>
  </body></html>`;
}
```

**Punti chiave**:
- Una sola libreria (`@cloudflare/workers-oauth-provider`), nessun JWT da gestire a mano.
- Pagina `/authorize` brandizzata in **HTML inline** nel worker (no
  template engine).
- `MCP_AUTH_TOKEN` è la consent password: chi la conosce può autorizzare.
- Per il dispatcher MCP (JSON-RPC), vedi `mcp-server/mcp-dispatcher.mjs`
  dello Scadenzario.

## 31. `bootHarness` — server statico + Playwright + cloud bloccato

Pattern: test E2E che girano contro `index.html` reale ma con la rete
verso Supabase **bloccata** → tutto stato locale stubbato in memoria.

Vedi `test/setup.mjs` per la versione live.

```js
// test/setup.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

async function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    "/opt/node22/lib/node_modules/playwright/index.mjs",  // container CI
    path.join(ROOT, "node_modules/playwright/index.mjs"),  // local
    "playwright"
  ].filter(Boolean);
  for (const c of candidates) {
    try { return await import(c); } catch {}
  }
  throw new Error("Playwright non trovato");
}

function startStaticServer(port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css", ".json": "application/json",
  };
  const server = http.createServer((req, res) => {
    let url = (req.url || "/").split("?")[0];
    if (url === "/") url = "/index.html";
    const fp = path.join(ROOT, url);
    if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(fp, (err, data) => {
      if (err) { res.writeHead(404); res.end("404"); return; }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

export async function bootHarness(opts = {}) {
  const port = opts.port || 8765;
  const server = await startStaticServer(port);
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  // CRITICO: blocca la rete verso il backend produzione.
  await page.route("**/*supabase.co/**", r => r.abort());

  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__app);  // hook globale dell'app

  return {
    page, browser, server, errors,
    teardown: async () => { await browser.close(); server.close(); },
  };
}

export function mkChecker() {
  const fails = [], passes = [];
  return {
    ok(label, cond, hint) {
      console.log((cond ? "✅ " : "❌ ") + label + (hint ? "\n    " + hint : ""));
      (cond ? passes : fails).push(label);
    },
    summary(prefix) {
      if (!fails.length) { console.log(`✅ ${prefix}: ${passes.length}/${passes.length}`); return 0; }
      console.log(`❌ ${prefix}: ${passes.length}/${passes.length + fails.length}`);
      fails.forEach(f => console.log("    - " + f));
      return 1;
    },
  };
}
```

Esempio d'uso di un singolo test:

```js
// test/01-base-flow.mjs
import { bootHarness, mkChecker } from "./setup.mjs";

const { page, errors, teardown } = await bootHarness();
const c = mkChecker();
try {
  // L'app inietta uno stato di test via console:
  await page.evaluate(() => window.__app.setTestState({
    records: [{ id: "r1", title: "Test record", stato: "backlog" }],
  }));
  await page.waitForSelector("[data-record-id='r1']");
  c.ok("record visibile", true);

  await page.click("[data-record-id='r1']");
  c.ok("sheet aperto", await page.isVisible("#sheet"));

  c.ok("zero JS errors", errors.length === 0,
       errors.length ? "errors: " + errors.join("; ") : "");
} finally {
  await teardown();
}

process.exit(c.summary("test 01"));
```

**Punti chiave**:
- `page.route("**/*supabase.co/**", r => r.abort())` blocca **ogni**
  chiamata al backend produzione. I test sono garantiti deterministici.
- `loadPlaywright()` cerca in più path → funziona in container CI e su locale.
- `window.__app` (o `__scad` nello Scadenzario) è un hook globale che
  espone setTestState/getState per i test.
- `mkChecker` evita di installare una libreria di assertion: 30 righe e fa
  quello che serve.

---

## 33. Design discovery prima di codice

**Il problema che risolve**: quando il PM dice "voglio l'app più bella",
la tentazione di Claude è iniziare a refactorare CSS, aggiungere dark mode,
sostituire emoji con icone Lucide, mettere shadow ovunque. È quello che
abbiamo fatto in Sprint UX-A → UX-D Wave 1 dello Scadenzario. Risultato:
**13 mesi di polish, PM ancora bocciava come "cheap"**. La causa: stavo
polishando un *layout* del 2018 (form a muro, dropdown nascosti, modal
centrato), e nessuna shadow lo trasforma in "premium".

La lezione: prima di scrivere una riga di CSS sull'app live, **mockuppa
il risultato che vuoi su file HTML statici** e fattelo approvare. È un
investimento di 2-3 ore che evita 2-3 giorni di refactor pesante.

### Il deliverable di discovery (3 file)

In `docs/design-discovery/`:

1. **`DESIGN_LANGUAGE_v1.md`** — documento scritto. Identità in 4 valori,
   palette, tipografia, 5-10 pattern fondamentali, roadmap implementazione
   con stime in ore. Lungo 200-500 righe, ma è la *spec* dei prossimi sprint
   di implementazione.

2. **2-3 mockup HTML statici** — uno per ciascuna delle schermate più
   visibili e complesse (es. scheda dettaglio entità, form di anagrafica,
   editor di regole complesse). Devono essere:
   - autonomi (nessuna dipendenza JS)
   - mobile-first (393px iPhone come target principale)
   - usabili dal browser desktop *e* dal mobile Safari (li serve un branch
     deploy come Netlify path `/docs/design-discovery/*.html`)
   - con una sezione "Cosa cambia rispetto a oggi" sotto il device-frame
     che spiega le decisioni di design

3. **`README.md` della cartella** — istruzioni testing + stato approvazioni
   PM + domande aperte numerate per facilitare il feedback.

### Il loop di discovery (max 1 settimana)

```
PM: "non c'è effetto wow, è grafica cheap"
↓
Claude: stop al codice. Discovery: 60min studio competitor + 90min mockup
↓
PM: apre i mockup su iPhone, vede il livello
↓
Decisione esplicita PM su: palette, font, pattern principale
↓
Eventuali iterazioni sui mockup (sempre file statici)
↓
Solo quando 1 mockup è "ci siamo, è quello giusto" → si scrive codice
nell'app vera
↓
Gli altri mockup si ridisegnano in coerenza con quello approvato
prima di toccare le altre schermate dell'app
```

### Quando saltare la discovery (rara)

Se l'app è ancora a livello MVP senza utenti, e il PM dice "fai tu che
voglio vedere", puoi saltare. Ma appena emerge "non mi piace, è cheap",
**fermati e fai discovery**. La voglia di "spingere ancora un po' di
polish per vedere se ora gli piace" porta sempre a perdere altre ore.

### Anti-pattern (cosa NON fare)

- ❌ Refactor parziale dell'app live "per provare" — l'utente vede un
  Frankenstein metà vecchio metà nuovo e non sa cosa giudicare.
- ❌ Mockup come Figma esportato in PNG — il PM mobile non può "vivere"
  un PNG, gli serve cliccare. HTML statico aperto da Safari sì.
- ❌ Mockup che simula 100% dell'interazione (toggle che funziona davvero,
  click che apre bottom sheet) — costoso da fare, distrae dal giudizio
  visivo. Statico basta.
- ❌ "Tre mockup pronti, scegli quello che ti piace" senza prima un doc
  scritto di design language — il PM sceglie senza sapere cosa ha approvato
  davvero, e l'iterazione successiva torna alla casella zero.

### Riferimenti file (Scadenzario)

- `docs/design-discovery/DESIGN_LANGUAGE_v1.md` — esempio v1 (documento + tipografia + palette + 7 pattern + roadmap 21h)
- `docs/design-discovery/mockup-{01,02,03}-*.html` — i 3 mockup approvati in design discovery
- `docs/design-discovery/README.md` — istruzioni per il PM
- Commit ref: `782afb2` (proposta v1), `7ed6e95` (palette+font brand), `a3b63db` (mockup 01+02 nello stile del 03 approvato)

---

## 34. Parsimonia su build credits

**Il problema concreto**: Netlify (e pari concorrenti) ha quote di build
mensili. Sul piano paid base 1000 build/mese — sembrano tanti finché un
giovedì pomeriggio Claude pusha 18 volte in 4 ore per fix incrementali su
una stessa schermata. Il PM apre il dashboard del suo provider, vede "75%
consumato il giorno 10 del mese" e si arrabbia (giustamente).

**La lezione operativa**: ogni `git push` triggera una build. Quindi
**ogni commit deve essere fatto localmente ma non pushato finché il
batch logico è completo e testato**.

### La regola "1 push per concept"

| Concept | # push tipico | Quando pushare |
|---------|---------------|----------------|
| Fix singolo bug critico | 1 push | Subito (è breve, vale il build) |
| Sprint di Wave intera (es. 5-6 fix correlati) | 1 push | Solo a fine, dopo suite test verde |
| Discovery files (mockup, doc) | 1 push | Solo quando tutti i mockup sono pronti |
| Bugfix mirato post-feedback PM | 1 push | Solo dopo aver fixato TUTTI i bug segnalati nel turn |

**Mai**:
- ❌ "Wip commit" pushati per "salvare lavoro" (usa stash + branch privato locale)
- ❌ Push intermedi "per vedere se Netlify ribuilda" (è già configurato, non serve test)
- ❌ Re-push immediato per typo in commit message (usa `--amend` localmente e push dopo)

### Comunicazione al PM

Quando inizi un batch grande, dillo esplicitamente all'inizio:
> "Implemento Wave 2 (form anagrafica + template editor + scheda adempimento)
> in batch grande, 1 push singolo a fine. Stima 3-4h. Tu ricevi una sola
> notifica deploy."

E quando il PM apre l'app dopo il push, lo testa **tutto insieme** — non
"oh aspetta sto pushando un fix di 5 minuti".

### Il segnale di soglia

Se il PM dice cose tipo:
- "Sperando che Netlify regga"
- "Siamo al X% di credito"
- "Quanto ci resta di build?"

**stop tutto** e rispondi con un piano esplicito di consolidamento (es.
"resto a fare bug-fix per una settimana, max 2 push, niente nuove
feature"). È il segnale che hai pushato troppo e il PM lo ha notato.

### Riferimenti
- CLAUDE.md sezione "Versioning & branch" → Netlify auto-deploy LIVE
  dal branch di sviluppo. Ogni push ribuilda.
- Sessione Sprint UX-D Wave 2: PM al 75% credito → strategia "1 push per
  Wave" applicata, push singolo per Wave 2 + 1 per Wave 2.5 + 1 per
  bugfix scheda cliente = 3 build per ~12h di lavoro denso. Funziona.

---

## Come aggiornare questo file

Quando in una sessione Claude scopri un pattern nuovo che vale per più di un
progetto, **aggiungi una sezione qui**. Quando un pattern viene smentito (es.
"non usare più X perché Y"), aggiorna il pattern *e* lascia una nota
storica con la data, così chi legge il file da una vecchia copia capisce
l'evoluzione.

Stile: prosa naturale, esempi di codice concreti, "perché" prima del "come".
Niente filler. Quando puoi, link al file/ADR specifico dello Scadenzario
come "vedi esempio in produzione".
