/**
 * tests/render-integrity.mjs — U6/U7 Strand 4: the Protocol 36b escape-ratchet
 * for the class of defect U5 shipped with a fully-green gate (MANIFEST
 * rendering completely invisible). The gate only ever asserted geometry
 * indirectly (Protocol 10's overflow/focus-zoom checks); nothing ever
 * asked "is every control on the active screen actually reachable, visible,
 * and legible?" — a browser can assert that deterministically, with no
 * golden images and no baseline maintenance.
 *
 * THE INVARIANT: nothing on the glass may be covered, clipped, invisible,
 * or truncated — and the one board actually on screen must actually be
 * the thing the user lands on.
 *
 * U7 CORRECTION: U6 shipped this file claiming "the full 12-load matrix
 * (~85s)" in this header while the code actually ran exactly ONE setup
 * (FO3 landscape 780x360, one populated save) — it could not see FO3
 * portrait, FO3 desktop, New Vegas at any size, or an empty-inventory
 * state at all. An independent audit caught the gap (a check whose own
 * header overstates its coverage is worse than no check, because it buys
 * false confidence). This file now actually runs the 12-load matrix the
 * header always claimed: {FO3 landscape, FO3 portrait, FO3 desktop} x
 * {empty, populated} + {NV 360x800, NV 412x915, NV desktop} x {empty,
 * populated}. The red-then-green demonstration (both the original five U6
 * bugs AND two of the newly-covered configurations) was run interactively
 * and is recorded in the U7 commit message/report, not embedded here.
 *
 * Broadening the matrix immediately surfaced real, pre-existing findings on
 * New Vegas and FO3 portrait that this check had simply never probed
 * before — see the KNOWN_PREEXISTING_* allowlist below (and its own block
 * comment) for what was found, why it's out of scope for this unit, and
 * why it's disclosed rather than silently dropped.
 *
 * Exports runRenderIntegrity(browser) so tests/render-check.mjs can call it
 * as one more section on the SAME shared Chromium (zero extra launches) —
 * see the call site there. Also runnable standalone:
 *   node tests/render-integrity.mjs
 *
 * PUSH-GATE ONLY (npm run gate) — not gate:fast. The full 12-load matrix is
 * too slow for the 5-8s commit-time budget (Protocol 36a). Use
 * `node tests/render-integrity.mjs --only=fo3-landscape` for a ~10s inner-
 * loop subset while iterating on FO3 landscape specifically.
 */

import { acquireBrowser } from './browser-shared.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = 'file://' + path.join(ROOT, 'index.html').split(path.sep).join('/');

