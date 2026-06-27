// ── Local save list (synchronous) ────────────────────────────────────────────
// Returns an array of {id, label, isSlot, n} for the active save + slots 1-3.
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
    const slotRaw = localStorage.getItem('robco_slot_' + n);
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
        '<div style="font-size:11px;opacity:0.7;margin-bottom:8px;">NOT SIGNED IN — saves are local only.</div>' +
        '<div style="font-size:11px;opacity:0.5;padding:6px 0;">SIGN-IN TEMPORARILY UNAVAILABLE — local saves active.</div>';
    } else {
      body.innerHTML =
        '<div style="font-size:11px;opacity:0.7;margin-bottom:8px;">NOT SIGNED IN — saves are local only.</div>' +
        '<button class="action-btn" style="width:100%" onclick="if(window.signInWithGoogle)window.signInWithGoogle()">' +
        '> SIGN IN WITH GOOGLE (SYNC ACROSS DEVICES)</button>';
    }
  } else {
    const name = acct.displayName ? escapeHtml(acct.displayName) : '';
    const email = acct.email ? escapeHtml(acct.email) : '';
    body.innerHTML =
      '<div style="font-size:11px;margin-bottom:4px;">SIGNED IN</div>' +
      (name
        ? '<div style="font-size:11px;opacity:0.85;margin-bottom:2px;">' + name + '</div>'
        : '') +
      (email
        ? '<div style="font-size:11px;opacity:0.6;margin-bottom:8px;">' + email + '</div>'
        : '') +
      '<button class="action-btn" style="width:100%" onclick="if(window.signOutAccount)window.signOutAccount()">' +
      '> SIGN OUT</button>';
  }
}

// ── Unified Saves List (Phase 6 Task 7) ──────────────────────────────────────
// Mounts to #savesListBody in Security & Configuration panel.
// Shows [LOCAL] rows (always) and [CLOUD] rows (when signed in).
// Replaces the old renderCloudSavePicker() which only showed cloud saves in ACCOUNT.
async function renderSavesList() {
  const body = document.getElementById('savesListBody');
  if (!body) return;

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
    body.innerHTML = emptyState('Loading saves...');
    try {
      cloudSaves = await window.listCloudSaves();
    } catch (_) {
      body.innerHTML = emptyState('Failed to load cloud saves');
      return;
    }
  }

  if (!localSaves.length && !cloudSaves.length) {
    body.innerHTML = emptyState('No saves found.');
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

  body.innerHTML = rows.join('');
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
