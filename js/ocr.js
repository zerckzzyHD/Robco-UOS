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

// runVisualOcrTest(file, onStatus) -- the Unit-1 proof: pick -> preprocess ->
// OCR -> return the raw recognized text. No parser, no state write of any
// kind (Unit 2 adds the deterministic _parseOcrText(); Unit 3 wires the
// hybrid/kill-switch routing) -- this purely proves the wasm/worker/CSP/
// cache infra actually works end-to-end. corePath deliberately points at the
// EXACT vendored core file (not a bare directory): Tesseract's own
// getCore.js auto-selects a SIMD-vs-non-SIMD core variant when corePath is a
// directory, which would 404 since only the non-SIMD lstm-only core is
// vendored here (kept the repo-weight addition to a single ~6.7MB core
// instead of ~15MB for both variants) -- pointing at the literal filename
// sidesteps that probe entirely and guarantees only the one vendored file is
// ever requested (Protocol 27: verified against the actual vendored
// package's resolution logic, not assumed from the plan's illustrative
// snippet).
async function runVisualOcrTest(file, onStatus) {
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

window._ensureTesseract = _ensureTesseract;
window.runVisualOcrTest = runVisualOcrTest;
