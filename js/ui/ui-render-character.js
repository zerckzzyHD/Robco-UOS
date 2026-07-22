// ── ui-render-character.js — CHARACTER & FIELD STATUS (split from ui-render.js, 2.8.5 U-A4) ──
// The squad roster (renderSquad/addSquadMember/adjustAffinity), the in-game
// clock/calendar (formatGameTime/getGameDate/calendarToTicks), the
// faction-standing lookup (FACTION_THRESHOLDS/getFactionStanding — shared by
// the Faction Reputation and Campaign Chronicle panels in their own sibling
// files), active status effects (renderStatus/addStatusEffect), the PERK
// loadout rack (renderPerks/addPerk), and the quest DIRECTIVE registry
// (renderQuests/cycleQuestStatus). Global scope, static <script> tag — see
// index.html load order.
//
// GOTCHA (2.8.5 U-A4 split audit — planning/AUDIT_U7_ui-render-split.md): this
// is the largest and least cohesive sibling in the ui-render-*.js family — it
// groups six otherwise-unrelated subsystems under one CHARACTER & FIELD
// STATUS banner. The clock/calendar and faction-standing-lookup code in
// particular ended up here not because either belongs to "character" but
// because nothing else in the U-A4 split claimed them cleanly: the calendar
// helpers are pure utilities with no natural panel owner, and
// getFactionStanding() is consumed by both the Faction Reputation panel
// (ui-render-factions.js) and the Campaign Chronicle panel
// (ui-render-ledger.js), so it lives in neither and sits here instead.
// Splitting this file further is explicitly out of scope for a
// readability-only pass — this note documents the grouping, it doesn't fix it.

