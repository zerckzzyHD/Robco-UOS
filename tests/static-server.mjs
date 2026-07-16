/**
 * tests/static-server.mjs — shared minimal static file server for browser tests
 *
 * Extracted from boot-smoke.mjs (Protocol 22 — one server, not a copy per test)
 * so every Playwright check that needs the app over real HTTP (boot-smoke,
 * offline-first, …) serves it the same way. HTTP (not file://) matters because
 * ES modules, fetch, AND the service worker all require a real origin — and the
 * service worker in particular only registers in a secure context, which
 * http://127.0.0.1 satisfies (loopback is treated as secure). That is what makes
 * the offline-first test's cache-then-go-offline path exercisable at all.
 *
 * Usage:
 *   import { startStaticServer } from './static-server.mjs';
 *   const srv = await startStaticServer(ROOT);   // { baseUrl, port, close }
 *   await page.goto(srv.baseUrl);
 *   ...
 *   srv.close();
 */

import path from 'path';
import fs from 'fs';
import http from 'http';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
};

/**
 * Start a minimal static file server rooted at `root`, bound to a random free
 * loopback port. Resolves to { baseUrl, port, close }.
 */
export async function startStaticServer(root) {
  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0].split('#')[0];
    const filePath = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath));
    // Directory-traversal guard: never serve outside the served root.
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });
  });

  const port = await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    port,
    close: () => server.close(),
  };
}
