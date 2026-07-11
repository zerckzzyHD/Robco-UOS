// ── ui-core-cmd.js — COMMAND LAYER (split from ui-core.js, 2.8.5 U-A1) ──
// HP/XP/Rad bar interactions, native stat/quick-log setters, COMMAND_REGISTRY,
// karma/skills UI, the core event-bus subscriber wiring (stat/quest/faction
// feedback), the feedback echo system, the location card, SPECIAL fader drag,
// operator telemetry, and Tool Deck D-pad routing. Global scope, static
// <script> tag — see index.html load order.

function setupHpBarInteraction() {
  const container = document.getElementById('hp_bar_container');
  if (!container) return;
  function applyHp(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const hpMax = parseInt(document.getElementById('stat_hp_max').value) || 100;
    const newHp = Math.round(pct * hpMax);
    document.getElementById('stat_hp_cur').value = newHp;
    state.hpCur = newHp;
    _emitStatChangeIfDiffers('hp', newHp); // CHASSIS LIVING CORE #14
    updateMath();
  }
  let dragging = false;
  container.addEventListener('mousedown', e => {
    dragging = true;
    applyHp(e);
  });
  document.addEventListener('mousemove', e => {
    if (dragging) applyHp(e);
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
  });
  container.addEventListener(
    'touchstart',
    e => {
      dragging = true;
      applyHp(e);
      e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    e => {
      if (dragging) applyHp(e);
    },
    { passive: false }
  );
  document.addEventListener('touchend', () => {
    dragging = false;
  });
}

// C11: XP bar click-drag — mirrors HP bar but sets XP within [xpCur, xpNext-1] range.
// Allows direct manipulation of XP progress within the current level.
function setupXpBarInteraction() {
  const container = document.getElementById('xp_bar_container');
  if (!container) return;
  function applyXp(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const lvl = Math.max(1, parseInt(document.getElementById('stat_lvl').value) || 1);
    const xpCur = lvl <= 1 ? 0 : 75 * (lvl * lvl) - 25 * lvl - 50;
    const xpNext = 75 * ((lvl + 1) * (lvl + 1)) - 25 * (lvl + 1) - 50;
    const newXp = Math.round(xpCur + pct * (xpNext - xpCur - 1));
    document.getElementById('stat_xp').value = newXp;
    state.xp = newXp;
    _emitStatChangeIfDiffers('xp', newXp); // CHASSIS LIVING CORE #14
    updateMath();
  }
  let dragging = false;
  container.addEventListener('mousedown', e => {
    dragging = true;
    applyXp(e);
  });
  document.addEventListener('mousemove', e => {
    if (dragging) applyXp(e);
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
  });
  container.addEventListener(
    'touchstart',
    e => {
      dragging = true;
      applyXp(e);
      e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    e => {
      if (dragging) applyXp(e);
    },
    { passive: false }
  );
  document.addEventListener('touchend', () => {
    dragging = false;
  });
}

// Owner batch item 2: RAD EXPOSURE bar click-drag — mirrors setupHpBarInteraction()/
// setupXpBarInteraction() exactly (Protocol 22), scaling to this game's RAD ceiling
// (_resolveMaxRads(), the same GAME_DEFS[ctx].maxRads capRadsMax() already clamps to)
// instead of a fixed max. Writes through the single real #stat_rads input — every
// RAD surface (SKELETAL HARNESS + VITAL TELEMETRY) stays a read-only mirror of it
// (updateMath() repaints all of them).
//
// Owner follow-up (Protocol 27 root cause, 2nd report): the owner drags the RAD
// trace inside the VITAL TELEMETRY monitor (#opRadLineWrap, alongside the HP/GRADE
// traces which already drag on real touch) — not the SKELETAL HARNESS bar
// (#radDragTrack) the earlier fixes targeted. #opRadLineWrap never had ANY drag
// wiring at all, on mouse or touch — it was a display-only readout painted by
// _syncOperatorTelemetry(), unlike #hp_bar_container/#xp_bar_container in the same
// monitor. _wireRadDragSurface() is the one drag mechanism (Protocol 22 — no
// duplicated logic) now attached to BOTH RAD surfaces from setupRadBarInteraction().
//
// Owner follow-up (Protocol 27 root cause, 3rd report): both RAD fills still
// visibly lagged behind a real drag while HP/XP tracked instantly, even after
// the touch-action/transition-duration fixes above — because the fills'
// width transition (needed so a PROGRAMMATIC change, e.g. an AI update or
// resting, still animates smoothly) was also active DURING an interactive
// drag, so every fast mousemove/touchmove retriggered a fresh 0.3s tween
// toward the newest target instead of jumping straight to it — a visible
// "chasing" trail that HP/XP never show because nothing here suppresses
// their transition mid-drag. A 'dragging' class (added on
// mousedown/touchstart, removed on mouseup/touchend, mirroring the tempo
// dial's .knob2.dragging precedent) now sets transition:none on the fill
// only while the container carries it, so the bar snaps to the pointer's
// exact position on every move with zero animation lag, while the 0.3s
// transition still applies to any width change made outside an active drag.
function _wireRadDragSurface(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  function applyRad(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const maxRads = _resolveMaxRads();
    const newRads = Math.round(pct * maxRads);
    document.getElementById('stat_rads').value = newRads;
    state.rads = newRads;
    _emitStatChangeIfDiffers('rads', newRads); // CHASSIS LIVING CORE #14
    updateMath();
  }
  let dragging = false;
  container.addEventListener('mousedown', e => {
    dragging = true;
    container.classList.add('dragging');
    applyRad(e);
  });
  document.addEventListener('mousemove', e => {
    if (dragging) applyRad(e);
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
    container.classList.remove('dragging');
  });
  container.addEventListener(
    'touchstart',
    e => {
      dragging = true;
      container.classList.add('dragging');
      applyRad(e);
      e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    e => {
      if (dragging) applyRad(e);
    },
    { passive: false }
  );
  document.addEventListener('touchend', () => {
    dragging = false;
    container.classList.remove('dragging');
  });
}
function setupRadBarInteraction() {
  _wireRadDragSurface('radDragTrack'); // SKELETAL HARNESS bar
  _wireRadDragSurface('opRadLineWrap'); // VITAL TELEMETRY trace (owner follow-up — was never wired)
}

// C11: Level input change handler — when user edits the level field,
// auto-set XP to the minimum XP required for that level (xpCur). Clamped to
// MAX_PLAYER_LEVEL (owner batch item 3) — the number input's native stepper
// arrows fire the same oninput event as typing, so one clamp covers both.
// MAX_PLAYER_LEVEL is declared later in this file as a module-scope const;
// referencing it here is safe since this function only runs later, at user
// interaction time, well after the whole script has parsed.
function onLvlInputChanged() {
  const lvlEl = document.getElementById('stat_lvl');
  const raw = Math.max(1, parseInt(lvlEl.value) || 1);
  const lvl = Math.min(MAX_PLAYER_LEVEL, raw);
  if (lvl !== raw) lvlEl.value = lvl;
  const xpCur = lvl <= 1 ? 0 : 75 * (lvl * lvl) - 25 * lvl - 50;
  document.getElementById('stat_xp').value = xpCur;
  state.lvl = lvl;
  state.xp = xpCur;
  updateMath();
}

// Owner batch item 3: XP-amount input caps at the current level's max XP —
// xpNext(lvl) - 1, the same upper edge of the [xpCur, xpNext-1] band the XP
// bar's own drag handler (setupXpBarInteraction()) already generates
// (Protocol 22, same curve, never a second formula) — so typing (or using
// the number input's native stepper, which fires the same oninput event)
// can't push XP past what the current level actually allows. Scales per
// level automatically since xpNext is a function of lvl.
function onXpInputChanged() {
  const xpEl = document.getElementById('stat_xp');
  const lvl = Math.max(1, parseInt(document.getElementById('stat_lvl').value) || 1);
  const xpNext = 75 * ((lvl + 1) * (lvl + 1)) - 25 * (lvl + 1) - 50;
  const raw = parseInt(xpEl.value, 10);
  if (!isNaN(raw)) {
    const capped = Math.max(0, Math.min(raw, xpNext - 1));
    if (capped !== raw) xpEl.value = capped;
  }
  state.xp = parseInt(xpEl.value, 10) || 0;
  updateMath();
}
window.onXpInputChanged = onXpInputChanged;

// Owner report: no existing app-enforced level cap was found anywhere in the
// codebase (only a display-only clamp in the XP bar's percentage math, and a
// flavor-text trait description in reg_nv.js that isn't consumed as a real
// constant). 50 is picked as a single, game-agnostic ceiling (Protocol 38 —
// applied uniformly, never a per-game literal) — it matches the top of the
// already-existing XP-curve display range (updateMath()'s XP bar previously
// hardcoded this same 50 as "where the curve display stops mattering"), so
// this reuses that same implicit ceiling as an explicit, named constant
// instead of introducing a new, disconnected number.
const MAX_PLAYER_LEVEL = 50;

// Native LEVEL UP control (owner report): deterministic, player-controlled,
// and completely ungated by XP — pressing it always applies exactly +1
// level (until MAX_PLAYER_LEVEL), never requiring the XP bar to have
// reached any threshold. XP can go out of sync with level (the AI doesn't
// always keep it in lockstep) without ever blocking manual leveling. Fires
// through the SAME RobcoEvents 'level.up' path the AI-driven
// autoImportState() level-up already emits (Protocol 22) — so the jingle,
// haptic, and auto-log subscribers all react identically to a manual
// level-up, no forked logic. XP itself is left untouched by a manual
// level-up (simplest, least surprising choice — the XP bar keeps showing
// progress toward whatever level is current, exactly as it already did).
function nativeLevelUp() {
  const lvl = Math.max(1, parseInt(document.getElementById('stat_lvl').value) || 1);
  if (lvl >= MAX_PLAYER_LEVEL) return;
  const newLvl = Math.min(MAX_PLAYER_LEVEL, lvl + 1);
  document.getElementById('stat_lvl').value = newLvl;
  state.lvl = newLvl;
  RobcoEvents.emit('level.up', { oldLvl: lvl, newLvl });
  updateMath();
  saveState();
  // AI→native survey Part C.1 — skill-point allocation on level-up. The
  // Director used to auto-award (10 + INT/2) skill points and pick the
  // distribution itself; that pool is now just REPORTED here (same formula,
  // computed offline) and the player allocates it themselves through the
  // EXISTING skill setters — the SKILL MATRIX VU meters (_skillVuSet) or the
  // TERMINAL "<skill> +N" grammar (Part B) — never auto-assigned here
  // (Protocol 24, player-driven, deterministic).
  // Hotfix (v2.8.0-r2): this used to also call expandPanelForCategory('skills')
  // to jump the view to SKILL MATRIX. expandPanelForCategory() unconditionally
  // scrollIntoView({block:'center'})s the target panel's summary even when it
  // is already open/visible (WU-HF1's off-screen-panel reveal, correct for its
  // other callers — AI category jumps, [GPS]/[MAP], TRADE taps — but wrong
  // here), which read as the whole screen yanking down on every LEVEL UP tap.
  // The chat line below already tells the player where to go, so the auto-jump
  // is dropped rather than reworked — LEVEL UP no longer touches scroll at all.
  const intScore = parseInt(state.i, 10) || 5;
  const skillPoints = 10 + Math.floor(intScore / 2);
  if (typeof appendToChat === 'function') {
    appendToChat(
      `> [LEVEL UP] Level ${newLvl} committed. ${skillPoints} skill point${skillPoints === 1 ? '' : 's'} available (10 + INT/2) — allocate via SKILL MATRIX.`,
      'sys'
    );
  }
}

// AI→native survey Part C.1 — [GPS] / [MAP] compass grid. Previously a
// free-text Director round-trip that returned an AI-drawn ASCII grid; now
// opens/scrolls to the existing native CARTOGRAPHY TABLE (DATABANK tab) —
// zero AI round-trip. Reuses the SAME expandPanelForCategory('map') path
// the typed panel-nav aliases ("map"/"world"/"locations", PANEL_NAV_ALIASES
// in api-router.js) already use (Protocol 22) — one panel-opening mechanism for
// every route to the world map.
function _nativeOpenMap() {
  if (typeof closeModal === 'function') closeModal();
  if (typeof expandPanelForCategory === 'function') expandPanelForCategory('map');
  if (typeof appendToChat === 'function')
    appendToChat('> [GPS] Local grid fixed — CARTOGRAPHY TABLE displayed.', 'sys');
}

// Called by #stat_loc onchange (no arg — reads the value the user just typed into the
// input) AND by the quick-log "arrived <location>" TERMINAL verb (api-router.js, passes the new
// location text explicitly since there's no onchange DOM event to read it from). One
// function, not a forked quick-log-only setter (Protocol 22) — this is what makes
// "arrived Primm" actually move [CURRENT] on the WORLD MAP instead of only adding Primm
// to the visited list (the owner-reported live-update bug: quick-log used to call
// markLocationVisited(), which records a discovery without ever changing state.loc).
// View preference (state.mapView) is kept as-is.
function onLocationChange(overrideLoc) {
  // Fog-of-war: the place we're leaving stays discovered, and the new place becomes
  // discovered too — so the previous location shows [VISITED] (not [UNKNOWN]) once the
  // Courier moves on. Capture the old location BEFORE syncStateFromDom() overwrites
  // state.loc with the new #stat_loc value, then record both via the shared helper.
  // saveState() persists the updated locationHistory in the same (debounced) write;
  // cloud sync stays manual (no auto-push).
  const prevLoc = state.loc;
  if (overrideLoc) {
    // Mirror the new value into #stat_loc BEFORE syncStateFromDom() reads it back — the
    // same "mirror to DOM before saveState" idiom #c_caps uses (WU-N2), since
    // syncStateFromDom() always re-reads state.loc from this element.
    const locEl = document.getElementById('stat_loc');
    if (locEl) locEl.value = overrideLoc;
  }
  syncStateFromDom();
  recordLocationVisit(prevLoc);
  recordLocationVisit(state.loc);
  saveState();
  renderWorldMap();
  // FEEDBACK ANIMATION WAVE 3 (#27 TRIANGULATE) — a direct reaction to this
  // EXISTING arrival path (no new bus event — the build plan's "onLocation-
  // Change path" signal), distinct from #26 SURVEY PING (new-discovery only,
  // via location.visited). Fires on every arrival, including a revisit; a
  // no-op when the WORLD GRID isn't currently painted (zoomed sector sheet,
  // or the user elsewhere) — the direct annunciator push below covers that
  // "elsewhere" case regardless.
  const youGroup = document.querySelector('#worldMapDisplay .you');
  if (youGroup) {
    youGroup.classList.remove('you-triangulate');
    void youGroup.offsetWidth;
    youGroup.classList.add('you-triangulate');
    setTimeout(() => youGroup.classList.remove('you-triangulate'), 700);
  }
  // LOCATION CONFIRMATION CARD (Suite 204) — the single location-change
  // confirmation, fired only on a GENUINE change (never a same-value
  // re-set) via a 'location.current' bus emit, consumed by the top-right
  // toast subscriber (_wireLocationCardSubscriber() below). Retires the
  // older inline "ARRIVED" annunciator push that used to live here (#27
  // TRIANGULATE's echo half, Suite 199.25) so the player sees ONE clean
  // location confirmation instead of two competing toasts; the "you"
  // reticle pulse directly above (TRIANGULATE's home half) is untouched.
  const locChanged =
    String(prevLoc || '')
      .trim()
      .toLowerCase() !==
    String(state.loc || '')
      .trim()
      .toLowerCase();
  if (locChanged && state.loc) {
    RobcoEvents.emit('location.current', { loc: state.loc });
  }
}

// ── WU-N1: V.A.T.S. NATIVE CALCULATOR ────────────────────────────
// Fully deterministic, offline, read-only — no AI. Two parts:
//   • HIT PROBABILITY table — an ESTIMATE (per-region modifier + clamp). The exact
//     ranged hit-% is NOT canon-sourceable (WU-D4a-RANGED-GAP: per-weapon spread/range
//     falloff are absent from WEAPONS.CSV and fallout.wiki), so it is labeled ESTIMATE.
//   • AP-STRIKE OPTIMIZER — exact from the equipped weapon's Base_Damage / Special_Attack_AP
//     and the canon AP pool (apBase + apPerAgility × AGI); shows strikes affordable, damage
//     per strike (after target DT), damage-per-AP, and the optimal region.
// All per-game data (crit bonus, hit-% clamp, AP formula, region table, combat-skill set)
// comes from GAME_DEFS[ctx] — game-agnostic (Protocol 38). See planning/MASTER_PLAN.md WU-N1.

// _vatsResolveSkill — pick the weapon's combat skill. Melee/unarmed is EXACT (read from the
// weapon row); ranged falls back to the best of the game's ranged combat skills because the
// schema has no per-weapon skill column (WU-D4a-RANGED-GAP). Filters GAME_DEFS[ctx].combatSkills
// through getSkillKeys() so a 3rd game just supplies its own set — and FO3 big_guns is now
// included (GA-10 live-bug fix; the old hardcoded object omitted it).
function _vatsResolveSkill(stats, def, skills) {
  const keys = (typeof getSkillKeys === 'function' && getSkillKeys()) || [];
  const combat = (def.combatSkills || []).filter(k => keys.includes(k));
  if (stats) {
    const noAmmo = !stats.ammoType || stats.ammoType.toLowerCase() === 'none';
    if ((stats.reqUnarmed || 0) > 0 && combat.includes('unarmed')) {
      return { name: 'unarmed', value: skills.unarmed || 0, exact: true };
    }
    if (noAmmo && combat.includes('melee_weapons')) {
      return { name: 'melee_weapons', value: skills.melee_weapons || 0, exact: true };
    }
  }
  // Ranged (or nothing equipped): estimate via the best ranged combat skill.
  const pool = stats ? combat.filter(k => k !== 'melee_weapons' && k !== 'unarmed') : combat;
  const candidates = pool.length ? pool : combat;
  let name = candidates[0] || 'guns';
  let value = skills[name] || 0;
  candidates.forEach(k => {
    const v = skills[k] || 0;
    if (v > value) {
      value = v;
      name = k;
    }
  });
  return { name, value, exact: false };
}

// _vatsIsMelee — canonical melee-scope classification of a weapon row (§1.6): a weapon is
// melee/unarmed when it consumes no ammo (Ammo_Type None/blank) or requires Unarmed.
function _vatsIsMelee(stats) {
  if (!stats) return false;
  const noAmmo = !stats.ammoType || stats.ammoType.toLowerCase() === 'none';
  return noAmmo || (stats.reqUnarmed || 0) > 0;
}

function showVATSOverlay() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;

  title.innerText = '> V.A.T.S. TACTICAL CALCULATOR';
  content.innerHTML = `
<div style="font-family:inherit;font-size:11px;line-height:1.7;">
  <div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    <label for="vatsTargetDT" style="font-size:11px;letter-spacing:0.5px;">TARGET DT (damage threshold):</label>
    <input id="vatsTargetDT" type="number" min="0" max="200" value="0" step="1" inputmode="numeric"
      aria-label="Target damage threshold"
      oninput="recomputeVATS()"
      style="font-size:16px;min-height:28px;width:84px;background:#000;color:inherit;border:1px solid var(--robco-green,#14fdce);padding:2px 6px;" />
  </div>
  <div id="vatsResult" aria-live="polite" aria-atomic="true" style="white-space:pre-wrap;font-family:inherit;"></div>
</div>`;

  recomputeVATS();
  openModal();
}

// recomputeVATS — recompute and render the V.A.T.S. table from live state + the TARGET DT
// input. Read-only. Safe to call repeatedly (the DT input's oninput).
function recomputeVATS() {
  const out = document.getElementById('vatsResult');
  if (!out) return;

  const ctx = typeof getGameContext === 'function' ? getGameContext() : 'FNV';
  const def = (window.GAME_DEFS && GAME_DEFS[ctx]) || (window.GAME_DEFS && GAME_DEFS.FNV) || {};
  const v = def.vats || {};
  const hitMin = typeof v.hitChanceMin === 'number' ? v.hitChanceMin : 5;
  const hitMax = typeof v.hitChanceMax === 'number' ? v.hitChanceMax : 95;
  const critBonus = typeof v.critBonus === 'number' ? v.critBonus : 0.05;
  const apBase = typeof v.apBase === 'number' ? v.apBase : 65;
  const apPerAgi = typeof v.apPerAgility === 'number' ? v.apPerAgility : 3;
  const regions =
    Array.isArray(v.regions) && v.regions.length ? v.regions : [{ name: 'TORSO', mod: 0, ap: 4 }];

  const per = parseInt((document.getElementById('s_p') || {}).value) || 5;
  const agi = parseInt((document.getElementById('s_a') || {}).value) || 5;
  const apPool = apBase + apPerAgi * agi;

  const skills = state.skills || {};
  const playstyle = localStorage.getItem('robco_playstyle') || 'any';
  const weaponName = (state.equipped && state.equipped.weapon) || null;
  const stats =
    weaponName && typeof lookupWeaponStats === 'function' ? lookupWeaponStats(weaponName) : null;
  const weaponIsMelee = _vatsIsMelee(stats);
  // Canonical melee-scope gate (§1.6) — NEVER mode alone.
  const meleeScope = playstyle === 'melee' || weaponIsMelee;

  const sk = _vatsResolveSkill(stats, def, skills);

  // Chem boost — active combat BUFFs count as a skill-equivalent bonus (existing heuristic).
  let chemBonus = 0;
  (state.status || []).forEach(eff => {
    if (eff && eff.type === 'BUFF' && (eff.ticks || 0) > 0) {
      const n = (eff.name || '').toLowerCase();
      if (
        n.includes('gun') ||
        n.includes('weapon') ||
        n.includes('combat') ||
        n.includes('turbo') ||
        n.includes('psycho')
      ) {
        chemBonus += 10;
      }
    }
  });

  const targetDT = Math.max(
    0,
    parseInt((document.getElementById('vatsTargetDT') || {}).value) || 0
  );

  // Base hit-% estimate (per-region modifier applied below). Clamp from GAME_DEFS (WU-D4a).
  const base = per * 2 + agi * 1.5 + (sk.value + chemBonus) / 3;
  const clamp = pct => Math.min(hitMax, Math.max(hitMin, Math.round(pct)));

  const hitRows = regions
    .map(r => {
      const pct = clamp(base + (r.mod || 0));
      const bar = '#'.repeat(Math.floor(pct / 10)).padEnd(10, '·');
      return `  ${r.name.padEnd(7)} [${bar}] ${String(pct).padStart(3)}% EST`;
    })
    .join('\n');

  // AP-strike optimizer (exact when a weapon is equipped). effDmg = Base_Damage − target DT.
  let apSection;
  if (stats) {
    const effDmg = Math.max(1, Math.round((stats.baseDamage || 0) - targetDT));
    let bestRegion = null;
    let bestDpa = -1;
    const apRows = regions
      .map(r => {
        const ap = r.ap || 1;
        const strikes = Math.floor(apPool / ap);
        const dpa = effDmg / ap;
        if (dpa > bestDpa) {
          bestDpa = dpa;
          bestRegion = r.name;
        }
        return `  ${r.name.padEnd(7)} AP:${String(ap).padStart(2)}  STRIKES:${String(strikes).padStart(2)}  DMG/AP:${dpa.toFixed(1)}  BURST:${strikes * effDmg}`;
      })
      .join('\n');
    apSection =
      `  WEAPON: ${escapeHtml(stats.name)}  (${weaponIsMelee ? 'MELEE/UNARMED — EXACT' : 'RANGED'})\n` +
      `  BASE DMG:${stats.baseDamage}  − DT:${targetDT}  = EFF DMG:${effDmg}  |  AP POOL:${apPool} (base)\n\n` +
      apRows +
      `\n\n  OPTIMAL (dmg/AP): ${bestRegion}`;
  } else {
    apSection = '  Equip a weapon (INV → equip) for exact AP-strike & damage math.';
  }

  const chemStr = chemBonus > 0 ? `  (+${chemBonus} CHEM)` : '';
  const skillLabel = `${sk.name.replace(/_/g, ' ').toUpperCase()} ${sk.value}${sk.exact ? '' : ' (est.)'}`;
  const critPct = Math.round(critBonus * 100);

  out.innerHTML = `<b>INPUTS</b>
  PER:${per}  AGI:${agi}  SKILL:${skillLabel}${chemStr}
  PLAYSTYLE:${playstyle.toUpperCase()}  MELEE-SCOPE:${meleeScope ? 'YES' : 'NO'}
  VATS CRIT BONUS: +${critPct}% (${ctx})

<b>HIT PROBABILITY — ESTIMATE</b>
${hitRows}

<b>AP-STRIKE OPTIMIZER${meleeScope ? '  ◄ MELEE' : ''}</b>
${apSection}

<span style="opacity:0.6;font-size:10px;">DETERMINISTIC — NO AI. Melee/unarmed AP-strike &amp; damage are exact;
ranged hit-% is an estimate (per-weapon spread is not in canon data). Read-only.</span>`;
}

// WU-E3: the command registry is kept in lock-step with reality — every entry
// resolves to a NATIVE_COMMAND_ROUTER token (api-router.js), a live panel/UI control, an
// AI-directive-defined command (getSystemDirective), or a keyboard handler. The six
// deterministic NATIVE TERMINALS run fully offline with no AI call. Retired AI macros
// (the old screenshot-V.A.T.S., [TACTICS], [CURRENCY], [AUDIT], [STASH]/[EXCESS],
// [SYNC], [TRAVEL CLUSTER], [CASINO], [COMM LINK], [PAUSE], [PAGE 2/3], [ARCHIVE],
// chained &&/-Q/-S flags, etc.) were removed because they no longer resolve anywhere.
// Suite 113 guards this registry ↔ router ↔ help consistency so it can't drift again.
const COMMAND_REGISTRY = [
  {
    group: 'COMMAND-LINE MODE',
    cmds: [
      {
        cmd: '[MODE PILL]',
        desc: 'Tap the pill above the input to swap between TERMINAL (native + quick-log, offline) and OVERSEER (AI narrator).',
      },
      { cmd: '/message', desc: 'One-off: send just this message to TERMINAL, regardless of mode.' },
      {
        cmd: 'text @message',
        desc: 'Anywhere in a line, @ pings OVERSEER with just the text after it — the text before is dropped.',
      },
      {
        cmd: 'killed <target>',
        desc: 'Quick-log (TERMINAL): record a kill in the Terminal Record. Offline.',
      },
      { cmd: '+N caps / -N caps', desc: 'Quick-log (TERMINAL): adjust your caps. Offline.' },
      {
        cmd: 'arrived <location>',
        desc: 'Quick-log (TERMINAL): record a location as visited. Offline.',
      },
      {
        cmd: 'rep <faction> up/down',
        desc: "Quick-log (TERMINAL): nudge a faction's reputation +/-5. Offline.",
      },
      {
        cmd: 'action, action, action',
        desc: 'Quick-log (TERMINAL): comma-separate multiple actions on one line to apply them all.',
      },
    ],
  },
  {
    group: 'NATIVE TERMINALS — OFFLINE, NO AI',
    cmds: [
      {
        cmd: '[VATS SIM] / [VS] / [VATS]',
        desc: 'V.A.T.S. calculator — hit %, crit bonus & melee/unarmed AP-strike plan. Offline.',
      },
      {
        cmd: '[THREAT] / [TH]',
        desc: 'Bestiary stat card + time-to-neutralize & ammo/strike burn. Offline.',
      },
      {
        cmd: '[TRADE]',
        desc: 'Barter terminal (INV tab) — buy/sell at your Barter-skill prices. Offline.',
      },
      {
        cmd: 'CONSULT <topic> / [CON]',
        desc: 'Databank lookup — items, perks, quests, locations, creatures. Offline.',
      },
      {
        cmd: '[BIO-SCAN] / [BIO]',
        desc: 'Medical advisory — limb, HP, radiation & addiction readout. Offline.',
      },
      {
        cmd: '[LOOT] / [LT]',
        desc: 'Salvage terminal — add a database item to your pack at its value. Offline.',
      },
      {
        cmd: '[GPS] / [MAP]',
        desc: 'Localized geographic compass grid — opens the CARTOGRAPHY TABLE. Offline.',
      },
      {
        cmd: '[PERKS] / [PK]',
        desc: 'Perks you qualify for at your current level — registry lookup. Offline.',
      },
    ],
  },
  {
    group: 'STAT EDITS — TERMINAL, OFFLINE',
    cmds: [
      {
        cmd: '<stat> <N>',
        desc: 'Set any stat to an exact value: hp, rads, xp, level, karma, caps, a SPECIAL (str/per/end/cha/int/agi/lck), or a skill. Offline.',
      },
      {
        cmd: '+N <stat> / <stat> +N',
        desc: 'Nudge a stat up or down by N instead of setting it outright. Offline.',
      },
      {
        cmd: 'level up / leveled up',
        desc: 'Gain exactly one level, deterministic — no XP threshold required. Offline.',
      },
    ],
  },
  {
    group: 'INVENTORY & PROGRESSION',
    cmds: [
      { cmd: '[CRAFT]', desc: 'Consume ingredients to build (craft panel).' },
      {
        cmd: '[+] VISUAL UPLOAD',
        desc: 'Attach a screenshot — parsed on-device by optical scan (offline, primary), review & confirm, then apply. Falls back to Director vision only if the scan is unavailable.',
      },
      {
        cmd: '[BIND: X, DIR]',
        desc: 'Quick-Draw Holster — holster gear X to a vector socket. Offline.',
      },
      {
        cmd: '[PAD: DIR]',
        desc: 'Quick-Draw Holster — fire the gear holstered to that vector socket. Offline.',
      },
      { cmd: '[ROADMAP]', desc: 'Perk roadmap toward your build goals.' },
    ],
  },
  {
    group: 'NAVIGATION & WORLD STATE',
    cmds: [
      { cmd: '[WAIT: X Hrs]', desc: 'Advance the clock by X hours; restock.' },
      { cmd: '[SLEEP]', desc: 'Advance 8 hours; heal HP & limbs. Offline.' },
    ],
  },
  {
    group: 'KEYBOARD SHORTCUTS',
    cmds: [
      { cmd: 'Ctrl + Enter', desc: 'Send command.' },
      { cmd: 'Ctrl + /', desc: 'Focus command input.' },
      { cmd: 'Ctrl + 1–6', desc: 'Toggle panels 1–6 open/close.' },
      { cmd: '1 / 2 / 3 / 4', desc: 'Switch tab: STAT / INV / DATA / CAMPG.' },
      { cmd: '↑ / ↓', desc: 'Cycle command history in input.' },
      { cmd: '↑ / ↓ + Enter', desc: 'Navigate and select autocomplete.' },
      { cmd: 'Esc', desc: 'Close dialog or dismiss autocomplete.' },
    ],
  },
  {
    group: 'SYSTEM',
    cmds: [
      { cmd: '[FEATURES]', desc: 'Show this command registry.' },
      { cmd: '[LOGS]', desc: 'Show client error log (local-only).' },
    ],
  },
];

function capStatMax(el) {
  const n = parseInt(el.value, 10);
  if (!isNaN(n) && n > 10) el.value = '10';
}
// Single source for the per-game RAD ceiling (Protocol 22) — capRadsMax() and the
// RAD bar drag handler (setupRadBarInteraction()) both resolve the same value the
// same way, so a clamp and a drag scale can never disagree on what "full" means.
function _resolveMaxRads() {
  const ctx = typeof getGameContext === 'function' ? getGameContext() : 'FNV';
  const def = (window.GAME_DEFS && GAME_DEFS[ctx]) || (window.GAME_DEFS && GAME_DEFS.FNV) || {};
  return typeof def.maxRads === 'number' ? def.maxRads : 1000;
}
window._resolveMaxRads = _resolveMaxRads;

// Owner interactivity fold-in (Phase 3 OPERATOR follow-up): RAD EXPOSURE had no upper
// bound. Mirrors capStatMax()'s upper-clamp-on-input pattern exactly, but reads the
// per-game fatal threshold from GAME_DEFS[ctx].maxRads (Protocol 38) instead of a
// hardcoded literal, so a future game can supply its own value.
function capRadsMax(el) {
  const n = parseInt(el.value, 10);
  if (isNaN(n)) return;
  const maxRads = _resolveMaxRads();
  if (n > maxRads) el.value = String(maxRads);
}
// ── NATIVE STAT SETTERS (Native USE + TERMINAL stat edits) ──────────────────
// The ONE clamp/mirror/emit/save choke point per stat (Protocol 22) — shared by
// the native USE handler (nativeUseItem() in ui-render.js), the TERMINAL
// stat-edit grammar (_resolveStatToken() in api-router.js), and commitStat()'s own DOM
// onchange path just below. Each setter mirrors BOTH state.<field> AND the
// matching DOM input's .value — the WU-N2 caps lesson: saveState() always runs
// syncStateFromDom() first, which reads the DOM back into state, so an
// in-memory-only write would be silently reverted on the very next save.
function _nativeSetHp(v) {
  const hpMaxEl = document.getElementById('stat_hp_max');
  const hpMax = (hpMaxEl && parseInt(hpMaxEl.value, 10)) || state.hpMax || 0;
  const val = Math.max(0, Math.min(hpMax, parseInt(v, 10) || 0));
  const el = document.getElementById('stat_hp_cur');
  if (el) el.value = String(val);
  state.hpCur = val;
  _emitStatChangeIfDiffers('hp', val); // CHASSIS LIVING CORE #14
  updateMath();
  saveState();
  return val;
}

function _nativeSetRads(v) {
  const maxRads = _resolveMaxRads();
  const val = Math.max(0, Math.min(maxRads, parseInt(v, 10) || 0));
  const el = document.getElementById('stat_rads');
  if (el) el.value = String(val);
  state.rads = val;
  _emitStatChangeIfDiffers('rads', val); // CHASSIS LIVING CORE #14
  updateMath();
  saveState();
  return val;
}

// Clamp curve matches onXpInputChanged()'s xpNext formula exactly (Protocol 22
// — never a second XP-band formula).
function _nativeSetXp(v) {
  const lvlEl = document.getElementById('stat_lvl');
  const lvl = Math.max(1, (lvlEl && parseInt(lvlEl.value, 10)) || state.lvl || 1);
  const xpNext = 75 * ((lvl + 1) * (lvl + 1)) - 25 * (lvl + 1) - 50;
  const val = Math.max(0, Math.min(xpNext - 1, parseInt(v, 10) || 0));
  const el = document.getElementById('stat_xp');
  if (el) el.value = String(val);
  state.xp = val;
  _emitStatChangeIfDiffers('xp', val); // CHASSIS LIVING CORE #14
  updateMath();
  saveState();
  return val;
}

// Same clamp + 'level.up' emit shape as nativeLevelUp() (Protocol 22) — this is
// the "set to an exact level" sibling; nativeLevelUp()/the "level up" TERMINAL
// phrase stay the "+1" entry point and are reused verbatim, not forked here.
function _nativeSetLevel(v) {
  const lvlEl = document.getElementById('stat_lvl');
  const old = Math.max(1, (lvlEl && parseInt(lvlEl.value, 10)) || state.lvl || 1);
  const val = Math.max(1, Math.min(MAX_PLAYER_LEVEL, parseInt(v, 10) || old));
  if (lvlEl) lvlEl.value = String(val);
  state.lvl = val;
  if (val > old) RobcoEvents.emit('level.up', { oldLvl: old, newLvl: val });
  updateMath();
  saveState();
  return val;
}

// SPECIAL setter — the exact clamp/emit/save commitStat(el) already did,
// extracted so the DOM onchange path and the TERMINAL/USE paths share one
// choke point (Protocol 22). commitStat() below now delegates to this.
function _nativeSetSpecial(key, v) {
  let val = parseInt(v, 10);
  if (isNaN(val)) val = (state && state[key]) || 5;
  val = Math.max(1, Math.min(10, val));
  const el = document.getElementById('s_' + key);
  if (el) el.value = String(val);
  const old = state && state[key];
  if (state) state[key] = val;
  // CHASSIS LIVING CORE #14 (3D ring burst on stat change) — a genuine
  // committed SPECIAL edit, not a re-render; RobcoEvents.emit is a no-op
  // with zero subscribers if the core hasn't wired up yet (Protocol 22).
  if (old !== undefined && old !== val)
    RobcoEvents.emit('stat.change', { key, oldVal: old, newVal: val });
  updateMath();
  saveState();
  return val;
}

// Thin wrapper — _skillVuSet() (@5661) already clamps [0,100], mirrors
// #sk_<key> + the VU fill/aria, emits 'stat.change' skill:<key>, and calls
// saveState() (Protocol 22 — reused verbatim, never forked).
function _nativeSetSkill(key, v) {
  return _skillVuSet(key, v);
}

// Karma's own oninput handler (index.html #stat_karma) calls BOTH
// updateKarmaUI() and updateMath() explicitly — updateMath() does not cascade
// into updateKarmaUI() on its own, so this setter must call both too.
function _nativeSetKarma(v) {
  const val = Math.max(-1000, Math.min(1000, parseInt(v, 10) || 0));
  const el = document.getElementById('stat_karma');
  if (el) el.value = String(val);
  state.karma = val;
  updateKarmaUI();
  updateMath();
  saveState();
  return val;
}

// Absolute-set sibling of the existing delta-only _quickLogCaps() (api-router.js) —
// that function stays as-is for the "+/-N caps" quick-log pattern; this is the
// new "set to an exact value" entry point USE/TERMINAL stat-edits need.
function _nativeSetCaps(v) {
  const val = Math.max(0, parseInt(v, 10) || 0);
  const el = document.getElementById('c_caps');
  if (el) el.value = String(val);
  state.caps = val;
  _logEvent('caps', 'Caps set to ' + val + '.');
  updateMath();
  saveState();
  return val;
}

function commitStat(el) {
  const k = el.id.slice(2);
  let v = parseInt(el.value, 10);
  if (isNaN(v)) v = (state && state[k]) || 5;
  _nativeSetSpecial(k, v);
}
function toggleLimb(limb) {
  let wasOk = state[limb] === 'OK';
  state[limb] = wasOk ? 'CRIPPLED' : 'OK';
  // FEEDBACK ANIMATION WAVE 1 (#6 X-RAY FLASH / #7 SPLINT WRAP): one
  // additive emit at this existing setter (U7/U8 precedent) — the AI limb-set
  // path in autoImportState() (js/services/api-import.js) emits the same event.
  RobcoEvents.emit('limb.state', { limb, state: wasOk ? 'crippled' : 'ok' });
  if (wasOk) {
    if (limb === 'hd') {
      playHeadCrippleSound();
      startTinnitus(); // Head cripple always triggers tinnitus
    } else {
      playLimbCrippleSound(limb);
    }
    if (crtHumGain) {
      crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
      crtHumGain.gain.setValueAtTime(0.007, audioCtx.currentTime);
      crtHumGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.08);
      crtHumGain.gain.linearRampToValueAtTime(0.007, audioCtx.currentTime + 0.35);
    }
  } else {
    if (limb === 'hd') {
      // Only stop tinnitus if rads are also below the threshold
      let rads = parseInt(document.getElementById('stat_rads').value) || 0;
      if (rads < 600) stopTinnitus();
    }
    playLimbRestoreSound();
  }
  loadUI();
}

// PHASE 3 · OPERATOR BUS-03 — the SVG anatomical zone plate is a second,
// purely visual projection of state.la/ra/ll/rl/hd (the same fields the
// btn_l_* readout list above already reflects). Called from loadUI() so it
// can never drift from the mirrored chip list (Protocol 22 single-apply,
// the Module-Bay bay/schematic precedent).
function _syncBioHarnessZones() {
  ['hd', 'la', 'ra', 'll', 'rl'].forEach(limb => {
    const zone = document.querySelector('.zone[data-limb="' + limb + '"]');
    if (zone) zone.classList.toggle('crippled', state[limb] !== 'OK');
  });
}

// Wires the SVG zone taps/keyboard activation to the EXACT SAME toggleLimb()
// the mirrored chip buttons already call (Protocol 22 — one handler, two
// input surfaces). Static markup, so this wires once at boot.
function _wireBioHarnessZones() {
  document.querySelectorAll('.zone[data-limb]').forEach(zone => {
    zone.addEventListener('click', () => toggleLimb(zone.dataset.limb));
    zone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleLimb(zone.dataset.limb);
      }
    });
  });
}