// \u2500\u2500 SQUAD ROSTER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Phase 3 \u00b7 Piece 2 (SQUAD ROSTER, BUS-14): registry-driven ENLIST options,
// replacing the hardcoded 8-FNV-companion <select> (a Protocol 38 game-literal
// bug \u2014 FO3 campaigns previously showed FNV companion names). Reads the SAME
// FALLOUT_REGISTRY the active game boot already swapped in (Protocol 22,
// mirrors renderCollectibles()'s FALLOUT_REGISTRY.collectibles pattern) \u2014
// already-enlisted companions are filtered out of the picker.
function _populateSquadEnlistOptions() {
  const sel = document.getElementById('newSquadName');
  if (!sel) return;
  const companions =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.companions)
      ? FALLOUT_REGISTRY.companions
      : [];
  const enlisted = new Set((state.squad || []).map(m => m.name.toLowerCase()));
  sel.innerHTML =
    '<option disabled selected value="">SELECT COMPANION\u2026</option>' +
    companions
      .filter(c => !enlisted.has(c.name.toLowerCase()))
      .map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`)
      .join('');
}

function renderSquad() {
  const squadDiv = document.getElementById('squadList');
  if (!squadDiv) return;
  _populateSquadEnlistOptions();
  const status = document.getElementById('opsSquadStatus');
  if (!state.squad || state.squad.length === 0) {
    squadDiv.innerHTML = emptyState('NO ACTIVE COMPANIONS');
    if (status) status.textContent = 'NO ACTIVE COMPANIONS';
    return;
  }
  if (status) {
    const affs = state.squad.map(m => Math.min(100, Math.max(0, parseInt(m.affinity) || 0)));
    const avg = Math.round(affs.reduce((a, b) => a + b, 0) / affs.length);
    status.textContent = state.squad.length + ' ACTIVE \u00b7 AVG AFFINITY ' + avg + '%';
  }
  squadDiv.innerHTML = state.squad
    .map((member, i) => {
      const hpRatio = member.hp / (member.hpMax || 100);
      const pBars = Math.max(0, Math.min(100, Math.round(hpRatio * 100)));
      // #11 Companion Affinity \u2014 U10: always rendered with native [+]/[-] nudge
      // buttons (previously AI-write-only via autoImportState; the affinity bar
      // stayed invisible until the AI happened to set it, with no player-facing
      // way to ever initialize it). Missing affinity defaults to 0, same fallback
      // adjustAffinity() uses.
      const aff = Math.min(100, Math.max(0, parseInt(member.affinity) || 0));
      return (
        `<div class="sq-card">` +
        `<div class="sq-head"><span class="sq-name">${escapeHtml(member.name)}</span>` +
        `<button class="delete-btn" aria-label="Dismiss ${escapeHtml(member.name)}" onclick="removeSquadMember(${i})">\u2715 DISMISS</button></div>` +
        `<div class="sq-bar"><i style="width:${pBars}%"></i></div>` +
        `<div class="sq-stats"><span>HP ${parseInt(member.hp) || 0}/${parseInt(member.hpMax) || 0}</span>` +
        `<span>AMMO ${parseInt(member.ammo) || 0}</span>` +
        `<span>CND ${escapeHtml(String(member.condition))}</span>` +
        (member.weapon
          ? `<span>WPN: ${escapeHtml(member.weapon)}${member.dt !== undefined ? ' \u00b7 DT ' + (parseInt(member.dt) || 0) : ''}</span>`
          : '') +
        `</div>` +
        `<div class="aff-row"><span class="a-cap">AFFINITY ${aff}%</span>` +
        `<span class="aff-meter"><i style="width:${aff}%"></i></span>` +
        `<button aria-label="Lower ${escapeHtml(member.name)} affinity" onclick="adjustAffinity(${i},-5)">\u2212</button>` +
        `<button aria-label="Raise ${escapeHtml(member.name)} affinity" onclick="adjustAffinity(${i},5)">+</button></div>` +
        `</div>`
      );
    })
    .join('');
}

function removeSquadMember(idx) {
  if (state.squad && state.squad.length > idx) {
    state.squad.splice(idx, 1);
    renderSquad();
    updateMath();
  }
}

// U10 (FP-AI-5/FP-FEAT-3): native affinity control \u2014 companion affinity was
// previously AI-write-only (autoImportState, api-import.js). Nudges by delta, clamped
// 0-100, defaulting an unset member.affinity to 0 (mirrors the render fallback).
function adjustAffinity(idx, delta) {
  if (!state.squad || !state.squad[idx]) return;
  const cur = Math.max(0, Math.min(100, parseInt(state.squad[idx].affinity) || 0));
  state.squad[idx].affinity = Math.max(0, Math.min(100, cur + delta));
  saveState();
  renderSquad();
}

function addSquadMember() {
  const nameInput = document.getElementById('newSquadName');
  if (!nameInput || !nameInput.value.trim()) return;
  if (!state.squad) state.squad = [];

  const name = nameInput.value.trim();
  const existing = state.squad.find(m => m.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    nameInput.value = '';
    return;
  }

  state.squad.push({
    name: name,
    hp: 100,
    hpMax: 100,
    weapon: 'Unarmed',
    ammo: 0,
    condition: 'OK',
    affinity: 0,
  });

  nameInput.value = '';
  renderSquad();
  updateMath();
}

// ── TIME SYSTEM ───────────────────────────────────────────────────
// Internal representation: ticks (integer). 240 ticks = 1 in-game day.
// 1 tick = 6 minutes. 10 ticks = 1 hour.
//
// formatGameTime(t)   → Fallout-style 'Wednesday, 10.23.81, 1:40 AM' (display)
// getGameDate()       → 'OCT 19, 2281' (calendar date only)
// calendarToTicks()   → inverse: calendar date/time → ticks (time input handler)
//
// Design: All display-facing code uses formatGameTime(). Internal logic and
// save/persistence remain tick-based. Shared by FNV and FO3 via gameContext.

// ── CALENDAR DATE (G7) ────────────────────────────────────────────
// Computes the absolute in-universe calendar from ticks + gameContext.
// FNV starting date: October 19, 2281. FO3 starting date: August 17, 2277.
//
// Returns a structured object so all downstream formatters share one source:
//   { month, day, year, weekday, hour, minute } — all integers + strings.
function _resolveGameDateTime(ticks) {
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const cal = _activeDef().calendar;
  const startMonth = cal.startMonth;
  const startDay = cal.startDay;
  const startYear = cal.startYear;
  const epochWeekday = cal.epochWeekday;

  const t = ticks || 0;
  const dayOffset = Math.floor(t / 240); // whole days elapsed
  const hr = Math.floor((t % 240) / 10);
  const mn = (t % 10) * 6;

  let month = startMonth;
  let day = startDay + dayOffset;
  let year = startYear;

  // Roll calendar forward
  while (day > MONTH_DAYS[month]) {
    day -= MONTH_DAYS[month];
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  const weekday = (epochWeekday + dayOffset) % 7;

  return { month, day, year, weekday, hour: hr, minute: mn };
}

// Formats ticks as Fallout-style: 'Wednesday, 10.23.81, 1:40 AM'
// Used for all player-visible time displays.
function formatGameTime(t) {
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dt = _resolveGameDateTime(t);

  // Date: MM.DD.YY (Fallout UI convention — 2-digit year)
  const mm = String(dt.month + 1).padStart(2, '0');
  const dd = String(dt.day).padStart(2, '0');
  const yy = String(dt.year).slice(-2);
  const dateStr = `${mm}.${dd}.${yy}`;

  // Time: 12-hour with AM/PM
  const ampm = dt.hour < 12 ? 'AM' : 'PM';
  const h12 = dt.hour % 12 || 12;
  const timeStr = `${h12}:${String(dt.minute).padStart(2, '0')} ${ampm}`;

  return `${WEEKDAYS[dt.weekday]}, ${dateStr}, ${timeStr}`;
}

// Returns calendar date only as 'OCT 19, 2281' — used by gameDateDisplay.
function getGameDate() {
  const MONTHS = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const dt = _resolveGameDateTime((typeof state !== 'undefined' && state.ticks) || 0);
  return `${MONTHS[dt.month]} ${String(dt.day).padStart(2, '0')}, ${dt.year}`;
}

// Updates the DATE + TIME display in the Bio-Metrics panel.
// Shows calendar date on the DATE row and Fallout-style time on the TIME row.
function renderGameDate() {
  const dateEl = document.getElementById('gameDateDisplay');
  if (dateEl) dateEl.textContent = getGameDate();
  const timeEl = document.getElementById('gameTimeDisplay');
  if (timeEl)
    timeEl.textContent = formatGameTime((typeof state !== 'undefined' && state.ticks) || 0);
}

// ── calendarToTicks() — C11: Calendar Date Editor ────────────────────
// Converts (month [1-12], day [1-31], year, hour [0-23], min [0-59]) to ticks.
// Uses the same MONTH_DAYS table as _resolveGameDateTime() — no leap years (game convention).
// Game-context aware: FNV epoch Oct 19, 2281; FO3 epoch Aug 17, 2277.
function calendarToTicks(month, day, year, hour, min) {
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const cal = _activeDef().calendar;
  const startMonth = cal.startMonth;
  const startDay = cal.startDay;
  const startYear = cal.startYear;
  // Count total days since an arbitrary base year using MONTH_DAYS (no leap years)
  function daysSinceBase(yr, mo0, dy) {
    // mo0 = 0-indexed month
    let total = (yr - 2200) * 365; // close-enough base offset
    for (let i = 0; i < mo0; i++) total += MONTH_DAYS[i];
    return total + dy;
  }
  const startTotal = daysSinceBase(startYear, startMonth, startDay);
  const targetTotal = daysSinceBase(year, (month - 1 + 12) % 12, day);
  const dayOffset = Math.max(0, targetTotal - startTotal);
  const h = Math.min(23, Math.max(0, hour || 0));
  const mn = Math.min(59, Math.max(0, min || 0));
  return dayOffset * 240 + h * 10 + Math.floor(mn / 6);
}

// ── FACTION THRESHOLDS (GECK-sourced, per-faction) ─────────────────
// t1: Smiling Troublemaker / Sneering Punk boundary
// t2: Accepted / Shunned boundary
// 3 breakpoints per faction → 4 ranks: x<bp1=R1, bp1≤x<bp2=R2, bp2≤x<bp3=R3, x≥bp3=R4
// Source: fallout.wiki — canonical NV GECK GetReputationThreshold values
// Only factions with non-default breakpoints are listed; all others use _DEFAULT_THRESHOLDS.
const FACTION_THRESHOLDS = {
  ncr: { bp1: 12, bp2: 40, bp3: 80 },
  legion: { bp1: 15, bp2: 50, bp3: 100 },
  bos: { bp1: 3, bp2: 10, bp3: 20 },
};
// Default thresholds (generic 8/25/50) — used by all factions not listed above
const _DEFAULT_THRESHOLDS = { bp1: 8, bp2: 25, bp3: 50 };

// ── getFactionStanding(key, fame, infamy) ───────────────────────────
// Canonical FNV 2D fame/infamy matrix (4 fame ranks × 4 infamy ranks = 16 titles).
// Returns { label, color } based on the intersection of fame rank × infamy rank.
// Source: fallout.wiki — GECK GetReputationThreshold canonical table.
function getFactionStanding(key, fame, infamy) {
  const th = FACTION_THRESHOLDS[key] || _DEFAULT_THRESHOLDS;
  const f = fame || 0;
  const i = infamy || 0;

  // Rank each axis 1–4: R1 x<bp1, R2 bp1≤x<bp2, R3 bp2≤x<bp3, R4 x≥bp3
  const fr = f < th.bp1 ? 1 : f < th.bp2 ? 2 : f < th.bp3 ? 3 : 4;
  const ir = i < th.bp1 ? 1 : i < th.bp2 ? 2 : i < th.bp3 ? 3 : 4;

  // Canonical 4×4 matrix indexed [ir-1][fr-1]
  const MATRIX = [
    ['Neutral', 'Accepted', 'Liked', 'Idolized'], // ir=1
    ['Shunned', 'Mixed', 'Smiling Troublemaker', 'Good-Natured Rascal'], // ir=2
    ['Hated', 'Sneering Punk', 'Unpredictable', 'Dark Hero'], // ir=3
    ['Vilified', 'Merciful Thug', 'Soft-Hearted Devil', 'Wild Child'], // ir=4
  ];
  const label = MATRIX[ir - 1][fr - 1];

  const POSITIVE = new Set(['Accepted', 'Liked', 'Idolized']);
  const DANGER = new Set(['Shunned', 'Hated', 'Vilified', 'Sneering Punk']);
  const color = POSITIVE.has(label)
    ? 'var(--robco-green)'
    : DANGER.has(label)
      ? 'var(--robco-danger)'
      : 'var(--robco-alert)';
  return { label, color };
}

// ── STATUS EFFECTS ───────────────────────────────────────────────
// BUS-07 · COMPOUND LAMPS (Phase 3 OPERATOR batch 2, ground-up reskin) — each
// active status effect becomes a lit lamp tile, color-coded by type (BUFF
// phosphor / DEBUFF red / NEUTRAL amber), with a tick countdown + pip meter
// and a ✕ purge key that still calls the unchanged removeStatusEffect(i)
// (Protocol 22). Empty state shows dark standby lamps instead of a bare
// empty-state line, so the board is never information-free (Protocol 25).
const _STLAMP_PIP_TOTAL = 6;
function _stlampPips(ticks, maxTicks) {
  const m = maxTicks > 0 ? maxTicks : Math.max(ticks, 1);
  const lit = Math.max(0, Math.min(_STLAMP_PIP_TOTAL, Math.round((ticks / m) * _STLAMP_PIP_TOTAL)));
  return '▮'.repeat(lit) + '▯'.repeat(_STLAMP_PIP_TOTAL - lit);
}
function renderStatus() {
  const statusDiv = document.getElementById('statusList');
  if (!statusDiv) return;
  const effects = state.status || [];
  if (effects.length === 0) {
    statusDiv.innerHTML =
      '<div class="stlamp-grid">' +
      ['STIMULANT', 'ANALGESIC', 'PROPHYLACTIC']
        .map(
          n =>
            `<div class="stlamp-tile dark"><div class="stlamp-head"><span class="stlamp-led" aria-hidden="true"></span><span class="stlamp-name">${n} — DARK</span></div><div class="stlamp-sub"><span class="stlamp-type">STANDBY</span></div></div>`
        )
        .join('') +
      '</div><div class="stlamp-empty-note">ALL LAMPS DARK — NO COMPOUNDS IN THE BLOODSTREAM</div>';
    // G3: Apply chem boost highlights to Skill Matrix rows
    _applyChemHighlights();
    return;
  }
  // FEEDBACK ANIMATION WAVE 3 (#28 TUNGSTEN WARM-UP) — consume the pending
  // list exactly once (the _pendingRepStamp/_pendingQuestStamp deferred-
  // consumption pattern), applying the warm-up class to every matching tile.
  const warmupNames = (_pendingEffectWarmup || []).map(n => String(n).toLowerCase());
  _pendingEffectWarmup = [];
  statusDiv.innerHTML =
    '<div class="stlamp-grid">' +
    effects
      .map((eff, i) => {
        const ticks = eff.ticks || 0;
        const type = (eff.type || 'BUFF').toUpperCase();
        const typeCls = type === 'DEBUFF' ? 'debuff' : type === 'NEUTRAL' ? 'neutral' : 'buff';
        const name = escapeHtml(eff.name || '');
        const ticksLine = ticks > 0 ? `${ticks} TICKS LEFT` : 'PERMANENT';
        const pips =
          ticks > 0
            ? `<span class="stlamp-pips" aria-hidden="true">${_stlampPips(ticks, ticks)}</span>`
            : '';
        const isWarmup = warmupNames.includes(String(eff.name || '').toLowerCase());
        // #29 GUTTERING LAMP — a continuous, state-driven flicker for as long
        // as the effect is genuinely expiring soon (never a one-shot; the
        // slate calls for "slow distress flicker UNTIL it expires"), so no
        // separate cleanup timer is needed — the next render simply drops
        // the class once ticks hits 0 and the row is removed.
        const isGuttering = ticks > 0 && ticks <= 2;
        const tileCls =
          typeCls + (isWarmup ? ' tungsten-warmup' : '') + (isGuttering ? ' lamp-guttering' : '');
        return `<div class="stlamp-tile ${tileCls}">
          <div class="stlamp-head">
            <span class="stlamp-led" aria-hidden="true"></span>
            <span class="stlamp-name">${name}</span>
            <button class="stlamp-purge" aria-label="Purge ${name}" onclick="removeStatusEffect(${i})">✕</button>
          </div>
          <div class="stlamp-sub">
            <span class="stlamp-type">${type}</span>
            <span class="stlamp-ticks">${ticksLine}</span>
            ${pips}
          </div>
        </div>`;
      })
      .join('') +
    '</div>';
  if (warmupNames.length) {
    setTimeout(() => {
      statusDiv
        .querySelectorAll('.tungsten-warmup')
        .forEach(el => el.classList.remove('tungsten-warmup'));
    }, 950);
  }
  // G3: Apply chem boost highlights to Skill Matrix rows
  _applyChemHighlights();
}

// Single-source live 0i summary for BUS-07's board-status row (called from
// ui-core.js's _syncOperatorTelemetry(), the existing board-status choke
// point) — "N LAMPS LIT · N DEBUFF · NEXT EXPIRY: name (N TICKS)".
function _statusLampSummary() {
  const effects = state.status || [];
  if (effects.length === 0) return 'ALL LAMPS DARK · NO ACTIVE COMPOUNDS';
  const debuffCount = effects.filter(e => (e.type || '').toUpperCase() === 'DEBUFF').length;
  const timed = effects.filter(e => (e.ticks || 0) > 0);
  let expiry = '';
  if (timed.length) {
    const next = timed.slice().sort((a, b) => (a.ticks || 0) - (b.ticks || 0))[0];
    expiry = ' · NEXT EXPIRY: ' + (next.name || '?').toUpperCase() + ' (' + next.ticks + ' TICKS)';
  }
  return effects.length + ' LAMPS LIT · ' + debuffCount + ' DEBUFF' + expiry;
}

// G3: Active Chem Visualizer ─────────────────────────────────────────────────
// Active BUFFs (type='BUFF', ticks > 0) apply .chem-boost class to matching skill rows.
// Matching: buff name fuzzy-matched against skill key display names.
// Highlight is a brighter phosphor effect (CSS class only, no color change).
function _applyChemHighlights() {
  // First, clear all existing highlights
  document
    .querySelectorAll('.skill-row.chem-boost')
    .forEach(el => el.classList.remove('chem-boost'));

  if (!state.status || state.status.length === 0) return;

  // Active buffs with ticks > 0 (time-limited chems, not permanent)
  const activeBuffs = state.status.filter(eff => eff.type === 'BUFF' && (eff.ticks || 0) > 0);
  if (activeBuffs.length === 0) return;

  // Build skill key → display name mapping from getSkillKeys()
  const skillKeys = getSkillKeys();
  const skillNames = skillKeys.map(k => ({ key: k, name: k.replace(/_/g, ' ').toUpperCase() }));

  activeBuffs.forEach(buff => {
    const buffName = (buff.name || '').toLowerCase();
    skillNames.forEach(({ key }) => {
      const skillName = key.replace(/_/g, ' ').toLowerCase();
      // Simple substring match: buff name contains skill name or vice versa
      if (buffName.includes(skillName) || skillName.includes(buffName.split(' ')[0])) {
        const row = document.getElementById('sk_' + key);
        if (row) {
          // Target the parent input-group row
          const inputGroup = row.closest('.skill-row') || row.parentElement;
          if (inputGroup) inputGroup.classList.add('chem-boost');
        }
      }
    });
  });
}

function removeStatusEffect(idx) {
  if (state.status && state.status.length > idx) {
    state.status.splice(idx, 1);
    renderStatus();
    updateMath();
  }
}

// Effect-push core extracted from addStatusEffect() (Protocol 22) — reused by
// both the DOM add-form below and nativeUseItem()'s deterministic USE parser
// (Native USE, Part A), so the dedup rule and the single 'effect.applied' emit
// site (Wave 3 #28 TUNGSTEN WARM-UP) can never drift between the two callers.
function _applyStatusEffect(name, ticks, type) {
  if (!state.status) state.status = [];
  const nm = String(name || '').trim();
  if (!nm) return;
  const tk = parseInt(ticks, 10) || 0;
  const tp = String(type || 'BUFF').toUpperCase();
  const existing = state.status.find(e => e.name.toLowerCase() === nm.toLowerCase());
  if (existing) {
    existing.ticks = tk;
    existing.type = tp;
  } else {
    state.status.push({ name: nm, ticks: tk, type: tp });
    // FEEDBACK ANIMATION WAVE 3 (#28 TUNGSTEN WARM-UP) — new additive emit,
    // fired only for a genuinely NEW compound (never a re-application — the
    // #12 INK STAMP "lands once" precedent); the AI status-set path in
    // autoImportState() (api-import.js) emits the same event.
    RobcoEvents.emit('effect.applied', { name: nm, type: tp });
    _pendingEffectWarmup.push(nm);
  }
}

function addStatusEffect() {
  const nameInput = document.getElementById('newStatusName');
  const ticksInput = document.getElementById('newStatusTicks');
  const typeSelect = document.getElementById('newStatusType');
  if (!nameInput || !nameInput.value.trim()) return;

  const ticks = parseInt(ticksInput.value) || 0;
  const name = nameInput.value.trim();
  const type = (typeSelect ? typeSelect.value : 'BUFF').toUpperCase();

  _applyStatusEffect(name, ticks, type);

  nameInput.value = '';
  if (ticksInput) ticksInput.value = '';
  renderStatus();
  updateMath();
}

// ── PERK LOADOUT ─────────────────────────────────────────────────
// BUS-06 · PERK LOADOUT (Phase 3 OPERATOR batch 3, ground-up reskin) — a
// numbered loadout-slot rack rendered inside the shared CARGO MANIFEST
// drawer scroll+search pattern (.tray-scrollwrap/.tray-list, Protocol 22 —
// the registry carries 90+ perks, so the list is a bounded in-panel scroll
// region with an optional search filter, never a render cap). Still emits
// the exact #perksList container + removePerk(i)/addPerk() handlers.
function renderPerks() {
  const perksDiv = document.getElementById('perksList');
  if (!perksDiv) return;
  const perks = state.perks || [];
  if (perks.length === 0) {
    perksDiv.innerHTML = emptyState('NO PERKS ON FILE');
    _renderFo3PerkDetail();
    return;
  }
  const searchEl = document.getElementById('perkSearch');
  const q = (searchEl ? searchEl.value : '').toLowerCase().trim();
  const displayPerks = perks
    .map((p, i) => ({ ...p, _origIdx: i }))
    .filter(p => !q || p.name.toLowerCase().includes(q));

  if (displayPerks.length === 0) {
    perksDiv.innerHTML = emptyState('NO PERK MATCHES');
    _renderFo3PerkDetail();
    return;
  }
  // FEEDBACK ANIMATION WAVE 3 (#13 CARD SEAT) — consume the pending marker
  // exactly once (the _pendingQuestStamp deferred-consumption pattern).
  const seatName = _pendingPerkSeat ? String(_pendingPerkSeat).toLowerCase() : null;
  _pendingPerkSeat = null;
  const rows = displayPerks
    .map(p => {
      const rank = Math.max(1, parseInt(p.rank) || 1);
      const pips = '&#9679;'.repeat(Math.min(6, rank));
      const levelTag = p.level_taken
        ? `<span class="s-meta">REQ LVL ${parseInt(p.level_taken)}</span>`
        : '';
      const isSeated = seatName && p.name.toLowerCase() === seatName;
      // FO3 Shape A (Batch 1): a click-to-select affordance for the detail
      // pane, additive to (never replacing) the row's own real ✕ delete
      // button below — zero tap regression. Keyboard reachable via
      // tabindex + Enter/Space (the row has no other natural focus stop).
      return (
        `<div class="slot-row${isSeated ? ' slot-row--seated' : ''}" data-idx="${p._origIdx}" tabindex="0" ` +
        `onclick="_selectFo3PerkRow(${p._origIdx})" ` +
        `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();_selectFo3PerkRow(${p._origIdx})}">` +
        `<span class="s-idx">SLOT ${String(p._origIdx + 1).padStart(2, '0')}</span>` +
        `<span class="s-name">${escapeHtml(p.name)}</span>` +
        `<span class="s-rank" title="Rank ${rank}">${pips}</span>` +
        levelTag +
        `<button class="delete-btn pk-x" onclick="event.stopPropagation();removePerk(${p._origIdx})" aria-label="Remove ${escapeHtml(p.name)}">✕</button>` +
        `</div>`
      );
    })
    .join('');
  // Pad with dashed VACANT rows only when the real count is small (never
  // pads a search result — matches the mockup's small-loadout look without
  // absurdly listing dozens of vacant slots for a big roster).
  const vacantCount = q ? 0 : Math.max(0, 6 - perks.length);
  const vacantRows = Array.from(
    { length: vacantCount },
    (_, i) =>
      `<div class="slot-row vacant">SLOT ${String(perks.length + i + 1).padStart(2, '0')} — VACANT</div>`
  ).join('');
  perksDiv.innerHTML = rows + vacantRows;
  // The seat is a one-shot CSS animation ending on a correct static final
  // frame (Protocol UI-9) — remove it after it plays so a later re-render
  // (e.g. a search keystroke) doesn't replay it.
  if (seatName) {
    setTimeout(() => {
      perksDiv
        .querySelectorAll('.slot-row--seated')
        .forEach(el => el.classList.remove('slot-row--seated'));
    }, 700);
  }
  if (typeof getIdentity === 'function' && getIdentity().rails) {
    perksDiv
      .querySelectorAll('.slot-row[data-idx]')
      .forEach(el => el.classList.toggle('fo3-sel', +el.dataset.idx === _fo3PerkSel));
    _renderFo3PerkDetail();
  }
}

