// ── ui-render-factions.js — FACTION REPUTATION & KARMA (split from ui-render.js, 2.8.5 U-A4) ──
// The inline fame/infamy editor (adjustFaction/renderFactionRep) and the FO3
// Karma Center appendix (renderKarmaCenter). Global scope, static <script>
// tag — see index.html load order.

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
  // FEEDBACK ANIMATION WAVE 3 (#15 NEEDLE KICK) — home-only; renderFactionRep()
  // just repainted synchronously above for THIS key (the button that calls
  // adjustFaction always targets the currently-selected channel), so the pin
  // is looked up directly, no defer needed.
  const pin = document.querySelector('.facon-pin');
  if (pin) {
    pin.classList.remove('needle-kick');
    void pin.offsetWidth;
    pin.classList.add('needle-kick');
    setTimeout(() => pin.classList.remove('needle-kick'), 500);
  }
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

// _pendingRepStamp (FEEDBACK ANIMATION WAVE 1, #14 REPUTATION STAMP) — a
// transient module var, never state.*, declared in state.js (loaded by
// test.html's reduced boot chain too — Protocol 27), consumed by
// renderFactionRep() the next time it paints (the same deferred-consumption
// pattern as _pendingSurveyPing/_pendingQuestStamp). Only shows when the
// affected faction is the currently-SELECTED channel (a mismatch just means
// no on-panel stamp that render; the echo still fires regardless).
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
  // hardcoded key list. A faction with no recognized tier still renders (an
  // "OTHER FACTIONS" fallback bucket) rather than silently vanishing.
  //
  // Owner batch item 6: MINOR FACTIONS is now a collapsible sub-panel sitting
  // directly under MAJOR FACTIONS (Protocol UI-2 — data-sub-id + the shared
  // robco_panel_state persistence, same mechanism as every other sub-panel),
  // styled to blend into the .facon-section look rather than read as a
  // separate boxed sub-panel (see the .facon-section.sub-panel CSS override).
  const chanBtn = f => {
    const cur = f.key === _facChannel;
    return `<button class="facon-chan${cur ? ' cur' : ''}" onclick="setFactionChannel('${f.key}')" aria-label="Select ${escapeHtml(f.name)} channel" aria-pressed="${cur}">${escapeHtml(f.name).toUpperCase()}</button>`;
  };
  const selectorSection = (list, label) =>
    list.length
      ? `<div class="facon-section"><div class="facon-section-label">${escapeHtml(label)}</div><div class="facon-selector">${list.map(chanBtn).join('')}</div></div>`
      : '';
  const minorSelectorSection = list =>
    list.length
      ? `<details class="facon-section sub-panel" data-sub-id="minor_factions_channel"><summary><h3>&gt; MINOR FACTIONS</h3></summary><div class="facon-selector">${list.map(chanBtn).join('')}</div></details>`
      : '';
  const majorFactions = registry.filter(f => f.tier === 'major');
  const minorFactions = registry.filter(f => f.tier === 'minor');
  const otherFactions = registry.filter(f => f.tier !== 'major' && f.tier !== 'minor');
  const selectorHtml =
    selectorSection(majorFactions, 'MAJOR FACTIONS') +
    minorSelectorSection(minorFactions) +
    selectorSection(otherFactions, 'OTHER FACTIONS');

  const sel = registry.find(f => f.key === _facChannel) || registry[0];
  const selData = dataFor(sel.key);
  const selStanding = standingOf(sel);
  const selPinPct = _facPinPct(selData);

  // FEEDBACK ANIMATION WAVE 1 (#14) — consume the pending stamp exactly
  // once, only when the affected channel is the one being painted.
  let repStampHtml = '';
  if (_pendingRepStamp && _pendingRepStamp.key === sel.key) {
    const dir = _pendingRepStamp.direction === 'vilified' ? 'vilified' : 'idolized';
    repStampHtml = `<span class="facon-stamp facon-stamp--${dir}" aria-hidden="true">${dir === 'vilified' ? 'VILIFIED' : 'IDOLIZED'}</span>`;
  }
  _pendingRepStamp = null;

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
      ${repStampHtml}
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
  // MINOR FACTIONS is rendered fresh every call (innerHTML replacement), which
  // would otherwise drop its open/closed state and toggle listener — wire it
  // the same way every OTHER dynamically-rendered sub-panel must (Protocol
  // UI-2), reusing the one persistence helper rather than a second mechanism.
  if (typeof _wireDynamicSubPanel === 'function') {
    _wireDynamicSubPanel(container.querySelector('[data-sub-id="minor_factions_channel"]'));
  }
  // The stamp is a one-shot CSS animation ending on a correct static final
  // frame (Protocol UI-9) — remove it after it plays so a later re-render
  // (e.g. switching channels back) doesn't replay it.
  if (repStampHtml) {
    setTimeout(() => {
      const el = container.querySelector('.facon-stamp');
      if (el) el.remove();
    }, 1600);
  }
}

