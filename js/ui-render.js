function addItem() {
  let n = document.getElementById('newItemName').value;
  if (!n) return;
  n = n.slice(0, 100); // defensive clamp

  // Auto-populate from database if fields are empty
  const dbEntry = typeof lookupItemInDb === 'function' ? lookupItemInDb(n) : null;

  let q = parseFloat(document.getElementById('newItemQty').value) || 1;
  const rawW = document.getElementById('newItemWeight').value;
  const rawV = document.getElementById('newItemValue').value;
  let w = rawW !== '' ? parseFloat(rawW) || 0 : dbEntry ? dbEntry.wgt : 0;
  let v = rawV !== '' ? parseFloat(rawV) || 0 : dbEntry ? dbEntry.val : 0;
  let t = (document.getElementById('newItemType') || {}).value || 'misc';
  // Auto-set type from DB if user left it on the default 'misc'
  if (t === 'misc' && dbEntry && dbEntry.type) t = dbEntry.type;

  // ── AMMO ROUTING ────────────────────────────────────────────────
  // If the resolved type is 'ammo', route to state.ammo (sub-panel) instead of inventory
  if (t === 'ammo') {
    if (!state.ammo) state.ammo = {};
    state.ammo[n] = (state.ammo[n] || 0) + q;
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemQty').value = '';
    document.getElementById('newItemWeight').value = '';
    document.getElementById('newItemValue').value = '';
    renderAmmo();
    updateMath();
    expandPanelForCategory('ammo');
    return;
  }

  let ex = state.inventory.find(i => i.name.toLowerCase() === n.toLowerCase());
  if (ex) {
    ex.qty += q;
    // Retroactively correct weight/value if the existing entry had 0 and the new add has real data
    if (ex.wgt === 0 && w > 0) ex.wgt = w;
    if (ex.val === 0 && v > 0) ex.val = v;
    if (ex.type === 'misc' && t !== 'misc') ex.type = t;
  } else state.inventory.push({ name: n, qty: q, wgt: w, val: v, type: t });
  document.getElementById('newItemName').value = '';
  document.getElementById('newItemQty').value = '';
  document.getElementById('newItemWeight').value = '';
  document.getElementById('newItemValue').value = '';
  renderInventory();
  updateMath();
}
function delItem(idx) {
  state.inventory.splice(idx, 1);
  renderInventory();
  updateMath();
}

// Phase 3 · Piece 2 (CARGO MANIFEST): per-row quantity ± stepper. Clamped >=0;
// hitting 0 removes the row entirely (mirrors delItem's "gone" semantics —
// there is no such thing as a zero-quantity cargo tag). A new native write
// path (Protocol 13 regression test covers it), reusing the exact same
// render/save calls every other inventory mutator already makes.
function adjItemQty(idx, delta) {
  const it = state.inventory[idx];
  if (!it) return;
  const next = Math.max(0, (parseInt(it.qty) || 0) + delta);
  if (next === 0) {
    state.inventory.splice(idx, 1);
  } else {
    it.qty = next;
  }
  renderInventory();
  updateMath();
  saveState();
}

// Phase 3 · Piece 2: native EQUIP control, closing the U10 audit gap
// (state.equipped was previously AI-write-only — see api.js autoImportState,
// which keeps validating/applying the AI's own equipped writes unchanged).
// One equipped item per slot family: 'weapon'-typed items occupy
// state.equipped.weapon, 'armor'-typed items occupy state.equipped.armor.
// Headgear has no distinct inventory item type, so it stays AI-write-only.
// Tapping the equipped item's own button unequips it; tapping a different
// item of the same family replaces it (single-apply per slot).
function toggleEquipItem(idx) {
  const it = state.inventory[idx];
  if (!it) return;
  const cat = (it.type || 'misc').toLowerCase();
  const slot = cat === 'weapon' ? 'weapon' : cat === 'armor' ? 'armor' : null;
  if (!slot) return;
  if (!state.equipped) state.equipped = { weapon: null, armor: null, headgear: null };
  state.equipped[slot] = state.equipped[slot] === it.name ? null : it.name;
  renderEquipped();
  renderInventory();
  saveState();
}

// Drawer bank labels + the state.inventory/state.ammo count each drawer badge
// mirrors (Phase 3 · Piece 2 CARGO MANIFEST). Pure data — no game literal.
const _DRAWER_LABELS = {
  weapon: 'WEAPONS',
  armor: 'APPAREL',
  aid: 'AID',
  mod: 'MODS',
  misc: 'MISC',
  ammo: 'AMMO',
};
function _drawerCount(cat) {
  if (cat === 'ammo') return Object.values(state.ammo || {}).filter(n => n > 0).length;
  return state.inventory.filter(it => (it.type || 'misc') === cat).length;
}
// Live per-drawer count badges + the CARGO MANIFEST board's 0i summary line —
// called from both renderInventory() and renderAmmo() so it never goes stale
// regardless of which one last mutated state.
function _updateManifestChrome() {
  const bar = document.getElementById('invFilterBar');
  if (bar) {
    bar.querySelectorAll('[data-dcount]').forEach(el => {
      el.textContent = String(_drawerCount(el.dataset.dcount));
    });
  }
  const label = _DRAWER_LABELS[_invFilter] || String(_invFilter).toUpperCase();
  const title = document.getElementById('opsDrawerTitle');
  if (title) title.textContent = label + ' DRAWER';
  const total =
    state.inventory.filter(it => (it.type || 'misc') !== 'ammo').length +
    Object.values(state.ammo || {}).filter(n => n > 0).length;
  const status = document.getElementById('opsManifestStatus');
  if (status) status.textContent = total + ' ITEMS · ' + label + ' DRAWER OPEN';
}

// Syncs the drawer bank's visual "pulled" state + which tray is visible for
// the given category — split out from setInvFilter() so boot restore
// (_restoreDevicePrefs, ui-core.js) can apply a persisted drawer choice
// before state/renderInventory are necessarily ready, without re-persisting
// or re-rendering prematurely.
function _syncDrawerButtons(cat) {
  const bar = document.getElementById('invFilterBar');
  if (bar) {
    bar.querySelectorAll('.inv-filter-btn').forEach(btn => {
      const isActive = btn.dataset.filter === cat;
      btn.classList.toggle('active', isActive);
      btn.classList.toggle('pulled', isActive);
    });
  }
  // AMMO folds the AMMO RESERVES tray in place of the item list — every other
  // drawer shows the manifest list instead (same ammoList/ammoSubPanel ids,
  // just display-toggled by the drawer choice, Protocol 22).
  const invListWrap = document.getElementById('invListWrap');
  const ammoTray = document.getElementById('ammoSubPanel');
  if (invListWrap) invListWrap.style.display = cat === 'ammo' ? 'none' : '';
  if (ammoTray) ammoTray.style.display = cat === 'ammo' ? '' : 'none';
}

function setInvFilter(cat) {
  _invFilter = cat;
  _syncDrawerButtons(cat);
  MetaStore.set('robco_cargo_drawer', cat); // UI-6 — remember the last-open drawer
  renderInventory();
  renderAmmo();
}

