// ── VISUAL UPLOAD -> ON-DEVICE OCR (Unit 1: infra proof) ────────────────────
// Protocol 8 Stage 1 of planning/VISUAL_UPLOAD_OCR_PLAN.md: vendor + lazy-load
// Tesseract.js (Apache-2.0, self-hosted, js/vendor/), verify the CSP
// (worker-src 'self' + 'wasm-unsafe-eval') and service-worker runtime-cache
// infra actually work, and prove the pipeline end-to-end by dumping the RAW
// recognized text. There is no parser and no state write anywhere in this
// file yet -- Unit 2 adds the deterministic _parseOcrText()/preview-confirm
// apply, Unit 3 wires the hybrid routing + kill-switch into the existing
// Visual Upload composer flow. js/ui-saves.js handleImageSelection() and
// js/api.js transmitMessage()'s AI-vision inlineData path are both untouched
// by this unit (Protocol 22 -- additive infra only, nothing forked or
// removed). Game-agnostic (Protocol 38): no game literal anywhere in here.

let _tesseractPromise = null;

// Lazy-load the self-hosted Tesseract.js main API script exactly once
// (idempotent via the module-scope promise guard). NEVER called from
// window.onload/boot -- only from runVisualOcrTest() below, the one entry
// point a real user action (or, today, the staging-only Dev Console OCR
// test board) triggers.
function _ensureTesseract() {
  if (_tesseractPromise) return _tesseractPromise;
  _tesseractPromise = new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src = 'js/vendor/tesseract.min.js';
    script.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error('Tesseract did not attach to window after load'));
    };
    script.onerror = () => reject(new Error('Failed to load js/vendor/tesseract.min.js'));
    document.head.appendChild(script);
  });
  return _tesseractPromise;
}

// Best-effort runtime cache of the heavy core+lang assets (~9.5MB total) into
// the SAME active Cache Storage bucket the service worker already owns --
// never the all-or-nothing install-time ASSETS list (Protocol 1: bloat/
// install-failure risk). Reuses the exact "read the real active cache name"
// technique already established for SYSTEM STATUS (js/ui-core.js
// _readActiveCacheName) instead of duplicating the CACHE_NAME literal
// (Protocol 22), with a plain caches.keys() fallback if that helper isn't
// defined yet for any reason. A miss here is silently swallowed -- the SW's
// own cache-first fetch handler just re-fetches from network next time, the
// same non-fatal contract as the existing CHANGELOG.md best-effort precache.
function _cacheOcrAssetsBestEffort() {
  try {
    if (!('caches' in window)) return;
    const heavy = [
      'js/vendor/tesseract-core-lstm.wasm.js',
      'js/vendor/tesseract-core-lstm.wasm',
      'assets/ocr/eng.traineddata.gz',
    ];
    const store = name => {
      if (!name) return;
      caches
        .open(name)
        .then(c => c.addAll(heavy).catch(() => {}))
        .catch(() => {});
    };
    if (typeof _readActiveCacheName === 'function') {
      _readActiveCacheName(store);
    } else {
      caches
        .keys()
        .then(keys => store(keys.find(k => k.indexOf('robco-terminal-v') === 0) || null))
        .catch(() => {});
    }
  } catch (_) {
    /* best-effort only -- never block or throw into the OCR flow */
  }
}