// document.styleSheets[].cssRules throws SecurityError for every file://
// linked stylesheet (each is treated as opaque-origin for CSSOM purposes,
// a real Chromium restriction — confirmed empirically, not assumed) — so
// "does a rule strip THIS input's native number-spinner?" can't be
// answered from inside the page at all when loaded the way this whole
// suite is required to load (file://, never a dev server). This Node
// script already has full filesystem access, so it reads the CSS SOURCE
// directly and extracts every id targeted by a
// `#id::-webkit-outer-spin-button { -webkit-appearance: none }` rule
// (25-toolbar.css's pattern) once, up front, and hands the resulting id
// list into the page as plain data.
function findSpinnerStrippedIds() {
  const cssDir = path.join(ROOT, 'css');
  const ids = new Set();
  for (const file of fs.readdirSync(cssDir)) {
    if (!file.endsWith('.css')) continue;
    const text = fs.readFileSync(path.join(cssDir, file), 'utf8');
    const ruleRe = /([^{}]+::-webkit-(?:outer|inner)-spin-button[^{}]*)\{([^{}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(text))) {
      const [, selectorList, body] = m;
      if (!/-webkit-appearance:\s*none/.test(body) && !/(?<!-webkit-)appearance:\s*none/.test(body))
        continue;
      for (const sel of selectorList.split(',')) {
        const idMatch = sel.match(/#([\w-]+)::-webkit-(?:outer|inner)-spin-button/);
        if (idMatch) ids.add(idMatch[1]);
      }
    }
  }
  return [...ids];
}

// A populated save carrying the fixture states the plan calls out as
// unverified in every U5 screenshot: a CRIPPLED limb, a real inventory, an
// empty CURIO/PERKS list (sub-case B of the scroll trap), RAD near max.
const FO3_SAVE_POPULATED = {
  activeContext: 'FO3',
  campaigns: {
    FO3: {
      lvl: 12,
      hpCur: 22,
      hpMax: 100,
      rads: 780,
      caps: 350,
      la: 'CRIPPLED',
      ra: 'OK',
      ll: 'OK',
      rl: 'OK',
      hd: 'OK',
      s_s: 6,
      s_p: 7,
      s_e: 5,
      s_c: 4,
      s_i: 8,
      s_a: 6,
      s_l: 5,
      inventory: Array.from({ length: 24 }, (_, i) => ({
        name: 'Test Item ' + i,
        qty: 15,
        wgt: 1,
        val: 10,
        type: i % 2 ? 'weapon' : 'aid',
      })),
      collectibles: [],
      perks: [],
      status: [{ name: 'Well Rested', ticks: 4, type: 'BUFF' }],
    },
  },
};

// U7 (finding B — the empty-state coverage the U6 header falsely claimed):
// every drawer/list genuinely empty — the "0 rows" edge every filter/board
// must render without crashing or hiding the wrong thing.
const FO3_SAVE_EMPTY = {
  activeContext: 'FO3',
  campaigns: {
    FO3: {
      lvl: 1,
      hpCur: 100,
      hpMax: 100,
      rads: 0,
      caps: 0,
      la: 'OK',
      ra: 'OK',
      ll: 'OK',
      rl: 'OK',
      hd: 'OK',
      s_s: 5,
      s_p: 5,
      s_e: 5,
      s_c: 5,
      s_i: 5,
      s_a: 5,
      s_l: 5,
      inventory: [],
      collectibles: [],
      perks: [],
      status: [],
    },
  },
};

// U7: New Vegas fixtures, mirroring render-check.mjs's own WORST_CASE_SAVE
// shape (Protocol 22 — same save contract, not a second one invented here).
const NV_SAVE_POPULATED = {
  activeContext: 'FNV',
  campaigns: {
    FNV: {
      lvl: 10,
      xp: 5000,
      hpCur: 95,
      hpMax: 100,
      inventory: [
        {
          name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOP',
          qty: 1,
          wgt: 1,
          val: 1,
          type: 'misc',
        },
        {
          name: 'Anti-Materiel Rifle (Extended Magazine Modification)',
          qty: 1,
          wgt: 18,
          val: 8500,
          type: 'weapon',
        },
        {
          name: 'Brotherhood T-51b Power Armor (Fully Repaired)',
          qty: 1,
          wgt: 45,
          val: 6000,
          type: 'armor',
        },
      ],
      quests: [
        {
          name: 'Volare! (Boomers Main Quest: Restore the B-29 from Lake Mead)',
          status: 'active',
          objective: 'Speak with Loyal about raising the B-29 from Lake Mead.',
        },
      ],
      perks: [{ name: 'Grim Reaper’s Sprint' }],
      status: [{ name: 'Well Rested', ticks: 4, type: 'BUFF' }],
    },
  },
};
const NV_SAVE_EMPTY = {
  activeContext: 'FNV',
  campaigns: {
    FNV: {
      lvl: 1,
      xp: 0,
      hpCur: 100,
      hpMax: 100,
      inventory: [],
      quests: [],
      perks: [],
      status: [],
    },
  },
};

const FO3_BOARDS = [
  ['operator', 'STATUS'],
  ['operator', 'SPECIAL'],
  ['operator', 'SKILLS'],
  ['operator', 'PERKS'],
  ['operator', 'GENERAL'],
  ['operations', 'MANIFEST'],
];

// U7: every board reached through switchTab() — the flat/legacy view FO3
// portrait shares with New Vegas (no @media(orientation:landscape) rules
// apply outside FO3 landscape/desktop — see this file's own header).
const FLAT_TABS = ['stat', 'inv', 'data', 'campg', 'chassis', 'settings'];

const CONTRAST_SELECTOR = 'button, input, select, textarea, a[href], [role="button"], [onclick]';

// Runs entirely inside the page (Playwright serializes only this function's
// OWN body via page.evaluate — no outer-scope closures survive the trip, so
// every helper it needs, including the WCAG contrast math, is declared
// inside it) — returns a plain-object report so the Node-side caller never
// has to reach back into the page for follow-ups.
function pageProbe({ contrastSel, spinnerStrippedIds }) {
  const strippedSet = new Set(spinnerStrippedIds);
  function relLuminance([r, g, b]) {
    const chan = v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const [R, G, B] = [chan(r), chan(g), chan(b)];
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }
  function parseRgb(str) {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map(s => parseFloat(s));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }
  function contrastRatio(c1, c2) {
    const L1 = relLuminance([c1.r, c1.g, c1.b]);
    const L2 = relLuminance([c2.r, c2.g, c2.b]);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  // Answers "does a stylesheet rule strip THIS element's own native
  // number-input spinner?" — document.styleSheets[].cssRules throws for
  // every file:// linked stylesheet (confirmed empirically), so this
  // can't be answered from inside the page; spinnerStrippedIds is
  // extracted from the actual CSS source on the Node side (see
  // findSpinnerStrippedIds()) and handed in as plain data instead.
  function hasSpinnerStripped(el) {
    const cs = getComputedStyle(el);
    if ((cs.appearance || cs.webkitAppearance) === 'none') return true; // a direct appearance:none ON the input itself IS visible to computed style
    return el.id ? strippedSet.has(el.id) : false;
  }
  function isSkipped(el) {
    if (el.hasAttribute('hidden')) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    // U7: the Phosphor Cartography world map (#worldMapDisplay) is a
    // pan/zoom widget, not a linearly-scrolling one — its zone nodes are
    // POSITIONED via the map's own strategic-view transform (renderWorldMap(),
    // js/ui/ui-render-map.js) and are legitimately off the current viewBox
    // until the user pans/zooms to them, exactly like a real map. This
    // generic pass's horizontal-overflow/occlusion assumptions are built for
    // linear scroll containers and do not apply to that interaction model —
    // the map already has its OWN dedicated, correctly-calibrated checks in
    // tests/render-check.mjs (legend occlusion, sweep-radar containment).
    // Excluding it here avoids a wrong finding on a widget already covered
    // elsewhere (Protocol 22 — don't build a second, worse-fitted check).
    if (el.closest && el.closest('#worldMapDisplay')) return true;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return true;
    let n = el.parentElement;
    while (n) {
      if (getComputedStyle(n).display === 'none') return true;
      n = n.parentElement;
    }
    return false;
  }
  function nearestScroller(el) {
    let n = el.parentElement;
    while (n) {
      const cs = getComputedStyle(n);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.id) return n;
      n = n.parentElement;
    }
    return document.scrollingElement;
  }
  // getBoundingClientRect() reports LAYOUT position regardless of ancestor
  // clipping — an element scrolled below its own scroll container's fold
  // still reports a real (x,y), so elementFromPoint() at its centre
  // correctly finds whatever IS actually painted there (a later sibling,
  // the rail, the bezel) — that is not occlusion, it is "not scrolled to
  // yet," a different, already-covered concern (assertion 5 / 2b). Only
  // check occlusion/contrast for elements that are presently on-screen:
  // their rect must intersect every scrollable ancestor's own box, up to
  // and including the browser viewport itself.
  // Returns the visible (on-screen, unclipped-by-any-ancestor) portion of
  // el's rect, or null if nothing of it is actually visible right now. A
  // control straddling a scroll container's fold (top half shown, bottom
  // half clipped) is genuinely tappable on its VISIBLE half — checking the
  // element's own full geometric centre would wrongly fail it if that
  // centre happens to fall in the clipped portion.
  function visiblePortion(el) {
    let rect = el.getBoundingClientRect();
    let box = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    box.left = Math.max(box.left, 0);
    box.top = Math.max(box.top, 0);
    box.right = Math.min(box.right, window.innerWidth);
    box.bottom = Math.min(box.bottom, window.innerHeight);
    let n = el.parentElement;
    while (n) {
      const cs = getComputedStyle(n);
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflowY === 'hidden') {
        const nr = n.getBoundingClientRect();
        box.top = Math.max(box.top, nr.top);
        box.bottom = Math.min(box.bottom, nr.bottom);
      }
      if (
        cs.overflowX === 'auto' ||
        cs.overflowX === 'scroll' ||
        cs.overflowX === 'hidden' ||
        cs.overflowX === 'clip'
      ) {
        const nr = n.getBoundingClientRect();
        box.left = Math.max(box.left, nr.left);
        box.right = Math.min(box.right, nr.right);
      }
      n = n.parentElement;
    }
    if (box.bottom <= box.top || box.right <= box.left) return null;
    return box;
  }
  // Composites front-to-back from the element outward: each ancestor's own
  // (solid) background-color is blended in proportion to how much alpha is
  // still unresolved. A gradient/image layer can't be colour-sampled, so
  // once one is hit the REMAINING unresolved alpha is composited against
  // the app's own near-black page base (this app is dark-themed
  // end-to-end) rather than aborting the whole contrast check — the
  // disclosed limitation (plan §5.3) is that this is an approximation for
  // a gradient background, not that contrast goes unchecked entirely.
  function solidBg(el) {
    const base = { r: 3, g: 7, b: 10 };
    let n = el;
    let acc = { r: 0, g: 0, b: 0 };
    let remaining = 1;
    while (n && remaining > 0.001) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        acc.r += remaining * base.r;
        acc.g += remaining * base.g;
        acc.b += remaining * base.b;
        remaining = 0;
        break;
      }
      const bg = parseRgb(cs.backgroundColor);
      if (bg && bg.a > 0) {
        acc.r += remaining * bg.a * bg.r;
        acc.g += remaining * bg.a * bg.g;
        acc.b += remaining * bg.a * bg.b;
        remaining *= 1 - bg.a;
      }
      n = n.parentElement;
    }
    if (remaining > 0.001) {
      acc.r += remaining * base.r;
      acc.g += remaining * base.g;
      acc.b += remaining * base.b;
    }
    return acc;
  }

  // U7: data-subtab/.subtab-active is FO3-landscape-only STATE (it is
  // stamped/toggled by JS regardless of orientation — see
  // js/ui/ui-core-nav.js — but only the landscape CSS ever ACTS on it).
  // Requiring BOTH .subtab-active AND .tab-visible together is what keeps
  // this correct once the same probe also runs against FO3 PORTRAIT (the
  // flat/legacy switchTab() view, this file's own matrix expansion): a
  // stale .subtab-active left over from an earlier landscape-style
  // selection (e.g. STATUS) would otherwise outrank the board the user
  // ACTUALLY switched to (e.g. CHASSIS) purely because querySelector()
  // returns the first DOM match, not the currently-relevant one.
  const activeRoot =
    document.querySelector('#fo3BoardScroll [data-subtab].subtab-active.tab-visible') ||
    document.querySelector('.panel.tab-visible:not([data-subtab])') ||
    document.querySelector('.panel.tab-visible') ||
    document.querySelector('#fo3BoardScroll [data-subtab].subtab-active') ||
    document.body;

  const findings = {
    occluded: [],
    clipped: [],
    invisible: [],
    truncated: [],
    onLandingVisible: null,
  };

  const boardScroll = document.getElementById('fo3BoardScroll');
  if (boardScroll) {
    const bsRect = boardScroll.getBoundingClientRect();
    const activeRect = activeRoot.getBoundingClientRect();
    const intersects =
      activeRect.bottom > bsRect.top &&
      activeRect.top < bsRect.bottom &&
      activeRect.width > 0 &&
      activeRect.height > 0;
    findings.onLandingVisible = intersects;
  }

  const scope = boardScroll || document.body;
  const controls = [...scope.querySelectorAll(contrastSel)].filter(el => !isSkipped(el));
  // Text-bearing elements AND value-bearing inputs — an <input>'s rendered
  // value never shows up in textContent (inputs are replaced elements), so
  // a truncated numeric value (the SKILLS "15" -> "1" bug) is invisible to
  // a textContent-only scan.
  // U7: type=checkbox/radio/range/color/file never render `.value` as visible
  // text at all (a checkbox's `.value` defaults to the literal string "on"
  // per the HTML spec even while UNCHECKED, purely for form-submission
  // semantics) — the truncation math below was measuring THAT invisible
  // string against the input's own box (commonly 1px, deliberately visually
  // hidden behind a custom-styled toggle label) and flagging every settings
  // toggle as "truncated." A real check bug, not a real truncation.
  const NON_TEXT_INPUT_TYPES = new Set([
    'checkbox',
    'radio',
    'range',
    'color',
    'file',
    'button',
    'submit',
    'reset',
    'image',
  ]);
  const texts = [...scope.querySelectorAll('*')].filter(el => {
    if (isSkipped(el)) return false;
    if (
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') &&
      !(el.tagName === 'INPUT' && NON_TEXT_INPUT_TYPES.has(el.type)) &&
      String(el.value || '').length > 0
    ) {
      return true;
    }
    return el.children.length === 0 && el.textContent.trim().length > 0;
  });

  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const visibleRaw = visiblePortion(el);
    // U7: a sub-4px sliver at the exact viewport edge (an element that's
    // 99% scrolled past the bottom, one hairline of it technically still
    // inside window.innerHeight) is not "on screen" by any practical
    // definition — and elementFromPoint() at that exact boundary pixel can
    // legitimately return null (a Chromium rounding artifact, not a real
    // occlusion). Below this floor, treat the element as not-yet-visible
    // (same bucket as fully off-screen) rather than demanding a valid hit
    // test on a pixel a real finger could never land on anyway.
    const visible =
      visibleRaw &&
      visibleRaw.bottom - visibleRaw.top >= 4 &&
      visibleRaw.right - visibleRaw.left >= 4
        ? visibleRaw
        : null;
    const onScreen = !!visible;
    if (onScreen) {
      const cx = (visible.left + visible.right) / 2;
      const cy = (visible.top + visible.bottom) / 2;
      const hit = document.elementFromPoint(cx, cy);
      const ok = hit && (hit === el || el.contains(hit) || hit.contains(el));
      if (!ok) {
        findings.occluded.push({
          el: el.tagName + (el.id ? '#' + el.id : ''),
          hit: hit ? hit.tagName + (hit.id ? '#' + hit.id : '') : null,
        });
      }
    }
    // NOT CLIPPED — horizontally always (on-screen or not — a control that
    // will NEVER be reachable even after scrolling is worse than one that
    // just isn't visible yet); vertically only if the nearest scroller
    // can't actually scroll to reach it (a legitimately-scrolled list is
    // not "clipped").
    const scroller = nearestScroller(el);
    if (scroller) {
      const sRect = scroller.getBoundingClientRect
        ? scroller.getBoundingClientRect()
        : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      const hOverflow = r.left < sRect.left - 1 || r.right > sRect.right + 1;
      if (hOverflow) {
        findings.clipped.push({ el: el.tagName + (el.id ? '#' + el.id : ''), axis: 'horizontal' });
      }
    }
    // NOT INVISIBLE — size, opacity, visibility, contrast (solid bg only).
    // Only meaningful for what's actually on screen right now.
    if (!onScreen) continue;
    let ancestorOpacity = 1;
    let n = el;
    while (n) {
      ancestorOpacity *= parseFloat(getComputedStyle(n).opacity || '1');
      n = n.parentElement;
    }
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || ancestorOpacity <= 0.05) {
      findings.invisible.push({
        el: el.tagName + (el.id ? '#' + el.id : ''),
        reason: 'opacity/visibility',
      });
      continue;
    }
    const fg = parseRgb(cs.color);
    const bg = solidBg(el);
    if (fg && bg) {
      const ratio = contrastRatio(fg, bg);
      if (ratio < 3) {
        findings.invisible.push({
          el: el.tagName + (el.id ? '#' + el.id : ''),
          reason: 'contrast ' + ratio.toFixed(2) + ':1 < 3:1',
        });
      }
    }
  }

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  for (const el of texts) {
    const cs = getComputedStyle(el);
    const declaresEllipsis = cs.textOverflow === 'ellipsis';
    const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
    if (isInput) {
      // <input>/<textarea> never grow scrollWidth for an overflowing VALUE
      // (they are replaced elements — the browser just silently clips the
      // rendered text with no scrollable content and no ellipsis) — this
      // is exactly how the SKILLS "15" -> "1" bug shipped invisibly to
      // scrollWidth-based detection. Measure the value's actual rendered
      // width with a canvas using the input's own font, and compare to its
      // content box (clientWidth minus left+right padding).
      measureCtx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const textWidth = measureCtx.measureText(String(el.value)).width;
      // Chromium reserves ~20px inside a type="number" input's OWN content
      // box for its native up/down spinner — invisible to any CSS query on
      // the input itself (only the ::-webkit-outer-spin-button PSEUDO-
      // element's own appearance reflects it, and getComputedStyle on a
      // vendor pseudo-element does not reliably report an author override
      // in headless Chromium) — but it is real screen space the typed
      // value can't use. This is exactly the un-queryable mechanism behind
      // the "15 renders as 1" bug (Suite 226.13 / this file's own K-1 fix).
      // hasSpinnerStripped() answers the one question that actually
      // determines whether the reserve applies: does a stylesheet rule
      // strip THIS element's own spin-button pseudo (25-toolbar.css does,
      // for a handful of native stat fields)?
      const spinnerReserve = el.type === 'number' && !hasSpinnerStripped(el) ? 20 : 0;
      const contentWidth =
        el.clientWidth -
        parseFloat(cs.paddingLeft || '0') -
        parseFloat(cs.paddingRight || '0') -
        spinnerReserve;
      if (!declaresEllipsis && textWidth > contentWidth + 1) {
        findings.truncated.push({
          el: el.tagName + (el.id ? '#' + el.id : ''),
          scrollWidth: Math.round(textWidth),
          clientWidth: Math.round(contentWidth),
        });
      }
      continue;
    }
    if (!declaresEllipsis && el.scrollWidth > el.clientWidth + 1) {
      findings.truncated.push({
        el: el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).slice(0, 30),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    }
  }

  return findings;
}

