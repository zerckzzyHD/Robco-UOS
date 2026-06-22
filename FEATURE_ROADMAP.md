# RobCo U.O.S. — Master Strategic Analysis & Feature Roadmap

> **Compiled from:** Architectural Review, Gap Analysis, 2-Year Strategic Roadmap, and 5-Phase Feature Audit.
> **Codebase version:** 1.6.4
> **Files reviewed:** All (`index.html`, `js/state.js`, `js/api.js`, `js/ui.js`, `js/cloud.js`, `js/database.js`, `css/terminal.css`, `sw.js`, `manifest.json`, `changelog.txt`, `tests/`)

---

# PHASE 1 — PROJECT UNDERSTANDING

## Core Project Identity

RobCo U.O.S. is not a game. It is a **simulation control layer** — a fully functional Pip-Boy terminal that acts as the bidirectional interface between a human player ("the Courier") and a Gemini LLM ("Gem") running a persistent Fallout: New Vegas tabletop campaign.

The project's genius lies in a single architectural insight: the LLM is the game engine, but it cannot be trusted with state. The web client therefore **owns all truth** — S.P.E.C.I.A.L., HP, inventory, skills, factions, ticks, limbs, perks, squad — and the LLM is reduced to a narrative processor that reads state, computes outcomes, and returns a delta. The client then audits, validates, and applies that delta. The LLM never touches the DOM directly.

This is not a chatbot wrapper. This is a **stateful game engine with an LLM narrative coprocessor**.

## Development History (Reconstructed from Changelog)

| Era                     | Versions      | Focus                                                                                       | Key Insight                                |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Genesis**             | v1.0–v1.3     | Pure LLM prompt, ASCII output, all state in context window                                  | "The AI can be a game master"              |
| **Web Transition**      | v1.4.x        | HTML state tracking, game math formulas, database CSVs                                      | "The client should own state, not the AI"  |
| **API Integration**     | v1.5.0–v1.5.6 | Gemini API, modular JS split, Tri-Node JSON schema                                          | "Structured JSON contracts beat free-text" |
| **Mobile & UX**         | v1.5.7–v1.5.9 | D-Pad, modals, squad tracker, cloud sync, themes                                            | "This needs to work on a phone"            |
| **Product Polish**      | v1.6.0        | PWA, HP bar, radiation VFX, boot sequence, playstyle                                        | "This should feel like a real product"     |
| **Hardware Simulation** | v1.6.1        | Geiger, tinnitus, CRT hum, trauma SFX, engineering hardening                                | "The terminal should feel alive"           |
| **Character Depth**     | v1.6.2        | Skills, head trauma, status effects, campaign notes, factions, undo                         | "Track everything the game tracks"         |
| **Faction Network**     | v1.6.3        | 14-faction registry, save envelope, cloud envelope, persistence tests                       | "Factions should be a first-class system"  |
| **Architecture**        | v1.6.4        | VERSION constant, flatten() removal, API key security, perk tracker, state diff, D/H/M time | "Harden the systems before adding more"    |

**Key pattern:** Nearly every major system was created to fix a specific failure mode. The faction registry fixed data loss from flat keys. The debounced save fixed sync jitter. The envelope format fixed chat history loss across devices. The undo system fixed destructive AI syncs. This is a project built by pain-driven iteration — every system carries scar tissue from the bug that spawned it.

## Current Strengths

