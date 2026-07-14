# RobCo U.O.S. — Build Queue

**The one always-current, in-depth view of what's built and what's next.**
This is written for you to read on your phone. It's in execution order, top to bottom. Every item that is still ahead says, in plain English: what it actually is, why it exists, what it touches, what "done" looks like, why it sits where it does, and any hard rule it must never break. Nothing is hidden behind a label — if a bucket contains ten things, you'll see all ten.

Status tags: ✅ shipped · 🔄 in progress · ⏭️ next · ⬜ queued.

_Last rewritten in full: 2026-07-11._

---

## Where we are right now (the 5-second version)

- **2.8.0 "The Physical Machine" is SHIPPED and live on production.** The whole New Vegas overhaul, the offline native calculators, the Diagnostic Shell, the ambient runtime, the living core — all live.
- **The brain dump is done** (the deep Claude-facing reconstruction of the project) and this roadmap file is its phone-readable companion.
- **2.8.5's spine — the code + test health restructure — is SHIPPED** (2026-07-12). The heavier test-health/perf/a11y/bundle-size work under that same version number is deliberately deferred to a later pass (your call: stop at the spine, ship Fallout 3 next).
- **The Fallout 3 device skin is IN PROGRESS** (2.8.5 item 4) — units U0-U8 have shipped on `dev` (the Pip-Boy spine, the weathered device casing, the six re-laid-out landscape boards, the scroll-trap fix, a real render-integrity guard that now checks 12 configs across both games, and — U8 — Fable's final Vault Boy figure plus the full U7 audit punch-list closed out). What's left is the deliberately-deferred bottom-dock occlusion unit and the post-FO3 skin-architecture extraction pass — see item 4 below. Then the legacy/schematic per-game layout (item 5).
- **After that is 2.9.0** — the big one: gameplay systems, ambient life, and the "it's a real operating system" round.
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

---

# ✅ Brain dump (SHIPPED, and maintained from here on)

**What it is.** A complete Claude-facing reconstruction of the whole project — the vision, the architecture, every subsystem, every protocol and the bug that caused it, the recurring gotchas, your hard rules, the workflow, and the roadmap. Plus this phone-readable roadmap file and a pointer index in the rules doc.

**Why it exists.** So every future work session starts accurate instead of re-deriving the project from scratch. The accuracy pass also caught real doc drift (things the old docs claimed the code doesn't actually do), which got written down so nobody trusts them again.

**Done means:** the deep doc lives locally for Claude, this file is readable on your phone, and sessions auto-point to both. Shipped.

---

# ⏭️ 2.8.5 — "Code + Test Health", then Fallout 3

This whole version is about making the foundation solid **before** stacking more on top. The items run **in this order on purpose.**

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

**c) ⬜ Test-health pass — NOT done, deferred to a later pass.**
This strand (real assertion-strength audit, coverage-preserving dedup, rebalancing brittle string-match tests toward behavioral ones, flaky-test hardening, gate profiling) did **not** run in this unit, beyond one concrete, related win: **the redundant PowerShell test-runner mirror was deleted** (it caught nothing the Node runner couldn't — its "behavioral" tests just shelled out to Node with a reconstructed sandbox — while costing ~13× the runtime and double the authoring cost of every test), which cut the fast gate from roughly 35s to roughly 12.7s and retired Protocol 15 (the project's first deliberate protocol retirement).

**Folded audits — also NOT done, deferred with strand (c):** the expanded token-usage audit, the performance audit, the accessibility audit, the code-quality audit, the test-strength audit, the leftover offline-network sweep, the asset/bundle-size and caching audit, the dependency/security hygiene pass, and the protocol-consolidation pass. None of these ran in this unit.

**Two test-health items now have a named home here (2026-07-13):** a **real offline-first behavioural test** (does the app actually boot and stay usable offline — not just "the source looks right") and **CI failure-evidence packaging** (when CI goes red, capture the screenshots/logs/artifacts so the failure is diagnosable without a re-run) both belong to this deferred test-health pass — neither is a new unit. The gate review (2026-07-13) put it bluntly: the test count measures how _greppable_ the source is, not that the app _works_ — roughly 65-75% of the suite is static source-text analysis and nothing opens a browser at commit time, which is exactly how an entire panel once rendered invisible under a green gate. The `render-integrity.mjs` guard — "make green mean the user can see it" — is the #1 leverage point and the pattern the rest of this pass should follow. (Consequence worth stating plainly so it isn't treated as a headline metric: the raw test count is not a measure of correctness.)

**Why it sat first.** This was the spine. Everything after it — Fallout 3, the schematic layout, and the entire 2.9.0 round — would otherwise have been built on a codebase that was about to be torn apart and reassembled. Building Fallout 3 first would have meant building it twice.

**★ Hard exit condition — MET.** This phase changed the whole file layout, which invalidated large parts of the brain dump's architecture sections. The brain dump has been re-baselined against the restructured code, closing the condition written into both this file and the brain dump itself.

**Owner's exit line, followed exactly:** _if the phase grows past the spine, stop and ship Fallout 3._ The spine (strands a + b, plus the one concrete test-health win of deleting the redundant runner) is done. Strand (c) in full and its folded audits are real, high-value work — just not spine — and defer to a later pass rather than blocking Fallout 3.

**Done means (as actually delivered):** files are navigable and headed, dead code is gone, the rules doc is lean with the catalog moved out, a doc-reference integrity gate now catches drift automatically, the redundant test runner is gone with zero coverage loss, and the brain dump is re-baselined. The newcomer docs and the full test-health pass are explicitly not part of "done" here — they're queued, not forgotten.

## 2. ⬜ Performance / accessibility / asset-and-bundle-size work (deferred past the spine — see item 1c)

**What it is.** With the codebase clean, measure and actually improve real load performance, accessibility beyond the current baseline, and the size of what ships to the device.

**Why it exists.** Mobile-primary means load time and payload size matter on a phone. Safer and easier to do once the code is restructured.

**Status.** Not started. This is the deferred half of item 1's strand (c) — high-value, not spine — and now sits behind Fallout 3 rather than in front of it, per the owner's exit line.

**Done means:** measured, real improvements — not guesses.

## 3. ✅ Brain-dump update — re-baselined on the clean codebase (SHIPPED, 2026-07-12)

**What it is.** The explicit re-baseline that closes the hard exit condition above: re-verify the brain dump against the restructured code and rewrite the parts that moved. The vision sections stay stable; only the structural sections refresh.

**Why it exists.** A stale reconstruction doc is worse than none — it makes sessions confidently wrong.

**Status.** Done, as part of item 1's spine — see the hard exit condition note there.

## 4. 🔄 Fallout 3 device skin — the virtual Pip-Boy (IN PROGRESS — U0-U9 shipped)

**What it is.** Fallout 3 stops wearing New Vegas's face and gets its own device identity. The panels themselves stay one shared, dynamic set (they already adapt per game — Fallout 3 shows bobbleheads instead of snow globes, the Capital Wasteland map, its own factions, its Karma Center, no magazines). What changes is the **device chrome around them.** New Vegas is a salvaged desk terminal; Fallout 3 becomes the Pip-Boy 3000 itself.

**The preferred form** (your call) is a full "functioning virtual Pip-Boy" body that frames the shared panels — the panels literally become the Pip-Boy's screen. **The fallback**, if that proves too much, is Pip-Boy-themed bezels only. You prefer the full version.

**Why it sits here.** After the health phase, on purpose, so Fallout 3's identity is built on the clean codebase and doesn't have to be redone. A decision already settled: there is no separate ground-up Fallout 3 machine — it inherits the shared panels with per-game data and wears the Pip-Boy chrome over them.

**Done means:** switching to Fallout 3 gives you a visibly different, Fallout 3-native device.

**Found and flagged, not yet fixed (2026-07-13, Protocol 8 U7):** broadening the automated screen-check to actually cover New Vegas on mobile (it previously only ever checked Fallout 3) found that New Vegas's fixed bottom bezel dock — `position:fixed` on every screen under 1000px, by design — can visually cover whatever content happens to render in its own footprint at the current scroll position. Confirmed live on the S.P.E.C.I.A.L. board and a couple of others at 360-412px. Several smaller versions of this same class of bug (a bottom-of-page reserve that was a few px short, a couple of narrow fields clipping their own value) were fixed directly in that same unit — this one wasn't, because fixing it for real means changing how the dock relates to scrollable content, which is a bigger, riskier change than a CSS nudge and deserves its own small unit rather than a rushed patch. Not urgent — nothing is unreachable, it's a landing-scroll cosmetic overlap — but real and worth a deliberate pass.

**Where FO3 actually stands (2026-07-14).** The "done means" above was written before FO3 started; it has since shipped **units U0-U9** on `dev`: the Pip-Boy spine and sub-view switching, the weathered device casing (nameplate, radio knob, status gauge, settings toggle), the six re-laid-out landscape boards (merged STATUS around the Vault Boy figure, seven-row S.P.E.C.I.A.L., list-plus-detail SKILLS/PERKS/MANIFEST, plain boxed mission/faction/karma readouts), the scroll-trap and bounded-glass fixes, the all-green-glass discipline, and a real **render-integrity guard** (`tests/render-integrity.mjs`) that now asserts across **12 configs** (both games × phone/desktop × populated/empty) and has already caught and fixed real defects in BOTH games. The full independent audits are `planning/AUDIT_FO3_U7.md` and `planning/AUDIT_FO3_U8.md`. **U8 closed the entire U7 audit punch-list** (render-integrity allowlist matching the bezel dock by actual DOM membership; Fable's approved VARIANT A Vault Boy figure — a full hand-drawn redraw, verified legible at the real 780×360 size; MANIFEST density improved via a one-tap filter-row toggle; the crippled-limb chip spelling out "CRIPPLED" in full; the perk-list delete "✕" reset to green) **but the U8 audit found it shipped two real regressions of its own:** the body-part health toggles were laid out on the opposite side from the Vault Boy figure limb they actually control (tapping L.ARM lit up the figure's right side and vice versa — the owner's own bug report, reproduced and root-caused), and the "last remaining red element" CHANGELOG claim was false (three more red states — the radiation readout, the RadAway alert, and the low-HP screen glow — were still red). **U9 fixed both**, verified with a live red-then-green Playwright demonstration for the mirror fix (a new render-integrity assertion — box-vs-figure limb side correspondence — now guards it permanently) and a direct computed-style check for the red-removal (all four elements confirmed green with their non-colour meaning intact: the ✕ glyph, the "NONE IN PACK" text, the numeric RAD value). U9 also closed the U7 "RAD value clips" carry-forward (now visible without scrolling) and made a small, honestly-partial dent in the MANIFEST-density carry-forward (still short of a clean 6th row — the row height is already at the Protocol 17 28px tap-target floor, so there's no further safe room to reclaim without a bigger layout change).

**Still owed on FO3, before it counts as "done":**

- **The fixed bottom-dock occlusion** (flagged just above) — its own small unit, because the real fix changes how the dock relates to scrollable content rather than nudging a CSS value.
- **MANIFEST density** — still ~5.5 rows against the mockup's 6; the row height is already at the Protocol 17 28px tap-target floor, so closing the last gap needs a bigger layout change (reclaiming space from elsewhere on the board), not another CSS nudge.
- **The owed post-FO3 skin-architecture extraction pass** — once FO3's skin is finished, measure how much of it was genuinely per-game vs. shared chrome, so the FO4 question — "is FO4 a clean file-drop or a real refactor?" — is answered with evidence rather than a guess. This is the concrete input to the 3.0 new-game-readiness work, and it is best run while the FO3 skin is fresh.

## 5. Legacy / schematic per-game layout

**What it is.** The plain, flat, chrome-less "schematic" fallback layout — the dense engineering-diagram view — brought current and made correct and dynamic for every game. As the fancy hardware boards were built, this fallback layout drifted; this fixes it so it reflects the current feature set and adapts per game like the immersive panels do.

**Why it exists.** A flat, high-clarity, high-density alternative to the full hardware dressing already exists in one place (the Module Bay's schematic view). This formalizes it per game. The fuller "schematic mode on every tab" formalization is split off into the OS round (2.9.0); this 2.8.5 unit is about making the flat layout correct and dynamic for all games.

**Done means:** each game has a working, current schematic-mode layout alongside its full machine.

---

# ⬜ 2.9.0 — Gameplay + The OS Round

This is the big one — a large, multi-part round covering actual gameplay systems, ambient world life, cloud/account features, and the "it's a real operating system" philosophy. Because it's large, **the planning machinery runs at the FRONT of the round, before any building.**

## Planning first (in this order)

This is deliberate planning, not busywork — the round touches gameplay and the core OS at once, so planning it up front prevents four workstreams building four inconsistent things.

1. **Diegetic audit → the HOUSE STANDARD.** Goes first because it derives the in-fiction standard everything else conforms to: the canonical voice and register, the phosphor palette rules, and a locked terminology table (the in-world word for every concept). It walks every screen and every state (loading, empty, error, offline, success) looking for anywhere the terminal fiction breaks and reads like a modern web app, and records the in-world fix for each. Also folds in a repo file-name overhaul where safe.
2. Then, in parallel: **the content/data audit** (every database across both games checked for completeness, canon accuracy, and consistency), **the mobile/responsive audit** (every panel at phone and desktop widths — the systematic version of the one-at-a-time mobile bugs), **the UI-consistency audit** (cross-panel structural/style consistency plus the gate guards to enforce it going forward), and **the cloud audit** (verify the save actually captures every field and survives a full round-trip, plus a new "evaluate every feature for cloud impact" rule).
3. Then ideation: **a capability ideation pass** (original RobCo-native ideas derived from real device/browser capabilities) and **an AI-feature evaluation pass** (which AI features can be made native to the terminal, each scored on offline behavior, grounding, cost, injection-resistance, and fit).
4. Then **synthesis** — reconcile all of the above into one integrated, dependency-ordered build backlog.
5. Then **parallelization** — split that backlog into independent workstreams.

## Then, before any new OS service: the hardening gate

**This is not a second roadmap — it is the same 2.9.0 round seen from the engineering side.** The architecture review and the gate review (both 2026-07-13) found that every headline OS feature in this round — the CLI, the DIR filesystem, the Peripheral Bus, the Distribution Network — is a **new SERVICE that renders**, and the boundary those services would plug into already carries real, measured debt. Build the services first and you don't carry the debt forward — **you multiply it.** So a short hardening gate runs before any of them lands. The work is subtractive; it adds almost no net new feature.

**What the hardening gate must close (from the architecture review):**

- **The UI↔services dependency cycles.** The render layer has quietly become a _second state manager_: render files call `saveState()` directly (~22 calls across 8 files) and there are ~31 service→view (`render*()` / `loadUI()`) call sites across 5 service files, producing real bidirectional cycles. ⚠ **This means CLAUDE.md Protocol 23 — "rendering only renders; state.js owns state; services don't own the view" — is RIGHT as intent but currently UNENFORCED: the code violates it.** The fix is **enforcement, not softening the rule** — invert the edges so services emit and the UI subscribes, then add a gate guard that fails when a render file writes a save or a service calls a render function. This is the single highest-damage governance-debt item in the project today (a stray `saveState()` on a render path is a data-loss / trust risk, not just an afternoon).
- **Bootstrap isolation.** ~45 boot-phase calls sit under ONE outer try/catch with zero per-phase isolation — a mid-boot throw can leave the app half-initialized. Add per-phase guards so one failing phase degrades gracefully instead of taking the rest of boot down with it.
- **Event-bus hardening.** `RobcoEvents` has no `off` / `once` / dedup and swallows listener errors silently — fine at today's scale, a latent bug factory once dozens of OS subscribers pile on. Harden it before the OS round widens it.
- **The one escaped interval.** The AmbientRuntime heartbeat is already the single scheduler (one 250ms interval driving ~13 observers); exactly ONE stray `setInterval` escaped it. Fold it in so the "one heartbeat" invariant is actually true.

**Post-deploy TRUTH — the release-integrity gap this round also closes.** Everything the project verifies today answers _"is the repository correct?"_ — offline boot, persisted state, render integrity, the Linux/Windows gate (**pre-deploy confidence**). **Not one check answers _"did the user receive it?"_** — the expected version is live, the service worker actually installs, assets cache without a redirect failure, one critical workflow renders on the DEPLOYED site (**post-deploy truth**). The two can disagree while everything stays green — and they already have: a staging service worker silently failed to install because `sw.js` precached an `index.html` that redirects (browsers refuse to cache a redirect), so "REBOOT TERMINAL" did nothing and users sat on stale code **under a green gate.** Protocol 11 already requires deploy verification, but it is honor-system, so it drifts. The hardening gate turns that one already-proven failure mode into an automated post-deploy check. **This is the home for the "post-deploy verification" idea — release/deployment integrity, not a new initiative or protocol.**

**Why the order is load-bearing:** invert the cycles and harden the boundary FIRST, then the CLI / filesystem / peripheral bus / distribution network each plug into a clean seam instead of deepening three existing cycles.

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

**The foundation these sit on — the inventory panel + loadout overhaul.** Before crafting (7) and the loadout manager (11) can land, the inventory panel itself is rebuilt from a flat list into a sort/search toolbar, a per-row inspect drawer (surfacing item weight/value/effect from the database), an in-panel loadout header (total weight versus max, value, count), and per-row equip — with long lists virtualized for performance. Critical discipline: the underlying inventory data stays untouched; everything is derived at display time, so saves and cloud round-trip with zero migration risk. This foundation is built first, then crafting and loadouts layer on.

**One combined ENCOUNTER flow.** V.A.T.S., threat assessment, the combat log, and looting are treated as one guided combat loop reachable from a single ENCOUNTER entry point — assess the enemy, its stats pre-fill V.A.T.S., the fight auto-logs, defeat rolls into loot. The individual pieces stay independently reachable for edge cases (loot a container with no fight, assess without engaging, log a narrative kill by hand).

**One map, not three — and it starts from COORDINATES, not a node graph.** The map was designed three separate ways over time. The decision: build the geographic per-game map (item 9) as the single target. ⚠ **AMENDED 2026-07-13** (the 6-AI map remake — full reasoning in `planning/MAP_REMAKE_REPLIES.md`): the earlier "start with a coordinate-node-plus-radar-sweep first iteration and evolve toward true geography" plan is **wrong and dropped.** A node graph is not a stepping stone to a map — it is the wrong ROOT; everything bolted onto it becomes a special case glued to a picture, and you cannot iterate a graph into a surface. **Start from the coordinate space instead:** every settlement, pin, route, and the player position answers exactly one question — "where is this in Mojave space?" The coordinate system is the product; the artwork is one visualization of it. The first iteration may render crudely (few labels, coarse terrain), but it must render FROM real coordinates, not from a node graph. Simplify the VIEW, never the MODEL. Geometry is still authored from `fallout.wiki` (Protocol 3) — an original drawing, never a trace. The abstract button-grid version is dropped.

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

# ⬜ 3.0 — Fallout 4

**What it is.** Full Fallout 4 support — its data, its content, its skin, and its custom panels, all built **together** against real Fallout 4 data.

**Why it's one big drop, not incremental.** Fallout 4's systems differ enough (no traditional skills — S.P.E.C.I.A.L. plus a perk chart only, deep weapon crafting, settlements, legendary effects) that the data, the UI, and the panels need to be designed against each other, not bolted on piecemeal. Its device form is the Pip-Boy 3000 Mark IV — visually distinct from Fallout 3's Pip-Boy 3000, using Fallout 4's own in-game look and feel. Fallout 4 gets additional custom panels for its genuinely-new systems (settlements, the perk chart, power-armor frames, legendary gear) on top of the shared dynamic set.

**Why Fallout 4 is "design-only" until now.** The engine already carries a Fallout 4 definition that proves the multi-game abstraction works — but it's intentionally unreachable (you can't select it) until the real data and content exist. When Fallout 4 is first added but not yet populated, the preserved "no data yet" warning template fires on selection. A note for scope: this used to be briefly slated for earlier, then deliberately moved back to 3.0 — Fallout 4 isn't playable until its data exists, so building its UI now would mean building panels for data that doesn't exist yet.

**After Fallout 4 ships:** a parity retrofit pass backports any gold-standard per-game ideas discovered while building Fallout 4 back into New Vegas and Fallout 3.

**Done means:** Fallout 4 is a selectable, fully-built third machine.

---

# ⬜ After 3.0 — the recreation / wildcard "for fun" prompt

**What it is.** An open-ended, for-fun analysis exercise: pick existing features and imagine rebuilding each from the ground up into the best possible version. Four tiers — Quick, Medium, Ambitious, and one Mega — each a from-scratch reimagining of a _different existing_ feature (not new inventions), each given the same full treatment (what, why, how, what's better, how it fits, the tradeoff, effort/risk, and whether it needs the full plan-build-audit workflow).

**Why it's dead last.** By your own placement — it's just for fun, and it runs after everything, including the release. Analysis only.

---

# Closed / off the board

_Finished or ruled out — listed briefly so they don't resurface as pending._

- **The New Vegas overhaul design audit** — ran during 2.8.0; its fixes shipped.
- **The NV test-save fixture** — shipped as the "load NV test campaign" tool in the Diagnostic Shell.
- **The AI → native + oversight audit** — it ran; it produced the 2.8.0 native conversions.
- **The save-import behavioral test and the Phase-0 foundations** (the AI-directive and boot decompositions, the event bus, the settings/campaign boundary, the native-input-path audit) — shipped in 2.8.0.
- **Main-revert cloud-save compatibility check** — done; the cutover was executed.
- **App Check enforcement** — enforced since 2026-07-01; passive watch only.
- **Pop-up card standardization** — the design audit swept it: transient pop-ups already use the compact toast, and the persistent "cargo seized" status stays as-is by your decision. A test guards it.
- **Voice input** — sidelined (browser speech is finicky and real scope); on file as a future wildcard only.
- **Day/night cycle** — cut (see WASTELAND UPLINK above for the history).
- **Companion memory, the streaming two-phase narrator, Web Workers, and DLC map zones** — moved out to the Fallout 4 round (3.0), where the heavier AI and data work belongs.

---

_How this file is maintained: `QUEUE.md` is the canonical, in-repo, human-readable roadmap of record — the single place the roadmap lives where a work session can actually find it (the deep contents used to live only in Dispatch's private memory, which is why this file kept coming out vague). It is a maintained doc: whenever the roadmap actually moves, this file is updated in the same commit. Keep it phone-first — structured, scannable, real depth per item, but no walls of text and no code._
