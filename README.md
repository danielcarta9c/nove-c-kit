# nove-c-kit

Starter kit pubblico Nove C. Pattern e snippet **trasversali**,
riusabili in qualsiasi web-app o SaaS leggero costruito con la metodologia
Nove C (vanilla JS + Supabase + Cloudflare Workers).

È il complemento del [`PLAYBOOK.md`](https://github.com/danielcarta9c/ScadenzarioCommercialisti/blob/main/docs/PLAYBOOK.md)
(che vive nel repo Scadenzario, perché il playbook racconta *come si lavora*
e il primo prodotto reale ne è il caso di studio).

## Cosa c'è dentro

```
mcp-template/   Scheletro Worker MCP custom (OAuth 2.1 + DCR) per Claude
                web/mobile/desktop. Pronto da clonare in un nuovo progetto.
snippets/       Frammenti di codice testati in produzione (sync, audit log,
                drag&drop touch, RLS multi-tenant, test harness Playwright).
```

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

Tag semver: `v1`, `v1.1`, `v2`. Nel tuo progetto **fissa una versione**
quando copi (es. nota nel commit: `// adapted from nove-c-kit v1`). Quando
esce `v2` decidi tu se aggiornare — questo repo non ha breaking-change
automatici per chi ha già copiato.

## Regole non negoziabili

Vedi [REGOLE.md](REGOLE.md). TL;DR: questo è un repo **pubblico**, MAI
secret, MAI nomi cliente, MAI schema dominio-specifico. Triple-check ogni PR.

## Licenza

MIT. Vedi [LICENSE](LICENSE). Usalo liberamente, attribuzione gradita.
