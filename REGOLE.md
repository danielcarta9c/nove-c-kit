# REGOLE — questo repo è PUBBLICO

Prima di ogni commit/PR su `nove-c-kit`, triple-check.

## MAI committare

1. **Secret di qualsiasi tipo**: chiavi Supabase (`sb_secret_*`, `sb_publishable_*`,
   legacy `service_role`/`anon`), token Cloudflare, password, API key di
   terze parti. Anche commentate, anche "di test", anche scadute.
2. **URL infrastruttura reale**: Project URL Supabase di clienti, Worker
   URL `*.workers.dev` di progetti vivi, endpoint Netlify produzione.
3. **Nomi cliente o dominio commerciale**: "Scadenzario", "Studio Carta",
   "CRM Nove C". Usa `<nome-progetto>` come placeholder.
4. **Nomi tabella dominio-specifici**: `clienti`, `adempimenti`, `trattative`,
   `fatture`. Usa `entity_a`, `entity_b`, o `<entity>` come placeholder.
5. **UUID reali di workspace, utenti, record**. Solo placeholder leggibili
   (`00000000-0000-0000-0000-000000000001` è esplicitamente un esempio
   universale, OK).
6. **Schema SQL completo di un progetto reale**. Solo pezzi trasversali
   (audit_log, soft_delete, RLS pattern, workspaces, workspace_members).

## SÌ committare

- Pattern di codice generici (markDirty, handleRemoteChange, attachKanDrag).
- Template parametrizzati con `<placeholder>` chiari.
- Documentazione "come/perché" che insegna il pattern senza esporre
  l'implementazione cliente.
- Esempi fittizi che mostrano la *forma* del codice, non la sostanza.

## Workflow di promozione "progetto-vivo → kit"

Un pattern NUOVO non nasce qui. Nasce nel repo di un progetto reale
(Scadenzario, CRM, futuri), matura 1-2 sprint in produzione, **poi** viene
promosso al kit:

1. Apri issue qui: `feat: promote <pattern>` con link al codice originale.
2. Sterilizza: rimuovi tutto quello che è in lista "MAI" sopra.
3. Parametrizza i nomi: `<nome-progetto>`, `<entity>`, ecc.
4. Aggiungi 5-10 righe di doc su quando usarlo e perché.
5. PR + review + merge + tag nuova versione (se è API change).

L'inverso è proibito: NON sviluppare pattern direttamente qui senza un
caso di studio in produzione. Roba non testata fa danni in chi la copia.

## Check rapido pre-PR

```bash
# Cerca secret tipici
git diff --staged | grep -iE "sb_secret|sb_publishable|service_role|eyJhbG"

# Cerca URL infrastruttura
git diff --staged | grep -iE "supabase\.co|workers\.dev|netlify\.app"

# Cerca nomi progetti
git diff --staged | grep -iE "scadenzario|studio.?carta|nove.?c.?crm"
```

Se uno qualsiasi di questi grep ritorna qualcosa che non è in REGOLE.md o in
commenti che dicono esplicitamente "esempio fittizio", **non pushare**.
