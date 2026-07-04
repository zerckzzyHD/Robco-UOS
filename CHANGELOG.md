## [Unreleased]<!-- Tests: 2141/2141 | Cache: robco-terminal-v2.7.0-r60 -->

### Added

- Added an INCIDENT LOG to the campaign panel — a "big moments" view of your campaign's history showing just the milestones (level-ups, faction standing shifts, quest outcomes), separate from the fuller CROSSROADS RECORD that lists every recorded event.
- THREAT assessments now warn you outright when the ammo a fight would burn is more than you're actually carrying, instead of leaving you to do the math yourself.
- Added inline buttons to nudge a companion's rapport with you up or down directly from their squad card — previously the only way to see or change it was to wait on the AI.
- Save slots now keep a short history of earlier saves. Each time you overwrite a slot, its previous contents are kept — up to five earlier versions per slot — so a save you didn't mean to replace isn't gone. A "VER" button appears next to a slot that has earlier versions; tap it to see the list with the date and time each was saved, and restore any one. Restoring is confirm-gated and takes a safety backup of your current campaign first, so it can be undone. Version history uses the terminal's larger local storage, so it doesn't crowd out anything else, and if your browser doesn't support that storage the feature simply isn't offered and saving works exactly as before.
- Added a one-file "EXPORT FULL BACKUP" that saves your ENTIRE history — your live campaign, all three save slots (including each slot's version history), and your automatic backups — into a single portable file you can keep or move to another device. To restore it, use IMPORT SAVE and pick the backup file: the terminal recognizes it automatically, asks you to confirm (since it replaces your current campaign), takes a safety backup of your current state first, and only proceeds if the file passes an integrity check — a corrupted or edited backup is refused with a clear message and nothing is changed. IMPORT SAVE still accepts a single save file too; it just handles both now.
- Tapping "Save to Cloud" while you're offline no longer just fails. If you're offline (or the network drops mid-save), that save is now queued on your device and uploaded automatically the moment you reconnect — you'll see a note that queued saves went up. This only ever retries a save YOU chose to push; nothing is ever uploaded automatically on its own, and cloud saving stays a manual button. The queue is capped and never creates duplicate cloud saves, and if this ever needs to be turned off it can be disabled remotely — with it off, the button behaves exactly as it did before.
- Added an IMMERSION setting (Full / Balanced / Minimal) in Security & Configuration — one control for how much of the terminal's ambient atmosphere is switched on. It defaults to Full (exactly how the terminal behaves today) and is remembered on your device (it's a per-device display setting, so it never travels with your saves). This is the foundation for finer atmosphere control coming later; for now it already quiets one periodic ambient effect at the lower levels as a first taste.
- The terminal now visibly settles when you leave it alone or step away. After a couple of minutes with no input, the display dims slightly and a small "REDUCING PHOSPHOR WEAR" note appears in the corner — an understated screensaver touch that clears the instant you touch anything again. Switching away from the tab now deepens into a slower breathing dim layered on top of the terminal's existing standby screen. Both show at Balanced and Full immersion; Minimal keeps things quiet, as always, and the existing standby response itself is unchanged. The "living machine" engine also now knows how to perform a proper CRT power-down — a collapse-to-a-dot shutdown flourish — ready for an upcoming feature to trigger it. Anyone with "reduce motion" enabled sees an instant cut instead of the animation, same as every other CRT effect in the terminal.
- Added a MODE pill to the Comm-Link input, right next to the "?" help button. Tap it to switch between OVERSEER (the AI narrator, exactly as before) and TERMINAL (typed commands and quick one-liners handled instantly on your device, no AI call). The prompt text changes to match whichever mode is active, and your choice is remembered on this device. In TERMINAL mode, natural one-liners like "killed 3 raiders", "+50 caps", "arrived Novac", or "rep NCR up" are recorded straight to the right tracker without opening any menu — comma-separate several on one line (e.g. "killed 3 raiders, +50 caps, arrived Novac, rep ncr up") to log them all at once; anything it doesn't recognize gets a gentle hint pointing you to the command list instead of doing nothing. A message that starts with `/` always goes to TERMINAL just that once, no matter which mode you're in. Putting `@` anywhere in a message pings OVERSEER with just the text after it — everything before the `@` is dropped — so you can jot a quick-log note and tack on an AI question in the same line. A small note appears the moment you type either symbol showing exactly where it's headed. TERMINAL mode also offers matching command and quick-log suggestions as you type, including creature, location, and faction names once you've started typing a recognized quick-log verb.
- Installing or ejecting Module Bay hardware now gives you a satisfying tactile click or thunk — pulling or plugging a channel chip, the sound board itself, the radio, the power cell, or the haptic solenoid all get their own sound. A new SERVO CLICK RELAY switch on the sound board lets you turn these clicks off if you'd rather keep things quiet.
- Added an OVERWRITE option next to each save in your saves list — for a local save slot or a cloud save — that replaces its contents with your current campaign while keeping its existing name, no rename needed. You're always asked to confirm first, and overwriting a local slot still keeps the version it replaced recoverable in its version history.
- The Comm-Link is now a living "Director Uplink" — a small oscilloscope-style waveform sits above your conversation and visibly reacts to what's actually happening: a calm, gentle hum while it's listening, a restless jagged trace while your message is being sent, a steady pulse while a reply comes in, a flat "no carrier" line if you haven't entered a key or the AI has been switched off, and a flat "offline" line if your connection drops. The header and status readout are dressed to match, and now name the game you're playing (New Vegas shows the Lucky 38 relay; Fallout 3 shows the GNR relay). On a phone, opening the Comm-Link now shows a compact, self-contained view instead of one long scrolling page — every other screen shows a small "Director Uplink" strip along the top that you can tap to jump straight in, so the Director never fully disappears. Anyone with "reduce motion" enabled, on the Minimal immersion setting, or with the terminal on standby simply sees a still frame instead of the animation.
- Added a DELETE option to each local save slot in your saves list, matching the one cloud saves already had. You're always asked to confirm first, and deleting a slot also clears any version history saved for it.
- Cloud saves now keep version history too, just like your local save slots. Overwriting a cloud save no longer risks losing what was there before — up to five earlier versions are kept, and a "VER" button appears once a save has any to show. Tap it to see when each version was saved and restore one; restoring is confirm-gated and only replaces your current campaign, never the cloud save itself.
- Added a TOOL DECK to the Director Uplink — a new diamond-shaped button beside the message box raises a compact panel with one-tap access to THREAT, V.A.T.S., TRADE, LOOT, CONSULT, and the V.A.T.S. calculator, so none of them need to sit permanently on screen anymore. The old blind D-Pad shortcuts are redesigned into a Quick-Draw Holster inside the same panel: all four gear slots now visibly show what's bound to them instead of blank arrows, fire with a single tap, and can be rebound to a different item right there.

### Changed

- Your CAMPAIGN NOTES panel is now purely your own manual notebook — the automatic event entries (things like level-ups, faction changes, and quest updates) that used to be mixed in with your typed notes now live in the campaign's event history (shown in CROSSROADS RECORD and the new INCIDENT LOG) instead. Your existing notes are sorted automatically: your own written notes stay in the notebook untouched, and the auto-logged events move to the history. The AI can no longer overwrite your notebook either — anything it reports is recorded in the event history, and your written notes are yours alone.
- Removed the unused Projected Timeline feature and its command. It never had a way to be filled in on its own and always showed "no timeline generated."
- The Security & Configuration panel is now a Module Bay — open a service hatch once, and your settings appear as labeled hardware boards (a phosphor tube rack for your screen color, a sonic processor board for sound, a power cell bay for display and vibration settings, an atmospheric regulator for the immersion level, an AI uplink board for your Gemini key, and a maintenance tray for exports and the changelog) instead of a plain list of toggles and dropdowns. Every setting still does exactly what it did before, in the same place, in the same one tap — this is a visual reframe, not a functional change. A "Schematic View" button always gives you the old flat list if you'd rather skip the theming, and your save archive and account settings stay right where they were, below the bay.
- The terminal now looks and feels like a physical RobCo device — a casing with brand plating and status lamps frames the screen, and the plain tab bar has been replaced with a row of illuminated hardware buttons: OPERATOR (your stats), OPERATIONS (inventory and crafting), DATABANK (quests, the map, and campaign records), UPLINK (the AI comm-link), and CHASSIS (settings and saves). A live readout above the buttons shows which section you're in. Number keys 1 through 5 jump straight to each section exactly like before, and a new DIRECTORY button (or the 0 key) opens a plain, old-style list of every section for anyone who prefers it. Every section works exactly as it did before — this only changes how you get there, and everything still fits cleanly on a phone screen.
- Your saves list now only shows saves for the game you're currently playing — New Vegas saves stay out of sight while you're in Fallout 3, and vice versa. An older save that predates this change is still shown rather than hidden, since there's no way to tell which game it belongs to.
- The always-visible row of quick-command buttons and the D-Pad below the Director Uplink message box are gone, replaced by the new Tool Deck panel described above — the conversation now has the whole screen to itself until you need one of those tools.
- Removed the TERMLINK command console entirely — the Tool Deck already covers every subsystem it used to launch, so it was left as an unnecessary second way to reach the same tools. Typing TERMLINK no longer does anything; everything it offered (V.A.T.S., THREAT, TRADE, CONSULT, BIO-SCAN, LOOT) is still reachable exactly as before, either through the Tool Deck or that tool's own panel button.
- Retired the typed CROSSROADS command, now that the CROSSROADS RECORD is already a standing panel you can open any time — typing it (or looking for it in the command list) no longer does anything. Nothing about the panel itself changes.
- The Module Bay's phosphor tube color picker got a visual upgrade to match the rest of the hardware rack: the three green tube colors (RobCo Green, Pip-Boy Green, Ghoul Green) now collapse into one "3 types" cartridge you tap to fan open, instead of showing all seven colors side by side, and every tube — including the cartridge and the four standalone colors — now shows a small indicator light under its name so you can see which one is seated at a glance. Every tube is also now the exact same size. Picking a color, and which color is remembered for which game, both still work exactly as before.

### Fixed