// ── FO3 PERK DETAIL (Shape A list+detail, Batch 1) ──────────────────────
// Transient in-memory selection (never state.*/MetaStore). The list row's
// own ✕ delete button is untouched (zero tap regression); the detail pane
// mirrors rank/level + a second REMOVE action, both calling removePerk().
let _fo3PerkSel = null;

function _selectFo3PerkRow(idx) {
  _fo3PerkSel = idx;
  const perksDiv = document.getElementById('perksList');
  if (perksDiv) {
    perksDiv
      .querySelectorAll('.slot-row[data-idx]')
      .forEach(el => el.classList.toggle('fo3-sel', +el.dataset.idx === idx));
  }
  _renderFo3PerkDetail();
}

function _renderFo3PerkDetail() {
  const detail = document.getElementById('fo3PerkDetail');
  if (!detail) return;
  if (typeof getIdentity !== 'function' || !getIdentity().rails) return;
  const perks = state.perks || [];
  if (!perks.length) {
    detail.innerHTML = '<div class="fo3-empty">NO PERKS ON FILE</div>';
    return;
  }
  if (_fo3PerkSel == null || !perks[_fo3PerkSel]) _fo3PerkSel = 0;
  const idx = _fo3PerkSel;
  const p = perks[idx];
  const rank = Math.max(1, parseInt(p.rank) || 1);
  const levelLine = p.level_taken ? `<b>REQ LVL</b>${parseInt(p.level_taken)}` : '';
  detail.innerHTML =
    `<div class="fo3-dt-title">${escapeHtml(p.name)}</div>` +
    `<div class="fo3-dt-stats"><b>RANK</b>${rank} ${levelLine}</div>` +
    `<div class="fo3-dt-actions"><button class="fo3-act" onclick="removePerk(${idx})">REMOVE <i>&#9633;</i></button></div>`;
}

