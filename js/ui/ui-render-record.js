// ── ui-render-record.js — PERSONAL RECORD (split from ui-render.js, 2.8.5 U-A4) ──
// The session-stat odometer tally (renderSessionStats), the equipped-gear
// readout (renderEquipped), the CURIO collectibles archive
// (renderCollectibles/toggleCollectible), FO3 Lincoln memorabilia tracking,
// and character traits (renderTraits/toggleTrait). Global scope, static
// <script> tag — see index.html load order.

// #8 Session Statistics — renders state.stats
// Builds one BUS-21 mechanical odometer tile — the value is rendered as
// individual digit/character cells (works for both a zero-padded number and
// a formatted duration string like "3:12").
function _odoTile(cap, valueStr, sub) {
  const digits = String(valueStr)
    .split('')
    .map(ch => `<b>${escapeHtml(ch)}</b>`)
    .join('');
  return `<div class="odo-tile"><span class="odo-cap">${escapeHtml(cap)}</span><span class="odo-digits">${digits}</span><span class="odo-sub">${escapeHtml(sub)}</span></div>`;
}

// ── BUS-21 · SERVICE TALLY (Phase 3 · Piece 3) — session stats as a
// mechanical odometer/counter bank (Protocol 22 — resetSessionStats/
// state.stats reads untouched).
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
  const collectLabel = String(_activeDef().collectibleLabel || 'CURIOS').toLowerCase();

  const tiles = [
    _odoTile('CONFIRMED KILLS', String(s.kills || 0).padStart(4, '0'), 'campaign total'),
    _odoTile('CAPS EARNED', String(s.capsEarned || 0).padStart(4, '0'), 'gross intake'),
    _odoTile('DAMAGE DEALT', String(s.damageDealt || 0).padStart(4, '0'), 'cumulative'),
    _odoTile('CURRENT SITTING', sittingStr, 'live duration'),
    _odoTile('TICKS ELAPSED', String(state.ticks || 0).padStart(4, '0'), 'game time'),
    _odoTile(
      'LOCATIONS FIXED',
      String((state.locationHistory || []).length).padStart(4, '0'),
      'survey count'
    ),
  ];
  if (collectTotal > 0) {
    tiles.push(
      _odoTile(
        'CURIOS FOUND',
        String(collectAcquired).padStart(2, '0'),
        `of ${collectTotal} ${collectLabel}`
      )
    );
  }
  statsDiv.innerHTML = `<div class="tally-bank">${tiles.join('')}</div>`;

  const statusEl = document.getElementById('dbTallyStatus');
  if (statusEl) {
    statusEl.textContent = `${s.kills || 0} KILLS · ${s.capsEarned || 0}c EARNED · ${sittingStr} SITTING`;
  }
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

// ── CURIO ARCHIVE (BUS-15 COLLECTIBLES) ─────────────────────────────
// Owner-approved themed-object redesign (Protocol 25): every collectible
// renders as its recognizable Fallout object instead of a plain [ACQUIRED]/
// [MISSING] text row, displayed inside one sealed glass display case with
// plank shelves mounted inside it (owner clarification — a display case
// naturally has shelves inside it, so this is ONE unified vitrine, not a
// switchable view). Object CLASS is category-driven (Protocol 38) — never
// a JS ctx branch: GAME_DEFS[ctx].collectibleCategory picks the uniform
// object every collectible in that game renders as (snowglobe/bobblehead);
// each Lincoln relic carries its OWN registry `shape` field instead, since
// (unlike collectibles) Lincoln relics are not one uniform object type.
function _curioObjectIconHtml(kind) {
  if (kind === 'bobblehead') {
    return '<span class="curio-bob" aria-hidden="true"><span class="cb-head"></span><span class="cb-body"></span><span class="cb-base"></span></span>';
  }
  if (typeof kind === 'string' && kind.indexOf('lincoln-') === 0) {
    const shape = kind.slice(8).replace(/[^a-z]/gi, '') || 'book';
    return `<span class="curio-linc curio-linc--${shape}" aria-hidden="true"><i></i></span>`;
  }
  // Default/fallback: snowglobe (also what a future game with no authored
  // collectibleCategory degrades to — a safe generic, never a thrown error).
  return '<span class="curio-globe" aria-hidden="true"><span class="cg-dome"></span><span class="cg-base"></span></span>';
}

