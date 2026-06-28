# RobCo U.O.S. — Agent Rules

> Every rule here was formalized from a real bug or established by the project owner.
> Follow this document first, `ARCHITECTURE.md` second.

---

## Pre-Commit / Pre-Push Gate

```powershell
# → Bump CACHE_NAME in sw.js if this commit touches a served/precached file (Protocol 1)
npm run lint        # ESLint — zero new errors
npm run format      # Prettier — all files clean
git add -A
git commit          # Pre-commit hook: cache-bump guard runs first, then fast gate (981 tests via gate:fast)
git push origin main  # CACHE_NAME must already be bumped (Protocol 1)
```

- **981 tests must pass.** If fewer pass, something is broken. Investigate before committing.
- **Bump `CACHE_NAME` when served files change.** Required when any staged file matches the served/precached set (`index.html`, `sw.js`, `manifest.json`, icons, `css/`, `js/`). Doc-, config-, and test-only commits skip the check entirely.
- **Cache-bump guard runs at commit time** — the hook first detects whether any staged file is in the served/precached set. If so, it requires a strict monotonic increase in `CACHE_NAME`. Non-served commits (doc-only, CI, tests) bypass the cache check entirely.
- **Never use `--no-verify`** unless the user explicitly authorizes it for a stated emergency.

---

## Protocol 1 — Service Worker Cache Bump

Bump `CACHE_NAME` in `sw.js` when a commit or push changes any file that is **served to or pre-cached by users**: `index.html`, `sw.js`, `manifest.json`, `icon.png` (or any icon file), or anything under `css/` or `js/`. Doc-only, config-only (`.github/`, `scripts/`), and test-only commits do **not** require a bump.

**Format:** `'robco-terminal-v{APP_VERSION}-r{N}'`

- `N` starts at 1 for each new `APP_VERSION`.
- Increment `N` whenever a **served-file commit** is pushed.

**Why:** The SW is cache-first. Without a new `CACHE_NAME`, cached users silently run the old build and never see the "REBOOT TERMINAL" update prompt. Bumping only when served files change keeps the signal meaningful and avoids spurious update prompts on doc-only or CI-only pushes.

**Automated guard:** The pre-commit hook first checks whether any staged file matches the served/precached set (`index.html`, `sw.js`, `manifest.json`, icons, `css/`, `js/`). If matched, it requires a strict monotonic increase in the `-rN` revision number when `APP_VERSION` is unchanged — equal or lower revs are blocked. Non-served commits (doc-only, CI, tests) skip the cache check entirely. When `APP_VERSION` changes, the revision can reset.

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

### Protocol 2a — Test Count Sync

Whenever tests are **added or removed**, update the hardcoded count in **every** location below in the **same commit** as the test change. No deferred updates.

| File                          | Location to update                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RULES.md`                    | Pre-commit gate code block · Pre-commit gate note · Protocol 4 checklist · Protocol 5 checklist · Architecture Quick Reference (count + suite count if suites changed) |
| `CLAUDE.md`                   | Same locations as `RULES.md` — the files are kept identical for protocol sections                                                                                      |
| `README.md`                   | Technology stack table · File structure comment · Commit workflow block · Current State bullet                                                                         |
| `ARCHITECTURE.md`             | Pre-commit checklist (`all N+ tests`)                                                                                                                                  |
| `CHANGELOG.md`                | **Current Unreleased section header only** (`## [v2.5.0] — Unreleased<!-- Tests: N/N \| Cache: ... -->`). Released version entries (e.g. `v2.0.1`) are frozen at their release-day values — never update them retroactively. |
| `tests/check-persistence.js`  | Per-suite `// N tests` comments at the top of each suite block                                                                                                         |
| `tests/check-persistence.ps1` | Per-suite `# N tests` comments at the top of each suite block                                                                                                          |

**How to find all stale counts before committing:**

```powershell
Select-String -Path "RULES.md","CLAUDE.md","README.md","ARCHITECTURE.md","CHANGELOG.md","tests/check-persistence.js","tests/check-persistence.ps1" -Pattern "\d+[- ]tests?" | Select-Object Filename,LineNumber,Line
```

Run this after every test addition or removal. Every hit must show the new count **except** the frozen released-version entry in `CHANGELOG.md` (e.g. `v2.0.1` shows its release-day count of 258 — that is intentional and correct).

