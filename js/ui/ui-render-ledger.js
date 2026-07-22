// ── ui-render-ledger.js — FIELD LEDGER (split from ui-render.js, 2.8.5 U-A4) ──
// The shared SHELF/RACK read-tracker renderer (_renderReadTracker — drives
// both the skill-book shelf and the skill-magazine rack from one config
// object, Protocol 22), skill books, skill magazines, campaign field notes,
// and the campaign status/chronicle event log (renderCampaignStatus,
// _recordLine). Global scope, static <script> tag — see index.html load
// order.

// ── Shared SHELF/RACK tracker renderer (Phase 3 OPERATOR batch 3 — ground-
// up reskin of the WU-B8 shared helper) ─────────────────────────────────
// Drives the BUS-05a SKILL BOOKS reference shelf and BUS-05b SKILL MAGAZINES
// periodical rack from one config object — the row markup, empty state, and
// toggle wiring live in exactly one place (Protocol 22 — no duplicated
// render logic). Each row is a SINGLE <button> carrying BOTH the Protocol
// UI-3 .tracker-row and .tracker-toggle classes (the spine/cover IS its own
// toggle) — read = upright/lit/ribbon (books) or consumed = matte+stamped
// (magazines), the undone state leaning/dashed/dim. Fully data-driven — no
// game literals (Protocol 38).
//
// opts: {
//   containerId,                     // required: shelf/rack mount point
//   panelId?, visible?,              // optional: hide panelId when visible() is false
//   defs,                            // registry array of {name, skill}
//   read,                            // state array of read/consumed names
//   toggleFn,                        // name of the global toggle function
//   meta,                            // (d) => plain-text sub-label (skill name)
//   itemClass,                       // 'spine' | 'mag' — row CSS variant
//   doneModifier, undoneModifier,    // extra class applied per state
//   doneWord, undoneWord,            // aria-label phrasing
//   emptyBoard,                      // empty-state text when defs.length === 0
// }
function _renderReadTracker(opts) {
  const container = document.getElementById(opts.containerId);
  if (!container) return;
  const panel = opts.panelId ? document.getElementById(opts.panelId) : null;
  if (typeof opts.visible === 'function' && !opts.visible()) {
    if (panel) panel.style.display = 'none';
    return;
  }
  if (panel) panel.style.display = '';

  const defs = Array.isArray(opts.defs) ? opts.defs : [];
  const read = Array.isArray(opts.read) ? opts.read : [];

  const rowHtml = d => {
    const safeAttr = escapeHtml(d.name);
    const isRead = read.includes(d.name);
    const modifier = isRead ? opts.doneModifier : opts.undoneModifier;
    const word = isRead ? opts.doneWord : opts.undoneWord;
    const metaText = opts.meta(d);
    const cls =
      'tracker-row tracker-toggle ' +
      (isRead ? 'tracker-toggle--active' : 'tracker-toggle--inactive') +
      ' ' +
      opts.itemClass +
      (modifier ? ' ' + modifier : '');
    return (
      `<button class="${cls}" data-name="${safeAttr}" onclick="${opts.toggleFn}(this.dataset.name)" ` +
      `aria-label="${escapeHtml(d.name)} (${escapeHtml(metaText)}) — ${word}">` +
      `${escapeHtml(d.name)}<span class="tracker-meta">${escapeHtml(metaText)}</span>` +
      `</button>`
    );
  };

  container.innerHTML = defs.length ? defs.map(rowHtml).join('') : emptyState(opts.emptyBoard);
}

function renderSkillBooks() {
  _renderReadTracker({
    containerId: 'skillBooksDisplay',
    defs:
      typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.skillBooks)
        ? FALLOUT_REGISTRY.skillBooks
        : [],
    read: Array.isArray(state.skillBooks) ? state.skillBooks : [],
    toggleFn: 'toggleSkillBook',
    meta: d => (d.skill || '').replace(/_/g, ' ').toUpperCase(),
    itemClass: 'spine',
    doneModifier: '',
    undoneModifier: 'unread',
    doneWord: 'read; tap to mark unread',
    undoneWord: 'unread; tap to mark read',
    emptyBoard: 'NO SKILL BOOKS IN THE REGISTRY',
  });
}

