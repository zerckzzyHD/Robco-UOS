// SRI (Subresource Integrity) cannot be applied to ES module import statements in JS source —
// there is no HTML element to attach an integrity= attribute to. The version pin @12.15.0
// is the primary supply-chain mitigation; updates are always deliberate (no floating 'latest').
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithCredential,
  signOut,
  getRedirectResult,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app-check.js';

// ── App Check reCAPTCHA v3 site key ─────────────────────────────────────────
// IMPORTANT: Replace this placeholder with the real key from the Firebase console
// (App Check → Register App → reCAPTCHA v3) before pushing to production.
// App Check initialization is skipped while this placeholder string is present,
// so the app stays fully functional without the real key configured.
const RECAPTCHA_V3_SITE_KEY = '6LdEhzctAAAAAKPi-QarEVtKnkJd6q9CJxYA6NDt';

const firebaseConfig = {
  apiKey: 'AIzaSyCm4Pdxn9kC2dUU-Od_hYhUvPugjLMYfCA',
  authDomain: 'nv-overlord.firebaseapp.com',
  projectId: 'nv-overlord',
  storageBucket: 'nv-overlord.firebasestorage.app',
  messagingSenderId: '340345250468',
  appId: '1:340345250468:web:b7679505a7bcfe702ebc31',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Remote Kill-Switch Feature Flags (Protocol 32/35) ───────────────────────
// Seeded all-enabled synchronously at module load (fail-open baseline).
// LKG merged from localStorage before any async work, so the first call to
// isFeatureEnabled() is correct even before loadRemoteConfig() resolves.
let _featureFlags = {
  cloudSync: true,
  googleSignIn: true,
  aiChat: true,
  keySync: true,
  saveMigration: true,
};
try {
  const _lkgRaw = localStorage.getItem('robco_feature_flags');
  if (_lkgRaw) {
    const _lkg = JSON.parse(_lkgRaw);
    if (_lkg && typeof _lkg === 'object') {
      Object.keys(_lkg).forEach(k => {
        if (k in _featureFlags) _featureFlags[k] = _lkg[k] !== false;
      });
    }
  }
} catch (_) {}

const FAIL_THRESHOLD = 3;
const _autoDisabled = {};
const _failCounts = {};

function _recordFeatureFailure(key, msg) {
  _failCounts[key] = (_failCounts[key] || 0) + 1;
  if (_failCounts[key] >= FAIL_THRESHOLD && !_autoDisabled[key]) {
    _autoDisabled[key] = true;
    if (msg && typeof appendToChat === 'function') appendToChat(msg, 'sys');
  }
}
window._recordFeatureFailure = _recordFeatureFailure;

async function loadRemoteConfig() {
  try {
    const _timeoutP = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('config-timeout')), 3000)
    );
    const snap = await Promise.race([getDoc(doc(db, 'config', 'flags')), _timeoutP]);
    if (snap && snap.exists && snap.exists()) {
      const data = snap.data();
      if (data && data.features && typeof data.features === 'object') {
        Object.keys(data.features).forEach(k => {
          if (k in _featureFlags) _featureFlags[k] = data.features[k] !== false;
        });
        try {
          localStorage.setItem('robco_feature_flags', JSON.stringify(_featureFlags));
        } catch (_) {}
      }
      if (data.message && typeof data.message === 'string' && data.message.trim()) {
        if (typeof appendToChat === 'function') appendToChat('> [OPERATOR] ' + data.message, 'sys');
      }
      if (data.minVersion && typeof data.minVersion === 'string' && data.minVersion.trim()) {
        if (typeof appendToChat === 'function')
          appendToChat(
            '>> A newer version is available — reload and tap "REBOOT TERMINAL" to update. <<',
            'sys'
          );
      }
    }
  } catch (e) {
    console.warn('loadRemoteConfig failed (non-fatal):', e);
  }
}

window.isFeatureEnabled = function (key) {
  if (_autoDisabled[key]) return false;
  return _featureFlags[key] !== false;
};