// Reads FALLOUT_REGISTRY.collectibles (game-specific list) and state.collectibles
// (flat array of collected item names). Renders the themed curio grid.
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
  const category = _activeDef().collectibleCategory || 'snowglobe';

  // Update sub-panel summary label with game-specific type and count
  const collectiblesH3 = document.querySelector('#collectiblesSubPanel > summary > h3');
  if (collectiblesH3) collectiblesH3.textContent = `> ${typeLabel} [${acquiredCount}/${total}]`;
  // BUS-15 CURIO ARCHIVE board-level 0i status (Phase 3 · Piece 2)
  const curioStatus = document.getElementById('opsCurioStatus');
  if (curioStatus) curioStatus.textContent = `${acquiredCount}/${total} ${typeLabel} ACQUIRED`;
  const curioPn = document.querySelector('#curioPanel .bay-part-no');
  if (curioPn)
    curioPn.innerHTML = `PN RBC-FRT-15 &middot; DISPLAY CASE — ${escapeHtml(typeLabel)} <span class="real-label">(COLLECTIBLES — toggleCollectible unchanged)</span>`;
  const plaque = document.getElementById('curioMainPlaque');
  if (plaque) plaque.textContent = `◈ ${acquiredCount} OF ${total} ${typeLabel} ON DISPLAY`;

  // FEEDBACK ANIMATION WAVE 1 (#22 EXHIBIT LIGHT-UP) — consume the pending
  // list exactly once, only for the objects it names, then clear it.
  const lightNames = new Set(_pendingExhibitLight.map(n => n.toLowerCase()));
  _pendingExhibitLight = [];

  const icon = _curioObjectIconHtml(category);
  container.innerHTML = defs
    .map(d => {
      const isAcq = acquired.has(d.name.toLowerCase());
      const safeAttr = escapeHtml(d.name);
      const word = isAcq
        ? 'acquired; tap to mark missing'
        : 'missing; tap to mark acquired' +
          (d.location ? ` — last known location ${escapeHtml(d.location)}` : '');
      const isLighting = lightNames.has(d.name.toLowerCase());
      const cls =
        'curio-obj tracker-row tracker-toggle ' +
        (isAcq ? 'tracker-toggle--active' : 'tracker-toggle--inactive') +
        (isLighting ? ' curio-lightup' : '');
      return (
        `<div class="curio-cell"><button class="${cls}" data-name="${safeAttr}" ` +
        `onclick="toggleCollectible(this.dataset.name)" aria-label="${escapeHtml(d.name)} — ${word}">` +
        `${icon}<span class="c-plate">${escapeHtml(d.name.toUpperCase())}</span>` +
        `<span class="c-chip">${isAcq ? '◈ ACQUIRED' : '◇ MISSING'}</span></button></div>`
      );
    })
    .join('');
  if (lightNames.size) {
    setTimeout(() => {
      container
        .querySelectorAll('.curio-lightup')
        .forEach(el => el.classList.remove('curio-lightup'));
    }, 1600);
  }
}

