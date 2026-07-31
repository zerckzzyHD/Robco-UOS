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
(A0-A4, B-P, P1-P3, R1-R9, and the rest) were assigned as work was found, so they do **not** run
alphabetically top-to-bottom — they are content-addresses referenced from commit messages, memory files,
the workflow-review prompt, and `CHANGELOG.md`. Regrouping an item does not change its ID. This is the
Protocol 49 retirement discipline (retire in place, never renumber) applied to queue IDs. A future session
that "tidies" these breaks every external reference — do not.

**Note for whoever assigns the next ID (2026-07-27): the single letters are now EXHAUSTED** — A-Z are all
spoken for, with **V/W/X/Y/Z** taken in this pass. New work takes a **family prefix** instead, the way
**R1-R11**, **P1-P14** and the new **CP1-CP5** already do. A family prefix is better anyway: it says what an
item belongs to, and it never runs out.

Status tags: ✅ shipped · 🔄 in progress · ⏭️ next · ⚠️ blocked/contentious · ⬜ queued.

**Last updated: 2026-07-31 (CHECKPOINT — a full RECONCILE, not just a fold: the queue is now current against
git and the live ledger)** — **This pass folded four new things and then went back and fixed what had rotted.**
**FOLDED:** **(1) RB3's default is FLIPPED to ON/ARMED** — the hidden-response watcher now starts with the
machine and stays armed until an explicit `watcher off`, toggleable from the CPB5 CLI **including remotely
over Tailscale** (the toggle is a state file the watcher polls, same shape as the supervisor's existing
`state\DISABLE`, so remote and local are the same code path). The auto-arm-off-transcript alternative was
**considered and REJECTED — reliability over cleverness, no activity-detection gating**; making the owner opt
in to his own safety net was the wrong default. **(2) The return-bus/MCP shape is CORRECTED against
Anthropic's own docs:** a Dispatch-callable connector **must be a REMOTE Streamable-HTTP endpoint** — local
stdio MCP works in Claude Desktop but **not in Cowork/claude.ai** — so the old "add a local server to the
desktop config" plan was never going to work, and its prerequisite spike is **retired as answered-NO rather
than left pending**. With it came the relay-durability model (**"disposable" = replaceable INFRASTRUCTURE,
never lossy delivery**; the four-state receipt chain `RECEIVED_BY_RELAY → INGESTED_BY_SUPERVISOR →
ACCEPTED/REJECTED →` verified outcome; at-least-once + idempotency; **outbound pull preferred over a public
tunnel**), two more ceilings (**no resource subscriptions/sampling**, **5-minute tool timeout**) that force
**submit→receipt→poll**, and the agreed build sequence (**`robco-control`'s five ops first, then read-only
`robco-evidence`** — and ⛔ **do not build an MCP just for effort**, that motivation is gone). **(3) A museum
PLATFORM-LOCKED exhibit** is specified at **P15 part 4**, splitting **hard-locked** (WAKE · remote-only MCP ·
no subscriptions/sampling · 5-min timeout) from **worked-around** (per-session effort), every item carrying
the doc or experiment that set its ceiling — an exhibit that **flips to UNLOCKED as the platform moves**.
**RECONCILED — and this half found real rot:** ⛔ the top-line status still said the control plane was
**"None of it is built"**, which was badly untrue and was the first thing a phone reader saw; the **SHIPPED
roll-up had fallen SEVEN items behind** (CPB5 v0.1, WB1 v0.1, WB6 v0.1, P16, HG1, HG2, DG2-activation, plus
today's effort fold); **CPB4 was marked "SHIPPED (this pass)"**, which means nothing to a later reader; a
**3/10 DG2 counter was labelled "live"** when the live value is **44/10**; and **the "CURRENT build order"
listed five ranks that have ALL shipped**. All fixed, with **every SHA re-verified this pass** via
`git cat-file` **and** `git merge-base --is-ancestor` in its own repo, plus ledger confirmation where it
existed — **WB6's hash chain was observed genuinely writing in production** (a live record at `seq 1820`
carrying real `prev`/`self`), and **REF5's third leg was observed working** (this session's actively-edited
tree correctly read `owned` 9×, the exact case that read `unowned` forever before the fix). A **current
ORDER for what remains** now sits at the top of the CP build-order section. ⚠ **And one live reading worth
the owner's attention: usage is at 91% weekly / 81% session, and the machine has been in
`Stop-unattended-AI` all afternoon** — under CPB2's owner-approved-but-**unbuilt** refinement that band
would read Reserve-for-owner instead, so that refinement is now **first** in the derived order on evidence
rather than preference.

**Prior update — 2026-07-31 (SP2 ANSWERED — Dispatch can set a session's EFFORT TIER, and the whole effort
design folded in; doc-only, nothing built)** — **The spike that CPB9's effort tier stood or fell on came back
POSITIVE, but not the way it assumed.** Dispatch **can** set a spawned session's reasoning tier, **per
session, at will** — via a **two-message** pattern: a message that is exactly `/effort <level>` and nothing
else (0 turns, the session idles), **then** the real task as a separate follow-up. **⛔ Inlining the two
FAILS** — the slash command swallows the task and **nothing runs at all**, a **silent no-op** rather than an
error, which is why CPB9 must now treat "0 turns" as **RED** and never as an empty success. **Read SP2's
literal question and the decision it gates as two answers, because they diverge:** an effort directive
_embedded in_ the launch prompt alongside the task — **NO**; per-session effort control reachable through the
programmatic path — **YES**. So the tier is reachable and **CPB9 needs no rescoping**. ⚠ **The epistemics are
split on purpose and must not be rounded up:** the **tier-SET is VERIFIED** — the **harness itself** printed
`Set effort level to max (this session only): …`, a **system** state-change report naming the level and its
per-session scope, which clears the mere-echo bar SP2 expected to be stuck at — but **whether a high tier
materially deepens reasoning is CLAIMED**, being the tool's own description of itself, and **no session can
introspect its own thinking budget.** "Effort control is confirmed" must never travel into "high-tier runs
are better". **Three design folds ride on it, none of them built.** **(1)** CPB2's operating modes and CPB5
v0.2's admission gate gain an **EFFORT DIMENSION** — the gate now returns a **ceiling** as well as a verdict
and negotiates a tier **down** (no Max/Ultracode in a conserve-class mode), binding **unattended work only,
never the owner's own session**. **(2)** WB1's evidence envelope gains an **`effort: {requested, applied,
state}`** field — `requested` and `applied` are separate **because the gate makes them diverge on purpose**,
which is what turns CPB9's verify-the-tier rule from defensive into **structural**. **(3)** A **standing
workflow** is adopted: the pre-build **plan** picks the tier per session and Dispatch **announces** every
change. ⚠ **Two honest divergences:** the "watcher changes the effort tier" idea this pass was asked to mark
DEAD **had no entry in the queue or in planning** — so a **new** logged decision was written instead of a
strike-through (and **RB3's watcher is unrelated and untouched**). ⛔ **That divergence needed its own
correction, kept on the record:** this pass first claimed memory held nothing either, having searched the
**wrong store** — Dispatch's agent memory _does_ carry the instruction, as item **(d) DROP the
watcher-escalation idea**, and it surfaced only when the Protocol 48 archive sync mirrored that store. The
substance holds (memory records the _decision to drop_, not a live proposal), but "found nothing" and
"searched the wrong memory" are different claims — **Protocol 51(b), memory is a locator to resolve, not a
thing to assert from.** Second divergence: **`start_code_task` exposes no effort field**
(`cwd`/`model`/`prompt`/`title` only), so the clean launcher-flag route is **PARKED, not built** — it buys
atomicity, not capability. **Two things the primary source added that this fold would otherwise have
missed:** a **sequencing rule** — _session-configuration slash commands are standalone turns; **wait for the
acknowledgement and idle state** before sending the brief_, so back-to-back sends are a **race** that
re-creates the inline failure by accident — and the **ladder as ground truth** read off the actual UI (Low ·
Medium · **High = default** · Extra · Max · Ultracode), with Max/Ultracode reserved for gnarly high-stakes
work. **And the arc behind the answer is recorded because it is the best part:** the first run tested only
the inline form, called it **"definitively no"**, and wrote that to memory as fact — the **owner** and
**GPT** corrected it from outside the loop, and the re-test confirmed. _A null result under ONE
configuration is not a general "no"_, and a premature "definitively" in memory is worse than no memory,
because it stops a future session ever retrying the thing that works. Flagged as **museum** material. Full
write-up: `planning/control-plane/EFFORT_CONTROL_SPIKE.md` (local-only). **SP2 remains OPEN on its second
mechanism — the `ultrathink` keyword was not tested.**

**Prior update — 2026-07-31 (three owner-approved follow-ups — the P16 gate is MOUNTED and LIVE, and the
last of the three false-firing backup alerts is fixed)** — **P16 is no longer a gate waiting to be
mounted.** Its one-line invocation now sits in the archive's publish flow, immediately after the scrub and
before anything is publishable, blocking on its exit code with **no override flag** (archive repo
`b90304fb`). An absent control repo **blocks** rather than skipping — an unscanned tree is never
publishable. Proven red-then-green against the real generator: a tree carrying an e-mail address (the exact
class the existing scrub is structurally blind to) reported OK from the scrub and was caught by the gate;
a clean tree passes. **The two benign e-mails are allow-listed** per the owner's "not mine, allow it", so
the real publishable tree (756 files) now reads **PASS** — one is in-fiction exhibit prose, the other is
the post-scrub alias form, which is evidence the existing scrub worked rather than a leak that escaped it.
⚠ **One thing had to be created to mount it at all:** the owner-maintained **scrub list** did not exist on
this machine — the P16 build's real-tree run used an ad-hoc list that was never persisted, so the gate
would have blocked every publish with `scrub-list-absent`. It is seeded (owner identifiers only, zero hits
against the real tree) and is his to extend; details in the P16 entry. **And REF5 gained its third leg**
(control repo `99fd90a`): the uncommitted-changes alert, which **REF1 was supposed to have fixed on
2026-07-30 and never actually did**. The ledger shows why — REF1 matched a session's working directory
against **one** repo root, but every control-plane build on this machine is a session sitting in the app
repo editing the control repo beside it, so an actively-typed-in tree read `unowned` forever. The fix is
evidence, not a wider guess: **a tree whose dirty set is changing between ticks is being worked on,
whoever is doing it.** Not neutered — abandoned work still alarms, proven by a two-way mutation run.

**Prior update — 2026-07-31 (WB6 v0.1 SHIPPED — the ledger is now tamper-EVIDENT, not merely
reconstructable)** — **The check that already existed could not see the thing it was named for.**
`--verify-replay` proved the snapshot matched a full replay — but replay only reads the fields its
reducer knows, so editing anything else (a push's repo path, a gate's exit code) left the snapshot
matching **perfectly**. That exact case is now a test: the mutated record is one replay never reads,
`match` stays **true**, and the chain catches it and the command exits non-zero. Every record appended
from now on carries `chain:{v,algo,seq,prev,self}` — `self` = sha256 of the record's canonical form
minus `self`, so **everything else is covered including WB1's `lineageId`** — and the verifier names the
**exact** record: sequence, type, file, line. **Additive exactly like WB1:** the **63,696** records
written before it carry no chain, still parse, still replay byte-identically, and are reported as
`unchained` **coverage** — never as breaks, and never counted as verified. Truncation gets the one thing
a self-contained chain cannot do for itself (a chopped chain is a valid _prefix_): a **high-water
witness**, advance-only, a witness and never an authority — absent, truncation reads **UNOBSERVABLE**,
never "fine". **Sequence numbers are never reused**, so a removed span survives as a permanent gap inside
the append-only record rather than as a comparison that fades. **The verifier writes nothing and does not
even import the ledger module** — the **supervisor** raises the incident, still the sole writer. Live and
proven on the machine's own ledger: **63,906 records, 210 chained and intact, 0 breaks.** Full details in
the WB6 entry below, including what is deliberately deferred.

**Prior update — 2026-07-31 (P16 SHIPPED — the museum's pre-publish PII gate, control repo `0917d20`)** —
**The gate that should have existed before the name leaked once.** Deterministic regex/string matching,
**no model anywhere in the loop** — nothing asks an AI and nothing can be called _by_ one, because if the
agent chooses whether to scrub, it isn't a gate. Four categories: emails, an owner-maintained **scrub
list** (real names / usernames / absolute paths / internal terms) matched in file **addresses as well as
content** and inside **non-text files as bytes**, credential shapes, and **public** IPs (private and
reserved ranges ignored — a gate that cries wolf on `10.0.0.1` teaches you to wave findings through).
Exit code is the contract: **0 pass, 1 block, and no `--force`.** Fail-closed on everything, including a
**hollowed-out scrub list** — present but all comments — which is the dangerous case a naive scanner
reports as clean. ⛔ **The report is never the leak:** findings carry a hash and a redacted snippet,
never the matched value, and the phone banner names categories and counts only. **The scanner never
writes the ledger** — it leaves a verdict file and the supervisor appends the incident, and a verdict it
cannot parse **re-raises** rather than reading as "nothing blocked".
⚠ **Checking the entry's premise first changed the build:** the archive's `preparePublish()` was
**already enforced and fail-closed**, not human-only as P16 assumed — what was human-only was the
read-only `pii-scan.mjs` report. So this does not re-do that work; it adds what neither could do (the
scrub list, public IPs, the allow-list, a blocking verdict, a ledger incident) and duplicates none of it.
**Run against the real publishable tree:** **zero** surviving name hits — the existing scrub passing an
independent audit — and **12 email addresses (2 distinct, 5 files)** it is structurally blind to; neither
is the owner's own, so that is an allow-list decision, not an emergency. 🔻 **Honest remaining step:
nothing calls it yet** — mounting it in the archive's publish flow is a one-line change in a third repo
this pass did not touch, so today it is a gate waiting to be mounted. Also recorded this pass: the owner
**confirmed WB1's gate-result decision** — gate results stay as fields inside the push records, never
standalone records (Protocol 22) — so that divergence is resolved as approved-as-is.

**Prior update — 2026-07-31 (GPT's REAL turtle banner is in, recoloured blue-wave — control repo
`0b8d93b`)** — The owner supplied GPT's original `robco-turtle-banner.mjs`, and it has **replaced the
from-scratch banner CPB5 v0.1 shipped** — that art is gone. His **72×22 raster**, his four-level phosphor
palette, his half-block cell logic and both colourless ramps are **verbatim**; the only changes are
ESM→CommonJS, the recolour, and routing capability detection through the CLI's existing probe so there is
one rather than two. **The recolour is a derived mask, not a repaint:** the raster carries no channel
saying which pixel is water, so the split comes from the art's own geometry — every painted pixel from the
waterline row down is water (the surface _and_ the submerged flippers, which is why a flipper goes blue
although it is anatomically turtle: the rule is "below the surface"), and on the four rows that straddle
the surface, anything outside the turtle's body envelope is foam running out sideways. **The envelope was
read off the raster, not guessed** — row 13's painted runs are `3-9 | 18-36 | 39-45 | 53-55 | 59-68` and
the envelope `18-45` lands exactly on the two middle runs, leaving the detached streaks outside it. The
turtle body is untouched. ⚠ **One of my own claims was corrected by measuring it:** the per-half palette
means a cell with turtle above and water below _would_ render green-on-blue, and I wrote that this draws
the waterline inside a single character — it does not, because the edge falls exactly on a cell boundary,
so **zero** such cells occur and the waterline is a crisp horizontal edge. The capability is kept and
pinned by a test, but stated as a capability. ✅ **And this closes the v0.1 divergence that said the asset
did not exist** — it did; it was in a session uploads directory outside the four trees searched. The
finding was accurate for where it looked, but "I could not find it" was reported in a way that read as "it
does not exist", and those are different claims.

**Prior update — 2026-07-31 (WB1 v0.1 BUILT + SHIPPED — the ledger's records can now be JOINED)** — **WB1
v0.1 is shipped, control repo `d36ad1d`: one lineage id and one evidence envelope.** The control plane has
never been short of records — it holds 62,000+ — but there was no way to ask _"show me everything about
this one piece of work"_ without writing bespoke code per surface. Now there is. **⚠ This is a FOUNDATIONAL
SLICE and does not close WB1:** the schema, the append path and three producers are threaded; several
others are deliberately not, and are listed by name in the entry rather than quietly implied.
**The decision that made it safe** is that the lineage id is **derived, not assigned** — computed from a
root the record already carries (`jobId` > `pushId` > `sessionId`). So a record written _before_ this code
existed has its lineage computed **at read time**, and every one of the 62,000 joins with **no migration and
no backfill** — which was not a convenience but a necessity, because an append-only ledger can never be
backfilled. Proven read-only against the live ledger: **118 lineages, 33 push arcs**, and a sample arc
gathered its intent + result + completion with **stamped 0, derived 3** — all three older than the code that
joined them. Then the push that shipped WB1 wrote its own arc with **stamped 3**, carrying the real source
SHA, the real gate result and verification going `CLAIMED → VERIFIED → VERIFIED`; **the live ledger now holds
both kinds and still parses cleanly**, which is the whole migration story. **⛔ One deliberate refusal worth
knowing:** the supervisor's `runId` is _not_ a lineage root, because it is a five-minute **tick** id — joining
on it would sweep every unrelated finding from that tick into one "lineage" and make the spine actively
misleading rather than merely incomplete. It would rather answer nothing than answer wrongly. **Adds no
executor and no new source of truth** — a gate test proves this slice introduced no new write path at all and
freezes the set of files allowed to write the ledger. And a real hazard was caught on the way: the backup's
**fail-closed** secret scanner would have aborted the entire off-machine backup, silently and permanently, had
any envelope field been named `secret`/`apiKey`/`password` — proven clean against the real scanner rather than
by eye.

**Prior update — 2026-07-31 (can a launch prompt even SET the effort tier? — a spike + a verify requirement,
doc-only)** — Two folds, nothing built. **(1) SP2, a new spike:** when Dispatch starts a session
**programmatically**, does an effort directive embedded in the launch prompt actually engage that effort, or
does it only work typed live in an interactive session? Two mechanisms tested separately — a
`/effort <level>` line and the `ultrathink` keyword — each against an interactive control arm, because
without that control the spike cannot tell "the launch path strips it" from "the directive does nothing
anywhere". ⚠ **Its honest caveat is recorded as part of the item, not as a footnote:** thinking budget is
very hard to observe from outside, so the spike can far more easily establish that a directive was
**accepted / echoed / acknowledged** than that the session **definitely ran at that budget** — and this
project already has a word for the weaker of those, **CLAIMED, not VERIFIED**. The result must be written
down at the strength it actually earned. Both outcomes are planned for: if yes, CPB9's effort tier can be a
prompt-level per-job setting; **if no**, the tier needs a different mechanism entirely (a launcher flag or
config rather than prompt text) or high-effort headless work has to be rescoped — rather than quietly built
on an assumption that never held. **(2) A requirement on CPB9:** its effort-tier feature must **verify the
applied tier per job — prove it was set, don't assume it.** A requested tier is CLAIMED; only a
corroborated one is VERIFIED; and if nothing can corroborate it, the honest record is UNOBSERVABLE, never a
tier asserted because it was asked for. That is load-bearing rather than bookkeeping: the admission gate
budgets a shared cap **against the tier it believes a job is running at**, so a job that silently ran at a
different tier breaks that arithmetic in both directions — over-burning if higher, wasting an unattended
window if lower. SP2 ↔ CPB9 cross-referenced both ways.

**Prior update — 2026-07-31 (usage-gate refinement + effort tiers + a completeness sweep — doc-only)** —
Three things, none of them built. **(1) CPB2's Stop-unattended-AI moves to 95%** (owner-approved): the
shipped default clamps to Stop at **90** — verified in `lib/usage-mode.js`, not assumed — and that is early
enough to halt unattended work while a genuinely useful slice of the cap is still on the table. **Reserve-
for-owner widens to 80-94** and Stop becomes the true last resort. Nothing else moves: the four-mode
coarsening stands, the retired per-threshold buzzes stay retired, and the exact readings still live in
`status.json` and the ledger. **(2) What Stop-unattended-AI actually DOES is now pinned**, enforced by
CPB5 v0.2's admission gate and deliberately asymmetric: it **refuses new unattended / dispatch-launched AI
sessions** and **never blocks the owner's own interactive work** — the last of the cap is being reserved
FOR him, so a gate that locked him out would defeat its own purpose. And **saving, committing and pushing
cost no AI and are never blocked by usage**, stated outright because it is the obvious thing to get wrong:
a gate that stopped the owner committing at 96% would strand finished work behind a limit that has nothing
to do with it. **(3) EFFORT TIER PER JOB** is folded onto the headless launcher — up to **ultracode** for
gnarly, high-stakes builds, gated by that same admission gate. The two halves are one decision: ultracode
is slow, deep and self-reviewing, which is exactly what suits fire-and-forget headless work where depth
costs wall-clock instead of attention — and that same property is why an unattended run that is both long
and expensive must never be left unsupervised against a shared cap. ⚠ **The sweep found one real gap and
it is now closed: the headless launcher had no entry at all.** Three shipped items (CPB1's dormant capture,
ACT2's omitted capture half, CPB5 v0.2's gate) were pointing at "the approvalless/headless launcher" as
the place that work lives, and no such item existed — the vague drawer Protocol 50 (a-form) forbids. It is
now **CPB9**, with its earn-condition stated and all three pointers resolved to it. **No owner go is on
file for CPB9 and it is explicitly NOT in the ready batch.** Everything else swept — CPB5's four sub-items,
P16, CPB7, CPB8, P17, CP5's off-machine witness, CPB1's reset-anchor and confirmed-live-data framing, REF5,
ND1, the roadmap spine — is present and correctly folded.

**Prior update — 2026-07-31 (CPB5 session control folded in — list active sessions BY NAME, and stop one;
doc-only)** — Folded an owner-provided addition (2026-07-31) into **CPB5**'s existing session-control
scope. **Nothing was built by that pass and no ID was created** — this is the concrete SHAPE of the
`session.stop` action already on the v0.2 rung, written down so it cannot later be built twice under two
names. Two halves, split across the ladder: **(a) LIST ACTIVE SESSIONS** — read-only, can surface as
early as v0.1's Work view — showing each active session's **human-readable UI NAME** alongside its id,
working directory, state (working/idle/stalled/abandoned) and last activity, because a list of hex ids is
not something a person can safely pick a kill target from. Its honest caveat is recorded as a hard build
requirement rather than a footnote: **the title may simply not be persisted anywhere the CLI can read**,
so the build must **VERIFY on-disk readability** against the real stores (leads named, none asserted) and,
failing that, degrade the column to `UNOBSERVABLE` and fall back to session id + working directory — never
invent or infer a name. **(b) KILL/STOP A SESSION** — v0.2, because it needs the confirmed-action
machinery v0.1 just shipped: echo the exact session by **name + id/pid**, explicit confirm, never blind
and never batched, ledger-appended, and **held until a `process-terminated` postcondition is actually
observed** rather than reported on a signal being sent. Two invariants are pinned to it: the postcondition
is evaluated on **`(pid, procStart)`** identity (never pid alone — a recycled pid could otherwise confirm a
kill that never happened), and the termination routes through **`lib/reaper.js`'s existing single
`process.kill` carve-out**, not a second kill path. ⛔ **It does not unblock CPB7's data-gated kill
authority** and says so in place: this is a human pressing stop on a session he is looking at; CPB7's
trip-open SIGTERM is the machine deciding on its own, and stays shadow-only behind DG1's evidence bar.

**Prior update — 2026-07-31 (CPB5 v0.1 BUILT + SHIPPED — the operator console can now answer "can I walk
away?")** — **CPB5 v0.1 is shipped, control repo `ff11244`: `robco`, the operator control CLI, first of
three slices.** The control plane has spent this whole round learning to WATCH; this is the first thing
that lets the owner ASK. One question — _can I walk away right now?_ — and three answers:
**SAFE-TO-WALK-AWAY**, **NEEDS-YOU**, and **BLIND**. That third one is why it was worth building
properly: BLIND is not a failure report, it is the console **declining to guess**. A green light
generated by an _absence_ of information is the most dangerous thing an operator screen can produce, so
if safety cannot be **proven** the answer is BLIND and every action is disabled until the view is
provable again. A supervisor that has missed three ticks, or a ledger that will not replay, puts the
whole screen there. **Every value on screen carries how it is known** — verified, observed, derived,
cached, claimed, proposed, stale, unknown — and three rules are enforced as _functions_ rather than
conventions: a **claimed** completion can never render as complete, **unknown** can never map to
healthy, anything unproven renders blind. That has teeth on real data, not just fixtures: a session
saying "I pushed" is a **claim**, while the independent `git ls-remote` re-read is **verification**, and
the moment it ran against the live plane it surfaced two real push transactions the ledger holds as
claimed-but-never-verified — shown as CLAIMED-NOT-VERIFIED, not as done. **Exactly ONE action ships**,
`incident.resolve`, and it is an envelope rather than a button: it freezes the version of the thing you
were looking at, makes you type the target back, refuses if the world moved while you were deciding,
collapses a double-submit into one, and then **holds the receipt PENDING until it actually observes the
change** — or says TIMED OUT, which it keeps carefully distinct from "I could not see". **Nothing on the
read side can write the ledger** (one write path, and a gate test proves the other ten modules contain
no write verb at all), it never routes through an MCP server, and it will not actuate without an
interactive terminal and a typed confirmation. ⚠ **Three divergences recorded on purpose:** the turtle
banner asset the entry said "already exists" **does not exist anywhere** — it was written from scratch
to the owner's stated design; the entry's older "PowerShell CLI" line is superseded by the later
Node-native ladder; and v0.1's `:` palette is a command line, not yet a navigable menu. **v0.2 and v0.3
are not built.** Full control suite green. Full record at the CPB5 entry.

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

## Where we are right now (the real 5-second version)

- **▶ STATUS — DEVELOPMENT IS ACTIVE AGAIN (2026-07-27).** The pause held for two days, not the expected
  multi-week gap: the owner bought a one-month Pro stint on 2026-07-25 and is **back on Max 5x as of
  2026-07-27**, so the budget scrimping that shaped 2026-07-26/27 no longer applies. **This supersedes the
  earlier "development is pausing for a long gap" note** (recorded 2026-07-24, correct when written). The
  three items that note called first-thing-back all landed: **A4** ✅ (built and emulator-proven 2026-07-26),
  **L** ✅ (owner-confirmed on his phone 2026-07-27), and **P9** — still open, now sitting with the other
  museum polish. **Nothing is mid-flight or broken.** ⚠ The tier is not permanent; re-confirm if the owner
  mentions a change.
- **⭐ THE TOP PRIORITY IS THE WORKFLOW / CONTROL PLANE (owner's explicit call, 2026-07-27)** — the program
  at **CP1-CP5**, directly below. The honest framing, and the reason it outranks feature work: the project's
  real bottleneck was never a missing agentic technique, it is the **control plane** — no completion event,
  no cancel, ghost/duplicate launches, no durable job ledger, no usage warning until a session hits the cap
  mid-run.
  **✅ CORRECTED 2026-07-31 — this bullet used to end "⚠ None of it is built." That is NO LONGER TRUE and had
  become the single most misleading line in this file.** A great deal is built, live, and running
  unattended every five minutes. **What actually exists now** (each verified against git + the live ledger at
  this reconcile): the **durable job ledger** and reconciler (CPK1), the **transactional verifier/publisher**
  (CPK2), **off-machine backup and restore test** (CPK3), **continuation packets** (CPK4), **incident
  lifecycle and daily housekeeping** (CPK5); the **controlled-push wrapper** routing every push (ACT3) with
  **raw-push refusal ACTIVE in both repos** (DG2, counter **44/10**) and the control repo's own pushes
  genuinely gated (CPB6); the **budget alert** (CPB1, dormant until fed) and **usage→operating-modes** (CPB2,
  **live**); the **operator control CLI** (CPB5 v0.1); the **provenance spine** (WB1 v0.1) and the
  **tamper-evident hash chain** (WB6 v0.1, observed writing at seq 1820); the **pre-publish PII gate**, built
  and **mounted**
  (P16); plus ND1, REF1 and REF5's three legs. **What is still NOT built** is the honest remainder: **WAKE**
  (platform-locked), the **return bus / MCP channel** (RB1-RB4, MCP1-MCP2), the **headless launcher** (CPB9,
  no owner go), CPB5 **v0.2/v0.3**, and CPB7/CPB8. CP1's spike campaign did its job — it proved rather than
  killed the approach, and the build followed.
- **⚠ LIVE USAGE STATE AT THIS RECONCILE (2026-07-31, read from the ledger, not assumed): weekly `sd` = 91%,
  session `fh` = 81%, and the machine has been sitting in `Stop-unattended-AI` mode all afternoon** (153
  `usage.mode` events today, the last six consecutive all `Stop-unattended-AI`). Under the **shipped**
  thresholds `>= 90` is Stop; under **CPB2's owner-approved-but-UNBUILT refinement** (Stop moves to 95,
  Reserve-for-owner widens to 80-94) today would instead read **Reserve-for-owner**. ⭐ **So that refinement
  is no longer theoretical — it is being exercised right now**, and the gap between the shipped default and
  the approved one is currently deciding whether unattended work may start at all. Recorded as live evidence,
  dated; it is an argument for building the refinement, not a licence to assume it.
- **2.8.0 "The Physical Machine" is SHIPPED and live on production.** The whole New Vegas hardware
  overhaul, offline native calculators, Diagnostic Shell, ambient runtime — all live.
- **2.8.5 "Foundations & Fidelity" is SHIPPED and live on production (2026-07-22).** The code+test-health
  round (U1–U12), the library/token split, the Fallout 3 Pip-Boy skin, the data-provenance re-sourcing,
  all three save-integrity layers, the UI-truthfulness fixes, the schematic-layout fix, and the whole
  governance restructure (R1-R4, R8, R9) have landed and released. Protocol 23 (layering) is now
  **enforced** by a static gate.
- **An external knowledge-architecture audit (GPT-5.6 Sol, 2026-07-21) has been folded in (item R10).** Two
  live defects it found are **already FIXED and guarded** — the cache-bump guard was blind to the `assets/`
  icons + best-effort-precached `CHANGELOG.md`, and `ARCHITECTURE.md` prescribed a save-destroying `setDoc`.
  Its sharpest finding is recorded but deliberately **not** fixed this pass: the R2 rules restructure
  **copied stale file-ownership facts into the new trusted layer** (`rules/state-and-save.md`) — the
  project's own recurring drift, reproduced inside the fix meant to end it. **Dispatch has now SEQUENCED
  R10's remediation** (fix the trusted layer → fix the guards that under-check → route Architecture by
  section; none of it gates the release) and **adopted a knowledge-graph / retrieval-topology spec (new item
  R11)** off the same audit.
- **The `dev → main` release is DONE (2026-07-22).** A3 was resolved (2026-07-21) — its modeled
  cloud-serialization guard shipped (`npm run cloud-check`) and the premise correction dropped the emulator
  test to the optional post-release item **A4** — so nothing data-safety gated the ship. The end-of-round
  review/synthesis deliverables (F done; **G**, H, D, I) and the governance process work (R5-R7) are now
  the post-2.8.5 tail, landing on `dev` for the next cycle.
- **Then 2.9.0** — the big one: gameplay systems, ambient world life, and the "it's a real operating
  system" round. Its hardening gate (which burns down the baselined architecture debt) sits BEFORE the OS
  services that would otherwise multiply it.
- **Then 3.0** — Fallout 4 as a real playable third game, bundled with the native ES-modules migration.
- **✅ The Museum is PUBLISHED & LIVE (2026-07-24) at https://robco-exhibit.pages.dev/ (P2 done).** "Records
  Office Dark" identity landed; the Claude-first audit ran and its **five self-audit defects are fixed AND
  pushed** to the archive; the capture pipeline + reproducibility (P1) landed; the **three intent-vs-reality
  blockers are all CLOSED** (images bundled in-site, captures release-pinned, exhibit a finished 3-pair
  curation); the `--public` self-contained tree was name-scrubbed, verified zero-leak, and exposed via a fresh
  public repo (`Robco-Exhibit`, zero archive history) on Cloudflare Pages. **⚠ The LIVE site is now STALE
  against its source** (published 2026-07-24; the archive has moved since) — "finish the museum" ends with a
  republish (**P14**), and **P13** is a hard security precondition on it. **P8 ✅ SHIPPED 2026-07-27** — the
  story corpus (146 canonical arcs) and the structure/connection map are filed in the archive and are the
  input to **P11**, the Visual Web build. **Remaining museum work:** **P10** (⭐ drop the 10-stop tab bar,
  redo the nav), **P11** (Visual Web), **P12** (Article Room), **P13**/**P14** (security scan + republish),
  the **external-second** review (design note e), **contextual-return nav (P5)**, the **AI-collaboration
  exhibit (P6)**, **P7** (origin-overview exhibit), **P9** (intent-vs-reality framing fix — pre-diagnosed),
  plus the Fable Direction-B + gallery-mats design polish. **The two governing principles recorded
  2026-07-22 (owner) stand:** CURATION is the museum-wide law — **capture everything, exhibit a curated
  subset** — with the **Visual Web (the "Magnum Opus") its ONE exemption** (complete-but-navigable, not
  curated); both under P.
- **⭐ The cross-cutting EXECUTION ORDER is now recorded (decided 2026-07-21; R11 moved before the ship the
  SAME day, owner's call):** **R10 doc-fixes → R11 knowledge graph → A3 → ship 2.8.5 → 2.9.0 with the Atlas
  built in.** The one-line why: fix the docs every session is forced to read FIRST, then build the graph that
  actually helps sessions (the owner judges its session-help worth more than a faster release), then A3 and
  ship — **A3 is now done** (modeled guard shipped; emulator test demoted to optional A4), so the ship is
  clear of it — and keep the Atlas IN 2.9.0 so it maps a system that isn't about to change under it. It is an
  **overlay** on the readiness groups below, not a re-filing. Full reasoning in **"The execution SEQUENCE"**
  just below. The correction it is built on: **most "museum stuff" helps HUMANS, not sessions.**

_Everything shipped is summarized below with a link to its full account in
[`QUEUE_LOG.md`](QUEUE_LOG.md); everything still ahead is expanded in full._

---

## ⭐ The execution ORDER — CURRENT (owner's call, 2026-07-27)

**Three bands, top to bottom. This is the live ordering; the 2026-07-21 sequence below it is kept in place
as the record of the round it governed (Protocol 50 (a-date) — a revision carries its own date rather than
overwriting the original).**

1. **⭐ FIRST — the WORKFLOW / CONTROL-PLANE program → [CP1-CP5], PLUS the 2.9.0 hardening pull-forward →
   [HG1-HG2] (owner, 2026-07-28).** The owner's explicit call. **The one actionable next step is CP1**, the
   empirical spike campaign — it needs owner hands-on time and it exists to prove or **kill** the hook-based
   approach before anything is built. **CP3 (immediate mitigations) can run in parallel and needs no control
   layer at all**, which is exactly why it is separated out: if the spikes come back negative, CP3 still ships.
   **Why it goes first:** every other item on this board is dispatched THROUGH the control plane, so its
   defects tax all of them — the same "fix what bleeds every session first" reasoning that put R10's
   trusted-layer fixes at the head of the 2026-07-21 order.
   **Reaffirmed 2026-07-28 (late), Protocol 50 (a-date):** the program's _internal_ build order is now
   specifically the trusted-action-kernel order (job contract → exact-SHA publisher → recovery/durability →
   continuation packet → incident lifecycle) set out in the CP program's build-order overlay, below — this
   band's "CP1-CP5 first" ranking is unchanged, only what happens inside it.
   **⭐ 2026-07-28 — the open "pull 2.9.0 hardening forward?" question is now RESOLVED: two of the three items
   join this band.** **HG1** (event-bus hardening) and **HG2** (bootstrap isolation) move up — pure
   debt-reduction, independent of the new OS services the rest of 2.9.0's hardening gate exists to protect, so
   there is nothing to do twice by doing them now. **The third item — the UI↔services dependency-cycle
   burn-down — stays in 2.9.0's hardening gate, unmoved**, because it depends on the surface the new OS
   services reshape; hardening it before that surface exists risks doing the work twice. Full entries →
   the new **"⭐ ALSO PRE-MUSEUM"** section directly below CP5; original reasoning kept in place in the 2.9.0
   hardening-gate section per Protocol 50 (a-date). Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#hg0728).
2. **THEN the MUSEUM → [P, P5-P14].** The build order inside it is P8's own: **P10** (the nav is now free to
   change) → **P11 Stage 0** (`arcs.json`, the curated edge layer — the one genuinely new data artifact) →
   the arc spine → the coverage view → the Visual Web. **P13 → P14** (the security scan-list fix, then the
   republish) closes the loop on a live site that is currently stale. **⭐ Re-confirmed by the owner
   2026-07-28: the museum finishes BEFORE 2.9.0 starts** — this band's ordering already put it there; the
   re-confirmation is recorded per Protocol 50 (a-date) so it carries its own date rather than being folded
   silently into the 2026-07-27 reorganization above.
3. **THEN everything else** — the 2.8.5 tail (B, L, Q, R10's residue, R11's gating call, R5-R7, C1, I), then
   2.9.0. **Item I (the Atlas) explicitly RIDES P11's graph renderer** — it is the same "one derivation,
   many views" plumbing, and building a second one would be the Protocol 22 parallel-implementation trap.

**What is deliberately NOT in this order:** nothing was retired or de-scoped to make room. The bands are a
priority overlay on the readiness groups below, exactly as the 2026-07-21 sequence was — the filing is
unchanged.

---

## The execution SEQUENCE of the 2.8.5 round (decided 2026-07-21 — the owner asked Dispatch to sequence, then approved: "go with recs"; steps 1-3 are now DONE, kept for its reasoning)

**This is a cross-cutting ORDER laid over the readiness groups below — it does NOT re-file anything.** Each
step points at its existing item; the readiness grouping (Ready now / Blocked on owner / Blocked on another
item / the Museum cluster) stays exactly as it is. The sequence is the overlay; the groups are the filing.

**The load-bearing correction this sequence is built on — recorded so nobody re-asks "why isn't the Atlas
earlier, it helps sessions" in three weeks: most of "the museum stuff" helps HUMANS, not sessions.** The
museum itself — its visuals, bug room, publication (P2), contextual return (P5) — is release-pinned history
for the owner, his brother, and the public; a session building the app never reads it. So "push the museum up
to help sessions" is the **wrong rationale**. Legitimate reasons to push the museum up exist (showing his
brother, going public) — session-help is not one of them. **What genuinely helps sessions is a different,
smaller set: the R10 trusted-layer fixes, the knowledge graph (R11), the AI-facing museum extract (P3), and
the Atlas's assurance view (I).** The order below is built on that distinction.

1. **The R10 trusted-layer fixes FIRST → [R10].** Already #1, cannot go higher. The stale facts in
   `ARCHITECTURE.md` and the ones the R2 restructure copied into `rules/state-and-save.md`, plus any remaining
   false statement in the skill. **Why nothing goes before it:** these bleed every session — one of them (the
   `setDoc` vs additive `addDoc` cloud-write) would lead a session to write saves in a way Protocol 34 says
   destroys a campaign. Nothing helps a session more than the documents it is forced to read not lying to it —
   and this helps every later step, including step 2. **This is a reference to R10's own recorded plan, not a
   competing order:** R10 §THE SEQUENCE already states "do steps one and two, ship 2.8.5, then step three" — so
   its step-one trusted-layer fixes and its step-two guard-fixes land before the ship, and its step-three
   Architecture-by-section routing lands after it.

2. **Then the knowledge graph → [R11]. ⭐ MOVED before the ship (owner's call, 2026-07-21 — same day, revising
   the order first recorded above).** It derives from files that already exist and are stable, so — unlike the
   Atlas — it can be built now without lying. It is the thing that lets a session ask "what governs this file,
   and is it actually guarded" and get a true answer (recorded already as infrastructure, not decoration).
   **Why it moved up — the owner's reasoning, recorded so it isn't re-litigated:** he judges the graph's
   session-help worth **more than a faster release**. The order first recorded here had the graph after the
   ship purely because it does NOT go stale while it waits — so nothing forced it earlier; but "nothing forces
   it earlier" is not "nothing is gained by it earlier," and the owner made exactly the call the brief had
   pre-approved as his (the graph's session-help over release speed). **It still must NOT move above step 1:**
   the graph is built to detect drift in exactly the trusted-layer files R10 fixes, so those fixes stay first.

3. **Then A3, then SHIP 2.8.5 → [A3].** ✅ **A3 is DONE (2026-07-21) — the ship is no longer gated by it.**
   The modeled cloud-serialization guard shipped (`npm run cloud-check`) and the premise correction (the code
   stores state WHOLESALE with pass-through loads, so a forgotten field-mapping cannot silently drop data)
   demoted the real emulator test to the **optional** post-release item **A4**. So this step is cleared;
   nothing data-safety gates the ship. **The reasoning that still stands for shipping soon:**
   shipping gives the museum a real released version to PIN to (unblocking publication P2), and it lets the
   Atlas get built against a stable released baseline instead of a moving `dev`. **The recorded COST of moving
   R11 up:** that museum-pin benefit is now **deferred slightly** — it is a cost of the owner's choice, not a
   lost benefit, and it is small (the museum is release-pinned history; nothing depends on its pin advancing
   sooner). R11 itself does not need the ship — it derives from already-stable files — which is exactly why
   putting it before the ship costs the graph nothing.

4. **Then 2.9.0, with the Atlas built INTO it once the round settles → [I].** The Atlas's assurance view is the
   single most session-useful artifact in the plan — AND it must NOT be pushed up. It maps the CURRENT system;
   2.9.0 will change most of what it maps; built now it is stale the day 2.9.0 lands. Its own entry already
   wants the round finished so it represents something real. Rushing it does not deliver the benefit early — it
   delivers a WRONG MAP early. **This is the one place the owner's "push it up" instinct was explicitly
   overruled, with his agreement.**

**Gated items that ride their dependency, NOT this order:** **P3** (AI-facing museum extract) helps sessions
and can move up, but is gated on the "current-by-absence" supersession-logic fix (recorded under P3 / R10
finding H) — it lands after that fix, not before. **The Atlas [I] depended on D** (the TEST_CATALOG
generator) — **D shipped 2026-07-27** (Protocol 47), so that dependency is now cleared.

---

# ⭐ TOP PRIORITY — the WORKFLOW / CONTROL-PLANE program (CP1-CP5, new 2026-07-27)

> **⛔ READ THIS BEFORE ANY LINE BELOW. NOTHING IN THIS PROGRAM IS BUILT.** Every mechanism named here —
> hooks, leases, ledgers, wrappers, notifications, termination, worktree routing — is **PROPOSED or PLANNED**,
> and the load-bearing ones are **gated on CP1's spikes actually firing them**. A future session must not read
> this section as a description of something that operates. It is a design under test. Where a claim has been
> mechanism-supported but never executed, it says so.

**Where this came from — the arc, recorded because it IS the story (2026-07-27).** Over one heavy work day
the phone-facing orchestrator (Dispatch) kept hitting its own control-plane limits, and instead of papering
over them the owner had it turn the project's self-maintaining-system discipline on **itself**:

1. **The symptom pile.** Ghost / duplicate launches; plain-text-invisible-on-mobile (recurred 3+ times in one
   session — the operator kept using a channel the owner cannot see); no completion notification (poll-only);
   no cancel or interrupt; sessions idling on backgrounded pushes; no durable job ledger; no usage-cap warning
   until a session hit the cap mid-run.
2. **The register.** A raw problem list, then a structured 12-problem evidence register with a 9-field schema.
3. **The GPT↔Claude convergence.** GPT (relayed by the owner over the manual copy-paste bus) critiqued it
   twice — collapsed the 12 into ~5 root capabilities, promoted the missing **job ledger** and **usage
   visibility** to first-class, corrected the concurrency framing (**the colliding resource is the working
   tree + the push + the archive sync, not "the repo"**), and reframed the essential missing control as
   **emergency-stop, not mid-run steering**.
4. **The feasibility audit.** A read-only Opus session found the local substrate far richer than assumed: the
   Dispatch-session → CLI-session → OS-process correlation chain already exists and is platform-written;
   durable session / transcript / error / branch / cost / usage data is already on disk; project hooks
   **appear** to load. It proposed a single job-lease as the smallest intervention.
5. **⭐ GPT's adversarial correction — the part that must survive.** It caught the overreach squarely:
   **"proven" was used for mechanisms that were never executed**; **one lease cannot cover four distinct lock
   domains**; what a lease buys is **at-most-one-WRITER containment, NOT exactly-once** (ghost launches still
   fire and still burn usage); and **lease revocation is write-quarantine, not cancel**. It issued a 10-point
   re-grade and a three-level challenge (mitigations / containment / full control plane) that CP1-CP3 are
   built directly on.
6. **[OPEN] the empirical spike → CP1.** The agreed next move is a small bounded spike campaign that actually
   fires the mechanisms, to move the load-bearing claims from _mechanism-supported_ to _empirically proven_
   **before any real build**.

**Why this is the top priority, stated plainly.** Every item on this board is dispatched through this channel,
so its defects tax all of them; and the honest read already on file (2026-07-25) is that RobCo's real
bottleneck was **never a missing agentic technique** — it is the control plane plus the owner's time. **This
is also prime museum material** (the self-maintaining system turned on its own orchestrator, with a live
multi-model collaboration and its dissent preserved) — it feeds **P8**'s orchestration-channel and
review-and-convergence groups and the **P6** AI-collaboration exhibit when it concludes.

## ⭐ The CP program's BUILD ORDER — CURRENT (owner's call, 2026-07-28 (late) — three-model review convergence)

**Supersedes CP2's six-stage order as the _working_ plan; CP2's own order stays recorded in place below for
its reasoning (Protocol 50 (a-date) — a revision carries its own date, it does not overwrite the original).**
This is an overlay, exactly like the "⭐ The execution ORDER — CURRENT" band above it — it does not re-file or
renumber anything. Full converged reading →
[`planning/control-plane/reviews/CONVERGENCE_2026-07-28.md`](planning/control-plane/reviews/CONVERGENCE_2026-07-28.md);
full account of this reconciliation pass → [`QUEUE_LOG.md`](QUEUE_LOG.md#cpkernel0728).

> **✅ RECONCILED 2026-07-31 — ALL FIVE RANKS BELOW ARE SHIPPED. This section is now HISTORY, not a plan.**
> Ranks 1-5 map to **CPK1 `8eab8fd`** · **CPK2 `dd49ed4`** · **CPK3 `e4384e5`+`78acfd5`** · **CPK4 `9fd751d`**
> · **CPK5 `32c0fbc`** — every SHA re-verified in the control repo this pass. It is kept in place (Protocol
> 49: retire in place, never delete the reasoning) because the **reframe** that produced it is the most
> load-bearing argument in this file. **The trusted-action-kernel thesis was correct and the kernel is
> built** — so what follows is the ORDER FOR WHAT REMAINS.
>
> **⭐ THE CURRENT ORDER (derived at this reconcile from what is already recorded as priority + what the
> kernel now unblocks — offered for owner confirmation, NOT an owner mandate; nothing here overrides a
> standing call):**
>
> 1. **CPB2's threshold refinement (Stop → 95, Reserve-for-owner → 80-94).** ⭐ **Promoted to first on live
>    evidence, not preference:** the machine sat in `Stop-unattended-AI` all afternoon at **91% weekly**, a
>    band the owner has already approved re-classifying as Reserve-for-owner. It is owner-approved, tiny, and
>    **currently deciding whether unattended work may start at all**. The bands are even tunable via config
>    today — but changing the shipped default is the recorded build task.
> 2. **RB1 — the Dispatch INBOX projection.** Still the biggest leverage per unit of work and needs no wake,
>    no channel, and no platform change: one derived delta off the ledger that already exists, plus the
>    read-at-turn-start rule. Everything later plugs into it.
> 3. **CPB5 v0.2** — live work + admission (Work Board, Session Inspector, the **usage admission gate** with
>    its new **effort ceiling**, `session.stop`). Owner-confirmed high-priority, and v0.1 shipped, so the
>    rung is genuinely next rather than aspirational.
> 4. **RB3 — the hidden-response watcher**, now **ON/ARMED by default**. Starred because it targets the
>    recurring failure this whole program started from.
> 5. **CPB3 — the `backup-all` script**, the mechanical half of the checkpoint ritual. Small, and it removes
>    a standing manual burden from every checkpoint.
> 6. **RB2 receipts**, then the **channel** (**MCP1**'s five-op `robco-control` slice → **MCP2**
>    `robco-evidence`, both REMOTE per the 2026-07-31 correction) — explicitly **not** pulled forward, since
>    the effort motivation that used to argue for it is gone.
> 7. **The museum tail** — **P13** (security precondition) → **P14** (the stale-site republish) → **P15**
>    (control-plane arcs + the new platform-locked exhibit).
>
> **Deliberately NOT in this order:** **CPB9** (no owner go), **CPB7/CPB8** (data-gated / not in the go
> batch), **RB5** (blocked by platform, owner approval required), and **WAKE** (platform-locked, nothing to
> build). **WB1/WB6** continue as additive follow-on slices rather than competing for a slot.

Three external reviews (Gemini 3.1 Pro, DeepSeek, GPT-5.6 Sol) converged on one reframe: the project built a
strong **flight recorder** (OBSERVE) and a weak **actuator**, and several planned/built items **turn weak
inference into destructive action** — the wrong place to spend the risk budget. The next maturity jump is a
**tiny trusted action kernel**, not more detectors. The working build order **was** (all five now shipped —
see the reconcile note above):

1. **Job contract + reconciler.** A tiny manifest of _desired_ state per job (id/nonce, repo, base SHA, write
   scope, deadline, verification commands, terminal condition) plus intent→act→observe-independently→result
   with idempotency keys, reconciling intents-without-results after a crash. Generalizes Stage 2's push
   contract to every job. _Mechanism: `SessionStart` `additionalContext` injection, zero token cost._
2. **Transactional exact-SHA verifier/publisher + fault-injection tests.** The publisher pushes only a SHA it
   independently produced evidence for — enforced first for unattended publication only, with a tested,
   ledger-recorded break-glass. Promotion requires real exposure **and** injected negative cases, not calendar
   time.
3. **Recovery inventory + off-machine durability + restore test + supervisor freshness.** "expected == observed
   SHA" proves one ref at one moment, not recoverability — inventory everything a total-disk-loss takes
   (uncommitted/untracked work, control-plane source+config, Task Scheduler defs, ledger segments, hooks,
   orchestrator memory) and periodically restore into a temp dir and validate it.
4. **Deterministic continuation packet.** An AI-free resumption file at session exit/failure — objective SHAs,
   changed/uncommitted files, commands+tests already run with results, current job state and blocker,
   agent-claims kept separate from independently-observed facts. Kills the "every fresh session rediscovers
   everything" usage cost.
5. **Incident lifecycle + daily housekeeping.** Alerts modeled open→updated→resolved→reopened so ledger dedupe
   can't suppress a recurring incident forever; a daily pass detects supervisor/adapter/disk/ledger/replication
   degradation.

**Not in the next five** (reconsidered / de-prioritized — was planned or built, now narrowed, each with its
reasoning):

- **The idle reaper — BUILT tonight (`643ebb8`, `_RobCo-Control` repo) — over-invested; RE-SCOPED.** Authorize
  cleanup on **independently-verified terminal state OR an explicitly authorized hard deadline**, for
  supervisor-launched jobs only (stored process identity / a Windows Job Object), **never** idle-inference on
  an interactive Desktop session. Why: an idle session normally costs no tokens; a mistaken kill destroys
  unsaved reasoning or interrupts git. (Tonight's own congestion was itself a lease-blocking process, not an
  idle one — the correct trigger is "blocking a lease," not "idle.")
- **Thrashing detection — stays ALERT-ONLY, does NOT graduate to kill.** 4 same-tool failures can be valid
  diagnosis; file-changes aren't real progress either way. Legitimate termination = crossing an
  owner-approved time/tool/usage **envelope**, never a "thrashing" guess.
- **Headless AI for sync / reap / run-tests — CUT.** Deterministic work (`spawn()` of Node/PowerShell/git/the
  test command) should run directly; using Claude for it burns the scarce resource, widens authority, and adds
  nondeterminism for no benefit. Headless AI stays reserved for interpretation (bounded log diagnosis, a
  proposed patch).
- **Auto-restart — decoupled from repo sync.** Split into: continuous checkpoint/durability · app-health
  detection · restart with cooldown + max-attempts (alert after one failure, never loop) · repo sync by its own
  contract. Restart only when no active mutating jobs — "sync memory before restart" is not a reliable
  emergency plan if the app is already hung; state must be checkpointed continuously enough that restart is
  _already_ safe.
- **`--no-verify` tripwire — de-prioritized to telemetry-only.** It targets one bypass while direct git,
  alternate binaries, hook edits, or credential use all remain open; the exact-SHA publisher + credential
  separation is the real invariant. Keep the flag detector as cheap telemetry, not an enforcement point.
- **Worktrees — deferred; prefer a per-repo mutating LEASE first.** Worktrees share git objects/refs/config/
  credentials, so they buy concurrency, not containment. At one machine / one cap, a single mutating-job lease
  per repo may deliver most of the value with less machinery; add worktrees only when measured concurrency
  value beats the cleanup+integration cost.

**Doctrine refinement — fail-open/shadow-first is not universal.** A false _denial_ of one unattended job is
cheap; a false _allowance_ of an autonomous push/kill/restart is expensive. So: preserve availability **for the
owner** (always-available, logged break-glass) but let **automation's** safety-critical paths fail **CLOSED**.
This dissolves the old "a guard that locks me out is worse than no guard" tension — it was conflating the
owner's path with automation's. Correct defaults: an observational adapter failing lets the human workflow
continue (report unavailable/stale); an unattended launch lacking fresh prerequisites does not launch; missing
verification evidence means do not publish; ambiguous termination identity means do nothing plus alert; the
owner working around a guard failure is an explicit logged break-glass; a platform schema change disables the
dependent automation, not the whole workflow. **Simplicity stays 4-5 executable invariants, not a pile of
detectors:** (1) no unapproved concurrent writer to the same workspace; (2) no unattended publication without
exact-SHA independent evidence; (3) no destructive action on ambiguous or stale identity; (4) every durable
state promised to the owner is demonstrably restorable; (5) unattended work cannot consume the owner's reserved
usage or authority. **This is where the CP program's doctrine/principles live** — future additions to it
belong in this section, not scattered per-stage.

**Owner decisions (2026-07-28):**

- **Usage thresholds 50/80/85/90/95 → operating MODES — ✅ APPROVED.** Normal / Conserve / Reserve-for-owner /
  Stop-unattended-AI; notify only on a mode _change_; exact % stays in `status.json`. Five raw thresholds were
  becoming wallpaper; a weekly rollup answers "what decision should change?" (usage per verified outcome,
  duplicate launches, blind time, overrides), not event counts.
- **Sequencing — ✅ this whole kernel program runs BEFORE the museum and before 2.9.0** — reaffirming, per
  Protocol 50 (a-date), the existing "⭐ The execution ORDER — CURRENT" band above; that band's "CP1-CP5 first"
  ranking already had this, and now specifically means the kernel build order above.
- **Separate trust domain for unattended jobs → folded as DEFERRED, laptop-leaning.** Not scheduled — the
  kernel needs no separate trust domain (the exact-SHA publisher + credential separation + restore-proof carry
  the safety). Revisit once unattended autonomy is in regular use; when built, the **spare laptop** is
  preferred over a separate Windows account on the main PC — a real machine boundary that also doubles as the
  rank-3 off-machine durability. See **CP5**.

**Before any build:** verify which Gemini-cited mechanisms (`CLAUDE_CODE_PROCESS_WRAPPER`, native OpenTelemetry
export, Channels, `SessionEnd`, native worktree/timeout env vars) actually exist on the installed CLI build —
Gemini gave specific version-gated features with real-looking doc citations, but LLMs hallucinate version
numbers; none of it is load-bearing until confirmed against the live docs + the installed build.

> **⛔ 2026-07-29 addendum (Protocol 50 a-date) — ranks 1-2 SHIPPED, five alerts live, thrashing
> recalibrated, a rank-3 spec, and the usage-measurement question answered.** All in the private
> `RobCo-Control` repo unless noted; nothing here touches this app repo's runtime code.
>
> - **Rank 1 — job contract + reconciler — ✅ SHIPPED, commit `8eab8fd`.**
> - **Rank 2 — transactional exact-SHA verifier/publisher — ✅ SHIPPED, commit `dd49ed4`** (fails closed, a
>   tested break-glass, fault-injection tests).
> - **The idle-session reaper (built `643ebb8`, above) is re-scoped**, exactly per this section's own
>   de-prioritization note: verified-terminal/owner-authorized-deadline cleanup only, never idle-inference.
> - **Five new Pushover alerts** (commits `f14499d` + `bac032a`), on top of the four already built + live:
>   (1) "a session needs your input" — documented contract, the `Notification` hook is unverified-live, not
>   wired; (2) ⭐ **backup-unhealthy** — LIVE, and already fired correctly on a real run; (3) session
>   died/errored — documented contract, `StopFailure` hook, unverified-live, not wired; (4)
>   deadline-exceeded — LIVE, wall-clock only; (5) break-glass-used — LIVE. All demoed to the owner's phone.
> - **Thrashing detector recalibrated, commit `15c17d0`** — a "nearby-progress" gate fixed a real false
>   positive (session `53a3bb89`). Stays shadow-only, never kills, per this section's doctrine above.
> - **Usage-measurement accuracy spike run** (read-only investigation, no repo touched, nothing killed —
>   [`planning/control-plane/USAGE_MEASUREMENT_SPIKE.md`](planning/control-plane/USAGE_MEASUREMENT_SPIKE.md)):
>   per-job tokens/cost ARE measurable, even under two-job concurrency, via OTLP or a headless job's own `-p`
>   JSON result — both channels agree to the same floating-point value. **This unblocks the deadline/budget
>   alert's budget half for dollar/token budgets.** It does NOT unblock "% of the weekly/5-hour cap" — `fh`/
>   `sd` in the global usage file carry no session id and are structurally incapable of per-job attribution;
>   that stays `UNOBSERVABLE`, never estimated, per this project's own doctrine.
> - **Rank 3 (off-machine durability) now has a SPEC, not a build** —
>   [`planning/control-plane/RANK3_BACKUP_REPO_SPEC.md`](planning/control-plane/RANK3_BACKUP_REPO_SPEC.md):
>   a dedicated private backup repo mirroring the control-plane's runtime ledger, scheduled-task XML, and hook
>   config, with a periodic restore test. **Gated on the owner creating the private repo** — Dispatch does not
>   create accounts/repos. Ranks 4 (continuation packet) and 5 (incident lifecycle + housekeeping) remain
>   unbuilt.
>
> Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#cp0729).

### CP1. 🔄 The empirical SPIKE CAMPAIGN — prove or KILL the hook-based containment before building (AUTONOMOUS PORTION COMPLETE 2026-07-27; three owner-dependent probes remain)

> **⭐ RESULT (2026-07-27, Claude Code build 2.1.206): the design HELD.** The probes that a session
> could run alone were run, and they came back positive: a project `SessionStart` hook fires in a
> Dispatch-launched session (**session_id arrives via stdin — the assumed `CLAUDE_SESSION_ID` env var
> does NOT exist**); a `PreToolUse` hook genuinely **BLOCKS** a write, even under
> `permission_mode=bypassPermissions`; coverage spans all five write tools **plus MCP plus
> SUB-AGENTS** (payload carries `agent_id`, and the deny enforces on a sub-agent's write — so
> **containment is NOT bypassable via Agent fan-out, and the earlier "no sub-agent fan-out in writing
> jobs" ban is LIFTED**); a broken hook **always fails OPEN**, and a hook killed at its `timeout` is
> unconditionally fail-open and un-patchable from inside; verified process-tree termination can be
> autonomous-safe **only** under six strict identity conditions; the double-buffered intent-file
> handshake passed 17/17; and worktrees turned out to be a **platform** feature (an in-app toggle),
> so worktree provisioning is **not** something this program has to build.
>
> **Still outstanding — each needs the owner, which is the gating cost:** **S7** (does a notification
> actually reach the phone — needs him away from the machine), **S8** (scheduled task across sleep —
> LOW priority now that the laptop is parked and the Ally never sleeps), and **S10's** live routing
> probe (needs a quiet window; the platform finding above is established independently).
>
> ⚠ **One honest caveat, recorded rather than glossed:** the campaign ran on build **2.1.206** and the
> machine is now on **2.1.217**. Nothing suggests hook semantics moved — but nobody has checked, so
> the spec requires a cheap re-probe of the three load-bearing results on the then-current build
> **before** any hook is made load-bearing.

**What it is.** A small, bounded, throwaway campaign — **spikes S0-S11 in the design's own numbering** (these
are spike labels, _not_ queue item IDs; item **S** is the unrelated shipped PWA-install work) — that actually
**executes** the mechanisms the feasibility audit could only read. Its purpose is **falsification, not
construction**: a negative result is a full success, because it kills a design before it is built.

**What each probe must answer (the ten named so far):**

- **Launch routing** — does a launch actually land where the record says it does?
- **SessionStart delivery** — does a SessionStart hook fire, and does its payload reach the session?
- **PreToolUse denial** — can a PreToolUse hook actually DENY a tool call, or only observe it?
- **Tool + sub-agent coverage** — do hooks cover sub-agent tool calls, or is that a hole?
- **Fail-open / fail-closed characterization** — when the hook errors, times out, or is absent, what happens?
  **This is the single most load-bearing unknown**: a containment layer that fails OPEN is decoration.
- **Phone-notification delivery** — does a completion notification actually reach the owner's phone?
- **Scheduled-task-across-sleep** — does a scheduled task survive the Ally sleeping, and when does it fire?
- **Verified process-tree termination** — can a process tree be killed and the kill **verified**, not assumed?
- **Worktree routing** — can a session be routed into its own worktree reliably?
- **Intent handshake** — can a session's declared intent be captured before it acts?

**⚠ What it needs from the OWNER — this is the gating cost, not a technicality.** Several probes cannot be
run by a session alone: **closing sessions to create a genuinely quiesced window**, **being away from the
machine for the notification test**, and **letting the Ally sleep** for the scheduled-task probe. It also
needs the **CP5 laptop inventory** before the topology probes mean anything.

**Hard rules.** Throwaway artifacts only — nothing lands in either repo's operating path. Every claim the
campaign produces is labelled **executed** or **mechanism-supported**, never blurred; the whole campaign
exists because that distinction was blurred once already.

**Done means:** each probe above has a recorded, dated result with the evidence attached; every CP2 claim
that depends on one is re-graded to _executed_ or **struck**; and the owner has a plain-English verdict on
whether hook-based containment is viable at all.

> **⛔ 2026-07-28 (late) addendum (Protocol 50 a-date):** the "verified process-tree termination" probe above
> is narrowed by the three-model review's doctrine — legitimate termination is only an owner-approved
> time/tool/usage envelope, never a "thrashing" guess, and the idle reaper built the same night is re-scoped to
> verified-terminal-state cleanup only, never idle-inference. See the CP program's build-order overlay above.

### CP2. 🔄 The STAGED control-plane build — six stages, each gated on the one before (spec at **v2.3**, ⛔ **NOT build-locked**; Stage 1 substrate BUILT read-only; **S12 CLEARED** — 2026-07-27; **Stage 4b CLOSED NEGATIVE** — 2026-07-28)

> **Status history, kept short.** This item briefly read "SPEC LOCKED" — it was not. An external GPT
> review of v1 returned **"remain SPEC, NOT READY TO BUILD"** pending ten corrections; folding them in
> (v2, v2.1) **revealed a hard gate**, so the status went backwards. **That gate has since been proven
> and cleared (v2.2).** Full accounts → [`QUEUE_LOG.md`](QUEUE_LOG.md#cp2v21) and
> [`QUEUE_LOG.md`](QUEUE_LOG.md#cp2s12).
>
> **⛔ v2.3 (2026-07-28) — S7 ran for real and came back NEGATIVE.** A one-time Claude scheduled task
> fired on time while the owner was away, but (a) a headless/scheduled task has **no direct
> proactive-notify-to-phone tool** — only a **live Dispatch agent** reaches the phone (confirmed the
> same session) — and (b) it **hung on a permission prompt** for a write action with nobody present to
> approve it, so it never completed and even its own completion-notification never fired. **Stage 4b
> (real unattended push notifications) is NOT achievable with available mechanisms — a PLATFORM LIMIT,
> not a build gap. Do not re-attempt the scheduled-task→phone route.** The permanent design is PULL,
> not push: notify while a live agent is active, plus a status-file read at the next check-in — which
> is already what Dispatch does today. **Also folded into v2.3:** a docs-grounded finding that genuine
> unattended launch autonomy ("owner is busy, just go") exists at the headless/SDK level
> (`bypassPermissions` / `--dangerously-skip-permissions`, persistent `.claude/settings.local.json`
> allow-rules) but **not** on the Dispatch launch path (`start_code_task` approvals expire ~30 min and
> re-prompt every launch) — real autonomy needs either that headless/SDK path (gated on **S12-T**,
> below) or a future Dispatch feature that persists launch authorization. Full account →
> [`QUEUE_LOG.md`](QUEUE_LOG.md#cp2v23).
>
> **📄 The spec:** `planning/control-plane/CONTROL_PLANE_SPEC.md` (gitignored; tracked home is the
> private archive — v2 `d4399da`, v2.1 `408be59`). Beside it: the review verbatim at
> `planning/control-plane/reviews/GPT_REVIEW_01.md`, and the spike evidence at
> `planning/control-plane/evidence/S12_EVIDENCE.md` with its reconciler prototype and test suite.
>
> **✅ S12 — the job→session admission binding — is CLEARED (2026-07-27).** The gap GPT called the #1
> missing piece turned out to be **already provided by the platform**: an environment variable carries
> the launching session's exact id into the launched one, present at the very first hook firing, 3/3
> subjects. **No invented launch token is needed** — the spec's own proposed one is withdrawn. The
> binding logic is proven **12/12** across simultaneous duplicates, delayed ghosts, legitimate retries,
> rerouted work and eight edge cases. ⭐ It also changed the architecture: because the hook can fire
> **before** Dispatch has recorded the launch, admission must be **reconciliation between two
> append-only ledgers joined later — never a synchronous gate**. A design that checked at hook time
> would have rejected exactly the real sessions it exists to admit.
>
> **⚠ The two remaining gates, now explicit and much smaller than the one they replace:**
>
> 1. **The full re-probe** — all load-bearing hook behaviour (S1–S6 **plus hot-reload, plus the new
>    admission variable**) re-verified **per live build**, **before** shadow collection. The machine
>    runs more than one build under one shared hook config, so "the current build" is not a single
>    thing. Blocks Stage 1d and Stage 3 — **not** 1a/1b/1c/2.
> 2. **S12-T — the non-local-transport re-verify.** Every S12 sample used the local desktop launch
>    path. A headless/remote/CI launch may set the variable differently or not at all. Blocks **only**
>    non-local transports; the Ally-only deployment does not use any, so nothing waits on it today.
>
> **⬜ Riding S12-T: unattended launch autonomy** ("owner is busy, just go" — a distinct idea from
> Stage 4b's notifications, docs-checked 2026-07-28). Real: headless `claude -p` + a permission-bypass
> mode (`bypassPermissions` / `--dangerously-skip-permissions`) skips the interactive warning dialog in
> headless mode; persistent pre-authorized allow-rules can live in `.claude/settings.local.json`; an
> SDK parent's `bypassPermissions` is inherited by spawned subagents. **Not real yet on the path this
> project actually uses:** the **Dispatch launch path** (`start_code_task`) has no documented
> pre-authorization equivalent — approvals expire ~30 min and re-prompt every launch. **Do not build
> toward this** until either (a) S12-T clears the headless/SDK path for non-local use, or (b) Dispatch
> ships a launch-authorization-persistence feature — whichever arrives first. Full account →
> [`QUEUE_LOG.md`](QUEUE_LOG.md#cp2v23).
>
> ⭐ **The next action is no longer a spike — it is a build.** The critical path now contains only
> builds and decisions.
>
> **✅ What IS built — the Stage 1 substrate, running READ-ONLY.** The passive-observation ledger and
> its adapters live at `C:\Dev\!RobCo\_RobCo-Control\` — **its own private repo**
> (`github.com/zerckzzyHD/RobCo-Control`), code in `code/`, runtime state in the sibling `state/` so a
> lockfile can never be committed. **`ENFORCED: false`** — nothing is blocked, denied, reaped or killed.
> ⚠ Note the divergence from the spec: state moved out of `%LOCALAPPDATA%\robco-control\` (which the
> spec still names), deliberately and documented in `lib/paths.js`. **Consequence: two lock roots exist**
> until `sync.ps1`'s is repointed — the observer reads the old one strictly read-only so lock detection
> isn't a fabricated zero.
>
> **📊 First real finding: the collision class is measurably NON-ZERO.** The observer recorded a live
> **tree collision in this very app repo** — two live sessions co-resident in `C:\Dev\!RobCo\!RobCo-UOS`,
> twice. ⚠ Read that precisely: it is **co-residency, not overlapping write attempts**. Distinguishing
> the two needs Stage 1d shadow telemetry, and the spec is explicit that conflating them inflates the
> number that decides whether Stage 3 gets built. Three detections are honestly marked **UNOBSERVABLE**
> rather than zero (same-job ghosts and orphan jobs need Stage 3; stranded pushes need Stage 2).
>
> **Critical path to any enforcement (updated):**
> `1a → 1b → 1c → re-probe (every live build) → 1d telemetry → the worktrees-vs-Stage-3 decision → Stage 3`.
> **Buildable today with zero blocked dependencies: `1a → 1b → 1c → Stage 2`** — ledger, observer,
> **admission enrollment**, status file, push wrapper, completion contract. (`1c` joined that list when
> S12 cleared; before, only `1a → 1b → Stage 2` was unblocked.)
>
> **⭐ Open architectural question (do not settle on taste):** the review graded **worktrees (Stage 6)
> B+, the program's highest**, and suggested they may deserve promotion **ahead of Stage 3** — structural
> isolation cannot fail open, needs no per-build re-probe and doesn't depend on S12. It also doesn't
> cover the same-tree case, the archive, or L1/L2 at all. **Stage 1d's telemetry decides it** by splitting
> overlaps into same-tree vs different-tree. If different-tree dominates, **Stage 3 may never be built.**
>
> **Owner decisions still open:** whether the hook config is committed or local-only; and the
> lock-coverage option for archive writers. ⛔ **No longer open: how the supervisor reaches the
> phone** — S7 closed that negative 2026-07-28 (above); the answer is PULL (a live agent + a
> status-file read at check-in), not a mechanism/interval choice.
>
> **⛔ 2026-07-28 (late) — the six-stage order below is SUPERSEDED AS THE WORKING PLAN**, not renumbered or
> deleted: a three-model review convergence (Gemini + DeepSeek + GPT) replaces it with the trusted-action-kernel
> build order in the overlay directly above ("⭐ The CP program's BUILD ORDER — CURRENT"). Kept below verbatim
> per Protocol 50 (a-date) — the stage reasoning (the L1/L2/L3 lease correction, the ledger-outside-both-repos
> rule, the worktrees-vs-Stage-3 telemetry decision) still holds, and CP2 resumes from it once the kernel's
> early ranks land. The spec file (`CONTROL_PLANE_SPEC.md`) is **not** rewritten by this pass; it carries its
> own dated pointer at the top instead. Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#cpkernel0728).

**What it is.** The build, if and only if CP1 says the substrate supports it. Deliberately staged so that
**every stage is independently useful and independently abandonable** — the project's standing
evidence-gate discipline (build the simpler thing, see whether it is used, then earn the harder one).

1. **Passive observation** — adapters plus an **append-only ledger**, strictly **read-only**. Nothing is
   blocked, denied or killed. This is the stage that turns "we think this happens" into data.
2. **Controlled push / sync wrappers** — the first stage that touches a real operation, aimed at the
   collision GPT correctly identified: the **working tree, the push, and the archive sync**. Routing real
   pushes through it is tracked as **ACT3**; turning on raw-push refusal once that has run clean is
   **DG2** — both in the activation checklist below.
3. **Containment** — hooks plus **separate L1/L2/L3 leases** (one lease cannot cover four lock domains — GPT's
   correction, adopted) plus **write quarantine**. ⚠ Record what this does and does not buy: **at-most-one
   writer, NOT exactly-once.** Ghost launches still fire and still burn usage; containment does not stop them.
4. **Scheduled reconciliation + notifications** — the completion event the workflow has never had, plus a
   periodic reconcile so a dropped job is noticed rather than forgotten.
5. **Verified termination** — ⚠ **proposal-only, and it stays proposal-only until CP1's termination probe
   returns evidence.** Lease revocation is **write-quarantine, not cancel** — do not let a later session
   conflate the two.
6. **Optional: worktrees / mobile** — only if the earlier stages are actually being used.

**⛔ The ledger lives OUTSIDE both repos** — `%LOCALAPPDATA%\robco-control\`. It is operational state, not
project history: putting it in the app repo would make it a served-file and cache-bump concern, and putting
it in the archive would entangle the backup with the thing being backed up.

**Done means:** each stage shipped only after its gate passed, with its own recorded evidence; the ledger is
outside both repos; and every capability claim in this entry reads _executed_, not _mechanism-supported_.

### CP3. ⏭️ IMMEDIATE MITIGATIONS — fixable now, with NO control layer at all (PROPOSED; independent of CP1/CP2)

**What it is.** The subset of the problem register that needs no new machinery, separated out on purpose:
**if CP1 comes back negative and CP2 is never built, every item here still ships.** That independence is the
whole reason it is its own item rather than CP2's first stage.

- **A completion-evidence contract.** A session's report must carry **test / commit / push / origin hashes**
  — the evidence, not the narration. This is the standing rule _"a session's account of its work is a claim,
  not evidence"_ (Protocol 8) given a concrete required form.
- **Sync-before-synthesis is formalized — ✅ shipped 2026-07-27 as Protocol 54** (`CLAUDE.md`, alongside
  Protocol 48). The rule: any archive-read/synthesis task syncs the archive (Protocol 48) **before** reading
  it — either as a sync-then-dispatch step or as the synthesis task's own first step. It is now a live,
  enforced rule, not just a recorded decision.
- **The mobile-reporting discipline.** The plain-text-invisible-on-mobile failure recurred 3+ times in a
  single session because the operator kept using a channel the owner literally cannot see on his phone.
- **A usage early-warning relay** off `plan-usage-history.json`, so the cap is known **before** a session hits
  it mid-run rather than after. Tracked concretely as **CPB1** (the budget alert) and **CPB2** (usage →
  operating modes) in the activation checklist below.
- **A pre-push + sync LOCK FALLBACK** — the containment that does not depend on hooks firing at all, so there
  is still a collision guard **if CP1 shows hooks are unreliable**.

**Done means:** each mitigation is either shipped (with its evidence) or explicitly declined with a reason;
none of them waits on CP1.

### CP4. ⬜ The broader SYNC AUDIT — coverage, timing and enforcement across all three sync surfaces (owner-requested, 2026-07-27)

**What it is.** The owner asked for the **U-analog for replication**: item **U** asked "what is hand-maintained
that should be generated?" across the docs; this asks the same shape of question about **everything this
project replicates** — what is actually covered, when it runs, and what enforces it. Three surfaces, and they
have never been audited against each other:

1. **The archive sync** (`sync.ps1` → the private archive) — freshly hardened at **V**, which is precisely why
   the audit is worth running now rather than later: one surface has just been examined closely and the other
   two have not.
2. **The main-site path** — the deploy, the **service-worker cache** (Protocol 1), and the in-app **cloud
   sync** (Protocol 34). Three replication mechanisms with three different failure modes, all user-visible.
3. **The museum → public exhibit publish** — the `--public` staging tree, the name-substitution guard, and
   the exposure step. **P13 is a live finding of exactly the class this audit is meant to enumerate** (a
   scan-list gap), which is the argument for doing the audit rather than fixing findings one at a time.

**The question for each:** what is covered, what is NOT, when does it run, and what would actually FAIL if it
silently stopped working? The recurring failure class this project already has on file — a guard that was
**inert for weeks**, a sync that reported "Done" while pushing nothing (**V**) — is the reason "it exists" is
not an answer.

**Done means:** a written per-surface coverage/timing/enforcement table with the gaps named, each gap either
fixed, queued with an ID, or explicitly accepted with a reason.

### CP5. ⬜ Laptop-witness inventory → then the deployment-topology decision (PROPOSED; CP1 partly depends on it)

**What it is.** A short, concrete inventory of the spare laptop before any decision about its role, because
the topology decision is unanswerable without it: **OS**; **uptime** (is it actually on?); **network relation
to the Ally**; **node / git present**; **GitHub auth scope**; **whether to clone the private archive onto it**
(⛔ the archive's git history retains `memory/` — this is a privacy decision, not a convenience one); **disk**;
and **willingness to place a read-only PAT** on it.

**⭐ The recommendation, recorded so the decision starts from it: begin with the laptop as an independent
WITNESS, not a controller.** A witness observes and reports (did the push land? is the archive current? did
the scheduled job fire?) and can be wrong without breaking anything. A controller that is wrong takes actions
on a repo. Witness-first also directly answers the failure that started this whole arc — **nobody was
watching** — at a fraction of the risk. Promotion to controller is a later, separately-argued decision.

**Done means:** the inventory is answered item by item, the archive-clone privacy call is made explicitly, and
the witness-vs-controller decision is recorded with its date and reasoning.

> **⛔ 2026-07-28 (late) addendum (Protocol 50 a-date):** the separate-trust-domain-for-unattended-jobs question
> folds in here as **DEFERRED, laptop-leaning** — not scheduled, revisit once unattended autonomy is in regular
> use; when built, prefer the spare laptop (this item) over a separate Windows account on the main PC, since it
> is a real machine boundary that also doubles as the rank-3 off-machine durability. The kernel program itself
> needs no separate trust domain today. See the CP program's build-order overlay above for the full reasoning.

**⭐ Concrete WITNESS design (folded 2026-07-30, multi-model round GPT-5.6 / Gemini 3.1 / DeepSeek) — this
is the "begin as a witness" recommendation above made CONCRETE, NOT a new item.** A tiny, zero-cost agent on
a **separate device** (the spare laptop, an old laptop, a Pi, or Termux on a phone) reachable over
**Tailscale**, reading only the **read-only `robco-evidence` MCP (MCP2)** and the **public git remote** —
never the control repo, never the ledger writer. Two independent checks, both pure advisory alarms that
**NEVER write the ledger and NEVER act**; the owner responds via the CPB5 CLI:

- **Ledger-head anchoring.** Every ~5 min (offset from the supervisor's tick so the two don't move
  together), recompute the ledger chain-head hash locally and keep `witness_state.json` (`last_chain_head`,
  `last_entry_id`, `consecutive_failures`). Alert — via a **separate Pushover token**, so a witness alarm is
  never confused with a supervisor alarm — if the chain **stalls** (head hash unchanged but no new entries
  when there should be), a query **fails**, or the head **changes unexpectedly**.
- **Second-opinion remote-SHA verify.** Independently `git ls-remote` the public remote and compare its SHA
  to the supervisor's last push-receipt SHA → **critical alert on mismatch** — the off-machine confirmation
  that a push the supervisor believes landed actually did.
  This directly answers the failure that started the whole arc — _nobody was watching_ — at near-zero cost and
  zero risk, because a witness can be wrong without breaking anything. Promotion from witness to controller
  stays a later, separately-argued decision, exactly as the recommendation above requires. **Reconciled, not
  duplicated:** this lives inside CP5 as its concrete design and does **not** get its own item ID.

---

# The Dispatch Return Bus — RB1-RB6 (new 2026-07-29, plan-only)

**New family prefix — CP1-CP5 are already assigned to specific work, so the next slice of the same kernel
program takes its own prefix rather than force-fitting into CP6+ (same reasoning as HG's own prefix note,
below).** Filed from a plan-only pressure-test of GPT's "Dispatch Return Bus" idea against the control
plane that actually exists — full design and reasoning in
[`planning/control-plane/DISPATCH_RETURN_BUS.md`](planning/control-plane/DISPATCH_RETURN_BUS.md).
**Nothing here is built.** All five items are ASSIST-tier, plan-stage — recorded so the recommended build
sequence has stable homes, not because any of them has started.

**The problem.** The supervisor can notify the OWNER (Pushover) and write a status file, but has no way to
inform or wake DISPATCH itself — the loop has only half. Three distinct capabilities are in play:
**DELIVERY** (put an event where Dispatch can read it), **WAKE** (start a Dispatch turn without the owner
prompting first), and **ACKNOWLEDGMENT** (the supervisor knows Dispatch actually processed the event).
RB1-RB4 close DELIVERY + ACKNOWLEDGMENT; RB5 is the only item aimed at WAKE, and WAKE is flagged
**BLOCKED BY PLATFORM** below. RB6 is a separate, smaller item pulled out of the RB5 design pass — it
reduces friction on the existing owner-is-the-wake fallback, it does not attempt WAKE itself.

### RB1. ⬜ Dispatch INBOX projection — read at turn start (plan-stage)

**What it is.** A derived delta off the existing ledger — ACTION-REQUIRED / ACTIVE /
COMPLETED-SINCE-LAST-ACK / CONTROL-PLANE-HEALTH — that Dispatch reads at the **start of every turn**,
after every launch, and before reporting completion. The recommended smallest useful thing even without
wake: without it, the owner's "yo" _is_ the wake; with it, Dispatch surfaces everything pending
automatically instead of the owner relaying each event by hand. Delivered as either a projected file or
(better, see RB4) the custom MCP.

**Done means:** the projection exists, derives cleanly from the ledger (not a second ledger), and a
session reading it at turn-start can enumerate pending events without the owner having relayed them.

### RB2. ⬜ Launch receipts + structured completion receipts (G1/G2) (plan-stage)

**What it is.** Cheap legibility for every job: a receipt at launch and a structured receipt at
completion, so a job's state is never inferred only from polling. Most of the _payload_ this needs already
exists (rank 1's job contract, rank 2's completion-evidence/exact-SHA publisher) — this item is the
receipt framing/format on top, not new detection machinery.

**Done means:** every job launched through the kernel produces a launch receipt and, on completion, a
structured completion receipt, both legible without re-deriving state from raw ledger events.

### RB3. ⭐ Mobile-hidden-response detector — G5 (plan-stage; mechanism specified 2026-07-30; **default flipped to ON/ARMED 2026-07-31**)

**What it is — a LIVE 24/7 WATCHER, not the supervisor's 5-minute poll.** A small persistent Node process
using `fs.watch` on the Dispatch conversation transcript/audit file. The moment Dispatch produces
substantive assistant TEXT that did **not** go through the messaging tool (the working-notes leak), it
fires a Pushover within **~1 second** — event-driven, instant, not batched into the next 5-minute pass.
Starred because it directly targets the recurring failure this whole program started from —
plain-text-invisible-on-mobile recurred 3+ times in one session before the arc that produced CP1-CP5.
**Owner context:** the owner has been manually re-reading working-notes on the Claude website to catch
these leaks himself; this watcher is what removes that need.

**It is a DETECTOR/alarm, not a blocker** — it pings, it cannot prevent the leak (there is no
`PreToolUse`-style hook for "hidden" plain text, only after-the-fact detection off the transcript).

**⭐ ON BY DEFAULT — ARMED, always-running while the machine is up (owner correction, 2026-07-31; this
REPLACES the earlier "off by default" spec).** The watcher process **starts with the machine and stays
armed** until an explicit **"watcher off"**; **"watcher on"** re-arms it. The footprint is trivial — an
idle `fs.watch` process runs at ~0% CPU, ~40MB resident — and **the leak it catches only happens while the
owner is using Dispatch, which is exactly when it must already be live.** That is the whole reversal:
**making the owner opt in to his own safety net was the wrong default**, because the moment he needs it is
the moment he has not thought about it.

**⛔ The auto-arm-off-transcript option was CONSIDERED and REJECTED (owner, 2026-07-31) — reliability over
cleverness.** The rejected design would have watched for transcript activity and armed/disarmed itself
automatically. It is not being built: **there is NO activity-detection gating.** A watcher that decides for
itself when it is needed has a failure mode where it is wrong precisely when it matters, and the thing it
would be optimising — a ~40MB idle process — is not worth a correctness risk. **Simple, always-covered,
always-on.** Recorded so it is not re-proposed as an obvious improvement.

**TOGGLEABLE FROM THE CPB5 OPERATOR CLI — INCLUDING REMOTELY, over Tailscale.** The mechanism is
deliberately boring and already proven: **the toggle is a STATE FILE the watcher polls each loop** — the
same shape as the supervisor's existing `state\DISABLE` kill-switch, which works today. The CLI and the
file both live **on the machine**, and **Tailscale just carries a shell to it** (Tailscale SSH) from the
owner's phone or laptop — so `watcher off` behaves **identically local or remote**, with no separate remote
code path to build, secure, or keep in sync. The eventual control-plane MCP (**RB4/MCP1**) would make it
one-tap, but **CLI-over-Tailscale works without it** and is not blocked on it.

**The existing 5-minute supervisor loop babysits it:** if the watcher process dies, the supervisor's next
pass raises an incident, so a silently-dead watcher doesn't leave a phone-invisible gap with no alarm
covering it. **That babysitting matters more now that the watcher is always-on** — an always-armed watcher
that silently died would otherwise read exactly like an always-armed watcher with nothing to report.

**Also recorded 2026-07-30 (a small control-plane note, no build needed) — the supervisor already has a
kill-switch, and it's already wired to trigger words.** "supervisor on" / "supervisor off" map onto the
existing `state\DISABLE` file: "off" creates it (instant stop — the supervisor's own loop checks for it
every pass), "on" removes it. **This works TODAY.** Recorded here because it sits right next to RB3's own
"watcher on"/"watcher off" pair, and a future session should not confuse the two or think either needs
building.

**Done means:** a deliberately-triggered hidden response (text emitted outside the messaging tool) is
detected and produces a phone alert within ~1 second, proven red-then-green, not just reasoned about; a
killed watcher process is caught by the supervisor's next 5-minute pass and raises its own incident;
**the watcher comes up ARMED on a machine restart with no one asking it to** (the default is proven by
reboot, not by reading the config); and **`watcher off` / `watcher on` flip it from the CPB5 CLI both
locally AND over a Tailscale shell**, with the remote path exercised rather than assumed — it is the same
state file either way, so proving one and reasoning about the other is exactly the shortcut this entry
should not take.

### RB4. ⬜ Custom control-plane MCP — delivery + ack, NOT wake (plan-stage; V1 contract folded in 2026-07-29; **deployment shape CORRECTED 2026-07-31**)

⛔ **CORRECTION (2026-07-31), verified against Anthropic's own docs — this entry used to say "a LOCAL MCP
server", and that was WRONG.** A Dispatch-callable connector **must be a REMOTE Streamable-HTTP endpoint
reachable from Anthropic's cloud** — Claude connects from its **cloud** infrastructure, not from this
machine. **Local stdio servers (`claude_desktop_config.json`) work in Claude Desktop but explicitly NOT in
Cowork / claude.ai**, so the bridge **cannot be a localhost process** and "add it to the desktop config and
Dispatch will see it" was never going to work. Sources: `support.claude.com/en/articles/11175166` ·
`/11725091` · `/14680753`.
**What that changes, and what it does not.** The **tools and their value are unchanged**; only the
**deployment shape** moves — but it moves a long way:

- **The corrected architecture:** Dispatch → **remote thin MCP front door** (typed intent relay) → **local
  AI-free supervisor** → **canonical local ledger + executor**. The remote piece is **disposable transport,
  never canonical truth.**
- ⭐ **Prefer the PC PULLING authenticated proposals OUTBOUND over exposing the supervisor through a public
  tunnel** — an outbound pull needs no inbound hole in the machine that holds every repo and secret here.
- **"Disposable" describes the INFRASTRUCTURE, not the DELIVERY** — a distinction that reads similarly and
  means the opposite operationally. Once the front door ACKs an intent it **must not vanish before the PC
  pulls it**: unacknowledged transport data needs **durability until supervisor ingestion**. Receipt chain:
  **`RECEIVED_BY_RELAY`** (transport only — never renders as "it will happen") → **`INGESTED_BY_SUPERVISOR`**
  (canonical locally) → **`ACCEPTED`/`REJECTED`** (the supervisor's own decision) → verified outcome.
  **At-least-once delivery + idempotency** so duplicate pulls are harmless. The relay's ACK grants
  **transport, never authority** — the supervisor still independently checks state, usage-admission,
  repo-ownership, nonce and expiry before executing.
- **Two more ceilings, and they bite the design:** remote connectors **lack resource subscriptions and
  sampling** (query-only — cannot push or stream to Dispatch) and **tool calls time out at 5 minutes**
  (cannot stay attached for a whole Code job). Together they force **submit → receipt → poll
  (`changes.since` / `job.result`)**, and they **reinforce the WAKE ceiling rather than relieving it.**
- **Constraint:** the remote front door stays inside the project's **free / ≤$10** rule — a minimal
  free-tier relay.

**What it is.** An MCP server exposing seven V1 tools: `control_get_inbox` / `control_get_job` / `control_get_event` /
`control_get_health` (DELIVERY as a live query, always current — better than a stale file projection),
`control_ack_event` (ACKNOWLEDGMENT — the piece a flat file cannot provide), `control_submit_intent`
(finally makes the Dispatch → supervisor direction real), and `control_get_intent_status` (poll-back so
intent submission isn't fire-and-forget). Everything `control_submit_intent` can request is a closed set
of **proposal-only verbs** (`REQUEST_RECONCILE` / `REQUEST_VERIFY_JOB` / `REQUEST_SUPERSEDE_PROPOSAL` /
`REQUEST_TERMINATION_PROPOSAL`) the supervisor evaluates and may refuse — never a direct command.
Idempotent via requestId + payload hash, generation-checked against stale state, atomic-file intake, a
stable closed error-code set, an RB1-flat-file availability fallback if the MCP is down, and version
banners on every response. **Hard limit, stated plainly: MCP is request→response — it makes the
supervisor QUERYABLE, not Dispatch WAKEABLE.** It is a thin reader over the canonical ledger/outbox plus
a writer of ack/intent events back to it — explicitly **not** a second ledger and **not** a second
orchestrator. Full V1 contract →
[`planning/control-plane/DISPATCH_RETURN_BUS.md`](planning/control-plane/DISPATCH_RETURN_BUS.md#rb4--custom-control-plane-mcp-v1-contract-gpt-design-folded-in-2026-07-29).

**Two corrections locked in against GPT's original design:** (a) the intake directory must be derived
through `lib/paths.js` under the control-plane state path, never a hand-built `%LOCALAPPDATA%` string —
that path can be silently virtualized by Windows for a packaged app (the MSIX-virtualization trap), so a
hand-built path can resolve to a different physical location than where the supervisor actually
reads/writes. (b) ⛔ **RETIRED 2026-07-31 — the prerequisite LOCAL load-spike is answered NO by the docs, so
there is nothing to run.** _(It read: "confirm Cowork actually loads a custom local MCP server and Dispatch
can call its tools — RB4's own first step.")_ Local stdio MCP does not work in Cowork at all, so the local
route is **ruled out, not unconfirmed**. **Replaced by a REMOTE front-door spike** — stand up a minimal
free-tier Streamable-HTTP endpoint, register it as a connector, confirm Dispatch can call one trivial
read-only tool. Same purpose (don't build seven tools on an unproven channel), different shape — and ⚠ it
carries a cost the local spike did not: **a public endpoint is an attack surface** on the machine holding
every repo and secret on this project, which is exactly why the outbound-pull shape is preferred. Also: GPT's proposed "fixed wake phrase" is **already** the locked `status` trigger
(don't add a second one, and don't reuse `sync` — already spoken for); GPT's "separate acknowledgment
classes" are **largely already** rank 5's incident lifecycle (open/updated/resolved/reopened) —
`control_ack_event` should map onto that existing model, not invent a parallel one.

**Done means:** the **remote** front-door spike confirms Dispatch can see and call the server's tools; all
seven tools round-trip correctly (including idempotent replay and generation-rejection); no second ledger or
parallel orchestrator is introduced; **an intent ACKed by the relay survives to supervisor ingestion**
(proven by killing the relay between ACK and pull, not reasoned about); and **the whole front door runs
inside the free/≤$10 rule**.

**⭐ BUILD SEQUENCE — SMALLEST SLICE FIRST (GPT, agreed 2026-07-31).** ⛔ **Do NOT build an MCP just to set
the effort tier** — that motivation is **gone** (effort is solved by the two-message pattern, SP2), and
building a remote connector to deliver a capability that already works locally is the most expensive
possible way to buy nothing. **When the channel reaches its own scheduled point:** **(i) `robco-control`**,
exactly five tools — **`state.snapshot`**, **`changes.since`**, **`proposal.submit`**, **`proposal.status`**,
**`job.result`** — a set chosen to fit the platform's shape rather than fight it, since submit + poll **is**
the pattern the 5-minute timeout and missing subscriptions force; then **(ii) `robco-evidence`**,
**read-only** — `context.resolve`, `evidence.search`, `reference.trace` — second on purpose, because it adds
retrieval value with **no new authority**. **Effort becomes an atomic field in the `session.launch` envelope
eventually — polish, not a blocker, and explicitly not a reason to pull this item forward.**

### RB5. ⚠️ Bounded `send_message` WAKE spike — BLOCKED BY PLATFORM (plan-only; owner approval required before running; bounded protocol folded in 2026-07-29)

**What it is.** One disposable, read-only relay session sends a single nonce-tagged message into this
Dispatch conversation (the owner posts the anchor nonce into the conversation first, so the spike can
prove it hit the right target), followed by a 5-minute hands-off observation window — no owner action —
to see whether the message alone starts a turn. **Strict PASS requires all four:** the nonce appears in
this conversation; it starts a turn with zero owner prompting; it's phone-visible; and it's deduped (no
second turn from a duplicate send). A failure is classified, not just logged: `DELIVERY_ONLY` /
`WAKE_DESKTOP_ONLY` / `WRONG_SURFACE` / `AMBIGUOUS_TARGET` / `UNSAFE_TRANSPORT` / `NO_DELIVERY` /
`DUPLICATE_DELIVERY`. Reject the approach outright — don't work around it — if it needs an
auth/attestation bypass. Full spike protocol →
[`planning/control-plane/DISPATCH_RETURN_BUS.md`](planning/control-plane/DISPATCH_RETURN_BUS.md#rb5--send_message-wake-spike-bounded-design-gpt-design-folded-in-2026-07-29).

**⚠ Flagged BLOCKED BY PLATFORM, not merely unstarted.** No documented way exists today for a local
process to inject a turn into the persistent Cowork/Dispatch conversation — this is the one gap in the
whole return-bus design that genuinely waits on Anthropic shipping a native capability, not on more design
or code here. **Even a clean pass proves only session→Dispatch wake, never AI-free supervisor→Dispatch
wake** — the supervisor has no MCP access, so it would still need to spawn a relay session, reintroducing
AI + usage cost into the AI-free control root; AI-free supervisor→Dispatch wake stays BLOCKED BY PLATFORM
regardless of this spike's outcome. RB1-RB4 do not depend on this landing; the documented fallback
(**inbox + Pushover = the owner is the wake**) is honest, functional, and already achievable through RB1
alone.

**Done means:** the spike either runs (owner approval given) and its pass/fail is recorded with evidence
and a named classification if it failed, or the item stays parked exactly as BLOCKED BY PLATFORM until a
native wake capability is confirmed to exist.

### RB6. ⬜ Pushover → Dispatch Android deep-link (near-term, plan-stage, new 2026-07-29)

**What it is.** A small, separate, buildable-now item pulled out of the RB5 design pass: give the
Pushover notification an Android deep-link tap target straight into the Dispatch conversation, so the
owner's tap **is** the wake instead of notification-then-hunt-for-the-app. Doesn't touch the AI-free-wake
question — the owner is still the human triggering it — it just removes friction from the existing RB1
fallback (**inbox + Pushover = the owner is the wake**). Open question is Android-specific deep-link
routing (Cowork/Dispatch's actual URI scheme or app-link behavior on Android) — the Pushover side already
works.

**Done means:** tapping the Pushover notification on Android opens directly into the Dispatch
conversation, verified on an actual Android device/routing (not assumed from iOS/desktop).

---

# ⭐ MCP ARCHITECTURE — external review synthesis (GPT-5.6 + Gemini 3.1, new 2026-07-30)

**New family prefix — RB1-RB6 already own the return-bus specifics, so this next slice takes its own
prefix rather than force-fitting into RB7+ (same reasoning as HG's and RB's own prefix notes above).**
Two independent MCP-review passes — GPT-5.6 and Gemini 3.1 — were run 2026-07-30 against **RB4**'s
existing design and converged, independently, on the same end-state. **End-state: TWO MCP servers, not
six.** This section hardens RB4 into its V2 shape (**MCP1**) and adds one genuinely new read-only server
(**MCP2**). Nothing here is built — same plan-only status as the RB family it extends.

**Standing invariant on BOTH servers, stated once here because it governs every tool family below:** zero
MCP-owned truth, zero MCP executors. All mutations are typed/enumerated proposals the supervisor validates
and appends — **the MCP server never writes the ledger directly.** This is the same trust boundary RB4
already drew for `control_submit_intent`'s proposal-only verbs, now stated as the rule for the whole MCP
surface, not just that one tool.

### MCP1. ⬜ `robco-control` — harden RB4 into its V2 proposal/ack contract (refines RB4, folds in usage/telemetry)

⛔ **Inherits RB4's 2026-07-31 deployment correction in full: this is a REMOTE Streamable-HTTP connector, not
a local server** (local stdio MCP does not work in Cowork/claude.ai), with the disposable-but-durable relay
and its four-state receipt chain, outbound-pull preference, and the free/≤$10 constraint. **⭐ MCP1's first
five ops ARE the agreed smallest first slice** — `state.snapshot`, `changes.since`, `proposal.submit`,
`proposal.status`, `job.result` — so this item, not RB4's seven-tool V1, is the shape to build when the
channel reaches its scheduled point. **And it is NOT pulled forward for effort:** that motivation is gone
(SP2's two-message pattern).

**What it is.** Not a replacement for RB4 above — a hardening pass on its ops shape. Six op families:
`state.snapshot`; `changes.since(cursor)` (a cheap polling delta, not a full snapshot every poll);
`events.list`; `event.ack_receipt` (= "Dispatch saw it," explicitly **not** "resolved" — narrower than
RB4's `control_ack_event` text reads today; tighten that wording when RB4 is actually built);
`proposal.validate` / `proposal.submit` / `proposal.status` (idempotency keys — the same idempotent-replay
requirement RB4 already specified); `job.result`.

**Usage/telemetry folds in here — do NOT build a separate telemetry server.** `usage.snapshot` /
`budget_status` / `burn_rate` and `health.components` are decision-shaped queries over this same op
surface, and directly unblock **CPB1** (the budget alert) and **CPB2** (usage → operating-modes) once MCP1
exists — both currently have no query surface to read from. Route verbose OpenTelemetry output to a log
file instead; the MCP surface exposes only the decision-shaped summaries, never raw spans.

**Done means:** RB4's seven tools are re-specified under this six-op-family shape with the tightened
`event.ack_receipt` semantics; usage/budget queries are reachable through MCP1 with no second server;
RB4's own done-criteria (load-spike, idempotent replay, generation-rejection, no second
ledger/orchestrator) still hold.

**Code-session conveniences — NOT control-plane, do not build under MCP1/2:** the git-bisect runner and
the AST inspector. Repositioned here (owner call, 2026-07-30) to sit immediately after `robco-control` —
control-plane-**adjacent** priority — rather than in the low-priority tail under MCP2's tool-family list
below, where the original review synthesis had filed them.

### MCP2. ⬜ `robco-evidence` — NEW read-only server (the active-graph-retrieval #1 win)

⛔ **Also REMOTE, inheriting RB4's 2026-07-31 correction.** **⭐ Sequenced SECOND, deliberately** (GPT,
agreed 2026-07-31): `robco-control`'s five-op slice lands first, then this — read-only second because it
adds retrieval value with **no new authority**, which is the right order to grow a channel that reaches into
this machine.

**What it is.** A second, read-only MCP server: `context.resolve(changed_paths)`, `evidence.search`,
`reference.trace`. Every result is derived from real files + git SHAs and carries repo/path + SHA +
excerpt + why-selected edge + a freshness/stale flag — never a synthesized or AI-curated answer standing
in for the source. One extraction pipeline is meant to feed three consumers at once: the museum's Visual
Web (**P11/P15**), the dangling-reference audit, and general session context-loading.

**Explicitly rejected: an AI-curated WRITABLE graph** (Gemini's official MCP `memory`-server route) — it
becomes a second brain / second source of truth, exactly the anti-pattern Protocol 51(b) already names
("memory is a locator, not evidence"). **Deterministic search first; no embeddings/vectors until plain
retrieval demonstrably fails** — the fancier mechanism doesn't get reached for before the cheap one is
shown insufficient.

**Acceptance test, stated brutally on purpose:** run MCP2 retrospectively against recent completed jobs —
does it actually surface the governing docs/edges those sessions needed? **If it's just prettier search,
kill it** — a real go/no-go bar, not a formality to wave through.

**Done means:** the retrospective acceptance test runs against real completed jobs (not synthetic ones)
and clears the "would have surfaced the governing evidence" bar; every result carries repo/path + SHA +
excerpt + why-selected edge + freshness flag; no writable/AI-curated graph is introduced.

**Convergent hard rules — both reviews independently landed on these; they apply across the whole control
plane, not just MCP1/MCP2:**

- Supervisor is the SOLE ledger-writer (the standing invariant above, restated as an operational rule):
  MCP submits an atomic envelope to a supervisor-owned intake; supervisor validates + appends. A stale
  expected-state is a **conflict**, not a best-effort overwrite.
- Proposals are enumerated job-kinds only — never a shell string, arbitrary path, or executable.
- Name-scrub is a **mandatory** publish gate, never an AI-callable tool — "if the agent chooses whether to
  run it, it's optional" is disqualifying by itself.
- Fallout game data ships as a **pinned snapshot** (page revision + SHA/hash), never a live wiki query —
  kills the "canonical live oracle" framing outright, and stays consistent with Protocol 3's existing
  source-of-truth rule. Any fetched wiki text is treated as untrusted data, never instructions.
- The test/gate stays a CLI, authoritative with no model present — MCP only passes through its
  **structured (JSON)** report, never a second implementation that parses stdout.
- **Museum MCP is KILLED as a server, full stop.** Regen is a deterministic CLI/supervisor job; arc/context
  queries route through **MCP2**; scrubbing routes through the gate. No `museum.publish()` escape hatch —
  cross-reference **P15**, whose museum work routes through MCP2 rather than any museum-owned server.

**New tool-families worth building later, as families under MCP1/MCP2 — not as new servers:**

- **Completion receipt (the highest-value new idea).** A finishing session submits its claimed outcome +
  exact SHA + gate IDs + diff/result manifest to MCP1; the supervisor **independently verifies** the SHA +
  evidence before it's believed. Directly closes the "the session said it finished = truth" gap Protocol
  8's own audit stage already exists to catch by hand — this would make that verification queryable
  instead of manual.
- **Why-blocked.** Returns the exact failed mechanical predicate, not an inferred reason.
- **Release proof chain.** Given a SHA → job contract → session receipt → gate report → artifact hashes →
  publisher result, chained and queryable.
- **Reference-graph lint** (the "radroach scan"). Dead refs, renamed targets, orphaned guards, unrouted
  skills, claims whose evidence vanished — serves both the museum thesis and the dangling-reference audit
  directly; lives under MCP2.

**Practice note, filed alongside rather than as its own item.** A session should call its scheduling tool
as a **fallback** whenever it parks on long background work — a partial patch for the
notification-doesn't-fire gap. This informs the return-bus WAKE design (**RB5**): it is a host-supported
**self-timer**, not an external doorbell for an already-dormant session. RB5's own BLOCKED BY PLATFORM
status is unchanged by this — the two are different mechanisms.

**⚠ Verify-before-building, flagged explicitly rather than assumed.** Gemini's review is built on a
claimed "2026-07-28 MCP spec" with specific named mechanics (MRTR/SEP-2322, Tasks/SEP-2663,
statelessness/SEP-2567+2575, MCP Apps/SEP-1865, list-caching/SEP-2549) that are **UNVERIFIED on our
side** — confirm each against the live spec before designing around any of them. GPT's architecture
depends on **none** of them, so it is the backbone; Gemini's spec-specific mechanics are additive-only,
never load-bearing, until independently confirmed.

**Ruled out, both reviews agreeing:** `ntfy.sh` (Pushover already covers phone alerts — **RB6** already
covers the deep-link friction reduction); the official filesystem + sequential-thinking MCP servers (Code
sessions already have file+git tools — marginal value).

**Done means (section-level):** MCP1 and MCP2 are both specified to the point RB4 was before it could be
built, and this pass gets them there; the museum-MCP kill and the pinned-wiki-snapshot rule are reflected
wherever P15/game-data work is next touched; the "verify before building" flag is resolved (confirmed or
refuted against the live spec) before any Gemini-specific mechanic is designed around.

---

# ⭐ WIDE ROUND-2 BRAINSTORM — narrowed net-new survivors (Gemini 3.1 + GPT-5.6, folded 2026-07-30)

**New family prefix `WB`, per this file's own rule (single letters exhausted; new work takes a family
prefix).** Two independent models each ran a WIDE round-2 brainstorm over the whole RobCo system (control
plane, dev/orchestration loop, museum, app, and their connections). This section is the **narrowed** result —
the firehose ground against what is actually built, cross-model-deduped, and curated. **The raw lists are NOT
folded in; only the invariant-respecting net-new survivors are.** What the pass ruled out is recorded in the
fold's report, not here: most of both lists was **already covered** (the CP kernel CPK1-5, the return bus
RB1-6, the MCP synthesis MCP1/2, the museum program, the doctrine block) or **rejected** (all-caps terminal
mode = token waste; AI "state-the-rule-you-fulfill" self-justification; live wiki-radio-as-oracle — pinned
snapshots only per MCP2 + Protocol 3). **Everything here is PLAN-STAGE — nothing is built, no owner build-go
except where an item maps to already-approved doctrine.** Standing invariants apply unchanged: zero MCP-owned
truth, zero MCP executors, supervisor is sole ledger-writer, AI-is-a-typist-not-authority, pinned/reproducible
data, private-archive/public-museum boundary.

### WB1. 🔄 IN PROGRESS — v0.1 (the foundational slice) SHIPPED 2026-07-31, control repo `d36ad1d` — Universal provenance spine + one evidence envelope (the composability backbone)

**What it is.** GPT's single highest-leverage pick, which Gemini's "correlation spine" independently landed on
too: **one lineage ID** threaded across contract → session → receipt → gate → ledger → backup → release →
app-build → museum arc, plus **one evidence-envelope schema** (source SHA, artifact hashes, producer, job id,
timestamps, sensitivity, verification state) that every record carries. **Adds no executor and no new source of
truth** — it makes the records that already exist _composable_, so completion-verification, release proofs,
incident replay, museum generation, backup certification, diagnostics intake, and mobile summaries all become
**joins over known records** instead of bespoke code each. Partially seeded already (CPK1's job id/nonce, RB2's
receipts, MCP1's evidence surface) — **this item is the explicit unification, not new machinery.** Environment
capture (Node/git/browser/OS per receipt) rides the same envelope rather than being its own item.

**Done means:** a single documented lineage-ID + envelope schema that CPK1/RB2/MCP1 all reference; at least one
real cross-surface join (e.g. release → job → session → gate) demonstrated over live records; no second ledger
or parallel identifier scheme introduced.

**── v0.1 SHIPPED RECORD (2026-07-31, control repo `d36ad1d`) — a FOUNDATIONAL SLICE, NOT THE WHOLE ITEM ──**

⚠ **This does NOT close WB1.** The schema, the append path and the highest-value producers are done; several
producers are deliberately not threaded and are listed by name below. Read the two lists, not the SHA.

**The one design decision everything else follows from.** The lineage id is **DERIVED, not assigned** —
`lin_ + sha256(<rootKind>:<rootId>).slice(0,16)` over the first root a record carries, precedence
**`jobId` > `pushId` > `sessionId`** (a push performed _by_ a job belongs to the job's arc). Two
consequences, and the second is why this was the right shape: two records naming the same root compute the
same id independently, and **a record written before WB1 existed still carries its root, so its lineage is
computed at READ TIME.** Every pre-existing record joins with **no migration and no backfill** — which is
not a convenience, it is a necessity: the ledger is append-only, so a backfill was never available. Stamping
new records is therefore a convenience and an audit aid, **never an authority** — exactly what "derived,
never a second source of truth" has to mean in practice.

**⛔ `runId` is deliberately NOT a lineage root** (nor `idempotencyKey`/`nonce`/`key`). It is the
supervisor's **tick** id — a _batch_ correlation, not a provenance arc. Rooting on it would sweep every
unrelated finding, incident and observation from the same five-minute tick into one "lineage" and make the
spine **actively misleading** rather than merely incomplete. Recorded as a decision, guarded by test
`WB1-R2`: a tick record resolves to no lineage at all, while a real work arc still resolves.

**The envelope:** `{envelopeVersion, producer{name,version}, jobId, sourceSha, artifacts[{path,sha256,bytes}],
timestamps{producedAt,observedAt}, sensitivity, verification{state,by,at,detail}}` — every field the spec
names. It fails safe in **both** directions: `sensitivity` defaults to **`private`** (these records carry the
owner's absolute paths, so `public` must be stated deliberately) and an unrecognised `verification.state`
degrades to `UNKNOWN`, never to a trusted state. **`verification.state` reuses CPB5 v0.1's shipped epistemic
vocabulary rather than forking a second set of words for the same idea** (Protocol 22); test `WB1-V` turns
the gate red if the two ever diverge.

**THREADED NOW (3 producers + the append path):**

- **`lib/ledger.js` `appendMany`** — stamps **every** appended record at ONE point rather than each producer
  remembering to. Purely additive (adds `lineageId`, changes nothing else) and **fail-open by contract**: a
  decoration must never be able to block a ledger write.
- **`controlled-push.js`** — `push.intent` / `push.result` / `push.completion` carry envelopes. The
  verification state is **not asserted here**: it comes from the arbiter that already owns the question
  (`lib/completion-evidence.js`) and from whether the independent `ls-remote` re-read matched — so an intent
  is `CLAIMED` and a satisfied completion bundle is `VERIFIED`.
- **`lib/job-contract.js`** — `job.intent` / `job.result` carry envelopes; `job.result`'s state is derived
  from whether an independent `observed` re-read was recorded, **not** from the caller's own outcome string.
  `job.transition` deliberately gets **no** envelope — a lifecycle transition carries no evidence, so the
  spec's "where applicable" clause is applied rather than ignored.
- **GATE RESULTS are covered without a new record type.** They are not standalone records in this build —
  they ride inside `push.intent.gateResult` / `push.completion.gate` — so the join **surfaces them from
  inside the push records** rather than inventing a second place the gate outcome lives (Protocol 22).
  Recorded as a deliberate reading of the brief, not an omission.
  ✅ **OWNER-CONFIRMED (2026-07-31) — the divergence is RESOLVED as approved-as-is.** The WB1 v0.1 record
  flagged this as an open question (offering to make gate results first-class standalone records if the
  owner preferred). The owner's ruling: **gate results stay as FIELDS inside the push records; they are
  NOT promoted to standalone records.** Protocol 22 — a second home for the same fact is the duplication
  the rule exists to prevent. This is now a decision on file, not a pending judgement call, so a future
  session should not re-litigate it or "fix" it by emitting a `gate.result` type.

**DEFERRED — named, not implied (the explicit follow-on list):** incident transitions (`incident.transition`);
the CPB5 action records (`action.submitted` / `action.result` / `action.postcondition`); **`session.observed`
(~15k records in the live ledger — an envelope there would bloat it for nothing, so lineage-only is the right
call and the envelope is the open question)**; the backup/mirror records; usage records; reap records;
housekeeping records. **Also deferred, and it is a real limit:** a push does not yet name the **session** that
made it, so a push arc is push-scoped today. The contract → session → receipt chain the spec describes needs
that binding, and the binding needs the launcher — **CPB9**, which has no owner go.

**── PLANNED EXTENSION — an `effort` FIELD ON THE ENVELOPE (folded 2026-07-31; DESIGN, NOT BUILT) ──**

**Every job's record should carry the effort tier it ran at.** Per-session effort control stopped being
hypothetical on 2026-07-31 (**SP2** mechanism (1) confirmed —
`planning/control-plane/EFFORT_CONTROL_SPIKE.md`), and CPB2's new **effort ceiling** means the admission gate
will deliberately **cap** requested tiers. The envelope is where that belongs: it is already the one place a
record says who produced it, from what source, and how well-verified it is — the tier is the same kind of fact,
and giving it its own home elsewhere is the duplication Protocol 22 exists to stop.

**Proposed shape — `effort: {requested, applied, state}`, and the three fields are not padding:**

- **`requested` and `applied` are SEPARATE because the gate makes them diverge on purpose.** Once admission
  can cap a tier (CPB2's EFFORT DIMENSION), "asked for Max, ran at High" is the **normal** case, not an
  anomaly. One field would force a choice between recording the intent and recording the truth; the arithmetic
  needs the truth and the audit needs both.
- **`state` reuses the shipped CPB5 v0.1 vocabulary** — `CLAIMED` / `VERIFIED` / `UNOBSERVABLE` — exactly as
  `verification.state` already does, and for the identical reason: **a tier the launcher merely asked for is
  not evidence the job ran at it** (CPB9's requirement). ⚠ **It is deliberately its OWN state, not the
  envelope's `verification.state`** — those answer different questions (_is this artifact's provenance
  verified?_ vs _is this tier's application verified?_) and collapsing them would let a well-verified push
  silently vouch for an unverified tier.
- **Additive and fail-safe, like every WB1 field.** Absent `effort` is **not** an error and must never be —
  the 60k+ records already in the append-only ledger have none and never will, and an unrecognised tier
  degrades to `UNOBSERVABLE`, never to an asserted one.

**Scope: job-bearing records only.** It rides `job.intent` / `job.result` (and whatever CPB9 writes) — **not**
`session.observed`, for the same bloat reason already recorded above, and not `job.transition`, which carries
no evidence.

**⛔ BUILD-TIME REQUIREMENT, carried forward because it is exactly the kind of thing that gets forgotten
once:** re-prove the new field names against `lib/backup-mirror.js`'s **fail-closed** secret scanner
(`WB1-S`'s red-then-green, not inspection). None of `effort`/`requested`/`applied`/`state` matches its
`secret`/`apiKey`/`password`/`privateKey`/`accessToken` list — but v0.1 proved that against the **real**
scanner rather than by eye, and a field added later deserves the same treatment. A mismatch there silently
aborts the **entire** off-machine backup, permanently, on a path nothing else tests.

**Blocked on a producer, not on a decision:** nothing writes a tier today, because nothing launches jobs with
one — that is **CPB9**, which has no owner go. Same dependency, and the same honest reason, as the
session-binding limit above.

**Proven, not asserted.** Against the machine's own live ledger, read-only: **62,670 real records, 118
lineages, 33 push arcs**, and a sample arc joined `push.intent + push.result + push.completion` with
**stamped 0, derived 3** — all three written before this code existed. Then, after shipping, the push that
carried WB1 itself wrote an arc with **stamped 3, derived 0**, carrying producer `controlled-push`, the real
source SHA, the real gate result (`exitCode 0`), and verification `CLAIMED → VERIFIED → VERIFIED`. **The live
ledger now holds both kinds and parses cleanly (62,740 records, not degraded)** — which is the migration
story, since append-only means it will hold both forever.

**A real hazard caught before it could bite.** `lib/backup-mirror.js`'s **fail-closed** secret scanner aborts
the **entire** off-machine backup if any mirrored file has a JSON key named `secret` / `apiKey` / `password` /
`privateKey` / `accessToken`. An envelope field with any of those names would have silently broken the daily
backup for good, on a path nothing else tests. None of the chosen names match, and `WB1-S` proves it against
the **real** scanner with a red-then-green rather than by inspection.

**Verified:** test group **WB1** — schema validity and fail-safe defaults; additivity proven field-by-field;
fail-open against hostile input; backward compatibility against **real pre-WB1 records captured verbatim from
the live ledger**; every existing reader re-run over stamped records; the replay snapshot byte-identical with
and without stamps; the join over unstamped records, over a **mixed** arc, and cross-producer; the
**no-new-write-path** guard (which also freezes the set of files permitted to write the ledger); and an
end-to-end append/read/join through the real sandboxed ledger. Full control suite green, **nothing regressed**
in the CP / PG / PH / SP / WS / WSI / CLI groups that already exercise this append path. Pushed through the
wrapper with its own real gate (`gate: PASSED`, exitCode 0).

### WB2. ⬜ Machine-readable guard registry

**What it is.** Turn Protocol 36b/49's per-guard _prose_ obligations (the real incident, the enforcement point,
the false-positive analysis, the marginal cost, the retirement condition) into **one structured, queryable
registry** — each guard = {failure class, enforcement point, test id, owner, retirement condition}. Makes the
escape-ratchet / retirement discipline **auditable** instead of scattered narrative, and directly feeds the
why-blocked query (MCP1) and the museum's failure→lesson→rule→guard→test genealogy (MCP2). A **read-model over
rules that already exist** — no executor, no new authority; the prose in `CLAUDE.md`/`rules/` stays canonical.

**Folds in ruling A (APPROVED in constrained form, 2026-07-30) — a GENERATED invariant index.** The CP
doctrine's executable invariants get a machine-read index _inside this registry_, **NOT as a standalone item**:
each invariant entry must **point to the concrete thing that enforces it** (a test id, a WB2 guard row, or a
protocol section) and be **generated FROM those enforcement points** — so retiring a guard removes its entry
automatically, and it can never claim protection that isn't enforced. **Explicitly never a hand-authored
authoritative file that tools check against** (that is the second-source-of-truth trap ST-WB-A was declined in
its standalone form for). The former **ST-WB-A is removed from the Stretch bucket** accordingly.

**Done means:** every active gate/suite guard has a registry row with those five fields; a stale row (guard
deleted but registry entry survives, or vice-versa) is detectable; the registry is generated/checked, never
hand-synced (the Protocol 2a failure mode is not reintroduced); the generated invariant index points every
invariant at its real enforcement point and never outlives it.

### WB3. ⬜ Machine-readiness preflight (the unattended-launch gate)

**What it is.** Before an **unattended** launch, a deterministic AI-free check: required tools present, disk
space, creds reachable, worktree clean, backups fresh, network up, scheduler healthy. This is the concrete
implementation of the CP doctrine already on file — _"an unattended launch lacking fresh prerequisites does not
launch."_ Fail **CLOSED** for automation; **report-and-continue** for the owner's own path (the doctrine's
asymmetry). Composes with WB1's envelope (the preflight result is evidence).

**Done means:** an unattended launch with a failed prerequisite is refused with a named reason, logged, and
Pushover'd; the owner's interactive path is never blocked by it; the check runs with no model in the loop.

### WB4. ⬜ Off-machine recovery kit — its OWN private bootstrap/recovery repo (restructured 2026-07-30)

**What it is.** The recovery kit becomes its **OWN small PRIVATE "bootstrap/recovery" repo on GitHub** —
runbook, manifests, restore-and-verify scripts, and **pointers to _where_ secrets live (never the secrets
themselves)** — mirrored into the off-machine backup. Still merges GPT's portable-recovery-kit + Gemini's
".holotape" export + GPT's printed QR card, but the structure changes: **because it's GitHub-hosted, the
owner's phone can pull the runbook even when the primary machine is dead** — the exact disaster case an
on-machine kit cannot cover. Rank-3 durability (CPK3, shipped) mirrors the running ledger; **this covers the
bootstrap-from-nothing recipe and the human runbook** — the half rank-3 does not. Directly serves the Protocol
48 machine-loss fear.
The **printed QR disaster card drops to a thin last-resort tail** — optional, for the no-digital-access case
only — and is **ALSO viewable from the CLI/cockpit via `robco recover`** (CPB5). So the runbook is reachable
three ways: the GitHub repo (phone, machine-dead case), the CLI/cockpit (`robco recover`), and the printed card
(no-digital-access fallback).

**Done means:** the private bootstrap/recovery repo restores into a clean temp machine/dir following only its
runbook, with no access to this conversation or the live machine; the phone can pull the runbook from GitHub
with the primary machine down; the restore is periodically test-run (rides CPK3's restore-test cadence);
**secrets are never in the repo** — only pointers to where they live (consistent with OD2); the printed card is
a last-resort tail, mirrored by `robco recover`.

### WB5. ⬜ App build fingerprint + PWA self-verification

**What it is.** Embed **build SHA / data-pack rev / schema version / release id** into the shipped app, and let
a dev-mode PWA **hash itself against the published exact-SHA** publisher record (CPK2). Gives the app side a
real provenance anchor: the running site can prove which exact commit it is, which feeds release-proof and the
museum's release manifest. **App-surface change** — when built it routes through the normal app gate + cache
bump (Protocol 1), unlike the control-plane-repo WB items.

**Done means:** the app exposes its build fingerprint; a self-hash check can confirm-or-flag drift from the
published SHA; the fingerprint is what the museum/release-proof reads, not a hand-maintained version string.

### WB6. 🔄 IN PROGRESS — v0.1 SHIPPED 2026-07-31, control repo `79e8fea` — Ledger integrity hardening: hash-chained records + content-addressed evidence

**What it is.** Make the append-only ledger **tamper-evident** — each record chains the prior record's hash —
and store bulky evidence **by content hash**. Strengthens the replay/verify that already exists
(`reconcile.js --verify-replay`) from "reconstructable" to "tamper-evident + integrity-checkable." Supervisor
stays **sole writer**; this is pure integrity, no new authority and no executor.

**Done means:** a mutated/truncated ledger record is detected by chain verification; evidence is addressable by
hash and deduped; `--verify-replay` gains the chain check without changing who may write.

**── v0.1 SHIPPED RECORD (2026-07-31, control repo `79e8fea`) — all three "done means" clauses MET; the
follow-on list below is real and named ──**

**The finding that shaped the build: the check that already existed could not see the thing it was named
for.** `--verify-replay` compared a full replay against `snapshot.json` — but `replay()` only reads the
fields its reducer knows (`reconcile.completed`, `session.observed`, `finding.*`, `adapter.probe`,
`job.*`). Edit anything else — a push's repo path, a gate's exit code, an incident's detail — and the
snapshot **still matched perfectly**. That exact case is now test `WB6-VR`: the record it mutates is one
replay never reads, the snapshot check reports `match: true`, and the chain catches it and the command
exits non-zero. That is the "reconstructable → tamper-evident" upgrade stated as a proof rather than a
claim.

**The chain.** Every record appended from WB6 forward carries
`chain: {v, algo, seq, prev, self}`, where `self` = sha256 of the record's **canonical form with
`chain.self` removed** — so **everything else is covered**, including WB1's `lineageId` and the chain's
own `seq`/`prev` — and `prev` is the previous chained record's `self`. The four attacks read **differently
on purpose**, because conflating them would lose which one happened: an **edit** breaks that record's own
hash and names it exactly (sequence, type, file, line); a **deletion** breaks the _following_ record's
`prev` and leaves a permanent sequence gap; a **reorder** breaks the links although every individual hash
is still valid; a **front truncation** breaks the genesis rule.

**The canonical form is the load-bearing part, and it is pinned.** Sorted keys, no whitespace, arrays in
order, and the **JSON round trip is a fixed point** — non-finite numbers, an `undefined` object value, an
`undefined` array element, `-0` and a `Date` all canonicalise to what they will actually be on disk — so a
hash computed _before_ the write still matches the record read back _from_ disk. Nothing ambient is
consulted: hashing the same record twice with the wall clock deliberately moved in between gives the same
digest. It is pinned by a **known-answer digest** (`WB6-C2`), not a hand-synced value: silently changing
canonicalisation would orphan every hash already written and make the whole ledger read as tampered.

**Truncation needed a witness, and the witness is deliberately weak.** A truncated chain is a perfectly
valid **prefix** — it verifies against itself — so nothing inside the ledger can reveal a chopped tail.
`state/chain-head.json` records the high-water mark, advance-only. It is a **witness, never an authority**:
`prev` always comes from the ledger itself (no second source of truth), and the witness supplies only the
sequence **floor**. Absent or unparsable → truncation reports **UNOBSERVABLE**, never "fine" (this repo's
never-fabricate-the-unobservable invariant). **A sequence number is never reused**: after a truncation the
next append continues past the old high-water mark, so the missing span becomes a permanent gap **inside
the append-only record** rather than a comparison that quietly stops being true once appends catch back
up. It is the one `state/` file **added to the off-machine mirror** — a witness the local machine can
rewrite at will is only half a witness.

**Additive exactly like WB1, and proven the same way.** The **63,696** records written before WB6 carry no
chain, still parse, still replay **byte-identically**, and every existing reader still reads them. They
are reported as `unchained` **coverage** — never as breaks, and never counted as verified. That is not a
convenience: the ledger is append-only, so a backfill was never available, and an "ok" that hid how much
it had actually checked would be a false assurance. **The two slices STACK at the ONE append point** —
WB1 stamps lineage, then WB6 hashes the record _including that stamp_, so rewriting which work arc a
record belongs to is itself now detectable (`WB6-WB1`). The one place WB6 deliberately differs from WB1:
a producer-supplied `lineageId` is **respected** (a producer legitimately knows its arc) while a
producer-supplied `chain` is **overwritten** (only the append path can know a position in history).

**It degrades rather than accuses.** A record from a newer chain version is `unverifiable`, never tampered
— the same read-only-degrade rule the ledger already applies to `schemaVersion` — with its declared link
still followed so continuity is still checked. A degraded ledger read verifies nothing and says so. An
unchained record inside the chained era is reported **by identity** but is not a break (the append path is
fail-open, so a decoration failure legitimately produces one). **None of those raise an alarm** — a tamper
alarm that fires for non-tampering is one the owner stops reading.

**Who raises it.** The verifier is pure, writes nothing, and **does not import the ledger module at all**.
On a detected break the **supervisor** appends a `ledger-integrity` incident — proven by a real sandboxed
supervisor run (`WB6-RAISE`), with the healthy tick before it raising nothing. Cooldown is **Infinity**
with the subject **fingerprinting the specific damage** (kind + sequence): an altered append-only record
cannot be "fixed", so a 6-hourly reminder would be a permanent buzz about something the owner can do
nothing about, while a genuinely NEW tamper is a new subject and does alert.

**Content-addressing, with one REAL producer threaded.** `lib/content-store.js` files bulky evidence under
its own sha256 (`state/content/<aa>/<sha256>`); dedupe and immutability are **structural**, and a read
**verifies the bytes against the address they were filed under** and refuses content that no longer hashes
to its own name. The reference shape is `{sha256, bytes}` — **WB1's envelope artifact shape, not a second
one** (Protocol 22). Threaded producer: `controlled-push.js`'s `runGate`, whose FULL stdout/stderr was
previously truncated to a 40-line tail and **thrown away**; the tails are unchanged, so every existing
reader is untouched.

**A hazard caught before it could bite, the same class WB1 found.** `lib/backup-mirror.js`'s **fail-closed**
secret scanner aborts the ENTIRE off-machine backup on one hit. Two exposures here: the new field names,
and the fact that every record now carries **64-character hex digests**. `WB6-S` proves both clean against
the **real** scanner with a red-then-green. And it is why the content store is **deliberately NOT
mirrored** — its bodies are arbitrary captured console output this code does not author and cannot
constrain, so one test fixture printing something shaped like `"password": "…"` would silently break the
daily backup for good. Consequence stated rather than hidden: after a machine loss the **hashes** survive
in the mirrored ledger and the **bodies** do not.

**⚠ A REAL pre-existing flaw this slice's verification surfaced — fixed in the SAME commit (Protocol
42), and it would have been a false tamper alarm.** `lib/ledger.js`'s `listEventFiles` sorted the event
files **lexicographically**, with a comment asserting that was chronological. It is not, for the
**rotated** files: after `events-2026-07-31.` the base file continues `jsonl` and the rotation continues
`01.jsonl`, and `'0'` sorts before `'j'` — so `events-2026-07-31.01.jsonl` was read **before**
`events-2026-07-31.jsonl`, i.e. the second half of a day before the first. `replay()` largely survived
that (last-write-wins per key, min/max on timestamps) and no day has yet hit the 32 MB cap, so no
rotation has ever happened on this machine and nothing ever noticed. **A hash chain does not survive
it:** the first rotated day would have produced prev-link mismatches across the whole file boundary and
raised a **tamper incident on a ledger nobody had touched** — precisely the cry-wolf failure this design
must never have. Files are now ordered by `(date, rotation index)` with the base as index 0, guarded by
`WB6-ROT`, which chains records across a **real** rotation boundary and pins the old behaviour as the
red. Verdict stated per Protocol 42: **a real shipped path, not a harness artifact.**

**Proven live, read-only, against the machine's own ledger:** **63,906 records — 210 chained and intact,
63,696 pre-WB6 out of scope, 0 breaks**, truncation not detected, replay still matching. Verification of
the whole ledger costs ~150–200 ms and rides on the read the supervisor already does.

**And then the push that carried WB6 proved it on itself.** Its own arc — `push.intent` + `push.result`

- `push.completion` — landed **chained at sequence 356/357/358**, all three also carrying WB1's lineage
  `lin_4bbda8fada1e4788`: the two additive slices stacked on a real record, not a fixture. The gate that
  gated it wrote **133,087 bytes** of output, now stored by content hash and **recovered and verified from
  that hash after the fact** — where before, only the 13,176-character tail would have survived and the
  other ~120 KB (including the new `WB6-ROT` line) would have been thrown away. Live chain after the push:
  **359 chained, 0 breaks.**

**Verified:** test group **WB6** — canonical-form determinism (key order, round-trip fixed point, no clock
leak, the known-answer pin, and that the hash covers everything but itself); chain integrity and
additivity field-by-field against **real** records; the tamper **red-then-green** through the real append
path (clean → edited → detected with the exact record → restored → clean); deletion, reorder, front- and
tail-truncation each as their own distinct finding; the unobservable-without-a-witness case; the
never-reuse-a-sequence proof; backward compatibility against **real pre-WB6 records captured verbatim from
the live ledger**, the byte-identical replay, and every existing reader re-run over chained records; the
WB1 layering proof; degrade-never-accuse on an unknown chain version and on a degraded read; fail-open
against hostile input **and** the circular record that appends unchained rather than being lost; the
**no-new-write-path** guard (the writer set is unchanged from the set WB1 froze); the backup-scanner
red-then-green; the incident detections and the phone banner; a **real sandboxed supervisor run** raising
the incident; the `--verify-replay` proof above; the content store's dedupe/immutability/verify-on-read
and its fail-open surface; and a live read-only probe. **Full control suite green — 1316 assertions, 0
failures, 0 skips** — with nothing regressed in the CP / PG / PH / SP / WS / WSI / CLI / WB1 / P16 groups
that already exercise this append path. Pushed through the wrapper with its own real gate (CPB6).

**DEFERRED — named, not implied (the explicit follow-on list):**

- **The pre-WB6 records can never be chained.** Append-only means no backfill; they stay reported as
  coverage forever. This is a permanent property, not a task.
- **Content-addressing has ONE producer.** The gate logs are threaded. Not threaded: the other bulky
  record bodies (`reconcile.completed`'s ~5 KB coverage blob, `finding.*`/`adapter.probe` details,
  `push.intent`/`push.completion`'s ~9 KB envelopes). Each is a separate producer decision, and moving a
  body out of a record changes what that record hashes to — so it is a deliberate follow-on, not a sweep.
- **The content store is not backed up** (fail-closed-scanner reasoning above). Making evidence bodies
  durable off-machine needs either a scanner exemption path or a separate mirror target — a real decision,
  not an oversight.
- **Full verification every tick.** Costs one sha256 per chained record on the ledger read that already
  happens. Proportionate today; it shares the ceiling the read-everything-per-tick ledger design already
  has, so a windowed/checkpointed verify belongs with that design's own compaction story rather than ahead
  of it.
- **A pre-existing hazard the chain now makes VISIBLE, deliberately not fixed here:** `readAll({repair:
true})` truncates a trailing partial line **without holding the ledger write lock**. Racing a live
  append, that could in principle corrupt the tail — and the chain would now report it. Changing the
  repair path is a riskier edit than anything in this slice, so it is recorded rather than bundled.
- **Tamper-evidence is not prevention.** A self-contained chain cannot stop an attacker who rewrites the
  whole file and recomputes forward. The off-machine witness history is a partial answer; a real external
  anchor (publishing a periodic head hash somewhere the machine cannot reach) is the full one and is not
  built.

### WB7. ⬜ Supervisor watchdog + dead-man's switch ("who watches the watcher")

**What it is.** Merges GPT's Task-Scheduler watchdog + Gemini's dead-man's switch. A **tiny independent**
watchdog that (a) restarts the supervisor scheduled task under **narrow, verified** conditions — one attempt,
then alert, **never a restart loop** — and (b) fires a Pushover **"supervisor missing-in-action"** if no
supervisor tick has landed within a window. Answers the exact failure that started this whole CP arc —
_nobody was watching_ — at near-zero cost. **CP5's laptop-witness remains the fuller answer**; this is the
cheap same-machine interim, honestly framed as such (a same-machine watchdog cannot survive the machine
itself dying — that is CP5's job).

**Done means:** a killed supervisor task is restarted once (then alerts if it fails again); a supervisor that
silently stops ticking produces a phone alert within one window; the watchdog itself is dead-simple enough that
it does not need its own watcher.

### WB8. ⬜ Gate emits copyable CORRECTIONS, not just violations (positive linting)

**What it is.** When the gate/hook blocks, it prints the **exact fix to paste**, not only "violation X." Turns
each gate failure into an actionable next step and composes with the why-blocked query (MCP1). Small QoL; **no
enforcement change** — same guards, better output.

**Done means:** at least the highest-traffic gate failures (cache-bump, lint, format, a tripped static guard)
emit a copy-pasteable correction line alongside the failure; no guard's strictness changes.

### WB9. ⬜ Smaller net-new cluster — buildable once the batch above lands (one entry, six small items)

Filed together because each is small, invariant-respecting, and low-priority on its own:

- **Quiet-hours Pushover batching** — hold non-urgent alerts during owner-set quiet hours, batch on exit;
  urgent classes (failure, decision-needed) still fire immediately (mirrors Protocol 9's report cadence for the
  Pushover channel).
- **Deferred-push queue on network loss** — when offline, queue pushes and drain on reconnect instead of
  failing; the exact-SHA publisher (CPK2) still gates each one.
- **Pre-risk git bundle** — snapshot a `git bundle` before any risky operation; composes with WB4's kit and
  CPK4's continuation packet.
- **Environment-drift proposal** — toolchain version changed (Node/git/browser) → raise a **review proposal**,
  never self-update (extends CPK5's adapter/schema-drift watch from platform files to the toolchain).
- **Shadow-supervisor replay harness** — replay recorded observations through a _candidate_ supervisor and
  diff its decisions before promoting a change; a safe test bed, not a second live supervisor.
- **F.E.V. isolated experiment branches** — experimental/high-risk contracts confined to an isolated branch,
  **human out-of-band approval to merge** (respects the human-merge gate; a lighter cousin of the deferred
  worktree work, DG5).

**Also logged, NOT folded as active items — optional museum/cockpit flavor (cross-ref the museum program P /
the WB-CLI cockpit, CPB5):** failure-class _achievements_ (a badge earned only when a failure class gains a
verified guard+test+museum record — distinct from the ruled-out _app_ achievements, this is control-plane/
museum), terminal-boot-sequence-varies-by-real-health, a USB status lamp (green/yellow/red off the verified
state — a harmless read-only physical renderer), G.O.A.T. operator-onboarding walkthrough, and the public
"missing-edge" reference-graph challenge. These are decoration/exhibit ideas, considered when the museum and
the cockpit are actually live — not control-plane build items.

## Stretch rulings applied (2026-07-30) — A-G resolved

The seven Stretch items (formerly ST-WB-A … ST-WB-G) received owner rulings on 2026-07-30. Where each went:
**A** → folded into **WB2** as a generated invariant index (not a standalone item). **B** → accepted as
**WB10** below. **C** → declined as a live feed; logged decision + safe alternative recorded below. **D** →
accepted draft-only as **WB11** below, plus a standing rule. **E** → PARKED, stays in Stretch. **F** → PARKED
but marked owner-wanted, stays in Stretch. **G** → accepted as **WB12** below. After this pass the Stretch
bucket holds only **E** and **F**.

### WB10. ⬜ Staged one-click catastrophic rollback (ruling B — ACCEPTED, no auto-execution, 2026-07-30)

**What it is.** Formerly ST-WB-B. Accepted in a **no-auto-execution** form: the supervisor **DETECTS** the
catastrophic condition (e.g. prod is a black screen), **ALERTS** the owner, and **stages a one-click
rollback** — but the **OWNER fires it**, via the CPB5 control action (above). **Never automatic.** This keeps
the no-autonomous-destructive-action invariant and Protocol 16's dev-first, no-direct-`main` rollback rule
intact: the staged rollback still runs the gated `dev → main` path a human triggers — it is not a supervisor
self-revert. Cross-references **CPB5** (the action that fires it).

**Done means:** a catastrophic predicate produces a detect→alert→stage sequence with the owner as the only
actuator; nothing auto-reverts; the fire path is the CPB5 human-interactive control action with its confirm +
ledger-append guardrails.

### WB11. ⬜ Self-writing guards — DRAFT-only proposals (ruling D — APPROVED draft-only + standing rule, 2026-07-30)

**What it is.** Formerly ST-WB-D. The AI may **DRAFT** an incident→guard proposal (acting as typist), but
**INSTALLING** it stays an ordinary reviewed, gated, owner-approved job — auto-installing a guard is the
executor violation and is prohibited. Drafting-as-proposal is consistent with the typist-not-authority line.

**Standing rule (a requirement, not a nicety):** **nothing auto-applies silently.** Every pending owner
approval — a drafted guard, or any other action awaiting the owner — **surfaces on ALL owner surfaces: the
CPB5 CLI, the approval inbox (RB1), and Pushover.** A proposal that sits invisibly is a silent
auto-apply-by-neglect, which is exactly what this rule forbids.

**Done means:** a drafted guard lands as a reviewable proposal (never installed) that appears on all three
owner surfaces; installing it requires the normal reviewed + gated + owner-approved job path.

### WB12. ⬜ "Stimpack" owner hard-reset — logged, append-only, confirmed (ruling G — ACCEPTED with constraints, 2026-07-30)

**What it is.** Formerly ST-WB-G. An owner-only break-glass hard-reset, accepted **with constraints** that
preserve the append-only ledger:

- Git resets the **WORKING TREE** to a known-good SHA **only AFTER bundling the bad state first** — a pre-risk
  `git bundle` is taken and kept (recoverable, **never discarded**); composes with WB4's kit and WB9's
  pre-risk-git-bundle item.
- The **ledger is NEVER rewound** — the script **APPENDS** a `"rolled back to SHA X because Y"` event, so
  history stays intact and append-only. A silent history-rewriting reset is **prohibited**.
- **Session-drop obeys the process-kill rule** — echo the exact target + confirm, never batched.
- The whole command **requires an explicit human confirm.**

**Done means:** the reset bundles-then-resets the working tree, appends (never rewinds) a rollback event to the
ledger, drops the session under the process-kill confirm rule, and refuses to run without an explicit human
confirm; no path silently rewrites history.

### Logged decision — ruling C DECLINED as a live feed (2026-07-30)

**ST-WB-C (public live control-room exhibit) is DECLINED as a live feed** and removed from Stretch. **Safe
alternative:** a curated **STATIC snapshot exhibit** — a representative window, run through the **mandatory
name-scrub + curation + pin gate** — delivered via the **existing museum program** (a curation choice, not a
new build item). **Why the live feed is declined:** the records carry the owner's name; the museum has already
leaked once; a live feed is a **permanent leak + a recon/attack surface** and it **breaks the
pinned-reproducible model** the museum is built on. A delayed/redacted live feed was judged not worth those
costs when a curated static snapshot delivers the same exhibit value with none of them.

## ⚠ Stretch — needs an owner ruling (each strains an invariant; recorded, NOT active)

Filed here rather than as active items because each strains one of the standing invariants. Kept because each
might still be worth it under the right, owner-decided framing. **On 2026-07-30 five of the original seven
items (A, B, C, D, G) received owner rulings and left this bucket** — see "Stretch rulings applied" above for
where each went. Only **E** and **F** remain, both PARKED.

- **ST-WB-E. Job-scoped capability tokens** _(strains the one-machine/one-trust-domain simplicity)._ **PARKED
  (2026-07-30).** Bind a job to a narrow capability token. Ties to the already-DEFERRED separate-trust-domain
  question — worth it only once unattended autonomy is in _regular_ use (revisit with CP5). **Cross-ref:** the
  deferred **laptop-witness / multi-machine deferral (CP5)** — both revisit "when the setup grows past
  solo/single-machine or runs less supervised." **Kept separate, NOT merged** — they solve different problems
  (E scopes _permissions_; the laptop-witness adds _off-machine observation_).
- **ST-WB-F. In-chat MCP-Apps cockpit** _(strains PINNING/verify-first — depends on UNVERIFIED SEP-1865)._
  **PARKED but MARKED OWNER-WANTED (2026-07-30) — ready to green-light once verified.** Gemini's "render the
  job queue as an interactive HTML surface inside the Claude chat." **Gated on a verification spike** confirming
  the MCP-Apps / SEP-1865 extension actually exists and works; build nothing until that spike passes. Overlaps
  CPB5's HTML cockpit renderer — if it lands, it's a _third_ renderer over the same read layer, not new truth.

---

# 🛡️ CROSS-REPO NAMING DOMAINS — ND1 (new family, 2026-07-30)

**New family prefix `ND` (naming domains), per this file's own rule — single letters are exhausted, so new
work takes a family prefix.** Guard/governance family, sibling in spirit to **WB2** (the machine-readable
guard registry) and the DG push guards: it protects a boundary rather than adding a feature. Filed as a
queue item and shipped in the same pass — it was the owner's "next build" and had never been written down,
which is exactly the Protocol 50(a) case (a plan that lives only in conversation is remembered, not planned).

### ND1. ✅ SHIPPED (2026-07-30) — a naming-domain guard so the app and the control plane can't come to mean the same word two ways

**The real collision that motivated it.** The **app** (`!RobCo-UOS`, `js/core/state.js`) owns `RobcoEvents` —
a client-side game/UI event bus: in-page subscribers, `on`/`off`/`once`/`emit`, nothing persisted, nothing
leaves the tab. The **control plane** (`_RobCo-Control/code`) has **"ledger events"** — appended, replayable
records via `lib/ledger.js`'s `appendMany([...])`, each carrying a `type:` field, written to disk and mirrored
off-machine. Different runtimes, and — verified, not assumed — **no code clash today**: the control repo
contains zero `RobcoEvents`, the app's `js/` contains zero "ledger event". But "events" already means two
entirely different things depending on which repo you are standing in, and both sides are still growing. The
cheapest moment to settle that is before either side builds on the confusion.

**What shipped.** One shared list plus two independent self-checks:

- **`tests/naming-domains.json`** — which vocabulary belongs to which domain, with a `why` on every entry, and
  a **`shared`** list of terms that may never be reserved. Structured so more domains (the archive and the
  museum are the expected next two) drop in as another key.
- **Suite 257** (app repo) — scans this repo's own `js/**` for the control plane's reserved terms.
- **Test group ND** (control repo) — the mirror-image scan of its own `.js` sources for `RobcoEvents` /
  "RobCo events".

Each repo scans **only its own source**. There is no cross-repo runtime coupling — the list is **duplicated
byte-identical** because the repos share no package, and each side compares against the sibling checkout when
one is present (failing on drift) and reports the sync **unverified rather than failing** when it is absent, so
a public clone or CI is never blocked. **Sync point noted in both repos** (`rules/testing-and-gates.md` here,
`CLAUDE.md` there): edit both copies in the same change.

**The part that keeps it from rotting into a taxonomy.** Only distinctive **compounds** are reserved. The bare
word `ledger` is on the **shared** list — this app has shipped a user-facing Field Ledger panel
(`js/ui/ui-render-ledger.js`), a transcript event ledger and a per-game parity ledger for months, so reserving
it would outlaw live code — and so are `event`, `receipt` (this repo has `scripts/release-receipt.js`),
`incident` and `proposal`. Both guards prove that **behaviourally**: they run their own scanner over synthetic
lines using each shared term and assert nothing is flagged, so a future session that reserves bare "ledger"
turns the gate red instead of quietly banning a shipped panel. Both also carry a **red-then-green** proof — a
synthetic source violating every foreign reservation must be flagged — so a passing scan means something
rather than proving the scanner is a no-op. Both are **fail-closed**: an unreadable scope, a hollowed-out list,
or too few files scanned is a failure, not a pass.

**Deliberately NOT done:** `window.RobcoEvents` was not renamed. It is referenced across the app and is
precached, so renaming it is a cross-file change with a cache-bump risk and no benefit — **the guard protects
the existing names, it does not change them.** No reservations were invented for collisions that have not
happened (Protocol 36b / 49: a guard must earn its keep).

**Cross-ref — WB2 is NOT yet built.** The machine-readable guard registry is still ⬜ queued, so there was no
registry to register into. When WB2 lands, Suite 257 and group ND each get a row (failure class: cross-repo
vocabulary collision; enforcement point: each repo's own gate; retirement condition: the two runtimes stop
coexisting, or the vocabularies are made structurally distinct).

**Verified:** app repo `npm run gate` green (full gate — Node runner, lint, format, boot smoke, render check at
360/412, a11y, `test.html` runtime audit, save-survival, offline-first); control repo `node test/run-tests.js`
green. **Protocol 1: `CACHE_NAME` r19 → r20.** No app code changed — but `CHANGELOG.md` is itself a
precached file (the in-app changelog viewer fetches it), so touching it is a served-file change and the bump
is required. This is worth remembering: a "tests and docs only" commit is NOT automatically cache-bump-free.

**Shipped as:** app repo `ca38f79`, control repo `31e987c`.

---

# ⭐ ALSO PRE-MUSEUM — the 2.9.0 hardening pull-forward (HG1-HG2, new 2026-07-28)

**New family prefix, per this file's own rule (single letters are exhausted; new work takes a family prefix —
see the header note at the top of this file).** These two items were, until 2026-07-28, narrative bullets
inside 2.9.0's hardening-gate section (below, under "Then, before any new OS service: the hardening gate") with
no stable ID of their own. The owner resolved the previously-open "pull 2.9.0 hardening forward?" question
(recorded as open in [`QUEUE_LOG.md`](QUEUE_LOG.md#cpkernel0728)) by pulling these two — and only these two —
into the pre-museum band, alongside the control-plane kernel (CP1-CP5). Full account →
[`QUEUE_LOG.md`](QUEUE_LOG.md#hg0728).

**Why these two move and the third does not.** The hardening gate has three items. Two of them —
event-bus hardening and bootstrap isolation — are **pure debt-reduction in code that already exists today**;
nothing about the new 2.9.0 OS services changes what "fix this" means for either of them, so doing them now
costs nothing extra and removes debt that would otherwise sit around for another full round. The third — the
**UI↔services dependency-cycle burn-down** — is different in kind: it depends on the very surface the new OS
services are going to reshape (the render↔service boundary). Burning it down before that surface exists risks
inverting edges that the 2.9.0 services will just re-tangle, i.e. doing the same work twice. So it **stays** in
2.9.0's hardening gate, exactly where the original ordering reasoning ("build the services first and you
multiply the debt... burn the baseline down FIRST") put it — that reasoning is preserved verbatim there, not
overwritten by this pass (Protocol 50 a-date).

### HG1. ✅ SHIPPED (2026-07-30), app repo `31206dd` — Event-bus hardening — `off`/`once`/dedup, listener-error isolation (PULLED FORWARD from the 2.9.0 hardening gate, owner 2026-07-28)

**What it was.** `RobcoEvents` had no `off` / `once` / dedup, and a thrown listener handler was caught but
**silently swallowed**. Add `off`/`once`/dedup, and isolate each handler so a thrown error in one never
prevents the others in the same event from firing.

**Why it's here and not in 2.9.0.** Surface-independent: nothing about the new OS services changes what
`RobcoEvents` needs to be correct today, and the OS round is about to **widen** its usage — hardening it before
that widening, rather than after, is strictly cheaper. Original bullet (with its original reasoning, kept per
Protocol 50) is still in place under 2.9.0's hardening-gate section, now cross-referenced here.

**Done means:** `off`/`once`/dedup exist and are used where appropriate; a thrown handler is caught and logged
per-handler, never propagating to abort sibling handlers; a regression test proves the isolation (Protocol 13).

**Shipped as** (`js/core/state.js`): `off(event, fn)` (returns true/false, never throws on an unknown event or
fn); `once(event, fn)` (de-registered **before** invocation, so a handler that re-emits its own event cannot
re-enter itself); dedup keyed on `(event, fn)` with `addEventListener` semantics; `on()`/`once()` returning an
**unsubscribe handle** (the `AmbientRuntime.register()` convention); and per-handler **error reporting** —
behaviourally unchanged isolation, but the failure is now logged with its event name and handler index instead
of vanishing. `emit()` dispatches a **snapshot** and each record carries a `removed` tombstone, so a handler
that subscribes/unsubscribes mid-emit can neither skip a sibling nor fire one already removed; a non-function
subscriber is refused at registration rather than pushed onto the list.

**⚠ The "used where appropriate" clause, answered honestly rather than padded.** Dedup keys on function
IDENTITY, so the anonymous arrows every shipped `_wire*EventBusSubscribers()` registers are distinct objects
and are **not** deduped — and no shipped subscriber is registered twice today (each wiring function is called
exactly once from `window.onload`). So `off`/`once`/dedup have **no existing call site**: they are API-level
hardening landed ahead of the widening, in the same "ship it correct, state the caveat" posture as CPB1/ACT2.
Re-entry guards were deliberately **not** bolted onto the six wiring functions — that would be a parallel
implementation of dedup (Protocol 22) for a risk with no incident on file, exactly the accretion Protocol 36b
and 49 exist to prevent. Naming the handlers so identity dedup could see them was also rejected: ~40 handlers
across six files, against roughly thirty existing static assertions that regex those wiring bodies — churn and
regression risk far past what the clause asks for.

**PROTOCOL 42 — a real footgun surfaced while building it, fixed and locked in the SAME commit.**
`js/core/state.js` is evaluated in `vm` sandboxes with **no `console` binding** (the gate's own bus harness,
Suite 135). A bare `console.error(...)` in `emit()`'s catch raises a `ReferenceError` _from inside the catch_ —
turning "a bad listener can never break the emitter" into "a bad listener always breaks the emitter" the moment
logging was added. Verdict: it would have been a **real shipped-path** defect the gate's own harness could not
have caught by accident, because the harness is precisely the console-less environment. The reporter is fully
guarded (a `typeof console` check inside its own `try`); **Suite 256.9** locks the console-less case and
**256.10** locks that the log actually happens when a console IS present.

**Verified:** **Suite 256** — 14 assertions, behavioural against the real `state.js` in a `vm` sandbox
(Protocol 20; one marked static exception at 256.14, whose subject genuinely IS the source text — a
behavioural test cannot distinguish "logged through a guarded reporter" from "swallowed" in a console-less
sandbox). **256.13** re-proves a real shipped subscriber (the `state.js` `level.up` auto-log) still fires
through the hardened `emit()`. Suite 135 keeps the original U7/U8 contract and passes unchanged. Full
`npm run gate` green — 3701/3701 Node assertions plus boot smoke, render check (360/412), a11y, the
`test.html` runtime audit, save-survival and offline-first. Protocol 1: `CACHE_NAME` r18 → r19.

### HG2. ✅ SHIPPED (2026-07-30), app repo `aef7da4` — Bootstrap isolation — per-phase boot guards, fatal-vs-degradable (PULLED FORWARD from the 2.9.0 hardening gate, owner 2026-07-28)

**What it was.** ~45 boot-phase calls sat under ONE outer `try`/`catch` with zero per-phase isolation. Add
per-phase guards, classify each phase's failure as fatal (boot cannot continue) or degradable (boot
continues, the failure is surfaced), and fail loudly — never silently — in both cases.

**Why it's here and not in 2.9.0.** Same reasoning as HG1: this is debt in the existing boot sequence,
independent of what the new OS services will add to it. Original bullet (with its original reasoning, kept per
Protocol 50) is still in place under 2.9.0's hardening-gate section, now cross-referenced here.

**Done means:** every boot phase runs under its own guard; each phase is classified fatal or degradable; a
degradable failure surfaces to the user (not console-only, echoing the same standard Protocol 24 already sets
for AI state-apply failures); a fatal failure fails loudly with a clear message, never a silent black screen.
**Every criterion met** — see below.

**Shipped as** (`js/ui/ui-core.js`): the real count is **51** phases, not ~45 — each now wrapped in
`_bootPhase('<name>', () => { <the same call, unchanged> })`. **Call order and the two `await`ed async phases
are byte-identical to the pre-HG2 sequence** — only the isolation is new; `_bootPhase()` returns the phase's
own return value so `await _bootPhase(…)` preserves ordering exactly, and a rejected promise routes into the
same classifier as a synchronous throw (a phase cannot escape the guard by failing late). Classification
lives in ONE table (`BOOT_PHASE_SEVERITY`), not at 51 call sites.

**Exactly three phases are FATAL**, each classified from what the code actually does rather than how
important it sounds: `hydrate-state` (builds `state`; every later phase and every render reads it),
`load-ui` (the master render pass), and `init-tabs` (`switchTab()` is what adds `.tab-visible` — skip it and
**no** panel is ever revealed, i.e. a literally blank column). Everything else degrades: an audio arm, a
datalist, a device pref or a wiring call that fails leaves a terminal that is worse, not unusable.

**Both outcomes fail loudly.** _Degradable_ → boot continues; the fault is recorded through
`_recordError('boot', …)` so the casing FAULT lamp, the BUS-24 fault console and the LIVING CORE strain
signal all see it through the one shared ring-buffer reader (Protocol 22), **and** it is surfaced to the USER
as a `#chatDisplay` transcript line — never console-only. The line is deliberately deferred to end-of-boot by
`_flushBootFaults()`, because `_restoreApiKeyAndChatHistory()` clears `#chatDisplay` mid-boot and an earlier
line would be wiped before it was ever read; a clean boot writes nothing. _Fatal_ → `_renderBootFatal()`
paints the `#bootFatal` screen (`role="alert"`, the failed phase, the fault text, any degradable faults that
preceded it, and a RETRY BOOT control), built from **inline styles and `textContent` only** — no CSS class,
no render pass, no `MetaStore` read — precisely because it may have to survive a fatal fault in the phase
that paints the UI. It paints once and swallows its own failure rather than becoming a second fault.

⚠ **One deliberate fail-OPEN, stated rather than buried:** an unknown phase name degrades at runtime instead
of killing boot. A typo in a phase name must never be the thing that bricks the terminal; the gate is the
correct layer to catch the typo, and Suite 258.15 does.

**Verified:** **Suite 258** — behavioural in a `vm` sandbox against the real functions lifted out of
`ui-core.js` (isolation, ring-buffer recording, fatal propagation, async-rejection routing, the fail-open
default, return-value passthrough, user surfacing, silence on a clean boot, the fatal screen's content,
idempotence and never-throws contract) **plus the HG1 footgun re-checked on new ground** (258.13: a
console-less sandbox must not turn "a phase failure is contained" into "a phase failure is fatal" — the exact
defect HG1 hit in `state.js`, one file over). Five **marked Protocol 20 static exceptions** carry the part no
behavioural test can reach: **258.15** holds the severity table and the real call-site list to each other in
both directions, and **258.16** proves every statement in the try block is a `_bootPhase()` wrapper — so
"every boot phase runs under its own guard" is checkable rather than merely asserted. **Suite 132.5 was
RESTATED, not re-bumped:** its raw line-count ceiling stopped measuring anything once every phase became a
three-line wrapper, so it now asserts each phase callback is a single named call — strictly stronger than the
count it replaced (a 60-line inline monolith passed the old check and fails the new one). Diagnostic Shell
registry count 167 → 169. Also verified in a real browser: a clean boot through the wrapped sequence (11
panels `tab-visible`, no fatal screen), the degradable transcript line, and the fatal screen with its
`role="alert"` and the preceding degraded fault listed. Full `npm run gate` green. Protocol 1: `CACHE_NAME`
r20 → r21.

**Protocol 44 trigger shipped with it:** a boot fault only reproduces on a load that already went wrong, so
the Diagnostic Shell gains **SIMULATE DEGRADED BOOT FAULT** and **SIMULATE FATAL BOOT SCREEN** under
`SIMULATE BOOT FAULT` — both driving the real shipped functions (Protocol 22), with the degraded one also
exercising the unknown-name fail-open default by design.

---

# ⭐ CONTROL-PLANE ACTIVATION & OWNER-GATED CHECKLIST (2026-07-30; tidied 2026-07-30 later still)

**What this section is.** The CP kernel program (CP1-CP5), the Dispatch Return Bus (RB1-RB6), and the
pre-museum hardening pull-forward (HG1-HG2) above each carry their own owner-gated / activation / to-build
steps, scattered across their own sections and the private planning docs. The owner asked (2026-07-30) for
every one of those steps consolidated into ONE tracked list, so nothing lives only in Dispatch's head. **This
section does not replace any item's own entry above** — it is a cross-linked index over them, plus a small
number of genuinely new items this pass surfaced (chiefly **ACT3**, owner-approved the same day). Full
account → [`QUEUE_LOG.md`](QUEUE_LOG.md#cpactivation0730).

**Tidied 2026-07-30 (later still) — owner-approved consolidation pass.** One very fast night folded a lot of
work in and this section had gotten sprawly. This pass: (1) moved everything actually **shipped** tonight —
the rank-3 backup mirror (BUILT + ACTIVATED) and REF1's session-aware alert (BUILT) — out of the pending
buckets into the SHIPPED record below, each with its SHA, verified directly against the private repos'
`git log`; (2) confirmed this checklist's CPK/CPB/ACT/OD/SP/DG entries each have exactly ONE home — most
were already correctly pointer-only ("full entry above"), so the remaining dedup was two small cross-refs
added in place at CP2's push-wrapper stage (→ **ACT3/DG2**) and CP3's usage-relay mitigation (→
**CPB1/CPB2**); (3) tightened what remains into one ordered execution list (below); (4) filed one new
tracked item, **AUD1**. **⛔ No ID was renumbered, re-lettered or reused (Protocol 49) — this pass is
STATUS, GROUPING and DEDUP only.** Doc edits and git only; no control-plane code touched, nothing killed.
Full account → [`QUEUE_LOG.md`](QUEUE_LOG.md#cpconsolidate0730).

**Status vocabulary for this section only** (distinct from the file's usual ✅/🔄/⏭️/⚠️/⬜ tags, because this
list's job is readiness-to-activate, not build progress): **BUILT** (code exists, nothing left to do) ·
**READY-TO-BUILD** (owner has said go; unblocked) · **ACTIVATION-SWITCH** (already built; owner needs to flip
it on) · **OWNER-DECISION** (needs an owner call, not code) · **SPIKE** (needs the owner in the loop to run)
· **DATA-GATED** (waits on measured evidence, not a decision).

**Family prefixes in this section:** **CPK** for the five kernel ranks referenced throughout the CP program
as "rank 1" – "rank 5" (retroactive IDs — all five are now shipped, see SHIPPED below); **CPB** for the next
control-plane build batch; **ACT** for the activation switches; **OD** for owner decisions; **SP** for
owner-in-loop spikes without an existing ID; **DG** for the data-gated promotions; **REF** for owner-approved
refinements to already-scoped items; **AUD** (new this pass) for post-implementation multi-model audits.
Existing IDs (**RB1-RB6**, **HG1-HG2**, **P15**) are reused here, never reassigned.

## READY TO BUILD — tightened execution order (owner go given 2026-07-30)

- **ACT3 — ✅ SHIPPED (2026-07-30).** Wired the controlled-push wrapper into the real push path. Every push
  used to be a plain `git push` that bypassed the wrapper, so the ≥10-clean-pushes counter that gates
  **DG2** (push-guard enforcement) could never advance. Now `npm run push` (app repo `scripts/robco-push.js`)
  routes a push through `controlled-push.js`, delegating the gate to the pre-push hook so CPB4's fast path is
  preserved (see the SHIPPED entry below for SHAs, the delegation/timeout detail, and the **3/10 counter as
  it read on ACT3's dogfood day** — ⚠ corrected 2026-07-31: that figure was labelled "live" here, which it
  has not been since 2026-07-30. It is a **dated snapshot**; the **live** value is **44/10, threshold long
  since MET**).
  **Scope held exactly:** this was ONLY the routing step. Raw-push refusal (actually blocking a bypass) stays
  **DG2** — a separate, later, data-gated promotion after 10 clean wrapper pushes are observed. Wiring the
  wrapper in did NOT turn on enforcement; a plain `git push` still works, unrefused.
- **CPB1 — ✅ SHIPPED (2026-07-30), control repo `2d6e90b`.** The budget alert (tokens/$) — the dollar/token
  half of the deadline/budget alert, sibling of the already-shipped wall-clock half. A non-terminal job whose
  MEASURED per-job spend is at/over its manifest `usageReserve` raises its own `budget` incident (distinct
  from `deadline`). **Dollars or tokens only** — a `percent` reserve degrades to `UNOBSERVABLE` (never "% of
  the weekly cap"; that stays structurally unobservable per
  [`USAGE_MEASUREMENT_SPIKE.md`](planning/control-plane/USAGE_MEASUREMENT_SPIKE.md)); no measured usage →
  `UNOBSERVABLE`, never a fabricated `$0`. The **2026-07-30 cap-reset refinement** shipped with it: the alert
also states when the cap resets — a reported reset/window field verbatim if the usage data ever carries one
(dormant today — the `{t,org,u:{fh,sd,xu}}`format has none), else an honest approximate (session window a
~5h upper bound; weekly reset date`UNOBSERVABLE`, no anchor in the data). **Dormant until fed** (same
posture as the wall-clock half): no launcher writes measured per-job usage into the ledger yet (spike §4).
⚠ **Correction (2026-07-30, after ACT2 shipped `7ca220c`): this pointer used to read "spike §4 / ACT2
plumbing", and that was wrong — ACT2 shipped WITHOUT the usage-capture half.** Capture needs a launcher to
capture *from*, and no launcher exists; building a capture path with no producer would be faking a data
source. The capture stays with the **approvalless/headless launcher** work (now tracked as **CPB9**), not with ACT2. So the check
reports `UNOBSERVABLE`until a`job.result`carries usage in either
grounded shape (the tool's own`observedUsage`, or a raw `-p --output-format json`result) — then it lights
up with no code change. Full record in the SHIPPED section below.
**Refinement — cap-reset ANCHOR + confirmed-data framing (folded 2026-07-30, owner-provided; multi-model
round).** Two corrections to the "no anchor in the data / weekly reset`UNOBSERVABLE`" posture above,
applied when the reset countdown is wired (NOT a rebuild of the shipped comparator): **(1) the mapping is
now known** — `fh`= the **current-session %**,`sd`= the **weekly all-models %** (confirmed: a live`sd=70`matched the Claude UI's "All models 70%"). The **weekly window resets Sunday 2:59 PM (fixed)** and
the **session is a rolling ~5h window**. That reset time is an **owner-provided anchor** — updatable, held
in config, **never hardcoded** — because it is the one piece genuinely not on disk. With it, the supervisor
/ CPB2 / CPB5 CLI can show **real reset countdowns** alongside the live percentages. **(2) Upgrade the
earlier "proxy" framing:**`fh`/`sd`are **CONFIRMED live server data**, not a synthetic proxy — Claude
Code polls an Anthropic endpoint every ~5 min and persists the values; only the reset *time* is absent from
the file (hence the anchor). This does **not** re-open per-job "% of the weekly cap," which stays
structurally`UNOBSERVABLE` (the global file carries no session id). OWNER-PROVIDED (2026-07-30), applies
  when the reset-countdown display is built; the shipped CPB1 plumbing is unchanged.
- **CPB2 — ✅ SHIPPED (2026-07-30), control repo `6154abd`.** The usage → operating-modes change. The five
  per-threshold usage **phone alerts** (50/80/85/90/95 — "became wallpaper") are retired in favour of a single
  alert on an **operating-mode change**: Normal / Conserve / Reserve-for-owner / Stop-unattended-AI; notify
  only on a mode _change_, exact % stays in `status.json`. **LIVE, not dormant** (unlike CPB1) — it rides the
  same live account-wide `fh`/`sd` usage file the supervisor already reads every run, so it lights up on real
  usage today. Full record in the SHIPPED section below.
  **REFINEMENT — Stop-unattended-AI moves to 95% (owner-approved 2026-07-31; NOT yet built).** The shipped
  default band map is `>= 90 -> Stop-unattended-AI`, `80-89 -> Reserve-for-owner` (verified in
  `lib/usage-mode.js`'s `DEFAULT_MODE_THRESHOLDS`, not assumed). The owner's call: **clamp to Stop only at
  95**, widening **Reserve-for-owner to 80-94**. The other two bands are unchanged (`< 50` Normal, `50-79`
  Conserve). **Why it is worth the change:** 90 is early enough that the machine stops unattended work while
  a genuinely useful slice of the cap is still on the table; the last stretch is exactly where the owner
  wants room for his own final changes, and Reserve-for-owner already means "back off unattended work". 95
  makes Stop the true last resort rather than a second, earlier reserve band.
  ⚠ **Two things that must NOT drift with it:** the mode COARSENING is unchanged — this moves one boundary,
  it does not reintroduce the five per-threshold phone alerts CPB2 retired; and the exact 90/95 readings are
  still not lost, because they remain in `status.json` and in the untouched `usage.crossing` / `usage.level`
  ledger events.
  **Available today without a code change, worth knowing:** the bands are already owner-tunable through the
  `modeThresholds` key in the usage-thresholds config file (`lib/usage-mode.js` honours a valid override and
  falls back to the documented default otherwise), so the owner can move the boundary live before the
  default is edited. Changing the shipped DEFAULT is still the build task recorded here.
  **The Stop behaviour itself — recorded now, enforced by the CPB5 v0.2 USAGE ADMISSION GATE
  (owner-approved 2026-07-31).** What Stop-unattended-AI actually DOES has until now been named but never
  pinned down. It is deliberately asymmetric:
  - **REFUSES new UNATTENDED / dispatch-launched AI sessions.** The launcher asks the shared admission
    module and is **mechanically refused** — fail-closed for unattended work, exactly as the v0.2 rung
    already specifies.
  - **NEVER blocks the owner's own interactive work.** This is the whole point of the mode and the reason
    it is not simply "stop everything": the last of the cap is being **reserved FOR the owner**, so a gate
    that also locked him out would defeat its own purpose. Same principle as CPB5's guardrail (a) — _the
    invariant constrains the AI, not the owner._
  - **Saving, committing and pushing cost no AI and are therefore NEVER blocked by usage.** Stated
    explicitly because it is the obvious thing to get wrong: a usage gate that stopped the owner committing
    at 96% would strand finished work behind a limit that has nothing to do with it. The push wrapper, the
    gate and the archive sync are not AI paths and no usage mode touches them.
    **Cross-ref:** this behaviour is enforced by **CPB5 v0.2**'s admission gate (see "The three slices"
    below), and CPB5 v0.2 reads its mode from **this** item. One threshold set, one admission module, two
    entries pointing at each other — not two policies.
    **── THE EFFORT DIMENSION (folded 2026-07-31; DESIGN, NOT A BUILD) ──**
    **The operating modes gain a second axis: an EFFORT CEILING.** Until now a mode answered one question —
    _may an unattended session start?_ — with ALLOW or REFUSE. It now answers a second: _and how deep is it
    allowed to think?_ This became worth specifying the day per-session effort control stopped being
    hypothetical: **SP2 mechanism (1) came back positive** (see SPIKES, and
    `planning/control-plane/EFFORT_CONTROL_SPIKE.md`), so the tier is a dial the machine can actually turn,
    and a dial nothing governs is a dial pointed at the cap.
  - **The rule: the gate negotiates the tier DOWN, never up.** Admission may **cap** a requested tier to
    the mode's ceiling and admit the job at the capped tier; it may never **raise** one. A ceiling is a
    limit, not a recommendation, and a gate that could raise a tier would be spending the cap on its own
    initiative.
  - **The shape, by mode** (⚠ the exact ceilings are the **proposal**, owner-unconfirmed except where
    noted; the SHAPE — a monotonically falling ceiling with refusal at the bottom — is the decision):
    **Normal** → no ceiling, any tier the plan asked for, up to Ultracode. **Conserve** → **no
    Max/Ultracode** (owner-stated); the deep tiers are the expensive ones and Conserve is the mode that
    exists to stop spending like that. **Reserve-for-owner** → tighter still, the low tiers only —
    unattended work is already meant to be backing off here, and a long deep run is the opposite of
    backing off. **Stop-unattended-AI** → **REFUSED outright regardless of tier**, unchanged; the tier
    question does not arise because the launch does not happen.
  - **⛔ The same asymmetry as the Stop behaviour above, and for the same reason: the ceiling binds
    UNATTENDED / dispatch-launched work ONLY. It never caps the owner's own interactive session.** The
    cap is being reserved FOR him; a gate that throttled his own thinking depth at 85% would defeat its
    own purpose exactly as a gate that locked him out would. _The invariant constrains the AI, not the
    owner_ — CPB5 guardrail (a), applied to the second axis.
  - **⭐ The consequence that makes CPB9's verify-the-tier requirement STRUCTURAL rather than defensive.**
    Once the gate can cap, **"requested tier ≠ applied tier" stops being an anomaly and becomes the
    NORMAL case** — the gate itself manufactures the divergence, deliberately, every time it negotiates
    one down. So a job record that stores the **requested** tier is not merely imprecise, it is
    **systematically wrong in the one direction that matters**, and the gate's own cap-arithmetic would be
    reading back a number its own cap invalidated. This is why the tier must be recorded as **applied and
    verified** (CPB9), in the **WB1 envelope's `effort` field** (WB1), rather than echoed from the
    request. The three folds are one design: **the gate sets it, the launcher verifies it, the envelope
    records it.**
  - **Open, with its earn-condition stated (Protocol 50 a-form):** whether the owner can override a
    ceiling for a specific unattended job, and if so whether that override is logged as a decision or
    simply as a higher-tier job. Not designed here — it earns a slot when CPB5 v0.2's admission module
    gets built and the override would have somewhere real to live. Until then the ceiling is absolute for
    unattended work, which is the fail-closed reading and the right default to start from.
    **Nothing here is built.** CPB2's shipped code is untouched by this fold; the ceiling lands with CPB5
    v0.2's admission module, against tiers CPB9 can actually set.
- **CPB5 — `robco`, the OPERATOR CONTROL CLI (owner-confirmed 2026-07-30; upgraded read→control 2026-07-30;
  high-priority).** 🔄 **IN PROGRESS — v0.1 of 3 SHIPPED (2026-07-31), control repo `ff11244`.** The
  ladder's first slice, "the decision loop", is built and live: the two foundations, the five views, the
  eight command families, and `incident.resolve` proven end to end. **v0.2 and v0.3 are NOT built** — see
  the per-slice status under "The three slices" below, and the shipped record at the end of this entry.
  ⚠ **One spec contradiction resolved, recorded rather than silently picked:** this entry's opening line
  (written 2026-07-30, earlier that day) says "a single **PowerShell** CLI"; the phased build plan folded
  in **later the same day** opens with "**Node-native** vertical-slice ladder" and mandates shared Node
  modules. The later fold wins, and the owner's build instruction for v0.1 restated Node-native
  explicitly. Built in Node. The word "PowerShell" in the line below is left as written (Protocol 50:
  do not rewrite the earlier record) — this note is the reconciliation.
  A single CLI that both **reads** and **drives** the control plane.
  **Reads** (unchanged from the original read-only scope): renders the supervisor AND the watcher/reaper in ONE
  terminal screen from the ledger + snapshots — supervisor **jobs / usage / last-tick / open-incidents /
  backup-health** up top, watcher **last-sweep + flags** below. Reads what already exists (`status.json` + the
  ledger); adds a read _view_, not a new source of truth.
  **Human-driven control actions:** pause/resume the supervisor; pause/stop a specific job; acknowledge/resolve
  an incident; trigger a backup now; flip the usage mode (CPB2's Normal / Conserve / Reserve-for-owner /
  Stop-unattended-AI); and fire the **one-click rollback** — the human-triggered catastrophic-recovery from
  ruling B (**WB10** below).
  **New sub-command `robco recover`:** pulls the **WB4** recovery card + QR up on screen from the CLI, so the
  recovery runbook is always a keystroke away, not only on the physical card.
  **SESSION CONTROL — list active sessions by their UI NAME, and stop one (owner add 2026-07-31).** Two
  halves, deliberately split across the ladder because only one of them needs the confirmed-action
  machinery. **⛔ This is NOT a new action:** it is the concrete, owner-specified SHAPE of the
  **`session.stop`** action already listed on the **v0.2** rung below — same action, same one action layer
  (Protocol 22). Recorded here so it cannot later be built twice under two names.
  - **(a) LIST ACTIVE SESSIONS — read-only, can surface as early as v0.1's Work view.** Per active session:
    its **human-readable UI NAME** (the session title the owner actually recognises — e.g. _"Build REF5 —
    tune unbacked-work alerts"_), plus **session id**, **working directory**, **state**
    (working / idle / stalled / abandoned), and **last activity**. The name is the whole point of the
    request: a list of hex session ids is not something a human can make a decision from, and picking the
    wrong row is exactly the mistake a kill action must not make easy.
    ⚠ **HONEST CAVEAT, and it is a real one — VERIFY, DO NOT ASSUME.** The UI title may simply not be
    persisted anywhere this CLI can read. The build **must verify on-disk title-readability against the
    real stores before claiming the column**, exactly the way this project verified `is_error` on tool
    results and the `fh`/`sd` usage mapping rather than assuming them. Candidate sources to CHECK — named
    as leads, **not** as an assertion that any of them carries a title: the desktop-session store
    (`lib/adapters/desktop-sessions.js` / `paths.desktopSessionsRoot()`), the session records
    (`lib/adapters/session-records.js` / `paths.sessionRecordsDir()`), and the per-tool transcripts
    (`lib/adapters/transcripts.js` / `paths.transcriptsRoot()`). **If the title is not readable, the column
    degrades to `UNOBSERVABLE` and the row falls back to session id + working directory** — both of which
    are always available — and it says so on screen. It must never invent, infer, or prettify a name.
    This drops straight onto v0.1's state vocabulary: a readable title is `OBSERVED`, a missing one is
    `UNKNOWN` with its reasonCode, and `UNKNOWN` can never render as healthy.
  - **(b) KILL / STOP A SESSION — the destructive half, v0.2.** Echoes the **exact** session (**name +
    id/pid**) and requires explicit confirmation before anything is stopped — **never blind, never
    batched**, one target per invocation, per the standing process-kill safety rule and guardrail (b)
    above. Appends to the ledger like every other action, and **waits on a TERMINATED-POSTCONDITION** —
    it re-observes that the process is genuinely gone before reporting success, rather than reporting
    success because a signal was sent.
    **Reuses what v0.1 already shipped, and adds one thing.** The unified action envelope, the frozen
    target version, the derived idempotency key, the echo-and-typed-confirm flow and the hold-until-proven
    receipt are all built (control repo `ff11244`) — this needs no new machinery for any of that. What it
    adds is a **new postcondition kind** (`process-terminated`) alongside v0.1's `incident-state`, and that
    kind must be evaluated on **`(pid, procStart)` identity, never pid alone** — a recycled pid reporting
    "still alive" would block a legitimate stop, and worse, a recycled pid reporting "gone" would confirm a
    kill that never happened. That identity rule is this repo's oldest lock invariant; the kill path
    inherits it rather than inventing a second notion of process identity.
    **Route the actual termination through `lib/reaper.js`, do not shell a kill** — the reaper already
    holds this tool's ONLY `process.kill` carve-out and already re-verifies `(pid, procStart)` immediately
    before terminating. A second kill path would be a parallel implementation of the one thing in this
    codebase that most needs a single home (Protocol 22).
    ⛔ **This does NOT unblock CPB7's data-gated kill authority, and must not be read as doing so.** The
    two are different in kind, and the difference is the whole invariant: **this is a HUMAN pressing stop
    on a session he is looking at** (guardrail (a): _the invariant constrains the AI, not the owner_),
    whereas **CPB7's trip-open SIGTERM is the MACHINE deciding to kill on its own** and stays DATA-GATED /
    shadow-only behind the DG1 evidence bar per the owner's confirmed 2026-07-30 ruling. Building (b) gives
    the owner a stop button; it gives the automation nothing.
    **Owner-provided 2026-07-31; doc-only fold, nothing built by this pass.**
    **Three guardrails (stated explicitly):** (a) **write/action paths execute ONLY when a human runs the command
    interactively** — the AI and the automation must **never** call them to actuate; this is what preserves the
    no-executor invariant (the invariant constrains the AI, not the owner). (b) **Destructive actions** (stop
    session, rollback, revert) **echo the exact target and require explicit confirm, never batched** — per the
    process-kill safety rule. (c) **Every action appends a ledger event** (keeps it traced + append-only; the
    supervisor stays sole writer for autonomous records — these are human-initiated events routed through the
    same append path).
    **Pending owner approvals surface here too** (ruling D / **WB11**): CPB5 is one of the owner surfaces where a
    pending approval appears, alongside the approval inbox (**RB1**) and Pushover.
    **Phone cockpit — control-capable, ONE shared action layer.** The phone-openable cockpit is a single
    self-contained `.html` regenerated on each supervisor tick, served over **Tailscale — the private transport
    for this cockpit** (the owner's own tailnet reaches the supervisor machine directly; **never** the public
    GitHub Pages origin, because the records carry the owner's name). Tailscale is named here as the explicit,
    required mechanism — the cockpit is reachable from the phone **only** over the tailnet, never a public URL. It is **the same operator control surface as the desktop
    CLI, just a web renderer** — it shares **ONE action layer** with the CPB5 CLI and enforces the **same three
    guardrails above**. This is the owner's "CLI on my phone / manage while away" surface. Folds in GPT's
    "phone-first operator cockpit" and Gemini's `robco status` / supervisor-local-web-view; can surface the same
    pending-events delta as **RB1**'s inbox projection.
    **Startup banner — locked (owner decision 2026-07-30).** The `robco` CLI opens on a **sea-turtle startup
    banner**: GPT's dependency-free renderer drawing a side-profile sea turtle cresting a wave, rendered
    **two-tone** — a phosphor-**green** turtle body over a **blue** waterline/wave (the foam and everything below
    the surface is blue; the turtle body above it is green). Truecolor with graceful fallback — `NO_COLOR`-aware,
    with unicode and ascii fallbacks. Chosen over Gemini's, Fable's, and hand-drawn attempts. The asset already
    exists as GPT's `robco-turtle-banner.mjs`; it gets **integrated and recolored** (green turtle / blue water)
    when CPB5 is built.
    ✅ **DONE (2026-07-31), control repo `0b8d93b` — and the asset claim above turned out to be correct after
    all.** The owner supplied GPT's original `robco-turtle-banner.mjs`, and it is now the shipped banner,
    **replacing the from-scratch one v0.1 shipped** (that art is gone). His **72×22 raster**, his four-level
    phosphor **palette**, his half-block `paintedCell` and both colourless ramps are **verbatim**; the only
    changes are ESM→CommonJS, the recolour, and routing capability detection through the CLI's existing
    `theme.detectCaps()` so there is one probe rather than two (Protocol 22). His three modes — ansi /
    unicode / ascii — survive exactly.
    **The recolour mask, since "which pixel is water" is the whole question.** The raster carries no channel
    saying so, so the split is **derived from the art's own geometry** by two stated constants rather than
    hand-painted into a second opaque raster: **`WATERLINE_ROW = 14`** (every painted pixel at or below it is
    water — the surface _and_ the submerged flippers under it, which is why a flipper goes blue although it is
    anatomically turtle: the rule is "below the surface", exactly as stated above) plus a **`BODY_ENVELOPE`
    for rows 10–13**, the rows that straddle the surface, where the shell's lower body is still above water
    while the foam runs out sideways past it — inside the envelope is turtle, outside is foam. Rows 0–9 carry
    no water at all. **The envelope was read off the raster, not guessed:** row 13's painted runs are
    `3-9 | 18-36 | 39-45 | 53-55 | 59-68`, and the envelope `18-45` lands exactly on the two middle runs,
    leaving the three detached streaks — visibly foam — outside it. The turtle body is **not** recoloured; the
    water ramp is a parallel four-level ramp sharing no value with the green one.
    ⚠ **One claim corrected by measurement rather than left standing:** `paintedCell` now picks a palette per
    half, so a cell with turtle above and water below would render green-on-blue, and the first draft of the
    code comment said this drew the waterline inside a single character. It does not — cells pair rows
    (0,1), (2,3)… and the turtle/water edge falls between rows 13 and 14, **exactly on a cell boundary**, so
    **zero** mixed cells occur in any column and the waterline is a crisp horizontal edge instead. The
    per-half handling is kept (it is correct, and a future envelope change could need it) and pinned by test
    `CLI-F2c`, but it is now stated as a capability rather than as something the shipped banner does.
    The colourless unicode/ascii fallbacks are unchanged — the two-tone is a **colour** distinction, and
    inventing a second glyph set to fake it would no longer be his art.
    **Notification control — the CLI manages Pushover delivery at will (owner add 2026-07-30).** A **global
    on/off switch** AND **per-alert-type** individual enable/disable, laid out like a settings panel (global
    switch on top, individual toggles beneath) so each alert family flips **independently** — budget/token,
    usage-mode change, backup failure/health, session-needs-input, unbacked-work / push-confirm, thrashing,
    deadline, break-glass, and any others. **Human-driven only**; every toggle **appends a ledger event** (a
    record of when alerts were off and which). **Three mute LEVELS (owner-refined 2026-07-30):** _normal_ (all
    on) / _standard mute_ (criticals still break through by default) / _total blackout_ (**everything** off,
    **including the criticals that normally break through** — an explicit opt-in hard "mute all"). **Auto-unmute
    is the safety net for every level:** any mute — standard OR total blackout — carries an **expiry timestamp**
    the supervisor checks on its **5-minute tick** and lifts automatically once passed, so nothing (not even a
    blackout of the criticals) stays silent forever. **Default duration 2h 30m, configurable.** No always-on
    timer is needed — the CLI tracks the mute purely via that expiry timestamp on the supervisor tick. Commands
    along the lines of `robco notify on|off|status` plus per-type toggles.
    **Aesthetic requirement — first-class, not an afterthought (owner add 2026-07-30).** CPB5 must be a
    **polished, beautiful TUI at the level of finish of the Claude Code CLI**: RobCo/Fallout phosphor theme,
    clean boxes / tables / color, readable layout, and the turtle banner. Recorded as a first-class requirement
    of the item.
    **Phased build plan — the Node-native vertical-slice ladder (folded 2026-07-30 from GPT-5.6's MVP ladder;
    multi-model design round GPT-5.6 / Gemini 3.1 / DeepSeek).** How CPB5 actually gets built, in
    owner-shippable slices. **Architecture rule for the whole ladder:** the TUI is only a **renderer +
    action-submission client** — all domain logic lives in shared Node modules, and the CLI reads the real
    supervisor / ledger / evidence libraries **directly**, NOT through the MCP servers (MCP1/MCP2 are
    Dispatch's surface, not the operator CLI's). This keeps ONE action layer shared with the phone cockpit
    (above) and preserves the no-executor invariant.
    **Two foundations both slices build on:**
  - **The STATE VOCABULARY.** Every projected field carries `{value, epistemicState, observedAt, sourceRef,
freshnessDeadline, reasonCode}`, where `epistemicState` ∈ VERIFIED / OBSERVED / CLAIMED / PROPOSED /
    DERIVED / CACHED / STALE / UNKNOWN. Hard rendering rules: **CLAIMED never renders as complete**;
    **UNKNOWN never maps to healthy/green**; anything unproven renders **BLIND, never green**. This is the
    CLI-side expression of the project's own "report `UNOBSERVABLE`, never a fabricated number" doctrine.
  - **The UNIFIED ACTION ENVELOPE.** Every action carries a frozen **target version + ledger index**, actor,
    surface, nonce / idempotency key, expiration, and an **expected postcondition**. The action is
    **rejected if state moved** since the envelope was frozen; on receipt the CLI **holds until the
    postcondition is observed or it times out**; **rollback is a forward compensating op to an exact SHA**,
    never a history rewrite (aligns with WB10 / WB12's append-only rollback).
    **The three slices:**
  - **v0.1 — ✅ SHIPPED (2026-07-31), control repo `ff11244` — the decision loop (walk-away verdict + one
    real action end-to-end).** Five views: Home /
    walk-away-verdict, Attention inbox, Work / claimed-vs-verified, Incident detail, Action receipt. Eight
    command families: `robco`, `status`, `attention`, `work`, `incidents` (incl. `resolve`), `why`,
    `changes --since last-visit`, `action`. **Exactly ONE real action proven end-to-end:
    `incident.resolve`** (with race / idempotency / timeout tests). **Release gate (all must hold):** CLAIMED
    never rendered complete; a stale supervisor renders BLIND; every verdict is explainable by `why`;
    cached/blind state disables actions; a duplicate submit resolves once; TUI / plain / JSON all render from
    ONE projection; and no TUI/MCP path writes the ledger. **Every gate line verified — see the shipped
    record at the end of this entry for how each one is proven, and for the three divergences from the
    ladder that are recorded rather than hidden.**
    **Open extension against this rung (owner add 2026-07-31, NOT built in the shipped v0.1):** the
    read-only **LIST ACTIVE SESSIONS** half of SESSION CONTROL (above) belongs here — it is a projection
    over live sessions, needs no action machinery, and can surface in the Work view. Its title column is
    gated on VERIFYING that the UI name is readable on disk; if it is not, the row degrades to session id
    - working directory. Full spec at **SESSION CONTROL** in this entry.
  - **v0.2 — live work + admission.** Views: Work Board + Session Inspector, Claims-vs-Reality, Trace +
    Evidence, Proposals / Approvals, Usage / Admission. Actions: `session.stop`, `proposal.approve|reject`,
    `usage.mode.set`. **The admission gate's Stop-unattended-AI behaviour is now pinned (owner-approved
    2026-07-31, recorded at CPB2 above): REFUSE new unattended / dispatch-launched AI sessions, PRESERVE
    the owner's own interactive headroom, and never gate saving / committing / pushing, which cost no AI.
    The gate reads its mode from CPB2 — one threshold set, one admission module.** It is also the gate the
    per-job EFFORT TIER (**CPB9**) must pass through. **The admission module therefore returns TWO things,
    not one (folded 2026-07-31): an ALLOW/REFUSE verdict AND an effort CEILING** — the mode's maximum tier,
    per CPB2's EFFORT DIMENSION above. A job asking for more than the ceiling is **admitted at the
    ceiling**, not refused (refusal stays Stop-unattended-AI's job), and the **capped** tier is the one
    that must be recorded — see CPB9 and WB1's `effort` field. **The ceiling binds unattended /
    dispatch-launched work only and never the owner's own interactive session**, the same asymmetry the
    ALLOW/REFUSE half already has. **`session.stop` now has a concrete owner-specified shape (2026-07-31) — see
    SESSION CONTROL (b) in this entry: echo the exact session by NAME + id/pid, explicit confirm, never
    batched, a `process-terminated` postcondition evaluated on `(pid, procStart)` identity, and the
    termination routed through `lib/reaper.js`'s existing single `process.kill` carve-out rather than a
    second kill path. It is the SAME action, not an additional one.** Adds the **USAGE ADMISSION GATE** — session launch asks a shared admission module
    reading the current usage mode (CPB2's Normal / Conserve / Reserve-for-owner / Stop-unattended-AI) →
    ALLOW / REFUSE, the launcher **mechanically refuses**, **fail-closed for unattended AI**; MCP can
    read/propose but never override. Plus a deterministic `robco handoff --copy` Dispatch packet.
  - **v0.3 — resilience / high-risk.** Views: Ship/Gate Room, Survival/Recovery, Law (guards + invariants),
    System Topology, Notifications/Maintenance. Actions: `rollback.run`, `backup.trigger`, `maintenance.*`,
    `notifications.mute|unmute`, `posture.set`. Adds Degraded-Read-Only + Survival + Privacy/screen-share
    modes. **This is where the already-folded controls land in the ladder:** `notifications.mute|unmute` is
    the three-level notify + 2h30m auto-unmute control (above); `rollback.run` fires the WB10 one-click
    rollback; `backup.trigger` fires CPB3.
    **Reconciliation with the already-folded CPB5 additions (kept intact, NOT superseded):** this ladder is
    the BUILD ORDER; the turtle banner, the three-level notification control + 2h30m auto-unmute, and the
    beautiful-TUI aesthetic requirement (all above) are **requirements the ladder must satisfy** — the banner
    ships with v0.1's first screen, notification control lands as v0.3's `notifications.mute|unmute` action,
    and the aesthetic bar applies to every slice.

  **── v0.1 SHIPPED RECORD (2026-07-31, control repo `ff11244`) ──**

  **What it is.** `robco.js` + `lib/cli/` in the control repo, Node-native, **zero dependencies** (no Go,
  no Bubble Tea, no Docker — the ladder's own architecture rule). `npm run robco`. The CLI reads the real
  ledger, the real `status.json` and the real `lib/completion-evidence.js` **directly**, never through
  either MCP server.

  **The two foundations, built first as the ladder requires.** `lib/cli/epistemic.js` is the STATE
  VOCABULARY — every projected field carries `{value, epistemicState, observedAt, sourceRef,
freshnessDeadline, reasonCode}` across all eight states, and the three hard rules are **functions, not
  conventions** (`canRenderComplete` refuses CLAIMED; `canRenderHealthy` refuses UNKNOWN; `isBlind` covers
  CACHED/STALE/UNKNOWN). Two mechanisms make it hold by construction rather than by discipline:
  **`derive()` drops a computed field to its WEAKEST input** (a count derived from a stale reading IS
  stale), and **`applyFreshness()` is the single path by which a field decays with no new read** — which
  is what flips Home to BLIND when the supervisor misses three ticks, with no special case anywhere in the
  view. `lib/cli/envelope.js` is the UNIFIED ACTION ENVELOPE — frozen target version + ledger index,
  actor, surface, expiry, a **derived** idempotency key, and the expected postcondition **as data, not a
  closure**, so it can be written into the ledger receipt and audited later.

  **Release gate — all eight lines verified, each by its own test.** CLAIMED never rendered complete
  (**GATE-1**, red-then-green across all three renderers); a stale supervisor renders BLIND (**GATE-2**,
  plus a degraded ledger at **GATE-2b**); every verdict explainable by `why` (**GATE-3**, including the
  GREEN verdict — a `why` that only works when something is wrong is half a tool); cached/blind disables
  actions (**GATE-4**); a changed target rejects a stale confirmation (**GATE-5**); a duplicate submit
  resolves once (**GATE-6**, three submissions → exactly one resolution); the action stays visible until
  the postcondition succeeds or times out (**GATE-7**, both outcomes); TUI/plain/JSON from ONE projection
  (**GATE-8**); no TUI/MCP path writes the ledger (**GATE-9**, a static scan that ALSO proves the one
  permitted writer does write, so it cannot pass vacuously over a CLI that can't act). Plus **CLI-E2E**:
  the whole action run against a REAL sandboxed ledger and a REAL lock, re-reading the ledger to prove the
  incident actually resolved — a claim that the action works is not evidence that it works.

  **⚠ THREE DIVERGENCES, recorded rather than buried.**
  **(1) The turtle banner asset did not exist. ✅ RESOLVED 2026-07-31 — the asset was real; the search
  was looking in the wrong places.** As shipped at v0.1: a search of the app repo, the control repo, the
  private archive and every planning tree found **no turtle asset under any name**, so the renderer was
  written from scratch to the owner's stated design. **The owner then supplied GPT's original
  `robco-turtle-banner.mjs` from a session UPLOADS directory — outside all four of those trees.** It is now
  the shipped banner, recoloured (control repo `0b8d93b`, full record at the Startup-banner block above);
  the from-scratch art is gone. **The lesson is worth keeping and it is not the one it looks like:** the
  v0.1 finding was accurate _for the places searched_ and the honest thing to do was ship something and say
  so — but "I could not find it" was reported in a way that read as "it does not exist", and those are
  different claims. Protocol 51b still holds (a prose claim about an artifact is a locator, not evidence) —
  with the corollary that a **failed** lookup is also only a locator, and the owner may simply be holding
  the thing.
  **(2) "PowerShell CLI" vs "Node-native ladder"** — resolved in favour of Node, see the note at the top
  of this entry.
  **(3) The `:` palette is a command line, not a menu system** in v0.1 — it re-runs the same dispatcher
  and re-renders the frame. Stated rather than oversold: navigable interactive views are v0.2's Work
  Board / Session Inspector scope, and building half of one here would be a second navigation model to
  unpick later.

  **One flaw found while testing, fixed in the same change** (the control-repo analogue of Protocol 42):
  the end-to-end test called the envelope builder exactly as the CLI does — with no explicit clock — and
  got `missing-now` back, because the correctly-pure envelope layer demands one and the action layer was
  not supplying it. Fixed by anchoring the freeze to the **projection's own build time**, which is more
  correct as well as more convenient (the decision is frozen at the moment of the view the human actually
  looked at), and locked by **CLI-A6**.

  **Verified:** the full control-plane suite green (`node test/run-tests.js`, 0 failures), run through the
  wrapper's own gate per CPB6. Also exercised against the LIVE control plane, where it immediately did its
  job: it surfaced two real push transactions the ledger holds as claimed-but-never-verified, and the
  Work view rendered them `CLAIMED-NOT-VERIFIED` rather than complete.

- **HG1. ✅ SHIPPED (2026-07-30), app repo `31206dd`.** Event-bus hardening — `off`/`once`/dedup +
  per-handler listener-error **reporting** (isolation was already there; the silence was the defect).
  `on()`/`once()` now return an unsubscribe handle, and `emit()` dispatches a snapshot with a `removed`
  tombstone so mid-emit subscribe/unsubscribe can neither skip a sibling nor fire one already removed.
  Landed deliberately **before** 2.9.0's OS services widen bus usage. ⚠ Dedup keys on function identity, so
  it has no existing call site (every shipped subscriber is an anonymous arrow wired once at boot) — stated
  as API-level hardening, not claimed as a live fix. A Protocol 42 footgun (the console-less `vm` harness)
  was found and locked in the same commit. Full entry above.
- **HG2. ✅ SHIPPED (2026-07-30), app repo `aef7da4`.** Bootstrap isolation — per-phase boot guards,
  fatal-vs-degradable. All 51 `window.onload` phases (not the ~45 originally estimated) now run under their
  own `_bootPhase()` guard, in byte-identical order, with severity in one table. Exactly three are fatal
  (`hydrate-state` / `load-ui` / `init-tabs` — the three whose absence leaves nothing on screen); everything
  else degrades, is filed in the shared FAULT ring-buffer, and is surfaced to the user as a transcript line
  rather than console-only. A fatal one paints a self-contained BOOT FAILURE screen instead of the silent
  black screen this item existed to close. ⚠ One deliberate fail-open: an unknown phase name degrades rather
  than kills (the gate catches the typo, Suite 258.15). Landed alongside HG1, both before 2.9.0's OS services
  widen this surface. Full entry above.
- **RB1.** Dispatch inbox projection — full entry above.
- **RB2.** Launch + structured completion receipts — full entry above.
- **RB3.** Mobile-hidden-response detector — a live `fs.watch` watcher, **ON/ARMED by default** (owner
  correction 2026-07-31; explicit `watcher off` only, toggleable from the CPB5 CLI including remotely over
  Tailscale) — full entry above.
- **CPB3.** The "backup-all" script — a single on-demand pass that runs every backup mechanism this project
  has in one go, instead of separate manual invocations. Concretely, at minimum: the archive sync
  (`sync.ps1`, Protocol 48) and the rank-3 control-plane mirror (**CPK3**, now shipped — see SHIPPED below).
  ⚠ **Honest gap, stated rather than papered over:** no planning doc defines this script's exact scope beyond
  that — it is captured here from the owner's go on 2026-07-30, not derived from an existing spec. Confirm
  scope (does it also attempt **OD2**'s auth-folder backup once that is decided?) during build rather than
  assuming.
- **CPB6. ✅ SHIPPED (2026-07-30, folded into the DG2 session on owner directive), control repo `f0ed42a`.**
  Control-repo pushes are now genuinely gated. **The gap that was:** the controlled-push wrapper delegated
  the gate to the _target repo's_ pre-push hook — the app repo has one, so app pushes recorded
  `gate.passed`; the control repo (`RobCo-Control`) had no `gate` script, so a wrapper push of control-plane
  code recorded **`gate.skipped`** — control-plane pushes relied on discipline, not enforcement. **The fix
  (shipped):** the control repo now has `"gate": "node test/run-tests.js"`, so a non-delegated wrapper push
  (`npm run push` → `node controlled-push.js .`) RUNS the full control-plane test suite via the wrapper's
  `runGate` step **before** the push and **aborts on a failing gate**, recording **`gate.passed`** (exitCode
  0), not skipped. The gate lives in the wrapper (single home) so it runs exactly once; the control-repo
  pre-push hook stays routing-only (DG2). **Done, verified:** live GREEN — a real `npm run push` of the
  control repo ran the suite and recorded `gate: PASSED (exitCode 0)` before pushing `f0ed42a`; live RED — a
  deliberately-failing gate on the real control repo produced `aborted: gate-failed` with origin unchanged
  (nothing pushed). Locked by group **PH7** (the control repo is wired to run its real suite as the gate) on
  the identical fail-closed code path proven by **CP2** (gate runs, passes → push) / **CP3** (gate fails →
  abort before push). **What CPB6 does NOT change:** raw-push refusal (DG2) and gate delegation for the APP
  repo are untouched — the app repo still delegates its gate to its own pre-push hook (CPB4 fast path
  intact); CPB6 only concerns the control repo's own pushes.
- **CPB4.** ✅ **SHIPPED `1245712` (2026-07-30, app repo).** _(Was "SHIPPED (this pass)" — replaced at the
  2026-07-31 reconcile: "this pass" is meaningless to anyone reading later, which is exactly the rot a
  reconcile exists to catch. **Exercised live twice on 2026-07-31**, gating both of that day's doc-only
  commits.)_ Gate-scoping — a doc-only fast path for the pre-push gate. When a
  commit's diff touches ONLY
  docs (`QUEUE.md`, `QUEUE_LOG.md`, `planning/**`, `*.md`, README/CHANGELOG/ARCHITECTURE), the pre-push
  hook skips the Playwright render/boot-smoke + app-integrity checks and passes automatically; any diff
  touching app code (`index.html`, `css/**`, `js/**`, `sw.js`, `tests/**`) still runs the FULL gate exactly
  as today — no relaxation there. **Why:** those checks protect the app; they give zero protection to a
  planning-doc edit, and a forced 3-6 minute Playwright run on every queue push is what makes a manual
  owner-authorized `--no-verify` tempting on doc-only pushes — this closes that gap properly instead of
  normalizing the workaround. **Ties into the existing gate-scoping precedent** from the blind-review pass
  (Protocol 41's concurrency fix, which already scopes lint to the git-tracked manifest instead of a bare
  `eslint .`) — same principle, applied to the push-boundary gate instead of the lint step. **Done means:**
  a commit whose full diff is docs-only passes the pre-push hook without running Playwright/render/
  boot-smoke, verified red-then-green (a doc-only diff passes fast; a diff touching even one app file still
  runs the full gate); no bundled code+doc commit can slip through the fast path. **Shipped as:**
  `scripts/gate-scope.js` (reads the git pre-push payload, prints `DOCS_ONLY` only when every changed file
  is proven a doc, else `FULL` — fail-closed) + `gate:docs` mode in `scripts/gate.js` (static + Node runner,
  NO browser) + the pre-push hook wiring. **Every "Done means" criterion met**, incl. the four required
  cases (doc-only skips; one code file forces full; mixed forces full; a renamed/moved/deleted code file
  forces full — via `git diff --no-renames`), locked by **Suite 253** (static wiring + unit classification +
  a real-git-repo integration proof). Full record in the SHIPPED section below.
- **CPB7 — Session circuit breaker: failure CLASSIFY + recovery budget (NET-NEW, folded 2026-07-30,
  multi-model round; the FORMALIZED version of the thrashing detector + reaper — EXTENDS DG1/REF4 + REF2/DG3,
  it does not replace them).** On a session failure, classify the stderr / test output into two classes:
  **TRANSIENT** (`ETIMEDOUT` / `529` / a Tailscale drop → exponential backoff, draining a wall-clock time
  budget) vs. **SEMANTIC** (syntax error / test-logic failure / SHA-mismatch → feed the error back to the
  session, costs 1 of a ~2-attempt semantic-correction budget). **On semantic-budget exhaustion the breaker
  trips OPEN:** SIGTERM the session, `git stash` + reset the worktree to the last clean SHA, the supervisor
  logs a `CIRCUIT_BREAKER_TRIPPED` event, and a quick-ack ping (CPB8) goes to the owner. **The genuinely NEW
  part is the CLASSIFY step** — transient-vs-semantic triage with separate budgets; the trip-open recovery
  itself is the reaper's proven `(pid, procStart)` kill (REF2) plus the WB12-style bundle-then-reset.
  **⛔ Invariant guard — the trip-open KILL/RESET authority stays DATA-GATED exactly as DG1 governs the
  thrashing detector.** The classify + budget-tracking + alert path is buildable now and runs
  **shadow/alert-only**; actually SIGTERMing a session and resetting its worktree is a kill action that
  promotes only on the same evidence bar as DG1 (never auto-kill on a guess — the standing thrashing→kill
  doctrine). **OWNER RULING (2026-07-30) — CONFIRMED.** The owner has stamped this data-gated posture as a
  decision on file, not a default: the trip-open **KILL/RESET authority** (auto-SIGTERM a spiraling
  session, plus a `git stash`/reset of its worktree to the last clean SHA) **remains DATA-GATED /
  shadow-only and is NOT to be built as an autonomous killer.** The buildable-now half is unchanged from
  as-filed — classify (transient vs. semantic) + recovery budgets + alerting, all **shadow-only**. The
  kill/reset authority waits behind the data-gate (the same evidence bar as **DG1**, the thrashing
  detector) until there is real evidence it will not false-fire — consistent with the standing
  **process-kill safety rule** (never force-kill a process without echo-and-confirm). Recorded as the
  owner's confirmed decision so the gating is not re-litigated as a mere default. **Done means:** transient-vs-semantic classification is proven against real failure outputs;
  budgets drain and the breaker _would_ trip at exhaustion (shadow); the trip-open action is gated behind
  DG1's promotion bar, not live on first build.
- **CPB8 — Quick-ack bot: typed-proposal-only owner approvals (NET-NEW, folded 2026-07-30, multi-model
  round; BOTH GPT-5.6 and DeepSeek converged on it — high-priority QoL).** A messenger bot (Telegram, or a
  Tailscale webhook receiver) whose **Approve button NEVER executes, merges, or touches git.** It writes a
  rigidly-typed proposal JSON to `pending_proposals/`; the supervisor **reads it on its next 5-minute tick**,
  validates it against current state (**SHA unchanged** since the proposal was formed), appends the approval
  event, and the control plane actuates through the normal path. **This respects both standing invariants
  exactly:** the AI never actuates, and the supervisor stays the **sole ledger-writer** — the bot is an input
  surface for a typed proposal, not an executor. It is a second surface onto the SAME approval/proposal
  system as **RB1**'s inbox and **MCP1**'s `proposal.submit` (one proposal model, not a parallel one —
  Protocol 22). **Done means:** an owner tap produces only a typed `pending_proposals/` entry; the supervisor
  validates SHA-freshness and appends the approval; a stale-state proposal is refused; nothing the bot
  receives ever writes the ledger or acts directly.
- **CPB9 — the APPROVALLESS / HEADLESS LAUNCHER (NEW ID, filed 2026-07-31). ⬜ NOT IN THIS OWNER-GO BATCH —
  no spec, no owner go on file; filed because three shipped items already depend on it and it had no home.**
  ⚠ **This ID exists because the completeness sweep found a real gap, not because new work was invented.**
  "The approvalless/headless launcher" is referenced three times elsewhere in this file as the place other
  work _lives_ — CPB1's dormant usage-capture half, ACT2's deliberately-omitted capture, and CPB5 v0.2's
  admission gate all point at it — but **it had no entry, no ID, and no earn-condition anywhere.** That is
  precisely the vague-drawer state Protocol 50 (a-form) forbids: work cannot be "filed onto" a thing that
  does not exist, and three real items were pointing into thin air. Filing it fixes that; **nothing here is
  approved to build.**
  **Why it matters (the dependency it already carries).** No launcher writes measured per-job usage into
  the ledger, which is the single reason **CPB1**'s budget alert is DORMANT-UNTIL-FED rather than live, and
  the reason ACT2 shipped without a capture half (building a capture path with no producer would be faking
  a data source). Whatever CPB9 turns out to be, it is the producer those checks are waiting on.
  **FOLDED IN — EFFORT TIER PER JOB (owner idea, 2026-07-31).** The launcher should support a **per-job
  effort tier**, up to the high tiers (**ultracode**) for gnarly, high-stakes builds, **GATED by the usage
  admission gate** (CPB5 v0.2, reading CPB2's mode) so an unattended high-effort run cannot blow the cap.
  **The rationale, recorded because it is the whole argument:** ultracode is slow, deep and self-reviewing,
  which is exactly the shape that suits **fire-and-forget headless work** — nobody is watching, so depth
  costs wall-clock rather than attention, and the self-review replaces the human in the loop. But that same
  property is why it **must** sit behind the gate: an unattended run that is both long and expensive is the
  worst possible thing to leave unsupervised against a shared cap. So the two are one decision, not two —
  **the tier is what makes headless work worth doing, and the gate is what makes it safe to do.**
  At **Stop-unattended-AI** the gate refuses the launch outright regardless of tier (CPB2, above); at the
  restrictive-but-not-stopped modes the tier is the natural thing for admission to negotiate down. **That
  "negotiate down" is now specified rather than gestured at — see the EFFORT DIMENSION under CPB2 above
  (owner-approved 2026-07-31): a per-mode tier CEILING, with the refusal reserved for the mode that already
  refuses everything.**
  **REQUIREMENT — VERIFY THE APPLIED TIER PER JOB (owner-approved 2026-07-31). Prove the tier was set; do
  not assume it.** Requesting a tier and recording that you requested it is not evidence the job ran at it.
  Every job must carry the tier it was **actually observed to run at**, per job, at the epistemic strength
  that observation genuinely earned — the same "verify, don't assume" discipline this project used for
  `is_error` on tool results, the `fh`/`sd` usage mapping, and CPB5's session-title column.
  **This maps exactly onto the shipped state vocabulary (CPB5 v0.1, `ff11244`), which already has the right
  words:** a tier the launcher merely asked for, or that the session merely acknowledged, is **CLAIMED**; a
  tier corroborated by an independent observation is **VERIFIED**; and if nothing can corroborate it the
  honest record is **UNOBSERVABLE — never a tier asserted because it was requested.** A CLAIMED tier must
  never render as a confirmed one, which is the vocabulary's first hard rule and needs no new machinery.
  **Why this is load-bearing rather than bookkeeping:** the admission gate is doing arithmetic against a
  shared cap, and it is doing it **on the tier it believes the job is running at**. A job that silently ran
  at a different tier than requested breaks that arithmetic in **both** directions — burning far more of the
  cap than the gate budgeted for if it ran higher, or quietly wasting an unattended window at a depth the
  work did not need if it ran lower. An unverifiable tier makes the gate's own numbers untrustworthy, which
  is the one thing the gate cannot afford.
  **Gated on / cross-ref: SP2** (below, in SPIKES) — the spike that determines whether a launch prompt can
  set the tier at all, and which names the candidate probes for corroborating it. If SP2 comes back
  negative, this requirement does not disappear: it applies to whatever mechanism replaces prompt-embedded
  effort.
  **✅ UN-GATED (2026-07-31) — SP2 mechanism (1) came back POSITIVE, so the tier is REACHABLE and this
  feature does not need rescoping.** Full write-up: `planning/control-plane/EFFORT_CONTROL_SPIKE.md`.
  Four things this hands CPB9, and the last two are hard build requirements, not notes:
  - **The mechanism is TWO MESSAGES, not one.** A message that is exactly `/effort <level>` and nothing
    else (0 turns, session idles), **then** the task as a separate follow-up. **⛔ Inlining the directive
    with the task makes the slash command swallow the task — 0 turns, nothing runs.**
  - **⭐ WAIT FOR THE ACKNOWLEDGEMENT AND IDLE STATE before sending the brief — this is a sequencing
    requirement, not a message-count one.** _Session-configuration slash commands are standalone turns._
    Firing both messages back-to-back is a **race**, and losing it re-creates the inline failure by
    accident — which is the single most likely way an unattended launcher gets this wrong. **Wait on the
    acknowledgement, never on a timer.**
  - **The clean launcher-flag route is PARKED, not available.** `start_code_task` exposes no effort field
    (`cwd`/`model`/`prompt`/`title` only). A flag would make the tier part of the launch **transaction**
    rather than a two-step protocol — **atomicity, not capability** — and its earn-condition is this
    item's own owner go + spec. ⚠ Protocol 51(a): that schema is Dispatch-origin and unverified from the
    session that recorded it — **re-read it here at build time** before designing around it.
  - **⛔ "0 turns" MUST be a RED outcome, never an empty success.** The inline failure is a **silent
    no-op**, not an error: a session that consumed a launch slot, reported back, and did nothing. For an
    unattended launcher that is the single worst failure shape available, and it is now known to be
    reachable by one plausible mistake in prompt construction.
    **Where the verified tier is RECORDED: the WB1 envelope's `effort` field** (see WB1 above) — the tier
    and its verification state ride the provenance envelope every job record already carries, rather than
    becoming a second place the fact lives (Protocol 22). The admission gate's arithmetic and the job's own
    record then read the **same** tier from the **same** field.
    **What would earn it a slot (stated, per Protocol 50 a-form):** an owner go plus a spec — at minimum what
    "approvalless" is allowed to mean, how a job is described to it, and what it writes to the ledger
    (measured per-job usage among it, which is what unblocks CPB1). Until then it stays an unversioned,
    dependency-bearing placeholder rather than a queued build.

## ACTIVATION SWITCHES — built, waiting on the owner to flip on

- **ACT1.** Register the daily-housekeeping pass (**CPK5**'s daily half — `scripts/daily-housekeeping.js`)
  as a Windows scheduled task. **Note — the rank-3 half of this is already done:** CPK3's activation commit
  (`78acfd5`) wired the backup mirror into daily housekeeping AND registered its own scheduled task (see
  SHIPPED below) — but ACT1 itself, registering the FULL daily-housekeeping pass (ledger maintenance,
  adapter/schema drift, state hygiene, the README-staleness nudge below), is still open. **Folded in
  (owner-approved, 2026-07-30): a doc/README staleness check.** As part of the same daily/weekly housekeeping
  pass, add a low-frequency automated nudge — via the same **incident/backup-unhealthy alert path** (the
  Pushover "backup unhealthy" alert already approved in the
  [convergence review](planning/control-plane/reviews/CONVERGENCE_2026-07-28.md)) — if a repo's `README.md`
  or another key doc looks out of date relative to its recent changes (e.g. commits touching a surface with
  no matching doc update in the same window). **The PRIMARY mechanism does not change:** Protocol 2 (update
  the doc in the SAME commit as the change it describes, `CLAUDE.md`) stays the enforcement point — this
  housekeeping check is only the drift **safety net**, catching a Protocol 2 miss after the fact, never a
  replacement for the same-commit discipline. **Record this plainly: keeping READMEs current is NOT a new
  trigger word** — it is Protocol 2 plus this housekeeping check, and no session should read this item as
  license to defer a doc update to a nightly job. **REF1 (the alert's session-awareness) is now shipped** —
  see SHIPPED below — so this nudge no longer waits on that; **see REF3** for the auto-verdict tracking this
  same daily/weekly pass owes the data-gated promotions.
- **ACT2. ✅ SHIPPED (2026-07-30), control repo `7ca220c`.** The write-side kernel actions — **CPK2**'s
  publisher and **CPK4**'s continuation-packet generator — are now wired into the live supervisor loop, via
  a new decision layer `lib/write-side.js`. **The two halves are activated to deliberately different
  depths, and the asymmetry is the design:** continuation packets are **FULLY LIVE** (a packet is a derived
  local JSON file — it actuates nothing, so it sits inside the write scope the supervisor always had),
  while publishing is **SHADOW, OFF BY DEFAULT** — readiness is detected, recorded and alerted every run,
  but the actuation is gated on the owner's `state/auto-publish.json` holding a literal `{"enabled": true}`
  (absent by default; unreadable/malformed/non-literal-true all fail CLOSED). **Why the split, recorded so
  it is not re-litigated:** `publishJob()` moves a real remote ref, and handing an unattended 5-minute
  scheduled task that standing authority is a different class of change from writing a local JSON file —
  **DG2** required ten observed clean wrapper pushes before it would merely _refuse_ a raw push, and
  **CPB7**'s kill/reset authority is owner-confirmed data-gated rather than built as an autonomous killer;
  an authority to _perform_ pushes earns at least the same care. Flipping it on needs **no code change**,
  which is exactly what keeps ACT2 an activation switch rather than a deferral. **DORMANT UNTIL FED** (the
  CPB1 posture): both halves key off jobs and no launcher writes a manifest yet, so today both report zero
  candidates of **zero jobs tracked**. ⚠ **Deliberately NOT in scope, stated rather than quietly dropped:**
  the per-job **usage-capture** plumbing CPB1 waits on (spike §4) is _not_ part of this — capture needs a
  launcher to capture _from_, and there is no launcher; building a capture path with no producer would be
  faking a data source. It stays with the approvalless/headless launcher work (now tracked as **CPB9**). Full record in the SHIPPED
  section below.
- **DG2 + CPB6. ✅ SHIPPED (2026-07-30, same session).** Push-guard enforcement (raw-push refusal) is ON in
  both the app and control repos — a raw `git push` is refused; `npm run push` is required. Break-glass:
  `ROBCO_PUSH_OVERRIDE="<reason>"` (logged) or `git push --no-verify` (absolute). **CPB6 also shipped
  alongside it:** the control repo now runs its own test suite as the wrapper's gate (records `gate.passed`,
  aborts on failure) — so a control-repo push is both routed AND genuinely gated. Full records in Data-Gated
  (DG2) and READY TO BUILD (CPB6) below.
- **(later) DG3.** Graduate the reaper from shadow to actually reaping — see Data-Gated below.

## OWNER DECISIONS

- **OD1.** Rank-3 (**CPK3**) backup cadence — daily vs. every supervisor run — and the restore-test cadence
  (weekly?). **Practically resolved by default:** CPK3 shipped and activated using the sane daily default
  this entry originally allowed ("build can start with a sane default and be tuned later") — the Ledger
  repo shows the mirror actually running (`d001a38`, `79afc2e`). OD1 stays open only as a future tuning
  question, not a blocker.
- **OD2.** Whether to set up the auth-folder (`C:\Dev\auth`) secure backup now — its own encrypted vault /
  password manager, **never a git repo** (the folder holds live secrets: Pushover creds, the Google OAuth
  client secret). Flagged as a separate problem in `RANK3_BACKUP_REPO_SPEC.md` ("flag, don't fold in") —
  still undecided.

## SPIKES / OWNER-IN-LOOP

- **SP1.** Live-confirm the two documented-contract-only Pushover alerts — "a session needs your input"
  (the `Notification` hook) and "session died/errored" (the `StopFailure` hook) — by actually watching one
  fire. Both alerts shipped 2026-07-29 (`f14499d`/`bac032a`) but are unverified-live;
  `CONTROL_PLANE_STATUS.md` §2 lists this as the first item in the current build batch.
- **(RB4's own spike, not a separate ID)** — the Cowork-loads-a-custom-MCP load-spike ("MCP-load-check"),
  RB4's prerequisite first step (confirm Cowork actually loads a custom local MCP server and Dispatch can
  call its tools) before any of RB4's seven tools are built. Kept inside RB4 per that entry's own text;
  cross-referenced here only so a consolidated read doesn't miss it.
- **RB5.** Bounded `send_message` WAKE spike — full entry above; **BLOCKED BY PLATFORM**, owner approval
  required before running regardless.
- **RB6.** Pushover → Dispatch Android deep-link test — full entry above.
- **SP2. 🔄 HALF-ANSWERED — mechanism (1) CONFIRMED POSITIVE 2026-07-31; mechanism (2) still open. (NEW ID,
  filed 2026-07-31.)** Full write-up: **`planning/control-plane/EFFORT_CONTROL_SPIKE.md`** (local-only).
  **✅ THE ANSWER (mechanism 1): Dispatch CAN set a spawned session's effort tier, per session, at will —
  but NOT the way this spike assumed it would be done.** The working mechanism is **two messages**: send a
  message that is **exactly `/effort <level>` and nothing else** (it parses as a slash command, runs **0
  turns**, and the session idles), **then** send the real task as a **separate follow-up** to the same
  session, which runs at that tier. **⛔ INLINE FAILS:** `/effort <level>` on the same message as a task
  makes the slash command **swallow the whole task as its argument** — 0 turns, **nothing runs at all**.
  That failure is a **silent no-op, not an error**, which is the shape an unattended launcher is worst at
  noticing, so **CPB9 must treat "0 turns" as RED, never as an empty success.**
  **⭐ AND THERE IS A SEQUENCING RULE, not just a message-count rule — this is the whole operational fix in
  one line:** _session-configuration slash commands are **standalone turns**; **wait for the command's
  acknowledgement and idle state** before sending the work brief._ Two messages fired back-to-back without
  waiting is a **race**, not the pattern — an unattended launcher that blasts both is the most likely way to
  re-create the inline failure by accident. **CPB9 must WAIT on the acknowledgement, not on a timer.**
  **THE LADDER (ground truth — read off the actual UI, not inferred): Low** (quick replies to simple
  questions) · **Medium** (light, casual tasks) · **High = DEFAULT** ("balanced for everyday work") ·
  **Extra** ("complex, detailed work") · **Max** ("the hardest problems, takes longest") · **Ultracode**
  ("big coding tasks — Claude plans and runs the workflow"; multi-agent self-review, slowest and most
  usage-hungry). **Reserve Max/Ultracode for gnarly, high-stakes, wrong-call-is-expensive work; default High
  is right for routine work** — which is the selection rule the admission ceiling then enforces from above.
  **The FALLBACK, still valid and worth keeping:** where the two-message pattern is not usable, Dispatch hands
  the **owner** the ready-to-paste prompt plus exactly which **Model + Effort** to use and he launches it
  himself. That was the standing workflow _before_ this finding (when the tier was believed unreachable); it
  is now the fallback rather than the default, and it is deliberately **not** deleted.
  **Read the literal question and the decision it gates as two different answers, because they diverge:**
  as worded — an effort directive _embedded in_ the launch prompt alongside the task — the answer is
  **NO**. The decision it actually gates — _is prompt-level per-session effort control reachable through
  the programmatic path at all?_ — is **YES**. CPB9's effort tier is therefore **reachable**, and does not
  need rescoping.
  **The epistemic split, stated because SP2 demanded it and it is the part most likely to be rounded up:**
  **the tier-SET is VERIFIED** — the **harness itself** printed `Set effort level to max (this session
only): …`, which is a **system** state-change report naming both the level and its **per-session scope**,
  not the session's own account of itself, so it clears the "accepted / echoed / acknowledged" bar this
  spike expected to be stuck at. **But whether a high tier materially deepens reasoning is CLAIMED, not
  VERIFIED** — that is the **tool's own description** of the tier, and **no session can introspect its own
  thinking budget**, including the one that ran this. ⛔ **"Effort control is confirmed" must never be
  carried across into "high-tier runs are measurably better" — nothing here establishes that, and nothing
  here tried to.**
  **⭐ HOW THIS ANSWER WAS ACTUALLY REACHED — an over-claim, corrected from OUTSIDE the loop. Recorded
  because the arc is the most valuable part, and because it is the reason the epistemics above are worded so
  carefully.** The first run of this experiment tested **only** the inline form, watched it fail, and
  concluded **"definitively no — effort can't be set from Dispatch"** — then wrote that to memory **as
  established fact**. It was wrong. The **owner** pushed back immediately (you can send _two_ messages), and
  **GPT** sharpened the critique: the experiment had disproved only _same-message injection_, never tested a
  command-only first message, and never established that effort was merely a global desktop setting. The
  clean re-test confirmed the two-message pattern. **⛔ The transferable lesson, which is bigger than effort
  tiers:** _a null result under ONE configuration is not a general "no."_ When a mechanism has an obvious
  variant (one message vs two, inline vs flag), **test the adjacent configuration BEFORE writing a conclusion
  to memory** — and qualify null results as "failed under config X", never "definitively no". **A premature
  "definitively" in memory is worse than no memory at all: it stops a future session from ever retrying the
  thing that actually works.** That is precisely what nearly happened here, and it was caught only because
  the correction came from **outside** the reasoning loop — the owner and a second model, not the session
  auditing itself.
  **🏛 MUSEUM VALUE — flagged, not built.** This is a clean, self-contained **over-claim → external
  correction → re-test → confirmed → doctrine adopted** arc, with the correction arriving from outside the
  system. That is unusually good exhibit material for the museum program (**P** / **P6** AI-collaboration
  exhibit, and **PM1**'s retrospective) — the system's own reasoning being audited and corrected, with the
  fix becoming standing workflow. Recorded here so the arc is not lost; **no museum work is queued by this
  note.**
  **⚠ Still OPEN — mechanism (2), the `ultrathink` keyword, was NOT tested.** SP2 stays open on that half;
  it is a separate mechanism and assuming it behaves like (1) is exactly how this spike said a negative
  result gets missed. **The interactive control arm is now MOOT for mechanism (1)** — it existed to
  disambiguate a **negative** ("the launch path strips it" vs "the directive does nothing anywhere"), and a
  positive result needs no such disambiguation. It is still required if `ultrathink` comes back negative.
  **⚠ And a launcher gap worth knowing: `start_code_task` exposes NO effort field** — schema is
  `cwd`/`model`/`prompt`/`title` only, no args passthrough, no env. The clean "launch it at a tier the way
  you launch it with a model" route **needs a launcher change and is PARKED, not built** (earn-condition:
  CPB9's owner go + spec). It buys **atomicity, not capability** — the two-message pattern has a real seam
  where a launcher crashing between the messages leaves an idle session behind. Protocol 51(a): that schema
  is **Dispatch-origin, accepted but not independently verified** — **re-read it at CPB9 build time.**
  **── The ORIGINAL scope, kept in place (Protocol 49 discipline — the reasoning is not deleted just
  because the answer arrived) ──**
  The empirical
  question **CPB9's effort-tier-per-job feature stands or falls on**: when Dispatch starts a session
  **programmatically**, does an effort directive embedded in the launch prompt actually engage that effort —
  or does it only work when typed live in an interactive session?
  **Two mechanisms to test, separately** (they may not behave the same, and assuming they do is how a
  negative result gets missed): **(1)** a `/effort <level>` line in the launch prompt, and **(2)** the
  `ultrathink` keyword in the launch prompt. Each tested through the real programmatic launch path, and each
  compared against the same directive typed live in an interactive session as the control — without that
  control arm the spike cannot tell "the launch path strips it" from "the directive does nothing anywhere".
  ⚠ **THE MEASUREMENT CAVEAT, and it is the hard part — state it in the result, do not let it be forgotten
  by the time someone reads the answer.** Thinking budget is **very hard to observe from outside the
  session.** This spike can far more easily establish that a directive was **accepted / echoed /
  acknowledged** than that the session **definitely ran at that budget** — and those are not the same
  claim. An acknowledgement is the session's own account of itself, which this project already has a word
  for: **CLAIMED, not VERIFIED** (CPB5 v0.1's state vocabulary, shipped `ff11244`). So the spike's own
  finding must be recorded at the epistemic strength it actually earned, never rounded up to "it works".
  **Probes worth CHECKING for something stronger than an echo — named as leads, NOT as assertions that any
  of them carries the answer:** the per-tool transcript store (`lib/adapters/transcripts.js` /
  `paths.transcriptsRoot()`), which the thrashing detector already replays; the usage file the supervisor
  reads every tick (a high-effort run should move it detectably more than a low-effort one on the same
  task); and wall-clock/output-shape differences between the arms. Each is a **proxy**, and the write-up
  must say so — a convincing proxy is still not a budget readout.
  **Why it exists / what it decides:** it decides whether **"ultracode headless via the launcher" is
  achievable through the launch path at all.** Both outcomes are useful and BOTH must be planned for, or
  this is only half a spike: **if YES**, CPB9's effort tier can be a prompt-level per-job setting. **If NO**
  (prompt-embedded effort is interactive-only), then either the tier needs a different mechanism entirely —
  a launcher flag / CLI argument / config rather than prompt text — or high-effort headless work is not
  reachable that way and CPB9's effort-tier feature has to be rescoped rather than quietly built on an
  assumption that never held.
  **Owner-in-loop** (it needs real launches observed), and **doc-only until run** — nothing here is built.
  _(That "until run" now applies only to mechanism (2); mechanism (1) ran and is answered above. Still
  doc-only either way — **nothing was built by the answer**.)_
  **Cross-ref: CPB9** (the feature it gates) and **CPB2 / CPB5 v0.2** (the admission gate any tier must pass
  through regardless of how it is set), plus the **standing effort workflow** the answer earned —
  `planning/control-plane/EFFORT_CONTROL_SPIKE.md` §7, and the ⛔ **DEAD** watcher-adjusts-effort idea at §8.

### Standing workflow — THE TRIGGER WORDS + the CHECKPOINT ritual (owner, 2026-07-29; refined 2026-07-31)

⚠ **Folded into the repo 2026-07-31 because it was NOT here at all** — this ritual governs how nearly every
session ends, and it existed **only in Dispatch's agent memory**. That is precisely the failure Protocol 50
exists to prevent (_"everything planned should live in queue, not just remembered by you"_), and it survived
this long because a workflow that runs correctly every day never announces that it is unrecorded. Recorded
here at its point of use; **the memory copy stays as the operational note, this is the durable one.**

**`checkpoint`** (also honours **`wrap`** / **`save state`**) — the owner's one word for the full update
ritual, so he never has to enumerate the steps. **In exact order** (memory BEFORE sync, because the sync
mirrors memory):

1. **Fold AND RECONCILE the queue** — `QUEUE.md` + `QUEUE_LOG.md` must end **TRULY CURRENT, not just
   larger**. Folding new items is only half. Reconcile against reality: **(a)** mark every SHIPPED item
   DONE, **verified against git log / SHAs / the ledger — never assumed**; **(b)** mark DROPPED/superseded
   items **DEAD with the reason**; **(c)** **RE-ORDER** what remains by current priority; **(d)** **PRUNE**
   stale, duplicate or obsolete entries. ⛔ **Appending without reconciling lets the queue rot into a pile
   that no longer reflects reality** (owner flag, 2026-07-31 — raised because it had started happening).
2. **Reconcile the planning docs** — control-plane spec / status / convergence / anything this session made
   stale.
3. **Commit + push EVERY repo** — control (`_RobCo-Control`) and app (`!RobCo-UOS`, `origin/dev`) — and
   **verify each push actually LANDED on its remote** (`git ls-remote`), not merely "committed". ⭐ **That
   verify step exists because of a real incident:** two unpushed control-repo commits were lost track of on
   2026-07-29 by trusting "committed" as "pushed".
4. **Update agent memory** — write the session's decisions and findings **FIRST**, so step 5 captures them.
5. **Run the archive sync** — `_RobCo-Archive/sync.ps1`, **by absolute path from a non-archive cwd**
   (Protocol 48). ⛔ **If it refuses because a genuine active writer holds a lock: report and STOP — never
   force it, never kill anything.**
6. **Report** — every repo SHA **plus the archive SHA**, and an **explicit statement of what IS backed up
   versus anything that is not**.

**Companion triggers:** **`status`** (or `standup`) — **read-only**: report queue position, live
jobs/sessions, control-plane health, and backed-up-vs-not. Changes nothing. **`sync`** — the **mechanical
half only**: push every repo, verify each landed, run the archive sync. No folding. **Control triggers:**
**`watcher on` / `watcher off`** (RB3 — ⚠ **now ARMED by default**, see RB3; goes live only once RB3 is
built) and **`supervisor on` / `supervisor off`**, which map onto the existing `state\DISABLE` kill-switch
and **work today**. ⛔ **A destructive action must NEVER be a bare trigger word** — always an explicit ask
with confirmation.

**Automation split:** the **mechanical half** (steps 3 + 5) is meant to become the **`backup-all` script**
(**CPB3**, AI-free, one command, queued) with the **daily-housekeeping pass** as its natural automatic
home; the **judgment half** (steps 1, 2, 4) stays with Dispatch and is not automatable.

### Standing workflow — DISPATCH SETS EFFORT PER SESSION (adopted 2026-07-31, from SP2's answer)

**Dispatch sets a spawned session's effort tier at will, the same way it already switches model per stage.**
Protocol 8 has Dispatch selecting the **model** per stage and switching mid-run as the work demands; the
effort **tier** is the second dial on that same panel, and SP2 established it is a dial that can actually be
turned. Four parts, and they are a workflow rule rather than a build:

1. **The pre-build PLAN decides the tier per spawned session** — chosen at plan time alongside the model, not
   improvised at launch. A tier is a **budget** decision, and budget decisions belong in the plan.
2. **Dispatch ANNOUNCES the tier on every change**, in the same breath as a model switch. A silent tier change
   makes the effort budget unauditable — and since the tier-set is the **one** part of this that can be stated
   with real confidence (see SP2's epistemic split), there is no excuse for not stating it.
3. **The mechanism is the TWO-MESSAGE pattern** (`/effort <level>` alone, then the task as a separate
   follow-up) until a launcher flag exists. **⛔ Never inline** — the slash command swallows the task and
   **nothing runs**.
4. **Usage caps it.** Once CPB5 v0.2's admission gate exists, the tier is not Dispatch's alone to pick: the
   gate returns an **effort ceiling** with its verdict and negotiates the tier **down** as usage climbs — no
   Max/Ultracode in a conserve-class mode (CPB2's EFFORT DIMENSION). Unattended work only; never the owner's
   own interactive session.

⚠ **Its eventual home is `CLAUDE.md` Protocol 8**, beside the model-per-stage rule it extends. **Flagged, not
done** — this fold was scoped to the QUEUE and the control-plane docs, and editing a protocol is the owner's
call, not a side effect of a doc pass. Recorded here so it is a live rule in the meantime rather than a
remembered one (Protocol 50).

### Logged decision — "a WATCHER changes the effort tier" is ⛔ DEAD (2026-07-31)

**Dropped, superseded by confirmed two-message control (SP2, above).** The idea that some watcher process
would observe a running session and adjust its effort tier is dead, and is recorded as a decision rather than
left as an absence so it cannot quietly return as a good idea.

**Why:** effort control turned out to be **direct, per-session, and system-confirmed at the moment it is
set**. A watcher-mediated version is strictly worse on every axis — it adds a live process; it acts on
**inference** about a session instead of an instruction to it; and it would change a tier **mid-run** with
none of the confirmation the direct mechanism gets for free. **Direct is synchronous and confirmed; the
watcher version would be asynchronous and unverifiable.** That is the whole argument.

⚠ **Divergence, recorded rather than smoothed (Protocol 51(c)) — and CORRECTED once, which is the more
useful record.** This fold was asked to mark an **existing** QUEUE/planning entry DEAD. **No such entry
existed in the QUEUE or in planning** — `QUEUE.md`, `QUEUE_LOG.md` and all of `planning/` were searched and
none carries a watcher-adjusts-effort item, so **nothing was struck through; this block IS the decision,
created new.** ⛔ **The correction:** the first version of this block also claimed the orchestrator's memory
held nothing — **that was wrong, and the mistake is worth keeping.** The search covered the wrong store (this
project's own `memory/`), not **Dispatch's** agent memory, which does carry the instruction as item **(d) DROP
the watcher-escalation idea** inside its `effort-handoff-workflow` note. It was found only when the Protocol
48 archive sync mirrored that store. **The substance is unchanged** — Dispatch's memory records the _decision
to drop_, not a live proposal, so there was still no entry anywhere proposing the thing — but "I searched
memory and found nothing" and "I searched the wrong memory" are different claims, and **Protocol 51(b) is
exactly the rule that says memory is a locator to be resolved deterministically rather than asserted from.**
**The only watcher in this queue is RB3**, the mobile-hidden-response detector, which is unrelated and is
**NOT** affected by this decision — a future session must not read this block as touching RB3.

## DATA-GATED — wait on measured evidence, not a decision (self-collecting via REF3's auto-verdict)

- **DG1.** Thrashing: shadow → actual kill. Needs a clean shadow stretch (proves it flags real loops, never
  cries wolf) before it is trusted to terminate a session; kill would use the proven `(pid, procStart)`
  re-verify-at-instant + a self/owner deny-list. Currently shadow-only, recalibrated `15c17d0`. A further
  precision fix (not a promotion) → **REF4**, below.
- **DG2. ✅ SHIPPED + ACTIVE (2026-07-30) — raw-push refusal is ON in both repos.** Push-guard enforcement
  (raw-push refusal, Stage 2). Fed by **ACT3** (✅ shipped 2026-07-30 — the counter did its job); the ≥10
  clean-wrapper-push gate was **MET at 10/10 (2026-07-30)** and read **11/10** at activation (`npm run
push-count` in the control repo, live off the ledger). **Owner explicitly greenlit activation
  (2026-07-30):** "turn on push guard enforcement." A raw `git push` — one NOT routed through the
  controlled-push wrapper (`npm run push`) — is now **refused** by a pre-push hook in the app repo AND the
  control repo, telling the user to run `npm run push`. **How it works:** the wrapper sets
  `ROBCO_PUSH_WRAPPER=1` and holds the L4 push lock; the guard (`_RobCo-Control/code/scripts/pre-push-guard.js`)
  refuses unless BOTH the env token is present AND the L4 holder is a live process-ancestor of the push
  (neither is forgeable alone). App-repo wiring: `scripts/pre-push` resolves the guard on the
  `../_RobCo-Control/code` sibling (or `ROBCO_PUSH_GUARD`) and `[ -f ]`-guards it so a checkout without the
  control plane (a public clone) is never blocked; the git pre-push payload is captured once and fed to BOTH
  the guard and `gate-scope.js` (a Protocol-42 stdin-multiplex fix — a naive second reader would EOF and
  silently defeat CPB4's doc-only fast path). Locked by **Suite 255** (app) + group **PH** (control-repo hook
  wiring) on top of the existing end-to-end behaviour proof (control group **PG**: raw refused, wrapper
  allowed, override logged).
  **🔑 MANDATORY break-glass — the owner can NEVER be locked out** (two independent escapes, both documented
  in the hooks + README): (1) `ROBCO_PUSH_OVERRIDE="<reason>" git push` — allowed AND recorded to the ledger
  as a `push.override` event (never silent); the normal emergency path when the wrapper is unavailable but git
  works. (2) `git push --no-verify` — bypasses ALL git hooks (git's own flag, no wrapper code involved); the
  absolute fallback if the guard/node itself is broken.
  **CPB6 — now ALSO shipped in the SAME session (owner directive 2026-07-30):** the earlier plan decoupled
  DG2 from CPB6 (activate routing-enforcement first, wire the control-repo gate later), but the owner then
  folded CPB6 into this same session, so **both shipped together.** The control repo now has a `gate` script,
  so a control-repo wrapper push RUNS the full test suite in the wrapper's `runGate` step before pushing and
  records **`gate.passed`** (not `gate.skipped`), aborting on a failing gate — full record and live red/green
  proof under the CPB6 entry in READY TO BUILD (control repo `f0ed42a`). So DG2 enforces _routing_ and CPB6
  enforces the control-repo _gate_: a control-repo push is now both routed through the wrapper AND genuinely
  gated. Read the live count any time with `npm run push-count` in the control repo.
- **DG3.** Reaper: shadow → actually reaping. Currently authorizes cleanup only in shadow, re-scoped
  2026-07-28 to verified-terminal-state / owner-authorized-deadline cleanup, supervisor-launched jobs only.
  Full safe-lifecycle design (two clean "done" signals, three hard guards, a continuation-packet snapshot
  before any reap) → **REF2**, below.
- **DG4.** `--no-verify` tripwire: shadow → enforce. Promotes only after it catches a real violation cleanly
  (hit-based, with a per-session override) — de-prioritized to telemetry-only by the three-model review.
- **DG5.** Worktrees-vs-lease: whether anything beyond worktrees is needed. Decided by Stage 1d's measured
  collision rate (cross-ref **CP2**'s "open architectural question" above) — if collisions are ~zero once
  worktrees are on, nothing more gets built here, on purpose.

## REFINEMENTS — owner-approved changes to already-scoped items

- **REF1. ✅ SHIPPED — `a1df1b3`.** Session-aware uncommitted-work gating for the **backup-unhealthy** alert
  — full shipped record below; original design reasoning kept here since this is REF1's one home.
  **Problem the owner hit:** the alert fired on uncommitted work mid-session — but files being actively
  built/edited are _supposed_ to be uncommitted, so that read as a finding when it was really a false alarm.
  **Fix:** the alert now fires only when uncommitted work is **orphaned** (its owning session finished or
  died) or has sat uncommitted with **no active session** past a threshold, reusing the supervisor's
  existing tree co-residency/active-session tracking rather than building a second tracker.
- **REF2.** Safe-lifecycle reaping (refines **DG3**, the idle-session reaper's shadow → actual-reap
  promotion). **Why:** the owner wants finished sessions actually killed once they've served their purpose —
  he can't do this himself, because archiving a session in the UI does **not** terminate its process; only a
  real `(pid, procStart)` kill does, which is the reaper's job. **Two clean "done" signals, and only these:**
  (a) supervisor-launched jobs whose job contract (**CPK1**'s reconciler) reached **verified-terminal** —
  safe, no guessing; (b) interactive/Dispatch-launched sessions idle past an **owner-set idle threshold** —
  an authorized deadline, not idle-inference. **Three hard guards before any kill:** (i) long-idle only,
  never mid-work; (ii) **never** reap a session that left uncommitted work — flag it to the owner and
  **HOLD** (never auto-commit possibly-broken WIP, never kill unreviewed work); (iii) the rank-4 (**CPK4**)
  continuation packet snapshots the session's state **before** any reap, so nothing is lost. The existing
  kill mechanism stays exactly as proven — echo-and-confirm `(pid, procStart)`, never batched. **Plan
  threshold set (2026-07-30, owner-approved):** the interactive/Dispatch idle-reap threshold is **2h30m
  (150 minutes)**. Stated explicitly: this is a PLAN value only, NOT live — reaping interactive sessions
  stays shadow-gated until the reaper proves itself (per DG3's own promotion gate above); nothing auto-kills
  at 150 minutes today. **Shadow tracking must also watch for over-aggression, not only readiness to
  graduate:** if a session the reaper would have flagged as reapable at the plan threshold later resumes
  activity, that is a measured false positive at the current setting — see REF3 for how this feeds the
  auto-verdict. OWNER-APPROVED, NOT YET BUILT.
- **REF3.** Auto-verdict on data-gated promotions (refines **DG1-DG5** + the **ACT1** housekeeping pass).
  **Owner principle, verbatim:** "nothing that needs data collection should require me to do it — it should
  be automatic." Each data-gated item — **DG2** (push-guard, ≥10 clean wrapper pushes), **DG1** (thrashing →
  kill, a clean shadow track record), **DG5** (worktrees-vs-lease, a measured collision rate over N chances),
  **DG4** (`--no-verify` tripwire, a clean hit-based stretch) — gets an **explicit evidence threshold defined
  up front**, not a vague "wait and see." The daily/weekly housekeeping pass (**ACT1** / **CPK5**) tracks
  progress toward each threshold automatically, and the **moment** a threshold is met it Pushovers the owner
  the decision with the recommendation **already computed** (e.g. "worktrees-vs-lease ready: collision rate
  X% over N chances → recommendation: lease is enough") — one-tap decide, zero manual checking.
  OWNER-APPROVED, NOT YET BUILT; the per-item numeric thresholds themselves still need to be pinned down as
  each promotion is actually built. **Extended 2026-07-30 (owner-approved) — the auto-verdict is
  bidirectional, and the two directions carry different authority.** Automatic tracking can produce two
  different verdicts, not only "ready to graduate." For **DG3** specifically: if a session the reaper would
  have flagged as reapable at the plan threshold (150 minutes — see REF2) later resumes activity, that is a
  measured false positive at the current setting; a high false-positive rate produces a **"too aggressive →
  recommend widening the threshold to ~X"** verdict, Pushovered the same way a graduate-ready verdict is.
  **⭐ Safety asymmetry to record, since it generalizes beyond DG3 to every data-gated mechanism:** the system
  MAY **auto-loosen** on its own — widen a threshold, err further toward not killing/not acting — when the
  evidence clearly shows the current setting is too aggressive, because that direction is always safe and
  needs no owner sign-off before it takes effect. **Tightening — making any data-gated mechanism MORE
  aggressive — always requires explicit owner approval**, the same bar as a shadow → live promotion. The
  fail-safe direction is automatic; the risky direction stays gated.
- **REF4.** Thrashing-detector refinement — sharpen what counts as "thrashing" (refines the shadow-only
  detector recalibrated at `15c17d0`; feeds **DG1**'s shadow→kill promotion gate). **Why:** two more
  false-ish positives, distinct from the `53a3bb89` case `15c17d0` already fixed, surfaced 2026-07-29/30.
  **Two corrections, both owner-approved:** **(i)** a session frozen mid-read with zero activity at all is a
  **different state** from a session issuing repeated failing tool calls, and the detector must say so —
  "stalled/hung, no activity" is **POSSIBLY_STALLED**, not thrashing, and the two need different wording and
  a different response. **(ii)** the slow-pre-push-gate / push-retry pattern — repeated push attempts timing
  out at the tool level with no file changes between attempts — must **NOT** be flagged as thrashing; a
  session mid-push, retrying because the previous attempt's tool call itself timed out, is waiting on a slow
  gate, not stuck. **Stays shadow/alert-only**, exactly per the three-model review's doctrine already
  governing **DG1** — this sharpens what the detector reports, it does not promote it toward a kill.
  OWNER-APPROVED, NOT YET BUILT.
- **REF5. ✅ SHIPPED — `e3706db`** (control repo). Push-window tuning for the **unbacked-work / push-not-confirmed** alerts (refines the LIVE
  backup-health alerts — the same alert family **REF1** made session-aware; distinct correction).
  **Symptom:** the two alerts — "A session tried to push but I never saw it confirm on the remote — your
  latest work might not be backed up" and "Your latest work isn't backed up — the repo has N commit(s) not
  on the remote" — fire as **false positives during the NORMAL push window**. A full-gate push takes ~5
  minutes (and now up to the 20-minute wrapper ceiling **ACT3** just set), so the supervisor's check runs
  **mid-push**, sees a commit not yet on the remote plus a push that hasn't confirmed, and alarms — even
  though the push is just slow, not stuck. Owner flagged it as trigger-happy; **verified 2026-07-30** (every
  push landed, nothing was actually lost). **Fix (three parts):** **(i)** a **grace period at least as long
  as the gate/push ceiling** before it alarms; **(ii)** **push-in-progress awareness** — suppress the alert
  while a push or gate is actively running. The useful new signal: **ACT3**'s controlled-push wrapper now
  writes **`push.completion` events to the ledger** — a "started" event distinct from `completed:true` — so
  the detector can key off an **in-flight push event** instead of guessing; **(iii)** **auto-retract /
  auto-resolve** the alert once the commit actually lands on the remote, so a since-pushed commit doesn't
  leave a stale "not backed up" open. **Note:** **CPB4** already shrinks this window for doc-only pushes
  (~30s fast path), but code pushes still take the full gate, so the tune is still worth doing.
  OWNER-APPROVED (2026-07-30), NOT YET BUILT.
  **Extended 2026-07-30 (owner-approved; multi-model round) — make it SESSION-ACTIVITY-AWARE, the same
  discipline REF1 applied to the backup-unhealthy alert.** Beyond the grace period and push-in-progress
  awareness above, the unbacked-work / push-not-confirmed alerts must **not fire at all while the session
  that OWNS the uncommitted/unpushed work is still actively running** — work mid-build by a live session is
  _supposed_ to be unbacked. Fire **only once that owning session is idle or done and the work still remains
  unbacked**, and **auto-retract the moment the work is committed + pushed**. **Why:** the owner received the
  uncommitted-work notification **twice during a single long, still-active session** — a false alarm on work
  that was simply in progress. Reuses the supervisor's existing active-session / tree co-residency tracking
  (as REF1 does), not a second tracker. OWNER-APPROVED (2026-07-30), NOT YET BUILT.
  **BUILT + SHIPPED 2026-07-30 — control repo `e3706db`** (full shipped record below; the design reasoning
  above is kept here since this is REF5's one home). All four parts landed, for BOTH detectors and BOTH
  repos, in one shared module (`lib/push-window.js`) so the two can never drift apart on what "in flight"
  means. **One hypothesis in the spec above was CHANGED on contact with the repo (Protocol 51a):** the
  brief named "ACT3's `push.completion` events — a 'started' event distinct from `completed:true`". The
  wrapper's actual started/finished pair is **`push.intent` → `push.result`** (`push.completion` is the
  evidence bundle written alongside the result, never a start marker). The mechanism the brief wanted is
  real and was used; only the event name was wrong. **A gap the brief could not have known about was found
  and closed:** `controlled-push.js` runs the target repo's gate at step (c) **before** it writes
  `push.intent` at step (d), so for a CONTROL-repo push — which runs its own suite in-wrapper since CPB6 —
  the first several minutes have **no intent event in the ledger at all**, and the ledger signal alone
  would have left that window uncovered. The **L4 push lock** (taken at step (a), released in the
  `finally`) spans the whole transaction and covers it. **One deliberate divergence from REF1, documented
  in code:** unknown ownership does NOT suppress the unpushed legs — see the shipped record below.
  **── THIRD LEG SHIPPED 2026-07-31 — control repo `99fd90a` — the UNCOMMITTED-CHANGES detector ──**
  The owner reported the third alert in this family — _"your latest work isn't backed up — the repo has N
  uncommitted changes piling up"_ — still firing while an **active session owned the dirty tree mid-build**
  (verified live during the WB6 build). ⚠ **The brief's premise was that this leg simply needed REF5's
  treatment applied. Reading the repository first changed the build (Protocol 51a): the treatment already
  existed — REF1 shipped it on 2026-07-30 — and it had NEVER ONCE FIRED.** The live ledger
  (`events-2026-07-31.jsonl`) reproduces it exactly: `robco-control` read `unowned` at 13:54 / 13:59 /
  14:24 / 14:34 / 14:44 with the dirty count climbing **5 → 12**, while in those same runs `robco-uos` read
  **owned** by a live session. One session, sitting in the app repo, editing the control repo beside it.
  **Root cause:** REF1's ownership is a **cwd prefix match against ONE repo root**, so it can only see the
  repo a session is sitting _in_ — and cross-repo work is how _every_ control-plane build on this machine
  happens. The signal could never have fired for the case it was built for.
  **The obvious fix was rejected as a mute, not a tune:** widening the match to siblings (anything under
  `C:\Dev\!RobCo\`) would hand ownership of all three repos to any session on the machine, so an abandoned
  dirty tree would go unreported for as long as the owner worked on anything else. **Shipped instead:** a
  second, evidence-based reading needing no attribution — _a tree whose **dirty set** changed between two
  supervisor ticks is being worked on, whoever is doing it._ Each run fingerprints the tree (a hash of the
  sorted `git status --porcelain` lines, from the call the detector **already makes** — no extra git) and
  compares it with last tick's. A count could never do this: 6 → 6 looks identical whether nothing happened
  or one file was staged and another touched. **An edit also RESETS the streak**, which is what makes the
  grace period a grace period — the clock runs from the last real **edit**, not from the first ownerless
  run. Also suppresses while a **push is in flight** for that repo, reusing `push-window.js`'s own verdict
  the supervisor already computes (narrow — a tree is usually clean during a push — but a _partially_
  committed one is not). **Fails toward REF1's prior behaviour:** a missing fingerprint on either side
  (pre-REF5 history, an unreadable tree) claims nothing; absence of evidence is not evidence.
  **NOT NEUTERED, proven both ways:** an at-rest, unowned, dirty tree past the threshold still alarms, and a
  **two-way mutation run** turned the gate red in each direction (deleting the suppression; making the
  edit-detector always claim an edit) before being reverted. **One honest note on that mutation:** the two
  suppression legs deliberately overlap, so removing only the `activeEdit` branch still leaves the
  streak-reset covering the same case — the branch is pinned by asserting the recorded **reason**, not just
  the silence. **Auto-retract needed no new machinery** and was asserted rather than assumed — committing
  makes the tree clean, the finding disappears, the incident resolves, and `notifyOnResolve` was already on
  for `backup`. Locked by control test group **DTW**, including a **real sandboxed supervisor run** proving
  the fingerprint actually persists to the ledger — without which the whole mechanism would be inert. Full
  control suite green.

## SHIPPED — for the record, with SHAs

> **⚠ RECONCILED 2026-07-31 — this roll-up had fallen SEVEN items behind.** Every item below the divider was
> already marked ✅ at its own full entry, but was missing from this index, which is the one place a reader
> goes for "what shipped, with the SHA". **Every SHA in this section was re-verified this pass** against
> `git cat-file` **and** `git merge-base --is-ancestor` in its own repo — so each one provably exists **and**
> is genuinely in its branch's history, not merely quoted. Where a claim could be checked against the live
> control-plane **ledger** as well, it was; those are marked **ledger-confirmed**.

**── Added by the 2026-07-31 reconcile (all SHAs verified this pass) ──**

- **CPB5 v0.1.** `robco`, the operator control CLI — ✅ SHIPPED `ff11244` (control repo). The decision loop:
  two foundations, five views, eight command families, `incident.resolve` proven end to end. **v0.2 and v0.3
  are NOT built** — the item stays 🔄, this is the first rung only.
- **WB1 v0.1.** Universal provenance spine + evidence envelope — ✅ SHIPPED `d36ad1d` (control repo).
  Lineage is **derived, not assigned**, so pre-existing records join with no migration. **Additive; does not
  close WB1** — several producers are deliberately unthreaded and named at the entry.
- **WB6 v0.1.** Tamper-EVIDENT ledger — hash chain + content-addressed evidence — ✅ SHIPPED `79e8fea`
  (control repo). **Ledger-confirmed:** live records today carry `chain:{v,algo,seq,prev,self}` — a record
  sampled this pass sat at **seq 1820** with real `prev`/`self` hashes, so the chain is genuinely writing in
  production, not merely committed. **Additive; does not close WB6.**
- **P16.** The pre-publish PII/secret scanner itself — ✅ SHIPPED `0917d20` (control repo). _(Its MOUNT onto
  the publish flow is the separate `b90304fb` entry below — the scanner and its mounting shipped apart, and
  conflating them is how a built-but-unmounted gate gets recorded as live.)_
- **HG1.** Event-bus hardening — `off`/`once`/dedup + per-handler error isolation — ✅ SHIPPED `31206dd`
  (app repo).
- **HG2.** Bootstrap isolation — per-phase boot guards, fatal-vs-degradable — ✅ SHIPPED `aef7da4` (app
  repo).
- **DG2 ACTIVATION.** Raw-push refusal turned ON — ✅ SHIPPED `05c450b` (app repo) + `ec4acfb` (control
  repo). **Ledger-confirmed LIVE:** the clean-push counter read **44/10, threshold MET** on this pass's own
  pushes, and every push this session routed through the wrapper.
- **SP2 / the effort fold.** Per-session effort control ANSWERED and folded — ✅ `72134e6` + `040885c` (app
  repo, doc-only). Dispatch **can** set a spawned session's tier via the two-message pattern; the design
  consequences landed on CPB2/CPB5 v0.2 (effort ceiling), WB1 (`effort` envelope field) and CPB9. **Nothing
  was built** — this is a documentation/design landing, recorded here because the SHAs are real and a reader
  should be able to find them.

**── Earlier entries ──**

- **CPK1.** Rank 1 — job contract + reconciler — ✅ SHIPPED `8eab8fd`. Live in the supervisor's 5-minute
  loop (verified by code inspection + a Task Scheduler check, 2026-07-29).
- **CPK2.** Rank 2 — transactional exact-SHA verifier/publisher — ✅ SHIPPED `dd49ed4`. Built, fails closed,
  tested break-glass + fault-injection tests. **ACT2 (`7ca220c`) wired its DECISION half into the live loop
  and left its AUTHORITY where it was:** publish-readiness is now detected/recorded/alerted every run, but
  actuation stays behind the owner's `auto-publish.json` switch (absent = off), so by default a publish
  still happens only when a human runs `scripts/publish.js`.
- **CPK3. Rank 3 — off-machine durability: backup mirror + restore test — ✅ SHIPPED + ACTIVATED
  (2026-07-30).** Built (`e4384e5`, control-plane repo — "off-machine backup mirror + restore test") and
  activated the same night (`78acfd5` — "activate rank 3's backup mirror -- wire into daily housekeeping +
  register scheduled task"). The Ledger repo (`RobCo-Control-Ledger`) shows it actually running: first
  mirror commit `d001a38`, a second `79afc2e` shortly after. Unblocks **CPB3** and closes out **OD1**'s
  cadence question (shipped using the daily default).
- **CPK4.** Rank 4 — deterministic continuation packet — ✅ SHIPPED `9fd751d`. Built, callable, and **now
  auto-invoked: ACT2 (`7ca220c`) took up the `packetWorthyJobs` reconciler hook point this rank explicitly
  named for the purpose** — the supervisor generates a packet for every packet-worthy job on its 5-minute
  loop, regenerating only when the job's situation actually moved.
- **CPK5.** Rank 5 — incident lifecycle + daily housekeeping — ✅ SHIPPED `32c0fbc`. Incident-lifecycle half
  is live in the 5-minute loop; the daily-housekeeping half is built, and its rank-3 sub-piece is now
  scheduled (via `78acfd5`) — the rest of ACT1 (the full pass, README-staleness nudge included) is still
  open.
- **P16 ACTIVATION.** The pre-publish PII gate is **MOUNTED and LIVE** — ✅ SHIPPED `b90304fb` (ARCHIVE
  repo — "museum: MOUNT the P16 pre-publish PII gate on the publish flow"). The one-line invocation the
  P16 entry named, in `runPublishPrep()` after `preparePublish()` returns; exit code is the contract, no
  override, and an absent control repo blocks rather than skips. Allow-list decision applied the same day
  (owner: "not mine, allow it") — the real 756-file publishable tree now reads PASS. Full record at P16
  above (its one home); this line is the shipped record.
- **REF5 THIRD LEG.** The uncommitted-changes detector — ✅ SHIPPED `99fd90a` (control repo — "REF5 third
  leg -- the uncommitted-changes alert, and why REF1 never fired"). REF1's cwd-only ownership could never
  see a cross-repo build, which is how all control-plane work here happens; the fix reads the dirty set's
  own movement instead. Full record at REF5 above (its one home); this line is the shipped record.
- **REF5.** Push-window tuning for the unbacked-work / push-not-confirmed alerts — ✅ SHIPPED `e3706db`
  (control-plane repo — "REF5 — stop the unbacked-work alerts firing during a normal push"). Full design
  reasoning kept at REF5 above (its one home); this line is the shipped record. Both detectors now share
  `lib/push-window.js`'s four checks — **landed on the remote** (the auto-retract; before this, such a
  warning could never close, because the record that would close it can never arrive), **a push actually in
  progress** (read from ACT3's `push.intent`/`push.result` pair _and_ from the L4 push lock, because the
  control repo's in-wrapper gate runs before any push record exists), **the owning session still live**
  (reusing REF1's tree ownership, not a second tracker), and **a grace period** imported from the wrapper's
  own ceiling rather than re-declared. **Deliberate divergence from REF1:** when liveness is unobservable,
  REF1 stays silent but REF5 still alarms — a dirty tree is ambiguous by nature, a commit still off the
  remote past the full ceiling is not, and making unknown suppress would leave a machine that can't read
  its own process table with no backup alerting at all. **`notifyOnResolve` is now on for exactly two
  incident types** (`backup`, `stranded-push`), which is what makes the retraction reach the phone.
  Verified not-neutered by mutation: removing the suppression turned the gate red (4 failures), then
  reverted. Locked by control test groups **PW** (pure logic + a REAL L4 lock taken and released against
  the live process table) and **PWE** (a real sandboxed supervisor run: quiet mid-push, loud when stuck,
  retracted once it lands, retraction fires once).
- **REF1.** Session-aware uncommitted-work alert — ✅ SHIPPED `a1df1b3` (control-plane repo — "session-aware
  uncommitted-work alert -- REF1 refinement to alert 1"). Full design reasoning kept at REF1 above (its one
  home); this line is the shipped record.
- Idle-session reaper — built `643ebb8`, re-scoped 2026-07-28 to verified-terminal / owner-deadline cleanup
  only; shadow — see **DG3**.
- Nine Pushover alerts total — 7 live, 2 documented-contract-only — see **SP1**.
- Thrashing detector recalibrated — `15c17d0` (fixed a real false positive, session `53a3bb89`); stays
  shadow — see **DG1**.
- Usage-measurement accuracy spike run (read-only) —
  [`USAGE_MEASUREMENT_SPIKE.md`](planning/control-plane/USAGE_MEASUREMENT_SPIKE.md); unblocks **CPB1**.
- The private `RobCo-Control-Ledger` repo created (empty, confirmed private), now actively receiving mirror
  commits (see **CPK3** above).
- **CPB4.** Doc-only gate fast path — ✅ SHIPPED `1245712` (2026-07-30). `scripts/gate-scope.js` scopes the
  pre-push gate: a push whose whole diff is docs (`*.md` / `planning/**`) runs `npm run gate:docs` (lint +
  format + the Node runner + static checks, NO browser); anything touching app code, a mixed diff, a
  renamed/moved/deleted code file, or any uncertainty runs the FULL gate (fail-closed). Locked by
  **Suite 253**. Full entry above in READY TO BUILD. This doc-only follow-up commit — the one recording the
  `1245712` SHA — is itself the fast path's first live run (it should trip `gate:docs`, not the full gate).
- **ACT3.** Controlled-push wrapper wired into the real push path — ✅ SHIPPED (2026-07-30). App repo
  `5433648` (`scripts/robco-push.js` + `npm run push` + Suite 254 + docs, `CACHE_NAME` r15→r16); control repo
  `0f452f9` (gate delegation `--no-gate`/`ROBCO_PUSH_DELEGATE_GATE` + the `lib/push-count.js` clean-push
  counter + test groups GD/PC) and `e4e5965` (Protocol-42 fix: the push timeout must cover a delegated
  full-gate pre-push hook — 20 min default, env-overridable; test group PT). The wrapper delegates the gate to
  the app repo's own pre-push hook so it never double-runs the gate or defeats CPB4's doc-only fast path;
  it adds L4 lock + push.intent/result receipt + `ls-remote` verification + the DG2 clean-push counter on
  top. All three commits were pushed _through the wrapper_ (dogfood); the counter read 3/10 after. ACT3 is
  routing only — raw-push refusal stays **DG2**, plain `git push` unrefused. This doc-only QUEUE update is
  itself another wrapper push (it should trip CPB4's `gate:docs` fast path _through_ the wrapper — the live
  proof of the coexistence).
- **ND1.** Cross-repo naming domains — ✅ SHIPPED (2026-07-30). App repo `ca38f79` (`tests/naming-domains.json`
  - Suite 257 + docs, `CACHE_NAME` r19→r20); control repo `31e987c` (`test/naming-domains.json` + test group ND
  - CLAUDE.md/README). The app's `RobcoEvents` and the control plane's "ledger events" are now reserved to their
    own domains, with each repo self-checking its OWN source against a byte-identical duplicated list. Full entry
    in its own section above (the `ND` family). **Not a control-plane item** — it is listed here because half of
    it lands in this repo's sibling control repo.
- **ACT2.** Write-side activation — ✅ SHIPPED `7ca220c` (2026-07-30, control repo `RobCo-Control`). New
  `lib/write-side.js` is the decision layer `supervisor.js` consults every run. **Rank 4 fully live:**
  `computePacketPlan()` reuses `continuation-packet.js`'s own `packetWorthyJobs` (Protocol 22 — the hook
  point that build named for exactly this call site) and adds the question a LOOP needs and a one-shot CLI
  does not, "does it already have a CURRENT one?", via a cheap fingerprint (state + terminality +
  transition count + reconciler flags) read back from the loop's own prior `continuation.packet` ledger
  events — so an unchanged job is not rewritten every five minutes, and only a `written: true` event
  suppresses a retry (a build failure or a dry-run never masquerades as success). **Rank 2 shadow:**
  `computePublishCandidates()` (pure) requires verified state + `jobType: 'publish'` + a usable
  `expectedRemote` + passing evidence bound to that EXACT sha — delegating the evidence verdict to
  `publisher.findPassingEvidence` → `completion-evidence.js` rather than re-deriving it, so this layer can
  only ever be _more_ conservative than the transaction — and carries a distinct `reason` on every rejected
  candidate. `runAutoPublish()` gates actuation behind three independent checks: `--dry-run`, the owner's
  switch, and a **per-run cap of 1** (deterministic by `jobId`; the rest reported deferred, never dropped)
  so a runaway cannot become many pushes at once. `supervisor.js` never calls `publishJob` and does not even
  `require` `lib/publisher.js` — `runAutoPublish` is the single choke point (static guard **WS6**). Also:
  `status.json` `schemaVersion` 2→3 (new `writeSide` block, with the switch state **hoisted to the top
  level** because "off" must never be something you have to go digging for), a new `publish-ready` incident
  type + no-PII phone banner, and `supervisor.js`'s header contract corrected in place (it now also writes
  continuation packets, and runs read-only `status`/`diff`/`rev-parse` alongside `ls-remote` via the packet
  builder — Protocol 3, docs fixed in the same commit rather than left as drift). Locked by test group
  **WS** (the switch's fail-closed matrix; the plan's generate/skip/degrade logic; every negative
  publish-eligibility case including evidence bound to a _different_ sha; the three gates proven with an
  injected `publishFn` spy that never fires; per-job degrade on build/write throw) and **WSI** (real
  sandboxed `supervisor.js` runs: a packet actually lands on disk and is NOT rewritten on the second run;
  and a genuinely publish-**eligible** job leaves the remote ref untouched — verified by `ls-remote` ground
  truth, not a self-report — with no publish intent ever recorded, while the owner still gets alerted).
  Suite green, 0 fail / 0 skip; pushed through the wrapper with the real control gate running (CPB6),
  `gate: PASSED`, origin VERIFIED. **Red-then-green proof run outside the suite** (a test that really pushes
  does not belong in it): same fixture, switch absent / `enabled:false` / malformed all left the remote ref
  EMPTY; a literal `enabled:true` moved it to the exact verified sha through the full fail-closed publisher
  transaction — the switch is genuinely the only thing standing between the two. **DORMANT until fed**, and
  **usage-capture deliberately out of scope** — see the ACT2 entry above for both.
- **CPB1.** Budget alert (tokens/$) — ✅ SHIPPED `2d6e90b` (2026-07-30, control repo `RobCo-Control`). The
  budget half of the deadline/budget alert (the sibling of the wall-clock half that was already alert 3 of 4).
  New `lib/budget-check.js` (pure comparator: extracts a job's measured $/token spend from its own ledger
  `job.result` events in either grounded shape, compares to `manifest.usageReserve`, degrades to
  `UNOBSERVABLE` for a `percent` unit or absent measurement — never a fabricated overrun) + `lib/usage-reset.js`
  (pure cap-reset: reported-field-first, else honest approximate). Wired through `lib/job-reconciler.js`
  (`budget-exceeded-still-open` flag + `budget` sub-object; `summarizeManifest` now carries `usageReserve`),
  `lib/notify-messages.js` (`formatBudgetExceededMessage`, with the cap-reset clause), and `supervisor.js`
  (`finding.budget-exceeded`, `findings.budgetExceeded`, a distinct `budget` incident type at Infinity
  cooldown, the message router). Locked by test group **BX** (pure comparator incl. the `percent`→unobservable
  and no-measurement→unobservable doctrine cases, usage-reset both branches, the reconciler flag, the message
  formatter, and a real sandboxed `supervisor.js --dry-run` wiring proof); `DX1c` updated for the retired
  wall-clock-only TODO marker. Suite green (0 fail, 0 skip). **DORMANT until fed** — the check reports
  `UNOBSERVABLE` until a launcher records measured per-job usage into the ledger (spike §4 — **and NOT
  ACT2: it shipped `7ca220c` without the usage-capture half, deliberately, because capture needs a launcher
  to capture from; that work sits with the approvalless/headless launcher, now tracked as CPB9**),
  exactly as the wall-clock half is dormant until jobs flow; it is built, correct, and tested, awaiting only
  the data source. **Framing refinement (owner-approved 2026-07-30, checkpoint pass — record only, NOT a
  rebuild):** the budget alert is a **token-billing guardrail**, not a general spend meter. While the owner
  is on his **MAX subscription**, spend is against a **usage allowance, not dollars**, so the alert must stay
  **quiet** — it should speak up **only when he is actually on pay-as-you-go tokens** (the rare fallback).
  So the trigger must **gate on being in a token-billing state**: no token-billing state → no budget buzz,
  regardless of measured usage. This sharpens _when_ CPB1 fires; the shipped comparator/plumbing above is
  unchanged and this is queued as a tuning to apply when CPB1's data source is wired (ACT2), not built now.
  This app-repo QUEUE update is a doc-only push through the ACT3 wrapper (CPB4 `gate:docs`
  fast path; advances the DG2 clean-push counter).
- **CPB2.** Usage → operating modes — ✅ SHIPPED `6154abd` (2026-07-30, control repo `RobCo-Control`). The
  owner-approved (2026-07-28) replacement of the five per-threshold usage **phone alerts** (50/80/85/90/95,
  which "became wallpaper") with a single alert on an **operating-mode change**: `Normal < Conserve <
Reserve-for-owner < Stop-unattended-AI`. New `lib/usage-mode.js` (pure: `modeForPercent`,
  `computeOperatingMode` = the **most restrictive** of the session `fh` and weekly `sd` modes per invariant #5,
  naming `drivenBy`; `previousModeFromLedger`; `detectModeChange`). Wired through `supervisor.js` (a
  `usage.mode` gauge every run + a `usage.mode-change` event; the retired usage-crossing alert kept only as a
  `reconcileIncidentSet('usage', [])` call to gracefully auto-resolve any pre-CPB2 open incident; a distinct
  `usage-mode` incident type at Infinity cooldown; `operatingMode`/`modeChange` in `status.json`
  [schemaVersion 1→2] + report + printHuman), `lib/notify-messages.js` (`formatUsageModeChangeMessage` —
  advisory, never claims to throttle since the supervisor is observe-only), and `lib/supervisor-detect.js`
  (owner-tunable `modeThresholds` passthrough on the same usage-thresholds config file). **NOT dormant** — it
  reads the same live account-wide `fh`/`sd` file the crossing detector already reads every run, so it lights
  up on real usage today (contrast CPB1, dormant until a launcher writes per-job usage). **UNOBSERVABLE
  (`mode:null`) when neither field reads — never a fabricated `Normal`;** notify only between two _observable_
  modes (a transition out of/into UNOBSERVABLE records the gauge but never buzzes). **Design decision recorded
  (Protocol 51a):** the four modes were owner-approved but the exact band numbers were not pinned, so the
  default bands collapse the owner's five named thresholds (`<50` Normal, `50–79` Conserve, `80–89`
  Reserve-for-owner, `≥90` Stop-unattended-AI) — 85/95 fold in with no separate mode but stay visible in
  `status.json` and the untouched `usage.crossing` ledger events. Locked by test group **UM** (pure band/mode
  logic, incident-engine integration, and a deterministic sandboxed `supervisor.js --dry-run` wiring proof via
  a `ROBCO_CLAUDE_APPDATA` usage fixture, incl. **UM6f** proving the retired per-threshold alert no longer
  fires). Suite green (1066 pass, 0 fail, 0 skip). This app-repo QUEUE update is a doc-only push through the
  ACT3 wrapper (CPB4 `gate:docs` fast path; advances the DG2 clean-push counter).

# 🗺️ ROADMAP SPINE — near-term macro-ordering (owner-discussed 2026-07-30 · ITERATIVE + OVERLAPPED · owner-adjustable)

**Why this is here.** This is the near-term macro-sequencing the three bands that follow (**AUD1** below,
**PM1** below, and **THE MUSEUM PROGRAM** cluster) all fit inside — recorded in the queue so the ordering
_lives_ here rather than only in a session's memory (Protocol 50). It is deliberately **iterative and
overlapped, not a strict serial wait**:

1. **Finish + activate the control plane.** Complete the ready-to-build batch (ACT3 → CPB3) and flip on the
   activation switches.
2. **Build the museum AS THE LIVE WORKLOAD** that generates real operating data. Do **not** idle-wait for
   the control plane to "run live" with nothing running through it — museum construction **is** the real
   work that flows through the control plane, so it doubles as the audit's data source. (**PM1**, the
   reflect-first retrospective, opens this band per its own sequencing: reflect, then build the exhibit.)
3. **Once enough real activity has accrued, run the WORKFLOW AUDIT (AUD1)** — the multi-model pass (same
   shape as the 2026-07-30 GPT-5.6 / Gemini 3.1 / DeepSeek round) — against that **real operating data**,
   with the **MUSEUM AUDIT (P15)** riding along, auditing the museum increment already built.
4. **Absorb whatever control-plane fixes the audit surfaces**, then **continue the museum.**

**Key rationale — why overlapped, not serial.** The workflow audit needs real work flowing through the
control plane to have anything to audit, and the museum is the obvious real work — so the two overlap and
nothing idles. But **do not build the WHOLE museum before the first audit**: build an increment, audit it,
fix, continue. This reconciles the bands rather than replacing them — **AUD1** (its own "run only after the
batch has run live long enough to produce real data" gate is exactly what museum-as-workload satisfies),
**PM1** (reflect before the exhibit is built), and **the museum program** (item **P** + family) as the live
workload itself. **Owner-adjustable — a plan of record, not a lock.**

---

## POST-IMPLEMENTATION MULTI-MODEL AUDIT — gated on the ready batch running live (new 2026-07-30)

- **AUD1. ⬜ GPT/Gemini/DeepSeek pass on the control-plane program, once it's had a real run.** Gated
  explicitly: run this only **after** the "Ready to build" batch above is built, activated, AND has run live
  long enough to produce real data (not a review of paper design). Two questions, both required: **(a)
  coherence/interconnect** — does the control plane actually work together as one system, or is it a pile
  of loosely-related features bolted on across one very fast night? **(b) frontier** — given everything now
  built, what's the highest-leverage thing to push next across all workflows (control-plane, museum, app)?
  **Framing guardrail, recorded because tonight's own reviews are the reason it's needed:** judge by
  **"highest-leverage next + does it earn its keep,"** never **"maximize features."** The three-model
  convergence review (2026-07-28) already talked this project out of over-building once — a generic reaper,
  a headless-AI housekeeping layer, a 50-protocol hook enforce-engine — precisely by asking whether each
  piece earned its keep rather than whether more could be added. AUD1 exists to re-apply that same
  discipline after a build phase, not to invite a second round of feature-maximizing.

  **Done means:** the ready-to-build batch (ACT3 through CPB3) is built, activated, and has real live run
  data; the three-model pass runs against that real state (not the plan); both questions are answered with
  a plain-English verdict; any finding is filed as its own queued item rather than acted on inline.

---

# ⭐ POST-MORTEM / RETROSPECTIVE OF ROBCO — sequenced right before the museum band (PM1, new 2026-07-30)

### PM1. ⬜ A three-angle retrospective of the whole project, written before the museum is built

**What it is.** One document, three required angles, owner-specified: **(a)** a plain-language "what is
RobCo & how it got here" overview — the story, for a non-technical reader; **(b)** a technical/architecture
retrospective — the real shape of the system as it stands, how it got that shape, and why; **(c)** a
lessons-learned pass — what was tried, what failed, what changed as a result, told straight rather than as a
highlight reel.

**Why it sits exactly here — the owner's own sequencing call.** Reflect first, then build the exhibit. This
item is placed deliberately **between** the control-plane program above and **THE MUSEUM PROGRAM** below —
after the CP kernel work is built/activated (so the retrospective has something real to describe, not a plan)
and before museum construction starts, so the retrospective's own conclusions can inform how the museum tells
the story rather than the museum locking in a shape first.

**It doubles as museum source material.** All three angles are exactly the kind of corpus **P8**'s
story-synthesis draws on — the plain-language overview feeds the museum's lay-audience framing, the
technical retrospective feeds the structure/connection map, and the lessons-learned pass is raw material for
the failure→lesson→improvement thesis the museum is already built around (item **P**). Writing it before P8's
successor passes read the corpus means the museum's next audit doesn't have to reconstruct this from scratch.

**Cross-references, not restatements.** Sits upstream of **THE MUSEUM PROGRAM** cluster below (item **P** and
its family) and of **P15** (which already extends the arc corpus with the control-plane's own arcs) — this
item is the narrative account those arcs get pulled from, not a duplicate of either. Depends on the CP
program's ready-to-build batch actually landing (same real-data precondition **AUD1** above states), since a
retrospective written against the plan rather than the shipped state would need rewriting the moment the
batch lands.

**Done means:** all three angles exist in one document; the technical retrospective is checked against the
actual code/git history rather than asserted from memory (Protocol 3/27 discipline); the lessons-learned pass
names real incidents with dates, not vague characterizations; and the museum's next content pass can cite it
as source material.

---

# 🔄 THE MUSEUM PROGRAM (a coupled cluster — kept together deliberately)

_These items (P, P1-P14, J) form one tightly-coupled sub-program with internal dependencies that readiness
buckets would fragment, so they are kept together — and as of 2026-07-27 they sit **directly under the
control-plane program** rather than buried in the 2.8.5 tail, because the museum is the second priority band
and was never really 2.8.5 work. **State of play: P is built; P1 is FULLY CLOSED; P2 is PUBLISHED and LIVE
(2026-07-24) — but the live site is now STALE against its source, which is P14; P8 ✅ SHIPPED 2026-07-27 and
is the blueprint P11 builds on; P3/J both depend on P1.** **P15 (new 2026-07-29) is a precondition on
museum-done** — the control plane became the board's top program the day after P8's corpus was cut, and
its own arcs are not in it yet. None of it gates the `dev → main` release._

**⭐ The build order inside this program (P8's own recommendation, adopted 2026-07-27; P15 slotted in
2026-07-30):** **P10** (the nav is free to change now) → **P15 part 1** (extend the arc corpus with the
control-plane's own arcs — P8's snapshot predates the kernel work) feeding directly into **P11 Stage 0**
(`arcs.json` — the one genuinely new data artifact, now inclusive of the control-plane arcs) → the arc spine
→ the coverage view → the Visual Web, with **P15 parts 2-3** (the room/placement decision, then verifying
the Visual Web actually renders the control-plane arcs AND the project's interlocking workflows) closing out
once Stage 3 ships; alongside, **P13 → P14** (security scan-list fix, then the republish) closes the loop on
the live site, and **P5/P6/P7/P9/P12** plus the Fable design polish land as content passes.

**✅ P8 — the story-material + STRUCTURE synthesis audit — SHIPPED 2026-07-27.** Both deliverables are filed
in the archive (`audits/museum/2026-07-27_P8-story-corpus.md` — **146 canonical arcs** de-duplicated from 175
raw findings across 15 groups, with a PII firewall; and
`audits/museum/2026-07-27_P8-structure-and-connection-map.md` — the full room/page/nav inventory plus the
node/edge schema, a superset of `library/knowledge-graph.json`). Run as a Claude session because the material
is private, exactly as the item required. → [full account](QUEUE_LOG.md#p8)

### P. 🔄 THE MUSEUM — a generated, browsable history of the project (BUILT + capture pipeline + reproducibility + `--public` tree + publish safety machinery LANDED; publication down to the owner's turnkey expose)

**What it is.** The private archive repo (Protocol 48's `_RobCo-Archive`) turned into a browsable **museum**
of the project's history — an index, a timeline, per-version "rooms," file lists, counts, and mockup
galleries. `museum/generate.mjs` in the archive is the generator; `museum/site/` is its committed output
(18 MB on its own, ~190 MB once the referenced full-size mockup images are counted). As built and running:

- **Generated, never hand-curated.** Every view is derived from the archive's folder structure — the whole
  point is generation over maintenance.
- **The ONE hand-written part is the release account.** Shipped and approved: 2.5.0, 2.6.0, and 2.8.0 are
  frozen; 2.8.5 exists too but is explicitly `draft: true`.
- **A graveyard of abandoned ideas, with their reasoning, exists and is live** (`museum/site/graveyard.html`).

**⭐ THE ORGANIZING THESIS (owner, 2026-07-21) — record this so a future session cannot shrink the museum back
to "app history."** The owner, verbatim: _"I want the story of the workflow and all measures put in place to
maintain the workflow to be displayed"_ and _"all the improvements, failures leading to improvements
EVERYTHING"_ — followed by the explicit priority ordering: _"the app history is important too, just not the
centerpieces."_

**The museum's CENTERPIECE is the story of the workflow and every measure that maintains it, told as
failure → lesson → measure → improvement arcs — the project improving itself.** The app's feature-history
stays in the museum but is **SUPPORTING material** (it is the proof-of-work the process produced), never the
centerpiece. Concretely, these are all facets of the ONE story, not separate exhibits competing for
top billing: the AI-collaboration exhibit (**P6**, above — Fable/Opus/Sonnet + blind external review), the
bug museum (bug ↔ the guard it produced), the protocols themselves (each one is an origin-bug → rule pair),
the gates, the audits, and the Atlas's assurance view. The raw material for this story already exists,
scattered, across `bugs/`, `QUEUE_LOG.md`, `graveyard/`, the protocols in this file, `audits/` in the
archive, and orchestrator memory — **the museum's job is to weave those into one visible, connected story**,
not to invent new content.

**Cross-reference — the Atlas (item I) tells the same story from the other angle.** The Atlas computes the
CURRENT web of guards (what exists and what's assured, right now). The museum narrates WHY each guard
exists (the failure that produced it, told historically). Same underlying story, two different angles — link,
don't fuse, the same relationship R11 already has with both.

**Recorded as thesis + reasoning only — NOT designed, NOT built.** No exhibit layout, no generator change, no
new schema decided here; this only fixes what the museum is FOR so future design/build passes (P2's identity
work, P6, any future exhibit) inherit the right center of gravity instead of defaulting to "release notes with
pictures."

**⭐ THE CONTENT DIRECTION — eight facets that REALIZE the thesis, owner-approved (2026-07-21, "fold all in,
including the rec at the end").** The thesis above says what the museum's centerpiece IS; these are not a
second, competing list — they are that centerpiece made concrete, eight different lenses on the same
failure → lesson → measure → improvement arc. **Recorded as content-direction + reasoning + sourcing only —
NOT designed, NOT built; a future museum-content build session inherits this instead of re-deriving it or
narrowing back to "app history."**

1. **Lifecycle, not just current state (the owner's lead point).** Every protocol / guard / test / rule shown
   with its full arc: born (from what failure) → converted (prose → enforcement, or narrowed) → retired (risk
   gone). A RETIRED rule shown next to "why it was safe to remove" teaches as much as an active one, and it is
   the counter-story to "the escape-ratchet only ever grows" — the project learning to CUT weight is a
   maturity milestone, not a deletion. **Raw material:** the retirement rule (Protocol 49 / R2), the trim
   stages (R3, R5, R6, R7), converted protocols, and every protocol/suite retired in place (Protocols 15, 2a,
   never renumbered — see "RETIRED PROTOCOLS" in this file's own rulebook half, `CLAUDE.md`).
2. **The connection graph as centerpiece — ONE GRAPH, MANY VIEWS, broader than the failure arc alone
   (broadened by the owner, 2026-07-21).** Owner, verbatim: _"not even just 'The failure → guard → protocol
   →' but like how the Atlas and the archive connect, how the skill and the rules and architecture connect.
   how all of those connect to help the AI."_ Failure → guard → protocol → test → commit (click a bug, see the
   guard; click the guard, see the protocol it enforces and the incident that birthed it) is **ONE layer** of
   the web, not the whole of it. A **second layer** is the knowledge architecture ITSELF connecting to serve
   the AI: the routing chain (skill → `CLAUDE.md` → the retrieval map → `rules/*.md` → `ARCHITECTURE.md`) and
   artifact-to-artifact relationships (Atlas ↔ archive, `memory/` ↔ museum, library ↔ code, queue ↔ log). A
   **third layer** is the app's own structure. This is the **"ONE GRAPH, MANY VIEWS"** principle — already the
   core of the Atlas / Visual Web design (item I's own design note (b): "link via a stable identifier
   scheme... do NOT merge into one shared graph," the same discipline applied here as many layers of one web,
   not one flattened graph). **R11 (the knowledge graph, built 2026-07-21) is the FIRST BUILT SLICE of exactly
   the AI-serving layer** — it already derives `routes_to`/`claims_scope_over` across skill → contract →
   notes → architecture and surfaces where routing and claimed scope disagree (drift). **Raw material /
   relationship — cross-referenced, not restated:** the Atlas (**item I**) computes the current web of guards;
   the knowledge graph (**R11**) is the AI-serving layer's first built data source; the **parked "Visual
   Web"** — the Gource-aesthetic capstone render (radial layout, generated SVG+CSS, the FEELING not the tool)
   — lives in `planning/2.8.5/plans/MUSEUM_MASTER_PLAN.md` §18 and is the endgame render the owner
   re-confirmed today as the thing that ties these layers together; spec lives there, not restated here. Same
   "link, don't fuse" relationship the thesis's own Atlas cross-reference (above) already establishes — the
   museum is where all three layers become walkable for a human, the Visual Web is the eventual unifying
   render, and R11 is the first proof the AI-serving layer is itself real and computable.

   **⭐ FLOATED, NOT COMMITTED — Obsidian graph view as a low-effort Visual-Web prototype (owner floated
   2026-07-23).** The orchestrator memory files already use `[[wikilinks]]` (Obsidian-native), so pointing
   Obsidian at the private archive's `memory/` + `bugs/` + `graveyard/` + `audits/` yields a **free graph
   view** for near-zero effort — usable both as a **navigation tool** for the owner AND as a **cheap prototype
   of the Visual-Web aesthetic** to feel out before the generated version is built. **⛔ Keep LOCAL / PRIVATE**
   — the archive can never be public (its git history retains `memory/`). Steal the **visual + graph layer
   ONLY, NOT the "auto-ingest / notes link themselves" behavior** — auto-linking conflicts with memory's
   deliberate curation (memory "holds no fact you can look up"; the graph must never start dragging in
   everything). The **clarity veto still governs** — a legible graph beats 3D spectacle. **Recorded as a
   FLOATED candidate, not a queued commitment:** no build, no design decided here; captured so the idea isn't
   lost.

   **⭐ THE CONNECTIONS MAP — the concrete inventory + the plan to unify it (owner, 2026-07-25; part of this
   facet).** Recorded so the connection-layer builds from what EXISTS, not a wish:
   - **ALREADY BUILT (the edges that exist today):** **R11** (the knowledge graph — `routes_to` /
     `claims_scope_over` across skill → `CLAUDE.md` → retrieval map → `rules/*.md` → `ARCHITECTURE.md`, with
     drift surfaced as data); **bug ↔ guard** (each bug record links to the guard it produced); **protocol ↔
     origin-bug** (each protocol born from a real bug); **provenance** (every fact links to its commit); the
     **retrieval map** (file → rule-note); and the artifact relationships (**queue ↔ log, `memory/` ↔ museum,
     library ↔ code, archive ↔ app**).
   - **PLANNED to complete the web:** the **Atlas (item I)** — guards → tests assurance; **⭐ the
     stable-identifier scheme (R10 finding I)** — the identity contract that lets these separate graphs
     REFERENCE each other with durable IDs, the **KEY enabler** and the literal "link, don't fuse" mechanism;
     **P3**'s supersession / rejection links; **R11's topology + query-answerer** views; and the **Visual Web
     (the Magnum Opus)** — the unifying render.
   - **THE PLAN-TO-CONNECT (record it plainly):** the pieces exist today as **SEPARATE graphs**; the unifying
     move is **(1) stable IDs (R10 finding I) → (2) each graph references the others via those IDs → (3) the
     Visual Web renders the union.** This **IS** facet 2's own "ONE GRAPH, MANY VIEWS / link, don't fuse,"
     now with a concrete build order. **Design-intent only — not built; the real inventory that feeds it is
     P8's connection map (Part A scope expansion).**

3. **The "green that lied" room.** The project's hardest-won lesson: checks that passed while meaning
   nothing — the cache guard comparing the wrong branch, tests asserting source text rather than behavior, the
   fake level-up popup, the museum's own "Operators 3" miscount, the header mangle passing the formatter, the
   redirect-ledger's 22% rename undercount. A room specifically about things that looked fine and weren't is
   the most teachable content in the archive — it is the exact failure mode the whole apparatus exists to
   fight. **Raw material:** the bug room's own records (`bugs/*/record.md`), `QUEUE_LOG.md`, the audits filed
   under `_RobCo-Archive/audits/`, and orchestrator memory.
4. **Every protocol next to its origin incident.** "Written in response to a real bug" is true of nearly every
   protocol in `CLAUDE.md` — surface WHICH bug. A protocol alone is a rule; a protocol beside the failure that
   created it is a lesson. **Raw material:** the bug room's records, `QUEUE_LOG.md`, and orchestrator memory
   (the same sourcing as facet 3, read for a different cut — origin-incident-per-protocol rather than
   false-green-per-check).
5. **The cost / honesty layer.** Generalize the bug museum's "what the guard costs" to the whole museum — show
   the PRICE of the discipline too: the ceremony, the false starts, the things that turned out to be
   over-engineering and got trimmed. Honesty about cost is what makes the museum credible rather than a brag.
   **Raw material:** the trim stages (R3, R5-R7) and the "no guard warranted" decisions on file (e.g. facet 6's
   restraint cases).
6. **The reversals and the restraint.** Not every failure produced a guard — some were "we consciously chose
   NOT to guard this," with reasoning. Showing where the project chose restraint is as honest as showing where
   it added armor. **Raw material:** the header-fragility not-to-guard decision, the deliberately un-gated
   knowledge graph (**R11**, "Deliberately left un-gated... until it demonstrably catches real drift"), the P3
   "current-by-absence" logic fix (R10 finding H, corrected above under P3), and the conversation → queue gap
   marked honestly unenforceable (Protocol 50(c)).
7. **The maturity curve.** Generalize the growth chart from lines-of-code to _measures of discipline over
   time_ — added vs. retired — so the shape itself tells the arc: early chaos → incidents → apparatus growing
   → learning to cut. **Raw material:** the existing growth-chart generator (the museum's strip-chart growth
   page), the protocol/suite history, and the trim stages (R3, R5-R7).
8. **Provenance made visible.** Every fact links to the commit that proves it (the bug records already do
   this) — make it a STATED, visible property of the museum itself: "nothing here is narrated; everything is
   generated and sourced." That is what separates the museum from a hype page. **Raw material:** the bug
   records' existing provenance fields and the generator's existing source-linking (`museum/generate.mjs`).

**⚠ THE GOVERNING CONSTRAINT every one of the eight operates under — the caution the owner explicitly folded
in, not an afterthought: record everything, EXHIBIT the arcs that taught something.** The risk of
"EVERYTHING" (the thesis's own word) is exhaustive-but-unreadable. The bug museum's own curation principle —
`exhibited` is a DISPLAY judgment, every record still reaches the underlying corpus regardless (the same
distinction Protocol 50's P4 already draws for bug records: "Record always. Curate ruthlessly.") — governs
the WHOLE museum at this larger scale, not just the bug room. Without that curation signal, the walls fill
with hundreds of routine fixes and the handful that actually taught something disappear into the noise. So
this is not a suggestion sitting beside the eight facets — it is the constraint each one is built to operate
under: comprehensive record, curated exhibit.

**⭐⭐ CURATION IS THE MUSEUM-WIDE OPERATING PRINCIPLE (owner, 2026-07-22) — the governing law over every
exhibit, not just the bug room.** Owner, verbatim: _"A museum doesn't display everything at once, it curates a
list of display items… We're truly trying to build a museum."_ Stated as the one principle every exhibit
obeys: **CAPTURE EVERYTHING (the collection) → EXHIBIT A CURATED SUBSET (the display).** The full collection is
recorded and reachable; the walls show only the pieces that tell a story. **This is what makes it a museum
rather than a data dump** — the reason the distinction is load-bearing rather than stylistic. It is the same
one-source-two-views split already ruled for the queue view (**L**) and the AI-facing extract (**P3**), and
the same "record always, curate ruthlessly" the bug records (**P4**) already draw — generalized here to the
WHOLE museum. **Design consequence, recorded so a build session inherits it:** the generators build the full
COLLECTION; the exhibits CURATE what is shown. **The failure to guard against, named explicitly:** a build
session that dumps the whole collection onto the walls has built a **list, not a museum** — the precise thing
this principle forbids. (This is the same governing intent as the "record everything, EXHIBIT the arcs"
constraint just above; recorded again in the owner's own museum framing so the principle is unmistakable and
survives any future restructure that might drop the prose above.)

**⭐ THE ONE EXCEPTION — the Visual Web is EXEMPT from the curation law; it is the Magnum Opus (owner,
2026-07-22).** Owner, verbatim: _"the visual web is the only thing that doesn't need to follow the curation
law. It's the Magnum Opus."_ The Visual Web (facet 2's cross-reference; the parked Gource-aesthetic capstone
in `planning/2.8.5/plans/MUSEUM_MASTER_PLAN.md` §18) is the ONE exhibit that shows **EVERYTHING connected** —
totality is its whole point, so the curate-a-subset rule does not bind it. **⚠ THE HONEST WRINKLE, recorded so
it is resolved at build time rather than discovered then:** "show everything" appears to collide with the
already-recorded **legibility gate** — both external reviewers warned that a graph of everything-vs-everything
is an unreadable hairball, and the AUDIENCE+VISUAL block above raises that same clarity veto to a lay-audience
bar. **The resolution:** "no curation" means **nothing is left OUT of the DATA** — every node and edge is in
the web; legibility comes from **NAVIGABLE RENDERING** (a primary layer plus drill-down / zoom / filter),
**NOT** from omitting nodes. So the Visual Web is **complete-but-navigable**, where every other exhibit is
**complete-collection-but-curated-display**. That is the whole distinction, and it dissolves the apparent
collision: the curation law removes things from the WALL; the Visual Web keeps everything in the DATA and
manages density through interaction instead. **Cross-reference, not restatement:** the Visual Web's own spec
lives at `MUSEUM_MASTER_PLAN.md` §18 (Atlas Part 2); this entry only records that it is the exemption to the
curation law and why the exemption is legible — it does not re-spec the render.

**⭐⭐ AUDIENCE + VISUAL — a governing block over the thesis and all eight facets, recorded 2026-07-21 (owner
requirements, folded in per Protocol 50).** The thesis says WHAT the museum's centerpiece is; the eight
facets above say HOW that centerpiece is realized. This block says WHO it is for and WHAT IT MUST LOOK LIKE
getting there — every facet, and any future exhibit built from them, is built INSIDE these four constraints,
not around them.

1. **PRIMARY PUBLIC AUDIENCE = EVERYDAY, NON-TECHNICAL VISITORS.** Owner, verbatim: _"it's a 'museum' at the
   end of the day. where everyday people go and visit. everyday people need to understand it as well."_ Every
   top-level exhibit must be legible to someone who has never seen the code and isn't an engineer; technical
   depth stays reachable via drill-down, but the SURFACE layer teaches a layperson, not a reviewer. **Why the
   thesis already supports this, rather than fighting it:** the failure → lesson → measure → improvement arc
   (the thesis's own centerpiece, above) is a STORY — "something broke → here's what it taught → here's the
   guard so it can't recur" is legible to anyone, where a raw dependency graph or a protocol number by itself
   is not. The lay-audience requirement and the thesis's own arc framing are the same choice seen from two
   sides — recorded here so a future session treats "make it accessible" as the thesis's natural expression,
   not a tax levied against it.
2. **VISUALS ARE THE DRAW, not decoration.** Owner, verbatim: _"museums draw everyday people in with good
   visuals so remember that too"_ and _"I want some crazy looking visuals. animated visuals preferably but
   whatever we can do is fine."_ Good visuals are the functional HOOK that pulls a visitor in before they've
   read a word — THEN the visitor reads and learns. Record the ambition at full strength: striking, animated
   visuals, achieved within the hard constraints already binding this project (no build step, free tier,
   offline-capable, phone-first) — animated SVG/CSS/canvas, and the Gource-aesthetic "living web"
   (pulse/dim/organic motion) already scoped as the parked Visual Web capstone (facet 2's cross-reference,
   `planning/2.8.5/plans/MUSEUM_MASTER_PLAN.md` §18) — never heavy video or an added framework, the same line
   that already ruled out running Gource itself.
3. **THE CLARITY VETO GOVERNS, now generalized to a LAY-AUDIENCE bar.** Spectacle never beats a visitor's
   understanding — a visual that is impressive but confusing has failed, full stop. This RAISES the bar
   already standing on the museum's own Direction B identity work (below — "the CLARITY VETO still binds ...
   'in theme but not confusing'") and on the parked Visual Web capstone (item I / facet 2 above) from "an
   engineer or reviewer can read it" to "a random non-technical visitor gets it" — a strictly higher bar over
   the SAME gate, not a new one. Cross-referenced, not restated: the Visual Web's own spec lives at
   `MUSEUM_MASTER_PLAN.md` §18; this entry only raises who that gate is judged against.
4. **THREE audiences, do not conflate (record so a build session keeps them separate).** This block governs
   one of three. The PUBLIC museum audience (this block: lay-legible + spectacle-as-hook) is not the whole
   picture — the other two are already on file and must not be blurred into it. The AI-facing extract (**P3**)
   needs raw, compact, provenance-tagged data off the internal manifest, never the styled HTML a human reads.
   The owner (design note (d), above) needs phone-first visual navigation to CURRENT decisions, which the
   museum's release-pinned history deliberately does not carry. These three have genuinely opposed needs — a
   layperson wants a story, an agent wants structured facts, the owner wants what's current — and this
   AUDIENCE + VISUAL block governs only the first.

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
   - **✅ RESOLVED (2026-07-23) — the capture pipeline is now BUILT and the reality captures are
     release-pinned.** At the landing this was deliberately unfinished (working-tree screenshots, page stating
     so on its face); it is now closed. `museum/capture.mjs` + `museum/reality-captures.json` +
     `museum/accounts/capture-fixtures/{fnv,fo3}.json` + a `--capture` build flag produce **20 captures pinned
     to `v2.8.5` (commit `06e51801`)**, reproducibly (a normal build stages from the committed PNGs, launching
     no browser), with a real served-render check (`assertServedImages` over a localhost origin, **6 exhibited /
     0 broken**). See the intent-vs-reality blockers under P2 — all three now closed.

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

**⭐ Design direction — archive-native navigation + fluid motion (NEW museum design note, owner 2026-07-25).**
The current room-nav uses RobCo/terminal **"keycap" buttons** — a **terminal-language holdover that fights the
archive aesthetic** the museum deliberately chose. The direction: **break to ARCHIVE-NATIVE navigation** —
**catalog cards / filing drawers that pull-slide open**, a card that **expands smoothly INTO its room** rather
than a hard page jump. **KEEP the Records Office Dark identity** (this is not a re-theme); change the
**EXPERIENCE to fluid / smooth** — real **motion BETWEEN rooms** (cross-fades / slides, so it feels like
walking a hall), with **ambient motion as the draw**. **Possibly a continuous "archive floor"** the visitor
**pans / scrolls** rather than discrete gated rooms — which also **sets up the Visual Web's living-surface
feel** (facet 2). **Rails (unchanged, load-bearing):** the **clarity veto governs** (fluid ≠ confusing),
**mobile-first**, **no build step, animated SVG/CSS only**. **How it gets designed:** the actual look is a
**FABLE design pass fed by P8's structure/room map** (the audit's layout blueprint, Part A) — **NOT a GPT
critique** (GPT can't see the private material the map is built from). **Design-intent capture only — not
built.**

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

**✅ THE CLAUDE-FIRST PASS HAS NOW RUN (2026-07-21) — results recorded here per Protocol 50.** An independent
Claude session audited the museum; its report is at that session's scratchpad `AUDIT_REPORT.md`.

**✅ Filing convention established (2026-07-21) — resolves the earlier "file it under `museum/`?" placement
question.** Audits **OF the archive itself** are filed in the archive at
**`_RobCo-Archive/audits/<target>/<date>_<slug>.md`** — NOT in `planning/`, which is a **1:1 mirror of the app
repo's planning folder** and would wrongly duplicate archive-only audits there. The museum audit is filed under
that path and now **renders inside the museum under STANDING** (the classifier was taught to recognise
`audits/`). Recorded here so the convention is discoverable from the app repo's queue, not only in the archive.

**✅ FIXED, committed, AND PUSHED to the archive — three commits, verified on archive `origin/main` (2026-07-23)**
(`e1fa0ab` five self-audit fixes → `a5bfe4d` regenerate → `cef158f` drop a dangling § anchor; all three have
now reached the private remote — the earlier "still unpushed" note is cleared, a machine loss can no longer
take this work):

- **The lobby's "Operators 3" stat** counted author _emails_, so it split the owner across two GitHub addresses
  and counted dependabot as a person — while sitting beside a masthead reading "one operator." Fixed to count
  distinct author _names_ filtering GitHub's `[bot]` suffix convention (**self-updating, NOT a maintained
  list**), and the masthead now reads the _same computed value_ so the two structurally cannot disagree again.
- **The condition report's "UNCLASSIFIED 3"** about the museum's own repo (`.claude/launch.json` leaking as
  tooling; `memory-audit/` unrecognised by the classifier) → now **zero**.
- **A malformed `redirect-ledger.json` silently dropping all 363 redirects while reporting "done."** Now
  distinguishes _missing_ from _malformed_, AND compares against the count the previous build actually wrote to
  disk (catching a valid-but-emptied ledger too) — surfaced as a visible lobby warning while still exiting 0.
- **Growth-page prose** that contradicted itself about whether its numbers were measured or read from the
  changelog.
- **A stale code comment** citing a drift example that no longer exists at the pin.

**⬜ STILL OPEN from the audit — recorded, each with its disposition:**

- **⭐ Gallery mats lost the design → back to FABLE (a design value, deliberately NOT code-fixed).**
  `.mz-galcell` is a dark card with a dark border (~1.05:1 against the room) while every other exhibit surface
  kept the cream lamplit mat (8.6:1) — the exact "invisible as a shape" failure the adjacency finding was
  written to prevent, on the pages with the most dark screenshots.
- **v2.8.0 shows two ship dates a day apart** (changelog vs tag commit) — a timezone artifact. **Low.**
- **⚠ The audit could NOT check actual pixels** — screenshots timed out, so every visual conclusion is a
  _computed-style measurement_, not eyeballed. Recorded as a **real gap for a phone-first owner**: nothing has
  confirmed how the museum actually _looks_.
- **The `file://` auto-redirect is still unverified** (already queued as P1's `file://` click-test; the audit
  **confirms it remains open**).
- **✅ CLEARED (2026-07-23, `da5d82b`) — the committed museum was STALE against its inputs (7 syncs behind);
  now regenerated to match HEAD.** It had been ~307 pages behind by design (release-cadence regeneration), but
  the drift was reconciled: regenerated to match the current archive HEAD, and **two successive regens came
  out byte-identical** (reproducibility holding). What you open now shows current content.
- **⚠ The audit's own caveat, which MUST survive:** a Claude session auditing Claude sessions **shares their
  blind spots**, so its clean findings are **WEAK evidence** — exactly why (e)'s plan puts external review
  second. The planned external pass is still warranted.

**Two self-reported process behaviours from the fix session — recorded because self-reporting is the behaviour
worth reinforcing:** it ran a **global git-config change** while debugging (violating the standing
never-touch-git-config rule), **reverted it immediately** and confirmed it was never needed; and it **caught
itself writing a `§` comment tag referencing a bug record that does not exist** (`cef158f`) and **removed it
rather than fabricating a record** to justify the reference.

**⭐ DE-GATE CLARIFICATION (2026-07-23) — the memory audit-and-split does NOT gate museum PUBLICATION.** The
public tree is **generated output only**: no memory ever enters it, and the name-substitution guard (below)
scans the emitted tree clean before exposure. So publication does **not** wait on the memory split. The
memory-split remains the prerequisite for exactly ONE thing: granting an external auditor **archive** access
(the optional second-pass external audit), because the archive itself contains `memory/`. It is therefore
**decoupled from publish** and is an owner decision on the **external-audit path alone**, not a publish blocker.
(This corrects the earlier framing that treated the split as a shared publication + audit prerequisite.)

**⚠ The BLOCKER on external ARCHIVE access — an open owner-decision (audit path only, per the de-gate above).**
GPT's connector returned **404 on the private archive** because the GitHub App's repo allow-list excludes it.
Granting access is a one-time reversible settings change — **but the archive contains `memory/`**, which is why
the external audit is gated on a memory audit-and-split. Three options were put to the owner:

1. Grant access to the **whole archive** — best audit, but **memory is exposed**.
2. **★ Do the memory split FIRST, then grant access (Dispatch's recommendation)** — the split is worth doing
   anyway (a clean separation of the reference memory from the archive), and it unblocks the external audit
   without exposing memory.
3. A **scoped throwaway repo** with just `museum/`, `bugs/` and the generator — fastest, no exposure, **but**
   GPT then cannot check how the museum relates to the archive it is built from, and _that relationship is
   where the bugs have been_.

**Awaiting the owner's call between these three; do not proceed with external ARCHIVE access until then. This
does not hold up publication** (de-gate above).

**P1. ✅ Museum reproducibility — a sub-program, now FULLY CLOSED (2026-07-23).** All fixes have shipped to the
archive's `main`, and the last open item — the `file://` redirect click-test — has now **PASSED**. Everything
below is done and committed.

- **✅ Shipped — the CRLF/LF page-renaming bug (`2f4848c`, `5bc7137`, `aa15e9a`).** The machine's SYSTEM git
  config has `core.autocrlf=true`, so a fresh clone checked out every text file as CRLF while the generator
  writes LF. Because doc pages are named by a hash of their content, that **renamed every doc page** on a
  fresh regeneration. Fixed with a `.gitattributes` forcing `eol=lf` plus `sync.ps1` writing LF at the
  source.
- **✅ Shipped — the README.txt leak (`76c1970`).** `generate.mjs` walked the filesystem directly, so a
  gitignored `README.txt` got picked up and published anyway. Fixed by walking `git ls-files` instead of
  disk. Artifact count corrected 705 → 704.
- **✅ SHIPPED + COMMITTED — path-based doc-page URLs.** Content-hash doc-page URLs were replaced with
  **path-based** ones so an address is stable across content edits (the earlier "in flight, no commit yet"
  state is cleared — it is done and committed). Two things rode along, both landed:
  - **✅ A redirect ledger, mined once from this repo's own git history** — **389 entries**, with a build-time
    **stub-drop guard that alarms if more than 50% of stubs vanish** in a regeneration (so a valid-but-gutted
    ledger is caught, not silently accepted). A normal build writes an HTML redirect stub at each recorded old
    address (chosen over Cloudflare's native `_redirects` so the museum stays openable straight off disk).
  - **A thumbnail-render-nondeterminism finding, sidestepped rather than root-caused.** ~11–13 of 28
    thumbnail PNGs came out with differing bytes on every fresh regeneration (suspected Chromium PNG
    re-encode jitter). The fix reuses the previous build's committed thumbnail whenever one exists.

- **✅ DONE (with one coarseness caveat recorded) — rename permanence: an explicit alias map + a build-time
  vanished-path check (shipped 2026-07-23).** The alias-map is in place and the build-time vanished-path check
  is **PRESENT** — the caveat worth recording is that the check is **coarse: a bulk >50% alarm, not a per-path
  assertion**, so a small handful of individually-vanished paths would not trip it. Good enough for
  pre-publication (a broken internal link is cheap before publication); a per-path tightening can follow if it
  ever earns its keep. The design and reasoning below stand as the record of WHY it was built this way. The
  path-based-URL work fixed addresses moving on a content EDIT; this handles a document later being RENAMED.
  The owner asked whether to widen it. **Answer: yes, but not by the obvious route.**

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

- **✅ DONE (2026-07-23) — the `file://` redirect click-test PASSED.** A redirect stub opened over a real
  `file://` location **navigated to the correct target** (both assertions green). This was P1's sole remaining
  item; it is now closed. "Opens correctly from disk" — the entire reason HTML stubs were chosen over a
  host-specific `_redirects` file — is now verified by a real open-and-click pass, not assumed from the HTTP
  check alone.

**P2. ✅ Museum publication — PUBLISHED & LIVE (2026-07-24). The full build-complete → expose path is done; everything below is kept intact as the record of HOW it shipped.**

**✅ PUBLISHED & LIVE (2026-07-24).** The museum is public at **https://robco-exhibit.pages.dev/** (Cloudflare
Pages), served from a **brand-new public repo `github.com/zerckzzyHD/Robco-Exhibit`** built from generated
output only — **zero archive history** (the private archive was never made public). The exposed tree was
**name-scrubbed and verified zero-leak** and **alias-authored** (exhibit commit `2fc7b14`). The Exhibit repo's
GitHub **About (description + homepage) is set**, and the **Robco-UOS README has a Museum section** linking the
site + repo (app-repo commit `1f0ed7c`). The turnkey checklist below was executed end-to-end. **On resume,
read the `museum-publish-internal-docs-leak` memory** for the publication lesson to carry forward.

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
- **✅ Self-containment SOLVED for the public path (2026-07-23).** The full `museum/site/` tree is not
  self-contained (thousands of references point at mockup images living outside it), which is exactly why link
  validation must run on the standalone public tree with the private archive unreachable — and the new
  `--public` variant (below) does precisely that: it stages a self-contained `museum/public/` subtree and
  `assertPublicSelfContained` verifies it full-tree (360 refs / 0 broken). The principle stands; the public
  path now satisfies it.
- **The owner is owed a step-by-step publication guide when this is actually attempted.**

**⭐ INTENT-VS-REALITY PUBLICATION BLOCKERS — all THREE now CLOSED (verified by Dispatch against the archive:
raised 2026-07-22, resolved 2026-07-23).** Each is recorded with its fix and its reasoning so the LESSON
survives even though the blocker is gone:

- **✅ (a) FIXED — images no longer escape the site.** The exhibit images are now **bundled in-site**
  (`assets/reality/`, `assets/intent/`) with **zero `../../` escaping paths** — so they render when the museum
  is served from its own root or published standalone, not only off the full archive on disk. The original
  blocker: the exhibit referenced images OUTSIDE `museum/site/` (INTENT at `../../planning/...`, SHIPPED at
  `../design/...`), none copied in, so they broke when served. **⭐ Record the FALSE-GREEN lesson (a
  green-that-lied INSIDE the museum), which MUST survive the fix:** the museum's own link check had **passed** —
  because it resolved paths **ON DISK**, and "resolves on disk" ≠ "works when served." A check that validates
  against the disk layout the museum will never be served from is exactly the class of lying-green this project
  keeps being burned by; the served-vs-disk distinction is the lesson, and the new capture pipeline's
  `assertServedImages` (over a localhost origin) is the guard that answers it.
- **✅ (b) FIXED — captures are release-pinned, not working-tree.** The "reality" captures are now pinned to
  **`v2.8.5` (commit `06e51801`)** via the built capture pipeline (`museum/capture.mjs` +
  `museum/reality-captures.json` + `museum/accounts/capture-fixtures/{fnv,fo3}.json` + the `--capture` flag),
  reproducibly (a normal build stages from the committed PNGs, launching no browser). The original blocker was
  that the screenshots came from the Fable design pass, not the pinned release, and the pipeline "was never
  built" — it is now built and working.
- **✅ (c) RESOLVED — a finished CURATION DECISION, not an incomplete stub.** The exhibit is **3 curated pairs,
  owner-finalized 2026-07-22** (Settings and Databank/FO3 were **deliberately cut**, with **hand-written
  divergence notes**). The earlier "only ~2 proof-of-concept pairs, of many" reading was wrong: this is the
  museum-wide curation principle correctly applied — the **pipeline captures the full COLLECTION** (every panel,
  both games, phone widths), the **exhibit CURATES the telling pairs**. "Complete" here means **complete
  collection, curated display**, and that curation is a finished owner decision, not a stub awaiting more pairs.

**⭐ THE AUDIT LESSON — the NEXT museum audit must SERVE-AND-LOOK, and check COMPLETENESS, and run AFTER the
fixes (2026-07-22).** The previous Claude audit (design note e, under P) **missed all of the above** because its
screenshots timed out, so it fell back to checking **on-disk** — the exact reason blocker (a)'s false-green
survived. So the next audit MUST **render the SERVED pages and look** (not check on-disk), and MUST check
**COMPLETENESS** (is each exhibit fully populated, or a proof-of-concept stub?), not only correctness. And it
must run **AFTER these fixes land, not before** — auditing the known-broken state proves nothing. This tightens
design note e's "Claude first, external second" plan with a concrete method requirement. **✅ DONE (2026-07-23):**
the three blockers were fixed and the `--public` staging tree built self-contained, so this serve-and-look +
completeness re-audit **ran on the public tree and PASSED** — every public page rendered at phone widths and
viewed, all exhibits complete + correct, no overflow/contrast/invisible-card issues → publication-quality (see
the P2 build-chain record below). The **external second** audit is a separate, decoupled path (design note e).

**⭐ THE MUSEUM-WIDE GALLERY ESCAPE — CURATION DECISION MADE: OPTION B (owner, 2026-07-23), and the `--public`
build variant is now BUILT.** The blocker (verified by Dispatch 2026-07-23): the room galleries embed **429
images / 172 MB** pointing at **archive originals** — fine locally (the full archive is on disk), but they
**break in a standalone public tree** (those images aren't bundled). It broke **NOTHING** at the time (the
public exhibit repo doesn't exist yet), so it was always a decision to settle before publication, not a live
defect. The three options that were on the table, with the outcome:

- **A — bundle all 172 MB.** Every gallery works publicly, but this **violates the curation law** (the walls
  become a data dump, not a curated display) and bloats the public repo. **Rejected.**
- **✅ B — CHOSEN (owner, 2026-07-23).** Bundle only the exhibited/curated assets self-contained; the raw room
  galleries (429 imgs / 172 MB) stay **PRIVATE-archive-only**. The public exhibit shows the curated pieces; the
  full room galleries remain a private-archive affordance. Honors the curation law; smallest public footprint
  (Dispatch's recommendation, now the owner's decision).
- **C — bundle thumbnails + link originals out.** **Rejected.**

**✅ THE `--public` BUILD VARIANT IS BUILT (archive commit `7d7b7a2`).** `museum/publish.mjs` +
`node museum/generate.mjs --public` produce a **`museum/public/` staging subtree (754 files / 35 MB, no 172 MB
galleries)**. **INCLUDES:** the intent-vs-reality + bugs exhibits + `assets/{intent,reality,bugs}`, shared
chrome, all **285 doc pages + redirect stubs**, the version rooms **public-minus-their-image-grids** (each
gallery link neutralised to a "held in private archive" span), and the **28 prototype `.html` pages bundled
public** at `assets/prototypes/`. **EXCLUDES / NEUTRALISES:** the 20 raw `gallery-*.html` (private) + 297
out-of-site anchors, rewritten to `.mz-private` spans. **A full-tree served-link check
(`assertPublicSelfContained`) reports 360 refs / 0 broken**, with an independent cross-check of 4399 refs / 0
out-of-tree; **reproducible** (two runs byte-identical); and **ritual-not-gate** (a normal build never touches
`museum/public`).

**The three owner sub-decisions this locked in (2026-07-23):** (1) the **prototypes ship PUBLIC**; (2) the
version **rooms ship PUBLIC-minus-grids** (structure and prose public, image grids private); (3) output goes to
a **`museum/public/` staging subtree first** (staged, then substituted + scanned, then exposed — never
generated straight into a public remote).

**✅ Neutralised-affordance copy fixed (archive commit `7776a07`).** The public-minus-grids rooms no longer
show dead buttons where a private gallery used to link: each neutralised affordance now reads as an
**intentional note** — e.g. _"N images — held in the private archive"_ — so a public visitor sees a deliberate
curatorial statement, not a broken control.

**✅ Serve-and-look re-audit PASSED → PUBLICATION-QUALITY (2026-07-23).** Every public page was **rendered at
phone widths and actually viewed** (the serve-and-look method the audit-lesson block demands, not an on-disk
check): all exhibits **complete and correct**, with **no overflow, contrast, or invisible-card issues**. The
`--public` tree is publication-quality as it stands.

**✅ PUBLISH SAFETY MACHINERY BUILT (archive commit `a0aebcd`).** `node museum/generate.mjs --publish-prep
--real-name="<X>"` emits the **gitignored, transient `museum/.publish-out/`** with **parameterized
name-substitution** — the real name is supplied at runtime and **never committed** — plus a **fail-closed
raw-byte guard** (catches the real name even hidden inside image bytes, not just text) and a
**credential/token scanner**. Every guard is **fail-closed**: on any hit it **aborts and emits nothing**.
Proven **red-then-green** with a fake name + a planted fake secret (neither ever committed).

**⭐ P2's TURNKEY OWNER EXPOSE CHECKLIST (rewritten 2026-07-23 — the build + safety machinery are done; what's
left is the owner running the expose).** The self-containment problem is solved, the tree is
publication-quality, and the name-sub + secret-scan safety is built and proven. The remaining path is a short,
mechanical checklist:

1. **Run `--publish-prep` with the real name at runtime** — `node museum/generate.mjs --publish-prep
--real-name="<real name>"` — which emits the substituted, scanned, fail-closed `museum/.publish-out/` tree
   (the real name lives only in that command, never on disk or in git).
2. **Review `museum/.publish-out/`** — eyeball the emitted tree that will actually be exposed.
3. **Create the `Robco-Exhibit` PUBLIC repo** — the private archive can **never** be made public (its git
   history retains `memory/` regardless of any later deletion), so publication is always a fresh public repo
   built from emitted output only.
4. **Push the emitted tree** to `Robco-Exhibit`.
5. **Wire Cloudflare Pages** (never GitHub Pages — the origin reasoning above: a GitHub project site would share
   the live app's browser origin + localStorage).
6. **Verify-private-then-expose** — verify the pushed commit privately, then expose that same already-verified
   commit publicly.

**✅ DONE (2026-07-24) — all six steps executed; the owner ran the Cloudflare + go-live himself.** Live at
https://robco-exhibit.pages.dev/.

**Pre-public design polish still owed (NOT an expose blocker — the site is already live; wanted for polish):**
the **Fable Direction-B design execution + the gallery-mats fix** (both recorded above under P) — and the
**intent-vs-reality FRAMING fix (P9, pre-diagnosed)**: the three live pairs each show the full console screen
while their captions call out one element, so the comparison doesn't pop; the fix is a per-pair crop (see P9
for the full diagnosis). A public exhibit is the wrong place to discover the visuals are flat — these are the
post-launch polish pass.

**Off the publish path (decoupled — see the de-gate clarification under design note e):** the **external second
audit** and the **memory audit-and-split** it needs are the **external-audit path only**, NOT a publication
gate — the public tree carries no memory and the name-sub guard scans it clean. The owner's archive-access call
is still open, but it does not hold up going live.

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

**What P depends on.** The archive repo and its folder structure (exists, Protocol 48). P1 (reproducibility)
and the rename-permanence work are **done**; only the `file://` click-test remains, and ideally J (below)
should exist and pass, before P2 is attempted. ✅ **The App Check debug-token blocker on publication is
CLEARED (2026-07-20)** — see the App Check entry in "Closed / off the board" below.

**Done means (P core, met):** a generator produces the museum from the archive's structure, its first run
backfilled all shipped versions plus the graveyard, each release gets one frozen hand-written account, and
the whole thing is a release-time ritual that can never block a release. **Done means (P1, ✅ MET):** a fresh
clone regenerates the museum byte-identical, with old hash addresses still resolving — landed and committed,
and the `file://` click-test has passed; P1 is fully closed. **Done means (P2, not yet exposed —
build-complete: curation decided (B), `--public` tree self-contained + publication-quality, publish safety
machinery built + proven, down to the owner's turnkey expose checklist):** `Robco-Exhibit` is live and correct
on Cloudflare Pages, verified before exposure.

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

### P4. ⬜ The bug-record obligation — DESIGN DECIDED (owner, 2026-07-21; SHARPENED to find-time 2026-07-22), do not build yet

**What it is.** The rule that a defect leaves a durable **record** — the raw material the museum's bug
room (P) and the AI-facing extract (P3) are built from. Its shape was decided in conversation over
three rounds of the owner sharpening it, and is recorded here per Protocol 50 because it lived only in that
conversation. **The 2026-07-22 sharpening (below) moved the trigger from FIX-time to FIND-time:** a record is
opened the moment a bug is FOUND and completed when it is fixed — the base rule "a defect leaves a record"
is unchanged; WHEN the record starts is what moved.

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

**⭐ SHARPENED 2026-07-22 (owner) — a record is written at FIND-time (OPEN), and the FIX completes it.** The
prior design above wrote the record at fix-time (a defect fix carries its record in the same commit). The
owner moved the trigger earlier: **a FIND writes the record immediately, in state OPEN; the FIX completes it**
— the guard it produced, the cost, the provenance, and the flip to **SEALED** (museum-eligible). A record
therefore advances through a small lifecycle as it is worked: **OPEN → IN-FLIGHT → SEALED.**

- **Why the trigger moved (record the reasoning, not just the outcome).** Two gains. (1) A found bug is
  **tracked and visible from the moment it is spotted**, so it cannot be lost in the gap between finding and
  fixing — the exact interval where "I'll write it up when I fix it" quietly drops the record. (2) It makes
  the museum's amber **"in-flight" specimens LIVE** — an actual current state of open work — instead of a
  fix-time snapshot that only ever shows already-closed bugs.
- **The fix-time push nudge STAYS as the backstop.** Moving the trigger to find-time does not remove the
  existing pre-push nudge (P4's "ONE line folded into the existing nudge" above): a commit that looks like a
  defect fix but carries no record is still named. Find-time OPEN is the new front door; the fix-time nudge is
  the safety net for anything that skipped it. Net new mechanisms remain **ZERO** — the lifecycle is fields on
  the existing record, not a new surface.
- **⛔ NO generated issues-style board / view — the owner explicitly DECLINED it (2026-07-22).** Recorded so a
  future session does not build it thinking it was approved: the **records stay the single source**; a
  GitHub-Issues-style board of open/in-flight bugs was considered and **rejected as unneeded**. IF such a view
  is ever wanted, the hard rule is that it must be **generated ONE-DIRECTIONALLY from the records** (the same
  one-source-many-views discipline as L and P3) — **never real, editable GitHub Issues**, which would be a
  second authoring surface that drifts from the records. For now: do not build any board.

**Where it sits.** It is the input side of P (bug room) and P3 (extract), and its enforcement rides the
Protocol 48/50 pre-push nudge that already exists — so it depends on nothing new and is buildable whenever the
museum records get their first-class schema. **Design only for now; do not build.**

**Done means (when built):** a found defect opens a record (state OPEN) that advances OPEN → IN-FLIGHT →
SEALED as it is worked; a fixed-defect commit that carries no record is named by the existing pre-push nudge
(the find-time backstop); every record — dull or not — reaches the AI extract; `exhibited` controls only
display; the amber "in-flight" specimens reflect live open work rather than a fix-time snapshot; museum
regeneration runs after the release tag and never blocks a release; the nudge speaks on success as well as
failure; and no editable issues-board is built (records stay the single source).

**⚠ Record-count correction (2026-07-21): the bug room holds 10 records, NOT 11.** Verified directly on disk —
`bugs/*/record.md` = **10** (`ai-inventory-overwrite`, `crlf-page-rename`, `cross-game-registry-leak`,
`premature-pin`, `restless-thumbnails`, `search-box-weight`, `silent-flatline`, `two-units-one-axis`,
`untracked-stowaway`, `vanishing-addresses`). The "11" that has circulated traces to a **`BACKFILL_REPORT.md`
in the archive that contradicts itself** — its line 146 asserts "11 records" while the directory it describes
holds 10. This is a clean specimen of this project's own rule **"a session's account is a claim, not
evidence"**: a session's own report, not the disk, was the source of the wrong number. Do not re-derive "11"
from that report; count `bugs/*/record.md` if in doubt.

### P5. ⬜ Museum CONTEXTUAL RETURN — a breadcrumb + an in-page back control (verified, not assumed, 2026-07-21)

**What it is — and what it is NOT (inspected directly, not assumed).** Dispatch inspected the generated pages.
**Every document page, including deeply nested ones, DOES carry the full nav bar** with correct relative paths
back to the lobby, rooms, bug museum, intent-vs-reality, graveyard and search — so **nobody is stranded.** What
is missing is **contextual return**: click from (say) the 2.8.0 room into a document and there is no way back
to _that room_ — only to the lobby, from which you re-navigate. On a phone that is real friction. Owner: _"it
should be fully interactable without having to click the back arrow in the browser."_

**The wrinkle that shapes the fix.** A document is reachable from a **room**, a **gallery**, OR a **search
result** — so "where you came from" is **not a fixed property of the page**. Therefore the fix is **both
halves, not one**:

- **(a) A structural breadcrumb** — the document's own place in the archive (deterministic, generated). Answers
  "where does this live," independent of how you arrived.
- **(b) A plain in-page back control using browser history** — which is what the owner actually asked for, and
  which works fine from a local `file://` location. Answers "take me back where I came from."

**Where it sits.** Museum-generator work (`museum/generate.mjs` in the archive); does **NOT** gate the
`dev → main` release. Independent of P1's reproducibility work but touches the same generator, so sequence it
so it does not collide with P1's in-flight path-URL change.

**Done means:** every generated document page carries a generated structural breadcrumb AND an in-page
browser-history back control that works from `file://`; a reader reaching a doc from a room, gallery, or search
can return to their origin without the browser's own back button.

### P6. ⬜ AI-collaboration as a museum exhibit — DESIGN-INTENT ONLY, owner-approved (new, 2026-07-21)

**What it is.** Not a document page — an EXHIBIT. The museum should tell the story of how RobCo is actually
built, and the multi-AI collaboration is a headline part of that story: the Dispatch orchestrator handing
work across **Fable** (design), **Opus** (diagnose/plan/audit), **Sonnet** (implement) — Protocol 8's
three-model workflow — plus the **blind external reviews** (GPT-5.6 Sol, Gemini 3.1 Pro) used for
workflow/architecture audits. Ties to the already-parked idea of "AI-collaboration rooms" — **checked this
session; that concept was not yet present anywhere in this file**, so this entry is the first record of it,
not an extension of an existing one.

**The new fact that prompted recording this now (owner, 2026-07-21).** Gemini now holds a STANDING "Review
Mode" in its own memory: handed a structured RobCo prompt, it becomes an independent technical critic and
does not implement. This turns the multi-AI review from an ad-hoc thing sessions re-explain each time into a
real **standing capability** with the external-reviewer seat pre-configured — a standing, repeatable part of
the process is what makes it exhibit-worthy rather than a one-off anecdote.

**Why an EXHIBIT and not just a doc page.** The underlying material already lives in orchestrator memory
(`external-ai-prompt-delivery.md`) and renders automatically as a museum document page, so the raw fact is
already technically reachable. But a buried doc page is not the same as the story being VISIBLE — the ask is
for the collaboration itself to be a first-class, browsable part of the museum's front-facing narrative (an
"AI-collaboration room"), with the memory file as its source material rather than its presentation. Recorded
as **design-intent, owner-approved — NOT yet designed or built.**

**PUBLIC/PRIVATE boundary — recorded now so a future publication pass does not leak it.** The
review-WORKFLOW story (roster, roles, Review Mode, the blind-review mechanics) is publishable material for
the future public exhibit (P2). The owner's PERSONAL context — his NCLEX study-guide work, held in
`owner-context-beyond-robco.md` — is NOT publishable and stays private. This is exactly the boundary the
pre-publication memory audit-and-split (already a P2 prerequisite) exists to enforce; this entry names the
specific leak risk so that split session knows to check for it.

**Cross-references (G and R11 are NOT rewritten — link only).** The same multi-AI review capability is both
an exhibit SUBJECT here and the actual MECHANISM item **G** (the blind workflow review) uses to review the
project. **R11** (the knowledge graph) is evidence-infrastructure for G — see R11's own gating-deferred note
and G's own R11 cross-reference, both added alongside this entry.

**Where it sits.** Museum sub-program (P), design-only, alongside P2/P3. Needs nothing new to design later;
if it links to the memory-derived doc page it should follow P1 (stable document identity), and it inherits
the same PUBLIC/PRIVATE boundary P2's memory split already has to resolve.

**Done means (when eventually designed/built):** a dedicated AI-collaboration exhibit exists in the museum,
sourced from orchestrator memory (not hand-curated), telling the Fable/Opus/Sonnet + blind-external-review
story with Gemini's Review Mode as evidence it's a standing capability; the owner's personal context stays
excluded by the same boundary P2's memory split enforces.

### P7. ⬜ Origin-overview exhibit — the beginnings + the pivot as a turning-point centerpiece (PARKED, not started; owner floated 2026-07-24)

**What it is.** A museum exhibit telling the project's ORIGIN arc: the **beginnings** (it started as
`GEM-Website`, living on OneDrive) → **the pivot** (moved to `C:\Dev`, and the toolchain switched from
Antigravity to Claude Desktop — after which **development time dropped hard**, i.e. the project got much
faster). The pivot is the **turning-point narrative** — the single "everything changed here" beat the origin
story pivots around, not a flat timeline.

**Why it's exhibit-worthy.** It's the human "how did this even start" that the release-history exhibits don't
carry, and it pairs naturally with the museum's failure→lesson→improvement thesis (the pivot IS an
improvement arc at the tooling level). **Recorded as a parked candidate — not designed, not built.**

### P9. ⬜ Intent-vs-reality FRAMING fix — crop each pair to the element that changed (PARKED, PRE-DIAGNOSED; owner, 2026-07-24)

**What it is.** A **framing fix** on the now-LIVE intent-vs-reality exhibit so its "here's exactly what changed"
comparison actually pops. (Header was "curation/photo fix" — sharpened to FRAMING after the diagnosis below.)

**⭐ PRE-DIAGNOSED (Dispatch, 2026-07-24) — recorded so a future session does NOT re-diagnose from scratch.**
Dispatch investigated the live exhibit + `museum/accounts/intent-pairs.json`. Verdict: **the pairing, the
images, and the captions are all CORRECT — nothing is broken or mismatched.** The three pairs — **PL.I
Operations / Load-Cell Weigh Bridge**, **PL.II Operator / Vital Telemetry**, **PL.III Chassis / Hour Meters** —
use the **right design mockups** (`planning/2.8.0/mockups/{operations,nv-machine,chassis-core}-412.png`, bundled
to `assets/intent/`) matched to the **right release-pinned captures** (`fnv-{operations,operator,chassis}-412`
from `reality-captures.json`, in `assets/reality/`), each with its hand-written divergence note. Images render
fine and the site is self-contained — this is **NOT** a broken-image or self-containment defect.

**The real issue is FRAMING, not content.** Both sides of every pair show the **FULL console screen**, while
each caption calls out **one specific element** (the load-cell dial / the vitals block / the hour-meters). So
the eye can't find the thing the words describe, and the "exactly what changed" comparison doesn't sell.

**The fix, and its true size.** **Crop each pair down to the element that changed** so the exhibited detail
matches its caption. This is **per-pair design / image work — NOT a small tweak** (three crops, each judged
against its caption), which is exactly why it was **deliberately PARKED (owner's call, 2026-07-24) rather than
rushed into the subscription lapse.**

**Status.** The site is already public and correct; this is post-launch polish, filed alongside the Fable
Direction-B + gallery-mats polish (P2's "pre-public design polish", now post-public). **Recorded as the
pre-diagnosed, FIRST-THING-BACK museum fix — not started.**

### P10. ⭐⏭️ REMOVE the hardcoded 10-stop keypad tab bar and redo the nav — the "no 11th slot" constraint is VOID (owner, 2026-07-27, emphasized twice)

**⛔ CAPTURE THIS EXPLICITLY SO IT CANNOT BE LOST — it dissolves a constraint another document still states as
hard.** The museum's global nav is **ten hardcoded stops on a keypad conceit** (LOBBY · 2.5.0 · 2.6.0 · 2.8.0 ·
2.8.5 · STANDING · BUGS · INTENT · GRAVEYARD · SEARCH), with grids tuned to 4/5/10 columns at three
breakpoints. **P8's structure map records that as a hard constraint** — _"NAV has no free slot… there is no
eleventh key"_ — and lists "the eleventh nav key" as an open owner decision.

**The owner's answer, verbatim (2026-07-27):** _"we can get rid of the hardcoded 10 stop tabs. that was from
RobCo theme copy I believe but we changed directions since then."_

**So the constraint was never a design decision at all — it is leftover RobCo-terminal theme copy from before
the museum took on its own Records Office Dark identity** (no bezel, not fully in-theme). **The "no 11th slot"
limit is therefore VOID**, and one of the two open build decisions P8 surfaced is resolved in favour of _the
nav is free to change_. (The other — motion as **exhibit** behaviour rather than **container** behaviour —
still stands open; the identity README's own sentence is the permission slip, and it must be quoted to the
owner rather than assumed.)

**⏳ OWED: a follow-up discussion with the owner.** He asked to _"get back to me immediately after we finish
the gpt/dispatch thing"_ — i.e. after the control-plane feasibility thread (**CP1**). The discussion decides
**what replaces the ten stops**, and how the new nav interacts with the Visual Web and the arc-spine /
coverage-view rooms **P11** adds. Do not design it unilaterally first.

**Two things to fix while the nav is open, both already on file:** **Growth is currently unreachable from the
nav bar** (its only inbound edge is the lobby's Fig. 1 card), and the archive-native navigation direction
already recorded under **P** — catalog cards / filing drawers that pull-slide open, a card expanding INTO its
room, real motion between rooms — is the design intent this rebuild should carry. **Rails, unchanged:** the
clarity veto governs, mobile-first, no build step, animated SVG/CSS only, and every nav target stays a real
`<a href>` (middle-click / open-in-new-tab / copy-link must keep working, and navigation must cost zero
script).

**Done means:** the ten hardcoded stops are gone, the replacement nav is owner-agreed rather than
session-invented, growth is reachable from it, and P8's "no eleventh key" constraint is struck at its source
rather than left contradicting this entry.

### P11. ⬜ The VISUAL WEB build on P8's structure — arcs.json → arc spine → coverage view → the radial web (the Magnum Opus; P8 shipped, so this is now buildable)

**What it is.** The museum's capstone, now with a real blueprint under it: **P8's structure/connection map is
its input**, and that map is explicitly a **superset of `library/knowledge-graph.json`** — the shipped R11
graph (27 nodes / 166 edges) is schema version 1.x and this is 2.0.0. **Protocol 22 governs: EXTEND R11, do
not fork it.** Every existing node kind, edge type and observation state survives unchanged; the superset only
adds (14 new node kinds, 21 new edge types, projected ≈1,450 nodes / ≈2,200 edges).

**⭐ The single most important structural finding, recorded so nobody starts at the wrong end: the Visual Web
is a DATA problem, not a rendering problem.** The museum today is a **star topology** — lobby plus tab bar out
to each room, and essentially nothing else. There is **no room→room edge, no doc→doc edge, and one single
cross-room content edge in the entire site**. Every real relationship this project has — which bug produced
which guard, which lesson drove which protocol — currently lives in **prose**. **Building the renderer first
would produce a beautiful picture of a star.**

**The four stages, each independently useful and independently abandonable (P8's own recommended order):**

- **Stage 0 — `arcs.json`, the curated edge layer (the prerequisite; no visual).** Land the 146 canonical arcs
  as structured data at `museum/accounts/arcs.json`, each with its incident, measure, sources, date, room and
  `visibility` — the same checked-in-JSON precedent as `intent-pairs.json`. **This is the ONLY genuinely new
  data artifact the whole capstone requires; everything else is parsing.**
- **Stage 1 — the ARC SPINE (the first visual).** One generated page rendering only _arc → incident → measure
  → improvement_ for the ~146 arcs, grouped by the corpus's fifteen themes. **Not a graph — a strip**, in the
  growth tape's idiom: legible, scrollable, phone-first, every arc linking to its evidence. It is the museum's
  thesis rendered directly, lay-legible by construction, and it proves the arc data before any layout
  algorithm exists.
- **Stage 2 — the COVERAGE VIEW (already owner-approved and designed, still unbuilt).** Three columns — **rule
  → what enforces it → what proves the enforcement works** — with blanks left **visibly blank**. Two pieces of
  hard evidence already justify it: a batch of rules with **zero** enforcement, and a guard that was **inert
  for weeks**. _"Has a guard" and "is actually protected" are different columns._
- **Stage 3 — the VISUAL WEB itself (the capstone).** Only after 1 and 2 exist **and have been used**. A
  **radial, generation-time layout** — nodes radiating from a centre, organic branching, opacity by age or
  activity, colour by kind, hover/tap pulse in pure CSS. **Cluster-first with drill-down, NEVER all ~1,450
  nodes at once** — the default view is the ~15 theme clusters plus room nodes, perhaps 40 visible nodes.

**⛔ Hard constraints, all already enforced elsewhere in the generator — none of them is aspirational.** No
build step, no libraries, no CDN, no D3, no force-graph, no WASM (`buildGrowthTape()` is the trusted
precedent: hand-assembled SVG with explicit coordinate math). **Layout is computed at generation time and
emitted as static coordinates** — a browser-side force simulation needs a library, produces different pixels
per run (breaking byte-identical reproducibility) and burns phone CPU. **Determinism has teeth**: seeded and
fixed-precision, or the double-fresh-clone check fails. 900px max-width, 360px floor, offline `file://`, no
`fetch()` ever. WCAG 2.1 AA, with a **non-visual equivalent** for the graph and keyboard-reachable nodes. Page
weight is a stated value — state the cost, defer, or shard. **Ritual, not gate** — it never blocks a release
or a sync.

**⚠ The legibility gate has NOT expired, and the audience bar is now higher, not lower.** Both external
reviewers independently called a graph of everything-vs-everything an unreadable hairball, the recorded
judgement is explicit that the objection does not expire with time, and the primary visitor is a
**non-technical person**. **At ~1,450 nodes an all-nodes-at-once render is a KNOWN-FAILED design — do not
build it.** This is what the curation exemption actually means: the Visual Web is
**complete-but-navigable** (nothing left out of the DATA; density managed by interaction), where every other
exhibit is complete-collection-but-curated-display.

**⛔ Visibility is fail-closed BY CONSTRUCTION.** Every node carries a `visibility` field that **defaults to
`private`**; a node becomes public only when an extractor reading a **public** source emits it as public.
**There is no scrub step, because a scrub step is a discipline and disciplines fail** — a private node in a
public build is **not emitted at all**, and its edges terminate in a generic `private:<kind>` placeholder so
the graph's shape survives without its contents. A node whose visibility cannot be determined **fails closed**.
And a schema-level guarantee, not a filter: **there is no `person` node kind — only `role`** (owner, fable,
opus, sonnet, gpt, gemini, deepseek). No human identity ever enters this graph.

**⭐ One derivation, THREE renderings (unchanged, owner-endorsed):** the **topology** view (human, visual — a
Fable design job), the **diagnostics** view (plain, no design pass — dangling edges, parser status), and the
**machine-readable answer for SESSIONS**, which the owner corrected is arguably the highest-value of the three
(_"we don't just need visuals, whatever helps the AI too ya know?"_). A **DSM (dependency-structure matrix)**
is a companion view, not a replacement.

**When Fable gets involved: between Stage 1 and Stage 3**, once the arc data is real and the cluster-first
legibility strategy is settled. **⚠ Have the brief checked against the identity ruling before it is sent** —
an entire design pass has already been lost to a brief that asserted the opposite of what the owner had ruled.
And brief the Gource **feeling**, never the tool: real-time animated playback of history does **not** transfer,
and running Gource itself was rejected on scale and cost — do not re-propose it.

**Cross-references, not restatements.** **Item I (the Atlas) rides this graph renderer** — same plumbing, and a
second one would be the Protocol 22 parallel-implementation trap. **R11** is the shipped 1.x graph this
extends. **P10** frees the nav this needs an entry point in. **P15** (2026-07-29) is a hard requirement on
this Stage 3 scope, not just on Stage 0's arc coverage — it requires the finished Visual Web to render the
project's WORKFLOWS (app-build, control-plane, museum-building, multi-model review) and how they interlock,
framed as an Obsidian-graph-style explorable node-link "brain" **within the hard constraints already fixed
above** (no D3/force-graph/CDN/build step) — see P15 for the full requirement and its explicit reconciliation
note.

**Done means:** `arcs.json` exists and is generated-from/checked-against the corpus; the arc spine and coverage
view are built, shipped and actually used; and the radial web renders cluster-first at 360px, deterministically,
with fail-closed visibility and a non-visual equivalent.

### P12. ⬜ The ARTICLE ROOM — pair each external guide with the RobCo measure that already embodies it (owner, 2026-07-25)

**What it is.** A museum room that pairs **each external 2026 guide** with **the RobCo measure that already
embodies it** — evidence for the museum's self-maintaining-system thesis that **the discipline was principled,
not lucky**. The observation behind it, the owner verbatim: _"all these guides are out there yet we've already
done it all without a guide — just me and you."_

**The pairings on file (cite and map — never dump the source):**

- **"Loop Engineering"** → RobCo's **plan → implement → gate → audit ratchet loop** plus the **self-improving
  gate** as the verification harness — the exact ingredient the article says most people skip.
- **"Graph Engineering"** (the synthesis of the autoresearch ratchet-loop + "the DAG IS the graph" + the
  Knowledge-Graph cookbook) → **R11**'s independently-derived typed edges with drift surfacing as data, the
  **provenance discipline** (every fact links to its commit), **"green is scoped evidence, not proof,"** the
  memory / queue / archive as a cross-session brain, per-session worktree isolation, and `CLAUDE.md` + the
  rules as _the program that programs the program_.
- The **second-brain / visual-brain** threads → the same pattern.

**⛔ COPYRIGHT RAIL, non-negotiable:** cite and map — **never dump external copyrighted content into the
museum**. At most a short attributed quote; **the mapping is ours, the article is theirs.**

**⭐ Name the ONE deliberate omission in the room itself — it is the honest part.** The **swarm** (the
thousand-agent scale these guides sell) is **absent by choice, not by gap**: solo, free-tier, owner-control —
and parallel agents on one repo produced the exact gate-collision this project already recorded. **Scale was
correctly declined, not missed.** A room that claims convergence without naming its omission is a brag; one
that names it is evidence.

**Where it sits.** A museum content/exhibit pass — it draws on **P8**'s corpus (the
independent-convergence arc is already a beat in it) and inherits **P**'s curation law and lay-audience bar.
Design-intent recorded; **not designed, not built.**

**Done means:** a room exists pairing each cited guide with its RobCo counterpart, sourced and attributed, with
the swarm omission stated in the room's own copy — and no external content reproduced.

### P13. ⚠️⏭️ SECURITY — add `planning/2.8.0/plans/DEPLOY_STAGING_PLAN.md` to the publish name/PII scan list (P8 finding, 2026-07-27)

**What it is — and why it is a security item rather than a chore.** P8's corpus, while mapping where the
archive retains real identity, found a **live, lookup-able email address in
`planning/2.8.0/plans/DEPLOY_STAGING_PLAN.md`** (three occurrences, as the single identity in a proposed Zero
Trust allow-policy). **That file had not previously been scanned.** The file exists in **both** the app repo's
`planning/` tree and the archive's mirror of it.

**Why it must be handled BEFORE any republish (P14), not after.** The museum has already come within one owner
question of publishing internal document pages with the owner's identifiers baked into page **addresses** and
the **search index** — and the guard in place scanned only for the exact string it was handed: it never saw
the username inside a path, nor the email it was never given. A "publication-quality" audit the day before had
checked the exhibit pages only, and passed. **Redaction-after-ingest has already failed here once.**

**The mechanism is safe to exhibit; the VALUE must not be.** The Zero Trust allow-policy design is legitimate
museum material — it is the identity inside it that cannot ship.

**The direction, and it is structural rather than procedural:** the public projection is **built from public
sources plus generic placeholders — never by ingesting private data and redacting it.** Fail-closed by
construction. Adding this one path to a scan list is the immediate fix; the standing fix is that a
**new** unscanned file must not be able to reach a public build in the first place. **CP4 (the sync audit) is
the right place to ask how many more of these there are** — this is one finding of exactly the class it is
meant to enumerate.

**Done means:** the file is scrubbed or otherwise handled, it is covered by the publish scan list, the scan is
proven red-then-green against the real value (never committing it), and no republish has occurred before that
is true.

### P14. ⬜ The live public museum is STALE against its source — the republish that ends "finish the museum" (2026-07-27)

**What it is.** The public exhibit at **https://robco-exhibit.pages.dev/** was published **2026-07-24** and has
not been regenerated since; the archive has moved under it (the P8 audit, the archive organization fixes at
**W**, and everything since). **The site is therefore stale against its own source right now** — recorded
plainly rather than left as an assumption that it is current.

**The sequence, and none of it is new machinery — it is the existing turnkey path re-run:** regenerate →
`--public` staging tree → `--publish-prep` with the real name supplied **at runtime** (never committed) →
review the emitted tree → verify privately → expose that same already-verified commit.

**⛔ P13 is a HARD PRECONDITION.** Do not republish until the scan-list gap is closed — a republish is exactly
the action that would carry the finding live.

**Why it is filed as its own item rather than a footnote.** "Finish the museum" **ends with a republish**;
without an item, the museum work would keep landing in the archive while the public site silently drifts
further from it, which is the same class of gap as a green check that means nothing.

**Done means:** P13 is closed, the site is regenerated from the current archive, verified privately, exposed,
and the live URL confirmed serving the new build.

### P15. ⬜ MUSEUM RE-AUDIT — fold the control-plane program into the corpus before "museum done" (owner, 2026-07-29)

**What it is.** P8's story-corpus and structure audit (146 arcs, the room/connection map) were cut
2026-07-27 — the day BEFORE the control plane became the board's top program and the kernel work of
2026-07-28/29 landed. The museum's scope is therefore stale against its own subject: the self-maintaining
system is the museum's organizing thesis (item **P**, "the story of the workflow and every measure that
maintains it"), and the single richest recent instance of that thesis — a live three-model review
converging on a trusted-action-kernel reframe, two kernel ranks actually shipped, a real false positive
caught and corrected in the thrashing detector, five new alerts demoed live — currently has NO arc in the
corpus at all. **This item is a precondition on calling the museum done, not an optional content pass.**

**Three parts:**

1. **Extend the arc corpus.** Add the control-plane program's own arcs to P8's 146 (CP1-CP5's spike
   campaign and staged build, the three-model convergence review and its dissent, kernel ranks 1-2 shipped,
   the reaper's re-scoping, the thrashing detector's real false-positive-then-fix, the five alerts, and the
   usage-measurement spike) as **new, dated entries** — never edited into the existing 146, which are P8's
   own frozen snapshot (Protocol 49 discipline: extend, don't rewrite history).
2. **Decide its room / placement.** This is the museum's CENTERPIECE material per item **P**'s own thesis
   (the self-maintaining system, not app history) — it must be placed **prominently**, not folded as a
   footnote to an existing room. Which room (a new one, or the strongest existing candidate) is an open
   design decision, not yet made.
3. **Verify P11's Visual Web includes it — and explicitly renders how the project's WORKFLOWS interlock,
   not just its arcs.** Once **P11**'s `arcs.json` (Stage 0) exists, confirm the control-plane arcs from
   part 1 are represented in it — the Visual Web claims to be complete-but-navigable over the WHOLE corpus,
   so an arc corpus missing its own most recent chapter would silently break that claim. Beyond arc
   coverage, the Visual Web is where the museum's own thesis (**"the self-maintaining system"**) has to be
   SHOWN, not told — so it must surface the project's **WORKFLOWS themselves and how they connect/interact**,
   at minimum: the **app-BUILD workflow** (plan → implement → gate → audit, Protocol 8) and the
   **CONTROL-PLANE workflow** (OBSERVE → ENFORCE → ASSIST, the kernel ranks) — plus any others worth
   surfacing, with the **museum-building process** itself and the **multi-model review process**
   (Fable/Opus/Sonnet plus the external convergence reviews) as live candidates. **Target framing:** an
   Obsidian-graph-**STYLE** explorable node-link "brain" — built **ourselves**, generated from the arc data,
   hosted on the public Exhibit site — **never** the Obsidian app itself (that stays a separate, optional
   personal tool, out of scope for the museum). ⚠ **Reconcile before building, don't silently override:**
   "Obsidian-graph-style" names the desired UX (a visitor pans/clicks through an explorable node-link graph),
   not a license to reach for a graph library — **P11 already records a hard, enforced constraint against
   exactly that** (no D3/force-graph/build step/CDN/WASM; hand-assembled SVG with generation-time static
   coordinates, the `buildGrowthTape()` precedent). Any "free open-source graph library" reading of this
   framing has to be squared against that existing constraint when P11 is actually built, not read as
   superseding it.

**── PART 4 — the PLATFORM-LOCKED exhibit (owner idea, folded 2026-07-31) ──**

**The control-plane room must explicitly LIST the ideas we explored and found are PLATFORM-LOCKED — blocked
on Anthropic changing the platform, not on us building.** ⭐ **Why it belongs, and why it ages WELL rather
than badly:** it is the honest edge of the self-maintaining-system thesis — not everything the design wanted
was buildable — and **when Anthropic ships a missing capability, the exhibit flips that item from LOCKED to
UNLOCKED, showing the ceiling itself moving.** An exhibit that improves as the world changes is worth more
than one that quietly rots.

⛔ **Two buckets, and they must NOT be lumped** — "we couldn't" and "we couldn't the easy way" are different
claims, and blurring them would overstate the constraint:

**(a) HARD-LOCKED — no workaround, waiting on Anthropic:**

- **WAKE** — no documented way for a local process (the supervisor) to start a Dispatch/Cowork turn
  unprompted. **This is THE missing half of the control-plane loop:** delivery and acknowledgment are both
  buildable; wake is not. _Ceiling set by:_ `DISPATCH_RETURN_BUS.md` § "The exact missing capability: WAKE".
- **No local MCP in Cowork/claude.ai** — a Dispatch-callable bridge **must** be a remote HTTP server; it
  cannot be a localhost process. **Shapes the entire return-bus architecture.** _Ceiling set by:_ Anthropic
  support docs, verified 2026-07-31 (`support.claude.com/en/articles/11175166` · `/11725091` · `/14680753`),
  which **corrected an earlier wrong assumption of ours** — worth exhibiting as such.
- **Remote connectors lack resource subscriptions + sampling** — a connector cannot push to Dispatch or
  stream; it is query-only. **Reinforces the no-wake ceiling.** _Ceiling set by:_ the same docs review.
- **5-minute tool-call timeout on remote connectors** — a connector cannot hold a connection for a whole
  Code job, forcing **submit → receipt → poll** instead of stay-attached. _Ceiling set by:_ the same review.

**(b) WORKED-AROUND — the tool didn't expose it, but we found a path:**

- **Per-session effort tier** — `start_code_task` exposes no `--effort` parameter, **but the two-message
  pattern works and is confirmed**. So: **partially locked** (the clean route still needs a launcher change)
  yet **functionally solved.** _Ceiling and workaround set by:_ `EFFORT_CONTROL_SPIKE.md` + **SP2** — and it
  carries its own over-claim→correction→re-test arc, which is separately good exhibit material.

⛔ **Keep it EVIDENCE-BASED: every locked item cites the doc or experiment that established the ceiling**
(as above). A list of things we say we couldn't do, with no citation, is an excuse; a list with citations is
a finding. **Inherits P13's PII discipline** like the rest of this item.

**Cross-references, not restatements.** Depends on **P8**'s corpus (extends it, Protocol 22) and **P11**
(the arc corpus is P11 Stage 0's direct input — this item's part 1 IS P11 Stage 0 material, filed here
because the trigger is "the museum fell behind the control plane," not "P11 needs more data"; and P11's own
entry now cross-links back here for the workflow-visualization requirement above). Sits inside **THE MUSEUM
PROGRAM** cluster above and inherits its curation law + lay-audience bar (item **P**) and its PII/identity
discipline (**P13**) — the control-plane material is unusually rich in paths/session ids/the owner's own
working notes, so the same fail-closed visibility rule P11 already specifies applies here without exception.

**Done means:** the control-plane arcs exist in the corpus as dated entries; a room/placement decision is
made and recorded with its reasoning; P11's Visual Web (once built) is confirmed to include them AND to
render the project's interlocking workflows per part 3 above; and **the platform-locked exhibit (part 4)
exists with both buckets kept distinct and every locked item carrying its citation.**

### P16. ✅ SHIPPED (2026-07-31), control repo `0917d20` — Automated pre-publish PII / secret scanner — the mandatory museum publish gate, AI-free (NET-NEW, folded 2026-07-30, multi-model round; HARDENS the existing name-scrub gate from human-only to enforced)

**What it is.** A **deterministic** regex / string scanner (no AI in the loop) run over the museum **staging
dir AFTER generation, BEFORE curation**. It scans for: email addresses, the owner-maintained
`scrub_list.txt` of real names / paths / usernames, API-key / token formats, and public IP addresses. **On
any finding, publish is BLOCKED** and the supervisor writes a `museum-pii-block` incident. An **allow-list of
SHA-256 hashes of confirmed-safe strings** lets a reviewed false positive through without ever storing the
plaintext. The scanner code lives in the **control repo**, its SHA is recorded in the **guard registry** and
integrity-checked by the gate's self-integrity check (so the scanner itself cannot be silently swapped).

**Why it hardens what already exists (P13/P14).** Name-scrub is already a **mandatory, non-AI-callable
publish gate** — but P13 recorded that the guard in place "scanned only for the exact string it was handed":
it never saw a username inside a path nor an email it was never given, and redaction-after-ingest **has
already failed here once**. This scanner is the **enforced, pattern-based** version of that gate — it finds
the CLASS of identifier, not just the one string handed to it. It does **not** replace the structural
direction P13 sets (public projection built from public sources + placeholders, never ingest-then-redact); it
is the fail-closed backstop for anything that reaches staging anyway.

**⛔ Invariant.** Name-scrub / PII scanning stays a **mandatory gate, never an AI-callable tool** (the whole
control plane's standing rule — "if the agent chooses whether to scrub, it isn't a gate").

**Done means:** the scanner runs deterministically over the real staging tree, blocks on a real planted PII
value (proven red-then-green, never committing the value), writes a `museum-pii-block` incident on a finding,
the SHA-256 allow-list clears a confirmed-safe string, and its own SHA is registered + integrity-checked.
Cross-refs **P13** (the scan-list gap that motivated it) and **P14** (the republish it gates).

**── SHIPPED RECORD (2026-07-31, control repo `0917d20`) ──**

⚠ **THIS ENTRY'S OWN PREMISE WAS HALF WRONG, and checking it first changed the build** (Protocol 51a —
a queue entry is a hypothesis until read against the repository). The museum pipeline is **real and
live in the ARCHIVE repo** — `generate.mjs` / `publish.mjs` / `capture.mjs` / `pii-scan.mjs`, with 756
files already generated — and of the two guards already on it:

- **`publish.mjs`'s `preparePublish()` was ALREADY enforced and fail-closed.** It scrubs the supplied
  name(s), re-scans content **and** paths, sweeps nine credential regexes, and on any hit deletes the
  scratch tree and throws, emitting nothing. This entry says P16 hardens the gate "from human-only to
  enforced" — **that half was already enforced.** Recorded rather than quietly overwritten.
- **`museum/pii-scan.mjs` IS the human-only part**, and this entry is right about it: a read-only
  battery that prints a report and blocks nothing.

**So the real gap P16 closes is not "unenforced".** It is that the archive's gate only ever knows the
strings **handed to it at the command line** (`--real-name=X`) — it cannot see a username in a path it
was never told about, which is exactly the **P13** gap — plus: nothing anywhere detected **public IPs**,
nothing had an **allow-list**, the class-based battery **blocked nothing**, and no finding ever reached
the **ledger**.

**Shipped as** `lib/museum-pii-scan.js` + `scripts/museum-pii-gate.js` (control repo). Four categories:
emails · an owner-maintained **scrub list** (names / usernames / absolute paths / project-internal terms)
matched in file **ADDRESSES as well as content**, and in **non-text files as bytes** (a name in image
metadata) · credential shapes · **public** IPs, with RFC1918 / loopback / link-local / CGNAT / TEST-NET /
multicast ignored — a gate that cries wolf on `10.0.0.1` teaches the owner to wave findings through,
which is how gates die. **Exit code is the contract: 0 PASS, 1 BLOCK, and NO `--force`** — a gate with
an override flag is a suggestion.

**Fail-closed on everything:** unreadable scope · missing scrub list · **HOLLOWED-OUT** scrub list
(present but every line a comment — the dangerous case, where a naive scanner finds nothing and
cheerfully reports clean) · a term under 3 chars · unreadable allow-list · an unreadable file _inside_
the tree · a scanner throw · even a failure to **write** the verdict.

⛔ **The report is never the leak.** Findings carry file, line, category, a SHA-256 and a redacted
snippet — **never the matched value** — and the phone banner names categories and counts only. A banner
quoting a leaked name to a lock screen through a third-party push service would _be_ the leak.

**The scanner never writes the ledger.** It writes one verdict artifact; **`supervisor.js` reads it on
its tick and appends the `museum-pii-block` incident** — CPB8's exact shape. An unreadable/unparsable
verdict **re-raises** rather than reading as "nothing blocked". The scrub list is **itself PII** and
lives in `state/` (never committed, not on the backup mirror's whitelist): putting it in a git repo to
protect the owner's name _from_ git repos would be self-defeating.

**RUN AGAINST THE REAL PUBLISHABLE TREE** (`museum/.publish-out`, 756 files): **zero surviving
scrub-term hits** — the archive's existing scrub passing an independent audit — and **12 email
addresses (2 distinct, across 5 files)** that the existing gate is structurally blind to. **Neither is
the owner's own address**, so that is an allow-list decision, not an emergency — precisely the workflow
the SHA-256 allow-list exists for. ⚠ **Scope matters:** `museum/public` and `museum/site` are PRIVATE
(the pre-scrub source and the owner's own committed copy) and _correctly_ contain his name; pointing
the gate at those blocks forever. The scope is `preparePublish()`'s **output**.

**WB2 registry row this guard will take** (WB2 does not exist yet, so its fields are recorded here as
prior sessions have done): `{ failureClass: 'pii-leak-to-public-museum', enforcementPoint:
'scripts/museum-pii-gate.js (pre-publish, exit 1 on BLOCK)', testId: 'P16', owner: 'control-plane',
retirementCondition: 'the museum stops publishing anything derived from private sources' }`. The
scanner reports its own SHA-256 into every verdict; the mismatch **check** belongs in the registry, not
in a hand-maintained constant (which would be Protocol 2a's failure mode again).

**Verified:** test group **P16** — red-then-green on all four categories _individually_ plus a clean
tree that passes (so the four reds are not just a scanner that blocks everything); public-vs-reserved
IPs; the allow-list carve-out and hash normalisation; five fail-closed cases; the P13 path gap; the
binary byte scan; a no-leak proof over the whole serialised verdict _and_ the phone banner; the
no-ledger-write guard; **AI-free proven behaviourally** (no network module, and two scans of one tree
byte-identical) rather than by hunting vendor words; Protocol 22 reuse of `backup-mirror`'s patterns;
and a **real sandboxed supervisor run** proving it opens the incident, auto-resolves on a later PASS,
and re-raises on an unparsable verdict. Full control suite green.

🔻 **REMAINING ACTIVATION — stated, not faked.** The gate is built, tested and correct, but **nothing
calls it yet**: wiring it into the archive's publish flow is a one-line invocation in a **third repo**
this pass deliberately did not touch. Until that lands, P16 protects nothing by itself — it is a gate
waiting to be mounted, in the same honest posture as CPB1/ACT2's dormant halves. **The exact wiring:**
run `node <control>/scripts/museum-pii-gate.js <preparePublish outDir>` immediately after
`preparePublish()` returns and **before** anything is published, and abort on a non-zero exit.

**── ✅ ACTIVATION CLOSED (2026-07-31, archive repo `b90304fb`) — THE GATE IS MOUNTED AND LIVE ──**

Mounted exactly where the activation note above specified: in `museum/generate.mjs`'s `runPublishPrep()`,
immediately after `preparePublish()` returns and before anything is publishable. That is the **only**
caller of `preparePublish`, so both the real path and the `--publish-prep-source` test seam go through it.
**Only the gate call was added** — no change to file selection, scrub behaviour, or output scope. The
`try`/`catch` became an early-return so the gate can run after a _successful_ scrub; the failure leg is
behaviourally unchanged.

**An absent or unrunnable gate BLOCKS, it does not skip.** A checkout with no control repo beside it stops
rather than emitting an unscanned tree. `ROBCO_PII_GATE` overrides the path (test seam only); no `--force`
was added, because a gate with an override flag is a suggestion.

**The abort message does not lie.** `preparePublish`'s own trip says "NOTHING emitted", which is true of
it. The P16 gate runs _after_ the tree is written, so its block says so explicitly rather than inheriting a
sentence that would be wrong. **Deliberate tradeoff, recorded rather than hidden:** a blocked run leaves
the emitted tree on disk (exit 1 is the "do not push" contract, and `.publish-out` is gitignored and
transient). Deleting it would have been a change to publish behaviour beyond the gate call, which the brief
scoped out. Worth revisiting if the owner would rather it self-destruct.

**Verified red-then-green against the real generator, not a mock:**

- **RED** — a tree carrying an e-mail address, the exact class `preparePublish` is structurally blind to.
  The scrub reported OK (it substituted the name it was handed and saw nothing else); **P16 caught the
  address and exit was 1.** This is the P13 gap demonstrated end-to-end, not argued.
- **GREEN** — a clean tree passes both legs, exit 0, and the OK line now states the gate passed.
- **FAIL-CLOSED** — an absent gate exits 1, naming the path it looked at.
- `--check` and a parse check confirm the non-publish paths are untouched.

**── ALLOW-LIST DECISION APPLIED (2026-07-31) — owner: "not mine, allow it" ──**

Both distinct addresses from the real-tree run are allow-listed by SHA-256 (plaintext never stored). The
real publishable tree (`museum/.publish-out`, 756 files) now reads **PASS**: zero scrub-term hits, 12
e-mail findings, **0 blocking / 12 allow-listed**. Each exemption carries its reasoning in the file:

- a **fictional in-fiction address** from the museum's own Fallout-flavoured copy — exhibit prose, not a
  mailbox;
- the **post-scrub alias form** of an address — `preparePublish()` already rewrote the identifier, so what
  survives resolves to nobody. It is _evidence the existing scrub worked_, not a leak that escaped it;
  P16 flags it because it detects the e-mail **class**, which is precisely the blindness it was built to add.

**The allow-list does not weaken anything else** — verified on a probe tree: an unrelated e-mail, a public
IP, a credential shape and a scrub term all still block.

⚠ **A PREREQUISITE HAD TO BE CREATED, and it is the owner's to own from here.** The owner-maintained
**scrub list did not exist on this machine** — the P16 build's real-tree run used an ad-hoc list that was
never persisted, so the mounted gate would have blocked _every_ publish with `scrub-list-absent` (correct
fail-closed behaviour, useless in practice). It is now seeded at `state/museum-scrub-list.txt` with the
owner's own identifiers only, and **verified to produce zero hits against the real tree — reproducing the
P16 build's own "zero surviving scrub-term hits" result.** Two exclusions are recorded _in the file_ so the
decision is not silently re-made: the machine's **hostname** (`rog-ally`) is a **hardware model name** that
appears legitimately in the museum's own prose about that hardware, and the username beside it in those
paths is already scrubbed to the alias — listing it would block on the museum discussing its own hardware;
and the public GitHub handle, which is the substitution _target_, not a leak. **This list is the gate's
only knowledge of what a "real name" is — extend it as new identifiers appear.**

### P17. ⬜ Museum PREVIEW tab — curation surface for staging-vs-published (owner favorite; NET-NEW, folded 2026-07-30 from DeepSeek's fleshed design; EXTENDS the museum program + the CPB5 CLI)

**What it is.** A curation / review surface that diffs what's **published** against what's **staged**, so the
owner curates before anything goes public. Built on **two ledger pointers** — `last-published-artifacts-hash`
and `staging-artifacts-hash` — producing a **semantic diff** (New / Changed / Removed entries). Each entry
shows its **scan status from the P16 PII scanner**: ✅ clean / ⚠ allow-listed / 🛑 blocked — and **Publish is
disabled while ANY entry is blocked.**

**Curation workflow.** Inspect an entry (with the scanner's findings highlighted) → **inline scrub** →
**re-scan that entry** → **Approve / Deny** (a Deny is logged as a curation event) → **Publish**, which runs
a **final scan + name-scrub**, then the supervisor does the **controlled push** (the ACT3/DG2 wrapper) +
writes a **publish receipt** and updates the `last-published` pointer.

**Two renderers, ONE action layer (same as CPB5).** A CLI view — `robco museum preview` (or `m` then `p`) —
and a **phone mirror** (responsive, summary cards, large touch targets), both using the **same typed-proposal
path** and the same three CPB5 guardrails (human-interactive only; destructive actions echo + confirm; every
action appends a ledger event). A **yellow "internal — not public" accent**, and the staging tree is served
**private, Tailscale-only** (never the public origin — the records carry the owner's name).

**Homes / reconciliation.** EXTENDS **CPB5** (the operator CLI gains the `museum preview` sub-command and the
phone cockpit gains the tab) and the museum publish pipeline (**P13 / P14 / P16**) — it is the human curation
UI in front of P16's scanner and P14's republish, not a new publish path. Owner flagged it a favorite.

**Done means:** the two-pointer semantic diff renders New/Changed/Removed with per-entry scan status; Publish
is blocked while any entry is blocked; inspect → inline-scrub → re-scan → approve/deny → publish works
end-to-end through the controlled-push wrapper with a publish receipt and pointer update; CLI and phone mirror
share one action layer + the CPB5 guardrails; staging is reachable Tailscale-only.

### Declined this round — auto-actuation stretches kept proposals-only (2026-07-30, multi-model round)

Two ideas from the GPT-5.6 / Gemini 3.1 / DeepSeek round are **recorded as DECLINED / proposals-only** so
they are not re-proposed as auto-actuating features — both stretch a standing invariant. Recorded per
Protocol 49 (record the ruling in place) + Protocol 51(a).

- **Agentic Museum Curator** — an agent that auto-drafts AND auto-publishes museum entries. **Declined:** it
  stretches the zero-MCP-truth / name-scrub-is-a-mandatory-gate rule (an AI that decides what publishes is an
  executor). Stays **proposals-only** — the curator may _draft_ proposals into the **P17** preview tab; a
  human publishes. Nothing auto-publishes.
- **Trivial Lint Auto-Resolver** — auto-commits formatting fixes. **Declined:** it stretches the
  AI-never-actuates invariant (an auto-commit is an actuation). Stays **proposals-only** — lint findings
  surface as a proposal; a human commits. Nothing auto-commits.

Neither is dead — each may return the day it is expressed as a proposal a human approves, never as an
auto-committer / auto-publisher.

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
**open** items by what actually determines when they can run. The near-term data-safety item (**A3**) is now
**resolved** (2026-07-21 — modeled guard shipped, emulator test demoted to optional **A4**), so **only the
small fixes** remain before the `dev → main` release; the deliverables and the governance process work can
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
- **A3** ✅ Cloud serialization guard (`npm run cloud-check`) and **A4** ✅ the real-Firestore emulator
  round-trip are both shipped, but their **full accounts still sit in this file** rather than in the log —
  **deliberately, and the reason is worth recording.** Suite **246.3** hardcodes `A3` as an item ID it expects
  to parse out of `QUEUE.md`, and **246.5** requires at least one **done**-status `###` item to exist here; so
  moving those two accounts to the log — which is what this file's own ahead-only contract says should happen
  — turns the gate red. The fix belongs in `tests/`, and the suite's own comment already flags the fixture as
  fragile and names the sturdier fix (sample live IDs instead of naming them). **Recorded rather than worked
  around:** the queue cannot fully honour its ahead-only rule until that fixture stops pinning a specific
  shipped item. See **A3** and **A4** below.

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
- **D** ✅ The TEST_CATALOG generator (Protocol 47) — `library/TEST_CATALOG.md` is now GENERATED from the
  runner's own suite headers, never hand-typed; the Atlas (item I) reuses this plumbing directly. →
  [account](QUEUE_LOG.md#d)
- **U** ✅ The generate-vs-hand-maintain audit (the generalization of D) — every actionable GENERATE
  candidate from the triaged audit shipped across four dated batches (Suites 248-252, Protocols 52/53, plus
  the owner-decided deletion of README's third script load-order copy). → [account](QUEUE_LOG.md#u)

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
- **G** ✅ The blind workflow review — FULLY RESOLVED (claim-ledger built + verified, all (a)/(b) fixes
  shipped, all three owner-decisions settled). **⚠ One open thread survives: the R11 knowledge-graph gating
  question this review was asked to rule on was never actually addressed** — see R11 and the account below. →
  [account](QUEUE_LOG.md#g)
- **H** ✅ CLOSED (owner-approved verdict, 2026-07-26) — the optional system-model review is redundant with
  **G** (process, 3 reviewers) + **R10** (the knowledge-architecture audit, which examined the
  representation/retrieval layer); the one sliver H uniquely covered — raw brain-dump accuracy — is
  low-value post-2.8.5 re-baseline. → [account](QUEUE_LOG.md#h)

_PWA / install UX:_

- **S** ✅ PWA install discoverability + the guided FO3 reinstall flow (Option 1) — shipped to `dev`
  2026-07-22 **and confirmed on PRODUCTION the same day** via the `v2.8.5-r6` hotfix merge to `main`
  (corrects the file's prior "nothing on production yet" note, which was never updated after the hotfix
  landed). → [account](QUEUE_LOG.md#s)

_Archive & backup infrastructure (shipped 2026-07-27, in the sibling archive repo — new IDs, assigned when
the work was folded in):_

- **V** ✅ The archive-sync repair — `sync.ps1` was reporting **"Done" on a push that had been REJECTED**
  (PowerShell 5.1 does not fail on a native exit code), so the only backup of `library/`, `planning/` and
  memory could silently protect nothing. Fixed with an exit-checked git wrapper, locks held outside git in
  `try/finally`, a content digest over every source, foreign-commit refusal, and real remote verification —
  **including on the no-op path**, which a follow-up closed after an independent audit found it could still
  exit 0 without asking the remote anything. 13 tests green on **both** PowerShell 5.1 and 7.6.4. →
  [account](QUEUE_LOG.md#v)
- **W** ✅ Archive/museum organization fixes — a `classify()` fall-through drove UNCLASSIFIED 5 → 0, the
  catch-alls were made loud, and a deterministic, idempotent, dry-run `--check` FILING REPORT was added; plus
  README count fixes and a preserved-then-removed `README.txt`. Double-fresh reproducibility check passed. →
  [account](QUEUE_LOG.md#w)
- **X** ✅ The Exhibit folder relocated into the project family — now `C:\Dev\!RobCo\!RobCo-Exhibit` (was
  `C:\Dev\!RobCo-Exhibit`). **GitHub and Cloudflare are unaffected: both bind to the repo, not the path.** →
  [account](QUEUE_LOG.md#x)

_Museum:_

- **P8** ✅ The story-material + STRUCTURE synthesis audit — 146 canonical arcs plus the full room/structure/
  connection map, filed in the archive; the blueprint **P11** builds on. → [account](QUEUE_LOG.md#p8)

## ⏭️ Ready now — no blocker; plan/build whenever

### Y. ⏭️ The memory-for-the-story reconciliation pass (owner wrap-up ask, 2026-07-27)

**What it is.** A reconciliation pass over the orchestrator memory store **for the story** — the owner's own
framing during the control-plane arc: _"ensure all of this is in memory for the story… whenever it's
convenient."_ Memory is where a great deal of the project's reasoning actually lives, and **P8's corpus read
126 memory files in full** to build its 146 arcs — so the two are now coupled: what memory holds determines
what the museum can ever tell.

**What the pass does.** Walk the memory store against **P8's corpus** and reconcile in both directions: story
material that exists only in a conversation or a running session and never became a memory (it is lost the
moment the session ends); memories that are now stale, superseded, or contradicted by the repo; and memories
that hold a fact the repo already records, which by the memory store's own standing rule should not be there
at all. **The control-plane arc (CP1-CP5) is the live example** — its own memory note says plainly that it is
_a locator, not the record_, and that it must be enriched as the thread closes.

**⛔ The PII rail is not optional.** P8 documents exactly which memory files carry the owner's real name,
username, email and profile paths. **This pass must not move any of that value toward anything public**, and
the standing rule holds: the public projection is built from public sources plus placeholders, never by
ingesting private data and redacting it.

**Why it is Ready-now rather than parked.** It needs no build, no owner decision, and it is cheapest while
the session that produced the material is still recent — the exact "write it where it lives before it decays"
reasoning behind Protocol 50.

**Done means:** every arc P8 named has its durable record; stale or superseded memories are corrected or
deleted; the control-plane arc's note is enriched to match where the thread actually ended; and nothing
private moved outward.

### Z. ⏭️ A comprehensive, evidence-grounded explanation of the workflow (owner wrap-up ask, 2026-07-27)

**What it is.** The owner asked for a full explanation of **how this project is actually built** — the
Dispatch orchestration, the Fable/Opus/Sonnet hand-off, the gates, the protocols, the archive, the external
reviews, and how they connect. Not a pitch and not a re-statement of the rulebook: **an explanation, grounded
in evidence.**

**The bar, and it is the whole point: EVIDENCE-GROUNDED.** Every claim about what the workflow does must
point at the thing that proves it — a protocol, a suite, a script, a commit, a recorded incident — and where
something is **aspirational, partial, or unenforced, it must say so.** This project's own standing rules make
that non-negotiable: _a session's account of its work is a claim, not evidence_, and _green is scoped
evidence, not proof_. **An explanation that describes the workflow as it is supposed to work would be the
exact failure mode the workflow exists to prevent** — and the control-plane arc (CP1-CP5) is a live case of
Dispatch overstating what was proven, caught by an outside reviewer.

**What it must include to be honest.** The control-plane gaps as they actually stand (**CP1-CP5** — proposed,
not built), the guards that were found inert, the rules with no enforcement, and the reversals — beside the
things that genuinely work. **The failure→lesson→measure arc is the natural spine**, which is the same shape
**P8**'s corpus already assembled and the museum's own thesis.

**Where it goes.** Deliverable form is the owner's call — it plausibly feeds the **museum's process wing**
(**P6**/**P12**), but it is written for him first. **Cross-reference, not duplication:** it should point at
the corpus, the protocols and the queue rather than becoming a fifth standing source of truth that can drift.

**Done means:** the owner has a plain-English explanation he can read end to end on a phone, every load-bearing
claim in it carries its evidence, and everything unbuilt or unenforced is labelled as such.

### A3. ✅ CLOUD SERIALIZATION GUARD — SHIPPED + NOW GATED; real-emulator verification now exists as A4 (2026-07-26)

> **STATUS (owner decision, 2026-07-21): RESOLVED for the release — A3 no longer gates 2.8.5, and its
> modeled guard is now WIRED INTO THE GATE (no longer opt-in).** The self-deriving modeled guard
> (`npm run cloud-check`) is the shipped resolution; it now runs automatically as gate step 4b on both the
> fast (commit) and full (push) gate — see **RESOLUTION** and the **Placement** bullet at the foot of this
> entry. The true emulator-backed test was **re-filed as the optional post-2.8.5 item A4** —
> _not_ a blocker — because the premise correction below shows the silent-data-loss failure A3 was scoped
> to catch **cannot occur by design**. The original spec is preserved verbatim beneath for the record.
>
> **✅ UPDATE (2026-07-26): A4 is now BUILT and red-then-green PROVEN against the real emulator** (see A4
> below). It found the modeled guard's `undefined`-handling comment was wrong about the mechanism — real
> Firestore **rejects** the write outright rather than silently stripping the field — corrected in this
> same pass in `scripts/cloud-serialization-check.js`. The guard's PASS/FAIL behavior was unaffected (an
> undefined field was already flagged as hostile either way); only the doc comments describing _why_ were
> wrong, and are now accurate.

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

**🚧 BUILD ATTEMPT — feasibility wall + premise correction (2026-07-21, Dispatch/Opus).** The spec above
is preserved verbatim; this note records what was found when building was attempted. Two blockers, one
hard-environmental and one about the code itself:

1. **The emulator genuinely cannot run in the current environment — HARD WALL.** The Firestore **and** Auth
   emulators (via `firebase-tools`) are **Java** processes; they need a JVM. Checked and confirmed absent:
   `java` not on PATH, `JAVA_HOME` unset, no JDK/JRE under `Program Files`, no bundled JBR in any IDE/SDK,
   and `firebase-tools` is not installed. So the emulator-backed round-trip **could not be run or verified
   here**, and per the item's own **Hard rule** (red-then-green on the real artifact) an un-runnable
   cloud-safety test must not be shipped as green — it would be "a green that lied." **What the owner must
   set up to unblock:** install a **JDK/JRE (11+)** on the machine that runs the gate, then
   `npm i -D firebase-tools` (dev-only — must never enter `sw.js`'s precache set or ship to users). A JDK is
   a **system install**, beyond a dev-only npm dependency, so it is deliberately left for the owner rather
   than done silently by a session.

2. **⚠ PREMISE CORRECTION — the failure mode A3 was written to catch does not exist in the current code.**
   A3 assumes "a field added to `state` but missed in the **cloud sync mapping** silently never syncs." There
   is **no field-by-field cloud sync mapping**. `cloud.js` stores the **entire `robco_v8` container wholesale**
   (`_buildSavePayload` → `robco_v8: payload.robco_v8`; `_uploadSaveDoc`/`overwriteCloudSave` write it whole).
   The load path runs `sanitizeImportedContainer` (starts from `Object.assign({}, s)` — unknown fields **pass
   through**) then `migrateState` (mutates in place, defaults missing fields, deletes only **named** legacy
   keys — unknown fields **pass through**). So a newly-added plain state field **round-trips losslessly through
   this project's own code**; there is no mapping to forget. The **only** place a new field can silently fail
   to sync is the **Firestore serialization boundary**: `undefined` values silently stripped, directly-nested
   arrays rejected (the whole write throws), `Date`/`Map`/class-instance coercion, and the 1 MB doc-size cap.
   That boundary is exactly the layer that needs the **real emulator** — a pure-JS round-trip cannot observe it.
   **Consequence:** a non-emulator "round-trip" test built on the real save-build + real load sanitize/migrate
   would pass for **any** new field (the code loses nothing there), so shipping it as "the A3 test" would be
   theater — it would catch nothing. It was therefore **not shipped**. Suite 46.17 remains the closest existing
   coverage (hardcoded fixture + hand-listed fields; real `sanitizeImportedContainer` + `migrateState` in a
   `vm`) and is unchanged.

**✅ RESOLUTION (owner decision 2026-07-21) — the modeled guard is SHIPPED and A3 is release-cleared.**
`scripts/cloud-serialization-check.js` (`npm run cloud-check`). It self-derives the field set by extracting
and evaluating the **real** `let state = { … }` initializer from `js/core/state.js` in a `vm` sandbox (the
same extract-and-run technique as Suite 46.17), builds the `robco_v8` write payload, and recursively flags
any value Firestore would silently strip (`undefined`) or reject (directly-nested array `[[…]]`), plus a
soft 1 MB doc-size check. **A new field added to that literal is scanned automatically — no hand-typed list**,
so it does not rot the way 46.17's list does (the one anti-pattern this item forbids). A built-in
**positive control** scans a known-hostile fixture on every run and fails if the scanner doesn't flag it, so
the guard can never silently degrade into a green-that-lies no-op.

- **Red-then-green PROVEN on the real shipped literal** (Protocol 13/42). Planting `_a3Probe: [[1,2]]` and
  `lvlUndef: undefined` in the actual `state` made it FAIL (exit 1) and it named BOTH —
  `campaigns.FNV._a3Probe[0] → directly-nested array` and `campaigns.FNV.lvlUndef → undefined stripped`;
  removing them made it PASS (exit 0). `js/core/state.js` was left byte-identical to HEAD.
- **Placement — ✅ NOW GATED (2026-07-21, owner's directive "wire it").** Promoted from opt-in into
  `scripts/gate.js` as step **4b**, in the pure-Node section that runs on **BOTH** `gate:fast` (commit) and
  `gate` (push) — the same class as the boot-chain preflight (step 3), which is also cheap, static, and
  browser-free. It stays runnable standalone via `npm run cloud-check` too. Rationale for fast/commit-gate
  placement: it reads only the `state` literal (no browser, no emulator, no network), so it costs
  ~nothing and belongs where the other cheap static guards run; a modeled guard that runs on every commit
  catches regressions, an opt-in one nobody runs does not. The anti-vacuous property is unchanged by
  gating — it still fails LOUDLY on extraction failure and on a broken positive control, so the gate can
  never turn it into a green-that-lies no-op. Confirmed the full gate still passes with it wired.
- **No silent skip (the green-that-lied guard).** The script has **no conditional-skip path** — it always
  runs and always asserts. If extraction of the state literal ever fails, it **FAILS LOUDLY** (the
  anti-vacuous check refuses to let an empty derived state pass as clean), never silently green.
- **What it MODELS, not verifies (state the limit so no one over-trusts it).** It encodes Firestore's
  documented write constraints (no `undefined`, no directly-nested arrays, ~1 MB doc cap) **in our own
  code** and checks the state **shape** against them. It does **not** run real Firestore, so it does not
  cover real type coercion, deployed security rules, App Check, network, or a field that is safe by default
  but gets a hostile value only at runtime. Those constraints are stable and documented, but this reduces
  the residual risk — it does not eliminate it. The real-Firestore verification is item **A4** (optional).

**Why A3 dropped from RELEASE BLOCKER to release-cleared — the premise correction (the most valuable
finding).** A3 was scoped to catch "a field added to `state` but missed in the cloud **sync mapping**
silently never syncs." Established from the code (block 2 above): **there is no field-by-field sync
mapping.** `cloud.js` stores the campaign **WHOLESALE as a blob** (`robco_v8: payload.robco_v8`) and the
load path passes unknown fields **through** (`sanitizeImportedContainer`'s `Object.assign` copy +
`migrateState`'s in-place defaulting). So the forgotten-field-mapping data-loss A3 existed to catch
**cannot occur by design** — a new field round-trips losslessly through the app's own code. The only
residual silent-drop is the Firestore **serialization boundary**, which the modeled guard above now covers
for the shape and which A4 now verifies against the real emulator (built 2026-07-26, see A4 below). That is
why the emulator test was an **optional post-release upgrade, not a blocker**, and why **A3 is the last
thing that was gating 2.8.5 and is now cleared.**

### A4. ✅ Real-Firestore round-trip — BUILT + red-then-green PROVEN against the real emulator (2026-07-26)

**✅ The JDK is now VERIFIED USABLE on this machine, not merely reported installed (recorded 2026-07-27).**
The entry below carries the history honestly — `java` was confirmed **absent** 2026-07-21 (the hard wall that
deferred this item), and the owner **said** a JDK was installed 2026-07-23. That was an owner report, not a
verified fact. It is now verified by the strongest evidence available: **A4's run actually started the
Firestore and Auth emulators, which are Java processes** — they could not have run at all without a working
JVM. So the environmental blocker is closed on evidence rather than on a claim, and a future session can stop
treating "does this machine have a JDK?" as an open question.

**What it is.** The upgrade of A3's modeled guard from _modelled_ to _verified_: a save→sync→load round-trip
run against the **Firebase local emulator suite** (real Firestore + Auth SDK write/read), asserting
field-level fidelity driven from the live field list — the thing A3 originally described. It replaces the
modeled Firestore constraints (`cloud-check`) with the real database's actual behaviour, so it also catches
real type coercion (timestamps, number ranges) and true document-size rejection that a model can only
approximate.

**Explicitly NOT a release blocker (owner decision 2026-07-21).** The premise correction (see A3) removed
the silent-data-loss risk this was scoped for; the modeled guard (A3) covers the residual shape risk. So
this is a _confidence upgrade_, run when convenient after 2.8.5 — never gating a ship.

**What it needs — recorded honestly. ✅ The JDK blocker is now CLEARED (2026-07-23).** A **JDK/JRE 11+** on
the machine that runs it (the Firestore/Auth emulators are Java processes) was **confirmed absent 2026-07-21**,
which is why this was deferred — but the **owner confirmed 2026-07-23 that a JDK (version 25) is now
installed**, so the hard environmental blocker is gone. The **only remaining setup is `firebase-tools` as a
DEV-ONLY** dependency (`npm i -D firebase-tools`) — which must never enter `sw.js`'s precache set or ship to
users, and runs fully offline at the gate. **⚠ Half-installed as of 2026-07-24:** `firebase-tools@^15.24.0`
is present in the app repo's `package.json` + `package-lock.json` but those changes are **uncommitted in the
working tree** (they landed while other work was in flight and were deliberately left unstaged). On resume,
finish this deliberately: decide whether to commit the dev-dependency (it is dev-only, never served) as the
first step of actually building A4.

**What it still would NOT cover:** real _production_ Firebase, App Check, or deployed security rules as they
run in prod — the emulator is a local stand-in, not production. State that limit so no one over-trusts it.

**Done means (original spec):** the JDK is now present, so this is **actionable** (only `npm i -D
firebase-tools` remains to set up) — a real-SDK round-trip against the emulator asserts every save-envelope
field survives equal, driven from the live field list (not a hardcoded one), proven red-then-green by
dropping a field; `firebase-tools` dev-only with nothing added to the served set. Until it lands, A3's `npm
run cloud-check` is the standing guard, and this stays **optional — never a release blocker** (owner
decision 2026-07-21, unchanged).

**✅ RESOLUTION (2026-07-26) — built, wired standalone, proven red-then-green against the REAL emulator.**

- **The dev dependency landed.** `firebase-tools@^15.24.0` (already staged) was committed, plus `firebase@12.15.0` — pinned EXACT (no `^`) to match the version `js/services/cloud.js` imports from the gstatic CDN, so the Node-side round-trip exercises the identical SDK build the browser runs, not a drifting one. Both are dev-only; `package.json`/`package-lock.json` are not in `scripts/cache-bump-guard.js`'s served-file regex and `node_modules/` is gitignored, so neither touches the served/precached set — confirmed by re-running the cache-bump guard after staging.
- **`firebase.json` gained an `emulators` block** (Firestore :8090, Auth :9099, UI disabled) alongside the existing `firestore.rules`/`firestore.indexes.json` config — config-only, not a served file, no cache bump needed for that file itself.
- **`scripts/emulator-round-trip-check.js`** is the new script (`npm run test:emulator`, which runs it via `firebase emulators:exec --project demo-robco-uos-test --only firestore,auth "…"` — the `demo-` project prefix is the Firebase CLI's own guarantee that the emulator never touches the real `nv-overlord` project or any network beyond localhost, regardless of what `.firebaserc` declares as default). It **reuses** A3's extractor rather than forking a second one (Protocol 22): `scripts/cloud-serialization-check.js` now exports `deriveDefaultState()`/`buildWritePayload()` (guarded by `require.main === module` so its own CLI behaviour is unchanged), and the new script imports them, signs in anonymously against the Auth emulator, and writes the derived `robco_v8` payload inside a full save envelope via the real SDK's `addDoc()` — the same additive call `_uploadSaveDoc()` makes (Protocol 34) — then reads it back and diffs every field.
- **Red-then-green PROVEN against the REAL emulator, both directions, three assertions per run:** (1) the clean, self-derived payload round-trips with every field equal — PASS; (2) a planted directly-nested array (`_a4Probe: [[1,2]]`) makes the real write throw (`"Nested arrays are not supported"`) — correctly caught; (3) a planted `undefined` field (`_a4Probe: undefined`) makes the real write throw (`"Unsupported field value: undefined"`) — correctly caught. No "field dropped from the sync mapping" red case, deliberately: A3's own 2026-07-21 premise correction established that failure mode cannot occur by design (wholesale-blob write, unknown fields pass through), so testing for it would be testing something that isn't real — the script's header states this explicitly.
- **A genuine cross-check finding, not just a rubber stamp.** The real emulator run surfaced that A3's model had the _mechanism_ wrong: it described an `undefined` field as something Firestore "silently STRIPS," but the real Web SDK (with `cloud.js`'s actual settings — no `ignoreUndefinedProperties`) **rejects the whole write outright**, client-side, before any network call — louder and safer than modeled, but still a documentation error. Corrected in the same commit, in `cloud-serialization-check.js`'s comments and console output, with the date and the A4 script named as the source of truth. This is exactly the class of thing A4 exists to catch that a model alone cannot.
- **A real harness bug was found and fixed while building this (Protocol 42).** The first run failed the CLEAN payload too, with Firestore rejecting plain fields as "a custom Object/Array object." Root cause: `deriveDefaultState()` runs the real `state.js` literal inside a `vm` sandbox — a separate V8 realm — and the SDK's plain-object/array validation is realm-sensitive, so a naive `Array.prototype.map()`-based clone (which preserves the source array's realm via species construction) still produced foreign-realm arrays. **Investigated and classified: harness-only** — the browser runs everything in one realm, so this cross-realm mismatch cannot occur in the shipped app; only this test's own vm-based derivation technique created it. Fixed by rebuilding `deepClone()` to construct fresh objects/arrays in the current realm at every level (no `.map()`), with the reasoning recorded in the script's own header comment so it can't silently regress. The fix itself IS the locking coverage — this script's every run re-proves the clone is realm-clean, which is exactly the Protocol 42 "still add a test" bar for a harness-only finding.
- **Standalone, NOT gated** (as the original spec + owner's 2026-07-21 "never a release blocker" both required): wired as `npm run test:emulator`, absent from `scripts/gate.js`. Documented in the script's own header comment and in `README.md`'s Available Scripts list (needs a JDK/JRE 11+ + the two dev deps, already in `package.json`). `npm run cloud-check` (A3) remains the gated guard, unchanged, still running on every commit/push.
- **Full gate confirmed still green** with these changes in place (no gate step added or removed).

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

### L. ⬜ Player-facing public view of the queue — PRIVATE VIEW SHIPPED & OWNER-CONFIRMED (2026-07-27); public view still deferred (post-P2)

**✅ Private view: SHIPPED and OWNER-CONFIRMED.** Built 2026-07-23 (`npm run queue-view` →
`queue-view/queue-view.html`, guarded by Suite 246). The owner opened the generated page on his own phone
and confirmed it reads right ("it looks good", 2026-07-27) — the one thing that had kept this half at 🔄
(Dispatch's own 360px DOM verification had already passed; this was the missing human eyeball). Full build
account moved to [QUEUE_LOG.md#l](QUEUE_LOG.md#l). **⛔ The player-facing opt-in view is NOT built** — L's
own ruling defers it (below); this is now the only work remaining under item L.

**The ruling — ONE SOURCE, TWO GENERATED VIEWS** (still governs the open half): `QUEUE.md` stays the single
source of truth; two separate generated views read from it:

- A private view, for the owner — ✅ shipped and confirmed, above.
- A player-facing view, for the live site's already-queued "upcoming updates" feature — generated later,
  from **only** items explicitly marked public in this file. **The marking must be opt-in, never opt-out**
  — a forgotten mark means a player silently misses an update (the safe failure direction), rather than
  internal reasoning silently leaking to players (which isn't). Same fail-closed shape as the museum's
  name-substitution guard (P2, in the museum sub-program below).

**Why the two views are not merged into one document.** This file's value is that it records rejected
options, hazards, and reasoning — not just current status. A single merged document either leaks that
reasoning to players or gets sanitized until it stops being useful internally.

**Sequencing.** The player-facing view is deliberately left until **after** the museum publication work
(P2) — it needs the same substitution-and-fail-closed-guard machinery P2 is building, and building it twice
would be wasteful (Protocol 22).

**What it depends on.** P2's substitution/guard machinery.

**Done means (public view, still deferred):** a separate generated page shows only opt-in-marked items,
defaults to omitting anything unmarked, and reuses P2's machinery.

### Q. ⬜ Planning-folder hygiene — a standing rule + an owed cleanup task (owner, 2026-07-22)

**What it is.** A new standing rule the owner set: the app repo's `planning/` should hold **only CURRENT-use
working docs**. Old-version planning (e.g. the 2.6.0 folder) should be **DELETED from the app repo** once it
has served its use, because the archive hosts every planning doc permanently. This keeps the live `planning/`
tree lean and current instead of accumulating every past round's audits, slates, and mockups. Recorded per
Protocol 50 because it was decided in conversation and lived only there.

**⛔ TWO HARD CONSTRAINTS — both non-negotiable, recorded as the rule's own guardrails:**

- **NEVER delete a planning file from the app repo unless it is CONFIRMED present in the archive first.**
  Save-sacred applied to planning docs: a planning doc is **real work**, and losing one to
  delete-before-backup is unacceptable. The sequence is **confirm in archive → then delete** — never the
  reverse, never on assumption.
- **NEVER delete anything still needed FORWARD.** Anything **2.9.0 (or later) still depends on stays**,
  regardless of which version-folder it happens to sit in. **"Served its use" means DONE, not merely "belongs
  to a shipped version."** When in doubt, **KEEP** — the failure direction of keeping a stale doc is trivial;
  the failure direction of deleting a still-needed one is not.

**WHY it's safe (the mechanism, verified against `sync.ps1`, 2026-07-22).** The Protocol 48 sync mirrors
`planning/` into the archive **ADDITIVELY** (`Add-Dir`, never a purging mirror): once a planning file is
captured it is **never removed** from the archive even after it disappears locally, and the sync regenerates
**`ARCHIVE_RETAINED.md`** every run listing exactly the planning files kept in the backup that are no longer
present in the source — so the retained set is **visible, not something to trust blindly**. That is what makes
local deletion recoverable. **Contrast (also verified):** `memory/` is **MIRRORED** (`Mirror-Dir` /MIR — a
deletion propagates), but a deleted memory is still recoverable from the archive's **git history**. So planning
deletions are additively retained; memory deletions are history-recoverable. Either way nothing is truly lost —
which is the precondition that makes this hygiene rule safe to apply at all.

**Where this rule belongs eventually.** In the **rules layer** — the deploy/backup area, alongside **Protocol
48** (the archive-backup protocol) — not left as a queue entry forever. Recorded here now (Protocol 50); its
earn-condition for a rules-layer home is the next docs/rules pass that touches Protocol 48 or the backup
notes. (It is also a natural **R5** prose→enforcement candidate later — a build-time check could refuse to
delete a `planning/` path not yet confirmed in the archive — but that is not required for the rule to stand.)

**⬜ THE CLEANUP TASK OWED.** Concretely: **confirm each old-version planning file is present in the archive,
then remove it from the app repo.** **⚠ Run it when NOTHING ELSE is touching the app repo (concurrency —
Protocol 12):** a junk/cleanup sweep during a concurrent session has already deleted a live session's scratch
files once (recorded under G), so this deletion pass must have the app repo to itself.

**Done means:** the app repo's `planning/` holds only current-use docs; every old-version planning file
removed from it was **first confirmed present in the archive** and was **not needed by 2.9.0+**; and the
standing rule has a home in the rules/deploy-backup layer.

### R10. 🔄 The external knowledge-architecture audit (GPT-5.6 Sol, 2026-07-21) — all 3 sequenced steps DONE (2026-07-26); only finding L (owner decision) and finding G (cosmetic) remain

**What it is.** An external audit (GPT-5.6 Sol, read access to `dev` at commit `2798271`) of how this
project **stores, retrieves and connects what it knows about itself** — the retrieval chain, the scoped
notes, the doc/gate/skill layers. It read the real files and cited paths/lines. This entry is the Protocol 50
landing record: **every claim was re-verified against the current files before being written here** (the audit
read one commit; a claim is only recorded as fact once checked). Two live defects were fixed in the same pass;
everything else is recorded, ranked by consequence, with each finding's home or earn-condition stated.

**⭐ THE SEQUENCE for working R10's findings — Dispatch sequenced it, owner's instruction (2026-07-21):
_"you need to sequence everything not me."_** The ordering reasoning is the valuable part, so it is recorded,
not just the order. **NONE of this blocks the release — and A3 (the last data-safety gate) is now RESOLVED
(2026-07-21), so nothing here blocks 2.8.5; everything in R10 is process debt, not shipping debt.** The
stated plan: do steps one and two, ship 2.8.5, then do step three.

1. **FIRST — fix the trusted layer.** The stale facts in `ARCHITECTURE.md` (finding B) and the ones the R2
   restructure copied into `rules/state-and-save.md` (finding B-critical), plus the remaining false/overclaimed
   statements in the skill (findings C skill-overclaim + E library-fallback). **Why first:** these bleed
   _continuously_ — every session that runs before they're fixed inherits wrong facts and generates work.
   Nothing else in R10 costs anything per-session. This goes first purely on **bleed rate**. **Also riding
   here (landed 2026-07-21, self-caught, not from the audit):** the QUEUE.md header-mangle structural fix —
   full record below, in the ranked findings list.
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

**✅ STEP 1 — the doc trusted-layer fact-corrections DONE (2026-07-21, this pass).** Findings **B** and
**B-critical** closed against source: every stale `api.js` attribution of the moved symbols corrected to its
real home (`getSystemDirective`→`api-directive.js`, `autoImportState`/`sanitizeImportedContainer`→`api-import.js`;
`api.js` keeps `transmitMessage`/`fetchAuthorizedModels`) in `ARCHITECTURE.md` (File Map + the 3 missing split
files added, Inbound heading, both state checklists, the event-bus table) and in `rules/state-and-save.md`
Protocol 4 checklist + `rules/ui-and-mobile.md` Protocol 10 — **this closes the "R2 restructure relocated stale
facts into the new trusted layer" hole (finding B-critical)**; the single-`ui-render.js` render-layer refs
corrected to the `ui-render-*.js` family in every actionable checklist; the cache-guard description
(`ARCHITECTURE.md` ~3393) rewritten to match `scripts/cache-bump-guard.js` as it really is (differ-from-HEAD,
not monotonic; the current `SERVED_RE` set). Defect-2 (`setDoc`→`addDoc`) confirmed still correct. **Still owed
in step 1 (out of THIS brief's doc-only scope):** the `skill/SKILL.md` overclaim (finding C skill-half) and the
CLAUDE.md library-fallback sentence (finding E second half).

**✅ STEP 1 NOW FULLY CLOSED (2026-07-21, a later pass).** The two owed pieces above landed: `skill/SKILL.md`'s
"canonical and current by construction" overclaim (finding C skill-half) rewritten to "canonical source of truth
but only partially mechanically checked — where a doc and the code disagree, the code wins"; the CLAUDE.md
library-fallback sentence added (finding E second half — absent `library/` targets: fall back to source, don't
infer). **Finding F (rollback ↔ branch model) rode along in the same pass:** reconciled dev-first (owner's call,
NO direct-`main` exception) across `scripts/rollback.sh`, the `ARCHITECTURE.md` runbook, and Protocol 16 — the
accepted latency-vs-integrity tradeoff recorded in-place. **⚠ Skill re-install owed:** `skill/SKILL.md` is a
read-only installed artifact, so the owner must RE-INSTALL it (Settings › Capabilities) for the fix to reach his
sessions — his second re-install today.

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

**✅ STEP 2 DONE (2026-07-23, this pass) — the guards that overstate their coverage are fixed. Findings C
(Suite-220 half) and D closed.** The reason step 1's stale facts sat invisible under a green gate is now
removed:

- **Finding C (Suite 220 half) — CLOSED.** Suite **220** was extended to see what it was blind to.
  **220.2b** validates backticked **nested** repo paths (`js/services/api-import.js`, `assets/…`, `.github/…`;
  wildcard-family `*` tokens excluded), **220.2c** validates backticked **exact bare code filenames**
  (`.js`/`.mjs`/`.css` only, so gitignored `library/` docs and `planning/` `.html` mockups can never
  false-fail), and **220.2d** is their empty-parse self-integrity guard. Scope held strictly to nested paths +
  bare filenames — existence only, **NOT** a prose-truth / semantic checker (the recorded direction).
  **Proven red-then-green** (Protocol 13/42): a planted nonexistent nested path (`js/services/api-imprt.js`)
  and bare filename (`api-imprt.js`) both fired RED; removing them restored GREEN. **And it caught a real one
  on introduction** — `terminal.css`, the pre-U-A2 monolithic stylesheet (split into `css/NN-*.css`), was still
  named as a **live file** in `rules/ui-and-mobile.md`; fixed in the same commit (Protocol 42), with the one
  historical mention in `ARCHITECTURE.md` reworded to prose. (The skill-overclaim half of C was already fixed
  in step 1; not redone.)
- **Finding D — CLOSED.** The retrieval map is now the **sole** scope authority (stated in place in
  `CLAUDE.md`), and all five routing gaps are fixed: `.github/workflows/` added to the **testing** row (it is
  co-governed with deploy); `scripts/cf-staging-build.mjs` added to the **deploy** row and carved out of the
  broad `scripts/` → testing routing; `firebase.json` added to the **auth** row; `QUEUE_LOG.md` **and**
  `skill/SKILL.md` added to the **documentation** row (skill/SKILL.md now routes somewhere). New Suite **220.15**
  is the narrow parity check 220.14 lacked: every concrete path a note's "Load this when touching" header claims
  must be **routed to that note by its map row** (header ⊆ row; locators and parenthetical asides stripped so
  only real scope claims are checked). Proven to catch a gap (removing `firebase.json` from the auth row fires
  RED). **No second routing document** was created.

**✅ STEP 3 DONE (2026-07-26) — Finding A closed. `ARCHITECTURE.md` is now task-retrieved BY
SECTION, not read wholesale.** All 39 `##` sections got a stable, hand-curated `<a id="…">`
anchor (decoupled from heading prose, so a reword can't silently break a link — the QUEUE_LOG
`<a id>` pattern applied here for the same reason). Two `###` subsections that are independently
link-referenced (Cloud Push/Pull, the OS Event Bus) got their own anchors too. **Routed from
both places finding A named:** every `rules/*.md` note whose surface has real
`ARCHITECTURE.md` content now names the exact anchor(s) in its own "Related notes" section
(`state-and-save.md`, `deploy-and-cache.md`, `auth-and-cloud.md`, `ui-and-mobile.md`,
`audio.md`, `game-data.md`, `ai-contract.md`, `file-layout.md` — 8 of the 10 notes; the other
two, `testing-and-gates.md` and `docs-and-library.md`, have no dedicated `ARCHITECTURE.md`
section to point at); `CLAUDE.md`'s own "read `ARCHITECTURE.md` second" line and its Reference
Pointer Index row were rewritten to say by-section, pointing a session with no matching note at
the file's own (now-complete) Table of Contents. **Explicitly not a second summary document** —
the anchors and the pointers are the whole change; no new file was created. **Guarded — new
Suite 220.16**, proven red-then-green (renaming one anchor made both an external `rules/*.md`
reference AND an internal `](#…)` link fire red; restoring it went green): every
`ARCHITECTURE.md#slug` reference from `CLAUDE.md`/`rules/*.md` and every in-file link inside
`ARCHITECTURE.md` itself must resolve to a real anchor, so this routing can't silently rot the
way the pre-existing Table of Contents already had (it listed 19 of the file's 39 sections,
using GitHub's fragile auto-slug on headings with nested parentheticals — both bugs fixed as
part of this pass, since they were found while rebuilding the TOC).

**Also finding B's remaining half — the operational checklists/runbooks, relocated
conservatively.** Five duplicated obligation-checklists (the two state-field checklists, the
audio-source checklist, the UI-panel checklist, the registry-autocomplete checklist, and the
Service Worker Cache Protocol's rule/format/guard) are now a short **rationale/invariant**
paragraph in `ARCHITECTURE.md` linking to the already-canonical, already-more-current version
in the owning `rules/*.md` note (verified each rules/*.md checklist was equal-or-more-complete
before relocating — nothing was lost, and the cache-protocol's Format+Examples table, which
`rules/deploy-and-cache.md` didn't yet carry, was moved there first, additively, per Protocol 22
"extend before creating"). **`## Hotfix Rollback (Protocol 16)` was deliberately left alone** —
CLAUDE.md's own Protocol 16 text already explicitly delegates the runbook to this exact section
(`runbook in ARCHITECTURE.md § "Hotfix Rollback"`), so it is not a duplicate to relocate; it got
an anchor for routing and nothing else. **Nothing flagged as ambiguous** — every relocation
target was an unambiguous, already-existing, already-more-current canonical home.

**R10's three-step sequence is now fully executed.** What's left is not sequence work: **Finding
G** (LOW, a redundant-not-duplicate App Check mention — cosmetic, earns its slot on the next
queue-touch pass, not gating anything); **Findings H/I** (gated on P3 / the Atlas, unchanged);
**Finding L** (the external-control-plane-state ledger question — still an open owner decision,
unchanged, not something this pass could resolve).

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
- **Finding B — ✅ FULLY CLOSED (stale facts at Step 1, 2026-07-21; the operational-checklists direction
  at Step 3, 2026-07-26).** `ARCHITECTURE.md` was doing two jobs and carried current-looking errors: the
  stale `api.js` attributions (File Map, the Inbound heading, the state checklist) and the monotonic-rev
  cache claim were corrected at Step 1. The direction this finding recorded — "remove the operational
  checklists in favour of links; Architecture owns rationale/invariants, rules own obligations" — is now
  built: the cache protocol, the two state-field checklists, the audio-source checklist, the UI-panel
  checklist, and the autocomplete checklist are all short rationale paragraphs linking to their canonical
  `rules/*.md` home. Full account under R10's own Step 3 entry above.
- **Finding A — ✅ CLOSED (Step 3, 2026-07-26).** The blanket-retrieval problem — CLAUDE.md sent every
  session to read the whole `ARCHITECTURE.md` (**3,462 lines / ~348 KB**) wholesale, with a TOC but no
  routing to a _section_ — is fixed: 39 stable `<a id>` section anchors, `rules/*.md` notes and
  `CLAUDE.md` routed to the specific anchors for their surface, no second summary document, and Suite
  **220.16** verifies the named anchors exist (red-then-green proven). Full account under R10's own
  Step 3 entry above.
- **Finding C — ✅ CLOSED (skill-half in step 1; Suite-220 half in step 2, 2026-07-23). Suite 220 did far less
  than Protocol 45 advertised, which is why B/B-critical passed a green gate.** Suite **220.2**'s regex matched
  **single-segment paths only** (`(js|css|tests|scripts|rules)/name.ext`);
  it cannot see bare filenames (`api.js`), nested paths (`js/services/api-import.js`), function ownership, or
  prose — so the stale `api.js` ownership claims are invisible to it. And `skill/SKILL.md` **overclaims** the
  canonical files are "canonical and current by construction (the gate guards them)" — **still present at
  line 19 (verified 2026-07-21); NOT fixed by `21c78f7`, which only corrected the separate gate falsehood
  (finding E).** Direction: correct the SKILL claim first (say _partially_ mechanically checked, source wins);
  extend 220.2 only for unambiguous backticked **nested** paths and **exact bare** filenames; **do NOT**
  attempt a prose-truth checker. Belongs to steps one (skill claim) and two (Suite 220) of the sequence above.
- **Finding D — ✅ CLOSED (step 2, 2026-07-23). The retrieval map had concrete gaps against the notes' own
  declared scopes.** `.github/workflows/` routed only to the deploy note though the testing note also governs it
  (→ added to testing row); `scripts/cf-staging-build.mjs` is deployment's but the broad `scripts/` row sent it
  to testing (→ added to deploy row, carved out of testing's `scripts/`); `firebase.json` was in the auth note's
  load header but missing from its map row (→ added); `QUEUE_LOG.md` was absent from the documentation row
  despite that note defining its append-only contract (→ added); `skill/SKILL.md` routed nowhere (→ added to the
  documentation row + that note's header). Suite **220.14** only proved every note is _named_ in the map, not
  that every relevant path _reaches_ the note claiming it — closed by new **Suite 220.15** (header ⊆ row parity).
  The map is now stated as the **sole** scope authority in `CLAUDE.md`. No second routing document.
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
- **Self-caught, NOT from the audit — the QUEUE.md header-mangle hazard (found and fixed 2026-07-21,
  commits `8dc9d5f` → `89bc6a5`).** A recording pass hand-authoring a new paragraph into the giant
  single-underscore-italic `_Last updated: …_` header mistyped `` `APP_VERSION` `` as `` `APP*VERSION` ``
  and broke the italic close; caught by eye and fixed the same day. **Root cause verified by reproduction
  (Protocol 27), and it is NOT what the fix commit's own message claimed:** `npx prettier --write` run
  against both the correct and the mangled header text left each byte-for-byte **unchanged**, and
  `--check` passed both — Prettier never reformatted this content, so "Prettier's reformat corrupted it"
  is wrong. The real mechanism: Prettier is a formatter, not a fact-checker, and it did its job — the
  actual hazard is structural. The header is one dense paragraph mixing bold, code spans, and links, all
  wrapped in a single outer `_..._` italic span; a human or AI hand-composing a new entry into that block
  can mistype a markup character (an underscore as an asterisk, a stray backslash-escape) and the result
  stays syntactically valid markdown, so nothing in the gate catches it. **Owner decision (2026-07-21),
  three parts, all approved together:** **(1) no guard** — a hand-maintained "known identifiers survive
  intact" checker is the exact Protocol 2a anti-pattern the project already retired, and this project's
  standing bar requires a real _recurring_ consequential failure before a guard earns its existence; one
  self-caught occurrence in a non-served planning file does not clear it. **(2) fix the structural
  trigger, not the instance** — the hazard is the giant single-italic construct, not any specific
  identifier, so removing the outer `_..._` wrapper makes the whole fragility class disappear with no
  list to maintain and no guard to rot; **done in this same pass** (rides with step 1 above, since step 1
  was already scheduled to touch this file) — the header no longer wraps the "Last updated" note in one
  italic span, verified clean against Prettier and rendering `APP_VERSION`/`CACHE_NAME` correctly. **(3)
  the not-to-guard choice is recorded on purpose, with its revisit condition** — "consciously chose not to
  guard, here's when we'd revisit" is a different, stronger claim than silently doing nothing: if a giant
  single-italic block mangles a second time anywhere in this repo's docs, that is a recurrence and it
  earns a guard then.

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

### R11. 🔄 The knowledge-graph / retrieval-topology — MINIMUM VERSION BUILT (2026-07-21), un-gated pending proof-of-drift

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

**Minimum version BUILT (2026-07-21) — [`scripts/knowledge-graph.js`](scripts/knowledge-graph.js).** The
DIAGNOSTICS-view data layer only (topology view and query answerer remain future consumers, per §10 of the
plan): `routes_to` and `claims_scope_over` derived independently, diffed, and proven against six real drift
gaps already present in the shipped files; every extractor reports records-seen/emitted/unparsed/status; a
missing or reworded source fails loud (`empty_parse`/`broken`), never a silent empty-but-healthy graph. Output
is generated on demand at `library/knowledge-graph.json` (gitignored, never committed — regenerated fresh
every run via `node scripts/knowledge-graph.js`). **Deliberately left un-gated** — no Suite, no git hook (owner
decision, Protocol 50) — until it demonstrably catches real drift over time, per the spec's own stopping rule.
`claims_checked_by`/`invokes` and the topology/query-answerer consumers remain out of scope, as designed.

**⬜ Gating decision — STILL UNRESOLVED even though G is now closed (verified 2026-07-26 against the
committed claim-ledger).** Whether/when this un-gated drift-detector earns veto power (a Suite, a hook) was
left for item G (the blind workflow review) to rule on. **G finished (2026-07-23) and never actually ruled on
this** — `planning/audits/G_workflow_review/CLAIM_LEDGER.md` addresses only the ledger's own gating (a
different question), not R11's. See G's account (`QUEUE_LOG.md#g`) for the verification. R11 stays un-gated —
its existing safe default — pending an explicit owner call; do not gate R11 on the assumption G already
settled it.

## ⚠️ Blocked on an owner decision

### R5. ⏭️ STAGE 2 — Convert prose into enforcement (waits on the owner formally calling it)

**What it is.** The highest-value of the three remaining staged-trim steps flagged at R3, and really a
conversion rather than a cut. The principle: a rule an agent must remember costs something every session
it's loaded; a guard that fails loudly is free and can never be skipped. Every mechanisable rule becomes a
check, then its prose shrinks to one line plus a pointer at that check.

**Candidates on file (GPT's table, unchanged — each needs re-verification against current code before any
commit, Protocol 27):**

- Branch discipline (Protocol 43) → GitHub branch-protection settings, not just prose. **⭐ Reinforced +
  pull-forward-able on its own (owner, 2026-07-22).** Make GitHub **ENFORCE** "main is release-only" — block
  direct pushes to `main`, require CI-passed — instead of it being a prose rule held by discipline (today
  Protocol 43 is convention only; a mis-aimed `git push origin main` would land straight on production). Low
  overhead (a settings config, not code), and it catches exactly the bad push the branch model exists to
  prevent, so it does **not** need to wait for the owner's formal Stage-2 call — it can be pulled forward on
  its own. **⚠ Must be configured to match the ACTUAL deploy path so it does NOT block releases:** the real
  release is a `dev → main --no-ff` merge plus the manual `workflow_dispatch` deploy run against `main` — the
  protection rules must permit that exact flow (e.g. required-status-checks + the merge, not an all-pushes
  block that would also stop the release merge). **A full PR workflow was considered and REJECTED (owner):**
  it is team machinery that adds phone-unfriendly ceremony to a lean solo workflow, and the review value it
  would add is **already covered** by the Protocol 8 diff-first audit + owner review — so **only branch
  protection is worth adopting**, not PRs.
- The redirect-auth ban (`linkWithRedirect`/`signInWithRedirect`, Protocol 30) → a lint rule.
- The state-field checklist → a schema round-trip test. **Flag:** partially covered now that **A3**'s modeled
  cloud-serialization guard (`npm run cloud-check`) has shipped, and it would be more fully covered by the
  optional emulator test **A4** — check for overlap at plan time (Protocol 22).
- Render-layering (Protocol 23) → AST/lint boundary rules, once the baselined debt is burned down. Today's
  static scanner (Suite 236) is a step in this direction; full enforcement waits on the native ES-modules
  migration (bundled with 3.0).
- AI-response handling → runtime schema validation + malformed-response behavioral tests.
- The deploy protocol → a post-deploy version/SW/offline smoke. **Flag:** very likely the _same_ work as
  the 2.9.0 hardening gate's "post-deploy TRUTH" item — resolve which one builds it before starting either.
  **UPDATE (2026-07-23):** the served-truth _foundation_ now exists — `scripts/release-receipt.js` (G item,
  CLAIM M) fetches the live prod build and compares served `CACHE_NAME` + `APP_VERSION` against the deployed
  commit. This candidate's remaining scope is the _behavioral_ half (SW actually installed/activated + an
  offline smoke), which is exactly the 2.9.0 "Post-deploy TRUTH" item — so both should **extend** the receipt
  (Protocol 22), not rebuild the served-hash compare.

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

### I. ⬜ Finally: the ROBCO SYSTEM ATLAS — 8 views over one graph (D shipped — dependency cleared)

**What it is.** The synthesis deliverable from the ecosystem cross-review
(`planning/2.8.5/audits/ATLAS_ECOSYSTEM_SYNTHESIS.md`): a single generated representation of the whole
system, offering **8 views over one graph** — and, load-bearing, the **assurance view is one of those
eight** (generated FROM the test suite's structure so it can never drift from what's actually guarded). The
governing rule: **generate everything a script can compute; hand-maintain only the un-derivable WHY.**

**What it depends on.** (1) The **pinned baseline** (available now: the R4 pin). (2) The
**architecture-conformance scanner** (shipped, Suite 236) and a cheap **dependency-structure matrix**. (3)
The **TEST_CATALOG generator** (D) — ✅ **shipped 2026-07-27** (Protocol 47); the same "generate, don't
maintain" plumbing (`scripts/generate-test-catalog.js`'s extraction + gate-diff shape) is directly reusable
here.

**Why it's last.** It's the capstone that represents the finished round, and it wants the round finished and
pinned to represent it honestly.

**⭐ IT RIDES P11's GRAPH RENDERER (recorded 2026-07-27 — do not build a second one).** P8's structure map
specifies a single node/edge schema (a superset of the shipped `library/knowledge-graph.json`) whose
`protocol → enforced_by → guard`, `claims_checked_by` vs `invokes`, and `leaves_unverified` edges **are** the
Atlas's assurance view — and **P11 Stage 2, the coverage view, is that view already owner-approved and
specified**. So the Atlas's most valuable output now has a home in the museum's build order, and building
separate plumbing for it would be the Protocol 22 parallel-implementation trap. This does not merge the two:
design note (b)'s "link via a stable identifier scheme, do NOT fuse" still governs, and design note (c)'s
cadence split still holds — the museum pins to RELEASES, the Atlas to a CURRENT baseline. **Share a renderer,
never share a cadence.**

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
  baselined edges (services emit, the UI subscribes). **⭐ CONFIRMED STAYING HERE (owner, 2026-07-28) —
  Protocol 50 (a-date):** when the "pull 2.9.0 hardening forward?" question was resolved, this item was
  deliberately left in this round rather than pulled forward — it depends on the surface the new OS services
  reshape, so hardening it early would risk doing the work twice. See **"⭐ ALSO PRE-MUSEUM"** above for the
  full reasoning.
- **Bootstrap isolation.** ~45 boot-phase calls sit under ONE outer try/catch with zero per-phase isolation.
  Add per-phase guards, classified fatal-versus-degradable. Fail loudly, never silently. **⭐ PULLED FORWARD to
  the pre-museum band as [HG2] (owner, 2026-07-28) — Protocol 50 (a-date).** This reasoning stays here
  unchanged; the live entry with its own ID and "Done means" is in **"⭐ ALSO PRE-MUSEUM"**, directly under CP5.
  **✅ SHIPPED 2026-07-30, app repo `aef7da4`** — so this line of the hardening gate is now CLOSED; the full
  record (including the corrected phase count — 51, not ~45) is at the HG2 entry above.
- **Event-bus hardening.** `RobcoEvents` has no `off` / `once` / dedup and swallows listener errors silently.
  Harden it before the OS round widens it; a thrown handler must not prevent unrelated handlers from running.
  **⭐ PULLED FORWARD to the pre-museum band as [HG1] (owner, 2026-07-28) — Protocol 50 (a-date).** This
  reasoning stays here unchanged; the live entry with its own ID and "Done means" is in **"⭐ ALSO
  PRE-MUSEUM"**, directly under CP5. **✅ SHIPPED 2026-07-30, app repo `31206dd`** — so this line of the
  hardening gate is now CLOSED; the full record is at the HG1 entry above.
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

**Build on the release-receipt FOUNDATION (Protocol 22, 2026-07-23).** The served-truth half already
exists — `scripts/release-receipt.js` (`npm run release-receipt`, the G-review CLAIM M item) fetches the
live prod build and asserts the served `CACHE_NAME` + `APP_VERSION` match the deployed commit, with a pure
compare core gate-tested red-then-green (Suite 245). It is deliberately a **manual post-deploy command**
(the code isn't live at push time; the gate has no guaranteed network). This item **extends** it — do NOT
re-implement the served-hash compare. What it adds on top: (1) proving the service worker actually
**installed/activated** (behavioral, not just "the file is served"); (2) an **offline** reload smoke; and
(3) the load-bearing new part — **surfacing an install/update failure to the USER in-app**, not just a log.
The receipt owns the "is prod serving the pushed bytes?" question; this item owns "did the SW update land,
and if not, does the user find out?"

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
that it **unlocks the Diagnostic Shell**; the minigame is the diegetic gate in front of it, the one piece
not yet built.

> **⚠ THE DIAGNOSTIC SHELL IS PROD-STRIPPED, NOT DELETED — read this before building the minigame (recorded
> 2026-07-22, Protocol 50; supersedes the earlier "already built and shipped" wording, which was misleading).**
> The Diagnostic Shell (`js/dev/test-console.js`, ~204 KB) is **fully present in the repo source** and ships
> in the **Cloudflare staging build** (`scripts/cf-staging-build.mjs` deliberately keeps it) — but it is
> **removed from the public production bundle** at deploy time by **`scripts/prod-strip-devshell.mjs`** (run
> from `.github/workflows/deploy.yml`; guarded by Suite 149). The strip deletes the file, its `<script>` tag,
> and its `sw.js` precache entry, then hard-asserts self-consistency. This is **correct for now** — players
> should not have a raw dev/cheat console — but it is **temporary**: the shell is the intended **payoff** of
> this minigame, so a future session must NOT mistake "absent from the prod bundle" for "deleted / cut from the
> project."
>
> **The seam already exists in code, and it is currently moot on prod — that is the exact trap to reconcile.**
> There is a built **MINIGAME-UNLOCK SEAM**: `robco_dsh_minigame_unlocked` (a device pref in `META_MANIFEST`,
> `js/core/state.js`) which `_devConsoleUnlocked()` (`test-console.js`) reads on a production build as an
> alternate "the shell exists" signal, and `_shellTier()` still hard-pins production to the restrictive
> `prod` tier so no cheat/reset/raw-internal tool can ever leak (leak-proof by construction). **But that seam
> can never fire on the actual public build today, because `prod-strip-devshell.mjs` removes the whole
> `test-console.js` file — so the flag-reading code isn't even shipped to prod.** The strip and the seam
> therefore **contradict each other right now**, harmlessly (the shell is simply unreachable on prod), and
> reconciling them is precisely the minigame's job.
>
> **So the minigame unit's real task is a STRIP→GATE conversion, not "build a console."** When the hack ships:
> stop removing the shell from the production bundle and instead ship it **present-but-locked**, then have a
> successful hack flip the existing `robco_dsh_minigame_unlocked` seam to reveal it (still `prod`-tier only).
> That is what turns the temporary prod-strip into a permanent minigame-gated unlock. Weigh the ~204 KB the
> prod build currently saves against shipping it locked — that download-size tradeoff is the one real design
> question the conversion has to answer. **Done for the shell half means:** the prod bundle carries the shell
> locked (not stripped), the minigame flips the seam to unlock it, `_shellTier()` stays `prod`-only on
> production, and the prod-strip is either retired or repurposed — decided deliberately, in place, per
> Protocol 49.

**Deliberately NOT in this set:** the **holotape archive / audio logs** is dropped (too many, a feature few
would use). A **survival / hardcore tracker** is set aside as a possible standalone future. An **achievements
tracker, an NPC codex, and an encounter/loot generator** were cut — **analysed by Dispatch, decided by the
owner** (the removal was recorded 2026-07-11 in the full-depth QUEUE rewrite; the removal decision itself was
made during the Round-3 gameplay-set curation on or before that date). **The reason, recovered 2026-07-21
because only the bare outcome had survived (this is Protocol 50 (a-date)'s flagship cautionary case — a
well-made decision whose reasoning evaporated): an achievements tracker FIGHTS THE FICTION.** It is a
scoreboard _about_ the player, sitting outside the world, whereas RobCo is trying to _be_ the terminal. Keep
this reasoning attached to the decision — it is exactly what distinguishes achievements from the New Vegas
Challenges open question below, which the same reasoning argues _for_ rather than against.

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

# Unversioned — the standing rule (the versionless drawer)

_This section is the home of a standing queue convention, and currently of two genuinely-unversioned items —
each carrying its own explicit earn-condition, which is the drawer being used correctly (not a vague pile)._

**THE RULE — nothing gets recorded without either a home or an explicit stated condition that would earn it
one.** A version/section IS a home; so is being bound to a named item. When an entry has neither yet, it MUST
carry an explicit reason it has no version AND the concrete condition that would earn it a slot. "Parked",
"someday", or "revisit later" with no stated condition is NOT acceptable — that is the vague drawer this rule
exists to forbid. The rule is mirrored into **Protocol 50** (which governs what gets written to the queue) so
it survives any future restructure of this file.

### ⬜ OPEN QUESTION — New Vegas CHALLENGES (raised 2026-07-21; do NOT resolve without a wiki write-up)

**Who raised it and why it's weighted.** The owner's **brother** — the project's second real user and, per
standing note, a **maximum-priority audience**. That alone earns it a recorded slot.

**Explicitly NOT covered by the achievements rule-out above — they are different proposals wearing the same
coat.** Achievements are **platform-level, meta, outside the fiction** (a scoreboard _about_ the player). New
Vegas **Challenges** are an **in-game system that lives inside the Pip-Boy itself, with in-game rewards** — a
system _inside the machine_. The recorded reason for cutting achievements ("a scoreboard about the player
fights the fiction") therefore **argues FOR Challenges, not against them**: a system inside the machine _is_
the fiction rather than commentary on it.

**⚠ Do NOT assert what Challenges actually track or reward.** The brother believes they reward perks; that is
**unverified**. Protocol 3 governs — Fallout data comes from **`fallout.wiki` only**, the AI is a typist not
an authority. **A wiki-sourced write-up of what Challenges genuinely track and reward is owed BEFORE the owner
decides**, so he decides against real detail rather than a summary of a recollection.

**Earn-condition (why it sits in the drawer, not a version).** It has no version because the owner has made no
in/out call yet. It earns a slot when: **(1)** a `fallout.wiki`-sourced write-up of the real Challenges
mechanics exists, then **(2)** the owner decides in or out. **If IN → it joins the 2.9.0 gameplay set. If OUT
→ it moves to "Closed / off the board" with its reason.** Until then it stays here, correctly unversioned.

**The rule working, as a worked example.** The drawer was empty on 2026-07-21 because the two items that used
to live here both carried explicit earn-conditions, which is exactly why they could be placed in minutes — and
why this new item, carrying its own earn-condition, is the drawer being _used correctly_, not a gap:

- **CSS cascade cleanup** (`@layer` refactor) → **2.9.0**, attached to the UI-consistency audit — its stated
  condition ("a pass already opening the cascade") was met there.
- **Wire manual inventory changes into the event log** → **2.9.0**, bound to the inventory-panel rebuild +
  Terminal Record consolidation — its stated condition ("a pass that establishes native no-AI logging") was
  met there.

### T. ⬜ Autonomous triggers / scheduled loops — opt-in, capped, owner-controlled (PARKED, design-intent only; owner, 2026-07-24)

**What.** Give RobCo the one "loop-engineering" ingredient it lacks (the loop-engineering article, 2026-07-21;
and the G-review "you are the cron job / no completion event" finding): a way for work to **START without the
owner's message** — a **schedule (clock)** or an **event** — so recurring chores run on their own instead of
waiting for a "yo."

**Why.** Reduce the owner's babysitting of routine maintenance; let his limited attention + budget go to
**decisions, not busywork.** Owner's framing, verbatim: _"just for making things easier on me sometimes — we
wouldn't do it all the time."_

**Scope + the guardrails that make it safe (LOAD-BEARING — the whole reason it's OK to build later):**

- **OPT-IN per chore**, never blanket autonomy.
- **SAFE / report / prep tasks ONLY by default** — e.g. an overnight health check (run the full gate, report
  only if red), museum regen + the post-sync ritual (archive sync), queue-drift / stale-doc flagging,
  refreshing the phone queue view (**L**) each morning, a "session finished" notification. **⛔ Consequential
  actions (ship, deploy, delete, design/roadmap decisions) STILL require the owner's explicit go** — the
  trigger does the legwork and PREPARES; the owner approves anything that matters. This preserves the same
  player-control / owner-approval principle the rest of the project already runs on.
- **CAPPED** — a spend limit, a single scheduled window, and a max-iteration cap, so it can never burn the
  budget (the article's own "economics" caveat — and the exact reason the owner is pausing right now).

**Feasibility (honest).** This environment already has a scheduling mechanism (a `schedule` skill /
scheduled-tasks), so this is **buildable, not hypothetical.** ⚠ Real constraints to record: it only fires when
the owner's machine (the **Ally**) is **ON**; it **consumes usage** (why the cap + selectivity matter); and an
always-on runner ties to the **deferred spare-laptop idea** (the G-review owner-decision).

**⭐ OVERLAP WITH THE CONTROL-PLANE PROGRAM — read this before starting either (2026-07-27).** T and
**CP2 stage 4** (scheduled reconciliation + notifications) are the same machinery seen from two ends: T wants
chores to START on a clock; CP2 wants a completion event and a periodic reconcile. **CP1's spikes cover T's
own feasibility questions directly** — the scheduled-task-across-sleep probe answers "does it fire when the
Ally sleeps?", and the phone-notification probe answers "does the owner actually hear about it?". So **T
should not be built independently**: whichever lands first builds the mechanism, the other extends it
(Protocol 22). T's guardrails — opt-in per chore, safe/report/prep tasks only, consequential actions still
need the owner's explicit go, and a hard cap — carry over to CP2 stage 4 unchanged.

**Earn-condition / status (why it sits in the drawer).** It has no version because it is **opt-in,
activate-on-demand infrastructure**, not a release feature — it may never "ship" as a version; it gets turned
on **selectively, per-chore, if/when the owner wants it.** The concrete condition to start ANY of it: **an
explicit owner go for a specific chore**, with budget/subscription headroom. **PARKED — never start without
that explicit go; NOT now (budget + subscription pausing).**

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
- **Consolidating the ~50 device-preference keys into one master key** — ruled out, now **double** (owner,
  verbatim: _"double ruled out now"_).
  - **Reason 1 — blast radius (owner, 2026-07-18).** One master key **increases blast radius on a bad write**;
    the spread-out keys are the safer design.
  - **Reason 2 — the write race (reinforcement on review, 2026-07-21).** A master key forces
    **read-modify-write**: to change one setting you read the whole blob, modify it, and write the whole blob
    back. If two things do that concurrently — two tabs, an async handler, a cloud sync completing mid-edit —
    the second write silently erases the first one's change. **That race does not exist today**, because
    independent keys write independently; consolidating would **introduce** a lost-update bug into something
    that currently cannot have one. This is a distinct, dated reinforcement, not part of the original ruling —
    and it is stronger: blast radius is a risk trade someone can argue is acceptable; the race is a
    correctness bug.
  - **The middle option (grouping into CATEGORIES) does NOT help — recorded so it isn't re-proposed.** It
    reintroduces the write race at category granularity, makes blast radius "all your audio settings" instead
    of one key, and adds a mapping layer where every new setting needs a category decision that can be got
    wrong and can drift. And the main _benefit_ of consolidation is **already had without it**: the
    `AudioSettings` cache object gives the read-once win in memory, and export/enumerate needs only a list of
    known keys in code — not merged storage.
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
(the Unversioned section states this rule in full; Protocol 50 mirrors it so it survives a restructure).
**Every recorded decision also carries its date, and a later reinforcement carries its OWN date rather than
being merged into the original** (Protocol 50 (a-date)) — dates are derived from git / the changelog / the
actual event, never from a session's felt sense of time, because a continuously-running Dispatch session's
conversation position is fully decoupled from wall-clock._
