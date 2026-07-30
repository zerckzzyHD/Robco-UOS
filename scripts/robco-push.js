#!/usr/bin/env node
'use strict';
/**
 * scripts/robco-push.js — route a push through the controlled-push wrapper
 * (QUEUE.md item ACT3, Protocol 36 / CPB4 coexistence).
 *
 *   npm run push            # push the current branch through the wrapper
 *   npm run push -- <branch>
 *
 * The wrapper (`controlled-push.js`) is the L4 push transaction: it takes a
 * per-(repo,branch) lock, records a push.intent before the push, runs the push,
 * independently verifies the remote with `git ls-remote`, and records a
 * push.completion — the receipt that advances the clean-push counter gating a
 * future raw-push refusal. It lives OUTSIDE this repo (the workflow control
 * plane is a separate, private repo), so this launcher resolves it at runtime:
 *
 *   1. $ROBCO_CONTROL_PUSH — an explicit absolute path to controlled-push.js.
 *   2. ../_RobCo-Control/code/controlled-push.js — the sibling-checkout default.
 *
 * If neither resolves (e.g. a public clone that has only this repo), the command
 * degrades with a clear message and a non-zero exit; a plain `git push` still
 * works exactly as before — ACT3 wires the wrapper in, it does NOT refuse raw
 * pushes (that is DG2, a separate later step).
 *
 * The gate is DELEGATED, not double-run: this launcher sets
 * ROBCO_PUSH_DELEGATE_GATE=1 so the wrapper does NOT run `npm run gate` itself.
 * This repo's own scripts/pre-push hook is the single gate authority, and since
 * CPB4 it scopes doc-only pushes to the browser-free fast path. Delegating keeps
 * the gate running exactly once, with CPB4's fast path intact; a gate failure in
 * the hook still blocks the push, so the wrapper records completed:false.
 *
 * Not a served/precached file (it is under scripts/), so Protocol 1 does not
 * apply — no CACHE_NAME bump for touching this file.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Resolve the controlled-push wrapper. Pure (env + repoRoot in, decision out) so
 * it is unit-testable without launching anything. Returns { path, source }.
 */
function resolveWrapper(env, repoRoot) {
  const fromEnv =
    env && typeof env.ROBCO_CONTROL_PUSH === 'string' ? env.ROBCO_CONTROL_PUSH.trim() : '';
  if (fromEnv) {
    return { path: fromEnv, source: 'ROBCO_CONTROL_PUSH' };
  }
  const sibling = path.resolve(repoRoot, '..', '_RobCo-Control', 'code', 'controlled-push.js');
  return { path: sibling, source: 'sibling-default' };
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const resolved = resolveWrapper(process.env, repoRoot);

  if (!fs.existsSync(resolved.path)) {
    process.stderr.write(
      'robco-push: the controlled-push wrapper was not found.\n' +
        '  tried (' +
        resolved.source +
        '): ' +
        resolved.path +
        '\n' +
        'This command routes pushes through the workflow control plane, which is not present here.\n' +
        'Set ROBCO_CONTROL_PUSH to controlled-push.js, or just use a plain `git push` — it still works.\n'
    );
    return 2;
  }

  const passthrough = process.argv.slice(2);
  const env = Object.assign({}, process.env, { ROBCO_PUSH_DELEGATE_GATE: '1' });
  const res = spawnSync('node', [resolved.path, repoRoot].concat(passthrough), {
    stdio: 'inherit',
    env,
  });
  if (res.error) {
    process.stderr.write('robco-push: failed to launch the wrapper: ' + res.error.message + '\n');
    return 1;
  }
  return typeof res.status === 'number' ? res.status : 1;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { resolveWrapper };
