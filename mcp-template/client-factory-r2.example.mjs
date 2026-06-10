// client-factory-r2.example.mjs — Template di factory client per backend
// **Cloudflare R2** (object store). Alternativa a `client-factory.example.mjs`
// (Supabase REST) per progetti tipo: vault di file Markdown, archivio
// documenti, cache statica condivisa.
//
// Rinomina in `client.mjs` e adattalo. Differenze chiave vs Supabase:
//   - R2 è un **binding** (`env.<BINDING>`), NON un secret. Non serve
//     URL/key, basta dichiararlo nel `wrangler.toml` (vedi commento R2
//     nello stesso file).
//   - Non c'è SQL né relazioni: solo CRUD su oggetti per chiave.
//   - **No cartelle**: un object store usa solo chiavi piatte. Le "cartelle"
//     sono convenzioni sul prefisso (`docs/sub/file.md`).
//   - Niente realtime, niente RLS — la sicurezza è a livello di Worker
//     (autenticazione MCP + logica di scoping nel codice).
//
// Vantaggi del pattern factory (stessi della variante Supabase):
//   - Niente variabili globali (testabile)
//   - Iniezione binding esplicita
//   - Aggiungi un metodo senza toccare gli altri

// Limite di sicurezza per le ricerche full-text (R2 non ha indici).
// Iterare tutti gli oggetti scaricando il contenuto è O(n) sul totale: cap
// duro + flag `truncated` evitano un Worker che si pianta su un bucket grande.
const SEARCH_RESULTS_CAP = 50;

// Estensione di default filtrata da `list`. Sovrascrivibile via parametro.
const DEFAULT_EXTENSION = ".md";

export function createVaultClient(bucket) {
  if (!bucket || typeof bucket.list !== "function") {
    throw new Error("createVaultClient: passa il binding R2 (env.<BINDING>), non una stringa.");
  }

  // ---- READ ----------------------------------------------------------------

  // LIST: enumera chiavi sotto un prefisso, paginato col cursor di R2.
  // R2 ritorna max 1000 oggetti per chiamata: per liste lunghe l'utente del
  // factory deve gestire la pagination, oppure aggiungi qui un loop con cap.
  async function list({ prefix = "", cursor, limit = 1000, extension = DEFAULT_EXTENSION } = {}) {
    const result = await bucket.list({ prefix, cursor, limit });
    const objects = (result.objects || [])
      .filter(o => !extension || o.key.endsWith(extension))
      .map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded }));
    return {
      objects,
      cursor: result.cursor || null,
      truncated: !!result.truncated
    };
  }

  // GET: contenuto come testo. Null se la chiave non esiste (NON eccezione).
  async function get(key) {
    const obj = await bucket.get(key);
    if (!obj) return null;
    return await obj.text();
  }

  // HEAD: solo metadata (senza scaricare il body). Utile per check esistenza.
  async function head(key) {
    const obj = await bucket.head(key);
    if (!obj) return null;
    return { key, size: obj.size, uploaded: obj.uploaded, etag: obj.etag };
  }

  // ---- WRITE ---------------------------------------------------------------

  // PUT: crea o sovrascrive. R2 fa upsert per chiave nativamente.
  async function put(key, value) {
    if (!key) throw new Error("put: 'key' obbligatorio");
    await bucket.put(key, value);
    return { key };
  }

  // DELETE: hard delete. Niente soft-delete nativo: se ti serve, scrivi
  // una chiave di tombstone (es. `.deleted/<key>`) prima del delete reale.
  async function del(key) {
    await bucket.delete(key);
    return { key };
  }

  // ---- SEARCH (full-text iterando) -----------------------------------------

  // SEARCH: R2 non ha full-text. Iteriamo gli oggetti sotto un prefisso e
  // scarichiamo il contenuto per il match. **COSTOSO**: cap a SEARCH_RESULTS_CAP
  // + flag truncated. Per ricerche frequenti, considera un indice esterno
  // (Vectorize / D1 / KV con n-gram) invece di questo metodo.
  async function search(query, { prefix = "", extension = DEFAULT_EXTENSION } = {}) {
    if (!query || !query.trim()) return { matches: [], truncated: false };
    const needle = query.toLowerCase();
    const matches = [];
    let cursor;
    let truncated = false;

    do {
      const page = await list({ prefix, cursor, extension });
      for (const { key } of page.objects) {
        const text = await get(key);
        if (text && text.toLowerCase().includes(needle)) {
          matches.push({ key, preview: extractPreview(text, needle) });
          if (matches.length >= SEARCH_RESULTS_CAP) {
            truncated = true;
            break;
          }
        }
      }
      cursor = truncated ? null : page.cursor;
    } while (cursor);

    return { matches, truncated };
  }

  function extractPreview(text, needle) {
    const i = text.toLowerCase().indexOf(needle);
    if (i < 0) return text.slice(0, 200);
    const start = Math.max(0, i - 80);
    const end = Math.min(text.length, i + needle.length + 80);
    return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  }

  // ---- FOLDER CONVENTIONS --------------------------------------------------

  // CREATE FOLDER: un object store NON ha cartelle vuote. Convenzione: scrivi
  // un oggetto placeholder con chiave `<path>/.keep` per "marcare" il prefisso
  // (es. nelle UI che le elencano via `list` col delimitatore implicito).
  async function createFolder(path) {
    const key = (path.endsWith("/") ? path : path + "/") + ".keep";
    await put(key, "");
    return { key };
  }

  return {
    list,
    get,
    head,
    put,
    delete: del,
    search,
    createFolder
  };
}