function renderInventory() {
  const lst = document.getElementById('invList');
  if (!lst) return;
  // #23 Consumable Quick-Use + #32 Item Category Tags
  // Each row shows: [TYPE] name (qty · weight · value) [EQUIP] [-/qty/+] [USE] [X]
  const typeColors = {
    weapon: 'var(--robco-danger)',
    armor: 'var(--robco-blue)',
    aid: 'var(--robco-green)',
    mod: 'var(--robco-alert)',
    ammo: 'var(--robco-alert)',
    misc: 'var(--robco-alert)',
  };
  const searchEl = document.getElementById('invDrawerSearch');
  const q = (searchEl ? searchEl.value : '').toLowerCase().trim();
  // Filter ammo-typed items — they render in the AMMO drawer instead.
  // Map with original index FIRST so data-idx/data-use/data-equip/data-qtyidx
  // stay correct after filtering.
  const displayItems = state.inventory
    .map((it, idx) => ({ ...it, _origIdx: idx }))
    .filter(it => {
      const type = it.type || 'misc';
      if (type === 'ammo') return false;
      if (type !== _invFilter) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
  _updateManifestChrome();
  if (displayItems.length === 0) {
    const label = _DRAWER_LABELS[_invFilter] || String(_invFilter).toUpperCase();
    lst.innerHTML = emptyState('NO ' + label + (q ? ' MATCHES' : ' ITEMS'));
    lst.onclick = null;
    return;
  }
  const eq = state.equipped || {};
  lst.innerHTML = displayItems
    .map(it => {
      const cat = (it.type || 'misc').toLowerCase();
      const typeTag = `<span class="tag" style="color:${typeColors[cat] || 'inherit'};">[${cat.toUpperCase()}]</span>`;
      const slot = cat === 'weapon' ? 'weapon' : cat === 'armor' ? 'armor' : null;
      const isEq = !!(slot && eq[slot] === it.name);
      const equipBtn = slot
        ? `<button class="equip-btn${isEq ? ' equip-btn--on' : ''}" data-equip="${it._origIdx}" aria-label="${isEq ? 'Unequip' : 'Equip'} ${escapeHtml(it.name)}">${isEq ? '● EQUIPPED' : 'EQUIP'}</button>`
        : '';
      return (
        `<li class="mrow${isEq ? ' iseq' : ''}">` +
        `<span class="hole" aria-hidden="true"></span>` +
        `<button class="use-btn" data-use="${it._origIdx}" title="Quick-use: send [USE] ${escapeHtml(it.name)}" aria-label="Use item: ${escapeHtml(it.name)}">USE</button>${typeTag}` +
        `<span class="m-id"><span class="inv-name m-name">${escapeHtml(it.name)}</span>` +
        `<span class="m-meta">${parseInt(it.qty) || 0}x &middot; ${parseFloat(it.wgt) || 0} lb${parseInt(it.val) ? ' &middot; ' + parseInt(it.val) + 'c' : ''}</span></span>` +
        `<span class="m-ctrl">${equipBtn}` +
        `<span class="qtybox"><button class="qty-btn" data-qtyidx="${it._origIdx}" data-qtydelta="-1" aria-label="Decrease ${escapeHtml(it.name)} quantity">−</button>` +
        `<span class="q">${parseInt(it.qty) || 0}</span>` +
        `<button class="qty-btn" data-qtyidx="${it._origIdx}" data-qtydelta="1" aria-label="Increase ${escapeHtml(it.name)} quantity">+</button></span>` +
        `<button class="delete-btn" data-idx="${it._origIdx}" aria-label="Remove ${escapeHtml(it.name)} from inventory">X</button></span></li>`
      );
    })
    .join('');
  lst.onclick = e => {
    const del = e.target.closest('[data-idx]');
    if (del) {
      delItem(+del.dataset.idx);
      return;
    }
    const use = e.target.closest('[data-use]');
    if (use) {
      const item = state.inventory[+use.dataset.use];
      if (!item) return;
      document.getElementById('chatInput').value = `> [USE] ${item.name}`;
      transmitMessage();
      return;
    }
    const eqBtn = e.target.closest('[data-equip]');
    if (eqBtn) {
      toggleEquipItem(+eqBtn.dataset.equip);
      return;
    }
    const qtyBtn = e.target.closest('[data-qtyidx]');
    if (qtyBtn) {
      adjItemQty(+qtyBtn.dataset.qtyidx, +qtyBtn.dataset.qtydelta);
      return;
    }
  };
}

// ── AMMO RESERVES (folded into the CARGO MANIFEST's AMMO drawer) ───────
function renderAmmo() {
  const ammoDiv = document.getElementById('ammoList');
  if (!ammoDiv) return;
  const ammoObj = state.ammo || {};
  const entries = Object.entries(ammoObj).filter(([, count]) => count > 0);
  _updateManifestChrome();
  if (entries.length === 0) {
    ammoDiv.innerHTML = emptyState('NO AMMO TRACKED');
    return;
  }
  // Sort alphabetically by caliber name
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  ammoDiv.innerHTML = entries
    .map(
      ([caliber, count]) =>
        `<div class="arow"><b>${escapeHtml(caliber)}</b><span class="a-count">&times;${count}</span>` +
        `<button class="delete-btn" onclick="removeAmmo('${escapeHtml(caliber).replace(/'/g, '&#39;')}')" aria-label="Remove ${escapeHtml(caliber)} reserve">X</button></div>`
    )
    .join('');
}

function addAmmo() {
  const typeEl = document.getElementById('newAmmoType');
  const countEl = document.getElementById('newAmmoCount');
  if (!typeEl || !typeEl.value.trim()) return;
  const caliber = typeEl.value.trim();
  const count = parseInt(countEl.value) || 0;
  if (count <= 0) return;
  if (!state.ammo) state.ammo = {};
  state.ammo[caliber] = (state.ammo[caliber] || 0) + count;
  typeEl.value = '';
  countEl.value = '';
  renderAmmo();
  updateMath();
}

function removeAmmo(caliber) {
  if (!state.ammo) return;
  delete state.ammo[caliber];
  renderAmmo();
  updateMath();
}

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
// previously AI-write-only (autoImportState, api.js). Nudges by delta, clamped
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

// ── UTILITY FUNCTIONS ──────────────────────────────────────────
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
        return `<div class="stlamp-tile ${typeCls}">
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

function addStatusEffect() {
  const nameInput = document.getElementById('newStatusName');
  const ticksInput = document.getElementById('newStatusTicks');
  const typeSelect = document.getElementById('newStatusType');
  if (!nameInput || !nameInput.value.trim()) return;
  if (!state.status) state.status = [];

  const ticks = parseInt(ticksInput.value) || 0;
  const name = nameInput.value.trim();
  const type = (typeSelect ? typeSelect.value : 'BUFF').toUpperCase();

  const existing = state.status.find(e => e.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.ticks = ticks;
    existing.type = type;
  } else {
    state.status.push({ name, ticks, type });
  }

  nameInput.value = '';
  if (ticksInput) ticksInput.value = '';
  renderStatus();
  updateMath();
}

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
    return;
  }
  const searchEl = document.getElementById('perkSearch');
  const q = (searchEl ? searchEl.value : '').toLowerCase().trim();
  const displayPerks = perks
    .map((p, i) => ({ ...p, _origIdx: i }))
    .filter(p => !q || p.name.toLowerCase().includes(q));

  if (displayPerks.length === 0) {
    perksDiv.innerHTML = emptyState('NO PERK MATCHES');
    return;
  }
  const rows = displayPerks
    .map(p => {
      const rank = Math.max(1, parseInt(p.rank) || 1);
      const pips = '&#9679;'.repeat(Math.min(6, rank));
      const levelTag = p.level_taken
        ? `<span class="s-meta">REQ LVL ${parseInt(p.level_taken)}</span>`
        : '';
      return (
        `<div class="slot-row">` +
        `<span class="s-idx">SLOT ${String(p._origIdx + 1).padStart(2, '0')}</span>` +
        `<span class="s-name">${escapeHtml(p.name)}</span>` +
        `<span class="s-rank" title="Rank ${rank}">${pips}</span>` +
        levelTag +
        `<button class="delete-btn pk-x" onclick="removePerk(${p._origIdx})" aria-label="Remove ${escapeHtml(p.name)}">✕</button>` +
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
  }
  document.getElementById('newPerkName').value = '';
  document.getElementById('newPerkRank').value = '';
  document.getElementById('newPerkLevel').value = '';
  renderPerks();
  updateMath();
}

// #1 Quest Log — renders state.quests[] as a filterable list
function renderQuests() {
  const questsDiv = document.getElementById('questsList');
  if (!questsDiv) return;
  if (!state.quests || state.quests.length === 0) {
    questsDiv.innerHTML = emptyState('NO ACTIVE DIRECTIVES');
    return;
  }
  const statusColors = {
    active: 'var(--robco-alert)',
    complete: 'var(--robco-green)',
    failed: 'var(--robco-danger)',
  };
  questsDiv.innerHTML =
    '<ul class="notes-list">' +
    state.quests
      .map((q, i) => {
        const st = (q.status || 'active').toLowerCase();
        const color = statusColors[st] || 'inherit';
        const factions = q.factions
          ? ` <span style="font-size:9px;opacity:0.6;">[${escapeHtml(String(q.factions))}]</span>`
          : '';
        return `<li style="color:${color};"><span class="list-row-prefix">> </span><div class="list-row-content">[${escapeHtml(st.toUpperCase())}] ${escapeHtml(q.name)}${factions}${q.objective ? '<div style="font-size:10px;opacity:0.7;margin-left:10px;">' + escapeHtml(q.objective) + '</div>' : ''}</div><button class="delete-btn" onclick="removeQuest(${i})">X</button></li>`;
      })
      .join('') +
    '</ul>';
}
function removeQuest(idx) {
  state.quests.splice(idx, 1);
  renderQuests();
  updateMath();
}

// #8 Session Statistics — renders state.stats
function renderSessionStats() {
  const statsDiv = document.getElementById('sessionStatsList');
  if (!statsDiv) return;
  const s = state.stats || {};
  const sittingMs = Date.now() - (s.sessionStart || Date.now());
  const sittingStr =
    typeof _fmtOverseerDuration === 'function'
      ? _fmtOverseerDuration(sittingMs)
      : `${Math.round(sittingMs / 60000)}m`;
  // I2: Collectibles count for session stats
  const collectDefs =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.collectibles
      ? FALLOUT_REGISTRY.collectibles
      : [];
  const collectAcquired = (state.collectibles || []).length;
  const collectTotal = collectDefs.length;
  const collectLine =
    collectTotal > 0
      ? `<span style="opacity:0.65;">COLLECTIBLES</span><span>${collectAcquired}/${collectTotal}</span>`
      : '';
  statsDiv.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;font-size:11px;">
            <span style="opacity:0.65;">KILLS</span><span>${s.kills || 0}</span>
            <span style="opacity:0.65;">CAPS EARNED</span><span>${s.capsEarned || 0}</span>
            <span style="opacity:0.65;">DMG DEALT</span><span>${s.damageDealt || 0}</span>
            <span style="opacity:0.65;">CURRENT SITTING</span><span>${sittingStr}</span>
            <span style="opacity:0.65;">TICKS</span><span>${state.ticks || 0}</span>
            <span style="opacity:0.65;">LOCATION VISITS</span><span>${(state.locationHistory || []).length}</span>
            ${collectLine}
        </div>`;
}

// #2 Equipped Item Tracking — renders state.equipped in bio-metrics
function renderEquipped() {
  const eqDiv = document.getElementById('equippedDisplay');
  if (!eqDiv) return;
  const eq = state.equipped || {};
  const lines = [];
  if (eq.weapon)
    lines.push(`<span style="color:var(--robco-danger);">WPN: ${escapeHtml(eq.weapon)}</span>`);
  if (eq.armor)
    lines.push(`<span style="color:var(--robco-blue);">ARMOR: ${escapeHtml(eq.armor)}</span>`);
  if (eq.headgear)
    lines.push(`<span style="color:var(--robco-blue);">HEAD: ${escapeHtml(eq.headgear)}</span>`);
  eqDiv.innerHTML = lines.length
    ? lines.join('<br>')
    : '<span style="opacity:0.4;">Nothing equipped</span>';
}

// ── COLLECTIBLES PANEL ────────────────────────────────────────────
// Reads FALLOUT_REGISTRY.collectibles (game-specific list) and state.collectibles
// (flat array of collected item names). Renders terminal-style [ACQUIRED]/[MISSING] list.
function renderCollectibles() {
  const container = document.getElementById('collectiblesDisplay');
  if (!container) return;

  const defs =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.collectibles
      ? FALLOUT_REGISTRY.collectibles
      : [];
  const acquired = new Set((state.collectibles || []).map(n => n.toLowerCase()));
  const total = defs.length;
  const acquiredCount = defs.filter(d => acquired.has(d.name.toLowerCase())).length;

  if (total === 0) {
    container.innerHTML =
      '<span class="empty-state" style="font-size:11px;">No collectibles registry loaded</span>';
    return;
  }

  const typeLabel = _activeDef().collectibleLabel;

  // Update sub-panel summary label with game-specific type and count
  const collectiblesH3 = document.querySelector('#collectiblesSubPanel > summary > h3');
  if (collectiblesH3) collectiblesH3.textContent = `> ${typeLabel} [${acquiredCount}/${total}]`;
  // BUS-15 CURIO ARCHIVE board-level 0i status (Phase 3 · Piece 2)
  const curioStatus = document.getElementById('opsCurioStatus');
  if (curioStatus) curioStatus.textContent = `${acquiredCount}/${total} ${typeLabel} ACQUIRED`;
  const curioPn = document.querySelector('#curioPanel .bay-part-no');
  if (curioPn)
    curioPn.innerHTML = `PN RBC-FRT-15 &middot; DISPLAY CASE — ${escapeHtml(typeLabel)} <span class="real-label">(COLLECTIBLES — toggleCollectible unchanged)</span>`;

  let html = '';

  // Acquired items first
  const acquiredDefs = defs.filter(d => acquired.has(d.name.toLowerCase()));
  const missingDefs = defs.filter(d => !acquired.has(d.name.toLowerCase()));

  acquiredDefs.forEach(d => {
    const safeName = escapeHtml(d.name);
    html += `<div class="tracker-row"><button class="tracker-toggle tracker-toggle--active" onclick="toggleCollectible('${safeName}')" aria-label="Mark ${safeName} missing">[ACQUIRED]</button> ${escapeHtml(d.name.toUpperCase())}</div>`;
  });

  if (acquiredDefs.length > 0 && missingDefs.length > 0) {
    html +=
      '<div style="border-top:1px dashed rgba(var(--robco-green-rgb),0.2);margin:4px 0;"></div>';
  }

  missingDefs.forEach(d => {
    const safeName = escapeHtml(d.name);
    const locHint = d.location
      ? ` &mdash; <span class="tracker-meta">LOC: ${escapeHtml(d.location)}</span>`
      : '';
    html += `<div class="tracker-row" style="opacity:0.75;"><button class="tracker-toggle tracker-toggle--inactive" onclick="toggleCollectible('${safeName}')" aria-label="Mark ${safeName} acquired">[MISSING]</button> ${escapeHtml(d.name.toUpperCase())}${locHint}</div>`;
  });

  container.innerHTML = html;
}

function toggleCollectible(name) {
  if (!state.collectibles) state.collectibles = [];
  const lowerName = name.toLowerCase();
  const idx = state.collectibles.findIndex(n => n.toLowerCase() === lowerName);
  if (idx >= 0) {
    state.collectibles.splice(idx, 1);
  } else {
    state.collectibles.push(name);
    RobcoEvents.emit('collectible.acquired', { name }); // U8 auto-log
  }
  renderCollectibles();
  renderSessionStats();
  updateMath();
}
function renderLincolnMemorabilia() {
  const subPanel = document.getElementById('lincolnSubPanel');
  const container = document.getElementById('lincolnMemorabiliaDisplay');
  if (!container) return;
  if (!_activeDef().tracksLincoln) {
    if (subPanel) subPanel.style.display = 'none';
    return;
  }
  if (subPanel) subPanel.style.display = '';

  const defs =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.lincolnMemorabilia)
      ? FALLOUT_REGISTRY.lincolnMemorabilia
      : [];
  const items = state.lincolnItems || {};
  const foundCount = Object.keys(items).length;

  // Update sub-panel summary label with current count
  const summaryH3 = subPanel?.querySelector('summary > h3');
  if (summaryH3) summaryH3.textContent = `> LINCOLN MEMORABILIA [${foundCount}/9]`;

  const dispTally = { hannibal: 0, leroy: 0, washington: 0, undecided: 0 };
  defs.forEach(d => {
    const disp = items[d.name];
    if (disp === 'hannibal') dispTally.hannibal++;
    else if (disp === 'leroy') dispTally.leroy++;
    else if (disp === 'washington') dispTally.washington++;
    else if (disp === 'found') dispTally.undecided++;
  });

  let html = `<div style="font-size:10px;opacity:0.65;margin-bottom:2px;letter-spacing:0.5px;">`;
  html += `HANNIBAL ${dispTally.hannibal} &middot; LEROY ${dispTally.leroy} &middot; WASHINGTON ${dispTally.washington} &middot; UNDECIDED ${dispTally.undecided}`;
  html += `</div>`;

  defs.forEach(d => {
    const safeName = escapeHtml(d.name);
    const disp = items[d.name];
    const isFound = !!disp;
    if (isFound) {
      html += `<div class="tracker-row">`;
      html += `<button class="tracker-toggle tracker-toggle--active" data-lname="${safeName}" onclick="toggleLincolnItem(this.dataset.lname)" aria-label="Mark ${escapeHtml(d.name)} missing">[ACQUIRED]</button> `;
      html += `${escapeHtml(d.name.toUpperCase())} `;
      html += `<select data-lname="${safeName}" onchange="setLincolnDisposition(this.dataset.lname,this.value)" style="font-size:11px;background:transparent;color:inherit;border:1px solid var(--robco-green);min-height:28px;cursor:pointer;">`;
      const opts = [
        ['found', 'UNDECIDED'],
        ['hannibal', 'HANNIBAL (FREE SLAVES)'],
        ['leroy', 'LEROY WALKER (SLAVERS)'],
        ['washington', 'WASHINGTON (MUSEUM)'],
      ];
      opts.forEach(([val, label]) => {
        if (val !== 'leroy' || d.buyers.includes('leroy')) {
          if (val !== 'hannibal' || d.buyers.includes('hannibal')) {
            if (val !== 'washington' || d.buyers.includes('washington')) {
              html += `<option value="${val}"${disp === val ? ' selected' : ''}>${label}</option>`;
            }
          }
        }
      });
      html += `</select>`;
      html += `</div>`;
    } else {
      const locHint = d.location
        ? ` &mdash; <span class="tracker-meta">LOC: ${escapeHtml(d.location)}</span>`
        : '';
      html += `<div class="tracker-row" style="opacity:0.75;">`;
      html += `<button class="tracker-toggle tracker-toggle--inactive" data-lname="${safeName}" onclick="toggleLincolnItem(this.dataset.lname)" aria-label="Mark ${escapeHtml(d.name)} acquired">[MISSING]</button> `;
      html += `${escapeHtml(d.name.toUpperCase())}${locHint}`;
      html += `</div>`;
    }
  });

  container.innerHTML = html;
}

function toggleLincolnItem(name) {
  if (!state.lincolnItems) state.lincolnItems = {};
  if (state.lincolnItems[name]) {
    delete state.lincolnItems[name];
  } else {
    state.lincolnItems[name] = 'found';
  }
  renderLincolnMemorabilia();
  saveState();
}

function setLincolnDisposition(name, value) {
  const VOCAB = ['found', 'hannibal', 'leroy', 'washington'];
  if (!VOCAB.includes(value)) return;
  if (!state.lincolnItems) state.lincolnItems = {};
  state.lincolnItems[name] = value;
  renderLincolnMemorabilia();
  saveState();
}

function renderTraits() {
  const section = document.getElementById('traitsSection');
  const container = document.getElementById('traitsDisplay');
  if (!container) return;
  if (!_activeDef().hasTraits) {
    if (section) section.style.display = 'none';
    container.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';
  container.style.display = '';

  const defs =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.traits)
      ? FALLOUT_REGISTRY.traits
      : [];
  const selected = Array.isArray(state.traits) ? state.traits : [];
  const n = selected.length;

  let html = `<div style="font-size:11px;color:var(--robco-blue);font-weight:bold;letter-spacing:1px;margin-bottom:4px;">TRAITS [${n}/2]</div>`;

  const filterQ = (document.getElementById('traitFilter')?.value || '').toLowerCase().trim();

  const visibleDefs = filterQ
    ? defs.filter(
        d => d.name.toLowerCase().includes(filterQ) || d.effect.toLowerCase().includes(filterQ)
      )
    : defs;

  const selectedDefs = visibleDefs.filter(d => selected.includes(d.name));
  const unselectedDefs = visibleDefs.filter(d => !selected.includes(d.name));

  const renderRow = d => {
    const safeName = escapeHtml(d.name);
    const isSel = selected.includes(d.name);
    const dlcBadge =
      d.dlc === 'owb' ? ' <span style="font-size:9px;opacity:0.5;">[OWB]</span>' : '';
    const effectSpan = `<span class="tracker-meta"> &mdash; ${escapeHtml(d.effect)}</span>`;
    if (isSel) {
      html += `<div class="tracker-row">`;
      html += `<button class="tracker-toggle tracker-toggle--active" onclick="toggleTrait('${safeName}')" aria-label="Deselect trait ${safeName}">[SEL]</button>`;
      html += `<strong>${escapeHtml(d.name.toUpperCase())}${dlcBadge}</strong>${effectSpan}`;
      html += `</div>`;
    } else {
      html += `<div class="tracker-row" style="opacity:0.7;">`;
      html += `<button class="tracker-toggle tracker-toggle--inactive" onclick="toggleTrait('${safeName}')" aria-label="Select trait ${safeName}">[---]</button>`;
      html += `${escapeHtml(d.name.toUpperCase())}${dlcBadge}${effectSpan}`;
      html += `</div>`;
    }
  };

  if (filterQ && visibleDefs.length === 0) {
    html += `<div style="font-size:11px;opacity:0.5;padding:4px 0;">No matching traits.</div>`;
  } else {
    selectedDefs.forEach(renderRow);
    if (selectedDefs.length > 0 && unselectedDefs.length > 0) {
      html += `<div style="border-top:1px dashed var(--robco-green);margin:4px 0;opacity:0.3;"></div>`;
    }
    unselectedDefs.forEach(renderRow);
  }

  container.innerHTML = html;
}

function toggleTrait(name) {
  if (!Array.isArray(state.traits)) state.traits = [];
  const idx = state.traits.indexOf(name);
  if (idx !== -1) {
    state.traits.splice(idx, 1);
  } else {
    if (state.traits.length >= 2) {
      if (typeof appendToChat === 'function') {
        appendToChat('> [TRAITS] Maximum 2 traits — deselect one first.', 'sys');
      }
      return;
    }
    state.traits.push(name);
  }
  renderTraits();
  saveState();
}