// FEEDBACK ANIMATION WAVE 2 (#12 INK STAMP) — plays only on the unread→read/
// consumed transition (never the reverse un-mark, since a rubber stamp
// physically LANDING only makes sense once); shared by the skill-book spine
// rack and the magazine cover rack (Protocol 22 — one helper, two callers),
// since both use the identical button[data-name] row shape. Looked up AFTER
// the container's full re-render (both toggles rebuild innerHTML), so the
// class is applied to the freshly-painted button, not a stale reference.
function _playInkStamp(containerId, name) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const btn = Array.from(container.querySelectorAll('button[data-name]')).find(
    b => b.dataset.name === name
  );
  if (!btn) return;
  btn.classList.remove('ink-stamp-land');
  void btn.offsetWidth;
  btn.classList.add('ink-stamp-land');
  setTimeout(() => btn.classList.remove('ink-stamp-land'), 900);
}

function toggleSkillBook(name) {
  if (!Array.isArray(state.skillBooks)) state.skillBooks = [];
  const idx = state.skillBooks.indexOf(name);
  const wasUnread = idx === -1;
  if (idx !== -1) {
    state.skillBooks.splice(idx, 1);
  } else {
    state.skillBooks.push(name);
  }
  renderSkillBooks();
  if (wasUnread) _playInkStamp('skillBooksDisplay', name);
  // Owner batch item 2: the "n/13 READ" #opBooksStatus summary (BUS-05a's
  // <summary> line, doubling as the collapsed-state readout) is painted by
  // _syncOperatorTelemetry() — previously only reached via the next unrelated
  // updateMath() call, so the count lagged a shelve/unshelve tap by a full
  // render cycle. Calling the same sync function directly here (Protocol 22 —
  // no new counting logic) refreshes it immediately.
  if (typeof _syncOperatorTelemetry === 'function') _syncOperatorTelemetry();
  saveState();
}

function renderMagazines() {
  _renderReadTracker({
    containerId: 'magazinesDisplay',
    panelId: 'magazinesPanel',
    visible: () => !!_activeDef().hasMagazines,
    defs:
      typeof FALLOUT_REGISTRY !== 'undefined' && Array.isArray(FALLOUT_REGISTRY.magazines)
        ? FALLOUT_REGISTRY.magazines
        : [],
    read: Array.isArray(state.magazines) ? state.magazines : [],
    toggleFn: 'toggleMagazine',
    meta: d =>
      d.skill === 'Critical Chance'
        ? 'CRITICAL CHANCE +10 (TEMP)'
        : (d.skill || '').replace(/_/g, ' ').toUpperCase() + ' +10 (TEMP)',
    itemClass: 'mag',
    doneModifier: 'consumed',
    undoneModifier: '',
    doneWord: 'consumed; tap to restore',
    undoneWord: 'unread; tap to mark consumed',
    emptyBoard: 'NO SKILL MAGAZINES IN THE REGISTRY',
  });
}

function toggleMagazine(name) {
  if (!Array.isArray(state.magazines)) state.magazines = [];
  const idx = state.magazines.indexOf(name);
  const wasUnread = idx === -1;
  if (idx !== -1) {
    state.magazines.splice(idx, 1);
  } else {
    state.magazines.push(name);
  }
  renderMagazines();
  if (wasUnread) _playInkStamp('magazinesDisplay', name);
  // Same #opMagsStatus live-count fix as toggleSkillBook() (Protocol 22 — the
  // identical root cause, same fix, same sync function).
  if (typeof _syncOperatorTelemetry === 'function') _syncOperatorTelemetry();
  saveState();
}

