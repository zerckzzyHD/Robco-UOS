# RobCo U.O.S. — Build Queue LOG (shipped-work archive)

**The reasoning archive for everything `QUEUE.md` has closed.** `QUEUE.md` is the lean, phone-readable queue of what is still ahead; this file is its companion LOG — the full accounts, post-mortems, and "why we did it this way" for work that has **shipped or been ruled out**. Split out of `QUEUE.md` on 2026-07-21 because the queue was doing two jobs with opposite requirements: a queue must stay short and be read constantly, a log grows forever and is read rarely, and the log was burying the queue.

**Nothing here was deleted from `QUEUE.md` — it was moved, verbatim.** Each shipped item keeps a one-line record in `QUEUE.md` with a link back to its full account here. The shipped-item bodies below are the **exact original text** as they last stood in `QUEUE.md`; the reasoning is the most valuable content in the project — several sessions have relied on it — so it is preserved in full, just relocated off the steering surface.

**Maintenance class: ARCHIVE (append-only).** Entries here are frozen records of shipped work. When a `QUEUE.md` item ships, its full body moves here under a stable `<a id="…">` anchor and the queue keeps the one-liner. Do not rewrite a landed account to match later reality — that is what the drift on the running header caused in the first place. If a shipped decision is later reversed, the reversal is a _new_ queue item with its own record, not a rewrite of this one.

**Item IDs are stable tags — never renumbered, never reused** (the Protocol 49 retirement discipline, applied to queue IDs). An `A0` / `R3` / `P1` here is the same `A0` / `R3` / `P1` referenced from commit messages, memory files, the workflow-review prompt, and `CHANGELOG.md`. Moving an account into this log does not change its ID.

