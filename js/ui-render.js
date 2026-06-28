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
function setInvFilter(cat) {
  _invFilter = cat;
  const bar = document.getElementById('invFilterBar');
  if (bar) {
    bar.querySelectorAll('.inv-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === cat);
    });
  }
  renderInventory();
}

function renderInventory() {
  const lst = document.getElementById('invList');
  if (!lst) return;
  // #23 Consumable Quick-Use + #32 Item Category Tags
  // Each row shows: [TYPE] qty x Name (weight · value) [USE] [X]
  const typeColors = {
    weapon: 'var(--robco-danger)',
    armor: 'var(--robco-blue)',
    aid: 'var(--robco-green)',
    mod: 'var(--robco-alert)',
    ammo: 'var(--robco-alert)',
    misc: 'var(--robco-alert)',
  };
  // Filter ammo-typed items — they render in the ammo sub-panel
  // Map with original index FIRST so data-idx and data-use stay correct after filter
  const displayItems = state.inventory
    .map((it, idx) => ({ ...it, _origIdx: idx }))
    .filter(it => {
      const type = it.type || 'misc';
      if (type === 'ammo') return false;
      if (_invFilter === 'all') return true;
      return type === _invFilter;
    });
  if (displayItems.length === 0) {
    const label =
      _invFilter === 'all'
        ? 'inventory items'
        : _invFilter === 'armor'
          ? 'apparel'
          : _invFilter === 'ammo'
            ? 'ammo — see AMMO RESERVES below'
            : _invFilter + ' items';
    lst.innerHTML = emptyState('No ' + label);
    lst.onclick = null;
    return;
  }
  lst.innerHTML = displayItems
    .map(it => {
      const cat = (it.type || 'misc').toLowerCase();
      const typeTag = `<span style="font-size:9px;opacity:0.7;margin-right:3px;color:${typeColors[cat] || 'inherit'};">[${cat.toUpperCase()}]</span>`;
      return `<li><button class="use-btn" data-use="${it._origIdx}" title="Quick-use: send [USE] ${escapeHtml(it.name)}">USE</button>${typeTag}<span>${parseInt(it.qty) || 0}x ${escapeHtml(it.name)} (${parseFloat(it.wgt) || 0} lb${parseInt(it.val) ? ' · ' + parseInt(it.val) + 'c' : ''})</span> <button class="delete-btn" data-idx="${it._origIdx}">X</button></li>`;
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
    }
  };
}

