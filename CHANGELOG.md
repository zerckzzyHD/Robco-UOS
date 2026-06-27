## [v2.5.0] — Unreleased<!-- Tests: 540/540 | Cache: robco-terminal-v2.0.1-r57 -->

### Added

- Added an optional Gemini key sync toggle to the Security & Configuration panel. When signed in with Google, turning it on saves your API key to your account so it follows you across devices — no need to re-paste it when you open the app on a phone, tablet, or another browser. The toggle is off by default and the key never leaves your device when it is off or when you are not signed in. A "> GET A FREE GEMINI KEY" link now appears below the key field, pointing directly to Google AI Studio.

### Fixed

- Fixed the cloud save list showing the date twice and the save label being cut off behind the action buttons. The date was being added both inside the label (when saves are first synced) and again as a separate overlay, producing entries like "Local (FNV) — 6/26/2026 6/26/2026". The label now shows cleanly with a single date, truncating with an ellipsis if it is too long, and the buttons stay on the right without overlapping.
- Renamed the "REN" button in the cloud save list to "NAME" for clarity.

### Under the Hood

- Added 10 automated guard tests (Suite 47, 529 total across 51 suites) verifying that the Gemini key is never synced to Firestore for anonymous users or when the sync toggle is off, the toggle persists correctly, the AI Studio link is present with the correct security attributes, and the picker date-duplication regression cannot silently return.
- Added a remote kill-switch and client auto-disable system (Suite 48, 540 total across 52 suites). A public Firestore document lets the operator disable individual features without a redeploy — each disabled feature shows a clear message and leaves local data untouched. If a feature fails three times in a session, the client pauses it automatically until reload. The app reads the config on boot without blocking start-up; when the config is absent or unreachable, all features stay on (fail-open). Added the /config/flags security rules and Protocol 35 defining the live-flip-first regression response.

---

## [v2.0.1] — Map Readability, Audio Depth & Campaign Intelligence<!-- Date: 2026-06-26 | Tests: 258/258 | Cache: robco-terminal-v2.0.1-r23 -->

### Added

- The Campaign tab gained a Status Panel showing quest counts (total, active, completed, and failed), active effect counts with an expiring-effects callout, notable faction standings, and a scrollable list of your 20 most recent crossroads decisions.
- The CROSSROADS command now draws directly from your live save — current location, recent quests, the last several log entries, and faction reputation changes — instead of relying on the AI's memory, which could be stale or wrong.
- The world map was redesigned with compass labels (W/E columns, N/S rows), a glowing border on your current zone, dashed borders for visited zones, amber badges for zones with uncollected items, and a tap-through detail view showing sub-locations with current, visited, and collectible markers. Long zone names are abbreviated to fit their cells. A back button returns to the grid.
- Active effects with 1–2 ticks remaining are now highlighted amber with a blinking EXPIRING badge. Permanent effects show an infinity symbol instead of a tick count.
- The terminal now posts automatic alerts when radiation crosses a danger threshold, when the time of day shifts, or when a chem or effect is about to expire. The boot briefing also includes active quest names, notable faction standings, and expiring chems.
- Each faction card now shows a bar visualizing the balance between Fame and Infamy, with threshold markers at 25% and 75%. All faction buttons meet the minimum tap target size for phones.
- Three new audio cues, each with its own toggle: a rising three-note chime when a quest completes, a descending two-note tone when a quest fails, and a short beep when a faction reaches Idolized or Vilified.
- The full map toggle button is now always visible, regardless of screen width.

### Fixed

- The "new version available" notification is now an amber bar across the top of the screen instead of a browser pop-up dialog. Mobile browsers can silently block pop-up dialogs — the amber bar cannot be suppressed, so users will always be told when an update is ready. Tap the bar to apply the update and reload immediately.
- The SEND button (labeled "TRANSMIT PROTOCOL") in the chat area was missing — it had been accidentally removed when the v2.0.1 UI was rebuilt. Sending a message now works by tapping the button as well as Ctrl+Enter. A regression test was added to prevent this from being silently dropped again.
- Tapping OK on the "new version available" prompt now actually updates and reloads the app. Previously, tapping OK did nothing.
- Number input fields in the character panel no longer stretch too wide on phones and no longer left a stray vertical green line down the page.
- Faction buttons inside each faction card no longer stack as full-width rectangles on phones — they stay compact in a row at the correct size.
- The world map no longer causes the whole page to scroll sideways on phones.
- The version number shown in the header now updates correctly after an update.
- A black screen on boot after the v2.0.1 launch was corrected in a hotfix — the app's code had been accidentally removed and was restored immediately.
- The compact map view now loads correctly on phones the first time the map panel is opened. Previously, the app couldn't measure the panel width while it was collapsed and fell back to showing a full oversized grid.
- Switching tabs no longer resets the map — compact or full view is preserved when you return.
- Map cells are now roughly square. Previously they had no height set and appeared as thin horizontal slivers.
- The world map now updates immediately when you type a new location and move to another field.
- A zone is no longer incorrectly highlighted just because its name shares letters with another zone. Only the single best-matching zone highlights at a time.
- The CURRENT marker now only appears on your actual location. Previously a location whose name contained the name of another location (such as Goodsprings containing "springs") would incorrectly mark both.
- The map view preference (core vs. full map) now persists across reloads, tab switches, and location changes.
- On phones, opening the full 6×6 world map no longer stretches the entire UI past the right edge of the screen. The layout now correctly constrains the map column to the viewport width. The full map view is still available and usable on phones — only the overflow is fixed.
- Tapping any input on iOS or Android no longer causes the page to zoom in and stay zoomed. The zoom was triggered by input font sizes below 16px, and because the zoom persisted across reloads, the page looked fine on a fresh visit but appeared oversized and clipped the right side — including buttons in the Campaign tab — on every subsequent reload. All inputs now render at 16px on phones.
- On phones, reloading a saved game no longer stretches the whole character screen off the right edge. The cause was a long unbroken word in saved chat history — a pasted link or a very long run of characters with no spaces — which widened the layout. Such text now wraps inside the chat bubble, and the screen stays within the viewport on every reload. A fresh start always looked fine because there was no saved chat yet; only reloading an existing game showed the problem.

