# RobCo U.O.S. — Agent Rules

> This file is a pointer. **`CLAUDE.md` is the canonical source** for every
> protocol, the pre-commit/pre-push gate, and the full test-suite reference.
> Read `CLAUDE.md` first, `ARCHITECTURE.md` second.

---

RULES.md and CLAUDE.md were near-identical twins; the full rule text now lives
in **`CLAUDE.md`** only, so there is one source of truth and no drift. All
protocols — including **Protocol 38** (game-agnostic feature code) and
**Protocol 40** (keep `tests/test.html` in sync) — are defined there.

Quick facts (see `CLAUDE.md` for the authoritative detail):

- The gate requires **2510 tests** to pass, mirrored at parity across the Node
  and PowerShell runners in `tests/`.
- State persists to the `localStorage` key `robco_v8`.
- Bump `CACHE_NAME` in `sw.js` on any served-file change (Protocol 1).
