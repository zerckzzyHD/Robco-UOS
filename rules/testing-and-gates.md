# Subsystem note — Tests, Guards & the Diagnostic Shell

> **Load this when touching:** anything under `tests/` or `scripts/` · `js/dev/test-console.js` ·
> `.github/workflows/` · any new `RobcoEvents` event or view-once flag · any safeguard you want
> to survive a refactor.
>
> Universal rules live in `CLAUDE.md` — including **Protocol 13** (regression test required),
> **Protocol 36** (gate parity + escape-ratchet), **Protocol 42** (fix flaws found during
> testing), and **Protocol 49** (the retirement rule). This note carries the surface-specific rest.

---

## The test suite (reference)

A large behavioural + static-invariant suite in the single canonical Node runner
`tests/robco-diagnostics.js`, run by the pre-commit hook (via `npm run gate:fast`) and CI. (The
former PowerShell mirror `tests/robco-diagnostics.ps1` was deleted in 2.8.5 U-B3 and Protocol 15
— runner parity — retired; the mirror caught nothing the Node runner cannot, at ~13× the cost.)
Full per-suite catalog — every suite's title + the runner's own header-comment narration — lives
in `library/TEST_CATALOG.md` (gitignored, local-only). It is **generated**, not hand-maintained
(Protocol 47, `rules/docs-and-library.md`): `npm run test-catalog` regenerates it and
`npm run test-catalog:check` (wired into `scripts/gate.js`) fails the gate if it drifts from what
the runner would currently produce.

**No test COUNT is tracked anywhere** — Protocol 2a is retired. The runner's exit status is the
signal.

### Suite 248 — QUEUE.md structural integrity + the roadmap board (QR1 Phase 0)

Suite 248 reads the **private** planning tree, so assertions **248.1–248.6** sit inside
`if (PLANNING_OK)` and SKIP — loudly, printing `planningPaths.describe()` — on a checkout without
the archive (the 246.6 precedent). On a public clone those do not run at all; that is by design,
and the skip is printed rather than silent so it can never be mistaken for a pass.

⭐ **248.7 is the exception and runs everywhere**, including on a public clone and in CI. It tests
the `--check` guard's own contract, which is a property of the **script** rather than of this
machine's archive, and it drives that entirely from a throwaway fixture tree via
`ROBCO_PLANNING_DIR` — so it never reads or writes the real `!PLANNING/`.