// ── Shared SHELF/RACK tracker renderer (Phase 3 OPERATOR batch 3 — ground-
// up reskin of the WU-B8 shared helper) ─────────────────────────────────
// Drives the BUS-05a SKILL BOOKS reference shelf and BUS-05b SKILL MAGAZINES
// periodical rack from one config object — the row markup, empty state, and
// toggle wiring live in exactly one place (Protocol 22 — no duplicated
// render logic). Each row is a SINGLE <button> carrying BOTH the Protocol
// UI-3 .tracker-row and .tracker-toggle classes (the spine/cover IS its own
// toggle) — read = upright/lit/ribbon (books) or consumed = matte+stamped
// (magazines), the undone state leaning/dashed/dim. Fully data-driven — no
// game literals (Protocol 38).
//
// opts: {
//   containerId,                     // required: shelf/rack mount point
//   panelId?, visible?,              // optional: hide panelId when visible() is false
//   defs,                            // registry array of {name, skill}
//   read,                            // state array of read/consumed names
//   toggleFn,                        // name of the global toggle function
//   meta,                            // (d) => plain-text sub-label (skill name)
//   itemClass,                       // 'spine' | 'mag' — row CSS variant
//   doneModifier, undoneModifier,    // extra class applied per state
//   doneWord, undoneWord,            // aria-label phrasing
//   emptyBoard,                      // empty-state text when defs.length === 0
// }
function _renderReadTracker(opts) {
  const container = document.getElementById(opts.containerId);
  if (!container) return;
  const panel = opts.panelId ? document.getElementById(opts.panelId) : null;
  if (typeof opts.visible === 'function' && !opts.visible()) {
    if (panel) panel.style.display = 'none';
    return;
  }
  if (panel) panel.style.display = '';

  const defs = Array.isArray(opts.defs) ? opts.defs : [];
  const read = Array.isArray(opts.read) ? opts.read : [];

  const rowHtml = d => {
    const safeAttr = escapeHtml(d.name);
    const isRead = read.includes(d.name);
    const modifier = isRead ? opts.doneModifier : opts.undoneModifier;
    const word = isRead ? opts.doneWord : opts.undoneWord;
    const metaText = opts.meta(d);
    const cls =
      'tracker-row tracker-toggle ' +
      (isRead ? 'tracker-toggle--active' : 'tracker-toggle--inactive') +
      ' ' +
      opts.itemClass +
      (modifier ? ' ' + modifier : '');
    return (
      `<button class="${cls}" data-name="${safeAttr}" onclick="${opts.toggleFn}(this.dataset.name)" ` +
      `aria-label="${escapeHtml(d.name)} (${escapeHtml(metaText)}) — ${word}">` +
      `${escapeHtml(d.name)}<span class="tracker-meta">${escapeHtml(metaText)}</span>` +
      `</button>`
    );
  };

  container.innerHTML = defs.length ? defs.map(rowHtml).join('') : emptyState(opts.emptyBoard);
}

function renderSkillBooks() {
  _renderReadTracker({
    containerId: 'skillBooksDisplay',
    defs:
      typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.skillBooks)
        ? FALLOUT_REGISTRY.skillBooks
        : [],
    read: Array.isArray(state.skillBooks) ? state.skillBooks : [],
    toggleFn: 'toggleSkillBook',
    meta: d => (d.skill || '').replace(/_/g, ' ').toUpperCase(),
    itemClass: 'spine',
    doneModifier: '',
    undoneModifier: 'unread',
    doneWord: 'read; tap to mark unread',
    undoneWord: 'unread; tap to mark read',
    emptyBoard: 'NO SKILL BOOKS IN THE REGISTRY',
  });
}

function toggleSkillBook(name) {
  if (!Array.isArray(state.skillBooks)) state.skillBooks = [];
  const idx = state.skillBooks.indexOf(name);
  if (idx !== -1) {
    state.skillBooks.splice(idx, 1);
  } else {
    state.skillBooks.push(name);
  }
  renderSkillBooks();
  saveState();
}

function renderMagazines() {
  _renderReadTracker({
    containerId: 'magazinesDisplay',
    panelId: 'magazinesPanel',
    visible: () => !!_activeDef().hasMagazines,
    defs:
      typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.magazines)
        ? FALLOUT_REGISTRY.magazines
        : [],
    read: Array.isArray(state.magazines) ? state.magazines : [],
    toggleFn: 'toggleMagazine',
    meta: d =>
      d.skill === 'Critical Chance'
        ? 'CRITICAL CHANCE +10 (TEMP)'
        : (d.skill || '').replace(/_/g, ' ').toUpperCase() + ' +10 (TEMP)',
    itemClass: 'mag',
    doneModifier: 'consumed',
    undoneModifier: '',
    doneWord: 'consumed; tap to restore',
    undoneWord: 'unread; tap to mark consumed',
    emptyBoard: 'NO SKILL MAGAZINES IN THE REGISTRY',
  });
}

function toggleMagazine(name) {
  if (!Array.isArray(state.magazines)) state.magazines = [];
  const idx = state.magazines.indexOf(name);
  if (idx !== -1) {
    state.magazines.splice(idx, 1);
  } else {
    state.magazines.push(name);
  }
  renderMagazines();
  saveState();
}

function renderCampaignNotes() {
  const notesDiv = document.getElementById('campaignNotesList');
  if (!notesDiv) return;
  if (!state.campaign_notes || state.campaign_notes.length === 0) {
    notesDiv.innerHTML = emptyState('NO ENTRIES IN MEMORY');
    return;
  }
  notesDiv.innerHTML =
    '<ul class="notes-list">' +
    state.campaign_notes
      .map((note, i) => {
        const isAutoLog = /^\[T\d+\]/.test(note);
        const opacity = isAutoLog ? '0.65' : '1';
        return `<li style="opacity:${opacity};"><span class="list-row-prefix">> </span><span class="list-row-content">${escapeHtml(String(note))}</span><button class="delete-btn" onclick="removeCampaignNote(${i})">X</button></li>`;
      })
      .join('') +
    '</ul>';
}

function removeCampaignNote(idx) {
  if (state.campaign_notes && state.campaign_notes.length > idx) {
    state.campaign_notes.splice(idx, 1);
    renderCampaignNotes();
    updateMath();
  }
}

function addCampaignNote() {
  const input = document.getElementById('newCampaignNote');
  if (!input || !input.value.trim()) return;
  if (!state.campaign_notes) state.campaign_notes = [];
  state.campaign_notes.push(input.value.trim().slice(0, 5000)); // defensive clamp
  input.value = '';
  renderCampaignNotes();
  updateMath();
}

// P4: format a Terminal Record event { t, rt, type, text } as a display line.
// Owner report: the raw [T<ticks>] tick prefix was too cryptic. The stored
// tick value (ev.t) is unchanged — only the DISPLAY now runs it through the
// same formatGameTime() every other player-visible time stamp already uses
// (Protocol 22), so Crossroads Record/Incident Log read a real in-game
// date/time instead of a bare tick count.
function _recordLine(ev) {
  if (!ev || typeof ev !== 'object') return String(ev == null ? '' : ev);
  return `[${formatGameTime(ev.t || 0)}] ${ev.text || ''}`;
}

// ── CAMPAIGN STATUS PANEL (v2.0.1) ───────────────────────────────
// Reads existing state fields — no new state fields, no Protocol 4 required.
// Displays: quest summary, top faction standings, active effects, and campaign notes count.
// Crossroads Record tab reads campaign_notes for auto-logged quest/faction events.
function renderCampaignStatus() {
  const display = document.getElementById('campaignStatusDisplay');
  const crossroads = document.getElementById('crossroadsDisplay');

  // ── Campaign Status ──────────────────────────────────────
  if (display) {
    const quests = state.quests || [];
    const completed = quests.filter(
      q => q.status === 'completed' || q.status === 'complete'
    ).length;
    const active = quests.filter(q => q.status === 'in progress' || q.status === 'active').length;
    const failed = quests.filter(q => q.status === 'failed').length;
    const total = quests.length;

    // Top 3 faction standings by absolute net rep
    const factions = state.factions || {};
    const factionReg = typeof getFactionRegistry === 'function' ? getFactionRegistry() : [];
    const topFactions = factionReg
      .map(f => {
        const data = factions[f.key] || { fame: 0, infamy: 0 };
        const s =
          typeof getFactionStanding === 'function'
            ? getFactionStanding(f.key, data.fame || 0, data.infamy || 0)
            : { label: 'NEUTRAL', color: 'var(--robco-green)' };
        return { name: f.name, label: s.label, color: s.color };
      })
      .filter(f => f.label !== 'Neutral' && f.label !== 'NEUTRAL')
      .slice(0, 4);

    // Active effects summary
    const activeEffects = (state.status || []).length;
    const expiringEffects = (state.status || []).filter(
      e => (e.ticks || 0) > 0 && (e.ticks || 0) <= 2
    ).length;

    // Build the HTML
    let html = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
      <div class="campg-stat-box">
        <div class="campg-stat-label">QUESTS</div>
        <div class="campg-stat-value">${total}</div>
        <div class="campg-stat-sub">${completed} done · ${active} active · ${failed} failed</div>
      </div>
      <div class="campg-stat-box">
        <div class="campg-stat-label">EFFECTS</div>
        <div class="campg-stat-value">${activeEffects}</div>
        <div class="campg-stat-sub">${expiringEffects > 0 ? expiringEffects + ' expiring' : 'none expiring'}</div>
      </div>
    </div>`;

    if (topFactions.length > 0) {
      html += `<div style="margin-bottom:6px;font-size:9px;opacity:0.5;letter-spacing:0.5px;">NOTABLE STANDINGS</div>`;
      html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">`;
      topFactions.forEach(f => {
        html += `<span style="font-size:9px;border:1px dashed rgba(var(--robco-green-rgb),0.25);padding:2px 6px;color:${f.color};">${escapeHtml(f.name.toUpperCase())}: ${f.label}</span>`;
      });
      html += `</div>`;
    } else {
      html += `<div style="font-size:9px;opacity:0.4;margin-bottom:6px;">No notable faction standings</div>`;
    }

    // Terminal Record event count (P4)
    const eventCount = (state.eventLog || []).length;
    html += `<div style="font-size:9px;opacity:0.5;">${eventCount} event${eventCount === 1 ? '' : 's'} on record</div>`;

    display.innerHTML = html;
  }

  // ── Crossroads Record (P4) ───────────────────────────────
  // Reads the structured Terminal Record (state.eventLog) — the canonical
  // campaign history. Shows the most recent events across all types.
  if (crossroads) {
    const recent = (state.eventLog || []).slice(-20).reverse(); // newest first
    if (recent.length === 0) {
      crossroads.innerHTML = emptyState(
        'NO DECISIONS RECORDED — CROSSROADS EVENTS WILL APPEAR HERE'
      );
    } else {
      crossroads.innerHTML = recent
        .map(
          ev =>
            `<div style="border-bottom:1px solid rgba(var(--robco-green-rgb),0.1);padding:4px 0;font-size:10px;opacity:0.75;">${escapeHtml(_recordLine(ev))}</div>`
        )
        .join('');
    }
  }

  // ── Incident Log (P4) ────────────────────────────────────
  // A milestone view over the Terminal Record: the "big moments" only
  // (level-ups, faction standing shifts, quest outcomes) — the chatter
  // (trades/crafts/sleeps) is filtered out, leaving the incidents that matter.
  const incident = document.getElementById('incidentDisplay');
  if (incident) {
    const MILESTONES = ['level', 'faction', 'quest'];
    const incidents = (state.eventLog || [])
      .filter(ev => ev && MILESTONES.includes(ev.type))
      .slice(-20)
      .reverse();
    if (incidents.length === 0) {
      incident.innerHTML = emptyState('NO INCIDENTS ON RECORD — MILESTONES WILL APPEAR HERE');
    } else {
      incident.innerHTML = incidents
        .map(
          ev =>
            `<div style="border-bottom:1px solid rgba(var(--robco-green-rgb),0.1);padding:4px 0;font-size:10px;opacity:0.75;">${escapeHtml(_recordLine(ev))}</div>`
        )
        .join('');
    }
  }
}

// ── G6: REGIONAL ZONE MAP (WORLD MAP) ────────────────────────────
// Registry-driven 6×6 CSS grid. Markers:
//   CURRENT — bright border, on zone matching state.loc (fuzzy match against zone.locations[])
//   VISITED — dashed muted border, on zones in locationHistory
//   [?] pip  — on zones containing uncollected collectibles
// Compass strip labels orientation. Narrow viewports get a 4×4 core-zone fallback.
let _mapActiveZone = null;

function setMapView(v) {
  state.mapView = v;
  saveState();
  renderWorldMap();
}

function zoomMapToZone(zoneName) {
  _mapActiveZone = zoneName;
  renderWorldMap();
}

function resetMapZoom() {
  _mapActiveZone = null;
  renderWorldMap();
}

// Abbreviation map for long zone names in the 6×6 grid display.
// Full names are always available via the title tooltip.
const _MAP_ABBREV = {
  'Ranger Station Foxtrot': 'R.S. Foxtrot',
  'Ranger Station Alpha': 'R.S. Alpha',
  'Ranger Station Bravo': 'R.S. Bravo',
  'Ranger Station Charlie': 'R.S. Charlie',
  'Ranger Station Delta': 'R.S. Delta',
  'Ranger Station Echo': 'R.S. Echo',
  'Camp Forlorn Hope': 'Forlorn Hope',
  'Camp Searchlight': 'Searchlight',
  'Camp McCarran': 'McCarran',
  '188 Trading Post': '188 Post',
  'Mount Charleston': 'Mt. Charleston',
  'Searchlight Airport': 'S.L. Airport',
};

function _mapAbbrev(name) {
  return _MAP_ABBREV[name] || name;
}

// WU-F11: native "mark visited" — flags a WORLD GRID location as discovered directly from
// the map, with NO AI (never routes to the Director). Add-only: routes through the single-
// source recordLocationVisit() helper (state.js), which is permanent + dedup'd, so the
// CURRENT / VISITED / UNKNOWN status can never desync — matching the fog-of-war model (there
// is no un-mark). Persists locally via saveState (cloud stays manual) and re-renders so the
// row flips [UNKNOWN] → [VISITED]. Game-agnostic (Protocol 38): operates on the loc string.
function markLocationVisited(loc) {
  if (!loc) return;
  recordLocationVisit(loc);
  if (typeof saveState === 'function') saveState();
  renderWorldMap();
}