- Closed a rare data-safety gap where certain unusual or corrupted responses from the AI could silently turn one of your character's core stats into an invalid, unusable value instead of being safely ignored. Your character sheet can no longer be corrupted this way.
- Fixed faction reputation alerts never appearing in Fallout 3 campaigns. Crossing into Vilified or Idolized standing with any faction now reliably shows the on-screen alert and its confirmation tone/vibration in both games — previously the alert only recognized New Vegas faction names, so Fallout 3 campaigns silently never triggered it no matter how hostile or beloved a faction became.
- Fixed the inventory filter bar offering a "Mods" filter in Fallout 3 campaigns, where weapon mods don't exist and that filter could never show anything.
- Fixed a case where powering the terminal fully down could leave the screen completely black with no way to bring it back — a clear "PRESS TO POWER ON" button now appears whenever the terminal is shut down, and tapping it fully restores the terminal to normal.
- Fixed hard-to-read color names on the Module Bay's phosphor tube rack, which were rendering nearly invisible against their own dark background. Also fixed the Module Bay's Schematic View clipping some control text (like the phosphor tube picker showing "ROBCO GR…" instead of the full name), and fixed the maintenance tray's buttons staying pinned to the left with an empty gap when the app is already installed — they now re-center properly.
- Fixed the Module Bay's sound board showing only the individually-muted channel chips as pulled when you ejected the whole board (master mute) — every channel now visibly reads as unplugged together while the board is out, and each one returns to its own on/off setting the moment you reseat it.
- Fixed several places where recording something in TERMINAL mode changed your campaign but the screen didn't visibly catch up until you switched tabs or refreshed. Logging a kill or a caps change now updates the CROSSROADS RECORD and INCIDENT LOG right away, and "arrived <location>" now actually moves your current position on the WORLD MAP instead of only marking that place as visited.
- Fixed the Module Bay's one-time service-hatch reveal popping open the moment the terminal loaded on a wider screen, before Security & Configuration had even been opened. That panel now starts closed by default, and the hatch only ever appears the first time you actually open it.
- Fixed the AI Uplink board always reading "NO CARRIER" even after your Gemini key was validated and an engine selected. It now shows a clear "carrier established" status with your chosen engine once the handshake actually succeeds, and reverts automatically if you edit the key afterward.
- Fixed a few places where a partial last row of controls stayed pinned to the left with an empty gap instead of centering — the sound board's channel chips, the phosphor tube color picker, and the Save/Sync-to-cloud buttons now all center a leftover row properly.
- Fixed the bottom navigation buttons rendering above the screen instead of below it on phones — they're now pinned to the bottom of your screen at all times, and no longer occasionally split unevenly across two rows with one button floating off to the side.
- Fixed a stray thin sliver of color trailing the last connector pin on the Module Bay's hardware boards and channel chips.
- Fixed the saves list not updating right after you saved, overwrote, or restored a version — you previously had to tap LOAD on something else before it caught up. It now refreshes immediately every time.
- Fixed the Save & Data help menu not explaining the EXPORT FULL BACKUP button — it now describes what it bundles and how to restore it.
- Fixed the Director Uplink view feeling cramped on phones and gave the message box a modern, messenger-style redesign. The oscilloscope was eating a big share of the screen, your conversation read as a small box, and the D-PAD/quick-command buttons below it were rendering in an outdated blue/green style that clashed with the amber Director theme. The oscilloscope is now a compact banner and your conversation gets much more room and leads the screen. Your conversation and your typing box are now one single rounded card, just like a modern messaging app — the photo-upload button, the OVERSEER/TERMINAL mode switch, the help button, and a round send arrow all sit together in one row at the bottom of that same card, instead of a plain text box with a send button buried at the very bottom of the screen. The D-PAD/quick-command buttons — recolored to match the amber theme — tuck into a collapsible tray you can open when you need them (they stay visible on desktop, exactly as before).
- Fixed the Director Uplink message box showing a chunk of empty space below the example text. It now starts just tall enough to show its placeholder line, grows only as you actually type, and shrinks back down to that small size right after you send.
- Fixed the OVERSEER/TERMINAL mode button staying visibly lit up after you tapped it on a phone, until you tapped something else on screen.
- Fixed the growing button row on each save (Load, Overwrite, version history, Delete, and — for cloud saves — Rename) potentially getting cut off on narrower screens. Buttons now wrap onto a second line instead of clipping or forcing the row to scroll sideways.
- Fixed the Tool Deck's target field not offering any suggestions as you typed. It now suggests matching creatures, items, locations, and other topics as you type, the same way the other search boxes in the terminal already do.
- Fixed the Tool Deck popping open the on-screen keyboard the moment you opened it, which could cover the Quick-Draw Holster's four gear slots underneath. The keyboard now only appears once you actually tap the field.
- Fixed the PWR, UPLINK, and FAULT status lights on the terminal's casing being purely decorative. Tapping PWR now powers the terminal off (tap the "PRESS TO POWER ON" button to bring it back); UPLINK now only lights up when your AI connection is actually working and jumps straight to the AI Uplink settings when tapped; FAULT now only lights up when an error has actually been recorded and opens the error log when tapped.
- Fixed the Director Uplink's "NO CARRIER" status doing nothing when tapped and never updating without a reload. Tapping it while disconnected now jumps straight to the AI Uplink settings, and the status flips between "listening" and "no carrier" the instant you add, remove, or change your key — no reload needed.
- Fixed the status strip along the bottom always claiming your vitals were nominal no matter what. It now shows your real health status (including warnings for low, critical, or crippled conditions), your actual radiation level, and whether your AI connection is genuinely online.
- Fixed a stray purple-tinted outline framing the entire terminal casing under some phosphor color choices — the terminal's own device chrome frames the screen now, so a leftover flat border underneath no longer draws a second frame around everything.
- Fixed switching between the terminal's sections (Operator, Operations, Databank, Uplink, Chassis) losing your scroll position — each section now remembers exactly where you left off, restored automatically when you switch back or reload the page.
- Fixed the Module Bay's decorative BACKPLANE BUS header wrapping raggedly along the left edge on narrower screens — it's now centered.
- Fixed the Director Uplink view looking like a panel stacked inside another panel. The amber frame that boxed the whole conversation area, and the separate box around the transcript itself, are both gone — your conversation now reads directly on the screen, like a real terminal, with only the message box at the bottom still shown as a bordered pill.
- Fixed the Module Bay's green phosphor tube looking like a flat-topped battery instead of a real tube, fixed its two hidden "sister" tubes never actually peeking out from behind it to hint there were more shades to choose from, and shrank both the oversized "3 TYPES" label and the "(DEFAULT)" marker into small tags in the corners so every tube on the rack — not just the green one — can stay the same compact size.

### Improved

- Your campaign's event history now also records level-ups, newly-found collectibles, crafting and scrapping, buying and selling, and resting — not just faction changes, quest updates, and new locations. Open CROSSROADS RECORD to see the fuller history, or INCIDENT LOG for just the milestones.
- Your current-session time readout now shows a friendlier format (like "2h 15m") instead of a raw minute count.
- The databank lookup now also searches your collectibles, skill books, magazines, traits, and Lincoln memorabilia trackers, and surfaces a couple of previously-hidden details when it finds a match — like a quest item's story purpose or a creature's experience yield.
- Confirmation prompts and status messages — save/load warnings, cloud sync results, crafting and trading confirmations, and more — now appear as in-terminal pop-ups that match the rest of the interface, instead of your browser's plain "OK/Cancel" dialog boxes.
- The Module Bay now looks and feels more like real hardware: the sound board's 13 mute switches are drawn as chips you plug in or pull, the power cell and haptic solenoid show their own device graphics, and the immersion level is now a turnable dial instead of a dropdown. Whichever view you last used — the hardware Bay or the flat Schematic list — is now remembered the next time you open Security & Configuration.
- The Atmospheric Regulator dial can now be turned by dragging or sliding it with a mouse or finger, not just tapping — dial in the level you want in one smooth motion. Tapping still works exactly as before.
- The Save & Data help button now matches the modern round design already used on the Comm-Link's help button, instead of the older bracket style.
- Every line in the Director Uplink transcript now carries a small OVERSEER tag when the Director itself is speaking, so it's easy to tell at a glance which lines came from the AI versus your own typed or logged commands.

### Under the Hood

