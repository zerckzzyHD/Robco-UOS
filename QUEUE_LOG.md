# RobCo U.O.S. — Build Queue LOG (shipped-work archive)

**The reasoning archive for everything `QUEUE.md` has closed.** `QUEUE.md` is the lean, phone-readable queue of what is still ahead; this file is its companion LOG — the full accounts, post-mortems, and "why we did it this way" for work that has **shipped or been ruled out**. Split out of `QUEUE.md` on 2026-07-21 because the queue was doing two jobs with opposite requirements: a queue must stay short and be read constantly, a log grows forever and is read rarely, and the log was burying the queue.

**Nothing here was deleted from `QUEUE.md` — it was moved, verbatim.** Each shipped item keeps a one-line record in `QUEUE.md` with a link back to its full account here. The shipped-item bodies below are the **exact original text** as they last stood in `QUEUE.md`; the reasoning is the most valuable content in the project — several sessions have relied on it — so it is preserved in full, just relocated off the steering surface.

**Maintenance class: ARCHIVE (append-only).** Entries here are frozen records of shipped work. When a `QUEUE.md` item ships, its full body moves here under a stable `<a id="…">` anchor and the queue keeps the one-liner. Do not rewrite a landed account to match later reality — that is what the drift on the running header caused in the first place. If a shipped decision is later reversed, the reversal is a _new_ queue item with its own record, not a rewrite of this one.

**Item IDs are stable tags — never renumbered, never reused** (the Protocol 49 retirement discipline, applied to queue IDs). An `A0` / `R3` / `P1` here is the same `A0` / `R3` / `P1` referenced from commit messages, memory files, the workflow-review prompt, and `CHANGELOG.md`. Moving an account into this log does not change its ID.

