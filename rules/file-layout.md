# Subsystem note — File Layout, Boot Order & Source Encoding

> **Load this when touching:** the `<script>` tags or `GAME_FILES` manifest in `index.html` ·
> any file split / add / move / rename / delete · `repomix.config.json` · any file that
> contains non-ASCII characters (most of them do).
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## Script load order

Global scope, not modules — the ACTUAL order from `index.html`; the numbered `js/…` filenames and their order below are machine-checked against `index.html` by Suite 220 / Protocol 45. Full per-file detail (every function → its file) lives in `library/CODE_MAP.md` (derived from source, Protocol 46); the labels below are a scannable index only:

<!-- LOAD-ORDER-GUARD:BEGIN — Suite 220 extracts the numbered `js/….js` items (the subject before each `→`) and asserts they equal the real boot order in index.html (idb → the GAME_FILES manifest → the remaining static tags). Keep this list in sync whenever a `<script>` tag or the GAME_FILES manifest changes. -->

1. `js/core/idb.js` → IndexedDB durable-shadow engine (first static tag)
2. `js/data/db_nv.js` / `js/data/db_fo3.js` → per-game CSV item data (GAME_FILES manifest, FNV fail-safe)
3. `js/core/state.js` → state, GAME_DEFS, saveState, migrateState
4. `js/data/reg_nv.js` / `js/data/reg_fo3.js` + `js/data/registry-core.js` → read-only registry data + registrySearch
5. `js/ui/ui-audio.js` → all audio + boot sequence
6. `js/ui/ui-render.js` → render-pipeline hub
7. `js/ui/ui-render-inventory.js` → CARGO MANIFEST & AMMO renderers
8. `js/ui/ui-render-character.js` → CHARACTER & FIELD STATUS renderers
9. `js/ui/ui-render-record.js` → PERSONAL RECORD renderers
10. `js/ui/ui-render-ledger.js` → FIELD LEDGER renderers
11. `js/ui/ui-render-map.js` → CARTOGRAPHY TABLE world-map renderer
12. `js/ui/ui-render-factions.js` → FACTION REPUTATION & KARMA renderers
13. `js/ui/ui-render-economy.js` → RESOURCE ECONOMY (CRAFT/TRADE) renderers
14. `js/ui/ui-render-loot.js` → ITEM ACQUISITION (LOOT/OCR) renderers
15. `js/ui/ui-render-databank.js` → NATIVE DATABANK TOOLS renderers
16. `js/ui/ui-saves.js` → save slots, import/export, registry autocomplete
17. `js/ui/ui-account.js` → account panel + cloud save picker
18. `js/services/ocr.js` → lazy Tesseract.js OCR (never loads at boot)
19. `js/core/runtime.js` → AmbientRuntime lifecycle state machine
20. `js/ui/ui-core.js` → ui-core spine hub (loadUI, appendToChat, updateMath)
21. `js/ui/ui-core-nav.js` → bezel subsystem nav
22. `js/ui/ui-core-overseer.js` → Director Uplink presence
23. `js/ui/ui-core-chassis.js` → Living Core + Service & Fault Console
24. `js/ui/ui-core-modulebay.js` → Module Bay wiring
25. `js/ui/ui-core-cmd.js` → command layer + event-bus subscribers
26. `js/dev/test-console.js` → Diagnostic Shell (initTestConsole)
27. `js/services/api.js` → transmitMessage network-layer hub
28. `js/services/api-directive.js` → getSystemDirective + 8 section builders
29. `js/services/api-import.js` → autoImportState AI→state import path
30. `js/services/api-router.js` → NATIVE_COMMAND_ROUTER offline routing (never calls the AI)
31. `js/services/cloud.js` → ES-module manual cloud push/pull

<!-- LOAD-ORDER-GUARD:END -->

The layering this order encodes (database → state → registry → ui → api → cloud) is **Protocol 23**,
in `CLAUDE.md`, where it stays universal.

---

## Protocol 37 — Keep repomix.config.json Current

Whenever the repo's file structure changes in a way that affects what should be packed for AI context (a new top-level source directory or file type added or removed, tests/scripts/workflows relocated), update `repomix.config.json`'s `include` or `ignore` in the **same commit**. Also re-check it when repomix itself is version-bumped (its config schema can change). The packed output (`repomix-output.*`) is gitignored and never committed. Goal: the one-shot repo context an AI loads is never stale or missing new code.

When reviewing structural changes, check `repomix.config.json` alongside `ARCHITECTURE.md`, `README.md`, and the test runners.

---

## Protocol 39 — UTF-8 Source Integrity

All source files are UTF-8. The app is intentionally full of non-ASCII characters — ⚙ ▶ ▲ ▼ ░▒▓ shading, box-drawing `──` `│` `┌`, `[████]` limb bars, em-dashes and arrows in the AI system directive, and `æ`/`¡` in data files. **Never write a file that contains non-ASCII using PowerShell** (`Set-Content`, `Out-File`, or string-replacement + `Set-Content`). PowerShell 5.1 reads file contents as Windows-1252 (Latin-1) by default and re-encodes the output as UTF-8, which **double-encodes every multi-byte character**: `—` → `â€"`, `▲` → `â–²`, `⚠` → `âš `, `🛑` → `ðŸ›'`. The corruption is silent — the file is still valid UTF-8, it just renders garbage in the browser and breaks the AI system directive.

**Safe write methods for files with non-ASCII:**

- The Edit tool (reads and writes UTF-8 correctly in all circumstances)
- Node.js: `fs.readFileSync(path, 'utf8')` → modify → `fs.writeFileSync(path, content, 'utf8')`
- `git show <ref>:<file> | node` pipeline to restore a clean snapshot before applying changes

**Enforcement:** Suite 90 fails the build if any source file contains U+FFFD (`�`) or the `â€` / `â–` mojibake prefixes — the double-encoding signatures for E2-80-xx and E2-96-xx UTF-8 sequences respectively.

**Incident reference:** Commit `48feb96` introduced double-encoding across the entire `js/services/api.js` (a PowerShell write during WU-A4); commit `c108beb` restored the file from a clean snapshot and added the Suite 90 guard.

---

## When a file moves

A file split / add / move / removal, or a major function relocating, obliges you in the same
commit to update **`library/CODE_MAP.md`** and the Reference Pointer Index (**Protocol 46**, in
`rules/docs-and-library.md`), the load-order block above if a `<script>` tag changed, and
`repomix.config.json` if the structure changed (Protocol 37 above).

---

## Related notes

- Doc-reference and load-order gate guards: `rules/docs-and-library.md` (Protocols 45, 46)
- Boot-order guard suites: `rules/testing-and-gates.md`
- The per-game file manifest: `rules/game-data.md` (Protocol 38)