### Improved

- First mobile layout pass: header and boot text wrap instead of overflowing, tab buttons stack when needed, input fields expand to fill available space, the faction grid uses two columns on narrow screens, and images and tables are capped at screen width.
- Added two extra overflow guards on phones: the page root element (in addition to the page body) now clips horizontal overflow, and status-effect animations that could shear content off the right edge are disabled on narrow screens.

### Under the Hood

- Added an automated guard to the commit gate that blocks any commit where the service worker cache version was not bumped from the last release. Forgetting to update the cache version is now impossible to commit, not just discouraged. Protocol 1 updated to reflect the enforcement.
- Both automated test runners were brought to parity and now run the same tests. Previously the Windows runner was silently skipping many tests.
- Added 42 new automated tests guarding the map fixes, static layout invariants, and service-worker rules from regressing.
- Added 2 new automated tests confirming that both the page root and body block horizontal overflow, and that the mobile media query sets a 16px minimum font size on all inputs (auto-zoom guard).
- Added an optional Playwright render check for mobile overflow at 360px and 412px.
- Normalized line endings across all files to prevent false diffs.
- Added and refined agent protocols 8 through 28 governing the multi-model workflow, dispatch reporting, UI verification, deploy verification, mobile standards, and process rules.
- Expanded the plain-English changelog style guide (Protocol 21) with a seven-rule universal style section. Updated dispatch reporting rules (Protocol 9) to require short, scannable, mobile-optimized reports. Restyled the entire changelog to conform.
- Fixed two ways a crafted save or AI response could inject code: companion squad numeric fields (HP, ammo, damage threshold) are now coerced to integers before being written to the page, and the trade window click handler no longer embeds item names directly into the page's script — it uses a safe event listener instead.
- The terminal now warns you when your save file is approaching the browser's storage limit — an alert appears in the chat log so you can export before a write failure occurs.
- Free-text inputs now have character caps to prevent oversized entries from bloating save data or stretching the layout.
- The pre-commit revision guard now blocks decremented or unchanged revisions — any attempt to lower or keep the revision number is caught before the test suite runs, enforcing a strict monotonic increase.
- Added a passive Content Security Policy header to the page that logs unexpected resource origins without blocking anything — groundwork for enforcing a full security policy later.
- Added 4 new automated tests (Suite 30) guarding the input caps, CSP header, quota warning, and monotonic cache guard.
- Closed three more spots where a malicious save or AI response could inject content into the page: inventory item quantities, weights, and values are now coerced to numbers before rendering; quest faction tags are now escaped; and quest status values are now restricted to a fixed list (active, complete, or failed) and also escaped. Added 5 automated tests guarding these fixes from regressing.
- The app now survives a corrupt save file instead of showing a blank screen. If the save data cannot be read, it is automatically set aside and the app starts fresh, rather than crashing on boot.
- Fixed a broken data row in the Fallout 3 weapon database: the Fat Man had an extra trailing field that caused one column to be misread.
- Added 22 new automated tests: coverage for the Fallout 3 database structure, a column-count check ensuring every weapon data row matches its header, and static guards confirming the two XSS fixes cannot silently regress.
- Added 68 new automated gate-guard tests (355 total across 33 suites): static checks that every critical UI control is wired, banned code patterns cannot silently return, every render function is called on load, every audio function has the required mute guards, the AI JSON contract is locked, both registry files stay read-only, all PWA assets are in the service-worker cache, and both test runners always stay in sync.
- Upgraded CI to run both the Node and PowerShell test runners, compare their totals to catch any drift, and add a browser-based boot smoke test and mobile render check on every push. Previously CI only ran the Node runner with a stale test count label, and the PowerShell runner was never verified in CI.
- The GitHub Pages deploy now publishes only the app's public files. Previously the entire repository was uploaded, which exposed CLAUDE.md, RULES.md, ARCHITECTURE.md, the test suite, and all config files as publicly indexed pages.
- Fixed the auto-release workflow: release notes were silently falling back to a stub because the workflow was reading from a file called changelog.txt that does not exist. It now reads CHANGELOG.md correctly.
- Added weekly automated dependency updates via Dependabot for npm packages.
- Added a hook installer so the pre-commit gate is automatically set up on a fresh clone after npm install. Previously the hook only existed in .git/hooks and was lost whenever the repo was cloned.
- Added a one-command rollback script (scripts/rollback.sh) that reverts the offending commit, bumps the cache version, and commits — making the Protocol 16 "restore users first" step a single command instead of a manual multi-step process.
- Added 6 new automated guard tests (Suite 31, 369 total across 35 suites) that verify the CI workflow has no stale labels, runs both runners, includes the render check, the deploy restricts what it uploads, and the hook-install and boot-smoke scripts exist.
- Rebuilt the features help menu as a data-driven responsive card grid — five command groups, one card per command, readable on phones without scrolling sideways. Removed five legacy commands that no longer do anything: the Desktop/Mobile width toggle (layout is automatic now), the dev manual query hook, and the three redundant panel shortcuts for stats, inventory, and reputation that were left over from an earlier version of the app. The AI is also no longer instructed to handle those removed commands.
- Fixed the skill matrix highlight feature (chem boost), which was silently broken: active chems were supposed to glow the matching skill row amber when they were in effect, but the highlight could never attach because the skill rows had no class to target. The rows now use the correct CSS class and the highlight applies and clears correctly.
- Added 7 new automated guard tests (Suite 32, 376 total across 36 suites) that verify the command registry is data-driven with no legacy pipe characters, all removed commands are absent from both the UI and AI instructions, the skill matrix rows carry the correct class, and the chem-boost highlight function targets them correctly.
- The optics color themes (Amber, Vault-Tec Blue, Legion Red, Ghoul Green, Neon Purple) now correctly recolor every border, glow, bar, and highlight across the entire app. Previously the theme switcher only changed the main text and glow colors — dozens of borders and fill colors were hardcoded to the default teal and would not change when you switched themes.
- Empty-state messages (shown when a list such as Perks, Quests, or Status Effects is empty) now use a single consistent style across all panels.
- Audio toggle rows, inner panel expanders (Campaign Status, Crossroads, Timeline, Audio Systems), and add-item form rows now share consistent CSS classes instead of carrying large duplicated inline styles. No visual change.
- Inner panel expanders now show a live [+] / [-] indicator in CSS rather than static text — the indicator flips automatically when the panel opens and closes.
- Added 10 new automated guard tests (Suite 33, 386 total across 37 suites) that verify the optics RGB variable is defined everywhere it must be, no hardcoded teal color literals survive in the stylesheet, the empty-state helper exists and is used, all utility classes are present in the CSS, and the toggle indicator is driven by CSS rather than static text.
- Removed three legacy CSS rules that were superseded by the faction card layout and no longer applied to anything on the page.
- Unified delete-button placement across the Perks, Quests, and Notes panels to use the same flex layout already used everywhere else — visual appearance unchanged.
- Added a shared compact-button style so the PURGE LOGS button, the help button, and all delete buttons guarantee a minimum 28-pixel tap target on phones (Protocol 17 mobile standard). Previously each button carried its own inline compact style.
- Empty-state messages shown when a panel list is empty now use plain sentence case throughout. Bracketed caps (such as [LOADING...]) are now reserved for true loading states only.
- Added 10 new automated guard tests (Suite 34, 396 total across 38 suites) verifying the dead CSS was removed, the flex list-row and compact-button utilities exist, delete buttons meet the 28-pixel tap-target standard, and the bracketed empty-state vocabulary is correct.