**Anchor index (for `QUEUE.md`'s one-liner links):** [2.8.0](#v280) · [brain dump](#braindump) · [item 1 spine](#u1) · [item 2](#u2) · [item 3](#u3doc) · [item 4 FO3](#fo3) · [item 5 save integrity](#saveintegrity) · [data provenance](#dataprovenance) · [save L3](#saveintegrityl3) · [UI truthfulness](#uitruthfulness) · [item 6 schematic](#schematic) · [A0](#a0) · [A1](#a1) · [A2](#a2) · [R1](#r1) · [R2](#r2) · [R3](#r3) · [R4](#r4) · [R8](#r8) · [R9](#r9) · [E](#e) · [M](#m) · [K](#k) · [O](#o) · [N](#n) · [F](#f) · [App Check](#appcheck)

---

# Update history — the running "Last updated" chain

_The full original running-header text is preserved verbatim in the appendix at the very bottom of this file. The dated summaries below are the same content, reflowed newest-first for reading (the header had grown into a single multi-thousand-word line that `QUEUE.md` could no longer carry)._

### 2026-07-21 — a Protocol 50 recording pass: seven conversational decisions written where they live

A pure recording pass (built nothing), every status claim re-verified against the real files and the sibling archive first — the bug-record count, the archive commit hashes, and the achievements-line date were all checked on disk, and the circulating "11 records" was corrected to the verified **10**. **(1)** A new standing rule — **dates, and DERIVED ones**: every recorded decision carries its date, a later reinforcement carries its OWN date rather than being merged into the original, and dates come from git / the changelog / the event, never a session's felt time (added as **Protocol 50 (a-date)**; it exists because a continuously-running Dispatch session's clock-sense is decoupled from wall-time). **(2)** The **master-key rule-out is now DOUBLE** — the original blast-radius reason plus a dated reinforcement: a master key forces read-modify-write and would introduce a lost-update race that independent keys cannot have (category-grouping doesn't help). **(3)** The **achievements rule-out's REASON recovered** — it fights the fiction (a scoreboard about the player); analysed by Dispatch, decided by the owner; the flagship case for rule (1). **(4)** A new OPEN question in the Unversioned drawer — **New Vegas Challenges** (brother-raised, max-priority audience); NOT the same as achievements, owes a `fallout.wiki` write-up before any owner in/out call. **(5)** The **museum's Claude-first audit has RUN** — five defects fixed (still unpushed on the archive), gallery-mats design regression back to Fable, a real "couldn't check pixels" gap; external review still warranted (P design note e). **(6)** New museum item **P5** — contextual return (breadcrumb + in-page back control). **(7)** No `APP_VERSION`/`CACHE_NAME` bump (no served file changed). The pass before — six conversational decisions (R10 sequencing, the R11 knowledge-graph spec, the museum audit plan) — and earlier passes are in the running history chain below.

### 2026-07-21 — a Protocol 50 recording pass: six conversational decisions written where they live

A pure recording pass (built nothing) folding six decisions that existed only in conversation into `QUEUE.md`,
each status claim re-verified against the real files and the sibling archive first. **(1)** Dispatch **sequenced
R10's remediation** at the owner's instruction (_"you need to sequence everything not me"_) — fix the trusted
layer first (it bleeds per-session), then the guards that under-check (they hid the first problem), then route
`ARCHITECTURE.md` by section (step one shrinks it first); rollback/App-Check cleanups ride along; the P3 and
item-I fixes are gated on downstream work; **none of it gates the release** (only A3 does) — recorded inside
R10. **(2)** Adopted GPT-5.6 Sol's **knowledge-graph / retrieval-topology** spec as new item **R11** (placed as
_infrastructure_ per the owner's "helps the AI too" correction — one derivation, three renderings: topology
picture, plain diagnostics, and a machine-readable answer for sessions), with the full spec in
`planning/2.8.5/plans/KNOWLEDGE_GRAPH_SPEC.md` and the queue referencing it. **(3)** The **museum audit plan**
(Claude-first because it can execute, external-second for genuine independence, Gemini-not) plus the
external-access blocker as an open three-option owner decision — recorded as P design note (e). **(4)** A
workflow finding with no home — concurrent sessions failing each other's `npx eslint .` gate through the shared
working directory, and the junk-sweep deleting a live session's scratch files — added to
`planning/_standing/WORKFLOW_REVIEW_PROMPT.md` §7 (it complicates the worktree-isolation claim there). **(5)**
Status: the **skill was re-installed** (R9's manual step closed; the `21c78f7` gate-claim fix took), and the
**museum's "Records Office Dark" identity landed** in the archive (six commits, verified). **(6)** Corrected
stale status: R10's two defects carry their `8d14073` ship reference; skill finding E's line-38 falsehood is
✅ fixed at `21c78f7` while finding C's separate skill-overclaim (line 19) remains open. No
`APP_VERSION`/`CACHE_NAME` bump — no served file changed.

### 2026-07-21 — an external knowledge-architecture audit folded in (new item R10)

An external audit (GPT-5.6 Sol, read access to `dev` at `2798271`) reviewed how the project stores, retrieves
and connects what it knows about itself. Folded into `QUEUE.md` per Protocol 50 as new item **R10**, with every
claim re-verified against the current files first — the audit read one commit and the repo had one uncommitted
change, so a finding was recorded as fact only after checking, and imprecise claims were corrected in place
(e.g. the two "duplicate" App Check entries are paraphrases not a copy-paste; the anchor links all resolve
clean; several design labels were the auditor's own coinage, not existing items). **Two live defects were
fixed and guarded in the same pass, both proven red-then-green on real cases.** _Defect-1:_ the Protocol 1
cache-bump guard's `SERVED_RE` classifier matched only a root-anchored `icon*.png`, so changing the
`assets/*` icons, `assets/ocr/eng.traineddata.gz`, or the best-effort-precached `CHANGELOG.md` needed no cache
bump — cached users kept stale copies under a green gate. Fixed the classifier and added Suite **30.3e**
(behavioral, runs the real guard against a staged `assets/icon.png`) + **30.3f** (parses `SERVED_RE` and
asserts it classifies **every** path `sw.js` actually precaches — agreement with the real list, not a
hard-coded filename). _Defect-2:_ `ARCHITECTURE.md`'s Cloud Push section prescribed `setDoc(firestore, {…state})`
— a whole-document overwrite — while `cloud.js` uses additive `addDoc` and Protocol 34 forbids the blind
`setDoc`; corrected to the real shape and guarded by Suite **46.26**. **The rest was recorded, not fixed**
(this was a recording pass): ranked by consequence, headlined by the finding that the R2 rules restructure
copied stale `api.js`/`getSystemDirective`/single-`ui-render.js` file-ownership facts into
`rules/state-and-save.md` (commit `eac54ba`) — stale knowledge relocated into the layer built to hold current
knowledge, and invisible to Suite 220's single-segment path guard. Findings **H/I/J/K** were folded into
**P3**, **item I**, **P**, and a new **P4** (the bug-record obligation, owner-decided this session). No
`APP_VERSION`/`CACHE_NAME` bump — no served file changed.

### 2026-07-21 — the museum's visual identity decided: Direction B, "Records Office"

The owner: **"okay go with B."** Settles the museum's container design (item P) after a Fable identity pass
compared three directions. It also surfaced and corrected a real defect in how the pass was briefed: Dispatch's
brief had asserted the CRT terminal bezel as a hard constraint, when the owner had already ruled — restated
this session — that **the museum gets its own visual identity, no bezel, no obligation to stay in the Fallout
theme.** The design model followed the (wrong) brief correctly; the brief was the defect. Direction B is a
mid-century technical archive — buff paper, accession cards, rubber stamps, a ruled ledger margin, a
condition-report form — with phosphor confined to small dark instrument windows inset into the paperwork,
rather than worn as a skin. The framing that won it: a gallery doesn't paint its walls to match the paintings,
so contrast is what keeps an already-phosphor-saturated exhibit legible as an exhibit — refined by the design
model's own sharper point, that contrast alone isn't enough, the container needs a **positive** identity or
"not the terminal" just collapses into "generic light page" (exactly what sank the runner-up, Direction A).
Direction C (dark gallery) was rejected as too close to the old world. Two threads left open: all container
animation was stripped (motion, if it returns, should be exhibit behaviour, not chassis behaviour), and a dark
twin of B is being explored in parallel (session `local_acec1822`) because the owner reads mostly at night on a
phone — with no outcome assumed and "the light version is simply correct" an accepted result. New
implementation constraint locked in: phosphor green measured at 1.2:1 contrast on light paper — unusable as
text, graphic/instrument-window use only. Mockups: `museum/design/2026-07-identity-pass/` (`288dd17`); the
prior structural pass (`museum/design/2026-07-visual-pass/`, `932d1f0`) is not superseded, only its container
language was replaced.

### 2026-07-21 — a six-item placement pass, emptying the Unversioned drawer

Placed both items sitting in the Unversioned drawer into 2.9.0 (the CSS cascade cleanup attached to the
UI-consistency audit; manual-inventory event-log wiring bound to the inventory-panel rebuild + Terminal
Record) and preserved the rule that made the drawer work as a standing convention (both in `QUEUE.md` itself
and in Protocol 50). Deferred item **H** pending **G**'s results, with a written post-G obligation recorded on
H's own entry rather than left to memory. Added three DESIGN-ONLY notes to the Atlas (**I**) and an
owner-stated visual-ambition goal to the Museum (**P**) — the ambition that the entry above went on to
decide. No status broadly changed, no IDs renumbered, no version bumped.

### 2026-07-21 — the fourth context source became a pointer, Protocol 50's blind spot got named, and the museum got an AI-facing design

Three related pieces, all under the theme that this project has four sources of truth about itself —
the rules, the queue, the memory store, and the `robco-uos` skill — of which the skill was the only one
with no drift protection, no tracked source, and a stale live copy. (1) **R9** ships the fix — and it was
itself course-corrected mid-session by the owner's tightening (GPT-5.6 Sol's discipline: a guard must
earn its existence through a real, occurred failure at a defined enforcement point, or it should not
ship). The first pass over-built: it made the skill a hand-written _copy_ of the rules and added a
bespoke `Suite 243` + a standing nudge to police the copy's drift. The corrected answer is that the
skill should be a **pointer, not a copy** — so it can't become a second source of truth — after which
both guards were **removed** as unearned (Suite 243 duplicated Suite 220 and only ever red-green'd a
synthetic case; the installed-copy nudge guarded a divergence the pointer fix already removes). The one
real residual (a pointer naming a deleted file/protocol) is caught for free by folding the skill into
the _existing_ Suite 220. **Net new mechanisms: zero.** The owner still has one manual step: re-install
the corrected skill via Settings › Capabilities (only a re-install can refresh the read-only installed
copy). (2) **Protocol 50 gained subsection (c)** stating that rule 50(a) already covers the conversation
↔ queue case in prose and its enforcement half simply cannot exist (a script can't read a conversation;
the riskiest sessions never push) — so no guard is coming for it, on purpose. (3) **P3 (under the
museum)** is a design-only queued spec for making the museum an AI-facing resource like the library,
guarded by provenance (status derived from a supersession link graph, fail-closed on unknowns, no
rejected entry without its why). **Protocol 50 was itself violated hours after shipping** (the DeepSeek
roster decision, item G) — recorded plainly, because it's the concrete proof (2) exists for.

### 2026-07-20 — item F executed: the blind workflow review's four process refreshes

The standing review prompt (`planning/_standing/WORKFLOW_REVIEW_PROMPT.md`, gitignored, kept current
incrementally — folding in ≠ sending) was brought fully current (the museum + its reproducibility
sub-program, Protocol 50 + the queue-drift nudge, the trim's remaining stages R5–R7) and gained two
audit sections it never had: **§15 — auditing the orchestrator (Dispatch) itself**, and **§16 — the
multi-model hand-off and its cost.** Of F's four named subjects, three were already current in the
prompt (session-launch discipline / Protocols 8+28, the Protocol 9 reporting standard,
copy-paste-block delivery); the fourth (protocol-consolidation as proof the process PRUNES) was
strengthened from "U6 only" to the retirement rule + three retirements + R5–R7. Two decisions that had
lived only in conversation are now on file per Protocol 50 (see item G): **DeepSeek joins this ONE
review as a free, hosted-only THIRD WITNESS — never a gate, never repo-aware — and a committed
claim-ledger file** becomes the synthesis artifact. The conversation→queue gap that let those decisions
go unrecorded for hours (Protocol 50 shipped the same day) is noted honestly under G: the drift nudge
catches memory↔queue drift, not conversation↔queue drift.

### 2026-07-20 — the governance trim's remaining stages, a museum design gap, and a standing drift problem, in one pass

Triggered by the owner asking why work kept reaching this file late. Three things landed: (1) **R5-R7**,
the staged governance trim's stages 2-4 (convert-prose-to-enforcement, the contentious ratchet-narrowing
that needs the owner's call, and the expensive-machinery cuts) — these existed only in Dispatch's memory
before now, with one line in R3's own follow-up notes as the only trace in this file; all three are now
real tracked items with their reasoning and keep-cases intact. (2) The museum's **rename-permanence gap**
(under **P1**) — the in-flight hash-to-path work correctly declined to handle future document renames on
its own; this session designed the fix (an extended redirect ledger + a build-time git-diff check, NOT
automatic rename detection, which this same repo's own mining pass just proved unreliable at a 22%
undercount) and queued it as a soft prerequisite of publication (**P2**), plus a small outstanding
`file://` click-test alongside it. (3) **Protocol 50 + R8**, shipped rather than merely queued: a
standing rule that plans get written here in the same session they're decided, backed by an automated
pre-push nudge (`scripts/queue-drift-check.js`, Suite 242) that lists every `type: project` orchestrator
memory not yet referenced in this file — the mechanism that makes (1) and (2) not recur.

### 2026-07-20 — a museum accuracy audit closed the gap between this file and reality

Item **P (THE MUSEUM)** was still marked ⬜ and read as a future proposal, but the museum has actually
shipped: the generator (`museum/generate.mjs` in the archive) runs and produces `museum/site/`, four
hand-written release accounts (2.5.0 / 2.6.0 / 2.8.0 / 2.8.5-draft) are approved and frozen, and both a
correctness pass and a release-cadence generation pass ran. P is rewritten to say so. Three things that
had no home in this file are now recorded under it: a **museum-reproducibility sub-program** (three
archive sessions fixed a CRLF/LF page-renaming bug and a gitignored README leak; a fourth is in flight,
replacing content-hash doc addresses with path-based ones and mining a redirect ledger from this repo's
own git history first, because 62 of the 306 hash-named pages that have ever existed are gone from the
current site and recoverable only by walking history, a window that closes once path-based naming
lands); the **museum publication plan** the owner locked this session (public after the 2.8.5 release
and before 2.9.0, a clean new repo — `Robco-Exhibit` — on **Cloudflare Pages** rather than GitHub Pages
specifically because a GitHub project site would share browser origin and localStorage with the live
app, name substitution with a fail-closed guard, and a publication diff verified before anything goes
live); and a new **reproducibility CI** item (**J**, owner: "go with recs") that turns three sessions'
hand-proof into a standing gate. One more new item, unrelated to the museum: **L**, a generated,
phone-readable HTML view of this very file, decided this session under a ONE-SOURCE-TWO-VIEWS ruling.

### 2026-07-20 — Group 1 (data safety) re-opened with A3

A3 is a save→sync→load cloud round-trip test against the free local Firebase emulator, asserting
field-level fidelity so a field added to state but missed in the sync mapping fails the gate. The gap
was established from code, not assumed: `boot-smoke.mjs` allowlists away every Firebase network error,
and Suite 46.17 — the closest existing check — asserts a hand-typed field list, so a new field goes
green while never syncing. The entry states its costs honestly (a dev-only `firebase-tools` dependency;
no coverage of real Firebase, App Check or network behaviour). **The App Check entry is CLOSED** —
enforcement was already live and the owner deleted all three debug tokens in the console, so the
Museum-publication blocker is cleared.

### 2026-07-19 — a Group-3 batch pass plus a truthfulness sweep of the tail

**Group 1 (data safety) is now COMPLETE** — A0, A1 and A2 had all shipped but were still showing
unticked, as had **O** and both batches of **N**; all six are now marked. Of the Group-3 batch: **E**
(dead RECIPES.CSV tables, both games) and **K** (the backup script) shipped; **M** was re-audited and
closed as already-done with nothing orphaned left to remove; **B** landed one of its four deferred
conversions and the rest is now a named list rather than a vague bucket; and **C1** was deliberately NOT
done — investigation found it collides with Protocol 29 and Protocol 33, so its entry now carries the
blockers instead of a false "small win" framing.

### 2026-07-18 — the health round marked shipped, a full ordering evaluation, and two placement passes

(1) Marked the **entire 2.8.5 code + test health round (U1–U12) SHIPPED**, plus the UI-truthfulness
fixes and the **Protocol 23 architecture-conformance enforcement** capstone. (2) A **full ordering
evaluation** of the whole roadmap — the floating end-of-round deliverables, the leftovers, and the
pre-3.0 items each placed in dependency order with a "why it sits here," and the one real mis-ordering
(list virtualization) moved to its foundation. (3) A **placement pass for a new batch from two external
AI reviews** — near-term LIVE-SAVE DURABILITY (data-safety, runs first), the rules/governance
restructure (delete the test-count bookkeeping, path-scoped rules + a retirement rule, a first staged
trim, the re-pin), two cheap cleanups, two consciously-unversioned items, and the native ES-modules
migration bundled into 3.0. (4) A **placement pass for the 2026-07-18 live AI test** — the AI/Overseer
audit yielded **A0** (confirmed real item-loss, jumps to the front of Group 1 ahead of live-save
durability) plus the **N** unit (Findings 2–8, non-gating), the **Museum** (item P), and the
test-artifacts self-cleaning ride-along (item O). Each new item was verified against real code before
earning its slot. The tail was regrouped into four ordered groups; item D moved next to the Atlas; the
three owner-dropped ideas were recorded as closed.

### 2026-07-20 (R4) — re-pin

The brain dump, code map, test catalog, this file, `library/MANIFEST.txt` and the archive now all
describe one commit; the literal hash is in each library doc's BASELINE PIN header and in the archive's
stamp. Compare it against `git rev-parse dev` to see whether they are still current.

---

# Status-summary history — the original "where we are right now" bullets (verbatim)

_These are the exact bullets that used to sit under `QUEUE.md`'s "5-second version" heading, preserved verbatim; `QUEUE.md` now carries a genuinely short version._

## Where we are right now (the 5-second version)

- **2.8.0 "The Physical Machine" is SHIPPED and live on production.** The whole New Vegas overhaul, the offline native calculators, the Diagnostic Shell, the ambient runtime, the living core — all live.
- **The brain dump is done, re-baselined, and RE-PINNED at R4 (2026-07-20)** — the deep Claude-facing reconstruction of the project, reshaped to hold only the un-derivable WHY (everything a script could compute was cut and replaced with a pointer). Its R4 re-verification found and fixed real drift, not just an old date. This roadmap file is its phone-readable companion.
- **2.8.5 is now essentially DONE on `dev`** — the whole version, not just the spine. The code+test-health restructure, the library/token split, the Fallout 3 Pip-Boy skin, the data-provenance re-sourcing, all three save-integrity layers, the UI-truthfulness fixes, **and the entire U1–U12 health round** have landed. What's genuinely left before the release: the per-game legacy/schematic layout, a short tail of small leftovers, and the end-of-round review/synthesis deliverables. All expanded below in order.
- **The Fallout 3 device skin program is COMPLETE** (item 4) — units U0-U9, the bottom-dock occlusion fix, and the final skin-architecture extraction pass all shipped on `dev`. MANIFEST density (the item list being ~half a row short of the mockup) is **deferred to just before the Fallout 4 round** by your call. The extraction pass named the one small FO4-readiness refactor to do before 3.0 — the "machine-family skin re-key" (its own ⬜ unit near the 3.0 section below).
- **All three save-integrity layers are SHIPPED** — the write-side survival test + `persist()` request (Layers 1–2), and the read-side fail-loud pass (Layer 3): a corrupt campaign is now QUARANTINED not deleted, with READ FAULT / EVICTION boot banners, and a latent bug that could have deleted a HEALTHY save was found and fixed.
- **The whole U1–U12 code + test health round is SHIPPED** — real offline-first + boot-smoke behavioral tests (green now means "it boots and paints," not just "the source greps clean"), static→behavioral test conversions, CI failure-evidence capture, gate profiling, protocol consolidation, the dev console stripped from the player build, measured perf, accessibility driven 40→**0**, and the security/offline/code-quality sweeps. **Capstone: Protocol 23 is now ENFORCED** by a static architecture-conformance gate — the render→state debt is baselined (20 render→save + 26 service→view + 0 registry) and can only shrink.
- **The data-provenance program is SHIPPED** — every game database across BOTH games re-sourced to `fallout.wiki` and locked behind automated guards, and the Fallout 3 karma engine rebuilt.
- **A warning-surface inventory ran (2026-07-16)** — findings became the shipped read-side/UI-truthfulness fixes plus criteria folded into the 2.9.0 round. Full analysis: `planning/2.8.5/audits/WARNING_SURFACE_INVENTORY.md`.
- **The end-of-round deliverables are now placed and ordered** — the blind workflow review (after its 4 process refreshes), an optional system-model review, and the ROBCO SYSTEM ATLAS — all as the 2.8.5 capstone, not floating.
- **Item F is DONE, and item G (the blind workflow review) grew a THIRD witness and a committed artifact (2026-07-20).** F's four process refreshes were executed by bringing the standing review prompt fully current and adding two audit sections it never had — one that turns the review's lens on **Dispatch itself** (is the orchestrator holding its own weight, not just the models), and one on the **copy-paste hand-off cost** of adding models. G now runs with **DeepSeek as a one-time, free, hosted-only THIRD WITNESS** (never a gate, gets the workflow description only — it retains/trains on inputs), and its synthesis lands in a **claim-ledger file committed to the repo**, not held in Dispatch's context. A Gemini proposal to replace Dispatch with DeepSeek-as-dispatcher was rejected and kept as a calibration specimen (it described a workflow the owner doesn't have). Full detail under items F and G below.
- **A new near-term batch (from two external AI reviews) is now placed** — first **LIVE-SAVE DURABILITY** (the live campaign container has no IndexedDB shadow; recoverable, eviction-conditional data loss), then the **rules/governance restructure**: delete the test-count bookkeeping, break the one big rulebook into a short universal contract + surface-scoped notes, add the project's first-ever **retirement rule** (a way to REMOVE a guard, not only add one), a first staged trim, and a re-pin of all local-only docs. Two cheap cleanups and two consciously-unversioned items ride along. The tail below is now four ordered groups (data-safety → governance → small fixes → deliverables).
- **The staged trim's remaining stages are now real queued items, not a memory-only footnote (R5-R7, added 2026-07-20).** R3 was always labelled the FIRST staged cut; stages 2-4 existed only in Dispatch's memory until now. **R5** (convert prose into enforcement) is ready to plan. **R6** (narrow the universal escape-ratchet — the contentious one) explicitly waits on your call, not a session's judgment. **R7** (cut actual infrastructure — the Diagnostic Shell's scope, the duplicate CI leg, nightly runs, the browser test page) needs its own cost/benefit case per item. All keep-cases (architecture baseline, real-device auth, UTF-8 integrity, cloud safety, cache bump, no-concurrent-pushes, and "actually render UI changes") are recorded so none gets re-litigated by accident.
- **A standing fix for "plans reaching this file late" is SHIPPED, not queued (Protocol 50 + R8, 2026-07-20).** A pre-push nudge (`scripts/queue-drift-check.js`) now lists any `type: project` memory that doesn't look referenced in this file, the same fail-safe never-blocks shape as the existing backup-archive nudge. This is the direct fix for the exact gap that produced the R5-R7 and rename-permanence entries below — they all sat in memory days-to-weeks before reaching here.
- **The fourth context source — the `robco-uos` skill — is now a POINTER, not a second copy of the rules (R9, SHIPPED 2026-07-21).** A session is oriented by four things: the rules, this queue, the memory store, and an installed **skill** that loads before the repo is even opened. The skill had no in-repo source and had rotted — two sessions found it pointing at a dead repo path, citing the deleted PowerShell runner and a retired protocol. The corrected fix (after your tightening): don't make the skill a hand-maintained _copy_ that needs policing — make it a **pointer** that says "read `CLAUDE.md`, follow its retrieval map," restates nothing, and so has almost nothing that can drift. An earlier pass this session over-built here (a bespoke `Suite 243` + a standing nudge); both were **removed** for failing the "a guard must earn its existence" bar — the source's only real drift risk (naming a deleted file/protocol) is now caught for free by folding the skill into the _existing_ Suite 220. **Net new mechanisms: zero.** One manual step is left for you: **re-install the corrected skill via Settings › Capabilities** — the installed copy is still the old stale one, and only a re-install can refresh it. Full detail: R9 below.
- **Protocol 50's blind spot is named honestly — and no guard was built for it.** Rule 50(a) _already_ requires a conversation-only decision to be written here that same session; the only missing half is enforcement, and it **cannot exist** — a script can't read a conversation, and the riskiest sessions (purely conversational, no push) never reach the hook. Subsection (c) now says exactly that and tells future sessions **not** to build a conversation-scraping guard (it would be the "guard that pretends" the retirement rule warns against). Proven necessary by the DeepSeek roster decision, which sat unrecorded for hours the day 50 shipped.
- **The museum is now designed to serve the AI too, not just humans (P3, DESIGN ONLY).** Your idea: the library says what the code IS; the museum records what was tried, rejected, and learned — and for a fresh session with no history, _that's_ the higher-value half, because the priciest failure is re-proposing something already buried. The hazard is that the museum is deliberately past-state, so the guard is **provenance, not permission**: every fact carries a status, derived from a supersession link graph (not a hand-set flag that rots), fail-closed on unknowns, and no rejected entry ships without its _why_. Reads the private manifest, never the 190 MB HTML or the sanitized public tree. Sits after P1, independent of publication. Design queued under item P; build is a separate archive session.
- **The 2026-07-18 live AI test produced a data-loss finding that now leads the whole tail.** The first real end-to-end Director-Link session since going offline-first (owner ran it, sent screenshots) surfaced **confirmed silent item deletion**: the AI-import path full-_replaces_ the inventory array, so a turn where the model returns a short/empty array deletes real items — verified in code, not a miscount. It's carved out as **A0** and **jumps ahead of live-save durability** (unrecoverable + every-turn beats recoverable + eviction-conditional). The other seven findings (retry echo, wrong severity on a network blip, "Courier" in a Fallout 3 game, a misleading log export, tab-jump → in-place cards, ambient-chatter volume, and a directive-authority audit) are the non-gating **N** unit. Two more rode in on the same pass: **the Museum** (item P — a generated, browsable history of the archive, built before the 2.8.5 release so it backfills every version) and **test-artifacts self-cleaning** (item O). Full write-up: `planning/2.8.5/audits/AI_OVERSEER_AUDIT.md`.
- **The Museum (item P) is BUILT, not just planned — this file previously said otherwise and was wrong.** The generator runs, four release rooms are frozen, and a correctness pass plus a release-cadence pass both shipped. What's left is a **reproducibility sub-program** (three fixes shipped, a fourth is in flight right now rebuilding page addresses so a fresh clone always regenerates byte-identical output), a new **rename-permanence design** (added 2026-07-20 under P1 — an alias ledger + a build-time git-diff check, deliberately NOT automatic rename detection, since this repo's own history-mining pass just proved that 22% unreliable), a small outstanding `file://` disk-open click-test, a **standing CI guard for that reproducibility** (new item **J**), and **publication itself** — locked to run after the 2.8.5 release and before 2.9.0, to a brand-new `Robco-Exhibit` repo on Cloudflare Pages (never GitHub Pages — it would share browser origin with the live app), with name substitution and a publish-time diff check. Full detail under item P below.
- **A generated, phone-readable HTML view of this very QUEUE is now queued (item L)** — this file is 900+ lines and not something to read on a phone, and the owner steers from it. `QUEUE.md` stays the single source of truth; a private view for the owner is generated soon (small, useful now); a separate player-facing view, built from ONLY items explicitly opt-in marked public, waits until after the museum publication work so it can reuse the same substitution/guard machinery.
- **The native ES-modules migration is now on the map — bundled into 3.0** alongside Fallout 4 (same boot surface, opened once), because a module can only touch what it imports, which finally makes the layering rule structural instead of scanner-enforced. Still no build step, ever.
- **After that is 2.9.0** — the big one: gameplay systems, ambient life, and the "it's a real operating system" round. Its hardening gate (which burns down that baselined architecture debt) sits BEFORE the OS services that would otherwise multiply it — a load-bearing order.
- **Then 3.0** is Fallout 4 as a real playable third game.
- **A "for fun" recreation prompt sits dead last**, by your own placement.

