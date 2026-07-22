# Subsystem note — Service Worker, Cache & Deploy

> **Load this when touching:** `sw.js` · `index.html` · `manifest.json` · icons · anything
> under `css/` or `js/` (i.e. any **served/precached** file) · `.github/workflows/` ·
> `scripts/cf-staging-build.mjs` · any push that reaches a live site.
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## Protocol 1 — Service Worker Cache Bump

Bump `CACHE_NAME` in `sw.js` when a commit or push changes any file that is **served to or pre-cached by users**: `index.html`, `sw.js`, `manifest.json`, `icon.png` (or any icon file), or anything under `css/` or `js/`. Doc-only, config-only (`.github/`, `scripts/`), and test-only commits do **not** require a bump.

**Format:** `'robco-terminal-v{APP_VERSION}-r{N}'`

- `N` starts at 1 for each new `APP_VERSION`.
- Increment `N` whenever a **served-file commit** is pushed.

**Why:** The SW is cache-first. Without a new `CACHE_NAME`, cached users silently run the old build and never see the "REBOOT TERMINAL" update prompt. Bumping only when served files change keeps the signal meaningful and avoids spurious update prompts on doc-only or CI-only pushes.

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
