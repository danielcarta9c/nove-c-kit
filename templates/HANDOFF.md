# HANDOFF — &lt;NOME_PROGETTO&gt; · &lt;DATA&gt;

> **Questo documento è il PRIMO che devi leggere** se sei un Claude che sta
> riprendendo il lavoro su questo progetto. Pensato per portarti operativo
> in 5 minuti senza fare domande al PM.
>
> **Ordine di lettura**: §1 → §2 → §3 → §4 → §6 (metodologia) → §7 (cose
> comuni). Le altre sezioni come riferimento mirato.
>
> **Quando questo file è stato scritto e perché**: la memoria della
> sessione precedente si stava saturando (sintomi: tool che non si
> caricano, ripetizioni, perdita del filo) — oltre il ~50% di contesto le
> prestazioni degradano. Razionale completo: `nove-c-kit` PLAYBOOK §32.5.
>
> **È intenzionalmente ridondante** rispetto a `CLAUDE.md` + `PLAYBOOK.md`
> del kit. Tu come next-Claude leggerai solo questo + `README.md` +
> `CLAUDE.md`, non navigherai il kit. Quindi l'auto-contenimento è feature,
> non duplicazione.

---

## 1. Cosa fare nei primi 60 secondi

Sanity checks per assicurarti che ambiente + servizi siano vivi. Sostituisci
coi comandi specifici di questo progetto.

```bash
# 1. Stato git + ultimi commit
git status
git log --oneline -5

# 2. Leggi le regole critiche del progetto (personalizzazione dell'AGENT_BOOTSTRAP)
cat CLAUDE.md

# 3. Leggi il backlog corrente
head -80 <BACKLOG_FILE>.md         # es. NEXT_RELEASE.md / TODO.md / PROJECT_STATE.md

# 4. Smoke test dei servizi vivi
curl -sI <PROD_URL> | grep -iE "etag|http"
# ... eventuali altri smoke (MCP Worker, API esterna, ecc.)
```

Se tutto passa, sei pronto. Apri la sessione col PM chiedendo brevemente
cosa serve oggi — vedi §5 per il suo stile di comunicazione.

---

## 2. Cos'è il progetto

> 1-2 paragrafi. Spiega chi sei e cosa fa l'app.

- **Cosa fa**: &lt;una frase sul valore per l'utente finale&gt;
- **Per chi**: &lt;utente target, contesto d'uso, dispositivo principale&gt;
- **Stack runtime**:
  - Frontend: &lt;es. `index.html` vanilla su Netlify&gt;
  - Backend dati: &lt;es. Supabase Postgres EU-West, free tier&gt;
  - MCP / edge (se presente): &lt;es. Cloudflare Worker con OAuth 2.1 + DCR&gt;
  - Niente bundler / build / framework (default Nove C, PLAYBOOK §12)
- **Dominio**: &lt;entità principali + vocabolario + flow tipici&gt;

---

## 3. Stato attuale

> Aggiorna a ogni merge su `main`. È la sezione più "viva" di questo file.

- **Versione live**: &lt;vX.Y.Z&gt; (&lt;data&gt;)
- **Cosa funziona oggi** (3-5 bullet sulle capability principali end-to-end):
  - &lt;capability 1&gt;
  - &lt;capability 2&gt;
- **Cose aperte nel backlog** (3-5 voci, con codici progressivi se ci sono):
  - **&lt;CODE&gt;** &lt;nome breve&gt; — &lt;1 riga di stato&gt;
- **Recentemente chiuso** (ultimo batch di release, per capire il
  momentum):
  - &lt;vX.Y.Z&gt; — &lt;cosa è entrato&gt;

---

## 4. Infrastruttura & account

### 4.1 Repository
- **GitHub**: `<owner>/<repo>` (private/public)
- **Branch dev**: `<branch>` — qui sviluppi tu, non il PM
- **Branch prod**: `main` — merge solo via PR squash; auto-deploy hosting da qui
- **Auto-delete head branches**: ON (vedi `nove-c-kit/CHANGELOG.md` v1.2)

