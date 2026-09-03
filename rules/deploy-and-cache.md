# Subsystem note — Service Worker, Cache & Deploy

> **Load this when touching:** `sw.js` · `index.html` · `manifest.json` · icons · anything
> under `css/` or `js/` (i.e. any **served/precached** file) · `.github/workflows/` ·
> `scripts/cf-staging-build.mjs` · any push that reaches a live site.
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## Protocol 1 — Service Worker Cache Bump

Bump `CACHE_NAME` in `sw.js` when a commit or push changes any file that is **served to or pre-cached by users**: `index.html`, `sw.js`, `manifest.json`, `CHANGELOG.md` (the in-app changelog viewer fetches it at runtime — Protocol 21), `icon.png` (or any icon file), or anything under `css/` or `js/`. Doc-only, config-only (`.github/`, `scripts/`), and test-only commits do **not** require a bump — `CHANGELOG.md` is the one doc-looking exception, because unlike every other `.md` file it IS served. This list is enforced mechanically, not just stated here: `scripts/cache-bump-guard.js`'s `SERVED_RE` classifier is the actual gate check, and it already includes `CHANGELOG.md` — this prose is kept in sync with that regex, not the other way around.

**Format:** `'robco-terminal-v{APP_VERSION}-r{N}'`

- `N` starts at 1 for each new `APP_VERSION`.
- Increment `N` whenever a **served-file commit** is pushed.

| Scenario                     | Before      | After       |
| ---------------------------- | ----------- | ----------- |
| New version released         | `v1.6.5-r3` | `v1.6.6-r1` |
| UI tweak within same version | `v1.6.5-r1` | `v1.6.5-r2` |
| Second UI tweak same version | `v1.6.5-r2` | `v1.6.5-r3` |

**Why:** The SW is cache-first. Without a new `CACHE_NAME`, cached users silently run the old build and never see the "REBOOT TERMINAL" update prompt. Bumping only when served files change keeps the signal meaningful and avoids spurious update prompts on doc-only or CI-only pushes.

**The served/precached set — ⭐ THE ONE ENUMERATION, AND IT IS MACHINE-CHECKED.**

<!-- SERVED-SET-GUARD:BEGIN — Suite 30.3g parses SERVED_RE out of scripts/cache-bump-guard.js and asserts it matches this list EXACTLY, both directions. ⛔ Do not hand-edit this list to match today's code: change SERVED_RE (and sw.js, which 30.3f checks against it) and let this follow. -->

- `index.html`
- `sw.js`
- `manifest.json`
- `CHANGELOG.md`
- `assets/`
- `css/`
- `js/`

<!-- SERVED-SET-GUARD:END -->

⚠ **`CHANGELOG.md` is in the set and is the one people miss** — including this document, which
omitted it until 2026-08-25. It is not in the install-time `ASSETS` array; `sw.js` precaches it at
runtime (`cache.add('./CHANGELOG.md')`) for the in-app changelog viewer, so a changelog edit with no
`CACHE_NAME` bump means installed users never see the new entry. The prose list here was hand-copied
from the `ASSETS` array and inherited exactly that blind spot: it read as authoritative, and it was
a subset. That is why this block is now checked rather than maintained.

⛔ **Do not confuse this with the retrieval-map routing rows** (in `CLAUDE.md` and this note's own
"Load this when touching" header). Those answer _"which note governs this surface?"_ and are policed
separately by Suite 220.15 — `CHANGELOG.md` routes to `rules/docs-and-library.md`, not here.
A file can be served without this note governing it. The two lists differ **on purpose**.

