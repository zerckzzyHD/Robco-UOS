#!/usr/bin/env node
/**
 * scripts/release-receipt.js — the minimal RELEASE RECEIPT (G-review CLAIM M).
 *
 * "Pushed ≠ live." Everything the gate verifies answers *"is the repository
 * correct?"* — NOT *"did the user actually receive it?"* The two can disagree
 * while the gate stays green, and they already have: a service worker silently
 * failed to install because sw.js precached an index.html that redirected, so
 * "REBOOT TERMINAL" did nothing and users sat on stale code under a green gate
 * (the worst-ever bug class — a silent stale SW).
 *
 * This is the MINIMAL served-truth check: fetch the LIVE production build and
 * assert the served CACHE_NAME (from sw.js) and served APP_VERSION (from
 * js/core/state.js) match the values in the repo at the deployed commit. A
 * mismatch means production is NOT serving what was pushed.
 *
 * ── IT IS A MANUAL POST-DEPLOY COMMAND, NOT A GATE STEP. ──────────────────────
 * By definition this can only run AFTER a deploy has gone live — the code is not
 * on prod at push time, so it cannot be a pre-push/CI gate step (there would be
 * nothing to fetch). It also needs outbound network the gate sandbox is not
 * guaranteed to have. So it is wired as `npm run release-receipt`, run by the
 * owner/Dispatch after a release. What IS gate-tested is the pure compare core
 * below (Suite 245, red-then-green) — no network required.
 *
 * ── IT IS THE FOUNDATION the 2.9.0 hardening-gate "Post-deploy TRUTH" item
 *    EXTENDS (Protocol 22), not a parallel implementation. That item adds the
 *    behavioral half this one deliberately omits: proving the SW actually
 *    installed/activated (not just that the file is served), an offline smoke,
 *    and — critically — SURFACING an install/update failure to the USER in-app,
 *    not just a log. This check owns the served-hash comparison; that item builds
 *    on top of it. See QUEUE.md item G + the 2.9.0 "Post-deploy TRUTH" note.
 *
 * ── THE AUTHORITY BOUNDARY STAYS WITH THE OWNER. This check proves the bytes on
 *    prod match the commit. It CANNOT prove the parts only a real device shows:
 *    an installed-PWA actually upgrading, a real save surviving, auth still
 *    working. The receipt names those explicitly and leaves them to the owner —
 *    it never fakes a verdict it cannot earn.
 *
 * Usage:
 *   npm run release-receipt
 *   npm run release-receipt -- --url https://zerckzzyHD.github.io/Robco-UOS/
 *   npm run release-receipt -- --expect-cache robco-terminal-v2.8.5-r8 --expect-version 2.8.5
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DEFAULT_PROD_URL = 'https://zerckzzyHD.github.io/Robco-UOS/';

// ── Pure extractors (unit-tested; no I/O) ─────────────────────────────────────
// Both markers are authored the same way in sw.js and js/core/state.js, and the
// production build (scripts/prod-strip-devshell.mjs) leaves BOTH intact — it only
// strips the dev-only Diagnostic Shell — so the served files carry the same
// literals as the repo at the deployed commit.
function extractCacheName(swText) {
  const m = /CACHE_NAME\s*=\s*['"]([^'"]+)['"]/.exec(String(swText));
  return m ? m[1] : null;
}
function extractAppVersion(stateText) {
  const m = /(?:const\s+)?APP_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(String(stateText));
  return m ? m[1] : null;
}

// ── Pure compare core (the gate-tested heart, Suite 245) ──────────────────────
// Given served vs expected values, decide the verdict. A null served value means
// the marker could not be extracted from the fetched file — treated as a FAIL
// (we could not confirm what prod is serving), never a silent pass.
function compareReceipt({ servedCache, servedVersion, expectedCache, expectedVersion }) {
  const cacheMatch = servedCache != null && servedCache === expectedCache;
  const versionMatch = servedVersion != null && servedVersion === expectedVersion;
  const mismatches = [];
  if (!cacheMatch) {
    mismatches.push(
      `CACHE_NAME: served ${servedCache == null ? '(not found)' : `"${servedCache}"`} ≠ expected "${expectedCache}"`
    );
  }
  if (!versionMatch) {
    mismatches.push(
      `APP_VERSION: served ${servedVersion == null ? '(not found)' : `"${servedVersion}"`} ≠ expected "${expectedVersion}"`
    );
  }
  return { ok: cacheMatch && versionMatch, cacheMatch, versionMatch, mismatches };
}

// ── Pure receipt formatter (unit-tested) ──────────────────────────────────────
function buildReceipt(f) {
  const line = '─'.repeat(60);
  const bar = '═'.repeat(60);
  const tick = b => (b ? '[MATCH]' : '[✗ MISMATCH]');
  const verdict = f.result.ok
    ? '✅ LIVE — production is serving the pushed build.'
    : '✗ MISMATCH — production is NOT serving what was pushed.\n' +
      '     This is the silent-stale-SW class. Do NOT tell users it is live —\n' +
      '     investigate the deploy / service-worker update first.';
  return [
    bar,
    '  ROBCO U.O.S. — RELEASE RECEIPT',
    bar,
    `  Release tag      : ${f.tag || '(untagged)'}`,
    `  Source commit    : ${f.commit || '(unknown)'}`,
    `  Production URL   : ${f.url}`,
    line,
    `  Served CACHE_NAME  : ${f.servedCache == null ? '(not found)' : f.servedCache}  ${tick(f.result.cacheMatch)}`,
    `  Expected           : ${f.expectedCache}`,
    `  Served APP_VERSION : ${f.servedVersion == null ? '(not found)' : f.servedVersion}  ${tick(f.result.versionMatch)}`,
    `  Expected           : ${f.expectedVersion}`,
    line,
    `  VERDICT: ${verdict}`,
    line,
    '  STILL ONLY YOU CAN VERIFY (on a real device — this check cannot):',
    '   • The installed PWA actually upgraded (REBOOT TERMINAL took effect)',
    '   • A real saved campaign survived the upgrade',
    '   • Sign-in / cloud auth still works',
    bar,
  ].join('\n');
}

module.exports = { extractCacheName, extractAppVersion, compareReceipt, buildReceipt };

// ── I/O + CLI (only when run directly, never on require) ──────────────────────
if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    const argOf = name => {
      const i = argv.indexOf(name);
      return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
    };

    let url = argOf('--url') || DEFAULT_PROD_URL;
    if (!url.endsWith('/')) url += '/';

    // Expected values: explicit overrides, else the local repo (which, run right
    // after a release, IS the deployed commit).
    const expectedCache =
      argOf('--expect-cache') ||
      extractCacheName(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'));
    const expectedVersion =
      argOf('--expect-version') ||
      extractAppVersion(fs.readFileSync(path.join(ROOT, 'js', 'core', 'state.js'), 'utf8'));

    // Deployed-commit provenance (best-effort — never fatal).
    const gitOut = (args, fallback) => {
      const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
      return r.status === 0 ? r.stdout.trim() : fallback;
    };
    const commit = argOf('--commit') || gitOut(['rev-parse', '--short', 'HEAD'], '(unknown)');
    const tag = argOf('--tag') || gitOut(['describe', '--tags', '--exact-match'], '(untagged)');

    // Fetch a served file with caching defeated (query nonce + no-store) and a
    // hard timeout, so a slow/absent host fails cleanly instead of hanging.
    const fetchText = async rel => {
      const nonce = Date.now();
      const target = new URL(rel + '?_rr=' + nonce, url).toString();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(target, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${target}`);
        return await res.text();
      } finally {
        clearTimeout(timer);
      }
    };

    let servedCache = null;
    let servedVersion = null;
    try {
      servedCache = extractCacheName(await fetchText('sw.js'));
      servedVersion = extractAppVersion(await fetchText('js/core/state.js'));
    } catch (e) {
      console.error(
        `\n[release-receipt] Could not reach production at ${url}\n` +
          `  ${e.message}\n` +
          `  Cannot verify served build — this is a manual post-deploy command and needs network.\n` +
          `  Retry after the deploy is live, or pass --url for a custom domain.\n`
      );
      process.exit(2); // 2 = UNREACHABLE (distinct from 1 = MISMATCH)
    }

    const result = compareReceipt({ servedCache, servedVersion, expectedCache, expectedVersion });
    console.log(
      '\n' +
        buildReceipt({
          tag,
          commit,
          url,
          servedCache,
          servedVersion,
          expectedCache,
          expectedVersion,
          result,
        }) +
        '\n'
    );
    process.exit(result.ok ? 0 : 1); // 1 = MISMATCH
  })();
}
