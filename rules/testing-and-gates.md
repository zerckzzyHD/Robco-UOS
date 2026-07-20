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
Full per-suite catalog — every suite's coverage, every work-unit's build narration — lives in
`library/TEST_CATALOG.md` (gitignored, local-only, read on demand).

**No test COUNT is tracked anywhere** — Protocol 2a is retired. The runner's exit status is the
signal.

---

## Protocol 20 — Static Source-Invariant Guards

Critical CSS rules, render-function class/markup contracts, and service-worker invariants must each be covered by a static test that fails if the safeguard is removed in a refactor. Lost-safeguard regressions (a dropped class, an overridden CSS rule, `skipWaiting` in install) must surface as a gate failure, not reach production.

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

## Related notes

- Rendering verification (Playwright render-check): `rules/ui-and-mobile.md` (Protocol 10)
- The AI schema round-trip test obligation: `rules/ai-contract.md` (Protocol 14)
- Service-worker invariants worth a static guard: `rules/deploy-and-cache.md`
- Suite 220's doc-reference guards: `rules/docs-and-library.md` (Protocols 45, 46)