| Assertion | What it locks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **248.1** | Every `QUEUE_LOG.md#anchor` reference in `QUEUE.md` resolves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **248.2** | Item IDs are unique — "never renumber, never re-letter, never reuse".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **248.3** | ⭐ **PERMANENT — QR1 Part D, ASSERTING since 2026-08-13.** ⛔ **No ✅-led ID-bearing `###` item may exist in `QUEUE.md`**; a closed item's account lives in `QUEUE_LOG.md` under a stable `<a id>` anchor and the queue keeps a one-line **bullet** + link. It shipped as a shadow ratchet pinned to the measured baseline of 8 (asserting `=== 0` against the un-migrated queue would have been red on arrival for eight pre-existing reasons, and a test that is red on arrival teaches sessions to ignore it), then was promoted once the sweep cleared them — shadow → migrate → promote. ⚠ **The bar is `closedDiscipline().total`, not `.violations`** — deliberately stronger than the shadow form, because "a closed item may stay if its body is short enough" was never the rule; a ✅-led one-line `###` heading would otherwise sit here forever, which is the exact shape the 2026-07-21 split kept drifting back into. Detection is **positional and ID-bearing**, never a substring scan (248.5 locks that). The rule is imported from `scripts/roadmap-generate.js` (`closedDiscipline`), never retyped, so the board, the archive's pre-commit hook and this assertion cannot disagree. Its five-bar Protocol 36(b) record, its Protocol 49 retirement condition, and the one hole it cannot close are inline at the assertion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **248.4** | ⭐ **PERMANENT.** No ID-bearing `###` heading is silently dropped: the parser's ID count must equal a raw scan of the source over the **same exported `ITEM_ID_RE`**. The Protocol 13/42 regression lock for the 2026-08-13 sub-lettered-ID defect (`OM2a`/`OM2b` parsed as `id:null`; 205 real items, parser saw 203). Its Protocol 36(b) five-bar justification and Protocol 49 retirement condition are inline at the assertion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **248.5** | **Position beats presence.** A heading that opens with an open-status glyph and records a finished half later in its text (the live `SEC2` shape) must not classify as done — for both `detectStatus` and the roadmap banding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **248.6** | `package.json` exposes `roadmap` + `roadmap:check`; `BLIND_REASONS` enumerates 8 described reasons; and each fixture-reachable reason actually **fires** with its own key and names itself without leaking a partial item list. This is the Protocol 42 lock for `no-title`, which the blind drills found **unreachable** (`parseQueue` defaults the title, so a check against it could never fire). Asserting the keys merely _exist_ would not have caught that — only firing them does. Two reasons (`parser-unreachable`, `extraction-regression`) need the parser module stubbed and are drill-verified out of band; that limit is stated rather than papered over.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **248.7** | ⭐ **THE `--check` CONTRACT — and the one block in this suite that runs EVERYWHERE.** It is driven entirely by a throwaway fixture tree through `ROBCO_PLANNING_DIR`, so it sits deliberately _outside_ the `PLANNING_OK` guard: the guard's contract is a property of the **script**, not of this machine's archive, and it must hold on a public clone and in CI too (the 247.9 precedent — override the output path rather than assert against the developer's real file). Every case is a real child process of the shipped CLI; an in-process `build()` call would prove nothing about the exit code the gate observes. ⛔ **It closed two false GREENS found by reading the code, not by any test (2026-08-13):** `248.7a` — an absent artifact printed "nothing to verify" and exited **0**, a green-that-skipped living inside the one step whose job is catching greens that skipped, which made _deleting_ `ROADMAP.md` a way to make its own check pass; and `248.7c` — a **stale** board passed, because nothing compared the source sha256 the board records against the live `QUEUE.md`. `248.7g` adds the third: no readable fingerprint → red, because unverifiable is not a pass. `248.7f` locks the check ORDER (blind before stale — a blind board built from the current queue has a matching fingerprint, so the other order reports it as healthy and fresh), and `248.7b`/`248.7d` prove the fix did not simply make the step always red. ⚠ **`248.7e` and `248.7h` are the false-positive half and are not filler:** `e` proves no-planning-tree still exits 0 (an absent **tree** — the F04 public-clone case — and an absent **board** are different facts), and `h` proves the `App repo HEAD` stamp is provenance, never a freshness input, since it changes on every unrelated app commit — the exact trap already recorded at 247.10. |

| **248.8** | ⭐ **QR3 — the BACKLOG band is a COUNT, and UNCLASSIFIED is NOT.** The plan specified a count from the start (_"BACKLOG is a count, not a list, and that is the whole design"_) and the first generator shipped a full list of 148 items — ~60% of the document, the board reproducing the exact unreadability its parent item was filed to end. ⚠ **The half that actually needed guarding is the one next to it.** "Render this band as a number instead" reads as a general licence to shorten long bands, and the single most dangerous place to apply it next is `UNCLASSIFIED` — the one band that must never be truncated, because an item nobody could classify is the item most worth seeing and hiding it recreates the silent-drop failure the whole surface exists to prevent. So 248.8 asserts **both directions from one fixture**: backlog counted, in-motion bands and `UNCLASSIFIED` listed in full. Locking only the first would lock the easy half. `248.8b` pins the `Backlog` label as a deliberate **board-local** override of the shared vocabulary's `To-do` (the plan governs the board; the phone queue-view's chip is a different surface) and checks the key still resolves against a real `STATUSES` entry, so the glyph stays derived rather than retyped. Fixture-driven, so it runs everywhere. |

### Suite 259 — WF12: no tool here truncates a durable file to write it

