## [v2.0.1] — Map Readability, Audio Depth & Campaign Intelligence<!-- Date: 2026-06-26 | Tests: 209/209 | Cache: robco-terminal-v2.0.1-r8 -->

### [B7] Mobile World Map — 4×4 view and square cells (2026-06-26)

Two remaining mobile map problems fixed in this release.

**The compact 4×4 view never loaded on phones.** When the app starts on a phone, the World Map panel is collapsed by default. Because it was collapsed, the app couldn't measure its width, got zero, and fell back to showing the full 6×6 grid crammed into a tiny phone screen — the 4×4 compact view never engaged. Fixed: the app now falls back to the phone's screen width when the panel width can't be measured. The 4×4 view and its FULL MAP toggle now load correctly from the first open. Also added: opening the World Map panel now re-renders the map immediately, so the layout is always correct for your current screen.

**Map cells were thin horizontal slivers.** Each cell had no set height, so the grid snapped cells to the smallest possible size. Fixed by making cells roughly square (height derived from width via `aspect-ratio: 1/1`) with a 38px floor and centered text.

- Verified at mobile (4×4 core view, square cells, FULL MAP toggle present, zero page overflow).
- Verified FULL MAP (6×6, still no overflow — r7 regression check passes).
- Verified desktop 1280px (4×4 as before, 79×79px square cells, unaffected).

### [B6] Mobile regressions — faction buttons and world map overflow (2026-06-26)

Two visual bugs introduced in the v2.0.1 release.

**Faction buttons were stacking as full-width rectangles on phones.** Each of the four reputation buttons (Fame+, Fame−, Infamy+, Infamy−) inside faction cards was stretching to fill the card width and stacking vertically. Root cause: a global CSS rule (`button { width: 100% }`) was overriding the faction button styles. Fixed: added explicit size overrides directly on `.faction-btn` so each button stays 28×28px and sits in a compact row.

**The world map grid was scrolling the page sideways.** On phones, the map was wider than the screen, causing the whole page to scroll horizontally. Root cause: CSS grid tracks using `1fr` don't shrink below content width by default, and the zone name text inside each cell prevented the columns from fitting. Fixed: changed grid tracks to `minmax(0, 1fr)` so they can shrink to zero, added `min-width: 0` to each cell so it can shrink, and capped the grid at `max-width: 100%`.

Also this release: added Protocol 8 to the project rules documenting the multi-model Dispatch workflow (Opus AI plans, Sonnet AI implements).

### [B5] Update prompt now actually reboots the app (2026-06-26)

When a new version is released, a prompt appears asking you to tap OK to update. Previously, tapping OK did nothing — the page never reloaded.

Root cause: the service worker (the background update process) was calling `skipWaiting()` during installation, which made it activate immediately before the update prompt could send it the reload instruction. By the time OK was tapped, there was no waiting worker to receive the message.

Fixed: the service worker now stays in a waiting state until the user explicitly taps OK. Tapping OK sends the instruction, the service worker activates, and the page reloads automatically. Existing users on older cached versions do not need to clear their cache — the fix is backward-compatible and they will receive the prompt automatically.

### [B4] Number input fields no longer balloon on phones (2026-06-25)

On real phones, the HP, XP/LVL, and CAPS fields in the Bio-Metrics panel were stretching far too wide — pushing everything off the right edge of the screen and leaving a stray vertical green line (the right borders of the ballooned inputs lined up down the page). Fixed by capping number inputs at 56px wide on narrow screens and allowing input rows to wrap when they need more space. The stray line and overflow are gone.

### [B3] Internal: automated test suite now runs the same tests on all platforms (2026-06-25)

The automated checks that run before every code commit existed in two copies — one for Node.js and one for PowerShell. They had drifted: the PowerShell copy was only running 173 of the 209 tests the Node copy ran, so the commit gate was silently not enforcing the full suite. Fixed by porting all missing tests to the PowerShell copy so both run the same 209 tests. No change to app behavior.

### [B2] First mobile layout pass, version number fix (2026-06-25)

Added phone layout adjustments for screens roughly 360–430px wide: the header and boot text wrap instead of overflowing; tab buttons stack onto a second row when needed; input fields expand to use available space (fixing the Location field that was cutting off names like "Goodsprings"); the faction grid uses 2 columns instead of 3; images and tables are capped at screen width. Also fixed the version number displayed in the title and header — it was stuck showing 2.0.0 after the 2.0.1 release. Cache bump is now required before every git push, not just UI-only commits.

### [HOTFIX] Black screen on boot — missing script tags (2026-06-25)

After the v2.0.1 commit, the terminal showed only a blinking cursor and never loaded. The entire block of `<script>` tags that loads the app was accidentally deleted from the HTML file. Restored immediately.

### [B1b] World Map redesign (2026-06-25)

- Added compass labels (W/E columns, N/S rows) so you can orient the grid.
- Zone you're currently in: bright green glowing border.
- Zones you've visited: dashed border at 75% opacity.
- Empty zones: barely visible, not clickable.
- Zones with uncollected collectibles show an amber `[?]` badge.
- Clicking any zone zooms in to show all its sub-locations with current/visited/collectible markers. Back button returns to the grid.
- On narrow screens, only the 16 central zones show by default; a FULL MAP button expands to all 36.
- Map legend below the grid explains all symbols.
- Long zone names are abbreviated so they fit their cells.

### [B1c] Expiring effects highlighted in amber (2026-06-25)

Active status effects with 1–2 ticks left are now highlighted amber and show a blinking `[EXPIRING]` badge. Permanent effects (ticks = 0) show `[∞]` instead of a tick count.

### [B2a] Terminal posts alerts when things happen (2026-06-25)

