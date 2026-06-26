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
git commit          # Pre-commit hook: cache-bump guard runs first, then 253 tests
git push origin main  # CACHE_NAME must already be bumped (Protocol 1)
```

- **253 tests must pass.** If fewer pass, something is broken. Investigate before committing.
- **Bump `CACHE_NAME` before every push.** No push may ship without a new cache rev (Protocol 1) — this is a hard gate, not just for UI/JS changes.
- **Cache-bump guard runs at commit time** — the hook compares the staged `CACHE_NAME` against `origin/main` and blocks if they match. A missed bump fails the commit before the test suite even runs.
- **Never use `--no-verify`** unless the user explicitly authorizes it for a stated emergency.

---

## Protocol 1 — Service Worker Cache Bump

Bump `CACHE_NAME` in `sw.js` before **every `git push`** — full stop. Every push must ship a new `CACHE_NAME` so every client is forced to update, regardless of what changed (this includes doc-only, config-only, and test-only pushes).

**Format:** `'robco-terminal-v{APP_VERSION}-r{N}'`

- `N` starts at 1 for each new `APP_VERSION`.
- Increment `N` on **every push**. No exceptions.

**Why:** The SW is cache-first. Without a new `CACHE_NAME`, cached users silently run the old build and never see the "REBOOT TERMINAL" update prompt. Bumping on every push guarantees the prompt fires for all clients on every release.

**Automated guard:** This requirement is now enforced by the pre-commit hook. Before the 253-test suite runs, the hook compares the staged `CACHE_NAME` against `origin/main:sw.js` and fails the commit immediately if they match. A missed bump is impossible to commit, not just discouraged.

---

## Protocol 2 — Documentation Updates

After every meaningful commit, update these files **in the same commit:**

| File              | What to update                                         |
| ----------------- | ------------------------------------------------------ |
| `ARCHITECTURE.md` | Version header, any new/changed architecture sections  |
| `CHANGELOG.md`    | Add entries under the current version block            |
| `README.md`       | Current State section, feature tables, project history |

**Version bumps:** Every user-visible change updates `APP_VERSION`, `CACHE_NAME`, and `CHANGELOG` together as one unit. `APP_VERSION` follows semver automatically — PATCH (x.y.Z) for bug/UI/internal fixes, MINOR (x.Y.0) for new user-facing features or panels — no need to ask. MAJOR (X.0.0) bumps (rewrites or breaking changes) still require explicit user confirmation. This replaces the old "always ask before bumping `APP_VERSION`" rule.

### Protocol 2a — Test Count Sync

Whenever tests are **added or removed**, update the hardcoded count in **every** location below in the **same commit** as the test change. No deferred updates.

| File                          | Location to update                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RULES.md`                    | Pre-commit gate code block · Pre-commit gate note · Protocol 4 checklist · Protocol 5 checklist · Architecture Quick Reference (count + suite count if suites changed) |
| `CLAUDE.md`                   | Same locations as `RULES.md` — the files are kept identical for protocol sections                                                                                      |
| `README.md`                   | Technology stack table · File structure comment · Commit workflow block · Current State bullet                                                                         |
| `ARCHITECTURE.md`             | Pre-commit checklist (`all N+ tests`)                                                                                                                                  |
| `CHANGELOG.md`                | Header comment (`Tests: N/N`)                                                                                                                                          |
| `tests/check-persistence.js`  | Per-suite `// N tests` comments at the top of each suite block                                                                                                         |
| `tests/check-persistence.ps1` | Per-suite `# N tests` comments at the top of each suite block                                                                                                          |

**How to find all stale counts before committing:**

