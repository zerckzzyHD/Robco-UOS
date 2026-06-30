// listLocalSaves() — the synchronous local-save lister — lives in ui-saves.js
// (co-located with the slot-schema helpers _slotKey/_slotLabel). renderSavesList()
// below calls it as a global. (DUP-2 consolidation, WU-B7.)

function renderAccount() {
  const body = document.getElementById('accountBody');
  if (!body) return;
  const acct =
    typeof window.getAccountState === 'function'
      ? window.getAccountState()
      : { uid: null, isAnonymous: true, email: null, displayName: null };
  if (acct.isAnonymous || !acct.uid) {
    if (typeof window.isFeatureEnabled === 'function' && !window.isFeatureEnabled('googleSignIn')) {
      body.innerHTML =
        '<div style="font-size:11px;opacity:0.7;margin-bottom:8px;">UPLINK OFFLINE — ARCHIVES STORED LOCALLY</div>' +
        '<div style="font-size:11px;opacity:0.5;padding:6px 0;">UPLINK TEMPORARILY UNAVAILABLE — LOCAL ARCHIVES ACTIVE.</div>';
    } else {
      body.innerHTML =
        '<div style="font-size:11px;opacity:0.7;margin-bottom:8px;">UPLINK OFFLINE — ARCHIVES STORED LOCALLY</div>' +
        '<button class="action-btn" style="width:100%" onclick="if(window.signInWithGoogle)window.signInWithGoogle()">' +
        '> ESTABLISH GOOGLE UPLINK — SYNC TELEMETRY ACROSS TERMINALS</button>';
    }
  } else {
    const name = acct.displayName ? escapeHtml(acct.displayName) : '';
    const email = acct.email ? escapeHtml(acct.email) : '';
    body.innerHTML =
      '<div style="font-size:11px;margin-bottom:4px;">UPLINK ACTIVE</div>' +
      (name
        ? '<div style="font-size:11px;opacity:0.85;margin-bottom:2px;">' + name + '</div>'
        : '') +
      (email
        ? '<div style="font-size:11px;opacity:0.6;margin-bottom:8px;">' + email + '</div>'
        : '') +
      '<button class="action-btn" style="width:100%" onclick="if(window.signOutAccount)window.signOutAccount()">' +
      '> SEVER UPLINK</button>';
  }
}

// ── Unified Saves List (Phase 6 Task 7) ──────────────────────────────────────
// Mounts to #savesListBody in Security & Configuration panel.
// Shows [LOCAL] rows (always) and [CLOUD] rows (when signed in).
// Replaces the old renderCloudSavePicker() which only showed cloud saves in ACCOUNT.
async function renderSavesList() {
  const body = document.getElementById('savesListBody');
  if (!body) return;

  // WU-T3: per-game save-manager identity header — saveLabel from GAME_DEFS[ctx].theme,
  // data-driven (Protocol 38; a new game just supplies the string). Fail-safe to a generic
  // label, escaped, diegetic. Prepended to the archive list (and the empty state).
  const _saveTheme = (typeof _activeDef === 'function' && _activeDef().theme) || {};
  const _archiveHeader =
    '<div class="saves-archive-header">&gt; ' +
    escapeHtml(String(_saveTheme.saveLabel || 'CAMPAIGN ARCHIVE').toUpperCase()) +
    '</div>';

  const acct =
    typeof window.getAccountState === 'function'
      ? window.getAccountState()
      : { uid: null, isAnonymous: true };

  const isSignedIn = !!(acct.uid && !acct.isAnonymous);

  // Show/hide cloud action buttons based on auth state
  const btnSave = document.getElementById('btnSaveToCloud');
  const btnSync = document.getElementById('btnSyncSlotsToCloud');
  if (btnSave) btnSave.style.display = isSignedIn ? '' : 'none';
  if (btnSync) btnSync.style.display = isSignedIn ? '' : 'none';

  const localSaves = listLocalSaves();

  let cloudSaves = [];
  if (isSignedIn && typeof window.listCloudSaves === 'function') {
    body.innerHTML = emptyState('RETRIEVING ARCHIVES…');
    try {
      cloudSaves = await window.listCloudSaves();
    } catch (_) {
      body.innerHTML = emptyState('⚠ ARCHIVE LINK FAILED');
      return;
    }
  }

  if (!localSaves.length && !cloudSaves.length) {
    body.innerHTML = _archiveHeader + emptyState('NO ARCHIVES ON FILE');
    return;
  }

  const rows = [];

  localSaves.forEach(ls => {
    rows.push(
      '<div style="display:flex;align-items:center;gap:3px;margin-bottom:3px;">' +
        '<span style="font-size:9px;opacity:0.5;flex-shrink:0;margin-right:2px;">[LOCAL]</span>' +
        '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;">' +
        escapeHtml(ls.label) +
        '</span>' +
        (ls.isSlot
          ? '<span style="flex-shrink:0;"><button class="btn-sm" onclick="loadFromSlot(' +
            ls.n +
            ')">LOAD</button></span>'
          : '') +
        '</div>'
    );
  });

  cloudSaves.forEach(s => {
    const d = s.data;
    const docId = s.id;
    const label = escapeHtml(d.label || (docId === 'main' ? 'Quick Save' : 'Untitled'));
    rows.push(
      '<div style="display:flex;align-items:center;gap:3px;margin-bottom:3px;">' +
        '<span style="font-size:9px;opacity:0.5;flex-shrink:0;margin-right:2px;">[CLOUD]</span>' +
        '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;">' +
        label +
        '</span>' +
        '<span style="flex-shrink:0;display:flex;gap:2px;">' +
        '<button class="btn-sm" onclick="window.loadCloudSave(\'' +
        docId +
        '\')">LOAD</button>' +
        '<button class="btn-sm" onclick="(function(){var l=prompt(\'Rename:\');if(l)window.renameCloudSave(\'' +
        docId +
        '\',l);})()">NAME</button>' +
        '<button class="btn-sm delete-btn" onclick="window.deleteCloudSave(\'' +
        docId +
        '\')">DEL</button>' +
        '</span>' +
        '</div>'
    );
  });

  if (!isSignedIn) {
    rows.push(
      '<div style="font-size:10px;opacity:0.45;margin-top:4px;">Sign in via Account to sync saves to cloud.</div>'
    );
  }

  body.innerHTML = _archiveHeader + rows.join('');
}

function undoLastSync() {
  try {
    if (window._lastStateBeforeSync) {
      let prev = JSON.parse(window._lastStateBeforeSync);
      state = { ...state, ...prev };
      window._lastStateBeforeSync = null;
      let undoBtn = document.getElementById('undoSyncBtn');
      if (undoBtn) undoBtn.style.display = 'none';
      loadUI();
      appendToChat('> STATE ROLLBACK COMPLETE. PREVIOUS TELEMETRY RESTORED.', 'sys', true);
    } else if (
      typeof window.getRollingBackups === 'function' &&
      window.getRollingBackups().length > 0
    ) {
      restoreRollingBackup();
    } else {
      appendToChat('> NO RECENT SYNC TO UNDO.', 'sys', true);
    }
  } catch (e) {
    appendToChat('> ROLLBACK FAILED: DATA CORRUPTED.', 'sys', true);
  }
}
