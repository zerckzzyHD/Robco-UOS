---
name: robco-uos
description: Orientation for any work on RobCo U.O.S. — the Fallout-themed PWA terminal at C:\Dev\!RobCo\!RobCo-UOS (live at zerckzzyHD.github.io/Robco-UOS). This skill is a POINTER at the canonical rules, not a copy of them. It tells a session where the truth lives and names the few things that bite before the repo is even open; everything else is deliberately left to CLAUDE.md + rules/*.md so this file cannot drift from them.
---

# RobCo U.O.S. — orientation (a pointer, not a rulebook)

**This skill deliberately does not restate the rules.** A copy of the rules is a
second source of truth that silently drifts from the first — which is exactly how
this skill went stale before. So it orients you and points at the canonical source;
it does not duplicate it. **Where this skill and the repo ever disagree, the repo wins.**

## The one instruction

When you are in the repo, **read `CLAUDE.md` first** (the universal contract, checked
in). Follow **its retrieval map** to load the one `rules/*.md` subsystem note for the
surface you are touching — that is the whole point of the map, and it is the only
current list of which note covers what. Then `ARCHITECTURE.md` for design rationale.
Those files are canonical and current by construction (the gate guards them); this
skill is not a substitute for reading them.

## What's useful before the repo is even open

- **Repo:** `C:\Dev\!RobCo\!RobCo-UOS`. Live (production): https://zerckzzyHD.github.io/Robco-UOS/
  (GitHub Pages from `main`). A private staging site builds from `dev` (Cloudflare Pages).
  Vanilla HTML/CSS/JS PWA, no build step. The details are in `README.md` / `ARCHITECTURE.md`.
- **Sister repo:** the private archive at `C:\Dev\!RobCo\_RobCo-Archive` (library, planning, graveyard, memory, museum).
  It has its **own `CLAUDE.md`** — read that one when working there, not this repo's rules.
  Nothing in the archive is ever pushed anywhere public.

## The few things that bite before you've read the rules (each points at the real rule)

These are pointers, not the rules themselves — read the cited protocol in `CLAUDE.md`
(or its `rules/*.md` note) for the actual, current text.

- **Branch:** work on `dev`; `main` is release-only. → Protocol 43.
- **Gate:** the FAST gate runs at commit, the FULL gate (browser checks too) at push — both must pass; never `--no-verify`. → Protocol 36.
- **Cache:** bump `CACHE_NAME` in `sw.js` only when a served/precached file changes. → Protocol 1.
- **AI-contract & saves:** validate + field-map, never blind-persist; saves are sacred. → Protocols 34, 24.
- **Auth changes** need real-device mobile verification before "done." → Protocols 29 / 30 / 31.
- **Fallout game data** comes from fallout.wiki only; the AI is a typist. → Protocol 3.
- **Report** to the owner in plain English after every push (phone-readable). → Protocol 9.

## About this skill itself

Its source is tracked at `skill/SKILL.md`. The copy you are reading is a read-only
cache only the owner can refresh (desktop app → Settings › Capabilities). **Keep it a
pointer** — if a future edit grows it back into a copy of the rules, it will start
drifting again, which is the failure this rewrite exists to end.
