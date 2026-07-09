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
  // P7: retry a USER-INITIATED manual cloud push that failed while offline. Default
  // enabled (fail-open, Protocol 33); with it off, a manual push behaves exactly as
  // today (fails/no-ops offline, nothing queued). The remote /config/flags doc can
  // flip features.offlineQueue to disable it live (Protocol 32/35).
  offlineQueue: true,
  // Visual Upload OCR Unit 3 (planning/VISUAL_UPLOAD_OCR_PLAN.md §4.1) — the hybrid
  // pair. visualOcr gates the on-device Tesseract.js pipeline (js/ocr.js), the
  // PRIMARY path a Visual Upload now takes. visualAiVision gates the existing,
  // UNTOUCHED Gemini-vision inlineData branch (transmitMessage(), api.js), which is
  // now reached only as the FALLBACK — on an OCR load/recognize failure, when
  // visualOcr is killed, or when the player explicitly taps TRY AI VISION. Both
  // default enabled (fail-open, Protocol 33); either can be flipped off live via
  // /config/flags with no reload (Protocol 32).
  visualOcr: true,
  visualAiVision: true,
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
  if (user && !user.isAnonymous) {
    loadGeminiKeyFromCloud();
    // P7: a signed-in user may have pushes queued from an earlier offline session —
    // retry them now (retry-only; never an auto-push of un-pushed state). flushCloudQueue
    // is a hoisted module fn defined below; it no-ops if the queue is empty or offline.
    flushCloudQueue();
  }
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

// Build the cloud-save payload from the CURRENT live campaign (snapshot + hash).
// Boundary: never read the global `state` directly from this module — go through
// the sanctioned state.js accessor (Protocol 23). snapshotActiveCampaign() flushes
// the live state into window.robco_v8 under the active game context. `uid` is
// stamped so a queued push is scoped to the account that created it (auth-change
// safety at flush time). Only ever called from saveCurrentToCloud (manual button).
function _buildSavePayload(label) {
  window.snapshotActiveCampaign();
  localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));
  const chatRaw = localStorage.getItem('robco_chat');
  const chat = chatRaw ? JSON.parse(chatRaw) : [];
  const playstyle = localStorage.getItem('robco_playstyle') || 'any';
  const contentHash =
    typeof window.computeSaveChecksum === 'function'
      ? window.computeSaveChecksum(window.robco_v8, chat, playstyle)
      : '';
  return {
    label,
    gameContext: window.robco_v8.activeContext,
    contentHash,
    robco_v8: window.robco_v8,
    chat,
    playstyle,
    uid: _currentUid,
    queuedAt: Date.now(),
  };
}

// The SINGLE additive cloud-save uploader (Protocol 22/34) — used by BOTH the
// direct manual push and the offline-queue flush, so there is one uploader, never a
// forked second one. Dedups against the user's existing saves by contentHash and,
// if new, addDoc's it (ADDITIVE — never setDoc/overwrite). Returns 'duplicate' if
// an identical save already exists, else 'ok'. Throws on a real network failure
// (the caller decides whether to queue it). Assumes the caller already verified
// cloudSync enabled + signed-in non-anonymous.
async function _uploadSaveDoc(payload) {
  const col = collection(db, 'users', _currentUid, 'saves');
  let existingDocs = [];
  try {
    const snap = await getDocs(col);
    snap.forEach(d => existingDocs.push(d.data()));
  } catch (_) {}
  if (payload.contentHash && existingDocs.some(d => d.contentHash === payload.contentHash)) {
    return 'duplicate';
  }
  const now = Date.now();
  await addDoc(col, {
    schema: 2,
    version: window.APP_VERSION || '2.7.0',
    savedAt: now,
    updatedAt: now,
    label: payload.label,
    gameContext: payload.gameContext,
    contentHash: payload.contentHash,
    robco_v8: payload.robco_v8,
    chat: payload.chat,
    playstyle: payload.playstyle,
  });
  return 'ok';
}

