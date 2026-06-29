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
git commit          # Pre-commit hook: cache-bump guard runs first, then fast gate (1249 tests via gate:fast)
git push origin main  # CACHE_NAME must already be bumped (Protocol 1)
```

- **1249 tests must pass.** If fewer pass, something is broken. Investigate before committing.
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
| `tests/test.html`             | `Suites: N` header-comment marker (Protocol 40) — must equal the actual `section('…')` count; update when a runtime suite is added/removed                              |

**How to find all stale counts before committing:**

```powershell
Select-String -Path "RULES.md","CLAUDE.md","README.md","ARCHITECTURE.md","CHANGELOG.md","tests/check-persistence.js","tests/check-persistence.ps1","tests/test.html" -Pattern "\d+[- ]tests?|Suites:\s*\d+" | Select-Object Filename,LineNumber,Line
```

Run this after every test addition or removal. Every hit must show the new count **except** the frozen released-version entry in `CHANGELOG.md` (e.g. `v2.0.1` shows its release-day count of 258 — that is intentional and correct).

**Changelog versioning model:** Per-push test-count and cache-rev updates go on the current `## [Unreleased]` section header, **never** on a released version's entry (e.g. `v2.6.0`, `v2.0.1`). Released entries are frozen at the values that were true at their release and must not be modified retroactively.

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
- [ ] Add `render*()` in `ui.js` + call from `loadUI()` (if it needs a UI panel)
- [ ] Add `<details class="panel">` block in `index.html` (if it needs a panel)
- [ ] Bump `CACHE_NAME` in `sw.js` → Protocol 1
- [ ] Run `npm run lint` and `npm run format`
- [ ] Run `git commit` — 1249 tests must pass
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
- [ ] Lint, format, commit (1249 tests) → Protocol 2

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

2. **Sonnet — Review & Implement.** Sonnet first critically reviews the Opus plan against the current files (line numbers drift, selectors go stale, diagnoses can be wrong) and corrects any discrepancy. Then it implements, runs the full pre-commit gate (lint, format, Protocol 1 cache bump, 1130-test gate, Protocol 2/2a docs), and verifies the user-facing result by actually rendering/exercising it at the real target (e.g. a 360/412px mobile viewport) — never from headless width measurements alone.

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

The definitive verification step is `tests/render-check.mjs` — a Playwright render-check that loads the page at 360px and 412px and asserts no horizontal overflow and no focus-zoom. Run it outside the 1106-test pre-commit gate whenever map or mobile layout changes land. It is the only check that catches real pixel/overflow regressions.

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

### Cloud-sync determination (every new state field declares its sync path — WU-B5)

When you add a field to `state` (Protocol 4), **state its cloud-sync path in the same commit:**

- **Serialized-whole (default):** fields that live inside the `state` object ride the cloud save automatically — the whole `robco_v8` container is serialized into the additive `saves` document on push, and run through `sanitizeImportedContainer()` → `migrateState()` on pull. No per-field sync code is needed; just confirm the field is covered by the sanitizer (Protocol 4 sanitize checklist) and survives the **push → sanitize → migrate → apply** round-trip (guarded by the WU-B5 round-trip test in Suite 46).
- **Dedicated document (e.g. secrets/settings):** a field synced to its own Firestore doc (like the Gemini key or the key-sync preference) needs its own additive / merge-safe write and an explicit sync-path note in the commit.

**`setDoc` permanence (hard rule):** never write a `saves` document with `setDoc` — saves are created with `addDoc` (additive) and modified by id with `updateDoc`; a blind `setDoc` would clobber a user's campaign with no recovery. Any `setDoc` to a mutable config doc (settings/preferences) must pass `{ merge: true }` so it never erases sibling fields. Both invariants are gate-guarded (Suite 46).

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

## Protocol 38 — Game-Agnostic Feature Code

Every feature's runtime behavior must be driven by `GAME_DEFS[ctx]` data, not hardcoded game literals. No feature code may contain `=== 'FO3' ? 'FO3' : 'FNV'`-style coercions that silently collapse a third game to FNV, two-game arrays of faction keys or file paths, or `if (ctx !== 'FNV' && ctx !== 'FO3')` literal allowlists. Adding a new game must require only a new `GAME_DEFS` entry and any game-specific data files — never a search-and-replace of game literals across feature code.