- Restructured how the AI's core instructions are assembled internally, breaking one large block of instruction-building code into smaller, clearly-named pieces, and moving a few game-specific instruction snippets out of the code and into the existing per-game settings data (alongside the other things that already differ between the two supported games). This is purely an internal reorganization: a dedicated safety check now confirms the AI receives the exact same instructions, word for word, as it did before, for both supported games and every combination of playstyle and campaign settings. No visible change to the app or to how the AI behaves.
- Slimmed the bundled full-repo AI context snapshot. It no longer includes the PowerShell test runner, which is a full coverage mirror of the Node test runner that stays in the snapshot — this roughly halves the snapshot's test-runner bulk with no loss of code or coverage context. The two test runners themselves are unchanged and still run in full: the PowerShell runner stays hand-authored as an independent second check rather than being auto-generated from the Node one. Internal tooling only; nothing about the app or its behaviour changes.
- Made the pre-push/CI test gate a little faster by removing wasted work. The gate used to run both the Node and PowerShell test suites, then immediately run both of them a second time just to read back the final "all tests passed" count for the cross-check that the two agree. It now reads that count from the first run, so each suite runs once instead of twice. The safety guarantee is identical — both suites still run in full and must still agree on the exact same total — the gate just stops paying for it twice. Internal tooling only.
- Sped up the gate's four browser-based checks (startup smoke test, mobile-layout render check, accessibility scan, and the in-browser data-import audit). They each used to cold-start their own headless browser — four browser launches per gate. The gate now starts one browser and has all four checks share it, so it launches once instead of four times. Exactly the same checks with the same pass/fail conditions run; there are just fewer browser processes to spin up. If the shared browser can't start for any reason, each check quietly falls back to launching its own, so the gate is never left worse off. Internal tooling only.
- Added an optional fast pre-check for developers to use while iterating (`npm run gate:iter`). It lints just the files you changed, checks formatting, and runs the Node test suite — skipping the slower PowerShell mirror and all the browser checks — for quick feedback between edits. It is strictly a convenience: it is never run automatically and cannot stand in for the real checks. Committing still runs the full fast gate and pushing still runs the complete gate with both test suites and every browser check, exactly as before. Internal tooling only.
- Stopped the automated test run from doing the same work twice at release time. When code is merged from the staging branch to the live branch, the full check suite had already run on the staging commit; the release pull request was then re-running the entire suite on that identical commit. The release pull request no longer re-runs it, while every normal push to either branch is still fully checked exactly as before. Internal tooling only.
- Tidied up the Node test runner. Many of its checks were long, near-identical lines that each looked for one text pattern in a source file; dozens of these repeated the same boilerplate over and over. Runs of these look-alike checks are now written as compact data tables driven by one small shared helper, so each check is a single short row instead of a spelled-out line. Every check runs exactly as before — the runner produces byte-for-byte identical output, the same 1557 tests with the same names, order, and results — this only shrinks and simplifies the runner's own source. The PowerShell runner is deliberately left untouched as the independent second check. Internal tooling only.
- Wired up the terminal's bot-protection layer (Firebase App Check with reCAPTCHA v3) with its real public site key so the protection can activate. This uses only a public site identifier that is meant to ship inside the app — no secret is involved — and, as before, the app stays fully usable even if the protection layer is unreachable. No visible change to the app.
- Made the bot-protection layer testable on the developer's own machine and the private staging site by enabling a development-only debug token there — this lets the protection be exercised without a live challenge during testing. It is strictly limited to the local and staging addresses and is never switched on for the public production site. Also corrected some stale developer notes in the same area that no longer described how the protection actually starts up. No visible change to the app.
- Corrected the bot-protection layer's public site key so it now activates with the intended key. The correct key had been mistakenly placed in an internal on/off check while the layer was still running with an old, wrong key; the two were swapped back into their proper places. As before, this involves only a public site identifier and the app stays fully usable if the protection layer is ever unreachable. No visible change to the app.
- Narrowed the bot-protection layer's development-only debug token to the developer's own machine (localhost). The private staging site now uses the same real reCAPTCHA verification as the live production site, so it exercises the protection exactly the way real users will rather than relying on a per-browser test token. The public production site was never affected. No visible change to the app.
- Tidied up the developer documentation and one housekeeping setting. Removed an old one-off design-review note that nothing referenced and that had gone stale, corrected the developer and architecture guides where they still pointed at source files that have since been split into smaller per-area and per-game files, and fixed a repository setting that mislabelled two always-kept developer guides as excluded when they must stay in the project (the automated checks read them). Documentation and internal tooling only — no visible change to the app.
- Restructured how the app's startup routine is organized internally, breaking one large block of startup code into smaller, clearly-named steps that each handle one part of booting up (restoring your saved campaign, restoring your device settings, wiring up keyboard shortcuts, and so on) — still run in the exact same order as before. This is purely an internal reorganization to make the startup code easier to maintain safely going forward; a full mobile and desktop check confirmed the app still starts up cleanly with no black screen, no errors, and no visible change to how anything looks or behaves.
- Added a much deeper automatic check for the code that applies the AI's updates to your character sheet: it now actually runs that code against dozens of unusual and deliberately broken inputs — garbage text, extremely long values, more items than normal, and a few security-style edge cases — to confirm it always handles them safely without ever corrupting your saved data. This is also what caught the data-safety gap noted above. Also tightened the release checklist so it compares every individual group of checks between the two test runners, not just the overall total, catching a kind of drift a matching grand total alone could hide. Internal tooling only.
- Reorganized how the app stores your device settings — sound mute switches, screen color, screen-stays-on toggle, typing speed, and similar preferences — so they all now go through one consistent internal pathway instead of being read and written from dozens of separate places. Also added a dedicated check confirming these device settings can never mix with your campaign save data. This is purely an internal cleanup: every existing preference keeps its current value, and nothing about how the app looks or behaves has changed.
- Reworked how the terminal reacts to key moments in your campaign — leveling up, a faction's standing crossing a threshold, your health dropping into the critical zone — so these are now announced through one small internal messaging system that other parts of the app can listen to, instead of each moment triggering its sound, vibration, or log entry directly inline. This is what made the Fallout 3 faction-alert fix and the expanded campaign log above possible without duplicating logic; the existing reactions to these moments (the level-up jingle, the critical-health flash and buzz, the faction alert chime) are unchanged. Internal reorganization only.
- Documented exactly where the two supported games' reference data differs — separating gaps that are simply how each game's card is built (like the trait system, which only one of the two games has) from genuine content gaps still worth filling in later, and noting which recorded-but-currently-unused data columns are reserved for a future feature versus safe to retire. Also confirmed the skills panel degrades safely for any future game with no skill system at all. Documentation only — no visible change to the app.
- Consolidated the confirmation and pop-up windows used throughout the app onto one shared internal system, replacing the browser's native popup boxes with the in-terminal ones described above. Every confirmation still gates the same actions the same way — nothing you can do or undo has changed, only how it's presented.
- Began the groundwork for moving the terminal's saved data off the browser's small, fixed-size storage onto a larger, more durable storage system (IndexedDB). This first step adds the new storage engine and quietly keeps a durable backup copy of your device settings in it, while those settings continue to be read and written exactly as before — nothing you see or do changes, and if the new storage is ever unavailable the app runs identically to today. The new storage keeps your device settings and your campaign saves in two separate compartments from the start, and later steps will move your campaign saves and backups across and begin reading from it. Internal foundation only.
- Made your device settings self-healing. On startup the terminal now cross-checks its durable backup copy against the browser's main storage: if a preference (a sound toggle, screen colour, typing speed, and the like) went missing from the browser's storage — for example because the browser cleared or evicted it — but still survives in the durable backup, it is quietly restored, so your settings ride out a storage hiccup that would previously have reset them. The browser's storage stays the authority: a setting that is still present is never overwritten, and a backup copy is only trusted if its integrity check passes. This check is strictly bounded so it can never slow down or hang startup — if the durable storage is unavailable or slow, the terminal boots exactly as it does today. Your campaign saves are untouched by this step. Internal only — no visible change unless a lost setting is being restored.
- Rebuilt the campaign's event history into a single structured record. Auto-logged events (level-ups, faction shifts, quest changes, collectibles, crafting, trading, resting) are now stored as proper structured entries in one canonical history rather than as tagged text lines mixed into your notes — which is what let the CROSSROADS RECORD and the new INCIDENT LOG become simple filtered views of the same underlying record. Existing saves are converted on load, non-destructively: tagged auto-log lines are moved into the new history while your own written notes are left in the notebook exactly as they were (the conversion re-runs harmlessly and never duplicates or loses anything). The history rides your campaign save, so it exports, backs up, and syncs to the cloud with everything else. Internal restructuring plus the visible notebook/history split described above.
- Moved your saved games and automatic backups onto the larger, more durable storage, lifting the old size ceiling that could make a big save fail. Save slots and the rolling auto-backups now save to the roomier storage first, with a copy kept in the browser's normal storage as before — so a save that is simply too large for the browser's small storage now succeeds instead of failing, and a backup the browser had to drop for space is still kept in the durable store and can still be restored. Loading a save reads the newest copy across both stores, so you always get the latest version. Your existing saves and backups are copied over automatically and safely in the background — nothing is moved or deleted, only copied, and re-running never duplicates anything. If the durable storage is ever unavailable, everything falls back to the browser's normal storage exactly as before, so saving and loading are never worse than today. No change to how you save, load, or restore — it just stops running out of room.
- Laid the foundation for a single "living machine" engine that will eventually drive all of the terminal's ambient atmosphere from one place. This first step adds an internal runtime that tracks what the terminal is doing — starting up, active, idle, on standby, shutting down — and lets ambient effects subscribe to it, with the IMMERSION setting enforced in this one spot so every future ambient effect automatically honours the level you chose. It runs alongside the terminal's existing standby and background timers without changing any of them, so nothing you see or hear is different yet, and it is built to fail safe: if it can't start, the terminal behaves exactly as it does today. It also never touches your campaign save, stats, or history — it is purely in-memory device behaviour. Internal foundation only.
- Moved the terminal's tab-standby behaviour (the screen dimming and audio hush when you switch away from the tab, and the wake tone and re-sync when you come back) onto the new living-machine engine so it is now driven from that one place instead of its own separate wiring. It looks and sounds exactly the same as before at every immersion level — standby response is treated as essential feedback, so it never goes quiet. Internal reorganization only; no visible change.
- Moved three of the terminal's background timers — the on-screen uptime clock, the periodic "memory cycle" flash, and the behind-the-scenes power-on-hours bookkeeping — onto the same living-machine engine, so they are all scheduled from one place instead of running their own separate loops. They behave exactly as before: the uptime clock and power-on log are baseline readouts that always run, and the memory-cycle flash is ambient flavour that shows at Full and Balanced immersion and stays quiet at Minimal (unchanged from before). They pause and resume around tab-standby with the same timing as they always did. Internal reorganization only; no visible change.
- Began building the developer/debug console that a future hacking minigame is planned to let you unlock in the live game — for now it only ever appears on the private staging build used for testing, never on the live site. It shows what the terminal's new "living machine" engine is doing in real time and lets a developer manually step it through its states while testing new atmospheric features as they're built. It is purely a testing aid today: it never touches your campaign, save, or stats, and a player on the real site will never see any trace of it until that future unlock exists.
- Fixed the developer/debug console's manual state-forcing buttons — previously only one of the seven actually did anything, since they tried to move the engine through the same real-world-only transitions it uses during normal play. Every button can now force the engine directly into any state for testing, with no change to how the engine behaves for real users.
- Fixed a rough edge in the "living machine" engine's tab-standby handling, found while testing the new power-down behaviour above: the "welcome back" tone and chat message are meant to play only when you're genuinely returning to the terminal, never when it's powering down — but a shutdown landing right at the start of that return, or partway through the brief moment it takes to fully re-sync, could still let one or both slip through. Both cases are now guarded against directly. That sequence isn't reachable in normal play yet, but it's fixed for when it is. Internal only.
- Laid the first foundation stone for an upcoming visual overhaul: each supported game now carries a much richer internal "identity" profile (its device look, personality, boot style, and more) in one place, ready for future updates to build its new appearance from. New Vegas's profile is filled in with real design detail; Fallout 3's is a placeholder for now. A future third game (Fallout 4) also got a starter profile added purely to prove the system scales — it isn't selectable and changes nothing about the app today. This step changes nothing you can see or do; it's groundwork only, fully covered by new automated checks.
- Replaced three of the developer console's manual test buttons that had no visible effect with two more useful ones — one that replays the boot sequence, and one that resets the engine straight back to normal operation. Developer/staging tooling only — never visible on the live site.
- Added a REPLAY HATCH button to the developer console so the Module Bay's one-time hatch-opening ceremony can be re-triggered for testing without reloading the page. Developer/staging tooling only — never visible on the live site.
- The Director Uplink presence described above is built as a visual layer over the existing conversation system rather than a separate one, so nothing about how messages are actually sent or received has changed. Each supported game's identity profile (added in an earlier update) now also carries its own Director Uplink flavor — panel title, relay name, and status wording — with a generic fallback for a game that hasn't had its own written yet. It stores nothing new to your save; the waveform's state lives only in memory.
- Your quick-draw gear shortcuts are now stored as real, player-controlled data on your device instead of living nowhere durable — previously the AI had to remember what you'd bound to each slot itself, with no actual record kept. The AI can no longer see or change a binding; only you can, through the new Tool Deck panel.
- Tidied up the project's repo layout by moving the app icon and the four shortcut icons into their own folder. Everything that points at them was updated to match, so the installed app icon and its shortcuts look and work exactly as before. Internal housekeeping only — no visible change.

---

## [v2.7.0] — Native Systems & Two Wastelands<!-- Date: 2026-06-30 | Tests: 1557/1557 | Cache: robco-terminal-v2.7.0-r5 -->

### Hotfix

- Tuned the HIGH-LUMEN OPTICS high-contrast mode so its CRT scanline/refresh overlay is slightly more present (a touch more retro CRT feel) while text stays just as crisp and legible. Normal display mode is unchanged.
- Increased the HIGH-LUMEN OPTICS scanline/refresh overlay further, giving the high-contrast mode a noticeably stronger retro CRT texture while text stays crisp and legible. Normal display mode is unchanged.

- Fixed the [TRADE] button appearing to do nothing. Tapping [TRADE] now reliably opens the BARTER UPLINK trading panel and brings it roughly to the centre of the screen — previously the panel opened correctly but was left off-screen below the other inventory panels, so it looked like the button did nothing. (A first pass scrolled it to the very top edge; it now centres in the viewport with the panel header comfortably in view.)
- Fixed the TERMLINK console popping up your phone's on-screen keyboard. Opening the console (or running any built-in command) no longer steals focus to the typing field on touch devices, so the keyboard stays down until you actually tap the field. On a desktop the cursor still returns to the command line so you can keep typing.
- Added quick panel navigation from the Comm-Link. Type a panel's name or a common nickname — "inventory" (or "inv"/"items"), "stats", "skills", "perks", "quests" (or "journal"), "factions" (or "rep"), "map" (or "world"), "crafting" (or "workbench"), "barter" (or "trade"), "status", "health" (or "limbs"), "log" (or "overseer"), "settings", or "databank" (or "consult"/"lookup") — and that panel opens instantly, offline, with no AI. Anything that doesn't match a panel still goes to the Director Link as before, so a full "consult deathclaw" lookup keeps working.
- Documentation correction (README only, no app change): clarified how the game database reaches the AI. The active game's full data tables are sent to the AI as a dedicated, separate part of the system instruction on every message (not folded into the directive text), and the same data also powers the offline native tools through local lookups.

### Added

