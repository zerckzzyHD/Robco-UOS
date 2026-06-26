# RobCo U.O.S. — Agent Rules

> Every rule here was formalized from a real bug or established by the project owner.
> Follow this document first, `ARCHITECTURE.md` second.

---

## Pre-Commit / Pre-Push Gate

```powershell
# → Bump CACHE_NAME in sw.js FIRST (Protocol 1 — required before EVERY push)
npm run lint        # ESLint — zero new errors
npm run format      # Prettier — all files clean
git add -A
git commit          # Pre-commit hook: 209 tests must pass
git push origin main  # CACHE_NAME must already be bumped (Protocol 1)
```

- **209 tests must pass.** If fewer pass, something is broken. Investigate before committing.
- **Bump `CACHE_NAME` before every push.** No push may ship without a new cache rev (Protocol 1) — this is a hard gate, not just for UI/JS changes.
- **Never use `--no-verify`** unless the user explicitly authorizes it for a stated emergency.

---

## Protocol 1 — Service Worker Cache Bump

Bump `CACHE_NAME` in `sw.js` before **every `git push`** — full stop. Every push must ship a new `CACHE_NAME` so every client is forced to update, regardless of what changed (this includes doc-only, config-only, and test-only pushes).

**Format:** `'robco-terminal-v{APP_VERSION}-r{N}'`

- `N` starts at 1 for each new `APP_VERSION`.
- Increment `N` on **every push**. No exceptions.

**Why:** The SW is cache-first. Without a new `CACHE_NAME`, cached users silently run the old build and never see the "REBOOT TERMINAL" update prompt. Bumping on every push guarantees the prompt fires for all clients on every release.

---

## Protocol 2 — Documentation Updates

After every meaningful commit, update these files **in the same commit:**

| File              | What to update                                         |
| ----------------- | ------------------------------------------------------ |
| `ARCHITECTURE.md` | Version header, any new/changed architecture sections  |
| `CHANGELOG.md`    | Add entries under the current version block            |
| `README.md`       | Current State section, feature tables, project history |

**Version bumps:** Always ask the user before bumping `APP_VERSION`. Never assume a bump is warranted.

### Protocol 2a — Test Count Sync

Whenever tests are **added or removed**, update the hardcoded count in **every** location below in the **same commit** as the test change. No deferred updates.

| File              | Location to update                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RULES.md`        | Pre-commit gate code block · Pre-commit gate note · Protocol 4 checklist · Protocol 5 checklist · Architecture Quick Reference (count + suite count if suites changed) |
| `README.md`       | Technology stack table · File structure comment · Commit workflow block · Current State bullet                                                                         |
| `ARCHITECTURE.md` | Pre-commit checklist (`all N+ tests`)                                                                                                                                  |
| `CHANGELOG.md`    | Header comment (`Tests: N/N`)                                                                                                                                          |

**How to find all stale counts before committing:**

```powershell
Select-String -Path "RULES.md","README.md","ARCHITECTURE.md","CHANGELOG.md" -Pattern "\d+ tests?" | Select-Object Filename,LineNumber,Line
```

Run this after every test addition or removal. Every hit must show the new count.

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
- [ ] Run `git commit` — 209 tests must pass
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
- [ ] Lint, format, commit (209 tests) → Protocol 2

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

| Never Do                                                    | Why                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `clients.claim()` in the service worker                     | Causes reload loops and black screens                             |
| `innerHTML +=` inside loops                                 | O(n²) DOM re-parsing. Use `map().join('')` with single assignment |
| Untrusted text directly as `innerHTML`                      | XSS risk. Always run through `escapeHtml()` first                 |
| `localStorage.getItem()` in audio hot paths                 | Read from the `AudioSettings` cache object instead                |
| Recursive key transformation on AI JSON responses           | Use explicit field mapping in `autoImportState()`                 |
| Silent drops of inventory during token triage               | Inventory must always be returned when relevant keywords match    |
| Auto-push to cloud on stat changes                          | Cloud sync is manual button only                                  |
| Implement or discuss features #44 or #45                    | Permanently excluded by owner                                     |
| Leave stale test counts in docs after adding/removing tests | Protocol 2a requires all counts updated in the same commit        |

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

**Test suite:** 209 tests across 10 suites in `tests/check-persistence.ps1` (PowerShell) and `tests/check-persistence.js` (Node). Covers parser sanity, autoImportState coverage, faction registry, skill keys, save envelope, file upload, cloud sync, backward compatibility, registry structural integrity, reputation 2D matrix, C2 CRUD function existence, C3 CAMPG tab DOM binding, and C4 Protocol 4 campaignMode (binary) + separation.