// ── G4/KARMA ENGINE: EXPANDED KARMA SYSTEM (FO3) ────────────────────────
// When gameContext === 'FO3': Karma Center appendix shown inside BUS-09
// KARMA ALIGNMENT (Phase 3 OPERATOR batch 3 — the board itself is now
// universal; only this nested block is FO3-only, per usesKarmaCenter).
//
// Karma Engine rebuild (Protocol 8 Stage 2, 2026-07-15): the deterministic,
// offline, zero-AI engine below replaces the old hardcoded ENCLAVE HIT SQUAD
// fabrication + the flat karmaCompanions buckets with the real, cited FO3
// karma system — hit squads, 8 companions, 90 level-scaled titles, and an
// action-driven karma-event picker. All data lives in GAME_DEFS.FO3.karma
// (state.js), transcribed from planning/KARMA_DATA.md (Protocol 3). Every
// function below is pure over (karma, lvl) + _activeDef().karma —
// game-agnostic by construction (Protocol 38); NV (usesKarmaCenter: false)
// never calls any of it.
//
// Owner fix (FO3 duplicate-readout report, kept from the prior reskin): a
// game either presents karma via the swing-needle readout
// (#karmaNeedleReadout — NV, and any future non-KarmaCenter game) OR the
// Karma Center appendix (usesKarmaCenter — FO3), never both. The stat_karma
// slider itself is NEVER hidden — it's the one editable control for every
// game (Protocol 22) and remains the manual override; only the READOUT half
// is gated, purely on the existing usesKarmaCenter flag (Protocol 38, no
// game literal). karma_label/updateKarmaUI keep writing into the needle
// readout's DOM regardless of its visibility, so the FO3 slider still
// updates state and the Karma Center below (both driven off state.karma).

// FO3-specific band display labels, index-aligned to the shipped
// _KARMA_TIERS breakpoints (js/ui/ui-core-cmd.js) — reuses the SAME
// thresholds (Protocol 22, no new breakpoint definition; a lookup table with
// no numeric thresholds of its own is not a second breakpoint definition),
// but corrects the display text for the top band: _KARMA_TIERS[4].label is
// "Messiah" — an FO3 level-30 karma TITLE, not a band name, and a known,
// flagged mislabel (planning/KARMA_ENGINE_PLAN.md's "adjacent quirk" note)
// that today only reaches the NV swing-needle, which FO3 hides. Reusing that
// label verbatim on this NEW FO3-visible board would both misname the band
// AND collide with the Title line below (which independently shows
// "Messiah" as the real level-30 good title) — reintroducing exactly the
// kind of redundant readout this unit exists to remove (F9). src: fallout.wiki
// "Karma (Fallout 3)" ("Very Good: +750 to +1000" — the correct band name).
const _FO3_KARMA_BAND_LABELS = ['Very Evil', 'Evil', 'Neutral', 'Good', 'Very Good'];
function getKarmaTier(karma) {
  const idx = _KARMA_TIERS.findIndex(t => t.test(karma));
  const i = idx === -1 ? 2 : idx;
  return { label: _FO3_KARMA_BAND_LABELS[i], test: _KARMA_TIERS[i].test };
}

