#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const GIT_DIR = path.join(REPO_ROOT, '.git');
const HOOKS_DIR = path.join(GIT_DIR, 'hooks');

if (!fs.existsSync(GIT_DIR)) {
  console.log('[hooks] Not a git repository — skipping hook install.');
  process.exit(0);
}

if (!fs.existsSync(HOOKS_DIR)) {
  fs.mkdirSync(HOOKS_DIR, { recursive: true });
}

function installHook(name) {
  const src = path.join(__dirname, name);
  const dst = path.join(HOOKS_DIR, name);
  fs.copyFileSync(src, dst);
  try {
    fs.chmodSync(dst, 0o755);
  } catch {
    // chmodSync not supported on Windows — hook still runs via sh
  }
  console.log(`[hooks] ${name} hook installed from scripts/${name}`);
}

installHook('pre-commit');
installHook('pre-push');