**Anchor index (for `QUEUE.md`'s one-liner links):** [2.8.0](#v280) · [brain dump](#braindump) · [item 1 spine](#u1) · [item 2](#u2) · [item 3](#u3doc) · [item 4 FO3](#fo3) · [item 5 save integrity](#saveintegrity) · [data provenance](#dataprovenance) · [save L3](#saveintegrityl3) · [UI truthfulness](#uitruthfulness) · [item 6 schematic](#schematic) · [A0](#a0) · [A1](#a1) · [A2](#a2) · [R1](#r1) · [R2](#r2) · [R3](#r3) · [R4](#r4) · [R8](#r8) · [R9](#r9) · [D](#d) · [U](#u) · [E](#e) · [M](#m) · [K](#k) · [O](#o) · [N](#n) · [F](#f) · [G](#g) · [H](#h) · [S](#s) · [App Check](#appcheck) · [L (private view)](#l) · [P8](#p8) · [V](#v) · [W](#w) · [X](#x) · [CP2 → v2.1](#cp2v21) · [CP2 S12 cleared](#cp2s12) · [CP2 → v2.3](#cp2v23) · [CP program kernel reframe](#cpkernel0728) · [HG1/HG2 pull-forward](#hg0728) ·
[CP kernel ranks 1-2 shipped, P15](#cp0729) · [RB1-RB5 filed, kernel ranks 4-5 shipped, wiring dissent](#rb0729) · [CP activation checklist consolidated](#cpactivation0730) · [three CP checklist refinements (REF1-REF3)](#cprefine0730) · [REF2/REF3 plan threshold + bidirectional auto-verdict](#cprefine0730b) · [RB3 watcher mechanism + supervisor kill-switch trigger words](#cprefine0730c) · [CP board consolidation: rank 3 + REF1 shipped, AUD1 filed](#cpconsolidate0730) · [REF4 thrashing refinement + PM1 post-mortem filed](#cpconsolidate0730b) · **[⭐⭐ ROUND 5 reconciliation — the kills, defers, NDEs and placement ledger](#r50802)** · **[NORTH_STARS.md placed + MX1/MX2 filed](#ns0802)** · **[the seven held BR/HA items adjudicated](#held0802)** · **[the silent-backup gap — BD1/BD2](#bd0802)** · **[GPT's five-repo ground-truth audit verified + reconciled (Phase A)](#audit0802)**

---

# Update history — the running "Last updated" chain

_The full original running-header text is preserved verbatim in the appendix at the very bottom of this file. The dated summaries below are the same content, reflowed newest-first for reading (the header had grown into a single multi-thousand-word line that `QUEUE.md` could no longer carry)._

<a id="audit0802"></a>

### 2026-08-02 (latest) — GPT's FIVE-REPO ground-truth audit: verified against the live machine, then reconciled (PHASE A)

**Scope of this pass: doc + code-comment edits only.** No behaviour changed anywhere. No enforcement flipped
on, no scheduled task altered, no cache bump (nothing served or precached was touched). **Nothing here was
approved to BUILD** — every gap-finding was mapped onto an **existing** queue item; **no new item ID, family
prefix or program was created.**

**What this was.** An external model (GPT) audited all five repositories from their **pushed GitHub state**
and produced twelve findings (F01-F12). It could not see uncommitted work, the Windows scheduler, live hooks,
or the untracked live control-plane state — so a verification pass re-checked every finding against **the
machine and the working copies**, then this pass applied the fixes.

**⭐ The audit held up. All five repo HEADs matched the audit boundary exactly** (UOS `86f3375`, Archive
`255b7594`, Exhibit `2fc7b14`, Control `7bb9e1b`, Ledger `6c263589`), every repo clean with nothing stashed or
unpushed — so **nothing was stale-at-audit-head, and nothing was contradicted by evidence.** Ten findings
CONFIRMED, three of those with corrections; F04 is an owner policy decision handled separately (**Phase B —
untouched by this pass**); BD2's design was an owner decision, now recorded.

**⭐ The three corrections are the most valuable output, because each is a place the audit was believed too
readily:**

1. **F02 — `orphan-job` is NOT a second contradiction.** The audit read both `stranded-push` and `orphan-job`
   as "snapshot says unobservable, status says observable." Only the first is that. `status.json` never
   claims orphan-job is observable — it reports a zero with a **null `unavailableReason`**, which is
   **undeclared unobservability**: a zero that reads as measured when nothing was measured. Two distinct
   failures, one root, and collapsing them would have produced a fix aimed at the wrong half.
2. **F06 — the cited line number was wrong** (Protocol 35 sits ~10 lines earlier than claimed). The substance
   held; the citation did not. Recorded because a plausible-looking line reference is exactly the kind of
   thing a later session copies forward without re-checking.
3. **F11 — the quoted comment was paraphrased inaccurately.** The real text says the operator CLI _does not
   go through_ either MCP server, not that it "proves an op before exposing it." The underlying defect —
   present tense presupposing two MCP servers that do not exist — is real either way.

**⭐ And one place the audit UNDERSTATED the problem (F03).** It cited `publisher.js`'s own header as evidence
that the read-only posture is documented. That comment — _"there is no automated caller of `publishJob`
anywhere in this repo"_ — is **itself now false**, since `write-side.js` defaults its publish function to
exactly that and the supervisor calls it every tick. So there were **four** stale read-only artifacts, not
three. _A stale comment cited as evidence of correctness is the sharpest form of this whole audit's thesis._

**⭐ The live reproduction that outranks all of it: BD2 is no longer a hypothesis.** The scheduler was re-read
directly. `\RobCo-Control-DailyHousekeeping` had `StartWhenAvailable: True`, the machine had been awake **8+
hours**, and the missed 08-02 window **still had not run** — `LastRunTime` stuck at `2026-08-01 03:15:01`,
Windows' own **`NumberOfMissedRuns: 1`**, and `NextRunTime` already advanced to `2026-08-03`. The supervisor
task on the same machine was perfectly healthy on its 5-minute cadence. **A configured-and-believed guard was
measured not working, twice, by two independent reads.**

#### What Phase A changed, per finding

**App repo:**

- **F07 — `NORTH_STARS.md`.** The file's final line still said the seven held items were "pending Dispatch
  ruling"; they were adjudicated the day before (6 MERGE, 1 DEFER, none a new North Star). Replaced with the
  resolved state, pointing at [#held0802](#held0802), and kept as a **worked example** rather than a silent
  fix — a projection reporting "pending" for a settled decision is precisely the drift its own header warns
  about. The "this file is a mirror, QUEUE.md wins" note already existed and was **not** duplicated.
- **F08 — BD2's `Files:` citation.** It named `register-supervisor.ps1` (wrong script — that one registers
  the _supervisor_) and "the mirrored `scheduled-tasks/` XML" (**a file that does not exist**). Corrected to
  `register-daily-housekeeping.ps1`, with the missing XML now connected to the recovery-inventory gap rather
  than left as a dangling reference.
- **F01 → BD1 + `EXP6`.** Recorded the verified defect: the mirror exports **one** scheduled-task XML (a
  single scalar constant, not a set), so the daily housekeeping task — the backup job itself — is **absent
  from the recovery kit**; and the restore test validates the clone against **the mirror's own manifest**,
  with an absent task directory returning `ok: true, checked: 0`. **Net: the restore test would pass green
  against a mirror containing zero scheduled tasks.** Filed as a **recovery-inventory completeness**
  requirement under BD1 — same failure shape as BD1 one level up (the mirror is the sole authority on what
  the mirror should contain), gated by `EXP6`, **no new item**.
- **F02 → founding fix 3 / `EXP3` / `AB1`.** Recorded the static coverage table replayed over live detector
  results, with the correction above carried explicitly. Folded into `AB1` as four concrete requirements:
  one **derived** coverage definition, explicit **scope** per claim, omission detection that covers the
  coverage record itself, and a test that replayed coverage **cannot lag the detector set without declaring
  itself stale**.
- **F05 → PX1 / `EXP1`.** Recorded that publish-prep is **not an atomic accepted-output transaction**: the
  public tree is swapped into place **before** the P16 gate judges it and is **left on disk when rejected**,
  and a derivation failure **exits 0** (the deliberate "ritual, not gate" catch) leaving an **older** tree
  behind — so one green exit covers three materially different states. Added as four adversarial acceptance
  cases (exact-set manifest · freshness + source identity · explicit accepted/rejected state on the artifact
  · **stale or rejected trees non-consumable by default**). ⭐ Noted in the entry that the code is already
  **honest** about this — it says outright that the rejected tree was written — so what is missing is the
  transaction, not the disclosure.
- **F09 → `AB2` / `EXP5`.** Recorded six distinct deploy outcome types (build-passed · deploy-attempted ·
  **skipped** · accepted · served-SHA-observed · device-verified) with a ceiling rule: no claim may be
  reported above the strongest type it has evidence for. The measured instance is the staging workflow's
  missing-token path, which `exit 0`s to green having deployed nothing. `workflow_dispatch` **keeps** its
  authority as **receipted break-glass** — same shape as the push override: never removed, always recorded.
- **F12 → the delta convention.** Appended a new dated delta block rather than editing the frozen 2026-07-31
  and 2026-08-01 snapshot tables (they stay exactly as they are — history is not an obligation). Ledger
  **78,627 → 100,206** records, chain coverage **19.0% → 36.4%**, unchained still frozen at **63,696**;
  usage back to **`Normal`**; `state/manifests/` **still absent** (BR8's premise holds a third time). Every
  unobservable/partial label reproduced **as-is** — none was upgraded to a measured value. ⚠ Also recorded
  the reader-side finding: **the published ledger mirror lags live state (~80 min at read time), and the lag
  grows without bound whenever a housekeeping window is missed** — the same BD1 defect seen from the
  consuming end.
- **BD2 — the owner's design decision, recorded.** ⛔ Nightly **`WakeToRun` is REJECTED**: it pays a standing
  cost for an occasional event and, disqualifyingly, would still leave a miss **undetected** on any night it
  failed for another reason. The chosen design is **both** remaining options, ordered: **(1) a missed-run
  OBLIGATION ALERT** — the load-bearing half, an external observer outside the job's failure domain, which
  composes directly with BD1 — **and (2) a resume-triggered catch-up** for recovery. **The alert must not
  wait on the catch-up**, because a recovery mechanism that silently stops working is exactly how this defect
  was created. Still RECORDED, NOT BUILT.
- **F06 / F10 — the two user-facing doc corrections**, with a plain-English changelog entry: Protocol 35
  relabelled as a **manual Firebase-console runbook plus a local session-only safeguard** (verified: the flag
  doc is world-readable and client-writable by nobody, and no workflow or script writes it — so "immediately
  and automatically" had no actor), and the README's Gemini-key line corrected from "never exposed" to the
  four things that are actually true. **Neither is a leak**; both were wording that outran the code.

**Control repo** (its own commit + changelog): **F03** — all four stale read-only artifacts corrected to the
real authority model (passive observation + local enforcement + deterministic decision logic + a **gated,
fail-closed, currently DORMANT** exact-SHA publish path), with `enforced: false` scoped to **supervisor
scope** rather than "no enforcement anywhere"; **F11** — the operator CLI's MCP comment made future-tense.

**⛔ F04 (public planning as an unmodeled public sink) was NOT touched by this pass** — no file moved, no
visibility changed, no relocation of any kind. It is a structural decision with an owner ruling (hybrid) and
runs as **Phase B**.

<a id="bd0802"></a>

### 2026-08-02 (later still) — the SILENT-BACKUP GAP: the off-machine mirror went a day stale and nothing signalled it (BD1/BD2 filed)

**Scope of this pass: one real mirror run + doc edits + git commit/push.** The mirror run used the **designed
script**, not a hand-copy. No control-plane code was changed, no enforcement flipped on, no cache bump.

**⭐ Why this entry matters more than its size suggests.** Round 5 adopted **founding fix 2** — _make
supervisor/housekeeping silence distinguishable from health_ — on 2026-08-02, reasoning from the 3am
housekeeping job as its example. **Within twenty-four hours the same failure occurred for real, against a
different and more important subsystem, and was caught by a human rather than by the system.** These two items
are that instance, filed as concrete near-term work rather than as proposals.

#### The incident, verified three ways rather than inferred

The machine **slept from ~2026-08-01 11:54 to 2026-08-02 11:59 local**, straight across the 03:15 window:

1. `Microsoft-Windows-Power-Troubleshooter` — _"The system has returned from a low power state"_ at
   **11:59:05 on Aug 2**, with **no reboot since July 22** (so a sleep/resume, not a restart).
2. A **~24-hour hole in the ledger** — last Aug-1 record `2026-08-01T15:54:02Z`, first Aug-2 record
   `2026-08-02T16:04:03Z`, the 5-minute supervisor tick resuming **5 minutes after the wake**.
3. **Zero `housekeeping.*` records on Aug 2**, where Jul 30 / Jul 31 / Aug 1 each carry exactly one.

**The consequence: the off-machine ledger mirror went ~a day stale and NOTHING SIGNALLED IT.** It was found
only by a manual checkpoint verification. The gap was then filled through the real mechanism —
`node scripts/backup-mirror.js` → `lib/backup-mirror.js runBackupMirror()`, which owns the whitelist, the
fail-closed secret scan, the generated manifest, and commit+push via the carved-out `lib/mirror-git.js`.
Result: `mirror.completed` at `2026-08-02T23:19`, commit **`6c263589f97bc47b88ec97659bb6aa1f363f69c4`** on
`RobCo-Control-Ledger` (15 files; `ledger/events-2026-08-02.jsonl` at 4,265,832 bytes; `chain-head.json` at
seq 36601), **manifest receipt re-verified 15/15 against the committed blobs**, remote confirmed by an
independent `git ls-remote`. ⛔ **Nothing was hand-copied and nothing was hand-written into the ledger** — the
AI-free script did all the writing, which is the whole point of it existing.

#### ✅ What was ruled OUT — recorded so it is never re-investigated

The starting hypothesis was that the **exhausted weekly Claude cap** stopped the backup. **It did not, and it
structurally cannot.** The entire housekeeping → mirror call path — `scripts/daily-housekeeping.js`,
`lib/daily-housekeeping.js`, `lib/backup-mirror.js`, `scripts/backup-mirror.js`, `lib/mirror-git.js`,
`lib/mirror-restore-test.js` — was searched for `usage-mode` / `usageMode` / `computeOperatingMode` /
`Stop-unattended` / `Reserve-for-owner` / `budget-check`: **zero hits in all six files.** The mirror's only
abort conditions are the `state\DISABLE` kill switch, a lock refusal, and the fail-closed secret scan.

⭐ **This is a real result, not a null one.** _"An AI-free backup that skips itself when the AI budget is
exhausted"_ would have been a serious durability flaw — a backup that stops working exactly when the system is
under stress. **It does not exist here**, and that is worth recording as a checked-and-cleared fact rather than
leaving as an open worry that gets re-raised every time a backup is late.

#### BD1 — `backup-health` is BLIND to the ledger mirror

`lib/backup-health.js`'s `DEFAULT_TRACKED_REPOS` hardcodes exactly three repos — **`robco-control`,
`robco-uos`, `robco-archive`** — and **omits `robco-control-ledger`**. The only thing reporting mirror health
is **the mirror itself**, so a mirror that never runs reports nothing.

**Proof it is blind rather than merely quiet:** Aug 2 carries **56 `finding.backup-unhealthy` records**, every
one about a _different_ subject (archive unpushed commits, UOS uncommitted changes), and both backup alerts
that reached the phone were `backup:robco-archive`. **Not one finding and not one alert concerned the stale
mirror.** ⚠ **A watcher that is loud about three repos while structurally unable to see the fourth is worse
than an obviously absent one — the noise reads as coverage.**

**Fix recorded, not built, and BOTH halves are required:** (1) add `robco-control-ledger` to the watched set;
(2) ⭐ give the mirror an **external** freshness/obligation check with a deadline and an observer **outside the
mirror's own failure domain**. ⛔ **(1) alone is not sufficient** — it would move the mirror from _unwatched_
to _self-watched_, which is the exact trap `SL-I5` names.

#### BD2 — `StartWhenAvailable` does not catch up after resume-from-sleep

The task is configured **`StartWhenAvailable: True`** — the setting that exists precisely for a missed window.
On Aug 2 the machine **woke at 11:59 and stayed up eight hours**, and **the task still never ran**:
`LastRunTime` stuck at **8/1/2026 3:15:01 AM**, `LastTaskResult` **0**, Windows' own **`NumberOfMissedRuns` =
1**, and **`WakeToRun: False`**. Windows treats **resume-from-sleep** differently from **boot** for missed-run
purposes, so the configured catch-up does not fire on the path this machine actually takes.

⚠ **A configured-but-not-working guard is strictly worse than an unconfigured one:** the setting's presence is
exactly what stops anyone asking whether missed runs are covered. **Net effect: every sleep spanning 03:15
costs a full backup cycle, silently.**

**Three fix options recorded and deliberately NOT ranked:** `WakeToRun: True` · a resume-triggered catch-up ·
⭐ a **missed-run obligation alert** (the `SL-I5` shape — report the missed window even if it is not
recovered; the option that composes with BD1 and fails safe rather than assuming a recovery path works).
⛔ **None is chosen here** — a scheduled-task configuration change is a real behaviour change on the owner's
machine and takes an explicit owner call. The entry exists so that choice is made deliberately instead of
being rediscovered by another manual checkpoint.

#### Why both are filed as CONCRETE work, not proposals

Every other item in the `BR` / `HA` / `PX` / `MX` blocks is ⛔ PROPOSED because it originated in a brainstorm
or an external audit. **These two originated in a measured failure on this machine, verified at source**, and
they instantiate doctrine the queue had _already adopted_. Filing them as proposals would have understated
them. **They remain unbuilt and unscheduled** — "concrete near-term work" describes their standing, not a
commitment to a date — and **BD2 explicitly needs an owner decision before anything changes.**

**Placement:** their own `BD` block (new prefix, verified unused; nothing renumbered — Protocol 49),
positioned immediately after the Round-5 spine so they sit beside the doctrine they instantiate, with pointers
from **founding fix 2** and from "Where we are right now."

#### ⚠ One observability gap found while diagnosing, recorded rather than fixed

The **`Microsoft-Windows-TaskScheduler/Operational` log is DISABLED** on this machine (`IsEnabled: False`), so
there is **no per-run task history** to read. The diagnosis rests on `Get-ScheduledTaskInfo` counters, power
events and the ledger's own gaps instead — enough here, and all three agreed, but a genuine limit on what can
be reconstructed after the fact. Any work on BD2 should decide whether enabling that log is worth it rather
than rediscovering its absence.

<a id="held0802"></a>

### 2026-08-02 (later still) — the SEVEN HELD ITEMS adjudicated: six MERGE into an abstraction, one DEFERs, none is a new North Star

**Scope of this pass: doc edits + git commit/push/sync only.** No code, no enforcement, no cache bump.
**Nothing was approved to BUILD** — a MERGE verdict files an item under its canonical home; the standing
earn-condition (owner go **plus** a spec) is unchanged.

**How these seven got here.** The Round 5 reconciliation found that **BR1, BR4, BR14, BR19, BR21, BR23 and
HA5** were **never adjudicated by name** in the synthesis. Rather than infer a verdict from each one's
nearest abstraction — which would have made the verdict table _look_ complete while resting on guesses — they
were filed **explicitly flagged**, and the [North Star pass](#ns0802) read each at HEAD and surfaced its
**exact current text verbatim** to the owner. The owner ruled on all seven the same day. ⭐ **Both flags this
pass raised were answered within a day, and neither answer was the one a guess would have produced** — the
same lesson `EXP7` taught (see [the Round 5 ledger](#r50802)).

**⭐ The headline of the set, worth stating before the individual rulings: not one of the seven is a new North
Star.** Six merge into an existing abstraction and one defers. **Two reinforce North Stars that already
exist** — BR4 reinforces **NS-C1 (proof-of-execution)**, BR21 serves **NS-K1 (honest continuity)** and
**NS-K2 (provider-exit)** — and three more (BR1, BR19, BR23) serve **NS-C2 (epistemic-everywhere)** through
the honesty constraints attached to them. That is the adoption bar in `NORTH_STARS.md` working as designed:
**a good idea is not a direction.** No change to `NORTH_STARS.md` was needed or made.

#### The rulings

- **BR1 — Visual ops HUD → MERGE → AB2 + CPB5, SURVIVES-WITH-CONTAINMENT.** It is a **RENDERER, not an
  app**: `lib/cli/render-html.js` over the ONE projection plus one supervisor line, served over Tailscale,
  **folded into CPB5's phone cockpit — not a new item.** ⛔ **Containment: it must `require` the projection.
  Reading the ledger itself breaks GATE-8** and creates the second data path the CLI architecture exists to
  prevent. **The distinctive value is kept and is the reason it survives at all:** every field carries
  `epistemicState`, so this HUD can render **BLIND** — _a dashboard that can say "I cannot see,"_ which
  off-the-shelf ops dashboards cannot. **Serves NS-C2.**
- **BR4 — chaos/adversarial drills → MERGE → AB6 (Replay & Assurance Lab) as the LIVE fire-drill runner on
  the daily-housekeeping cadence, SURVIVES-WITH-CONTAINMENT.** ⛔ **Containment: FIRE DRILLS, NOT a chaos
  monkey** — random fault injection stays **KILLED** (contrarian **C3**: this is one machine, one developer,
  owner-first, where a false denial locks the owner out; random faults here are self-inflicted outages).
  Enumerated drills, each testing a claim a doc already makes, each **appending a ledger record so the
  ABSENCE of drills becomes visible**. ⭐ **Why it earned a merge rather than a defer: it is the operational
  home for running the [decisive experiments'](QUEUE.md#r5exp) positive-path checks on a cadence.** The whole
  round turned on _"has the positive path ever fired?"_ — a detector never observed positive has never
  demonstrated it **can** be — and this is the mechanism that answers that question repeatedly instead of
  once. **Reinforces NS-C1 (proof-of-execution).**
- **BR14 — Collision-Consequence Detector → MERGE → AB1 (Signal/Event/Obligation Kernel),
  SURVIVES-WITH-CONTAINMENT.** ⛔ **Containment: measure CONSEQUENCE / HARM — same-file writes within N
  seconds, actual lock refusals, sibling-gate failures — NOT co-residency.** ⭐ **The argument is a
  measurement, which is what makes it decisive:** the co-residency count **never varies**
  (`tree-collision` 2,653×, `probable-duplicate-launch` 7,386×), so the existing detector **answers a
  question whose answer is always the same and therefore cannot inform the DG5 worktree decision it was
  built to inform.** **Precedent already in the code: REF5's `dirtyFingerprint`** proved a _hash of what
  changed_ answers what a _count_ structurally cannot — the same lesson one layer up. **Bonus:** it
  de-noises the ledger, the same gauge-flood target as `SL-I2`/`SL-I3`. **Decision-grade for DG5.**
- **BR19 — Boot-Sequence-as-Diagnostic → MERGE → AB2 (bound by the Operator-CLI clause), but ⏳ DEFER THE
  BUILD.** The **concept is adopted**: boot renders `verdict.js`'s `SAFETY_CRITICAL` fields **and their `why`
  strings** as the ROM check, and a **BLIND safety-critical field HALTS the boot** — making the health check
  the thing you cannot skip past, which is a usability property rather than a skin. **Serves NS-C2.**
  ⚠ **But it is low-leverage polish, not spine, and the ruling says so plainly rather than filing it as
  work.** ⏳ **Reopening trigger: when the CLI cockpit is being built out** (alongside **CPB5** / **BR1**) —
  it rides that surface instead of justifying its own pass.
- **BR21 — Proof-Carrying Continuation Packets → MERGE → AB8 + AB2, SURVIVES-WITH-CONTAINMENT.** Extends
  **BUILT** work (**CPK4** + **WB6**) rather than adding anything: packets already keep the two never-blended
  halves (`independentlyObserved` vs `agentClaims`), WB6 gives every new record `chain:{seq,prev,self}`, and
  `content-store.js` already refuses content that no longer hashes to its own name. Bolted together, **a
  packet becomes SELF-VERIFYING — the next session confirms the ledger span it was built from is unaltered
  WITHOUT trusting the packet's author.** ⭐ **That is what promotes it from a nice property to a spine
  component: it is a piece the portable mission capsule depends on** (`EXP6` / `SL-J4`), so it **serves NS-K1
  (honest continuity) and NS-K2 (provider-exit)**. Composes into **RB2**. **Low added cost** — it bolts
  existing pieces together.
- **BR23 — Session roster (read-only) → MERGE → AB2, SURVIVES-WITH-CONTAINMENT.** A **read-only projection**
  over the existing session catalog; the data is already collected in the `tree-collision` payload
  (`{sessionId, pid, version, entrypoint, name, procStartIso}`). ⛔ **Containment, and it is an HONESTY
  constraint (NS-C2): the `name` field — observed value `"robco-uos-03"` — is entrypoint-adjacent and is NOT
  proven to be the owner-visible UI title.** Verify title-readability **on disk**, or **degrade to id + cwd
  and SAY SO**. ⛔ **Never render an unproven name as authoritative.** _A roster that silently shows a
  plausible-looking wrong name is worse than one that admits it cannot read the title, because a person picks
  kill targets off it._
- **HA5 — shared-protocol plugin across the two code-holding repos → ⏳ DEFER.** ⏳ **Reopening trigger:
  after HA1/HA2/HA3 settle** — they change **what the shared set would even contain**, so building it first
  would freeze the wrong contents. **⛔ Both load-bearing constraints are preserved VERBATIM and travel with
  the deferral, because they are the reason this is a defer rather than a kill:** **Control is AI-free by
  design**, so the plugin is **session-tooling only** and is **never wired into Control's runtime execution
  path** (plugins ship hooks, and that boundary is easy to violate by accident); and **the plugin repo stays
  PRIVATE** — two of the five repos are public, and hooks accumulate local paths. **No North Star attaches
  to this item.**

#### What changed in `QUEUE.md`

Each item's inline `[R5: NOT ADJUDICATED…]` tag was **replaced in place** by its ruling with the containment
attached, and the three block-level statements that described the seven as un-adjudicated (the running
header, the de-duplication table preamble, and the `BR`/`HA` disposition headers) were updated to record that
the flags are **closed**. The de-duplication table rows now carry real verdicts. **No ID was renumbered,
re-lettered or reused (Protocol 49); no entry's original reasoning was deleted** — the `BR`/`HA` bodies stay
exactly as written and remain the historical record of how each item reached its abstraction.

**⛔ `NORTH_STARS.md` was NOT changed, and that is the correct outcome rather than an omission** — none of the
seven is a new North Star, and the two that reinforce existing ones (NS-C1, NS-K1/NS-K2) reinforce them
without altering their wording, status or serving-primitive lists.

<a id="ns0802"></a>

### 2026-08-02 (later) — `NORTH_STARS.md` placed in the repo and wired to the queue; MX1/MX2 (the North-Star exhibits) filed under the museum track

**Scope of this pass: doc edits + git commit/push/sync only.** No app code, no control-plane code, no
enforcement flipped on, no cache bump. **Nothing was approved and nothing was adjudicated** — the seven held
`BR`/`HA` items were read and surfaced verbatim for the owner, not ruled on.

#### The file, and the rule that governs it

**`NORTH_STARS.md` now lives beside `QUEUE.md` in the app repo**, copied **verbatim** from the authored draft
one level above the repo (the `-draft` suffix is dropped and the draft path is referenced nowhere inside — it
was checked, not assumed). **Its judgements were not rewritten**; this pass placed, verified and wired it.

**⛔ The relationship, stated in both files so neither can drift into being the other:** `QUEUE.md` is
**executable truth**; `NORTH_STARS.md` is its **directional mirror** — it names the commitments the spine
serves, with every verdict traced to a canonical `SL-*` / `AB*` / `EXP*` ID. **If the two ever disagree,
`QUEUE.md` wins and `NORTH_STARS.md` is stale.** A session must never plan from the mirror. The pointer sits
in the Round-5 spine preamble; the reciprocal statement was already in the authored file's own header.

**⭐ Why a mirror is worth having at all, rather than being a second roadmap by another name.** The queue
records _what is being built and in what order_; it deliberately does **not** say which durable directional
commitments that order serves, and Round 5 showed the cost of that gap — _"ledger IS the OS"_ and _"sovereign
proof-bearing software factory"_ survived for months as exciting phrases precisely because nothing tracked
them as commitments that could be **narrowed or retired**. The inventory's real work is the **honest cull**:
it holds `NARROWED` / `MERGED` / `REJECTED` rows beside the adopted ones so a pruned phrase cannot quietly
re-inflate. That is Protocol 49's retire-in-place discipline applied to _directions_ instead of guards.

#### Cross-reference verification — the whole point of placing it under the gate

**Every canonical reference in `NORTH_STARS.md` was resolved against `QUEUE.md` at HEAD, mechanically rather
than by eye: 44 distinct IDs — `SL-*`, `AB1`-`AB8`, `EXP1`-`EXP9`, `PX1`, `P16` — and every one resolves.
Zero unresolved, zero invented.**

**⚠ Six shorthand runs were expanded to their canonical `SL-` forms in the same pass. No verdict, status or
judgement was changed — this is ID hygiene, and it is load-bearing rather than cosmetic**, because a bare
slate letter resolves to a **different live queue item**:

| Was                                        | Now                                                       | Why it mattered                                                                                                                                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `· G1 (SL-G1)`                             | `· epistemic-state-as-code (SL-G1)`                       | Bare **G1** is the owner-greenlit **CP5 witness**, not the epistemic candidate.                                                                                                                                                                  |
| `SL-K1/K3/K5`                              | `SL-K1`/`SL-K3`/`SL-K5`                                   | Run-together shorthand: only the first token resolved.                                                                                                                                                                                           |
| `K2/K5 must use …`                         | `SL-K2`/`SL-K5`                                           | Bare cluster letters.                                                                                                                                                                                                                            |
| `SL-D1/D2/D6`                              | `SL-D1`/`SL-D2`/`SL-D6`                                   | Run-together shorthand.                                                                                                                                                                                                                          |
| `F2/F4/F6/F7/…/A4/G4/I3` (§7 overlap line) | `SL-F2`/`SL-F4`/`SL-F6`/`SL-F7`/…/`SL-A4`/`SL-G4`/`SL-I3` | ⭐ **The worst of the set.** Bare **A4** is the shipped Firestore round-trip test, bare **G4** is the retired DG2 counter, bare **F**/**I** are shipped single-letter items. Every one of those would have resolved a reader to the wrong entry. |

**This is exactly the collision the `SL-` prefix was introduced for**, and the first outside document written
against the spine hit it within a day — which is the argument for keeping the prefix mandatory rather than
treating it as decoration. A verification stamp recording all of this now sits in the file's own header, so a
future reader knows the references were checked and when.

#### MX1 / MX2 — the North-Star exhibits, filed under the museum track

Both come from `NORTH_STARS.md` §9, where the judgement _"justified"_ was recorded. **New family prefix `MX`**
(museum exhibit), verified unused before assignment; nothing renumbered or reused (Protocol 49).

- **MX1 — a dedicated NORTH-STAR ROOM.** ⛔ PROPOSED. Curated, human-facing narrative: each adopted North
  Star with the failure → lesson → measure arcs that earned it, **and the pruned / narrowed / rejected
  phrasings shown beside them** as evidence the project culls its own excitement. ⛔ **Explicitly NOT a status
  dashboard** — no live state, no health colour. A museum room that renders operational status becomes a
  surface people check instead of the real one, and a stale exhibit reporting green is precisely the failure
  class Rounds 3 and 5 spent themselves removing.
- **MX2 — North Stars in the GENERATED visual graph.** ⛔ PROPOSED. North Stars as nodes, their real
  relationships as edges (serving primitives, gating experiments, parent/child, recorded contradictions),
  riding **P11**'s renderer — ⛔ never a second one (Protocol 22). **⭐ Hard requirement, and it is the whole
  item: the graph is GENERATED from canonical references (`NORTH_STARS.md`'s structured cross-refs +
  `QUEUE.md`) and is NEVER hand-maintained.** A hand-drawn graph drifts into a second roadmap the moment the
  queue moves; a generated one stays honest by construction and **breaks loudly** when a reference stops
  resolving. **This project has already retired one rule (Protocol 2a) for exactly the hand-maintained-mirror
  failure**, and the same reasoning made **WB2** and **BR22** generated-only — MX2 inherits that constraint
  rather than re-litigating it.

**⛔ THE GATE ON BOTH is binding, not preamble: neither may ship until [PX1](QUEUE.md#px) has landed AND
`EXP1` has passed.** They are museum **publishing**, so they sit inside the standing freeze and route through
**AB7, the Declassification Pipeline** — positive allow-list → exact-set P16 scan → lineage → owner
declassification diff. Design and curation work is not frozen; shipping is.

**Standing guardrail adopted with them (from §9):** the Museum/Exhibit remains human-facing **output**. It may
_reflect_ the roadmap; it must never _become_ a competing planning authority. Planning lives in `QUEUE.md`,
the inventory mirrors it, the museum renders a curated scrubbed projection. **Any version of MX1 or MX2 that a
session would consult to decide what to build next has failed this guardrail**, whatever it looks like.

#### The seven held items — READ, SURFACED, NOT adjudicated

**BR1, BR4, BR14, BR19, BR21, BR23, HA5** were read at HEAD and their exact current text surfaced to the owner
verbatim in the session report. **⛔ None was adjudicated, re-tagged, promoted or moved** — all seven remain
⛔ PROPOSED / `[DECISION]`-pending exactly as Round 5 left them, and the queue already records that the owner
holds them for this pass. Dispatch rules on them next; this pass deliberately stopped at surfacing, because
an item adjudicated by the session that was only asked to read it is the Protocol 51(a) failure in miniature.

#### One thing deliberately NOT done, with the reasoning

**`README.md` was not amended.** Protocol 2's README-currency clause binds when a change makes the README's
**file structure** section inaccurate — but that section lists the architecture/agent docs (`ARCHITECTURE.md`,
`CHANGELOG.md`, `CLAUDE.md`, `rules/`) and has **never** listed `QUEUE.md` or `QUEUE_LOG.md`. Adding
`NORTH_STARS.md` alone would make the listing _less_ consistent, not more. **Recorded rather than left silent
so the omission reads as a decision, not an oversight** — if the planning docs are ever added to that block,
this file should go in with them. A row in `CLAUDE.md`'s Reference Pointer Index is an available follow-up and
was **not** taken unasked (a rulebook edit is never a side effect of a queue fold).

<a id="r50802"></a>

### 2026-08-02 — ⭐⭐ THE ROUND 5 RECONCILIATION: the brainstorm rounds judged, merged into eight abstractions, and the kills recorded

**Scope of this pass: doc edits + git commit/push/sync only.** No app code, no control-plane code, no
enforcement flipped on, no cache bump (`QUEUE.md`/`QUEUE_LOG.md` are not served files). **Nothing was
approved** — a Round-5 verdict of SURVIVES is not an owner go.

**What Round 5 was.** The adversarial gate over everything rounds 1-4 produced: Gemini as a genuinely
independent research adversary (Deep Research, external-literature lens), GPT as the operational judge (the
same thread that authored the report and Round 4), and DeepSeek as a proof adversary — **self-contaminated**,
because it was re-run in its own prior chat and echoed its earlier GPT-lens answer ~95% verbatim, so it is
counted as **one correlated data point, not an independent third**. Dispatch's reconciliation
(`Round5-Synthesis.md`, local-only, one level above the repo) is the authority; this pass **applied it as
written and did not re-derive any judgement.**

**⭐ The signal that actually carries weight, recorded because it is easy to mis-state as "three models
agreed":** Gemini (independent, literature lens) and GPT (operational lens) converged on **substantially the
same spine, the same kills and the same merge shapes from different methods.** That cross-derivation
agreement is the evidence. DeepSeek adds correlated weight only, and GPT itself flagged that Cluster K's
agreement with Round 4 is **not an independent vote** (shared ancestry) — its sophistication earns scrutiny,
not evidentiary weight.

**The headline ruling.** The accumulated future was **coherent only after aggressive merging, and was
overgrown by roughly 5-10×.** The deterministic core is sound, but its _displayed_ assurance runs ahead of its
_observed_ assurance in three decisive places: the private→public boundary, silent supervisor/housekeeping
death, and ledger completeness presented through a valid 19% chain suffix.

---

#### What landed in `QUEUE.md`

A new **[⭐⭐ ROUND 5 SPINE](QUEUE.md#r5)** section carrying: the **reduced North Star** (adopted as the
project's stated direction), the **complexity admission rule** (adopted as standing doctrine), the **three
founding fixes**, the **nine decisive experiments `EXP1`-`EXP9`** as the near-term actionable list, the **eight
canonical abstractions `AB1`-`AB8`** as the organizing spine, a **verdict for every Round-4 slate candidate
`SL-*`**, the signature-demo verdict, the phased sequence, and the **de-duplication map** binding every
existing `BR`/`HA`/Round-3 entry to its canonical home.

**Three new family prefixes, all verified unused before assignment; no existing ID renumbered, re-lettered or
reused (Protocol 49):** `AB` (the eight abstractions), `SL` (the Round-4 consolidated-slate candidates), `EXP`
(the nine decisive experiments).

**⛔ Why `SL-` is mandatory and not cosmetic.** The raw slate letters collide head-on with live queue IDs:
slate `G1`-`G4` are the epistemic candidates while queue **G1-G4** are the owner-greenlit batch; slate `C1` is
the alternate-history explorer while queue **C1** is the cloud warm-up gate; slate `A3`/`A4`, `D`, `E`, `F`,
`H`, `I`, `J`, `K` and `L` all collide too. A bare letter would resolve to the wrong item for any future
session — the prefix is what keeps both identities intact, which is the same reason the `PX` block was told to
cross-reference by slate ID rather than merge.

**Placement decision, recorded because it was a real trade-off.** The spine section sits **below** the
owner-greenlit batch rather than at the top. The 2026-08-01 pass moved 539 lines of header out of the way
specifically so a phone reader reaches "what do I build next" quickly; leading with a ~450-line spine would
have undone that in one commit. "Where we are right now" gained a pointer bullet instead.

---

#### ⛔ THE KILLS — what is lost, and why that loss is acceptable

Recorded in full because a kill with no stated loss is how a decision gets re-litigated six weeks later as a
fresh good idea.

- **The current public-by-default publish walk → DEAD.** ⭐ **The single most important cut in the entire
  round.** _What is lost:_ the convenience of new material being publishable by default — every new directory
  now needs a deliberate admission before the museum can see it. _Why acceptable:_ the loss is the point. A
  deny-list **fails OPEN on the one path nobody thought to list**, and on this boundary failing open is
  unrecoverable — git history is permanent and exposure does not undo. **PX1**'s positive allow-list is the
  replacement, and the 2026-08-01 near-miss (609 tracked files under `planning/`, classified IN) is the
  measured evidence rather than a hypothetical.
- **`SL-E5` dead-man's switch / mutual-witness → EFFECT AUTHORITY DEAD** (all three models agree; contains
  **BR11**). _What is lost:_ automatic action when a heartbeat is missed — the machine cannot take a corrective
  step on its own when it notices the other task stopped. _Why acceptable:_ the **detection** survives intact
  as an external missed-heartbeat **notification** through `SL-I5`, which is the part that closes the measured
  3am gap. The killed half was authority, not observation, and this project's standing invariant is that a
  false denial or a wrong autonomous action is worse than no guard.
- **Cluster K's standalone Governed Learning Plane → DEAD.** _What is lost:_ a coherent always-on learned
  service with its own registry, authority zone and "proof-carrying prediction" story. _Why acceptable:_ every
  genuinely useful part of it survives as the **Learned Scout Contract** merged into existing abstractions —
  batch artifact, frozen episode manifest, release-separated evaluation, deterministic baseline,
  provenance/expiry/abstention, DERIVED output only, typed proposal only, automatic retirement. What died is
  the **plane**: a new authority zone, a standing service, and the claim that a calibrated prediction is a
  proof. None of those was load-bearing for anything measured.
- **Cluster K — owner-attention learner → DEAD** (triple convergence). _What is lost:_ automatic ranking of
  what the owner should look at first. _Why acceptable:_ it acquires **de facto authority through
  presentation** — what a learned ranker demotes, the owner stops seeing, which is indistinguishable from the
  ranker deciding. `SL-I4`'s strictly deterministic digest delivers the same daily value with **no learned
  suppression of deterministic severity**.
- **Cluster K — session hazard / stuckness predictor → DEAD.** _What is lost:_ early warning that a session is
  going wrong. _Why acceptable:_ the failures are **too rare to calibrate** — a confident model on a rare
  class is confidently wrong — and the existing deterministic signals (thrash detection, tree collision, idle
  tracking) already cover the actionable path.
- **Cluster K do-not-build set → DEAD** (all three models agree): a local coding LLM as infrastructure ·
  end-to-end neural anomaly detector · RL controlling sessions or policy · neural supervisor/witness/chain
  replacement · writable vector memory / AI fact graph · LLM publish-or-privacy gate · full fine-tune ·
  federated / swarm / blockchain ML · multi-agent-for-its-own-sake · auto-generated policies. _What is lost:_
  the most ambitious version of "the control plane learns." _Why acceptable:_ each one either puts a model
  inside a gate that exists **because** a model must not decide it (the publish gate, the supervisor, the
  chain), or spends real money and maintenance against the free/≤$10 rule for a capability nothing measured
  needs. The publish-gate case is the clearest: **P16's own rule is that if the agent chooses whether to
  scrub, it isn't a gate.**
- **Conditional kills, recorded now so the outcome is not re-argued later:** `SL-A1` tier (b) — the **formal
  Kani tier dies** unless its bounded experiment catches a seeded defect normal tests miss at maintainable
  cost. `SL-J2` — the **manifest shim dies** (and the unsupported dormant claims are retired) if manifests can
  only be created manually or the downstream paths go unused. `SL-J4` — **provider-exit dies as stated** if the
  continuation turns out to need anything the portable capsule does not carry, keeping only a narrow
  artifact-export claim.

**And one thing that is NOT a kill but is easy to mis-file as one:** `SL-B1` — _"the ledger IS the OS"_ is
**UNPROVABLE-AS-STATED**, narrowed to its strongest honest claim: the ledger is the **canonical audit journal
for governed transitions**, while git, the filesystem and evidence objects stay canonical for their own
domains. The mechanism survives; the marketing claim does not.

---

#### ⏳ THE DEFERS — each with its exact reopening trigger

A defer with no trigger is a vague drawer (Protocol 50 a-form). Every one below names the concrete condition
that would earn it a slot.

| Deferred                                                                                                              | Reopening trigger                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SL-A1` tier (c) — zk attestation                                                                                     | An **external verifier must validate a private execution**.                                                                                                                                                              |
| `SL-A3` — Constitutional Computing                                                                                    | A small-schema version (versioned replayable policy + generated validators) **once the Mission Runtime (AB3) exists**.                                                                                                   |
| `SL-C1` — alternate-history explorer                                                                                  | Replay Bench stable **AND** ≥20 comparable mission episodes across two worker/provider configs **AND** one real decision needs it.                                                                                       |
| `SL-E3` — multi-device pool / Covenant beacon                                                                         | A **second genuinely-independent failure domain** exists **AND** measured availability/compromise risk justifies quorum. ⚠ The optional ROG Ally **does not** qualify — it shares owner, network, power and update path. |
| `SL-F5` — conditional intent escrow / owner-absence                                                                   | **Two observed owner-absence cases** block a repeatable safe operation **AND** a narrow preauth can expire / be revoked / be compensated.                                                                                |
| `SL-H3` — Hyper-V / TEE enclaves                                                                                      | A real untrusted workload **cannot** be bounded by worktrees / OS accounts / process controls / capability gates **AND** an on-device prototype proves reliable recovery. TEE claims need **measured hardware**.         |
| `SL-K4` — registry **service/UI** (the manifests themselves survive)                                                  | **≥2 recurring deployed scouts** create real lookup burden.                                                                                                                                                              |
| Cluster K — causal-effectiveness lab                                                                                  | **≥20 treated + ≥20 control episodes**, verified outcomes, no dominant confound.                                                                                                                                         |
| Cluster K — cross-release mosaic analyzer                                                                             | **≥3 real public releases** **AND** a concrete threat model.                                                                                                                                                             |
| Cluster K research-future (contrastive encoder · temporal-graph GNN · world model · contextual bandit · distillation) | Each carries its own concrete **data or hardware** trigger; none is near-term.                                                                                                                                           |
| Remote transport-only MCP (**RB4**/**MCP1**/**MCP2**, **BR3**)                                                        | Local **RB1** inbox/return completes **3 real missions cleanly** **AND** measured mobile friction remains. **WAKE stays out of scope while platform-blocked.**                                                           |

---

#### 🔬 THE NEEDS-DECISIVE-EVIDENCE ITEMS — experiment + outcome rule for each

**The rule these obey, adopted as Round-5 method:** no experiment may be a generic "add monitoring." Each
states hypothesis · exact falsifier · setup · injected condition · expected-healthy evidence ·
expected-broken evidence · cleanup · safety boundary · implementation cost · AI-usage cost · **whether the
experiment itself can fail silently** · which candidates it resolves.

- **`SL-J2` the manifest shim + the five dormant kernel subsystems → `EXP4`.** _Experiment:_ run ONE real
  bounded mission from a durable manifest — crash/resume, stale-SHA rejection, an enforced postcondition, low
  ceremony. _Outcome rule:_ passes → **SURVIVES**, keep the paths the mission actually used; manifests
  creatable only by hand, or downstream paths unused → **KILL the shim, delete or archive the unused paths,
  and retire the claims that depend on them.** ⛔ **This is also the correction that matters most in the whole
  pass:** the five CPK subsystems were being described in `QUEUE.md` as things that "actually exist now."
  Their **code** exists; the **capability** does not — `state/manifests/` has never existed and zero jobs have
  ever been tracked. Round 5's wording is deliberate: _"they are unbuilt today, not merely dormant."_ The
  built/partial/queued/proposed/deferred/rejected/unverified distinction is preserved by fixing that claim,
  not by softening the verdict.
- **`SL-J4` provider-exit → `EXP6`(b).** _Experiment:_ continue a frozen mission with a replacement
  worker/provider **from the portable capsule only**. _Outcome rule:_ succeeds → **SURV-C**; hidden provider
  dependence → **KILL as stated**, keep a narrow artifact-export claim.
- **`SL-A1` tier (b) the bounded Kani proof.** _Experiment:_ express the small load-bearing epistemic
  transition core in a proof-checkable form and machine-prove its properties. _Outcome rule:_ catches a seeded
  defect normal tests miss, at maintainable cost → **SURV-C for that exact proof only**; otherwise the formal
  tier is **KILLED**. ⚠ Its Protocol 22 tension (a second implementation of rules that already exist in JS)
  must be argued as _a proof artifact derived from the JS core_, never waved through as a second core.
- **The Reaper (`DG3`/`REF2`).** _Experiment:_ seed one genuine orphan **and** one long-valid session.
  _Outcome rule:_ distinguishes them with kill/compensation safely rehearsed → **SURV-C for narrowly
  enumerated states**; **any false kill or unprovable ownership → observation only, no auto-action.**
  `SL-H1`'s pre-signed deterministic safe-reflex catalog is its **only legitimate promotion path** (DeepSeek's
  KILL of `SL-H1` was overruled precisely on this ground).
- **Cluster K — semantic idea-genealogy · hybrid retrieval+rerank · context-core optimizer → `EXP9`.**
  _Outcome rule:_ must **beat a cheap deterministic / FTS / graph baseline on chronologically and
  release-separated data, or die.** ⛔ The whole cluster sits behind this gate; nothing learned is built, even
  in shadow, before it passes.

#### ⭐ `EXP7` — filed as an unresolved slot, then BOUND by the owner the same day (2026-08-02)

**How it went, recorded in both halves because the process is the point.** The synthesis's phased sequence
names experiments **1, 2, 3, 4, 5, 6, 8 and 9** and **never assigns a number 7**. Two decisive experiments
existed in the document without numbers — the **Reaper test** and the **bounded Kani proof** — and binding one
of them to the empty slot would have made the numbering _look_ complete while resting on a guess. So `EXP7`
was filed **as explicitly unresolved, with both candidates recorded beside it**, and flagged upward.

**The owner supplied the real definition within the hour, and it was neither of them.** ⭐ **`EXP7` = GPT's
Experiment 7, the OWNER-COMPREHENSION + ALERT-EPISODE test.** _Setup:_ replay a **sanitized** set of recent
alert families + **seeded critical cases** + several **frozen action envelopes**, comparing the **current
view** against the proposed **episode/digest view**. _Falsifier — any one of three:_ a deterministic
**high-severity / privacy / witness** item is **hidden or materially delayed**; the owner **cannot correctly
identify** target / effect / unknown / irreversible consequence; or an **acknowledgement is mistaken for a
resolution**. _Outcome rule:_ **a lower alert count WITH complete critical detection AND correct comprehension
→ the `SL-I4` digest SURVIVES**; ⛔ **any hidden critical item → redesign, WITHOUT learned ranking.**
_Resolves:_ `SL-I1`-`SL-I4`, `SL-A6`'s presentation half, the owner-root-of-trust risk, the
**owner-attention-learner KILL**, and `SL-F6`'s framing. Filed at **Phase 1**, since that is where the
candidates it resolves sit.

**⛔ And the correction that came with it: the Reaper test and the bounded Kani proof are NOT `EXP7`.** They
are **candidate-specific NDE gates** — attached to the **Reaper** (`DG3`/`REF2`) and to **`SL-A1` tier (b)**
respectively, deliberately unnumbered, and **outside the spine's phase sequence**. The earlier draft's
suggestion that one of them might fill the slot is corrected in place at both candidates.

**⭐ Why this is worth a paragraph rather than a silent edit.** `EXP7` is the only experiment in the nine
whose **subject is the owner rather than the machine**, and it exists because _"fewer alerts"_ is
indistinguishable from _"the important one was suppressed"_ unless someone measures comprehension directly.
That makes it the test where the **owner-attention-learner KILL is actually verified instead of asserted** —
and it would have been lost entirely had the empty slot been filled with a plausible guess. **Flagging the
gap rather than closing it is what let the real answer arrive.**

---

#### ⚖️ THE OVERRULES — where a model's verdict was rejected, and why

Recorded because an adjudication that only reports agreement has hidden its hardest calls.

- **`SL-A2` coverage certificates** — DeepSeek's demotion to "a line in the morning report" **overruled**;
  Gemini + GPT are right that it is a real mechanism, and it is the chain's **completeness partner**.
- **`SL-A6` guarantee-ceiling gate** — DeepSeek/Gemini's KILL as "unimplementable" **overruled**. It is the
  operationalization of _"CLAIMED never renders complete"_, it is cheap, and it is core.
- **`SL-F6` Evidence Court** — DeepSeek/Gemini's "survives standalone" **overruled** downward: it is a
  **function of the assurance gate**, not a separate court. A deterministic clerk that checks typed evidence
  and exposes disagreement, never deciding semantic truth.
- **`SL-H1` deterministic safe reflexes** — DeepSeek's KILL **overruled**: this is the Reaper's only
  legitimate promotion path, and killing it would leave the Reaper permanently stuck in shadow with no
  designed route out.
- **`SL-I4` morning report** — Gemini's KILL (automation bias / "liability sponge") **overruled**. Gemini's
  fear is specifically **ML-filtered attention ranking**; a deterministic, action-first digest with **no
  learned suppression of deterministic severity** answers that fear _and_ closes the silent-death gap.
- **`SL-I5` obligation registry** — Gemini's KILL rests on a **MISREAD** and is overruled: `SL-I5` watches the
  **JOB/OBLIGATION from outside the emitting component**, not the operator. It is **the** fix for the measured
  3am silent death.
- **The signature demo** — DeepSeek/Gemini's "theater / KILL" **overruled toward GPT's nuance**: it survives
  **as an integration acceptance test and museum story, never as proof of the doctrine.** ⛔ A memorized path
  with known injected defects proves only the harness; surviving _variant_ failures and reconstructing state
  after a reboot is what demonstrates the spine.
- **`SL-C3` counterexample forge** — Gemini SURV vs DeepSeek KILL vs GPT MERGE: **merge wins**; it is fixture
  generation, not a standalone system.
- **`SL-A3` Constitutional Computing** — DeepSeek/Gemini KILL vs GPT SURV-C: **split the difference** as a
  DEFER with a named trigger. Real value, not near-term, not spine.
- **`SL-B2` semantic compression** — Gemini's KILL on cryptographic grounds is **honored rather than
  overruled**, by the containment: _never rewrite canonical history on "semantic equivalence."_

---

#### 🔀 THE MATERIAL PLACEMENT CHANGES — what moved, and why

- **The `BR` block (BR0-BR26) is now a historical record plus pointers, not the live filing.** Every item
  carries an inline `[R5: …]` disposition; the ones that MERGE live under an abstraction, and the entry below
  is the reasoning that got them there. **Nothing was deleted** (Protocol 49: retire in place, never renumber,
  never delete the reasoning). ⚠ **Six `BR` items — BR1, BR4, BR14, BR19, BR21, BR23 — were NOT adjudicated
  by name** (plus **HA5**: seven in total) and are **flagged as such**, keeping their existing PROPOSED status
  rather than being handed a verdict by inference. **The owner holds them for the North Star pass**
  (2026-08-02) — they are not for a later reconcile to resolve unilaterally. BR1/BR19/BR23 are nonetheless bound by the **Operator-CLI clause**: every renderer and
  action must be generated from the one catalog + projector **before** a new surface is added.
- **`BR`'s BUILD ORDER is superseded as the sequencing authority and kept in place as the record.** Its
  instinct (cheap, read-mostly, measure-before-enforce) survives inside Phase 1, and BR6/BR7, BR5 and BR8 keep
  their high rank — but **EXP1** and **EXP2** now come first, because they close **measured** assurance gaps
  rather than merely being cheap.
- **The Round 3 addendum was vindicated and promoted, not merely filed.** Its diagnosis underwrites two of the
  three founding fixes, and its deepest line — ⭐ _"no component may be the sole detector for its own
  non-execution"_ — is now adopted doctrine. Its **scoped feature-freeze was NOT adopted as a stop-work
  order**; it is answered by _sequencing_ instead, with the three truth debts sitting at Phase 0-1 ahead of
  every new capability, and app development explicitly unaffected exactly as that round scoped it.
- **The `HA` block:** HA1/HA2/HA4 **SURV-C → AB6**, admissible **only as executable boundary tests** with
  positive _and_ negative paths exercised and **generated from canonical rules**; HA3 **MERGED → `SL-D1` →
  AB7** (⛔ its squash-regenerate clause contained as **incident response only — it cannot un-fetch copies**);
  **HA5 not adjudicated**, unchanged. HA1's GATE A still binds.
- **The `PX` block came out on top and is unchanged in substance.** PX1 is **Phase 0** of the spine and the
  head of the museum track; **the publish FREEZE stays in force**, with its release condition sharpened from
  "until PX1 lands" to "**until `EXP1` passes** — and even then only under a narrow claim." PX2/PX3 are
  SURV-C. ⭐ **Round 5 adds one thing to PX1's scope: privacy-policy recovery** — the scrub list is unbacked
  and lives on exactly one disk, so a machine loss destroys the only guard on the one boundary that cannot be
  un-crossed. **BR20**'s fingerprint (verify without storing) is the shape.
- **`AUD2`'s dangling cross-references are RESOLVED, exactly as that entry demanded of the first reconcile
  to land this material.** `F4` → `SL-F4` (**MERGE → one Resource & Assurance Policy**, AB3) — the synthesis
  names it explicitly as where AUD2 lands. `Cluster-K` → the `SL-K*` block, behind `EXP9`. The **context-core
  optimizer** is NDE(EXP9); the **usage/rework forecaster** MERGEs into `SL-F4` with empirical intervals only
  and never grants budget. ⭐ **And the "alignment scout" now has a concrete referent** — the thing AUD2 said
  it would have to locate or create: a **deterministic-first Assurance Dependency Auditor** over typed
  lifecycle edges. **AUD1 and AUD2 are otherwise untouched and still gated.**
- **`G1` (CP5, the off-machine witness) is CONFIRMED and unchanged in status**, with three build constraints
  attached: build the **narrowest** observer; **do not import the supervisor's projector/expectation manifest
  unchanged**; and know that the external missed-obligation observer (`SL-I5`, `EXP2`) may later ride on the
  same framework — design it so it can. A witness **pool** (`SL-E3`) is deferred.
- **The roadmap spine gains a reconciliation note** explaining that it sequences **programs** while the
  Round-5 phased sequence sequences **what must be proven** — with two binding constraints connecting them
  (the museum may be built but not shipped; "control plane finished" now means `EXP4` has shown a real mission
  exercises the kernel, not that the code exists).

---

#### What was deliberately NOT done

- **Nothing was promoted or approved.** `BR`, `HA` and `PX2`/`PX3` remain ⛔ PROPOSED with no spec and no slot.
- **No owner decision was reopened.** The greenlit batch **G1-G4** is untouched and still runs first; **AUD1**
  and **AUD2** are unchanged and still gated; **PX1**'s freeze is unchanged in force.
- **No ID was renumbered, re-lettered or reused**, and no shipped account was rewritten (Protocol 49 + this
  file's ARCHIVE-class rule).
- **No verdict was invented for an unadjudicated item**, and **no experiment was invented for the empty
  `EXP7` slot.** Both were flagged instead — and the `EXP7` flag was **answered by the owner the same day**
  with a definition no guess would have reached (see above), while the seven un-adjudicated `BR`/`HA` items
  (BR1, BR4, BR14, BR19, BR21, BR23, HA5) stay ⛔ PROPOSED for the owner to adjudicate **in the North Star
  pass**. A queue that quietly interpolates the missing entries reads as complete while resting on
  guesses — which is the precise failure mode this whole round exists to remove.

<a id="cpconsolidate0730b"></a>

### 2026-07-30 (later still) — REF4 (thrashing-detector refinement) and PM1 (post-mortem/retrospective) filed onto the just-tidied control-plane board

**Scope of this pass: doc edits + git commit/push/sync only.** No control-plane code was written or changed,
nothing was killed, no enforcement was flipped on.

**Context — a live concurrency note, recorded because it actually happened.** The consolidation pass recorded
below at `#cpconsolidate0730` was found already sitting uncommitted in the working tree when this pass began
(git status went from clean to modified between two checks a few minutes apart — another session had picked
up the same consolidation task and was actively writing to `QUEUE.md`/`QUEUE_LOG.md`). Rather than edit over
live uncommitted work (Protocol 12), this pass paused, reported the collision, and waited; the other session
finished and committed on its own (`e73c86b`) before this pass resumed. That commit covered items 1-4 and 7
of the owner's consolidation brief correctly and in full. This pass adds only the two items it was missing:
**REF4** and **PM1**.

**REF4 — thrashing-detector refinement (owner-approved 2026-07-30).** Two more false-ish positives, distinct
from the `53a3bb89` case `15c17d0` already fixed, surfaced 2026-07-29/30. Two corrections, filed as a
refinement to the shadow-only detector (feeds **DG1**'s shadow→kill promotion gate, does not promote it):
**(i)** a session frozen mid-read with zero activity at all is a **different state** from a session issuing
repeated failing tool calls — "stalled/hung, no activity" is **POSSIBLY_STALLED**, not thrashing, and needs
different wording and a different response; **(ii)** the slow-pre-push-gate / push-retry pattern (repeated
push attempts timing out at the tool level, no file changes between attempts) must **not** be flagged as
thrashing — a session mid-push, retrying because the previous attempt's tool call itself timed out, is
waiting on a slow gate, not stuck. Stays shadow/alert-only, per the three-model review's existing doctrine
governing **DG1** — no kill authority is added or implied.

**PM1 — post-mortem / retrospective of RobCo (new family prefix, owner-approved 2026-07-30).** A three-angle
document — (a) plain-language "what is RobCo & how it got here," (b) technical/architecture retrospective,
(c) lessons-learned — sequenced as its own top-level section, placed deliberately **between** the
control-plane program and **THE MUSEUM PROGRAM** cluster. The owner's own sequencing reasoning: reflect
first, then build the exhibit; and the retrospective doubles as source material for the museum's next
content pass (it feeds **P8**'s corpus and **P15**'s control-plane arcs the same way a first-hand account
would). Gated on the CP program's ready-to-build batch actually landing, same real-data precondition
**AUD1** already states, so the retrospective describes shipped state rather than a plan that will move
under it.

**⛔ No ID was renumbered, re-lettered or reused (Protocol 49).** REF4 extends the existing REF family
(REF1-REF3 already assigned); PM1 is a new family prefix, chosen because it names a genuinely new kind of
item (a written retrospective, not a control-plane mechanism) — the same "new work takes a family prefix,
single letters and adjacent families are spoken for" rule the original consolidation pass already applied to
AUD.

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

<a id="appendix2"></a>

# Appendix II — the relocated `QUEUE.md` header chain: 2026-07-30 and earlier (moved 2026-08-01)

_**Moved, not deleted — verbatim.** On 2026-08-01 the accuracy pass found `QUEUE.md`'s running
"Last updated / Prior update" chain had grown to ~870 lines sitting **above** "Where we are right now" —
so a phone-first reader had to scroll past most of a year's worth of history to reach the queue itself.
That is the exact failure the 2026-07-21 QUEUE/LOG split exists to prevent, reappearing in the header
instead of the body. Every block dated **2026-07-30 or earlier** was relocated here, byte-for-byte, in its
original newest-first order; `QUEUE.md` keeps the 2026-07-31 round and everything after it, plus a pointer
to this appendix. Nothing was rewritten, summarised or dropped._

**Prior update — 2026-07-30 (HG2 BUILT + SHIPPED — the terminal now says which part failed to start)** —
**HG2 is shipped, app repo `aef7da4`: the boot sequence is isolated phase by phase.** Starting the terminal
runs **51** named phases (the queue's old "~45" was an estimate; the real count is 51). Every one of them
sat under a **single** outer `try`/`catch`, so the first phase to throw silently abandoned all the rest and
the only trace was a console line no user ever sees — that is the exact mechanism behind "the terminal came
up blank and there's no way to tell what died." Each phase now runs under its own guard, in **byte-identical
order** (the two awaited async phases still await; only the isolation is new), and every phase is
**classified**. **Exactly three are fatal**, each chosen from what the code actually does rather than how
important it sounds: restoring the campaign, the master render pass, and opening the last-used screen — that
third one because the tab switch is what makes any panel visible at all, so skipping it produces a literally
blank column. **Everything else degrades:** a sound channel, a suggestion list or a device pref that fails no
longer stops the phases after it; the terminal carries on, files the fault in the same ring-buffer the FAULT
lamp and the service console already read, and **tells the user in the transcript** — never console-only.
A fatal phase instead paints a **self-contained BOOT FAILURE screen** naming the phase, the fault, anything
already degraded, and a RETRY BOOT control — built from inline styles and text only, because it may have to
survive a fatal fault in the very phase that paints the UI. **⚠ One deliberate fail-OPEN, recorded rather
than buried:** an unknown phase name degrades instead of killing boot — a typo must never be the thing that
bricks the terminal, and the gate is the right layer to catch it (Suite 258.15 does, in both directions).
Locked by **Suite 258**, behavioural against the real functions in a `vm` sandbox, **including the HG1
footgun re-checked one file over** (a console-less sandbox must not turn "a phase failure is contained" into
"a phase failure is fatal"). **Suite 132.5 was RESTATED, not re-bumped** — its raw line-count ceiling stopped
measuring anything once every phase became a three-line wrapper, so it now asserts each phase callback is a
single named call, which is strictly stronger. Full `npm run gate` green; also verified in a real browser
(clean boot, the degraded transcript line, and the fatal screen). `CACHE_NAME` r20 → r21. **This closes the
HG1–HG2 pre-museum hardening pull-forward: both are now shipped, ahead of 2.9.0's OS services widening these
surfaces.**

**Prior update — 2026-07-30 (REF5 BUILT + SHIPPED — the "your work isn't backed up" alerts stopped crying
wolf)** — **REF5 is shipped, control repo `e3706db`.** The two alerts the owner watched false-fire 6+ times
during ordinary builds — _"a session tried to push but I never saw it confirm"_ and _"your latest work
isn't backed up — N commits not on the remote"_ — were firing during the completely **normal push window**.
The cause is arithmetic, not a bug in the detection: a full-gate push runs **minutes** (the wrapper's own
ceiling is 20), a build often pushes **both** repos one after the other, and the supervisor checks every
**5 minutes** — so a check lands mid-push, sees a commit that isn't on the remote yet, and concludes the
work is unbacked. It wasn't; it was in transit. **Both** detectors now share one set of four checks
(`lib/push-window.js`, so they can never drift apart): **(1)** if the remote already has that exact commit,
the alert is **retracted** — previously such a warning stayed open forever, because the record that would
have closed it can never arrive; **(2)** if a push is actually running, stay quiet — read two ways, from
the push record ACT3 writes _and_ from the push lock, because the control repo runs its gate **before** the
push record exists, so the lock is the only thing that covers those first minutes; **(3)** if the session
that owns the work is still live, stay quiet — work mid-build is _supposed_ to be unbacked; **(4)**
otherwise wait out a grace period at least as long as a healthy push, taken from the wrapper's own ceiling
rather than a second number that could drift. **It is not neutered, and that is proven, not asserted:**
genuinely stuck work — nobody live, at rest past the ceiling, nothing in flight, not on the remote — still
alarms, and a deliberate mutation that removed the suppression turned the gate **red** (4 failures) before
being reverted. **One divergence recorded on purpose:** when the machine can't tell whether a session is
live, REF1 stays silent but REF5 still alarms — a commit sitting off the remote past the full ceiling is a
real gap whatever the process table said, and the alternative is a machine that quietly does no backup
alerting at all. **Auto-retract now reaches the phone** for these two alerts only: one all-clear when the
work lands, instead of a stale warning left standing. **A quiet run stays legible** — every stranded push is
still detected and logged with the reason it was held back, so "said nothing" can always be told from
"decided to say nothing". Control gate ran for real (CPB6): `gate: PASSED`, origin VERIFIED, clean-push
counter **23/10**. Locked by control test groups **PW** + **PWE**.

**Prior update — 2026-07-30 (ND1 BUILT + SHIPPED — the two repos can no longer come to mean the same word two ways)** — **ND1 is shipped, app repo `ca38f79` + control repo `31e987c`: a naming-domain guard, filed as a new
`ND` family and built in the same pass.** The app owns **`RobcoEvents`** — the client-side game/UI bus in
`js/core/state.js`, in-page subscribers, nothing persisted. The control plane owns **"ledger events"** — the
appended, replayable records its `lib/ledger.js` writes, each with a `type:` field. **Verified rather than
assumed, there is no clash today:** the control repo contains zero `RobcoEvents` and the app's `js/` contains
zero "ledger event". But "events" already means two entirely different things depending on which repo you are
standing in, and both sides are growing — so the boundary is now written down once (`tests/naming-domains.json`,
duplicated byte-identical into the control repo, because the two share no package) and **each repo's own gate
checks its own source against it**: **Suite 257** here, **test group ND** there. No cross-repo runtime coupling;
each side degrades to "sync unverified" rather than failing when the sibling checkout is absent, so a public
clone is never blocked. **The part that stops it rotting into a taxonomy:** only distinctive COMPOUNDS are
reserved — `ledger`, `event`, `receipt`, `incident` and `proposal` sit on an explicit SHARED list, because this
app has shipped a Field Ledger panel and a release-receipt script for months and reserving those bare words
would outlaw live code. Both guards prove that behaviourally, and both carry a red-then-green proof that a
violating source really is caught. **Nothing was renamed** — `window.RobcoEvents` is precached and referenced
across the app; the guard protects the existing names. Full `npm run gate` green; control suite green
(1137/1137). `CACHE_NAME` r19 → r20 — no app code changed, but `CHANGELOG.md` is itself precached, so a
"tests and docs only" commit is not automatically cache-bump-free.

**Prior update — 2026-07-30 (HG1 BUILT + SHIPPED — the event bus is hardened)** — **HG1 is shipped, app
repo `31206dd`: the OS event bus finally has the four things it was missing.** `RobcoEvents` shipped at U7
with only "add a listener" and "announce an event" — there was no way to REMOVE a listener, no way to say
"tell me the next time this happens and then forget me," and nothing stopping the same listener being
added twice and reacting twice to one event. All three now exist (`off`, `once`, dedup), plus `on`/`once`
handing back an unsubscribe handle so a caller never has to keep the function around. **The substantive
change is how a crashing listener is handled:** one was already prevented from taking its siblings down,
but it was silenced _completely_ — a broken reaction just quietly stopped working with nothing to show for
it. A crash is now REPORTED per-handler, naming the event, while the other listeners still run. Delivery
also takes a snapshot first, so a listener that adds or removes another mid-delivery can't cause one to be
skipped or double-fired. **⚠ Honest limit, stated rather than overclaimed:** dedup keys on function
IDENTITY, so the anonymous arrow handlers every `_wire*EventBusSubscribers()` registers are distinct
objects and are NOT deduped — and none of them is registered twice today anyway (each wiring function is
called exactly once from `window.onload`). This is API-level hardening landed deliberately BEFORE 2.9.0's
OS services widen bus usage, not a fix for a live double-fire. No re-entry guards were bolted onto the six
wiring functions either: that would be a parallel implementation of dedup (Protocol 22) for a risk with no
incident on file (Protocol 36b / 49). **PROTOCOL 42 — a real footgun found while building it, fixed and
locked in the same commit:** `state.js` is evaluated in `vm` sandboxes with **no `console`** (the gate's own
bus harness), so the obvious way to write that crash report raises a `ReferenceError` _from inside the
catch_ — turning "a bad listener can never break the emitter" into "a bad listener always breaks the
emitter" the moment logging was added. The reporter is fully guarded, and both the console-less and
console-present cases are locked. Locked by **Suite 256** (14 assertions, behavioural against the real
`state.js`); Suite 135 keeps the original U7/U8 contract and passes unchanged. Full `npm run gate` green
(3701/3701 plus boot smoke, render check at 360/412, a11y, `test.html` runtime audit, save-survival,
offline-first). `CACHE_NAME` r18 → r19.

**Earlier — 2026-07-30 (ACT2 BUILT + SHIPPED — the write-side is activated)** — **ACT2 is shipped,
control repo `7ca220c`: the kernel's two write-side actions are finally CALLED by something.** Rank 2's
publisher and rank 4's continuation-packet generator had been built, tested and callable since 2026-07-29,
but nothing ever invoked them — every run was a human at a CLI. A new decision layer
(`lib/write-side.js`) now sits in the supervisor's 5-minute loop, and it activates the two halves to
**deliberately different depths**. **Continuation packets are FULLY LIVE:** a packet is a derived local
JSON file that actuates nothing, so it sits inside the write scope the supervisor always had — every
packet-worthy job gets one written automatically, and an unchanged job is _not_ rewritten every five
minutes (a fingerprint read back from the loop's own ledger events decides). **Publishing is SHADOW, OFF
BY DEFAULT:** readiness is detected, recorded and phone-alerted every run (it is a real thing waiting on
the owner), but the actuation is gated on `state/auto-publish.json` holding a literal `{"enabled": true}`
— absent by default, and unreadable/malformed/non-literal-true all fail CLOSED. **The asymmetry is
recorded as a decision, not a default:** `publishJob()` moves a real remote ref, and giving an unattended
scheduled task that standing authority is a different class of change from writing a local file — **DG2**
demanded ten observed clean pushes before it would merely _refuse_ a raw push, and **CPB7**'s kill
authority is owner-confirmed data-gated; performing pushes earns at least the same care. Flipping the
switch needs **no code change**, which is what keeps this an activation switch rather than a deferral.
Locked by test groups **WS** + **WSI**, including an end-to-end proof that a genuinely publish-eligible job
leaves the remote ref untouched (`ls-remote` ground truth, no publish intent ever recorded), plus an
out-of-suite red-then-green run showing the switch is the only thing standing between shadow and a real
push. ⚠ **Deliberately out of scope, said plainly:** the per-job **usage-capture** plumbing CPB1 waits on
is NOT part of this — capture needs a launcher to capture from, and there is no launcher; building it with
no producer would be faking a data source. **DORMANT UNTIL FED** — both halves key off jobs, no launcher
writes a manifest yet, so today both report zero candidates of _zero jobs tracked_. Pushed through the
wrapper with the real control gate running (CPB6): `gate: PASSED`, origin VERIFIED, clean-push counter
**18/10**.

**Prior update — 2026-07-30 (CPB7 owner ruling STAMPED + ROADMAP SPINE recorded — doc-only)** — Two
doc-only folds on the owner's directive, no ID renumbered (Protocol 49). **CPB7:** the session circuit
breaker's **KILL/RESET authority** (auto-SIGTERM a spiraling session + reset its worktree to the last clean
SHA) is stamped **OWNER-CONFIRMED to remain DATA-GATED / shadow-only** — explicitly NOT to be built as an
autonomous killer. The buildable-now half (classify + recovery budgets + alerting, shadow-only) is
unchanged; the kill/reset authority waits behind the data-gate (same bar as **DG1**) until there's evidence
it won't false-fire, consistent with the process-kill echo-and-confirm safety rule. **ROADMAP SPINE:** a
new near-term macro-ordering section records the **iterative + overlapped** sequence — finish/activate the
control plane → build the museum **as the live workload** that generates real operating data → run the
**WORKFLOW AUDIT (AUD1)** on that real data with the **MUSEUM AUDIT (P15)** riding along → absorb
control-plane fixes → continue the museum; cross-references **AUD1**, **PM1**, and the museum program, and
is owner-adjustable. Doc-only; pushed via `npm run push` (the wrapper — raw `git push` refused). SHA +
counter in this pass's report.

**Prior update — 2026-07-30 (multi-model design round FOLDED — GPT-5.6 / Gemini 3.1 / DeepSeek)** — A
DOC-ONLY synthesis + fold of a three-model design round into the queue; **nothing here is built** — every
item is recorded as a design. Grounded first against the repo + `planning/control-plane/**` to dedup.
**EXTENDED (no new IDs):** **CPB5** gains its phased build plan (GPT's Node-native vertical-slice ladder —
the STATE VOCABULARY + UNIFIED ACTION ENVELOPE foundations, then v0.1 decision-loop / v0.2
live-work+admission / v0.3 resilience, with release gates; the turtle banner + 3-level notify +
beautiful-TUI additions reconciled, not superseded); **CP5** gains the concrete off-machine WITNESS design
(ledger-head anchoring + second-opinion remote-SHA verify, Tailscale, separate Pushover token,
advisory-only); **CPB1** gains the cap-reset ANCHOR + confirmed-live-data framing (`fh`=session %,
`sd`=weekly all-models %; Sunday 2:59 PM weekly reset owner-anchor; ~5h rolling session; "proxy" upgraded to
confirmed server data); **REF5** gains session-activity-awareness (don't alarm while the owning session is
still live). **NET-NEW:** **CPB7** (session circuit breaker — failure classify + recovery budget, the
formalized thrashing/reaper extension, kill authority stays DG1-gated); **CPB8** (quick-ack bot —
typed-proposal-only owner approvals, sole-writer + AI-never-actuates preserved); **P16** (automated
pre-publish PII/secret scanner — hardens the name-scrub gate from human-only to enforced); **P17** (museum
PREVIEW tab — owner favorite, curation surface extending CPB5 + the publish pipeline). **DECLINED /
proposals-only:** Agentic Museum Curator and Trivial Lint Auto-Resolver (both stretch AI-never-actuates /
name-scrub-is-a-gate). **ALREADY-HAVE (not re-filed):** the USAGE ADMISSION GATE rides CPB2's operating
modes; the phone cockpit + Tailscale transport is CPB5's existing spec; the sole-ledger-writer /
proposal-only / name-scrub-mandatory invariants are the standing doctrine block. No ID renumbered
(Protocol 49). Doc-only; pushed via `npm run push` (the wrapper — raw `git push` refused). SHA + counter in
this pass's report.

**Prior update — 2026-07-30 (DG2 + CPB6 SHIPPED — push-guard enforcement is LIVE)** — Two items shipped in
one session on the owner's go. **DG2:** raw-`git push` refusal is now ACTIVE in both the app and control
repos — a push not routed through the controlled-push wrapper (`npm run push`) is refused by a pre-push hook
(the guard requires the wrapper's env token AND a live L4 process-ancestor, neither forgeable alone).
**Break-glass, so the owner is never locked out:** `ROBCO_PUSH_OVERRIDE="<reason>" git push` (allowed AND
logged to the ledger) or `git push --no-verify` (bypasses all hooks — absolute fallback). The app hook
`[ -f ]`-guards the sibling guard so a public clone is never blocked, and captures git's pre-push payload
once to feed both the guard and `gate-scope.js` (a Protocol-42 stdin-multiplex fix). **CPB6 (folded into the
same session on owner directive):** the control repo now runs its own test suite as the wrapper's gate — a
control-repo wrapper push RUNS `node test/run-tests.js` before pushing and ABORTS on failure, recording
`gate.passed`, not `gate.skipped`. So the earlier "DG2 activation does NOT fix CPB6" framing is superseded:
**both** shipped together — routing enforced (DG2) AND the control gate enforced (CPB6). Live red/green
verified on both repos; app `dev` `05c450b`, control `main` `f0ed42a`; clean-push counter 14/10. Locked by
app Suite 255 + control groups PG/PH (PH7) on the CP2/CP3 code path. SHAs + counter in this pass's report.

**Prior update — 2026-07-30 (CPB5 fold — three owner additions, doc-only)** — Folded three owner-approved
additions (all 2026-07-30) into the existing **CPB5** operator-control-CLI entry, no ID renumbered, nothing
rebuilt: **(1)** a **locked startup-banner decision** — the `robco` CLI opens on a two-tone sea-turtle banner
(phosphor-green turtle over a blue waterline), GPT's dependency-free `robco-turtle-banner.mjs` renderer,
truecolor with `NO_COLOR`/unicode/ascii fallback, chosen over Gemini/Fable/hand-drawn; **(2)** a new
**notification-control capability** — the CLI manages Pushover delivery with a global on/off plus
per-alert-type toggles (settings-panel style), human-driven with a ledger event per toggle. **Refined same
day (2026-07-30):** three mute **levels** — normal / standard mute (criticals still break through) / **total
blackout** (everything off, including criticals) — with an **auto-unmute** safety net on any level, **default
2h 30m** (configurable), tracked via the supervisor's 5-minute tick (no always-on timer); **(3)** an explicit
**first-class aesthetic requirement** — a polished TUI at Claude Code CLI finish level (phosphor theme,
boxes/tables/color, the banner). **Also corrected the stale DG2 counter line to its live value 10/10 —
threshold MET** (enforcement AVAILABLE, not auto-activated; still gated behind CPB6). Doc-only pass, pushed
through the CPB4 doc-only fast path. SHA + the post-push DG2 counter are in this pass's report.

**Prior update — 2026-07-30 (CHECKPOINT — consolidation / state-save pass, no code built)** — **A
checkpoint fold + reconcile + push-verify-all pass; no code feature was built (ACT2 and the control-repo
push-gate fix are queued, not built here).** Folded: **(a)** a **token-billing framing refinement to CPB1**
(owner-approved 2026-07-30) — its budget alert (tokens/$) is scoped as a **token-billing guardrail**: stay
**quiet while the owner is on his MAX subscription** (spend is against a usage allowance, not dollars) and
speak up **only when actually on pay-as-you-go tokens** (the rare fallback); the trigger gates on being in a
token-billing state. Recorded as framing only — CPB1 is not rebuilt. **(b)** CPB5's phone-cockpit entry now
**explicitly names Tailscale as the private transport** (it was already stated; reinforced so the mechanism
is unambiguous). **(c)** a **new item CPB6** — the control-repo push-gate gap: the controlled-push wrapper
records `gate.skipped` for the control repo because it has **no enforced gate hook** (its tests run via a
manual `node test/run-tests.js`), so control-plane pushes rely on **discipline, not enforcement**; the fix
(to BUILD later, not now) wires the control repo's test runner into the wrapper or a real pre-push hook so
those pushes are genuinely gated and record `gate.passed`. Filed near the DG2 / push-gate items. **(d)**
**ACT2 marked owner-greenlit (2026-07-30) — the next build after this checkpoint.** Also reconciled:
`planning/control-plane/CONTROL_PLANE_STATUS.md` brought current with shipped reality (CPB4/ACT3/CPB1/CPB2
shipped; CPB2 LIVE not dormant), and the **DG2 clean-push counter corrected to its live value 8/10 at this
checkpoint** — _since advanced to **10/10, threshold MET** (2026-07-30, the CPB5-fold push was #10); DG2
enforcement is now AVAILABLE but NOT auto-activated, still gated behind CPB6 wiring the control-repo gate_
(the `3/10` snapshots below are the ACT3-dogfood-day value, left in place as dated history). No ID renumbered
(Protocol 49); doc-only pass. **Verified remote SHAs** and the post-push counter are in this pass's report.

**Prior update — 2026-07-30 (ACT3 BUILT + SHIPPED, dogfooded live)** — **ACT3 is shipped: this
project's pushes now route through the controlled-push wrapper, and the ≥10-clean-pushes counter that gates
DG2 is moving.** `npm run push` (app repo `scripts/robco-push.js`) routes a push through the control plane's
`controlled-push.js` (resolved via `$ROBCO_CONTROL_PUSH` or the `../_RobCo-Control` sibling; degrades to a
plain `git push` if absent). **CPB4 coexistence — the interaction was resolved, not ignored:** the launcher
passes `ROBCO_PUSH_DELEGATE_GATE=1`, so the wrapper DELEGATES the gate to this repo's own pre-push hook
instead of double-running `npm run gate` — the hook stays the one gate authority and CPB4's doc-only fast
path is preserved (a doc-only push through the wrapper still skips the browser checks). The wrapper adds the
L4 lock + a push.intent/push.result receipt + `git ls-remote` verification + the clean-push counter on top.
**Dogfooded end-to-end:** the control-repo commits (`0f452f9`, `e4e5965`) and this app-repo commit
(`5433648`) were all pushed _through the wrapper_ — the counter read **3/10** afterward (7 to go before DG2
can be considered). ⚠ **One defect was found and fixed during verification (Protocol 42):** a delegated gate
runs the FULL Playwright gate inside the pre-push hook, and the wrapper's old flat 120 s push timeout killed
the first real app-code push mid-gate (`spawnSync git ETIMEDOUT`); fixed to a gate-covering 20 min default
(`ROBCO_PUSH_TIMEOUT_MS`), locked by control-repo test group **PT**. **Scope held:** ACT3 is routing only —
raw-push refusal stays **DG2**, and a plain `git push` still works, unrefused. App-repo wiring locked by
**Suite 254**; control-repo behavior by groups **GD** (delegation) + **PC** (counter) + **PT** (timeout).
Marked ✅ SHIPPED below; no ID renumbered (Protocol 49). The counter reader lives at
`_RobCo-Control/code/lib/push-count.js` (`npm run push-count`), derived live from the ledger.

**Prior update — 2026-07-30 (later still — CPB4 BUILT + SHIPPED)** — **CPB4 is now shipped, not just
filed.** `scripts/gate-scope.js` reads the git pre-push payload and prints `DOCS_ONLY` only when it can
prove every changed file is a doc (`*.md` / `planning/**`), else `FULL` — fail-closed; the pre-push hook
then runs the new `gate:docs` mode (lint + format + the Node runner + static checks, NO browser) on a
doc-only push, and the FULL gate on anything touching app code, a mixed diff, or a renamed/moved/deleted
code file. Locked by **Suite 253** (static wiring + unit classification + a real-git-repo integration proof
of all four required cases). Marked ✅ SHIPPED in the READY-TO-BUILD entry and recorded in the SHIPPED
section; no ID renumbered (Protocol 49). ⓘ **Protocol 2a note:** the owner's dispatch asked to bump
hardcoded test counts across the docs — but Protocol 2a is RETIRED and no test count is tracked anywhere
(Suite 28 guards against reintroducing one), so no counts were added; the runner's exit status is the
signal.

**Prior update — 2026-07-30 (later still — CPB4 filed: doc-only gate fast path)** — **New item CPB4**
scopes the pre-push gate so a commit whose diff touches ONLY docs (`QUEUE.md`, `QUEUE_LOG.md`,
`planning/**`, `*.md`, README/CHANGELOG/ARCHITECTURE) auto-skips the Playwright render/boot-smoke +
app-integrity checks; any diff touching app code still runs the FULL gate unchanged. Filed in the READY
TO BUILD list right after **CPB3**, ties into the existing gate-scoping precedent from the blind-review
pass (Protocol 41's `eslint .` → tracked-manifest scoping fix). **Also — this same pass's own reposition
push (below) was made with the pre-push gate intentionally skipped (`--no-verify`), owner-authorized for
this one doc-only commit specifically** (`git diff --stat` confirmed QUEUE.md was the only changed file
before the flag was used) — CPB4 exists precisely so this stops being a manual judgment call. Doc-only,
no ID renumbered (Protocol 49).

**Prior update — 2026-07-30 (later still — git-bisect/AST inspector repositioned)** — **Owner call: the
git-bisect runner and the AST inspector (Code-session conveniences, NOT control-plane) no longer sit in
MCP2's low-priority tool-family tail** — moved to their own short note directly after the **MCP1**
(`robco-control`) block, right before **MCP2** begins, since both are control-plane-**adjacent** in
priority even though neither is a control-plane deliverable. Descriptions unchanged; nothing else in the
MCP1/MCP2 section moved. Doc-only, no ID renumbered (Protocol 49).

**Prior update — 2026-07-30 (later still — MCP1/MCP2 filed, external review synthesis)** — **Two
independent MCP-review passes (GPT-5.6, Gemini 3.1) converged on the same end-state and are folded in as a
new section right after RB6: TWO MCP servers, not six.** New family prefix **MCP1-MCP2** (RB1-RB6 / HG1-HG2
/ CPB / ACT / OD / SP / DG / REF / AUD / PM / P all already spoken for). **MCP1** (`robco-control`) hardens
**RB4**'s seven-tool contract into a six-op-family shape (`state.snapshot` / `changes.since(cursor)` /
`events.list` / `event.ack_receipt` / `proposal.validate|submit|status` / `job.result`) and folds
usage/telemetry in as decision-shaped queries (unblocks **CPB1/CPB2**) rather than building a separate
telemetry server. **MCP2** (`robco-evidence`, NEW) is a read-only server (`context.resolve` /
`evidence.search` / `reference.trace`) feeding the museum's Visual Web (**P11/P15**) and a
dangling-reference audit — deterministic search only, no AI-curated writable graph (explicitly rejects
Gemini's official `memory`-server route as a second source of truth, per Protocol 51(b)), gated on a
brutal retrospective acceptance test ("if it's just prettier search, kill it"). **Hard rules landing
across the whole control plane:** the supervisor stays the sole ledger-writer, proposals stay enumerated
job-kinds only, name-scrub stays a mandatory gate never an AI-callable tool, Fallout data ships as a
pinned snapshot never a live wiki query, and **museum MCP is killed as a server** — regen/query/scrub
route through the CLI gate + MCP2 instead, cross-referencing **P15**. **⚠ Flagged, not yet resolved:**
Gemini's review leans on a claimed 2026-07-28 MCP spec (MRTR/Tasks/statelessness/MCP-Apps/list-caching SEP
numbers) that is **unverified on our side** — GPT's architecture, which depends on none of them, is the
backbone until that's confirmed. Doc-only pass, no control-plane code touched, no ID renumbered
(Protocol 49).

**Prior update — 2026-07-30 (later still — REF4 + PM1 filed)** — **Two items folded into the just-tidied
CONTROL-PLANE board, both owner-approved 2026-07-30, neither previously tracked.** **REF4** (new) refines the
shadow-only thrashing detector against two more false-ish positives seen 2026-07-29/30, distinct from the
`53a3bb89` case `15c17d0` already fixed: **(i)** a session frozen mid-read with zero activity is
**POSSIBLY_STALLED**, not thrashing — different state, different wording; **(ii)** the slow-pre-push-gate /
push-retry pattern (repeated push attempts timing out at the tool level, no file changes between them) must
**not** be flagged as thrashing — a session mid-push isn't stuck. Stays shadow/alert-only, feeds **DG1**'s
promotion gate, no kill authority added. **PM1** (new family prefix) is a three-angle post-mortem/retrospective
of the whole project — plain-language overview, technical/architecture retrospective, lessons-learned —
sequenced deliberately **right before THE MUSEUM PROGRAM begins** (owner's call: reflect, then build the
exhibit), and doubles as museum source material for P8's corpus. Doc-only pass, no control-plane code
touched, no ID renumbered (Protocol 49). Full account →
[`QUEUE_LOG.md`](QUEUE_LOG.md#cpconsolidate0730b).

**Prior update — 2026-07-30 (later still — CP board consolidated)** — **The sprawling CONTROL-PLANE
(workflow) section is TIDIED — status, grouping and dedup only, no ID renumbered (Protocol 49).** Marked
SHIPPED, out of the pending buckets, with SHAs: kernel ranks 1/2/4/5 (`8eab8fd`/`dd49ed4`/`9fd751d`/
`32c0fbc`), rank 3's backup mirror + restore test now **BUILT AND ACTIVATED** (`e4384e5` build, `78acfd5`
activation — wired into daily housekeeping, its own scheduled task registered, the Ledger repo already
receiving mirror commits `d001a38`/`79afc2e`), the idle-session reaper (shadow, `643ebb8`), all nine
Pushover alerts, the thrashing recalibration (`15c17d0`), the usage-measurement spike, and **REF1** — the
session-aware uncommitted-work alert — now BUILT (`a1df1b3`). **Deduped:** the activation-checklist's
CPK/CPB/ACT/OD/SP/DG index is now explicitly a pointer layer over CP1-CP5/RB1-RB6/HG1-HG2 (light cross-refs
added at CP2's push-wrapper stage → **ACT3/DG2**, and CP3's usage-relay mitigation → **CPB1/CPB2**), not a
second copy. **Tightened into one execution list:** ready-to-build (**ACT3** wiring the wrapper NEXT, then
**CPB1/CPB2/HG1/HG2/RB1/RB2/RB3/CPB3**) → activation switches (**ACT1** — its rank-3 half already done via
`78acfd5` — then **ACT2**) → owner decisions (**OD1** now practically resolved by the shipped daily default,
**OD2** still open) → spikes (**SP1**, RB4's own MCP-load-check, **RB5**, **RB6**) → data-gated (**DG1-DG5**,
self-collecting via **REF3**'s auto-verdict). **New tracked item filed: AUD1** — a post-implementation
multi-model (GPT/Gemini/DeepSeek) audit on coherence/interconnect and frontier questions, explicitly gated
on the ready batch running live long enough to produce real data, with a "highest-leverage next, not
maximize features" guardrail recorded per tonight's own over-building talk-downs. **Small museum touch:**
P15 is now explicitly slotted into P11's build order (P15 part 1 feeds P11 Stage 0; parts 2-3 close out
around Stage 3). Doc edits + git only, nothing killed, no control-plane code touched. Full account →
[`QUEUE_LOG.md`](QUEUE_LOG.md#cpconsolidate0730).

**Prior update — 2026-07-30 (later still — RB3 watcher)** — **RB3's mechanism is now specified: a LIVE 24/7
`fs.watch` watcher, not the supervisor's 5-minute poll.** The moment Dispatch produces substantive assistant
TEXT that didn't go through the messaging tool, the watcher fires a Pushover within **~1 second** — a
detector/alarm only, it cannot prevent the leak. **OFF BY DEFAULT** (idle footprint ~0% CPU / ~40MB, but
only useful while the owner is actively using Dispatch), controlled by trigger words **"watcher on" /
"watcher off."** ⚠ **[SUPERSEDED 2026-07-31 — the default is now ON/ARMED.** This paragraph is left as dated
history per the queue's own convention; the reasoning that flipped it, and the REJECTED auto-arm option, are
in the RB3 entry itself.**]** The existing 5-minute supervisor loop babysits it — a dead watcher process is caught on the
supervisor's next pass and raises its own incident. Removes the owner's prior manual workaround of
re-reading working-notes on the Claude website to catch these leaks himself. **Also recorded — a small
control-plane note, no build needed:** the supervisor's own kill-switch is already wired to trigger words
too — "supervisor on" / "supervisor off" map onto the existing `state\DISABLE` file (off creates it = instant
stop, on removes it) — this works TODAY. Doc-only pass, no control-plane code touched. Full account →
[`QUEUE_LOG.md`](QUEUE_LOG.md#cprefine0730c).

**Prior update — 2026-07-30 (later still)** — **Two more owner-approved additions folded into REF2/REF3 — a
concrete plan threshold, and a bidirectional auto-verdict with a safety asymmetry.** **REF2** (the reaper's
safe-lifecycle design) now pins the interactive/Dispatch idle-reap threshold at a concrete **2h30m (150
minutes)** — explicitly a PLAN value, NOT live; reaping interactive sessions stays shadow-gated until the
reaper proves itself, nothing auto-kills at 150 minutes today. **REF2 + REF3** together now also require the
reaper's shadow tracking to watch for **over-aggression**, not only readiness to graduate: a session it would
have flagged as reapable that later resumes activity is a measured false positive, and a high false-positive
rate at the current threshold produces its own **"too aggressive → recommend widening to ~X"** verdict,
Pushovered the same way a graduate-ready verdict is. **⭐ The safety asymmetry this establishes, recorded
because it generalizes to every data-gated mechanism, not just DG3:** the system MAY auto-apply a
**loosening** change on its own (widen a threshold, err further toward not acting) since that direction is
always safe — but **tightening always requires explicit owner approval**, the same bar as any shadow → live
promotion. Fail-safe direction automatic; risky direction gated. Doc-only pass, no control-plane code
touched. Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#cprefine0730b).

**Prior update — 2026-07-30 (later)** — **Three owner-approved refinements folded into the CP activation
checklist, plus one small addition to CPB1.** New family prefix **REF1-REF3** (single letters and all prior
CP-program families now spoken for): **REF1** makes the LIVE **backup-unhealthy** alert session-aware — it
must not fire on uncommitted work while an active session still owns that tree (files mid-build are
_supposed_ to be uncommitted), only on uncommitted work that is orphaned or has sat stale past a threshold
with no active session. **REF2** is a safe-lifecycle-reaping design for **DG3** (the idle reaper's
shadow→actual-reap promotion): two clean "done" signals (a verified-terminal job contract, or an owner-set
idle deadline) behind three hard guards (long-idle only; never reap uncommitted work — flag + hold instead;
snapshot via the **CPK4** continuation packet before any reap), keeping the proven `(pid, procStart)`
echo-and-confirm kill intact and never batched. **REF3** gives every data-gated promotion (**DG1-DG5**) an
explicit evidence threshold defined up front, with the **ACT1** daily/weekly housekeeping pass tracking
progress toward each automatically and Pushovering the owner a ready-computed recommendation the instant a
threshold is met — the owner's own principle, verbatim: "nothing that needs data collection should require
me to do it — it should be automatic." **Also folded in — CPB1** now specs including the usage-cap
reset/window-end timestamp when the usage data carries one verbatim, else computed from the ~5-hour rolling
session window plus the weekly cycle. All three refinements are OWNER-APPROVED (2026-07-30) but **NOT YET
BUILT** — this is a doc-only pass, no control-plane code touched, nothing killed. Full account →
[`QUEUE_LOG.md`](QUEUE_LOG.md#cprefine0730).

**Prior update — 2026-07-30** — **Every owner-gated / activation / to-implement step of the control-plane
program consolidated into one tracked checklist** — "⭐ CONTROL-PLANE ACTIVATION & OWNER-GATED CHECKLIST",
filed directly after HG2, above. Fourteen new items across six new family prefixes (**CPK1-CPK5** retroactive
IDs for the kernel ranks; **CPB1-CPB3** the next build batch — budget alert, usage→operating-modes, the
"backup-all" script; **ACT1-ACT3** activation switches, including new **ACT3** "wire the controlled-push
wrapper into the real push path" — owner-approved the same day as the concrete first step toward the
≥10-real-pushes gate; **OD1-OD2** owner decisions, including the auth-folder secure-backup call filed as its
own item; **SP1** live-confirming the two documented-contract-only hook alerts; **DG1-DG5** the data-gated
promotions, unified from scattered mentions across CP2/CONVERGENCE/CONTROL_PLANE_STATUS). Existing IDs
(RB1-RB6, HG1-HG2, P15) are cross-linked, not renumbered. Read-only reads + doc edits only — no control-plane
code touched, nothing killed. Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#cpactivation0730).

**Prior update — 2026-07-29 (later still)** — **RB4 and RB5 expanded with GPT's detailed design, and a new
RB6 filed.** RB4 now specs a full V1 seven-tool contract (`control_get_inbox` / `control_get_job` /
`control_get_event` / `control_get_health` / `control_ack_event` / `control_submit_intent` /
`control_get_intent_status`), proposal-only verbs, idempotency, generation checks, and two corrections
against GPT's original design (the intake dir must resolve via `lib/paths.js`, not a hand-built
`%LOCALAPPDATA%` path — the MSIX-virtualization trap — and a prerequisite MCP-load spike comes first).
RB5 now specs the full bounded wake-spike protocol (anchor nonce, 5-minute hands-off window, strict
4-criteria PASS, seven named failure classifications) and states plainly that even a full pass proves
only session→Dispatch wake, never the AI-free supervisor→Dispatch wake this program actually needs. **New
RB6** (near-term, buildable now): a Pushover → Dispatch Android deep-link so the owner's tap on the
notification opens straight into the conversation — friction reduction on the existing "owner is the
wake" fallback, not a wake mechanism itself. Full detail →
[`planning/control-plane/DISPATCH_RETURN_BUS.md`](planning/control-plane/DISPATCH_RETURN_BUS.md). Also
this pass: the private control-plane backup repo (rank 3, item below) was renamed from the placeholder
`RobCo-Control-Backup` to `RobCo-Control-Ledger` — same empty PRIVATE repo, clearer name.

**Prior update — 2026-07-29 (later)** — **Kernel ranks 4 and 5 SHIPPED and pushed**, on top of ranks 1-2
below: rank 4, the deterministic continuation packet (commit `9fd751d`), and rank 5, incident lifecycle +
daily housekeeping (commit `32c0fbc`), both in the private `RobCo-Control` repo. **Wiring status verified
and corrected against the claim this pass started from (Protocol 51 dissent — full account →
[`QUEUE_LOG.md`](QUEUE_LOG.md#rb0729)):** rank 1 (job contract + reconciler) and rank 5's
incident-lifecycle module are **already live** in the supervisor's polling loop — confirmed by direct
`require()`/call-site inspection of `supervisor.js` and by a live Task Scheduler check
(`RobCo-Control-Supervisor`, State: Ready, last run succeeded minutes before this pass, next run minutes
after) plus a same-minute ledger write. Rank 2's publisher, rank 4's continuation-packet generator, and
rank 5's daily-housekeeping pass are built and callable but **not** auto-invoked by anything — no
scheduled task calls them, so "owner-gated activation" only accurately describes the write-side actions,
not the detect/alert path, which is already running against real jobs every ~5 minutes. **Five new queue
items filed — RB1-RB5**, a new family prefix under the CP program, folding in the plan-only Dispatch
Return Bus design pass
([`planning/control-plane/DISPATCH_RETURN_BUS.md`](planning/control-plane/DISPATCH_RETURN_BUS.md)): the
Dispatch inbox projection (RB1), launch + structured completion receipts (RB2), the mobile-hidden-response
detector (RB3), the custom control-plane MCP for delivery+ack (RB4), and the bounded `send_message` WAKE
spike (RB5 — flagged **BLOCKED BY PLATFORM**, no wake mechanism exists today). All five are plan-stage,
nothing built. Rank 3 is unchanged from the entry directly below — spec'd, blocked on the owner creating
the private backup repo. Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#rb0729).

**Prior update — 2026-07-29** — **Control-plane kernel RANKS 1-2 SHIPPED** in the private `RobCo-Control`
repo: job contract + reconciler (commit `8eab8fd`) and the transactional exact-SHA verifier/publisher with
a fail-closed break-glass + fault-injection tests (commit `dd49ed4`). **Five new Pushover alerts** landed
alongside (commits `f14499d` + `bac032a`), on top of the four already live: "needs your input" and
"session died/errored" are documented-contract only (their hooks are unverified-live, not wired); ⭐
**backup-unhealthy** is LIVE and already caught a real problem on a real run; deadline-exceeded (wall-clock
only) and break-glass-used are both LIVE — all five demoed to the owner's phone. **The thrashing detector
was recalibrated** (commit `15c17d0`): a "nearby-progress" gate fixed a real false positive (session
`53a3bb89`); it stays shadow-only, never kills. **The usage-measurement accuracy spike ran**
([`planning/control-plane/USAGE_MEASUREMENT_SPIKE.md`](planning/control-plane/USAGE_MEASUREMENT_SPIKE.md),
read-only): per-job cost/tokens ARE measurable, even under concurrency, via OTLP or a headless job's own
`-p` JSON result — so the deadline/budget alert's budget half is UNBLOCKED for dollar/token budgets, still
blocked for "% of the weekly cap" (the global usage file carries no session id — structurally
unobservable, not just imprecise). **Rank 3 (off-machine durability) now has a SPEC, not a build**
([`planning/control-plane/RANK3_BACKUP_REPO_SPEC.md`](planning/control-plane/RANK3_BACKUP_REPO_SPEC.md)) —
gated on the owner creating the private backup repo. **A new museum item, P15, is filed:** the museum's
scope predates the control plane becoming the top program, so P15 is now a precondition on "museum done" —
fold the control-plane's own arcs into P8's corpus, give the self-maintaining-system thesis a prominent
room, and confirm P11's Visual Web includes them. Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#cp0729).

**Prior update — 2026-07-28** — **CP2's spec moved to v2.3: S7 ran for real and came back NEGATIVE — Stage
4b (real unattended push notifications from a headless task) is CLOSED, a platform limit rather than a
build gap. A one-time Claude scheduled task fired on time while the owner was away, but had no direct
proactive-notify-to-phone tool and hung on an unattended permission prompt before it could even complete.
The permanent design is PULL (a live agent + a status-file read at the next check-in), not push. Also
folded in: a docs-grounded finding that genuine unattended launch autonomy exists at the headless/SDK
level but not on the Dispatch launch path — tracked, gated on the existing S12-T non-local-transport
re-verify. Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#cp2v23); CP2's entry below updated to match. **Also
recorded:** the owner re-confirmed 2026-07-28 that the museum finishes BEFORE 2.9.0 starts — the execution
order already had it that way; the re-confirmation now carries its own date (Protocol 50 a-date).

**Prior update — 2026-07-28 (late) — ⭐ THREE-MODEL CONTROL-PLANE REVIEW CONVERGED (Gemini + DeepSeek + GPT).**
Analysis only; **nothing built or approved from it** (owner: "fold into queue until you've analyzed all 3;
don't run anything"). Full converged reading → [`planning/control-plane/reviews/CONVERGENCE_2026-07-28.md`](planning/control-plane/reviews/CONVERGENCE_2026-07-28.md).
Headline: we built a strong **flight recorder** (OBSERVE) and a weak **actuator** — several planned/built items
turn weak inference into destructive action. The reframe replaces CP2's stage order as the _working_ plan with a
**trusted-action-kernel** build order: **(1) job contract + reconciler → (2) transactional exact-SHA
verifier/publisher + fault-injection tests → (3) recovery inventory + off-machine durability + restore test →
(4) deterministic continuation packet → (5) incident lifecycle + daily housekeeping.** **De-prioritized /
narrowed:** the generic idle reaper (BUILT tonight, `643ebb8`) → re-scope to _verified-terminal_ job cleanup, not
idle-inference; thrashing → **alert-only, never graduate to kill** (kill only on an owner-approved envelope);
headless-AI-for-sync/reap/tests → **CUT** (deterministic, run directly); auto-restart → decouple from repo sync;
`--no-verify` tripwire → low-leverage telemetry only; usage 50/80/85/90/95 → **operating modes ✅ APPROVED
(owner, 2026-07-28)** — Normal / Conserve / Reserve-for-owner / Stop-unattended-AI, notify only on a mode change,
exact % stays in `status.json`; worktrees → defer, prefer a per-repo mutating **lease** first. **Doctrine tweak:**
fail-open/shadow-first is not universal — keep the _owner's_ path always available (break-glass) but let
_automation's_ safety-critical paths fail **closed**; simplicity = 4–5 executable invariants, not a pile of
detectors. **Before any build:** verify which Gemini-cited mechanisms (`PROCESS_WRAPPER`, native OTLP, Channels,
`SessionEnd`, native worktree/timeouts) actually exist on the installed CLI build. **⭐ SEQUENCING (owner,
2026-07-28): this whole trusted-action-kernel program runs BEFORE the museum and before 2.9.0.** **Separate trust domain for unattended
jobs → folded as DEFERRED, laptop-leaning (owner, 2026-07-28).** Not scheduled; the kernel needs no separate trust
domain (the exact-SHA publisher + credential separation + restore-proof carry the safety). Revisit once unattended
autonomy is in regular use; when built, the **spare laptop** is preferred over a separate Windows account — a real
machine boundary that also doubles as the rank-3 off-machine durability. Aligns with **CP5** (laptop-witness) and
the earlier software-fixes-first deferral of the spare laptop. **Reconciled into the CP1-CP5 entries below in
this same-day pass** — see the new overlay directly under the program header (**"⭐ The CP program's BUILD
ORDER — CURRENT"**), CP2's superseded-order note, CP1's narrowed-termination addendum, and CP5's
deferred-trust-domain addendum. Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#cpkernel0728).

**Prior update — 2026-07-27** — **⭐ THE BIG REORGANIZATION: the WORKFLOW / CONTROL-PLANE program is now the
top priority (owner's explicit call), and the museum sits directly under it.** A long work session produced
more than the queue could hold, so this pass folds all of it in and re-orders the board. **New at the top —
a whole new program (CP1-CP5):** the empirical spike campaign that must prove or kill hook-based containment
before anything is built, the staged build gated on it, an immediate-mitigations track that needs no control
layer at all, the broader sync audit, and the laptop-witness inventory. **⚠ Everything in that program is
PROPOSED / PLANNED / gated — nothing of it is built or operating; it is written that way deliberately.**
**The museum moved up** out of the 2.8.5 tail into its own top-level section, gaining five new items:
**P10** (⭐ drop the hardcoded 10-stop tab bar and redo the nav — the "no 11th slot" constraint is VOID),
**P11** (the Visual Web build on P8's structure), **P12** (the Article Room), **P13** (⚠ a SECURITY scan-list
gap P8 found) and **P14** (the live museum is stale — the republish). **Shipped this session and moved to the
log:** **V** (the archive-sync repair — a silent-push-failure fixed), **W** (archive/museum organization
fixes), **X** (the Exhibit folder relocated into `!RobCo`) and **P8**'s completed account. **A3/A4 stay in
this file on purpose** — a test fixture pins them here; the reason is recorded in the shipped list below.
**Two owner wrap-up asks are now tracked:** **Y** (the memory-for-the-story reconciliation) and
**Z** (the evidence-grounded workflow explanation). The ordering overlay below is rewritten to match.

**Prior update — 2026-07-27** — **Item L's private view is now owner-confirmed.** The owner opened the
generated `queue-view/queue-view.html` on his own phone and confirmed it reads right ("it looks good",
2026-07-27) — the sign-off L's private half was waiting on (Dispatch's own 360px verification had already
passed). L's private-view account moved to [QUEUE_LOG.md#l](QUEUE_LOG.md#l); L stays open, narrowed to only
the still-deferred player-facing public view (post-P2).

**Prior update — 2026-07-27** — **Item U — the generate-vs-hand-maintain audit — CLOSED, all four batches
shipped.** Batch 4 (the closing batch) landed the audit's remaining low-priority tail — File Map
reverse-completeness (Suite 252.1, which immediately found and fixed real drift: about a dozen
undocumented scripts/tests plus the vendored OCR bundle), CHANGELOG category-heading ordering (252.2),
README's css-file count (252.3), and README's version-vs-CHANGELOG check (252.4) — plus the one candidate
left as an owner judgment call: README's third hand-copy of the script load-order list is now **deleted**
in favour of a pointer at `rules/file-layout.md`'s guarded original (owner chose the audit's own
recommendation over adding a third check). Batch 3 (Protocol 53, `library/CODE_MAP.md`'s three generated
sections) had also landed but was never written up here at the time — folded in retroactively. Every
actionable GENERATE candidate from the audit is now shipped; full account moved to
[QUEUE_LOG.md#u](QUEUE_LOG.md#u).

**Prior update — 2026-07-27** — **D is DONE — the TEST_CATALOG generator (Protocol 47).**
`library/TEST_CATALOG.md` is now GENERATED from `tests/robco-diagnostics.js`'s own suite headers
(`scripts/generate-test-catalog.js`, `npm run test-catalog` / `test-catalog:check`), never hand-typed —
the gitignored-`library/` gate-diff tension resolved the same way Protocol 46 resolved it for
`library/MANIFEST.txt` (absent → pass, present-and-stale → fail). Wired into `scripts/gate.js` on both
`gate:fast` and `gate`; Suite 247 proves the real extraction end-to-end. The Atlas (item I) reuses this
plumbing directly. Full account in [QUEUE_LOG.md#d](QUEUE_LOG.md#d).

**Prior update — 2026-07-26** — **A4 is DONE — the real-Firebase-emulator round-trip is built and
red-then-green PROVEN.** With the JDK blocker cleared (2026-07-23) and `firebase-tools` committed as a
dev-only dependency, A4 upgrades A3's modeled cloud-serialization guard from _modelled_ to _verified_:
`scripts/emulator-round-trip-check.js` (`npm run test:emulator`) runs the real Firebase client SDK against
the local Firestore + Auth emulator, self-derives the save payload from the live `state` literal (reusing
A3's extractor, Protocol 22), writes it via the real additive `addDoc()` path, reads it back, and asserts
field-level fidelity. **Red-then-green proven against the real emulator, both directions:** a clean payload
round-trips every field equal; a planted directly-nested array and a planted `undefined` field each
correctly make the write fail. **A genuine finding, not just a confidence upgrade:** the real emulator
showed A3's model was wrong about the mechanism — an `undefined` field does not get silently stripped by
Firestore, it makes the **whole write throw** (the Web SDK rejects it client-side by default, since
`cloud.js` never sets `ignoreUndefinedProperties`) — safer than modeled, but the modeled guard's comments
said otherwise, so they're corrected in the same pass. Standalone only (`npm run test:emulator`), **not**
wired into `scripts/gate.js` — needs a JDK + firebase-tools that the normal gate/CI can't assume, and A4 was
never a release blocker (owner decision 2026-07-21, unchanged). Full account in **A4** below; A3's record
also updated to point at it.

**Prior update — 2026-07-22** — **2.8.5 "Foundations & Fidelity" is SHIPPED to production.** The
`dev → main` release merge was performed with `--no-ff` (a fast-forward makes the tip shared with `dev`,
which makes GitHub Pages reject the production deploy — recorded lesson), the release workflow
auto-created the `v2.8.5` tag on CI-green `main` and deployed to GitHub Pages. `APP_VERSION` 2.8.0→2.8.5,
cache `robco-terminal-v2.8.5-r1`, the `[Unreleased]` block consolidated into a dated `## [v2.8.5]` block
with a fresh empty `[Unreleased]` opened, and ARCHITECTURE/README brought current. **No tag was pushed by
hand** — pushing one would make `release.yml` see the tag already exists and skip the deploy. Owed to the
owner: the real-device installed-PWA update check (Android). Owed to Dispatch: the post-release ritual
(archive sync + museum regeneration).

**Also 2026-07-22 — a Protocol 50 recording pass (no build, recording only):** six owner-approved decisions
folded into their existing items — **P4** bug records move to **find-time** (OPEN → IN-FLIGHT → SEALED; an
editable issues-board explicitly declined); **P** gains the museum-wide **curation law** (capture everything,
exhibit a curated subset) and its ONE exemption, the **Visual Web "Magnum Opus"** (complete-but-navigable);
**P2** gains three verified **intent-vs-reality publication blockers** + the serve-and-look audit lesson;
**R5** gains the reinforced **branch-protection** candidate (PRs rejected); and a new item **Q** records the
**planning-folder hygiene** standing rule + the owed cleanup task.

**Prior update — 2026-07-21:** an **A3 build attempt** that hit a feasibility wall and surfaced a premise
correction; built nothing, recorded both in **A3** in place (Protocol 50). **(1)** The Firebase emulator
**cannot run here** — the Firestore/Auth emulators are Java processes and there is **no JVM** on the
machine (`java` absent, `JAVA_HOME` unset, no JDK/JRE/JBR anywhere, `firebase-tools` not installed), so the
emulator-backed round-trip could not be run or verified, and A3's own red-then-green Hard rule forbids
shipping a cloud-safety test green-but-unrun. **Unblock:** owner installs a **JDK/JRE 11+** (a system
install, not a dev npm dep) then `npm i -D firebase-tools` (dev-only, never precached). **(2) Premise
correction:** the "field added to `state` but missed in the cloud **sync mapping**" failure A3 was written
to catch **does not exist in the current code** — `cloud.js` stores the whole `robco_v8` container
wholesale, and the load path (`sanitizeImportedContainer` + `migrateState`) passes unknown fields through,
so a new plain field round-trips losslessly; the only residual silent-drop is the **Firestore
serialization boundary** (undefined-strip / nested-array-reject / doc-size), exactly what needs the real
emulator. A non-emulator round-trip substitute would pass for any field and catch nothing, so none was
shipped. **Owner decision (same day): build the modeled guard NOW, no JDK — and A3 is CLEARED as a release
blocker.** Shipped `scripts/cloud-serialization-check.js` (`npm run cloud-check`): self-derives the field
set from the real `state` literal, flags Firestore-hostile values (`undefined` / nested arrays / oversize),
red-then-green proven on the real literal (caught both a planted `[[1,2]]` and an `undefined`), with
a built-in positive control and NO silent-skip path; now WIRED INTO THE GATE (step 4b, fast+full) later the
same day per the owner's "wire it" — see A3. The premise correction (state stored WHOLESALE +
pass-through loads → a forgotten field-mapping **cannot** silently drop data) drops the true emulator test
from release-blocker to the **optional post-2.8.5 item A4** (needs a JDK/JRE 11+ + dev-only
`firebase-tools`). **A3 was the last thing gating 2.8.5; it is now resolved — nothing data-safety blocks the
ship.** Cache bumped r55→r56 (the precached `CHANGELOG.md` changed); no `APP_VERSION` bump (Under-the-Hood,
not user-visible). Earlier passes — the QUEUE.md header-mangle fix,
the seven- and six-decision recording passes, the cross-cutting **EXECUTION SEQUENCE** — are in the
running history chain in
[`QUEUE_LOG.md`](QUEUE_LOG.md#update-history--the-running-last-updated-chain).

---

_This log is append-only (ARCHIVE-class). New shipped accounts are added under a stable `<a id>` anchor; `QUEUE.md` keeps the matching one-liner. See `rules/docs-and-library.md` for the maintenance model._
