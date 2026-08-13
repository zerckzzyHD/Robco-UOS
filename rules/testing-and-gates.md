# Subsystem note — Tests, Guards & the Diagnostic Shell

> **Load this when touching:** anything under `tests/` or `scripts/` · `js/dev/test-console.js` ·
> `.github/workflows/` · any new `RobcoEvents` event or view-once flag · any safeguard you want
> to survive a refactor.
>
> Universal rules live in `CLAUDE.md` — including **Protocol 13** (regression test required),
> **Protocol 36** (gate parity + escape-ratchet), **Protocol 42** (fix flaws found during
> testing), and **Protocol 49** (the retirement rule). This note carries the surface-specific rest.

---

## The test suite (reference)

A large behavioural + static-invariant suite in the single canonical Node runner
`tests/robco-diagnostics.js`, run by the pre-commit hook (via `npm run gate:fast`) and CI. (The
former PowerShell mirror `tests/robco-diagnostics.ps1` was deleted in 2.8.5 U-B3 and Protocol 15
— runner parity — retired; the mirror caught nothing the Node runner cannot, at ~13× the cost.)
Full per-suite catalog — every suite's title + the runner's own header-comment narration — lives
in `library/TEST_CATALOG.md` (gitignored, local-only). It is **generated**, not hand-maintained
(Protocol 47, `rules/docs-and-library.md`): `npm run test-catalog` regenerates it and
`npm run test-catalog:check` (wired into `scripts/gate.js`) fails the gate if it drifts from what
the runner would currently produce.

**No test COUNT is tracked anywhere** — Protocol 2a is retired. The runner's exit status is the
signal.

### Suite 248 — QUEUE.md structural integrity + the roadmap board (QR1 Phase 0)

Suite 248 reads the **private** planning tree, so every assertion sits inside `if (PLANNING_OK)`
and SKIPs — loudly, printing `planningPaths.describe()` — on a checkout without the archive (the
246.6 precedent). On a public clone these do not run at all; that is by design, and the skip is
printed rather than silent so it can never be mistaken for a pass.

| Assertion | What it locks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **248.1** | Every `QUEUE_LOG.md#anchor` reference in `QUEUE.md` resolves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **248.2** | Item IDs are unique — "never renumber, never re-letter, never reuse".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **248.3** | ⏳ **SHADOW RATCHET.** Closed items still carrying their full account in `QUEUE.md` (rather than a one-line pointer to `QUEUE_LOG.md`) may not **grow** past the measured baseline of **8**. It deliberately does **not** assert `=== 0`: that would be red on arrival for eight pre-existing reasons this phase is not fixing, and a test that is red on arrival teaches sessions to ignore it. ⛔ **It becomes `=== 0` at Phase 3**, once the accounts have migrated. The rule is imported from `scripts/roadmap-generate.js` (`closedDiscipline`), never retyped, so the board and the ratchet cannot disagree about what a violation is.                             |
| **248.4** | ⭐ **PERMANENT.** No ID-bearing `###` heading is silently dropped: the parser's ID count must equal a raw scan of the source over the **same exported `ITEM_ID_RE`**. The Protocol 13/42 regression lock for the 2026-08-13 sub-lettered-ID defect (`OM2a`/`OM2b` parsed as `id:null`; 205 real items, parser saw 203). Its Protocol 36(b) five-bar justification and Protocol 49 retirement condition are inline at the assertion.                                                                                                                                                                                                                                      |
| **248.5** | **Position beats presence.** A heading that opens with an open-status glyph and records a finished half later in its text (the live `SEC2` shape) must not classify as done — for both `detectStatus` and the roadmap banding.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **248.6** | `package.json` exposes `roadmap` + `roadmap:check`; `BLIND_REASONS` enumerates 8 described reasons; and each fixture-reachable reason actually **fires** with its own key and names itself without leaking a partial item list. This is the Protocol 42 lock for `no-title`, which the blind drills found **unreachable** (`parseQueue` defaults the title, so a check against it could never fire). Asserting the keys merely _exist_ would not have caught that — only firing them does. Two reasons (`parser-unreachable`, `extraction-regression`) need the parser module stubbed and are drill-verified out of band; that limit is stated rather than papered over. |

