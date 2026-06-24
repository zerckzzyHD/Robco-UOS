## [v2.0.0] — The Universal Fallout Companion OS<!-- Date: 2026-06-24 | Tests: 206/206 | Cache: robco-terminal-v2.0.0-r1 -->

### [C9/C10] FO3 AI Context Integration (2026-06-24)

- **AI Directive**: `getSystemDirective()` is now fully `gameContext` aware.
- **Dynamic Factions**: AI prompt now instructs using 12 FO3 factions or 11 FNV factions based on context.
- **Dynamic Skills**: AI prompt swaps Big Guns/Small Guns into the matrix when in FO3 context.
- **Irreversible Triggers**: AI safety net now warns of FO3 specific endpoints (Megaton, Purifier, Karma hit squads) based on context.

### Multi-Campaign Container Architecture (2026-06-24)

- **robco_v8 Container**: Upgraded root storage from bare `state` arrays to the `robco_v8` Multi-Campaign Container (`{ activeContext: 'FNV', campaigns: { FNV: {...}, FO3: {...} } }`), mathematically eliminating cross-game save contamination.
- **Legacy Migration**: App automatically detects legacy `robco_v7` saves, silently migrates them into the `robco_v8` FNV campaign slot, and leaves the `v7` string untouched on disk as an ultimate fail-safe backup.
- **Dynamic Registry Injection**: Removed hardcoded `<script src="js/reg_nv.js">`. `index.html` now reads `activeContext` and dynamically injects `reg_fo3` or `reg_nv` during boot sequence. Autocomplete lists are now perfectly game-isolated.
- **Hard Reload Context Switching**: Changing context in the CAMPG tab now saves the active context and triggers a `window.location.reload()`, completely annihilating stale DOM elements and closures, ensuring a pristine memory environment for the new game context.
- **Working Memory Mapping**: The global `let state = { ... }` object was left structurally untouched as "Working Memory". It correctly reads from and flushes to the active `robco_v8` campaign, requiring zero code churn to the hundreds of DOM read/write handlers in `ui.js`.
- **Atomic Cloud Sync**: `cloud.js` `pushToCloud` and `pullFromCloud` now transact the entire `robco_v8` container. Mobile and desktop sessions now execute holistic account-syncs, eliminating split-brain.
- **Unified Undo Pipeline**: Upgraded `undoLastSync()` to support dual-channel rollbacks. It seamlessly processes both volatile AI memory snapshots (`window._lastStateBeforeSync`) and hard-disk Cloud/File imports (`localStorage.getItem('robco_backup')`), resolving the inaccessible cloud rollback vulnerability. The "UNDO LAST SYNC" button now automatically surfaces on boot if a hard backup is detected.
- **AI Context Security Guard**: Patched a critical vulnerability where the AI could silently alter the active game context (e.g., hallucinating a `gameContext: FO3` key). The API gateway `autoImportState()` now explicitly intercepts and blocks context mutation to prevent save-slot destruction.

### [C10] World Map UX Redesign (2026-06-24)

- **2-Tier Map Zoom**: Solved the information density ceiling by upgrading the static 6x6 map grid into an interactive UI.
  - **Zoom Level 1 (World Grid)**: Displays the 36 major campaign zones with real-time `[YOU]`, `[·]`, and `[?]` density markers.
  - **Zoom Level 2 (Zone Detail)**: Clicking/tapping any zone zooms into a detailed scrollable layout listing every individual sub-location within that zone.
- **Micro-interactions**: Added `.map-cell` CRT hover states and instant touch-target expansion for mobile clients.
- **Dynamic Diagnostics**: Zoom Level 2 individually evaluates each discovered location and flags exactly which sub-location contains an undiscovered collectible.

### [C6] Faction Registry Modernization (2026-06-24)

- **Registry Pruning**: Removed 5 legacy FNV casino/caravan factions (`wgs`, `omertas`, `chairmen`, `vangraff`, `crimson`) and added `strip` and `freeside` to `FACTION_REGISTRY`.
- **Archival Migration**: `migrateState()` cleanly detects legacy keys and archives the data strings into `campaign_notes` prior to deletion, preventing user data loss.
- **Tests**: Persistence suite updated to validate the exact 11 canonical factions.

### [C7] TIMELINE Feature (2026-06-24)

- **Modal Interception**: Updated `api.js` `processTriNodeResponse()` to intercept any `modal` returned with title `"PROJECTED TIMELINE"`.
- **UI Shell Binding**: The timeline payload is now routed directly into `id="timelineDisplay"` in the CAMPG tab without popping the system modal overlay.
- **AI Instructions**: `[TIMELINE]` added to canonical command registry in `getSystemDirective()`.

---

## [v1.6.8] — Pre-Release Architecture<!-- Date: 2026-06-24 | Tests: 206/206 | Cache: robco-terminal-v1.6.8-r22 -->

### [F2] Mobile Sticky Tab Bar (2026-06-24)

- **Audit Verification**: Full read of `index.html`, `js/ui.js`, `css/terminal.css` confirmed all F4 JavaScript (switchTab, initTabs, expandPanelForCategory, keyboard shortcuts 1–4, data-tab attributes) was already complete. F4 closed.
- **Only Missing Piece (F2)**: `.tab-bar` had no `position: sticky` rule on mobile (< 1000px). On desktop the column is fixed-height so the bar stays visible; on mobile the page scrolls normally and the tab-bar disappeared off-screen.
- **Fix**: Added `@media (max-width: 999px)` block to `css/terminal.css`. `.tab-bar` gets `position: sticky; top: 0; z-index: 100; background: #010a07; padding-top: 4px`. Background matches the page background to prevent panel bleed-through.
- **No JavaScript changes required.**
- **CACHE_NAME**: Bumped to `robco-terminal-v1.6.8-r22`.

### [C5] Playthrough Type State Migration + wipeTerminal Fix (2026-06-24)

- **BLOCKER FIX — `wipeTerminal()` Reset Defect**: `window._defaultState` was referenced in `wipeTerminal()` but never defined, causing `Object.assign(state, {})` to do nothing. All campaign data (inventory, perks, quests, factions, collectibles, skills, etc.) survived a "new campaign" wipe. **Fix:** `window._defaultState = JSON.parse(JSON.stringify(state))` is now set in `state.js` immediately after the state definition, before any migration or load overwrites the live state object.
- **BLOCKER FIX — Playthrough Type Persistence Gap**: `robco_playstyle_type` was stored only in `localStorage`, excluding it from all six persistence paths (auto-save, export, import, cloud push, cloud pull, save slots). A player who exported and re-imported a save silently lost their Playthrough Type selection. **Fix:** Added `state.playthroughType` as a full Protocol 4 state field. `migrateState()` transfers the legacy `localStorage` value on first load.
- **New State Field `state.playthroughType`**: Added per Protocol 4 checklist. Default: `'standard'`. Valid values: `'standard'` | `'minmaxed'` | `'completionist'` | `'casual'` | `'speedrun'`. Migration: transfers from `localStorage('robco_playstyle_type')` if present.
- **`getSystemDirective()` Updated**: Now reads `state.playthroughType` instead of `localStorage('robco_playstyle_type')`. Behavioral strings unchanged.
- **`autoImportState()` Updated**: Added `playthroughType` import guard with allowlist validation.
- **`loadUI()` Updated**: Now restores `playthroughTypeSelect` dropdown and `completeRngToggle` checkbox from state on every call, ensuring slot loads and imports correctly update the CAMPG UI.
- **`onPlaythroughTypeChange()` Updated**: Now writes `state.playthroughType` and calls `saveState()` instead of writing to localStorage.
- **`wipeTerminal()` Updated**: Removes dead `robco_playstyle_type` localStorage key on campaign wipe.
- **Tests**: Suite 2e expanded from 13 to 19 tests (+6). Net suite count: 209/209. New assertions: `playthroughType` default, migration, import, directive read, `_defaultState` definition.
- **CACHE_NAME**: Bumped to `robco-terminal-v1.6.8-r21`.

### [C1] Reputation 2D Matrix Rewrite (2026-06-24)

- **2D Fame/Infamy Matrix**: Replaced 1D net-score standing system with canonical FNV 2D matrix. Fame and infamy are now fully independent axes. Standing is resolved by the intersection of fame rank × infamy rank per GECK data.
- **FACTION_THRESHOLDS**: New constant in `ui.js` — per-faction fame/infamy tier boundaries sourced from GECK `GetReputationThreshold` documentation (fallout.wiki). Covers all 11 FNV factions and all 11 FO3 factions.
- **11 Canonical Titles**: Idolized, Merciful Thug, Wild Child, Liked, Unpredictable, Accepted, Mixed, Soft-Hearted Devil, Dark Hero, Sneering Punk, Shunned, Hated, Neutral, Vilified.
- **Independent Display**: Faction cards now show `F:{fame} / I:{infamy}` instead of net score, reflecting the 2D model.
- **Panel-Close Bug Fix**: `renderFactionRep()` now saves and restores the `<details open>` state of the minor-factions panel before replacing `innerHTML`. Clicking F+/F-/I+/I- no longer collapses the minor faction section.
- **AI Directive Updated**: `api.js` system directive updated to instruct the AI that fame/infamy are independent and describe the 2D standing model.
- **Tests**: 9 new reputation matrix tests in `tests/check-persistence.js` (Suite 2b). All pass.
- **CACHE_NAME**: Bumped to `robco-terminal-v1.6.8-r16`.

### [C2] CRUD Completion (2026-06-24)

- **Perk Removal**: `removePerk(idx)` added to `ui.js`. Each perk entry in the Perks panel now includes an `[X]` delete button, consistent with the pattern used by Quest Log and Campaign Notes.
- **Collectible Toggle**: `toggleCollectible(name)` added to `ui.js`. Clicking `[ACQUIRED]` or `[MISSING]` labels in the collectibles panel toggles the collectible's state immediately and saves. Both labels are clickable with a tooltip hint. No full `loadUI()` re-render required — only `renderCollectibles()` is called for fast response.
- **Expanded Help Modal**: `showHelpModal()` rewritten with the full 27-command canonical registry from `api.js` (all 5 sections: Tactical, Inventory, Character, Navigation, Narrative). Title updated from "COMMAND CHEAT SHEET" to "COMM-LINK COMMAND REGISTRY". Displayed as a monospace box-drawing grid, matching the in-game [FEATURES] output exactly.
- **Tests**: 3 new tests in `tests/check-persistence.js` (Suite 2c): `removePerk` exists, `toggleCollectible` exists, help modal contains expanded registry.
- **CACHE_NAME**: Bumped to `robco-terminal-v1.6.8-r17`.

### [C3] CAMPG Tab + Game Context + Playstyle Relocation (2026-06-24)

- **CAMPG Tab**: 4th tab added to the tab bar (`data-tab="campg"`, keyboard shortcut `4`). `TAB_NAMES` expanded to `['stat', 'inv', 'data', 'campg']` in `ui.js`.
- **Game Context Selector**: `<select id="gameContextSelect">` added to CAMPG panel. Options: `Fallout: New Vegas` (FNV) and `Fallout 3` (FO3). Selecting FO3 shows an amber informational warning banner — FO3 data systems are not yet active (deferred to v2.0.0). `onGameContextChange()` handler updates `state.gameContext` and saves.
- **Playstyle Relocated**: Playstyle `<select>` moved from Security & Config panel to CAMPG panel. Security & Config now focuses purely on API key, optics, audio, cloud sync, and save management.
- **Wipe Terminal Relocated**: Wipe Terminal danger-zone button moved from Security & Config to CAMPG panel. CAMPG is now the authoritative location for all campaign lifecycle actions.
- **Timeline Shell**: `<div id="timelineDisplay">` placeholder added inside a collapsible PROJECTED TIMELINE panel in CAMPG. Displays "NO TIMELINE GENERATED" hint until the `[TIMELINE]` command is used (C7).
- **FO3 Warning Banner CSS**: `.fo3-warning-banner` class added to `terminal.css` — amber dashed border, small font, displayed when FO3 context is selected.
- **Context Restore on Load**: `onGameContextChange()` initializes the context selector and banner state on every page load from `state.gameContext`.
- **Tests**: 7 new tests in `tests/check-persistence.js` (Suite 2d): CAMPG tab button, panel, game context select, FO3 banner, timeline display, `onGameContextChange()` function, `TAB_NAMES` includes `campg`.
- **CACHE_NAME**: Bumped to `robco-terminal-v1.6.8-r18`.

### [C4] Playthrough Type + Complete RNG (2026-06-24) — _corrected by C4-fix_

