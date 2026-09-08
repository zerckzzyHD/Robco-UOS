#!/usr/bin/env node
/**
 * scripts/dev-host.js — the ONE resolver for the dev server's tailnet hostname.
 *
 * ── ⛔⛤ THE EXPOSURE THIS CLOSES ─────────────────────────────────────────────
 * This machine's live tailnet hostname sat in TRACKED source on a PUBLIC remote
 * from 2026-08-24 (`838c839`, "name the tailnet host in Vite's allowedHosts")
 * until 2026-09-08 — as a functional `allowedHosts` value in `vite.config.mjs`
 * and twice more in a comment in `scripts/dev-env-marker.js`. It was found while
 * deleting three `overnight/*` branches that carried it in an acceptance
 * receipt; the branches were the small half of the problem, and `dev` was the
 * large one.
 *
 * ⭐ THE FIX REMOVES THE CLASS, NOT THE INSTANCE (owner ruling 2026-09-08,
 * option (a)). A machine identifier does not belong in a public repository at
 * all, so the value moves OUT of tracked source and the tracked file carries a
 * placeholder that names where the real one lives. Rotating the machine's
 * tailnet name, adding a second dev origin, or handing this repo to a second
 * machine now all cost one untracked file rather than a commit.
 *
 * ⛔ THE PAST IS NOT REWRITTEN. The hostname stays in this repository's history
 * and in every existing clone, deliberately: rewriting shared history breaks
 * every clone and every commit reference, for a benefit this change does not
 * claim. What changes is that the value stops accumulating publicly from here
 * on. ⚠ The severity that makes that trade acceptable is stated rather than
 * assumed: a `*.ts.net` MagicDNS name resolves ONLY inside the owner's private
 * tailnet, is never funnelled to the public internet, and grants nothing to
 * somebody who learns it. This is hygiene, not an incident.
 *
 * ── RESOLUTION ORDER, and why a FILE is the primary ──────────────────────────
 *   1. `ROBCO_DEV_HOST` — comma-separated, matches the `ROBCO_*` override
 *      convention `planning-paths.js` already uses (`ROBCO_PLANNING_DIR`,
 *      `ROBCO_REPORTS_DIR`). This is the CI/test door.
 *   2. `dev-host.local.json` at the repo root — gitignored, machine-local, same
 *      DNA as `.mcp.json`: absent by design on a public clone.
 *        { "allowedHosts": ["your-machine.tailXXXXXX.ts.net"] }
 *
 * ⚠ THE FILE IS THE PRIMARY AND THE ENV IS THE OVERRIDE, which is the opposite
 * of the usual instinct — because THE DEV SERVER IS STARTED BY A LOGON TRIGGER
 * (`npm run dev:autostart`, scheduled task). A value living only in a shell
 * environment is absent from that process, so an env-only design would work
 * perfectly when the owner starts the server by hand and fail silently at every
 * reboot — and surviving a reboot is this server's stated acceptance test.
 *
 * ── ⛔ THREE-VALUED, AND IT NEVER GUESSES A HOST ─────────────────────────────
 * `{ok:true, hosts, source}` or `{ok:false, why}`. There is deliberately NO
 * fallback host. A wrong `allowedHosts` entry does not fail loudly — Vite serves
 * happily and the phone gets a "Blocked request" page, which reads as a network
 * problem and has already cost this project a debugging session. Refusing to
 * start names the cause in one line instead.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCAL_FILE = 'dev-host.local.json';
const LOCAL_PATH = path.join(ROOT, LOCAL_FILE);

/**
 * A hostname this resolver will accept. Deliberately strict: letters, digits,
 * dots and hyphens only, no scheme, no port, no path, no wildcard.
 *
 * ⛔ A WILDCARD IS REFUSED RATHER THAN PASSED THROUGH. `allowedHosts` exists to
 * name what is trusted; `*` or `true` disables Vite's DNS-rebinding protection
 * entirely. Letting one arrive through an untracked file would move that
 * decision somewhere nobody reviews — the config's own comment already forbids
 * it, and this makes the ban structural rather than advisory.
 */
const HOST_RE =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

/** The placeholder the tracked config carries. Never a usable host. */
const PLACEHOLDER = '<your-machine>.tailnet.ts.net';

function clean(list, source) {
  const hosts = [];
  for (const raw of list) {
    const h = String(raw || '').trim();
    if (!h) continue;
    if (h === PLACEHOLDER) {
      return {
        ok: false,
        why:
          `${source} still holds the placeholder ${PLACEHOLDER} — that is the tracked ` +
          `example, not a hostname. Put this machine's real tailnet name there.`,
      };
    }
    if (h === '*' || h === 'true' || h.includes('*')) {
      return {
        ok: false,
        why:
          `${source} contains "${h}". A wildcard disables Vite's DNS-rebinding ` +
          `protection instead of naming what is trusted, and is refused here.`,
      };
    }
    if (!HOST_RE.test(h)) {
      return {
        ok: false,
        why: `${source} contains "${h}", which is not a bare hostname (no scheme, port or path).`,
      };
    }
    hosts.push(h);
  }
  if (!hosts.length) return { ok: false, why: `${source} named no hostname.` };
  return { ok: true, hosts, source };
}

/**
 * Resolve the dev origin's allowed hosts.
 * @returns {{ok:true, hosts:string[], source:string}|{ok:false, why:string}}
 */
function resolveDevHosts() {
  const env = process.env.ROBCO_DEV_HOST;
  if (env !== undefined && String(env).trim() !== '') {
    return clean(String(env).split(','), 'ROBCO_DEV_HOST');
  }
  let text;
  try {
    text = fs.readFileSync(LOCAL_PATH, 'utf8');
  } catch {
    return {
      ok: false,
      why: `no ${LOCAL_FILE} at the repository root and ROBCO_DEV_HOST is unset`,
    };
  }
  let doc;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    return { ok: false, why: `${LOCAL_FILE} is not valid JSON (${e.message})` };
  }
  const list = doc && Array.isArray(doc.allowedHosts) ? doc.allowedHosts : null;
  if (!list) {
    return { ok: false, why: `${LOCAL_FILE} has no "allowedHosts" array` };
  }
  return clean(list, LOCAL_FILE);
}

/**
 * The refusal message, as the operator should read it. One paragraph, the fix
 * spelled out, no stack trace — the reader is somebody whose phone stopped
 * working, not somebody debugging this file.
 */
function refusalMessage(why) {
  return [
    '',
    '  THE DEV SERVER WILL NOT START: its tailnet hostname is not configured.',
    '',
    `  ${why}`,
    '',
    `  This value is deliberately NOT in tracked source — it names this machine, and`,
    '  this repository is public. Create the file at the repository root:',
    '',
    `    ${LOCAL_FILE}`,
    '    { "allowedHosts": ["your-machine.tailXXXXXX.ts.net"] }',
    '',
    '  Find the name with `tailscale status` (or `tailscale serve status`); it is the',
    '  MagicDNS name this machine answers to inside your tailnet. The file is',
    '  gitignored, so it stays on this machine.',
    '',
    '  One-off alternative: ROBCO_DEV_HOST=your-machine.tailXXXXXX.ts.net npm run dev',
    '',
    '  ⛔ There is no default. A wrong hostname does not fail loudly — Vite serves and',
    '  the phone gets a "Blocked request" page that reads like a network fault, so this',
    '  refuses rather than guessing.',
    '',
  ].join('\n');
}

module.exports = {
  resolveDevHosts,
  refusalMessage,
  LOCAL_FILE,
  LOCAL_PATH,
  PLACEHOLDER,
  HOST_RE,
};