- Keyboard focus rings now appear on every interactive element — buttons, inputs, tabs, toggle switches, and expandable panels all show a green glow outline when you navigate with the keyboard. Mouse users see no change; focus rings only appear on keyboard or programmatic focus (`:focus-visible`).
- All CRT flicker and scanline animations are now paused for users who have "reduce motion" enabled in their operating system — both the 6.7 Hz flicker and the faster 10 Hz variant exceed the WCAG seizure-risk threshold of 3 Hz, so they now freeze to a static scanline image when the motion preference is set.
- Added a "?" help button to the save menu that opens a plain-language field manual for every save tool — Export Save, Import Save, Restore Backup, the A/B/C save slots, saving to and loading from the cloud, and how auto-save works. Tap it any time you're unsure what a save control does. The help opens in the standard pop-up, so it traps keyboard focus, closes on Escape, and returns focus to the button when dismissed.
- Added a BARTER UPLINK trading terminal (INV tab, also reachable from the [TRADE] button) — a fully offline barter screen that no longer needs the AI. Pick a vendor, search their stock to buy, or sell from your own pack. Prices are real Fallout barter math driven by your Barter skill: the higher your Barter, the less you pay and the more you're paid (buy prices run from 1.55× an item's value down to 1.10× as Barter climbs 0→100; sell prices rise from 0.45× to 0.90×), and a vendor only pays up to the caps in its purse. Buying and selling update your caps and inventory instantly behind a confirm prompt, and never auto-sync to the cloud. Works entirely offline with no AI call.
- Added a CONSULT databank lookup — type `> CONSULT <topic>` (or `> [CONSULT] <topic>`) in the Comm-Link to look up any item, perk, quest, location, companion, or creature from the game's own data, instantly and offline. It shows matching records grouped by kind, plus key stats when the topic is a concrete item, weapon, or creature (weight/value, damage, or HP/DT and weakness). If nothing matches it plainly says "NO ENTRY IN DATABANK" rather than making something up. No AI is involved.
- Added a BIO-SCAN medical advisory — a "RUN BIO-SCAN ADVISORY" button in the Bio-Scan & Limb Status panel (also `> [BIO-SCAN]` in the Comm-Link) reads out your current condition and what to do about it: a health readout (STABLE / WOUNDED / CRITICAL), radiation level, an OK/CRIPPLED state for all five limbs, and plain advisories — crippled limbs and low health recommend the right healing item, high radiation recommends a rad-removing item, and any active addiction is flagged with its risk. The recommended items are read from the game's own chem data (so it names the correct items in any campaign), and the whole readout is computed offline with no AI.
- Added a LOOT salvage terminal — the `[LOOT]` button in the Comm-Link (also `> [LOOT]`) opens a quick "add loot to inventory" picker: search the game's item database, set a quantity, and add any item straight to your pack at its database value. Adds are additive (adding an item you already carry just bumps the count) and ask for confirmation first, and everything — the values, the math — is computed offline with no AI. Works the same in either game.
- Added a CONSULT button to the Comm-Link macro row (next to THREAT, VATS, TRADE, and LOOT) so the databank lookup is now one tap away. Type a topic in the target field, tap CONSULT, and it opens the offline databank instantly — the same lookup as the typed `> CONSULT` command, with no AI involved.
- Added a persistent DATABANK panel on the DATA tab with its own always-there search box. Type a topic and the grouped results (items, perks, quests, locations, companions, creatures, plus key stats) appear right there in the panel — keep it open and keep searching without reopening anything. It's the same offline databank as the CONSULT button and command, just inline for quick reference. No AI involved.
- Added a SUSTAINED POWER CELL option (POWER MANAGEMENT, under Security & Configuration) that keeps your screen from dimming or sleeping while the terminal is open — handy for reading on a phone without tapping every few seconds. It's off by default to save battery; flip it on and the display stays lit, and the terminal re-asserts it automatically if you switch away and come back. On devices or browsers that don't support keeping the screen awake, the toggle politely disables itself and says so. Works offline with no AI.
- Added a HAPTIC SOLENOID option (POWER MANAGEMENT, right below the power cell) that gives your phone a brief buzz on key moments — a short pulse on level-up, a sharp double-buzz when a faction's view of you flips to Vilified or Idolized, and a warning buzz the moment your health drops into the critical zone. It's off by default; flip it on and you'll feel a quick confirmation tap. On phones that support vibration it just works; on desktops and devices without a vibration motor the toggle disables itself and says so. It also stays silent if you've turned on your system's "reduce motion" setting, so it never fights your accessibility preferences. Works offline with no AI.
- Added an EJECT HOLOTAPE button (next to "Download Campaign Log", under Security & Configuration) that hands your comm-link transcript straight to your device's share sheet — so on a phone you can fire it off to Messages, email, Notes, or any app in one tap. If your device can't bring up a share sheet, it quietly copies the transcript to your clipboard instead, and if even that's unavailable it falls back to saving the transcript as a text file. Cancelling the share sheet just closes it, nothing else happens. Works offline with no AI.
- The installed terminal app icon now shows a small count badge of your unresolved directives — your active quests — while the app is in the background, and clears it the moment you open the terminal (you've seen them). It's an ambient nudge with no pop-ups or notifications. On phones and desktops that support app-icon badges it appears automatically once the app is installed to your home screen; everywhere else it simply does nothing. Works offline with no AI.
- Added an OVERSEER'S LOG panel on the DATA tab — a maintenance read-out of how long you've spent in the terminal: your current session uptime (ticking live), your longest single session, total power-on time across every visit, and how many times you've booted the terminal. It's quiet flavour that builds over time, stored only on your own device — nothing is ever uploaded or synced. Works entirely offline with no AI.
- Added a HIGH-LUMEN OPTICS toggle (next to the OPTICS colour picker, under Security & Configuration) — a high-contrast display mode for easier reading in bright rooms or for low vision. Flip it on and the terminal drops to a pure-black background, drops the soft phosphor glow for sharper text, lifts every dimmed label to full strength, and quietens the scanline overlay — all while keeping whatever optics colour you've chosen. It also turns on automatically if your operating system already asks for higher contrast, so it respects that preference out of the box. Your choice is remembered on this device and applies the instant the terminal opens. Works in either game, entirely offline with no AI.
- Added a PIP-BOY RADIO toggle (in the Audio Systems panel, under Security & Configuration) that plays an ambient retrofuturist station — a soft bed of static, a warm drifting carrier tone, and a slow trickle of gentle synthesized beeps. The whole station is generated live in your browser, so it adds zero download size and contains no copyrighted music. It's off by default; flip it on and the station fades in. It respects Master Mute (and resumes when you un-mute if it was playing), and it only ever starts on a tap or keypress so it never autoplays. Works in either game, entirely offline with no AI.
- The boot-up sequence now has a bit more character. The very first time you ever power on the terminal it runs a longer "cold start" self-test — a RETROS BIOS banner and a counting memory check — while every normal launch after that stays quick and terse. And once in a while, on any launch, the terminal boots in a rare "degraded tube" mode: the screen flickers like a cold CRT warming up and the self-test stutters before it locks in. It's deliberately uncommon, and the flicker automatically holds still if you've asked your device to reduce motion. Purely cosmetic — every boot still lands you in the same terminal. Works in either game, offline with no AI.
- Added a TERMLINK command console — a single launcher for every offline subsystem. Tap the "TERMLINK CONSOLE" button in the Comm-Link (or type `> [TERMLINK]`, or the short `> [TL]`) and a ROBCO TERMLINK menu opens listing all six built-in tools — V.A.T.S. targeting, threat assessment, the barter uplink, databank consult, bio-scan, and salvage intake — each with a one-line description. Pick one and it opens that tool straight away. It's a shortcut surface over the features you already have: every option runs the same built-in routine with no AI call, so the whole console works offline. Works the same in either game.
- Each game now has its own terminal colour. A Fallout: New Vegas campaign boots in the classic bright RobCo green, while a Fallout 3 campaign boots in a distinct, duller "Pip-Boy" green — so the two games feel different at a glance. Switching games applies that game's colour automatically. You can still override it any time from the OPTICS picker (which now also offers the new Pip-Boy green as a choice for either game), and any colour you pick by hand sticks across both games. All the existing colour options work exactly as before; only the per-game default is new. Works entirely offline with no AI.
- You can now mark a place as visited straight from the WORLD GRID map. Open a region on the map and any location you haven't been to yet shows a "LOG VISIT" button next to it; tap it and that location flips from [UNKNOWN] to [VISITED] and stays that way. Previously a place only counted as discovered once you actually travelled there (or the story moved you), so there was no way to record somewhere you'd been on your own — now there is. It's a one-way mark (in keeping with the map's "once discovered, always discovered" behaviour), it's saved on your device, and it never contacts the AI.
- Each game now carries its own identity in the boot screen and the save manager. When the terminal powers on it shows a line naming your Pip-Boy and region — "PIP-BOY 3000 — MOJAVE WASTELAND UPLINK" for New Vegas, "PIP-BOY 3000 — CAPITAL WASTELAND UPLINK" for Fallout 3 — and the SAVE menu's archive list is now headed with a matching banner ("LUCKY 38 TELEMETRY — MOJAVE ARCHIVE" vs "VAULT-TEC ARCHIVE — CAPITAL WASTELAND"). It's flavour only — no change to how booting or saving works — and the cold-start and rare "degraded tube" boot sequences are untouched. The identity text is drawn from each game's profile, so it costs nothing and works entirely offline.

### Fixed

