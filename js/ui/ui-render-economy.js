// ── ui-render-economy.js — RESOURCE ECONOMY (split from ui-render.js, 2.8.5 U-A4) ──
// The CRAFT panel — recipe crafting (renderCraft/renderCraftCard/doCraft) and
// component scrapping (renderScrapCard/doScrap) — and the native TRADE
// barter terminal (renderTrade/doBuy/doSell). Global scope, static <script>
// tag — see index.html load order.
//
// GOTCHA: doBuy()/doSell() mutate state.caps directly, then mirror the new
// value into the #c_caps DOM field by hand (the sync source-of-truth
// syncStateFromDom()/saveState() reads back from) — a WU-N2 fix. Any future
// TRADE mutation of state.caps must keep doing this mirror, or the caps
// change silently reverts on the next save.

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
  if (state.inventory[idx].qty === 0) {
    state.inventory.splice(idx, 1);
    if (reconcileEquipped(state) && typeof renderEquipped === 'function') renderEquipped();
  }
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
    // U7 (Protocol 42 — found by render-integrity.mjs's New Vegas coverage,
    // a real pre-existing defect): the inline font-size:11px this input was
    // authored with never actually applies on a touch viewport — Protocol
    // 17's AUTO-ZOOM GUARD (25-toolbar.css) forces every number input to
    // 16px !important to stop iOS auto-zoom, and 38px was sized for 11px
    // text, not 16px + the native spinner reserve. Widened to 52px, the
    // same width the FO3 SKILLS "15 renders as 1" fix (K-1) already
    // established for exactly this collision.
    `<input type="number" id="craftQty_${ri}" value="1" min="1" max="${Math.max(1, maxBatch)}" style="width:52px;font-size:11px;">` +
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
    // U7 (Protocol 42) — same fix, same reason, as craftQty above.
    `<input type="number" id="scrapQty_${bi}" value="1" min="1" max="${Math.max(1, have)}" style="width:52px;font-size:11px;">` +
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
  if (it.qty <= 0) {
    state.inventory.splice(idx, 1);
    if (reconcileEquipped(state) && typeof renderEquipped === 'function') renderEquipped();
  }
  if (typeof renderInventory === 'function') renderInventory();
  if (typeof updateMath === 'function') updateMath();
  renderTrade();
  saveState();
  RobcoEvents.emit('trade.sold', { name: it.name, price }); // U8 auto-log
  if (typeof appendToChat === 'function')
    appendToChat(`> [TRADE] Sold ${it.name} for ${price}c. Caps: ${state.caps}.`, 'sys');
}