// ── AMMO RESERVES ──────────────────────────────────────────────
function renderAmmo() {
  const ammoDiv = document.getElementById('ammoList');
  if (!ammoDiv) return;
  const ammoObj = state.ammo || {};
  const entries = Object.entries(ammoObj).filter(([, count]) => count > 0);
  if (entries.length === 0) {
    ammoDiv.innerHTML = emptyState('No ammo tracked');
    return;
  }
  // Sort alphabetically by caliber name
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  ammoDiv.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr auto auto;gap:2px 8px;font-size:11px;">' +
    entries
      .map(
        ([caliber, count]) =>
          `<span style="opacity:0.8;">${escapeHtml(caliber)}</span>` +
          `<span style="text-align:right;">${count}</span>` +
          `<button class="delete-btn" style="font-size:9px;padding:0 4px;" onclick="removeAmmo('${escapeHtml(caliber).replace(/'/g, '&#39;')}')" title="Remove">X</button>`
      )
      .join('') +
    '</div>';
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

function renderSquad() {
  const squadDiv = document.getElementById('squadList');
  if (!squadDiv) return;
  if (!state.squad || state.squad.length === 0) {
    squadDiv.innerHTML = emptyState('No active companions');
    return;
  }
  squadDiv.innerHTML = state.squad
    .map((member, i) => {
      const hpRatio = member.hp / (member.hpMax || 100);
      const pBars = Math.ceil(hpRatio * 10);
      const barStr = '['.padEnd(pBars + 1, '\u2588').padEnd(11, '\u2591') + ']';
      // #11 Companion Affinity: render affinity bar if present
      let affinityStr = '';
      if (member.affinity !== undefined) {
        const aff = Math.min(100, Math.max(0, parseInt(member.affinity) || 0));
        const affBars = Math.round(aff / 10);
        const affBar = '['.padEnd(affBars + 1, '\u25a0').padEnd(11, '\u25a1') + ']';
        const affColor =
          aff >= 75
            ? 'var(--robco-green)'
            : aff >= 40
              ? 'var(--robco-alert)'
              : 'var(--robco-danger)';
        affinityStr = `<div style="font-size:10px;margin-top:2px;color:${affColor};">AFF: ${affBar} ${aff}%</div>`;
      }
      return `<div style="margin-bottom: 5px; border-bottom: 1px dashed rgba(var(--robco-green-rgb), 0.3); padding-bottom: 4px;">
            <div style="font-weight:bold;display:flex;justify-content:space-between;align-items:center;">
                <span>${barStr} ${escapeHtml(member.name)}</span>
                <button class="delete-btn" onclick="removeSquadMember(${i})">X</button>
            </div>
            <div style="font-size: 11px; display:flex; justify-content:space-between; margin-top:2px;">
                <span style="color: var(--robco-green)">HP: ${parseInt(member.hp) || 0}/${parseInt(member.hpMax) || 0}</span>
                <span style="color: var(--robco-alert)">AMMO: ${parseInt(member.ammo) || 0}</span>
                <span style="color: var(--robco-danger)">CND: ${escapeHtml(String(member.condition))}</span>
            </div>
            ${member.weapon ? `<div style="font-size:10px;opacity:0.6;margin-top:1px;">WPN: ${escapeHtml(member.weapon)}${member.dt !== undefined ? ' | DT: ' + (parseInt(member.dt) || 0) : ''}</div>` : ''}
            ${affinityStr}
        </div>`;
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
// ticksToGameTime(t)  → internal 'D1 14:00' format (legacy, used internally)
// formatGameTime(t)   → Fallout-style 'Wednesday, 10.23.81, 1:40 AM' (display)
// getGameDate()       → 'OCT 19, 2281' (calendar date only)
// gameTimeToTicks()   → inverse: D/H/M → ticks (used by time input handler)
//
// Design: All display-facing code uses formatGameTime(). Internal logic and
// save/persistence remain tick-based. Shared by FNV and FO3 via gameContext.

function ticksToGameTime(t) {
  // Internal format — kept for backward compatibility (log exports, any future consumers).
  let day = Math.floor(t / 240) + 1;
  let hr = Math.floor((t % 240) / 10);
  let mn = (t % 10) * 6;
  return `D${day} ${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

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

// Minute resolution snaps to nearest tick boundary (floor to multiple of 6).
function gameTimeToTicks(day, hour, min) {
  return (day - 1) * 240 + hour * 10 + Math.floor(min / 6);
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
// t3: Liked / Hated boundary
// t4: Idolized / Vilified boundary
// Source: fallout.wiki — GECK GetReputationThreshold documentation
const FACTION_THRESHOLDS = {
  ncr: { t1: 4, t2: 20, t3: 50, t4: 80 },
  legion: { t1: 4, t2: 25, t3: 50, t4: 100 },
  house: { t1: 3, t2: 10, t3: 25, t4: 50 },
  boomers: { t1: 3, t2: 8, t3: 25, t4: 50 },
  bos: { t1: 2, t2: 3, t3: 10, t4: 20 },
  followers: { t1: 3, t2: 8, t3: 25, t4: 50 },
  khans: { t1: 2, t2: 5, t3: 15, t4: 30 },
  powder: { t1: 2, t2: 5, t3: 15, t4: 30 },
  kings: { t1: 2, t2: 5, t3: 15, t4: 30 },
  strip: { t1: 3, t2: 8, t3: 20, t4: 40 },
  freeside: { t1: 3, t2: 10, t3: 35, t4: 70 },
  // FO3 factions — use generic thresholds (no independent GECK data)
  enclave: { t1: 3, t2: 10, t3: 30, t4: 60 },
  lyons: { t1: 3, t2: 10, t3: 30, t4: 60 },
  outcast: { t1: 2, t2: 8, t3: 25, t4: 50 },
  talon: { t1: 2, t2: 5, t3: 15, t4: 30 },
  regulators: { t1: 2, t2: 5, t3: 15, t4: 30 },
  slavers: { t1: 2, t2: 5, t3: 15, t4: 30 },
  reillys: { t1: 2, t2: 5, t3: 15, t4: 30 },
  tunnelsnakes: { t1: 2, t2: 5, t3: 15, t4: 30 },
  supermutants: { t1: 3, t2: 8, t3: 20, t4: 50 },
  underworld: { t1: 2, t2: 5, t3: 15, t4: 30 },
  rivetcity: { t1: 2, t2: 5, t3: 15, t4: 30 },
};
// Default thresholds for any faction key not in the table above
const _DEFAULT_THRESHOLDS = { t1: 3, t2: 8, t3: 25, t4: 50 };

// ── getFactionStanding(key, fame, infamy) ───────────────────────────
// Canonical FNV 2D fame/infamy matrix.
// Returns { label, color } based on the intersection of fame rank × infamy rank.
// Source: fallout.wiki GECK GetReputationThreshold function table.
function getFactionStanding(key, fame, infamy) {
  const th = FACTION_THRESHOLDS[key] || _DEFAULT_THRESHOLDS;
  const f = fame || 0;
  const i = infamy || 0;

  // Rank each axis: 0=none, 1=low, 2=mid, 3=high, 4=max
  const fr = f < th.t1 ? 0 : f < th.t2 ? 1 : f < th.t3 ? 2 : f < th.t4 ? 3 : 4;
  const ir = i < th.t1 ? 0 : i < th.t2 ? 1 : i < th.t3 ? 2 : i < th.t4 ? 3 : 4;

  // 2D resolution matrix (fameRank × infamyRank)
  // Derived from GECK GetReputationThreshold output table
  if (fr === 4 && ir === 0) return { label: 'Idolized', color: 'var(--robco-green)' };
  if (fr === 4 && ir <= 2) return { label: 'Merciful Thug', color: 'var(--robco-alert)' };
  if (fr >= 3 && ir <= 1) return { label: 'Liked', color: 'var(--robco-green)' };
  if (fr >= 2 && ir === 0) return { label: 'Accepted', color: 'var(--robco-green)' };
  if (fr === 1 && ir === 0) return { label: 'Accepted', color: 'var(--robco-green)' };
  if (fr >= 3 && ir >= 3) return { label: 'Wild Child', color: 'var(--robco-alert)' };
  if (fr >= 2 && ir >= 2) return { label: 'Unpredictable', color: 'var(--robco-alert)' };
  if (fr === 4 && ir >= 3) return { label: 'Wild Child', color: 'var(--robco-alert)' };
  if (fr >= 1 && ir >= 3) return { label: 'Dark Hero', color: 'var(--robco-alert)' };
  if (fr === 1 && ir === 1) return { label: 'Soft-Hearted Devil', color: 'var(--robco-alert)' };
  if (fr === 1 && ir === 2) return { label: 'Mixed', color: 'var(--robco-alert)' };
  if (fr === 2 && ir === 1) return { label: 'Mixed', color: 'var(--robco-alert)' };
  if (fr === 0 && ir === 0) return { label: 'Neutral', color: 'var(--robco-alert)' };
  if (fr === 0 && ir === 1) return { label: 'Sneering Punk', color: 'var(--robco-danger)' };
  if (fr === 0 && ir === 2) return { label: 'Shunned', color: 'var(--robco-danger)' };
  if (fr === 0 && ir === 3) return { label: 'Hated', color: 'var(--robco-danger)' };
  if (fr === 0 && ir === 4) return { label: 'Vilified', color: 'var(--robco-danger)' };
  // Fallback for any unhandled combination
  return { label: 'Neutral', color: 'var(--robco-alert)' };
}

function renderStatus() {
  const statusDiv = document.getElementById('statusList');
  if (!statusDiv) return;
  if (!state.status || state.status.length === 0) {
    statusDiv.innerHTML = emptyState('No active effects');
    return;
  }
  statusDiv.innerHTML = state.status
    .map((eff, i) => {
      const ticks = eff.ticks || 0;
      let typeClass =
        eff.type === 'BUFF'
          ? 'effect-buff'
          : eff.type === 'DEBUFF'
            ? 'effect-debuff'
            : 'effect-neutral';
      let tickInfo = ticks > 0 ? ` [${ticks}t]` : '';
      // Expiry warning: 1–2 ticks remaining on a timed effect
      let expiryBadge = '';
      let itemCls = 'effect-item';
      if (ticks > 0 && ticks <= 2) {
        itemCls += ' effect-item--expiring';
        expiryBadge = `<span class="effect-expiring-badge">[EXPIRING]</span>`;
      } else if (ticks === 0 && eff.type !== 'NEUTRAL') {
        // permanent effects get a subtle marker
        tickInfo = ' [∞]';
      }
      return `<div class="${itemCls}"><span class="${typeClass}">${escapeHtml(eff.name || '')}${tickInfo}${expiryBadge}</span><div><span class="effect-type" style="margin-right:8px;">${escapeHtml(eff.type || 'BUFF')}</span><button class="delete-btn" onclick="removeStatusEffect(${i})">X</button></div></div>`;
    })
    .join('');
  // G3: Apply chem boost highlights to Skill Matrix rows
  _applyChemHighlights();
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

function renderPerks() {
  const perksDiv = document.getElementById('perksList');
  if (!perksDiv) return;
  if (!state.perks || state.perks.length === 0) {
    perksDiv.innerHTML = emptyState('No perks acquired');
    return;
  }
  perksDiv.innerHTML =
    '<ul class="notes-list">' +
    state.perks
      .map(
        (p, i) =>
          `<li><span class="list-row-prefix">> </span><span class="list-row-content">${escapeHtml(p.name)}${p.rank > 1 ? ' (Rank ' + p.rank + ')' : ''}${p.level_taken ? ' — Lv.' + p.level_taken : ''}</span><button class="delete-btn" onclick="removePerk(${i})">X</button></li>`
      )
      .join('') +
    '</ul>';
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
    questsDiv.innerHTML = emptyState('No active quests');
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
  const elapsed = Math.round((Date.now() - (s.sessionStart || Date.now())) / 60000);
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
            <span style="opacity:0.65;">SESSION TIME</span><span>${elapsed}m</span>
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

  let html = '';

  // Acquired items first
  const acquiredDefs = defs.filter(d => acquired.has(d.name.toLowerCase()));
  const missingDefs = defs.filter(d => !acquired.has(d.name.toLowerCase()));

  acquiredDefs.forEach(d => {
    const safeName = escapeHtml(d.name);
    html += `<div style="font-size:11px;letter-spacing:0.5px;margin-bottom:2px;"><span style="color:var(--robco-green);cursor:pointer;" onclick="toggleCollectible('${safeName}')" title="Click to mark MISSING">[ACQUIRED]</span> ${escapeHtml(d.name.toUpperCase())}</div>`;
  });

  if (acquiredDefs.length > 0 && missingDefs.length > 0) {
    html +=
      '<div style="border-top:1px dashed rgba(var(--robco-green-rgb),0.2);margin:4px 0;"></div>';
  }

  missingDefs.forEach(d => {
    const safeName = escapeHtml(d.name);
    const locHint = d.location
      ? ` &mdash; <span style="opacity:0.5;font-size:10px;">LOC: ${escapeHtml(d.location)}</span>`
      : '';
    html += `<div style="font-size:11px;letter-spacing:0.5px;margin-bottom:2px;opacity:0.75;"><span style="opacity:0.6;cursor:pointer;" onclick="toggleCollectible('${safeName}')" title="Click to mark ACQUIRED">[MISSING]</span> ${escapeHtml(d.name.toUpperCase())}${locHint}</div>`;
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
      html += `<div style="font-size:11px;letter-spacing:0.5px;margin-bottom:2px;">`;
      html += `<span style="color:var(--robco-green);cursor:pointer;" data-lname="${safeName}" onclick="toggleLincolnItem(this.dataset.lname)" title="Click to mark missing">[ACQUIRED]</span> `;
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
        ? ` &mdash; <span style="opacity:0.5;font-size:10px;">LOC: ${escapeHtml(d.location)}</span>`
        : '';
      html += `<div style="font-size:11px;letter-spacing:0.5px;margin-bottom:2px;opacity:0.75;">`;
      html += `<span style="opacity:0.6;cursor:pointer;" data-lname="${safeName}" onclick="toggleLincolnItem(this.dataset.lname)" title="Click to mark acquired">[MISSING]</span> `;
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
    const effectSpan = `<span style="font-size:10px;opacity:0.6;"> &mdash; ${escapeHtml(d.effect)}</span>`;
    if (isSel) {
      html += `<div style="font-size:11px;letter-spacing:0.5px;margin-bottom:2px;">`;
      html += `<span style="color:var(--robco-green);cursor:pointer;margin-right:4px;" onclick="toggleTrait('${safeName}')" title="Deselect">[SEL]</span>`;
      html += `<strong>${escapeHtml(d.name.toUpperCase())}${dlcBadge}</strong>${effectSpan}`;
      html += `</div>`;
    } else {
      html += `<div style="font-size:11px;letter-spacing:0.5px;margin-bottom:2px;opacity:0.7;">`;
      html += `<span style="opacity:0.5;cursor:pointer;margin-right:4px;" onclick="toggleTrait('${safeName}')" title="Select">[---]</span>`;
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

function renderCampaignNotes() {
  const notesDiv = document.getElementById('campaignNotesList');
  if (!notesDiv) return;
  if (!state.campaign_notes || state.campaign_notes.length === 0) {
    notesDiv.innerHTML = emptyState('No notes recorded');
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

    // Recent campaign note count
    const noteCount = (state.campaign_notes || []).length;
    html += `<div style="font-size:9px;opacity:0.5;">${noteCount} campaign log entr${noteCount === 1 ? 'y' : 'ies'}</div>`;

    display.innerHTML = html;
  }

  // ── Crossroads Record ────────────────────────────────────
  // Reads campaign_notes that were auto-logged by quest/faction transitions.
  // Auto-logged entries start with [T<ticks>].
  if (crossroads) {
    const autoLogs = (state.campaign_notes || [])
      .filter(n => /^\[T\d+\]/.test(String(n)))
      .slice(-20) // last 20 events
      .reverse(); // newest first

    if (autoLogs.length === 0) {
      crossroads.innerHTML = emptyState(
        'No decisions recorded — crossroads events will appear here'
      );
    } else {
      crossroads.innerHTML = autoLogs
        .map(
          note =>
            `<div style="border-bottom:1px solid rgba(var(--robco-green-rgb),0.1);padding:4px 0;font-size:10px;opacity:0.75;">${escapeHtml(String(note))}</div>`
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
      ? `<span class="map-collectible-badge">[?]</span>`
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

        html += `
          <div class="${rowCls}">
            <span>- ${escapeHtml(loc)}</span>
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

function renderFactionRep() {
  const container = document.getElementById('factionContainer');
  if (!container) return;
  const factions = state.factions || {};

  // Build faction card with inline [+]/[-] fame/infamy nudges.
  // Net standing label shown prominently; reputation trend bar and threshold
  // markers (Vilified/Idolized) give at-a-glance progress context.
  // Mobile-friendly: buttons have min 28×28px touch targets via CSS class.
  function factionCard(f) {
    const data = factions[f.key] || { fame: 0, infamy: 0 };
    const s = getFactionStanding(f.key, data.fame, data.infamy);
    const famVal = data.fame || 0;
    const infamyVal = data.infamy || 0;

    // Net rep for bar: ranges -100 (pure infamy) to +100 (pure fame).
    // bar fill = fame fraction; threshold markers at ±75 standing.
    const total = famVal + infamyVal || 1;
    const netPct = Math.min(100, Math.max(0, (famVal / total) * 100));
    // Vilified threshold marker = 25% (infamy dominant), Idolized = 75%
    const barHtml = `
      <div class="faction-rep-bar-track" title="Fame ${famVal} / Infamy ${infamyVal}">
        <div class="faction-rep-bar-fill" style="width:${netPct}%;background:${s.color};"></div>
        <div class="faction-rep-bar-marker" style="left:25%;" title="Vilified threshold"></div>
        <div class="faction-rep-bar-marker" style="left:75%;" title="Idolized threshold"></div>
      </div>`;

    return `<div class="faction-card">
      <span class="faction-card-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name).toUpperCase()}</span>
      <span class="faction-card-standing" style="color:${s.color};">${s.label}</span>
      <span class="faction-card-counts">F:${famVal} / I:${infamyVal}</span>
      ${barHtml}
      <div class="faction-card-btns">
        <button class="faction-btn faction-btn--fame" title="Fame +50" onclick="adjustFaction('${f.key}','fame',50)">F+</button>
        <button class="faction-btn faction-btn--fame" title="Fame -50" onclick="adjustFaction('${f.key}','fame',-50)">F-</button>
        <button class="faction-btn faction-btn--infamy" title="Infamy +50" onclick="adjustFaction('${f.key}','infamy',50)">I+</button>
        <button class="faction-btn faction-btn--infamy" title="Infamy -50" onclick="adjustFaction('${f.key}','infamy',-50)">I-</button>
      </div>
    </div>`;
  }

  const major = getFactionRegistry().filter(f => f.tier === 'major');
  const minor = getFactionRegistry().filter(f => f.tier === 'minor');

  // Bug fix: save the open state of the minor-factions <details> panel
  // before replacing innerHTML, so clicking F+/F-/I+/I- doesn't collapse it.
  const minorDetails = container.querySelector('details');
  const minorWasOpen = minorDetails ? minorDetails.open : false;

  container.innerHTML = `
    <div style="font-size:9px;opacity:0.45;margin-bottom:4px;letter-spacing:0.5px;">F+/F- = Fame ±50 &nbsp; I+/I- = Infamy ±50 &nbsp; BAR = F/(F+I) ratio</div>
    <div class="faction-grid">
      ${major.map(factionCard).join('')}
    </div>
    <details style="margin-top:6px;">
      <summary class="config-summary" style="font-size:11px;opacity:0.6;padding:2px 0;">MINOR FACTIONS</summary>
      <div class="faction-grid" style="margin-top:5px;">
        ${minor.map(factionCard).join('')}
      </div>
    </details>
  `;

  // Restore open state after re-render
  if (minorWasOpen) {
    const newDetails = container.querySelector('details');
    if (newDetails) newDetails.open = true;
  }
}

// ── G4: EXPANDED KARMA SYSTEM (FO3) ─────────────────────────────
// When gameContext === 'FO3': Karma Center shown, Faction Standing hidden.
// When gameContext === 'FNV' (or default): Faction Standing shown, Karma Center hidden.
// Thresholds: Very Evil (<-750) / Evil (<-250) / Neutral / Good (>250) / Very Good (>750).
// Differentiated by text labels and brightness — no multi-color.
function renderKarmaCenter() {
  const display = document.getElementById('karmaCenterDisplay');
  if (!display) return;

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

// Switch faction/karma panels based on game context (called from loadUI).
function _updateContextPanels() {
  const usesKarmaCenter = _activeDef().usesKarmaCenter;
  const factionPanel = document.getElementById('factionPanel');
  const karmaPanel = document.getElementById('karmaPanel');
  if (factionPanel) {
    // Let the tab system control visibility via tab-visible; just toggle display
    factionPanel.style.display = usesKarmaCenter ? 'none' : '';
  }
  if (karmaPanel) {
    // Only show if on stat tab and FO3 mode; otherwise hide
    karmaPanel.style.display = usesKarmaCenter ? '' : 'none';
  }
}
