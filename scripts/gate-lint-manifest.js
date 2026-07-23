#!/usr/bin/env node
/**
 * scripts/gate-lint-manifest.js — the git-tracked ESLint manifest (G-review CLAIM A/C/D).
 *
 * WHY THIS EXISTS. The gate used to lint with `npx eslint .` — the WHOLE working
 * directory. On a machine where two sessions share one checkout, an untracked
 * scratch file created by session A would be linted during session B's push
 * gate and fail a push whose own commit was clean. `eslint .` made "worktree
 * isolation" false for the lint step (the single most-flagged finding in the G
 * blind workflow review — GPT-1, GEM-2/9, DS-1/6, CLAUDE-1).
 *
 * THE FIX. Lint the GIT MANIFEST — the files actually being committed/pushed —
 * instead of whatever happens to be on disk. `git ls-files` reports the index:
 * every tracked file plus any staged-new file, which is exactly "what is being
 * committed" at pre-commit and "what is being pushed" at pre-push (a clean tree).
 * An untracked file is not in the index, so a concurrent session's scratch file
 * can never enter the manifest.
 *
 * COVERAGE IS PRESERVED. `eslint .` lints every js/mjs/cjs file that the flat
 * config does not ignore. The manifest is every TRACKED js/mjs/cjs file; ESLint
 * still applies its own config `ignores` (planning/, js/vendor/, eslint.config.mjs,
 * the tests/*.mjs list, …) and skips them silently under --no-warn-ignored,
 * exactly as `eslint .` did. So the linted set is identical to `eslint .` MINUS
 * untracked files — and untracked files are, by definition, not part of the commit.
 *
 * This module is deliberately its own file (not inlined in gate.js) so the pure
 * scoping core is unit-testable without executing the gate — Suite 244 requires it.
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Extensions the ESLint flat config targets. The config's main block sets no
// custom `files`, so it lints the flat-config defaults: .js / .mjs / .cjs.
const LINTABLE_RE = /\.(js|mjs|cjs)$/;

/**
 * Pure core: turn raw `git ls-files` output into the lint manifest.
 *
 * @param {string} output  raw stdout of `git ls-files` (newline-separated, git
 *                         emits forward-slash paths on every platform).
 * @param {(relPath: string) => boolean} existsFn  decides whether a path still
 *                         exists on disk. A file that is staged-deleted or removed
 *                         from the worktree can still appear in ls-files, and a
 *                         nonexistent path passed to eslint makes it error — so
 *                         such paths are dropped here.
 * @returns {string[]} the filtered, de-duplicated manifest (git-relative paths).
 *
 * Config-level ignores are intentionally NOT filtered here — ESLint applies them
 * itself (with --no-warn-ignored), so filtering them twice would risk drifting
 * from the config's own ignore list. This function only decides tracked-ness,
 * lintable extension, and existence.
 */
function manifestFromLsFiles(output, existsFn) {
  const seen = new Set();
  const out = [];
  for (const raw of String(output).split(/\r?\n/)) {
    const f = raw.trim();
    if (!f || seen.has(f)) continue; // unmerged (conflict) entries can repeat
    seen.add(f);
    if (!LINTABLE_RE.test(f)) continue;
    if (f.includes('node_modules/')) continue;
    if (!existsFn(f)) continue;
    out.push(f);
  }
  return out;
}

/**
 * Live wrapper: read the git index of `root` and build the manifest.
 * Returns `null` to signal "git is unavailable" so the caller can fail SAFE to a
 * whole-directory lint — the gate must never be silently weaker than before just
 * because git could not be reached.
 *
 * @param {string} root  repo root to run `git ls-files` in.
 * @returns {string[] | null}
 */
function trackedLintFiles(root) {
  const res = spawnSync('git ls-files', { cwd: root, shell: true, encoding: 'utf8' });
  if (res.status !== 0 || typeof res.stdout !== 'string') return null;
  return manifestFromLsFiles(res.stdout, rel => fs.existsSync(path.join(root, rel)));
}

module.exports = { manifestFromLsFiles, trackedLintFiles, LINTABLE_RE };