function renderWorldMap() {
  const display = document.getElementById('worldMapDisplay');
  if (!display) return;

  const zones =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.zones ? FALLOUT_REGISTRY.zones : [];

  if (!zones.length) {
    display.innerHTML = '<span style="opacity:0.4;">[MAP DATA NOT LOADED]</span>';
    return;
  }

  // Build sets for quick lookups
  const visited = new Set((state.locationHistory || []).map(l => (l || '').toLowerCase()));
  const collected = new Set((state.collectibles || []).map(c => (c || '').toLowerCase()));
  const collectDefs =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.collectibles
      ? FALLOUT_REGISTRY.collectibles
      : [];

  const currentLoc = (state.loc || '').toLowerCase();

  // Helper: check if a zone has an uncollected collectible or Lincoln item by grid coord.
  function zoneHasUncollectedCollectible(zone) {
    const hasCollectible = collectDefs.some(def => {
      if (typeof def.gridRow !== 'number' || typeof def.gridCol !== 'number') return false;
      if (collected.has((def.name || '').toLowerCase())) return false;
      return def.gridRow === zone.gridRow && def.gridCol === zone.gridCol;
    });
    if (hasCollectible) return true;
    const lincolnDefs =
      typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.lincolnMemorabilia
        ? FALLOUT_REGISTRY.lincolnMemorabilia
        : [];
    const lincolnAcquired = state.lincolnItems || {};
    return lincolnDefs.some(def => {
      if (typeof def.gridRow !== 'number' || typeof def.gridCol !== 'number') return false;
      if (lincolnAcquired[def.name]) return false;
      return def.gridRow === zone.gridRow && def.gridCol === zone.gridCol;
    });
  }

  // Scores a zone against the current location string to pick ONE best-match cell.
  // 100 = exact string match, 50+len = whole-word token match, 10 = substring fallback.
  function scoreZoneForLoc(zone, loc) {
    const locLower = loc.toLowerCase();
    const searchIn = [zone.name, ...(zone.locations || [])].map(s => s.toLowerCase());
    let best = 0;
    for (const s of searchIn) {
      if (s === locLower) return 100;
      const locWords = locLower.split(/[ ,]+/).filter(w => w.length > 2);
      const sWords = s.split(/[ ,]+/).filter(w => w.length > 2);
      if (locWords.some(lw => sWords.some(sw => sw === lw))) {
        best = Math.max(best, 50 + s.length);
      } else if (
        locWords.some(lw => lw.length > 3 && sWords.some(sw => sw.includes(lw) || lw.includes(sw)))
      ) {
        best = Math.max(best, 10);
      }
    }
    return best;
  }

  function zoneVisited(zone) {
    const searchIn = [zone.name, ...(zone.locations || [])].map(s => s.toLowerCase());
    for (const v of visited) {
      if (searchIn.some(s => s.includes(v) || v.includes(s.split(' ')[0]))) return true;
    }
    return false;
  }

  function locVisited(locName) {
    const locLower = locName.toLowerCase();
    for (const v of visited) {
      if (locLower.includes(v) || v.includes(locLower.split(' ')[0])) return true;
    }
    return false;
  }

  // ── ZOOM LEVEL 2: DETAILED REGIONAL VIEW ─────────────────────────
  if (_mapActiveZone) {
    const activeZone = zones.find(z => z.name === _mapActiveZone);
    if (!activeZone) {
      _mapActiveZone = null;
      return renderWorldMap();
    }

    const zoneBadge = zoneHasUncollectedCollectible(activeZone)
      ? `<span class="map-collectible-badge badge">[?]</span>`
      : '';
    let html = `
      <div class="map-detail-header">
        <button class="action-btn map-back-btn" onclick="resetMapZoom()">&lt; WORLD GRID</button>
        <span style="font-weight:bold; font-size:11px; letter-spacing:1px;">${escapeHtml(activeZone.name).toUpperCase()} REGION</span>${zoneBadge}
      </div>
      <div class="map-detail-list">
    `;

    const locs = activeZone.locations || [];
    if (locs.length === 0) {
      html += `<div style="opacity:0.5; font-style:italic; padding:8px 4px;">No data</div>`;
    } else {
      // Single-winner: find the one best-matching location index (score ≥50 required).
      // Prevents "goodsprings" substring match from marking Bitter Springs as [CURRENT].
      let currentLocIdx = -1;
      if (currentLoc) {
        let bestLocScore = 0,
          bestLocLen = 0;
        locs.forEach((loc, i) => {
          const s = scoreZoneForLoc({ name: loc, locations: [] }, currentLoc);
          if (s > bestLocScore || (s > 0 && s === bestLocScore && loc.length > bestLocLen)) {
            bestLocScore = s;
            bestLocLen = loc.length;
            currentLocIdx = i;
          }
        });
        if (bestLocScore < 50) currentLocIdx = -1;
      }
      locs.forEach((loc, i) => {
        const isYou = i === currentLocIdx;
        const wasVisited = locVisited(loc);

        let statusText = '<span style="opacity:0.4;">[UNKNOWN]</span>';
        let rowCls = 'map-detail-row';
        if (isYou) {
          statusText = '<span class="map-you-marker">[CURRENT]</span>';
          rowCls += ' map-detail-row--current';
        } else if (wasVisited) {
          statusText = '<span style="opacity:0.8;">[VISITED]</span>';
          rowCls += ' map-detail-row--visited';
        }

        // WU-F11: native "mark visited" affordance — only on undiscovered rows (not the
        // current location, not already visited). Add-only: tapping LOG VISIT flags the place
        // as discovered (permanent, no un-mark) directly, with NO AI.
        const markBtn =
          isYou || wasVisited
            ? ''
            : `<button class="map-mark-visited" data-loc="${escapeHtml(
                loc
              )}" onclick="markLocationVisited(this.dataset.loc)" aria-label="Mark ${escapeHtml(
                loc
              )} as visited">LOG VISIT</button>`;

        html += `
          <div class="${rowCls}">
            <span class="map-detail-name">- ${escapeHtml(loc)}</span>
            ${markBtn}
            <span style="font-size:9px;white-space:nowrap;">${statusText}</span>
          </div>
        `;
      });
    }

    html += `</div>`;
    display.innerHTML = html;
    return;
  }

  // ── ZOOM LEVEL 1: STRATEGIC WORLD VIEW ───────────────────────────
  // Size is a pure function of state.mapView (persisted) — no width measurement.
  // 'full' → 6×6 grid; 'auto' and 'core' → 4×4 core grid (rows 2–5, cols 2–5).
  const mv = state.mapView || 'auto';
  const useFull = mv === 'full';

  const rowMin = useFull ? 1 : 2;
  const rowMax = useFull ? 6 : 5;
  const colMin = useFull ? 1 : 2;
  const colMax = useFull ? 6 : 5;
  const cols = colMax - colMin + 1;

  // Build zone lookup by grid position
  const gridMap = {};
  zones.forEach(z => {
    gridMap[`${z.gridRow},${z.gridCol}`] = z;
  });

  // Compute ONE winning grid key for current location to prevent multi-highlight
  let currentZoneKey = null;
  if (currentLoc) {
    let bestScore = 0,
      bestLen = 0;
    Object.entries(gridMap).forEach(([key, zone]) => {
      const score = scoreZoneForLoc(zone, currentLoc);
      if (score > bestScore || (score > 0 && score === bestScore && zone.name.length > bestLen)) {
        bestScore = score;
        bestLen = zone.name.length;
        currentZoneKey = score >= 50 ? key : null;
      }
    });
    if (bestScore < 50) currentZoneKey = null;
  }

  // Compass column labels (W → E)
  const compassCols = [];
  for (let c = colMin; c <= colMax; c++) {
    if (c === colMin) compassCols.push('W');
    else if (c === colMax) compassCols.push('E');
    else compassCols.push('·');
  }

  let html = `<div style="display:grid; grid-template-columns:14px repeat(${cols},minmax(0,1fr)); gap:2px; font-size:9px; letter-spacing:0.3px; margin:4px 0; max-width:100%;">`;

  // Compass header row
  html += `<div></div>`; // corner spacer
  compassCols.forEach(lbl => {
    html += `<div style="text-align:center;font-size:8px;opacity:0.35;line-height:1.4;">${lbl}</div>`;
  });

  for (let r = rowMin; r <= rowMax; r++) {
    // Row N/S label
    let rowLbl = '·';
    if (r === rowMin) rowLbl = 'N';
    else if (r === rowMax) rowLbl = 'S';
    html += `<div style="display:flex;align-items:center;justify-content:center;font-size:8px;opacity:0.35;">${rowLbl}</div>`;

    for (let c = colMin; c <= colMax; c++) {
      const zone = gridMap[`${r},${c}`] || null;
      if (!zone) {
        html += `<div class="map-cell map-cell--empty"></div>`;
        continue;
      }

      const isYou = currentZoneKey === `${r},${c}`;
      const wasVisited = zoneVisited(zone);
      const hasUncollected = zoneHasUncollectedCollectible(zone);

      let cellCls = 'map-cell';
      if (isYou) cellCls += ' map-cell--current';
      else if (wasVisited) cellCls += ' map-cell--visited';

      const collectiblePip = hasUncollected ? `<span class="map-cell-pip">[?]</span>` : '';
      const displayName = escapeHtml(_mapAbbrev(zone.name));

      html += `<div class="${cellCls}" onclick="zoomMapToZone('${escapeHtml(zone.name.replace(/'/g, "\\'"))}')" title="${escapeHtml(zone.name)}">
        <span class="map-cell-name">${displayName}</span>
        ${collectiblePip}
      </div>`;
    }
  }

  html += '</div>';

  // Legend + toggle button (shown on all widths; persists view preference via state.mapView)
  const toggleBtn = useFull
    ? `<button class="map-toggle-btn" onclick="setMapView('core')">CORE VIEW</button>`
    : `<button class="map-toggle-btn" onclick="setMapView('full')">FULL MAP</button>`;

  html += `<div class="map-legend">N=CURRENT &nbsp;·=VISITED &nbsp;[?]=COLLECTIBLE &nbsp;TAP=ZOOM ${toggleBtn}</div>`;
  display.innerHTML = html;
}

// ── FACTION REPUTATION — inline editing (Implementation 3) ─────────
// adjustFaction(key, field, delta) — nudges fame or infamy by delta.
// Called by inline [+] / [-] buttons in each faction card.
// Clamps to 0–1000. Saves state and re-renders.
function adjustFaction(key, field, delta) {
  if (!state.factions) state.factions = {};
  if (!state.factions[key]) state.factions[key] = { fame: 0, infamy: 0 };
  const cur = state.factions[key][field] || 0;
  state.factions[key][field] = Math.max(0, Math.min(1000, cur + delta));
  saveState();
  renderFactionRep();
  _updatePanelBadges();
}

// BUS-08 · REPUTATION CONSOLE (Phase 3 OPERATOR batch 2, ground-up reskin) —
// a single shared dual-scale INFAMY◂▸FAME meter driven by a channel keycap
// selector (every faction from getFactionRegistry(), major+minor together —
// nothing hidden behind a collapsed sub-panel, Protocol 25 no-added-taps),
// plus an all-faction mini-pin strip so no faction's standing is hidden
// behind the selector. The ±5 adjust keys still call the unchanged
// adjustFaction(key, field, delta) (Protocol 22). Last-picked channel
// persists via the registered robco_faction_channel device pref
// (Protocol UI-6).
let _facChannel = null;

// setFactionChannel(key) — selects the meter's active faction channel and
// persists the choice; re-renders through the same single render function
// so the selector/meter/strip can never drift from each other.
function setFactionChannel(key) {
  _facChannel = key;
  if (typeof MetaStore !== 'undefined') MetaStore.set('robco_faction_channel', key);
  renderFactionRep();
}

// Net fame/infamy position on the shared 0-100 scale (50 = balanced center
// detent), same fame/(fame+infamy) ratio the old bar chart used.
function _facPinPct(data) {
  const fam = data.fame || 0;
  const inf = data.infamy || 0;
  const total = fam + inf || 1;
  return Math.min(100, Math.max(0, (fam / total) * 100));
}

function renderFactionRep() {
  const container = document.getElementById('factionContainer');
  if (!container) return;
  const factions = state.factions || {};
  const registry = getFactionRegistry();
  if (!registry.length) {
    container.innerHTML = emptyState('NO FACTIONS TRACKED');
    return;
  }

  if (!_facChannel || !registry.some(f => f.key === _facChannel)) {
    const persisted =
      typeof MetaStore !== 'undefined' ? MetaStore.get('robco_faction_channel') : null;
    _facChannel = registry.some(f => f.key === persisted) ? persisted : registry[0].key;
  }

  const dataFor = key => factions[key] || { fame: 0, infamy: 0 };
  const standingOf = f => {
    const d = dataFor(f.key);
    return getFactionStanding(f.key, d.fame || 0, d.infamy || 0);
  };

  // Owner follow-up: the pre-reskin card grid grouped factions into MAJOR
  // FACTIONS / MINOR FACTIONS sections — restore that grouping on the
  // console's keycap selector, sourced from the SAME data-driven f.tier
  // field the retired grid used (getFactionRegistry(), Protocol 38), never a
  // hardcoded key list. No disclosure/collapse reintroduced — every section
  // stays always-visible, so this is zero added taps over the flat selector
  // (Protocol 25). A faction with no recognized tier still renders (an "OTHER
  // FACTIONS" fallback bucket) rather than silently vanishing.
  const chanBtn = f => {
    const cur = f.key === _facChannel;
    return `<button class="facon-chan${cur ? ' cur' : ''}" onclick="setFactionChannel('${f.key}')" aria-label="Select ${escapeHtml(f.name)} channel" aria-pressed="${cur}">${escapeHtml(f.name).toUpperCase()}</button>`;
  };
  const selectorSection = (list, label) =>
    list.length
      ? `<div class="facon-section"><div class="facon-section-label">${escapeHtml(label)}</div><div class="facon-selector">${list.map(chanBtn).join('')}</div></div>`
      : '';
  const majorFactions = registry.filter(f => f.tier === 'major');
  const minorFactions = registry.filter(f => f.tier === 'minor');
  const otherFactions = registry.filter(f => f.tier !== 'major' && f.tier !== 'minor');
  const selectorHtml =
    selectorSection(majorFactions, 'MAJOR FACTIONS') +
    selectorSection(minorFactions, 'MINOR FACTIONS') +
    selectorSection(otherFactions, 'OTHER FACTIONS');

  const sel = registry.find(f => f.key === _facChannel) || registry[0];
  const selData = dataFor(sel.key);
  const selStanding = standingOf(sel);
  const selPinPct = _facPinPct(selData);

  const stripHtml = registry
    .map(f => {
      const st = standingOf(f);
      const pinPct = _facPinPct(dataFor(f.key));
      return `<div class="facon-strip-row"><b class="facon-strip-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</b><span class="facon-mini"><i style="left:${pinPct}%"></i></span><span class="facon-standing" style="color:${st.color}">${st.label}</span></div>`;
    })
    .join('');

  container.innerHTML = `
    <div class="facon-groups">${selectorHtml}</div>
    <div class="facon-meter-wrap">
      <div class="facon-title">
        <span class="facon-name">${escapeHtml(sel.name).toUpperCase()}</span>
        <span class="facon-standing" style="color:${selStanding.color}">${selStanding.label.toUpperCase()}</span>
      </div>
      <div class="facon-scale">
        <div class="facon-pin" style="left:${selPinPct}%"></div>
      </div>
      <div class="facon-ends"><span>&#9668; INFAMY</span><span>CENTER DETENT</span><span>FAME &#9658;</span></div>
      <div class="facon-nums"><span>FAME ${selData.fame || 0}</span><span>INFAMY ${selData.infamy || 0}</span></div>
      <div class="facon-keys">
        <button aria-label="Fame plus 5 for ${escapeHtml(sel.name)}" onclick="adjustFaction('${sel.key}','fame',5)">F +5</button>
        <button aria-label="Fame minus 5 for ${escapeHtml(sel.name)}" onclick="adjustFaction('${sel.key}','fame',-5)">F -5</button>
        <button class="ikey" aria-label="Infamy plus 5 for ${escapeHtml(sel.name)}" onclick="adjustFaction('${sel.key}','infamy',5)">I +5</button>
        <button class="ikey" aria-label="Infamy minus 5 for ${escapeHtml(sel.name)}" onclick="adjustFaction('${sel.key}','infamy',-5)">I -5</button>
      </div>
      <div style="font-size:9px;opacity:0.45;margin-top:8px;letter-spacing:0.5px;text-align:center;">F +5/-5 = FAME ±5 &nbsp; I +5/-5 = INFAMY ±5</div>
    </div>
    <div class="facon-strip">${stripHtml}</div>
  `;
}