function removePerk(idx) {
  if (state.perks && state.perks.length > idx) {
    state.perks.splice(idx, 1);
    renderPerks();
    updateMath();
  }
}

function addPerk() {
  const name = ((document.getElementById('newPerkName') || {}).value?.trim() || '').slice(0, 80);
  if (!name) return;
  const rank = parseInt((document.getElementById('newPerkRank') || {}).value) || 1;
  const levelTaken = parseInt((document.getElementById('newPerkLevel') || {}).value) || 0;
  if (!state.perks) state.perks = [];
  const ex = state.perks.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (ex) {
    ex.rank = Math.max(ex.rank, rank);
  } else {
    state.perks.push({ name, rank, level_taken: levelTaken || null });
    // FEEDBACK ANIMATION WAVE 3 (#13 CARD SEAT) — a transient module var
    // (never state.*), consumed by renderPerks() the next time it paints.
    _pendingPerkSeat = name;
  }
  document.getElementById('newPerkName').value = '';
  document.getElementById('newPerkRank').value = '';
  document.getElementById('newPerkLevel').value = '';
  renderPerks();
  updateMath();
}

// ── BUS-17 · DIRECTIVE REGISTRY (Phase 3 · Piece 3) — quests as numbered
// directive slots inside a bounded tray-scrollwrap, with a status drawer
// bank (ALL/ACTIVE/COMPLETE/FAILED — a display-only filter, one open at a
// time, the OPERATIONS CARGO drawer mechanic reused, Protocol 22) and an
// in-tray search. The drawer bank's last-open choice persists via the
// registered robco_databank_qdrawer MetaStore pref (Protocol UI-6).
let _qDrawer = null;
function _qDrawerGet() {
  if (_qDrawer === null)
    _qDrawer =
      (typeof MetaStore !== 'undefined' && MetaStore.get('robco_databank_qdrawer')) || 'all';
  return _qDrawer;
}
// Called by the drawer-bank keycaps — a pure display filter, no state change.
function setQuestDrawer(k) {
  _qDrawer = k;
  if (typeof MetaStore !== 'undefined') MetaStore.set('robco_databank_qdrawer', k);
  renderQuests();
}