### Under the Hood

- Campaign log entries are now capped at 200 so a very long play session can no longer push save data toward the browser storage limit.
- Save writes now skip the write entirely when the state hasn't changed since the last save, cutting idle I/O on the localStorage quota.
- Background timers (uptime clock, memory-cycle alert, and heartbeat) are now paused when you switch away from the tab and restart when you return, stopping unnecessary CPU and repaint work while the app is hidden.
- Decorative CRT animations (screen flicker, scan-bar, header pulse) are now paused while the terminal is in standby mode.
- The final save written when you close the tab now correctly targets the current save slot instead of a legacy key that was no longer read on startup.
- Autocomplete searches are now cached so typing the same characters twice in a row reuses the previous result instead of rescanning the registry.
- The fuzzy item-lookup fallback now skips very short search tokens (under 3 characters) that would never match anything useful, avoiding a full database scan for garbage input.
- Added 6 new automated guard tests (Suite 35, 402 total across 39 suites) verifying all of the above improvements.
- The [?] help menu now has a KEYBOARD SHORTCUTS section listing every active shortcut: Ctrl+Enter to send a command, Ctrl+/ to focus the input, Ctrl+1–6 to toggle panels, 1–4 to switch tabs, Up/Down to browse command history, and Esc to close any open dialog. Pressing Esc now also closes the help menu and patch-notes modal. Added 4 automated guard tests (Suite 36, 406 total across 40 suites).
- Adding, removing, or editing any tracked item (inventory, ammo, perks, quests, companions, status effects, or campaign notes) now refreshes only the relevant panel instead of rebuilding all fourteen panels from scratch. The update is noticeably snappier on phones. Fixed a latent bug where toggling a collectible as found or missing was not updating the collectibles badge count or the Session Stats panel in real time — both now update immediately on toggle. Added 19 new automated tests (Suite 37, 425 total across 41 suites) that verify each mutator calls the correct targeted refresh and that persistence is maintained through the shared save path.
- Added anonymous sign-in on boot, App Check protection, and per-user Firestore paths so saves are stored under your own user account rather than a shared flat collection. The old flat saves collection is now blocked by Firestore security rules. The cloud pull path now routes raw data through the sanitizer before writing it to local storage, closing an XSS bypass. Added 12 automated guard tests (Suite 44, 483 total across 48 suites).
- Built the Google sign-in layer: an ACCOUNT panel in the Data tab shows your sign-in status and a "Sign in with Google" button. Signing in links your anonymous session to a real Google account so your saves persist across devices and browsers. Sign-in uses a popup on all platforms. If you sign in with a Google account that already has its own save, the app recovers gracefully and logs you into that account without losing your local data. Signing out returns the app to an anonymous session. The service worker now routes the Google sign-in popup script through the Content Security Policy. Fixed a critical boot-order bug where the anonymous sign-in on startup would unconditionally replace a previously linked Google session every time the page reloaded — sign-in now only runs when there is no existing session. Added 13 automated guard tests (Suite 45, 496 total across 49 suites).
- Added a cloud save picker and local-to-cloud migration to the ACCOUNT panel. After signing in, a "Sync Local Saves to Account" button uploads your active save and all three save slots to the cloud as separate entries — no existing data is ever overwritten or deleted. Re-syncing the same save is safe (already-uploaded entries are detected and skipped automatically using a content fingerprint). The cloud save list shows each save's label, game, and date with LOAD, RENAME, and DELETE buttons. Loading a cloud save always asks for confirmation before replacing your current campaign. Deleting a cloud save asks for confirmation before removing it permanently. The existing quick-save push and pull buttons continue to work as before. Added 16 automated guard tests (Suite 46, 512 total across 50 suites).
- Fixed mobile Google sign-in: after completing the Google flow on a phone, users were returned to "NOT SIGNED IN" with no error. The redirect flow used for mobile was silently broken — modern iOS and Android browsers block the cross-origin iframe the Firebase SDK uses to hand back the credential after a redirect, so the result was always empty. Sign-in now uses a popup on all platforms, matching the desktop path that already worked. The boot sequence was also hardened to fully drain any previously started redirect before deciding whether to sign in anonymously. Added 2 new automated guard tests covering the popup-only path and boot ordering.

