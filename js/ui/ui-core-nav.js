// ── ui-core-nav.js — BEZEL SUBSYSTEM NAV (split from ui-core.js, 2.8.5 U-A1) ──
// selectSubsystem/switchTab/_syncBezelNav, SHORTCUT_ROUTES + #go= routing,
// hotkeys, the DIRECTORY modal, tab/scroll persistence. Global scope, static
// <script> tag — loads alongside the rest of the ui-core-*.js family, before
// window.onload fires (see index.html load order). GOTCHA: two independent
// numeric-hotkey schemes share one keydown handler — Ctrl+1-6 toggles the
// first 6 <details class="panel"> elements, while bare 1-6 (no modifier,
// outside an input) selects a bezel subsystem — do not conflate them.

// ── KEYBOARD SHORTCUTS ──────────────────────────────────────────────
function _wireKeyboardShortcuts() {
  // #15 Keyboard Shortcuts — Ctrl+1–6 toggle first 6 panels, Ctrl+/ focus chat
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 6) {
        e.preventDefault();
        const panels = Array.from(document.querySelectorAll('details.panel'));
        const target = panels[num - 1];
        if (target) {
          if (target.open) target.removeAttribute('open');
          else target.setAttribute('open', '');
          // persist new state
          const ps = JSON.parse(MetaStore.get('robco_panel_state') || '{}');
          if (target.dataset.panelId) {
            ps[target.dataset.panelId] = target.open;
            MetaStore.set('robco_panel_state', JSON.stringify(ps));
          }
        }
      } else if (e.key === '/') {
        e.preventDefault();
        const ci = document.getElementById('chatInput');
        if (ci) ci.focus();
      }
    }
    // Tab keyboard shortcuts: 1=STAT, 2=INV, 3=DATA (no modifier, not in input)
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      const activeEl = document.activeElement;
      const inInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT');
      if (!inInput) {
        // DO-N bezel hotkeys: [1]-[5] select a subsystem, [0] opens the flat
        // DIRECTORY fallback. [4]/[5] are new (UPLINK/CHASSIS were never
        // gated by a tab); [1]-[3] keep routing through switchTab() exactly
        // as before via selectSubsystem()'s _NAV_TAB_FOR map.
        // PROTOCOL 25 (bezel-nav extension): the tab-bar-to-bezel swap was
        // conditioned on hotkeys [1]-[5] (+[0] for DIRECTORY) continuing to
        // work — this map is the literal guarantee of that condition.
        const hotkeyMap = {
          1: 'operator',
          2: 'operations',
          3: 'databank',
          4: 'uplink',
          5: 'chassis',
          6: 'settings',
        };
        if (hotkeyMap[e.key]) {
          e.preventDefault();
          selectSubsystem(hotkeyMap[e.key]);
        } else if (e.key === '0') {
          e.preventDefault();
          openBezelDirectory();
        }
      }
    }
    if (e.key === 'Tab') {
      var trapModal = document.getElementById('sysModal');
      if (trapModal && trapModal.style.display !== 'none') {
        var focusableEls = Array.from(
          trapModal.querySelectorAll(
            'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
          )
        ).filter(function (el) {
          return el.offsetParent !== null;
        });
        if (focusableEls.length > 0) {
          var first = focusableEls[0];
          var last = focusableEls[focusableEls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    if (e.key === 'Escape') {
      const modal = document.getElementById('sysModal');
      if (modal && modal.style.display !== 'none') closeModal();
    }
  });
}

// ── TAB NAVIGATION ───────────────────────────────────────────────
// Tabs: 'stat' | 'inv' | 'data' | 'campg' | 'chassis' | 'settings'
// Each panel has data-tab="stat|inv|data|campg|chassis|settings". Panels with no
// data-tab always show.
const TAB_NAMES = ['stat', 'inv', 'data', 'campg', 'chassis', 'settings'];
// DO-N: 'data' and 'campg' present together as the ONE bezel subsystem
// (DATABANK) — selecting either tab shows both panel groups; STAT/INV stay
// mutually exclusive. switchTab() itself keeps working standalone exactly
// as before (routing/hotkey/deep-link contract preserved) — this only
// widens which panels a 'data'/'campg' call reveals.
const _DATABANK_TABS = ['data', 'campg'];
const TAB_TO_SUBSYSTEM = {
  stat: 'operator',
  inv: 'operations',
  data: 'databank',
  campg: 'databank',
  chassis: 'chassis',
  settings: 'settings',
};

function switchTab(tab) {
  if (!TAB_NAMES.includes(tab)) return;
  _saveOutgoingScroll(); // FIX 2: remember where the previous subsystem was scrolled to
  playPanelClick(); // H1: rotary dial click on tab switch
  // Show panels for the active tab (databank merges data+campg), hide others
  const showTabs = _DATABANK_TABS.includes(tab) ? _DATABANK_TABS : [tab];
  document.querySelectorAll('.panel[data-tab]').forEach(el => {
    if (showTabs.includes(el.dataset.tab)) {
      el.classList.add('tab-visible');
    } else {
      el.classList.remove('tab-visible');
    }
  });
  // Store active tab so page reload restores it
  MetaStore.set('robco_active_tab', tab);
  // Re-render world map when switching to the DATA tab so it measures real panel width
  if (tab === 'data' && typeof renderWorldMap === 'function') renderWorldMap();
  // DO-N: sync the bezel subsystem nav (LED/aria-selected/telemetry) to match —
  // every entry path (hotkey, #go= deep-link, bezel click, AI auto-expand)
  // stays visually consistent through this one call.
  const subsystem = TAB_TO_SUBSYSTEM[tab] || 'operator';
  _syncBezelNav(subsystem);
  // FO3 PIP-BOY BUILD U1: apply this subsystem's rail (game-agnostic no-op
  // when the active identity carries no `rails` data — NV/FO4 today). Placed
  // here, not in selectSubsystem() as the build plan's literal wording
  // suggested, because switchTab() — not selectSubsystem() — is the ONE
  // choke point every entry path funnels through, including the boot-time
  // restore (initTabs() calls switchTab() directly, bypassing
  // selectSubsystem() entirely) — exactly the same reasoning that already
  // placed _syncBezelNav() here instead of only in selectSubsystem(). Without
  // this correction, "reload restores the last sub-tab" (U1's own
  // acceptance criterion) would silently fail on every fresh page load.
  _applyRails(subsystem);
  // FIX 2: restore this subsystem's remembered scroll offset (or the top of
  // the column if it's never been visited) — covers the boot-time initial
  // tab too, since initTabs() calls switchTab() directly.
  _restoreScrollFor(subsystem, true);
  _lastScrollSubsystem = subsystem;
}

// Initialize tab on page load (restores last used tab, defaults to 'stat')
function initTabs() {
  let tab = 'stat';
  const saved = MetaStore.get('robco_active_tab');
  if (saved && TAB_NAMES.includes(saved)) tab = saved;
  switchTab(tab);
}

// ── FO3 PIP-BOY BUILD U1: THE SECOND NAV AXIS (mechanism only, no skin yet) ──
// Today one axis (subsystem→tab) reveals a GROUP of stacked boards. FO3 needs
// a second axis (subsystem→sub-tab) that reveals ONE sub-tab's boards at a
// time, driven entirely by GAME_DEFS.<ctx>.identity.rails (Protocol 38 — the
// DATA's presence is the switch, never a game-name branch; see U0). Every
// function below is a complete no-op the instant `rails` is absent from the
// active identity — which is true for NV/FO4 today — so this whole axis
// stays fully dormant for them: no data-subtab attribute is ever stamped, no
// .subtab-active class is ever toggled, nothing new renders or executes.
// This unit ships the MECHANISM only — #fo3SubtabRail stays `hidden` (a
// plain HTML boolean attribute, not a CSS rule) until the FO3 casing CSS
// (a later unit) explicitly reveals it; no new stylesheet is added here.

// _applyRailGrouping() — stamps data-subtab="<SUBTAB>" onto every board id
// identity.rails names, so the FO3-scoped CSS hide rule (added when the
// casing CSS ships) can target them. Runs exactly once, from window.onload,
// before initTabs()/switchTab() ever run — board elements are static markup
// already present in the DOM at that point. A context switch always does a
// full window.location.reload() (onGameContextChange(), ui-core-modulebay.js),
// so there is no live cross-context stamp to clean up between games.
function _applyRailGrouping() {
  const rails = getIdentity().rails;
  if (!rails) return;
  Object.keys(rails).forEach(subsystem => {
    Object.keys(rails[subsystem]).forEach(subtab => {
      rails[subsystem][subtab].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.dataset.subtab = subtab;
      });
    });
  });
}

