// ── ui-render-loot.js — ITEM ACQUISITION (split from ui-render.js, 2.8.5 U-A4) ──
// The native LOOT add-to-inventory terminal and the Visual Upload OCR
// preview/confirm/apply flow — both additive item-intake paths into
// state.inventory (Protocol 34). Global scope, static <script> tag — see
// index.html load order.

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
  // FEEDBACK ANIMATION WAVE 2 (#18 MANIFEST PUNCH) — same additive item.added
  // emit as addItem()'s manual path (Protocol 22, one signal, two setters).
  RobcoEvents.emit('item.added', {
    name: item.name,
    qty,
    source: 'loot',
    type: db ? db.type : item.type,
  });
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

// ── VISUAL UPLOAD OCR Unit 2: preview / confirm / additive apply ──────────
// planning/VISUAL_UPLOAD_OCR_PLAN.md §3.4/3.5. js/ocr.js's pure _parseOcrText()
// hands off a structured { inventory, stats, unparsed } object here; this
// section owns the confirm-gated modal and the validated write path. Nothing
// in js/ocr.js ever touches state — the ONLY writes anywhere in this feature
// happen inside _confirmVisualParse(), and only after the player taps CONFIRM
// & APPLY (Protocol 24 — OCR is a suggestion, the player is the authority).

// Pure additive merge for a single OCR-detected inventory row — mirrors
// addItem()'s find-or-increment idiom (backfill wgt/val from 0, backfill type
// from 'misc') as a pure, testable function, the same shape as the existing
// _lootAdd() (Protocol 22 — new call site, since OCR rows are programmatic
// rather than DOM-input-driven, not a forked merge algorithm). Never deletes
// or touches any other row — additive-only (Protocol 34), which is what
// enforces the AI directive's old "never delete un-pictured items" rule in
// code rather than only in a prompt.
function _visualParseInventoryMerge(inventory, row) {
  const inv = Array.isArray(inventory) ? inventory.map(i => ({ ...i })) : [];
  const name = String((row && row.name) || '').trim();
  if (!name) return inv;
  const qty = Math.max(1, Math.min(999, Math.floor(Number(row.qty) || 1)));
  const wgt = Number(row.wgt) || 0;
  const val = Number(row.val) || 0;
  const type = row.type || 'misc';
  const ex = inv.find(i => String(i.name).toLowerCase() === name.toLowerCase());
  if (ex) {
    ex.qty = (ex.qty || 0) + qty;
    if ((!ex.wgt || ex.wgt === 0) && wgt) ex.wgt = wgt;
    if ((!ex.val || ex.val === 0) && val) ex.val = val;
    if (ex.type === 'misc' && type !== 'misc') ex.type = type;
  } else {
    inv.push({ name, qty, wgt, val, type });
  }
  return inv;
}

// applyVisualParse(parsed) — the validated, additive, confirm-gated write
// path (§3.5). `parsed` is the ALREADY keep/discard-filtered + edited row set
// (built by _confirmVisualParse() from the live preview DOM) — this function
// itself does not read any DOM, so it is directly unit-testable the same way
// _lootAdd()/_threatCompute() are. Inventory rows route through
// _visualParseInventoryMerge() (additive, no-clobber); stat rows route
// through the SAME _resolveStatToken()/_applyStatToken() choke point Native
// USE and TERMINAL stat edits already use (js/services/api-router.js, Protocol 22) — those
// setters already clamp (SPECIAL 1–10, skill 0–100, HP≤max, rads≤maxRads,
// level≤MAX_PLAYER_LEVEL) and call saveState() themselves, so an OCR
// misread (e.g. "S: 99") can never exceed a real limit (Protocol 24). No new
// campaign-state field — everything rides state.inventory / the existing
// native setters, already covered by sanitizeImportedContainer()/
// migrateState() and the cloud save (Protocol 34 serialized-whole).
function applyVisualParse(parsed) {
  parsed = parsed && typeof parsed === 'object' ? parsed : {};
  const inventoryRows = Array.isArray(parsed.inventory) ? parsed.inventory : [];
  const statRows = Array.isArray(parsed.stats) ? parsed.stats : [];

  let itemsApplied = 0;
  inventoryRows.forEach(row => {
    const name = String((row && row.name) || '').trim();
    if (!name) return;
    state.inventory = _visualParseInventoryMerge(state.inventory, row);
    const qty = Math.max(1, Math.min(999, Math.floor(Number(row.qty) || 1)));
    // FEEDBACK ANIMATION WAVE 2 (#18 MANIFEST PUNCH) — same additive
    // item.added signal the manual/LOOT paths already emit (Protocol 22).
    if (typeof RobcoEvents !== 'undefined' && RobcoEvents.emit) {
      RobcoEvents.emit('item.added', { name, qty, source: 'ocr', type: row.type || 'misc' });
    }
    itemsApplied++;
  });

  let statsApplied = 0;
  statRows.forEach(row => {
    if (!row || !row.kind || !row.key) return;
    if (typeof _applyStatToken !== 'function') return;
    _applyStatToken({ kind: row.kind, key: row.key }, row.value);
    statsApplied++;
  });

  if (itemsApplied > 0 && typeof renderInventory === 'function') renderInventory();
  if (typeof updateMath === 'function') updateMath();
  saveState();
  if (typeof appendToChat === 'function') {
    appendToChat(
      `> [OPTICAL SCAN] Applied ${itemsApplied} item(s), ${statsApplied} stat edit(s).`,
      'sys'
    );
  }
  return { itemsApplied, statsApplied };
}