// 3-way title alignment — distinct from the 5-band tier above (do not
// conflate). Very Good + Good -> 'good'; Neutral -> 'neutral'; Very Evil +
// Evil -> 'bad'. Thresholds match the universal karma-scale convention
// (-250/+250) already used throughout this file.
function getTitleAlignment(karma) {
  if (karma >= 250) return 'good';
  if (karma <= -250) return 'bad';
  return 'neutral';
}

// The level-scaled karma title — the single most FO3-specific karma fact,
// modeled for the first time here. Clamps state.lvl (app cap 50) down to the
// title table's own cap (30) so levels 31-50 resolve to the level-30 title
// instead of undefined.
function getKarmaTitle(karma, lvl) {
  const karmaDef = _activeDef().karma || {};
  const titles = karmaDef.titles || {};
  const align = getTitleAlignment(karma);
  const maxLevel = karmaDef.titleMaxLevel || 30;
  const idx = Math.max(1, Math.min(lvl || 1, maxLevel)) - 1;
  const table = titles[align];
  const title = Array.isArray(table) ? table[idx] : null;
  return title || getKarmaTier(karma).label;
}

// The correct FO3 hunter factions (replaces the invented ENCLAVE HIT SQUAD):
// Regulators hunt at evil karma, Talon Company hunts at good karma — good
// karma also gets you hunted, which the old shipped code never modeled.
// Data-driven from GAME_DEFS.FO3.karma.hitSquads, never a literal faction
// name here.
function getKarmaHitSquad(karma) {
  const hitSquads = (_activeDef().karma || {}).hitSquads || [];
  if (karma <= -250) return hitSquads.find(h => h.alignment === 'evil') || null;
  if (karma >= 250) return hitSquads.find(h => h.alignment === 'good') || null;
  return null;
}

// Partitions the 8 companions by karma eligibility — 'none' always
// available; 'good'/'neutral'/'evil' available when karma is in that band.
function getKarmaCompanions(karma) {
  const companions = (_activeDef().karma || {}).companions || [];
  const align = karma >= 250 ? 'good' : karma <= -250 ? 'evil' : 'neutral';
  return companions.filter(c => c.karmaReq === 'none' || c.karmaReq === align);
}

// Applies one cited karma-event delta (the action picker's apply button).
// Guards delta == null — UNVERIFIED events are non-applicable, never a
// guessed number. Clamps ±1000 and keeps the slider (the manual override)
// and the board in sync through the same single path (Protocol 22).
function applyKarmaEvent(eventId) {
  const karmaDef = _activeDef().karma || {};
  const events = karmaDef.events || [];
  const ev = events.find(e => e.id === eventId);
  if (!ev || ev.delta == null) return;
  state.karma = Math.max(-1000, Math.min(1000, (state.karma || 0) + ev.delta));
  const slider = document.getElementById('stat_karma');
  if (slider) slider.value = state.karma;
  saveState();
  if (typeof updateKarmaUI === 'function') updateKarmaUI();
  renderKarmaCenter();
}

