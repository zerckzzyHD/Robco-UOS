// ── api-import.js — AI → STATE IMPORT (split from api.js, 2.8.5 U-A3) ──
// sanitizeImportedContainer() (defense-in-depth type coercion for the cloud
// pull / file import fast-paths), _wireApiEventBusSubscribers() (the
// faction.threshold chat-alert/sound/haptic reaction to a crossing this
// file's autoImportState() detects), and autoImportState() itself — the
// AI-JSON-response → state field-mapping path (Protocol 24). Global scope,
// static <script> tag — api*.js family, loads late in the boot chain right
// before cloud.js (see index.html load order).
// EXPOSES: autoImportState(), sanitizeImportedContainer(),
// _wireApiEventBusSubscribers(), _confirmDirectorRemovals(),
// _confirmInventoryRemovals(), _confirmPerkRemovals().
// GOTCHA: never use recursive key transformation on AI JSON here (Protocol
// 24 / Prohibited Patterns) — every field below is an explicit, named
// mapping (parsed.<key> → state.<key>) with its own type coercion/clamp.
// A generic "flatten and assign" pass would let the AI write arbitrary
// state keys unvalidated; that is exactly what this file exists to prevent.

/* global playQuestCompleteSound, playQuestFailSound, playFactionThresholdSound */

// AI_OVERSEER Finding 7 — ambient-chatter throttle. The "PIP-BOY DATA SYNCED WITH
// ROBCO MAINFRAME" text line used to print after EVERY successful AI sync, so it
// dominated the transcript. The audible sync tone (#33, playSyncTone) still confirms
// every sync; the TEXT confirmation is now occasional — the first sync of the session
// and every 6th after — so it reads as texture, not noise. A counter (not
// Math.random) keeps the throttle deterministic and testable.
let _aiSyncCount = 0;

// Type-coerces and validates a robco_v8 container before writing to localStorage.
// Defense in depth for the cloud pull / file import fast-paths that bypass autoImportState.
// Contract: raw strings live in state; render functions (renderInventory, renderQuests, etc.)
// call escapeHtml() at display time. DO NOT HTML-escape here — that would double-encode
// apostrophes and ampersands on every round-trip (e.g. "Ain't" → stored as "Ain&#x27;t" →
// rendered as "Ain&amp;#x27;t" → corrupts after each pull/autosave cycle).
function sanitizeImportedContainer(container) {
  if (!container || typeof container !== 'object') return container;

  function _str(v) {
    return typeof v === 'string' ? v : v == null ? '' : String(v);
  }

  function _sanitizeState(s) {
    if (!s || typeof s !== 'object') return s;
    const o = Object.assign({}, s);
    // Type-coerce numeric fields
    [
      'lvl',
      'xp',
      'hpCur',
      'hpMax',
      's',
      'p',
      'e',
      'c',
      'i',
      'a',
      'l',
      'caps',
      'rads',
      'karma',
      'ticks',
    ].forEach(k => {
      if (k in o) o[k] = parseInt(o[k]) || 0;
    });
    // Whitelist limb values
    ['la', 'ra', 'll', 'rl', 'hd'].forEach(k => {
      if (k in o) o[k] = String(o[k]).toUpperCase() === 'CRIPPLED' ? 'CRIPPLED' : 'OK';
    });
    if (o.loc != null) o.loc = _str(o.loc);
    if (Array.isArray(o.campaign_notes))
      o.campaign_notes = o.campaign_notes.filter(n => n != null).map(_str);
    // P4 Terminal Record: coerce eventLog to an array of {t,rt,type,text} records,
    // dropping malformed entries and clamping fields (born-compliant — Protocol 4).
    if (Array.isArray(o.eventLog)) {
      o.eventLog = o.eventLog
        .filter(e => e && typeof e === 'object' && !Array.isArray(e))
        .map(e => ({
          t: parseInt(e.t) || 0,
          rt: parseInt(e.rt) || 0,
          type: _str(e.type || 'log').slice(0, 40),
          text: _str(e.text || '').slice(0, 5000),
        }))
        .slice(-1000);
    } else if (o.eventLog !== undefined) {
      o.eventLog = [];
    }
    if (Array.isArray(o.quests))
      o.quests = o.quests.map(q => ({
        ...q,
        name: _str(q.name),
        status: ['active', 'complete', 'failed'].includes(String(q.status || '').toLowerCase())
          ? String(q.status).toLowerCase()
          : 'active',
        objective: q.objective != null ? _str(q.objective) : null,
      }));
    if (Array.isArray(o.inventory))
      o.inventory = o.inventory.map(it => ({
        ...it,
        name: _str(it.name),
        qty: parseInt(it.qty) || 1,
        wgt: parseFloat(it.wgt) || 0,
        val: parseInt(it.val) || 0,
      }));
    if (Array.isArray(o.squad))
      o.squad = o.squad.map(m => ({
        ...m,
        name: _str(m.name),
        hp: parseInt(m.hp) || 0,
        hpMax: parseInt(m.hpMax) || 100,
      }));
    if (Array.isArray(o.perks)) o.perks = o.perks.map(p => ({ ...p, name: _str(p.name) }));
    if (Array.isArray(o.status))
      o.status = o.status.map(e => ({
        ...e,
        name: _str(e.name),
        ticks: parseInt(e.ticks) || 0,
        type: ['BUFF', 'DEBUFF', 'NEUTRAL'].includes(String(e.type || '').toUpperCase())
          ? String(e.type).toUpperCase()
          : 'BUFF',
      }));
    if (o.equipped && typeof o.equipped === 'object')
      o.equipped = {
        weapon: o.equipped.weapon != null ? _str(o.equipped.weapon) : null,
        armor: o.equipped.armor != null ? _str(o.equipped.armor) : null,
        headgear: o.equipped.headgear != null ? _str(o.equipped.headgear) : null,
      };
    // String[] lists (Phase-6 trackers + locationHistory map-discovery set):
    // drop null/undefined entries and coerce each to a string (defensive for imported data).
    ['collectibles', 'traits', 'skillBooks', 'magazines', 'locationHistory'].forEach(k => {
      if (Array.isArray(o[k])) o[k] = o[k].filter(n => n != null).map(_str);
    });
    // Lincoln memorabilia (FO3) — map of artifact name → disposition. Coerce keys to
    // strings and whitelist dispositions (legacy 'other' → 'found'; unknown → 'found').
    if (o.lincolnItems && typeof o.lincolnItems === 'object' && !Array.isArray(o.lincolnItems)) {
      const _disp = ['found', 'hannibal', 'leroy', 'washington'];
      const li = {};
      Object.keys(o.lincolnItems).forEach(k => {
        let d = String(o.lincolnItems[k] == null ? '' : o.lincolnItems[k]).toLowerCase();
        if (d === 'other') d = 'found';
        li[_str(k)] = _disp.includes(d) ? d : 'found';
      });
      o.lincolnItems = li;
    }
    // Quick-Draw Holster — padBindings is a fixed 4-key map (direction -> gear name or
    // null). Serialized-whole cloud-pull / file-import path (Protocol 34): rebuild the
    // map on every pull, coercing each of the 4 keys to a trimmed string or null and
    // dropping any extras. Player-authored only (Protocol 24) — the AI never writes this
    // via autoImportState(), so this is the sole non-native normalization path.
    {
      const src =
        o.padBindings && typeof o.padBindings === 'object' && !Array.isArray(o.padBindings)
          ? o.padBindings
          : {};
      const pb = {};
      ['up', 'down', 'left', 'right'].forEach(d => {
        const v = src[d];
        pb[d] = typeof v === 'string' && v.trim() ? v.trim() : null;
      });
      o.padBindings = pb;
    }
    // Faction reputation — fame/infamy are non-negative integers; preserve any other
    // per-faction fields and rebuild a missing/non-object entry as a zeroed pair.
    if (o.factions && typeof o.factions === 'object' && !Array.isArray(o.factions)) {
      const f = {};
      Object.keys(o.factions).forEach(k => {
        const fac = o.factions[k];
        if (fac && typeof fac === 'object' && !Array.isArray(fac)) {
          f[k] = {
            ...fac,
            fame: Math.max(0, parseInt(fac.fame) || 0),
            infamy: Math.max(0, parseInt(fac.infamy) || 0),
          };
        } else {
          f[k] = { fame: 0, infamy: 0 };
        }
      });
      o.factions = f;
    }
    return o;
  }

  const out = Object.assign({}, container);
  if (out.campaigns && typeof out.campaigns === 'object') {
    out.campaigns = Object.fromEntries(
      Object.entries(out.campaigns).map(([k, v]) => [k, _sanitizeState(v)])
    );
  }
  return out;
}

