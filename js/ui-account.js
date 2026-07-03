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

  // P3: supplement the localStorage list with any save slot that lives ONLY in
  // IndexedDB (an oversized save localStorage couldn't hold). Runs before the
  // single innerHTML paint below, so the list is complete with no flash of empty.
  if (window.IdbStore) {
    const haveN = new Set(localSaves.filter(s => s.isSlot).map(s => s.n));
    for (let n = 1; n <= 3; n++) {
      if (haveN.has(n)) continue;
      try {
        const slot = await window.IdbStore.get('campaign', 'slot_' + n);
        if (slot && (slot.savedAt || slot.slotName)) {
          const savedDate = slot.savedAt ? new Date(slot.savedAt).toLocaleDateString() : '';
          localSaves.push({
            id: 'slot_' + n,
            label: (slot.slotName || 'Slot ' + n) + (savedDate ? ': ' + savedDate : ''),
            isSlot: true,
            n,
            gameContext: slot.gameContext || null,
          });
        }
      } catch (_) {}
    }
    localSaves.sort((a, b) => (a.n || 0) - (b.n || 0));
  }

  // FIX 3 (owner report): saves are per-game — only show the ACTIVE game's saves.
  // A slot with no recorded gameContext predates WU-F5 and is shown regardless
  // (can't attribute it to a game, so degrade to showing rather than hiding data).
  // The always-visible "Active" row is exempt — it always reflects whatever game
  // is currently live, so it is per-game by construction.
  const curCtx = typeof getGameContext === 'function' ? getGameContext() : 'FNV';
  const localHiddenCount = localSaves.filter(
    s => s.isSlot && s.gameContext && s.gameContext !== curCtx
  ).length;
  const localSavesShown = localSaves.filter(
    s => !s.isSlot || !s.gameContext || s.gameContext === curCtx
  );

  // P5: per-slot version-history availability. The VERS affordance is offered ONLY
  // when IndexedDB is present AND that slot has ≥1 retained prior revision — so no
  // IDB means no button and save/load is unchanged (fail-safe). Computed before the
  // single innerHTML paint below, so rows render complete with no flash.
  const versionCounts = {};
  if (window.IdbStore && typeof window.readSlotVersions === 'function') {
    for (const s of localSavesShown) {
      if (!s.isSlot) continue;
      try {
        const vs = await window.readSlotVersions(s.n);
        if (vs.length) versionCounts[s.n] = vs.length;
      } catch (_) {}
    }
  }

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

  // FIX 3: same per-game filter, cloud side — a doc with no recorded gameContext
  // predates the field and is shown regardless (same graceful degrade as local).
  const cloudHiddenCount = cloudSaves.filter(
    s => s.data.gameContext && s.data.gameContext !== curCtx
  ).length;
  const cloudSavesShown = cloudSaves.filter(
    s => !s.data.gameContext || s.data.gameContext === curCtx
  );

  if (!localSavesShown.length && !cloudSavesShown.length) {
    const hidden = localHiddenCount + cloudHiddenCount;
    body.innerHTML =
      _archiveHeader +
      emptyState(
        hidden
          ? `NO ARCHIVES FOR ACTIVE GAME (${hidden} archived under other games)`
          : 'NO ARCHIVES ON FILE'
      );
    return;
  }

  const rows = [];

  localSavesShown.forEach(ls => {
    rows.push(
      '<div class="save-row">' +
        '<div class="save-row-label">' +
        '<span class="save-row-tag">[LOCAL]</span>' +
        '<span class="save-row-name">' +
        escapeHtml(ls.label) +
        '</span>' +
        '</div>' +
        (ls.isSlot
          ? '<div class="save-row-actions">' +
            '<button class="btn-sm" onclick="loadFromSlot(' +
            ls.n +
            ')">LOAD</button>' +
            '<button class="btn-sm" onclick="confirmOverwriteSlot(' +
            ls.n +
            ')" aria-label="Overwrite ' +
            escapeHtml(String(ls.label)) +
            ' with your current campaign">OVERWRITE</button>' +
            (versionCounts[ls.n]
              ? '<button class="btn-sm" onclick="viewSlotVersions(' +
                ls.n +
                ')" aria-label="View saved version history for ' +
                escapeHtml(String(ls.label)) +
                '">VER ' +
                versionCounts[ls.n] +
                '</button>'
              : '') +
            '<button class="btn-sm delete-btn" onclick="confirmDeleteSlot(' +
            ls.n +
            ')" aria-label="Delete ' +
            escapeHtml(String(ls.label)) +
            '">DEL</button>' +
            '</div>'
          : '') +
        '</div>'
    );
  });

  cloudSavesShown.forEach(s => {
    const d = s.data;
    const docId = s.id;
    const label = escapeHtml(d.label || (docId === 'main' ? 'Quick Save' : 'Untitled'));
    rows.push(
      '<div class="save-row">' +
        '<div class="save-row-label">' +
        '<span class="save-row-tag">[CLOUD]</span>' +
        '<span class="save-row-name">' +
        label +
        '</span>' +
        '</div>' +
        '<div class="save-row-actions">' +
        '<button class="btn-sm" onclick="window.loadCloudSave(\'' +
        docId +
        '\')">LOAD</button>' +
        '<button class="btn-sm" onclick="window.overwriteCloudSave(\'' +
        docId +
        '\')" aria-label="Overwrite ' +
        label +
        ' with your current campaign">OVERWRITE</button>' +
        (d.versionCount
          ? '<button class="btn-sm" onclick="viewCloudSaveVersions(\'' +
            docId +
            '\')" aria-label="View saved cloud version history for ' +
            label +
            '">VER ' +
            d.versionCount +
            '</button>'
          : '') +
        '<button class="btn-sm" onclick="(function(){var l=prompt(\'Rename:\');if(l)window.renameCloudSave(\'' +
        docId +
        '\',l);})()">NAME</button>' +
        '<button class="btn-sm delete-btn" onclick="window.deleteCloudSave(\'' +
        docId +
        '\')" aria-label="Delete ' +
        label +
        '">DEL</button>' +
        '</div>' +
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