// App Check — non-fatal; skipped until real site key is configured
try {
  if (RECAPTCHA_V3_SITE_KEY !== 'REPLACE_WITH_RECAPTCHA_SITE_KEY') {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (e) {
  console.warn('App Check init skipped (non-fatal):', e);
}

// ── Auth — non-fatal; app remains fully usable if auth/network is unavailable ──
const auth = getAuth(app);
let _currentUid = null;
let _currentUser = null;

onAuthStateChanged(auth, user => {
  _currentUid = user ? user.uid : null;
  _currentUser = user || null;
  if (typeof window.renderAccount === 'function') window.renderAccount();
  if (typeof window.renderCloudSavePicker === 'function') window.renderCloudSavePicker();
  if (user && !user.isAnonymous) loadGeminiKeyFromCloud();
});

// Boot: drain any in-flight redirect first, then establish anonymous baseline.
// Sequential order guarantees authStateReady() sees the post-redirect user before the
// anon-fallback guard runs — prevents a race where anon fires before the redirect resolves.
(async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user && typeof window.renderAccount === 'function') {
      window.renderAccount();
    }
  } catch (e) {
    if (e.code === 'auth/credential-already-in-use') {
      const cred = GoogleAuthProvider.credentialFromError(e);
      if (cred) {
        signInWithCredential(auth, cred).catch(e2 =>
          console.warn('Redirect credential fallback failed (non-fatal):', e2)
        );
      }
    } else {
      console.warn('getRedirectResult failed (non-fatal):', e);
    }
  }
  // Guard: signInAnonymously replaces a non-anonymous user — only call when truly no session.
  try {
    await auth.authStateReady();
    if (!auth.currentUser) {
      await signInAnonymously(auth).catch(e =>
        console.warn('Anonymous sign-in failed (non-fatal):', e)
      );
    }
  } catch {
    if (!auth.currentUser) signInAnonymously(auth).catch(() => {});
  }
  // Fire-and-forget — never blocks boot or auth (Protocol 32/33)
  loadRemoteConfig();
})();

// ── Google sign-in: links anonymous → Google; handles collision ──────────────
// Popup is used unconditionally (mobile + desktop). The redirect flow broke on mobile
// because modern browsers deny third-party iframe storage to nv-overlord.firebaseapp.com,
// so getRedirectResult returned null and the link was never applied.
// Popup communicates via opener↔popup postMessage and is unaffected by storage partitioning.
// GESTURE SAFETY: linkWithPopup is the FIRST await — no async work precedes it so iOS/Android
// browsers honour the user-gesture requirement for window.open.
window.signInWithGoogle = async function () {
  const user = auth.currentUser;
  if (!user) {
    console.warn('signInWithGoogle called before auth ready');
    return;
  }
  const provider = new GoogleAuthProvider();
  try {
    await linkWithPopup(user, provider);
  } catch (e) {
    if (e.code === 'auth/credential-already-in-use') {
      // Google account already linked to a separate uid — sign into that account
      const cred = GoogleAuthProvider.credentialFromError(e);
      if (cred) {
        try {
          await signInWithCredential(auth, cred);
          // Signed into existing account; local saves are untouched
          if (typeof window.renderAccount === 'function') window.renderAccount();
        } catch (e2) {
          console.warn('Credential sign-in fallback failed (non-fatal):', e2);
        }
      }
    } else if (
      e.code !== 'auth/popup-closed-by-user' &&
      e.code !== 'auth/cancelled-popup-request'
    ) {
      console.warn('Google sign-in failed (non-fatal):', e);
    }
  }
};

// ── Sign out: returns to anonymous session; local saves untouched ─────────────
window.signOutAccount = async function () {
  try {
    await signOut(auth);
    await signInAnonymously(auth);
  } catch (e) {
    console.warn('Sign-out failed (non-fatal):', e);
  }
};

