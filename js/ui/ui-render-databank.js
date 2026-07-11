// ── ui-render-databank.js — NATIVE DATABANK TOOLS (split from ui-render.js, 2.8.5 U-A4) ──
// THREAT bestiary/TTK assessment, CONSULT registry+DB lookup, the ELIGIBLE
// PERKS survey, the persistent DATABANK panel search, and the BIO-SCAN
// medical advisory — all read-only, offline, no-AI lookups. Global scope,
// static <script> tag — see index.html load order.

// ── WU-N3: THREAT — native bestiary assessment + TTK ──────────────────────
// Pure combat math (no DOM) so the gate can unit-test it. Read-only. Floors
// avoid divide-by-zero / negative effective damage when DT meets/exceeds output.
//   weaponDPS   = baseDamage × aps
//   TTK         = ceil(HP / max(1, weaponDPS − DT))                 (seconds)
//   shotsToKill = ceil(HP / max(1, baseDamage − DT))                (hits)
//   ammoBurn    = shotsToKill × ammoPerAttack   (WU-D4c coefficient; default 1)
function _threatCompute(enemy, weapon, ammoPerAttack) {
  const hp = Math.max(0, Number(enemy && enemy.hp) || 0);
  const dt = Math.max(0, Number(enemy && enemy.dt) || 0);
  if (!weapon) {
    return {
      hasWeapon: false,
      hp,
      dt,
      ttk: null,
      shotsToKill: null,
      ammoBurn: null,
      weaponDPS: 0,
      effectiveDPS: 0,
      perShot: 0,
    };
  }
  const baseDamage = Math.max(0, Number(weapon.baseDamage) || 0);
  const aps = Math.max(0, Number(weapon.aps) || 0);
  const perAttack = Math.max(1, Number(ammoPerAttack) || 1);
  const weaponDPS = baseDamage * aps;
  const effectiveDPS = Math.max(1, weaponDPS - dt);
  const perShot = Math.max(1, baseDamage - dt);
  const ttk = Math.ceil(hp / effectiveDPS);
  const shotsToKill = Math.ceil(hp / perShot);
  const ammoBurn = shotsToKill * perAttack;
  return {
    hasWeapon: true,
    hp,
    dt,
    baseDamage,
    aps,
    perAttack,
    weaponDPS,
    effectiveDPS,
    perShot,
    ttk,
    shotsToKill,
    ammoBurn,
  };
}

