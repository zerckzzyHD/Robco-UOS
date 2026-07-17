## [Unreleased]<!-- Tests: 3292/3292 | Cache: robco-terminal-v2.8.0-r42 -->

### Added

- Continued building the true-to-the-game Fallout 3 Pip-Boy screen for landscape (rotate your phone sideways while playing a Fallout 3 campaign): the three main screens now show up as glowing lamps on the device casing, alongside a radio knob, a status gauge, and a toggle switch standing in for the AI channel, system status, and settings. Each screen's sub-sections (like STATUS, SPECIAL, and SKILLS under the character screen) get their own row of tabs on the glass, remembering which one you last had open. Portrait mode is untouched — it keeps showing today's layout — and Fallout: New Vegas isn't affected at all. This is still a functional pass; a fully dressed casing (indicator sway, working knob detent, etc.) comes later.
- Added a Vault Boy figure to the Fallout 3 Pip-Boy's landscape character screen — your five body-part health toggles now flank an original stylized figure instead of a plain top-down diagram, matching the in-game STATUS display. Tapping a body part still works exactly as before; a new pair of small up/down buttons next to your health and radiation readouts lets you adjust them without opening the number field.
- Reworked six of the Fallout 3 Pip-Boy landscape screen's boards to actually look and behave like the real device instead of a re-colored New Vegas layout. Your health, radiation, and status effects now share one merged screen around the Vault Boy figure instead of three separate stacked boxes. S.P.E.C.I.A.L. is now seven plain rows with an up/down stepper instead of a mixing-board of faders. Your skills, perks, and cargo manifest now show as a scrolling list on the left with the selected item's full details and actions on the right, just like flipping through pages on a real Pip-Boy — cargo actions (equip, use, adjust quantity, drop) now live in that details pane, which costs one extra tap the first time you act on a newly-selected item and is exactly as fast from then on; your perk list keeps its one-tap delete either way. Your mission clock, position, faction standing, and karma are now plain boxed readouts instead of framed instrument panels.
- Added a proper device casing around the Fallout 3 Pip-Boy's landscape screen: a left-hand column with the system-status gauge, an embossed nameplate, and the AI radio knob, a right-hand column with the settings switch, and a small brand plate above the glass — matching the real device's housing instead of a flat screen with none. Portrait mode and Fallout: New Vegas are both unaffected.
- The Fallout 3 Pip-Boy's six landscape screens are now noticeably denser and closer to the real device: S.P.E.C.I.A.L. now fits all seven attributes on screen at once instead of five; each body-part health box on the character screen now shows its name; the cargo/perk/collectibles filter search boxes no longer show up as a plain white browser search field; and the top readout strip now leads with the name of whichever screen you're currently on, updating correctly the moment you switch screens.
- Added a damage indicator to the Fallout 3 Pip-Boy's Vault Boy figure: a crippled body part's outline now turns dashed and shows the word CRIPPLED next to it, matching the real game's own damage screen exactly — no color change, same as the original.
- Reworked the Fallout 3 Pip-Boy's character screen so your radiation exposure and active status effects are now visible right alongside your health without scrolling — condition and radiation now sit compactly at the top of that column, with everything else (max health, level, experience, the radiation drag control, and the medical advisory button) still there, one scroll away. Your health bar, S.P.E.C.I.A.L. values, and condition readout no longer flash red at low health — they stay the same green as the rest of the screen, matching the real device, with the wording ("CRITICAL", a dashed outline) still telling you exactly what's wrong. The cargo screen dropped its redundant "drawer" label and tightened its spacing to show more items at once without scrolling.
- Redrew the Fallout 3 Pip-Boy's Vault Boy figure from scratch — a detailed, hand-inked figure (quiff, face, spread fingers) replaces the earlier placeholder outline, much closer to the real game's own screen. A crippled head now also swaps to a distressed face, on top of the dashed outline and blinking CRIPPLED label a crippled limb already showed.
- The Fallout 3 Pip-Boy's cargo screen now shows another row of items at a glance — its always-visible filter search box tucks behind a small tap-to-reveal search button by default, freeing up the room it used to take up permanently. The filter is still there, one tap away.
- Added a safeguard that asks your browser to keep your save data around instead of quietly clearing it under low-storage conditions. If your browser can't guarantee that, a small warning banner now tells you so and reminds you to export a save file as backup — it clears itself once you tap it away.
- The Fallout 3 Karma Center now shows your character's actual in-game karma title (like "Vault Guardian" at level 1 with good karma, or "Messiah" at level 30 with good karma) alongside your karma standing — it updates live as your karma or level changes, and covers all 90 titles from the real game.
- Added a tappable list of real, in-game karma-changing actions (donating to a church, saving a captive, stealing from a locked container, and dozens more) to the Fallout 3 Karma Center — each one now reads as a clear, bordered button with its karma value in its own badge (green for good, orange for evil), and tapping one applies its exact karma value for you and flashes a brief confirmation in the top-right corner, the same way changing location does. A handful of actions the game itself never gives an exact number for are shown but can't be tapped, clearly marked as unconfirmed rather than guessed. The karma slider is still there and still works, for manual adjustments or overriding these actions.
- If your save data ever can't be read at startup (storage corruption — rare, but real), it's now set aside whole and recoverable instead of silently wiped. A warning banner tells you what happened, and a QUARANTINED RECORD entry appears in the saves list with an EXPORT button (download the set-aside data so it can be recovered) and a PURGE button (permanently discard it, behind a confirmation step). The warning re-appears every startup until you resolve it, so a lost campaign can never slip by unnoticed. Loading a healthy save is completely unaffected.
- The terminal now notices when your browser has quietly reclaimed its local data under storage pressure: instead of silently starting you over like a brand-new visitor, a warning banner on the next startup tells you what happened and points you at your surviving cold-storage save slots and backups. Deliberately conservative about false alarms — a genuinely new visitor, a first install after closing the tab early, or a slow device will never see it.
- Saving to a slot now tells you when only one of the terminal's two storage systems actually held the save — a one-time notice per session says whether the slot is held in local memory only or in cold storage only, so a quietly failing device can't pile up under-protected saves without you knowing. A healthy save stays exactly as quiet as before, and a fully failed save stays exactly as loud.

### Fixed