### 4.2 Hosting frontend
- **URL prod**: `<https://...>`
- **Provider**: &lt;Netlify / Cloudflare Pages / Vercel / ...&gt; — &lt;plan&gt;
- **Auto-deploy**: da branch `main`, ogni push
- **Quirks noti**: &lt;es. webhook che a volte non triggera; fix: commit no-op&gt;

### 4.3 Backend dati
- **Provider**: &lt;Supabase / Neon / ...&gt;
- **Project**: `<nome>` (URL: `<https://....supabase.co>`)
- **Region**: &lt;eu-west-1 / ...&gt;
- **Plan**: &lt;free / pro / ...&gt; — ⚠️ note su limiti (vedi `nove-c-kit` §12)
- **Tabelle principali**: &lt;lista&gt;
- **Feature disabilitate** e perché: &lt;es. Branching Supabase OFF, GitHub
  integration OFF; le migration le facciamo via workflow §6.5&gt;

### 4.4 MCP / Edge (se presente)
- **URL Worker**: `<https://...workers.dev>`
- **Endpoint MCP**: `/mcp` (richiede OAuth Bearer)
- **KV namespace**: `<nome>` (id `<kv-id-reale-committato>`)
- **Plan**: free tier
- **Auto-deploy**: trigger via `mcp-server/deploy.trigger` (vedi §6.5)

### 4.5 Secrets

| Dove | Nome | Cos'è |
|---|---|---|
| Cloudflare Worker (via `wrangler secret put`) | `SUPABASE_URL` | URL del progetto Supabase (= 4.3) |
| | `SUPABASE_SERVICE_KEY` | service_role key (RLS-bypass, server-only) |
| | `MCP_AUTH_TOKEN` | password di consent UI |
| GitHub Actions (Settings → Secrets) | `SUPABASE_DB_PASSWORD` | password DB per psql (workflow sql-ops) |
| | `CLOUDFLARE_API_TOKEN` | token wrangler ("Edit Cloudflare Workers") |
| | `CLOUDFLARE_ACCOUNT_ID` | account Cloudflare del PM |

**Regole hard sui secret**:
- ❌ MAI committare uno di questi nel codice.
- ❌ MAI loggare nemmeno parzialmente (lunghezza/head/tail OK per debug
  temporaneo, ma poi togli il debug).
- I secret di runtime del Worker sono **persistenti**: `wrangler deploy`
  NON li tocca, non vanno reimpostati a ogni deploy (vedi `nove-c-kit`
  PLAYBOOK §35 Esempio B).

---

## 5. Profilo del PM — come comunica e cosa si aspetta

> Sezione fondamentale. Sintesi da `AGENT_BOOTSTRAP "Profilo del PM"` +
> `PLAYBOOK §36` del kit, arricchita dall'esperienza di questo progetto.
> **Non skipparla**: il modo giusto di comunicare con lui ti risparmia ore.

### 5.1 Lingua e tono
- **Italiano** sempre (commit, PR, chat).
- Tono **diretto** — niente filler, niente servilismo. Se ha ragione lui:
  riconoscilo subito (*"hai ragione, ritiro la diagnosi"*).
- Se proponi qualcosa: **perché** prima del **come**.

### 5.2 Background del PM
- &lt;Es. Daniel Carta — termotecnica + BIM, non-developer di mestiere.&gt;
- **Pensa come ingegnere/macchina** (architetture, vincoli, costi).
- **NON legge il dettaglio del codice** (diff, log, stack-trace).
- Confidenza **architetturale/sistemica** alta; dettaglio implementativo basso.

### 5.3 Modalità di interazione
- **Normale** (default): risposte ragionate, opzioni proposte, attese di
  conferma per cose grosse.
