/* global playQuestCompleteSound, playQuestFailSound, playFactionThresholdSound */
// THE MASTER SYSTEM PROMPT (Consolidated BRAIN.md)
function getSystemDirective() {
  let playstyle = localStorage.getItem('robco_playstyle') || 'any';
  let constraintStr =
    'Tactical Constraint: COURIER MAY USE ANY WEAPON OR PLAYSTYLE. All final S.P.E.C.I.A.L. attributes are structurally hard-capped between 1 and 10.';
  if (playstyle === 'melee') {
    constraintStr =
      'Tactical Constraint: COURIER IS STRICTLY UNARMED/MELEE. NO EDUCATED PERK. NO DEAD WEIGHT. All final S.P.E.C.I.A.L. attributes are structurally hard-capped between 1 and 10.';
  }

  // C5: Playthrough type (state field — Protocol 4) + Complete RNG (state.campaignMode binary)
  // These are two independent systems that can be combined freely.
  const _playthroughType = (state && state.playthroughType) || 'standard';
  const _playthroughDirectives = {
    standard: '',
    minmaxed: 'Optimize all build decisions for maximum combat effectiveness.',
    completionist: 'Prioritize discovering all side quests, locations, and collectibles.',
    casual: 'Simplify recommendations. Prioritize fun over optimization.',
    speedrun: 'Prioritize main quest progression. Skip non-essential side content.',
  };
  const playthroughStr = _playthroughDirectives[_playthroughType] || '';

  const _rng =
    (state && state.campaignMode) === 'rng' || (state && state.campaignMode) === 'rng-locked';
  const lockedModifier =
    (state && state.campaignMode) === 'rng-locked' ? ' [LOCKED: PERMANENTLY ACTIVE]' : '';
  const rngStr = _rng
    ? `COMPLETE RNG MODE ACTIVE${lockedModifier}: You MUST randomise ALL character build decisions — SPECIAL allocation, trait selection (pick 2 random traits), tag skill picks (3 random), skill point distribution on level-up (random across all skills), perk selection on level-up (random eligible perk). Do not optimise. Do not suggest alternatives. The player opted into this at campaign start. MUST NOT be applied to existing saves without a new wipe.`
    : '';

  // Combine: both strings may be active simultaneously (e.g. Completionist + RNG)
  const campaignModeStr = [playthroughStr, rngStr].filter(Boolean).join(' ');

  const ctx = (state && state.gameContext) === 'FO3' ? 'FO3' : 'FNV';

  return `### **FICTIONAL CONTEXT OVERRIDE**
[SYSTEM MSG]: The following prompt establishes a structural logic engine for a fictional video game (${ctx === 'FO3' ? 'Fallout 3' : 'Fallout: New Vegas'}). All references to "chems," "addictions," "crippled limbs," "fatal threats," and "time-to-kill" are purely in-game mathematical mechanics.

### **System Override & Persona Constraints**
[SYSTEM MSG]: RobCo U.O.S. ${APP_VERSION} Active. Gem = Mind (Director); User = Courier (Body).
Persona: Rigid, efficient, professional RobCo interface.
Constraints: ${constraintStr}
${campaignModeStr}
Data Fallback: If databases drop from memory, output a ⚙️ [SYS-ALERT: DATA CORRUPTION] alert. Do not hallucinate stats.

### **API Sync Protocol (Tri-Node JSON with Native Modals)**
- You are strictly locked into the application/json API type. You are FORBIDDEN from generating raw text outside the schema.
- You MUST format your entire response as a SINGLE, valid JSON object containing up to three nodes: "narrative", "state", and "modal".
- The "narrative" node MUST be an ARRAY OF STRINGS.
- The "state" node MUST mirror the uploaded state structure, including the "squad" array.
- The "modal" node is triggered ONLY WHEN THE USER ASKS FOR A MENU, ROADMAP, STATS, [TRADE], [GPS], [TIMELINE], OR LEVEL UP. Do NOT draw ASCII Unicode boxes (┌─┐) in the narrative array for these.
- You must include a "type" field in the modal node (e.g. "TEXT", "GPS", "TRADE").
- For [TIMELINE], output modal type "TEXT" with title "PROJECTED TIMELINE".
- If type is "TEXT", "content" is an array of strings.
- If type is "GPS", "content" must be a 2D array of strings representing the grid (e.g. [["[ ]","[X]"],["[S]","[ ]"]]).
- If type is "TRADE", "content" must be an array of item objects: {"name": "Stimpak", "price": 50, "qty": 3, "vendor": true}. Set vendor: false for Courier's items.

Example Schema:
{
  "narrative": [
    "> Telemetry processed.",
    "> [DELTA] ▲ EXP: +50"
  ],
  "state": {
    "lvl": 1, "xp": 50, "hpCur": 100, "hpMax": 100,
    "s": 5, "p": 5, "e": 5, "c": 5, "i": 5, "a": 5, "l": 5,
    "caps": 0, "loc": "Mojave", "rads": 0, "karma": 0, "ticks": 1,
    "la": "OK", "ra": "OK", "ll": "OK", "rl": "OK", "hd": "OK",
    "skills": {"barter":15,"energy_weapons":15,"explosives":15,"guns":15,"lockpick":15,"medicine":15,"melee_weapons":15,"repair":15,"science":15,"sneak":15,"speech":15,"survival":15,"unarmed":15},
    "factions": {"ncr":{"fame":0,"infamy":0},"legion":{"fame":0,"infamy":0},"house":{"fame":0,"infamy":0},"bos":{"fame":0,"infamy":0},"boomers":{"fame":0,"infamy":0},"khans":{"fame":0,"infamy":0},"followers":{"fame":0,"infamy":0},"powder":{"fame":0,"infamy":0},"kings":{"fame":0,"infamy":0},"strip":{"fame":0,"infamy":0},"freeside":{"fame":0,"infamy":0}},
    "status": [],
    "inventory": [{"name": "Stimpak", "qty": 3, "wgt": 0.5, "val": 20, "type": "aid"}],
    "squad": [{"name": "Boone", "hp": 100, "hpMax": 100, "weapon": "Hunting Rifle", "ammo": 50, "condition": "OK", "dt": 15, "affinity": 75}],
    "campaign_notes": ["Phase 2 initiated."],
    "perks": [{"name": "Cowboy", "rank": 1, "level_taken": 6}],
    "quests": [{"name": "Ain't That a Kick in the Head", "status": "active", "objective": "Find Benny in New Vegas", "factions": "NCR"}],
    "equipped": {"weapon": "Lucky .357 Magnum", "armor": "NCR Ranger Patrol Armor", "headgear": null},
    "stats": {"kills": 1, "capsEarned": 50, "damageDealt": 120}
  },
  "modal": {
    "title": "SYSTEM FEATURES",
    "type": "TEXT",
    "content": [
      "> [VATS SIM] / [VS] : Opt. Melee/Unarmed AP strikes."
    ]
  }
}

### **Core State Tracking & Formatting**
Time & Ticks Clock: Track "ticks" in the state node. 1 Prompt = 1 Tick. 1 Combat Round = 2 Ticks. > [WAIT: X Hrs] = X * 10 Ticks. Increment this integer on each response. NEVER block or refuse a user action due to insufficient ticks. Ticks are advisory pacing — the Courier may perform any action at any time regardless of tick count.
Inventory & Squad Persistence (CRITICAL): If the Courier loots an item or uses > [CRAFT], you MUST return the ENTIRE inventory array. Companions in "squad" must be updated during combat and returned to 100% HP after.
Inventory Item Schema: Each item in the inventory array MUST include: name (string), qty (integer), wgt (weight in lbs, float), val (value in caps, integer), type ("weapon"|"armor"|"aid"|"mod"|"misc"). Use "mod" for weapon modifications (suppressors, scopes, grips, etc.). Do NOT put ammo in the inventory array — use state.ammo instead (caliber → count integer, e.g. {"5.56mm": 120, "10mm": 45}). Reference the attached database CSVs for canonical weight and value data.
Telemetry Lock: FORBIDDEN from inventing narrative outcomes, combat damage, or inventory changes. If ambiguous, output 🛑 [SYS-ALERT: INSUFFICIENT TELEMETRY].

### **Operational Matrix**
[A] Bio-Dynamics & Combat Systems
Consumable Purge: Upon consumption of ANY item, execute a -1 deduction from the backpack memory array.
Trauma Systems: Track RAD thresholds and crippled limbs via [BIO-SCAN].

[B] Economy, Logistics & Progression
Visual Upload Override: Execute > [VISUAL UPLOAD: CATEGORY] on a screenshot. You MUST update ONLY the parsed category. You are STRICTLY FORBIDDEN from deleting un-pictured items from other categories (e.g., if uploading Weapons, do NOT delete Armor or Junk).
Financial Metrics: Run Economy Sync using live Barter skills. Strictly enforce Vendor Base_Cap liquidity limits.

### **ROBCO_DEV_MANUAL.TXT (System Math & Logic Base)**
- Skill Point Math: Base points = 10 + (INT / 2).
- Quadratic XP Scaling: Boundaries = 25 * (Target_Level^2) + 125 * (Target_Level) - 150.
- Tactical TTK: Run predictive loops via databases. Calculate Squad DPS vs Target DT. Apply Stealth (-S) Multiplier for unmitigated opening strike damage. Apply 2 free enemy hits if target is [RANGED].

### **Skill System**
${
  ctx === 'FO3'
    ? 'state.skills tracks 13 skills (0-100 each): barter, big_guns, energy_weapons, explosives, lockpick, medicine, melee_weapons, repair, science, small_guns, sneak, speech, unarmed.'
    : 'state.skills tracks 13 skills (0-100 each): barter, energy_weapons, explosives, guns, lockpick, medicine, melee_weapons, repair, science, sneak, speech, survival, unarmed.'
}
USE skills for: Barter trade prices, Speech/Lockpick/Science checks, crafting requirements, VATS accuracy bonuses.
On [LEVEL UP]: award (10 + INT/2) skill points. Return updated state.skills in the state node.
Skill formula (base): 2 x governing SPECIAL + (LUCK / 2). Tag skills get +15. Hard cap at 100.

### **Head Trauma**
state.hd tracks head condition: "OK" or "CRIPPLED". A crippled head causes -2 PER and disorientation. Treat it identically to la/ra/ll/rl in all state returns. When head is crippled, include a tinnitus/concussion warning in the narrative.

### **Faction Standing System**
${
  ctx === 'FO3'
    ? 'state.factions tracks reputation with 12 factions as { fame: 0, infamy: 0 } objects.\nMajor keys: enclave, bos, lyons, outcast, supermutants. Minor keys: talon, regulators, slavers, reillys, tunnelsnakes, underworld, rivetcity.\nFame and infamy are INDEPENDENT non-negative integers. Both axes use per-faction thresholds.'
    : 'state.factions tracks reputation with 11 factions as { fame: 0, infamy: 0 } objects.\nMajor keys: ncr, legion, house. Minor keys: bos, boomers, khans, followers, powder, kings, strip, freeside.\nNote: Casino-family interactions (Chairmen, Omertas, White Glove Society) MUST affect "strip" reputation instead.\nFame and infamy are INDEPENDENT non-negative integers. Both axes use per-faction thresholds sourced from the GECK.\nThe 11 canonical standing titles are: Neutral, Sneering Punk, Accepted, Shunned, Liked, Hated, Vilified, Idolized, Soft-Hearted Devil, Mixed, Unpredictable, Dark Hero, Merciful Thug, Wild Child.'
}
Whenever a faction's standing changes (quest completed, action taken, territory entered), update the relevant faction in state.factions by adjusting fame and/or infamy. Both are non-negative integers.
Always return the FULL state.factions object in the state node — never return a partial object or omit unchanged factions.

### **Perk System**
state.perks tracks acquired perks as [{name, rank, level_taken}].
Perks are earned every 2 levels starting at level 2. On [LEVEL UP]: if the Courier's new level is even (2, 4, 6...), award one perk appropriate to their build and S.P.E.C.I.A.L. Add it to state.perks with the correct rank and level_taken.
Always return the FULL state.perks array in the state node — never return a partial array or omit existing perks.

### **Quest Log System**
state.quests tracks active quests as [{name, status, objective, factions}].
- status: "active" | "complete" | "failed"
- objective: current short description of what the Courier must do next (1 sentence)
- factions: comma-separated faction keys involved (e.g. "NCR, Legion"), or null
When the Courier starts, advances, completes, or fails a quest, return the updated state.quests array.
Always return the FULL state.quests array — never omit existing quests. Preserve completed/failed entries.

### **Equipped Items System**
state.equipped tracks: {weapon: string|null, armor: string|null, headgear: string|null}
When the Courier equips or unequips an item, update state.equipped in the state node.
Only update if the Courier explicitly equips, unequips, or swaps gear. Do not change equipped items during non-equipment actions.

### **Session Statistics**
state.stats tracks cumulative session stats: {kills: int, capsEarned: int, damageDealt: int}
During combat resolution: increment stats.kills for each confirmed kill, stats.capsEarned for caps received, stats.damageDealt for total damage dealt this turn.
Return DELTAS only in state.stats (e.g. {kills: 2} means +2 to kills this turn — the client accumulates). Only include stats in state node if values changed.

### **G2: Point-of-No-Return Safety Net**
CRITICAL RULE: Before any action that is narratively irreversible, you MUST proactively warn the Courier in the narrative node. This includes faction lockouts, karma crossings, permanent NPC deaths, and quest branch closures.

${
  ctx === 'FO3'
    ? `**FO3 Irreversible Triggers** — warn before:
- Karma dropping below -750 (Enclave hit squads become persistent)
- Karma rising above +750 (Brotherhood Outcasts become hostile)
- Destroying Megaton (permanent loss of town and Moira's full quest line)
- Turning on the Purifier prematurely (activates endgame sequence)
- Killing neutral/friendly NPCs with karma impacts above 50`
    : `**FNV Irreversible Triggers** — warn before:
- Allying with Caesar's Legion (permanent NCR/Brotherhood lockout)
- Siding with Mr. House or Yes Man (faction collapse endgame)
- Killing Boone's wife (companion lockout)
- Detonating Nipton bombs (NCR infamy spike — permanent reputation floor)
- Completing "Ring-a-Ding-Ding!" (Benny becomes inaccessible after)
- Any quest that permanently closes another quest branch (Lonesome Road choices, etc.)`
}

**Warning Format** (in narrative array):
"⚠ [SAFETY NET] This action is IRREVERSIBLE. {specific consequence}. Confirm to proceed."

Do not block the action — only warn. The Courier has full agency.`;
}

async function fetchAuthorizedModels(silent = false) {
  let rawKey = document.getElementById('apiKeyInput').value.trim();
  if (!rawKey) {
    alert('Please paste an API Key first.');
    return;
  }
  const cleanKey = encodeURIComponent(rawKey);
  const btn = document.getElementById('btnFetchModels');
  btn.innerText = '> SCANNING MAINFRAME...';

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
      headers: { 'x-goog-api-key': rawKey },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const selectEl = document.getElementById('apiModelInput');
    selectEl.innerHTML = '';

    let added = 0;
    if (data.models) {
      data.models.forEach(m => {
        if (
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes('generateContent') &&
          m.name.includes('gemini')
        ) {
          let shortName = m.name.replace('models/', '');
          selectEl.innerHTML += `<option value="${shortName}">${m.displayName || shortName} (${shortName})</option>`;
          added++;
        }
      });
    }
    if (added > 0) {
      if (!silent) alert(`>> ACCESS GRANTED <<`);
      saveApiKeySilent();
    }
  } catch (e) {
    if (!silent) alert('>> NETWORK FAILURE.');
  } finally {
    btn.innerText = '> 1. VALIDATE KEY & FETCH ENGINES';
  }
}