// Recognise a connectivity/network failure (vs a permission/logic error) so ONLY a
// genuine offline failure is queued for retry.
function _isOfflineError(e) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const code = (e && e.code) || '';
  const msg = ((e && e.message) || '').toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'auth/network-request-failed' ||
    /network|offline|unavailable|failed to fetch/.test(msg)
  );
}

window.saveCurrentToCloud = async function () {
  if (!window.isFeatureEnabled('cloudSync')) {
    if (typeof openModal === 'function')
      openModal({
        title: '> SAVE TO CLOUD',
        body: 'CLOUD SYNC TEMPORARILY UNAVAILABLE — saves remain local',
      });
    return;
  }
  if (!_currentUid || !_currentUser || _currentUser.isAnonymous) {
    if (typeof openModal === 'function')
      openModal({ title: '> SAVE TO CLOUD', body: 'SIGN IN WITH GOOGLE TO SAVE TO CLOUD' });
    return;
  }
  const labelInput = prompt("Save name (leave blank to use today's date):");
  const finalLabel = (labelInput && labelInput.trim()) || new Date().toLocaleDateString();
  const btn = document.getElementById('btnSaveToCloud');
  if (btn) btn.innerText = '> SAVING...';
  const payload = _buildSavePayload(finalLabel);
  // OFFLINE (pre-check): the user pressed the button while offline. If the queue is
  // enabled, defer THEIR push (never a push they didn't initiate) and flush it when
  // connectivity returns; if disabled, fall through to today's behavior below.
  if (
    window.isFeatureEnabled('offlineQueue') &&
    typeof navigator !== 'undefined' &&
    navigator.onLine === false
  ) {
    const queued = await window.enqueueCloudPush(payload);
    if (btn) btn.innerText = '> SAVE CURRENT TO CLOUD';
    if (typeof openModal === 'function')
      openModal({
        title: '> SAVE TO CLOUD',
        body: queued
          ? 'OFFLINE — SAVE QUEUED. It will upload automatically when you reconnect.'
          : 'OFFLINE — cloud save could not be queued on this device.',
      });
    return;
  }
  try {
    const res = await _uploadSaveDoc(payload);
    if (res === 'duplicate') {
      if (typeof openModal === 'function')
        openModal({
          title: '> SAVE TO CLOUD',
          body: 'IDENTICAL SAVE ALREADY IN CLOUD — no new save created.',
        });
      return;
    }
    localStorage.setItem('robco_last_cloud_push', Date.now().toString());
    if (typeof playSyncTone === 'function') playSyncTone();
    if (typeof openModal === 'function')
      openModal({ title: '> SAVE TO CLOUD', body: 'SAVED TO CLOUD: "' + finalLabel + '"' });
    if (typeof window.renderSavesList === 'function') window.renderSavesList();
    // CHASSIS LIVING CORE #9 (save/sync write-pulse) — an actual new cloud
    // document was written (the 'duplicate' branch above returns before this
    // point, so a no-op push never fires a pulse).
    if (window.RobcoEvents) window.RobcoEvents.emit('data.write', { kind: 'cloud-push' });
  } catch (e) {
    console.error('saveCurrentToCloud failed:', e);
    // A genuine connectivity failure mid-push → queue THIS user-initiated push for
    // retry (kill-switch-gated). Any other error → today's behavior (record + modal).
    if (window.isFeatureEnabled('offlineQueue') && _isOfflineError(e)) {
      const queued = await window.enqueueCloudPush(payload);
      if (typeof openModal === 'function')
        openModal({
          title: '> SAVE TO CLOUD',
          body: queued
            ? 'NETWORK UNAVAILABLE — SAVE QUEUED. It will upload automatically when you reconnect.'
            : 'CLOUD NETWORK FAILURE',
        });
    } else {
      _recordFeatureFailure(
        'cloudSync',
        '>> CLOUD SYNC PAUSED after repeated errors — using local saves. Reload to retry. <<'
      );
      if (typeof openModal === 'function')
        openModal({ title: '> SAVE TO CLOUD', body: 'CLOUD NETWORK FAILURE' });
    }
  } finally {
    if (btn) btn.innerText = '> SAVE CURRENT TO CLOUD';
  }
};