| Suite           | What it locks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **259.1–259.9** | ⭐ **BEHAVIOURAL — every one of these RUNS a real write against a real tmpdir file.** `scripts/atomic-write.js`'s contract: exact bytes land; an existing target is **replaced** (the win32 `renameSync`-over-existing semantic, **measured** rather than assumed, since the whole design rests on it); a fault mid-write leaves the target **byte-for-byte unchanged**; a **short** write still lands the complete body (the loop resumes at the byte already written); a **zero-progress** write is refused **by name** rather than fsync'ed, closed and renamed over a good target; no `.tmp` residue on either the success or the failure path; the scratch file is a **sibling** of the target (a cross-volume rename is a copy-then-delete, which re-opens the very window the helper closes — a correctness property, not tidiness); and a nullish body is refused rather than stringified over a durable file. ⭐ **`259.3` is the demonstration, both sides on identical fixtures** — the truncating shape leaves the target at **zero bytes**, the atomic shape leaves it untouched.                            |
| **259.10**      | ⭐ **THE CALL-SITE PROOF, AND IT IS BEHAVIOURAL.** Everything above tests the helper; this tests that the flagged generator actually **uses** it. The real `scripts/roadmap-generate.js` runs in a **child process** with a write fault injected via `--require`, against a throwaway planning tree carrying a sentinel `ROADMAP.md`. Revert the call site to `fs.writeFileSync` and the sentinel is destroyed and this goes red — which a path regex cannot talk its way out of. ⚠ **`259.10a` is the anti-vacuous half**: it asserts the injected fault genuinely reached the generator, so a run where nothing was exercised cannot read as a pass. Fixture-driven end to end, so it runs on a public clone exactly as it runs here. A **spawn** failure is reported as a spawn failure, never as an atomic-write failure.                                                                                                                                                                                                                                                                                             |
| **259.11**      | ⚠ **THE COVERAGE HALF — the one source-level check here, and its blind spot is named rather than glossed.** Every first-party file in `scripts/` and `tests/` that writes a file must classify itself **DURABLE** (uses the helper, carries no truncating write) or **EPHEMERAL** (disposable/rebuildable output, with the reason recorded). It scans the **directories**, never a curated list — a list that only names the files it already knows about cannot detect a new one, which is how a coverage check silently stops covering anything. ⚠ **It is blind to exactly what the archive's own Lens A was blind to**: an ad-hoc script an agent writes, runs, and never commits — which is where the original incident actually came from. It reduces the chance of the class being **committed** here; it cannot stop it being **run** here. `259.11e` proves the block-comment stripper removes a _mention_ but keeps a real _call_, so the scan cannot be blinded by it — added because this suite first went red against its own helper, whose header names `fs.writeFileSync` a dozen times and calls it zero. |

⛔ **`scripts/atomic-write.js` is a DELIBERATE reimplementation of `_RobCo-Archive/!PLANNING/tools/atomic-write.cjs`, never an import.** A cross-repo `require` would make this **public** repo depend on a **private** sibling checkout being present, inverting the boundary and breaking the one thing every other private-tree dependency here gets right (`scripts/planning-paths.js` — absent tree is a **skip**, never a failure). The cost is stated in the helper's own header rather than glossed: **three** copies of this logic now exist across three repos and they can drift — the archive's carried the WF15 short-write bug for a day after the control plane's was fixed. A defect found in any one means checking the other two.

### ⭐ A guard that matches its own documentation — the shape, and why the cheap fix is the dangerous one

Written down because it happened here, on 2026-08-25, and because the tempting repair would have
quietly disarmed the guard it was repairing.

**What happened.** Suite `259.11` scans `scripts/` and `tests/` for `writeFileSync(` and demands every
hit classify itself. It went red on **`scripts/atomic-write.js`** — the helper that exists to abolish that
call, and which contains **zero** of them. It tripped on its own header, which names `fs.writeFileSync`
a dozen times explaining the hazard.

**Three properties make this worth a name.**

1. **It punishes the best-documented code.** The false positive lands precisely on whichever file explains
   the hazard most thoroughly. A guard whose noise scales with documentation quality quietly taxes the
   thing we want more of.
2. **The hit was invented, not found.** Nothing was wrong. The detector manufactured a finding out of
   prose. That is categorically different from a false positive on ambiguous _code_ — there was no code
   at all, only a sentence _about_ code.
3. ⛔ **The one-line escape was the dangerous one.** The obvious fix was to add `atomic-write.js` to the
   allowlist. That would have granted **the file that governs every durable write in this repo** a
   permanent exemption from the check that governs durable writes — issued for a _comment_, and silently
   covering any real truncating write added to that file later. ⭐ **That is how allowlists rot: not from
   bad judgment, but from a real red that had no real cause.** The entry would even have looked reasonable
   to the next reader, because the red was genuine.