// BUS-09 · KARMA ALIGNMENT (Phase 3 OPERATOR batch 3, ground-up reskin) —
// the exact shipped 5-tier label logic (Protocol 22, unchanged breakpoints),
// now also driving the EVIL/GOOD swing-needle rotation + tier-lamp strip +
// live value readout the reskin adds. No new state, no new tiers.
const _KARMA_TIERS = [
  { label: 'Very Evil', test: k => k <= -750 },
  { label: 'Evil', test: k => k <= -250 },
  { label: 'Neutral', test: k => k < 250 },
  { label: 'Good', test: k => k < 750 },
  { label: 'Messiah', test: () => true },
];
// FEEDBACK ANIMATION WAVE 3 (#16 SCALES TIP) — the "did this ACTUALLY
// change?" cache for the tier crossing (the _emitStatChangeIfDiffers /
// _lastRadThreshold precedent). Deliberately does NOT seed at boot — the
// first evaluation each session only establishes the baseline (no bounce).
let _lastKarmaTier = null;
function updateKarmaUI() {
  const k = parseInt(document.getElementById('stat_karma').value) || 0;
  const tier = _KARMA_TIERS.find(t => t.test(k)) || _KARMA_TIERS[2];
  const label = tier.label;

  const labelEl = document.getElementById('karma_label');
  if (labelEl) {
    labelEl.innerText = label;
    labelEl.className = 'k-standing ' + (label === 'Neutral' ? 'neut' : k < 0 ? 'evil' : 'good');
  }

  const needle = document.getElementById('karmaNeedle');
  if (needle) {
    needle.style.transform = 'rotate(' + ((k / 1000) * 82).toFixed(1) + 'deg)';
    needle.classList.toggle('evil', k < 0);
  }

  // FEEDBACK ANIMATION WAVE 3 (#16 SCALES TIP): new additive emit — reuses
  // the SAME _KARMA_TIERS breakpoints already computed above, no new literal
  // (Protocol 22/38). The needle double-bounce + a halo/horns glyph blink
  // beside the standing word are applied directly here, at the crossing.
  if (_lastKarmaTier !== null && _lastKarmaTier !== label) {
    RobcoEvents.emit('karma.tier', { tier: label });
    if (needle) {
      needle.classList.remove('scales-tip');
      void needle.offsetWidth;
      needle.classList.add('scales-tip');
      setTimeout(() => needle.classList.remove('scales-tip'), 700);
    }
    if (labelEl) {
      const glyph = document.createElement('span');
      glyph.className = 'karma-tier-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = k < 0 ? '☠' : '☼';
      labelEl.appendChild(glyph);
      setTimeout(() => glyph.remove(), 900);
    }
  }
  _lastKarmaTier = label;

  const valEl = document.getElementById('karmaValReadout');
  if (valEl) valEl.textContent = 'KARMA ' + (k >= 0 ? '+' : '') + k + ' OF ±1000';

  const lampsEl = document.getElementById('karmaTierLamps');
  if (lampsEl) {
    lampsEl.innerHTML = _KARMA_TIERS
      .map(t => {
        const zone =
          t.label === 'Very Evil' || t.label === 'Evil'
            ? 't-evil'
            : t.label === 'Neutral'
              ? 't-neut'
              : 't-good';
        return `<span class="${zone}${t.label === label ? ' cur' : ''}">${t.label.toUpperCase()}</span>`;
      })
      .join('');
  }
}