// ── OFFLINE CLOUD-PUSH QUEUE FLUSH (P7) ──────────────────────────────────────
// Retries the user-initiated pushes queued while offline (state.js data layer),
// using the SAME additive _uploadSaveDoc path (Protocol 22/34). Triggered by the
// browser 'online' event and on sign-in — NEVER by a save/state change (cloud sync
// stays manual-only). Every guard the manual button applies still holds: killed
// flag → no-op; signed-out/anonymous → no-op; offline → no-op. Items are uid-scoped
// so a different account signing in never flushes the previous user's queued pushes.
// An item that uploads ('ok') or is already in the cloud ('duplicate') is dropped
// from the queue; a network failure stops the flush and leaves the rest queued
// (bounded retry) — never lost, never duplicated (the contentHash dedup in
// _uploadSaveDoc). Reentrancy-guarded for this tab.
let _flushingQueue = false;
async function flushCloudQueue() {
  if (!window.isFeatureEnabled('offlineQueue') || !window.isFeatureEnabled('cloudSync')) return;
  if (!_currentUid || !_currentUser || _currentUser.isAnonymous) return; // auth guard
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (_flushingQueue) return;
  _flushingQueue = true;
  try {
    const queue = await window.readCloudQueue();
    if (!queue.length) return;
    const remaining = [];
    let flushed = 0;
    let stopped = false;
    for (const item of queue) {
      // Keep (don't send) another account's queued pushes and anything after a
      // network stop — bounded retry, never lost.
      if (stopped || !item || item.uid !== _currentUid) {
        remaining.push(item);
        continue;
      }
      try {
        await _uploadSaveDoc(item); // 'ok' or 'duplicate' → done, not re-queued
        flushed++;
      } catch (_) {
        remaining.push(item);
        stopped = true; // network down again — stop, keep this + the rest
      }
    }
    if (remaining.length !== queue.length) await window.writeCloudQueue(remaining);
    if (flushed > 0) {
      if (typeof playSyncTone === 'function') playSyncTone();
      if (typeof appendToChat === 'function')
        appendToChat(
          '> [CLOUD] ' + flushed + ' queued save(s) uploaded on reconnect.',
          'sys',
          true
        );
      if (typeof window.renderSavesList === 'function') window.renderSavesList();
    }
  } finally {
    _flushingQueue = false;
  }
}
window.flushCloudQueue = flushCloudQueue;

