// ── ui-render-inventory.js — CARGO MANIFEST & AMMO (split from ui-render.js, 2.8.5 U-A4) ──
// addItem/delItem/adjItemQty/toggleEquipItem, the drawer-filter helpers,
// native aid-item consumption (nativeUseItem), renderInventory(), and the
// AMMO reserves drawer (renderAmmo/addAmmo/removeAmmo). Global scope, static
// <script> tag — loads alongside the rest of the ui-render-*.js family,
// before window.onload fires (see index.html load order).

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
  // FEEDBACK ANIMATION WAVE 2 (#18 MANIFEST PUNCH) — new additive emit
  // (Protocol 13 regression test covers it), fired for every manual add
  // regardless of whether it created a new row or bumped an existing one —
  // the home animation itself no-ops gracefully if the row isn't visible.
  RobcoEvents.emit('item.added', { name: n, qty: q, source: 'manual', type: t });
  document.getElementById('newItemName').value = '';
  document.getElementById('newItemQty').value = '';
  document.getElementById('newItemWeight').value = '';
  document.getElementById('newItemValue').value = '';
  renderInventory();
  updateMath();
}
function delItem(idx) {
  state.inventory.splice(idx, 1);
  if (reconcileEquipped(state)) renderEquipped();
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
    if (reconcileEquipped(state)) renderEquipped();
  } else {
    it.qty = next;
  }
  renderInventory();
  updateMath();
  saveState();
  // FEEDBACK ANIMATION WAVE 3 (#33 QTY DIGIT FLIP) — home-only; a one-shot
  // digit-flip on the freshly-painted quantity readout, skipped when the row
  // was removed entirely (next === 0, nothing left to flip).
  if (next > 0) {
    const list = document.getElementById('invList');
    const stepBtn = list ? list.querySelector('[data-qtyidx="' + idx + '"]') : null;
    const qEl = stepBtn ? stepBtn.parentElement.querySelector('.q') : null;
    if (qEl) {
      qEl.classList.remove('qty-digit-flip');
      void qEl.offsetWidth;
      qEl.classList.add('qty-digit-flip');
      setTimeout(() => qEl.classList.remove('qty-digit-flip'), 400);
    }
  }
}

// Phase 3 · Piece 2: native EQUIP control, closing the U10 audit gap
// (state.equipped was previously AI-write-only — see api-import.js autoImportState,
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
  const wasEquipped = state.equipped[slot] === it.name;
  state.equipped[slot] = state.equipped[slot] === it.name ? null : it.name;
  renderEquipped();
  renderInventory();
  saveState();
  // FEEDBACK ANIMATION WAVE 3 (#19 IN-SERVICE STAMP) — new additive emit,
  // fired only on an EQUIP (never an unequip — a stamp physically landing
  // only makes sense once, the #12 INK STAMP precedent). Fires AFTER
  // renderInventory() has already repainted, so the home-panel subscriber's
  // row lookup is never stale (no defer needed, unlike item.added).
  if (!wasEquipped) {
    RobcoEvents.emit('item.equipped', { slot, name: it.name });
  }
}

// ── DRAWER CHROME & FILTER STATE ─────────────────────────────────
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
  _fo3ManifestSel = null; // a drawer switch invalidates the old selection (FO3 detail pane)
  renderInventory();
  renderAmmo();
}

// U8 (MANIFEST density, audit punch-list item 2): reveals/hides the
// #opsManifestFilterRow search row in place. The toggle button that calls
// this is hidden everywhere except [data-game='FO3'] landscape
// (css/60-fo3-pipboy.css) — NV's own always-visible search row never gets
// this control at all — but the function itself is plain DOM toggling with
// no game literal (Protocol 38). The filtering CAPABILITY is never removed,
// only its default visibility (Protocol 26 — one extra tap reaches it).
function toggleManifestFilterRow() {
  const row = document.getElementById('opsManifestFilterRow');
  const btn = document.getElementById('mfFilterToggle');
  if (!row || !btn) return;
  const opening = row.hidden;
  row.hidden = !opening;
  btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
  if (opening) document.getElementById('invDrawerSearch')?.focus();
}

// ── FO3 MANIFEST DETAIL (Shape A list+detail, Batch 1) ──────────────────
// A transient (never state.*, never MetaStore) in-memory selection — which
// row the detail pane is showing. Game-agnostic: _renderFo3ManifestDetail()
// is a no-op without identity.rails (Protocol 38), so this never executes
// anything visible for NV; the pane itself is CSS-hidden there regardless.
let _fo3ManifestSel = null;