**Sanctioned exceptions (do not change):**
- The `GAME_DEFS` declaration block itself (`js/state.js`)
- `|| 'FNV'` fail-safe defaults (absence guard, not a game validation)
- Legacy `robco_v7`→`v8` bootstrap migration code
- The `GAME_FILES` boot manifest in `index.html` — the ONE sanctioned game→files map (WU-A5). It must precede `state.js`/`GAME_DEFS` (it selects the files that *define* `GAME_DEFS`), so it cannot live inside `GAME_DEFS`. A new game = one manifest line + its two data files; selection is `GAME_FILES[ctx] || GAME_FILES.FNV`. Guarded by Suite 89 (sanctioned-map) + Suite 56 (boot load-order).
- `ctx === 'FO3' ? 'directive text' : ''` tracker-directive ternaries in `getSystemDirective()` (pending GA-5 refactor)

**Why:** As the app grows to support more Fallout titles, hardcoded two-game assumptions silently break or exclude the new game. Data-driven dispatch via `GAME_DEFS` is the only pattern that scales without requiring scattered literal updates across feature code.

---

## Protocol 39 — UTF-8 Source Integrity

All source files are UTF-8. The app is intentionally full of non-ASCII characters — ⚙ ▶ ▲ ▼ ░▒▓ shading, box-drawing `──` `│` `┌`, `[████]` limb bars, em-dashes and arrows in the AI system directive, and `æ`/`¡` in data files. **Never write a file that contains non-ASCII using PowerShell** (`Set-Content`, `Out-File`, or string-replacement + `Set-Content`). PowerShell 5.1 reads file contents as Windows-1252 (Latin-1) by default and re-encodes the output as UTF-8, which **double-encodes every multi-byte character**: `—` → `â€"`, `▲` → `â–²`, `⚠` → `âš `, `🛑` → `ðŸ›'`. The corruption is silent — the file is still valid UTF-8, it just renders garbage in the browser and breaks the AI system directive.

**Safe write methods for files with non-ASCII:**
- The Edit tool (reads and writes UTF-8 correctly in all circumstances)
- Node.js: `fs.readFileSync(path, 'utf8')` → modify → `fs.writeFileSync(path, content, 'utf8')`
- `git show <ref>:<file> | node` pipeline to restore a clean snapshot before applying changes

**Enforcement:** Suite 90 fails the build if any source file contains U+FFFD (`�`) or the `â€` / `â–` mojibake prefixes — the double-encoding signatures for E2-80-xx and E2-96-xx UTF-8 sequences respectively.

**Incident reference:** Commit `48feb96` introduced double-encoding across the entire `js/api.js` (a PowerShell write during WU-A4); commit `c108beb` restored the file from a clean snapshot and added the Suite 90 guard.

---

## Protocol 40 — Keep `tests/test.html` In Sync

`tests/test.html` is the **browser-side runtime mirror** of the canonical static runners (`tests/check-persistence.js` / `.ps1`). Where the canonical runners statically analyse the source, `test.html` actually **executes** the live import contract in a real browser (`autoImportState` / `sanitizeImportedContainer`, the v8 container + boot-merge, registry validation, SPECIAL/skill clamping, status tick-down) and asserts the result. It must never be allowed to fall out of date.

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
- **Suite 96** (both canonical runners) statically guards that `test.html` loads the current boot chain, exercises the current entry points, stays game-agnostic, carries no dead stubs, keeps its suite-count marker honest, and that the gate still invokes the headless runner.

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

**Enforcement (self-improving — Protocol 36b):** **Suite 98** (both runners) scans the project root and **fails the gate** if a known junk pattern reappears (junk-extension files at root, or a stray `.yoke/`-style empty tool dir). The gate only **flags** — it never auto-deletes; removal is always a deliberate step per this protocol.

---

## Protocol 42 — Fix Flaws Found During Testing/Verification (extends 36b)

A flaw, gap, or footgun discovered **while testing or verifying** — not only one found in shipped code — is treated exactly like a production defect: **fix it and add a regression test in the SAME commit.** This applies when the discovery happens while writing a test, running the gate, doing manual/browser verification, or building a test harness.

**Rules:**

- **Never work around a defect in the test harness and leave it unfixed.** If a test or harness step reveals a real defect, fix the defect first, then add a regression test that locks it.
- **Investigate before classifying.** Determine whether the issue is a real shipped-code path or only a harness artifact. State the verdict explicitly (in the commit/report).
- **Real shipped path affected → FIX** the code and add a test proving the fixed behavior.
- **Harness-only (no shipped path affected) → still add a test** that documents and locks the invariant, so the latent footgun cannot silently become a live bug later. Say "harness-only" explicitly; do not pretend it was a product bug, and do not skip the test.
- The added test goes in **both runners at parity** (Protocol 15) and the counts sync per Protocol 2a.