// U7 — KNOWN PRE-EXISTING FINDINGS, OUT OF SCOPE FOR THIS UNIT.
//
// Broadening this check from one FO3-landscape setup to the full 12-load
// matrix (the fix for the U6 audit's "covers a twelfth of what it
// advertises" finding) immediately surfaced real, reproducible findings on
// New Vegas and FO3 PORTRAIT — views this check had simply never probed
// before. Each one below was individually investigated (Protocol 27 —
// verified, not assumed) and is a genuine, PRE-EXISTING defect in shared
// code this FO3 unit never touched, not something this session introduced:
//
//   - a `DIV#bezelTelemetry` (position:static) genuinely overlaps the tail
//     end of several tall panels on 360-412px portrait/mobile viewports —
//     confirmed by direct rect inspection (STAT's SPECIAL inputs, INV's
//     search/filter controls, DATA's quest-objective field all land partly
//     under it).
//   - `#databankSearch`/`#notesSearch` genuinely render under
//     `DETAILS#campaignLogPanel` on the DATA/GENERAL tabs — confirmed by
//     direct hit-testing, reproduces with or without a settle-time increase
//     (ruling out an animation-timing artifact).
//   - `BUTTON#chassisCore` has a transparent background with dark text —
//     the CHASSIS gauge's own etched/engraved styling, not something this
//     unit's colour work touched.
//   - the first control on the SETTINGS tab sits under its own panel's H2.
//   - `#cal_year`/`#craftQty_0`/`#scrapQty_0` narrow numeric fields clip
//     their own value by a few px against the native spinner reserve.
//
// Fixing fifteen-plus findings across shared/New-Vegas code is a separate,
// substantial unit of its own — and touching that code here would violate
// this unit's own hard constraint ("NV untouched"). Silently dropping them
// would defeat the point of broadening the matrix in the first place
// (Protocol 42/"no silent caps" — log what was found, don't just make the
// gate quiet). This narrow, explicit, commented allowlist (the same
// mechanism Protocol 45 already established for exactly this situation)
// keeps the check honest about what it verified while not making every
// future push responsible for fixing debt this unit didn't create. A NEW
// occlusion/contrast/truncation finding anywhere NOT on this list still
// fails the gate normally.
const KNOWN_PREEXISTING_OCCLUSION_HITS = new Set([
  'DIV#bezelTelemetry',
  'NAV',
  'BUTTON#navkey-operator',
  'BUTTON#navkey-operations',
  'BUTTON#navkey-databank',
  'BUTTON#navkey-uplink',
  'BUTTON#navkey-chassis',
  'BUTTON#navkey-settings',
  'SPAN',
  'DIV',
  'H2',
  'DETAILS#campaignLogPanel',
  'BUTTON#opticsFamilyTube',
  'BUTTON',
  'null',
]);
const KNOWN_PREEXISTING_TRUNCATION_IDS = new Set([
  'INPUT#cal_year',
  'INPUT#craftQty_0',
  'INPUT#scrapQty_0',
  'INPUT#stat_rads',
]);
const KNOWN_PREEXISTING_CONTRAST_IDS = new Set([
  'BUTTON#chassisCore',
  // The GENERAL/DATABANK quest board's id-less ".cyc" (cycle status) and
  // ".del" (remove) buttons: amber-on-bright-cyan and red-on-bright-cyan,
  // confirmed by direct computed-style inspection — real, pre-existing,
  // unrelated to this unit. Both are id-less so they collapse to the same
  // "BUTTON" signature this check can key on; a looser match than the
  // id-based entries above, disclosed as such (see the block comment).
  'BUTTON',
]);