// The ⟳ CYCLE key — owner-approved (databank-notes.md Q3) the ONE new native
// write path this build adds: advances a directive's status ACTIVE→COMPLETE→
// FAILED→ACTIVE with no AI involved. autoImportState()'s own AI-write quest-
// status path (Protocol 14/24) is untouched — this is a second, native entry
// point onto the SAME state.quests[i].status field, exactly like the
// existing native affinity/mark-visited setters (Protocol 22 pattern).
const _QUEST_CYCLE = { active: 'complete', complete: 'failed', failed: 'active' };
// _pendingQuestStamp (FEEDBACK ANIMATION WAVE 1, #23 CASE-CLOSED STAMP / #24
// FILAMENT DIE) — a transient module var, never state.*, declared in
// state.js (loaded by test.html's reduced boot chain too — Protocol 27),
// consumed by renderQuests() the next time it paints (mirrors
// _pendingSurveyPing — the innerHTML-rebuild-survives-the-race pattern).
function cycleQuestStatus(idx) {
  if (!state.quests || !state.quests[idx]) return;
  const cur = String(state.quests[idx].status || 'active').toLowerCase();
  const next = _QUEST_CYCLE[cur] || 'active';
  state.quests[idx].status = next;
  if (next === 'complete' || next === 'failed') {
    RobcoEvents.emit('quest.status', {
      name: state.quests[idx].name,
      status: next,
      prevStatus: cur,
    });
    _pendingQuestStamp = { name: state.quests[idx].name, status: next };
  }
  saveState();
  renderQuests();
  updateMath();
}