// renderThreat — native THREAT ASSESSMENT modal. BESTIARY.CSV lookup on the
// typed target → enemy stat card + TTK + ammo-burn vs the equipped weapon +
// weakness highlight. NO ENTRY IN BESTIARY when absent (Protocol 3 — never
// invent). Game-agnostic: ammoPerAttack comes from GAME_DEFS (Protocol 38).
function renderThreat(target) {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> THREAT ASSESSMENT';

  const q = (target || '').trim();
  const enemy = q && typeof lookupBestiaryEntry === 'function' ? lookupBestiaryEntry(q) : null;

  if (!enemy) {
    content.innerHTML =
      '<pre class="threat-empty" style="white-space:pre-wrap;font-family:inherit;margin:0;color:var(--robco-dim);">' +
      (q
        ? 'NO ENTRY IN BESTIARY: ' + escapeHtml(q)
        : 'SPECIFY A TARGET — e.g. &gt; [THREAT] Deathclaw') +
      '</pre>';
    if (typeof openModal === 'function') openModal();
    if (typeof appendToChat === 'function')
      appendToChat(
        '> [THREAT] ' + (q ? 'No bestiary entry found for that target.' : 'No target specified.'),
        'sys'
      );
    return;
  }

  const weaponName = (state.equipped && state.equipped.weapon) || null;
  const weapon =
    weaponName && typeof lookupWeaponStats === 'function' ? lookupWeaponStats(weaponName) : null;
  const ctx = typeof getGameContext === 'function' ? getGameContext() : state.gameContext || 'FNV';
  const def = (window.GAME_DEFS && (GAME_DEFS[ctx] || GAME_DEFS.FNV)) || {};
  const ammoPerAttack = typeof def.ammoPerAttack === 'number' ? def.ammoPerAttack : 1;
  const m = _threatCompute(enemy, weapon, ammoPerAttack);

  const row = (label, value) =>
    `<div class="threat-row"><span class="threat-label">${label}</span><span class="threat-val">${value}</span></div>`;
  const weak = enemy.weakness && enemy.weakness.toLowerCase() !== 'none' ? enemy.weakness : null;

  let html = '<div class="threat-card">';
  html += `<div class="threat-name">${escapeHtml(enemy.name)}</div>`;
  html += '<div class="threat-stats">';
  html += row('HP', String(enemy.hp));
  html += row('DT', String(enemy.dt));
  html += row('BASE DMG', String(enemy.baseDamage));
  html += row('ATK RATE', enemy.attackRate + '/s');
  if (enemy.attackType) html += row('ATK TYPE', escapeHtml(enemy.attackType));
  if (enemy.resistances && enemy.resistances.toLowerCase() !== 'none')
    html += row('RESIST', escapeHtml(enemy.resistances));
  html += '</div>';

  html += weak
    ? `<div class="threat-weakness">&#9668; WEAKNESS: ${escapeHtml(weak)} &#9658;</div>`
    : '<div class="threat-weakness threat-weakness--none">NO RECORDED WEAKNESS</div>';

  html += '<div class="threat-calc">';
  if (m.hasWeapon) {
    // Canonical melee-scope rule (reuse _vatsIsMelee): melee/unarmed weapons burn
    // no ammo, so report strikes-to-kill instead of an ammo-burn round count.
    const isMelee =
      typeof _vatsIsMelee === 'function'
        ? _vatsIsMelee(weapon)
        : !weapon.ammoType || weapon.ammoType.toLowerCase() === 'none';
    html += `<div class="threat-ttk">TIME TO NEUTRALIZE: ${m.ttk}s</div>`;
    if (isMelee) {
      html += `<div class="threat-ammo">HITS TO NEUTRALIZE: ${m.shotsToKill} strike${m.shotsToKill === 1 ? '' : 's'} (melee &mdash; no ammo)</div>`;
    } else {
      html += `<div class="threat-ammo">AMMO BURN EST.: ${m.ammoBurn} round${m.ammoBurn === 1 ? '' : 's'} (${m.shotsToKill} hit${m.shotsToKill === 1 ? '' : 's'})</div>`;
      const at = (weapon.ammoType || '').trim();
      if (at) {
        html += `<div class="threat-weapon">AMMO TYPE: ${escapeHtml(at)}</div>`;
        // Reserve check: compare the projected burn against ammo actually on hand
        // (Protocol 22 — reuses the craft-panel case-insensitive lookup).
        const reserve = typeof _craftGetHave === 'function' ? _craftGetHave(at) : null;
        if (reserve !== null) {
          const short = reserve < m.ammoBurn;
          html += `<div class="threat-ammo-advisory${short ? ' threat-ammo-advisory--low' : ''}">${short ? '⚠ INSUFFICIENT RESERVES' : 'RESERVES SUFFICIENT'}: ${reserve}/${m.ammoBurn} ${escapeHtml(at)} on hand</div>`;
        }
      }
    }
    html += `<div class="threat-weapon">VS ${escapeHtml(weapon.name)} &mdash; DPS ${Math.round(m.weaponDPS)} / EFF ${Math.round(m.effectiveDPS)} after DT</div>`;
  } else {
    html += '<div class="threat-note">EQUIP A WEAPON FOR TTK + AMMO-BURN ESTIMATE.</div>';
  }
  html += '</div></div>';

  content.innerHTML = html;
  if (typeof openModal === 'function') openModal();
  if (typeof appendToChat === 'function')
    appendToChat(
      `> [THREAT] ${enemy.name} assessed${m.hasWeapon ? ` — TTK ${m.ttk}s, ${m.ammoBurn} rounds` : ''}.`,
      'sys'
    );
}

