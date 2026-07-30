# RobCo U.O.S. — Build Queue LOG (shipped-work archive)

**The reasoning archive for everything `QUEUE.md` has closed.** `QUEUE.md` is the lean, phone-readable queue of what is still ahead; this file is its companion LOG — the full accounts, post-mortems, and "why we did it this way" for work that has **shipped or been ruled out**. Split out of `QUEUE.md` on 2026-07-21 because the queue was doing two jobs with opposite requirements: a queue must stay short and be read constantly, a log grows forever and is read rarely, and the log was burying the queue.

**Nothing here was deleted from `QUEUE.md` — it was moved, verbatim.** Each shipped item keeps a one-line record in `QUEUE.md` with a link back to its full account here. The shipped-item bodies below are the **exact original text** as they last stood in `QUEUE.md`; the reasoning is the most valuable content in the project — several sessions have relied on it — so it is preserved in full, just relocated off the steering surface.

**Maintenance class: ARCHIVE (append-only).** Entries here are frozen records of shipped work. When a `QUEUE.md` item ships, its full body moves here under a stable `<a id="…">` anchor and the queue keeps the one-liner. Do not rewrite a landed account to match later reality — that is what the drift on the running header caused in the first place. If a shipped decision is later reversed, the reversal is a _new_ queue item with its own record, not a rewrite of this one.

**Item IDs are stable tags — never renumbered, never reused** (the Protocol 49 retirement discipline, applied to queue IDs). An `A0` / `R3` / `P1` here is the same `A0` / `R3` / `P1` referenced from commit messages, memory files, the workflow-review prompt, and `CHANGELOG.md`. Moving an account into this log does not change its ID.

