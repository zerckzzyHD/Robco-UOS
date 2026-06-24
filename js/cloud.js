import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

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

window.pushToCloud = async function (courierId, stateObj) {
  if (!courierId) {
    alert('>> ERROR: MISSING COURIER ID <<');
    return;
  }

  // Firebase document IDs cannot contain slashes. Replace them with dashes.
  let safeId = courierId.replace(/\//g, '-');

  const btn = document.getElementById('btnCloudPush');
  if (btn) btn.innerText = '> SYNCING...';
  try {
    if (!window.robco_v8) {
      window.robco_v8 = { activeContext: state.gameContext || 'FNV', campaigns: {} };
    }
    window.robco_v8.activeContext = state.gameContext || 'FNV';
    window.robco_v8.campaigns[window.robco_v8.activeContext] = JSON.parse(JSON.stringify(state));
    localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));

    await setDoc(doc(db, 'saves', safeId), {
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
  if (!courierId) {
    alert('Please enter a Courier ID first.');
    return;
  }

  let safeId = courierId.replace(/\//g, '-');

  const btn = document.getElementById('btnCloudPull');
  if (btn) btn.innerText = '> FETCHING...';

  try {
    const docRef = doc(db, 'saves', safeId);
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

          localStorage.setItem('robco_v8', JSON.stringify(data.robco_v8));
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
      alert('No cloud save found for that Courier ID.');
    }
  } catch (e) {
    console.error('Error fetching from cloud: ', e);
    alert('>> CLOUD NETWORK FAILURE <<');
  } finally {
    if (btn) btn.innerText = '> PULL CLOUD SAVE';
  }
};