// ── WU-N4: CONSULT — native databank lookup ──────────────────────────────
// `> CONSULT <topic>` → exact local records from FALLOUT_REGISTRY (items/perks/quests/
// locations/companions via registrySearch) + DB stat cross-reference (lookupItemInDb /
// lookupWeaponStats / lookupBestiaryEntry). Deterministic, offline, read-only, no AI.
// Shows NO ENTRY IN DATABANK when nothing matches (Protocol 3 — never invents records).
// Game-agnostic (Protocol 38): FALLOUT_REGISTRY + databaseCSVs are the active game's data.
// The user topic is always run through escapeHtml before it reaches innerHTML (XSS-safe).
// U9-4: extended to also search the tracker registries (collectibles/skillBooks/
// magazines/traits/lincolnMemorabilia). registrySearch() already no-ops on a
// category absent from the active game's FALLOUT_REGISTRY (Protocol 38 — no
// per-game branching needed here; FNV lacks lincolnMemorabilia, FO3 lacks
// traits/magazines, and both cases just yield zero hits for that category).
const _CONSULT_CATS = [
  { key: 'items', label: 'ITEMS' },
  { key: 'perks', label: 'PERKS' },
  { key: 'quests', label: 'QUESTS' },
  { key: 'locations', label: 'LOCATIONS' },
  { key: 'companions', label: 'COMPANIONS' },
  { key: 'collectibles', label: 'COLLECTIBLES' },
  { key: 'skillBooks', label: 'SKILL BOOKS' },
  { key: 'magazines', label: 'SKILL MAGAZINES' },
  { key: 'traits', label: 'TRAITS' },
  { key: 'lincolnMemorabilia', label: 'LINCOLN MEMORABILIA' },
];

function _consultDetail(cat, e) {
  if (cat === 'quests') return [e.type, e.dlc].filter(Boolean).join(' · ');
  if (cat === 'perks') return [e.type, e.level ? 'Lvl ' + e.level : ''].filter(Boolean).join(' · ');
  if (cat === 'companions') return e.location || e.fullName || '';
  if (cat === 'collectibles' || cat === 'lincolnMemorabilia') return e.location || '';
  if (cat === 'skillBooks' || cat === 'magazines') return e.skill ? 'Skill: ' + e.skill : '';
  if (cat === 'traits') return e.effect || '';
  return e.type || '';
}

// Shared CONSULT engine (Protocol 22) — pure search core consumed by BOTH the
// CONSULT modal (renderConsult) and the persistent DATABANK panel
// (renderDatabankPanel). No DOM, no side effects: registry hits across every
// category (active game's FALLOUT_REGISTRY) + DB stat cross-reference.
function _consultSearch(topic) {
  const q = (topic || '').trim();
  if (!q)
    return {
      q: '',
      noQuery: true,
      empty: true,
      groups: [],
      creature: null,
      weapon: null,
      dbItem: null,
      questItem: null,
    };
  const groups = [];
  if (typeof registrySearch === 'function') {
    for (const c of _CONSULT_CATS) {
      const hits = registrySearch(c.key, q) || [];
      if (hits.length) groups.push({ key: c.key, label: c.label, hits: hits.slice(0, 5) });
    }
  }
  const creature = typeof lookupBestiaryEntry === 'function' ? lookupBestiaryEntry(q) : null;
  const weapon = typeof lookupWeaponStats === 'function' ? lookupWeaponStats(q) : null;
  const dbItem = typeof lookupItemInDb === 'function' ? lookupItemInDb(q) : null;
  // U9-4: surface the QUEST_ITEMS.CSV Associated_Quest/Special_Property columns
  // lookupItemInDb() doesn't expose (Protocol 22 — same accessor pattern as getChemsTable).
  const questItem = typeof getQuestItemDetail === 'function' ? getQuestItemDetail(q) : null;
  const empty = groups.length === 0 && !creature && !weapon && !dbItem && !questItem;
  return { q, noQuery: false, empty, groups, creature, weapon, dbItem, questItem };
}

