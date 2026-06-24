# RobCo U.O.S. — Agent Rules

> Every rule here was formalized from a real bug or established by the project owner.
> Follow this document first, `ARCHITECTURE.md` second.

---

## Pre-Commit Gate

```powershell
npm run lint        # ESLint — zero new errors
npm run format      # Prettier — all files clean
git add -A
git commit          # Pre-commit hook: 178 tests must pass
git push origin main
```

- **178 tests must pass.** If fewer pass, something is broken. Investigate before committing.
- **Never use `--no-verify`** unless the user explicitly authorizes it for a stated emergency.

---

## Protocol 1 — Service Worker Cache Bump

Bump `CACHE_NAME` in `sw.js` on **every commit** that modifies `index.html`, `css/terminal.css`, or any file in `js/`.

**Format:** `'robco-terminal-v{APP_VERSION}-r{N}'`

- `N` starts at 1 for each new `APP_VERSION`.
- Increment `N` on every qualifying commit. No exceptions.

**Why:** The SW is cache-first. Without a new `CACHE_NAME`, cached users silently run the old UI and never see the update prompt.

---

## Protocol 2 — Documentation Updates

After every meaningful commit, update these files **in the same commit:**

| File              | What to update                                         |
| ----------------- | ------------------------------------------------------ |
| `ARCHITECTURE.md` | Version header, any new/changed architecture sections  |
| `CHANGELOG.md`    | Add entries under the current version block            |
| `README.md`       | Current State section, feature tables, project history |

**Version bumps:** Always ask the user before bumping `APP_VERSION`. Never assume a bump is warranted.

---

## Protocol 3 — Source of Truth

- **Fallout game data** (items, quests, perks, locations): Source from `fallout.wiki` only. The AI acts as typist, not authority.
- **Architecture decisions:** `ARCHITECTURE.md` is canonical. Treat it as approved unless the user explicitly overrides.
- **Features #44 and #45** are permanently excluded. Never discuss, implement, or suggest alternatives.

---

## Protocol 4 — Adding a New State Field

Requires changes in **4 files minimum.** The pre-commit audit will block if any are missed.

- [ ] Add default value in `let state = { ... }` in `state.js`
- [ ] Add migration in `migrateState()` in `state.js`
- [ ] Add import handling in `autoImportState()` in `api.js`
- [ ] Update `getSystemDirective()` schema in `api.js` (if AI should return it)
- [ ] Add `render*()` in `ui.js` + call from `loadUI()` (if it needs a UI panel)
- [ ] Add `<details class="panel">` block in `index.html` (if it needs a panel)
- [ ] Bump `CACHE_NAME` in `sw.js` → Protocol 1
- [ ] Run `npm run lint` and `npm run format`
- [ ] Run `git commit` — 178 tests must pass
- [ ] Update `ARCHITECTURE.md`, `CHANGELOG.md`, `README.md` → Protocol 2

---

## Protocol 5 — Adding a New UI Panel

- [ ] Add `<details class="panel">` block in `index.html`
- [ ] Create `render*()` function in `ui.js`
- [ ] Call `render*()` from `loadUI()` in `ui.js`
- [ ] If it shows a count: add entry to `_updatePanelBadges()` in `ui.js`
- [ ] If AI changes should auto-expand it: add key to `expandPanelForCategory()` map in `ui.js`
- [ ] If it has a text input with autocomplete: call `wireInput()` in `initRegistryAutocomplete()` in `ui.js`
- [ ] Bump `CACHE_NAME` → Protocol 1
- [ ] Lint, format, commit (178 tests) → Protocol 2

---

## Protocol 6 — Adding a Registry Autocomplete Input

1. Add `<input type="text" id="newXxxName" ...>` in `index.html`
2. In `initRegistryAutocomplete()` in `ui.js`, add: `wireInput('newXxxName', 'category');`
3. If the category is new, add it to `FALLOUT_REGISTRY` in `registry.js`
4. Create `addXxx()` function in `ui.js` mirroring `addPerk()` / `addQuest()` pattern
5. Bump `CACHE_NAME` → Protocol 1

---

## Protocol 7 — Adding a New Audio Source

- [ ] Create function in `ui.js` using existing `audioCtx` via `ensureAudioCtx()`
- [ ] First guard: `if (AudioSettings.masterMute) return;`
- [ ] Second guard: `if (AudioSettings.<key>) return;`
- [ ] Add key to `AudioSettings` init block at top of `ui.js`
- [ ] Add checkbox toggle in `index.html` inside the Audio Systems details panel
- [ ] Add localStorage key to `toggleAudio()` keyMap in `ui.js`
- [ ] Add key to `toggleMasterMute()` un-mute restore logic in `ui.js`
- [ ] Add new setting to the Settings table in `ARCHITECTURE.md`
- [ ] Bump `CACHE_NAME` → Protocol 1

---

## Prohibited Patterns

| Never Do                                          | Why                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `clients.claim()` in the service worker           | Causes reload loops and black screens                             |
| `innerHTML +=` inside loops                       | O(n²) DOM re-parsing. Use `map().join('')` with single assignment |
| Untrusted text directly as `innerHTML`            | XSS risk. Always run through `escapeHtml()` first                 |
| `localStorage.getItem()` in audio hot paths       | Read from the `AudioSettings` cache object instead                |
| Recursive key transformation on AI JSON responses | Use explicit field mapping in `autoImportState()`                 |
| Silent drops of inventory during token triage     | Inventory must always be returned when relevant keywords match    |
| Auto-push to cloud on stat changes                | Cloud sync is manual button only                                  |
| Implement or discuss features #44 or #45          | Permanently excluded by owner                                     |

---

## Architecture Quick Reference

**Script load order** (global scope, not modules):

1. `js/database.js` → `databaseCSVs`, `lookupItemInDb()`
2. `js/state.js` → `state`, `APP_VERSION`, `FACTION_REGISTRY`, `SKILL_KEYS`, `saveState()`, `migrateState()`
3. `js/registry.js` → `FALLOUT_REGISTRY`, `registrySearch()` (read-only, never touches state)
4. `js/ui.js` → `appendToChat()`, `loadUI()`, all `render*()`, all audio, `updateMath()`
5. `js/api.js` → `autoImportState()`, `transmitMessage()`, `getSystemDirective()`
6. `js/cloud.js` → ES module, attaches `window.pushToCloud`, `window.pullFromCloud`

**AI contract:** Tri-Node JSON schema (`narrative`, `state`, `modal`). The AI is locked to `responseMimeType: 'application/json'`. It cannot produce freeform text.

**State persistence:** `localStorage` key `robco_v7`. Debounced 500ms writes. Flushed immediately on `beforeunload`.

**Test suite:** 178 tests across 10 suites in `tests/check-persistence.ps1` (PowerShell) and `tests/check-persistence.js` (Node). Covers parser sanity, autoImportState coverage, faction registry, skill keys, save envelope, file upload, cloud sync, backward compatibility, registry structural integrity, and reputation 2D matrix.
