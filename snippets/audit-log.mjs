// audit-log — batched fire-and-forget logger client-side
// =====================================================================
// PROBLEMA: vuoi tracciabilità "chi ha fatto cosa quando" (login, CUD,
// operazioni batch, modifiche config critica) senza:
//   - bloccare l'UI in attesa della fetch
//   - martellare il DB con 200 INSERT separate in caso di bulk
//
// SOLUZIONE: queue in memoria + flush debounced (500ms). Tutto in
// fire-and-forget (no await dell'utente). Lo schema lato DB è in
// `multi-tenant-audit-soft-delete.sql` di questo kit.
//
// USAGE: chiama `logAudit(action, entityType, entityId, payload?)` dopo
// ogni operazione. MAI await — il log non deve mai bloccare l'utente.
// =====================================================================

const _auditQueue = [];
let _auditFlushTimer = null;

function logAudit(action, entityType, entityId, payload) {
  _auditQueue.push({
    workspace_id: state.currentWorkspaceId || DEFAULT_WORKSPACE_ID,
    actor_id: (state.user && state.user.id) || null,
    action,                                          // 'login', 'create', 'update', 'delete', 'batch:generate', ...
    entity_type: entityType,                         // 'utente', 'entity_a', 'template', ...
    entity_id: entityId ? String(entityId) : null,
    payload: payload || null                         // diff o snapshot, jsonb
  });
  if (_auditFlushTimer) return;
  _auditFlushTimer = setTimeout(flushAuditLog, 500);
}

async function flushAuditLog() {
  _auditFlushTimer = null;
  if (!sb) { _auditQueue.length = 0; return; }
  if (_auditQueue.length === 0) return;
  const batch = _auditQueue.splice(0, _auditQueue.length);
  try {
    const { error } = await sb.from("audit_log").insert(batch);
    if (error) console.warn("audit_log flush", error);
  } catch (e) {
    console.warn("audit_log flush exception", e);
  }
}

// Esempi di chiamata:
//
//   // dopo login OK
//   logAudit("login", "user", state.user.id, { email: state.user.email });
//
//   // dopo creazione record
//   logAudit("create", "entity_a", created.id);
//
//   // dopo bulk operation
//   logAudit("batch:generate", "entity_a", null, { count: 200, source: "template" });
//
//   // dopo modifica config sensibile
//   logAudit("update", "template", tpl.id, { fields_changed: ["scadenza", "applicabile_a"] });

// Stub
const state = { currentWorkspaceId: null, user: null };
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const sb = null;  // tua istanza Supabase client

export { logAudit, flushAuditLog };