// ── G4: EXPANDED KARMA SYSTEM (FO3) ─────────────────────────────
// When gameContext === 'FO3': Karma Center appendix shown inside BUS-09
// KARMA ALIGNMENT (Phase 3 OPERATOR batch 3 — the board itself is now
// universal; only this nested block is FO3-only, per usesKarmaCenter).
// Thresholds: Very Evil (<-750) / Evil (<-250) / Neutral / Good (>250) / Very Good (>750).
// Differentiated by text labels and brightness — no multi-color.
function renderKarmaCenter() {
  const block = document.getElementById('karmaCenterBlock');
  const display = document.getElementById('karmaCenterDisplay');
  if (!display) return;
  if (block) block.style.display = _activeDef().usesKarmaCenter ? '' : 'none';

  const karma = state.karma || 0;
  let label, opacity, hitSquad;
  if (karma <= -750) {
    label = 'VERY EVIL';
    opacity = 1.0;
    hitSquad = true;
  } else if (karma <= -250) {
    label = 'EVIL';
    opacity = 0.85;
    hitSquad = false;
  } else if (karma < 250) {
    label = 'NEUTRAL';
    opacity = 0.65;
    hitSquad = false;
  } else if (karma < 750) {
    label = 'GOOD';
    opacity = 0.85;
    hitSquad = false;
  } else {
    label = 'VERY GOOD';
    opacity = 1.0;
    hitSquad = false;
  }

  const barPct = Math.max(0, Math.min(100, ((karma + 1000) / 2000) * 100));
  let html = `
    <div style="text-align:center;font-size:18px;letter-spacing:3px;filter:brightness(${opacity + 0.4});padding:6px 0;">${label}</div>
    <div style="font-size:11px;opacity:0.6;text-align:center;margin-bottom:6px;">KARMA: ${karma > 0 ? '+' : ''}${karma}</div>
    <div style="background:rgba(var(--robco-green-rgb),0.1);height:4px;border-radius:2px;margin:0 0 8px;">
      <div style="height:4px;width:${barPct}%;background:var(--robco-green);border-radius:2px;transition:width 0.4s;"></div>
    </div>`;

  if (hitSquad) {
    html += `<div style="font-size:10px;letter-spacing:1px;opacity:0.8;border:1px dashed rgba(255,80,80,0.6);padding:4px 6px;margin-bottom:6px;">[!] ENCLAVE HIT SQUAD RISK</div>`;
  }

  // Companion availability notes based on karma
  html += `<div style="font-size:10px;opacity:0.55;margin-top:4px;">`;
  if (karma >= 250) {
    html += `COMPANIONS: Dogmeat, Fawkes, Star Paladin Cross available`;
  } else if (karma <= -250) {
    html += `COMPANIONS: Clover, Jericho available`;
  } else {
    html += `COMPANIONS: Charon, Sergeant RL-3 available`;
  }
  html += `</div>`;

  display.innerHTML = html;
}

// ── CRAFT PANEL ──────────────────────────────────────────────────────────────

function _craftGetHave(itemName) {
  const lower = itemName.toLowerCase();
  if (state.ammo) {
    for (const k of Object.keys(state.ammo)) {
      if (k.toLowerCase() === lower && (state.ammo[k] || 0) > 0) return state.ammo[k];
    }
  }
  const inv = (state.inventory || []).find(i => i.name.toLowerCase() === lower);
  return inv ? inv.qty || 0 : 0;
}

function _craftConsume(itemName, qty) {
  const lower = itemName.toLowerCase();
  if (state.ammo) {
    for (const k of Object.keys(state.ammo)) {
      if (k.toLowerCase() === lower) {
        state.ammo[k] = Math.max(0, (state.ammo[k] || 0) - qty);
        if (state.ammo[k] === 0) delete state.ammo[k];
        if (typeof renderAmmo === 'function') renderAmmo();
        return;
      }
    }
  }
  const idx = (state.inventory || []).findIndex(i => i.name.toLowerCase() === lower);
  if (idx === -1) return;
  state.inventory[idx].qty = Math.max(0, (state.inventory[idx].qty || 0) - qty);
  if (state.inventory[idx].qty === 0) state.inventory.splice(idx, 1);
}

function craftSetMax(recipeIdx, maxVal) {
  const el = document.getElementById('craftQty_' + recipeIdx);
  if (el) el.value = Math.max(1, maxVal);
}

function renderCraftCard() {
  const card = document.getElementById('craftRecipeCard');
  if (!card) return;
  const sel = document.getElementById('craftRecipeSelect');
  const ri = sel ? parseInt(sel.value) : 0;
  const recipes =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.recipes)
      ? FALLOUT_REGISTRY.recipes
      : [];
  const recipe = recipes[ri];
  if (!recipe) {
    card.innerHTML = '';
    return;
  }
  const MAX_CAP = 99;
  const req = recipe.skillReq;
  let skillHtml = '';
  if (req) {
    const haveSkill =
      state.skills && typeof state.skills[req.skill] === 'number' ? state.skills[req.skill] : 0;
    const met = haveSkill >= req.level;
    const lbl =
      typeof SKILL_LABELS !== 'undefined' && SKILL_LABELS[req.skill]
        ? SKILL_LABELS[req.skill]
        : req.skill;
    const col = met ? 'var(--robco-green)' : 'var(--robco-danger)';
    skillHtml = `<span style="font-size:10px;color:${col};white-space:nowrap;">(${escapeHtml(lbl)} ${req.level} ${met ? '✓' : '✗'})</span>`;
  }
  let maxBatch = MAX_CAP;
  // Phase 3 · Piece 2 (FIELD FABRICATION): per-ingredient HAVE/NEED meter bars
  // — same have/need numbers as before, now with a fill bar (short = red).
  const ingHtml = recipe.ingredients
    .map(ing => {
      const haveN = _craftGetHave(ing.item);
      const canMake = ing.qty > 0 ? Math.floor(haveN / ing.qty) : MAX_CAP;
      if (canMake < maxBatch) maxBatch = canMake;
      const short = haveN < ing.qty;
      const fillPct = ing.qty > 0 ? Math.min(100, Math.round((haveN / ing.qty) * 100)) : 100;
      return (
        `<div class="ing${short ? ' short' : ''}">` +
        `<b>${escapeHtml(ing.item)}</b>` +
        `<span class="hn-meter"><i style="width:${fillPct}%"></i></span>` +
        `<span class="hn-txt">HAVE ${haveN} / NEED ${ing.qty}</span>` +
        `</div>`
      );
    })
    .join('');
  const allMet = recipe.ingredients.every(ing => _craftGetHave(ing.item) >= ing.qty);
  const missingItems = allMet
    ? ''
    : recipe.ingredients
        .filter(ing => _craftGetHave(ing.item) < ing.qty)
        .map(ing => escapeHtml(ing.item))
        .join(', ');
  card.innerHTML =
    `<div style="margin-top:4px;padding-bottom:4px;">` +
    `<div style="font-size:11px;font-weight:bold;display:flex;flex-wrap:wrap;gap:4px;align-items:center;">` +
    `<span style="flex:1;">${escapeHtml(recipe.name.toUpperCase())}</span>` +
    `${skillHtml}` +
    `<span style="display:flex;gap:3px;align-items:center;flex-shrink:0;">` +
    `<input type="number" id="craftQty_${ri}" value="1" min="1" max="${Math.max(1, maxBatch)}" style="width:38px;font-size:11px;">` +
    `<button class="btn-sm action-btn" onclick="craftSetMax(${ri},${maxBatch})" style="padding:0 5px;font-size:10px;">MAX</button>` +
    `<button class="btn-sm action-btn" data-ridx="${ri}" onclick="doCraft(parseInt(this.dataset.ridx))" style="${allMet ? '' : 'opacity:0.45;'}padding:0 7px;font-size:10px;">CRAFT</button>` +
    `</span></div>` +
    `<div style="margin-top:1px;">${ingHtml}</div>` +
    (missingItems
      ? `<div style="font-size:9px;color:var(--robco-danger);opacity:0.85;">MISSING: ${missingItems}</div>`
      : '') +
    `</div>`;
}

function renderScrapCard() {
  const card = document.getElementById('scrapItemCard');
  if (!card) return;
  const sel = document.getElementById('scrapItemSelect');
  const bi = sel ? parseInt(sel.value) : 0;
  const breakdowns =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.breakdowns)
      ? FALLOUT_REGISTRY.breakdowns
      : [];
  const breakdown = breakdowns[bi];
  if (!breakdown) {
    card.innerHTML = '';
    return;
  }
  const have = _craftGetHave(breakdown.item);
  const yieldPreview = breakdown.yields.map(y => `${y.qty}× ${escapeHtml(y.item)}`).join(', ');
  card.innerHTML =
    `<div style="font-size:11px;margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;">` +
    `<span style="flex:1;">${escapeHtml(breakdown.item.toUpperCase())}</span>` +
    `<span style="font-size:10px;opacity:0.6;">→ ${yieldPreview}</span>` +
    `<span style="display:flex;gap:3px;align-items:center;flex-shrink:0;">` +
    `<span style="font-size:10px;opacity:0.6;margin-right:2px;">have: ${have}</span>` +
    `<input type="number" id="scrapQty_${bi}" value="1" min="1" max="${Math.max(1, have)}" style="width:38px;font-size:11px;">` +
    `<button class="btn-sm action-btn" data-bidx="${bi}" onclick="doScrap(parseInt(this.dataset.bidx))" style="padding:0 7px;font-size:10px;">SCRAP</button>` +
    `</span></div>`;
}

function renderCraft() {
  const recipeList = document.getElementById('craftRecipeList');
  const scrapList = document.getElementById('craftScrapList');
  if (!recipeList || !scrapList) return;

  const recipes =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.recipes)
      ? FALLOUT_REGISTRY.recipes
      : [];
  const breakdowns =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.breakdowns)
      ? FALLOUT_REGISTRY.breakdowns
      : [];
  const fabStatus = document.getElementById('opsFabStatus');
  if (fabStatus)
    fabStatus.textContent = recipes.length + ' RECIPES · ' + breakdowns.length + ' BREAKDOWNS';

  // ── Recipe picker ──────────────────────────────────────────────
  if (recipes.length === 0) {
    recipeList.innerHTML = '<span class="empty-state">No recipes for this game.</span>';
  } else {
    const prevVal = (document.getElementById('craftRecipeSelect') || {}).value || '0';
    const stations = [];
    recipes.forEach(r => {
      if (!stations.includes(r.station)) stations.push(r.station);
    });
    const optgroups = stations
      .map(station => {
        const opts = recipes
          .filter(r => r.station === station)
          .map(r => {
            const ri = recipes.indexOf(r);
            return `<option value="${ri}">${escapeHtml(r.name)}</option>`;
          })
          .join('');
        return `<optgroup label="${escapeHtml(station.toUpperCase())}">${opts}</optgroup>`;
      })
      .join('');
    recipeList.innerHTML =
      `<select id="craftRecipeSelect" onchange="renderCraftCard()" style="width:100%;margin-bottom:6px;">${optgroups}</select>` +
      `<div id="craftRecipeCard"></div>`;
    const newSel = document.getElementById('craftRecipeSelect');
    if (newSel) {
      newSel.value = prevVal;
      if (!newSel.value) newSel.selectedIndex = 0;
    }
    renderCraftCard();
  }

  // ── Scrap picker ──────────────────────────────────────────────
  if (breakdowns.length === 0) {
    scrapList.innerHTML =
      '<div style="font-size:11px;opacity:0.5;padding:2px 0;">No breakdown recipes for this game.</div>';
  } else {
    const prevScrapVal = (document.getElementById('scrapItemSelect') || {}).value || '0';
    const scrapOpts = breakdowns
      .map(b => {
        const bi = breakdowns.indexOf(b);
        return `<option value="${bi}">${escapeHtml(b.item)}</option>`;
      })
      .join('');
    scrapList.innerHTML =
      `<select id="scrapItemSelect" onchange="renderScrapCard()" style="width:100%;margin-bottom:4px;">${scrapOpts}</select>` +
      `<div id="scrapItemCard"></div>`;
    const newScrapSel = document.getElementById('scrapItemSelect');
    if (newScrapSel) {
      newScrapSel.value = prevScrapVal;
      if (!newScrapSel.value) newScrapSel.selectedIndex = 0;
    }
    renderScrapCard();
  }
}

// _craftPrepare(recipeIdx) — pure lookup/validation step shared by doCraft() and
// tests: resolves the recipe + requested qty + missing-ingredient check without
// mutating anything. Returns null if the recipe index is invalid.
function _craftPrepare(recipeIdx) {
  const recipes =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.recipes)
      ? FALLOUT_REGISTRY.recipes
      : [];
  const recipe = recipes[recipeIdx];
  if (!recipe) return null;

  const qtyEl = document.getElementById('craftQty_' + recipeIdx);
  const qty = Math.max(1, parseInt(qtyEl ? qtyEl.value : '1') || 1);
  const missing = recipe.ingredients.filter(ing => _craftGetHave(ing.item) < ing.qty * qty);
  const consumeList = recipe.ingredients.map(ing => `${ing.qty * qty}× ${ing.item}`).join(', ');
  const outputQty = recipe.output.qty * qty;
  return { recipe, qty, missing, consumeList, outputQty };
}

// _craftApply(recipe, qty, outputQty) — the synchronous mutation core (consume
// ingredients, add output), separated from the confirm gate so it is directly
// testable without mocking confirmAction() (Step 2 Phase 0 U12 split).
function _craftApply(recipe, qty, outputQty) {
  recipe.ingredients.forEach(ing => _craftConsume(ing.item, ing.qty * qty));

  if (recipe.output.ammo) {
    if (!state.ammo) state.ammo = {};
    const key = recipe.output.item;
    state.ammo[key] = (state.ammo[key] || 0) + outputQty;
    if (typeof renderAmmo === 'function') renderAmmo();
  } else {
    const dbEntry =
      typeof lookupItemInDb === 'function' ? lookupItemInDb(recipe.output.item) : null;
    const ex = (state.inventory || []).find(
      i => i.name.toLowerCase() === recipe.output.item.toLowerCase()
    );
    if (ex) {
      ex.qty += outputQty;
    } else {
      if (!state.inventory) state.inventory = [];
      state.inventory.push({
        name: recipe.output.item,
        qty: outputQty,
        wgt: dbEntry ? dbEntry.wgt : 0,
        val: dbEntry ? dbEntry.val : 0,
        type: dbEntry ? dbEntry.type : 'misc',
      });
    }
    if (typeof renderInventory === 'function') renderInventory();
  }
  if (typeof updateMath === 'function') updateMath();
  renderCraft();
  saveState();
  RobcoEvents.emit('craft.completed', { name: recipe.output.item, qty: outputQty }); // U8 auto-log
  if (typeof appendToChat === 'function')
    appendToChat(`> [CRAFT] Built ${qty}× ${recipe.name}.`, 'sys');
}

async function doCraft(recipeIdx) {
  const prep = _craftPrepare(recipeIdx);
  if (!prep) return;
  const { recipe, qty, missing, consumeList, outputQty } = prep;

  if (missing.length > 0) {
    if (typeof appendToChat === 'function')
      appendToChat(
        '> [CRAFT] FAILED — Missing: ' + missing.map(i => i.item).join(', ') + '.',
        'sys'
      );
    return;
  }

  const ok = await confirmAction({
    title: '> CONFIRM CRAFT',
    warning: `Craft ${qty}× ${recipe.name}?\n\nConsumes: ${consumeList}\nProduces: ${outputQty}× ${recipe.output.item}`,
    confirmLabel: 'CRAFT',
  });
  if (!ok) return;

  _craftApply(recipe, qty, outputQty);
}

