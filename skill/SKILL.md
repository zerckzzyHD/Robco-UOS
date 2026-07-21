---
name: robco-uos
description: Engineering protocols and workflow for the RobCo U.O.S. project — the Fallout-themed PWA terminal at C:\Dev\!RobCo\!RobCo-UOS, live at zerckzzyHD.github.io/Robco-UOS. Use this skill for ANY work on RobCo U.O.S. — code changes, debugging, tests, deploys, or planning. It is a portable summary of the mandatory gate, the multi-model workflow, the branch model, the cache policy, and the data-safety rules; the canonical, always-current rules live in the repo (CLAUDE.md + rules/*.md).
---

# RobCo U.O.S. — Engineering Protocols (portable summary)

Use this for all RobCo U.O.S. work. This skill is the **portable summary** so any
session follows the workflow even before opening the repo. **The canonical,
always-current rules live in the repo — read them first when you are in it:**
`CLAUDE.md` (the universal contract, checked in) → the `rules/*.md` subsystem note
for the surface you are touching (via CLAUDE.md's retrieval map) → `ARCHITECTURE.md`.
Where this summary and the repo disagree, **the repo wins** and this skill is drift.

> **This skill's own source is tracked in the repo at `skill/SKILL.md`, and the gate
> guards it (Suite 243) so it cannot silently drift from the rules again.** The
> INSTALLED copy you are reading is a read-only cache; only the owner can refresh it,
> via the desktop app's **Settings › Capabilities**. If you ever find the installed
> skill disagreeing with `skill/SKILL.md` or the rules, trust the repo and tell the
> owner to re-install.

## The repo

- Path: `C:\Dev\!RobCo\!RobCo-UOS`. Live (production): https://zerckzzyHD.github.io/Robco-UOS/
  (GitHub Pages, deploys from `main` via GitHub Actions, gated on CI). A private
  staging site builds from `dev` on Cloudflare Pages.
- Vanilla HTML/CSS/JS PWA, global-scope scripts (no build step, no modules) loaded via
  ordered `<script>` tags in `index.html`. Firebase (anonymous + Google auth, Firestore,
  App Check). Gemini API for the AI Director.

## Branch model (Protocol 43)

- **All unreleased work goes to `dev`.** `main` is **release-only** — it changes solely
  through a `dev → main` merge at a version release. Production deploys from `main`;
  staging builds from `dev`.
- **`dev` is held to the identical bar as `main`** — the full gate, cache bumps, and docs
  discipline apply on every `dev` commit and push, not just at release.

## Multi-model workflow (Protocol 8 — mandatory for non-trivial work)

- This is a **THREE-model hand-off — Fable / Opus / Sonnet — not a two-model track.**
  - **Fable — design & creative.** UI/visual mockups, diegetic in-fiction copy, the
    plain-English changelog voice. The approved mockups this overhaul was built from are
    Fable's. It can slot in at the front OR mid-run wherever design judgment is the bottleneck.
  - **Opus — diagnose & plan.** Investigates real code + git history, roots the cause,
    writes the concrete plan (files, selectors, edge cases). No edits in this stage.
  - **Sonnet — review & implement.** Critically reviews the plan against the current
    files, implements, runs the full gate, verifies the user-facing result by actually
    rendering it (e.g. a 360/412px mobile viewport), not from headless measurements.
  - **Opus — audit before done.** Audits the actual committed **diff** (not the
    implementing session's own summary) against the original root cause. The task is done
    only after this audit passes; failed audits loop back.
- Dispatch selects and switches the model per stage; loops are expected. Trivial edits skip
  the pipeline.

## The gate (Protocol 36 — gate parity)

- **One gate, split at the commit/push boundary.**
  - **pre-commit** runs `npm run gate:fast` (ESLint `--max-warnings 0`, Prettier, the
    single Node test runner `tests/robco-diagnostics.js`) — fast (~5–8s).
  - **pre-push** runs the full `npm run gate` (adds Playwright boot-smoke + render-check +
    the a11y baseline-diff + the `tests/test.html` runtime audit over http).
  - **CI runs the same full `npm run gate`** — parity holds at the push boundary.
- There is **ONE canonical test runner** — `tests/robco-diagnostics.js`, run by both the
  hook and CI. The old PowerShell mirror was deleted (Protocol 15 retired); there is no
  second runner and no parity to police. **No test count is tracked anywhere** — the
  runner's exit status is the only signal (Protocol 2a retired).
- **Never use `--no-verify`** unless the owner explicitly authorizes it for a stated emergency.
- **Escape-ratchet (Protocol 36b):** any failure that escapes a layer gets a check added AT
  that layer in the same fix (prod bug → regression test; passed-local-but-failed-CI → that
  check moves into the gate). **Retirement rule (Protocol 49):** a guard may be removed when
  its risk is gone or was never real — but removing the enforcement, not just the prose.

## Cache policy (Protocol 1 — conditional)

- Bump `CACHE_NAME` in `sw.js` (`robco-terminal-v{APP_VERSION}-r{N}`, monotonic) ONLY when a
  commit stages a SERVED/precached file: `index.html`, `sw.js`, `manifest.json`, `icon*.png`,
  `css/`, `js/`. Doc/config/test-only commits do NOT bump. A commit-time guard enforces this.

## Tests & docs (Protocols 13, 2)

- Every feature adds tests; every bug fixed becomes a permanent regression test in the SAME
  commit (Protocol 13). Flaws found while testing/verifying are fixed in the same commit too
  (Protocol 42). Static "presence guards" (Protocol 20) assert key controls exist + are wired
  so a refactor can't silently delete them.
- **Docs update in the same commit as the change** (Protocol 2): `CHANGELOG.md` (entries under
  `[Unreleased]`, chronological within each category), `ARCHITECTURE.md`, `README.md`.

## Version discipline (Protocol 2)

- `APP_VERSION` follows semver automatically — **PATCH** for bug/UI/internal fixes, **MINOR**
  for new user-facing features/panels, no need to ask. **MAJOR** bumps still require explicit
  owner confirmation. Every user-visible change moves `APP_VERSION`, `CACHE_NAME`, and the
  `CHANGELOG` together as one unit.

## Data safety (Protocol 34)

- Cloud writes are additive (`addDoc`, never blind overwrite). Destructive actions
  (overwrite-on-load, delete) are confirm-gated. Saves carry a checksum + version; loads route
  through sanitize + migrate; a rolling backup is taken before any state-replacing load. The
  live campaign container is also mirrored into IndexedDB (recovery-only) so a localStorage
  eviction that spares IndexedDB is recovered on the next boot.

## Auth (Protocols 29 / 30 / 31)

- Any auth/sign-in change requires **REAL-DEVICE** mobile verification (browser tab + installed
  PWA) before "done" — the gate cannot catch redirect/popup/storage-partition bugs.
- Popup-only auth on this hosting; `linkWithRedirect`/`signInWithRedirect` are **BANNED**
  (GitHub Pages can't self-host the auth handler → `getRedirectResult` breaks cross-origin).
- `signInAnonymously` must always be guarded (never unconditional) — an unguarded call
  replaces a signed-in Google user and wipes the session.

## Kill switch (Protocols 32 / 33 / 35)

- Every new network/IO feature ships with a kill-switch flag (Firestore config) + a graceful
  fallback. The kill-switch read is **fail-safe** (unreachable/malformed config → all features
  stay ON, never block boot). On a detected post-deploy regression, flip the flag off in the
  console first, then notify, then diagnose.

## Sourcing (Protocol 3)

- Fallout game data comes from **fallout.wiki ONLY** (the AI is a typist, not an authority).
  Architecture decisions are governed by `ARCHITECTURE.md`; **code beats documentation** where
  a doc and the code disagree — fix the doc in the same commit.

## Reporting (Protocol 9)

- After every completed task AND every push, report to the owner in plain English, phone-readable:
  what changed and why, that it's live and how to test it (+ reload / "Reboot Terminal" if a
  served file changed), and anything to check. No code dumps or file paths — the owner reads on a phone.
