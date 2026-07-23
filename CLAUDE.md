# RobCo U.O.S. — Agent Rules

> Every rule here was formalized from a real bug or established by the project owner.
> Follow this document first, `ARCHITECTURE.md` second.

**How this rulebook is structured (2.8.5 roadmap item R2).** *Written is not the same as
retrieved.* A rule only works if it is loaded for the task at hand, current, unambiguous, and
more salient than the rules crowding it. This file used to carry every protocol — ~100KB that
every session read regardless of what it was touching — and the important things got lost inside
it (contradictory branch instructions, a cache guard that compared against the wrong branch,
architecture file sizes off by 40×). So the rulebook is now two layers:

1. **This file — the universal contract.** The rules that genuinely apply to all work regardless
   of surface, and that need human judgement so they cannot be mechanised. Read it every session.
2. **`rules/*.md` — subsystem notes.** Everything surface-specific, loaded only when that surface
   is touched. Pick yours from the retrieval map below.

Nothing was deleted in that restructure — every protocol still exists, at its own number, in
exactly one place. The **retrieval map** is how you find it.

---

## Retrieval map — select your instruction packet

Read this file, then read **only** the notes whose surface you are touching.

| If you are touching… | Also read |
| -------------------- | --------- |
| `js/core/state.js` · `js/core/idb.js` · `js/core/runtime.js` · `js/services/api-import.js` · any new/changed field on `state`, the save envelope, `migrateState()`, or the durability shadow | `rules/state-and-save.md` |
| `sw.js` · `index.html` · `manifest.json` · icons · `css/` · `js/` (any **served/precached** file) · `.github/workflows/` · `scripts/cf-staging-build.mjs` · any push that reaches a live site | `rules/deploy-and-cache.md` |
| `js/services/cloud.js` · `js/ui/ui-account.js` · `firestore.rules` · `firebase.json` · any sign-in flow · any cloud read/write · **any new feature doing network or external I/O** | `rules/auth-and-cloud.md` |
| `index.html` · `css/` · `js/ui/` · any change a user can see | `rules/ui-and-mobile.md` |
| `js/ui/ui-audio.js` · the `AudioSettings` cache · the Audio Systems panel · any new sound | `rules/audio.md` |
| `js/data/` · the `GAME_DEFS` block · the `GAME_FILES` manifest · any per-game branch · any Fallout fact entering the app | `rules/game-data.md` |
| `js/services/api.js` · `js/services/api-directive.js` · `js/services/api-import.js` · `js/services/api-router.js` · the Tri-Node schema | `rules/ai-contract.md` |
| any `<script>` tag or boot-order change · any file split/add/move/rename/delete · `repomix.config.json` · any file with non-ASCII characters | `rules/file-layout.md` |
| `tests/` · `scripts/` (except `scripts/cf-staging-build.mjs` → deploy) · `js/dev/test-console.js` · `.github/workflows/` · any new `RobcoEvents` event or view-once flag · any safeguard meant to survive a refactor | `rules/testing-and-gates.md` |
| `CHANGELOG.md` · `README.md` · `ARCHITECTURE.md` · `CLAUDE.md` · `rules/` · `library/` · `planning/` · `QUEUE.md` · `QUEUE_LOG.md` · `skill/SKILL.md` · the in-app changelog viewer | `rules/docs-and-library.md` |
| the private-archive **restore / rehydrate** path — recovering the orchestrator's memory or the queue after a machine loss, or bringing a fresh Dispatch up to state (Protocol 48's complement) | `rules/memory-restore.md` |

Touching several surfaces means reading several notes. When in doubt, read the note — they are
short by construction.

**This map is the SOLE authority on which note governs a surface.** There is no second routing
document. Each note also carries a "Load this when touching" header for the reader who opens the
note directly, but that header is a convenience mirror, not an independent source of truth: where a
header and this map disagree, **this map wins**. A guard keeps them honest — every concrete path a
note's header claims must be routed to that note by its row here (Suite 220.15), so a surface can
never be governed by a note the map does not point at.

---

## Reference Pointer Index

Small map of where the deeper reference lives, so a session is auto-directed rather than loading everything blindly.

| Need | Where to look |
| ---- | ------------- |
| **Full project reconstruction** — what the app IS, the architecture, the state shape, every subsystem, the protocols and WHY each exists, the recurring gotchas, the owner's hard rules, the workflow, the roadmap | `library/BRAIN_DUMP.md` (gitignored, local-only, Claude-facing — read it from disk) |
| **Current roadmap / what's built vs. next** (phone-readable, committed) | `QUEUE.md` (repo root) — the QUEUE only; full accounts of shipped/ruled-out work live in `QUEUE_LOG.md` (repo root, append-only archive) |
| **Canonical protocol & gate rules** | this file (the universal contract) + `rules/*.md` (the subsystem notes) |
| **"Where does X live"** — function/subsystem → file, without loading whole files: entry points, render functions, native setters, boot phases, event-bus emitters/subscribers, the AI/cloud/OCR paths, the Diagnostic Shell registry | `library/CODE_MAP.md` (gitignored, local-only, derived from code not docs — Protocol 46) |
| **AI contract** — the Tri-Node JSON schema (`narrative`/`state`/`modal`), the 7 directive builders, `getSystemDirective()`, `autoImportState()`'s round-trip | `library/CODE_MAP.md` § AI Contract (`js/services/api-directive.js` builds the directive and owns `getSystemDirective()`; `js/services/api-import.js` owns `autoImportState()`; `js/services/api.js` is the network-layer hub only) — rules in `rules/ai-contract.md`, design rationale in `ARCHITECTURE.md` |
| **Boot lifecycle** — `window.onload`'s call order, the boot-phase functions, the event-bus subscriber wiring order | `library/CODE_MAP.md` § Boot Lifecycle (`js/ui/ui-core*.js` — the `ui-core.js` hub + the 2.8.5 U-A1 split family; `loadUI()` lives in the hub) |
| **State shape** — `let state = {…}`, `GAME_DEFS`, `migrateState()`, the save envelope | `library/CODE_MAP.md` § State (`js/core/state.js`) |
| **Event bus** — `RobcoEvents`, every emitted event name, every subscriber-wiring function and which file owns it | `library/CODE_MAP.md` § Event Bus |
| **Native command router** — `NATIVE_COMMAND_ROUTER`, the quick-log grammar, the native stat-token setters | `library/CODE_MAP.md` § Native Command Router (`js/services/api-router.js`) |
| **Audio model** — the `AudioSettings` cache, `ensureAudioCtx()`, every sound-trigger function, the mute-guard pattern | `library/CODE_MAP.md` § Audio (`js/ui/ui-audio.js`) |
| **Two-store boundary** — campaign state (`state` / `robco_v8`) vs. device prefs (`MetaStore` / `META_MANIFEST`) | `library/CODE_MAP.md` § Two-Store Boundary; the rule itself is Protocol 23 below |
| **Render pipeline** — `loadUI()`, every `render*()` function and its panel, the CRUD helpers | `library/CODE_MAP.md` § Render Pipeline (`js/ui/ui-render*.js` — the `ui-render.js` hub plus the nine per-panel files split out at U-A4) |
| **Adding a UI panel or a registry autocomplete input** — every wiring point (render fn, `loadUI()` fan-out, badge map, AI auto-expand map, autocomplete) | `library/CODE_MAP.md` § Render Pipeline → "Panel wiring points" and § Registry — these are the Protocol 5 / 6 authority (R3), derived from source |
| **Diagnostic Shell** — the `DIAGNOSTIC_SHELL_TOOLS` registry, the `prod`/`staging` tiering rule, `initTestConsole()` | `library/CODE_MAP.md` § Diagnostic Shell (`js/dev/test-console.js`) |
| **Test system** — how the gate runs, the single Node runner, suite numbering | `library/CODE_MAP.md` § Test System; per-suite detail in `library/TEST_CATALOG.md` |
| **Full per-suite test catalog** — every suite's coverage, every work-unit's build narration (large; read only when suite-level detail is actually needed) | `library/TEST_CATALOG.md` (gitignored, local-only) |
| **Re-making an existing feature with all six models** (Claude×3 + Gemini + ChatGPT) — the reusable collaborative-remake prompt, with ready-to-paste blocks | `library/PROMPT_MULTI_AI_REMAKE.md` (gitignored, local-only, standing tool — re-aim per feature) |
| **The standing prompt kit** — the reusable prompt set (`RobCo_Prompt_Library.md`) and the engineering playbook it holds models to (`RobCo_Engineering_Playbook.md`) | `library/PROMPT_LIBRARY/` (gitignored, local-only; moved here from `planning/_standing/` at R4 because these are standing tools, not frozen planning snapshots — see the backup consequence in `rules/docs-and-library.md`) |
| **Script load order / boot chain** | `rules/file-layout.md` (machine-checked against `index.html`) |
| **The 3-class library maintenance model** (LIVE / GENERATED / ARCHIVE) and the doc-maintenance rule | `rules/docs-and-library.md` |
| **Recover memory + queue after a machine loss** — the fresh-Dispatch rehydrate runbook (Protocol 48 backs the data up; this restores it) | `rules/memory-restore.md` |
| **Architecture deep-dive** (canonical design decisions) | `ARCHITECTURE.md` |
| **Plain-English release history** | `CHANGELOG.md` |