**Anchor index (for `QUEUE.md`'s one-liner links):** [2.8.0](#v280) · [brain dump](#braindump) · [item 1 spine](#u1) · [item 2](#u2) · [item 3](#u3doc) · [item 4 FO3](#fo3) · [item 5 save integrity](#saveintegrity) · [data provenance](#dataprovenance) · [save L3](#saveintegrityl3) · [UI truthfulness](#uitruthfulness) · [item 6 schematic](#schematic) · [A0](#a0) · [A1](#a1) · [A2](#a2) · [R1](#r1) · [R2](#r2) · [R3](#r3) · [R4](#r4) · [R8](#r8) · [R9](#r9) · [D](#d) · [U](#u) · [E](#e) · [M](#m) · [K](#k) · [O](#o) · [N](#n) · [F](#f) · [G](#g) · [H](#h) · [S](#s) · [App Check](#appcheck) · [L (private view)](#l) · [P8](#p8) · [V](#v) · [W](#w) · [X](#x) · [CP2 → v2.1](#cp2v21) · [CP2 S12 cleared](#cp2s12) · [CP2 → v2.3](#cp2v23) · [CP program kernel reframe](#cpkernel0728) · [HG1/HG2 pull-forward](#hg0728) ·
[CP kernel ranks 1-2 shipped, P15](#cp0729) · [RB1-RB5 filed, kernel ranks 4-5 shipped, wiring dissent](#rb0729) · [CP activation checklist consolidated](#cpactivation0730) · [three CP checklist refinements (REF1-REF3)](#cprefine0730) · [REF2/REF3 plan threshold + bidirectional auto-verdict](#cprefine0730b) · [RB3 watcher mechanism + supervisor kill-switch trigger words](#cprefine0730c) · [CP board consolidation: rank 3 + REF1 shipped, AUD1 filed](#cpconsolidate0730)

---

# Update history — the running "Last updated" chain

_The full original running-header text is preserved verbatim in the appendix at the very bottom of this file. The dated summaries below are the same content, reflowed newest-first for reading (the header had grown into a single multi-thousand-word line that `QUEUE.md` could no longer carry)._

<a id="cpconsolidate0730"></a>

### 2026-07-30 (later still) — CP board consolidation: rank 3 + REF1 marked SHIPPED, activation checklist deduped, execution order tightened, AUD1 filed

**Scope of this pass: doc edits + git commit/push/sync only.** No control-plane code was written or changed,
nothing was killed, no enforcement was flipped on.

**Why.** A single very fast night folded a large amount of control-plane work into `QUEUE.md` across many
small passes (the kernel ranks, nine alerts, three REF refinements, the activation checklist, RB3's
mechanism). The owner asked (2026-07-30) for the CONTROL-PLANE section to be tidied into a clean board
before more work lands on top of it.

**Verified against the actual repos before recording, not just repeated (Protocol 51 — Dispatch-origin
claims are hypotheses until checked against the real state).** Read `git log` directly in the private
control-plane repo (`C:\Dev\!RobCo\_RobCo-Control\code`) and the private Ledger repo
(`C:\Dev\!RobCo\RobCo-Control-Ledger`) rather than taking the incoming shipped-list at face value:

- `e4384e5` — "off-machine backup mirror + restore test" (rank 3's build).
- `78acfd5` — "activate rank 3's backup mirror -- wire into daily housekeeping + register scheduled task"
  (rank 3's activation).
- `a1df1b3` — "session-aware uncommitted-work alert -- REF1 refinement to alert 1".
- The Ledger repo (`RobCo-Control-Ledger`) already has two real mirror commits, `d001a38` and `79afc2e` —
  confirms the mirror is actually running, not just wired.

**Marked SHIPPED, moved out of the pending buckets** (full one-line records now live in the "SHIPPED"
section of the activation checklist in `QUEUE.md`):

- Kernel ranks 1, 2, 4, 5 — `8eab8fd` / `dd49ed4` / `9fd751d` / `32c0fbc` (already recorded pre-pass; kept in
  place, only re-homed under the tidied SHIPPED heading).
- **CPK3 — rank 3, off-machine durability — now BUILT AND ACTIVATED**, not merely spec'd: `e4384e5` +
  `78acfd5`, confirmed running via the Ledger repo's own commits. Closes **OD1**'s cadence question (shipped
  using the daily default the original entry explicitly allowed) and unblocks **CPB3** (the backup-all
  script).
- **REF1 — the session-aware backup-unhealthy alert — now BUILT**, `a1df1b3`. Moved out of the REFINEMENTS
  list (which now only carries REF2/REF3, both still unbuilt) into SHIPPED; its design reasoning stays in
  place at REF1's own entry, which remains its one home.
- The idle-session reaper (shadow, `643ebb8`), all nine Pushover alerts, and the thrashing recalibration
  (`15c17d0`) were already correctly recorded as shipped pre-pass — reconfirmed, not re-derived.

**Deduped — the activation checklist reconciled against CP1-CP5/RB1-RB6/HG1-HG2.** Most of the checklist was
already pointer-only ("full entry above" for HG1/HG2/RB1/RB2/RB3) — the real gap was two entries with no
back-reference: CP2's stage-2 "controlled push / sync wrappers" bullet now cross-links to **ACT3/DG2** (the
items that actually operationalize it), and CP3's "usage early-warning relay" bullet now cross-links to
**CPB1/CPB2** (same reasoning). No prose was duplicated to create these links — one sentence added at each
existing entry.

**Tightened into one ordered execution list** (owner's exact sequencing, 2026-07-30): ready-to-build
(**ACT3** NEXT, then **CPB1**, **CPB2**, **HG1**, **HG2**, **RB1**, **RB2**, **RB3**, **CPB3**) → activation
switches (**ACT1** — noting its rank-3 half is already done — then **ACT2**) → owner decisions (**OD1**,
**OD2**) → spikes (**SP1**, RB4's own MCP-load-check, **RB5**, **RB6**) → data-gated (**DG1-DG5**,
self-collecting via **REF3**'s auto-verdict).

**New tracked item filed: AUD1** (new family prefix **AUD** — single letters and
CP/RB/HG/CPK/CPB/ACT/OD/SP/DG/REF are all spoken for). A post-implementation multi-model audit (GPT +
Gemini + DeepSeek) on two questions once the ready-to-build batch is actually live: **(a)
coherence/interconnect** — does the control plane work together as one system, or is it a pile of features
bolted on across one fast night? **(b) frontier** — what's the highest-leverage thing to push next, across
every workflow (control-plane, museum, app)? **Guardrail recorded with it:** judge by "highest-leverage next
and does it earn its keep," never "maximize features" — the exact discipline the three-model convergence
review (2026-07-28) already applied once to talk this project out of a generic reaper, a headless-AI
housekeeping layer, and a 50-protocol hook enforce-engine. AUD1 is explicitly gated on real live run data,
not a review of paper design — running it early against the plan alone would just repeat the 2026-07-28
review, not extend it.

**Small museum touch.** P15 was filed 2026-07-29 but never actually slotted into the museum band's own
build-order sentence (P10 → P11 Stage 0 → arc spine → coverage view → Visual Web). It is now: P15 part 1
(extend the arc corpus with the control-plane's own arcs) feeds directly into P11 Stage 0's `arcs.json`, and
P15 parts 2-3 (room/placement decision, then verifying the Visual Web actually renders it) close out around
P11 Stage 3. No new content — P11's and P15's entries already cross-linked each other; only the build-order
summary sentence was missing the connection.

**⛔ No ID was renumbered, re-lettered or reused (Protocol 49) — this pass is STATUS + GROUPING + DEDUP
only.** Every stable tag (CPK1-5, CPB1-3, ACT1-3, OD1-2, SP1, DG1-5, REF1-3, RB1-6, HG1-2, P15) keeps its
exact prior ID; only status labels, section placement, and cross-references changed.

**Not done in this pass, by design:** no control-plane code was touched, nothing was killed, no enforcement
was flipped on. `CONTROL_PLANE_STATUS.md` (private, gitignored) still reflects 2026-07-29 and was not
updated in this pass — it is not part of the app repo's commit surface; a future pass should refresh it to
match.

<a id="cprefine0730c"></a>

### 2026-07-30 (later still) — RB3's mechanism specified as a live fs.watch watcher (off by default, trigger-word gated); the supervisor's own kill-switch trigger words recorded

**Scope of this pass: doc edits + git commit/push/sync only.** No control-plane code was written or changed,
nothing was killed, no enforcement was flipped on.

**Why.** RB3 (the mobile-hidden-response detector) had been plan-stage since it was filed 2026-07-29, with
its mechanism described only loosely as "the supervisor tails Dispatch's own output." The owner worked out
the actual mechanism in conversation on 2026-07-30, and separately named an existing kill-switch wiring
worth recording so a future session doesn't think it needs to be built.

**RB3's mechanism, now specified: a LIVE 24/7 watcher, not the supervisor's 5-minute poll.** A small
persistent Node process using `fs.watch` on the Dispatch conversation transcript/audit file — not a periodic
tail, an event-driven watch. The moment Dispatch produces substantive assistant TEXT that did not go through
the messaging tool (the working-notes leak this whole detector exists to catch), the watcher fires a Pushover
within **~1 second**. This is a materially different design from "the supervisor's existing 5-minute loop
also checks this" — the failure mode RB3 targets is a leak sitting invisible on the owner's phone, and a
5-minute-old alert is a much weaker guarantee than a ~1-second one for exactly that failure mode.

**It is a detector/alarm, not a blocker.** Same as every other alert this program has shipped: it pings the
owner, it does not and cannot prevent the leak — there is no `PreToolUse`-style hook available for "assistant
text that never went through the messaging tool," only after-the-fact detection off the transcript file
itself.

**OFF BY DEFAULT, gated by trigger words "watcher on" / "watcher off."** The reasoning is a footprint/value
tradeoff, not a safety one: an idle `fs.watch` process costs almost nothing (~0% CPU, ~40MB resident), but
that cost only buys anything while the owner is actively driving Dispatch — so it defaults off and the owner
switches it on for a session rather than it running unconditionally in the background at all times.

**The existing 5-minute supervisor loop babysits the watcher process itself.** If the watcher dies silently,
the supervisor's next pass notices and raises its own incident — so "the instant detector itself went dark"
is covered by the slower, already-live loop, closing the obvious gap a purely event-driven, unsupervised
process would otherwise have.

**Owner context, recorded because it's the actual motivation, not just a nice-to-have:** the owner has been
manually re-reading working-notes on the Claude website to catch these leaks himself. RB3, once built, removes
that manual step entirely.

**Also recorded — a small control-plane note, no build needed.** The supervisor's own kill-switch is already
wired to trigger words: "supervisor on" / "supervisor off" map onto the existing `state\DISABLE` file — "off"
creates it (the supervisor's own loop checks for the file every pass and stops instantly if present), "on"
removes it. **This works today**, nothing to build. Filed here, immediately next to RB3's own "watcher
on"/"watcher off" pair, specifically so a future session doesn't conflate the two or spend effort building
something that already exists.

**Not done in this pass, by design:** no control-plane code was touched. RB3 stays plan-stage — this pass
specifies its mechanism precisely enough to build from, it does not build it. The supervisor kill-switch note
describes an existing capability; nothing about it changed.

<a id="cprefine0730b"></a>

### 2026-07-30 (later still) — REF2 pins a plan idle-reap threshold (2h30m); REF2/REF3 gain a bidirectional auto-verdict with a safety asymmetry

**Scope of this pass: doc edits + git commit/push/sync only.** No control-plane code was written or changed,
nothing was killed, no enforcement was flipped on.

**Why.** Two more additions the owner worked out in conversation on 2026-07-30, on top of the REF1-REF3 pass
recorded directly below — same doc-only discipline, each sharpening REF2 and/or REF3 rather than adding new
scope.

**Addition 1 — a concrete plan threshold for REF2's interactive-session idle-reap signal.** REF2 (above)
already established the two "done" signals a reaping promotion may use; this addition puts a number on the
interactive/Dispatch one: **2h30m (150 minutes)**. Stated explicitly, because a plan number is easy to
mistake for a live one: this is a **PLAN value only**. Reaping interactive sessions stays shadow-gated until
the reaper proves itself — nothing auto-kills at 150 minutes today, and REF2's own DG3 promotion gate (shadow
→ actual reaping) still has to clear before this threshold does anything at all.

**Addition 2 — the reaper's shadow tracking must also detect when it is too aggressive, and that detection
feeds REF3's auto-verdict mechanism.** Previously REF3 described the auto-verdict as always pointed one way —
toward "ready to graduate." This addition makes it bidirectional: the reaper's shadow tracking watches for a
session it would have flagged as reapable **later resuming activity** — a directly measured false positive at
the current threshold. A high false-positive rate produces its own verdict, Pushovered the same way a
graduate-ready verdict is: **"too aggressive → recommend widening the threshold to ~X."** This is not a
DG3-only idea; REF3 is where it's recorded because REF3 already owns the auto-verdict mechanism for every
data-gated item, and this bidirectionality applies to any of them, not only the reaper.

**⭐ The safety asymmetry, recorded because it is the load-bearing part of this addition, not just a detail
of DG3.** The two directions a data-gated mechanism's threshold can move are **not treated the same way**:

- **Loosening** (widening a threshold, erring further toward not killing / not acting) is always the safe
  direction — a false denial costs nothing but a manual check later. So the system **may auto-apply a
  loosening change on its own**, on clear evidence, with no owner sign-off required before it takes effect.
- **Tightening** (making a mechanism more aggressive) is the risky direction — a false tightening costs real
  work or a wrongly-terminated session. So tightening **always requires explicit owner approval**, the exact
  same bar this project already holds for any shadow → live promotion.

In one line: the fail-safe direction is automatic, the risky direction stays gated. This mirrors the CP
program's own "fail-open/shadow-first is not universal" doctrine (the CONVERGENCE_2026-07-28 review, folded
into the CP program's build-order section) — that doctrine drew the owner/automation line for safety-critical
_actions_; this addition draws the same kind of line for safety-critical _threshold changes_.

**Not done in this pass, by design:** no control-plane code was touched — the 150-minute value is a plan
parameter recorded in `QUEUE.md`, not a config value read by any running script, and the bidirectional
auto-verdict + safety-asymmetry doctrine is design only, same as the REF1-REF3 pass it extends.

<a id="cprefine0730"></a>

### 2026-07-30 (later) — three owner-approved refinements folded into the CP activation checklist (REF1-REF3), plus a small CPB1 addition

**Scope of this pass: doc edits + git commit/push/sync only.** No control-plane code was written or changed,
nothing was killed, no enforcement was flipped on.

**Why.** Three refinements the owner worked out in conversation on 2026-07-30, after the CP activation
checklist above had already consolidated the program — each sharpens an item already on that checklist
rather than adding new scope.

**REF1 — session-aware uncommitted-work gating for the backup-unhealthy alert.** The owner hit a false
alarm: the LIVE backup-unhealthy alert (`f14499d`/`bac032a`) fires on uncommitted work sitting in a repo, but
files mid-build in an active session are _supposed_ to be uncommitted — that is normal, not a finding. Fix,
as specified: the alert must not fire on uncommitted work while a session is actively working that repo (the
supervisor already tracks tree co-residency / active sessions, so this reuses an existing signal rather than
building a second tracker); it should fire only when the uncommitted work is **orphaned** (its owning session
finished or died) or has sat uncommitted with no active session past a threshold. Filed as a refinement on
the alert rather than a rewrite of the 2026-07-29 shipped-alert record (Protocol 50 a-date: a reinforcement
carries its own date, it does not overwrite the original).

**REF2 — safe-lifecycle reaping, refining DG3 (the idle reaper's shadow → actual-reap promotion).** The
owner's stated need: he wants finished sessions actually killed once they've served their purpose, and he
cannot do this himself — archiving a session in the desktop UI does not terminate its process, only a real
`(pid, procStart)` kill does, which is exactly the reaper's job. The refinement gives the promotion two, and
only two, clean "done" signals: (a) a supervisor-launched job whose job contract (CPK1's reconciler) reached
verified-terminal state — no guessing involved; (b) an interactive/Dispatch-launched session idle past an
owner-set idle threshold — an authorized deadline, not idle-inference (the same "idle-inference is unsafe"
lesson the reaper's 2026-07-28 re-scope already established, now extended with a concrete idle-vs-verified
split). Three hard guards sit in front of any kill: long-idle only, never mid-work; never reap a session that
left uncommitted work — flag it to the owner and hold, never auto-commit possibly-broken WIP and never kill
unreviewed work; and the rank-4 (CPK4) continuation packet must snapshot the session's state before any reap
so nothing is lost. The existing kill mechanism is explicitly kept intact by this refinement, not replaced:
echo-and-confirm `(pid, procStart)`, never batched.

**REF3 — auto-verdict on data-gated promotions, refining DG1-DG5 plus the ACT1 housekeeping pass.** The
owner's principle, verbatim: "nothing that needs data collection should require me to do it — it should be
automatic." Today each DG item's promotion condition is described in prose (DG2's "≥10 clean wrapper
pushes" is the only one with a concrete number; DG1/DG4/DG5 are qualitative — "a clean shadow stretch," "a
clean hit-based stretch," "a measured collision rate"). REF3's refinement: every DG item gets an **explicit**
evidence threshold defined up front, not left to be eyeballed later, and the daily/weekly housekeeping pass
(ACT1 / CPK5) tracks progress toward each threshold automatically. The moment a threshold is met, the
housekeeping pass Pushovers the owner the decision with the recommendation already computed — the worked
example the owner gave was "worktrees-vs-lease ready: collision rate X% over N chances → recommendation:
lease is enough" — so the owner one-tap decides instead of having to manually check progress. The concrete
numeric thresholds per DG item still need to be pinned down as each promotion is actually built; REF3 fixes
the _mechanism_ (auto-tracked, auto-surfaced), not the numbers themselves.

**Also folded in — a small addition to CPB1 (the budget alert), from the same conversation.** The alert
should also state when the usage cap resets: check whether the usage data itself carries a reset/window-end
timestamp and include it verbatim if so, else compute it from the ~5-hour rolling session window plus the
weekly cycle. Attached directly to CPB1's own entry rather than filed as a fourth REF item, since it extends
an item already fully scoped rather than refining a decision.

**Not done in this pass, by design:** no control-plane code was touched for any of the three refinements —
REF1, REF2, and REF3 are all still design-only, same as the checklist items they refine. This pass only
records the owner's approved design so it lives in `QUEUE.md`, not only in conversation (Protocol 50).

<a id="cpactivation0730"></a>

### 2026-07-30 — Every owner-gated / activation / to-implement CP-program step consolidated into one checklist

**Scope of this pass: read-only reads + doc edits + git commit/push/sync only.** No control-plane code was
written or changed, nothing was killed, no enforcement was flipped on.

**Why.** The owner asked to make sure the whole control-plane plan is captured — every owner-gated,
activation, and to-implement step across CP1-CP5, RB1-RB6, HG1-HG2, and the private planning docs
(`CONVERGENCE_2026-07-28.md`, `CONTROL_PLANE_STATUS.md`, `DISPATCH_RETURN_BUS.md`,
`RANK3_BACKUP_REPO_SPEC.md`, `USAGE_MEASUREMENT_SPIKE.md`) tracked in `QUEUE.md`, not left living only in
Dispatch's own head.

**What landed.** A new consolidated section, "⭐ CONTROL-PLANE ACTIVATION & OWNER-GATED CHECKLIST
(2026-07-30)", filed in `QUEUE.md` directly after **HG2** (inside the pre-museum CP/RB/HG cluster, before
the museum program). It is a cross-linked index over the existing CP/RB/HG entries, organized by six status
buckets (READY-TO-BUILD, ACTIVATION-SWITCH, OWNER-DECISION, SPIKE, DATA-GATED, DONE) rather than by build
order — the axis the owner actually needed for "what do I need to say yes to."

**New stable IDs assigned** (family-prefix convention, single letters exhausted — Protocol 50 a-form: every
entry gets a home or an explicit earn-condition; all of these got homes):

- **CPK1-CPK5** — retroactive IDs for the five "kernel ranks" referenced throughout the CP program's prose
  as "rank 1" – "rank 5", which never had stable IDs of their own before this pass. CPK1 (`8eab8fd`), CPK2
  (`dd49ed4`), CPK4 (`9fd751d`), CPK5 (`32c0fbc`) are shipped; CPK3 (off-machine durability, spec'd in
  `RANK3_BACKUP_REPO_SPEC.md`) is READY-TO-BUILD.
- **CPB1-CPB3** — the next control-plane build batch that had no ID: CPB1 the budget alert (tokens/$, now
  unblocked by the usage-measurement spike), CPB2 the usage→operating-modes change (decided 2026-07-28, not
  yet built), CPB3 the "backup-all" script (new, scope not yet spec'd beyond what the owner stated — flagged
  honestly rather than invented).
- **ACT1-ACT3** — activation switches: ACT1 registers CPK5's daily-housekeeping half as a scheduled task,
  ACT2 wires CPK2's publisher + CPK4's continuation-packet generator into the live supervisor loop, and
  **ACT3 is new** — "wire the controlled-push wrapper into the real push path," owner-approved 2026-07-30 as
  the concrete first step toward the ≥10-clean-pushes gate (**DG2**). ACT3 is explicitly scoped as routing
  only; raw-push refusal stays a separate, later, data-gated promotion.
- **OD1-OD2** — owner decisions: OD1 the rank-3 (CPK3) backup + restore-test cadence (already named in the
  spec's own "Open decisions"), and **OD2 is newly filed as its own tracked item** per the owner's explicit
  instruction — whether to set up the `C:\Dev\auth` secure backup now (its own encrypted vault, never a
  repo).
- **SP1** — new: live-confirm the two documented-contract-only Pushover alerts ("needs your input" /
  "session died") by actually watching a hook fire. Previously only a bullet in `CONTROL_PLANE_STATUS.md`
  §2, now a tracked item.
- **DG1-DG5** — the data-gated promotions (thrashing shadow→kill, push-guard enforcement, reaper
  shadow→reaping, `--no-verify` tripwire shadow→enforce, worktrees-vs-lease), previously scattered across
  CP2's doctrine section, the CONVERGENCE review, and `CONTROL_PLANE_STATUS.md` §3 — unified under one
  family so each has exactly one home instead of three partial mentions.

**Existing IDs cross-linked, not renumbered:** RB1 (inbox), RB2 (receipts), RB3 (hidden-response detector),
RB4 (its own load-spike stays inside RB4, per that entry's own text — cross-referenced, not forked into a
new ID), RB5, RB6, HG1, HG2 all moved from their scattered "plan-stage" / "PULLED FORWARD" framing into the
READY-TO-BUILD bucket, reflecting the owner's 2026-07-30 go — their own entries above are left as-is
(Protocol 50 a-date: a reinforcement carries its own date, it does not overwrite the original).

**Verified against source before filing, not taken on faith (Protocol 51(b)):** the "9 alerts, 7 live"
count, the four shipped kernel-rank SHAs, the reaper's re-scope, the thrashing recalibration SHA, and the
private `RobCo-Control-Ledger` repo's existence were all read from `QUEUE.md`'s own prior entries and the
planning docs directly, not assumed from this pass's own framing.

**Not done in this pass, by design:** no control-plane code was touched, no scheduled task was registered,
no wrapper was actually wired, no kill-switch or enforcement flag was changed. This pass is the tracking
layer only — every item it created is still exactly as unbuilt/undecided as it was before, just now visible
in one place instead of several.

<a id="rb0729"></a>

### 2026-07-29 (later) — RB1-RB5 filed (Dispatch Return Bus), kernel ranks 4-5 shipped, wiring status corrected via dissent

**Scope of this pass: read-only reads + doc edits + git commit/push/sync only.** No control-plane code was
written or changed in this pass, no process was killed, no enforcement was flipped on. Ranks 4 and 5
themselves were already built earlier tonight in the private `RobCo-Control` repo (confirmed by
`git log`/`git show` against that repo, not taken on faith); this entry is the queue fold-in plus a
correction the fold-in surfaced.

**Kernel rank 4 — deterministic continuation packet — ✅ SHIPPED, commit `9fd751d`.** An AI-free
resumption file written at session exit/failure: objective SHAs, changed/uncommitted files, commands and
tests already run with their results, current job state and blocker, agent-claims kept separate from
independently-observed facts — exactly rank 4 in the 2026-07-28 (late) three-model build order (see
[above](#cpkernel0728)). Invoked via `scripts/generate-continuation-packet.js`; `state\continuation-packets\`
shows it was exercised at least once around build time (22:41, one minute before the commit).

**Kernel rank 5 — incident lifecycle + daily housekeeping — ✅ SHIPPED, commit `32c0fbc`.** Alerts modeled
open→updated→resolved→reopened (`lib/incident.js`) so ledger dedupe can't suppress a recurring incident
forever, plus a daily pass (`scripts/daily-housekeeping.js`) for supervisor/adapter/disk/ledger/replication
degradation — rank 5 in the same build order.

**RB1-RB5 filed in `QUEUE.md`** — new family prefix, own section under the CP program, directly following
CP5: RB1 the Dispatch inbox projection, RB2 launch + structured completion receipts (G1/G2), RB3 the
mobile-hidden-response detector (G5), RB4 the custom control-plane MCP (delivery + ack, explicitly not
wake), RB5 the bounded `send_message` WAKE spike. All plan-stage, cross-linked to
[`planning/control-plane/DISPATCH_RETURN_BUS.md`](../planning/control-plane/DISPATCH_RETURN_BUS.md), which
was already written and is unchanged by this pass. RB5 is flagged **BLOCKED BY PLATFORM** — no documented
way exists today for a local process to inject a turn into the persistent Cowork/Dispatch conversation;
RB1-RB4 do not depend on it.

### DISSENT — "none of the kernel is auto-wired into the live supervisor loop" does not hold, verified against the code and a live Task Scheduler check

The instruction that started this pass asserted the kernel is not yet auto-wired into the live supervisor
loop (owner-gated activation). Per Protocol 51(a) — a Dispatch-origin work-status claim is a hypothesis
until verified against the repository, never repeated as given — this was checked rather than recorded
as-is, and it does not hold as stated:

- `supervisor.js` requires and calls `lib/job-contract.js` and `lib/job-reconciler.js` (rank 1) on every
  loop iteration — `jobContract.readAllManifests()` / `jobReconciler.reconcileFromData(...)`, lines
  289-290.
- `supervisor.js` also requires and calls `lib/incident.js` (rank 5's incident-lifecycle half) on every
  loop iteration — `incident.reduceIncidents` / six `incident.reconcileIncidentSet(...)` call sites, lines
  670-757 — feeding the live Pushover alert pipeline directly.
- The `RobCo-Control-Supervisor` Windows Scheduled Task is registered and **State: Ready**, `LastRunTime`
  2026-07-29 23:19:00, `LastTaskResult` 0 (success), `NextRunTime` 2026-07-29 23:23:59 — i.e. actually
  running on its ~5-minute cadence right now, not merely built-and-dormant. No `state\DISABLE` kill-switch
  file is present. `state\events-2026-07-29.jsonl` was written at 23:19, the same minute as the confirmed
  scheduled run, ruling out a silent no-op.

**So rank 1 and rank 5's incident-lifecycle half ARE live and auto-wired, today, against real jobs.** What
genuinely is _not_ auto-wired: rank 2's publisher (`lib/publisher.js` — only called from the standalone
`scripts/publish.js`, which nothing schedules and `controlled-push.js` does not call), rank 4's
continuation-packet generator (only via `scripts/generate-continuation-packet.js`, no scheduled task), and
rank 5's daily-housekeeping half (`scripts/daily-housekeeping.js`, no scheduled task found). That is a
materially different picture from "none of the kernel is auto-wired" — the detect/alert path is live
today; only the write-side actions (publish, packet generation, daily housekeeping) remain
manual-invoke-only. `QUEUE.md`'s running header and the RB section above reflect this corrected picture.

**Why recorded as dissent rather than silently fixed:** "owner-gated activation" implies nothing acts on
real data until the owner flips something on — but the detection/alert half has been acting on live data
every five minutes since ranks 1 and 5 shipped tonight. That changes what "nothing is enforced yet"
actually covers, and per Protocol 51(c) the correction is surfaced here, in the record, rather than
smoothed into agreement with the original claim.

**What this pass backed up, and what it did not.** This app repo's `QUEUE.md`/`QUEUE_LOG.md` and
`planning/control-plane/*.md` changes are covered by this repo's own `origin/dev` push plus the private
archive's `sync.ps1` mirror (Protocol 48) — both described in this session's own final report. The
control-plane **code** in the private `RobCo-Control` repo is backed up only by its own `origin/main` (no
archive mirror — the archive mirrors this app repo's `planning/` docs and the orchestrator's memory, not a
third repo's source). Rank 3 (a dedicated off-machine mirror of the control-plane's own runtime ledger,
Task Scheduler exports, and hook config) remains spec-only, blocked on the owner creating the private
backup repo — so the control-plane's **runtime state** (the ledger, `continuation-packets/`, etc. under
`state\`) has no off-machine backup of any kind yet. That gap is exactly what rank 3 exists to close.

---

<a id="cp0729"></a>

### 2026-07-29 — kernel ranks 1-2 SHIPPED, five new alerts, thrashing recalibrated, a rank-3 backup-repo spec, the usage-measurement question answered, and a new museum item (P15)

**All control-plane work below shipped in the private `RobCo-Control` repo, not this app repo.** This entry
is the documentation fold-in of that work into `QUEUE.md`/`QUEUE_LOG.md` — the pass itself was read-only
against this repo: reads, doc edits, and the commit/push/archive-sync described at the bottom, nothing else.
No process was killed, no code path was activated, no enforcement was flipped on.

**Kernel rank 1 — job contract + reconciler — ✅ SHIPPED, commit `8eab8fd`.** The per-job manifest of desired
state (id/nonce, canonical repo/worktree, base SHA + expected remote, job type, allowed write scope, usage
reserve, wall-clock deadline, required verification commands, terminal condition, notification policy,
context/protocol version-hash) plus intent → act → observe-independently → result with idempotency keys, and
reconciliation of intents-without-results after a crash — exactly the design the 2026-07-28 (late)
three-model convergence set as rank 1 (see [above](#cpkernel0728)).

**Kernel rank 2 — transactional exact-SHA verifier/publisher — ✅ SHIPPED, commit `dd49ed4`.** The publisher
pushes only a SHA it independently produced evidence for; it **fails closed**, carries a tested,
ledger-recorded break-glass, and has fault-injection tests proving the negative cases, not just the happy
path. This is the real choke point the convergence review identified (credential separation makes it one).

**The idle-session reaper (built the night before, commit `643ebb8`) is confirmed re-scoped** to
verified-terminal-state / owner-authorized-hard-deadline cleanup only, for supervisor-launched jobs, never
idle-inference on an interactive session — matching the 2026-07-28 (late) narrowing exactly (see
[above](#cpkernel0728)); no new commit for this, it is the same build, now explicitly confirmed against the
convergence doctrine rather than left as an open re-scope.

**Five new Pushover alerts, commits `f14499d` + `bac032a`** (on top of the four already built + live —
usage-threshold crossing, thrashing/stuck session, ghost/duplicate launch, stranded/unconfirmed push):

1. **"A session needs your input"** — documented contract only. Depends on the `Notification` hook firing
   reliably on the installed build; unverified-live, not wired yet.
2. **⭐ Backup unhealthy** — LIVE, and the highest-value alert shipped tonight: it already fired correctly on
   a real run, catching unpushed/uncommitted work or a stale archive sync before it became a loss. This is
   the direct response to the 2026-07-28 near-miss (the control repo sat with 2 unpushed commits).
3. **Session died / errored** — documented contract only, via the `StopFailure` hook; unverified-live, not
   wired yet.
4. **Deadline exceeded** — LIVE, wall-clock only (the budget half is separate, see the usage-measurement
   verdict below).
5. **Break-glass used** — LIVE. Fires when rank 2's manual publish-without-evidence override is invoked.

All five were demoed to the owner's phone.

**Thrashing detector recalibrated, commit `15c17d0`.** Added a "nearby-progress" gate: a session making
real, adjacent progress no longer trips the same-tool-failure heuristic. This corrected a **real false
positive** on session `53a3bb89` — recorded plainly as a live miss the shadow-only detector caught and fixed
in itself, exactly the kind of shadow-first evidence the convergence review's promotion criteria ask for.
The detector stays shadow-only; it still never kills, per the standing doctrine.

**Usage-measurement accuracy spike run — read-only investigation, no enforcement, no budget code, nothing
killed.** Full document:
[`planning/control-plane/USAGE_MEASUREMENT_SPIKE.md`](../planning/control-plane/USAGE_MEASUREMENT_SPIKE.md).
This is the spike the 2026-07-28 (late) convergence explicitly gated the budget half of the deadline/budget
alert on. Method: real bounded `claude -p` jobs (single-turn), three configurations (plain headless, headless
with OTLP pointed at a throwaway local listener, two jobs launched genuinely concurrently), compared against
the global usage file the supervisor already reads. Total spend: ~$0.72 across 7 jobs.

- **The global usage file (`plan-usage-history.json`)** is a flat, account-wide time series with **no
  session id, job id, or process id of any kind** — structurally incapable of per-job attribution, not just
  imprecise. It moved in the right direction for every test job (confirming it's live), but `fh`/`sd` stay
  undocumented and integer-rounded.
- **A headless job's own `-p --output-format json` result** carries `session_id`, `total_cost_usd`, and full
  token accounting — real, precise, per-job, no extra infrastructure needed for the headless case.
- **Native OpenTelemetry export is real and far more granular than expected** — metrics and logs (no traces:
  `OTEL_TRACES_EXPORTER=otlp` produced nothing on this build), every data point tagged with `session.id`,
  cost and token counts broken out per model. Cross-checked exactly against the `-p` JSON result for the same
  job — both channels agree to the same floating-point value.
- **The concurrency test is the key result:** two `claude -p` jobs launched genuinely simultaneously (OTLP
  posts landed within 1ms of each other) stayed cleanly separated — every payload carried exactly one
  `session.id`, no cross-contamination, both jobs' numbers matched their own `-p` results exactly. This holds
  mechanically (each process runs its own OTel SDK instance with no shared mutable state), not by luck of a
  2-job sample.
- **Verdict:** per-job token/dollar attribution is real, precise, and survives concurrency — via OTLP or the
  headless `-p` result, never via the global usage file. **"% of the weekly/5-hour cap" per job remains
  UNOBSERVABLE** — `fh`/`sd` are undocumented, integer-rounded, and carry no identity field to attribute a
  delta to; per this project's own doctrine ("never fabricate the unobservable"), that boundary stays
  unobservable rather than estimated.
- **What this does NOT cover:** only 2 concurrent jobs tested, not higher concurrency; only headless jobs
  tested, not interactive sessions (OTLP for interactive is unverified, though there's no mechanistic reason
  to expect a difference); nothing is wired into the real supervisor/job-contract launch path yet — this is a
  measurement result, not shipped plumbing.
- **Consequence for the deadline/budget alert:** the budget half is now **unblocked** for a `usageReserve`
  defined in dollars or tokens (both proven measurable, even concurrently); it stays **blocked** for any
  alert framed as "% of cap consumed by job X." `planning/control-plane/reviews/CONVERGENCE_2026-07-28.md`'s
  own budget-gating note was updated in this same pass to point at the spike's verdict rather than leaving
  the question open.
- One leftover, flagged rather than acted on per the task's "kill nothing" rule: a throwaway local OTLP
  listener process may still be bound to `127.0.0.1:4318` on the machine from the spike — localhost-only,
  writes only to a log file, flagged to the owner to stop by hand.

**Rank 3 (off-machine durability) now has a SPEC, not a build.** Full document:
[`planning/control-plane/RANK3_BACKUP_REPO_SPEC.md`](../planning/control-plane/RANK3_BACKUP_REPO_SPEC.md).
A dedicated private GitHub repo (proposed name `RobCo-Control-Backup`) mirroring the control-plane's
append-only ledger, `snapshot.json`/`status.json`, exported Task Scheduler XML, and non-secret hook
configuration — explicitly **never** secrets (Pushover creds, the OAuth client secret) or transient state
(lockfiles, the `DISABLE` kill-switch), enforced by an exclude-list plus a pre-commit secret-scan that fails
closed. Includes a periodic restore test (clone into a temp dir, replay the ledger, validate refs/config) so
"backed up" means provably recoverable. **Open decisions left to the owner:** the repo name and actually
creating it (Dispatch does not create accounts/repos), the backup/restore-test cadence, and whether the
separate `C:\Dev\auth` secrets-backup problem is in scope now or tracked apart. Ranks 4 (deterministic
continuation packet) and 5 (incident lifecycle + daily housekeeping) remain unbuilt.

**The control-plane ↔ archive relationship, recorded plainly for the record:** the control-plane **code**
lives in its own separate private repo (`RobCo-Control`) and is **not** part of the private archive mirror;
its **design/story docs** (`planning/control-plane/*.md` in this app repo) **are** archive-mirrored, same as
any other `planning/` doc (Protocol 48); and `QUEUE.md`/`QUEUE_LOG.md` live in this app repo, backed up via
its own `origin/dev` push, **outside** the archive mirror entirely. Three different backup surfaces, three
different mechanisms — recorded here because CP4 (the sync audit) is exactly the item that asks "what is
covered and by what" across surfaces like these.

**New museum item filed: P15** (in `QUEUE.md`, THE MUSEUM PROGRAM section) — the control plane became the
board's top program the day after P8's story-corpus (146 arcs) was cut, so the corpus, room placement, and
P11's Visual Web are all now stale against the control plane's own recent history. Filed as its own item
(family prefix **P**, next free number) per the owner's instruction that it get "its own item," and as an
explicit precondition on calling the museum done — full body in `QUEUE.md`.

**What did NOT happen in this pass:** no code was written or changed in this app repo or the control repo;
no process was killed; no enforcement was turned on; no new build was started. This is a documentation and
backup pass only — the queue/log edits above, plus a commit/push of this repo's tracked docs to `origin/dev`
and an archive-sync run (Protocol 48) to back up the `planning/control-plane/*.md` docs referenced above.

<a id="cpkernel0728"></a>

### 2026-07-28 (late) — three-model review campaign (Gemini + DeepSeek + GPT) converges on a trusted-action-kernel reframe; reconciled into CP1-CP5

**Analysis only — nothing here is built or approved to build** (owner: "fold into queue until you've analyzed
all 3 responses; don't run anything"). Source: `planning/control-plane/reviews/CONVERGENCE_2026-07-28.md`, the
converged reading of three independent reviews of the whole control-plane vision:

- **Gemini 3.1 Pro (Deep Research)** — the current capability surface of Claude Code / the app. Mechanisms.
- **DeepSeek (Expert, DeepThink)** — a technical pass: hooks-feed-the-ledger, `--resume`.
- **GPT-5.6 Sol (Work, Max)** — the architecture pass, and the deepest.

**The reviews did not conflict — they composed.** GPT supplied the architecture the kernel needs, Gemini the
mechanisms it would be built from, DeepSeek the technical seam (hooks feeding the ledger), and all three landed
on the same narrowing as the project's own prior lessons ("green is scoped evidence," "passing ≠ catching,"
"the control plane is the weakness," "AI is a typist").

**The headline reframe.** The project has built a strong **flight recorder** (OBSERVE) and a weak **actuator**
(safe action). Several things planned or built turn **weak inference into destructive action** — the wrong
place to spend the risk budget. The next maturity jump is a **tiny trusted action kernel**, not more detectors.

**The revised build order (replaces CP2's six-stage order as the _working_ plan — CP2's own order is kept in
QUEUE.md for its reasoning, per Protocol 50 a-date, not deleted or renumbered):**

1. **Job contract + reconciler.** A tiny manifest of desired state per job (job id + nonce, canonical
   repo/worktree, base SHA + expected remote, job type, allowed write scope, usage reserve, wall-clock
   deadline, required verification commands, terminal condition, notification policy, context/protocol
   version-hash), then intent → act → observe-independently → result with idempotency keys; reconcile
   intents-without-results after a crash. The ledger records what _happened_; this adds what was _supposed to_.
   Generalizes the existing Stage-2 push contract (intent→verify→result) to every job. No DB needed — ledger +
   a deterministic projection. Mechanism: `SessionStart` `additionalContext` injection at zero token cost.
2. **Transactional exact-SHA verifier/publisher + fault-injection tests.** The publisher pushes only a SHA it
   independently produced evidence for. Real choke point (credential separation makes it one). Enforce first,
   only for unattended publication, with a tested, ledger-recorded break-glass. Promotion requires real
   exposure **and** injected negative cases, not calendar time.
3. **Recovery inventory + off-machine durability + restore test + supervisor freshness.** "expected == observed
   SHA" proves one ref at one moment, not recoverability. Inventory everything a total-disk-loss takes
   (uncommitted/untracked work, control-plane source+config, Task Scheduler defs, ledger segments + manifests,
   hooks/wrappers, orchestrator memory) and periodically restore into a temp dir and validate (checkout, ledger
   replay, expected refs, supervisor config). Append-only local data still dies with the disk.
4. **Deterministic continuation packet.** An AI-free resumption file at session exit/failure (objective;
   base/current/remote SHAs; branch/worktree; changed + uncommitted files; commands+tests already run with
   results; recent distinct failure signatures; unfinished verification; current job state + exact blocker;
   which protocols the previous session actually got; agent-claims vs independently-observed facts kept
   separate). Fed to the next session with minimal scoped protocols. Kills the "every fresh session rediscovers
   everything" usage cost. Better than DeepSeek's bare `--resume`.
5. **Incident lifecycle + daily housekeeping.** Alerts modeled as open→updated→resolved→reopened (so ledger
   dedupe can't suppress a recurring incident forever); send-intent tracked separately from acknowledged
   delivery. A daily pass detects supervisor/adapter/disk/ledger/replication degradation.

**Reconsidered / de-prioritized (was planned or built — now narrowed), with reasoning:**

- **Idle reaper (BUILT the same night, commit `643ebb8`, `_RobCo-Control` repo) — over-invested; re-scoped to
  terminal-job cleanup.** An idle session normally costs no tokens; a mistaken kill destroys unsaved reasoning
  or interrupts git. Keep it, but change the _authorization_ from "idle + archived" to
  independently-verified terminal state OR an explicitly authorized hard deadline, only for
  supervisor-launched jobs, using stored process identity / a Windows Job Object, never an interactive Desktop
  session on idle-inference. Tonight's congestion was itself GPT's own carve-out: an idle process _holding a
  scarce lease_ — authorize on "blocking a lease," not on "idle."
- **Thrashing → kill — do NOT graduate.** 4 same-tool failures can be valid diagnosis; file-changes aren't real
  progress. Stays alert-only / job-budget signal. Legitimate termination = crossing an owner-approved
  time/tool/usage envelope, never a "thrashing" guess.
- **Headless AI for sync / reap / run-tests — CUT.** Deterministic; the supervisor runs Node/PowerShell/git/the
  test command directly (`spawn()`). Using Claude burns the scarce resource, widens authority, adds
  nondeterminism. Reserve headless AI for interpretation (bounded log diagnosis, a proposed patch). Corrects a
  claim Dispatch made mid-session.
- **Auto-restart — decouple from repo sync.** Separate: continuous checkpoint/durability · app-health detection
  · restart with cooldown + max-attempts (alert after one failure, never loop) · repo sync by its own contract.
  Restart only when no active mutating jobs. "Sync memory before restart" is not a reliable emergency plan if
  the app is already hung — state must be checkpointed continuously enough that restart is _already_ safe.
- **`--no-verify` tripwire — low leverage, de-prioritize.** Targets one bypass while direct git / alternate
  binaries / hook edits / credential use remain. The exact-SHA publisher + credential separation is the real
  invariant. Keep the flag detector as cheap telemetry only.
- **Usage thresholds 50/80/85/90/95 → operating MODES.** Five thresholds become wallpaper. Map usage to modes —
  Normal / Conserve / Reserve-for-owner / Stop-unattended-AI — notify only on a _mode change_; keep exact
  percentages in `status.json`. Weekly rollup answers "what decision should change?" (usage per verified
  outcome, duplicate launches, blind time, overrides), not event counts. **← Owner judgment call — decided
  ✅ APPROVED below** (he specified the original thresholds).
- **Worktrees — defer; prefer a per-repo mutating lease first.** Worktrees share git objects/refs/config/
  credentials → concurrency, not containment (Kimi + GPT agree). At one machine / one cap, a single
  mutating-job lease per repo may deliver most of the value with less machinery; allow parallel read-only/test
  work; add multiple mutating worktrees only when measured concurrency value beats cleanup+integration cost.

**Doctrine refinement (the sharpest correction).** "fail-open / shadow-first" is not universal. A false
_denial_ of one unattended job is cheap; a false _allowance_ of an autonomous push/kill/restart is expensive.
So: preserve availability **for the owner** (always-available logged break-glass), but let **automation's**
safety-critical paths fail **CLOSED**. That dissolves the project's long-standing "a guard that locks me out is
worse than no guard" tension — it was conflating the owner's path with automation's. Correct defaults: an
observational adapter failing → human workflow continues, report unavailable/stale; an unattended launch
lacking fresh prerequisites → do not launch, manual workflow remains; verification evidence missing → do not
publish; termination identity/state ambiguous → do nothing (+ alert); the owner needing to work despite a guard
failure → explicit logged break-glass; platform internal schema changes → disable the dependent automation, not
the whole workflow. Shadow-first also needs: measure trigger opportunities, not calendar time; label TP/FP/FN;
inject rare failure cases; promote the smallest action; prefer bounded/reversible denials over destructive
responses. **Simplicity stays 4-5 executable invariants, not a pile of detectors:** (1) no unapproved
concurrent writer to the same workspace; (2) no unattended publication without exact-SHA independent evidence;
(3) no destructive action on ambiguous or stale identity; (4) every durable state promised to the owner is
demonstrably restorable; (5) unattended work cannot consume the owner's reserved usage or authority.

**Gemini mechanisms to VERIFY before building (leads, not facts).** Gemini gave very specific version-gated
features with real-looking doc citations, but LLMs hallucinate version numbers and Dispatch's own knowledge is
older — verify each against the actually-installed CLI build + live docs before any of it is load-bearing.
Highest-value to confirm: `CLAUDE_CODE_PROCESS_WRAPPER` (claimed v2.1.208+/`processWrapper` v2.1.210) —
host-level spawn interceptor, would be the AI-free choke point to inject a job id/env into every session +
throttle; native OpenTelemetry export (claimed v2.1.214+) — token/latency/tool spans, would be a first-class
ledger feed including real token consumption; Channels (`claude/channel`, claimed v2.1.216+, experimental) — a
local listener that can inject a message into a _running_ session, which if real overturns "headless can't be
re-prompted after launch"; `SessionEnd`, `PostToolBatch`, `UserPromptSubmit`, `Setup`; native
`isolation:"worktree"` + `WorktreeRemove`; native timeouts `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` /
`BASH_MAX_TIMEOUT_MS`. Windows realities to design around: hooks route through `powershell.exe`; ~32 KB arg
limit → pass context via stdin/files not inline; `child_process.exec` hangs → `spawn()` with piped stdio +
sanitized env; `--bare` bypasses global hooks (observe via `stream-json` instead). Settled by Gemini (DeepSeek
had it wrong): a working `PreToolUse` hook CAN block (exit 2 / `"decision":"block"` / `permissionDecision`).
"Fail-open" only means a crashed/silent hook doesn't override — hooks can enforce, they are still bypassable,
so they are guards not guarantees.

**What the reviews got wrong / didn't know.** DeepSeek reinvented Dispatch (a "REST API so your phone can
launch" — Dispatch already is that); claimed hooks "can't block" (wrong, above); floated
multiple-accounts-to-double-the-cap (ToS — no, and it flagged this itself); "estimate usage from tool
durations" is unreliable (the real usage file already exists). Gemini's version numbers are unverified. All
three don't know Dispatch's role, so their "how do you launch/trigger" answers over-build surfaces the project
already has.

**Owner decisions (2026-07-28):**

1. **Usage thresholds → operating modes — ✅ APPROVED.** Normal / Conserve / Reserve-for-owner /
   Stop-unattended-AI; notify only on a mode _change_; exact % stays in `status.json`.
2. **Sequencing — ✅ this whole kernel program runs BEFORE the museum and before 2.9.0.**
3. **Separate trust domain for unattended jobs — folded as DEFERRED, laptop-leaning.** The owner asked whether
   the spare laptop could serve as the isolation boundary instead of a separate Windows account on the main PC.
   First read: the laptop is a _stronger_ boundary than a same-PC account — real machine isolation + a second
   disk that doubles as the rank-3 off-machine durability — but it is a bigger ops commitment, and the kernel
   itself needs neither, so it stays deferred until unattended autonomy is real enough to warrant hard
   containment. Aligns with **CP5** (laptop-witness) and the earlier software-first deferral of the spare
   laptop.

**What was explicitly left OPEN by this pass:** whether to pull 2.9.0 hardening items (event-bus / bootstrap
isolation) forward — pending the owner, not decided in this pass. **⭐ RESOLVED the same day, later —
2026-07-28:** the owner decided. Full account → [below](#hg0728).

**Reconciliation done this pass (2026-07-28, documentation-only — no code, no sessions launched):** `QUEUE.md`
gained a new overlay section ("⭐ The CP program's BUILD ORDER — CURRENT") directly under the CP1-CP5 program
header, plus short dated addenda on CP1 (narrowed termination doctrine), CP2 (six-stage order marked superseded
as the _working_ plan, kept for its reasoning), and CP5 (separate-trust-domain question folded in as deferred).
`planning/control-plane/CONTROL_PLANE_SPEC.md` gained a dated pointer at its top noting the overlay, without
rewriting the spec itself. The archive sync (Protocol 48) was **not** run for this pass — known-blocked
tonight by idle-session congestion; it backs these files up after the app restart.

<a id="hg0728"></a>

### 2026-07-28 — the 2.9.0 hardening-gate pull-forward question is RESOLVED: HG1 (event-bus) and HG2 (bootstrap isolation) join the pre-museum band; the dependency-cycle burn-down stays in 2.9.0

**The question left open by the same day's earlier kernel-reframe pass** (above, [`#cpkernel0728`](#cpkernel0728))
is now decided. 2.9.0's hardening gate names three subtractive items, all originally scoped as narrative
bullets with no stable ID: the UI↔services dependency-cycle burn-down, bootstrap isolation, and event-bus
hardening. The owner pulled **two of the three** up into the pre-museum priority band, alongside the
control-plane kernel (CP1-CP5) — because they are pure debt-reduction, independent of the new OS services that
motivate the rest of the hardening gate, so doing them now costs nothing and removes debt that would otherwise
sit for a full additional round.

**Assigned stable IDs — new family prefix, per this project's own ID convention** (single letters exhausted;
new work takes a family prefix, same shape as `R1-R11`, `P1-P14`, `CP1-CP5`):

- **HG1 — event-bus hardening.** `RobcoEvents` gets `off`/`once`/dedup, and listener-error isolation so a
  thrown handler can't block unrelated handlers in the same event. Pulled forward because nothing about it
  depends on the OS round's new services, and the OS round is about to widen `RobcoEvents`' usage — hardening
  it before that widening is strictly cheaper than after.
- **HG2 — bootstrap isolation.** ~45 boot-phase calls, currently under one outer `try`/`catch` with no
  per-phase isolation, get per-phase guards classified fatal-vs-degradable, failing loudly rather than
  silently. Pulled forward for the same reason as HG1 — it is debt in code that exists today, unrelated to what
  the new OS services will add to the boot sequence.

**What did NOT move, and why — the UI↔services dependency-cycle burn-down.** This item is different in kind
from the other two: it depends on the very render↔service boundary the new 2.9.0 OS services are going to
reshape. Burning it down now risks inverting edges that the 2.9.0 services simply re-tangle on arrival — doing
the same work twice. It stays exactly where the hardening gate's own original ordering reasoning already put
it ("build the services first and you multiply the debt... burn the baseline down FIRST, then the services
plug into a clean seam") — that reasoning is untouched, not overwritten (Protocol 50 a-date).

**Sequencing stays intact.** Pre-museum work (the control-plane kernel + HG1 + HG2) → the museum → 2.9.0
(carrying the remaining dependency-cycle burn-down as its own hardening-gate item). Nothing about the
three-band execution order changed; HG1/HG2 simply joined band 1 alongside CP1-CP5.

**Reconciliation done this pass (2026-07-28, documentation-only — no code, no sessions launched):** `QUEUE.md`
gained a new top-level section ("⭐ ALSO PRE-MUSEUM — the 2.9.0 hardening pull-forward") holding the HG1/HG2
entries, an extension to execution-order band 1 naming them, and dated annotations on the three original
hardening-gate bullets (the two that moved point at their new IDs; the one that stayed carries an explicit
"confirmed staying" note) — none of the original bullet reasoning was deleted, only annotated, per Protocol 50.
The archive sync (Protocol 48) was **not** run for this pass — still known-blocked tonight by idle-session
congestion; it backs these files up after the app restart.

<a id="cp2v23"></a>

### 2026-07-28 — S7 ran for real and came back NEGATIVE: Stage 4b is a platform limit, not a build gap (spec → v2.3); plus the unattended-launch-autonomy capability finding

**Two unrelated findings landed the same day, both folded into the spec as v2.3.**

**1. S7 (re-scoped) actually ran, owner away from the machine — and it failed.** A real one-time
Claude scheduled task fired **on time** while the owner was genuinely away — the scheduling mechanism
itself works. But it failed on both of the two things §7.4's four-step test exists to prove:

- **No direct path to the phone.** A headless/scheduled task has **no proactive-notify-to-phone
  tool** of its own. What IS confirmed — the **same session** — is that a **live Dispatch agent**
  reaches the phone. That is the already-established channel, not the headless one this spike was
  testing.
- **It hung.** The task attempted a write action, hit a permission prompt, and — with nobody present
  to approve it — **never completed**. Because it never completed, not even its own
  completion-notification fired. There was no signal at all, not even an indirect one.

⇒ **Stage 4b — a headless task pushing a real unattended notification to the phone — is NOT
achievable with available mechanisms.** This is recorded as a **platform limit** (spec §8, new limit
7), not a design defect to iterate on: no different marker design, polling interval, or retry policy
fixes "no tool exists" or "an unattended prompt blocks forever." **Do not re-attempt the
scheduled-task→phone route.** The honest, permanent design is what §7.4 already named as the
fallback and is now the program's actual notification story rather than an interim state: **PULL,
not push** — notify while a live Dispatch agent is active (the proven channel), plus a status-file
read on the owner's next check-in.

**2. A second, unrelated finding: "unattended launch autonomy" — checked against the docs, not
assumed.** The owner raised the idea of letting a session launch and run unattended ("owner is busy,
just go"). A docs check (code.claude.com / docs.claude.com — Claude Code + Agent SDK, 2026-07-28)
found the underlying capability **is real** at the Claude Code / SDK level: headless `claude -p` plus
a permission-bypass mode (`bypassPermissions` / `--dangerously-skip-permissions`) skips the
interactive warning dialog in headless mode; persistent pre-authorized allow-rules can live in
`.claude/settings.local.json`; and at the SDK level a parent session's `bypassPermissions` is
inherited by spawned subagents. **But the Dispatch launch path (`start_code_task`) has no documented
equivalent** — Dispatch's own approvals expire after roughly 30 minutes and re-prompt on every
launch.

⇒ Real unattended autonomy needs **either** the headless/SDK path — which is a **non-local
transport**, so it is gated on **S12-T**, the same non-local-transport re-verify already named in
the spec (§3.5/R-11) — **or** a future Dispatch feature that persists launch authorization across
launches. Recorded as spec §8 limit 8, and as its own queue tracking note under **CP2**, gated on
S12-T rather than treated as available today.

**Why both land in the same pass.** Neither finding required new spikes or new machinery — both came
from actually running the pending experiment (S7) and actually reading the platform's own
documentation instead of assuming (the launch-autonomy check) — the same discipline Protocol 51a
already requires of any Dispatch-origin claim before it is built on.

Full spec diff: `planning/control-plane/CONTROL_PLANE_SPEC.md` v2.2 → v2.3 (header banner, §0.3 row
8, §0.4 DISSENT 2, §1.2 S7 result block, §7.4 RESULT block, §8 limits 7–8, §10 Stage 4, §11 item 1).

<a id="cp2s12"></a>

### 2026-07-27 — S12 cleared: the "#1 missing gap" was already provided by the platform (spec → v2.2)

**The blocking gap that sent CP2's status backwards hours earlier is closed, and the answer was better
than the design that was going to replace it.** Evidence:
`planning/control-plane/evidence/S12_EVIDENCE.md`, with the reconciler prototype and its test suite
beside it.

**What the gap was.** The external review's most consequential finding — _"the spec hides it from
itself"_ — was that nothing carried a control-plane job id into a launched session. Every job-keyed
mechanism (L1, L2, L3's attribution, ghost detection, push-evidence attribution, termination's
"duplicate-loser") assumed a hook could answer _"which job am I?"_, and nothing could. v2 responded by
specifying an invented mechanism: mint an opaque `launchNonce`, smuggle it through the Code session's
launch title, read it back at `SessionStart`. That step was flagged in the spec as the specific
unproven one.

**✅ What the spike found instead — the platform already publishes the join key.**
`env.CLAUDE_CODE_HOST_SESSION_ID` equals `"local_"` plus the exact `session_id` Dispatch is handed at
launch. **3/3 subjects, exact match, present at the FIRST `SessionStart` firing** — no race on the
value itself. The child session's own id (arriving on the hook's stdin) is a **different** UUID in
every case, confirming the variable is genuinely the _launcher's_ identity and not an echo.

⇒ **The invented token is withdrawn as unnecessary.** Recorded rather than quietly deleted, because
the design that was avoided is part of the evidence: a home-grown token threaded through a _display
field_ would have been strictly more fragile than a variable the platform sets itself.

**⭐ The finding that changed the architecture, not just the mechanism.** The `SessionStart` hook can
fire **before Dispatch has recorded the launch id** — Dispatch only learns the child's id when
`start_code_task` _returns_, and that return races the child's own hook. There is no guaranteed
ordering. So a design that **gates** admission at `SessionStart` ("is my hostId in Dispatch's ledger
yet?") **false-negatives on exactly the legitimate case it exists to admit**: if the hook wins the
race, a real child is rejected as unbound.

**Admission is therefore reconciliation, not a gate.** Two independent append-only ledgers — the
hook's shadow record (`hostId`, child id, pid, procStart, cwd, ts), written unconditionally the moment
it fires; and Dispatch's launch record (`hostId`, jobId, generation, ts), including a launch-attempt
record with **no id** when the call times out before one comes back. Neither writer ever reads or
blocks on the other. A supervisor joins them on `hostId` later, whenever an ownership answer is
actually needed. That property is what makes the race harmless rather than merely unlikely — and the
timed-out-launch record is precisely what makes a ghost attributable afterwards.

**The binding logic: 12/12.** All four required cases — simultaneous duplicates (earlier timestamp
binds, later is the duplicate-loser), delayed ghost (matches no launch record ⇒ reported, ownership
refused), legitimate retry (higher generation binds, prior is superseded), and rerouted work
(classification is identical whether the tree changes or not, because binding never reads the tree) —
plus eight edges: malformed record on either side, one hostId with two session records, generation at
the cap, one hostId claimed by two jobs, launch-with-no-session-yet, empty ledgers, and purity. _The
suite was re-run independently while folding this in: 12 pass, 0 fail._

**⛔ The trap, recorded because it is the tempting shortcut.** `CLAUDE_CODE_HOST_SESSION_ID` is the
platform's **general** nested-session marker — a plain interactive session launched by anything carries
one too, pointing at whatever launched _it_, and `CLAUDE_CODE_CHILD_SESSION=1` is likewise present.
**Presence proves nothing about Dispatch; only an exact id-suffix match against a launch record proves
admission.** Taking presence as sufficient would attribute every nested session on the machine to the
control plane — the wrong-binding failure, reached by the easiest available route. Two hard invariants
follow: **refuse-on-doubt** (malformed, duplicate, or ambiguous ⇒ refused, never a best-guess bind),
and **alarm — not merely refuse — when the generation counter hits its cap**, because in production
that means a retry loop, and refusing silently would hide the loop while looking correct.

**A bonus finding worth its own line.** `~/.claude/sessions/<pid>.json` **does not exist yet when
`SessionStart` fires** — ENOENT, 3/3. Any hook that resolves session identity by reading that file at
start time is racy by construction. The environment variable sidesteps it entirely. This is now a
standing prohibition in the spec rather than a footnote, because the failure would present as
intermittent rather than obviously wrong. _(Dispatch reports the file lands ~326 ms later; the captured
dump carries no hook timestamp, so the ENOENT is what is proven here — not the magnitude. Recorded at
the strength the evidence actually supports.)_

**⚠ What stays open — S12-T, the non-local-transport re-verify.** All three subjects used the local
desktop launch transport (`claude-desktop`, Windows, build 2.1.219). A headless, remote, or CI launch
path may set the variable differently or not at all. Since deployment is Ally-only and every Dispatch
code session uses exactly that transport, **nothing in the program as it runs today waits on this** —
but it is a named gate in the spec, not a footnote. Scope is the **channel only**: the binding logic is
a pure function over two ledgers and is transport-independent.

**What this changes about the program.** S12 is removed as a blocker on Stages 1c, 3 and 5. The
critical path becomes `1a → 1b → 1c → re-probe → 1d → the worktrees decision → Stage 3` — **every
remaining item is a build or a decision; there is no longer a spike on it.** Buildable today with zero
blocked dependencies grows from `1a → 1b → Stage 2` to **`1a → 1b → 1c → Stage 2`**. In the spec,
platform-limit #6 ("no job identity at launch") is **struck** — the premise was false — and the
residual is re-scoped: R-8 shrinks from _"the mechanism does not exist"_ to _"the join key is an
undocumented environment variable"_, defended by adding it to the per-build re-probe; R-11 (transport
scope) and R-12 (the ENOENT prohibition) are new.

**⭐ The discipline point, because it cuts against the good news.** A cleared gate is **not a mandate**.
S12 removes an obstacle to building Stage 3; it says nothing about whether Stage 3 _should_ be built.
That remains Stage 1d's measurement to answer, and the open worktrees-vs-Stage-3 comparison is
untouched. The honest possible outcome of Stage 1 is still _"overlapping write attempts are near zero
— do not build Stage 3."_

<a id="cp2v21"></a>

### 2026-07-27 — CP2's spec went to v2.1 after an external review, and its status went BACKWARDS from "locked"

**The short version: a spec that had been recorded as "SPEC LOCKED" hours earlier was reviewed
externally, failed, and is now honestly marked NOT build-locked — while the first stage of it got
built anyway, read-only, and immediately found something.** Both halves matter. This entry records the
correction because a queue that claims something is locked when it is not is worse than a queue that
says nothing.

**What happened, in order.**

1. **v1 of `planning/control-plane/CONTROL_PLANE_SPEC.md` was written and `QUEUE.md` recorded CP2 as
   "SPEC LOCKED 2026-07-27"** (app commit `10f6263`).
2. **An external GPT review of v1 came back: "remain SPEC, NOT READY TO BUILD"**, pending ten
   corrections. It graded the **architecture B+** but the **six-stage execution plan C+**, citing
   "several dependency cycles", an over-claimed L3, and "one foundational join completely
   unspecified". Per-stage: Stage 1 **C**, Stage 2 **C+**, Stage 3 **C**, Stage 4 **B**, Stage 5 **B−**,
   Stage 6 **B+**.
3. **v2 folded in the ten corrections** as enumerated in the revision brief — archive commit
   **`d4399da`**.
4. **The verbatim review arrived afterwards** and was saved unedited at
   `planning/control-plane/reviews/GPT_REVIEW_01.md`. Reading it surfaced **four substantive findings
   the ten-point summary had compressed away**, so a second pass landed as **v2.1** — archive commit
   **`408be59`**. The version marker was bumped rather than overwriting "v2" with a different body,
   because two documents under one version label is precisely the drift this program exists to stop.

**⛔ The finding that moved the status backwards — S12, the job→session admission binding.** The review
called it "most consequential" and noted "the spec hides it from itself". Nothing carries a
control-plane `jobId` into a launched session; the platform's own session record
(`~/.claude/sessions/<pid>.json`) carries `pid`, `sessionId`, `cwd`, `procStart` and **no job field of
any kind**. So a hook firing in a fresh session knows _that it is a session in a directory_ and cannot
know _which job it is executing_ — and `cwd` cannot disambiguate, because the ghost case is two
sessions in the _same_ directory. Every job-keyed mechanism (L1, L2, L3's attribution, ghost detection,
push-evidence attribution, termination's "duplicate-loser") rests on a join that does not exist and has
never been tested. v1 wrote "claim the job" without ever specifying how the job is known. **Spike S12
must prove it against four cases — simultaneous duplicates, a delayed ghost, a legitimate retry, and
rerouted work — and every ambiguous case must REFUSE ownership rather than guess.**

**Why this is a success and not a setback.** The review did exactly what the spike campaign was
supposed to do and what this project's own discipline demands: it falsified a claim before anything was
built on it. Had CP2 stayed "locked", the containment layer would have been built on an identity that
cannot be established, and the failure would have surfaced as mis-attributed writes — the worst possible
place to find it. **A negative result before the build is the cheapest one available.**

**The other nine corrections, folded in.** Observe-only reconciliation moved from Stage 4a into Stage 1
(a ledger with no scheduled collector is a storage library, not an observer). Stage 2 was decoupled from
Stages 3 and 4 entirely. Stage 3's "seven quiet days" off-ramp — which the review called "mostly
theater" — was replaced with **measurable exposure against denominators** (writing jobs, launches,
launch timeouts, overlapping write attempts) plus the requirement to declare which residual risks are
**accepted** if Stage 3 is skipped. The re-probe gate widened from S1/S2/S6 to **all** load-bearing hook
behaviour **per live build** (the machine runs two builds at once under one shared config) and **before**
shadow collection, since re-probing afterwards contaminates the evidence. Adapter compatibility was
redefined as **N concurrent recognized shapes**, selected per record — and the separate, uncovered
problem was named: **adapters isolate disk records, not the hook's stdin payload**, so a changed
`PreToolUse` payload has nothing in its path to notice. L3 was relabelled from "fail-CLOSED" to
**"deny-by-default for handled hook execution; structurally fail-open when the hook does not
complete"** — it has no independent second guard, unlike L4/L5/L6 — and Stage 3 no longer claims to
_close_ the PLAN 0 source race, only to reduce it during healthy hook execution. The no-unique-work
precondition was restored to termination (a lease-loser can still hold unique changes, especially after
a hook fail-open). And the 4b notification spike was redefined end-to-end, after the finding that
**S7 as originally scoped tested an agent-session notification — which was never the open question**
and would have returned a green result proving nothing about the headless path.

**⭐ The coverage gap that invalidated the item-U justification.** The review caught that the incident
cited to justify L3 **happened in the archive**, that the spec routes the archive to L6, and that **L6
is acquired only by `sync.ps1` during a sync** — so two ordinary archive-writing sessions take nothing,
and hooks were specified for the app repo only. In its words, the arrangement **"protects sync from
sync, not archive-writer from archive-writer."** The exact incident remained uncovered. v2 adds a
coverage section with two options and a recommendation, plus the honest limit that **tool coverage ≠
resource coverage**: the hook sees a `Bash` call but cannot tell which tree `git -C <archive>` mutates.
v2.1 refines that further — `Edit`/`Write` targets _are_ usually inspectable and coverable cheaply;
arbitrary shell and MCP are not, and need a policy rather than a parser.

**✅ What got BUILT anyway — the Stage 1 substrate, read-only.** The passive-observation ledger and its
adapters are running at `C:\Dev\!RobCo\_RobCo-Control\`, in **its own private GitHub repo**
(`github.com/zerckzzyHD/RobCo-Control`) — code in `code/`, runtime state in the **sibling** `state/`
directory. The separation is deliberate and documented: `state/` holds lockfiles, and a committed lock
can be pushed, reverted or checked out, which would let a git operation delete a live lock out from
under its holder or resurrect a dead one. `.gitignore` belts that braces. **`ENFORCED: false`** —
nothing is blocked, denied, reaped or killed.

**⚠ A divergence from the spec, deliberate and now on record.** The spec (§3) still names
`%LOCALAPPDATA%\robco-control\` as the ledger's home; the build put it in `_RobCo-Control\state\`
instead. Both satisfy the actual requirement (outside both the app repo and the archive), and the
choice is documented in `lib/paths.js` — but **the spec's stated path is now stale doc**, and the real
consequence is that **two lock roots exist**: PLAN 0's `sync.ps1` still takes L5/L6 in the old location,
so the observer reads that directory **strictly read-only** to avoid reporting a fabricated zero for
lock detection. Repointing `sync.ps1` collapses the two roots and is a named follow-up.

**📊 The first real finding — the collision class is measurably non-zero.** On its second run the
observer recorded a **tree collision in this app repo**: two live sessions co-resident in
`C:\Dev\!RobCo\!RobCo-UOS`, seen twice. ⚠ **Stated precisely, because the spec is emphatic about this:
that is co-residency, not overlapping write attempts.** Two sessions merely open in one tree is not a
collision; two sessions _attempting writes_ into it in an overlapping window is. Separating them needs
Stage 1d shadow telemetry, which is not built — and conflating them would inflate the very number that
decides whether Stage 3 is worth building. Equally deliberate: three detections report **UNOBSERVABLE**
rather than zero (same-job ghosts and orphan jobs need Stage 3's job identity; stranded pushes need
Stage 2's push wrapper). **A fabricated zero would have been the worst possible output of an observer
whose entire job is to produce an honest denominator.**

**⭐ The open architectural question, recorded so it is decided on evidence.** The review graded
**Stage 6 (worktrees) B+ — the program's highest** — and suggested it "may deserve comparison with
Stage 3 earlier — stronger structural isolation". The brief's summary had dropped that comparison
entirely; only the verbatim review carried it. It is not a scheduling note: Stage 3 spends the
program's largest complexity budget (the admission join, three lock domains, a deny-by-default hook
atop a fail-open mechanism, a shadow phase, a per-build re-probe regime, a coverage policy for channels
no static check can read) to buy at-most-one-writer-per-tree — **which worktrees buy structurally, and
structural isolation cannot fail open, needs no re-probe when the CLI updates, and does not depend on
S12.** Against that: worktrees do nothing for the same-tree case (which is what item U actually was),
nothing for the archive, and nothing for L1/L2. **Stage 1d's telemetry answers it** by splitting
overlaps into same-tree vs different-tree. If different-tree dominates, Stage 6 should be promoted and
**Stage 3 may never need building** — a materially cheaper program.

**The lesson worth keeping, beyond this item.** A faithful ten-point summary of a review still dropped
four substantive findings, one of them architectural. **Review originals are kept verbatim from now on,
not just their digests** — `planning/control-plane/reviews/` exists for exactly that, and this entry is
the evidence that it earns its keep.

### 2026-07-27 — the big reorganization: the control-plane program takes the top of the board

A long work session produced more than `QUEUE.md` could hold, so this pass folded all of it in and re-ordered
the board around the owner's explicit call that the **workflow / control plane is the top priority**. **New
program at the top — CP1-CP5**, all of it labelled **PROPOSED / PLANNED / gated** because **none of it is
built**: the empirical **spike campaign** that must prove or _kill_ hook-based containment before anything is
written (it needs owner hands-on time — a quiesced window, an away-from-machine notification test, letting the
Ally sleep), the **staged build** gated on it (passive observation → push/sync wrappers → containment with
separate L1/L2/L3 leases → reconciliation + notifications → _proposal-only_ verified termination → optional
worktrees), an **immediate-mitigations** track that deliberately needs no control layer at all, the broader
**sync audit** across all three replication surfaces, and the **laptop-witness inventory** (recommendation:
witness first, not controller). The arc that produced it is recorded with GPT's adversarial correction intact —
**"proven" had been used for mechanisms never executed**, one lease cannot cover four lock domains, containment
buys at-most-one-_writer_ not exactly-once, and lease revocation is write-quarantine, **not** cancel.
**The museum moved up** out of the 2.8.5 tail into its own top-level section, second band, and gained five
items: **P10** (drop the hardcoded 10-stop tab bar — the owner identified it as leftover theme copy, so P8's
"no eleventh slot" constraint is **void**), **P11** (the Visual Web on P8's structure — `arcs.json` → arc spine
→ coverage view → radial web, cluster-first, never all ~1,450 nodes), **P12** (the Article Room), **P13** (a
⚠ security finding: a live email in a planning doc that the publish scan never covered) and **P14** (the live
site is stale — the republish). **Shipped and moved here:** **V** (the archive-sync repair), **W** (archive
organization fixes), **X** (the Exhibit relocation) and **P8**'s completed account. **A3 and A4 were moved
here too and then moved back**, deliberately: Suite **246.3** hardcodes `A3` as an ID it expects to parse out
of `QUEUE.md` and **246.5** requires a done-status item to exist there, so honouring the ahead-only contract
for those two turns the gate red. The fix is a `tests/` change this pass was scoped out of; it is recorded in
`QUEUE.md` beside them instead of being worked around silently. **Two owner wrap-up asks became items:** **Y** (memory-for-the-story reconciliation) and **Z** (an
evidence-grounded workflow explanation). Also corrected: the top-of-file status still said development was
pausing for a multi-week gap — the owner is **back on Max 5x as of 2026-07-27**, so that note is superseded in
place with its own date. Item **I** (the Atlas) now records that it **rides P11's graph renderer**, and item
**T** records its overlap with CP2 stage 4. No `APP_VERSION` / `CACHE_NAME` bump — queue files are not served.

### 2026-07-21 — A3 build attempt: feasibility wall (no JVM) + a premise correction

Attempted to build **A3** (the cloud round-trip test), the item recorded as the last thing gating 2.8.5. Built nothing — hit two blockers and recorded both in A3 in place (per Protocol 50) rather than shipping an unverified cloud-safety test. **(1) Hard environmental wall:** the Firestore/Auth emulators are Java processes and there is **no JVM** on the machine (`java` absent, `JAVA_HOME` unset, no JDK/JRE under Program Files, no bundled IDE JBR, `firebase-tools` not installed) — so the emulator-backed round-trip could not be run or verified, and the item's own red-then-green Hard rule forbids shipping it green unrun. Unblock needs an owner **JDK/JRE 11+ install** (a system install, not a dev npm dep) then `npm i -D firebase-tools` (dev-only, never precached). **(2) Premise correction — the failure mode A3 exists to catch does not exist in the current code:** there is no field-by-field cloud sync mapping; `cloud.js` stores the whole `robco_v8` container wholesale, and the load path's `sanitizeImportedContainer` (`Object.assign` copy) + `migrateState` (in-place, deletes only named legacy keys) both **pass unknown fields through**. So a new plain field round-trips losslessly through the project's own code — the only residual silent-drop is the **Firestore serialization boundary** (`undefined` strip, nested-array reject, doc-size), exactly the layer the real emulator is needed to observe. A non-emulator "round-trip" substitute would pass for any field and catch nothing (theater), so it was not shipped. Net effect: A3's blocking urgency on 2.8.5 is **reduced, not eliminated** — an owner call. No `APP_VERSION`/`CACHE_NAME` bump (docs only). The pass before — the QUEUE.md header-mangle hazard fix — is next below.

### 2026-07-21 — a Protocol 50 recording pass: the QUEUE.md header-mangle hazard

A Protocol 50 recording pass, one decision: the QUEUE.md header-mangle hazard (self-caught, commits `8dc9d5f` → `89bc6a5`) — root cause verified by reproduction, not assumed (Protocol 27): `prettier --write` left both the correct and the mangled header **byte-identical to their input**, so this was never a Prettier reformat side effect — it was a hand-authoring slip inside one dense, heavily-nested paragraph that stayed syntactically valid markdown while being factually wrong, so the gate's format check had nothing to catch. Full decision record (no guard / fix the structural class / revisit condition) lives in **R10**, filed under step 1 (the trusted-layer doc fixes), since that step was already scheduled to touch this file. **The structural fix rode in that same pass:** the header no longer wraps in one giant single-underscore `_..._` italic span — the construct that let an underscored identifier collide with the italic markers in the first place; verified clean against Prettier (`--check` passes, `--write` makes no change) with `APP_VERSION` and `CACHE_NAME` rendering correctly. No `APP_VERSION` / `CACHE_NAME` bump otherwise (no served file changed). Earlier passes are in the running history chain below.

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

<a id="g"></a>

### G. ✅ The blind workflow review — FULLY RESOLVED (2026-07-23)

**What it is.** A blind (independent, no-peeking-at-the-answer) review of the Dispatch three-model workflow
— is Fable/Opus/Sonnet actually pulling its weight, are the hand-offs clean, where does the process leak
or waste.

**What it depended on.** The four refreshes (F) — that's the whole reason F sat in front of it.

**New evidence for this review (2026-07-21).** A concrete session-management failure nothing in the documented
process anticipated: **concurrent sessions can fail each other's gates through the shared working directory**
(the full pre-push gate runs `npx eslint .` over the whole tree, so a concurrent session's untracked scratch
file failed another session's push while its commit had passed), and a Protocol 41 junk sweep **deleted a live
concurrent session's scratch files**. It **complicates the worktree-isolation claim** the workflow prompt
asserts. Recorded in `planning/_standing/WORKFLOW_REVIEW_PROMPT.md` §7 for the review to attack.

**The model roster — decided 2026-07-20, recorded here per Protocol 50 because it had lived only in
conversation.** The review went blind to **GPT-5.6 Sol** and **Gemini 3.1 Pro Extended**
independently, then Dispatch synthesized. Added for this ONE review: **DeepSeek as a third WITNESS, not a
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

**⚠ R11 cross-reference — left UNRESOLVED by this review, recorded honestly (verified 2026-07-26 against the
committed claim-ledger, `planning/audits/G_workflow_review/CLAIM_LEDGER.md`).** R11's own note asked this
review to rule on whether/when the knowledge graph should earn gating power (a Suite, a hook). The claim
ledger's only R11-adjacent finding concerns the ledger's own gating (a different question — whether
`CLAIM_LEDGER.md` itself should be gated, answered "no, deliberately ungated for privacy"). **The
knowledge-graph veto-power question R11 deferred to G was never actually ruled on.** R11 stays un-gated —
the safe default it already had — and the question remains open; a future session should not assume G
settled it.

**Done means:** a verdict on the workflow with concrete, checkable findings, run against the current
(refreshed) process; synthesized into a committed claim-ledger file; with DeepSeek's dissent preserved and
answered rather than averaged away. **✅ MET.**

**REVIEW RUN + REMEDIATION (2026-07-23).** All four sources are in
(`planning/audits/G_workflow_review/sources/` — GPT-5.6 Sol verbatim, Gemini 3.1 Pro, DeepSeek witness,
Claude/Dispatch), and the committed claim-ledger is built and repo-verified:
`planning/audits/G_workflow_review/CLAIM_LEDGER.md` (source-owned IDs, a disposition for every finding,
`file:line` evidence pointers, the spare-laptop dissent preserved as an owner-decision, and the
known-limitation — Dispatch is structurally the transcriber on this platform — labeled unsolved). NOTE:
the whole `G_workflow_review/` folder is under gitignored `planning/`, so it is durably preserved via the
Protocol 48 archive sync (verified present at `_RobCo-Archive/planning/audits/G_workflow_review/` as of
2026-07-25), not committed to the public repo (the ledger's own privacy placement is deliberate — it
critiques internal orchestration).

- ✅ **CLAIM A/C/D — CLOSED (the #1 confirmed+cheap+high-value fix).** The gate lint no longer runs
  `eslint .` over the whole working directory; it lints the **git-tracked manifest** (the files actually
  being committed/pushed) via `scripts/gate-lint-manifest.js`, on both the fast (commit) and full (push)
  gate. A concurrent session's untracked scratch file can no longer fail an unrelated push. Proven
  red-then-green (untracked scratch present → gate PASSES; a tracked lint error still FAILS) and locked by
  **Suite 244**. Protocol 41's deletion clause is rewritten concurrency-safe: delete only files THIS session
  created; surface all other untracked files, never delete while another run may be live. Cache `-r7 → -r8`;
  `APP_VERSION` unchanged.
- ✅ **The (b) governance bundle — CLOSED (2026-07-23).** The rules-layer changes from the ledger's §4(b)
  landed in `CLAUDE.md` + `rules/`: **Protocol 51** codifies the Dispatch authority boundary in three
  clauses — (a) proposals-are-hypotheses (edge-enforced: a repo-aware session records accept/change/reject
  for each Dispatch-origin hypothesis before implementing), (b) memory-is-a-locator-not-evidence, and
  (c) the grep-able `### DISSENT` block Dispatch must surface rather than smooth away. **Protocol 36(b)** is
  rewritten as a causal-response bar (permanent enforcement only when the failure can realistically recur,
  at the correct layer, zero false positives, tests the shipped artifact, cheaper than the recurrence — a
  new guard's record must name incident/why-not-the-direct-fix/enforcement-point/FP-analysis/cost/retire
  condition), keeping Protocol 49 as the complement and Protocol 13/42 as the demonstrated-recurrence cases.
  **`rules/memory-restore.md`** is the new fresh-Dispatch rehydrate runbook (Protocol 48's restore
  complement — CLAIM V), wired into the retrieval map + pointer index. No cache bump / no `APP_VERSION`
  change (internal governance docs, not served); no CHANGELOG entry (not user-facing).
- ✅ **The (a) "now" bucket — CLOSED (2026-07-23).** The last (a) item, the **post-deploy release receipt**
  (CLAIM M — "pushed ≠ live"), shipped as `scripts/release-receipt.js` / `npm run release-receipt`: it
  fetches the LIVE prod build and asserts the served `CACHE_NAME` (sw.js) + `APP_VERSION` (js/core/state.js)
  match the deployed commit; a mismatch FAILS loudly (the silent-stale-SW class). It is a **manual
  post-deploy command, not a gate step** — the code isn't live at push time and the gate has no guaranteed
  network — but its pure compare/extract core is gate-tested red-then-green (**Suite 245**). The receipt
  names the owner-only real-device checks (installed-PWA upgrade, save survival, auth) and leaves them to the
  owner. Built as the **FOUNDATION** the 2.9.0 hardening-gate "Post-deploy TRUTH" item extends (Protocol 22),
  not a parallel build — see that item's note + R5's deploy-protocol candidate. Cache `-r8 → -r9` (CHANGELOG
  touched); `APP_VERSION` unchanged. **With this, all three (a) confirmed+cheap fixes are done** (CLAIM
  A/C/D gate-lint scoping, the (b) governance bundle, and now the release receipt).
- ✅ **The owner-decisions — ALL SETTLED (2026-07-23).** The three §4(c)
  calls are decided and recorded: (1) **spare laptop → DEFERRED / parked** (fix isolation in software first —
  done via CLAIM A/C/D; the laptop is only ever an optional notifier/accelerator on a clean checkout, never
  the gate); (2) **DeepSeek → occasional witness, not a standing stage** (blind hostile-witness for a specific
  review, never a required leg); (3) **report cadence → ADOPTED** and codified into **Protocol 9** (immediate
  proactive report for completions / owner-decisions / anomalies; routine all-green intermediate landings
  batch into the next check-in; **batched ≠ dropped ≠ compressed** — cross-referenced to the anti-compression
  discipline so it can't be read as license to summarize-down). **Nothing left in G**: all (a) confirmed+cheap
  fixes shipped (gate-lint scoping A/C/D, release receipt M), the (b) governance bundle shipped (Protocol 51,
  36(b) causal-response bar, memory-restore runbook), and all three owner-decisions settled. The committed
  claim-ledger + verbatim sources live under `planning/audits/G_workflow_review/` (archive-preserved). **G is
  done — except for the R11 gating question above, which this review never actually addressed.**

<a id="s"></a>

### S. ✅ PWA install discoverability + the guided FO3 reinstall flow (Option 1) — SHIPPED, confirmed on PRODUCTION (2026-07-22)

**Context (2026-07-22).** 2.8.5 fixed the manifest so the FO3 Pip-Boy landscape screen is reachable
(`orientation: portrait` → `any`). But Android bakes the manifest into an **already-installed** PWA and never
refreshes it, so anyone who installed **before 2.8.5** stays portrait-locked — rotation is dead for them until
they remove-and-re-add the app. The owner hit this and confirmed a fresh install fixes it; his brother (the
priority user) will hit the identical thing and won't read a changelog. Two pieces came out of this:

**Install discoverability.** The install action used to live
only as a hidden button buried in the Module Bay → Security & Configuration → SVC TRAY, surfaced only once the
browser fired `beforeinstallprompt`, so it was effectively undiscoverable. Added a slim, in-theme, **dismissible
top strip** (`#installBannerTemplate` → `_showInstallBanner()`, `js/ui/ui-core-modulebay.js`) that offers a
one-tap INSTALL. It is **fail-safe and non-naggy by construction**: it renders ONLY on the real
`beforeinstallprompt` signal, ONLY when not already installed, and ONLY when not previously dismissed
(`robco_install_prompt_dismissed`, a `META_MANIFEST` device pref — the dismissal remembers, Protocol UI-6). It
reuses the existing `installPwa()` action (Protocol 22) and keeps the SVC TRAY button as the permanent home
(Protocol 25 — a surface added, not a control relocated). Never appears inside the installed PWA. Guarded by
Suite 243 (inert-template + all three gates + persistence) and added to Suite 217.5's banner allowlist.
Because the strip surfaces the install/reinstall path, it **also** partially serves the stale-install case
below (a reinstall is now one discoverable tap away).

**🔒 Why it is a CONDITIONAL tip, not an auto-firing "you're on a stale install" nudge — the detection
finding that shaped the design (recorded so it is not re-attempted blind).** An auto-firing nudge was
deliberately NOT built, because **a stale-locked install cannot be reliably distinguished from a fresh install
without a common false-positive.**
While the phone is held in portrait, `matchMedia('(orientation: landscape)')` is false in BOTH the stale-locked
case and the ordinary held-in-portrait case — there is no passive signal that separates them. The only
distinguishing observation needs the device physically rotated to landscape while the viewport stays portrait,
which requires the accelerometer (`DeviceOrientationEvent`) — and that **misfires for the very common
"OS auto-rotate turned OFF" population**: on a _fresh_ install with auto-rotate off, the accelerometer reads
landscape while the viewport stays portrait, so an accelerometer-based detector would wrongly tell those users
to reinstall (which would not help them). A nudge that fires for people who don't need it is worse than no
nudge — so the surface never asserts a fault; it says "if it won't rotate" and is scoped to the population that
could plausibly be affected. (No web API exposes the OS auto-rotate toggle, so that false positive cannot be
filtered — the reason the accelerometer route is out.)

**Option 1 — the guided one-time conditional tip + deep-link + reboot-persistent highlight (owner
chose Option 1 on 2026-07-22).** The owner picked the one-time tip over the
passive HELP line (2) or doing nothing (3), because his non-technical brother must _discover_ he needs to
reinstall and a passive option he'd never find is too weak — balanced against the tip being engineered to not
annoy the many. What shipped:

- **The tip** (`#fo3ReinstallTipTemplate` → `_maybeShowReinstallTip()`, `js/ui/ui-core-modulebay.js`): a small,
  dismissible, in-theme card shown **once**, and ONLY when all three gates pass — running as the installed
  standalone PWA (`_isStandaloneInstalled()`), the active game is FO3 (`getGameContext() === 'FO3'`), and it
  has not been seen (`robco_fo3_reinstall_tip_seen`, a `META_MANIFEST` device pref). Never in a browser tab,
  never for New Vegas, never twice (marked seen on show, not only on dismiss). Conditional wording
  ("Won't rotate? … reinstall to unlock it") + the three written steps (remove → reopen in browser → INSTALL)
  - a **COPY SITE LINK** button that copies the `./#go=install` deep-link.
- **The deep-link + reboot-persistent highlight** (`SHORTCUT_ROUTES.install` in `ui-core-nav.js` →
  `_armInstallHighlight()`; applied by `_applyPendingInstallHighlight()` inside `_showInstallBanner()`). Opening
  `./#go=install` in a browser sets the **durable `robco_pending_install_highlight` arm**; when the install
  strip appears it pulses (a plain, reduced-motion-safe animation — Protocol UI-9) and the arm clears so it
  fires exactly once. **The arm — not the hash — is what survives the "REBOOT TERMINAL" update reload**, because
  `routeLaunchShortcut()` strips the `#go=` hash on arrival (existing behaviour, unchanged per Protocol 25); the
  arm is set before any reboot and re-checked when the strip re-appears after it. Guarded by Suite 243.9–243.16
  (inert template, all-three gates, seen-on-show, route-arms-highlight, both prefs registered, fires-once,
  reduced-motion-safe, boot-order), the fail-safe gate proven red-then-green.

**⚠ The honest limits, unchanged — walked in words where the mechanism can't (owner-accepted):**

1. **There is NO install button inside the installed PWA** — `beforeinstallprompt` fires ONLY in a browser tab.
   So the tip (which lives in the installed PWA) can't deep-link to a strip _there_; it hands off to the browser
   via the copied link, and the highlight fires once they're in the browser.
2. **The PWA→browser hop cannot be automated** — a same-origin link from inside the PWA opens in the PWA, and
   re-adding to home screen must happen from the browser. This is the step left as a **written instruction**
   (remove → reopen in browser → INSTALL). We did not fake automation we can't do.
3. **The real fix needs a REMOVE first**, not just a re-add — reflected as step 1 of the written instructions.

**✅ CONFIRMED ON PRODUCTION (corrects the record, 2026-07-26).** This shipped to `dev` 2026-07-22 and the
queue originally recorded "nothing here is on production yet — ship timing is the owner's call." **That was
never updated after the fact:** the same day, this landed on `main` as the `v2.8.5-r6` hotfix merge (commit
`befd643`, `Release v2.8.5-r6 hotfix: install strip + guided FO3 reinstall`), confirmed live via `main`'s own
`sw.js` (`CACHE_NAME = 'robco-terminal-v2.8.5-r6'`) and `CHANGELOG.md` `### Hotfix` block naming both features
verbatim. The only thing NOT automatable (the OS opening a browser from inside the PWA) is covered by the
written steps, as the owner accepted. **S is fully shipped, on production, nothing left open.**

<a id="h"></a>

### H. ✅ CLOSED — the optional system-model review (owner-approved verdict, 2026-07-26)

**Status: CLOSED, not run.** Ruled redundant rather than deferred further — the standing obligation H
itself carried ("after G completes, Dispatch owes the owner an explicit yes/no on whether H is still worth
running, with reasons") is discharged here.

**What it was.** An OPTIONAL external review of the project's system MODEL (its representation of itself —
the brain dump, the library, the docs a session actually reads to build its model of the project), kept
small and question-scoped. It was never run; it sat DEFERRED pending G's results from 2026-07-21.

**The verdict, and why.** H is redundant with two reviews that between them already cover what H asked:

- **G** (the blind workflow review, [account](QUEUE_LOG.md#g)) — reviews the **PROCESS**: is the
  three-model workflow pulling its weight, are the hand-offs clean, where does it leak.
- **R10** (the external knowledge-architecture audit) — examined the **representation/retrieval layer**
  itself: how the docs are structured, cross-referenced, and retrieved. This is the half of H's question
  ("is your model of yourself accurate") that G's process focus does not reach, and R10 already covers it.

**The one sliver H uniquely covered — raw brain-dump accuracy against the live codebase — is judged
low-value post-2.8.5 re-baseline**: the brain dump was re-pinned against a clean, current commit at R4
(2026-07-20), so a fresh accuracy pass over material that was just re-baselined returns little a session
reading the code directly wouldn't already catch (per this repo's own standing rule that code beats
documentation — Protocol 3).

**Done means:** a yes/no on running H, with reasons, recorded and owner-approved. **✅ MET — no, not worth
running; closed.**

---

<a id="d"></a>

### D. ✅ THE TEST_CATALOG GENERATOR — Protocol 47 shipped, the GENERATED class fulfilled (2026-07-27)

**What it is.** `library/TEST_CATALOG.md` was GENERATED-class **in intent** since the 2.8.5 U-B1 relocation
but hand-synced in practice, and drifted twice. This item builds the generator that produces its per-suite
content directly from the test runner and gate-diffs it against the local copy — the first real instance of
"generate what a script can compute," and the plumbing the Atlas (item I) reuses directly.

**Shipped:**

- **`scripts/generate-test-catalog.js`.** Parses every `header('…')` call in `tests/robco-diagnostics.js` as
  a suite boundary. A suite whose header is re-emitted later (a deferred async proof re-announcing itself
  before its result line — Suites 76/137/196/207/220/228, etc.) is captured once, at its first occurrence.
  For that occurrence, the nearest contiguous run of `//`-comment lines immediately above it is captured
  **verbatim** as the suite's narration — the runner's own build history, written when the suite landed. A
  suite with no such comment gets an honest "no header comment on file" note rather than a fabricated one.
  Both the numbered "Suite N —" convention (180 suites) and the legacy unnumbered suites that predate it
  (74 suites, e.g. "Parser sanity") are captured — 254 suites total, replacing a hand-written file that had
  degenerated into a handful of multi-thousand-character prose paragraphs.
- **The gitignored-`library/` gate-diff, resolved the same way Protocol 46 resolved it for
  `library/MANIFEST.txt`.** `library/TEST_CATALOG.md` never existed in git at all (only `MANIFEST.txt` is
  the committed exception to the `library/*` gitignore) — so "diff against the committed copy" was never
  literally possible. `--check` treats **absence** as success (a clean CI checkout, or any machine without
  the local `library/` tree, has nothing to diff against and can never fail here) and **presence-and-drift**
  as a real failure. `scripts/gate.js` runs `npm run test-catalog:check` on **both** `gate:fast` and the full
  `gate` (pure Node, zero external dependency, same placement as the A3 cloud-serialization guard) —
  harmless everywhere the file is absent, load-bearing on the one machine (the owner's) where it exists to
  drift.
- **No test COUNT anywhere**, consistent with Protocol 2a's retirement — only qualitative per-suite content
  is generated.
- **Suite 247** (Node runner) proves the real extraction against the real runner file: a large,
  de-duplicated parse; both title conventions captured; a re-emitted header de-duplicated to its first
  occurrence; a suite with real narration (58) captures it verbatim while a genuinely bare suite (170) gets
  the honest fallback; and the real `--check` CLI end-to-end (absent → exit 0, current → exit 0, stale →
  exit 1) against a throwaway path (`ROBCO_TEST_CATALOG_OUTPUT`, added to the generator so the test never
  touches the developer's own local file).
- **Suite 220's Protocol 47 forward-reference retired in the same commit (Protocol 42).** Protocol 47 was
  named by number in `CLAUDE.md`'s 3-class library model before its heading existed, and Suite 220.9/220.10
  carried it as the one sanctioned allowlisted forward-reference. Landing the real heading
  (`rules/docs-and-library.md`) meant `REF_ALLOW_220` had to empty in the same commit (Protocol 49 — retiring
  a forward-reference removes its allowlist entry, not just its "reserved" prose) — which would otherwise
  have broken 220.10's old assertion (pinned to Protocol 47 specifically having nothing left to allowlist).
  Found while verifying this change, so fixed here rather than worked around: 220.10 now proves the
  allowlist-note formatter's honesty against a **synthetic** hit, decoupled from whether any real
  forward-reference exists in the docs at a given moment — arguably better regression coverage than the
  original, which would have silently gone stale the moment its one real example resolved.
- **A second flaw caught live, at this very feature's own first push (Protocol 42).** The generated file's
  commit/branch/date stamp legitimately changes on every commit, including ones that never touch the runner
  — so the first version of `--check` (diffing against a freshly re-derived stamp) failed on the push that
  landed this very feature, for a HEAD that had simply moved with no suite content change at all. Fixed in
  the same commit: `--check` now recovers the on-disk file's own stamp (`extractMeta()`) and compares
  against **that**, so only a real change to a suite's title or narration is ever reported as drift. Locked
  by **247.10/247.11**.

**Why it doesn't hand-maintain a preamble either.** The generated file's own header stamps the commit,
branch, and (git-derived, not wall-clock) generation date — the same discipline the old hand-written
BASELINE PIN followed, but now produced by the script instead of a session remembering to update it. That
stamp is free to lag between deliberate regenerations (see the stamp-drift fix above) — only the per-suite
content underneath it is the thing `--check` actually guarantees is current.

**Done means:** met. `library/TEST_CATALOG.md`'s per-suite content is regenerated from the runner and
gate-checked against the local copy; no human hand-edits it again.

---

<a id="u"></a>

### U. ✅ The generate-vs-hand-maintain audit — the generalization of D (SHIPPED 2026-07-27)

**What it is.** A focused ANALYSIS audit that finds every remaining HAND-MAINTAINED artifact in the project
that should instead be GENERATED — the generalization of **D** (Protocol 47, the TEST_CATALOG generator) and
the `library/MANIFEST.txt` gate (Protocol 46). The project's own ethos, stated plainly: **generate what a
script can compute.** Hand-maintenance drifts — the retired test-count bookkeeping (Protocol 2a) and the
now-generated TEST_CATALOG are the two precedents already on file, one a removal, one a replacement.

**Method.** Survey the repo and docs for candidates — e.g. `CLAUDE.md`'s retrieval map, `library/CODE_MAP.md`,
`README.md`'s feature tables / Current-State section, `ARCHITECTURE.md`'s Table of Contents, the Atlas's
planned inputs (item I), and any other count/table/list a session currently hand-types. For **each**
candidate, judge exactly one question: **is it computable from source with ZERO false positives?** A **YES**
gets generated and gate-diffed against the on-disk/committed copy (D's shape); a **NO** stays hand-maintained
with the reason recorded, explicitly — a "no" is as valuable an answer as a "yes."

**Output.** A triaged list — candidate → computable? → verdict + one-line why —
(`planning/2.8.5/audits/GENERATE_VS_MAINTAIN_AUDIT.md`, ARCHIVE-class, frozen as of 2026-07-27) — followed
by implementing the clear wins directly under this item across dated batches rather than as separate lettered
follow-ups, a deliberate deviation made because each win was small and self-contained enough that a separate
item letter would be pure bookkeeping overhead.

**Shipped, across four dated batches (all landed 2026-07-27):**

- **Batch 1 (Suite 248/249 + 2 live-drift fixes).** Landed candidates **#4** (`QUEUE.md` → `QUEUE_LOG.md`
  anchor integrity) and **#5** (`QUEUE.md` item-ID uniqueness) as Suite 248, and **#9** (`CHANGELOG.md`
  `Cache:` header vs `sw.js` `CACHE_NAME`) as Suite 249. Candidate **#3** (`ARCHITECTURE.md#anchor`
  integrity) turned out to already be shipped as Suite 220.16 (R10 Step 3) — re-verified against the live
  repo rather than rebuilt. Also fixed Live Drifts **#1** (README device-capability count contradiction) and
  **#2** (`library/CODE_MAP.md`'s stale Protocol 47 re-pin).
- **Batch 2 (Protocol 52 + Live Drift #3).** Landed candidate **#1**, the audit's own headline win:
  `ARCHITECTURE.md`'s Table of Contents is now GENERATED (`scripts/generate-architecture-toc.js`, `npm run
architecture-toc` / `architecture-toc:check`, gate-wired both fast+full, Suite 250) — see **Protocol 52**
  in `rules/docs-and-library.md`. Also completed **Live Drift #3**: stripped the ~20 leftover
  `Suite N (…, X tests)` count fragments from `ARCHITECTURE.md` that the Protocol 2a retirement (R3) had
  missed everywhere else.
- **Batch 3 (Protocol 53, Suite 251).** Landed candidates **#6/#7/#8**: `library/CODE_MAP.md`'s Diagnostic
  Shell registry table, Render Pipeline per-file function lists, and Event Bus emitted-event-name list are
  now GENERATED (`scripts/generate-code-map.js`, `npm run code-map` / `code-map:check`, gate-wired both
  fast+full, Suite 251) — see **Protocol 53** in `rules/docs-and-library.md`. Also fixed two housekeeping
  items found in passing: deleted a leftover untracked scratch file (`queue_log_anchors.txt`, repo root) and
  corrected `rules/deploy-and-cache.md`'s Protocol 1 prose to name `CHANGELOG.md` as a served/precached file
  (it already was per `scripts/cache-bump-guard.js`'s `SERVED_RE` classifier — the prose just never said so).
- **Batch 4, the closing batch (Suite 252 + the owner-decided fork).** Landed the audit's remaining
  low-priority tail plus the one candidate the audit deliberately left as an owner judgment call rather than
  resolving unilaterally:
  - **#2 — File Map reverse-completeness.** New Suite 252.1 asserts every tracked source file (`js/**/*.js`
    excluding `js/vendor/` — already excluded from every js-file scan in the runner by established
    convention, since it's a manually curated third-party precache allowlist, not app source — plus
    `css/*.css`, `scripts/*.js`, `tests/*.{js,mjs}`) is named somewhere in `ARCHITECTURE.md`'s File Map, by
    basename substring. **Building this check immediately found real drift (Protocol 42):** roughly a dozen
    scripts (`gate.js`, the three `generate-*.js` generators, `queue-view.js`, `release-receipt.js`,
    `backup-nudge.js`, `queue-drift-check.js`, `check-boot-chain.js`, `cloud-serialization-check.js`,
    `emulator-round-trip-check.js`, `gate-lint-manifest.js`) and tests (`arch-conformance-check.js`,
    `a11y-check.mjs`, `offline-first.mjs`, `test-html-check.mjs`, `browser-server.mjs`, `browser-shared.mjs`,
    `static-server.mjs`) plus the vendored Tesseract.js bundle's real filenames had never been added to
    `ARCHITECTURE.md`'s File Map. Fixed in the same commit before the check was allowed to ship — it never
    shipped red.
  - **#10 — CHANGELOG category-heading ordering.** New Suite 252.2 asserts each `CHANGELOG.md` version
    block's present Protocol-21 category headings (Added/Fixed/Changed/Improved/Under the Hood) appear in
    their fixed relative order, skipping empties. Deliberately narrow: categories outside that five-item set
    (Hotfix, Deprecated, Removed, Security — Suite 97's wider recognized category set) are excluded from the
    ordering check rather than forced into a position Protocol 21 never specified for them.
  - **#12 — README css-file count.** New Suite 252.3 asserts README's "N order-prefixed files" digit matches
    `css/`'s real file count.
  - **#14 — README version vs CHANGELOG.** New Suite 252.4 asserts README's "Current version: X" line and
    its "Current State (vX)" heading both match `CHANGELOG.md`'s latest non-`[Unreleased]` header.
  - **#13 — the fork (owner decision: DELETE, not a third check).** README carried a **third** hand-copy of
    the same script load-order list already gate-checked between `rules/file-layout.md` and
    `ARCHITECTURE.md` (Suite 220.3/220.4's `LOAD-ORDER-GUARD`), with no guard markers of its own and outside
    either suite's scanned file list. The owner chose the audit's own recommendation — **delete the copy,
    point at the guarded original** — over adding a third check to keep three copies in lockstep (Protocol
    36b: eliminate a failure class rather than extend machinery to police it). README's "Script Load Order"
    section now states the load-order narrative and points readers at `rules/file-layout.md`'s canonical,
    machine-checked list.

**Done means:** met. Every actionable GENERATE candidate from the audit's own ranked list is now shipped (14
of 14 triaged items resolved — the KEEP-list entries were decisions, not open work). The audit document
itself (`planning/2.8.5/audits/GENERATE_VS_MAINTAIN_AUDIT.md`) stays ARCHIVE-class, its snapshot framing
proven correct throughout: several of its cited counts, and even one candidate (#3), had already drifted or
shipped by the time each batch re-verified them against the live repo — exactly what its own dissent note
warned would happen.

---

<a id="l"></a>

### L (private view). ✅ A generated, private HTML view of THIS queue — SHIPPED & OWNER-CONFIRMED (built 2026-07-23, sign-off 2026-07-27)

**What it is.** `QUEUE.md` is the file the owner steers the project from — generate an HTML view of it that
reads comfortably on a phone. This is the **private half** of item **L**'s two-view ruling. The item keeps
its ID and stays open in `QUEUE.md` for the still-deferred player-facing public half (post-P2) — only this
shipped, owner-confirmed half moves here (Protocol 49 discipline: a partially-shipped item's ID never
splits or renumbers).

**The ruling — ONE SOURCE, TWO GENERATED VIEWS.** `QUEUE.md` stays the single source of truth; two separate
generated views read from it: a private view for the owner (this account, shipped) and a player-facing view
for the live site's already-queued "upcoming updates" feature, generated later from **only** items
explicitly marked public, opt-in never opt-out (still open — see `QUEUE.md`'s item L).

**Shipped.** `scripts/queue-view.js` (`npm run queue-view`) parses `QUEUE.md` and emits a single
self-contained, offline, phone-first HTML page to the gitignored `queue-view/` (generator tracked, HTML
regenerated on demand — the same generation-over-maintenance discipline as `library/`; not
served/precached, so no cache concern). It renders the queue **unfiltered / in full** (the private owner
view — ONE SOURCE, `QUEUE.md` stays the source of truth). Phone-first UX: a sticky **status filter**
(⏭️/🔄/⚠️/⬜ shown, ✅ hidden by default), **collapsible items** (tap to expand full reasoning) with
prominent stable **ID badges**, long section prose behind a **"context" toggle**, a **section jump-nav**,
and a **"what's next" band** surfacing the active/ready work at the top. **Deterministic** (same
`QUEUE.md` → byte-identical HTML), **rendered and verified at 360px** (no horizontal overflow,
filter/collapse/nav all work), and guarded by **Suite 246** (parser + markdown-render determinism, incl.
red-then-green locks for the double-backtick and wrapped-bold render bugs found during verification).

**✅ Owner sign-off landed (2026-07-27).** The 360px verification above was Dispatch's own DOM check; the
one thing still missing was the owner's own eyes on his actual phone. He opened the generated page and
confirmed it reads right ("it looks good", 2026-07-27) — the private view's Definition of Done is now fully
met, not just Dispatch-verified.

**Why the two views are not merged into one document.** This file's value is that it records rejected
options, hazards, and reasoning — not just current status. A single merged document either leaks that
reasoning to players or gets sanitized until it stops being useful internally.

**Done means (private view): ✅ MET** — built 2026-07-23, owner-confirmed 2026-07-27. A generated HTML
page, readable on a phone, reflects the current `QUEUE.md` in full, and the owner has personally confirmed
it reads right on his own device (`npm run queue-view` → `queue-view/queue-view.html`).

---

<a id="p8"></a>

### P8. ✅ Story-material + STRUCTURE synthesis audit — SHIPPED 2026-07-27 (both deliverables filed in the archive)

**✅ RESOLUTION (2026-07-27) — run as a Claude session against the private archive, exactly as the spec below
required. Both deliverables are filed at `_RobCo-Archive/audits/museum/`:**

- **`2026-07-27_P8-story-corpus.md`** — the story corpus. Five read-only passes over disjoint clusters, then
  synthesis and de-duplication: **126 memory files read in full**, 596 planning files inventoried (~55 read in
  full), **all** bug and graveyard records, **all 63** numbered protocol entries, `QUEUE.md` (2,845 lines),
  `QUEUE_LOG.md`, `CHANGELOG.md`, the archive audits, and read-only git in both repos. **175 raw arcs
  de-duplicated to 146 canonical arcs**, in fifteen groups, each carrying its source arc IDs so the underlying
  material stays traceable. It opens with a **PII firewall** — a by-path map of where the archive retains the
  owner's real identity, with none of the values reproduced — and that firewall is what surfaced the finding
  now tracked as **P13**.
- **`2026-07-27_P8-structure-and-connection-map.md`** — the structure and connection map, read from
  `museum/generate.mjs` (4,004 lines) and the emitted `museum/site/` tree rather than from any prior session's
  description of them. It inventories every room, page type and navigation edge (12 rooms built, 687 HTML
  pages, 34 MB), and specifies the **node/edge schema** the Visual Web will render as an explicit **superset of
  the shipped `library/knowledge-graph.json`** (schema 2.0.0 over R11's 1.x) — 14 new node kinds, 21 new edge
  types, projected ≈1,450 nodes / ≈2,200 edges.

**The finding that reshaped the build order — and it is the reason P11 starts where it does.** The museum is a
**star topology**: lobby plus tab bar out to each room, with **no room→room edge, no doc→doc edge, and exactly
one cross-room content edge in the whole site**. Every real relationship — which bug produced which guard,
which lesson drove which protocol — lives in **prose**. **The Visual Web is therefore a DATA problem, not a
rendering problem; building the renderer first would produce a beautiful picture of a star.** Hence P11's Stage
0 (`arcs.json`) as the prerequisite, and the four-stage sequence that follows it.

**Two open build decisions it surfaced, and where they went.** The "no eleventh nav slot" constraint became
**P10** — and was **resolved the same day** by the owner, who identified the ten-stop tab bar as leftover
RobCo-theme copy rather than a design invariant, voiding the constraint the map recorded as hard. The
**motion-as-exhibit-behaviour** question remains genuinely open for the owner.

**Honest caveats the audit states about itself, preserved:** it is a Claude session auditing Claude-built work,
so it shares those blind spots; and every count in the schema marked _projected_ is a sizing estimate from
counted entities, **not a measurement of a graph that exists**.

**Done means:** met — both outputs exist, filed at the established archive audit path, and are the input to
**P11**. The original spec follows verbatim.

---

**The original spec, verbatim as it last stood in `QUEUE.md`:**

### P8 (spec). ⬜ Story-material + STRUCTURE synthesis audit — the story corpus AND the room/structure/connection map (PARKED, not started; owner, 2026-07-24, scope-expanded 2026-07-25)

**What it is.** A pass that **gathers, organizes, and synthesizes literally every story beat** the museum
could ever draw from, into one curatable corpus, so the owner curates the exhibits from the FULL material
rather than whatever a session happens to remember. **Scope (owner's words): "literally everything story-wise,
no lookup-able PII."** Sources to sweep: orchestrator **memory**, `planning/`, the **bug→guard** records, the
**graveyard**, the archive **audits**, **`QUEUE_LOG.md`**, and every **protocol's origin incident**.

**Explicit beats to fold in (named so they aren't lost):**

- The **OneDrive/Antigravity pivot** (the P7 origin arc — the two are related; P8 is the corpus, P7 is one
  exhibit drawn from it).
- The **wrong-tool incident**: a git/deploy task was launched as a **sandboxed Dispatch** session that
  **couldn't push** (no network route / no `gh` / no Chromium), had to be **re-routed to an on-machine Code
  session**, and the lesson **became a rule** (know the execution tier before dispatching git/deploy work).
- The **development PAUSE** for the **apartment move / subscription frugality** (see the STATUS note up top) —
  an honest "the project stopped for real-life reasons" beat.
- The **independent-convergence arc** — a 2026 wave of external guides now teaches, as novel technique, the
  multi-agent architecture RobCo had ALREADY built without a guide. (Full source map + thesis in the ⭐ block
  directly below.)

**⭐ A MUSEUM ARC — RobCo independently converged on (and on verification, EXCEEDS) the architecture the 2026
guides now teach (owner observation, 2026-07-25).** A wave of external write-ups describes as _novel technique_
the multi-agent architecture this solo, free-tier project had already built without a guide. Recorded as story
material — **CITE + MAP the titles; NEVER dump external copyrighted content into the museum** (at most a short
attributed quote; the mapping is ours):

- **"Loop Engineering"** (qibaz, X, Jul 2026) → RobCo already has it: the **plan → implement → gate → audit
  ratchet loop** plus the **self-improving gate** as the verification harness — the exact ingredient the
  article says most people skip.
- **"Graph Engineering"** (an 11-page synthesis of Karpathy's autoresearch ratchet-loop + AgentHub's "the DAG
  IS the graph" + Anthropic's Knowledge-Graph cookbook; X, Jul 2026) → its staged path is **"one measured loop
  → typed knowledge graph → graph-grounded swarm,"** where the graph externalizes shared facts / provenance /
  cross-session memory and the evaluator checks claims against graph edges ("triple not found" beats "seems
  off"). RobCo already has: **R11** (independently-derived typed edges; drift surfaces as data), the
  **provenance discipline** (every fact links to its commit), **"green is scoped evidence, not proof,"** the
  persistent **memory / queue / archive as the cross-session shared brain**, **git-worktree per-session
  isolation**, and **`CLAUDE.md` / rules / protocols as the "program.md that programs the program."**
- The earlier **second-brain / visual-brain / "the last prompt you'll write"** threads — same pattern, same
  convergence.

**The thesis point (why this is a museum ARC, not just a note).** RobCo **independently converged on** — and on
the **verification harness, EXCEEDS** — the architecture these guides now teach, as a **solo, free-tier
project.** The ONE deliberate omission is **SCALE** (the 1,000-agent swarm): a solo / free-tier / owner-control
**choice, NOT a gap.** This is direct evidence for the self-maintaining-system thesis — **the discipline was
principled, not accidental.** **Owner's words, preserved:** _"all these guides are out there yet we've already
done it all without a guide — just me and you."_

**⭐ SCOPE EXPANSION (owner, 2026-07-25) — the audit is ALSO the layout blueprint, not just story content.**
Beyond the story corpus, this audit must **catalog every existing museum ROOM + the whole site structure** —
what each room holds and **how they connect** — so its output **doubles as the layout blueprint for a
redesign** (feeding the archive-native nav design direction + the Fable pass under P), and must **map the
CONNECTIONS** (the facet-2 connections map, Part C) so the connection-layer / Visual Web builds from a **real
inventory** rather than a guess. **TWO OUTPUTS, then:** (1) the **story corpus** for curation; (2) the **room +
structure + connection map** for the layout redesign and the Visual Web.

**⚠ Run it as a CLAUDE session — NOT a GPT copy-paste.** The audit **must read the PRIVATE archive** (memory,
`bugs/`, graveyard, audits, AND the built museum's own room/structure) to be real; GPT has **no access to that
private material**, so a GPT pass would be inventing from a summary. A Claude session that can actually read
the archive is the only honest way to run it — the same "Claude first, because it can EXECUTE / read the
private material" reasoning as design note (e).

**Why it's the enabling prerequisite.** Curation ("capture everything, exhibit a curated subset") only works
if the full collection is actually assembled first; this is the "capture everything" half made a deliberate
task — and now the **structure inventory** the redesign + Visual Web both need. **Recorded as a parked
candidate — not started.**

---

<a id="v"></a>

### V. ✅ The archive-sync repair — a backup that reported success while protecting nothing (SHIPPED 2026-07-27)

**What it is.** `sync.ps1` is the **only** backup of the three local-only artifact classes Protocol 48 exists
to protect — `library/`, `planning/`, and the orchestrator's memory store. It was **reporting "Done" on a push
that had been REJECTED.** Root cause, and it is a language-level trap rather than a coding slip: **Windows
PowerShell 5.1 does not throw on a native non-zero exit code**, no matter what `$ErrorActionPreference` says.
So `git push` could fail, print its rejection to stderr, and the script would carry on to its success message.

**Why this is the worst shape of failure this project recognises.** A backup that quietly protects nothing is
**worse than no backup**, because it removes the pressure to notice — the same reasoning already on file for
the original hardcoded-GUID version of this script, and the same "green that lied" class as the inert cache
guard. The material at risk is the memory store, the planning tree and the library docs: **they exist on
exactly one disk.**

**Shipped (commit `2cf7d5f`):**

- **`Invoke-Git` — the only way the script is allowed to run git.** It returns an object carrying
  `ExitCode`/`StdOut`/`StdErr` and, unless `-AllowFail` is passed, **fails with the command, the exit code and
  the captured stderr**. Checking by hand at each call site is exactly how the swallowed push survived, so the
  wrapper makes the check **impossible to forget**. It uses `Start-Process` with two temp files rather than
  pipes, because a piped read can deadlock when the child fills the stderr buffer — and `git push` writes both
  its progress and its rejection text to stderr.
- **L5 / L6 locks, held OUTSIDE git, released in `try/finally`**, with stale-lock reaping validated on
  **(pid, process-start-time)** rather than pid alone (a recycled pid must not be mistaken for a live holder).
  **L5** is sync-run exclusivity; **L6** is archive-tree ownership — a sync and a code session must never both
  write.
- **A SHA-256 content digest** over `library/` + `planning/` + **every** memory store (re-resolved at
  digest time, never trusting a remembered path), taken at entry and re-checked, so a source mutating mid-run
  is caught rather than silently half-captured.
- **Foreign-commit refusal**, **real `ls-remote` verification of origin**, and a **tiered refusal policy** —
  with the session probe's CPU floor **measured on this machine** rather than guessed (an idle session tree
  ticks at 0.31-0.78% of one core; an actively-running one measured 9.51%), so the policy's explicit
  permission for **idle** daemons is actually reachable instead of being swallowed by an
  any-CPU-movement floor.

**Then a follow-up closed the gap an independent audit found (commit `410f930`).** The "nothing changed since
the last sync" **no-op path** still printed "already current" and returned 0 **without ever asking the remote
anything** — so a run whose push had failed, followed by a run with nothing to do, would report green while
the remote still lacked the archive. **The exact "success while protecting nothing" shape this whole repair
exists to kill, surviving on the one path that never reached the verification.** The fix extracts
`Get-OriginMainVerdict` as the single place that decides "does the remote have it?", and **every** path that
exits 0 claiming a backup must now clear that same bar through that same code.

**Verification.** **13 tests** in `tests/sync-repair.tests.ps1` pass under **both PowerShell 5.1 and 7.6.4** —
both shells, because the original defect only exists in one of them. The harness builds a complete throwaway
world per scenario and injects mid-run mutations after the entry digest, so the source-moved-mid-run paths are
genuinely exercised rather than modelled. The work was **externally reviewed end to end (GPT)** and
**independently diff-audited** — the audit is what found the no-op gap above.

**⚠ Recorded honestly — one residual is NOT fixed.** A **millisecond-scale race** remains and is documented in
the script rather than papered over; closing it needs the Level B work (mechanical enforcement of the L3/L6
domains), which is **CP2 territory**. Stating the remaining hole is the point: this repair's whole subject is a
script that claimed more than it delivered.

**Done means:** met — a rejected push can no longer report success, every exit-0 path verifies the remote
through one shared function, the sources are guarded mid-run, and the residual race is documented rather than
hidden.

---

<a id="w"></a>

### W. ✅ Archive/museum organization fixes — the classifier's fall-through, loud catch-alls, and a FILING REPORT (SHIPPED 2026-07-27, commit `2767d45`)

**What it is.** The archive's `classify()` decides which room every artifact belongs to, and a **fall-through**
was letting files land in **UNCLASSIFIED** — a state the museum's own lobby integrity report surfaces, which
means the museum was reporting a fault about itself. **UNCLASSIFIED went 5 → 0.**

**Shipped:**

- **The `classify()` fall-through closed**, and the **catch-alls made LOUD** — an unrecognised file must
  announce itself rather than quietly landing in a bucket. This is the same lesson as the earlier
  UNCLASSIFIED-3 fix (`.claude/launch.json` leaking as tooling, `memory-audit/` unrecognised): a silent
  catch-all is how a classifier stops telling the truth.
- **A `--check` FILING REPORT** — **deterministic, idempotent, dry-run, and loud.** It reports where everything
  filed and what it could not place, and writes nothing. Same "flag, never auto-fix" posture as every other
  check in this project.
- **README count fixes**, a new **`memory-audit/README.md`**, and `README.txt` **preserved to the graveyard
  first, then removed** — the ordering matters and is the standing rule: capture, then delete, never the
  reverse.

**Verification.** A **double-fresh reproducibility check passed** — the archive's own bar, and the one that
catches a classifier change that happens to be stable only on the machine that made it.

**Done means:** met — UNCLASSIFIED is 0, unrecognised files are loud rather than silent, `--check` gives a
deterministic filing report, and reproducibility still holds.

---

<a id="x"></a>

### X. ✅ The Exhibit folder relocated into the project family (2026-07-27)

**What it is.** The public exhibit's working copy now lives at **`C:\Dev\!RobCo\!RobCo-Exhibit`** — inside the
`!RobCo` family alongside the app repo and the private archive — where it was previously the sibling
`C:\Dev\!RobCo-Exhibit`, one level up and easy to mistake for something unrelated.

**⭐ The fact worth recording, because it is the thing a future session would otherwise worry about: GitHub and
Cloudflare are UNAFFECTED. Both bind to the repository, not to the local path.** The Cloudflare Pages project
builds from the `Robco-Exhibit` GitHub repo; nothing in that chain knows or cares where the working copy sits
on this disk. **No re-wiring was needed and none should be attempted.**

**Why it was worth doing at all.** The naming rules already on file are strict for a reason — the app repo is
**never** renamed (it is the PWA's install origin), and `_RobCo-Archive` (private) and `!RobCo-Exhibit`
(public) are different things that must never be confused. Putting all three under one parent makes that
distinction visible at a glance instead of depending on the reader remembering it.

**Done means:** met — the folder is at the new path, the old path is gone, and both hosting paths were
confirmed unaffected.

---

# Appendix — the original running "Last updated" header, verbatim

_Preserved exactly as it last stood on line 8 of `QUEUE.md` before the split, so no word of the running history is lost._

> _Last rewritten in full: 2026-07-15. Last updated: **2026-07-21** — **the fourth context source became a pointer, Protocol 50's blind spot got named, and the museum got an AI-facing design.** Three related pieces, all under the theme that this project has four sources of truth about itself — the rules, this queue, the memory store, and the `robco-uos` skill — of which the skill was the only one with no drift protection, no tracked source, and a stale live copy. (1) **R9 (below)** ships the fix — and it was itself course-corrected mid-session by the owner's tightening (GPT-5.6 Sol's discipline: a guard must earn its existence through a real, occurred failure at a defined enforcement point, or it should not ship). The first pass over-built: it made the skill a hand-written \_copy_ of the rules and added a bespoke `Suite 243` + a standing nudge to police the copy's drift. The corrected answer is that the skill should be a **pointer, not a copy** — so it can't become a second source of truth — after which both guards were **removed** as unearned (Suite 243 duplicated Suite 220 and only ever red-green'd a synthetic case; the installed-copy nudge guarded a divergence the pointer fix already removes). The one real residual (a pointer naming a deleted file/protocol) is caught for free by folding the skill into the _existing_ Suite 220. **Net new mechanisms: zero.** The owner still has one manual step: re-install the corrected skill via Settings › Capabilities (only a re-install can refresh the read-only installed copy). (2) **Protocol 50 gained subsection (c)** stating that rule 50(a) already covers the conversation ↔ queue case in prose and its enforcement half simply cannot exist (a script can't read a conversation; the riskiest sessions never push) — so no guard is coming for it, on purpose. (3) **P3 (under the museum)** is a design-only queued spec for making the museum an AI-facing resource like the library, guarded by provenance (status derived from a supersession link graph, fail-closed on unknowns, no rejected entry without its why). **Protocol 50 was itself violated hours after shipping** (the DeepSeek roster decision, item G) — recorded plainly, because it's the concrete proof (2) exists for. Prior update: **2026-07-20** — **item F executed — the blind workflow review's four process refreshes.** The standing review prompt (`planning/_standing/WORKFLOW_REVIEW_PROMPT.md`, gitignored, kept current incrementally — folding in ≠ sending) was brought fully current (the museum + its reproducibility sub-program, Protocol 50 + the queue-drift nudge, the trim's remaining stages R5–R7) and gained two audit sections it never had: **§15 — auditing the orchestrator (Dispatch) itself**, and **§16 — the multi-model hand-off and its cost.** Of F's four named subjects, three were already current in the prompt (session-launch discipline / Protocols 8+28, the Protocol 9 reporting standard, copy-paste-block delivery); the fourth (protocol-consolidation as proof the process PRUNES) was strengthened from "U6 only" to the retirement rule + three retirements + R5–R7. Two decisions that had lived only in conversation are now on file per Protocol 50 (see item G): **DeepSeek joins this ONE review as a free, hosted-only THIRD WITNESS — never a gate, never repo-aware — and a committed claim-ledger file** becomes the synthesis artifact. The conversation→queue gap that let those decisions go unrecorded for hours (Protocol 50 shipped the same day) is noted honestly under G: the drift nudge catches memory↔queue drift, not conversation↔queue drift. Prior update: **2026-07-20** — **the governance trim's remaining stages, a museum design gap, and a standing drift problem all got fixed in one pass, triggered by the owner asking why work kept reaching this file late.** Three things landed: (1) **R5-R7**, the staged governance trim's stages 2-4 (convert-prose-to-enforcement, the contentious ratchet-narrowing that needs the owner's call, and the expensive-machinery cuts) — these existed only in Dispatch's memory before now, with one line in R3's own follow-up notes as the only trace in this file; all three are now real tracked items with their reasoning and keep-cases intact. (2) The museum's **rename-permanence gap** (under **P1**) — the in-flight hash-to-path work correctly declined to handle future document renames on its own; this session designed the fix (an extended redirect ledger + a build-time git-diff check, NOT automatic rename detection, which this same repo's own mining pass just proved unreliable at a 22% undercount) and queued it as a soft prerequisite of publication (**P2**), plus a small outstanding `file://` click-test alongside it. (3) **Protocol 50 + R8**, shipped rather than merely queued: a standing rule that plans get written here in the same session they're decided, backed by an automated pre-push nudge (`scripts/queue-drift-check.js`, Suite 242) that lists every `type: project` orchestrator memory not yet referenced in this file — the mechanism that makes (1) and (2) not recur. Prior update: **2026-07-20** — **a museum accuracy audit closed the gap between this file and reality.** Item **P (THE MUSEUM)** was still marked ⬜ and read as a future proposal, but the museum has actually shipped: the generator (`museum/generate.mjs` in the archive) runs and produces `museum/site/`, four hand-written release accounts (2.5.0 / 2.6.0 / 2.8.0 / 2.8.5-draft) are approved and frozen, and both a correctness pass and a release-cadence generation pass ran. P is rewritten to say so. Three things that had no home in this file are now recorded under it: a **museum-reproducibility sub-program** (three archive sessions fixed a CRLF/LF page-renaming bug and a gitignored README leak; a fourth is **in flight right now**, resuming after hitting the same session limit — it replaces content-hash doc addresses with path-based ones and is mining a redirect ledger from this repo's own git history first, because 62 of the 306 hash-named pages that have ever existed are gone from the current site and recoverable only by walking history, a window that closes once path-based naming lands); the **museum publication plan** the owner locked this session (public after the 2.8.5 release and before 2.9.0, a clean new repo — `Robco-Exhibit` — on **Cloudflare Pages** rather than GitHub Pages specifically because a GitHub project site would share browser origin and localStorage with the live app, name substitution with a fail-closed guard, and a publication diff verified before anything goes live); and a new **reproducibility CI** item (**J**, owner: "go with recs") that turns three sessions' hand-proof into a standing gate. One more new item, unrelated to the museum: **L**, a generated, phone-readable HTML view of this very file, decided this session under a ONE-SOURCE-TWO-VIEWS ruling. Prior update: **2026-07-20** — **Group 1 (data safety) re-opened with A3**, a save→sync→load cloud round-trip test against the free local Firebase emulator, asserting field-level fidelity so a field added to state but missed in the sync mapping fails the gate. The gap was established from code, not assumed: `boot-smoke.mjs` allowlists away every Firebase network error, and Suite 46.17 — the closest existing check — asserts a hand-typed field list, so a new field goes green while never syncing. The entry states its costs honestly (a dev-only `firebase-tools` dependency; no coverage of real Firebase, App Check or network behaviour). **The App Check entry is CLOSED** — enforcement was already live and the owner deleted all three debug tokens in the console, so the **Museum-publication blocker is cleared**. Prior update: **2026-07-19** — a Group-3 batch pass plus a truthfulness sweep of the tail. **Group 1 (data safety) is now COMPLETE** — A0, A1 and A2 had all shipped but were still showing unticked, as had **O** and both batches of **N**; all six are now marked. Of the Group-3 batch: **E** (dead RECIPES.CSV tables, both games) and **K** (the backup script) shipped; **M** was re-audited and closed as already-done with nothing orphaned left to remove; **B** landed one of its four deferred conversions and the rest is now a named list rather than a vague bucket; and **C1** was deliberately NOT done — investigation found it collides with Protocol 29 and Protocol 33, so its entry now carries the blockers instead of a false "small win" framing. Prior passes (2026-07-18) —\_ (1) marked the **entire 2.8.5 code + test health round (U1–U12) SHIPPED**, plus the UI-truthfulness fixes and the **Protocol 23 architecture-conformance enforcement** capstone; (2) a **full ordering evaluation** of the whole roadmap — the floating end-of-round deliverables, the leftovers, and the pre-3.0 items each placed in dependency order with a "why it sits here," and the one real mis-ordering (list virtualization) moved to its foundation; (3) a **placement pass for a new batch from two external AI reviews** — near-term LIVE-SAVE DURABILITY (data-safety, runs first), the rules/governance restructure (delete the test-count bookkeeping, path-scoped rules + a retirement rule, a first staged trim, the re-pin), two cheap cleanups, two consciously-unversioned items, and the native ES-modules migration bundled into 3.0; and (4) a **placement pass for the 2026-07-18 live AI test** — the AI/Overseer audit (`planning/2.8.5/audits/AI_OVERSEER_AUDIT.md`) yielded **A0** (confirmed real item-loss, jumps to the front of Group 1 ahead of live-save durability) plus the **N** unit (Findings 2–8, non-gating), the **Museum** (item P, built before the 2.8.5 release), and the **test-artifacts self-cleaning** ride-along (item O). Each new item was verified against real code before earning its slot. The tail was regrouped into four ordered groups; item D moved next to the Atlas; the three owner-dropped ideas were recorded as closed. **Re-pinned at R4 (2026-07-20)** — the brain dump, code map, test catalog, this file, `library/MANIFEST.txt` and the archive now all describe one commit; the literal hash is in each library doc’s BASELINE PIN header and in the archive’s stamp. Compare it against `git rev-parse dev` to see whether they are still current.\_

---

_This log is append-only (ARCHIVE-class). New shipped accounts are added under a stable `<a id>` anchor; `QUEUE.md` keeps the matching one-liner. See `rules/docs-and-library.md` for the maintenance model._
