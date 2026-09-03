#!/usr/bin/env node
'use strict';
/**
 * scripts/dev-server.js -- one-step start / stop / status for the local Vite dev server.
 *
 * WHY THIS EXISTS. Starting the phone-testable dev server used to be a five-step ritual
 * over SSH: open a tab, cd, run npm, leave the tab open FOREVER, then a second tab for
 * the tailscale proxy. Three things made that fragile, all measured rather than assumed:
 *
 *   1. `npm` fails over SSH -- PowerShell's execution policy blocks npm.ps1, so this
 *      script spawns `npm.cmd` explicitly. (An execution policy is a security setting,
 *      and is NOT the thing to change to fix a wrapper-script choice.)
 *   2. The dev server died with the SSH tab, because it was a foreground child of that
 *      session sharing its console. It is now spawned DETACHED (DETACHED_PROCESS on
 *      Windows) with stdio redirected to a log file and the handle unref'd, so it has no
 *      console to be torn down with and survives the tab closing.
 *   3. The `tailscale serve` config was lost when a tab closed, despite --bg. So `start`
 *      RE-ENSURES the proxy every time rather than assuming it survived.
 *
 * IDEMPOTENT BY DESIGN. Running `start` twice must not leave two servers fighting over
 * one port -- that is how you get a stale page and no idea why. So `start` detects a live
 * server and no-ops, and refuses outright when the port is held by something it did not
 * start. Vite is given --strictPort for the same reason: without it Vite slides quietly
 * to the next free port, and the tailnet proxy -- pinned to one port -- would 502 with
 * nothing obviously wrong.
 *
 * THE BRANCH IS REPORTED, NEVER CHANGED. `dev` is kept checked out deliberately, so work
 * can be tested before it reaches main. This script prints the current branch and warns
 * loudly when it is not `dev`. It NEVER checks out, switches or stashes anything -- the
 * repo state belongs to whoever is working in it.
 *
 * WHAT IT SURVIVES, AND WHAT IT DOES NOT (printBounds() prints the live, measured
 * version of this): the SSH tab closing (detached). A REBOOT, once the logon trigger
 * (`npm run dev:autostart`) is installed — it comes back at the next logon. SLEEP on
 * this machine — the only standby state is S0 low-power idle, which keeps the process;
 * only the network drops (Suite 249.8). What genuinely ends it: HIBERNATE (waking from
 * hibernate is not a logon, so the trigger cannot cover it), and a hand stop. What
 * makes the URL dead while the process lives: Tailscale dropping, or the network in
 * standby. ⛔ This header used to say flatly "does not survive a reboot or sleep" —
 * both false since the trigger and the sleep measurement, corrected 2026-09-03; a
 * stale caveat is believed, so printBounds() derives its text rather than trusting this.
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_PORT = 5173;
const EXPECTED_BRANCH = 'dev';

// Runtime state lives in the OS temp dir, NOT the repo: a stray *.log at the project root
// fails the Protocol 41 junk sweep (Suite 98), and none of this is worth tracking.
const STATE_DIR = path.join(os.tmpdir(), 'robco-dev-server');
const PID_FILE = path.join(STATE_DIR, 'dev-server.json');
const LOG_FILE = path.join(STATE_DIR, 'dev-server.log');

const IS_WINDOWS = process.platform === 'win32';

function sh(cmd, args, opts) {
  return spawnSync(cmd, args, Object.assign({ encoding: 'utf8', cwd: ROOT }, opts || {}));
}

function currentBranch() {
  const r = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (r.status !== 0 || !r.stdout) return null;
  return r.stdout.trim();
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(PID_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function clearState() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    /* already gone */
  }
}

function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0); // signal 0 is an existence probe -- it kills nothing
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // alive, just not ours to signal
  }
}

function portOpen(port) {
  return new Promise(resolve => {
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = ok => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(1000);
    sock.on('connect', () => done(true));
    sock.on('error', () => done(false));
    sock.on('timeout', () => done(false));
  });
}

async function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portOpen(port)) return true;
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
}

function tailLog(lines) {
  try {
    return fs.readFileSync(LOG_FILE, 'utf8').split(/\r?\n/).filter(Boolean).slice(-lines);
  } catch {
    return [];
  }
}