1. **Total state sovereignty** — the client is the single source of truth for 28+ state fields.
2. **Bidirectional JSON contract** — the AI reads `[CURRENT STATE]` and returns a strict tri-node `{narrative, state, modal}` payload.
3. **Immersive hardware simulation** — CRT hum, Geiger clicks, tinnitus, phosphor ghosts, weight deformation, radiation interference, and standby mode create a machine that _feels alive_.
4. **Aggressive token management** — `getRelevantDbContext()` strips the CSV payload on narrative turns; inventory is omitted unless combat/trade keywords are present.
5. **Zero external dependencies for UI** — vanilla HTML/CSS/JS, no frameworks, no build step.
6. **Full persistence stack** — localStorage, file export/import (envelope format), Firestore cloud sync.
7. **CRT aesthetic is systemically coherent** — radiation affects flicker, weight deforms panels, limbs glitch buttons, standby dims the screen. The interface _communicates_ game state.
8. **Procedural audio is fully synthesized** — zero audio files, zero CDN dependency, zero CORS issues. Audio reacts to state in real time.
9. **Service worker is correctly scoped** — skips cross-origin requests, avoids infinite reload loops.
10. **Persistence test suite** — `check-persistence.ps1` auto-discovers state keys from source code.

## Long-term Direction

```
v1.4.x → Game math engine (formulas, databases, combat sim)
v1.5.x → Web architecture (API integration, modular split, PWA)
v1.6.x → Immersive hardware (audio, visual effects, faction tracking, skills)
v1.7.x → ??? (logically: campaign intelligence, AI reliability, multi-session depth)
```

The project has matured from "can the AI maintain state?" to "can the AI run a 100-hour campaign without silent corruption?" The next frontier is **campaign continuity, AI behavioral reliability, and systems that compound over long play**.

---

# PHASE 2 — SYSTEM-BY-SYSTEM ANALYSIS

## 1. Character System

| Aspect         | Status      | Notes                                                                                                                            |
| -------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| S.P.E.C.I.A.L. | ✅ Complete | 7 stats, clamped 1–10, DOM-synced, AI-synced. Radiation debuff display.                                                          |
| Skills         | ✅ Complete | 13 skills via `SKILL_KEYS`, 0–100 clamped, AI-synced.                                                                            |
| Perks          | ✅ Scaffold | `state.perks`, `renderPerks()`, AI directive for [LEVEL UP].                                                                     |
| Level/XP       | ✅ Complete | Quadratic formula, XP bar, level-50 cap.                                                                                         |
| HP/Limbs       | ✅ Complete | Interactive HP bar, 5 limbs (incl. head), trauma audio, glitch animation.                                                        |
| **Gaps**       | —           | No trait system, no SPECIAL point allocation on creation, no derived stats display (DT, DPS), no skill point budget enforcement. |

## 2. Inventory System

| Aspect       | Status           | Notes                                                                                                                                                    |
| ------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item storage | ✅ Complete      | `state.inventory[]` — name, qty, wgt, val.                                                                                                               |
| Add/delete   | ✅ Complete      | Manual add, event-delegated delete.                                                                                                                      |
| Weight calc  | ✅ Complete      | Carry weight = 150 + STR×10, deformation animation.                                                                                                      |
| AI sync      | ✅ Token-triaged | Omitted unless combat/trade keywords detected.                                                                                                           |
| **Gaps**     | —                | No item categories (weapon/armor/aid/misc), no `equipped` tracking, no ammo tracking, no item condition, no stash network UI (exists in directive only). |

## 3. Time System

| Aspect   | Status      | Notes                                                                                                                 |
| -------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Internal | ✅ Complete | `state.ticks` (integer). 10 ticks/hr, 240 ticks/day.                                                                  |
| UI       | ✅ Complete | D/H/M inputs with bidirectional conversion.                                                                           |
| AI sync  | ✅ Complete | AI increments ticks. 1 prompt = 1 tick, combat = 2, wait = X×10.                                                      |
| Display  | ✅ Complete | `ticksToGameTime()`, `gameTimeToTicks()`.                                                                             |
| **Gaps** | —           | No day/night narrative hooks, no time-of-day gameplay effects, no scheduled event system, no status effect tick-down. |

## 4. Faction System