⛔ **`roadmap:check` is deliberately NOT wired into `scripts/gate.js`.** That is Phase 3 — wiring it
now would red the gate against the un-migrated queue.

### The doc-only push fast path (CPB4)

The gate is split at the commit/push boundary (Protocol 36): the pre-commit hook runs
`gate:fast`; the pre-push hook runs the FULL gate (`npm run gate`), which adds the browser checks
(boot-smoke, render, a11y, `test.html`, save-survival, offline-first). **CPB4** adds a third mode
for the push boundary only. `scripts/gate-scope.js` reads the git pre-push payload (the hook's
stdin) and prints `DOCS_ONLY` **only when it can prove every changed file across the pushed range
is a doc** (`*.md` anywhere, or under `planning/**`); the pre-push hook then runs `npm run
gate:docs` (`gate.js --docs`) — lint + format + the Node runner + the static currency checks, and
**no browser check at all**. Any diff touching app code (`index.html`, `css/**`, `js/**`, `sw.js`,
`tests/**`), a mixed doc+code diff, a renamed/moved/deleted code file (surfaced via `git diff
--no-renames` as delete-old + add-new), or **any** uncertainty (empty payload, unresolvable range,
git failure) → the classifier prints `FULL` and the complete gate runs. It is **fail-closed**: it
weakens the gate only where it can positively prove the change is documentation. The Node runner
still runs on `gate:docs` because several suites guard _doc_ invariants (QUEUE structure, changelog
headings, note-header routing, catalog/TOC/code-map currency). Guarded by **Suite 253** (static
wiring + unit classification + a real-git-repo integration proof of every case). Same gate-scoping
principle as Protocol 41's `eslint .` → git-tracked-manifest fix, applied to the push boundary.

### Cross-repo naming domains (ND1)