- Deleting, selling, scrapping, using up, or having the Director replace an equipped weapon or piece of armor no longer leaves your bio-metrics readout showing gear you don't actually have anymore — it now correctly clears to "Nothing equipped" (or shows whatever you still have on) the moment the item is gone. A save from before this fix self-heals the first time it's loaded.
- Fixed the new Fallout 3 Pip-Boy screen being unreachable once the app was installed to a home screen — the installed app was locked to portrait mode at the phone level, so rotating sideways could never reveal it. Rotation is now unlocked in both orientations. If you already installed the app, remove it from your home screen, reload the site once in your browser, then add it to your home screen again to pick up the fix.
- Fixed the Fallout 3 Pip-Boy landscape screen's three main lamps reading OPERATOR, OPERATIONS, and DATABANK — the terminal jargon left over from the desk-terminal screen it replaced. They now read the plainer STATS, ITEMS, and DATA, with the original names riding along underneath in smaller text.
- Fixed the Fallout 3 Pip-Boy landscape screen's bottom control bar sliding on top of the last few lines of a long screen and hiding them — the screen now scrolls entirely inside its own bounded display, so the control bar can never cover anything again.
- Fixed the Fallout 3 Pip-Boy landscape screen leaving dead black space down both sides instead of filling your phone's screen.
- Fixed the Fallout 3 Pip-Boy landscape screen's casing reading as a flat, pale placeholder color — it's now a dark, weathered metal, matching the rest of the device.
- Fixed the Fallout 3 Pip-Boy landscape screen's system-status gauge, AI-channel knob, and settings switch looking like flat abstract shapes — the gauge now has a proper needle and a metal ring, the knob has a pointer that swings when you tune in, and the settings switch is a real toggle with a lever, and its label no longer gets cut off.
- Fixed the Fallout 3 Pip-Boy landscape screen still showing the same instrument dressing (part-number tags, blinking status lights, and amber highlights) as the New Vegas desk terminal — it's now a flatter, plainer green readout to match the rest of the Pip-Boy's look.
- Removed the "ROBCO INDUSTRIES" desk-terminal header bar from the top of the Fallout 3 Pip-Boy landscape screen entirely, instead of just shrinking it — a real Pip-Boy has no such header, and removing it frees up meaningfully more room for the actual screen content.
- Fixed an unlabeled amber strip floating over the top of the Fallout 3 Pip-Boy landscape screen on every view except the radio channel — it was the "AI is one tap away" banner meant only for phones, left showing even though the AI's radio knob already provides that same one-tap access on this screen. It's now hidden on the Pip-Boy screen.
- Fixed the AI radio channel's header bar (with its title and history-clear button) still showing on top of the Fallout 3 Pip-Boy's landscape screen — a real Pip-Boy has no such header. The channel itself, and clearing its history, are unaffected; only the redundant header is gone.
- Fixed the Fallout 3 Pip-Boy landscape screen's bottom sub-section tabs visually sliding over the bottom of a long screen's content instead of sitting below it — for example, part of the body-part health toggles could end up hidden under the tab row while scrolling. The screen area between the top readout strip and the bottom tab row is now its own properly bounded, scrolling section, so the tab row can never sit on top of content again.
- Trimmed the Fallout 3 Pip-Boy landscape screen's bottom control bar (the lamps, radio knob, status gauge, and settings switch) to a noticeably shorter height, freeing up more room for the screen above it.
- Fixed a leftover internal label ("FO3 — karmaCenterDisplay") showing literally on screen next to the Karma Center heading — it now reads as plain text like every other label on the page.
- Fixed the Fallout 3 Pip-Boy's cargo manifest screen showing only the load-bearing weight readout and nothing else — that board doesn't have its own tab, so it was rendering permanently on top of whichever cargo screen you actually opened, hiding your weapons, apparel, aid, misc, and ammo lists entirely unless you scrolled past it.
- Fixed the Fallout 3 Pip-Boy's health/radiation up-down buttons losing their bottom arrow once the character screen was reworked into a narrower column — both arrows now always fit.
- Fixed the Fallout 3 Pip-Boy's S.P.E.C.I.A.L. up/down buttons rendering as blank, barely-visible squares stacked on top of each other instead of a legible side-by-side pair.
- Fixed a two-digit skill value getting cut down to one digit in the Fallout 3 Pip-Boy's skills list (showing "1" instead of "15") because its display box was too narrow.
- Fixed the Fallout 3 Pip-Boy's collectibles and cargo screens sometimes refusing to scroll entirely when touched — a leftover scrolling rule sized for a much taller phone screen was trapping the touch gesture instead of handing it up to the screen's own scrollbar.
- Fixed a rare case where interrupting a health, experience, or radiation drag gesture (an incoming call, switching apps mid-drag) could leave the drag stuck active, silently changing that value on your very next unrelated tap anywhere on the page.
- Fixed a mismatched amber highlight bleeding into the Fallout 3 Pip-Boy's mission/faction screen from a decorative strip shared by every screen — it's now the same green as the rest of the Pip-Boy.
- Fixed a handful of narrow number fields — the calendar year, radiation exposure, and the crafting/scrapping quantity boxes — silently clipping their own value by a couple of digits on phones (a 4-digit year could show cut off). Affects both games.
- Fixed the bottom control dock on phones reserving a fixed amount of space below the last screen, which was a few pixels short of the dock's actual size — the very end of a long screen could render partly behind it. Affects both games.
- Fixed the quest log's cycle-status and remove buttons being nearly unreadable against their own background color. Affects both games.
- Fixed the Fallout 3 Pip-Boy's crippled-limb readout showing the shortened "CRIP" instead of spelling out "CRIPPLED" in full, matching the figure right next to it.
- Fixed the perk list's remove button on the Fallout 3 Pip-Boy's landscape screen being the odd one out in red — it's now green like the rest of the screen. It's still clearly a delete button either way, since its "✕" mark never depended on the color.
- Fixed the Fallout 3 Pip-Boy's body-part health toggles being mirrored — tapping your left arm or leg lit up the figure's right side, and vice versa. Every toggle now sits directly next to the exact body part it controls.
- Fixed the rest of the red on the Fallout 3 Pip-Boy's landscape screen — the radiation readout, the RadAway treatment warning, the active-effects remove button, and the screen's low-health glow are all green now instead of red. Nothing they warn you about lost its meaning: the numbers, the wording, and the icons are all exactly the same.
- Your radiation level is now visible on the Fallout 3 Pip-Boy's character screen without scrolling, right alongside your health.
- Fixed the last of the leftover orange on the Fallout 3 Pip-Boy's landscape and desktop screens — the "RAD EXPOSURE" label, the radiation caption next to your health readout, the radiation number shown beside the Vault Boy figure, the Karma Center heading, each perk's rank dots, and the cargo/quest filter buttons all show up in the same green as everything else now, instead of the leftover orange accent color. Nothing about what any of them tell you changed — only the color.
- Fixed the location, item, quest, and perk suggestion boxes — and everything else that looks things up for you, including what the AI itself sees — sometimes showing the OTHER game's content, like a Fallout 3 campaign suggesting New Vegas locations. This only happened right after loading a save slot that held a campaign for a different game than the one you were currently playing; loading now properly restarts the terminal into that game, so every suggestion and lookup matches the game you're actually in. Affects both games, in either direction.
- Fixed re-importing an older save file sometimes leaving a couple of settings (like your map view size, or your standing with a long-retired faction) stuck on their old values instead of being brought up to date, the same way loading a cloud save or a save slot already does. No campaign data was ever lost by this — it only affected a small number of settings staying stale.
- Fixed the Fallout 3 Karma Center warning about a hit-squad faction that doesn't actually exist in the game — it now correctly warns about the Regulators (once your karma turns evil) or Talon Company (once your karma turns good), matching the real game, instead of a made-up threat that only ever showed up at the most extreme evil karma and never warned good-karma characters at all, even though good karma gets you hunted too.
- Fixed three companions showing the wrong karma requirement on the Fallout 3 Karma Center: Dogmeat and Charon never actually required any particular karma to recruit, and Butch DeLoria (who does require neutral karma) was missing from the list entirely. All eight companions and their real requirements now show correctly.
- Fixed the Fallout 3 Karma Center printing your karma standing twice on the same screen.
- Fixed the Fallout 3 Karma Center's action filter box showing distractingly small text in portrait mode — the wider fix that already sized it correctly in landscape was never applied to portrait, where most people actually use it. It now reads at the same comfortable size in every orientation.
- Fixed the Fallout 3 Karma Center's action list only being a compact, scrollable box in one screen orientation — the other orientation dumped all of its actions inline instead, pushing everything below it off screen. It's now a bounded, internally-scrolling list in both portrait and landscape, and scrolling past its edges still moves the rest of the screen underneath it.
- Removed the three karma actions the game itself never gives an exact point value for (a general good deed in a quest, a general evil deed in a quest, and activating Project Purity yourself) from the tappable action list, since tapping them could never actually apply anything. They're kept on record as real, unconfirmed entries — only the unusable buttons are gone.
- Fixed the Fallout 3 perk list containing six perks that don't actually exist in Fallout 3 — three made-up "companion" perks the game has no system for, and three weapon-damage perks that are really from New Vegas, not Fallout 3 (Laser Commander among them). Also fixed a perk misnamed "Scavenger" that should have read "Scrounger", and corrected roughly half of the perk list's level requirements (like Cannibal, which now correctly unlocks at level 12 instead of 6), so the ELIGIBLE PERKS lookup now tells you the real level each perk becomes available.
- Corrected two Fallout 3 bobblehead locations that pointed at the wrong place: the Explosives bobblehead is at the WKML Broadcast Station (in its sealed cistern), not Minefield, and the Unarmed bobblehead is in the unmarked Rockopolis cave, not the Tepid Sewers. Both were checked against the Fallout wiki.
- Corrected the Fallout 3 weapon list against the official Fallout wiki: dozens of weapons had wrong damage, critical-hit, fire-rate, weight, or value numbers — the sniper rifle was listed as worth 3,500 caps instead of 300, and the 10mm pistol fired far slower than it really does — so barter prices, carry weight, the threat-assessment and weapon-lookup readouts, and the AI's own understanding of your arsenal are all accurate now. Explosive blast damage (frag and plasma grenades, mines, the Fat Man and its unique MIRV) was checked page by page rather than guessed. Also removed four "weapons" that aren't in Fallout 3 at all — a Bumper Sword and Golf Club (both New Vegas weapons), a Plunger, and a Tin Grenade — the same cleanup already done for made-up perks. New Vegas is unaffected.
- Finished the Fallout 3 weapon-stat correction by fixing the explosives' attack speed and critical-hit behavior, which had been left on old placeholder values: grenades and mines were listed as attacking once per second when the real rates are slower (grenades about two-thirds, the bottlecap mine about a third), and the Fat Man, missile launchers, and their unique variants were far too slow. Grenades and mines were also wrongly marked as unable to land a critical hit — they actually can (they just deal no extra damage on one), so the threat-assessment and weapon-lookup readouts now reflect that correctly. New Vegas is unaffected.
- Corrected the New Vegas weapon list against the official Fallout wiki — the same kind of cleanup already done for Fallout 3. Dozens of weapons had inflated or just-wrong prices, fire-rates, damage, weight, or critical-hit numbers: the Bozar was listed at 75,000 caps instead of 20,000 and the CZ57 Avenger at 62,000 instead of 8,500, while a few were too cheap (the Medicine Stick was 5,000 instead of 20,000). Every weapon was re-checked one at a time, and explosive blast damage (frag/plasma grenades, mines, the Fat Man, Esther, and the launchers) was pulled from each weapon's own page rather than guessed — so barter prices, carry weight, the threat-assessment and weapon-lookup readouts, and the AI's understanding of your arsenal are all accurate now. Four entries that aren't New Vegas weapons were removed: "Rebound" (that's a chem, not a weapon), a Pump-Action Shotgun (a Brotherhood of Steel weapon), a Golf Club (a Fallout 76 weapon), and a "Vance's Lucky Hat Knife" (no such weapon exists). The "Rocket Launcher" was also renamed to its real in-game name, the Missile Launcher. Fallout 3 is unaffected.
- Fixed two wrong New Vegas snow-globe entries. The "Test Site" globe pointed players to Crescent Canyon West, where there is no globe at all — it's actually behind the cash register in the Lucky 38 Cocktail Lounge. And a seventh globe was listed under the made-up name "Lucky 38"; the real seventh base-game globe is "The Strip", found in Sarah's locked bedroom in Vault 21, so it's now named and located correctly. (The Goodsprings globe was double-checked and left as-is — it really is at the Goodsprings cemetery.)
- Corrected the New Vegas armor and clothing prices, weights and defense values against the official Fallout wiki — the last table in the file that still had unverified numbers. Combat armor was priced at 3,900 caps instead of 6,500, most chems were listed as weighing half a pound when they're actually weightless, and many armors had the wrong damage threshold or value. Since these feed barter prices and carry weight, buying, selling and encumbrance are now accurate. A handful of items (mostly hats, which the wiki keeps on a separate page, plus a few with odd or missing wiki entries) were left at their old numbers rather than guessed, and are flagged as unverified. Also removed a fake "Whiskey Rose" drink that had been listed as a consumable — it's actually a companion perk you get from Cass, not something you drink. The creature/enemy stats were checked too: every creature is real, but their numbers vary by level in the game, so they're honestly left as approximations rather than pinned to a single wiki value. Fallout 3 and the New Vegas weapon list are unaffected.
- Finished the New Vegas armor check by verifying the last leftover items — the hats, helmets and outfits whose stats live on a separate wiki page. Their weights and values are now confirmed, and the four entries that had been left unconfirmed are now resolved against the wiki too, so every New Vegas armor entry is fully checked. The "Wasteland Wanderer Outfit" turned out to be a real New Vegas item after all, so it was corrected — its price dropped from 15 to 6 caps and it now correctly grants +1 Endurance and +1 Agility — rather than removed. The "Vault Utility Suit" was removed, since no New Vegas item goes by that name (the real one is the Vault 3 Utility Jumpsuit, a different entry). And two duplicate rows for the NCR Ranger combat armor were removed, with a behind-the-scenes alias added so that searching or looking up either old name ("NCR Veteran Ranger Armor" or "Ranger Combat Armor") still pulls up the correct armor's stats. Also fixed the Chinese Stealth Armor's description, which still claimed it turns you invisible like the Fallout 3 version; the New Vegas one only gives a +5 Sneak bonus, so that's what it now says.
- Fixed the bottom navigation bar on phones covering the last row or two of several screens until you scrolled — the S.P.E.C.I.A.L. attributes on the character screen, the cargo screen's drawer and search controls, and the quest and databank search boxes could all start out hidden behind the bar the moment you opened them. The screen content now lives in its own bounded, scrolling area that stops right above the bar, so nothing ever renders behind it at any scroll position — the same behavior the AI-channel view and the sideways Fallout 3 screen already had. Affects both games on phones; desktop and the sideways Fallout 3 layout are unchanged.
- Fixed a hidden defect where a bug in one of the startup save-upgrade helpers could have deleted a perfectly healthy save: the "is this save readable?" check accidentally covered more than the actual reading step, so a helper failing for its own reasons was mistaken for a corrupt save and erased it. Those helpers now fail gracefully — the save loads untouched, and the fault is quietly logged for diagnosis instead.