The terminal now posts automatic messages when important things change without you asking: radiation crossing a danger threshold, time of day shifting between night/morning/day/evening, and a chem or effect about to expire. The session briefing shown on boot now also includes active quest names, notable faction standings, and expiring chems.

### [B3a] Faction reputation bar + tap target fix (2026-06-25)

Each faction card now shows a horizontal bar visualizing the balance between Fame and Infamy, with threshold markers at 25% and 75%. All four faction adjustment buttons are now at least 28×28px to be easier to tap on phones.

### [B3b/B3c] Three new audio cues (2026-06-25)

Three synthesized sounds added (each with its own toggle in the Audio panel):

- Rising three-note chime when a quest is completed.
- Descending two-note stinger when a quest fails.
- Short beep when a faction hits Idolized (high pitch) or Vilified (low pitch).

### [B4 — original] Campaign Status Panel (2026-06-25)

New panel in the Campaign tab showing a live summary of your playthrough: quest counts (total/active/completed/failed), active effect count plus how many are expiring, notable faction standings, and a count of campaign log entries. Also added a Crossroads Record — a scrollable list of the 20 most recent auto-logged decisions.

### [B5 — original] [CROSSROADS] command now uses live data (2026-06-25)

The `[CROSSROADS]` command now pulls your current location, recent quests, the last 5 crossroads log entries, and faction reputation deltas directly from your live save at the moment you send it. Previously it relied on the AI's memory, which could be stale or hallucinated.

---

## [v2.0.0] — The Universal Fallout Companion OS<!-- Date: 2026-06-25 | Tests: 206/206 | Cache: robco-terminal-v2.0.0-r13 -->

### [C11] Polish and bug fixes (2026-06-25)

- **World map cells** slightly shorter (36px instead of 44px) so the full 6×6 grid fits on desktop without needing to scroll.
- **Location matching** tightened so short words don't accidentally match multiple map zones.
- **Calendar inputs** now use real Month/Day/Year fields instead of raw tick numbers. They sync in both directions.
- **XP bar** is now draggable — click or scrub to set your progress within the current level. Changing your level auto-sets the XP boundary.
- **Complete RNG** mode gained a third "locked" state: if you wipe the terminal while RNG is active, RNG locks permanently for that campaign.
- **HP flash on iOS** fixed: the low-HP warning was flashing the whole screen white. Now it's a proper colored overlay.
- **Faction tiers**: Brotherhood of Steel, Boomers, and Great Khans moved from Major to Minor factions to match the UI design.
- **Wipe Terminal** now actually resets your data (it was doing nothing due to a missing variable).
- **Calendar editing** fixed so inputs respond to changes.
- **XP formula** corrected to the actual Fallout 3 / New Vegas engine values. Level 3 now correctly requires 550 XP.
- **Calendar width** widened so 4-digit years don't clip.
- **HP flash visibility** increased slightly on phones (opacity 0.12 → 0.25).

### [C9/C10] Fallout 3 AI awareness (2026-06-24)

The AI now knows which game you're playing. In Fallout 3 mode it uses FO3 factions and the FO3 skill list (Big Guns / Small Guns instead of Guns). Point-of-no-return warnings cover FO3 events: Megaton, the Purifier, karma hit squads.

### Multi-Campaign Container (2026-06-24)

Your save data now lives in a container holding separate FNV and FO3 campaigns. They never touch each other.

- Old saves migrate automatically on first load, with the original save kept on disk as a backup.
- Switching games in the Campaign tab fully reloads the app so no stale data bleeds through.
- Cloud sync now moves the entire container — both games — in a single push/pull.
- Undo now works for both AI-synced state and manually imported files.
- Fixed: the AI can no longer change your active game context (e.g., hallucinating `gameContext: FO3` to switch games).

### [C10] World Map became interactive (2026-06-24)

Clicking any zone on the map zooms in to a detail view listing every sub-location with visit and collectible markers. A back button returns to the grid. Mobile tap targets enlarged.

### [C6] Faction panel redesign (2026-06-24)

Faction cards are about 35% shorter — standing label and fame/infamy numbers now share one line, padding halved. Minor factions upgraded to a 3-column grid. Five rarely-used casino/caravan factions removed (data archived to campaign notes so nothing is lost); Strip and Freeside added.

### [C7] TIMELINE command (2026-06-24)

When the AI returns a Projected Timeline, it goes directly into the Campaign tab's Timeline panel instead of a pop-up overlay.

### Major v2.0.0 features

- **STAT / INV / DATA tabs** replace the single-scroll layout. Keyboard shortcuts 1/2/3. Chat and Tactical Dashboard remain always visible.
- **Fallout 3 support** with its own factions, skills, AI instructions, database, and registry.
- **Modular databases** — FNV and FO3 have separate files; all downstream code works with both automatically.
- **Tab-aware panel expansion** — when the AI updates something in a different tab, the app switches to that tab and opens the right panel.
- **Save slot game context labels** — each slot shows which game it's from; loading the wrong game shows a warning.
- **New Campaign flow** — Wipe Terminal button with double confirmation resets everything and prompts for game selection.
- **V.A.T.S. overlay** — browser-side hit-percentage calculator for all body regions using your actual stats.
- **Point-of-no-return warnings** — AI warns before faction lockouts, story endings, or irreversible quest branches.
- **Active effect highlights** — while a chem or magazine is active, the skills it boosts are highlighted green. Highlights clear when the effect expires.
- **Karma system (FO3)** — Faction Standing panel replaced by a Karma panel in FO3 mode, with thresholds and companion availability notes.
- **Collectibles tracking** — Snow Globes (FNV, 7) and Bobbleheads (FO3, 20). Panel badge shows collected count.
- **Regional Zone Map** — 6×6 grid with current-location blinking cursor, visited breadcrumbs, and collectible markers.
- **Calendar display** — in-game date shown as a readable date (e.g., OCT 19, 2281) with game-accurate starting dates.