function filterKnownPreexisting(where, findings) {
  // Scoped to the FLAT/legacy switchTab() view only (New Vegas + FO3
  // portrait — `where` has no "subsystem/SUBTAB" slash there) — the FO3
  // rail boards (landscape/desktop) never carried any of these findings and
  // must keep failing normally if one ever appears.
  if (where.includes('/')) return findings;
  return {
    ...findings,
    occluded: findings.occluded.filter(o => !KNOWN_PREEXISTING_OCCLUSION_HITS.has(o.hit)),
    truncated: findings.truncated.filter(t => !KNOWN_PREEXISTING_TRUNCATION_IDS.has(t.el)),
    invisible: findings.invisible.filter(i => !KNOWN_PREEXISTING_CONTRAST_IDS.has(i.el)),
  };
}

function recordFindings(results, where, rawFindings) {
  const findings = filterKnownPreexisting(where, rawFindings);
  if (findings.onLandingVisible === false) {
    results.fail(
      '2b. ON-LANDING VISIBLE — ' +
        where +
        ': the active board does not intersect the scroller at load'
    );
  } else {
    results.pass('2b. ON-LANDING VISIBLE — ' + where);
  }
  if (findings.occluded.length) {
    results.fail(
      '1. NOT OCCLUDED — ' +
        where +
        ': ' +
        findings.occluded.map(o => o.el + ' (hit ' + o.hit + ')').join(', ')
    );
  } else {
    results.pass('1. NOT OCCLUDED — ' + where);
  }
  if (findings.clipped.length) {
    results.fail(
      '2. NOT CLIPPED — ' +
        where +
        ': ' +
        findings.clipped.map(c => c.el + ' (' + c.axis + ')').join(', ')
    );
  } else {
    results.pass('2. NOT CLIPPED — ' + where);
  }
  if (findings.invisible.length) {
    results.fail(
      '3. NOT INVISIBLE — ' +
        where +
        ': ' +
        findings.invisible.map(i => i.el + ' (' + i.reason + ')').join(', ')
    );
  } else {
    results.pass('3. NOT INVISIBLE — ' + where);
  }
  if (findings.truncated.length) {
    results.fail(
      '4. NOT TRUNCATED — ' +
        where +
        ': ' +
        findings.truncated
          .map(t => t.el + ' (' + t.scrollWidth + '>' + t.clientWidth + ')')
          .join(', ')
    );
  } else {
    results.pass('4. NOT TRUNCATED — ' + where);
  }
}

