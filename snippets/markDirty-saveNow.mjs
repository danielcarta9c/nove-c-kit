// markDirty + saveNow + isPlaceholder
// =====================================================================
// PROBLEMA: ogni `onInput` che chiama `cloudUpsert(...)` inline genera
// N round-trip al server per N keystroke. Tipica cascade: 8 caratteri
// digitati in 2s → 8 fetch → 8 realtime push agli altri client → ogni
// client risalva i suoi form aperti → 64 fetch totali.
//
// SOLUZIONE: ogni handler chiama solo `markDirty()`. Una funzione
// debounced 350ms (`saveNow`) flusha la coda in batch. Skip placeholder
// (record con id `temp_*` o vuoto) per evitare record fantasma cloud.
//
// USAGE: chiama `markDirty({ <entity>Id: id })` dovunque modifichi state.
// Mai await diretto su saveNow. Il debounce ci pensa lui.
// =====================================================================

const PLACEHOLDER_ID_REGEX = /^(temp_|placeholder_|new_)/;
const isPlaceholder = (r) => !r || !r.id || PLACEHOLDER_ID_REGEX.test(r.id);

// Debounce helper (vanilla, no lodash).
function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...args); }, ms);
  };
}

const state = {
  data: { /* <entity_a>: [...], <entity_b>: [...] */ },
  _dirty: null,
  saving: false,
  user: null,
  dirty: false
};

function markDirty(opts) {
  state.dirty = true;
  if (!state._dirty) {
    state._dirty = {
      // 1 Set per ogni tabella che può sporcarsi:
      entity_a: new Set(),
      entity_b: new Set(),
      settings: false,
      all: false
    };
  }
  if (opts) {
    if (opts.entityAId) state._dirty.entity_a.add(opts.entityAId);
    if (opts.entityBId) state._dirty.entity_b.add(opts.entityBId);
    if (opts.settings) state._dirty.settings = true;
  } else {
    state._dirty.all = true;
  }
  setStatus("dirty", "Salvataggio…");
  scheduleSave();
}

const scheduleSave = debounce(saveNow, 350);

async function saveNow() {
  if (state.saving || !state.user || !state._dirty) return;
  state.saving = true;
  setStatus("dirty", "Salvataggio…");
  try {
    if (state._dirty.all) {
      // Fallback: sync di tutto in batch — skippa placeholder
      const batchA = state.data.entity_a.filter(r => !isPlaceholder(r));
      await cloudUpsertEntityABatch(batchA);
      await cloudUpsertEntityBBatch(state.data.entity_b);
      if (state._dirty.settings) await cloudUpsertSettings();
    } else {
      // Mirato per id specifici (più efficiente di salvare tutto)
      const listA = [...state._dirty.entity_a]
        .map(id => state.data.entity_a.find(r => r.id === id))
        .filter(r => r && !isPlaceholder(r));
      const listB = [...state._dirty.entity_b]
        .map(id => state.data.entity_b.find(r => r.id === id))
        .filter(Boolean);
      if (listA.length) await cloudUpsertEntityABatch(listA);
      if (listB.length) await cloudUpsertEntityBBatch(listB);
      if (state._dirty.settings) await cloudUpsertSettings();
    }
    state._dirty = null;
    state.dirty = false;
    setStatus("ok", "Sincronizzato");
  } catch (e) {
    console.error(e);
    setStatus("err", "Errore sync");
    toast("Errore sincronizzazione: " + (e.message || e), 4000);
  } finally {
    state.saving = false;
  }
}

// Esempio di uso in un handler form:
//
//   inputNome.addEventListener("input", (e) => {
//     entity.nome = e.target.value;
//     markDirty({ entityAId: entity.id });    // ← solo questo, niente await
//   });
//
// Esempio a beforeunload (flush forzato):
//
//   window.addEventListener("beforeunload", () => {
//     if (state.dirty) saveNow();   // best-effort, non aspetta promise
//   });

// Stub: implementali nel tuo progetto.
async function cloudUpsertEntityABatch(list) { /* ... */ }
async function cloudUpsertEntityBBatch(list) { /* ... */ }
async function cloudUpsertSettings()        { /* ... */ }
function setStatus(level, msg) { /* aggiorna badge UI */ }
function toast(msg, ms) { /* notifica utente */ }

export { markDirty, saveNow, isPlaceholder, debounce };