- **New State Field `state.campaignMode`**: Added per Protocol 4 checklist. Default: `'standard'`. Valid values: `'standard'` | `'rng'` (binary RNG flag only). Migration guard: `if (s.campaignMode !== 'rng') s.campaignMode = 'standard'`.
- **Playthrough Type Selector**: `<select id="playthroughTypeSelect">` in CAMPG panel. Options: Standard, Min-Maxed, Completionist, Casual, Speedrun. Stored in `localStorage('robco_playstyle_type')` — **NOT a state field**. Handler: `onPlaythroughTypeChange(type)`.
- **Complete RNG Checkbox**: `<input type="checkbox" id="completeRngToggle">` in CAMPG panel — separate and independent from Playthrough Type. Stored as `state.campaignMode = 'rng'`. Handler: `onCampaignModeChange(checked)`.
- **Independent Systems**: Playthrough Type and Complete RNG are orthogonal. All combinations are valid: Completionist + RNG, Speedrun + RNG, Min-Maxed + RNG, Casual + RNG, etc.
- **Complete RNG Mode**: Checking the toggle shows a green banner and sets `state.campaignMode = 'rng'`. Opt-in only — requires Wipe Terminal + new campaign. Never automatically applied. Never retroactively applied to existing saves.
- **AI Directive — Behavioral Strings**: `getSystemDirective()` reads `robco_playstyle_type` from localStorage and injects the roadmap-specified behavioral instruction string for each type (e.g. `"Optimize all build decisions for maximum combat effectiveness."` for Min-Maxed). Both the playthrough type directive and the RNG directive are concatenated when both are active.
- **Protocol 4 compliance**: All 4 required locations updated: state.js default, `migrateState()` binary guard, `autoImportState()` handler, `getSystemDirective()` schema reference.
- **Tests**: 13 tests in `tests/check-persistence.js` (Suite 2e, updated in C4-fix): all 4 Protocol 4 locations, both DOM elements, both handlers, binary guard, behavioral strings, `robco_playstyle_type` read.
- **CACHE_NAME**: Bumped to `robco-terminal-v1.6.8-r20` (r19 was the initial incorrect C4; r20 is the corrected C4-fix).

### [C4-fix] Playthrough Type + Complete RNG Structural Correction (2026-06-24)

- **Root Cause**: The original C4 implementation merged Playthrough Type and Complete RNG into a single 6-option `<select id="campaignModeSelect">`, making combinations like Completionist + RNG impossible and contradicting the roadmap storage specification.
- **Correction Applied**:
  - Removed `<select id="campaignModeSelect">` (the merged 6-option control).
  - Added `<select id="playthroughTypeSelect">` (5 options: Standard, Min-Maxed, Completionist, Casual, Speedrun).
  - Added `<input type="checkbox" id="completeRngToggle">` (independent Complete RNG toggle).
  - Added `onPlaythroughTypeChange()` handler — writes `robco_playstyle_type` to localStorage only.
  - Rewrote `onCampaignModeChange()` to accept a boolean (from `this.checked`) instead of a string.
  - Narrowed `state.campaignMode` valid values from 6 to 2 (`'standard'` | `'rng'`).
  - Replaced descriptive mode labels in `getSystemDirective()` with roadmap-specified behavioral instruction strings.
  - Updated `autoImportState()` guard to binary (`cmV === 'rng'` / `cmV === 'standard'`).
  - Updated `migrateState()` guard to binary (`if (s.campaignMode !== 'rng') s.campaignMode = 'standard'`).
- **Migration safety**: Old saves with `campaignMode: 'minmaxed'`/`'completionist'`/`'casual'`/`'speedrun'` (from the incorrectly implemented C4) are reset to `'standard'` on first load. No data loss — those values were never user-facing in a shipped release.
- **Tests**: Suite 2e expanded from 7 to 13 tests; net suite count +6.
- **CACHE_NAME**: Bumped to `robco-terminal-v1.6.8-r20`.

### Major Features

- **STAT / INV / DATA Tab Navigation** (F2): Three top-level tabs replace the single-scroll layout. All panels remain in DOM, hidden via CSS class toggling. Keyboard shortcuts 1/2/3 switch tabs. Chat/Comm-Link and Tactical Dashboard remain persistent outside tabs. Mobile sticky bottom tab bar above chat input.
- **Game Context Abstraction Layer** (F1): `state.gameContext` field (`'FNV'` | `'FO3'`). `getFactionRegistry()` and `getSkillKeys()` getter functions are now context-aware. Boot sequence presents game context selection on first launch. AI system directive is a context-aware template.
- **Database & Registry Modularization** (F3): `database.js` → `db_nv.js`, `registry.js` → `reg_nv.js`. New `db_fo3.js` and `reg_fo3.js` (base game). Both expose identical globals — downstream code is game-agnostic.
- **Tab-Aware Panel Expansion** (F4): `expandPanelForCategory()` switches to the correct tab before opening a panel.
- **Save Slot Game Context Validation** (F5): Save envelopes store `gameContext`. Load/save operations display game context on each slot and warn with a confirmation dialog when loading a save with mismatched context.
- **New Campaign Flow** (F6): "WIPE TERMINAL — NEW CAMPAIGN" button in Security & Configuration. Double-confirmation dialog. Resets `state` to defaults, clears `chatHistory`, prompts game context selection.
- **V.A.T.S. Tactical Overlay** (G1): Browser-side deterministic hit% calculator. Reads PER, AGI, weapon skill, active chem boosts. Outputs estimated hit% per body region (HEAD/TORSO/ARMS/LEGS/EYES/GROIN) with ASCII bar display. Clearly labeled ESTIMATED. Full-width button in Tactical Dashboard.
- **Point-of-No-Return Safety Net** (G2): Context-aware prompt engineering in `getSystemDirective()`. FNV: warns before faction lockouts, Mr. House/Yes Man/Legion endings, quest branch closures. FO3: warns before karma threshold crossings, Megaton destruction, Purifier activation.
- **Active Chem/Magazine Visualizer** (G3): `renderStatus()` enhanced — active BUFFs with ticks > 0 apply green highlight to affected Skill Matrix rows. Countdown tick display. Highlight snaps off on expiry.
- **Expanded Karma System (FO3)** (G4): When `gameContext === 'FO3'`: Faction Standing panel hidden, Karma Center panel shown. Thresholds: Very Evil (<-750) / Evil (<-250) / Neutral / Good (>250) / Very Good (>750). Karma bar, companion availability notes, Enclave hit squad warning.
- **Collectibles System** (G5): `state.collectibles[]` tracks acquired collectible names. INV tab panel showing ACQUIRED/MISSING status for FNV Snow Globes (7) and FO3 Bobbleheads (20). Terminal-style `[ACQUIRED]` / `[MISSING]` markers only. Panel badge shows `n/total`.
- **Regional Zone Map** (G6): DATA tab persistent World Map panel. 6×6 CSS grid from `FALLOUT_REGISTRY.zones`. `[YOU]` blinking cursor on current zone (fuzzy match against `state.loc`), `[·]` visited breadcrumb from `state.locationHistory`, `[?]` uncollected collectible zone markers.
- **Calendar Date Display** (G7): In Bio-Metrics panel as `DATE: OCT 19, 2281`. Starting date constants per game context (FNV: October 19, 2281; FO3: August 17, 2277). Offset computed from `state.ticks`.

### Audio Additions

- **H1 — Rotary Dial Clicks**: Short synthesized click (square wave, ~2000Hz, 15ms decay) on `<details>` toggle and tab switch. `panelClick` AudioSettings key.
- **H2 — Thermal Load Pitch Shift**: During API call: CRT hum shifts 60Hz→80Hz over 5s, gain +20%. On return: snaps to 60Hz. No new AudioSettings key — modifies existing hum.
- **H3 — Level Up Jingle**: Triggered when `autoImportState()` detects `state.lvl` increase. Three-note ascending arpeggio (sine, 440→660→880Hz, 80ms/note). `levelUp` AudioSettings key.
- **H4 — Low Health Heartbeat**: Activates when HP < 25% (checked in `updateMath()`). Sine pulse ~1.2Hz, gain proportional to HP deficit. When concurrent with tinnitus (crippled head), tinnitus gain reduces 50%. `heartbeat` AudioSettings key.
- **Boot Sequence Drone** (bonus): Sawtooth 30→60Hz power-on ramp on first user interaction after boot. `bootDrone` AudioSettings key.

### Immersion Polish

- **I1 — Hardware Memory Dump Errors**: API errors and parse failures render as `> ⚠ FATAL EXCEPTION AT 0x{hex} — MODULE: COMM_LINK — {error}`. Pure string formatting in `transmitMessage()` catch blocks.
- **I2 — Collectibles in Session Statistics**: Session Statistics displays `COLLECTIBLES: {collected}/{total}`.

### Data

- **FNV Registry** (`reg_nv.js`): Added `collectibles` (7 Snow Globes with zone location hints) and `zones` (6×6 Mojave grid, 36 named zones with fuzzy location arrays) to the FNV registry.
- **FO3 Registry** (`reg_fo3.js`): Added `collectibles` (20 Bobbleheads — STRENGTH, PERCEPTION, ENDURANCE, CHARISMA, INTELLIGENCE, AGILITY, LUCK, MEDICINE, SCIENCE, REPAIR, LOCKPICK, SPEECH, BARTER, SNEAK, EXPLOSIVES, ENERGY WEAPONS, MELEE WEAPONS, SMALL GUNS, UNARMED, BIG GUNS) with location hints. Added `zones` (6×6 Capital Wasteland grid, 36 named zones).
- **FO3 Database** (`db_fo3.js`): Base game weapons, armor, chems, enemies for Fallout 3.

### Internal

- **Tests**: 178/178 passing.
- **Cache**: Bumped Service Worker cache to `robco-terminal-v1.6.8-r13`.
- **ESLint globals**: Added all new functions: `switchTab`, `renderCollectibles`, `renderGameDate`, `renderWorldMap`, `renderKarmaCenter`, `_updateContextPanels`, `showVATSOverlay`, `wipeTerminal`, `playPanelClick`, `playLevelUpJingle`, `startHeartbeat`, `stopHeartbeat`, `playBootDrone`, `startThermalLoad`, `stopThermalLoad`.

---

## [v1.6.8] — Implementation Polish: Notes, Status, Squad, and UI Enhancements

<!-- Date: 2026-06-23 | Tests: 165/165 | Cache: robco-terminal-v1.6.8-r5 -->

### Added

- **Campaign Notes enhancements**: Notes now have individual delete buttons. Auto-logged quest events are visually distinct (opacity 0.65). Added UI form to manually add notes.
- **Quest status auto-logging**: Changes to active quests are automatically appended to campaign notes with a timestamp.
- **Status Effects UI**: Added form to manually add custom buffs/debuffs/neutral effects with tick counters, and delete buttons to remove them.
- **Squad Add form**: Squad list now has a form to add new companions with autocomplete from the companion registry. Companions can be removed via delete buttons.
- **Tactical Command Quick-Reference**: Replaced standalone "COMMAND CHEAT SHEET" button with a compact `[?]` button positioned next to the chat input token budget display. Opens a modal with tactical command shorthand.
- **Collapsible D-Pad**: The D-Pad in the Tactical Dashboard is now enclosed in an open `<details>` tag for better vertical space management on smaller screens.

### Fixed

- **Status Effects badge filtering**: Removed `.filter(s => s.ticks !== 0)` logic from `_updatePanelBadges` to allow permanent status effects to be correctly counted in the panel badge.
- **GPS/MAP title logic**: Removed redundant map title fallback detection (`getLegacyTitle()`) in `api.js` modal handler. Now exclusively relies on `mType === 'GPS'`.
- **ARCHITECTURE.md references**: Updated stale `getRelevantDbContext` reference to `lookupItemInDb` and corrected `changelog.txt` to `CHANGELOG.md`.
- **Input box cutoff**: Increased min-width of number inputs across UI panels so placeholder text (Qty, lbs, val, Rank, Lvl) is fully visible instead of cutting off behind spin buttons.
- **Tactical Dashboard layout**: Converted `.tactical-dashboard` to CSS Grid. When the D-PAD details panel is closed, the combat/macro buttons (`[THREAT]`, `[VATS]`, etc.) now flow dynamically to the left to fill the empty space below the D-PAD header.

### Internal

- **Tests**: 165/165 passing (JS runner) / 161/161 passing (PS1 runner). Added 4 new automated suites: DOM ID Binding (`syncStateFromDom`), Protocol 4 Migration Enforcement, `migrateState()` Node.js Runtime Execution, and Service Worker Cache Guard. Added `state.skills` to legacy keys exclusion list.
- **Cache**: Bumped Service Worker cache to `robco-terminal-v1.6.8-r5`.
- **Version**: App bumped to 1.6.8.

---

## [v1.6.7] — Modernization Pass: Dead Code Cleanup, CSV Expansion, Ammo Panel

<!-- Date: 2026-06-22 | Tests: 137/137 | Cache: robco-terminal-v1.6.7-r4 -->

### Added

- **Ammo Reserves sub-panel** (index.html): Nested `<details class="sub-panel" id="ammoSubPanel">` inside BACKPACK INVENTORY panel. Groups ammo tracking contextually with inventory, preventing duplicate tracking between `state.inventory` and `state.ammo`.
- **`renderAmmo()`** (ui.js): Renders `state.ammo` as an alphabetically sorted grid (caliber | count | X button). Uses O(n) map/join pattern matching all other render functions. Displays "No Ammo Tracked" when empty.
- **`addAmmo()`** (ui.js): Reads `#newAmmoType` and `#newAmmoCount` inputs. Validates and accumulates into `state.ammo` object. Clears inputs and calls `saveState()` + `loadUI()`.
- **`removeAmmo(caliber)`** (ui.js): Deletes caliber key from `state.ammo`, saves and re-renders.
- **Ammo panel badges** (ui.js): `_updatePanelBadges()` wired for ammo — badge shows count of tracked caliber types. `expandPanelForCategory('ammo')` opens BACKPACK INVENTORY parent and explicitly opens `#ammoSubPanel`.
- **`addItem()` smart routing** (ui.js): If resolved type is `'ammo'`, item routes to `state.ammo` instead of `state.inventory`. Backpack search field can add ammo — it goes to the sub-panel automatically.
- **BACKPACK INVENTORY combined badge** (ui.js): Badge now shows non-ammo inventory count + ammo caliber count combined.
- **Ammo caliber autocomplete** (ui.js, index.html): `#newAmmoType` uses `list="ammoCalibers"` with a native `<datalist>` populated at startup by `initAmmoDatalist()` → `getAmmoCalibers()`. Shows all ~15 canonical calibers from AMMO.CSV.
- **`getAmmoCalibers()`** (database.js): Parses AMMO.CSV section, deduplicates caliber column, returns sorted `string[]`. Pure function, no side effects.
- **`initAmmoDatalist()`** (ui.js): Wires datalist to caliber list on `window.onload` alongside `initRegistryAutocomplete()`. `typeof` guard for safe load order.
- **State diff ammo delta** (api.js): `[DELTA]` display now includes ammo round delta line (e.g. `ammo: 120→95 rounds`).

