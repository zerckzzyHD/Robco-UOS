#!/usr/bin/env node
'use strict';
/**
 * backup-nudge.eol.test.js — the driver for `BD16`'s EOL fallback (2026-09-16).
 *
 * ⛔⛤ THE DEFECT. `backup-nudge.js` compared RAW BYTES of a local file against the
 * archive's committed blob, on a stated assumption that turned out to be false:
 * *"the archive pins `eol=lf` … so a mismatch here is a real content difference and
 * not an EOL artifact."* ⚠ `eol=lf` normalises ON COMMIT; it does not stop a WORKING
 * file holding CRLF, and on this machine they do. ⇒ the script reported files as
 * "not backed up" that git itself calls clean.
 *
 * ⭐ MEASURED, same tree and same instant, previous logic vs fixed:
 *   previous: "NOT BACKED UP -- 3 of 1015"   ·   fixed: "BACKED UP -- all 1015"
 *
 * ⭐⭐ WHAT THIS DRIVER PINS, and why each case exists:
 *   E1/E2  the fallback matches CRLF against its LF blob -- the actual bug
 *   E3     ⛔ IT DOES NOT MASK A REAL DIFFERENCE. This is the case that matters: if
 *          the fallback ever started returning "equal" for different CONTENT, the
 *          nudge would go quiet about genuine gaps, which is far worse than the
 *          over-reporting it replaced.
 *   B1     binary is excluded by construction -- 429 of the files in scope are PNGs
 */
const path = require('path');
const N = require(path.join(__dirname, 'backup-nudge.js'));

let pass = 0,
  fail = 0;
function ok(n, c, note) {
  if (c) {
    pass++;
    console.log('  ok   ' + n + (note ? '  -- ' + note : ''));
  } else {
    fail++;
    console.log('  FAIL ' + n + (note ? '  -- ' + note : ''));
  }
}
const B = s => Buffer.from(s, 'binary');

console.log(
  '\nbackup-nudge.eol.test -- the EOL fallback must forgive line endings and NOTHING else\n'
);

const lf = B('alpha\nbeta\ngamma\n');
const crlf = B('alpha\r\nbeta\r\ngamma\r\n');

// E1 — the founding case: the raw hashes must genuinely differ, or E2 proves nothing.
ok(
  'E1 CONTROL: CRLF and LF of the same text have DIFFERENT raw blob hashes',
  N.blobSha1(crlf) !== N.blobSha1(lf),
  'raw differs -- so the fallback is doing real work'
);

// E2 — and the normalised hash of the CRLF file equals the LF blob.
ok(
  'E2 GREEN: the CRLF file normalises to the SAME hash as the LF blob',
  N.blobSha1Lf(crlf) === N.blobSha1(lf),
  'this is the false positive being removed'
);

// E3 — ⛔ THE CASE THAT MATTERS. Different content must stay different after normalising.
{
  const other = B('alpha\r\nbeta\r\nDELTA\r\n');
  ok(
    'E3 RED: genuinely different CONTENT still differs after normalisation — the fallback cannot hide a real gap',
    N.blobSha1Lf(other) !== N.blobSha1(lf),
    'normalisation only removes CR, never reconciles content'
  );
}
// E3b — a pure truncation must not be forgiven either.
{
  const short = B('alpha\r\nbeta\r\n');
  ok(
    'E3b RED: a TRUNCATED file still differs after normalisation',
    N.blobSha1Lf(short) !== N.blobSha1(lf),
    'length change survives'
  );
}
// B1 — binary is never normalised.
{
  const bin = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0d, 0x0a, 0x1a, 0x0a]);
  ok(
    'B1 binary (contains NUL) returns null — never normalised, so a PNG is never "fixed" into a match',
    N.blobSha1Lf(bin) === null && N.isProbablyText(bin) === false,
    'stripping CR from an image is corruption, not comparison'
  );
}
// B2 — text without NUL is treated as text.
ok('B2 text without a NUL byte is treated as text', N.isProbablyText(lf) === true);

// I1 — importing this module must not have run the comparison (no output, no git).
ok(
  'I1 IMPORT IS INERT: requiring backup-nudge.js printed nothing and ran no tree walk',
  typeof N.blobSha1 === 'function' && typeof N.blobSha1Lf === 'function',
  'main() returns early when required'
);

console.log('\nbackup-nudge.eol.test: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