const SKILL_LABELS = {
  barter: 'Barter',
  big_guns: 'Big Guns',
  energy_weapons: 'Energy Weapons',
  explosives: 'Explosives',
  guns: 'Guns',
  lockpick: 'Lockpick',
  medicine: 'Medicine',
  melee_weapons: 'Melee Weapons',
  repair: 'Repair',
  science: 'Science',
  small_guns: 'Small Guns',
  sneak: 'Sneak',
  speech: 'Speech',
  survival: 'Survival',
  unarmed: 'Unarmed',
};

// BUS-05 · SKILL VU ARRAY (Phase 3 OPERATOR batch 2, ground-up reskin) —
// still emits the exact sk_<key> number inputs (Protocol 22); the VU track
// is an ADDED drag/keyboard affordance over the same input, never a parallel
// state path. .skill-row is kept alongside .vu-row so _applyChemHighlights()
// (which targets .skill-row) needs no change. Channel count/order comes from
// getSkillKeys() — never a hardcoded 13 (Protocol 38).
function renderSkills() {
  const grid = document.getElementById('skillsGrid');
  if (!grid) return;
  const rows = getSkillKeys()
    .map(sk => {
      const val = state.skills && state.skills[sk] !== undefined ? state.skills[sk] : 15;
      const label = SKILL_LABELS[sk] || sk;
      const labelSafe = escapeHtml(label);
      return `<div class="skill-row vu-row" data-skill="${sk}">
        <label for="sk_${sk}" class="vu-label" title="${labelSafe}">${labelSafe}</label>
        <span class="vu-track" data-vu-track="${sk}" role="slider" tabindex="0"
              aria-label="${labelSafe} signal level, drag or use arrow keys to set"
              aria-valuemin="0" aria-valuemax="100" aria-valuenow="${val}">
          <span class="vu-fill" data-vu-fill="${sk}" style="width:${val}%"></span>
        </span>
        <input type="number" id="sk_${sk}" class="vu-input" value="${val}" min="0" max="100"
               inputmode="numeric" oninput="_onSkillVuInput('${sk}')" aria-label="${labelSafe} value, 0 to 100" />
      </div>`;
    })
    .join('');
  grid.innerHTML =
    `<div class="vu-rows">${rows}</div>` +
    '<div class="vu-legend"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>';
  _wireSkillVuDrag(grid);
}

