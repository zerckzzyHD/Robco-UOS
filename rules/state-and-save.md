# Subsystem note — State, Saves, Migration & Durability

> **Load this when touching:** `js/core/state.js` · `js/core/idb.js` · `js/core/runtime.js` ·
> `js/services/api-import.js` · anything that adds or changes a field on `state`, the save
> envelope, `migrateState()`, or the IndexedDB durability shadow.
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## Protocol 4 — Adding a New State Field

Requires changes in **4 files minimum.** The pre-commit audit will block if any are missed.

- [ ] Add default value in `let state = { ... }` in `state.js`
- [ ] Add migration in `migrateState()` in `state.js`
- [ ] Add import handling in `autoImportState()` in `api.js`
- [ ] Add a sanitize entry in `sanitizeImportedContainer()` in `api.js` if the field is an array/object/typed value (born-compliant — every new typed state field is coerced on the cloud-pull / file-import path in its own commit)
- [ ] State the field's cloud-sync path in the commit — serialized-whole fields ride the save automatically; a dedicated Firestore doc needs its own additive/merge write (→ Protocol 34 cloud-sync determination)
- [ ] Update `getSystemDirective()` schema in `api.js` (if AI should return it)
- [ ] Add `render*()` in `ui-render.js` + call from `loadUI()` in `ui-core.js` (if it needs a UI panel)
- [ ] Add `<details class="panel">` block in `index.html` (if it needs a panel)
- [ ] Bump `CACHE_NAME` in `sw.js` → Protocol 1
- [ ] Run `npm run lint` and `npm run format`
- [ ] Run `git commit` — the test gate must pass clean
- [ ] Update `ARCHITECTURE.md`, `CHANGELOG.md`, `README.md` → Protocol 2

**Also required for a new state field:** add it to the `KNOWN_KEYS` tripwire set in
`tests/test.html` and cover it (Protocol 40, in `rules/testing-and-gates.md`), and register
any device-preference analogue in `META_MANIFEST` (Protocol UI-6, in `rules/ui-and-mobile.md`).

---

## State persistence model (reference)

`localStorage` key `robco_v8` is the synchronous authority. Debounced 500ms writes with
dirty-check. Flushed on `beforeunload` **and** `visibilitychange → hidden` (the reliable
mobile path). Also mirrored fire-and-forget into the IndexedDB `'campaign'` store (key
`'live'`, P8 durability shadow) so an Android localStorage eviction that spares IndexedDB is
recovered on the next boot — recovery-only, so a stale mirror never overwrites a newer local
value (Protocol 34; `state.js` `mirrorLiveContainer`/`restoreLiveContainerFromIdb`).

The two-store boundary — campaign state (`state` / `robco_v8`) vs. device prefs (`MetaStore` /
`META_MANIFEST`) — is a Protocol 23 boundary. Detail lives in `library/CODE_MAP.md`
§ Two-Store Boundary.

---

## Cloud-sync determination for a new state field

The full rule is **Protocol 34**, in `rules/auth-and-cloud.md`. The short form: every field
added to `state` declares its sync path in the same commit — **serialized-whole** (rides the
save container automatically; confirm the sanitizer covers it) or **dedicated document**
(needs its own additive / merge-safe write).

---

## Related notes

- AI → state import contract: `rules/ai-contract.md` (Protocols 14, 24)
- Cloud write safety: `rules/auth-and-cloud.md` (Protocols 34, 32/33/35)
- Test-harness obligations: `rules/testing-and-gates.md` (Protocols 13, 20, 40, 44)