**Automated guard:** The pre-commit hook delegates to `scripts/cache-bump-guard.js` (Node, so it is testable behaviourally — Suite 30). If any staged file is in that served/precached set, the guard requires the staged `CACHE_NAME` to **differ from this branch's own HEAD value** (`git show HEAD:sw.js`). This "must differ from HEAD" invariant is **branch-agnostic** — it holds identically on `dev`, `main`, and any future branch, because it never compares against another branch. (This replaced the earlier monotonic-rev check, which compared against `origin/main` and was therefore inert on `dev`, where the local rev is always ahead of the release-only `main` — the guard passed unconditionally no matter what was staged.) If the HEAD baseline is unreachable (fresh repo, or `sw.js` not yet committed), the guard **warns and passes** (fail-safe — a missing baseline never blocks a commit). Non-served commits (doc-only, CI, tests) skip the cache check entirely.

---

## Protocol 11 — Deploy Verification

After any push that affects a live site, confirm the change actually reached its deployed branch AND is served (account for CDN + service-worker caching), then tell the user the exact step to see it (reload + tap "Reboot Terminal"). A normal `dev` push affects the private staging site (Cloudflare Pages, built from `origin/dev`); a **release** affects production (GitHub Pages, built from `origin/main`). A production release is **never** reported live without confirming the change reached `origin/main` and is actually served by GitHub Pages — the release-time production verification is mandatory. Never report a UI change as live without this check.

---

## Service-worker prohibited patterns

These two are the highest-cost mistakes on this surface — both shipped as real production
breaks. The full Prohibited Patterns table is in `CLAUDE.md`.

| Never Do                                             | Why                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `clients.claim()` in the service worker              | Causes reload loops and black screens                                                                                                                                                                  |
| `self.skipWaiting()` inside the SW `install` handler | Activates the new SW immediately so it never enters the waiting state — `reg.waiting` is null, the update prompt's `SKIP_WAITING` message goes nowhere, and clients silently never update (the r6 bug) |

Service-worker invariants must each be covered by a static test that fails if the safeguard is
removed in a refactor — Protocol 20, in `rules/testing-and-gates.md`.

---

**Finding (2026-09-03) — a `404` at `/sw.js` does NOT clear an existing registration.** Measured on
2026-09-01, when the tailnet dev origin's root briefly changed hands: the root answered `404` for `/sw.js`, and a
phone holding the app's old root-scope registration kept rendering the cached shell (unstyled, because its
relative asset paths now resolved to nothing) until site data was cleared by hand. With an active worker already
installed, a failed update check leaves that worker in place. ⭐ What clears it is serving **different bytes at
the same URL** — a worker with no `fetch` handler that deletes every cache, calls `registration.unregister()`,
and reloads its clients. That is what the dev server now serves at its root `/sw.js`
(`scripts/sw-killswitch.js`); the app's own worker lives under `/terminal/sw.js` and is untouched. ⛔ This is a
dev-origin concern only — production's worker still lives at its origin root and Protocol 1 governs it — but the
assumption _"just 404 the old worker"_ is the sort of thing the next person will make too, so it is recorded here.
Queue item `DS10` asks for the gate test that keeps the app's worker cache-match-or-network.

## Environment split (staging vs production)

`scripts/cf-staging-build.mjs` stamps the staged `index.html` with an explicit staging marker
that the production build (`deploy.yml`) never emits. Anything environment-gated reads that
marker and **defaults to production behaviour** when it is absent, unknown, or stale-cached.
The worked example is the in-app changelog viewer — Protocol 21, in `rules/docs-and-library.md`.

---

## Related notes

- Restoring a broken live site: **Protocol 16** (Hotfix / Rollback) — in `CLAUDE.md`, universal.
- Remote kill-switch for a flaggable networked feature: **Protocols 32 / 33 / 35** — in
  `rules/auth-and-cloud.md`. Prefer the flag over `git revert` when the break is contained.
- Branch model (`dev` working, `main` release-only): **Protocol 43** — in `CLAUDE.md`.
- UI render verification at 360/412/desktop: **Protocol 10** — in `rules/ui-and-mobile.md`.
- Design rationale (R10 Step 3, task-retrieved by section): the cache-first mechanism and
  its origin incident are `ARCHITECTURE.md#service-worker-cache-protocol`; the rollback
  runbook's own script/commands are `ARCHITECTURE.md#hotfix-rollback`.
