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
// Public reCAPTCHA v3 SITE key — safe to ship in client source (it is a public
// identifier, exactly like the Firebase web apiKey below; the private reCAPTCHA
// SECRET key is never placed here). App Check initializes at boot whenever this
// key differs from the unconfigured sentinel checked in the init guard below.
// Init is wrapped in try/catch, so if App Check or the network is unavailable the
// app stays fully functional.
const RECAPTCHA_V3_SITE_KEY = '6LcViz8tAAAAAJCNGKgkkHC70TF-iwkQKuuEu7Bb';

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
  // cloud.js is the one ES module in the boot chain; cross-file globals from the
  // classic scripts (state.js et al.) are always read via window.X here (matching
  // window.computeSaveChecksum/window.getGameContext), never bare, for module-
  // scope safety.
  const _lkgRaw = window.MetaStore.get('robco_feature_flags');
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
        window.MetaStore.set('robco_feature_flags', JSON.stringify(_featureFlags));
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

// App Check — non-fatal. Initializes whenever a real site key is configured (i.e. the
// key is not the unconfigured sentinel); any failure is caught so the app never breaks.
try {
  if (RECAPTCHA_V3_SITE_KEY !== 'REPLACE_WITH_RECAPTCHA_SITE_KEY') {
    // Local dev only: enable an App Check debug token so localhost can obtain App Check
    // tokens without a live reCAPTCHA challenge. The client then prints a debug-token UUID
    // to the console, which is registered once in Firebase console → App Check → Manage
    // debug tokens. The Cloudflare (*.pages.dev) staging build and production (GitHub Pages)
    // both use the normal reCAPTCHA v3 attestation — the flag is never set there, so both
    // verify robustly under App Check enforcement. This guard is a strict no-op off localhost.
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
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
  if (typeof window.renderSavesList === 'function') window.renderSavesList();
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

window.saveCurrentToCloud = async function () {
  if (!window.isFeatureEnabled('cloudSync')) {
    alert('>> CLOUD SYNC TEMPORARILY UNAVAILABLE — saves remain local <<');
    return;
  }
  if (!_currentUid || !_currentUser || _currentUser.isAnonymous) {
    alert('>> SIGN IN WITH GOOGLE TO SAVE TO CLOUD <<');
    return;
  }
  const labelInput = prompt("Save name (leave blank to use today's date):");
  const finalLabel = (labelInput && labelInput.trim()) || new Date().toLocaleDateString();
  const btn = document.getElementById('btnSaveToCloud');
  if (btn) btn.innerText = '> SAVING...';
  try {
    // Boundary: never read the global `state` directly from this module — go through
    // the sanctioned state.js accessor (Protocol 23). snapshotActiveCampaign() flushes
    // the live state into window.robco_v8 under the active game context and returns it.
    window.snapshotActiveCampaign();
    localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));
    const chatRaw = localStorage.getItem('robco_chat');
    const chat = chatRaw ? JSON.parse(chatRaw) : [];
    const playstyle = localStorage.getItem('robco_playstyle') || 'any';
    const ctx = window.robco_v8.activeContext;
    const contentHash =
      typeof window.computeSaveChecksum === 'function'
        ? window.computeSaveChecksum(window.robco_v8, chat, playstyle)
        : '';
    // Dedup: skip if identical save already exists in cloud
    const col = collection(db, 'users', _currentUid, 'saves');
    let existingDocs = [];
    try {
      const snap = await getDocs(col);
      snap.forEach(d => existingDocs.push(d.data()));
    } catch (_) {}
    if (contentHash && existingDocs.some(d => d.contentHash === contentHash)) {
      alert('>> IDENTICAL SAVE ALREADY IN CLOUD — no new save created. <<');
      if (btn) btn.innerText = '> SAVE CURRENT TO CLOUD';
      return;
    }
    const now = Date.now();
    await addDoc(col, {
      schema: 2,
      version: window.APP_VERSION || '2.7.0',
      savedAt: now,
      updatedAt: now,
      label: finalLabel,
      gameContext: ctx,
      contentHash,
      robco_v8: window.robco_v8,
      chat,
      playstyle,
    });
    localStorage.setItem('robco_last_cloud_push', now.toString());
    if (typeof playSyncTone === 'function') playSyncTone();
    alert('>> SAVED TO CLOUD: "' + finalLabel + '" <<');
    if (typeof window.renderSavesList === 'function') window.renderSavesList();
  } catch (e) {
    console.error('saveCurrentToCloud failed:', e);
    _recordFeatureFailure(
      'cloudSync',
      '>> CLOUD SYNC PAUSED after repeated errors — using local saves. Reload to retry. <<'
    );
    alert('>> CLOUD NETWORK FAILURE <<');
  } finally {
    if (btn) btn.innerText = '> SAVE CURRENT TO CLOUD';
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
        version: window.APP_VERSION || '2.7.0',
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
  if (typeof window.renderSavesList === 'function') window.renderSavesList();
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
    // Timestamp warning: warn if this cloud save is older than the last local push
    {
      const cloudTime = data.savedAt || 0;
      const localTime = parseInt(localStorage.getItem('robco_last_cloud_push') || '0');
      if (localTime > cloudTime && cloudTime > 0) {
        const cloudDate = new Date(cloudTime).toLocaleString();
        const localDate = new Date(localTime).toLocaleString();
        if (
          !confirm(
            `>> NOTE: You have a more recent local save.\nThis cloud save: ${cloudDate}\nLast local push: ${localDate}\n\nLoad the older cloud save anyway?`
          )
        )
          return;
      }
    }
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
    // Guard the impending reload's beforeunload flush (clobber regression).
    window._loadingSave = true;
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
    if (typeof window.renderSavesList === 'function') window.renderSavesList();
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
    if (typeof window.renderSavesList === 'function') window.renderSavesList();
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
  if (window.MetaStore.get('robco_gemini_key_sync') !== 'true') return;
  if (!_currentUid) return;
  const localKey = window.MetaStore.get('robco_gemini_key');
  if (localKey) return; // local key already present — no need to pull
  try {
    const docSnap = await getDoc(doc(db, 'users', _currentUid, 'secrets', 'gemini'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.key) {
        window.MetaStore.set('robco_gemini_key', data.key);
        if (typeof window._invalidateCommCache === 'function') window._invalidateCommCache();
        const input = document.getElementById('apiKeyInput');
        if (input) input.value = data.key;
        if (data.model) {
          window.MetaStore.set('robco_gemini_model', data.model);
          const modelInput = document.getElementById('apiModelInput');
          if (modelInput) {
            const safeModel = escapeHtml(data.model);
            modelInput.innerHTML = `<option value="${safeModel}">${safeModel} (Secured)</option>`;
          }
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
  if (window.MetaStore.get('robco_gemini_key_sync') !== 'true') return; // only sync when toggle ON
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
  window.MetaStore.set('robco_gemini_key_sync', checked ? 'true' : 'false');
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
    const key = window.MetaStore.get('robco_gemini_key');
    const model = window.MetaStore.get('robco_gemini_model') || '';
    if (key) window.saveGeminiKeyToCloud(key, model);
  }
};
