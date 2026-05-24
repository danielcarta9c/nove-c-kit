// handleRemoteChange — realtime listener Supabase senza scollegare i form
// =====================================================================
// PROBLEMA: nel listener realtime stavamo facendo
//
//   state.data.entity_a[i] = newRow;    // ❌ sostituisce il riferimento
//
// Tutti i form binding (`oninput`, two-way refs) puntavano al vecchio
// oggetto, ora orfano → l'utente digita nel form e nulla si aggiorna,
// finché non chiude e riapre lo sheet. Bug noto come "v6.0.2 CRM".
//
// SOLUZIONE: muta in-place con `Object.assign(existing, row)`. I ref
// restano validi. In più, skip self-echo: se l'utente sta editando
// proprio quel record (`state.selectedId === row.id`), ignora il push
// remoto — il prossimo `saveNow()` riallineerà comunque.
//
// USAGE: chiama da `sb.channel().on('postgres_changes', ...)`.
// =====================================================================

function handleRemoteChange(table, payload) {
  if (table === "<entity_a>") {
    if (payload.eventType === "DELETE") {
      state.data.entity_a = state.data.entity_a.filter(r => r.id !== payload.old.id);
    } else {
      const row = payload.new;
      // Self-echo skip: l'utente sta editando, non sovrascrivere mentre digita.
      if (state.selectedId === row.id) return;
      const idx = state.data.entity_a.findIndex(r => r.id === row.id);
      if (idx >= 0) Object.assign(state.data.entity_a[idx], row);  // ✅ ref preservato
      else state.data.entity_a.unshift(row);                        // nuovo, push in cima
    }
  } else if (table === "<entity_b>") {
    if (payload.eventType === "DELETE") {
      state.data.entity_b = state.data.entity_b.filter(r => r.id !== payload.old.id);
    } else {
      const row = payload.new;
      // Note: prefisso "B:" per evitare clash di id tra namespace diversi.
      if (state.selectedId === "B:" + row.id) return;
      const idx = state.data.entity_b.findIndex(r => r.id === row.id);
      if (idx >= 0) Object.assign(state.data.entity_b[idx], row);
      else state.data.entity_b.push(row);
    }
  } else if (table === "app_settings" && payload.new) {
    Object.assign(state.data.settings, payload.new);
    const brand = document.querySelector("#brandName");
    if (brand) brand.textContent = state.data.settings.nome || "App";
  }
  renderAll();
}

// Sottoscrizione (esempio):
//
//   function cloudSubscribeRealtime() {
//     if (!sb || _realtimeChannel) return;
//     _realtimeChannel = sb.channel("public-changes")
//       .on("postgres_changes", { event: "*", schema: "public", table: "<entity_a>" },
//           payload => handleRemoteChange("<entity_a>", payload))
//       .on("postgres_changes", { event: "*", schema: "public", table: "<entity_b>" },
//           payload => handleRemoteChange("<entity_b>", payload))
//       .subscribe();
//   }
//
// Pulizia in logout:
//
//   if (_realtimeChannel) {
//     try { await sb.removeChannel(_realtimeChannel); } catch {}
//     _realtimeChannel = null;
//   }

// Stub
const state = { data: {}, selectedId: null };
function renderAll() { /* ... */ }

export { handleRemoteChange };
