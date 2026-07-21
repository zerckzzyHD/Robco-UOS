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

_Last updated: **2026-07-21** — **`QUEUE.md` was split from `QUEUE_LOG.md`.** This was a pure structural
pass: the running header (a single multi-thousand-word paragraph) was collapsed to the most-recent pass
plus a pointer; ~550 lines of shipped post-mortems moved verbatim into the new tracked
[`QUEUE_LOG.md`](QUEUE_LOG.md) with a one-liner + link left behind for each; and the open 2.8.5 tail was
regrouped by **readiness** (ready-now / blocked-on-owner / blocked-on-another-item / the museum
sub-program) instead of discovery-order buckets. No item's status or content changed. The full update
history is in [`QUEUE_LOG.md`](QUEUE_LOG.md#update-history--the-running-last-updated-chain)._

---

## Where we are right now (the real 5-second version)

- **2.8.0 "The Physical Machine" is SHIPPED and live on production.** The whole New Vegas hardware
  overhaul, offline native calculators, Diagnostic Shell, ambient runtime — all live.
- **2.8.5 is essentially DONE on `dev`.** The code+test-health round (U1–U12), the library/token split,
  the Fallout 3 Pip-Boy skin, the data-provenance re-sourcing, all three save-integrity layers, the
  UI-truthfulness fixes, the schematic-layout fix, and the whole governance restructure (R1-R4, R8, R9)
  have landed. Protocol 23 (layering) is now **enforced** by a static gate.
- **What's genuinely left before the `dev → main` release:** the near-term data-safety item **A3** (cloud
  round-trip test) plus a short tail of small leftovers. The end-of-round review/synthesis deliverables
  (F done; **G**, H, D, I) and the governance process work (R5-R7) can land around the release, not
  before it.
- **Then 2.9.0** — the big one: gameplay systems, ambient world life, and the "it's a real operating
  system" round. Its hardening gate (which burns down the baselined architecture debt) sits BEFORE the OS
  services that would otherwise multiply it.
- **Then 3.0** — Fallout 4 as a real playable third game, bundled with the native ES-modules migration.
- **The Museum is BUILT** (a browsable history of the project in the private archive); its reproducibility
  sub-program (P1) and publication (P2, post-release) are the remaining museum work.

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
  truth (owner must re-install via Settings › Capabilities). → [account](QUEUE_LOG.md#r9)

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

### H. ⬜ Optional: the system-model review (owner-gated)

**What it is.** An OPTIONAL external review of the project's system MODEL (its representation of itself),
run only if you want it. Per the ecosystem synthesis, it must be kept **small and question-scoped** (a
large-context review degrades and tends to adopt your own errors rather than catch them).

**What it depends on.** A **portable brief generated fresh from the now-pinned brain dump** (the §20 spec in
the brain dump). That foundation is available now — so this is unblocked whenever you want it. It is **not**
a standing doc: generated fresh each time so it's always accurate because it's always new.

**Why it's optional.** Only worth running if you actually want an outside eye on the model; the synthesis
was explicit that a ceremonial review isn't worth its cost.

**Done means (if run):** a small, question-scoped external pass returns findings in the required claim →
provenance → falsification format, or it isn't run at all.

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

# ⬜ Unversioned — recorded, not yet scheduled (with the reason each has no version)

_This is NOT the "parked drawer." The standing rule is that nothing sits vaguely parked — so each item here
carries an explicit reason it has no version yet AND what would earn it one. Both arrived in the 2026-07-18
placement pass from the two external reviews._

## ⬜ CSS cascade cleanup — replace specificity-bump ancestor selectors with native `@layer`

**What it is.** The stylesheets lean on ancestor-selector specificity bumps to win the cascade; native CSS
`@layer` would express the same precedence declaratively.

**Why it's unversioned.** It's **legitimate but expensive, and nothing is forcing it** — no feature is blocked,
no bug traces to it, and it touches the whole cascade at once (high blast radius for a pure refactor).

**What would earn it a slot.** A UI/CSS pass that's already opening the cascade — the natural host is the 2.9.0
UI-consistency audit or the Round-2 deep-polish program.

## ⬜ Wire manual inventory quantity / equip changes into the event log

**What it is.** Manual inventory changes don't reach the Terminal Record (`state.eventLog`). **Verified against
`js/ui/ui-render-inventory.js` (2026-07-18):** adding an item, the quantity ± stepper (`adjItemQty`, which
emits nothing), and equip all fire animation/echo handlers only — no `_logEvent` call. By contrast craft,
scrap, trade, sleep, level-up, kills and caps DO log.

**Why it's unversioned.** It earned its slot but there's no version pressure and it's small.

**What would earn it a slot — and the natural home.** The 2.9.0 Terminal Record consolidation plus the
inventory-panel rebuild both already establish native, manual, no-AI logging — a clean fold-in there (add three
`_logEvent` calls at the existing `addItem` / `adjItemQty` / `toggleEquipItem` write points).

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
IDs are stable tags: never renumber, never re-letter, never reuse (Protocol 49 discipline)._
