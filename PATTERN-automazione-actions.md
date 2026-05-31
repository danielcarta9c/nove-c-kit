# Pattern PM — Automazione operativa via GitHub Actions + auto-commit log

> Pattern Nove C riusabile. Nato nella sessione KB del 2026-05-30, dove ore di
> lavoro sono andate perse in copia-incolla manuale da telefono (SQL su Supabase,
> deploy su Cloudflare, lettura log). Questo documento codifica il modo giusto.

## Il problema che risolve

Quando lavori a un'infra cloud (database, worker, deploy) da un client dove
**l'agente AI non ha le credenziali** (e non deve averle), si finisce a fare da
ponte umano: l'AI scrive il comando, tu lo incolli nella console del provider,
copi il risultato, glielo reincolli. Lento, fragile (caratteri storpiati dal
telefono: `.id`→link, `<=>` rotto), e impossibile di notte/in autonomia.

## L'idea

**Trasformare ogni operazione cloud in un GitHub Actions workflow che:**
1. gira sul runner (che HA i secret, via GitHub Secrets);
2. **auto-committa il proprio output in un file nel repo**;
3. è lanciabile con un click (`workflow_dispatch`) o da solo (`schedule: cron`).

Così l'agente AI:
- prepara/aggiorna il workflow e gli script (commit normale);
- legge i risultati con `git pull` dal file auto-committato — **senza che l'umano
  incolli niente**;
- in caso di errore, lo legge dal log e corregge → ri-lancia → rilegge. Loop.

## Perche' funziona (e i 3 limiti onesti)

**Funziona perche'** i secret restano nel provider (GitHub li inietta come env nel
runner, criptati, mai nel repo), e il repo diventa il canale di ritorno dei
risultati. L'AI non vede mai un segreto, ma puo' orchestrare e leggere esiti.

**Limiti da conoscere (dichiararli sempre):**
1. **Il primo trigger e/o l'attivazione del cron li fa l'umano una volta.** Molti
   client AI non hanno il permesso di "far partire" un workflow: possono scrivere
   codice e PR, non triggerare run. Con il cron attivo, da li' in poi e' autonomo.
2. **Il cron di Actions e' impreciso**: parte con 5-15+ min di ritardo. Per loop
   non presidiati va bene; per "subito" usa il dispatch manuale.
3. **Copre solo cio' che il runner puo' raggiungere coi secret presenti.** Es: il
   DB Postgres (psql) e Cloudflare (wrangler) si', ma sorgenti dietro altre auth
   (un tenant M365 con consensi interattivi) possono restare fuori.

## Setup — credenziali (principio del minimo privilegio)

I secret vanno SOLO in **GitHub → Settings → Secrets and variables → Actions**.
Mai nel repo, nei commit, nei doc, in chat con l'agente. Regola d'oro: **l'agente
puo' GENERARE un valore casuale (es. un token), ma e' l'umano che lo SALVA nel
secret.** Un secret committato e' un secret bruciato.

Identificatori NON segreti (Account ID, KV namespace id, host DB, project ref):
possono stare nel repo / workflow in chiaro. Solo password/token/chiavi sono
segreti.

### Esempio A — SQL su Postgres/Supabase via psql

- Secret: `SUPABASE_DB_PASSWORD` (solo la password; host/user/db nel workflow).
- Usare la connessione **Session/Shared Pooler IPv4, porta 5432** (il transaction
  pooler 6543 NON fa girare VACUUM; la direct IPv6 spesso non e' raggiungibile
  dal runner).
- Passare la password come env `PGPASSWORD` **separata** (non dentro un URL): cosi
  i caratteri speciali NON vanno url-encoded.
- `psql -v ON_ERROR_STOP=1 -f script.sql` (niente `--single-transaction`: VACUUM e
  `CREATE INDEX CONCURRENTLY` non possono girare in una transazione).
- Lo script SQL e' un **file versionato** nel repo (es. `sql/ops/*.sql`), non
  testo incollato. Riusabile, rivedibile, diff-abile.

### Esempio B — Deploy Cloudflare Worker via wrangler

- Secret: `CLOUDFLARE_API_TOKEN` (token custom, template **"Edit Cloudflare
  Workers"** → permessi Account: *Workers Scripts: Edit*, *Workers KV Storage:
  Edit*, *Account Settings: Read*; Account Resources = il tuo account; nessun
  Client IP filter perche' l'IP del runner cambia). Le API Cloudflare sono
  **gratis** sul piano free; il deploy non aggiunge costi (Worker gia' nel free
  tier: 100k req/giorno).
- `CLOUDFLARE_ACCOUNT_ID` (NON segreto, ma comodo come secret/var) come env
  `CLOUDFLARE_ACCOUNT_ID` per wrangler.
- I **secret del Worker** (`wrangler secret put ...`) sono persistenti sul Worker:
  un `wrangler deploy` NON li cancella. Non vanno reimpostati a ogni deploy.