**Changelog versioning model:** Per-push test-count and cache-rev updates go on the current `## [v2.5.0] — Unreleased` section header, **never** on a released version's entry (e.g. `v2.0.1`). Released entries are frozen at the values that were true at their release and must not be modified retroactively.

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
- [ ] Update `getSystemDirective()` schema in `api.js` (if AI should return it)
- [ ] Add `render*()` in `ui.js` + call from `loadUI()` (if it needs a UI panel)
- [ ] Add `<details class="panel">` block in `index.html` (if it needs a panel)
- [ ] Bump `CACHE_NAME` in `sw.js` → Protocol 1
- [ ] Run `npm run lint` and `npm run format`
- [ ] Run `git commit` — 981 tests must pass
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
- [ ] Lint, format, commit (981 tests) → Protocol 2

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

2. **Sonnet — Review & Implement.** Sonnet first critically reviews the Opus plan against the current files (line numbers drift, selectors go stale, diagnoses can be wrong) and corrects any discrepancy. Then it implements, runs the full pre-commit gate (lint, format, Protocol 1 cache bump, 981-test gate, Protocol 2/2a docs), and verifies the user-facing result by actually rendering/exercising it at the real target (e.g. a 360/412px mobile viewport) — never from headless width measurements alone.

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

The definitive verification step is `tests/render-check.mjs` — a Playwright render-check that loads the page at 360px and 412px and asserts no horizontal overflow and no focus-zoom. Run it outside the 981-test pre-commit gate whenever map or mobile layout changes land. It is the only check that catches real pixel/overflow regressions.

---

## Protocol 11 — Deploy Verification

After any push that affects the live site, confirm the change actually reached `origin/main` AND is served by GitHub Pages (account for CDN + service-worker caching), then tell the user the exact step to see it (reload + tap "Reboot Terminal"). Never report a UI change as live without this check.

---

## Protocol 12 — No Concurrent Pushes

Never run two sessions that commit/push this repo at the same time — sequence them to avoid branch/worktree collisions. Combined with the Protocol 8 audit gate, only one change lands at a time.

---

## Protocol 13 — Regression Test Required

When a bug is fixed, add a regression test in the **same commit** that would have caught it, and re-sync the count per Protocol 2a in both runners. **No bug fix ships without a guarding test — this is mandatory.** The only permitted exemption is when the bug genuinely cannot be reproduced in the test sandbox (e.g. requires a live network, real browser API, or hardware-specific behavior); in that case the commit message must explicitly state the reason.

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

## Protocol 29 — Auth Changes Require Real-Device Mobile Verification

Any change to authentication or sign-in flow is not "done" until it has been verified on a **real mobile device** — in both a normal browser tab and the installed PWA (add-to-home-screen standalone mode). Emulators and desktop DevTools responsive modes are not sufficient.

**Why:** The test gate and desktop cannot catch OAuth redirect/popup behavior, storage-partitioning bugs, or standalone-mode session-isolation issues. Real-device testing is the only surface that catches these — the r54 mobile sign-in regression (where `getRedirectResult` returned null on mobile) was not visible on desktop or in the test suite at all.

---

## Protocol 30 — Popup-Only Auth on This Hosting — Redirect Banned

Use `linkWithPopup` / `signInWithPopup` **only**. `linkWithRedirect` and `signInWithRedirect` are **prohibited** on this project.

**Why:** GitHub Pages cannot self-host the Firebase `/__/auth/` redirect handler. The redirect flow relies on a cross-origin iframe to `{project}.firebaseapp.com`, which modern mobile browsers block (storage partitioning), causing `getRedirectResult` to return `null` and silently breaking sign-in with no error to the user. The popup flow has no such dependency and works correctly in all environments this app targets.

---

## Protocol 31 — `signInAnonymously` Must Always Be Guarded — Never Unconditional

The boot anonymous sign-in must be gated behind `auth.authStateReady()` plus an explicit `!auth.currentUser` check (or equivalent guard), never called unconditionally.

**Why:** The Firebase SDK only no-ops `signInAnonymously` for a user who is already anonymous. For a user who is already signed in with a linked account (e.g. Google), an unconditional call mints a fresh anonymous user and silently replaces the session — wiping sign-in on every reload. This was the root cause of the 5c-ii clobber bug.

---