> Note: `library/BRAIN_DUMP.md` is a point-in-time snapshot; the code always wins where they disagree. `library/CODE_MAP.md` is derived directly from source (Protocol 46) and is a snapshot too — a session that finds it disagreeing with the code trusts the code and should flag the drift.
>
> **`library/` is gitignored** — a clean checkout contains only `library/MANIFEST.txt`, so any `library/` target named above is often absent. **If a `library/` target is absent, do not infer its contents** — fall back to reading the actual source it points at, and report the missing local-only context rather than guessing.

---

## Pre-Commit / Pre-Push Gate

```powershell
# → Bump CACHE_NAME in sw.js if this commit touches a served/precached file (Protocol 1)
npm run lint        # ESLint — zero new errors
npm run format      # Prettier — all files clean
git add -A
git commit          # Pre-commit hook: cache-bump guard runs first, then fast gate (gate:fast)
git push origin dev  # dev is the working branch (Protocol 43); main is release-only. CACHE_NAME must already be bumped if a served file changed (Protocol 1)
```

- **The runner must exit clean.** Any failure is a real failure — investigate before committing. Do not track or assert a test COUNT (Protocol 2a, retired): the exit status is the signal.
- **Bump `CACHE_NAME` when a staged file is in the served/precached set** (`index.html`, `sw.js`, `manifest.json`, icons, `css/`, `js/`) — the full rule and the automated commit-time guard (the staged `CACHE_NAME` must differ from this branch's own HEAD value; non-served commits bypass it) live in **Protocol 1** (`rules/deploy-and-cache.md`).
- **Never use `--no-verify`** unless the user explicitly authorizes it for a stated emergency.

---

# THE UNIVERSAL CONTRACT

These apply to every task on this repo, whatever it touches. They are here — rather than in a
subsystem note — because they need judgement and cannot be mechanised into a gate check.

---

## Protocol 3 — Source of Truth

- **Fallout game data** (items, quests, perks, locations): Source from `fallout.wiki` only. The AI acts as typist, not authority.
- **Architecture decisions:** `ARCHITECTURE.md` is canonical. Treat it as approved unless the user explicitly overrides.
- **Code beats documentation.** Every doc in this repo — this file, `ARCHITECTURE.md`, the brain dump, the code map — is a snapshot. Where a doc and the code disagree, the code is right and the doc is drift: fix the doc in the same commit and say so.

---

## Protocol 27 — Reproduce Before Fixing

Confirm the actual cause before writing a fix — reproduce the bug or trace its mechanism directly in the code. No speculative fixes: a wrong guess costs a full implement → verify → fail → re-diagnose cycle. State the confirmed root cause in the plan before implementation begins.

---

## Protocol 26 — Definition of Done

Before implementing, write explicit, testable acceptance criteria — the enumerated scenarios that must pass for the task to count as done. The task is not "done" until every criterion is verified on the real artifact (actually rendered or run), never assumed. This is the checklist form of the Protocol 8 plan-audit, and it is the primary guard against fixing one path while silently missing another.

---

## Protocol 22 — Extend Before Creating

Before introducing any new manager, service, renderer, helper, component, or state object, search the repo for equivalent functionality and extend it where reasonable. Do not create parallel implementations (e.g. `renderXNew()`, `StateV2`, a second save manager). Duplicate systems are architectural regressions.

---

## Protocol 23 — Architectural Boundaries

Respect the established layering (script load order: database → state → registry → ui → api → cloud). Rendering only renders; `state.js` owns state; the registry (`registry-core.js` + `reg_nv.js` / `reg_fo3.js`) is read-only and never touches state; `api.js` handles AI + import; `cloud.js` handles sync. Systems communicate only through established functions/interfaces — render code must not write saves, registry must not mutate state, etc.

The concrete boot order this layering follows is in `rules/file-layout.md`. The architecture-conformance baseline that freezes existing crossings is a **keep-case** under Protocol 49 — it must not be retired until the 3.0 ES-modules migration makes the boundary structural.

---

## Protocol 13 — Regression Test Required

When a bug is fixed, add a regression test in the **same commit** that would have caught it. **No bug fix ships without a guarding test — this is mandatory.** The only permitted exemption is when the bug genuinely cannot be reproduced in the test sandbox (e.g. requires a live network, real browser API, or hardware-specific behavior); in that case the commit message must explicitly state the reason.

---

## Protocol 42 — Fix Flaws Found During Testing/Verification (extends 36b)

A flaw, gap, or footgun discovered **while testing or verifying** — not only one found in shipped code — is treated exactly like a production defect: **fix it and add a regression test in the SAME commit.** This applies when the discovery happens while writing a test, running the gate, doing manual/browser verification, or building a test harness.

**Rules:**

- **Never work around a defect in the test harness and leave it unfixed.** If a test or harness step reveals a real defect, fix the defect first, then add a regression test that locks it.
- **Investigate before classifying.** Determine whether the issue is a real shipped-code path or only a harness artifact. State the verdict explicitly (in the commit/report).
- **Real shipped path affected → FIX** the code and add a test proving the fixed behavior.
- **Harness-only (no shipped path affected) → still add a test** that documents and locks the invariant, so the latent footgun cannot silently become a live bug later. Say "harness-only" explicitly; do not pretend it was a product bug, and do not skip the test.
- The added test goes in the Node runner (`tests/robco-diagnostics.js`).

**Why:** The test suite is only as honest as its response to its own findings. Silently routing around a flaw the tests exposed defeats the gate. Every flaw the process surfaces must ratchet the net finer — the same escape-ratchet principle as Protocol 36b, extended from "escaped to production / CI" to "surfaced during development."

**Precedent:** During WU-A5 verification, a harness step hit the beforeunload-flush clobber (an unguarded `robco_v8` write + reload was overwritten by the unload flush). Investigation showed every shipped reload path is guarded (`_loadingSave`/`_contextSwitching`) — so it was **harness-only** — but the latent footgun was locked with Suite 95.8 (behavioral invariant) + 95.9 (guard-order static guard) rather than worked around.

---

## Protocol 36 — Gate Parity & Escape-Ratchet

**(a) GATE PARITY:** The local gate is split at the commit/push boundary. The pre-commit hook runs the FAST subset (`npm run gate:fast`: lint, format, the Node test runner) to keep commits quick (~5–8 s). The pre-push hook runs the FULL gate (`npm run gate`, adds Playwright boot-smoke + render-check) before anything reaches origin. CI also runs `npm run gate` — parity holds at the push boundary, which is the only boundary CI observes. The local gate can never be a weaker promise than CI at that boundary.

**(b) ESCAPE-RATCHET — a causal response, not a reflexive new guard (revised via the G review, 2026-07-23):** Any failure that escapes a layer always gets a **causal response** in the SAME fix — the failure is understood and its class addressed. But **permanent enforcement** (a new gate check, hook, or suite) is added **only when ALL of** these hold: the failure can realistically **recur**; the check sits at the **correct layer**; it has **zero false positives**; it tests the **shipped artifact** (not a synthetic stand-in); and it **costs less to maintain than the recurrence risk**. **Prefer extending an existing check, or eliminating the failure class outright, over creating a new global mechanism.** When a new guard IS warranted, its record must name: the real incident; why the direct fix alone does not remove recurrence; the enforcement point; a false-positive analysis; the marginal runtime + maintenance cost; and the condition under which it can be retired (Protocol 49). The deleted skill-pointer guards are the calibration case: a synthetic demonstration was **not** enough to justify permanent machinery.

This does not weaken the two cases where recurrence is already demonstrated: **Protocol 13** (a fixed bug gets a guarding regression test in the same commit) and **Protocol 42** (a flaw surfaced during testing/verification gets locked in the same commit) still apply in full — a failure that actually occurred clears the "realistically recur" bar by definition, so a targeted regression test is presumptively warranted. The bar mainly disciplines **new global mechanisms** beyond that targeted test — the reflexive "every escape adds a check" is what changes, not the duty to lock a real defect.

**Why:** This keeps the gate self-improving **without** letting it accrete low-value machinery — defects ratchet the net finer, but only where a permanent check earns its keep. Protocol 49 (the Retirement Rule) is the complement that removes guards whose risk is gone; together they make the gate's weight track real risk in **both** directions instead of only ever growing.

---

## Protocol 49 — The Retirement Rule (the counterpart to the escape-ratchet)

_(Protocol 47 is reserved for the future GENERATED test-catalog generator; 48 is the backup protocol. This is the next free number.)_

**A guard or rule may be retired when the risk it covers no longer exists, or was never real.** Retiring it means **removing its enforcement too, not just its prose** — a rule whose text is deleted but whose gate check survives is worse than either, because the check now enforces something no session can read or reason about.

**Why this exists.** Protocol 36b (the escape-ratchet) only ever ADDS guards: every escape permanently tightens the net. That is correct and stays. But a ratchet with no counterpart means weight only ever accretes — the rulebook grows monotonically whether or not the risks it encodes are still live, and eventually the cost of reading it exceeds the value of what it protects. This is the release valve. The two protocols are deliberately asymmetric: adding a guard is cheap and automatic, removing one is deliberate and must be argued.

**How to retire (the Protocol 15 / 2a precedent):**

- State the date and the reasoning **in place**, where the protocol used to be. Do not delete the section.
- **Do not renumber and do not reuse the number** — an old cross-reference in a code comment, a commit message, or another doc must still resolve.
- **Remove the enforcement in the same commit** — the gate check, the hook, the CI step. Name what was removed.
- **Say what coverage is genuinely lost.** If the retired guard incidentally protected something real, record that plainly instead of quietly pretending the removal was free.
- Historical records are **not** obligations: a frozen release-day snapshot (e.g. a `CHANGELOG.md` version header's test count) stays exactly as it is. Retiring an ongoing rule never rewrites history.

**It cuts both ways — the keep-case is as load-bearing as the remove-case.** The **architecture-conformance baseline must NOT be retired**: its risk is still live. The layering it enforces (Protocol 23) is today a convention held up by that baseline alone, and it stays that way until the native ES-modules migration at 3.0 makes the boundaries structurally enforced by the module graph itself. Only then does the guard become redundant. Retiring it before that point would remove the only thing holding the layering up — the exact failure this rule is designed to prevent when applied carelessly.

**Worked examples on file:** *remove* — Protocol 15 (runner parity), retired once the second runner was deleted and there was no parity left to police; Protocol 2a (test-count sync), retired because the risk it claimed to cover was never real. *keep* — the architecture-conformance baseline, above.

---

## Protocol 16 — Hotfix / Rollback

If a push breaks the live site (e.g. black screen / failed boot), restore users **first** — `git revert` the offending commit, bump `CACHE_NAME` — **then** diagnose the root cause. Restore first, debug second. After a rollback, document the root cause, add a regression test (Protocol 13), and record it in the CHANGELOG before re-attempting the fix.

**The rollback is DEV-FIRST (owner decision, 2026-07-21) — there is NO emergency direct-`main` exception.** `main` stays release-only (Protocol 43): the revert lands on `dev`, clears the full gate, and reaches production by the same verified `dev → main` release path every release uses (`scripts/rollback.sh` refuses to run off `dev` and never pushes to `main`; runbook in `ARCHITECTURE.md` § "Hotfix Rollback"). **Accepted tradeoff:** this adds a little latency during an active incident, when speed matters most — the owner judged `main`-integrity worth that cost ("main would only get pushed when we know the build is good"). It is bounded because a rollback reverts to a commit that was **already gated and already lived in `main`'s history** — known-good code, not new code rushed onto prod.

When the break is contained to a flaggable networked feature, prefer the remote kill-switch over `git revert` — it is instant and needs no deploy or cache bump (Protocol 35, in `rules/auth-and-cloud.md`).

---

## Protocol 43 — Dev-Branch Workflow / Release Gating

**Branch model.** All unreleased work — every commit and every push — goes to **`dev`**. **`main` is release-only:** it receives changes **solely** through a `dev → main` merge performed at a version release (an `APP_VERSION` bump per Protocol 2). Nothing lands on `main` except releases. Production (GitHub Pages) deploys from `main`; the private staging site (Cloudflare Pages) builds from `dev`.

**Same bar on both branches — there is no "looser" branch.** Every existing rule and protocol applies **identically on `dev`** as on `main`. `dev` is held to the same standard as `main` in every respect. In particular, on **every** `dev` commit and push:

- The **full pre-commit / pre-push gate** runs and must pass exactly as on `main`: ESLint with **zero** errors/warnings, Prettier clean, the canonical Node test runner (`tests/robco-diagnostics.js`) green, plus the push-boundary browser checks — boot-smoke, render-check, the a11y baseline-diff, and the `tests/test.html` runtime audit.
- **Protocol 1** (bump `CACHE_NAME` when a served/precached file changes) applies.
- **Protocol 2** (docs updated in the same commit) applies.
- **Protocol 38** (game-agnostic feature code), **39** (UTF-8 source integrity), **41** (end-of-task cleanup sweep), **42** (fix flaws found during testing/verification in the same commit), and the **Protocol 36b** escape-ratchet all apply.
- Every other protocol (13 regression test, 14 AI-contract safety, 19 batch-before-push, 20 static source-invariant guards, etc.) applies unchanged. (Protocol 15 — runner parity — is retired; see its section below.)

**Changelog discipline on `dev`.** The `CHANGELOG.md` **chronological ordering convention is explicitly followed on `dev`**: within each category heading (Added / Fixed / Changed / Improved / Under the Hood), entries are ordered **earliest-first** — the oldest change sits at the top of its category and the newest is appended at the bottom. The **`[Unreleased]`** block is maintained on `dev` in this earliest-first order throughout development. At the `dev → main` version release, the accumulated `[Unreleased]` block **consolidates into the dated release version block** (entries preserving their earliest-first order within each category), and a fresh empty `[Unreleased]` block opens for the next cycle.

**Why:** Separating "pushed" from "released" keeps unreleased work off the public production site while a private staging build stays continuously live for real-device testing. Holding `dev` to the identical gate guarantees that whatever merges to `main` at release time has already cleared the full bar — the release merge promotes already-verified work rather than triggering a re-validation crunch.

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

The prose STYLE every changelog entry must follow is **Protocol 21**, in `rules/docs-and-library.md`.

### Changelog placement model (was Protocol 2a's second half — kept, it is not bookkeeping)

**Changelog versioning model:** Per-push test-count and cache-rev updates go on the current `## [Unreleased]` section header, **never** on a released version's entry (e.g. `v2.6.0`, `v2.0.1`) — released entries are frozen at their release-day values and must not be modified retroactively. **The one sanctioned exception is a hotfix** (see below), which actively patches a shipped version and so updates that version's header comment.

**Hotfix model (first-class changelog concept — owner directive 2026-06-30):** Every change lands in exactly one of three places, by its release status:

- **Pre-release change** (work not yet shipped) → the `## [Unreleased]` block, under the normal Keep-a-Changelog categories. At the `dev → main` release it consolidates into the new dated version block.
- **Post-release fix folded into the live shipped version** (a bug found _after_ that version is on prod, not worth a new version number) → a dedicated **`### Hotfix`** heading **inside that already-released version's block** (e.g. `## [v2.7.0]`). `APP_VERSION` does **not** change; only the cache rev increments (`-r2`, `-r3`, …) as served files change. The patched version's header comment (`<!-- … | Tests: N/N | Cache: …-rN -->`) **is** updated to the new test count and cache rev — the sanctioned exception to the frozen-entries rule above, because the shipped version is being actively patched. The `### Hotfix` heading is a recognized changelog category (guarded by Suite 97) and the in-app viewer renders it like any other category (the `hotfix` tag in `_CHANGELOG_CAT_TAGS`, guarded by Suite 62).
- **Genuinely new version** (a normal `APP_VERSION` bump per Protocol 2) → its own new dated `## [vX.Y.Z]` block.

**Chronological ordering:** `[Unreleased]` entries are kept in chronological order within each category, earliest first (ascending), appended as work lands. Preserve the Keep-a-Changelog category grouping (one `### Added` / `### Changed` / `### Fixed` / `### Under the Hood` heading each, in that standard order) — but within each category, list bullets in the order the changes actually landed, oldest at the top. Use `git log` to settle true chronology when an entry's order is unclear.

---

# SESSION & ORCHESTRATION

How a session is run, reported, and closed out. Universal — no path triggers these, so they live
here rather than in a note.

---

## Protocol 8 — Dispatch Multi-Model Workflow

Non-trivial work run via Dispatch uses a multi-stage model hand-off. This is a **THREE-model workflow — Fable / Opus / Sonnet — not a rigid two-model track.** Dispatch auto-selects the model per stage; the sessions work hand-in-hand, never in isolation.

- **Fable — Design & Creative.** The design and creative model. Reach for Fable when the work is generative or aesthetic rather than analytical or mechanical: visual/UI design and mockups; diegetic in-fiction writing (POST lines, flavor text, persona/greeting copy, ceremony beats, board names, the house voice); the plain-English changelog prose (Protocol 21); and open "what would the coolest RobCo-native version of this be?" exploration. Fable authored the approved mockups this entire overhaul was built from (the NV machine, the tempo dial, the records bay, the operator boards) — it is a real, standing part of this workflow, not an afterthought. The typical shape is **Fable designs → Opus audits/plans → Sonnet implements → Opus audits the diff.** Fable can also slot in **mid-run**, not only at the front — it plugs in wherever design/creative judgment is the bottleneck (this is consistent with the adaptive-escalation clause below: Dispatch picks the model per stage and may switch).

1. **Opus — Diagnose & Plan.** Opus investigates the actual code and git history, identifies the root cause, and writes a concrete plan: exact files, selectors, and line numbers; the change and its rationale; desktop/regression safety; and explicit verification steps. No edits in this stage.

2. **Sonnet — Review & Implement.** Sonnet first critically reviews the Opus plan against the current files (line numbers drift, selectors go stale, diagnoses can be wrong) and corrects any discrepancy. Then it implements, runs the full pre-commit gate (lint, format, Protocol 1 cache bump, the test gate, Protocol 2 docs), and verifies the user-facing result by actually rendering/exercising it at the real target (e.g. a 360/412px mobile viewport) — never from headless width measurements alone.

3. **Opus — Audit before done.** Opus independently reviews the actual committed diff and the verification evidence against the original root cause: is the issue fully resolved, nothing regressed, and is the change actually pushed to the branch it belongs on — `origin/dev` during normal work (Protocol 43), `origin/main` only at a version release — and not just a local/worktree commit? For a release, confirm it is live on the production site too. If anything falls short, loop back to stage 2. The task is "done" only after this audit passes.

**The audit is triggered from, and performed against, the DIFF — never the implementing session's own summary.** The auditor's evidence is the actual committed diff (`git show` / `git diff`), the files as they now stand, and independently re-run verification — not the report the implementing session wrote about itself. *A session's account of its work is a claim, not evidence.* An audit that reads the summary and agrees with it has verified nothing, and is the mechanism by which stage 3 gets silently skipped: the summary always says the work is done. So the trigger is the diff landing, and an audit cannot be recorded as passed unless the auditor names what it actually read.

**Adaptive escalation — Dispatch judges per situation.** The three stages are the default, not a rigid track. Dispatch selects and switches the model based on how the work is actually going, and loops are expected. Escalate to Opus whenever depth is needed: Sonnet's plan review finds the diagnosis wrong or incomplete, an audit surfaces problems, a fix fails verification or regresses, the root cause is ambiguous, or the change is high-risk. Use Sonnet for straightforward implementation and routine changes. A failed audit, or a review that finds real problems, sends the work back to Opus for deeper analysis rather than having Sonnet grind on the same wrong path. Plan → implement → audit may cycle until the audit passes.

**Plan audit before implementation (audit the audit).** In stage 1, Opus reads every file the change can touch, and the plan must explicitly enumerate every entry path, state, and edge case the change can encounter — for lifecycle/UI changes that means each load / reload / cache-clear path, each saved-state value, each tab/panel visibility state, desktop vs mobile, and brand-new vs migrated state — and state the intended behavior for each. Opus then audits its own plan against that enumeration and may not hand off until every case is covered. Plans that fix one path and silently miss another are exactly the failure this stage exists to prevent.

**Spec lock — no mid-run changes.** Lock the full specification before a Dispatch session starts. Do not send new requirements or tweaks to a session that is already running — it may commit and push before incorporating them, producing partial or inconsistent results that need cleanup passes. If the spec must change, wait until the session is idle and issue one complete follow-up; never stack instructions onto an in-flight push.

**Why:** Fable is named as a first-class stage — not folded into an implicit two-model track — because the approved mockups and the house voice come from somewhere, and a session reading a two-model protocol would wrongly believe they appear from nowhere; the review and audit stages catch plan drift and false "verified" passes before they reach the user.

---

## Protocol 9 — Dispatch Reporting

When work is run via Dispatch, never finish a task or complete a git push silently. After every completed task AND after every git push, report back to the user on Dispatch in plain English: what was done and why, the commit reference and what it changed, confirmation that the push landed on its branch (`origin/dev` during normal work; `origin/main` only at a version release — Protocol 43) and whether a reload / "Reboot Terminal" update is needed to see it, and anything the user should check. Keep it readable for a non-developer — same plain-English style as the changelog. Every time, no exceptions.

Because the Dispatch user typically cannot view the code or repo directly and reads on a phone, any push that changes user-facing behavior must be reported with an explicit "it's live — here's what changed and exactly how to test it" message: a one-line summary first, then short scannable prose (no walls of text, no code dumps or file paths) and the exact steps to test it — not just a commit summary.

**Report cadence (owner-approved, 2026-07-22 — "go with recs").** Not every intermediate landing needs its own phone buzz during a long run — but nothing is ever lost:

- **Immediate, proactive report** for a **completion**, anything needing an **owner decision**, or any **anomaly / failure**. These fire the moment they happen — they never wait.
- **Routine, all-green intermediate landings BATCH into the owner's next check-in.** A mid-marathon green step — a clean commit/push with nothing to decide and nothing wrong — is grouped and delivered at the next natural check-in instead of firing a standalone message each time, to cut phone noise during marathons.
- ⛔ **BATCHED ≠ DROPPED, and BATCHED ≠ COMPRESSED.** Batching changes only **WHEN** a routine green step is surfaced (grouped at the next check-in) — never **whether** it is reported, and never **how completely**. Every landing is still delivered **in full** when surfaced: every finding, deviation, and result relayed in the same scannable plain-English style, never shrunk into a reassuring summary. This composes with the Protocol 8 discipline that *a session's account of its work is a claim* and with the standing "report in full" rule (poll to idle, relay every finding/refusal/deviation) — summarizing-down is a known past failure and stays forbidden.

This **refines** the "every time, no exceptions" rule above rather than loosening it: the no-exceptions guarantee is on reporting **completeness**, not on message **count**. A routine green step may wait for the next check-in; a completion, a decision point, or a failure never waits; and nothing is ever dropped or compressed.

---

## Protocol 12 — No Concurrent Pushes

Never run two sessions that commit/push this repo at the same time — sequence them to avoid branch/worktree collisions. Combined with the Protocol 8 audit gate, only one change lands at a time.

> **Considered for retirement at R3 (2026-07-20) and deliberately KEPT** — a Protocol 49 keep-case, recorded here so it is not re-litigated. The candidate list argued nothing enforces it and no incident is on file. Both are true and neither is the point: this rule governs the orchestrator's dispatch decisions *daily* — it is consulted every time a second session is about to be launched — and duplicate or overlapping session launches HAVE caused real collisions on this project. It is one sentence, and it is load-bearing for how work is handed out.

---

## Protocol 19 — Batch Before Push

Do not push incrementally after each sub-task when multiple related changes are queued. Complete all queued/related work first, run the full pre-commit test gate **once**, then push a single time. Every push must have the entire test suite passing. Prefer fewer, complete, verified pushes over many partial ones.

---

## Protocol 28 — Usage Efficiency

Treat model usage as a budget — and the burden of efficiency is on the orchestrator (Dispatch), NOT the user. The user may send scattered, evolving requests across many separate messages; that is expected and fine, and the user is never required to be focused or to send a complete spec upfront. It is Dispatch's job to absorb that input, consolidate related requests, wait for a natural lull, and lock ONE complete specification before starting a session (per the Protocol 8 spec-lock) — rather than firing each fragment into a running session and causing cleanup passes. Prefer one complete, verified pass over many partial pushes; reuse a session or diagnosis that already holds the context instead of re-running it; do not spin up a new session for a trivial edit; batch related work (Protocol 19). Every avoidable cleanup pass is wasted spend.

---

## Protocol 41 — End-of-Task Cleanup Sweep

At the end of **every** task, sweep the project directory for leftover/junk files and remove them — **before** the final commit.

**Concurrency safety — delete only what THIS session created (G-review CLAIM D, 2026-07-23).** A sweep runs on a shared checkout where **another session may be live**. So the sweep may **automatically delete only files this session itself created**. Any **other** untracked file — anything this session did not create — is **SURFACED in the report, never deleted**, while another run may be live. When in doubt about which session created a file, treat it as not-yours and surface it. This closes the real incident the G blind workflow review flagged: a cleanup sweep deleting a *concurrent* session's live scratch files. An isolated task worktree may be disposed only after its owning run reaches a terminal state — there is no value in an aggressive in-place deletion of files a live sibling session still needs. (The mirror of the `eslint .` concurrency fix — CLAIM A/C/D — which scopes the gate lint to the git-tracked manifest so a sibling's untracked file can't fail an unrelated gate.)

**Sweep for** (subject to the concurrency-safety rule above — surface, don't delete, anything this session did not create):

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

## Protocol 48 — Back Up the Local-Only Artifacts

_(Protocol 47 is reserved for the future GENERATED test-catalog generator referenced in the 3-class library model — see `rules/docs-and-library.md`. This is the next free number.)_

Three classes of artifact exist **only on the owner's local machine** and are **not on GitHub**: `library/` (the local-only Claude reference docs — brain dump, code map, test catalog, manifest), `planning/` (the whole gitignored build-queue tree — plans, audits, slates, mockups), and the orchestrator's persistent **memory** folder (the agent's `memory/` under the Claude session store). The public repo gitignores all three, so **a machine loss destroys them with no recovery path** — they exist nowhere else.

A private GitHub repo (`zerckzzyHD/_RobCo-Archive`, confirmed PRIVATE) is the only backup. Its working copy lives at `C:\Dev\!RobCo\_RobCo-Archive\`, and `sync.ps1` in that folder refreshes it: it mirrors `library/` and `planning/`, **discovers** the memory folder at runtime (no hardcoded GUIDs), stamps the archive with the public repo's current HEAD, then commits and pushes. It **fails loudly (non-zero exit, nothing pushed)** if any source is missing/empty or no memory folder is found — it never pushes a silent partial backup.

**How it's run:** from a shell that can see the memory store. The PowerShell *tool* in this harness runs in a sandbox that cannot see `AppData\Roaming\Claude`, so run it via the Bash tool: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Dev\!RobCo\_RobCo-Archive\sync.ps1"`. Test hooks: `-MemoryBase <path>`, `-NoPush`. (Full run-environment detail: the `backup-archive-repo` memory.)

**Running the sync is the AGENT's obligation, not the owner's.** The owner is phone-first and never sees terminal output — he must never have to remember this. So the session running the work owns it: when the local-only artifacts have changed, the session runs `sync.ps1` **itself** (via the Bash tool), and if it genuinely cannot, it **says so in its final report** so the orchestrator can surface it. Silently skipping the sync is not an option.

**When the session MUST run it** — concretely, not vaguely:

- After **any** change to a `library/` or `planning/` doc.
- After **any** memory update (a new/edited/deleted memory file).
- At the **end of any round, re-pin, or multi-step task pass** — before considering the task done — even if you believe nothing local-only changed, as a catch-all.
- Whenever the pre-push nudge fires (below).

**Capability — a host session CAN run it (verified 2026-07-18).** From the **Bash tool** (shell user `kadyn`), `node`/`powershell.exe` see the memory folder (`AppData\Roaming\Claude\local-agent-mode-sessions\…\agent\memory`), the archive working copy, and `library/`/`planning/` — so `sync.ps1` runs successfully and the backup is effectively **automatic**, with the nudge as its trigger. The **one caveat**: run it from the **Bash tool only**, never the **PowerShell tool** — the PowerShell tool's sandbox (user `rog-ally\kadyn`) cannot see `AppData\Roaming\Claude`, so memory discovery there finds nothing and the sync fails loudly. This is the "one shell can see memory, another can't" quirk: the Bash-launched shell is the one that can. If a future host/shell genuinely cannot reach the archive or the memory store, that is the case where the session reports upward instead (per the obligation above).

**Automated nudge — a fail-safe AGENT trigger, never a blocker.** The pre-push hook runs `node scripts/backup-nudge.js` **after** the gate, suffixed with `|| true`. It is a fail-safe reminder, never a gate (Protocol 33 DNA): it can never fail or block a push (it always exits 0, and `|| true` is a second guarantee), and if it cannot determine state for any reason — the private archive isn't present, a path doesn't resolve, git is unavailable, anything unexpected — it stays **silent** and lets the push proceed (a developer on a machine without the private backup sees no difference at all). When the local-only artifacts have changed since the archive's last sync it prints a short message **addressed to the session** (not the owner) instructing it to run the sync, with the exact Bash-tool command. The nudge is a backstop trigger only — the hook must stay fast and side-effect-free, so it never runs the sync itself; the **session** does, per the obligation above. Guarded by Suite 237.

**Why:** these three artifact classes are load-bearing for every future session (the brain dump, the code map, the planning queue, the orchestrator's own memory) yet exist on exactly one disk. The earlier version of `sync.ps1` hardcoded a session-GUID path that could silently back up **nothing** when the GUID changed — a backup that quietly protects nothing is worse than none, because it removes the pressure to notice. The rewrite fails loudly instead; making the sync an agent obligation (with a nudge trigger and an upward-report fallback) means the backup happens on its own instead of depending on a phone-first owner remembering a terminal command he never sees.

**`planning/` is ARCHIVE-class → additive-only in the backup.** Because `planning/` is frozen point-in-time snapshots (the 3-class library model), the sync mirrors it **additively for `planning/` only** — once a planning file is captured it is **never removed** from the archive, even if it later disappears locally. So the owner can safely **clear `planning/` locally** after a document has served its purpose: the archive (and its git history) keeps it forever, and future sessions recover it from there. One consequence to remember: a **rename or reorg** of `planning/` reads to an additive mirror as *delete-old + add-new*, so the archive would otherwise accumulate both the old and new paths indefinitely. Reconcile a reorg **once, deliberately**: run the sync, then prune the stale old-path copies from the archive working tree and commit that — a working-tree tidy, not a loss of record (git history still holds the old paths).

---

## Protocol 50 — Queue Currency: Write Plans Where They Live

A plan that lives only in the orchestrator's memory is not planned, it is remembered — and it
decays or gets lost the moment a session ends. The owner's own words: *"everything planned should
live in queue, not just remembered by you."* Two parts, deliberately paired — the first is the
Stage-2-style "prose an agent must remember" (see the governance-trim R5 candidate list, which
argues rules like this should eventually become mechanised enforcement instead); the second is
that mechanised backstop, built now rather than left as an aspiration.

**(a) The standing rule.** Any decision or plan actually reached in a conversation — new work
identified, a scope change, a re-ordering, an item closed or reopened — is written into `QUEUE.md`
**in the same session it is decided**, not batched for a later pass or left for the owner to ask
about. This applies whether or not the session's task otherwise touches any file in the repo — a
purely conversational planning session still owes a `QUEUE.md` update before it ends.

**(a-form) Every recorded entry needs a home or a stated earn-condition.** It is not enough that a
decision *reaches* `QUEUE.md` — the entry must land somewhere honest. Every recorded item carries
**either** a version/section that owns it (or a binding to a named item) **or**, when it has neither
yet, an explicit reason it is unversioned AND the concrete condition that would earn it a slot.
"Parked", "someday", or "revisit later" with no stated condition is not acceptable — an entry with no
home and no earn-condition is the vague drawer this rule forbids. This is what let `QUEUE.md`'s
"Unversioned" drawer be emptied in minutes on 2026-07-21: both items already named the condition that
would place them, so placing them was mechanical. The rule is mirrored in `QUEUE.md`'s own Unversioned
section (its point of use), but lives here too so it survives any future restructure of that file.

**(a-date) Every recorded decision carries its date, and every date is DERIVED, not remembered.** A
decision or plan written to the queue records the date it was made. A later reinforcement or revision
of it carries **its own** date — it is **not** folded silently into the original. That distinction is
load-bearing: "decided once" and "decided, then re-examined and it held" are different strengths of
evidence, and merging the two timestamps destroys the second (a rule-out with two independently dated
reasons is much harder to re-litigate than one). "Accurate" is the operative word: dates come from
**git, the changelog, or the actual event** — never from a session's sense of elapsed time. This
clause exists because the orchestrator's felt-time is unreliable **by construction** — a Dispatch
session is left running continuously on the owner's machine for days, so conversation position and
wall-clock are fully decoupled (a one-message gap can be eight hours), and it has repeatedly
mis-stated timescales to the owner (most recently calling it late at night when it was 1:40 pm). When
a date genuinely cannot be derived, write "date not derivable" rather than inventing one. The
flagship cautionary case is the achievements rule-out (QUEUE.md, 2.9.0 gameplay set): a well-made
decision whose *reasoning evaporated* while the bare outcome survived — exactly what dated,
reason-bearing records prevent.

**(b) The automated backstop — a fail-safe queue-drift NUDGE.** `scripts/queue-drift-check.js`,
wired into the pre-push hook exactly like Protocol 48's backup nudge (`|| true`, never blocking),
lists every `type: project` memory in the orchestrator's memory store and flags the ones that
don't appear referenced in `QUEUE.md`. Memories of type `project` are, by definition, ongoing work
or goals — exactly the class that should have a queue entry, so a memory that doesn't read like
`QUEUE.md` has ever heard of it is exactly the drift (a) exists to prevent. Same fail-safe DNA as
Protocol 48 throughout (Protocol 33): it can **never** fail or block a push, and on any machine
where the memory store is absent, invisible to the shell, or unparsable, it stays **silent** and
lets the push proceed — a machine with no memory store sees no difference at all.

**The match is a heuristic, not a hand-maintained count.** Nothing here is synced by hand (the
exact failure Protocol 2a was retired for) — every run re-reads the live memory files and the live
`QUEUE.md` text fresh, computing distinctive words from each memory's description and requiring a
plurality of them to appear in `QUEUE.md` before treating it as referenced (a single generic word
match — e.g. "project" itself — was measured to false-clear an unrelated memory by coincidence in
a document this size, so the bar is 3 hits, or all of a memory's tokens when it has fewer than 3).
It is deliberately biased toward flagging: a missed real gap defeats the whole point, while a
noisy false flag just costs a skim.

**The explicit exception, recorded rather than assumed.** A memory that genuinely isn't
queue-worthy is marked so on purpose — `queue_status: not-applicable` (or `na` / `skip`) in its
frontmatter `metadata` block — so the exception is a decision on file, not silent non-coverage.
Guarded by Suite 242, including a red-then-green proof that a fabricated unreferenced memory is
actually flagged (not just that the script never crashes) and that an exempt one is not.

**Why the memory store, not something inside this repo.** The memory store lives outside both the
public and the private-archive repos (`AppData\Roaming\Claude\local-agent-mode-sessions\…`) and is
not guaranteed to exist on every machine that pushes here — so this check must degrade gracefully
by construction, the same constraint Protocol 48's discovery already solved, and reuses its shape
(and its `ROBCO_MEMORY_BASE` override) rather than inventing a second discovery mechanism.

**(c) The gap the backstop does NOT close — and why no guard is coming for it.** Rule **(a) already
covers the conversation case in prose** ("whether or not the session's task otherwise touches any file …
a purely conversational planning session still owes a `QUEUE.md` update before it ends"). What's missing
is only the *enforcement* half — and it **cannot exist**. The backstop (b) compares **memory ↔ queue**; a
decision that lived only in a conversation and never became a memory is invisible to it, and the
highest-risk case is a purely conversational session that never touches the repo, so it never reaches the
pre-push hook where any nudge fires. **A script cannot read a conversation, and the sessions most likely
to drop a decision never push.** Proven the day 50 shipped: the DeepSeek roster decision (see item G in
`QUEUE.md`) sat unrecorded for hours. So the conversation ↔ queue gap is **behavioural with no honest
automated backstop** — stated here rather than given a guard that pretends, because building a
conversation-scraping check would be exactly the "guard that pretends" Protocol 49 warns against. Do not
add one. The rule in (a) stands; adherence is the mechanism.

---

## Protocol 51 — Dispatch Authority Boundary (proposals are hypotheses · memory is a locator · dissent is surfaced)

Three clauses, one principle: **Dispatch's authority is bounded, and its outputs are claims until
verified.** This is the governance bundle the G blind workflow review earned — and it was earned by
two real anti-pattern incidents Dispatch's own designs produced (a **parallel claim-ledger** and a
**hand-maintained manifest**), each caught only because a repo-aware session pushed back. Enforced at
the **edge** — the brief template, the planning output, and the independent audit — **not** by a new
bespoke code guard: a semantic guard would only prove that headings exist, never that a hypothesis was
actually tested.

**(a) Proposals are hypotheses.** Dispatch may bind owner-stated outcomes, constraints, and decisions.
Any **mechanism, architecture, repository fact, path, or work status ORIGINATING from Dispatch is a
hypothesis until verified** against the repository, queue, or other primary source. A repo-aware
planning/implementation session must record whether it **ACCEPTED, CHANGED, or REJECTED** each material
Dispatch-origin hypothesis **before implementing**.

**(b) Memory is a locator, not evidence.** Orchestrator/Dispatch memory is a **locator and historical
aid, never evidence of current repository state** — resolve paths, casing, queue status, hashes, and
"live" claims **deterministically** (read the repo/queue/git) before reporting them. A memory that names
a file, flag, or status is a pointer to check, not a fact to repeat. (This is the same discipline the
memory-instruction preamble states — "verify it still exists before recommending it" — raised to a
standing authority-boundary for Dispatch's own reporting.)

**(c) Dissent is surfaced, never smoothed.** When a planning/implementation/audit session **rejects a
Dispatch design or contradicts a prior claim**, it records that in a grep-able `### DISSENT` block in its
own output, and **Dispatch must surface such blocks to the owner** rather than paraphrasing them away.
The record of a disagreement is owned by the session that raised it, in a form Dispatch cannot quietly
soften — this is the structural anti-burial mechanism the whole review turns on. (The platform limit
noted in the G ledger still applies: Dispatch is structurally the transcriber here, so this reduces the
asymmetry, it does not eliminate it — the verbatim originals still live in the owner-visible log.)

**Why:** Dispatch consolidates scattered owner input and dispatches the work, so it is structurally
positioned to (i) turn its own misreading into a perfectly-executed wrong spec, (ii) report a stale
memory as current fact, and (iii) bury a sub-session's dissent in paraphrase. (a)/(b)/(c) close each in
turn — at the edge, where a session with real code access is the enforcer, not Dispatch policing itself.

---

# RETIRED PROTOCOLS

Retired in place. Numbers are never reused and never renumbered, so every existing
cross-reference still resolves here (Protocol 49).

---

### Protocol 18 — Memory Maintenance — RETIRED (2026-07-20, roadmap item R3)

**RETIRED.** This protocol read: *"Keep durable project facts current (repo path, APP_VERSION, cache rev, architecture decisions, recurring engineering gotchas). Do not store transient task state or temporary implementation details."*

**Why it was retired.** It is generic agent guidance, not a project rule — the same instruction (keep memories current, don't store transient task state) already arrives with every session in the agent harness's own memory instructions, in more detail and closer to the tool that acts on it. Repeating it in the rulebook teaches nothing project-specific and costs every session the read. **Coverage lost: none** — the rule still reaches every session, just from its natural home.

**Enforcement removed: none existed.** No gate check, hook, or test ever referenced this protocol; it was prose only.

---

### Protocol 2a — Test Count Sync — RETIRED (2026-07-20, roadmap item R1)

**RETIRED.** This protocol required the hardcoded assertion count to be hand-synced across eight-plus locations (`CLAUDE.md`, `RULES.md`, `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `tests/robco-diagnostics.js`, `tests/test.html`, `library/TEST_CATALOG.md`) in the same commit as every test addition or removal.

**Why it was retired.** Two external reviews condemned it independently, from opposite directions — one as ritual that protects no behaviour, the other as a tax that actively penalises good testing hygiene. Two reviewers with opposing agendas landing on the same rule is the strongest signal this process produces. The reasoning the owner approved: **the test count is inventory, not confidence.** Repeating a number in eight files teaches no engineering fact and guards no behaviour — the runner's exit status is the only thing that ever mattered. A number that must be hand-copied to eight places on every test change is a rule that makes the right thing expensive.

Per the Protocol 15 precedent, the number is **retired, not reused, and not renumbered**, so every existing `Protocol 2a` cross-reference still resolves here. Its second half — the changelog placement / hotfix / chronological-ordering model — was **never bookkeeping** and survives, above, under Protocol 2.

**What was removed with it** (retirement means removing the enforcement, not just the prose — Protocol 49): Suite 28's cross-file count assertions and its end-of-run count reconciliation, which compared the runtime test total against the hand-synced `CHANGELOG.md` header. That reconciliation also incidentally caught a *silently dropped suite* — real value, now gone with it. It is recorded honestly rather than quietly replaced: the drop-detection was entirely parasitic on the hand-synced number, and a **generated** count could not have preserved it (a self-updating baseline regenerates to match whatever ran, so it can never notice that less ran). If suite-drop detection is wanted back, it needs a mechanism that does not route through a count. `tests/test.html`'s `Suites: N` marker (Protocol 40) is deliberately **kept** — see that protocol for the reasoning.

**No count is maintained anywhere.** Where a doc needs to describe the suite, describe it qualitatively.

**R3 follow-up (2026-07-20) — the counts are now GONE, not merely unmaintained.** The retirement above originally left the per-suite `// N tests` comments sitting in `tests/robco-diagnostics.js` and told sessions not to trust them. That was half a fix: it cured the sync tax but kept the lie, because an unmaintained number still reads as fact to the next session. All 152 standalone `// N tests` comments and every inline `(N tests)` / trailing `N tests.` narration fragment have been **stripped** from the runner, and the same strip was applied to `library/TEST_CATALOG.md`, `library/CODE_MAP.md`, and `library/BRAIN_DUMP.md`. Suite 28 now guards the convention against returning.

**Deliberately kept:** `tests/test.html`'s `Suites: N` marker (Protocol 40) — that is a *self-consistency* check that the file declares what it actually runs, not a hand-synced cross-file count; and the frozen `Tests: N/N` headers on **released** `CHANGELOG.md` version blocks, which are release-day history, not an obligation (Protocol 49).

---

## Protocol 15 — Test-Runner Parity — RETIRED (2.8.5 U-B3, 2026-07-12)

**RETIRED.** This protocol policed the two-runner duplication (Node + PowerShell). The PowerShell mirror (`tests/robco-diagnostics.ps1`) was **deleted** in 2.8.5 U-B3 after an evidence-backed review found it caught **nothing** the Node runner cannot: its "behavioral" tests shelled out to `node` (reconstructing the same `vm`-sandbox harness in a string), and its static tests were byte-identical UTF-8 file greps — at ~13× the runtime cost (≈22 s vs ≈2 s) and double the authoring cost of every test. With one runner there is no parity to enforce. This is the project's first deliberate protocol **retirement**; the number is not reused. The former parity checks are inverted into deletion-regression guards (Suites 28, 31.2, 50.6, 128.5) so the mirror cannot silently return.

---

## Prohibited Patterns

The catastrophic ones, in one place. Each is also restated in its subsystem note.

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
| `linkWithRedirect` / `signInWithRedirect` on this project   | GitHub Pages can't host the redirect handler; mobile blocks the cross-origin iframe fallback (storage partitioning) → `getRedirectResult` returns `null`, sign-in silently fails. Full mechanism → **Protocol 30** |
| Unconditional `signInAnonymously` on boot                   | For a Google-linked user, an unguarded call mints a fresh anonymous user and wipes the session on every reload (the 5c-ii clobber bug) — gate on `auth.authStateReady()` + `!auth.currentUser`. Full rule → **Protocol 31** |
| Writing a non-ASCII file via PowerShell (`Set-Content` / `Out-File` / string + `Set-Content`) | Silently double-encodes every non-ASCII char (`—`→`â€"`, `▲`→`â–²`, `⚠`→`âš `) — use the Edit tool or Node `fs.writeFileSync(path, content, 'utf8')`. Full incident + Suite 90 guard → **Protocol 39** |

---

## Architecture Quick Reference

**Script load order** — in `rules/file-layout.md`, inside the machine-checked LOAD-ORDER-GUARD block.

**AI contract:** Tri-Node JSON schema (`narrative`, `state`, `modal`). The AI is locked to `responseMimeType: 'application/json'`. It cannot produce freeform text. Rules in `rules/ai-contract.md`.

**State persistence:** `localStorage` key `robco_v8` (the synchronous authority). Debounced 500ms writes with dirty-check. Flushed on `beforeunload` **and** `visibilitychange → hidden` (the reliable mobile path). Also mirrored fire-and-forget into the IndexedDB `'campaign'` store (key `'live'`, P8 durability shadow) so an Android localStorage eviction that spares IndexedDB is recovered on the next boot — recovery-only, so a stale mirror never overwrites a newer local value (Protocol 34; state.js `mirrorLiveContainer`/`restoreLiveContainerFromIdb`). Rules in `rules/state-and-save.md`.

**Test suite:** the single canonical Node runner `tests/robco-diagnostics.js`, run by the pre-commit hook (via `npm run gate:fast`) and CI. No test count is tracked anywhere. Rules in `rules/testing-and-gates.md`; per-suite catalog in `library/TEST_CATALOG.md`.
