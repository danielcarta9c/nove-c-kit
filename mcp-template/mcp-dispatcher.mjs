// mcp-dispatcher.mjs — Dispatcher JSON-RPC MCP puro, runtime-agnostico.
// Usato sia dal server stdio (index.mjs) che dal Worker HTTP (worker.mjs).
//
// TODO progetto: cambia il name di SERVER_INFO. Tieni il pattern.

export const PROTOCOL_VERSION = "2024-11-05";
export const SERVER_INFO = { name: "<nome-progetto>-mcp", version: "0.1.0" };

export async function dispatch(msg, { TOOLS, findTool }) {
  const { id, method, params } = msg;

  async function handleInitialize() {
    return { protocolVersion: PROTOCOL_VERSION, serverInfo: SERVER_INFO, capabilities: { tools: {} } };
  }
  async function handleToolsList() {
    return { tools: TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) };
  }
  async function handleToolsCall(p) {
    const name = p && p.name;
    const args = (p && p.arguments) || {};
    const tool = findTool(name);
    if (!tool) return { content: [{ type: "text", text: `Tool sconosciuto: ${name}` }], isError: true };
    try {
      const result = await tool.handler(args);
      const txt = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: "text", text: txt }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Errore: ${e.message}` }], isError: true };
    }
  }

  try {
    let result;
    switch (method) {
      case "initialize":  result = await handleInitialize();        break;
      case "initialized": return null;
      case "tools/list":  result = await handleToolsList();         break;
      case "tools/call":  result = await handleToolsCall(params);   break;
      case "ping":        result = {};                              break;
      default:
        if (id === undefined || id === null) return null;
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Metodo non supportato: ${method}` } };
    }
    if (id === undefined || id === null) return null;
    return { jsonrpc: "2.0", id, result };
  } catch (e) {
    if (id === undefined || id === null) return null;
    return { jsonrpc: "2.0", id, error: { code: -32603, message: e.message } };
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