Everything below expands each of those.

---

# Shipped accounts (verbatim from the original `QUEUE.md`)

<a id="v280"></a>

# ✅ 2.8.0 — "The Physical Machine" (SHIPPED · live on prod)

**What it is.** The New Vegas overhaul. Every screen was rebuilt to look and behave like a real piece of RobCo hardware instead of a character sheet with a skin. This was a huge release; here's what's actually inside it so none of it ever resurfaces as "still to do":

- **Every subsystem re-dressed as a bespoke instrument** — the illuminated keycap bezel nav (replacing the old tab bar), a load-cell weigh bridge for carry weight, a seven-fader mixing board for S.P.E.C.I.A.L., an anatomical zone plate for limbs, a reputation console, a cartography table, a tempo dial, a records bay, operator boards, and the living reactor core in the chassis.
- **The offline native terminals** — combat math (V.A.T.S.), threat assessment, barter, databank lookups (CONSULT), medical advisory (BIO-SCAN), looting, level-up, typed stat edits, perk eligibility, world-map travel, and on-device screenshot reading (OCR). All of these used to lean on the AI; they now run fully offline with no AI call and no network.
- **The Diagnostic Shell** — a 159-tool developer/debug console, leak-proof so production players can never see staging-only tools. This is the panel the future hacking minigame will unlock; the unlock hook is built and waiting.
- **The organizing layer** — the global Immersion dial (one master control for the whole atmosphere layer), the Tool Deck launcher, the play-along TERMINAL quick-entry mode (type one line while you play and it routes to the right system), the Module Bay (settings reframed as installable hardware boards), and the partial command language.
- **The ambient runtime** — the terminal now has real operating states (cold boot → ready → active → idle → standby → shutdown) with one shared heartbeat that everything reacts to, including the shutdown power-down ritual.
- **Hardware-life beginnings** — randomized/degraded boot flavors, the firmware-flash and long-absence boot beats, the Overseer's Log (uptime, boot count, sessions), and campaign statistics.
- **The feel layer** — 33 feedback animations (level-up card, faction ink-stamp, map survey ping, damage tear, and more), five ceremony beats, per-game identity theming, and a mobile-density pass.
- **The foundations underneath** — the event bus, the two-store settings/campaign boundary, the AI-directive and boot decompositions, and a behavioral test around the save-import path (which caught a real state-corruption bug).
- **The end-of-overhaul design audit ran** and its fixes shipped.

**Done means:** it's live on production. It is.

## Design Overhaul protocol amendments — what's landed, what's still pending

_(Moved here from the rulebook at R3, 2026-07-20 — it tracks roadmap status, not a rule, so it
belongs on the board rather than inside a protocol.)_ The owner approved a batch of rule changes
for the Design Overhaul program; each folds in with the unit that first depends on it.

- **✅ Adopted at DO-K:** the `GAME_DEFS[ctx].identity` block as the one per-game design-data home (`rules/game-data.md`, Protocol 38).
- **✅ Adopted at DO-N:** Protocol 25's sanctioned-exception clause extended site-wide, plus explicit authorization to replace the tab bar with the bezel subsystem nav; **Protocol UI-7** (Device Chrome / Bezel Standard); **Protocol UI-9** (Motion-Verb Grammar — the SWEEP token).
- **✅ Adopted at Ceremony Moments Wave 1:** UI-9's **SEAT** token.
- **✅ Adopted at DO-O:** **Protocol UI-10** (Overseer Presence — the Director Uplink reskin is its first build).
- **⬜ Still pending:** UI-9's **WAKE / FAULT / BREATHE** tokens; **UI-8** (the Centering Rule as its own formal protocol — DO-N's bezel already follows it informally); Protocol 10 (UI Verification) amended into a per-machine × per-breakpoint render matrix (gates DO-M); and the new Design-Unit Workflow protocol.

Every adopted item lives in `rules/ui-and-mobile.md`. The full text of each still-pending
amendment is in `planning/2.8.0/plans/DESIGN_OVERHAUL_BUILD_PLAN.md` §8.

<a id="braindump"></a>

# ✅ Brain dump (SHIPPED, and maintained from here on)

**What it is.** A complete Claude-facing reconstruction of the whole project — the vision, the architecture, every subsystem, every protocol and the bug that caused it, the recurring gotchas, your hard rules, the workflow, and the roadmap. Plus this phone-readable roadmap file and a pointer index in the rules doc.

**Why it exists.** So every future work session starts accurate instead of re-deriving the project from scratch. The accuracy pass also caught real doc drift (things the old docs claimed the code doesn't actually do), which got written down so nobody trusts them again.

**Done means:** the deep doc lives locally for Claude, this file is readable on your phone, and sessions auto-point to both. Shipped.

<a id="u1"></a>

## 1. ✅ The code + test health phase — the spine (SHIPPED, 2026-07-12)

**What it is.** A deep cleanup and restructuring of both the codebase and the test suite, run as one coordinated phase (not scattered passes) so the pieces don't fight each other. Several strands.

**What becomes easier because this exists:** every later 2.8.5+ unit (Fallout 3, the schematic layout, the whole 2.9.0 round) now lands on a codebase that's organized by purpose instead of a few enormous files — new work goes into a clearly-labeled home instead of one more thing bolted onto an already-overloaded file. The pointer-index + code-map pattern means a session no longer has to load the whole rules doc to get oriented.

**a) ✅ Readability / code-organization refactor — shipped.**
The app grew organically into a few enormous single files. This strand splits them sensibly, gives each file a header explaining what it is and what it exposes, cleans up naming into predictable conventions, and sweeps out dead code. The north star, in your words: someone who has never seen the code should be able to open it and understand it cleanly. A decision already made: the diegetic/in-fiction code renaming idea is scrapped — readability beats flavor in the source.

**Shipped:** the largest UI file split into six responsibility-scoped pieces, then the API/services hub split into three (directive builder, AI-import path, native command router) and the render pipeline split into nine per-panel files; the entire `js/` folder reorganized out of one flat pile into labeled subfolders by purpose (game content, core engine, on-screen interface, outside-world services, developer-only tools); the giant stylesheet split into twelve order-scoped files, cut in the exact cascade order they always loaded in; a readability pass adding per-file headers, section banners, and WHY/GOTCHA comments across the restructured files; and two real bugs the restructure surfaced and fixed along the way (equipped-item reconciliation across every removal and load path; the Karma Center companion list moved out of a hardcoded literal into `GAME_DEFS`). Every reorganization was a pure filing exercise plus the two named bug fixes — no other behavior changed.

**Newcomer materials — NOT done, deferred:** the guided "start here" onboarding narrative, the internal-vocabulary glossary, and documented data shapes (character state / AI schema / game definition / save file) did not ship in this pass. They fold into a later doc pass, not blocking Fallout 3.

**b) ✅ Library / token split — shipped.**
The rules doc used to carry a giant suite-by-suite test history loaded into every single work session, burning tokens whether it was needed or not, and it had drifted out of sync with reality.

**Shipped:** the rules doc cut from roughly 80k to roughly 23k tokens by moving the per-suite catalog out into a local reference library (`library/TEST_CATALOG.md`); a Reference Pointer Index plus `library/CODE_MAP.md` so a session is auto-directed to the right reference instead of loading everything blindly; the three-class library maintenance model (**live** docs kept current and gate-guarded, **generated** docs meant to be produced from source rather than hand-written, **archive** docs frozen and stamped "snapshot as of X"); and a new doc-reference integrity gate check that fails the build if a doc names a global, file path, or load-order that doesn't actually exist in the code, plus a boot-chain preflight keeping the app shell, service worker, docs, and test harness in agreement. The portable-brief-for-another-AI idea is generated fresh on demand, never stored, per the original design.

**Still generated-in-name-only:** the test catalog is hand-synced today, not actually auto-generated from the test runner — that generator is explicitly a separate, later unit, same as originally scoped.

**c) ✅ Test-health pass — SHIPPED as the U1–U12 health round (2026-07-18).**
This strand ran in full as a numbered twelve-unit round. What it delivered, in plain English:

- **U1 — offline-first is now a real behavioral test, plus a fast boot-smoke at the COMMIT boundary.** Before this, committing green only meant "the source greps clean" — not one of the 234 suites opened a browser. Now a headless browser actually cuts the network, loads the app, and proves it reaches READY, paints a real screen, and a native tool still works with no network — and a lightweight boot check runs at commit time, so **green finally means "it boots and paints."** This closed the single biggest honesty gap in the whole gate.
- **U2 — assertion-strength / dedup audit.** Read every static suite and ranked them. Verdict: about **92% of the "75% static" tests are legitimately static** and pull their weight; the false-confidence problem was real but concentrated in a small set — which became U3's hit-list rather than a mass rewrite.
- **U3 (six slices) — static→behavioral conversions.** The concentrated weak spots were rebuilt to actually EXECUTE the code instead of grepping the source text: AI-save-import, map-visit memory, inventory write paths, sleep/wait, trade prices (which had been faking the math on the TEST side!), quick-log trackers, V.A.T.S. (extracting a pure combat-math function so it's genuinely run and checked), SPECIAL clamps, the save clobber-guard, delete-before-save ordering, the export→import round-trip, and cloud overwrite/delete protection. A static test proves the code LOOKS right; these prove it IS right.
- **U4 — CI failure-evidence capture.** When CI goes red it now uploads a screenshot + console + per-check log, so a failure is diagnosable without a re-run.
- **U5 — gate profiling + a flake fix.** Measured every gate step's wall-time (render-integrity ~51%, save-survival ~37% — nothing safe to cut) and fixed an animated-screenshot flake by freezing motion before capture.
- **U6 — protocol consolidation.** Merged Protocols 32/33/35 and grouped 29/30/31 losslessly (~1,074 tokens saved every session, every old number still resolves) and added the **protocol-reference guard** so every "Protocol N" reference must point at a real heading — doc drift now ratchets like code drift.
- **U7 — the ~204 KB dev console is stripped from the PLAYER build only,** with a deploy-fails-safe assertion; dev/staging keep it. Prod ships lighter and the console can't leak.
- **U8 — performance: measured, already lean** (first paint ~70 ms); nothing safe to cut. Two real wins were deliberately deferred (gate the cloud warm-up; virtualize long lists — both placed in order below).
- **U9 — accessibility 40 → 0.** The old "40 violations" baseline turned out to be **v2.0.1 ghosts** in a stale file; the 23 genuinely-missing form labels were fixed, and the gate now enforces a true zero.
- **U10 — offline sweep: airtight** (all 47 core files precached; every online feature properly isolated).
- **U11 — dependency / security: 0 vulnerabilities;** Firebase/Tesseract pinned or self-hosted; escaping verified.
- **U12 — code-quality: already clean,** nothing to remove — recorded as evidence the sweep ran.

**★ The capstone — Protocol 23 is now ENFORCED (SHIPPED, Suite 236).** For years Protocol 23 ("rendering only renders; state.js owns state; services don't own the view") was right as intent but the code violated it. A static architecture-conformance scanner now **blocks new cross-layer violations at the gate.** Existing debt is baselined, not retroactively rewritten, so the number can only shrink: **20 render→save calls, 26 service→view calls, 0 registry violations.** (The external ecosystem review independently named this the single highest-value mechanism it could recommend.) This baselined debt is what the 2.9.0 hardening gate burns down — which is exactly why that gate must run before the OS services (see the ordering note in the 2.9.0 block).

**The one-line takeaway:** the raw test count was never a measure of correctness; this round moved the needle from "the source greps clean" toward "the app demonstrably works," and made the gate honest about which it is.

**Why it sat first.** This was the spine. Everything after it — Fallout 3, the schematic layout, and the entire 2.9.0 round — would otherwise have been built on a codebase that was about to be torn apart and reassembled. Building Fallout 3 first would have meant building it twice.

**★ Hard exit condition — MET.** This phase changed the whole file layout, which invalidated large parts of the brain dump's architecture sections. The brain dump has been re-baselined against the restructured code, closing the condition written into both this file and the brain dump itself.

**Owner's exit line, followed exactly:** _if the phase grows past the spine, stop and ship Fallout 3._ The spine (strands a + b, plus the one concrete test-health win of deleting the redundant runner) is done. Strand (c) in full and its folded audits are real, high-value work — just not spine — and defer to a later pass rather than blocking Fallout 3.

**Done means (as actually delivered):** files are navigable and headed, dead code is gone, the rules doc is lean with the catalog moved out, a doc-reference integrity gate now catches drift automatically, the redundant test runner is gone with zero coverage loss, and the brain dump is re-baselined. The newcomer docs and the full test-health pass are explicitly not part of "done" here — they're queued, not forgotten.

<a id="u2"></a>

## 2. ✅ Performance / accessibility / asset-and-bundle-size work (SHIPPED — folded into the U1–U12 round)

**What it was.** With the codebase clean, measure and actually improve real load performance, accessibility beyond the current baseline, and the size of what ships to the device.

**How it shipped.** This turned out to BE the back half of the U1–U12 round rather than a separate unit: **U7** stripped the 204 KB dev console from the player build (real payload cut), **U8** measured mobile boot and found it already lean (~70 ms first paint — no safe cuts, honestly reported, two wins deferred), and **U9** drove accessibility from a stale "40" to a true **0** and locked the gate to that floor. Every improvement is measured, not guessed — the explicit bar this item set for itself.

**Done means:** measured, real improvements. Met.

<a id="u3doc"></a>

## 3. ✅ Brain-dump update — re-baselined on the clean codebase (SHIPPED, 2026-07-12)

**What it is.** The explicit re-baseline that closes the hard exit condition above: re-verify the brain dump against the restructured code and rewrite the parts that moved. The vision sections stay stable; only the structural sections refresh.

**Why it exists.** A stale reconstruction doc is worse than none — it makes sessions confidently wrong.

**Status.** Done, as part of item 1's spine — see the hard exit condition note there.

<a id="fo3"></a>

## 4. ✅ Fallout 3 device skin — the virtual Pip-Boy (COMPLETE — U0-U9 + the bottom-dock occlusion fix + the skin-architecture extraction pass all shipped; MANIFEST density deferred to pre-3.0)

**What it is.** Fallout 3 stops wearing New Vegas's face and gets its own device identity. The panels themselves stay one shared, dynamic set (they already adapt per game — Fallout 3 shows bobbleheads instead of snow globes, the Capital Wasteland map, its own factions, its Karma Center, no magazines). What changes is the **device chrome around them.** New Vegas is a salvaged desk terminal; Fallout 3 becomes the Pip-Boy 3000 itself.

**The preferred form** (your call) is a full "functioning virtual Pip-Boy" body that frames the shared panels — the panels literally become the Pip-Boy's screen. **The fallback**, if that proves too much, is Pip-Boy-themed bezels only. You prefer the full version.

**Why it sits here.** After the health phase, on purpose, so Fallout 3's identity is built on the clean codebase and doesn't have to be redone. A decision already settled: there is no separate ground-up Fallout 3 machine — it inherits the shared panels with per-game data and wears the Pip-Boy chrome over them.

**Done means:** switching to Fallout 3 gives you a visibly different, Fallout 3-native device.

**✅ The bottom-dock occlusion — SHIPPED (`ebb1549`).** Broadening the automated screen-check to actually cover New Vegas on mobile (it previously only ever checked Fallout 3) had found that the fixed bottom bezel dock — `position:fixed` on every screen under 1000px, by design — could visually cover whatever content rendered in its own footprint at the current scroll position, on both games' flat mobile view. Confirmed live on the S.P.E.C.I.A.L. board and four others at 360-412px (14 covered controls in total). It got its own deliberate unit, as flagged: the flat mobile view now scrolls its boards inside a bounded shell that stops above the dock — the same structure the AI-channel view and the sideways Fallout 3 screen already used — so the fixed dock only ever floats over empty reserve space, never live content, at any scroll position. The render-integrity guard's temporary "known dock overlap" exception was deleted in the same commit, so any future dock overlap now fails the gate normally at the exact screens that failed before. A world-map scroll-preservation regression the bounded shell introduced (tapping a map node then backing out jumped the view) was caught in verification and fixed in the same commit.

**Where FO3 actually stands (2026-07-14).** The "done means" above was written before FO3 started; it has since shipped **units U0-U9** on `dev`: the Pip-Boy spine and sub-view switching, the weathered device casing (nameplate, radio knob, status gauge, settings toggle), the six re-laid-out landscape boards (merged STATUS around the Vault Boy figure, seven-row S.P.E.C.I.A.L., list-plus-detail SKILLS/PERKS/MANIFEST, plain boxed mission/faction/karma readouts), the scroll-trap and bounded-glass fixes, the all-green-glass discipline, and a real **render-integrity guard** (`tests/render-integrity.mjs`) that now asserts across **12 configs** (both games × phone/desktop × populated/empty) and has already caught and fixed real defects in BOTH games. The full independent audits are `planning/2.8.5/audits/FO3/AUDIT_FO3_U7.md` and `planning/2.8.5/audits/FO3/AUDIT_FO3_U8.md`. **U8 closed the entire U7 audit punch-list** (render-integrity allowlist matching the bezel dock by actual DOM membership; Fable's approved VARIANT A Vault Boy figure — a full hand-drawn redraw, verified legible at the real 780×360 size; MANIFEST density improved via a one-tap filter-row toggle; the crippled-limb chip spelling out "CRIPPLED" in full; the perk-list delete "✕" reset to green) **but the U8 audit found it shipped two real regressions of its own:** the body-part health toggles were laid out on the opposite side from the Vault Boy figure limb they actually control (tapping L.ARM lit up the figure's right side and vice versa — the owner's own bug report, reproduced and root-caused), and the "last remaining red element" CHANGELOG claim was false (three more red states — the radiation readout, the RadAway alert, and the low-HP screen glow — were still red). **U9 fixed both**, verified with a live red-then-green Playwright demonstration for the mirror fix (a new render-integrity assertion — box-vs-figure limb side correspondence — now guards it permanently) and a direct computed-style check for the red-removal (all four elements confirmed green with their non-colour meaning intact: the ✕ glyph, the "NONE IN PACK" text, the numeric RAD value). U9 also closed the U7 "RAD value clips" carry-forward (now visible without scrolling) and made a small, honestly-partial dent in the MANIFEST-density carry-forward (still short of a clean 6th row — the row height is already at the Protocol 17 28px tap-target floor, so there's no further safe room to reclaim without a bigger layout change).

**Two more real bugs found and fixed since, worth recording so they don't look unaddressed (2026-07-14).** Switching games through LOAD SLOT or VERSION RESTORE could leave the location/item/quest/perk lookups and the native LOOT/THREAT/CONSULT tools silently stuck on the OLD game's data even after the campaign itself flipped to the new one — fixed by making that switch reload the terminal like every other game-switch path already did. A related hardening guard shipped alongside it: the AI-driven save-import path now checks that its data lookup actually matches the campaign's current game before trusting it, so a stale lookup can never again mistake a real campaign's own items for garbage and silently delete them.

**✅ The post-FO3 skin-architecture extraction pass — SHIPPED (analysis, `planning/2.8.5/audits/SKIN_ARCHITECTURE_EXTRACTION.md`).** This was the last owed FO3 item: now that both machines are real and built (New Vegas = salvaged desk terminal, Fallout 3 = Pip-Boy 3000), measure from the actual code how much of FO3 was genuinely per-game vs. shared, so the FO4 "clean file-drop or real refactor?" question is answered with evidence, not a guess. **The abstraction held well.** FO3's entire divergence from New Vegas is ~2,100 CSS lines in ONE quarantined file (~13% of all CSS, ~96% of it inside a single landscape block), ~5 identity data fields, and 3 wrapper divs — with **zero forked render paths and zero game-name branches anywhere in the feature/render/state/api pipeline** (per-game behavior flows through `getIdentity()` data, not code forks). New Vegas is the un-gated default skin; Fallout 3 is a pure `[data-game='FO3']` override layer. The one real finding: that override is keyed to the GAME, not the MACHINE FAMILY — which becomes the single small refactor to do before Fallout 4 (see the "machine-family skin re-key" ⬜ unit near the 3.0 section). The reskin/data half of a new game is already a clean file-drop; only the re-body half needs that one scoped change.

**That completes FO3's skin program.** The dock occlusion is fixed, the extraction is done, and the only remaining FO3-flavored item — MANIFEST density — is deliberately deferred to just before the Fallout 4 round (its own item near the bottom of this file).

<a id="saveintegrity"></a>

## 5. ✅ Save integrity pass (SHIPPED, 2026-07-15)

**What it is.** A single save-contract hardening pass that came out of a blind completeness review (GPT + Gemini audited the roadmap for gaps; each finding was then verified against the real code before landing here). It's "the campaign data is safe" work, not visual polish, and it had two layers, not two separate items — one pass answering one question ("did the save survive?") from two angles: does the app itself preserve every field, and does the platform actually keep the bytes around to preserve. **Both layers shipped and passed their own independent audit.**

**Why it jumped the queue.** It moved ahead of what was left of FO3's cosmetic work — but **not** ahead of the karma rebuild or the data-provenance sweep, which are content-correctness work, not cosmetics. The reasoning in one line: a browser silently eating a campaign is worse than an item list being one row short.

- **✅ Layer 1 — semantic survival (the save-contract / upgrade-path health pass).** Nothing previously proved a months-old save actually survives loading into a _newer_ version of the app — the v7→v8 migration path was tested only as key-mapping, not as "a real, fully-populated OLD save boots all the way to READY without silently losing a field." Silent field loss is exactly the class of bug fixed during the FO3 work (the cross-game registry-leak fix and its hardening guard, item 4). **Shipped:** an automated survival test using real fixtures — a current save, a mature/high-density save, the oldest-still-supported save, a deliberately malformed one, and a save where the local copy and the cloud copy disagree — that compares the durable FIELDS themselves rather than the raw saved text (so it doesn't go brittle the next time a file gets reorganized), and proves durable campaign data survives serialization, migration, an app-version update, an offline reload, a malformed input, and a cloud sync with zero silent field loss. It also set the fail-loud bar for the whole pass: a failed, interrupted, or quota-exhausted write fails loudly with the original save left intact — never silently swallowed.

- **✅ Layer 2 — storage survival (the persistent-storage request).** The app is mobile-primary, offline-first, and save-sacred — but it had never once asked the browser to protect its data (`navigator.storage.persist()` was called nowhere). iOS Safari in particular will quietly evict localStorage/IndexedDB under low storage pressure or after roughly two weeks unopened, which can silently erase a campaign while every test in the gate stays green. **Shipped:** the app now asks for persistent storage at boot, the DENIED path (not just the happy-path request) is exercised by a real test, and when the browser says no the terminal warns you in its own voice with a "memory core unstable" style banner — because a request is not a guarantee, and the risk should never be silent.

<a id="dataprovenance"></a>

## ✅ Data-provenance program — both-games game-data cleanup (SHIPPED, wasn't originally in the queue)

**What it is.** An unplanned content-correctness program that grew out of a single bug report and turned into a full audit of every game database across both games. It was never a pre-scoped roadmap item — it's recorded here now so the work isn't invisible.

**How it started — the Enclave-karma bug.** The Fallout 3 Karma Center was warning about an "Enclave hit squad" that doesn't exist in the game, and it only ever fired at the most extreme evil karma while never warning good-karma characters at all (who also get hunted). That one wrong warning triggered a full **rebuild of the Fallout 3 karma engine**: the invented threat replaced with the real ones (the Regulators once your karma turns evil, Talon Company once it turns good), all 90 real karma level-titles wired in and updating live, the companion karma requirements corrected, and a duplicate karma readout and three unusable no-value karma actions cleaned up.

**What it became — a both-games data re-sourcing sweep.** Once one database was found wrong, every database got checked against `fallout.wiki` (Protocol 3, the wiki is the only source of truth):

- **Fallout 3:** the perk list (six perks that don't exist in FO3 removed — three fake "companion" perks and three that are really New Vegas perks — plus corrected names and level requirements), the bobblehead locations (two pointed at the wrong place), and the weapon list (dozens of wrong damage/crit/fire-rate/weight/value numbers fixed, explosive blast damage checked page by page, and four non-FO3 "weapons" removed).
- **New Vegas:** the weapon stats re-sourced, two wrong snow-globe entries fixed (plus a made-up seventh one corrected), and the armor / chems / creature (bestiary) tables all re-verified — including removing a fake "Whiskey Rose" drink that's really a companion perk.
- **Locked in:** the corrected data is guarded automatically by a golden-master check plus a numeric range-band guard, so a future edit that drifts a value off-wiki fails the gate. New Vegas's perk registry was checked too and found already clean.

**~3272 tests** across the program (the same gate the rest of the project runs).

**Small residuals still open (honest, low-priority):** New Vegas bestiary numbers are left as approximations on purpose — the game scales them by level, so there's no single wiki value to pin them to. Two other residuals from this sweep are now formally placed in the **2.8.5 tail** block below rather than "a later housekeeping pass": the dead internal RECIPES reference (tail item E) and the stale hand-maintained `library/TEST_CATALOG.md` (tail item D — which fixes the drift at the root by generating it instead of tidying it by hand). Neither affects the app.

**Done means:** every game database across both games reads from the wiki, the corrections are guarded so they can't silently drift back, and the karma engine tells the truth. Shipped.

<a id="saveintegrityl3"></a>

## ✅ Save integrity — Layer 3: read-side fail-loud (SHIPPED)

**What it is.** The read-side sibling of the shipped save-integrity pass (item 5 above). That pass made save WRITES fail loudly (Layer 1) and asked the platform to keep the bytes around, warning when it wouldn't (Layer 2 — the "memory core unstable" banner). This closes the remaining silent side: what happens when the app READS the campaign back and something is wrong. Scoped from the warning-surface inventory (`planning/2.8.5/audits/WARNING_SURFACE_INVENTORY.md`), which ranked these as the biggest silent gaps in the whole app. Three pieces:

- **A boot-time warning banner with two triggers** — reusing the exact banner pattern the "memory core unstable" warning already established (a hidden inert template in the page, a boot-time detector that clones it in only when the risk is real, tap to dismiss, a device-pref record). Trigger one: the live campaign fails to load at boot because it's corrupt — today the app silently deletes it and starts fresh with zero explanation, the single worst silent failure the inventory found. Trigger two: storage eviction detected after the fact — the "this terminal has booted before" marker survives in cold storage even when the browser wipes local data, so "booted before, yet no campaign present" is an eviction signature the app can already read for free; today that user is indistinguishable from a brand-new one and never learns their campaign was reclaimed. One banner mechanism, two trigger conditions.
- **Actually quarantine a corrupt save instead of deleting it.** The code's own comment says "quarantined," but what it does is delete — the corrupt bytes are destroyed, so nothing can ever be recovered or diagnosed afterward. Preserve the corrupt data under a quarantine key before clearing the live slot, so a recovery or a diagnosis is at least possible.
- **Tell the truth about degraded slot writes.** A slot save is written to two stores (local memory + cold storage); today, if only ONE of the two accepts it, the app still reports plain full success. Surface the degraded mode with a one-line notice instead — the save DID persist, so this is a quiet heads-up in the transcript, not a banner.

(The inventory also names one minor tail item for this unit: when cold storage is entirely unavailable AND the browser has denied persistence, the existing "memory core unstable" banner's condition is compounded, and its wording should say so.)

**Why it sits here.** The same rationale that let the save-integrity pass jump ahead of cosmetics: a silently-lost or silently-wiped campaign outranks polish. This is data-safety work and the direct unfinished half of an already-shipped item, so it runs near-term rather than waiting for the 2.9.0 round. (The inventory also confirmed four related conditions already have homes and are deliberately NOT re-added here: the boot-phase failure notice and the post-deploy update-failure notice both live in the 2.9.0 hardening gate, the offline indicator lives in the Round-2 program, and a TOTAL save-write failure already warns loudly today.)

**Hard rule.** Both banner triggers get behavioral tests — each branch actually driven and asserted, the way the shipped Layer 2 banner's denied-path already is. A warning that only exists in theory is exactly the class of silence this unit ends.

**Done means:** a corrupt or evicted campaign is announced in the terminal's own voice at boot, corrupt data is preserved for recovery instead of destroyed, and a half-successful slot write never reports as full success.

**Shipped (2026-07-16, dev — all three pieces plus the tail item):** the corrupt-save handler now quarantines the exact bytes (localStorage + a durable IndexedDB copy, never overwriting an earlier unresolved quarantine) instead of deleting; a QUARANTINED RECORD row in the saves list carries EXPORT + confirm-gated PURGE; the READ FAULT banner re-shows every boot until resolved; the EVICTION banner fires only on the strict three-part signature (boot marker absent from local storage AND recovered from cold storage this boot AND no campaign of either vintage) so first boots / swipe-aways / post-quarantine / slow-storage boots stay silent; degraded slot writes post a once-per-session notice naming which store held the save; and the compounded "cold storage offline" wording landed on the Layer-2 banner. The diagnosis also found and fixed a latent second defect: the old catch wrapped the post-load migration helpers, so a helper bug on a VALID save would have deleted it — helpers now fail soft, locked by a behavioral test proven red against the old code. Both banner branches, the valid-save no-banner path, the eviction false-positive family, and both degraded-write modes are behaviorally tested (Suite 233 + save-survival LAYER3 sections), with Diagnostic Shell triggers for every hard-to-reproduce condition.

<a id="uitruthfulness"></a>

## ✅ UI truthfulness fixes — stop reporting success on a partial or failed operation (SHIPPED)

**What it was.** Three tiny fixes from the warning-surface inventory, grouped because they shared one theme: the UI was reporting success — or "nothing here" — when the truth was "the operation failed." All three shipped alongside the read-side save pass.

- **A failed cloud-archive fetch no longer masquerades as "NO ARCHIVES ON FILE."** The saves list's already-built "ARCHIVE LINK FAILED" state was unreachable because the fetch swallowed every error and returned an empty list — so a connection hiccup read as "your cloud saves are gone." The failure now reaches the failure state that was already written.
- **"SYNC COMPLETE" no longer hides failures.** Per-save upload failures were silently left out of the summary — two of four could fail and you'd still be told sync completed. It now counts the failures and never says COMPLETE when the count is nonzero.
- **A real Google sign-in failure now shows something.** Cancelling the popup stays rightly silent, but a genuine failure (network, blocked popup, provider error) — which previously showed nothing at all — now surfaces a clear notice at the point of use. (Re-verified on a real device per Protocol 29.)

**Done means:** none of the three flows can report success (or an innocent empty state) when the operation actually failed. Met. Source: `planning/2.8.5/audits/WARNING_SURFACE_INVENTORY.md`.

<a id="schematic"></a>

## 6. ✅ Legacy / schematic per-game layout — SHIPPED (2026-07-20)

**Shipped.** The drift this entry asserted was **real, and slightly larger than described** — verified
against the code before any change (Protocol 27). The flat layout is exactly one thing today: the
Module Bay's Schematic View (`renderBaySchematic()`), and it was a **hardcoded literal array of
rows**, which is why it drifted — nothing about adding a board to the bay made the flat list follow.
Four confirmed defects, all fixed: the 14 channel chips were one inert row with a hand-typed count
(already wrong by one) that told the reader to go back to the bay; SLOT 05's key/engine/handshake
and the entire SVC TRAY had **no representation at all** (and since the view choice persists, a
technician could be stuck with no route to their own API key); the bay's PRINT-RATE slider went
stale after a schematic edit because the re-sync map covered booleans only; and per-game adaptation
was **zero** — no `GAME_DEFS`/`getIdentity()`/`[data-game]` read anywhere in the renderer or its CSS.

The chips are now derived live from `#chipGrid`, the missing boards are proxy rows that drive the
real bay controls, and the framing reads `identity.schematic` per machine with a generic fallback
(FO4's design-only entry kept valid). **Suite 241** adds the guard that was actually missing — a
**parity check** asserting every interactive control in `#bayContent` is reachable from the flat
view, with intentional omissions named and justified. Prior tests only ever asserted that named
setters were _present_, which is exactly how whole boards went missing with nothing going red.

**Two further defects were found by rendering it (Protocol 42) and fixed in the same commit.** The
schematic's range input had a **4px-tall** hit box and its text input 27px — both under the Protocol
17 floor. And, more seriously: **the persisted view choice never actually restored on reload.**
`robco_bay_view` was written faithfully on every toggle and then ignored at boot — the panel-restore
branch called `renderModuleBay()`, which knows nothing about a view choice, while `initModuleBay()`
(the one place the restore lived) ran only on a genuine user toggle. So a returning user got the
hardware bay back every time. `ARCHITECTURE.md`, the MetaStore table and **Protocol UI-6's own
worked example** all claimed this worked; all three are corrected, and Suite 172.1 was amended
because its final clause had been asserting the defect. Verified by rendering both games at
360/412/desktop: no overflow, all controls ≥28px, 14 chip rows, view restored.

**Scope held:** this made the existing flat layout correct and per-game. The general "schematic mode
on every tab" formalization remains 2.9.0's, and now builds on a correct base — which was the point.

<details><summary>Original entry</summary>

**What it is.** The plain, flat, chrome-less "schematic" fallback layout — the dense engineering-diagram view — brought current and made correct and dynamic for every game. As the fancy hardware boards were built, this fallback layout drifted; this fixes it so it reflects the current feature set and adapts per game like the immersive panels do.

**Why it exists.** A flat, high-clarity, high-density alternative to the full hardware dressing already exists in one place (the Module Bay's schematic view). This formalizes it per game. The fuller "schematic mode on every tab" formalization is split off into the OS round (2.9.0); this 2.8.5 unit is about making the flat layout correct and dynamic for all games.

**Why it sits here (foundation-before-consumer — VERIFIED CORRECT).** This is the direct foundation for the 2.9.0 OS round's "schematic-mode formalization" (which makes it a first-class OS concept on every tab). Getting the flat layout correct and dynamic per game FIRST means the 2.9.0 formalization builds on a correct base instead of formalizing a drifted one. The order (this in 2.8.5, formalization in 2.9.0) is right as-is — no change.

**Done means:** each game has a working, current schematic-mode layout alongside its full machine.

**⚠ Scheduling note (2026-07-18 placement pass).** This is cosmetic/clarity UI work. The near-term data-safety item **A1 (LIVE-SAVE DURABILITY)** in the tail below should be scheduled **ahead** of it — data-safety outranks cosmetics (the precedent that let the save-integrity pass jump ahead of the Fallout 3 cosmetic queue). The two are independent, so this is a priority note, not a dependency: do A1 first, this whenever. _(Honoured: A1 shipped 2026-07-19, this on 2026-07-20.)_

</details>

<a id="a0"></a>

### A0. ✅ AI INVENTORY-OVERWRITE GUARD — stop an AI turn from silently deleting items (Finding 1) — SHIPPED

**Shipped (2026-07-18/19, `8f834e6` + `36926f0`).** The inventory array became a reconciled _proposal_ instead of a full replace, and the follow-up commit widened the same treatment to **every** AI full-replace-from-response field — the class fix, not just the one reported symptom. Guarding regression tests landed with both commits (Protocol 13/14).

**What it is.** The AI-import path does a **full replace** of `state.inventory`, not a merge: when an AI response contains an `inventory` array, `autoImportState()` (`js/services/api-import.js`, ~line 379) runs `state.inventory = inv.map(...)` — the entire durable inventory is overwritten by whatever the AI returned this turn. An empty array wipes everything. The directive itself (`js/services/api-directive.js`, ~line 120) commands the AI to "return the ENTIRE inventory array" on any inventory-touching turn, so a turn where the model misjudges — e.g. a **failed** repair and an **aborted** craft — and emits a short or empty array **deletes real items from state**. The `[DELTA] inventory: 1→0 items` line the owner saw was telling the truth: the item was genuinely removed, not miscounted.

**Verified.** Confirmed real state loss (not a display bug) by tracing the code against the owner's live screenshots on 2026-07-18. The DELTA counter reads actual `state.inventory` length before/after, so `1→0` is a real deletion. The existing registry-leak guard only covers cross-**game** mismatches; a same-game short/empty array is unguarded.

**What it depends on.** Nothing structural — it's a change to the AI-import reconciliation (`api-import.js`) plus a directive tweak. It is the direct symptom of the wider directive-authority problem (Finding 8, item N below); this fixes the bleeding, N does the systematic sweep.

**Why it jumps ahead of A1.** Both are data-safety, but A0 is **unrecoverable, unconfirmed, every-turn** loss during normal play; A1 is **recoverable, eviction-conditional** loss ("everything since the last rolling backup"). The project's own severity precedent (data-safety jumps cosmetics; unrecoverable jumps recoverable) puts A0 first. It also runs ahead of the schematic layout (item 6) for the same reason A1 does.

**Hard rule.** Protocol 24 (validate + field-map, never blind-persist) and Protocol 14 (AI-contract test in the same commit): the guarding regression test is mandatory — a sync returning a short or empty inventory array must **not** delete natively-held items. Fix shape (reconcile-not-overwrite / confirm net-removals / make inventory AI-read-only) is a plan-stage decision.

**Done means:** an AI turn can no longer silently delete items the player natively holds; net removals are either reconciled against a real narrative signal or confirm-gated; a red-then-green regression test locks it.

<a id="a1"></a>

### A1. ✅ LIVE-SAVE DURABILITY — give the live campaign container an IndexedDB shadow — SHIPPED

**Shipped (2026-07-19, `7a99731`, item P8).** The live `robco_v8` container is now mirrored fire-and-forget into the IndexedDB `'campaign'` store (key `'live'`), so an Android/iOS localStorage eviction that spares IndexedDB is recovered on the next boot. Recovery-only by design — a stale mirror can never overwrite a newer local value (Protocol 34).

**What it is.** `saveState()` writes the active campaign container (`robco_v8`) to **localStorage only** — confirmed in code (`js/core/state.js`, the debounced writer). Save slots and rolling backups already get an IndexedDB durability shadow with a rehydrate path; the LIVE container is the one copy with no cold-storage twin. Under storage pressure (Android especially, and iOS Safari's roughly two-week eviction) localStorage can be reclaimed — and nothing is shadowing the live container when it is.

**The real exposure — measured, not worst-cased.** Rolling backups DO reach IndexedDB and CAN be rehydrated, so a live-container eviction costs "everything since the **last rolling backup**," not the whole campaign. That bounds the damage. (Until the 2026-07-18 AI/Overseer audit this was called "the only item that can cost real data" — that title now belongs to **A0** above, which is unrecoverable and every-turn; A1's loss is recoverable and eviction-conditional, so it sits just behind A0.)

**What it depends on.** The existing IDB cold-store engine (`js/core/idb.js`) — the same shadow-write plumbing the slots and rolling backups already use. No missing foundation.

**Why it sits second (behind A0, ahead of the schematic layout).** Data-safety outranks cosmetics: the exact precedent that let the save-integrity pass jump ahead of the Fallout 3 cosmetic queue ("a browser silently eating a campaign is worse than an item list being one row short"). It sits behind A0 only because A0's loss is unrecoverable and A1's is recoverable. It should still be scheduled **before** the 2.8.5 schematic layout (item 6), which is cosmetic and independent of it.

**Done means:** the live `robco_v8` container is durably shadowed to IndexedDB on save (additive only, Protocol 34), an eviction-then-rehydrate path is behaviorally tested (Protocol 13), and a recovered-after-eviction live container is surfaced in the terminal's own voice, never silently swallowed.

<a id="a2"></a>

### A2. ✅ Save-integrity Layer 3 — the write-side quarantine follow-up — SHIPPED

**Shipped (2026-07-18, `db15f8d`).** A quota-failed migration WRITE is now separated from genuine read-side corruption, so a healthy old save can no longer be quarantined just because the re-write ran out of room.

**What it is.** Layer 3 made the READ side fail loud (a corrupt campaign is quarantined, not deleted). This closes a residual on the WRITE side the same pass exposed: a **valid, healthy old save can still be wrongly quarantined if the migration WRITE hits a storage quota** mid-upgrade. The read path can't tell "the bytes are corrupt" from "the bytes were fine but the re-write ran out of room," so a quota-failed migration currently looks identical to corruption and the good save gets quarantined.

**What it depends on.** Layer 3 (shipped) — this is its direct residual, nothing else.

**Why it's second, not first.** It's data-safety too, but the damage is **recoverable** — a wrongly-quarantined save is sidelined under a quarantine key with EXPORT, not destroyed. So it sits just behind A1, the one item whose damage is unrecoverable. Same governing principle for both: data-safety outranks polish.

**Done means:** a quota failure during a migration write is distinguished from genuine corruption — the healthy save is preserved and retried/surfaced, never quarantined as if it were corrupt.

<a id="r1"></a>

### R1. ✅ DELETE THE TEST-COUNT BOOKKEEPING — retire Protocol 2a _(done 2026-07-20)_

**What it is.** The hardcoded assertion count (3411 today) is hand-synced across 8+ files on every test add or remove (Protocol 2a). **Both** external reviewers condemned it independently, from opposite directions — one as pointless ritual, one as a tax on every commit. The count guards **no behavior**: the runner's exit status is the only thing that actually matters. This retires Protocol 2a and the whole synchronization obligation, and strips the hand-synced count out of the docs that carry it.

**Interaction to respect (flagged in this ordering pass).** This partly **deprecates item D below** (the TEST_CATALOG generator). D's headline rationale was "stop hand-syncing the catalog's count." With the count obligation gone, D shrinks to generating the per-suite **content** only (for the ATLAS assurance view) — see D's reduced scope.

**Why it's near-term.** It removes friction from every future commit, and it's a precondition for an honest restructure (R2) — no point re-encoding a bookkeeping rule you're about to delete.

**Done means:** Protocol 2a is retired (its number retired-not-reused, per the Protocol 15 precedent), no doc carries a hand-synced test count, and the gate still fails loudly on any real test failure.

<a id="r2"></a>

### R2. ✅ RULES RESTRUCTURE — path-scoped memory + a retirement rule _(done 2026-07-20)_

**Shipped.** `CLAUDE.md` is now a short universal contract plus a **retrieval map**; every
surface-scoped protocol moved into ten `rules/*.md` subsystem notes, each rule in exactly one
place, nothing deleted. Suite 220 moved with the content (it scans the notes, reads the
load-order block from `rules/file-layout.md`, and resolves protocol references across the whole
rulebook) and gained two structural guards: **220.13** (no protocol number defined in two files)
and **220.14** (the retrieval map reaches every note and names none that is missing). The
retirement rule shipped ahead of schedule as **Protocol 49** in the R1 commit. The proposed
cuts are written down, not applied — see the R3 candidate list in
`planning/2.8.5/plans/R2_RESTRUCTURE_SUMMARY.md`.

<details><summary>Original entry</summary>

**What it is.** Replace "every session reads the whole rulebook" with a short **universal contract** every session loads, plus **subsystem-scoped notes** pulled in only when the relevant surface is touched — save/state, service worker/deploy, auth/cloud, UI/mobile, game data, audio. The reviewers' rationale, sharpened: _written is not retrieved._ A rule buried in a large document loses to the rules sitting next to where a session is actually working.

**The RETIREMENT RULE (new governance — load-bearing).** Bundled in: a defined way for a guard or protocol to be **removed** when the risk it covered is gone. The project has an escape-ratchet (Protocol 36b) that only ever ADDS guards; it has never had a counterpart that removes them, so weight only accretes. The retirement rule is that counterpart. It already has both examples on file — a remove-case: Protocol 15 (runner parity) was retired once its risk vanished; and a keep-case: the architecture-conformance baseline must NOT be retired until native ES modules make the layering structurally enforced (see the 3.0 ES-modules item — that's the retirement rule working in the _keep_ direction).

**What it depends on.** R1 first (don't restructure around a rule you're deleting).

**Done means:** a short universal contract plus surface-scoped notes exist and are retrieved by surface-touched, and a retirement rule is written with at least one keep-example and one remove-example.

</details>

<a id="r3"></a>

### R3. ✅ FIRST STAGED TRIM — the incremental cut, built on the restructure _(done 2026-07-20)_

**Shipped, as one reversible commit.** The owner reviewed the R2 candidate list and approved a
modified version of it. **Retired outright:** Protocol 18 (Memory Maintenance — duplicated the
agent harness's own memory instructions) and the "Pending protocol amendments" ledger inside
Protocol 38 (roadmap state, not a rule — **relocated** to the 2.8.0 section of this file, not
deleted). **Compressed:** Protocol 8's "Why" paragraph to one sentence (keeping the point about
why Fable is named explicitly) and Protocol 9's mobile-formatting paragraph, merged into the
paragraph above it. **Converted, not deleted:** Protocols 5 and 6 — their step-by-step checklists
had gone actively wrong (both still named `ui-render.js`, split into nine files at U-A4) and are
now pointers to `library/CODE_MAP.md`, which is derived from source. **Deliberately kept, with
the decision recorded in place so it is not re-litigated:** Protocol 12 (No Concurrent Pushes),
Protocol 37 (repomix config), and Protocol 45's reasoning paragraphs. No gate check, hook, or
test enforced any retired item — they were prose only — so nothing was removed from the gate.

<details><summary>Original entry</summary>

**What it is.** Explicitly **NOT** a single large amputation. Take the cuts both reviews justify, let the restructure (R2) shrink the document naturally, then reassess. Each step reversible.

**Why staged.** A one-shot cut of a load-bearing rulebook is how a real guard gets dropped by accident. Incremental and reversible means every removal is a decision, not a casualty.

**Done means:** one reversible reduction has landed on top of the restructure, and the next cut is left to a fresh reassessment rather than pre-committed here.

</details>

**Noted at R3 for a follow-up pass — ✅ BOTH CLOSED 2026-07-20.** Neither was a new trim
decision; both were _consequences_ of decisions already landed (R2's rulebook split, R1's
Protocol 2a retirement), so they ran immediately rather than waiting on the stage-2 evidence gate.

- ✅ **`RULES.md` — DELETED.** It had become a 32-line pointer file whose entire content was "read `CLAUDE.md`", duplicating the R2 explanation a third time (after `CLAUDE.md`'s own preamble and `library/CODE_MAP.md`'s). It was a real Protocol 49 job, not a delete: every assertion naming it was retargeted at the invariant it actually protected — Protocol 38 and Protocol 40 now read the rulebook (`CLAUDE.md` + `rules/*.md`) instead of the pointer; the repomix private-file exclusion now asserts `CLAUDE.md` + `rules/**`. Suite 28 gained a stays-deleted guard, the same inversion used when the PowerShell runner mirror was removed. No test was deleted merely for being in the way.
- ✅ **The per-suite `// N tests` comments — STRIPPED.** The 2a retirement removed the obligation to keep them accurate but left the numbers in place, so they still read as fact — the tax cured, the lie kept. All 152 standalone comments plus every inline `(N tests)` / trailing `N tests.` fragment are gone from `tests/robco-diagnostics.js`, and the same sweep cleaned `library/TEST_CATALOG.md`, `library/CODE_MAP.md`, and `library/BRAIN_DUMP.md`. Suite 28 guards the convention against returning. `tests/test.html`'s `Suites: N` marker (a self-consistency check, Protocol 40) and the frozen `Tests: N/N` headers on **released** CHANGELOG blocks (history, not obligation) were deliberately kept.

<a id="r4"></a>

### R4. ✅ THE RE-PIN PASS — stamp the local-only artifacts to one commit (SHIPPED 2026-07-20)

**What it is.** Brain dump, code map, test catalog, `QUEUE.md`, `library/MANIFEST.txt` and the archive all stamped to ONE commit. The previous pin (`bf8f188`) predated the whole governance round, so it was pinning a version of reality that no longer existed.

**What it actually found — the verification was not a formality.** Every artifact was checked against current source before being stamped, and each one was wrong in ways that would have misled a session:

- **The code map** pointed at a function that no longer exists (`renderCloudSavePicker()`, superseded by `renderSavesList()`) — the same phantom-symbol class as the old `pushToCloud` ghost it brags about having fixed. Its line-number anchors had drifted by **up to 685 lines**, so they were **removed outright** rather than re-synced: the symbol name was always the real pointer. Two hardcoded counts were wrong, and the event-emitter list was missing four real emitter files.
- **The brain dump** still described the OLD monolithic rulebook, pointed the load-order guard at the wrong file, cited a retired protocol (18) as live, quoted a protocol-reference rule under the wrong number, carried a stale cache rev, and — most importantly — **had not recorded the reconciled-proposal fix**, the change that stopped the AI wholesale-overwriting inventory/status/squad/perks. That one destroyed real player data; a reconstruction doc that omits it is dangerous, not merely stale.
- **The test catalog** contradicted itself: it declared it carried no counts while carrying them, and still claimed `CLAUDE.md` publishes a current test total. Its scope was rewritten to what actually survives Protocol 2a's retirement — the un-derivable per-suite WHY — with its partial coverage stated honestly.
- **A gate hole was found and closed**: Suite 220.8 scanned `library/` non-recursively, so once `library/` gained a subdirectory every file inside it would have escaped the manifest guard **while the suite still reported PASS**. Fixed, with a static guard (220.8b) pinning the recursion.

**The stamp's whole point** is that each artifact names the commit it describes, so a later reader compares that against `HEAD` instead of guessing. No derivable fact was written into any of them — a stamp on a wrong document lends false authority, which is the failure this round hit repeatedly.

**Also folded in:** `PROMPT_LIBRARY/` moved from `planning/_standing/` to `library/`, where it belongs (standing tools, not frozen snapshots) — with the backup consequence recorded in `rules/docs-and-library.md`: `planning/` is additive-only in the archive, `library/` is a plain mirror, so deletions now propagate to the archive working tree (still recoverable from its git history, but a weaker guarantee). The post-museum `planning/` cleanup was deliberately left alone — it fires only once the museum exists.

**Why it sits AFTER the restructure (owner constraint, honored).** Pinning before the rules rewrite would pin documents we're about to rewrite — the brain dump and code map describe the very protocols R1–R3 change. So the re-pin lands **immediately after the restructure**, the most literal reading of the owner's "after the rules restructure." The cheap Group-3 fixes and the deliverables' own generators (D, I) may nudge the baseline again afterward — that's exactly what the Atlas's "marked degraded when the repo moves" rule handles, and the portable brief (H) is generated fresh each time regardless. So this is the clean baseline the round settles on, not a promise nothing moves after it.

**Done means:** all five artifacts carry the same commit stamp, and the downstream deliverables read from that single baseline.

<a id="r8"></a>

### R8. ✅ QUEUE-DRIFT RECONCILIATION — an automatic backstop so a plan can't live only in memory (SHIPPED 2026-07-20)

**What it is.** Prompted by the owner catching this exact failure mid-session: R5-R7 above, the museum's rename-permanence design (P1, below), and (per the museum audit note at the top of this file) the museum's own publication plan had all been reached in conversation and only reached `QUEUE.md` late — one of them only because the owner asked. **Protocol 50** (`CLAUDE.md`) is now the standing rule plus its automated backstop, both shipped this session rather than merely queued.

**Shipped:**

- **(a) The standing rule.** Any decision or plan reached in conversation is written into `QUEUE.md` in the same session, not batched. Stated honestly in the protocol text: this half is still prose an agent must remember — exactly the weak form R5's own "convert prose into enforcement" principle argues against. It is necessary but not sufficient on its own, which is why (b) exists.
- **(b) `scripts/queue-drift-check.js`.** A fail-safe pre-push nudge, same shape as Protocol 48's backup nudge (`scripts/backup-nudge.js`, `|| true`, never blocking): lists every `type: project` orchestrator memory that doesn't look referenced in `QUEUE.md`, using a word-overlap heuristic. The threshold was tuned against a measured failure: a single generic-word match (coincidentally the word "project" itself, drawn from a memory's own slug) cleared an unrelated fabricated memory as "referenced" purely by chance in a document this size — so the bar is now 3 distinctive-word hits (or all of a memory's tokens, when it has fewer than 3). Never fails or blocks a push; stays silent on a machine with no discoverable memory store. An explicit `queue_status: not-applicable` frontmatter field lets a memory opt out on the record, instead of just quietly never being flagged. Guarded by **Suite 242**, including a red-then-green proof that the matcher actually catches a fabricated unreferenced memory — not merely that the script never crashes (the same false-confidence trap Protocol 42 exists to rule out).

**Why a nudge, not a gate.** The memory store lives outside both this repo and the private archive (`AppData\Roaming\Claude\...`) and is not guaranteed to exist on every machine that pushes here — the exact constraint Protocol 48 already solved for the backup sync, reused rather than re-solved (same `ROBCO_MEMORY_BASE` override, same discovery shape).

**Why it doesn't hand-maintain a count.** Every run re-reads the live memory files and the live `QUEUE.md` text fresh — nothing here is the class of hand-synced number Protocol 2a was retired for.

**Done means:** met. `scripts/queue-drift-check.js` exists, is wired into `scripts/pre-push` (installed via `npm run prepare`), and Suite 242 proves both its fail-safe behavior and that it actually catches what it exists to catch.

**Honest follow-up (2026-07-21) — the gap R8 CANNOT close, now named in the protocol itself.** R8's nudge compares **memory ↔ queue**. The DeepSeek roster decision (item G) proved within hours of Protocol 50 shipping that a decision reached _purely in conversation_, never written as a memory, is invisible to it — and, worse, the highest-risk case is a purely conversational planning session that never touches the repo at all, so it never reaches the pre-push hook where any nudge fires. **A script cannot read a conversation, and the sessions most likely to drop a decision never push.** The verdict, recorded rather than papered over: the conversation ↔ queue gap is **behavioural with no honest automated backstop**, and building a conversation-scraping script would be the "guard that pretends" Protocol 49 warns against. Protocol 50 now carries a subsection **(c)** stating this plainly and naming the real fix — a **session-end ritual** (reconcile every decision into `QUEUE.md` that session; write durable ones as `type: project` memory too, because _that_ is what hands R8's nudge something to catch next time). No new script; the one mechanisable lever (route durable decisions through memory) already exists.

<a id="r9"></a>

### R9. ✅ THE SKILL, MADE A POINTER — the fourth context source stops being a second source of truth (SHIPPED 2026-07-21)

**What it is.** A session is oriented by four context sources: (1) `CLAUDE.md` + the `rules/*.md` notes, (2) this file, (3) the orchestrator's memory store, and (4) an installed **skill** (`robco-uos`) that loads even before the repo is opened. The first three all grew drift protection this month; the fourth had **none** and no tracked source, so it rotted: **two sessions independently found the installed skill pointing at a dead repo path (`C:\Dev\!GEM\Website version`), citing the deleted PowerShell runner and "both runners" parity, referencing retired Protocol 2a as live, and naming the deleted `RULES.md`.**

**The corrected framing (owner's tightening, GPT-5.6 Sol's discipline) — and a real self-correction.** An earlier pass this session shipped the skill as a hand-written **copy** of the rules plus a bespoke guard (`Suite 243`) and a standing pre-push nudge (`scripts/skill-drift-check.js`) to police its drift. That was **backwards.** The governing principle: **the skill must not become another independent source of project truth that can silently diverge.** A copy that needs a fact-checker is the divergence; the fix is to **not copy.** So the skill was rewritten as a **pointer** — it says where truth lives (read `CLAUDE.md`, follow its retrieval map to the right `rules/*.md` note), gives the handful of things that bite before the repo is open **as pointers to the real protocol**, and deliberately restates nothing. A pointer has almost nothing that can drift.

**What that made unnecessary — removed, not kept "because harmless":**

- **`Suite 243` — DELETED.** Held against the owner's bar (a guard must earn its existence through a real failure at a defined enforcement point, demonstrated red on a genuine instance, not duplicated elsewhere), it failed: the failure it checked (drift in the _committed_ source) had never occurred — the real drift was in the _installed cache_, which it structurally cannot see; its red-then-green was only against a _synthetic_ skill; and it substantially **duplicated Suite 220.2/220.9**, whose machinery it had borrowed. Removed with its enforcement (Protocol 49). Replaced by **one line**: `skill/SKILL.md` folded into the existing Suite 220 scan, so the same doc-integrity checks that guard `CLAUDE.md` now also validate any path or `Protocol N` the pointer names — the exact `RULES.md`-style dead reference that _did_ occur, caught by machinery that already exists, at zero new cost (Protocol 22).
- **`scripts/skill-drift-check.js` — DELETED.** With the skill a pointer, the divergence it guarded is largely removed by the fix itself, so a standing pre-push nudge against that divergence isn't earned. The one genuine, one-time need it served — telling the owner "your installed copy is stale, re-install it" — is served by saying so directly (below), not by a permanent mechanism.

**Net mechanisms added by this whole piece: zero new scripts, zero new suites** — one file folded into an existing check. That is the disciplined shape the tightening asked for.

**Done means:** met. `skill/SKILL.md` is a committed pointer (not a copy), covered by the existing Suite 220, and the workflow-review prompt §5 names the skill as the fourth context source. **One manual step remains for the owner: re-install the corrected skill via Settings › Capabilities** — the installed cache is still the old stale copy, and nothing but a re-install can refresh it.

<a id="e"></a>

### E. ✅ The dead RECIPES.CSV tables — BOTH game databases — SHIPPED (2026-07-19)

**Zero consumers re-verified from code before deleting anything (Protocol 27), not taken on the doc's word.** Neither `db_nv.js` nor `db_fo3.js` names `[RECIPES.CSV]` in any parser: `_buildItemCache()` and `getTradeCatalog()` iterate explicit section lists that never included it, and no `lookup*()`/`get*()` accessor referenced it. Crafting reads `reg_nv.js`/`reg_fo3.js` `recipes[]`/`breakdowns[]`, as documented.

**The one real consumer was the AI, and that made deleting it better rather than riskier.** `databaseCSVs` is injected wholesale into the Gemini `systemInstruction` (`api.js`), so the table was costing tokens on every call (bring-your-own-key — the owner pays) to hand the model a _second, competing_ recipe list for a system the natives now own. That is precisely the Finding-8 directive-authority problem, so removing it is aligned with the AI/Overseer pass, not a regression. Deleting the FO3 table also cleared the fabricated "Abraxo Cleaner Bomb" row whose Output was a non-existent "Tin Grenade" (`AUDIT_fo3_weapons` §2).

**Done:** both tables removed; the reserved-column ledgers in both files and in `ARCHITECTURE.md` updated to record the removal and why; Suites **9.10 / 19.10** invert the old "must contain" assertion into a must-NOT-exist guard, so re-adding either table fails the build (Protocol 36b escape-ratchet, the same shape used when the PowerShell runner was deleted).

**What it is.** A dead `RECIPES.CSV` table sits in **both** game databases — `js/data/db_nv.js` and `js/data/db_fo3.js` — each already tagged `PARKED-FOR-REMOVAL` in its own reserved-column ledger, with **zero code consumers**: crafting reads the registries (`reg_nv.js` / `reg_fo3.js`, the `recipes[]` / `breakdowns[]` arrays), never these CSV tables. It's the Protocol 22 duplicate-source flag, pure hygiene, nothing the user sees. (Verification 2026-07-18 widened this from the original "FO3 RECIPES reference" — the dead table is in New Vegas's database too.)

**What it depends on.** Nothing. It can ride any commit.

**Done means:** both `RECIPES.CSV` tables are removed, the reserved-column ledgers updated to match, and nothing else changes.

<a id="m"></a>

### M. ✅ The map renderer's boxed-grid residue — CLOSED, nothing left to remove (verified 2026-07-19)

**Verdict: already fully done by an earlier pass; no change made, deliberately.** Re-audited from the code rather than the queue entry. `_MAP_ABBREV`/`_mapAbbrev` is gone and guarded (Suite 189.1), as recorded. The remaining question was the boxed-grid CSS — and every class the entry suspected (`.map-cell`, `.map-detail-row`, `.map-mark-visited`, `.map-legend`, `.map-toggle-btn`, `.map-you-marker`) **is already deleted**; none of them exists in any stylesheet.

Exactly four `.map-*` classes survive repo-wide, and **all four have live consumers** — `.map-back-btn` and `.map-collectible-badge` (`css/25-toolbar.css`, both used by `ui-render-map.js`, deliberately reused verbatim by the reskinned sector sheet per Protocol 22) and `.map-caption` / `.map-svg-wrap` (`css/45-databank.css`, the current SVG node-map). Nothing is orphaned, so nothing was removed.

**The "purely historical comments" were left in place on purpose.** The `25-toolbar.css` block comment is what records _which_ two classes survived the boxed-grid retirement and _why_ (the Protocol 22 reuse decision) — deleting it would strip the only explanation for why two lone `.map-*` rules sit in a toolbar sheet, and invite a future session to "clean up" two live classes. That is load-bearing WHY, not residue. Same for the Suite 189.1 comment.

**What it is.** A reviewer flagged "orphaned `_MAP_ABBREV` / boxed-grid references in the map renderer." Verification (2026-07-18) found the headline symbol is **already deleted and guarded**: `_MAP_ABBREV` / `_mapAbbrev` no longer exists in `js/ui/ui-render-map.js` (nodes plot at real `gridRow` / `gridCol`), and Suite 189.1 fails the build if it ever returns. What actually remains is a little boxed-grid CSS (`.map-cell` and siblings in `css/25-toolbar.css`) — **some of it deliberately reused** by the current SVG map, plus a couple of purely historical comments. So the real job is far thinner than stated.

**What it depends on.** Nothing. It's a cheap cleanup that folds into any commit.

**Done means:** the truly-dead boxed-grid CSS classes (the ones with no remaining consumer) and the stale comments are removed; the classes the SVG map still reuses are left alone; `_MAP_ABBREV` needs no action (already gone).

<a id="k"></a>

### K. ✅ The backup script's single-shell dependency — SHIPPED (2026-07-19)

**The shell dependency itself was already closed by the concurrent session, and that is now VERIFIED rather than assumed.** `Get-LocalModeBases` probes both the `AppData\Roaming\Claude` junction _and_ the real physical path globbed from `AppData\Local\Packages\Claude*\LocalCache\Roaming\Claude\…` (no hash hardcoded). Measured from both shells: the sandboxed PowerShell tool sees the Roaming junction as **absent** but the packaged path as **present**, so discovery succeeds either way. A full `-NoPush` run now captures all 5 stores / 92 files identically from both shells.

**But verifying it surfaced the real remaining danger, which is what this unit actually fixed.** `memory/` is MIRRORED — the sync wipes it and re-mirrors only what _this_ run discovered. "No store found anywhere" already failed loudly; a **partial** capture did not, and could not, because the cli-project store lives outside `AppData` and is visible to _every_ shell. So a blind shell would find _something_, skip the loud-failure path, wipe the local-agent-mode store out of the archive, and report "sync complete" — a backup quietly protecting less than it did yesterday, which is exactly the Protocol 48 failure mode.

**Fix — a shrink guard.** Each run records the store labels it captured to `memory/_CAPTURED_STORES.txt` (machine-readable, kept separate from the human `_CAPTURE_MANIFEST.txt` so it never parses report text). The next run compares against it **before clearing anything**, and on any missing store exits non-zero having touched nothing — naming the missing store(s), listing what it did find, and naming the correct shell and exact command. `-AllowStoreLoss` accepts a deliberate removal and re-baselines. A missing baseline file is not a failure.

**Proven, not assumed:** simulating a blind shell (`-MemoryBase` pointed at a non-existent path) trips the guard, exits 1, and leaves all five store folders intact in the archive.

**One real bug found while verifying, fixed in the same pass (Protocol 42).** From the Bash-launched shell the local-agent-mode store was captured **twice** ("6 stores, 166 files" for 5 real stores). Physical-path de-duplication silently fails here: `Get-Item().FullName` echoes the path as given rather than resolving a reparse point in an _ancestor_ directory — and the junction is on `AppData\Roaming\Claude`, not on the leaf — so the two routes to one store produce two different strings. De-duplication now also keys on the store **label** (which carries the session GUID / project slug and is therefore already unique per real store regardless of route). Both shells now report an identical 5 stores / 92 files.

**What it is.** `sync.ps1` (Protocol 48's local-only-artifact backup) runs correctly only from a **Bash-launched** `powershell.exe` — the PowerShell-tool sandbox (user `rog-ally\kadyn`) cannot see `AppData\Roaming\Claude`, so memory discovery finds nothing and the sync fails loudly there. That "works from one shell, not the other" quirk is a single point of failure for the only off-machine backup of `library/`, `planning/`, and the agent memory.

**What it depends on.** Nothing structural. **Note:** a concurrent session is actively fixing this script — this slot exists so the item isn't lost if that fix doesn't fully close the shell dependency.

**Done means:** the backup sync succeeds from any shell the harness can invoke (or fails safe with a clear reported reason), with no reliance on a single shell being able to see the memory store.

<a id="o"></a>

### O. ✅ Test-artifacts folder self-cleaning — make "files present" a true failure signal — SHIPPED

**Shipped.** `scripts/gate.js` now clears `test-artifacts/` at the start of every real gate run (after the `--iter` early-exit, so it covers both the fast commit gate and the full push gate), fail-safe so a cleanup error can never abort the gate. Guarded by Suite 235.15. "Files present ⇒ the last run failed" is now a true signal.

**What it is.** `test-artifacts/` accumulates failure screenshots and console logs and is **never cleared**, so stale files from days ago are indistinguishable from a real recent failure. Right now it holds leftover `cap-verify-01.*` files from verifying the capture mechanism. Fix: clear the folder at the **start** of every gate run, so its contents always describe the most recent run and "files present ⇒ the last run failed" becomes a true signal. Today that signal means nothing.

**What it depends on.** Nothing. It's a small change to the gate's setup step — a genuine ride-along, queued as such (not its own unit), per the owner's placement.

**Done means:** the gate empties `test-artifacts/` before it runs, the leftover `cap-verify-01.*` files are gone, and a non-empty folder after a run reliably means that run captured a failure.

<a id="n"></a>

### N. ✅ The AI / Overseer pass — Findings 2–8 — SHIPPED (both batches)

**Shipped in two batches.** Batch 1 (`3b3331d`) covered the user-visible pass — per-game persona, in-place retry echo, correct failure severity on a transient blip, thinned ambient chatter, and the modal-button restyle (Findings 2/3/4/7). Batch 2 (`01c23b4`) covered in-place change cards instead of a tab-jump, the truthful log export, and the directive-authority sweep (Findings 5/6/8 + the Finding-4 leftover). Findings 2–8 are closed; Finding 1 shipped separately as **A0** above.

**What it is.** The remaining seven findings from the 2026-07-18 AI/Overseer audit (`planning/2.8.5/audits/AI_OVERSEER_AUDIT.md`) — everything except Finding 1, which was carved out as **A0** above because it jumps the queue. This is a real multi-part unit (larger than the cheap one-liners around it in Group 3), grouped here because **none of it gates the release and none of it unblocks anything downstream** — it's the AI experience catching up to the fact that the terminal, not the AI, is now the primary surface. Verified against the owner's live screenshots and the current code; suggested internal ordering:

- **Findings 6 + 7 together — the post-sync surface.** **6 (owner directive):** when the AI changes stats/inventory the app currently **switches tabs** off the terminal (the post-sync `expandPanelForCategory` loop, `api-import.js` ~line 828, routes through `switchTab`). Instead, **stay on the terminal** and surface each change as an **in-place popup card**, like the existing location card. A primitive already exists (the `[DELTA]` line already computes the changes; the `#locationCard` toast is the reuse target) — so this is an **upgrade** of an existing mechanism, not a new one (Protocol 22), and it makes changes visible the moment they happen. **7:** thin the ambient chatter — `PIP-BOY DATA SYNCED WITH ROBCO MAINFRAME` fires every turn (`api-import.js` ~line 823), the status blips rotate constantly, and `[DELTA] ticks: N→N+1` prints every turn because ticks increments every prompt. Make the confirmation occasional, throttle the blips, and stop the DELTA line firing on a lone `ticks` change. Respect the Immersion dial.
- **Findings 2 + 3 together — the transient-failure path (`api.js`).** **2 (owner-approved design):** on retry, print the user's line **once and mutate it in place**, with a **single** status line counting `1/3 → 2/3 → 3/3`; keep the accumulating `>` prefix but make it deliberate (reads as another relay hop). Today the message reprints once per attempt with a separate RETRANSMITTING line each time (`api.js` ~line 526–543 + ~236). **3:** a transient network blip currently renders as `⚠ FATAL EXCEPTION … MODULE: COMM_LINK` — the same catastrophic framing as a missing key or parse failure (`api.js` ~line 552). Match severity: a recoverable, self-healing failure gets a lower-severity, still-usable-offline line; reserve FATAL EXCEPTION for genuinely fatal faults.
- **Finding 4 — persona game-agnostic.** The directive hardcodes "Courier" (`api-directive.js` ~line 66 + throughout), so a Fallout 3 game calls the player the wrong character (the ambient layer already gets this right from per-game data). Source the player noun from `GAME_DEFS[ctx].identity` — Protocol 38 in spirit, reaching a place the rule doesn't currently cover.
- **Finding 5 — truthful log export.** The holotape/log export (`ui-saves.js` `_buildHolotapeText`) is built from `chatHistory` only, so AI **modal/confirmation** nodes (rendered to a separate modal, never appended to history) are dropped. Today that produced a **false conclusion** — a log that looked like the AI silently obeyed "level me up to 15" had actually edited out the confirmation popup. If an export exists it must represent what was on screen: capture modal/confirmation events and state deltas into it.
- **Finding 8 — the directive-authority sweep (runs LAST in this unit).** Audit `getSystemDirective()` for every place it still claims authority over a now-native system (calculators, router, trackers, level-up, map, loot import). Two costs when it does: **tokens burned every call** explaining jobs it no longer owns (bring-your-own-key — the owner pays), and the **risk of the AI returning state natives own** — which is exactly the A0 item-loss path. For each native-now system decide: stop instructing it, tell it read-only, or keep a narrow role with explicit reconciliation. This is the directive-side follow-up to the parked "AI → native + oversight audit" (Closed board). It runs last so it's calibrated against the A0 and Finding-4 fixes rather than guessing.

**What it depends on.** Nothing structural. A0 (the Finding-1 fix) is its urgent sibling and should land first; Finding 8 wants A0 and Finding 4 done before it sweeps.

**Hard rules.** Every fix carries a regression test (Protocol 13); anything touching the AI contract/import (Findings 4, 8) carries an AI-contract test in the same commit (Protocol 14). Finding 6 must reuse the existing card/toast (Protocol 22), not build a parallel one.

**Done means:** the terminal stays put and shows in-place cards on AI changes, ambient chatter is thinned, transient failures read as recoverable, the persona is per-game, the log export is faithful, and the directive no longer claims native-owned systems.

<a id="f"></a>

### F. ✅ First: the four process refreshes (the workflow review's foundation) — DONE (2026-07-20)

**What it is.** The blind workflow review (G, next) reviews the Dispatch multi-model workflow itself — and a review is only as good as the inputs it reviews. Four things had to be refreshed to current truth FIRST, or the review would critique a stale process:

1. **The session-launch discipline** — the spec-lock / consolidate-before-starting rule (Protocols 8 + 28). **Already current** in the prompt.
2. **The plain-English reporting standard** — the phone-formatted "it's live, here's how to test it" reporting rule (Protocol 9). **Already current** in the prompt.
3. **Protocol-consolidation as evidence the process PRUNES** — U6 is one proof the workflow can remove weight, not only add it. **Strengthened:** the prompt now grounds this in the whole pruning story — the retirement rule (Protocol 49), the three actual retirements (2a / 15 / 18), and the staged trim's remaining stages R5–R7 — not U6 alone.
4. **Copy-paste-block delivery** — the standard for handing ready-to-paste blocks. **Already current** (prompt header), and extended with the DeepSeek workflow-description-only cut (see G).

**How it was done.** The refreshes aren't separate documents — the review's single input IS the standing prompt (`planning/_standing/WORKFLOW_REVIEW_PROMPT.md`, gitignored). Bringing it current WAS F. The same pass also folded in the ~48h of change the prompt was missing (the museum + reproducibility sub-program as §14, Protocol 50, R5–R7) and added the two new audit sections §15/§16. Three of the four subjects were verified already-current against the live `CLAUDE.md`; the fourth was strengthened. Nothing was sent — folding in ≠ sending.

**Done means (met):** all four subjects are current in the prompt, and the prompt is ready to hand to G as its input. ✅

<a id="appcheck"></a>

## Also in this round: ✅ APP CHECK — CLOSED (both halves done, 2026-07-20)

**Both halves are now done; this entry is closed rather than carried forward.**

**Enforcement — done.** App Check has been enforced since 2026-07-01 (owner-confirmed). The long-parked MONITORING→ENFORCE reminder was stale — it had been telling sessions to perform work completed weeks earlier — and has been retired from memory. There was no flip to perform.

**The debug token — revoked.** A security scan (2026-07-20) found an App Check debug token committed in the private local-archive repo (Protocol 48's `_RobCo-Archive`); a debug token bypasses App Check verification entirely, so it is a real credential, not a config value. **The owner deleted all three debug tokens in the Firebase console on 2026-07-20** — that deletion IS the revocation, so the strings are now dead. No replacement was registered, deliberately: one gets created on demand the next time local debug work needs it. The dead string was removed from the archive in the same pass (it was harmless but read like a live credential).

**★ The Museum-publication blocker is CLEARED.** Item P no longer waits on anything from this entry.

**One note carried forward for next time.** A future debug token should be **named for its machine and purpose** (e.g. `rog-ally-local-dev`). The three deleted ones had unhelpful names — one was literally "roco local" — and the console masks the values, so there was no way to tell which registration held the leaked string. That is why all three had to go rather than just the one.

**The app repo was never the exposure.** `js/services/cloud.js` sets `FIREBASE_APPCHECK_DEBUG_TOKEN = true` on localhost only, so the SDK mints a throwaway token per session and nothing is hardcoded there.

---

# Appendix — the original running "Last updated" header, verbatim

_Preserved exactly as it last stood on line 8 of `QUEUE.md` before the split, so no word of the running history is lost._

> _Last rewritten in full: 2026-07-15. Last updated: **2026-07-21** — **the fourth context source became a pointer, Protocol 50's blind spot got named, and the museum got an AI-facing design.** Three related pieces, all under the theme that this project has four sources of truth about itself — the rules, this queue, the memory store, and the `robco-uos` skill — of which the skill was the only one with no drift protection, no tracked source, and a stale live copy. (1) **R9 (below)** ships the fix — and it was itself course-corrected mid-session by the owner's tightening (GPT-5.6 Sol's discipline: a guard must earn its existence through a real, occurred failure at a defined enforcement point, or it should not ship). The first pass over-built: it made the skill a hand-written \_copy_ of the rules and added a bespoke `Suite 243` + a standing nudge to police the copy's drift. The corrected answer is that the skill should be a **pointer, not a copy** — so it can't become a second source of truth — after which both guards were **removed** as unearned (Suite 243 duplicated Suite 220 and only ever red-green'd a synthetic case; the installed-copy nudge guarded a divergence the pointer fix already removes). The one real residual (a pointer naming a deleted file/protocol) is caught for free by folding the skill into the _existing_ Suite 220. **Net new mechanisms: zero.** The owner still has one manual step: re-install the corrected skill via Settings › Capabilities (only a re-install can refresh the read-only installed copy). (2) **Protocol 50 gained subsection (c)** stating that rule 50(a) already covers the conversation ↔ queue case in prose and its enforcement half simply cannot exist (a script can't read a conversation; the riskiest sessions never push) — so no guard is coming for it, on purpose. (3) **P3 (under the museum)** is a design-only queued spec for making the museum an AI-facing resource like the library, guarded by provenance (status derived from a supersession link graph, fail-closed on unknowns, no rejected entry without its why). **Protocol 50 was itself violated hours after shipping** (the DeepSeek roster decision, item G) — recorded plainly, because it's the concrete proof (2) exists for. Prior update: **2026-07-20** — **item F executed — the blind workflow review's four process refreshes.** The standing review prompt (`planning/_standing/WORKFLOW_REVIEW_PROMPT.md`, gitignored, kept current incrementally — folding in ≠ sending) was brought fully current (the museum + its reproducibility sub-program, Protocol 50 + the queue-drift nudge, the trim's remaining stages R5–R7) and gained two audit sections it never had: **§15 — auditing the orchestrator (Dispatch) itself**, and **§16 — the multi-model hand-off and its cost.** Of F's four named subjects, three were already current in the prompt (session-launch discipline / Protocols 8+28, the Protocol 9 reporting standard, copy-paste-block delivery); the fourth (protocol-consolidation as proof the process PRUNES) was strengthened from "U6 only" to the retirement rule + three retirements + R5–R7. Two decisions that had lived only in conversation are now on file per Protocol 50 (see item G): **DeepSeek joins this ONE review as a free, hosted-only THIRD WITNESS — never a gate, never repo-aware — and a committed claim-ledger file** becomes the synthesis artifact. The conversation→queue gap that let those decisions go unrecorded for hours (Protocol 50 shipped the same day) is noted honestly under G: the drift nudge catches memory↔queue drift, not conversation↔queue drift. Prior update: **2026-07-20** — **the governance trim's remaining stages, a museum design gap, and a standing drift problem all got fixed in one pass, triggered by the owner asking why work kept reaching this file late.** Three things landed: (1) **R5-R7**, the staged governance trim's stages 2-4 (convert-prose-to-enforcement, the contentious ratchet-narrowing that needs the owner's call, and the expensive-machinery cuts) — these existed only in Dispatch's memory before now, with one line in R3's own follow-up notes as the only trace in this file; all three are now real tracked items with their reasoning and keep-cases intact. (2) The museum's **rename-permanence gap** (under **P1**) — the in-flight hash-to-path work correctly declined to handle future document renames on its own; this session designed the fix (an extended redirect ledger + a build-time git-diff check, NOT automatic rename detection, which this same repo's own mining pass just proved unreliable at a 22% undercount) and queued it as a soft prerequisite of publication (**P2**), plus a small outstanding `file://` click-test alongside it. (3) **Protocol 50 + R8**, shipped rather than merely queued: a standing rule that plans get written here in the same session they're decided, backed by an automated pre-push nudge (`scripts/queue-drift-check.js`, Suite 242) that lists every `type: project` orchestrator memory not yet referenced in this file — the mechanism that makes (1) and (2) not recur. Prior update: **2026-07-20** — **a museum accuracy audit closed the gap between this file and reality.** Item **P (THE MUSEUM)** was still marked ⬜ and read as a future proposal, but the museum has actually shipped: the generator (`museum/generate.mjs` in the archive) runs and produces `museum/site/`, four hand-written release accounts (2.5.0 / 2.6.0 / 2.8.0 / 2.8.5-draft) are approved and frozen, and both a correctness pass and a release-cadence generation pass ran. P is rewritten to say so. Three things that had no home in this file are now recorded under it: a **museum-reproducibility sub-program** (three archive sessions fixed a CRLF/LF page-renaming bug and a gitignored README leak; a fourth is **in flight right now**, resuming after hitting the same session limit — it replaces content-hash doc addresses with path-based ones and is mining a redirect ledger from this repo's own git history first, because 62 of the 306 hash-named pages that have ever existed are gone from the current site and recoverable only by walking history, a window that closes once path-based naming lands); the **museum publication plan** the owner locked this session (public after the 2.8.5 release and before 2.9.0, a clean new repo — `Robco-Exhibit` — on **Cloudflare Pages** rather than GitHub Pages specifically because a GitHub project site would share browser origin and localStorage with the live app, name substitution with a fail-closed guard, and a publication diff verified before anything goes live); and a new **reproducibility CI** item (**J**, owner: "go with recs") that turns three sessions' hand-proof into a standing gate. One more new item, unrelated to the museum: **L**, a generated, phone-readable HTML view of this very file, decided this session under a ONE-SOURCE-TWO-VIEWS ruling. Prior update: **2026-07-20** — **Group 1 (data safety) re-opened with A3**, a save→sync→load cloud round-trip test against the free local Firebase emulator, asserting field-level fidelity so a field added to state but missed in the sync mapping fails the gate. The gap was established from code, not assumed: `boot-smoke.mjs` allowlists away every Firebase network error, and Suite 46.17 — the closest existing check — asserts a hand-typed field list, so a new field goes green while never syncing. The entry states its costs honestly (a dev-only `firebase-tools` dependency; no coverage of real Firebase, App Check or network behaviour). **The App Check entry is CLOSED** — enforcement was already live and the owner deleted all three debug tokens in the console, so the **Museum-publication blocker is cleared**. Prior update: **2026-07-19** — a Group-3 batch pass plus a truthfulness sweep of the tail. **Group 1 (data safety) is now COMPLETE** — A0, A1 and A2 had all shipped but were still showing unticked, as had **O** and both batches of **N**; all six are now marked. Of the Group-3 batch: **E** (dead RECIPES.CSV tables, both games) and **K** (the backup script) shipped; **M** was re-audited and closed as already-done with nothing orphaned left to remove; **B** landed one of its four deferred conversions and the rest is now a named list rather than a vague bucket; and **C1** was deliberately NOT done — investigation found it collides with Protocol 29 and Protocol 33, so its entry now carries the blockers instead of a false "small win" framing. Prior passes (2026-07-18) —\_ (1) marked the **entire 2.8.5 code + test health round (U1–U12) SHIPPED**, plus the UI-truthfulness fixes and the **Protocol 23 architecture-conformance enforcement** capstone; (2) a **full ordering evaluation** of the whole roadmap — the floating end-of-round deliverables, the leftovers, and the pre-3.0 items each placed in dependency order with a "why it sits here," and the one real mis-ordering (list virtualization) moved to its foundation; (3) a **placement pass for a new batch from two external AI reviews** — near-term LIVE-SAVE DURABILITY (data-safety, runs first), the rules/governance restructure (delete the test-count bookkeeping, path-scoped rules + a retirement rule, a first staged trim, the re-pin), two cheap cleanups, two consciously-unversioned items, and the native ES-modules migration bundled into 3.0; and (4) a **placement pass for the 2026-07-18 live AI test** — the AI/Overseer audit (`planning/2.8.5/audits/AI_OVERSEER_AUDIT.md`) yielded **A0** (confirmed real item-loss, jumps to the front of Group 1 ahead of live-save durability) plus the **N** unit (Findings 2–8, non-gating), the **Museum** (item P, built before the 2.8.5 release), and the **test-artifacts self-cleaning** ride-along (item O). Each new item was verified against real code before earning its slot. The tail was regrouped into four ordered groups; item D moved next to the Atlas; the three owner-dropped ideas were recorded as closed. **Re-pinned at R4 (2026-07-20)** — the brain dump, code map, test catalog, this file, `library/MANIFEST.txt` and the archive now all describe one commit; the literal hash is in each library doc’s BASELINE PIN header and in the archive’s stamp. Compare it against `git rev-parse dev` to see whether they are still current.\_

---

_This log is append-only (ARCHIVE-class). New shipped accounts are added under a stable `<a id>` anchor; `QUEUE.md` keeps the matching one-liner. See `rules/docs-and-library.md` for the maintenance model._