// Shared clamp/paint helper for both the drag surface and the arrow-key path —
// mirrors syncStateFromDom()'s Math.min(100,Math.max(0,...)) skill clamp, then
// calls the SAME saveState() the typed field's oninput already called.
function _skillVuSet(key, rawVal) {
  const v = Math.max(0, Math.min(100, Math.round(rawVal)));
  const input = document.getElementById('sk_' + key);
  if (input) input.value = v;
  const fill = document.querySelector('[data-vu-fill="' + key + '"]');
  if (fill) fill.style.width = v + '%';
  const track = document.querySelector('[data-vu-track="' + key + '"]');
  if (track) track.setAttribute('aria-valuenow', String(v));
  // CHASSIS LIVING CORE #14 (3D ring burst on stat change) — the one committed
  // skill setter (drag AND arrow-key path both call this); _onSkillVuInput()'s
  // oninput live-preview deliberately does NOT hook this (fires every
  // keystroke, never a settled value).
  _emitStatChangeIfDiffers('skill:' + key, v);
  saveState();
  return v;
}

// Live-preview the fill as the user types, without rewriting the field
// mid-keystroke — the actual clamp still happens in syncStateFromDom().
function _onSkillVuInput(key) {
  const input = document.getElementById('sk_' + key);
  if (!input) {
    saveState();
    return;
  }
  const v = Math.max(0, Math.min(100, parseInt(input.value, 10) || 0));
  const fill = document.querySelector('[data-vu-fill="' + key + '"]');
  if (fill) fill.style.width = v + '%';
  const track = document.querySelector('[data-vu-track="' + key + '"]');
  if (track) track.setAttribute('aria-valuenow', String(v));
  saveState();
}

// Pointer-drag-to-set on the VU track (same idiom as the Immersion/tempo dial
// drags — pointer capture, delegated listeners on the stable #skillsGrid node
// so re-renders never need to re-wire) + arrow-key/Home/End on the role=slider
// track. Wired once (grid.dataset.vuWired guard) since renderSkills() rebuilds
// only the grid's innerHTML, not the grid element itself.
function _wireSkillVuDrag(grid) {
  if (grid.dataset.vuWired) return;
  grid.dataset.vuWired = '1';
  let draggingKey = null;
  const pctFromEvent = (track, ev) => {
    const r = track.getBoundingClientRect();
    return r.width > 0 ? ((ev.clientX - r.left) / r.width) * 100 : 0;
  };
  grid.addEventListener('pointerdown', ev => {
    const track = ev.target.closest('.vu-track');
    if (!track) return;
    draggingKey = track.dataset.vuTrack;
    try {
      track.setPointerCapture(ev.pointerId);
    } catch (_) {}
    _skillVuSet(draggingKey, pctFromEvent(track, ev));
  });
  grid.addEventListener('pointermove', ev => {
    if (!draggingKey) return;
    const track = grid.querySelector('[data-vu-track="' + draggingKey + '"]');
    if (track) _skillVuSet(draggingKey, pctFromEvent(track, ev));
  });
  grid.addEventListener('pointerup', () => {
    draggingKey = null;
  });
  grid.addEventListener('pointercancel', () => {
    draggingKey = null;
  });
  grid.addEventListener('keydown', ev => {
    const track = ev.target.closest('.vu-track');
    if (!track) return;
    const key = track.dataset.vuTrack;
    const cur = state.skills && state.skills[key] !== undefined ? state.skills[key] : 15;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
      _skillVuSet(key, cur + 1);
      ev.preventDefault();
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
      _skillVuSet(key, cur - 1);
      ev.preventDefault();
    } else if (ev.key === 'Home') {
      _skillVuSet(key, 0);
      ev.preventDefault();
    } else if (ev.key === 'End') {
      _skillVuSet(key, 100);
      ev.preventDefault();
    }
  });
}

// ── TIME INPUT HANDLER ───────────────────────────────────────────────
// Called by oninput on the calendar and time inputs. Clamps values and triggers a save.
function onTimeInputChanged() {
  const calMonthEl = document.getElementById('cal_month');
  const calDayEl = document.getElementById('cal_day');
  const calYearEl = document.getElementById('cal_year');
  const hrEl = document.getElementById('time_hour');
  const minEl = document.getElementById('time_min');
  if (!calMonthEl || !calDayEl || !calYearEl || !hrEl || !minEl) return;

  // Clamp
  let mo = Math.min(12, Math.max(1, parseInt(calMonthEl.value) || 1));
  let dy = Math.min(31, Math.max(1, parseInt(calDayEl.value) || 1));
  let yr = Math.max(2200, parseInt(calYearEl.value) || 2281);
  let h = Math.min(23, Math.max(0, parseInt(hrEl.value) || 0));
  let m = Math.min(59, Math.max(0, parseInt(minEl.value) || 0));

  calMonthEl.value = mo;
  calDayEl.value = dy;
  calYearEl.value = yr;
  hrEl.value = h;
  minEl.value = m;

  state.ticks = calendarToTicks(mo, dy, yr, h, m);

  // Keep hidden fields in sync
  let hiddenTicks = document.getElementById('stat_ticks');
  if (hiddenTicks) hiddenTicks.value = state.ticks;
  let hiddenDay = document.getElementById('time_day');
  if (hiddenDay) hiddenDay.value = Math.floor(state.ticks / 240) + 1;

  saveState();
}