// ── BUS-20 · FIELD NOTES (Phase 3 · Piece 3) — courier's field ledger:
// bounded tray-scrollwrap + an optional in-tray search filter (display-only,
// Protocol 22 — removeCampaignNote/addCampaignNote untouched). The auto-log
// [T…] dimming distinction is preserved.
function renderCampaignNotes() {
  const notesDiv = document.getElementById('campaignNotesList');
  if (!notesDiv) return;
  const all = state.campaign_notes || [];
  const searchEl = document.getElementById('notesSearch');
  const q = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const shown = all
    .map((note, i) => ({ note, i }))
    .filter(({ note }) => !q || String(note).toLowerCase().includes(q));

  const statusEl = document.getElementById('dbNotesStatus');
  if (statusEl) {
    const autoCount = all.filter(n => /^\[T\d+\]/.test(n)).length;
    statusEl.textContent = `${all.length} ON FILE · ${autoCount} AUTO-LOGGED`;
  }

  if (!all.length) {
    notesDiv.innerHTML = emptyState('NO ENTRIES IN MEMORY');
    return;
  }
  if (!shown.length) {
    notesDiv.innerHTML = emptyState('NO NOTES MATCH THIS FILTER');
    return;
  }
  notesDiv.innerHTML = shown
    .map(({ note, i }) => {
      const isAutoLog = /^\[T\d+\]/.test(note);
      return `<div class="note-row${isAutoLog ? ' autolog' : ''}"><span class="n-txt">${escapeHtml(String(note))}</span><button class="n-x" onclick="removeCampaignNote(${i})" aria-label="Remove note">&#10005;</button></div>`;
    })
    .join('');
}

function removeCampaignNote(idx) {
  if (state.campaign_notes && state.campaign_notes.length > idx) {
    state.campaign_notes.splice(idx, 1);
    renderCampaignNotes();
    updateMath();
  }
}

function addCampaignNote() {
  const input = document.getElementById('newCampaignNote');
  if (!input || !input.value.trim()) return;
  if (!state.campaign_notes) state.campaign_notes = [];
  state.campaign_notes.push(input.value.trim().slice(0, 5000)); // defensive clamp
  input.value = '';
  renderCampaignNotes();
  updateMath();
}

// P4: format a Terminal Record event { t, rt, type, text } as a display line.
// Owner report: the raw [T<ticks>] tick prefix was too cryptic. The stored
// tick value (ev.t) is unchanged — only the DISPLAY now runs it through the
// same formatGameTime() every other player-visible time stamp already uses
// (Protocol 22), so Crossroads Record/Incident Log read a real in-game
// date/time instead of a bare tick count.
function _recordLine(ev) {
  if (!ev || typeof ev !== 'object') return String(ev == null ? '' : ev);
  return `[${formatGameTime(ev.t || 0)}] ${ev.text || ''}`;
}