// _applyFo3NavLabels() — owner real-device feedback pass (FO3 PIP-BOY BUILD
// U2 follow-up): re-labels the 3 lamp keycaps from identity.navLamps (pure
// data, Protocol 38 — its presence is the switch, never a game-name branch).
// A complete no-op for any identity without a `navLamps` key (NV/FO4 today)
// — nk-label/nk-sub keep their shipped index.html text (OPERATOR/STAT etc.)
// untouched. Runs once from window.onload, same boot phase as
// _applyRailGrouping() (board elements are static markup already present in
// the DOM at that point). Only textContent is touched — aria-label stays the
// literal real subsystem name (index.html), never overwritten.
function _applyFo3NavLabels() {
  const lamps = getIdentity().navLamps;
  if (!lamps) return;
  Object.keys(lamps).forEach(key => {
    const btn = document.getElementById('navkey-' + key);
    if (!btn) return;
    const labelEl = btn.querySelector('.nk-label');
    const subEl = btn.querySelector('.nk-sub');
    if (labelEl) labelEl.textContent = lamps[key].label;
    if (subEl) subEl.textContent = lamps[key].sub;
  });
}

// _renderFo3SubtabRail(subsystem, activeName) — (re)builds #fo3SubtabRail's
// button list for `subsystem`'s rail, marking `activeName` current. The
// container itself stays `hidden` in this unit (see header note above); this
// only keeps its CONTENT correct so a later unit only has to reveal it, not
// also build it. Every subtab name is identity DATA (never user input), so
// no escaping is required for the literal uppercase labels.
function _renderFo3SubtabRail(subsystem, activeName) {
  const rail = document.getElementById('fo3SubtabRail');
  if (!rail) return;
  const rails = getIdentity().rails;
  const subtabNames = rails && rails[subsystem] ? Object.keys(rails[subsystem]) : [];
  // U6 (§2.8): the mockup separates sub-tabs with a dash connector
  // (STATUS — SPECIAL — SKILLS …). aria-hidden so it never reaches AT —
  // the buttons' own role=tab/aria-selected already carry the real
  // structure (Protocol 39: em-dash is non-ASCII, written via the Edit
  // tool, never PowerShell).
  rail.innerHTML = subtabNames
    .map(
      name =>
        '<button type="button" class="fo3-subtab-btn" role="tab" aria-selected="' +
        (name === activeName) +
        '" onclick="selectSubtab(\'' +
        name +
        '\')">' +
        name +
        '</button>'
    )
    .join('<span class="fo3-rail-dash" aria-hidden="true">—</span>');
}