| Aspect       | Status      | Notes                                                                                                                                 |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Registry     | ✅ Complete | `FACTION_REGISTRY` — 14 factions, fame/infamy pairs.                                                                                  |
| UI           | ✅ Complete | 3-column major grid, collapsible minor grid.                                                                                          |
| AI sync      | ✅ Complete | Full `state.factions` object returned every turn.                                                                                     |
| Auto-logging | ✅ Complete | `autoImportState()` diffs faction changes → `campaign_notes`.                                                                         |
| **Gaps**     | —           | No faction consequence triggers, no faction-gated vendor access, no disguise tracking, no reputation-driven AI behavior (hit squads). |

## 5. Campaign System

| Aspect         | Status          | Notes                                                                                                                                   |
| -------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign notes | ✅ Complete     | AI writes notes → `state.campaign_notes[]`. Rendered as bullet list.                                                                    |
| Session resume | ✅ Complete     | Boot briefing from state.                                                                                                               |
| Undo           | ✅ Single-level | `_lastStateBeforeSync` snapshot.                                                                                                        |
| State diff     | ✅ Complete     | `[DELTA]` display after every AI sync.                                                                                                  |
| **Gaps**       | —               | No quest log (distinct from notes), no event sourcing, no story branch tracking, no session summary generation, no campaign statistics. |

## 6. AI System

| Aspect           | Status      | Notes                                                                                                                       |
| ---------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| Directive        | ✅ Complete | `getSystemDirective()` — ~4K chars of rules, math, schema.                                                                  |
| JSON contract    | ✅ Complete | Tri-node `{narrative, state, modal}` with `responseMimeType: "application/json"`.                                           |
| Model selection  | ✅ Complete | Dynamic dropdown, silent refresh on boot.                                                                                   |
| Token management | ✅ Complete | DB context stripped on narrative turns, inventory omitted when irrelevant.                                                  |
| Cancel/timeout   | ✅ Complete | `AbortController` with 45s timeout.                                                                                         |
| **Gaps**         | —           | No retry logic (500/503), no chat summarization (context overflow), no response schema validation, no directive versioning. |

## 7. Save System

| Aspect       | Status      | Notes                                                                                                                                        |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| localStorage | ✅ Complete | Debounced 500ms, `beforeunload` flush.                                                                                                       |
| File export  | ✅ Complete | Versioned envelope `{version, state, chat, playstyle}`. Legacy import supported.                                                             |
| **Gaps**     | —           | No multiple save slots, no versioned migration framework, no auto-backup rotation, no integrity validation, no localStorage quota detection. |

## 8. Cloud System

| Aspect   | Status      | Notes                                                                         |
| -------- | ----------- | ----------------------------------------------------------------------------- |
| Push     | ✅ Complete | Firestore with `savedAt` timestamp, full envelope.                            |
| Pull     | ✅ Complete | Envelope detection, chat restore, conflict warning.                           |
| **Gaps** | —           | No auto-sync, no offline queue, no multi-device merge, no encryption at rest. |

## 9. Audio System

| Aspect         | Status      | Notes                                                                                                      |
| -------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| Systems        | ✅ Complete | 8 audio systems (typing, Geiger, tinnitus, CRT hum, limb cripple/restore, head cripple, wake tone).        |
| Controls       | ✅ Complete | 6 individual mutes + master mute. In-memory `AudioSettings` cache.                                         |
| Context-driven | ✅ Complete | Geiger rate scales with rads. Tinnitus on rads≥600 OR head crippled.                                       |
| **Gaps**       | —           | No volume controls (binary mute only), no ambient music/radio, no combat alert tones, no level-up fanfare. |

## 10. UI System