// Autocomplete source for the Tool Deck's shared #deckTarget field (wired via
// wireInput() in ui-saves.js, Protocol 22 — the same registry-autocomplete
// singleton every other input already uses, no new mechanism). One field feeds
// several tools (THREAT/VATS = creature, TRADE/LOOT = item, CONSULT = any
// topic), so suggestions combine the same sources CONSULT already searches
// (_CONSULT_CATS via registrySearch) plus bestiary creature names — reusing,
// never forking, the existing lookups. Read-only, no state write. Game-agnostic
// (Protocol 38): every source is registry/DB-driven, never a hardcoded name.
function _deckTargetSuggestions(q) {
  const query = String(q || '').trim();
  if (query.length < 2) return [];
  const out = [];
  if (typeof getBestiaryNames === 'function') {
    const ql = query.toLowerCase();
    getBestiaryNames()
      .filter(n => n.toLowerCase().includes(ql))
      .slice(0, 5)
      .forEach(n => out.push({ name: n, type: 'creature' }));
  }
  if (typeof registrySearch === 'function') {
    _CONSULT_CATS.forEach(c => {
      registrySearch(c.key, query).forEach(entry => {
        out.push({ name: entry.name, type: c.label.toLowerCase() });
      });
    });
  }
  const seen = new Set();
  return out
    .filter(entry => {
      const k = entry.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8);
}

// Shared CONSULT renderer (Protocol 22) — builds the escaped DATABANK result HTML
// string from a _consultSearch() result. Used by both the modal and the panel.
function _consultRenderHTML(res) {
  const pre = msg =>
    '<pre class="consult-empty" style="white-space:pre-wrap;font-family:inherit;margin:0;color:var(--robco-dim);">' +
    msg +
    '</pre>';
  if (res.noQuery) return pre('SPECIFY A QUERY — e.g. &gt; CONSULT Deathclaw');
  if (res.empty) return pre('NO ENTRY IN DATABANK: ' + escapeHtml(res.q));

  let html = '<div class="consult-card">';
  html += `<div class="consult-query">QUERY: ${escapeHtml(res.q)}</div>`;

  const statRows = [];
  if (res.creature) {
    statRows.push(['CREATURE', escapeHtml(res.creature.name)]);
    statRows.push(['HP / DT', `${res.creature.hp} / ${res.creature.dt}`]);
    if (res.creature.weakness && String(res.creature.weakness).toLowerCase() !== 'none')
      statRows.push(['WEAKNESS', escapeHtml(res.creature.weakness)]);
    // U9-4: XP_Yield is parsed by lookupBestiaryEntry() but was never surfaced anywhere.
    if (res.creature.xpYield) statRows.push(['XP YIELD', String(res.creature.xpYield)]);
  }
  if (res.weapon) {
    statRows.push(['WEAPON', escapeHtml(res.weapon.name)]);
    statRows.push(['DMG / APS', `${res.weapon.baseDamage} / ${res.weapon.aps}`]);
    if (res.weapon.ammoType) statRows.push(['AMMO', escapeHtml(res.weapon.ammoType)]);
  }
  if (res.dbItem && !res.weapon && !res.creature) {
    statRows.push(['TYPE', escapeHtml(String(res.dbItem.type || 'misc'))]);
    statRows.push(['WEIGHT / VALUE', `${res.dbItem.wgt} / ${res.dbItem.val}`]);
  }
  // U9-4: QUEST_ITEMS.CSV Associated_Quest/Special_Property — authored data that
  // previously had no consumer anywhere in the app.
  if (res.questItem) {
    if (res.questItem.associatedQuest)
      statRows.push(['ASSOCIATED QUEST', escapeHtml(res.questItem.associatedQuest)]);
    if (res.questItem.specialProperty)
      statRows.push(['SPECIAL PROPERTY', escapeHtml(res.questItem.specialProperty)]);
  }
  if (statRows.length) {
    html += '<div class="consult-stats">';
    statRows.forEach(r => {
      html += `<div class="consult-row"><span class="consult-label">${r[0]}</span><span class="consult-val">${r[1]}</span></div>`;
    });
    html += '</div>';
  }

  res.groups.forEach(g => {
    html += `<div class="consult-group"><div class="consult-cat">${g.label}</div>`;
    g.hits.forEach(e => {
      const d = _consultDetail(g.key, e);
      html +=
        `<div class="consult-hit"><span class="consult-hit-name">${escapeHtml(e.name)}</span>` +
        (d ? `<span class="consult-hit-meta">${escapeHtml(d)}</span>` : '') +
        '</div>';
    });
    html += '</div>';
  });

  html += '</div>';
  return html;
}

// CONSULT modal path (macro button / native router) — one-off lookup in the shared
// sysModal. Same engine as the DATABANK panel, rendered into the modal.
function renderConsult(topic) {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> DATABANK QUERY';
  const res = _consultSearch(topic);
  content.innerHTML = _consultRenderHTML(res);
  if (typeof openModal === 'function') openModal();
  if (typeof appendToChat === 'function') {
    if (res.noQuery) appendToChat('> [CONSULT] No query specified.', 'sys');
    else if (res.empty) appendToChat(`> [CONSULT] No databank entry found for "${res.q}".`, 'sys');
    else appendToChat(`> [CONSULT] Databank record retrieved for "${res.q}".`, 'sys');
  }
}

// ── Native [PERKS] / [PK] — eligible-perks lookup (AI→native survey Part C.1) ──
// Deterministic, read-only, offline lookup of the perks the Courier qualifies
// for RIGHT NOW at their current level, sourced from the active game's
// FALLOUT_REGISTRY.perks. Only level-gated "regular" perks are considered —
// "special" (condition-gated) perks carry level:0 and are earned through other
// means, never a level threshold. Never auto-grants a perk (state.perks is
// untouched) — a pure query, mirroring CONSULT's read-only contract. Replaces
// the Director's old "eligible perks at your level" free-text answer; the AI's
// generative build-goal-aware [ROADMAP] is untouched (still AI — a different,
// hybrid feature per the survey). Game-agnostic (Protocol 38): reads
// FALLOUT_REGISTRY, never a hardcoded perk name.
function _computeEligiblePerks() {
  const registry = (typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.perks) || [];
  const lvl = Math.max(1, parseInt(state.lvl, 10) || 1);
  const owned = new Set((state.perks || []).map(p => String(p.name || '').toLowerCase()));
  return registry
    .filter(p => p.type === 'regular' && (parseInt(p.level, 10) || 0) <= lvl)
    .filter(p => !owned.has(String(p.name || '').toLowerCase()))
    .slice()
    .sort(
      (a, b) =>
        (parseInt(a.level, 10) || 0) - (parseInt(b.level, 10) || 0) || a.name.localeCompare(b.name)
    );
}

function renderEligiblePerks() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> ELIGIBLE PERKS';
  const lvl = Math.max(1, parseInt(state.lvl, 10) || 1);
  const eligible = _computeEligiblePerks();
  if (!eligible.length) {
    content.innerHTML =
      '<pre class="threat-empty" style="white-space:pre-wrap;font-family:inherit;margin:0;color:var(--robco-dim);">' +
      `NO UNCLAIMED PERKS AT LEVEL ${lvl}.` +
      '</pre>';
  } else {
    content.innerHTML =
      '<div class="consult-card">' +
      `<div class="consult-query">ELIGIBLE AT LEVEL ${lvl}</div>` +
      eligible
        .map(
          p =>
            `<div class="consult-hit"><span class="consult-hit-name">${escapeHtml(p.name)}</span>` +
            `<span class="consult-hit-meta">REQ LVL ${parseInt(p.level, 10) || 0}</span></div>`
        )
        .join('') +
      '</div>';
  }
  if (typeof openModal === 'function') openModal();
  if (typeof appendToChat === 'function')
    appendToChat(
      `> [PERKS] ${eligible.length} eligible perk${eligible.length === 1 ? '' : 's'} at level ${lvl}.`,
      'sys'
    );
}

