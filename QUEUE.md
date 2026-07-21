# RobCo U.O.S. — Build Queue

**The one always-current, in-depth view of what's built and what's next.**
This is written for you to read on your phone. It's in execution order, top to bottom. Every item that is still ahead says, in plain English: what it actually is, why it exists, what it touches, what "done" looks like, why it sits where it does, and any hard rule it must never break. Nothing is hidden behind a label — if a bucket contains ten things, you'll see all ten.

Status tags: ✅ shipped · 🔄 in progress · ⏭️ next · ⬜ queued.

_Last rewritten in full: 2026-07-15. Last updated: **2026-07-21** — **the fourth context source became a pointer, Protocol 50's blind spot got named, and the museum got an AI-facing design.** Three related pieces, all under the theme that this project has four sources of truth about itself — the rules, this queue, the memory store, and the `robco-uos` skill — of which the skill was the only one with no drift protection, no tracked source, and a stale live copy. (1) **R9 (below)** ships the fix — and it was itself course-corrected mid-session by the owner's tightening (GPT-5.6 Sol's discipline: a guard must earn its existence through a real, occurred failure at a defined enforcement point, or it should not ship). The first pass over-built: it made the skill a hand-written \_copy_ of the rules and added a bespoke `Suite 243` + a standing nudge to police the copy's drift. The corrected answer is that the skill should be a **pointer, not a copy** — so it can't become a second source of truth — after which both guards were **removed** as unearned (Suite 243 duplicated Suite 220 and only ever red-green'd a synthetic case; the installed-copy nudge guarded a divergence the pointer fix already removes). The one real residual (a pointer naming a deleted file/protocol) is caught for free by folding the skill into the _existing_ Suite 220. **Net new mechanisms: zero.** The owner still has one manual step: re-install the corrected skill via Settings › Capabilities (only a re-install can refresh the read-only installed copy). (2) **Protocol 50 gained subsection (c)** stating that rule 50(a) already covers the conversation ↔ queue case in prose and its enforcement half simply cannot exist (a script can't read a conversation; the riskiest sessions never push) — so no guard is coming for it, on purpose. (3) **P3 (under the museum)** is a design-only queued spec for making the museum an AI-facing resource like the library, guarded by provenance (status derived from a supersession link graph, fail-closed on unknowns, no rejected entry without its why). **Protocol 50 was itself violated hours after shipping** (the DeepSeek roster decision, item G) — recorded plainly, because it's the concrete proof (2) exists for. Prior update: **2026-07-20** — **item F executed — the blind workflow review's four process refreshes.** The standing review prompt (`planning/_standing/WORKFLOW_REVIEW_PROMPT.md`, gitignored, kept current incrementally — folding in ≠ sending) was brought fully current (the museum + its reproducibility sub-program, Protocol 50 + the queue-drift nudge, the trim's remaining stages R5–R7) and gained two audit sections it never had: **§15 — auditing the orchestrator (Dispatch) itself**, and **§16 — the multi-model hand-off and its cost.** Of F's four named subjects, three were already current in the prompt (session-launch discipline / Protocols 8+28, the Protocol 9 reporting standard, copy-paste-block delivery); the fourth (protocol-consolidation as proof the process PRUNES) was strengthened from "U6 only" to the retirement rule + three retirements + R5–R7. Two decisions that had lived only in conversation are now on file per Protocol 50 (see item G): **DeepSeek joins this ONE review as a free, hosted-only THIRD WITNESS — never a gate, never repo-aware — and a committed claim-ledger file** becomes the synthesis artifact. The conversation→queue gap that let those decisions go unrecorded for hours (Protocol 50 shipped the same day) is noted honestly under G: the drift nudge catches memory↔queue drift, not conversation↔queue drift. Prior update: **2026-07-20** — **the governance trim's remaining stages, a museum design gap, and a standing drift problem all got fixed in one pass, triggered by the owner asking why work kept reaching this file late.** Three things landed: (1) **R5-R7**, the staged governance trim's stages 2-4 (convert-prose-to-enforcement, the contentious ratchet-narrowing that needs the owner's call, and the expensive-machinery cuts) — these existed only in Dispatch's memory before now, with one line in R3's own follow-up notes as the only trace in this file; all three are now real tracked items with their reasoning and keep-cases intact. (2) The museum's **rename-permanence gap** (under **P1**) — the in-flight hash-to-path work correctly declined to handle future document renames on its own; this session designed the fix (an extended redirect ledger + a build-time git-diff check, NOT automatic rename detection, which this same repo's own mining pass just proved unreliable at a 22% undercount) and queued it as a soft prerequisite of publication (**P2**), plus a small outstanding `file://` click-test alongside it. (3) **Protocol 50 + R8**, shipped rather than merely queued: a standing rule that plans get written here in the same session they're decided, backed by an automated pre-push nudge (`scripts/queue-drift-check.js`, Suite 242) that lists every `type: project` orchestrator memory not yet referenced in this file — the mechanism that makes (1) and (2) not recur. Prior update: **2026-07-20** — **a museum accuracy audit closed the gap between this file and reality.** Item **P (THE MUSEUM)** was still marked ⬜ and read as a future proposal, but the museum has actually shipped: the generator (`museum/generate.mjs` in the archive) runs and produces `museum/site/`, four hand-written release accounts (2.5.0 / 2.6.0 / 2.8.0 / 2.8.5-draft) are approved and frozen, and both a correctness pass and a release-cadence generation pass ran. P is rewritten to say so. Three things that had no home in this file are now recorded under it: a **museum-reproducibility sub-program** (three archive sessions fixed a CRLF/LF page-renaming bug and a gitignored README leak; a fourth is **in flight right now**, resuming after hitting the same session limit — it replaces content-hash doc addresses with path-based ones and is mining a redirect ledger from this repo's own git history first, because 62 of the 306 hash-named pages that have ever existed are gone from the current site and recoverable only by walking history, a window that closes once path-based naming lands); the **museum publication plan** the owner locked this session (public after the 2.8.5 release and before 2.9.0, a clean new repo — `Robco-Exhibit` — on **Cloudflare Pages** rather than GitHub Pages specifically because a GitHub project site would share browser origin and localStorage with the live app, name substitution with a fail-closed guard, and a publication diff verified before anything goes live); and a new **reproducibility CI** item (**J**, owner: "go with recs") that turns three sessions' hand-proof into a standing gate. One more new item, unrelated to the museum: **L**, a generated, phone-readable HTML view of this very file, decided this session under a ONE-SOURCE-TWO-VIEWS ruling. Prior update: **2026-07-20** — **Group 1 (data safety) re-opened with A3**, a save→sync→load cloud round-trip test against the free local Firebase emulator, asserting field-level fidelity so a field added to state but missed in the sync mapping fails the gate. The gap was established from code, not assumed: `boot-smoke.mjs` allowlists away every Firebase network error, and Suite 46.17 — the closest existing check — asserts a hand-typed field list, so a new field goes green while never syncing. The entry states its costs honestly (a dev-only `firebase-tools` dependency; no coverage of real Firebase, App Check or network behaviour). **The App Check entry is CLOSED** — enforcement was already live and the owner deleted all three debug tokens in the console, so the **Museum-publication blocker is cleared**. Prior update: **2026-07-19** — a Group-3 batch pass plus a truthfulness sweep of the tail. **Group 1 (data safety) is now COMPLETE** — A0, A1 and A2 had all shipped but were still showing unticked, as had **O** and both batches of **N**; all six are now marked. Of the Group-3 batch: **E** (dead RECIPES.CSV tables, both games) and **K** (the backup script) shipped; **M** was re-audited and closed as already-done with nothing orphaned left to remove; **B** landed one of its four deferred conversions and the rest is now a named list rather than a vague bucket; and **C1** was deliberately NOT done — investigation found it collides with Protocol 29 and Protocol 33, so its entry now carries the blockers instead of a false "small win" framing. Prior passes (2026-07-18) —\_ (1) marked the **entire 2.8.5 code + test health round (U1–U12) SHIPPED**, plus the UI-truthfulness fixes and the **Protocol 23 architecture-conformance enforcement** capstone; (2) a **full ordering evaluation** of the whole roadmap — the floating end-of-round deliverables, the leftovers, and the pre-3.0 items each placed in dependency order with a "why it sits here," and the one real mis-ordering (list virtualization) moved to its foundation; (3) a **placement pass for a new batch from two external AI reviews** — near-term LIVE-SAVE DURABILITY (data-safety, runs first), the rules/governance restructure (delete the test-count bookkeeping, path-scoped rules + a retirement rule, a first staged trim, the re-pin), two cheap cleanups, two consciously-unversioned items, and the native ES-modules migration bundled into 3.0; and (4) a **placement pass for the 2026-07-18 live AI test** — the AI/Overseer audit (`planning/2.8.5/audits/AI_OVERSEER_AUDIT.md`) yielded **A0** (confirmed real item-loss, jumps to the front of Group 1 ahead of live-save durability) plus the **N** unit (Findings 2–8, non-gating), the **Museum** (item P, built before the 2.8.5 release), and the **test-artifacts self-cleaning** ride-along (item O). Each new item was verified against real code before earning its slot. The tail was regrouped into four ordered groups; item D moved next to the Atlas; the three owner-dropped ideas were recorded as closed. **Re-pinned at R4 (2026-07-20)** — the brain dump, code map, test catalog, this file, `library/MANIFEST.txt` and the archive now all describe one commit; the literal hash is in each library doc’s BASELINE PIN header and in the archive’s stamp. Compare it against `git rev-parse dev` to see whether they are still current.\_

---

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

---

# ✅ Brain dump (SHIPPED, and maintained from here on)

**What it is.** A complete Claude-facing reconstruction of the whole project — the vision, the architecture, every subsystem, every protocol and the bug that caused it, the recurring gotchas, your hard rules, the workflow, and the roadmap. Plus this phone-readable roadmap file and a pointer index in the rules doc.