| Aspect      | Status        | Notes                                                                                                                        |
| ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Layout      | ✅ Responsive | Single-column mobile, two-column desktop (380px + 1fr).                                                                      |
| Panels      | ✅ Complete   | 10+ collapsible `<details>` panels. Auto-expand on desktop.                                                                  |
| Modals      | ✅ 3 types    | GPS grid, TRADE window, TEXT modal.                                                                                          |
| Theming     | ✅ 6 presets  | CSS custom properties (Green, Amber, Blue, Legion, Ghoul, Neon).                                                             |
| CRT effects | ✅ Complete   | Scanlines, refresh bar, flicker, phosphor ghost, standby, thermal load.                                                      |
| **Gaps**    | —             | No panel memory (open/closed state resets on reload), no notification badges, no keyboard shortcuts panel, no accessibility. |

---

# PHASE 3 — ARCHITECTURAL DEBT

Issues identified by hostile review. Items marked ~~strikethrough~~ were **fixed in v1.6.4**.

| ID     | Issue                                                                            | Severity     | Status                                               |
| ------ | -------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------- |
| ~~B1~~ | ~~`flatten()` function = silent data corruptor~~                                 | ~~Critical~~ | **Fixed** — replaced with direct field mapping       |
| ~~B2~~ | ~~Version strings scattered across 8+ files~~                                    | ~~Medium~~   | **Fixed** — `APP_VERSION` constant                   |
| ~~B3~~ | ~~API key in URL query parameter~~                                               | ~~Medium~~   | **Fixed** — moved to `x-goog-api-key` header         |
| ~~B4~~ | ~~No cancel button / timeout on API calls~~                                      | ~~Medium~~   | **Fixed** — `AbortController` + 45s timeout          |
| B5     | `ui.js` is a 1,128-line god file                                                 | High         | **Open** — audio, boot, chat, rendering, all coupled |
| B6     | `state` is a mutable global reassigned via shallow spread                        | Low          | **Open** — mitigated by guards but fragile           |
| B7     | `loadUI()` called 5+ times per AI response                                       | Low-Med      | **Open** — no `requestAnimationFrame` debounce       |
| B8     | Firebase credentials in plaintext (no Firestore security rules visible)          | High\*       | \*High for public deploy, Low for personal use       |
| B9     | Inline styles dominate HTML (~100+ `style=` attributes)                          | Medium       | **Open**                                             |
| B10    | Optics color logic duplicated (inline `<script>` + `changeOpticsColor()`)        | Low          | **Open**                                             |
| B11    | No error boundary around partial `autoImportState()` — undo snapshot can be lost | Low          | **Open**                                             |

---

# PHASE 4 — FEATURE DISCOVERY

Features that emerge naturally from combining existing systems:

## From `state.inventory` + `database.js`

Items have `{name, qty, wgt, val}`. Database has weapon/armor/ammo CSVs. **Gap:** no `category` or `equipped` flag. Adding both unlocks equipped weapon display, active armor DT, ammo tracking — all referenced in the AI directive but invisible to the UI.

## From `FACTION_REGISTRY` + `campaign_notes`

The faction system tracks numbers but generates no consequences. `getFactionStanding()` computes labels. Adding threshold listeners in `autoImportState` after the faction diff = client-side alerts when the NCR marks you for death.

## From `chatHistory[]` + context limits

Chat is capped at 200 messages in memory, but ALL are sent to the API. Long campaigns hit context limits and the AI silently loses context. Summarization of older messages into a `[SESSION MEMORY]` block solves this.

## From `ticksToGameTime()` + `state.status[]`

Status effects have `ticks` duration but nothing decrements them. The infrastructure for expiring effects is 90% built. One `forEach` loop makes it live.

## From `state.perks[]` + `state.skills`

Perks exist structurally but have zero mechanical effect. Some FNV perks modify skills. The skill system is complete. The bridge is a natural connection.

## From `database.js` as a client-side database

The CSV data is loaded as a string constant. **Parse it once into lookup Maps** and the client gains: item detail hover, local DPS/DT calculation, trade price validation, crafting requirement display, and searchable item autocomplete in `addItem()`.

---

# PHASE 5 — TOP 50 FEATURE OPPORTUNITIES

