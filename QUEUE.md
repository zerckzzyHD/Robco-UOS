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

**Last updated: 2026-07-29 (later still)** — **RB4 and RB5 expanded with GPT's detailed design, and a new
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
- **⭐ THE TOP PRIORITY IS NOW THE WORKFLOW / CONTROL PLANE (owner's explicit call, 2026-07-27)** — the
  program at **CP1-CP5**, directly below. The honest framing, and the reason it outranks feature work: the
  project's real bottleneck was never a missing agentic technique, it is the **control plane** — no completion
  event, no cancel, ghost/duplicate launches, no durable job ledger, no usage warning until a session hits the
  cap mid-run. **⚠ None of it is built.** CP1 (the empirical spike campaign) exists to prove or KILL the
  hook-based approach before a line of it is written.
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

Three external reviews (Gemini 3.1 Pro, DeepSeek, GPT-5.6 Sol) converged on one reframe: the project built a
strong **flight recorder** (OBSERVE) and a weak **actuator**, and several planned/built items **turn weak
inference into destructive action** — the wrong place to spend the risk budget. The next maturity jump is a
**tiny trusted action kernel**, not more detectors. The working build order is now:

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
   collision GPT correctly identified: the **working tree, the push, and the archive sync**.
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
  it mid-run rather than after.
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

### RB3. ⭐ Mobile-hidden-response detector — G5 (plan-stage)

**What it is.** The supervisor tails Dispatch's own output and flags substantive text that did **not** go
through the messaging tool → Pushover "Dispatch produced a hidden response." Starred because it directly
targets the recurring failure this whole program started from — plain-text-invisible-on-mobile recurred 3+
times in one session before the arc that produced CP1-CP5.

**Done means:** a deliberately-triggered hidden response (text emitted outside the messaging tool) is
detected and produces a phone alert, proven red-then-green, not just reasoned about.

### RB4. ⬜ Custom control-plane MCP — delivery + ack, NOT wake (plan-stage; V1 contract folded in 2026-07-29)

**What it is.** A local MCP server (Cowork already loads MCP servers, so a custom one added to the desktop
config is very likely callable by Dispatch — confirm with a small load-spike, RB4's own first step)
exposing seven V1 tools: `control_get_inbox` / `control_get_job` / `control_get_event` /
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
reads/writes. (b) A prerequisite load-spike — confirm Cowork actually loads a custom local MCP server and
Dispatch can call its tools — comes before any of the seven tools are built; it's RB4's own first step,
not a separate item. Also: GPT's proposed "fixed wake phrase" is **already** the locked `status` trigger
(don't add a second one, and don't reuse `sync` — already spoken for); GPT's "separate acknowledgment
classes" are **largely already** rank 5's incident lifecycle (open/updated/resolved/reopened) —
`control_ack_event` should map onto that existing model, not invent a parallel one.

**Done means:** the load-spike confirms Dispatch can see and call the server's tools; all seven tools
round-trip correctly (including idempotent replay and generation-rejection); no second ledger or parallel
orchestrator is introduced.

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

### HG1. ⬜ Event-bus hardening — `off`/`once`/dedup, listener-error isolation (PULLED FORWARD from the 2.9.0 hardening gate, owner 2026-07-28)

**What it is.** `RobcoEvents` currently has no `off` / `once` / dedup, and a thrown listener handler can block
unrelated handlers from running. Add `off`/`once`/dedup, and isolate each handler so a thrown error in one
never prevents the others in the same event from firing.

**Why it's here and not in 2.9.0.** Surface-independent: nothing about the new OS services changes what
`RobcoEvents` needs to be correct today, and the OS round is about to **widen** its usage — hardening it before
that widening, rather than after, is strictly cheaper. Original bullet (with its original reasoning, kept per
Protocol 50) is still in place under 2.9.0's hardening-gate section, now cross-referenced here.

**Done means:** `off`/`once`/dedup exist and are used where appropriate; a thrown handler is caught and logged
per-handler, never propagating to abort sibling handlers; a regression test proves the isolation (Protocol 13).

### HG2. ⬜ Bootstrap isolation — per-phase boot guards, fatal-vs-degradable (PULLED FORWARD from the 2.9.0 hardening gate, owner 2026-07-28)

**What it is.** ~45 boot-phase calls currently sit under ONE outer `try`/`catch` with zero per-phase isolation.
Add per-phase guards, classify each phase's failure as fatal (boot cannot continue) or degradable (boot
continues, the failure is surfaced), and fail loudly — never silently — in both cases.

**Why it's here and not in 2.9.0.** Same reasoning as HG1: this is debt in the existing boot sequence,
independent of what the new OS services will add to it. Original bullet (with its original reasoning, kept per
Protocol 50) is still in place under 2.9.0's hardening-gate section, now cross-referenced here.

**Done means:** every boot phase runs under its own guard; each phase is classified fatal or degradable; a
degradable failure surfaces to the user (not console-only, echoing the same standard Protocol 24 already sets
for AI state-apply failures); a fatal failure fails loudly with a clear message, never a silent black screen.

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

**⭐ The build order inside this program (P8's own recommendation, adopted 2026-07-27):** **P10** (the nav is
free to change now) → **P11 Stage 0** (`arcs.json` — the one genuinely new data artifact) → the arc spine →
the coverage view → the Visual Web; with **P13 → P14** (security scan-list fix, then the republish) closing
the loop on the live site, and **P5/P6/P7/P9/P12** plus the Fable design polish landing as content passes
alongside.

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
extends. **P10** frees the nav this needs an entry point in.

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
3. **Verify P11's Visual Web includes it.** Once **P11**'s `arcs.json` (Stage 0) exists, confirm the
   control-plane arcs from part 1 are represented in it — the Visual Web claims to be complete-but-navigable
   over the WHOLE corpus, so an arc corpus missing its own most recent chapter would silently break that
   claim.

**Cross-references, not restatements.** Depends on **P8**'s corpus (extends it, Protocol 22) and **P11**
(the arc corpus is P11 Stage 0's direct input — this item's part 1 IS P11 Stage 0 material, filed here
because the trigger is "the museum fell behind the control plane," not "P11 needs more data"). Sits inside
**THE MUSEUM PROGRAM** cluster above and inherits its curation law + lay-audience bar (item **P**) and its
PII/identity discipline (**P13**) — the control-plane material is unusually rich in paths/session ids/the
owner's own working notes, so the same fail-closed visibility rule P11 already specifies applies here
without exception.

**Done means:** the control-plane arcs exist in the corpus as dated entries; a room/placement decision is
made and recorded with its reasoning; and P11's Visual Web (once built) is confirmed to include them.

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
- **Event-bus hardening.** `RobcoEvents` has no `off` / `once` / dedup and swallows listener errors silently.
  Harden it before the OS round widens it; a thrown handler must not prevent unrelated handlers from running.
  **⭐ PULLED FORWARD to the pre-museum band as [HG1] (owner, 2026-07-28) — Protocol 50 (a-date).** This
  reasoning stays here unchanged; the live entry with its own ID and "Done means" is in **"⭐ ALSO
  PRE-MUSEUM"**, directly under CP5.
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