// BUS-19 · CATALOG QUERY (Phase 3 · Piece 3) — DATABANK panel path (DATA tab):
// persistent inline lookup. Reads #databankSearch and renders the SAME shared
// CONSULT engine into #databankResults (Protocol 22 — _consultSearch/
// _consultRenderHTML are byte-identical to the CONSULT modal path), so the
// user can leave the panel open and keep searching without reopening a
// modal. Read-only, no AI. The amber "wireboard" skin is CSS-only, scoped to
// #databankPanel — this function only adds the board's 0i status line.
function renderDatabankPanel() {
  const out = document.getElementById('databankResults');
  if (!out) return;
  const inp = document.getElementById('databankSearch');
  const res = _consultSearch(inp ? inp.value : '');
  out.innerHTML = _consultRenderHTML(res);
  const statusEl = document.getElementById('dbCatalogStatus');
  if (statusEl) {
    const hitCount =
      res.groups.reduce((a, g) => a + g.hits.length, 0) +
      (res.creature || res.weapon || res.dbItem || res.questItem ? 1 : 0);
    statusEl.textContent = res.noQuery
      ? 'INDEX READY — TYPE TO QUERY THE ARCHIVE'
      : res.empty
        ? `NO CATALOG MATCH — "${res.q}"`
        : `${hitCount} RESULT${hitCount === 1 ? '' : 'S'} — "${res.q}"`;
  }
}