// selectSubtab(name) — the second-axis selector. Reads the CURRENT subsystem
// off document.body.dataset.subsystem (the same choke point _syncBezelNav()
// already maintains — Protocol 22, one truth), toggles .subtab-active onto
// every board carrying data-subtab===name (and off every other railed
// board — subtab names are unique across all three rails, so no subsystem
// scoping is needed for the toggle itself), persists the choice as a
// per-subsystem MetaStore device pref (Protocol UI-6 — "everything
// remembers on reload"), and re-renders the rail's active state. A complete
// no-op if the active identity has no rails, or no rails for the current
// subsystem, or `name` isn't one of that subsystem's real sub-tabs.
function selectSubtab(name) {
  const subsystem = document.body.dataset.subsystem;
  const rails = getIdentity().rails;
  if (!rails || !subsystem || !rails[subsystem] || !rails[subsystem][name]) return;
  document.querySelectorAll('[data-subtab]').forEach(el => {
    el.classList.toggle('subtab-active', el.dataset.subtab === name);
  });
  MetaStore.set('robco_fo3_subtab_' + subsystem, name);
  _renderFo3SubtabRail(subsystem, name);
}

// _applyRails(subsystem) — called from switchTab() for every subsystem
// switch (bezel click, hotkey, #go= deep-link, AND the boot-time restore —
// see the call site in switchTab() above for why). No-op (and clears any
// stale rail content) when `subsystem` has no rails entry — CHASSIS/SETTINGS
// keep their current stacked behavior under FO3 exactly as today, per the
// build plan's explicit no-rail allowlist (U0). Otherwise resolves the
// target sub-tab — the last one persisted for THIS subsystem
// (robco_fo3_subtab_<subsystem>), falling back to the rail's first sub-tab
// on a genuine first visit — and applies it via selectSubtab().
function _applyRails(subsystem) {
  const rails = getIdentity().rails;
  const rail = document.getElementById('fo3SubtabRail');
  if (!rails || !rails[subsystem]) {
    if (rail) rail.innerHTML = '';
    return;
  }
  const subtabNames = Object.keys(rails[subsystem]);
  const saved = MetaStore.get('robco_fo3_subtab_' + subsystem);
  const target = saved && subtabNames.includes(saved) ? saved : subtabNames[0];
  selectSubtab(target);
}

