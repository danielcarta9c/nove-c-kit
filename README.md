# nove-c-kit

Starter kit pubblico Nove C. Pattern e snippet **trasversali**,
riusabili in qualsiasi web-app o SaaS leggero costruito con la metodologia
Nove C (vanilla JS + Supabase + Cloudflare Workers).

Nasce come "figlio" del primo prodotto reale Nove C (lo Scadenzario): metodo,
architetture e pezzi di codice buoni maturati lì — più le cose nuove che
impariamo strada facendo — sono stati estratti qui, su un repo pubblico, per
partire da un setup di metodo già pronto in qualsiasi nuovo progetto. Il cuore
è il [`PLAYBOOK.md`](PLAYBOOK.md), il documento "Costituzione" della metodologia
Nove C; lo Scadenzario resta il caso di studio in produzione.

## Cosa c'è dentro

```
PLAYBOOK.md         Metodologia, stack di default, pattern Nove C. Il documento
                    "Costituzione": leggilo per intero a inizio progetto.
AGENT_BOOTSTRAP.md  Lettera al Claude della prima sessione. Da copiare come
                    CLAUDE.md nel nuovo progetto e personalizzare.
REGOLE.md           Regole di igiene di QUESTO repo pubblico (mai secret, mai
                    nomi cliente). Da leggere prima di ogni PR sul kit.
templates/          Skeleton dei doc "vivi" da copiare nel nuovo progetto
                    (PROJECT_STATE.md, formato ADR).
mcp-template/       Scheletro Worker MCP custom (OAuth 2.1 + DCR) per Claude
                    web/mobile/desktop. Pronto da clonare in un nuovo progetto.
snippets/           Frammenti di codice testati in produzione (sync, audit log,
                    drag&drop touch, RLS multi-tenant, test harness Playwright).
```

## Bootstrap di un nuovo progetto (per Claude Code)

Se sei un Claude che apre la prima sessione di un nuovo prodotto Nove C, parti
da **[`AGENT_BOOTSTRAP.md`](AGENT_BOOTSTRAP.md)**: è la "lettera alla prima
sessione" e ti orchestra tutto — cosa leggere (il `PLAYBOOK.md`), quali domande
fare al PM, quali file creare nei giorni 1-3 e quali pezzi copiare da qui
(`templates/`, `snippets/`, `mcp-template/`). In pratica: copia
`AGENT_BOOTSTRAP.md` come `CLAUDE.md` nel nuovo repo, personalizzalo, e parti da lì.

## Come usarlo

**Copia, non importare.** Ogni progetto Nove C deve restare autonomo: niente
dipendenze NPM verso questo repo, niente git submodule. Apri il file che ti
serve, copia il codice, adattalo al tuo dominio.

### MCP server in un nuovo progetto

```bash
# 1. Crea sottocartella nel TUO repo (NON dentro nove-c-kit)
mkdir mio-progetto/mcp-server && cd mio-progetto/mcp-server

# 2. Copia i file template
cp -r /path/al/nove-c-kit/mcp-template/* .

# 3. Rinomina nei file: <nome-progetto> → mio-progetto
#    (worker.mjs, mcp-dispatcher.mjs, wrangler.toml, package.json, README.md)

# 4. Implementa i tuoi tool in tools.example.mjs → tools.mjs
#    (e la tua factory client in client-factory.example.mjs → client.mjs)

# 5. Setup e deploy
npm install
npx wrangler login
npx wrangler kv namespace create OAUTH_KV    # incolla l'id in wrangler.toml
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put MCP_AUTH_TOKEN
npx wrangler deploy
```

Dettagli + gotcha: [`mcp-template/README.md`](mcp-template/README.md).

### Snippet (sync, audit, drag, test)

Apri [`snippets/`](snippets/), trova quello che ti serve, copialo nel tuo
`index.html` (o equivalente) e adattalo ai nomi delle tue entità.

## Versioning

Il repo è taggato (`v1` = primo caricamento dei file su `main`). Quando copi
qualcosa nel tuo progetto **annota da quale versione/commit l'hai preso**
(es. nel commit: `// adapted from nove-c-kit v1`). Se in futuro esce un tag
nuovo, decidi tu se aggiornare — qui non ci sono breaking-change automatici
per chi ha già copiato.

## Regole non negoziabili

Vedi [REGOLE.md](REGOLE.md). TL;DR: questo è un repo **pubblico**, MAI
secret, MAI nomi cliente, MAI schema dominio-specifico. Triple-check ogni PR.

## Licenza

MIT. Vedi [LICENSE](LICENSE). Usalo liberamente, attribuzione gradita.