// ── Account state for UI rendering ───────────────────────────────────────────
window.getAccountState = function () {
  if (!_currentUser) {
    return { uid: null, isAnonymous: true, email: null, displayName: null };
  }
  return {
    uid: _currentUser.uid,
    isAnonymous: _currentUser.isAnonymous,
    email: _currentUser.email || null,
    displayName: _currentUser.displayName || null,
  };
};

window.pushToCloud = async function (_courierId, _stateObj) {
  if (!window.isFeatureEnabled('cloudSync')) {
    alert('>> CLOUD SYNC TEMPORARILY UNAVAILABLE — saves remain local <<');
    return;
  }
  if (!_currentUid) {
    alert('>> ERROR: NOT AUTHENTICATED — PLEASE WAIT A MOMENT AND TRY AGAIN <<');
    return;
  }

  const btn = document.getElementById('btnCloudPush');
  if (btn) btn.innerText = '> SYNCING...';
  try {
    if (!window.robco_v8) {
      window.robco_v8 = { activeContext: state.gameContext || 'FNV', campaigns: {} };
    }
    window.robco_v8.activeContext = state.gameContext || 'FNV';
    window.robco_v8.campaigns[window.robco_v8.activeContext] = JSON.parse(JSON.stringify(state));
    localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));

    const _pushPlaystyle = localStorage.getItem('robco_playstyle') || 'any';
    const _pushPayload = {
      version: window.APP_VERSION || '2.0.0',
      schemaVersion: window.APP_VERSION || '2.0.0',
      savedAt: Date.now(),
      robco_v8: window.robco_v8,
      chat: JSON.parse(localStorage.getItem('robco_chat') || '[]'),
      playstyle: _pushPlaystyle,
    };
    if (typeof window.computeSaveChecksum === 'function') {
      _pushPayload.checksum = window.computeSaveChecksum(
        _pushPayload.robco_v8,
        _pushPayload.chat,
        _pushPayload.playstyle
      );
    }
    await setDoc(doc(db, 'users', _currentUid, 'saves', 'main'), _pushPayload);
    localStorage.setItem('robco_last_cloud_push', Date.now().toString());
    console.log('Cloud sync complete.');
    if (typeof playSyncTone === 'function') playSyncTone(); // H3: Data Sync Ping
    alert('>> CLOUD SYNC COMPLETE <<');
  } catch (e) {
    console.error('Error syncing to cloud: ', e);
    _recordFeatureFailure(
      'cloudSync',
      '>> CLOUD SYNC PAUSED after repeated errors — using local saves. Reload to retry. <<'
    );
    alert('>> CLOUD NETWORK FAILURE <<');
  } finally {
    if (btn) btn.innerText = '> PUSH CLOUD SAVE';
  }
};

