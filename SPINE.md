# SPINE — the shared facts of the RobCo project, written once

> **What this file is.** The ONE home for the facts every instruction file in this project must
> agree on: the repo map, each repo's visibility and role, the doctrine sentences, and where the
> canonical files live. Every `CLAUDE.md` and `AGENTS.md` in the RobCo repos **points here and does
> not restate these.** A fact that appears both here and in another instruction file is a defect —
> the second copy is where drift lives. Measured before this file existed (survey, 2026-09-03): the
> repo map was written in six places and they disagreed on visibility; `DOC1` records three cases
> where a mechanical copy turned a true sentence into a false one.
>
> **Owner rulings.** 2026-08-14 (`DOC1`, option (c)): the Codex-facing and Claude-facing files stay
> independent and reader-sized, neither generated from the other, and the shared facts get one home
> both point at. 2026-09-03: one spine per project, inside that project's own repo. This is RobCo's.
> Mist has its own at `C:\Dev\!Mist\_Mist-Forge\SPINE.md`. Binder has none yet — its `CLAUDE.md`
> is self-contained and nothing points at it.
>
> **Every fact here carries how to re-measure it (§4), and this file is a snapshot too.** Where it
> and the measurement disagree, the measurement is right: fix this file in the same commit.
>
> **This repository is PUBLIC.** Nothing here is new to the public: every repo name below already
> appears in this repo's `CLAUDE.md`, visibility is observable by anyone who asks GitHub, and no
> private layout, path inside a private repo, credential or address appears here.
>
> **Verified 2026-09-03** — remotes by `git remote -v` in each folder; visibility by
> `gh repo view zerckzzyHD/<repo> --json visibility` on all eleven repos; folders by listing `C:\Dev`.

## 1. The repo map