### Fixed

- **Inventory stack-on-duplicate weight correction** (ui.js): When adding an item that already exists in inventory with `weight=0`, if the new add resolves a real weight from DB lookup, the existing entry is retroactively corrected. Fixes "Enclave Power Armor shows 0 lb" class of bugs.
- **`renderInventory()` ammo filter** (ui.js): Filters `type==='ammo'` items from main inventory list. Uses `_origIdx` tuple pattern to preserve correct `data-idx` and `data-use` attributes after filtering — prevents `delItem()`/USE button index corruption.
- **Phantom weight** (ui.js): `updateMath()` carry weight excludes `type==='ammo'` items from `state.inventory`. Legacy saves with ammo in inventory would have shown phantom weight — items invisible in UI but still contributing to the weight counter.
- **AI ammo dedup** (api.js): `autoImportState()` silently reroutes `type==='ammo'` items from the AI's inventory array to `state.ammo`. Belt-and-suspenders against AI ignoring the updated directive.

### Changed

- **Ammo panel structure** (index.html): AMMO RESERVES removed as standalone top-level `<details class="panel">`. Now a nested `<details class="sub-panel">` inside BACKPACK INVENTORY.
- **AI inventory schema** (api.js): Removes `"ammo"` from the inventory type enum in the system directive. AI instructed to use `state.ammo` ({caliber → count}) instead.
- **State diff inventory count** (api.js): Inventory count in `[DELTA]` display now excludes ammo-typed items.
- **`.sub-panel` CSS class** (terminal.css): New class for nested `<details>` inside top-level panels. Uses `h3`, dashed top border, `[+]/[-]` toggle indicator. Does not inherit `.panel` border/background — visually subordinate.

### Removed

- **`getRelevantDbContext()`** (database.js): Dead function (14 lines). Legacy token-triage filter never called after `systemInstruction` refactor in v1.6.6. ESLint global updated: `getRelevantDbContext` → `lookupItemInDb`.
- **`state.macros`**: Array never written or read by any active code path. D-Pad handles command shortcuts. `migrateState()` now deletes the key from old saves. `autoImportState()` block removed.
- **Standalone AMMO RESERVES badge**: Replaced by the combined BACKPACK INVENTORY badge.

### Data

- **WEAPONS.CSV**: 51 → ~170 entries. Added all missing weapons: unarmed (Bear Trap Fist, Displacer Glove, Fist of Rawr, Mantis Gauntlet, Pushy, Rebound, Zap Glove), bladed melee (Blade of the East, Bowie Knife, Broad Machete, Chance's Knife, Figaro, Katana, Machete Gladius, Shishkebab, Straight Razor), blunt melee (Baseball Bat, Bumper Sword, Golf Club, Oh Baby!, Sledgehammer, Super Sledge, Thermic Lance, Tire Iron, Two-Step Goodbye, War Club), thrown (Throwing Knife, Throwing Knife Spear), pistols (Hunting Revolver, .45 Auto Pistol, 5.56mm Pistol, A Light Shining in Darkness, Li'l Devil, Maria, Police Pistol, Ranger Sequoia, Silenced .22 Pistol, That Gun, Weathered 10mm), rifles (Abilene Kid LE BB Gun, Assault Carbine, Automatic Rifle, Battle Rifle, BB Gun, Bozar, Christine's Silencer Rifle, La Longue Carabine, Light Machine Gun, Medicine Stick, Paciencia, Ratslayer, Survivalist's Rifle, Varmint Rifle), SMGs (10mm Submachine Gun, Vance's 9mm, H&H Nail Gun, Silenced .22 SMG, Sleepytyme), shotguns (Big Boomer, Caravan Shotgun, Dinner Bell, Riot Shotgun, Sawed-Off, Single Shotgun, Sturdy Caravan), heavy (CZ57 Avenger, FIDO, K9000, Shoulder Mounted Machine Gun), energy (Alien Blaster, Compliance Regulator, MF Hyperbreeder Alpha, Pew Pew, Recharger Pistol, AER14 Prototype, Elijah's LAER, LAER, Laser RCW, Recharger Rifle, Plasma Defender, Q-35 Matter Modulator, YCS/186, Heavy/Light Incinerator, Multiplas Rifle, Tesla-Beaton Prototype), explosives (Grenade Machinegun, Grenade Rifle, Red Glare, Annabelle, Mercy, Pulse Grenade, Holy Frag Grenade, Frag Mine, Plasma Mine, Pulse Mine, Tin Grenade, Dynamite). All base-game canonical stats.
- **ARMOR.CSV**: 15 → ~68 entries. Added: Advanced Radiation Suit, Armored Vault 13/21 Jumpsuit, Assassin Suit, Caesar's Armor, Chinese Stealth Armor, Gecko-Backed variants, Gladiator Armor, Great Khan armors, Joshua Graham's Armor, Leather Armor Reinforced, Lightweight Leather Armor, NCR Trooper Fatigues, Radiation Suit, Raider (4 variants), Sierra Madre Armor (2), Space Suit, Tribal Raiding Armor, Advanced Riot Gear, Combat Armor Reinforced Mk2, Lightweight Metal Armor, NCR Bandoleer/Ranger Combat Armor, Recon Armor, Riot Gear, Van Graff Combat Armor, 1st Recon (2), Brotherhood T-51b, Gecko-Backed Metal Armor, Legate's Armor, Metal Armor Reinforced, Remnants Tesla Armor, Scorched Sierra Power Armor, T-45d Power Armor, Tesla Armor. All canonical DT/weight/value values.
- **CHEMS.CSV**: 20 → ~45 entries. Added: Steady, Rocket, Cateye, Dixon's Jet, Party Time Mentats, Blood Shield, Rushing Water, Ant Nectar, Healing Powder, Healing Poultice, Purified Water, Dirty Water, Beer, Scotch, Vodka, Wine, Absinthe, Moonshine, Gecko Steak, Brahmin Steak.

### Internal

- **Tests**: 137/137 passing (down from 138 — one test retired with the removed `getRelevantDbContext()` function).
- **Tests**: Suite 9.2 updated — was checking for `getRelevantDbContext()` → now checks for `lookupItemInDb()`. Suite 9.4 updated — was checking `[TH]` in `triggerWords` → now checks `lookupItemInDb` presence in `database.js`.
- **ESLint globals**: Added `renderAmmo`, `addAmmo`, `removeAmmo`, `initAmmoDatalist` (ui.js), `getAmmoCalibers` (database.js) as readonly globals.
- **`changelog.txt` renamed to `CHANGELOG.md`**: File format modernized to GitHub-Flavored Markdown. Fetch references updated in `ui.js` (×2 calls + version-split regex) and `sw.js` (asset cache list).
- **SW cache**: v1.6.7-r3 → v1.6.7-r4 (CHANGELOG.md rename + asset list update).

---

## [v1.6.6] — THREAT Database Remediation & Full CSV Population

<!-- Date: 2026-06-22 | Tests: 138/138 | Cache: robco-terminal-v1.6.6-r5 -->

### Fixed

- **`[TH]` shorthand** (database.js): `'[TH]'` was missing from `triggerWords` — every `[TH]` command silently omitted the database payload. Added to `triggerWords` array.
- **`[THREAT]` inventory context** (api.js): `'[THREAT]'` and `'[TH]'` added to `invKeywords` — AI now receives Courier equipped weapon, armor, and ammo payload for DPS/TTK calculations on threat assessment commands.

### Changed

- **Database injection architecture** (api.js): `databaseCSVs` moved from `contents[]` into `systemInstruction.parts[1]` (always-present, unconditional). Eliminates long-session attention dilution where the database was buried in message history. `getRelevantDbContext()` retained as legacy utility but no longer called from `transmitMessage()`.

### Data

- **BESTIARY.CSV**: 4 → 63 entries. Added: Bloatfly, Giant Bloatfly, Radroach, Mole Rat, Coyote, Coyote Alpha, Jackal Gang (2), Bark Scorpion, Giant Bark Scorpion, Radscorpion, Albino Radscorpion, Spore Plant, Giant Mantis (2), Giant Ant (2), Gecko, Golden Gecko, Fire Gecko, Lakelurk (2), Bighorner (2), Cazador, Giant Cazador, Tunneler, Powder Gangers (2), Viper (2), Great Khan (2), Fiend (2), Omerta Thug, Chairmen Thug, Feral Ghoul (3), Glowing One, Nightkin, Super Mutant (3), Legion faction units (6), NCR faction units (3), White Leg, Dead Horses, Deathclaw (3), Protectron, Mister Gutsy, Mister Handy, Sentry Bot, Eyebot, Securitron Mk I/II.
- **WEAPONS.CSV**: 6 → 51 entries. Full unarmed/melee set, complete handgun/rifle/shotgun/SMG roster, heavy weapons, energy weapons, and thrown weapons.
- **AMMO.CSV**: 7 → 47 subtypes. All major calibers with Standard/HP/AP/Surplus variants: 5.56mm, 9mm, .357, .44, .45 Auto, .45-70, .50 MG, 10mm, 12 Gauge, 12.7mm, .308, 5mm, EC (4 subtypes), 2mm EC, 40mm Grenade, Flamer Fuel, Missile.
- **ARMOR.CSV**: 4 → 19 entries. NCR Trooper/Ranger/Veteran Ranger, Legion Centurion, Desert Ranger, Elite Riot Gear, Power Armor (T-45d, T-51b, NCR Salvaged, Remnants), Stealth Suit Mk II.
- **CHEMS.CSV**: 4 → 20 entries. Added: Buffout, Med-X, Psycho, Super Stimpak, RadAway, Rad-X, Antivenom, Hydra, Fixer, Doctor's Bag, Jet, Ultrajet, Turbo, Mentats, Slasher, Whiskey Rose, Nuka-Cola (2), Atomic Cocktail.
- **MISC.CSV**: 4 → 18 items. Added: Scrap Electronics, Sensor Module, Fission Battery, Conductors, Pilot Light, Wonderglue, Duct Tape, Surgical Tubing, Tin Can, Leather Belt, Abraxo Cleaner, Empty Nuka-Cola Bottle, Sunset Sarsaparilla Bottle + Star Cap.
- **RECIPES.CSV**: 1 → 10 recipes. Added: Doctor's Bag, Frag Grenade, Molotov Cocktail, Nuka Grenade, Homemade Knife, Hand-Loaded .308, Hand-Loaded .44, Snakebite Tourniquet, Wasteland Omelet.
- **QUEST_ITEMS.CSV**: NEW TABLE — 0 → 19 entries. Quest-critical items: Platinum Chip, Lucky 38 VIP Keycard, Benny's Lighter, Benny's Hat, NCR Dog Tags, Remnants Passcard, Euclid's C-Finder, ARCHIMEDES II Holotape, Omertas Hit List, Vault 3 Master Key, Lucky 38 Presidential Suite Key, Snowglobes, Khans Disguise, NCR Emergency Radio, Deathclaw Egg, HELIOS One Power Chip, Mysterious Magnum, Joshua's Bible, Burned Man's Flag.
- **VENDORS.CSV**: 2 → 14 vendors. Added: Alexander, Michelle Kerr, Samuel, Camp McCarran QM, Blake, Dale Barton, Knight Torres, Mick, Ralph, Old Lady Gibson, Cliff Briscoe, Jules.

### Internal

- **Tests**: 138/138 passing. Suite 9 (Database structural integrity) — 15 new tests added to `check-persistence.js` and `check-persistence.ps1`. Validates all 9 CSV sections, `[TH]` in `triggerWords`, BESTIARY row count ≥ 30, `[THREAT]`/`[TH]` in `invKeywords`, `systemInstruction` DB placement, and `database.js` purity contract (no `state`/`localStorage`/`chatHistory` refs).
- **Token budget estimate**: 4,000 → 6,500 in `ui.js` to account for directive + `databaseCSVs` always in `systemInstruction`.
- **SW cache**: v1.6.5-r2 → v1.6.6-r5. Intermediate revisions r3/r4 folded into v1.6.6 final.
- **Version strings**: `index.html` title/h1, `manifest.json` name, `APP_VERSION` in `state.js` all bumped to 1.6.6.

---

## [v1.6.5] — Fallout Data Registry: Data Population & Autocomplete Panel

<!-- Date: 2026-06-22 | Tests: 119/119 | Cache: robco-terminal-v1.6.5-r2 -->

### Added

