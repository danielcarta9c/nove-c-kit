# templates

Skeleton dei documenti **vivi** da copiare in un nuovo progetto Nove C.
Sono i due doc con una struttura riusabile concreta; gli altri doc descritti
nel `PLAYBOOK.md` (ARCHITECTURE, USER_GUIDE, ROADMAP, RUNBOOK) sono prosa
specifica del progetto e non hanno uno scheletro che valga la pena committare.

| File | Copialo come | Riferimento PLAYBOOK |
|------|--------------|----------------------|
| `PROJECT_STATE.md` | `PROJECT_STATE.md` (root del nuovo repo) | §16 + §32 |
| `adr-template.md` | `docs/adr/000N-<slug>.md` | §18 |
| `HANDOFF.md` | `HANDOFF.md` (root del repo, a fine sessione satura) | §32.5 |

> Il template di `CLAUDE.md` non sta qui: è `AGENT_BOOTSTRAP.md` nella root del
> kit (la "lettera al Claude della prima sessione", da copiare e personalizzare).

## Come usarli

1. Copia il file nel nuovo repo al path indicato sopra.
2. Sostituisci `<nome-progetto>` e i `<placeholder>`.
3. `PROJECT_STATE.md` è l'unico che poi cambia a ogni commit — gli altri doc
   crescono più lentamente.