---

## [v2.0.0] — The Universal Fallout Companion OS<!-- Date: 2026-06-25 | Tests: 206/206 | Cache: robco-terminal-v2.0.0-r13 -->

### Added

- The app is now organized into four tabs — Stats, Inventory, Data, and Campaign — with keyboard shortcuts 1 through 4. Chat and the Tactical Dashboard remain visible across all tabs.
- Full Fallout 3 support: its own faction list, skill list, AI knowledge, item database, and a map of the Capital Wasteland. Selecting Fallout 3 in the Campaign tab switches all systems automatically.
- Save data now lives in separate containers for Fallout: New Vegas and Fallout 3. The two games never share or overwrite each other's data. Old saves migrate automatically on first load, with your original save kept as a backup.
- A V.A.T.S. overlay that calculates hit percentages for all body regions using your actual character stats.
- Point-of-no-return warnings from the AI before major story events, faction lockouts, or irreversible quest branches. Fallout 3 mode covers its own key story moments.
- Skills boosted by an active chem or magazine now glow green while the effect is running, and clear automatically when it expires.
- Fallout 3 mode replaces the Faction Standing panel with a Karma panel showing your current karma tier, threshold labels, and companion availability notes.
- Collectibles tracking: 7 Snow Globes for Fallout: New Vegas, 20 Bobbleheads for Fallout 3. A panel badge shows how many you have collected.
- A Regional Zone Map: a 6×6 grid with a blinking cursor on your current location, breadcrumb markers for visited zones, and amber markers for zones with uncollected items. Clicking any zone zooms to a detail view with sub-locations. On narrow screens the map shows 16 central zones by default, with a FULL MAP button to expand.
- An in-game Calendar showing the current in-game date in a readable format (for example, OCT 19, 2281) using each game's accurate starting date.
- A New Campaign flow: a Wipe Terminal button with a double-confirmation step that resets all data and prompts for game selection.
- Save slots now display which game they belong to. Loading a save from the wrong game shows a warning before proceeding.
- When the AI updates something in a tab you are not currently viewing, the app switches to that tab and opens the correct panel automatically.
- Five new audio cues: a click when opening or closing a panel or switching tabs, a hum that shifts pitch while waiting for the AI, a three-note chime on level-up, a slow heartbeat below 25% HP, and a power-on drone on your first interaction after boot.
- API errors now display as fictional RobCo exception codes rather than raw error text.
- Collectibles count shown in the session statistics panel.

### Fixed

- Switching games now fully reloads the app so no stale data from the previous game bleeds through.
- The AI can no longer accidentally switch your active game by returning the wrong game context.
- Undo now works correctly for both AI-synced state and manually imported saves.
- Cloud sync now transfers data for both games in a single push or pull.
- Map cells shortened slightly so the full 6×6 grid fits on desktop without scrolling.
- Calendar inputs now use real month, day, and year fields; they sync in both directions.
- The draggable XP bar syncs correctly when you change levels.
- A white-flash HP warning on iOS was replaced with a proper colored overlay.
- Wipe Terminal now actually resets your data.
- The XP formula corrected to match the actual Fallout engine values.
- The Complete RNG mode gained a third "locked" state: wiping the terminal while RNG is active locks it permanently for that campaign.
- Faction tier assignments corrected for several factions to match the intended UI layout.

---

## [v1.6.8] — Pre-Release Architecture<!-- Date: 2026-06-24 | Tests: 206/206 | Cache: robco-terminal-v1.6.8-r22 -->

### Added

- A Campaign tab (keyboard shortcut 4) was added to hold game context, playthrough type, Complete RNG mode, Wipe Terminal, and the Timeline display. Security and Config now covers only API key, display settings, audio, cloud sync, and saves.
- Complete RNG mode: a checkbox in the Campaign tab that, when on, shows a green banner and instructs the AI to make randomized narrative decisions. It is independent from Playthrough Type — any combination works.
- Perks now have delete buttons, matching quests and campaign notes.
- Clicking ACQUIRED or MISSING on a collectible now toggles it immediately without reloading the page.
- The help reference now shows all available commands in a formatted grid.
- The TIMELINE command now sends its output directly into the Campaign tab's Timeline panel instead of a pop-up overlay.
- Clicking any zone on the world map zooms in to a detail view listing every sub-location with visit and collectible markers. A back button returns to the grid. Tap targets were enlarged for mobile.

### Fixed

- The tab bar on phones now sticks to the top of the screen when you scroll down. Previously it scrolled out of sight.
- Playthrough Type is now saved with your character data and travels with exports, imports, cloud pushes, and cloud pulls. Previously it was stored only on the current device and lost on any transfer.
- Wipe Terminal now correctly resets all campaign data.
- Faction button clicks no longer collapse the Minor Factions section.
- RNG mode and Playthrough Type were originally merged into a single dropdown making combinations impossible. They are now a separate checkbox and selector; existing saves migrate cleanly.

### Changed

- Faction Fame and Infamy are now tracked as fully independent numbers, matching how Fallout: New Vegas handles them. Faction cards show Fame and Infamy separately instead of a single net score. Your standing is determined by the combination of both ranks.

---

## [v1.6.8] — Implementation Polish: Notes, Status, Squad, and UI Enhancements

<!-- Date: 2026-06-23 | Tests: 165/165 | Cache: robco-terminal-v1.6.8-r5 -->

### Added

