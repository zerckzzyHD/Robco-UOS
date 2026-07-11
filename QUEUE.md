# RobCo U.O.S. — Build Queue

**The one always-current, in-depth view of what's built and what's next.**
Read top to bottom — it's in execution order. Each item says what it actually is, why it exists, what it touches, and what "done" means.

Status tags: ✅ shipped · 🔄 in progress · ⏭️ next · ⬜ queued.

_Last moved: 2026-07-11._

---

# ✅ 2.8.0 — "The Physical Machine" (SHIPPED · live on prod · cache r3)

**What it is.** The New Vegas overhaul. Every screen of the app was rebuilt to look and behave like a real piece of RobCo hardware instead of a generic character sheet. The bezel became an illuminated keycap nav. Each subsystem got its own bespoke instrument — a load-cell weigh bridge for carry weight, a seven-fader EQ for S.P.E.C.I.A.L., an anatomical zone plate for limbs, a reputation console, a cartography table, a living reactor core.

**Why it existed.** The app worked, but it read as a form with a skin. The owner wanted a believable physical device that reacts to your character's condition — the whole "would RobCo have built this in 2077?" direction.

**What shipped inside it.**

- Every subsystem re-dressed as hardware (OPERATOR, OPERATIONS, DATABANK, UPLINK, CHASSIS, SETTINGS).
- 33 feedback animations — level-up card, faction ink-stamp, map survey ping, damage static-tear, and dozens more, all reduce-motion-safe.
- Five ceremony beats (campaign ignition, the Director's first greeting, firmware flash, long-absence recalibration, the SEAT install motion).
- The AI-to-native conversions: combat math (V.A.T.S.), threat assessment, barter, lookups, medical advisory, looting, level-up, typed stat edits, and on-device screenshot reading (OCR) all now run offline with no AI call.
- The Diagnostic Shell — a 159-tool dev/debug console, leak-proof so production players never see staging tools.
- A mobile density pass and a full design audit.

**Done means:** it's live on production. It is.

---

# 🔄 BRAIN DUMP (this work)

**What it is.** A complete Claude-facing reconstruction of the whole project (architecture, state, every subsystem, every protocol and the bug that caused it, the gotchas, the owner's rules, the workflow, the roadmap), plus this phone-readable roadmap, plus a small pointer index in the rules doc, plus a spec for generating a self-contained brief to hand to other AI models.

**Why it exists.** So every future session starts accurate instead of re-deriving the project from scratch — cheaper and less error-prone. The accuracy pass also surfaced real doc drift (things the old docs claimed that the code doesn't actually do), which got written down so nobody trusts them again.

**Done means:** the deep doc lives locally for Claude, this file is readable on your phone, and the rules doc auto-points sessions to both. Shipped, and maintained from here on.

---

# ⏭️ 2.8.5 — "Code + Test Health", then FO3

This whole version is about making the foundation solid **before** building more on top of it. The items run **in this order** on purpose.

## 1. Code + test health phase — the spine

**What it is.** A cleanup and restructuring of the codebase and the test suite. Three strands:

**a) Readability / code-org refactor.**
The app grew organically into a few enormous single files (the main UI logic and the stylesheet are each hundreds of kilobytes in one file). That's hard to navigate and about to get harder. This strand splits those files sensibly, adds a header to each file explaining what it does, cleans up naming, sweeps out dead code, and produces a code map, an onboarding doc, a glossary, and data-shape docs — plus a tightened linter so the tidiness holds.

**b) Library / token split.**
The rules doc currently carries a giant suite-by-suite test history inside it. That block is loaded into every single session's context — it burns tokens and it has drifted out of sync with reality. This strand moves that catalog OUT into the local library, and wires an automatic pointer index so a session is auto-directed to the right reference instead of loading everything blindly. (The small pointer index added with the brain dump is the seed of this.)

**c) Test-health pass.**
The suite grew to ~2951 tests organically. This strand audits their strength and gaps, consolidates redundant tests without losing coverage, strengthens weak/vacuous assertions, rebalances static checks toward behavioral ones, prepares tests to survive the refactor above, hardens any flaky ones, profiles and speeds up the gate, and reconciles the test catalog with what actually runs.