## Protocol 32 — Every New Network/IO Feature Ships With a Kill-Switch Flag + Graceful Fallback

Any new feature that does network or external I/O — cloud sync, authentication, AI calls, remote config, or any future integration — must be registered with the remote kill-switch config and must define a graceful fallback behavior for when the feature is disabled or failing.

**Why:** A kill switch lets a broken feature be turned off remotely without a redeploy, and a defined fallback keeps the app fully usable when that feature is unavailable. Without these, any new networked feature is a potential outage vector. Note: the kill-switch mechanism itself is part of the Phase 5 hardening work; this protocol governs all features added from that point forward.

---

## Protocol 33 — The Kill-Switch Read Is Fail-Safe

Reading the remote kill-switch / feature-config on boot must never disable features or black-screen the app if the config is unreachable, malformed, or slow to respond. Always default to last-known-good or features-enabled and remain fully usable offline.

**Why:** A broken or unreachable config must not become its own outage. The safety mechanism cannot be a new failure mode — if the kill-switch check itself can bring down the app, it is worse than having no kill switch at all.

---

## Protocol 34 — Cloud Writes Are Additive; Destructive Ops Are Confirm-Gated

All cloud save and data writes must be **additive** (e.g. `addDoc` to create a new document — never a blind overwrite of an existing one). Any destructive action — overwriting the live campaign state on load, deleting a cloud save, or replacing an existing document — must be behind an explicit user confirmation step.

**Why:** This locks in the no-overwrite / no-silent-delete data-safety invariant for all future cloud features. The pattern was verified correct for the Phase 5c-iii cloud save picker and must hold going forward. A single accidental destructive write can silently erase a user's save with no recovery path.

---

## Protocol 35 — Auto-Flip the Remote Kill-Switch on Detected Post-Deploy Regression

When a post-deploy regression in a networked/IO feature is detected, the dev process flips that feature's flag to `false` in `/config/flags` via the Firebase console **immediately and automatically** — without waiting for the user — then notifies the user. Restore first, diagnose second; the live-site analogue of Protocol 16 for flaggable features. Order: (1) flip off live, (2) confirm fallback active + app usable, (3) report to user, (4) diagnose/fix/verify, then flip back on. Prefer the remote flag over `git revert` when the break is contained to a flaggable feature (instant, no deploy/cache bump).

**Why:** A flaggable regression should never wait on a human round-trip; the read is fail-safe (Protocol 33) so flipping only disables into a defined fallback, never black-screens.

---

## Protocol 36 — Gate Parity & Escape-Ratchet

**(a) GATE PARITY:** The local gate is split at the commit/push boundary. The pre-commit hook runs the FAST subset (`npm run gate:fast`: lint, format, both test runners + parity check) to keep commits quick (~10–15 s). The pre-push hook runs the FULL gate (`npm run gate`, adds Playwright boot-smoke + render-check) before anything reaches origin. CI also runs `npm run gate` — parity holds at the push boundary, which is the only boundary CI observes. The local gate can never be a weaker promise than CI at that boundary.

**(b) ESCAPE-RATCHET:** Any failure that escapes a layer gets a check added AT that layer in the SAME fix — a production bug becomes a regression test; anything that passed the local gate but failed CI gets that check pulled into `npm run gate` / the hook so the whole class is caught locally next time. Every escape permanently tightens the gate.

**Why:** This is what makes the gate self-improving — defects ratchet the net finer instead of recurring.

---

## Protocol 37 — Keep repomix.config.json Current

Whenever the repo's file structure changes in a way that affects what should be packed for AI context (a new top-level source directory or file type added or removed, tests/scripts/workflows relocated), update `repomix.config.json`'s `include` or `ignore` in the **same commit**. Also re-check it when repomix itself is version-bumped (its config schema can change). The packed output (`repomix-output.*`) is gitignored and never committed. Goal: the one-shot repo context an AI loads is never stale or missing new code.

When reviewing structural changes, check `repomix.config.json` alongside `ARCHITECTURE.md`, `README.md`, and the test runners.

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
| `linkWithRedirect` / `signInWithRedirect` on this project   | GitHub Pages cannot host the Firebase auth redirect handler; mobile browsers block the cross-origin iframe fallback (storage partitioning), so `getRedirectResult` returns `null` — sign-in silently fails (Protocol 30) |
| Unconditional `signInAnonymously` on boot                   | For a Google-linked user, an unguarded call mints a fresh anonymous user and wipes the signed-in session on every reload (the 5c-ii clobber bug) — always gate on `auth.authStateReady()` + `!auth.currentUser` (Protocol 31) |