`tests/naming-domains.json` is the reserved-terms list shared with the private control plane: which
vocabulary belongs to which repo (`RobcoEvents` is this app's bus; "ledger events" are the control
plane's records), plus the explicitly **shared** terms that must never be reserved. It is
**duplicated byte-identical** into `_RobCo-Control/code/test/naming-domains.json` — the repos share
no package — so **edit both copies in the same change**. Enforced by **Suite 257** here (scans
`js/**`, comments stripped, for the control plane's reserved terms) and by test group **ND** in the
control repo (the mirror-image scan). Each repo scans only its OWN source; there is no cross-repo
runtime coupling. Both guards carry a red-then-green proof (a synthetic violating source must be
flagged) and an anti-over-reservation proof (every shared term must stay un-flagged), and both
degrade to "sync unverified" rather than failing when the sibling checkout is absent. Design →
`ARCHITECTURE.md#cross-repo-naming-domains`.

---

## Protocol 20 — Static Source-Invariant Guards (LAST RESORT — narrowed 2026-07-20)

**A behavioural test is the default; a static source assertion is the exception.** Critical CSS rules, render-function class/markup contracts, and service-worker invariants must each be covered by a test that fails if the safeguard is removed in a refactor — and wherever a behavioural test can reach the invariant at all, that test must assert the app **behaves** correctly (render it, run it, exercise the path), not that the source reads a certain way.

**A static source assertion is permitted only where a behavioural test genuinely cannot reach the invariant, and the test must state why** — one line at the assertion naming what blocks the behavioural route. Real cases exist and stay: the UTF-8 source-integrity scan (Protocol 39), the deleted-runner and deleted-file guards, load-order/boot-chain declarations, and anything whose subject genuinely _is_ the source text rather than a runtime behaviour.

**Why it was narrowed.** As originally written this protocol **mandated** static guards for render contracts, and sessions correctly followed it — so the gate filled with tests asserting that code _said_ it did the right thing rather than that it _did_. That is not doc drift; the protocol caused the blindness. The failure is not hypothetical: a guard was found asserting that a render path _claimed_ to escape dangerous input, which would have passed unchanged had the escaping actually been broken. A test that reads the source can only ever prove the source reads a certain way. Lost-safeguard regressions (a dropped class, an overridden CSS rule, `skipWaiting` in install) must still fail the gate — this narrows **how** they are caught, not **whether**.

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

The `Suites: N` marker is checked against the suites actually executed, in this file alone — see the enforcement note above. (It survived the Protocol 2a retirement deliberately: it is a self-consistency check inside one file, not a cross-file count sync.)

---

## Protocol 44 — Every Hard-to-Trigger Feature Ships a Diagnostic Shell Trigger

Any new **ambient, conditional, time-gated, view-once, or otherwise hard-to-reproduce** feature — a new `RobcoEvents` event, a new AmbientRuntime observer/state effect, a new boot flavor, a new ceremony/view-once MetaStore flag, a new feedback animation — must register a **Diagnostic Shell tool** (`DIAGNOSTIC_SHELL_TOOLS` entry, `js/dev/test-console.js`) that fires it on demand, **in the same commit**. The tool declares which event(s)/flag(s) it covers via its `triggers: [...]` metadata.

**Why:** these features are exactly the ones that can't be exercised by normal play in a test pass, so they silently rot. A guaranteed on-demand trigger keeps every one of them verifiable, and keeps the Diagnostic Shell a complete control surface rather than a stale subset.

**Enforcement (self-improving — Protocol 36b):** a gate suite cross-references (a) every `RobcoEvents.emit('<name>', …)` string literal in `js/*.js` and (b) the known view-once MetaStore flags (`robco_bay_opened`, `robco_last_seen_version`, `robco_booted_before`) against the union of all `triggers: [...]` arrays in `DIAGNOSTIC_SHELL_TOOLS`. A feature whose event or flag has **no** registry trigger **fails the build**. A tiny curated allowlist covers the deliberately-internal events — e.g. `runtime.state` is infra (already exercised as a side effect of the FORCE TRANSITION / WAKE → ACTIVE tools), not a standalone user-facing feature — so the guard is precise, not noisy.

**Tiering still applies (Protocol 22/34).** A trigger is not exempt from the Diagnostic Shell's own tier rules just because it exists to test something: if firing the real entry point would write campaign state (directly, or indirectly via a reactive subscriber — confirm by reading the actual subscriber body, Protocol 27, not by assuming the emit call itself is inert), the tool is `tier: 'staging'` + `destructive: true` like any other state-mutating tool, never `'prod'`. A worked example: seven `RobcoEvents` bus events have a reactive `state.js` auto-log subscriber that appends to `state.eventLog` on every fire — their triggers are `tier: 'staging'`, not `'prod'`, even though most bus-event triggers are safely non-destructive.

---

## Opt-in guard — cloud serialization (`npm run cloud-check`)

`scripts/cloud-serialization-check.js` is the **shipped resolution** of QUEUE.md item A3 (owner decision
2026-07-21). It is **opt-in / un-gated** today and needs no emulator/JVM: pure Node `vm`. It
**self-derives** the field set by extracting and evaluating the real `let state = { … }` literal from
`js/core/state.js` (the same technique as Suite 46.17), builds the `robco_v8` cloud write payload, and
flags any value Firestore would silently strip (`undefined`) or reject (a directly-nested array `[[…]]`),
plus a soft 1 MB doc-size check. A field added to that literal is scanned automatically — **do not**
replace this with a hand-typed field list (the exact rot A3 exists to prevent). A built-in positive
control fails the run if the scanner stops flagging known-hostile values, and there is **no
conditional-skip path** — if literal extraction ever fails it fails loudly, never silently green. It
**models** Firestore's write rules rather than verifying against a real Firestore, and sees the field
_shape_, not runtime values — so it reduces the risk without closing it; the real-Firestore verification
is the **optional post-2.8.5 item A4** (needs a JDK/JRE 11+ + dev-only `firebase-tools`). Safe to promote
into `scripts/gate.js` whenever wanted (it has zero external dependency); left opt-in only per the owner's
2026-07-21 instruction.

## Related notes

- Rendering verification (Playwright render-check): `rules/ui-and-mobile.md` (Protocol 10)
- The AI schema round-trip test obligation: `rules/ai-contract.md` (Protocol 14)
- Service-worker invariants worth a static guard: `rules/deploy-and-cache.md`
- Suite 220's doc-reference guards: `rules/docs-and-library.md` (Protocols 45, 46)
