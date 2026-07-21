# RobCo U.O.S. — Build Queue

**The one always-current, phone-readable view of what's next.** In execution order, top to bottom. Every
item still ahead says, in plain English: what it is, why it exists, what it touches, what "done" looks
like, why it sits where it does, and any hard rule it must never break.

**This file is now the QUEUE only.** The full accounts, post-mortems, and "why we did it this way" for
work that has **shipped or been ruled out** live in **[`QUEUE_LOG.md`](QUEUE_LOG.md)** — the companion
LOG. Split out 2026-07-21 because a queue and a log have opposite requirements: a queue must stay short
and be read constantly; a log grows forever and is read rarely, and it was burying the queue. Nothing was
lost — every shipped item keeps a one-line record here with a link to its full account there.

**⛔ Item IDs are STABLE TAGS — never renumber, never re-letter, never reuse.** The letters and numbers
(A0-A3, B-P, P1-P3, R1-R9, and the rest) were assigned as work was found, so they do **not** run
alphabetically top-to-bottom — they are content-addresses referenced from commit messages, memory files,
the workflow-review prompt, and `CHANGELOG.md`. Regrouping an item does not change its ID. This is the
Protocol 49 retirement discipline (retire in place, never renumber) applied to queue IDs. A future session
that "tidies" these breaks every external reference — do not.

Status tags: ✅ shipped · 🔄 in progress · ⏭️ next · ⚠️ blocked/contentious · ⬜ queued.

_Last updated: **2026-07-21** — **a Protocol 50 recording pass: six conversational decisions written where they
live** (built nothing; each status claim re-verified against the real files and the sibling archive first).
**(1)** Dispatch **sequenced R10's remediation** at the owner's instruction — trusted layer → under-checking
guards → route Architecture by section; none of it gates the release. **(2)** Adopted GPT-5.6 Sol's
**knowledge-graph / retrieval-topology** spec as new item **R11** (infrastructure; one derivation → topology
picture + plain diagnostics + a machine-readable answer for sessions), full spec in
`planning/2.8.5/plans/KNOWLEDGE_GRAPH_SPEC.md`. **(3)** The **museum audit plan** (Claude-first, external-second,
Gemini-not) + its external-access blocker — P design note (e). **(4)** A homeless workflow finding (concurrent
sessions failing each other's lint gate through the shared dir; the junk-sweep concurrency caveat) → the
workflow-review prompt §7. **(5)** Status: the **skill was re-installed** (R9 closed) and the **museum's
"Records Office Dark" identity landed** in the archive. **(6)** R10's two defects carry their `8d14073` ship
ref; skill finding E is ✅ fixed at `21c78f7`, finding C's overclaim still open. No `APP_VERSION`/`CACHE_NAME`
bump (no served file changed). The pass before — **the external knowledge-architecture audit (R10)** — and
earlier passes are in the running history chain in
[`QUEUE_LOG.md`](QUEUE_LOG.md#update-history--the-running-last-updated-chain)._

---

## Where we are right now (the real 5-second version)

- **2.8.0 "The Physical Machine" is SHIPPED and live on production.** The whole New Vegas hardware
  overhaul, offline native calculators, Diagnostic Shell, ambient runtime — all live.
- **2.8.5 is essentially DONE on `dev`.** The code+test-health round (U1–U12), the library/token split,
  the Fallout 3 Pip-Boy skin, the data-provenance re-sourcing, all three save-integrity layers, the
  UI-truthfulness fixes, the schematic-layout fix, and the whole governance restructure (R1-R4, R8, R9)
  have landed. Protocol 23 (layering) is now **enforced** by a static gate.
- **An external knowledge-architecture audit (GPT-5.6 Sol, 2026-07-21) has been folded in (item R10).** Two
  live defects it found are **already FIXED and guarded** — the cache-bump guard was blind to the `assets/`
  icons + best-effort-precached `CHANGELOG.md`, and `ARCHITECTURE.md` prescribed a save-destroying `setDoc`.
  Its sharpest finding is recorded but deliberately **not** fixed this pass: the R2 rules restructure
  **copied stale file-ownership facts into the new trusted layer** (`rules/state-and-save.md`) — the
  project's own recurring drift, reproduced inside the fix meant to end it. **Dispatch has now SEQUENCED
  R10's remediation** (fix the trusted layer → fix the guards that under-check → route Architecture by
  section; none of it gates the release) and **adopted a knowledge-graph / retrieval-topology spec (new item
  R11)** off the same audit.
- **What's genuinely left before the `dev → main` release:** the near-term data-safety item **A3** (cloud
  round-trip test) plus a short tail of small leftovers. The end-of-round review/synthesis deliverables
  (F done; **G**, H, D, I) and the governance process work (R5-R7) can land around the release, not
  before it.
- **Then 2.9.0** — the big one: gameplay systems, ambient world life, and the "it's a real operating
  system" round. Its hardening gate (which burns down the baselined architecture debt) sits BEFORE the OS
  services that would otherwise multiply it.
- **Then 3.0** — Fallout 4 as a real playable third game, bundled with the native ES-modules migration.
- **The Museum is BUILT, and its "Records Office Dark" visual identity has now LANDED in the archive**
  (bezel removed, vault-directory lobby, strip-chart growth, intent-vs-reality exhibit, bug room wired to
  `bugs/*/record.md`; it fixed a real self-referential bug on the way in). Its reproducibility sub-program
  (P1), an **audit plan** (Claude-first, external-second — design note e), and publication (P2, post-release)
  are the remaining museum work.

_Everything shipped is summarized below with a link to its full account in
[`QUEUE_LOG.md`](QUEUE_LOG.md); everything still ahead is expanded in full._

---

# ✅ Shipped milestones (full accounts → [`QUEUE_LOG.md`](QUEUE_LOG.md))

