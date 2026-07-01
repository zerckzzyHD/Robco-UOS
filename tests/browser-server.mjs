/**
 * tests/browser-server.mjs — one shared Chromium for the gate's browser checks
 *
 * Launched once by scripts/gate.js before the browser-check block (audit #8).
 * It starts a single Chromium via chromium.launchServer() and writes the
 * server's ws endpoint to the file path given as argv[2]. gate.js reads that
 * endpoint, exports it as PW_WS_ENDPOINT, and runs boot-smoke / render-check /
 * a11y / test-html-check — each connects to THIS browser instead of launching
 * its own (4 cold Chromium launches → 1).
 *
 * Lifecycle: the process stays alive until the parent gate exits. gate.js holds
 * this process's stdin; when the gate finishes (or dies), that pipe closes and
 * we shut the browser down — no orphaned Chromium. SIGTERM/SIGINT also trigger a
 * clean shutdown.
 *
 * Run standalone: node tests/browser-server.mjs <endpoint-file>
 */

import { chromium } from 'playwright';
import fs from 'fs';

const endpointFile = process.argv[2];
if (!endpointFile) {
  console.error('browser-server: an endpoint-file path argument is required');
  process.exit(1);
}

const server = await chromium.launchServer();

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  try {
    await server.close();
  } catch {
    /* already gone */
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// The parent (gate.js) owns our stdin. When it exits, the pipe closes and we
// tear the shared browser down — guaranteeing no orphaned Chromium process.
process.stdin.on('close', shutdown);
process.stdin.on('end', shutdown);
process.stdin.resume();

// Publish the endpoint last, so the file only appears once the browser is ready.
fs.writeFileSync(endpointFile, server.wsEndpoint(), 'utf8');