### Audio additions

- **Panel click** — short click when opening/closing a panel or switching tabs.
- **API thermal shift** — CRT hum pitch rises while waiting for the AI, returns to normal on response.
- **Level-up jingle** — three-note ascending chime when your level increases.
- **Low-health heartbeat** — slow pulse below 25% HP; quiets when tinnitus is also active.
- **Boot drone** — power-on sound on your first interaction after boot.

### Immersion polish

- **Hardware error display** — API errors shown as fake RobCo exception codes (`FATAL EXCEPTION AT 0x...`).
- **Collectibles in session stats** — session statistics panel shows your collectible count.

### Data

- **FNV registry**: 7 Snow Globe collectibles, 36 Mojave Wasteland zones.
- **FO3 registry**: 20 Bobblehead collectibles, 36 Capital Wasteland zones.
- **FO3 database**: weapons, armor, chems, and enemies for Fallout 3.

---

## [v1.6.8] — Pre-Release Architecture<!-- Date: 2026-06-24 | Tests: 206/206 | Cache: robco-terminal-v1.6.8-r22 -->

### [F2] Tab bar sticks to the top on phones (2026-06-24)

On phones the STAT / INV / DATA / CAMPG tab bar disappeared when you scrolled down. Fixed: it now sticks to the top of the screen on narrow displays.

### [C5] Playthrough Type now saves with your character (2026-06-24)

Your Playthrough Type choice (Standard / Min-Maxed / Completionist / Casual / Speedrun) was previously stored only on the current device — exporting and re-importing your save silently lost it. Fixed: it's now a proper save field that travels with every export, import, cloud push, and cloud pull.

Also fixed: Wipe Terminal was doing nothing because a variable was missing. It now correctly resets all campaign data.

### [C1] Faction reputation matches the real game (2026-06-24)

Fame and Infamy are now tracked as fully independent numbers, exactly as Fallout: New Vegas handles them. Your standing with each faction is determined by the combination of your Fame rank and Infamy rank (sourced from the GECK wiki formula). Faction cards show `F:{fame} / I:{infamy}` instead of a single net score. Clicking fame/infamy buttons no longer collapses the Minor Factions section.

### [C2] Delete buttons for perks, collectible toggle, expanded help (2026-06-24)

- Perks now have `[X]` delete buttons, matching quests and campaign notes.
- Clicking `[ACQUIRED]` or `[MISSING]` on a collectible toggles it immediately without a full page reload.
- The help modal now shows all 27 commands in 5 categories as a formatted grid.

### [C3] Campaign tab (2026-06-24)

A fourth tab "CAMPG" added (keyboard shortcut 4). It holds game context, playthrough type, Complete RNG, Wipe Terminal, and the Timeline display. Security & Config now focuses solely on API key, display, audio, cloud, and saves.

### [C4] Complete RNG mode (2026-06-24)

Added a Complete RNG checkbox in the Campaign tab. When on, it shows a green banner and tells the AI to make randomized narrative decisions. Independent from Playthrough Type — any combination is valid.

### [C4-fix] RNG and Playthrough Type separated into two controls (2026-06-24)

The original C4 merged both into a single dropdown, making combinations impossible. Fixed: separate Playthrough Type selector (5 options) and independent Complete RNG checkbox. Campaign data from the merged control migrates cleanly.

### Major v2.0.0 features (summary — see v2.0.0 entry above for details)

- STAT / INV / DATA / CAMPG tabs replacing single-scroll layout.
- Fallout 3 full support (factions, skills, AI, database, registry).
- Multi-campaign container — FNV and FO3 saves never mix.
- Tab-aware panel expansion, save slot context labels, New Campaign flow.
- V.A.T.S. overlay, point-of-no-return warnings, active effect highlights.
- Karma system for FO3, collectibles tracking, Regional Zone Map, Calendar.

### Audio

- Panel click sounds, API thermal hum shift, level-up jingle, low-health heartbeat, boot drone.

---

## [v1.6.8] — Implementation Polish: Notes, Status, Squad, and UI Enhancements

<!-- Date: 2026-06-23 | Tests: 165/165 | Cache: robco-terminal-v1.6.8-r5 -->

### Added

- Campaign Notes: individual delete buttons; auto-logged notes look visually distinct; manual add form.
- Quest status auto-logging: quest changes are automatically added to campaign notes with a timestamp.
- Status Effects: add form with tick counter; delete buttons per effect.
- Squad: companion add form with autocomplete; remove buttons.
- Command quick-reference: small `[?]` button next to the token budget display instead of a large standalone button.
- Collapsible D-Pad: wrapped in a `<details>` block to save vertical space.

### Fixed

- Status effect badge now counts permanent effects (ticks = 0) instead of ignoring them.
- Map modal title detection cleaned up.
- Number input widths increased so short placeholder labels (Qty, lbs, val) don't clip.
- Tactical Dashboard converted to CSS Grid so combat buttons fill the space when the D-Pad is collapsed.

---

## [v1.6.7] — Ammo Sub-Panel & Data Expansion

<!-- Date: 2026-06-22 | Tests: 137/137 | Cache: robco-terminal-v1.6.7-r4 -->

### Added