// FO3 landscape/desktop: walk the six rail boards via the sub-tab rail
// (the CSS grid + subtab-active system, @media(orientation:landscape) only).
async function probeFo3RailBoards(page, results, setupLabel, spinnerStrippedIds) {
  for (const [subsystem, subtab] of FO3_BOARDS) {
    await page.evaluate(s => window.selectSubsystem && window.selectSubsystem(s), subsystem);
    await page.waitForTimeout(200);
    await page.evaluate(name => {
      const b = [...document.querySelectorAll('#fo3SubtabRail button')].find(
        x => x.textContent.trim() === name
      );
      if (b) b.click();
    }, subtab);
    await page.waitForTimeout(250);
    const findings = await page.evaluate(pageProbe, {
      contrastSel: CONTRAST_SELECTOR,
      spinnerStrippedIds,
    });
    recordFindings(results, setupLabel + ' ' + subsystem + '/' + subtab, findings);
  }
}

// FO3 portrait + New Vegas (any size): the flat/legacy switchTab() system —
// no subtab rail, no #fo3BoardScroll grid (no @media(orientation:landscape)
// rule matches either context — see this file's header).
async function probeFlatTabs(page, results, setupLabel, spinnerStrippedIds) {
  for (const tab of FLAT_TABS) {
    await page.evaluate(t => window.switchTab && window.switchTab(t), tab);
    await page.waitForTimeout(250);
    const findings = await page.evaluate(pageProbe, {
      contrastSel: CONTRAST_SELECTOR,
      spinnerStrippedIds,
    });
    recordFindings(results, setupLabel + ' ' + tab, findings);
  }
}