// Flush the offline queue the moment connectivity returns (retry-only — never an
// auto-push of un-pushed state). Guarded + no-op when nothing is queued.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushCloudQueue();
  });
}

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
    if (typeof openModal === 'function')
      openModal({ title: '> SYNC TO CLOUD', body: 'SAVE SYNC TEMPORARILY UNAVAILABLE' });
    return;
  }
  if (!_currentUid) {
    if (typeof openModal === 'function')
      openModal({ title: '> SYNC TO CLOUD', body: 'NOT SIGNED IN — please sign in to sync saves' });
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

  // Slots 1-3 — P3: IDB-primary union read so an oversized slot that lives only
  // in IndexedDB also uploads to the cloud (falls back to localStorage).
  for (let n = 1; n <= 3; n++) {
    let slot = null;
    try {
      slot =
        typeof window._coldReadObj === 'function'
          ? await window._coldReadObj('robco_slot_' + n, 'slot_' + n)
          : (function () {
              const r = localStorage.getItem('robco_slot_' + n);
              return r ? JSON.parse(r) : null;
            })();
    } catch (_) {}
    if (!slot) continue;
    try {
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
    if (typeof openModal === 'function')
      openModal({ title: '> SYNC TO CLOUD', body: 'NO LOCAL SAVES FOUND' });
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

  if (typeof openModal === 'function')
    openModal({
      title: '> SYNC TO CLOUD',
      body: 'SYNC COMPLETE — ' + uploaded + ' uploaded, ' + skipped + ' already synced',
    });
  if (typeof window.renderSavesList === 'function') window.renderSavesList();
};

// ── Load a cloud save into local state (confirm-gated) ───────────────
// Sanitizes and migrates the cloud container before writing to localStorage.
// NEVER auto-loads; always requires explicit user confirmation.
window.loadCloudSave = async function (docId) {
  if (!window.isFeatureEnabled('cloudSync')) {
    if (typeof openModal === 'function')
      openModal({
        title: '> LOAD CLOUD SAVE',
        body: 'CLOUD SYNC TEMPORARILY UNAVAILABLE — saves remain local',
      });
    return;
  }
  if (!_currentUid) return;
  if (typeof confirmAction !== 'function') return;
  const gate1 = await confirmAction({
    title: '> LOAD CLOUD SAVE',
    warning: 'This replaces your current in-app campaign — continue?',
    confirmLabel: 'LOAD',
  });
  if (!gate1) return;
  try {
    const docRef = doc(db, 'users', _currentUid, 'saves', docId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      if (typeof openModal === 'function')
        openModal({ title: '> LOAD CLOUD SAVE', body: 'SAVE NOT FOUND' });
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
        const gate2 = await confirmAction({
          title: '> OLDER SAVE',
          warning: `You have a more recent local save.\nThis cloud save: ${cloudDate}\nLast local push: ${localDate}\n\nLoad the older cloud save anyway?`,
          confirmLabel: 'LOAD ANYWAY',
        });
        if (!gate2) return;
      }
    }
    if (!data.robco_v8) {
      if (typeof openModal === 'function')
        openModal({ title: '> LOAD CLOUD SAVE', body: 'SAVE FORMAT NOT SUPPORTED' });
      return;
    }
    // Integrity + forward-compat check before applying cloud picker load
    if (typeof window.verifySaveEnvelope === 'function') {
      const _lcIntegrity = window.verifySaveEnvelope(data);
      if (_lcIntegrity.status === 'future_version') {
        const gate3 = await confirmAction({
          title: '> VERSION MISMATCH',
          warning: `This cloud save was made on a newer version of RobCo (v${_lcIntegrity.version}).\nYour app is on v${window.APP_VERSION}.\n\nLoading may cause data loss — update the app first.\n\nForce-load anyway?`,
          confirmLabel: 'FORCE-LOAD',
        });
        if (!gate3) return;
      } else if (_lcIntegrity.status === 'checksum_mismatch') {
        const gate4 = await confirmAction({
          title: '> CLOUD SAVE INTEGRITY WARNING',
          warning:
            'This cloud save may be corrupt or was modified outside the app.\n\nLoad anyway? (Data may be incomplete or incorrect.)',
          confirmLabel: 'LOAD ANYWAY',
        });
        if (!gate4) return;
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
    if (typeof openModal === 'function')
      openModal({ title: '> LOAD CLOUD SAVE', body: 'CLOUD SAVE RESTORED. REBOOTING SYSTEM...' });
    // CHASSIS LIVING CORE #9 (save/sync write-pulse) — the reload below is imminent,
    // but the pulse still paints for the brief window before it fires.
    if (window.RobcoEvents) window.RobcoEvents.emit('data.write', { kind: 'cloud-pull' });
    setTimeout(() => window.location.reload(), 2000);
  } catch (e) {
    console.warn('loadCloudSave failed (non-fatal):', e);
    if (typeof openModal === 'function')
      openModal({ title: '> LOAD CLOUD SAVE', body: 'CLOUD NETWORK FAILURE' });
  }
};

// ── Cloud save VERSION HISTORY (per-save revision ring) ─────────────────────
// Mirrors the local per-slot P5 version ring, translated to Firestore's own
// structural equivalent: an additive subcollection
// users/{uid}/saves/{docId}/versions/{versionId}, one full snapshot per document
// (never an embedded array field on the parent doc — a single Firestore document
// is capped at 1MB, and a handful of full campaign+chat snapshots stacked into one
// doc could approach that ceiling; a subcollection keeps every version's size
// class identical to the main save doc, which already works fine). Every write is
// additive (addDoc, Protocol 34) — overwriteCloudSave() archives the save's PRIOR
// contents here BEFORE replacing them, so an overwrite is always recoverable.
// Capped at CLOUD_SLOT_VERSION_CAP, oldest-pruned (mirrors the local ring's
// `.slice(0, SLOT_VERSION_CAP)`): this is retention of the system's OWN
// auto-created backups, not a user-initiated destructive action, so pruning is
// not itself confirm-gated — exactly like the local ring's silent cap today.
const CLOUD_SLOT_VERSION_CAP = 5;

// Archives `priorData` (the save doc's contents just before an overwrite replaces
// them) into the version subcollection, then prunes beyond the cap. Returns the
// resulting version count (for the caller to stamp onto the parent doc as
// `versionCount`, so the SAVES LIST can show a VER button without an extra read
// per save). No-op-safe: a missing/malformed prior snapshot or any Firestore
// failure never blocks the overwrite itself — it just means this one revision
// isn't recoverable, exactly like the local ring's best-effort pushSlotVersion().
async function _pushCloudSaveVersion(docId, priorData) {
  const fallbackCount = (priorData && priorData.versionCount) || 0;
  if (!priorData || !priorData.robco_v8) return fallbackCount;
  try {
    const col = collection(db, 'users', _currentUid, 'saves', docId, 'versions');
    await addDoc(col, {
      archivedAt: Date.now(),
      savedAt: priorData.savedAt || Date.now(),
      version: priorData.version || '',
      label: priorData.label || '',
      gameContext: priorData.gameContext || '',
      contentHash: priorData.contentHash || '',
      robco_v8: priorData.robco_v8,
      chat: priorData.chat || [],
      playstyle: priorData.playstyle || 'any',
    });
    const snap = await getDocs(col);
    const entries = [];
    snap.forEach(d => entries.push({ id: d.id, archivedAt: d.data().archivedAt || 0 }));
    entries.sort((a, b) => b.archivedAt - a.archivedAt); // newest first
    if (entries.length > CLOUD_SLOT_VERSION_CAP) {
      const excess = entries.slice(CLOUD_SLOT_VERSION_CAP);
      for (const ex of excess) {
        try {
          await deleteDoc(doc(db, 'users', _currentUid, 'saves', docId, 'versions', ex.id));
        } catch (_) {}
      }
    }
    return Math.min(entries.length, CLOUD_SLOT_VERSION_CAP);
  } catch (e) {
    console.warn('_pushCloudSaveVersion failed (non-fatal):', e);
    return fallbackCount;
  }
}

// The retained prior revisions for a cloud save, newest-first. Returns [] on any
// failure or when signed out / the feature is disabled — a caller that gets []
// simply offers no version history (fail-safe, mirrors readSlotVersions()).
window.listCloudSaveVersions = async function (docId) {
  if (!window.isFeatureEnabled('cloudSync') || !_currentUid) return [];
  try {
    const col = collection(db, 'users', _currentUid, 'saves', docId, 'versions');
    const snap = await getDocs(col);
    const versions = [];
    snap.forEach(d => versions.push({ id: d.id, data: d.data() }));
    versions.sort((a, b) => (b.data.archivedAt || 0) - (a.data.archivedAt || 0));
    return versions;
  } catch (e) {
    console.warn('listCloudSaveVersions failed (non-fatal):', e);
    return [];
  }
};

// Restores a retained cloud-save revision into the LIVE local campaign — confirm-
// gated (Protocol 34) and DESTRUCTIVE to the current session, mirroring
// restoreSlotVersion(): it replaces the in-app campaign, never the cloud save
// itself (the cloud doc's current contents are untouched; the next overwrite of
// that save will archive today's live state as its own new version, same as the
// local ring). Sanitize + migrate before applying (same integrity path as
// loadCloudSave). A rolling backup of the current state is taken first.
window.restoreCloudSaveVersion = async function (docId, versionId) {
  if (!window.isFeatureEnabled('cloudSync')) return;
  if (!_currentUid) return;
  if (typeof confirmAction !== 'function') return;
  try {
    const vSnap = await getDoc(
      doc(db, 'users', _currentUid, 'saves', docId, 'versions', versionId)
    );
    if (!vSnap.exists()) {
      if (typeof openModal === 'function')
        openModal({ title: '> RESTORE VERSION', body: 'THAT VERSION IS NO LONGER AVAILABLE.' });
      return;
    }
    const data = vSnap.data();
    if (!data.robco_v8) {
      if (typeof openModal === 'function')
        openModal({ title: '> RESTORE VERSION', body: 'VERSION FORMAT NOT SUPPORTED' });
      return;
    }
    const ts = data.archivedAt ? new Date(data.archivedAt).toLocaleString() : 'unknown';
    const ok = await confirmAction({
      title: '> RESTORE VERSION',
      warning: `Restore your campaign to the version saved ${ts}?\n\nThis REPLACES your current in-app campaign. A rolling backup of the current state is taken first, so this can be undone.`,
      confirmLabel: 'RESTORE VERSION',
    });
    if (!ok) return;
    if (typeof window.snapRollingBackup === 'function') window.snapRollingBackup();
    const sanitized =
      typeof sanitizeImportedContainer === 'function'
        ? sanitizeImportedContainer(data.robco_v8)
        : data.robco_v8;
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
    if (typeof openModal === 'function')
      openModal({ title: '> RESTORE VERSION', body: 'VERSION RESTORED. REBOOTING SYSTEM...' });
    setTimeout(() => window.location.reload(), 2000);
  } catch (e) {
    console.warn('restoreCloudSaveVersion failed (non-fatal):', e);
    if (typeof openModal === 'function')
      openModal({ title: '> RESTORE VERSION', body: 'RESTORE FAILED — NETWORK ERROR' });
  }
};

// ── Overwrite a cloud save (confirm-gated, keeps its existing name) ─────────
// Replaces an EXISTING cloud save's contents with the current live campaign,
// in place — never a blind setDoc (Protocol 34: updateDoc-by-id is the
// additive-safe overwrite pattern renameCloudSave already uses). No rename
// prompt: the save keeps whatever label it already has. Reuses
// _buildSavePayload (Protocol 22) — same snapshot + contentHash the manual
// "SAVE TO CLOUD" push uses, just written onto the existing doc instead of a
// new one. The save's PRIOR contents are archived into version history
// (_pushCloudSaveVersion) before being replaced, so the overwrite is recoverable.
window.overwriteCloudSave = async function (docId) {
  if (!window.isFeatureEnabled('cloudSync')) {
    if (typeof openModal === 'function')
      openModal({
        title: '> OVERWRITE CLOUD SAVE',
        body: 'CLOUD SYNC TEMPORARILY UNAVAILABLE — saves remain local',
      });
    return;
  }
  if (!_currentUid || !_currentUser || _currentUser.isAnonymous) return;
  if (typeof confirmAction !== 'function') return;
  let existingLabel = 'this save';
  let existingData = null;
  try {
    const docSnap = await getDoc(doc(db, 'users', _currentUid, 'saves', docId));
    if (docSnap.exists()) {
      existingData = docSnap.data();
      if (existingData.label) existingLabel = existingData.label;
    }
  } catch (_) {}
  const ok = await confirmAction({
    title: '> OVERWRITE CLOUD SAVE',
    warning: `Overwrite "${existingLabel}" with your current campaign?\n\nThis replaces its contents but keeps its name. The prior contents are preserved in VERSION HISTORY (VER) if you need to recover them.`,
    confirmLabel: 'OVERWRITE',
  });
  if (!ok) return;
  const payload = _buildSavePayload(existingLabel);
  try {
    const versionCount = await _pushCloudSaveVersion(docId, existingData);
    await updateDoc(doc(db, 'users', _currentUid, 'saves', docId), {
      version: window.APP_VERSION || '2.7.0',
      savedAt: Date.now(),
      updatedAt: Date.now(),
      label: payload.label,
      gameContext: payload.gameContext,
      contentHash: payload.contentHash,
      robco_v8: payload.robco_v8,
      chat: payload.chat,
      playstyle: payload.playstyle,
      versionCount,
    });
    localStorage.setItem('robco_last_cloud_push', Date.now().toString());
    if (typeof playSyncTone === 'function') playSyncTone();
    if (typeof openModal === 'function')
      openModal({
        title: '> OVERWRITE CLOUD SAVE',
        body: 'CLOUD SAVE OVERWRITTEN: "' + existingLabel + '"',
      });
    if (typeof window.renderSavesList === 'function') window.renderSavesList();
    // CHASSIS LIVING CORE #9 (save/sync write-pulse) — a cloud push, additive
    // or an explicit overwrite, is still a write.
    if (window.RobcoEvents) window.RobcoEvents.emit('data.write', { kind: 'cloud-push' });
  } catch (e) {
    console.warn('overwriteCloudSave failed (non-fatal):', e);
    if (typeof openModal === 'function')
      openModal({ title: '> OVERWRITE CLOUD SAVE', body: 'OVERWRITE FAILED — NETWORK ERROR' });
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
    if (typeof openModal === 'function')
      openModal({ title: '> RENAME CLOUD SAVE', body: 'RENAME FAILED — NETWORK ERROR' });
  }
};

// ── Delete a cloud save (confirm-gated — user-initiated only) ────────
window.deleteCloudSave = async function (docId) {
  if (!window.isFeatureEnabled('cloudSync')) return;
  if (!_currentUid) return;
  if (typeof confirmAction !== 'function') return;
  const ok = await confirmAction({
    title: '> DELETE CLOUD SAVE',
    warning: 'Permanently delete this cloud save?\n\nThis cannot be undone.',
    confirmLabel: 'DELETE',
  });
  if (!ok) return;
  try {
    // Firestore does not cascade-delete subcollections — clear this save's
    // retained version history first (best-effort; an orphaned version doc left
    // behind by a failed delete is harmless clutter, never a blocker for the
    // main doc delete below).
    try {
      const versions = await window.listCloudSaveVersions(docId);
      for (const v of versions) {
        try {
          await deleteDoc(doc(db, 'users', _currentUid, 'saves', docId, 'versions', v.id));
        } catch (_) {}
      }
    } catch (_) {}
    await deleteDoc(doc(db, 'users', _currentUid, 'saves', docId));
    if (typeof window.renderSavesList === 'function') window.renderSavesList();
  } catch (e) {
    console.warn('deleteCloudSave failed (non-fatal):', e);
    if (typeof openModal === 'function')
      openModal({ title: '> DELETE CLOUD SAVE', body: 'DELETE FAILED — NETWORK ERROR' });
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
  if (typeof window._logBaySvc === 'function') {
    window._logBaySvc(
      checked
        ? 'KEY-SYNC JUMPER BRIDGED — KEY FOLLOWS ACCOUNT'
        : 'KEY-SYNC JUMPER OPEN — KEY STAYS LOCAL'
    );
  }
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
