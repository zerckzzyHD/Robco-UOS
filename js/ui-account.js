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
      '<button class="action-btn" style="width:100%;margin-bottom:4px;" onclick="if(window.syncLocalSavesToCloud)window.syncLocalSavesToCloud()">' +
      '> SYNC LOCAL SAVES TO ACCOUNT</button>' +
      '<button class="action-btn" style="width:100%" onclick="if(window.signOutAccount)window.signOutAccount()">' +
      '> SIGN OUT</button>';
  }
  renderCloudSavePicker();
}

// ── CLOUD SAVE PICKER (Phase 5c-iii) ─────────────────────────────────
// Renders the cloud save list inside #cloudSavePickerBody (ACCOUNT panel).
// Async — fires-and-forgets from loadUI() and renderAccount(); safe to call anytime.
// All user-supplied labels are escaped; Firestore auto-IDs are alphanumeric (safe in onclick).
async function renderCloudSavePicker() {
  const body = document.getElementById('cloudSavePickerBody');
  if (!body) return;

  const acct =
    typeof window.getAccountState === 'function'
      ? window.getAccountState()
      : { uid: null, isAnonymous: true };

  if (!acct.uid || acct.isAnonymous) {
    body.innerHTML = emptyState('Sign in to use cloud saves');
    return;
  }

  body.innerHTML = emptyState('Loading cloud saves...');

  let saves;
  try {
    saves = typeof window.listCloudSaves === 'function' ? await window.listCloudSaves() : [];
  } catch (_) {
    body.innerHTML = emptyState('Failed to load cloud saves');
    return;
  }

  if (!saves.length) {
    body.innerHTML = emptyState('No cloud saves yet — tap Sync Local Saves.');
    return;
  }

  body.innerHTML =
    '<div style="font-size:10px;opacity:0.55;margin-bottom:5px;letter-spacing:1px;">CLOUD SAVES</div>' +
    saves
      .map(s => {
        const d = s.data;
        const docId = s.id;
        const label = escapeHtml(d.label || (docId === 'main' ? 'Quick Save' : 'Untitled'));
        return (
          '<div style="display:flex;align-items:center;gap:3px;margin-bottom:3px;">' +
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
      })
      .join('');
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
