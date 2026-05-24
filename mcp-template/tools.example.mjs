// tools.example.mjs — Template di registry dei tool MCP.
//
// Rinomina in `tools.mjs` e aggiungi i tuoi tool. Pattern:
// `createTools(client)` ritorna { TOOLS, findTool } dove TOOLS è la lista
// completa con schema JSON, e findTool(name) ritorna l'handler.
//
// Quando i tool diventano molti (>6-8), splitta per dominio in
// tools/<entity>.mjs e importa qui (vedi PLAYBOOK Nove C §1).

export function createTools(client) {
  const TOOLS = [
    {
      name: "ping",
      description: "Health check: verifica che il server MCP risponda. Nessun parametro.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => ({ ok: true, ts: new Date().toISOString(), workspace: client.workspaceId })
    },
    {
      name: "list_entities",
      description: "Elenca le entità dell'utente. Filtro testuale opzionale per nome.",
      inputSchema: {
        type: "object",
        properties: {
          q: { type: "string", description: "Sottostringa per filtro nome (case-insensitive)" },
          limit: { type: "integer", description: "Numero massimo risultati (default 100)", default: 100 }
        }
      },
      handler: async ({ q, limit }) => {
        const rows = await client.listEntities({ q, limit });
        return { count: rows.length, rows };
      }
    },
    {
      name: "get_entity",
      description: "Ritorna una singola entità per id.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "ID dell'entità" }
        }
      },
      handler: async ({ id }) => {
        const row = await client.getEntityById(id);
        if (!row) throw new Error(`Entità non trovata: ${id}`);
        return row;
      }
    },
    {
      name: "create_entity",
      description: "Crea una nuova entità. Richiede 'nome'.",
      inputSchema: {
        type: "object",
        required: ["nome"],
        properties: {
          nome: { type: "string", description: "Nome (obbligatorio)" },
          note: { type: "string", description: "Note libere (opzionali)" }
        }
      },
      handler: async ({ nome, note }) => {
        const created = await client.createEntity({ nome, note });
        return { created };
      }
    }
  ];

  function findTool(name) {
    return TOOLS.find(t => t.name === name);
  }

  return { TOOLS, findTool };
}