// The tailnet hostname is read back out of vite.config.mjs rather than repeated here.
// One source of truth: a second copy is how two records of one thing start to disagree.
function tailnetHost() {
  try {
    const src = fs.readFileSync(path.join(ROOT, 'vite.config.mjs'), 'utf8');
    const m = /allowedHosts:\s*\[\s*'([^']+)'/.exec(src);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function tailscaleBin() {
  const onPath = sh(IS_WINDOWS ? 'where' : 'which', ['tailscale']);
  if (onPath.status === 0 && onPath.stdout.trim()) return onPath.stdout.trim().split(/\r?\n/)[0];
  const fallback = 'C:/Program Files/Tailscale/tailscale.exe';
  return IS_WINDOWS && fs.existsSync(fallback) ? fallback : null;
}

function tailscale(args) {
  // HARD RULE, asserted at runtime rather than left to a comment: this script may only
  // ever drive `tailscale serve`, which stays private to the tailnet. The `funnel`
  // subcommand publishes to the OPEN INTERNET and sits inside this project's publishing
  // freeze -- it must stay unreachable from here, including through a later edit.
  if (args[0] !== 'serve') throw new Error('dev-server.js drives `tailscale serve` only');
  const bin = tailscaleBin();
  if (!bin) return { ok: false, reason: 'tailscale CLI not found on PATH' };
  const r = sh(bin, args, { cwd: undefined });
  return {
    ok: r.status === 0,
    reason: r.status === 0 ? null : (r.stderr || r.stdout || '').trim() || 'exit ' + r.status,
    out: (r.stdout || '').trim(),
  };
}

// Declarative, and therefore safe to re-run: setting the same serve config twice is a no-op.
function ensureProxy(port) {
  return tailscale(['serve', '--bg', String(port)]);
}

function proxyStatus() {
  return tailscale(['serve', 'status']);
}

// Does the live serve config actually point at THIS port? Printing a phone URL that
// really resolves to some other port is exactly the stale-page confusion to avoid --
// it looks like the server is broken when the proxy is simply aimed elsewhere.
function proxyTargetsPort(port, pre) {
  const p = pre || proxyStatus();
  // Literal match, deliberately not a RegExp: the port must be followed by a non-digit
  // so that port 517 cannot masquerade as a hit on 5173.
  const needle = '127.0.0.1:' + port;
  const out = (p && p.out) || '';
  const at = out.indexOf(needle);
  if (!p.ok || at === -1) return false;
  const next = out[at + needle.length];
  return next === undefined || !/[0-9]/.test(next);
}

function reportBranch() {
  const branch = currentBranch();
  if (!branch) {
    console.log('  branch      : (could not read git branch)');
    return;
  }
  console.log('  branch      : ' + branch);
  if (branch === EXPECTED_BRANCH) return;
  console.log('');
  console.log('  ##################################################################');
  console.log('  #  WARNING: you are NOT on `' + EXPECTED_BRANCH + '`.');
  console.log('  #');
  console.log('  #  The preview serves whatever is checked out RIGHT NOW, so it will');
  console.log('  #  show `' + branch + '`, not `' + EXPECTED_BRANCH + '`.');
  console.log('  #');
  console.log('  #  Nothing was changed for you: this script never checks out,');
  console.log('  #  switches or stashes anything. Switch branches yourself if that');
  console.log('  #  is not what you meant to test.');
  console.log('  ##################################################################');
  console.log('');
}

/**
 * ⚠ THIS TEXT IS DERIVED FROM WHETHER THE LOGON TRIGGER IS ACTUALLY INSTALLED,
 * not written once and trusted. It used to say flatly that this server does not
 * survive a reboot. With the trigger installed that is FALSE — and a stale
 * caveat is worse than no caveat, because it is believed. It is also worse than
 * an over-broad one, because the reader stops checking the cases it names.
 *
 * ⛔ THE UNCOVERED CASES ARE NAMED INDIVIDUALLY RATHER THAN SUMMARISED. "Mostly
 * covered" is the reading that gets somebody stuck on a phone with a dead URL:
 * the trigger fires at LOGON, so waking a sleeping handheld does not fire it,
 * and neither does stopping the server by hand. Those are the two most common
 * ways it will actually be down, and they stay the reader's problem.
 */
