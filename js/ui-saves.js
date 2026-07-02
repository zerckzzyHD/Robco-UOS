function exportCampaignLog(format = 'txt') {
  if (!chatHistory || chatHistory.length === 0) {
    if (typeof openModal === 'function')
      openModal({ title: '> EXPORT LOG', body: 'ERROR: COMM-LINK LOGS EMPTY.' });
    return;
  }

  if (format === 'html') {
    // #41 HTML Campaign Log Export — green-on-black styled HTML matching current optics
    // Read the export foreground from the single-source THEMES table (no duplicate palette),
    // resolved for the ACTIVE game (per-game pick → game default → green) so the export matches
    // the on-screen optic in either game. Falls back to the canon RobCo green.
    const optics = typeof _resolveOptic === 'function' ? _resolveOptic() : 'green';
    const fg = ((typeof THEMES !== 'undefined' && THEMES[optics]) || { hex: '#14fdce' }).hex;
    let rows = chatHistory
      .map(msg => {
        let clean = msg.text
          .replace(/<[^>]*>?/gm, '')
          .replace(/```[a-z]*\n?/gi, '')
          .replace(/```/g, '');
        const label =
          msg.sender === 'user' ? 'COURIER' : msg.sender === 'sys' ? 'SYSTEM' : 'DATABANK';
        const color = msg.sender === 'user' ? '#fff' : msg.sender === 'sys' ? '#f39c12' : fg;
        const safe = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div style="margin-bottom:10px;"><span style="color:${color};opacity:0.6;font-size:11px;">[${label}]</span><br><span style="color:${color};white-space:pre-wrap;">${safe}</span></div>`;
      })
      .join('');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>RobCo U.O.S. Campaign Log</title><style>body{background:#010a07;color:${fg};font-family:'Courier New',monospace;padding:20px;font-size:13px;line-height:1.5;}.header{text-align:center;border-bottom:1px dashed ${fg};padding-bottom:10px;margin-bottom:20px;letter-spacing:2px;}</style></head><body><div class="header"><h1>ROBCO INDUSTRIES U.O.S.<br>AFTER-ACTION CAMPAIGN LOG</h1><p>Courier: ${escapeHtml(state.loc || '?')} | ${formatGameTime(state.ticks || 0)} | Lv.${state.lvl || 1}</p></div>${rows}</body></html>`;
    _downloadBlob(html, 'text/html', 'robco_campaign_log.html');
    return;
  }

  if (format === 'md') {
    // #27 Export as Markdown
    let md = `# RobCo U.O.S. — Campaign Log\n\n`;
    md += `**Location:** ${state.loc || '?'} | **Time:** ${formatGameTime(state.ticks || 0)} | **Level:** ${state.lvl || 1}\n\n---\n\n`;
    chatHistory.forEach(msg => {
      let clean = msg.text
        .replace(/<[^>]*>?/gm, '')
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();
      if (!clean) return;
      const prefix =
        msg.sender === 'user'
          ? '**[COURIER]**'
          : msg.sender === 'sys'
            ? '*[SYSTEM]*'
            : '> [DATABANK]';
      md += `${prefix} ${clean}\n\n`;
    });
    _downloadBlob(md, 'text/markdown', 'robco_campaign_log.md');
    return;
  }

  // Default: plain text (original behavior)
  _downloadBlob(_buildHolotapeText(), 'text/plain', 'robco_campaign_log.txt');
}

// Builds the plain-text "holotape transcript" of the comm-link log. Shared by the
// .txt export (download) path and WU-F3 EJECT HOLOTAPE (Web Share) — Protocol 22.
function _buildHolotapeText() {
  let logStr = '=========================================================\n';
  logStr += '         ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM\n';
  logStr += '                 AFTER-ACTION CAMPAIGN LOG\n';
  logStr += '=========================================================\n\n';
  chatHistory.forEach(msg => {
    let cleanText = msg.text
      .replace(/<[^>]*>?/gm, '')
      .replace(/\x60{3}[a-z]*\n/gi, '')
      .replace(/\x60{3}/g, '');
    if (msg.sender === 'user') logStr += `[COURIER]: ${cleanText}\n\n`;
    else if (msg.sender === 'sys') logStr += `[SYSTEM]: ${cleanText}\n\n`;
    else logStr += `[DATABANK]: ${cleanText}\n\n`;
  });
  return logStr;
}

// ── WU-F3 EJECT HOLOTAPE (Web Share API) ──────────────────────────────────
// Ejects the comm-link log as a "holotape transcript" to the OS share sheet via
// the Web Share API. Free, offline, no AI, game-agnostic (Protocol 38) — it only
// hands plain text to the device's own share UI; carries no game literal. Reuses
// the existing _buildHolotapeText() formatting (Protocol 22). Three-tier graceful
// fallback so it always does *something* useful:
//   1. navigator.share({text}) — native OS share sheet (mobile + some desktops).
//      A user-dismissed sheet (AbortError) is silent — NOT treated as a failure.
//   2. navigator.clipboard.writeText — copy the transcript for manual transmit.
//   3. _downloadBlob — eject the transcript as a local .txt file (the export path).
// Every tier is wrapped so a missing/blocked API can never break the terminal.
function _shareSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
function _clipboardSupported() {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  );
}
async function ejectHolotape() {
  if (!chatHistory || chatHistory.length === 0) {
    if (typeof openModal === 'function')
      openModal({
        title: '> EJECT HOLOTAPE',
        body: 'ERROR: COMM-LINK LOGS EMPTY. NOTHING TO EJECT.',
      });
    return;
  }
  const text = _buildHolotapeText();
  // Tier 1 — native share sheet
  if (_shareSupported()) {
    try {
      await navigator.share({ title: 'RobCo U.O.S. — Holotape Transcript', text });
      return; // shared successfully
    } catch (err) {
      // User dismissed the share sheet — honour the cancel, do not fall through.
      if (err && err.name === 'AbortError') return;
      // Any other share failure falls through to the clipboard tier.
    }
  }
  // Tier 2 — clipboard copy
  if (_clipboardSupported()) {
    try {
      await navigator.clipboard.writeText(text);
      if (typeof appendToChat === 'function') {
        appendToChat('> HOLOTAPE TRANSCRIPT COPIED TO CLIPBOARD — TRANSMIT MANUALLY.', 'sys', true);
      }
      return;
    } catch (_) {
      // Clipboard blocked (permissions/insecure context) — fall through to download.
    }
  }
  // Tier 3 — eject to a local file (always available)
  _downloadBlob(text, 'text/plain', 'robco_holotape_transcript.txt');
  if (typeof appendToChat === 'function') {
    appendToChat('> HOLOTAPE EJECTED TO LOCAL STORAGE — SHARE SHEET UNAVAILABLE.', 'sys', true);
  }
}

function _downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── NOTIFICATION BADGES (#13) ────────────────────────────────────────
// Shows count badges on panel summaries whenever their contents are non-empty.
// Called at end of updateMath() so it always reflects current state.
const SLOT_NAMES = ['A', 'B', 'C'];
function _slotKey(n) {
  return `robco_slot_${n}`;
}
function _slotLabel(n) {
  return `SLOT ${SLOT_NAMES[n - 1]}`;
}

// ── Local save list (synchronous) ────────────────────────────────────────────
// Returns an array of {id, label, isActive|isSlot, n} for the active save + slots 1-3.
// Co-located with the slot-schema helpers (_slotKey/_slotLabel) so a slot-key or
// slot-count change touches only this file (DUP-2). Consumed by ui-account.js's
// renderSavesList() as a global.
function listLocalSaves() {
  const saves = [];
  const v8raw = localStorage.getItem('robco_v8');
  if (v8raw) {
    try {
      const v8 = JSON.parse(v8raw);
      const ctx = v8.activeContext || 'FNV';
      saves.push({ id: 'active', label: 'Active (' + ctx + ')', isActive: true });
    } catch (_) {}
  }
  for (let n = 1; n <= 3; n++) {
    const slotRaw = localStorage.getItem(_slotKey(n));
    if (!slotRaw) continue;
    try {
      const slot = JSON.parse(slotRaw);
      const slotName = slot.slotName || 'Slot ' + n;
      const savedDate = slot.savedAt ? new Date(slot.savedAt).toLocaleDateString() : '';
      saves.push({
        id: 'slot_' + n,
        label: slotName + (savedDate ? ': ' + savedDate : ''),
        isSlot: true,
        n,
      });
    } catch (_) {}
  }
  return saves;
}

// P3: async — the slot is written IDB-PRIMARY (js/state.js _coldWriteObj: IDB
// 'campaign' store, no ~5MB ceiling) with a best-effort localStorage mirror. A
// localStorage quota failure is no longer fatal: the save persists to IDB, so a
// slot too large for localStorage is now saved instead of lost (ceiling relief).
async function saveToSlot(slotNum) {
  syncStateFromDom();
  // P5: capture the slot's CURRENT contents as a retained prior revision BEFORE it
  // is overwritten (per-slot version ring, IDB-only — rides the P3 IndexedDB
  // headroom, never the localStorage ceiling). Best-effort + fail-safe: no IDB or
  // an empty slot → nothing captured and the save below is byte-identical to today.
  if (window.IdbStore && typeof window.pushSlotVersion === 'function') {
    try {
      const _prior =
        typeof window._coldReadObj === 'function'
          ? await window._coldReadObj(_slotKey(slotNum), 'slot_' + slotNum)
          : null;
      if (_prior) await window.pushSlotVersion(slotNum, _prior);
    } catch (_) {}
  }
  const _slotState = JSON.parse(JSON.stringify(state));
  const _slotChat = chatHistory.slice(-200);
  const _slotPlaystyle = localStorage.getItem('robco_playstyle') || 'any';
  const envelope = {
    version: APP_VERSION,
    schemaVersion: APP_VERSION,
    state: _slotState,
    chat: _slotChat,
    playstyle: _slotPlaystyle,
    savedAt: Date.now(),
    slotName: _slotLabel(slotNum),
    gameContext: state.gameContext || 'FNV', // F5: store game context in envelope
  };
  if (typeof window.computeSaveChecksum === 'function') {
    envelope.checksum = window.computeSaveChecksum(_slotState, _slotChat, _slotPlaystyle);
  }
  const ok =
    typeof window._coldWriteObj === 'function'
      ? await window._coldWriteObj(_slotKey(slotNum), 'slot_' + slotNum, envelope)
      : (function () {
          try {
            localStorage.setItem(_slotKey(slotNum), JSON.stringify(envelope));
            return true;
          } catch (_) {
            return false;
          }
        })();
  if (ok) {
    const el = document.getElementById('slotStatus');
    const ts = new Date(envelope.savedAt).toLocaleTimeString();
    const ctx = envelope.gameContext;
    if (el) el.textContent = `${_slotLabel(slotNum)} [${ctx}] saved at ${ts}`;
    appendToChat(`> [SAVE] ${_slotLabel(slotNum)} [${ctx}] written at ${ts}`, 'sys', true);
  } else {
    appendToChat('> [ERROR] Save slot write failed — storage unavailable.', 'sys', true);
  }
}

async function loadFromSlot(slotNum) {
  // P3: IDB-PRIMARY read — the newer of {IDB 'campaign' slot, localStorage} wins
  // (_coldReadObj), so an oversized slot saved only to IDB still loads, and a
  // partial-write divergence can never surface a stale save.
  let env =
    typeof window._coldReadObj === 'function'
      ? await window._coldReadObj(_slotKey(slotNum), 'slot_' + slotNum)
      : null;
  if (!env) {
    const raw = localStorage.getItem(_slotKey(slotNum));
    if (raw) {
      try {
        env = JSON.parse(raw);
      } catch (_) {}
    }
  }
  if (!env) {
    appendToChat(`> [LOAD] ${_slotLabel(slotNum)} is empty.`, 'sys', true);
    return;
  }
  try {
    await _applySlotEnvelope(env, slotNum);
  } catch (e) {
    appendToChat('> [ERROR] Save slot corrupted or unreadable.', 'sys', true);
  }
}

// _applySlotEnvelope(env, slotNum, opts) — the SHARED verify → context-check →
// snap → migrate → apply → loadUI core for a slot-shaped save envelope. Extracted
// verbatim from loadFromSlot so that loadFromSlot AND restoreSlotVersion (P5) run
// the EXACT same state-replacing path (Protocol 22 — one apply implementation, no
// parallel copy). Returns true when applied, false if the user cancelled at an
// integrity or context confirm gate (matching loadFromSlot's original early
// returns — nothing ran after the apply block, so behavior is unchanged). The
// optional opts.verb customises only the closing status wording.
async function _applySlotEnvelope(env, slotNum, opts) {
  opts = opts || {};
  // Integrity + forward-compat check before applying
  if (typeof window.verifySaveEnvelope === 'function') {
    const integrity = window.verifySaveEnvelope(env);
    if (integrity.status === 'future_version') {
      const ok = await confirmAction({
        title: '> VERSION MISMATCH',
        warning: `This save was made on a newer version of RobCo (v${integrity.version}).\nYour app is on v${APP_VERSION}.\n\nLoading may cause data loss — update the app first.\n\nForce-load anyway?`,
        confirmLabel: 'FORCE-LOAD',
      });
      if (!ok) return false;
    } else if (integrity.status === 'checksum_mismatch') {
      const ok = await confirmAction({
        title: '> SAVE INTEGRITY WARNING',
        warning:
          'This save may be corrupt or was edited outside the app.\n\nLoad anyway? (Data may be incomplete or incorrect.)',
        confirmLabel: 'LOAD ANYWAY',
      });
      if (!ok) return false;
    }
  }
  // F5: Warn on gameContext mismatch between slot and current session
  const slotCtx = env.gameContext || env.state?.gameContext || 'FNV';
  const curCtx = state.gameContext || 'FNV';
  if (slotCtx !== curCtx) {
    const ok = await confirmAction({
      title: '> CONTEXT MISMATCH',
      warning: `This save is a ${slotCtx} campaign.\nYou are currently in ${curCtx} mode.\n\nLoading will switch to ${slotCtx}. Continue?`,
      confirmLabel: 'SWITCH & LOAD',
    });
    if (!ok) return false;
  }
  // Snapshot current state as rolling backup before replacing
  if (typeof window.snapRollingBackup === 'function') window.snapRollingBackup();
  if (typeof migrateState === 'function') env.state = migrateState(env.version || '1.0', env.state);
  state = { ...state, ...env.state };
  if (env.chat && Array.isArray(env.chat)) restoreChatHistory(env.chat);
  if (env.playstyle) {
    localStorage.setItem('robco_playstyle', env.playstyle);
    if (typeof window._invalidateCommCache === 'function') window._invalidateCommCache();
    let el = document.getElementById('playstyleInput');
    if (el) el.value = env.playstyle;
  }
  loadUI();
  const ts = env.savedAt ? new Date(env.savedAt).toLocaleString() : 'unknown';
  const ctx = slotCtx;
  const verb = opts.verb || 'restored';
  appendToChat(`> [LOAD] ${_slotLabel(slotNum)} [${ctx}] ${verb}. Saved: ${ts}`, 'sys', true);
  const statusEl = document.getElementById('slotStatus');
  if (statusEl) statusEl.textContent = `${_slotLabel(slotNum)} [${ctx}] loaded (saved: ${ts})`;
  return true;
}

// ── SAVE VERSION HISTORY VIEWER + RESTORE (P5) ───────────────────────
// viewSlotVersions() lists a slot's retained prior revisions in the shared modal;
// each row RESTORES that revision. IDB-only + fail-safe — never offered when
// IndexedDB is absent (readSlotVersions returns []). Restoring a prior version is
// DESTRUCTIVE to the live campaign → confirm-gated (Protocol 34) and routed through
// the SAME _applySlotEnvelope core as loadFromSlot (verifySaveEnvelope integrity
// check + snapRollingBackup-before-apply + migrateState). Bounded render (cap
// SLOT_VERSION_CAP), single innerHTML (no flash), escapeHtml on every dynamic
// field. Game-agnostic (Protocol 38) — labels come from the envelope, no literals.
async function viewSlotVersions(slotNum) {
  if (typeof window.readSlotVersions !== 'function' || typeof openModal !== 'function') return;
  const versions = await window.readSlotVersions(slotNum);
  if (!versions.length) {
    openModal({
      title: '> VERSION HISTORY — ' + _slotLabel(slotNum),
      body: '<div style="opacity:0.6;font-size:11px;">NO PRIOR VERSIONS ON FILE</div>',
    });
    return;
  }
  const rows = versions
    .map((v, i) => {
      const ts = v && v.savedAt ? new Date(v.savedAt).toLocaleString() : 'unknown';
      const ctx = String((v && (v.gameContext || (v.state && v.state.gameContext))) || '');
      return (
        '<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">' +
        '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;">' +
        escapeHtml(i + 1 + '. ' + ts + (ctx ? ' [' + ctx + ']' : '')) +
        '</span>' +
        '<span style="flex-shrink:0;"><button class="btn-sm" onclick="restoreSlotVersion(' +
        slotNum +
        ',' +
        i +
        ')" aria-label="Restore this saved version of ' +
        escapeHtml(_slotLabel(slotNum)) +
        '">RESTORE</button></span>' +
        '</div>'
      );
    })
    .join('');
  openModal({
    title: '> VERSION HISTORY — ' + _slotLabel(slotNum),
    body: '<div>' + rows + '</div>',
  });
}

async function restoreSlotVersion(slotNum, index) {
  if (typeof window.readSlotVersions !== 'function') return;
  const versions = await window.readSlotVersions(slotNum);
  const env = versions[index];
  if (!env) {
    appendToChat('> [LOAD] That version is no longer available.', 'sys', true);
    return;
  }
  const ts = env.savedAt ? new Date(env.savedAt).toLocaleString() : 'unknown';
  const ok = await confirmAction({
    title: '> RESTORE VERSION',
    warning: `Restore ${_slotLabel(slotNum)} to the version saved ${ts}?\n\nThis REPLACES your current campaign state. A rolling backup of the current state is taken first, so this can be undone.`,
    confirmLabel: 'RESTORE VERSION',
  });
  if (!ok) return;
  try {
    await _applySlotEnvelope(env, slotNum, { verb: 'version restored' });
  } catch (_) {
    appendToChat('> [ERROR] Version restore failed — data unreadable.', 'sys', true);
  }
  if (typeof renderSavesList === 'function') renderSavesList();
}

// ── QUEST LOG HELPERS (#1) ──────────────────────────────────────────
function addQuest() {
  const name = ((document.getElementById('newQuestName') || {}).value?.trim() || '').slice(0, 100);
  if (!name) return;
  const status = (document.getElementById('newQuestStatus') || {}).value || 'active';
  const obj = (document.getElementById('newQuestObjective') || {}).value?.trim() || null;
  if (!state.quests) state.quests = [];
  state.quests.push({ name, status, objective: obj });
  document.getElementById('newQuestName').value = '';
  document.getElementById('newQuestObjective').value = '';
  renderQuests();
  updateMath();
}

// ── SESSION STATISTICS HELPERS (#8) ────────────────────────────────
function resetSessionStats() {
  state.stats = { kills: 0, capsEarned: 0, damageDealt: 0, sessionStart: Date.now() };
  saveState();
  renderSessionStats();
}

// ── TOKEN BUDGET DISPLAY (#17) ────────────────────────────────────────
// Rough estimate: 1 token ≈ 4 chars. Updates on textarea input.
function updateTokenBudget() {
  const el = document.getElementById('tokenBudgetDisplay');
  if (!el) return;
  const model = (document.getElementById('apiModelInput') || {}).value || '';
  const ctxLimit = model.includes('1.5') ? 1000000 : model.includes('2.0') ? 1000000 : 128000;
  // Estimate: system directive (~2,875 tokens) + databaseCSVs (~3,200 tokens, now always in systemInstruction) + chat history + state + user input
  const directiveEst = 6500;
  const chatEst = Math.round(chatHistory.reduce((a, m) => a + m.text.length, 0) / 4);
  const stateEst = Math.round(JSON.stringify(state).length / 4);
  const inputEst = Math.round((document.getElementById('chatInput')?.value?.length || 0) / 4);
  const total = directiveEst + chatEst + stateEst + inputEst;
  const pct = Math.round((total / ctxLimit) * 100);
  el.textContent = `~${total.toLocaleString()} / ${(ctxLimit / 1000).toFixed(0)}K tokens (${pct}%)`;
  el.style.color =
    pct > 80 ? 'var(--robco-danger)' : pct > 50 ? 'var(--robco-alert)' : 'var(--robco-blue)';
}

function triggerFileInput() {
  document.getElementById('fileInput').click();
}

// ── RESTORE ROLLING BACKUP ─────────────────────────────────────────
// Presents the rolling backup ring and lets the user restore one — confirm-gated,
// routed through sanitizeImportedContainer + migrateState (Protocol 34).
async function restoreRollingBackup() {
  if (typeof window.getRollingBackupsAsync !== 'function') return;
  // IDB-primary union — surfaces a backup that survives in IndexedDB even if the
  // localStorage ring dropped it under quota (P3 ceiling relief).
  const backups = await window.getRollingBackupsAsync();
  if (!backups.length) {
    if (typeof openModal === 'function')
      openModal({ title: '> RESTORE BACKUP', body: 'NO BACKUP SAVES AVAILABLE' });
    return;
  }
  const listStr = backups.map((b, i) => `${i + 1}. ${b.label}`).join('\n');
  const choice = prompt(
    `>> SELECT BACKUP TO RESTORE:\n\n${listStr}\n\nEnter number (1–${backups.length}) or Cancel:`
  );
  if (!choice) return;
  const n = parseInt(choice);
  if (isNaN(n) || n < 1 || n > backups.length) {
    if (typeof openModal === 'function')
      openModal({ title: '> RESTORE BACKUP', body: 'INVALID SELECTION' });
    return;
  }
  const backup = backups[n - 1];
  const ok = await confirmAction({
    title: '> RESTORE BACKUP',
    warning: `Restore backup from ${backup.label}?\n\nThis replaces your current campaign state.`,
    confirmLabel: 'RESTORE',
  });
  if (!ok) return;
  _restoreBackupApply(backup);
}

// _restoreBackupApply(backup) — the synchronous sanitize → migrate → write core,
// separated from the confirm gate so it is directly testable without mocking
// confirmAction() (Step 2 Phase 0 U12 split — mirrors _craftPrepare/_craftApply).
function _restoreBackupApply(backup) {
  try {
    const data = backup.data;
    const sanitized =
      typeof sanitizeImportedContainer === 'function'
        ? sanitizeImportedContainer(data.robco_v8)
        : data.robco_v8;
    if (typeof migrateState === 'function' && sanitized && sanitized.campaigns) {
      Object.keys(sanitized.campaigns).forEach(ctx => {
        sanitized.campaigns[ctx] = migrateState(data.version || '1.0', sanitized.campaigns[ctx]);
      });
    }
    localStorage.setItem('robco_v8', JSON.stringify(sanitized));
    if (data.chat && Array.isArray(data.chat))
      localStorage.setItem('robco_chat', JSON.stringify(data.chat));
    if (data.playstyle) localStorage.setItem('robco_playstyle', data.playstyle);
    // Guard the impending reload's beforeunload flush (clobber regression).
    window._loadingSave = true;
    if (typeof openModal === 'function')
      openModal({ title: '> RESTORE BACKUP', body: 'BACKUP RESTORED. REBOOTING SYSTEM...' });
    setTimeout(() => window.location.reload(), 2000);
  } catch (_) {
    appendToChat('> [SYS-ALERT: BACKUP RESTORE FAILED]', 'sys');
  }
}
function restoreChatHistory(history) {
  chatHistory = history.slice(-CHAT_MAX);
  const chatBox = document.getElementById('chatDisplay');
  if (chatBox) {
    chatBox.innerHTML = '';
    chatHistory.forEach(msg => appendToChat(msg.text, msg.sender, true));
  }
  clearTimeout(_chatSaveTimer);
  localStorage.setItem('robco_chat', JSON.stringify(chatHistory));
}
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.robco_v8) {
        // v8 Container payload — integrity check + rolling backup before applying
        if (typeof window.verifySaveEnvelope === 'function') {
          const _fi = window.verifySaveEnvelope(parsed);
          if (_fi.status === 'future_version') {
            const ok = await confirmAction({
              title: '> VERSION MISMATCH',
              warning: `This save was made on a newer version of RobCo (v${_fi.version}).\nYour app is on v${APP_VERSION}.\n\nLoading may cause data loss — update the app first.\n\nForce-load anyway?`,
              confirmLabel: 'FORCE-LOAD',
            });
            if (!ok) return;
          } else if (_fi.status === 'checksum_mismatch') {
            const ok = await confirmAction({
              title: '> SAVE INTEGRITY WARNING',
              warning:
                'This save may be corrupt or was edited outside the app.\n\nLoad anyway? (Data may be incomplete or incorrect.)',
              confirmLabel: 'LOAD ANYWAY',
            });
            if (!ok) return;
          }
        }
        if (typeof window.snapRollingBackup === 'function') window.snapRollingBackup();
        const _sanitized =
          typeof sanitizeImportedContainer === 'function'
            ? sanitizeImportedContainer(parsed.robco_v8)
            : parsed.robco_v8;
        localStorage.setItem('robco_v8', JSON.stringify(_sanitized));
        if (parsed.chat && Array.isArray(parsed.chat))
          localStorage.setItem('robco_chat', JSON.stringify(parsed.chat));
        if (parsed.playstyle) localStorage.setItem('robco_playstyle', parsed.playstyle);
        // Guard the impending reload's beforeunload flush so stale in-memory state
        // can't overwrite the robco_v8 we just imported (clobber regression).
        window._loadingSave = true;
        if (typeof openModal === 'function')
          openModal({
            title: '> IMPORT SAVE',
            body: 'HARD BACKUP RESTORED SUCCESSFULLY. REBOOTING SYSTEM...',
          });
        setTimeout(() => window.location.reload(), 2000);
      } else if (parsed.version && parsed.state) {
        // Envelope format (v1.6.3+): contains state, chat, playstyle
        autoImportState(JSON.stringify(parsed.state));
        if (parsed.chat && Array.isArray(parsed.chat)) restoreChatHistory(parsed.chat);
        if (parsed.playstyle) {
          localStorage.setItem('robco_playstyle', parsed.playstyle);
          let el = document.getElementById('playstyleInput');
          if (el) el.value = parsed.playstyle;
        }
        if (typeof openModal === 'function')
          openModal({ title: '> IMPORT SAVE', body: 'LEGACY BACKUP RESTORED SUCCESSFULLY' });
      } else {
        // Legacy: bare state JSON
        autoImportState(e.target.result);
        if (typeof openModal === 'function')
          openModal({ title: '> IMPORT SAVE', body: 'LEGACY BACKUP RESTORED SUCCESSFULLY' });
      }
    } catch (err) {
      appendToChat('> [SYS-ALERT: SAVE FILE CORRUPTED OR UNREADABLE]', 'sys');
    }
  };
  reader.readAsText(file);
}