## S-TIER — High value, low risk, builds directly on existing architecture

| #   | Feature                                                                                                         | Leverages                                                          | Effort | Risk |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------ | ---- |
| 1   | **Quest Log** — `state.quests[]` with name, status (active/complete/failed), objectives, faction ties           | `campaign_notes`, `autoImportState`, `renderCampaignNotes` pattern | Med    | Low  |
| 2   | **Equipped Item Tracking** — `state.equipped = {weapon, armor, headgear}` with DT/damage display                | `state.inventory`, `database.js`, `updateMath()`                   | Low    | Low  |
| 3   | **Chat Summarization** — Compress old messages into a `[SESSION MEMORY]` block to prevent context overflow      | `chatHistory[]`, `transmitMessage()`                               | Med    | Med  |
| 4   | **Faction Consequence Triggers** — Client alerts when standing crosses thresholds ("NCR hit squads dispatched") | `FACTION_REGISTRY`, `autoImportState` faction diff                 | Low    | Low  |
| 5   | **Location History** — `state.locationHistory[]` as timestamped `{loc, tick}` pairs                             | `state.loc`, `state.ticks`, `autoImportState`                      | Low    | Low  |
| 6   | **Multiple Save Slots** — 3–5 named slots in localStorage                                                       | `saveState()`, envelope format, `localStorage`                     | Low    | Low  |

---

## A-TIER — High value, moderate complexity

| #   | Feature                                                                              | Leverages                                        | Effort | Risk |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------ | ------ | ---- |
| 7   | **Status Effect Tick-Down** — Decrement `status[].ticks` each turn; auto-remove at 0 | `state.status`, `state.ticks`, `autoImportState` | Low    | Low  |
| 8   | **Session Statistics** — Kills, caps earned, damage dealt, distance, session time    | `[DELTA]` state diff, `autoImportState`          | Med    | Low  |
| 9   | **AI Response Validation** — Schema-validate AI JSON before applying to state        | `autoImportState`, `transmitMessage`             | Med    | Low  |
| 10  | **Ammo Tracking** — `state.ammo = {"5.56mm": {standard: 50, ap: 10}}`                | `database.js` [AMMO.CSV], `state.squad[].ammo`   | Med    | Med  |
| 11  | **Companion Affinity** — `state.squad[].affinity` (0–100)                            | `state.squad[]`, `renderSquad()`                 | Low    | Low  |
| 12  | **Day/Night Indicator** — CSS theme shift based on `ticks % 240`                     | `ticksToGameTime()`, `updateMath()`, CSS vars    | Low    | Low  |
| 13  | **Notification Badges** — Count indicators on closed panels                          | All render functions, `<details>` panels         | Low    | Low  |
| 14  | **Auto-Retry on API Failure** — Retry once on HTTP 500/503                           | `transmitMessage()`, `AbortController`           | Low    | Low  |
| 15  | **Keyboard Shortcuts** — Ctrl+1–5 for panel navigation                               | Existing `keydown` listener, `<details>` DOM     | Low    | Low  |
| 16  | **Save File Version Migration** — `migrateState(version, state)` chain               | `handleFileUpload()`, `version` field            | Med    | Low  |
| 17  | **Token Budget Display** — Show `~12,400 / 128,000` before sending                   | `transmitMessage()`, `appendToChat()`            | Med    | Low  |
| 18  | **localStorage Quota Detection** — Warn on `QuotaExceededError`                      | `saveState()`, `localStorage.setItem`            | Low    | Low  |

---

## B-TIER — Solid value, some complexity or niche utility

