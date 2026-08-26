#!/usr/bin/env node
/**
 * scripts/dev-autostart.js — install/remove a LOGON trigger for the dev server.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * The dev server is what puts the terminal, and the private reports, on a phone
 * over the tailnet. It was a hand-started background process, so it was gone
 * after every reboot and every logon until somebody remembered to start it —
 * and the person who needed it was on a phone, away from the machine, with no
 * way to remember anything. The owner's requirement is that it be there when he
 * needs it, not that he learn to summon it.
 *
 * ── ⛔ WHAT THIS DELIBERATELY IS NOT ────────────────────────────────────────
 *  · NOT A TIMER. One trigger, at logon. It fires once per logon and then it is
 *    over. There is no interval, no polling, and nothing that runs while nobody
 *    is logged in.
 *  · NOT A SUPERVISOR, AND NOT A RESTART LOOP. If the server exits — including
 *    because somebody stopped it on purpose — nothing brings it back until the
 *    next logon. A process that resurrects itself is worse than one that stays
 *    down: it overrides a deliberate decision, and it turns "I stopped it" into
 *    a fight. Stopping it must stay possible.
 *  · NOT NEW AUTHORITY. The task runs as the logged-in user at LIMITED run level
 *    — no elevation, no SYSTEM account, no new privilege of any kind. Its whole
 *    action is to run this repo's own `dev-server.js start`.
 *  · NOT A NETWORK CHANGE. It does not touch the tailnet mapping and it cannot
 *    widen exposure: what it starts is a loopback-bound dev server, reachable
 *    from outside this machine only through the tailnet proxy that already
 *    existed. ⛔ `tailscale funnel` is forbidden on this project and nothing here
 *    goes near it.
 *
 * ── IT CANNOT FIGHT A HAND-STARTED SERVER, AND THAT IS INHERITED, NOT REBUILT ─
 * The action is `dev-server.js start`, which already refuses to touch a port it
 * did not open: it reports ALREADY RUNNING when the server is its own, and
 * REFUSED when anything else holds the port. So the logon trigger cannot kill,
 * restart, or displace a server somebody started by hand — that guarantee lives
 * in one place and this reuses it rather than writing a second copy that could
 * disagree with it.
 *
 * ── REMOVAL IS ONE COMMAND, AND THAT IS A RULE ──────────────────────────────
 * `npm run dev:autostart:off`. ⭐ Reducing machine state must never be harder
 * than adding it: persistent state that is easy to create and awkward to remove
 * accumulates until nobody can say what is running or why.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IS_WINDOWS = process.platform === 'win32';

/**
 * ⚠ THE MECHANISM IS THE PER-USER STARTUP FOLDER, AND THAT WAS MEASURED, NOT
 * PREFERRED. The obvious tool is Task Scheduler, and it was tried first: every
 * `schtasks /Create` variant — with no `/RU`, with `/RU <user>`, with
 * `/RU <domain>\<user>` — returns `ERROR: Access is denied` on this machine
 * without elevation. Registering a scheduled task here needs admin, and ⛔ this
 * change is not allowed to acquire authority it did not have.
 *
 * The Startup folder needs none. It lives under the user's own profile, runs as
 * that user at logon, and is per-user by construction — there is no way for it
 * to affect anybody else or to run while nobody is logged in. It is also the
 * most REMOVABLE form this could take: one file, deleted by one command, and a
 * human can see it in Explorer without any tooling at all.
 */
const TASK_NAME = 'RobCo-dev-server-logon.vbs';

function startupDir() {
  const appData = process.env.APPDATA;
  if (!IS_WINDOWS || !appData) return null;
  return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
}

function triggerFile() {
  const dir = startupDir();
  return dir ? path.join(dir, TASK_NAME) : null;
}

/**
 * A short delay after logon before the server starts. The dev server also
 * re-ensures the tailnet proxy, and at logon the network stack and Tailscale are
 * usually still coming up; starting into that race is how the proxy ends up
 * unset on exactly the boots nobody is watching. Thirty seconds is not a fix for
 * a race — it is a cheap way to lose it far less often, and a proxy that failed
 * to set is visible in `dev:status` either way.
 */
const LOGON_DELAY_MS = 30000;

/** The exact command the trigger runs — this repo's own start command. */
function actionCommand() {
  return `"${process.execPath}" "${path.join(ROOT, 'scripts', 'dev-server.js')}" start`;
}

/**
 * The launcher, written as VBScript purely so the logon start is SILENT: `Run`
 * with window style 0 opens no console. A `.cmd` here would flash a black window
 * across the desktop at every logon, which is the kind of small daily annoyance
 * that gets a useful thing deleted.
 *
 * ⛔ IT RUNS EXACTLY ONE COMMAND AND THEN EXITS. No loop, no retry, no watchdog:
 * if the server later stops — including because somebody stopped it — nothing
 * here notices or intervenes until the next logon.
 */