- **Registry autocomplete panel** (ui.js): `initRegistryAutocomplete()` singleton dropdown wired to `#newQuestName` and `#newItemName` inputs. Queries `registrySearch()` with 150ms debounce, minimum 2 characters.
- **Keyboard navigation** (ui.js): ArrowUp/Down to highlight, Enter to select, Escape to dismiss autocomplete dropdown.
- **Click-to-fill** (ui.js): Uses `mousedown` event to beat blur ordering — no accidental dismissals.
- **Autocomplete positioning** (ui.js): Fixed positioning with viewport clamping; auto-repositions on scroll and resize.
- **Autocomplete CRT styling** (terminal.css): 7 new rules — `.autocomplete-panel`, `.ac-item`, `.ac-item-name`, `.ac-item-tag`, `.ac-empty`. Glow border, dark translucent background, dashed separators, type/level tag hints per row.

### Data

- **Quests registry**: 130 entries across tutorial, main (Yes Man / Mr. House / NCR / Legion), side, companion, and unmarked categories.
- **Perks registry**: ~90 regular perks (level-gated), 8 companion perks, 16 challenge perks, 5 special perks.
- **Locations registry**: ~120 named Mojave Wasteland map markers (settlements, vaults, caves, camps, casinos, bases, factories, landmarks).
- **Companions registry**: All 8 humanoid permanent companions + ED-E + Rex, with full names and recruit locations.
- **Items category**: Deferred to future phase (larger dataset, requires deeper wiki extraction).

### Internal

- **Tests**: 119/119 passing. 0 new ESLint issues introduced.
- **`registry.js` version**: Bumped to `2.0.0` to signal data population milestone.
- **SW cache**: v1.6.4 → v1.6.5-r2.
- **`index.html`** title and `h1` bumped to 1.6.5.
- **Attribution**: CC-BY-SA 3.0 note maintained in `README.md` (fallout.wiki requirement).
- **Branch**: Pre-phase2 safety checkpoint branch created (`checkpoint/pre-phase2`).

---

## [v1.6.4] — The Systems Architecture Update

<!-- Date: 2026-06-22 | Tests: N/A | Cache: robco-terminal-v1.6.4 -->

### Added

- **Quest Log** (ui.js, api.js): `state.quests[]` tracks name, status (active/complete/failed), current objective, and involved factions. New QUEST LOG panel with add/remove UI. `renderQuests()` color-codes by status. AI directive updated with full schema. AI auto-updates quests on narrative events.
- **Equipped item tracking** (ui.js, api.js): `state.equipped = {weapon, armor, headgear}`. Rendered in BIO-METRICS panel below weight. `renderEquipped()` shows active loadout in danger/blue color coding. AI directive updated so equipping/unequipping gear updates `state.equipped`.
- **Multiple save slots** (ui.js): 3 named slots (A/B/C) stored as `robco_slot_1/2/3` in localStorage. Each slot stores the full envelope (version, state, chat, playstyle, savedAt). SAVE A/B/C and LOAD A/B/C buttons in Security panel. Uses `migrateState()` on load. Slot status shown below buttons.
- **Session statistics** (ui.js, api.js): `state.stats = {kills, capsEarned, damageDealt, sessionStart}`. SESSION STATISTICS panel with live elapsed time, tick count, location visits. AI returns delta stats per combat turn. RESET SESSION button resets all counters. `renderSessionStats()` auto-updates on `loadUI()`.
- **Token budget display** (ui.js): Real-time token estimate below chat textarea. Shows `~N / 128K tokens (N%)`. Color-coded: blue (ok), amber (>50%), red (>80%). Updates on every keystroke. Context limit scales with model name (1M for 1.5/2.0 models).
- **Item category tags** (ui.js): `addItem()` reads a type dropdown (weapon/armor/aid/ammo/misc). `renderInventory()` shows `[TYPE]` tag in matching danger/blue/green/amber color. Old items without type default to `[MISC]`.
- **Keyboard shortcuts** (ui.js): Ctrl+1–6 toggle the first 6 panels. Ctrl+/ focuses chat input. Panel state persisted to `robco_panel_state` on toggle. No conflicts with existing browser shortcuts.
- **Radiation treatment alert** (ui.js): `radAwayAlert` div in BIO-METRICS shows when rads ≥ 200. Calculates doses needed (rads / 150, rounded up). Amber if RadAway is in inventory, red if not.
- **Quest and equipped auto-expand** (api.js): `quests` and `equipped` added to the auto-expand panel watch list in `autoImportState()`. Any AI-driven quest or equipment change opens the relevant panel.
- **Status effect tick-down** (api.js): Timed status effects (`ticks > 0`) auto-decrement each AI sync. Effects reaching 0 are removed and the Courier is notified via sys chat.
- **Day/Night indicator** (ui.js, terminal.css): `body.time-night` CSS class applied when in-game hour is 20:00–06:00. Night hours dim the container with a subtle blue tint.
- **Notification badges** (ui.js): Panel headers (Perks, Inventory, Squad, Status Effects, Notes) show amber count badges when non-empty. Updated after every `updateMath()` call.
- **Faction consequence triggers** (api.js): `autoImportState()` alerts the Courier when any major faction crosses Vilified (−500) or Idolized (+750) net standing threshold.
- **Karma event flash** (terminal.css): Brief screen-edge glow (green/red) fires when karma changes by ≥ 50 points in a single sync. CSS-only animation.
- **Critical HP flash** (terminal.css): Red background flash when HP drops below 25% from above it.
- **Panel memory** (ui.js): All `<details class="panel">` open/closed state persisted in localStorage (`robco_panel_state`). Restored on load.
- **Input history** (ui.js): Up/Down arrows cycle through previously sent chat commands from `chatHistory`.
- **Sync SFX** (ui.js): Subtle two-note confirmation tone (880Hz → 1320Hz) after every successful AI state sync. Respects master mute.
- **Consumable quick-use** (ui.js): Each inventory row has a USE button that auto-sends `[USE] ItemName` to chat.
- **Skill check indicators** (ui.js): `[SkillName N]` patterns in AI narrative render green/red with pass/fail mark and ping the skill input.
- **Companion affinity bar** (ui.js): `renderSquad()` shows an affinity bar (0–100%) for squad members with an `affinity` field.
- **Typewriter speed control** (ui.js): TYPER SPD slider (0.25×–3×) in Audio Systems. Stored in `robco_typer_speed`, restored on load.
- **Auto-retry on API failure** (api.js): One silent retry on 500/502/503 transient errors after 2.5 seconds.
- **Location history** (state.js): `state.locationHistory[]` tracks last 10 distinct visited locations. Saved with state.
- **Markdown campaign log export** (ui.js): `exportCampaignLog('md')` exports chat as a formatted Markdown document.
- **HTML campaign log export** (ui.js): `exportCampaignLog('html')` generates a styled HTML export matching active optics color.
- **Perk tracker** (ui.js, api.js): `state.perks = []`. New collapsible PERKS panel. `renderPerks()` displays acquired perks with rank and level. System directive updated with perk schema and `[LEVEL UP]` instructions.
- **Companion weapon display** (ui.js): `renderSquad()` renders `member.weapon` and `member.dt` if present. Null-safe — only renders if field exists.
- **Item value field** (ui.js): Inventory items support a `val` field (caps value). `addItem()` reads new val input. `renderInventory()` displays "(Xc)" after weight if val is set.
- **XP progress bar** (ui.js): Blue XP bar below LVL/XP inputs. `updateMath()` computes XP percentage using the documented quadratic formula `(25*Lv²+125*Lv-150)`. Capped at Lv50.
- **Master mute toggle** (ui.js): Single "MASTER MUTE (ALL AUDIO)" checkbox above six individual controls. Persists to localStorage. All 8 audio-producing functions check `AudioSettings.masterMute` first.
- **Session resume briefing** (ui.js): After boot, if a save exists, a compact status briefing is appended to chat: location, game time, HP, caps, rads, squad, crippled limbs, last campaign note. No API call.
- **Model list auto-refresh** (api.js): On startup, if an API key is stored, `fetchAuthorizedModels()` is called silently 2 seconds after boot. Keeps the model dropdown current without user intervention.
- **State diff display** (api.js): After every AI sync, `autoImportState()` diffs the pre-sync snapshot against new state and appends a `> [DELTA] key: old→new | ...` line to chat for changed primitives, SPECIAL stats, limbs, or inventory count.
- **Radiation SPECIAL debuff display** (ui.js): `loadUI()` colors SPECIAL stat inputs red and adds a tooltip when rad level triggers a debuff (200+=−END, 400+=−AGL, 600+=−STR, 800+=−PER, 1000+=all −3). Display-only — does not modify state values.
- **AI schema update** (api.js): State schema example now includes `quests`, `equipped`, `stats`, and `affinity` on squad members. Three new directive sections added: Quest Log System, Equipped Items System, Session Statistics.

### Security

- **API key in request header** (api.js): Gemini API key moved from URL query parameter (`?key=...`) to request header (`x-goog-api-key`). Previously appeared in browser history, server logs, and referrer headers. Applied to both `transmitMessage()` and `fetchAuthorizedModels()`.
- **`flatten()` removal** (api.js): Recursive `flatten()` function removed from `autoImportState()`. Had no depth limit, was vulnerable to stack overflow, and silently accepted out-of-range values. Replaced with explicit typed field-mapping. All SPECIAL attributes hard-capped 1–10, HP bounded 0–hpMax, ticks monotonic, caps ≥ 0, karma −1000–1000. Limbs only accept "OK" or "CRIPPLED". Parse errors now surface a visible SYS-ALERT.

### Changed

- **Cancel button + timeout** (api.js): TRANSMIT PROTOCOL button becomes CANCEL during API calls. `AbortController` handles both user cancellation and a 45-second automatic timeout. Cancelled requests show "> TRANSMISSION CANCELLED."
- **Cloud save timestamps** (cloud.js): `pushToCloud()` writes `savedAt: Date.now()` to Firestore. `pullFromCloud()` compares timestamps and warns before overwriting newer local saves with older cloud data.
- **Faction change auto-logging** (api.js): `autoImportState()` diffs faction values before and after each AI sync. Any fame or infamy change is automatically appended to `campaign_notes` as `"[T{ticks}] {Faction}: fame +N"`.
- **`APP_VERSION` constant** (state.js): Single source of truth for the version string, previously scattered across 8+ files (hardcoded as "1.6.3" in `state.js`, `api.js`, `cloud.js`, `ui.js`, `sw.js`, `manifest.json`). Now defined once as `APP_VERSION = '1.6.4'` in `state.js` and referenced everywhere else. `CURRENT_VERSION` in `index.html` (stale at "1.6.0") removed.

### Internal

- **Version**: App bumped to 1.6.4. SW cache bumped to `robco-terminal-v1.6.4`.

---

## [v1.6.3] — The Faction Network Update

<!-- Date: Unknown | Tests: N/A | Cache: robco-terminal-v1.6.5 -->

### Added