- Campaign Notes gained individual delete buttons; auto-logged notes are visually distinct from manual ones; a manual add form was added.
- Quest changes are now automatically added to Campaign Notes with a timestamp.
- The Status Effects panel gained an add form with a tick counter and delete buttons per effect.
- The Squad panel gained a companion add form with autocomplete and remove buttons.
- The command quick-reference moved to a small button next to the token budget display.
- The D-Pad control is now collapsible to save vertical space.

### Fixed

- The Status Effects badge now counts permanent effects (zero ticks) instead of ignoring them.
- Number input widths increased so short placeholder labels are not clipped.

### Changed

- The Tactical Dashboard now uses a grid layout so combat buttons fill the available space when the D-Pad is collapsed.

---

## [v1.6.7] — Ammo Sub-Panel & Data Expansion

<!-- Date: 2026-06-22 | Tests: 137/137 | Cache: robco-terminal-v1.6.7-r4 -->

### Added

- Ammo now lives in its own collapsible sub-panel inside Inventory. You can add ammo with caliber autocomplete, delete entries, and track ammo separately from regular items.
- Each inventory item now shows a colored type tag (weapon, armor, aid, ammo, or misc). Adding ammo via the search field routes it to the ammo sub-panel automatically.
- The Inventory badge now shows the combined count of regular items and ammo calibers.
- The stat update summary after an AI sync now includes ammo changes.

### Fixed

- Adding an item that already exists at zero weight now corrects its weight using the real database value.
- Carry weight no longer includes ammo items.
- If the AI places ammo in regular inventory, it is silently rerouted to the ammo tracker.

### Changed

- The standalone Ammo badge was replaced by the combined Inventory badge showing regular items and ammo calibers together.

### Under the Hood

- Item database expanded substantially: weapons coverage grew to about 170 entries covering the full base game, armor to about 68, chems to about 45 including food and drinks.
- An unused save-state field was removed; old saves with this field are cleaned automatically on load.
- The changelog was renamed from a plain text file to a Markdown document.

---

## [v1.6.6] — THREAT Fix & Database Population

<!-- Date: 2026-06-22 | Tests: 138/138 | Cache: robco-terminal-v1.6.6-r5 -->

### Fixed

- The THREAT command was silently omitting the item database from its payload every time, making the AI's damage and survival calculations unreliable. Fixed.
- The THREAT command now sends your equipped weapon, armor, and ammo to the AI for accurate damage and time-to-kill math.

### Changed

- The item database is now always included in the AI's starting context, so it is available from the first turn of every session.

### Under the Hood

- Enemy database expanded from 4 to 63 entries covering the full Fallout: New Vegas roster.
- Weapon entries grew from 6 to 51; ammo subtypes from 7 to 47; armor from 4 to 19; chems from 4 to 20; misc items from 4 to 18; recipes from 1 to 10; quest items added (19 entries); vendors from 2 to 14.

---

## [v1.6.5] — Fallout Data Registry & Autocomplete

<!-- Date: 2026-06-22 | Tests: 119/119 | Cache: robco-terminal-v1.6.5-r2 -->

### Added

- Autocomplete dropdowns on quest name and item name inputs. Pulls from game wiki data, appears after two characters, and is keyboard-navigable.

### Under the Hood

- Registry data added: 130 quests, about 90 perks, about 120 locations, and all 10 companions.

---

## [v1.6.4] — Systems Architecture Update

<!-- Date: 2026-06-22 | Tests: N/A | Cache: robco-terminal-v1.6.4 -->

### Added

- Quest Log: track name, status (active, completed, or failed), objective, and faction involvement. The AI updates quest status automatically during play.
- Equipped item slots: your current weapon, armor, and headgear shown in the character panel.
- Three save slots (A, B, C) with full save and load buttons. Each stores your complete character state.
- Session statistics: kills, caps earned, damage dealt, and elapsed time. The AI returns stat changes each turn.
- Token budget display: estimated usage shown below the chat input, color-coded by how full the budget is.
- Item type selector when adding inventory items: weapon, armor, aid, ammo, or misc.
- Keyboard shortcuts: number keys to toggle panels; a shortcut to focus the chat input.
- Radiation alert in the character panel when rads reach a danger level, with a count of RadAway doses on hand.
- Status effects auto-decrement each AI sync; expired effects post a chat notice.
- A subtle blue tint during in-game night hours.
- Count badges on the Perks, Inventory, Squad, Status, and Notes panels.
- A chat notice when any faction hits Idolized or Vilified.
- A brief screen-edge glow when karma changes by a large amount in one sync.
- A red background flash when HP drops below 25%.
- Panel open/closed states remembered across sessions.
- Command history: Up and Down arrows cycle through previously sent commands.
- A two-note tone after every successful AI sync.
- Each inventory item has a USE button that sends the use command automatically.
- Skill checks in AI narrative are highlighted green or red for pass or fail, and the relevant skill input briefly highlights.
- Squad members with an affinity value show a 0–100% bar.
- Typewriter speed slider in Audio settings (0.25× to 3×).
- One silent auto-retry on transient connection errors after a short delay.
- Last 10 distinct locations tracked in your save.
- Campaign log export in Markdown and HTML formats.
- A Perks panel; the AI updates your perks on level-up events.
- Item value field (caps value) shown next to each inventory item.
- A draggable XP bar showing progress within the current level.
- A single master mute toggle that silences all audio; individual controls remain independent.
- A status summary posted to chat on boot when a save exists.
- A stat change summary after every AI sync listing every stat that changed.
- Radiation debuff display: stat inputs turn red when radiation debuffs apply, with a tooltip showing which ones.

### Fixed

- The API key is now sent in the request header rather than the URL, so it no longer appears in browser history or server logs.

### Changed

- The transmit button becomes a Cancel button during API calls, with a 45-second automatic timeout.
- Cloud saves now include a timestamp; pulling warns if the cloud data is older than your local save.
- Fame and infamy changes from each AI sync are auto-logged to campaign notes.

### Under the Hood