- Restored corrupted em-dashes, en-dashes, and multiplication signs throughout the changelog history — entries going back to v1.3.0 had double-encoded symbols from a prior PowerShell write. No user-facing behavior was affected, but the in-app changelog viewer was showing garbled characters.
- Extended the UTF-8 corruption guard to also cover doc files (CHANGELOG.md, README.md, ARCHITECTURE.md) — the guard previously only checked source files, so corrupted symbols in docs would slip past the build gate undetected. This is now closed: any future mojibake in these files fails the build immediately.
- Fixed config labels (GAME:, PLAYSTYLE:, PLAYTHROUGH TYPE:) wrapping to a second line on narrow screens — they now stay inline at all viewport widths.
- Fixed map cell names being cut off mid-word with a trailing underscore artifact — names now wrap to a second line, or truncate cleanly with an ellipsis, and the full name is always accessible in the tooltip.
- Fixed the map region [?] collectible badge rendering as a vertical stack of characters when space was tight — the badge now stays on one line in both grid and zoomed map views.
- Fixed inventory type tags ([WEAPON], [ARMOR], etc.) stacking vertically when the row was narrow — they are now pinned to their natural inline width and never wrap.
- Fixed the USE button in the inventory row taking too much width and squeezing the item name to a few characters per line — USE is now compact and the item name fills the remaining row space. The USE button also has a proper 44px tap target height on mobile.
- Fixed registry autocomplete not working in Fallout 3 campaigns — quest, item, and perk name inputs now search the active game's registry correctly. Previously, the autocomplete helper only loaded with Fallout: New Vegas and was absent in FO3 sessions, leaving all three inputs completely silent.
- Fixed the [THREAT], [VATS], [TRADE], and [LOOT] macro buttons word-wrapping mid-label on narrow screens — they now stay as a single line at all viewport widths.
- Screen readers now hear each new chat message as it arrives — the chat history panel is a live region (`aria-live`) so assistive technology announces AI and player messages immediately without the user having to navigate to the chat area.
- The system modal (changelog, help, [LOGS], command reference) now has proper dialog semantics for assistive technology — it announces itself as a dialog, traps Tab focus inside while open, closes on Esc, and returns focus to the element that opened it when dismissed.
- Inventory USE and delete buttons now have descriptive labels for screen readers (e.g. "Use item: Combat Shotgun" and "Remove Combat Shotgun from inventory") instead of bare "USE" and "X" text.
- Faction reputation buttons now have descriptive labels (e.g. "Fame +5 for NCR") instead of the single-character "F+" / "F-" / "I+" / "I-" labels that were invisible to screen readers.
- Limb condition buttons now announce their current state to screen readers — each button says "Head: OK" or "Right Arm: Crippled" and reports its toggle state, so users navigating by keyboard or AT always know which limbs are injured without looking at the visual bar.
- Inactive tab buttons now have higher contrast — opacity raised from 55% to 75%, which brings all six optics colour themes above the WCAG AA 3:1 contrast ratio for interface controls.
- Loading a saved game now actually loads it. Importing a save file, restoring a backup, or loading a cloud save would appear to do nothing — the terminal kept showing your current data instead of the loaded save. The newly-loaded data was being written correctly, but a routine "save on exit" step was firing during the reload and silently overwriting it with your old data first. All three load paths — IMPORT SAVE, RESTORE BACKUP, and cloud load — now load correctly, including older and reconstructed saves.
- Fixed the in-app System Changelog showing "CHANGELOG NOT FOUND" on the private test build. The changelog page was the only screen that loaded its content over the network each time it opened, with no local copy to fall back on — so any hiccup fetching it left the page blank with that error. The changelog is now stored alongside the rest of the app so it opens instantly and reliably, even offline, on both the test build and the public site.
- Fixed the private test build failing to update its offline engine with an "ASYNC FAULT — failed to update a ServiceWorker… the script resource is behind a redirect" error. The test host was quietly redirecting the request for the app's background updater instead of serving it directly, and browsers refuse to install an updater that arrives via a redirect — so the test PWA could get stuck on an old version. The test build now tells the host to serve that file (and the app manifest) straight through with no redirect, so updates install cleanly. The public site was never affected.
- Fixed the deep startup hum playing at the wrong moment. The power-on drone is meant to rumble as the boot screen runs, but browsers won't let any sound play until you first tap or press a key — so if you didn't touch anything during boot, the hum was sitting in wait and would fire awkwardly later, the first time you tapped a menu mid-session. Now the drone only plays if boot is still in progress when you first interact; if boot already finished, it's quietly dropped instead of surfacing detached. The hum is part of the startup or doesn't play at all.
- Fixed the "COMPLETE RNG" label in the campaign settings collapsing into a vertical stack of single letters on desktop once its warning notice appeared beside it. The label and its warning now stack — label on its own full-width row directly above the warning — at every screen size, matching how it already looked on phones.
- Corrected two Fallout 3 quest-log entries that weren't real quests. "Fires of Anchorage" (which doesn't exist in the game) and a duplicate "Strictly Business (Paradise Falls)" (the real quest is just "Strictly Business") have been removed, so the FO3 quest autocomplete no longer suggests fake quests. Also fixed the world map labelling two different regions both as "Vault 92" — the southeastern one is now correctly named "Bethesda Ruins". All corrections verified against the Fallout wiki.
- Corrected two item-database errors so the AI gets accurate stats. The "NCR Ranger Armor" — a New Vegas item that had leaked into the Fallout 3 database (the NCR doesn't exist in Fallout 3) — has been removed from FO3. And the Mysterious Stranger Outfit, which was mistakenly recorded as more protective than power armor, now shows its correct value (it offers almost no damage protection). Both verified against the Fallout wiki.
- Fixed Big Guns being invisible to the V.A.T.S. calculator in Fallout 3 campaigns. The calculator only ever recognised the New Vegas weapon skills, so a Fallout 3 character built around Big Guns (miniguns, the Fat Man, flamers) was never considered when picking the relevant combat skill. Fallout 3's full weapon-skill set — including Big Guns — is now used.
- Removed a fabricated Fallout 3 weapon ("O'cta Brain") that isn't a real in-game item, so it no longer appears in autocomplete or feeds bogus stats to the AI. Also corrected the 1st Recon Assault and Survival armours (Boone's armour) to their real damage threshold of 15 (they were recorded as 22). Both verified against the Fallout wiki.
- Completed the Fallout 3 Operation: Anchorage quest list by adding the two real quests that were missing — "The Guns of Anchorage" and "Paving the Way" — so the add-on now lists all four of its quests. And corrected a made-up map location ("Vault 92 South") to the real "Bethesda Offices East", where the Lockpick bobblehead is actually found. All verified against the Fallout wiki.
- Fixed the BARTER UPLINK trading screen not updating when you switch vendors. Choosing a different vendor from the dropdown now correctly refreshes that vendor's purse (the caps it can pay you) and the buy and sell lists, instead of leaving the previous vendor's details on screen. The dropdown was being rebuilt at the exact moment you changed it, which on some devices left the old vendor showing — the screen now updates in place.
- Fixed the V.A.T.S. button still calling the AI instead of the built-in calculator. Invoking V.A.T.S. — from the [VATS] button or by typing the command — now always opens the offline V.A.T.S. calculator (hit chance, crit bonus, and the melee/unarmed AP-strike optimiser) and never contacts the AI, matching how THREAT, TRADE, CONSULT, BIO-SCAN, and LOOT already work. The AI is no longer told it can produce a V.A.T.S. result, so it can't intercept the command anymore.
- Fixed the "REBOOT TERMINAL" update prompt sometimes not appearing after a new version was deployed. When the terminal checked for an update as the page loaded, a freshly-downloaded version could finish installing in a brief window that the prompt logic wasn't watching — so the update sat ready in the background with no prompt, surfacing only on a later reload (or, if you cleared site data in between, not at all). The terminal now watches for a pending update in every state it can be in when the page opens, so each newly-deployed version reliably shows the REBOOT TERMINAL prompt. Brand-new first-time installs correctly stay silent, since there is no older version to update from.
- Fixed the world map forgetting where you've been. When you moved from one location to another, the place you left flipped back to "UNKNOWN" instead of staying discovered — only the AI could mark somewhere visited, so changing your location by hand never recorded it. Now, true to Fallout fog-of-war, anywhere you've been stays "VISITED" permanently: your current location shows "CURRENT", every place you've visited shows "VISITED", and only spots you've genuinely never been read "UNKNOWN". Discovery survives a reload, and the map can no longer quietly forget older locations.
- Fixed the "REBOOT TERMINAL" update prompt never appearing in the installed app. Two things were stopping it. First, when you open the terminal as an installed app, the device usually resumes it from the background rather than fully reloading the page — and the old code only ever checked for a new version during a full page load, so a freshly-deployed update sat in the background, unseen, with no prompt. Second, the prompt was only allowed to show when a fragile low-level "is a worker controlling this page right now" check passed — and in the installed app that check can come back empty even when an update is genuinely waiting, silently blocking the prompt. Now the terminal re-checks for a waiting update every time you return to it or it regains focus (throttled so it never hammers the network), and it decides whether to prompt using a durable "this terminal has updated before" record instead of that fragile live check. After a new version deploys, the REBOOT TERMINAL prompt now reliably appears the next time you open or focus the installed app — first-time installs still stay silent, since there's nothing to update from yet.
- Fixed the terminal occasionally loading in the full desktop layout on a phone — most often on the very first launch right after an update — and only snapping to the correct mobile layout after a manual reload. The desktop layout (the fixed two-column, non-scrolling screen) is now locked to actual desktops that have a mouse: a touch phone or tablet always gets the mobile layout, even in the rare moment after an update when the browser briefly mis-measures the screen as desktop-width before settling. No reload is needed anymore, and nothing changes on a real desktop.

### Changed

