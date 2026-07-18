'use strict';
/**
 * tests/arch-conformance-check.js — Static Architectural Conformance (Protocol 23)
 *
 * Turns Protocol 23 ("rendering only renders · state.js owns state · registry is
 * read-only · services don't own the view") from an honor-system rule into an
 * executable one. It statically scans js/** for the forbidden cross-layer calls
 * and diffs the result against an ACCEPTED BASELINE (tests/arch-conformance-baseline.json).
 *
 * Why a baseline: the violations ALREADY EXIST (a prior architecture review
 * measured them). A check that simply failed on them would red the gate forever
 * and could never ship. Instead — exactly like the a11y baseline-diff (U9) — the
 * current violations are captured as an accepted baseline so the gate stays GREEN
 * today, and the gate FAILS only on a NEW violation beyond the baseline. The
 * debt can't grow; it's the countable work the 2.9.0 hardening gate burns down by
 * inverting these edges onto the event bus. This unit does NOT fix the existing
 * debt — it makes the rule enforceable and the debt visible.
 *
 * Zero false positives is the bar (Protocol 45 discipline): comments and string
 * literals are stripped before matching, so a token mentioned in prose or a
 * string is never counted as a call site. A rule that can't be expressed without
 * false alarms is dropped rather than adding noise.
 *
 * Consumed by Suite 236 in the Node runner (so it rides the fast commit gate).
 * Runnable standalone for debugging / the red-then-green proof:
 *   node tests/arch-conformance-check.js                 → report + exit 0/1
 *   node tests/arch-conformance-check.js --write-baseline → (re)generate the baseline
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'arch-conformance-baseline.json');

// ── Strip block comments, line comments, and string/template literals ─────────
// so a token that only appears in prose or a string can never be counted as a
// real call site. Not a full JS parser (regex literals are left intact — no
// render*()/saveState()/loadUI() token has ever appeared inside one in this
// codebase), but exhaustive for the three literal kinds that DO carry these
// tokens in comments here. Over-stripping a string can only ever REMOVE a match
// (a call is never inside a string literal), so this direction is false-positive
// safe by construction.
function stripNonCode(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let mode = 'code'; // code | line | block | sq | dq | tpl
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && c2 === '/') {
        mode = 'line';
        i += 2;
        continue;
      }
      if (c === '/' && c2 === '*') {
        mode = 'block';
        i += 2;
        continue;
      }
      if (c === "'") {
        mode = 'sq';
        i++;
        continue;
      }
      if (c === '"') {
        mode = 'dq';
        i++;
        continue;
      }
      if (c === '`') {
        mode = 'tpl';
        i++;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    if (mode === 'line') {
      if (c === '\n') {
        mode = 'code';
        out += c;
      }
      i++;
      continue;
    }
    if (mode === 'block') {
      if (c === '*' && c2 === '/') {
        mode = 'code';
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    // string / template: honor backslash escapes; keep newlines so line-based
    // tooling downstream is unaffected (we only care about token presence).
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (
      (mode === 'sq' && c === "'") ||
      (mode === 'dq' && c === '"') ||
      (mode === 'tpl' && c === '`')
    )
      mode = 'code';
    if (c === '\n') out += c;
    i++;
  }
  return out;
}

function listJs(dir, filter) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter(f => f.endsWith('.js') && filter(f))
    .sort()
    .map(f => `${dir}/${f}`);
}

// ── The three rules ───────────────────────────────────────────────────────────
// Each rule owns: a stable key (also the baseline key), the file set it governs,
// and a regex matched against COMMENT/STRING-STRIPPED source.
const RULES = [
  {
    key: 'renderWritesState',
    label: 'render files must not write state (no saveState() from js/ui/ui-render*.js)',
    files: () => listJs('js/ui', f => /^ui-render/.test(f)),
    // A bare saveState( call — not preceded by an identifier char or a dot, so
    // a method like foo.saveState() or a longer name would not match (there are
    // none; the render layer calls the global saveState()).
    re: /(?<![A-Za-z0-9_.])saveState\s*\(/g,
  },
  {
    key: 'serviceCallsView',
    label: 'services must not call the view (no render*()/loadUI() from js/services/**)',
    files: () => listJs('js/services', () => true),
    // Bare render<Cap>()/loadUI(), optionally window.-prefixed (services call the
    // global view functions either bare or via window.renderAccount()). The
    // window. form is enumerated explicitly rather than allowing any .render*()
    // so an unrelated object method named renderX() can never false-positive.
    re: /(?<![A-Za-z0-9_.])(?:window\.)?(?:render[A-Z][A-Za-z0-9_]*|loadUI)\s*\(/g,
  },
  {
    key: 'registryMutatesState',
    label: 'registry is read-only (no saveState()/state assignment from reg_*.js/registry-core.js)',
    files: () => ['js/data/reg_nv.js', 'js/data/reg_fo3.js', 'js/data/registry-core.js'],
    // saveState( OR a state mutation (state.foo = / state[..] =), with = not part
    // of ==/===/!=/<=/>= and state on the LEFT of the assignment (a read like
    // `const x = state.foo` puts state on the right and does not match).
    re: /(?<![A-Za-z0-9_.])(?:saveState\s*\(|state\s*(?:\.[A-Za-z0-9_$]+|\[)[^=!<>\n]*=(?!=))/g,
  },
];

function countMatches(code, re) {
  re.lastIndex = 0;
  let c = 0;
  while (re.exec(code)) c++;
  return c;
}

// Scan one rule → { 'js/…': count, … } (files with zero matches omitted).
function scanRule(rule) {
  const perFile = {};
  for (const rel of rule.files()) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const code = stripNonCode(fs.readFileSync(abs, 'utf8'));
    const c = countMatches(code, rule.re);
    if (c > 0) perFile[rel] = c;
  }
  return perFile;
}

// Scan all rules → { renderWritesState: {…}, serviceCallsView: {…}, registryMutatesState: {…} }.
function scanAll() {
  const out = {};
  for (const rule of RULES) out[rule.key] = scanRule(rule);
  return out;
}

function ruleTotal(perFile) {
  return Object.values(perFile).reduce((a, b) => a + b, 0);
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return 'INVALID';
  }
}

// Diff current scan vs baseline. A NEW violation is a file whose current count
// exceeds its baselined count (an un-baselined file has an implicit baseline of
// 0). Shrinkage (current < baseline) never fails — it's the debt being paid down
// — but is reported so the baseline can be tightened.
function diff(current, baseline) {
  const newViolations = [];
  const shrunk = [];
  for (const rule of RULES) {
    const cur = current[rule.key] || {};
    const base = (baseline && baseline[rule.key]) || {};
    const files = new Set([...Object.keys(cur), ...Object.keys(base)]);
    for (const f of files) {
      const c = cur[f] || 0;
      const b = base[f] || 0;
      if (c > b) newViolations.push({ rule: rule.key, file: f, current: c, baseline: b });
      else if (c < b) shrunk.push({ rule: rule.key, file: f, current: c, baseline: b });
    }
  }
  return { newViolations, shrunk };
}

module.exports = { RULES, stripNonCode, scanAll, ruleTotal, loadBaseline, diff, BASELINE_PATH };

// ── Standalone CLI ────────────────────────────────────────────────────────────
if (require.main === module) {
  const current = scanAll();
  if (process.argv.includes('--write-baseline')) {
    const doc = {
      __doc__:
        'Accepted Protocol 23 violation baseline (tests/arch-conformance-check.js / Suite 236). ' +
        'Counts are per-file forbidden cross-layer call sites. The gate fails on any NEW ' +
        'violation beyond these counts; it never fails when the count shrinks. This is the ' +
        'countable debt the 2.9.0 hardening gate burns down by inverting these edges onto the ' +
        'event bus. Regenerate with: node tests/arch-conformance-check.js --write-baseline',
      ...current,
    };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    console.log('[arch] wrote baseline →', path.relative(ROOT, BASELINE_PATH));
    for (const rule of RULES)
      console.log(`  ${rule.key}: ${ruleTotal(current[rule.key])} call site(s)`);
    process.exit(0);
  }
  const baseline = loadBaseline();
  console.log('[arch] Protocol 23 static conformance — measured debt (baselined):');
  for (const rule of RULES) console.log(`  ${rule.key} = ${ruleTotal(current[rule.key])}`);
  if (baseline === 'INVALID') {
    console.error('[arch] FAIL: baseline file is not valid JSON');
    process.exit(1);
  }
  const { newViolations, shrunk } = diff(current, baseline || {});
  for (const s of shrunk)
    console.log(`[arch] debt paid down: ${s.rule} ${s.file} ${s.baseline} → ${s.current}`);
  if (newViolations.length) {
    console.error('[arch] FAIL — NEW Protocol 23 violation(s) beyond the accepted baseline:');
    for (const v of newViolations)
      console.error(`  ${v.rule}: ${v.file} has ${v.current} (baseline ${v.baseline})`);
    process.exit(1);
  }
  console.log('[arch] OK — no new architectural-boundary violations.');
  process.exit(0);
}