// _scrapPrepare(bdIdx) — pure lookup/validation step shared by doScrap() and
// tests (Step 2 Phase 0 U12 split — mirrors _craftPrepare).
function _scrapPrepare(bdIdx) {
  const breakdowns =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.breakdowns)
      ? FALLOUT_REGISTRY.breakdowns
      : [];
  const breakdown = breakdowns[bdIdx];
  if (!breakdown) return null;

  const qtyEl = document.getElementById('scrapQty_' + bdIdx);
  const qty = Math.max(1, parseInt(qtyEl ? qtyEl.value : '1') || 1);
  const have = _craftGetHave(breakdown.item);
  const yieldStr = breakdown.yields.map(y => `${y.qty * qty}× ${y.item}`).join(', ');
  return { breakdown, qty, have, yieldStr };
}

// _scrapApply(breakdown, qty, yieldStr) — the synchronous mutation core, separated
// from the confirm gate so it is directly testable (Step 2 Phase 0 U12 split).
function _scrapApply(breakdown, qty, yieldStr) {
  _craftConsume(breakdown.item, qty);

  breakdown.yields.forEach(y => {
    const totalYield = y.qty * qty;
    const dbEntry = typeof lookupItemInDb === 'function' ? lookupItemInDb(y.item) : null;
    if (!state.inventory) state.inventory = [];
    const ex = state.inventory.find(i => i.name.toLowerCase() === y.item.toLowerCase());
    if (ex) {
      ex.qty += totalYield;
    } else {
      state.inventory.push({
        name: y.item,
        qty: totalYield,
        wgt: dbEntry ? dbEntry.wgt : 0,
        val: dbEntry ? dbEntry.val : 0,
        type: dbEntry ? dbEntry.type : 'misc',
      });
    }
  });

  if (typeof renderInventory === 'function') renderInventory();
  if (typeof updateMath === 'function') updateMath();
  renderCraft();
  saveState();
  RobcoEvents.emit('craft.scrapped', { name: breakdown.item, qty }); // U8 auto-log
  if (typeof appendToChat === 'function')
    appendToChat(`> [SCRAP] Scrapped ${qty}× ${breakdown.item} → ${yieldStr}.`, 'sys');
}

async function doScrap(bdIdx) {
  const prep = _scrapPrepare(bdIdx);
  if (!prep) return;
  const { breakdown, qty, have, yieldStr } = prep;

  if (have < qty) {
    if (typeof appendToChat === 'function')
      appendToChat(`> [SCRAP] FAILED — Need ${qty}× ${breakdown.item}, have ${have}.`, 'sys');
    return;
  }

  const ok = await confirmAction({
    title: '> CONFIRM SCRAP',
    warning: `Scrap ${qty}× ${breakdown.item}?\n\nProduces: ${yieldStr}`,
    confirmLabel: 'SCRAP',
  });
  if (!ok) return;

  _scrapApply(breakdown, qty, yieldStr);
}

// ── WU-N2: TRADE — native barter terminal ────────────────────────────────
// Deterministic, offline, no AI. Prices come from the WU-D4b barter coefficients
// in GAME_DEFS[ctx].barter (game-agnostic, Protocol 38):
//   buyMult  = buyBase  − slopePerPoint × barter   (1.55 → 1.10 over barter 0→100)
//   sellMult = sellBase + slopePerPoint × barter   (0.45 → 0.90 over barter 0→100)
// buy price always ≥ item value (buyMult ≥ 1.10) and sell < buy (vendor margin) by
// construction — the canon ranges Suite 104 locked. Mutations are additive + confirm-gated
// (Protocol 34); never auto-pushed to cloud. WU-N2 stock = the full item DB catalog
// (per-vendor VENDOR_STOCK deferred to Round 2 / WU-D4d).
let _tradeVendorIdx = 0;

function _tradeBarterCoef() {
  const ctx = typeof getGameContext === 'function' ? getGameContext() : 'FNV';
  const def = (typeof GAME_DEFS !== 'undefined' && (GAME_DEFS[ctx] || GAME_DEFS.FNV)) || {};
  return def.barter || { buyBase: 1.55, sellBase: 0.45, slopePerPoint: 0.0045 };
}
function _tradeBarterSkill() {
  return Math.max(0, Math.min(100, (state.skills && state.skills.barter) || 0));
}
// Buy price = round(value × (buyBase − slope×barter)), floored at 1 cap.
function _tradeBuyPrice(value) {
  const c = _tradeBarterCoef();
  return Math.max(
    1,
    Math.round((value || 0) * (c.buyBase - c.slopePerPoint * _tradeBarterSkill()))
  );
}
// Sell price = round(value × (sellBase + slope×barter)), clamped ≥ 0.
function _tradeSellPrice(value) {
  const c = _tradeBarterCoef();
  return Math.max(
    0,
    Math.round((value || 0) * (c.sellBase + c.slopePerPoint * _tradeBarterSkill()))
  );
}

function setTradeVendor(idx) {
  _tradeVendorIdx = parseInt(idx) || 0;
  const vendors = typeof getVendors === 'function' ? getVendors() : [];
  if (_tradeVendorIdx < 0 || _tradeVendorIdx >= vendors.length) _tradeVendorIdx = 0;
  // Update the purse line + buy/sell lists for the newly-selected vendor WITHOUT
  // rebuilding the vendor <select> — it is mid-change-event, and replacing the element
  // that is dispatching its own change left the purse/lists stale on real devices (WU-N2 fix).
  _renderTradeStats();
  renderTradeBuyList();
  renderTradeSellList();
}

// Updates only the CAPS / VENDOR PURSE / BARTER line (#tradeStats) for the active vendor —
// split out so a vendor switch never rebuilds the <select> mid-change (see setTradeVendor).
function _renderTradeStats() {
  const stats = document.getElementById('tradeStats');
  if (!stats) return;
  const vendors = typeof getVendors === 'function' ? getVendors() : [];
  const v = vendors[_tradeVendorIdx];
  stats.innerHTML =
    `<span>CAPS: <b>${state.caps || 0}</b></span>` +
    `<span>VENDOR PURSE: <b>${v ? v.baseCaps : 0}</b></span>` +
    `<span>BARTER: <b>${_tradeBarterSkill()}</b></span>`;
  const boardStatus = document.getElementById('opsBarterStatus');
  if (boardStatus && v)
    boardStatus.textContent =
      v.name.toUpperCase() +
      (v.location ? ' — ' + v.location.toUpperCase() : '') +
      ' · PURSE ' +
      v.baseCaps +
      ' CAPS';
}

function renderTrade() {
  const header = document.getElementById('tradeHeader');
  if (!header) return;
  const vendors = typeof getVendors === 'function' ? getVendors() : [];
  const buyList = document.getElementById('tradeBuyList');
  const sellList = document.getElementById('tradeSellList');
  if (!vendors.length) {
    header.innerHTML = '<span class="empty-state">No vendor data for this game.</span>';
    if (buyList) buyList.innerHTML = '';
    if (sellList) sellList.innerHTML = '';
    const boardStatus = document.getElementById('opsBarterStatus');
    if (boardStatus) boardStatus.textContent = 'NO VENDOR DATA';
    return;
  }
  if (_tradeVendorIdx < 0 || _tradeVendorIdx >= vendors.length) _tradeVendorIdx = 0;
  const opts = vendors
    .map(
      (vd, i) =>
        `<option value="${i}"${i === _tradeVendorIdx ? ' selected' : ''}>${escapeHtml(vd.name)}${vd.location ? ' — ' + escapeHtml(vd.location) : ''}</option>`
    )
    .join('');
  header.innerHTML =
    `<select id="tradeVendorSelect" aria-label="Select vendor" onchange="setTradeVendor(this.value)" style="width:100%;font-size:16px;min-height:28px;margin-bottom:4px;">${opts}</select>` +
    `<div id="tradeStats" style="font-size:11px;display:flex;flex-wrap:wrap;gap:10px;"></div>`;
  _renderTradeStats();
  renderTradeBuyList();
  renderTradeSellList();
}

function renderTradeBuyList() {
  const list = document.getElementById('tradeBuyList');
  if (!list) return;
  const searchEl = document.getElementById('tradeBuySearch');
  const q = (searchEl ? searchEl.value : '').toLowerCase().trim();
  const catalog = typeof getTradeCatalog === 'function' ? getTradeCatalog() : [];
  const caps = state.caps || 0;
  const MAX = 40;
  const all = q ? catalog.filter(it => it.name.toLowerCase().includes(q)) : catalog;
  const shown = all.slice(0, MAX);
  if (!shown.length) {
    list.innerHTML = '<span class="empty-state">No catalog item matches.</span>';
    return;
  }
  list.innerHTML =
    shown
      .map(it => {
        const price = _tradeBuyPrice(it.value);
        const afford = caps >= price;
        return (
          `<div class="trade-row"><span class="trade-name">${escapeHtml(it.name)}</span>` +
          `<span class="trade-price">${price}c</span>` +
          `<button class="btn-sm action-btn trade-btn" data-tname="${escapeHtml(it.name)}" onclick="doBuy(this.dataset.tname)" aria-label="Buy ${escapeHtml(it.name)} for ${price} caps"${afford ? '' : ' style="opacity:0.45;"'}>BUY</button></div>`
        );
      })
      .join('') +
    (all.length > MAX
      ? `<div class="empty-state" style="font-size:9px;">+${all.length - MAX} more — refine search</div>`
      : '');
}

function renderTradeSellList() {
  const list = document.getElementById('tradeSellList');
  if (!list) return;
  const vendors = typeof getVendors === 'function' ? getVendors() : [];
  const purse = vendors[_tradeVendorIdx] ? vendors[_tradeVendorIdx].baseCaps : 0;
  const inv = state.inventory || [];
  if (!inv.length) {
    list.innerHTML =
      '<span class="empty-state">Courier inventory empty. (Ammo is not priced by the DB.)</span>';
    return;
  }
  list.innerHTML = inv
    .map(it => {
      const db = typeof lookupItemInDb === 'function' ? lookupItemInDb(it.name) : null;
      const val = (it.val != null ? it.val : db ? db.val : 0) || 0;
      const price = _tradeSellPrice(val);
      const canPay = purse >= price;
      return (
        `<div class="trade-row"><span class="trade-name">${escapeHtml(it.name)} ×${it.qty || 1}</span>` +
        `<span class="trade-price">${price}c</span>` +
        `<button class="btn-sm action-btn trade-btn" data-tname="${escapeHtml(it.name)}" onclick="doSell(this.dataset.tname)" aria-label="Sell ${escapeHtml(it.name)} for ${price} caps"${canPay ? '' : ' style="opacity:0.45;"'}>SELL</button></div>`
      );
    })
    .join('');
}

async function doBuy(name) {
  const catalog = typeof getTradeCatalog === 'function' ? getTradeCatalog() : [];
  const item = catalog.find(i => i.name.toLowerCase() === String(name).toLowerCase());
  if (!item) return;
  const price = _tradeBuyPrice(item.value);
  const caps = state.caps || 0;
  if (caps < price) {
    if (typeof appendToChat === 'function')
      appendToChat(
        `> [TRADE] ⚠ INSUFFICIENT CAPS — ${item.name} costs ${price}c, you have ${caps}c.`,
        'sys'
      );
    return;
  }
  const ok = await confirmAction({
    title: '> CONFIRM PURCHASE',
    warning: `Buy ${item.name} for ${price} caps?\n\nCaps: ${caps} → ${caps - price}`,
    confirmLabel: 'BUY',
  });
  if (!ok) return;
  state.caps = caps - price;
  // Mirror to the #c_caps field — it is the sync source-of-truth that saveState() reads back
  // via syncStateFromDom(); without this the deduction is reverted on the next save (WU-N2 fix).
  const _capsBuyEl = document.getElementById('c_caps');
  if (_capsBuyEl) _capsBuyEl.value = state.caps;
  const db = typeof lookupItemInDb === 'function' ? lookupItemInDb(item.name) : null;
  if (!state.inventory) state.inventory = [];
  const ex = state.inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
  if (ex) {
    ex.qty = (ex.qty || 1) + 1;
  } else {
    state.inventory.push({
      name: item.name,
      qty: 1,
      wgt: db ? db.wgt : 0,
      val: db ? db.val : item.value,
      type: db ? db.type : item.type,
    });
  }
  if (typeof renderInventory === 'function') renderInventory();
  if (typeof updateMath === 'function') updateMath();
  renderTrade();
  saveState();
  RobcoEvents.emit('trade.bought', { name: item.name, price }); // U8 auto-log
  if (typeof appendToChat === 'function')
    appendToChat(`> [TRADE] Bought ${item.name} for ${price}c. Caps: ${state.caps}.`, 'sys');
}

async function doSell(name) {
  const idx = (state.inventory || []).findIndex(
    i => i.name.toLowerCase() === String(name).toLowerCase()
  );
  if (idx === -1) return;
  const it = state.inventory[idx];
  const db = typeof lookupItemInDb === 'function' ? lookupItemInDb(it.name) : null;
  const val = (it.val != null ? it.val : db ? db.val : 0) || 0;
  const price = _tradeSellPrice(val);
  const vendors = typeof getVendors === 'function' ? getVendors() : [];
  const purse = vendors[_tradeVendorIdx] ? vendors[_tradeVendorIdx].baseCaps : 0;
  if (purse < price) {
    if (typeof appendToChat === 'function')
      appendToChat(
        `> [TRADE] ⚠ VENDOR CANNOT AFFORD — ${it.name} sells for ${price}c, vendor purse is ${purse}c.`,
        'sys'
      );
    return;
  }
  const caps = state.caps || 0;
  const ok = await confirmAction({
    title: '> CONFIRM SALE',
    warning: `Sell ${it.name} for ${price} caps?\n\nCaps: ${caps} → ${caps + price}`,
    confirmLabel: 'SELL',
  });
  if (!ok) return;
  state.caps = caps + price;
  // Mirror to the #c_caps field (sync source-of-truth) so the gain survives saveState (WU-N2 fix).
  const _capsSellEl = document.getElementById('c_caps');
  if (_capsSellEl) _capsSellEl.value = state.caps;
  it.qty = (it.qty || 1) - 1;
  if (it.qty <= 0) state.inventory.splice(idx, 1);
  if (typeof renderInventory === 'function') renderInventory();
  if (typeof updateMath === 'function') updateMath();
  renderTrade();
  saveState();
  RobcoEvents.emit('trade.sold', { name: it.name, price }); // U8 auto-log
  if (typeof appendToChat === 'function')
    appendToChat(`> [TRADE] Sold ${it.name} for ${price}c. Caps: ${state.caps}.`, 'sys');
}

// ── WU-N6: LOOT — deterministic add/value (hybrid) ────────────────────────
// A native "add salvaged loot to inventory" terminal. Pick any priced item from
// the active game's DB catalog (getTradeCatalog — weapons/armor/chems/misc), set a
// quantity, and ADD it: the item is pushed ADDITIVELY to state.inventory[]
// (find-or-increment), its weight/value/type read from the DB (lookupItemInDb — the
// Value column). The add/value math is fully deterministic — no AI. Each ADD is
// confirm-gated (Protocol 34). The generative drop-table (what a defeated enemy
// drops) is deferred; only the deterministic add/value is in scope here. Game-agnostic
// (Protocol 38): getTradeCatalog/lookupItemInDb read the active game's databaseCSVs.
// All user-/data-derived text runs through escapeHtml before innerHTML (XSS-safe).