function launcherScript() {
  return [
    "' RobCo dev server — logon start. Generated by scripts/dev-autostart.js.",
    "' Remove with: npm run dev:autostart:off  (or just delete this file)",
    "' Runs ONE command, hidden, then exits. It never retries and never loops.",
    'WScript.Sleep ' + LOGON_DELAY_MS,
    'CreateObject("WScript.Shell").Run ' + vbQuote(actionCommand()) + ', 0, False',
    '',
  ].join('\r\n');
}

/** VBScript string literal: the only escape is a doubled double-quote. */
function vbQuote(s) {
  return '"' + String(s).replace(/"/g, '""') + '"';
}

/**
 * Is the trigger installed? Returns {installed, detail}. Never throws: anything
 * it cannot determine reports "unknown" rather than claiming absence — a
 * confident "not installed" that is really "I could not tell" is the kind of
 * answer that gets acted on.
 */
function triggerStatus() {
  if (!IS_WINDOWS) return { installed: false, detail: 'not supported on this platform' };
  const f = triggerFile();
  if (!f) return { installed: null, detail: 'could not locate the Startup folder' };
  try {
    if (!fs.existsSync(f)) return { installed: false, detail: 'not installed' };
    const body = fs.readFileSync(f, 'utf8');
    // ⚠ Reported as STALE rather than installed when it points somewhere else —
    // a trigger for a different checkout is not this one working.
    const points = body.includes(path.join(ROOT, 'scripts', 'dev-server.js'));
    return {
      installed: true,
      stale: !points,
      detail: points ? f : f + ' — ⚠ points at a DIFFERENT checkout',
    };
  } catch (e) {
    return { installed: null, detail: 'could not be read: ' + (e && e.message) };
  }
}

function cmdInstall() {
  console.log('');
  console.log('RobCo dev server -- logon trigger: install');
  console.log('');
  if (!IS_WINDOWS) {
    console.log('  status      : NOT SUPPORTED on ' + os.platform() + ' (Windows Startup folder).');
    return 1;
  }
  const f = triggerFile();
  if (!f) {
    console.log('  status      : FAILED -- could not locate the Startup folder.');
    return 1;
  }
  try {
    fs.writeFileSync(f, launcherScript(), 'utf8');
  } catch (e) {
    console.log('  status      : FAILED');
    console.log('  ' + ((e && e.message) || ''));
    return 1;
  }
  console.log('  status      : INSTALLED');
  console.log('  file        : ' + f);
  console.log(
    '  runs        : at logon, ' + LOGON_DELAY_MS / 1000 + 's after, as you, unelevated, hidden'
  );
  console.log('  action      : ' + actionCommand());
  console.log('');
  console.log('  It starts the dev server and nothing else. It will NOT restart a');
  console.log('  server you stop on purpose, and it will NOT take a port something');
  console.log('  else is already using.');
  console.log('');
  console.log('  remove      : npm run dev:autostart:off');
  return 0;
}

function cmdUninstall() {
  console.log('');
  console.log('RobCo dev server -- logon trigger: remove');
  console.log('');
  const before = triggerStatus();
  if (before.installed === false) {
    console.log('  status      : NOT INSTALLED -- nothing to remove.');
    return 0;
  }
  const f = triggerFile();
  try {
    fs.unlinkSync(f);
  } catch (e) {
    console.log('  status      : FAILED');
    console.log('  ' + ((e && e.message) || ''));
    return 1;
  }
  console.log('  status      : REMOVED (' + f + ')');
  console.log('  note        : a running dev server is left alone -- this removes the');
  console.log('                trigger, not the server. Stop that with npm run dev:stop.');
  return 0;
}

function cmdStatus() {
  const s = triggerStatus();
  console.log('');
  console.log('RobCo dev server -- logon trigger: status');
  console.log('');
  console.log(
    '  trigger     : ' +
      (s.installed === true ? 'INSTALLED' : s.installed === false ? 'not installed' : 'UNKNOWN')
  );
  console.log('  task        : ' + TASK_NAME);
  console.log('  detail      : ' + s.detail);
  console.log('');
  console.log(
    s.installed === true
      ? '  remove : npm run dev:autostart:off'
      : '  install: npm run dev:autostart'
  );
  return 0;
}

function usage() {
  console.log('');
  console.log('Usage: node scripts/dev-autostart.js <install|uninstall|status>');
  console.log('');
  console.log('  install    start the dev server automatically at logon');
  console.log('  uninstall  remove that trigger (one command, by design)');
  console.log('  status     report whether the trigger is installed');
  console.log('');
  return 1;
}

async function main() {
  const cmd = (process.argv[2] || '').toLowerCase();
  if (cmd === 'install') return cmdInstall();
  if (cmd === 'uninstall' || cmd === 'off' || cmd === 'remove') return cmdUninstall();
  if (cmd === 'status') return cmdStatus();
  return usage();
}

module.exports = {
  TASK_NAME,
  triggerStatus,
  triggerFile,
  actionCommand,
  launcherScript,
  LOGON_DELAY_MS,
};

if (require.main === module) {
  main().then(code => process.exit(code));
}