```powershell
Select-String -Path "RULES.md","CLAUDE.md","README.md","ARCHITECTURE.md","CHANGELOG.md","tests/check-persistence.js","tests/check-persistence.ps1" -Pattern "\d+ tests?" | Select-Object Filename,LineNumber,Line
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
- [ ] Run `git commit` — 253 tests must pass
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
- [ ] Lint, format, commit (253 tests) → Protocol 2

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

## Protocol 8 — Dispatch Multi-Model Workflow

Non-trivial work run via Dispatch uses a three-stage model hand-off. Dispatch auto-selects the model per stage; the sessions work hand-in-hand, never in isolation.

1. **Opus — Diagnose & Plan.** Opus investigates the actual code and git history, identifies the root cause, and writes a concrete plan: exact files, selectors, and line numbers; the change and its rationale; desktop/regression safety; and explicit verification steps. No edits in this stage.

2. **Sonnet — Review & Implement.** Sonnet first critically reviews the Opus plan against the current files (line numbers drift, selectors go stale, diagnoses can be wrong) and corrects any discrepancy. Then it implements, runs the full pre-commit gate (lint, format, Protocol 1 cache bump, 209-test gate, Protocol 2/2a docs), and verifies the user-facing result by actually rendering/exercising it at the real target (e.g. a 360/412px mobile viewport) — never from headless width measurements alone.

3. **Opus — Audit before done.** Opus independently reviews the actual committed diff and the verification evidence against the original root cause: is the issue fully resolved, nothing regressed, and is the change actually live on the deployed branch (origin/main) and site — not just a local/worktree commit? If anything falls short, loop back to stage 2. The task is "done" only after this audit passes.

**Adaptive escalation — Dispatch judges per situation.** The three stages are the default, not a rigid track. Dispatch selects and switches the model based on how the work is actually going, and loops are expected. Escalate to Opus whenever depth is needed: Sonnet's plan review finds the diagnosis wrong or incomplete, an audit surfaces problems, a fix fails verification or regresses, the root cause is ambiguous, or the change is high-risk. Use Sonnet for straightforward implementation and routine changes. A failed audit, or a review that finds real problems, sends the work back to Opus for deeper analysis rather than having Sonnet grind on the same wrong path. Plan → implement → audit may cycle until the audit passes.

**Plan audit before implementation (audit the audit).** In stage 1, Opus reads every file the change can touch, and the plan must explicitly enumerate every entry path, state, and edge case the change can encounter — for lifecycle/UI changes that means each load / reload / cache-clear path, each saved-state value, each tab/panel visibility state, desktop vs mobile, and brand-new vs migrated state — and state the intended behavior for each. Opus then audits its own plan against that enumeration and may not hand off until every case is covered. Plans that fix one path and silently miss another are exactly the failure this stage exists to prevent.

**Spec lock — no mid-run changes.** Lock the full specification before a Dispatch session starts. Do not send new requirements or tweaks to a session that is already running — it may commit and push before incorporating them, producing partial or inconsistent results that need cleanup passes. If the spec must change, wait until the session is idle and issue one complete follow-up; never stack instructions onto an in-flight push.

**Why:** Opus reasons deeper at higher cost; Sonnet implements efficiently at lower cost. The review stage catches plan drift before it lands; the audit stage catches incomplete fixes and false "verified" passes (which previously caused repeated "still broken" cycles) before they reach the user.

---

## Protocol 9 — Dispatch Reporting

When work is run via Dispatch, never finish a task or complete a git push silently. After every completed task AND after every git push, report back to the user on Dispatch in plain English: what was done and why, the commit reference and what it changed, confirmation that the push landed on origin/main (and whether a reload / "Reboot Terminal" update is needed to see it), and anything the user should check. Keep it readable for a non-developer — same plain-English style as the changelog. Every time, no exceptions.

Because the Dispatch user typically cannot view the code or repo directly, any push that changes user-facing behavior must be reported with an explicit "it's live — here's what changed and exactly how to test it" message (live confirmation plus step-by-step test instructions), not just a commit summary.

Dispatch reports must be formatted for mobile reading: lead with a one-line summary of what changed, keep it short and scannable (no walls of text, no code dumps or file paths), clearly state what was updated, and give the exact steps to test it. Optimize for a phone screen.

---

## Protocol 10 — UI Verification

Any change touching `index.html`, `css/`, or render JS (`ui.js` `render*` functions) must be verified by actually **rendering** the affected UI at **360px, 412px, and ≥1000px (desktop)** before it is considered done — never from headless width measurements alone. Confirm no horizontal page overflow (`document.documentElement.scrollWidth === window.innerWidth`), the component looks correct, and desktop is unchanged.

The definitive verification step is `tests/render-check.mjs` — a Playwright render-check that loads the page at 360px and 412px and asserts no horizontal overflow and no focus-zoom. Run it outside the 209/243 test gate whenever map or mobile layout changes land. It is the only check that catches real pixel/overflow regressions.

---

## Protocol 11 — Deploy Verification

After any push that affects the live site, confirm the change actually reached `origin/main` AND is served by GitHub Pages (account for CDN + service-worker caching), then tell the user the exact step to see it (reload + tap "Reboot Terminal"). Never report a UI change as live without this check.

---

## Protocol 12 — No Concurrent Pushes

Never run two sessions that commit/push this repo at the same time — sequence them to avoid branch/worktree collisions. Combined with the Protocol 8 audit gate, only one change lands at a time.

---

## Protocol 13 — Regression Test Required

When a bug is fixed, add a test (in the same commit, or the immediately following one) that would have caught it, and re-sync the count per Protocol 2a in both runners. No bug fix ships without a guarding test where feasible.

---

## Protocol 14 — AI Contract Safety

When changing `getSystemDirective()`'s schema or the Tri-Node JSON response shape (`narrative`/`state`/`modal`), add or update a test in the **same commit** that validates the schema and the `autoImportState()` round-trip. The app is locked to JSON AI responses (`responseMimeType: 'application/json'`); a silent schema break is catastrophic and must be guarded by a test.

---

## Protocol 15 — Test-Runner Parity

`tests/check-persistence.js` (Node) and `tests/check-persistence.ps1` (PowerShell) must stay at identical coverage and count. Change one → update the other in the **same commit**, and verify both report the same count and pass. (This is what drifted into the 173-vs-209 gap.)

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

---

## Protocol 22 — Extend Before Creating

Before introducing any new manager, service, renderer, helper, component, or state object, search the repo for equivalent functionality and extend it where reasonable. Do not create parallel implementations (e.g. `renderXNew()`, `StateV2`, a second save manager). Duplicate systems are architectural regressions.

---

## Protocol 23 — Architectural Boundaries

Respect the established layering (script load order: database → state → registry → ui → api → cloud). Rendering only renders; `state.js` owns state; `registry.js` is read-only and never touches state; `api.js` handles AI + import; `cloud.js` handles sync. Systems communicate only through established functions/interfaces — render code must not write saves, registry must not mutate state, etc.

---

## Protocol 24 — AI Determinism

The AI is never the sole source of truth for durable application state. All AI output must be validated and explicitly field-mapped (via `autoImportState`'s explicit mapping, never recursive key transforms) before it is persisted. If the AI fails or returns malformed data, the app must remain fully usable offline. Never let AI responses overwrite state without validation.

---

## Protocol 25 — UX Stability

Existing user workflows must not change unless the requested feature requires it. Improve the current experience before replacing it; preserve user muscle memory. Do not redesign or relocate working UI unprompted.

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
| Implement or discuss features #44 or #45                    | Permanently excluded by owner                                                                                                                                                                          |
| Leave stale test counts in docs after adding/removing tests | Protocol 2a requires all counts updated in the same commit                                                                                                                                             |

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

**Test suite:** 253 tests across 23 suites, mirrored in `tests/check-persistence.ps1` (PowerShell, run by the pre-commit hook) and `tests/check-persistence.js` (Node) — both runners are kept at exact parity (same suites, same per-suite counts, same 253 total). Covers parser sanity, autoImportState coverage, faction registry, skill keys, save envelope, file upload, cloud sync, backward compatibility, registry structural integrity, reputation 2D matrix, C2 CRUD function existence, C3 CAMPG tab DOM binding, C4 Protocol 4 campaignMode (binary) + separation, render contracts, CSS invariants, SW invariants, structural integrity (Protocol 20 static guards), and detail-current dedup guard (Protocol 27). **When you change one runner, update the other in the same commit** — drift here is what let the PS runner silently fall to 173.