// Pure additive merge — deterministic loot math, unit-testable (no DOM, no state).
// Returns a NEW inventory array with `qty` of the item added (find-or-increment);
// weight/value/type sourced from the DB row, falling back to the catalog entry.
function _lootAdd(inventory, item, qty, db) {
  const inv = Array.isArray(inventory) ? inventory.map(i => ({ ...i })) : [];
  const n = Math.max(1, Math.floor(Number(qty) || 1));
  const ex = inv.find(i => String(i.name).toLowerCase() === String(item.name).toLowerCase());
  if (ex) {
    ex.qty = (ex.qty || 1) + n;
  } else {
    inv.push({
      name: item.name,
      qty: n,
      wgt: db ? db.wgt : 0,
      val: db && db.val != null ? db.val : item.value,
      type: db ? db.type : item.type,
    });
  }
  return inv;
}

// Quick-Draw Holster (Tool Deck unit) — renders the four gear-vector sockets from
// state.padBindings. Idempotent + safe to call while the deck is hidden (the socket
// elements exist in the DOM, just not visible). Gear names go through textContent /
// setAttribute only (never innerHTML), so an arbitrary player-typed gear name has no
// HTML-injection surface — no escapeHtml needed for this render path.
function renderHolster() {
  const DIRS = [
    { dir: 'UP', glyph: 'up' },
    { dir: 'LEFT', glyph: 'left' },
    { dir: 'RIGHT', glyph: 'right' },
    { dir: 'DOWN', glyph: 'down' },
  ];
  const pb = state.padBindings || {};
  DIRS.forEach(({ dir, glyph }) => {
    const socket = document.querySelector(`.socket[data-dir="${dir}"]`);
    if (!socket) return;
    const gear = pb[glyph];
    const gearEl = socket.querySelector('.socket-gear');
    if (gear) {
      socket.classList.add('bound');
      if (gearEl) gearEl.textContent = gear.toUpperCase();
      socket.setAttribute('aria-label', `Fire gear vector ${glyph} — ${gear}`);
    } else {
      socket.classList.remove('bound');
      if (gearEl) gearEl.textContent = 'EMPTY';
      socket.setAttribute('aria-label', `Gear vector ${glyph} — empty socket`);
    }
  });
}

function renderLoot(arg) {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> SALVAGE / LOOT';
  const pre = (arg || '').trim();
  content.innerHTML =
    '<div class="loot-controls">' +
    `<input type="text" id="lootSearch" placeholder="Search items…" aria-label="Search loot items" oninput="renderLootList()" value="${escapeHtml(pre)}" style="flex:1;min-width:0;font-size:16px;min-height:28px;" />` +
    '<label class="loot-qty-label">QTY <input type="number" id="lootQty" value="1" min="1" max="999" aria-label="Quantity to add" style="width:56px;font-size:16px;min-height:28px;" /></label>' +
    '</div>' +
    '<div id="lootList" class="loot-list"></div>' +
    '<div class="loot-hint">Values from the active database. Adds are additive and confirm-gated.</div>';
  renderLootList();
  if (typeof openModal === 'function') openModal();
}

function renderLootList() {
  const list = document.getElementById('lootList');
  if (!list) return;
  const searchEl = document.getElementById('lootSearch');
  const q = (searchEl ? searchEl.value : '').toLowerCase().trim();
  const catalog = typeof getTradeCatalog === 'function' ? getTradeCatalog() : [];
  const MAX = 40;
  const all = q ? catalog.filter(it => it.name.toLowerCase().includes(q)) : catalog;
  const shown = all.slice(0, MAX);
  if (!shown.length) {
    list.innerHTML = '<span class="empty-state">No catalog item matches.</span>';
    return;
  }
  list.innerHTML =
    shown
      .map(it => {
        const val = Math.max(0, Math.round(Number(it.value) || 0));
        return (
          `<div class="loot-row"><span class="loot-name">${escapeHtml(it.name)}</span>` +
          `<span class="loot-val">${val}c</span>` +
          `<button class="btn-sm action-btn loot-btn" data-lname="${escapeHtml(it.name)}" onclick="doLoot(this.dataset.lname)" aria-label="Add ${escapeHtml(it.name)} to inventory">ADD</button></div>`
        );
      })
      .join('') +
    (all.length > MAX
      ? `<div class="empty-state" style="font-size:9px;">+${all.length - MAX} more — refine search</div>`
      : '');
}

async function doLoot(name) {
  const catalog = typeof getTradeCatalog === 'function' ? getTradeCatalog() : [];
  const item = catalog.find(i => i.name.toLowerCase() === String(name).toLowerCase());
  if (!item) return;
  const qtyEl = document.getElementById('lootQty');
  let qty = qtyEl ? parseInt(qtyEl.value, 10) : 1;
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  if (qty > 999) qty = 999;
  const db = typeof lookupItemInDb === 'function' ? lookupItemInDb(item.name) : null;
  const unitVal = Math.max(0, Math.round(Number(db && db.val != null ? db.val : item.value) || 0));
  const ok = await confirmAction({
    title: '> CONFIRM ADD',
    warning: `Add ${qty}× ${item.name} (${unitVal}c each) to inventory?`,
    confirmLabel: 'ADD',
  });
  if (!ok) return;
  state.inventory = _lootAdd(state.inventory, item, qty, db);
  if (typeof renderInventory === 'function') renderInventory();
  if (typeof updateMath === 'function') updateMath();
  renderLootList();
  saveState();
  if (typeof appendToChat === 'function')
    appendToChat(
      `> [LOOT] Added ${qty}× ${item.name} (${unitVal * qty}c total) to inventory.`,
      'sys'
    );
}

// ── WU-N3: THREAT — native bestiary assessment + TTK ──────────────────────
// Pure combat math (no DOM) so the gate can unit-test it. Read-only. Floors
// avoid divide-by-zero / negative effective damage when DT meets/exceeds output.
//   weaponDPS   = baseDamage × aps
//   TTK         = ceil(HP / max(1, weaponDPS − DT))                 (seconds)
//   shotsToKill = ceil(HP / max(1, baseDamage − DT))                (hits)
//   ammoBurn    = shotsToKill × ammoPerAttack   (WU-D4c coefficient; default 1)
function _threatCompute(enemy, weapon, ammoPerAttack) {
  const hp = Math.max(0, Number(enemy && enemy.hp) || 0);
  const dt = Math.max(0, Number(enemy && enemy.dt) || 0);
  if (!weapon) {
    return {
      hasWeapon: false,
      hp,
      dt,
      ttk: null,
      shotsToKill: null,
      ammoBurn: null,
      weaponDPS: 0,
      effectiveDPS: 0,
      perShot: 0,
    };
  }
  const baseDamage = Math.max(0, Number(weapon.baseDamage) || 0);
  const aps = Math.max(0, Number(weapon.aps) || 0);
  const perAttack = Math.max(1, Number(ammoPerAttack) || 1);
  const weaponDPS = baseDamage * aps;
  const effectiveDPS = Math.max(1, weaponDPS - dt);
  const perShot = Math.max(1, baseDamage - dt);
  const ttk = Math.ceil(hp / effectiveDPS);
  const shotsToKill = Math.ceil(hp / perShot);
  const ammoBurn = shotsToKill * perAttack;
  return {
    hasWeapon: true,
    hp,
    dt,
    baseDamage,
    aps,
    perAttack,
    weaponDPS,
    effectiveDPS,
    perShot,
    ttk,
    shotsToKill,
    ammoBurn,
  };
}

// renderThreat — native THREAT ASSESSMENT modal. BESTIARY.CSV lookup on the
// typed target → enemy stat card + TTK + ammo-burn vs the equipped weapon +
// weakness highlight. NO ENTRY IN BESTIARY when absent (Protocol 3 — never
// invent). Game-agnostic: ammoPerAttack comes from GAME_DEFS (Protocol 38).
function renderThreat(target) {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> THREAT ASSESSMENT';

  const q = (target || '').trim();
  const enemy = q && typeof lookupBestiaryEntry === 'function' ? lookupBestiaryEntry(q) : null;

  if (!enemy) {
    content.innerHTML =
      '<pre class="threat-empty" style="white-space:pre-wrap;font-family:inherit;margin:0;color:var(--robco-dim);">' +
      (q
        ? 'NO ENTRY IN BESTIARY: ' + escapeHtml(q)
        : 'SPECIFY A TARGET — e.g. &gt; [THREAT] Deathclaw') +
      '</pre>';
    if (typeof openModal === 'function') openModal();
    if (typeof appendToChat === 'function')
      appendToChat(
        '> [THREAT] ' + (q ? 'No bestiary entry found for that target.' : 'No target specified.'),
        'sys'
      );
    return;
  }

  const weaponName = (state.equipped && state.equipped.weapon) || null;
  const weapon =
    weaponName && typeof lookupWeaponStats === 'function' ? lookupWeaponStats(weaponName) : null;
  const ctx = typeof getGameContext === 'function' ? getGameContext() : state.gameContext || 'FNV';
  const def = (window.GAME_DEFS && (GAME_DEFS[ctx] || GAME_DEFS.FNV)) || {};
  const ammoPerAttack = typeof def.ammoPerAttack === 'number' ? def.ammoPerAttack : 1;
  const m = _threatCompute(enemy, weapon, ammoPerAttack);

  const row = (label, value) =>
    `<div class="threat-row"><span class="threat-label">${label}</span><span class="threat-val">${value}</span></div>`;
  const weak = enemy.weakness && enemy.weakness.toLowerCase() !== 'none' ? enemy.weakness : null;

  let html = '<div class="threat-card">';
  html += `<div class="threat-name">${escapeHtml(enemy.name)}</div>`;
  html += '<div class="threat-stats">';
  html += row('HP', String(enemy.hp));
  html += row('DT', String(enemy.dt));
  html += row('BASE DMG', String(enemy.baseDamage));
  html += row('ATK RATE', enemy.attackRate + '/s');
  if (enemy.attackType) html += row('ATK TYPE', escapeHtml(enemy.attackType));
  if (enemy.resistances && enemy.resistances.toLowerCase() !== 'none')
    html += row('RESIST', escapeHtml(enemy.resistances));
  html += '</div>';

  html += weak
    ? `<div class="threat-weakness">&#9668; WEAKNESS: ${escapeHtml(weak)} &#9658;</div>`
    : '<div class="threat-weakness threat-weakness--none">NO RECORDED WEAKNESS</div>';

  html += '<div class="threat-calc">';
  if (m.hasWeapon) {
    // Canonical melee-scope rule (reuse _vatsIsMelee): melee/unarmed weapons burn
    // no ammo, so report strikes-to-kill instead of an ammo-burn round count.
    const isMelee =
      typeof _vatsIsMelee === 'function'
        ? _vatsIsMelee(weapon)
        : !weapon.ammoType || weapon.ammoType.toLowerCase() === 'none';
    html += `<div class="threat-ttk">TIME TO NEUTRALIZE: ${m.ttk}s</div>`;
    if (isMelee) {
      html += `<div class="threat-ammo">HITS TO NEUTRALIZE: ${m.shotsToKill} strike${m.shotsToKill === 1 ? '' : 's'} (melee &mdash; no ammo)</div>`;
    } else {
      html += `<div class="threat-ammo">AMMO BURN EST.: ${m.ammoBurn} round${m.ammoBurn === 1 ? '' : 's'} (${m.shotsToKill} hit${m.shotsToKill === 1 ? '' : 's'})</div>`;
      const at = (weapon.ammoType || '').trim();
      if (at) {
        html += `<div class="threat-weapon">AMMO TYPE: ${escapeHtml(at)}</div>`;
        // Reserve check: compare the projected burn against ammo actually on hand
        // (Protocol 22 — reuses the craft-panel case-insensitive lookup).
        const reserve = typeof _craftGetHave === 'function' ? _craftGetHave(at) : null;
        if (reserve !== null) {
          const short = reserve < m.ammoBurn;
          html += `<div class="threat-ammo-advisory${short ? ' threat-ammo-advisory--low' : ''}">${short ? '⚠ INSUFFICIENT RESERVES' : 'RESERVES SUFFICIENT'}: ${reserve}/${m.ammoBurn} ${escapeHtml(at)} on hand</div>`;
        }
      }
    }
    html += `<div class="threat-weapon">VS ${escapeHtml(weapon.name)} &mdash; DPS ${Math.round(m.weaponDPS)} / EFF ${Math.round(m.effectiveDPS)} after DT</div>`;
  } else {
    html += '<div class="threat-note">EQUIP A WEAPON FOR TTK + AMMO-BURN ESTIMATE.</div>';
  }
  html += '</div></div>';

  content.innerHTML = html;
  if (typeof openModal === 'function') openModal();
  if (typeof appendToChat === 'function')
    appendToChat(
      `> [THREAT] ${enemy.name} assessed${m.hasWeapon ? ` — TTK ${m.ttk}s, ${m.ammoBurn} rounds` : ''}.`,
      'sys'
    );
}

// ── WU-N4: CONSULT — native databank lookup ──────────────────────────────
// `> CONSULT <topic>` → exact local records from FALLOUT_REGISTRY (items/perks/quests/
// locations/companions via registrySearch) + DB stat cross-reference (lookupItemInDb /
// lookupWeaponStats / lookupBestiaryEntry). Deterministic, offline, read-only, no AI.
// Shows NO ENTRY IN DATABANK when nothing matches (Protocol 3 — never invents records).
// Game-agnostic (Protocol 38): FALLOUT_REGISTRY + databaseCSVs are the active game's data.
// The user topic is always run through escapeHtml before it reaches innerHTML (XSS-safe).
// U9-4: extended to also search the tracker registries (collectibles/skillBooks/
// magazines/traits/lincolnMemorabilia). registrySearch() already no-ops on a
// category absent from the active game's FALLOUT_REGISTRY (Protocol 38 — no
// per-game branching needed here; FNV lacks lincolnMemorabilia, FO3 lacks
// traits/magazines, and both cases just yield zero hits for that category).
const _CONSULT_CATS = [
  { key: 'items', label: 'ITEMS' },
  { key: 'perks', label: 'PERKS' },
  { key: 'quests', label: 'QUESTS' },
  { key: 'locations', label: 'LOCATIONS' },
  { key: 'companions', label: 'COMPANIONS' },
  { key: 'collectibles', label: 'COLLECTIBLES' },
  { key: 'skillBooks', label: 'SKILL BOOKS' },
  { key: 'magazines', label: 'SKILL MAGAZINES' },
  { key: 'traits', label: 'TRAITS' },
  { key: 'lincolnMemorabilia', label: 'LINCOLN MEMORABILIA' },
];

function _consultDetail(cat, e) {
  if (cat === 'quests') return [e.type, e.dlc].filter(Boolean).join(' · ');
  if (cat === 'perks') return [e.type, e.level ? 'Lvl ' + e.level : ''].filter(Boolean).join(' · ');
  if (cat === 'companions') return e.location || e.fullName || '';
  if (cat === 'collectibles' || cat === 'lincolnMemorabilia') return e.location || '';
  if (cat === 'skillBooks' || cat === 'magazines') return e.skill ? 'Skill: ' + e.skill : '';
  if (cat === 'traits') return e.effect || '';
  return e.type || '';
}