// The board, rebuilt (Protocol 22 — extends the existing renderKarmaCenter,
// no parallel renderer): ACTION PICKER -> TITLE -> NUMBER/BAND -> UNLOCKS.
// The tier word now appears exactly once, on the Number/Band line (F9 fix —
// the slider-side needle readout stays hidden on FO3 as before and no
// longer duplicates it here).
function renderKarmaCenter() {
  const block = document.getElementById('karmaCenterBlock');
  const needleReadout = document.getElementById('karmaNeedleReadout');
  const display = document.getElementById('karmaCenterDisplay');
  if (!display) return;
  const usesKarmaCenter = _activeDef().usesKarmaCenter;
  if (block) block.style.display = usesKarmaCenter ? '' : 'none';
  if (needleReadout) needleReadout.style.display = usesKarmaCenter ? 'none' : '';
  if (!usesKarmaCenter) return;

  const karma = state.karma || 0;
  const lvl = state.lvl || 1;
  const tier = getKarmaTier(karma);
  const title = getKarmaTitle(karma, lvl);
  const hitSquad = getKarmaHitSquad(karma);
  const companions = getKarmaCompanions(karma);
  const karmaDef = _activeDef().karma || {};
  const events = Array.isArray(karmaDef.events) ? karmaDef.events : [];
  const barPct = Math.max(0, Math.min(100, ((karma + 1000) / 2000) * 100));

  // ── Action picker — filterable tracker-row list (Protocol UI-3), reusing
  // the #notesSearch-style filter-input pattern (Protocol 22). The filter
  // input itself is static markup outside this innerHTML region so it never
  // loses focus/cursor position on re-render (see #karmaEventFilter in
  // index.html).
  const filterEl = document.getElementById('karmaEventFilter');
  const q = (filterEl ? filterEl.value : '').trim().toLowerCase();
  const shownEvents = events.filter(e => !q || e.label.toLowerCase().includes(q));
  const eventRowHtml = e => {
    const disabled = e.delta == null;
    const badge = disabled ? 'UNVERIFIED' : (e.delta > 0 ? '+' : '') + e.delta;
    const cls =
      'tracker-row tracker-toggle karma-event-row ' +
      (disabled ? 'tracker-toggle--inactive' : 'tracker-toggle--active');
    const label = escapeHtml(e.label);
    const metaText = disabled
      ? 'value unverified — wiki gives no exact figure'
      : e.repeatable
        ? 'repeatable'
        : 'one-time';
    return (
      `<button class="${cls}" ${disabled ? 'disabled' : ''} onclick="applyKarmaEvent('${e.id}')" ` +
      `aria-label="${label} (${badge})${disabled ? ' — value unverified, cannot apply' : ' — apply'}">` +
      `${label}<span class="tracker-meta">${escapeHtml(metaText)} &middot; ${badge}</span>` +
      `</button>`
    );
  };
  let html = `<div class="kc-events">`;
  html += shownEvents.length
    ? shownEvents.map(eventRowHtml).join('')
    : emptyState('NO ACTIONS MATCH THIS FILTER');
  html += `</div>`;

  // ── Title line — the level-scaled FO3-specific title.
  html += `<div class="kc-title-line">${escapeHtml(title)}</div>`;

  // ── Number/band — the ONLY place the tier word appears on this board now.
  html += `
    <div style="text-align:center;font-size:16px;letter-spacing:3px;padding:4px 0;">${escapeHtml(tier.label.toUpperCase())}</div>
    <div style="font-size:11px;opacity:0.6;text-align:center;margin-bottom:6px;">KARMA: ${karma > 0 ? '+' : ''}${karma}</div>
    <div style="background:rgba(var(--robco-green-rgb),0.1);height:4px;border-radius:2px;margin:0 0 8px;">
      <div style="height:4px;width:${barPct}%;background:var(--robco-green);border-radius:2px;transition:width 0.4s;"></div>
    </div>`;

  // ── Unlocks — hit-squad warning (correct faction + contract, both
  // directions) and companion availability.
  if (hitSquad) {
    html += `<div style="font-size:10px;letter-spacing:1px;opacity:0.8;border:1px dashed rgba(255,80,80,0.6);padding:4px 6px;margin-bottom:6px;">[!] ${escapeHtml(hitSquad.faction.toUpperCase())} RISK &mdash; ${escapeHtml(hitSquad.contract.toUpperCase())}</div>`;
  } else {
    html += `<div style="font-size:10px;opacity:0.5;margin-bottom:6px;">NO BOUNTY ACTIVE</div>`;
  }

  if (companions.length) {
    html += `<div style="font-size:10px;opacity:0.55;margin-top:4px;">COMPANIONS AVAILABLE: ${escapeHtml(companions.map(c => c.name).join(', '))}</div>`;
  }

  display.innerHTML = html;
}
