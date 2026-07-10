// ── DIAGNOSTIC SHELL — the ONE canonical dev/debug console (Step 2 · Phase 2,
//    Diagnostic Shell U3: TRIGGERS catalog + Protocol 44, on top of U2's
//    mobile overlay/identity and U1's registry spine + two-signal gate) ───
//
// A live inspector + trigger panel for the Ambient Runtime (js/runtime.js) so
// the accumulating Phase-2 ambient features are testable without waiting on
// real idle/standby timers on a real device.
//
// ── THIS IS THE CANONICAL CONSOLE, NOT A THROWAWAY TEST PANEL ─────────────────
// This panel IS the one developer/debug console the roadmap's hacking minigame
// will later unlock in normal builds — there is no separate "real" console to
// build later. Visibility is centralized in ONE gate, `_devConsoleUnlocked()`
// below: today it is true only on a dev/staging build (so dev builds skip the
// hack entirely); on production it is false until the future minigame flips it.
// Nothing else in this file (or any future caller) may re-derive visibility —
// every check goes through that one function (Protocol 22).
//
// ── FAIL-SAFE TO HIDDEN ───────────────────────────────────────────────────────
// `_devConsoleUnlocked()`'s staging path reuses the EXACT SAME env signal the
// changelog viewer uses to hide its [Unreleased] section on production
// (_isStagingEnv(), ui-core.js, Protocol 43/WU-C11): the staging marker that
// scripts/cf-staging-build.mjs stamps into the staged build, with the
// local/Cloudflare-staging hostname as a secondary signal. Any uncertainty
// (function missing, a throw, an unrecognized host) defaults to HIDDEN — a
// production player must never see this panel until they've actually earned it.
// The markup itself also lives inert inside <template id="testConsoleTemplate">
// (index.html, the WU-E2 pattern) so it cannot render even if the gate were
// somehow bypassed — it only enters the DOM when initTestConsole() explicitly
// clones it in.
//
// ── U1: THE TWO-SIGNAL GATE (planning/DIAGNOSTIC_SHELL_PLAN.md §2.2) ─────────
// One signal used to answer "show it or not." This panel now serves two
// audiences (an owner-only staging toolbench, and a future non-destructive
// prod-minigame sandbox), so a second signal decides WHICH tools may render:
//   - _shellVisible() — does the shell exist at all? Unchanged philosophy,
//     a thin alias for _devConsoleUnlocked(). Fails to false (absent).
//   - _shellTier() — 'staging' ONLY on a POSITIVE staging signal, otherwise
//     the RESTRICTIVE 'prod' tier. Fails to 'prod' on any uncertainty — same
//     fail-safe direction as _devConsoleUnlocked() and the changelog viewer.
//   - _toolVisible(tool, tier) — the ONE filter every registry tool passes
//     through BEFORE it ever touches the document. A tier:'staging' tool has
//     exactly one way to render (a positively-confirmed staging tier), so it
//     can never leak to a production player. See _renderShell() below: every
//     tier-invisible tool's anchor is stripped out of a DETACHED clone of the
//     <template> before that clone is ever appended to the document — nothing
//     filtered ever becomes reachable DOM.
//   - _invoke(tool) — every destructive:true tool's action is auto-wrapped in
//     the existing confirmAction() helper (Protocol 22/34) so no caller can
//     forget a confirm gate; it is a property of the registry data, enforced
//     by this one call path.
//
// DIAGNOSTIC_SHELL_TOOLS (below) is the single source of truth this panel
// renders from. Adding a future trigger/reset/inspector is one more registry
// entry — see the EXTENSION POINT comment near the template in index.html.
//
// ── U2: MOBILE OVERLAY (planning/DIAGNOSTIC_SHELL_PLAN.md §6) ───────────────
// U1 mounted the panel as a document-flow <details class="panel"> at the top
// of the body — it always occupied real vertical space, shoving the whole
// machine down on mobile whenever the console mounted. U2 replaces that with
// a floating toggle (#dshFab, the DEV-MARKER gear glyph) + a fixed overlay
// drawer (#testConsolePanel, role=dialog) + a scrim (#dshScrim) — all three
// mounted body-level, as siblings of .container.machine (same placement
// #locationCard already uses), and all three position:fixed in CSS. A
// position:fixed element contributes nothing to its parent's layout height,
// so #testConsoleMount stays a genuine zero-height wrapper whether the
// drawer is open or closed — the machine is never displaced. Being
// body-level (never a descendant of .container) also means the FAB/drawer
// are immune to the filter/transform containing-block trade-off documented
// above the fixed .bezel dock in terminal.css (idle/night/shutdown apply
// filter/transform to .container only) — they stay pinned in every ambient
// state, exactly like #locationCard. _openShell()/_closeShell() implement a
// self-contained Tab focus-trap + Escape-close (mirroring the existing
// #sysModal trap in _wireKeyboardShortcuts(), but scoped to this drawer
// since it is a distinct dialog surface, not a #sysModal caller — Protocol
// 23: this file owns its own dialog, it doesn't fork the shared one).
//
// ── U3: TRIGGERS CATALOG + PROTOCOL 44 (planning/DIAGNOSTIC_SHELL_PLAN.md
// §4/§7/§11 U3) ───────────────────────────────────────────────────────────
// Adds ~45 new registry entries under category:'triggers' — fire any of the
// 33 feedback animations (bus-emit + pending-var), force each Living Core
// state, force each boot flavor, and replay ceremonies M1-M5 (never clearing
// their real persisted view-once flag — see each _replayXxx()'s own
// comment). None of these have pre-existing markup, so _renderShell() (U1)
// gained a synthesis path: an anchor-less tool becomes a real <button>,
// grouped by the optional `group` field into a labeled sub-heading + grid —
// "one more registry entry" (Protocol 44) is now literally true even for a
// brand-new trigger with zero index.html changes.
//
// PROTOCOL 42 FINDING — see the long comment above _fireAnimEvent() below
// for the full account: seven bus events (level.up, collectible.acquired,
// craft.completed, craft.scrapped, trade.bought, trade.sold,
// sleep.completed) have a REACTIVE state.js subscriber that writes
// the campaign event log every time they fire, contradicting the plan's own
// "firing a bus animation is inherently non-destructive" premise for those
// seven specifically. They are tier:'staging' + destructive:true (auto-
// confirm-gated) — the one documented, narrow exception to this file's Hard
// Boundary below, and it is never reachable by a production player (the
// existing leak-proof gate, unchanged).
//
// Protocol 44 (NEW, CLAUDE.md) requires every future ambient/conditional/
// hard-to-trigger feature to register a trigger here in the same commit as
// the feature; the enforcement guard (both test runners) cross-references
// every RobcoEvents.emit('<name>') literal and the known view-once MetaStore
// flags against the union of every tool's `triggers:[...]` array.
//
// ── HARD ATMOSPHERE/SAVE BOUNDARY (Phase-2 prime invariant #1) ────────────────
// This file touches ONLY in-memory Ambient Runtime state and the Immersion
// tier (an existing MetaStore device pref, same as the real dial in Security &
// Config). It never reads or writes the campaign save, stats, or event log,
// and never pushes anything to the cloud. No auto-anything (Phase-2 invariant
// #2) — every action here is an explicit developer button/select, never
// triggered on its own. ONE documented, narrow exception (U3, above): the 7
// tier:'staging' + destructive:true fire-anim-<event> tools that re-emit a
// bus event with a reactive campaign-event-log-writing subscriber — confirm-
// gated, staging-only, never reachable by a production player.
//
// Game-agnostic (Protocol 38): pure dev-tooling, no game literals.
//
// ── OWNER REPORT — MOBILE CHROME FIXES (five presentation fixes on top of
// U1-U3, no registry/gate/tier change) ────────────────────────────────────
// FIXES 1-3 ARE MOBILE-ONLY (max-width:999.98px, the exact inverse of the
// (min-width:1000px)... Suite 129 desktop gate) — desktop's FAB/drawer stay
// BYTE-IDENTICAL to what U2 shipped: right-side full-height drawer, a
// dimming/click-blocking scrim, a click-only bubble highlighted via
// [aria-expanded]. _dshIsMobile() is the one gate every mobile-only JS path
// below goes through. FIX 4 is a pure font-metrics correction (no layout
// change) and applies everywhere; FIX 5 lives entirely in terminal.css
// (already mobile-scoped, no JS).
// FIX 1 (mobile only): #testConsolePanel (.dsh-drawer) becomes a resizable
//   PARTIAL-height BOTTOM SHEET (terminal.css --dsh-sheet-h, default 50vh)
//   instead of the desktop right-side FULL-HEIGHT drawer — the app screen
//   stays visible AND usable above it while a trigger fires. _setSheetVh()
//   is the one choke point the drag handle (#dshDragHandle, pointer +
//   ArrowUp/ArrowDown) and the expand/collapse button (#dshExpandToggle)
//   both go through. #dshScrim goes permanently inert (transparent,
//   pointer-events:none) on mobile only — a "tap outside to dismiss"
//   gesture no longer applies there, since outside IS the terminal and it
//   must stay usable; on desktop the scrim is unchanged and still closes
//   the drawer on click, exactly as U2 shipped.
// FIX 2 (mobile only): #dshFab is draggable anywhere on screen
//   (_wireFabDrag, mirrors the Immersion dial's tap-vs-drag pointer pattern
//   in two dimensions) and its last dropped position persists via
//   MetaStore (robco_dsh_fab_pos, Protocol UI-6), re-clamped to the current
//   viewport on every apply.
// FIX 3 (mobile only): the bubble's highlighted look is driven by the
//   .dsh-fab--open class (toggled by _openShell()/_closeShell(), harmless
//   on desktop where the CSS never references it) instead of the
//   touch-sticky-hover-prone [aria-expanded] rule desktop still uses — so
//   on mobile it lights up exactly when, and only when, the sheet is
//   genuinely open.
// FIX 4 (all breakpoints): the glyph span gets its own line-height:1 + a
//   small optical nudge (terminal.css .dsh-fab span) so it centers inside
//   the already flex-centered button instead of reading slightly high.
// FIX 5 (terminal.css only, no JS, already mobile-scoped): the fixed
//   bottom bezel dock's height no longer tracks the live ▸ SUBSYSTEM status
//   strip's own content length — see the mobile @media
//   (max-width: 999.98px) .telemetry rule.
(function () {
  'use strict';

  var _refreshUnregister = null;

  // _devConsoleUnlocked — THE canonical, single gate for this console's
  // visibility (Protocol 22 — one gate, not several re-derived checks).
  //   TODAY: true only on a dev/staging build (delegates verbatim to
  //   ui-core.js's _isStagingEnv(), never re-implemented) — dev builds skip
  //   the hack entirely.
  //   MINIGAME-UNLOCK SEAM: this exact function is what the future in-game
  //   hacking minigame will also flip to true on a production build once the
  //   player solves it (e.g. by additionally checking a persisted unlock
  //   flag this function reads) — the console it unlocks IS this one, not a
  //   separate panel. When that lands, add the unlock-flag check here and
  //   nowhere else.
  // Fails OPEN to false (hidden) on any uncertainty — never leak to production.
  function _devConsoleUnlocked() {
    try {
      return typeof window._isStagingEnv === 'function' ? window._isStagingEnv() : false;
    } catch (_) {
      return false;
    }
  }

  // _shellVisible — existence gate (U1): does the shell mount AT ALL? A thin,
  // literally-named alias over _devConsoleUnlocked() — same fail-safe-to-false
  // philosophy, never a second re-derived check (Protocol 22).
  function _shellVisible() {
    return _devConsoleUnlocked();
  }

  // _shellTier — WHICH tools may render, once the shell is visible. 'staging'
  // ONLY when the staging signal is POSITIVELY confirmed; otherwise the
  // RESTRICTIVE 'prod' tier. Fails to 'prod' on any throw/missing function —
  // the same fail-safe direction as _devConsoleUnlocked()'s "default to
  // hidden"/the changelog viewer's "default to production".
  function _shellTier() {
    try {
      return typeof window._isStagingEnv === 'function' && window._isStagingEnv()
        ? 'staging'
        : 'prod';
    } catch (_) {
      return 'prod';
    }
  }

  // _toolVisible — the ONE filter every registry tool passes through before
  // it ever enters the document. A tier:'prod' tool always shows (both
  // audiences); a tier:'staging' tool shows ONLY when staging is positively
  // confirmed. See _renderShell() for where this runs (before DOM insertion).
  function _toolVisible(tool, tier) {
    if (!tool) return false;
    if (tool.tier === 'prod') return true;
    return tier === 'staging';
  }

  // _invoke — the auto-confirm-gate (U1): a destructive:true tool's action
  // is ALWAYS wrapped in the existing confirmAction() helper (Protocol 22/34,
  // the diegetic Promise-based confirm, never the blocking confirm()). A
  // non-destructive tool's action fires immediately. Fail-safe: if
  // confirmAction() itself is unavailable or throws, a destructive action
  // never fires (the safe direction).
  function _invoke(tool) {
    if (!tool || typeof tool.action !== 'function') return;
    var run = function () {
      try {
        tool.action();
      } catch (_) {
        /* a tool action must never break the console */
      }
    };
    if (!tool.destructive) {
      run();
      return;
    }
    try {
      if (typeof confirmAction !== 'function') return; // fail-safe: no confirm path available, no destructive action
      confirmAction({
        title: '> ' + tool.label,
        warning: tool.tooltip || 'This is a destructive diagnostic action.',
        confirmLabel: 'EXECUTE',
        cancelLabel: 'ABORT',
      }).then(function (ok) {
        if (ok) run();
      });
    } catch (_) {
      /* a confirm-gate failure must never fire a destructive action */
    }
  }

  // ── DIAGNOSTIC_SHELL_TOOLS — the single source of truth this panel renders
  // from (planning/DIAGNOSTIC_SHELL_PLAN.md §2.1). U1 re-expresses every
  // existing control (the 9 items below) as a registry entry; each `anchor`
  // selector names the existing markup block inside <template
  // id="testConsoleTemplate"> (index.html) that control already lives in —
  // migration only, no new tools. A future trigger/reset/inspector is one
  // more entry (see the EXTENSION POINT comment beside the template).
  var DIAGNOSTIC_SHELL_TOOLS = [
    {
      id: 'runtime-force-transition',
      label: 'FORCE TRANSITION',
      subLabel: 'AmbientRuntime.forceState(IDLE / STANDBY / SHUTDOWN / OFF)',
      icon: '▲',
      category: 'triggers',
      group: 'FORCE TRANSITION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Force the Ambient Runtime into IDLE, STANDBY, SHUTDOWN, or OFF.',
      triggers: ['runtime.state'],
      anchor: '[data-dsh-anchor="testConsoleTransitions"]',
    },
    {
      id: 'reboot',
      label: 'REBOOT',
      subLabel: 'runBootSequence() replay',
      icon: '↻',
      category: 'triggers',
      group: 'FORCE TRANSITION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Replay the boot sequence.',
      triggers: [],
      anchor: '[data-dsh-anchor="testConsoleTransitions"]',
    },
    {
      id: 'wake-active',
      label: 'WAKE → ACTIVE',
      subLabel: "AmbientRuntime.forceState('ACTIVE')",
      icon: '●',
      category: 'triggers',
      group: 'FORCE TRANSITION',
      tier: 'prod',
      destructive: false,
      tooltip:
        'Force the Ambient Runtime back to ACTIVE — the one-click undo for the force-transition buttons.',
      triggers: ['runtime.state'],
      anchor: '[data-dsh-anchor="testConsoleTransitions"]',
    },
    {
      id: 'a11y-immersion',
      label: 'IMMERSION TIER',
      subLabel: 'onImmersionChange() / getImmersionTier()',
      icon: '■',
      category: 'env',
      group: 'IMMERSION TIER',
      tier: 'prod',
      destructive: false,
      tooltip: 'Set the device Immersion tier (mirrors the real Security & Config dial).',
      triggers: [],
      anchor: '[data-dsh-anchor="testConsoleImmersionSelect"]',
    },
    {
      id: 'replay-hatch',
      label: 'REPLAY HATCH',
      subLabel: "MetaStore.remove('robco_bay_opened')",
      icon: '⚙',
      category: 'triggers',
      group: 'VIEW-ONCE CEREMONIES',
      tier: 'staging',
      destructive: true,
      tooltip: 'Reset the Module Bay hatch so its view-once ceremony replays on next open.',
      triggers: ['robco_bay_opened'],
      anchor: '[data-dsh-anchor="testConsoleReplayHatch"]',
      // action is the ONLY tool this unit routes through _invoke() (every other
      // migrated control keeps its own dedicated wiring below) — a Protocol 42
      // fix landed here after live verification caught this field missing
      // entirely, which made _invoke()'s `typeof tool.action !== 'function'`
      // guard silently no-op the button (no confirm dialog, no action, no
      // thrown error) — see Suite 210.14's registry-completeness regression test.
      action: _replayHatch,
    },
    {
      id: 'ocr-unit1-scan',
      label: 'OPTICAL SCAN TEST',
      subLabel: 'runVisualOcrTest() — raw on-device OCR text dump',
      icon: '⚒',
      category: 'infra',
      group: 'OPTICAL SCAN TEST',
      tier: 'staging',
      destructive: false,
      tooltip:
        'Run a screenshot through the on-device OCR pipeline and dump the raw recognized text.',
      triggers: [],
      anchor: '[data-dsh-anchor="ocrTestInput"]',
    },
    {
      id: 'ocr-unit2-scan',
      label: 'SCAN & PARSE TEST',
      subLabel: 'runVisualOcr() — full parse / preview / confirm pipeline',
      icon: '⚒',
      category: 'infra',
      group: 'SCAN & PARSE TEST',
      tier: 'staging',
      destructive: false,
      tooltip: 'Run a screenshot through the full OCR parse + preview/confirm pipeline.',
      triggers: [],
      anchor: '[data-dsh-anchor="visualParseTestInput"]',
    },

    // ── U3: TRIGGERS CATALOG (planning/DIAGNOSTIC_SHELL_PLAN.md §4/§11 U3) ──
    // No `anchor` — none of these have pre-existing markup; _renderShell()
    // synthesizes a real <button> per entry (grouped by `group`, a display-
    // only sub-heading) and wires it through _invoke(). One more registry
    // entry really is the whole cost of adding a future trigger (Protocol 44).

    // Living core states (setOverseerState — the ONE state-setter, Protocol 22).
    {
      id: 'core-state-thinking',
      label: 'CORE: THINKING',
      subLabel: "setOverseerState('thinking')",
      icon: '●',
      category: 'triggers',
      group: 'LIVING CORE',
      tier: 'prod',
      destructive: false,
      tooltip: 'Force the Living Core / Overseer scope into the THINKING state.',
      triggers: [],
      action: () => window.setOverseerState && window.setOverseerState('thinking'),
    },
    {
      id: 'core-state-speaking',
      label: 'CORE: SPEAKING',
      subLabel: "setOverseerState('speaking')",
      icon: '●',
      category: 'triggers',
      group: 'LIVING CORE',
      tier: 'prod',
      destructive: false,
      tooltip: 'Force the Living Core / Overseer scope into the SPEAKING state.',
      triggers: [],
      action: () => window.setOverseerState && window.setOverseerState('speaking'),
    },
    {
      id: 'core-state-listening',
      label: 'CORE: LISTENING',
      subLabel: "setOverseerState('listening')",
      icon: '●',
      category: 'triggers',
      group: 'LIVING CORE',
      tier: 'prod',
      destructive: false,
      tooltip: 'Force the Living Core / Overseer scope into the LISTENING (resting) state.',
      triggers: [],
      action: () => window.setOverseerState && window.setOverseerState('listening'),
    },
    {
      id: 'core-state-disabled',
      label: 'CORE: DISABLED',
      subLabel: "setOverseerState('disabled')",
      icon: '●',
      category: 'triggers',
      group: 'LIVING CORE',
      tier: 'prod',
      destructive: false,
      tooltip: 'Force the Living Core / Overseer scope into the DISABLED (no key) state.',
      triggers: [],
      action: () => window.setOverseerState && window.setOverseerState('disabled'),
    },
    {
      id: 'core-state-offline',
      label: 'CORE: OFFLINE',
      subLabel: "setOverseerState('offline')",
      icon: '●',
      category: 'triggers',
      group: 'LIVING CORE',
      tier: 'prod',
      destructive: false,
      tooltip: 'Force the Living Core / Overseer scope into the OFFLINE (no carrier) state.',
      triggers: [],
      action: () => window.setOverseerState && window.setOverseerState('offline'),
    },
    {
      id: 'core-flare',
      label: 'CORE: FLARE',
      subLabel: '_coreFlare()',
      icon: '▲',
      category: 'triggers',
      group: 'LIVING CORE',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fire the Living Core level-up flare flourish.',
      triggers: [],
      action: () => window._coreFlare && window._coreFlare(),
    },
    {
      id: 'core-burst',
      label: 'CORE: STAT BURST',
      subLabel: '_coreStatBurst()',
      icon: '▲',
      category: 'triggers',
      group: 'LIVING CORE',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fire the Living Core 3D ring stat-change burst.',
      triggers: [],
      action: () => window._coreStatBurst && window._coreStatBurst(),
    },

    // Boot flavors (window.__robcoBootFlavor override + a real reboot).
    {
      id: 'boot-flavor-normal',
      label: 'BOOT: NORMAL',
      subLabel: "__robcoBootFlavor='normal' + reboot",
      icon: '↻',
      category: 'triggers',
      group: 'BOOT FLAVOR',
      tier: 'prod',
      destructive: false,
      tooltip: 'Replay the boot sequence forced to the normal warm-boot POST.',
      triggers: [],
      action: () => _fireBootFlavor('normal'),
    },
    {
      id: 'boot-flavor-cold',
      label: 'BOOT: COLD START',
      subLabel: "__robcoBootFlavor='cold' + reboot",
      icon: '↻',
      category: 'triggers',
      group: 'BOOT FLAVOR',
      tier: 'prod',
      destructive: false,
      tooltip: 'Replay the boot sequence forced to the first-ever cold-start POST.',
      triggers: ['robco_booted_before'],
      action: () => _fireBootFlavor('cold'),
    },
    {
      id: 'boot-flavor-degraded',
      label: 'BOOT: DEGRADED TUBE',
      subLabel: "__robcoBootFlavor='degraded' + reboot",
      icon: '↻',
      category: 'triggers',
      group: 'BOOT FLAVOR',
      tier: 'prod',
      destructive: false,
      tooltip: 'Replay the boot sequence forced to the rare degraded-CRT-tube POST.',
      triggers: [],
      action: () => _fireBootFlavor('degraded'),
    },

    // Ceremonies M1-M5 (Ceremony Moments Wave 1) — replay only, never clears
    // the real persisted view-once flag (planning §4).
    {
      id: 'ceremony-ignition',
      label: 'CEREMONY: IGNITION (M1)',
      subLabel: '_runCampaignIgnition()',
      icon: '⚙',
      category: 'triggers',
      group: 'CEREMONIES',
      tier: 'prod',
      destructive: false,
      tooltip: 'Replay the M1 Campaign Ignition commissioning sequence.',
      triggers: [],
      action: () => _replayIgnition(),
    },
    {
      id: 'ceremony-greet',
      label: 'CEREMONY: OVERSEER GREETING (M2)',
      subLabel: '_maybeGreetOverseer() (session flag reset, not MetaStore)',
      icon: '⚙',
      category: 'triggers',
      group: 'CEREMONIES',
      tier: 'prod',
      destructive: false,
      tooltip:
        'Replay the M2 Director-on-the-Wire greeting. Requires a live AI carrier — silent otherwise (the real gate).',
      triggers: [],
      action: () => _replayGreet(),
    },
    {
      id: 'ceremony-firmware',
      label: 'CEREMONY: FIRMWARE FLASH (M3)',
      subLabel: '_fireFirmwareFlashFlourish() (no version-flag mutation)',
      icon: '⚙',
      category: 'triggers',
      group: 'CEREMONIES',
      tier: 'prod',
      destructive: false,
      tooltip: 'Replay the M3 firmware-flash flourish (serial-plate glint + REV LOG pulse).',
      triggers: ['robco_last_seen_version'],
      action: () => _replayFirmware(),
    },
    {
      id: 'ceremony-absence',
      label: 'CEREMONY: LONG-ABSENCE (M4)',
      subLabel: 'synthetic idle-days + runBootSequence()',
      icon: '⚙',
      category: 'triggers',
      group: 'CEREMONIES',
      tier: 'prod',
      destructive: false,
      tooltip: 'Replay the M4 long-absence boot POST line via a real (but synthetic) reboot.',
      triggers: [],
      action: () => _replayAbsence(),
    },
    {
      id: 'ceremony-seat',
      label: 'CEREMONY: SEAT (M5)',
      subLabel: '_motionSeat(el)',
      icon: '⚙',
      category: 'triggers',
      group: 'CEREMONIES',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fire the M5 SEAT motion verb on the Diagnostic Shell drawer icon.',
      triggers: [],
      action: () => _replaySeat(),
    },
    {
      id: 'time-daynight',
      label: 'TOGGLE DAY / NIGHT',
      subLabel: 'body.classList.toggle(time-night)',
      icon: '◐',
      category: 'triggers',
      group: 'CEREMONIES',
      tier: 'prod',
      destructive: false,
      tooltip:
        'Preview the Day/Night Indicator visual (#12) — self-corrects on the next real updateMath() tick.',
      triggers: [],
      action: () => _toggleDayNight(),
    },

    // Fire any of the 33 feedback animations — bus events (planning §1.4).
    // One registry entry per UNIQUE event name (not per named animation): a
    // single emit already drives every animation subscribed to it, exactly
    // as in real play (e.g. limb.state alone fires BOTH #6 X-RAY FLASH and
    // #7 SPLINT WRAP). tier:'prod' below is confirmed non-destructive per the
    // Protocol 42 finding at the top of this file's U3 helpers.
    {
      id: 'fire-anim-limb.state',
      label: 'FIRE: LIMB STATE',
      subLabel: "RobcoEvents.emit('limb.state')",
      icon: '⚠',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #6 X-RAY FLASH / #7 SPLINT WRAP.',
      triggers: ['limb.state'],
      action: () => _fireAnimEvent('limb.state', { limb: 'la', state: 'crippled' }),
    },
    {
      id: 'fire-anim-effect.applied',
      label: 'FIRE: EFFECT APPLIED',
      subLabel: "RobcoEvents.emit('effect.applied')",
      icon: '✚',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires the STATUS EFFECTS lamp-lit reaction.',
      triggers: ['effect.applied'],
      action: () => _fireAnimEvent('effect.applied', { name: 'Buffout', type: 'BUFF' }),
    },
    {
      id: 'fire-anim-item.added',
      label: 'FIRE: ITEM ADDED',
      subLabel: "RobcoEvents.emit('item.added')",
      icon: '◈',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #18 MANIFEST PUNCH.',
      triggers: ['item.added'],
      action: () =>
        _fireAnimEvent('item.added', { name: 'Stimpak', qty: 1, source: 'manual', type: 'aid' }),
    },
    {
      id: 'fire-anim-quest.status',
      label: 'FIRE: QUEST STATUS',
      subLabel: "RobcoEvents.emit('quest.status')",
      icon: '✓',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #23 CASE-CLOSED STAMP / #24 FILAMENT DIE.',
      triggers: ['quest.status'],
      action: () =>
        _fireAnimEvent('quest.status', {
          name: 'Sample Directive',
          status: 'complete',
          prevStatus: 'active',
        }),
    },
    {
      id: 'fire-anim-effect.expiring',
      label: 'FIRE: EFFECT EXPIRING',
      subLabel: "RobcoEvents.emit('effect.expiring')",
      icon: '✚',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #29 GUTTERING LAMP.',
      triggers: ['effect.expiring'],
      action: () => _fireAnimEvent('effect.expiring', { name: 'Buffout', ticks: 2 }),
    },
    {
      id: 'fire-anim-faction.threshold',
      label: 'FIRE: FACTION THRESHOLD',
      subLabel: "RobcoEvents.emit('faction.threshold')",
      icon: '⚑',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires the FACTION ALERT chat line + sound/haptic (registry-driven target).',
      triggers: ['faction.threshold'],
      action: () => _fireFactionThreshold(),
    },
    {
      id: 'fire-anim-data.write',
      label: 'FIRE: DATA WRITE',
      subLabel: "RobcoEvents.emit('data.write')",
      icon: '◎',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #31 HOLOTAPE COMMIT + the Living Core write-pulse.',
      triggers: ['data.write'],
      action: () => _fireAnimEvent('data.write', { kind: 'local-save' }),
    },
    {
      id: 'fire-anim-location.visited',
      label: 'FIRE: LOCATION VISITED',
      subLabel: "RobcoEvents.emit('location.visited')",
      icon: '⦿',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires the #26 SURVEY PING annunciator echo (registry-driven target).',
      triggers: ['location.visited'],
      action: () => _fireLocationVisited(),
    },
    {
      id: 'fire-anim-stat.change',
      label: 'FIRE: STAT CHANGE',
      subLabel: "RobcoEvents.emit('stat.change')",
      icon: '◆',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #3 STIM FLUSH (an HP increase).',
      triggers: ['stat.change'],
      action: () => _fireAnimEvent('stat.change', { key: 'hp', oldVal: 10, newVal: 20 }),
    },
    {
      id: 'fire-anim-location.current',
      label: 'FIRE: LOCATION CURRENT',
      subLabel: "RobcoEvents.emit('location.current')",
      icon: '⦿',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires the LOCATION CONFIRMATION CARD toast.',
      triggers: ['location.current'],
      action: () => _fireLocationCurrent(),
    },
    {
      id: 'fire-anim-karma.tier',
      label: 'FIRE: KARMA TIER',
      subLabel: "RobcoEvents.emit('karma.tier')",
      icon: '◆',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #15 NEEDLE KICK.',
      triggers: ['karma.tier'],
      action: () => _fireAnimEvent('karma.tier', { tier: 'GOOD' }),
    },
    {
      id: 'fire-anim-weight.seized',
      label: 'FIRE: WEIGHT SEIZED',
      subLabel: "RobcoEvents.emit('weight.seized')",
      icon: '⚠',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #8 BRIDGE CLANG.',
      triggers: ['weight.seized'],
      action: () => _fireAnimEvent('weight.seized', { seized: true }),
    },
    {
      id: 'fire-anim-hp.critical',
      label: 'FIRE: HP CRITICAL',
      subLabel: "RobcoEvents.emit('hp.critical')",
      icon: '⚠',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #1 FLATLINE WARNING (one-shot stutter) + haptic.',
      triggers: ['hp.critical'],
      action: () => _fireAnimEvent('hp.critical', { pct: 20 }),
    },
    {
      id: 'fire-anim-rad.tier',
      label: 'FIRE: RAD TIER',
      subLabel: "RobcoEvents.emit('rad.tier')",
      icon: '☢',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #4 GEIGER SPIKE.',
      triggers: ['rad.tier'],
      action: () => _fireAnimEvent('rad.tier', { tier: 'ADVANCED', direction: 'up' }),
    },
    {
      id: 'fire-anim-item.equipped',
      label: 'FIRE: ITEM EQUIPPED',
      subLabel: "RobcoEvents.emit('item.equipped')",
      icon: '◈',
      category: 'triggers',
      group: 'FIRE ANIMATION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #19 IN-SERVICE STAMP.',
      triggers: ['item.equipped'],
      action: () => _fireAnimEvent('item.equipped', { slot: 'weapon', name: 'Sample Weapon' }),
    },

    // The 7 bus events with a REACTIVE auto-log subscriber (Protocol 42
    // finding, documented above) — writes the campaign event log, so these are
    // correctly staging-tier + destructive (auto-confirm-gated), NOT prod.
    {
      id: 'fire-anim-level.up',
      label: 'FIRE: LEVEL UP',
      subLabel: "RobcoEvents.emit('level.up') — WRITES the campaign event log (U8 auto-log)",
      icon: '▲',
      category: 'triggers',
      group: 'FIRE ANIMATION (WRITES EVENT LOG)',
      tier: 'staging',
      destructive: true,
      tooltip:
        'Fires #9 VAULT-BOY LEVEL CARD + the Living Core flare/burst. Also appends a real entry to the campaign event log (state.js U8 auto-log subscriber) — staging-only, confirm-gated.',
      triggers: ['level.up'],
      action: () => _fireLevelUp(),
    },
    {
      id: 'fire-anim-collectible.acquired',
      label: 'FIRE: COLLECTIBLE ACQUIRED',
      subLabel:
        "RobcoEvents.emit('collectible.acquired') — WRITES the campaign event log (U8 auto-log)",
      icon: '★',
      category: 'triggers',
      group: 'FIRE ANIMATION (WRITES EVENT LOG)',
      tier: 'staging',
      destructive: true,
      tooltip:
        'Fires the #22 EXHIBIT LIGHT-UP annunciator echo. Also appends a real entry to the campaign event log — staging-only, confirm-gated.',
      triggers: ['collectible.acquired'],
      action: () => _fireCollectibleAcquired(),
    },
    {
      id: 'fire-anim-craft.completed',
      label: 'FIRE: CRAFT COMPLETED',
      subLabel: "RobcoEvents.emit('craft.completed') — WRITES the campaign event log (U8 auto-log)",
      icon: '⚒',
      category: 'triggers',
      group: 'FIRE ANIMATION (WRITES EVENT LOG)',
      tier: 'staging',
      destructive: true,
      tooltip:
        'Fires #20 WELD SPARKS + TAG. Also appends a real entry to the campaign event log — staging-only, confirm-gated.',
      triggers: ['craft.completed'],
      action: () => _fireAnimEvent('craft.completed', { name: 'Sample Item', qty: 1 }),
    },
    {
      id: 'fire-anim-craft.scrapped',
      label: 'FIRE: CRAFT SCRAPPED',
      subLabel: "RobcoEvents.emit('craft.scrapped') — WRITES the campaign event log (U8 auto-log)",
      icon: '⚒',
      category: 'triggers',
      group: 'FIRE ANIMATION (WRITES EVENT LOG)',
      tier: 'staging',
      destructive: true,
      tooltip:
        'Fires #21 PART DROP. Also appends a real entry to the campaign event log — staging-only, confirm-gated.',
      triggers: ['craft.scrapped'],
      action: () => _fireAnimEvent('craft.scrapped', { name: 'Sample Item', qty: 1 }),
    },
    {
      id: 'fire-anim-trade.bought',
      label: 'FIRE: TRADE BOUGHT',
      subLabel: "RobcoEvents.emit('trade.bought') — WRITES the campaign event log (U8 auto-log)",
      icon: '◉',
      category: 'triggers',
      group: 'FIRE ANIMATION (WRITES EVENT LOG)',
      tier: 'staging',
      destructive: true,
      tooltip:
        'Fires the #17 CAPS ODOMETER SPIN trade half. Also appends a real entry to the campaign event log — staging-only, confirm-gated.',
      triggers: ['trade.bought'],
      action: () => _fireAnimEvent('trade.bought', { name: 'Sample Item', price: 10 }),
    },
    {
      id: 'fire-anim-trade.sold',
      label: 'FIRE: TRADE SOLD',
      subLabel: "RobcoEvents.emit('trade.sold') — WRITES the campaign event log (U8 auto-log)",
      icon: '◉',
      category: 'triggers',
      group: 'FIRE ANIMATION (WRITES EVENT LOG)',
      tier: 'staging',
      destructive: true,
      tooltip:
        'Fires the #17 CAPS ODOMETER SPIN trade half. Also appends a real entry to the campaign event log — staging-only, confirm-gated.',
      triggers: ['trade.sold'],
      action: () => _fireAnimEvent('trade.sold', { name: 'Sample Item', price: 10 }),
    },
    {
      id: 'fire-anim-sleep.completed',
      label: 'FIRE: SLEEP COMPLETED',
      subLabel: "RobcoEvents.emit('sleep.completed') — WRITES the campaign event log (U8 auto-log)",
      icon: '◐',
      category: 'triggers',
      group: 'FIRE ANIMATION (WRITES EVENT LOG)',
      tier: 'staging',
      destructive: true,
      tooltip:
        'Fires #30 CLOCK SPIN-DOZE. Also appends a real entry to the campaign event log — staging-only, confirm-gated.',
      triggers: ['sleep.completed'],
      action: () => _fireAnimEvent('sleep.completed', { ticksAdded: 80 }),
    },

    // Fire any of the 7 pending-var animations (planning §1.4).
    {
      id: 'fire-pending-rep-stamp',
      label: 'FIRE: REPUTATION STAMP',
      subLabel: '_pendingRepStamp + renderFactionRep()',
      icon: '◆',
      category: 'triggers',
      group: 'FIRE ANIMATION (PENDING)',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #14 REPUTATION STAMP on the currently-selected faction channel.',
      triggers: [],
      action: () => _firePendingRepStamp(),
    },
    {
      id: 'fire-pending-quest-stamp',
      label: 'FIRE: QUEST STAMP',
      subLabel: '_pendingQuestStamp + renderQuests()',
      icon: '✓',
      category: 'triggers',
      group: 'FIRE ANIMATION (PENDING)',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #23 CASE-CLOSED STAMP / #24 FILAMENT DIE on the first directive.',
      triggers: [],
      action: () => _firePendingQuestStamp(),
    },
    {
      id: 'fire-pending-exhibit-light',
      label: 'FIRE: EXHIBIT LIGHT-UP',
      subLabel: '_pendingExhibitLight + renderCollectibles()',
      icon: '★',
      category: 'triggers',
      group: 'FIRE ANIMATION (PENDING)',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #22 EXHIBIT LIGHT-UP on the first tracked collectible.',
      triggers: [],
      action: () => _firePendingExhibitLight(),
    },
    {
      id: 'fire-pending-survey-ping',
      label: 'FIRE: SURVEY PING',
      subLabel: '_pendingSurveyPing + renderWorldMap() (forces the WORLD GRID view)',
      icon: '⦿',
      category: 'triggers',
      group: 'FIRE ANIMATION (PENDING)',
      tier: 'prod',
      destructive: false,
      tooltip:
        'Fires #26 SURVEY PING at the current location — switches to the WORLD GRID view first.',
      triggers: [],
      action: () => _firePendingSurveyPing(),
    },
    {
      id: 'fire-pending-quest-filed',
      label: 'FIRE: DIRECTIVE FILED',
      subLabel: '_pendingQuestFiled + renderQuests()',
      icon: '✓',
      category: 'triggers',
      group: 'FIRE ANIMATION (PENDING)',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #25 DIRECTIVE FILED on the first directive.',
      triggers: [],
      action: () => _firePendingQuestFiled(),
    },
    {
      id: 'fire-pending-perk-seat',
      label: 'FIRE: CARD SEAT',
      subLabel: '_pendingPerkSeat + renderPerks()',
      icon: '◆',
      category: 'triggers',
      group: 'FIRE ANIMATION (PENDING)',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #13 CARD SEAT on the first perk.',
      triggers: [],
      action: () => _firePendingPerkSeat(),
    },
    {
      id: 'fire-pending-effect-warmup',
      label: 'FIRE: TUNGSTEN WARM-UP',
      subLabel: '_pendingEffectWarmup + renderStatus()',
      icon: '✚',
      category: 'triggers',
      group: 'FIRE ANIMATION (PENDING)',
      tier: 'prod',
      destructive: false,
      tooltip: 'Fires #28 TUNGSTEN WARM-UP on the first active status effect.',
      triggers: [],
      action: () => _firePendingEffectWarmup(),
    },

    // ── U4a: INSPECT BUILD-OUT (planning/DIAGNOSTIC_SHELL_PLAN.md §3.1/§11 U4)
    // A read-only "system diagnostics" readout — NEVER a raw JSON blob (owner
    // directive). Every group below is built from _inspectXxxHtml() helpers
    // (see the U4a INSPECT section further down this file) that assemble
    // labeled, human-readable lines only — the same _chassisIdRow()/
    // _chassisBreaker() reuse the CHASSIS SYSTEM STATUS board already
    // established (Protocol 22), never a second raw-dump renderer. The
    // readable summary is safe on a minigame-unlocked PRODUCTION build
    // (tier:'prod' — the same class of telemetry a network tab already
    // shows); genuinely dev-only internals (SW registration guts, the raw
    // feature-flag LKG cache) stay tier:'staging', but are STILL rendered as
    // labeled text, never JSON.stringify. Grouped: VITALS & CAMPAIGN
    // SUMMARY / DEVICE & SYSTEM (also hosts the migrated RUNTIME STATE +
    // REGISTERED OBSERVERS anchors above) / CONNECTION / FLAGS. INSPECT
    // itself is the LAST category in CATEGORY_ORDER (below) so the readout
    // sits at the bottom of the shell.
    {
      id: 'inspect-vitals',
      label: 'VITALS & CAMPAIGN SUMMARY',
      subLabel: 'readable state readout — game/level/XP/HP/location/caps/karma/directives',
      icon: '◉',
      category: 'inspect',
      group: 'VITALS & CAMPAIGN SUMMARY',
      tier: 'prod',
      destructive: false,
      tooltip:
        'A read-only, human-readable summary of the active campaign — never a raw data dump.',
      triggers: [],
      anchor: '[data-dsh-anchor="dshInspectVitals"]',
    },
    // Relocated verbatim from their original U1 array position (Protocol 22 —
    // no behavior change, same id/anchor/tooltip) so the "DEVICE / SYSTEM"
    // group's first-encountered tool sits after VITALS in registry order —
    // that ordering is what determines each group wrapper's position among
    // its siblings in _renderShell() (first tool of a group wins the slot).
    {
      id: 'inspect-runtime-state',
      label: 'RUNTIME STATE',
      subLabel: 'AmbientRuntime.getState() readout',
      icon: '◉',
      category: 'inspect',
      group: 'DEVICE / SYSTEM',
      tier: 'prod',
      destructive: false,
      tooltip: 'Live Ambient Runtime state readout.',
      triggers: ['runtime.state'],
      anchor: '[data-dsh-anchor="testConsoleState"]',
    },
    {
      id: 'inspect-observers',
      label: 'REGISTERED OBSERVERS',
      subLabel: 'AmbientRuntime.listObservers() readout',
      icon: '◉',
      category: 'inspect',
      group: 'DEVICE / SYSTEM',
      tier: 'prod',
      destructive: false,
      tooltip: 'Live list of registered Ambient Runtime observers.',
      triggers: [],
      anchor: '[data-dsh-anchor="testConsoleObservers"]',
    },
    {
      id: 'inspect-device-detail',
      label: 'DEVICE DETAIL',
      subLabel: 'APP VERSION + active Cache Storage revision (read-only)',
      icon: '◉',
      category: 'inspect',
      group: 'DEVICE / SYSTEM',
      tier: 'prod',
      destructive: false,
      tooltip: 'Read-only APP VERSION + active cache revision readout.',
      triggers: [],
      anchor: '[data-dsh-anchor="dshInspectDevice"]',
    },
    {
      id: 'inspect-sw-internal',
      label: 'SERVICE WORKER INTERNALS',
      subLabel: 'navigator.serviceWorker.getRegistration() (read-only, staging only)',
      icon: '⚒',
      category: 'inspect',
      group: 'DEVICE / SYSTEM',
      tier: 'staging',
      destructive: false,
      tooltip:
        'Dev-only Service Worker registration detail (scope/active/waiting/installing) — rendered as labeled text, never raw.',
      triggers: [],
      anchor: '[data-dsh-anchor="dshInspectSwInternal"]',
    },
    {
      id: 'inspect-connection',
      label: 'CONNECTION',
      subLabel: 'carrier / AI chat / network readout (read-only)',
      icon: '◉',
      category: 'inspect',
      group: 'CONNECTION',
      tier: 'prod',
      destructive: false,
      tooltip: 'Read-only carrier, AI chat, and network status readout.',
      triggers: [],
      anchor: '[data-dsh-anchor="dshInspectConnection"]',
    },
    {
      id: 'inspect-flags',
      label: 'FEATURE FLAGS',
      subLabel: 'isFeatureEnabled() per known flag (read-only)',
      icon: '◉',
      category: 'inspect',
      group: 'FLAGS',
      tier: 'prod',
      destructive: false,
      tooltip:
        'A readable ENABLED/DISABLED line per remote kill-switch flag — the same telemetry the CHASSIS SYSTEM STATUS board already shows.',
      triggers: [],
      anchor: '[data-dsh-anchor="dshInspectFlags"]',
    },
    {
      id: 'inspect-flags-internal',
      label: 'FEATURE FLAGS — RAW CACHE',
      subLabel: "MetaStore.get('robco_feature_flags') presence (read-only, staging only)",
      icon: '⚒',
      category: 'inspect',
      group: 'FLAGS',
      tier: 'staging',
      destructive: false,
      tooltip:
        'Dev-only readout of the local last-known-good feature-flag cache — rendered as labeled text, never raw JSON.',
      triggers: [],
      anchor: '[data-dsh-anchor="dshInspectFlagsInternal"]',
    },
    {
      id: 'inspect-copy',
      label: 'COPY DIAGNOSTICS',
      subLabel: 'navigator.clipboard.writeText() of the readable readout above (never raw JSON)',
      icon: '⧉',
      category: 'inspect',
      group: 'COPY DIAGNOSTICS',
      tier: 'prod',
      destructive: false,
      tooltip: 'Copy the readable INSPECT readout to the clipboard — never a raw JSON dump.',
      triggers: [],
      anchor: '[data-dsh-anchor="dshInspectCopy"]',
    },
  ];
  // Exposed read-only for the harness (the VM behavioral proof, mirroring how
  // the OCR test wiring is reachable) — never mutated at runtime.
  window._DIAGNOSTIC_SHELL_TOOLS = DIAGNOSTIC_SHELL_TOOLS;
  window._toolVisible = _toolVisible;
  window._shellTier = _shellTier;

  // Section order + chrome (planning/DIAGNOSTIC_SHELL_PLAN.md §3.1). U1 only
  // populates triggers/inspect/env/infra; state/resets/fixtures/inline stay
  // empty (no tools yet) and are skipped entirely — a section with zero
  // visible tools for the current tier is never rendered.
  // U4a: INSPECT moved to LAST — the readable diagnostics readout sits at
  // the bottom of the shell (planning/DIAGNOSTIC_SHELL_PLAN.md §11 U4).
  var CATEGORY_ORDER = ['triggers', 'state', 'resets', 'infra', 'fixtures', 'env', 'inspect'];
  // Each section carries its own icon (U2 — "icons everywhere", planning
  // §3.2), prepended to its <h3> in _renderShell() below.
  var CATEGORY_META = {
    triggers: { stagingTitle: 'TRIGGERS', prodTitle: 'STIMULUS BENCH', icon: '▲' },
    state: { stagingTitle: 'STATE SETUP', prodTitle: 'STATE SETUP', icon: '◆' },
    resets: { stagingTitle: 'RESETS', prodTitle: 'RESETS', icon: '⌦' },
    infra: { stagingTitle: 'RESILIENCE & INFRA', prodTitle: 'RESILIENCE & INFRA', icon: '⚒' },
    inspect: { stagingTitle: 'INSPECT', prodTitle: 'READOUTS', icon: '◉' },
    fixtures: { stagingTitle: 'FIXTURES', prodTitle: 'FIXTURES', icon: '▣' },
    env: { stagingTitle: 'ENVIRONMENT & UNLOCK', prodTitle: 'ACCESS', icon: '■' },
  };
  // The shared DEV-MARKER glyph (U2 — one glyph, every dev-only affordance):
  // the FAB, and reserved for the inline dev-reset buttons a future unit
  // (U4) will add via category:'inline' registry entries (planning §5/§9).
  var DEV_MARKER = '⚙';

  // ── U4a: collapsible GROUP wrappers (planning/DIAGNOSTIC_SHELL_PLAN.md
  // §11 U4) ──────────────────────────────────────────────────────────────
  // U1-U3 rendered every registry `group` as a flat, always-expanded
  // .dsh-tool-subhead + .dsh-tool-grid (synthesized tools) or moved an
  // anchor's markup straight into the category (migrated tools) — with 45
  // TRIGGERS entries that made the shell one giant always-open scroll. Every
  // group (anchor-based or synthesized) now becomes its own collapsible
  // details.sub-panel, nested inside its category's own details.sub-panel,
  // wired through the SAME _wireDynamicSubPanel() persistence helper the
  // category itself already uses (Protocol 22/UI-1/UI-2) — not a second
  // persistence mechanism. Defaults OPEN except the FIRE ANIMATION family
  // (~28 buttons across its 3 tier-split groups), which defaults COLLAPSED
  // so the shell opens compact.
  function _dshGroupSlug(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  function _dshGroupDefaultOpen(headingText) {
    return !/^FIRE ANIMATION/.test(headingText || '');
  }
  function _buildGroupDetails(cat, headingText, headingIcon) {
    var groupDetails = document.createElement('details');
    groupDetails.className = 'sub-panel';
    groupDetails.setAttribute('data-sub-id', 'dsh_group_' + cat + '_' + _dshGroupSlug(headingText));
    if (_dshGroupDefaultOpen(headingText)) groupDetails.setAttribute('open', '');
    var groupSummary = document.createElement('summary');
    var groupH3 = document.createElement('h3');
    groupH3.textContent = '> ' + headingText;
    var groupIcon = document.createElement('span');
    groupIcon.className = 'dsh-section-icon';
    groupIcon.setAttribute('aria-hidden', 'true');
    groupIcon.textContent = (headingIcon || DEV_MARKER) + ' ';
    groupH3.insertBefore(groupIcon, groupH3.firstChild);
    groupSummary.appendChild(groupH3);
    groupDetails.appendChild(groupSummary);
    if (typeof _wireDynamicSubPanel === 'function') _wireDynamicSubPanel(groupDetails);
    return groupDetails;
  }

  function _paintEnvBanner(panel, tier) {
    var el = panel.querySelector('#dshEnvBanner');
    if (!el) return;
    el.textContent =
      tier === 'staging'
        ? 'STAGING TOOLBENCH — ALL SYSTEMS EXPOSED'
        : 'RESTRICTED DIAGNOSTIC ACCESS — SANDBOX';
    el.classList.toggle('dsh-banner-staging', tier === 'staging');
    el.classList.toggle('dsh-banner-prod', tier !== 'staging');
  }

  // _renderShell — the single render pipeline (planning/DIAGNOSTIC_SHELL_PLAN.md
  // §3.3). Runs on a DETACHED clone of <template id="testConsoleTemplate">
  // (see _mountConsole()) — nothing here has touched the document yet. For
  // every category, in order: gather the tools that pass _toolVisible() for
  // the CURRENT tier, skip the whole section if none survive, otherwise build
  // a collapsible sub-panel and MOVE each surviving tool's existing anchor
  // element into it. Any anchor never claimed by a visible tool (tier-filtered
  // out) is explicitly stripped from the tree at the end — so a tier:'staging'
  // tool has no path to the document unless _shellTier() genuinely returned
  // 'staging'. This is what makes the filter run BEFORE DOM insertion: the
  // caller only appends the surviving `panel` to the document after this
  // function returns.
  function _renderShell(panel) {
    var tier = _shellTier();
    _paintEnvBanner(panel, tier);
    var sectionsHost = panel.querySelector('#dshSections');
    if (!sectionsHost) return;
    sectionsHost.innerHTML = '';
    var moved = {};
    CATEGORY_ORDER.forEach(function (cat) {
      var visibleTools = DIAGNOSTIC_SHELL_TOOLS.filter(function (t) {
        return t.category === cat && _toolVisible(t, tier);
      });
      if (!visibleTools.length) return; // section hidden entirely this tier
      var meta = CATEGORY_META[cat] || {};
      var details = document.createElement('details');
      details.className = 'sub-panel';
      details.setAttribute('data-sub-id', 'dsh_' + cat);
      var summary = document.createElement('summary');
      var h3 = document.createElement('h3');
      h3.textContent =
        '> ' +
        (tier === 'staging'
          ? meta.stagingTitle
          : meta.prodTitle || meta.stagingTitle || cat.toUpperCase());
      // U2 — section icon (planning §3.2 "icons everywhere"): prepended as a
      // separate node AFTER the textContent assignment above (never folded
      // into that assignment itself, so the '> HEADING' text stays intact).
      var secIcon = document.createElement('span');
      secIcon.className = 'dsh-section-icon';
      secIcon.setAttribute('aria-hidden', 'true');
      secIcon.textContent = (meta.icon || DEV_MARKER) + ' ';
      h3.insertBefore(secIcon, h3.firstChild);
      summary.appendChild(h3);
      details.appendChild(summary);
      // U4a: every tool's `group` (anchor-based or synthesized) becomes its
      // own collapsible details.sub-panel NESTED inside this category's
      // details.sub-panel — _buildGroupDetails() above builds it (and wires
      // its own persistence) the first time a group name is encountered;
      // every later tool of the same group reuses the cached wrapper via
      // groupWrappers[groupKey], regardless of whether it's an anchor tool
      // or a synthesized button, and regardless of whether it actually ends
      // up claiming anything (a shared-anchor tool that loses the `moved`
      // race below still resolves to the SAME already-created wrapper, never
      // a stray duplicate). One more registry entry (icon/label/tooltip/
      // action/group, anchor optional) is the entire cost of a future
      // trigger (Protocol 44).
      var groupWrappers = {};
      var groupGrids = {};
      visibleTools.forEach(function (tool) {
        var groupName = tool.group || tool.label;
        var groupKey = cat + '::' + groupName;
        var wrapper = groupWrappers[groupKey];
        if (!wrapper) {
          wrapper = _buildGroupDetails(cat, groupName, tool.icon);
          groupWrappers[groupKey] = wrapper;
          details.appendChild(wrapper);
        }
        if (!tool.anchor) {
          var grid = groupGrids[groupKey];
          if (!grid) {
            grid = document.createElement('div');
            grid.className = 'dsh-tool-grid';
            grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px';
            wrapper.appendChild(grid);
            groupGrids[groupKey] = grid;
          }
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-sm dsh-tool-btn';
          btn.setAttribute(
            'data-dsh-search',
            (tool.label + ' ' + (tool.subLabel || '')).toLowerCase()
          );
          if (tool.tooltip) btn.title = tool.tooltip;
          var btnIcon = document.createElement('span');
          btnIcon.className = 'dsh-tool-icon';
          btnIcon.setAttribute('aria-hidden', 'true');
          btnIcon.textContent = (tool.icon || DEV_MARKER) + ' ';
          btn.appendChild(btnIcon);
          btn.appendChild(document.createTextNode(tool.label));
          btn.addEventListener('click', function () {
            _invoke(tool);
          });
          grid.appendChild(btn);
          return;
        }
        if (moved[tool.anchor]) return; // a shared anchor already placed
        var anchorEl = panel.querySelector(tool.anchor);
        if (!anchorEl) return;
        anchorEl.setAttribute(
          'data-dsh-search',
          (tool.label + ' ' + (tool.subLabel || '')).toLowerCase()
        );
        if (tool.tooltip) anchorEl.title = tool.tooltip;
        // U2 — per-tool icon (registry `icon` field), prepended into the
        // anchor's own .optics-label so every migrated control reads with
        // an icon, not plain text only. A shared anchor (e.g. FORCE
        // TRANSITION/REBOOT/WAKE all point at #testConsoleTransitions) only
        // ever gets the FIRST claiming tool's icon (the `moved` guard above
        // already ensures only one tool ever reaches this point per anchor).
        var labelEl = anchorEl.querySelector('.optics-label');
        if (labelEl && (tool.icon || DEV_MARKER) && !labelEl.querySelector('.dsh-tool-icon')) {
          var toolIcon = document.createElement('span');
          toolIcon.className = 'dsh-tool-icon';
          toolIcon.setAttribute('aria-hidden', 'true');
          toolIcon.textContent = (tool.icon || DEV_MARKER) + ' ';
          labelEl.insertBefore(toolIcon, labelEl.firstChild);
        }
        wrapper.appendChild(anchorEl); // moves the existing node — no markup rebuilt
        moved[tool.anchor] = true;
      });
      if (typeof _wireDynamicSubPanel === 'function') _wireDynamicSubPanel(details);
      sectionsHost.appendChild(details);
    });
    // Leak-proof guarantee: an anchor no visible tool ever claimed (every tool
    // pointing at it was filtered out by _toolVisible for this tier) is
    // stripped from the tree here, before this panel is ever appended to the
    // document — it never becomes reachable DOM.
    DIAGNOSTIC_SHELL_TOOLS.forEach(function (tool) {
      if (!tool.anchor || moved[tool.anchor]) return;
      var leftover = panel.querySelector(tool.anchor);
      if (leftover && leftover.parentNode) leftover.parentNode.removeChild(leftover);
    });
  }

  function _wireSearch(panel) {
    var input = panel.querySelector('#dshSearch');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var sections = panel.querySelectorAll('#dshSections > details.sub-panel');
      Array.prototype.forEach.call(sections, function (sec) {
        // U4a: a category's tools now live one level deeper, inside their own
        // nested group details.sub-panel(s) — filter within each group too,
        // so a search that matches nothing in a group hides that group's
        // (now collapsible) heading, not just its individual controls.
        var groups = sec.querySelectorAll('details.sub-panel');
        var groupsList = groups.length ? Array.prototype.slice.call(groups) : [sec];
        var anySectionVisible = false;
        groupsList.forEach(function (grp) {
          var anchors = grp.querySelectorAll('[data-dsh-search]');
          var anyVisible = !anchors.length; // an empty group (shouldn't happen) stays visible
          Array.prototype.forEach.call(anchors, function (a) {
            var hay = a.getAttribute('data-dsh-search') || '';
            var show = !q || hay.indexOf(q) !== -1;
            a.style.display = show ? '' : 'none';
            if (show) anyVisible = true;
          });
          if (grp !== sec) grp.style.display = anyVisible ? '' : 'none';
          if (anyVisible) anySectionVisible = true;
        });
        sec.style.display = anySectionVisible ? '' : 'none';
      });
    });
  }

  // _mountConsole — U2: the clone now carries THREE top-level siblings (the
  // FAB, the scrim, and the drawer itself) rather than one panel. All three
  // are pulled out of the same detached fragment and appended individually
  // — the drawer via the exact same `mount.appendChild(panel)` call U1
  // already used (Suite 210.7 asserts this literal call happens AFTER
  // _renderShell(panel), so the tier-filter always runs before ANY of this
  // reaches the document; that invariant is unchanged by U2, just joined by
  // two more appends for the FAB/scrim).
  function _mountConsole() {
    var mount = document.getElementById('testConsoleMount');
    var tpl = document.getElementById('testConsoleTemplate');
    if (!mount || !tpl || !tpl.content) return null;
    var existing = document.getElementById('testConsolePanel');
    if (existing) return existing;
    var frag = tpl.content.cloneNode(true); // detached — not part of the document yet
    var panel = frag.querySelector('#testConsolePanel');
    var fab = frag.querySelector('#dshFab');
    var scrim = frag.querySelector('#dshScrim');
    if (!panel) return null;
    _renderShell(panel); // filter + reorganize BEFORE the panel ever touches the document
    if (fab) mount.appendChild(fab);
    if (scrim) mount.appendChild(scrim);
    mount.appendChild(panel); // only the surviving, tier-appropriate DOM is inserted
    return panel;
  }

  // ── U2: drawer open/close + focus trap ───────────────────────────────────
  // A self-contained Tab-cycle + Escape-close, mirroring the existing
  // #sysModal trap in _wireKeyboardShortcuts() (ui-core.js) but scoped to
  // this drawer specifically — the Diagnostic Shell is its own dialog
  // surface, not a #sysModal caller, so it owns its own trap rather than
  // forking or overloading the shared one (Protocol 23).
  var _shellTriggerEl = null;

  function _shellFocusables(panel) {
    if (!panel) return [];
    return Array.prototype.filter.call(
      panel.querySelectorAll(
        'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      ),
      function (el) {
        return el.offsetParent !== null;
      }
    );
  }

  function _shellKeydown(e) {
    var panel = document.getElementById('testConsolePanel');
    if (!panel || panel.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      _closeShell();
      return;
    }
    if (e.key !== 'Tab') return;
    var focusables = _shellFocusables(panel);
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function _openShell() {
    var panel = document.getElementById('testConsolePanel');
    var scrim = document.getElementById('dshScrim');
    var fab = document.getElementById('dshFab');
    if (!panel) return;
    _shellTriggerEl = document.activeElement || null;
    panel.hidden = false;
    if (scrim) scrim.hidden = false;
    if (fab) {
      fab.setAttribute('aria-expanded', 'true');
      // FIX 3 (owner report, mobile chrome batch): the bubble's highlighted
      // look is driven ONLY by this class — never by :hover (mobile's
      // touch-sticky :hover bug) or [aria-expanded] — so it lights up
      // exactly when, and only when, the sheet is genuinely open.
      fab.classList.add('dsh-fab--open');
    }
    document.addEventListener('keydown', _shellKeydown, true);
    var closeBtn = document.getElementById('dshClose');
    if (closeBtn) closeBtn.focus();
    // U4a: refresh the async INSPECT readouts (cache revision, SW internals)
    // every time the drawer opens — cheap, and keeps them from going stale
    // across a long session without polling them on the 500ms tick.
    if (typeof _updateInspectAsync === 'function') _updateInspectAsync(panel);
  }

  function _closeShell() {
    var panel = document.getElementById('testConsolePanel');
    var scrim = document.getElementById('dshScrim');
    var fab = document.getElementById('dshFab');
    if (!panel) return;
    panel.hidden = true;
    if (scrim) scrim.hidden = true;
    if (fab) {
      fab.setAttribute('aria-expanded', 'false');
      fab.classList.remove('dsh-fab--open');
    }
    document.removeEventListener('keydown', _shellKeydown, true);
    if (_shellTriggerEl && typeof _shellTriggerEl.focus === 'function') {
      _shellTriggerEl.focus();
    } else if (fab) {
      fab.focus();
    }
    _shellTriggerEl = null;
  }

  // FIX 2/3 (owner report, mobile chrome batch): set by a genuine FAB drag
  // (see _wireFabDrag below) so the trailing synthetic `click` a pointerup
  // fires inside the button bounds doesn't ALSO toggle the sheet open/closed
  // — the exact _dialDragSuppressClick pattern the Immersion dial already
  // established (ui-core.js). Left false for a plain tap or keyboard
  // activation, which still opens/closes exactly as before.
  var _fabDragSuppressClick = false;

  function _wireShellToggle() {
    var fab = document.getElementById('dshFab');
    var scrim = document.getElementById('dshScrim');
    var closeBtn = document.getElementById('dshClose');
    if (fab) {
      // Single source of truth for the DEV-MARKER glyph (also reserved for
      // the U4 inline dev-reset buttons) — set here from DEV_MARKER rather
      // than trusting the static HTML entity to stay in sync.
      var glyphEl = fab.querySelector('span');
      if (glyphEl) glyphEl.textContent = DEV_MARKER;
      fab.addEventListener('click', function () {
        if (_fabDragSuppressClick) {
          _fabDragSuppressClick = false;
          return;
        }
        var panel = document.getElementById('testConsolePanel');
        if (panel && panel.hidden) {
          _openShell();
        } else {
          _closeShell();
        }
        // FIX 3: a mobile tap leaves :hover matched with no pointerleave to
        // clear it — blur so the CSS hover fill can never stick (mirrors
        // toggleInputMode()'s identical mode-pill fix, ui-core.js).
        fab.blur();
      });
    }
    // FIX 1 (MOBILE ONLY, terminal.css): below max-width:999.98px the scrim
    // goes fully inert (transparent + pointer-events:none) — a "tap outside
    // to dismiss" gesture no longer applies there, since outside IS the now-
    // usable terminal, so a click can never reach this listener on mobile.
    // On desktop the scrim is unchanged from U2 (dims + blocks), so this
    // listener still closes the drawer exactly as it always did.
    if (scrim) scrim.addEventListener('click', _closeShell);
    if (closeBtn) closeBtn.addEventListener('click', _closeShell);
  }

  // Mobile-only gate (owner report, mobile chrome batch): mirrors the exact
  // max-width:999.98px signal terminal.css gates FIX 1/2/3's new mobile
  // rules behind (the inverse of the (min-width:1000px)... desktop check
  // _scrollElFor() already uses, ui-core.js) — desktop's FAB/drawer stay
  // fully click-only/right-side, byte-identical to what U2 shipped.
  function _dshIsMobile() {
    return (
      typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 999.98px)').matches
    );
  }

  // ── FIX 2: draggable FAB (MOBILE ONLY, owner report — mobile chrome
  // batch) ───────────────────────────────────────────────────────────────
  // Mirrors the Immersion dial's tap-vs-drag pointer pattern (ui-core.js
  // _dialPointerDown/_dialPointerMove/_dialPointerEnd) exactly, in two
  // dimensions instead of one: pointerdown captures the pointer and the
  // bubble's current on-screen position; pointermove (past a small
  // threshold, so a plain tap never counts as a drag) repositions it via
  // inline left/top, clamped to the viewport so it can never be dragged
  // off-screen; pointerup releases capture and, only if the bubble
  // genuinely moved, persists the final position (Protocol UI-6) and arms
  // _fabDragSuppressClick so the trailing click doesn't also toggle the
  // sheet. Desktop's FAB stays click-only (Suite 129 pattern) — see
  // _wireFabDrag()/_restoreFabPosition() below.
  var FAB_DRAG_THRESHOLD_PX = 6;
  var _fabDrag = null; // { startX, startY, startLeft, startTop, moved, fab }

  function _fabClampPosition(left, top, fab) {
    var w = fab.offsetWidth || 46;
    var h = fab.offsetHeight || 46;
    var maxLeft = Math.max(0, window.innerWidth - w);
    var maxTop = Math.max(0, window.innerHeight - h);
    return {
      left: Math.max(0, Math.min(maxLeft, left)),
      top: Math.max(0, Math.min(maxTop, top)),
    };
  }

  function _fabPointerMove(ev) {
    if (!_fabDrag) return;
    var dx = ev.clientX - _fabDrag.startX;
    var dy = ev.clientY - _fabDrag.startY;
    if (
      !_fabDrag.moved &&
      (Math.abs(dx) > FAB_DRAG_THRESHOLD_PX || Math.abs(dy) > FAB_DRAG_THRESHOLD_PX)
    ) {
      _fabDrag.moved = true;
    }
    if (!_fabDrag.moved) return;
    var fab = _fabDrag.fab;
    var pos = _fabClampPosition(_fabDrag.startLeft + dx, _fabDrag.startTop + dy, fab);
    fab.style.left = pos.left + 'px';
    fab.style.top = pos.top + 'px';
    fab.style.bottom = 'auto';
    fab.style.right = 'auto';
  }

  function _fabPointerEnd(ev) {
    if (!_fabDrag) return;
    var fab = _fabDrag.fab;
    try {
      fab.releasePointerCapture(ev.pointerId);
    } catch (e) {
      /* already released */
    }
    var moved = _fabDrag.moved;
    _fabDrag = null;
    fab.removeEventListener('pointermove', _fabPointerMove);
    fab.removeEventListener('pointerup', _fabPointerEnd);
    fab.removeEventListener('pointercancel', _fabPointerEnd);
    if (!moved) return;
    _fabDragSuppressClick = true;
    try {
      var rect = fab.getBoundingClientRect();
      if (window.MetaStore && typeof window.MetaStore.set === 'function') {
        window.MetaStore.set(
          'robco_dsh_fab_pos',
          JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) })
        );
      }
    } catch (_) {
      /* a persistence failure must never break the bubble */
    }
  }

  function _fabPointerDown(ev) {
    if (ev.button !== 0) return; // left mouse only; touch/pen report 0 per spec
    var fab = ev.currentTarget;
    var rect = fab.getBoundingClientRect();
    _fabDrag = {
      startX: ev.clientX,
      startY: ev.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
      fab: fab,
    };
    try {
      fab.setPointerCapture(ev.pointerId);
    } catch (e) {
      /* unsupported — drag still tracks via the listeners below */
    }
    fab.addEventListener('pointermove', _fabPointerMove);
    fab.addEventListener('pointerup', _fabPointerEnd);
    fab.addEventListener('pointercancel', _fabPointerEnd);
  }

  function _wireFabDrag() {
    if (!_dshIsMobile()) return; // desktop's FAB stays click-only (Suite 129 pattern)
    var fab = document.getElementById('dshFab');
    if (!fab || typeof window.PointerEvent === 'undefined') return; // graceful fallback: tap-to-open still works
    fab.addEventListener('pointerdown', _fabPointerDown);
  }

  // Restores a previously-dragged FAB position (Protocol UI-6) — re-clamped
  // to the CURRENT viewport on every apply, since a position saved from a
  // wider/taller viewport could otherwise park the bubble off-screen after
  // a resize/rotate. Mobile-only, like the drag itself — a desktop viewport
  // never applies a saved mobile-dragged position, so its FAB always sits
  // at the original CSS resting spot.
  function _restoreFabPosition() {
    if (!_dshIsMobile()) return;
    var fab = document.getElementById('dshFab');
    if (!fab || !window.MetaStore || typeof window.MetaStore.get !== 'function') return;
    try {
      var raw = window.MetaStore.get('robco_dsh_fab_pos');
      if (!raw) return;
      var pos = JSON.parse(raw);
      if (!pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') return;
      var clamped = _fabClampPosition(pos.left, pos.top, fab);
      fab.style.left = clamped.left + 'px';
      fab.style.top = clamped.top + 'px';
      fab.style.bottom = 'auto';
      fab.style.right = 'auto';
    } catch (_) {
      /* a malformed/missing saved position must never break the bubble */
    }
  }

  // ── FIX 1: sheet drag-to-resize + expand/collapse (owner report — mobile
  // chrome batch) ─────────────────────────────────────────────────────────
  // --dsh-sheet-h (terminal.css) is a viewport-height custom property read
  // by .dsh-drawer; _setSheetVh() is the ONE choke point that writes it, so
  // the drag handle, the keyboard ArrowUp/ArrowDown, and the expand/collapse
  // button can never drift out of sync with each other or with the
  // handle's own aria-valuenow.
  var SHEET_MIN_VH = 30;
  var SHEET_MAX_VH = 92;
  var SHEET_DEFAULT_VH = 50;
  var SHEET_EXPANDED_VH = 85;
  var _sheetDrag = null; // { startY, startVh, handle }

  function _currentSheetVh() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue('--dsh-sheet-h');
    var n = parseFloat(raw);
    return isNaN(n) ? SHEET_DEFAULT_VH : n;
  }

  function _setSheetVh(vh) {
    vh = Math.max(SHEET_MIN_VH, Math.min(SHEET_MAX_VH, vh));
    document.documentElement.style.setProperty('--dsh-sheet-h', vh + 'vh');
    var handle = document.getElementById('dshDragHandle');
    if (handle) handle.setAttribute('aria-valuenow', String(Math.round(vh)));
    var expandBtn = document.getElementById('dshExpandToggle');
    if (expandBtn) {
      var expanded = vh > (SHEET_DEFAULT_VH + SHEET_EXPANDED_VH) / 2;
      expandBtn.setAttribute('aria-pressed', String(expanded));
    }
    return vh;
  }

  function _toggleSheetExpand() {
    var cur = _currentSheetVh();
    var expanded = cur > (SHEET_DEFAULT_VH + SHEET_EXPANDED_VH) / 2;
    _setSheetVh(expanded ? SHEET_DEFAULT_VH : SHEET_EXPANDED_VH);
  }

  function _sheetPointerMove(ev) {
    if (!_sheetDrag) return;
    var dy = _sheetDrag.startY - ev.clientY; // dragging up grows the sheet
    var deltaVh = (dy / window.innerHeight) * 100;
    _setSheetVh(_sheetDrag.startVh + deltaVh);
  }

  function _sheetPointerEnd(ev) {
    if (!_sheetDrag) return;
    var handle = _sheetDrag.handle;
    try {
      handle.releasePointerCapture(ev.pointerId);
    } catch (e) {
      /* already released */
    }
    _sheetDrag = null;
    handle.removeEventListener('pointermove', _sheetPointerMove);
    handle.removeEventListener('pointerup', _sheetPointerEnd);
    handle.removeEventListener('pointercancel', _sheetPointerEnd);
  }

  function _sheetPointerDown(ev) {
    if (ev.button !== 0) return;
    var handle = ev.currentTarget;
    _sheetDrag = { startY: ev.clientY, startVh: _currentSheetVh(), handle: handle };
    try {
      handle.setPointerCapture(ev.pointerId);
    } catch (e) {
      /* unsupported — the expand/collapse button is a full fallback */
    }
    handle.addEventListener('pointermove', _sheetPointerMove);
    handle.addEventListener('pointerup', _sheetPointerEnd);
    handle.addEventListener('pointercancel', _sheetPointerEnd);
  }

  function _sheetKeydown(ev) {
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      _setSheetVh(_currentSheetVh() + 5);
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      _setSheetVh(_currentSheetVh() - 5);
    }
  }

  function _wireSheetResize() {
    var handle = document.getElementById('dshDragHandle');
    if (handle) {
      if (typeof window.PointerEvent !== 'undefined') {
        handle.addEventListener('pointerdown', _sheetPointerDown);
      }
      handle.addEventListener('keydown', _sheetKeydown);
    }
    var expandBtn = document.getElementById('dshExpandToggle');
    if (expandBtn) expandBtn.addEventListener('click', _toggleSheetExpand);
  }

  // Owner report fix: COLD_BOOT/READY/ACTIVE are normal-operation states with no A3
  // ambient observer of their own, so forcing them from here was a dead button (no
  // visible effect). Only the four states that drive a visible A3 ambient experience
  // (idle-phosphor/standby-deepen/shutdown-crt, Suite 150) stay as one-click force
  // buttons — REBOOT and WAKE_TO_ACTIVE (below) replace the normal-op buttons.
  var VISIBLE_EFFECT_STATES = ['IDLE', 'STANDBY', 'SHUTDOWN', 'OFF'];

  function _renderTransitionButtons(panel) {
    var wrap = panel.querySelector('#testConsoleTransitions');
    if (!wrap || !window.AmbientRuntime || !Array.isArray(window.AmbientRuntime.STATES)) return;
    var states = window.AmbientRuntime.STATES.filter(function (s) {
      return VISIBLE_EFFECT_STATES.indexOf(s) !== -1;
    });
    wrap.innerHTML = states
      .map(function (s) {
        var label = escapeHtml(s);
        return (
          '<button type="button" class="btn-sm" data-test-transition="' +
          label +
          '" aria-label="Force Ambient Runtime transition to ' +
          label +
          '">' +
          label +
          '</button>'
        );
      })
      .join('');
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-test-transition]'), function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-test-transition');
        try {
          // The console must be able to force ANY state to exercise the ambient
          // behaviors in each one, so every button routes through the FORCE path
          // (bypasses the LEGAL adjacency map) rather than the validated
          // transition() a real caller would use — this is a debug tool, not a
          // simulation of legal player-driven flow.
          if (typeof window.AmbientRuntime.forceState === 'function') {
            window.AmbientRuntime.forceState(target);
          } else if (typeof window.AmbientRuntime.transition === 'function') {
            window.AmbientRuntime.transition(target);
          }
        } catch (_) {
          /* a forced transition must never break the console */
        }
        _refresh(panel);
      });
    });
  }

  // REBOOT replays the real boot sequence (runBootSequence, ui-audio.js) instead of
  // forcing a state the runtime auto-advances through anyway with no visible effect.
  // The boot screen is only ever hidden via style.display/classList (never removed from
  // the DOM — ui-audio.js), so it must be explicitly reset before re-running the
  // sequence, or it would replay invisibly behind display:none.
  function _rebootFromConsole(panel) {
    try {
      var bootScreen = document.getElementById('bootScreen');
      var bootLines = document.getElementById('bootLines');
      if (bootScreen) {
        bootScreen.style.display = '';
        bootScreen.classList.remove('boot-fade-out', 'boot-degraded');
      }
      if (bootLines) bootLines.innerHTML = '';
      if (typeof window.runBootSequence === 'function') window.runBootSequence();
    } catch (_) {
      /* a console failure must never break boot or leak to production */
    }
    _refresh(panel);
  }

  // WAKE -> ACTIVE is the one-click undo for the IDLE/STANDBY/SHUTDOWN/OFF force
  // buttons above, so a tester is never stuck in a dimmed/shutdown visual state without
  // reloading the page. Reuses the same forceState() path (Protocol 22), never a forked
  // transition mechanism.
  function _wakeToActive(panel) {
    try {
      if (window.AmbientRuntime && typeof window.AmbientRuntime.forceState === 'function') {
        window.AmbientRuntime.forceState('ACTIVE');
      }
    } catch (_) {
      /* a forced transition must never break the console */
    }
    _refresh(panel);
  }

  function _wireResetControls(panel) {
    var wrap = panel.querySelector('#testConsoleTransitions');
    if (!wrap) return;
    var reboot = document.createElement('button');
    reboot.type = 'button';
    reboot.className = 'btn-sm';
    reboot.setAttribute('data-test-reboot', '1');
    reboot.setAttribute('aria-label', 'Replay the boot sequence');
    reboot.textContent = 'REBOOT';
    reboot.addEventListener('click', function () {
      _rebootFromConsole(panel);
    });
    wrap.appendChild(reboot);

    var wake = document.createElement('button');
    wake.type = 'button';
    wake.className = 'btn-sm';
    wake.setAttribute('data-test-wake', '1');
    wake.setAttribute('aria-label', 'Force Ambient Runtime back to ACTIVE');
    wake.textContent = 'WAKE → ACTIVE';
    wake.addEventListener('click', function () {
      _wakeToActive(panel);
    });
    wrap.appendChild(wake);
  }

  // Owner report: the Module Bay's first-visit hatch ceremony (robco_bay_opened,
  // ui-core.js) can only ever be SEEN once per device — there is no in-app way to
  // re-trigger it for testing. REPLAY HATCH resets that device pref and puts the
  // #bayHatch overlay itself back into its closed, pre-ceremony state so the next
  // look at Security & Config replays it, without a page reload. Dev/staging-console
  // only (Protocol 22 — reuses the exact same MetaStore key releaseBayHatch() sets,
  // never a parallel flag); never touches campaign state. U1: this is the console's
  // one pre-existing destructive-leaning control, so it is now tier:'staging' and
  // destructive:true in the registry — DIAGNOSTIC_SHELL_TOOLS['replay-hatch'] — and
  // fires through _invoke() so a confirm gate can never be skipped.
  function _replayHatch() {
    try {
      if (window.MetaStore && typeof window.MetaStore.remove === 'function') {
        window.MetaStore.remove('robco_bay_opened');
      }
      var hatch = document.getElementById('bayHatch');
      if (hatch) {
        hatch.classList.remove('bay-hatch--open');
        hatch.hidden = false;
      }
    } catch (_) {
      /* a console failure must never break boot or leak to production */
    }
  }

  // ── U3: TRIGGERS CATALOG (planning/DIAGNOSTIC_SHELL_PLAN.md §4/§11 U3) ────
  // Every helper below fires the REAL shipped entry point (Protocol 22) — a
  // genuine RobcoEvents.emit() with the exact payload shape the real call
  // sites use, the real setOverseerState()/_coreFlare()/_coreStatBurst(), the
  // real runBootSequence() (via window.__robcoBootFlavor), or the real
  // ceremony/motion function — never a fabricated parallel animation. This
  // is what makes Protocol 44's cross-reference guard meaningful: a trigger
  // that faked its own animation would prove nothing about the shipped code.
  //
  // PROTOCOL 42 FINDING (Protocol 8 Sonnet-stage plan review): the plan's own
  // premise — "the durable state write always happens at the CALL SITE
  // before the emit; the subscriber is display-only, so emitting the event
  // from the shell fires ONLY the animation" — does NOT hold for seven bus
  // events. state.js's U8 auto-log subscribers (RobcoEvents.on('level.up',
  // ...), collectible.acquired, craft.completed, craft.scrapped,
  // trade.bought, trade.sold, sleep.completed) call the U8 auto-log handler, which
  // pushes a real entry into the campaign event log — a genuine, durable campaign-
  // save write — every time the event fires, REGARDLESS of source. Firing
  // one of these from the console would therefore write to the campaign
  // event log, directly violating this file's own pre-existing Hard Boundary
  // invariant ("never reads or writes the campaign save, stats, or event
  // log" — see the file header). Confirmed by reading every subscriber body
  // for all ~23 bus events (Protocol 27 — not assumed from the plan's
  // general premise). These seven are therefore tier:'staging' +
  // destructive:true below (auto-confirm-gated, like every other
  // state-mutating tool) rather than tier:'prod' as the plan's own tool
  // table lists them — a deliberate, documented correction. Every other bus
  // event's subscribers were confirmed presentation-only (DOM class toggles
  // / transient annunciator pushes / sound / haptic / the transient
  // _pendingXxx vars) and stay tier:'prod'.
  function _fireAnimEvent(name, payload) {
    if (window.RobcoEvents && typeof window.RobcoEvents.emit === 'function') {
      window.RobcoEvents.emit(name, payload);
    }
  }
  // faction.threshold and location.*/collectible.acquired need a REAL
  // registry-driven target (Protocol 38 — never a hardcoded game literal),
  // resolved at fire-time rather than baked into a static payload object.
  function _fireFactionThreshold() {
    var registry = typeof getFactionRegistry === 'function' ? getFactionRegistry() : [];
    if (!registry.length) return;
    var f = registry[0];
    _fireAnimEvent('faction.threshold', {
      key: f.key,
      name: f.name,
      direction: 'idolized',
      curNet: 100,
      prevNet: 50,
    });
  }
  function _fireLocationVisited() {
    var zones = (typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.zones) || [];
    var loc =
      (typeof state !== 'undefined' && state.loc) || (zones[0] && zones[0].name) || 'Unknown';
    _fireAnimEvent('location.visited', { loc: loc });
  }
  function _fireLocationCurrent() {
    var loc = (typeof state !== 'undefined' && state.loc) || 'Unknown';
    _fireAnimEvent('location.current', { loc: loc });
  }
  function _fireCollectibleAcquired() {
    var cs = (typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.collectibles) || [];
    var name = (cs[0] && cs[0].name) || 'Sample Collectible';
    _fireAnimEvent('collectible.acquired', { name: name });
  }
  function _fireLevelUp() {
    var lvl = (typeof state !== 'undefined' && state.lvl) || 1;
    _fireAnimEvent('level.up', { oldLvl: lvl, newLvl: lvl + 1 });
  }

  // ── Pending-var animations (planning §1.4/§4) — set the transient
  // module-scope var (never state.*, the established sanctioned pattern —
  // "a transient module var, never state.*" per every _pendingXxx site) then
  // call the owning render*() so it consumes it exactly once, mirroring how
  // the real feature sets it. Guards for "no campaign data of that kind yet"
  // by simply no-op'ing (the underlying render*() already handles an empty
  // list gracefully — no separate guard needed here, planning §10). Reads
  // _facChannel/_mapActiveZone/_pendingXxx as bare identifiers — they are
  // `let` bindings at the top level of ui-render.js/state.js, which (unlike
  // `window.X`) are still reachable from this file's shared classic-script
  // global scope, exactly like the state inspector's direct `state` read.
  function _firePendingRepStamp() {
    var registry = typeof getFactionRegistry === 'function' ? getFactionRegistry() : [];
    if (!registry.length) return;
    var key =
      typeof _facChannel !== 'undefined' && _facChannel && registry.some(f => f.key === _facChannel)
        ? _facChannel
        : registry[0].key;
    if (typeof setFactionChannel === 'function') setFactionChannel(key);
    _pendingRepStamp = { key: key, direction: 'idolized' };
    if (typeof renderFactionRep === 'function') renderFactionRep();
  }
  function _firePendingQuestStamp() {
    var qs = (typeof state !== 'undefined' && state.quests) || [];
    if (!qs.length) return;
    _pendingQuestStamp = { name: qs[0].name, status: 'complete' };
    if (typeof renderQuests === 'function') renderQuests();
  }
  function _firePendingQuestFiled() {
    var qs = (typeof state !== 'undefined' && state.quests) || [];
    if (!qs.length) return;
    _pendingQuestFiled = qs[0].name;
    if (typeof renderQuests === 'function') renderQuests();
  }
  function _firePendingExhibitLight() {
    var cs = (typeof state !== 'undefined' && state.collectibles) || [];
    if (!cs.length) return;
    _pendingExhibitLight.push(cs[0]);
    if (typeof renderCollectibles === 'function') renderCollectibles();
  }
  // Planning §12 risk item: survey ping only paints on the WORLD GRID view,
  // not the zoomed sector sheet — the trigger resets _mapActiveZone first.
  function _firePendingSurveyPing() {
    if (typeof _mapActiveZone !== 'undefined') _mapActiveZone = null;
    var zones = (typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.zones) || [];
    var loc = (typeof state !== 'undefined' && state.loc) || (zones[0] && zones[0].name);
    if (!loc) return;
    _pendingSurveyPing = loc;
    if (typeof renderWorldMap === 'function') renderWorldMap();
  }
  function _firePendingPerkSeat() {
    var pk = (typeof state !== 'undefined' && state.perks) || [];
    if (!pk.length) return;
    _pendingPerkSeat = pk[0].name;
    if (typeof renderPerks === 'function') renderPerks();
  }
  function _firePendingEffectWarmup() {
    var st = (typeof state !== 'undefined' && state.status) || [];
    if (!st.length) return;
    _pendingEffectWarmup.push(st[0].name);
    if (typeof renderStatus === 'function') renderStatus();
  }

  // ── Living core / boot flavor / ceremonies (planning §1.4/§4) ────────────
  function _fireBootFlavor(flavor) {
    window.__robcoBootFlavor = flavor;
    _rebootFromConsole(document.getElementById('testConsolePanel'));
  }
  function _replayIgnition() {
    if (typeof window._runCampaignIgnition === 'function') {
      window._runCampaignIgnition(function () {});
    }
  }
  // Resets the transient SESSION flag only (ui-core.js `let _overseerGreeted`)
  // — never MetaStore — so this is a replay, not a flag reset (planning §4).
  function _replayGreet() {
    _overseerGreeted = false;
    if (typeof window._maybeGreetOverseer === 'function') window._maybeGreetOverseer();
  }
  // Calls the flourish DIRECTLY — never _checkFirmwareFlash(), which reads
  // AND WRITES the real robco_last_seen_version MetaStore flag (planning §4:
  // "no version-flag mutation").
  function _replayFirmware() {
    if (typeof window._fireFirmwareFlashFlourish === 'function') {
      window._fireFirmwareFlashFlourish();
    }
  }
  // _checkLongAbsence() (ui-audio.js) is a pure read — it never writes
  // MetaStore — but its result depends on genuine elapsed wall-clock time
  // since the last flush, so a live replay can't just call it again. Instead
  // this temporarily substitutes a synthetic idle-day count for exactly one
  // runBootSequence() call (restoring the real function immediately after,
  // in the SAME tick the boot completes or throws) — reusing the real
  // runBootSequence()/POST-line-splice code path (Protocol 22) rather than
  // duplicating its line text, and never touching robco_overseer_log's
  // lastFlushAt or any other persisted flag. Note: like the pre-existing
  // REBOOT control, this necessarily also re-runs _checkFirmwareFlash()
  // internally (runBootSequence()'s own unconditional call) — an existing
  // REBOOT/boot-flavor characteristic, not a new one this trigger introduces.
  function _replayAbsence() {
    if (
      typeof window._checkLongAbsence !== 'function' ||
      typeof window.runBootSequence !== 'function'
    )
      return;
    var orig = window._checkLongAbsence;
    var restore = function () {
      window._checkLongAbsence = orig;
    };
    window._checkLongAbsence = function () {
      return 5;
    };
    try {
      var panel = document.getElementById('testConsolePanel');
      var bootScreen = document.getElementById('bootScreen');
      var bootLines = document.getElementById('bootLines');
      if (bootScreen) {
        bootScreen.style.display = '';
        bootScreen.classList.remove('boot-fade-out', 'boot-degraded');
      }
      if (bootLines) bootLines.innerHTML = '';
      window.runBootSequence(function () {
        restore();
        _refresh(panel);
      });
    } catch (_) {
      restore();
    }
  }
  function _replaySeat() {
    var el = document.querySelector('#testConsolePanel .dsh-drawer-icon');
    if (typeof window._motionSeat === 'function') window._motionSeat(el);
  }
  // Direct class toggle — the SAME body.time-night class updateMath() (Day/
  // Night Indicator, #12) drives off state.ticks every tick; never writes
  // state.ticks itself, so the next real updateMath() tick naturally
  // corrects it back to the genuine in-game time (a preview, not a durable
  // override) — planning §12's day/night risk item, resolved by reusing the
  // real CSS hook rather than inventing a new persistent field.
  function _toggleDayNight() {
    document.body.classList.toggle('time-night');
  }

  function _toolById(id) {
    for (var i = 0; i < DIAGNOSTIC_SHELL_TOOLS.length; i++) {
      if (DIAGNOSTIC_SHELL_TOOLS[i].id === id) return DIAGNOSTIC_SHELL_TOOLS[i];
    }
    return null;
  }

  function _wireReplayHatch(panel) {
    var btn = panel.querySelector('#testConsoleReplayHatch');
    if (!btn) return;
    var tool = _toolById('replay-hatch');
    btn.addEventListener('click', function () {
      if (tool) {
        _invoke(tool);
      } else {
        _replayHatch(); // fail-safe: registry entry missing, still never skip the action
      }
    });
  }

  // Visual Upload OCR Unit-1 infra proof (planning/VISUAL_UPLOAD_OCR_PLAN.md
  // Sec7 Stage 1): a thin wiring layer only -- the actual OCR pipeline
  // (lazy Tesseract.js load, canvas preprocessing, worker.recognize) lives in
  // js/ocr.js (Protocol 23 layering). Writes NOTHING durable to the campaign;
  // dumps the raw recognized text into #ocrTestOutput for a live proof.
  function _wireOcrTest(panel) {
    var input = panel.querySelector('#ocrTestInput');
    var btn = panel.querySelector('#ocrTestScanBtn');
    var status = panel.querySelector('#ocrTestStatus');
    var output = panel.querySelector('#ocrTestOutput');
    if (!input || !btn || !status || !output) return;
    btn.addEventListener('click', function () {
      var file = input.files && input.files[0];
      if (!file) {
        status.textContent = 'SELECT AN IMAGE FIRST';
        return;
      }
      if (typeof window.runVisualOcrTest !== 'function') {
        status.textContent = 'OCR MODULE NOT LOADED (js/ocr.js)';
        return;
      }
      btn.disabled = true;
      output.textContent = '';
      window
        .runVisualOcrTest(file, function (msg) {
          status.textContent = msg;
        })
        .then(function (text) {
          status.textContent = 'DONE';
          output.textContent = text && text.trim() ? text : '[NO TEXT DETECTED]';
        })
        .catch(function (err) {
          status.textContent = 'FAILED: ' + (err && err.message ? err.message : 'unknown error');
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  // Visual Upload OCR Unit 2 (planning/VISUAL_UPLOAD_OCR_PLAN.md §3): the full
  // OCR -> deterministic parser -> preview/confirm modal -> additive apply
  // pipeline. This wiring itself writes NOTHING durable -- it only invokes
  // window.runVisualOcr() (js/ocr.js), which opens the real preview/confirm
  // modal (renderVisualParsePreview, js/ui-render.js); every campaign write
  // happens only if/when the player taps CONFIRM & APPLY inside that modal.
  function _wireVisualParseTest(panel) {
    var input = panel.querySelector('#visualParseTestInput');
    var btn = panel.querySelector('#visualParseTestBtn');
    var status = panel.querySelector('#visualParseTestStatus');
    if (!input || !btn || !status) return;
    btn.addEventListener('click', function () {
      var file = input.files && input.files[0];
      if (!file) {
        status.textContent = 'SELECT AN IMAGE FIRST';
        return;
      }
      if (typeof window.runVisualOcr !== 'function') {
        status.textContent = 'OCR MODULE NOT LOADED (js/ocr.js)';
        return;
      }
      btn.disabled = true;
      window
        .runVisualOcr(file, function (msg) {
          status.textContent = msg;
        })
        .catch(function (err) {
          status.textContent = 'FAILED: ' + (err && err.message ? err.message : 'unknown error');
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  function _wireImmersionSelect(panel) {
    var sel = panel.querySelector('#testConsoleImmersionSelect');
    if (!sel) return;
    try {
      if (typeof window.getImmersionTier === 'function') sel.value = window.getImmersionTier();
    } catch (_) {
      /* leave the default option selected */
    }
    sel.addEventListener('change', function () {
      try {
        // Reuses the real dial's own setter (Protocol 22) — a MetaStore device
        // pref write, never a campaign write.
        if (typeof window.onImmersionChange === 'function') window.onImmersionChange(sel.value);
        var real = document.getElementById('immersionSelect');
        if (real) real.value = sel.value; // keep the real Security & Config dial in sync
      } catch (_) {
        /* device-pref write only -- never throw into the console */
      }
    });
  }

  // ── U4a: INSPECT BUILD-OUT (planning/DIAGNOSTIC_SHELL_PLAN.md §3.1/§11 U4)
  // A read-only "system diagnostics" readout — the owner directive is that
  // this NEVER renders a raw JSON blob, in staging OR prod. Every builder
  // below returns already-escaped, labeled HTML lines built from
  // _chassisIdRow()/_chassisBreaker() (js/ui-core.js, the CHASSIS SYSTEM
  // STATUS board's own readable-row helpers — reused verbatim, Protocol 22,
  // never a second raw-dump renderer) — never JSON.stringify. Every function
  // here only READS state/globals; none of them ever write.
  var _INSPECT_FLAG_KEYS = [
    'cloudSync',
    'googleSignIn',
    'aiChat',
    'keySync',
    'saveMigration',
    'offlineQueue',
    'visualOcr',
    'visualAiVision',
  ];
  function _inspectRow(label, val) {
    if (typeof _chassisIdRow === 'function') return _chassisIdRow(label, val);
    // Fail-safe fallback (should never trigger — _chassisIdRow ships in
    // ui-core.js, always loaded before this file — Protocol 22 reuse is the
    // real path): a labeled line in the SAME .dsh-inspect-line style.
    return (
      '<div class="dsh-inspect-line"><b>' +
      escapeHtml(label) +
      '</b><span>' +
      escapeHtml(val === undefined || val === null ? '—' : String(val)) +
      '</span></div>'
    );
  }
  function _inspectVitalsHtml() {
    try {
      if (typeof state === 'undefined' || !state) return '<div>NO CAMPAIGN LOADED</div>';
      var gameLabel = 'UNKNOWN';
      if (typeof GAME_DEFS !== 'undefined' && typeof getGameContext === 'function') {
        var def = GAME_DEFS[getGameContext()];
        if (def && def.label) gameLabel = def.label;
      }
      var activeDirectives = Array.isArray(state.quests)
        ? state.quests.filter(function (q) {
            return String((q && q.status) || 'active').toLowerCase() === 'active';
          }).length
        : 0;
      return (
        _inspectRow('GAME', gameLabel) +
        _inspectRow('LEVEL', state.lvl) +
        _inspectRow('XP', state.xp) +
        _inspectRow('HP', String(state.hpCur) + ' / ' + String(state.hpMax)) +
        _inspectRow('LOCATION', state.loc || 'UNKNOWN') +
        _inspectRow('CAPS', state.caps) +
        _inspectRow('KARMA', state.karma) +
        _inspectRow('ACTIVE DIRECTIVES', activeDirectives)
      );
    } catch (_) {
      return '<div>UNAVAILABLE</div>';
    }
  }
  function _inspectConnectionHtml() {
    try {
      var carrier = typeof window._isUplinkConnected === 'function' && window._isUplinkConnected();
      var aiOn =
        typeof window.isFeatureEnabled !== 'function' ||
        window.isFeatureEnabled('aiChat') !== false;
      var online = typeof navigator === 'undefined' || navigator.onLine !== false;
      return (
        (typeof _chassisBreaker === 'function'
          ? _chassisBreaker('CARRIER', carrier, true, 'CONNECTED', 'OFFLINE')
          : _inspectRow('CARRIER', carrier ? 'CONNECTED' : 'OFFLINE')) +
        _inspectRow('AI CHAT', aiOn ? 'ENABLED' : 'DISABLED') +
        _inspectRow('NETWORK', online ? 'ONLINE' : 'OFFLINE')
      );
    } catch (_) {
      return '<div>UNAVAILABLE</div>';
    }
  }
  function _inspectFlagsHtml() {
    try {
      if (typeof window.isFeatureEnabled !== 'function')
        return '<div>FLAG SYSTEM UNAVAILABLE</div>';
      return _INSPECT_FLAG_KEYS
        .map(function (k) {
          var on = window.isFeatureEnabled(k) !== false;
          return typeof _chassisBreaker === 'function'
            ? _chassisBreaker(k.toUpperCase(), on, false, 'ENABLED', 'DISABLED')
            : _inspectRow(k, on ? 'ENABLED' : 'DISABLED');
        })
        .join('');
    } catch (_) {
      return '<div>UNAVAILABLE</div>';
    }
  }
  // Staging-only: readable readout of the LOCAL last-known-good feature-flag
  // cache — reports PRESENCE + a count, never dumps the raw cached object.
  function _inspectFlagsInternalHtml() {
    try {
      var raw =
        window.MetaStore && typeof window.MetaStore.get === 'function'
          ? window.MetaStore.get('robco_feature_flags')
          : null;
      var count = 0;
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          count = parsed && typeof parsed === 'object' ? Object.keys(parsed).length : 0;
        } catch (_) {
          /* malformed cache — count stays 0, presence still reported */
        }
      }
      return (
        _inspectRow('LOCAL LKG CACHE', raw ? 'PRESENT' : 'ABSENT') +
        _inspectRow('CACHED FLAG COUNT', count)
      );
    } catch (_) {
      return '<div>UNAVAILABLE</div>';
    }
  }
  // Async readouts (Cache Storage / Service Worker registration) — resolved
  // once at mount + once per drawer open (never on the 500ms tick, since
  // this data rarely changes mid-session — see _wireLiveRefresh()).
  function _updateInspectAsync(panel) {
    if (!panel) return;
    var deviceEl = panel.querySelector('#dshInspectDevice');
    if (deviceEl) {
      var appVersionLine = _inspectRow('APP VERSION', window.APP_VERSION || 'UNKNOWN');
      if (typeof _readActiveCacheName === 'function') {
        _readActiveCacheName(function (cacheName) {
          deviceEl.innerHTML =
            appVersionLine + _inspectRow('CACHE REVISION', cacheName || 'NONE ACTIVE');
        });
      } else {
        deviceEl.innerHTML = appVersionLine + _inspectRow('CACHE REVISION', 'UNSUPPORTED');
      }
    }
    var swEl = panel.querySelector('#dshInspectSwInternal');
    if (
      swEl &&
      typeof navigator !== 'undefined' &&
      navigator.serviceWorker &&
      typeof navigator.serviceWorker.getRegistration === 'function'
    ) {
      navigator.serviceWorker
        .getRegistration()
        .then(function (reg) {
          swEl.innerHTML = reg
            ? _inspectRow('REGISTRATION', 'PRESENT') +
              _inspectRow('SCOPE', reg.scope || '—') +
              _inspectRow('ACTIVE WORKER', reg.active ? 'YES' : 'NO') +
              _inspectRow('WAITING WORKER', reg.waiting ? 'YES' : 'NO') +
              _inspectRow('INSTALLING WORKER', reg.installing ? 'YES' : 'NO')
            : _inspectRow('REGISTRATION', 'ABSENT');
        })
        .catch(function () {
          swEl.innerHTML = _inspectRow('REGISTRATION', 'UNAVAILABLE');
        });
    } else if (swEl) {
      swEl.innerHTML = _inspectRow('SERVICE WORKER', 'UNSUPPORTED');
    }
  }
  // Synchronous INSPECT readouts — folded into the existing 500ms live-
  // refresh tick (_refresh(), below) alongside RUNTIME STATE/OBSERVERS
  // rather than a second competing timer (Protocol 22).
  function _wireInspectRefresh(panel) {
    var vitalsEl = panel.querySelector('#dshInspectVitals');
    if (vitalsEl) vitalsEl.innerHTML = _inspectVitalsHtml();
    var connEl = panel.querySelector('#dshInspectConnection');
    if (connEl) connEl.innerHTML = _inspectConnectionHtml();
    var flagsEl = panel.querySelector('#dshInspectFlags');
    if (flagsEl) flagsEl.innerHTML = _inspectFlagsHtml();
    var flagsIntEl = panel.querySelector('#dshInspectFlagsInternal');
    if (flagsIntEl) flagsIntEl.innerHTML = _inspectFlagsInternalHtml();
  }
  // COPY DIAGNOSTICS — copies the READABLE rendered INSPECT text (the actual
  // DOM textContent already built by the functions above), never a
  // JSON.stringify of state/config. Read-only: nothing here writes.
  function _copyDiagnostics(panel, statusEl) {
    try {
      var section = panel.querySelector('[data-sub-id="dsh_inspect"]');
      var text = section ? section.textContent.replace(/[ \t]+\n/g, '\n').trim() : '';
      if (
        text &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        navigator.clipboard.writeText(text);
        if (statusEl) statusEl.textContent = 'COPIED';
      } else if (statusEl) {
        statusEl.textContent = 'CLIPBOARD UNAVAILABLE';
      }
    } catch (_) {
      if (statusEl) statusEl.textContent = 'COPY FAILED';
    }
  }
  function _wireInspectCopy(panel) {
    var btn = panel.querySelector('#dshInspectCopyBtn');
    if (!btn) return;
    var statusEl = panel.querySelector('#dshInspectCopyStatus');
    btn.addEventListener('click', function () {
      _copyDiagnostics(panel, statusEl);
    });
  }

  function _refresh(panel) {
    try {
      _wireInspectRefresh(panel);
      var stateEl = panel.querySelector('#testConsoleState');
      if (
        stateEl &&
        window.AmbientRuntime &&
        typeof window.AmbientRuntime.getState === 'function'
      ) {
        stateEl.textContent = window.AmbientRuntime.getState();
      }
      var obsEl = panel.querySelector('#testConsoleObservers');
      if (
        obsEl &&
        window.AmbientRuntime &&
        typeof window.AmbientRuntime.listObservers === 'function'
      ) {
        var list = window.AmbientRuntime.listObservers();
        obsEl.innerHTML = list.length
          ? list
              .map(function (o) {
                return (
                  '<div class="tracker-row"><span>' +
                  escapeHtml(o.id) +
                  '</span><span>&nbsp;' +
                  escapeHtml(o.states.join('/')) +
                  ' &middot; ' +
                  escapeHtml(o.tier) +
                  ' &middot; ' +
                  escapeHtml(String(o.cadenceMs)) +
                  'ms</span></div>'
                );
              })
              .join('')
          : '<div>NO OBSERVERS REGISTERED</div>';
      }
    } catch (_) {
      /* a console refresh failure must never break the runtime or boot */
    }
  }

  // The console's own live-updating readout is itself an Ambient Runtime
  // observer (Protocol 22 — "one heartbeat, many observers") rather than a
  // second, competing setInterval. tier 'minimal' so it is never muted by the
  // dial (a dev tool, not atmosphere); states = every state, so transitions
  // into IDLE/STANDBY/SHUTDOWN are visible as they happen.
  function _wireLiveRefresh(panel) {
    if (_refreshUnregister) return; // idempotent — initTestConsole only mounts once
    if (!window.AmbientRuntime || typeof window.AmbientRuntime.register !== 'function') return;
    _refreshUnregister = window.AmbientRuntime.register({
      id: 'test-console-refresh',
      cadenceMs: 500,
      states: (window.AmbientRuntime.STATES || []).slice(),
      tier: 'minimal',
      onTick: function () {
        _refresh(panel);
      },
    });
  }

  // initTestConsole — the named window.onload boot phase (called from ui-core.js).
  // Does ABSOLUTELY NOTHING unless _devConsoleUnlocked() returns true. Wrapped
  // so a console failure can never break boot.
  function initTestConsole() {
    try {
      if (!_devConsoleUnlocked()) return; // production default — the console never mounts
      var panel = _mountConsole();
      if (!panel) return;
      _renderTransitionButtons(panel);
      _wireResetControls(panel);
      _wireReplayHatch(panel);
      _wireOcrTest(panel);
      _wireVisualParseTest(panel);
      _wireImmersionSelect(panel);
      _wireInspectCopy(panel);
      _wireSearch(panel);
      _wireShellToggle();
      _wireFabDrag();
      _restoreFabPosition();
      _wireSheetResize();
      _wireLiveRefresh(panel);
      _refresh(panel);
      _updateInspectAsync(panel);
    } catch (_) {
      /* fail-safe: a console failure can never break boot or leak to production */
    }
  }
  window.initTestConsole = initTestConsole;
})();