**Why:** The test suite is only as honest as its response to its own findings. Silently routing around a flaw the tests exposed defeats the gate. Every flaw the process surfaces must ratchet the net finer — the same escape-ratchet principle as Protocol 36b, extended from "escaped to production / CI" to "surfaced during development."

**Precedent:** During WU-A5 verification, a harness step hit the beforeunload-flush clobber (an unguarded `robco_v8` write + reload was overwritten by the unload flush). Investigation showed every shipped reload path is guarded (`_loadingSave`/`_contextSwitching`) — so it was **harness-only** — but the latent footgun was locked with Suite 95.8 (behavioral invariant) + 95.9 (guard-order static guard) rather than worked around.

---

## Protocol 43 — Dev-Branch Workflow / Release Gating

**Branch model.** All unreleased work — every commit and every push — goes to **`dev`**. **`main` is release-only:** it receives changes **solely** through a `dev → main` merge performed at a version release (an `APP_VERSION` bump per Protocol 2). Nothing lands on `main` except releases. Production (GitHub Pages) deploys from `main`; the private staging site (Cloudflare Pages) builds from `dev`.

**Same bar on both branches — there is no "looser" branch.** Every existing rule and protocol applies **identically on `dev`** as on `main`. `dev` is held to the same standard as `main` in every respect. In particular, on **every** `dev` commit and push:

- The **full pre-commit / pre-push gate** runs and must pass exactly as on `main`: ESLint with **zero** errors/warnings, Prettier clean, **both** test runners (`tests/check-persistence.js` + `tests/check-persistence.ps1`) green and **at parity** (identical suites, per-suite counts, and 1249 total), plus the push-boundary browser checks — boot-smoke, render-check, the a11y baseline-diff, and the `tests/test.html` runtime audit.
- **Protocol 1** (bump `CACHE_NAME` when a served/precached file changes) applies.
- **Protocol 2 / 2a** (docs updated + test-count and suite-count synced across every location) applies.
- **Protocol 38** (game-agnostic feature code), **39** (UTF-8 source integrity), **41** (end-of-task cleanup sweep), **42** (fix flaws found during testing/verification in the same commit), and the **Protocol 36b** escape-ratchet all apply.
- Every other protocol (13 regression test, 14 AI-contract safety, 15 runner parity, 19 batch-before-push, 20 static source-invariant guards, etc.) applies unchanged.

**Changelog discipline on `dev`.** The `CHANGELOG.md` **chronological ordering convention is explicitly followed on `dev`**: within each category heading (Added / Fixed / Changed / Improved / Under the Hood), entries are ordered **earliest-first** — the oldest change sits at the top of its category and the newest is appended at the bottom. The **`[Unreleased]`** block is maintained on `dev` in this earliest-first order throughout development. At the `dev → main` version release, the accumulated `[Unreleased]` block **consolidates into the dated release version block** (entries preserving their earliest-first order within each category), and a fresh empty `[Unreleased]` block opens for the next cycle.

**Why:** Separating "pushed" from "released" keeps unreleased work off the public production site while a private staging build stays continuously live for real-device testing. Holding `dev` to the identical gate guarantees that whatever merges to `main` at release time has already cleared the full bar — the release merge promotes already-verified work rather than triggering a re-validation crunch.

---

## Protocol UI-1 — Panel Heading Standard

Every `<details class="panel">` in `index.html` must have `<summary><h2>> HEADING</h2></summary>` — the `>` glyph is mandatory. Sub-panels (`class="sub-panel"`) use `<summary><h3>> HEADING</h3>` instead. Never put prose or config summaries directly in a `.panel` summary without an `h2`.

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
| Writing a non-ASCII file via PowerShell (`Set-Content` / `Out-File` / string + `Set-Content`) | Silently double-encodes every special char: `—`→`â€"`, `▲`→`â–²`, `⚠`→`âš ` — use the Edit tool or Node `fs.writeFileSync(path, content, 'utf8')` instead; Suite 90 guards it (Protocol 39) |

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

**State persistence:** `localStorage` key `robco_v8`. Debounced 500ms writes with dirty-check. Flushed immediately on `beforeunload`.