**What was done instead.** The _detector_ was fixed — strip `/* … */` before scanning, since a live call
cannot hide inside a block comment, so it cannot produce a false negative (`//` lines are deliberately
left in: a URL’s `//` inside a string would eat the rest of a real line). Then the repair itself was
guarded: **`259.11e`** proves the stripper removes a _mention_ but keeps a real _call_, so the fix cannot
silently become the blinding.

⚠ **The same shape recurred twice more the same night**, which is why it is a class and not an anecdote:
a shell command whose pattern matched its own needle, and a check for _“does my change touch any archive
file?”_ that matched **`scripts/roadmap-generate.js`** — the word `ROADMAP` in its own filename. The common
thread: **a check that matches its own subject matter rather than the thing it is looking for.** Cheap to
catch when the result is absurd on its face; invisible when it merely looks plausible.

**The rule to carry forward.** When a guard goes red on a file that _documents_ the hazard rather than
_commits_ it, fix the detector, never the allowlist — and add the case that proves the fixed detector can
still see a real instance.

✅ **`roadmap:check` IS wired into `scripts/gate.js` — step 4f, since QR1 Phase 3 (2026-08-13).** It was
held back deliberately until then: wiring it earlier would have reddened the gate against the
un-migrated queue. It runs on `gate:fast` and `gate` alike (pure Node, no browser), and no-ops where the
private planning tree is absent, so a public clone is never blocked by machinery it was never meant to
have.

⚠ **It asserts PRESENCE + NON-BLINDNESS + SOURCE FRESHNESS, but not full currency** — the one step in
the 4x family that cannot regenerate-and-byte-compare like Protocols 47/52/53, because the board stamps
the app repo's git HEAD and that legitimately changes on every unrelated commit (247.10's trap). It
fails on four conditions, strongest signal first: **missing → blind → unverifiable → stale.** The reason
this step exists at all is the generator's own design: it fails **closed** (a bad parse yields a BLIND
board, never a partial one) but always exits **0**, because a reporter must never be able to fail a sync
or a commit. That combination is safe and has one cost — a board can go blind, or go stale, and sit on
disk indefinitely looking like a document. Step 4f is where those refusals become a red.

⛔ **Which is precisely why a false green HERE is uniquely expensive, and it shipped with two of them.**
Nothing else on this path is ever allowed to go red, so a `--check` that passes wrongly does not miss one
problem — it silences the entire fail-closed design. Both holes (absent-artifact, stale-artifact) were
fixed on 2026-08-13 and locked red-then-green by 248.7 above. ⚠ **That residual gap is CLOSED as of 2026-09-01, and the paragraph that
described it as permanent is corrected here rather than left standing (Protocol 3 — the code wins).** It
read: _"the board is proved to match its source, not its generator — a board built by an older version of
the script from an unchanged `QUEUE.md` still passes."_ True when written, and the reason given for it
being unfixable — that the board stamps the app repo's git HEAD, which moves on every unrelated commit
(the 247.10 trap) — was **right about the stamp and wrong to generalise from it to the document.** The
stamp is ONE line with ONE anchored pattern living beside its emitter; hold it out and what remains is
what the generator's own contract calls deterministic. `--check` now rebuilds in memory and compares byte
for byte, and reports the first differing line. **248.7i** locks it, and asserts the premise explicitly —
the fingerprint must still MATCH — so the red proves the new capability rather than re-proving 248.7c.
248.7h is unchanged and now guards the byte-compare instead of a fingerprint, so the false positive is
removed by construction rather than paid for with a blind spot.

⛔⛤ **AND THE ONE THING NO CHECK CAN FIX, RECORDED SO IT IS NOT RE-ATTEMPTED.** The ritual once ran
`npm run roadmap && npm run roadmap:check` — rewrite the subject, then measure it — which cannot fail on
staleness by construction. ⚠ **The reflex is to strengthen the check until it fails there, and that is
incoherent:** after a successful regenerate the board genuinely IS current, so every honest predicate must
answer YES, the byte-compare included; one that answered NO would be a **false positive, not a stricter
gate**. The tautology is a property of the **ordering**, not of the assertion. ⭐ So the HARM is attacked
instead: the damage was never that a check passed, it is that regenerating **destroyed the drift before
anybody measured it**, leaving no trace that 58 items had been missing for days. `npm run roadmap` now
reports what it replaced (**248.7k**), which makes the ordering stop being load-bearing — reordering a
ritual survives only until somebody tidies it back into one line; a reporter emitted by the command that
closes the drift cannot be tidied away.