// ── DO-N: BEZEL SUBSYSTEM NAV ─────────────────────────────────────────
// Illuminated keycap presentation over the existing tab/router system
// (Protocol 25 owner-approved redesign). Every keycap routes through
// switchTab() (stat/inv/data/campg unchanged) or, for the two subsystems
// that were never gated by a tab (the always-visible Comm-Link column and
// Security & Configuration/Module Bay), scrolls/focuses them directly —
// mirroring the existing SHORTCUT_ROUTES.comm approach. Writes only the
// MetaStore view preference (Protocol UI-6); no campaign state touched.
const NAV_KEYS = ['operator', 'operations', 'databank', 'uplink', 'chassis', 'settings'];
const _NAV_TAB_FOR = {
  operator: 'stat',
  operations: 'inv',
  databank: 'data',
  chassis: 'chassis',
  settings: 'settings',
};

// ── PER-SUBSYSTEM SCROLL MEMORY (owner-report, casing/layout polish batch) ──
// Each bezel subsystem remembers its own exact scroll offset across a switch
// AND across a reload — a device pref (Protocol UI-6, MetaStore key
// robco_scroll_positions), never campaign state. OPERATOR/OPERATIONS/DATABANK/
// CHASSIS all live in the SAME scrollable column (#uiPanel on a real desktop;
// the page itself on mobile, since .col-left has no overflow-y:auto there) —
// switchTab()/selectSubsystem() only toggle which panels are visible inside
// it, so persisting a per-subsystem offset is what makes "coming back" show
// the expected view instead of whatever scrollTop the column happened to be
// left at. UPLINK's own transcript panel (.panel.chat-panel) scrolls
// independently at every breakpoint. _scrollElFor() is the single lookup both
// the save and restore path read, so they can never disagree about which
// element owns the offset. DIR isn't tracked — it opens a transient modal
// (openBezelDirectory), not a persistent view.
const SCROLL_POS_KEY = 'robco_scroll_positions';
// Tracks whichever subsystem switchTab()/selectSubsystem() actually LAST
// displayed (never the boot-time cosmetic bezel-highlight restore that
// initBezelSubsystem() applies without moving anything) — resets to null on
// every reload so the very first user-triggered switch has nothing stale to
// save, and initTabs()'s boot-time switchTab() call is what fills it in for
// "restore the initial tab's position" instead.
let _lastScrollSubsystem = null;

function _readScrollPositions() {
  try {
    const obj = JSON.parse(MetaStore.get(SCROLL_POS_KEY) || '{}');
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch (_) {
    return {};
  }
}

function _scrollElFor(subsystem) {
  if (subsystem === 'uplink') return document.querySelector('.panel.chat-panel') || null;
  const isDesktop =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)').matches;
  if (isDesktop) return document.getElementById('uiPanel');
  // FO3 PIP-BOY BUILD U2 owner-feedback pass: the FO3 landscape shell
  // (css/60-fo3-pipboy.css) makes #uiPanel its own bounded, internally-
  // scrolling region instead of the page itself scrolling — same reasoning
  // as the desktop branch above, just gated on identity.orientation (data,
  // Protocol 38 — the sanctioned flag U0 added for exactly this) instead of
  // desktop pointer capability, so it stays a no-op for every game without
  // that flag (NV/FO4 today).
  const usesLandscapeShell =
    getIdentity().orientation === 'landscape-primary' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(orientation: landscape)').matches;
  return usesLandscapeShell ? document.getElementById('uiPanel') : null;
}

// Saves the CURRENT scroll offset under `subsystem`'s key. null el = the page
// itself scrolls (mobile).
function _saveScrollFor(subsystem) {
  if (!NAV_KEYS.includes(subsystem)) return;
  const el = _scrollElFor(subsystem);
  const positions = _readScrollPositions();
  positions[subsystem] = el ? el.scrollTop : window.scrollY || 0;
  MetaStore.set(SCROLL_POS_KEY, JSON.stringify(positions));
}