// ── WU-N5: BIO-SCAN — native medical advisory ────────────────────────────
// `> [BIO-SCAN]` → deterministic limb/HP/radiation/addiction readout computed
// entirely from `state` (limbs, hpCur/hpMax, rads, status) cross-referenced with
// the active game's CHEMS data. Pure local rules, read-only, offline, no AI.
// Game-agnostic (Protocol 38): limb labels are generic anatomy and the recommended
// med items are sourced from getChemsTable() — never hardcoded game item names.
// All advisory text is escaped before it reaches innerHTML (XSS-safe).
const _BIO_LIMBS = [
  { key: 'hd', label: 'HEAD' },
  { key: 'la', label: 'LEFT ARM' },
  { key: 'ra', label: 'RIGHT ARM' },
  { key: 'll', label: 'LEFT LEG' },
  { key: 'rl', label: 'RIGHT LEG' },
];

// A chem carries addiction risk when its Addiction_Risk column is a non-zero
// percentage (e.g. "25%") — not blank, "None", or "0%".
function _bioChemHasRisk(c) {
  const r = String((c && c.addictionRisk) || '')
    .trim()
    .toLowerCase();
  return r !== '' && r !== 'none' && !/^0%?$/.test(r);
}

// Pure deterministic core — takes a read-only state snapshot + the CHEMS table and
// returns the structured advisory. Kept side-effect-free so it is unit-testable.
function _bioScanCompute(snap, chems) {
  snap = snap || {};
  chems = Array.isArray(chems) ? chems : [];
  const limbStates = snap.limbs || {};
  const limbs = _BIO_LIMBS.map(l => ({
    key: l.key,
    label: l.label,
    crippled: String(limbStates[l.key] || 'OK').toUpperCase() === 'CRIPPLED',
  }));
  const crippled = limbs.filter(l => l.crippled).map(l => l.label);

  const hpMax = Math.max(1, Number(snap.hpMax) || 1);
  const hpCur = Math.max(0, Number(snap.hpCur) || 0);
  const hpPct = Math.round((hpCur / hpMax) * 100);
  const hpTier = hpPct < 25 ? 'CRITICAL' : hpPct < 60 ? 'WOUNDED' : 'STABLE';

  const rads = Math.max(0, Number(snap.rads) || 0);
  const radTier =
    rads >= 600 ? 'SEVERE' : rads >= 400 ? 'ADVANCED' : rads >= 200 ? 'MINOR' : 'NONE';

  // Recommended med items, sourced from the active game's CHEMS data (Protocol 3 —
  // data is authority). A healer restores HP; a rad-remover clears radiation.
  const healer = (
    chems.find(c => /restore/i.test(c.effect) && /hp/i.test(c.effect) && !/rad/i.test(c.effect)) ||
    {}
  ).name;
  const radRemover = (chems.find(c => /remove/i.test(c.effect) && /rad/i.test(c.effect)) || {})
    .name;
  const healName = healer ? healer.toUpperCase() + ' ADVISED' : 'MEDICAL ATTENTION ADVISED';
  const radName = radRemover ? radRemover.toUpperCase() + ' ADVISED' : 'DECONTAMINATION ADVISED';

  const advisories = [];
  crippled.forEach(label =>
    advisories.push({ kind: 'limb', text: label + ' CRIPPLED — ' + healName })
  );
  if (hpTier === 'CRITICAL') {
    advisories.push({ kind: 'hp', text: 'HP CRITICAL (' + hpPct + '%) — ' + healName });
  } else if (hpTier === 'WOUNDED') {
    advisories.push({ kind: 'hp', text: 'HP LOW (' + hpPct + '%) — ' + healName });
  }
  if (radTier !== 'NONE') {
    advisories.push({
      kind: 'rad',
      text: 'RADIATION ' + radTier + ' (' + rads + ' RADS) — ' + radName,
    });
  }
  // Addiction risk: any active status effect that matches an addictive chem.
  const seen = new Set();
  (Array.isArray(snap.status) ? snap.status : []).forEach(eff => {
    const en = String((eff && eff.name) || '').toLowerCase();
    if (!en) return;
    chems.forEach(c => {
      if (!_bioChemHasRisk(c)) return;
      const cn = c.name.toLowerCase();
      const fam = (c.family || '').toLowerCase();
      if ((en.includes(cn) || (fam && en.includes(fam))) && !seen.has(cn)) {
        seen.add(cn);
        advisories.push({
          kind: 'addiction',
          text: 'ADDICTION RISK: ' + c.name.toUpperCase() + ' (active) — ' + c.addictionRisk,
        });
      }
    });
  });

  return { hpCur, hpMax, hpPct, hpTier, rads, radTier, limbs, crippled, advisories };
}

