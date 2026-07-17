# RobCo U.O.S. — Agent Rules

> Every rule here was formalized from a real bug or established by the project owner.
> Follow this document first, `ARCHITECTURE.md` second.

---

## Reference Pointer Index

Small map of where the deeper reference lives, so a session is auto-directed rather than loading everything blindly. (2.8.5 Unit U-B1 built this out: the per-suite test catalog moved out of this file into `library/TEST_CATALOG.md`, so every session stops paying for suite-by-suite history it usually doesn't need. This index is what makes that safe — a session that genuinely needs suite detail is pointed at it, not left without it.)

| Need | Where to look |
| ---- | ------------- |
| **Full project reconstruction** — what the app IS, the architecture, the state shape, every subsystem, the protocols and WHY each exists, the recurring gotchas, the owner's hard rules, the workflow, the roadmap | `library/BRAIN_DUMP.md` (gitignored, local-only, Claude-facing — read it from disk) |
| **Current roadmap / what's built vs. next** (phone-readable, committed) | `QUEUE.md` (repo root) |
| **Canonical protocol & gate rules** | this file (`CLAUDE.md`) |
| **"Where does X live"** — function/subsystem → file, without loading whole files: entry points, render functions, native setters, boot phases, event-bus emitters/subscribers, the AI/cloud/OCR paths, the Diagnostic Shell registry | `library/CODE_MAP.md` (gitignored, local-only, derived from code not docs — Protocol 46) |
| **AI contract** — the Tri-Node JSON schema (`narrative`/`state`/`modal`), the 7 directive builders, `getSystemDirective()`, `autoImportState()`'s round-trip | `library/CODE_MAP.md` § AI Contract (`js/services/api.js`) — design rationale in `ARCHITECTURE.md` |
| **Boot lifecycle** — `window.onload`'s call order, the boot-phase functions, the event-bus subscriber wiring order | `library/CODE_MAP.md` § Boot Lifecycle (`js/ui-core*.js` — the hub + the 2.8.5 U-A1 split family) |
| **State shape** — `let state = {…}`, `GAME_DEFS`, `migrateState()`, the save envelope | `library/CODE_MAP.md` § State (`js/core/state.js`) |
| **Event bus** — `RobcoEvents`, every emitted event name, every subscriber-wiring function and which file owns it | `library/CODE_MAP.md` § Event Bus |
| **Native command router** — `NATIVE_COMMAND_ROUTER`, the quick-log grammar, the native stat-token setters | `library/CODE_MAP.md` § Native Command Router (`js/services/api.js`) |
| **Audio model** — the `AudioSettings` cache, `ensureAudioCtx()`, every sound-trigger function, the mute-guard pattern | `library/CODE_MAP.md` § Audio (`js/ui/ui-audio.js`) |
| **Two-store boundary** — campaign state (`state` / `robco_v8`) vs. device prefs (`MetaStore` / `META_MANIFEST`) | `library/CODE_MAP.md` § Two-Store Boundary; the rule itself is Protocol 23 below |
| **Render pipeline** — `loadUI()`, every `render*()` function and its panel, the CRUD helpers | `library/CODE_MAP.md` § Render Pipeline (`js/ui/ui-render.js`) |
| **Diagnostic Shell** — the `DIAGNOSTIC_SHELL_TOOLS` registry, the `prod`/`staging` tiering rule, `initTestConsole()` | `library/CODE_MAP.md` § Diagnostic Shell (`js/dev/test-console.js`) |
| **Test system** — how the gate runs, the single Node runner, suite numbering | `library/CODE_MAP.md` § Test System; per-suite detail in `library/TEST_CATALOG.md` |
| **Full per-suite test catalog** — every suite's coverage, every work-unit's build narration (large; read only when suite-level detail is actually needed) | `library/TEST_CATALOG.md` (gitignored, local-only — see the 3-class model below) |
| **Re-making an existing feature with all six models** (Claude×3 + Gemini + ChatGPT) — the reusable collaborative-remake prompt, with ready-to-paste blocks | `library/PROMPT_MULTI_AI_REMAKE.md` (gitignored, local-only, standing tool — re-aim per feature) |
| **Architecture deep-dive** (canonical design decisions) | `ARCHITECTURE.md` |
| **Plain-English release history** | `CHANGELOG.md` |

> Note: `library/BRAIN_DUMP.md` is a point-in-time snapshot; the code always wins where they disagree. `CLAUDE.md`'s own "Architecture Quick Reference" narration has drifted in places (it self-flags this) — the brain dump's "Known documentation drift" section records the specific gaps. `library/CODE_MAP.md` is derived directly from source (Protocol 46) and is a snapshot too — a session that finds it disagreeing with the code trusts the code and should flag the drift.

**The 3-class library maintenance model (2.8.5 U-B1):** every doc under `library/` and `planning/` falls into exactly one of three classes, and the class dictates how it's kept current:

- **LIVE** — actively maintained, gate-guarded where possible: `library/BRAIN_DUMP.md`, `library/TEST_CATALOG.md` (today — see GENERATED below), `library/CODE_MAP.md`, `QUEUE.md`, this Reference Pointer Index. A stale LIVE doc is worse than no doc at all — it makes a session confidently wrong. Update in the same commit whenever something it describes stops being true.
- **GENERATED** — never hand-maintained; produced from source by a script and diffed against the committed copy in the gate (Protocol 47). `library/TEST_CATALOG.md` is GENERATED-class **in intent** but is still hand-maintained **today** — 2.8.5 U-B1 only relocated its content out of `CLAUDE.md`'s tail; the generator itself is a separate, later unit and is explicitly out of scope here. Until that unit lands, sync it by hand exactly like a LIVE doc (Protocol 2a).
- **ARCHIVE** — frozen point-in-time snapshots: the audits, plans, mockups, and slates under `planning/`. These carry a "snapshot as of DATE — not current truth" framing and are never updated to track current code; their reasoning is reused as historical input, never trusted as current fact. The pre-2.8.0 audits (`planning/CODE_QUALITY_AUDIT.md`, `planning/PERFORMANCE_AUDIT.md`, `planning/ACCESSIBILITY_AUDIT.md`, `planning/TEST_STRENGTH_AUDIT.md`, `planning/TOKEN_USAGE_AUDIT.md`, `planning/UI_CONSISTENCY_AUDIT.md`, `planning/CLOUD_AUDIT.md`, `planning/FILE_AUDIT.md`) are ARCHIVE-class — they audited a codebase roughly 30% smaller than today's; do not trust their measurements or reuse their proposals without re-verifying against current code.

**Doc-maintenance rule (LIVE docs):**

- `library/BRAIN_DUMP.md` is the canonical reconstruction doc and future sessions trust it — the stale-LIVE-doc rule above applies in full (a stale dump makes sessions confidently wrong). Update it in the same commit whenever something in it stops being true: an architecture change, a new/changed protocol, a shipped roadmap item, a newly-learned recurring gotcha. **★ Hard exit condition:** the 2.8.5 code + test health phase restructures the whole file layout and invalidates large parts of the dump — that phase is **not complete** until the brain dump has been re-baselined against the restructured codebase.
- `QUEUE.md` is updated in the same commit as any change that actually moves the roadmap.
- `library/CODE_MAP.md` (new, 2.8.5 U-B2) is updated in the same commit whenever a file is split/added/moved/removed or a major function relocates — see Protocol 46.
- A **portable brief for an external model** (Gemini/GPT) is NOT a standing doc — it is regenerated fresh from the current brain dump on request, so it is always accurate because it is always new. Never keep a second standing copy of the truth. The generation spec lives in the brain dump ("Generating a portable brief for an external model").

---

## Pre-Commit / Pre-Push Gate

```powershell
# → Bump CACHE_NAME in sw.js if this commit touches a served/precached file (Protocol 1)
npm run lint        # ESLint — zero new errors
npm run format      # Prettier — all files clean
git add -A
git commit          # Pre-commit hook: cache-bump guard runs first, then fast gate (3381 tests via gate:fast)
git push origin main  # CACHE_NAME must already be bumped (Protocol 1)
```

- **3381 tests must pass.** If fewer pass, something is broken. Investigate before committing.
- **Bump `CACHE_NAME` when a staged file is in the served/precached set** (`index.html`, `sw.js`, `manifest.json`, icons, `css/`, `js/`) — the full rule and the automated commit-time guard (strict monotonic increase; non-served commits bypass it) live in **Protocol 1**.
- **Never use `--no-verify`** unless the user explicitly authorizes it for a stated emergency.

---

## Protocol 1 — Service Worker Cache Bump

Bump `CACHE_NAME` in `sw.js` when a commit or push changes any file that is **served to or pre-cached by users**: `index.html`, `sw.js`, `manifest.json`, `icon.png` (or any icon file), or anything under `css/` or `js/`. Doc-only, config-only (`.github/`, `scripts/`), and test-only commits do **not** require a bump.

**Format:** `'robco-terminal-v{APP_VERSION}-r{N}'`

- `N` starts at 1 for each new `APP_VERSION`.
- Increment `N` whenever a **served-file commit** is pushed.

**Why:** The SW is cache-first. Without a new `CACHE_NAME`, cached users silently run the old build and never see the "REBOOT TERMINAL" update prompt. Bumping only when served files change keeps the signal meaningful and avoids spurious update prompts on doc-only or CI-only pushes.

**Automated guard:** The pre-commit hook checks whether any staged file is in that served/precached set. If so, it requires a strict monotonic increase in the `-rN` revision number when `APP_VERSION` is unchanged — equal or lower revs are blocked (when `APP_VERSION` changes, the revision can reset). Non-served commits (doc-only, CI, tests) skip the cache check entirely.

---

## Protocol 2 — Documentation Updates

After every meaningful commit, update these files **in the same commit:**

| File              | What to update                                         |
| ----------------- | ------------------------------------------------------ |
| `ARCHITECTURE.md` | Version header, any new/changed architecture sections  |
| `CHANGELOG.md`    | Add entries under the current version block            |
| `README.md`       | Current State section, feature tables, project history |

**Version bumps:** Every user-visible change updates `APP_VERSION`, `CACHE_NAME`, and `CHANGELOG` together as one unit. `APP_VERSION` follows semver automatically — PATCH (x.y.Z) for bug/UI/internal fixes, MINOR (x.Y.0) for new user-facing features or panels — no need to ask. MAJOR (X.0.0) bumps (rewrites or breaking changes) still require explicit user confirmation. This replaces the old "always ask before bumping `APP_VERSION`" rule.

**`manifest.json` version discipline:** The PWA `name` field must never include a hardcoded version number — it is intentionally version-less (`"name": "RobCo U.O.S."`). If a version string is ever added back, it must be kept in sync with `APP_VERSION` on every bump. The `short_name` is `"RobCo"` and is also version-less.

**README Currency (strengthens Protocol 2's README clause — owner):** `README.md` must stay a **holistically accurate** picture of what the site actually IS — not merely the test-count/feature-table numbers. Whenever a change makes the README's description, feature list, supported games, architecture, file structure, script load order, version, or Current-State inaccurate, fix those sections **in the same commit**. The comprehensive holistic rewrite lands at the release (WU-VER) so it reflects the final shipped state; every prior unit keeps the README from drifting in the meantime.

### Protocol 2a — Test Count Sync

Whenever tests are **added or removed**, update the hardcoded count in **every** location below in the **same commit** as the test change. No deferred updates.

| File                          | Location to update                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                   | Pre-commit gate code block · Pre-commit gate note · Protocol 4 checklist · Protocol 5 checklist · Architecture Quick Reference's one-line test-suite summary (count + suite count if suites changed) — this file is the canonical source for all protocol content |
| `library/TEST_CATALOG.md`     | Every per-suite catalog entry (2.8.5 U-B1 relocated the full catalog here from `CLAUDE.md`'s tail). Hand-synced today, same as a LIVE doc — see the 3-class model above. **Not CI-gated**: `library/` is gitignored (mirrors the existing `library/BRAIN_DUMP.md` carve-out — absent on a clean CI checkout), so this is a local-machine sync discipline, not a gate check, until a future unit adds a generator + resolves the gitignore-vs-gate-diff tension |
| `RULES.md`                    | The one "N tests" quick-fact line — `RULES.md` is a deliberate pointer file (see its own header); it carries no other protocol content to sync                        |
| `README.md`                   | Technology stack table · File structure comment · Commit workflow block · Current State bullet                                                                         |
| `ARCHITECTURE.md`             | Pre-commit checklist (`all N+ tests`)                                                                                                                                  |
| `CHANGELOG.md`                | **Current Unreleased section header only** (`## [v2.5.0] — Unreleased<!-- Tests: N/N \| Cache: ... -->`). Released version entries (e.g. `v2.0.1`) are frozen at their release-day values — never update them retroactively. |
| `tests/robco-diagnostics.js`  | Per-suite `// N tests` comments at the top of each suite block (the single canonical runner)                                                                            |
| `tests/test.html`             | `Suites: N` header-comment marker (Protocol 40) — must equal the actual `section('…')` count; update when a runtime suite is added/removed                              |

**How to find all stale counts before committing:**

```powershell
Select-String -Path "RULES.md","CLAUDE.md","README.md","ARCHITECTURE.md","CHANGELOG.md","tests/robco-diagnostics.js","tests/test.html" -Pattern "\d+[- ]tests?|Suites:\s*\d+" | Select-Object Filename,LineNumber,Line
```

Run this after every test addition or removal. Every hit must show the new count **except** the frozen released-version entry in `CHANGELOG.md` (e.g. `v2.0.1` shows its release-day count of 258 — that is intentional and correct). This command deliberately omits `library/TEST_CATALOG.md` — it is gitignored and may not exist on every machine; sync it by hand when it is present, same as `library/BRAIN_DUMP.md`.

**Changelog versioning model:** Per-push test-count and cache-rev updates go on the current `## [Unreleased]` section header, **never** on a released version's entry (e.g. `v2.6.0`, `v2.0.1`) — released entries are frozen at their release-day values and must not be modified retroactively. **The one sanctioned exception is a hotfix** (see below), which actively patches a shipped version and so updates that version's header comment.

**Hotfix model (first-class changelog concept — owner directive 2026-06-30):** Every change lands in exactly one of three places, by its release status:

- **Pre-release change** (work not yet shipped) → the `## [Unreleased]` block, under the normal Keep-a-Changelog categories. At the `dev → main` release it consolidates into the new dated version block.
- **Post-release fix folded into the live shipped version** (a bug found _after_ that version is on prod, not worth a new version number) → a dedicated **`### Hotfix`** heading **inside that already-released version's block** (e.g. `## [v2.7.0]`). `APP_VERSION` does **not** change; only the cache rev increments (`-r2`, `-r3`, …) as served files change. The patched version's header comment (`<!-- … | Tests: N/N | Cache: …-rN -->`) **is** updated to the new test count and cache rev — the sanctioned exception to the frozen-entries rule above, because the shipped version is being actively patched. The `### Hotfix` heading is a recognized changelog category (guarded by Suite 97) and the in-app viewer renders it like any other category (the `hotfix` tag in `_CHANGELOG_CAT_TAGS`, guarded by Suite 62).
- **Genuinely new version** (a normal `APP_VERSION` bump per Protocol 2) → its own new dated `## [vX.Y.Z]` block.

**Chronological ordering:** `[Unreleased]` entries are kept in chronological order within each category, earliest first (ascending), appended as work lands. Preserve the Keep-a-Changelog category grouping (one `### Added` / `### Changed` / `### Fixed` / `### Under the Hood` heading each, in that standard order) — but within each category, list bullets in the order the changes actually landed, oldest at the top. Use `git log` to settle true chronology when an entry's order is unclear.

---

## Protocol 3 — Source of Truth

- **Fallout game data** (items, quests, perks, locations): Source from `fallout.wiki` only. The AI acts as typist, not authority.
- **Architecture decisions:** `ARCHITECTURE.md` is canonical. Treat it as approved unless the user explicitly overrides.

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
- [ ] Run `git commit` — 3381 tests must pass
- [ ] Update `ARCHITECTURE.md`, `CHANGELOG.md`, `README.md` → Protocol 2

---

## Protocol 5 — Adding a New UI Panel

- [ ] Add `<details class="panel">` block in `index.html`
- [ ] Create `render*()` function in `ui-render.js`
- [ ] Call `render*()` from `loadUI()` in `ui-core.js`
- [ ] If it shows a count: add entry to `_updatePanelBadges()` in `ui-core.js`
- [ ] If AI changes should auto-expand it: add key to `expandPanelForCategory()` map in `ui-core.js`
- [ ] If it has a text input with autocomplete: call `wireInput()` in `initRegistryAutocomplete()` in `ui-saves.js`
- [ ] Bump `CACHE_NAME` → Protocol 1
- [ ] Lint, format, commit (3381 tests) → Protocol 2

---

## Protocol 6 — Adding a Registry Autocomplete Input

1. Add `<input type="text" id="newXxxName" ...>` in `index.html`
2. In `initRegistryAutocomplete()` in `ui-saves.js`, add: `wireInput('newXxxName', 'category');`
3. If the category is new, add it to `FALLOUT_REGISTRY` in the per-game data files (`reg_nv.js` / `reg_fo3.js`)
4. Create `addXxx()` function in `ui-render.js` mirroring `addPerk()` / `addQuest()` pattern
5. Bump `CACHE_NAME` → Protocol 1

---

## Protocol 7 — Adding a New Audio Source

- [ ] Create function in `ui-audio.js` using existing `audioCtx` via `ensureAudioCtx()`
- [ ] First guard: `if (AudioSettings.masterMute) return;`
- [ ] Second guard: `if (AudioSettings.<key>) return;`
- [ ] Add key to `AudioSettings` init block in `ui-core.js`
- [ ] Add checkbox toggle in `index.html` inside the Audio Systems details panel
- [ ] Add localStorage key to `toggleAudio()` keyMap in `ui-audio.js`
- [ ] Add key to `toggleMasterMute()` un-mute restore logic in `ui-audio.js`
- [ ] Add new setting to the Settings table in `ARCHITECTURE.md`
- [ ] Bump `CACHE_NAME` → Protocol 1

---

## Protocol 8 — Dispatch Multi-Model Workflow

Non-trivial work run via Dispatch uses a multi-stage model hand-off. This is a **THREE-model workflow — Fable / Opus / Sonnet — not a rigid two-model track.** Dispatch auto-selects the model per stage; the sessions work hand-in-hand, never in isolation.

- **Fable — Design & Creative.** The design and creative model. Reach for Fable when the work is generative or aesthetic rather than analytical or mechanical: visual/UI design and mockups; diegetic in-fiction writing (POST lines, flavor text, persona/greeting copy, ceremony beats, board names, the house voice); the plain-English changelog prose (Protocol 21); and open "what would the coolest RobCo-native version of this be?" exploration. Fable authored the approved mockups this entire overhaul was built from (the NV machine, the tempo dial, the records bay, the operator boards) — it is a real, standing part of this workflow, not an afterthought. The typical shape is **Fable designs → Opus audits/plans → Sonnet implements → Opus audits the diff.** Fable can also slot in **mid-run**, not only at the front — it plugs in wherever design/creative judgment is the bottleneck (this is consistent with the adaptive-escalation clause below: Dispatch picks the model per stage and may switch).

1. **Opus — Diagnose & Plan.** Opus investigates the actual code and git history, identifies the root cause, and writes a concrete plan: exact files, selectors, and line numbers; the change and its rationale; desktop/regression safety; and explicit verification steps. No edits in this stage.

2. **Sonnet — Review & Implement.** Sonnet first critically reviews the Opus plan against the current files (line numbers drift, selectors go stale, diagnoses can be wrong) and corrects any discrepancy. Then it implements, runs the full pre-commit gate (lint, format, Protocol 1 cache bump, 3381-test gate, Protocol 2/2a docs), and verifies the user-facing result by actually rendering/exercising it at the real target (e.g. a 360/412px mobile viewport) — never from headless width measurements alone.

3. **Opus — Audit before done.** Opus independently reviews the actual committed diff and the verification evidence against the original root cause: is the issue fully resolved, nothing regressed, and is the change actually live on the deployed branch (origin/main) and site — not just a local/worktree commit? If anything falls short, loop back to stage 2. The task is "done" only after this audit passes.

**Adaptive escalation — Dispatch judges per situation.** The three stages are the default, not a rigid track. Dispatch selects and switches the model based on how the work is actually going, and loops are expected. Escalate to Opus whenever depth is needed: Sonnet's plan review finds the diagnosis wrong or incomplete, an audit surfaces problems, a fix fails verification or regresses, the root cause is ambiguous, or the change is high-risk. Use Sonnet for straightforward implementation and routine changes. A failed audit, or a review that finds real problems, sends the work back to Opus for deeper analysis rather than having Sonnet grind on the same wrong path. Plan → implement → audit may cycle until the audit passes.

**Plan audit before implementation (audit the audit).** In stage 1, Opus reads every file the change can touch, and the plan must explicitly enumerate every entry path, state, and edge case the change can encounter — for lifecycle/UI changes that means each load / reload / cache-clear path, each saved-state value, each tab/panel visibility state, desktop vs mobile, and brand-new vs migrated state — and state the intended behavior for each. Opus then audits its own plan against that enumeration and may not hand off until every case is covered. Plans that fix one path and silently miss another are exactly the failure this stage exists to prevent.

**Spec lock — no mid-run changes.** Lock the full specification before a Dispatch session starts. Do not send new requirements or tweaks to a session that is already running — it may commit and push before incorporating them, producing partial or inconsistent results that need cleanup passes. If the spec must change, wait until the session is idle and issue one complete follow-up; never stack instructions onto an in-flight push.

**Why:** Fable generates the design/creative direction and the in-fiction voice; Opus reasons deeper at higher cost; Sonnet implements efficiently at lower cost. Naming all three keeps the design stage visible — a session reading a two-model protocol would wrongly believe the mockups and house voice appear from nowhere. The review stage catches plan drift before it lands; the audit stage catches incomplete fixes and false "verified" passes (which previously caused repeated "still broken" cycles) before they reach the user.

---

## Protocol 9 — Dispatch Reporting

When work is run via Dispatch, never finish a task or complete a git push silently. After every completed task AND after every git push, report back to the user on Dispatch in plain English: what was done and why, the commit reference and what it changed, confirmation that the push landed on origin/main (and whether a reload / "Reboot Terminal" update is needed to see it), and anything the user should check. Keep it readable for a non-developer — same plain-English style as the changelog. Every time, no exceptions.

Because the Dispatch user typically cannot view the code or repo directly, any push that changes user-facing behavior must be reported with an explicit "it's live — here's what changed and exactly how to test it" message (live confirmation plus step-by-step test instructions), not just a commit summary.

Dispatch reports must be formatted for mobile reading: lead with a one-line summary of what changed, keep it short and scannable (no walls of text, no code dumps or file paths), clearly state what was updated, and give the exact steps to test it. Optimize for a phone screen.

---

## Protocol 10 — UI Verification

Any change touching `index.html`, `css/`, or render JS (`ui-render.js` `render*` functions) must be verified by actually **rendering** the affected UI at **360px, 412px, and ≥1000px (desktop)** before it is considered done — never from headless width measurements alone. Confirm no horizontal page overflow (`document.documentElement.scrollWidth === window.innerWidth`), the component looks correct, and desktop is unchanged.

The definitive verification step is `tests/render-check.mjs` — a Playwright render-check that loads the page at 360px and 412px and asserts no horizontal overflow and no focus-zoom. Run it outside the 3381-test pre-commit gate whenever map or mobile layout changes land. It is the only check that catches real pixel/overflow regressions.

---

## Protocol 11 — Deploy Verification

After any push that affects the live site, confirm the change actually reached `origin/main` AND is served by GitHub Pages (account for CDN + service-worker caching), then tell the user the exact step to see it (reload + tap "Reboot Terminal"). Never report a UI change as live without this check.

---

## Protocol 12 — No Concurrent Pushes

Never run two sessions that commit/push this repo at the same time — sequence them to avoid branch/worktree collisions. Combined with the Protocol 8 audit gate, only one change lands at a time.

---

## Protocol 13 — Regression Test Required

When a bug is fixed, add a regression test in the **same commit** that would have caught it, and re-sync the count per Protocol 2a. **No bug fix ships without a guarding test — this is mandatory.** The only permitted exemption is when the bug genuinely cannot be reproduced in the test sandbox (e.g. requires a live network, real browser API, or hardware-specific behavior); in that case the commit message must explicitly state the reason.

---

## Protocol 14 — AI Contract Safety

When changing `getSystemDirective()`'s schema or the Tri-Node JSON response shape (`narrative`/`state`/`modal`), add or update a test in the **same commit** that validates the schema and the `autoImportState()` round-trip. The app is locked to JSON AI responses (`responseMimeType: 'application/json'`); a silent schema break is catastrophic and must be guarded by a test.

---

## Protocol 15 — Test-Runner Parity — RETIRED (2.8.5 U-B3, 2026-07-12)

**RETIRED.** This protocol policed the two-runner duplication (Node + PowerShell). The PowerShell mirror (`tests/robco-diagnostics.ps1`) was **deleted** in 2.8.5 U-B3 after an evidence-backed review found it caught **nothing** the Node runner cannot: its "behavioral" tests shelled out to `node` (reconstructing the same `vm`-sandbox harness in a string), and its static tests were byte-identical UTF-8 file greps — at ~13× the runtime cost (≈22 s vs ≈2 s) and double the authoring cost of every test. With one runner there is no parity to enforce. This is the project's first deliberate protocol **retirement**; the number is not reused. The former parity checks are inverted into deletion-regression guards (Suites 28, 31.2, 50.6, 128.5) so the mirror cannot silently return.

---

## Protocol 16 — Hotfix / Rollback

If a push breaks the live site (e.g. black screen / failed boot), restore users **first** — `git revert` the offending commit, bump `CACHE_NAME`, push — **then** diagnose the root cause. Restore first, debug second. After a rollback, document the root cause, add a regression test (Protocol 13), and record it in the CHANGELOG before re-attempting the fix.

---

## Protocol 17 — Mobile Baseline

All UI must hold these mobile invariants: focusable inputs render at ≥16px font (prevents iOS/Android focus auto-zoom), interactive controls have ≥28px tap targets, and no component may force horizontal overflow at 360px (`document.documentElement.scrollWidth` must equal `window.innerWidth`). Verify per Protocol 10. No hover-only UI and no desktop-only interactions; design touch-first. Keep focus states visible and never convey meaning by color alone.

---

## Protocol 18 — Memory Maintenance

Keep durable project facts current (repo path, APP_VERSION, cache rev, architecture decisions, recurring engineering gotchas). Do not store transient task state or temporary implementation details.

---

## Protocol 19 — Batch Before Push

Do not push incrementally after each sub-task when multiple related changes are queued. Complete all queued/related work first, run the full pre-commit test gate **once**, then push a single time. Every push must have the entire test suite passing and the test count synced everywhere per Protocol 2a. Prefer fewer, complete, verified pushes over many partial ones.

---

## Protocol 20 — Static Source-Invariant Guards

Critical CSS rules, render-function class/markup contracts, and service-worker invariants must each be covered by a static test that fails if the safeguard is removed in a refactor. Lost-safeguard regressions (a dropped class, an overridden CSS rule, `skipWaiting` in install) must surface as a gate failure, not reach production.

---

## Protocol 21 — Plain-English Changelog

Every `CHANGELOG.md` entry must be written in clear, plain English that a non-developer can understand — describe what changed and why it matters from the user's perspective, not in developer jargon — in one consistent, readable style across the whole file. Preserve structural markers (version headers, the `Tests`/cache header comment) while keeping the prose plain. Avoid internal implementation details unless they explain a user-visible change.

### Universal style

Every version block follows the same seven rules:

1. **Group entries under fixed headings**, in this order, skipping any that are empty: **Added** (new features), **Fixed** (bug fixes), **Changed** (behavior changes), **Improved** (refinements), and optionally **Under the Hood** (internal or dev-only changes — kept short and clearly separated so the user-facing part stays on top).
2. **Lead with user impact:** each entry starts with what the user can now do or what stopped breaking, in plain language. The "why" is optional and only if it helps.
3. **Consistent voice and tense:** past tense, the same throughout the whole file — "Added…", "Fixed…", "Improved…".
4. **No code identifiers in the prose:** no file names, function names, commit hashes, or cache revs in entry text — those belong only in the structural header comment, never the human-readable body.
5. **One entry per user-visible change, deduplicated:** merge related commits into a single readable line, not one entry per commit.
6. **Consistent granularity:** short, scannable sentences; do not mix terse fragments with long paragraphs.
7. **Preserve the structural markers exactly** (version number, date, the Tests/cache header comment) — only the prose changes.

Rule 7 governs only the rewrite of EXISTING entries; it does not restrict versioning. The user may always manually instruct a version bump (e.g. 'bump version' or 'make this 2.1.0'), which follows Protocol 2's semver rules and creates a new version block in the changelog.

### Environment-aware in-app changelog viewer (Protocol 43 dev/prod split)

The in-app changelog viewer is **environment-aware**, mirroring the dev/prod branch split (Protocol 43). This **supersedes** any earlier "the viewer never renders `[Unreleased]` anywhere" wording:

- **Production** (GitHub Pages — `zerckzzyhd.github.io/Robco-UOS/`, built from `main`): the viewer shows **only the latest RELEASED version** and **never renders the `[Unreleased]` section**. Public users must never see unreleased work.
- **Dev / staging** (Cloudflare Pages — `robco-uos-dev.pages.dev`, built from `dev`; plus local `localhost`/`127.0.0.1`): the viewer **does render `[Unreleased]`** so the owner can review unreleased work while testing the staging build.

**Detection is fail-safe — default to production.** The viewer treats production behavior (hide `[Unreleased]`) as the default and only reveals `[Unreleased]` when a **positive staging signal** is present. The robust signal is a **build-injected staging flag**: `scripts/cf-staging-build.mjs` stamps the staged `index.html` with an explicit staging marker (e.g. `<meta name="robco-env" content="staging">` or `window.__ROBCO_ENV__ = 'staging'`) that the production build (`deploy.yml`) never emits — so an absent, unknown, or stale-cached environment always falls back to hiding `[Unreleased]` and can never leak it to prod. Hostname (`*.pages.dev`, `localhost`) is an acceptable *secondary* signal, but the injected flag is primary because it cannot be spoofed by a renamed host or a stale cache.

`[Unreleased]` always **stays in `CHANGELOG.md`** (the working draft); only its *rendering* is gated. The implementation and a both-runners guard (assert prod-mode hides `[Unreleased]` **and** dev-mode shows it) ship in **WU-C11**, not as part of this rule.

---

## Protocol 22 — Extend Before Creating

Before introducing any new manager, service, renderer, helper, component, or state object, search the repo for equivalent functionality and extend it where reasonable. Do not create parallel implementations (e.g. `renderXNew()`, `StateV2`, a second save manager). Duplicate systems are architectural regressions.

---

## Protocol 23 — Architectural Boundaries

Respect the established layering (script load order: database → state → registry → ui → api → cloud). Rendering only renders; `state.js` owns state; the registry (`registry-core.js` + `reg_nv.js` / `reg_fo3.js`) is read-only and never touches state; `api.js` handles AI + import; `cloud.js` handles sync. Systems communicate only through established functions/interfaces — render code must not write saves, registry must not mutate state, etc.

---

## Protocol 24 — AI Determinism

The AI is never the sole source of truth for durable application state. All AI output must be validated and explicitly field-mapped (via `autoImportState`'s explicit mapping, never recursive key transforms) before it is persisted. If the AI fails or returns malformed data, the app must remain fully usable offline. Never let AI responses overwrite state without validation.

---

## Protocol 25 — UX Stability

Existing user workflows must not change unless the requested feature requires it. Improve the current experience before replacing it; preserve user muscle memory. Do not redesign or relocate working UI unprompted.

**Sanctioned exception — owner-approved redesigns (added at the Module Bay unit, WU-B2a):** an owner-approved redesign (reviewed and signed off against a concrete mockup, e.g. the Module Bay reframe of Security & Configuration) is a sanctioned exception to the no-unprompted-redesign rule, provided it holds every one of these guardrails:

- **Same panel location and tab** — the redesign reframes a panel's contents, it does not relocate the panel itself.
- **No increase in tap-count** for any control versus the workflow it replaces.
- **A fallback that preserves the prior mental model** (e.g. a permanent Schematic View / flat compact list) so the old muscle memory still works.
- **Real control labels ride along as searchable sub-labels** so the new fiction never obscures what a control actually does.
- **A control's stored semantics must not change even when its presentation is inverted** (e.g. a mute checkbox re-skinned as an "installed = audible" chip keeps writing the same boolean to the same key).

This both authorizes owner-approved reframes like the Module Bay and codifies the mitigation bar future owner-approved redesigns must clear — it does not loosen Protocol 25 for anything that lacks an explicit owner sign-off against a concrete design.

**Extension — site-wide overhaul + bezel nav (owner-approved, adopted at the Design Overhaul DO-N unit):** the sanctioned-exception clause above extends from a single panel (the Module Bay precedent) to the **whole Design Overhaul program**, under the *same* five guardrails. It **additionally authorizes replacing the tab bar with the bezel subsystem selector** (DO-N), conditioned on: hotkeys `[1]`–`[5]` (+ `[0]` for the flat fallback) keep working, `role=tab`/`aria-selected` ARIA is preserved, `#go=` PWA deep-links are preserved, and a flat DIRECTORY fallback reproduces the old tab-bar's plain-label mental model one tap away. DO-N's `.nav-cluster[role=tablist]` + `.navkey` keycaps satisfy this: every keycap still routes through the unchanged `switchTab()`, the old tab names ride along as `.nk-sub` sub-labels, and `openBezelDirectory()` is the DIRECTORY fallback.

---

## Protocol 26 — Definition of Done

Before implementing, write explicit, testable acceptance criteria — the enumerated scenarios that must pass for the task to count as done. The task is not "done" until every criterion is verified on the real artifact (actually rendered or run), never assumed. This is the checklist form of the Protocol 8 plan-audit, and it is the primary guard against fixing one path while silently missing another.

---

## Protocol 27 — Reproduce Before Fixing

Confirm the actual cause before writing a fix — reproduce the bug or trace its mechanism directly in the code. No speculative fixes: a wrong guess costs a full implement → verify → fail → re-diagnose cycle. State the confirmed root cause in the plan before implementation begins.

---

## Protocol 28 — Usage Efficiency

Treat model usage as a budget — and the burden of efficiency is on the orchestrator (Dispatch), NOT the user. The user may send scattered, evolving requests across many separate messages; that is expected and fine, and the user is never required to be focused or to send a complete spec upfront. It is Dispatch's job to absorb that input, consolidate related requests, wait for a natural lull, and lock ONE complete specification before starting a session (per the Protocol 8 spec-lock) — rather than firing each fragment into a running session and causing cleanup passes. Prefer one complete, verified pass over many partial pushes; reuse a session or diagnosis that already holds the context instead of re-running it; do not spin up a new session for a trivial edit; batch related work (Protocol 19). Every avoidable cleanup pass is wasted spend.

---

## Protocols 29 / 30 / 31 — Authentication Hard Rules

_(Grouped from three separate protocols. All three numbers are retained as labeled sub-rules below so every existing `Protocol 29`, `Protocol 30`, and `Protocol 31` reference still resolves here.)_

**Shared mechanism (the root of sub-rules 29 and 30):** GitHub Pages cannot self-host the Firebase `/__/auth/` redirect handler. The redirect flow relies on a cross-origin iframe to `{project}.firebaseapp.com`, which modern mobile browsers block (storage partitioning), causing `getRedirectResult` to return `null` and silently breaking sign-in with no error to the user. This is invisible on desktop and in the test suite — only a real mobile device catches it (the r54 mobile sign-in regression).

**Sub-rule 29 — auth changes require real-device mobile verification.** Any change to authentication or sign-in flow is not "done" until it has been verified on a **real mobile device** — in both a normal browser tab and the installed PWA (add-to-home-screen standalone mode). Emulators and desktop DevTools responsive modes are not sufficient: they cannot catch OAuth redirect/popup behavior, storage-partitioning bugs, or standalone-mode session-isolation issues (see the shared mechanism above).

**Sub-rule 30 — popup-only auth; redirect banned.** Use `linkWithPopup` / `signInWithPopup` **only**. `linkWithRedirect` and `signInWithRedirect` are **prohibited** on this project — the redirect flow hits the shared-mechanism failure above, while the popup flow has no such dependency and works correctly in all environments this app targets.

**Sub-rule 31 — `signInAnonymously` must always be guarded, never unconditional.** The boot anonymous sign-in must be gated behind `auth.authStateReady()` plus an explicit `!auth.currentUser` check (or equivalent guard), never called unconditionally. The Firebase SDK only no-ops `signInAnonymously` for a user who is already anonymous; for a user already signed in with a linked account (e.g. Google), an unconditional call mints a fresh anonymous user and silently replaces the session — wiping sign-in on every reload. This was the root cause of the 5c-ii clobber bug.

---

## Protocol 32 / 33 / 35 — Remote Kill-Switch (three parts)

_(Formerly three separate protocols. All three numbers are retained as labeled parts below so every existing `Protocol 32`, `Protocol 33`, `Protocol 35`, `Protocol 32/33`, `Protocol 32/35`, and `Protocol 32/33/35` cross-reference — in code comments, `ARCHITECTURE.md`, and the test suite — still resolves here.)_

**Why (shared):** A kill switch lets a broken networked feature be turned off remotely without a redeploy, and a defined fallback keeps the app fully usable when that feature is unavailable. Without these, any new networked feature is a potential outage vector.

**Part (a) — Protocol 32: every new network/IO feature ships a flag + graceful fallback.** Any new feature that does network or external I/O — cloud sync, authentication, AI calls, remote config, or any future integration — must be registered with the remote kill-switch config and must define a graceful fallback behavior for when the feature is disabled or failing. (The kill-switch mechanism itself is Phase 5 hardening work; this rule governs all features added from that point forward.)

**Part (b) — Protocol 33: the boot read is fail-safe.** Reading the remote kill-switch / feature-config on boot must never disable features or black-screen the app if the config is unreachable, malformed, or slow to respond. Always default to last-known-good or features-enabled and remain fully usable offline. The safety mechanism cannot be a new failure mode — if the kill-switch check itself can bring down the app, it is worse than having no kill switch at all.

**Part (c) — Protocol 35: auto-flip off on detected post-deploy regression.** When a post-deploy regression in a networked/IO feature is detected, the dev process flips that feature's flag to `false` in `/config/flags` via the Firebase console **immediately and automatically** — without waiting for the user — then notifies the user. Restore first, diagnose second; the live-site analogue of Protocol 16 for flaggable features. Order: (1) flip off live, (2) confirm fallback active + app usable, (3) report to user, (4) diagnose/fix/verify, then flip back on. Prefer the remote flag over `git revert` when the break is contained to a flaggable feature (instant, no deploy/cache bump) — the fail-safe read (b) means flipping only disables into the defined fallback, never black-screens, so a flaggable regression never waits on a human round-trip.

---

## Protocol 34 — Cloud Writes Are Additive; Destructive Ops Are Confirm-Gated

All cloud save and data writes must be **additive** (e.g. `addDoc` to create a new document — never a blind overwrite of an existing one). Any destructive action — overwriting the live campaign state on load, deleting a cloud save, or replacing an existing document — must be behind an explicit user confirmation step.

**Why:** This locks in the no-overwrite / no-silent-delete data-safety invariant for all future cloud features. The pattern was verified correct for the Phase 5c-iii cloud save picker and must hold going forward. A single accidental destructive write can silently erase a user's save with no recovery path.

### Cloud-sync determination (every new state field declares its sync path — WU-B5)

When you add a field to `state` (Protocol 4), **state its cloud-sync path in the same commit:**

- **Serialized-whole (default):** fields that live inside the `state` object ride the cloud save automatically — the whole `robco_v8` container is serialized into the additive `saves` document on push, and run through `sanitizeImportedContainer()` → `migrateState()` on pull. No per-field sync code is needed; just confirm the field is covered by the sanitizer (Protocol 4 sanitize checklist) and survives the **push → sanitize → migrate → apply** round-trip (guarded by the WU-B5 round-trip test in Suite 46).
- **Dedicated document (e.g. secrets/settings):** a field synced to its own Firestore doc (like the Gemini key or the key-sync preference) needs its own additive / merge-safe write and an explicit sync-path note in the commit.

**`setDoc` permanence (hard rule):** never write a `saves` document with `setDoc` — saves are created with `addDoc` (additive) and modified by id with `updateDoc`; a blind `setDoc` would clobber a user's campaign with no recovery. Any `setDoc` to a mutable config doc (settings/preferences) must pass `{ merge: true }` so it never erases sibling fields. Both invariants are gate-guarded (Suite 46).

---

## Protocol 36 — Gate Parity & Escape-Ratchet

**(a) GATE PARITY:** The local gate is split at the commit/push boundary. The pre-commit hook runs the FAST subset (`npm run gate:fast`: lint, format, the Node test runner) to keep commits quick (~5–8 s). The pre-push hook runs the FULL gate (`npm run gate`, adds Playwright boot-smoke + render-check) before anything reaches origin. CI also runs `npm run gate` — parity holds at the push boundary, which is the only boundary CI observes. The local gate can never be a weaker promise than CI at that boundary.

**(b) ESCAPE-RATCHET:** Any failure that escapes a layer gets a check added AT that layer in the SAME fix — a production bug becomes a regression test; anything that passed the local gate but failed CI gets that check pulled into `npm run gate` / the hook so the whole class is caught locally next time. Every escape permanently tightens the gate.

**Why:** This is what makes the gate self-improving — defects ratchet the net finer instead of recurring.

---

## Protocol 37 — Keep repomix.config.json Current

Whenever the repo's file structure changes in a way that affects what should be packed for AI context (a new top-level source directory or file type added or removed, tests/scripts/workflows relocated), update `repomix.config.json`'s `include` or `ignore` in the **same commit**. Also re-check it when repomix itself is version-bumped (its config schema can change). The packed output (`repomix-output.*`) is gitignored and never committed. Goal: the one-shot repo context an AI loads is never stale or missing new code.

When reviewing structural changes, check `repomix.config.json` alongside `ARCHITECTURE.md`, `README.md`, and the test runners.
---

## Protocol 38 — Game-Agnostic Feature Code

Every feature's runtime behavior must be driven by `GAME_DEFS[ctx]` data, not hardcoded game literals. No feature code may contain `=== 'FO3' ? 'FO3' : 'FNV'`-style coercions that silently collapse a third game to FNV, two-game arrays of faction keys or file paths, or `if (ctx !== 'FNV' && ctx !== 'FO3')` literal allowlists. Adding a new game must require only a new `GAME_DEFS` entry and any game-specific data files — never a search-and-replace of game literals across feature code.

**Sanctioned exceptions (do not change):**
- The `GAME_DEFS` declaration block itself (`js/core/state.js`)
- `|| 'FNV'` fail-safe defaults (absence guard, not a game validation)
- Legacy `robco_v7`→`v8` bootstrap migration code
- The `GAME_FILES` boot manifest in `index.html` — the ONE sanctioned game→files map (WU-A5). It must precede `state.js`/`GAME_DEFS` (it selects the files that *define* `GAME_DEFS`), so it cannot live inside `GAME_DEFS`. A new game = one manifest line + its two data files; selection is `GAME_FILES[ctx] || GAME_FILES.FNV`. Guarded by Suite 89 (sanctioned-map) + Suite 56 (boot load-order).
- `ctx === 'FO3' ? 'directive text' : ''` tracker-directive ternaries in `getSystemDirective()` (pending GA-5 refactor)

**Why:** As the app grows to support more Fallout titles, hardcoded two-game assumptions silently break or exclude the new game. Data-driven dispatch via `GAME_DEFS` is the only pattern that scales without requiring scattered literal updates across feature code.

**Extension — the `identity` block (owner-approved, added at the Design Overhaul DO-K unit):** `GAME_DEFS[ctx].identity` is the ONE sanctioned per-game **design-data** home — material/persona/ceremony/motion/audio/cursor/voice/ambient. Every per-machine design facet is data on this block; feature code reads it, never hardcodes a per-game design literal (a chrome color, a persona string, a motion-verb texture, a cursor shape). The **FO4 entry must exist and validate** (design-only — see its `designOnly: true` flag) so the N-game abstraction is proved before FO4 actually builds. `identity.theme` is an alias to each game's existing `theme` facet, never a duplicated copy (Protocol 22) — see `js/core/state.js` and Suite 157.

**Pending protocol amendments (owner-approved batch, folding in as their units land):** alongside the DO-K `identity` extension above, the owner has approved a wider batch of protocol changes for the Design Overhaul program. **Adopted at DO-N** (see their full sections above/below): Protocol 25 (UX Stability)'s sanctioned-exception clause extended site-wide plus explicit authorization to replace the tab bar with bezel subsystem nav; **Protocol UI-7** (Device Chrome/Bezel Standard); **Protocol UI-9** (Motion-Verb Grammar — the SWEEP token; SEAT/WAKE/FAULT/BREATHE land with later units, SEAT since adopted at Ceremony Moments Wave 1 — WAKE/FAULT/BREATHE remain pending). **Adopted at DO-O** (see its own section above/below): **Protocol UI-10** (Overseer Presence — the Director Uplink reskin is its first build). **Still pending** (not yet adopted): **UI-8** (the Centering Rule as its own formal protocol — DO-N's bezel already follows the rule informally); Protocol 10 (UI Verification) amended to a per-machine × per-breakpoint render matrix (gates DO-M); and the new Design-Unit Workflow protocol. Each remaining item folds in with the unit that first depends on it — see `planning/DESIGN_OVERHAUL_BUILD_PLAN.md` §8 for the full text of each pending amendment.

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

## Protocol 40 — Keep `tests/test.html` In Sync

`tests/test.html` is the **browser-side runtime mirror** of the canonical static runner (`tests/robco-diagnostics.js`). Where the canonical runner statically analyses the source, `test.html` actually **executes** the live import contract in a real browser (`autoImportState` / `sanitizeImportedContainer`, the v8 container + boot-merge, registry validation, SPECIAL/skill clamping, status tick-down) and asserts the result. It must never be allowed to fall out of date.

**When you must update `test.html` (same commit):**

- The import/sync contract changes (`autoImportState`, `sanitizeImportedContainer`, the Tri-Node shape, normalisation rules, clamping, registry validation).
- A new state field is added (add it to the `KNOWN_KEYS` tripwire set in `test.html` and cover it — the test.html analogue of Protocol 4).
- The boot chain / load order changes (the `<script src="../js/…">` tags must match `index.html`'s boot order).
- A canonical suite is added/removed/changed in a way that affects the runtime contract.

**Rules:**

- Update the `Suites: N` count marker in the `test.html` header comment whenever you add or remove a `section('…')` suite. The gate fails if the marker drifts from the actual `section('…')` call count.
- Keep it **game-agnostic** (Protocol 38): use `getFactionRegistry()` / `getSkillKeys()` / `GAME_DEFS`, never hardcoded `FACTION_REGISTRY` / `SKILL_KEYS` literals.
- No stale/dead references (removed functions, dropped fields, old envelope versions).
- `test.html` is **not** a served/precached asset (it lives under `tests/`), so editing it never requires a `CACHE_NAME` bump (Protocol 1).

**Enforcement (self-improving — Protocol 36b):**

- `tests/test-html-check.mjs` runs `test.html` **headless in the full gate** and fails if any suite fails, if the audit throws, or if the declared `Suites: N` marker ≠ the suites actually executed.
- **Suite 96** (Node runner) statically guards that `test.html` loads the current boot chain, exercises the current entry points, stays game-agnostic, carries no dead stubs, keeps its suite-count marker honest, and that the gate still invokes the headless runner.

This is folded into Protocol 2a: `tests/test.html` is in the test-count/suite-sync table below, and the `Select-String` drift scan includes it.

---

## Protocol 41 — End-of-Task Cleanup Sweep

At the end of **every** task, sweep the project directory for leftover/junk files and remove them — **before** the final commit.

**Sweep for:**

- Stray scratch / repro / one-off scripts (e.g. `repro.*`, `_diag*`, ad-hoc harnesses).
- Temp / generated junk: `*.bak`, `*.old`, `*.tmp`, `*.orig`, `*.log`, `*.zip`, `*~`, `*.swp`/`*.swo`, OS files (`.DS_Store`, `Thumbs.db`, `desktop.ini`).
- Empty / abandoned tool directories (e.g. `.yoke/`).
- Duplicate copies, stray exports, old screenshots, dead artifacts left behind by prior tasks.

**Never touch:**

- Any **git-tracked** file (removing a tracked file is a deliberate, separately-confirmed change — not part of the junk sweep).
- The gitignored **planning docs under `planning/`** (the live build queue — `MASTER_PLAN.md`, `*_AUDIT.md`, `*_SLATE.md`, `*_DESIGN.md`, etc.). The whole `planning/` folder is ignored and must stay untouched and uncommitted.
- Tooling dirs: `.git/`, `.claude/`, `.vscode/`, `node_modules/`.

**Report:** state what was removed (or "nothing to remove") at the end of the task.

**Enforcement (self-improving — Protocol 36b):** **Suite 98** (Node runner) scans the project root and **fails the gate** if a known junk pattern reappears (junk-extension files at root, or a stray `.yoke/`-style empty tool dir). The gate only **flags** — it never auto-deletes; removal is always a deliberate step per this protocol.

---

## Protocol 42 — Fix Flaws Found During Testing/Verification (extends 36b)

A flaw, gap, or footgun discovered **while testing or verifying** — not only one found in shipped code — is treated exactly like a production defect: **fix it and add a regression test in the SAME commit.** This applies when the discovery happens while writing a test, running the gate, doing manual/browser verification, or building a test harness.

**Rules:**

- **Never work around a defect in the test harness and leave it unfixed.** If a test or harness step reveals a real defect, fix the defect first, then add a regression test that locks it.
- **Investigate before classifying.** Determine whether the issue is a real shipped-code path or only a harness artifact. State the verdict explicitly (in the commit/report).
- **Real shipped path affected → FIX** the code and add a test proving the fixed behavior.
- **Harness-only (no shipped path affected) → still add a test** that documents and locks the invariant, so the latent footgun cannot silently become a live bug later. Say "harness-only" explicitly; do not pretend it was a product bug, and do not skip the test.
- The added test goes in the Node runner (`tests/robco-diagnostics.js`) and the counts sync per Protocol 2a.

**Why:** The test suite is only as honest as its response to its own findings. Silently routing around a flaw the tests exposed defeats the gate. Every flaw the process surfaces must ratchet the net finer — the same escape-ratchet principle as Protocol 36b, extended from "escaped to production / CI" to "surfaced during development."

**Precedent:** During WU-A5 verification, a harness step hit the beforeunload-flush clobber (an unguarded `robco_v8` write + reload was overwritten by the unload flush). Investigation showed every shipped reload path is guarded (`_loadingSave`/`_contextSwitching`) — so it was **harness-only** — but the latent footgun was locked with Suite 95.8 (behavioral invariant) + 95.9 (guard-order static guard) rather than worked around.

---

## Protocol 43 — Dev-Branch Workflow / Release Gating

**Branch model.** All unreleased work — every commit and every push — goes to **`dev`**. **`main` is release-only:** it receives changes **solely** through a `dev → main` merge performed at a version release (an `APP_VERSION` bump per Protocol 2). Nothing lands on `main` except releases. Production (GitHub Pages) deploys from `main`; the private staging site (Cloudflare Pages) builds from `dev`.

**Same bar on both branches — there is no "looser" branch.** Every existing rule and protocol applies **identically on `dev`** as on `main`. `dev` is held to the same standard as `main` in every respect. In particular, on **every** `dev` commit and push:

- The **full pre-commit / pre-push gate** runs and must pass exactly as on `main`: ESLint with **zero** errors/warnings, Prettier clean, the canonical Node test runner (`tests/robco-diagnostics.js`) green (235 suites, 3381 tests), plus the push-boundary browser checks — boot-smoke, render-check, the a11y baseline-diff, and the `tests/test.html` runtime audit.
- **Protocol 1** (bump `CACHE_NAME` when a served/precached file changes) applies.
- **Protocol 2 / 2a** (docs updated + test-count and suite-count synced across every location) applies.
- **Protocol 38** (game-agnostic feature code), **39** (UTF-8 source integrity), **41** (end-of-task cleanup sweep), **42** (fix flaws found during testing/verification in the same commit), and the **Protocol 36b** escape-ratchet all apply.
- Every other protocol (13 regression test, 14 AI-contract safety, 19 batch-before-push, 20 static source-invariant guards, etc.) applies unchanged. (Protocol 15 — runner parity — is retired; see its section above.)

**Changelog discipline on `dev`.** The `CHANGELOG.md` **chronological ordering convention is explicitly followed on `dev`**: within each category heading (Added / Fixed / Changed / Improved / Under the Hood), entries are ordered **earliest-first** — the oldest change sits at the top of its category and the newest is appended at the bottom. The **`[Unreleased]`** block is maintained on `dev` in this earliest-first order throughout development. At the `dev → main` version release, the accumulated `[Unreleased]` block **consolidates into the dated release version block** (entries preserving their earliest-first order within each category), and a fresh empty `[Unreleased]` block opens for the next cycle.

**Why:** Separating "pushed" from "released" keeps unreleased work off the public production site while a private staging build stays continuously live for real-device testing. Holding `dev` to the identical gate guarantees that whatever merges to `main` at release time has already cleared the full bar — the release merge promotes already-verified work rather than triggering a re-validation crunch.

---

## Protocol 44 — Every Hard-to-Trigger Feature Ships a Diagnostic Shell Trigger

Any new **ambient, conditional, time-gated, view-once, or otherwise hard-to-reproduce** feature — a new `RobcoEvents` event, a new AmbientRuntime observer/state effect, a new boot flavor, a new ceremony/view-once MetaStore flag, a new feedback animation — must register a **Diagnostic Shell tool** (`DIAGNOSTIC_SHELL_TOOLS` entry, `js/dev/test-console.js`) that fires it on demand, **in the same commit**. The tool declares which event(s)/flag(s) it covers via its `triggers: [...]` metadata.

**Why:** these features are exactly the ones that can't be exercised by normal play in a test pass, so they silently rot. A guaranteed on-demand trigger keeps every one of them verifiable, and keeps the Diagnostic Shell a complete control surface rather than a stale subset.

**Enforcement (self-improving — Protocol 36b):** a gate suite cross-references (a) every `RobcoEvents.emit('<name>', …)` string literal in `js/*.js` and (b) the known view-once MetaStore flags (`robco_bay_opened`, `robco_last_seen_version`, `robco_booted_before`) against the union of all `triggers: [...]` arrays in `DIAGNOSTIC_SHELL_TOOLS`. A feature whose event or flag has **no** registry trigger **fails the build**. A tiny curated allowlist covers the deliberately-internal events — e.g. `runtime.state` is infra (already exercised as a side effect of the FORCE TRANSITION / WAKE → ACTIVE tools), not a standalone user-facing feature — so the guard is precise, not noisy.

**Tiering still applies (Protocol 22/34).** A trigger is not exempt from the Diagnostic Shell's own tier rules just because it exists to test something: if firing the real entry point would write campaign state (directly, or indirectly via a reactive subscriber — confirm by reading the actual subscriber body, Protocol 27, not by assuming the emit call itself is inert), the tool is `tier: 'staging'` + `destructive: true` like any other state-mutating tool, never `'prod'`. A worked example: seven `RobcoEvents` bus events have a reactive `state.js` auto-log subscriber that appends to `state.eventLog` on every fire — their triggers are `tier: 'staging'`, not `'prod'`, even though most bus-event triggers are safely non-destructive.

---

## Protocol 45 — Documentation Reference Integrity (the enforcement arm of Protocol 2/2a)

Protocol 2/2a already require the docs to stay current — but they are **honor-system** rules, and the docs drifted anyway (the cloud push/pull globals `pushToCloud` / `pullFromCloud` were documented for months but never existed under those names; the script load-order list silently omitted `idb.js` / `ocr.js` / `runtime.js` / `test-console.js`). Per the escape-ratchet (Protocol 36b), a class of defect that escapes every layer gets a **gate guard** at the layer it escaped from. Doc drift escaped every layer, so it gets one. **Suite 220** (Node runner) **fails the build** when a load-bearing doc names code that does not exist.

**What it checks (deliberately NARROW — precision over recall):**

1. **`window.<name>` references** in `CLAUDE.md` / `ARCHITECTURE.md` / `README.md` → `<name>` must appear in some `js/*.js` file or `index.html`. Catches documented-but-removed globals.
2. **Explicit repo file paths** (`js/…`, `css/…`, `tests/…`, `scripts/…`, single-segment `name.ext`) → the file must exist on disk. A negative lookbehind rejects a path whose leading directory is really a file-extension tail (so a slash-joined prose list of several chained `.js` filenames never yields a phantom path); nested (`js/vendor/…`) and multi-dot filenames are intentionally out of scope to stay false-positive-free.
3. **The load-order list** inside the `<!-- LOAD-ORDER-GUARD:BEGIN … END -->` markers in `CLAUDE.md` and `ARCHITECTURE.md` → the numbered `js/….js` items (the subject before each `→`) must equal the **real boot order derived mechanically from `index.html`**: `idb.js` (first static tag) + the `GAME_FILES` manifest + the remaining static `<script>` tags, with per-game `db_*` / `reg_*` pairs normalized to one slot.
4. **Every `library/<file>` pointer** in `CLAUDE.md` / `ARCHITECTURE.md` / `README.md` → `<file>` must appear in the committed `library/MANIFEST.txt` (2.8.5 U-B2, Protocol 46 — see below for why this can't just be `fs.existsSync`).

**Allowlists (small, explicit, commented WHY):** a doc that _correctly_ names something that must NOT exist is not drift. The window/path allowlists cover exactly that — platform globals (`window.innerWidth`, `window.location`, …) and the guarded MUST-NOT-EXIST file `js/ui.js` (retired in the ui-\* split, guarded by Suite 56). Keep these lists tiny; every entry needs a one-line reason.

**Scope decision — `library/BRAIN_DUMP.md` is NOT scanned for PROSE content.** It is gitignored (absent on a clean CI checkout, so the guard would have nothing to read there — and CI is the environment that matters most), and its own "Known documentation drift" ledger deliberately quotes retired/wrong names to warn sessions off them — scanning its prose would false-positive on its most valuable section. It stays governed by its own maintenance rule instead. (Its existence *as a pointer target* — the fact that `CLAUDE.md` names `library/BRAIN_DUMP.md` — IS checked, via check 4 above / Protocol 46.)

**Ratchet intent:** start narrow and earn trust; tighten later. A greedy scanner that flags ordinary prose is worse than no scanner — it gets ignored, then weakened, then it is dead. Only add a new reference form (e.g. backticked architecture entry-point names) once it can be extracted with **zero false positives**; until then, leave it out and say so. It does **not** replace the honor-system Protocol 2/2a rules — those still stand; this guard just catches the class of drift they could not.

---

## Protocol 46 — Keep the Code Map + Pointer Index Current (the enforcement arm of the library model)

The Reference Pointer Index and `library/CODE_MAP.md` only stay trustworthy if they track the code — the same honor-system risk Protocol 45 catches for `window.*`/file-path/load-order drift. **When a file is split, added, moved, or removed, or a major function relocates, update `library/CODE_MAP.md` and this file's Reference Pointer Index in the SAME commit.** These are high-trust surfaces — a session navigates by them instead of reading whole files — so letting them drift silently is strictly worse than not having them: a session would trust a stale map with no signal that it's wrong. An honor-system "keep it current" rule drifted once already (the `pushToCloud`/`pullFromCloud` incident), so the class of defect gets a Suite 220 gate guard.

**The gitignored-`library/` problem:** `library/` is gitignored (local-only Claude reference docs), so on a clean CI checkout `library/CODE_MAP.md` and `library/BRAIN_DUMP.md` simply don't exist. A guard that does `fs.existsSync('library/CODE_MAP.md')` would either fail every CI run forever (if it requires existence) or never run at all (if skipped whenever the directory is absent) — the latter is a guard that can never fail, which is worse than no guard because it creates false confidence.

**The fix — `library/MANIFEST.txt`:** a small filename-only list, **committed** as the one sanctioned exception to the `library/` gitignore (`library/*` + `!library/MANIFEST.txt`). Suite 220 uses it two ways: **220.7** (real on CI and locally, because the manifest is committed) — every `library/<file>` pointer named in `CLAUDE.md` / `ARCHITECTURE.md` / `README.md` must appear in the manifest, catching a pointer whose file was never manifested; **220.8** (local-only, a no-op on a clean CI checkout) — the manifest must exactly match `library/`'s real contents, the only check that can catch the manifest itself going stale. Neither can catch *content* staleness inside a doc — only that the *filename* a pointer names is real and manifested. See Suite 220 tests 220.7/220.8 for the full CI-vs-local reasoning.

**How to apply:** whenever `library/` gains or loses a file, update `library/MANIFEST.txt` in the same commit (add/remove one line). Whenever `CLAUDE.md`'s pointer index gains a row naming a new `library/<file>`, that file must already be in the manifest — order matters: manifest first, pointer second, or 220.7 fails the build.

---

## Protocol UI-1 — Panel Heading Standard

Every `<details class="panel">` in `index.html` must have `<summary><h2>> HEADING</h2></summary>` — the `>` glyph is mandatory. Sub-panels (`class="sub-panel"`) use `<summary><h3>> HEADING</h3>` instead. Never put prose or config summaries directly in a `.panel` summary without an `h2`.

**Clarification (added at the Module Bay unit, WU-B2a):** when a panel's contents are organized into internal boards/sections (e.g. the Module Bay's SLOT sub-panels inside SECURITY & CONFIGURATION), those internal headings use the sub-panel `<h3>> HEADING</h3>` convention — the panel's own `<h2>` summary is unchanged and stays the only `h2` in the panel.

---

## Protocol UI-2 — Sub-Panel Persistence

Every `<details class="sub-panel">` must have a unique `data-sub-id` attribute. The boot wiring in `ui-core.js` reads `robco_panel_state` from localStorage and sets open/closed state for all `details[data-sub-id]` elements. Dynamically-rendered sub-panels (e.g. those inside `container.innerHTML = ...`) must wire their own `toggle` listeners immediately after the innerHTML assignment.

---

## Protocol UI-3 — Tracker Row Pattern

Tracker lists (collectibles, Lincoln items, traits, skill books, magazines) must use:
- `<div class="tracker-row">` for each item row (not inline `font-size`/`letter-spacing` style)
- `<button class="tracker-toggle tracker-toggle--active|--inactive">` for the toggle element (not `<span onclick>`)
- `aria-label` on every toggle button — literal and descriptive (e.g. `"Mark Vault 34 Snow Globe acquired"`), never diegetic
- `<span class="tracker-meta">` for secondary metadata (location hints, skill labels, effects)

---

## Protocol UI-4 — Badge Format

Panel badges show a plain count for most panels. Skill books and skill magazines show `[n/total]` format (e.g. `3/13`). The `_updatePanelBadges()` function in `ui-core.js` is the single source for this.

---

## Protocol UI-5 — Button vs Span for Interactive Elements

Every interactive element that the user can click to change state must be a `<button>`, not a `<span onclick>`. Reasons: keyboard operability (Tab + Enter/Space), native focus styles, screen-reader role announcement. Styling exceptions use `button.tracker-toggle`, `button.faction-btn`, `button.delete-btn`, `button.btn-sm`, etc. — all defined in `terminal.css` with explicit `width: auto` to override the global `button { width: 100% }`.

---

## Protocol UI-6 — Everything Remembers on Reload (owner directive, added at the Module Bay B2b unit)

Any new user-facing **view, mode, or display-choice control** — not just settings toggles — must persist across reloads as a registered `MetaStore` device preference (Protocol 4/23), the same way an audio mute or an optics pick already does. This extends beyond boolean/value settings to include things like which of two equivalent VIEWS a panel is currently showing (e.g. the Module Bay's hardware view vs. its Schematic View fallback), a selected tab, or any other "which mode am I looking at" choice that has no natural campaign-state home.

**How to apply:** register the key in `META_MANIFEST` with a sensible default (Protocol 4), read it once at boot to restore the choice, and write it at the exact moment the user changes it — mirroring the pattern already established for `robco_active_tab` and, as of B2b, `robco_bay_view`. Never let two equivalent DOM states (e.g. two projections of the same underlying prefs) drift out of sync with each other or with the stored choice — route both the boot-restore path and the user-action path through one shared apply function (Protocol 22) so they can't diverge.

**Why:** A control the user deliberately picked — including which VIEW they were looking at, not just which OPTION they chose within it — silently resetting on every reload is a rough edge users will report every time; treating "remembers on reload" as a default expectation for new UI, rather than an opt-in nicety, keeps that class of report from recurring.

---

## Protocol UI-7 — Device Chrome / Bezel Standard (adopted at the Design Overhaul DO-N unit)

The device bezel/casing is **CSS chrome layered around the working app shell — never a new shell.** The PWA-intact guardrail is absolute: installable / offline / standalone / service-worker must all keep working through every chrome commit. Desktop lays the casing out where space allows (a desk-terminal control strip under the glass); mobile gets a disciplined, non-intrusive edge treatment. Screen curvature/vignette live on the **frame layer only** and must never transform or distort text. Every hardware control the bezel exposes (keycaps, lamps, dials) obeys the centering rule (nothing off-center in an incomplete row) and the Protocol 17 mobile baseline (≥28px tap targets, ≥16px inputs).

**Per-game flavor is data, not code (Protocol 38):** casing material/color and cursor read `GAME_DEFS[ctx].identity` (DO-K) via `[data-game]` CSS attribute selectors — e.g. a `--bezel-wire` custom property that defaults to the local phosphor color and is overridden per game (NV's amber "the wire" split). Flavor **text** (a serial-plate line, a casing subtitle) is swapped the same way — two static spans toggled by `[data-game]` — never a JS `ctx === …` branch. A game with no authored flavor yet gets the generic fallback, never a misattributed borrow of another game's fiction.

**Why:** DO-N (the tab-bar → bezel-nav replacement) is the first unit to build real device chrome; this protocol is what every later per-game machine (DO-M, DO-G) and every future chrome surface is held to, so the PWA-intact guardrail and the frame-only-curvature rule are never re-litigated per unit.

---

## Protocol UI-9 — Motion-Verb Grammar (adopted at the Design Overhaul DO-N unit, SWEEP token; SEAT adopted at the Ceremony Moments Wave 1 unit)

Interactions that change what's on screen speak a shared, named motion vocabulary rather than an anonymous CSS transition. **SWEEP** (introduced at DO-N) is a phosphor smear across the glass on a subsystem-nav change — "re-tuning a channel," not an abstract route swap. **SEAT** (introduced at Ceremony Moments Wave 1, M5) is a 220ms settle — filter/box-shadow brighten-then-fade, deliberately never `transform` — for any "component physically installs" interaction (Module Bay board reseat, phosphor tube pick, program cartridge seat, Tool Deck grip). Every motion-verb keyframe must be a plain `animation:` declaration (never `transition:` alone) so the existing global `prefers-reduced-motion` block (which zeroes `animation-duration`/`iteration-count` on `*`) neutralizes it to an instant resting frame automatically — no bespoke reduced-motion carve-out per verb. Legibility is never sacrificed to motion (SWEEP is a translucent overlay layer, never a transform on the text itself; SEAT never touches `transform` for the same reason — several of its targets, e.g. the program-cartridge stack peek and the Tool Deck's own slide-in, already own `transform` for their own purposes, and a competing `transform` animation would visibly fight them for the animation's duration since CSS `animation` is a single property per element).

**How to apply:** name the verb, implement it as a `@keyframes` + a toggled class (e.g. `.glass-frame.sweep`, `.seat`), and trigger it by adding-then-removing the class (force a reflow between, so repeated triggers restart cleanly) — see `_bezelSweep()` / `_motionSeat(el)` in `ui-core.js`. Per-game texture (`identity.motionTexture.<verb>`, DO-K) is a CSS-only `[data-game]` selector variant on the verb's keyframes — never a JS branch (Protocol 38); see `[data-game='FO3'] .seat` in `terminal.css` for the pattern.

**Why:** codifying the vocabulary now (rather than inventing a bespoke transition per unit) is what lets later units (WAKE/FAULT/BREATHE remain pending, per the Design Overhaul build plan) compose instead of drifting into inconsistent, per-surface motion language; the reduced-motion-for-free property (any verb built as a plain animation is automatically caught by the existing global block) is the load-bearing accessibility guarantee this protocol exists to lock in.

---

## Protocol UI-10 — Overseer Presence (adopted at the Design Overhaul DO-O unit)

Any AI/Director-facing presence surface is a **reskin over the existing chat pipeline, never a fork** (Protocol 22) — a decorative layer (canvas, status strip, header) whose visual state is driven by named states hooked to the **real** request lifecycle (a "thinking" state at the actual network-request window, a "speaking" state for the actual reply delivery, a resting state computed from the actual key/feature-flag/connectivity signals), not a demo timer or an independent animation loop. The presence is **game-agnostic by construction** (Protocol 38): every flavor string (panel title, relay/callsign, status wording, per-state tags) is read from `GAME_DEFS[ctx].identity`'s per-machine block via `getIdentity()`, with a literal generic fallback object for a game that hasn't authored its own — never another game's borrowed fiction — and colour rides the existing `--bezel-wire` `[data-game]` token rather than a JS colour branch.

**Reset ordering is deterministic, never a blind timer-based reset:** when a request-lifecycle hook (e.g. a `finally` block) and an async completion callback (e.g. a typewriter) can BOTH plausibly own the transition back to resting, the lifecycle hook must check the presence's OWN current state before resetting it, and only reset from the state it is actually responsible for (e.g. "thinking") — never overwrite a state a longer-running async step already advanced to (e.g. "speaking"), since the hook's own `finally`/completion frequently runs before that async step has finished.

**Animation gating stacks, degrading to one static frame:** reduced-motion, the Immersion dial (below "balanced"), the Ambient Runtime's power-down states (STANDBY/SHUTDOWN/OFF), and `document.hidden` (tab-hidden) each independently suppress the continuous animation loop — every state CHANGE still paints one correct static frame immediately, so a user under any of these conditions always sees the right resting/thinking/speaking frame, just never an animating one. No bespoke reduced-motion carve-out — a single `_scopeShouldAnimate()`-style gate function is the one place all four conditions are checked, re-evaluated live every frame/on every relevant event.

**Mobile gets a self-contained view, never a permanently-scrolling column:** if the presence's column has no natural tab-gated visibility on mobile (an "always visible" panel that would otherwise render at full length below every other subsystem), it becomes a bounded, internally-scrolling view shown only when its own subsystem is active, with a compact non-`position:fixed` strip shown on every other subsystem so the presence is one tap away and never fully disappears.

**Zero campaign-state write:** the presence's visual state is transient/in-memory (or a MetaStore device pref at most) — never `state.<field>`, `saveState()`, or `robco_v8`. Any device-template "ambient" content the presence emits into the surrounding chat/log (idle flavor lines, etc.) renders without being persisted to that log's saved history.

**Why:** DO-O (the Comm-Link → Director Uplink reskin) is the first unit to build a living AI-presence surface; codifying the standard now — real-lifecycle-driven, game-agnostic, deterministic-reset, gate-stacked-to-one-frame, mobile-self-contained, zero-write — is what keeps a future presence surface (a companion, a terminal familiar, a second AI channel) from re-deriving these rules from scratch or drifting into an independent, un-gated animation loop.

---

## Prohibited Patterns

| Never Do                                                    | Why                                                                                                                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `clients.claim()` in the service worker                     | Causes reload loops and black screens                                                                                                                                                                  |
| `self.skipWaiting()` inside the SW `install` handler        | Activates the new SW immediately so it never enters the waiting state — `reg.waiting` is null, the update prompt's `SKIP_WAITING` message goes nowhere, and clients silently never update (the r6 bug) |
| `innerHTML +=` inside loops                                 | O(n²) DOM re-parsing. Use `map().join('')` with single assignment                                                                                                                                      |
| Untrusted text directly as `innerHTML`                      | XSS risk. Always run through `escapeHtml()` first                                                                                                                                                      |
| `localStorage.getItem()` in audio hot paths                 | Read from the `AudioSettings` cache object instead                                                                                                                                                     |
| Recursive key transformation on AI JSON responses           | Use explicit field mapping in `autoImportState()`                                                                                                                                                      |
| Silent drops of inventory during token triage               | Inventory must always be returned when relevant keywords match                                                                                                                                         |
| Auto-push to cloud on stat changes                          | Cloud sync is manual button only                                                                                                                                                                       |
| Leave stale test counts in docs after adding/removing tests | Protocol 2a requires all counts updated in the same commit                                                                                                                                             |
| `linkWithRedirect` / `signInWithRedirect` on this project   | GitHub Pages can't host the redirect handler; mobile blocks the cross-origin iframe fallback (storage partitioning) → `getRedirectResult` returns `null`, sign-in silently fails. Full mechanism → **Protocol 30** |
| Unconditional `signInAnonymously` on boot                   | For a Google-linked user, an unguarded call mints a fresh anonymous user and wipes the session on every reload (the 5c-ii clobber bug) — gate on `auth.authStateReady()` + `!auth.currentUser`. Full rule → **Protocol 31** |
| Writing a non-ASCII file via PowerShell (`Set-Content` / `Out-File` / string + `Set-Content`) | Silently double-encodes every non-ASCII char (`—`→`â€"`, `▲`→`â–²`, `⚠`→`âš `) — use the Edit tool or Node `fs.writeFileSync(path, content, 'utf8')`. Full incident + Suite 90 guard → **Protocol 39** |

---

## Architecture Quick Reference

**Script load order** (global scope, not modules — the ACTUAL order from `index.html`; the numbered `js/…` filenames and their order below are machine-checked against `index.html` by Suite 220 / Protocol 45). Full per-file detail (every function → its file) lives in `library/CODE_MAP.md` (derived from source, Protocol 46); the labels below are a scannable index only:

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

**AI contract:** Tri-Node JSON schema (`narrative`, `state`, `modal`). The AI is locked to `responseMimeType: 'application/json'`. It cannot produce freeform text.

**State persistence:** `localStorage` key `robco_v8`. Debounced 500ms writes with dirty-check. Flushed immediately on `beforeunload`.

**Test suite:** 3381 tests across 235 suites in the single canonical Node runner `tests/robco-diagnostics.js`, run by the pre-commit hook (via `npm run gate:fast`) and CI. (The former PowerShell mirror `tests/robco-diagnostics.ps1` was deleted in 2.8.5 U-B3 and Protocol 15 — runner parity — retired; the mirror caught nothing the Node runner cannot, at ~13× the cost.) Full per-suite catalog — every suite's coverage, every work-unit's build narration — lives in `library/TEST_CATALOG.md` (gitignored, local-only, read on demand; see the Reference Pointer Index above and the 3-class library maintenance model there).