// U7: HP-critical reaction (crit-hp-flash class + chassis buzz) — updateMath()
// below only detects the >25%→≤25% crossing and emits; this is the subscriber.
// Wiring is deferred to a function called from window.onload, NOT run at this
// file's top level — ui-core.js is itself a static <script> tag that can execute
// before state.js (which defines RobcoEvents) finishes its dynamic, context-
// conditional load (see the boot-loader comment in index.html); a top-level
// RobcoEvents.on(...) here would throw "RobcoEvents is not defined" on some boots.
function _wireCoreEventBusSubscribers() {
  RobcoEvents.on('hp.critical', () => {
    document.body.classList.remove('crit-hp-flash');
    void document.body.offsetWidth;
    document.body.classList.add('crit-hp-flash');
    setTimeout(() => document.body.classList.remove('crit-hp-flash'), 750);
    if (typeof triggerHaptic === 'function') triggerHaptic('lowhealth'); // WU-F2 haptic
    // FEEDBACK ANIMATION WAVE 1 (#1 FLATLINE WARNING) — a one-shot EKG
    // stutter layered on the HP trace itself (add-class→reflow→remove, the
    // _coreOneShot pattern), alongside the existing body flash/haptic above
    // (Protocol 22, never forked). The continuous red vignette is a SEPARATE
    // state-driven class toggled every updateMath() tick so it tracks HP
    // staying critical, not just the crossing (see updateMath()).
    const hpTrace = document.getElementById('opTraceHp');
    if (hpTrace) {
      hpTrace.classList.remove('flatline-stutter');
      void hpTrace.offsetWidth;
      hpTrace.classList.add('flatline-stutter');
      setTimeout(() => hpTrace.classList.remove('flatline-stutter'), 1600);
    }
  });
  // PHASE 3 · OPERATOR: the COMMIT LEVEL-UP key (#btnLevelUp) flashes its own
  // label on a successful level-up — reacts to the SAME 'level.up' bus event
  // nativeLevelUp() already emits (Protocol 22, never touches onclick or
  // forks the handler). Purely cosmetic text swap; no state/campaign write.
  RobcoEvents.on('level.up', p => {
    const tag = document.getElementById('opLevelUpKeyText');
    if (!tag) return;
    const newLvl = p && typeof p.newLvl === 'number' ? p.newLvl : state.lvl;
    tag.textContent = '▲ LEVEL ' + newLvl + ' COMMITTED';
    clearTimeout(_levelUpKeyFlashTimer);
    _levelUpKeyFlashTimer = setTimeout(() => {
      tag.textContent = '▲ LEVEL UP';
    }, 1200);
  });
  // FEEDBACK ANIMATION WAVE 1 (#9 VAULT-BOY LEVEL CARD, the flagship) — a
  // static, always-in-DOM card (index.html, inside BUS-01) toggled by a
  // one-shot 'show' class so it survives independent of any innerHTML
  // re-render (Protocol 22, the mini-core static-element precedent). The XP
  // bar gets a paired sweep-shimmer one-shot at the same trigger.
  RobcoEvents.on('level.up', p => {
    const card = document.getElementById('levelUpCard');
    if (!card) return;
    const textEl = document.getElementById('levelUpCardText');
    const newLvl = p && typeof p.newLvl === 'number' ? p.newLvl : state.lvl;
    if (textEl) textEl.textContent = 'LEVEL ' + newLvl;
    card.classList.remove('show');
    void card.offsetWidth;
    card.classList.add('show');
    clearTimeout(_levelUpCardTimer);
    _levelUpCardTimer = setTimeout(() => card.classList.remove('show'), 2600);
    const xpFill = document.getElementById('xp_bar_fill');
    if (xpFill) {
      xpFill.classList.remove('xp-sweep-shimmer');
      void xpFill.offsetWidth;
      xpFill.classList.add('xp-sweep-shimmer');
      setTimeout(() => xpFill.classList.remove('xp-sweep-shimmer'), 1400);
    }
  });
  // FEEDBACK ANIMATION WAVE 1 (#4 GEIGER SPIKE / #5 RADAWAY DRAIN) — the RAD
  // trace chatters (up) or bubbles-drains (down); an amber ☢ film-grain
  // flourish rides the escalating case only. Gated by nothing beyond the
  // existing global prefers-reduced-motion block (Protocol UI-9) — a rad
  // crossing is essential feedback, matching the rad-warning/-critical/-fatal
  // classes already unconditional elsewhere in updateMath().
  RobcoEvents.on('rad.tier', p => {
    const radLine = document.getElementById('opRadLineWrap');
    if (radLine) {
      const cls = p && p.direction === 'down' ? 'rad-drain' : 'rad-spike';
      radLine.classList.remove('rad-spike', 'rad-drain');
      void radLine.offsetWidth;
      radLine.classList.add(cls);
      setTimeout(() => radLine.classList.remove(cls), 1100);
    }
    if (p && p.direction !== 'down' && p.tier !== 'NONE') {
      document.body.classList.remove('geiger-film-grain');
      void document.body.offsetWidth;
      document.body.classList.add('geiger-film-grain');
      setTimeout(() => document.body.classList.remove('geiger-film-grain'), 1000);
    }
  });
  // FEEDBACK ANIMATION WAVE 1 (#6 X-RAY FLASH / #7 SPLINT WRAP) — a one-shot
  // bone-white inversion across the whole zone-body silhouette plus a
  // per-zone flash/wrap on the affected limb only.
  RobcoEvents.on('limb.state', p => {
    if (!p || !p.limb) return;
    const zoneBody = document.querySelector('.zone-body');
    if (zoneBody && p.state === 'crippled') {
      zoneBody.classList.remove('zone-xray-flash');
      void zoneBody.offsetWidth;
      zoneBody.classList.add('zone-xray-flash');
      setTimeout(() => zoneBody.classList.remove('zone-xray-flash'), 500);
    }
    const zone = document.querySelector('.zone[data-limb="' + p.limb + '"]');
    if (zone) {
      const cls = p.state === 'crippled' ? 'zone-fracture' : 'zone-splint-wrap';
      zone.classList.remove('zone-fracture', 'zone-splint-wrap');
      void zone.offsetWidth;
      zone.classList.add(cls);
      setTimeout(() => zone.classList.remove(cls), 900);
    }
  });

  // ── FEEDBACK ANIMATION WAVE 2 (planning/FEEDBACK_ANIMATION_BUILD_PLAN.md,
  // Tier-A) — home-panel reactions to signals already on the bus, plus the
  // one new item.added additive emit (Protocol 22, add-class/reflow/remove
  // one-shots throughout, never a forked handler).
  RobcoEvents.on('stat.change', p => {
    if (!p) return;
    // #10 XP CHUNK FILL — only the genuine-increase case; the fill brightens
    // 2x then settles and a floating "+N XP" ticker climbs and fades.
    if (
      p.key === 'xp' &&
      typeof p.oldVal === 'number' &&
      typeof p.newVal === 'number' &&
      p.newVal > p.oldVal
    ) {
      const xpFill = document.getElementById('xp_bar_fill');
      if (xpFill) {
        xpFill.classList.remove('xp-chunk-fill');
        void xpFill.offsetWidth;
        xpFill.classList.add('xp-chunk-fill');
        setTimeout(() => xpFill.classList.remove('xp-chunk-fill'), 700);
      }
      const wrap = document.getElementById('xp_bar_container');
      if (wrap) {
        const ticker = document.createElement('span');
        ticker.className = 'xp-ticker';
        ticker.textContent = '+' + (p.newVal - p.oldVal) + ' XP';
        wrap.appendChild(ticker);
        setTimeout(() => ticker.remove(), 1150);
      }
    }
    // #11 SERVO RECALIBRATE — the changed SPECIAL channel's cap overshoots
    // past its new seated position and settles; the letter flashes stencil-
    // bright once; pairs with the existing chip-click SFX (Protocol 22, no
    // new audio channel — the closest shipped "servo click" sound).
    if (typeof p.key === 'string' && _SPECIAL_KEYS.includes(p.key)) {
      const ladder = document.querySelector('[data-fd-ladder="' + p.key + '"]');
      if (ladder) {
        const cap = ladder.querySelector('.fd-cap');
        if (cap) {
          cap.classList.remove('servo-overshoot');
          void cap.offsetWidth;
          cap.classList.add('servo-overshoot');
          setTimeout(() => cap.classList.remove('servo-overshoot'), 550);
        }
        const fader = ladder.closest('.fader');
        const letter = fader ? fader.querySelector('.fd-letter') : null;
        if (letter) {
          letter.classList.remove('servo-flash');
          void letter.offsetWidth;
          letter.classList.add('servo-flash');
          setTimeout(() => letter.classList.remove('servo-flash'), 550);
        }
      }
      if (typeof playChipClick === 'function') playChipClick();
    }
    // #2 CRT FLINCH — HP damage taken: a one-shot horizontal tear across the
    // BUS-01 monitor, distinct from the continuous #1 FLATLINE WARNING (which
    // only plays once HP is actually critical).
    if (
      p.key === 'hp' &&
      typeof p.oldVal === 'number' &&
      typeof p.newVal === 'number' &&
      p.newVal < p.oldVal
    ) {
      const mon = document.querySelector('.crt-mon');
      if (mon) {
        mon.classList.remove('crt-flinch');
        void mon.offsetWidth;
        mon.classList.add('crt-flinch');
        setTimeout(() => mon.classList.remove('crt-flinch'), 260);
      }
    }
    // #17 CAPS ODOMETER SPIN — the readout digit-rolls on ANY caps change
    // (manual/AI/trade); the trade case ALSO gets its own cap-glyph arc via
    // the trade.bought/trade.sold subscriber below, composing with this.
    if (p.key === 'caps') {
      const capsEl = document.getElementById('c_caps');
      if (capsEl) {
        capsEl.classList.remove('caps-digit-roll');
        void capsEl.offsetWidth;
        capsEl.classList.add('caps-digit-roll');
        setTimeout(() => capsEl.classList.remove('caps-digit-roll'), 500);
      }
    }
    // FEEDBACK ANIMATION WAVE 3 (#3 STIM FLUSH) — HP genuinely healed: the
    // trace refills with a bright leading edge; a small medical + blinks
    // twice beside CONDITION.
    if (
      p.key === 'hp' &&
      typeof p.oldVal === 'number' &&
      typeof p.newVal === 'number' &&
      p.newVal > p.oldVal
    ) {
      const hpFillEl = document.getElementById('hp_bar_fill');
      if (hpFillEl) {
        hpFillEl.classList.remove('stim-flush');
        void hpFillEl.offsetWidth;
        hpFillEl.classList.add('stim-flush');
        setTimeout(() => hpFillEl.classList.remove('stim-flush'), 700);
      }
      const condWord = document.getElementById('opCondWord');
      if (condWord) {
        const plus = document.createElement('span');
        plus.className = 'stim-plus-blink';
        plus.setAttribute('aria-hidden', 'true');
        plus.textContent = '+';
        condWord.appendChild(plus);
        setTimeout(() => plus.remove(), 700);
      }
    }
  });

  // #17 CAPS ODOMETER SPIN (trade half) — a bottle-cap glyph arcs into the
  // caps tile on a completed trade, layering on top of the digit-roll the
  // accompanying stat.change(caps) above already fires.
  const _playCapsArc = () => {
    const tile = document.querySelector('.rb-tile.wire');
    if (!tile) return;
    const glyph = document.createElement('span');
    glyph.className = 'caps-arc-glyph';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = '◉'; // ◉
    tile.appendChild(glyph);
    setTimeout(() => glyph.remove(), 850);
  };
  RobcoEvents.on('trade.bought', _playCapsArc);
  RobcoEvents.on('trade.sold', _playCapsArc);

  // #18 MANIFEST PUNCH — the drawer's own count badge blips regardless of
  // which drawer is currently open; the freight-tag row itself only animates
  // when its drawer is the one actually rendered (a no-op elsewhere is
  // correct — the row simply isn't in the DOM to animate).
  //
  // Deferred one tick (setTimeout 0): all three item.added call sites
  // (addItem()/doLoot() in ui-render.js, the AI merge in autoImportState())
  // emit BEFORE their own caller's renderInventory()/loadUI() paints the new
  // row — a real gap caught live during Wave 2 verification (Protocol 42) —
  // so a same-tick row lookup always misses. Deferring to the next tick lets
  // that synchronous render finish first; the badge (always in static markup)
  // doesn't strictly need the defer but is included for one consistent path.
  RobcoEvents.on('item.added', p => {
    if (!p) return;
    setTimeout(() => {
      const cat = p.type === 'ammo' ? 'ammo' : p.type || 'misc';
      const badge = document.querySelector('[data-dcount="' + cat + '"]');
      if (badge) {
        badge.classList.remove('drawer-count-blip');
        void badge.offsetWidth;
        badge.classList.add('drawer-count-blip');
        setTimeout(() => badge.classList.remove('drawer-count-blip'), 450);
      }
      const list = document.getElementById('invList');
      if (list && p.name) {
        const row = Array.from(list.querySelectorAll('.mrow .m-name')).find(
          el => el.textContent === p.name
        );
        const li = row ? row.closest('.mrow') : null;
        if (li) {
          li.classList.remove('manifest-punch-in');
          void li.offsetWidth;
          li.classList.add('manifest-punch-in');
          setTimeout(() => li.classList.remove('manifest-punch-in'), 450);
        }
      }
    }, 0);
  });

  // #20 WELD SPARKS + TAG — home-only (the user crafts on-panel). A brief
  // spark flicker on the bench's board LED, then a claim tag typewriter-
  // prints the output name and tears off (a transient DOM node, never
  // persisted markup — Protocol 22, no new index.html structure needed).
  RobcoEvents.on('craft.completed', p => {
    const panel = document.getElementById('craftPanel');
    if (!panel) return;
    panel.classList.remove('weld-spark-flash');
    void panel.offsetWidth;
    panel.classList.add('weld-spark-flash');
    setTimeout(() => panel.classList.remove('weld-spark-flash'), 400);
    const tag = document.createElement('div');
    tag.className = 'craft-claim-tag';
    tag.textContent = (p && p.name) || '';
    panel.appendChild(tag);
    setTimeout(() => tag.remove(), 1650);
  });

  // #30 CLOCK SPIN-DOZE — home-only. The scanline collapses to a bright
  // line (micro power-nap) while the MISSION CLOCK's flip-card drums spin,
  // then both re-wake/bloom back — the SAME sleep.completed event
  // _nativeSleep() already emits (Protocol 22).
  RobcoEvents.on('sleep.completed', () => {
    document.body.classList.remove('sleep-doze');
    void document.body.offsetWidth;
    document.body.classList.add('sleep-doze');
    setTimeout(() => document.body.classList.remove('sleep-doze'), 1450);
  });

  // #31 HOLOTAPE COMMIT — home-only, NO separate annunciator echo (owner
  // decision — the existing mini-core write-pulse already signals off-panel).
  // A holotape glyph slides into the SAVE ARCHIVE panel, reels spin ~1s; a
  // cloud-kind write additionally gets a carrier ripple on the panel itself.
  RobcoEvents.on('data.write', p => {
    const panel = document.getElementById('savesPanel');
    if (!panel) return;
    const summary = panel.querySelector('summary');
    if (summary) {
      const badge = document.createElement('span');
      badge.className = 'holotape-commit-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.innerHTML = '<span class="htc-reel">◎</span> WRITTEN';
      summary.appendChild(badge);
      setTimeout(() => badge.remove(), 1050);
    }
    const kind = p && p.kind;
    if (kind === 'cloud-push' || kind === 'cloud-pull') {
      panel.classList.remove('carrier-ripple');
      void panel.offsetWidth;
      panel.classList.add('carrier-ripple');
      setTimeout(() => panel.classList.remove('carrier-ripple'), 950);
    }
  });

  // ── FEEDBACK ANIMATION WAVE 3 (planning/FEEDBACK_ANIMATION_BUILD_PLAN.md,
  // Tier-B/C) — the remaining home-panel reactions, plus the 5 new emits
  // wired above at their existing setters (Protocol 22, add-class/reflow/
  // remove one-shots throughout, never a forked handler).

  // #19 IN-SERVICE STAMP — home-only; the emit site (toggleEquipItem) already
  // gates unequip out, so this only ever fires on a genuine equip. Targets
  // the freshly-equipped row via the SAME .equip-btn markup renderInventory()
  // already paints — fired AFTER that render, so no defer is needed.
  RobcoEvents.on('item.equipped', p => {
    if (!p || !p.name) return;
    const list = document.getElementById('invList');
    if (!list) return;
    const nameEl = Array.from(list.querySelectorAll('.mrow .m-name')).find(
      el => el.textContent === p.name
    );
    const li = nameEl ? nameEl.closest('.mrow') : null;
    const btn = li ? li.querySelector('.equip-btn') : null;
    if (btn) {
      btn.classList.remove('in-service-stamp');
      void btn.offsetWidth;
      btn.classList.add('in-service-stamp');
      setTimeout(() => btn.classList.remove('in-service-stamp'), 500);
    }
  });

  // #21 PART DROP — home-only reaction to the EXISTING craft.scrapped event;
  // the item silhouette splits into 2-3 part glyphs that drop into the yield
  // card with a settle bounce (transient DOM nodes, never persisted markup —
  // the #20 WELD SPARKS + TAG precedent).
  RobcoEvents.on('craft.scrapped', () => {
    const card = document.getElementById('scrapItemCard');
    if (!card) return;
    ['⚙', '▪', '◆'].forEach((g, i) => {
      const part = document.createElement('span');
      part.className = 'scrap-part-drop';
      part.style.animationDelay = i * 90 + 'ms';
      part.setAttribute('aria-hidden', 'true');
      part.textContent = g;
      card.appendChild(part);
      setTimeout(() => part.remove(), 750 + i * 90);
    });
  });
}
let _levelUpKeyFlashTimer = null;
let _levelUpCardTimer = null;