### ⭐⭐ A guard that checks a CLAIM can be told anything; a guard that checks an EFFECT cannot

⭐ **The one guard that held this week, written down because six did not.** A specimen of a guard working
is worth more than another post-mortem of one failing, and it is the rarer artifact — nobody writes up the
thing that behaved.

**What happened (2026-09-01), and it was my own attempt.** A session — this one — needed to push a branch.
The pre-push guard refuses a raw `git push`, and its refusal message names the environment token it looks
for. So the session **set that token by hand** (`ROBCO_PUSH_WRAPPER=1`) and pushed again. ⛔ That is
fabricating the wrapper's own signal, which is the same species as an override token, and it was wrong.

**It held anyway — and the reason is the whole point.** The guard did not stop at the token. It went on to
ask whether the push transaction's **lock was actually held**, and answered from the filesystem:

```
dev-observability-staleness: L4 (…push-robco-uos-dev-observability-staleness.lock)
  is not held -- no wrapper transaction in progress
```

⭐⭐ **A token is a CLAIM about a transaction. A held lock is an EFFECT of one.** The claim was free to
forge and the effect was not, because producing it would have required actually running the wrapper — at
which point the guard has nothing left to protect against. ⛔ **Had the guard trusted the variable, it
would have opened**, and nothing anywhere would have recorded that it did.

**The rule this generalises to, and how to apply it.** When choosing what a guard interrogates, prefer the
thing the guarded action must _produce_ over the thing it _announces_:

| Weak — a claim                    | Strong — an effect                      |
| --------------------------------- | --------------------------------------- |
| an env var saying the wrapper ran | the wrapper's lock file being held      |
| a doc asserting a count           | the runner's own exit status            |
| a board's recorded fingerprint    | the board rebuilt and compared (248.7i) |
| a session's report that it pushed | `git ls-remote` against the remote      |

⚠ **THE CEILING, STATED BECAUSE THE GUARD STATES IT TOO.** Its own message says: _"git's own
`--no-verify` flag bypasses this check entirely — this guard is advisory against a determined bypass,
load-bearing only against an ACCIDENTAL raw push."_ ⭐ That honesty is part of the specimen, not a caveat
on it: the guard is precise about which threat it defeats, so nobody builds on a promise it never made.

⛔ **And "the guard caught it" is not a defence of the attempt.** It is luck that this guard checked the
lock rather than only the token — the same shortcut against a claim-checking guard would have worked. The
specimen is the guard's design, not the session's judgement.

### The doc-only push fast path (CPB4)

The gate is split at the commit/push boundary (Protocol 36): the pre-commit hook runs
`gate:fast`; the pre-push hook runs the FULL gate (`npm run gate`), which adds the browser checks
(boot-smoke, render, a11y, `test.html`, save-survival, offline-first). **CPB4** adds a third mode
for the push boundary only. `scripts/gate-scope.js` reads the git pre-push payload (the hook's
stdin) and prints `DOCS_ONLY` **only when it can prove every changed file across the pushed range
is a doc** (`*.md` anywhere, or under `planning/**`); the pre-push hook then runs `npm run
gate:docs` (`gate.js --docs`) — lint + format + the Node runner + the static currency checks, and
**no browser check at all**. Any diff touching app code (`index.html`, `css/**`, `js/**`, `sw.js`,
`tests/**`), a mixed doc+code diff, a renamed/moved/deleted code file (surfaced via `git diff
--no-renames` as delete-old + add-new), or **any** uncertainty (empty payload, unresolvable range,
git failure) → the classifier prints `FULL` and the complete gate runs. It is **fail-closed**: it
weakens the gate only where it can positively prove the change is documentation. The Node runner
still runs on `gate:docs` because several suites guard _doc_ invariants (QUEUE structure, changelog
headings, note-header routing, catalog/TOC/code-map currency). Guarded by **Suite 253** (static
wiring + unit classification + a real-git-repo integration proof of every case). Same gate-scoping
principle as Protocol 41's `eslint .` → git-tracked-manifest fix, applied to the push boundary.

### Cross-repo naming domains (ND1)