// Preprocess an <img> onto a high-contrast canvas tuned for low-contrast
// green-phosphor Pip-Boy screenshots (plan Sec3.2): downscale huge screenshots /
// upscale tiny text, grayscale, a mean-luminance threshold, and invert when
// the source is dark-on-light-detected-as-light-on-dark so Tesseract always
// sees dark text on a light background regardless of the source theme.
function _preprocessImageToCanvas(img) {
  const MAX_DIM = 2000;
  const MIN_DIM = 800;
  let scale = 1;
  const longest = Math.max(img.width, img.height);
  if (longest > MAX_DIM) {
    scale = MAX_DIM / longest;
  } else if (longest < MIN_DIM && longest > 0) {
    scale = Math.min(2, MIN_DIM / longest);
  }
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const gray = new Uint8ClampedArray(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    gray[p] = g;
    sum += g;
  }
  const mean = gray.length ? sum / gray.length : 128;
  const invert = mean < 128; // dark background (typical Pip-Boy phosphor) -> invert
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let v = gray[p] > mean ? 255 : 0;
    if (invert) v = 255 - v;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function _loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode the selected image'));
    };
    img.src = url;
  });
}

// _runOcrPipeline(file, onStatus) -- the shared pick -> preprocess -> OCR ->
// raw-text core (Unit 1 infra proof), factored out so BOTH the Unit-1 raw-
// text test board (runVisualOcrTest, unchanged below) and the Unit-2 full
// parse/preview/apply pipeline (runVisualOcr) share the ONE Tesseract
// invocation (Protocol 22 -- never a second worker-config call site).
// corePath deliberately points at the EXACT vendored core file (not a bare
// directory): Tesseract's own getCore.js auto-selects a SIMD-vs-non-SIMD
// core variant when corePath is a directory, which would 404 since only the
// non-SIMD lstm-only core is vendored here (kept the repo-weight addition to
// a single ~6.7MB core instead of ~15MB for both variants) -- pointing at
// the literal filename sidesteps that probe entirely and guarantees only the
// one vendored file is ever requested (Protocol 27: verified against the
// actual vendored package's resolution logic, not assumed from the plan's
// illustrative snippet).
async function _runOcrPipeline(file, onStatus) {
  const status = typeof onStatus === 'function' ? onStatus : () => {};
  status('LOADING OPTICAL SCAN ENGINE...');
  const Tesseract = await _ensureTesseract();

  status('PREPROCESSING IMAGE...');
  const { img, url } = await _loadImageFromFile(file);
  let canvas;
  try {
    canvas = _preprocessImageToCanvas(img);
  } finally {
    URL.revokeObjectURL(url);
  }

  status('INITIALIZING OCR WORKER...');
  // Absolute URLs only: a dedicated Worker resolves any relative path passed to
  // importScripts() against the WORKER SCRIPT's own location, not the page's --
  // a relative corePath here silently doubled into
  // ".../js/vendor/js/vendor/tesseract-core-lstm.wasm.js" and 404'd (confirmed
  // live, not a CSP violation -- Protocol 27). Resolving every path against
  // location.href up front sidesteps that entirely, regardless of the page's URL
  // depth (works identically at a bare domain root or a GitHub Pages subpath).
  const worker = await Tesseract.createWorker('eng', 1, {
    workerPath: new URL('js/vendor/worker.min.js', location.href).href,
    corePath: new URL('js/vendor/tesseract-core-lstm.wasm.js', location.href).href,
    langPath: new URL('assets/ocr/', location.href).href,
    workerBlobURL: false,
    gzip: true,
  });

  status('SCANNING...');
  let text;
  try {
    const result = await worker.recognize(canvas);
    text = (result && result.data && result.data.text) || '';
  } finally {
    await worker.terminate();
  }

  _cacheOcrAssetsBestEffort();
  return text;
}

// runVisualOcrTest(file, onStatus) -- the Unit-1 proof: pick -> preprocess ->
// OCR -> return the raw recognized text. No parser, no state write of any
// kind -- purely proves the wasm/worker/CSP/cache infra works end-to-end.
// Unchanged behavior after the _runOcrPipeline extraction (Protocol 22).
async function runVisualOcrTest(file, onStatus) {
  return _runOcrPipeline(file, onStatus);
}