window.pullFromCloud = async function (_courierId) {
  if (!window.isFeatureEnabled('cloudSync')) {
    alert('>> CLOUD SYNC TEMPORARILY UNAVAILABLE — saves remain local <<');
    return;
  }
  if (!_currentUid) {
    alert('>> ERROR: NOT AUTHENTICATED — PLEASE WAIT A MOMENT AND TRY AGAIN <<');
    return;
  }

  const btn = document.getElementById('btnCloudPull');
  if (btn) btn.innerText = '> FETCHING...';

  try {
    const docRef = doc(db, 'users', _currentUid, 'saves', 'main');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      let data = docSnap.data();
      // Conflict check: warn if cloud save is older than local save
      const cloudTime = data.savedAt || 0;
      const localTime = parseInt(localStorage.getItem('robco_last_cloud_push') || '0');
      if (localTime > cloudTime && cloudTime > 0) {
        const cloudDate = new Date(cloudTime).toLocaleString();
        const localDate = new Date(localTime).toLocaleString();
        if (
          !confirm(
            `>> WARNING: Local save is NEWER than cloud save.\nCloud: ${cloudDate}\nLocal: ${localDate}\n\nOverwrite local with older cloud data?`
          )
        ) {
          if (btn) btn.innerText = '> PULL CLOUD SAVE';
          return;
        }
      }
      if (typeof autoImportState === 'function') {
        if (data.robco_v8) {
          // Integrity + forward-compat check before applying cloud pull
          if (typeof window.verifySaveEnvelope === 'function') {
            const _pullIntegrity = window.verifySaveEnvelope(data);
            if (_pullIntegrity.status === 'future_version') {
              if (
                !confirm(
                  `> VERSION MISMATCH\n\nThis cloud save was made on a newer version of RobCo (v${_pullIntegrity.version}).\nYour app is on v${window.APP_VERSION}.\n\nLoading may cause data loss — update the app first.\n\nForce-load anyway?`
                )
              ) {
                if (btn) btn.innerText = '> PULL CLOUD SAVE';
                return;
              }
            } else if (_pullIntegrity.status === 'checksum_mismatch') {
              if (
                !confirm(
                  '> CLOUD SAVE INTEGRITY WARNING\n\nThis cloud save may be corrupt or was modified outside the app.\n\nLoad anyway? (Data may be incomplete or incorrect.)'
                )
              ) {
                if (btn) btn.innerText = '> PULL CLOUD SAVE';
                return;
              }
            }
          }
          // Rolling backup: snapshot current state before replacing
          if (typeof window.snapRollingBackup === 'function') window.snapRollingBackup();

          // XSS-fix: route cloud-pulled container through sanitizer before writing to localStorage.
          // The raw setItem fast-path bypassed autoImportState's coercion hardening; this closes it.
          const sanitized =
            typeof sanitizeImportedContainer === 'function'
              ? sanitizeImportedContainer(data.robco_v8)
              : data.robco_v8;
          localStorage.setItem('robco_v8', JSON.stringify(sanitized));
          if (data.chat && Array.isArray(data.chat) && typeof restoreChatHistory === 'function') {
            restoreChatHistory(data.chat);
          }
          if (data.playstyle) {
            localStorage.setItem('robco_playstyle', data.playstyle);
            let el = document.getElementById('playstyleInput');
            if (el) el.value = data.playstyle;
          }
          alert('>> CLOUD SAVE RESTORED SUCCESSFULLY. REBOOTING SYSTEM... <<');
          window.location.reload();
        } else {
          // Support legacy cloud payload
          const stateData = data.version && data.state ? data.state : data;
          autoImportState(JSON.stringify(stateData));
          if (data.chat && Array.isArray(data.chat) && typeof restoreChatHistory === 'function') {
            restoreChatHistory(data.chat);
          }
          if (data.playstyle) {
            localStorage.setItem('robco_playstyle', data.playstyle);
            let el = document.getElementById('playstyleInput');
            if (el) el.value = data.playstyle;
          }
          alert('>> LEGACY CLOUD SAVE RESTORED SUCCESSFULLY <<');
        }
      }
    } else {
      alert('No cloud save found. Push a save first.');
    }
  } catch (e) {
    console.error('Error fetching from cloud: ', e);
    _recordFeatureFailure(
      'cloudSync',
      '>> CLOUD SYNC PAUSED after repeated errors — using local saves. Reload to retry. <<'
    );
    alert('>> CLOUD NETWORK FAILURE <<');
  } finally {
    if (btn) btn.innerText = '> PULL CLOUD SAVE';
  }
};

// ── contentHash: reuse the global computeSaveChecksum helper from state.js ─
// (Protocol 22: extend existing rather than duplicate)
// state.js is loaded before cloud.js so window.computeSaveChecksum is available.