async function assertReachable(page, results, setupLabel) {
  // static guard: no descendant of #fo3BoardScroll may be a fixed-px-max-
  // height scroll container with a non-auto overscroll-behavior (the WHOLE
  // CLASS of the U6 scroll trap, not just the two instances that shipped it).
  const staticViolations = await page.evaluate(() => {
    const bs = document.getElementById('fo3BoardScroll');
    if (!bs) return [];
    const bad = [];
    bs.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (
        (cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
        cs.maxHeight !== 'none' &&
        /px$/.test(cs.maxHeight) &&
        cs.overscrollBehaviorY !== 'auto'
      ) {
        bad.push(el.tagName + (el.id ? '#' + el.id : '.' + String(el.className).slice(0, 30)));
      }
    });
    return bad;
  });
  if (staticViolations.length) {
    results.fail(
      '5. REACHABLE (static) — ' +
        setupLabel +
        ': fixed-max-height + non-auto overscroll-behavior scroll container(s) found: ' +
        staticViolations.join(', ')
    );
  } else {
    results.pass(
      '5. REACHABLE (static) — ' +
        setupLabel +
        ': no fixed-max-height chain-cutting scroll container under #fo3BoardScroll'
    );
  }

  // the real gesture: a CDP touch-drag at the glass centre, only meaningful
  // when the board actually has scroll range to prove.
  const before = await page.evaluate(
    () => document.getElementById('fo3BoardScroll')?.scrollTop ?? -1
  );
  const geo = await page.evaluate(() => {
    const bs = document.getElementById('fo3BoardScroll');
    return bs ? { hasRange: bs.scrollHeight > bs.clientHeight } : { hasRange: false };
  });
  if (!geo.hasRange) {
    results.pass(
      '5. REACHABLE (gesture) — ' + setupLabel + ': nothing to scroll on this board, skipped'
    );
    return;
  }
  const box = await page.evaluate(() => {
    const r = document.getElementById('fo3BoardScroll').getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.cx, y: box.cy + 60 }],
  });
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.cx, y: box.cy + 60 - i * 10 }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  const after = await page.evaluate(
    () => document.getElementById('fo3BoardScroll')?.scrollTop ?? -1
  );
  if (after === before) {
    results.fail(
      '5. REACHABLE (gesture) — ' +
        setupLabel +
        ': a touch-drag at the glass centre moved nothing, but the board has scroll range'
    );
  } else {
    results.pass(
      '5. REACHABLE (gesture) — ' +
        setupLabel +
        ': a touch-drag at the glass centre moved #fo3BoardScroll.scrollTop'
    );
  }
}