// ── STATUS ANNUNCIATOR (FEEDBACK ANIMATION WAVE 1 — planning/FEEDBACK_
// ANIMATION_BUILD_PLAN.md §2) ────────────────────────────────────────────
// A themed flagship animation plays on its HOME panel, but the triggering
// event often fires while the user is on a DIFFERENT subsystem (above all
// AI/autoImportState changes landing while the user is on UPLINK/chat) —
// off-panel, the home animation is unseen. The annunciator generalizes the
// mini-core dual-paint pattern: a compact, always-present casing-top readout
// that surfaces the event regardless of the active subsystem.
//
// THE SUPPRESSION RULE (the viewability core): _echoPush(evt) fires IFF the
// event's home subsystem != the currently active one (body.dataset.
// subsystem, set by switchTab()). If the user is already on the home panel,
// the home animation IS the feedback — no redundant echo.
//
// Purely presentational — transient module vars + DOM classes only, never
// state.*/saveState()/robco_v8 (Protocol 22).
const ECHO_QUEUE_CAP = 6;
let _echoQueue = [];
let _echoTimer = null;
let _echoCurrent = null; // {tone, glyph, label, homeSubsystem, sig, count}

// Visibility gate — DELIBERATELY narrower than _coreShouldAnimate(): the
// readout is essential feedback and stays visible at every Immersion tier
// and under reduced-motion (only the entrance/exit FLOURISH quiets there,
// via the existing global prefers-reduced-motion block — automatic, no
// bespoke carve-out). Fully suppressed only when there is truly no viewer:
// a hidden tab or the runtime powered down (the standby-coordinator
// STANDBY/SHUTDOWN/OFF precedent).
function _echoShouldShow() {
  if (typeof document !== 'undefined' && document.hidden) return false;
  const rt =
    typeof AmbientRuntime !== 'undefined' && AmbientRuntime ? AmbientRuntime.getState() : 'ACTIVE';
  if (rt === 'STANDBY' || rt === 'SHUTDOWN' || rt === 'OFF') return false;
  return true;
}

function _echoActiveSubsystem() {
  return (document.body && document.body.dataset && document.body.dataset.subsystem) || '';
}

// tone: 'green' | 'amber' | 'red'. homeSubsystem: the subsystem key
// (selectSubsystem()'s vocabulary) whose own animation already serves as
// the feedback when the user is already there.
function _echoPush(evt) {
  if (!evt || !_echoShouldShow()) return;
  const { tone, glyph, label, homeSubsystem } = evt;
  if (homeSubsystem && _echoActiveSubsystem() === homeSubsystem) return; // on-panel: home animation IS the feedback
  // Identical-consecutive collapse (never floods with repeats) — bump the
  // count on whichever entry (currently showing, or queue tail) matches.
  const sig = tone + '|' + glyph + '|' + label + '|' + homeSubsystem;
  if (_echoCurrent && _echoCurrent.sig === sig) {
    _echoCurrent.count++;
    _echoRenderCurrent();
    return;
  }
  const tail = _echoQueue[_echoQueue.length - 1];
  if (tail && tail.sig === sig) {
    tail.count++;
    return;
  }
  _echoQueue.push({ tone, glyph, label, homeSubsystem, sig, count: 1 });
  if (_echoQueue.length > ECHO_QUEUE_CAP) _echoQueue.shift(); // drop-oldest, never floods
  if (!_echoTimer && !_echoCurrent) _echoAdvance();
}
window._echoPush = _echoPush;

function _echoRenderCurrent() {
  const el = document.getElementById('statusAnnunciator');
  if (!el || !_echoCurrent) return;
  const c = _echoCurrent;
  el.classList.remove('tone-green', 'tone-amber', 'tone-red');
  el.classList.add('tone-' + c.tone);
  const safeLabel = typeof escapeHtml === 'function' ? escapeHtml(c.label) : c.label;
  el.innerHTML =
    '<span class="an-glyph" aria-hidden="true">' +
    c.glyph +
    '</span><span class="an-label">' +
    safeLabel +
    (c.count > 1 ? ' ×' + c.count : '') +
    '</span>';
  el.dataset.home = c.homeSubsystem || '';
}

// FIFO advance: shows the next queued item for ~2000ms, then advances — a
// burst plays in sequence, oldest-first, nothing missed, one annunciation
// visible at a time (never floods).
function _echoAdvance() {
  clearTimeout(_echoTimer);
  _echoTimer = null;
  const el = document.getElementById('statusAnnunciator');
  const next = _echoQueue.shift();
  if (!next) {
    _echoCurrent = null;
    if (el) el.classList.remove('show', 'hide');
    return;
  }
  _echoCurrent = next;
  if (el) {
    el.classList.remove('hide');
    _echoRenderCurrent();
    void el.offsetWidth; // reflow — a re-trigger restarts the entrance cleanly
    el.classList.add('show');
  }
  _echoTimer = setTimeout(() => {
    if (el) el.classList.add('hide');
    setTimeout(_echoAdvance, 220); // matches the annunciator-out keyframe duration
  }, 2000);
}

// TAP-TO-JUMP (owner-added): tapping the annunciator jumps to the reacting
// panel via the SAME selectSubsystem()/switchTab() router every bezel keycap
// already uses (Protocol 22 — no forked routing).
function _echoJump() {
  const el = document.getElementById('statusAnnunciator');
  const home = el && el.dataset && el.dataset.home;
  if (!home) return;
  if (typeof selectSubsystem === 'function') selectSubsystem(home);
}
window._echoJump = _echoJump;