// ── List all cloud saves for the current user ────────────────────────
// Returns [{id, data}, ...] sorted by updatedAt desc (savedAt as fallback).
window.listCloudSaves = async function () {
  if (!window.isFeatureEnabled('cloudSync')) return [];
  if (!_currentUid) return [];
  try {
    const col = collection(db, 'users', _currentUid, 'saves');
    const snap = await getDocs(col);
    const docs = [];
    snap.forEach(d => docs.push({ id: d.id, data: d.data() }));
    docs.sort((a, b) => {
      const ta = a.data.updatedAt || a.data.savedAt || 0;
      const tb = b.data.updatedAt || b.data.savedAt || 0;
      return tb - ta;
    });
    return docs;
  } catch (e) {
    console.warn('listCloudSaves failed (non-fatal):', e);
    return [];
  }
};

// ── Sync local saves to cloud (ADDITIVE ONLY — never overwrites) ─────
// Uploads robco_v8 + robco_slot_1/2/3. Dedupes by localOriginId+contentHash
// so re-syncing creates no duplicates. Never touches localStorage.
window.syncLocalSavesToCloud = async function () {
  if (!window.isFeatureEnabled('saveMigration')) {
    alert('>> SAVE SYNC TEMPORARILY UNAVAILABLE <<');
    return;
  }
  if (!_currentUid) {
    alert('>> NOT SIGNED IN — please sign in to sync saves <<');
    return;
  }

  const localSaves = [];

  // Active robco_v8 container
  const v8raw = localStorage.getItem('robco_v8');
  if (v8raw) {
    try {
      const v8 = JSON.parse(v8raw);
      const chatRaw = localStorage.getItem('robco_chat');
      const chat = chatRaw ? JSON.parse(chatRaw) : [];
      const playstyle = localStorage.getItem('robco_playstyle') || 'any';
      const ctx = v8.activeContext || 'FNV';
      localSaves.push({
        localOriginId: 'robco_v8',
        robco_v8: v8,
        chat,
        playstyle,
        gameContext: ctx,
        label: 'Local (' + ctx + ') — ' + new Date().toLocaleDateString(),
      });
    } catch (_) {}
  }

  // Slots 1-3
  for (let n = 1; n <= 3; n++) {
    const slotRaw = localStorage.getItem('robco_slot_' + n);
    if (!slotRaw) continue;
    try {
      const slot = JSON.parse(slotRaw);
      const slotCtx = slot.gameContext || (slot.state && slot.state.gameContext) || 'FNV';
      const slotV8 = { activeContext: slotCtx, campaigns: {} };
      slotV8.campaigns[slotCtx] = slot.state || {};
      const savedDate = slot.savedAt
        ? new Date(slot.savedAt).toLocaleDateString()
        : new Date().toLocaleDateString();
      const slotName = slot.slotName || 'Slot ' + n;
      localSaves.push({
        localOriginId: 'robco_slot_' + n,
        robco_v8: slotV8,
        chat: Array.isArray(slot.chat) ? slot.chat : [],
        playstyle: slot.playstyle || 'any',
        gameContext: slotCtx,
        label: slotName + ': ' + savedDate,
      });
    } catch (_) {}
  }

  if (localSaves.length === 0) {
    alert('>> NO LOCAL SAVES FOUND <<');
    return;
  }

  // Query existing cloud saves for dedup check
  const col = collection(db, 'users', _currentUid, 'saves');
  let existingDocs = [];
  try {
    const snap = await getDocs(col);
    snap.forEach(d => existingDocs.push(d.data()));
  } catch (e) {
    console.warn('Could not fetch existing saves for dedup:', e);
  }

  let uploaded = 0;
  let skipped = 0;
  const now = Date.now();

  for (const ls of localSaves) {
    const contentHash = window.computeSaveChecksum(ls.robco_v8, ls.chat, ls.playstyle);
    const isDupe = existingDocs.some(
      d => d.localOriginId === ls.localOriginId && d.contentHash === contentHash
    );
    if (isDupe) {
      skipped++;
      continue;
    }
    try {
      await addDoc(col, {
        schema: 2,
        version: window.APP_VERSION || '2.0.1',
        savedAt: now,
        updatedAt: now,
        label: ls.label,
        gameContext: ls.gameContext,
        localOriginId: ls.localOriginId,
        contentHash,
        robco_v8: ls.robco_v8,
        chat: ls.chat,
        playstyle: ls.playstyle,
      });
      uploaded++;
    } catch (e) {
      console.warn('Upload failed for', ls.localOriginId, e);
    }
  }

  alert('» SYNC COMPLETE — ' + uploaded + ' uploaded, ' + skipped + ' already synced «');
  if (typeof window.renderCloudSavePicker === 'function') window.renderCloudSavePicker();
};