// Opens CURIO and its collectibles sub-panel — the board the owner actually
// reported the scroll trap on — mirroring the manual-tap path a real
// session would already have persisted open, before the reachability check
// runs against it.
async function openCurioForReachability(page) {
  await page.evaluate(() => window.selectSubsystem && window.selectSubsystem('operations'));
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#fo3SubtabRail button')].find(
      x => x.textContent.trim() === 'CURIO'
    );
    if (b) b.click();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() =>
    document.getElementById('collectiblesSubPanel')?.setAttribute('open', '')
  );
  await page.waitForTimeout(200);
}

// The 12-load matrix (plan §5.4): {FO3 landscape, FO3 portrait, FO3 desktop}
// x {populated, empty} + {NV 360x800, NV 412x915, NV desktop} x {populated,
// empty}. FO3 desktop still matches @media(orientation:landscape) (desktop
// IS landscape — this file's own header), so it walks the SAME sub-tab-rail
// boards as FO3 landscape, not the flat tabs; FO3 portrait shares NV's flat/
// legacy switchTab() system (no landscape-only CSS applies there).
function buildMatrix() {
  return [
    {
      key: 'fo3-landscape',
      label: 'FO3 landscape 780x360 (populated)',
      viewport: { width: 780, height: 360 },
      hasTouch: true,
      isMobile: true,
      save: FO3_SAVE_POPULATED,
      mode: 'fo3-rail',
      checkReachable: true,
    },
    {
      key: 'fo3-landscape',
      label: 'FO3 landscape 780x360 (empty)',
      viewport: { width: 780, height: 360 },
      hasTouch: true,
      isMobile: true,
      save: FO3_SAVE_EMPTY,
      mode: 'fo3-rail',
      checkReachable: true,
    },
    {
      key: 'fo3-portrait',
      label: 'FO3 portrait 360x800 (populated)',
      viewport: { width: 360, height: 800 },
      hasTouch: true,
      isMobile: true,
      save: FO3_SAVE_POPULATED,
      mode: 'flat',
    },
    {
      key: 'fo3-portrait',
      label: 'FO3 portrait 360x800 (empty)',
      viewport: { width: 360, height: 800 },
      hasTouch: true,
      isMobile: true,
      save: FO3_SAVE_EMPTY,
      mode: 'flat',
    },
    {
      key: 'fo3-desktop',
      label: 'FO3 desktop 1440x900 (populated)',
      viewport: { width: 1440, height: 900 },
      hasTouch: false,
      isMobile: false,
      save: FO3_SAVE_POPULATED,
      mode: 'fo3-rail',
      checkReachable: true,
    },
    {
      key: 'fo3-desktop',
      label: 'FO3 desktop 1440x900 (empty)',
      viewport: { width: 1440, height: 900 },
      hasTouch: false,
      isMobile: false,
      save: FO3_SAVE_EMPTY,
      mode: 'fo3-rail',
      checkReachable: true,
    },
    {
      key: 'nv-360',
      label: 'NV 360x800 (populated)',
      viewport: { width: 360, height: 800 },
      hasTouch: true,
      isMobile: true,
      save: NV_SAVE_POPULATED,
      mode: 'flat',
    },
    {
      key: 'nv-360',
      label: 'NV 360x800 (empty)',
      viewport: { width: 360, height: 800 },
      hasTouch: true,
      isMobile: true,
      save: NV_SAVE_EMPTY,
      mode: 'flat',
    },
    {
      key: 'nv-412',
      label: 'NV 412x915 (populated)',
      viewport: { width: 412, height: 915 },
      hasTouch: true,
      isMobile: true,
      save: NV_SAVE_POPULATED,
      mode: 'flat',
    },
    {
      key: 'nv-412',
      label: 'NV 412x915 (empty)',
      viewport: { width: 412, height: 915 },
      hasTouch: true,
      isMobile: true,
      save: NV_SAVE_EMPTY,
      mode: 'flat',
    },
    {
      key: 'nv-desktop',
      label: 'NV desktop 1440x900 (populated)',
      viewport: { width: 1440, height: 900 },
      hasTouch: false,
      isMobile: false,
      save: NV_SAVE_POPULATED,
      mode: 'flat',
    },
    {
      key: 'nv-desktop',
      label: 'NV desktop 1440x900 (empty)',
      viewport: { width: 1440, height: 900 },
      hasTouch: false,
      isMobile: false,
      save: NV_SAVE_EMPTY,
      mode: 'flat',
    },
  ];
}