function printBounds() {
  let trigger = { installed: null };
  try {
    trigger = require('./dev-autostart.js').triggerStatus();
  } catch {
    /* the module is optional to this display; unknown is reported as unknown */
  }
  // ⚠ THE SLEEP WORDING IS MEASURED, NOT ASSUMED — and it used to be wrong in a
  // way that cost a restart every time.
  //
  // It previously said the server does not come back after "sleeping and waking".
  // That reads as "sleep kills the server", and on this class of machine it
  // usually does not. Measured with `powercfg /a`: the only standby state
  // available is S0 low-power idle — S1/S2/S3 are reported unsupported by the
  // firmware — and that state does NOT terminate processes. The same output says
  // connectivity in standby is unsupported, so the NETWORK drops. The process
  // survives and the URL does not, which is the identical shape the Tailscale line
  // below already described.
  //
  // The one case that genuinely ends it is HIBERNATION, and that is a real risk
  // here rather than a theoretical one: the hibernate-after idle timeout is
  // "never" on mains and one hour on battery, so an unplugged machine left asleep
  // does eventually lose the process — and waking from hibernate is not a logon,
  // so a logon trigger cannot cover it.
  //
  // ⛔ THE DISTINCTION MATTERS BECAUSE BOTH LOOK THE SAME FROM THE PHONE: a dead
  // page. Telling them apart is the difference between waiting a moment and
  // restarting a server that never stopped — which is why the text now points at
  // the status command instead of saying "run start again".
  console.log('');
  if (trigger.installed === true) {
    console.log('  Logon trigger INSTALLED -- this comes back on its own after:');
    console.log('    - a reboot (at the next logon, ~30s after)');
    console.log('    - logging out and back in');
    console.log('  ⛔ It does NOT come back after:');
    console.log('    - HIBERNATING (on battery this machine hibernates after an hour');
    console.log('      of sleep, which does end the process -- and waking from it is');
    console.log('      not a logon, so the trigger does not fire)');
    console.log('    - stopping it by hand -- deliberately: nothing resurrects a');
    console.log('      server you chose to stop');
    console.log('  ⚠ Ordinary sleep is a DIFFERENT case and looks identical from the');
    console.log('    phone -- the page is dead either way:');
    console.log('    - this machine only has low-power-idle sleep, which does NOT end');
    console.log('      processes, and it disconnects the network while asleep. So the');
    console.log('      server is normally still running and the URL comes back on its');
    console.log('      own once the tailnet reconnects. Nothing to restart.');
    console.log('    - Tailscale dropping is the same shape (the server survives; the');
    console.log('      tailnet URL does not)');
    console.log('  ⭐ So check whether it is actually gone before restarting it:');
    console.log('    npm run dev:status -- if it reports alive, wait for the network.');
    console.log('  remove trigger : npm run dev:autostart:off');
  } else {
    console.log('  This is a detached process, not a service. It does NOT survive:');
    console.log('    - a reboot');
    console.log('    - HIBERNATING (on battery, after an hour of sleep)');
    console.log('  ⚠ Ordinary sleep does NOT end it -- this machine only has');
    console.log('    low-power-idle sleep, which keeps processes running and');
    console.log('    disconnects the network. The URL dies; the server does not.');
    console.log('    Same for Tailscale dropping. Check before restarting:');
    console.log('    npm run dev:status');
    if (trigger.installed === false) {
      console.log('  start it automatically at logon : npm run dev:autostart');
    }
  }
}

function printUrls(port, phoneReachable) {
  const host = tailnetHost();
  console.log('  local       : http://127.0.0.1:' + port + '/');
  if (host && phoneReachable) {
    console.log('  phone       : https://' + host + '/');
  } else if (host) {
    console.log('  phone       : NOT reachable -- the proxy is not pointing at ' + port);
  }
  console.log('  log         : ' + LOG_FILE);
}

function printCommands() {
  console.log('');
  console.log('  stop        : npm.cmd run dev:stop');
  console.log('  check       : npm.cmd run dev:status');
}