| #   | Feature                                                                              | Leverages                                           | Effort | Risk |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------- | ------ | ---- |
| 19  | **Stash Network UI** — Per-location item caches                                      | Command registry, `state.inventory` pattern         | Med    | Med  |
| 20  | **Derived Stats Display** — DT (equipped armor), DPS (equipped weapon)               | `database.js`, `updateMath()`, equipped tracking    | Med    | Low  |
| 21  | **Campaign Timeline** — Visual timeline from `campaign_notes` with `[T{ticks}]` tags | `campaign_notes`, `ticksToGameTime()`, CSS          | Med    | Low  |
| 22  | **Pip-Boy Map** — Static SVG of Mojave with `state.loc` marker                       | `state.loc`, coordinate map, theming                | Med    | Low  |
| 23  | **Consumable Quick-Use** — Click inventory item → `> USE [item]`                     | `renderInventory()`, `macroCommand()`               | Low    | Low  |
| 24  | **Combat Log** — Separate log filtering for combat keywords                          | `appendToChat()`, keyword detection                 | Low    | Low  |
| 25  | **Radiation Treatment Alerts** — Show RadAway doses needed                           | `updateMath()`, `state.rads`, `state.inventory`     | Low    | Low  |
| 26  | **Custom Command Macros** — User-defined text macros                                 | `macroCommand()`, `localStorage`, dashboard         | Med    | Low  |
| 27  | **Export as Markdown** — Formatted campaign export                                   | `exportCampaignLog()`, `chatHistory`                | Low    | Low  |
| 28  | **Companion Swap UI** — Dismiss/recruit from companion registry                      | `state.squad`, `FACTION_REGISTRY` pattern           | Med    | Low  |
| 29  | **Skill Check Indicators** — Highlight skill on AI mention of `[Speech 50]`          | `appendToChat()`, `escapeAndFormat()`               | Med    | Low  |
| 30  | **Karma Event Flash** — Screen flash on karma change                                 | `autoImportState` karma diff, CSS animations        | Low    | Low  |
| 31  | **Auto-Expand Active Panel** — Open panel matching state delta                       | `[DELTA]` diff, `<details>` DOM                     | Low    | Low  |
| 32  | **Item Category Tags** — `type` field (weapon/armor/aid/misc)                        | `state.inventory`, `addItem()`, `renderInventory()` | Low    | Low  |
| 33  | **Sound Effects for AI Sync** — Confirmation tone on sync complete                   | `audioCtx`, `playClack()` pattern                   | Low    | Low  |
| 34  | **Typewriter Speed Control** — Slider in audio settings                              | `getTypewriterSpeed()`, `AudioSettings`             | Low    | Low  |
| 35  | **Panel Memory** — Remember open/closed state across sessions                        | `<details>` panels, `localStorage`                  | Low    | Low  |
| 36  | **Input History** — Up/Down arrows cycle previous commands                           | `chatHistory[]`, `keydown` handler                  | Low    | Low  |
| 37  | **Critical Damage Flash** — Red flash when HP < 25%                                  | `updateMath()`, CSS animations                      | Low    | Low  |
| 38  | **Expanded Database CSVs** — FNV has 100+ weapons, 50+ ammo, 40+ armors              | `database.js` (pure data entry)                     | Med    | Low  |
| 39  | **AI Response Caching** — Cache last 5 responses keyed by `(text + stateHash)`       | `transmitMessage()`                                 | Med    | Med  |
| 40  | **D-Pad Hotkey Persistence** — Save `[BIND: Item, DIR]` to state                     | `state`, `macroCommand()`                           | Med    | Low  |
| 41  | **HTML Campaign Log Export** — Green-on-black styled `.html` file                    | `exportCampaignLog()`                               | Low    | Low  |

---

## EXPERIMENTAL — Architecturally complex or uncertain value