// ── Load a cloud save into local state (confirm-gated) ───────────────
// Sanitizes and migrates the cloud container before writing to localStorage.
// NEVER auto-loads; always requires explicit user confirmation.
window.loadCloudSave = async function (docId) {
  if (!window.isFeatureEnabled('cloudSync')) {
    alert('>> CLOUD SYNC TEMPORARILY UNAVAILABLE — saves remain local <<');
    return;
  }
  if (!_currentUid) return;
  if (!confirm('>> LOAD CLOUD SAVE?\nThis replaces your current in-app campaign — continue?'))
    return;
  try {
    const docRef = doc(db, 'users', _currentUid, 'saves', docId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      alert('>> SAVE NOT FOUND <<');
      return;
    }
    const data = docSnap.data();
    if (!data.robco_v8) {
      alert('>> SAVE FORMAT NOT SUPPORTED <<');
      return;
    }
    // Integrity + forward-compat check before applying cloud picker load
    if (typeof window.verifySaveEnvelope === 'function') {
      const _lcIntegrity = window.verifySaveEnvelope(data);
      if (_lcIntegrity.status === 'future_version') {
        if (
          !confirm(
            `> VERSION MISMATCH\n\nThis cloud save was made on a newer version of RobCo (v${_lcIntegrity.version}).\nYour app is on v${window.APP_VERSION}.\n\nLoading may cause data loss — update the app first.\n\nForce-load anyway?`
          )
        )
          return;
      } else if (_lcIntegrity.status === 'checksum_mismatch') {
        if (
          !confirm(
            '> CLOUD SAVE INTEGRITY WARNING\n\nThis cloud save may be corrupt or was modified outside the app.\n\nLoad anyway? (Data may be incomplete or incorrect.)'
          )
        )
          return;
      }
    }
    // Rolling backup: snapshot current state before replacing
    if (typeof window.snapRollingBackup === 'function') window.snapRollingBackup();
    // Sanitize (XSS hardening — same path as cloud pull and file import)
    const sanitized =
      typeof sanitizeImportedContainer === 'function'
        ? sanitizeImportedContainer(data.robco_v8)
        : data.robco_v8;
    // Apply migrateState to each campaign to bring schema up to date
    if (typeof migrateState === 'function' && sanitized.campaigns) {
      Object.keys(sanitized.campaigns).forEach(ctx => {
        sanitized.campaigns[ctx] = migrateState(data.version || '1.0', sanitized.campaigns[ctx]);
      });
    }
    localStorage.setItem('robco_v8', JSON.stringify(sanitized));
    if (data.chat && Array.isArray(data.chat))
      localStorage.setItem('robco_chat', JSON.stringify(data.chat));
    if (data.playstyle) localStorage.setItem('robco_playstyle', data.playstyle);
    alert('>> CLOUD SAVE RESTORED. REBOOTING SYSTEM... <<');
    window.location.reload();
  } catch (e) {
    console.warn('loadCloudSave failed (non-fatal):', e);
    alert('>> CLOUD NETWORK FAILURE <<');
  }
};

// ── Rename a cloud save (label only — no data change) ───────────────
window.renameCloudSave = async function (docId, newLabel) {
  if (!window.isFeatureEnabled('cloudSync')) return;
  if (!_currentUid || !newLabel) return;
  try {
    await updateDoc(doc(db, 'users', _currentUid, 'saves', docId), {
      label: String(newLabel),
      updatedAt: Date.now(),
    });
    if (typeof window.renderCloudSavePicker === 'function') window.renderCloudSavePicker();
  } catch (e) {
    console.warn('renameCloudSave failed (non-fatal):', e);
    alert('>> RENAME FAILED — NETWORK ERROR <<');
  }
};