- **Caveman** (quando lo dichiara esplicitamente): risposte brevissime, per
  ogni bug/feature segnalata → `"Ok annotato"` + voce in backlog + push.
  Niente implementazioni finché non te lo chiede. **Eccezione**: bug grave
  (corruzione dati/leak) → esci da caveman dichiarandolo.
- **Notte autonoma** (vedi `nove-c-kit` PLAYBOOK §24 + §35): lavora di
  notte sul backlog small, lascia report al risveglio (vedi §7.7).

### 5.4 Cosa ama / odia
- ❤️ **Automazione** via workflow Actions (vedi §6.5).
- ❤️ **Fix subito di bug critici** anche fuori dal piano.
- ❤️ **Decisioni dichiarate**: *"ho scelto X perché Y, scartata Z"*.
- ❌ **Verbosità inutile** (5 paragrafi quando bastano 3 righe → te lo dice).
- ❌ **Domande tecniche sul "come"** (encoding, algoritmo, lato git):
  default decidi da senior. Vedi `nove-c-kit` PLAYBOOK §36 rule 4.
- ❌ **Pre-implementare feature grosse** senza approvazione.

### 5.5 Lavoro mobile
- Spesso lavora da **iPhone**: non può aprire URL, zip, eseguire comandi.
- Se gira file SharePoint/Drive: 403 quasi sempre → chiedi di incollare il
  contenuto in chat.
- Risposte calibrate corte di default.

### 5.6 Quando chiedere — tecnica "3 interpretazioni con stima"
Se l'ambiguità è di **prodotto** (scope/costo/UX) → NON chiedere a domanda
aperta. Presenta 2-3 interpretazioni con stima oraria. Vedi `nove-c-kit`
EXAMPLES.md §4 + PLAYBOOK §32.1.

---

## 6. Metodologia — come lavoriamo in questo progetto