// ── CAMPAIGN STATUS PANEL (v2.0.1) ───────────────────────────────
// Reads existing state fields — no new state fields, no Protocol 4 required.
// Displays: quest summary, top faction standings, active effects, and campaign notes count.
// Crossroads Record tab reads campaign_notes for auto-logged quest/faction events.
// ── BUS-18 · CAMPAIGN CHRONICLE (Phase 3 · Piece 3) — the tape-spool
// chronicle/ledger dress over the SAME campaignStatusDisplay/crossroadsDisplay
// /incidentDisplay reads (Protocol 22 — no state field or handler changed).
function renderCampaignStatus() {
  const display = document.getElementById('campaignStatusDisplay');
  const crossroads = document.getElementById('crossroadsDisplay');

  // ── Status readout head ──────────────────────────────────
  if (display) {
    const quests = state.quests || [];
    const active = quests.filter(q => q.status === 'in progress' || q.status === 'active').length;

    // Notable faction standings by absolute net rep
    const factions = state.factions || {};
    const factionReg = typeof getFactionRegistry === 'function' ? getFactionRegistry() : [];
    const topFactions = factionReg
      .map(f => {
        const data = factions[f.key] || { fame: 0, infamy: 0 };
        const s =
          typeof getFactionStanding === 'function'
            ? getFactionStanding(f.key, data.fame || 0, data.infamy || 0)
            : { label: 'NEUTRAL', color: 'var(--robco-green)' };
        return {
          name: f.name,
          label: s.label,
          color: s.color,
          bad: s.color === 'var(--robco-danger)',
        };
      })
      .filter(f => f.label !== 'Neutral' && f.label !== 'NEUTRAL')
      .slice(0, 6);

    const activeEffects = (state.status || []).length;
    const eventCount = (state.eventLog || []).length;

    let html = `<div class="stat-head">
      <div class="cs-box"><span class="c-cap">DIRECTIVES ACTIVE</span><span class="c-val">${active}</span></div>
      <div class="cs-box"><span class="c-cap">COMPOUNDS LIVE</span><span class="c-val">${activeEffects}</span></div>
      <div class="cs-box"><span class="c-cap">EVENTS LOGGED</span><span class="c-val">${eventCount}</span></div>
    </div>`;

    if (topFactions.length > 0) {
      html += `<div class="standing-chips">`;
      html += topFactions
        .map(
          f =>
            `<span class="stch${f.bad ? ' bad' : ''}">${escapeHtml(f.name.toUpperCase())} &mdash; ${escapeHtml(f.label.toUpperCase())}</span>`
        )
        .join('');
      html += `</div>`;
    } else {
      html += `<div class="rack-note" style="text-align:center;opacity:0.5">NO NOTABLE STANDINGS ON FILE</div>`;
    }

    display.innerHTML = html;
  }

  // ── The record spool (CROSSROADS RECORD) ─────────────────
  // Reads the structured Terminal Record (state.eventLog) — the canonical
  // campaign history. Shows the most recent events across all types.
  if (crossroads) {
    const recent = (state.eventLog || []).slice(-20).reverse(); // newest first
    if (recent.length === 0) {
      crossroads.innerHTML = emptyState(
        'NO DECISIONS RECORDED — CROSSROADS EVENTS WILL APPEAR HERE'
      );
    } else {
      crossroads.innerHTML =
        `<div class="spool-wrap"><div class="reels" aria-hidden="true"><span class="reel"></span><span class="reel"></span></div><div class="spool-list">` +
        recent
          .map(ev => {
            const line = escapeHtml(_recordLine(ev));
            const bracket = line.match(/^(\[[^\]]*\])\s*(.*)$/);
            return `<div class="rec-line">${bracket ? `<span class="rt">${bracket[1]}</span> ${bracket[2]}` : line}</div>`;
          })
          .join('') +
        `</div></div>`;
    }
  }

  // ── Stamped milestone entries (INCIDENT LOG) ──────────────
  // A milestone view over the Terminal Record: the "big moments" only
  // (level-ups, faction standing shifts, quest outcomes) — the chatter
  // (trades/crafts/sleeps) is filtered out, leaving the incidents that matter.
  const incident = document.getElementById('incidentDisplay');
  const MILESTONES = ['level', 'faction', 'quest'];
  const incidents = (state.eventLog || [])
    .filter(ev => ev && MILESTONES.includes(ev.type))
    .slice(-20)
    .reverse();
  if (incident) {
    if (incidents.length === 0) {
      incident.innerHTML = emptyState('NO INCIDENTS ON RECORD — MILESTONES WILL APPEAR HERE');
    } else {
      incident.innerHTML = incidents
        .map(ev => {
          const line = escapeHtml(_recordLine(ev));
          const bracket = line.match(/^(\[[^\]]*\])\s*(.*)$/);
          const bad = ev && ev.type === 'faction' && /vilified|hated|shunned/i.test(ev.text || '');
          return `<div class="incident${bad ? ' milestone-fac bad' : ''}"><span>${bracket ? bracket[2] : line}</span><span class="in-t">${bracket ? bracket[1] : ''}</span></div>`;
        })
        .join('');
    }
  }

  // Board 0i summary line (BUS-18's collapsed-state status row).
  const chronStatusEl = document.getElementById('dbChronStatus');
  if (chronStatusEl) {
    const eventCount = (state.eventLog || []).length;
    chronStatusEl.textContent = `${eventCount} EVENTS ON THE SPOOL · ${incidents.length} INCIDENT STAMPS`;
  }
}
