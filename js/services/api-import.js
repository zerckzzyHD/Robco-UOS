// ── api-import.js — AI → STATE IMPORT (split from api.js, 2.8.5 U-A3) ──
// sanitizeImportedContainer() (defense-in-depth type coercion for the cloud
// pull / file import fast-paths), _wireApiEventBusSubscribers() (the
// faction.threshold chat-alert/sound/haptic reaction to a crossing this
// file's autoImportState() detects), and autoImportState() itself — the
// AI-JSON-response → state field-mapping path (Protocol 24). Global scope,
// static <script> tag — api*.js family, loads late in the boot chain right
// before cloud.js (see index.html load order).
// EXPOSES: autoImportState(), sanitizeImportedContainer(),
// _wireApiEventBusSubscribers(), _confirmInventoryRemovals().
// GOTCHA: never use recursive key transformation on AI JSON here (Protocol
// 24 / Prohibited Patterns) — every field below is an explicit, named
// mapping (parsed.<key> → state.<key>) with its own type coercion/clamp.
// A generic "flatten and assign" pass would let the AI write arbitrary
// state keys unvalidated; that is exactly what this file exists to prevent.

/* global playQuestCompleteSound, playQuestFailSound, playFactionThresholdSound */
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

// ── INVENTORY REMOVAL CONFIRM GATE (AI_OVERSEER Finding 1) ────────────────────
// The AI's inventory array is a PROPOSAL, never an assignment (autoImportState
// applies additions directly but DEFERS every proposed removal here). This is
// Protocol 34's DNA — "cloud writes are additive; destructive ops are confirm-
// gated" — applied to inventory: a destructive write to the Courier's durable
// items is NEVER silent. Reuses confirmAction() (Protocol 22 — the same diegetic
// confirm the level-up / WIPE flows use). `removals` is [{name, from, to}] where
// `to` is the proposed new quantity (0 = drop the item entirely).
//
// SAFETY DEFAULT: if no confirm surface exists (headless import, an old cached
// client, any context without confirmAction), the items are simply KEPT — the
// removal is dropped, never applied unconfirmed. Keeping an item the AI wanted
// gone is a harmless, user-reversible outcome; silently deleting one is not.
function _confirmInventoryRemovals(removals) {
  if (!Array.isArray(removals) || !removals.length) return;
  if (typeof confirmAction !== 'function') return; // no confirm surface → keep items
  const lines = removals.map(r =>
    r.to <= 0 ? `• ${r.name} ×${r.from} → REMOVED` : `• ${r.name}: qty ${r.from} → ${r.to}`
  );
  confirmAction({
    title: '> DIRECTOR INVENTORY REQUEST',
    warning:
      'The Director wants to take items the Courier is currently carrying:\n' +
      lines.join('\n') +
      '\n\nApprove this removal? Choosing KEEP ITEMS leaves your inventory untouched.',
    confirmLabel: 'APPROVE REMOVAL',
    cancelLabel: 'KEEP ITEMS',
  }).then(ok => {
    if (!ok) return; // Courier declined — items retained, nothing written
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
    // The removed item may have been equipped — clear any now-dangling slot
    // through the ONE shared reconciler (Protocol 22), then persist + repaint.
    if (typeof reconcileEquipped === 'function') reconcileEquipped(state);
    if (typeof saveState === 'function') saveState();
    if (typeof loadUI === 'function') loadUI();
    if (typeof appendToChat === 'function')
      appendToChat('> [INVENTORY] Director-requested removal applied.', 'sys', true);
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
      // FEEDBACK ANIMATION WAVE 3 (#28 TUNGSTEN WARM-UP): captured BEFORE the
      // wholesale AI overwrite below (the item.added/#18 AI-path precedent) so
      // an AI turn that resends the SAME status array unchanged never replays
      // the animation for effects the player already had.
      const _statusNamesBefore = new Set(
        (state.status || []).map(e => String(e.name).toLowerCase())
      );
      state.status = st.map(item => {
        if (typeof item === 'string') return { name: item, ticks: 0, type: 'BUFF' };
        return {
          name: item.name || 'Unknown',
          ticks: parseInt(item.ticks) || 0,
          type: ['BUFF', 'DEBUFF', 'NEUTRAL'].includes(String(item.type || '').toUpperCase())
            ? String(item.type).toUpperCase()
            : 'BUFF',
        };
      });
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
      state.squad = parsed.squad.map(m => ({
        name: String(m.name || ''),
        hp: parseInt(m.hp) || 0,
        hpMax: parseInt(m.hpMax) || 100,
        ammo: parseInt(m.ammo) || 0,
        condition: String(m.condition || 'Good'),
        weapon: m.weapon ? String(m.weapon) : null,
        dt: m.dt !== undefined ? parseInt(m.dt) || 0 : undefined,
        affinity: m.affinity !== undefined ? parseInt(m.affinity) || 0 : undefined,
      }));
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
      state.perks = parsed.perks.map(p => ({
        name: p.name || 'Unknown',
        rank: parseInt(p.rank) || 1,
        level_taken: parseInt(p.level_taken) || 0,
      }));
    }

    // Quest Log (#1)
    if (parsed.quests && Array.isArray(parsed.quests)) {
      const questsBefore = JSON.parse(window._lastStateBeforeSync || '{}').quests || [];
      state.quests = parsed.quests.map(q => ({
        name: q.name || 'Unknown',
        status: (() => {
          const s = (q.status || '').toLowerCase();
          return ['active', 'complete', 'failed'].includes(s) ? s : 'active';
        })(),
        objective: q.objective || null,
        factions: q.factions || null,
      }));
      // Auto-log quest status changes + audio feedback
      state.quests.forEach(curr => {
        const prev = questsBefore.find(bq => bq.name.toLowerCase() === curr.name.toLowerCase());
        if (prev && prev.status !== curr.status) {
          _logEvent('quest', `Quest: "${curr.name}" → ${curr.status.toUpperCase()}`);
          // Quest audio — fire appropriate tone on terminal
          const newStatus = curr.status.toUpperCase();
          if (
            (newStatus === 'COMPLETED' || newStatus === 'COMPLETE') &&
            typeof playQuestCompleteSound === 'function'
          ) {
            playQuestCompleteSound();
          } else if (newStatus === 'FAILED' && typeof playQuestFailSound === 'function') {
            playQuestFailSound();
          }
          // FEEDBACK ANIMATION WAVE 1 (#23 CASE-CLOSED STAMP / #24 FILAMENT
          // DIE) — the SAME quest.status event the native cycleQuestStatus()
          // emits (ui-render.js), so the annunciator/home animation react
          // identically to an AI-driven status change (Protocol 22).
          if (curr.status === 'complete' || curr.status === 'failed') {
            RobcoEvents.emit('quest.status', {
              name: curr.name,
              status: curr.status,
              prevStatus: prev.status,
            });
            _pendingQuestStamp = { name: curr.name, status: curr.status };
          }
        }
      });
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

    // Ammo tracking — object mapping ammo type to count
    if (parsed.ammo && typeof parsed.ammo === 'object' && !Array.isArray(parsed.ammo)) {
      state.ammo = parsed.ammo;
    }

    // ── STATE DIFF DISPLAY (shows what changed this sync) ────────────────────
    if (window._lastStateBeforeSync) {
      try {
        const before = JSON.parse(window._lastStateBeforeSync);
        let changes = [];
        ['lvl', 'xp', 'hpCur', 'hpMax', 'caps', 'rads', 'karma', 'ticks'].forEach(k => {
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
      const _collectNames =
        typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.collectibles)
          ? new Set(FALLOUT_REGISTRY.collectibles.map(c => c.name))
          : new Set();
      const _collectBefore = new Set((state.collectibles || []).map(n => n.toLowerCase()));
      const _collectSeen = new Set();
      state.collectibles = parsed.collectibles.filter(c => {
        if (typeof c !== 'string' || !_collectNames.has(c) || _collectSeen.has(c)) return false;
        _collectSeen.add(c);
        return true;
      });
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
        const LINCOLN_VOCAB = ['found', 'hannibal', 'leroy', 'washington'];
        const registryNames =
          typeof FALLOUT_REGISTRY !== 'undefined' &&
          Array.isArray(FALLOUT_REGISTRY.lincolnMemorabilia)
            ? new Set(FALLOUT_REGISTRY.lincolnMemorabilia.map(i => i.name))
            : new Set();
        const validated = {};
        Object.keys(raw).forEach(k => {
          const coerced = raw[k] === 'other' ? 'found' : raw[k];
          if (registryNames.has(k) && LINCOLN_VOCAB.includes(coerced)) validated[k] = coerced;
        });
        state.lincolnItems = validated;
      }
    }

    // Validated array: accept only entries matching a registry trait name (FNV); dedup.
    // Rejects arbitrary AI-injected names (Protocol 24).
    {
      const raw = _g(parsed, 'traits');
      if (_registryTrusted && Array.isArray(raw)) {
        const traitNames =
          typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.traits)
            ? new Set(FALLOUT_REGISTRY.traits.map(t => t.name))
            : new Set();
        const seen = new Set();
        state.traits = raw.filter(t => {
          if (typeof t !== 'string' || !traitNames.has(t) || seen.has(t)) return false;
          seen.add(t);
          return true;
        });
      }
    }

    // Validated array: accept only entries matching a registry skill-book name (both games); dedup.
    {
      const raw = _g(parsed, 'skillBooks');
      if (_registryTrusted && Array.isArray(raw)) {
        const bookNames =
          typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.skillBooks)
            ? new Set(FALLOUT_REGISTRY.skillBooks.map(b => b.name))
            : new Set();
        const seen = new Set();
        state.skillBooks = raw.filter(b => {
          if (typeof b !== 'string' || !bookNames.has(b) || seen.has(b)) return false;
          seen.add(b);
          return true;
        });
      }
    }

    // Validated array: accept only entries matching a registry magazine name (FNV only); dedup.
    {
      const raw = _g(parsed, 'magazines');
      if (_registryTrusted && Array.isArray(raw)) {
        const magNames =
          typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.magazines)
            ? new Set(FALLOUT_REGISTRY.magazines.map(m => m.name))
            : new Set();
        const seen = new Set();
        state.magazines = raw.filter(m => {
          if (typeof m !== 'string' || !magNames.has(m) || seen.has(m)) return false;
          seen.add(m);
          return true;
        });
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
    appendToChat('> PIP-BOY DATA SYNCED WITH ROBCO MAINFRAME <<', 'sys', true);

    // #33 Sync tone — subtle two-note confirmation after state loads
    if (typeof playSyncTone === 'function') playSyncTone();

    // #31 Auto-expand panels that received updates this sync
    if (typeof expandPanelForCategory === 'function') {
      [
        'squad',
        'status',
        'inventory',
        'ammo',
        'campaign_notes',
        'perks',
        'factions',
        'quests',
        'equipped',
        'collectibles', // v2.0
        'lincolnItems', // Phase 6 Task 4
        'traits', // Phase 6 Task 5
        'skillBooks', // Phase 6 Task 6
      ].forEach(cat => {
        const before = JSON.parse(window._lastStateBeforeSync || '{}');
        const bArr = Array.isArray(before[cat])
          ? JSON.stringify(before[cat])
          : JSON.stringify(before[cat] || {});
        const nArr = Array.isArray(state[cat])
          ? JSON.stringify(state[cat])
          : JSON.stringify(state[cat] || {});
        if (bArr !== nArr) expandPanelForCategory(cat);
      });
    }

    // Show undo button after every AI sync
    let undoBtn = document.getElementById('undoSyncBtn');
    if (undoBtn) undoBtn.style.display = 'block';
  } catch (e) {
    console.error('Auto-import failed:', jsonString);
  }
}
