#!/usr/bin/env node
/**
 * scripts/projection-view.js — runs the EXTERNAL read-only projection renderer
 * for the dev server's `/view` route, and hands back what it printed.
 *
 * ── WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT ────────────────────────────
 * The control-plane projection (a read-only page that renders operational state
 * and can say it does not know) is built and owned by a SEPARATE, private
 * repository. This module does not import it, copy it, or know its layout. The
 * whole contract is one command line: run the configured script with a format
 * flag, read its standard output, put that in a response body. Nothing else
 * crosses the boundary, so neither repository can reach into the other.
 *
 * ── ⛔ CONFIGURED ONLY — NO DEFAULT LOCATION, BY DESIGN ──────────────────────
 * Same rule as `control-state.js`: this repository is PUBLIC, and the renderer
 * lives in a private tree whose name and layout should not be discoverable from
 * here. `ROBCO_VIEW_RENDERER` names the script; unset means the route answers
 * "not configured", in plain text, never with the app.
 *
 * ── ⭐ A FRESH PROCESS PER REQUEST, WHICH IS THE POINT ─────────────────────────
 * The projection's one job is to never present a stale reading as a current one.
 * Spawning the renderer per request means every visit reads the state anew, and
 * even an edit to the renderer itself is live on the next request — stronger than
 * the module-cache clearing the other dev routes do, and with nothing to clear.
 * Costed: one Node start plus one render, on the order of a hundred milliseconds,
 * for a page one person opens by hand.
 *
 * ── ⛔ READ-ONLY, STRUCTURALLY ────────────────────────────────────────────────
 * This module has no filesystem write path (one `statSync` to check the script
 * exists). The renderer prints to stdout and is given no argument that reaches a
 * filesystem. The route that calls this accepts GET and HEAD only.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

/** The formats the route offers, and the flag each one passes. */
const FORMATS = Object.freeze({
  html: { args: ['--html', '--refresh=60'], type: 'text/html; charset=utf-8' },
  json: { args: ['--json'], type: 'application/json; charset=utf-8' },
  txt: { args: ['--text'], type: 'text/plain; charset=utf-8' },
});

/** A render that takes longer than this is reported as a timeout, never waited on. */
const TIMEOUT_MS = 15000;
/** Upper bound on what a render may print. The real page is tens of kilobytes. */
const MAX_BYTES = 32 * 1024 * 1024;

const PLAIN = 'text/plain; charset=utf-8';

function safeIsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Absolute path to the renderer script, or null. Never throws. */
function rendererPath() {
  const configured = process.env.ROBCO_VIEW_RENDERER;
  if (!configured) return null;
  return safeIsFile(configured) ? path.resolve(configured) : null;
}

function available() {
  return rendererPath() !== null;
}

/** One line saying WHICH case this machine is in. ⛔ Names no path. */
function describe() {
  if (rendererPath()) return 'projection renderer configured';
  return process.env.ROBCO_VIEW_RENDERER
    ? 'ROBCO_VIEW_RENDERER is set but does not name a readable file'
    : 'ROBCO_VIEW_RENDERER is not set';
}

/**
 * Run the renderer for one format.
 *
 * @param {'html'|'json'|'txt'} format
 * @returns {Promise<{ok:boolean, status:number, type:string, body:string}>}
 *   Never rejects. A failure is a plain-text body with the reason, so the route
 *   can send it as-is; the status is 404 (not configured / no such format), 500
 *   (the renderer failed or printed nothing) or 504 (it did not finish in time).
 *   ⛔ Nothing here ever falls back to a previous render — there is none.
 */
function render(format) {
  const spec = FORMATS[format];
  const script = rendererPath();
  return new Promise(resolve => {
    if (!spec) {
      return resolve({ ok: false, status: 404, type: PLAIN, body: 'no such format.\n' });
    }
    if (!script) {
      return resolve({
        ok: false,
        status: 404,
        type: PLAIN,
        body:
          'no projection renderer is configured on this server.\n\n' +
          describe() +
          '. There is no default location and this route will not guess one.\n',
      });
    }
    execFile(
      process.execPath,
      [script, ...spec.args],
      { timeout: TIMEOUT_MS, maxBuffer: MAX_BYTES, windowsHide: true, encoding: 'utf8' },
      (err, stdout, stderr) => {
        if (err) {
          const timedOut = err.killed === true || err.signal === 'SIGTERM';
          return resolve({
            ok: false,
            status: timedOut ? 504 : 500,
            type: PLAIN,
            body:
              (timedOut
                ? 'the projection renderer did not finish within ' + TIMEOUT_MS + ' ms.\n'
                : 'the projection renderer failed (exit ' + String(err.code) + ').\n') +
              (stderr ? '\n' + String(stderr).slice(0, 4000) + '\n' : ''),
          });
        }
        if (!stdout || !stdout.length) {
          return resolve({
            ok: false,
            status: 500,
            type: PLAIN,
            body:
              'the projection renderer produced no output.\n' +
              (stderr ? '\n' + String(stderr).slice(0, 4000) + '\n' : ''),
          });
        }
        resolve({ ok: true, status: 200, type: spec.type, body: stdout });
      }
    );
  });
}

module.exports = { render, available, describe, rendererPath, FORMATS, TIMEOUT_MS };