// Restores `subsystem`'s saved offset if one exists. Returns true when a
// saved value was applied; false (no-op) when nothing was ever recorded, so
// callers with an existing "jump to X" fallback (UPLINK/CHASSIS) can leave
// that fallback in place on a genuine first visit, while switchTab()'s three
// tab-gated subsystems (which have no such fallback today) can default to
// the top of the column instead of an unrelated leftover scrollTop.
function _restoreScrollFor(subsystem, fallbackToTop) {
  if (!NAV_KEYS.includes(subsystem)) return false;
  const el = _scrollElFor(subsystem);
  const val = _readScrollPositions()[subsystem];
  if (typeof val === 'number') {
    if (el) el.scrollTop = val;
    else window.scrollTo(0, val);
    return true;
  }
  if (fallbackToTop) {
    if (el) el.scrollTop = 0;
    else window.scrollTo(0, 0);
  }
  return false;
}

// Called at the top of switchTab()/selectSubsystem(), before any visual
// change, so it captures the offset of whatever the user was ACTUALLY just
// looking at.
function _saveOutgoingScroll() {
  if (_lastScrollSubsystem) _saveScrollFor(_lastScrollSubsystem);
}

// ── BEZEL NAV SYNC + TELEMETRY STRIP ─────────────────────────────────
function _syncBezelNav(subsystem) {
  if (!NAV_KEYS.includes(subsystem)) return;
  NAV_KEYS.forEach(k => {
    const btn = document.getElementById('navkey-' + k);
    if (!btn) return;
    const on = k === subsystem;
    btn.classList.toggle('active', on);
    // PROTOCOL 25: aria-selected preservation is one of the bezel-nav
    // extension's explicit conditions — this is the one place it's set.
    btn.setAttribute('aria-selected', String(on));
  });
  const lcd = document.getElementById('bezelTelemetry');
  if (lcd) lcd.textContent = _bezelTelemetryText(subsystem);
  MetaStore.set('robco_bezel_subsystem', subsystem);
  // DO-O: the single choke point every subsystem change already routes through —
  // drives the mobile UPLINK self-contained-view CSS (body[data-subsystem="uplink"]).
  document.body.dataset.subsystem = subsystem;
}

function _bezelSubsystemLabel(subsystem) {
  switch (subsystem) {
    case 'operator':
      return '▸ SUBSYSTEM: OPERATOR';
    case 'operations': {
      const n = Array.isArray(state.inventory) ? state.inventory.length : 0;
      return '▸ SUBSYSTEM: OPERATIONS · ' + n + ' MANIFEST ENTRIES';
    }
    case 'databank':
      return (
        '▸ SUBSYSTEM: DATABANK · ' +
        (typeof _pendingDirectivesCount === 'function' ? _pendingDirectivesCount() : 0) +
        ' ACTIVE DIRECTIVES'
      );
    case 'uplink':
      return '▸ SUBSYSTEM: UPLINK · DIRECTOR CHANNEL';
    case 'chassis':
      return '▸ SUBSYSTEM: CHASSIS · SELF-DIAGNOSTIC BAY';
    case 'settings':
      return '▸ SUBSYSTEM: SETTINGS · CONFIG + REGISTRY';
    default:
      return '▸ SUBSYSTEM: ' + subsystem.toUpperCase();
  }
}

// FIX 5 (owner report): VITALS tier derived from HP% + crippled-limb count +
// radiation tier (game-agnostic — reads the same la/ra/ll/rl/hd limb fields
// and hpCur/hpMax/rads every game context already carries, Protocol 38).
// Reads the DOM inputs first (falling back to state) so it stays live on
// every keystroke exactly like updateMath()'s own HP bar read — never a
// stale state value while the Courier is still typing.
function _vitalsTier() {
  const hpCurEl = document.getElementById('stat_hp_cur');
  const hpMaxEl = document.getElementById('stat_hp_max');
  const hpCur = hpCurEl ? parseInt(hpCurEl.value) || 0 : state.hpCur || 0;
  const hpMax = hpMaxEl ? Math.max(1, parseInt(hpMaxEl.value) || 1) : Math.max(1, state.hpMax || 1);
  const hpPct = (Math.max(0, hpCur) / hpMax) * 100;
  const crippled = ['hd', 'la', 'ra', 'll', 'rl'].some(
    k => String(state[k] || 'OK').toUpperCase() === 'CRIPPLED'
  );
  if (crippled) return 'CRIPPLED';
  if (hpPct <= 25) return 'CRITICAL';
  if (hpPct <= 60) return 'WARNING';
  return 'NOMINAL';
}

