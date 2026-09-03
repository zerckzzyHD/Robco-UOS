# AGENTS.md — orientation for a Codex worker in `!RobCo-UOS`

**This is Codex's instruction file.** Claude reads `CLAUDE.md`; you read this. They are not copies of
each other and this one is deliberately short (owner ruling, `DOC1`, 2026-08-14: the two files stay
independent and reader-sized; neither is generated from the other). Rewritten by hand 2026-09-03 —
the previous file here was a mechanical `Claude→Codex` substitution of `CLAUDE.md`, untracked since
2026-08-11, and it described a backup nudge that no longer exists in that form.

> ⛔ **This file is a POINTER, not the rulebook.** `CLAUDE.md` in this folder is canonical and wins
> wherever the two disagree; read it **by section** through its retrieval map, never whole. **Code
> beats documentation**, this file included.

---

## 1. Where the facts live — do not restate them here

| You need                                                                                                                                                            | Read                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| The repo map (folder → GitHub remote → visibility → role), the doctrine sentences, where the planning, memory and reference files live                              | **`SPINE.md`** (this folder) — the ONE home for the shared facts. ⛔ Nothing from it is copied into this file |
| Every protocol that applies to all work here — gates, docs-in-the-same-commit, regression tests, the retirement rule, the dispatch workflow, the authority boundary | **`CLAUDE.md`** § _The universal contract_                                                                    |
| Which subsystem note governs the surface you are touching                                                                                                           | **`CLAUDE.md`** § _Retrieval map_ → the one `rules/*.md` note it names. That map is the sole authority        |
| Design rationale for a surface                                                                                                                                      | `ARCHITECTURE.md`, by section, from the anchor the rules note cites                                           |
| Plain-English release history                                                                                                                                       | `CHANGELOG.md`                                                                                                |

⚠ `library/` and `planning/` are gitignored and local-only. If a target under them is absent, do not
infer its contents: read the source it points at and say what was missing.

---

## 2. Hard rules for you

1. ⛔ **Work lands on `dev`.** `main` is release-only and takes pull requests only. Commit to `dev`;
   whether you push is set by the global Codex instructions you were launched with, not by this file.
2. ⛔ **Never `--no-verify`.** The pre-commit hook runs the fast gate and the pre-push hook runs the
   full gate; a red gate is a real failure to investigate, not a step to skip.
3. ⛔ **Bump `CACHE_NAME` in `sw.js` when a staged file is served or precached** — the enumerated set
   lives in `rules/deploy-and-cache.md` (Protocol 1) and `CHANGELOG.md` is in it. A doc-looking commit
   that touches the changelog still needs the bump; the commit hook refuses otherwise.
4. ⛔ **STOP on someone else's uncommitted work.** If `git status` shows files you did not create,
   report them by name and wait. Do not stash, revert, commit or work around them.
5. ⛔ **This repository is PUBLIC.** Nothing internal crosses that boundary: no private path, no
   credential, no operational detail that belongs in the private archive (`SPINE.md` § 3 says where
   planning lives and why it is not here).
6. **Docs move in the same commit** (`CLAUDE.md` Protocol 2): changelog entry in plain English,
   README and ARCHITECTURE where the change makes them wrong. A bug you fix gets a regression test in
   the same commit (Protocol 13); a flaw you find while testing is fixed, not worked around (Protocol 42).
7. **Report what you did not do.** A refusal, a skipped step or a blocked path is a result. Your
   account of your work is a claim; the diff and the gate are the evidence.

---

## 3. Practical orientation

```
js/          the app — core/ (state, idb, runtime) · data/ (game registries) · services/ (api, cloud) · ui/
css/         13 order-prefixed files; the cascade order is load-bearing
scripts/     the gate, the hooks, the dev server, the generators, the worktree hooks
tests/       robco-diagnostics.js is the whole Node suite, single entry point; *.mjs are the browser checks
rules/       subsystem notes — reach them ONLY through CLAUDE.md's retrieval map
```

- **Gate:** `npm run gate:fast` before a commit (the hook runs it anyway), `npm run gate` before a
  push. Re-run it yourself; a prior session's green is not evidence.
- **Two Codex hooks live here and are invoked by absolute path from any worktree:**
  `scripts/worktree-preflight.js` (setup; reports, never refuses) and
  `scripts/worktree-teardown-guard.js` (cleanup; refuses to discard uncommitted work, and copies it
  out first because whether the host honours its exit code is unverified — its header says so).
- ⚠ **Scope notes that a Claude→Codex substitution used to get wrong:** the model names, effort tiers
  and `/effort` command in `CLAUDE.md` Protocol 8 are Dispatch's Claude machinery — take from that
  section only what binds any worker (plan first; verify against the artifact; no mid-run spec
  changes). `.claude/` and `.codex/` both exist here and both are gitignored.
