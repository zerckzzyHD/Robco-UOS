/* exported FALLOUT_REGISTRY, registrySearch */
// ── FALLOUT DATA REGISTRY ────────────────────────────────────────────────────
// Canonical reference data for autocomplete and validation.
// Source: Independent Fallout Wiki (https://fallout.wiki) — CC-BY-SA 3.0
//
// IMPORTANT: This is READ-ONLY reference data.
//   - It does NOT affect state, saves, localStorage, or cloud sync.
//   - It is NOT part of the persistence audit (not serialised).
//   - It is NOT part of the undo system (not in state).
//   - It is loaded once at startup and never modified.
//
// Schema decisions (locked — see ARCHITECTURE.md):
//   - Global name:  FALLOUT_REGISTRY
//   - Category keys: quests | items | perks | locations | companions
//   - Entry fields: name (string), type (string), optional per-category fields
//   - No keywords (deferred — add manually post-launch per real usage)
//   - No prerequisites, region, weight, value (no consumers exist)
//   - No id field (name is the unique identifier within each category)
// ─────────────────────────────────────────────────────────────────────────────

const FALLOUT_REGISTRY = {
  version: '2.0.0',

  // ── QUESTS ─────────────────────────────────────────────────────────────────
  // type: 'tutorial' | 'main' | 'side' | 'companion' | 'unmarked'
  // dlc:  null | 'dm' (Dead Money) | 'hh' (Honest Hearts) |
  //        'owb' (Old World Blues) | 'lr' (Lonesome Road)
  // Data source: https://fallout.wiki/wiki/Fallout:_New_Vegas_quests
  quests: [
    // ── Tutorial ──────────────────────────────────────────────────────
    { name: "Ain't That a Kick in the Head", type: 'tutorial', dlc: null },
    { name: 'Back in the Saddle', type: 'tutorial', dlc: null },
    { name: 'By a Campfire on the Trail', type: 'tutorial', dlc: null },

    // ── Main (linear) ─────────────────────────────────────────────────
    { name: 'They Went That-a-Way', type: 'main', dlc: null },
    { name: 'Ring-a-Ding-Ding!', type: 'main', dlc: null },

    // ── Main: Independent / Yes Man ───────────────────────────────────
    { name: 'Wild Card: Ace in the Hole', type: 'main', dlc: null },
    { name: 'Wild Card: Change in Management', type: 'main', dlc: null },
    { name: 'Wild Card: You and What Army?', type: 'main', dlc: null },
    { name: 'Wild Card: Side Bets', type: 'main', dlc: null },
    { name: 'Wild Card: Finishing Touches', type: 'main', dlc: null },
    { name: "You'll Know It When It Happens", type: 'main', dlc: null },
    { name: 'No Gods, No Masters', type: 'main', dlc: null },

    // ── Main: Mr. House ───────────────────────────────────────────────
    { name: 'The House Always Wins I', type: 'main', dlc: null },
    { name: 'The House Always Wins II', type: 'main', dlc: null },
    { name: 'The House Always Wins III', type: 'main', dlc: null },
    { name: 'The House Always Wins IV', type: 'main', dlc: null },
    { name: 'The House Always Wins V', type: 'main', dlc: null },
    { name: 'The House Always Wins VI', type: 'main', dlc: null },
    { name: 'The House Always Wins VII', type: 'main', dlc: null },
    { name: 'The House Always Wins VIII', type: 'main', dlc: null },
    { name: 'All or Nothing', type: 'main', dlc: null },

    // ── Main: NCR ─────────────────────────────────────────────────────
    { name: 'Things That Go Boom', type: 'main', dlc: null },
    { name: "Kings' Gambit", type: 'main', dlc: null },
    { name: 'For the Republic, Part 2', type: 'main', dlc: null },
    { name: 'Eureka!', type: 'main', dlc: null },

    // ── Main: Legion ──────────────────────────────────────────────────
    { name: 'Render Unto Caesar', type: 'main', dlc: null },
    { name: 'Et Tumor, Brute?', type: 'main', dlc: null },
    { name: 'Arizona Killer', type: 'main', dlc: null },
    { name: 'Veni, Vidi, Vici', type: 'main', dlc: null },

    // ── Shared main-arc quests ─────────────────────────────────────────
    { name: 'Beware the Wrath of Caesar!', type: 'main', dlc: null },
    { name: "Don't Tread on the Bear!", type: 'main', dlc: null },

    // ── Side ──────────────────────────────────────────────────────────
    { name: 'A Valuable Lesson', type: 'side', dlc: null },
    { name: 'Aba Daba Honeymoon', type: 'side', dlc: null },
    { name: "Ant Misbehavin'", type: 'side', dlc: null },
    { name: 'Anywhere I Wander', type: 'side', dlc: null },
    { name: 'Back in Your Own Backyard', type: 'side', dlc: null },
    { name: 'Beyond the Beef', type: 'side', dlc: null },
    { name: 'Birds of a Feather', type: 'side', dlc: null },
    { name: 'Bitter Springs Infirmary Blues', type: 'side', dlc: null },
    { name: 'Bleed Me Dry', type: 'side', dlc: null },
    { name: 'Booted', type: 'side', dlc: null },
    { name: 'Boulder City Showdown', type: 'side', dlc: null },
    { name: 'Bye Bye Love', type: 'side', dlc: null },
    { name: "Caesar's Favor", type: 'side', dlc: null },
    { name: "Caesar's Hire", type: 'side', dlc: null },
    { name: 'Can You Find it in Your Heart?', type: 'side', dlc: null },
    { name: 'Classic Inspiration', type: 'side', dlc: null },
    { name: "Climb Ev'ry Mountain", type: 'side', dlc: null },
    { name: 'Cold, Cold Heart', type: 'side', dlc: null },
    { name: 'Come Fly With Me', type: 'side', dlc: null },
    { name: 'Crazy, Crazy, Crazy', type: 'side', dlc: null },
    { name: 'Cry Me a River', type: 'side', dlc: null },
    { name: 'Debt Collector', type: 'side', dlc: null },
    { name: "Don't Make a Beggar of Me", type: 'side', dlc: null },
    { name: 'ED-E My Love', type: 'side', dlc: null },
    { name: 'Eye for an Eye', type: 'side', dlc: null },
    { name: 'Eyesight to the Blind', type: 'side', dlc: null },
    { name: 'Flags of Our Foul-Ups', type: 'side', dlc: null },
    { name: 'For Auld Lang Syne', type: 'side', dlc: null },
    { name: 'G.I. Blues', type: 'side', dlc: null },
    { name: 'Ghost Town Gunfight', type: 'side', dlc: null },
    { name: 'Guess Who I Saw Today', type: 'side', dlc: null },
    { name: 'Hard Luck Blues', type: 'side', dlc: null },
    { name: 'Heartache by the Number', type: 'side', dlc: null },
    { name: 'High Times', type: 'side', dlc: null },
    { name: 'How Little We Know', type: 'side', dlc: null },
    { name: 'I Could Make You Care', type: 'companion', dlc: null },
    { name: "I Don't Hurt Anymore", type: 'side', dlc: null },
    { name: 'I Forgot to Remember to Forget', type: 'companion', dlc: null },
    { name: 'I Fought the Law', type: 'side', dlc: null },
    { name: 'I Hear You Knocking', type: 'side', dlc: null },
    { name: 'I Put a Spell on You', type: 'side', dlc: null },
    { name: 'Keep Your Eyes on the Prize', type: 'side', dlc: null },
    { name: 'Left My Heart', type: 'side', dlc: null },
    { name: 'Medical Mystery', type: 'side', dlc: null },
    { name: 'My Kind of Town', type: 'side', dlc: null },
    { name: 'No, Not Much', type: 'side', dlc: null },
    { name: "Nothin' But a Hound Dog", type: 'companion', dlc: null },
    { name: 'Oh My Papa', type: 'side', dlc: null },
    { name: 'One for My Baby', type: 'companion', dlc: null },
    { name: 'Pheeble Will', type: 'side', dlc: null },
    { name: 'Pressing Matters', type: 'side', dlc: null },
    { name: 'Restoring Hope', type: 'side', dlc: null },
    { name: 'Return to Sender', type: 'side', dlc: null },
    { name: 'Run Goodsprings Run', type: 'side', dlc: null },
    { name: 'Someone to Watch Over Me', type: 'side', dlc: null },
    { name: 'Still in the Dark', type: 'side', dlc: null },
    { name: 'Sunshine Boogie', type: 'side', dlc: null },
    { name: 'Talent Pool', type: 'side', dlc: null },
    { name: 'Tend to Your Business', type: 'side', dlc: null },
    { name: 'That Lucky Old Sun', type: 'side', dlc: null },
    { name: 'The Coyotes', type: 'side', dlc: null },
    { name: 'The Finger of Suspicion', type: 'side', dlc: null },
    { name: 'The House Has Gone Bust!', type: 'side', dlc: null },
    { name: 'The Legend of the Star', type: 'side', dlc: null },
    { name: 'The Moon Comes Over the Tower', type: 'side', dlc: null },
    { name: 'The White Wash', type: 'side', dlc: null },
    { name: 'There Stands the Grass', type: 'side', dlc: null },
    { name: 'Three-Card Bounty', type: 'side', dlc: null },
    { name: 'Unfriendly Persuasion', type: 'side', dlc: null },
    { name: 'Volare!', type: 'side', dlc: null },
    { name: 'Wang Dang Atomic Tango', type: 'side', dlc: null },
    { name: 'We Are Legion', type: 'side', dlc: null },
    { name: 'We Will All Go Together', type: 'side', dlc: null },
    { name: 'Wheel of Fortune', type: 'side', dlc: null },
    { name: "Why Can't We Be Friends?", type: 'side', dlc: null },
    { name: 'You Can Depend on Me', type: 'side', dlc: null },
    { name: 'Young Hearts', type: 'side', dlc: null },

    // ── Unmarked ──────────────────────────────────────────────────────
    { name: 'A Bit of Slap and Tickle', type: 'unmarked', dlc: null },
    { name: 'A Final Plan for Esteban', type: 'unmarked', dlc: null },
    { name: 'A Pair of Dead Desperados, I', type: 'unmarked', dlc: null },
    { name: 'A Pair of Dead Desperados, II', type: 'unmarked', dlc: null },
    { name: 'A Team of Moronic Mercenaries', type: 'unmarked', dlc: null },
    { name: 'A Trusted Aide', type: 'unmarked', dlc: null },
    { name: 'Access Powers', type: 'unmarked', dlc: null },
    { name: 'All Fired Up!', type: 'unmarked', dlc: null },
    { name: 'An Ear to the Ground', type: 'unmarked', dlc: null },
    { name: 'Andy and Charlie', type: 'unmarked', dlc: null },
    { name: 'Arachnophobia', type: 'unmarked', dlc: null },
    { name: 'Arizona Scavenger', type: 'unmarked', dlc: null },
    { name: 'Barton the Fink', type: 'unmarked', dlc: null },
    { name: 'Bear Necessities', type: 'unmarked', dlc: null },
    { name: 'Brotherhood Bond', type: 'unmarked', dlc: null },
    { name: 'Bounty Killer', type: 'unmarked', dlc: null },
    { name: 'Caching in at the Cove', type: 'unmarked', dlc: null },
    { name: "Caesar's Foe", type: 'unmarked', dlc: null },
    { name: 'Cajoling a Cudgel', type: 'unmarked', dlc: null },
    { name: 'Claws Mended', type: 'unmarked', dlc: null },
    { name: 'Claws Out', type: 'unmarked', dlc: null },
    { name: 'Dealing with Contreras', type: 'unmarked', dlc: null },
    { name: 'Defacing the Humble Stone', type: 'unmarked', dlc: null },
    { name: 'Democracy Inaction', type: 'unmarked', dlc: null },
    { name: "Don't Poke at the Bear!", type: 'unmarked', dlc: null },
    { name: "Eddie's Emissary", type: 'unmarked', dlc: null },
    { name: "Exhumin' Nature", type: 'unmarked', dlc: null },
    { name: 'Fight Night', type: 'unmarked', dlc: null },
    { name: 'Flogging a Dead Corpse', type: 'unmarked', dlc: null },
    { name: 'Friend of the Followers', type: 'unmarked', dlc: null },
    { name: 'Gland for Some Home Cooking', type: 'unmarked', dlc: null },
    { name: 'Harder, Better, Faster, Stronger', type: 'unmarked', dlc: null },
    { name: "Hat's Entertainment", type: 'unmarked', dlc: null },
    { name: 'Help for Halford', type: 'unmarked', dlc: null },
    { name: 'Hidden Valley computer virus', type: 'unmarked', dlc: null },
    { name: 'Highway to the Danger Zone', type: 'unmarked', dlc: null },
    { name: 'Honorary Rocketeer', type: 'unmarked', dlc: null },
    { name: 'I Love Bananas', type: 'unmarked', dlc: null },
    { name: 'Iron and Stealing', type: 'unmarked', dlc: null },
    { name: "Keith's Caravan Charade", type: 'unmarked', dlc: null },
    { name: "Lenk's Bad Debts", type: 'unmarked', dlc: null },
    { name: 'Lily and Leo', type: 'unmarked', dlc: null },
    { name: 'Long-Term Care', type: 'unmarked', dlc: null },
    { name: 'Malleable Mini Boomer Minds', type: 'unmarked', dlc: null },
    { name: "Maud's Muggers", type: 'unmarked', dlc: null },
    { name: 'Meeting an Equal', type: 'unmarked', dlc: null },
  ],

  // ── ITEMS ──────────────────────────────────────────────────────────────────
  // type: 'weapon' | 'armor' | 'aid' | 'ammo' | 'misc'
  // Data source: https://fallout.wiki/wiki/Fallout:_New_Vegas_weapons
  //              https://fallout.wiki/wiki/Fallout:_New_Vegas_armor_and_clothing
  //              https://fallout.wiki/wiki/Fallout:_New_Vegas_consumables
  // License: CC-BY-SA 4.0 (fallout.wiki)
  items: [
    // ── GUNS: Pistols ────────────────────────────────────────────────────────
    { name: '.357 Magnum Revolver', type: 'weapon' },
    { name: '.44 Magnum Revolver', type: 'weapon' },
    { name: '.45 Auto Pistol', type: 'weapon' },
    { name: '10mm Pistol', type: 'weapon' },
    { name: '12.7mm Pistol', type: 'weapon' },
    { name: '5.56mm Pistol', type: 'weapon' },
    { name: '9mm Pistol', type: 'weapon' },
    { name: 'A Light Shining in Darkness', type: 'weapon' },
    { name: 'Hunting Revolver', type: 'weapon' },
    { name: "Li'l Devil", type: 'weapon' },
    { name: 'Lucky', type: 'weapon' },
    { name: 'Maria', type: 'weapon' },
    { name: 'Mysterious Magnum', type: 'weapon' },
    { name: 'Police Pistol', type: 'weapon' },
    { name: 'Ranger Sequoia', type: 'weapon' },
    { name: 'Silenced .22 Pistol', type: 'weapon' },
    { name: 'That Gun', type: 'weapon' },
    { name: 'Weathered 10mm Pistol', type: 'weapon' },
    // ── GUNS: Rifles ─────────────────────────────────────────────────────────
    { name: 'Abilene Kid LE BB Gun', type: 'weapon' },
    { name: 'All-American', type: 'weapon' },
    { name: 'Anti-Materiel Rifle', type: 'weapon' },
    { name: 'Assault Carbine', type: 'weapon' },
    { name: 'Automatic Rifle', type: 'weapon' },
    { name: 'BB Gun', type: 'weapon' },
    { name: 'Battle Rifle', type: 'weapon' },
    { name: 'Bozar', type: 'weapon' },
    { name: 'Brush Gun', type: 'weapon' },
    { name: "Christine's COS Silencer Rifle", type: 'weapon' },
    { name: 'Cowboy Repeater', type: 'weapon' },
    { name: 'Gobi Campaign Scout Rifle', type: 'weapon' },
    { name: 'Hunting Rifle', type: 'weapon' },
    { name: 'La Longue Carabine', type: 'weapon' },
    { name: 'Light Machine Gun', type: 'weapon' },
    { name: 'Marksman Carbine', type: 'weapon' },
    { name: 'Medicine Stick', type: 'weapon' },
    { name: 'Paciencia', type: 'weapon' },
    { name: 'Ratslayer', type: 'weapon' },
    { name: 'Service Rifle', type: 'weapon' },
    { name: 'Sniper Rifle', type: 'weapon' },
    { name: "Survivalist's Rifle", type: 'weapon' },
    { name: 'This Machine', type: 'weapon' },
    { name: 'Trail Carbine', type: 'weapon' },
    { name: 'Varmint Rifle', type: 'weapon' },
    // ── GUNS: SMGs ───────────────────────────────────────────────────────────
    { name: '.45 Auto Submachine Gun', type: 'weapon' },
    { name: '10mm Submachine Gun', type: 'weapon' },
    { name: '12.7mm Submachine Gun', type: 'weapon' },
    { name: '9mm Submachine Gun', type: 'weapon' },
    { name: 'H&H Tools Nail Gun', type: 'weapon' },
    { name: 'Silenced .22 SMG', type: 'weapon' },
    { name: 'Sleepytyme', type: 'weapon' },
    { name: "Vance's 9mm Submachine Gun", type: 'weapon' },
    // ── GUNS: Shotguns ───────────────────────────────────────────────────────
    { name: 'Big Boomer', type: 'weapon' },
    { name: 'Caravan Shotgun', type: 'weapon' },
    { name: 'Dinner Bell', type: 'weapon' },
    { name: 'Hunting Shotgun', type: 'weapon' },
    { name: 'Lever-Action Shotgun', type: 'weapon' },
    { name: 'Riot Shotgun', type: 'weapon' },
    { name: 'Sawed-Off Shotgun', type: 'weapon' },
    { name: 'Single Shotgun', type: 'weapon' },
    { name: 'Sturdy Caravan Shotgun', type: 'weapon' },
    // ── GUNS: Heavy ──────────────────────────────────────────────────────────
    { name: 'CZ57 Avenger', type: 'weapon' },
    { name: 'FIDO', type: 'weapon' },
    { name: 'K9000 Cyberdog Gun', type: 'weapon' },
    { name: 'Minigun', type: 'weapon' },
    { name: 'Shoulder Mounted Machine Gun', type: 'weapon' },
    // ── ENERGY: Laser Pistol ─────────────────────────────────────────────────
    { name: 'Alien Blaster', type: 'weapon' },
    { name: 'Compliance Regulator', type: 'weapon' },
    { name: "Euclid's C-Finder", type: 'weapon' },
    { name: 'Laser Pistol', type: 'weapon' },
    { name: 'MF Hyperbreeder Alpha', type: 'weapon' },
    { name: 'Pew Pew', type: 'weapon' },
    { name: 'Recharger Pistol', type: 'weapon' },
    // ── ENERGY: Laser Rifle ──────────────────────────────────────────────────
    { name: 'AER14 Prototype', type: 'weapon' },
    { name: "Elijah's Advanced LAER", type: 'weapon' },
    { name: 'LAER', type: 'weapon' },
    { name: 'Laser RCW', type: 'weapon' },
    { name: 'Laser Rifle', type: 'weapon' },
    { name: 'Recharger Rifle', type: 'weapon' },
    { name: 'Tri-beam Laser Rifle', type: 'weapon' },
    // ── ENERGY: Plasma ───────────────────────────────────────────────────────
    { name: 'Plasma Defender', type: 'weapon' },
    { name: 'Plasma Pistol', type: 'weapon' },
    { name: 'Plasma Rifle', type: 'weapon' },
    { name: 'Q-35 Matter Modulator', type: 'weapon' },
    // ── ENERGY: Gauss & Heavy ────────────────────────────────────────────────
    { name: 'Gauss Rifle', type: 'weapon' },
    { name: 'YCS/186', type: 'weapon' },
    { name: 'Flamer', type: 'weapon' },
    { name: 'Heavy Incinerator', type: 'weapon' },
    { name: 'Incinerator', type: 'weapon' },
    { name: 'Multiplas Rifle', type: 'weapon' },
    { name: 'Tesla Cannon', type: 'weapon' },
    { name: 'Tesla-Beaton Prototype', type: 'weapon' },
    // ── EXPLOSIVES ───────────────────────────────────────────────────────────
    { name: 'Grenade Launcher', type: 'weapon' },
    { name: 'Grenade Machinegun', type: 'weapon' },
    { name: 'Grenade Rifle', type: 'weapon' },
    { name: 'Red Glare', type: 'weapon' },
    { name: 'Annabelle', type: 'weapon' },
    { name: 'Fat Man', type: 'weapon' },
    { name: 'Mercy', type: 'weapon' },
    { name: 'Frag Grenade', type: 'weapon' },
    { name: 'Plasma Grenade', type: 'weapon' },
    { name: 'Pulse Grenade', type: 'weapon' },
    { name: 'Incendiary Grenade', type: 'weapon' },
    { name: 'Holy Frag Grenade', type: 'weapon' },
    { name: 'Frag Mine', type: 'weapon' },
    { name: 'Plasma Mine', type: 'weapon' },
    { name: 'Pulse Mine', type: 'weapon' },
    { name: 'Tin Grenade', type: 'weapon' },
    { name: 'Dynamite', type: 'weapon' },
    // ── MELEE: Bladed ────────────────────────────────────────────────────────
    { name: 'Blade of the East', type: 'weapon' },
    { name: 'Bowie Knife', type: 'weapon' },
    { name: 'Broad Machete', type: 'weapon' },
    { name: 'Carbon Fiber Frame', type: 'weapon' },
    { name: "Chance's Knife", type: 'weapon' },
    { name: 'Combat Knife', type: 'weapon' },
    { name: 'Katana', type: 'weapon' },
    { name: 'Machete', type: 'weapon' },
    { name: 'Machete Gladius', type: 'weapon' },
    { name: "Lily's Vertibird Blade", type: 'weapon' },
    { name: 'Ripper', type: 'weapon' },
    { name: 'Shishkebab', type: 'weapon' },
    { name: 'Straight Razor', type: 'weapon' },
    { name: 'Throwing Knife', type: 'weapon' },
    { name: 'Throwing Knife Spear', type: 'weapon' },
    { name: "Vance's Lucky Hat Knife", type: 'weapon' },
    { name: 'Figaro', type: 'weapon' },
    // ── MELEE: Blunt ─────────────────────────────────────────────────────────
    { name: 'Baseball Bat', type: 'weapon' },
    { name: 'Bumper Sword', type: 'weapon' },
    { name: 'Cattle Prod', type: 'weapon' },
    { name: 'Fire Axe', type: 'weapon' },
    { name: 'Golf Club', type: 'weapon' },
    { name: 'Oh, Baby!', type: 'weapon' },
    { name: 'Pool Cue', type: 'weapon' },
    { name: 'Sledgehammer', type: 'weapon' },
    { name: 'Super Sledge', type: 'weapon' },
    { name: 'Thermic Lance', type: 'weapon' },
    { name: 'Tire Iron', type: 'weapon' },
    { name: 'War Club', type: 'weapon' },
    { name: 'Two-Step Goodbye', type: 'weapon' },
    // ── UNARMED ──────────────────────────────────────────────────────────────
    { name: 'Ballistic Fist', type: 'weapon' },
    { name: 'Bear Trap Fist', type: 'weapon' },
    { name: 'Corrosive Glove', type: 'weapon' },
    { name: 'Cram Opener', type: 'weapon' },
    { name: 'Displacer Glove', type: 'weapon' },
    { name: 'Fist of Rawr', type: 'weapon' },
    { name: 'Industrial Hand', type: 'weapon' },
    { name: 'Love and Hate', type: 'weapon' },
    { name: 'Mantis Gauntlet', type: 'weapon' },
    { name: 'Pushy', type: 'weapon' },
    { name: 'Rebound', type: 'weapon' },
    { name: 'Saturnite Fist', type: 'weapon' },
    { name: 'Zap Glove', type: 'weapon' },

    // ── ARMOR: Light ─────────────────────────────────────────────────────────
    { name: 'Advanced Radiation Suit', type: 'armor' },
    { name: 'Armored Vault 13 Jumpsuit', type: 'armor' },
    { name: 'Armored Vault 21 Jumpsuit', type: 'armor' },
    { name: 'Assassin Suit', type: 'armor' },
    { name: "Caesar's Armor", type: 'armor' },
    { name: 'Chinese Stealth Armor', type: 'armor' },
    { name: 'Gecko-Backed Leather Armor', type: 'armor' },
    { name: 'Gecko-Backed Leather Armor, Reinforced', type: 'armor' },
    { name: 'Gladiator Armor', type: 'armor' },
    { name: 'Great Khan Armored Leather', type: 'armor' },
    { name: 'Great Khan Simple Armor', type: 'armor' },
    { name: "Joshua Graham's Armor", type: 'armor' },
    { name: 'Leather Armor', type: 'armor' },
    { name: 'Leather Armor, Reinforced', type: 'armor' },
    { name: 'Lightweight Leather Armor', type: 'armor' },
    { name: 'NCR Trooper Fatigues', type: 'armor' },
    { name: 'Radiation Suit', type: 'armor' },
    { name: 'Raider Badlands Armor', type: 'armor' },
    { name: 'Raider Blastmaster Armor', type: 'armor' },
    { name: 'Raider Painspike Armor', type: 'armor' },
    { name: 'Raider Sadist Armor', type: 'armor' },
    { name: 'Sierra Madre Armor', type: 'armor' },
    { name: 'Sierra Madre Armor, Reinforced', type: 'armor' },
    { name: 'Space Suit', type: 'armor' },
    { name: 'Tribal Raiding Armor', type: 'armor' },
    // ── ARMOR: Medium ────────────────────────────────────────────────────────
    { name: 'Advanced Riot Gear', type: 'armor' },
    { name: 'Combat Armor', type: 'armor' },
    { name: 'Combat Armor, Reinforced', type: 'armor' },
    { name: 'Combat Armor, Reinforced Mark 2', type: 'armor' },
    { name: 'Desert Ranger Combat Armor', type: 'armor' },
    { name: 'Elite Riot Gear', type: 'armor' },
    { name: 'Enclave Power Armor', type: 'armor' },
    { name: 'Gannon Family Tesla Armor', type: 'armor' },
    { name: 'Legion Centurion Armor', type: 'armor' },
    { name: 'Lightweight Metal Armor', type: 'armor' },
    { name: 'NCR Bandoleer Armor', type: 'armor' },
    { name: 'NCR Ranger Combat Armor', type: 'armor' },
    { name: 'NCR Ranger Patrol Armor', type: 'armor' },
    { name: 'NCR Trooper Armor', type: 'armor' },
    { name: 'Recon Armor', type: 'armor' },
    { name: 'Riot Gear', type: 'armor' },
    { name: 'Stealth Suit Mk II', type: 'armor' },
    { name: 'Van Graff Combat Armor', type: 'armor' },
    // ── ARMOR: Heavy / Power ─────────────────────────────────────────────────
    { name: '1st Recon Assault Armor', type: 'armor' },
    { name: '1st Recon Survival Armor', type: 'armor' },
    { name: 'Brotherhood T-45d Power Armor', type: 'armor' },
    { name: 'Brotherhood T-51b Power Armor', type: 'armor' },
    { name: 'Gecko-Backed Metal Armor', type: 'armor' },
    { name: "Legate's Armor", type: 'armor' },
    { name: 'Metal Armor', type: 'armor' },
    { name: 'Metal Armor, Reinforced', type: 'armor' },
    { name: 'NCR Salvaged Power Armor', type: 'armor' },
    { name: 'Remnants Power Armor', type: 'armor' },
    { name: 'Remnants Tesla Armor', type: 'armor' },
    { name: 'Scorched Sierra Power Armor', type: 'armor' },
    { name: 'T-45d Power Armor', type: 'armor' },
    { name: 'T-51b Power Armor', type: 'armor' },
    { name: 'Tesla Armor', type: 'armor' },

    // ── AID: Medical / Stimpaks ──────────────────────────────────────────────
    { name: 'Stimpak', type: 'aid' },
    { name: 'Super Stimpak', type: 'aid' },
    { name: 'Auto-Inject Stimpak', type: 'aid' },
    { name: 'Auto-Inject Super Stimpak', type: 'aid' },
    { name: "Doctor's Bag", type: 'aid' },
    { name: 'Healing Powder', type: 'aid' },
    { name: 'Healing Poultice', type: 'aid' },
    { name: 'Blood Pack', type: 'aid' },
    { name: 'Hydra', type: 'aid' },
    // ── AID: Chems / Drugs ───────────────────────────────────────────────────
    { name: 'Med-X', type: 'aid' },
    { name: 'Mentats', type: 'aid' },
    { name: 'Party Time Mentats', type: 'aid' },
    { name: 'Psycho', type: 'aid' },
    { name: 'Buffout', type: 'aid' },
    { name: 'Jet', type: 'aid' },
    { name: 'Ultrajet', type: 'aid' },
    { name: "Dixon's Jet", type: 'aid' },
    { name: 'Turbo', type: 'aid' },
    { name: 'Slasher', type: 'aid' },
    { name: 'Steady', type: 'aid' },
    { name: 'Rocket', type: 'aid' },
    { name: 'Fixer', type: 'aid' },
    { name: 'Antivenom', type: 'aid' },
    { name: 'Datura Antivenom', type: 'aid' },
    { name: 'Ant Nectar', type: 'aid' },
    { name: 'Fire Ant Nectar', type: 'aid' },
    { name: 'Ant Queen Pheromones', type: 'aid' },
    { name: 'Cateye', type: 'aid' },
    { name: 'Ghost Sight', type: 'aid' },
    { name: 'Rebound', type: 'aid' },
    { name: 'Coyote Tobacco Chew', type: 'aid' },
    { name: 'Datura Hide', type: 'aid' },
    { name: 'Blood Shield', type: 'aid' },
    { name: 'Rushing Water', type: 'aid' },
    { name: 'Snakebite Tourniquet', type: 'aid' },
    // ── AID: Rad / Water ─────────────────────────────────────────────────────
    { name: 'Rad-X', type: 'aid' },
    { name: 'RadAway', type: 'aid' },
    { name: 'Purified Water', type: 'aid' },
    { name: 'Dirty Water', type: 'aid' },
    { name: 'Irradiated Water', type: 'aid' },
    // ── AID: Food & Drinks ───────────────────────────────────────────────────
    { name: 'Nuka-Cola', type: 'aid' },
    { name: 'Nuka-Cola Quantum', type: 'aid' },
    { name: 'Nuka-Cola Quartz', type: 'aid' },
    { name: 'Nuka-Cola Victory', type: 'aid' },
    { name: 'Ice Cold Nuka-Cola', type: 'aid' },
    { name: 'Sunset Sarsaparilla', type: 'aid' },
    { name: 'Brahmin Meat', type: 'aid' },
    { name: 'Coyote Meat', type: 'aid' },
    { name: 'Dog Meat', type: 'aid' },
    { name: 'Bighorner Meat', type: 'aid' },
    { name: 'BlamCo Mac & Cheese', type: 'aid' },
    { name: 'Cram', type: 'aid' },
    { name: 'Dandy Boy Apples', type: 'aid' },
    { name: 'Fancy Lads Snack Cakes', type: 'aid' },
    { name: 'InstaMash', type: 'aid' },
    { name: "Pork N' Beans", type: 'aid' },
    { name: 'Sugar Bombs', type: 'aid' },
    { name: 'YumYum Deviled Eggs', type: 'aid' },
    { name: 'MRE', type: 'aid' },
    // ── AID: Alcohol ─────────────────────────────────────────────────────────
    { name: 'Beer', type: 'aid' },
    { name: 'Whiskey', type: 'aid' },
    { name: 'Vodka', type: 'aid' },
    { name: 'Scotch', type: 'aid' },
    { name: 'Absinthe', type: 'aid' },
    { name: 'Atomic Cocktail', type: 'aid' },
    { name: 'Moonshine', type: 'aid' },
    { name: 'Wine', type: 'aid' },
    { name: 'Rum & Nuka', type: 'aid' },
    { name: 'Battle Brew', type: 'aid' },
    { name: 'Sierra Madre Martini', type: 'aid' },

    // ── AMMO ─────────────────────────────────────────────────────────────────
    { name: '.357 Magnum Round', type: 'ammo' },
    { name: '.44 Magnum Round', type: 'ammo' },
    { name: '.45 Auto', type: 'ammo' },
    { name: ".45-70 Gov't", type: 'ammo' },
    { name: '.50 MG', type: 'ammo' },
    { name: '10mm Round', type: 'ammo' },
    { name: '12.7mm Round', type: 'ammo' },
    { name: '20 Gauge Round', type: 'ammo' },
    { name: '5.56mm Round', type: 'ammo' },
    { name: '5mm Round', type: 'ammo' },
    { name: '9mm Round', type: 'ammo' },
    { name: '.308 Round', type: 'ammo' },
    { name: '.22LR Round', type: 'ammo' },
    { name: '12 Gauge Round', type: 'ammo' },
    { name: 'BB', type: 'ammo' },
    { name: 'Microfusion Cell', type: 'ammo' },
    { name: 'Energy Cell', type: 'ammo' },
    { name: 'Electron Charge Pack', type: 'ammo' },
    { name: 'Alien Power Cell', type: 'ammo' },
    { name: 'Flamer Fuel', type: 'ammo' },
    { name: 'Rockets', type: 'ammo' },
    { name: 'Nails', type: 'ammo' },
    { name: 'Mini Nuke', type: 'ammo' },

    // ── MISC ──────────────────────────────────────────────────────────────────
    { name: 'Stealth Boy', type: 'misc' },
    { name: 'Weapon Repair Kit', type: 'misc' },
    { name: 'Bottle Cap', type: 'misc' },
    { name: 'Sunset Sarsaparilla Star Bottle Cap', type: 'misc' },
    { name: 'Scrap Metal', type: 'misc' },
    { name: 'Scrap Electronics', type: 'misc' },
    { name: 'Sensor Module', type: 'misc' },
    { name: "Dean's Electronics", type: 'misc' },
    { name: "Programmer's Digest", type: 'misc' },
    { name: 'Leather Belt', type: 'misc' },
    { name: 'Tin Can', type: 'misc' },
    { name: 'Wonderglue', type: 'misc' },
    // Caravan game items — FNV-specific playing card mechanic
    // Source: https://fallout.wiki/wiki/Caravan_(game)
    { name: 'Caravan Deck', type: 'misc' },
    { name: 'Caravan Card', type: 'misc' },
  ],

  // ── PERKS ──────────────────────────────────────────────────────────────────
  // type:  'regular' | 'companion' | 'challenge' | 'special'
  // level: minimum level requirement (integer; 0 for non-level-gated perks)
  // Data source: https://fallout.wiki/wiki/Fallout:_New_Vegas_perks
  perks: [
    // ── Regular Perks (level-gated) ───────────────────────────────────
    { name: 'Intense Training', type: 'regular', level: 2 },
    { name: 'Lady Killer', type: 'regular', level: 2 },
    { name: 'Black Widow', type: 'regular', level: 2 },
    { name: 'Confirmed Bachelor', type: 'regular', level: 2 },
    { name: 'Cherchez La Femme', type: 'regular', level: 2 },
    { name: 'Swift Learner', type: 'regular', level: 2 },
    { name: 'Retention', type: 'regular', level: 2 },
    { name: 'Hunter', type: 'regular', level: 2 },
    { name: 'Rapid Reload', type: 'regular', level: 2 },
    { name: 'Friend of the Night', type: 'regular', level: 2 },
    { name: 'Heave Ho!', type: 'regular', level: 2 },
    { name: 'Educated', type: 'regular', level: 4 },
    { name: 'Entomologist', type: 'regular', level: 4 },
    { name: 'Cannibal', type: 'regular', level: 4 },
    { name: "Run 'n Gun", type: 'regular', level: 4 },
    { name: 'Comprehension', type: 'regular', level: 4 },
    { name: 'Rad Child', type: 'regular', level: 4 },
    { name: 'Travel Light', type: 'regular', level: 4 },
    { name: 'Hand Loader', type: 'regular', level: 6 },
    { name: 'Fortune Finder', type: 'regular', level: 6 },
    { name: 'Vigilant Recycler', type: 'regular', level: 6 },
    { name: 'Shotgun Surgeon', type: 'regular', level: 6 },
    { name: 'Lead Belly', type: 'regular', level: 6 },
    { name: 'Ferocious Loyalty', type: 'regular', level: 6 },
    { name: 'Gunslinger', type: 'regular', level: 6 },
    { name: 'Demolition Expert', type: 'regular', level: 6 },
    { name: 'Bloody Mess', type: 'regular', level: 6 },
    { name: 'Toughness', type: 'regular', level: 6 },
    { name: 'Mad Bomber', type: 'regular', level: 6 },
    { name: 'The Professional', type: 'regular', level: 6 },
    { name: 'Scrounger', type: 'regular', level: 8 },
    { name: 'Sneering Imperialist', type: 'regular', level: 8 },
    { name: 'Quick Draw', type: 'regular', level: 8 },
    { name: 'Home on the Range', type: 'regular', level: 8 },
    { name: 'Tribal Wisdom', type: 'regular', level: 8 },
    { name: 'Pack Rat', type: 'regular', level: 8 },
    { name: 'Stonewall', type: 'regular', level: 8 },
    { name: 'Living Anatomy', type: 'regular', level: 8 },
    { name: 'Terrifying Presence', type: 'regular', level: 8 },
    { name: 'Commando', type: 'regular', level: 8 },
    { name: 'Cowboy', type: 'regular', level: 8 },
    { name: 'Super Slam', type: 'regular', level: 8 },
    { name: 'Strong Back', type: 'regular', level: 8 },
    { name: 'Rad Resistance', type: 'regular', level: 8 },
    { name: 'Grunt', type: 'regular', level: 8 },
    { name: 'Animal Friend', type: 'regular', level: 10 },
    { name: 'And Stay Back', type: 'regular', level: 10 },
    { name: 'Night Person', type: 'regular', level: 10 },
    { name: 'Miss Fortune', type: 'regular', level: 10 },
    { name: 'Fight the Power!', type: 'regular', level: 10 },
    { name: 'Math Wrath', type: 'regular', level: 10 },
    { name: 'Plasma Spaz', type: 'regular', level: 10 },
    { name: 'Finesse', type: 'regular', level: 10 },
    { name: 'Mister Sandman', type: 'regular', level: 10 },
    { name: 'Mysterious Stranger', type: 'regular', level: 10 },
    { name: 'Here and Now', type: 'regular', level: 10 },
    { name: 'Nerd Rage!', type: 'regular', level: 10 },
    { name: 'Robotics Expert', type: 'regular', level: 12 },
    { name: 'Piercing Strike', type: 'regular', level: 12 },
    { name: 'Life Giver', type: 'regular', level: 12 },
    { name: 'Long Haul', type: 'regular', level: 12 },
    { name: 'Heavyweight', type: 'regular', level: 12 },
    { name: 'Alertness', type: 'regular', level: 12 },
    { name: 'Unstoppable Force', type: 'regular', level: 12 },
    { name: 'Fast Metabolism', type: 'regular', level: 12 },
    { name: 'Ghastly Scavenger', type: 'regular', level: 12 },
    { name: 'Pyromaniac', type: 'regular', level: 12 },
    { name: 'Hit the Deck', type: 'regular', level: 12 },
    { name: 'Hobbler', type: 'regular', level: 12 },
    { name: 'Splash Damage', type: 'regular', level: 12 },
    { name: 'Sniper', type: 'regular', level: 12 },
    { name: 'Silent Running', type: 'regular', level: 12 },
    { name: 'Light Step', type: 'regular', level: 14 },
    { name: 'Chemist', type: 'regular', level: 14 },
    { name: 'Center of Mass', type: 'regular', level: 14 },
    { name: 'Jury Rigging', type: 'regular', level: 14 },
    { name: 'Adamantium Skeleton', type: 'regular', level: 14 },
    { name: 'Purifier', type: 'regular', level: 14 },
    { name: 'Tag!', type: 'regular', level: 16 },
    { name: 'Action Boy', type: 'regular', level: 16 },
    { name: 'Action Girl', type: 'regular', level: 16 },
    { name: 'Weapon Handling', type: 'regular', level: 16 },
    { name: 'Better Criticals', type: 'regular', level: 16 },
    { name: 'Chem Resistant', type: 'regular', level: 16 },
    { name: 'Meltdown', type: 'regular', level: 16 },
    { name: 'Infiltrator', type: 'regular', level: 18 },
    { name: 'Walker Instinct', type: 'regular', level: 18 },
    { name: 'Computer Whiz', type: 'regular', level: 18 },
    { name: 'Concentrated Fire', type: 'regular', level: 18 },
    { name: 'Paralyzing Palm', type: 'regular', level: 18 },
    { name: "Grim Reaper's Sprint", type: 'regular', level: 20 },
    { name: 'Explorer', type: 'regular', level: 20 },
    { name: 'Atomic!', type: 'regular', level: 20 },
    { name: 'Solar Powered', type: 'regular', level: 20 },
    { name: 'Ninja', type: 'regular', level: 20 },
    { name: "Them's Good Eatin'", type: 'regular', level: 20 },
    { name: 'Mile in Their Shoes', type: 'regular', level: 20 },
    { name: 'Eye for Eye', type: 'regular', level: 20 },
    { name: 'Nuka Chemist', type: 'regular', level: 22 },
    { name: 'Voracious Reader', type: 'regular', level: 22 },
    { name: 'Laser Commander', type: 'regular', level: 22 },
    { name: 'Irradiated Beauty', type: 'regular', level: 22 },
    { name: 'Spray and Pray', type: 'regular', level: 22 },
    { name: 'Slayer', type: 'regular', level: 24 },
    { name: 'Tunnel Runner', type: 'regular', level: 26 },
    { name: 'Lessons Learned', type: 'regular', level: 26 },
    { name: 'Nerves of Steel', type: 'regular', level: 26 },
    { name: "Roughin' It", type: 'regular', level: 28 },
    { name: 'Rad Absorption', type: 'regular', level: 28 },
    { name: 'Burden to Bear', type: 'regular', level: 30 },
    { name: 'Implant GRX', type: 'regular', level: 30 },
    { name: 'Broad Daylight', type: 'regular', level: 36 },
    { name: 'Certified Tech', type: 'regular', level: 40 },
    { name: "Just Lucky I'm Alive", type: 'regular', level: 50 },
    { name: 'Thought You Died', type: 'regular', level: 50 },
    { name: "Ain't Like That Now", type: 'regular', level: 50 },
    // ── Companion perks (granted by companions) ───────────────────────
    { name: 'Better Healing', type: 'companion', level: 0 },
    { name: 'Enhanced Sensors', type: 'companion', level: 0 },
    { name: 'Full Maintenance', type: 'companion', level: 0 },
    { name: 'Regular Maintenance', type: 'companion', level: 0 },
    { name: 'Scribe Assistant', type: 'companion', level: 0 },
    { name: 'Search and Mark', type: 'companion', level: 0 },
    { name: 'Spotter', type: 'companion', level: 0 },
    { name: 'Stealth Girl', type: 'companion', level: 0 },
    { name: 'Whiskey Rose', type: 'companion', level: 0 },
    // ── Challenge perks ───────────────────────────────────────────────
    { name: 'Abominable', type: 'challenge', level: 0 },
    { name: 'Animal Control', type: 'challenge', level: 0 },
    { name: 'Beautiful Beatdown', type: 'challenge', level: 0 },
    { name: 'Bug Stomper', type: 'challenge', level: 0 },
    { name: 'Camel of the Mojave', type: 'challenge', level: 0 },
    { name: 'Day Tripper', type: 'challenge', level: 0 },
    { name: 'Dine and Dash', type: 'challenge', level: 0 },
    { name: 'Fast Times', type: 'challenge', level: 0 },
    { name: 'Free Radical', type: 'challenge', level: 0 },
    { name: 'Friendly Help', type: 'challenge', level: 0 },
    { name: 'Lord Death', type: 'challenge', level: 0 },
    { name: 'Machine Head', type: 'challenge', level: 0 },
    { name: 'Melee Hacker', type: 'challenge', level: 0 },
    { name: 'Mutant Massacrer', type: 'challenge', level: 0 },
    { name: 'Set Lasers for Fun', type: 'challenge', level: 0 },
    { name: 'Tough Guy', type: 'challenge', level: 0 },
    // ── Special perks ─────────────────────────────────────────────────
    { name: 'Meat of Champions', type: 'special', level: 0 },
    { name: 'Power Armor Training', type: 'special', level: 0 },
    { name: 'Old World Gourmet', type: 'special', level: 0 },
    { name: 'Junk Rounds', type: 'special', level: 0 },
    { name: 'In Shining Armor', type: 'special', level: 0 },
  ],

  // ── LOCATIONS ──────────────────────────────────────────────────────────────
  // Curated list of named map markers from the Mojave Wasteland.
  // Internal sub-locations (rooms, corridors) excluded — only primary map markers.
  // type: 'settlement' | 'landmark' | 'vault' | 'camp' | 'cave' | 'base' |
  //        'casino' | 'factory' | 'other'
  // Data source: https://fallout.wiki/wiki/Fallout:_New_Vegas_locations
  locations: [
    { name: '188 Trading Post', type: 'settlement' },
    { name: 'Aerotech Office Park', type: 'settlement' },
    { name: 'Atomic Wrangler Casino', type: 'casino' },
    { name: 'Bitter Springs', type: 'camp' },
    { name: 'Black Mountain', type: 'landmark' },
    { name: 'Boulder City', type: 'settlement' },
    { name: 'Brotherhood of Steel Safehouse', type: 'other' },
    { name: "Caesar's Legion Safehouse", type: 'other' },
    { name: 'Callville Bay', type: 'landmark' },
    { name: 'Camp Forlorn Hope', type: 'camp' },
    { name: 'Camp Golf', type: 'camp' },
    { name: 'Camp Guardian', type: 'camp' },
    { name: 'Camp McCarran', type: 'base' },
    { name: 'Camp Searchlight', type: 'camp' },
    { name: "Cannibal Johnson's Cave", type: 'cave' },
    { name: 'Clark Field', type: 'landmark' },
    { name: 'Cottonwood Cove', type: 'settlement' },
    { name: 'Crashed B-29', type: 'landmark' },
    { name: 'Crimson Caravan Company', type: 'settlement' },
    { name: 'Dead Wind Cavern', type: 'cave' },
    { name: 'Deathclaw Promontory', type: 'landmark' },
    { name: 'East Pump Station', type: 'other' },
    { name: 'El Dorado Substation', type: 'other' },
    { name: 'Emergency Service Railyard', type: 'other' },
    { name: 'Followers Safehouse', type: 'other' },
    { name: 'Freeside', type: 'settlement' },
    { name: 'Gibson Scrap Yard', type: 'other' },
    { name: 'Gomorrah', type: 'casino' },
    { name: 'Goodsprings', type: 'settlement' },
    { name: 'Great Khan Encampment', type: 'camp' },
    { name: 'Gun Runners', type: 'factory' },
    { name: 'Gypsum Train Yard', type: 'other' },
    { name: 'H&H Tools Factory', type: 'factory' },
    { name: 'HELIOS One', type: 'landmark' },
    { name: 'Hidden Valley Bunker', type: 'base' },
    { name: 'Hoover Dam', type: 'landmark' },
    { name: 'Jacobstown', type: 'settlement' },
    { name: "King's School of Impersonation", type: 'settlement' },
    { name: 'Lake Mead', type: 'landmark' },
    { name: 'Lake Mead Cave', type: 'cave' },
    { name: "Legate's Camp", type: 'camp' },
    { name: 'Lucky 38', type: 'casino' },
    { name: "Michael Angelo's Workshop", type: 'other' },
    { name: "Mick & Ralph's", type: 'settlement' },
    { name: 'Mojave Drive-in', type: 'landmark' },
    { name: 'Mojave Outpost', type: 'camp' },
    { name: 'NCR Correctional Facility', type: 'base' },
    { name: 'NCR Embassy', type: 'settlement' },
    { name: 'NCR Ranger Safehouse', type: 'other' },
    { name: 'NCR Sharecropper Farms', type: 'settlement' },
    { name: 'Nellis Air Force Base', type: 'base' },
    { name: 'Nellis Array', type: 'other' },
    { name: 'Nelson', type: 'settlement' },
    { name: 'Nevada Highway Patrol Station', type: 'other' },
    { name: 'New Vegas Medical Clinic', type: 'settlement' },
    { name: 'New Vegas Steel', type: 'factory' },
    { name: 'New Vegas Strip', type: 'settlement' },
    { name: 'Nipton', type: 'settlement' },
    { name: 'Novac', type: 'settlement' },
    { name: 'Old Mormon Fort', type: 'settlement' },
    { name: 'Old Nuclear Test Site', type: 'landmark' },
    { name: 'Primm', type: 'settlement' },
    { name: 'Quarry Junction', type: 'landmark' },
    { name: 'Red Rock Canyon', type: 'landmark' },
    { name: 'Remnants Bunker', type: 'base' },
    { name: 'REPCONN Headquarters', type: 'factory' },
    { name: 'REPCONN Test Site', type: 'other' },
    { name: 'Silver Rush', type: 'settlement' },
    { name: 'Sloan', type: 'settlement' },
    { name: "Sniper's Nest", type: 'landmark' },
    { name: 'Spring Mt. Ranch State Park', type: 'landmark' },
    { name: 'Sunset Sarsaparilla Headquarters', type: 'factory' },
    { name: 'Techatticup Mine', type: 'other' },
    { name: 'The Fort', type: 'base' },
    { name: 'The Thorn', type: 'other' },
    { name: 'The Tops', type: 'casino' },
    { name: 'The Ultra-Luxe', type: 'casino' },
    { name: 'Vault 3', type: 'vault' },
    { name: 'Vault 11', type: 'vault' },
    { name: 'Vault 19', type: 'vault' },
    { name: 'Vault 21', type: 'vault' },
    { name: 'Vault 22', type: 'vault' },
    { name: 'Vault 34', type: 'vault' },
    { name: 'West Pump Station', type: 'other' },
    { name: 'Westside', type: 'settlement' },
    { name: 'Yangtze Memorial', type: 'landmark' },
  ],

  // ── COMPANIONS ─────────────────────────────────────────────────────────────
  // 8 humanoid permanent companions + 2 non-humanoid.
  // fields: name, fullName (canonical), location (where to find them)
  // Data source: https://fallout.wiki/wiki/Fallout:_New_Vegas_companions
  companions: [
    // ── Humanoid ──────────────────────────────────────────────────────
    {
      name: 'Arcade Gannon',
      fullName: 'Arcade Israel Gannon',
      location: 'Old Mormon Fort, Freeside',
    },
    {
      name: 'Boone',
      fullName: 'Craig Boone',
      location: 'Novac (dinosaur lookout, night only)',
    },
    {
      name: 'Cass',
      fullName: 'Rose of Sharon Cassidy',
      location: 'Mojave Outpost',
    },
    {
      name: 'Lily',
      fullName: 'Lily Bowen',
      location: 'Jacobstown',
    },
    {
      name: 'Raul',
      fullName: 'Raul Alfonso Tejada',
      location: 'Black Mountain',
    },
    {
      name: 'Veronica',
      fullName: 'Veronica Santangelo',
      location: '188 Trading Post',
    },
    // ── Non-humanoid ──────────────────────────────────────────────────
    {
      name: 'ED-E',
      fullName: 'Eyebot Duraframe Subject E',
      location: 'Primm (Nash Residence / Mojave Express)',
    },
    {
      name: 'Rex',
      fullName: 'Rex',
      location: "Freeside (The King's)",
    },
  ],

  // ── COLLECTIBLES ────────────────────────────────────────────────────────────
  // FNV: 7 Snow Globes. Turned in to Jane at Lucky 38 for 2000 caps each.
  // fields: name (registry key stored in state.collectibles), stat (reward type),
  //         boost (reward amount), location (canonical display string — CAPS, terse)
  // Data source: https://fallout.wiki/wiki/Snow_globe
  collectibles: [
    { name: 'Goodsprings', stat: 'caps', boost: 2000, location: 'GOODSPRINGS CEMETERY' },
    { name: 'Hoover Dam', stat: 'caps', boost: 2000, location: 'HOOVER DAM VISITOR CENTER' },
    { name: 'Lucky 38', stat: 'caps', boost: 2000, location: 'LUCKY 38 CASINO (VIP LOUNGE)' },
    {
      name: 'Mormon Fort',
      stat: 'caps',
      boost: 2000,
      location: "OLD MORMON FORT (JULIE FARKAS' OFFICE)",
    },
    { name: 'Mt. Charleston', stat: 'caps', boost: 2000, location: 'JACOBSTOWN' },
    { name: 'Nellis AFB', stat: 'caps', boost: 2000, location: 'NELLIS AIR FORCE BASE' },
    { name: 'Test Site', stat: 'caps', boost: 2000, location: 'CRESCENT CANYON WEST' },
  ],

  // ── ZONES ───────────────────────────────────────────────────────────────────
  // 6×6 grid covering the Mojave Wasteland. N→S = row 1→6. W→E = col 1→6.
  // locations[]: primary named map markers in that cell, used for fuzzy loc matching.
  // Used by renderWorldMap() to place the [YOU] cursor and [?] collectible markers.
  zones: [
    // Row 1 — Northern strip
    {
      name: 'Jacobstown',
      gridRow: 1,
      gridCol: 1,
      locations: ['Jacobstown', 'Charleston Cave', 'Dead Wind Cavern'],
    },
    {
      name: 'Bitter Springs',
      gridRow: 1,
      gridCol: 2,
      locations: ['Bitter Springs', 'Coyote Mines', 'Ranger Station Foxtrot'],
    },
    {
      name: 'Camp Golf',
      gridRow: 1,
      gridCol: 3,
      locations: ['Camp Golf', 'Lake Las Vegas', 'The Divide (entrance)'],
    },
    {
      name: 'Boulder City',
      gridRow: 1,
      gridCol: 4,
      locations: ['Boulder City', 'Boulder City Ruins', 'Ranger Station Charlie'],
    },
    {
      name: 'Hoover Dam',
      gridRow: 1,
      gridCol: 5,
      locations: ['Hoover Dam', 'Hoover Dam Visitor Center', 'Camp Golf South'],
    },
    {
      name: 'Camp Forlorn Hope',
      gridRow: 1,
      gridCol: 6,
      locations: ['Camp Forlorn Hope', 'Nelson', 'Cottonwood Cove'],
    },
    // Row 2 — Upper middle
    {
      name: 'Red Rock Canyon',
      gridRow: 2,
      gridCol: 1,
      locations: ['Red Rock Canyon', 'Vault 19', 'Great Khan Encampment'],
    },
    {
      name: 'Hidden Valley',
      gridRow: 2,
      gridCol: 2,
      locations: ['Hidden Valley Bunker', 'Black Mountain', 'REPCONN Test Site'],
    },
    {
      name: 'North Vegas',
      gridRow: 2,
      gridCol: 3,
      locations: ['North Vegas Square', 'Aerotech Office Park', 'Crimson Caravan Company'],
    },
    {
      name: 'Nellis AFB',
      gridRow: 2,
      gridCol: 4,
      locations: ['Nellis Air Force Base', 'Nellis Boomer Museum', 'Crashed B-29'],
    },
    {
      name: 'Lake Mead',
      gridRow: 2,
      gridCol: 5,
      locations: ['Lake Mead', 'Callville Bay', 'Ranger Station Echo'],
    },
    {
      name: 'Cottonwood Cove',
      gridRow: 2,
      gridCol: 6,
      locations: ['Cottonwood Cove', 'Ranger Station Delta', 'East Pump Station'],
    },
    // Row 3 — Vegas core
    {
      name: 'Freeside',
      gridRow: 3,
      gridCol: 1,
      locations: ['Freeside', 'Old Mormon Fort', 'Mormon Fort', 'The Kings'],
    },
    {
      name: 'New Vegas Strip',
      gridRow: 3,
      gridCol: 2,
      locations: ['The Strip', 'Lucky 38', 'Gomorrah', 'Tops', 'Ultra-Luxe', 'Vault 21'],
    },
    {
      name: 'East Vegas',
      gridRow: 3,
      gridCol: 3,
      locations: ['East Vegas', 'North Gate', 'Camp McCarran', 'Gun Runners'],
    },
    {
      name: 'Camp McCarran',
      gridRow: 3,
      gridCol: 4,
      locations: ['Camp McCarran', 'HELIOS One', 'El Dorado Substation'],
    },
    {
      name: 'Camp Searchlight',
      gridRow: 3,
      gridCol: 5,
      locations: ['Camp Searchlight', 'Searchlight', 'Ranger Station Bravo'],
    },
    {
      name: 'Nipton',
      gridRow: 3,
      gridCol: 6,
      locations: ['Nipton', 'Nipton Road Reststop', 'Mojave Drive-In'],
    },
    // Row 4 — Goodsprings belt
    {
      name: 'NCRCF',
      gridRow: 4,
      gridCol: 1,
      locations: ['NCR Correctional Facility', 'NCRCF', 'Powder Gangers'],
    },
    {
      name: 'Goodsprings',
      gridRow: 4,
      gridCol: 2,
      locations: ['Goodsprings', 'Goodsprings Cemetery', 'Goodsprings Source'],
    },
    {
      name: 'Primm',
      gridRow: 4,
      gridCol: 3,
      locations: ['Primm', 'Bison Steve Hotel', 'Vikki and Vance Casino'],
    },
    {
      name: '188 Trading Post',
      gridRow: 4,
      gridCol: 4,
      locations: ['188 Trading Post', 'Mountain Shadows Campground'],
    },
    {
      name: 'Novac',
      gridRow: 4,
      gridCol: 5,
      locations: ['Novac', 'Dinky the T-Rex', 'REPCONN Test Site'],
    },
    {
      name: 'Ranger Station Alpha',
      gridRow: 4,
      gridCol: 6,
      locations: ['Ranger Station Alpha', 'Ivanpah Dry Lake', 'Mojave Outpost'],
    },
    // Row 5 — Southern mid
    {
      name: 'Sloan',
      gridRow: 5,
      gridCol: 1,
      locations: ['Sloan', 'Quarry Junction', 'Deathclaw Promontory'],
    },
    {
      name: 'Mojave Outpost',
      gridRow: 5,
      gridCol: 2,
      locations: ['Mojave Outpost', 'Yangtze Memorial', 'Mountain Shadows'],
    },
    {
      name: 'Crescent Canyon',
      gridRow: 5,
      gridCol: 3,
      locations: ['Crescent Canyon', 'Crescent Canyon West', 'Test Site', 'Nevada Test Site'],
    },
    {
      name: 'Ranger Station Foxtrot',
      gridRow: 5,
      gridCol: 4,
      locations: ['Ranger Station Foxtrot', 'El Dorado', 'Gypsum Train Yard'],
    },
    {
      name: 'Clark Field',
      gridRow: 5,
      gridCol: 5,
      locations: ['Clark Field', 'Ranger Station Echo South', 'Wolfhorn Ranch'],
    },
    {
      name: 'Long 15',
      gridRow: 5,
      gridCol: 6,
      locations: ['Long 15', 'South Vegas Ruins', 'Emergency Service Railyard'],
    },
    // Row 6 — Far south / edge
    {
      name: 'Vault 11',
      gridRow: 6,
      gridCol: 1,
      locations: ['Vault 11', 'Vault 19', 'Canyon Wreckage'],
    },
    {
      name: 'Searchlight Airport',
      gridRow: 6,
      gridCol: 2,
      locations: ['Searchlight Airport', 'Campo Mine', "Field's Shack"],
    },
    {
      name: 'Jacobstown South',
      gridRow: 6,
      gridCol: 3,
      locations: ['Jacobstown', 'Mount Charleston', 'Charleston Cave South'],
    },
    {
      name: 'Nelson',
      gridRow: 6,
      gridCol: 4,
      locations: ['Nelson', 'Dead Wind Cavern South', 'Techatticup Mine'],
    },
    {
      name: 'Bitter Lake',
      gridRow: 6,
      gridCol: 5,
      locations: ['Bitter Lake', "Cannibal Johnson's Cave", 'Ranger Station Bravo South'],
    },
    {
      name: 'Fortification Hill',
      gridRow: 6,
      gridCol: 6,
      locations: ['The Fort', 'Fortification Hill', "Caesar's Camp"],
    },
  ],
};