// ── EVENT BUS SUBSCRIBERS ─────────────────────────────────────────────────────
// U7: faction-threshold reaction (chat alert + sound + haptic) — the detector
// inside autoImportState() below only detects the crossing and emits; this is
// the one subscriber for it, unchanged from the code it replaces except for
// being reachable from anywhere that emits 'faction.threshold', not just here.
// Wiring is deferred to a function called from window.onload (ui-core.js), NOT
// run at this file's top level — api.js is itself a static <script> tag that can
// execute before state.js (which defines RobcoEvents) finishes its dynamic,
// context-conditional load (see the boot-loader comment in index.html); a
// top-level RobcoEvents.on(...) here would throw "RobcoEvents is not defined"
// on some boots.
function _wireApiEventBusSubscribers() {
  RobcoEvents.on('faction.threshold', p => {
    const msg =
      p.direction === 'vilified'
        ? `> ⚠ [FACTION ALERT] ${p.name}: STATUS DOWNGRADED TO VILIFIED. HOSTILE ENGAGEMENT EXPECTED.`
        : `> ★ [FACTION ALERT] ${p.name}: STATUS ELEVATED TO IDOLIZED.`;
    if (typeof appendToChat === 'function') appendToChat(msg, 'sys', true);
    if (typeof playFactionThresholdSound === 'function')
      playFactionThresholdSound(p.direction === 'idolized');
    if (typeof triggerHaptic === 'function') triggerHaptic('alert'); // WU-F2 haptic
  });
}

// ── DIRECTOR REMOVAL CONFIRM GATE (AI_OVERSEER Finding 1) ─────────────────────
// The ONE shared confirm surface for every AI-proposed DESTRUCTIVE change to a
// durable collection (Protocol 22 — one modal, described per collection, never a
// fork per field). This is Protocol 34's DNA — "cloud writes are additive;
// destructive ops are confirm-gated" — applied to the AI-import path: a
// destructive write to the Courier's durable data is NEVER silent. Reuses
// confirmAction() (the same diegetic confirm the level-up / WIPE flows use).
//
// `opts`:
//   • noun   — what is being reduced, for the prose ('items', 'perks', …)
//   • logTag — the [TAG] on the applied-change chat line ('INVENTORY', 'PERKS', …)
//   • lines  — pre-formatted diegetic bullet lines describing each reduction
//   • onApprove — callback that performs the actual state mutation IFF approved
//
// SAFETY DEFAULT: if no confirm surface exists (headless import, an old cached
// client, any context without confirmAction), the change is simply DROPPED — the
// data is KEPT, never reduced unconfirmed. Keeping data the AI wanted gone is a
// harmless, user-reversible outcome; silently destroying it is not.
function _confirmDirectorRemovals(opts) {
  if (!opts || !Array.isArray(opts.lines) || !opts.lines.length) return;
  if (typeof confirmAction !== 'function') return; // no confirm surface → keep data
  // AI_OVERSEER Finding 4: address the player by their per-game title (Courier /
  // Lone Wanderer / Sole Survivor), sourced from GAME_DEFS[ctx].identity via
  // getIdentity() (Protocol 38) — never a hardcoded "Courier".
  const _id = typeof getIdentity === 'function' ? getIdentity() : null;
  const _playerNoun = (_id && _id.playerNoun) || 'Courier';
  confirmAction({
    title: '> DIRECTOR ' + (opts.title || 'STATE REQUEST'),
    warning:
      'The Director wants to reduce or remove ' +
      opts.noun +
      ' the ' +
      _playerNoun +
      ' currently has:\n' +
      opts.lines.join('\n') +
      '\n\nApprove this change? Choosing KEEP leaves your ' +
      opts.noun +
      ' untouched.',
    confirmLabel: 'APPROVE',
    cancelLabel: 'KEEP',
  }).then(ok => {
    if (!ok) return; // Courier declined — data retained, nothing written
    opts.onApprove();
    // A removed item may have been equipped — clear any now-dangling slot through
    // the ONE shared reconciler (Protocol 22), then persist + repaint.
    if (typeof reconcileEquipped === 'function') reconcileEquipped(state);
    if (typeof saveState === 'function') saveState();
    if (typeof loadUI === 'function') loadUI();
    if (typeof appendToChat === 'function')
      appendToChat(
        '> [' + (opts.logTag || 'STATE') + '] Director-requested change applied.',
        'sys',
        true
      );
  });
}

// INVENTORY confirm gate — a thin describe-and-apply wrapper over the shared
// surface above. `removals` is [{name, from, to}] where `to` is the proposed new
// quantity (0 = drop the item entirely).
function _confirmInventoryRemovals(removals) {
  if (!Array.isArray(removals) || !removals.length) return;
  const lines = removals.map(r =>
    r.to <= 0 ? `• ${r.name} ×${r.from} → REMOVED` : `• ${r.name}: qty ${r.from} → ${r.to}`
  );
  _confirmDirectorRemovals({
    title: 'INVENTORY REQUEST',
    noun: 'items',
    logTag: 'INVENTORY',
    lines,
    onApprove: () => {
      if (!Array.isArray(state.inventory)) return;
      removals.forEach(r => {
        const key = String(r.name).toLowerCase();
        if (r.to <= 0) {
          state.inventory = state.inventory.filter(it => String(it.name).toLowerCase() !== key);
        } else {
          const it = state.inventory.find(x => String(x.name).toLowerCase() === key);
          if (it) it.qty = r.to;
        }
      });
    },
  });
}

// PERKS confirm gate — a rank REDUCTION is durable-progression loss (AI_OVERSEER
// Finding 1). `removals` is [{name, from, to}] where `to` is the proposed lower
// rank. Reuses the shared surface above (Protocol 22).
function _confirmPerkRemovals(removals) {
  if (!Array.isArray(removals) || !removals.length) return;
  const lines = removals.map(r =>
    r.to <= 0 ? `• ${r.name} (rank ${r.from}) → REMOVED` : `• ${r.name}: rank ${r.from} → ${r.to}`
  );
  _confirmDirectorRemovals({
    title: 'PROGRESSION REQUEST',
    noun: 'perks',
    logTag: 'PERKS',
    lines,
    onApprove: () => {
      if (!Array.isArray(state.perks)) return;
      removals.forEach(r => {
        const key = String(r.name).toLowerCase();
        if (r.to <= 0) {
          state.perks = state.perks.filter(p => String(p.name).toLowerCase() !== key);
        } else {
          const p = state.perks.find(x => String(x.name).toLowerCase() === key);
          if (p) p.rank = r.to;
        }
      });
    },
  });
}