**Folded in here** (these were separate parked audits — they belong in this phase): the expanded token-usage audit, the performance audit, the accessibility audit, the code-quality audit, the test-strength audit, and the leftover half of the offline audit — a final sweep confirming nothing in the app still quietly reaches out to the network when it shouldn't.

**What it touches.** Essentially the whole codebase (all the script files, the stylesheet, the linter config), the rules doc, the local library, and the test runners.

**Why it sits first.** This is the spine of 2.8.5. Everything after it — FO3, the schematic layout, and eventually the whole 2.9.0 round — would otherwise be built on a codebase that's about to be torn apart and reassembled. Building FO3 first would mean building it twice: once now, once after the refactor. So the restructure goes first, deliberately.

**★ Hard exit condition.** This phase changes the whole file layout, which invalidates large parts of the brain dump's architecture sections. **This phase is not "done" until the brain dump has been re-baselined against the restructured codebase.** (Same condition is written into the brain dump itself, so it can't be forgotten from either side.)

**Done means:** files are navigable and headed, dead code is gone, a code map and onboarding doc exist, the rules doc is lean with the catalog moved out, the test suite is equal-or-stronger coverage with a faster gate and no flakes, and the brain dump is re-baselined.

## 2. Performance / accessibility / asset-and-bundle-size work

**What it is.** With the codebase clean, measure and improve real load performance, accessibility beyond the current baseline, and the size of what ships to the device (the on-device OCR data alone is several megabytes).

**Why it exists.** Mobile-primary means load time and payload size matter on a phone. Easier and safer to do once the code is restructured.

**Done means:** measured, real improvements in load performance, bundle size, and accessibility — not guesses.

## 3. Brain-dump UPDATE — re-baselined on the clean codebase

**What it is.** The explicit re-baseline that closes the hard exit condition from step 1: re-verify the brain dump against the restructured code and rewrite the parts that moved.

**Why it exists.** A stale reconstruction doc is worse than none — it makes sessions confidently wrong.

**Done means:** the brain dump matches the post-refactor reality.

## 4. FO3 Pip-Boy skin

**What it is.** Fallout 3 gets its own distinct machine — its own casing, optics, boot identity, and Director persona — instead of wearing New Vegas's face.

**Why it exists.** FO3 is already fully playable on the data side (its own registries, bestiary, items, factions), but it currently looks like NV. The per-game identity system built during the overhaul already reserves a slot for FO3's own look; right now that slot is a stub. This fills it in.

**Why it sits here.** After the code-health phase, on purpose — so FO3's UI is built on the restructured, clean codebase and doesn't have to be redone.

**What it touches.** The per-game identity/theming layer, the bezel/casing chrome, boot flavor, and the Director presence.

**Done means:** switching to FO3 gives you a visibly different, FO3-native machine.

## 5. Legacy / schematic per-game layout

**What it is.** A plain, flat, "schematic" fallback layout for each game — the stripped-down engineering-diagram view, as an alternative to the full hardware dressing.