// ── REGISTRY SEARCH ──────────────────────────────────────────────────────────
/**
 * Search the Fallout Registry for entries matching a query string.
 *
 * Contract (locked — see ARCHITECTURE.md):
 * @param {string} category - One of: 'quests' | 'items' | 'perks' | 'locations' | 'companions'
 * @param {string} query    - User input string. Case-insensitive.
 * @returns {Array<Object>} Up to 7 results sorted by relevance:
 *   1. Name starts with query (prefix match)       — score 3
 *   2. A word in name starts with query             — score 2
 *   3. Name contains query anywhere (substring)    — score 1
 *   Returns [] if query < 2 chars or category unknown or no matches.
 *
 * Design notes:
 *   - No fuzzy matching. Results are deterministic and predictable.
 *   - No debouncing here — callers are responsible for debouncing.
 *   - Empty query always returns [].
 *   - Max 7 results — UI panel is designed around this limit.
 *   - Min 2 chars — prevents showing the entire list on single keystrokes.
 */
function registrySearch(category, query) {
  if (!query || query.length < 2) return [];

  const entries = FALLOUT_REGISTRY[category];
  if (!entries || !Array.isArray(entries) || entries.length === 0) return [];

  const q = query.toLowerCase();

  const scored = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const nameLower = (entry.name || '').toLowerCase();
    let score = 0;

    if (nameLower.startsWith(q)) {
      score = 3;
    } else {
      // Word-boundary match: any word in name starts with query
      const words = nameLower.split(/[\s\-']+/);
      for (let w = 0; w < words.length; w++) {
        if (words[w].startsWith(q)) {
          score = 2;
          break;
        }
      }
      // Substring match (weakest signal)
      if (score === 0 && nameLower.includes(q)) {
        score = 1;
      }
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  // Sort: by score descending, then alphabetically by name
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.entry.name || '').localeCompare(b.entry.name || '');
  });

  // Return top 7 entry objects
  return scored.slice(0, 7).map(s => s.entry);
}