// #1 Quest Log — renders state.quests[] as numbered directive slots, filtered
// by the active status drawer + the optional in-tray search.
function renderQuests() {
  const questsDiv = document.getElementById('questsList');
  if (!questsDiv) return;
  const all = state.quests || [];
  const norm = q => {
    const s = String((q && q.status) || 'active').toLowerCase();
    return ['active', 'complete', 'failed'].includes(s) ? s : 'active';
  };
  const counts = {
    all: all.length,
    active: all.filter(q => norm(q) === 'active').length,
    complete: all.filter(q => norm(q) === 'complete').length,
    failed: all.filter(q => norm(q) === 'failed').length,
  };
  const drawer = ['all', 'active', 'complete', 'failed'].includes(_qDrawerGet())
    ? _qDrawerGet()
    : 'all';

  const bank = document.getElementById('questDrawerBank');
  if (bank) {
    bank.innerHTML = [
      ['all', 'ALL'],
      ['active', 'ACTIVE'],
      ['complete', 'COMPLETE'],
      ['failed', 'FAILED'],
    ]
      .map(
        ([k, label]) =>
          `<button class="drawer${k === drawer ? ' pulled' : ''}" onclick="setQuestDrawer('${k}')" aria-label="${label} directives drawer — ${counts[k]} entries">${label}<span class="d-count">${counts[k]}</span></button>`
      )
      .join('');
  }

  const searchEl = document.getElementById('questSearch');
  const q = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const shown = all
    .map((quest, i) => ({ quest, i }))
    .filter(({ quest }) => drawer === 'all' || norm(quest) === drawer)
    .filter(
      ({ quest }) =>
        !q ||
        String(quest.name || '')
          .toLowerCase()
          .includes(q) ||
        String(quest.objective || '')
          .toLowerCase()
          .includes(q)
    );

  const titleEl = document.getElementById('questDrawerTitle');
  if (titleEl)
    titleEl.textContent =
      drawer === 'all' ? 'ALL DIRECTIVES' : drawer.toUpperCase() + ' DIRECTIVES';
  const countEl = document.getElementById('questDrawerCount');
  if (countEl) countEl.textContent = `${shown.length} SHOWN · SCROLLS ▾`;
  const statusEl = document.getElementById('dbQuestStatus');
  if (statusEl) {
    statusEl.textContent = `${counts.active} ACTIVE · ${counts.complete} DONE · ${counts.failed} FAILED`;
  }

  if (!all.length) {
    questsDiv.innerHTML = emptyState('NO ACTIVE DIRECTIVES');
    return;
  }
  if (!shown.length) {
    questsDiv.innerHTML = emptyState('NO DIRECTIVES MATCH THIS FILTER');
    return;
  }

  // FEEDBACK ANIMATION WAVE 1 (#23/#24) — consume the pending stamp exactly
  // once, only for the row it names, then clear it (never state.*).
  const stampName = _pendingQuestStamp ? String(_pendingQuestStamp.name || '').toLowerCase() : null;
  const stampStatus = _pendingQuestStamp ? _pendingQuestStamp.status : null;
  _pendingQuestStamp = null;
  // FEEDBACK ANIMATION WAVE 3 (#25 DIRECTIVE FILED) — same deferred-
  // consumption pattern, set by addQuest() (ui-saves.js). A freshly-filed
  // quest is never simultaneously stamped, so the two markers can't collide.
  const filedName = _pendingQuestFiled ? String(_pendingQuestFiled).toLowerCase() : null;
  _pendingQuestFiled = null;

  questsDiv.innerHTML = shown
    .map(({ quest: qq, i }) => {
      const st = norm(qq);
      const factions = qq.factions
        ? ` <span style="font-size:9px;opacity:0.6;">[${escapeHtml(String(qq.factions))}]</span>`
        : '';
      const isStamped = stampName && String(qq.name || '').toLowerCase() === stampName;
      const stampHtml = isStamped
        ? `<span class="dir-stamp dir-stamp--${stampStatus}" aria-hidden="true">${stampStatus === 'failed' ? 'FAILED' : 'COMPLETE'}</span>`
        : '';
      const isFiled = filedName && String(qq.name || '').toLowerCase() === filedName;
      return `<div class="dir-slot ${st}${isStamped ? ' dir-slot--stamped' : ''}${isFiled ? ' dir-slot--filed' : ''}">
        <span class="s-idx">SLOT ${String(i + 1).padStart(2, '0')}</span>
        <span class="dir-lamp" aria-hidden="true"></span>
        <span class="dir-main">
          <span class="d-name">${escapeHtml(qq.name)}${factions}</span>
          ${qq.objective ? `<span class="d-obj">${escapeHtml(qq.objective)}</span>` : ''}
        </span>
        <span class="dir-keys">
          <span class="d-st">${escapeHtml(st.toUpperCase())}</span>
          <button class="cyc" onclick="cycleQuestStatus(${i})" aria-label="Cycle ${escapeHtml(qq.name)} status (now ${st})">&#8635; CYCLE</button>
          <button class="del" onclick="removeQuest(${i})" aria-label="Remove ${escapeHtml(qq.name)}">&#10005;</button>
        </span>
        ${stampHtml}
      </div>`;
    })
    .join('');
  // The stamp is a one-shot CSS animation that ends on a correct static
  // final frame (Protocol UI-9) — clear the marker class after it plays so a
  // later re-render (e.g. a search/filter keystroke) doesn't replay it.
  if (stampName) {
    setTimeout(() => {
      questsDiv
        .querySelectorAll('.dir-slot--stamped')
        .forEach(el => el.classList.remove('dir-slot--stamped'));
    }, 1500);
  }
  if (filedName) {
    setTimeout(() => {
      questsDiv
        .querySelectorAll('.dir-slot--filed')
        .forEach(el => el.classList.remove('dir-slot--filed'));
    }, 900);
  }
}
function removeQuest(idx) {
  state.quests.splice(idx, 1);
  renderQuests();
  updateMath();
}
