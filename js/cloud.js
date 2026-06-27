// SRI (Subresource Integrity) cannot be applied to ES module import statements in JS source —
// there is no HTML element to attach an integrity= attribute to. The version pin @12.15.0
// is the primary supply-chain mitigation; updates are always deliberate (no floating 'latest').
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
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

// Anonymous auth — non-fatal; app remains fully usable if auth/network is unavailable
const auth = getAuth(app);
let _currentUid = null;
onAuthStateChanged(auth, user => {
  _currentUid = user ? user.uid : null;
});
signInAnonymously(auth).catch(e => console.warn('Anonymous sign-in failed (non-fatal):', e));

window.pushToCloud = async function (courierId, stateObj) {
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

    await setDoc(doc(db, 'users', _currentUid, 'saves', 'main'), {
      version: window.APP_VERSION || '2.0.0',
      savedAt: Date.now(),
      robco_v8: window.robco_v8,
      chat: JSON.parse(localStorage.getItem('robco_chat') || '[]'),
      playstyle: localStorage.getItem('robco_playstyle') || 'any',
    });
    localStorage.setItem('robco_last_cloud_push', Date.now().toString());
    console.log('Cloud sync complete.');
    if (typeof playSyncTone === 'function') playSyncTone(); // H3: Data Sync Ping
    alert('>> CLOUD SYNC COMPLETE <<');
  } catch (e) {
    console.error('Error syncing to cloud: ', e);
    alert('>> CLOUD NETWORK FAILURE <<');
  } finally {
    if (btn) btn.innerText = '> PUSH CLOUD SAVE';
  }
};

window.pullFromCloud = async function (courierId) {
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
          // Store an atomic backup for undo
          localStorage.setItem(
            'robco_backup',
            JSON.stringify({ robco_v8: JSON.parse(localStorage.getItem('robco_v8') || '{}') })
          );

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
    alert('>> CLOUD NETWORK FAILURE <<');
  } finally {
    if (btn) btn.innerText = '> PULL CLOUD SAVE';
  }
};
