# Planning is PRIVATE

Canonical planning lives in the private archive at **`_RobCo-Archive/!PLANNING/`** — `QUEUE.md`, `QUEUE_LOG.md`, `NORTH_STARS.md`. They were moved out of this public repo on 2026-08-02 (audit finding F04, owner-approved) and are excluded from the museum walk so the archive cannot re-publish them.

Resolve them in code via `scripts/planning-paths.js` (env override `ROBCO_PLANNING_DIR`, else the `../_RobCo-Archive/!PLANNING` sibling). Without that checkout they are simply unavailable — every consumer degrades instead of failing.