function _selectFo3ManifestRow(idx) {
  _fo3ManifestSel = idx;
  const lst = document.getElementById('invList');
  if (lst) {
    lst
      .querySelectorAll('.mrow')
      .forEach(el => el.classList.toggle('fo3-sel', +el.dataset.rowidx === idx));
  }
  _renderFo3ManifestDetail();
}

// The detail pane's actions call the exact same mutators the inline row
// always called (toggleEquipItem/nativeUseItem/adjItemQty/delItem) — this
// is a CSS re-layout of the existing action set, never a parallel state
// path (Protocol 22).
function _renderFo3ManifestDetail() {
  const detail = document.getElementById('fo3ManifestDetail');
  if (!detail) return;
  if (typeof getIdentity !== 'function' || !getIdentity().rails) return;
  const cat = _invFilter;
  const rows = state.inventory
    .map((it, i) => ({ it, idx: i }))
    .filter(r => (r.it.type || 'misc') === cat);
  if (!rows.length) {
    detail.innerHTML = '<div class="fo3-empty">NO ITEM SELECTED</div>';
    return;
  }
  if (_fo3ManifestSel == null || !rows.some(r => r.idx === _fo3ManifestSel)) {
    _fo3ManifestSel = rows[0].idx;
  }
  const idx = _fo3ManifestSel;
  const it = state.inventory[idx];
  if (!it) {
    detail.innerHTML = '<div class="fo3-empty">NO ITEM SELECTED</div>';
    return;
  }
  const catL = (it.type || 'misc').toLowerCase();
  const slot = catL === 'weapon' ? 'weapon' : catL === 'armor' ? 'armor' : null;
  const eq = state.equipped || {};
  const isEq = !!(slot && eq[slot] === it.name);
  let actions = '';
  if (slot) {
    actions +=
      `<button class="fo3-act${isEq ? ' fo3-warm' : ''}" onclick="toggleEquipItem(${idx})">` +
      `${isEq ? 'UNEQUIP' : 'EQUIP'} <i>&#10005;</i></button>`;
  }
  if (catL === 'aid') {
    actions += `<button class="fo3-act" onclick="nativeUseItem(${idx})">USE <i>&#9675;</i></button>`;
  }
  actions +=
    '<span class="fo3-stepper-btn-group" style="display:inline-flex">' +
    `<button type="button" class="fo3-stepper-btn" onclick="adjItemQty(${idx},-1)" aria-label="Decrease quantity">&#9660;</button>` +
    `<span class="fo3-dt-qty">${parseInt(it.qty) || 0}</span>` +
    `<button type="button" class="fo3-stepper-btn" onclick="adjItemQty(${idx},1)" aria-label="Increase quantity">&#9650;</button>` +
    '</span>';
  actions += `<button class="fo3-act" onclick="delItem(${idx})">DROP <i>&#9633;</i></button>`;
  detail.innerHTML =
    `<div class="fo3-dt-title">${escapeHtml(it.name)}</div>` +
    `<div class="fo3-dt-stats"><b>TYPE</b>${catL.toUpperCase()} &nbsp; <b>WG</b>${parseFloat(it.wgt) || 0} &nbsp; <b>VAL</b>${parseInt(it.val) || 0}${isEq ? ' &nbsp; <b>STATE</b>EQUIPPED' : ''}</div>` +
    `<div class="fo3-dt-actions">${actions}</div>`;
}

// ── NATIVE USE (deterministic item consumption, no AI) ──────────────────────
// Deterministic default for a bare "Restore HP" clause — the CSV literally
// carries no number for these rows (FNV Stimpak/Caravan Lunch/etc.), so this is
// a named, documented constant rather than an AI guess (Protocol 3/24).
const _AID_DEFAULT_HEAL = 20;

// Converts a CHEMS.CSV Duration string ("4m"/"1h"/"30s"/"0"/"") to the app's
// canonical 6-minute tick scale (_nativeSleep()/_nativeWait(): 1 hour = 10
// ticks, so 1 tick = 6 minutes). Any sub-tick duration still rounds UP to at
// least 1 tick — a real, if brief, buff — rather than rounding down to 0 and
// silently discarding it. "0"/blank/unparseable → 0 (no timed effect).
function _durationToTicks(durStr) {
  const s = String(durStr || '')
    .trim()
    .toLowerCase();
  if (!s || s === '0') return 0;
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(h|m|s)$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!n) return 0;
  if (m[2] === 'h') return Math.round(n * 10);
  if (m[2] === 'm') return Math.max(1, Math.round(n / 6));
  return 1; // seconds — always at least 1 tick
}