### Under the Hood

- Laid invisible groundwork for an upcoming true-to-the-game Fallout 3 Pip-Boy screen layout: gave a handful of existing panels stable internal names and added a new per-game data table describing how they'll eventually group together on that screen. Nothing you can see changed yet — Fallout: New Vegas is completely unaffected.
- Wired up the (still invisible) mechanism that will let that upcoming Fallout 3 screen switch between its own sub-views. Nothing renders or behaves differently yet — this groundwork only takes effect once its screen actually ships — and Fallout: New Vegas is completely unaffected either way.
- Reorganized the internal developer documentation so a working session no longer has to load a large chunk of historical build notes it usually doesn't need — those notes now live in a separate reference file, read only when actually wanted. Nothing you can see changed.
- Broadened the automated screen-check that catches invisible, unreachable, or clipped controls before they ship — it now actually checks every screen size and both games (it previously only checked one Fallout 3 phone size). It immediately found and helped fix several real, long-standing rough edges shared by both games (see the Fixed section above); one it found — the fixed bottom control dock on phones can still slightly cover the tail end of a couple of screens at certain heights — needs a bigger navigation change and is tracked as its own follow-up rather than patched here.
- Corrected three out-of-date internal code comments that no longer described what the code actually does (they claimed the durable-storage engine was never read from and that the background timing loop owned no timers — both untrue since those systems were finished). Comments only; nothing you can see or interact with changed.
- Added a permanent safeguard that stops the app's install settings from ever locking out a screen that needs the phone rotated sideways to see, so the portrait-lock mistake above can't quietly ship again unnoticed.
- Added a "where does this feature live in the code" navigation guide and expanded the developer documentation's quick-reference index so a working session can find any subsystem without guessing. Added an automated check that fails the build if that guide's file references ever go stale. Nothing you can see changed.
- Clarified the internal naming-convention guidance: in-world flavor names for features only ship when they're immediately understandable at a glance — clarity always wins over theme. Nothing you can see changed.
- Hardened the test suite against an upcoming internal file reorganization: tests that check where a piece of code lives now check the whole feature area instead of one exact file, so splitting a large file into smaller ones later can't accidentally weaken the safety net. Also added an automated pre-flight check that catches a startup-file inconsistency (a script forgotten from the app's load list, the offline-caching list, or the developer documentation) before it ever reaches the live site, and cleaned up a few stale file names in the internal test descriptions. Nothing you can see changed.
- Split the single largest piece of the app's front-end code into six smaller files organized by what each one actually does (navigation, the AI presence, the device status screen, the settings hardware, and the command layer), instead of one very large catch-all file. Purely an internal reorganization for readability and maintainability — every screen, button, and behavior works exactly as before. Nothing you can see changed.
- Added an automated check that catches a body-part toggle sitting on the wrong side of the Fallout 3 Vault Boy figure before it ships, closing the exact gap that let the mirrored-toggle bug above through unnoticed.
- Hardened the behind-the-scenes automated testing so it now runs on both Linux and Windows on every change, instead of Linux only — Windows is the machine the site is actually built on, so this finally checks the build on the same kind of computer it's developed on. The exact version of the test tooling is now written down in a single place that both the local machine and the automated checks read from, so they can never quietly drift apart. As part of this the tooling was moved off a version that stopped receiving support back in April, onto the current long-term-support version. Nothing you can see changed.
- Reorganized the entire internal code folder into labeled subfolders by purpose (game content, core engine, on-screen interface, outside-world services, developer-only tools) instead of one large flat pile of files, and split the single largest stylesheet into twelve smaller files grouped by the screen or feature they style, in the exact same order they always loaded in so nothing about how the terminal looks changed. Also widened two safety checks that had quietly stopped watching some of the app's own files after an earlier reorganization, so they're now watching everything again. Purely an internal filing exercise — every screen, button, and behavior works exactly as before. Nothing you can see changed.
- Split the file handling the AI conversation into four smaller files by responsibility (the network connection itself, the AI's instructions, applying the AI's replies to your campaign, and the offline typed-command shortcuts), instead of one large catch-all file. Also widened the internal file-corruption safety check so it automatically covers every code file going forward instead of a fixed hand-picked list. Purely an internal reorganization for readability and maintainability — every screen, button, and behavior works exactly as before. Nothing you can see changed.
- Split the last of the big catch-all front-end files into nine smaller ones organized by what each actually does (your cargo and ammo, your character and squad status, your personal record and collectibles, your field notes and event log, the cartography table, faction standing, crafting and trade, item pickups, and the native databank lookups), instead of one very large file covering every on-screen panel. Also fixed a couple of internal test checks that were quietly scanning the wrong slice of code after the split. Purely an internal reorganization for readability and maintainability — every screen, button, and behavior works exactly as before. Nothing you can see changed.
- Added plain-English "what this file is and how it fits together" notes and internal signposting throughout the code and stylesheets, and corrected a few stale internal cross-references left over from the recent reorganization. Purely a readability pass for future development — every screen, button, and behavior works exactly as before. Nothing you can see changed.
- The Fallout 3 Karma Center's companion-availability list now reads from the game's own data definitions instead of being hardcoded into the display code, matching how every other per-game detail already works. Nothing you can see changed.
- Removed a second, redundant copy of the test suite that ran the exact same checks a second way. It caught nothing the main test suite didn't and ran about thirteen times slower, so every test had to be written twice for no added safety. Deleting it makes the pre-commit check noticeably faster and halves the future cost of writing tests, with zero loss of coverage — all 3002 tests still run and pass. Nothing you can see changed.
- Fixed the private staging test site silently freezing on an old build so new work (like the in-progress Fallout 3 screen) never appeared and the "Reboot Terminal" prompt did nothing. The site's offline-caching step was trying to store the home page under a web address that the staging host automatically forwards to a shorter one; browsers refuse to cache a forwarded page, and because that caching step is all-or-nothing, the single bad entry aborted the entire update — so the freshly-published build could never take over. The staging build now caches the home page the correct way (and serves that address directly as a backstop), and a new automated pre-flight check fails the build if this class of mistake is ever reintroduced. This only ever affected the private staging site — the live production site was never impacted, because its host serves that page directly. Nothing you can see changed on the live site.
- Added an automated check that loads every Fallout 3 landscape screen and confirms nothing on it is hidden behind something else, cut off at the edge of the display, too faint to read, or unreachable by touch — the same class of problem a manual look could miss but a previous pass shipped anyway. Proven against five real examples of each of those problems before being trusted. Nothing you can see changed.
- Tightened that same automated screen-check's one exception (for the phone navigation dock covering whatever happens to sit under it) so it only excuses that exact dock, not anything of the same broad element type sitting anywhere else on screen — the looser version could have let a real, unrelated overlap slip through unnoticed on a future change. Proven with a live example that the check now catches what it would have missed before. Nothing you can see changed.
- Added an automated check that fails the build if anything on the Fallout 3 Pip-Boy's landscape or desktop screen ever renders in any color but its own green again — it caught two real leftover orange spots nobody had noticed yet (a perk's rank dots and the cargo/quest filter buttons) the first time it ran, both fixed above. Proven against a real example before being trusted. The AI channel column keeps its own orange by design and is correctly left alone. Nothing you can see changed beyond the two spots called out above.
- Closed off a theoretical gap a follow-up review found around the cross-game suggestion-box fix above: if the reference data used to reject made-up collectibles, traits, skill books, magazines, or Lincoln memorabilia ever mismatched the game you were actually playing, it could have silently emptied your own real ones instead of just rejecting nonsense — the same underlying stale-data window as the fix above, closed a second, more permanent way so it stays closed even if some future change reopens the first one. Genuinely made-up items are still rejected exactly as before. Nothing you can see changed.
- Added a thorough new automated check that boots real save files — current, densely-packed, very old, and deliberately broken — through the app's actual startup and save-import steps and confirms nothing in your campaign ever quietly disappears, resets, or gets corrupted along the way. It found one real gap (the settings/faction fix described above) and is proven to actually catch a dropped field by deliberately breaking one, watching the check fail with the right name, then undoing the break. Also double-checked that a failed save write always tells you loudly and leaves your prior save untouched, and added one more such check for local save-slot writes specifically. Nothing you can see changed beyond the two items called out above.
- Every Fallout 3 karma fact — hit-squad thresholds, companion requirements, karma titles, and event values — now carries a note pointing at the exact source page it came from, and the build now automatically fails if a new karma fact is ever added without one. This is what let the invented hit-squad and companion mistakes above get caught and fixed for good, and stops the same kind of mistake from quietly shipping again.
- Corrected the wording the AI itself is given about Fallout 3's irreversible-choice warnings to match the same real hit-squad facts described above, instead of repeating the same made-up threat.
- Every Fallout 3 perk now carries the same kind of source note the karma facts above got — and the build now automatically fails if a new perk is ever added without one, or if a companion-type perk (which Fallout 3 doesn't have) sneaks back in.
- The app is now automatically verified to boot and stay fully usable with no internet connection at all. A new test cuts the network completely, reloads the terminal, and confirms it still starts all the way up from its offline cache and that a native tool (the databank lookup) still works — proving the offline-first promise instead of just assuming it. It's proven to actually catch a break by deliberately dropping a core file from the offline cache and watching the test fail, then undoing it. A second, deliberately tiny boot check now also runs the moment any work is committed, so a change that stopped the terminal from starting at all is caught right away instead of later. Nothing you can see changed.
- Tightened the internal rulebook that guides every development session so the same rules cost less to load each time, without dropping a single rule or the real bug lesson behind any of them: three closely related "remotely switch a broken online feature off" rules were folded into one with clearly labeled parts, the three sign-in rules were grouped together with their shared cause stated once instead of twice, a self-admittedly out-of-date file-by-file listing was trimmed to a scannable index (the full detail already lives in a dedicated reference file), and several spots that restated the same rule two or three times now state it once and point to it. Every rule and every cross-reference still resolves exactly as before. Nothing you can see changed.
- Added an automated safeguard that fails the build if any internal rule cross-reference ever points at a rule number that doesn't exist. The rulebook tidy-up above merged several rules under shared headings while the rest of the project still refers to them by their old numbers; that all still lined up, but only because it had been checked by hand. It's now checked automatically on every change — across the rulebook, the supporting docs, and the code and test notes — so a future renumber or merge can never quietly leave a reference pointing at nothing. Proven to actually catch a bad reference by deliberately adding one, watching the check fail and name it, then undoing it. Nothing you can see changed.
- Strengthened the tests guarding how the AI's replies are applied to your campaign: the rules that an explicit "nothing equipped" from the AI really empties that gear slot, that a made-up status-effect category can't be stored, and that Lincoln memorabilia entries are checked against the real item list were previously verified only by scanning the code's text — which could stay green even if the actual behavior broke. Those checks now run the real import step against real game data and verify the outcome, and each one was proven to genuinely catch its bug by deliberately breaking the behavior, watching the test fail, and undoing it. Also replaced a self-satisfied bookkeeping check in the test suite (it could never fail, because it searched its own list for its own entries) with a real one: the number of tests that actually ran must now match the documented count exactly, so a whole block of tests can never silently vanish from the safety net again — proven the same break-then-fix way. Nothing you can see changed.
- The developer diagnostic panel gained on-demand triggers for every new hard-to-reproduce save-safety condition above (force either warning banner, plant a deliberately corrupt save for a true end-to-end rehearsal, and simulate each one-store-degraded save), and a new suite of automated tests locks the whole layer in: a corrupt save must be quarantined with its exact bytes intact, a healthy save must load with zero warnings, a helper failure on a healthy save must never harm it (proven against the old code, which failed it), the eviction warning must stay silent on every known false-alarm scenario, and each degraded-save notice must appear exactly once. Nothing you can see changed beyond the features described above.

---

## [v2.8.0] — The Physical Machine<!-- Date: 2026-07-10 | Tests: 2951/2951 | Cache: robco-terminal-v2.8.0-r4 -->

### Hotfix

- Fixed the LEVEL UP button unexpectedly jumping the screen down when tapped. Leveling up now stays exactly where you were on the page — you'll still see how many skill points you've earned and that they're waiting for you in SKILL MATRIX.
- Fixed the site's automatic publishing step so it no longer stalls before reaching the live site. Infrastructure only — nothing you can see changed.
- Fixed the CHASSIS system status screen showing only 6 of your 8 feature switches. All 8 now show up with their correct on/off state, including the two for the on-device screenshot scanner.
- Internal only: corrected several stale references in the developer documentation (a couple of renamed behind-the-scenes functions and the startup script list) and added an automated check that fails the build if the docs ever again name a file or function that no longer exists. Nothing you can see changed.

### Added

- A living power core on the CHASSIS screen — a reactive reactor with tumbling 3D rings that responds to what's actually happening. It beats gently while idle, spins up and glows while the Director is thinking, flashes on a level-up, pulses on every save, warms from green toward red the longer it works, ripples when your connection returns, collapses to a point when powered down, and shows a red ring whenever an error is logged, among many other reactions. A second synthesized hum plays alongside it, and a mirror of the core sits in the terminal's top casing so you can watch it react from any screen. Tap it for a cosmetic kick, or press and hold to charge it up; tap its "?" for a plain-language guide to every behavior.
- Feedback you can see and feel, all over the terminal. Leveling up pops a Vault-Boy card; a faction crossing into Vilified or Idolized slams down an ink stamp; completing a directive punches its slot; discovering a location pings the map with an expanding radar ring; taking damage tears a flicker of static across your vitals; gaining XP floats a "+N XP" note; and using a chem, crafting, trading, sleeping, healing, equipping gear, and dozens of other actions each get their own touch. If one happens while you're on a different screen, a small readout at the top of the terminal announces it — tap it to jump straight to the screen that reacted. Everything respects reduce-motion and your Immersion setting.
- A Tool Deck beside the message box. A diamond button raises a compact panel with one-tap access to THREAT, V.A.T.S., TRADE, LOOT, CONSULT, and the V.A.T.S. calculator, so none of them need to sit permanently on screen. The old blind D-Pad shortcuts became a Quick-Draw Holster whose four gear slots visibly show what's bound to them, fire with a single tap, and can be rebound to a different item right there.
- A MODE switch on the Comm-Link message box. A pill beside the help button flips between OVERSEER (the AI narrator) and TERMINAL (typed commands handled instantly on your device, no AI call). In TERMINAL mode, natural one-liners like "killed 3 raiders", "+50 caps", "arrived Novac", or "rep NCR up" record straight to the right tracker — comma-separate several on one line to log them all at once — and you can set or nudge any stat, S.P.E.C.I.A.L. attribute, or skill directly ("hp 80", "str 8", "guns 45", "+2 luck", "level up"). Start a message with `/` to send it to TERMINAL just that once, or put `@` anywhere to ping OVERSEER with the text after it. Matching command and quick-log suggestions appear as you type.
- A LEVEL UP button under your XP bar. It lights up once you've earned enough and raises your level by one with a tap, all the way to level 50 — no need to ask the AI. Leveling up also tells you exactly how many skill points you have to spend and jumps you to your skills so you can assign them yourself.
- Setting your location and fast-travelling from the map. Open a location on the cartography table and a TRAVEL HERE button sits beside MARK SURVEYED — tap it and that spot instantly becomes your current position, with the map updating right away, no AI round-trip. A confirmation card slides in at the top-right whenever you move somewhere, however you got there, and clears itself a couple of seconds later.
- New offline commands. Typing [GPS] or [MAP] jumps straight to your cartography table, and [PERKS] lists every perk you already qualify for at your current level, pulled from the game's own records. Instant, offline, no AI.
- Save version history and full backups. Each save slot — and each cloud save — keeps up to five earlier versions; a "VER" button lets you view when each was saved and restore any of them, confirm-gated and with a safety backup of your current campaign taken first. A new EXPORT FULL BACKUP bundles your entire history — your live campaign, all three slots with their version history, and your automatic backups — into one portable file, and IMPORT SAVE restores it automatically after an integrity check (a corrupted or edited file is refused with nothing changed). IMPORT SAVE still accepts a single save file too.
- Offline cloud saving. Tapping "Save to Cloud" while offline queues that save on your device and uploads it automatically the moment you reconnect, instead of just failing. Only saves you chose to push are ever retried — nothing uploads on its own, and cloud saving stays a manual button.
- OVERWRITE and DELETE controls on every save. Each save in your list — local slot or cloud — has an OVERWRITE option that replaces its contents while keeping its name, and a DELETE option, both confirm-gated. Overwriting a local slot still keeps the version it replaced recoverable in its history.
- An IMMERSION setting (Full / Balanced / Minimal) for how much of the terminal's ambient atmosphere is switched on, remembered on your device. The terminal also visibly settles when you step away — the display dims after a couple of idle minutes with a small "reducing phosphor wear" note, and deepens into a slow breathing standby when you switch tabs — and clears the instant you touch anything again.
- Ceremonial moments. Starting a new campaign runs a short, skippable commissioning sequence that ends with the Director's greeting instead of two plain reset lines; the Director greets you the first time you open the Uplink each session; the first boot after an update calls it out during startup with a nameplate glint and a highlighted revision-log button; and coming back after a few days away adds a brief "recalibrating" boot line.
- A dedicated SETTINGS section — a sixth hardware button gathering your Account, the Module Bay, your Save Archive, and your Campaign Configs in one place.
- An INCIDENT LOG — a "big moments" view of your campaign showing just the milestones (level-ups, faction shifts, quest outcomes), separate from the fuller CROSSROADS RECORD that lists every recorded event.
- Smaller additions: THREAT warns you outright when a fight would burn more ammo than you're actually carrying; you can nudge a companion's rapport with you up or down right from their squad card; a level cap (50) and a scaling XP cap hold typed-in values to what's actually possible; your radiation reading can be dragged to set it directly, like your HP and XP bars; and a live one-line status preview shows on every board even while it's collapsed.

### Fixed

- Closed a data-safety gap where an unusual or corrupted response from the AI could silently turn one of your character's core stats into an invalid value — it's now safely ignored instead, so your character sheet can't be corrupted this way.
- Faction reputation alerts now fire in Fallout 3 as well. Crossing into Vilified or Idolized standing with any faction reliably shows the on-screen alert in both games; previously the alert only recognized New Vegas faction names, so Fallout 3 campaigns silently never triggered it.
- The inventory filter no longer offers a "Mods" filter in Fallout 3, where weapon mods don't exist and it could never show anything.
- Your radiation reading is now capped at the level where radiation actually becomes fatal, whether you type it in yourself or the AI reports it — previously it had no upper limit and could be pushed past that point.
- Confirmation dialogs no longer show two separate "cancel" buttons that did the same thing — every one is now a clear CONTINUE and a clear CANCEL. And wiping the terminal while Complete RNG is armed now warns you up front that doing so locks it on permanently, instead of finding out afterward.
- Cleared a burst of harmless "audio blocked" warnings from the browser console right after opening the terminal — the background hum and warning tones now wait for your first tap, exactly like the boot sound already did.

### Changed

- The terminal now looks and feels like a physical RobCo device. A casing with brand plating and status lamps frames the screen, and the plain tab bar is replaced by a row of illuminated hardware buttons — OPERATOR (your stats), OPERATIONS (inventory and crafting), DATABANK (quests, the map, and records), UPLINK (the AI comm-link), and CHASSIS (device status). Number keys 1–5 jump between sections exactly as before, a new DIRECTORY button (or the 0 key) opens a plain list for anyone who prefers it, and each section now remembers exactly where you'd scrolled to. The casing's PWR, UPLINK, and FAULT lamps are functional — powering the terminal off, jumping to your AI settings when the link is live, and opening the error log. On a desktop the casing has real framed depth; on a phone it stays a clean, compact edge with the hardware buttons docked at the bottom.
- Your OPERATOR screen is rebuilt as hardware. Health, level, and radiation read out as glowing patient-monitor traces you can drag or type to set; S.P.E.C.I.A.L. is a row of draggable sliders with stepper buttons; and your limbs are a tappable anatomical diagram that blinks where you're hurt. Skills are lit signal-level meters you can drag, status effects are colour-coded indicator lamps with tick countdowns, faction standing is one shared reputation console with a channel selector (major and minor factions grouped), and karma is an EVIL–GOOD swing needle. Your perks, traits, skill books, magazines, and collectibles all get matching hardware boards — the curio archive shows each collectible as its real object behind glass. Everything is still editable exactly as before.
- Your OPERATIONS screen is a quartermaster's freight console. A load-cell weigh bridge shows your carry weight as a physical beam that sags the more you carry, turning amber near your limit and locking red with a SEIZED stamp when you go over. Your inventory is six pull-out drawers (Weapons, Apparel, Aid, Mods, Misc, Ammo) with a live count and search on each, and the drawer you last opened is remembered. Every item has a quantity stepper, weapons and armor can be equipped straight from their row, and the crafting bench shows a fill meter for every ingredient. Bottle caps and carry weight moved onto the weigh bridge alongside the rest of your cargo.
- Your DATABANK screen is an archival cartography station. The world map is rebuilt as a real spatial chart — surveyed locations glow as points connected by the routes you've actually travelled, with a rotating survey sweep, a blinking "you are here" marker, and uncollected snow globes, bobbleheads, and Lincoln memorabilia shown as distinct signal-return symbols. Your quest log is a numbered directive rack with status lamps, filterable and searchable, and each quest has a CYCLE button to advance its status yourself. The search panel, campaign record, notes, and session stats all got matching makeovers.
- The Comm-Link is now a living Director Uplink. An oscilloscope-style waveform above your conversation reacts to what's happening — a calm hum while listening, a jagged trace while your message sends, a steady pulse while a reply arrives, and a flat line when there's no key or no connection — and names the game you're playing. The whole view got a modern, messenger-style redesign: your conversation and typing box are one rounded card with the photo, mode, help, and send controls in a single row, every line reads left-to-right at full width with a tag naming who's speaking, and on a phone the Uplink is a compact self-contained view with a small strip on every other screen so the Director never fully disappears.
- Security & Configuration is now a Module Bay. Open a service hatch once and your settings appear as labelled hardware boards — a phosphor tube rack for screen colour, a sonic processor board for sound, a power cell bay, an atmospheric regulator dial for immersion, an AI uplink board for your key, and a maintenance tray — instead of a flat list of toggles. Installing or ejecting hardware gives a tactile click or thunk and a brief settle, and a "Schematic View" button always gives you the old flat list. Every setting does exactly what it did before, in the same one tap.
- The CHASSIS section is its own SYSTEM STATUS screen, showing your device's uptime, firmware, connection, and feature availability across labelled boards, plus an error log — alongside the living power core described above. Your campaign kill/caps/damage stats moved into their own CAMPAIGN LOG in DATABANK, so device information and campaign information are no longer mixed together.
- Your Campaign Configs look and feel like hardware. The game you're playing is a stacked pile of program cartridges with the active one on top; your playstyle is a two-way switch; your playthrough type is a rotary dial you drag, tap, or arrow through with its full name and description always shown; and Complete RNG is a breaker switch under a safety cover with a clear Safe / Armed / Sealed status. Swapping games now asks you to confirm first, since it reboots into that game's own separate campaign.
- Using an item now works instantly and offline. A Stimpak, RadAway, chem, or food applies its actual effect right away — healing, removing radiation, mending a crippled limb, clearing an addiction or poison, or granting a timed buff — instead of sending a message to the Director and waiting for it to narrate the outcome. The USE button only appears on items that can actually be used, and a line in your log confirms exactly what happened.
- Visual Upload reads your screenshot on your own device by default. Attach a screenshot and it scans the image itself, with no round-trip to the Director, and works fully offline once you've used it at least once. It still shows you exactly what it found on a review screen to correct or leave out before anything is added to your campaign, and it quietly hands off to Director vision if the on-device scan can't run — or on request, with a TRY AI VISION button.
- Your Campaign Notes are now purely your own manual notebook. Automatic event entries (level-ups, faction changes, quest updates, and more — now including collectibles, crafting, trading, and resting) live in the campaign's event history, shown in CROSSROADS RECORD and the new INCIDENT LOG, instead of being mixed into your typed notes. The AI can no longer overwrite your notebook — your written notes are yours alone — and recorded events now show a real in-game date and time instead of a cryptic tick count.
- Your ACCOUNT status now reflects reality instead of a mostly-fixed message. Signing in or out, and your connection dropping or coming back, update it immediately — no reload needed — showing whether an operator is on record and whether your archives are syncing to the cloud.
- Your saves list now only shows saves for the game you're currently playing, keeping New Vegas and Fallout 3 saves apart. An older save that predates this change is still shown, since there's no way to tell which game it belongs to.
- Smaller changes: the four separate transcript-export buttons became one EJECT HOLOTAPE control with a TXT/MD/HTML format picker, and the always-visible quick-command row and D-Pad below the message box are gone, replaced by the Tool Deck.
- Removed three unused or redundant features: the Projected Timeline (which never generated anything), the TERMLINK console (the Tool Deck already reaches everything it launched), and the typed CROSSROADS command (its panel is always open anyway). Everything they reached still works exactly as before.

### Improved

- On a phone, the boards across every screen sit a little closer together — tighter spacing, trimmed headers, and less padding — so you scroll noticeably less, while every control stays comfortably large enough to tap and desktop looks exactly as before.
- The databank lookup now also searches your collectibles, skill books, magazines, traits, and Lincoln memorabilia, and surfaces a few previously-hidden details when it finds a match, like a quest item's purpose or a creature's experience yield.
- Confirmation prompts and status messages now appear as in-terminal pop-ups that match the rest of the interface, instead of your browser's plain "OK/Cancel" dialog boxes.
- Your current-session time now reads in a friendlier format (like "2h 15m") instead of a raw minute count.

### Under the Hood

- Built a single "living machine" engine that drives the terminal's ambient atmosphere from one place, tracking what the device is doing (starting up, active, idle, standby, shutting down) and enforcing your Immersion setting so every ambient effect honours it. It fails safe — if it can't start, the terminal behaves exactly as before — and never touches your campaign.
- Moved your saved games, automatic backups, and device settings onto larger, more durable browser storage, lifting the old size ceiling that could make a big save fail. Existing data is copied over safely in the background, everything falls back to the old storage if the new one is ever unavailable, and device settings are now self-healing from a durable backup if the browser ever clears one.
- Rebuilt the campaign's event history into one structured record that CROSSROADS RECORD and the new INCIDENT LOG are simple filtered views of; existing saves convert on load without touching your own written notes. Key moments (level-ups, faction thresholds, critical health) now flow through one internal messaging system, which is what made the Fallout 3 faction-alert fix and the expanded event history possible without duplicating logic.
- Consolidated every confirmation and pop-up onto one shared in-terminal system in place of the browser's native boxes, and routed all device settings through one consistent internal pathway with a check that they can never mix with your campaign save.
- Gave each supported game a much richer internal "identity" profile (its device look, personality, boot style, and Director flavour) in one place, so future updates can build a game's whole appearance from data; a design-only Fallout 4 profile was added purely to prove the system scales and changes nothing you can see.
- Built a staging-only DIAGNOSTIC SHELL — a floating developer console, never visible on the live site, with live engine readouts, an on-demand trigger for every ambient animation and boot variation, and test scenarios — and laid the groundwork for a future in-game hacking minigame to one day unlock a safe, read-only version of it. A new project rule requires every hard-to-reproduce feature to ship with its own on-demand trigger.
- Restructured the AI's instruction assembly and the app's startup routine into smaller, clearly-named pieces, each verified to behave identically — a safety check confirms the AI receives word-for-word the same instructions as before, and a full mobile/desktop check confirms startup is unchanged.
- Restructured the on-device screenshot scanner so Visual Upload can read images locally, and added a much deeper automatic test that runs the character-sheet import code against dozens of broken and hostile inputs — which is what caught the data-safety gap noted above.
- Wired up the terminal's bot-protection layer with its real public site key, testable on staging without ever affecting the public site (only a public identifier is involved, and the app stays fully usable if the layer is unreachable).
- Sped up and de-duplicated the test gate — the browser checks now share one browser instead of launching four, the suites no longer run twice to read back their count, and a release no longer re-tests an already-tested commit — tidied the Node test runner, and added a fast developer-only pre-check.
- Removed dead and duplicated code paths (an unused effect, leftover helpers, and copy-pasted timers and renderers now merged into single shared ones), tidied the repo layout, documented where the two games' reference data genuinely differs, and locked every change in with new automated tests.

---

## [v2.7.0] — Native Systems & Two Wastelands<!-- Date: 2026-06-30 | Tests: 1557/1557 | Cache: robco-terminal-v2.7.0-r5 -->

### Hotfix

- Tapping [TRADE] reliably opens the BARTER UPLINK trading panel and brings it into view. Previously the panel opened correctly but was left off-screen below the other inventory panels, so the button looked like it did nothing.
- Opening the TERMLINK console — or running any built-in command — no longer pops up your phone's on-screen keyboard. The keyboard stays down until you actually tap the typing field, while on a desktop the cursor still returns to the command line so you can keep typing.
- Strengthened the retro CRT texture of the HIGH-LUMEN OPTICS high-contrast mode: its scanline overlay reads more clearly while text stays just as crisp and legible. Normal display mode is unchanged.
- Added quick panel navigation from the Comm-Link. Type a panel's name or a common nickname — "inventory", "stats", "skills", "perks", "quests", "factions", "map", "crafting", "barter", "status", "health", "log", "settings", or "databank" — and that panel opens instantly and offline, with no AI. Anything that isn't a panel name still goes to the Director, so a full "consult deathclaw" lookup keeps working.
- Clarified in the project documentation how each game's full data tables reach the AI and power the offline tools. Documentation only — no change to the app.

### Added

- Six built-in offline terminals that give real Fallout answers on your own device, with no AI call and no network — the headline of this release. A BARTER UPLINK trading screen (INV tab, or the [TRADE] button) where you pick a vendor and buy from their stock or sell from your pack at real barter prices driven by your Barter skill, with a vendor only paying up to the caps in its purse. A CONSULT databank (a typed command, a Comm-Link button, or a persistent DATABANK panel on the DATA tab) that looks up any item, perk, quest, location, companion, or creature from the game's own data and says "NO ENTRY IN DATABANK" rather than inventing anything. A BIO-SCAN medical advisory that reads out your health, radiation, and each limb's condition and recommends the right healing, rad-removal, or addiction treatment. And a LOOT salvage picker that searches the item database and adds anything to your pack at its real value. Every transaction is confirm-gated and never auto-syncs to the cloud.
- A TERMLINK command console — a single launcher (a Comm-Link button or the [TERMLINK] command) that lists all six offline tools with a one-line description each, so any of them is one tap away. Works the same in either game.
- A "?" help button on the save menu that opens a plain-language field manual for every save tool — Export, Import, Restore Backup, the A/B/C slots, cloud save and load, and how auto-save works.
- A SUSTAINED POWER CELL option (Power Management) that keeps your screen from dimming or sleeping while the terminal is open — handy for reading on a phone. Off by default, re-asserts itself when you switch away and back, and quietly disables itself with a note on devices that can't keep the screen awake.
- A HAPTIC SOLENOID option that gives your phone a brief buzz on key moments — a pulse on level-up, a double-buzz when a faction flips to Vilified or Idolized, and a warning buzz when your health drops into the critical zone. Off by default, disables itself on devices without a vibration motor, and stays silent if your system asks to reduce motion.
- An EJECT HOLOTAPE button that hands your Comm-Link transcript to your device's share sheet — a one-tap send to Messages, email, or any app — falling back to copying it to your clipboard, then to saving a text file, if sharing isn't available.
- A directive count badge on the installed app icon showing your unresolved quests while the app is in the background, cleared the moment you open the terminal. Appears automatically on platforms that support app-icon badges; does nothing elsewhere.
- An OVERSEER'S LOG panel (DATA tab) — a maintenance read-out of your time in the terminal: current session uptime (live), longest single session, total power-on time, and boot count. Quiet flavour that builds over time, stored only on your device and never uploaded.
- A HIGH-LUMEN OPTICS high-contrast display mode for bright rooms or low vision: a pure-black background, no phosphor glow, every dimmed label lifted to full strength, and a quieter scanline — all while keeping your chosen optics colour. Turns on automatically if your operating system already asks for higher contrast, and is remembered on your device.
- A PIP-BOY RADIO station (Audio Systems) — a soft bed of static, a warm drifting carrier tone, and a slow trickle of gentle synthesized beeps, all generated live in your browser, so it adds zero download size and contains no copyrighted music. Off by default, respects Master Mute, and only ever starts on a tap or keypress.
- More character in the boot-up sequence. The very first power-on runs a longer "cold start" self-test with a BIOS banner and a counting memory check, and once in a while any launch boots in a rare "degraded tube" mode where the screen flickers like a cold CRT warming up before it settles. Purely cosmetic — every boot lands you in the same terminal, and the flicker holds still if you've asked your device to reduce motion.
- A LOG VISIT button on the world map. Any location you haven't reached yet can be marked visited straight from the map, flipping it from [UNKNOWN] to [VISITED] permanently — so you can record somewhere you'd been on your own, not just where the story moved you. A one-way mark, saved on your device, never contacts the AI.
- Its own colour and identity for each game. New Vegas boots in the classic bright RobCo green and Fallout 3 in a distinct, duller Pip-Boy green, applied automatically when you switch (still overridable from the OPTICS picker, which now offers Pip-Boy green to either game; a colour you pick by hand sticks across both games). The boot screen also names your Pip-Boy and region — "MOJAVE WASTELAND UPLINK" versus "CAPITAL WASTELAND UPLINK" — and the SAVE menu's archive list carries a matching banner. Flavour only, entirely offline.

### Fixed

- Loading a saved game now actually loads it. Importing a save file, restoring a backup, or loading a cloud save could appear to do nothing — the terminal kept showing your current data — because a routine "save on exit" step fired during the reload and overwrote the loaded save with your old data first. All three load paths now load correctly, including older and reconstructed saves.
- The "REBOOT TERMINAL" update prompt now reliably appears after a new version deploys — in a browser tab and, especially, in the installed app, where the device usually resumes the terminal from the background instead of reloading it. The terminal re-checks for a waiting update whenever you return to or focus it, so a freshly-deployed version no longer sits unseen in the background. Brand-new first-time installs correctly stay silent, since there is nothing to update from.
- The world map permanently remembers everywhere you've been. Moving from one location to another used to flip the place you left back to "UNKNOWN" — only the AI could mark somewhere visited — so setting your location by hand never recorded it. True to Fallout fog-of-war, anywhere you've been now stays "VISITED" across reloads.
- The terminal no longer occasionally loads the full desktop layout on a phone (most often on the first launch after an update, until a manual reload). The fixed two-column desktop layout is now locked to actual desktops with a mouse, so a touch phone or tablet always gets the mobile layout even in the brief moment the browser mis-measures the screen after an update.
- Quest, item, and perk name autocomplete now works in Fallout 3 campaigns. The autocomplete helper previously only loaded for New Vegas, leaving all three inputs silent in Fallout 3.
- Fixed a batch of mobile text-wrapping and layout glitches on narrow screens: config labels, map names, the region collectible badge, inventory type tags, the macro command buttons, and the COMPLETE RNG label no longer break mid-word, stack into vertical single-character columns, or overflow. Map names wrap or truncate cleanly with the full name in the tooltip, and the inventory USE button is compact with a proper tap-target height.
- The power-on hum no longer plays detached mid-session. Browsers won't let any sound play until your first tap, so if you didn't touch anything during boot the hum used to fire awkwardly later, the first time you opened a menu. It now only plays while boot is still in progress, or not at all.
- The BARTER UPLINK trading screen now refreshes when you switch vendors, updating the vendor's purse and the buy and sell lists in place instead of leaving the previous vendor's details on screen.
- Corrected a batch of game data against the Fallout wiki so autocomplete no longer suggests fakes and the AI gets accurate stats. Removed entries that aren't real (a non-existent "Fires of Anchorage" quest, a duplicate "Strictly Business", a fabricated "O'cta Brain" weapon, and a New Vegas armor that had leaked into the Fallout 3 database), added the two real Operation: Anchorage quests that were missing, fixed several wrong armor stats (the Mysterious Stranger Outfit, 1st Recon armor, and others), and renamed mislabeled map locations (two regions both called "Vault 92", and a made-up "Vault 92 South" now correctly "Bethesda Offices East").
- Fixed two private-test-build glitches — the in-app changelog showing "CHANGELOG NOT FOUND", and the offline engine failing to update — both host-configuration issues on the staging preview that never affected the public site.

### Changed

- None of the six built-in tools — V.A.T.S., THREAT, TRADE, CONSULT, BIO-SCAN, and LOOT — contacts the AI anymore. Each reads the game's own data and computes its result on your device, instantly, offline, and identically every time.
- The V.A.T.S. calculator became a fully offline, deterministic tool instead of deferring to the AI. It reads your equipped weapon, SPECIAL, skills, and active chem buffs and shows an estimated hit chance per body part, your critical-hit bonus (+5% in New Vegas, +15% in Fallout 3), and — for melee and unarmed weapons — an exact strike optimiser (how many strikes your Action Points afford, damage per strike after the target's armour, and the best body part to hit), with a TARGET DT field for the enemy's armour. Ranged hit chance stays a clearly-labelled estimate, since the exact per-weapon spread isn't published game data. It also correctly recognises each game's full weapon-skill set, so a Fallout 3 character built around Big Guns is no longer ignored.
- The THREAT assessment became a fully offline, deterministic tool instead of asking the AI to size up an enemy. Name a creature and the terminal looks it up in its bestiary and shows a stat card — health, damage threshold, attack damage and rate, resistances, and its weakness — then, against your equipped weapon, estimates the time and ammo (or strikes) to bring it down. If the creature isn't in the bestiary it says so plainly rather than inventing stats.
- The in-app changelog viewer was redesigned into a clean, readable "FIRMWARE REVISION LOG" — one version at a time with a dropdown to any past release, notes grouped into collapsible Added/Fixed/Changed/Removed sections (newest open), tagged and bulleted in the terminal's voice, held to a comfortable reading column on wide screens and full-width on phones, with an EXPAND ALL / COLLAPSE ALL button. The window stays a fixed size as you open and close sections — the notes scroll inside it — so it never jumps around.
- Gave the whole interface one consistent in-world terminal voice. Input prompts and empty-state messages are terse and uppercase, the account panel speaks in "uplink" terms, the update notice reads "FIRMWARE UPDATE STAGED", and the assistant's error messages speak as the in-world Director Link rather than naming "the AI" or the underlying service. The install prompt and app shortcuts also drop the real game name so the app reads as a generic wasteland terminal. Only the wording changed — sign-in, your key-entry field, and every screen-reader label are exactly as before.
- Brought the in-terminal command reference (the "?" / [FEATURES] menu) back in line with what the terminal actually does. The six offline tools are grouped under a clear "NATIVE TERMINALS — OFFLINE, NO AI" heading with accurate descriptions and shortcuts, and a pile of commands that no longer exist were removed, so the menu only shows things that actually work. It's now kept honest automatically so it can't silently drift out of date again.
- Folded the Session Statistics panel into the Overseer's Log so all your run-time figures sit in one place, under two clearly labelled sections — device telemetry (power-on time, longest session, boot count) and campaign figures (kills, caps earned, damage dealt, play-time, location visits, collectibles). The two different "time" figures are now labelled distinctly so they're never confused, and a button still zeroes the campaign counters.
- Your optic colour is remembered per game instead of across the whole app. A colour you pick while playing New Vegas sticks for New Vegas, and Fallout 3 keeps its own separate choice, each restoring on switch (or that game's default if you never changed it). The OPTICS picker marks the current game's default with "(Default)".

### Under the Hood

- Made the two games' behaviour fully data-driven so a future Fallout title can be added by dropping in its data instead of editing logic — the new-campaign seed items, game-switching, faction lookups, and the choice of which data to load at startup all read from a single per-game manifest now.
- Locked the built-in tools onto verified, canon-accurate Fallout numbers (prices, V.A.T.S. accuracy, ammo use) taken straight from the wiki, so each computes a real in-game result offline. The one honest exception is recorded in the open: an exact ranged hit-chance can't be reproduced because the per-weapon spread figures aren't published anywhere, so that number is flagged as an estimate. Retiring the old AI trade screen in the process, a caps bug was caught and fixed — a trade updated your caps but a later save could restore the old total.
- Hardened data safety on load. Saves are defensively cleaned on import so a corrupted or hand-edited file can't carry bad tracker or reputation data into your campaign, and a full cloud round-trip is now tested to prove every tracker and faction standing survives a save-and-restore untouched.
- Repaired and guarded against symbol corruption — garbled dashes, arrows, and special characters that a bad text-encoding write had introduced into the AI's instructions and the docs, which showed up as mojibake in the in-app changelog. The build now fails on any such corruption in a source or doc file.
- Made the terminal only rebuild panels whose data actually changed on each AI response (and skip the world map entirely when it isn't on screen), and built the AI's engine list and settings reads more efficiently — all with no visible change.
- Closed a couple of potential cross-site-scripting holes by safely escaping externally-sourced text (such as an AI model name) before it's shown, with a build check that fails if any externally-sourced value is ever placed on the page unescaped.
- Taught the in-app changelog whether it's running on the private test build or the public site — staging shows in-progress notes, the public site only released ones, defaulting to public whenever it can't tell — and gated the public site to publish only on an actual release, never on ordinary work.
- Removed dead and duplicated code (an unused effect, leftover helpers, and copy-pasted timers and renderers now merged into single shared ones — including one shared renderer behind both skill-tracker panels), and tightened the boundary between cloud-sync and campaign data, all locked in with tests.
- Added a nightly automated test run and automatic private-staging deploys, restored the on-screen "DEV BUILD" badge on staging (guaranteed never to reach the public site), converted two dormant on-screen banners into reusable hidden templates, refreshed and automated the in-browser test page, and added live build/test/deploy status badges to the README.
- Tidied the repo (planning docs moved to a private folder, the internal test runners renamed) and added standing project rules and build checks so game-specific hardcoding, symbol corruption, changelog heading mistakes, stray junk files, and test drift all fail the build going forward.

---

## [v2.6.0] — Content, Crafting & Trackers<!-- Date: 2026-06-28 | Tests: 1078/1078 | Cache: robco-terminal-v2.6.0-r1 -->

### Added

- Skill Books and Skill Magazines trackers. A SKILL BOOKS panel tracks all 13 skill books for the active game (New Vegas or Fallout 3), and a SKILL MAGAZINES panel tracks all 14 New Vegas magazines, each split into live READ and UNREAD lists you move items between with a tap, showing the skill each raises or boosts. Both are individually collapsible and remember their state across reloads, and the AI knows what you've read.
- A Craft panel (INV tab). Pick a recipe from a station-grouped list — workbench, campfire, or reloading bench — and see live have/need ingredient checks, a skill indicator, and batch crafting with a MAX button, with a matching Scrap/Breakdown picker beside it. Crafting and scrapping consume and produce real inventory behind a confirmation prompt, local only and never auto-synced. It's backed by structured Fallout data: 25 New Vegas recipes, 12 breakdown entries, and 7 Fallout 3 schematics.
- A Traits subsection under the Perks panel (New Vegas only — Fallout 3 has no traits). All 16 traits with their benefit and penalty; mark which your Courier took at character creation, see the count against the usual limit of 2, and filter by name. Picking a third trait is blocked with a clear message, though deselecting always works.
- A Lincoln Memorabilia tracker (Fallout 3, in the Collectibles panel). Track each of the 9 Head-of-State artifacts: mark items found, then record who you gave them to — Hannibal Hamlin, Leroy Walker, or Abraham Washington — with a running tally per buyer and location hints for missing items.
- Collectibles now mark their region on the world map. Every New Vegas Snow Globe and Fallout 3 Bobblehead is linked to its map cell, so the grid highlights any region where an uncollected one is waiting; Fallout 3 Bobbleheads had never appeared on the map before, and a few mis-placed New Vegas globes were corrected. Fallout 3 Lincoln Memorabilia likewise flags its museum region until collected.
- The Vault 13 Canteen is placed in your inventory automatically when you start a brand-new New Vegas campaign. It never appears in Fallout 3, never duplicates on reload, and never fires for a save that already has progress.
- A large expansion of each game's reference data, all sourced from the Fallout wiki, so the AI knows more items and autocomplete suggests more of them: Fallout 3's quest catalog grew to cover every add-on's quests, its armor and quest-item lists roughly doubled, and its location list expanded to 90 sites; New Vegas gained dozens more consumables, 25 more vendors, 41 unique apparel entries (including Benny's Suit, the Suave Gambler Hat, and the Vault 13 Canteen), and 22 more minor map locations.

### Fixed

- The S.P.E.C.I.A.L. fields no longer fight you while typing. Clearing a field to retype it used to snap it back to 1 on every keystroke; the field is now free to edit and only validates when you leave it — blank or invalid reverts to your last saved value, out-of-range numbers clamp to 1–10, and derived stats update right after. Values can never be saved above 10.
- Faction reputation no longer jumps straight to Idolized or Vilified. The Fame and Infamy buttons move 5 points at a time instead of 50, so a single click no longer skips past every intermediate standing, and the tier thresholds were corrected to canonical New Vegas values — NCR, Caesar's Legion, and the Brotherhood of Steel each have their own breakpoints, and every other faction uses the standard scheme.
- Several panels now show the data for the game you're actually playing. The Skills panel shows Fallout 3's Big Guns and Small Guns (hiding the New Vegas-only skills), and the location autocomplete lists the active game's places instead of a fixed New Vegas list that used to show up in Fallout 3 campaigns.
- Switching between New Vegas and Fallout 3 now sticks after a reload. The choice used to revert silently on every reload because the old game overwrote the new one on the way out.
- The AI can now un-equip weapons and armor. A cleared slot used to be treated as "no instruction" and the old item kept; it now clears correctly.
- The AI's returned data is validated before it reaches your campaign. Invented collectibles are filtered against the game's own catalog so phantom entries can't appear in your tracker, and status-effect types are normalized to a clean BUFF / DEBUFF / NEUTRAL label.
- The in-app patch notes viewer shows the current release notes instead of an empty placeholder section, skipping the unreleased block and hiding the header comments.
- The home-screen shortcut icons fill the tile edge-to-edge with a clean green glyph and no gray ring or baked-in label, matching each other on Android and iOS.
- Lincoln Memorabilia polish: clicking a missing item whose name contains an apostrophe no longer throws a "SYSTEM FAULT", the buyer tally updates immediately when you assign an item, and the redundant "Other" disposition was removed (anything saved as "Other" becomes "Found", so no data is lost).
- Corrected a couple of catalog errors — a duplicate "Strictly Business" quest and a "Georgetown West" spelling — and added a safeguard that blocks duplicate catalog entries going forward, while still allowing a shared name across genuinely different item types.
- Small layout fixes: the OPTICS label no longer wraps to a second line on desktop, and the Bobbleheads and Snow Globes header no longer appears twice.

### Changed

- The trackers were tightened into a compact one-line format — status tag, name, and detail all on one row — and the Traits, Bobbleheads/Snow Globes, and Lincoln Memorabilia lists each became individually collapsible, defaulting to collapsed and remembering their state across reloads (stored separately from your save, so it never touches your character data).
- A lone last faction card is centered on its row instead of left-aligned with blank space beside it — most visibly Mr. House when there's an odd number of major factions on mobile's two-column layout.
- The update prompt became a full-screen blocking reboot dialog that must be acknowledged with REBOOT TERMINAL; it can't be dismissed any other way, and only appears when an update is genuinely waiting.
- All your saves — local slots and cloud saves — are listed together in one place under Security & Configuration, each clearly labelled [LOCAL] or [CLOUD] and consistently styled, with the Account panel focused on sign-in and identity.
- Saving to the cloud creates a new named save each time (you pick the name) instead of overwriting a fixed slot, automatically deduplicates identical saves, and warns you when loading if you have a more recent local save.

### Removed

- The old "Push Cloud Save" / "Pull Cloud Save" buttons and the Courier Save ID field were replaced by the unified save list and the new "Save to Cloud" button.

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

### Fixed

- Loading a save with long item or quest names no longer stretches or clips the page on a phone — long text wraps to fit.
- The cloud save list no longer shows the date twice or hides the save name behind the buttons.
- A malformed or cut-off AI response can no longer corrupt your game — a bad response leaves your data untouched with a clear message.

### Improved

- A failing AI request retries a few times with increasing delays instead of looping forever, and rate-limit, network, and server problems each show a clear, specific message.
- An invalid or rejected Gemini key reports "KEY REJECTED" immediately and is never saved or synced.

### Under the Hood

- Save protection: every save is checksummed and version-stamped; loading verifies it, warns if a save looks damaged or newer-than-supported, and keeps three automatic backups before any load so an accidental load can be undone.
- Remote safety controls: cloud and AI features can be paused remotely without an update, each with a graceful fallback; a feature that keeps failing pauses itself for the session; the app always starts even if these checks can't be reached.
- Security hardening: stronger prompt-injection resistance, input-length limits, a strict content-security policy, a pinned Firebase library, locked-down database rules, and an automatic secret-scan on commit.
- Quality gates: a large automated test suite plus accessibility, start-up, and mobile-layout checks run before every release; a deploy check now ensures all published assets actually ship. Standard project files (license, security policy, dependency updates) added.
- Maintainability: the largest interface file was split into focused modules and the old start-up loader was modernized — no change to behavior.

---

## [v2.0.1] — Map Readability, Audio Depth & Campaign Intelligence<!-- Date: 2026-06-26 | Tests: 258/258 | Cache: robco-terminal-v2.0.1-r23 -->

### Added

- A Campaign Status Panel showing quest counts (total, active, completed, and failed), active-effect counts with an expiring callout, notable faction standings, and your 20 most recent crossroads decisions.
- The CROSSROADS command draws directly from your live save — current location, recent quests, the last several log entries, and faction changes — instead of the AI's memory, which could be stale or wrong.
- A redesigned world map with compass labels, a glowing border on your current zone, dashed borders for visited zones, amber badges for zones with uncollected items, and a tap-through detail view of sub-locations. Long zone names are abbreviated to fit, and a back button returns to the grid.
- Effects with one or two ticks left are highlighted amber with a blinking EXPIRING badge; permanent effects show an infinity symbol instead of a tick count.
- Automatic alerts when radiation crosses a danger threshold, the time of day shifts, or a chem is about to expire, plus a boot briefing that now includes active quests, notable standings, and expiring chems.
- A bar on each faction card showing the balance between Fame and Infamy, with threshold markers, and faction buttons sized to meet the phone tap-target minimum.
- Three new audio cues, each with its own toggle: a chime when a quest completes, a tone when a quest fails, and a beep when a faction reaches Idolized or Vilified.
- A full-map toggle button that stays visible regardless of screen width.

### Fixed

- The "new version available" notice became an amber bar across the top of the screen instead of a browser pop-up dialog, which mobile browsers can silently block. Tapping the bar applies the update and reloads — which previously did nothing — and the header's version number updates correctly afterward.
- The SEND button ("TRANSMIT PROTOCOL"), accidentally removed when the interface was rebuilt, is back — sending works by tapping it or with Ctrl+Enter — and a regression test guards against it silently vanishing again.
- A black screen on boot right after launch was corrected in a hotfix; the app's code had been accidentally removed and was restored immediately.
- Fixed a batch of world-map glitches on phones: cells render roughly square instead of thin slivers, the compact view loads correctly the first time the panel opens, switching tabs no longer resets your compact/full choice (which now persists across reloads and location changes), the map updates the moment you change location, and only the single best-matching zone is marked CURRENT — a location no longer flags another just because their names share letters.
- Fixed several mobile overflow and sizing issues: the world map (including the full 6×6 grid) no longer scrolls the page sideways or past the right edge, the character panel's number fields no longer stretch too wide or leave a stray vertical green line, and faction buttons stay compact in a row instead of stacking full-width.
- Tapping any input on iOS or Android no longer zooms the page in and leaves it zoomed. Input font sizes below 16px were the trigger — and because the zoom persisted across reloads, the page looked fine on a fresh visit but clipped the right side on every reload afterward. All inputs now render at 16px on phones.
- Reloading a saved game no longer stretches the character screen off the right edge — a long unbroken run of characters in saved chat, like a pasted link, now wraps inside its bubble. A fresh start never showed the problem because there was no saved chat yet.

### Improved

- First mobile layout pass: header and boot text wrap instead of overflowing, tab buttons stack when needed, input fields expand to fill available space, the faction grid uses two columns on narrow screens, and images and tables are capped at screen width.
- Added two extra overflow guards on phones: the page root element (in addition to the page body) now clips horizontal overflow, and status-effect animations that could shear content off the right edge are disabled on narrow screens.

### Under the Hood

- Strengthened the release safety net: the commit gate now blocks any release that forgets to bump the offline-cache version or tries to lower it, and both test runners were brought to parity after the Windows one had been silently skipping many tests.
- Added dozens of automated tests around the map fixes, layout invariants, and service-worker rules, plus an optional mobile-overflow render check, so none of them can quietly regress.
- Closed two ways a crafted save or AI response could inject code — companion numeric fields are coerced to integers before display, and the trade window no longer embeds item names into the page's script.
- The terminal warns you when a save approaches the browser's storage limit so you can export first, caps free-text inputs so an oversized entry can't bloat your save, and survives a corrupt save file by setting it aside and starting fresh instead of showing a blank screen.
- Fixed a broken data row in the Fallout 3 weapon database (the Fat Man had a stray extra field), normalized line endings across the project, and expanded the engineering rules and the plain-English changelog style guide — restyling the whole changelog to match.

---

## [v2.0.0] — The Universal Fallout Companion OS<!-- Date: 2026-06-25 | Tests: 206/206 | Cache: robco-terminal-v2.0.0-r13 -->

### Added

- The app is organized into four tabs — Stats, Inventory, Data, and Campaign — with keyboard shortcuts 1 through 4. Chat and the Tactical Dashboard remain visible across all tabs.
- Full Fallout 3 support: its own faction list, skill list, AI knowledge, item database, and a map of the Capital Wasteland. Selecting Fallout 3 in the Campaign tab switches all systems automatically.
- Save data lives in separate containers for Fallout: New Vegas and Fallout 3, so the two games never share or overwrite each other's data. Old saves migrate automatically on first load, with your original save kept as a backup.
- A V.A.T.S. overlay that calculates hit percentages for all body regions using your actual character stats.
- Point-of-no-return warnings from the AI before major story events, faction lockouts, or irreversible quest branches. Fallout 3 mode covers its own key story moments.
- Skills boosted by an active chem or magazine glow green while the effect is running, and clear automatically when it expires.
- Fallout 3 mode replaces the Faction Standing panel with a Karma panel showing your current karma tier, threshold labels, and companion availability notes.
- Collectibles tracking: 7 Snow Globes for Fallout: New Vegas, 20 Bobbleheads for Fallout 3. A panel badge shows how many you have collected.
- A Regional Zone Map: a 6×6 grid with a blinking cursor on your current location, breadcrumb markers for visited zones, and amber markers for zones with uncollected items. Clicking any zone zooms to a detail view with sub-locations. On narrow screens the map shows 16 central zones by default, with a FULL MAP button to expand.
- An in-game Calendar showing the current in-game date in a readable format (for example, OCT 19, 2281) using each game's accurate starting date.
- A New Campaign flow: a Wipe Terminal button with a double-confirmation step that resets all data and prompts for game selection.
- Save slots now display which game they belong to. Loading a save from the wrong game shows a warning before proceeding.
- When the AI updates something in a tab you are not currently viewing, the app switches to that tab and opens the correct panel automatically.
- Five new audio cues: a click when opening or closing a panel or switching tabs, a hum that shifts pitch while waiting for the AI, a three-note chime on level-up, a slow heartbeat below 25% HP, and a power-on drone on your first interaction after boot.
- API errors display as fictional RobCo exception codes rather than raw error text.
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

### Added

- A dedicated section for customizing the FEATURES command output that will not be overwritten by framework updates.

### Fixed

- AI narrative mandated as a list of strings to prevent line-break-induced crashes. Chat rendering updated accordingly.

---

## [v1.5.2] — Website Architectural Overhaul

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Token triage: inventory data is stripped from the AI payload during non-inventory commands to reduce token cost.

### Fixed

- The AI now retains full conversation history: every request includes the complete chat history so the AI remembers what happened earlier in the session.
- The UI is locked during AI calls to prevent stat changes from overwriting state while the AI is calculating.
- Typing "help," "menu," or "commands" correctly routes to the FEATURES command instead of breaking the AI's persona.

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
