# Subsystem note — UI, Mobile & Accessibility

> **Load this when touching:** `index.html` · anything under `css/` · anything under `js/ui/`
> (render functions, panels, nav, chrome, the Module Bay, the Overseer presence) · any change a
> user can see.
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## Protocol 5 — Adding a New UI Panel

**A new panel must be wired into every panel-wiring point, not just rendered.** The authoritative
list of those points — the render-pipeline fan-out, the badge map, the AI auto-expand map, the
autocomplete wiring — is **`library/CODE_MAP.md` § Render Pipeline → "Panel wiring points"**,
which is derived from source rather than transcribed. Read it before adding a panel, and trust
it over any prose here (Protocol 3, code beats documentation). Then: `CACHE_NAME` bump (Protocol
1), docs (Protocol 2), rendered verification at 360/412px and desktop (Protocol 10), panel
heading standard (Protocol UI-1), sub-panel persistence (Protocol UI-2).

> **Converted from a checklist to a pointer at R3 (2026-07-20).** The old step list named
> `render*()` in `ui-render.js` — true until the render layer was split (U-A1, U-A2, U-A4) and
> false ever since: the pipeline is now nine `ui-render-*.js` files. A checklist that goes stale
> on every refactor is worse than none, because a session follows it confidently into the wrong
> file. The steps were not deleted; they were replaced by the one place that cannot rot the same
> way. The rule — _wire every point, don't just render_ — is what actually mattered and is kept.

---

## Protocol 6 — Adding a Registry Autocomplete Input

**An autocomplete input is wired, not styled** — adding the `<input>` to `index.html` does
nothing on its own. The real wiring points (`initRegistryAutocomplete()` / `wireInput()`, the
per-game `FALLOUT_REGISTRY` categories, and the `addX`/`delX`/`toggleX` CRUD naming convention
its handler must follow) are in **`library/CODE_MAP.md` § Registry** and **§ Render Pipeline**,
derived from source. A new category must be added to **both** per-game data files
(`js/data/reg_nv.js` / `reg_fo3.js`) or it silently returns no suggestions in the other game
(Protocol 38). Then bump `CACHE_NAME` (Protocol 1).

> **Converted from a checklist to a pointer at R3 (2026-07-20)** — same reason as Protocol 5: it
> still pointed `addXxx()` at `ui-render.js`, which no longer holds any `addX` function.

---

## Protocol 10 — UI Verification

Any change touching `index.html`, `css/`, or render JS (`ui-render.js` `render*` functions) must be verified by actually **rendering** the affected UI at **360px, 412px, and ≥1000px (desktop)** before it is considered done — never from headless width measurements alone. Confirm no horizontal page overflow (`document.documentElement.scrollWidth === window.innerWidth`), the component looks correct, and desktop is unchanged.

The definitive verification step is `tests/render-check.mjs` — a Playwright render-check that loads the page at 360px and 412px and asserts no horizontal overflow and no focus-zoom. Run it outside the pre-commit gate whenever map or mobile layout changes land. It is the only check that catches real pixel/overflow regressions.

---

## Protocol 17 — Mobile Baseline

All UI must hold these mobile invariants: focusable inputs render at ≥16px font (prevents iOS/Android focus auto-zoom), interactive controls have ≥28px tap targets, and no component may force horizontal overflow at 360px (`document.documentElement.scrollWidth` must equal `window.innerWidth`). Verify per Protocol 10. No hover-only UI and no desktop-only interactions; design touch-first. Keep focus states visible and never convey meaning by color alone.

---

## Protocol 25 — UX Stability

Existing user workflows must not change unless the requested feature requires it. Improve the current experience before replacing it; preserve user muscle memory. Do not redesign or relocate working UI unprompted.

**Sanctioned exception — owner-approved redesigns (added at the Module Bay unit, WU-B2a):** an owner-approved redesign (reviewed and signed off against a concrete mockup, e.g. the Module Bay reframe of Security & Configuration) is a sanctioned exception to the no-unprompted-redesign rule, provided it holds every one of these guardrails:

- **Same panel location and tab** — the redesign reframes a panel's contents, it does not relocate the panel itself.
- **No increase in tap-count** for any control versus the workflow it replaces.
- **A fallback that preserves the prior mental model** (e.g. a permanent Schematic View / flat compact list) so the old muscle memory still works.
- **Real control labels ride along as searchable sub-labels** so the new fiction never obscures what a control actually does.
- **A control's stored semantics must not change even when its presentation is inverted** (e.g. a mute checkbox re-skinned as an "installed = audible" chip keeps writing the same boolean to the same key).