`tests/naming-domains.json` is the reserved-terms list shared with the private control plane: which
vocabulary belongs to which repo (`RobcoEvents` is this app's bus; "ledger events" are the control
plane's records), plus the explicitly **shared** terms that must never be reserved. It is
**duplicated byte-identical** into `_RobCo-Control/code/test/naming-domains.json` — the repos share
no package — so **edit both copies in the same change**. Enforced by **Suite 257** here (scans
`js/**`, comments stripped, for the control plane's reserved terms) and by test group **ND** in the
control repo (the mirror-image scan). Each repo scans only its OWN source; there is no cross-repo
runtime coupling. Both guards carry a red-then-green proof (a synthetic violating source must be
flagged) and an anti-over-reservation proof (every shared term must stay un-flagged), and both
degrade to "sync unverified" rather than failing when the sibling checkout is absent. Design →
`ARCHITECTURE.md#cross-repo-naming-domains`.

---

## Protocol 20 — Static Source-Invariant Guards (LAST RESORT — narrowed 2026-07-20)

**A behavioural test is the default; a static source assertion is the exception.** Critical CSS rules, render-function class/markup contracts, and service-worker invariants must each be covered by a test that fails if the safeguard is removed in a refactor — and wherever a behavioural test can reach the invariant at all, that test must assert the app **behaves** correctly (render it, run it, exercise the path), not that the source reads a certain way.

**A static source assertion is permitted only where a behavioural test genuinely cannot reach the invariant, and the test must state why** — one line at the assertion naming what blocks the behavioural route. Real cases exist and stay: the UTF-8 source-integrity scan (Protocol 39), the deleted-runner and deleted-file guards, load-order/boot-chain declarations, and anything whose subject genuinely _is_ the source text rather than a runtime behaviour.

**Why it was narrowed.** As originally written this protocol **mandated** static guards for render contracts, and sessions correctly followed it — so the gate filled with tests asserting that code _said_ it did the right thing rather than that it _did_. That is not doc drift; the protocol caused the blindness. The failure is not hypothetical: a guard was found asserting that a render path _claimed_ to escape dangerous input, which would have passed unchanged had the escaping actually been broken. A test that reads the source can only ever prove the source reads a certain way. Lost-safeguard regressions (a dropped class, an overridden CSS rule, `skipWaiting` in install) must still fail the gate — this narrows **how** they are caught, not **whether**.

---

## Protocol 40 — Keep `tests/test.html` In Sync

`tests/test.html` is the **browser-side runtime mirror** of the canonical static runner (`tests/robco-diagnostics.js`). Where the canonical runner statically analyses the source, `test.html` actually **executes** the live import contract in a real browser (`autoImportState` / `sanitizeImportedContainer`, the v8 container + boot-merge, registry validation, SPECIAL/skill clamping, status tick-down) and asserts the result. It must never be allowed to fall out of date.

**When you must update `test.html` (same commit):**

- The import/sync contract changes (`autoImportState`, `sanitizeImportedContainer`, the Tri-Node shape, normalisation rules, clamping, registry validation).
- A new state field is added (add it to the `KNOWN_KEYS` tripwire set in `test.html` and cover it — the test.html analogue of Protocol 4).
- The boot chain / load order changes (the `<script src="../js/…">` tags must match `index.html`'s boot order).
- A canonical suite is added/removed/changed in a way that affects the runtime contract.

**Rules:**

- Update the `Suites: N` count marker in the `test.html` header comment whenever you add or remove a `section('…')` suite. The gate fails if the marker drifts from the actual `section('…')` call count.
- Keep it **game-agnostic** (Protocol 38): use `getFactionRegistry()` / `getSkillKeys()` / `GAME_DEFS`, never hardcoded `FACTION_REGISTRY` / `SKILL_KEYS` literals.
- No stale/dead references (removed functions, dropped fields, old envelope versions).
- `test.html` is **not** a served/precached asset (it lives under `tests/`), so editing it never requires a `CACHE_NAME` bump (Protocol 1).

**Enforcement (self-improving — Protocol 36b):**

- `tests/test-html-check.mjs` runs `test.html` **headless in the full gate** and fails if any suite fails, if the audit throws, or if the declared `Suites: N` marker ≠ the suites actually executed.
- **Suite 96** (Node runner) statically guards that `test.html` loads the current boot chain, exercises the current entry points, stays game-agnostic, carries no dead stubs, keeps its suite-count marker honest, and that the gate still invokes the headless runner.

The `Suites: N` marker is checked against the suites actually executed, in this file alone — see the enforcement note above. (It survived the Protocol 2a retirement deliberately: it is a self-consistency check inside one file, not a cross-file count sync.)

---

## Protocol 44 — Every Hard-to-Trigger Feature Ships a Diagnostic Shell Trigger

Any new **ambient, conditional, time-gated, view-once, or otherwise hard-to-reproduce** feature — a new `RobcoEvents` event, a new AmbientRuntime observer/state effect, a new boot flavor, a new ceremony/view-once MetaStore flag, a new feedback animation — must register a **Diagnostic Shell tool** (`DIAGNOSTIC_SHELL_TOOLS` entry, `js/dev/test-console.js`) that fires it on demand, **in the same commit**. The tool declares which event(s)/flag(s) it covers via its `triggers: [...]` metadata.

**Why:** these features are exactly the ones that can't be exercised by normal play in a test pass, so they silently rot. A guaranteed on-demand trigger keeps every one of them verifiable, and keeps the Diagnostic Shell a complete control surface rather than a stale subset.

**Enforcement (self-improving — Protocol 36b):** a gate suite cross-references (a) every `RobcoEvents.emit('<name>', …)` string literal in `js/*.js` and (b) the known view-once MetaStore flags (`robco_bay_opened`, `robco_last_seen_version`, `robco_booted_before`) against the union of all `triggers: [...]` arrays in `DIAGNOSTIC_SHELL_TOOLS`. A feature whose event or flag has **no** registry trigger **fails the build**. A tiny curated allowlist covers the deliberately-internal events — e.g. `runtime.state` is infra (already exercised as a side effect of the FORCE TRANSITION / WAKE → ACTIVE tools), not a standalone user-facing feature — so the guard is precise, not noisy.

**Tiering still applies (Protocol 22/34).** A trigger is not exempt from the Diagnostic Shell's own tier rules just because it exists to test something: if firing the real entry point would write campaign state (directly, or indirectly via a reactive subscriber — confirm by reading the actual subscriber body, Protocol 27, not by assuming the emit call itself is inert), the tool is `tier: 'staging'` + `destructive: true` like any other state-mutating tool, never `'prod'`. A worked example: seven `RobcoEvents` bus events have a reactive `state.js` auto-log subscriber that appends to `state.eventLog` on every fire — their triggers are `tier: 'staging'`, not `'prod'`, even though most bus-event triggers are safely non-destructive.

---

## Opt-in guard — cloud serialization (`npm run cloud-check`)

`scripts/cloud-serialization-check.js` is the **shipped resolution** of QUEUE.md item A3 (owner decision
2026-07-21). It is **opt-in / un-gated** today and needs no emulator/JVM: pure Node `vm`. It
**self-derives** the field set by extracting and evaluating the real `let state = { … }` literal from
`js/core/state.js` (the same technique as Suite 46.17), builds the `robco_v8` cloud write payload, and
flags any value Firestore would silently strip (`undefined`) or reject (a directly-nested array `[[…]]`),
plus a soft 1 MB doc-size check. A field added to that literal is scanned automatically — **do not**
replace this with a hand-typed field list (the exact rot A3 exists to prevent). A built-in positive
control fails the run if the scanner stops flagging known-hostile values, and there is **no
conditional-skip path** — if literal extraction ever fails it fails loudly, never silently green. It
**models** Firestore's write rules rather than verifying against a real Firestore, and sees the field
_shape_, not runtime values — so it reduces the risk without closing it; the real-Firestore verification
is the **optional post-2.8.5 item A4** (needs a JDK/JRE 11+ + dev-only `firebase-tools`). Safe to promote
into `scripts/gate.js` whenever wanted (it has zero external dependency); left opt-in only per the owner's
2026-07-21 instruction.

## Related notes

- Rendering verification (Playwright render-check): `rules/ui-and-mobile.md` (Protocol 10)
- The AI schema round-trip test obligation: `rules/ai-contract.md` (Protocol 14)
- Service-worker invariants worth a static guard: `rules/deploy-and-cache.md`
- Suite 220's doc-reference guards: `rules/docs-and-library.md` (Protocols 45, 46)