---

## Architecture Quick Reference

**Script load order** (global scope, not modules):

1. `js/database.js` → `databaseCSVs`, `lookupItemInDb()`
2. `js/state.js` → `state`, `APP_VERSION`, `FACTION_REGISTRY`, `SKILL_KEYS`, `saveState()`, `migrateState()`
3. `js/registry.js` → `FALLOUT_REGISTRY`, `registrySearch()` (read-only, never touches state)
4. `js/ui-audio.js` → all audio functions (`audioCtx`, geiger/tinnitus/CRT hum, limb/wake/boot/level-up sounds, `runBootSequence`, `triggerPhosphorGhost`, `changeOpticsColor`)
5. `js/ui-render.js` → all `render*()` functions, CRUD helpers (`addItem`/`delItem`/`addAmmo`/etc.), faction utilities (`FACTION_THRESHOLDS`, `getFactionStanding`, `adjustFaction`), game-time helpers, map helpers, `_updateContextPanels`
6. `js/ui-saves.js` → save slots, file import/export, rolling backups, registry autocomplete (`initRegistryAutocomplete`, `wireInput`), ammo datalist
7. `js/ui-account.js` → `renderAccount()`, `renderCloudSavePicker()`, `undoLastSync()`
8. `js/ui-core.js` → `AudioSettings`, `appendToChat()`, `loadUI()`, `updateMath()`
9. `js/api.js` → `autoImportState()`, `transmitMessage()`, `getSystemDirective()`
10. `js/cloud.js` → ES module, attaches `window.pushToCloud`, `window.pullFromCloud`

**AI contract:** Tri-Node JSON schema (`narrative`, `state`, `modal`). The AI is locked to `responseMimeType: 'application/json'`. It cannot produce freeform text.

**State persistence:** `localStorage` key `robco_v7`. Debounced 500ms writes. Flushed immediately on `beforeunload`.