- The in-app changelog viewer has been completely redesigned from a single cluttered wall of text into a clean, readable "FIRMWARE REVISION LOG". You now see one version at a time with a dropdown to jump to any past release; each version's notes are grouped into collapsible sections (Added, Fixed, Changed, Removed) with the newest section open and the rest tucked away; entries are tagged and bulleted in the terminal's voice; and on a wide screen the text is held to a comfortable centred reading column instead of stretching edge to edge, while phones get full width with comfortable spacing. The private test build still shows in-progress "Unreleased" notes; the public site still shows only released versions.
- The V.A.T.S. CALCULATOR is now a fully offline, deterministic tool — it no longer defers to the AI ("actual outcome determined by AI" is gone). It reads your equipped weapon, SPECIAL, skills, and active chem buffs and shows: an estimated hit chance per body part, your V.A.T.S. critical-hit bonus (+5% in New Vegas, +15% in Fallout 3), and — for melee and unarmed weapons — an exact AP-strike optimiser showing how many strikes your Action Point pool affords, damage per strike after the target's damage threshold, damage-per-AP, and the best body part to target. A new TARGET DT field lets you enter the enemy's armour to see effective damage. Hit chance for ranged weapons stays a clearly-labelled estimate (the exact per-weapon spread isn't published game data), while the melee/AP and damage maths are exact. Works entirely offline with no AI call.
- The THREAT ASSESSMENT is now a fully offline, deterministic tool — it no longer asks the AI to size up an enemy. Type a target (e.g. "> [THREAT] Deathclaw") and the terminal looks the creature up in its bestiary and shows a stat card — health, damage threshold, attack damage and rate, attack type, resistances — and highlights the creature's weakness. Against your equipped weapon it then estimates TIME TO NEUTRALIZE (roughly how many seconds to bring it down) and AMMO BURN (how many rounds it will take — or strikes, for a melee weapon). If the creature isn't in the bestiary it says so plainly rather than inventing stats. Works entirely offline with no AI call.
- Gave the whole interface one consistent in-world terminal voice. Input prompts and "nothing here" messages are now uppercase and terse (for example "RETRIEVING ARCHIVES…", "NO ACTIVE DIRECTIVES", "ARCHIVE EMPTY"); the account panel speaks in "UPLINK" terms rather than "sign in / signed in"; the update notice reads "FIRMWARE UPDATE STAGED — REBOOT REQUIRED TO APPLY"; the optic-scan control reads "VISUAL UPLOAD"; and the assistant's own error messages no longer call themselves "the AI" or name the underlying service — they now speak as the in-world DIRECTOR LINK (for example a rejected key reads "DIRECTOR ACCESS KEY REJECTED"). The install prompt and app shortcuts also drop the real game name so they read as a generic wasteland terminal. Only the wording changed — the sign-in mechanism itself, your key-entry field, and every screen-reader label are exactly as before.
- Polished the changelog viewer so it no longer jumps around. The window now stays a fixed, comfortable width whether the sections are open or closed — opening and closing a section only changes the height, never the width, so it no longer shrinks to a narrow box when everything is collapsed (on phones it stays full-width). It opens with the newest section expanded and the rest tucked away, and a new "EXPAND ALL / COLLAPSE ALL" button at the top lets you open or close every section at once.
- All six macro commands — VATS, THREAT, TRADE, CONSULT, BIO-SCAN, and LOOT — now run entirely as offline, deterministic native tools with no AI call. Every one of them reads the game's own data and computes its result on-device, instantly: the V.A.T.S. hit/crit/AP maths, the THREAT bestiary stat card and time-to-neutralize, the TRADE barter terminal, the CONSULT databank lookup, the BIO-SCAN medical advisory, and the LOOT salvage picker all work with no network and no AI. None of these six ever contacts the AI anymore — they are fully usable offline and give the same answer every time. (Each tool is detailed in its own note in the Added and Changed sections above.)
- The changelog viewer now keeps a completely constant size as you open and close its sections. The earlier fix already locked the width; now the height is locked too (capped to fit your screen), so expanding or collapsing categories no longer makes the window grow tall or shrink short — the box stays exactly the same size, the notes scroll inside it, and the CLOSE button stays pinned at the bottom. It feels rock-steady whether one section or every section is open, on desktop and phones alike.
- Brought the in-terminal command reference (the COMM-LINK COMMAND REGISTRY, opened with the "?" / `[FEATURES]`) back in line with what the terminal actually does. The six offline tools — V.A.T.S., THREAT, TRADE, CONSULT, BIO-SCAN and LOOT — are now grouped together under a clear "NATIVE TERMINALS — OFFLINE, NO AI" heading with accurate descriptions and all their shortcuts, and `[FEATURES]` itself is now listed. A pile of commands that no longer exist were removed so the menu only shows things that actually work — the old screenshot-V.A.T.S., the AI "tactics/stash/excess/currency/audit/timer/squad/travel-cluster/casino/comm-link/archive" macros, the chained `&&` / quiet / stealth flags, and the obsolete pause/page entries. The reference is now kept honest automatically so it can't silently drift out of date again.
- Folded the SESSION STATISTICS panel into the OVERSEER'S LOG panel so all your run-time figures sit in one place. The OVERSEER'S LOG now shows two clearly labelled sections: "UNIT TELEMETRY — THIS DEVICE" (how long this device has been powered on, your longest session, total power-on time, and boot count) and "CAMPAIGN LOG — THIS COURIER" (kills, caps earned, damage dealt, your current campaign play-time, ticks, location visits, and collectibles). The two different "time" figures — how long you've been playing this campaign versus how long the terminal has been switched on — are now labelled distinctly so they're never confused. A RESET CAMPAIGN STATS button (formerly "RESET SESSION") still lets you zero the campaign counters; device telemetry is untouched. The separate SESSION STATISTICS panel is gone — nothing was lost, it all moved.
- Your optic colour is now remembered per game instead of across the whole app. Pick a colour while playing New Vegas and it sticks for New Vegas; Fallout 3 keeps its own separate choice — switching games restores each one's colour, or that game's default if you've never changed it. The OPTICS picker also now marks the current game's default with "(Default)": on New Vegas the option reads "RobCo Green (Default)", and on Fallout 3 the tag moves to "Pip-Boy Green (Default)". Any colour you'd previously chosen carries over to whichever game you're currently in. Works in either game, entirely offline.

### Under the Hood

- The Vault 13 Canteen seed item is now defined in game data rather than hard-coded into the new-campaign logic — so it seeds for New Vegas but not Fallout 3 automatically, without any special-casing.
- Context-switching and faction lookups now use game definitions data instead of hard-coded lists of game names, making it easier to add new games in the future.
- Added Protocol 38 (game-agnostic feature code rule) to the engineering guide.
- Added Suite 89 (12 regression tests) guarding the game-agnostic refactors above.
- Fixed symbol corruption in the AI system directive introduced during that edit: em-dashes, arrows, and special characters were double-encoded due to a PowerShell Latin-1 write. All source files are now verified clean.
- Added Suite 90 (11 regression tests) that permanently guard against UTF-8 double-encoding — the gate now fails if any source file or doc file contains the U+FFFD replacement character or the â€/â– mojibake sequences that indicate a corrupted PowerShell write.
- The terminal no longer rebuilds every panel on every AI response. Each panel now checks whether its underlying data actually changed since the last render and skips the DOM rebuild if nothing is different — roughly 18 of 23 panels skip on a typical response. The world map is also skipped entirely when the DATA tab is not visible (it already re-renders on tab switch). First page load and context switches always do a full render. Added Suite 91 (9 regression tests) guarding the dirty-check infrastructure.
- Added Suite 94 (10 regression tests) permanently guarding the accessibility changes above: `:focus-visible` CSS rule present, `prefers-reduced-motion` block with correct freeze parameters, `aria-live` on the chat display, `role=dialog`/`aria-modal` on the system modal, and the `_openSysModal()` focus-management helper.
- Extended Suite 92 with a test for the macro-button nowrap guard (now 5 tests total).
- Added Suite 95 (7 regression tests) permanently guarding the save-load fix above: the exit-save flush and debounced save are both gated by the new load-in-progress flag, each of the three load paths sets that flag before reloading, the working game-switch path keeps its own guard, and a behavioral test imports a save container and asserts the loaded state reflects the file.
- Refreshed the in-browser test page (`tests/test.html`) so it once again matches how the app actually loads and imports saves — it had drifted badly and would have failed if run. It now executes the real import logic across 10 suites (field import, factions, skills, collections, clamping, registry-validated trackers, save-file sanitising, and the save-load path), and it now runs automatically in the build gate so it can never silently fall out of date again. Added a new project rule (Protocol 40) and a build check (Suite 96) that keep it in sync going forward.
- Added a build check that fails if any single version block in the changelog repeats a category heading (two `### Fixed` under one version, etc.), so the changelog keeps exactly one heading per category.
- Tidied the project folder: the internal planning/research documents were moved into a dedicated `planning/` folder (kept private, never published), an empty leftover tool folder was removed, and a new standing rule (Protocol 41) plus a build check now flag stray junk files so the workspace stays clean going forward. No effect on the app itself.
- Reworked how the terminal picks which game's data to load at startup: a single game→files manifest now drives it, so adding a future Fallout title takes one line plus its two data files instead of editing boot logic. No change to how the app loads or behaves for New Vegas or Fallout 3.
- Hardened the save-on-exit safeguard with two new locked-in checks: one proves a guarded reload keeps freshly-loaded data and an unguarded one would lose it (the "save then reload" footgun), the other ensures the safeguard can't be accidentally reordered out of effect. Added a standing rule (Protocol 42) that any flaw found while testing must be fixed and covered by a test in the same commit rather than worked around. No user-facing change — current save/load already behaves correctly.
- The AI engine list (the model dropdown populated after validating your Google AI Studio key) is now built in a single pass instead of one slow DOM update per model, removing an inefficient pattern that re-parsed the whole list on every entry. No visible change — the same engines appear in the same order. The build gate was also tightened so this inefficient pattern can no longer slip back into any served code.
- Hardened how AI engine names are shown in the model dropdown against malformed or hostile text. The model name — whether typed by you, restored from a synced key, or returned by Google's model list — is now safely escaped before it is displayed, closing a potential cross-site-scripting hole. No visible change for normal model names; the build gate now also fails if any externally-sourced value is ever placed into the page without escaping it first.
- The AI now reads your playstyle and engine settings from memory instead of re-fetching them from browser storage on every single message. These values are cached the first time they're needed and refreshed whenever you change them, so each AI request does a little less work. Behavior is unchanged — the AI still uses your current playstyle, key, and model — and the build gate now guards these frequently-run paths against slipping back to direct storage reads.
- Loading a save or pulling from the cloud now cleans up more of your data on the way in. The collectible, trait, skill-book, skill-magazine, and Lincoln-memorabilia trackers, plus faction reputation values, are now defensively checked and corrected when a save is imported — stray or malformed entries are dropped or normalised so a hand-edited or corrupted file can't carry bad data into your campaign. No change for normal saves. A new project rule makes this automatic for any tracker added in the future.
- Added a full round-trip safety test for cloud saves: a save is now automatically pushed, cleaned, migrated, and re-applied in the test suite to prove every tracker and your faction standings come back exactly as they went in — so a future change can't silently drop part of your campaign during cloud sync. Also locked in two long-standing data-safety rules with build checks: cloud saves are only ever added (never blindly overwritten), and shared settings are merged rather than replaced. No user-facing change.
- The in-app changelog now knows whether it's running on the private test build or the public site. The private staging build shows the in-progress "Unreleased" notes so changes can be reviewed before release, while the public site continues to show only released versions — and defaults to the public behaviour whenever it can't tell, so unreleased notes never leak to live users.
- The public site now publishes only when a new version is actually released, never on an ordinary update to the main line of work. Previously it republished on every change that reached main; it is now gated to a version bump, so work staged for a future release can no longer reach the live site early. A build check was added (and the existing deploy-trigger checks updated) so this release-gating can't silently slip back to publishing on every push.
- Strengthened the safety net around the remote on/off switches and save recovery. New automated tests actually exercise the behaviour — proving that if the remote feature config can't be reached the app keeps every feature switched on (never silently disabling something), that an unknown switch defaults to on, and that restoring a backup truly brings your level, caps, playstyle, and chat back. No user-facing change; these guard paths that previously had no behavioural coverage.
- Cleaned up a handful of dead and duplicated code paths with no change to how the app behaves: removed several functions and variables that were written but never used (an unused stat-ghost effect, two unused time-conversion helpers, a couple of leftover throwaway values, and a permanently-disabled commented-out line), and merged copy-pasted logic into single shared helpers — the uptime clock and memory-cycle timers, and the local save-list reader, are now each defined once instead of twice. Added Suite 99 (16 regression tests) that locks the removals so the dead code can't quietly creep back and proves the merged helpers stay merged.
- Merged the Skill Books and Skill Magazines panels onto one shared renderer. The two panels were built from nearly identical copy-pasted code; they now share a single helper that draws the READ/UNREAD lists, remembers which sections you've collapsed, and wires up each toggle. Both panels look and behave exactly as before — this just means a future read-tracker (or a fix to these two) is written and maintained in one place instead of two. Added regression tests that lock the shared renderer and prove both panels still route through it.
- Tightened the boundary between the cloud-sync code and the part of the app that owns your campaign data. The cloud module used to reach directly into the live game state when saving to the cloud; it now goes through a dedicated, single-source helper that reads the active game and takes the snapshot for it. Behaviour is identical — the same save is written — but the change removes a hidden assumption about load order and keeps each part of the app responsible for its own data. Added Suite 101 (8 regression tests) that fail the build if the cloud module ever reads the game state directly again.
- Locked in the canonical Fallout price, V.A.T.S. accuracy, and ammo-use numbers that three upcoming offline tools — a barter terminal, a V.A.T.S. hit calculator, and a threat/time-to-kill readout — will run on, so those features can compute real in-game results without contacting the AI. Every value was taken straight from the Fallout wiki: shop buy and sell prices scale with your Barter skill exactly as the games do (and a vendor always keeps a margin, so you never buy below an item's worth), V.A.T.S. gets the correct +5% critical bonus in New Vegas and +15% in Fallout 3, and each attack spends one round by default. The one honest exception is recorded in the open: an exact ranged hit-chance can't be reproduced because the per-weapon spread figures it needs simply aren't published anywhere, so that number is flagged as an estimate rather than invented. None of these tools are switched on yet — this only prepares and verifies the data behind them. Added Suite 104 (19 regression tests) that pin every coefficient to its canon value and fail the build if any drifts out of range.
- Retired the old AI-driven trade screen in favour of the new offline barter terminal, removing the AI prompt path and a now-unused helper. While building the new terminal a caps-loss bug was caught and fixed before release: buying or selling updated your caps in memory but not in the caps field the save system reads back, so a save could quietly restore your pre-trade caps — the terminal now keeps both in sync so purchases and sales always stick. Added Suite 106 (18 regression tests) covering the price math (including that you never buy below an item's value and a vendor always keeps a margin), the add-only/confirm-gated transactions, the caps-sync fix, and the retired AI path.
- Added a nightly automated test run. On top of the checks that already run before every push, GitHub now re-runs the test suite once a night (and on demand) against the development branch, using both the Node and PowerShell test runners, and reports a clear pass/fail for each in the run summary. It only runs tests — it never deploys or releases anything — so it's a safety net that catches any environment-specific or time-based failure between pushes without changing what ships.
- Automated the private test-build (staging) deploys. The internal preview site that mirrors in-progress work had to be pushed by hand each time, so it kept falling behind; it now rebuilds and redeploys automatically on every update to the development branch. This only touches the private staging preview — the public site is never affected, and nothing is released or tagged.
- Restored the on-screen "DEV BUILD" badge on the private test build. The amber badge that marks the staging preview as a development build had quietly gone missing when staging switched to automatic deploys — the automatic build renamed the installed app and swapped its icon, but no longer stamped the visible on-screen badge. The badge is back, and the staging build now also gets its own cache version so the restored badge actually reaches devices that already had the page open. The public site is guaranteed never to show it. A build check was added so the badge can't silently vanish from staging — or accidentally leak onto the public site — again.
- Added Suite 111 (11 regression tests) that locks the in-world terminology standard in place — the build now fails if a content input placeholder, an empty-state message, the account or cloud-archive copy, the update notice, or an assistant error message regresses to modern-web wording, or if the install/shortcut text ever names the real game again.
- Converted two dormant on-screen banners into clean, reusable templates instead of leaving them as dead code or deleting them. The firmware-update strip and the per-profile "data systems not yet active" notice are now stored as disabled banner templates — markup the page parses but never displays on its own — that can be switched back on in a single step if a future notice needs them. No visible change: both stay hidden by default, and the app renders exactly as before. Added Suite 112 (7 regression tests) that fail the build if either template is deleted or stops being disabled-by-default, locking in the "keep dead banners as reusable templates, never remove them" rule.
- Renamed the internal diagnostics test runners to a RobCo-themed name (`tests/robco-diagnostics.js` and `.ps1`), echoing the boot sequence's "HARDWARE DIAGNOSTICS [OK]". This is a purely mechanical, developer-only rename with no user-facing effect: every reference — the build gate, the npm scripts, the git hooks, the CI workflows, and the docs — moved in lockstep, the file history was preserved, and both runners still run at full parity. A new build guard fails the build if any stale reference to the old runner name ever reappears anywhere in the repo.
- Added live GitHub Actions status badges (Deploy Staging, CI, Nightly Tests) to the top of the README so the build, test, and deploy state is visible at a glance. Repo-facing only — no effect on the app.
- Bumped the cache revision to verify the auto-update prompt — an intentional version-only deploy (no other changes) so a build already on the previous revision sees the "REBOOT TERMINAL" prompt on reopen, without clearing data.

---

## [v2.6.0] — Content, Crafting & Trackers<!-- Date: 2026-06-28 | Tests: 1078/1078 | Cache: robco-terminal-v2.6.0-r1 -->

### Added

- **Skill Magazines tracker (New Vegas)** — a new SKILL MAGAZINES panel on the STAT tab tracks all 14 NV skill magazines, split into READ and UNREAD sub-menus just like the Skill Books panel. Each magazine shows the skill it temporarily boosts (or "Critical Chance" for True Police Stories). Tap a magazine to move it between READ and UNREAD; counts update instantly. FNV-only — the panel is hidden in Fallout 3 campaigns. The AI knows which magazines have been read and can reference them in play.

- **Skill Books tracker** — a new SKILL BOOKS panel on the STAT tab tracks all 13 skill books for the active game, split into live READ and UNREAD sub-menus. Tap a book to move it between them instantly — no reload needed; the counts update as you go. Each book shows the skill it raises. The AI knows which books have been read and can reference them in play. Books are tracked for both Fallout: New Vegas (including Wasteland Survival Guide for Survival) and Fallout 3 (including U.S. Army: 30 Handy Flamethrower Recipes for Big Guns). Both sub-menus are individually collapsible and remember their collapsed state across reloads.

- **Craft panel** — a new CRAFTING menu in the INV tab with a station-grouped dropdown that shows one recipe card at a time: pick a recipe from the select (Workbench / Campfire / Reloading groups), then see live have/need ingredient checks, a soft skill indicator, and batch crafting with a MAX button. The Scrap/Breakdown sub-panel uses the same picker design. Crafting and scrapping consume and produce real inventory behind a confirmation prompt (local only, never auto-synced to cloud).

- **Structured crafting recipe and breakdown data added to the registry** — 25 New Vegas recipes covering the workbench (stimpaks, repair kits, mines, upgraded weapons, Nuka-Cola variants), recycling bench (energy cell recharging), and campfire (chems, food, survival items); 12 ammo and cookware breakdown entries for the reloading bench; and 7 Fallout 3 workbench schematics (Bottlecap Mine, Dart Gun, Deathclaw Gauntlet, Nuka-Grenade, Railway Rifle, Rock-It Launcher, Shishkebab). This data powers the Craft panel in the INV tab.

- **Expanded Fallout 3 quest log autocomplete with all five add-ons' quests** (Operation: Anchorage, The Pitt, Broken Steel, Point Lookout, Mothership Zeta) plus Big Trouble in Big Town, bringing the FO3 quest catalog from 44 to 64 entries. The new entries include the correct add-on label for each quest so the autocomplete now surfaces DLC quests when typing. Also expanded FO3 quest-item reference data from 15 to 25 entries — added quest-critical items for the add-on story lines (Steel Ingot, Krivbeknih, Cryo Key, Punga Fruit, Wernher's Holotape, Keller Family Transcripts, and more). All quest names and items sourced from the Fallout wiki.

- **Expanded Fallout 3 armor reference data from 32 to 62** — added body armor (Ranger Battle Armor, Composite Recon Armor, Winterized Combat Armor, Samurai Armor, Pitt and DLC sets), power armor variants (Tribal Power Armor, Prototype Medic Power Armor, Cross' Power Armor), outfits and suits (Chinese Stealth adjacents, RobCo Jumpsuit, Enclave Scientist Outfit, Spacesuit, The Mechanist's Costume), and a full headgear set (Combat Helmet, Composite Recon Helmet, T-51b Power Helmet, Enclave Hellfire Helmet, Outcast Power Helmet, Samurai Helmet, Ghoul Mask, Lincoln's Hat, Ledoux's Hockey Mask, Boogeyman's Hood). All weights and values sourced from the Fallout wiki.

- **Expanded New Vegas consumable reference data from 40 to 76 items** — the AI's consumable directory now covers pre-war food and snacks (Cram, InstaMash, Fancy Lads Snack Cakes, Dandy Boy Apples, YumYum Deviled Eggs, Salisbury Steak, MRE), Mojave wild food (Bighorner Steak, Iguana on a Stick, Gecko Steak, Trail Mix, Brahmin Wellington, Grilled Mantis), forageable plants (Banana Yucca Fruit, Barrel Cactus Fruit, Pinyon Nuts, Broc Flower, Xander Root, Nightstalker Tail), expanded Nuka-Cola and soda varieties (Sunset Sarsaparilla, Nuka-Cola Victory, Nuka-Cola Quantum), expanded alcohol (Whiskey, Rum & Nuka, Wasteland Tequila), DLC consumables (Sierra Madre Martini, Battle Brew, Rebound), and crafting ingredients (Sacred Datura Root, Ant Queen Pheromones). All weights and values sourced from the Fallout wiki.

- **Expanded Fallout 3 location autocomplete from 57 to 90 locations** — the location name field now suggests 33 additional Fallout 3 sites, including settlements (Andale, Girdershade, Republic of Dave, Temple of the Union), DC metro stops and neighborhoods (Farragut West, Anacostia Crossing, Metro Central, L'Enfant Plaza, Vernon Square, Dupont Circle), factories and bases (RobCo Facility, Red Racer Factory, Wheaton Armory, Fort Bannister, National Guard Depot), landmarks (Old Olney, Deathclaw Sanctuary, Bethesda Ruins, The Statesman Hotel, Our Lady of Hope Hospital), and all four DLC worldspaces (The Pitt, Point Lookout, Mothership Zeta, Adams Air Force Base). All names sourced from the Fallout wiki.

- **Expanded New Vegas vendor reference data from 14 to 39 merchants** — the AI's vendor directory now covers the full Mojave: Strip vendors (Mister Holdout, Van Graffs), NCR quartermasters (Hoover Dam, Camp Forlorn Hope, Camp McCarran), faction traders (Great Khans, Boomers, Powder Gangers, Followers of the Apocalypse), DLC merchants (Joshua Graham, Sink Central Intelligence Unit, Commissary Terminal), and a wider spread of Freeside, Goodsprings, and Wasteland vendors. Data sourced from the Fallout wiki.

- **Collectibles now mark their region on the world map** — every Snow Globe (New Vegas) and Bobblehead (Fallout 3) is linked to a specific map cell, so the region grid highlights any cell where an uncollected collectible is waiting. FO3 Bobbleheads previously never appeared on the map at all; this is now fixed. A handful of New Vegas Snow Globes that were matched by name were also pointing at the wrong cells — all are now placed correctly. Lincoln Memorabilia items in FO3 likewise flag their museum region on the map until collected.

- **FNV Traits tracker** — new Traits panel (New Vegas campaigns only, FO3 has no traits) showing all 16 traits with their benefit and penalty. Mark which traits your Courier took at character creation; the panel shows how many are selected out of the usual limit of 2 and gently flags it if you go over (Old World Blues allows re-selecting traits, so going beyond 2 is allowed). Traits are tracked separately from Perks and can be filtered by name.

- **FO3 Lincoln Memorabilia tracker** — in the Collectibles panel (FO3 campaigns only), track each of the 9 Head-of-State artifacts: mark items found, then record who you gave them to — Hannibal Hamlin (to free the slaves, Temple of the Union), Leroy Walker (Lincoln Memorial), Abraham Washington (Rivet City Capitol Preservation Society), or Other. A tally shows how many went to each buyer. Location hints appear for missing items.

- **FNV unique apparel catalog expanded** — added 41 new entries to the New Vegas armor/apparel database, covering unique headwear (Motor-Runner’s Helmet, Salt-Upon-Wounds’ Helmet, all four Marked Beast helmets, Lucky Shades, Ulysses’ Mask, and more), NPC outfits (Vera’s Outfit, Dean’s Tuxedo, Naughty Nightwear, Father Elijah’s Robes, Followers Lab Coat, and more), and DLC armor (Christine’s COS Recon Armor, Courier Duster, Ulysses’ Duster, Armor of the 87th Tribe). Three specifically requested items were included: Benny’s Suit (Barter +5 / Speech +5), Suave Gambler Hat (Perception +1), and the Vault 13 Canteen. All stats sourced from the Fallout wiki.

- **Vault 13 Canteen auto-seeded on new FNV campaigns** — when you start a brand-new Fallout: New Vegas campaign the Vault 13 Canteen is placed in your inventory automatically. It never appears in Fallout 3 saves, never duplicates if you reload, and never fires for an existing save that already has progress.

### Fixed

- **Removed duplicate ‘Strictly Business’ entry from the FO3 quest registry** — the entry appeared twice in the autocomplete list; one has been removed.
- **Georgetown West location name corrected** — the autocomplete option previously misspelled as “Georgtown West” has been corrected to “Georgetown West.”
- **Lincoln “Other” disposition removed** — the redundant “Other” option has been dropped from the Lincoln Memorabilia disposition selector. Items previously saved with “Other” are automatically updated to “Found” so no data is lost.
- **Registry no-duplicate-item guard added** — a new automated check now catches copy-paste errors in the item catalog. If the same item (identical name and type) appears twice in either the New Vegas or Fallout 3 catalog, the commit gate blocks it. Items that share a name but have different types (like the New Vegas weapon “Rebound” and the chem “Rebound,” which are genuinely different items) are correctly allowed.
- **The AI can now un-equip weapons and armor** — asking the AI to remove or un-equip something no longer gets silently ignored. Previously, when the AI sent a null value for a slot (to indicate “nothing equipped”), the app treated it the same as “no instruction” and kept the old item. The slot now clears correctly.
- **The AI can no longer invent collectibles** — when the AI returns a list of collected items, each entry is now checked against the actual game’s collectibles catalog. Made-up names are filtered out automatically, preventing phantom entries from appearing in your tracker.
- **Status effect types are now normalized** — status effects created by the AI (buffs, debuffs, etc.) always carry a clean BUFF / DEBUFF / NEUTRAL label. Previously, a value like “buff” or “Debuff” (lowercase or mixed case) or an unrecognized word would pass through unchecked; all values are now uppercased and validated against the allowed set.
- **Expanded New Vegas location database** — added 22 notable minor locations to the map and autocomplete (e.g. Jean Sky Diving, Jack Rabbit Springs, the three Powder Ganger camps, Bonnie Springs, Goodsprings Cave, Scorpion Gulch, The Devil’s Throat, Walking Box Cavern, El Dorado Dry Lake, and more). Each location was sourced from the Fallout wiki and placed in the correct map region. Existing saves are unaffected — the location catalog is read-only reference data.
- The SPECIAL stat fields (S P E C I A L) no longer fight you while typing. Previously, clearing a field to retype a value would immediately snap it back to 1 on every keystroke. Now the field is free to edit and only validates when you leave it (blur): blank or invalid reverts to your last saved value, out-of-range numbers clamp to the nearest valid value (1 or 10), and derived stats (skill points, VATS, etc.) update immediately after you commit. Values above 10 are capped as you type and can never be saved above 10 regardless of how the save is triggered.
- The in-app patch notes viewer now shows the current release notes instead of the empty placeholder section. The viewer skips any unreleased placeholder block and goes straight to the first dated version; HTML comments in the version header no longer appear in the displayed text.
- The Skills panel now shows the correct skills for the active game. Fallout 3 campaigns now display Big Guns and Small Guns (and hide Guns and Survival, which are New Vegas skills); New Vegas campaigns are unchanged. Skill values from existing saves load as before — only the labels and inputs that appear on screen have changed.
- The location autocomplete in the Stats panel now shows places from the active game. Previously the list was hard-coded to 16 New Vegas locations and always showed up in Fallout 3 campaigns, making it useless and misleading. The list is now built dynamically from the active registry so FO3 shows Fallout 3 locations and FNV shows New Vegas locations.
- The update prompt’s message text now reads flush-left with no stray indentation. The message was split across multiple source lines with leading whitespace, which was rendering as visible indentation and a ragged break mid-sentence; it is now a single clean line that wraps naturally.
- Selecting a third trait is now blocked with a clear message (“Maximum 2 traits — deselect one first”) instead of silently allowing it. Deselecting always works regardless of count.
- The PWA home-screen shortcut icons (Comm-Link, Inventory, Stats, New Campaign) now fill the tile edge-to-edge with no gray ring on Android and iOS home screens. The icons are now marked maskable in the app manifest, so Android uses them as full-bleed adaptive icons and applies the dark green background instead of a gray plate.
- **The Comm-Link, Inventory, and Stats shortcut icons now match the New Campaign icon** — the three icons had a thin circular ring and a small baked-in text label from the original icon source art. Both have been removed: each icon now shows a clean green glyph filling the dark circle, identical in style to the New Campaign icon.
- The OPTICS label in the Security & Configuration panel no longer wraps onto a second line on desktop. The label now stays on one line next to the color selector at all viewport widths.
- Switching the game from New Vegas to Fallout 3 (or back) now correctly sticks after reloading. Previously the choice was silently reverted on every reload because the in-memory game context was never updated before the page saved its state — causing the old game to overwrite the new choice on the way out.
- The Bobbleheads and Snow Globes headers no longer appear twice. The collapsible sub-panel header is now the only title; the duplicate bold header that was rendered inside the content area has been removed.
- Clicking a missing Lincoln memorabilia item no longer shows a “SYSTEM FAULT” error in the terminal. Items with apostrophes in their names (Lincoln’s Repeater, Lincoln’s Hat, Lincoln’s Voice, Lincoln’s Diary) were causing a JavaScript error when clicked because the name was embedded directly in the click handler. Names are now passed safely via a data attribute.
- The Lincoln Memorabilia buyer tally (Hannibal, Leroy, Washington, Undecided counts) now updates immediately when you assign or change who you gave an item to. Previously it only refreshed when something else triggered a re-render.
- Lincoln Memorabilia rows are now as compact as the Bobbleheads rows — tight single-line entries with no extra height from the previous inline-flex layout.
- Traits rows now match the same tight density as the Bobbleheads and Snow Globes rows — the extra vertical gap caused by the inline-flex layout on each row’s status tag has been removed.
- **Faction reputation no longer jumps straight to Idolized or Vilified** — clicking the Fame +/- or Infamy +/- buttons now adjusts the value by 5 points at a time instead of 50. A single click previously skipped past all intermediate standings (Accepted, Liked, Shunned, Hated) in one shot. The reputation tier calculation has also been corrected to use canonical New Vegas thresholds sourced from the Fallout wiki: NCR, Caesar’s Legion, and Brotherhood of Steel each have their own breakpoints; all other factions use the standard 8/25/50 scheme.

### Changed

- **All trackers now use a compact one-line format** — the Traits list (New Vegas), the Bobbleheads/Snow Globes list, and the Lincoln Memorabilia list each show one line per entry: status tag, name, and detail all on the same row. This matches the dense bobblehead style throughout and removes the extra vertical gap between rows.
- **Traits, Bobbleheads/Snow Globes, and Lincoln Memorabilia are now individually collapsible** — each sub-list within its parent panel has its own expand/collapse toggle. All three default to collapsed on first launch (so the panels stay tidy), then remember their state across reloads. The state is saved separately from your game save and never affects your character data.
- **Mr. House faction card is centered when alone on a row** — on mobile (two-column layout), when there are an odd number of major factions, the last card is centered instead of left-aligned with blank space next to it. The general rule applies to any lone last card in the faction grid.
- **Traits moved into the Perks panel** — instead of a separate panel, Traits now appears as a compact subsection directly below the Perks list (New Vegas campaigns only). The sub-header shows the current count (e.g. TRAITS [1/2]); a filter box lets you search by name or effect. Fallout 3 campaigns are unaffected — the subsection is hidden automatically.
- The update prompt is now a full-screen blocking reboot dialog. When a new version is ready, a modal covers the screen and must be acknowledged — tap REBOOT TERMINAL to update. The dialog cannot be dismissed any other way. It only appears when an update is genuinely waiting; first-time launch is unaffected.
- The “Save to Cloud” button in the All Saves section now matches the style and sizing of the local save slot buttons, giving the section a consistent look.
- The Security & Configuration panel now shows a unified list of all your saves — both local slots and cloud saves — in one place, each clearly labelled [LOCAL] or [CLOUD]. Signed-in users see “Save Current to Cloud” and “Sync Local Slots → Cloud” buttons here. The Account panel is now focused on identity and sign-in only, with a pointer to Security & Configuration for save management.
- Saving to the cloud now creates a new named save each time (you get to pick the name) rather than overwriting a fixed slot. Identical saves are automatically deduplicated. Loading a cloud save warns you if you have a more recent local save.

### Removed

- The old “Push Cloud Save” / “Pull Cloud Save” buttons and the Courier Save ID field in Security & Configuration have been replaced by the unified save list and the new “Save Current to Cloud” button.

---

## [v2.5.0] — Living Operating System<!-- Date: 2026-06-27 | Tests: 747/747 | Cache: robco-terminal-v2.5.0-r1 -->

### Added

- Accounts and Google sign-in: sign in with Google to back up your campaigns to the cloud. Works in a normal mobile browser and in the installed app. You can also keep using the terminal fully offline without signing in.
- Cloud saves: save a campaign to your account and load it on any device. Uploading never overwrites an existing save, and loading or deleting a cloud save always asks you to confirm. Existing local saves can be moved up to the cloud.
- Optional Gemini key sync: when signed in, you can choose to store your Gemini API key on your account so it follows you between devices. Off by default; your key never leaves your device while it's off or you're signed out. A "GET A FREE GEMINI KEY" link points straight to Google AI Studio.
- App shortcuts with custom icons: on Android, long-press the installed app icon to jump straight to Comm-Link, Inventory, Stats, or New Campaign — each with its own Fallout-style icon. (iOS doesn't support app shortcuts.)
- New app logo: refreshed the terminal's icon.
- In-app error log: the new [LOGS] command opens a panel of recent errors the app caught, with a clear-all button. Stored only on your device, never sent anywhere.
- Privacy policy: a plain-English page explaining exactly what the app stores and where, confirming no ads, analytics, or third-party tracking.

### Improved

- AI reliability: a failing AI request now retries a few times with increasing delays instead of looping forever; rate-limit, network, and server problems each show a clear, specific message.
- Clearer key errors: an invalid or rejected Gemini key reports "KEY REJECTED" immediately and is never saved or synced.

### Fixed

- Mobile layout: loading a save with long item or quest names no longer stretches or clips the page on a phone — long text now wraps to fit.
- The cloud save list no longer shows the date twice or hides the save name behind the buttons.
- A malformed or cut-off AI response can no longer corrupt your game: bad responses leave your data untouched with a clear message.

### Under the Hood

- Save protection: every save is checksummed and version-stamped; loading verifies it, warns if a save looks damaged or newer-than-supported, and keeps three automatic backups before any load so an accidental load can be undone.
- Remote safety controls: cloud and AI features can be paused remotely without an update, each with a graceful fallback; a feature that keeps failing pauses itself for the session; the app always starts even if these checks can't be reached.
- Security hardening: stronger prompt-injection resistance, input-length limits, a strict content-security policy, a pinned Firebase library, locked-down database rules, and an automatic secret-scan on commit.
- Quality gates: a large automated test suite plus accessibility, start-up, and mobile-layout checks run before every release; a deploy check now ensures all published assets actually ship. Standard project files (license, security policy, dependency updates) added.
- Maintainability: the largest interface file was split into focused modules and the old start-up loader was modernized — no change to behavior.

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
- The app now survives a corrupt save file instead of showing a blank screen. If the save data cannot be read, it is automatically set aside and the app starts fresh, rather than crashing on boot.
- Fixed a broken data row in the Fallout 3 weapon database: the Fat Man had an extra trailing field that caused one column to be misread.

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
