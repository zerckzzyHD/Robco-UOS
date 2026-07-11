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

// ── G4: EXPANDED KARMA SYSTEM (FO3) ─────────────────────────────
// When gameContext === 'FO3': Karma Center appendix shown inside BUS-09
// KARMA ALIGNMENT (Phase 3 OPERATOR batch 3 — the board itself is now
// universal; only this nested block is FO3-only, per usesKarmaCenter).
// Thresholds: Very Evil (<-750) / Evil (<-250) / Neutral / Good (>250) / Very Good (>750).
// Differentiated by text labels and brightness — no multi-color.
//
// Owner fix (FO3 duplicate-readout report): a game either presents karma via
// the swing-needle readout (#karmaNeedleReadout — NV, and any future non-
// KarmaCenter game) OR the Karma Center appendix (usesKarmaCenter — FO3),
// never both. The stat_karma slider itself is NEVER hidden — it's the one
// editable control for every game (Protocol 22); only the READOUT half is
// gated, purely on the existing usesKarmaCenter flag (Protocol 38, no game
// literal). karma_label/updateKarmaUI keep writing into the needle readout's
// DOM regardless of its visibility, so the FO3 slider still updates state
// and the Karma Center title/readout below (both driven off state.karma).
function renderKarmaCenter() {
  const block = document.getElementById('karmaCenterBlock');
  const needleReadout = document.getElementById('karmaNeedleReadout');
  const display = document.getElementById('karmaCenterDisplay');
  if (!display) return;
  const usesKarmaCenter = _activeDef().usesKarmaCenter;
  if (block) block.style.display = usesKarmaCenter ? '' : 'none';
  if (needleReadout) needleReadout.style.display = usesKarmaCenter ? 'none' : '';

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