**Test suite:** 981 tests across 84 suites, mirrored in `tests/check-persistence.ps1` (PowerShell, run by the pre-commit hook) and `tests/check-persistence.js` (Node) — both runners are kept at exact parity (same suites, same per-suite counts, same 981 total). Covers parser sanity, autoImportState coverage, faction registry, skill keys, save envelope, file maps, cloud sync, backward compatibility, registry structural integrity, reputation 2D matrix, C2 CRUD function existence, C3 CAMPG tab DOM binding, C4 Protocol 4 campaignMode (binary) + separation, render contracts, CSS invariants, SW invariants, structural integrity (Protocol 20 static guards), detail-current dedup guard (Protocol 27), FO3 database structural integrity, CSV column-count integrity, security regression guards (XSS-1/XSS-2/XSS-3), critical feature presence and SW update banner regression (Suites 22-41, 49-82 gate guards: UI controls, prohibited patterns, protocol completeness, AI contract lock, architectural boundaries, assets completeness, meta/runner parity, SW update banner, Phase 1b guards, CI/CD automation guards, command registry, chem-boost, optics/empty-state/utility CSS, Phase 2c CSS hygiene, Phase 3a perf guards, keyboard shortcuts group), DB↔registry weapon parity (Suite 38), ammo token split (Suite 39), inventory category filter + mod type (Suite 40), weapon mods CSV + registry parity (Suite 41), native command router (Suite 42), GAME_DEFS structural integrity (Suite 43), anonymous auth + security rules + XSS coercion fix (Suite 44, including no-double-escape behavioral regression), Google sign-in + account panel (Suite 45: GoogleAuthProvider, linkWithPopup (popup-only, no redirect), getRedirectResult, signOut + re-anon, collision recovery, renderAccount, ACCOUNT panel, CSP apis.google.com, hardened boot order, gesture safety), cloud save picker + local migration (Suite 46: addDoc additive upload, _contentHash dedup, syncLocalSavesToCloud, loadCloudSave confirm+sanitize+migrate, deleteCloudSave confirm, renameCloudSave updateDoc, renderSavesList, #savesListBody), Gemini key sync + AI Studio link (Suite 47: saveGeminiKeyToCloud, loadGeminiKeyFromCloud, anonymous+toggle guard, secrets path, setGeminiKeySync, robco_gemini_key_sync local mirror, geminiKeySyncToggle, AI Studio link + rel=noopener, NAME button, dateStr regression guard), remote kill-switch + client auto-disable (Suite 48: loadRemoteConfig, config/flags path, timeout race, try/catch fail-open, not-awaited boot, isFeatureEnabled fail-open, robco_feature_flags LKG, aiChat gate in transmitMessage, cloudSync gate, _recordFeatureFailure + FAIL_THRESHOLD, firestore.rules config rule), CI/repo hardening guards (Suite 49: asset-manifest completeness js/+css/, Firestore no-allow-all, release.yml CI gating, deploy.yml *.png glob guard), gate parity guards (Suite 50: pre-commit invokes npm run gate:fast, gate enforces --max-warnings 0, boot-smoke uses HTTP, package.json has gate script, gate.js has --fast flag, gate.js powershell fallback, pre-push invokes full gate, install-hooks installs pre-push), save integrity + rolling backups (Suite 51: computeSaveChecksum FNV-1a helper, verifySaveEnvelope legacy/future_version/checksum_mismatch returns, exportSaveFile/saveToSlot checksum+schemaVersion stamp, loadFromSlot/handleFileUpload/pullFromCloud/loadCloudSave integrity check + rolling backup, restoreRollingBackup sanitize+migrate path, robco_backup_1/2/3 ring + ptr, QuotaExceededError drop-oldest-retry, index.html restore button, no duplicate contentHash in cloud.js), repo/site enrichment guards (Suite 52: repomix.config.json exists+valid JSON+include+ignore tuning, .nojekyll+robots.txt+404.html+PRIVACY.md exist, manifest.json has description+categories, README CI badge, Protocol 37 in RULES.md), AI + Gemini-key resilience (Suite 53: _AI_RETRY_MAX constant, _AI_RETRY_DELAYS_MS exponential array, fetchAuthorizedModels 401/403 explicit check, auth-failure returns before saveApiKeySilent, REJECTED message, transmitMessage 401/403 no-setTimeout guard, 429 RATE LIMIT message, bounded _AI_RETRY_MAX references, _validateTriNode defined+called before autoImportState, behavioral null/array/valid-object checks), prompt-injection hardening + input caps + quota warning (Suite 54: getSystemDirective injection-resistance section, player-input data delimiter in transmitMessage, #chatInput maxlength ≥4000, newItemName/newQuestName/newPerkName/newCampaignNote maxlength caps, JS userText.length guard, saveState QuotaExceededError catch + appendToChat warning), CSP Stage 2 origin guards + Firebase SDK pin (Suite 55: enforcing CSP present + report-only absent regression guard, load-bearing CSP origin checks for Gemini/Firebase Auth/token refresh/Firestore/App Check/gstatic/apis.google.com + nv-overlord, object-src/base-uri/frame-ancestors 'none' directives, unsafe-inline tripwire vs sha256/nonce additions, blob: in img-src, Firebase firebasejs version-pin guard), UI module split + boot-loader migration guards (Suite 56: js/ui-audio.js, js/ui-render.js, js/ui-saves.js, and js/ui-account.js file-exist guards, each in sw.js ASSETS, script tags in index.html, load-order guards — each before api.js and before ui-core.js; js/ui-core.js in sw.js ASSETS; js/ui.js must NOT exist on disk; document.write absent; dynamic createElement/appendChild/async=false injection present; all five boot-script paths referenced; activeContext/try-catch/FNV-default/FO3 fail-safe guards), PWA app shortcuts guards (Suite 57: manifest.shortcuts array length 4 (Data removed), all 4 shortcut names+urls correct (Comm-Link/Inventory/Stats/New Campaign), offline-safe ./#go= hash mechanism, SHORTCUT_ROUTES const + routeLaunchShortcut function in ui-core.js (data route kept in code), /^go=/ allow-list regex + no eval/innerHTML in routing fn, New Campaign → wipeTerminal + double-confirm gate regression, tab routes via switchTab, routeLaunchShortcut called after initTabs boot-order guard, history.replaceState reload-safety, custom per-shortcut icon src guards, shortcut icon file-exist + sw.js ASSETS guards, app icon.png file-exist guard), client error ring-buffer + [LOGS] command (Suite 58: ERROR_LOG_KEY + ERROR_LOG_CAP constants, _recordError function + localStorage-only write, showErrorLog function + sysModal reuse, NATIVE_COMMAND_ROUTER [LOGS] entry, no-exfil guard — no fetch/XMLHttpRequest/sendBeacon in _recordError or showErrorLog), inline handler integrity (Suite 59: on* attribute extraction from index.html, definition-anchored resolution — not substring match — per name regex function\s+NAME\b|NAME\s*=|window\.NAME\s*=, ≥20 unique handler names found, all resolve as definitions in js/*.js), a11y baseline-diff gate (Suite 60: @axe-core/playwright in devDependencies, tests/a11y-check.mjs exists, tests/a11y-baseline.json exists + valid JSON, scripts/gate.js invokes a11y-check.mjs in non-fast block, package.json has a11y script), mobile layout overflow guards (Suite 61: .main-grid minmax(0,1fr) grid track, .list-row-content overflow-wrap+word-break, .inventory-list li > span min-width+overflow-wrap, .panel overflow-wrap, mobile @media overflow-x:clip for col-left/col-right), changelog viewer guards (Suite 62: boot-time viewer .find() to skip [Unreleased], HTML comment stripping in both viewers), save/cloud UI consolidation guards (Suite 63: saveCurrentToCloud additive addDoc + isAnonymous guard + contentHash dedup, renderSavesList unified local+cloud list, #savesListBody mount point, #btnSaveToCloud), SPECIAL stats editable guards (Suite 64: all 7 s_s..s_l inputs have onchange=commitStat + oninput=capStatMax, no oninput clampStat regression, commitStat defined+1-10 clamp+updateMath+saveState+isNaN/state[k]||5 revert, all 7 have inputmode=numeric, clampStat absent, capStatMax defined+n>10 upper-only+no lower force, syncStateFromDom Math.max/min clamp), blocking update modal guards (Suite 65: id=updateModal replaces updateBanner, role=dialog+aria-modal+aria-labelledby, _triggerUpdate focus trap Tab+Esc block, Case A/B &&controller call-site regression guards, !modal||!btn fail-safe, ui-core.js ESC handler does not reference updateModal, #updateModalMsg text-align:left), FO3 Lincoln memorabilia tracker (Suite 66: 20 tests — state.lincolnItems {} default+migration, autoImportState LINCOLN_VOCAB+registryNames filter, reg_fo3.js lincolnMemorabilia 9 items, reg_nv.js excludes it, GAME_DEFS.FO3.tracksLincoln, renderLincolnMemorabilia defined+loadUI+tracksLincoln guard, toggleLincolnItem+setLincolnDisposition+vocab validation, #lincolnMemorabiliaDisplay, getSystemDirective lincolnItems, LINCOLN_VOCAB excludes 'other', opts excludes OTHER, autoImportState coerces 'other'→'found'), FNV Traits tracker + trait name filter (Suite 67: state.traits [] default+migration, autoImportState registry-validated+dedup array, reg_nv.js traits 16 items, reg_fo3.js excludes it, GAME_DEFS.FNV.hasTraits, renderTraits defined+loadUI+hasTraits guard, toggleTrait+soft-cap warn, #traitsDisplay distinct from #perksList, getSystemDirective traits, #traitFilter input, renderTraits substring-filter), FNV location database expansion (Suite 68: FALLOUT_REGISTRY.locations ≥108 entries, seed examples present — Jean Sky Diving/Jack Rabbit Springs/Powder Ganger Camp South/Wolfhorn Ranch/Ivanpah Dry Lake, type validity, no duplicates, zone [4,2] parity Goodsprings Cave, zone [4,1] parity Powder Ganger Camp East), FO3 game-switch regression (Suite 69: onGameContextChange sets state.gameContext=ctx + window._contextSwitching guard, beforeunload early-exit guard, saveState debounce early-exit guard), FNV unique apparel + Vault 13 Canteen seed (Suite 70: ARMOR floor ≥103, MISC Vault 13 Canteen, named mandated items Benny's Suit/Suave Gambler Hat/Vault 13 Canteen registry present, no-dupe check, 7-col ARMOR integrity, DB↔registry parity for mandated items, seedNewCampaignInventory defined+FNV guard+inventory guard+ticks guard), Phase 6 UI consistency (Suite 71: 23 tests — #traitsSection is <details.sub-panel>+data-sub-id, renderTraits compact inline effect+no-inline-flex, #collectiblesSubPanel+#lincolnSubPanel as sub-panels, sub-panel persistence+fail-safe+default-collapsed via robco_panel_state, Lincoln compact rows+no-dup-header+data-lname onclick safety+setLincolnDisposition re-render guard+no-inline-flex, faction lone-card CSS nth-child(odd)), location datalist bleed fix + update-modal whitespace (Suite 72: static nv_locations datalist removed → dynamic #locationOptions from FALLOUT_REGISTRY.locations+escapeHtml+initLocationDatalist call, bleed-class regression guard no static option children in any datalist, #updateModalMsg white-space:normal+single-line content guard), skills panel game-aware render (Suite 73: 12 tests — #skillsGrid empty container in index.html, no static sk_guns/sk_survival ids, renderSkills() defined+getSkillKeys()+SKILL_LABELS+escapeHtml+called from loadUI, SKILL_LABELS covers all 15 keys, big_guns→'Big Guns'/small_guns→'Small Guns'/guns→'Guns'/survival→'Survival', syncStateFromDom getSkillKeys regression guard), collectible coord guards (Suite 74: 11 tests — every FNV snow globe + FO3 bobblehead + lincolnMemorabilia entry has gridRow/gridCol in 1..6 matching an existing zones[] cell, counts unchanged 7/20/9, no dupes, renderWorldMap badge is coord-based not name-based, uncollected bobblehead flags its cell), registry items[] no-duplicate guard (Suite 75: 3 tests — FNV items[] no duplicate name+type pairs, FO3 items[] no duplicate name+type pairs, Rebound weapon appears exactly once regression guard), autoImportState hardening guards (Suite 76: 9 tests — equipped 'key' in e present for all 3 slots, old || short-circuit absent, FALLOUT_REGISTRY.collectibles referenced, _collectNames.has(c) filter active, old c.trim() permissive filter absent, BUFF/DEBUFF/NEUTRAL whitelist present, String(item.type).toUpperCase() normalization, raw item.type||'BUFF' passthrough absent), faction reputation regression + ±5 increment (Suite 77: 14 tests — FACTION_THRESHOLDS 3-breakpoint canonical NV scheme only for ncr/legion/bos, _DEFAULT_THRESHOLDS generic 8/25/50, getFactionStanding 4×4 MATRIX lookup, no adjustFaction ±50 in ui-render.js), VENDORS.CSV structural integrity (Suite 78: 7 tests — 39 data rows, all rows 7 columns, sentinel names Gloria Van Graff/Joshua Graham/Doctor Usanagi/Quartermaster Bardon/Street Vendor), FO3 location database expansion (Suite 79: 10 tests — FALLOUT_REGISTRY.locations (FO3) count === 90, all entries non-empty names, all types valid {settlement/landmark/base/factory/vault/other}, sentinels The Pitt/Point Lookout/Mothership Zeta/Andale/Vault 106, Georgtown West typo removed + Georgetown West present), CHEMS.CSV consumables expansion (Suite 80: 9 tests — 76 data rows, all rows exactly 8 fields (stray-comma guard), sentinels Cram/Sunset Sarsaparilla/Rebound/Wasteland Omelet/Sierra Madre Martini, lookupItemInDb column-mapping spot-checks wgt/val/type for Sunset Sarsaparilla + MRE), FO3 [ARMOR.CSV] expansion (Suite 81: 9 tests — 62 data rows, all rows exactly 7 fields (stray-comma guard), sentinels Combat Helmet/Samurai Armor/T-51b Power Helmet/Ghoul Mask/Composite Recon Armor, lookupItemInDb column-mapping spot-checks wgt/val/type for Combat Helmet + Samurai Armor), FO3 quests expansion + quest items expansion (Suite 82: 13 tests — quests 44→64 with DLC quests for all five add-ons, dedup guard for 'Strictly Business', DLC sentinels + dlc field check + type validity, QUEST_ITEMS 15→25 data rows, 5-field stray-comma guard, sentinels Steel Ingot/Krivbeknih/Cryo Key, lookupItemInDb Steel Ingot wgt spot-check). **When you change one runner, update the other in the same commit** — drift here is what let the PS runner silently fall to 173.





