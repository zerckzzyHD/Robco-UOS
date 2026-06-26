#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const HOOK_SRC = path.join(__dirname, 'pre-commit');
const REPO_ROOT = path.join(__dirname, '..');
const GIT_DIR = path.join(REPO_ROOT, '.git');
const HOOKS_DIR = path.join(GIT_DIR, 'hooks');
const HOOK_DST = path.join(HOOKS_DIR, 'pre-commit');

if (!fs.existsSync(GIT_DIR)) {
  console.log('[hooks] Not a git repository — skipping hook install.');
  process.exit(0);
}

if (!fs.existsSync(HOOKS_DIR)) {
  fs.mkdirSync(HOOKS_DIR, { recursive: true });
}

fs.copyFileSync(HOOK_SRC, HOOK_DST);
try {
  fs.chmodSync(HOOK_DST, 0o755);
} catch {
  // chmodSync not supported on Windows — hook still runs via sh
}
console.log('[hooks] pre-commit hook installed from scripts/pre-commit');