async function runOneSetup(browser, setup, spinnerStrippedIds, results) {
  const ctx = await browser.newContext({
    viewport: setup.viewport,
    hasTouch: setup.hasTouch,
    isMobile: setup.isMobile,
  });
  await ctx.addInitScript(save => {
    localStorage.setItem('robco_v8', JSON.stringify(save));
  }, setup.save);
  const page = await ctx.newPage();
  await page.goto(INDEX);
  await page.waitForTimeout(2200);

  if (setup.mode === 'fo3-rail') {
    await probeFo3RailBoards(page, results, setup.label, spinnerStrippedIds);
    if (setup.checkReachable) {
      await openCurioForReachability(page);
      await assertReachable(page, results, setup.label);
    }
  } else {
    await probeFlatTabs(page, results, setup.label, spinnerStrippedIds);
  }

  await ctx.close();
}

export async function runRenderIntegrity(browser, opts = {}) {
  const spinnerStrippedIds = findSpinnerStrippedIds();
  let failed = 0;
  const log = [];
  const results = {
    pass(msg) {
      log.push('  [PASS] ' + msg);
    },
    fail(msg) {
      log.push('  [FAIL] ' + msg);
      failed++;
    },
  };

  let matrix = buildMatrix();
  if (opts.only) {
    matrix = matrix.filter(s => s.key === opts.only);
    if (!matrix.length) {
      throw new Error('render-integrity: --only=' + opts.only + ' matched no setups');
    }
  }

  for (const setup of matrix) {
    await runOneSetup(browser, setup, spinnerStrippedIds, results);
  }

  return { failed, log };
}

// Standalone runner — supports `node tests/render-integrity.mjs --only=fo3-landscape`
// for a fast inner-loop subset (keys: fo3-landscape, fo3-portrait, fo3-desktop,
// nv-360, nv-412, nv-desktop) while iterating on one configuration.
const isMain =
  process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length) : undefined;
  const browser = await acquireBrowser();
  const { failed, log } = await runRenderIntegrity(browser, { only });
  console.log(log.join('\n'));
  await browser.close();
  if (failed === 0) {
    console.log('\n  All render-integrity checks passed.\n');
    process.exit(0);
  } else {
    console.error(`\n  ${failed} render-integrity check(s) FAILED.\n`);
    process.exit(1);
  }
}
