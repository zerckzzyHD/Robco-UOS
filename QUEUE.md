# RobCo U.O.S. — Build Queue

**The one always-current view of what's built and what's next.**
Read top to bottom — it's in execution order. Status tags: ✅ shipped · 🔄 in progress · ⏭️ next · ⬜ queued.

_Last moved: 2026-07-11 (v2.8.0 live on prod, cache r3)._

---

## ✅ 2.8.0 — "The Physical Machine" (SHIPPED, live on prod, cache r3)

The New Vegas overhaul. Every subsystem rebuilt as real RobCo hardware:

- 33 feedback animations + ceremonies M1–M5
- AI → native conversions: USE, TERMINAL stat edits, GPS/MAP, LEVEL UP, PERKS, on-device OCR
- The Diagnostic Shell (159 tools)
- Mobile density pass + the design audit

---

## 🔄 BRAIN DUMP (this session)

Comprehensive Claude-facing reference of the whole project.
Lives at `library/BRAIN_DUMP.md` (local-only, not committed).
This file (QUEUE.md) is its phone-readable companion.

---

## ⏭️ 2.8.5 — "Code + Test Health", then FO3

Do these **in order**:

### 1. Code + test health phase (the spine)

- **Readability / code-org refactor:** file splits, per-file headers, naming,
  dead-code sweep, code map, onboarding doc, glossary, data-shape docs,
  comment markers, tightened linter.
- **Library / token split:** move CLAUDE.md's long suite history OUT of the
  always-loaded doc into `library/`, with an automatic pointer index so a
  session is auto-directed to the right reference.
- **Test-health pass:** strength/gaps, coverage-preserving consolidation,
  assertion-strength / anti-vacuous, static→behavioral balance,
  refactor-resilience prep, flaky hardening, gate-speed profiling,
  catalog reconciliation.
- **Folded in here** (were parked separately): expanded token-usage audit,
  performance audit, accessibility audit, code-quality audit,
  test-strength audit, and the leftover VATS/offline audit
  (sweep for any remaining network dependencies).

### 2. Performance / a11y / asset-and-bundle-size work

### 3. Brain-dump UPDATE — re-baselined on the clean codebase

### 4. FO3 Pip-Boy skin

### 5. Legacy / schematic per-game layout

---

## ⬜ 2.9.0 — Gameplay + The OS Round

**Planning machinery runs at the FRONT of the round:**

1. Diegetic audit + HOUSE STANDARD first (it derives the standard the rest conform to)
2. Then the content / mobile / UI-consistency / cloud audits
3. Then capability + AI ideation
4. Then synthesis into a MASTER_PLAN
5. Then parallelization

**Then the build:**

- **WASTELAND UPLINK** — the ONE ambient engine: radio + map encounters +
  INTERCEPT + remote transmissions merged. Day/night is REMOVED.
  Hard invariant: no stats / no save.
- Command-list cleanup (folded into the OS round's command-language rebuild —
  cleaned once, not twice)
- The Round-2 deferred-work program
- The 8 Round-3 feature ideas
- **The OS round proper:** DIR → filesystem, CLI command prompt,
  Peripheral Bus (incl. OCR-as-scanner), Distribution Network / data cartridges,
  macros, schematic-mode formalization, diegetic renames
- The free-Firebase cluster, including real-time co-op

---

## ⬜ 3.0 — Fallout 4

Data, content, skin, and custom panels built TOGETHER against real data.
FO4 stays design-only (not selectable) until then.

---

## ⬜ After 3.0 — the recreation / wildcard "for fun" prompt

Dead last, by owner's own placement.

---

## Closed / off the board (do NOT re-list as pending)

- NV test-save fixture — shipped as LOAD NV TEST CAMPAIGN (Diagnostic Shell U4b)
- AI → native + oversight audit — it ran; it produced the 2.8.0 native conversions
- Main-revert cloud-save compat check — done
- App Check enforcement reminder — enforced 2026-07-01
- Pop-up card standardization — the design audit swept it: transient pop-ups
  already use the compact toast; CARGO SEIZED is a persistent status and the
  owner ruled those stay as-is (Suite 217 guards it)

---

_How this file is maintained: it is updated whenever the roadmap actually moves,
in the same commit as the change that moved it. Keep it phone-first — short lines,
scannable, no code dumps._