This both authorizes owner-approved reframes like the Module Bay and codifies the mitigation bar future owner-approved redesigns must clear — it does not loosen Protocol 25 for anything that lacks an explicit owner sign-off against a concrete design.

**Extension — site-wide overhaul + bezel nav (owner-approved, adopted at the Design Overhaul DO-N unit):** the sanctioned-exception clause above extends from a single panel (the Module Bay precedent) to the **whole Design Overhaul program**, under the _same_ five guardrails. It **additionally authorizes replacing the tab bar with the bezel subsystem selector** (DO-N), conditioned on: hotkeys `[1]`–`[5]` (+ `[0]` for the flat fallback) keep working, `role=tab`/`aria-selected` ARIA is preserved, `#go=` PWA deep-links are preserved, and a flat DIRECTORY fallback reproduces the old tab-bar's plain-label mental model one tap away. DO-N's `.nav-cluster[role=tablist]` + `.navkey` keycaps satisfy this: every keycap still routes through the unchanged `switchTab()`, the old tab names ride along as `.nk-sub` sub-labels, and `openBezelDirectory()` is the DIRECTORY fallback.

---

## Protocol UI-1 — Panel Heading Standard

Every `<details class="panel">` in `index.html` must have `<summary><h2>> HEADING</h2></summary>` — the `>` glyph is mandatory. Sub-panels (`class="sub-panel"`) use `<summary><h3>> HEADING</h3>` instead. Never put prose or config summaries directly in a `.panel` summary without an `h2`.

**Clarification (added at the Module Bay unit, WU-B2a):** when a panel's contents are organized into internal boards/sections (e.g. the Module Bay's SLOT sub-panels inside SECURITY & CONFIGURATION), those internal headings use the sub-panel `<h3>> HEADING</h3>` convention — the panel's own `<h2>` summary is unchanged and stays the only `h2` in the panel.

---

## Protocol UI-2 — Sub-Panel Persistence

Every `<details class="sub-panel">` must have a unique `data-sub-id` attribute. The boot wiring in `ui-core.js` reads `robco_panel_state` from localStorage and sets open/closed state for all `details[data-sub-id]` elements. Dynamically-rendered sub-panels (e.g. those inside `container.innerHTML = ...`) must wire their own `toggle` listeners immediately after the innerHTML assignment.

---

## Protocol UI-3 — Tracker Row Pattern

Tracker lists (collectibles, Lincoln items, traits, skill books, magazines) must use:

- `<div class="tracker-row">` for each item row (not inline `font-size`/`letter-spacing` style)
- `<button class="tracker-toggle tracker-toggle--active|--inactive">` for the toggle element (not `<span onclick>`)
- `aria-label` on every toggle button — literal and descriptive (e.g. `"Mark Vault 34 Snow Globe acquired"`), never diegetic
- `<span class="tracker-meta">` for secondary metadata (location hints, skill labels, effects)

---

## Protocol UI-4 — Badge Format

Panel badges show a plain count for most panels. Skill books and skill magazines show `[n/total]` format (e.g. `3/13`). The `_updatePanelBadges()` function in `ui-core.js` is the single source for this.

---

## Protocol UI-5 — Button vs Span for Interactive Elements

Every interactive element that the user can click to change state must be a `<button>`, not a `<span onclick>`. Reasons: keyboard operability (Tab + Enter/Space), native focus styles, screen-reader role announcement. Styling exceptions use `button.tracker-toggle`, `button.faction-btn`, `button.delete-btn`, `button.btn-sm`, etc. — all defined in `terminal.css` with explicit `width: auto` to override the global `button { width: 100% }`.

---

## Protocol UI-6 — Everything Remembers on Reload (owner directive, added at the Module Bay B2b unit)