- **Expanded Faction Standing** (ui.js): Panel now tracks 14 factions — 6 Major (NCR, Caesar's Legion, Mr. House, Brotherhood of Steel, Boomers, Great Khans) in a 3-column grid, and 8 Minor (Followers of the Apocalypse, Powder Gangers, The Kings, White Glove Society, Van Graffs, Crimson Caravan, Chairmen, Omertas) in a collapsible sub-section. Driven by a `FACTION_REGISTRY` constant — adding a future faction requires one line in one file.

### Changed

- **Faction data structure** (state.js, api.js): `state.factions` replaces the old flat `nf/ni/lf/li/sf/si` keypairs with a structured `{ fame: 0, infamy: 0 }` object per faction. Existing saves auto-migrate on first load. Old NCR keys → `ncr`, Legion → `legion`, Strip/sf-si → `house`. All 14 faction keys forward-filled for older saves.
- **AI faction awareness** (api.js): System directive and example schema now include the full `state.factions` structure. AI tracks and returns all 14 factions on every response. Legacy flat-key AI responses automatically remapped to correct faction. `[REP]` command now covers all 14 factions.
- **Save export envelope** (ui.js): Exported save files now use a versioned envelope format `{ version, state, chat, playstyle }` instead of bare state JSON. Preserves entire chat history (up to 200 messages) across device switches. Legacy bare-state imports still supported.
- **Cloud sync envelope** (cloud.js): PUSH CLOUD SAVE now includes chat history (~50–100KB) and playstyle alongside game state in the Firestore document (well within the 1MB doc limit). PULL CLOUD SAVE restores chat history, playstyle, and all game state — a true full-session restore from any device.
- **Tick system advisory** (api.js): AI directive now explicitly states ticks are advisory pacing and the Courier may perform any action at any time regardless of tick count. Prevents edge cases where the AI interpreted "Increment strictly" as a reason to refuse user actions.

### Internal

- **Version**: App bumped to 1.6.3. SW cache bumped to `robco-terminal-v1.6.5` (cache name was ahead of app version at this release).

---

## [v1.6.2] — The Character Sheet Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Skill Matrix panel** (ui.js, api.js): All 13 Fallout: New Vegas skills tracked — Barter, Energy Weapons, Explosives, Guns, Lockpick, Medicine, Melee Weapons, Repair, Science, Sneak, Speech, Survival, Unarmed. Skill values sync to the AI on every transmit and are returned in the state node. AI uses real skill values for Barter pricing, Speech/Lockpick/Science checks, crafting gates, and VATS accuracy calculations instead of guessing.
- **Crippled HEAD limb** (ui.js): Fifth limb (`state.hd`) added to BIO-SCAN. Crippling the head plays a distinct two-layer sound — a concussive triangle-wave thud (550Hz decaying to 40Hz) plus a 3.8kHz sine ring that lingers 0.5s, separate from arm and leg trauma sounds. HEAD button sits horizontally centered above ARMS and LEGS columns.
- **Head tinnitus logic** (ui.js): Tinnitus activates on EITHER rads ≥ 600 OR a crippled head — whichever occurs first. Both conditions must be cleared before tinnitus stops.
- **Status Effects panel** (ui.js): New collapsible panel renders `state.status` as a live buff/debuff list with color coding (green/BUFF, red/DEBUFF, amber/neutral) and remaining tick duration per effect. Previously invisible to the player.
- **Campaign Notes panel** (ui.js): New collapsible panel displays the AI's `campaign_notes` array as a bullet list. The AI was already writing tactical decisions to this field on every turn — now the player can read them.
- **Faction Standing panel** (ui.js): New panel shows NCR, Legion, and Strip standings from fame/infamy score pairs (`nf/ni`, `lf/li`, `sf/si`). Labels run from Idolized to Vilified with color-coded green/amber/red display.
- **Ticks → Game Time clock** (ui.js): Live human-readable game clock (Dx HH:MM format) next to TICKS input. 10 ticks = 1 hour, 240 ticks = 1 full day. Updates in real time as ticks change.
- **Ctrl+Enter to transmit** (ui.js): Desktop keyboard shortcut sends the current command without reaching for the mouse.
- **Undo last AI sync** (ui.js): "↩ UNDO LAST SYNC" button appears after every AI state update. One click restores the full pre-sync snapshot — all stats, skills, limbs, inventory, status effects, squad, and campaign notes — exactly as they were before the AI responded. Hides itself after use, reappears on the next sync.
- **Separate Limb/Wake mute toggles** (ui.js): "MUTE LIMB/WAKE SFX" split into two independent checkboxes. MUTE LIMB SFX controls cripple/restore sounds (`robco_ambient_muted`). MUTE WAKE SFX controls the tab-return ascending tone (`robco_wake_muted`). Each persists independently to localStorage.

### Fixed

- **`[FEATURES]` command** (api.js): Fixed the `[FEATURES]` screen which was displaying random or invented commands. AI now outputs the original Gem command registry verbatim — 30+ commands in 5 categories with original box-art formatting intact.
- **Standby dim** (ui.js): When switching back to the terminal tab, the dim standby overlay now holds for 650ms before the terminal wakes. Wake tone fires against the dark screen; "COURIER RETURNED" message appears after the terminal lights up, rather than everything being instant.

### Changed

- **Undo state machine** (ui.js): Before every `autoImportState()` call, the complete current state is snapshotted to `window._lastStateBeforeSync` including all skills, head limb, inventory, squad, and `campaign_notes`. Undo restores the full snapshot atomically.
- **Skill validation** (api.js): All AI-returned skill values clamped to 0–100 via `Math.min/max` in `autoImportState`. Skills mapped from `parsed.skills` (nested object) independently of the `flatten()` function to prevent key collision with other fields.

---

## [v1.6.1] — The Living Machine Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Geiger Counter audio** (ui.js): Procedural Poisson-distributed Geiger clicks synthesized entirely via Web Audio API. 200+ RADs: ~1 click/3s. 600+ RADs: 12 clicks/sec. 1000+ RADs: near-continuous static burst. No audio files required.
- **Tinnitus effect** (ui.js): At 600+ RADs, a barely-audible 5.2kHz sine oscillator activates and randomly swells every 12–30 seconds — the player physically experiences the Courier's radiation sickness through their own ears.
- **CRT hardware hum** (ui.js): Persistent 60Hz transformer hum (matching real CRT flyback coil frequency) runs throughout the session. LFO-modulated for subtle pitch drift. At 600+ RADs, shifts to 82Hz with increased gain. When a limb is crippled, the hum briefly drops out to simulate a hardware fault.
- **Stat delta ghost register** (ui.js): When AI updates game state, each changed stat (HP, XP, LVL, CAPS, RADS) shows its previous value rising and fading from the field — a targeted per-field old-value echo.
- **Carry weight interface deformation** (ui.js, terminal.css): At 75% carry capacity, the left stat panel begins a subtle sag animation. At 90%, the sag accelerates. At 100% overencumbered, the panel buckles with a violent jitter.
- **Narrative velocity** (ui.js): Typewriter output speed reacts to context. Combat keywords (dead, fatal, ambush, explosion) accelerate to 2ms/char. Rest keywords (rest, wait, camp, safe, sleep) slow to 40ms/char.
- **Tab standby mode** (ui.js): When the user switches browser tabs, the terminal dims to near-black displaying "> TERMINAL IDLE. AWAITING COURIER..." On return, an ascending square-wave tone plays and the system logs "COURIER RETURNED. SYNCHRONIZING TELEMETRY..."
- **Limb trauma audio** (ui.js): Toggling a limb to CRIPPLED plays a distinct procedural sound. Arms: sawtooth clang (380Hz decaying to 60Hz). Legs: sine thud (75Hz, heavy gain). Restoring a limb plays an ascending med-stim arpeggio (440→880→1760Hz over 0.4s). CRT hum briefly cuts out on cripple.
- **Session uptime clock** (ui.js): Live HH:MM:SS hardware runtime counter in the terminal header from session start. Every 15 minutes, the screen briefly flickers and logs "MEMORY CYCLE COMPLETE. 64K STABLE."
- **Thermal ambient shift** (ui.js, terminal.css): While the Gemini API is processing, the terminal background warms from dark teal to dark amber-brown as if the hardware is heating under load. On response, it cools back over 0.8s via CSS transition.
- **Changelog button** (ui.js): `> VIEW CHANGELOG` button added to the Configuration panel providing on-demand access to the full patch history without requiring an app update.

### Security

- **XSS mitigation** (ui.js): Rewrote the narrative rendering pipeline. All AI text is HTML-escaped before insertion (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`). Closes a theoretical XSS vector where a malformed AI response could execute injected JavaScript and access localStorage API keys.

### Fixed

- **Changelog display** (ui.js): Auto-changelog modal now extracts and displays only the most recent version block, using version-header pattern matching instead of the previous newline-split that could include multiple versions on Windows line endings.

### Changed

- **Typewriter rewrite** (ui.js): Eliminated O(n²) `innerHTML +=` loop (one full DOM serialize/parse per character). New implementation uses `textContent` during animation and swaps to formatted `innerHTML` exactly once at animation completion. Also fixes a bug where literal `<` characters in AI narrative were consumed by the old HTML-tag-skip logic.
- **Debounced state persistence** (ui.js): `saveState()` debounces localStorage write to at most once per 500ms, eliminating synchronous disk writes on every keystroke. A `beforeunload` handler flushes any pending write on tab close.
- **Audio settings cache** (ui.js): All six audio mute-check guards now read from an in-memory `AudioSettings` object initialized once at startup, instead of calling `localStorage.getItem()` on every audio tick. Eliminates up to 20+ synchronous disk reads per second during active gameplay.
- **Audio change guards** (ui.js): Audio system updates (Geiger rate, tinnitus, CRT hum) in `updateMath()` only fire when radiation level or limb status actually changes, not on every stat input event.
- **Render performance** (ui.js): `renderInventory()` and `renderSquad()` replaced `innerHTML +=` loops with a single `map().join('')` build and one `innerHTML` assignment. `renderInventory()` uses event delegation for delete buttons instead of one inline `onclick` handler per item. Item names and companion names are HTML-escaped before render.
- **Chat history cap** (ui.js): In-memory chat history capped at 200 messages. localStorage writes debounced to 200ms, eliminating synchronous multi-kilobyte serializations on every message that previously caused jitter during typewriter animation.

---

## [v1.6.0] — Any Weapon, Mobile PWA & Visual Overhaul

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Playstyle toggle** (ui.js, api.js): Native Playstyle module in the Configuration panel. Courier can seamlessly switch between "Any Weapon" and "Melee/Unarmed Only". Intelligently removes or applies hardcoded backend restrictions on the fly.
- **Playstyle restriction logic** (ui.js): Physical restriction barriers prevent downgrading to "Melee/Unarmed Only" if the Courier has acquired restricted perks (Educated, Dead Weight). Generates a browser alert citing the exact conflict.
- **PWA deep integration** (manifest.json, sw.js): Overhauled `manifest.json` and `sw.js` icon sizing and start URLs to pass the Chrome mobile installation checklist. Site is a true Progressive Web App installable to iOS/Android home screens.
- **Native installation prompt** (ui.js): Invisible `beforeinstallprompt` listener. When the browser confirms all installation criteria, a hidden `> INSTALL SYSTEM (APP)` button deploys to the configuration menu.
- **Expanded optics matrix** (ui.js, terminal.css): 3 new faction-themed optics presets — Legion Red, Ghoul Green, Neon Purple. All CSS variables, glows, scrollbars, and backgrounds update dynamically.
- **HP bar telemetry** (ui.js): Live HP bar below HP input fields in BIO-METRICS. Dynamically scales with HP values and transitions between green (>60%), amber (>25%), and danger red (<25%).
- **Radiation threat escalation** (ui.js, terminal.css): RADIATION input field reacts to live values. 200+ RADs shifts to amber. 400+ initiates a slow pulse. 600+ triggers rapid danger-red pulse.
- **Hardware boot sequence** (ui.js): 1.5-second cold-boot animation on every page load with mock RobCo memory check and hardware diagnostic before revealing the active client.
- **Phosphor persistence (ghosting)** (ui.js): Every AI state update causes all numerical fields and telemetry displays to emit a brief phosphor afterglow — a momentary spike in glow intensity simulating aging CRT phosphor persistence.
- **Radiation screen interference** (ui.js, terminal.css): 200+ RADs increases CRT flicker rate. 600+ adds lateral screen tearing (rad-shift). 1000+ triggers full hardware chaos — skewing, violent tearing, and erratic flicker.
- **Trauma system glitches** (terminal.css): Crippled limbs cause visual corruption on their UI button. Any limb marked CRIPPLED periodically blinks out, blurs, and jitters on an irregular cycle.
- **Monochrome delta animations** (terminal.css): Telemetry arrows (▲/▼) animate in from above or below and settle into position, rather than snapping onto the screen statically.
- **Interactive HP bar** (ui.js): HP bar is fully clickable and draggable. Click or scrub anywhere on the bar to set current HP without typing. Fully touch-compatible for mobile play.
- **Header pulse animation** (terminal.css): RobCo U.O.S. title features a slow breathing glow pulse driven by a CSS keyframe animation.

### Fixed

- **Cloud sync spam** (cloud.js): Removed the automatic `pushToCloud` call that fired on every stat change and spammed the "CLOUD SYNC COMPLETE" alert popup. Cloud sync now only triggers on manual button press.

### Changed

- **CRT phosphor adjustment** (terminal.css): Increased scanline gradient opacity for heavier, more authentic analog CRT appearance.
- **Button hover optics** (terminal.css): Replaced harsh white hover flash with smooth brightness boost staying within active terminal color palette.
- **Themed CRT refresh bar** (terminal.css): Replaced hardcoded color values in the phosphor sweep animation with `--robco-refresh` CSS custom property. Bar adopts active optics color on load and updates instantly on theme change.
- **Panel depth & typography** (terminal.css): Applied 1px letter-spacing to all panel headers for a tighter, more authentic military-stencil print aesthetic.
- **Themed scrollbar** (terminal.css): Replaced browser default scrollbar with slim styled scrollbar using active optics color. Updates automatically whenever the theme changes.

---

## [v1.5.9] — The Immersion & Tactics Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Dynamic optics configuration** (ui.js, terminal.css): Optics Configuration module in the Security panel. Instantly override terminal's CSS root variables. Supports classic RobCo Green, New Vegas Amber, and Vault-Tec Blue.
- **Audio mute toggle** (ui.js): Hardware toggle to mute procedural typing sound effects (`playClack`) for stealth operations.
- **Interactive GPS** (ui.js): Overhauled grid-map rendering algorithm. Any grid cell containing a Location or Point of Interest is fully interactive — clicking auto-executes a `> MOVE TO` command.
- **Dynamic location tracking** (ui.js): Location text box in BIO-METRICS uses an HTML5 `<datalist>` with auto-completing dropdown of all major Mojave Wasteland locations. Fully typeable for custom locations.
- **Campaign log download** (ui.js): `> DOWNLOAD CAMPAIGN LOG` button strips HTML and JSON from the active chat history and generates a clean, readable `.txt` file.

---

## [v1.5.8] — The PWA & Mobile UX Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Service Worker / PWA** (sw.js): True Service Worker integrated. Terminal caches all assets for faster loads and intercepts server updates, triggering a native "REBOOT TERMINAL" prompt when a new version goes live.
- **Collapsible panels** (index.html): Replaced massive static UI blocks with native collapsible `<details>` panels. Panels default to closed on mobile, automatically expand on desktop browsers.
- **Cloud push button** (ui.js): `> PUSH CLOUD SAVE` button in the configuration panel for manual, immediate synchronization to Firebase in addition to automated turn-saving.
- **Auto-changelog display** (ui.js): Version-tracking subsystem parses `CHANGELOG.md` and automatically renders the latest patch notes in a modal overlay immediately following a system update/reboot.

---

## [v1.5.7] — Mobile UX & Gamification Phase

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Tactical Dashboard / D-Pad** (ui.js, index.html): Touch-friendly macro interface with an 8-way D-Pad and physical action buttons (`[THREAT]`, `[VATS]`, `[TRADE]`, `[LOOT]`) to eliminate manual typing on mobile.
- **Rich data modals** (ui.js): JSON parser detects modal types natively. Renders interactive visual representations (CSS Grids for `[GPS]`, functional Buy/Sell buttons for `[TRADE]`) instead of plain text lists.
- **Squad UI integration** (ui.js, index.html): Dynamic Companion Tracker added to the Bio-Metrics panel. AI actively manages companion health, conditions, and ammo, visually displaying them in the HTML DOM.
- **Cloud synchronization architecture** (cloud.js): Structural framework for cross-device cloud saving — Courier can resume state across desktop and mobile browsers via a unified API.
- **VATS vision scan** (ui.js, terminal.css): Animated CSS laser scan overlay and mechanical audio loop during image upload processing.
- **CRT authentication polish** (terminal.css): Rebuilt `.crt-overlay` with authentic `repeating-linear-gradient` scanlines and a 0.15s opacity flicker animation.

---

## [v1.5.6] — Modular Architecture & System Hardening

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Web Audio API keyboard clicks** (ui.js): Procedural `playClack()` synthesizer provides full retro-terminal aesthetics without external audio files.
- **CRT overlay** (terminal.css): Heavy `.crt-overlay` with `repeating-linear-gradient` and a 0.15s opacity keyframe flicker animation.
- **Chrono-Tick clock integration** (state.js, api.js): `ticks` variable added to the HTML state UI and JSON payload. AI tracks passage of time (1 Prompt = 1 Tick, Combat = 2 Ticks, Wait/Sleep = 10 Ticks/Hr) ensuring active buffs and debuffs expire on schedule.

### Fixed

- **Inventory persistence** (api.js): Patched a severe amnesia bug where API token triage accidentally dropped the inventory payload during looting or crafting sequences. Critical directive now forces the engine to strictly preserve and return the entire backpack array when modifying gear.

### Changed

- **Modular architecture** (all files): Decentralized v1.5.5 monolith `index.html` into a scalable architecture: `index.html`, `state.js`, `ui.js`, `api.js`, `database.js`, and `css/terminal.css`. Insulates DOM manipulation logic from JSON API routing.
- **System directive centralization** (api.js): Eliminated conflicting prompt strings in HTML. All of `BRAIN.md`, the Developer Manual, and UI Templates unified into a single `ROBCO_SYSTEM_DIRECTIVE` within `api.js`.
- **Database token triage** (database.js): Separated static `databaseCSVs` into `database.js` and wrapped in a `getRelevantDbContext` keyword-filtering interceptor. Engine automatically strips the CSV payload during standard dialogue, saving ~1,500 tokens per turn and drastically speeding up AI response times.

---

## [v1.5.5] — The "Native Web App & Deep Brain" Evolution

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **HTML/CSS modal pop-ups** (index.html, ui.js): Native `.modal-overlay` pop-up window replaces the archaic requirement for the AI to draw massive ASCII boxes in the narrative chat log. API routes all list-based data (ROADMAP, STATS, CROSSROADS, FEATURES, etc.) into the popup window, saving token bloat and keeping the chat stream clean.
- **Campaign notes memory** (state.js, api.js): `campaign_notes` array added to core JavaScript state tracking. AI silently writes major tactical decisions into this node. Website saves and re-injects notes on every turn, giving the stateless API a permanent dynamic narrative memory.
- **Database slot integration** (database.js): `databaseCSVs` variable placeholder engineered to securely house data arrays (weapons, armor, bestiary, etc.), enabling the true standalone 1:1 port of the original Google workspace.

### Changed

- **Tri-Node JSON architecture** (api.js): API JSON payload expanded from Dual-Node to Tri-Node (`"narrative"`, `"state"`, `"modal"`). Parser targets the `"modal"` node to trigger the CRT overlay for database charts and list data, keeping the conversational chat stream clean.
- **Total Gem persona injection** (api.js): Complete legacy v1.4.6 Gem Instructions and entire `robco_dev_manual.txt` rulebook permanently embedded into the `systemDirective` JavaScript payload. Temperature hardcoded to `0.2` to prevent hallucinations and force strict mathematical reasoning.

---

## [v1.5.4] — The "Soul" Injection, Indestructible UI & Stability Patch

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- **JSON crash prevention** (api.js): Overhauled API output architecture to use an array of strings for the `"narrative"` node, physically preventing unescaped carriage return (`\n`) `SyntaxError` crashes. Rewritten JSON parser aggressively hunts for the narrative array and natively joins it even if the AI hallucinates a new key name, completely eliminating "Missing narrative node" errors.
- **Legacy command restoration** (api.js): Stripped confusing prefix titles from UI templates to prevent JSON key hallucination. Hardcoded complete multi-line array blueprints for all custom legacy modules (`[ROADMAP]`, `[INV]`, `[STATS]`, `[GPS]`, `[FEATURES]`) directly into the `systemDirective` payload. Restores the AI's ability to natively draw any requested ASCII sheet with full visual parity to the pre-website v1.4.6 menus.
- **CSS terminal overflow** (index.html): Patched a critical flexbox scaling bug. Applied `min-height: 0` and `overflow-y: auto` to `.main-grid` and `#chatDisplay` containers. Terminal no longer stretches the page infinitely downward, ensuring a locked-frame, internally scrollable chat history.

### Changed

- **Pre-website instruction merge ("The Soul")** (api.js): Total surgical graft of the legacy v1.4.6 Gem Instructions onto the post-website JSON architecture. System payload now contains the complete strategic authority, timeline logic, and persona constraints of the original Google Gem, bypassing the amnesia of a blank API key.
- **Dynamic roadmap state integration** (state.js, api.js): `campaign_notes` array added to core JavaScript state tracking. AI instructed to silently write major tactical decisions (Roadmap phases, Crossroads lockouts) into this node, preserving them across turns.
- **Temperature optimization** (api.js): `temperature: 0.2` hardcoded directly into the `generationConfig` API request payload to prevent stat hallucination and force strict mathematical adherence to CSV rules.

---

## [v1.5.3] — Stability & Customization Patch

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- **JSON newline crash** (BRAIN.md): Overhauled Dual-Node API output architecture. `"narrative"` node now mandated to output as an array of strings rather than a single continuous block. Physically prevents the AI from throwing unescaped carriage returns (`\n`) when generating complex ASCII tables, completely immunizing the frontend parser from `SyntaxError` crashes.
- **Array join rendering** (index.html): Updated chat logic to properly detect and join the newly mandated JSON string arrays (`Array.isArray(parsedNode.narrative) ? parsedNode.narrative.join('\n') : ...`), ensuring flawless rendering of all backend tabular data into the chat UI.

### Added

- **UI template customization block** (robco_ui_templates.txt): Dedicated permanent injection zone for the Courier's personalized commands under the `> [FEATURES]` template. Prevents master framework updates from overwriting locally developed shorthand macros.

---

## [v1.5.2] — Website Architectural Overhaul

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- **"Memento" amnesia bug** (index.html): Rewrote payload construction algorithm to map and inject the user's `chatHistory` array into the API `contents` request. AI now retains full narrative continuity and conversational memory across turns instead of operating on a blank slate.
- **Async overwrite lockout** (index.html): Implemented CSS opacity dimming (`pointer-events: none`) on the left-hand UI panel while `transmitBtn` is pending a response. Eliminates the asynchronous state-overwrite race condition where altering local state while the AI is calculating caused data corruption.
- **Commands persona break** (BRAIN.md, robco_ui_templates.txt): Hardcoded explicit instruction forcing the engine to intercept generic terms like "help", "menu", or "commands" and route them directly to the `> [FEATURES]` template, restoring the RobCo aesthetic.

### Added

- **Token-burn triage engine** (index.html): Keyword parsing string automatically strips the `inventory` array from the AI payload during standard dialogue or combat prompts, drastically reducing API token burn and optimizing AI processing speeds without breaking game logic.

### Changed

- **Dual-Node JSON architecture** (index.html): Configured `fetch` API call using `responseMimeType: "application/json"`. AI engine physically locked into outputting a strict 2-part JSON payload (`{"narrative": "...", "state": {...}}`), completely immunizing the web UI against formatting crashes.

---

## [v1.5.1] — The Engine, Optics & Stability Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Automated engine fetcher & selection UI** (index.html): Replaced hardcoded model aliases with an authorized engine scanner and a dynamic dropdown menu. Client pings Google's master server on startup to retrieve authorized models, allowing toggling between available Gemini engines (Flash/Pro). Default routing set to `gemini-1.5-flash`.
- **API key sanitization protocol** (index.html): Automated stripping sub-routine removes all whitespace, hidden carriage returns, and invisible characters from API keys before encoding them for transmission. Permanently resolves 404/400 connection failures caused by invisible characters.
- **Diagnostic error interceptor** (index.html): Overhauled network fetcher to capture and print detailed backend error messages (Auth/Rate-Limit/Regional rejections) directly to the Comm-Link display for instant identification.
- **Base64 image integration** (index.html): Users can attach local screenshots (inventory menus, VATS targets) to text prompts. JavaScript engine encodes the image as raw Base64 data and pushes it through the API pipeline, allowing the AI to execute Categorical Purges and OCR math natively.

### Fixed

- **Total persistence auto-save** (index.html): Rewrote the master save-cycle with true `oninput` silent saving. Guarantees an immediate physical write to localStorage on every calculation (`updateMath`), locking S.P.E.C.I.A.L. matrices, bio-metrics, location inputs, and inventory data the exact millisecond a keystroke occurs.
- **Comm-Link failsafe & syntax fix** (index.html): Corrected a split-line regex syntax error causing button failures across the app. Wrapped the Comm-Link chat history loader in a `try/catch` block so corrupted local transcripts gracefully reset the buffer instead of halting the entire script.
- **Import sequencing patch** (index.html): Resolved a severe race-condition bug where uploading a hard backup `.json` file instantly overwrote imported data with default HTML values. The JavaScript gatekeeper now pushes imported arrays to the visual DOM before executing background saves.

### Changed

- **API JSON handshake & UI delegation** (index.html): Deprecated text-based ASCII footers (`[INV]`, `[STATS]`, `[GPS]`) in favor of a strict invisible JSON payload exchange. AI reads the web UI's state as the absolute Source of Truth and outputs dynamic JSON to drive native HTML/CSS elements, saving immense token bloat.
- **Inventory regex failsafe** (index.html): Mandatory inclusion rule for the `"inventory"` key in all AI JSON outputs to satisfy `autoImportState` parsing logic, preventing API crashes during partial state updates.
- **Mathematical offloading** (index.html): Transferred static formula processing (Max Carry Weight, Max Action Points) entirely to the JavaScript frontend. AI now strictly reserved for dynamic narrative logic, database cross-referencing, and Time-To-Kill physics.

---

## [v1.5.0] — The Comm-Link API Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Native API integration** (index.html): Upgraded RobCo web client to interface directly with Google AI Studio via a secure API pipeline. Client silently staples background state arrays to Courier prompts and intercepts returning data, creating an automated two-way synchronization loop. Completely eliminated manual JSON copy-pasting.
- **Local security configuration** (index.html): Encrypted configuration panel to secure the Gemini API key. Keys held strictly in device localStorage — zero exposure on public repositories (GitHub/Netlify).
- **Progressive Web App lockdown** (manifest.json, sw.js): `manifest.json`, `sw.js`, and `icon.png` integration finalized. Terminal can be installed to mobile and desktop home screens as a standalone offline-capable application featuring authentic native iconography.
- **Widescreen flexbox rendering** (index.html): Responsive desktop layouts using viewport height (vh) constraints. Terminal dynamically expands on ultra-wide monitors with a permanent, non-overlapping dual-column display.
- **Persistent chat memory** (index.html): localStorage hooks automatically back up the Comm-Link narrative transcript. Chat history survives tab closures, browser refreshes, and device reboots. Manual `[PURGE LOGS]` clearance function included.
- **Input clamping & validation** (index.html): Strict mathematical boundaries hardcoded into UI. S.P.E.C.I.A.L. values physically clamped between 1 and 10 to prevent user error or accidental negative integer inputs from corrupting background math algorithms.

### Changed

- **Master directive overhaul** (BRAIN.md): Extracted all UI rendering burdens from the AI's core logic loop. Engine explicitly instructed to treat the web client's JSON payload as the absolute source of mathematical truth, permanently halting unprompted ASCII table generation to maximize token efficiency for combat math and narrative processing.

---

## [v1.4.7] — Beta: Web Architecture Transition

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **HTML/JS state offloading** (index.html): Transitioned primary state-tracking from the active AI context window to a lightweight client-side web application. Courier's Inventory, S.P.E.C.I.A.L. attributes, Wealth, and Bio-Metrics are now mathematically processed in browser memory to eliminate AI token bloat and variable drift.
- **Fuzzy Logic Parser** (index.html): Aggressive JSON interception script automatically flattens, lowercases, and maps AI-hallucinated data structures, ensuring successful Pip-Boy overwrites even if the AI arbitrarily alters JSON keys or nests variables.
- **API Comm-Link integration** (index.html): Native Gemini API chat interface built directly into the RobCo terminal. Client silently staples the active JSON payload to Courier prompts and intercepts returning data arrays, fully automating the two-way sync loop without requiring manual copy-pasting.
- **Widescreen ASCII preservation** (index.html): Rewrote CSS rendering engine using Flexbox and viewport height (vh) constraints. Terminal dynamically expands to a widescreen dual-column layout on desktop. `pre-wrap` CSS protocol strictly preserves Unicode spaces, ensuring the AI's generated box-drawing tables render flawlessly.
- **PWA & localStorage lockdown** (manifest.json, sw.js): Converted client into a downloadable Progressive Web App. Engine saves state data on every individual keystroke (`oninput`) to localStorage, and supports exporting/importing hard `.json` save files for permanent physical backups.
- **Dedicated Chem & Trauma Matrix** (index.html): Native Bio-Scan interface with tracking for crippled limbs, radiation thresholds, and a dedicated array for logging active chem ticks and permanent addictions, ensuring the API sync loop maintains accurate physiological debuffs.

---

## [v1.4.6]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Changed

- **Pip-Boy Stasis Protocol** (BRAIN.md, Dev Manual §1.1): Decoupled administrative user prompts from the time-scale engine. Browsing inventory, managing gear, executing batch syncs, and consuming healing items now execute in instantaneous system stasis (0 ticks). The world clock strictly advances only during active combat rounds, physical travel, or explicit wait/sleep loops.
- **Apparel DT Degradation Constant** (BRAIN.md, Dev Manual §2.3): Eliminated linear scaling ambiguity. Implemented a concrete mathematical floor tracking `Min_CND_Threshold` from `armor.csv`. Condition levels below this gate scale armor defense via: `Active DT = Base DT * (Current CND / Min_CND_Threshold)`, rounded down to the nearest integer.
- **Companion Mid-Tick Ammunition Exhaustion** (BRAIN.md, Dev Manual §3.1): If a companion's custom magazine runs dry mid-turn, the engine mathematically bifurcates the Squad TTK sequence, resolving the custom ammunition damage yield first before seamlessly hot-swapping to their default infinite-ammo weapon profile to calculate remaining target HP.

---

## [v1.4.5]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Synchronization Bypass** (BRAIN.md, Dev Manual §2.7): Verification override hardcoded into the `> [SYNC]` protocol. Engine bypasses addiction cascade warnings and system alerts when batching data, assuming the player has already hardlocked their game state natively.
- **Kinetic Stamina Sustain (AP Regen)** (BRAIN.md, Dev Manual §1.6): Mid-Combat AP Regeneration logic added to the `> [VATS SIM]` engine. Melee/Unarmed frames now recover `15 + Agility` Action Points per combat round during multi-tick simulations.

### Fixed

- **Conservation of Mass (Crafting Delta)** (BRAIN.md, Dev Manual §2.5): Engine now explicitly calculates and adds the mass of newly yielded crafting items _after_ purging the consumed ingredients, closing an inventory mass leak.
- **Visual Supremacy Override (VVATS)** (BRAIN.md, Dev Manual §1.6): When executing `> [VVATS]`, the engine treats visual OCR percentages as absolute truth, suspending background anatomical penalties (crippled limb modifiers) to prevent double-taxing the Courier's accuracy.

---

## [v1.4.4]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Hotkey Binding command** (BRAIN.md, Dev Manual §1.7): `> [BIND: Item, DIR]` execution command implemented. Users can now explicitly assign consumables and gear to the 8-way vector array instead of relying on the AI to implicitly deduce hotkey mappings.
- **Level 50 hardcap safety** (BRAIN.md, Dev Manual §1.5): Level ceiling hardcoded. Upon reaching Level 50 (68,600 XP), all background experience harvesting algorithms permanently freeze.
- **Excess Menu Bloat Protection** (BRAIN.md): Condensation Rule extended to the `> [EXCESS]` interface. Engine aggregates duplicate junk items and limits suggestions to the Top 5 most valuable assets per repair/sell/drop category. Append `-FULL` to view the unabridged list.
- **Visual Parsing Sub-Routine (`> [VVATS]`)** (BRAIN.md, Dev Manual §1.6): Connected the orphaned Features menu command to backend logic. Engine extracts visual OCR hit percentages from uploaded screenshots and converts them into raw tactical AP/Damage math output.

---

## [v1.4.3]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- **Economy Stabilization (Vendor Liquidity)** (BRAIN.md, Dev Manual §2.8): `> [TRADE]` protocol patched to strictly enforce merchant `Base_Caps` liquidity limits from `vendors.csv`. Courier can no longer bankrupt vendors into negative integers — all excess value extracted must be matched via item bartering.
- **AP Calculation Native Math** (BRAIN.md, Dev Manual §1.5): Maximum Action Points now calculated via the hardcoded FNV formula (`Max AP = 65 + (Agility * 3)`) to prevent hallucination during level-ups and stat alterations.
- **Conservation of Mass (Stash Networking)** (BRAIN.md, Dev Manual §2.9): Hard lock placed on the `> [STASH]` sorting protocol to eliminate item cloning. Any item added to a Safehouse stash must be simultaneously and destructively purged from the active Backpack memory array.
- **Ammunition Exhaustion Protocol** (BRAIN.md, Dev Manual §3.1): Companion Matrix updated to account for mid-skirmish ammo depletion. If Squad TTK ammo-burn drains a companion's custom ammunition pool to zero, the system automatically re-equips their infinite-ammo base weapon and recalculates DPS for the remainder of the simulation turn.

---

## [v1.4.2]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- **Quadratic XP Anti-Hallucination** (BRAIN.md, Dev Manual §1.5): Replaced "query internal memory" rule with hardcoded FNV algebraic constant. Progression boundaries now calculated using: `Total XP Required = 25 * (Target_Level²) + 125 * (Target_Level) - 150`. Mathematically guarantees perfectly accurate level progression caps.
- **Viewport Amnesia (UI Ghosting)** (BRAIN.md): Active viewport token (`V:M` or `V:D`) added directly to the mandatory `[SYS_DATA]` footer. Forces the engine to retain UI width settings (56 or 80 characters) across extended conversational contexts, preventing sudden formatting collapses.

### Changed

- **Radiation Sickness Matrix** (BRAIN.md, Dev Manual §1.3): Lethal bio-metric threat tracking overhauled. Engine now recognizes FNV Radiation milestones (Minor: 200, Advanced: 400, Critical: 600, Deadly: 800, Fatal: 1000) and automatically applies S.P.E.C.I.A.L. debuffs. Native purge rules added for RadAway (−150 RADS) and Rad-X (+25 RR).
- **PC Optimization (Dual-Column Lists)** (robco_ui_templates.txt): When Desktop Mode (`V:D`) is active, heavy array templates (`> [INV]`, `> [STASH]`) automatically render backpack contents in a Dual-Column layout to eliminate empty space and fully utilize 80-character widescreen real estate.

---

## [v1.4.1]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Diagonal D-Pad expansion** (BRAIN.md): `> [PAD: DIRECTION]` sub-routine expanded to natively recognize combined diagonal vectors (e.g., `UP-LEFT`, `DOWN-RIGHT`), immediately doubling active hotkey capacities without adding visual bloat.

### Changed

- **Dynamic Dashboard Scaling** (BRAIN.md): `[SYS_DATA]` Telemetry Dashboard rules updated — horizontal box-drawing borders dynamically scale to match active viewport width (56 for MOBILE, 80 for DESKTOP) to prevent formatting dislocation.
- **Companion Post-Combat Auto-Heal** (BRAIN.md, Dev Manual §3.1): All active companions immediately restore to 100% HP and clear all crippled limbs upon successful combat resolution, mimicking native game mechanics and preventing math-loop death spirals.
- **Asymmetric Trade Margins** (BRAIN.md): `> [TRADE]` protocol patched to enforce a Buy/Sell margin spread. Courier's sell-price calculation must mathematically fall below the vendor's purchase-price, preventing infinite cap generation exploits.
- **Stash Condensation Protocol** (BRAIN.md): Token bloat failsafe for networked `> [STASH]`. Engine automatically groups duplicate items and truncates readout to the top 5 most valuable assets per category. Append `-FULL` to force an unabridged list.
- **Output Cascade Sequencing** (BRAIN.md): Logic flow structured for Command Chaining (`&&`). Engine required to render Monochrome Delta first, separate generated UI tables with single blank lines, and terminate strictly with the dashboard footer.

---

## [v1.4.0] — The Telemetry Dashboard Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Telemetry Dashboard** (BRAIN.md): Mandatory 1-line `[SYS_DATA]` footer completely overhauled into a dual-line Unicode boxed telemetry dashboard. Permanently solves vertical wrapping fragmentation on mobile screens while preserving critical game state tokens.
- **Viewport Scaling Protocol** (BRAIN.md, robco_ui_templates.txt): `> [VIEW: DESKTOP]` and `> [VIEW: MOBILE]` commands integrated. Engine natively locks UI rendering to 56 characters for smartphone usage, dynamically expands to 80-character widescreen CRT format on desktop mode trigger.
- **Consumable Anti-Ghosting Purge** (BRAIN.md, Dev Manual §1.1): Hardcoded inventory rule ensures that whenever a medical or chem item is processed via shorthand or D-Pad hotkey, the system enacts an immediate −1 quantity deletion of that specific item to prevent backpack bloat.
- **Ammo Reserve Monitoring** (BRAIN.md): `> [INV]` template updated to track real-time active weapon ammunition quantities with a dedicated 'AMMO' array strictly monitoring companion firing reserves derived from the TTK burn engine.

---

## [v1.3.9]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Quiet Mode (-Q)** (BRAIN.md): Inline modifier for combat operations (`> [THREAT: TARGET -Q]`). Engine suppresses all narrative prose and UI card generation, providing only the mathematical delta and footer for drastically faster multi-turn mobile combat.
- **Stealth Multiplier (-S)** (BRAIN.md): Sneak Attack Critical functionality. Appending `-S` to a combat prompt forces the system to pull the equipped weapon's `Crit_Multiplier` from `weapons.csv` and apply it as unmitigated damage to the opening strike.
- **Fast Travel Chronology** (BRAIN.md): `> [TRAVEL CLUSTER]` output tied to background system ticks. Hardcoded limit: 1 Map Sector Crossed = 1 System Tick, allowing time dilation to accurately burn buffs and restock vendors without manual user input.
- **Shorthand Alias Engine** (BRAIN.md, robco_ui_templates.txt): Suite of 2-letter command aliases (e.g., `[TC]` for Travel Cluster, `[VS]` for VATS Sim) mapping 1:1 to their full equivalents. `[FEATURES]` menu updated to display aliases natively for rapid mobile execution.
- **Command Chaining (&&)** (BRAIN.md): Dual-prompt processing logic using the `&&` delimiter. Courier can string multiple macros together (e.g., `> [SYNC: data] && [THREAT: target]`) and the engine will execute both sequentially in a single turn.
- **Logic Restoration** (BRAIN.md): Correctly restored the 'Pre-emptive Scanning' parameter to `BRAIN.md` section [C] to prevent user bottlenecking at Lockpick and Science gates.

### Changed

- **Mobile Geometry Overhaul** (BRAIN.md, robco*ui_templates.txt): Replaced all standard keyboard table frames (`-`, `=`, `*`) with seamless Unicode box-drawing characters (`┌ ┐ └ ┘ ├ ┤ ─ │ ┼`) to eliminate micro-gaps.
- **Strict Width Capping** (BRAIN.md, robco_ui_templates.txt): All generated UI templates hard-capped to exactly 56 characters. Prevents vertical text wrapping and shattered tables on narrow portrait-oriented smartphone screens.
- **Alternative Currency Footer** (BRAIN.md): `[N:X/L:X]` added to the `CAP` bracket inside `[SYS_DATA]` footer. NCR and Legion currency stores now visible continuously.

---

## [v1.3.8]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **VATS Anatomical Targeting** (BRAIN.md, robco_ui_templates.txt): `TARGETED LIMB` field added to the `[VATS SIM]` interface. Combat engine now prioritizes specific limb targeting (e.g., forcing movement taxes via leg strikes) based on target kinetics.
- **Automated Vendor Trading** (BRAIN.md, Dev Manual §2.8): `> [TRADE: Item, Qty]` protocol added. Engine applies dynamic Fame/Infamy and Barter math to strictly update Caps and Inventory without requiring manual calculation from the user.
- **Confirmed XP Harvesting** (BRAIN.md): Combat resolutions automatically calculate the XP yield from `bestiary.csv` and propose the total to the Courier for confirmation before adding it to the tracker.

### Fixed

- **Missing UI implementations** (robco_ui_templates.txt): `[STASH]` UI template added to prevent rendering hallucinations. Visual degradation bars `[██████░░]` implemented into the `[TIMER/CHEM]` UI.

### Changed

- **AP Regeneration & Medical Logic** (BRAIN.md): Action Point regeneration defined to fully restore upon successful combat resolutions. Medical healing (Stimpaks update HP instantly) formally separated from narcotic timers (Psycho decrements via prompt ticks).
- **Zero Condition Item Breakage** (BRAIN.md): Logic hardcoded for item shattering at 0/100 CND. Items automatically unequip, drop their base stats to 0, and trigger a `[UTILITY QUARANTINE]` alert.

---

## [v1.3.7]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Batch Synchronization Protocol** (BRAIN.md): `> [SYNC: data]` feature allows high-speed batch state updates, bypassing narrative text generation. Engine confirms updates only via delta telemetry.
- **Anti-Hallucination Telemetry Lock** (BRAIN.md): Hard system guardrail forces the engine to halt processing and trigger `[SYS-ALERT: INSUFFICIENT TELEMETRY]` if manual user data is ambiguous, preventing the system from guessing narrative events.
- **UI Synchronization** (robco_ui_templates.txt): `> [FEATURES]` command menu updated to include Batch Sync (`> [SYNC]`) and D-Pad Hotkey (`> [PAD: DIR]`) protocols.

---

## [v1.3.6]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Mobile Hotkey Shortcut System** (BRAIN.md, robco_ui_templates.txt): Shorthand D-Pad hotkey routing (`> [PAD: UP/DOWN/LEFT/RIGHT]`) to instantly auto-execute use/equipment functions of bound inventory log slots on mobile layouts.
- **Hybrid Karma Translation System** (BRAIN.md): KRM integers tied directly to Pip-Boy descriptive text boundaries, allowing textual alignment initialization while preserving exact background mathematical scaling.
- **Destructive Crafting Purges** (BRAIN.md): Forced immediate deletion routines for consumed ingredients from backpack memory pools upon successful campfire/workbench outputs.
- **Pack-Mule Mass Restrictions** (BRAIN.md): Humanoid companion carrying thresholds hardlocked to 150 lbs max to eliminate unlimited siphoning exploits.
- **Chem Refresh Patch** (BRAIN.md): Family refresh clocks implemented to reset chem buff timers when identical families are redosed, eliminating ghost withdrawal traps.

### Changed

- **Monochrome Telemetry Updates** (BRAIN.md): Delta processor upgraded to use solid block arrows (▲/▼) and uppercase variable names for authentic green-screen CRT terminal emulation.
- **S.P.E.C.I.A.L. Overflow Protection** (BRAIN.md): Final output registers for attributes hardlocked strictly between 1 and 10 to simulate structural engine limitations.

---

## [v1.3.5]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Dedicated Misc Database** (`misc.csv`): Introduced `misc.csv` to formally track weight and value for junk, crafting components, and currencies. Dynamic Mass Engine now actively references this database to completely eliminate fallback guesses and placeholder variables.

### Fixed

- **Categorical OCR Purge Protocol** (BRAIN.md): Visual upload syntax now requires a target category (e.g., `> [VISUAL UPLOAD: WEAPONS]`). Strictly isolates the destructive overwrite command to that specific backpack array, completely eliminating the "Pip-Boy Scroll" deletion bug where off-screen items were dropped from memory.
- **Non-Hardcore Mass Engine** (BRAIN.md): Logic constraints established to bypass missing weight tables in non-junk databases. Engine now universally recognizes ammo and chems as 0 lbs, preventing system failure during standard scavenging runs.
- **CND Preservation Protocol** (BRAIN.md): Stripped the OCR engine's ability to arbitrarily overwrite exact mathematical Condition percentages managed by the combat tracking arrays. Visual approximations restricted strictly to newly acquired gear.

---

## [v1.3.4]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Dynamic Mass Engine** (BRAIN.md, Dev Manual §2.6): Fixed the "lazy math" bug by forcing carry capacity metrics (`W:X/X`) to automatically evaluate and update against item CSV masses upon any inventory transaction, preventing static variable drift.

### Fixed

- **Visual Upload OCR Purge** (BRAIN.md): Implemented a destructive overwrite protocol for `> [VISUAL UPLOAD]` when parsing inventory screens. Internal item array fully wiped and rebuilt 1:1 from image text data to prevent ghost duplicates of items dropped in-game.

### Changed

- **Developer Manual Synchronization** (robco_dev_manual.txt): Section 2.6 (Dynamic Mass Engine & OCR Purge Protocol) added to formalize memory registers and background mass engines. All system files synchronized to version 1.3.4.

---

## [v1.3.3]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Combat Sequencing Logic** (BRAIN.md, Dev Manual §1.6): Section 1.6 (The Kinetic Sequencing Algorithm) slotted directly into the developer manual to optimize Action Point allocation for Unarmed/Melee frames.
- **VATS SIM interface card** (robco_ui_templates.txt): Visual `> [VATS SIM]` interface card template deployed after the Geographic Matrix block for explicit tactical damage forecasting.

---

## [v1.3.2]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Changed

- **Database Alignment** (bestiary.csv, chems.csv, weapons.csv): Added mathematical columns to prevent AI hallucination: `XP_Yield` added to `bestiary.csv`, `Value` added to `chems.csv`, `Ammo_Type` added to `weapons.csv`.
- **State Tracking Expansion** (BRAIN.md): Mandatory `[SYS_DATA]` tracker expanded to include TCK (Ticks), FAME, INF (Infamy), and KRM (Karma) to prevent variable drift over long sessions.
- **Math Hardcoding** (BRAIN.md): Jury Rigging repair formula hardcoded as `15% + (Repair Skill / 2)%` to strictly govern condition regeneration.
- **Sleep/Wait Isolation** (BRAIN.md): `> [WAIT: X Hrs]` and `> [SLEEP]` commands explicitly separated. Waiting advances time without healing, while sleeping fully heals HP, RADS, and limbs.

---

## [v1.3.1]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- **UI Features Menu Correction** (robco_ui_templates.txt): Updated the UI Templates list to properly reflect active system operations. Replaced the auto-triggered `[SYS_LEVEL]` protocol with the manual `> [WAIT: X Hrs]` action to prevent user input confusion and ensure accurate feature mapping.

### Changed

- **System Debloat Protocol** (BRAIN.md): Completely decoupled the changelog history from active prompt memory and removed the `> [CHANGELOG]` command from the UI Features menu. Drastically reduces token consumption per prompt.
- **State Tracking Expansion** (BRAIN.md): Mandatory `[SYS_DATA]` tracker expanded to include TCK, FAME, INF, and KRM to prevent variable drift over long sessions.
- **Math Hardcoding** (BRAIN.md): Jury Rigging repair formula hardcoded as `15% + (Repair Skill / 2)%` to strictly govern condition regeneration.
- **Sleep/Wait Isolation** (BRAIN.md): `> [WAIT: X Hrs]` and `> [SLEEP]` commands explicitly separated.
- **Menu Streamlining** (robco_ui_templates.txt): Consolidated `[PAGE TWO]` and `[PAGE THREE]` commands into a unified `> [PAGE 2/3]` display syntax within the Features menu. Expanded triggers to accept both numerical and text-based inputs.

---

## [v1.3.0] — The Systems Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Progression Integration** (BRAIN.md): `> [SYS_LEVEL]` protocol hardcoded. Engine now recognizes EXP thresholds, strictly allocates skill points based on the `10 + (INT / 2)` formula, and locks Perk acquisition to even-numbered levels. Level-Up interface added to UI Templates.
- **Companion Logistics Framework** (BRAIN.md): Updated Squad logic to formalize infinite ammo for default weaponry and mandatory ammo consumption for non-default armaments. "Unconscious" mechanics integrated for zero-HP resolutions on Normal difficulty to prevent rogue companion permadeath.
- **Time-Pass Controls** (BRAIN.md): `> [WAIT: X Hrs]` system action added to allow fast-forwarding merchant cycles without utilizing beds. Added 1-Tick Magazine logic to override hard mechanical bottlenecks.

### Changed

- **Physics & Maintenance Constants** (BRAIN.md): Absolute Carry Weight boundary hardcoded (`150 + [STR * 10]`) and condition restoration algorithms defined, tied proportionally to the Repair skill when utilizing the Jury Rigging menu.

---

## [v1.2.5]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- **Fictional Context Wrapper** (BRAIN.md): Explicit `FICTIONAL CONTEXT OVERRIDE` block added to the top of the Master Brain. Persistent instruction clarifying that all language is strictly related to Fallout: New Vegas, preventing false-positive safety flags on words like "Chems," "Crippled," and "Fatal."

### Fixed

- **Terminology Restoration** (BRAIN.md): Reverted all clinical/sterilized terminology from v1.2.4 (Dependencies, Stims, Impaired, Critical) back to authentic in-game mechanics (Addictions, Chems, Crippled, Fatal Threats) to preserve full narrative immersion and accuracy.

### Changed

- **Structural Persistence** (BRAIN.md): Maintained all backend formatting fixes from v1.2.4, ensuring the `[SYS_DATA]` footer continues to use straight brackets (`[ ]`) instead of curly braces to prevent JSON parsing errors upon saving.

---

## [v1.2.4]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- **JSON Bracket Optimization** (BRAIN.md): Replaced curly braces `{ }` in the mandatory `[SYS_DATA]` tracker with standard brackets `[ ]` to prevent conflicts with Google's developer backend string parsers. Changed ping alert to `[DELTA]`.

---

## [v1.2.3]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- **UI Template Hardcoding** (robco_ui_templates.txt): 7 core internal system alerts hardcoded directly into the Warning Render Protocol block. Maps the exact emojis (🛑, ☣️, ⚠️, ⚙️) to their respective alerts explicitly, eliminating AI guesswork when rendering warnings.
- **Markdown Formatting Preservation** (robco_ui_templates.txt): Restored the literal markdown backtick syntax (`` ` ``) into the formatting guide to ensure parsers display the visual output exactly as intended.

---

## [v1.2.2]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- **COMM LINK NPC command** (BRAIN.md): `> [COMM LINK: NPC Name]` command added to the Master Brain. Allows the user to temporarily suspend the rigid RobCo persona to engage in native, lore-accurate roleplay with established game characters.
- **COMM LINK UI templates** (robco_ui_templates.txt): `[COMM LINK ESTABLISHED]` and `[COMM LINK TERMINATED]` visual card templates built into the UI directory as systemic signposts with embedded instructions for use and sever of the override link.

---

## [v1.2.1]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- **Crafting Engine** (BRAIN.md, Dev Manual §2.5): Section 2.5 (Campfire & Workbench Logic) integrated into the Developer Manual. Engine scans backpack contents against `recipes.csv` and enforces rigid `Skill_Req` gates (Science/Survival) before allowing item combination.
- **Crafting UI template** (robco_ui_templates.txt): `> [CRAFT]` survival matrix template added to structure the display of available recipes and missing components.

---

## [v1.2.0]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- **Delta Reporting** (BRAIN.md): "Ping" protocol integrated. System now outputs a single-line mathematical delta (Δ) highlighting exact changes to health, stats, or resources before generating the main text response.
- **Dual-Axis Reputation Engine** (BRAIN.md, Dev Manual §2.2): Decoupled the singular "Karma/Reputation" metric into authentic Fallout: New Vegas dual-axis tracking (Fame vs. Infamy). Economy math updated to account for mixed states (e.g., Wild Child).
- **Geographic Matrix** (robco_ui_templates.txt): `> [GPS]` / `> [MAP]` command deployed — engine can generate an ASCII compass array indicating local threats and the nearest safehouse.

### Changed

- **Token Compression Protocol** (BRAIN.md): Replaced the sprawling text-based `[SYS_MEM]` footer with a strictly minified JSON data block. Dramatically reduces memory overhead per turn and practically eliminates variable drift during extended AI context windows.
- **UI Upgrades** (robco_ui_templates.txt): Replaced primitive `[||||]` condition tracking bars in the `[INV]` UI with solid block unicode characters (`[██████░░]`) for superior visual contrast.

---

## [v1.1.9]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- **Complete UI Emancipation** (BRAIN.md, robco_ui_templates.txt): Fully migrated the System Features & Commands ASCII table and the Mobile-Optimized Warning Render Protocol (including all native system alert emojis: 🛑, ☣️, ⚠️, ⚙️) out of `BRAIN.md` and into `robco_ui_templates.txt`.
- **Visual Fidelity Restoration** (robco_ui_templates.txt): Ensured 1:1 visual continuity of all card suits (♠, ♦, ♣, ♥), radioactive markers (☢), and star alignments (★) within the directive interfaces to preserve the exact aesthetic of prior operating systems.
- **Brain De-cluttering** (BRAIN.md): Core system prompt is now 100% devoid of large structural text blocks and graphical mapping instructions, guaranteeing maximum logic retention.

---

## [v1.1.8]

<!-- Date: ~2026-05-19 (est.) | Tests: N/A | Cache: N/A -->

### Changed

- **UI Architecture Offloading** (BRAIN.md, robco_ui_templates.txt): Extracted the entire "Master Interfaces (ASCII)" array from the core system prompt (`BRAIN.md`) into a standalone `robco_ui_templates.txt` file.
- **Token Efficiency** (BRAIN.md): Severely reduces baseline token bloat by preventing the engine from processing heavy ASCII structural characters during standard conversational turns, improving adherence to core combat and narrative constraints.
- **Render Protocol Update** (BRAIN.md): Interface Render Protocol modified to require a hard query to the new UI text file before rendering screens like `[INV]` or `[SQUAD]`.

---

## [v1.1.7]

<!-- Date: ~2026-05-19 (est.) | Tests: N/A | Cache: N/A -->

### Fixed

- **Addiction Verification Loop** (BRAIN.md): Hardcoded the Addiction Verification Loop to prevent the engine from applying stat drops automatically without explicit player confirmation.

### Changed

- **Architecture Optimization** (robco_dev_manual.txt): Offloaded structural developer documentation and the complete changelog ledger to the external knowledge directory (`robco_dev_manual.md`).
- **Prompt Optimization** (BRAIN.md): Compressed base execution instructions by 42% to eliminate token drag, reduce response latency, and protect context window boundaries during extended gameplay sessions.

---

> All game data sourced from [fallout.wiki](https://fallout.wiki) (CC-BY-SA 4.0).
