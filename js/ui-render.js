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
      const typeTag = `<span class="tag" style="color:${typeColors[cat] || 'inherit'};">[${cat.toUpperCase()}]</span>`;
      return `<li><button class="use-btn" data-use="${it._origIdx}" title="Quick-use: send [USE] ${escapeHtml(it.name)}" aria-label="Use item: ${escapeHtml(it.name)}">USE</button>${typeTag}<span class="inv-name">${parseInt(it.qty) || 0}x ${escapeHtml(it.name)} (${parseFloat(it.wgt) || 0} lb${parseInt(it.val) ? ' · ' + parseInt(it.val) + 'c' : ''})</span><button class="delete-btn" data-idx="${it._origIdx}" aria-label="Remove ${escapeHtml(it.name)} from inventory">X</button></li>`;
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

// ── Shared READ/UNREAD tracker renderer (QA-DUP-1 / WU-B8) ──────────
// Drives the Skill Books and Skill Magazines panels (and any future binary
// read-tracker) from one config object so the row markup, READ/UNREAD
// sub-panel split, empty states, and collapse-persistence live in exactly
// one place. Fully data-driven — no game literals (Protocol 38).
//
// opts: {
//   containerId,                // required: where the sub-panels mount
//   panelId?, visible?,         // optional: hide panelId when visible() is false
//   defs,                       // registry array of {name, skill}
//   read,                       // state array of read names
//   subIdRead, subIdUnread,     // data-sub-id keys (persistence)
//   toggleFn,                   // name of the global toggle function
//   meta,                       // (d) => inner HTML for the .tracker-meta span
//   emptyRead, emptyUnread,     // empty-state strings
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
  const readDefs = defs.filter(d => read.includes(d.name));
  const unreadDefs = defs.filter(d => !read.includes(d.name));

  let ps = {};
  try {
    ps = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
  } catch (_) {}
  const readOpen = ps[opts.subIdRead] !== false;
  const unreadOpen = ps[opts.subIdUnread] !== false;

  const rowHtml = (d, isRead) => {
    const safeAttr = escapeHtml(d.name);
    const tag = isRead
      ? `<button class="tracker-toggle tracker-toggle--active" data-name="${safeAttr}" onclick="${opts.toggleFn}(this.dataset.name)" aria-label="Mark ${safeAttr} unread">[READ]</button>`
      : `<button class="tracker-toggle tracker-toggle--inactive" data-name="${safeAttr}" onclick="${opts.toggleFn}(this.dataset.name)" aria-label="Mark ${safeAttr} read">[----]</button>`;
    const nameHtml = isRead
      ? `<strong>${escapeHtml(d.name.toUpperCase())}</strong>`
      : escapeHtml(d.name.toUpperCase());
    return (
      `<div class="tracker-row"${isRead ? '' : ' style="opacity:0.7;"'}>` +
      tag +
      nameHtml +
      ` <span class="tracker-meta">&mdash; ${opts.meta(d)}</span>` +
      `</div>`
    );
  };

  const readRows = readDefs.length
    ? readDefs.map(d => rowHtml(d, true)).join('')
    : `<div style="font-size:11px;opacity:0.5;padding:2px 0 4px;">${opts.emptyRead}</div>`;
  const unreadRows = unreadDefs.length
    ? unreadDefs.map(d => rowHtml(d, false)).join('')
    : `<div style="font-size:11px;opacity:0.5;padding:2px 0 4px;">${opts.emptyUnread}</div>`;

  container.innerHTML =
    `<details class="sub-panel" data-sub-id="${opts.subIdRead}"${readOpen ? ' open' : ''}>` +
    `<summary><h3>&gt; READ [${readDefs.length}]</h3></summary>` +
    readRows +
    `</details>` +
    `<details class="sub-panel" data-sub-id="${opts.subIdUnread}"${unreadOpen ? ' open' : ''}>` +
    `<summary><h3>&gt; UNREAD [${unreadDefs.length}]</h3></summary>` +
    unreadRows +
    `</details>`;

  container.querySelectorAll('details[data-sub-id]').forEach(d => {
    d.addEventListener('toggle', () => {
      try {
        const p = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
        p[d.dataset.subId] = d.open;
        localStorage.setItem('robco_panel_state', JSON.stringify(p));
      } catch (_) {}
    });
  });
}