| #   | Feature                                                                      | Leverages                                | Effort | Risk |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------- | ------ | ---- |
| 42  | **Event Sourcing** — Append-only event log instead of snapshot               | `_lastStateBeforeSync`, diffs, IndexedDB | High   | High |
| 43  | **Multi-Character Support** — Profile selector + save slot switching         | Save slots infrastructure                | High   | Med  |
| 44  | **Voice Input** — Web Speech API transcription → chat input                  | `chatInput`, browser `SpeechRecognition` | Med    | Med  |
| 45  | **Text-to-Speech** — Read AI narrative aloud                                 | `SpeechSynthesis`, `AudioSettings`       | Med    | Med  |
| 46  | **Offline AI Fallback** — Local templates for `[INV]`, `[STATS]` without API | `sw.js`, `state`, `transmitMessage()`    | High   | Med  |
| 47  | **AI Persona Variants** — Yes Man, Mr. New Vegas, standard RobCo             | `getSystemDirective()`, `localStorage`   | Low    | Med  |
| 48  | **Weather System** — `state.weather` with CSS atmospheric effects            | `autoImportState`, CSS custom properties | Med    | Med  |
| 49  | **Pip-Boy Tabs** — STAT / INV / DATA / MAP / RADIO tab navigation            | All panels, major CSS restructure        | High   | Med  |
| 50  | **Campaign Sharing** — Shareable URL or read-only viewer                     | Firestore, `pushToCloud()`               | High   | Med  |

---

# PHASE 6 — LONG-TERM ARCHITECTURE ROADMAP

## Phase A: Client-Side Rule Engine (Near-term)

_"The game should know its own rules."_

A deterministic state machine between `autoImportState()` and the actual state object. Every AI-proposed state change passes through validation gates before being applied.

```
AI Response → Rule Engine (validates, clamps, flags) → Applied State
                   ↓
             Violation Log (visible in UI)
```

Rules: SPECIAL 1–10, HP ≤ hpMax, caps ≥ 0, XP monotonic, ticks monotonic, limbs only OK/CRIPPLED, inventory weight = Σ(qty × wgt).

## Phase B: Structured AI Communication Protocol (Near-term)

_"The AI should talk to the machine, not perform for it."_

Split the AI contract into three layers:

- **Narrative Layer** — Prose, dialogue, atmosphere (free text)
- **Command Layer** — State mutations as structured deltas: `{ "hpCur": -15, "caps": "+50" }`
- **Modal Layer** — Already exists, extend types (QUEST, MAP, CHARACTER_SHEET)

**Context Window Management:** Sliding summary window — keep last 10 raw exchanges, compress older ones into a 200-token summary.

## Phase C: World Simulation Engine (Medium-term)

_"The Mojave should exist when you're not looking at it."_

Client-side graph data structure: locations as nodes, routes as edges, with distances (ticks), encounter chances, terrain types, faction control.

Enables: travel time, random encounters (client-rolls, AI-narrates), location discovery, environmental hazards.

## Phase D: Faction Ecology (Medium-term)

_"Reputation should have teeth."_

Reactive system where faction standing drives mechanical effects: vendor pricing, route access, companion loyalty triggers, quest gating. The factions stop being numbers and become a resource the player manages.

## Phase E: Event Sourcing (Long-term)

_"Every action is a permanent record."_

Replace snapshot persistence with an append-only event log (IndexedDB). State is derived by replaying events. Enables: unlimited undo, campaign analytics, branching saves, efficient cloud sync (push only new events).

## Phase F: Multi-Agent Architecture (Long-term)

_"The NPCs should think for themselves."_

Split the single Gemini call into specialized agents (Narrator, Tactician, Merchant) with focused context. Client-side router decides which agent to call. Each agent gets 1/3 the cognitive load → schema compliance skyrockets.

---

# PHASE 7 — HIDDEN OPPORTUNITIES

## Underutilized Systems

1. **`database.js` is almost vestigial.** 7 CSV datasets loaded as a string but only injected into AI prompts. The client never queries this data. **Parsing it into Maps unlocks local DPS/DT calc, item hover details, trade validation, crafting requirements, and searchable autocomplete.**

2. **`state.status[]` is display-only.** Effects stored with tick durations but nothing decrements them. One `forEach` loop makes this a real-time buff/debuff tracker.