**Test suite:** 1249 tests across 103 suites, mirrored in `tests/check-persistence.ps1` (PowerShell, run by the pre-commit hook) and `tests/check-persistence.js` (Node) — both runners are kept at exact parity (same suites, same per-suite counts, same 1249 total). Covers parser sanity, autoImportState coverage, faction registry, skill keys, save envelope, file maps, cloud sync, backward compatibility, registry structural integrity, reputation 2D matrix, C2 CRUD function existence, C3 CAMPG tab DOM binding, C4 Protocol 4 campaignMode (binary) + separation, render contracts, CSS invariants, SW invariants, structural integrity (Protocol 20 static guards), detail-current dedup guard (Protocol 27), FO3 database structural integrity, CSV column-count integrity, security regression guards (XSS-1/XSS-2/XSS-3), critical feature presence and SW update banner regression (Suites 22-41, 49-102 gate guards: UI controls, prohibited patterns, protocol completeness, AI contract lock, architectural boundaries, assets completeness, meta/runner parity, SW update banner, Phase 1b guards, CI/CD automation guards, command registry, chem-boost, optics/empty-state/utility CSS, Phase 2c CSS hygiene, Phase 3a perf guards, keyboard shortcuts group), DB↔registry weapon parity (Suite 38), ammo token split (Suite 39), inventory category filter + mod type (Suite 40), weapon mods CSV + registry parity (Suite 41), native command router (Suite 42), GAME_DEFS structural integrity (Suite 43), anonymous auth + security rules + XSS coercion fix (Suite 44, including no-double-escape behavioral regression), Google sign-in + account panel (Suite 45: GoogleAuthProvider, linkWithPopup (popup-only, no redirect), getRedirectResult, signOut + re-anon, collision recovery, renderAccount, ACCOUNT panel, CSP apis.google.com, hardened boot order, gesture safety), cloud save picker + local migration (Suite 46: addDoc additive upload, _contentHash dedup, syncLocalSavesToCloud, loadCloudSave confirm+sanitize+migrate, deleteCloudSave confirm, renameCloudSave updateDoc, renderSavesList, #savesListBody), Gemini key sync + AI Studio link (Suite 47: saveGeminiKeyToCloud, loadGeminiKeyFromCloud, anonymous+toggle guard, secrets path, setGeminiKeySync, robco_gemini_key_sync local mirror, geminiKeySyncToggle, AI Studio link + rel=noopener, NAME button, dateStr regression guard), remote kill-switch + client auto-disable (Suite 48: loadRemoteConfig, config/flags path, timeout race, try/catch fail-open, not-awaited boot, isFeatureEnabled fail-open, robco_feature_flags LKG, aiChat gate in transmitMessage, cloudSync gate, _recordFeatureFailure + FAIL_THRESHOLD, firestore.rules config rule), CI/repo hardening guards (Suite 49: asset-manifest completeness js/+css/, Firestore no-allow-all, release.yml CI gating, deploy.yml *.png glob guard), gate parity guards (Suite 50: pre-commit invokes npm run gate:fast, gate enforces --max-warnings 0, boot-smoke uses HTTP, package.json has gate script, gate.js has --fast flag, gate.js powershell fallback, pre-push invokes full gate, install-hooks installs pre-push), save integrity + rolling backups (Suite 51: computeSaveChecksum FNV-1a helper, verifySaveEnvelope legacy/future_version/checksum_mismatch returns, exportSaveFile/saveToSlot checksum+schemaVersion stamp, loadFromSlot/handleFileUpload/pullFromCloud/loadCloudSave integrity check + rolling backup, restoreRollingBackup sanitize+migrate path, robco_backup_1/2/3 ring + ptr, QuotaExceededError drop-oldest-retry, index.html restore button, no duplicate contentHash in cloud.js), repo/site enrichment guards (Suite 52: repomix.config.json exists+valid JSON+include+ignore tuning, .nojekyll+robots.txt+404.html+PRIVACY.md exist, manifest.json has description+categories, README CI badge, Protocol 37 in RULES.md), AI + Gemini-key resilience (Suite 53: _AI_RETRY_MAX constant, _AI_RETRY_DELAYS_MS exponential array, fetchAuthorizedModels 401/403 explicit check, auth-failure returns before saveApiKeySilent, REJECTED message, transmitMessage 401/403 no-setTimeout guard, 429 RATE LIMIT message, bounded _AI_RETRY_MAX references, _validateTriNode defined+called before autoImportState, behavioral null/array/valid-object checks), prompt-injection hardening + input caps + quota warning (Suite 54: getSystemDirective injection-resistance section, player-input data delimiter in transmitMessage, #chatInput maxlength ≥4000, newItemName/newQuestName/newPerkName/newCampaignNote maxlength caps, JS userText.length guard, saveState QuotaExceededError catch + appendToChat warning), CSP Stage 2 origin guards + Firebase SDK pin (Suite 55: enforcing CSP present + report-only absent regression guard, load-bearing CSP origin checks for Gemini/Firebase Auth/token refresh/Firestore/App Check/gstatic/apis.google.com + nv-overlord, object-src/base-uri/frame-ancestors 'none' directives, unsafe-inline tripwire vs sha256/nonce additions, blob: in img-src, Firebase firebasejs version-pin guard), UI module split + boot-loader migration guards (Suite 56: js/ui-audio.js, js/ui-render.js, js/ui-saves.js, and js/ui-account.js file-exist guards, each in sw.js ASSETS, script tags in index.html, load-order guards — each before api.js and before ui-core.js; js/ui-core.js in sw.js ASSETS; js/ui.js must NOT exist on disk; document.write absent; dynamic createElement/appendChild/async=false injection present; all five boot-script paths referenced; activeContext/try-catch/FNV-default/FO3 fail-safe guards), PWA app shortcuts guards (Suite 57: manifest.shortcuts array length 4 (Data removed), all 4 shortcut names+urls correct (Comm-Link/Inventory/Stats/New Campaign), offline-safe ./#go= hash mechanism, SHORTCUT_ROUTES const + routeLaunchShortcut function in ui-core.js (data route kept in code), /^go=/ allow-list regex + no eval/innerHTML in routing fn, New Campaign → wipeTerminal + double-confirm gate regression, tab routes via switchTab, routeLaunchShortcut called after initTabs boot-order guard, history.replaceState reload-safety, custom per-shortcut icon src guards, shortcut icon file-exist + sw.js ASSETS guards, app icon.png file-exist guard), client error ring-buffer + [LOGS] command (Suite 58: ERROR_LOG_KEY + ERROR_LOG_CAP constants, _recordError function + localStorage-only write, showErrorLog function + sysModal reuse, NATIVE_COMMAND_ROUTER [LOGS] entry, no-exfil guard — no fetch/XMLHttpRequest/sendBeacon in _recordError or showErrorLog), inline handler integrity (Suite 59: on* attribute extraction from index.html, definition-anchored resolution — not substring match — per name regex function\s+NAME\b|NAME\s*=|window\.NAME\s*=, ≥20 unique handler names found, all resolve as definitions in js/*.js), a11y baseline-diff gate (Suite 60: @axe-core/playwright in devDependencies, tests/a11y-check.mjs exists, tests/a11y-baseline.json exists + valid JSON, scripts/gate.js invokes a11y-check.mjs in non-fast block, package.json has a11y script), mobile layout overflow guards (Suite 61: .main-grid minmax(0,1fr) grid track, .list-row-content overflow-wrap+word-break, .inventory-list li > span min-width+overflow-wrap, .panel overflow-wrap, mobile @media overflow-x:clip for col-left/col-right), changelog viewer guards (Suite 62: 19 tests — env-aware [Unreleased] gate prod-hide/dev-show via _visibleChangelog + _isStagingEnv fail-safe default, cf-staging robco-env marker / prod none, runtime-fetched-asset publish+precache invariant, plus WU-C11 glow-up: _parseChangelog + _showChangelogModal structured renderer, version <select> dropdown, collapsible category <details class="changelog-cat">, diegetic FIRMWARE REVISION LOG + [+]/[*]/[~]/[-] tags, escapeHtml on entries, source-order preserved (no reverse/sort), addEventListener change wiring, ~700px reading-column CSS + changelog-wide modal mode + closeModal cleanup), save/cloud UI consolidation guards (Suite 63: saveCurrentToCloud additive addDoc + isAnonymous guard + contentHash dedup, renderSavesList unified local+cloud list, #savesListBody mount point, #btnSaveToCloud), SPECIAL stats editable guards (Suite 64: all 7 s_s..s_l inputs have onchange=commitStat + oninput=capStatMax, no oninput clampStat regression, commitStat defined+1-10 clamp+updateMath+saveState+isNaN/state[k]||5 revert, all 7 have inputmode=numeric, clampStat absent, capStatMax defined+n>10 upper-only+no lower force, syncStateFromDom Math.max/min clamp), blocking update modal guards (Suite 65: id=updateModal replaces updateBanner, role=dialog+aria-modal+aria-labelledby, _triggerUpdate focus trap Tab+Esc block, Case A/B &&controller call-site regression guards, !modal||!btn fail-safe, ui-core.js ESC handler does not reference updateModal, #updateModalMsg text-align:left), FO3 Lincoln memorabilia tracker (Suite 66: 20 tests — state.lincolnItems {} default+migration, autoImportState LINCOLN_VOCAB+registryNames filter, reg_fo3.js lincolnMemorabilia 9 items, reg_nv.js excludes it, GAME_DEFS.FO3.tracksLincoln, renderLincolnMemorabilia defined+loadUI+tracksLincoln guard, toggleLincolnItem+setLincolnDisposition+vocab validation, #lincolnMemorabiliaDisplay, getSystemDirective lincolnItems, LINCOLN_VOCAB excludes 'other', opts excludes OTHER, autoImportState coerces 'other'→'found'), FNV Traits tracker + trait name filter (Suite 67: state.traits [] default+migration, autoImportState registry-validated+dedup array, reg_nv.js traits 16 items, reg_fo3.js excludes it, GAME_DEFS.FNV.hasTraits, renderTraits defined+loadUI+hasTraits guard, toggleTrait+soft-cap warn, #traitsDisplay distinct from #perksList, getSystemDirective traits, #traitFilter input, renderTraits substring-filter), FNV location database expansion (Suite 68: FALLOUT_REGISTRY.locations ≥108 entries, seed examples present — Jean Sky Diving/Jack Rabbit Springs/Powder Ganger Camp South/Wolfhorn Ranch/Ivanpah Dry Lake, type validity, no duplicates, zone [4,2] parity Goodsprings Cave, zone [4,1] parity Powder Ganger Camp East), FO3 game-switch regression (Suite 69: onGameContextChange sets state.gameContext=ctx + window._contextSwitching guard, beforeunload early-exit guard, saveState debounce early-exit guard), FNV unique apparel + Vault 13 Canteen seed (Suite 70: ARMOR floor ≥103, MISC Vault 13 Canteen, named mandated items Benny's Suit/Suave Gambler Hat/Vault 13 Canteen registry present, no-dupe check, 7-col ARMOR integrity, DB↔registry parity for mandated items, seedNewCampaignInventory defined+FNV guard+inventory guard+ticks guard, WU-D2 Mysterious Stranger Outfit DT=0 regression), Phase 6 UI consistency (Suite 71: 23 tests — #traitsSection is <details.sub-panel>+data-sub-id, renderTraits compact inline effect+no-inline-flex, #collectiblesSubPanel+#lincolnSubPanel as sub-panels, sub-panel persistence+fail-safe+default-collapsed via robco_panel_state, Lincoln compact rows+no-dup-header+data-lname onclick safety+setLincolnDisposition re-render guard+no-inline-flex, faction lone-card CSS nth-child(odd)), location datalist bleed fix + update-modal whitespace (Suite 72: static nv_locations datalist removed → dynamic #locationOptions from FALLOUT_REGISTRY.locations+escapeHtml+initLocationDatalist call, bleed-class regression guard no static option children in any datalist, #updateModalMsg white-space:normal+single-line content guard), skills panel game-aware render (Suite 73: 12 tests — #skillsGrid empty container in index.html, no static sk_guns/sk_survival ids, renderSkills() defined+getSkillKeys()+SKILL_LABELS+escapeHtml+called from loadUI, SKILL_LABELS covers all 15 keys, big_guns→'Big Guns'/small_guns→'Small Guns'/guns→'Guns'/survival→'Survival', syncStateFromDom getSkillKeys regression guard), collectible coord guards (Suite 74: 12 tests — every FNV snow globe + FO3 bobblehead + lincolnMemorabilia entry has gridRow/gridCol in 1..6 matching an existing zones[] cell, counts unchanged 7/20/9, no dupes, renderWorldMap badge is coord-based not name-based, uncollected bobblehead flags its cell, all FO3 zone names unique (WU-D1 — no duplicate world-map region labels)), registry items[] no-duplicate guard (Suite 75: 3 tests — FNV items[] no duplicate name+type pairs, FO3 items[] no duplicate name+type pairs, Rebound weapon appears exactly once regression guard), autoImportState hardening guards (Suite 76: 9 tests — equipped 'key' in e present for all 3 slots, old || short-circuit absent, FALLOUT_REGISTRY.collectibles referenced, _collectNames.has(c) filter active, old c.trim() permissive filter absent, BUFF/DEBUFF/NEUTRAL whitelist present, String(item.type).toUpperCase() normalization, raw item.type||'BUFF' passthrough absent), faction reputation regression + ±5 increment (Suite 77: 14 tests — FACTION_THRESHOLDS 3-breakpoint canonical NV scheme only for ncr/legion/bos, _DEFAULT_THRESHOLDS generic 8/25/50, getFactionStanding 4×4 MATRIX lookup, no adjustFaction ±50 in ui-render.js), VENDORS.CSV structural integrity (Suite 78: 7 tests — 39 data rows, all rows 7 columns, sentinel names Gloria Van Graff/Joshua Graham/Doctor Usanagi/Quartermaster Bardon/Street Vendor), FO3 location database expansion (Suite 79: 10 tests — FALLOUT_REGISTRY.locations (FO3) count === 90, all entries non-empty names, all types valid {settlement/landmark/base/factory/vault/other}, sentinels The Pitt/Point Lookout/Mothership Zeta/Andale/Vault 106, Georgtown West typo removed + Georgetown West present), CHEMS.CSV consumables expansion (Suite 80: 9 tests — 76 data rows, all rows exactly 8 fields (stray-comma guard), sentinels Cram/Sunset Sarsaparilla/Rebound/Wasteland Omelet/Sierra Madre Martini, lookupItemInDb column-mapping spot-checks wgt/val/type for Sunset Sarsaparilla + MRE), FO3 [ARMOR.CSV] (Suite 81: 10 tests — 61 data rows (WU-D2: 62→61, removed NV-bleed 'NCR Ranger Armor'), all rows exactly 7 fields (stray-comma guard), sentinels Combat Helmet/Samurai Armor/T-51b Power Helmet/Ghoul Mask/Composite Recon Armor, lookupItemInDb column-mapping spot-checks wgt/val/type for Combat Helmet + Samurai Armor, NV-bleed guard no NCR-faction armor in FO3), FO3 quest canon corrections + quest items (Suite 82: 14 tests — quests 62 (WU-D1 canon fix: removed non-canon 'Fires of Anchorage' + fabricated duplicate 'Strictly Business (Paradise Falls)', both fallout.wiki-verified) with DLC quests for all five add-ons, dedup guard for 'Strictly Business' + canon-removal regression guard, DLC sentinels + dlc field check + type validity, QUEST_ITEMS 15→25 data rows, 5-field stray-comma guard, sentinels Steel Ingot/Krivbeknih/Cryo Key, lookupItemInDb Steel Ingot wgt spot-check), crafting recipe + breakdown registry data (Suite 83: 15 tests — NV 25 recipes (workbench/campfire/recycling) + 12 breakdowns, FO3 7 workbench schematics; station/skillReq/sentinel/no-dup guards for both games), craft panel UI + batch craft/scrap mechanics (Suite 84: 24 tests — renderCraft defined+called from loadUI, renderCraftCard+renderScrapCard defined, craftRecipeSelect with optgroup station grouping+scrapItemSelect picker, _craftGetHave ammo-first+inventory fallback, _craftConsume clamp ≥0+splice-at-0, craftSetMax input assignment, doCraft confirm-gate+ingredient-check+consume+ammo vs inventory route+no pushToCloud, doScrap confirm-gate+have-check+consume+yields+no pushToCloud, doCraft no state.skills hard-block (soft gating), #craftPanel+craft_breakdown sub-panel+data-sub-id, expandPanelForCategory craft key, _updatePanelBadges CRAFTING entry), skill books tracker READ/UNREAD split (Suite 85: 23 tests — reg_nv.js+reg_fo3.js skillBooks 13-item arrays with skill key mapping, FNV Wasteland Survival Guide→survival + FO3 U.S. Army: 30 Handy Flamethrower Recipes→big_guns sentinels, Guns and Bullets different skill per game, state.skillBooks [] default+migration, autoImportState registry-validated+dedup array, getSystemDirective unconditional, renderSkillBooks defined+loadUI wiring, #skillBooksDisplay container, skill_books_read/unread sub-panel markers, toggle persistence wiring, static skillBooksSubPanel removed, read.includes split correctness, NO BOOKS READ/ALL BOOKS READ empty states), maskable shortcut icons + OPTICS label wrap (Suite 86: 6 tests — manifest shortcut icon purpose=maskable for all 4 shortcuts, terminal.css .optics-label white-space:nowrap, OPTICS label static guard), NV Skill Magazines tracker (Suite 87: 25 tests — reg_nv.js magazines 14 entries+skill keys+no-dupe+sentinels, reg_fo3.js exclusion guard, state default+migrate, autoImportState registry-validated+dedup, getSystemDirective FNV-only, renderMagazines defined+sub-panels+toggle wiring+empty states, toggleMagazine defined, GAME_DEFS.FNV.hasMagazines, #magazinesDisplay), UI consistency structural guards (Suite 88: 8 tests — every details.panel has <summary><h2> starting with ">", every details.sub-panel has data-sub-id, no <span onclick="toggle..."> tracker pattern, all 5 tracker render functions use .tracker-row class, renderFactionRep MINOR FACTIONS sub-panel+data-sub-id, ±5 not ±50 faction button increment, _updatePanelBadges [n/total] for SKILL BOOKS + SKILL MAGAZINES, terminal.css button.tracker-toggle class), game-agnostic refactor guards (Suite 89: 14 tests — api.js no two-game coercion, _nativeCrossroads uses getFactionRegistry() not hardcoded key arrays, index.html no two-game coercion, ui-core.js no two-game coercion, onGameContextChange uses !GAME_DEFS[ctx], seedNewCampaignInventory no ctx !== 'FNV' guard, seedNewCampaignInventory reads GAME_DEFS, wipeTerminal uses Object.values(GAME_DEFS), GAME_DEFS.FNV has seedInventory, GAME_DEFS.FO3 has seedInventory, no hardcoded faction key array in _nativeCrossroads, RULES.md contains Protocol 38), UTF-8 corruption guard (Suite 90: 11 tests — api.js/state.js/ui-core.js/ui-render.js/ui-saves.js/ui-audio.js/ui-account.js/index.html/README.md/ARCHITECTURE.md each checked for U+FFFD replacement char and â€/â– double-encoding sequences caused by PowerShell Latin-1 read + UTF-8 write; CHANGELOG.md checked with full-sequence matcher only to avoid false-positives on intentional examples in Protocol 39 docs), loadUI dirty-check / targeted re-render guards (Suite 91: 9 tests — _renderSig module-level cache, _isDirty() helper, _clearRenderCache() force-render path, _isDirty wired in loadUI, renderWorldMap tab-btn-data guard, renderWorldMap not unconditional, renderAccount + renderSavesList always-called), vertical-broken-text anti-recurrence guards (Suite 92: 7 tests — .tag class white-space:nowrap in terminal.css, .badge class white-space:nowrap in terminal.css, inventory type-tag uses .tag in ui-render.js, map-collectible-badge includes badge class in ui-render.js, .macro-buttons button white-space:nowrap (WU-C12 device-wrap fix guard), .rng-mode-group > label white-space:nowrap + .rng-mode-group flex-direction:column (WU-C14 COMPLETE RNG label desktop-crush fix)), FO3 autocomplete guard (Suite 93: 8 tests — registry-core.js file-exist + sw.js ASSETS + registrySearch fn + FALLOUT_REGISTRY[category] game-agnostic + reg_nv.js no-duplicate + FO3/FNV boot-path index.html guards + FO3-context behavioral registrySearch("quests","galaxy") returns Galaxy News Radio), accessibility guards (Suite 94: 10 tests — :focus-visible rule in terminal.css + prefers-reduced-motion block + animation-duration 0.01ms + animation-iteration-count 1 + .crt-overlay restore + #chatDisplay aria-live=polite + aria-atomic=false + #sysModal role=dialog + aria-modal=true + _openSysModal() defined in ui-core.js), WU-B9 cloud.js → state.js boundary fix (Suite 101: 8 tests — state.js defines + exposes getGameContext() and snapshotActiveCampaign() accessors, getGameContext() preserves the `|| 'FNV'` fallback, snapshotActiveCampaign() is the single-source robco_v8 builder using getGameContext() + deep-snapshot, cloud.js no longer reads global state.gameContext or JSON.stringify(state) directly — routes through the accessor, Protocol 23 boundary restored), WU-B10 boot-drone autoplay timing (Suite 102: 6 tests — `_bootActive` boot-window flag declared default-false, runBootSequence opens it (_bootActive=true) before arming the drone + closes it (_bootActive=false) at completion, _onFirstInteract returns early on !_bootActive before _tryDrone() (stale post-boot drone suppressed), playBootDrone still arms the drone to the first click/keydown gesture (autoplay-policy-safe), behavioral gate replica — boot-active first gesture plays once / post-boot first gesture suppressed), WU-C13 SAVE MENU "?" help affordance (Suite 103: 7 tests — index.html save-panel "?" button with onclick=showSaveHelpModal + descriptive aria-label + .btn-sm ≥28px tap target, showSaveHelpModal() defined and opens via _openSysModal (WU-C4 focus-trap + ARIA), SAVE_HELP documents every save action (export/import/restore/slots/cloud push+pull), escapeHtml on help text, game-agnostic copy no FNV/FO3/Fallout/New Vegas literals). **When you change one runner, update the other in the same commit** — drift here is what let the PS runner silently fall to 173.





