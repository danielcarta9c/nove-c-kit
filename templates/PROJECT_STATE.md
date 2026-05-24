# PROJECT_STATE — &lt;nome-progetto&gt;

> Stato **VIVO** del progetto: cambia a ogni commit. È la single source of truth
> di "a che punto siamo *oggi*". Regole (PLAYBOOK §16): "Now" max 3 voci, "Next"
> ordinato per priorità reale, "Done log" tiene l'hash del commit (cliccabile da
> GitHub). Niente burndown, niente velocity, niente story point.

## Ambienti live

> Stato operativo **cloud**, NON codice. Se tocchi l'infra fuori dal repo (deploy,
> dominio, secret ruotata, servizio collegato, collaboratore, branch di deploy),
> aggiorna QUI nella stessa sessione. Mai il valore delle secret — solo "dove
> vivono". Vedi PLAYBOOK §32.

| Componente   | URL pubblico | Provider   | Account | Branch/ambiente | Plan | Secrets (dove) | Note |
|--------------|--------------|------------|---------|-----------------|------|----------------|------|
| Frontend     | —            | Netlify    | —       | —               | —    | —              | —    |
| Backend dati | —            | Supabase   | —       | —               | —    | —              | —    |
| MCP Worker   | —            | Cloudflare | —       | —               | —    | —              | —    |
| Repo         | —            | GitHub     | —       | —               | —    | —              | —    |

## Now (in corso) — max 3 voci

- [ ] task corrente — 1-2 righe di contesto
- ❓ eventuale domanda aperta in attesa di risposta del PM

## Next (backlog ordinato per priorità)

1. ⭐ task ad alta priorità — 1 riga
2. task — 1 riga

## Done log (anti-cronologico, ultimo in cima)

| Commit     | Cosa                          |
|------------|-------------------------------|
| `0000000`  | chore: bootstrap progetto     |