// ── UNIT 2: DETERMINISTIC PARSER (planning/VISUAL_UPLOAD_OCR_PLAN.md §3.3) ──
// _parseOcrText(text, ctx) is PURE -- no DOM, no state read/write -- so it is
// directly VM-sandbox-testable (Protocol 14/20/24). It never invents data: a
// line either resolves against a real cross-reference (lookupItemInDb() for
// items, _resolveStatToken() for stats/SPECIAL/skills, both already
// game-agnostic via the active game's loaded DB / getSkillKeys() -- Protocol
// 38, no game literal anywhere below) or, if it merely LOOKS like a plausible
// item name, is still surfaced flagged as unmatched for the player to
// confirm/edit/discard (Protocol 24 -- OCR is a suggestion, never an
// authority). Lines that are neither a resolvable stat nor a plausible item
// name are dropped into `unparsed` rather than fabricated into a fake row.
// `ctx` is accepted for API-contract clarity/future tuning but not consumed
// directly here -- lookupItemInDb()/_resolveStatToken()/getSkillKeys() are
// already active-game-aware internally (they read whatever DB/registry the
// active game loaded), so no game-literal branch is needed in this file.

// Strips leading OCR bullet/border noise ("- ", "* ", "• ", "> ") and
// collapses internal whitespace runs (multi-space/tab artifacts from a
// misread column gap) into single spaces.
function _cleanOcrLine(raw) {
  return String(raw || '')
    .replace(/^[\s•\-*·▪●○◦>]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Plausibility gate for an inventory-candidate name: must carry at least 2
// letters, stay under a sane length, and not be mostly punctuation/symbol
// noise (a common OCR-on-a-table-border artifact). This is what keeps a
// misread scanline ("|||  ===") from becoming a fake inventory row instead
// of falling through to `unparsed`.
function _looksLikeItemName(name) {
  if (!name) return false;
  const letters = (name.match(/[A-Za-z]/g) || []).length;
  if (letters < 2) return false;
  if (name.length > 48) return false;
  const junk = (name.match(/[^A-Za-z0-9 '\-.]/g) || []).length;
  if (junk / name.length > 0.3) return false;
  return true;
}

// A single "LABEL <number>" (optionally "LABEL: <number>" / "LABEL -
// <number>" / "LABEL <cur>/<max>") line -- resolved ONLY when the label
// cross-references a real stat/SPECIAL/skill via the shared _resolveStatToken()
// (js/api.js -- the exact resolver Native USE and the TERMINAL stat-edit
// grammar already use, Protocol 22, zero forked alias table). Returns null
// (never a guess) when the line doesn't match the shape or the label doesn't
// resolve -- the caller then tries the line as an inventory candidate instead,
// so a line like "Stimpak 3" (unresolved label "Stimpak") correctly falls
// through to the inventory parser rather than being dropped here.
function _tryParseStatLine(line) {
  if (typeof _resolveStatToken !== 'function') return null;
  const m = line.match(
    /^([A-Za-z][A-Za-z .'-]{0,24}?)\s*[:-]{0,2}\s*(-?\d{1,5})(?:\s*\/\s*-?\d{1,5})?\s*$/
  );
  if (!m) return null;
  const resolved = _resolveStatToken(m[1]);
  if (!resolved) return null;
  const value = parseInt(m[2], 10);
  if (isNaN(value)) return null;
  const label =
    typeof _statTokenLabel === 'function' ? _statTokenLabel(resolved) : m[1].trim().toUpperCase();
  return { kind: resolved.kind, key: resolved.key, label, value, raw: line };
}

// An inventory-candidate line: extracts a quantity (leading "3x Stimpak" /
// "3 Stimpak", trailing "Stimpak x3" / "Stimpak (3)" / "Stimpak 3", or a bare
// name with an implicit qty of 1) and cross-references the cleaned name
// against lookupItemInDb() (whichever per-game database file the active game
// loaded -- Protocol 38, no game literal here; exact-then-fuzzy-substring
// match already built in, e.g. an
// OCR-mangled "Stimpakk" fuzzy-resolves to "Stimpak"). `matched=true` only
// when the DB resolves it; an unresolved-but-plausible name is still
// returned (wgt/val=0, type='misc' -- the exact addItem() unmatched-item
// default, never a fabricated non-zero value) so the preview can flag it
// amber for the player to confirm/correct. Returns null for anything that
// doesn't even look like a plausible item name (Protocol 24 -- never invent).
function _tryParseInventoryLine(line) {
  let qty = 1;
  let name = line;
  let m;
  if ((m = line.match(/^(\d{1,4})\s*[xX]\s+(.+)$/))) {
    qty = parseInt(m[1], 10);
    name = m[2];
  } else if ((m = line.match(/^(\d{1,4})\s+(.+)$/))) {
    qty = parseInt(m[1], 10);
    name = m[2];
  } else if ((m = line.match(/^(.+?)\s*[xX]\s*(\d{1,4})$/))) {
    name = m[1];
    qty = parseInt(m[2], 10);
  } else if ((m = line.match(/^(.+?)\s*\(\s*(\d{1,4})\s*\)$/))) {
    name = m[1];
    qty = parseInt(m[2], 10);
  } else if ((m = line.match(/^(.+?)\s+(\d{1,4})$/))) {
    name = m[1];
    qty = parseInt(m[2], 10);
  }
  name = _cleanOcrLine(name)
    .replace(/[:-]+$/, '')
    .trim();
  if (!_looksLikeItemName(name)) return null;
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  if (qty > 999) qty = 999;
  const db = typeof lookupItemInDb === 'function' ? lookupItemInDb(name) : null;
  const matched = !!db;
  return {
    raw: line,
    name,
    qty,
    wgt: matched ? Number(db.wgt) || 0 : 0,
    val: matched && db.val != null ? Number(db.val) || 0 : 0,
    type: matched && db.type ? db.type : 'misc',
    matched,
  };
}

// _parseOcrText(text, ctx) -- the deterministic, game-agnostic parser.
// Returns { inventory: [...], stats: [...], unparsed: [...] } and NEVER
// touches state -- js/ui-render.js's renderVisualParsePreview()/
// applyVisualParse() own the preview/confirm/write path (Unit 2 §3.4/3.5).
// Each line is tried as a stat line FIRST (so "Level 12"/"Big Guns 45" never
// misparse as an inventory row named "Level"/"Big Guns"), then as an
// inventory line; a stat key is kept only once (first occurrence -- a
// repeated/duplicate OCR read of the same line is not a second edit).
function _parseOcrText(text, ctx) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(l => _cleanOcrLine(l))
    .filter(Boolean);

  const inventory = [];
  const stats = [];
  const unparsed = [];
  const seenStatKeys = new Set();
  const seenInvNames = new Set();

  lines.forEach(line => {
    const statHit = _tryParseStatLine(line);
    if (statHit) {
      const dedupeKey = statHit.kind + ':' + statHit.key;
      if (!seenStatKeys.has(dedupeKey)) {
        seenStatKeys.add(dedupeKey);
        stats.push(statHit);
      }
      return;
    }

    const invHit = _tryParseInventoryLine(line);
    if (invHit) {
      const key = invHit.name.toLowerCase();
      if (seenInvNames.has(key)) {
        const ex = inventory.find(i => i.name.toLowerCase() === key);
        if (ex) ex.qty = Math.min(999, ex.qty + invHit.qty);
      } else {
        seenInvNames.add(key);
        inventory.push(invHit);
      }
      return;
    }

    unparsed.push(line);
  });

  return { inventory, stats, unparsed, ctx: ctx || null };
}

// runVisualOcr(file, onStatus) -- Unit 2's full pipeline: OCR (via the shared
// _runOcrPipeline) -> _parseOcrText() -> renderVisualParsePreview() (the
// confirm-gated preview modal, js/ui-render.js). Nothing is written to state
// anywhere in this file or this call chain -- applyVisualParse() only runs
// from the preview modal's own CONFIRM button, after the player reviews/
// edits every row (Protocol 24).
async function runVisualOcr(file, onStatus) {
  const status = typeof onStatus === 'function' ? onStatus : () => {};
  const text = await _runOcrPipeline(file, status);
  status('PARSING RECOGNIZED TEXT...');
  const ctx = typeof getGameContext === 'function' ? getGameContext() : null;
  const parsed = _parseOcrText(text, ctx);
  status('DONE');
  if (typeof renderVisualParsePreview === 'function') {
    renderVisualParsePreview(parsed, file);
  }
  return parsed;
}

// ── UNIT 3: HYBRID ROUTING + KILL-SWITCH (planning/VISUAL_UPLOAD_OCR_PLAN.md §4) ──
// routeVisualUpload(file) is the ONE new entry point handleImageSelection()
// (js/ui-saves.js) calls, immediately after it stashes attachedImageData/
// attachedImageMimeType exactly as before (Protocol 22 — the AI-vision
// fallback below needs those two globals set verbatim; nothing about that
// stash changes). This is the hybrid: on-device OCR is PRIMARY
// (isFeatureEnabled('visualOcr')); the existing, UNTOUCHED transmitMessage()
// inlineData branch (api.js ~2174) is the FALLBACK, reached only when OCR is
// off/failing or the player explicitly taps TRY AI VISION in the "NOTHING
// DETECTED" empty state (renderVisualParsePreview, js/ui-render.js). Both
// flags are fail-open (Protocol 33) via window.isFeatureEnabled(), which
// itself defaults every unset/unreachable/malformed remote flag to true
// (js/cloud.js) — a broken kill-switch read can never strand the player with
// neither path. After FAIL_THRESHOLD OCR failures, _recordFeatureFailure
// (js/cloud.js — the same client analogue Protocol 35 already uses for
// cloudSync) auto-disables OCR for the rest of the session, degrading every
// subsequent attach straight to the AI-vision fallback with no reload
// (Protocol 32). attachedImageData/attachedImageMimeType are declared with
// `let` at the top of js/ui-core.js, which loads AFTER this file in the boot
// chain — referencing them by bare name here is safe because every reference
// below lives inside a function body, evaluated only at a real user action
// (long after full boot), matching the exact same forward-reference pattern
// js/ui-saves.js's handleImageSelection() already relies on (Protocol 22).

function _visualOcrEnabled() {
  return (
    typeof window.isFeatureEnabled !== 'function' || window.isFeatureEnabled('visualOcr') !== false
  );
}

// AI-vision needs the SAME three signals transmitMessage() itself already
// gates on (a Gemini key present, the aiChat flag on, navigator.onLine) —
// reuses the Overseer's existing _isUplinkConnected() (js/ui-core.js) rather
// than re-deriving a second key/online check (Protocol 22), plus its own
// visualAiVision kill-switch on top.
function _aiVisionAvailable() {
  const flagOn =
    typeof window.isFeatureEnabled !== 'function' ||
    window.isFeatureEnabled('visualAiVision') !== false;
  const connected = typeof _isUplinkConnected === 'function' ? _isUplinkConnected() : false;
  return flagOn && connected;
}

// Releases the attach stash + the visible preview/file-input — the ONE place
// this feature clears attachedImageData/attachedImageMimeType once neither
// the OCR nor the AI-vision path needs them anymore (OCR applied/discarded
// via the preview modal's CONFIRM/CANCEL/MANUAL ENTRY, or the dead-end
// message below). The AI-vision hand-off path deliberately does NOT call
// this — transmitMessage() clears the same two globals itself at the end of
// its own round trip (_resetTransmitUI(), api.js), so there is exactly one
// clear site per path and they can never race each other (Protocol 22).
function _clearVisualUploadStash() {
  attachedImageData = null;
  attachedImageMimeType = null;
  const preview = document.getElementById('imagePreview');
  if (preview) {
    preview.style.display = 'none';
    preview.src = '';
  }
  const input = document.getElementById('imageInput');
  if (input) input.value = '';
  const container = document.getElementById('imagePreviewContainer');
  if (container) container.classList.remove('vats-scanning');
}

// Hands the already-stashed image to the existing, UNCHANGED AI-vision
// pipeline (transmitMessage()'s inlineData branch, api.js) — reused
// verbatim, never forked (Protocol 22). Degrades to the manual-entry dead
// end when neither visualAiVision nor a live carrier is available; the app
// stays fully usable either way, never a dead screen (Protocol 33).
function _tryAiVisionFallback(reasonLine) {
  if (!_aiVisionAvailable()) {
    _visualUploadDeadEnd();
    return;
  }
  if (reasonLine && typeof appendToChat === 'function') appendToChat(reasonLine, 'sys');
  if (typeof transmitMessage === 'function') transmitMessage('[VISUAL UPLOAD]');
}

// Neither the primary nor the fallback path is available right now —
// graceful, fully-usable degradation (Protocol 33). Clears the stash (no
// network call is ever going to consume it) and points the player at the
// native CARGO MANIFEST add-item form instead. Never a black screen.
function _visualUploadDeadEnd() {
  _clearVisualUploadStash();
  if (typeof appendToChat === 'function') {
    appendToChat(
      '> Optical scan and Director vision are both offline — add items via CARGO MANIFEST.',
      'sys'
    );
  }
}

// routeVisualUpload(file) — called the instant a screenshot is picked
// (handleImageSelection(), js/ui-saves.js). Primary: on-device OCR
// (runVisualOcr(), Unit 2) → the confirm-gated preview modal, writing
// nothing to state until the player taps CONFIRM & APPLY. On an OCR
// load/recognize failure, or when visualOcr itself is killed, routes to the
// AI-vision fallback instead — the vats-scanning CSS class is added/removed
// by THIS function only around the OCR attempt itself (never left on/wrapped
// in a blanket finally), so it can never fight the AI-vision path's own
// identical class toggle inside transmitMessage() when a fallback hands off
// to it (Protocol 27 — verified against the real synchronous-then-async
// shape of transmitMessage(), not assumed).
async function routeVisualUpload(file) {
  if (!_visualOcrEnabled()) {
    _tryAiVisionFallback(
      '> [SYS] OPTICAL SCAN OFFLINE (OPERATOR-DISABLED) — ROUTING TO DIRECTOR VISION…'
    );
    return;
  }
  const container = document.getElementById('imagePreviewContainer');
  if (container) container.classList.add('vats-scanning');
  try {
    await runVisualOcr(file, () => {});
    if (container) container.classList.remove('vats-scanning');
  } catch (err) {
    if (container) container.classList.remove('vats-scanning');
    if (typeof window._recordFeatureFailure === 'function') {
      window._recordFeatureFailure(
        'visualOcr',
        '>> OPTICAL SCAN PAUSED after repeated errors — using Director vision when available. <<'
      );
    }
    _tryAiVisionFallback('> [SYS] OPTICAL SCAN FAILED — ROUTING TO DIRECTOR VISION…');
  }
}

window._visualOcrEnabled = _visualOcrEnabled;
window._aiVisionAvailable = _aiVisionAvailable;
window._clearVisualUploadStash = _clearVisualUploadStash;
window._tryAiVisionFallback = _tryAiVisionFallback;
window._visualUploadDeadEnd = _visualUploadDeadEnd;
window.routeVisualUpload = routeVisualUpload;

window._ensureTesseract = _ensureTesseract;
window.runVisualOcrTest = runVisualOcrTest;
window._parseOcrText = _parseOcrText;
window.runVisualOcr = runVisualOcr;