// Subscribes the annunciator to every (b)-class WAVE 1 event — each also
// drives one of the 8 Tier-S flagship animations, so the echo is exercised
// across every subsystem from day one. Wiring is deferred to a function
// called from window.onload (the U7 boot-order lesson), never run at this
// file's top level.
function _wireFeedbackEchoSubscribers() {
  RobcoEvents.on('hp.critical', () =>
    _echoPush({ tone: 'red', glyph: '☢', label: 'HP CRITICAL', homeSubsystem: 'operator' })
  );
  RobcoEvents.on('rad.tier', p =>
    _echoPush({
      tone: p && p.direction === 'down' ? 'green' : 'amber',
      glyph: '☢',
      label: 'RADS: ' + ((p && p.tier) || 'NONE'),
      homeSubsystem: 'operator',
    })
  );
  RobcoEvents.on('limb.state', p =>
    _echoPush({
      tone: p && p.state === 'crippled' ? 'red' : 'green',
      glyph: '⚠',
      label:
        ((p && p.limb) || '').toUpperCase() +
        (p && p.state === 'crippled' ? ' CRIPPLED' : ' MENDED'),
      homeSubsystem: 'operator',
    })
  );
  RobcoEvents.on('level.up', p =>
    _echoPush({
      tone: 'green',
      glyph: '▲',
      label: 'LEVEL ' + (p && typeof p.newLvl === 'number' ? p.newLvl : ''),
      homeSubsystem: 'operator',
    })
  );
  RobcoEvents.on('faction.threshold', p =>
    _echoPush({
      tone: p && p.direction === 'vilified' ? 'red' : 'green',
      glyph: '⚑',
      label: ((p && p.name) || '').toUpperCase() + ' ' + ((p && p.direction) || '').toUpperCase(),
      homeSubsystem: 'operator',
    })
  );
  RobcoEvents.on('quest.status', p =>
    _echoPush({
      tone: p && p.status === 'failed' ? 'red' : 'green',
      glyph: p && p.status === 'failed' ? '✗' : '✓',
      label: ((p && p.name) || '').toUpperCase() + ' ' + ((p && p.status) || '').toUpperCase(),
      homeSubsystem: 'databank',
    })
  );
  RobcoEvents.on('location.visited', p =>
    _echoPush({
      tone: 'green',
      glyph: '⦿',
      label: 'SURVEYED: ' + ((p && p.loc) || ''),
      homeSubsystem: 'databank',
    })
  );
  RobcoEvents.on('collectible.acquired', p =>
    _echoPush({
      tone: 'green',
      glyph: '★',
      label: ((p && p.name) || '').toUpperCase(),
      homeSubsystem: 'operations',
    })
  );
  // FEEDBACK ANIMATION WAVE 2 — echo wiring for the [home + echo] items only
  // (INK STAMP/WELD SPARKS/CLOCK SPIN-DOZE/HOLOTAPE COMMIT are home-only by
  // owner decision and deliberately get no echo push here).
  RobcoEvents.on('stat.change', p => {
    if (!p) return;
    if (
      p.key === 'xp' &&
      typeof p.oldVal === 'number' &&
      typeof p.newVal === 'number' &&
      p.newVal > p.oldVal
    ) {
      _echoPush({
        tone: 'green',
        glyph: '◆',
        label: '+' + (p.newVal - p.oldVal) + ' XP',
        homeSubsystem: 'operator',
      });
    }
    if (typeof p.key === 'string' && _SPECIAL_KEYS.includes(p.key)) {
      _echoPush({
        tone: 'green',
        glyph: '⚙',
        label: p.key.toUpperCase() + ' RECALIBRATED: ' + p.newVal,
        homeSubsystem: 'operator',
      });
    }
    if (
      p.key === 'hp' &&
      typeof p.oldVal === 'number' &&
      typeof p.newVal === 'number' &&
      p.newVal < p.oldVal
    ) {
      _echoPush({
        tone: 'red',
        glyph: '✕',
        label: 'DAMAGE: ' + (p.oldVal - p.newVal),
        homeSubsystem: 'operator',
      });
    }
    if (p.key === 'caps') {
      _echoPush({
        tone: 'amber',
        glyph: '◉',
        label: 'CAPS: ' + p.newVal,
        homeSubsystem: 'operations',
      });
    }
    // FEEDBACK ANIMATION WAVE 3 (#3 STIM FLUSH) — the echo half; the home
    // animation lives in _wireCoreEventBusSubscribers().
    if (
      p.key === 'hp' &&
      typeof p.oldVal === 'number' &&
      typeof p.newVal === 'number' &&
      p.newVal > p.oldVal
    ) {
      _echoPush({
        tone: 'green',
        glyph: '✚',
        label: 'HEALED: +' + (p.newVal - p.oldVal),
        homeSubsystem: 'operator',
      });
    }
  });
  RobcoEvents.on('item.added', p =>
    _echoPush({
      tone: 'green',
      glyph: '◈',
      label: 'ADDED: ' + ((p && p.name) || '').toUpperCase(),
      homeSubsystem: 'operations',
    })
  );

  // ── FEEDBACK ANIMATION WAVE 3 — echo wiring for the [home + echo] items
  // only (CARD SEAT/NEEDLE KICK/IN-SERVICE STAMP/PART DROP/DIRECTIVE FILED/
  // FAULT/QTY DIGIT FLIP are home-only by the build plan's routing table and
  // deliberately get no echo push here; #27 TRIANGULATE pushes directly from
  // onLocationChange() rather than through this bus-subscriber function,
  // since its signal is the existing onLocationChange path, not a new emit).
  RobcoEvents.on('weight.seized', () =>
    _echoPush({ tone: 'amber', glyph: '⚠', label: 'CARGO SEIZED', homeSubsystem: 'operations' })
  );
  RobcoEvents.on('karma.tier', p => {
    const t = (p && p.tier) || '';
    const tone = /evil/i.test(t) ? 'red' : t === 'Neutral' ? 'amber' : 'green';
    _echoPush({ tone, glyph: '⚖', label: 'KARMA: ' + t.toUpperCase(), homeSubsystem: 'operator' });
  });
  RobcoEvents.on('effect.applied', p =>
    _echoPush({
      tone: p && p.type === 'DEBUFF' ? 'red' : 'green',
      glyph: '✦',
      label: 'APPLIED: ' + ((p && p.name) || '').toUpperCase(),
      homeSubsystem: 'operator',
    })
  );
  RobcoEvents.on('effect.expiring', p =>
    _echoPush({
      tone: 'amber',
      glyph: '✦',
      label: 'EXPIRING: ' + ((p && p.name) || '').toUpperCase(),
      homeSubsystem: 'operator',
    })
  );
}
// ── STATUS ANNUNCIATOR END ────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════
// LOCATION CONFIRMATION CARD — top-right arrival toast (Suite 204). A
// RobcoEvents subscriber driving a transient DOM element, matching the
// STATUS ANNUNCIATOR's own architecture (Protocol 22) but shown regardless
// of the active subsystem — unlike the annunciator's homeSubsystem
// suppression, "where did I just go" is meaningful everywhere, including
// while looking at the CARTOGRAPHY TABLE itself. Fired from the single
// onLocationChange() choke point via 'location.current' (guarded there on
// a genuine change). Purely presentational — a transient module timer +
// DOM classes only, never state.*/saveState()/robco_v8.
// ══════════════════════════════════════════════════════════════════════
let _locCardTimer = null;
let _locCardHideTimer = null;

function _locationCardShow(loc) {
  if (!_echoShouldShow()) return; // same hidden-tab/powered-down suppression as the annunciator
  const el = document.getElementById('locationCard');
  if (!el) return;
  const labelEl = el.querySelector('.loc-card-label');
  if (labelEl) {
    labelEl.innerHTML = typeof escapeHtml === 'function' ? escapeHtml(String(loc)) : String(loc);
  }
  clearTimeout(_locCardTimer);
  clearTimeout(_locCardHideTimer);
  el.setAttribute('aria-hidden', 'false');
  el.classList.remove('hide');
  void el.offsetWidth; // reflow — a re-trigger restarts the entrance cleanly on a rapid re-trigger
  el.classList.add('show');
  _locCardTimer = setTimeout(() => {
    el.classList.remove('show');
    el.classList.add('hide');
    _locCardHideTimer = setTimeout(() => {
      el.classList.remove('hide');
      el.setAttribute('aria-hidden', 'true');
    }, 240); // matches the location-card-out keyframe duration
  }, 2200);
}
window._locationCardShow = _locationCardShow;

// Wiring is deferred to a function called from window.onload (the U7
// boot-order lesson), never a bare top-level RobcoEvents.on() call.
function _wireLocationCardSubscriber() {
  RobcoEvents.on('location.current', p => _locationCardShow((p && p.loc) || ''));
}

// PHASE 3 · OPERATOR — S.P.E.C.I.A.L. fader steppers (BUS-02). Sets the
// existing s_<key> input's value then routes through the EXACT SAME
// commitStat(el) the raw number field already used (Protocol 22) — the
// stepper is a second way to reach the same clamp/state-write/save path,
// never a parallel one.
function _bumpSpecialStat(key, delta) {
  const el = document.getElementById('s_' + key);
  if (!el) return;
  const cur = parseInt(el.value, 10);
  const next = Math.max(1, Math.min(10, (isNaN(cur) ? 5 : cur) + delta));
  el.value = String(next);
  commitStat(el);
}

const _SPECIAL_KEYS = ['s', 'p', 'e', 'c', 'i', 'a', 'l'];

// PHASE 3 follow-up (owner interactivity fold-in) -- the S.P.E.C.I.A.L. faders
// must be draggable, not just typed/stepped. Drags the fader ladder track
// directly to a 1-10 value from vertical pointer position, then routes
// through the EXACT SAME commitStat(el) _bumpSpecialStat already uses --
// one clamp/state-write/save path for the typed field, the steppers, AND
// the drag (Protocol 22). Mirrors the existing setupHpBarInteraction()/
// setupXpBarInteraction() mouse+touch pattern (this file, above).
function _applyFaderDragValue(ladder, clientY) {
  const key = ladder.dataset.fdLadder;
  const el = document.getElementById('s_' + key);
  if (!el) return;
  const rect = ladder.getBoundingClientRect();
  const pct = Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height));
  const next = Math.max(1, Math.min(10, Math.round(pct * 9) + 1));
  el.value = String(next);
  commitStat(el);
}
function _wireFaderDrag() {
  document.querySelectorAll('.fd-ladder[data-fd-ladder]').forEach(ladder => {
    let dragging = false;
    ladder.addEventListener('mousedown', e => {
      dragging = true;
      _applyFaderDragValue(ladder, e.clientY);
    });
    document.addEventListener('mousemove', e => {
      if (dragging) _applyFaderDragValue(ladder, e.clientY);
    });
    document.addEventListener('mouseup', () => {
      dragging = false;
    });
    ladder.addEventListener(
      'touchstart',
      e => {
        dragging = true;
        _applyFaderDragValue(ladder, e.touches[0].clientY);
        e.preventDefault();
      },
      { passive: false }
    );
    document.addEventListener(
      'touchmove',
      e => {
        if (dragging) _applyFaderDragValue(ladder, e.touches[0].clientY);
      },
      { passive: false }
    );
    document.addEventListener('touchend', () => {
      dragging = false;
    });
  });
}

// PHASE 3 · OPERATOR hero-three instrument sync (Protocol 22/25 reskin).
// Reads the exact same DOM/state updateMath() already reads for HP/rads/
// SPECIAL; drives the NEW CRT-trace/fader-ladder/zone-plate/board-status
// visuals added around those unchanged ids. Called once at the end of
// updateMath() — no new call sites elsewhere, no forked logic. Writes
// nothing to state/campaign — display-only, mirroring existing DOM values.
function _syncOperatorTelemetry() {
  // BUS-01 — HP condition word + critical trace line
  const hpCurEl = document.getElementById('stat_hp_cur');
  const hpMaxEl = document.getElementById('stat_hp_max');
  let hpPct = 100;
  if (hpCurEl && hpMaxEl) {
    const hpCur = parseInt(hpCurEl.value) || 0;
    const hpMax = Math.max(1, parseInt(hpMaxEl.value) || 1);
    hpPct = Math.min(100, Math.max(0, (hpCur / hpMax) * 100));
  }
  const hpCrit = hpPct <= 25;
  const condWord = document.getElementById('opCondWord');
  if (condWord) {
    condWord.textContent = hpCrit ? 'CRITICAL' : hpPct <= 60 ? 'IMPAIRED' : 'NOMINAL';
    condWord.classList.toggle('crit', hpCrit);
  }
  const traceHp = document.getElementById('opTraceHp');
  if (traceHp) traceHp.classList.toggle('critline', hpCrit);
  const vitalLed = document.getElementById('opVitalLed');
  if (vitalLed) vitalLed.classList.toggle('red', hpCrit);

  // BUS-01 RAD trace + BUS-03 mirrored readout — stat_rads' one real,
  // editable input lives on BUS-01 (the owner-picked Option C placement);
  // BUS-03 shows the same value read-only (Protocol 22 single source, never
  // a second input sharing the id).
  const radsEl = document.getElementById('stat_rads');
  const rads = radsEl ? parseInt(radsEl.value) || 0 : 0;
  const radPct = Math.min(100, rads / 10);
  const radLine = document.getElementById('opRadLine');
  if (radLine) radLine.style.width = radPct + '%';
  const radBar = document.getElementById('opHarnessRadBar');
  if (radBar) radBar.style.width = radPct + '%';
  const radMirror = document.getElementById('opHarnessRadMirror');
  if (radMirror) radMirror.textContent = String(rads);

  // BUS-02 — seven-fader segment ladders (1-10 segments, amber top segment).
  // Reads the DOM value directly (same "avoid stale state" approach the HP/
  // XP bars above already use) so the ladder stays live while typing/
  // stepping, not just after commitStat()'s own save.
  let specialLine = '';
  _SPECIAL_KEYS.forEach(k => {
    const input = document.getElementById('s_' + k);
    const raw = input ? parseInt(input.value, 10) : NaN;
    const v = Math.max(1, Math.min(10, isNaN(raw) ? 5 : raw));
    specialLine += (specialLine ? '·' : '') + v;
    const ladder = document.querySelector('[data-fd-ladder="' + k + '"]');
    if (!ladder) return;
    const segs = ladder.querySelectorAll('i');
    segs.forEach((seg, idx) => {
      seg.classList.toggle('lit', idx < v);
      seg.classList.toggle('top', idx === v - 1);
    });
    const cap = ladder.querySelector('.fd-cap');
    if (cap) cap.style.bottom = ((v - 1) / 9) * 88 + 4 + '%';
  });

  // BUS-03 — crippled-limb fault count for the board status/LED (the SVG
  // zone crippled-class sync itself lives in _syncBioHarnessZones(), called
  // from loadUI() since toggleLimb() already re-renders the whole UI there).
  const limbFaultCount = ['la', 'ra', 'll', 'rl', 'hd'].filter(l => state[l] !== 'OK').length;
  const harnessLed = document.getElementById('opHarnessLed');
  if (harnessLed) harnessLed.classList.toggle('red', limbFaultCount > 0);

  // 0i one-line board status rows (Protocol 25 — never information-free).
  const setStatus = (id, text, alert) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('alert', !!alert);
  };
  setStatus(
    'opVitalStatus',
    'HP ' +
      Math.round(hpPct) +
      '% · LVL ' +
      (parseInt((document.getElementById('stat_lvl') || {}).value) || 1) +
      ' · ' +
      (parseInt((document.getElementById('c_caps') || {}).value) || 0) +
      ' CAPS',
    hpCrit
  );
  setStatus('opSpecialStatus', specialLine, false);
  setStatus(
    'opHarnessStatus',
    (limbFaultCount
      ? '⚠ ' + limbFaultCount + ' LIMB FAULT' + (limbFaultCount > 1 ? 'S' : '')
      : 'ALL LIMBS OK') +
      ' · RAD ' +
      rads +
      ' CPM',
    limbFaultCount > 0
  );
  const locEl = document.getElementById('stat_loc');
  const dateEl = document.getElementById('gameDateDisplay');
  setStatus(
    'opChronoStatus',
    (locEl ? locEl.value : '—') +
      (dateEl && dateEl.textContent !== '—' ? ' · ' + dateEl.textContent : ''),
    false
  );
  setStatus(
    'opSkillsStatus',
    (typeof getSkillKeys === 'function' ? getSkillKeys().length : 0) + ' CHANNELS TRACKED',
    false
  );
  {
    const traitCount = Array.isArray(state.traits) ? state.traits.length : 0;
    const traitSuffix =
      typeof _activeDef === 'function' && _activeDef().hasTraits
        ? ' · ' + traitCount + ' TRAIT' + (traitCount === 1 ? '' : 'S') + ' BURNED-IN'
        : '';
    setStatus(
      'opPerksStatus',
      (state.perks || []).length +
        ' PERK' +
        ((state.perks || []).length === 1 ? '' : 'S') +
        ' SOCKETED' +
        traitSuffix,
      false
    );
  }
  setStatus(
    'opStatusStatus',
    typeof _statusLampSummary === 'function' ? _statusLampSummary() : '— ACTIVE EFFECTS',
    false
  );
  setStatus(
    'opFactionStatus',
    (typeof getFactionRegistry === 'function' ? getFactionRegistry().length : 0) +
      ' FACTIONS TRACKED',
    false
  );
  setStatus(
    'opKarmaStatus',
    (document.getElementById('karma_label') || {}).innerText || '—',
    false
  );
  {
    const bookDefs =
      typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.skillBooks)
        ? FALLOUT_REGISTRY.skillBooks
        : [];
    const bookRead = Array.isArray(state.skillBooks) ? state.skillBooks.length : 0;
    setStatus('opBooksStatus', bookRead + '/' + bookDefs.length + ' READ', false);
  }
  if (typeof _activeDef === 'function' && _activeDef().hasMagazines) {
    const magDefs =
      typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.magazines)
        ? FALLOUT_REGISTRY.magazines
        : [];
    const magConsumed = Array.isArray(state.magazines) ? state.magazines.length : 0;
    setStatus('opMagsStatus', magConsumed + '/' + magDefs.length + ' CONSUMED', false);
  }
}

