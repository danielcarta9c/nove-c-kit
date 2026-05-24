// client-factory.example.mjs — Template di factory client HTTP verso Supabase.
//
// Rinomina in `client.mjs` e adattalo al tuo dominio. Pattern factory:
// `createClient({url, key, workspaceId})` ritorna un oggetto con metodi
// REST puri. Niente SDK Supabase — solo `fetch`, così lo stesso codice
// gira su Node 22+ (stdio) e su Cloudflare Workers (HTTP).
//
// Vantaggi del pattern factory:
// - Niente variabili globali (testabile)
// - Iniezione config esplicita (stesso file in 2 runtime)
// - Aggiungi un metodo senza toccare gli altri

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export function createClient({ url, key, workspaceId } = {}) {
  if (!url || !key) {
    throw new Error("createClient: 'url' e 'key' sono obbligatori.");
  }
  const WORKSPACE_ID = workspaceId || DEFAULT_WORKSPACE_ID;
  const WORKSPACE_FILTER = `workspace_id=eq.${WORKSPACE_ID}&deleted_at=is.null`;

  const restUrl = (table) => `${url}/rest/v1/${table}`;
  const headers = (extra) => ({
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(extra || {})
  });

  async function rest(table, opts = {}) {
    const reqUrl = restUrl(table) + (opts.qs ? "?" + opts.qs : "");
    const resp = await fetch(reqUrl, {
      method: opts.method || "GET",
      headers: headers(opts.headers),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`REST ${resp.status} ${resp.statusText}: ${txt}`);
    }
    if (resp.status === 204) return null;
    return await resp.json();
  }

  // -------- ESEMPI (sostituisci con le tue tabelle / metodi) ----------

  // READ: lista entità con filtro testuale opzionale.
  async function listEntities({ q, limit = 100 } = {}) {
    let qs = WORKSPACE_FILTER + `&order=created_at.desc&limit=${limit}`;
    if (q) qs += `&nome=ilike.%25${encodeURIComponent(q)}%25`;
    return await rest("<entity_table>", { qs });
  }

  // READ: lookup by id.
  async function getEntityById(id) {
    const qs = WORKSPACE_FILTER + `&id=eq.${encodeURIComponent(id)}&limit=1`;
    const rows = await rest("<entity_table>", { qs });
    return rows && rows[0] || null;
  }

  // WRITE: insert. Restituisce il record creato (Prefer: return=representation).
  async function createEntity({ nome, note } = {}) {
    if (!nome || !String(nome).trim()) {
      throw new Error("nome obbligatorio");
    }
    const id = "e-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    const body = [{
      id,
      workspace_id: WORKSPACE_ID,
      nome: String(nome).trim(),
      note: note || null
    }];
    const r = await rest("<entity_table>", {
      method: "POST",
      body,
      headers: { "Prefer": "return=representation" }
    });
    return r && r[0];
  }

  // WRITE: PATCH parziale. Sempre filtrato per workspace per RLS-safety.
  async function updateEntity(id, patch) {
    const qs = `${WORKSPACE_FILTER}&id=eq.${encodeURIComponent(id)}`;
    const body = { ...patch, updated_at: new Date().toISOString() };
    const r = await rest("<entity_table>", {
      method: "PATCH",
      qs,
      body,
      headers: { "Prefer": "return=representation" }
    });
    return r && r[0];
  }

  return {
    workspaceId: WORKSPACE_ID,
    rest,                          // esposto per tool ad-hoc
    listEntities,
    getEntityById,
    createEntity,
    updateEntity
  };
}
