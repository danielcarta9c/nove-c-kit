# Trigger del deploy automatico del Worker MCP via GitHub Actions.
#
# Cambia il contenuto di QUESTO file (es. aggiorna il timestamp sotto) e
# pusha: il workflow `.github/workflows/deploy-mcp.yml` parte da solo.
# Vedi `snippets/mcp-deploy-workflow.yml` del kit + PLAYBOOK §35 Esempio B.
#
# Non triggera a ogni push su `mcp-server/` per evitare deploy involontari
# mentre lavori sul codice: solo i cambiamenti a QUESTO file fanno partire
# il deploy.

deploy-at: 1970-01-01T00:00:00Z
