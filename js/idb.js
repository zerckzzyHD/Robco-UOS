// ── IDBSTORE — async IndexedDB key/value engine (Step 2 · Phase 1 · P1) ──────
// A minimal, Promise-returning key/value store over IndexedDB that provides a
// DURABLE SHADOW of the device-preference store. In P1 it is written through the
// single MetaStore choke point (js/state.js) as a fire-and-forget mirror: every
// device-pref write ALSO lands here. localStorage stays the sole READ source and
// the sole authority — NOTHING reads IdbStore in P1, so if IndexedDB is absent,
// blocked, quota-full, slow to open, or corrupt, every op no-ops / resolves-soft
// and the app is byte-identical to a build without this file (the migration-
// safety guarantee). Later units (P2 boot-hydration read path, P3 cold-store)
// build the reconciliation and ceiling-relief on top of this engine.
//
// TWO OBJECT STORES — 'meta' (device prefs) and 'campaign' (the campaign
// container / save slots / rolling backups) — so the two-store boundary
// (Protocol 23) is STRUCTURAL
// in IndexedDB, not just in localStorage. P1 writes ONLY 'meta'; 'campaign' is
// created now so P2 needs no version bump.
//
// Game-agnostic (Protocol 38): a pure key/value engine — no game data, no game
// literals. Record checksums REUSE window.computeSaveChecksum() from state.js
// (Protocol 22 — no second hash implementation). ASCII-only source (Protocol 39).
(function () {
  'use strict';

  const DB_NAME = 'robco-uos';
  const DB_VERSION = 1;
  const STORES = ['meta', 'campaign'];
  const OPEN_TIMEOUT_MS = 3000;

  // The open handle, or null when IndexedDB is unavailable/failed. `_ready`
  // resolves to the IDBDatabase or null and NEVER rejects — every op chains off
  // it and a null result makes the op a no-op. Created once, at parse time, so
  // the connection is warming up before the first write.
  let _db = null;

  function _idbFactory() {
    try {
      if (typeof indexedDB !== 'undefined' && indexedDB) return indexedDB;
      if (typeof window !== 'undefined' && window.indexedDB) return window.indexedDB;
    } catch (_) {
      /* accessing indexedDB can throw in a sandboxed / partitioned context */
    }
    return null;
  }

  function _open() {
    return new Promise(resolve => {
      const idb = _idbFactory();
      if (!idb) {
        resolve(null);
        return;
      }
      let settled = false;
      const done = handle => {
        if (settled) return;
        settled = true;
        _db = handle;
        resolve(handle);
      };
      let req;
      try {
        req = idb.open(DB_NAME, DB_VERSION);
      } catch (_) {
        // Some engines throw synchronously (e.g. quota-disabled private mode).
        done(null);
        return;
      }
      try {
        req.onupgradeneeded = e => {
          const db = e.target.result;
          STORES.forEach(name => {
            if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
          });
        };
        req.onsuccess = e => done(e.target.result);
        req.onerror = () => done(null);
        req.onblocked = () => done(null);
      } catch (_) {
        done(null);
      }
      // Never leave a caller waiting forever on a blocked/hung upgrade — degrade
      // to a no-op after a short timeout. (No caller awaits IdbStore in P1; this
      // guards P2, which will.)
      setTimeout(() => done(null), OPEN_TIMEOUT_MS);
    });
  }

  const _ready = _open();

  // Resolve to the requested object store in the given mode, or null when the
  // engine is unavailable or the store/transaction cannot be opened. Never
  // rejects.
  function _store(store, mode) {
    return _ready.then(db => {
      if (!db) return null;
      try {
        return db.transaction(store, mode).objectStore(store);
      } catch (_) {
        return null;
      }
    });
  }

  // Wrap a value in the durable record envelope: the value, the app version it
  // was written under, a content checksum (reusing the save-integrity helper),
  // and a modified-time. Checksum/version are best-effort — a missing helper
  // never blocks the write.
  function _wrap(value) {
    let checksum = '';
    try {
      if (typeof window !== 'undefined' && typeof window.computeSaveChecksum === 'function') {
        checksum = window.computeSaveChecksum(value, [], '');
      }
    } catch (_) {
      /* checksum is advisory — never let it break a write */
    }
    const ver =
      typeof window !== 'undefined' && typeof window.APP_VERSION === 'string'
        ? window.APP_VERSION
        : '';
    return { value, schemaVersion: ver, checksum, mt: Date.now() };
  }

  // Run one request against a store, resolving-soft to `fallback` on any error.
  function _request(store, mode, run, fallback) {
    return _store(store, mode).then(os => {
      if (!os) return fallback;
      return new Promise(resolve => {
        try {
          const r = run(os);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => resolve(fallback);
        } catch (_) {
          resolve(fallback);
        }
      });
    });
  }

  const _unwrap = rec => (rec && typeof rec === 'object' && 'value' in rec ? rec.value : null);

  const IdbStore = {
    // Best-effort synchronous readiness flag (true once a real DB is open).
    // Callers needing a guarantee should await ready() or any op (all resolve-
    // soft regardless).
    get available() {
      return !!_db;
    },
    ready() {
      return _ready.then(db => !!db);
    },
    set(store, key, value) {
      return _request(store, 'readwrite', os => os.put(_wrap(value), key), false).then(res =>
        res === false ? false : true
      );
    },
    get(store, key) {
      return _request(store, 'readonly', os => os.get(key), null).then(_unwrap);
    },
    // Like get(), but returns the full durable envelope { value, schemaVersion,
    // checksum, mt } instead of the bare value — so a consumer (P2 boot
    // reconciliation) can verify the checksum before trusting an IDB-only value.
    getRaw(store, key) {
      return _request(store, 'readonly', os => os.get(key), null).then(rec =>
        rec && typeof rec === 'object' && 'value' in rec ? rec : null
      );
    },
    remove(store, key) {
      return _request(store, 'readwrite', os => os.delete(key), false).then(() => true);
    },
    keys(store) {
      return _request(store, 'readonly', os => os.getAllKeys(), []).then(r => r || []);
    },
    getAll(store) {
      return _request(store, 'readonly', os => os.getAll(), []).then(r =>
        (r || []).map(rec => (rec && typeof rec === 'object' && 'value' in rec ? rec.value : rec))
      );
    },
  };

  window.IdbStore = IdbStore;
})();