async function cmdStart(port, withProxy) {
  console.log('');
  console.log('RobCo dev server -- start');
  console.log('');
  reportBranch();

  const state = readState();
  const alreadyOurs = state && state.pid && pidAlive(state.pid) && (await portOpen(state.port));

  if (alreadyOurs) {
    console.log('  status      : ALREADY RUNNING (pid ' + state.pid + ') -- nothing started.');
    if (withProxy) {
      const p = ensureProxy(state.port);
      console.log('  proxy       : ' + (p.ok ? 're-ensured' : 'NOT SET -- ' + p.reason));
    }
    printUrls(state.port, withProxy && proxyTargetsPort(state.port));
    printCommands();
    return 0;
  }

  // A live port with no live record of ours means something else owns it. Refuse, rather
  // than stacking a second server that nobody can account for later.
  if (await portOpen(port)) {
    console.log('  status      : REFUSED');
    console.log('');
    console.log('  Port ' + port + ' is in use, but not by a server this script started');
    console.log('  (no live record in ' + PID_FILE + ').');
    console.log('  It is most likely an npm run dev you started by hand in another tab.');
    console.log('  Stop that one, or run: npm.cmd run dev:stop');
    return 1;
  }

  clearState();
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const out = fs.openSync(LOG_FILE, 'a');

  // npm.cmd, not npm: PowerShell's execution policy blocks npm.ps1 over SSH.
  // --strictPort so Vite fails loudly instead of sliding to the next free port and
  // silently breaking the tailnet proxy, which is pinned to this one.
  // cmd.exe is invoked EXPLICITLY rather than through spawn's `shell: true`. Node
  // deprecated passing an args ARRAY with shell:true (DEP0190) because it concatenates
  // without escaping; building the single command string here is the documented
  // replacement, and it also keeps a known parent pid for the taskkill /T in stop.
  // `port` is validated as an integer in main(), so nothing unvalidated reaches it.
  const inner = 'npm.cmd run dev -- --port ' + port + ' --strictPort';
  const spawnCmd = IS_WINDOWS ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const spawnArgs = IS_WINDOWS
    ? ['/d', '/s', '/c', inner]
    : ['run', 'dev', '--', '--port', String(port), '--strictPort'];

  const child = spawn(spawnCmd, spawnArgs, {
    cwd: ROOT,
    detached: true, // no inherited console, so it survives the SSH tab closing
    stdio: ['ignore', out, out],
    windowsHide: true,
  });
  child.unref();

  console.log('  status      : starting (pid ' + child.pid + '), waiting for port ' + port + '...');
  const up = await waitForPort(port, 30000);

  if (!up) {
    console.log('  status      : FAILED to come up within 30s.');
    console.log('');
    console.log('  Last lines of ' + LOG_FILE + ':');
    for (const line of tailLog(15)) console.log('    ' + line);
    return 1;
  }

  writeState({
    pid: child.pid,
    port: port,
    branch: currentBranch(),
    startedAt: new Date().toISOString(),
    cwd: ROOT,
  });

  console.log('  status      : UP');
  if (withProxy) {
    const p = ensureProxy(port);
    console.log(
      '  proxy       : ' + (p.ok ? 'tailscale serve -> ' + port : 'NOT SET -- ' + p.reason)
    );
    if (!p.ok) console.log('                the local URL still works; the phone URL will not.');
  } else {
    console.log('  proxy       : skipped (--no-proxy)');
  }
  printUrls(port, withProxy && proxyTargetsPort(port));
  printCommands();
  printBounds();
  return 0;
}

function cmdStop() {
  console.log('');
  console.log('RobCo dev server -- stop');
  console.log('');
  const state = readState();

  if (!state || !state.pid) {
    console.log('  status      : nothing recorded as running.');
    console.log('  note        : a server you started by hand is invisible here -- this');
    console.log('                only tracks what it started itself. Check with status.');
    return 0;
  }

  if (!pidAlive(state.pid)) {
    console.log(
      '  status      : already stopped (stale record for pid ' + state.pid + ' cleared).'
    );
    clearState();
    return 0;
  }

  // /T because npm.cmd -> node -> vite is a TREE. Killing only the parent orphans Vite
  // still holding the port, which is precisely the invisible-stale-server problem.
  const killed = IS_WINDOWS
    ? sh('taskkill', ['/PID', String(state.pid), '/T', '/F'])
    : sh('kill', ['-TERM', String(state.pid)]);

  if (killed.status === 0) {
    console.log('  status      : STOPPED (pid ' + state.pid + ', whole tree)');
  } else {
    console.log('  status      : kill reported an error -- ' + (killed.stderr || '').trim());
    console.log('                clearing the record anyway; confirm with status.');
  }
  clearState();
  console.log('  note        : the tailscale serve config is left alone. start re-ensures');
  console.log('                it every time, so there is nothing to undo here.');
  return 0;
}

