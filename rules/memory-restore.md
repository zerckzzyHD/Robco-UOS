# Subsystem note — Memory & Queue Restore (disaster recovery)

> **Load this when touching:** a disaster-recovery or rehydrate situation — restoring the
> orchestrator's memory store, the local reference library, or the build queue from the private
> archive after a machine loss, or bringing a fresh Dispatch up to full state. This is a runbook,
> not a code surface: there is no file here to edit, only steps to follow.
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## Why this note exists

Protocol 48 (in `CLAUDE.md`) makes the **backup** side an agent obligation: the private archive repo
(`zerckzzyHD/_RobCo-Archive`, working copy at `C:\Dev\!RobCo\_RobCo-Archive\`) mirrors the three
local-only artifact classes — the local reference library, the whole gitignored `planning/` tree, and
the orchestrator's discovered **memory** stores — and `sync.ps1` runs it. The G blind workflow review
(CLAIM V) confirmed the **data is safe** (the sync backs up every discovered memory store, and `QUEUE.md`
is a tracked file in the public repo, so it lives in git history too) — but there was **no written
RESTORE procedure**. This note is that procedure: how a _fresh_ machine or a _fresh_ Dispatch rebuilds
exact state from the archive. Backup and restore are complements; keep them in step.

## What lives where (the recovery sources)

| Artifact                                               | Backed up in the archive as                                             | Also recoverable from                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Orchestrator **memory** stores                         | `memory/<store-label>/…` (one subfolder per discovered store; MIRRORED) | nowhere else — the archive is the only copy                        |
| Local **library** (brain dump, code map, test catalog) | `library/…` (MIRRORED)                                                  | nowhere else — `library/` is gitignored                            |
| **`planning/`** tree (audits, plans, slates, mockups)  | `planning/…` (ADDITIVE — never deletes)                                 | nowhere else — `planning/` is gitignored                           |
| **`QUEUE.md`** (the roadmap)                           | not separately mirrored                                                 | the **public repo** — it is git-tracked, so a clone already has it |

The archive also writes `memory/_CAPTURED_STORES.txt` and `memory/_CAPTURE_MANIFEST.txt` — the manifest
records **exactly which source path each captured store came from**, which is what makes step 4 below
deterministic rather than a guess. Every sync stamps the archive with the public repo's HEAD at sync
time, so you can see how current the memory/library snapshot is relative to the code.

## Restore procedure (fresh machine / fresh Dispatch)

1. **Clone the public repo.** This recovers all tracked code **and `QUEUE.md`** (the current roadmap) —
   the queue needs no separate restore. Confirm `QUEUE.md` reads as current.
2. **Clone the private archive** `zerckzzyHD/_RobCo-Archive` to `C:\Dev\!RobCo\_RobCo-Archive\`.
3. **Restore the library and planning trees** by copying the archive's `library/` and `planning/`
   folders back into the public repo working copy (both are gitignored locally, so the clone in step 1
   does not contain them — the archive is their only source). `planning/` is additive in the archive, so
   it holds the full history; take what the current work needs.
4. **Restore the memory store(s).** Open `memory/_CAPTURE_MANIFEST.txt` in the archive to see which live
   source path each captured `memory/<store-label>/` came from, then copy the relevant store's files back
   to that live location — typically the CLI project memory under
   `~\.claude\projects\<project-slug>\memory\` and/or the desktop local-agent-mode memory under the
   Claude session store's `…\agent\memory\`. Restore the store whose label matches this project; the
   others are unrelated projects captured by the same discovery pass.
5. **Verify the rehydrate.** The restored `MEMORY.md` index loads and its pointers resolve; `QUEUE.md` is
   current; `library/` and `planning/` are present. A fresh Dispatch reading `MEMORY.md` + `QUEUE.md` +
   `CLAUDE.md` is now back to full state.

## Guardrails

- **Never commit the archive contents into the public repo.** `library/`, `planning/`, and the memory
  store are gitignored on purpose — restoring them locally is correct; staging them is not.
- **The archive can only be as fresh as the last sync.** If the sync obligation (Protocol 48) was met,
  the memory/library snapshot is current to that sync's stamped HEAD; anything decided after it lives only
  in the conversation log until re-recorded. Treat the HEAD stamp as the snapshot's "as-of" marker.
- **Run direction is one-way here.** This note only _reads from_ the archive to rebuild local state; it
  never writes to the archive. The backup direction stays owned by Protocol 48 / `sync.ps1`.