// OPERATIONS BUS-10 LOAD-CELL WEIGH BRIDGE — a read-only mirror of the exact
// curWt/maxWeight updateMath() already computed (Phase 3 · Piece 2). Drives a
// physical load-beam SVG that bends continuously in proportion to real carry
// weight (never 4 discrete frames) via a plain CSS `transition: d`, which the
// existing global prefers-reduced-motion block collapses to an instant snap
// (transition-duration:0.01ms) with no bespoke carve-out. Zero new state —
// source of truth stays curWt/maxWeight; this only paints a second projection.
// FEEDBACK ANIMATION WAVE 3 (#8 BRIDGE CLANG) — the "did this ACTUALLY
// change?" crossing cache (the _lastRadThreshold precedent). Deliberately
// does NOT seed at boot — the first evaluation each session only
// establishes the baseline (no clang on load with an already-heavy save).
let _lastWeightSeized = null;
function _paintWeighBridge(curWt, maxWeight) {
  const path = document.getElementById('opsBeamPath');
  if (!path) return; // OPERATIONS markup not present (e.g. a stripped test harness)
  const pct = maxWeight > 0 ? (curWt / maxWeight) * 100 : 0;
  const bendPct = Math.min(130, pct); // visual bend caps past ~130% so the SVG never inverts
  const sag = 4 + bendPct * 0.48;
  path.setAttribute('d', 'M30,36 Q150,' + (36 + sag).toFixed(1) + ' 270,36');
  const block = document.getElementById('opsBeamBlock');
  if (block) {
    const midY = 36 + sag * 0.5;
    block.setAttribute('y', (midY - 16).toFixed(1));
  }
  const seized = curWt >= maxWeight;
  // FEEDBACK ANIMATION WAVE 3 (#8 BRIDGE CLANG): one additive emit on the
  // false->true crossing (U7 hp.critical/rad.tier precedent); the shudder +
  // rebound + dust-speck home animation is applied directly here since the
  // crossing is already computed right above (Protocol 22 — no forked
  // detection logic; body.weight-over's OWN continuous shudder is unchanged).
  if (_lastWeightSeized === false && seized === true) {
    RobcoEvents.emit('weight.seized', { seized: true });
    const instrument = document.querySelector('.beam-instrument');
    if (instrument) {
      instrument.classList.remove('bridge-clang');
      void instrument.offsetWidth;
      instrument.classList.add('bridge-clang');
      setTimeout(() => instrument.classList.remove('bridge-clang'), 500);
    }
  }
  _lastWeightSeized = seized;
  const heavy = !seized && curWt >= maxWeight * 0.75;
  const tag = seized ? 'SEIZED — OVER-ENCUMBERED' : heavy ? 'heavy load' : 'nominal';
  const pctText = document.getElementById('opsBeamPct');
  if (pctText) pctText.textContent = 'LOAD ' + Math.round(pct) + '%' + (seized ? ' — OVER' : '');
  const loadSub = document.getElementById('opsLoadSub');
  if (loadSub) loadSub.textContent = 'load ' + Math.round(pct) + '% · ' + tag;
  const stamp = document.getElementById('opsSeizedStamp');
  if (stamp) stamp.style.display = seized ? '' : 'none';
  const note = document.getElementById('opsSeizedNote');
  if (note) note.style.display = seized ? '' : 'none';
  const led = document.getElementById('opsBridgeLed');
  if (led) led.classList.toggle('red', seized);
  const caps = parseInt((document.getElementById('c_caps') || {}).value) || 0;
  const status = document.getElementById('opsBridgeStatus');
  if (status) {
    status.textContent =
      (seized ? '⚠ SEIZED · ' : '') +
      'CARGO ' +
      curWt.toFixed(1) +
      ' / ' +
      maxWeight +
      ' LB · ' +
      caps +
      ' CAPS';
    status.classList.toggle('alert', seized);
  }
}

function macroCommand(actionStr) {
  // Tool Deck unit: reads the deck's shared target field (#deckTarget) instead of the
  // retired #macroTarget. The D-Pad no longer routes through macroCommand() (the
  // Quick-Draw Holster sockets call _nativePadFire()/_nativePadBind() directly), so the
  // old "skip target if this is a PAD command" branch is dead and removed.
  const targetEl = document.getElementById('deckTarget');
  let target = targetEl ? targetEl.value.trim() : '';
  let finalCmd = actionStr;

  if (target) {
    finalCmd = `${actionStr} ${target}`;
  }

  document.getElementById('chatInput').value = `> ${finalCmd}`;
  transmitMessage();
}

// Quick-Draw Holster — the sole writer of state.padBindings. Reached three ways
// (socket BIND flow, typed [BIND: gear, DIR], and read-side _nativePadFire); the AI
// never calls this (player-authority, Protocol 24 — see api-import.js autoImportState()).
function _nativePadBind(gear, dir) {
  const d = String(dir || '').toLowerCase();
  if (!['up', 'down', 'left', 'right'].includes(d)) {
    appendToChat('> ▸ INVALID VECTOR — USE UP, DOWN, LEFT, OR RIGHT', 'sys', true);
    return;
  }
  const g = String(gear || '').trim();
  if (!g) {
    appendToChat('> ▸ TARGET FIELD IS EMPTY — TYPE THE GEAR TO HOLSTER FIRST', 'sys', true);
    return;
  }
  state.padBindings[d] = g;
  saveState();
  if (typeof renderHolster === 'function') renderHolster();
  appendToChat(
    `> ▸ [BIND: ${g.toUpperCase()}, ${d.toUpperCase()}] — VECTOR HOLSTERED`,
    'sys',
    true
  );
}

// Fires the gear holstered to a vector. An empty socket hints toward BIND ▸ and makes
// no AI call; a bound socket hands the Director a resolved action — the app now knows
// the gear name natively instead of the AI having to remember it.
function _nativePadFire(dir) {
  const d = String(dir || '').toLowerCase();
  if (!['up', 'down', 'left', 'right'].includes(d)) {
    appendToChat('> ▸ INVALID VECTOR — USE UP, DOWN, LEFT, OR RIGHT', 'sys', true);
    return;
  }
  const gear = state.padBindings && state.padBindings[d];
  if (!gear) {
    appendToChat('> ▸ SOCKET EMPTY — HOLSTER GEAR FIRST (BIND ▸)', 'sys', true);
    return;
  }
  transmitMessage(`Deploy ${gear}`);
}

// Boot-wired from window.onload alongside _wirePanelPersistence() (the tray it
// replaces was wired there). Every listener here is addEventListener-based; only
// #deckKey keeps its inline onclick (Suite 59 definition-anchored resolution).
function _wireToolDeck() {
  const key = document.getElementById('deckKey');
  const deck = document.getElementById('toolDeck');
  const scrim = document.getElementById('deckScrim');
  const dx = document.getElementById('deckClose');
  const bindKey = document.getElementById('bindKey');
  if (!key || !deck || !scrim) return;

  scrim.addEventListener('click', closeToolDeck);
  if (dx) dx.addEventListener('click', closeToolDeck);
  deck.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !deck.hidden) closeToolDeck();
  });

  deck.querySelectorAll('.tool-row[data-tool]').forEach(row => {
    row.addEventListener('click', () => {
      const targetEl = document.getElementById('deckTarget');
      const val = targetEl ? targetEl.value.trim() : '';
      switch (row.dataset.tool) {
        case 'THREAT':
          macroCommand('[THREAT]');
          break;
        case 'VATS SIM':
          showVATSOverlay();
          break;
        case 'TRADE':
          expandPanelForCategory('trade');
          break;
        case 'LOOT':
          renderLoot(val);
          break;
        case 'CONSULT':
          macroCommand('[CONSULT]');
          break;
        case 'VATS CALC':
          showVATSOverlay();
          break;
      }
      closeToolDeck();
    });
  });

  if (bindKey) {
    bindKey.addEventListener('click', () => {
      _holsterBinding = !_holsterBinding;
      const holster = document.querySelector('.holster');
      const hint = document.getElementById('holsterHint');
      if (holster) holster.classList.toggle('binding', _holsterBinding);
      bindKey.classList.toggle('armed', _holsterBinding);
      bindKey.setAttribute('aria-pressed', String(_holsterBinding));
      if (hint) {
        hint.textContent = _holsterBinding
          ? 'TYPE GEAR IN THE TARGET FIELD, THEN TAP A SOCKET TO HOLSTER IT'
          : '';
      }
      const targetEl = document.getElementById('deckTarget');
      if (_holsterBinding && targetEl) targetEl.focus();
    });
  }

  deck.querySelectorAll('.socket[data-dir]').forEach(socket => {
    socket.addEventListener('click', () => {
      const dir = socket.dataset.dir;
      const targetEl = document.getElementById('deckTarget');
      if (_holsterBinding) {
        const gear = targetEl ? targetEl.value.trim() : '';
        if (!gear) {
          const hint = document.getElementById('holsterHint');
          if (hint) hint.textContent = 'TARGET FIELD IS EMPTY — TYPE THE GEAR TO HOLSTER FIRST';
          if (targetEl) targetEl.focus();
          return;
        }
        _nativePadBind(gear, dir);
        if (targetEl) targetEl.value = '';
        _disarmHolsterBind();
        return;
      }
      const bound = state.padBindings && state.padBindings[String(dir || '').toLowerCase()];
      if (bound) closeToolDeck();
      _nativePadFire(dir);
    });
  });
}