async function cmdStatus() {
  console.log('');
  console.log('RobCo dev server -- status');
  console.log('');
  reportBranch();

  const state = readState();
  const port = state && state.port ? state.port : DEFAULT_PORT;
  const alive = !!(state && pidAlive(state.pid));
  const listening = await portOpen(port);

  if (state) {
    console.log('  recorded    : pid ' + state.pid + ', port ' + state.port);
    console.log('  started     : ' + state.startedAt + ' (on branch ' + state.branch + ')');
    console.log('  process     : ' + (alive ? 'alive' : 'GONE (stale record)'));
  } else {
    console.log('  recorded    : nothing (not started by this script)');
  }
  console.log('  port ' + port + '   : ' + (listening ? 'listening' : 'nothing listening'));

  // ⭐ PERSISTENT MACHINE STATE MUST BE VISIBLE FROM THE COMMAND SOMEBODY ASKS.
  // The logon trigger is a thing installed on this machine that starts a server
  // on its own. If `status` reported only whether the process is up, that state
  // would be invisible to the one question anybody asks about it — and invisible
  // machine state is how a box accumulates things nobody can account for. The
  // name comes from the module that owns it, never retyped here.
  try {
    const t = require('./dev-autostart.js').triggerStatus();
    console.log(
      '  logon start : ' +
        (t.installed === true
          ? 'INSTALLED (starts at logon; remove with npm run dev:autostart:off)'
          : t.installed === false
            ? 'not installed (npm run dev:autostart to enable)'
            : 'UNKNOWN -- ' + t.detail)
    );
  } catch {
    console.log('  logon start : UNKNOWN (trigger module unreadable)');
  }

  if (listening && !alive) {
    console.log('');
    console.log('  NOTE: something is serving that port that this script did not start --');
    console.log('        most likely an npm run dev running in a terminal tab.');
  }

  const p = proxyStatus();
  console.log('  proxy       : ' + (p.ok ? 'configured' : 'unknown -- ' + p.reason));
  if (p.ok && p.out)
    for (const line of p.out.split(/\r?\n/).slice(0, 6)) console.log('      ' + line);

  if (listening) printUrls(port, proxyTargetsPort(port, p));

  // ⭐ THE MORTALITY CAVEAT BELONGS HERE, NOT ONLY IN `start`. `printBounds()` has
  // always said this server does not survive a reboot, a sleep or Tailscale
  // dropping — but it said it at START, to whoever was already at the terminal.
  // The person who needs it is the one asking "is it up?", often hours later and
  // usually because something already looks wrong. A caveat printed at the moment
  // it stops being true is a caveat nobody reads at the moment it matters.
  //
  // ⚠ THIS IS A REAL INCIDENT, NOT TIDINESS. The server was interrupted roughly
  // five minutes after a session verified the tailnet URLs and reported them as
  // working. By the time the owner opened the link, nothing was listening: the
  // phone showed a connection failure for one URL and a stale, unstyled page for
  // the other, because the browser still had the shell cached while every request
  // for the rest of it failed. Nothing was broken except that the process was
  // gone — and no output anywhere said that a passing check has a shelf life.
  printBounds();

  if (!listening) {
    console.log('');
    console.log('  ⛔ NOT SERVING RIGHT NOW. Anything pointed at the tailnet URL gets a');
    console.log('     connection error or a 502 -- there is no page explaining why, and a');
    console.log('     browser holding a cached copy of the app will render it unstyled');
    console.log('     rather than failing outright, which does not look like a dead server.');
    console.log('');
    console.log('     Revive it with:  npm run dev:start');
  }

  const recent = tailLog(5);
  if (recent.length) {
    console.log('');
    console.log('  last log lines:');
    for (const line of recent) console.log('    ' + line);
  }
  return 0;
}

function usage() {
  console.log('');
  console.log('Usage: node scripts/dev-server.js <start|stop|status> [--port N] [--no-proxy]');
  console.log('');
  console.log('  start   start Vite detached, and ensure the tailnet proxy');
  console.log('  stop    stop the server this script started (kills the whole tree)');
  console.log('  status  show branch, whether it is running, and the proxy state');
  console.log('');
  return 1;
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || 'start';
  const portFlag = argv.indexOf('--port');
  const port = portFlag !== -1 && argv[portFlag + 1] ? Number(argv[portFlag + 1]) : DEFAULT_PORT;
  const withProxy = !argv.includes('--no-proxy');

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('dev-server: --port must be an integer between 1 and 65535');
    return 1;
  }

  if (cmd === 'start') return cmdStart(port, withProxy);
  if (cmd === 'stop') return cmdStop();
  if (cmd === 'status') return cmdStatus();
  return usage();
}

if (require.main === module) {
  main().then(
    code => {
      process.exitCode = code;
    },
    err => {
      console.error('dev-server: ' + (err && err.message ? err.message : err));
      process.exitCode = 1;
    }
  );
}

module.exports = { tailnetHost, EXPECTED_BRANCH, DEFAULT_PORT };
