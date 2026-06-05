# HANDOFF — &lt;NOME_PROGETTO&gt; · &lt;DATA&gt;

> ⛔ **STOP. Questo file NON è un riassunto del progetto.** È un **cancello
> di lettura**: il tuo job come next-Claude è leggere TUTTI i doc del
> progetto + del kit nell'ordine sotto, PRIMA di toccare codice. Se salti,
> parti cieco e rifai gli errori delle sessioni precedenti.
>
> Il tempo speso a leggere è sempre meno del tempo speso a rifare lavoro
> sbagliato. Razionale completo: `nove-c-kit` PLAYBOOK §32.5.

---

## 1. Reading order obbligatorio

Leggi nell'ordine. **Non skippare** anche se "ti sembra" di sapere già.

| # | File | Cosa ci trovi | Perché in questo ordine |
|---|---|---|---|
| 1 | `CLAUDE.md` | Regole non negoziabili del progetto (personalizzazione di `AGENT_BOOTSTRAP` del kit) | I vincoli hard PRIMA del codice |
| 2 | `README.md` | Cosa fa l'app, setup base | Capisci il prodotto |
| 3 | `<BACKLOG>.md` (es. `NEXT_RELEASE.md` / `PROJECT_STATE.md`) | Backlog corrente | Sai cosa c'è in coda |
| 4 | `docs/ARCHITECTURE.md` | Topologia, stack, riferimenti ADR | Modello mentale del sistema |
| 5 | `docs/adr/000N-*.md` (in ordine cronologico) | Decisioni architetturali immutabili | Capisci **perché** certe scelte sono come sono |
| 6 | [`nove-c-kit` PLAYBOOK](https://github.com/danielcarta9c/nove-c-kit/blob/main/PLAYBOOK.md) | Metodologia + pattern Nove C trasversali | Linguaggio comune del kit |
| 7 | [`nove-c-kit` EXAMPLES](https://github.com/danielcarta9c/nove-c-kit/blob/main/EXAMPLES.md) | Diff ❌/✅ code-level | Vedi i pattern in azione |
| 8 | `mcp-server/README.md` (se presente) | Setup operativo MCP | Per le ops MCP |
| 9 | **QUESTO file §2 in poi** | Stato/delta della sessione precedente | Dopo che hai il contesto |

> NB: leggi i punti 1-8 PRIMA del §2 sotto. Il §2 dà per scontato che tu
> abbia già il contesto sopra. Se cominci a leggere §2 senza aver fatto
> 1-8, le sentinel checks ti smaschereranno.

---

## 2. Sentinel checks — verifica che hai letto

Prima di toccare codice, rispondi a queste 5 domande (mentalmente; o
esplicitamente al PM se la sessione è *"riprendiamo da dove eravamo"*). Se
non sai rispondere, **NON HAI LETTO ABBASTANZA** → torna a §1.

1. **Profilo del PM**: come comunica? Cosa NON gli si chiede mai (tipo di
   decisione tecnica)? Quando esce dalla "caveman mode"?
   *Risposta da `CLAUDE.md` + `nove-c-kit` PLAYBOOK §36.*

2. **Stack & infra**: cosa gira dove, con quale provider e quale plan?
   Dove vivono i secrets? Perché la `service_role` key sta SOLO nel
   Worker?
   *Risposta da `CLAUDE.md` "Stack" + ADR 0001-stack + `nove-c-kit` §12.*

3. **Le 3 regole hard più pericolose** di questo progetto: quali sono e
   perché esistono (storia)?
   *Risposta da `CLAUDE.md` "Regole non negoziabili" + ADR storiche +
   `nove-c-kit` AGENT_BOOTSTRAP regole #1-#16.*

4. **Trigger-file pattern**: come lanci un workflow Actions se vedi
   `HTTP 403`? Quale file tocchi per il deploy MCP? Quale per le SQL ops?
   *Risposta da `nove-c-kit` PLAYBOOK §35 + AGENT_BOOTSTRAP regola #14 +
   `.github/workflows/*.yml` del progetto.*

5. **Ultimo merge / ultima decisione**: cosa è entrato, perché, e qual è
   il prossimo move logico?
   *Risposta da §3 sotto + ultimo ADR (se è stato fatto in questa
   sessione, sta ancora in §6 come mini-ADR).*

Se hai dubbio su anche UNA, torna a leggere. **Non barare**: il PM si
accorge subito quando l'agente parla senza contesto, e ti rispedisce
indietro perdendo entrambi tempo.

---

## 3. Stato attuale del progetto

> Sezione VIVA: aggiornata a ogni merge significativo.

- **Versione live**: `<vX.Y.Z>` (`<data>`)
- **Ultimo merge significativo**: `<hash>` — &lt;cosa è entrato in 1 riga&gt;
- **Cosa è in flight in questo momento**: &lt;branch + descrizione&gt;
- **Cosa è bloccato e perché**: &lt;decisione PM mancante / dipendenza esterna / quota raggiunta&gt;
- **Smoke check rapido** (incolla i comandi reali):
  ```bash
  curl -sI <PROD_URL> | head -3
  # eventuale check MCP / DB
  ```

---

## 4. Cosa è cambiato dall'ultima sessione (delta)

> Cose che non sapresti dai doc canonici perché sono **troppo recenti per
> essere state promosse** ad ADR o aggiornate nel PLAYBOOK del progetto.
> Quando una voce qui viene promossa altrove, **toglila** (non lasciare
> doppioni stagnanti).

- &lt;Delta 1&gt; (commit `<hash>`)
- &lt;Delta 2&gt;
- &lt;...&gt;

---

## 5. In-flight task — dove sei rimasto

> Solo se hai lasciato qualcosa a metà. **Niente prosa**, solo
> l'essenziale per riprendere senza ricostruire il contesto.

- **Task**: `<CODE>` &lt;nome breve&gt;
- **Branch**: `<branch>`
- **Ultimo commit**: `<hash>` — &lt;cosa fa&gt;
- **Cosa hai fatto**: &lt;2-3 bullet, file:riga&gt;
- **Cosa stavi per fare**: &lt;2-3 bullet&gt;
- **Cosa è dubbio / non-deciso**: &lt;ambiguità sospesa, eventualmente come "3 interpretazioni con stima" — `nove-c-kit` EXAMPLES.md §4&gt;
- **Loci di interesse**: `<file>:<riga>`, `<file>:<riga>`
- **Stato test**: &lt;tutto verde / suite X rossa al test Y perché&gt;

---

## 6. Decisioni di questa sessione (mini-ADR cronologici)

> Decisioni prese **in questa sessione** che meritano memoria, ma non sono
> ancora abbastanza strutturali da diventare ADR formali. Quando una di
> queste matura, **promuovila** ad `docs/adr/000N-*.md` e **snellisci**
> qui (lascia 1 riga con link all'ADR).

- **&lt;vN.N&gt; [`<data>`]** — &lt;decisione in 1 riga&gt;. **Causa**: &lt;perché&gt;.
  **Trade-off**: &lt;cosa si guadagna / cosa si paga&gt;. Promuovibile ad ADR
  quando: &lt;condizione&gt;.
- &lt;...&gt;

---

## 7. Quirks e gotcha emersi (non duplicati altrove)

> ⚠️ Solo cose che **NON sono già** nel kit (`PLAYBOOK §11`, `EXAMPLES.md`),
> negli ADR del progetto, né in `CLAUDE.md`. Se trovi un quirk già
> documentato lì, NON ripeterlo qui — punta. Se è davvero nuovo e
> generico, valuta di promuoverlo al kit (REGOLE.md "Workflow di
> promozione").

- **&lt;Quirk 1&gt;**: &lt;sintomo + causa + fix in 2-3 righe&gt;.
- &lt;...&gt;

---

## 8. Cross-refs — dove vivono le cose

Tabella di **rimandi**, NON di contenuto. Usa "dove cerco quando…" non
"cosa imparare".

| Argomento | File del progetto | Riferimento nel kit |
|---|---|---|
| Profilo del PM | `CLAUDE.md` "Profilo del PM" | `nove-c-kit` PLAYBOOK §36 |
| Stile comunicazione | `CLAUDE.md` "Comunicazione" | `nove-c-kit` PLAYBOOK §23 |
| Stack & infra | `CLAUDE.md` "Stack" + `docs/adr/0001-*.md` | `nove-c-kit` PLAYBOOK §12 |
| Sync engine `markDirty` | `<file>:<riga>` | `nove-c-kit` PLAYBOOK §6 + §25 |
| Realtime `handleRemoteChange` | `<file>:<riga>` | `nove-c-kit` PLAYBOOK §5 + §26 |
| Audit log | `<file>:<riga>` + `supabase/<file>.sql` | `nove-c-kit` PLAYBOOK §7 + §27 |
| Multi-tenant / RLS | `supabase/<file>.sql` | `nove-c-kit` PLAYBOOK §9 + §28 |
| Drag touch Kanban | `<file>:<riga>` | `nove-c-kit` PLAYBOOK §10 + §29 |
| MCP server (se presente) | `mcp-server/` | `nove-c-kit` PLAYBOOK §1 + §30 + `mcp-template/` |
| Trigger-file (Actions) | `.github/workflows/*.yml` + `ops/run-sql.txt` + `mcp-server/deploy.trigger` | `nove-c-kit` PLAYBOOK §35 |
| Surgical changes | — | `nove-c-kit` AGENT_BOOTSTRAP regola #15 + EXAMPLES.md §1 |
| Anti-pattern catalog | `docs/adr/*.md` (storia) | `nove-c-kit` PLAYBOOK §11 |
| Decisioni archittetturali | `docs/adr/*.md` | — (sono per progetto) |

---

## 9. Domande aperte per il PM

> Cose non decise che bloccano il prossimo move. Se l'ambiguità è di
> **prodotto** (scope/costo/UX), proponi **2-3 interpretazioni con stima
> oraria** invece di chiedere a domanda aperta (`nove-c-kit` EXAMPLES.md §4
> + PLAYBOOK §32.1).

- ❓ &lt;Domanda 1&gt;
  - Interpretazione A: &lt;...&gt; — stima &lt;Nh&gt;
  - Interpretazione B: &lt;...&gt; — stima &lt;Nh&gt;
  - Interpretazione C: &lt;...&gt; — stima &lt;Nh&gt;
- ❓ &lt;...&gt;

---

## Ultimo aggiornamento

`<DATA>` — `<Claude/PM>` — &lt;cosa è stato aggiornato/cambiato in questo HANDOFF&gt;

> Quando aggiorni: **aggiungi una riga sopra** con data + cosa. **Evolvi,
> non riscrivere a freddo**.
>
> Sezioni più vive: §3 (stato), §4 (delta), §5 (in-flight). Sezioni più
> statiche: §1 (reading order — cambia solo se cambia la struttura doc del
> progetto), §2 (sentinel — cambia raramente). Se §4, §6 o §7 si gonfiano
> troppo è il segnale che del contenuto va promosso fuori (ad ADR, al
> PLAYBOOK del progetto, o al kit).