**Why it exists.** So every future work session starts accurate instead of re-deriving the project from scratch. The accuracy pass also caught real doc drift (things the old docs claimed the code doesn't actually do), which got written down so nobody trusts them again.

**Done means:** the deep doc lives locally for Claude, this file is readable on your phone, and sessions auto-point to both. Shipped.

---

# 🔄 2.8.5 — "Code + Test Health", then Fallout 3 (essentially complete on `dev` — release + a short tail remain)

This whole version is about making the foundation solid **before** stacking more on top. The items run **in this order on purpose.** Nearly all of it has now shipped on `dev`; what's left is the per-game legacy/schematic layout (item 6) plus a four-group tail at the bottom of this version's block: the near-term **data-safety** work (LIVE-SAVE DURABILITY first), the **rules/governance restructure** (from the two external reviews), a short run of **small leftovers**, and the **end-of-round review/synthesis deliverables** — all placed in dependency order.

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

## 2. ✅ Performance / accessibility / asset-and-bundle-size work (SHIPPED — folded into the U1–U12 round)

**What it was.** With the codebase clean, measure and actually improve real load performance, accessibility beyond the current baseline, and the size of what ships to the device.

**How it shipped.** This turned out to BE the back half of the U1–U12 round rather than a separate unit: **U7** stripped the 204 KB dev console from the player build (real payload cut), **U8** measured mobile boot and found it already lean (~70 ms first paint — no safe cuts, honestly reported, two wins deferred), and **U9** drove accessibility from a stale "40" to a true **0** and locked the gate to that floor. Every improvement is measured, not guessed — the explicit bar this item set for itself.

**Done means:** measured, real improvements. Met.

## 3. ✅ Brain-dump update — re-baselined on the clean codebase (SHIPPED, 2026-07-12)

**What it is.** The explicit re-baseline that closes the hard exit condition above: re-verify the brain dump against the restructured code and rewrite the parts that moved. The vision sections stay stable; only the structural sections refresh.

**Why it exists.** A stale reconstruction doc is worse than none — it makes sessions confidently wrong.

**Status.** Done, as part of item 1's spine — see the hard exit condition note there.

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

## 5. ✅ Save integrity pass (SHIPPED, 2026-07-15)

**What it is.** A single save-contract hardening pass that came out of a blind completeness review (GPT + Gemini audited the roadmap for gaps; each finding was then verified against the real code before landing here). It's "the campaign data is safe" work, not visual polish, and it had two layers, not two separate items — one pass answering one question ("did the save survive?") from two angles: does the app itself preserve every field, and does the platform actually keep the bytes around to preserve. **Both layers shipped and passed their own independent audit.**

**Why it jumped the queue.** It moved ahead of what was left of FO3's cosmetic work — but **not** ahead of the karma rebuild or the data-provenance sweep, which are content-correctness work, not cosmetics. The reasoning in one line: a browser silently eating a campaign is worse than an item list being one row short.

- **✅ Layer 1 — semantic survival (the save-contract / upgrade-path health pass).** Nothing previously proved a months-old save actually survives loading into a _newer_ version of the app — the v7→v8 migration path was tested only as key-mapping, not as "a real, fully-populated OLD save boots all the way to READY without silently losing a field." Silent field loss is exactly the class of bug fixed during the FO3 work (the cross-game registry-leak fix and its hardening guard, item 4). **Shipped:** an automated survival test using real fixtures — a current save, a mature/high-density save, the oldest-still-supported save, a deliberately malformed one, and a save where the local copy and the cloud copy disagree — that compares the durable FIELDS themselves rather than the raw saved text (so it doesn't go brittle the next time a file gets reorganized), and proves durable campaign data survives serialization, migration, an app-version update, an offline reload, a malformed input, and a cloud sync with zero silent field loss. It also set the fail-loud bar for the whole pass: a failed, interrupted, or quota-exhausted write fails loudly with the original save left intact — never silently swallowed.

- **✅ Layer 2 — storage survival (the persistent-storage request).** The app is mobile-primary, offline-first, and save-sacred — but it had never once asked the browser to protect its data (`navigator.storage.persist()` was called nowhere). iOS Safari in particular will quietly evict localStorage/IndexedDB under low storage pressure or after roughly two weeks unopened, which can silently erase a campaign while every test in the gate stays green. **Shipped:** the app now asks for persistent storage at boot, the DENIED path (not just the happy-path request) is exercised by a real test, and when the browser says no the terminal warns you in its own voice with a "memory core unstable" style banner — because a request is not a guarantee, and the risk should never be silent.

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

## ✅ UI truthfulness fixes — stop reporting success on a partial or failed operation (SHIPPED)

**What it was.** Three tiny fixes from the warning-surface inventory, grouped because they shared one theme: the UI was reporting success — or "nothing here" — when the truth was "the operation failed." All three shipped alongside the read-side save pass.

- **A failed cloud-archive fetch no longer masquerades as "NO ARCHIVES ON FILE."** The saves list's already-built "ARCHIVE LINK FAILED" state was unreachable because the fetch swallowed every error and returned an empty list — so a connection hiccup read as "your cloud saves are gone." The failure now reaches the failure state that was already written.
- **"SYNC COMPLETE" no longer hides failures.** Per-save upload failures were silently left out of the summary — two of four could fail and you'd still be told sync completed. It now counts the failures and never says COMPLETE when the count is nonzero.
- **A real Google sign-in failure now shows something.** Cancelling the popup stays rightly silent, but a genuine failure (network, blocked popup, provider error) — which previously showed nothing at all — now surfaces a clear notice at the point of use. (Re-verified on a real device per Protocol 29.)

**Done means:** none of the three flows can report success (or an innocent empty state) when the operation actually failed. Met. Source: `planning/2.8.5/audits/WARNING_SURFACE_INVENTORY.md`.

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

---

# ⬜ 2.8.5 tail — near-term data-safety, the rules restructure, small leftovers, then the end-of-round deliverables (ORDERED)

Everything in the 2.8.5 blocks above has shipped. This block is the rest of the near-term work, **in execution order top to bottom**, sequenced highest-severity-first: the one item that can cost real data, then its recoverable data-safety sibling, then the rules/governance restructure the two external reviews prompted, then the small residual fixes, then the re-pin that stamps the result, and finally the review/synthesis deliverables that look back over the finished round. The letter IDs below are **stable tags, not alphabetical** — later items were slotted in where they belong in the order, not appended, so the letters no longer run A-B-C top to bottom. Only the code tail (the data-safety items + small fixes, plus the schematic layout in the 2.8.5 block above) gates the `dev → main` release; the governance restructure and the end-of-round deliverables can land around it.

_Placed 2026-07-18 from two external AI reviews (`planning/2.8.5/audits/ATLAS_ECOSYSTEM_REVIEW.md` + the synthesis). Each new item below was checked against the real code before it earned its slot; where verification changed the scope, the verdict is stated inline._

## Group 1 — Data safety (A0, A1, A2 shipped · **A3 open**, added 2026-07-20)

_This group was marked COMPLETE on 2026-07-19 and **re-opened on 2026-07-20** with **A3**, the cloud round-trip test. A0/A1/A2 all made the LOCAL save safe. A3 is the same question asked of the CLOUD path, and it turns out nothing in the gate has ever asked it end to end._

_A new item **A0** was added at the front of this group on 2026-07-18 — it jumped ahead of A1 (live-save durability) because it is confirmed **real, unrecoverable item loss during ordinary play**, with no external precondition. A1 needs a storage-eviction event and its damage is bounded; A0 fires on any AI turn. Source: `planning/2.8.5/audits/AI_OVERSEER_AUDIT.md` (Finding 1)._

### A0. ✅ AI INVENTORY-OVERWRITE GUARD — stop an AI turn from silently deleting items (Finding 1) — SHIPPED

**Shipped (2026-07-18/19, `8f834e6` + `36926f0`).** The inventory array became a reconciled _proposal_ instead of a full replace, and the follow-up commit widened the same treatment to **every** AI full-replace-from-response field — the class fix, not just the one reported symptom. Guarding regression tests landed with both commits (Protocol 13/14).

**What it is.** The AI-import path does a **full replace** of `state.inventory`, not a merge: when an AI response contains an `inventory` array, `autoImportState()` (`js/services/api-import.js`, ~line 379) runs `state.inventory = inv.map(...)` — the entire durable inventory is overwritten by whatever the AI returned this turn. An empty array wipes everything. The directive itself (`js/services/api-directive.js`, ~line 120) commands the AI to "return the ENTIRE inventory array" on any inventory-touching turn, so a turn where the model misjudges — e.g. a **failed** repair and an **aborted** craft — and emits a short or empty array **deletes real items from state**. The `[DELTA] inventory: 1→0 items` line the owner saw was telling the truth: the item was genuinely removed, not miscounted.

**Verified.** Confirmed real state loss (not a display bug) by tracing the code against the owner's live screenshots on 2026-07-18. The DELTA counter reads actual `state.inventory` length before/after, so `1→0` is a real deletion. The existing registry-leak guard only covers cross-**game** mismatches; a same-game short/empty array is unguarded.

**What it depends on.** Nothing structural — it's a change to the AI-import reconciliation (`api-import.js`) plus a directive tweak. It is the direct symptom of the wider directive-authority problem (Finding 8, item N below); this fixes the bleeding, N does the systematic sweep.

**Why it jumps ahead of A1.** Both are data-safety, but A0 is **unrecoverable, unconfirmed, every-turn** loss during normal play; A1 is **recoverable, eviction-conditional** loss ("everything since the last rolling backup"). The project's own severity precedent (data-safety jumps cosmetics; unrecoverable jumps recoverable) puts A0 first. It also runs ahead of the schematic layout (item 6) for the same reason A1 does.

**Hard rule.** Protocol 24 (validate + field-map, never blind-persist) and Protocol 14 (AI-contract test in the same commit): the guarding regression test is mandatory — a sync returning a short or empty inventory array must **not** delete natively-held items. Fix shape (reconcile-not-overwrite / confirm net-removals / make inventory AI-read-only) is a plan-stage decision.

**Done means:** an AI turn can no longer silently delete items the player natively holds; net removals are either reconciled against a real narrative signal or confirm-gated; a red-then-green regression test locks it.

### A1. ✅ LIVE-SAVE DURABILITY — give the live campaign container an IndexedDB shadow — SHIPPED

**Shipped (2026-07-19, `7a99731`, item P8).** The live `robco_v8` container is now mirrored fire-and-forget into the IndexedDB `'campaign'` store (key `'live'`), so an Android/iOS localStorage eviction that spares IndexedDB is recovered on the next boot. Recovery-only by design — a stale mirror can never overwrite a newer local value (Protocol 34).

**What it is.** `saveState()` writes the active campaign container (`robco_v8`) to **localStorage only** — confirmed in code (`js/core/state.js`, the debounced writer). Save slots and rolling backups already get an IndexedDB durability shadow with a rehydrate path; the LIVE container is the one copy with no cold-storage twin. Under storage pressure (Android especially, and iOS Safari's roughly two-week eviction) localStorage can be reclaimed — and nothing is shadowing the live container when it is.

**The real exposure — measured, not worst-cased.** Rolling backups DO reach IndexedDB and CAN be rehydrated, so a live-container eviction costs "everything since the **last rolling backup**," not the whole campaign. That bounds the damage. (Until the 2026-07-18 AI/Overseer audit this was called "the only item that can cost real data" — that title now belongs to **A0** above, which is unrecoverable and every-turn; A1's loss is recoverable and eviction-conditional, so it sits just behind A0.)

**What it depends on.** The existing IDB cold-store engine (`js/core/idb.js`) — the same shadow-write plumbing the slots and rolling backups already use. No missing foundation.

**Why it sits second (behind A0, ahead of the schematic layout).** Data-safety outranks cosmetics: the exact precedent that let the save-integrity pass jump ahead of the Fallout 3 cosmetic queue ("a browser silently eating a campaign is worse than an item list being one row short"). It sits behind A0 only because A0's loss is unrecoverable and A1's is recoverable. It should still be scheduled **before** the 2.8.5 schematic layout (item 6), which is cosmetic and independent of it.

**Done means:** the live `robco_v8` container is durably shadowed to IndexedDB on save (additive only, Protocol 34), an eviction-then-rehydrate path is behaviorally tested (Protocol 13), and a recovered-after-eviction live container is surfaced in the terminal's own voice, never silently swallowed.

### A2. ✅ Save-integrity Layer 3 — the write-side quarantine follow-up — SHIPPED

**Shipped (2026-07-18, `db15f8d`).** A quota-failed migration WRITE is now separated from genuine read-side corruption, so a healthy old save can no longer be quarantined just because the re-write ran out of room.

**What it is.** Layer 3 made the READ side fail loud (a corrupt campaign is quarantined, not deleted). This closes a residual on the WRITE side the same pass exposed: a **valid, healthy old save can still be wrongly quarantined if the migration WRITE hits a storage quota** mid-upgrade. The read path can't tell "the bytes are corrupt" from "the bytes were fine but the re-write ran out of room," so a quota-failed migration currently looks identical to corruption and the good save gets quarantined.

**What it depends on.** Layer 3 (shipped) — this is its direct residual, nothing else.

**Why it's second, not first.** It's data-safety too, but the damage is **recoverable** — a wrongly-quarantined save is sidelined under a quarantine key with EXPORT, not destroyed. So it sits just behind A1, the one item whose damage is unrecoverable. Same governing principle for both: data-safety outranks polish.

**Done means:** a quota failure during a migration write is distinguished from genuine corruption — the healthy save is preserved and retried/surfaced, never quarantined as if it were corrupt.

### A3. ⬜ CLOUD ROUND-TRIP TEST — prove every field survives sync, against the Firebase emulator

**What it is.** A save → sync → load round-trip test that runs against the **Firebase local emulator suite**, asserting **field-level fidelity**: every field on the save envelope must be present and equal after the round trip. The point is not "the write returned success" — it is that a field which stops being carried across gets caught. **A new field added to `state` without being added to the sync mapping must FAIL this test.** That failure mode is the whole reason the item exists.

**The gap, established from the code on 2026-07-20 — not assumed.** Nothing in the gate exercises cloud sync end to end:

- `tests/boot-smoke.mjs` (its `isExpectedNoise()` allowlist) explicitly swallows Firebase Auth, Firestore and remote-config network failures as _"known noise that is NOT a bug"_ — correct for a credential-less, network-less test box, but it means the browser tests boot the app, watch every cloud call fail, and discard the errors. The gate stays green.
- Suite **46.17** is the closest thing that exists, and it is genuinely good — it evaluates the **real** `sanitizeImportedContainer()` + `migrateState()` in a `vm` sandbox and proves the Phase-6 fields and faction reputation survive byte-stable. But it feeds them a **hardcoded fixture** and asserts a **hand-listed set of field names**. A field added to `state` tomorrow is simply not in that list, so 46.17 goes green while the field silently never syncs. It is a fixed-inventory check, not a completeness check.
- The rest of Suite 46 is presence-grepping (`addDoc` appears, `setDoc` doesn't) — real Protocol 34 value, but it proves the source is spelled right, not that a save survives.

So: **a field that silently stopped syncing would pass every check this project has.** The 2.8.0 cloud audit already ranked this exact shape — **CC-RT-1 · [HIGH] · "Cloud pull round-trip is NEVER behaviorally tested"** — as its highest-value gap (`planning/2.8.0/audits/CLOUD_AUDIT.md`). 46.17 was the partial answer to it; the completeness half was never built.

**Correcting the record: this does NOT need paid infrastructure.** An earlier reading of this item assumed a real Firebase project and was wrong. The **local emulator suite** runs Firestore and Auth on the developer's own machine — free, offline, no credentials, and **no App Check involvement at all**. And the emulator is aimed at exactly the right target: the bug class lives in **this project's own field-mapping code**, not in Google's servers. Real Firebase storing what it was sent is not the failure mode. The app failing to _send_ a field is.

**What it buys over 46.17.** A real SDK write/read instead of a sandboxed function call — so it also catches the things that only bite at the serialization boundary: `undefined` silently stripped, nested arrays rejected, timestamps coerced, document-size limits. And driven from the live field list rather than a hand-typed one, so it fails on the field nobody remembered.

**The natural extension.** This is the guard that makes **Protocol 34** (`rules/auth-and-cloud.md` — cloud writes are additive, destructive ops are confirm-gated) **enforced rather than written**. Today Protocol 34 is honoured by convention and grep; an emulator round-trip can actually assert that a sync did not destroy what it should have preserved.

**Honest cost note — a new dev dependency.** It introduces `firebase-tools` as a **DEV-ONLY** dependency. That brushes against this project's no-new-dependencies instinct and is stated rather than hidden. The mitigations are real: nothing ships to users (the served/precached set is untouched), it runs fully offline, and it only ever runs at the gate. It is still a genuine cost — a heavy CLI package and a JVM requirement for the Firestore emulator — and is worth weighing at plan stage against a lighter fake-Firestore shim, which would cover the mapping bug but not the serialization boundary.

**Honest scope note — what this does NOT cover.** The emulator does **not** test real Firebase, App Check, production security rules as deployed, or genuine network behaviour (offline transitions, retries, partial failure). Those stay untested by this item. It covers the **mapping** bug — which is the dangerous one, and the one that is silent.

**Why it belongs in the data-safety bracket.** Alongside A0/A1/A2 by kind, not by accident: those three made the LOCAL save safe against AI overwrite, eviction and false quarantine. This is the same class of failure on the cloud path. And it fixes a structural bias worth naming plainly — **the gate is dense where verification is cheap and empty where it's expensive, which is backwards from risk.** Sync is the most dangerous thing the app does and it has zero end-to-end coverage. That was never a decision anyone made; nobody was ever forced to make one, because the expensive gap never announced itself.

**Hard rule.** Protocol 13/42: the test must be demonstrated **red-then-green** — remove a field from the sync mapping and it must fail. A completeness test that has never been seen to fail is exactly the false confidence this item exists to end.

**Done means:** a save→sync→load round-trip runs against the local emulator in the gate, asserts every save-envelope field present and equal, is driven from the live field list rather than a hardcoded one, has been proven to fail when a field is dropped from the mapping, and `firebase-tools` is a dev-only dependency with nothing added to the served set.

## Group 2 — The rules & governance restructure (near-term; prompted by the two external reviews)

Two external AI reviews independently pushed on the project's own rulebook and bookkeeping. **R1-R4 (done):** the delete clears a dead obligation, the restructure changes how rules are RETRIEVED (not just written), the first trim cuts on top of the restructure, and the re-pin stamps the result to one baseline. **R5-R7 (added 2026-07-20):** the staged trim's remaining installments — R3 was explicitly only the FIRST cut, and stages 2-4 previously existed only in Dispatch's memory, not here; they're real queued work now, not a footnote. **R8 (added and shipped 2026-07-20):** the mechanism that stops that exact gap — a plan reaching this file late — from recurring. None of the eight gates the release; they pay down process debt.

### R1. ✅ DELETE THE TEST-COUNT BOOKKEEPING — retire Protocol 2a _(done 2026-07-20)_

**What it is.** The hardcoded assertion count (3411 today) is hand-synced across 8+ files on every test add or remove (Protocol 2a). **Both** external reviewers condemned it independently, from opposite directions — one as pointless ritual, one as a tax on every commit. The count guards **no behavior**: the runner's exit status is the only thing that actually matters. This retires Protocol 2a and the whole synchronization obligation, and strips the hand-synced count out of the docs that carry it.

**Interaction to respect (flagged in this ordering pass).** This partly **deprecates item D below** (the TEST_CATALOG generator). D's headline rationale was "stop hand-syncing the catalog's count." With the count obligation gone, D shrinks to generating the per-suite **content** only (for the ATLAS assurance view) — see D's reduced scope.

**Why it's near-term.** It removes friction from every future commit, and it's a precondition for an honest restructure (R2) — no point re-encoding a bookkeeping rule you're about to delete.

**Done means:** Protocol 2a is retired (its number retired-not-reused, per the Protocol 15 precedent), no doc carries a hand-synced test count, and the gate still fails loudly on any real test failure.

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

### R5. ⏭️ STAGE 2 — Convert prose into enforcement (ready to plan; not yet formally called)

**What it is.** The highest-value of the three remaining staged-trim steps flagged at R3, and really a conversion rather than a cut. The principle (from GPT's review, sharpened): a rule an agent must remember costs something every single session it's loaded; a guard that fails loudly is free and can never be skipped. Every mechanisable rule becomes a check, then its prose shrinks to one line plus a pointer at that check.

**Candidates on file (GPT's table, unchanged, not yet acted on — each needs re-verification against current code before any commit, Protocol 27):**

- Branch discipline (Protocol 43) → GitHub branch-protection settings, not just prose.
- The redirect-auth ban (`linkWithRedirect`/`signInWithRedirect`, Protocol 30) → a lint rule.
- The state-field checklist → a schema round-trip test. **Flag:** this may already be substantially covered once **A3** (the cloud round-trip test, Group 1 above) ships — check for overlap at plan time rather than building it twice (Protocol 22).
- Render-layering (Protocol 23) → AST/lint boundary rules, once the baselined debt is burned down. Today's static scanner (Suite 236) is already a step in this direction; full enforcement waits on the native ES-modules migration (bundled with 3.0 — see that section).
- AI-response handling → runtime schema validation + malformed-response behavioral tests.
- The deploy protocol → a post-deploy version/SW/offline smoke. **Flag:** this is very likely the _same_ work as the 2.9.0 hardening gate's "post-deploy TRUTH" item (above, in the 2.9.0 planning block) — resolve which one actually builds it before starting either.

**The gate this stage was waiting on.** R2 (the rules restructure into path-scoped notes) had to be USED for real work first — staging cuts without observing whether the new structure actually holds up would just be the same one-shot amputation delivered in installments. **Dispatch's read: that gate now appears satisfied** — the restructure has been retrieving correctly and pulling real weight across many sessions this week (this very session's own use of the retrieval map is one more data point). Recorded honestly: this is Dispatch's assessment, not something the owner has formally called yet.

**Status: ready to plan, not started.**

### R6. ⚠️ STAGE 3 — Narrow the universal ratchets (CONTENTIOUS — owner must weigh in; NOT ready)

**What it is.** The cut that costs something real, unlike Stage 2's conversions. Today every escaped bug, every CSS invariant, every harness flaw, and every testing-time discovery permanently **enlarges** the gate (Protocol 36b) — it only ever grows (Protocol 49, the retirement rule, opened the removal side for guards whose risk is gone, but the escape-ratchet itself still only ever adds). GPT's proposal: shift from "add a guarding test for every escape, always" to "add one when recurrence would actually be costly" — a judgment call replacing an automatic one.

**Also on the table, same stage:**

- The per-commit documentation rule (Protocol 2) — today every meaningful commit updates `ARCHITECTURE.md`/`CHANGELOG.md`/`README.md` in the same commit; loosening how often or how much waters this down.
- The changelog grammar rule (Protocol 21) — the seven-rule plain-English structure, possibly relaxed.
- The universal-requirement framing of the UI-verification protocol ("actually render and exercise the change," Protocol 10 in spirit) — narrowed from every change to a risk-scoped subset. **This is the one item GPT itself withdrew from its own cut list** (see the keep-case below) — it probably shouldn't even be "on the table" here, and is listed only so a future pass doesn't independently reach for it not knowing that.
- Moving the UI-presentation rules (the `Protocol UI-*` family, `rules/ui-and-mobile.md`) out of the constitution into design docs, since they encode presentation taste (Protocol 25's sanctioned exceptions, the bezel/motion-verb grammar) rather than catastrophic knowledge — a genuinely different KIND of rule than the data-safety/layering rules sitting next to them today.

**Why this one waits for the owner, explicitly.** Every other stage in this trim converts remembering into checking, or targets machinery with a clean cost/benefit case. This one changes how much SAFETY the process buys per commit — the escape-ratchet exists because "add a test when recurrence would be costly" requires correctly predicting which failures recur, and this project's own incident record (the owner-ruling memory) is full of failures nobody predicted would recur until they did. Not marked ready to plan; each bullet needs the owner's explicit call, not a session's judgment substituting for it.

### R7. ⬜ STAGE 4 — The expensive machinery (capability calls, not doc cleanup)

**What it is.** Unlike R5/R6 (rulebook prose), this stage cuts actual running infrastructure — each item needs its own argument, not a shared one:

- **The Diagnostic Shell's scope (159 tools).** Weight GPT's rejection of this LOWER than its other findings — GPT did not know the Diagnostic Shell is on the owner's own roadmap as a real in-fiction user-facing feature (the hacking-minigame's unlock target, 2.9.0 — see "The OS round proper" below), so its "this reads as bloat" framing was working from an incomplete picture.
- **The duplicate Windows CI leg (the OS matrix).** Real cost (roughly double CI minutes), but this is precisely the class of guard this project has already been burned by cutting once — a Linux-only CI runner was a real production mistake here before it was hardened to run both platforms.
- **Nightly runs.**
- **The browser test page (`tests/test.html`).** Already has its own retirement analysis on file — Protocol 40 kept it deliberately as a self-consistency check (its own `Suites: N` marker), explicitly distinct from the cross-file bookkeeping Protocol 2a was retired for. Re-litigating it here should start from that reasoning, not from zero.
- **Per-step failure-evidence packaging** (U4's CI screenshot/console/log capture).

**Status: not started, not ready — each item needs its own cost/benefit case before it's even plannable.** Per Protocol 49, retiring any of them means removing the actual enforcement (the CI job, the capture step, the tool registry entries), not just the prose describing it.

**Keep-cases across R5-R7 — recorded so they are not re-litigated in any future trim pass:**

- **The architecture-conformance baseline** (Suite 236) — already a formal Protocol 49 keep-case; its risk stays live until the native ES-modules migration (bundled with 3.0) makes layering structural. Restated here so a Stage-3 pass doesn't independently reach for it.
- **The real-device auth rules** (Protocols 29-31) — a real production regression is on file (the r54 regression). Not prose-only caution; a documented incident.
- **UTF-8 source integrity** (Protocol 39) — a real corruption incident with a commit hash on file. Same shape: not hypothetical.
- **Cloud write safety** (Protocol 34 — additive-only, confirm-gated destructive ops) — failure here is unrecoverable data loss; the entire Group 1 data-safety chain above exists because this class of failure actually happened once (the live AI full-replace item loss).
- **The cache-bump guard** (Protocol 1) — failure is silent and user-visible (a stale build or black screen with no error anywhere).
- **The dispatch-decision protocol** (Protocol 12, No Concurrent Pushes) — the owner already overruled this exact cut at R3; restated so a future pass doesn't reopen a settled call.
- **"Actually render and exercise UI changes"** — GPT **itself withdrew** this from its own cut list, because it addresses a real, named AI failure mode: an agent reasoning confidently from CSS text without ever looking at the rendered result. Kept with the reviewer's own agreement, not only the owner's.

**What R5-R7 depend on.** R5 needs nothing new — its gate (R2 in real use) is already met per Dispatch's read above. R6 needs the owner's explicit call on each bullet before it can move to "ready to plan." R7's items are independent of each other and of R5/R6 — any one can be argued and decided on its own schedule.

**Why R5-R7 sit here, not gating anything.** Like R1-R4 before them, none of this gates the `dev → main` release — it's process debt, and Group 2 already runs deliberately alongside the code tail rather than blocking it.

### R8. ✅ QUEUE-DRIFT RECONCILIATION — an automatic backstop so a plan can't live only in memory (SHIPPED 2026-07-20)

**What it is.** Prompted by the owner catching this exact failure mid-session: R5-R7 above, the museum's rename-permanence design (P1, below), and (per the museum audit note at the top of this file) the museum's own publication plan had all been reached in conversation and only reached `QUEUE.md` late — one of them only because the owner asked. **Protocol 50** (`CLAUDE.md`) is now the standing rule plus its automated backstop, both shipped this session rather than merely queued.

**Shipped:**

- **(a) The standing rule.** Any decision or plan reached in conversation is written into `QUEUE.md` in the same session, not batched. Stated honestly in the protocol text: this half is still prose an agent must remember — exactly the weak form R5's own "convert prose into enforcement" principle argues against. It is necessary but not sufficient on its own, which is why (b) exists.
- **(b) `scripts/queue-drift-check.js`.** A fail-safe pre-push nudge, same shape as Protocol 48's backup nudge (`scripts/backup-nudge.js`, `|| true`, never blocking): lists every `type: project` orchestrator memory that doesn't look referenced in `QUEUE.md`, using a word-overlap heuristic. The threshold was tuned against a measured failure: a single generic-word match (coincidentally the word "project" itself, drawn from a memory's own slug) cleared an unrelated fabricated memory as "referenced" purely by chance in a document this size — so the bar is now 3 distinctive-word hits (or all of a memory's tokens, when it has fewer than 3). Never fails or blocks a push; stays silent on a machine with no discoverable memory store. An explicit `queue_status: not-applicable` frontmatter field lets a memory opt out on the record, instead of just quietly never being flagged. Guarded by **Suite 242**, including a red-then-green proof that the matcher actually catches a fabricated unreferenced memory — not merely that the script never crashes (the same false-confidence trap Protocol 42 exists to rule out).

**Why a nudge, not a gate.** The memory store lives outside both this repo and the private archive (`AppData\Roaming\Claude\...`) and is not guaranteed to exist on every machine that pushes here — the exact constraint Protocol 48 already solved for the backup sync, reused rather than re-solved (same `ROBCO_MEMORY_BASE` override, same discovery shape).

**Why it doesn't hand-maintain a count.** Every run re-reads the live memory files and the live `QUEUE.md` text fresh — nothing here is the class of hand-synced number Protocol 2a was retired for.

**Done means:** met. `scripts/queue-drift-check.js` exists, is wired into `scripts/pre-push` (installed via `npm run prepare`), and Suite 242 proves both its fail-safe behavior and that it actually catches what it exists to catch.

**Honest follow-up (2026-07-21) — the gap R8 CANNOT close, now named in the protocol itself.** R8's nudge compares **memory ↔ queue**. The DeepSeek roster decision (item G) proved within hours of Protocol 50 shipping that a decision reached _purely in conversation_, never written as a memory, is invisible to it — and, worse, the highest-risk case is a purely conversational planning session that never touches the repo at all, so it never reaches the pre-push hook where any nudge fires. **A script cannot read a conversation, and the sessions most likely to drop a decision never push.** The verdict, recorded rather than papered over: the conversation ↔ queue gap is **behavioural with no honest automated backstop**, and building a conversation-scraping script would be the "guard that pretends" Protocol 49 warns against. Protocol 50 now carries a subsection **(c)** stating this plainly and naming the real fix — a **session-end ritual** (reconcile every decision into `QUEUE.md` that session; write durable ones as `type: project` memory too, because _that_ is what hands R8's nudge something to catch next time). No new script; the one mechanisable lever (route durable decisions through memory) already exists.

### R9. ✅ THE SKILL, MADE A POINTER — the fourth context source stops being a second source of truth (SHIPPED 2026-07-21)

**What it is.** A session is oriented by four context sources: (1) `CLAUDE.md` + the `rules/*.md` notes, (2) this file, (3) the orchestrator's memory store, and (4) an installed **skill** (`robco-uos`) that loads even before the repo is opened. The first three all grew drift protection this month; the fourth had **none** and no tracked source, so it rotted: **two sessions independently found the installed skill pointing at a dead repo path (`C:\Dev\!GEM\Website version`), citing the deleted PowerShell runner and "both runners" parity, referencing retired Protocol 2a as live, and naming the deleted `RULES.md`.**

**The corrected framing (owner's tightening, GPT-5.6 Sol's discipline) — and a real self-correction.** An earlier pass this session shipped the skill as a hand-written **copy** of the rules plus a bespoke guard (`Suite 243`) and a standing pre-push nudge (`scripts/skill-drift-check.js`) to police its drift. That was **backwards.** The governing principle: **the skill must not become another independent source of project truth that can silently diverge.** A copy that needs a fact-checker is the divergence; the fix is to **not copy.** So the skill was rewritten as a **pointer** — it says where truth lives (read `CLAUDE.md`, follow its retrieval map to the right `rules/*.md` note), gives the handful of things that bite before the repo is open **as pointers to the real protocol**, and deliberately restates nothing. A pointer has almost nothing that can drift.

**What that made unnecessary — removed, not kept "because harmless":**

- **`Suite 243` — DELETED.** Held against the owner's bar (a guard must earn its existence through a real failure at a defined enforcement point, demonstrated red on a genuine instance, not duplicated elsewhere), it failed: the failure it checked (drift in the _committed_ source) had never occurred — the real drift was in the _installed cache_, which it structurally cannot see; its red-then-green was only against a _synthetic_ skill; and it substantially **duplicated Suite 220.2/220.9**, whose machinery it had borrowed. Removed with its enforcement (Protocol 49). Replaced by **one line**: `skill/SKILL.md` folded into the existing Suite 220 scan, so the same doc-integrity checks that guard `CLAUDE.md` now also validate any path or `Protocol N` the pointer names — the exact `RULES.md`-style dead reference that _did_ occur, caught by machinery that already exists, at zero new cost (Protocol 22).
- **`scripts/skill-drift-check.js` — DELETED.** With the skill a pointer, the divergence it guarded is largely removed by the fix itself, so a standing pre-push nudge against that divergence isn't earned. The one genuine, one-time need it served — telling the owner "your installed copy is stale, re-install it" — is served by saying so directly (below), not by a permanent mechanism.

**Net mechanisms added by this whole piece: zero new scripts, zero new suites** — one file folded into an existing check. That is the disciplined shape the tightening asked for.

**Done means:** met. `skill/SKILL.md` is a committed pointer (not a copy), covered by the existing Suite 220, and the workflow-review prompt §5 names the skill as the fourth context source. **One manual step remains for the owner: re-install the corrected skill via Settings › Capabilities** — the installed cache is still the old stale copy, and nothing but a re-install can refresh it.

## Group 3 — Small residual fixes + non-gating near-term units (nothing here unblocks downstream)

Grouped by one shared property: **none of it gates the `dev → main` release and none unblocks anything downstream.** Most are genuinely small (B, C1, E, M, K, O) and fold into whichever commit is convenient. Larger but still non-gating, so they live here rather than earning their own release-blocking slot: **N** (the AI/Overseer pass, Findings 2–8), **P** (the Museum — built, with an in-flight reproducibility sub-program and a locked-but-not-started publication plan), **J** (the reproducibility CI that guards P), and **L** (the generated QUEUE view).

**Status after the 2026-07-20 museum audit pass:** ✅ **E, M, K, O, N** remain closed from 2026-07-19. **P** corrected from ⬜ (stale — it read as unbuilt) to 🔄 (built; P1 reproducibility in flight, P2 publication not started). **J** and **L** are new items, both ⬜. 🔄 **B** still has its remainder scoped (unchanged since 2026-07-19). ⚠ **C1** remains deliberately not done, blockers unchanged. Still open in this group: **B** (remainder), **C1** (re-scoped), **P** (P1 in flight + two new sub-items added 2026-07-20 — rename permanence and the `file://` click-test — P2 not started), **J**, **L**.

### B. 🔄 The deferred U3 render-harness test slice — ONE conversion landed, the rest scoped (2026-07-19)

**What it is.** One slice of the U3 static→behavioral conversion round was deferred: converting the render-harness-dependent suites to actually drive the render path rather than grep it. The rest of U3's six slices shipped; this is the one left on the bench.

**The deferral is now traced to its source, so the slice is a known list rather than a vague bucket.** It came out of the U3 slice-6 commit (`7030103`), whose body reads: _"DEFER 163.12 (renderSavesList per-game filter) — needs a DOM render harness or a source extraction (served-file change); kept its verbatim-filter static guard, flagged for a render-harness slice."_ The wider hit-list is `TEST_STRENGTH_U2.md`'s CONVERT ledger: **163.12** (`renderSavesList` per-game filter), **226.11** (inventory detail-pane mutator wiring — greps four mutator names _anywhere_ in the file, so dead or wrong-index wiring stays green), **179.4** (`renderCartDeck` escaping), and **210.7 / 211.4** (Diagnostic Shell filter-before-DOM-insertion).

**✅ Landed this pass — 179.4, chosen because it was the one making a SAFETY claim it could not actually prove.** Two of its six regexes (`escapeHtml(label.toUpperCase())` / `escapeHtml(sub)`) asserted XSS safety by grepping for the call text — which proves the call is _spelled_ somewhere in the body, not that escaping _happens_. `renderCartDeck()` is now executed in a `vm` sandbox (the Suite 177 `renderAccount` pattern) against a hostile `GAME_DEFS` fixture, and the assertions read the markup it really produced: **179.4** checks structure/wiring/ARIA and `--cart-stack-depth` off the real output, and new **179.4b** proves a `<img src=x onerror=…>` label is escaped — no raw `<img>` tag, hostile string never surviving verbatim. The sandbox wires the **real** `escapeHtml` lifted from `ui-core.js` (Suite 177 stubs it as a pass-through, which is fine there but would have voided the whole point here). Red-then-green verified: with escaping removed, a live `<img>` reaches the deck markup and 179.4b fails.

**⬜ Still on the bench, and why each one is more than a copy of the above.** **163.12** is the one the original commit called out: `renderSavesList` was judged to need "a DOM render harness **or a source extraction (served-file change)**" — i.e. it may not be `vm`-extractable without editing shipped JS, which turns a test-only change into a Protocol 1 cache-bumping one. That is a scoping decision worth making deliberately, not sliding into at the end of a cleanup batch. **226.11** and **210.7/211.4** need a fuller synthetic-DOM harness (event dispatch and a mount pipeline, not just an `innerHTML` sink), which is a harness-building unit rather than a per-suite conversion.

**Done means:** the remaining deferred render-path suites execute the real render and assert the result, matching the behavioral bar the rest of U3 set.

### C. ⬜ The two deferred U8 perf wins — SPLIT, because one of them belongs to 2.9.0

U8 measured the app as already lean and deferred exactly two real wins. On the ordering evaluation these do **not** belong in the same place:

- **C1 — gate the cloud warm-up (near-term, here).** ⚠ **NOT DONE — deliberately, and it needs re-scoping before anyone attempts it (verified 2026-07-19).** The queue described this as "a small, self-contained win." Reading U8's own commit (`49a37cc`) and `cloud.js` says otherwise; the deferred item is written there as _"Defer the eager Firebase/cloud boot chain until cloud features are used (auth path → Protocol 29 real-device verification, Protocol 31 guard)"_ — U8 itself flagged it as behaviour-changing and owed its own verified pass. Two hard blockers, both concrete:

  **(a) It is an auth-path change, and Protocol 29 makes real-device verification a condition of "done."** The chain being deferred is `initializeAppCheck` → `getAuth` → `onAuthStateChanged` → the Protocol-31-guarded `signInAnonymously`. Protocol 29 says an auth change is not done until verified on a real mobile device in **both** a browser tab and the installed PWA — precisely because this class of bug is invisible on desktop and to the whole test suite (the r54 regression). No session without a phone in hand can close it, so shipping it here would mean marking done something that by rule isn't.

  **(b) It collides head-on with Protocol 33.** `cloud.js` calls `loadRemoteConfig()` at boot (line ~351), which is the remote kill-switch read (Protocol 32/33/35). Deferring the boot chain until "cloud features are used" would mean a player who never touches cloud features **never reads the flag doc at all** — so a kill switch flipped to disable a broken `aiChat` or `visualOcr` would never reach them. That guts the ability to disable a broken feature remotely without a redeploy, which is the entire point of Protocol 32/35. Any real version of C1 has to keep the flag read (and the LKG path) at boot while deferring only the auth/App Check/Firestore weight — a genuinely different and larger change than "warm up lazily."

  **Also worth stating plainly: the measured payoff is small.** U8 found the chain "runs in the BACKGROUND and never gates READY," with FCP already ~73 ms. So this trades a real Protocol 29 + Protocol 33 risk surface for a win U8 could not measure at the visible boot. Re-scoped, it belongs with the 2.9.0 hardening gate's boot-isolation work, where per-phase boot guards are already being built — not as a near-term one-liner.

- **C2 — virtualize long lists (MOVED to 2.9.0 — see the flag below).** ⚠ This one was going to be a standalone near-term perf pass, but the 2.9.0 inventory-panel rebuild **also** virtualizes long lists as its stated foundation. Doing it twice — once against today's flat list, then again when that list is rebuilt — is a Protocol 22 parallel-implementation trap: the near-term version would be thrown away. So list virtualization is **re-sequenced into the 2.9.0 inventory-panel foundation** and built once, there. (This is the one genuine mis-ordering the evaluation found: a perf win sitting in front of the very rebuild that would redo it.)

**Done means (C1):** the cloud connection is warmed lazily, measured before/after.

_(Item D — the TEST_CATALOG generator — used to sit here in the leftovers, but its own rationale is "best done just before the Atlas," so this ordering pass moved it into Group 4 next to the ATLAS. It's still tail item D; see there.)_

### E. ✅ The dead RECIPES.CSV tables — BOTH game databases — SHIPPED (2026-07-19)

**Zero consumers re-verified from code before deleting anything (Protocol 27), not taken on the doc's word.** Neither `db_nv.js` nor `db_fo3.js` names `[RECIPES.CSV]` in any parser: `_buildItemCache()` and `getTradeCatalog()` iterate explicit section lists that never included it, and no `lookup*()`/`get*()` accessor referenced it. Crafting reads `reg_nv.js`/`reg_fo3.js` `recipes[]`/`breakdowns[]`, as documented.

**The one real consumer was the AI, and that made deleting it better rather than riskier.** `databaseCSVs` is injected wholesale into the Gemini `systemInstruction` (`api.js`), so the table was costing tokens on every call (bring-your-own-key — the owner pays) to hand the model a _second, competing_ recipe list for a system the natives now own. That is precisely the Finding-8 directive-authority problem, so removing it is aligned with the AI/Overseer pass, not a regression. Deleting the FO3 table also cleared the fabricated "Abraxo Cleaner Bomb" row whose Output was a non-existent "Tin Grenade" (`AUDIT_fo3_weapons` §2).

**Done:** both tables removed; the reserved-column ledgers in both files and in `ARCHITECTURE.md` updated to record the removal and why; Suites **9.10 / 19.10** invert the old "must contain" assertion into a must-NOT-exist guard, so re-adding either table fails the build (Protocol 36b escape-ratchet, the same shape used when the PowerShell runner was deleted).

**What it is.** A dead `RECIPES.CSV` table sits in **both** game databases — `js/data/db_nv.js` and `js/data/db_fo3.js` — each already tagged `PARKED-FOR-REMOVAL` in its own reserved-column ledger, with **zero code consumers**: crafting reads the registries (`reg_nv.js` / `reg_fo3.js`, the `recipes[]` / `breakdowns[]` arrays), never these CSV tables. It's the Protocol 22 duplicate-source flag, pure hygiene, nothing the user sees. (Verification 2026-07-18 widened this from the original "FO3 RECIPES reference" — the dead table is in New Vegas's database too.)

**What it depends on.** Nothing. It can ride any commit.

**Done means:** both `RECIPES.CSV` tables are removed, the reserved-column ledgers updated to match, and nothing else changes.

### M. ✅ The map renderer's boxed-grid residue — CLOSED, nothing left to remove (verified 2026-07-19)

**Verdict: already fully done by an earlier pass; no change made, deliberately.** Re-audited from the code rather than the queue entry. `_MAP_ABBREV`/`_mapAbbrev` is gone and guarded (Suite 189.1), as recorded. The remaining question was the boxed-grid CSS — and every class the entry suspected (`.map-cell`, `.map-detail-row`, `.map-mark-visited`, `.map-legend`, `.map-toggle-btn`, `.map-you-marker`) **is already deleted**; none of them exists in any stylesheet.

Exactly four `.map-*` classes survive repo-wide, and **all four have live consumers** — `.map-back-btn` and `.map-collectible-badge` (`css/25-toolbar.css`, both used by `ui-render-map.js`, deliberately reused verbatim by the reskinned sector sheet per Protocol 22) and `.map-caption` / `.map-svg-wrap` (`css/45-databank.css`, the current SVG node-map). Nothing is orphaned, so nothing was removed.

**The "purely historical comments" were left in place on purpose.** The `25-toolbar.css` block comment is what records _which_ two classes survived the boxed-grid retirement and _why_ (the Protocol 22 reuse decision) — deleting it would strip the only explanation for why two lone `.map-*` rules sit in a toolbar sheet, and invite a future session to "clean up" two live classes. That is load-bearing WHY, not residue. Same for the Suite 189.1 comment.

**What it is.** A reviewer flagged "orphaned `_MAP_ABBREV` / boxed-grid references in the map renderer." Verification (2026-07-18) found the headline symbol is **already deleted and guarded**: `_MAP_ABBREV` / `_mapAbbrev` no longer exists in `js/ui/ui-render-map.js` (nodes plot at real `gridRow` / `gridCol`), and Suite 189.1 fails the build if it ever returns. What actually remains is a little boxed-grid CSS (`.map-cell` and siblings in `css/25-toolbar.css`) — **some of it deliberately reused** by the current SVG map, plus a couple of purely historical comments. So the real job is far thinner than stated.

**What it depends on.** Nothing. It's a cheap cleanup that folds into any commit.

**Done means:** the truly-dead boxed-grid CSS classes (the ones with no remaining consumer) and the stale comments are removed; the classes the SVG map still reuses are left alone; `_MAP_ABBREV` needs no action (already gone).

### K. ✅ The backup script's single-shell dependency — SHIPPED (2026-07-19)

**The shell dependency itself was already closed by the concurrent session, and that is now VERIFIED rather than assumed.** `Get-LocalModeBases` probes both the `AppData\Roaming\Claude` junction _and_ the real physical path globbed from `AppData\Local\Packages\Claude*\LocalCache\Roaming\Claude\…` (no hash hardcoded). Measured from both shells: the sandboxed PowerShell tool sees the Roaming junction as **absent** but the packaged path as **present**, so discovery succeeds either way. A full `-NoPush` run now captures all 5 stores / 92 files identically from both shells.

**But verifying it surfaced the real remaining danger, which is what this unit actually fixed.** `memory/` is MIRRORED — the sync wipes it and re-mirrors only what _this_ run discovered. "No store found anywhere" already failed loudly; a **partial** capture did not, and could not, because the cli-project store lives outside `AppData` and is visible to _every_ shell. So a blind shell would find _something_, skip the loud-failure path, wipe the local-agent-mode store out of the archive, and report "sync complete" — a backup quietly protecting less than it did yesterday, which is exactly the Protocol 48 failure mode.

**Fix — a shrink guard.** Each run records the store labels it captured to `memory/_CAPTURED_STORES.txt` (machine-readable, kept separate from the human `_CAPTURE_MANIFEST.txt` so it never parses report text). The next run compares against it **before clearing anything**, and on any missing store exits non-zero having touched nothing — naming the missing store(s), listing what it did find, and naming the correct shell and exact command. `-AllowStoreLoss` accepts a deliberate removal and re-baselines. A missing baseline file is not a failure.

**Proven, not assumed:** simulating a blind shell (`-MemoryBase` pointed at a non-existent path) trips the guard, exits 1, and leaves all five store folders intact in the archive.

**One real bug found while verifying, fixed in the same pass (Protocol 42).** From the Bash-launched shell the local-agent-mode store was captured **twice** ("6 stores, 166 files" for 5 real stores). Physical-path de-duplication silently fails here: `Get-Item().FullName` echoes the path as given rather than resolving a reparse point in an _ancestor_ directory — and the junction is on `AppData\Roaming\Claude`, not on the leaf — so the two routes to one store produce two different strings. De-duplication now also keys on the store **label** (which carries the session GUID / project slug and is therefore already unique per real store regardless of route). Both shells now report an identical 5 stores / 92 files.

**What it is.** `sync.ps1` (Protocol 48's local-only-artifact backup) runs correctly only from a **Bash-launched** `powershell.exe` — the PowerShell-tool sandbox (user `rog-ally\kadyn`) cannot see `AppData\Roaming\Claude`, so memory discovery finds nothing and the sync fails loudly there. That "works from one shell, not the other" quirk is a single point of failure for the only off-machine backup of `library/`, `planning/`, and the agent memory.

**What it depends on.** Nothing structural. **Note:** a concurrent session is actively fixing this script — this slot exists so the item isn't lost if that fix doesn't fully close the shell dependency.

**Done means:** the backup sync succeeds from any shell the harness can invoke (or fails safe with a clear reported reason), with no reliance on a single shell being able to see the memory store.

### O. ✅ Test-artifacts folder self-cleaning — make "files present" a true failure signal — SHIPPED

**Shipped.** `scripts/gate.js` now clears `test-artifacts/` at the start of every real gate run (after the `--iter` early-exit, so it covers both the fast commit gate and the full push gate), fail-safe so a cleanup error can never abort the gate. Guarded by Suite 235.15. "Files present ⇒ the last run failed" is now a true signal.

**What it is.** `test-artifacts/` accumulates failure screenshots and console logs and is **never cleared**, so stale files from days ago are indistinguishable from a real recent failure. Right now it holds leftover `cap-verify-01.*` files from verifying the capture mechanism. Fix: clear the folder at the **start** of every gate run, so its contents always describe the most recent run and "files present ⇒ the last run failed" becomes a true signal. Today that signal means nothing.

**What it depends on.** Nothing. It's a small change to the gate's setup step — a genuine ride-along, queued as such (not its own unit), per the owner's placement.

**Done means:** the gate empties `test-artifacts/` before it runs, the leftover `cap-verify-01.*` files are gone, and a non-empty folder after a run reliably means that run captured a failure.

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

### P. 🔄 THE MUSEUM — a generated, browsable history of the project (BUILT; reproducibility sub-program in flight, publication still ahead)

**Corrected 2026-07-20 — this entry was stale and wrong.** It read ⬜, as a future proposal that would be "built before the 2.8.5 release." The museum has actually **shipped and been iterated on for days**: the generator runs, the site is generated and committed, four release rooms are hand-written and frozen, and it has had a correctness pass, a release-cadence pass, and three bug-fix sessions since. This entry now describes what exists, what's mid-flight, and what's still ahead — publication.

**What it is.** The private archive repo (Protocol 48's `_RobCo-Archive`) turned into a browsable **museum** of the project's history — an index, a timeline, per-version "rooms," file lists, counts, and mockup galleries. `museum/generate.mjs` in the archive is the generator; `museum/site/` is its committed output (18 MB on its own, ~190 MB once the referenced full-size mockup images are counted — see the publication section below for why that number matters). The mechanism, as built and running:

- **Generated, never hand-curated.** Every view is derived from the archive's folder structure. A hand-maintained museum would rot exactly like the architecture doc's file-size numbers did — the whole point is generation over maintenance (same DNA as the Atlas, item I, and the TEST_CATALOG generator, item D).
- **The ONE hand-written part is the release account** — a short account of what each release was actually about, written at release time when it's freshest, then frozen. **Shipped and approved:** 2.5.0, 2.6.0, and 2.8.0 are frozen; 2.8.5 exists too but is explicitly `draft: true` and marked "in flight" — honest about 2.8.5 not having shipped yet, and will be rewritten once it actually does.
- **A graveyard of abandoned ideas, with their reasoning, exists and is live** (`museum/site/graveyard.html`) — this shipped, not just the concept.
- **Trigger: release-pinned, not pinned to `dev`.** `museum/release-pin.json` records the shipped release tag the museum is generated against (currently `v2.8.0` — 2.8.5 hasn't tagged yet, which is exactly why its room is marked draft rather than pretending to be frozen). Advanced only by `node museum/generate.mjs --release`, and it refuses to pin a tag that doesn't exist — it can't fabricate a release that hasn't shipped.
- **RITUAL, NOT A GATE (hard rule) — still true, unchanged.** It must never block, fail, or delay a release.
- **A correctness pass already ran** (`edfbb05`) — it found and fixed a real defect (a dual-axis growth chart whose normalization made an unrelated pair of series look correlated when they weren't) before any more rooms were added, on the stated principle "prove it current and honest before making it larger."

**P1. 🔄 Museum reproducibility — a sub-program with no home in this file until now.** Three sessions have shipped fixes, all pushed to the archive's `main`; a fourth is in flight right now.

- **✅ Shipped — the CRLF/LF page-renaming bug (`2f4848c`, `5bc7137`, `aa15e9a`).** The machine's SYSTEM `git` config has `core.autocrlf=true`, so a fresh clone checked out every text file as CRLF while the generator writes LF. Because doc pages are named by a hash of their content, that didn't just cosmetically dirty a diff — it **renamed every doc page** on a fresh regeneration, turning the publication diff that's supposed to make disclosure visible into pure noise. Fixed with a `.gitattributes` forcing `eol=lf` (deliberately `text`, not `-text`, so diffs stay line-readable — the whole reason the publication-diff and substitution-guard checks work) plus `sync.ps1` writing LF at the source instead of `Environment.NewLine`.
- **✅ Shipped — the README.txt leak (`76c1970`).** `generate.mjs` walked the filesystem directly, so a gitignored, explicitly-not-archive `README.txt` at the repo root got picked up and published as its own doc page anyway. Fixed by walking `git ls-files` instead of disk — a deliberate choice over merely respecting `.gitignore`, because an untracked-but-not-ignored stray file would still slip through a gitignore-based filter. Artifact count corrected 705 → 704.
- **🔄 IN FLIGHT RIGHT NOW (archive session `local_68504e25`, resumed after hitting the same session limit).** Uncommitted changes sit in the archive's working tree as of `main` at `76c1970` — **no commit exists for this yet; do not go looking for one.** The work: replace content-hash doc-page URLs (`docs/<sha256>.html`) with **path-based** ones derived from the document's archive path, so an address is stable across content edits and only moves if the document itself is renamed. Two things ride along:
  - **A redirect ledger, mined once from this repo's own git history, because the window to do it is closing.** Across every commit that has ever touched `museum/site/docs/*.html`, **306 distinct hash-named pages have existed; 62 of them no longer exist in the current site at all** and are recoverable only by walking history — and once path-based naming lands, nothing will ever regenerate those old hashes again to remind anyone they existed. That's why the ledger is being mined now (`node museum/generate.mjs --migrate-redirects`, a one-time ritual, never part of a normal build) rather than left for later. A normal build then writes an **HTML redirect stub** at each recorded old address, for any hash whose document is still present — chosen over Cloudflare's native `_redirects` file specifically so the museum stays openable straight off disk, not tied to one host.
  - **A thumbnail-render-nondeterminism finding, sidestepped rather than root-caused.** ~11–13 of 28 thumbnail PNGs come out with a few dozen-to-hundred differing bytes on every fresh-clone regeneration — a _different_ subset each run, suspected Chromium PNG re-encode jitter, not diagnosed further. The in-flight fix doesn't chase the jitter: it reuses the previous build's already-committed thumbnail whenever one exists for a given content hash, instead of re-rendering.

- **⬜ Rename permanence — an explicit alias map + a build-time vanished-path check (new, 2026-07-20 — queued, deliberately not urgent).** The path-based-URL work above fixes addresses moving on a content EDIT; it deliberately left alone what happens when a document is later RENAMED or RELOCATED — that session correctly declined to widen its own scope mid-flight, since it was scoped to the hash migration. The owner asked this session whether to widen it. **Answer: yes, but not by the route that looks obvious.**

  **Why NOT automatic rename detection — direct evidence from this same repo.** The in-flight session's own redirect-ledger mining recovered only 305 of 389 historical addresses by walking git history, because git's content-similarity rename detection kept pairing unrelated pages as renames of each other — they share so much page boilerplate around a short body that git judged them the same file moved. **A 22% undercount, and it failed silently.** Building link permanence on the exact heuristic that just proved unreliable on this exact corpus, in this same week, would be building on the thing that just broke.

  **Renames are real here, not hypothetical.** The in-flight session found one while spot-checking: a `planning/_standing/` path that moved to `library/` — the same move R4 (above) recorded.

  **The design — extend the SAME redirect ledger already being built, don't stand up a second one (Protocol 22).** One committed source of truth, three entry states instead of two parallel ledgers to keep in sync: **active** (the current address), **alias** (an old address explicitly recorded at rename time, pointing at the new one — written by a human/session at the moment of the rename, never inferred), and **deleted** (an old address explicitly marked genuinely gone, with a reason — the README.txt-leak fix already produced exactly this case once, correcting the artifact count 705→704).

  **The build-time check — simplified from the obvious shape to avoid inventing a second stale artifact.** A separately-maintained "previously known paths" manifest would just be one more hand-maintained list that can itself go stale (the exact Protocol 2a failure shape). Simpler, with nothing new to go stale: diff the current generated `museum/site/docs/` tree against the **previous commit's** tree (`git show HEAD:museum/site/docs/`) at generate time. Any path present before and absent now, with no matching alias and no matching deleted-entry, prints a loud warning. Git itself is the "previously known paths" record.

  **Ritual, not gate — respected.** Warns to stdout at generate time; never blocks or fails `node museum/generate.mjs`, per the museum's own hard rule (above).

  **Why it's not urgent, and when it becomes urgent.** A broken internal link before publication is cheap — the archive is private, read only by sessions with git history on hand anyway. It matters far more AFTER publication, once links are public and outside anyone's control. **So: queued behind P1's in-flight work, and should land before P2 (publication) — a soft prerequisite, not a blocking one**, the same relationship P1/J already have with P2.

  **Done means:** a rename recorded in the (extended) redirect ledger resolves old→new automatically; a rename NOT recorded is caught loudly by the build-time git-diff check instead of silently breaking; a genuine deletion is distinguishable from an unrecorded rename by its own ledger entry.

- **⬜ The outstanding `file://` redirect click-test (new, 2026-07-20).** The redirect stubs above (HTML, chosen specifically over Cloudflare's native `_redirects` so the museum stays openable straight off disk, not tied to one host) were verified over HTTP but never actually clicked open from a real `file://` location — no controllable browser was available in that session, so it relied on meta-refresh being protocol-agnostic and **said so rather than claiming proof it wasn't in a position to give.** Small, but "opens correctly from disk" is a property the owner actually relies on — it's the entire reason HTML redirect stubs were chosen over a host-specific `_redirects` file in the first place. Close it with a real `file://` open-and-click pass once a session has a controllable browser available, before or alongside P2.

**P2. ⬜ Museum publication — owner-decided this session, not yet built.**

- **Timing, locked:** after the 2.8.5 release, before 2.9.0.
- **A brand-new public repo, `Robco-Exhibit`, built from generated output only.** The private archive can **never** be made public — its git history retains the memory files regardless of any later deletion.
- **Cloudflare Pages, never GitHub Pages — the reasoning is load-bearing and must survive into this file.** A GitHub project site shares the `zerckzzyHD.github.io` origin, which would put the museum in the same **browser origin and localStorage** as the live app — and the archive holds executable HTML prototypes that could read or overwrite wherever the live campaign is stored. Cloudflare serves from its own domain, so the hazard doesn't exist there at all.
- **Owner's real name substituted with `zerckzzy` throughout generation, with a fail-closed guard** — plus credential/token-pattern scanning (pattern-based, not a fixed string list, because the thing being searched for is by definition unanticipated), an approved publication diff of what's newly entering the public set, and link validation run **after** substitution (rewriting text can silently break a path/anchor/href, so validating before substitution proves nothing about the tree that actually publishes).
- **A verified-then-exposed sequence, not verify-after-push.** Push the exact commit to a private target first, verify it there, and only expose that same already-verified commit publicly — never push public and check afterward, because by then disclosure has already happened and can't be retracted.
- **The output is not self-contained** — thousands of references inside `museum/site/` point outside it, at the mockup images living in `planning/`. Copying `museum/site/` alone ships a broken museum; validating links only proves something once the public tree is generated standalone with the private archive unreachable.
- **The owner is owed a step-by-step publication guide when this is actually attempted.** He asked for it explicitly; nothing generated yet.

**P3. ⬜ Museum as an AI-facing resource — DESIGN ONLY, do not build (new, 2026-07-21, owner's idea).** The museum shouldn't just be a thing humans browse; a session should get use out of it the way it gets use out of the library. The reasoning is worth keeping intact, because it's the whole justification: **the library describes what the code IS (current state); the museum records what was TRIED, REJECTED, and LEARNED — the graveyard with reasoning, each bug paired with the guard that now prevents it, the decisions and their why.** For a disposable agent waking with no history, that second category is arguably the higher-value one, because the most expensive session failure isn't bad code — it's confidently re-proposing something already killed for good reasons. The orchestrator did exactly that twice in one evening, _with_ persistent memory; a fresh session has none.

**The hazard is the whole design problem: the museum is HISTORY.** It deliberately contains statements that were true then and are false now — superseded designs, rejected proposals, bugs that no longer exist, three rejected design passes. The library is current-state; the museum is past-state _on purpose_. Feeding past-state to an agent that assumes current-state is precisely how a session earnestly implements something the project already buried. So the guard is **PROVENANCE, not permission**: every fact an agent can reach must carry its status, and it must be structurally impossible to serve an unmarked one.

**Two constraints already committed to the owner, recorded so they're not relitigated:**

- **Sessions must NOT read the generated HTML** (~190 MB of styled pages built for human browsing). The generator already builds an internal manifest; the agent-facing extract comes off that **same source** — one source, two views, the identical ruling already made for `QUEUE.md` (item L).
- **Sessions read the PRIVATE source, never the published exhibit** — the public one is name-substituted (`zerckzzy`), so a session reading sanitized output would be reading a subtly false record of its own project's history.

**Critical evaluation of the provenance design — a failure mode found, and the better version.** The naive design ("tag every entry current/superseded/rejected/closed; refuse to serve an unmarked one") has two holes:

1. **Status isn't cleanly a per-document property.** A _current_ document can contain a sub-claim that was later superseded; a _rejected_ design can contain a sub-decision that was later adopted (three rejected passes still contributed surviving ideas). A flat per-document label leaks stale sub-claims under a "current" banner and buries revived ones under "rejected."
2. **A hand-set status flag decays** — "current" is a claim that rots the moment something supersedes it, and _who remembers to flip current→superseded_ is the exact hand-maintenance drift every other fix this week fought (the 40× file sizes, the test-count comments, this very skill).

**The better version — derive status from a graph, and fail closed:**

- **Derive status from an explicit supersession/rejection LINK graph, not a remembered flag.** An entry is _superseded_ iff something later carries a `supersedes:` link to it; _rejected_ iff marked so at creation (with its reason); _current_ iff nothing supersedes it. Same "derive, don't hand-maintain" lesson as everything else — and it makes the extract carry the links, so an agent reading a rejected design can follow "…but see X, which revived part of it" instead of taking a flat "rejected" at face value.
- **Fail CLOSED on unknown status.** "Structurally impossible to serve an unmarked one" is honored by making an undeterminable entry resolve to the _most cautious_ label — "unverified history, treat as past-state" — never to "current." Unmarked must be the safe default, not an assumption that everything got marked.
- **Every non-current entry MUST carry a `why`, enforced at build (fail the build if missing).** A bare "rejected" is a landmine; "rejected, and here is why" is the single most useful artifact in the archive. The build refuses to emit an unexplained rejection.

**Where it sits.** It **depends on P1** (museum reproducibility / path-based addressing) — the extract keys off stable document identity, and building it on addresses that still move on every content edit would bake in the exact instability P1 exists to remove. It is **independent of P2 (publication)** and should NOT wait on it: the agent value (stop sessions re-proposing killed ideas) is immediate and reads the private source, which needs no public exhibit. So: **after P1, alongside/independent of P2.** It touches the archive's `museum/generate.mjs`, which lives in the sibling `_RobCo-Archive` repo — **a separate session; this is design only.**

**Done means (when eventually built):** an agent-facing extract is generated off the museum's internal manifest (never the HTML, never the sanitized public tree), every entry resolves to a status derived from an explicit link graph with fail-closed defaults, no non-current entry ships without its `why`, and a session reading it cannot mistake a buried past-state fact for current guidance.

**What it depends on.** The archive repo and its folder structure (exists, Protocol 48) — the re-pin (R4) and ongoing sync keep it current. P1 (reproducibility), the rename-permanence work, and the `file://` click-test (all above) should finish, and ideally J (below) should exist and pass, before P2 (publication) is attempted — a publish-time diff check is only trustworthy if the thing being diffed reproduces the same way every time, and once public, a broken address is no longer cheap to fix. ✅ **The App Check debug-token blocker on publication is CLEARED (2026-07-20)** — all three tokens were deleted in the Firebase console and the dead string is out of the archive. See the App Check entry in the 2.9.0 round.

**Done means (P core, met):** a generator produces the museum from the archive's structure, its first run backfilled all shipped versions plus the graveyard, each release gets one frozen hand-written account, and the whole thing is a release-time ritual that can never block a release. **Done means (P1, in flight):** a fresh clone regenerates the museum byte-identical to what's committed, with old hash addresses still resolving via the redirect ledger. **Done means (P2, not started):** `Robco-Exhibit` is live and correct on Cloudflare Pages, verified before exposure per the sequence above, and the owner has a step-by-step guide for doing it again next time.

### J. ⬜ Museum reproducibility CI — turn three sessions' hand-proof into a standing gate (new, owner: "go with recs")

**What it is.** A GitHub Action on the archive repo that, on push, clones fresh onto a machine that has never seen this project's setup, regenerates the museum, and **FAILS if the output differs** from what's committed.

**Why it belongs in the queue.** Museum reproducibility is, right now, a property that **three sessions proved by hand this week** — the CRLF/LF fix, the README-leak fix, and the in-flight path-based-URL work all discovered and closed real reproducibility bugs, one at a time, by someone noticing. A property that's only ever proven by hand can silently stop being true, and nobody finds out until publication day, which is exactly the wrong day to find out. This converts the hand-proof into a standing guard — the same fix-the-class-then-guard-it pattern already used elsewhere in this project (the architecture-conformance scanner, the doc-reference integrity gate, the Protocol 1 cache-bump guard).

**The known objection, recorded honestly rather than glossed over.** A Linux-only CI runner was already a real mistake once on this project — the app repo's own CI ran Linux-only for a stretch even though Windows is the machine the site is actually built on, and was later hardened to run both (`CHANGELOG.md`). This is different in kind, not just a repeat: the **point** of this CI is the platform mismatch. The runner doesn't try to prove Linux works in isolation — it clones fresh and compares its OWN regenerated output against output that was generated on Windows and committed. A pass proves the two platforms **agree**; it doesn't assert either one is "the right" platform. That's a meaningfully different claim than the earlier mistake.

**What it does NOT cover — stated up front, not discovered later.** All reproducibility proof to date is from **one machine** — the same OS, Node version, git version, and Chromium build every time. Node-version differences and Chromium-build differences (relevant to the thumbnail-jitter finding in P1) are unverified. And generation depends on the sibling **app repo** being checked out at the right commit/tag — a dependency living entirely outside the archive, which this CI would also need to resolve (clone or fetch the app repo at the pinned ref) rather than assume is sitting on disk.

**What it depends on.** P1 (museum reproducibility) should be finished — no point gating on a regeneration path that's still being actively changed.

**Done means:** a fresh-clone regeneration runs in CI on every push to the archive, fails loudly on any byte difference from the committed `museum/site/`, and the coverage gaps above (single-machine proof, the app-repo dependency) are stated in the workflow's own comments so a future session doesn't mistake a green CI run for more assurance than it actually gives.

### L. ⬜ A generated, private HTML view of THIS queue — plus a deferred, opt-in player-facing view (new, owner-approved this session)

**What it is.** `QUEUE.md` is 900+ lines / ~160 KB — not something the owner can comfortably read on a phone, even though this is the file he actually steers the project from. Generate an HTML view of it.

**The ruling — ONE SOURCE, TWO GENERATED VIEWS.** `QUEUE.md` stays the single source of truth; nothing about how it's written or maintained changes. Two separate generated views read from it:

- **A private view, for the owner** — generated unfiltered, everything in this file, in a phone-readable format. Build this one soon; it's small and immediately useful on its own.
- **A player-facing view, for the live site's already-queued "upcoming updates" feature** — generated later, from **only** items explicitly marked public in this file. **The marking must be opt-in, never opt-out** — a forgotten mark means a player silently misses an update, which is the safe failure direction, rather than internal reasoning silently leaking to players, which isn't. Same fail-closed shape as the museum's name-substitution guard (P2, above) — deliberately, not by coincidence: both are "generate a public artifact from a private source, and default to withholding when a marking is ambiguous or missing."

**Why the two views are not merged into one document.** This file's value is that it records rejected options, hazards, and the reasoning behind decisions — not just the current status. A single merged document either leaks that reasoning to players, or gets sanitized down until it stops being useful as the internal steering document it exists to be. Keeping the source private and generating a filtered public view is the only way to keep both properties: full internal reasoning for the owner, a safe public digest for players.

**Sequencing — why the public view waits.** The private view ships soon. The player-facing view is deliberately left until **after** the museum publication work (P2) — it needs the same substitution-and-fail-closed-guard machinery P2 is building, and building that machinery twice would be wasteful (Protocol 22).

**What it depends on.** Nothing, for the private view. The player-facing view depends on P2's substitution/guard machinery existing first.

**Done means (private view):** a generated HTML page, readable on a phone, reflects the current `QUEUE.md` in full. **Done means (public view, later):** a separate generated page shows only opt-in-marked items, defaults to omitting anything unmarked or ambiguous, and reuses P2's substitution/guard machinery rather than a second implementation of it.

## Group 4 — The end-of-round deliverables (run once the round is finished; ORDERED)

These look back over the completed 2.8.5 round, so they're sequenced last. They're analysis/synthesis, not code, so **none of them gates the `dev → main` release** — the release can ship whenever the code tail (Groups 1 and 3 above + the schematic layout) is done; these can land around it. The re-pin pass (R4) runs at the end of the governance chain (Group 2) — the stamped baseline these deliverables settle on, with the Atlas re-pinning at its own generation time.

### F. ✅ First: the four process refreshes (the workflow review's foundation) — DONE (2026-07-20)

**What it is.** The blind workflow review (G, next) reviews the Dispatch multi-model workflow itself — and a review is only as good as the inputs it reviews. Four things had to be refreshed to current truth FIRST, or the review would critique a stale process:

1. **The session-launch discipline** — the spec-lock / consolidate-before-starting rule (Protocols 8 + 28). **Already current** in the prompt.
2. **The plain-English reporting standard** — the phone-formatted "it's live, here's how to test it" reporting rule (Protocol 9). **Already current** in the prompt.
3. **Protocol-consolidation as evidence the process PRUNES** — U6 is one proof the workflow can remove weight, not only add it. **Strengthened:** the prompt now grounds this in the whole pruning story — the retirement rule (Protocol 49), the three actual retirements (2a / 15 / 18), and the staged trim's remaining stages R5–R7 — not U6 alone.
4. **Copy-paste-block delivery** — the standard for handing ready-to-paste blocks. **Already current** (prompt header), and extended with the DeepSeek workflow-description-only cut (see G).

**How it was done.** The refreshes aren't separate documents — the review's single input IS the standing prompt (`planning/_standing/WORKFLOW_REVIEW_PROMPT.md`, gitignored). Bringing it current WAS F. The same pass also folded in the ~48h of change the prompt was missing (the museum + reproducibility sub-program as §14, Protocol 50, R5–R7) and added the two new audit sections §15/§16. Three of the four subjects were verified already-current against the live `CLAUDE.md`; the fourth was strengthened. Nothing was sent — folding in ≠ sending.

**Done means (met):** all four subjects are current in the prompt, and the prompt is ready to hand to G as its input. ✅

### G. ⬜ Then: the blind workflow review

**What it is.** A blind (independent, no-peeking-at-the-answer) review of the Dispatch three-model workflow — is Fable/Opus/Sonnet actually pulling its weight, are the hand-offs clean, where does the process leak or waste.

**What it depends on.** The four refreshes (F, now ✅) — that's the whole reason F sits in front of it.

**The model roster — decided 2026-07-20, recorded here per Protocol 50 because it had lived only in conversation.** The review still goes blind to **GPT-5.6 Sol** and **Gemini 3.1 Pro Extended** independently, then Dispatch synthesizes. Added for this ONE review: **DeepSeek as a third WITNESS, not a third judge** (GPT's framing, endorsed) — its value is only realized if its dissent is preserved and answered, never smoothed into consensus. Its role is a blind hostile systems auditor of orchestration complexity, epistemic integrity, and unjustified governance weight. Hard rules on it, none negotiable:

- **Free, hosted chat/app only — never the token-billed API.** A free hosted service can change terms or vanish, so it is **never a required gate**, only ever an extra witness.
- **Not run locally** — the Ally can't host anything worth hosting, and the local-model slot was already tested and rejected (ripgrep beat a local model on both speed and accuracy; see the workflow prompt §13).
- **Privacy fence:** DeepSeek's free tier retains inputs and may train on them, processed in China — so it gets the **workflow description ONLY**, never repo contents, archive/memory, keys, or museum internals. This is also the honest reason it can't be a repo-aware reviewer the way GPT-with-GitHub is. The send-time cut strips §14 (museum internals) and anything repo-identifying from the prompt.

**The claim-ledger artifact — GPT's proposal, with the owner-approved amendment.** GPT proposed a ledger of unique claims, disagreements, supporting evidence, evidence-needed-from-the-repo, and status (confirmed / refuted / judgment-call / unresolved), and proposed Dispatch maintain it. **The amendment the owner approved: it must be a COMMITTED FILE IN THE REPO, not held in Dispatch's context** — otherwise it is exactly the unchecked-summary problem GPT's own asymmetry question identifies ("where can Dispatch selectively absorb, weaken, or bury dissent?"), and it dies the moment Dispatch's context ends. So the synthesis of G lands as a tracked repo file, not a chat summary.

**A rejected proposal, kept as a calibration specimen.** Gemini proposed replacing Dispatch itself with DeepSeek-V3-as-dispatcher on speed/cost grounds. Rejected: it described a workflow the owner doesn't have (Dispatch launches sessions on the owner's real machine, reads their transcripts, and holds them to completion — a browser chat tab can't), priced the argument in API tokens when the constraint was _staying free_, and hallucinated unrelated context ("an ADB deployment script on a rooted device"). It's the clean specimen of the failure this review must guard against — a confident, well-written answer to a question nobody asked — and is carried into the prompt (§16) as a worked example for the reviewers. **Model-version caution:** cited DeepSeek figures ("V4"/1M-token context, "R1"/"V3") are past the orchestrator's knowledge cutoff and are vendor claims; the owner verifies the current free offering himself before relying on any advertised capability.

**Honest note on how these decisions reached this file (Protocol 50 in its own mirror).** The DeepSeek roster call and the claim-ledger amendment were both made _in conversation_ and sat unrecorded for hours — a Protocol 50 violation on the same day Protocol 50 shipped. The automated queue-drift nudge did not catch it, and couldn't: it flags `type: project` **memories** the queue doesn't reference, so it catches memory↔queue drift, not **conversation↔queue** drift. Recorded here rather than quietly fixed, because the gap is real and worth a reviewer's eye.

**Done means:** a verdict on the workflow with concrete, checkable findings, run against the current (refreshed) process — not a stale one; synthesized into a committed claim-ledger file; with DeepSeek's dissent preserved and answered rather than averaged away.

### H. ⬜ Optional: the system-model review (owner-gated)

**What it is.** An OPTIONAL external review of the project's system MODEL (its representation of itself), run only if you want it. Per the ecosystem synthesis, it must be kept **small and question-scoped** (a large-context review degrades and tends to adopt your own errors rather than catch them).

**What it depends on.** A **portable brief generated fresh from the now-pinned brain dump** (the §20 spec in the brain dump). That foundation is available now — the brain dump was re-baselined and re-pinned at R4 — so this is unblocked whenever you want it. It is **not** a standing doc: it's generated fresh each time so it's always accurate because it's always new.

**Why it's optional.** Only worth running if you actually want an outside eye on the model; the synthesis was explicit that a ceremonial review isn't worth its cost.

**Done means (if run):** a small, question-scoped external pass returns findings in the required claim → provenance → falsification format, or it isn't run at all.

### D. ⬜ Just before the Atlas: the TEST_CATALOG generator — REDUCED SCOPE after R1

**What it is.** `library/TEST_CATALOG.md` is GENERATED-class **in intent** but hand-synced **today**, and it drifted twice (its headline stale at 3107, then 3358, while reality was 3392). This builds the generator that produces it from the test runner and gate-diffs it against the committed copy.

**⚠ Scope reduced by R1 (the ordering pass flagged this).** R1 deletes the whole test-count bookkeeping, so the "stop hand-syncing the COUNT" half of this item's original rationale is gone. What's left is generating the per-suite **content** (each suite's coverage narration) — which is exactly what the ATLAS assurance view (I) consumes. So D is no longer a count-chasing chore; it's the first concrete instance of "generate what a script can compute" and the plumbing the Atlas reuses.

**What it depends on.** The runner (exists) and R1 (so it isn't built to chase a count that no longer exists). The one genuine gate is a **design decision, not a missing foundation**: `library/` is gitignored, so a naive gate-diff can't run on a clean CI checkout (the same gitignored-`library/`-vs-CI tension the doc-integrity guards already navigate). Resolve that and the generator is straightforward.

**Why it sits here.** Best done alongside/just before the Atlas so they share the "generation over maintenance" plumbing rather than inventing it twice — which is why this ordering pass moved it out of the early leftovers and next to I.

**Done means:** the catalog's per-suite content is regenerated from the runner and gate-checked against its committed copy; no human hand-edits it again.

### I. ⬜ Finally: the ROBCO SYSTEM ATLAS — 8 views over one graph

**What it is.** The synthesis deliverable from the ecosystem cross-review (`planning/2.8.5/audits/ATLAS_ECOSYSTEM_SYNTHESIS.md`): a single generated representation of the whole system, offering **8 views over one graph** — and, load-bearing, the **assurance view is one of those eight** (generated FROM the test suite's structure so it can never drift from what's actually guarded). The governing rule from the synthesis: **generate everything a script can compute; hand-maintain only the un-derivable WHY.**

**What it depends on.** (1) The **pinned baseline** — every Atlas artifact is anchored to one commit and marked degraded when the repo moves (available now: the R4 pin). (2) The **architecture-conformance scanner** (shipped, Suite 236) and a cheap **dependency-structure matrix**, which are the deterministic inputs the assurance/dependency views are generated from. (3) The **TEST_CATALOG generator** (D) — same "generate, don't maintain" plumbing, which is why D is best done just before this.

**Why it's last.** It's the capstone that represents the finished round, and it wants the round finished and pinned to represent it honestly. Its foundations all exist now, so nothing blocks it once the round settles.

**Done means:** one generated Atlas, pinned to a baseline, with 8 views (assurance among them) that are computed from source rather than hand-authored — so it can't rot the way the docs it replaces did.

---

# ⬜ 2.9.0 — Gameplay + The OS Round

This is the big one — a large, multi-part round covering actual gameplay systems, ambient world life, cloud/account features, and the "it's a real operating system" philosophy. Because it's large, **the planning machinery runs at the FRONT of the round, before any building.**

## Planning first (in this order)

This is deliberate planning, not busywork — the round touches gameplay and the core OS at once, so planning it up front prevents four workstreams building four inconsistent things.

1. **Diegetic audit → the HOUSE STANDARD.** Goes first because it derives the in-fiction standard everything else conforms to: the canonical voice and register, the phosphor palette rules, and a locked terminology table (the in-world word for every concept). It walks every screen and every state (loading, empty, error, offline, success) looking for anywhere the terminal fiction breaks and reads like a modern web app, and records the in-world fix for each. Also folds in a repo file-name overhaul where safe. Two minor silent-failure items from the warning-surface inventory (`planning/2.8.5/audits/WARNING_SURFACE_INVENTORY.md`) fold into this audit's error-state walk rather than earning units of their own: a corrupt save slot or corrupt chat history currently just vanishes with no explanation (render a visible "record unreadable" row instead of omitting the slot; post one line when chat history has to reset), and a failed cloud key-sync is silent (one line telling the user the key relay was unreachable and to enter the key manually).
2. Then, in parallel: **the content/data audit** (every database across both games checked for completeness, canon accuracy, and consistency), **the mobile/responsive audit** (every panel at phone and desktop widths — the systematic version of the one-at-a-time mobile bugs — plus recording the supported browser/PWA boundary, which replaces a separate cross-browser audit), **the UI-consistency audit** (cross-panel structural/style consistency plus the gate guards to enforce it going forward), **the cloud audit** (verify the save actually captures every field and survives a full round-trip, plus a new "evaluate every feature for cloud impact" rule), and **a trust-boundary audit** (NEW, 2026-07-14) — a one-off, scoped inventory of everything that crosses into or out of the app and what authority it's given once it does: imported saves, user-typed text that reaches the screen, AI/OCR output, external links, where and how the bring-your-own Gemini API key is stored, and what the service worker fetches. Several of these are already guarded (`escapeHtml`, App Check, popup-only auth, additive-only cloud writes) — the job is finding the boundaries that AREN'T mapped yet. **One named deliverable of this audit is the external-network / CDN chokepoint guard** (moved here from the save-integrity pass, item 5 above, because its correct rule can only be defined by this audit's judgment call about what's core/offline-critical versus intentionally online — a crude near-term "no external URLs" rule would wrongly ban Firebase, which is an intentional online-only dependency). Its sharpened invariant: _no external network resource may become NECESSARY for the core application's install, boot, offline reload, or local-save operation_ — which permits the optional online-only cloud boundary while stopping a future font, script, module, stylesheet, or asset from silently entering the offline-critical path. The **audit** itself is a one-off human sweep; the **guard** it produces is the permanent automated enforcer that outlives the audit. This is a one-off pass, not a standing process: any reusable chokepoint it finds (the CDN guard included) gets encoded as a permanent gate guard, and the rest of the scaffolding is discarded. **Done means:** a finite decision recorded for every boundary crossing, and a guard for any one of them worth making permanent.
3. Then ideation: **a capability ideation pass** (original RobCo-native ideas derived from real device/browser capabilities) and **an AI-feature evaluation pass** (which AI features can be made native to the terminal, each scored on offline behavior, grounding, cost, injection-resistance, and fit).
4. Then **synthesis** — reconcile all of the above into one integrated, dependency-ordered build backlog.
5. Then **parallelization** — split that backlog into independent workstreams.

## Then, before any new OS service: the hardening gate

**This is not a second roadmap — it is the same 2.9.0 round seen from the engineering side.** The architecture review and the gate review (both 2026-07-13) found that every headline OS feature in this round — the CLI, the DIR filesystem, the Peripheral Bus, the Distribution Network — is a **new SERVICE that renders**, and the boundary those services would plug into already carries real, measured debt. Build the services first and you don't carry the debt forward — **you multiply it.** So a short hardening gate runs before any of them lands. The work is subtractive; it adds almost no net new feature.

**What the hardening gate must close (from the architecture review):**

- **The UI↔services dependency cycles.** The render layer had quietly become a _second state manager_: render files call `saveState()` directly and services reach back into `render*()` / `loadUI()`, producing real bidirectional cycles. ✅ **UPDATE (2026-07-18):** the ENFORCEMENT half of this already shipped in the U1–U12 capstone — a static architecture-conformance gate (Suite 236) now **blocks any NEW cross-layer violation**, and the existing debt is measured and **baselined at 20 render→save + 26 service→view + 0 registry** (it can only shrink from here). ⚠ Protocol 23 is therefore **no longer unenforced** — the rule now bites. What this gate item still owes is the **burn-down**: actually invert the baselined edges (services emit, the UI subscribes) so the baseline counts drop toward zero, not just hold. This is still the single highest-damage governance-debt item — a stray `saveState()` on a render path is a data-loss / trust risk — but the ratchet that stops it getting WORSE is already live; the remaining work is paying down the 46 crossings that predate it.
- **Bootstrap isolation.** ~45 boot-phase calls sit under ONE outer try/catch with zero per-phase isolation — a mid-boot throw can leave the app half-initialized. Add per-phase guards so a failing phase is isolated and surfaced, never silently swallowed, and classified fatal-versus-degradable: a degradable failure leaves unrelated functions usable with one clear, persistent notice; a fatal one stops the app pretending it's ready and shows a recovery path instead. Fail loudly, never silently — this is an acceptance criterion for this item, not a new audit.
- **Event-bus hardening.** `RobcoEvents` has no `off` / `once` / dedup and swallows listener errors silently — fine at today's scale, a latent bug factory once dozens of OS subscribers pile on. Harden it before the OS round widens it, and while hardening it, fix the silent-swallow: a thrown event handler must not prevent unrelated handlers from running, and the failure must surface somewhere a session can see it rather than vanishing.
- **The one escaped interval.** The AmbientRuntime heartbeat is already the single scheduler (one 250ms interval driving ~13 observers); exactly ONE stray `setInterval` escaped it. Fold it in so the "one heartbeat" invariant is actually true.
- **An AI state-apply failure must be surfaced to the user (Protocol 24).** A NEW named criterion under this gate's fail-loudly umbrella, added from the warning-surface inventory (`planning/2.8.5/audits/WARNING_SURFACE_INVENTORY.md`), which confirmed it was genuinely absent from this gate's written criteria — this is an addition, not a restatement. Today, when the AI's state update fails to apply, the failure is console-only: the narrative has already played, so the user reads the story, believes the sync happened, and the campaign state silently didn't change. Protocol 24 already forbids the AI from silently owning durable state; the missing half is telling the USER when its update was rejected. One clear line in the transcript — the state update was rejected, the narrative is retained, the campaign is unchanged, re-sync or edit manually — closes it. Same treatment for the quieter variant where a data-lookup mismatch silently skips whole field families during an AI sync.

**Post-deploy TRUTH — the release-integrity gap this round also closes.** Everything the project verifies today answers _"is the repository correct?"_ — offline boot, persisted state, render integrity, the Linux/Windows gate (**pre-deploy confidence**). **Not one check answers _"did the user receive it?"_** — the expected version is live, the service worker actually installs, assets cache without a redirect failure, one critical workflow renders on the DEPLOYED site (**post-deploy truth**). The two can disagree while everything stays green — and they already have: a staging service worker silently failed to install because `sw.js` precached an `index.html` that redirects (browsers refuse to cache a redirect), so "REBOOT TERMINAL" did nothing and users sat on stale code **under a green gate.** Protocol 11 already requires deploy verification, but it is honor-system, so it drifts. The hardening gate turns that one already-proven failure mode into an automated post-deploy check — and when it catches a service-worker install/update failure, the **user** must be shown it, not just a log: detection is not degradation, knowing it failed and telling the user are two different jobs. **This is the home for the "post-deploy verification" idea — release/deployment integrity, not a new initiative or protocol.**

**⭐ Why the order is load-bearing (VERIFIED CORRECT — do not reorder).** Every headline OS feature in this round — the CLI, the DIR filesystem, the Peripheral Bus, the Distribution Network — is a **new service that renders.** The measured baseline (20 render→save + 26 service→view, now enforced by Suite 236) is exactly the seam those services plug into. Build the services first and each one lands on the debt and **multiplies it** — four more services adding their own render→save and service→view crossings on top of 46. Burn the baseline down FIRST (invert the cycles, harden the event bus, isolate boot, fold the stray interval) and the services plug into a clean seam instead. The conformance gate already stops the debt getting _worse_; this ordering is what stops the OS round from _inheriting_ it. The hardening gate MUST sit before any OS service — this dependency is the reason the whole round is sequenced planning → hardening → build, and it is correct as written.

## Also in this round: ✅ APP CHECK — CLOSED (both halves done, 2026-07-20)

**Both halves are now done; this entry is closed rather than carried forward.**

**Enforcement — done.** App Check has been enforced since 2026-07-01 (owner-confirmed). The long-parked MONITORING→ENFORCE reminder was stale — it had been telling sessions to perform work completed weeks earlier — and has been retired from memory. There was no flip to perform.

**The debug token — revoked.** A security scan (2026-07-20) found an App Check debug token committed in the private local-archive repo (Protocol 48's `_RobCo-Archive`); a debug token bypasses App Check verification entirely, so it is a real credential, not a config value. **The owner deleted all three debug tokens in the Firebase console on 2026-07-20** — that deletion IS the revocation, so the strings are now dead. No replacement was registered, deliberately: one gets created on demand the next time local debug work needs it. The dead string was removed from the archive in the same pass (it was harmless but read like a live credential).

**★ The Museum-publication blocker is CLEARED.** Item P no longer waits on anything from this entry.

**One note carried forward for next time.** A future debug token should be **named for its machine and purpose** (e.g. `rog-ally-local-dev`). The three deleted ones had unhelpful names — one was literally "roco local" — and the console masks the values, so there was no way to tell which registration held the leaked string. That is why all three had to go rather than just the one.

**The app repo was never the exposure.** `js/services/cloud.js` sets `FIREBASE_APPCHECK_DEBUG_TOKEN = true` on localhost only, so the SDK mints a throwaway token per session and nothing is hardcoded there.

---

## Then the build

### WASTELAND UPLINK — one ambient engine

**What it is.** A single ambient-life engine that replaces four separate half-ideas. These merge into one system instead of four bolt-ons:

- **The radio**, promoted from today's single synth bed to a real thing (see the radio-tuner feature below) — the engine's shared bulletin bank is what the DJ reads.
- **Random world-map encounter rolls** — they consume the engine's shared seeded-roll infrastructure instead of a separate roller.
- **INTERCEPT** — procedural distress signals / found logs, as the optional online AI-augment layer sitting on top of a static, pre-written broadcast bank.
- **Remote Transmissions** — the online push layer, letting you drop holotapes, bulletins, or events to the terminal from the cloud without a redeploy.

**Day/night cycling is CUT.** Worth knowing the history so it isn't re-proposed: it was cut for accuracy, then reinstated with rad-storm weather, then cut again. The final decision is out. (If it ever comes back, the "dusk/dawn that actually lands" idea — the screen warming at dusk, the DJ greeting the hour — comes back with it.)

**Hard invariant.** This engine can never touch campaign stats or write to a save. It is atmosphere, not mechanics. Ambient rad-storms drive only a cosmetic warning tint, never your real rad value. One kill-switch turns the whole thing off, and it writes zero durable state. Everything it shows must clearly read as a terminal-side broadcast, never mistakable for a real in-game event.

**Why it exists.** Ambient life was being designed four times, in four places, as four disconnected features.

**Done means:** the four features are one engine, behind one kill-switch, writing nothing.

### The gameplay + immersion feature set (the "Round 3" ideas — all 15)

This is a curated, combined list of gameplay and immersion features, all built on the existing New Vegas and Fallout 3 games, all free / bring-your-own-AI-key, all deterministic-native where possible. It was consolidated from two idea passes plus two folded feature-remakes. Here is every item:

1. **Radio tuner overhaul.** Today's single synthesized bed becomes a real tuner with several stations (Radio New Vegas / Galaxy News Radio flavor), each its own distinct procedural music bed plus scripted DJ bulletins and news read from local data (no AI), a tuning dial with static between stations, and station memory. The zero-byte-synth rule stays — no audio files ship.

2. **V.A.T.S. full turn-based combat resolver.** The one-shot V.A.T.S. calculator becomes a deterministic, seeded turn loop: queue body-part shots, spend action points across turns, resolve damage against a bestiary enemy, track both health bars, roll seeded crits and misses, apply damage threshold — actually play the fight out, fully offline. The front end is a tappable body silhouette with per-region hit chance and action-point cost and an action-point budget bar you queue shots into, with the enemy's damage threshold pulled automatically from the bestiary (killing the manual entry).

3. **Build planner / respec station.** A guided S.P.E.C.I.A.L. + skills + perks build tool that enforces level point budgets, perk prerequisites and level gates, and per-game skill caps; lets you compare two builds side by side; and produces shareable build codes. Turns the character sheet into a real planner.

4. **World-map exploration overhaul.** A full exploration journal — discovered / visited / cleared states, a current-location with deterministic travel time and encounter rolls, per-location detail cards (services, NPCs, dangers from local data), and region completion percentages. The native "mark visited" affordance already shipped is the spine this grows from.

5. **Faction consequence engine.** Make reputation actually matter: crossing Vilified or Idolized thresholds triggers real consequences — vendors lock or unlock, bounty hunters show up, faction map markers appear, status effects apply — all deterministic and surfaced natively. Includes an ambient immersion layer and a preview so you can see what crossing a threshold would do before you commit.

6. **Quest tracker overhaul.** The quest log becomes a real tracker: per-quest objective checklists, active/completed/failed states, branching outcomes, quest-giver and location links, a "current objective" line, and a sortable journal. Canon-sourced where the data exists.

7. **Crafting & workbench stations.** Real stations — weapon and armor mods, ammo crafting, chem and food cooking — each recipe gated by components, skill, and station, deterministic and confirm-gated, adding to your inventory. Sits on the inventory-panel foundation below.

8. **Companion / squad management.** Companion cards showing each companion's perks and special ability, affinity/loyalty, the Nerve bonus, a tactics toggle (aggressive/defensive), and a quick-command wheel. Game-agnostic data model.

9. **Geographic per-game map.** Replace the abstract world grid with a stylized, pannable map of the actual region — the Mojave versus the Capital Wasteland — with location pins, fog of war, and fast-travel routes. Built per game from the start (this absorbs the per-game map idea from the deferred program — it lives here, not duplicated). The hard requirement: adding a _new_ game's map must be a clean, well-understood integration path, not a painful refactor — it's fine and expected that drawing a new map (the artwork and coordinates) is real labor, but slotting it in must not fight the system.

10. **Karma & reputation timeline.** A visual history of karma and reputation changes and the events that caused them, with karma-title tracking. And — a recurring pain point of yours, explicitly called out — the karma system must work fully, and there must be a **native** way to log _why_ reputation changed on a manual update (record the cause by hand, never via the AI). This is the "I keep not being able to use a native feature without the AI" complaint, fixed.

11. **Loadout / equipment manager.** Named saved loadouts (weapon + armor + aid), quick-swap, computed weight / damage-threshold / damage-per-second, and comparison. Sits on the inventory-panel foundation below.

12. **Aid & consumables manager.** Active chem effects and their durations, addiction risk, light food/water tracking, and a "what's active" readout — lighter than full hardcore mode. Merges with the partial aid tracking that already exists; not built parallel.

13. **Combat log / kill feed.** A running log of kills, crits, and damage, aggregated into the Overseer's Log stats. Manual entry (add a kill or event by hand) with autocomplete on enemy and weapon names from the registry — native, no AI.

14. **Perk planner / build-up timeline.** Plan perk picks across all levels (per-game cadence — New Vegas every two levels, Fallout 3 every level), with prerequisite unlocks.

15. **Dialogue / speech-check helper.** Given your Speech, Barter, and skills, show which dialogue checks you'd pass. Canon-sourced where the data exists.

**The foundation these sit on — the inventory panel + loadout overhaul.** Before crafting (7) and the loadout manager (11) can land, the inventory panel itself is rebuilt from a flat list into a sort/search toolbar, a per-row inspect drawer (surfacing item weight/value/effect from the database), an in-panel loadout header (total weight versus max, value, count), and per-row equip — with long lists virtualized for performance. Critical discipline: the underlying inventory data stays untouched; everything is derived at display time, so saves and cloud round-trip with zero migration risk. This foundation is built first, then crafting and loadouts layer on. **⚠ Ordering note (2026-07-18): the deferred U8 "virtualize long lists" perf win lands HERE, not as a near-term standalone.** This rebuild replaces the list-rendering path anyway, so virtualizing today's flat list first would just be thrown away when this lands — a Protocol 22 double-build. Build the virtualization once, as part of this foundation.

**One combined ENCOUNTER flow.** V.A.T.S., threat assessment, the combat log, and looting are treated as one guided combat loop reachable from a single ENCOUNTER entry point — assess the enemy, its stats pre-fill V.A.T.S., the fight auto-logs, defeat rolls into loot. The individual pieces stay independently reachable for edge cases (loot a container with no fight, assess without engaging, log a narrative kill by hand).

**One map, not three — and it starts from COORDINATES, not a node graph.** The map was designed three separate ways over time. The decision: build the geographic per-game map (item 9) as the single target. ⚠ **AMENDED 2026-07-13** (the 6-AI map remake — full reasoning in `planning/2.8.5/plans/MAP_REMAKE_REPLIES.md`): the earlier "start with a coordinate-node-plus-radar-sweep first iteration and evolve toward true geography" plan is **wrong and dropped.** A node graph is not a stepping stone to a map — it is the wrong ROOT; everything bolted onto it becomes a special case glued to a picture, and you cannot iterate a graph into a surface. **Start from the coordinate space instead:** every settlement, pin, route, and the player position answers exactly one question — "where is this in Mojave space?" The coordinate system is the product; the artwork is one visualization of it. The first iteration may render crudely (few labels, coarse terrain), but it must render FROM real coordinates, not from a node graph. Simplify the VIEW, never the MODEL. Geometry is still authored from `fallout.wiki` (Protocol 3) — an original drawing, never a trace. The abstract button-grid version is dropped.

**Two big immersion additions folded in here** (beyond simple gameplay): an **emergent CRT "condition"** (the screen can develop character/wear — must be toggleable off, and the dev build must be able to test it) and the **hacking minigame** — the iconic RobCo word-guess hack (seeded puzzle, likeness scoring, attempts and lockout, fully offline). The payoff of a successful hack is that it **unlocks the Diagnostic Shell** — which is already built and shipped; the minigame is the diegetic gate in front of it, and that gate is the one piece not yet built.

**Deliberately NOT in this set** (recorded so they don't come back as surprises): the **holotape archive / audio logs** is dropped (too many, a feature few would use). A **survival / hardcore tracker** is set aside as a possible standalone future version if ever pursued — big enough to be its own thing. An achievements tracker, an NPC codex, and an encounter/loot generator were removed at your direction.

### The OS round proper — "it's an operating system, not a character sheet"

**What it is.** This is where the fiction stops being decoration and becomes the actual interaction model. Much of the underlying architecture already shipped in 2.8.0 (the ambient state machine, the Module Bay, the reorganized system-status area, the bezel nav, and a partial command language). What remains is the rest of the OS vision. Concretely:

- **DIR becomes a real filesystem.** The bezel's DIR key, today a flat "jump to a subsystem" list, formally becomes a browsable filesystem home — folders for the system, archives, intercepts, manuals, user data, and logs. Rule of thumb: if you _read_ it, it's a file under DIR (manuals, reference/lore, the intercepts inbox, the boot log, holotape logs); if you _operate_ it, it's its own surface.
- **A real CLI command prompt.** A genuine typed command line that looks like a proper desktop terminal window on desktop (title bar, prompt line, blinking cursor, scrollback) and adapts to a good touch experience on mobile. It draws over everything, persists across all tabs, and is resizable/closable. It extends the command tokens and quick-log grammar that already shipped rather than reinventing them, and it's full of real utility (query anything, edit any stat, run any tool, navigate the filesystem, save/load) plus power-user features (history, tab-completion, aliases, command chaining) plus fun/diegetic commands and easter eggs (WAR, FORTUNE, a denied SUDO, ASCII art, radio control). The HACK command launches the hacking minigame. The touch and bezel paths always stay first-class alongside it.
- **A Peripheral Bus** — external connected devices as a clean model: the Pip-Boy sync, a radio receiver, a holotape reader, an environmental sensor, an orientation/gyro sensor, a printer, and the already-shipped screenshot OCR reframed as an "optical scanner" device. Reframing OCR here must **not** remove it from the composer where it lives today — it's exposed in both places.
- **A Distribution Network and Data Cartridges** — one channel through which live content and updates arrive (seasonal broadcasts, intercepts, announcements, downloadable offline content bundles as in-fiction "data cartridges"). Ships offline/local by default; the live channel is optional and kill-switch-gated. This complements, not replaces, the existing app-update path.
- **Macros** — optional local automation riding on the command language (chain commands: "prep for combat" opens the inventory, equips a loadout, shows threat).
- **Schematic-mode formalization** — the flat/dense view from 2.8.5 made a first-class OS concept on every tab (a navigation layer and a content layer), preserving the old muscle memory and accessibility.
- **Diegetic renames — a per-term judgment call, not a blanket sweep (owner ruling).** The earlier framing here — "rename every feature into house language" as a blanket sweep — is **no longer approved**. Each candidate rename is judged individually against one rule, in the owner's words: **a themed rename only ships if the in-world word is immediately understandable at a glance. If a user would have to stop and think "what is this screen?", the rename is a regression and does not ship — no matter how good the fiction is. Clarity outranks flavor.** `inventory → manifest` is the concrete example that failed this test and is explicitly vetoed — it does not ship. Themed naming is still wanted where it's obvious and adds charm without costing clarity: the boot sequence, status words, hardware/board names, error framing, the machine's own voice. Where a term is genuinely ambiguous on its own but the flavor is worth keeping, the sanctioned way to have both is the Module Bay pattern (Protocol 25): the real control label rides along as a visible sub-label, so the fiction never obscures the function. One nuance so this doesn't read as a contradiction: the OPERATIONS panel already _displays_ "CARGO MANIFEST" as a board title — that stays, it's decoration on a board. What's banned is retiring the plain word "inventory" as the concept's actual, navigable name.
- **Command-list cleanup** — tidying the accumulated command surface (native tokens, retired macros, aliases). Folded in here rather than done separately, because the OS round rebuilds the command language anyway and cleaning it twice would be waste.
- **Two consolidations that already partly shipped and get finished here:** the **Terminal Record** (one canonical campaign history with multiple views — campaign, incidents, factions, quests, calendar, sessions, hardware events — spanning the campaign save and the device meta-store without merging them), and the **System Status** home (one machine-health surface — health, statistics, diagnostics, condition, maintenance).
- **The Module Bay grows** into the full "install boards / load expansion packs" system it was designed as — the diegetic settings, with power/optics presets and downloadable offline content as cartridges. A **Signal Scanner** verb (actively scan for signals instead of only waiting) and **RobCo Manuals** (HELP opens an in-universe manual, not a tooltip) land as the two new adds.

**Why it exists.** The device should read as a believable OS. Under the hood this round adds almost no _net_ new features — it consolidates everything already planned into a small set of clean subsystems with a governing philosophy, so every future idea has a precise home.

**A guardrail worth remembering — the four metaphor lanes.** Keep each in exactly one lane or it turns to soup: the **launcher/command palette** runs tools; the **filesystem (DIR)** is the diegetic skin over navigation and the home for documents/logs/archives; the **Module Bay** enables and configures capabilities (the settings replacement); **Hardware Life** is the machine's own living self-history.

**Done means:** the terminal has a navigable filesystem, a real command prompt, a peripheral model, a live-content channel, and a consistent in-fiction command language.

### Hardware Life — the machine remembers itself

**What it is.** A whole immersion theme (and a first-class design principle): the terminal is a persistent piece of hardware with its own past and physical life, independent of any campaign. Almost all fabricated atmosphere, no gameplay effect. Parts of this already shipped (boot flavors, the Overseer's Log, system statistics, the shutdown ritual); the rest is queued, built roughly in this order of charm-per-effort:

- **First:** randomized BIOS-style boot codes (a watchable POST sequence — memory test, I/O, security, clock), a hardware-sound layer (relay clicks, fan spin-up, drive seek, capacitor whine — parts of this shipped), and self-acknowledgment chatter (the terminal narrates its own hardware — "idle detected, reducing phosphor wear").
- **Then:** fabricated maintenance logs and error history (with in-world dates), a cosmetic RobCo Diagnostics self-test (RUN DIAGNOSTICS → components PASS, maybe one fake warning — purely cosmetic, never gates anything), RobCo service bulletins and rare in-world ads as broadcast types, and chained transmissions (SIGNAL LOST → later → SIGNAL RESTORED, so the world feels like it exists beyond the screen).
- **Later:** the terminal condition (a "well maintained / field repaired / vault stock" character that drives scratches, boot sounds, phosphor decay — this is the same system as the emergent CRT condition, not a separate one), more screensaver/attract variants, and the filesystem integration.
- **Personality touches:** cosmetic "known quirks" notes ("cooling fan engages aggressively during long sessions") — surplus-hardware flavor, entirely cosmetic.

**Hard invariant.** These features may keep their own small meta-store (boot count, condition, seen logs) but must **never** touch game saves or state; fake diagnostics never gate anything real; everything is toggleable and reduced-motion-safe.

### The free-Firebase cloud / account cluster

**What it is.** A set of cloud and account features built entirely on Firebase's free tier — no paid backend, ever. Enumerated:

- **Cross-device settings sync** — your device preferences (immersion tier, audio, optics, input mode, and so on) follow you across devices via a small per-user cloud document, with genuinely device-specific prefs kept local. Low risk, good value.
- **Real-time co-op campaign** — the marquee one. You and your brother both editing one shared campaign live (one plays and edits, the other watches and edits). This is achievable free with real-time listeners — no server needed — the hard part being conflict handling, which needs its own thorough planning pass before build.
- **A cross-campaign operator record** — an account-level ledger that persists beyond any single save (total playtime, campaigns run, milestones, cross-device boot count) — the "Terminal Record" as operator meta-progression.
- **A shareable read-only campaign snapshot** — publish a snapshot others can view via a share link (with careful public-read rules, no personal data, opt-in per share).
- **A preset / loadout / macro library** stored to your account, reusable across campaigns and devices.
- **Continue-on-another-device** — a "last active campaign" pointer offering resume-where-you-left-off on a new device.
- **Dated / seasonal broadcasts** that unlock on a date (the client checks a timestamp, no server scheduler).
- **An in-app feedback / bug-report channel** writing to a private owner-only collection — useful for a solo dev.
- **Surfacing the existing cloud-save button** more prominently, especially on mobile (it already exists; the gap is discoverability).

**Hard invariant.** Free tier only, everything client-side, manual cloud sync (never auto-push), additive writes, no personal data synced. A settled verdict: no server is needed — everything here, co-op included, is doable free and client-side.

### The Round-2 deferred infrastructure & polish program

**What it is.** The backlog of infrastructure, polish, and feature work consciously deferred from earlier rounds, gathered so nothing quietly rots. Some of it shipped already (the boot decompositions, the event bus, the settings/campaign boundary, the save-import behavioral test, the native conversions, and the first slice of IndexedDB). What remains, enumerated:

- **Full IndexedDB migration** — move _all_ persistence from the current browser storage into IndexedDB as one durable layer, with a bulletproof, reversible migration and exhaustive tests so no existing save, backup, setting, or key is lost. The first shadow-write slice shipped; the read path and the storage-ceiling relief are still ahead. This is a foundational data-safety change, done carefully as its own isolated, rollback-safe unit (which is why it's here, not rushed).
- **A migration test harness** — the exhaustive save-and-storage migration test coverage that the above requires.
- **Full PWA offline shell** — the entire app and every native terminal working in airplane mode, with an offline indicator.
- **Cloud-save conflict resolution and version history** (timestamped slots, local-versus-cloud conflict detection, restore-previous-version) and **full backup export/import** (one file with everything — every campaign, settings, device prefs — for disaster recovery).
- **A deep accessibility pass** (full keyboard nav, screen-reader landmarks, focus management, live regions) and a **performance / list-virtualization pass** (virtualize long lists, lazy-render panels, cut render cost).
- **A native procedural flavor-text engine** — local seeded generators for ambient chatter, distress logs, radio bulletins, and encounter blurbs — "AI residue" made deterministic and offline.
- **A unified settings / profile hub** consolidating the scattered toggles, with export/import and reset-to-defaults.
- **A diegetic onboarding / first-run tour** — a guided, always-skippable intro. Two hard requirements: the "seen it" flag must live in real persistent state (cloud-synced where possible) so clearing the cache or rebooting the terminal does **not** re-trigger the tutorial, and it establishes a standing "what's new" pass so every future feature gets surfaced to returning users (full tour for first-timers, just the new bits for returners).
- **A UX clarity pass** — audit the whole site for anything ambiguous and add inline in-world explanations. The specific ask: the Playthrough Type selector must explain what each type is (reusing one of the preserved warning-banner templates as the info element).
- **A diagnostics export** — a local "diagnostic report" (state, version, errors) that never uploads unless you choose to share it.
- **Per-vendor stock data** — source each vendor's realistic inventory from the wiki so barter is constrained to what a vendor would actually carry, instead of the full item catalog. Realism over buy-anything convenience. Structured so a future game reuses the same format.
- **The deferred half of per-game theming** — per-game framing/accent styling and a full game-styled save-manager layout.
- **A new-game-readiness audit** — audit the whole app so adding a new game is clean data + config, not a painful refactor. Panels hide/show per game, content changes per game, no hardcoded assumptions anywhere shared. Run here so that Fallout 4 (3.0) is a data-add, not a rewrite. The governing principle: authoring a new game's _content_ is expected to be real labor; what must be easy is the _plumbing_.
- **A per-game experience program** — make each game genuinely _feel_ different, all delivered as per-game data: distinct boot/POST flavor, distinct radio stations (each a real programmed station, not the current static synth), distinct ambient and UI sounds, per-game terminology and voice ("Courier" versus "Lone Wanderer"), per-game unique panels shown or hidden, per-game map, per-game faction framing, per-game CRT character, per-game save styling, and a per-game start screen shown only on a game switch.
- **A per-game identity depth pass** — build New Vegas and Fallout 3 to a strong, distinct identity _before_ Fallout 4, so they don't feel behind once Fallout 4 lands. Lean into each game's genuine signature elements (New Vegas: Caravan, the NCR/Legion/House rep web, the Strip, Traits, Mr. New Vegas radio, warm sunset palette; Fallout 3: the Lincoln tracker, Vault 101 origin, Galaxy News Radio, the Anchorage sim, a colder DC-green palette) — depth where it counts, not exhaustive parity.
- **An on-site roadmap display** — a diegetic "upcoming transmissions / development directive" panel showing users a curated public view of what's coming. You wanted this on the site, near the front of the round.
- **The AI generative-residue features** — the AI, framed as the terminal's own intelligence, made native and always optional: INTERCEPT distress logs, radio DJ banter, text-to-speech narration, area-scan encounter generation, an Overseer quest hook, a hacking taunt, screenshot-to-AI parsing, and optional AI banter layers on barter and the medical scan. Each must degrade gracefully offline, never block boot, and never take authority over your state.
- **The held device capabilities** — gyro/CRT-tilt parallax (kept but subtle, off by default, low priority), the share-target receiver, text-to-speech audio logs, and ambient-light optic calibration (deprioritized). These slot into the Peripheral Bus.

**A cross-cutting sequencing note.** The command/tool launcher was redesigned early (in 2.8.0, shipped as the Tool Deck) _before_ piling new tools on — the same "organize before you add" logic as the code refactors. The remaining launcher work (grouping/categories, progressive disclosure, and the type-to-run command palette as its own CLI) lands with the OS round.

---

# ⬜ Machine-family skin re-key — the one FO4-readiness refactor before 3.0

**What it is.** The single scoped refactor the skin-architecture extraction pass (item 4) named as the one thing to do before Fallout 4. Today the entire ~2,000-line Pip-Boy shell CSS is reachable only through `[data-game='FO3']` — it's keyed to the GAME. But a Pip-Boy isn't unique to Fallout 3: Fallout 4's device is the Pip-Boy 3000 Mark IV (its identity literally declares `machine: 'pipboy-3000-mk4'`). This unit re-keys the ~278 Pip-Boy shell selectors in `css/60-fo3-pipboy.css` from `[data-game='FO3']` to a machine-family attribute (`[data-machine='pipboy']`), and wires the already-declared-but-currently-unread `identity.machine` / `structuralMode` fields onto `<html>` as that root attribute (they were put there for exactly this seam and are read by zero lines of code today). Then Fallout 3 and Fallout 4 share the one Pip-Boy body, and only their _true_ differences (Mk IV clean vs. FO3 clunk — colours, material, motion, all already identity data) stay `[data-game]`-gated.

**Why it's small, and honestly scoped.** The extraction pass proved the abstraction held: a new game's **reskin/data half is a clean file-drop** (add `db_fo4.js` + `reg_fo4.js`, one `GAME_FILES` manifest line, one `<option>`, flip the design-only flag — no skin-system change). This unit is only the **re-body half**, and only if Fallout 4 takes the Pip-Boy body (which its `machine` stub implies) — a flat-view Fallout 4 would need zero refactor at all. The whole unit is: re-key one file's selectors, write one root attribute from identity data, give Fallout 4's identity the re-body data it's missing (`rails` / `orientation` / `statusStrip` / `navLamps` — pure data the existing game-agnostic stampers already consume, no code change), and add a guard test that the shell keys off the machine attribute, not the game. Not a re-architecture, not a surprise — the pre-3.0 unit the extraction pass exists to name, planned now instead of discovered mid-3.0.

**Why it sits here.** It's Fallout 4-readiness work — the concrete input to the 3.0 new-game-readiness effort — so it lands just before the Fallout 4 round, alongside the MANIFEST-density polish (below), both cleared before 3.0 proper begins.

**Done means:** the Pip-Boy shell is reachable by any Pip-Boy machine (not just Fallout 3), the dead `machine`/`structuralMode` identity fields are wired to a real root attribute, and a gate test proves a second same-chassis game reuses the shell without duplicating it.

---

# ⬜ MANIFEST density — the last FO3 board-polish item, deferred to just before 3.0

**What it is.** On the Fallout 3 Pip-Boy's cargo/MANIFEST board, the inventory list shows about **5.5 rows at once** against the approved mockup's **6**. It's the one visible gap left over from the FO3 board re-layout — purely cosmetic, nothing is unreachable or broken.

**Why it's not a quick fix.** The obvious move — shrink the rows a touch — isn't available: the row height is already sitting on the Protocol 17 **28px tap-target floor**, so there's no safe room left to reclaim there. Closing the last half-row means a real layout change — reclaiming vertical space from somewhere else on the board — not another CSS nudge. That's more work than the payoff justifies right now.

**Why it sits here.** Your explicit call (2026-07-15): _"skip it for now but save it in queue right before 3.0.0."_ It's low-priority cosmetic, so it waits until just before the Fallout 4 round — a natural moment to give both existing games a final polish pass — rather than blocking anything in between.

**Done means:** the MANIFEST list shows a clean 6 rows at the mockup's density, with tap targets still at or above the 28px floor.

---

# ⬜ 3.0 — Fallout 4

**What it is.** Full Fallout 4 support — its data, its content, its skin, and its custom panels, all built **together** against real Fallout 4 data.

**Why it's one big drop, not incremental.** Fallout 4's systems differ enough (no traditional skills — S.P.E.C.I.A.L. plus a perk chart only, deep weapon crafting, settlements, legendary effects) that the data, the UI, and the panels need to be designed against each other, not bolted on piecemeal. Its device form is the Pip-Boy 3000 Mark IV — visually distinct from Fallout 3's Pip-Boy 3000, using Fallout 4's own in-game look and feel. Fallout 4 gets additional custom panels for its genuinely-new systems (settlements, the perk chart, power-armor frames, legendary gear) on top of the shared dynamic set.

**Why Fallout 4 is "design-only" until now.** The engine already carries a Fallout 4 definition that proves the multi-game abstraction works — but it's intentionally unreachable (you can't select it) until the real data and content exist. When Fallout 4 is first added but not yet populated, the preserved "no data yet" warning template fires on selection. A note for scope: this used to be briefly slated for earlier, then deliberately moved back to 3.0 — Fallout 4 isn't playable until its data exists, so building its UI now would mean building panels for data that doesn't exist yet.

## ⬜ Bundled with 3.0 — the native ES modules migration

**What it is.** Convert the app from global-scope `<script>` files (the current load-order-dependent boot) to native `<script type="module">` with real `import`/`export`. It rides **with** the Fallout 4 round, not before or after — the full reasoning matters, so here it is in four parts:

- **(a) Why bundled with the third game.** Both the ES-modules migration and adding Fallout 4 **rewrite the same boot / load-order surface** — the script manifest, the boot sequence, the game-file selection. Doing them separately pays that cost and risk **twice**, against the exact same code. Bundling them means the boot surface is opened once.
- **(b) The payoff is ENFORCEMENT.** A module can only touch what it imports. That finally makes the layering rule (**render must not write saves; services must not call render** — Protocol 23) **structurally enforced** rather than merely written and scanned for. Today the architecture-conformance gate (Suite 236) is a _static scanner_ that blocks new violations; modules make the boundary a _language-level fact_. This is also the retirement-rule keep-case (see R2): the conformance baseline that freezes the existing 46 crossings **must not be deleted in any trim until this lands** — its risk is live until the boundary is structural. That is the retirement rule working in the _keep_ direction.
- **(c) It is NOT a build step.** Native `<script type="module">` needs **no bundler** — the repo stays the deployed artifact, exactly as today. "No build step" remains **permanent project policy** and must never be read as "no modules." Modules are a browser-native feature; the deploy model is unchanged.
- **(d) Until it lands, the conformance baseline stays.** Restated because it's load-bearing: no trim (R3 or any future one) may delete the architecture-conformance baseline until modules make the layering structural. This is the single explicit dependency between the near-term rules restructure and the 3.0 round.

**Why it sits here and not earlier.** It wants the boot surface open anyway (which 3.0 does), and its enforcement payoff is most valuable right when a third game is multiplying the number of files that could violate the layering. Doing it before 3.0 would open the boot surface twice; doing it after would mean Fallout 4's new files land on the old un-enforced boundary first.

**Done means:** the app boots from native ES modules with no bundler and no build step, the render→save / service→render boundary is import-enforced (not just scanner-enforced), and the now-redundant static conformance baseline can finally be retired under the retirement rule.

**After Fallout 4 ships:** a parity retrofit pass backports any gold-standard per-game ideas discovered while building Fallout 4 back into New Vegas and Fallout 3.

**Done means:** Fallout 4 is a selectable, fully-built third machine.

---

# ⬜ After 3.0 — the recreation / wildcard "for fun" prompt

**What it is.** An open-ended, for-fun analysis exercise: pick existing features and imagine rebuilding each from the ground up into the best possible version. Four tiers — Quick, Medium, Ambitious, and one Mega — each a from-scratch reimagining of a _different existing_ feature (not new inventions), each given the same full treatment (what, why, how, what's better, how it fits, the tradeoff, effort/risk, and whether it needs the full plan-build-audit workflow).

**Why it's dead last.** By your own placement — it's just for fun, and it runs after everything, including the release. Analysis only.

---

# ⬜ Unversioned — recorded, not yet scheduled (with the reason each has no version)

_This is NOT the "parked drawer." The standing rule is that nothing sits vaguely parked — so each item here carries an explicit reason it has no version yet AND what would earn it one. They are consciously unscheduled, not forgotten. Both arrived in the 2026-07-18 placement pass from the two external reviews._

## ⬜ CSS cascade cleanup — replace specificity-bump ancestor selectors with native `@layer`

**What it is.** The stylesheets lean on ancestor-selector specificity bumps to win the cascade in places; native CSS `@layer` would express the same precedence declaratively, without the fragile specificity arithmetic.

**Why it's unversioned.** It's **legitimate but expensive, and nothing is forcing it** — no feature is blocked, no bug traces to it, and it touches the whole cascade at once (high blast radius for a pure refactor). Assigning it a version now would be inventing urgency it doesn't have.

**What would earn it a slot.** A UI/CSS pass that's already opening the cascade — the natural host is the **2.9.0 UI-consistency audit** (which already adds cross-panel style guards) or the Round-2 deep-polish program. When one of those opens the stylesheets anyway, this rides along instead of being its own risky standalone pass.

## ⬜ Wire manual inventory quantity / equip changes into the event log

**What it is.** Manual inventory changes don't reach the Terminal Record (`state.eventLog`). **Verified against `js/ui/ui-render-inventory.js` (2026-07-18) — the gap is real, the reviewer cited docs but the claim holds against code:** adding an item (`item.added`), the quantity ± stepper (`adjItemQty`, which emits nothing at all), and equip (`item.equipped`) all fire **animation/echo handlers only** — no `_logEvent` call. By contrast craft, scrap, trade, sleep, level-up, kills and caps DO log. So a player who manually adjusts their cargo gets a transient on-screen echo but no durable record, while nearly every other native action is recorded.

**Why it's unversioned.** It earned its slot (verification passed) but there's **no version pressure** and it's small. Forcing it into a version now would be presumptuous.

**What would earn it a slot — and the natural home.** The **2.9.0 Terminal Record consolidation** (the canonical campaign-history surface) plus the **inventory-panel rebuild** in the 2.9.0 gameplay set both already establish native, manual, no-AI logging — this is a clean fold-in there (add three `_logEvent` calls at the existing `addItem` / `adjItemQty` / `toggleEquipItem` write points). Left unassigned per the placement directive until that work opens the surface.

---

# Closed / off the board

_Finished or ruled out — listed briefly so they don't resurface as pending._

- **The New Vegas overhaul design audit** — ran during 2.8.0; its fixes shipped.
- **The NV test-save fixture** — shipped as the "load NV test campaign" tool in the Diagnostic Shell.
- **The AI → native + oversight audit** — it ran; it produced the 2.8.0 native conversions.
- **The save-import behavioral test and the Phase-0 foundations** (the AI-directive and boot decompositions, the event bus, the settings/campaign boundary, the native-input-path audit) — shipped in 2.8.0.
- **Main-revert cloud-save compatibility check** — done; the cutover was executed.
- **App Check — fully closed 2026-07-20.** Enforcement has been live since 2026-07-01 (the conflicting parked MONITORING→ENFORCE reminder was stale, not a contradiction, and has been retired). The **debug-token** half closed the same day: the owner deleted all three tokens in the Firebase console, which is the revocation, and the dead string was removed from the archive. **The Museum-publication blocker is cleared.** Detail — including the "name a future token for its machine" note — is in the App Check entry in the 2.9.0 round.
- **Pop-up card standardization** — the design audit swept it: transient pop-ups already use the compact toast, and the persistent "cargo seized" status stays as-is by your decision. A test guards it.
- **Voice input** — sidelined (browser speech is finicky and real scope); on file as a future wildcard only.
- **Day/night cycle** — cut (see WASTELAND UPLINK above for the history).
- **Companion memory, the streaming two-phase narrator, Web Workers, and DLC map zones** — moved out to the Fallout 4 round (3.0), where the heavier AI and data work belongs.
- **Transactional comma-separated commands** — ruled out (owner, 2026-07-18). The current partial-success behavior is **correct**: if you type four comma-separated commands and one has a typo, the other three should still apply. Making the batch all-or-nothing would be a regression, not a fix.
- **Consolidating the ~50 device-preference keys into one master key** — ruled out (owner, 2026-07-18). One master key **increases blast radius on a bad write** — a single corrupt write could take out every preference at once, where today the keys fail independently. The spread-out keys are the safer design.
- **Precaching the OCR engine** — ruled out (owner, 2026-07-18). The **lazy first-use fetch stays** — the OCR engine (Tesseract) is only pulled when the user actually scans, and precaching it would bloat every install for a feature most sessions never touch.

---

_How this file is maintained: `QUEUE.md` is the canonical, in-repo, human-readable roadmap of record — the single place the roadmap lives where a work session can actually find it (the deep contents used to live only in Dispatch's private memory, which is why this file kept coming out vague). It is a maintained doc: whenever the roadmap actually moves, this file is updated in the same commit. Keep it phone-first — structured, scannable, real depth per item, but no walls of text and no code._