- ATTENZIONE allo stato non versionato: se hai editato `wrangler.toml` a mano
  (es. KV namespace `id`) e NON l'hai committato, il repo ha un placeholder e il
  deploy da CI si aggancia al KV sbagliato (→ utenti OAuth perdono il consenso).
  Mettere l'id reale nel `wrangler.toml` committato PRIMA di deployare da CI.

## Schema del workflow (scheletro)

```yaml
on:
  workflow_dispatch:          # un click
  # schedule: [{cron: "*/15 * * * *"}]   # loop autonomo (impreciso)
permissions:
  contents: write             # per auto-commit del log
concurrency: { group: <nome>, cancel-in-progress: false }
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4   # ref: main
      - name: Esegui e cattura
        env: { SEGRETO: ${{ secrets.SEGRETO }} }
        run: |
          set +e
          mkdir -p out; OUT="out/$(date -u +%Y%m%dT%H%M%SZ).log"
          <comando> > "$OUT" 2>&1
          echo "# exit_code: $?" >> "$OUT"; cat "$OUT"
      - name: Auto-commit log
        if: always()
        working-directory: .    # se il job ha un default working-directory!
        run: |
          git config user.name "kb-bot"
          git config user.email "kb-bot@users.noreply.github.com"
          git add out/ && git commit -m "chore(log): ... [skip ci]" || true
          git push origin main
```

Note dure imparate sul campo:
- `working-directory: .` sullo step di commit se il job ne ha uno di default
  (altrimenti il path raddoppia: `mcp-server/mcp-server/out/`).
- `[skip ci]` nel messaggio per non innescare altri workflow a catena.
- `if: always()` cosi il log si committa anche quando il comando fallisce
  (l'errore e' proprio cio' che vuoi leggere).
- `set +e` + cattura dell'exit code: non far fallire lo step prima di salvare.

## Verificare la catena PRIMA di fidartene (trigger on:push)

Non dare per scontato che l'auto-commit funzioni: testalo end-to-end con un
workflow usa-e-getta che parte **subito** al push. Nella sessione KB la prima
verifica ha avuto successo in **~15 secondi**; in un primo tentativo precedente
un bug di path (`working-directory`) faceva fallire proprio il commit del log —
motivo in piu' per testare.

Perche' `on: push` e non il cron per testare:
- `on: push` fa partire il workflow **all'istante**; il `cron` ha 5-15+ min di
  latenza ed e' inaffidabile per una verifica rapida.
- Il push del bot via `GITHUB_TOKEN` **non ri-triggera** altri workflow (e con
  `[skip ci]` nel messaggio sei doppiamente al sicuro): nessun loop infinito.

Workflow di self-test completo (`.github/workflows/selftest-autolog.yml`):

```yaml
name: selftest autolog
# Parte SUBITO al push di questo file. Scrive un file e lo auto-committa.
# Prova che la catena commit-da-CI funziona. Usa e getta: rimuovi dopo la verifica.
on:
  push:
    paths:
      - ".github/workflows/selftest-autolog.yml"
permissions:
  contents: write
concurrency: { group: selftest-autolog, cancel-in-progress: false }
jobs:
  selftest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: main }
      - name: Scrivi e auto-committa un log di prova
        run: |
          set -e
          mkdir -p ops/out/selftest
          TS=$(date -u +%Y%m%dT%H%M%SZ); OUT="ops/out/selftest/${TS}.txt"
          echo "selftest OK @ ${TS} UTC — se leggi questo nel repo, l'auto-commit funziona." > "$OUT"
          cat "$OUT"
          git config user.name "ci-bot"
          git config user.email "ci-bot@users.noreply.github.com"
          git add ops/out/selftest/
          git commit -m "chore(selftest): auto-commit log OK ${TS} [skip ci]"
          git push origin main
```

Verifica dopo il push: `git fetch && git log origin/main` deve mostrare il commit
di `ci-bot`; `cat` del file ne prova il contenuto. Poi **rimuovi** il workflow di
test (e la cartella `ops/out/selftest/`) con un commit dedicato.

## Quando NON usarlo

- Operazione una tantum, sei gia' al PC col tool a portata: fallo e basta.
- Serve interazione umana nel mezzo (conferme, MFA): l'automazione non aiuta.
- Anti-overengineering (PLAYBOOK §13): non incartare in un workflow cio' che fai
  una volta sola in 10 secondi.

## Lezione meta (perche' e' in PM e non solo nei doc tecnici)

Nella sessione KB ci siamo accorti TARDI che questo pattern era possibile. Avrebbe
permesso di diagnosticare in autonomia (di notte, senza presidio) i crash di
ingestion, invece di incollare log a mano per ore. **Prima di accettare un loop
umano-AI di copia-incolla, chiediti: posso trasformarlo in workflow + auto-commit
log?** Se si', fallo subito: il costo di setup si ripaga al secondo giro.