- The import function was rewritten with explicit typed field-mapping and range validation on all stat values, replacing a recursive approach that had no depth limit.

---

## [v1.6.3] — Faction Network Update

<!-- Date: Unknown | Tests: N/A | Cache: robco-terminal-v1.6.5 -->

### Added

- 14 factions are now tracked: 6 major factions in a 3-column grid, 8 minor factions in a collapsible sub-section.
- Cloud sync now includes chat history and playthrough type, enabling full session restore from any device.

### Changed

- Faction data restructured so each faction tracks Fame and Infamy independently. Old saves migrate automatically.
- Save exports now include the full chat history in a versioned format. Old saves without chat history still import correctly.
- The tick system clarified in AI instructions: ticks are a pacing guide, not an action lock. The Courier can act at any time.

---

## [v1.6.2] — Character Sheet Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- All 13 Fallout: New Vegas skills tracked and shown to the AI every turn. Skill checks and calculations use your actual values.
- A crippled head now triggers a two-layer audio effect — concussive thud followed by ringing.
- Tinnitus activates at very high radiation or a crippled head, and requires both conditions to clear before it stops.
- Status Effects panel: the AI was already writing effects to your save — now they are visible in the UI.
- Campaign Notes panel: the AI's auto-logged tactical decisions shown as a bullet list.
- Faction Standing panel: NCR, Legion, and Strip standings with color-coded labels.
- A game-time clock next to the TICKS field showing day and time in hours and minutes.
- A keyboard shortcut to send a message without clicking the button.
- Undo last sync: one click restores the full state from before the previous AI response. Reappears after every sync.
- Separate mute controls for limb trauma sounds and the tab-return tone.

### Fixed

- The FEATURES command now shows the real command list instead of invented commands.
- The dim overlay during tab return now holds for the correct duration so messages appear against a dark screen.

### Changed

- A full state snapshot is taken before every AI sync. Undo restores it in one step.
- Skill values returned by the AI are now clamped to valid ranges.

---

## [v1.6.1] — The Living Machine Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Geiger counter audio: procedural clicking sounds scaling from slow clicks at low radiation to continuous static at extreme levels.
- Tinnitus audio: a barely-audible high tone at high radiation that randomly swells.
- CRT hum: a persistent low hum throughout the session; shifts pitch at high radiation and briefly cuts out when a limb is crippled.
- When the AI updates a stat, the previous value briefly rises and fades from that input field.
- The Inventory panel subtly sags at high carry weight and jitters at maximum.
- Typewriter speed now reacts to the narrative: faster during combat, slower during rest.
- Switching tabs dims the terminal; returning plays a tone and shows a return message.
- Crippling a limb plays a distinct sound; restoring one plays a recovery sound.
- A live session uptime clock in the header; a memory cycle message every 15 minutes.
- The terminal background warms to amber during AI calls and cools on response.
- A button to view the changelog from the Configuration panel.

### Fixed

- All AI narrative text is now escaped before display, closing a path where a malformed AI response could have run injected script.
- Changelog display correctly extracts only the most recent version block.

### Changed

- Typewriter animation overhauled to eliminate a slow re-parsing pattern that caused performance issues in long sessions.
- State is written to storage at most once every 500 milliseconds, and flushed when the tab closes.
- Audio mute checks now read from an in-memory object instead of storage on every audio tick.
- Inventory and squad lists built as single strings and assigned in one operation.
- In-memory chat capped at 200 messages.

---

## [v1.6.0] — PWA, Mobile & Visual Overhaul

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Playstyle toggle: switch between Any Weapon and Melee or Unarmed Only. Blocked if incompatible perks are already acquired.
- The app can now be installed to iOS, Android, and desktop home screens. An install button appears when the browser confirms eligibility.
- New terminal color presets: Legion Red, Ghoul Green, and Neon Purple.
- A live HP bar below the HP inputs that transitions from green through amber to red.
- The radiation field changes color and pulses at danger thresholds; at extreme levels it triggers full-screen distortion.
- A 1.5-second cold-boot animation on every page load.
- All stat fields briefly glow after each AI sync.
- Crippled limb buttons periodically blink and jitter.
- Stat change arrows animate in from above or below.
- The HP bar is interactive: click or drag to set your HP. Touch-compatible.
- The title in the header breathes slowly.

### Fixed

- Cloud sync no longer fires automatically on every stat change. Cloud sync is now manual only.

### Changed

- CRT scanlines made heavier for a more authentic look.
- Button hover replaced a harsh white flash with a smooth brightness boost.
- The phosphor sweep bar uses the active terminal color.
- Panel headers gained slight letter-spacing.
- The custom scrollbar uses the active terminal color.

---

## [v1.5.9] — Immersion & Tactics Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Terminal color options: RobCo Green, New Vegas Amber, and Vault-Tec Blue.
- Audio mute toggle for typing sounds.
- Clicking a map cell automatically sends a move command to that location.
- Location autocomplete using all major Mojave locations.
- Campaign log download as a text file.

---

## [v1.5.8] — PWA & Mobile UX Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Service worker and PWA support: all assets cached for faster loads, and a "REBOOT TERMINAL" prompt fires automatically when a new version is available.
- All UI sections are now collapsible panels — closed by default on mobile, open by default on desktop.
- A manual cloud sync button for an immediate push in addition to auto-save.
- The latest patch notes are shown automatically after an update.

---

## [v1.5.7] — Mobile UX & Gamification

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Tactical D-Pad: an 8-way directional pad and quick-action buttons for common commands, designed for mobile.
- Tapping map commands opens an interactive grid; tapping trade commands shows Buy and Sell buttons.
- Squad tracker: companions shown with health, condition, and ammo.
- Cloud sync framework: cross-device save architecture.
- An animated scan effect and audio loop during image uploads.
- CRT scanlines with flicker animation.

---