// Module-scope handle to whatever screenshot/parse the preview modal is
// currently showing — read only by _confirmVisualParse() (below) and cleaned
// up on modal close. Transient only; never persisted.
let _pendingVisualParse = null;
let _pendingVisualScanUrl = null;
// Set true ONLY by the TRY AI VISION button (Unit 3) for the one closeModal()
// call it makes itself, so the modal's onClose below can tell "closing to
// hand off to the AI-vision fallback" apart from every other close reason
// (CONFIRM/CANCEL/MANUAL ENTRY/Escape/X) — the former must NOT clear the
// image stash (transmitMessage() still needs it), the latter all must.
let _visualParseRoutingToAiVision = false;

// renderVisualParsePreview(parsed, file) — the confirm-gated preview modal
// (§3.4), built on the SAME openModal()/#sysModal shell every other native
// terminal (LOOT, THREAT, CONSULT) already uses. Two keep/discard-toggled,
// editable sections (DETECTED INVENTORY / DETECTED STATS); a "NOTHING
// DETECTED" empty state offers MANUAL ENTRY (jumps to the native CARGO
// MANIFEST add-item form — no AI). The hybrid "TRY AI VISION" fallback
// (planning/VISUAL_UPLOAD_OCR_PLAN.md §4) is Unit 3 scope and is
// deliberately NOT wired here. Mobile-first (Protocol 17): ≥16px inputs,
// ≥28px tap targets, no horizontal overflow at 360/412 (verified live).
function renderVisualParsePreview(parsed, file) {
  parsed =
    parsed && typeof parsed === 'object' ? parsed : { inventory: [], stats: [], unparsed: [] };
  const inventory = Array.isArray(parsed.inventory) ? parsed.inventory : [];
  const stats = Array.isArray(parsed.stats) ? parsed.stats : [];

  if (_pendingVisualScanUrl) {
    URL.revokeObjectURL(_pendingVisualScanUrl);
    _pendingVisualScanUrl = null;
  }
  let thumbHtml = '';
  if (file && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    try {
      _pendingVisualScanUrl = URL.createObjectURL(file);
      thumbHtml = `<img src="${_pendingVisualScanUrl}" alt="Scanned screenshot" class="visparse-thumb" />`;
    } catch (_) {
      /* the thumbnail is cosmetic only — never block the preview on it */
    }
  }

  const invRowsHtml = inventory
    .map((row, i) => {
      const qty = Math.max(1, Math.min(999, Math.floor(Number(row.qty) || 1)));
      return (
        `<div class="visparse-row" data-idx="${i}">` +
        `<input type="checkbox" class="visparse-keep" id="visKeepInv${i}" checked aria-label="Keep ${escapeHtml(row.name)}" />` +
        `<input type="number" class="visparse-qty" id="visQtyInv${i}" value="${qty}" min="1" max="999" aria-label="Quantity for ${escapeHtml(row.name)}" />` +
        `<span class="visparse-name">${escapeHtml(row.name)}</span>` +
        `<span class="visparse-meta">${escapeHtml(row.type || 'misc')} &middot; ${Number(row.wgt) || 0} wgt &middot; ${Number(row.val) || 0}c</span>` +
        (row.matched ? '' : '<span class="visparse-unmatched">UNMATCHED</span>') +
        `</div>`
      );
    })
    .join('');

  const statRowsHtml = stats
    .map((row, i) => {
      const val = Math.round(Number(row.value) || 0);
      return (
        `<div class="visparse-row visparse-stat-row" data-idx="${i}">` +
        `<input type="checkbox" class="visparse-stat-keep" id="visKeepStat${i}" checked aria-label="Keep ${escapeHtml(row.label)}" />` +
        `<span class="visparse-name">${escapeHtml(row.label)}</span>` +
        `<input type="number" class="visparse-stat-value" id="visValStat${i}" value="${val}" aria-label="Value for ${escapeHtml(row.label)}" />` +
        `</div>`
      );
    })
    .join('');

  const nothingDetected = !inventory.length && !stats.length;
  const body =
    thumbHtml +
    (nothingDetected
      ? '<div class="empty-state">NOTHING DETECTED — the optical scan found no recognizable items or stats in this image.</div>' +
        '<div class="visparse-hint">Try a clearer, closer screenshot, ask Director vision instead, or add items directly.</div>' +
        '<div class="modal-confirm-actions">' +
        '<button type="button" id="visTryAiBtn" class="blue-btn">[ TRY AI VISION ]</button>' +
        '<button type="button" id="visManualEntryBtn" class="blue-btn">[ MANUAL ENTRY ]</button>' +
        '</div>'
      : (inventory.length
          ? `<div class="visparse-section-label">DETECTED INVENTORY (${inventory.length})</div>${invRowsHtml}`
          : '') +
        (stats.length
          ? `<div class="visparse-section-label">DETECTED STATS (${stats.length})</div>${statRowsHtml}`
          : '') +
        '<div class="visparse-hint">Uncheck a row to discard it, or edit the value before confirming. Nothing is saved until CONFIRM &amp; APPLY.</div>' +
        '<div class="modal-confirm-actions">' +
        '<button type="button" id="visConfirmBtn" class="blue-btn">[ CONFIRM &amp; APPLY ]</button>' +
        '<button type="button" id="visCancelBtn" class="blue-btn">[ CANCEL ]</button>' +
        '</div>');

  _pendingVisualParse = { inventory, stats };

  openModal({
    title: '> OPTICAL SCAN — REVIEW & CONFIRM',
    body,
    // Unit 3: every close reason EXCEPT "routing to AI vision" releases the
    // image stash (attachedImageData/attachedImageMimeType) — the TRY AI
    // VISION handler below is the one call site that sets the flag right
    // before its own closeModal() so this callback skips the clear and lets
    // transmitMessage() own (and later release) the stash instead.
    onClose: () => {
      if (_pendingVisualScanUrl) {
        URL.revokeObjectURL(_pendingVisualScanUrl);
        _pendingVisualScanUrl = null;
      }
      _pendingVisualParse = null;
      if (_visualParseRoutingToAiVision) {
        _visualParseRoutingToAiVision = false;
      } else if (typeof _clearVisualUploadStash === 'function') {
        _clearVisualUploadStash();
      }
    },
  });

  const confirmBtn = document.getElementById('visConfirmBtn');
  if (confirmBtn) confirmBtn.addEventListener('click', _confirmVisualParse);
  const cancelBtn = document.getElementById('visCancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal());
  const manualBtn = document.getElementById('visManualEntryBtn');
  if (manualBtn)
    manualBtn.addEventListener('click', () => {
      closeModal();
      if (typeof expandPanelForCategory === 'function') expandPanelForCategory('inventory');
    });
  const tryAiBtn = document.getElementById('visTryAiBtn');
  if (tryAiBtn)
    tryAiBtn.addEventListener('click', () => {
      _visualParseRoutingToAiVision = true;
      closeModal();
      if (typeof _tryAiVisionFallback === 'function') {
        _tryAiVisionFallback('> [SYS] ROUTING TO DIRECTOR VISION…');
      }
    });
}

// _confirmVisualParse() — reads the LIVE preview DOM (keep checkboxes +
// edited qty/value inputs), builds the final row set, and is the ONLY call
// site anywhere in this feature that invokes applyVisualParse(). Nothing is
// written before this fires (Protocol 24 — the confirm gate).
function _confirmVisualParse() {
  const pending = _pendingVisualParse;
  if (!pending) return;

  const keptInventory = [];
  (pending.inventory || []).forEach((row, i) => {
    const keepEl = document.getElementById('visKeepInv' + i);
    if (keepEl && !keepEl.checked) return;
    const qtyEl = document.getElementById('visQtyInv' + i);
    const qty = qtyEl ? parseInt(qtyEl.value, 10) : row.qty;
    keptInventory.push({ ...row, qty: Number.isFinite(qty) && qty > 0 ? qty : row.qty });
  });

  const keptStats = [];
  (pending.stats || []).forEach((row, i) => {
    const keepEl = document.getElementById('visKeepStat' + i);
    if (keepEl && !keepEl.checked) return;
    const valEl = document.getElementById('visValStat' + i);
    const value = valEl ? parseInt(valEl.value, 10) : row.value;
    keptStats.push({ ...row, value: Number.isFinite(value) ? value : row.value });
  });

  applyVisualParse({ inventory: keptInventory, stats: keptStats });
  closeModal();
}