- **Ammo sub-panel**: ammo lives inside the Backpack Inventory panel as its own collapsible section. Add form with caliber autocomplete (from CSV), delete buttons, separate tracking from regular inventory.
- **Item type tags**: each inventory item shows a colored type tag (`[WEAPON]`, `[ARMOR]`, `[AID]`, `[AMMO]`, `[MISC]`). Adding ammo via the search field routes it to the ammo sub-panel automatically.
- **Combined inventory badge**: Backpack badge shows regular items + ammo caliber count.
- **Delta ammo line**: `[DELTA]` readout after AI sync now includes ammo round changes.

### Fixed

- If you add an item that already exists at 0 lbs and the database has a real weight for it, the existing entry is corrected.
- Carry weight no longer includes ammo items that were hidden from the inventory list.
- If the AI puts ammo in the regular inventory, it's silently rerouted to the ammo tracker.

### Removed

- `getRelevantDbContext()`: dead function, never called after the system directive was restructured.
- `state.macros`: array that was never used. Removed and cleaned from old saves.
- Standalone Ammo badge: replaced by the combined Backpack badge.

### Data

- Weapons: 51 → ~170 entries, full FNV base-game coverage.
- Armor: 15 → ~68 entries with canonical DT/weight/value.
- Chems: 20 → ~45 entries including food and drinks.
- CHANGELOG.md: renamed from `changelog.txt`; references updated throughout.

---

## [v1.6.6] — THREAT Fix & Database Population

<!-- Date: 2026-06-22 | Tests: 138/138 | Cache: robco-terminal-v1.6.6-r5 -->

### Fixed

- `[TH]` shorthand was silently omitting the database payload every time. Fixed.
- THREAT and `[TH]` commands now send your equipped weapon, armor, and ammo to the AI for accurate DPS/TTK math.

### Changed

- Item database is now always included in the AI's system instructions so it's always in context from the start.

### Data

- Bestiary: 4 → 63 enemies covering the full FNV bestiary.
- Weapons: 6 → 51 entries. Ammo: 7 → 47 subtypes. Armor: 4 → 19. Chems: 4 → 20. Misc: 4 → 18. Recipes: 1 → 10. Quest Items: new (19 entries). Vendors: 2 → 14.

---

## [v1.6.5] — Fallout Data Registry & Autocomplete

<!-- Date: 2026-06-22 | Tests: 119/119 | Cache: robco-terminal-v1.6.5-r2 -->

### Added

- Autocomplete dropdowns on quest name and item name inputs. Pulls from the FNV wiki data, appears after 2 characters, keyboard-navigable.
- Registry data: 130 quests, ~90 perks, ~120 locations, all 10 companions.
- Pre-phase2 git checkpoint branch created before starting v2.0 development.

---

## [v1.6.4] — Systems Architecture Update

<!-- Date: 2026-06-22 | Tests: N/A | Cache: robco-terminal-v1.6.4 -->

### Added

- **Quest Log**: track name, status (active/completed/failed), objective, and faction involvement. AI auto-updates quest status during play.
- **Equipped items**: current weapon, armor, and headgear shown in Bio-Metrics.
- **Save slots**: 3 slots (A/B/C) with full save/load buttons. Each stores the complete save envelope.
- **Session stats**: kills, caps earned, damage dealt, elapsed time. AI returns stat deltas each turn.
- **Token budget display**: estimated usage shown below the chat input, color-coded by percentage.
- **Item type selector**: weapon / armor / aid / ammo / misc dropdown when adding inventory items.
- **Keyboard shortcuts**: Ctrl+1–6 to toggle panels; Ctrl+/ to focus chat.
- **Radiation alert**: warning in Bio-Metrics when rads ≥ 200, with RadAway dose count.
- **Status tick-down**: timed effects auto-decrement each AI sync; expired effects post a chat notice.
- **Day/Night tint**: a subtle blue tint applies during in-game night hours (20:00–06:00).
- **Panel badges**: amber count badges on Perks, Inventory, Squad, Status, Notes panels.
- **Faction threshold alerts**: chat notice when any faction hits Idolized or Vilified.
- **Karma flash**: brief screen-edge glow when karma changes by 50+ in one sync.
- **Critical HP flash**: red background flash when HP drops below 25%.
- **Panel memory**: panel open/closed states remembered across sessions.
- **Input history**: Up/Down arrows cycle through previously sent commands.
- **Sync sound**: two-note tone after every successful AI sync.
- **Quick-use button**: each inventory item has a USE button that sends the use command automatically.
- **Skill check markers**: skill checks in AI narrative render as green/red pass/fail and ping the relevant skill input.
- **Companion affinity bar**: squad members with an affinity value show a 0–100% bar.
- **Typewriter speed slider**: 0.25×–3× in Audio settings.
- **Auto-retry**: one silent retry on transient API errors after 2.5 seconds.
- **Location history**: last 10 distinct locations tracked in save state.
- **Campaign log exports**: Markdown and HTML export formats.
- **Perk tracker**: Perks panel; AI updates perks on level-up events.
- **Item value field**: caps value per inventory item, shown as "(Xc)".
- **XP bar**: live progress bar within the current level, draggable.
- **Master mute**: one toggle to silence all audio; individual controls remain independent.
- **Session briefing**: status summary posted to chat on boot if a save exists.
- **Model auto-refresh**: API model dropdown silently refreshes 2 seconds after boot.
- **State diff display**: `[DELTA]` line after every AI sync lists every stat that changed.
- **Radiation debuff display**: stat inputs turn red when radiation debuffs apply; tooltip shows which debuffs.

### Security

- API key moved from URL parameter to request header — no longer visible in browser history or server logs.
- Replaced the recursive `flatten()` import function (stack overflow risk, no depth limit) with explicit typed field-mapping. All stat values are now range-validated before applying.

### Changed

