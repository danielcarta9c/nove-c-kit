# EXAMPLES — pattern ❌ / ✅ per il kit Nove C

> Esempi concreti di "cosa fare" e "cosa NON fare" sui pattern chiave del
> kit. Le regole astratte stanno nel `PLAYBOOK.md` e nell'`AGENT_BOOTSTRAP.md`;
> qui i **diff veri**, code-level.
>
> Formato e ispirazione: skill open-source
> [`andrej-karpathy-skills`](https://github.com/multica-ai/andrej-karpathy-skills)
> di multica-ai (MIT). Adottiamo il **formato** ❌/✅ con diff e riusiamo
> alcune frasi-stiletto verbatim (con attribuzione inline). Non importiamo
> i 4 principi come sezioni a sé perché tre di quattro sono già nel kit
> con framing Nove-C-specifico (vedi PLAYBOOK §13, §17, §32, §36) e uno
> ("Think Before Coding" come *ask when uncertain* generico) avrebbe
> conflittato con §36 — risolto dalla tecnica "3 interpretazioni con
> stima" qui sotto in §4.

---

## 1. Surgical Changes — modifiche chirurgiche

> *"Every changed line should trace directly to the user's request."*
> — Karpathy guidelines.

Riferimenti: PLAYBOOK §11 (anti-pattern "scope creep"), AGENT_BOOTSTRAP
regola #15.

### 1.1 Fix bug realtime senza drive-by refactor

**Richiesta del PM**: *"`handleRemoteChange` scollega il form aperto quando
arriva un push realtime. Fixalo."*

❌ **NON fare** (drive-by refactor — modifiche ortogonali al bug):

```diff
- function handleRemoteChange(payload) {
-   const row = payload.new;
-   const idx = state.data.findIndex(r => r.id === row.id);
-   if (idx >= 0) state.data[idx] = row;
-   else state.data.push(row);
-   renderAll();
- }
+ /**
+  * Handle a realtime change from Supabase.
+  * @param {RealtimePayload} payload
+  */
+ async function handleRemoteChange(payload) {
+   if (!payload?.new) return;
+   const row = payload.new;
+   const existing = state.data.find(r => r.id === row.id);
+   if (existing) {
+     Object.assign(existing, row);
+   } else {
+     state.data.unshift(row);   // unshift, non push: ordine più recente
+   }
+   await renderAll();
+ }
```

Cose aggiunte non richieste: JSDoc, `async` senza motivo, null-check non
richiesto, `push` → `unshift` (ordine cambiato senza permesso). Anche se
ognuna di queste modifiche è "ragionevole", **nessuna si riconduce alla
richiesta del PM**.

✅ **Fare** (chirurgico — solo il bug):

```diff
  function handleRemoteChange(payload) {
    const row = payload.new;
    const idx = state.data.findIndex(r => r.id === row.id);
-   if (idx >= 0) state.data[idx] = row;
+   if (idx >= 0) Object.assign(state.data[idx], row);
    else state.data.push(row);
    renderAll();
  }
```

**Una riga cambiata**: quella che fixa il bug (preserva il ref
dell'oggetto, evita di scollegare il form). Razionale del fix: PLAYBOOK §5.

### 1.2 Aggiunta logging senza style drift

**Richiesta del PM**: *"Aggiungi un log all'inizio e alla fine di
`cloudUpsertBatch`."*

❌ **NON fare** (riformatta tutto il file mentre ci sei):

```diff
- function cloudUpsertBatch(records) {
-   const filtered = records.filter(r => !isPlaceholder(r));
-   if (filtered.length === 0) return Promise.resolve();
-   return sb.from('records').upsert(filtered);
- }
+ async function cloudUpsertBatch(records: Record[]): Promise<UpsertResult> {
+   console.log("cloudUpsertBatch start", { count: records.length });
+   const filtered = records.filter((r) => !isPlaceholder(r));
+   if (!filtered.length) {
+     console.log("cloudUpsertBatch skip: tutti placeholder");
+     return { ok: true, skipped: true };
+   }
+   const result = await sb.from("records").upsert(filtered);
+   console.log("cloudUpsertBatch end", result);
+   return result;
+ }
```

Cambiato: aggiunto TypeScript (**il progetto è vanilla JS**, §12!),
virgolette doppie (stile esistente: singole), wrapping `{ok, skipped}` non
richiesto, API ritorno alterata.

✅ **Fare** (matcha lo stile esistente):

```diff
  function cloudUpsertBatch(records) {
+   console.log('cloudUpsertBatch start', records.length);
    const filtered = records.filter(r => !isPlaceholder(r));
    if (filtered.length === 0) return Promise.resolve();
-   return sb.from('records').upsert(filtered);
+   return sb.from('records').upsert(filtered).then(res => {
+     console.log('cloudUpsertBatch end', res);
+     return res;
+   });
  }
```

Solo i due log richiesti. Stile esistente (single quote, vanilla JS,
niente async/await) **rispettato anche se lo faresti diverso**.

---

## 2. Simplicity First — niente astrazione speculativa

> *"Good code is code that solves today's problem simply, not tomorrow's
> problem prematurely."* — Karpathy guidelines.

Riferimenti: PLAYBOOK §13 punto 4 (anti-overengineering), AGENT_BOOTSTRAP
regola #11.

### 2.1 Factory pattern per UN solo backend

**Richiesta del PM**: *"Crea un client per leggere/scrivere su `utenti`."*

❌ **NON fare** (Strategy pattern per 1 caso):

```js
// data/data-source.mjs
export class DataSourceProvider {
  async findById(id) { throw new Error('not implemented'); }
  async list(opts)   { throw new Error('not implemented'); }
  async upsert(row)  { throw new Error('not implemented'); }
}

export class SupabaseDataSource extends DataSourceProvider {
  constructor({ url, key }) { super(); this.client = createClient(url, key); }
  async findById(id)  { /* ... */ }
  async list(opts)    { /* ... */ }
  async upsert(row)   { /* ... */ }
}

// data/utenti-repository.mjs
export class UtentiRepository {
  constructor(provider) { this.provider = provider; }
  findById(id)  { return this.provider.findById(id); }
  list(opts)    { return this.provider.list(opts); }
  upsert(row)   { return this.provider.upsert(row); }
}

// Setup richiede 3 layer per leggere un utente:
//   const provider = new SupabaseDataSource({ url, key });
//   const utenti = new UtentiRepository(provider);
//   const u = await utenti.findById(123);
```

40 righe di setup per leggere un utente. Quando arriverà un secondo
backend (forse mai), si riscriverà comunque.

✅ **Fare** (just enough):

```js
// data/utenti.mjs
import { sb } from './supabase-client.mjs';

export async function getUtente(id) {
  const { data } = await sb.from('utenti').select('*').eq('id', id).single();
  return data;
}

export async function upsertUtente(row) {
  return sb.from('utenti').upsert(row);
}
```

Tre righe per leggere, tre per scrivere. Quando arriverà davvero un
secondo backend, si refattorizza **quel giorno** con un ADR (§18), non oggi.

---

## 3. Goal-Driven Execution — test-first prima del fix

Riferimenti: PLAYBOOK §17 (DoD), §19 (bug-hunt), §21 (test).

### 3.1 Bug-hunt — riproduci PRIMA di fixare

**Richiesta del PM (bug-hunt-08)**: *"Quando importo un cliente con
apostrofo nel nome (es. `D'Angelo`), il drag&drop sulla Kanban si rompe."*

❌ **NON fare** (fix al volo senza riprodurre):

```diff
  function attachKanDrag(card, onDrop) {
    // ...
+   // Aggiungo escape su tutto, "non si sa mai"
+   const name = card.dataset.cliente.replace(/'/g, "\\'");
    // ...
  }
```

Hai escapato dove forse non serve, non hai verificato che il bug sia
proprio lì, e non hai un test che impedirà la regressione futura.

✅ **Fare** (write the failing test first):

```js
// test/bug-hunt-08.mjs
import { bootHarness, mkChecker } from './setup.mjs';

const { page, errors, teardown } = await bootHarness();
const c = mkChecker();
try {
  await page.evaluate(() => window.__app.setTestState({
    clienti: [{ id: 'c1', nome: "D'Angelo", stato: 'backlog' }]
  }));
  await page.waitForSelector("[data-cliente-id='c1']");

  // Tenta drag → drop
  const card = await page.$("[data-cliente-id='c1']");
  await card.dragTo(await page.$('.kan-column[data-stato="done"]'));

  // Verifica: la card è effettivamente nella nuova colonna
  const moved = await page.$$eval(
    '.kan-column[data-stato="done"] [data-cliente-id="c1"]',
    els => els.length
  );
  c.ok('drag con apostrofo nel nome', moved === 1);
  c.ok('zero JS errors', errors.length === 0);
} finally { await teardown(); }

process.exit(c.summary('bug-hunt-08'));
```

1. Lancia il test → **fallisce** (riproduce il bug).
2. Indaga: il vero problema è in `elementFromPoint` dentro `attachKanDrag`
   (PLAYBOOK §29) che costruisce un selector con `data-cliente-id="${id}"`
   senza escape.
3. Fixa **lì**.
4. Rilancia → **passa**.
5. Commit: `fix(bug-hunt-08): escape apostrofo nel data-attribute selector di attachKanDrag`.

La regressione futura è impossibile: c'è un test che la sorveglia.

---

## 4. Tecnica "3 interpretazioni con stima" — quando chiedere a Daniel

> Tecnica adattata dal Karpathy `EXAMPLES` (*"Make the search faster"*).
> Riconcilia §36 rule 4 (*"non chiedere il 'come' tecnico"*) con la
> necessità di NON pickare silenziosamente quando l'ambiguità è di
> **prodotto**.

Riferimenti: PLAYBOOK §32.1, §36, AGENT_BOOTSTRAP "Profilo del PM".

**Regola**: quando l'ambiguità è tecnica (encoding, algoritmo, lato di un
conflitto git su codice) → decidi da senior, **niente domande**. Quando
l'ambiguità è di prodotto (scope, costo, UX) → NON chiedere "intendi X?"
a domanda aperta, **presenta 2-3 interpretazioni con stima oraria/costo
e vincoli noti**. Daniel decide in 30 secondi.

### 4.1 "Velocizza l'upload delle foto"

**Richiesta del PM**: *"Velocizza l'upload delle foto, è lento."*

❌ **NON fare** (silenziosamente pick una interpretazione):

```
Ok, aggiungo compressione client-side delle immagini prima dell'upload.
[Procede a implementare 200 righe di canvas resize + WebP encoding]
```

Hai scelto un'interpretazione su tre senza chiedere. Se Daniel intendeva
"velocità percepita", hai sprecato 4 ore.

✅ **Fare** (3 interpretazioni + stima):

```
"Velocizza l'upload" può voler dire tre cose. Quale ti interessa?

1. Velocità PERCEPITA — l'utente vede subito la card "in elaborazione" e
   può continuare a usare l'app; upload reale in background.
   → Stima 2h. Costo zero. Nessun rischio qualità immagini.

2. Velocità REALE di upload — comprimere lato client prima del transfer
   (canvas resize a 1920px + WebP).
   → Stima 4-6h. ⚠ Rischio qualità foto per i computi metrici.

3. Ridurre NUMERO di upload — un POST con N immagini in batch invece di N
   POST sequenziali.
   → Stima 3h. Vincolo: limite payload Supabase (~50 MB per request).

Oggi tipicamente l'upload dura ~8s per una foto 3MB. Quale ti interessa?
```

Daniel risponde in 30 secondi. Sai cosa costruire. Niente sessione persa.

---

> Per le regole di metodo e i principi astratti: PLAYBOOK e
> AGENT_BOOTSTRAP. Qui solo esempi code-level che mostrano i pattern in
> azione.