// Pure, side-effect-free compute core (like _bioScanCompute) — parses a
// getChemsTable() row's Effect column into a structured, deterministic result.
// Clauses are delimited by " / " (SLASH bounded by whitespace on both sides),
// never a bare "/" — several FNV foods carry an un-spaced "/" inside a clause
// itself ("+2 HP/s for 10s"), which a naive split-on-"/" would tear in half.
// Every real multi-clause CHEMS.CSV row (both games) uses spaced " / " between
// clauses, so this delimiter is exact, not a heuristic.
function _computeAidUse(chemEntry) {
  const result = {
    heal: 0,
    radDelta: 0,
    healLimbs: null,
    clearAddiction: false,
    clearPoison: false,
    buff: null,
    recognized: false,
    summary: [],
  };
  if (!chemEntry || !chemEntry.effect) return result;
  const clauses = String(chemEntry.effect)
    .split(/\s+\/\s+/)
    .map(c => c.trim())
    .filter(Boolean);
  const leftover = [];
  clauses.forEach(clause => {
    let m;
    if ((m = clause.match(/^restore\s+(\d+)\s*hp$/i))) {
      result.heal += parseInt(m[1], 10);
      result.summary.push('+' + m[1] + ' HP');
      return;
    }
    if ((m = clause.match(/^\+(\d+)\s*hp$/i))) {
      result.heal += parseInt(m[1], 10);
      result.summary.push('+' + m[1] + ' HP');
      return;
    }
    if ((m = clause.match(/^\+(\d+(?:\.\d+)?)\s*hp\/s\s+for\s+(\d+)\s*s$/i))) {
      const total = Math.round(parseFloat(m[1]) * parseInt(m[2], 10));
      result.heal += total;
      result.summary.push('+' + total + ' HP');
      return;
    }
    if (/^restore\s+hp$/i.test(clause)) {
      result.heal += _AID_DEFAULT_HEAL;
      result.summary.push('+' + _AID_DEFAULT_HEAL + ' HP');
      return;
    }
    if ((m = clause.match(/^remove\s+(\d+)\s*rads?$/i))) {
      result.radDelta -= parseInt(m[1], 10);
      result.summary.push('-' + m[1] + ' RAD');
      return;
    }
    if ((m = clause.match(/^\+(\d+)\s*rads?$/i))) {
      result.radDelta += parseInt(m[1], 10);
      result.summary.push('+' + m[1] + ' RAD');
      return;
    }
    if (/^restore\s+all\s+crippled\s+limbs$/i.test(clause) || /^heal\s+limbs$/i.test(clause)) {
      result.healLimbs = 'all';
      result.summary.push('LIMBS HEALED (ALL)');
      return;
    }
    if (/^restore\s+crippled\s+limb$/i.test(clause)) {
      if (result.healLimbs !== 'all') result.healLimbs = 'one';
      result.summary.push('LIMB HEALED');
      return;
    }
    if (/^remove\s+addiction$/i.test(clause)) {
      result.clearAddiction = true;
      result.summary.push('ADDICTION CLEARED');
      return;
    }
    if (/^remove\s+poison$/i.test(clause)) {
      result.clearPoison = true;
      result.summary.push('POISON CLEARED');
      return;
    }
    // Not a recognized heal/rad/limb/addiction/poison shape — a candidate
    // modifier clause (+N STR, +25 DR, Night Vision, Slow time, a crafting-
    // ingredient note, etc). Only becomes a timed BUFF if the row's OWN
    // Duration column is > 0 — a zero-duration leftover (any crafting-
    // ingredient row) stays inert rather than being guessed at.
    leftover.push(clause);
  });
  const ticks = _durationToTicks(chemEntry.duration);
  if (leftover.length > 0 && ticks > 0) {
    result.buff = { name: chemEntry.name, ticks, type: 'BUFF' };
    result.summary.push(chemEntry.name.toUpperCase() + ' EFFECT ACTIVE');
  }
  result.recognized =
    result.heal > 0 ||
    result.radDelta !== 0 ||
    !!result.healLimbs ||
    result.clearAddiction ||
    result.clearPoison ||
    !!result.buff;
  return result;
}