- Transmit button becomes Cancel during API calls. 45-second automatic timeout.
- Cloud saves include a timestamp; pulling warns if the cloud data is older than local.
- Fame/infamy changes per AI sync are auto-logged to campaign notes.
- `APP_VERSION` defined once in `state.js`, referenced everywhere — previously hardcoded in 8+ files.

---

## [v1.6.3] — Faction Network Update

<!-- Date: Unknown | Tests: N/A | Cache: robco-terminal-v1.6.5 -->

### Changed

- **14 factions** now tracked — 6 Major (NCR, Caesar's Legion, Mr. House, Brotherhood of Steel, Boomers, Great Khans) in a 3-column grid, 8 Minor in a collapsible sub-section. Adding a new faction requires one line in one file.
- Faction data restructured from flat key pairs to per-faction objects. Old saves migrate automatically. AI tracks all 14.
- Save exports now include full chat history in a versioned envelope. Old bare-state imports still work.
- Cloud sync now includes chat history and playthrough type — full session restore from any device.
- Tick system clarified in AI instructions: ticks are pacing guides, not action locks. The Courier can act at any time.

---

## [v1.6.2] — Character Sheet Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Skill Matrix**: all 13 FNV skills tracked and synced to the AI every turn. Checks and calculations use your actual skill values.
- **Crippled HEAD limb**: head trauma with its own two-layer audio (concussive thud + ringing).
- **Tinnitus**: activates at 600+ RADs or a crippled head. Both must clear before it stops.
- **Status Effects panel**: the AI was already writing effects — now they're visible.
- **Campaign Notes panel**: the AI's auto-logged tactical decisions are now shown as a bullet list.
- **Faction Standing panel**: NCR, Legion, Strip standings with color-coded labels.
- **Ticks → Game Time clock**: live Dx HH:MM game clock next to the TICKS field.
- **Ctrl+Enter to send**: keyboard shortcut to transmit without clicking.
- **Undo last sync**: one-click restore of the full pre-sync snapshot. Reappears after every sync.
- **Split mute controls**: separate toggles for limb trauma sounds and the tab-return tone.

### Fixed

- `[FEATURES]` command now shows the real 30+ command registry instead of invented commands.
- Tab-return sequence holds dim overlay for 650ms before waking so messages appear against a dark screen.

### Changed

- Full state snapshot taken before every AI sync. Undo restores it atomically.
- AI-returned skill values clamped 0–100.

---

## [v1.6.1] — The Living Machine Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Geiger counter**: procedural clicks via Web Audio, scaling from ~1 per 3s at 200 RADs to continuous static at 1000+ RADs.
- **Tinnitus**: barely-audible high tone at 600+ RADs, randomly swells.
- **CRT hum**: persistent 60Hz hum throughout the session; shifts to 82Hz at high radiation; briefly cuts out when a limb is crippled.
- **Stat delta ghosts**: when the AI updates a stat, the previous value briefly rises and fades from that field.
- **Carry weight animation**: panel subtly sags at 75% capacity, more at 90%, jitters at 100%.
- **Narrative velocity**: typewriter speed reacts to keywords — combat speeds it up, rest/sleep slows it down.
- **Tab standby mode**: switching tabs dims the terminal; returning plays a tone and shows "COURIER RETURNED."
- **Limb trauma sounds**: crippling plays a distinct sound per limb type; restoring plays a med-stim arpeggio.
- **Session uptime clock**: live HH:MM:SS counter in the header; memory cycle message every 15 minutes.
- **Thermal shift**: terminal background warms to amber during API calls, cools on response.
- **Changelog button**: "VIEW CHANGELOG" in Configuration panel.

### Security

- All AI narrative text HTML-escaped before display. Closes a theoretical path where a malformed AI response could run injected JavaScript.

### Fixed

- Changelog display correctly extracts only the most recent version block.

### Changed

- Typewriter rewrite: eliminated O(n²) `innerHTML +=` pattern (was re-parsing the full DOM on every character). Text during animation, formatted HTML once at the end.
- State writes to localStorage at most once every 500ms. Flushed on tab close.
- Audio mute checks read from an in-memory object instead of hitting localStorage on every audio tick.
- Inventory and squad lists built as single strings and assigned once.
- In-memory chat capped at 200 messages.

---

## [v1.6.0] — PWA, Mobile & Visual Overhaul

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- **Playstyle toggle**: switch between Any Weapon and Melee/Unarmed Only. Blocked if restricted perks are already acquired.
- **PWA installation**: installable to iOS/Android/desktop home screens. Install button appears when the browser confirms eligibility.
- **New optics presets**: Legion Red, Ghoul Green, Neon Purple.
- **HP bar**: live bar below HP inputs, transitions green → amber → red.
- **Radiation escalation**: the RADIATION field changes color and pulses at danger thresholds. 1000+ RADs causes full screen distortion.
- **Boot sequence**: 1.5-second cold-boot animation on every page load.
- **Phosphor afterglow**: all stat fields briefly glow brighter after each AI sync.
- **Trauma glitches**: crippled limb buttons periodically blink and jitter.
- **Delta arrows animate**: ▲/▼ arrows slide in from above/below on change.
- **Interactive HP bar**: click or drag to set HP. Touch-compatible.
- **Header glow pulse**: the title breathes slowly.

### Fixed

- Cloud sync no longer auto-fires on every stat change and spams the popup. Cloud sync is manual only.

### Changed

- Heavier CRT scanlines for a more authentic look.
- Button hover replaced harsh white flash with smooth brightness boost.
- Phosphor sweep bar uses active optics color.
- Panel headers get 1px letter-spacing.
- Custom scrollbar uses active optics color.

---

## [v1.5.9] — Immersion & Tactics Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Optics configuration: change the terminal color (RobCo Green, New Vegas Amber, Vault-Tec Blue).
- Audio mute toggle for typing sounds.
- Interactive GPS: clicking a map cell auto-executes a `> MOVE TO` command.
- Location autocomplete using all major Mojave locations.
- Campaign log download as a clean `.txt` file.

---

## [v1.5.8] — PWA & Mobile UX Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Service Worker / PWA: all assets cached for faster loads; "REBOOT TERMINAL" prompt fires on new versions.
- Collapsible panels: all UI sections are now collapsible, closed by default on mobile, open by default on desktop.
- Manual cloud sync button: immediate cloud push in addition to auto-save.
- Auto-changelog modal: latest patch notes shown automatically after an update.

---

## [v1.5.7] — Mobile UX & Gamification

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Tactical D-Pad: 8-way D-Pad and action buttons (`[THREAT]`, `[VATS]`, `[TRADE]`, `[LOOT]`) for quick commands on mobile.
- Rich data modals: map commands show an interactive CSS grid; trade commands show Buy/Sell buttons.
- Squad tracker: companions shown in Bio-Metrics with health, condition, and ammo.
- Cloud sync framework: cross-device save architecture.
- VATS scan overlay: animated laser-scan effect and audio loop during image uploads.
- CRT scanlines with flicker animation.

---

## [v1.5.6] — Modular Architecture & System Hardening

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Keyboard click sounds via Web Audio API — no audio files.
- CRT overlay with scanlines and flicker.
- Tick clock: ticks tracked in state and sent to the AI; buffs and debuffs expire by tick count.

### Fixed

- Inventory persistence: fixed a bug where the AI's token-saving logic accidentally dropped the full inventory during looting or crafting.

### Changed

- Modular architecture: split the monolithic `index.html` into `state.js`, `ui.js`, `api.js`, `database.js`, and `css/terminal.css`.
- All AI instructions unified into a single `systemInstruction` in `api.js`.
- Item database only injected into AI context when the command needs it, saving ~1,500 tokens per standard turn.

---

## [v1.5.5] — Native Web App & AI Memory

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Modal overlays: list-based AI responses (ROADMAP, STATS, CROSSROADS, FEATURES) open in a native HTML pop-up instead of being drawn in the chat.
- Campaign notes memory: the AI can write tactical decisions to `campaign_notes`. Saved with state, re-injected every turn — gives the AI persistent memory without needing extra context tokens.
- Database slot: framework for holding game data (weapons, armor, etc.) for AI reference.

### Changed

- Tri-Node JSON: AI response format expanded to `narrative`, `state`, and `modal`. The `modal` node triggers the overlay.
- Full Gem persona embedded into the system directive. Temperature locked at 0.2 to reduce hallucinations.

---

## [v1.5.4] — Stability Patch

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- JSON crash prevention: AI narrative now outputs as a string array, preventing crashes from unescaped line breaks in the AI's text.
- Legacy command templates: full multi-line templates for all custom commands hardcoded into the system directive so the AI can draw them accurately.
- CSS terminal overflow: fixed `min-height: 0` and `overflow-y: auto` on main containers so the terminal doesn't stretch infinitely downward.

### Changed

- AI persona merged from the original v1.4.6 Gem: the AI now has the full strategic logic of the original, not a blank API personality.
- Temperature 0.2 hardcoded.

---

## [v1.5.3] — Stability & Customization Patch

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- `"narrative"` node mandated as a string array to prevent line-break-induced JSON crashes. Chat rendering updated to join the array.

### Added

- User command template zone: dedicated section in the UI templates file for customizing `[FEATURES]` — won't be overwritten by framework updates.

---

## [v1.5.2] — Website Architectural Overhaul

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- AI now retains full narrative memory: rewrote the API payload to inject full chat history on every request ("Memento" fix).
- UI panel locked during API calls to prevent stat changes from overwriting state while the AI is calculating.
- Typing "help", "menu", or "commands" now correctly routes to `[FEATURES]` instead of breaking the AI persona.

### Added

- Token triage: inventory data stripped from AI payload during non-inventory commands to reduce token cost.

### Changed

- AI locked into outputting strict 2-part JSON (`narrative` + `state`), eliminating crashes from free-form text responses.

---

## [v1.5.1] — Engine, Optics & Stability

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Dynamic model selector: live dropdown that fetches available Gemini models from Google on startup.
- API key sanitization: strips invisible characters from pasted API keys — fixes common 400/404 errors.
- Error display: auth failures and rate limits printed to the chat display.
- Image upload: attach a screenshot for AI visual analysis.

### Fixed

- Auto-save: every stat change writes to localStorage immediately via `oninput`.
- Corrupted chat history now resets gracefully instead of crashing.
- File import no longer gets overwritten immediately by default DOM values.

### Changed

- JSON-only API responses. Inventory stripped from payload during non-inventory commands. Carry weight and max AP calculated in JavaScript; AI reserved for narrative and lookups.

---

## [v1.5.0] — Comm-Link API Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Live Gemini API integration: state is automatically attached to prompts; AI responses update your stats. No more copy-pasting JSON.
- API key stored only in localStorage — never in any repository.
- PWA install: `manifest.json` and `sw.js` complete; installable as standalone offline app.
- Widescreen dual-column layout.
- Persistent chat: survives tab closure and browser restart. `[PURGE LOGS]` to clear.
- S.P.E.C.I.A.L. values clamped 1–10 in the UI.

### Changed

- AI directed to treat the web UI's JSON state as the source of truth for math; stops generating ASCII tables for things the UI handles natively.

---

## [v1.4.7] — Beta: Web Architecture Transition

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Client-side state tracking: inventory, S.P.E.C.I.A.L., wealth, and bio-metrics tracked in the browser to reduce AI token cost and prevent stat drift.
- Fuzzy JSON parser: auto-maps AI responses with unexpected key formats.
- Gemini API integration directly in the terminal.
- PWA installation; state saves on every keystroke.
- Chem and Trauma Matrix UI.

---

## [v1.4.6]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Changed

- **Stasis Protocol**: inventory management, gear swaps, and using items no longer advance the in-game clock. Time only moves during combat, travel, or deliberate wait/sleep.
- **Armor condition formula**: active DT now scales as `Base DT × (Current Condition / Min Condition Threshold)`.
- **Companion ammo mid-turn**: if a companion runs out of custom ammo during combat, the engine resolves the custom ammo damage first, then switches to infinite default ammo for the rest of the turn.

---

## [v1.4.5]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- `[SYNC]` command bypasses addiction cascade warnings (assumes you've already confirmed your state).
- Melee/Unarmed frames now recover `15 + Agility` AP per combat round during multi-tick VATS simulations.

### Fixed

- Crafting mass: yielded items added to carry weight after consumed ingredients are removed.
- Visual VATS (`[VVATS]`): OCR hit percentages taken as absolute truth; crippled limb penalties not applied a second time.

---

## [v1.4.4]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- `[BIND: Item, Direction]` command to assign consumables to D-Pad directions explicitly.
- Level 50 cap: XP tracking stops permanently at Level 50 (68,600 XP).
- `[EXCESS]` shows top 5 most valuable items per category; append `-FULL` for the full list.
- `[VVATS]`: visual VATS extracts hit percentages from screenshots and converts to AP/damage math.

---

## [v1.4.3]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- `[TRADE]` now enforces vendor cap limits from `vendors.csv`. You can no longer drain a vendor into negative caps.
- Max AP now uses the hardcoded FNV formula: `65 + (Agility × 3)`.
- Items moved to a stash are simultaneously removed from the backpack.
- If a companion's custom ammo runs out mid-combat, the system auto-reequips their infinite default weapon and recalculates.

---

## [v1.4.2]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- XP formula hardcoded: `25 × Level² + 125 × Level − 150`. No more "guess from memory."
- Viewport mode (Mobile 56-char / Desktop 80-char) stamped in every footer to prevent the AI from drifting to the wrong width in long sessions.

### Changed

- Radiation milestones: AI now applies the correct S.P.E.C.I.A.L. debuffs at 200/400/600/800/1000 RADs. RadAway (−150 RADs) and Rad-X (+25% resistance) formulas hardcoded.
- In Desktop mode, heavy inventory lists render in 2-column layout.

---

## [v1.4.1]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added / Changed

- Diagonal D-Pad directions recognized (`UP-LEFT`, `DOWN-RIGHT`, etc.).
- `[SYS_DATA]` footer borders scale to match active viewport width (56 or 80 chars).
- All companions fully heal and clear crippled limbs after successful combat.
- `[TRADE]` enforces a buy/sell margin spread — sell price must fall below the vendor's purchase price.
- `[STASH]` shows top 5 per category; append `-FULL` for the full list.
- AI output sequencing: Monochrome Delta first, then tables, then footer.

---

## [v1.4.0] — Telemetry Dashboard Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- `[SYS_DATA]` footer replaced with a dual-line Unicode boxed dashboard. Prevents vertical wrapping on phones.
- `[VIEW: DESKTOP]` and `[VIEW: MOBILE]` commands switch between 80-char and 56-char rendering.
- Using a chem or medical item via shorthand or D-Pad always removes exactly one from inventory.
- Ammo quantities shown in `[INV]` output.

---

## [v1.3.9]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- `-Q` modifier (Quiet Mode): suppresses narrative, shows only the math delta. Faster for multi-turn combat on mobile.
- `-S` modifier (Stealth): applies weapon crit multiplier to the first strike.
- `[TRAVEL CLUSTER]` advances ticks proportionally to distance crossed.
- 2-letter command aliases: `[TC]` = Travel Cluster, `[VS]` = VATS Sim, etc.
- Command chaining with `&&`: run two commands in one turn.
- 'Pre-emptive Scanning' parameter restored to prevent Lockpick/Science bottlenecks.

### Changed

- All ASCII table borders replaced with Unicode box-drawing characters.
- All AI-generated UI capped at 56 characters wide for phones.
- NCR and Legion currency shown continuously in the footer.

---

## [v1.3.8]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- `[VATS SIM]` supports a targeted limb field for anatomical damage calculations.
- `[TRADE: Item, Qty]` applies Barter and reputation math automatically.
- XP yield after combat is calculated and proposed for confirmation before being added.
- `[STASH]` UI template added. Visual condition bars use solid `[██████░░]` blocks.

### Changed

- AP fully restores after successful combat. Stimpaks heal instantly; chem timers use tick counters.
- Items auto-unequip and show a quarantine alert when condition reaches 0.

---

## [v1.3.7]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- `[SYNC: data]`: high-speed bulk state update that skips narrative and shows only the delta.
- If a command lacks enough context for accurate math, the AI is required to show `[SYS-ALERT: INSUFFICIENT TELEMETRY]` instead of guessing.
- Batch Sync and D-Pad commands added to the `[FEATURES]` menu.

---

## [v1.3.6]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- `[PAD: UP/DOWN/LEFT/RIGHT]` instantly triggers the item or equipment bound to that D-Pad direction.
- Karma integers mapped to the Pip-Boy's descriptive title labels.
- Using a recipe immediately removes the consumed ingredients from the backpack.
- Companion carry capacity hardcapped at 150 lbs.
- Re-dosing a chem from the same family resets its timer instead of stacking a ghost withdrawal.

### Changed

- Delta arrows changed to solid block ▲/▼ in uppercase for a more authentic CRT look.
- All stat outputs clamped 1–10.

---

## [v1.3.5]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- `misc.csv`: new database for junk, crafting components, and currencies. Carry weight now references real weights from this table.

### Fixed

- `[VISUAL UPLOAD]` now requires a category (`[VISUAL UPLOAD: WEAPONS]`) so it only overwrites that specific array.
- Ammo and chems treated as 0 lbs even if missing from the database.
- Visual uploads can no longer overwrite exact condition percentages tracked by the combat engine.

---

## [v1.3.4]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Carry weight now recalculates automatically on every inventory transaction using real CSV weights.

### Fixed

- `[VISUAL UPLOAD]` fully wipes and rebuilds inventory from the image, preventing ghost duplicates of dropped items.

---

## [v1.3.3]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Kinetic Sequencing Algorithm (Section 1.6) added to developer documentation for AP allocation in Unarmed/Melee.
- `[VATS SIM]` visual interface card template added.

---

## [v1.3.2]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Changed

- Added `XP_Yield` to bestiary, `Value` to chems, `Ammo_Type` to weapons — prevents hallucination on these fields.
- The `[SYS_DATA]` footer now tracks TCK (ticks), FAME, INF (infamy), and KRM (karma) to prevent drift.
- Jury Rigging repair formula hardcoded: `15% + (Repair ÷ 2)%`.
- `[WAIT: X Hrs]` advances time without healing. `[SLEEP]` fully heals HP, rads, and limbs.

---

## [v1.3.1]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed / Changed

- `[FEATURES]` menu now correctly shows `[WAIT: X Hrs]` instead of the auto-triggered `[SYS_LEVEL]`.
- Changelog removed from the AI's active prompt to save tokens.
- TCK/FAME/INF/KRM added to the footer.
- Jury Rigging formula hardcoded.
- Wait and Sleep separated.
- `[PAGE TWO]` / `[PAGE THREE]` merged into `[PAGE 2/3]`.

---

## [v1.3.0] — Systems Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- `[SYS_LEVEL]` protocol: AI recognizes XP thresholds, allocates `10 + (INT ÷ 2)` skill points per level, locks Perks to even levels.
- Companion logistics: infinite ammo for default weapons; custom ammo actually consumed. "Unconscious" instead of permadeath on Normal.
- `[WAIT: X Hrs]`: fast-forward time without a bed. Advances vendor restock cycles.

### Changed

- Carry weight formula hardcoded: `150 + (STR × 10)`. Condition repair scales with the Repair skill.

---

## [v1.2.5]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added / Fixed

- Fictional context wrapper added to the top of the AI system prompt clarifying all content is Fallout: New Vegas fiction — prevents false-positive content flags on words like "Chems", "Crippled", "Fatal."
- Authentic Fallout terminology restored (reverted clinical language from v1.2.4).
- Bracket formatting fix from v1.2.4 preserved.

---

## [v1.2.4]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- Replaced curly braces `{ }` in the `[SYS_DATA]` footer with standard brackets `[ ]` to prevent JSON parser conflicts. Alert prefix changed to `[DELTA]`.

---

## [v1.2.3]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- 7 system alert icons explicitly mapped to their alerts so the AI always picks the right one.
- Backtick formatting syntax restored in the formatting guide.

---

## [v1.2.2]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- `[COMM LINK: NPC Name]`: temporarily steps out of the RobCo persona to let you talk directly with a game character in their own voice. `[COMM LINK ESTABLISHED]` / `[COMM LINK TERMINATED]` cards signal entry and exit.

---

## [v1.2.1]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- Crafting engine: `[CRAFT]` command checks your backpack against `recipes.csv` and enforces Skill_Req gates before allowing a craft.
- `[CRAFT]` UI template showing available recipes and missing components.

---

## [v1.2.0]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- Delta reporting: every AI response opens with a one-line Δ summary of exactly what changed before the narrative.
- Dual-axis reputation: Fame and Infamy tracked independently per faction, matching the real FNV game. Economy math updated for mixed standings (e.g., Wild Child).
- `[GPS]` / `[MAP]`: draws an ASCII compass with local threats and nearest safehouse.

### Changed

- `[SYS_MEM]` text footer replaced with a minified JSON data block — drastically fewer tokens per turn, less variable drift.
- Condition bars upgraded from `[||||]` to solid block `[██████░░]` format.

---

## [v1.1.9]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- Entire Features & Commands ASCII table and Warning Render Protocol moved out of the core AI brain and into a dedicated `robco_ui_templates.txt` file.
- 1:1 visual continuity of card suits, radioactive markers, and star symbols preserved.
- Core AI system prompt is now free of large structural text blocks.

---

## [v1.1.8]

<!-- Date: ~2026-05-19 (est.) | Tests: N/A | Cache: N/A -->

### Changed

- All ASCII interface templates extracted from the core AI prompt into `robco_ui_templates.txt`. AI renders interfaces by querying this file.
- Baseline token cost reduced significantly.

---

## [v1.1.7]

<!-- Date: ~2026-05-19 (est.) | Tests: N/A | Cache: N/A -->

### Fixed

- Addiction verification loop hardcoded: stat drops from addiction never apply without explicit player confirmation.

### Changed

- Developer documentation and changelog offloaded to an external file.
- Core AI prompt compressed ~42% to reduce response latency and protect the context window.

---

> All game data sourced from [fallout.wiki](https://fallout.wiki) (CC-BY-SA 4.0).
