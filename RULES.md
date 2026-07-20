# RobCo U.O.S. — Agent Rules

> This file is a pointer. **`CLAUDE.md` is the canonical source** for every
> protocol, the pre-commit/pre-push gate, and the full test-suite reference.
> Read `CLAUDE.md` first, `ARCHITECTURE.md` second.

---

RULES.md and CLAUDE.md were near-identical twins; the full rule text now lives
in the **rulebook** only, so there is one source of truth and no drift.

The rulebook is two layers (2.8.5 roadmap item R2 — *written is not the same as
retrieved*):

- **`CLAUDE.md`** — the universal contract: the rules that apply to all work
  whatever it touches, plus the **retrieval map**. Read every session.
- **`rules/*.md`** — surface-scoped subsystem notes, loaded only when that
  surface is touched. Protocols still live at their own numbers, each in exactly
  one place. **Protocol 38** (game-agnostic feature code) is in
  `rules/game-data.md`; **Protocol 40** (keep `tests/test.html` in sync) and
  **Protocol 44** (every hard-to-trigger feature ships a Diagnostic Shell
  trigger) are in `rules/testing-and-gates.md`.

Start at `CLAUDE.md` and let its retrieval map pick your notes.

Quick facts (see `CLAUDE.md` for the authoritative detail):

- The gate requires the single canonical Node runner `tests/robco-diagnostics.js`
  to pass clean. No test COUNT is tracked anywhere — Protocol 2a was retired
  2026-07-20. (The PowerShell mirror was deleted and Protocol 15 retired in 2.8.5 U-B3.)
- State persists to the `localStorage` key `robco_v8`.
- Bump `CACHE_NAME` in `sw.js` on any served-file change (Protocol 1).