## [v1.5.6] — Modular Architecture & System Hardening

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Keyboard click sounds generated in-browser with no audio files required.
- CRT overlay with scanlines and flicker.
- Tick clock: ticks tracked in save state and sent to the AI; buffs and debuffs expire by tick count.

### Fixed

- Fixed a bug where the AI's token-saving logic could accidentally drop the full inventory during looting or crafting.

### Under the Hood

- The app was split from a single HTML file into separate files for state, UI, AI, database, and styling.
- All AI instructions unified into a single system prompt.
- Item database now only injected into AI context when the command actually needs it, saving about 1,500 tokens per standard turn.

---

## [v1.5.5] — Native Web App & AI Memory

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- List-based AI responses now open in a pop-up overlay instead of appearing in the chat.
- Campaign notes memory: the AI can write tactical decisions to a persistent notes field. Notes are saved with your state and re-injected every turn, giving the AI persistent memory without extra context tokens.

### Changed

- The AI response format expanded to three parts: narrative text, state changes, and an optional overlay trigger.
- The AI's temperature locked at 0.2 to reduce hallucinations. The full Gem persona embedded into the system instructions.

---

## [v1.5.4] — Stability Patch

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- AI narrative now outputs as a list of strings, preventing crashes from unescaped line breaks in the AI's text.
- Full templates for all custom commands are now hardcoded into the system instructions so the AI can render them accurately.
- Fixed a layout issue where the terminal stretched infinitely downward instead of scrolling.

### Changed

- The AI's full strategic logic from the original version was merged back into the system instructions.
- Temperature locked at 0.2.

---

## [v1.5.3] — Stability & Customization Patch

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- AI narrative mandated as a list of strings to prevent line-break-induced crashes. Chat rendering updated accordingly.

### Added

- A dedicated section for customizing the FEATURES command output that will not be overwritten by framework updates.

---

## [v1.5.2] — Website Architectural Overhaul

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- The AI now retains full conversation history: every request includes the complete chat history so the AI remembers what happened earlier in the session.
- The UI is locked during AI calls to prevent stat changes from overwriting state while the AI is calculating.
- Typing "help," "menu," or "commands" now correctly routes to the FEATURES command instead of breaking the AI's persona.

### Added

- Token triage: inventory data is stripped from the AI payload during non-inventory commands to reduce token cost.

### Changed

- The AI is locked into outputting strict JSON, eliminating crashes from free-form text responses.

---

## [v1.5.1] — Engine, Optics & Stability

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- A live dropdown that fetches available AI models on startup.
- API key sanitization: invisible characters are stripped from pasted keys, fixing common connection errors.
- Auth failures and rate limits are printed to the chat display.
- Image upload: attach a screenshot for AI visual analysis.

### Fixed

- Every stat change now writes to storage immediately.
- Corrupted chat history now resets gracefully instead of crashing.
- File import no longer gets overwritten immediately by default form values.

### Changed

- Inventory data is stripped from the AI payload during non-inventory commands. Carry weight and maximum AP are now calculated in the browser; the AI handles only narrative and lookups.

---

## [v1.5.0] — Comm-Link API Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Live AI integration: your character state is automatically attached to every prompt, and AI responses update your stats directly. No more copy-pasting.
- API key stored only in the browser — never in the repository.
- The app can now be installed as a standalone offline app.
- Widescreen dual-column layout.
- Persistent chat: survives tab closure and browser restart. A PURGE LOGS command clears it.
- S.P.E.C.I.A.L. values clamped 1–10 in the UI.

### Changed

- The AI is now instructed to treat the browser UI's state as the source of truth for math, and to stop generating tables for things the UI handles natively.

---

## [v1.4.7] — Beta: Web Architecture Transition

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Client-side state tracking: inventory, S.P.E.C.I.A.L., wealth, and character data tracked in the browser to reduce AI token cost and prevent stat drift.
- A parser that auto-maps AI responses with unexpected key formats.
- AI integration directly in the terminal.
- PWA installation; state saves on every keystroke.
- A chem and trauma matrix in the UI.

---

## [v1.4.6]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Changed

- Stasis Protocol: inventory management, gear swaps, and using items no longer advance the in-game clock. Time only moves during combat, travel, or deliberate wait or sleep.
- Armor condition formula: active damage reduction now scales with how close your armor's condition is to its minimum threshold.
- If a companion runs out of custom ammo mid-combat, the engine resolves the custom ammo damage first, then switches to their default ammo for the rest of the turn.

---

## [v1.4.5]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- The SYNC command now bypasses addiction cascade warnings.
- Melee and Unarmed characters recover additional action points per combat round during extended combat simulations.

### Fixed

- Crafting: yielded items are added to carry weight after consumed ingredients are removed.
- Visual VATS: hit percentages from screenshots are taken as-is; crippled limb penalties are not applied a second time.

---

## [v1.4.4]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- A BIND command to assign consumables to D-Pad directions explicitly.
- Level cap set to 50; XP tracking stops permanently at that level.
- EXCESS command shows your top 5 most valuable items per category; append FULL for the complete list.
- Visual VATS: extracts hit percentages from screenshots and converts them to action point and damage math.

---

## [v1.4.3]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- TRADE now enforces vendor cap limits. You can no longer drain a vendor into negative caps.
- Maximum action points now use the correct formula.
- Items moved to a stash are removed from the backpack at the same time.
- If a companion runs out of custom ammo mid-combat, the engine switches to their default weapon and recalculates.

---

## [v1.4.2]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- XP formula hardcoded so the AI always calculates level-up thresholds correctly.
- The viewport mode (mobile or desktop) is stamped in every response footer to prevent the AI from drifting to the wrong width in long sessions.

### Changed

- Radiation now applies the correct debuffs at each danger threshold. RadAway and Rad-X formulas hardcoded.
- Heavy inventory lists render in a two-column layout in desktop mode.

---

## [v1.4.1]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Diagonal D-Pad directions recognized.
- Footer borders scale to match the active viewport width.