// Executor — replaces the old free-text "> [USE] <name>" round-trip to the AI
// (Protocol 24: deterministic, offline, no AI on this path — grep-guarded by
// Suite 200). Applies through the shared A.2 native setters (ui-core.js) and
// _applyStatusEffect() (Protocol 22), decrementing qty by exactly 1 only when
// at least one effect was genuinely applied (Protocol 27 edge case: a
// limb-heal item used with nothing crippled applies nothing and is not spent).
function nativeUseItem(idx) {
  const item = state.inventory[idx];
  if (!item) return;
  const name = item.name;
  if (String(item.type || '').toLowerCase() !== 'aid') {
    appendToChat('> [USE] ' + name + ' is not a consumable.', 'sys');
    return;
  }
  const chems = typeof getChemsTable === 'function' ? getChemsTable() : [];
  const chemEntry = chems.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (!chemEntry) {
    appendToChat('> [USE] No effect data for ' + name + '.', 'sys');
    return;
  }
  const r = _computeAidUse(chemEntry);
  if (!r.recognized) {
    appendToChat('> [USE] ' + name + ' has no usable effect (' + chemEntry.effect + ').', 'sys');
    return;
  }

  let applied = false;
  let statusChanged = false;
  let limbsChanged = false;

  if (r.heal > 0) {
    _nativeSetHp(state.hpCur + r.heal);
    applied = true;
  }
  if (r.radDelta !== 0) {
    _nativeSetRads(state.rads + r.radDelta);
    applied = true;
  }
  if (r.healLimbs) {
    const limbKeys = ['hd', 'la', 'ra', 'll', 'rl'];
    if (r.healLimbs === 'all') {
      const anyCrippled = limbKeys.some(k => state[k] !== 'OK');
      if (anyCrippled) {
        limbKeys.forEach(k => {
          state[k] = 'OK';
        });
        applied = true;
        limbsChanged = true;
      }
    } else {
      const target = limbKeys.find(k => state[k] !== 'OK');
      if (target) {
        state[target] = 'OK';
        applied = true;
        limbsChanged = true;
      }
    }
  }
  if (r.buff) {
    _applyStatusEffect(r.buff.name, r.buff.ticks, r.buff.type);
    applied = true;
    statusChanged = true;
  }
  if (r.clearAddiction) {
    const before = (state.status || []).length;
    state.status = (state.status || []).filter(eff => {
      const en = String((eff && eff.name) || '').toLowerCase();
      return !chems.some(
        c =>
          _bioChemHasRisk(c) &&
          (en.includes(c.name.toLowerCase()) || (c.family && en.includes(c.family.toLowerCase())))
      );
    });
    if ((state.status || []).length !== before) {
      applied = true;
      statusChanged = true;
    }
  }
  if (r.clearPoison) {
    const before = (state.status || []).length;
    state.status = (state.status || []).filter(
      eff =>
        !String((eff && eff.name) || '')
          .toLowerCase()
          .includes('poison')
    );
    if ((state.status || []).length !== before) {
      applied = true;
      statusChanged = true;
    }
  }

  if (!applied) {
    appendToChat('> [USE] ' + name + ' has no effect right now.', 'sys');
    return;
  }

  const remainingQty = (parseInt(item.qty, 10) || 1) - 1;
  if (remainingQty <= 0) {
    state.inventory.splice(idx, 1);
    if (reconcileEquipped(state)) renderEquipped();
  } else {
    item.qty = remainingQty;
  }

  if (statusChanged) renderStatus();
  renderInventory();
  if (limbsChanged) loadUI();
  updateMath();
  saveState();

  appendToChat(
    '> [USE] ' +
      r.summary.join(' · ') +
      ' — ' +
      name +
      (remainingQty > 0 ? ' (' + remainingQty + ' remaining).' : ' (depleted).'),
    'sys'
  );
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
    if (typeof getIdentity === 'function' && getIdentity().rails) _renderFo3ManifestDetail();
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
        `<li class="mrow${isEq ? ' iseq' : ''}" data-rowidx="${it._origIdx}">` +
        `<span class="hole" aria-hidden="true"></span>` +
        // Native USE (Part A): gated to consumables — weapons/armor already have
        // EQUIP, ammo/mod/misc have no consume semantics. Removes the confusing
        // "USE a rifle -> AI narration" path entirely.
        `${cat === 'aid' ? `<button class="use-btn" data-use="${it._origIdx}" title="Use ${escapeHtml(it.name)}" aria-label="Use item: ${escapeHtml(it.name)}">USE</button>` : ''}${typeTag}` +
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
      nativeUseItem(+use.dataset.use);
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
    // FO3 Shape A — the row's own inline controls above are CSS-hidden
    // (60-fo3-pipboy.css), so any other click on the row selects it for
    // the detail pane. Inert for NV: none of the closest() checks above
    // ever fail to match there since the controls stay visible/hittable.
    const row = e.target.closest('[data-rowidx]');
    if (row) _selectFo3ManifestRow(+row.dataset.rowidx);
  };
  if (typeof getIdentity === 'function' && getIdentity().rails) {
    lst
      .querySelectorAll('.mrow')
      .forEach(el => el.classList.toggle('fo3-sel', +el.dataset.rowidx === _fo3ManifestSel));
    _renderFo3ManifestDetail();
  }
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