Any new user-facing **view, mode, or display-choice control** — not just settings toggles — must persist across reloads as a registered `MetaStore` device preference (Protocol 4/23), the same way an audio mute or an optics pick already does. This extends beyond boolean/value settings to include things like which of two equivalent VIEWS a panel is currently showing (e.g. the Module Bay's hardware view vs. its Schematic View fallback), a selected tab, or any other "which mode am I looking at" choice that has no natural campaign-state home.

**How to apply:** register the key in `META_MANIFEST` with a sensible default (Protocol 4), read it once at boot to restore the choice, and write it at the exact moment the user changes it — mirroring the pattern already established for `robco_active_tab` and, as of B2b, `robco_bay_view`. Never let two equivalent DOM states (e.g. two projections of the same underlying prefs) drift out of sync with each other or with the stored choice — route both the boot-restore path and the user-action path through one shared apply function (Protocol 22) so they can't diverge.

> **The cited precedent was itself broken until 2.8.5 item 6 (2026-07-20) — worth knowing, because
> it shows how this rule fails in practice.** `robco_bay_view` looked like a correct UI-6
> implementation: a registered pref, written on every toggle, with a shared `_applyBayView()` apply
> function. But one caller — the boot panel-restore branch in `ui-core.js` — bypassed that shared
> function and called `renderModuleBay()` instead, which repaints the bay and never reads the pref.
> The choice was therefore recorded faithfully and discarded on every reload. **The lesson: "a
> shared apply function exists" is not the invariant — "every path that can set the view calls it"
> is.** When applying this rule, enumerate the callers, including the boot path, and check each one
> actually routes through the shared function. A static guard on the pref's existence will not
> catch this; only rendering a real reload does (it was found by exactly that).

**Why:** A control the user deliberately picked — including which VIEW they were looking at, not just which OPTION they chose within it — silently resetting on every reload is a rough edge users will report every time; treating "remembers on reload" as a default expectation for new UI, rather than an opt-in nicety, keeps that class of report from recurring.

---

## Protocol UI-7 — Device Chrome / Bezel Standard (adopted at the Design Overhaul DO-N unit)

The device bezel/casing is **CSS chrome layered around the working app shell — never a new shell.** The PWA-intact guardrail is absolute: installable / offline / standalone / service-worker must all keep working through every chrome commit. Desktop lays the casing out where space allows (a desk-terminal control strip under the glass); mobile gets a disciplined, non-intrusive edge treatment. Screen curvature/vignette live on the **frame layer only** and must never transform or distort text. Every hardware control the bezel exposes (keycaps, lamps, dials) obeys the centering rule (nothing off-center in an incomplete row) and the Protocol 17 mobile baseline (≥28px tap targets, ≥16px inputs).

**Per-game flavor is data, not code (Protocol 38):** casing material/color and cursor read `GAME_DEFS[ctx].identity` (DO-K) via `[data-game]` CSS attribute selectors — e.g. a `--bezel-wire` custom property that defaults to the local phosphor color and is overridden per game (NV's amber "the wire" split). Flavor **text** (a serial-plate line, a casing subtitle) is swapped the same way — two static spans toggled by `[data-game]` — never a JS `ctx === …` branch. A game with no authored flavor yet gets the generic fallback, never a misattributed borrow of another game's fiction.

**Why:** DO-N (the tab-bar → bezel-nav replacement) is the first unit to build real device chrome; this protocol is what every later per-game machine (DO-M, DO-G) and every future chrome surface is held to, so the PWA-intact guardrail and the frame-only-curvature rule are never re-litigated per unit.

---

## Protocol UI-9 — Motion-Verb Grammar (adopted at the Design Overhaul DO-N unit, SWEEP token; SEAT adopted at the Ceremony Moments Wave 1 unit)

Interactions that change what's on screen speak a shared, named motion vocabulary rather than an anonymous CSS transition. **SWEEP** (introduced at DO-N) is a phosphor smear across the glass on a subsystem-nav change — "re-tuning a channel," not an abstract route swap. **SEAT** (introduced at Ceremony Moments Wave 1, M5) is a 220ms settle — filter/box-shadow brighten-then-fade, deliberately never `transform` — for any "component physically installs" interaction (Module Bay board reseat, phosphor tube pick, program cartridge seat, Tool Deck grip). Every motion-verb keyframe must be a plain `animation:` declaration (never `transition:` alone) so the existing global `prefers-reduced-motion` block (which zeroes `animation-duration`/`iteration-count` on `*`) neutralizes it to an instant resting frame automatically — no bespoke reduced-motion carve-out per verb. Legibility is never sacrificed to motion (SWEEP is a translucent overlay layer, never a transform on the text itself; SEAT never touches `transform` for the same reason — several of its targets, e.g. the program-cartridge stack peek and the Tool Deck's own slide-in, already own `transform` for their own purposes, and a competing `transform` animation would visibly fight them for the animation's duration since CSS `animation` is a single property per element).

**How to apply:** name the verb, implement it as a `@keyframes` + a toggled class (e.g. `.glass-frame.sweep`, `.seat`), and trigger it by adding-then-removing the class (force a reflow between, so repeated triggers restart cleanly) — see `_bezelSweep()` / `_motionSeat(el)` in `ui-core.js`. Per-game texture (`identity.motionTexture.<verb>`, DO-K) is a CSS-only `[data-game]` selector variant on the verb's keyframes — never a JS branch (Protocol 38); see `[data-game='FO3'] .seat` in `terminal.css` for the pattern.

**Why:** codifying the vocabulary now (rather than inventing a bespoke transition per unit) is what lets later units (WAKE/FAULT/BREATHE remain pending, per the Design Overhaul build plan) compose instead of drifting into inconsistent, per-surface motion language; the reduced-motion-for-free property (any verb built as a plain animation is automatically caught by the existing global block) is the load-bearing accessibility guarantee this protocol exists to lock in.

---

## Protocol UI-10 — Overseer Presence (adopted at the Design Overhaul DO-O unit)

Any AI/Director-facing presence surface is a **reskin over the existing chat pipeline, never a fork** (Protocol 22) — a decorative layer (canvas, status strip, header) whose visual state is driven by named states hooked to the **real** request lifecycle (a "thinking" state at the actual network-request window, a "speaking" state for the actual reply delivery, a resting state computed from the actual key/feature-flag/connectivity signals), not a demo timer or an independent animation loop. The presence is **game-agnostic by construction** (Protocol 38): every flavor string (panel title, relay/callsign, status wording, per-state tags) is read from `GAME_DEFS[ctx].identity`'s per-machine block via `getIdentity()`, with a literal generic fallback object for a game that hasn't authored its own — never another game's borrowed fiction — and colour rides the existing `--bezel-wire` `[data-game]` token rather than a JS colour branch.

**Reset ordering is deterministic, never a blind timer-based reset:** when a request-lifecycle hook (e.g. a `finally` block) and an async completion callback (e.g. a typewriter) can BOTH plausibly own the transition back to resting, the lifecycle hook must check the presence's OWN current state before resetting it, and only reset from the state it is actually responsible for (e.g. "thinking") — never overwrite a state a longer-running async step already advanced to (e.g. "speaking"), since the hook's own `finally`/completion frequently runs before that async step has finished.

**Animation gating stacks, degrading to one static frame:** reduced-motion, the Immersion dial (below "balanced"), the Ambient Runtime's power-down states (STANDBY/SHUTDOWN/OFF), and `document.hidden` (tab-hidden) each independently suppress the continuous animation loop — every state CHANGE still paints one correct static frame immediately, so a user under any of these conditions always sees the right resting/thinking/speaking frame, just never an animating one. No bespoke reduced-motion carve-out — a single `_scopeShouldAnimate()`-style gate function is the one place all four conditions are checked, re-evaluated live every frame/on every relevant event.

**Mobile gets a self-contained view, never a permanently-scrolling column:** if the presence's column has no natural tab-gated visibility on mobile (an "always visible" panel that would otherwise render at full length below every other subsystem), it becomes a bounded, internally-scrolling view shown only when its own subsystem is active, with a compact non-`position:fixed` strip shown on every other subsystem so the presence is one tap away and never fully disappears.

**Zero campaign-state write:** the presence's visual state is transient/in-memory (or a MetaStore device pref at most) — never `state.<field>`, `saveState()`, or `robco_v8`. Any device-template "ambient" content the presence emits into the surrounding chat/log (idle flavor lines, etc.) renders without being persisted to that log's saved history.

**Why:** DO-O (the Comm-Link → Director Uplink reskin) is the first unit to build a living AI-presence surface; codifying the standard now — real-lifecycle-driven, game-agnostic, deterministic-reset, gate-stacked-to-one-frame, mobile-self-contained, zero-write — is what keeps a future presence surface (a companion, a terminal familiar, a second AI channel) from re-deriving these rules from scratch or drifting into an independent, un-gated animation loop.

---

> **UI-8 is deliberately unassigned.** The Centering Rule (nothing off-center in an incomplete
> row) is followed informally by DO-N's bezel but has not yet been adopted as its own formal
> protocol — see `planning/2.8.0/plans/DESIGN_OVERHAUL_BUILD_PLAN.md` §8 for the pending text.
> The same §8 holds the pending amendment turning Protocol 10 into a per-machine ×
> per-breakpoint render matrix (gates DO-M).

---

## UI prohibited patterns

| Never Do                               | Why                                                               |
| -------------------------------------- | ----------------------------------------------------------------- |
| `innerHTML +=` inside loops            | O(n²) DOM re-parsing. Use `map().join('')` with single assignment |
| Untrusted text directly as `innerHTML` | XSS risk. Always run through `escapeHtml()` first                 |

---

## Related notes

- Per-game design data (`GAME_DEFS[ctx].identity`): `rules/game-data.md` (Protocol 38)
- Audio toggles inside UI panels: `rules/audio.md` (Protocol 7)
- Device preferences vs campaign state: `rules/state-and-save.md`
- Static class/markup contract guards: `rules/testing-and-gates.md` (Protocol 20)
