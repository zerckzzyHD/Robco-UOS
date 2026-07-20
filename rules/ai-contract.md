# Subsystem note — The AI Contract

> **Load this when touching:** `js/services/api.js` · `js/services/api-directive.js` ·
> `js/services/api-import.js` · `js/services/api-router.js` · the Tri-Node JSON schema ·
> `getSystemDirective()` · `autoImportState()` · anything that lets AI output reach `state`.
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## The contract (reference)

**Tri-Node JSON schema** — `narrative`, `state`, `modal`. The AI is locked to
`responseMimeType: 'application/json'`; it cannot produce freeform text. The directive builders,
the router grammar, and the import path are mapped in `library/CODE_MAP.md` § AI Contract; the
design rationale is in `ARCHITECTURE.md`.

---

## Protocol 14 — AI Contract Safety

When changing `getSystemDirective()`'s schema or the Tri-Node JSON response shape (`narrative`/`state`/`modal`), add or update a test in the **same commit** that validates the schema and the `autoImportState()` round-trip. The app is locked to JSON AI responses (`responseMimeType: 'application/json'`); a silent schema break is catastrophic and must be guarded by a test.

---

## Protocol 24 — AI Determinism

The AI is never the sole source of truth for durable application state. All AI output must be validated and explicitly field-mapped (via `autoImportState`'s explicit mapping, never recursive key transforms) before it is persisted. If the AI fails or returns malformed data, the app must remain fully usable offline. Never let AI responses overwrite state without validation.

---

## AI-path prohibited patterns

| Never Do                                          | Why                                                            |
| ------------------------------------------------- | -------------------------------------------------------------- |
| Recursive key transformation on AI JSON responses | Use explicit field mapping in `autoImportState()`              |
| Silent drops of inventory during token triage     | Inventory must always be returned when relevant keywords match |

---

## Level ownership

The player owns level. The AI **announces**, it never writes — see the AI/Overseer audit trail
and the directive-authority sweep in `planning/2.8.5/audits/AI_OVERSEER_AUDIT.md`.

---

## Related notes

- Adding a field the AI may return: `rules/state-and-save.md` (Protocol 4)
- The AI is a networked feature — it needs a kill-switch flag and a graceful offline fallback:
  `rules/auth-and-cloud.md` (Protocols 32 / 33 / 35)
- Game facts the AI types come from `fallout.wiki` only: `rules/game-data.md`
- Runtime import contract executed in a real browser: `rules/testing-and-gates.md` (Protocol 40)
