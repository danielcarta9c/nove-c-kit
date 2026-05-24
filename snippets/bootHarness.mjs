// bootHarness — test harness Playwright headless con server statico + network bloccata
// =====================================================================
// PROBLEMA: vuoi testare l'app in browser reale senza:
//   - dipendenze da Supabase produzione (lascia righe spurie, flaky)
//   - setup di un server di backend mockato (overkill per smoke test)
//   - configurazione manuale di Playwright per ogni progetto
//
// SOLUZIONE: un server statico HTTP interno serve `index.html` su porta
// locale. Playwright lancia Chromium headless, blocca tutte le richieste
// verso `*.supabase.co`, ed espone `page` per i test.
//
// USAGE:
//   import { bootHarness, mkChecker } from "./bootHarness.mjs";
//   const { page, teardown } = await bootHarness();
//   const c = mkChecker();
//   await page.click("#btnLogin");
//   c.ok("login screen visible", await page.isVisible("#welcome"));
//   await teardown();
//   process.exit(c.summary("smoke"));
//
// FUNZIONA in:
//   - container Claude Code on the web (path /opt/...)
//   - locale dello sviluppatore (npx playwright install)
// =====================================================================

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

// Risolvi Playwright. Container Claude: /opt/node22/.... Local: nei node_modules.
async function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    "/opt/node22/lib/node_modules/playwright/index.mjs",
    path.join(ROOT, "node_modules/playwright/index.mjs"),
    "playwright"
  ].filter(Boolean);
  for (const c of candidates) {
    try { return await import(c); } catch (e) { /* try next */ }
  }
  throw new Error("Playwright non trovato. Imposta PLAYWRIGHT_MODULE o installa con: npm i -D playwright && npx playwright install chromium");
}

function resolveChromiumExecPath() {
  // Container Claude Code on the web
  const containerPath = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
  if (fs.existsSync(containerPath)) return containerPath;
  // Local: lascio che Playwright trovi da sé
  return process.env.CHROME_PATH || null;
}

// Static file server: serve solo file dentro ROOT. Niente directory listing.
function startStaticServer(port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".json": "application/json",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
  const server = http.createServer((req, res) => {
    let url = (req.url || "/").split("?")[0];
    if (url === "/") url = "/index.html";
    const fp = path.join(ROOT, url);
    if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(fp, (err, data) => {
      if (err) { res.writeHead(404); res.end("404"); return; }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

export async function bootHarness(opts = {}) {
  const port = opts.port || 8765;
  const viewport = opts.viewport || { width: 1200, height: 900 };
  const waitForGlobal = opts.waitForGlobal || "__app";   // ← nomi il tuo hook in window.__app
  const server = await startStaticServer(port);
  const { chromium } = await loadPlaywright();
  const launchOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  };
  const execPath = resolveChromiumExecPath();
  if (execPath) launchOpts.executablePath = execPath;
  const browser = await chromium.launch(launchOpts);
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  // Blocco la rete verso Supabase prod: i test girano contro stato locale.
  await page.route("**/*supabase.co/**", r => r.abort());

  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction((g) => window[g], waitForGlobal);

  async function teardown() {
    await browser.close();
    server.close();
  }

  return { page, browser, server, teardown, errors, ROOT };
}

// mkChecker: piccolo registro che accumula pass/fail con label leggibile.
// Usage: const c = mkChecker(); c.ok("label", cond, "hint opzionale");
// A fine test: process.exit(c.summary("nome suite"));
export function mkChecker() {
  const fails = [];
  const passes = [];
  function ok(label, cond, hint) {
    const sym = cond ? "PASS" : "FAIL";
    console.log(sym + " " + label + (hint ? ("\n    " + hint) : ""));
    (cond ? passes : fails).push(label);
  }
  function summary(prefix) {
    console.log("");
    if (fails.length === 0) {
      console.log(`OK ${prefix || "Test"}: ${passes.length}/${passes.length}`);
      return 0;
    }
    console.log(`FAIL ${prefix || "Test"}: ${passes.length}/${passes.length + fails.length} (FAIL: ${fails.length})`);
    fails.forEach(f => console.log("    - " + f));
    return 1;
  }
  return { ok, summary, fails, passes };
}

// Convenzione: nel tuo index.html esponi un hook globale per i test:
//   window.__app = { state, computeSomething, EMPTY_DATA };
// Così i test possono ispezionare lo stato senza CSS selectors fragili.