Sintesi delle parti operative. Razionale completo:
[`nove-c-kit` PLAYBOOK Parte D](https://github.com/danielcarta9c/nove-c-kit/blob/main/PLAYBOOK.md).

### 6.1 Versioning
| Livello | Esempio | Cos'è | Effort tipico |
|---|---|---|---|
| **patch** | vX.Y.Z | Bug fix mirato | 1-2h |
| **minor** | vX.Y | Piccola feature o batch | 1-2 giorni |
| **major** | vX.0 | Refactor / new infra | weekend dedicato |

### 6.2 Backlog discipline (`<BACKLOG_FILE>.md`)
Ogni segnalazione del PM ha un **codice progressivo** (`F#`, `BUG-XXX`,
`MJ#`). Format voce:

```markdown
### F9. Nome breve (data)
**Cosa fa**: 1-2 frasi
**Causa/contesto** (se bug): perché succede
**Fix proposto**: approccio
**File**: file/funzioni coinvolte
**Effort**: stima onesta
**Decisioni aperte**: cose che richiedono input del PM
```

Marca ✅ DONE inline quando rilasciato. **Non cancellare** — lascialo
barrato per la storia (mini-ADR cronologici).

### 6.3 Git workflow
```
dev branch <branch>
  ↓ commit con messaggi italiani descrittivi
  ↓ push
crea PR → main (squash) via mcp__github__create_pull_request
  ↓ merge squash via mcp__github__merge_pull_request
main → hosting auto-deploy (1-2 min)
```

**Convenzione commit/PR**:
- Titolo: `<area>: <verbo> <cosa>`
- Body: cosa è cambiato e perché
- **Non firmare con nome Claude** (il PM sa che sei tu).
- Stop hook git warning su "commit unverified": **ignoralo**, mai
  `--amend --reset-author`.

**Se git push fallisce con 403** (workflow_dispatch bloccato dal sandbox):
**MAI cercare workaround API** — usa il **pattern trigger-file** (`nove-c-kit`
PLAYBOOK §35 + AGENT_BOOTSTRAP regola #14).

### 6.4 Test discipline
**N suite** con ~M assertion totali (aggiorna se cambia):

| Suite | File | Cosa testa | Quando girarla |
|---|---|---|---|
| **e2e** | `test-e2e.mjs` | workflow desktop+mobile | Prima di ogni release |
| **cloud** | `test-cloud.mjs` | sync engine con mock | Quando tocchi save engine |
| **cloud-stress** | `test-cloud-stress.mjs` | race, drag touch, payload | Quando tocchi UX-critical |

**Regole hard sui test**:
- ❌ **MAI** scritture reali al DB nei test. Tutto mockato via `bootCloud`
  o equivalente.
- ❌ **MAI** mergiare con test rossi (se una semantica cambia
  intenzionalmente → aggiorna il test e commenta perché).
- Naming nuovi test: `<CODE>_NN` (es. `F4_01`, `BUG-FILT_03`).

**Comando rapido**:
```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node test-e2e.mjs 2>&1 | tail -3
```

### 6.5 Automazione operativa (pattern nove-c-kit §35)

Il PM **non vuole eseguire psql/wrangler manualmente**. Per ogni
operazione cloud, abbiamo workflow GitHub Actions self-triggered da un
**trigger-file**.

**Trigger-file pattern** — perché esiste: il Claude nel sandbox NON ha il
permesso `workflow_dispatch` (sintomo: HTTP 403 se tenta dispatch via
API). Soluzione: committi un file dedicato, il workflow parte via
`on: push: paths`. Vedi `nove-c-kit` PLAYBOOK §35 + AGENT_BOOTSTRAP regola
#14.

**Eseguire SQL su DB**:
```bash
# 1. Scrivi lo script in sql/ops/<nome>.sql
# 2. Punta il trigger-file allo script
echo "sql/ops/<nome>.sql" > ops/run-sql.txt
# 3. Commit + push (o via mcp__github__create_or_update_file)
# Il workflow .github/workflows/sql-ops.yml parte da solo
# e auto-committa il log in sql/ops/out/
```

**Pitfall psql noti** (vedi anche `nove-c-kit` PLAYBOOK §35 Esempio A):
- Host pooler: `aws-<N>-<region>.pooler.supabase.com` (verifica il numero,
  cambia per region)
- User: `postgres.<project-ref>`
- `-v ON_ERROR_STOP=1` **obbligatorio** (senza, mezza migrazione applicata
  in silenzio)

**Deployare Worker MCP**: cambia un commento in `mcp-server/deploy.trigger`
+ push. Il workflow `.github/workflows/deploy-mcp.yml` fa il resto.

**Migration SQL** (CREATE TABLE / ALTER TABLE):
1. Scrivi `supabase/0N-NOME.sql` (idempotente, `IF NOT EXISTS`, mai DROP).
2. Per nuove tabelle: **GRANT espliciti** per `authenticated` + `service_role`
   (vedi `nove-c-kit` PLAYBOOK §3b — breaking change Supabase 2026).
3. **Mostra lo script al PM** prima di eseguirlo.
4. Se OK: aggiorna `ops/run-sql.txt` → push → workflow gira.

### 6.6 Code anti-pattern emersi su questo progetto

I top 5 (per gli anti-pattern Nove C trasversali vedi `nove-c-kit`
PLAYBOOK §11):

1. **&lt;Anti-pattern 1 specifico del progetto&gt;** — sintomo, causa, fix
   (con `file:riga` di riferimento).
2. &lt;...&gt;

### 6.7 Quirks della comunicazione automatica
- **System reminders** su file modificati che NON hai toccato (es.
  `ops/run-sql.txt`): NON revertarli — sono modifiche intenzionali (PM o
  workflow auto-commit).
- **Task notifications** da monitor background: NON sono messaggi del PM,
  continua il lavoro.
- **Stop hook git warning** "commit unverified": ignoralo (i commit del PM
  o `ci-bot` sono giusti).

---

## 7. Sezione operativa — come fare le cose comuni

### 7.1 PM ti segnala un bug
- **Caveman mode**: `"Ok annotato"` + voce in `<BACKLOG_FILE>.md` con
  codice progressivo + commit + push, fine.
- **Modalità normale**: chiedi 1-2 chiarimenti se servono decisioni
  (tecnica "3 interpretazioni con stima", vedi §5.6), poi annota.
- **Bug GRAVE** (corruzione dati / perdita / leak): esci da caveman,
  annuncialo, investiga subito (vedi §7.6).

### 7.2 PM ti chiede una feature
1. Chiedi 1-2 cose se ci sono decisioni aperte (tecnica "3 interpretazioni").
2. Annota in `<BACKLOG_FILE>.md`.
3. **Piccola** (≤ 1h): implementa subito previa conferma.
4. **Grossa**: aspetta il go esplicito (*"procediamo"*).

### 7.3 Implementare una feature (workflow standard)
1. Branch dev `<branch>` (sei già lì).
2. Codifica + aggiungi test mirato.
3. **Verifica sintassi** (es. `node -e "..."` su un blocco JS).
4. **Regressione completa** (N suite, ~3-5 min).
5. Se verde: commit con messaggio italiano descrittivo.
6. Push.
7. Crea PR via `mcp__github__create_pull_request` (body strutturato).
8. Merge squash via `mcp__github__merge_pull_request`.
9. Verifica deploy (1-2 min): `curl` per marker nuovo.
10. Se non deploya: commit no-op su `CLAUDE.md` (se il provider lo richiede).
11. Aggiorna `<BACKLOG_FILE>.md` marcando ✅ DONE.

### 7.4 Far girare SQL
Vedi §6.5. **Mai SQL Editor manuale** — il PM lo fa malvolentieri.

### 7.5 Deploy MCP / Worker
Vedi §6.5. Self-healing tramite Cloudflare API.

### 7.6 Investigare un bug
1. **Mai presumere**: leggi il codice del path coinvolto.
2. Se il PM ti dà screenshot: leggilo (timestamps, valori, marker errore).
3. **Audit log** (se presente) è la prova vera delle scritture cloud.
4. Distingui: bug app / bug MCP / bug infra (provider outage, Cloudflare
   500) / bug PM (cache stale, tab vecchia).
5. **Diagnosi PRIMA del fix**: comunica la causa al PM prima di iniziare il
   fix se non è banale.
6. Fix → test mirato di regressione → tutto verde → merge.

### 7.7 Notte autonoma
Quando il PM dice *"fai i test e procedi autonomo"* (vedi `nove-c-kit`
PLAYBOOK §24):
1. Esegui regressione completa.
2. Attacca task con stima `≤ 2h` che NON richiedono decisioni.
3. Test, commit, merge se verde.
4. **NON toccare**: feature strutturali, schema changes senza review,
   feature con "decisioni aperte" nel backlog.
5. Lascia un **report `/tmp/REPORT_NIGHT.md`** + `SendUserFile`. Format:
   - TL;DR
   - Cosa fatto
   - Cosa NON fatto + perché
   - Problemi aperti
   - Cosa testare al risveglio

### 7.8 Rilascio minor
1. Tutti i fix in dev branch.
2. Regressione completa verde.
3. PR → main (body strutturato).
4. Merge squash.
5. Verifica deploy (re-trigger se necessario).
6. Aggiorna `<BACKLOG_FILE>.md` (✅ DONE).
7. Smoke test live: `curl` per marker + Playwright headless rapido.
8. Commit di chiusura release.

---

## 8. Pattern di codice da rispettare

I 5-6 pattern critici DI QUESTO progetto. Cita `file:riga`. Per i pattern
Nove C trasversali (markDirty, handleRemoteChange, attachKanDrag, audit
log) vedi `nove-c-kit` PLAYBOOK Parte E + EXAMPLES.md.

1. **&lt;Pattern 1&gt;** (`<file>:<riga>`). 1-2 frasi su cosa fa e perché è non
   negoziabile in questo progetto.
2. &lt;Pattern 2&gt; &lt;...&gt;

---

## 9. Storia & decisioni chiave

> Brevi annotazioni "perché abbiamo fatto così" che evitano di ripercorrere
> strade morte. Sono mini-ADR cronologici. Per ADR formali → `docs/adr/`.

- **&lt;vN.N&gt;** — &lt;cosa è stato deciso&gt;. **Causa**: &lt;perché&gt;.
  **Lezione**: &lt;cosa NON rifare&gt;.
- &lt;...&gt;

---

## 10. Quirks da sapere

> Cose contro-intuitive di questo progetto che richiederebbero ore di
> indagine se non documentate.

- **&lt;Quirk 1&gt;**: &lt;descrizione + cosa fare&gt;.
- &lt;...&gt;

---

## 11. Riferimenti incrociati

| Doc | Quando consultarlo |
|---|---|
| `CLAUDE.md` | Regole critiche del progetto (personalizzazione di `AGENT_BOOTSTRAP` del kit). Leggi sempre prima di toccare prod. |
| `<BACKLOG_FILE>.md` | Backlog corrente, storia delle voci, decisioni aperte |
| `README.md` | Quick start utenti (PM + collaboratori), NON per te Claude |
| `docs/adr/*.md` | Decisioni architetturali formali (immutabili) |
| `supabase/0N-*.sql` | Migration storiche (commentate in testa) |
| `.github/workflows/*.yml` | Workflow di automazione (commentati in testa) |
| `mcp-server/README.md` | Setup operativo MCP Worker |

**Repo correlati**:
- [`danielcarta9c/nove-c-kit`](https://github.com/danielcarta9c/nove-c-kit)
  — pattern Nove C trasversali (PLAYBOOK, AGENT_BOOTSTRAP, EXAMPLES,
  snippets, mcp-template). Quando NON sai una cosa "metodologica", cerca lì.

---

## 12. Cosa NON fare mai (resumé regole hard)

Le regole non negoziabili di questo progetto. Incrocia con
`AGENT_BOOTSTRAP` regole non negoziabili del kit (cioè il tuo `CLAUDE.md`).

1. ❌ MAI scritture reali al DB nei test.
2. ❌ MAI `DROP TABLE` / `TRUNCATE` / `DELETE FROM` senza `WHERE` in prod.
3. ❌ MAI eseguire migration senza mostrarla al PM prima.
4. ❌ MAI committare secrets / API key / DB password.
5. ❌ MAI mutare PK con upsert senza passare per rename safe.
6. ❌ MAI fire-and-forget per scritture cloud (delete incluso).
7. ❌ MAI `confirm()` / `prompt()` nativi su iOS sotto modal.
8. ❌ MAI dispatch workflow Actions via API (HTTP 403 garantito) — usa
   trigger-file (`nove-c-kit` PLAYBOOK §35).
9. ❌ MAI scope creep / drive-by refactor (`nove-c-kit` EXAMPLES.md §1).
10. ❌ MAI falsificare autori di commit storici per "verificarli".
11. ❌ MAI uscire da caveman mode senza dichiarazione esplicita
    (eccetto bug grave).
12. &lt;altre regole specifiche di questo progetto&gt;

---

## Ultimo aggiornamento

&lt;DATA&gt; — &lt;chi&gt; — &lt;cosa è stato aggiornato/cambiato in questo HANDOFF&gt;

> Quando aggiorni questo file: **aggiungi una riga sopra** con data + cosa
> hai cambiato. Non riscrivere a freddo, **evolvi**. Le sezioni più "vive"
> sono §3 (stato attuale), §9 (storia), §10 (quirks).