// Shared CONSULT engine (Protocol 22) — pure search core consumed by BOTH the
// CONSULT modal (renderConsult) and the persistent DATABANK panel
// (renderDatabankPanel). No DOM, no side effects: registry hits across every
// category (active game's FALLOUT_REGISTRY) + DB stat cross-reference.
function _consultSearch(topic) {
  const q = (topic || '').trim();
  if (!q)
    return {
      q: '',
      noQuery: true,
      empty: true,
      groups: [],
      creature: null,
      weapon: null,
      dbItem: null,
      questItem: null,
    };
  const groups = [];
  if (typeof registrySearch === 'function') {
    for (const c of _CONSULT_CATS) {
      const hits = registrySearch(c.key, q) || [];
      if (hits.length) groups.push({ key: c.key, label: c.label, hits: hits.slice(0, 5) });
    }
  }
  const creature = typeof lookupBestiaryEntry === 'function' ? lookupBestiaryEntry(q) : null;
  const weapon = typeof lookupWeaponStats === 'function' ? lookupWeaponStats(q) : null;
  const dbItem = typeof lookupItemInDb === 'function' ? lookupItemInDb(q) : null;
  // U9-4: surface the QUEST_ITEMS.CSV Associated_Quest/Special_Property columns
  // lookupItemInDb() doesn't expose (Protocol 22 — same accessor pattern as getChemsTable).
  const questItem = typeof getQuestItemDetail === 'function' ? getQuestItemDetail(q) : null;
  const empty = groups.length === 0 && !creature && !weapon && !dbItem && !questItem;
  return { q, noQuery: false, empty, groups, creature, weapon, dbItem, questItem };
}

// Autocomplete source for the Tool Deck's shared #deckTarget field (wired via
// wireInput() in ui-saves.js, Protocol 22 — the same registry-autocomplete
// singleton every other input already uses, no new mechanism). One field feeds
// several tools (THREAT/VATS = creature, TRADE/LOOT = item, CONSULT = any
// topic), so suggestions combine the same sources CONSULT already searches
// (_CONSULT_CATS via registrySearch) plus bestiary creature names — reusing,
// never forking, the existing lookups. Read-only, no state write. Game-agnostic
// (Protocol 38): every source is registry/DB-driven, never a hardcoded name.
function _deckTargetSuggestions(q) {
  const query = String(q || '').trim();
  if (query.length < 2) return [];
  const out = [];
  if (typeof getBestiaryNames === 'function') {
    const ql = query.toLowerCase();
    getBestiaryNames()
      .filter(n => n.toLowerCase().includes(ql))
      .slice(0, 5)
      .forEach(n => out.push({ name: n, type: 'creature' }));
  }
  if (typeof registrySearch === 'function') {
    _CONSULT_CATS.forEach(c => {
      registrySearch(c.key, query).forEach(entry => {
        out.push({ name: entry.name, type: c.label.toLowerCase() });
      });
    });
  }
  const seen = new Set();
  return out
    .filter(entry => {
      const k = entry.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8);
}

// Shared CONSULT renderer (Protocol 22) — builds the escaped DATABANK result HTML
// string from a _consultSearch() result. Used by both the modal and the panel.
function _consultRenderHTML(res) {
  const pre = msg =>
    '<pre class="consult-empty" style="white-space:pre-wrap;font-family:inherit;margin:0;color:var(--robco-dim);">' +
    msg +
    '</pre>';
  if (res.noQuery) return pre('SPECIFY A QUERY — e.g. &gt; CONSULT Deathclaw');
  if (res.empty) return pre('NO ENTRY IN DATABANK: ' + escapeHtml(res.q));

  let html = '<div class="consult-card">';
  html += `<div class="consult-query">QUERY: ${escapeHtml(res.q)}</div>`;

  const statRows = [];
  if (res.creature) {
    statRows.push(['CREATURE', escapeHtml(res.creature.name)]);
    statRows.push(['HP / DT', `${res.creature.hp} / ${res.creature.dt}`]);
    if (res.creature.weakness && String(res.creature.weakness).toLowerCase() !== 'none')
      statRows.push(['WEAKNESS', escapeHtml(res.creature.weakness)]);
    // U9-4: XP_Yield is parsed by lookupBestiaryEntry() but was never surfaced anywhere.
    if (res.creature.xpYield) statRows.push(['XP YIELD', String(res.creature.xpYield)]);
  }
  if (res.weapon) {
    statRows.push(['WEAPON', escapeHtml(res.weapon.name)]);
    statRows.push(['DMG / APS', `${res.weapon.baseDamage} / ${res.weapon.aps}`]);
    if (res.weapon.ammoType) statRows.push(['AMMO', escapeHtml(res.weapon.ammoType)]);
  }
  if (res.dbItem && !res.weapon && !res.creature) {
    statRows.push(['TYPE', escapeHtml(String(res.dbItem.type || 'misc'))]);
    statRows.push(['WEIGHT / VALUE', `${res.dbItem.wgt} / ${res.dbItem.val}`]);
  }
  // U9-4: QUEST_ITEMS.CSV Associated_Quest/Special_Property — authored data that
  // previously had no consumer anywhere in the app.
  if (res.questItem) {
    if (res.questItem.associatedQuest)
      statRows.push(['ASSOCIATED QUEST', escapeHtml(res.questItem.associatedQuest)]);
    if (res.questItem.specialProperty)
      statRows.push(['SPECIAL PROPERTY', escapeHtml(res.questItem.specialProperty)]);
  }
  if (statRows.length) {
    html += '<div class="consult-stats">';
    statRows.forEach(r => {
      html += `<div class="consult-row"><span class="consult-label">${r[0]}</span><span class="consult-val">${r[1]}</span></div>`;
    });
    html += '</div>';
  }

  res.groups.forEach(g => {
    html += `<div class="consult-group"><div class="consult-cat">${g.label}</div>`;
    g.hits.forEach(e => {
      const d = _consultDetail(g.key, e);
      html +=
        `<div class="consult-hit"><span class="consult-hit-name">${escapeHtml(e.name)}</span>` +
        (d ? `<span class="consult-hit-meta">${escapeHtml(d)}</span>` : '') +
        '</div>';
    });
    html += '</div>';
  });

  html += '</div>';
  return html;
}

// CONSULT modal path (macro button / native router) — one-off lookup in the shared
// sysModal. Same engine as the DATABANK panel, rendered into the modal.
function renderConsult(topic) {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> DATABANK QUERY';
  const res = _consultSearch(topic);
  content.innerHTML = _consultRenderHTML(res);
  if (typeof openModal === 'function') openModal();
  if (typeof appendToChat === 'function') {
    if (res.noQuery) appendToChat('> [CONSULT] No query specified.', 'sys');
    else if (res.empty) appendToChat(`> [CONSULT] No databank entry found for "${res.q}".`, 'sys');
    else appendToChat(`> [CONSULT] Databank record retrieved for "${res.q}".`, 'sys');
  }
}

// DATABANK panel path (DATA tab) — persistent inline lookup. Reads #databankSearch
// and renders the SAME shared CONSULT engine into #databankResults, so the user can
// leave the panel open and keep searching without reopening a modal. Read-only, no AI.
function renderDatabankPanel() {
  const out = document.getElementById('databankResults');
  if (!out) return;
  const inp = document.getElementById('databankSearch');
  const res = _consultSearch(inp ? inp.value : '');
  out.innerHTML = _consultRenderHTML(res);
}

// ── WU-N5: BIO-SCAN — native medical advisory ────────────────────────────
// `> [BIO-SCAN]` → deterministic limb/HP/radiation/addiction readout computed
// entirely from `state` (limbs, hpCur/hpMax, rads, status) cross-referenced with
// the active game's CHEMS data. Pure local rules, read-only, offline, no AI.
// Game-agnostic (Protocol 38): limb labels are generic anatomy and the recommended
// med items are sourced from getChemsTable() — never hardcoded game item names.
// All advisory text is escaped before it reaches innerHTML (XSS-safe).
const _BIO_LIMBS = [
  { key: 'hd', label: 'HEAD' },
  { key: 'la', label: 'LEFT ARM' },
  { key: 'ra', label: 'RIGHT ARM' },
  { key: 'll', label: 'LEFT LEG' },
  { key: 'rl', label: 'RIGHT LEG' },
];

// A chem carries addiction risk when its Addiction_Risk column is a non-zero
// percentage (e.g. "25%") — not blank, "None", or "0%".
function _bioChemHasRisk(c) {
  const r = String((c && c.addictionRisk) || '')
    .trim()
    .toLowerCase();
  return r !== '' && r !== 'none' && !/^0%?$/.test(r);
}

// Pure deterministic core — takes a read-only state snapshot + the CHEMS table and
// returns the structured advisory. Kept side-effect-free so it is unit-testable.
function _bioScanCompute(snap, chems) {
  snap = snap || {};
  chems = Array.isArray(chems) ? chems : [];
  const limbStates = snap.limbs || {};
  const limbs = _BIO_LIMBS.map(l => ({
    key: l.key,
    label: l.label,
    crippled: String(limbStates[l.key] || 'OK').toUpperCase() === 'CRIPPLED',
  }));
  const crippled = limbs.filter(l => l.crippled).map(l => l.label);

  const hpMax = Math.max(1, Number(snap.hpMax) || 1);
  const hpCur = Math.max(0, Number(snap.hpCur) || 0);
  const hpPct = Math.round((hpCur / hpMax) * 100);
  const hpTier = hpPct < 25 ? 'CRITICAL' : hpPct < 60 ? 'WOUNDED' : 'STABLE';

  const rads = Math.max(0, Number(snap.rads) || 0);
  const radTier =
    rads >= 600 ? 'SEVERE' : rads >= 400 ? 'ADVANCED' : rads >= 200 ? 'MINOR' : 'NONE';

  // Recommended med items, sourced from the active game's CHEMS data (Protocol 3 —
  // data is authority). A healer restores HP; a rad-remover clears radiation.
  const healer = (
    chems.find(c => /restore/i.test(c.effect) && /hp/i.test(c.effect) && !/rad/i.test(c.effect)) ||
    {}
  ).name;
  const radRemover = (chems.find(c => /remove/i.test(c.effect) && /rad/i.test(c.effect)) || {})
    .name;
  const healName = healer ? healer.toUpperCase() + ' ADVISED' : 'MEDICAL ATTENTION ADVISED';
  const radName = radRemover ? radRemover.toUpperCase() + ' ADVISED' : 'DECONTAMINATION ADVISED';

  const advisories = [];
  crippled.forEach(label =>
    advisories.push({ kind: 'limb', text: label + ' CRIPPLED — ' + healName })
  );
  if (hpTier === 'CRITICAL') {
    advisories.push({ kind: 'hp', text: 'HP CRITICAL (' + hpPct + '%) — ' + healName });
  } else if (hpTier === 'WOUNDED') {
    advisories.push({ kind: 'hp', text: 'HP LOW (' + hpPct + '%) — ' + healName });
  }
  if (radTier !== 'NONE') {
    advisories.push({
      kind: 'rad',
      text: 'RADIATION ' + radTier + ' (' + rads + ' RADS) — ' + radName,
    });
  }
  // Addiction risk: any active status effect that matches an addictive chem.
  const seen = new Set();
  (Array.isArray(snap.status) ? snap.status : []).forEach(eff => {
    const en = String((eff && eff.name) || '').toLowerCase();
    if (!en) return;
    chems.forEach(c => {
      if (!_bioChemHasRisk(c)) return;
      const cn = c.name.toLowerCase();
      const fam = (c.family || '').toLowerCase();
      if ((en.includes(cn) || (fam && en.includes(fam))) && !seen.has(cn)) {
        seen.add(cn);
        advisories.push({
          kind: 'addiction',
          text: 'ADDICTION RISK: ' + c.name.toUpperCase() + ' (active) — ' + c.addictionRisk,
        });
      }
    });
  });

  return { hpCur, hpMax, hpPct, hpTier, rads, radTier, limbs, crippled, advisories };
}

function renderBioScan() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> BIO-SCAN ADVISORY';

  const chems = typeof getChemsTable === 'function' ? getChemsTable() : [];
  const snap = {
    limbs: { hd: state.hd, la: state.la, ra: state.ra, ll: state.ll, rl: state.rl },
    hpCur: state.hpCur,
    hpMax: state.hpMax,
    rads: state.rads,
    status: state.status,
  };
  const r = _bioScanCompute(snap, chems);

  let html = '<div class="bio-card">';
  html += '<div class="bio-vitals">';
  html += `<div class="bio-row"><span class="bio-label">HP</span><span class="bio-val bio-hp--${r.hpTier.toLowerCase()}">${r.hpCur} / ${r.hpMax} (${r.hpPct}%) ${r.hpTier}</span></div>`;
  html += `<div class="bio-row"><span class="bio-label">RADIATION</span><span class="bio-val">${r.rads} RADS${r.radTier !== 'NONE' ? ' — ' + r.radTier : ''}</span></div>`;
  html += '</div>';

  html += '<div class="bio-limbs">';
  r.limbs.forEach(l => {
    html +=
      `<div class="bio-limb"><span class="bio-limb-name">${escapeHtml(l.label)}</span>` +
      `<span class="bio-limb-state bio-limb-state--${l.crippled ? 'crippled' : 'ok'}">${l.crippled ? 'CRIPPLED' : 'OK'}</span></div>`;
  });
  html += '</div>';

  html += '<div class="bio-advisories">';
  if (r.advisories.length === 0) {
    html += '<div class="bio-nominal">ALL SYSTEMS NOMINAL — NO INTERVENTION ADVISED</div>';
  } else {
    r.advisories.forEach(a => {
      html += `<div class="bio-advisory bio-advisory--${a.kind}">&#9658; ${escapeHtml(a.text)}</div>`;
    });
  }
  html += '</div></div>';

  content.innerHTML = html;
  if (typeof openModal === 'function') openModal();
  if (typeof appendToChat === 'function')
    appendToChat(
      `> [BIO-SCAN] ${r.crippled.length} limb(s) crippled, HP ${r.hpPct}% — ${r.advisories.length} advisor${r.advisories.length === 1 ? 'y' : 'ies'}.`,
      'sys'
    );
}

// Switch faction/karma panels based on game context (called from loadUI).
function _updateContextPanels() {
  const usesKarmaCenter = _activeDef().usesKarmaCenter;
  const factionPanel = document.getElementById('factionPanel');
  if (factionPanel) {
    // Let the tab system control visibility via tab-visible; just toggle display
    factionPanel.style.display = usesKarmaCenter ? 'none' : '';
  }
  // BUS-09 KARMA ALIGNMENT (Phase 3 OPERATOR batch 3): the needle gauge +
  // stat_karma slider are UNIVERSAL — every game tracks karma — so the board
  // itself is no longer hidden per-game (Protocol 22, reskin only). Only the
  // nested FO3 KARMA CENTER appendix stays conditional on usesKarmaCenter;
  // renderKarmaCenter() owns that inner toggle.
  // U9-5: FO3 has no weapon-mod system/data — hide the MODS drawer so it never
  // advertises a category that can never have entries (Protocol 38 reverse leak).
  const hasWeaponMods = _activeDef().hasWeaponMods;
  const modsFilterBtn = document.getElementById('invFilterMods');
  if (modsFilterBtn) {
    modsFilterBtn.style.display = hasWeaponMods ? '' : 'none';
    if (!hasWeaponMods && typeof _invFilter !== 'undefined' && _invFilter === 'mod') {
      setInvFilter('weapon'); // the drawer bank has no "All" drawer to fall back to
    }
  }
}