// _pendingExhibitLight (FEEDBACK ANIMATION WAVE 1, #22 EXHIBIT LIGHT-UP) — an
// array of newly-acquired names, never state.*, declared in state.js (loaded
// by test.html's reduced boot chain too — Protocol 27), consumed by
// renderCollectibles() the next time it paints (the same deferred-consumption
// pattern as _pendingSurveyPing/_pendingQuestStamp).
function toggleCollectible(name) {
  if (!state.collectibles) state.collectibles = [];
  const lowerName = name.toLowerCase();
  const idx = state.collectibles.findIndex(n => n.toLowerCase() === lowerName);
  if (idx >= 0) {
    state.collectibles.splice(idx, 1);
  } else {
    state.collectibles.push(name);
    RobcoEvents.emit('collectible.acquired', { name }); // U8 auto-log
    _pendingExhibitLight.push(name);
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
  if (summaryH3) summaryH3.textContent = `> LINCOLN MEMORABILIA [${foundCount}/${defs.length}]`;

  const dispTally = { hannibal: 0, leroy: 0, washington: 0, undecided: 0 };
  defs.forEach(d => {
    const disp = items[d.name];
    if (disp === 'hannibal') dispTally.hannibal++;
    else if (disp === 'leroy') dispTally.leroy++;
    else if (disp === 'washington') dispTally.washington++;
    else if (disp === 'found') dispTally.undecided++;
  });

  const tally = document.getElementById('lincolnTally');
  if (tally)
    tally.textContent = `HANNIBAL ${dispTally.hannibal} · LEROY ${dispTally.leroy} · WASHINGTON ${dispTally.washington} · UNDECIDED ${dispTally.undecided}`;
  const plaque = document.getElementById('lincolnPlaque');
  if (plaque) plaque.textContent = `◈ ${foundCount} OF ${defs.length} RELICS RECOVERED`;

  const OPTS = [
    ['found', 'UNDECIDED'],
    ['hannibal', 'HANNIBAL (FREE SLAVES)'],
    ['leroy', 'LEROY WALKER (SLAVERS)'],
    ['washington', 'WASHINGTON (MUSEUM)'],
  ];

  container.innerHTML = defs
    .map(d => {
      const safeName = escapeHtml(d.name);
      const disp = items[d.name];
      const isFound = !!disp;
      const icon = _curioObjectIconHtml('lincoln-' + (d.shape || 'book'));
      const word = isFound ? 'recovered; tap to mark missing' : 'missing; tap to mark recovered';
      const cls =
        'curio-obj tracker-row tracker-toggle ' +
        (isFound ? 'tracker-toggle--active' : 'tracker-toggle--inactive');
      let dispositionSelect = '';
      if (isFound) {
        const optsHtml = OPTS.filter(([val]) => val === 'found' || d.buyers.includes(val))
          .map(
            ([val, label]) =>
              `<option value="${val}"${disp === val ? ' selected' : ''}>${label}</option>`
          )
          .join('');
        dispositionSelect =
          `<select class="curio-linc-disposition" data-lname="${safeName}" ` +
          `onchange="setLincolnDisposition(this.dataset.lname,this.value)" ` +
          `aria-label="${escapeHtml(d.name)} disposition">${optsHtml}</select>`;
      }
      return (
        `<div class="curio-cell"><button class="${cls}" data-lname="${safeName}" ` +
        `onclick="toggleLincolnItem(this.dataset.lname)" aria-label="${escapeHtml(d.name)} — ${word}">` +
        `${icon}<span class="c-plate">${escapeHtml(d.name.toUpperCase())}</span>` +
        `<span class="c-chip">${isFound ? '◈ RECOVERED' : '◇ MISSING'}</span></button>` +
        `${dispositionSelect}</div>`
      );
    })
    .join('');
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

  // Owner report fix: each row used to be a wrapper DIV (class tracker-row)
  // around a small inner toggle BUTTON (class tracker-toggle) — only that
  // inner [SEL]/[---] bracket-text button actually toggled, and
  // .trait-chips' width:auto sized each row to its OWN content, so
  // short-effect traits (Skilled, Small Frame) rendered as narrow/indented
  // chips next to the full-width ones. Fixed to match the SAME single-button
  // pattern every other tracker (skill books/magazines/curios — see
  // _renderReadTracker above) already uses: the row IS the toggle (a single
  // combined button.tracker-row.tracker-toggle, Protocol UI-3/UI-5), so the
  // whole chip is clickable, and a lit/dim ●/○ glyph replaces the dated
  // [SEL]/[---] bracket text while keeping identical toggle semantics.
  const renderRow = d => {
    const safeAttr = escapeHtml(d.name);
    const isSel = selected.includes(d.name);
    const dlcBadge =
      d.dlc === 'owb' ? ' <span style="font-size:9px;opacity:0.5;">[OWB]</span>' : '';
    const cls =
      'tracker-row tracker-toggle ' +
      (isSel ? 'tracker-toggle--active' : 'tracker-toggle--inactive');
    const glyph = isSel ? '&#9679;' : '&#9675;'; // ● / ○
    const word = isSel ? 'Deselect trait' : 'Select trait';
    html += `<button class="${cls}" data-name="${safeAttr}" onclick="toggleTrait(this.dataset.name)" aria-label="${word} ${safeAttr}">`;
    html += `<span class="trait-lamp" aria-hidden="true">${glyph}</span>`;
    html += `${escapeHtml(d.name.toUpperCase())}${dlcBadge}<span class="tracker-meta"> &mdash; ${escapeHtml(d.effect)}</span>`;
    html += `</button>`;
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