function triggerImageUpload() {
  document.getElementById('imageInput').click();
}
function handleImageSelection(event) {
  const file = event.target.files[0];
  if (!file) return;
  attachedImageMimeType = file.type;
  const reader = new FileReader();
  reader.onload = function (e) {
    attachedImageData = e.target.result;
    const preview = document.getElementById('imagePreview');
    preview.src = attachedImageData;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ── REGISTRY AUTOCOMPLETE (Phase 3) ──────────────────────────────────────────
/**
 * Shared singleton autocomplete panel for registry-backed text inputs.
 * Wires #newQuestName  → quests  category
 *       #newItemName   → items   category
 *
 * Behaviour:
 *  - Triggers after 2+ chars, debounced 150 ms.
 *  - Keyboard: ArrowUp / ArrowDown to navigate, Enter to select, Escape to dismiss.
 *  - Click item to fill and dismiss.
 *  - Dismisses automatically on blur (after a 100 ms grace for click events).
 *  - Does NOT modify state, save, or undo — pure UI read-only helper.
 */
function initRegistryAutocomplete() {
  // Build the singleton panel once
  var panel = document.getElementById('acPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'acPanel';
    panel.className = 'autocomplete-panel';
    panel.setAttribute('role', 'listbox');
    document.body.appendChild(panel);
  }

  var _acTimer = null;
  var _acActiveIdx = -1;
  var _acResults = [];
  var _acCurrentInput = null;

  function acHide() {
    panel.classList.remove('ac-visible');
    _acActiveIdx = -1;
    _acResults = [];
    _acCurrentInput = null;
  }

  function acPosition(inputEl) {
    var rect = inputEl.getBoundingClientRect();
    panel.style.top = rect.bottom + 2 + 'px';
    panel.style.left = rect.left + 'px';
    // Clamp to viewport right edge
    var panelW = Math.min(340, Math.max(220, rect.width));
    panel.style.width = panelW + 'px';
  }

  function acRender(results, inputEl) {
    _acResults = results;
    _acActiveIdx = -1;
    panel.innerHTML = '';

    if (!results.length) {
      var empty = document.createElement('div');
      empty.className = 'ac-empty';
      empty.textContent = 'No matches';
      panel.appendChild(empty);
    } else {
      results.forEach(function (entry, i) {
        var item = document.createElement('div');
        item.className = 'ac-item';
        item.setAttribute('role', 'option');
        item.dataset.idx = i;

        var nameSpan = document.createElement('span');
        nameSpan.className = 'ac-item-name';
        nameSpan.textContent = entry.name;

        var tagSpan = document.createElement('span');
        tagSpan.className = 'ac-item-tag';
        // Show type or dlc as a tag hint
        var tag = entry.type || '';
        if (entry.dlc) tag += ' [' + entry.dlc.toUpperCase() + ']';
        if (entry.level > 0) tag += ' L' + entry.level;
        tagSpan.textContent = tag;

        item.appendChild(nameSpan);
        if (tag) item.appendChild(tagSpan);

        item.addEventListener('mousedown', function (e) {
          // Use mousedown so it fires before blur
          e.preventDefault();
          if (_acCurrentInput) {
            _acCurrentInput.value = entry.name;
            // Trigger input event so any live listeners see the change
            _acCurrentInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          acHide();
        });

        panel.appendChild(item);
      });
    }

    acPosition(inputEl);
    panel.classList.add('ac-visible');
  }

  function acSetActive(idx) {
    var items = panel.querySelectorAll('.ac-item');
    items.forEach(function (el) {
      el.classList.remove('ac-active');
    });
    if (idx >= 0 && idx < items.length) {
      items[idx].classList.add('ac-active');
      items[idx].scrollIntoView({ block: 'nearest' });
    }
    _acActiveIdx = idx;
  }

  function wireInput(inputId, category) {
    var el = document.getElementById(inputId);
    if (!el) return;
    if (typeof registrySearch !== 'function') return;

    el.addEventListener('input', function () {
      clearTimeout(_acTimer);
      var q = el.value;
      if (q.length < 2) {
        acHide();
        return;
      }
      _acCurrentInput = el;
      _acTimer = setTimeout(function () {
        var results = registrySearch(category, q);
        acRender(results, el);
      }, 150);
    });

    el.addEventListener('keydown', function (e) {
      if (!panel.classList.contains('ac-visible')) return;
      var itemCount = _acResults.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acSetActive(Math.min(_acActiveIdx + 1, itemCount - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acSetActive(Math.max(_acActiveIdx - 1, 0));
      } else if (e.key === 'Enter') {
        if (_acActiveIdx >= 0 && _acResults[_acActiveIdx]) {
          e.preventDefault();
          el.value = _acResults[_acActiveIdx].name;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          acHide();
        }
      } else if (e.key === 'Escape') {
        acHide();
      }
    });

    el.addEventListener('blur', function () {
      // 100 ms grace: mousedown on an item fires before blur resolves
      setTimeout(acHide, 120);
    });

    el.addEventListener('focus', function () {
      // Reopen if there's already enough text (e.g. user tabbed back)
      var q = el.value;
      if (q.length >= 2) {
        _acCurrentInput = el;
        var results = registrySearch(category, q);
        if (results.length) acRender(results, el);
      }
    });
  }

  // Wire all three registry-backed inputs
  wireInput('newQuestName', 'quests');
  wireInput('newItemName', 'items');
  wireInput('newPerkName', 'perks');

  // Reposition on scroll/resize so the panel doesn't orphan
  window.addEventListener(
    'scroll',
    function () {
      if (_acCurrentInput && panel.classList.contains('ac-visible')) {
        acPosition(_acCurrentInput);
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', function () {
    if (_acCurrentInput && panel.classList.contains('ac-visible')) {
      acPosition(_acCurrentInput);
    }
  });
}

// ── AMMO DATALIST ─────────────────────────────────────────────────────────
// Populates the #ammoCalibers <datalist> with unique caliber names from
// AMMO.CSV in database.js. Called once on window.onload.
function initAmmoDatalist() {
  const dl = document.getElementById('ammoCalibers');
  if (!dl) return;
  if (typeof getAmmoCalibers !== 'function') return;
  const calibers = getAmmoCalibers();
  dl.innerHTML = calibers.map(c => `<option value="${c}"></option>`).join('');
}

// ── LOCATION DATALIST ──────────────────────────────────────────────────────
// Populates the #locationOptions <datalist> from the active game's registry.
// Called once on window.onload — game context switch triggers a full reload
// which re-runs this against the freshly loaded FALLOUT_REGISTRY.
function initLocationDatalist() {
  const dl = document.getElementById('locationOptions');
  if (!dl || typeof FALLOUT_REGISTRY === 'undefined' || !Array.isArray(FALLOUT_REGISTRY.locations))
    return;
  dl.innerHTML = FALLOUT_REGISTRY.locations
    .map(l => `<option value="${escapeHtml(l.name)}"></option>`)
    .join('');
}