function renderSkillBooks() {
  _renderReadTracker({
    containerId: 'skillBooksDisplay',
    defs:
      typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.skillBooks)
        ? FALLOUT_REGISTRY.skillBooks
        : [],
    read: Array.isArray(state.skillBooks) ? state.skillBooks : [],
    subIdRead: 'skill_books_read',
    subIdUnread: 'skill_books_unread',
    toggleFn: 'toggleSkillBook',
    meta: d => escapeHtml((d.skill || '').replace(/_/g, ' ').toUpperCase()),
    emptyRead: 'NO BOOKS READ',
    emptyUnread: 'ALL BOOKS READ',
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
    subIdRead: 'magazines_read',
    subIdUnread: 'magazines_unread',
    toggleFn: 'toggleMagazine',
    meta: d =>
      d.skill === 'Critical Chance'
        ? '(Critical Chance)'
        : `(boosts ${escapeHtml((d.skill || '').replace(/_/g, ' ').toUpperCase())})`,
    emptyRead: 'NO MAGAZINES READ',
    emptyUnread: 'ALL MAGAZINES READ',
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
        <button class="faction-btn faction-btn--fame" aria-label="Fame +5 for ${escapeHtml(f.name)}" onclick="adjustFaction('${f.key}','fame',5)">F+</button>
        <button class="faction-btn faction-btn--fame" aria-label="Fame -5 for ${escapeHtml(f.name)}" onclick="adjustFaction('${f.key}','fame',-5)">F-</button>
        <button class="faction-btn faction-btn--infamy" aria-label="Infamy +5 for ${escapeHtml(f.name)}" onclick="adjustFaction('${f.key}','infamy',5)">I+</button>
        <button class="faction-btn faction-btn--infamy" aria-label="Infamy -5 for ${escapeHtml(f.name)}" onclick="adjustFaction('${f.key}','infamy',-5)">I-</button>
      </div>
    </div>`;
  }

  const major = getFactionRegistry().filter(f => f.tier === 'major');
  const minor = getFactionRegistry().filter(f => f.tier === 'minor');

  // Save open state from DOM (re-render collapse fix) and localStorage (reload persistence)
  const minorDetails = container.querySelector('details[data-sub-id="minor_factions"]');
  const minorWasOpen = minorDetails ? minorDetails.open : false;
  let minorPersisted = false;
  try {
    const ps = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
    if (typeof ps['minor_factions'] === 'boolean') minorPersisted = ps['minor_factions'];
  } catch (_) {}
  const minorOpen = minorWasOpen || minorPersisted;

  container.innerHTML = `
    <div style="font-size:9px;opacity:0.45;margin-bottom:4px;letter-spacing:0.5px;">F+/F- = Fame ±5 &nbsp; I+/I- = Infamy ±5 &nbsp; BAR = F/(F+I) ratio</div>
    <div class="faction-grid">
      ${major.map(factionCard).join('')}
    </div>
    <details class="sub-panel" data-sub-id="minor_factions"${minorOpen ? ' open' : ''}>
      <summary class="config-summary" style="font-size:11px;opacity:0.6;padding:2px 0;">MINOR FACTIONS</summary>
      <div class="faction-grid" style="margin-top:5px;">
        ${minor.map(factionCard).join('')}
      </div>
    </details>
  `;

  // Wire sub-panel persistence for minor factions
  container.querySelectorAll('details[data-sub-id]').forEach(d => {
    d.addEventListener('toggle', () => {
      try {
        const p = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
        p[d.dataset.subId] = d.open;
        localStorage.setItem('robco_panel_state', JSON.stringify(p));
      } catch (_) {}
    });
  });
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
  const ingHtml = recipe.ingredients
    .map(ing => {
      const haveN = _craftGetHave(ing.item);
      const canMake = ing.qty > 0 ? Math.floor(haveN / ing.qty) : MAX_CAP;
      if (canMake < maxBatch) maxBatch = canMake;
      const col = haveN >= ing.qty ? 'var(--robco-green)' : 'var(--robco-danger)';
      return `<span style="color:${col};font-size:10px;margin-right:5px;">${escapeHtml(ing.item)} ${haveN}/${ing.qty}</span>`;
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

function doCraft(recipeIdx) {
  const recipes =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.recipes)
      ? FALLOUT_REGISTRY.recipes
      : [];
  const recipe = recipes[recipeIdx];
  if (!recipe) return;

  const qtyEl = document.getElementById('craftQty_' + recipeIdx);
  const qty = Math.max(1, parseInt(qtyEl ? qtyEl.value : '1') || 1);

  const missing = recipe.ingredients.filter(ing => _craftGetHave(ing.item) < ing.qty * qty);
  if (missing.length > 0) {
    if (typeof appendToChat === 'function')
      appendToChat(
        '> [CRAFT] FAILED — Missing: ' + missing.map(i => i.item).join(', ') + '.',
        'sys'
      );
    return;
  }

  const consumeList = recipe.ingredients.map(ing => `${ing.qty * qty}× ${ing.item}`).join(', ');
  const outputQty = recipe.output.qty * qty;
  if (
    !confirm(
      `Craft ${qty}× ${recipe.name}?\n\nConsumes: ${consumeList}\nProduces: ${outputQty}× ${recipe.output.item}`
    )
  )
    return;

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
  if (typeof appendToChat === 'function')
    appendToChat(`> [CRAFT] Built ${qty}× ${recipe.name}.`, 'sys');
}

function doScrap(bdIdx) {
  const breakdowns =
    typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.breakdowns)
      ? FALLOUT_REGISTRY.breakdowns
      : [];
  const breakdown = breakdowns[bdIdx];
  if (!breakdown) return;

  const qtyEl = document.getElementById('scrapQty_' + bdIdx);
  const qty = Math.max(1, parseInt(qtyEl ? qtyEl.value : '1') || 1);
  const have = _craftGetHave(breakdown.item);

  if (have < qty) {
    if (typeof appendToChat === 'function')
      appendToChat(`> [SCRAP] FAILED — Need ${qty}× ${breakdown.item}, have ${have}.`, 'sys');
    return;
  }

  const yieldStr = breakdown.yields.map(y => `${y.qty * qty}× ${y.item}`).join(', ');
  if (!confirm(`Scrap ${qty}× ${breakdown.item}?\n\nProduces: ${yieldStr}`)) return;

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
  if (typeof appendToChat === 'function')
    appendToChat(`> [SCRAP] Scrapped ${qty}× ${breakdown.item} → ${yieldStr}.`, 'sys');
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
  renderTrade();
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
    return;
  }
  if (_tradeVendorIdx < 0 || _tradeVendorIdx >= vendors.length) _tradeVendorIdx = 0;
  const v = vendors[_tradeVendorIdx];
  const caps = state.caps || 0;
  const opts = vendors
    .map(
      (vd, i) =>
        `<option value="${i}"${i === _tradeVendorIdx ? ' selected' : ''}>${escapeHtml(vd.name)}${vd.location ? ' — ' + escapeHtml(vd.location) : ''}</option>`
    )
    .join('');
  header.innerHTML =
    `<select id="tradeVendorSelect" aria-label="Select vendor" onchange="setTradeVendor(this.value)" style="width:100%;font-size:16px;min-height:28px;margin-bottom:4px;">${opts}</select>` +
    `<div style="font-size:11px;display:flex;flex-wrap:wrap;gap:10px;">` +
    `<span>CAPS: <b>${caps}</b></span>` +
    `<span>VENDOR PURSE: <b>${v.baseCaps}</b></span>` +
    `<span>BARTER: <b>${_tradeBarterSkill()}</b></span>` +
    `</div>`;
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

function doBuy(name) {
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
  if (!confirm(`Buy ${item.name} for ${price} caps?\n\nCaps: ${caps} → ${caps - price}`)) return;
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
  if (typeof appendToChat === 'function')
    appendToChat(`> [TRADE] Bought ${item.name} for ${price}c. Caps: ${state.caps}.`, 'sys');
}

function doSell(name) {
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
  if (!confirm(`Sell ${it.name} for ${price} caps?\n\nCaps: ${caps} → ${caps + price}`)) return;
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
  if (typeof _openSysModal === 'function') _openSysModal();
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

function doLoot(name) {
  const catalog = typeof getTradeCatalog === 'function' ? getTradeCatalog() : [];
  const item = catalog.find(i => i.name.toLowerCase() === String(name).toLowerCase());
  if (!item) return;
  const qtyEl = document.getElementById('lootQty');
  let qty = qtyEl ? parseInt(qtyEl.value, 10) : 1;
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  if (qty > 999) qty = 999;
  const db = typeof lookupItemInDb === 'function' ? lookupItemInDb(item.name) : null;
  const unitVal = Math.max(0, Math.round(Number(db && db.val != null ? db.val : item.value) || 0));
  if (!confirm(`Add ${qty}× ${item.name} (${unitVal}c each) to inventory?`)) return;
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
    if (typeof _openSysModal === 'function') _openSysModal();
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
      if (at) html += `<div class="threat-weapon">AMMO TYPE: ${escapeHtml(at)}</div>`;
    }
    html += `<div class="threat-weapon">VS ${escapeHtml(weapon.name)} &mdash; DPS ${Math.round(m.weaponDPS)} / EFF ${Math.round(m.effectiveDPS)} after DT</div>`;
  } else {
    html += '<div class="threat-note">EQUIP A WEAPON FOR TTK + AMMO-BURN ESTIMATE.</div>';
  }
  html += '</div></div>';

  content.innerHTML = html;
  if (typeof _openSysModal === 'function') _openSysModal();
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
const _CONSULT_CATS = [
  { key: 'items', label: 'ITEMS' },
  { key: 'perks', label: 'PERKS' },
  { key: 'quests', label: 'QUESTS' },
  { key: 'locations', label: 'LOCATIONS' },
  { key: 'companions', label: 'COMPANIONS' },
];

function _consultDetail(cat, e) {
  if (cat === 'quests') return [e.type, e.dlc].filter(Boolean).join(' · ');
  if (cat === 'perks') return [e.type, e.level ? 'Lvl ' + e.level : ''].filter(Boolean).join(' · ');
  if (cat === 'companions') return e.location || e.fullName || '';
  return e.type || '';
}

function renderConsult(topic) {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> DATABANK QUERY';

  const q = (topic || '').trim();
  if (!q) {
    content.innerHTML =
      '<pre class="consult-empty" style="white-space:pre-wrap;font-family:inherit;margin:0;color:var(--robco-dim);">SPECIFY A QUERY — e.g. &gt; CONSULT Deathclaw</pre>';
    if (typeof _openSysModal === 'function') _openSysModal();
    if (typeof appendToChat === 'function') appendToChat('> [CONSULT] No query specified.', 'sys');
    return;
  }

  // Registry hits across every category (active game's FALLOUT_REGISTRY).
  const groups = [];
  if (typeof registrySearch === 'function') {
    for (const c of _CONSULT_CATS) {
      const hits = registrySearch(c.key, q) || [];
      if (hits.length) groups.push({ key: c.key, label: c.label, hits: hits.slice(0, 5) });
    }
  }

  // DB stat cross-reference.
  const creature = typeof lookupBestiaryEntry === 'function' ? lookupBestiaryEntry(q) : null;
  const weapon = typeof lookupWeaponStats === 'function' ? lookupWeaponStats(q) : null;
  const dbItem = typeof lookupItemInDb === 'function' ? lookupItemInDb(q) : null;

  if (groups.length === 0 && !creature && !weapon && !dbItem) {
    content.innerHTML =
      '<pre class="consult-empty" style="white-space:pre-wrap;font-family:inherit;margin:0;color:var(--robco-dim);">NO ENTRY IN DATABANK: ' +
      escapeHtml(q) +
      '</pre>';
    if (typeof _openSysModal === 'function') _openSysModal();
    if (typeof appendToChat === 'function')
      appendToChat(`> [CONSULT] No databank entry found for "${q}".`, 'sys');
    return;
  }

  let html = '<div class="consult-card">';
  html += `<div class="consult-query">QUERY: ${escapeHtml(q)}</div>`;

  const statRows = [];
  if (creature) {
    statRows.push(['CREATURE', escapeHtml(creature.name)]);
    statRows.push(['HP / DT', `${creature.hp} / ${creature.dt}`]);
    if (creature.weakness && String(creature.weakness).toLowerCase() !== 'none')
      statRows.push(['WEAKNESS', escapeHtml(creature.weakness)]);
  }
  if (weapon) {
    statRows.push(['WEAPON', escapeHtml(weapon.name)]);
    statRows.push(['DMG / APS', `${weapon.baseDamage} / ${weapon.aps}`]);
    if (weapon.ammoType) statRows.push(['AMMO', escapeHtml(weapon.ammoType)]);
  }
  if (dbItem && !weapon && !creature) {
    statRows.push(['TYPE', escapeHtml(String(dbItem.type || 'misc'))]);
    statRows.push(['WEIGHT / VALUE', `${dbItem.wgt} / ${dbItem.val}`]);
  }
  if (statRows.length) {
    html += '<div class="consult-stats">';
    statRows.forEach(r => {
      html += `<div class="consult-row"><span class="consult-label">${r[0]}</span><span class="consult-val">${r[1]}</span></div>`;
    });
    html += '</div>';
  }

  groups.forEach(g => {
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
  content.innerHTML = html;
  if (typeof _openSysModal === 'function') _openSysModal();
  if (typeof appendToChat === 'function')
    appendToChat(`> [CONSULT] Databank record retrieved for "${q}".`, 'sys');
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
  if (typeof _openSysModal === 'function') _openSysModal();
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