function renderBioScan() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> BIO-SCAN ADVISORY';

  const chems = typeof getChemsTable === 'function' ? getChemsTable() : [];
  const snap = {
    limbs: { hd: state.hd, la: state.la, ra: state.ra, ll: state.ll, rl: state.rl },
    hpCur: state.hpCur,
    hpMax: state.hpMax,
    rads: state.rads,
    status: state.status,
  };
  const r = _bioScanCompute(snap, chems);

  let html = '<div class="bio-card">';
  html += '<div class="bio-vitals">';
  html += `<div class="bio-row"><span class="bio-label">HP</span><span class="bio-val bio-hp--${r.hpTier.toLowerCase()}">${r.hpCur} / ${r.hpMax} (${r.hpPct}%) ${r.hpTier}</span></div>`;
  html += `<div class="bio-row"><span class="bio-label">RADIATION</span><span class="bio-val">${r.rads} RADS${r.radTier !== 'NONE' ? ' — ' + r.radTier : ''}</span></div>`;
  html += '</div>';

  html += '<div class="bio-limbs">';
  r.limbs.forEach(l => {
    html +=
      `<div class="bio-limb"><span class="bio-limb-name">${escapeHtml(l.label)}</span>` +
      `<span class="bio-limb-state bio-limb-state--${l.crippled ? 'crippled' : 'ok'}">${l.crippled ? 'CRIPPLED' : 'OK'}</span></div>`;
  });
  html += '</div>';

  html += '<div class="bio-advisories">';
  if (r.advisories.length === 0) {
    html += '<div class="bio-nominal">ALL SYSTEMS NOMINAL — NO INTERVENTION ADVISED</div>';
  } else {
    r.advisories.forEach(a => {
      html += `<div class="bio-advisory bio-advisory--${a.kind}">&#9658; ${escapeHtml(a.text)}</div>`;
    });
  }
  html += '</div></div>';

  content.innerHTML = html;
  if (typeof openModal === 'function') openModal();
  if (typeof appendToChat === 'function')
    appendToChat(
      `> [BIO-SCAN] ${r.crippled.length} limb(s) crippled, HP ${r.hpPct}% — ${r.advisories.length} advisor${r.advisories.length === 1 ? 'y' : 'ies'}.`,
      'sys'
    );
}

// Switch faction/karma panels based on game context (called from loadUI).