// Common VITALS/RAD/CARRIER suffix appended to every subsystem's telemetry
// line (FIX 5) — CARRIER reuses the exact same connection signal as the
// UPLINK lamp and the Overseer's own resting tag (Protocol 22, single source).
function _bezelStatusSuffix() {
  const radsEl = document.getElementById('stat_rads');
  const rads = radsEl ? parseInt(radsEl.value) || 0 : state.rads || 0;
  const connected = typeof _isUplinkConnected === 'function' ? _isUplinkConnected() : false;
  // Phase 3 · Piece 2: the OPERATIONS weigh bridge's SEIZED (over-encumbered)
  // state also flags on the bezel telemetry strip, alongside every other
  // subsystem's VITALS/RAD/CARRIER line — reads the same body.weight-over
  // class updateMath() already toggles, never a second weight computation.
  const overEncumbered = document.body.classList.contains('weight-over');
  return (
    ' · VITALS ' +
    _vitalsTier() +
    ' · RAD ' +
    Math.max(0, rads) +
    (overEncumbered ? ' · ⚠ CARGO SEIZED' : '') +
    ' · CARRIER ' +
    (connected ? 'ONLINE' : 'OFFLINE')
  );
}

function _bezelTelemetryText(subsystem) {
  return _bezelSubsystemLabel(subsystem) + _bezelStatusSuffix();
}

// FIX 5: re-render the strip in place, using whichever subsystem is currently
// shown (document.body.dataset.subsystem — the same choke point _syncBezelNav
// already writes) — called on every relevant state change (HP/rads/limb via
// updateMath(), connection change via refreshOverseerCarrier()) without
// touching the nav highlight/MetaStore pref themselves.
function _refreshBezelTelemetry() {
  const lcd = document.getElementById('bezelTelemetry');
  if (lcd) lcd.textContent = _bezelTelemetryText(document.body.dataset.subsystem || 'operator');
  // FO3 PIP-BOY BUILD U2 (temptation item 2 — "ONE writer, two projection
  // targets"): the exact same choke point that keeps the NV bezel LCD live
  // also keeps the FO3 in-glass top strip live, with zero new call-site
  // wiring. A no-op for any game with no identity.statusStrip (NV/FO4 today).
  _renderFo3TopStrip();
}
window._refreshBezelTelemetry = _refreshBezelTelemetry;

// ── FO3 PIP-BOY BUILD U2: THE IN-GLASS TOP STRIP ─────────────────────
// _fo3StripFieldValue(key) — reads the ONE existing live DOM/state source
// each identity.statusStrip field name already has (never a second,
// parallel computation — Protocol 22): LVL/#stat_lvl, HP/#stat_hp_cur+max,
// Wg/#display_weight (already formatted "cur / max" by updateMath()),
// RAD/#stat_rads, Caps/#c_caps (falling back to state.caps before the DOM
// is first painted).
function _fo3StripFieldValue(key) {
  switch (key) {
    case 'LVL': {
      const el = document.getElementById('stat_lvl');
      return el ? el.value : '';
    }
    case 'HP': {
      const cur = document.getElementById('stat_hp_cur');
      const max = document.getElementById('stat_hp_max');
      return cur && max ? cur.value + '/' + max.value : '';
    }
    case 'Wg': {
      const el = document.getElementById('display_weight');
      return el ? el.innerText : '';
    }
    case 'RAD': {
      const el = document.getElementById('stat_rads');
      return el ? el.value : '';
    }
    case 'Caps': {
      const el = document.getElementById('c_caps');
      return el ? el.value : state.caps != null ? state.caps : '';
    }
    default:
      return '';
  }
}

// _renderFo3TopStrip() — (re)builds #fo3TopStrip's boxed segments from
// identity.statusStrip (pure data, Protocol 38 — never a hardcoded field
// list). A complete no-op when the active identity carries no
// statusStrip (NV/FO4 today): the strip stays empty and `hidden`-governed
// exactly as U1 shipped it.
function _renderFo3TopStrip() {
  const strip = document.getElementById('fo3TopStrip');
  if (!strip) return;
  const fields = getIdentity().statusStrip;
  if (!fields) {
    strip.innerHTML = '';
    return;
  }
  // U6 (§2.7): the mockup leads the strip with the active subsystem's own
  // name as a bold "current channel" chip. Read straight off the real
  // keycap's existing .nk-label text — zero new state, zero game literal
  // (Protocol 38). Resolves to an empty string (no chip) when the keycap
  // can't be found, e.g. a unit test calling this against a minimal DOM.
  const subsystem = document.body.dataset.subsystem;
  const keycap = subsystem && document.getElementById('navkey-' + subsystem);
  const nameLabel = keycap && keycap.querySelector('.nk-label');
  const nameSeg = nameLabel
    ? '<span class="fo3-strip-seg fo3-strip-name">' + escapeHtml(nameLabel.textContent) + '</span>'
    : '';
  strip.innerHTML =
    nameSeg +
    fields
      .map(
        key =>
          '<span class="fo3-strip-seg"><b>' +
          escapeHtml(key) +
          '</b>' +
          escapeHtml(String(_fo3StripFieldValue(key))) +
          '</span>'
      )
      .join('');
}

