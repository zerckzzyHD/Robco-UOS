# Subsystem note — Game Data, Provenance & Game-Agnosticism

> **Load this when touching:** anything under `js/data/` (`db_nv.js`, `db_fo3.js`, `reg_nv.js`,
> `reg_fo3.js`, `registry-core.js`) · the `GAME_DEFS` block in `js/core/state.js` · the
> `GAME_FILES` manifest in `index.html` · any feature that branches on which game is active ·
> any Fallout fact entering the app.
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## Provenance (the game-data half of Protocol 3)

**Fallout game data** (items, quests, perks, locations) is sourced from `fallout.wiki` **only**.
The AI acts as typist, not authority. The full Protocol 3 text — including the architecture half
— is in `CLAUDE.md`, where it stays universal.

---

## Protocol 38 — Game-Agnostic Feature Code

Every feature's runtime behavior must be driven by `GAME_DEFS[ctx]` data, not hardcoded game literals. No feature code may contain `=== 'FO3' ? 'FO3' : 'FNV'`-style coercions that silently collapse a third game to FNV, two-game arrays of faction keys or file paths, or `if (ctx !== 'FNV' && ctx !== 'FO3')` literal allowlists. Adding a new game must require only a new `GAME_DEFS` entry and any game-specific data files — never a search-and-replace of game literals across feature code.

**Sanctioned exceptions (do not change):**

- The `GAME_DEFS` declaration block itself (`js/core/state.js`)
- `|| 'FNV'` fail-safe defaults (absence guard, not a game validation)
- Legacy `robco_v7`→`v8` bootstrap migration code
- The `GAME_FILES` boot manifest in `index.html` — the ONE sanctioned game→files map (WU-A5). It must precede `state.js`/`GAME_DEFS` (it selects the files that _define_ `GAME_DEFS`), so it cannot live inside `GAME_DEFS`. A new game = one manifest line + its two data files; selection is `GAME_FILES[ctx] || GAME_FILES.FNV`. Guarded by Suite 89 (sanctioned-map) + Suite 56 (boot load-order).
- `ctx === 'FO3' ? 'directive text' : ''` tracker-directive ternaries in `getSystemDirective()` (pending GA-5 refactor)

**Why:** As the app grows to support more Fallout titles, hardcoded two-game assumptions silently break or exclude the new game. Data-driven dispatch via `GAME_DEFS` is the only pattern that scales without requiring scattered literal updates across feature code.

**Extension — the `identity` block (owner-approved, added at the Design Overhaul DO-K unit):** `GAME_DEFS[ctx].identity` is the ONE sanctioned per-game **design-data** home — material/persona/ceremony/motion/audio/cursor/voice/ambient. Every per-machine design facet is data on this block; feature code reads it, never hardcodes a per-game design literal (a chrome color, a persona string, a motion-verb texture, a cursor shape). The **FO4 entry must exist and validate** (design-only — see its `designOnly: true` flag) so the N-game abstraction is proved before FO4 actually builds. `identity.theme` is an alias to each game's existing `theme` facet, never a duplicated copy (Protocol 22) — see `js/core/state.js` and Suite 157.

_(The status ledger of which Design Overhaul protocol amendments have landed and which are still
pending moved to `QUEUE.md` at R3, 2026-07-20 — it is roadmap state, not a rule.)_

---

## Registry layering

The registry (`registry-core.js` + `reg_nv.js` / `reg_fo3.js`) is **read-only and never touches
state** — a Protocol 23 boundary, in `CLAUDE.md`. Adding a registry-backed autocomplete input is
**Protocol 6**, in `rules/ui-and-mobile.md`.

---

## Related notes

- Per-game design facets in the UI: `rules/ui-and-mobile.md` (Protocols UI-7, UI-9, UI-10)
- Boot order and where `GAME_FILES` sits: `rules/file-layout.md`
- The AI as typist, never authority, for durable state: `rules/ai-contract.md` (Protocol 24)