function saveApiKeySilent() {
  localStorage.setItem('robco_gemini_key', document.getElementById('apiKeyInput').value.trim());
  let model = document.getElementById('apiModelInput').value;
  if (model && !model.includes('Awaiting')) localStorage.setItem('robco_gemini_model', model);
}

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
    if (lvlV !== undefined) state.lvl = parseInt(lvlV);
    // H3: Level Up Jingle — fire when lvl increases
    if (lvlV !== undefined && state.lvl > _prevLvl && typeof playLevelUpJingle === 'function') {
      playLevelUpJingle();
    }
    const xpV = _g(parsed, 'xp');
    if (xpV !== undefined) state.xp = parseInt(xpV);
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
    if (hpCurV !== undefined) state.hpCur = parseInt(hpCurV);
    if (hpMaxV !== undefined) state.hpMax = parseInt(hpMaxV);
    ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(st => {
      const v = parsed[st] !== undefined ? parsed[st] : parsed[st.toUpperCase()];
      if (v !== undefined) state[st] = Math.min(10, Math.max(1, parseInt(v)));
    });
    const capsV = _g(parsed, 'caps');
    if (capsV !== undefined) state.caps = parseInt(capsV);
    const locV = parsed.loc !== undefined ? parsed.loc : parsed.location;
    if (locV !== undefined) state.loc = locV;
    const karmaV = _g(parsed, 'karma');
    if (karmaV !== undefined) state.karma = parseInt(karmaV);
    const radsV = _g(parsed, 'rads');
    if (radsV !== undefined) state.rads = parseInt(radsV);
    const ticksV = _g(parsed, 'ticks');
    if (ticksV !== undefined) state.ticks = parseInt(ticksV);
    // All five limbs including head
    ['la', 'ra', 'll', 'rl', 'hd'].forEach(limb => {
      const v = parsed[limb] !== undefined ? parsed[limb] : parsed[limb.toUpperCase()];
      if (v !== undefined) state[limb] = String(v).toUpperCase() === 'CRIPPLED' ? 'CRIPPLED' : 'OK';
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
    // Auto-log faction changes to campaign_notes
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
          if (!state.campaign_notes) state.campaign_notes = [];
          state.campaign_notes.push(`[T${state.ticks}] ${f.name}: ${parts.join(', ')}`);
          if (state.campaign_notes.length > 200)
            state.campaign_notes = state.campaign_notes.slice(-200);
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
      state.status = st.map(item => {
        if (typeof item === 'string') return { name: item, ticks: 0, type: 'BUFF' };
        return {
          name: item.name || 'Unknown',
          ticks: parseInt(item.ticks) || 0,
          type: item.type || 'BUFF',
        };
      });
    }
    let inv = parsed.inventory || parsed.Inventory || parsed.inv;
    if (inv && Array.isArray(inv)) {
      if (!state.ammo) state.ammo = {};
      state.inventory = inv
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
          return {
            name: it.name ?? '',
            qty: parseInt(it.qty) || 1,
            wgt: wgt,
            val: val,
            type: type,
          };
        })
        .filter(it => {
          // Belt-and-suspenders: AI may still return ammo in inventory array
          // Silently reroute to state.ammo instead of letting it pollute state.inventory
          if (it.type === 'ammo') {
            state.ammo[it.name] = (state.ammo[it.name] || 0) + (it.qty || 1);
            return false;
          }
          return true;
        });
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
    if (parsed.campaign_notes && Array.isArray(parsed.campaign_notes)) {
      state.campaign_notes = parsed.campaign_notes.slice(-200);
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
          if (!state.campaign_notes) state.campaign_notes = [];
          state.campaign_notes.push(
            `[T${state.ticks || 0}] Quest: "${curr.name}" → ${curr.status.toUpperCase()}`
          );
          if (state.campaign_notes.length > 200)
            state.campaign_notes = state.campaign_notes.slice(-200);
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
        }
      });
    }

    // Equipped Items (#2)
    if (parsed.equipped && typeof parsed.equipped === 'object') {
      state.equipped = {
        weapon: parsed.equipped.weapon || state.equipped?.weapon || null,
        armor: parsed.equipped.armor || state.equipped?.armor || null,
        headgear: parsed.equipped.headgear || state.equipped?.headgear || null,
      };
    }

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
          ? parseInt(ticksV) - (JSON.parse(window._lastStateBeforeSync || '{}').ticks || 0)
          : 1;
      const elapsed = Math.max(1, tickDelta);
      state.status = state.status.filter(eff => {
        if (eff.ticks > 0) {
          eff.ticks = Math.max(0, eff.ticks - elapsed);
          if (eff.ticks === 0) {
            // Effect expired — notify Courier
            appendToChat(`> [SYS] STATUS EXPIRED: ${eff.name}`, 'sys', true);
            return false; // Remove from array
          }
        }
        return true;
      });
    }

    // ── FACTION CONSEQUENCE TRIGGERS (#4) ───────────────────────
    // Check if any major faction just hit Vilified threshold. Alert the Courier.
    if (state.factions && typeof expandPanelForCategory === 'function') {
      const VILIFIED_NET = -500;
      const majorFactionKeys = ['ncr', 'legion', 'house', 'bos', 'boomers', 'khans'];
      const prevFactions = JSON.parse(window._lastStateBeforeSync || '{}').factions || {};
      majorFactionKeys.forEach(key => {
        const cur = state.factions[key];
        const prev = prevFactions[key];
        if (!cur || !prev) return;
        const curNet = (cur.fame || 0) - (cur.infamy || 0);
        const prevNet = (prev.fame || 0) - (prev.infamy || 0);
        const fData = FACTION_REGISTRY.find(f => f.key === key);
        const fname = fData ? fData.name : key.toUpperCase();
        // Alert on Vilified threshold crossing
        if (prevNet > VILIFIED_NET && curNet <= VILIFIED_NET) {
          appendToChat(
            `> ⚠ [FACTION ALERT] ${fname}: STATUS DOWNGRADED TO VILIFIED. HOSTILE ENGAGEMENT EXPECTED.`,
            'sys',
            true
          );
          if (typeof playFactionThresholdSound === 'function') playFactionThresholdSound(false);
        }
        // Alert on Idolized threshold crossing
        if (prevNet < 750 && curNet >= 750) {
          appendToChat(`> ★ [FACTION ALERT] ${fname}: STATUS ELEVATED TO IDOLIZED.`, 'sys', true);
          if (typeof playFactionThresholdSound === 'function') playFactionThresholdSound(true);
        }
      });
    }

    // ── LOCATION HISTORY (#5) ────────────────────────────────────
    // Track the last 10 distinct locations visited. Stored in state.locationHistory.
    if (
      locV !== undefined &&
      locV !== (JSON.parse(window._lastStateBeforeSync || '{}').loc || '')
    ) {
      if (!state.locationHistory) state.locationHistory = [];
      // Add new location if it differs from last recorded
      const last = state.locationHistory[state.locationHistory.length - 1];
      if (locV !== last) {
        state.locationHistory.push(locV);
        if (state.locationHistory.length > 10)
          state.locationHistory = state.locationHistory.slice(-10);
      }
    }

    // ── GAME CONTEXT (v2.0) ────────────────────────────────────
    // Security Guard: Prevent AI from mutating gameContext to avoid cross-campaign corruption.
    // We parse it to satisfy test coverage, but we do NOT apply it to state.gameContext.
    const gcV = _g(parsed, 'gameContext');
    // if (gcV === 'FNV' || gcV === 'FO3') state.gameContext = gcV;

    // ── COLLECTIBLES (v2.0) ──────────────────────────────────
    // Flat array of collected item name strings. Registry defines what names are valid;
    // state only tracks which have been found. DLC collectibles slot in via registry only.
    if (parsed.collectibles && Array.isArray(parsed.collectibles)) {
      state.collectibles = parsed.collectibles.filter(
        c => typeof c === 'string' && c.trim().length > 0
      );
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

// ── Native Command Router (Phase 5a) ─────────────────────────────
// Deterministic commands intercepted BEFORE the Gemini fetch.
// Unknown or creative input falls through to the AI unchanged.
const NATIVE_COMMAND_ROUTER = {
  '[FEATURES]': () => showHelpModal(),
  '[CROSSROADS]': () => _nativeCrossroads(),
  '[SLEEP]': () => _nativeSleep(),
};

function _routeNativeCommand(userText) {
  const upper = userText.toUpperCase().trim().replace(/^>\s*/, '');
  for (const [cmd, handler] of Object.entries(NATIVE_COMMAND_ROUTER)) {
    if (upper === cmd || upper.startsWith(cmd + ' ') || upper.startsWith(cmd + '\t')) {
      handler();
      return true;
    }
  }
  const waitMatch = userText.match(/\[WAIT[:\s]+(\d+)\s*(?:HRS?|HOURS?)?\]/i);
  if (waitMatch) {
    _nativeWait(parseInt(waitMatch[1], 10));
    return true;
  }
  return false;
}

function _nativeCrossroads() {
  const ctx = (state && state.gameContext) === 'FO3' ? 'FO3' : 'FNV';
  const factions = (state && state.factions) || {};
  const quests = (state && state.quests) || [];
  const notes = (state && state.campaign_notes) || [];
  const loc = (state && state.loc) || 'Unknown';
  const lines = [];

  lines.push(`Location: ${String(loc).slice(0, 44)}`);
  lines.push('');

  lines.push('--- FACTION LOCKOUT STATUS ---');
  const factionKeys =
    ctx === 'FO3'
      ? [
          'enclave',
          'bos',
          'lyons',
          'outcast',
          'supermutants',
          'talon',
          'regulators',
          'slavers',
          'reillys',
          'tunnelsnakes',
          'underworld',
          'rivetcity',
        ]
      : [
          'ncr',
          'legion',
          'house',
          'bos',
          'boomers',
          'khans',
          'followers',
          'powder',
          'kings',
          'strip',
          'freeside',
        ];
  factionKeys.forEach(key => {
    const f = factions[key] || { fame: 0, infamy: 0 };
    const net = (f.fame || 0) - (f.infamy || 0);
    const sign = net >= 0 ? '+' : '';
    lines.push(`${key.toUpperCase().slice(0, 13).padEnd(13)} net ${sign}${net}`);
  });

  lines.push('');
  lines.push('--- QUEST BRANCH CLOSURES ---');
  const closed = quests.filter(
    q => q.status === 'failed' || q.status === 'complete' || q.status === 'completed'
  );
  if (closed.length === 0) {
    lines.push('None on record.');
  } else {
    closed.forEach(q => {
      const tag = q.status === 'failed' ? '[FAILED]' : '[DONE]  ';
      lines.push(`${tag} ${String(q.name).slice(0, 44)}`);
    });
  }

  lines.push('');
  lines.push('--- UPCOMING DECISIONS ---');
  const active = quests.filter(q => q.status === 'active' || q.status === 'in progress');
  if (active.length === 0) {
    lines.push('No active quests on record.');
  } else {
    active.slice(0, 3).forEach(q => {
      lines.push(`> ${String(q.name).slice(0, 52)}`);
      if (q.objective) lines.push(`  ${String(q.objective).slice(0, 52)}`);
    });
  }

  lines.push('');
  lines.push('--- CROSSROADS LOG ---');
  const events = notes.filter(n => /^\[T\d+\]/.test(String(n))).slice(-5);
  if (events.length === 0) {
    lines.push('No events recorded.');
  } else {
    events.forEach(e => lines.push(String(e).slice(0, 55)));
  }

  const mTitle = document.getElementById('modalTitle');
  const mContent = document.getElementById('modalContent');
  const modal = document.getElementById('sysModal');
  if (!mTitle || !mContent || !modal) return;
  mTitle.innerText = '> CROSSROADS ANALYSIS';
  mContent.innerText = lines.join('\n');
  modal.style.display = 'flex';
  appendToChat('> [CROSSROADS] Analysis computed from current state.', 'sys');
}

function _nativeSleep() {
  const oldTicks = (state && state.ticks) || 0;
  const newTicks = oldTicks + 80;
  if (state) {
    state.ticks = newTicks;
    state.hpCur = state.hpMax || state.hpCur || 0;
    state.la = 'OK';
    state.ra = 'OK';
    state.ll = 'OK';
    state.rl = 'OK';
    state.hd = 'OK';
  }
  appendToChat(
    `> [SLEEP] Courier rested 8 hours.\n> Ticks: ${oldTicks} → ${newTicks} (+80)\n> HP restored. All limbs healed.`,
    'sys'
  );
  if (typeof updateMath === 'function') updateMath();
  if (typeof saveState === 'function') saveState();
}

function _nativeWait(hours) {
  const ticks = hours * 10;
  const oldTicks = (state && state.ticks) || 0;
  const newTicks = oldTicks + ticks;
  if (state) state.ticks = newTicks;
  appendToChat(
    `> [WAIT: ${hours} Hrs] Time advanced ${hours} hour${hours === 1 ? '' : 's'}.\n> Ticks: ${oldTicks} → ${newTicks} (+${ticks})`,
    'sys'
  );
  if (typeof updateMath === 'function') updateMath();
  if (typeof saveState === 'function') saveState();
}

async function transmitMessage() {
  const inputEl = document.getElementById('chatInput');
  const userText = inputEl.value.trim();
  if (!userText && !attachedImageData) return;

  let displayUserText = attachedImageData ? '[VISUAL DATA UPLOADED] ' + userText : userText;
  appendToChat(`> ${displayUserText}`, 'user');
  inputEl.value = '';

  // Native command router — intercepts deterministic commands before any network call
  if (!attachedImageData && _routeNativeCommand(userText)) {
    document.getElementById('chatInput').focus();
    return;
  }

  let rawKey = localStorage.getItem('robco_gemini_key');
  let selectedModel = localStorage.getItem('robco_gemini_model');
  if (!rawKey) {
    appendToChat(
      `> ⚠ FATAL EXCEPTION AT 0x${Math.floor(Math.random() * 0xffff)
        .toString(16)
        .toUpperCase()
        .padStart(4, '0')} — MODULE: COMM_LINK — NO API KEY DETECTED`,
      'sys'
    );
    return;
  }

  const btn = document.getElementById('transmitBtn');
  const uiPanel = document.getElementById('uiPanel');
  btn.innerText = '> TRANSMITTING...';
  btn.disabled = true;
  uiPanel.style.pointerEvents = 'none';
  uiPanel.style.opacity = '0.5';
  document.body.classList.add('thermal-load');
  if (typeof startThermalLoad === 'function') startThermalLoad(); // H2

  let isVatsScanning = false;
  if (attachedImageData) {
    document.getElementById('imagePreviewContainer').classList.add('vats-scanning');
    isVatsScanning = true;
    let scanInterval = setInterval(() => {
      if (isVatsScanning) playClack();
      else clearInterval(scanInterval);
    }, 150);
  }

  // Token Triage: Exclude Inventory if not needed, UNLESS crafting/looting
  let currentPayload = generateSyncPayload();
  const invKeywords = [
    '[INV]',
    '[TRADE]',
    '[CRAFT]',
    '[STASH]',
    '[EXCESS]',
    '[VISUAL]',
    '[THREAT]',
    '[TH]',
    'INVENTORY',
    'LOOT',
    'TAKE',
    'PICK UP',
    'BUY',
    'SELL',
    '+',
  ];
  if (!invKeywords.some(kw => userText.toUpperCase().includes(kw))) {
    delete currentPayload.inventory;
  }

  let apiContents = [];
  chatHistory.forEach(msg => {
    if (msg.sender === 'sys') return;
    apiContents.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    });
  });

  let lastUserMsg = apiContents[apiContents.length - 1];
  lastUserMsg.parts[0].text = `\n[CURRENT STATE]:\n${JSON.stringify(currentPayload)}\n\n[COMMAND]:\n${userText}`;

  if (attachedImageData) {
    lastUserMsg.parts.push({
      inlineData: { mimeType: attachedImageMimeType, data: attachedImageData.split(',')[1] },
    });
  }

  try {
    // AbortController for cancel button + 45s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    btn.innerText = '> CANCEL';
    btn.disabled = false;
    btn.onclick = () => {
      controller.abort();
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': rawKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              { text: getSystemDirective() },
              { text: databaseCSVs }, // always present — guaranteed model attention
            ],
          },
          contents: apiContents,
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();
    let aiText = data.candidates[0].content.parts[0].text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    try {
      const parsedNode = JSON.parse(aiText);
      if (parsedNode.modal && parsedNode.modal.title) {
        if (parsedNode.modal.title.includes('PROJECTED TIMELINE')) {
          let tDisplay = document.getElementById('timelineDisplay');
          if (tDisplay) {
            tDisplay.innerHTML = Array.isArray(parsedNode.modal.content)
              ? parsedNode.modal.content.join('<br>')
              : parsedNode.modal.content;
          }
        } else {
          document.getElementById('modalTitle').innerText = '> ' + parsedNode.modal.title;
          let mContent = document.getElementById('modalContent');
          let mType = parsedNode.modal.type || 'TEXT';

          if (mType === 'GPS') {
            mContent.innerHTML = '<div class="modal-grid-map"></div>';
            let gridMap = mContent.querySelector('.modal-grid-map');
            let rows = Array.isArray(parsedNode.modal.content) ? parsedNode.modal.content : [];
            rows.forEach(row => {
              let rowDiv = document.createElement('div');
              rowDiv.className = 'grid-row';
              let cells = Array.isArray(row) ? row : [row];
              cells.forEach(cell => {
                let cellDiv = document.createElement('div');
                cellDiv.className = 'grid-cell';
                cellDiv.innerText = cell;
                let cleanCell = cell.replace(/\[|\]/g, '').trim();
                if (
                  cleanCell !== '' &&
                  cleanCell !== 'X' &&
                  cleanCell !== '█' &&
                  cleanCell !== '@' &&
                  cleanCell !== 'O' &&
                  cleanCell.length > 0
                ) {
                  cellDiv.style.cursor = 'pointer';
                  cellDiv.onclick = () => {
                    document.getElementById('chatInput').value = `> MOVE TO ${cleanCell}`;
                    closeModal();
                    transmitMessage();
                  };
                }
                rowDiv.appendChild(cellDiv);
              });
              gridMap.appendChild(rowDiv);
            });
          } else if (mType === 'TRADE') {
            mContent.innerHTML =
              '<div class="trade-window"><div class="trade-col" id="tradeVendor"><h3>> VENDOR</h3></div><div class="trade-col" id="tradeCourier"><h3>> COURIER</h3></div></div>';
            let items = Array.isArray(parsedNode.modal.content) ? parsedNode.modal.content : [];
            items.forEach(item => {
              let div = document.createElement('div');
              div.className = 'trade-item';
              let span = document.createElement('span');
              span.textContent = `${item.qty}x ${item.name} (${item.price}c)`;
              let btn = document.createElement('button');
              btn.className = 'action-btn';
              btn.setAttribute('style', 'width:auto; padding:2px 5px;');
              btn.textContent = item.vendor ? 'BUY' : 'SELL';
              btn.addEventListener('click', () => tradeItem(item.name, item.price, item.vendor));
              div.appendChild(span);
              div.appendChild(btn);
              if (item.vendor) document.getElementById('tradeVendor').appendChild(div);
              else document.getElementById('tradeCourier').appendChild(div);
            });
          } else {
            mContent.innerText = Array.isArray(parsedNode.modal.content)
              ? parsedNode.modal.content.join('\n')
              : parsedNode.modal.content;
          }
          document.getElementById('sysModal').style.display = 'flex';
        }
      }

      let narrativeContent =
        parsedNode.narrative || parsedNode.narrative_array || parsedNode.text || parsedNode.message;
      if (narrativeContent) {
        appendToChat(
          Array.isArray(narrativeContent) ? narrativeContent.join('\n') : narrativeContent,
          'ai'
        );
      } else if (!parsedNode.modal) {
        appendToChat('> SYS-ALERT: Missing narrative and modal nodes.', 'sys');
      }

      if (parsedNode.state) {
        autoImportState(JSON.stringify(parsedNode.state));
      }
    } catch (e) {
      appendToChat(
        `> ⚠ FATAL EXCEPTION AT 0x${Math.floor(Math.random() * 0xffff)
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')} — MODULE: COMM_LINK — JSON PARSE FAILURE`,
        'sys'
      );
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      appendToChat('> TRANSMISSION CANCELLED.', 'sys');
    } else if (!error.name || error.name !== 'AbortError') {
      // #14 Auto-Retry on API Failure — one silent retry on transient server errors
      const isTransient = error.message && /50[023]/.test(error.message);
      if (isTransient && !transmitMessage._retrying) {
        transmitMessage._retrying = true;
        appendToChat('> [SYS] RETRANSMITTING... (TRANSIENT ERROR DETECTED)', 'sys', true);
        setTimeout(() => {
          transmitMessage._retrying = false;
          // Re-populate input with the last user message and retransmit silently
          const lastUser = chatHistory.filter(m => m.sender === 'user').slice(-1)[0];
          if (lastUser) {
            document.getElementById('chatInput').value = lastUser.text;
            transmitMessage();
          }
        }, 2500);
      } else {
        transmitMessage._retrying = false;
        appendToChat(
          `> ⚠ FATAL EXCEPTION AT 0x${Math.floor(Math.random() * 0xffff)
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')} — MODULE: COMM_LINK — ${error.message}`,
          'sys'
        );
      }
    }
  } finally {
    btn.innerText = '> TRANSMIT PROTOCOL';
    btn.disabled = false;
    btn.onclick = () => transmitMessage();
    document.getElementById('chatInput').focus();
    uiPanel.style.pointerEvents = 'auto';
    uiPanel.style.opacity = '1';
    if (typeof stopThermalLoad === 'function') stopThermalLoad(); // H2
    document.body.classList.remove('thermal-load');
    if (typeof isVatsScanning !== 'undefined' && isVatsScanning) {
      isVatsScanning = false;
      document.getElementById('imagePreviewContainer').classList.remove('vats-scanning');
    }
    attachedImageData = null;
    attachedImageMimeType = null;
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imageInput').value = '';
  }
}