### Changed

- All companions fully heal and clear crippled limbs after successful combat.
- TRADE enforces a buy/sell margin so sell prices must fall below the vendor's purchase price.
- STASH shows your top 5 items per category; append FULL for the complete list.
- AI output sequencing standardized: stat changes first, then tables, then footer.

---

## [v1.4.0] — Telemetry Dashboard Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- A new dual-line boxed dashboard footer that stays on one line without wrapping on phones.
- VIEW DESKTOP and VIEW MOBILE commands to switch between wide and narrow rendering modes.
- Using a chem or medical item via shorthand or D-Pad always removes exactly one from inventory.
- Ammo quantities shown in inventory output.

---

## [v1.3.9]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Quiet Mode modifier: suppresses narrative and shows only the stat changes. Faster for multi-turn combat on mobile.
- Stealth modifier: applies the weapon crit multiplier to the first strike.
- TRAVEL CLUSTER advances ticks proportionally to distance.
- Short two-letter aliases for common commands.
- Command chaining: run two commands in one turn.
- Pre-emptive Scanning parameter restored to prevent skill check bottlenecks.

### Changed

- All table borders replaced with Unicode box-drawing characters.
- All AI-generated UI capped at a consistent width for phones.
- NCR and Legion currency shown continuously in the footer.

---

## [v1.3.8]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- VATS SIM supports targeting a specific limb for anatomical damage calculations.
- TRADE applies Barter skill and reputation math automatically.
- XP earned after combat is proposed for confirmation before being added.
- STASH shows a visual condition bar using block characters.

### Changed

- Action points fully restore after successful combat. Stimpaks heal instantly; chem timers use tick counters.
- Items auto-unequip and show a warning when their condition reaches zero.

---

## [v1.3.7]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- SYNC command: a high-speed bulk state update that skips narrative and shows only stat changes.
- If a command lacks enough context for accurate math, the AI is required to show an INSUFFICIENT TELEMETRY warning instead of guessing.
- Batch Sync and D-Pad commands added to the FEATURES menu.

---

## [v1.3.6]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- D-Pad directional commands instantly use or equip the item bound to that direction.
- Karma values mapped to descriptive title labels from the game.
- Using a recipe removes the consumed ingredients from your backpack immediately.
- Companion carry capacity capped at the game limit.
- Re-dosing a chem from the same family resets its timer instead of stacking a ghost withdrawal.

### Changed

- Stat change arrows changed to solid block characters for a more authentic look.
- All stat outputs clamped to valid ranges.

---

## [v1.3.5]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- A new database for junk, crafting components, and currencies. Carry weight now references real item weights from this data.

### Fixed

- Visual Upload now requires specifying a category so it only overwrites that item type, not everything.
- Ammo and chems are treated as weightless when missing from the database.
- Visual uploads can no longer overwrite condition percentages tracked by the combat engine.

---

## [v1.3.4]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Carry weight recalculates automatically on every inventory transaction using real item weights.

### Fixed

- Visual Upload now fully rebuilds inventory from the image, preventing ghost duplicates of dropped items.

---

## [v1.3.3]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Under the Hood

- Developer documentation for action point allocation in unarmed and melee combat updated.
- Visual VATS interface card template added to the AI's templates.

---

## [v1.3.2]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- The footer now tracks ticks, fame, infamy, and karma to prevent them from drifting between turns.
- Jury Rigging repair formula hardcoded in the AI's instructions.
- A WAIT command to advance time without a bed. A SLEEP command fully heals HP, radiation, and limbs.

### Changed

- Item database fields expanded to cover XP yield, item value, and ammo type — prevents the AI from guessing on those fields.

---

## [v1.3.1]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- The FEATURES menu now correctly lists the WAIT command.

### Changed

- Changelog removed from the AI's active context to save tokens.
- Wait and Sleep separated into distinct commands.
- Multi-page commands merged into a single paginated command.

---

## [v1.3.0] — Systems Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Level-up protocol: the AI recognizes XP thresholds, allocates the correct skill points per level, and locks perks to even levels.
- Companion logistics: companions use infinite ammo for their default weapons; custom ammo is actually consumed. Companions go unconscious instead of dying permanently on Normal difficulty.
- A WAIT command to fast-forward time without a bed. Advancing time cycles vendor restocks.

### Changed

- Carry weight formula hardcoded. Condition repair scales with the Repair skill.

---

## [v1.2.5]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Fixed

- A fictional context wrapper was added to the top of the AI system prompt to prevent false-positive content flags on authentic Fallout terminology.
- Authentic Fallout terminology restored after it was replaced with clinical language in the previous version.
- Bracket formatting fix from the previous version preserved.

---

## [v1.2.4]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- Curly braces in the response footer were replaced with standard brackets to prevent conflicts with the JSON parser. The stat change summary prefix was updated accordingly.

---

## [v1.2.3]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- Seven system alert icons explicitly mapped to their alert types so the AI always picks the correct one.
- Backtick formatting syntax restored in the formatting guide.

---

## [v1.2.2]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- COMM LINK command: temporarily steps out of the RobCo persona to let you speak directly with a game character in their own voice. Entry and exit are marked with distinct cards.

---

## [v1.2.1]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- Crafting engine: the CRAFT command checks your inventory against the recipe database and enforces skill gates before allowing a craft. A UI template shows available recipes and missing components.

---

## [v1.2.0]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- Every AI response now opens with a one-line summary of exactly what changed before the narrative.
- Fame and Infamy tracked independently per faction, matching the real Fallout: New Vegas game. Economy math updated for mixed standings.
- GPS and MAP commands draw a compass with local threats and the nearest safehouse.

### Changed

- The response footer changed from a text summary to a compact data block — fewer tokens per turn, less stat drift.
- Condition bars upgraded to solid block format.

---

> All game data sourced from [fallout.wiki](https://fallout.wiki) (CC-BY-SA 4.0).
