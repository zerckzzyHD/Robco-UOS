/**
 * tests/artifacts.mjs — CI failure-evidence capture (Health-batch U4)
 *
 * WHY THIS EXISTS. When the push/CI gate goes red — especially on one of the
 * Playwright browser checks (boot-smoke, render-check, render-integrity, a11y,
 * save-survival, offline-first) — the failure used to leave almost nothing
 * behind: the console text scrolled past in the Actions log and you had to
 * re-run the check locally to actually SEE what the page looked like. This
 * helper makes a red run diagnosable FROM THE RUN ITSELF by writing failure
 * evidence (a screenshot + the page's console log) into a known artifacts
 * directory that the CI workflow uploads on failure.
 *
 * It does NOT change what any check asserts. Everything here is passive
 * (console listeners that only collect) or fires strictly on a failure path.
 *
 * Two wiring points, both one line per harness:
 *   installFailureCapture(label) — installs process-level nets so a THROWN
 *     failure (a Playwright timeout / navigation error / detached frame that
 *     would otherwise die with just a stack trace) still screenshots every
 *     live page before exiting non-zero. This is the vanishing case U4 targets.
 *   trackBrowser(browser, label) — monkeypatches browser.newContext so EVERY
 *     context (and every page in it, now and later) is auto-wired for console
 *     capture + crash-net tracking. One call covers a whole harness, including
 *     the multi-context ones (render-check, save-survival), with no per-page
 *     edits.
 *
 * Single-page boot checks additionally call saveFailureArtifacts(label, page)
 * inside their boot-timeout catch (an assertion-fail path, not a throw) because
 * a screenshot of a blank / stuck boot is the single most useful artifact.
 *
 * Artifacts dir: process.env.ROBCO_ARTIFACTS_DIR (set by scripts/gate.js so the
 * harnesses and the gate write to the same place) or <repo>/test-artifacts.
 * It is gitignored and swept by Protocol 41 — nothing here is ever committed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const ARTIFACTS_DIR = process.env.ROBCO_ARTIFACTS_DIR
  ? path.resolve(process.env.ROBCO_ARTIFACTS_DIR)
  : path.join(ROOT, 'test-artifacts');

function slug(s) {
  return (
    String(s || 'check')
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'check'
  );
}

// Monotonic per-process counter so multiple failures in one harness produce
// distinct, ordered filenames instead of overwriting each other.
let _seq = 0;
function nextBase(label) {
  _seq += 1;
  return path.join(ARTIFACTS_DIR, `${slug(label)}-${String(_seq).padStart(2, '0')}`);
}

// Attach PASSIVE console / pageerror / requestfailed collectors to a page and
// return the buffer array. Never affects assertions — it only accumulates, and
// the buffer is only written out on a failure path. Also stashed on the page so
// the crash net can find it without the harness threading it through.
export function captureConsole(page) {
  const buf = [];
  try {
    page.on('console', m => {
      try {
        buf.push(`[console.${m.type()}] ${m.text()}`);
      } catch {
        /* a detached message — ignore */
      }
    });
    page.on('pageerror', e => buf.push(`[pageerror] ${e && e.message ? e.message : e}`));
    page.on('requestfailed', r => {
      try {
        buf.push(`[requestfailed] ${r.url()} — ${(r.failure() && r.failure().errorText) || ''}`);
      } catch {
        /* ignore */
      }
    });
    page.__robcoConsoleBuf = buf;
  } catch {
    /* a disconnected/closed page can't attach listeners — ignore */
  }
  return buf;
}

// Best-effort: write a screenshot + console dump for a failing check. NEVER
// throws — capture must never mask or replace the real failure. The screenshot
// is bounded (timeout) so a wedged page can't hang the run.
export async function saveFailureArtifacts(label, page, consoleBuf) {
  const base = nextBase(label);
  try {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
  try {
    if (page && !(page.isClosed && page.isClosed())) {
      // Anti-flake for the capture itself (Health-batch U5). A fullPage
      // screenshot of a page with a CONTINUOUSLY-repainting canvas (the CRT
      // overlay + the overseer scope, both rAF-driven) can burn the whole
      // bounded window on a slow CI runner — the reported "screenshot hangs on
      // the animated canvas" symptom. Two freezes make the capture
      // deterministic, and BOTH live only on this failure-evidence path, so
      // neither changes a single assertion anywhere:
      //   1. emulateMedia(reduced-motion) — the app's _scopeShouldAnimate() /
      //      _coreShouldAnimate() gates stop scheduling rAF within one frame, so
      //      the canvas loops go quiet. Best-effort; a tiny settle lets the
      //      in-flight frame cancel.
      //   2. animations:'disabled' — Playwright's own switch that fast-forwards
      //      CSS/Web animations to a finished frame for the capture.
      // The existing timeout:5000 stays as the hard bound: even if a freeze
      // somehow doesn't take, capture can never hang the run — it fails soft and
      // we keep the console log.
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(50);
      } catch {
        /* emulateMedia unsupported/closed — fall through, still bounded below */
      }
      await page.screenshot({
        path: `${base}.png`,
        fullPage: true,
        timeout: 5000,
        animations: 'disabled',
      });
    }
  } catch {
    /* closed / detached / wedged page — skip the screenshot, keep the log */
  }
  try {
    const buf = consoleBuf || (page && page.__robcoConsoleBuf) || [];
    if (buf.length) {
      fs.writeFileSync(`${base}.console.log`, buf.join('\n') + '\n', 'utf8');
    }
  } catch {
    /* ignore */
  }
  return base;
}

// ── Crash net ────────────────────────────────────────────────────────────────
// The vanishing case U4 targets: a Playwright call THROWS (timeout, navigation
// failure, detached frame) and the harness dies with only a stack trace and no
// page state. trackBrowser() (below) registers every live page; the nets here
// screenshot each still-open tracked page + dump its console before exiting
// non-zero. On a clean run the nets never fire.
const _tracked = new Set();

function trackPage(page, label) {
  if (!page) return page;
  try {
    page.__robcoLabel = label;
    _tracked.add(page);
    page.on('close', () => _tracked.delete(page));
  } catch {
    /* ignore */
  }
  return page;
}

// Wrap a Browser so every context it creates — and every page in that context,
// now or later — is auto-wired for console capture + crash-net tracking. One
// call per harness covers all of it, including multi-context harnesses.
export function trackBrowser(browser, label) {
  try {
    const orig = browser.newContext.bind(browser);
    browser.newContext = async (...args) => {
      const ctx = await orig(...args);
      try {
        ctx.on('page', p => {
          captureConsole(p);
          trackPage(p, label);
        });
      } catch {
        /* ignore */
      }
      return ctx;
    };
  } catch {
    /* ignore — capture wiring must never break the harness */
  }
  return browser;
}

let _installed = false;
let _firing = false;
export function installFailureCapture(label) {
  if (_installed) return;
  _installed = true;
  const handler = async err => {
    if (_firing) return; // one error can surface as both events — capture once
    _firing = true;
    try {
      console.error(
        `\n  [FAIL] ${label}: uncaught failure — capturing evidence to ${ARTIFACTS_DIR}`
      );
      console.error('  ' + (err && err.stack ? err.stack : String(err)));
      for (const page of _tracked) {
        await saveFailureArtifacts(page.__robcoLabel || label, page, page.__robcoConsoleBuf);
      }
    } catch {
      /* capture must never mask the failure */
    }
    process.exit(1);
  };
  process.on('unhandledRejection', handler);
  process.on('uncaughtException', handler);
}