// _fo3BumpNumberInput(id, delta) — the Vault Boy screen's HP/RAD steppers
// (design doc §4's "the stepper" primitive). Game-agnostic and reusable for
// ANY number input (Protocol 38 — the game-specific part is only which CSS
// reveals the button, never this function); it never owns state directly —
// it bumps the EXISTING input's value and re-dispatches its own 'input'
// event, so the input's own oninput handler (updateMath()/capRadsMax(), the
// same path the number field itself already used) is the single source of
// truth (Protocol 22 — no forked state).
function _fo3BumpNumberInput(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  const min = el.min !== '' ? parseFloat(el.min) : -Infinity;
  const max = el.max !== '' ? parseFloat(el.max) : Infinity;
  let v = (parseFloat(el.value) || 0) + delta;
  v = Math.max(min, Math.min(max, v));
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
window._fo3BumpNumberInput = _fo3BumpNumberInput;

// ── MOTION VERBS (Protocol UI-9) ─────────────────────────────────────
// SWEEP — the DO-N "re-tune the channel" motion verb on subsystem change.
// Reduced-motion is handled by the existing global prefers-reduced-motion
// CSS block, which zeroes the animation to an instant resting frame.
function _bezelSweep() {
  const wrap = document.querySelector('.glass-frame');
  if (!wrap) return;
  wrap.classList.remove('sweep');
  void wrap.offsetWidth; // force reflow so the animation can restart
  wrap.classList.add('sweep');
}

// SEAT (Ceremony Moments Wave 1, M5) — the Protocol UI-9 "component
// physically installs" motion verb, mirroring _bezelSweep() above. Textured
// per game via [data-game] CSS selectors reading identity.motionTexture.seat
// (Protocol 38 — no JS branch here). Reduced-motion is handled by the same
// existing global prefers-reduced-motion CSS block.
function _motionSeat(el) {
  if (!el) return;
  el.classList.remove('seat');
  void el.offsetWidth; // force reflow so a repeated trigger restarts cleanly
  el.classList.add('seat');
}
window._motionSeat = _motionSeat;

// ── SUBSYSTEM SELECTION ───────────────────────────────────────────────
// selectSubsystem(view) — the bezel keycap click handler.
function selectSubsystem(view) {
  const tab = _NAV_TAB_FOR[view];
  if (tab) {
    switchTab(tab); // routes + syncs the nav in one call (saves/restores scroll too)
    // Step 2 v2.8.0 Settings-tab unit: the Module Bay's first-visit hatch
    // ceremony used to fire only via the CHASSIS scroll-to-bay branch; now
    // that the bay lives inside the tab-gated SETTINGS subsystem, a genuine
    // user-initiated [6]/SETTINGS visit re-opens it (setAttribute('open','')
    // fires securityConfigPanel's own toggle listener, which is what
    // actually runs the once-only ceremony — see _wirePanelPersistence()).
    // A boot-time initTabs() restore never calls selectSubsystem(), so this
    // never fires at page load (Protocol 42 — boot-restore must not
    // re-trigger the hatch).
    if (view === 'settings') {
      // Owner report (Protocol 27 root cause): this used to force the panel
      // open on EVERY SETTINGS visit, silently reopening it even after the
      // user had deliberately collapsed it — the once-only hatch ceremony
      // (robco_bay_opened) is the correct signal for "has this already fired
      // at least once"; once it has, the panel's own persisted open/closed
      // state (robco_panel_state, written by its toggle listener in
      // _wirePanelPersistence()) is respected like every other panel instead
      // of being overridden here.
      const secPanel = document.getElementById('securityConfigPanel');
      if (secPanel && !secPanel.open && MetaStore.get('robco_bay_opened') !== 'true') {
        secPanel.setAttribute('open', '');
      }
    }
  } else if (view === 'uplink') {
    _saveOutgoingScroll(); // FIX 2
    const i = document.getElementById('chatInput');
    if (i) {
      i.scrollIntoView({ block: 'center' });
      i.focus();
    }
    _syncBezelNav('uplink');
    if (typeof _maybeGreetOverseer === 'function') _maybeGreetOverseer(); // M2
    // FIX 2: a remembered offset overrides the jump-to-composer default above;
    // a first-ever visit (nothing saved) keeps that default untouched.
    _restoreScrollFor('uplink', false);
    _lastScrollSubsystem = 'uplink';
  } else {
    return;
  }
  _bezelSweep();
}

// ── DIRECTORY FALLBACK ────────────────────────────────────────────────
// DIRECTORY fallback (Protocol 25) — a flat, plain-label list of every
// subsystem, one tap away, reusing the shared #sysModal driver (Protocol 22)
// rather than a bespoke dialog.
function openBezelDirectory() {
  const items = [
    ['operator', 'OPERATOR', 'character stats', 'STAT · [1]'],
    ['operations', 'OPERATIONS', 'inventory &amp; crafting', 'INV · [2]'],
    ['databank', 'DATABANK', 'quests, map, campaign', 'DATA·CAMPG · [3]'],
    ['uplink', 'UPLINK', 'the AI comm-link', 'COMM · [4]'],
    ['chassis', 'CHASSIS', 'system status &amp; telemetry', 'SYSTEM · [5]'],
    ['settings', 'SETTINGS', 'config &amp; account', 'CONFIG·ACCT · [6]'],
  ];
  const body =
    '<div class="d-sub" style="font-size: 9px; opacity: 0.5; letter-spacing: 1px; margin-bottom: 10px">FLAT INDEX — EVERY SUBSYSTEM, PLAIN LABELS</div>' +
    items
      .map(
        ([view, label, desc, sub]) =>
          '<button type="button" class="blue-btn bezel-dir-item" onclick="selectSubsystem(\'' +
          view +
          '\'); closeModal();">' +
          label +
          ' — ' +
          desc +
          ' <span>' +
          sub +
          '</span></button>'
      )
      .join('');
  openModal({ title: '> SUBSYSTEM DIRECTORY', body });
}

// ── BOOT-TIME BEZEL RESTORE ───────────────────────────────────────────
// Restore the last-focused non-tab subsystem (uplink) highlight on boot —
// visual only, never scrolls/focuses anything on page load. chassis/settings
// are now real tabs (Step 2 v2.8.0 Settings-tab unit) restored by initTabs()
// via robco_active_tab, so re-highlighting them here would be redundant.
function initBezelSubsystem() {
  const saved = MetaStore.get('robco_bezel_subsystem');
  if (saved === 'uplink') _syncBezelNav(saved);
}

// Single boot-phase entry point for the two DO-N bezel-chrome restores, so
// window.onload gains one named call (Suite 132's slim-composition contract)
// instead of two.
function _initBezelChrome() {
  initBezelSubsystem();
  _updateFaultLamp();
}

// ── PWA DEEP-LINK ROUTING (#go=) ──────────────────────────────────────
// PWA app-shortcut deep-link routes. Keys are the only accepted #go= values (allow-list).
// PROTOCOL 25: preserving #go= deep-links was one of the bezel-nav
// extension's explicit conditions for replacing the tab bar — this table
// (plus routeLaunchShortcut() below) is that guarantee.
const SHORTCUT_ROUTES = {
  comm: () => {
    _saveOutgoingScroll(); // FIX 2
    const i = document.getElementById('chatInput');
    if (i) {
      i.scrollIntoView({ block: 'center' });
      i.focus();
    }
    _syncBezelNav('uplink'); // DO-N: keep the bezel highlight consistent with this deep-link
    if (typeof _maybeGreetOverseer === 'function') _maybeGreetOverseer(); // M2
    _restoreScrollFor('uplink', false); // FIX 2: override the jump above if a memory exists
    _lastScrollSubsystem = 'uplink';
  },
  inv: () => switchTab('inv'),
  stat: () => switchTab('stat'),
  data: () => switchTab('data'),
  settings: () => switchTab('settings'),
  new: () => wipeTerminal(),
};
function routeLaunchShortcut() {
  let raw;
  try {
    raw = (window.location.hash || '').replace(/^#/, '');
  } catch (_) {
    return;
  }
  if (!raw) return;
  const m = raw.match(/^go=([a-z]+)$/);
  if (!m) return;
  const action = SHORTCUT_ROUTES[m[1]];
  if (typeof action !== 'function') return;
  try {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch (_) {}
  action();
}