**Why it exists.** A schematic-style fallback already exists in one place (the Module Bay's schematic view). This formalizes it into a proper per-game option — a lower-fidelity, higher-clarity mode.

**Done means:** each game has a working schematic-mode layout alongside its full machine.

---

# ⬜ 2.9.0 — Gameplay + The OS Round

A large, multi-part round. Because it's large, **the planning machinery runs at the FRONT of the round, before any building.**

## Planning first (in this order)

1. **Diegetic audit + HOUSE STANDARD.** First, because it derives the in-fiction standard that everything else in the round has to conform to. Establishes the house voice and the consistency rules.
2. Then the content, mobile, UI-consistency, and cloud audits.
3. Then capability + AI ideation (what's newly possible, what ideas fit).
4. Then synthesis into one master plan.
5. Then parallelization (splitting the plan into independent workstreams).

**Why plan first.** This round touches gameplay and the core OS at once; planning it up front prevents four teams building four inconsistent things.

## Then the build

### WASTELAND UPLINK — one ambient engine

**What it is.** A single ambient-life engine that replaces four separate half-ideas. Radio, random map encounters, INTERCEPT, and remote transmissions all merge into one system instead of four bolt-ons. Day/night cycling is deliberately **CUT** (it was scope creep).

**Hard invariant.** It can never touch campaign stats or write to a save. It is atmosphere, not mechanics — a single kill-switch turns the whole thing off, and it writes zero durable state.

**Why it exists.** Ambient life was being designed four times, in four places, as four disconnected features. One engine means one design, one kill-switch, one set of rules.

**Done means:** the four features are one engine, behind a single kill-switch, with zero state writes.

### Command-list cleanup (folded into the OS command-language rebuild)

**What it is.** Tidying the accumulated command surface — the native command tokens, the retired macros, the aliases.

**Why it's folded in here rather than done now.** The OS round rebuilds the command language anyway. Cleaning the list now and then again during the rebuild would be cleaning it twice. So it's done once, as part of the rebuild.

### The Round-2 deferred-work program

The backlog of items consciously deferred during earlier rounds, gathered into one program so nothing quietly rots.

### The 8 Round-3 feature ideas

The eight feature ideas queued from the third ideation round, built as part of this round.

### The OS round proper

**What it is.** Leaning hard into the "it's an operating system, not a character sheet" philosophy. Concretely:

- **DIR → a real filesystem** — directories and files you actually navigate.
- **A CLI command prompt** — a genuine typed command line.
- **A Peripheral Bus** — including OCR reframed as a plugged-in scanner peripheral.
- **A Distribution Network / data cartridges** — content and data delivered as in-fiction cartridges.
- **Macros.**
- **Schematic-mode formalization** — the flat view from 2.8.5, made a first-class OS concept.
- **Diegetic renames** — features renamed into consistent in-fiction language (the house standard from the audit).

**Why it exists.** The device should read as a believable OS. This is where the fiction stops being decoration and becomes the actual interaction model.

**Done means:** the terminal has a navigable filesystem, a real command prompt, a peripheral model, and a consistent in-fiction command language.

### The free-Firebase cluster (including real-time co-op)

**What it is.** A cluster of cloud features built entirely on Firebase's free tier — capped off with real-time co-op (shared/live campaign state between players).

**Why it exists.** The project must stay free (a hard owner rule). This proves out multiplayer-grade features without a paid backend.

**Done means:** the cloud feature set, including live co-op, runs on the free tier.

---

# ⬜ 3.0 — Fallout 4

**What it is.** Full FO4 support — its data, its content, its skin, and its custom panels, all built **together** against real FO4 data.

**Why it's one big drop and not incremental.** FO4's systems differ enough (no traditional skills, deep weapon crafting, settlements) that the data, the UI, and the panels need to be designed against each other, not bolted on piecemeal.

**Why FO4 is "design-only" until now.** The engine already carries an FO4 definition that proves the multi-game abstraction works — but it's intentionally unreachable (you can't select it) until the real data and content exist. That keeps the abstraction honest without shipping an empty game.

**Done means:** FO4 is a selectable, fully-built third machine.

---

# ⬜ After 3.0 — the recreation / wildcard "for fun" prompt

The open-ended, for-fun exploration. Dead last, by the owner's own placement.

---

# Closed / off the board

_Finished or ruled out — listed so they don't resurface as pending._

- **NV test-save fixture** — shipped as LOAD NV TEST CAMPAIGN in the Diagnostic Shell.
- **AI → native + oversight audit** — it ran; it produced the 2.8.0 native conversions.
- **Main-revert cloud-save compat check** — done.
- **App Check enforcement reminder** — enforced 2026-07-01.
- **Pop-up card standardization** — the design audit swept it: transient pop-ups already use the compact toast, and the persistent CARGO SEIZED status stays as-is by owner decision. A test guards it.

---

_How this file is maintained: updated in the same commit as any change that actually moves the roadmap. Keep it phone-first — structured, scannable, real depth per item, but no walls of text and no code._