3. **`campaign_notes` has parseable structure.** The auto-logger writes `[T{ticks}] NCR: fame +50`. This is a proto-event-log that could be filtered by tick range, faction, or type.

4. **The modal system handles only 3 types.** GPS, TRADE, TEXT. The infrastructure supports any renderable data. QUEST, MAP, CHARACTER_SHEET modals would cost almost nothing.

## Features Already 50% Implemented

| Feature                       | What exists                                           | What's missing                                            |
| ----------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Equipped items                | Inventory tracked, AI knows weapon/armor stats        | `state.equipped` field, render in bio-metrics             |
| Status effect expiry          | `status[].ticks` stored and displayed                 | Decrement logic in `autoImportState`                      |
| Companion management          | `state.squad[]` with full stats + render              | Add/remove UI, companion registry                         |
| Input command history         | `chatHistory[]` with sender filtering                 | Up/Down key handler on `#chatInput`                       |
| Stash network                 | Command exists in directive, AI responds to `[STASH]` | `state.stashes` field, render UI                          |
| Day/night cycle               | `ticksToGameTime()` computes hour                     | CSS class toggle, `updateMath()` check                    |
| Client-side command execution | Macro buttons fire commands, state is fully local     | Command parser, local `[INV]`/`[STATS]`/`[REP]` rendering |

## Features Unlocked by Combining Existing Systems

| Combination                                        | Result                                 |
| -------------------------------------------------- | -------------------------------------- |
| `database.js` × `state.equipped` × `updateMath()`  | Local DPS/DT calculation without AI    |
| `FACTION_REGISTRY` × `state.loc` × thresholds      | Faction-controlled territory warnings  |
| `chatHistory` × `transmitMessage` × summary prompt | Context compression for long campaigns |
| `campaign_notes` × `ticksToGameTime` × timeline UI | Visual campaign timeline               |
| `state.perks` × `state.skills` × perk effects map  | Client-side perk application           |
| `state.squad` × `FACTION_REGISTRY` × affinity      | Companion loyalty/departure triggers   |

## The Biggest Opportunity Hiding Inside This Codebase

> **The `database.js` CSV data is currently a prompt-injected token payload that only the AI can use. But it's also a JavaScript constant sitting right there in the client.**

Every weapon, armor piece, chem, recipe, ammo type, and bestiary entry is already loaded into the browser's memory as a string. **Parse it once at startup into structured lookup tables** and the client gains:

1. Validate AI combat math locally ("AI said 52 damage but weapon only does 30")
2. Render item details on hover without API calls
3. Auto-populate crafting ingredient requirements
4. Show real DT/DPS in the UI based on equipped gear
5. Calculate trade prices locally using Barter skill formula
6. Pre-fill `addItem()` from a searchable item database instead of manual typing

**One parsing function transforms dead token weight into a local game database.** Every future feature that needs item/weapon/armor data gets it for free.

---

# FEATURES THAT SHOULD NEVER BE IMPLEMENTED

| Feature                         | Why not                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| **Real-time multiplayer**       | Architecture assumes single player, single global state.                                     |
| **Client-side save encryption** | Key lives in browser = security theater. Breaks debugging.                                   |
| **AI model fine-tuning**        | Locks to specific model version, prevents easy switching. Zero-shot prompting already works. |
| **Native mobile app**           | PWA already works. App store review for "violence" and "drugs" references.                   |
| **Real-time streaming AI**      | JSON parser can't handle partial chunks. Typewriter already provides the illusion.           |
| **Blockchain saves**            | No.                                                                                          |

---

# THE ONE SENTENCE THAT MATTERS

Right now, RobCo Terminal is **an AI chatbot wearing the skin of a game.** The roadmap transforms it into **a game engine that uses AI as its narrative renderer.** The difference is who has authority: the machine or the model. The machine should have authority. The model should have _voice_.