- **✅ 2.8.0 — "The Physical Machine"** (live on prod). The New Vegas hardware overhaul: every subsystem
  re-dressed as a bespoke instrument, the offline native terminals, the 159-tool Diagnostic Shell, the
  ambient runtime, and the foundations (event bus, two-store boundary, AI-directive + boot
  decompositions). → [full account](QUEUE_LOG.md#v280)
- **✅ Brain dump** (shipped, maintained from here on). The deep Claude-facing reconstruction of the whole
  project so every session starts accurate. → [full account](QUEUE_LOG.md#braindump)
- **✅ 2.8.5 item 1 — the code + test health spine.** Readability refactor, the library/token split, and
  the full U1–U12 health round — capped by Protocol 23 enforcement (Suite 236; debt baselined at 20
  render→save + 26 service→view + 0 registry). → [full account](QUEUE_LOG.md#u1)
- **✅ 2.8.5 item 2 — perf / accessibility / bundle-size** (folded into U1–U12; accessibility driven 40→0).
  → [full account](QUEUE_LOG.md#u2)
- **✅ 2.8.5 item 3 — brain-dump re-baseline** on the clean codebase. → [full account](QUEUE_LOG.md#u3doc)
- **✅ 2.8.5 item 4 — Fallout 3 Pip-Boy device skin** (COMPLETE: U0-U9 + bottom-dock occlusion fix + the
  skin-architecture extraction pass). MANIFEST density deferred to pre-3.0. →
  [full account](QUEUE_LOG.md#fo3)
- **✅ 2.8.5 item 5 — save integrity Layers 1–2** (semantic survival test + `persist()` request). →
  [full account](QUEUE_LOG.md#saveintegrity)
- **✅ Data-provenance program** — both games re-sourced to `fallout.wiki` and guarded; the FO3 karma engine
  rebuilt. → [full account](QUEUE_LOG.md#dataprovenance)
- **✅ Save integrity — Layer 3** (read-side fail-loud: quarantine-not-delete, READ FAULT / EVICTION
  banners). → [full account](QUEUE_LOG.md#saveintegrityl3)
- **✅ UI truthfulness fixes** — three flows that reported success on a failed operation, corrected. →
  [full account](QUEUE_LOG.md#uitruthfulness)
- **✅ 2.8.5 item 6 — legacy / schematic per-game layout** (SHIPPED 2026-07-20; Suite 241 parity check). →
  [full account](QUEUE_LOG.md#schematic)

---

# 2.8.5 tail — the open work (grouped by readiness)

Everything in the 2.8.5 blocks above has shipped. This block is the rest of the near-term work. The old
discovery-order groups (Group 1 data-safety → Group 4 deliverables) are retired in favour of grouping the
**open** items by what actually determines when they can run. Only the near-term data-safety item (**A3**)
plus the small fixes gate the `dev → main` release; the deliverables and the governance process work can
land around it.

_Placed 2026-07-18 from two external AI reviews (`planning/2.8.5/audits/ATLAS_ECOSYSTEM_REVIEW.md` + the
synthesis). Each item was checked against the real code before it earned its slot._

## ✅ Shipped this round (one line each → full account in [`QUEUE_LOG.md`](QUEUE_LOG.md))

_Data safety:_

- **A0** ✅ AI inventory-overwrite guard — an AI turn can no longer silently delete natively-held items
  (reconcile-not-overwrite, widened to every AI full-replace field). → [account](QUEUE_LOG.md#a0)
- **A1** ✅ Live-save durability — the live `robco_v8` container now has an IndexedDB recovery shadow. →
  [account](QUEUE_LOG.md#a1)
- **A2** ✅ Save-integrity Layer 3 write-side — a quota-failed migration write is distinguished from real
  corruption. → [account](QUEUE_LOG.md#a2)

_Governance restructure:_

- **R1** ✅ Deleted the test-count bookkeeping — retired Protocol 2a. → [account](QUEUE_LOG.md#r1)
- **R2** ✅ Rules restructure — short universal contract + path-scoped `rules/*.md` notes + the retirement
  rule (Protocol 49). → [account](QUEUE_LOG.md#r2)
- **R3** ✅ First staged trim — one reversible cut on top of the restructure (incl. `RULES.md` deleted, the
  `// N tests` comments stripped). → [account](QUEUE_LOG.md#r3)
- **R4** ✅ The re-pin pass — all five local-only artifacts stamped to one commit; found and fixed real
  drift. → [account](QUEUE_LOG.md#r4)
- **R8** ✅ Queue-drift reconciliation — Protocol 50 + `scripts/queue-drift-check.js` pre-push nudge (Suite
  242). → [account](QUEUE_LOG.md#r8)
- **R9** ✅ The skill made a POINTER, not a copy — the fourth context source stops being a second source of
  truth. **The owner has re-installed the skill (confirmed 2026-07-21), so R9's outstanding manual step is now
  closed** — and it also carries the `21c78f7` gate-claim correction (R10 finding E). → [account](QUEUE_LOG.md#r9)

_Small residual fixes:_

- **E** ✅ Dead RECIPES.CSV tables removed from both game databases. → [account](QUEUE_LOG.md#e)
- **M** ✅ Map renderer boxed-grid residue — re-audited, already clean, nothing to remove. →
  [account](QUEUE_LOG.md#m)
- **K** ✅ Backup script single-shell dependency — closed, plus a shrink-guard added while verifying. →
  [account](QUEUE_LOG.md#k)
- **O** ✅ Test-artifacts folder self-cleaning — "files present ⇒ last run failed" is now a true signal. →
  [account](QUEUE_LOG.md#o)

_Non-gating near-term unit:_

- **N** ✅ AI / Overseer pass, Findings 2–8 (both batches) — the AI experience catching up to the terminal
  being the primary surface. → [account](QUEUE_LOG.md#n)

_End-of-round deliverable foundation:_

- **F** ✅ The four process refreshes — the standing workflow-review prompt brought fully current (the input
  G reviews). → [account](QUEUE_LOG.md#f)

## ⏭️ Ready now — no blocker; plan/build whenever

### A3. ⬜ CLOUD ROUND-TRIP TEST — prove every field survives sync, against the Firebase emulator

**What it is.** A save → sync → load round-trip test that runs against the **Firebase local emulator
suite**, asserting **field-level fidelity**: every field on the save envelope must be present and equal
after the round trip. The point is not "the write returned success" — it is that a field which stops being
carried across gets caught. **A new field added to `state` without being added to the sync mapping must
FAIL this test.** That failure mode is the whole reason the item exists.

**The gap, established from the code on 2026-07-20 — not assumed.** Nothing in the gate exercises cloud
sync end to end:

- `tests/boot-smoke.mjs` (its `isExpectedNoise()` allowlist) explicitly swallows Firebase Auth, Firestore
  and remote-config network failures as _"known noise that is NOT a bug"_ — correct for a credential-less,
  network-less test box, but it means the browser tests boot the app, watch every cloud call fail, and
  discard the errors. The gate stays green.
- Suite **46.17** is the closest thing that exists, and it is genuinely good — it evaluates the **real**
  `sanitizeImportedContainer()` + `migrateState()` in a `vm` sandbox and proves the Phase-6 fields and
  faction reputation survive byte-stable. But it feeds them a **hardcoded fixture** and asserts a
  **hand-listed set of field names**. A field added to `state` tomorrow is simply not in that list, so
  46.17 goes green while the field silently never syncs.
- The rest of Suite 46 is presence-grepping — real Protocol 34 value, but it proves the source is spelled
  right, not that a save survives.

So: **a field that silently stopped syncing would pass every check this project has.** The 2.8.0 cloud
audit already ranked this exact shape — **CC-RT-1 · [HIGH]** — as its highest-value gap
(`planning/2.8.0/audits/CLOUD_AUDIT.md`).

**Correcting the record: this does NOT need paid infrastructure.** The **local emulator suite** runs
Firestore and Auth on the developer's own machine — free, offline, no credentials, and **no App Check
involvement at all**. The bug class lives in **this project's own field-mapping code**, not in Google's
servers.

**What it buys over 46.17.** A real SDK write/read instead of a sandboxed function call — so it also
catches the things that only bite at the serialization boundary (`undefined` stripped, nested arrays
rejected, timestamps coerced, document-size limits). And driven from the live field list rather than a
hand-typed one, so it fails on the field nobody remembered.

**The natural extension.** This is the guard that makes **Protocol 34** _enforced rather than written_.

**Honest cost note — a new dev dependency.** It introduces `firebase-tools` as a **DEV-ONLY** dependency.
That brushes against this project's no-new-dependencies instinct and is stated rather than hidden. Nothing
ships to users; it runs fully offline; it only runs at the gate. Weigh it at plan stage against a lighter
fake-Firestore shim (which would cover the mapping bug but not the serialization boundary).

**Honest scope note — what this does NOT cover.** The emulator does **not** test real Firebase, App Check,
production security rules as deployed, or genuine network behaviour. It covers the **mapping** bug — which
is the dangerous, silent one.

**Why it belongs in the data-safety bracket.** Alongside A0/A1/A2 by kind: those made the LOCAL save safe
against AI overwrite, eviction and false quarantine; this is the same class of failure on the cloud path.
It fixes a structural bias worth naming — **the gate is dense where verification is cheap and empty where
it's expensive, which is backwards from risk.** Sync is the most dangerous thing the app does and it has
zero end-to-end coverage.

**Hard rule.** Protocol 13/42: the test must be demonstrated **red-then-green** — remove a field from the
sync mapping and it must fail.

**Done means:** a save→sync→load round-trip runs against the local emulator in the gate, asserts every
save-envelope field present and equal, is driven from the live field list rather than a hardcoded one, has
been proven to fail when a field is dropped, and `firebase-tools` is a dev-only dependency with nothing
added to the served set.

### B. 🔄 The deferred U3 render-harness test slice — ONE conversion landed, the rest scoped (2026-07-19)

**What it is.** One slice of the U3 static→behavioral conversion round was deferred: converting the
render-harness-dependent suites to actually drive the render path rather than grep it. The rest of U3's six
slices shipped; this is the one left on the bench.

**The deferral is now traced to its source, so the slice is a known list rather than a vague bucket.** It
came out of the U3 slice-6 commit (`7030103`), whose body reads: _"DEFER 163.12 (renderSavesList per-game
filter) — needs a DOM render harness or a source extraction (served-file change); kept its verbatim-filter
static guard, flagged for a render-harness slice."_ The wider hit-list is `TEST_STRENGTH_U2.md`'s CONVERT
ledger: **163.12** (`renderSavesList` per-game filter), **226.11** (inventory detail-pane mutator wiring),
**179.4** (`renderCartDeck` escaping), and **210.7 / 211.4** (Diagnostic Shell filter-before-DOM-insertion).

**✅ Landed this pass — 179.4**, chosen because it was the one making a SAFETY claim it could not actually
prove. `renderCartDeck()` is now executed in a `vm` sandbox against a hostile `GAME_DEFS` fixture, and the
assertions read the markup it really produced; new **179.4b** proves a `<img src=x onerror=…>` label is
escaped. Red-then-green verified.

**⬜ Still on the bench, and why each one is more than a copy of the above.** **163.12** may not be
`vm`-extractable without editing shipped JS, which turns a test-only change into a Protocol 1
cache-bumping one — a scoping decision worth making deliberately. **226.11** and **210.7/211.4** need a
fuller synthetic-DOM harness (event dispatch and a mount pipeline), which is a harness-building unit.

**Done means:** the remaining deferred render-path suites execute the real render and assert the result,
matching the behavioral bar the rest of U3 set.

### D. ⬜ The TEST_CATALOG generator — REDUCED SCOPE after R1 (pairs with the Atlas, item I)

**What it is.** `library/TEST_CATALOG.md` is GENERATED-class **in intent** but hand-synced **today**, and
it drifted twice. This builds the generator that produces it from the test runner and gate-diffs it
against the committed copy.

**⚠ Scope reduced by R1.** R1 deleted the whole test-count bookkeeping, so the "stop hand-syncing the
COUNT" half of this item's original rationale is gone. What's left is generating the per-suite **content**
(each suite's coverage narration) — which is exactly what the ATLAS assurance view (I) consumes. So D is
now the first concrete instance of "generate what a script can compute" and the plumbing the Atlas reuses.

**What it depends on.** The runner (exists) and R1 (done). The one genuine gate is a **design decision, not
a missing foundation**: `library/` is gitignored, so a naive gate-diff can't run on a clean CI checkout —
resolve that (the same tension the doc-integrity guards already navigate) and the generator is
straightforward.

**Why it sits here.** Best done just before the Atlas so they share the "generation over maintenance"
plumbing rather than inventing it twice.

**Done means:** the catalog's per-suite content is regenerated from the runner and gate-checked against its
committed copy; no human hand-edits it again.

### G. ⬜ The blind workflow review

**What it is.** A blind (independent, no-peeking-at-the-answer) review of the Dispatch three-model workflow
— is Fable/Opus/Sonnet actually pulling its weight, are the hand-offs clean, where does the process leak
or waste.

**What it depends on.** The four refreshes (F, now ✅) — that's the whole reason F sits in front of it.

**New evidence for this review (2026-07-21).** A concrete session-management failure nothing in the documented
process anticipated: **concurrent sessions can fail each other's gates through the shared working directory**
(the full pre-push gate runs `npx eslint .` over the whole tree, so a concurrent session's untracked scratch
file failed another session's push while its commit had passed), and a Protocol 41 junk sweep **deleted a live
concurrent session's scratch files**. It **complicates the worktree-isolation claim** the workflow prompt
asserts. Recorded in `planning/_standing/WORKFLOW_REVIEW_PROMPT.md` §7 for the review to attack.

**The model roster — decided 2026-07-20, recorded here per Protocol 50 because it had lived only in
conversation.** The review still goes blind to **GPT-5.6 Sol** and **Gemini 3.1 Pro Extended**
independently, then Dispatch synthesizes. Added for this ONE review: **DeepSeek as a third WITNESS, not a
third judge** (GPT's framing, endorsed) — its value is only realized if its dissent is preserved and
answered, never smoothed into consensus. Hard rules on it, none negotiable:

- **Free, hosted chat/app only — never the token-billed API.** A free hosted service can change terms or
  vanish, so it is **never a required gate**, only ever an extra witness.
- **Not run locally** — the Ally can't host anything worth hosting, and the local-model slot was already
  tested and rejected (ripgrep beat a local model on both speed and accuracy; see the workflow prompt §13).
- **Privacy fence:** DeepSeek's free tier retains inputs and may train on them, processed in China — so it
  gets the **workflow description ONLY**, never repo contents, archive/memory, keys, or museum internals.
  The send-time cut strips §14 and anything repo-identifying from the prompt.

**The claim-ledger artifact — GPT's proposal, with the owner-approved amendment.** GPT proposed a ledger of
unique claims, disagreements, supporting evidence, evidence-needed-from-the-repo, and status. **The
amendment the owner approved: it must be a COMMITTED FILE IN THE REPO, not held in Dispatch's context** —
otherwise it is exactly the unchecked-summary problem GPT's own asymmetry question identifies, and it dies
the moment Dispatch's context ends.

**A rejected proposal, kept as a calibration specimen.** Gemini proposed replacing Dispatch itself with
DeepSeek-V3-as-dispatcher on speed/cost grounds. Rejected: it described a workflow the owner doesn't have,
priced the argument in API tokens when the constraint was _staying free_, and hallucinated unrelated
context. It's the clean specimen of the failure this review must guard against — a confident, well-written
answer to a question nobody asked — and is carried into the prompt (§16) as a worked example.
**Model-version caution:** cited DeepSeek figures are past the orchestrator's knowledge cutoff and are
vendor claims; the owner verifies the current free offering himself before relying on any advertised
capability.

**Honest note on how these decisions reached this file (Protocol 50 in its own mirror).** The DeepSeek
roster call and the claim-ledger amendment were both made _in conversation_ and sat unrecorded for hours —
a Protocol 50 violation on the same day Protocol 50 shipped. The automated queue-drift nudge did not catch
it, and couldn't: it flags `type: project` memories the queue doesn't reference, so it catches memory↔queue
drift, not **conversation↔queue** drift.

**Done means:** a verdict on the workflow with concrete, checkable findings, run against the current
(refreshed) process; synthesized into a committed claim-ledger file; with DeepSeek's dissent preserved and
answered rather than averaged away.

### L. ⬜ A generated, private HTML view of THIS queue — plus a deferred, opt-in player-facing view

**What it is.** `QUEUE.md` is the file the owner steers the project from — generate an HTML view of it that
reads comfortably on a phone. _(Note: this restructure and the new [`QUEUE_LOG.md`](QUEUE_LOG.md) split
have already cut the queue down substantially; L now renders a much leaner source.)_

**The ruling — ONE SOURCE, TWO GENERATED VIEWS.** `QUEUE.md` stays the single source of truth; two separate
generated views read from it:

- **A private view, for the owner** — generated unfiltered, everything in this file, phone-readable. Build
  this one soon; small and immediately useful.
- **A player-facing view, for the live site's already-queued "upcoming updates" feature** — generated
  later, from **only** items explicitly marked public in this file. **The marking must be opt-in, never
  opt-out** — a forgotten mark means a player silently misses an update (the safe failure direction),
  rather than internal reasoning silently leaking to players (which isn't). Same fail-closed shape as the
  museum's name-substitution guard (P2, in the museum sub-program below).

**Why the two views are not merged into one document.** This file's value is that it records rejected
options, hazards, and reasoning — not just current status. A single merged document either leaks that
reasoning to players or gets sanitized until it stops being useful internally.

**Sequencing.** The private view ships soon. The player-facing view is deliberately left until **after** the
museum publication work (P2) — it needs the same substitution-and-fail-closed-guard machinery P2 is
building, and building it twice would be wasteful (Protocol 22).

**What it depends on.** Nothing, for the private view. The player-facing view depends on P2's
substitution/guard machinery.

**Done means (private view):** a generated HTML page, readable on a phone, reflects the current `QUEUE.md`
in full. **Done means (public view, later):** a separate generated page shows only opt-in-marked items,
defaults to omitting anything unmarked, and reuses P2's machinery.

### R10. 🔄 The external knowledge-architecture audit (GPT-5.6 Sol, 2026-07-21) — 2 defects FIXED, the rest recorded

**What it is.** An external audit (GPT-5.6 Sol, read access to `dev` at commit `2798271`) of how this
project **stores, retrieves and connects what it knows about itself** — the retrieval chain, the scoped
notes, the doc/gate/skill layers. It read the real files and cited paths/lines. This entry is the Protocol 50
landing record: **every claim was re-verified against the current files before being written here** (the audit
read one commit; a claim is only recorded as fact once checked). Two live defects were fixed in the same pass;
everything else is recorded, ranked by consequence, with each finding's home or earn-condition stated.

**⭐ THE SEQUENCE for working R10's findings — Dispatch sequenced it, owner's instruction (2026-07-21):
_"you need to sequence everything not me."_** The ordering reasoning is the valuable part, so it is recorded,
not just the order. **NONE of this blocks the release — 2.8.5 is blocked only by A3; everything in R10 is
process debt, not shipping debt.** The stated plan: do steps one and two, ship 2.8.5, then do step three.

1. **FIRST — fix the trusted layer.** The stale facts in `ARCHITECTURE.md` (finding B) and the ones the R2
   restructure copied into `rules/state-and-save.md` (finding B-critical), plus the remaining false/overclaimed
   statements in the skill (findings C skill-overclaim + E library-fallback). **Why first:** these bleed
   _continuously_ — every session that runs before they're fixed inherits wrong facts and generates work.
   Nothing else in R10 costs anything per-session. This goes first purely on **bleed rate**.
2. **SECOND — fix the guards that overstate their coverage.** Suite 220 checking less than Protocol 45
   advertises (finding C), and the retrieval map's routing gaps (finding D). **Why second:** these are _why_
   step one's problem stayed invisible — stale references sat under a passing check. Fixing them second means
   step one's fix stays fixed instead of silently rotting again.
3. **THIRD — route `ARCHITECTURE.md` by section instead of universally** (finding A). **Why third, not first
   (load-bearing):** step one REMOVES the operational checklists and runbooks from that file, which shrinks the
   problem before it is solved. Routing-by-section first would mean building section routing for content about
   to be deleted.
4. **RIDING ALONG wherever convenient:** the rollback script contradicting Protocol 43's branch model
   (finding F) and the duplicate App Check entry (finding G) — both small and independent. Note: F only bites
   during an outage, which is exactly when ambiguity is most expensive, so it should not sit indefinitely.
5. **GATED on other work, not on effort:** the P3 supersession-logic fix (finding H) must land **before the
   museum-for-AI extract (P3) is built**, not before anything else. The stable-identifier scheme (item I) is
   needed **before the Atlas and museum link to each other**, which is **after 2.8.5**.

**✅ FIXED this pass — Defect-1 (shipped `8d14073`): the cache-bump guard's classifier was blind to real precached files.**
`sw.js` precaches the `assets/*` icons (install-time `ASSETS`) and best-effort-precaches `CHANGELOG.md`, but
`scripts/cache-bump-guard.js`'s `SERVED_RE` matched only a **root-anchored** `icon[^/]*\.png` — so changing
`assets/icon.png`, `assets/ocr/eng.traineddata.gz`, or `CHANGELOG.md` needed **no cache bump**, and cached
users silently kept the stale copy **under a fully green gate** — the exact failure class Protocol 1 exists to
prevent, and one this queue already records happening (the staging-SW stale-`index.html` incident, 2.9.0
hardening gate). **Proven red on a real path** (staging `assets/icon.png` printed `[SKIP]` and exited 0), then
fixed: `SERVED_RE` now covers `assets/`, `CHANGELOG.md`, `css/`, `js/`, and the root files. **Guarded two
ways:** new Suite **30.3e** (behavioral — runs the real guard against a staged `assets/icon.png` and proves it
now FAILS without a bump, PASSES with one) and Suite **30.3f** (the one the audit specifically asked for — it
parses `SERVED_RE` straight out of the guard and **every path `sw.js` actually precaches**, and fails if the
classifier misses any; when run against the old classifier it named all six uncovered paths). A guard that
tested one hard-coded filename is exactly how this stayed hidden — 30.3f tests **agreement with the real
precache list**, so it can't drift again.

**✅ FIXED this pass — Defect-2 (shipped `8d14073`): `ARCHITECTURE.md` prescribed a save-destroying cloud write.** Its Cloud Push
section showed `setDoc(firestore, { … state: stateObj … })` — a whole-document overwrite — while the real
`js/services/cloud.js` uses **additive `addDoc`** into a `saves` collection with a `contentHash` dedup, and
Protocol 34 states plainly that a blind `setDoc` would clobber a campaign with no recovery. A session building
from the canonical architecture doc would have implemented the clobbering version — a data-loss instruction
inside a canonical document. Corrected to the real additive shape (matched against `cloud.js` line-by-line),
and guarded by Suite **46.26** (asserts the Cloud Push section prescribes `addDoc` and carries neither the
`setDoc(firestore,…)` call nor the `state: stateObj` field; proven red against the old text). **Factual
correction only — the file was not restructured.**

**⬜ RECORDED, ranked by consequence — the knowledge-architecture defects (high-priority doc-currency + one
enforcement gap; none gate the `dev → main` release, all belong to the next governance pass / R5 conversion
thread).**

- **⭐ Finding B-critical — the retrieval redesign relocated STALE knowledge into the new trusted layer. This
  is the sharpest evidence yet for the project's own recurring failure class, and it happened inside the fix
  for it.** `rules/state-and-save.md` — the note R2 created so sessions load _only_ the relevant, current
  rules — carries stale file-ownership facts in its Protocol 4 checklist: **line 17** puts `autoImportState()`
  in `api.js`, **line 18** puts `sanitizeImportedContainer()` in `api.js` (both live in **`api-import.js`**),
  **line 20** puts `getSystemDirective()` in `api.js` (lives in **`api-directive.js`**), and **line 21** names a
  single **`ui-render.js`** (split into the `ui-render-*.js` family at U-A4). Verified directly against source
  and `git log`: all four lines were authored by the restructure commit **`eac54ba`**. CLAUDE.md's own pointer
  index is _correct_ — so the restructure copied the drift into the subsystem note while the index it sat beside
  was right, violating "each fact in exactly one place" and Protocol 3. **Why it survived the gate → finding C.**
- **Finding B — `ARCHITECTURE.md` is doing two jobs and carries current-looking errors** (beyond the Defect-2
  `setDoc`, which is fixed). Its header says rules live elsewhere, yet it holds the cache protocol, the rollback
  runbook, and the state/audio/UI change checklists. Stale specifics confirmed: the **File Map (line 104)**, the
  **`### Inbound (autoImportState in api.js)` heading (line ~2594)**, and the **state checklist (lines
  2183-2191)** all still credit `api.js` with the directive + import (the doc is internally inconsistent —
  lines 354-356 attribute them correctly); the **cache section (line ~3393)** claims a _strict monotonic-rev_
  guard that the real guard **deliberately dropped** in favour of "differ from HEAD"; the state checklist names
  the single `ui-render.js`. Direction (record, don't build): Architecture owns stable rationale/invariants;
  rules own obligations; the code map + source own current locations — remove the operational checklists in
  favour of links.
- **Finding A — the blanket-retrieval problem MOVED rather than being solved.** CLAUDE.md (**501 lines /
  ~57 KB**) tells every session to then read `ARCHITECTURE.md` (**3,462 lines / ~348 KB**), loaded **wholesale**
  — it has an internal TOC but nothing routes a session to a _section_. So >400 KB of universal material still
  loads before task code; the scoped-notes win is real but the retrieval chain partly defeats it. Direction:
  make Architecture **task-retrieved by section** — route surfaces to Architecture anchors from the existing
  retrieval map / scoped notes; **explicitly NOT another summary document**; a Suite 220-style check can verify
  the named anchors exist.
- **Finding C — Suite 220 does far less than Protocol 45 advertises, which is why B/B-critical passed a green
  gate.** Suite **220.2**'s regex matches **single-segment paths only** (`(js|css|tests|scripts|rules)/name.ext`);
  it cannot see bare filenames (`api.js`), nested paths (`js/services/api-import.js`), function ownership, or
  prose — so the stale `api.js` ownership claims are invisible to it. And `skill/SKILL.md` **overclaims** the
  canonical files are "canonical and current by construction (the gate guards them)" — **still present at
  line 19 (verified 2026-07-21); NOT fixed by `21c78f7`, which only corrected the separate gate falsehood
  (finding E).** Direction: correct the SKILL claim first (say _partially_ mechanically checked, source wins);
  extend 220.2 only for unambiguous backticked **nested** paths and **exact bare** filenames; **do NOT**
  attempt a prose-truth checker. Belongs to steps one (skill claim) and two (Suite 220) of the sequence above.
- **Finding D — the retrieval map has concrete gaps against the notes' own declared scopes.**
  `.github/workflows/` routes only to the deploy note though the testing note also governs it;
  `scripts/cf-staging-build.mjs` is deployment's but the broad `scripts/` row sends it to testing;
  `firebase.json` is in the auth note's load header but missing from its map row; `QUEUE_LOG.md` is absent from
  the documentation row despite that note defining its append-only contract; `skill/SKILL.md` routes nowhere.
  Suite **220.14** only proves every note is _named_ in the map, not that every relevant path _reaches_ the note
  claiming it. Direction: make the map the **sole** scope authority, fix the rows, add a narrow parity check
  (each note's "load this when" header ⇄ its map row). No second routing document.
- **Finding E — `skill/SKILL.md` FALSE statement is now ✅ FIXED (`21c78f7`); its library-fallback half is
  still open.** The false gate claim ("the full gate must pass on every commit/push") was **corrected at
  `21c78f7`** — the skill now reads _"the FAST gate runs at commit, the FULL gate (browser checks too) at
  push"_ (verified against the tracked source), matching `scripts/pre-commit` → `gate:fast` / `scripts/pre-push`
  → `gate`. Because the skill is installed read-only, a re-install was owed after the fix landed — **and the
  owner has re-installed and confirmed it (2026-07-21)**, so this is closed (owner-confirmed control-plane
  state, not repo-verifiable — the finding-L category). **Still open — the second half of E:** CLAUDE.md tells
  sessions to read gitignored `library/` files, but a clean checkout has only `library/MANIFEST.txt`. Add a
  one-sentence fallback: **if a local-only library target is absent, do not infer its contents — fall back to
  source and report the missing context.** Belongs to step one of the sequence above.
- **Finding F — the rollback path contradicts the branch model.** `scripts/rollback.sh` (and
  `ARCHITECTURE.md`'s rollback runbook, line ~3408) both instruct `git push origin main`, while Protocol 43
  says all work goes through `dev` and `main` receives only release merges — a contradiction that surfaces
  during an outage, when ambiguity costs most. **Honest nuance (from verification):** a live-site hotfix is
  arguably the one legitimate case where `main` IS the target, since production deploys from `main` and
  Protocol 16 is restore-first — so this may be an intentional emergency exception the docs simply never
  reconcile. Direction (owner call): explicitly choose an emergency-direct-`main` exception **or** a dev-first
  rollback, and make script + protocol + runbook agree.
- **Finding G — LOW, one redundancy.** App Check is closed in **two** places in this file (the 2.9.0-round
  section, line ~872, and the "Closed / off the board" list, line ~1253). **Verification correction to the
  audit:** they are **paraphrases, not identical text**, both linking `QUEUE_LOG.md#appcheck` — redundant, not a
  copy-paste. Cleanup only; earns its slot on the next queue-touch pass. **Recorded clean:** the audit's other
  G claim checked out in the good direction — **all `QUEUE_LOG.md#…` anchor links resolve, no orphans** (the
  queue/log split verified clean, spot-checked across `#v280`, `#u1`, `#r2`, `#appcheck`, `#f`, and the
  heading-derived `#update-history--the-running-last-updated-chain`).

**⚠ RECORDED as an OPEN owner-decision — Finding L: the missing category (verified external control-plane
state).** Facts essential to the project but derivable from **neither repo**: which skill version is actually
installed, branch-protection state, which commit is _actually_ deployed to prod/staging, Cloudflare project +
secret presence (not values), App Check enforcement state, GitHub Pages source config, the live service-worker
cache version. These currently **leak into queue prose and historical logs** (the App Check and skill-install
entries are the evidence). The auditor proposes a hand-maintained section in a library doc with a
`last_verified` field. **Dispatch objects, and records the disagreement rather than resolving it:** that is a
hand-maintained ledger of facts about a _moving_ world — the exact pattern this project keeps getting burned by
(test counts, architecture file sizes, the growth chart, the inert cache guard). Dispatch's position: **derive
what can be derived, mark honestly-unknown what cannot, and do not build a table someone must remember to
update.** This is left for the owner to settle — not a settled design. Earn-condition: a decision from the
owner on derive-vs-ledger before any implementation.

**✅ RECORDED — what the audit found CLEAN (evidence the restructure landed).** All ten scoped rule files exist
and are referenced; protocol headings are defined exactly once; the **tiered gate is genuinely real**
(`scripts/pre-commit` = cache-guard + secret-scan + `gate:fast`; `scripts/pre-push` = full `gate` + the
non-blocking nudges; CI runs full `gate`); Protocol 34's additive-cloud-write assertions, Protocol 40's browser
test, Protocol 44's diagnostic-trigger checks, and the Protocol 48/50 pre-push nudges are all wired and passing;
the queue/log split preserved every anchor; no meaningful orphaned system document exists.

**Cross-references (findings folded into the items they belong to, per Protocol 50 "write plans where they
live"):** Finding **H** (the P3 supersession logic defect) is recorded in **P3**; Finding **I** (the durable
stable-identifier scheme) in **item I, design note (b)**; Findings **J/K** (museum as front door; three
audiences) in **P**; and tonight's owner decision on the **bug-record obligation** in **P4**.

**Done means:** the two fixes are shipped and guarded (done); each recorded finding is either fixed in a later
governance pass or explicitly owner-decided (L, F); and no future session re-derives these from scratch because
the reasoning — not just the findings — lives here.

### R11. ⬜ The knowledge-graph / retrieval-topology — DESIGN ADOPTED (GPT-5.6 Sol, 2026-07-21), do not build yet

**What it is.** A generated map of how this project's knowledge layer connects — the skill, `CLAUDE.md`, the
`rules/*.md` notes, `ARCHITECTURE.md`, the library, the queue and its log, memory, the museum, the Atlas — and
how each routes to / claims scope over / is checked by the others. **It grew directly out of R10:** the owner
asked for a visual map of how everything connects, GPT-5.6 Sol (second pass, repo-aware) specified the data
model, and Dispatch amended it. **The full specification lives in
[`planning/2.8.5/plans/KNOWLEDGE_GRAPH_SPEC.md`](planning/2.8.5/plans/KNOWLEDGE_GRAPH_SPEC.md)** (recorded per
Protocol 50, referenced here rather than pasted).

**The core ruling — build a RETRIEVAL TOPOLOGY first, not a universal graph of every project fact.** Protocols,
suites, guards, queue items, museum history and Atlas assurance can join the same schema later, but their
derivation is less uniform and including them prematurely risks _"a polished graph that lies."_

**The three load-bearing ideas (must survive verbatim in substance — full text in the spec):**

- **`routes_to` and `claims_scope_over` are two INDEPENDENTLY DERIVED edges** — one from `CLAUDE.md`'s
  retrieval-map rows, one from each note's "load this when touching" header. The gap **emerges when the two
  derivations disagree**, which is far harder to fool than a checker written to look for a known problem. (This
  is R10 finding D, found mechanically.)
- **`claims_checked_by` and `invokes` are SEPARATE edges** — a protocol _naming_ Suite 30 and something
  _running_ Suite 30 are different facts. **The cache-guard defect is the proof:** protocol, script, hook and
  suite all named each other and the classifier still missed every icon path. **Naming is not running.**
- **Every extractor reports records seen / emitted / unparsed / parser status.** If the retrieval-map heading is
  renamed and the parser returns zero routes, the graph must say **"route extraction failed"**, NOT render ten
  orphaned notes as if the project collapsed — the silent-empty-parse failure of this whole week, designed out
  at the data layer.

**Also adopted:** node states `observed / declared / manifested / unavailable`; baseline-local keys for most
nodes with cross-release identity ONLY for protocol + queue IDs (which already have no-reuse contracts); a file
rename shown as remove+add, never inferred by git similarity (this project measured that heuristic undercounting
by 22%); and the public projection built FROM PUBLIC SOURCES PLUS GENERIC PLACEHOLDERS, fail-closed by
construction rather than by redaction.

**⭐ Dispatch's amendment, owner-endorsed — ONE derivation, THREE renderings.** GPT designed a diagnostic
instrument; the owner asked for a picture; the owner then corrected that there is a **third** consumer that may
matter most. Same "one source, N views" ruling already made for `QUEUE.md`/L and the museum/P3, extended to
three: **(1) a TOPOLOGY view** (human, visual — a **Fable design job**), **(2) a DIAGNOSTICS view** (human,
plain — selectors, dangling edges, parser status; stays plain), and **(3) ⭐⭐ a machine-readable answer for
SESSIONS** — a session touching `.github/workflows/` asks _"what governs this path?"_ and gets the note the map
routes it to AND the note that claims it AND the fact that they disagree; a session asking _"is this guarded?"_
gets _"named, invoked, and here's what its classifier actually reaches"_ rather than protocol prose; and the
node-states let a session know `library/CODE_MAP.md` is declared-but-unreadable on a clean checkout so it does
not infer the contents. **The owner's correction (_"we don't just need visuals, whatever helps the AI too ya
know?"_) is why this is placed as infrastructure, the R2-restructure category — not post-2.8.5 visualisation
decoration.**

**Its own stopping rule.** Build the retrieval topology first; extend to protocols / guards / museum / Atlas
**ONLY if the first map is actually used** to find or prevent drift. If it becomes wallpaper, stop.

**Honest cost.** Even GPT's "minimum" version needs a real parser — AST detection for suite definitions, glob
expansion against the tracked tree, boundary-accurate block parsing. **A session or two, not an afternoon.**

**Where it sits.** Infrastructure, near-term — **does NOT gate the `dev → main` release** (process debt like the
rest of R10), but placed as infrastructure rather than decoration per the owner's third-consumer correction. It
**shares the schema with the Atlas (item I)** — link, don't fuse; item I's stable-identifier scheme (design note
b) is the identity contract this graph's cross-release keys obey — and with **P3** (same provenance /
fail-closed-on-unknown discipline).

**Done means (when eventually built):** one derivation feeds the three views above; the two retrieval edges are
derived independently and their disagreements surface as data; declared-vs-invoked coverage is diffed; every
extractor reports parser status so a silent empty parse can never masquerade as an empty project; and a session
can query "what governs this path / is this guarded" and get the map _plus its known defects_.

## ⚠️ Blocked on an owner decision

### R5. ⏭️ STAGE 2 — Convert prose into enforcement (waits on the owner formally calling it)

**What it is.** The highest-value of the three remaining staged-trim steps flagged at R3, and really a
conversion rather than a cut. The principle: a rule an agent must remember costs something every session
it's loaded; a guard that fails loudly is free and can never be skipped. Every mechanisable rule becomes a
check, then its prose shrinks to one line plus a pointer at that check.

**Candidates on file (GPT's table, unchanged — each needs re-verification against current code before any
commit, Protocol 27):**

- Branch discipline (Protocol 43) → GitHub branch-protection settings, not just prose.
- The redirect-auth ban (`linkWithRedirect`/`signInWithRedirect`, Protocol 30) → a lint rule.
- The state-field checklist → a schema round-trip test. **Flag:** may already be substantially covered once
  **A3** (the cloud round-trip test above) ships — check for overlap at plan time (Protocol 22).
- Render-layering (Protocol 23) → AST/lint boundary rules, once the baselined debt is burned down. Today's
  static scanner (Suite 236) is a step in this direction; full enforcement waits on the native ES-modules
  migration (bundled with 3.0).
- AI-response handling → runtime schema validation + malformed-response behavioral tests.
- The deploy protocol → a post-deploy version/SW/offline smoke. **Flag:** very likely the _same_ work as
  the 2.9.0 hardening gate's "post-deploy TRUTH" item — resolve which one builds it before starting either.

**The gate this stage was waiting on.** R2 (the rules restructure) had to be USED for real work first.
**Dispatch's read: that gate now appears satisfied** — the restructure has been retrieving correctly and
pulling real weight across many sessions this week. Recorded honestly: this is Dispatch's assessment, not
something the owner has formally called yet.

**Status: ready to plan, not started — waiting on the owner to formally call Stage 2.**

### R6. ⚠️ STAGE 3 — Narrow the universal ratchets (CONTENTIOUS — owner must weigh in; NOT ready)

**What it is.** The cut that costs something real, unlike Stage 2's conversions. Today every escaped bug,
every CSS invariant, every harness flaw permanently **enlarges** the gate (Protocol 36b). GPT's proposal:
shift from "add a guarding test for every escape, always" to "add one when recurrence would actually be
costly" — a judgment call replacing an automatic one.

**Also on the table, same stage:**

- The per-commit documentation rule (Protocol 2) — loosening how often or how much waters this down.
- The changelog grammar rule (Protocol 21) — possibly relaxed.
- The universal-requirement framing of the UI-verification protocol — narrowed from every change to a
  risk-scoped subset. **This is the one item GPT itself withdrew from its own cut list** (see the keep-case
  under R7) — listed only so a future pass doesn't independently reach for it.
- Moving the UI-presentation rules (the `Protocol UI-*` family) out of the constitution into design docs,
  since they encode presentation taste rather than catastrophic knowledge.

**Why this one waits for the owner, explicitly.** This changes how much SAFETY the process buys per commit
— the escape-ratchet exists because "add a test when recurrence would be costly" requires correctly
predicting which failures recur, and this project's own incident record is full of failures nobody
predicted would recur until they did. Not marked ready to plan; each bullet needs the owner's explicit
call, not a session's judgment substituting for it.

### H. ⬜ DEFERRED pending G's results — the optional system-model review (owner-gated)

**Status (decided 2026-07-21): DEFERRED PENDING G'S RESULTS — not dropped.** When H was written, the
workflow-review prompt had no sections auditing the orchestrator, the multi-model hand-off, or the context
sources; item **F** added exactly those. H asked "is your model of yourself accurate"; **G now asks that
directly — with more evidence and three reviewers.** So Dispatch's assessment, which the owner accepted, is
that H is now **largely redundant with G**.

**The counter-argument, recorded so it isn't lost — they are NOT identical.** G reviews the **PROCESS** (is
the three-model workflow pulling its weight, are the hand-offs clean, where does it leak). H reviews the
**REPRESENTATION** — the brain dump, the library, the docs a session actually reads to build its model of the
project. That is a real distinction, and it is why H is deferred rather than closed.

**The standing obligation (written here, not remembered).** After **G completes**, Dispatch owes the owner an
explicit **yes/no on whether H is still worth running, with reasons** — did G's process review leave the
representation genuinely unexamined, or cover enough of it that a separate H would be ceremony? This
obligation lives in H's own entry rather than in the orchestrator's memory on purpose: promises kept only in
memory are exactly the failure this project spent all night (Protocol 50) fixing.

**What it is (unchanged).** An OPTIONAL external review of the project's system MODEL (its representation of
itself), kept **small and question-scoped** (a large-context review degrades and tends to adopt your own
errors rather than catch them).

**What it depends on.** G's results first (the deferral above), then a **portable brief generated fresh from
the now-pinned brain dump** (the §20 spec in the brain dump) — that foundation is available now. It is **not**
a standing doc: generated fresh each time so it's always accurate because it's always new.

**Done means (if run):** a small, question-scoped external pass returns findings in the required claim →
provenance → falsification format — OR Dispatch's post-G recommendation is that it isn't worth running, with
reasons recorded.

## ⬜ Blocked on another item

### R7. ⬜ STAGE 4 — The expensive machinery (capability calls, not doc cleanup)

**What it is.** Unlike R5/R6 (rulebook prose), this stage cuts actual running infrastructure — each item
needs its own argument, not a shared one:

- **The Diagnostic Shell's scope (159 tools).** Weight GPT's rejection of this LOWER — GPT did not know the
  Diagnostic Shell is on the owner's own roadmap as a real in-fiction user-facing feature (the
  hacking-minigame's unlock target, 2.9.0 — see "The OS round proper" below).
- **The duplicate Windows CI leg.** Real cost, but this is precisely the class of guard this project has
  already been burned by cutting once (a Linux-only CI runner was a real production mistake here).
- **Nightly runs.**
- **The browser test page (`tests/test.html`).** Already has its own retirement analysis on file —
  Protocol 40 kept it deliberately as a self-consistency check. Re-litigating it should start from that
  reasoning, not from zero.
- **Per-step failure-evidence packaging** (U4's CI screenshot/console/log capture).

**Status: not started, not ready — each item needs its own cost/benefit case before it's even plannable.**
Per Protocol 49, retiring any of them means removing the actual enforcement, not just the prose.

**Keep-cases across R5-R7 — recorded so they are not re-litigated in any future trim pass:**

- **The architecture-conformance baseline** (Suite 236) — already a formal Protocol 49 keep-case; its risk
  stays live until the native ES-modules migration (bundled with 3.0) makes layering structural.
- **The real-device auth rules** (Protocols 29-31) — a real production regression is on file (the r54
  regression).
- **UTF-8 source integrity** (Protocol 39) — a real corruption incident with a commit hash on file.
- **Cloud write safety** (Protocol 34) — failure here is unrecoverable data loss; the entire data-safety
  chain above exists because this class of failure actually happened once.
- **The cache-bump guard** (Protocol 1) — failure is silent and user-visible (a stale build or black
  screen).
- **The dispatch-decision protocol** (Protocol 12, No Concurrent Pushes) — the owner already overruled this
  exact cut at R3.
- **"Actually render and exercise UI changes"** — GPT **itself withdrew** this from its own cut list,
  because it addresses a real, named AI failure mode: an agent reasoning confidently from CSS text without
  ever looking at the rendered result.

**What R5-R7 depend on.** R5 needs nothing new (its gate is met per Dispatch's read). R6 needs the owner's
explicit call on each bullet. R7's items are independent of each other and of R5/R6 — any one can be argued
on its own schedule. **None of R5-R7 gates the `dev → main` release** — it's process debt.

### C1. ⚠️ Gate the cloud warm-up (one of the two deferred U8 perf wins) — NOT DONE, needs re-scoping

**⚠ NOT DONE — deliberately, and it needs re-scoping before anyone attempts it (verified 2026-07-19).** The
queue described this as "a small, self-contained win." Reading U8's own commit (`49a37cc`) and `cloud.js`
says otherwise; the deferred item is _"Defer the eager Firebase/cloud boot chain until cloud features are
used."_ Two hard blockers, both concrete:

**(a) It is an auth-path change, and Protocol 29 makes real-device verification a condition of "done."** The
chain being deferred is `initializeAppCheck` → `getAuth` → `onAuthStateChanged` → the Protocol-31-guarded
`signInAnonymously`. Protocol 29 says an auth change is not done until verified on a real mobile device in
both a browser tab and the installed PWA. No session without a phone in hand can close it.

**(b) It collides head-on with Protocol 33.** `cloud.js` calls `loadRemoteConfig()` at boot, which is the
remote kill-switch read. Deferring the boot chain until "cloud features are used" would mean a player who
never touches cloud features never reads the flag doc — so a kill switch flipped to disable a broken
feature would never reach them. Any real version has to keep the flag read at boot while deferring only the
auth/App Check/Firestore weight — a genuinely larger change than "warm up lazily."

**Also worth stating plainly: the measured payoff is small.** U8 found the chain "runs in the BACKGROUND
and never gates READY," with FCP already ~73 ms. Re-scoped, it belongs with the 2.9.0 hardening gate's
boot-isolation work, not as a near-term one-liner.

**Done means (C1):** the cloud connection is warmed lazily, measured before/after — the flag read and LKG
path preserved at boot.

> **C2 — virtualize long lists — MOVED to 2.9.0.** The 2.9.0 inventory-panel rebuild also virtualizes long
> lists as its stated foundation. Doing it twice would be a Protocol 22 parallel-implementation trap, so
> list virtualization is re-sequenced into the 2.9.0 inventory-panel foundation and built once, there. (The
> one genuine mis-ordering the 2026-07-18 evaluation found.)

### I. ⬜ Finally: the ROBCO SYSTEM ATLAS — 8 views over one graph (depends on D)

**What it is.** The synthesis deliverable from the ecosystem cross-review
(`planning/2.8.5/audits/ATLAS_ECOSYSTEM_SYNTHESIS.md`): a single generated representation of the whole
system, offering **8 views over one graph** — and, load-bearing, the **assurance view is one of those
eight** (generated FROM the test suite's structure so it can never drift from what's actually guarded). The
governing rule: **generate everything a script can compute; hand-maintain only the un-derivable WHY.**

**What it depends on.** (1) The **pinned baseline** (available now: the R4 pin). (2) The
**architecture-conformance scanner** (shipped, Suite 236) and a cheap **dependency-structure matrix**. (3)
The **TEST_CATALOG generator** (D) — same "generate, don't maintain" plumbing, which is why D is best done
just before this.

**Why it's last.** It's the capstone that represents the finished round, and it wants the round finished and
pinned to represent it honestly.

**⬜ Design note (a) — enumerate the eight views NOW; that's cheap scoping, not implementation
(2026-07-21).** This entry says "8 views over one graph" but only ever NAMES two (assurance, dependency) — the
other six are a number standing in for a specification. Enumerating the eight — each view plus the one
question it answers — is a cheap scoping step worth doing NOW, independent of everything else. **Explicitly
NOT the implementation:** do not spec how they're built. The round is unfinished, 2.9.0 will change much of
what the Atlas maps, and this entry's own "why it's last" wants the round finished so the Atlas represents
something real. Scope it, don't spec it.

**⬜ Design note (b) — LINK the Atlas, library and museum; do NOT fuse them (owner: "link not fuse",
2026-07-21).** All three share one principle — generate what a script can compute, hand-maintain only the
un-derivable WHY — but cover different corpora and time axes: **library = current-state prose, Atlas =
current-state structure, museum = history.** The valuable connection: **the Atlas's assurance view and the
museum's bug room are the same relationship from opposite ends** — the Atlas answers "what guards this?", the
museum answers "why does this guard exist?" (always some specific bug that escaped). Walking it both ways
answers "why is this here", otherwise unanswerable without having been present. **RULING: link via a stable
identifier scheme** (files, protocols, suites, queue items) so each references the others WITHOUT any owning
the others — do NOT merge into one shared graph. Three things that reference each other can each fail alone;
one merged thing fails everywhere. The scheme is already half-present: the skill and rules cite protocol
numbers, and queue items have stable IDs the restructure just protected. (The AI-facing read side is P3's
spec — the raw archive / internal manifest, never the ~190MB generated HTML nor the name-substituted public
tree; not restated here.)

**⭐ Sharpened by the knowledge-architecture audit (R10, finding I, 2026-07-21) — the ruling stands, but the
naive version of it breaks: file paths are LOCATORS, not IDENTITIES.** This project already has the evidence —
its own archive-rename work measured git's content-similarity rename detection **undercounting by ~22%, and
failing silently** (recorded under P1). So a durable link scheme needs, concretely: **namespaced immutable IDs**
(`incident:0042`, `protocol:1`, `guard:cache-bump`, `queue:R9`) kept **separate from an evidence locator**
(repo + commit + path); IDs that **survive** label / path / display-name changes; **no reuse after retirement**;
**retirement tombstones** carrying status and an optional `superseded_by` (deleting the _enforcement_ must never
delete the _identity_ — the Protocol 49 discipline, made structural); **baseline-aware relations** ("prevented
this at release X" ≠ "active now"); **one owner per relation** with inverses generated, not hand-written; and
**validation that lives in the Atlas / museum / extract generators, NOT in the app's release gate** (linking
metadata must never be able to block a release). **What breaks it, recorded so it isn't re-invented:** deriving
IDs from paths / headings / slugs; reusing retired numbers; deleting IDs on retirement; treating a _moving_
branch URL as historical evidence; public sanitisation changing IDs instead of only display labels; and
treating a missing reference as "retired" or "current" instead of **"unknown."**

**⬜ Design note (c) — share the museum's renderer, keep publication separate (owner: "part of the museum on
the user end", 2026-07-21).** Yes to sharing the museum's generator plumbing — renderer, navigation, search,
styling, pinning discipline — rather than building a second browsable site. BUT the Atlas maps where the
architecture is violated and what isn't covered by tests: a fair description of an **attack map** for a live
app with cloud sync and auth. So the Atlas lives on the **PRIVATE side by default**, using the same
private-source-vs-published-output split P2 already designs. The one genuine difference to record: the museum
is pinned to **RELEASES** (history, deliberately frozen); the Atlas is pinned to a **CURRENT BASELINE** and
marks itself **degraded** when the repo moves off it. Same pinning idea, opposite intent — **share a renderer,
never share a cadence.** (Design only — build nothing here.)

**Done means:** one generated Atlas, pinned to a baseline, with 8 views (assurance among them) computed from
source rather than hand-authored.

## 🔄 The Museum sub-program (a coupled cluster — kept together deliberately)

_These items (P, P1, P2, P3, J) form one tightly-coupled sub-program with internal dependencies that
readiness buckets would fragment, so they are kept together: **P/P1 is in flight in the sibling archive
repo, P2 is post-release, and P3/J both depend on P1.** None gates the `dev → main` release._

### P. 🔄 THE MUSEUM — a generated, browsable history of the project (BUILT; reproducibility sub-program in flight, publication still ahead)

**What it is.** The private archive repo (Protocol 48's `_RobCo-Archive`) turned into a browsable **museum**
of the project's history — an index, a timeline, per-version "rooms," file lists, counts, and mockup
galleries. `museum/generate.mjs` in the archive is the generator; `museum/site/` is its committed output
(18 MB on its own, ~190 MB once the referenced full-size mockup images are counted). As built and running:

- **Generated, never hand-curated.** Every view is derived from the archive's folder structure — the whole
  point is generation over maintenance.
- **The ONE hand-written part is the release account.** Shipped and approved: 2.5.0, 2.6.0, and 2.8.0 are
  frozen; 2.8.5 exists too but is explicitly `draft: true`.
- **A graveyard of abandoned ideas, with their reasoning, exists and is live** (`museum/site/graveyard.html`).
- **Trigger: release-pinned, not pinned to `dev`.** `museum/release-pin.json` records the shipped release
  tag; advanced only by `node museum/generate.mjs --release`, and it refuses to pin a tag that doesn't
  exist.
- **RITUAL, NOT A GATE (hard rule).** It must never block, fail, or delay a release.
- **A correctness pass already ran** (`edfbb05`) — it found and fixed a real defect (a dual-axis growth
  chart whose normalization made an unrelated pair of series look correlated).

**⭐ Visual ambition — DECIDED 2026-07-21: DIRECTION B, "RECORDS OFFICE"** (owner, verbatim: **"okay go with
B"**). Recorded the pass before as ambition-not-spec — the owner: _"I really want the museum to look
graphically insane as well — like really good visual representations."_ It is now a decision, not an
ambition.

**The ruling that made a fresh design pass necessary, restated by the owner this session (something he'd said
before).** _"I told you the museum should have it's own feel to it, doesn't have to stay fully in theme ya
know? Shouldn't have a bezel at all tbh."_ **The museum does NOT use the terminal bezel and does NOT have to
stay fully in the Fallout theme — it gets its own visual identity.** Recorded honestly: Dispatch's own brief
for the design pass had asserted the opposite (it listed the CRT terminal aesthetic as a hard constraint),
which is exactly why an entire design pass came back wrapped in a bezel. The design model followed the brief
correctly — **the brief was the defect**, not the output.

**The framing behind the decision.** A gallery does not paint its walls to match the paintings. The exhibits —
screenshots, mockups, captured app states — are already saturated in phosphor green; a terminal-themed
container makes the artifacts stop reading as artifacts and flattens the whole page into one green surface.
**Contrast is what makes an exhibit legible as an exhibit.** ⭐ The design model's own refinement, sharper than
the brief and the half that must survive: **contrast alone is not sufficient — the container needs its own
POSITIVE identity, or "not the terminal" just collapses into "generic light page."** That distinction is
precisely what separated the winning direction from its runner-up.

**What Direction B is.** A mid-century technical archive: buff paper, accession cards, rubber stamps
(including a DE-ACCESSIONED overprint on the graveyard), a ruled ledger margin standing in for the elevator
shaft, plate numbers, a condition-report form. **The only phosphor on the page lives inside small dark
instrument windows inset into the paperwork** — a trace of the source material, not the theme worn as a skin.

**The two rejected directions, recorded so they are not re-proposed.** **A — Catalogue** (exhibition-catalogue
editorial, near-white paper, serif display type): judged elegant but the least striking of the three, and it
demonstrated the "generic light page" failure the refinement above names. **C — Dark Gallery** (neutral
charcoal hall, spotlit plates, wall-label type): judged handsome but closest to the old world, risking reading
as "the same museum minus the bezel."

**Where the mockups live.** The archive repo, `museum/design/2026-07-identity-pass/` (commit `288dd17`) —
three lobby directions for comparison, plus the other three views carried through in B. The earlier structural
pass, `museum/design/2026-07-visual-pass/` (commit `932d1f0`), is **not** superseded: its structures (vault-
directory floors, strip-chart recorder, channel-flip comparison, two-chamber specimen cases) were praised and
survive unchanged — only the container language was replaced. `museum/design/` sits outside the generator's
manifest walk, so none of this can leak into the built museum.

**Two consequences, recorded as open — no outcome assumed:**

1. **All container animation was removed** (the hero breathe, the LED pulse, the badge blink were chassis
   language). Everything is static now except hover/flip states. The design model's position, standing unless
   the owner objects: if motion is missed, it should return as EXHIBIT behaviour, not container behaviour.
2. **✅ The dark twin LANDED — "Records Office Dark" is the shipped identity (archive, 2026-07-21).** The
   owner reads almost exclusively at night on a phone; the light "Records Office" won the design pass but the
   implementation resolved to its **dark** treatment. **Verified in the sibling archive** (`C:\Dev\!RobCo\_RobCo-Archive`,
   six museum commits `ab4ca16`→`4d0cac3`, synced to public HEAD `8d14073`): identity implementation with the
   **bezel removed entirely**, the **lobby rebuilt as the vault-directory ledger**, the growth page as a
   strip-chart recorder, a new **intent-vs-reality** exhibit, and the **bug room wired to `bugs/*/record.md`**.
   Design-verified at 360/412px, contrast recomputed, regenerated twice byte-identical, and a
   bare-clone-to-fresh-clone regeneration matched exactly. **Two things to record from the landing:**
   - **It found and fixed a real bug on the way in:** `bugs/` records were falling into "unclassified" and
     tripping the lobby's own integrity report — the museum was about to raise a **false alarm about itself**.
   - **One item is deliberately unfinished, and the page says so on its face:** the intent-vs-reality "reality"
     captures are still **working-tree screenshots, not release-pinned** — the page states this rather than
     pretending otherwise.

   _(Prior design-exploration context, now resolved:)_ that session was told
   plainly that "the light version is the right answer and here is the proof" is an acceptable outcome, and
   was asked to weigh a warm-but-dimmer lamplit-archive treatment against a true dark inversion, and to say
   whether a toggle is even warranted (a toggle is a maintenance surface and must earn its existence).

**A live implementation constraint, new because the old dark design never needed it: phosphor green is
unusable as text on light grounds — measured at 1.2:1.** It may only appear as graphic material or inside the
dark instrument windows.

- **⚠ The CLARITY VETO still binds (standing owner ruling): "in theme but not confusing."** Aesthetic never
  wins over legibility.
- **Mobile-first.** The owner is almost exclusively on mobile; anything designed desktop-first fails the
  actual test surface.
- **Accessibility: WCAG 2.1 AA is the standing target** — without sacrificing the identity above.
- **The right vehicle was a FABLE design pass, already run** for this identity comparison; execution against
  Direction B should still happen **BEFORE publication (P2)**, not after — a public exhibit is the wrong place
  to discover the visuals are flat.

**⬜ Design note (d) — the museum as FRONT DOOR: endorsed with hard limits, and THREE audiences not two
(knowledge-architecture audit R10, findings J + K, 2026-07-21).** The museum **can** be the human front door to
history, releases, bugs, visual evolution and _why_, and a navigation shell pointing at current surfaces. It
**cannot** be the _sole_ front door to current operations. The sound model the audit endorses: **museum =
historical, release-pinned; the private queue view (L) = what's next, continuously current; the Atlas (I) =
what exists and what's assured, current-baseline and degraded when stale; rules + library = AI implementation
context.** Two hard constraints: **every museum detail page and every search result must expose its
release/commit baseline** — otherwise search extracts a past statement without its historical frame (the same
provenance rule P3 enforces for the AI extract, applied to the human view); and the release dependency stays
**strictly one-way** — a completed release may _trigger_ regeneration, but a failed museum build may leave the
museum visibly stale and must **never** block, undo, or delay a release. **What the museum must NOT swallow:**
the live queue, the current rules or code map, orchestrator memory, private external-control state (L), the
Atlas's uncovered/attack-map view, or the AI-facing extract (P3). **The three audiences, because publication
creates a third:** disposable AI sessions (need compact, deterministic, status-bearing, fail-closed facts —
the P3 extract), the owner (needs visual navigation + current decisions, on a phone), and public readers (need
sanitised, release-pinned history — P2). The recorded conflicts: **museum HTML is valuable to humans and
actively harmful as AI context** (why P3 reads the manifest, never the ~190 MB HTML), and **the owner may see
private plans and attack surfaces that public output must never carry**. The audit's own scorecard, recorded
honestly: this project is **not** fooling itself where it plans one source with separate generated views (L,
P3) — but it **is** fooling itself in two places worth fixing: calling a ~1,300-line `QUEUE.md` "phone-readable"
(L is the answer, not the label), and treating a ~348 KB `ARCHITECTURE.md` as an appropriate universal entry
point for _either_ audience (finding A).

**⬜ Design note (e) — the museum AUDIT plan: Claude first, external second, Gemini not (owner, 2026-07-21).**
The owner asked _"maybe claude model audits instead of gpt? maybe gpt and gemini ? and claude ?"_ **Decision:
a Claude session audits FIRST, external review SECOND, Gemini not at all for now.** The reasoning, recorded so
it isn't re-litigated:

- **Claude first, because it can EXECUTE.** A Claude session can audit the archive immediately — no access
  negotiation, no privacy decision, no memory exposure — and unlike GPT it can _run_ the generator, do the
  fresh-clone and bare-clone reproducibility checks, and render the site and look at it. **Given that every bug
  found this week only surfaced when something was actually run, that matters.**
- **The catch, recorded honestly:** a Claude session auditing work done by Claude sessions has **correlated
  blind spots** — strong on _"is this correct"_, weak on _"what did we all collectively fail to consider."_ A
  clean result from it is therefore **weak evidence**, which is exactly why external review comes second.
- **External review is worth buying only AFTER the internal pass** — at that point it purchases genuine
  independence rather than a second opinion on execution.
- **Gemini is excluded for now:** on the DeepSeek question it answered a workflow the project does not have
  (item G's rejected-proposal specimen). Two proven lineages (Claude + one external) is enough; a third mostly
  costs owner copy-paste.

**⚠ The BLOCKER on external access — an open owner-decision.** GPT's connector returned **404 on the private
archive** because the GitHub App's repo allow-list excludes it. Granting access is a one-time reversible
settings change — **but the archive contains `memory/`**, which is precisely why museum publication (P2) was
gated on a memory audit-and-split. Three options were put to the owner:

1. Grant access to the **whole archive** — best audit, but **memory is exposed**.
2. **★ Do the memory split FIRST, then grant access (Dispatch's recommendation)** — it is _already_ a queued
   publication prerequisite (P2), so it is work needed anyway, pulled forward; it unblocks the audit **and**
   publication together.
3. A **scoped throwaway repo** with just `museum/`, `bugs/` and the generator — fastest, no exposure, **but**
   GPT then cannot check how the museum relates to the archive it is built from, and _that relationship is
   where the bugs have been_.

**Awaiting the owner's call between these three; do not proceed with external access until then.**

**P1. 🔄 Museum reproducibility — a sub-program.** Three sessions have shipped fixes to the archive's `main`;
a fourth is in flight.

- **✅ Shipped — the CRLF/LF page-renaming bug (`2f4848c`, `5bc7137`, `aa15e9a`).** The machine's SYSTEM git
  config has `core.autocrlf=true`, so a fresh clone checked out every text file as CRLF while the generator
  writes LF. Because doc pages are named by a hash of their content, that **renamed every doc page** on a
  fresh regeneration. Fixed with a `.gitattributes` forcing `eol=lf` plus `sync.ps1` writing LF at the
  source.
- **✅ Shipped — the README.txt leak (`76c1970`).** `generate.mjs` walked the filesystem directly, so a
  gitignored `README.txt` got picked up and published anyway. Fixed by walking `git ls-files` instead of
  disk. Artifact count corrected 705 → 704.
- **🔄 IN FLIGHT (archive session `local_68504e25`, resumed after hitting the session limit).** Uncommitted
  changes sit in the archive's working tree as of `main` at `76c1970` — **no commit exists for this yet.**
  The work: replace content-hash doc-page URLs with **path-based** ones so an address is stable across
  content edits. Two things ride along:
  - **A redirect ledger, mined once from this repo's own git history, because the window to do it is
    closing.** Across every commit that touched `museum/site/docs/*.html`, **306 distinct hash-named pages
    have existed; 62 no longer exist** and are recoverable only by walking history. A normal build then
    writes an HTML redirect stub at each recorded old address (chosen over Cloudflare's native `_redirects`
    so the museum stays openable straight off disk).
  - **A thumbnail-render-nondeterminism finding, sidestepped rather than root-caused.** ~11–13 of 28
    thumbnail PNGs come out with differing bytes on every fresh regeneration (suspected Chromium PNG
    re-encode jitter). The fix reuses the previous build's committed thumbnail whenever one exists.

- **⬜ Rename permanence — an explicit alias map + a build-time vanished-path check (new, 2026-07-20).** The
  path-based-URL work fixes addresses moving on a content EDIT; it deliberately left alone what happens when
  a document is later RENAMED. The owner asked whether to widen it. **Answer: yes, but not by the obvious
  route.**

  **Why NOT automatic rename detection — direct evidence from this same repo.** The in-flight session's own
  redirect-ledger mining recovered only 305 of 389 historical addresses by walking git history, because
  git's content-similarity rename detection kept pairing unrelated pages as renames. **A 22% undercount,
  and it failed silently.**

  **The design — extend the SAME redirect ledger already being built (Protocol 22).** One committed source
  of truth, three entry states: **active**, **alias** (an old address recorded at rename time, written by a
  human/session, never inferred), and **deleted** (marked genuinely gone, with a reason).

  **The build-time check.** Diff the current generated `museum/site/docs/` tree against the **previous
  commit's** tree (`git show HEAD:museum/site/docs/`) at generate time. Any path present before and absent
  now, with no matching alias and no matching deleted-entry, prints a loud warning. Git itself is the
  "previously known paths" record.

  **Ritual, not gate — respected.** Warns to stdout; never blocks `node museum/generate.mjs`.

  **Why it's not urgent, and when it becomes urgent.** A broken internal link before publication is cheap;
  it matters far more AFTER publication. So: queued behind P1's in-flight work, and should land before P2 — a
  soft prerequisite.

  **Done means:** a rename recorded in the ledger resolves old→new automatically; a rename NOT recorded is
  caught loudly by the build-time git-diff check; a genuine deletion is distinguishable from an unrecorded
  rename by its own ledger entry.

- **⬜ The outstanding `file://` redirect click-test (new, 2026-07-20).** The redirect stubs were verified
  over HTTP but never actually clicked open from a real `file://` location. Small, but "opens correctly from
  disk" is the entire reason HTML stubs were chosen over a host-specific `_redirects` file. Close it with a
  real `file://` open-and-click pass once a session has a controllable browser, before or alongside P2.

**P2. ⬜ Museum publication — owner-decided this session, not yet built.**

- **Timing, locked:** after the 2.8.5 release, before 2.9.0.
- **A brand-new public repo, `Robco-Exhibit`, built from generated output only.** The private archive can
  **never** be made public — its git history retains the memory files regardless of any later deletion.
- **Cloudflare Pages, never GitHub Pages — the reasoning is load-bearing.** A GitHub project site shares the
  `zerckzzyHD.github.io` origin, which would put the museum in the same **browser origin and localStorage**
  as the live app — and the archive holds executable HTML prototypes that could read or overwrite the live
  campaign. Cloudflare serves from its own domain, so the hazard doesn't exist there.
- **Owner's real name substituted with `zerckzzy` throughout generation, with a fail-closed guard** — plus
  credential/token-pattern scanning, an approved publication diff, and link validation run **after**
  substitution.
- **A verified-then-exposed sequence, not verify-after-push.** Push the exact commit to a private target
  first, verify it there, and only expose that same already-verified commit publicly.
- **The output is not self-contained** — thousands of references inside `museum/site/` point at mockup images
  living in `planning/`. Validating links only proves something once the public tree is generated standalone
  with the private archive unreachable.
- **The owner is owed a step-by-step publication guide when this is actually attempted.**

**P3. ⬜ Museum as an AI-facing resource — DESIGN ONLY, do not build (new, 2026-07-21, owner's idea).** The
museum shouldn't just be a thing humans browse; a session should get use out of it the way it gets use out
of the library. **The library describes what the code IS (current state); the museum records what was
TRIED, REJECTED, and LEARNED.** For a disposable agent waking with no history, that second category is
arguably the higher-value one, because the most expensive session failure isn't bad code — it's confidently
re-proposing something already killed for good reasons.

**The hazard is the whole design problem: the museum is HISTORY.** It deliberately contains statements that
were true then and are false now. So the guard is **PROVENANCE, not permission**: every fact an agent can
reach must carry its status, and it must be structurally impossible to serve an unmarked one.

**Two constraints already committed to the owner:**

- **Sessions must NOT read the generated HTML** (~190 MB). The agent-facing extract comes off the internal
  manifest — one source, two views, the identical ruling as `QUEUE.md`/L.
- **Sessions read the PRIVATE source, never the published exhibit** — the public one is name-substituted, so
  a session reading it would be reading a subtly false record of its own history.

**Critical evaluation — the better version:**

- **Derive status from an explicit supersession/rejection LINK graph, not a remembered flag.** An entry is
  _superseded_ iff something later carries a `supersedes:` link to it; _rejected_ iff marked so at creation
  (with its reason); _current_ iff nothing supersedes it. The extract carries the links, so an agent reading
  a rejected design can follow "…but see X, which revived part of it."
- **Fail CLOSED on unknown status.** An undeterminable entry resolves to "unverified history, treat as
  past-state," never to "current."
- **Every non-current entry MUST carry a `why`, enforced at build (fail the build if missing).**

**⚠ CORRECTION — a real logic defect in the model above, from the knowledge-architecture audit (R10, finding
H, 2026-07-21). Fix this before P3 is built.** "_current_ iff nothing supersedes it" and "fail CLOSED on
unknown" **contradict each other**: in an incomplete link graph, "no supersession edge recorded" is
indistinguishable from "genuinely current" — so the rule as written is **current-by-absence wearing a
fail-closed label**, the precise trap fail-closed is supposed to prevent. The corrected four-state model to
build: an entry is **`superseded`** when a supersession link points at it; **`rejected`/`closed`** when
explicitly marked so at creation (with its reason); **`current-at-baseline` ONLY when positively affirmed by a
current-state authority** (a present-tense source vouches for it) — never merely because no edge was found;
otherwise **`unverified history`**. The auditor's stronger, simpler option, recorded so it isn't lost: if the
agent-facing extract never actually needs to call a museum fact _current_, **treat the entire museum as
historical** — then "current" is not a state the museum can claim at all, and the ambiguity cannot arise.

**Where it sits.** It **depends on P1** (stable document identity). It is **independent of P2** and should
NOT wait on it: the agent value is immediate and reads the private source. So: **after P1, alongside/
independent of P2.** It touches the archive's `museum/generate.mjs` — **a separate session; this is design
only.**

**Done means (when eventually built):** an agent-facing extract is generated off the museum's internal
manifest, every entry resolves to a status derived from an explicit link graph with fail-closed defaults, no
non-current entry ships without its `why`, and a session reading it cannot mistake a buried past-state fact
for current guidance.

**What P depends on.** The archive repo and its folder structure (exists, Protocol 48). P1
(reproducibility), the rename-permanence work, and the `file://` click-test should finish, and ideally J
(below) should exist and pass, before P2 is attempted. ✅ **The App Check debug-token blocker on
publication is CLEARED (2026-07-20)** — see the App Check entry in "Closed / off the board" below.

**Done means (P core, met):** a generator produces the museum from the archive's structure, its first run
backfilled all shipped versions plus the graveyard, each release gets one frozen hand-written account, and
the whole thing is a release-time ritual that can never block a release. **Done means (P1, in flight):** a
fresh clone regenerates the museum byte-identical, with old hash addresses still resolving. **Done means
(P2, not started):** `Robco-Exhibit` is live and correct on Cloudflare Pages, verified before exposure.

### J. ⬜ Museum reproducibility CI — turn three sessions' hand-proof into a standing gate (depends on P1)

**What it is.** A GitHub Action on the archive repo that, on push, clones fresh onto a machine that has
never seen this project's setup, regenerates the museum, and **FAILS if the output differs** from what's
committed.

**Why it belongs in the queue.** Museum reproducibility is, right now, a property that **three sessions
proved by hand this week**. A property only ever proven by hand can silently stop being true, and nobody
finds out until publication day — the wrong day. This converts the hand-proof into a standing guard.

**The known objection, recorded honestly.** A Linux-only CI runner was already a real mistake once here. This
is different in kind: the **point** of this CI is the platform mismatch — it clones fresh and compares its
OWN regenerated output against output generated on Windows and committed. A pass proves the two platforms
**agree**.

**What it does NOT cover.** All reproducibility proof to date is from one machine (same OS, Node, git,
Chromium). Node-version and Chromium-build differences are unverified. And generation depends on the sibling
**app repo** being checked out at the right ref — a dependency outside the archive this CI would also need to
resolve.

**What it depends on.** P1 (museum reproducibility) should be finished — no point gating on a regeneration
path that's still being actively changed.

**Done means:** a fresh-clone regeneration runs in CI on every push to the archive, fails loudly on any byte
difference from the committed `museum/site/`, and the coverage gaps above are stated in the workflow's own
comments.

### P4. ⬜ The bug-record obligation — DESIGN DECIDED (owner, 2026-07-21), do not build yet

**What it is.** The rule that a fixed defect leaves a durable **record** — the raw material the museum's bug
room (P) and the AI-facing extract (P3) are built from. Its shape was decided in conversation tonight, over
three rounds of the owner sharpening it, and is recorded here per Protocol 50 because it lived only in that
conversation.

- **Purpose is KNOWLEDGE CAPTURE FOR SESSIONS, not filling an exhibit.** The consequence is the whole point:
  **record a defect that TAUGHT something even if it is visually dull** — an exhibit-first framing would skip
  exactly the unglamorous, high-lesson bugs a future session most needs.
- **Record always. Curate ruthlessly.** `exhibited` is demoted to a **display concern only**; every record
  reaches the AI extract regardless of whether it's ever shown to a human.
- **Enforcement: ONE line folded into the EXISTING pre-push nudge** — it names commits that look like defect
  fixes but carry no record. **Net new mechanisms: ZERO.** This overrode Dispatch's instinct to build a
  separate check, on the owner's reasoning: reuse existing enforcement rather than add surface (the same call
  that deleted Suite 243 in favour of Suite 220). The earlier idea of a separate release-time mechanism is
  **dropped**.
- **Cadence — one source, two speeds.** **Records are live the moment they are written**, and sessions read
  the **records**, not the generated museum. The **museum regenerates only at release, strictly AFTER the
  release tag exists** — which converts "the museum must never block a release" from a written rule into an
  **ordering fact** (it structurally cannot run before the tag it pins to). So nothing needs maintaining
  between releases, yet the knowledge is available immediately.
- **⭐ Notify on SUCCESS as well as failure (owner overruled Dispatch).** The owner's reasoning is better than
  Dispatch's silence-only-on-failure default: **a success notice IS the liveness signal**, so the separate
  "proof it ran" stamp Dispatch was going to add becomes unnecessary — one mechanism, not two.
  Silence-only-on-failure was rejected because **a check that only ever speaks on failure is
  indistinguishable from one that has silently stopped running** — the exact failure mode of the growth chart
  and the inert cache guard this project has already been burned by.

**Where it sits.** It is the input side of P (bug room) and P3 (extract), and its enforcement rides the
Protocol 48/50 pre-push nudge that already exists — so it depends on nothing new and is buildable whenever the
museum records get their first-class schema. **Design only for now; do not build.**

**Done means (when built):** a fixed-defect commit that carries no record is named by the existing pre-push
nudge; every record — dull or not — reaches the AI extract; `exhibited` controls only display; museum
regeneration runs after the release tag and never blocks a release; and the nudge speaks on success as well as
failure.

---

# ⬜ 2.9.0 — Gameplay + The OS Round

This is the big one — a large, multi-part round covering actual gameplay systems, ambient world life,
cloud/account features, and the "it's a real operating system" philosophy. Because it's large, **the
planning machinery runs at the FRONT of the round, before any building.**

## Planning first (in this order)

This is deliberate planning, not busywork — the round touches gameplay and the core OS at once, so planning
it up front prevents four workstreams building four inconsistent things.

1. **Diegetic audit → the HOUSE STANDARD.** Goes first because it derives the in-fiction standard everything
   else conforms to: the canonical voice and register, the phosphor palette rules, and a locked terminology
   table. It walks every screen and state (loading, empty, error, offline, success) looking for anywhere the
   terminal fiction breaks and reads like a modern web app. Also folds in a repo file-name overhaul where
   safe. Two minor silent-failure items from the warning-surface inventory fold into this audit's error-state
   walk rather than earning units of their own: a corrupt save slot or corrupt chat history currently just
   vanishes with no explanation (render a visible "record unreadable" row instead); and a failed cloud
   key-sync is silent (one line telling the user the key relay was unreachable).
2. Then, in parallel: **the content/data audit** (every database across both games checked for completeness,
   canon accuracy, and consistency), **the mobile/responsive audit** (every panel at phone and desktop
   widths, plus recording the supported browser/PWA boundary), **the UI-consistency audit** (cross-panel
   structural/style consistency plus the gate guards to enforce it), **the cloud audit** (verify the save
   captures every field and survives a full round-trip, plus a new "evaluate every feature for cloud impact"
   rule), and **a trust-boundary audit** (NEW, 2026-07-14) — a scoped inventory of everything that crosses
   into or out of the app and what authority it's given: imported saves, user-typed text that reaches the
   screen, AI/OCR output, external links, where the bring-your-own Gemini API key is stored, and what the
   service worker fetches. **One named deliverable is the external-network / CDN chokepoint guard** (moved
   here from the save-integrity pass because its correct rule can only be defined by this audit's judgment
   call about what's core/offline-critical versus intentionally online). Its sharpened invariant: _no
   external network resource may become NECESSARY for the core application's install, boot, offline reload,
   or local-save operation_ — which permits the optional online-only cloud boundary while stopping a future
   font, script, module, stylesheet, or asset from silently entering the offline-critical path. **Done
   means:** a finite decision recorded for every boundary crossing, and a guard for any one worth making
   permanent.
   **Attached to the UI-consistency audit — the CSS cascade cleanup (was unversioned; placed 2026-07-21):**
   replace the stylesheets' ancestor-selector specificity bumps with native CSS `@layer`, which expresses
   the same precedence declaratively. It rides ALONG with this audit rather than standing alone because the
   real risk in the work is opening the whole cascade at once (high blast radius for a pure refactor) — so it
   belongs on a pass already opening the stylesheets, not as its own high-blast-radius refactor. Attached
   here, not floating in the round.
3. Then ideation: **a capability ideation pass** (original RobCo-native ideas derived from real
   device/browser capabilities) and **an AI-feature evaluation pass** (which AI features can be made native,
   each scored on offline behavior, grounding, cost, injection-resistance, and fit).
4. Then **synthesis** — reconcile all of the above into one integrated, dependency-ordered build backlog.
5. Then **parallelization** — split that backlog into independent workstreams.

## Then, before any new OS service: the hardening gate

**This is not a second roadmap — it is the same 2.9.0 round seen from the engineering side.** Every headline
OS feature in this round — the CLI, the DIR filesystem, the Peripheral Bus, the Distribution Network — is a
**new SERVICE that renders**, and the boundary those services would plug into already carries real, measured
debt. Build the services first and you don't carry the debt forward — **you multiply it.** So a short
hardening gate runs before any of them lands. The work is subtractive.

**What the hardening gate must close (from the architecture review):**

- **The UI↔services dependency cycles.** The render layer had quietly become a _second state manager_. ✅
  **UPDATE (2026-07-18):** the ENFORCEMENT half already shipped in the U1–U12 capstone — a static gate (Suite 236) now **blocks any NEW cross-layer violation**, and the existing debt is baselined at 20 render→save +
  26 service→view + 0 registry. What this gate item still owes is the **burn-down**: actually invert the
  baselined edges (services emit, the UI subscribes).
- **Bootstrap isolation.** ~45 boot-phase calls sit under ONE outer try/catch with zero per-phase isolation.
  Add per-phase guards, classified fatal-versus-degradable. Fail loudly, never silently.
- **Event-bus hardening.** `RobcoEvents` has no `off` / `once` / dedup and swallows listener errors silently.
  Harden it before the OS round widens it; a thrown handler must not prevent unrelated handlers from running.
- **The one escaped interval.** Exactly ONE stray `setInterval` escaped the AmbientRuntime heartbeat. Fold it
  in.
- **An AI state-apply failure must be surfaced to the user (Protocol 24).** Today, when the AI's state update
  fails to apply, the failure is console-only: the user reads the story, believes the sync happened, and the
  campaign silently didn't change. One clear line in the transcript closes it.

**Post-deploy TRUTH — the release-integrity gap this round also closes.** Everything the project verifies
today answers _"is the repository correct?"_ **Not one check answers _"did the user receive it?"_** The two
can disagree while everything stays green — and they already have: a staging service worker silently failed
to install because `sw.js` precached an `index.html` that redirects, so "REBOOT TERMINAL" did nothing and
users sat on stale code **under a green gate.** The hardening gate turns that one already-proven failure mode
into an automated post-deploy check — and when it catches a service-worker install/update failure, the
**user** must be shown it, not just a log.

**⭐ Why the order is load-bearing (VERIFIED CORRECT — do not reorder).** Every headline OS feature is a new
service that renders. Build the services first and each one lands on the debt and **multiplies it**. Burn the
baseline down FIRST and the services plug into a clean seam. The hardening gate MUST sit before any OS
service.

## Also in this round: ✅ APP CHECK — CLOSED (both halves done, 2026-07-20)

Enforcement has been live since 2026-07-01; the owner deleted all three debug tokens in the Firebase console
on 2026-07-20; the Museum-publication blocker is cleared. → [full account](QUEUE_LOG.md#appcheck)

---

## Then the build

### WASTELAND UPLINK — one ambient engine

**What it is.** A single ambient-life engine that replaces four separate half-ideas:

- **The radio**, promoted from today's single synth bed to a real thing — the engine's shared bulletin bank
  is what the DJ reads.
- **Random world-map encounter rolls** — they consume the engine's shared seeded-roll infrastructure.
- **INTERCEPT** — procedural distress signals / found logs, as the optional online AI-augment layer on top of
  a static, pre-written broadcast bank.
- **Remote Transmissions** — the online push layer, letting you drop holotapes, bulletins, or events to the
  terminal from the cloud without a redeploy.

**Day/night cycling is CUT.** It was cut for accuracy, reinstated with rad-storm weather, then cut again. The
final decision is out. (If it ever comes back, the "dusk/dawn that actually lands" idea comes back with it.)

**Hard invariant.** This engine can never touch campaign stats or write to a save. It is atmosphere, not
mechanics. One kill-switch turns the whole thing off, and it writes zero durable state.

**Done means:** the four features are one engine, behind one kill-switch, writing nothing.

### The gameplay + immersion feature set (the "Round 3" ideas — all 15)

A curated, combined list of gameplay and immersion features, all built on the existing New Vegas and Fallout
3 games, all free / bring-your-own-AI-key, all deterministic-native where possible:

1. **Radio tuner overhaul.** A real tuner with several stations, each its own procedural music bed plus
   scripted DJ bulletins and news read from local data (no AI), a tuning dial with static, and station
   memory. The zero-byte-synth rule stays — no audio files ship.
2. **V.A.T.S. full turn-based combat resolver.** The one-shot calculator becomes a deterministic, seeded turn
   loop against a bestiary enemy — a tappable body silhouette with per-region hit chance and action-point
   cost, fully offline.
3. **Build planner / respec station.** A guided S.P.E.C.I.A.L. + skills + perks tool enforcing level budgets,
   perk prerequisites and caps; side-by-side comparison; shareable build codes.
4. **World-map exploration overhaul.** A full exploration journal — discovered/visited/cleared states,
   deterministic travel time and encounter rolls, per-location detail cards, region completion percentages.
5. **Faction consequence engine.** Crossing Vilified or Idolized thresholds triggers real deterministic
   consequences (vendors lock/unlock, bounty hunters, map markers, status effects), with a preview before you
   commit.
6. **Quest tracker overhaul.** Per-quest objective checklists, active/completed/failed states, branching
   outcomes, quest-giver and location links, a "current objective" line, a sortable journal.
7. **Crafting & workbench stations.** Weapon/armor mods, ammo crafting, chem/food cooking — each recipe gated
   by components, skill, and station, deterministic and confirm-gated. Sits on the inventory-panel foundation.
8. **Companion / squad management.** Companion cards (perks, special ability, affinity/loyalty, Nerve bonus, a
   tactics toggle, a quick-command wheel). Game-agnostic data model.
9. **Geographic per-game map.** Replace the abstract world grid with a stylized, pannable map of the actual
   region — the Mojave versus the Capital Wasteland — with location pins, fog of war, fast-travel routes. Built
   per game; adding a new game's map must be a clean integration path.
10. **Karma & reputation timeline.** A visual history of karma/reputation changes and their causes. The karma
    system must work fully, and there must be a **native** way to log _why_ reputation changed on a manual
    update (never via the AI) — the "I keep not being able to use a native feature without the AI" complaint,
    fixed.
11. **Loadout / equipment manager.** Named saved loadouts, quick-swap, computed weight / DT / DPS, comparison.
    Sits on the inventory-panel foundation.
12. **Aid & consumables manager.** Active chem effects and durations, addiction risk, light food/water
    tracking. Merges with the partial aid tracking that already exists; not built parallel.
13. **Combat log / kill feed.** A running log of kills, crits, and damage, aggregated into the Overseer's Log.
    Manual entry with autocomplete from the registry — native, no AI.
14. **Perk planner / build-up timeline.** Plan perk picks across all levels (per-game cadence), with
    prerequisite unlocks.
15. **Dialogue / speech-check helper.** Given your Speech, Barter, and skills, show which dialogue checks
    you'd pass. Canon-sourced where the data exists.

**The foundation these sit on — the inventory panel + loadout overhaul.** Before crafting (7) and the loadout
manager (11) can land, the inventory panel is rebuilt from a flat list into a sort/search toolbar, a per-row
inspect drawer, an in-panel loadout header, and per-row equip — with long lists virtualized. The underlying
inventory data stays untouched; everything is derived at display time. **⚠ Ordering note (2026-07-18): the
deferred U8 "virtualize long lists" perf win (C2) lands HERE, not as a near-term standalone** — this rebuild
replaces the list-rendering path anyway, so virtualizing today's flat list first would be thrown away
(Protocol 22 double-build).

**Bound in here — wire manual inventory changes into the event log (was unversioned; placed 2026-07-21).**
Manual inventory changes don't reach the Terminal Record (`state.eventLog`). **Verified against
`js/ui/ui-render-inventory.js` (2026-07-18):** adding an item, the quantity ± stepper (`adjItemQty`, which
emits nothing), and equip all fire animation/echo handlers only — while craft, scrap, trade, sleep,
level-up, kills and caps DO log. The fix is three `_logEvent` calls at the existing `addItem` / `adjItemQty`
/ `toggleEquipItem` write points. It binds here because this rebuild **and** the Terminal Record
consolidation (in "The OS round proper" below) both already establish native, manual, no-AI logging — so it
folds into that work rather than earning a standalone unit.

**One combined ENCOUNTER flow.** V.A.T.S., threat assessment, the combat log, and looting are one guided loop
reachable from a single ENCOUNTER entry point. The pieces stay independently reachable for edge cases.

**One map, not three — and it starts from COORDINATES, not a node graph.** ⚠ **AMENDED 2026-07-13** (the 6-AI
map remake — `planning/2.8.5/plans/MAP_REMAKE_REPLIES.md`): a node graph is the wrong ROOT; you cannot iterate
a graph into a surface. **Start from the coordinate space instead:** every settlement, pin, route, and the
player position answers "where is this in Mojave space?" The coordinate system is the product; the artwork is
one visualization. Simplify the VIEW, never the MODEL. Geometry is authored from `fallout.wiki` (Protocol 3) —
an original drawing, never a trace.

**Two big immersion additions folded in here:** an **emergent CRT "condition"** (the screen develops
character/wear — must be toggleable off) and the **hacking minigame** — the iconic RobCo word-guess hack
(seeded puzzle, likeness scoring, attempts and lockout, fully offline). The payoff of a successful hack is
that it **unlocks the Diagnostic Shell** — already built and shipped; the minigame is the diegetic gate in
front of it, the one piece not yet built.

**Deliberately NOT in this set:** the **holotape archive / audio logs** is dropped (too many, a feature few
would use). A **survival / hardcore tracker** is set aside as a possible standalone future. An achievements
tracker, an NPC codex, and an encounter/loot generator were removed at the owner's direction.

### The OS round proper — "it's an operating system, not a character sheet"

**What it is.** Where the fiction stops being decoration and becomes the actual interaction model. Much of the
underlying architecture already shipped in 2.8.0. What remains:

- **DIR becomes a real filesystem.** The bezel's DIR key formally becomes a browsable filesystem home —
  folders for the system, archives, intercepts, manuals, user data, and logs. Rule of thumb: if you _read_ it,
  it's a file under DIR; if you _operate_ it, it's its own surface.
- **A real CLI command prompt.** A genuine typed command line that looks like a proper desktop terminal on
  desktop and adapts to touch on mobile. It draws over everything, persists across tabs, and is
  resizable/closable. It extends the command tokens and quick-log grammar that already shipped, full of real
  utility plus power-user features (history, tab-completion, aliases, command chaining) plus fun/diegetic
  commands. The HACK command launches the hacking minigame. Touch and bezel paths stay first-class.
- **A Peripheral Bus** — external connected devices as a clean model: Pip-Boy sync, radio receiver, holotape
  reader, environmental sensor, orientation/gyro sensor, printer, and the already-shipped screenshot OCR
  reframed as an "optical scanner" (must NOT remove it from the composer where it lives today).
- **A Distribution Network and Data Cartridges** — one channel through which live content and updates arrive.
  Ships offline/local by default; the live channel is optional and kill-switch-gated.
- **Macros** — optional local automation riding on the command language.
- **Schematic-mode formalization** — the flat/dense view from 2.8.5 made a first-class OS concept on every
  tab.
- **Diegetic renames — a per-term judgment call, not a blanket sweep (owner ruling).** A themed rename only
  ships if the in-world word is immediately understandable at a glance. If a user would have to stop and think
  "what is this screen?", the rename is a regression and does not ship — **clarity outranks flavor.**
  `inventory → manifest` failed this test and is explicitly vetoed. Themed naming is still wanted where it's
  obvious (boot sequence, status words, hardware/board names, error framing, the machine's own voice). Where a
  term is ambiguous but the flavor is worth keeping, the Module Bay pattern (Protocol 25) rides the real label
  along as a visible sub-label. Nuance: OPERATIONS already _displays_ "CARGO MANIFEST" as a board title —
  that stays; what's banned is retiring the plain word "inventory" as the concept's navigable name.
- **Command-list cleanup** — folded in here because the OS round rebuilds the command language anyway.
- **Two consolidations that already partly shipped and get finished here:** the **Terminal Record** (one
  canonical campaign history with multiple views) and the **System Status** home (one machine-health surface).
- **The Module Bay grows** into the full "install boards / load expansion packs" system, with a **Signal
  Scanner** verb and **RobCo Manuals** (HELP opens an in-universe manual) as the two new adds.

**A guardrail worth remembering — the four metaphor lanes.** The **launcher/command palette** runs tools; the
**filesystem (DIR)** is the diegetic skin over navigation and the home for documents/logs; the **Module Bay**
enables and configures capabilities (the settings replacement); **Hardware Life** is the machine's own living
self-history.

**Done means:** the terminal has a navigable filesystem, a real command prompt, a peripheral model, a
live-content channel, and a consistent in-fiction command language.

### Hardware Life — the machine remembers itself

**What it is.** A whole immersion theme: the terminal is a persistent piece of hardware with its own past and
physical life, independent of any campaign. Almost all fabricated atmosphere, no gameplay effect. Parts
already shipped (boot flavors, the Overseer's Log, statistics, the shutdown ritual); the rest, roughly by
charm-per-effort:

- **First:** randomized BIOS-style boot codes (a watchable POST sequence), a hardware-sound layer, and
  self-acknowledgment chatter ("idle detected, reducing phosphor wear").
- **Then:** fabricated maintenance logs and error history (with in-world dates), a cosmetic RobCo Diagnostics
  self-test, RobCo service bulletins and rare in-world ads, and chained transmissions (SIGNAL LOST → later →
  SIGNAL RESTORED).
- **Later:** the terminal condition (a "well maintained / field repaired / vault stock" character — the same
  system as the emergent CRT condition), more screensaver/attract variants, and the filesystem integration.
- **Personality touches:** cosmetic "known quirks" notes — surplus-hardware flavor, entirely cosmetic.

**Hard invariant.** These features may keep their own small meta-store but must **never** touch game saves or
state; fake diagnostics never gate anything real; everything is toggleable and reduced-motion-safe.

### The free-Firebase cloud / account cluster

**What it is.** A set of cloud and account features built entirely on Firebase's free tier — no paid backend,
ever:

- **Cross-device settings sync** — device preferences follow you across devices via a small per-user cloud
  document, with genuinely device-specific prefs kept local.
- **Real-time co-op campaign** — the marquee one. You and your brother both editing one shared campaign live.
  Achievable free with real-time listeners; the hard part is conflict handling, which needs its own planning
  pass.
- **A cross-campaign operator record** — an account-level ledger persisting beyond any single save.
- **A shareable read-only campaign snapshot** — publish a snapshot others can view via a share link (careful
  public-read rules, no personal data, opt-in per share).
- **A preset / loadout / macro library** stored to your account.
- **Continue-on-another-device** — a "last active campaign" pointer.
- **Dated / seasonal broadcasts** that unlock on a date (the client checks a timestamp, no server scheduler).
- **An in-app feedback / bug-report channel** writing to a private owner-only collection.
- **Surfacing the existing cloud-save button** more prominently, especially on mobile.

**Hard invariant.** Free tier only, everything client-side, manual cloud sync (never auto-push), additive
writes, no personal data synced. No server is needed — everything here, co-op included, is doable free and
client-side.

### The Round-2 deferred infrastructure & polish program

**What it is.** The backlog of infrastructure, polish, and feature work consciously deferred from earlier
rounds, gathered so nothing quietly rots. Some shipped already. What remains:

- **Full IndexedDB migration** — move _all_ persistence into IndexedDB as one durable layer, with a
  bulletproof, reversible migration. The first shadow-write slice shipped; the read path and storage-ceiling
  relief are still ahead. A foundational data-safety change, done as its own isolated, rollback-safe unit.
- **A migration test harness** — the exhaustive save-and-storage migration test coverage the above requires.
- **Full PWA offline shell** — the entire app and every native terminal working in airplane mode, with an
  offline indicator.
- **Cloud-save conflict resolution and version history** and **full backup export/import** (one file with
  everything, for disaster recovery).
- **A deep accessibility pass** and a **performance / list-virtualization pass**.
- **A native procedural flavor-text engine** — local seeded generators for ambient chatter, distress logs,
  radio bulletins, and encounter blurbs — "AI residue" made deterministic and offline.
- **A unified settings / profile hub** consolidating the scattered toggles, with export/import and
  reset-to-defaults.
- **A diegetic onboarding / first-run tour** — a guided, always-skippable intro. The "seen it" flag must live
  in real persistent state (cloud-synced where possible) so clearing the cache does **not** re-trigger it, and
  it establishes a standing "what's new" pass so every future feature gets surfaced to returning users.
- **A UX clarity pass** — audit the whole site for anything ambiguous and add inline in-world explanations
  (specifically: the Playthrough Type selector must explain what each type is).
- **A diagnostics export** — a local "diagnostic report" that never uploads unless you choose to share it.
- **Per-vendor stock data** — source each vendor's realistic inventory from the wiki so barter is constrained
  to what a vendor would actually carry.
- **The deferred half of per-game theming** — per-game framing/accent styling and a full game-styled
  save-manager layout.
- **A new-game-readiness audit** — audit the whole app so adding a new game is clean data + config, not a
  painful refactor. Run here so Fallout 4 (3.0) is a data-add, not a rewrite.
- **A per-game experience program** — make each game genuinely _feel_ different, all delivered as per-game
  data: distinct boot/POST flavor, radio stations, ambient/UI sounds, terminology and voice, unique panels,
  map, faction framing, CRT character, save styling, and a per-game start screen.
- **A per-game identity depth pass** — build New Vegas and Fallout 3 to a strong, distinct identity _before_
  Fallout 4 (NV: Caravan, the NCR/Legion/House rep web, the Strip, Traits, Mr. New Vegas radio, warm sunset;
  FO3: the Lincoln tracker, Vault 101, Galaxy News Radio, the Anchorage sim, a colder DC-green palette).
- **An on-site roadmap display** — a diegetic "upcoming transmissions" panel showing users a curated public
  view of what's coming.
- **The AI generative-residue features** — the AI, framed as the terminal's own intelligence, made native and
  always optional: INTERCEPT distress logs, radio DJ banter, TTS narration, area-scan encounter generation, an
  Overseer quest hook, a hacking taunt, screenshot-to-AI parsing, optional AI banter on barter and the medical
  scan. Each must degrade gracefully offline, never block boot, and never take authority over your state.
- **The held device capabilities** — gyro/CRT-tilt parallax (subtle, off by default), the share-target
  receiver, TTS audio logs, and ambient-light optic calibration. These slot into the Peripheral Bus.

**A cross-cutting sequencing note.** The command/tool launcher was redesigned early (in 2.8.0, the Tool Deck).
The remaining launcher work (grouping/categories, progressive disclosure, and the type-to-run command palette
as its own CLI) lands with the OS round.

---

# ⬜ Machine-family skin re-key — the one FO4-readiness refactor before 3.0

**What it is.** The single scoped refactor the skin-architecture extraction pass (item 4) named as the one
thing to do before Fallout 4. Today the entire ~2,000-line Pip-Boy shell CSS is reachable only through
`[data-game='FO3']` — it's keyed to the GAME. But a Pip-Boy isn't unique to Fallout 3: Fallout 4's device is
the Pip-Boy 3000 Mark IV (its identity literally declares `machine: 'pipboy-3000-mk4'`). This unit re-keys the
~278 Pip-Boy shell selectors in `css/60-fo3-pipboy.css` from `[data-game='FO3']` to a machine-family attribute
(`[data-machine='pipboy']`), and wires the already-declared-but-currently-unread `identity.machine` /
`structuralMode` fields onto `<html>` as that root attribute. Then Fallout 3 and Fallout 4 share the one
Pip-Boy body, and only their _true_ differences stay `[data-game]`-gated.

**Why it's small, and honestly scoped.** The extraction pass proved a new game's **reskin/data half is a clean
file-drop.** This unit is only the **re-body half**, and only if Fallout 4 takes the Pip-Boy body (which its
`machine` stub implies) — a flat-view Fallout 4 would need zero refactor. The whole unit: re-key one file's
selectors, write one root attribute from identity data, give Fallout 4's identity the re-body data it's missing
(pure data the existing game-agnostic stampers already consume), and add a guard test that the shell keys off
the machine attribute, not the game.

**Why it sits here.** It's Fallout 4-readiness work — the concrete input to the 3.0 new-game-readiness effort —
so it lands just before the Fallout 4 round, alongside the MANIFEST-density polish, both cleared before 3.0.

**Done means:** the Pip-Boy shell is reachable by any Pip-Boy machine, the dead `machine`/`structuralMode`
fields are wired to a real root attribute, and a gate test proves a second same-chassis game reuses the shell
without duplicating it.

---

# ⬜ MANIFEST density — the last FO3 board-polish item, deferred to just before 3.0

**What it is.** On the Fallout 3 Pip-Boy's cargo/MANIFEST board, the inventory list shows about **5.5 rows at
once** against the approved mockup's **6**. Purely cosmetic; nothing is unreachable or broken.

**Why it's not a quick fix.** The row height is already sitting on the Protocol 17 **28px tap-target floor**, so
closing the last half-row means a real layout change — reclaiming vertical space from elsewhere — not a CSS
nudge. More work than the payoff justifies right now.

**Why it sits here.** The owner's explicit call (2026-07-15): _"skip it for now but save it in queue right
before 3.0.0."_ Low-priority cosmetic; it waits until just before the Fallout 4 round.

**Done means:** the MANIFEST list shows a clean 6 rows at the mockup's density, with tap targets still at or
above the 28px floor.

---

# ⬜ 3.0 — Fallout 4

**What it is.** Full Fallout 4 support — its data, its content, its skin, and its custom panels, all built
**together** against real Fallout 4 data.

**Why it's one big drop, not incremental.** Fallout 4's systems differ enough (no traditional skills —
S.P.E.C.I.A.L. plus a perk chart only, deep weapon crafting, settlements, legendary effects) that the data, the
UI, and the panels need to be designed against each other. Its device form is the Pip-Boy 3000 Mark IV. Fallout
4 gets additional custom panels for its genuinely-new systems (settlements, the perk chart, power-armor frames,
legendary gear) on top of the shared dynamic set.

**Why Fallout 4 is "design-only" until now.** The engine already carries a Fallout 4 definition that proves the
multi-game abstraction works — but it's intentionally unreachable until the real data and content exist. When
Fallout 4 is first added but not yet populated, the preserved "no data yet" warning template fires on
selection.

## ⬜ Bundled with 3.0 — the native ES modules migration

**What it is.** Convert the app from global-scope `<script>` files to native `<script type="module">` with real
`import`/`export`. It rides **with** the Fallout 4 round:

- **(a) Why bundled with the third game.** Both the ES-modules migration and adding Fallout 4 **rewrite the
  same boot / load-order surface.** Doing them separately pays that cost and risk **twice**. Bundling means the
  boot surface is opened once.
- **(b) The payoff is ENFORCEMENT.** A module can only touch what it imports. That finally makes the layering
  rule (Protocol 23) **structurally enforced** rather than merely written and scanned for. This is also the
  retirement-rule keep-case (R2): the conformance baseline **must not be deleted in any trim until this lands.**
- **(c) It is NOT a build step.** Native `<script type="module">` needs **no bundler** — the repo stays the
  deployed artifact. "No build step" remains permanent project policy and must never be read as "no modules."
- **(d) Until it lands, the conformance baseline stays.** No trim may delete the architecture-conformance
  baseline until modules make the layering structural. This is the single explicit dependency between the
  near-term rules restructure and the 3.0 round.

**Why it sits here and not earlier.** It wants the boot surface open anyway (which 3.0 does), and its
enforcement payoff is most valuable right when a third game is multiplying the number of files that could
violate the layering.

**Done means:** the app boots from native ES modules with no bundler and no build step, the render→save /
service→render boundary is import-enforced, and the now-redundant static conformance baseline can finally be
retired under the retirement rule.

**After Fallout 4 ships:** a parity retrofit pass backports any gold-standard per-game ideas discovered while
building Fallout 4 back into New Vegas and Fallout 3.

**Done means:** Fallout 4 is a selectable, fully-built third machine.

---

# ⬜ After 3.0 — the recreation / wildcard "for fun" prompt

**What it is.** An open-ended, for-fun analysis exercise: pick existing features and imagine rebuilding each
from the ground up into the best possible version. Four tiers — Quick, Medium, Ambitious, and one Mega — each a
from-scratch reimagining of a _different existing_ feature.

**Why it's dead last.** By the owner's own placement — it's just for fun, and it runs after everything,
including the release. Analysis only.

---

# Unversioned — the standing rule (drawer currently EMPTY)

_This section is the home of a standing queue convention, kept even though it now holds zero items._

**THE RULE — nothing gets recorded without either a home or an explicit stated condition that would earn it
one.** A version/section IS a home; so is being bound to a named item. When an entry has neither yet, it MUST
carry an explicit reason it has no version AND the concrete condition that would earn it a slot. "Parked",
"someday", or "revisit later" with no stated condition is NOT acceptable — that is the vague drawer this rule
exists to forbid. The rule is mirrored into **Protocol 50** (which governs what gets written to the queue) so
it survives any future restructure of this file.

**The drawer is currently empty — and that is the rule working, not a gap.** The two items that used to live
here both carried explicit earn-conditions, which is exactly why they could be placed in minutes on
2026-07-21:

- **CSS cascade cleanup** (`@layer` refactor) → **2.9.0**, attached to the UI-consistency audit — its stated
  condition ("a pass already opening the cascade") was met there.
- **Wire manual inventory changes into the event log** → **2.9.0**, bound to the inventory-panel rebuild +
  Terminal Record consolidation — its stated condition ("a pass that establishes native no-AI logging") was
  met there.

Future unversioned items land here under the same rule, or they don't get recorded at all.

---

# Closed / off the board

_Finished or ruled out — listed briefly so they don't resurface as pending._

- **The New Vegas overhaul design audit** — ran during 2.8.0; its fixes shipped.
- **The NV test-save fixture** — shipped as the "load NV test campaign" tool in the Diagnostic Shell.
- **The AI → native + oversight audit** — it ran; it produced the 2.8.0 native conversions.
- **The save-import behavioral test and the Phase-0 foundations** — shipped in 2.8.0.
- **Main-revert cloud-save compatibility check** — done; the cutover was executed.
- **App Check — fully closed 2026-07-20.** Enforcement live since 2026-07-01; the owner deleted all three
  debug tokens in the Firebase console; the dead string was removed from the archive. The Museum-publication
  blocker is cleared. → [full account](QUEUE_LOG.md#appcheck)
- **Pop-up card standardization** — the design audit swept it; a test guards it.
- **Voice input** — sidelined (browser speech is finicky and real scope); on file as a future wildcard only.
- **Day/night cycle** — cut (see WASTELAND UPLINK above for the history).
- **Companion memory, the streaming two-phase narrator, Web Workers, and DLC map zones** — moved out to the
  Fallout 4 round (3.0).
- **Transactional comma-separated commands** — ruled out (owner, 2026-07-18). The current partial-success
  behavior is **correct**: if one of four comma-separated commands has a typo, the other three should still
  apply.
- **Consolidating the ~50 device-preference keys into one master key** — ruled out (owner, 2026-07-18). One
  master key **increases blast radius on a bad write**; the spread-out keys are the safer design.
- **Precaching the OCR engine** — ruled out (owner, 2026-07-18). The **lazy first-use fetch stays** —
  precaching Tesseract would bloat every install for a feature most sessions never touch.

---

_How this file is maintained: `QUEUE.md` is the canonical, in-repo, human-readable **queue** of record — the
single place the roadmap lives where a work session can actually find it. Its companion
[`QUEUE_LOG.md`](QUEUE_LOG.md) is the append-only ARCHIVE of full accounts for shipped/ruled-out work; when an
item ships, its body moves there under a stable `<a id>` anchor and this file keeps the one-liner + link.
Whenever the roadmap actually moves, both files are updated in the same commit (Protocol 2 / Protocol 50). Keep
this file phone-first — structured, scannable, real depth per open item, but no walls of text and no code. Item
IDs are stable tags: never renumber, never re-letter, never reuse (Protocol 49 discipline). Every recorded item
carries either a version/home or an explicit stated condition that would earn one — no vaguely-parked entries
(the Unversioned section states this rule in full; Protocol 50 mirrors it so it survives a restructure)._