// ── AI JSON → STATE FIELD MAPPING ─────────────────────────────────────────────
// Called from transmitMessage() (api.js) with the raw JSON string of the AI's
// "state" node, and from cloud-pull / file-import paths. Every field is mapped
// and coerced explicitly below (Protocol 24) — see the file header GOTCHA.
function autoImportState(jsonString) {
  try {
    // Snapshot current state for undo before applying changes
    window._lastStateBeforeSync = JSON.stringify(state);

    // AI_OVERSEER Finding 6 — collected in-place change-card lines for this sync.
    // Filled from the SAME diff that builds the [DELTA] chat line below (scalars) and
    // from the changed-category pass at the end of this function (arrays/objects), then
    // flushed once to _syncChangeCardsShow(). This is the upgrade of the existing DELTA
    // primitive the owner asked for — one change-detector, two surfaces (a durable chat
    // line for the record, a transient card so the change is visible AS IT HAPPENS).
    const _cardLines = [];

    let parsed = JSON.parse(jsonString);

    // ── DIRECT FIELD MAPPING (no flatten — avoids key collision risk) ─────────────
    // Primitives: try lowercase key first, then uppercase fallback
    const _g = (obj, k) =>
      obj[k] !== undefined
        ? obj[k]
        : obj[k.toUpperCase()] !== undefined
          ? obj[k.toUpperCase()]
          : undefined;
    const lvlV = _g(parsed, 'lvl');
    const _prevLvl = state.lvl; // H3: capture before update
    if (lvlV !== undefined) state.lvl = parseInt(lvlV) || 0;
    // H3/U7: level-up is a state crossing — emit through the bus. The jingle,
    // haptic, and (U8) campaign-note subscribers each decide independently
    // whether to react; the detector here only detects.
    if (lvlV !== undefined && state.lvl > _prevLvl) {
      RobcoEvents.emit('level.up', { oldLvl: _prevLvl, newLvl: state.lvl });
    }
    const xpV = _g(parsed, 'xp');
    if (xpV !== undefined) state.xp = parseInt(xpV) || 0;
    const hpCurV =
      parsed.hpCur !== undefined
        ? parsed.hpCur
        : parsed.hpcur !== undefined
          ? parsed.hpcur
          : undefined;
    const hpMaxV =
      parsed.hpMax !== undefined
        ? parsed.hpMax
        : parsed.hpmax !== undefined
          ? parsed.hpmax
          : undefined;
    if (hpCurV !== undefined) state.hpCur = parseInt(hpCurV) || 0;
    if (hpMaxV !== undefined) state.hpMax = parseInt(hpMaxV) || 0;
    ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(st => {
      const v = parsed[st] !== undefined ? parsed[st] : parsed[st.toUpperCase()];
      if (v !== undefined) state[st] = Math.min(10, Math.max(1, parseInt(v) || 0));
    });
    const capsV = _g(parsed, 'caps');
    if (capsV !== undefined) state.caps = parseInt(capsV) || 0;
    const locV = parsed.loc !== undefined ? parsed.loc : parsed.location;
    if (locV !== undefined) state.loc = locV;
    const karmaV = _g(parsed, 'karma');
    if (karmaV !== undefined) state.karma = parseInt(karmaV) || 0;
    const radsV = _g(parsed, 'rads');
    if (radsV !== undefined) {
      // Owner interactivity fold-in: clamp the AI-write path too, mirroring the
      // SPECIAL-stat clamp above — [0, GAME_DEFS[ctx].maxRads], never a hardcoded 1000.
      const _ctx = typeof getGameContext === 'function' ? getGameContext() : 'FNV';
      const _def = (GAME_DEFS && GAME_DEFS[_ctx]) || (GAME_DEFS && GAME_DEFS.FNV) || {};
      const _maxRads = typeof _def.maxRads === 'number' ? _def.maxRads : 1000;
      state.rads = Math.max(0, Math.min(_maxRads, parseInt(radsV) || 0));
    }
    const ticksV = _g(parsed, 'ticks');
    if (ticksV !== undefined) state.ticks = parseInt(ticksV) || 0;
    // All five limbs including head
    ['la', 'ra', 'll', 'rl', 'hd'].forEach(limb => {
      const v = parsed[limb] !== undefined ? parsed[limb] : parsed[limb.toUpperCase()];
      if (v !== undefined) {
        const wasOk = state[limb] === 'OK';
        const newVal = String(v).toUpperCase() === 'CRIPPLED' ? 'CRIPPLED' : 'OK';
        state[limb] = newVal;
        // FEEDBACK ANIMATION WAVE 1 (#6 X-RAY FLASH / #7 SPLINT WRAP) — the
        // SAME limb.state event the native toggleLimb() emits (ui-core.js),
        // fired only on a genuine change so an unchanged AI resend never
        // replays the animation (Protocol 22).
        const nowOk = newVal === 'OK';
        if (wasOk !== nowOk) {
          RobcoEvents.emit('limb.state', { limb, state: nowOk ? 'ok' : 'crippled' });
        }
      }
    });
    // Snapshot factions BEFORE update for auto-logging
    const factionsBefore = state.factions ? JSON.parse(JSON.stringify(state.factions)) : {};
    // Faction standing — structured format (v1.6.3+)
    if (parsed.factions && typeof parsed.factions === 'object' && !Array.isArray(parsed.factions)) {
      if (!state.factions) state.factions = {};
      getFactionRegistry().forEach(f => {
        if (parsed.factions[f.key] && typeof parsed.factions[f.key] === 'object') {
          state.factions[f.key] = {
            fame: Math.max(0, parseInt(parsed.factions[f.key].fame) || 0),
            infamy: Math.max(0, parseInt(parsed.factions[f.key].infamy) || 0),
          };
        }
      });
    }
    // Legacy flat key fallback (backward compat with old AI responses)
    if (parsed.nf !== undefined && state.factions) {
      state.factions.ncr.fame = parseInt(parsed.nf) || 0;
    }
    if (parsed.ni !== undefined && state.factions) {
      state.factions.ncr.infamy = parseInt(parsed.ni) || 0;
    }
    if (parsed.lf !== undefined && state.factions) {
      state.factions.legion.fame = parseInt(parsed.lf) || 0;
    }
    if (parsed.li !== undefined && state.factions) {
      state.factions.legion.infamy = parseInt(parsed.li) || 0;
    }
    if (parsed.sf !== undefined && state.factions) {
      state.factions.house.fame = parseInt(parsed.sf) || 0;
    }
    if (parsed.si !== undefined && state.factions) {
      state.factions.house.infamy = parseInt(parsed.si) || 0;
    }
    // P4: auto-log faction changes as structured Terminal Record events
    if (state.factions && factionsBefore) {
      getFactionRegistry().forEach(f => {
        const old = factionsBefore[f.key] || { fame: 0, infamy: 0 };
        const cur = state.factions[f.key] || { fame: 0, infamy: 0 };
        const fameDelta = cur.fame - old.fame;
        const infamyDelta = cur.infamy - old.infamy;
        if (fameDelta !== 0 || infamyDelta !== 0) {
          let parts = [];
          if (fameDelta !== 0) parts.push(`fame ${fameDelta > 0 ? '+' : ''}${fameDelta}`);
          if (infamyDelta !== 0) parts.push(`infamy ${infamyDelta > 0 ? '+' : ''}${infamyDelta}`);
          _logEvent('faction', `${f.name}: ${parts.join(', ')}`);
        }
      });
    }
    // Skills (nested object — map from parsed.skills directly)
    if (parsed.skills && typeof parsed.skills === 'object' && !Array.isArray(parsed.skills)) {
      if (!state.skills) state.skills = {};
      getSkillKeys().forEach(sk => {
        if (parsed.skills[sk] !== undefined)
          state.skills[sk] = Math.min(100, Math.max(0, parseInt(parsed.skills[sk]) || 0));
      });
    }

    let st = parsed.status || parsed.Status || parsed.STATUS;
    if (st && Array.isArray(st)) {
      // ── STATUS RECONCILE (AI_OVERSEER Finding 1, status treatment) ──────────
      // Active effects are TRANSIENT (they wear off) — NOT durable progression. So
      // unlike inventory/perks, a reduction here is normal play (a buff ticking
      // down) and is NEVER confirm-gated (a gate would prompt on every expiring
      // effect — unusable). What IS closed is the silent WIPE: the old
      // `state.status = st.map(...)` full-replace let an empty/short AI array erase
      // active effects on a do-nothing turn. Now the AI array is a PROPOSAL merged
      // against current effects: an effect it MENTIONS is added or updated in place
      // (incl. reduced ticks — wearing off is fine); an effect it OMITS is KEPT
      // (the native tick-down below still expires timed effects naturally); an
      // empty array wipes nothing.
      // The #28 TUNGSTEN WARM-UP animation set is still captured BEFORE the merge
      // so a resend never replays it for effects the player already had (Protocol 22).
      const _statusNamesBefore = new Set(
        (state.status || []).map(e => String(e.name).toLowerCase())
      );
      const _curStatus = Array.isArray(state.status) ? state.status.slice() : [];
      const _statusByName = new Map(_curStatus.map(e => [String(e.name).toLowerCase(), e]));
      st.forEach(item => {
        const norm =
          typeof item === 'string'
            ? { name: item, ticks: 0, type: 'BUFF' }
            : {
                name: item.name || 'Unknown',
                ticks: parseInt(item.ticks) || 0,
                type: ['BUFF', 'DEBUFF', 'NEUTRAL'].includes(String(item.type || '').toUpperCase())
                  ? String(item.type).toUpperCase()
                  : 'BUFF',
              };
        const key = String(norm.name).toLowerCase();
        const existing = _statusByName.get(key);
        if (!existing) {
          _curStatus.push(norm);
          _statusByName.set(key, norm);
        } else {
          existing.ticks = norm.ticks;
          existing.type = norm.type;
        }
      });
      state.status = _curStatus;
      state.status.forEach(eff => {
        if (!_statusNamesBefore.has(String(eff.name).toLowerCase())) {
          RobcoEvents.emit('effect.applied', { name: eff.name, type: eff.type });
          _pendingEffectWarmup.push(eff.name);
        }
      });
    }
    let inv = parsed.inventory || parsed.Inventory || parsed.inv;
    if (inv && Array.isArray(inv)) {
      if (!state.ammo) state.ammo = {};
      // ── INVENTORY RECONCILE (Protocol 24 + Protocol 34 DNA) — AI_OVERSEER F1 ──
      // The AI's inventory array is a PROPOSAL, never an assignment. The old code
      // did a wholesale `state.inventory =` of `inv.map(...)` — a FULL REPLACE — so an empty or short
      // array from a do-nothing turn (a failed repair, an aborted craft) silently
      // WIPED natively-held items with no confirmation and no undo. Real,
      // unrecoverable item loss during ordinary play (audit Finding 1). Now:
      //   • ADDITIONS (a name not currently held, or a higher qty than held) are
      //     non-destructive → applied immediately. Narrative looting is unchanged.
      //   • REMOVALS (a lower qty than held, incl. qty 0) are DESTRUCTIVE → NOT
      //     applied here; deferred to _confirmInventoryRemovals() (confirm gate).
      //   • Items the proposal does NOT mention are UNCHANGED and kept — an
      //     omitted item is NEVER treated as a removal (the directive now tells
      //     the AI to report only what CHANGED — api-directive.js).
      // The #18 MANIFEST PUNCH animation set is still captured BEFORE the merge so
      // a resend never replays it for items the player already had (Protocol 22).
      const _invNamesBefore = new Set(
        (state.inventory || []).map(it => String(it.name).toLowerCase())
      );
      const _proposed = inv
        .map(it => {
          let wgt = parseFloat(it.wgt ?? it.weight ?? 0) || 0;
          let val = parseInt(it.val ?? it.value ?? 0) || 0;
          let type = it.type ?? 'misc';
          // Auto-fill from database if AI omitted weight/value
          if ((wgt === 0 || type === 'misc') && it.name) {
            const dbHit = typeof lookupItemInDb === 'function' ? lookupItemInDb(it.name) : null;
            if (dbHit) {
              if (wgt === 0 && dbHit.wgt > 0) wgt = dbHit.wgt;
              if (val === 0 && dbHit.val > 0) val = dbHit.val;
              if (type === 'misc' && dbHit.type !== 'misc') type = dbHit.type;
            }
          }
          // Preserve an EXPLICIT qty 0 — it is the AI's "drop this item" signal and
          // must survive to the reconcile as a removal. Only a missing/NaN qty
          // defaults to 1 (a looted item with no count is one). Never negative.
          // (The old `parseInt(it.qty) || 1` silently turned a 0 into a 1, which
          // would have defeated qty-0 removals — AI_OVERSEER F1.)
          const _q = parseInt(it.qty);
          return {
            name: it.name ?? '',
            qty: Number.isNaN(_q) ? 1 : Math.max(0, _q),
            wgt: wgt,
            val: val,
            type: type,
          };
        })
        .filter(it => {
          // Belt-and-suspenders: AI may still return ammo in inventory array.
          // Ammo is additive-by-nature (caliber counts) — reroute to state.ammo
          // and never treat it as an inventory removal.
          if (it.type === 'ammo') {
            state.ammo[it.name] = (state.ammo[it.name] || 0) + (it.qty || 1);
            return false;
          }
          return true;
        });
      // Merge the proposal against current holdings: apply additions in place,
      // collect removals for the confirm gate, keep everything unmentioned.
      const _curInv = Array.isArray(state.inventory) ? state.inventory.slice() : [];
      const _curByName = new Map(_curInv.map(it => [String(it.name).toLowerCase(), it]));
      const _invRemovals = [];
      _proposed.forEach(p => {
        const key = String(p.name).toLowerCase();
        const existing = _curByName.get(key);
        if (!existing) {
          // Brand-new item → non-destructive addition, apply now. A phantom
          // qty-0 entry for an item the Courier doesn't hold is a no-op (nothing
          // to add and nothing to remove) — never pushed as a 0-count ghost.
          if (p.qty > 0) {
            _curInv.push(p);
            _curByName.set(key, p);
          }
        } else if (p.qty > existing.qty) {
          // Quantity increase → addition; take the new total + refreshed metadata.
          existing.qty = p.qty;
          existing.wgt = p.wgt;
          existing.val = p.val;
          existing.type = p.type;
        } else if (p.qty < existing.qty) {
          // Quantity reduction (incl. 0) → DESTRUCTIVE → defer to the confirm gate.
          _invRemovals.push({ name: existing.name, from: existing.qty, to: p.qty });
        }
        // p.qty === existing.qty → unchanged, no-op.
      });
      state.inventory = _curInv;
      state.inventory.forEach(it => {
        if (!_invNamesBefore.has(String(it.name).toLowerCase())) {
          RobcoEvents.emit('item.added', {
            name: it.name,
            qty: it.qty,
            source: 'ai',
            type: it.type,
          });
        }
      });
      // Deferred confirm gate for any proposed removals (async, non-blocking).
      // typeof-guarded so a headless/import context with no confirm surface keeps
      // the items rather than throwing — a destructive write is never silent.
      if (_invRemovals.length && typeof _confirmInventoryRemovals === 'function') {
        _confirmInventoryRemovals(_invRemovals);
      }
    }
    if (parsed.squad && Array.isArray(parsed.squad)) {
      // ── SQUAD RECONCILE (AI_OVERSEER Finding 1, squad treatment) ────────────
      // Companions are durable roster data. The old `state.squad = parsed.squad
      // .map(...)` full-replace let a short/empty AI array silently drop
      // companions. Now the AI array is a PROPOSAL merged by name: a companion it
      // names is added, or its combat fields (HP/condition/etc.) updated in place;
      // a companion it OMITS is KEPT (never dropped by omission). HP changes are
      // normal combat and are NOT gated. A companion is only ever removed from the
      // roster natively (dismissal), never silently by the AI.
      const _curSquad = Array.isArray(state.squad) ? state.squad.slice() : [];
      const _squadByName = new Map(_curSquad.map(m => [String(m.name).toLowerCase(), m]));
      parsed.squad.forEach(m => {
        const norm = {
          name: String(m.name || ''),
          hp: parseInt(m.hp) || 0,
          hpMax: parseInt(m.hpMax) || 100,
          ammo: parseInt(m.ammo) || 0,
          condition: String(m.condition || 'Good'),
          weapon: m.weapon ? String(m.weapon) : null,
          dt: m.dt !== undefined ? parseInt(m.dt) || 0 : undefined,
          affinity: m.affinity !== undefined ? parseInt(m.affinity) || 0 : undefined,
        };
        const key = String(norm.name).toLowerCase();
        const existing = _squadByName.get(key);
        if (!existing) {
          _curSquad.push(norm);
          _squadByName.set(key, norm);
        } else {
          Object.assign(existing, norm);
        }
      });
      state.squad = _curSquad;
    }
    // P4: the AI NO LONGER overwrites the manual notebook — campaign_notes is now
    // purely user-owned (player authority). Any campaign_notes the AI returns are
    // routed into the Terminal Record as structured 'log' events, deduped by text
    // so the AI resending its array each turn can never duplicate history.
    if (parsed.campaign_notes && Array.isArray(parsed.campaign_notes)) {
      if (!Array.isArray(state.eventLog)) state.eventLog = [];
      const _seenEvents = new Set(state.eventLog.map(e => e && e.text));
      parsed.campaign_notes.forEach(n => {
        const text = String(n == null ? '' : n).slice(0, 5000);
        if (text && !_seenEvents.has(text)) {
          _logEvent('log', text);
          _seenEvents.add(text);
        }
      });
    }
    // Perks (v1.6.4+)
    if (parsed.perks && Array.isArray(parsed.perks)) {
      // ── PERK RECONCILE (AI_OVERSEER Finding 1, perks treatment) ─────────────
      // Perks are durable PROGRESSION. The old `state.perks = parsed.perks.map(...)`
      // full-replace let a short/empty AI array wipe earned perks. Now the AI array
      // is a PROPOSAL merged by name: a NEW perk, or a HIGHER rank of one already
      // held, applies immediately (progression only grows freely); a LOWER rank is
      // a destructive reduction → DEFERRED to the confirm gate; an OMITTED perk is
      // KEPT (never dropped by omission).
      const _curPerks = Array.isArray(state.perks) ? state.perks.slice() : [];
      const _perkByName = new Map(_curPerks.map(p => [String(p.name).toLowerCase(), p]));
      const _perkRemovals = [];
      parsed.perks.forEach(p => {
        const norm = {
          name: p.name || 'Unknown',
          rank: parseInt(p.rank) || 1,
          level_taken: parseInt(p.level_taken) || 0,
        };
        const key = String(norm.name).toLowerCase();
        const existing = _perkByName.get(key);
        if (!existing) {
          _curPerks.push(norm);
          _perkByName.set(key, norm);
        } else if (norm.rank > existing.rank) {
          existing.rank = norm.rank;
          existing.level_taken = norm.level_taken;
        } else if (norm.rank < existing.rank) {
          _perkRemovals.push({ name: existing.name, from: existing.rank, to: norm.rank });
        }
        // norm.rank === existing.rank → unchanged, no-op.
      });
      state.perks = _curPerks;
      // Deferred confirm gate for any proposed rank reductions (async, non-blocking).
      if (_perkRemovals.length && typeof _confirmPerkRemovals === 'function') {
        _confirmPerkRemovals(_perkRemovals);
      }
    }

    // Quest Log (#1)
    if (parsed.quests && Array.isArray(parsed.quests)) {
      // ── QUEST RECONCILE (AI_OVERSEER Finding 1, quests treatment) ───────────
      // Quests are durable log data. The old `state.quests = parsed.quests.map(...)`
      // full-replace let a short/empty AI array wipe the quest log. Now the AI
      // array is a PROPOSAL merged by name: a NEW quest is added; an existing
      // quest's fields (status/objective/factions) are updated in place; a quest it
      // OMITS is KEPT (the log can never shrink via the AI). A status change
      // (active↔complete↔failed) is a LATERAL state change, never a destructive
      // removal, so it is NOT gated — it still fires the same auto-log / audio /
      // stamp feedback the native cycleQuestStatus() path does (Protocol 22).
      const _curQuests = Array.isArray(state.quests) ? state.quests.slice() : [];
      const _questByName = new Map(_curQuests.map(q => [String(q.name).toLowerCase(), q]));
      parsed.quests.forEach(q => {
        const norm = {
          name: q.name || 'Unknown',
          status: (() => {
            const s = (q.status || '').toLowerCase();
            return ['active', 'complete', 'failed'].includes(s) ? s : 'active';
          })(),
          objective: q.objective || null,
          factions: q.factions || null,
        };
        const key = String(norm.name).toLowerCase();
        const existing = _questByName.get(key);
        const prevStatus = existing ? existing.status : null;
        if (!existing) {
          _curQuests.push(norm);
          _questByName.set(key, norm);
        } else {
          existing.status = norm.status;
          existing.objective = norm.objective;
          existing.factions = norm.factions;
        }
        // Auto-log + audio + stamp on a genuine status change of an existing quest.
        if (existing && prevStatus !== norm.status) {
          _logEvent('quest', `Quest: "${norm.name}" → ${norm.status.toUpperCase()}`);
          const newStatus = norm.status.toUpperCase();
          if (
            (newStatus === 'COMPLETED' || newStatus === 'COMPLETE') &&
            typeof playQuestCompleteSound === 'function'
          ) {
            playQuestCompleteSound();
          } else if (newStatus === 'FAILED' && typeof playQuestFailSound === 'function') {
            playQuestFailSound();
          }
          // FEEDBACK ANIMATION WAVE 1 (#23 CASE-CLOSED STAMP / #24 FILAMENT DIE) —
          // the SAME quest.status event the native cycleQuestStatus() emits.
          if (norm.status === 'complete' || norm.status === 'failed') {
            RobcoEvents.emit('quest.status', {
              name: norm.name,
              status: norm.status,
              prevStatus,
            });
            _pendingQuestStamp = { name: norm.name, status: norm.status };
          }
        }
      });
      state.quests = _curQuests;
    }

    // Equipped Items (#2)
    // Use 'key' in obj to distinguish "AI sent null to unequip" from "AI omitted key (no change)".
    // The old || short-circuit treated null as falsy and kept the old value, blocking unequip.
    if (parsed.equipped && typeof parsed.equipped === 'object') {
      const e = parsed.equipped;
      state.equipped = state.equipped || { weapon: null, armor: null, headgear: null };
      if ('weapon' in e) state.equipped.weapon = e.weapon || null;
      if ('armor' in e) state.equipped.armor = e.armor || null;
      if ('headgear' in e) state.equipped.headgear = e.headgear || null;
    }
    // The AI can resend the whole inventory array without a matching 'equipped'
    // update, or omit 'equipped' entirely after an item leaves inventory
    // narratively — never trust the AI's equipped slots without validating them
    // against the inventory it (possibly) just replaced (Protocol 24). loadUI()'s
    // existing _isDirty('equipped', ...) dirty-check picks up the change and
    // repaints the readout — no direct render call needed here.
    if (typeof reconcileEquipped === 'function') reconcileEquipped(state);

    // Session Stats (#8) — AI can update kills, capsEarned, damageDealt
    if (parsed.stats && typeof parsed.stats === 'object') {
      if (!state.stats)
        state.stats = { kills: 0, capsEarned: 0, damageDealt: 0, sessionStart: Date.now() };
      if (parsed.stats.kills !== undefined) state.stats.kills += parseInt(parsed.stats.kills) || 0;
      if (parsed.stats.capsEarned !== undefined)
        state.stats.capsEarned += parseInt(parsed.stats.capsEarned) || 0;
      if (parsed.stats.damageDealt !== undefined)
        state.stats.damageDealt += parseInt(parsed.stats.damageDealt) || 0;
    }

    // Ammo tracking — object mapping ammo type to count.
    // ── AMMO RECONCILE (AI_OVERSEER Finding 1, ammo treatment) ────────────────
    // Ammo is CONSUMABLE (rounds fire every combat turn) — like effect ticks, a
    // reduction is normal play, so it is NEVER confirm-gated (a gate would prompt
    // on every shot — unusable). The old `state.ammo = parsed.ammo` full-replace
    // let an empty {} or a dropped caliber silently wipe the whole stockpile. Now
    // the AI object is a PROPOSAL merged by caliber: a caliber it names is set to
    // the reported count (up OR down — firing is normal); a caliber it OMITS is
    // KEPT (an empty {} wipes nothing).
    if (parsed.ammo && typeof parsed.ammo === 'object' && !Array.isArray(parsed.ammo)) {
      if (!state.ammo || typeof state.ammo !== 'object' || Array.isArray(state.ammo))
        state.ammo = {};
      Object.keys(parsed.ammo).forEach(cal => {
        const n = parseInt(parsed.ammo[cal]);
        if (!Number.isNaN(n)) state.ammo[cal] = Math.max(0, n);
      });
    }

    // ── STATE DIFF DISPLAY (shows what changed this sync) ────────────────────
    if (window._lastStateBeforeSync) {
      try {
        const before = JSON.parse(window._lastStateBeforeSync);
        let changes = [];
        // AI_OVERSEER Finding 7: 'ticks' is DELIBERATELY excluded from the DELTA line.
        // The directive increments ticks every single turn (1 prompt = 1 tick), so a
        // watched 'ticks' made the DELTA line fire on EVERY turn — even a do-nothing
        // turn — as a bare "ticks: N→N+1", pure noise. The DELTA now surfaces only
        // when something the player actually cares about changed. Ticks stay visible
        // in the vitals readout; they are advisory pacing, not a change worth a line.
        ['lvl', 'xp', 'hpCur', 'hpMax', 'caps', 'rads', 'karma'].forEach(k => {
          if (before[k] !== state[k]) changes.push(`${k}: ${before[k]}→${state[k]}`);
        });
        ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(k => {
          if (before[k] !== state[k]) changes.push(`${k.toUpperCase()}: ${before[k]}→${state[k]}`);
        });
        ['la', 'ra', 'll', 'rl', 'hd'].forEach(k => {
          if (before[k] !== state[k]) changes.push(`${k.toUpperCase()}: ${before[k]}→${state[k]}`);
        });
        const oldInvCount = (before.inventory || []).filter(
          it => (it.type || 'misc') !== 'ammo'
        ).length;
        const newInvCount = (state.inventory || []).filter(
          it => (it.type || 'misc') !== 'ammo'
        ).length;
        if (oldInvCount !== newInvCount)
          changes.push(`inventory: ${oldInvCount}→${newInvCount} items`);
        // Ammo round delta
        const oldAmmoRounds = Object.values(before.ammo || {}).reduce((a, b) => a + b, 0);
        const newAmmoRounds = Object.values(state.ammo || {}).reduce((a, b) => a + b, 0);
        if (oldAmmoRounds !== newAmmoRounds)
          changes.push(`ammo: ${oldAmmoRounds}→${newAmmoRounds} rounds`);
        if (changes.length > 0) {
          appendToChat('> [DELTA] ' + changes.join(' | '), 'sys', true);
          // Finding 6: the same scalar changes, one card each. "caps: 0→45" reads as
          // "CAPS 0→45" on the card (the colon is chat-line grammar, not card grammar);
          // the card element uppercases via CSS.
          changes.forEach(c => _cardLines.push(c.replace(': ', ' ')));
        }
      } catch (e) {
        /* silent */
      }
    }

    // ── STATUS EFFECT TICK-DOWN (#7) ────────────────────────────
    // Each AI sync (= 1 tick) decrements ticks remaining on timed status effects.
    // Effects with ticks <= 0 are considered permanent (ticks: 0) or are kept intact.
    // Effects that had ticks > 0 and reach 0 are auto-expired and removed.
    if (state.status && state.status.length > 0) {
      const tickDelta =
        ticksV !== undefined
          ? (parseInt(ticksV) || 0) - (JSON.parse(window._lastStateBeforeSync || '{}').ticks || 0)
          : 1;
      const elapsed = Math.max(1, tickDelta);
      state.status = state.status.filter(eff => {
        if (eff.ticks > 0) {
          const beforeTicks = eff.ticks;
          eff.ticks = Math.max(0, eff.ticks - elapsed);
          if (eff.ticks === 0) {
            // Effect expired — notify Courier
            appendToChat(`> [SYS] STATUS EXPIRED: ${eff.name}`, 'sys', true);
            return false; // Remove from array
          }
          // FEEDBACK ANIMATION WAVE 3 (#29 GUTTERING LAMP): new additive emit
          // (U7 rad.tier crossing-detector precedent) — fires once on the
          // crossing INTO the "expiring soon" window, never every tick while
          // already inside it.
          if (beforeTicks > 2 && eff.ticks > 0 && eff.ticks <= 2) {
            RobcoEvents.emit('effect.expiring', { name: eff.name, ticks: eff.ticks });
          }
        }
        return true;
      });
    }

    // ── FACTION CONSEQUENCE TRIGGERS (#4 / U7) ───────────────────
    // Check if any faction just crossed the Vilified or Idolized threshold and
    // emit through the bus — the chat alert / sound / haptic reaction and the
    // U8 campaign-note are each independent subscribers. Reads getFactionRegistry()
    // (game-agnostic — every faction in the ACTIVE game, not a hand-picked FNV-only
    // key list) instead of a hardcoded faction-key array — the U7 Protocol-38 fix:
    // the old ['ncr','legion','house','bos','boomers','khans'] literal only ever
    // matched FNV keys, so FO3 campaigns never fired a threshold alert at all.
    if (state.factions && typeof expandPanelForCategory === 'function') {
      // WHY -500/750: this crossing-detector is intentionally independent of the
      // FACTION_THRESHOLDS 4x4 standing-label matrix (ui-render-character.js,
      // GECK-sourced bp1/bp2/bp3) — different subsystem, different purpose (a
      // one-time chat/sound/haptic alert here vs. the always-visible standing
      // label there), so it uses its own round-number net thresholds rather
      // than reusing the canonical per-faction breakpoints.
      const VILIFIED_NET = -500;
      const prevFactions = JSON.parse(window._lastStateBeforeSync || '{}').factions || {};
      getFactionRegistry().forEach(f => {
        const cur = state.factions[f.key];
        const prev = prevFactions[f.key];
        if (!cur || !prev) return;
        const curNet = (cur.fame || 0) - (cur.infamy || 0);
        const prevNet = (prev.fame || 0) - (prev.infamy || 0);
        // Crossing into Vilified
        if (prevNet > VILIFIED_NET && curNet <= VILIFIED_NET) {
          RobcoEvents.emit('faction.threshold', {
            key: f.key,
            name: f.name,
            direction: 'vilified',
            curNet,
            prevNet,
          });
          // FEEDBACK ANIMATION WAVE 1 (#14 REPUTATION STAMP) — consumed by
          // renderFactionRep() the next time it paints (Protocol 22).
          _pendingRepStamp = { key: f.key, direction: 'vilified' };
        }
        // Crossing into Idolized
        if (prevNet < 750 && curNet >= 750) {
          RobcoEvents.emit('faction.threshold', {
            key: f.key,
            name: f.name,
            direction: 'idolized',
            curNet,
            prevNet,
          });
          _pendingRepStamp = { key: f.key, direction: 'idolized' };
        }
      });
    }

    // ── LOCATION HISTORY — fog-of-war discovery (deduped, permanent) ──
    // Record both the location being LEFT and the new current into state.locationHistory
    // via the shared state.js helper, so any place that was ever current stays discovered
    // ([VISITED]) on the world map. Routing the AI path through recordLocationVisit() keeps
    // state.locationHistory in lock-step with the manual onLocationChange() path (no desync,
    // no 10-entry truncation that would silently un-discover older locations).
    if (locV !== undefined) {
      recordLocationVisit(JSON.parse(window._lastStateBeforeSync || '{}').loc || '');
      recordLocationVisit(locV);
    }

    // ── GAME CONTEXT (v2.0) ────────────────────────────────────
    // gameContext is NOT AI-settable — game-context changes are user-only via
    // onGameContextChange(). The AI's gameContext field is intentionally ignored
    // here to avoid cross-campaign corruption; do not wire it into state.

    // ── REGISTRY / GAME-CONTEXT TRUST GUARD (Protocol 42 defense-in-depth —
    // planning/AUDIT_registry_leak.md §2/§4) ──────────────────────────────
    // FALLOUT_REGISTRY is a boot-time-only global — index.html's GAME_FILES
    // manifest loads exactly one of reg_nv.js/reg_fo3.js, and every known
    // cross-game load path already reboots before this function can run
    // (commit 2210b57), so registryGame and state.gameContext should never
    // disagree in practice. But nothing previously ASSERTED that invariant:
    // if some future path ever left them mismatched, the five registry-
    // validated fields below would silently empty real player data, because
    // a stale-game registry recognises none of the current campaign's own
    // real names (reproduced in the audit — FO3 collectibles wiped to []
    // against a stale NV registry). A mismatch means the registry is
    // untrustworthy, not that the player's data is invalid — so when one is
    // detected, ONLY those five registry-gated fields (collectibles,
    // lincolnItems, traits, skillBooks, magazines) are skipped this sync,
    // leaving their existing state values untouched. Every other field in
    // this function (lvl/xp/hp/quests/inventory/factions/etc.) is unaffected.
    // `_registryGame` undefined (registry missing its `game` tag, e.g. a
    // stale cached bundle) fails OPEN to the pre-existing behavior — this is
    // additive hardening, not stricter validation for the normal path.
    const _registryGame =
      typeof FALLOUT_REGISTRY !== 'undefined' ? FALLOUT_REGISTRY.game : undefined;
    const _registryTrusted = !_registryGame || _registryGame === (state.gameContext || 'FNV');
    if (!_registryTrusted) {
      console.error(
        `autoImportState: FALLOUT_REGISTRY (${_registryGame}) does not match state.gameContext (${state.gameContext}) — skipping registry-validated fields this sync to avoid dropping real campaign data`
      );
    }

    // ── COLLECTIBLES (v2.0) ──────────────────────────────────
    // Flat array of collected item name strings. Registry defines what names are valid;
    // state only tracks which have been found. DLC collectibles slot in via registry only.
    if (_registryTrusted && parsed.collectibles && Array.isArray(parsed.collectibles)) {
      // ── COLLECTIBLE RECONCILE (AI_OVERSEER Finding 1) — ADD-ONLY ────────────
      // Collectibles are PERMANENT acquisitions — you never un-collect a snow
      // globe. The old `state.collectibles = parsed.collectibles.filter(...)`
      // full-replace let a short/empty AI array wipe them. Now the AI path is
      // ADD-ONLY: a valid new name is unioned in; the AI can never shrink the set
      // by resending a shorter array; a name it OMITS is KEPT. The native toggle
      // is the only removal path.
      const _collectNames =
        typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.collectibles)
          ? new Set(FALLOUT_REGISTRY.collectibles.map(c => c.name))
          : new Set();
      const _collectBefore = new Set((state.collectibles || []).map(n => n.toLowerCase()));
      const _mergedCollect = Array.isArray(state.collectibles) ? state.collectibles.slice() : [];
      const _collectSeen = new Set(_mergedCollect.map(n => String(n).toLowerCase()));
      parsed.collectibles.forEach(c => {
        if (typeof c !== 'string' || !_collectNames.has(c)) return;
        if (_collectSeen.has(c.toLowerCase())) return;
        _collectSeen.add(c.toLowerCase());
        _mergedCollect.push(c);
      });
      state.collectibles = _mergedCollect;
      // FEEDBACK ANIMATION WAVE 1 (#22 EXHIBIT LIGHT-UP) — the SAME
      // collectible.acquired event the native toggleCollectible() emits
      // (ui-render.js), fired only for genuinely NEW names so an AI resend
      // of an already-collected item never replays the animation.
      state.collectibles.forEach(name => {
        if (!_collectBefore.has(name.toLowerCase())) {
          RobcoEvents.emit('collectible.acquired', { name });
          _pendingExhibitLight.push(name);
        }
      });
    }

    // ── LINCOLN MEMORABILIA (FO3 — Phase 6 Task 4) ──────────────────────────
    // Validated map: key must be a registry item name, value must be in fixed vocab.
    // Keeps only recognised pairs — rejects arbitrary AI-injected keys (Protocol 24).
    {
      const raw = _g(parsed, 'lincolnItems');
      if (_registryTrusted && raw && typeof raw === 'object' && !Array.isArray(raw)) {
        // ── LINCOLN RECONCILE (AI_OVERSEER Finding 1) ─────────────────────────
        // Lincoln memorabilia is a durable found/disposition map. The old
        // full-replace (`state.lincolnItems = validated`) let a short/empty AI
        // object drop found items. Now it MERGES: a valid key is added, or its
        // disposition UPDATED in place (found → hannibal/leroy/washington is a
        // legitimate lateral change, not a removal); a key the AI OMITS is KEPT.
        // A key is never dropped by omission.
        const LINCOLN_VOCAB = ['found', 'hannibal', 'leroy', 'washington'];
        const registryNames =
          typeof FALLOUT_REGISTRY !== 'undefined' &&
          Array.isArray(FALLOUT_REGISTRY.lincolnMemorabilia)
            ? new Set(FALLOUT_REGISTRY.lincolnMemorabilia.map(i => i.name))
            : new Set();
        const _mergedLincoln =
          state.lincolnItems &&
          typeof state.lincolnItems === 'object' &&
          !Array.isArray(state.lincolnItems)
            ? Object.assign({}, state.lincolnItems)
            : {};
        Object.keys(raw).forEach(k => {
          const coerced = raw[k] === 'other' ? 'found' : raw[k];
          if (registryNames.has(k) && LINCOLN_VOCAB.includes(coerced)) _mergedLincoln[k] = coerced;
        });
        state.lincolnItems = _mergedLincoln;
      }
    }

    // Validated array: accept only entries matching a registry trait name (FNV); dedup.
    // Rejects arbitrary AI-injected names (Protocol 24).
    // ── TRAIT RECONCILE (AI_OVERSEER Finding 1) — ADD-ONLY ────────────────────
    // Traits are PERMANENT character-creation choices. The old full-replace
    // (`state.traits = raw.filter(...)`) let a short/empty array wipe them. Now the
    // AI path is ADD-ONLY: a valid new trait is unioned in; the AI can never shrink
    // the set; a trait it OMITS is KEPT.
    {
      const raw = _g(parsed, 'traits');
      if (_registryTrusted && Array.isArray(raw)) {
        const traitNames =
          typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.traits)
            ? new Set(FALLOUT_REGISTRY.traits.map(t => t.name))
            : new Set();
        const _mergedTraits = Array.isArray(state.traits) ? state.traits.slice() : [];
        const _seenTraits = new Set(_mergedTraits.map(t => String(t).toLowerCase()));
        raw.forEach(t => {
          if (typeof t !== 'string' || !traitNames.has(t) || _seenTraits.has(t.toLowerCase()))
            return;
          _seenTraits.add(t.toLowerCase());
          _mergedTraits.push(t);
        });
        state.traits = _mergedTraits;
      }
    }

    // Validated array: accept only entries matching a registry skill-book name (both games); dedup.
    // ── SKILL-BOOK RECONCILE (AI_OVERSEER Finding 1) — ADD-ONLY ───────────────
    // Reading a skill book is PERMANENT. Same ADD-ONLY union as traits — a valid
    // new book is added; the AI can never shrink the read set; an OMITTED book is KEPT.
    {
      const raw = _g(parsed, 'skillBooks');
      if (_registryTrusted && Array.isArray(raw)) {
        const bookNames =
          typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.skillBooks)
            ? new Set(FALLOUT_REGISTRY.skillBooks.map(b => b.name))
            : new Set();
        const _mergedBooks = Array.isArray(state.skillBooks) ? state.skillBooks.slice() : [];
        const _seenBooks = new Set(_mergedBooks.map(b => String(b).toLowerCase()));
        raw.forEach(b => {
          if (typeof b !== 'string' || !bookNames.has(b) || _seenBooks.has(b.toLowerCase())) return;
          _seenBooks.add(b.toLowerCase());
          _mergedBooks.push(b);
        });
        state.skillBooks = _mergedBooks;
      }
    }

    // Validated array: accept only entries matching a registry magazine name (FNV only); dedup.
    // ── MAGAZINE RECONCILE (AI_OVERSEER Finding 1) — ADD-ONLY ─────────────────
    // The magazines tracker is collection progress ([n/total], Protocol UI-4) —
    // permanent, like skill books. Same ADD-ONLY union: a valid new magazine is
    // added; the AI can never shrink the set; an OMITTED magazine is KEPT.
    {
      const raw = _g(parsed, 'magazines');
      if (_registryTrusted && Array.isArray(raw)) {
        const magNames =
          typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.magazines)
            ? new Set(FALLOUT_REGISTRY.magazines.map(m => m.name))
            : new Set();
        const _mergedMags = Array.isArray(state.magazines) ? state.magazines.slice() : [];
        const _seenMags = new Set(_mergedMags.map(m => String(m).toLowerCase()));
        raw.forEach(m => {
          if (typeof m !== 'string' || !magNames.has(m) || _seenMags.has(m.toLowerCase())) return;
          _seenMags.add(m.toLowerCase());
          _mergedMags.push(m);
        });
        state.magazines = _mergedMags;
      }
    }

    // ── CAMPAIGN MODE (C4-fix / C11) ───────────────────────────────────
    // Read-only import — player sets this in CAMPG via checkbox; AI never writes it.
    // Guard: only 'rng' and 'rng-locked' are meaningful non-default values.
    const cmV = _g(parsed, 'campaignMode');
    if (cmV === 'rng-locked') state.campaignMode = 'rng-locked';
    else if (cmV === 'rng') state.campaignMode = 'rng';
    else state.campaignMode = 'standard';

    // ── PLAYTHROUGH TYPE (C5) ────────────────────────────────────
    // Read-only import — player sets this in CAMPG via dropdown; AI never writes it.
    // Only file imports and slot loads provide this field; AI responses do not.
    const ptV = _g(parsed, 'playthroughType');
    const _validPT = ['standard', 'minmaxed', 'completionist', 'casual', 'speedrun'];
    if (_validPT.includes(ptV)) state.playthroughType = ptV;

    // mapView — client UI preference; AI never sets this, only file imports / cloud pulls
    const mvV = _g(parsed, 'mapView');
    if (['auto', 'full', 'core'].includes(mvV)) state.mapView = mvV;

    // padBindings (Quick-Draw Holster) — DELIBERATELY NOT MAPPED. Player-authority
    // (Protocol 24): the Courier owns their own quick-slots, never the AI. The sole
    // writer is the native bind flow (_nativePadBind, ui-core.js), reached via the
    // holster UI or a typed [BIND: gear, DIR] — both intercepted in
    // _routeNativeCommand() before Gemini ever sees the input. The parsed field for
    // this key is never read anywhere in this function, so an AI response cannot
    // alter it even if it tried.

    loadUI();
    // AI_OVERSEER Finding 7: the text confirmation is throttled (see _aiSyncCount
    // note at file top) — occasional, not every turn. The sync TONE below still
    // fires every sync as the primary confirmation.
    _aiSyncCount++;
    if (_aiSyncCount === 1 || _aiSyncCount % 6 === 0) {
      appendToChat('> PIP-BOY DATA SYNCED WITH ROBCO MAINFRAME <<', 'sys', true);
    }

    // #33 Sync tone — subtle two-note confirmation after state loads
    if (typeof playSyncTone === 'function') playSyncTone();

    // #31 Auto-expand panels that received updates this sync.
    // AI_OVERSEER Finding 6 (OWNER DIRECTIVE): this pass used to call
    // expandPanelForCategory(cat) with its default tab routing, so any AI state change
    // yanked the view off the terminal to the affected panel — interrupting the
    // conversation the player was actually having. It now passes {navigate:false}: the
    // panel is still EXPANDED (so a player who walks over there manually finds it open,
    // exactly as before), but the tab no longer switches. Each change instead surfaces
    // in place as a card on the terminal, via the same toast the location-change card
    // already uses. Nothing here touches switchTab(), `#go=` deep links, or the bezel
    // nav's own routing — those all still call expandPanelForCategory() with navigation
    // on by default.
    if (typeof expandPanelForCategory === 'function') {
      // Card labels for the array/object categories. Deliberately NOT the panel <h2>
      // titles from expandPanelForCategory()'s own map — that map answers "which board
      // do I open", this answers "what should the player be told just changed", and the
      // two drift independently (a board can be renamed without the announcement
      // changing). Kept here beside the categories it labels.
      const _CARD_LABELS = {
        squad: 'SQUAD UPDATED',
        status: 'STATUS EFFECTS UPDATED',
        inventory: 'INVENTORY UPDATED',
        ammo: 'AMMO UPDATED',
        campaign_notes: 'FIELD NOTES UPDATED',
        perks: 'PERKS UPDATED',
        factions: 'FACTION STANDING UPDATED',
        quests: 'QUESTS UPDATED',
        equipped: 'LOADOUT UPDATED',
        collectibles: 'CURIO ARCHIVE UPDATED',
        lincolnItems: 'LINCOLN ARCHIVE UPDATED',
        traits: 'TRAITS UPDATED',
        skillBooks: 'SKILL BOOKS UPDATED',
      };
      Object.keys(_CARD_LABELS).forEach(cat => {
        const before = JSON.parse(window._lastStateBeforeSync || '{}');
        const bArr = Array.isArray(before[cat])
          ? JSON.stringify(before[cat])
          : JSON.stringify(before[cat] || {});
        const nArr = Array.isArray(state[cat])
          ? JSON.stringify(state[cat])
          : JSON.stringify(state[cat] || {});
        if (bArr === nArr) return;
        expandPanelForCategory(cat, { navigate: false });
        // Skip a category card the scalar DELTA cards already announced with real
        // numbers — "INVENTORY 0→1 ITEMS" is strictly better than "INVENTORY UPDATED".
        const _already = _cardLines.some(l => l.toLowerCase().startsWith(cat.toLowerCase()));
        if (!_already) _cardLines.push(_CARD_LABELS[cat]);
      });
    }

    // Flush every change this sync produced onto the in-place card queue.
    if (_cardLines.length && typeof _syncChangeCardsShow === 'function') {
      _syncChangeCardsShow(_cardLines);
    }

    // Show undo button after every AI sync
    let undoBtn = document.getElementById('undoSyncBtn');
    if (undoBtn) undoBtn.style.display = 'block';
  } catch (e) {
    console.error('Auto-import failed:', jsonString);
  }
}
