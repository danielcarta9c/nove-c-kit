#requires -Version 5.1
<#
.SYNOPSIS
  Setup completo del Worker Cloudflare MCP per <nome-progetto>.

.DESCRIPTION
  Esegue in sequenza: npm install, creazione KV namespace OAUTH_KV (se non esiste),
  sostituzione dell'id nel wrangler.toml, e deploy del Worker. Idempotente: rilanciandolo,
  skippa i passi gia' fatti.

  Prerequisiti (una volta sola):
    - Account Cloudflare (free)
    - npx wrangler login   (apre browser, autorizzi)
    - npx wrangler secret put SUPABASE_URL
    - npx wrangler secret put SUPABASE_SERVICE_KEY
    - npx wrangler secret put MCP_AUTH_TOKEN

.EXAMPLE
  PS> cd <repo>\mcp-server
  PS> .\setup-mcp.ps1
#>

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Write-Step($n, $total, $msg) {
  Write-Host ""
  Write-Host "[$n/$total] $msg" -ForegroundColor Cyan
}

# ----------------------------------------------------------------------
# 1/4 - Verifica prerequisiti
# ----------------------------------------------------------------------
Write-Step 1 4 "Verifica prerequisiti"

if (-not (Test-Path "wrangler.toml")) {
  Write-Error "Non trovo wrangler.toml. Sei dentro la cartella mcp-server/?"
  exit 1
}
if (-not (Test-Path "package.json")) {
  Write-Error "Non trovo package.json. Sei dentro la cartella mcp-server/?"
  exit 1
}

try {
  $nodeVer = node --version
  Write-Host "  Node $nodeVer" -ForegroundColor Green
} catch {
  Write-Error "Node non trovato. Installa Node 22+ da https://nodejs.org"
  exit 1
}

$whoami = npx wrangler whoami 2>&1 | Out-String
if ($whoami -match "You are not authenticated") {
  Write-Host "  Non sei loggato a Cloudflare. Lancia prima: npx wrangler login" -ForegroundColor Yellow
  exit 1
}
Write-Host "  Cloudflare login OK" -ForegroundColor Green

# ----------------------------------------------------------------------
# 2/4 - npm install
# ----------------------------------------------------------------------
Write-Step 2 4 "Installazione dipendenze npm"

if (Test-Path "node_modules") {
  Write-Host "  node_modules esiste gia', skip (rilancialo manualmente se vuoi aggiornare)" -ForegroundColor Yellow
} else {
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install fallito"
    exit 1
  }
  Write-Host "  Dipendenze installate" -ForegroundColor Green
}

# ----------------------------------------------------------------------
# 3/4 - Crea KV namespace (se non c'e' gia')
# ----------------------------------------------------------------------
Write-Step 3 4 "Setup KV namespace OAUTH_KV"

$toml = Get-Content "wrangler.toml" -Raw
if ($toml -notmatch "PLACEHOLDER_KV_NAMESPACE_ID") {
  Write-Host "  wrangler.toml ha gia' un id KV configurato, skip" -ForegroundColor Yellow
} else {
  Write-Host "  Creo nuovo namespace OAUTH_KV..."
  $output = npx wrangler kv namespace create OAUTH_KV 2>&1 | Out-String
  Write-Host $output
  if ($output -match 'id\s*=\s*"([a-f0-9]+)"') {
    $kvId = $matches[1]
    Write-Host "  KV creato con id: $kvId" -ForegroundColor Green
    $toml = $toml -replace "PLACEHOLDER_KV_NAMESPACE_ID", $kvId
    Set-Content "wrangler.toml" -Value $toml -NoNewline
    Write-Host "  wrangler.toml aggiornato con id reale" -ForegroundColor Green
  } else {
    Write-Error "Non sono riuscito a estrarre l'id KV dall'output di wrangler. Output sopra."
    exit 1
  }
}

# ----------------------------------------------------------------------
# 4/4 - Deploy del Worker
# ----------------------------------------------------------------------
Write-Step 4 4 "Deploy del Worker su Cloudflare"

npx wrangler deploy
if ($LASTEXITCODE -ne 0) {
  Write-Error "wrangler deploy fallito"
  exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Setup completato!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prossimi passi:" -ForegroundColor Cyan
Write-Host "  1. Apri Claude (web/Desktop/mobile)"
Write-Host "  2. Settings -> Connectors -> Add custom connector"
Write-Host "  3. URL: l'URL del tuo Worker (output di wrangler deploy sopra) + /mcp"
Write-Host "  4. OAuth Client ID / Secret: lascia VUOTI"
Write-Host "  5. Salva, premi Connetti, incolla MCP_AUTH_TOKEN nel form"
Write-Host "  6. Approva. Connessione attiva."
Write-Host ""