// ── Delete a cloud save (confirm-gated — user-initiated only) ────────
window.deleteCloudSave = async function (docId) {
  if (!window.isFeatureEnabled('cloudSync')) return;
  if (!_currentUid) return;
  if (!confirm('>> PERMANENTLY DELETE this cloud save?\nThis cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'users', _currentUid, 'saves', docId));
    if (typeof window.renderCloudSavePicker === 'function') window.renderCloudSavePicker();
  } catch (e) {
    console.warn('deleteCloudSave failed (non-fatal):', e);
    alert('>> DELETE FAILED — NETWORK ERROR <<');
  }
};

// ── Gemini Key Sync (Phase 5c-iv) ────────────────────────────────────
// Writes key+model to users/{uid}/secrets/gemini — only for non-anonymous users
// with the sync toggle ON (robco_gemini_key_sync === 'true'). NEVER writes for
// anonymous users or when the toggle is off. Non-fatal on network failure.
async function loadGeminiKeyFromCloud() {
  if (!window.isFeatureEnabled('keySync')) return;
  if (!_currentUser || _currentUser.isAnonymous) return;
  if (localStorage.getItem('robco_gemini_key_sync') !== 'true') return;
  if (!_currentUid) return;
  const localKey = localStorage.getItem('robco_gemini_key');
  if (localKey) return; // local key already present — no need to pull
  try {
    const docSnap = await getDoc(doc(db, 'users', _currentUid, 'secrets', 'gemini'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.key) {
        localStorage.setItem('robco_gemini_key', data.key);
        const input = document.getElementById('apiKeyInput');
        if (input) input.value = data.key;
        if (data.model) {
          localStorage.setItem('robco_gemini_model', data.model);
          const modelInput = document.getElementById('apiModelInput');
          if (modelInput)
            modelInput.innerHTML = `<option value="${data.model}">${data.model} (Secured)</option>`;
        }
      }
    }
  } catch (e) {
    console.warn('loadGeminiKeyFromCloud failed (non-fatal):', e);
  }
}

window.saveGeminiKeyToCloud = async function (key, model) {
  if (!window.isFeatureEnabled('keySync')) return;
  if (!_currentUser || _currentUser.isAnonymous) return; // never sync for anonymous users
  if (localStorage.getItem('robco_gemini_key_sync') !== 'true') return; // only sync when toggle ON
  if (!_currentUid) return;
  try {
    await setDoc(doc(db, 'users', _currentUid, 'secrets', 'gemini'), {
      key,
      model: model || '',
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn('saveGeminiKeyToCloud failed (non-fatal):', e);
  }
};

// Sets the geminiKeySync toggle — persists to localStorage and, when signed in
// with Google, also to users/{uid}/settings/preferences in Firestore so the
// setting follows the user across devices. Turning sync ON immediately pushes
// the current local key (if any); turning it OFF stops future syncs (key
// remains in Firestore until the user explicitly deletes their account data).
window.setGeminiKeySync = async function (checked) {
  if (!window.isFeatureEnabled('keySync')) return;
  localStorage.setItem('robco_gemini_key_sync', checked ? 'true' : 'false');
  if (_currentUser && !_currentUser.isAnonymous && _currentUid) {
    try {
      await setDoc(
        doc(db, 'users', _currentUid, 'settings', 'preferences'),
        { geminiKeySync: checked },
        { merge: true }
      );
    } catch (e) {
      console.warn('setGeminiKeySync Firestore write failed (non-fatal):', e);
    }
  }
  if (checked) {
    const key = localStorage.getItem('robco_gemini_key');
    const model = localStorage.getItem('robco_gemini_model') || '';
    if (key) window.saveGeminiKeyToCloud(key, model);
  }
};