**Eleven governed repositories on this machine — RobCo 8, Mist 2, Binder 1 — measured 2026-09-03 by
a full `.git` scan under `C:\Dev`.** Excluded from that count: 22 repositories under `_scratch\`
(third-party clones and scratch), and `_wt-af14` (a linked worktree of `_RobCo-Control/code`, not a
repository). ⛔ The older orientation files named FIVE; a session working in one of the other six stood
at the private/public boundary — a one-way door — with nothing telling it which side it was on, and
had to ask GitHub. That is why every one of the eleven has a row below with its visibility **read from
GitHub on the date stated**, never from a folder name or a `_` prefix. If a later reading cannot be
established with certainty, write UNKNOWN in the row rather than a guess: a wrong privacy claim here
is worse than a missing one, because it will be trusted.

| Folder on disk                         | GitHub remote                                    | Visibility (measured 2026-09-03)                                                                                                                                                                                                                                       | Role                                                                                                                                                                  | Doctrine root                   |
| -------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `C:\Dev\!RobCo\!RobCo-UOS`             | `zerckzzyHD/Robco-UOS`                           | **PUBLIC**                                                                                                                                                                                                                                                             | the app (Fallout-terminal PWA). `dev` is the working branch; `main` is release-only and takes only pull requests                                                      | `CLAUDE.md` + `rules/*.md` here |
| `C:\Dev\!RobCo\_RobCo-Control\code`    | `zerckzzyHD/_RobCo-Control`                      | private                                                                                                                                                                                                                                                                | the control plane — deterministic, AI-free, never public. **Production: executed every five minutes from the working tree, and it refuses to tick from a dirty tree** | its own `CLAUDE.md`             |
| `C:\Dev\!RobCo\_RobCo-Control\state`   | none — not a repo, never committed, never synced | —                                                                                                                                                                                                                                                                      | the plane's runtime data (ledger, locks, status, kill-switch)                                                                                                         | —                               |
| `C:\Dev\!RobCo\_RobCo-Control-Ledger`  | `zerckzzyHD/_RobCo-Control-Ledger`               | private                                                                                                                                                                                                                                                                | automated off-machine mirror of the plane's runtime records. Never hand-edited                                                                                        | its short `CLAUDE.md`           |
| `C:\Dev\!RobCo\_RobCo-Control-Content` | `zerckzzyHD/_RobCo-Control-Content`              | private                                                                                                                                                                                                                                                                | automated content-addressed mirror of captured worker output. Never hand-edited                                                                                       | its short `CLAUDE.md`           |
| `C:\Dev\!RobCo\_RobCo-Archive`         | `zerckzzyHD/_RobCo-Archive`                      | private — **permanently**; its history holds memory and planning                                                                                                                                                                                                       | backup of everything local-only (planning, library, memory) and the museum generator                                                                                  | its `CLAUDE.md`, a pointer      |
| `C:\Dev\!RobCo\!RobCo-Exhibit`         | `zerckzzyHD/Robco-Exhibit`                       | **private since 2026-08-31** — the owner made it private after the Cloudflare exposure incident (`PX12`). The Pages site kept serving until Cloudflare Access was put in front; measured 2026-09-03: the root and a subpage both answer 302 to Access, unauthenticated | the museum — generated, scrubbed output only                                                                                                                          | none; a pointer `CLAUDE.md`     |
| `C:\Dev\!RobCo\_RobCo-Mission-Tools`   | `zerckzzyHD/_RobCo-Mission-Tools`                | private                                                                                                                                                                                                                                                                | the operator tooling the plane's kernel launches; kept out of `code/` deliberately (its README says why)                                                              | none; a pointer `CLAUDE.md`     |
| `C:\Dev\!RobCo\_RobCo-Agent-Handoff`   | `zerckzzyHD/_RobCo-Agent-Handoff`                | private                                                                                                                                                                                                                                                                | non-canonical transfer dock; the owner is its only committer; **no agent runs git there** (a stranded `index.lock` from 2026-08-31 is the owner's to clear)           | none; a pointer `CLAUDE.md`     |

**The other three of the eleven are separate projects with their own spines and their own doctrine;
RobCo's protocol numbers do not apply in them.** Listed here so the count is complete in one place:

| Folder on disk               | GitHub remote            | Visibility (measured 2026-09-03)                                                                      | Project                            | Spine / doctrine root              |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------- |
| `C:\Dev\!Mist\_Mist-Forge`   | `zerckzzyHD/_Mist-Forge` | private                                                                                               | Mist — the private source of truth | `_Mist-Forge/SPINE.md`             |
| `C:\Dev\!Mist\!Mist-OS`      | `zerckzzyHD/Mist`        | **private** — its own README still says public; the change is undated in every document read that day | Mist — the public-facing half      | `_Mist-Forge/SPINE.md`             |
| `C:\Dev\!Binder\!Binder-App` | `zerckzzyHD/Binder`      | private — plain-named                                                                                 | Binder                             | its own `CLAUDE.md` (no spine yet) |

### The traps — they are why this table exists

1. **The folder is not the repo name, and the name does not encode visibility.** `!` never appears on
   GitHub. `_` marks a _supporting_ repo (`_RobCo-Archive` keeps it on GitHub too). The app's remote
   uses a lowercase `c` its folder does not — **deliberate and permanently closed**: installed PWAs are
   bound to that origin, and a tidiness sweep will want to fix it. Leave it. Read visibility off
   GitHub, never off a name: `Binder`, `Mist` and `Robco-Exhibit` are plain-named and private.
2. **`_RobCo-Control` is a container, not a repo.** Git commands target `code/`; `state/` is never
   committed — a lock that guards a repo cannot live inside it.
3. **Archive (private) feeds Exhibit — they must never converge.** Everything crossing that boundary
   goes through the scrub-and-publish gate. Deleting a file does not remove it from history. Any
   public-facing push is a one-way door.

## 2. The doctrine sentences

One line each. The document that elaborates is named; the sentence lives here.

- **No AI executor holds authority anywhere.** The control plane is deterministic code that never
  calls a model, and its gates cannot be invoked by a model as the decision-maker. A session's account
  of its work is a claim, not evidence; the audit reads the diff. → `CLAUDE.md` Protocols 8 and 51.
- **Fail closed. Unknown is `UNOBSERVABLE`, never zero.** A wrong number is worse than none because it
  gets planned around. The two deliberate inversions, stated where they live: hooks fail _open_, and the
  museum generator always exits 0 because it is a reporter. → `_RobCo-Control/code/CLAUDE.md` § Hard
  invariants.
- **Operate before expand.** "Built" is not "operating"; nothing is complete without a firing receipt.
  → the `WF1` failure class in `QUEUE.md`.
- **The private/public boundary is absolute.** Nothing reaches a public repo or site without the scrub
  gate. → trap 3 above; `rules/docs-and-library.md`.
- **Free, BYO-key, no paid infrastructure; the owner has final authority and the AI is opt-in; pinned
  Fallout data comes from `fallout.wiki` only.** → `CLAUDE.md` Protocol 3 and `rules/auth-and-cloud.md`.
- **Code beats documentation, this file included.**

## 3. Where the canonical files live

| What                                      | Where                                                                                                                                                                                    | Note                                                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roadmap and every dated decision          | `_RobCo-Archive/!PLANNING/QUEUE.md`, `QUEUE_LOG.md` (closed accounts), `NORTH_STARS.md`; `ROADMAP.md` is generated beside them                                                           | Moved out of this public repo 2026-08-02 (`F04`). Code resolves them through `scripts/planning-paths.js`; a public clone has none, by design — that is a normal outcome, not a failure |
| The checkpoint ritual                     | `_RobCo-Archive/.claude/skills/checkpoint/` (its one home since 2026-09-03); `!PLANNING/CHECKPOINT-RITUAL.md` points at it                                                               | Never uploaded to the desktop app's skill store, never paraphrased elsewhere                                                                                                           |
| App protocols, gates, prohibited patterns | `CLAUDE.md` + `rules/*.md` here; the retrieval map in `CLAUDE.md` is the sole authority on which note governs a surface                                                                  |                                                                                                                                                                                        |
| Control-plane invariants and its code map | `_RobCo-Control/code/CLAUDE.md`, read by section                                                                                                                                         |                                                                                                                                                                                        |
| Control-plane spec                        | `planning/control-plane/CONTROL_PLANE_SPEC.md` here                                                                                                                                      | gitignored, local-only                                                                                                                                                                 |
| Claude-facing reference library           | `library/` here                                                                                                                                                                          | gitignored; absent in a clone — read the source it points at, do not infer                                                                                                             |
| Agent memory — **two stores**             | this project's memory folder under `~/.claude/projects/`; Dispatch's own store under the desktop app's session tree                                                                      | "Search memory" means both; asserting absence from one is a known past mistake                                                                                                         |
| Machine-level instruction files           | `~/.claude/CLAUDE.md` (Claude, orientation only); Dispatch's Cowork `memory/CLAUDE.md`; `~/.codex/AGENTS.md` (Codex)                                                                     | The copy Cowork injects per session is older than either file on disk; its source was not located (survey, 2026-09-03)                                                                 |
| Instruction files per repo                | `CLAUDE.md` is Claude-facing: full where the repo is a doctrine root, a pointer everywhere else. `AGENTS.md` is Codex-facing, lean, hand-written, present only where Codex is dispatched | Neither is generated from the other (`DOC1`). Both point here                                                                                                                          |

## 4. Re-measure

```
git -C <folder> remote -v
gh repo view zerckzzyHD/<repo> --json visibility
node scripts/worktree-preflight.js <folder>       # HEAD, parity, dirtiness, writers — read-only
```
