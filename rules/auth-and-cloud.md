# Subsystem note — Authentication, Cloud Sync & Networked Features

> **Load this when touching:** `js/services/cloud.js` · `js/ui/ui-account.js` ·
> `firestore.rules` · `firebase.json` · any sign-in / auth flow · any cloud read or write ·
> any **new feature that does network or external I/O**.
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## Protocols 29 / 30 / 31 — Authentication Hard Rules

_(Grouped from three separate protocols. All three numbers are retained as labeled sub-rules below so every existing `Protocol 29`, `Protocol 30`, and `Protocol 31` reference still resolves here.)_

**Shared mechanism (the root of sub-rules 29 and 30):** GitHub Pages cannot self-host the Firebase `/__/auth/` redirect handler. The redirect flow relies on a cross-origin iframe to `{project}.firebaseapp.com`, which modern mobile browsers block (storage partitioning), causing `getRedirectResult` to return `null` and silently breaking sign-in with no error to the user. This is invisible on desktop and in the test suite — only a real mobile device catches it (the r54 mobile sign-in regression).

**Sub-rule 29 — auth changes require real-device mobile verification.** Any change to authentication or sign-in flow is not "done" until it has been verified on a **real mobile device** — in both a normal browser tab and the installed PWA (add-to-home-screen standalone mode). Emulators and desktop DevTools responsive modes are not sufficient: they cannot catch OAuth redirect/popup behavior, storage-partitioning bugs, or standalone-mode session-isolation issues (see the shared mechanism above).

**Sub-rule 30 — popup-only auth; redirect banned.** Use `linkWithPopup` / `signInWithPopup` **only**. `linkWithRedirect` and `signInWithRedirect` are **prohibited** on this project — the redirect flow hits the shared-mechanism failure above, while the popup flow has no such dependency and works correctly in all environments this app targets.

**Sub-rule 31 — `signInAnonymously` must always be guarded, never unconditional.** The boot anonymous sign-in must be gated behind `auth.authStateReady()` plus an explicit `!auth.currentUser` check (or equivalent guard), never called unconditionally. The Firebase SDK only no-ops `signInAnonymously` for a user who is already anonymous; for a user already signed in with a linked account (e.g. Google), an unconditional call mints a fresh anonymous user and silently replaces the session — wiping sign-in on every reload. This was the root cause of the 5c-ii clobber bug.

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

## Protocol 32 / 33 / 35 — Remote Kill-Switch (three parts)

_(Formerly three separate protocols. All three numbers are retained as labeled parts below so every existing `Protocol 32`, `Protocol 33`, `Protocol 35`, `Protocol 32/33`, `Protocol 32/35`, and `Protocol 32/33/35` cross-reference — in code comments, `ARCHITECTURE.md`, and the test suite — still resolves here.)_

**Why (shared):** A kill switch lets a broken networked feature be turned off remotely without a redeploy, and a defined fallback keeps the app fully usable when that feature is unavailable. Without these, any new networked feature is a potential outage vector.

**Part (a) — Protocol 32: every new network/IO feature ships a flag + graceful fallback.** Any new feature that does network or external I/O — cloud sync, authentication, AI calls, remote config, or any future integration — must be registered with the remote kill-switch config and must define a graceful fallback behavior for when the feature is disabled or failing. (The kill-switch mechanism itself is Phase 5 hardening work; this rule governs all features added from that point forward.)

**Part (b) — Protocol 33: the boot read is fail-safe.** Reading the remote kill-switch / feature-config on boot must never disable features or black-screen the app if the config is unreachable, malformed, or slow to respond. Always default to last-known-good or features-enabled and remain fully usable offline. The safety mechanism cannot be a new failure mode — if the kill-switch check itself can bring down the app, it is worse than having no kill switch at all.

**Part (c) — Protocol 35: auto-flip off on detected post-deploy regression.** When a post-deploy regression in a networked/IO feature is detected, the dev process flips that feature's flag to `false` in `/config/flags` via the Firebase console **immediately and automatically** — without waiting for the user — then notifies the user. Restore first, diagnose second; the live-site analogue of Protocol 16 for flaggable features. Order: (1) flip off live, (2) confirm fallback active + app usable, (3) report to user, (4) diagnose/fix/verify, then flip back on. Prefer the remote flag over `git revert` when the break is contained to a flaggable feature (instant, no deploy/cache bump) — the fail-safe read (b) means flipping only disables into the defined fallback, never black-screens, so a flaggable regression never waits on a human round-trip.

---

## Auth prohibited patterns

| Never Do                                                  | Why                                                                                                                                                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `linkWithRedirect` / `signInWithRedirect` on this project | GitHub Pages can't host the redirect handler; mobile blocks the cross-origin iframe fallback (storage partitioning) → `getRedirectResult` returns `null`, sign-in silently fails. Full mechanism → **Protocol 30**          |
| Unconditional `signInAnonymously` on boot                 | For a Google-linked user, an unguarded call mints a fresh anonymous user and wipes the session on every reload (the 5c-ii clobber bug) — gate on `auth.authStateReady()` + `!auth.currentUser`. Full rule → **Protocol 31** |
| Auto-push to cloud on stat changes                        | Cloud sync is manual button only                                                                                                                                                                                            |

---

## Related notes

- The state fields riding the save container: `rules/state-and-save.md` (Protocol 4)
- Deploy/cache mechanics for a cloud-touching push: `rules/deploy-and-cache.md`
- Restoring a broken live site: **Protocol 16** — in `CLAUDE.md`, universal.
