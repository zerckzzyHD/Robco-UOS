/* exported FALLOUT_REGISTRY, registrySearch */
// ── FALLOUT 3 DATA REGISTRY ──────────────────────────────────────────────────
// Canonical reference data for autocomplete and validation.
// Source: Independent Fallout Wiki (https://fallout.wiki) — CC-BY-SA 3.0
//
// IMPORTANT: This is READ-ONLY reference data.
//   - It does NOT affect state, saves, localStorage, or cloud sync.
//   - It is NOT part of the persistence audit (not serialised).
//   - Loaded instead of reg_nv.js when state.gameContext === 'FO3'.
//
// Schema mirrors reg_nv.js exactly. Same category keys.
// ─────────────────────────────────────────────────────────────────────────────

const FALLOUT_REGISTRY = {
  version: '2.0.0-fo3',

  // ── QUESTS ─────────────────────────────────────────────────────────────────
  // Data source: https://fallout.wiki/wiki/Fallout_3_quests
  quests: [
    // ── Tutorial ──────────────────────────────────────────────────────
    { name: 'Baby Steps', type: 'tutorial', dlc: null },
    { name: 'Growing Up Fast', type: 'tutorial', dlc: null },
    { name: 'Escape!', type: 'tutorial', dlc: null },

    // ── Main Quest ─────────────────────────────────────────────────────
    { name: 'Following in His Footsteps', type: 'main', dlc: null },
    { name: 'Galaxy News Radio', type: 'main', dlc: null },
    { name: 'Scientific Pursuits', type: 'main', dlc: null },
    { name: 'Tranquility Lane', type: 'main', dlc: null },
    { name: 'The Waters of Life', type: 'main', dlc: null },
    { name: 'Picking Up the Trail', type: 'main', dlc: null },
    { name: 'Finding the Garden of Eden', type: 'main', dlc: null },
    { name: 'The American Dream', type: 'main', dlc: null },
    { name: 'Take it Back!', type: 'main', dlc: null },

    // ── Side ───────────────────────────────────────────────────────────
    { name: "Agatha's Song", type: 'side', dlc: null },
    { name: 'A Return to Rivet City', type: 'side', dlc: null },
    { name: 'Blood Ties', type: 'side', dlc: null },
    { name: 'Oasis', type: 'side', dlc: null },
    { name: 'The Power of the Atom', type: 'side', dlc: null },
    { name: 'Tenpenny Tower', type: 'side', dlc: null },
    { name: 'The Superhuman Gambit', type: 'side', dlc: null },
    { name: 'The Wasteland Survival Guide', type: 'side', dlc: null },
    { name: 'Those!', type: 'side', dlc: null },
    { name: 'The Big Score', type: 'side', dlc: null },
    { name: 'Stealing Independence', type: 'side', dlc: null },
    { name: 'Trouble on the Homefront', type: 'side', dlc: null },
    { name: "Reilly's Rangers", type: 'side', dlc: null },
    { name: 'Head of State', type: 'side', dlc: null },
    { name: 'The Replicated Man', type: 'side', dlc: null },
    { name: 'Strictly Business', type: 'side', dlc: null },
    { name: "You Gotta Shoot 'Em in the Head", type: 'side', dlc: null },
    { name: 'Rescue from Paradise', type: 'side', dlc: null },
    { name: 'Strictly Business', type: 'side', dlc: null },
    { name: 'The Nuka-Cola Challenge', type: 'side', dlc: null },
    { name: "Jiggs' Loot", type: 'side', dlc: null },
    { name: 'Searching for Cheryl', type: 'side', dlc: null },
    { name: 'I Want to Drink Your Blood', type: 'side', dlc: null },
    { name: 'Strictly Business (Paradise Falls)', type: 'side', dlc: null },
    { name: "Lincoln's Profit Margins", type: 'side', dlc: null },
    { name: "Lesko's Journal", type: 'side', dlc: null },
    { name: 'Fires of Anchorage', type: 'side', dlc: null },

    // ── Companion ──────────────────────────────────────────────────────
    { name: 'Dogmeat Quest (no name)', type: 'companion', dlc: null },

    // ── Unmarked ───────────────────────────────────────────────────────
    { name: 'Merchant Empire', type: 'unmarked', dlc: null },
    { name: 'A Suit No One Wants', type: 'unmarked', dlc: null },
    { name: 'An Antique Land', type: 'unmarked', dlc: null },
    { name: 'Knowledge of the Past', type: 'unmarked', dlc: null },
  ],

  // ── ITEMS ──────────────────────────────────────────────────────────────────
  // Data source: https://fallout.wiki/wiki/Fallout_3_items
  items: [
    // ── GUNS: Pistols ─────────────────────────────────────────────────
    { name: '10mm Pistol', type: 'weapon' },
    { name: '.32 Pistol', type: 'weapon' },
    { name: 'Scoped .44 Magnum', type: 'weapon' },
    { name: 'Blackhawk', type: 'weapon' },
    { name: "Colonel Autumn's 10mm Pistol", type: 'weapon' },
    { name: 'Alien Blaster', type: 'weapon' },
    { name: 'Firelance', type: 'weapon' },
    // ── GUNS: Rifles / SMGs ───────────────────────────────────────────
    { name: 'Hunting Rifle', type: 'weapon' },
    { name: 'Chinese Assault Rifle', type: 'weapon' },
    { name: 'Assault Rifle', type: 'weapon' },
    { name: 'Sniper Rifle', type: 'weapon' },
    { name: 'Victory Rifle', type: 'weapon' },
    { name: "Lincoln's Repeater", type: 'weapon' },
    { name: 'Xuanlong Assault Rifle', type: 'weapon' },
    { name: "Sydney's 10mm Ultra SMG", type: 'weapon' },
    { name: '10mm Submachine Gun', type: 'weapon' },
    // ── GUNS: Shotguns ────────────────────────────────────────────────
    { name: 'Combat Shotgun', type: 'weapon' },
    { name: 'The Terrible Shotgun', type: 'weapon' },
    // ── ENERGY: Pistols ───────────────────────────────────────────────
    { name: 'Laser Pistol', type: 'weapon' },
    { name: 'Plasma Pistol', type: 'weapon' },
    // ── ENERGY: Rifles ────────────────────────────────────────────────
    { name: 'Laser Rifle', type: 'weapon' },
    { name: 'Plasma Rifle', type: 'weapon' },
    { name: 'A3-21 Plasma Rifle', type: 'weapon' },
    { name: 'Gatling Laser', type: 'weapon' },
    // ── HEAVY ─────────────────────────────────────────────────────────
    { name: 'Minigun', type: 'weapon' },
    { name: 'Missile Launcher', type: 'weapon' },
    { name: 'Fat Man', type: 'weapon' },
    { name: 'Flamer', type: 'weapon' },
    { name: 'Heavy Incinerator', type: 'weapon' },
    { name: 'Mesmetron', type: 'weapon' },
    { name: 'Rock-It Launcher', type: 'weapon' },
    // ── EXPLOSIVES ────────────────────────────────────────────────────
    { name: 'Frag Grenade', type: 'weapon' },
    { name: 'Plasma Grenade', type: 'weapon' },
    { name: 'Pulse Grenade', type: 'weapon' },
    { name: 'Bottlecap Mine', type: 'weapon' },
    { name: 'Frag Mine', type: 'weapon' },
    { name: 'Nuka Grenade', type: 'weapon' },
    { name: 'Tin Grenade', type: 'weapon' },
    // ── MELEE: Blunt ──────────────────────────────────────────────────
    { name: 'Baseball Bat', type: 'weapon' },
    { name: 'Sledgehammer', type: 'weapon' },
    { name: 'Super Sledge', type: 'weapon' },
    { name: 'Lead Pipe', type: 'weapon' },
    { name: 'Tire Iron', type: 'weapon' },
    { name: 'Pool Cue', type: 'weapon' },
    { name: 'Rolling Pin', type: 'weapon' },
    { name: 'Golf Club', type: 'weapon' },
    { name: 'Nail Board', type: 'weapon' },
    { name: 'Board of Education', type: 'weapon' },
    { name: 'Bumper Sword', type: 'weapon' },
    { name: "O'cta Brain", type: 'weapon' },
    // ── MELEE: Bladed ─────────────────────────────────────────────────
    { name: 'Combat Knife', type: 'weapon' },
    { name: 'Switchblade', type: 'weapon' },
    { name: "Chinese Officer's Sword", type: 'weapon' },
    { name: 'Shishkebab', type: 'weapon' },
    { name: 'Ripper', type: 'weapon' },
    { name: 'Stabhappy', type: 'weapon' },
    { name: "Jingwei's Shocksword", type: 'weapon' },
    // ── UNARMED ───────────────────────────────────────────────────────
    { name: 'Brass Knuckles', type: 'weapon' },
    { name: 'Power Fist', type: 'weapon' },
    { name: 'The Mauler', type: 'weapon' },
    { name: 'Deathclaw Gauntlet', type: 'weapon' },
    { name: 'Dart Gun', type: 'weapon' },
    { name: 'Railway Rifle', type: 'weapon' },
    { name: 'Plunger', type: 'weapon' },
    // ── BASE GAME: Additional ─────────────────────────────────────────────────
    { name: 'Chinese Pistol', type: 'weapon' },
    { name: 'Silenced 10mm Pistol', type: 'weapon' },
    { name: 'BB Gun', type: 'weapon' },
    { name: "Reservist's Rifle", type: 'weapon' },
    { name: "Ol' Painless", type: 'weapon' },
    { name: 'Sawed-Off Shotgun', type: 'weapon' },
    { name: 'Eugene', type: 'weapon' },
    { name: 'Vengeance', type: 'weapon' },
    { name: 'Burnmaster', type: 'weapon' },
    { name: 'Experimental MIRV', type: 'weapon' },
    { name: 'Miss Launcher', type: 'weapon' },
    { name: 'Wazer Wifle', type: 'weapon' },
    { name: "Smuggler's End", type: 'weapon' },
    { name: 'The Break', type: 'weapon' },
    { name: 'Jack', type: 'weapon' },
    { name: "Highwayman's Friend", type: 'weapon' },
    { name: 'Fisto!', type: 'weapon' },
    { name: 'The Tenderizer', type: 'weapon' },
    { name: "Vampire's Edge", type: 'weapon' },
    { name: "Occam's Razor", type: 'weapon' },
    { name: "Ant's Sting", type: 'weapon' },
    { name: "Butch's Toothpick", type: 'weapon' },
    // ── OPERATION: ANCHORAGE ──────────────────────────────────────────────────
    { name: 'Gauss Rifle', type: 'weapon' },
    { name: 'Trench Knife', type: 'weapon' },
    // ── THE PITT ──────────────────────────────────────────────────────────────
    { name: 'Auto Axe', type: 'weapon' },
    { name: 'Man Opener', type: 'weapon' },
    { name: 'Steel Saw', type: 'weapon' },
    { name: 'Infiltrator', type: 'weapon' },
    { name: 'Perforator', type: 'weapon' },
    { name: "Wild Bill's Sidearm", type: 'weapon' },
    { name: 'Metal Blaster', type: 'weapon' },
    // ── BROKEN STEEL ──────────────────────────────────────────────────────────
    { name: 'Tri-beam Laser Rifle', type: 'weapon' },
    { name: "Callahan's Magnum", type: 'weapon' },
    { name: 'Precision Gatling Laser', type: 'weapon' },
    // ── POINT LOOKOUT ─────────────────────────────────────────────────────────
    { name: 'Lever-Action Rifle', type: 'weapon' },
    { name: 'Double-Barrel Shotgun', type: 'weapon' },
    { name: 'Backwater Rifle', type: 'weapon' },
    { name: 'The Dismemberer', type: 'weapon' },
    { name: 'Microwave Emitter', type: 'weapon' },
    { name: 'Axe', type: 'weapon' },
    { name: 'Fertilizer Shovel', type: 'weapon' },
    { name: 'Ritual Knife', type: 'weapon' },
    // ── MOTHERSHIP ZETA ───────────────────────────────────────────────────────
    { name: 'Alien Atomizer', type: 'weapon' },
    { name: 'Alien Disintegrator', type: 'weapon' },
    { name: 'Atomic Pulverizer', type: 'weapon' },
    { name: "Captain's Sidearm", type: 'weapon' },
    { name: 'Destabilizer', type: 'weapon' },
    { name: 'Drone Cannon', type: 'weapon' },
    { name: 'Drone Cannon Ex-B', type: 'weapon' },
    { name: 'Electro-Suppressor', type: 'weapon' },
    { name: 'Cryo Grenade', type: 'weapon' },
    { name: 'Cryo Mine', type: 'weapon' },

    // ── ARMOR ─────────────────────────────────────────────────────────
    { name: 'Vault 101 Jumpsuit', type: 'armor' },
    { name: 'Raider Armor', type: 'armor' },
    { name: 'Leather Armor', type: 'armor' },
    { name: 'Recon Armor', type: 'armor' },
    { name: 'Chinese Stealth Armor', type: 'armor' },
    { name: 'Combat Armor', type: 'armor' },
    { name: 'Talon Combat Armor', type: 'armor' },
    { name: 'Metal Armor', type: 'armor' },
    { name: 'T-45d Power Armor', type: 'armor' },
    { name: 'T-51b Power Armor', type: 'armor' },
    { name: 'Hellfire Power Armor', type: 'armor' },
    { name: 'Enclave Power Armor', type: 'armor' },
    { name: 'Tesla Armor', type: 'armor' },
    { name: "Lyons' Pride Armor", type: 'armor' },
    { name: 'Winterized T-51b Power Armor', type: 'armor' },
    { name: 'Brotherhood Power Armor', type: 'armor' },
    { name: 'Armored Vault 101 Jumpsuit', type: 'armor' },
    { name: 'Advanced Radiation Suit', type: 'armor' },
    { name: 'Naughty Nightwear', type: 'armor' },
    { name: 'Pre-War Business Wear', type: 'armor' },

    // ── AID ───────────────────────────────────────────────────────────
    { name: 'Stimpak', type: 'aid' },
    { name: 'Super Stimpak', type: 'aid' },
    { name: 'Med-X', type: 'aid' },
    { name: 'Psycho', type: 'aid' },
    { name: 'Buffout', type: 'aid' },
    { name: 'Mentats', type: 'aid' },
    { name: 'Jet', type: 'aid' },
    { name: 'Rad-X', type: 'aid' },
    { name: 'RadAway', type: 'aid' },
    { name: 'Antidote', type: 'aid' },
    { name: 'Blood Pack', type: 'aid' },
    { name: "Doctor's Bag", type: 'aid' },
    { name: 'Nuka-Cola', type: 'aid' },
    { name: 'Nuka-Cola Quantum', type: 'aid' },
    { name: 'Purified Water', type: 'aid' },
    { name: 'Dirty Water', type: 'aid' },
    { name: 'Brahmin Meat', type: 'aid' },
    { name: 'Cram', type: 'aid' },
    { name: 'Fancy Lads Snack Cakes', type: 'aid' },
    { name: 'Sugar Bombs', type: 'aid' },
    { name: 'Dandy Boy Apples', type: 'aid' },
    { name: 'InstaMash', type: 'aid' },
    { name: "Pork N' Beans", type: 'aid' },
    { name: 'Beer', type: 'aid' },
    { name: 'Wine', type: 'aid' },
    { name: 'Scotch', type: 'aid' },
    { name: 'Whiskey', type: 'aid' },

    // ── AMMO ──────────────────────────────────────────────────────────
    { name: '10mm Round', type: 'ammo' },
    { name: '.32 Caliber Round', type: 'ammo' },
    { name: '.44 Magnum Round', type: 'ammo' },
    { name: '5.56mm Round', type: 'ammo' },
    { name: '.308 Caliber Round', type: 'ammo' },
    { name: 'Shotgun Shell', type: 'ammo' },
    { name: '5mm Round', type: 'ammo' },
    { name: 'Microfusion Cell', type: 'ammo' },
    { name: 'Energy Cell', type: 'ammo' },
    { name: 'Electron Charge Pack', type: 'ammo' },
    { name: 'Flamer Fuel', type: 'ammo' },
    { name: 'Missile', type: 'ammo' },
    { name: 'Mini Nuke', type: 'ammo' },
    { name: 'Alien Power Cell', type: 'ammo' },
    { name: 'Alien Power Module', type: 'ammo' },
    { name: 'Mesmetron Power Cell', type: 'ammo' },
    { name: 'Dart', type: 'ammo' },
    { name: 'Railway Spike', type: 'ammo' },
    { name: 'BB', type: 'ammo' },

    // ── MISC ──────────────────────────────────────────────────────────
    { name: 'Stealth Boy', type: 'misc' },
    { name: 'Scrap Metal', type: 'misc' },
    { name: 'Pre-War Money', type: 'misc' },
    { name: 'Sensor Module', type: 'misc' },
    { name: 'Bottle Cap', type: 'misc' },
  ],

  // ── PERKS ──────────────────────────────────────────────────────────────────
  // Data source: https://fallout.wiki/wiki/Fallout_3_perks
  perks: [
    // ── Regular Perks ─────────────────────────────────────────────────
    { name: 'Black Widow', type: 'regular', level: 2 },
    { name: 'Lady Killer', type: 'regular', level: 2 },
    { name: 'Confirmed Bachelor', type: 'regular', level: 2 },
    { name: 'Cherchez La Femme', type: 'regular', level: 2 },
    { name: 'Child at Heart', type: 'regular', level: 2 },
    { name: 'Entomologist', type: 'regular', level: 2 },
    { name: 'Scoundrel', type: 'regular', level: 2 },
    { name: 'Swift Learner', type: 'regular', level: 2 },
    { name: 'Intense Training', type: 'regular', level: 2 },
    { name: 'Comprehension', type: 'regular', level: 4 },
    { name: 'Educated', type: 'regular', level: 4 },
    { name: 'Gun Nut', type: 'regular', level: 4 },
    { name: 'Little Leaguer', type: 'regular', level: 4 },
    { name: 'Scavenger', type: 'regular', level: 4 },
    { name: 'Toughness', type: 'regular', level: 6 },
    { name: 'Bloody Mess', type: 'regular', level: 6 },
    { name: 'Cannibal', type: 'regular', level: 6 },
    { name: 'Demolition Expert', type: 'regular', level: 6 },
    { name: 'Gunslinger', type: 'regular', level: 6 },
    { name: 'Mysterious Stranger', type: 'regular', level: 6 },
    { name: 'Nerd Rage!', type: 'regular', level: 6 },
    { name: 'Night Person', type: 'regular', level: 6 },
    { name: 'Strong Back', type: 'regular', level: 6 },
    { name: 'Animal Friend', type: 'regular', level: 8 },
    { name: 'Commando', type: 'regular', level: 8 },
    { name: 'Fortune Finder', type: 'regular', level: 8 },
    { name: 'Lead Belly', type: 'regular', level: 8 },
    { name: 'Life Giver', type: 'regular', level: 8 },
    { name: 'Mister Sandman', type: 'regular', level: 8 },
    { name: 'Pyromaniac', type: 'regular', level: 8 },
    { name: 'Rad Resistance', type: 'regular', level: 8 },
    { name: 'Robotics Expert', type: 'regular', level: 8 },
    { name: 'Size Matters', type: 'regular', level: 8 },
    { name: 'Sniper', type: 'regular', level: 8 },
    { name: 'Action Boy', type: 'regular', level: 10 },
    { name: 'Action Girl', type: 'regular', level: 10 },
    { name: 'Better Criticals', type: 'regular', level: 10 },
    { name: 'Chem Resistant', type: 'regular', level: 10 },
    { name: 'Finesse', type: 'regular', level: 10 },
    { name: 'Infiltrator', type: 'regular', level: 10 },
    { name: 'Light Step', type: 'regular', level: 10 },
    { name: 'Master Trader', type: 'regular', level: 10 },
    { name: 'Silent Running', type: 'regular', level: 10 },
    { name: 'Adamantium Skeleton', type: 'regular', level: 14 },
    { name: 'Chemist', type: 'regular', level: 14 },
    { name: 'Computer Whiz', type: 'regular', level: 14 },
    { name: 'Concentrated Fire', type: 'regular', level: 14 },
    { name: 'Explorer', type: 'regular', level: 20 },
    { name: 'Solar Powered', type: 'regular', level: 20 },
    { name: 'Ninja', type: 'regular', level: 20 },
    { name: "Grim Reaper's Sprint", type: 'regular', level: 20 },
    { name: 'Tag!', type: 'regular', level: 16 },
    { name: 'Laser Commander', type: 'regular', level: 22 },
    { name: 'Survival Expert', type: 'regular', level: 22 },
    // ── Special perks ─────────────────────────────────────────────────
    { name: 'Power Armor Training', type: 'special', level: 0 },
    { name: 'Cyborg', type: 'special', level: 0 },
    { name: 'Ghoul Ecology', type: 'special', level: 0 },
    { name: 'Pitt Fighter', type: 'special', level: 0 },
    { name: 'Almost Perfect', type: 'special', level: 30 },
    // ── Companion perks ───────────────────────────────────────────────
    { name: 'Mercy', type: 'companion', level: 0 },
    { name: 'Search and Mark', type: 'companion', level: 0 },
    { name: 'Sneak Bobblehead Effect', type: 'companion', level: 0 },
  ],

  // ── LOCATIONS ──────────────────────────────────────────────────────────────
  // Data source: https://fallout.wiki/wiki/Fallout_3_locations
  locations: [
    { name: 'Megaton', type: 'settlement' },
    { name: 'Rivet City', type: 'settlement' },
    { name: 'Canterbury Commons', type: 'settlement' },
    { name: 'Underworld', type: 'settlement' },
    { name: 'Paradise Falls', type: 'settlement' },
    { name: 'Big Town', type: 'settlement' },
    { name: 'Little Lamplight', type: 'settlement' },
    { name: 'Tenpenny Tower', type: 'settlement' },
    { name: 'Arefu', type: 'settlement' },
    { name: 'Grayditch', type: 'settlement' },
    { name: 'Minefield', type: 'landmark' },
    { name: 'Galaxy News Radio Station', type: 'landmark' },
    { name: 'Washington Monument', type: 'landmark' },
    { name: 'Jefferson Memorial', type: 'base' },
    { name: 'Museum of History', type: 'landmark' },
    { name: 'Museum of Technology', type: 'landmark' },
    { name: 'Museum of American History', type: 'landmark' },
    { name: 'Citadel', type: 'base' },
    { name: 'Brotherhood of Steel Relay Tower', type: 'landmark' },
    { name: 'Takoma Industrial', type: 'factory' },
    { name: 'Jury Street Metro Station', type: 'other' },
    { name: 'Corvega Factory', type: 'factory' },
    { name: 'Meresti Trainyard', type: 'other' },
    { name: "Kaelyn's Bed & Breakfast", type: 'other' },
    { name: 'Super-Duper Mart', type: 'other' },
    { name: 'Scrapyard', type: 'other' },
    { name: 'Vault 101', type: 'vault' },
    { name: 'Vault 87', type: 'vault' },
    { name: 'Vault 92', type: 'vault' },
    { name: 'Vault 108', type: 'vault' },
    { name: 'Vault 112', type: 'vault' },
    { name: 'Oasis', type: 'landmark' },
    { name: 'Evergreen Mills', type: 'other' },
    { name: 'The Dunwich Building', type: 'other' },
    { name: "Reilly's Rangers Compound", type: 'other' },
    { name: 'Chevy Chase', type: 'other' },
    { name: 'Friendship Heights', type: 'other' },
    { name: 'Georgetown West', type: 'other' },
    { name: 'Anchorage War Memorial', type: 'landmark' },
    { name: 'Lincoln Memorial', type: 'landmark' },
    { name: 'Smithsonian Museum', type: 'landmark' },
    { name: 'Arlington Library', type: 'landmark' },
    { name: 'Fort Independence', type: 'base' },
    { name: 'Fort Constantine', type: 'base' },
    { name: 'Raven Rock', type: 'base' },
    { name: 'Rockland Car Tunnel', type: 'other' },
    { name: 'Sewer Waystation', type: 'other' },
    { name: 'Seneca Station', type: 'other' },
    { name: 'Roosevelt Academy', type: 'other' },
    { name: 'Grisly Diner', type: 'other' },
    { name: 'Capitol Building', type: 'landmark' },
    { name: 'Collapsed Car Fort', type: 'other' },
    { name: 'Hubris Comics', type: 'other' },
    { name: 'Springvale School', type: 'other' },
    { name: 'Nuka-Cola Plant', type: 'factory' },
    { name: 'Tepid Sewers', type: 'other' },
    { name: 'WKML Broadcast Station', type: 'landmark' },
    { name: 'Andale', type: 'settlement' },
    { name: 'Girdershade', type: 'settlement' },
    { name: 'Republic of Dave', type: 'settlement' },
    { name: 'Temple of the Union', type: 'settlement' },
    { name: 'Springvale', type: 'landmark' },
    { name: 'Vault 106', type: 'vault' },
    { name: 'Arlington Cemetery', type: 'landmark' },
    { name: 'The Mall', type: 'landmark' },
    { name: 'The White House', type: 'landmark' },
    { name: 'Vernon Square', type: 'other' },
    { name: 'Dupont Circle', type: 'other' },
    { name: 'Farragut West Metro Station', type: 'other' },
    { name: 'Anacostia Crossing Station', type: 'other' },
    { name: 'Metro Central', type: 'other' },
    { name: "L'Enfant Plaza", type: 'other' },
    { name: "Mama Dolce's", type: 'factory' },
    { name: 'Bethesda Ruins', type: 'landmark' },
    { name: 'Wheaton Armory', type: 'base' },
    { name: 'Fort Bannister', type: 'base' },
    { name: 'Old Olney', type: 'landmark' },
    { name: 'Deathclaw Sanctuary', type: 'landmark' },
    { name: 'RobCo Facility', type: 'factory' },
    { name: 'Red Racer Factory', type: 'factory' },
    { name: 'Chryslus Building', type: 'factory' },
    { name: 'The Statesman Hotel', type: 'landmark' },
    { name: 'Our Lady of Hope Hospital', type: 'landmark' },
    { name: 'Vault-Tec Headquarters', type: 'base' },
    { name: "Dukov's Place", type: 'other' },
    { name: 'National Guard Depot', type: 'base' },
    { name: 'The Pitt', type: 'settlement' },
    { name: 'Point Lookout', type: 'settlement' },
    { name: 'Mothership Zeta', type: 'base' },
    { name: 'Adams Air Force Base', type: 'base' },
  ],

  // ── COMPANIONS ─────────────────────────────────────────────────────────────
  // 8 permanent companions in Fallout 3.
  // Data source: https://fallout.wiki/wiki/Fallout_3_companions
  companions: [
    { name: 'Dogmeat', fullName: 'Dogmeat', location: 'Scrapyard (south of Minefield)' },
    { name: 'Charon', fullName: 'Charon', location: 'Underworld — Ninth Circle Bar' },
    { name: 'Fawkes', fullName: 'Fawkes', location: 'Vault 87 / Museum of History (after rescue)' },
    {
      name: 'Jericho',
      fullName: 'Jericho',
      location: 'Megaton (requires negative karma or 1000 caps)',
    },
    {
      name: 'Butch',
      fullName: 'Butch DeLoria',
      location: 'Rivet City (after Trouble on the Homefront)',
    },
    { name: 'Cross', fullName: 'Paladin Cross', location: 'Citadel (after Taking it Back!)' },
    { name: 'RL-3', fullName: 'Sergeant RL-3', location: 'Canterbury Commons — Tinker Joe' },
    { name: 'Clover', fullName: 'Clover', location: 'Paradise Falls — Eulogy Jones (1000 caps)' },
  ],

  // ── COLLECTIBLES ────────────────────────────────────────────────────────────
  // FO3: 20 Vault-Tec Bobbleheads. Each boosts a SPECIAL stat (+1) or skill (+10).
  // name: stat key (displayed as stat name in UI, e.g. "Strength" → STRENGTH)
  // stat: state field key ('s','p','e','c','i','a','l' for SPECIAL; skill key for skills)
  // boost: amount of boost (1 for SPECIAL, 10 for skills)
  // location: canonical terse location string — CAPS
  // Data source: https://fallout.wiki/wiki/Vault-Tec_Bobblehead
  collectibles: [
    {
      name: 'Strength',
      stat: 's',
      boost: 1,
      location: "MEGATON — LUCAS SIMMS' HOUSE",
      gridRow: 2,
      gridCol: 3,
    },
    {
      name: 'Perception',
      stat: 'p',
      boost: 1,
      location: 'REPUBLIC OF DAVE',
      gridRow: 1,
      gridCol: 2,
    },
    {
      name: 'Endurance',
      stat: 'e',
      boost: 1,
      location: 'DEATHCLAW SANCTUARY',
      gridRow: 6,
      gridCol: 1,
    },
    {
      name: 'Charisma',
      stat: 'c',
      boost: 1,
      location: 'VAULT 108 — CLONING LAB',
      gridRow: 1,
      gridCol: 5,
    },
    {
      name: 'Intelligence',
      stat: 'i',
      boost: 1,
      location: 'RIVET CITY — SCIENCE LAB',
      gridRow: 3,
      gridCol: 5,
    },
    {
      name: 'Agility',
      stat: 'a',
      boost: 1,
      location: 'GREENER PASTURES DISPOSAL SITE',
      gridRow: 2,
      gridCol: 2,
    },
    {
      name: 'Luck',
      stat: 'l',
      boost: 1,
      location: 'ARLINGTON CEMETERY NORTH',
      gridRow: 3,
      gridCol: 6,
    },
    {
      name: 'Barter',
      stat: 'barter',
      boost: 10,
      location: 'EVERGREEN MILLS — BAZAAR',
      gridRow: 3,
      gridCol: 1,
    },
    {
      name: 'Big Guns',
      stat: 'big_guns',
      boost: 10,
      location: 'FORT CONSTANTINE — CO QUARTERS',
      gridRow: 1,
      gridCol: 3,
    },
    {
      name: 'Energy Weapons',
      stat: 'energy_weapons',
      boost: 10,
      location: 'RAVEN ROCK — LEVEL 2',
      gridRow: 2,
      gridCol: 2,
    },
    {
      name: 'Explosives',
      stat: 'explosives',
      boost: 10,
      location: 'MINEFIELD — HOUSE #103',
      gridRow: 1,
      gridCol: 6,
    },
    {
      name: 'Lockpick',
      stat: 'lockpick',
      boost: 10,
      location: 'BETHESDA RUINS — OFFICES EAST',
      gridRow: 6,
      gridCol: 4,
    },
    {
      name: 'Medicine',
      stat: 'medicine',
      boost: 10,
      location: "VAULT 101 — OVERSEER'S OFFICE",
      gridRow: 2,
      gridCol: 4,
    },
    {
      name: 'Melee Weapons',
      stat: 'melee_weapons',
      boost: 10,
      location: 'DUNWICH BUILDING',
      gridRow: 6,
      gridCol: 3,
    },
    { name: 'Repair', stat: 'repair', boost: 10, location: 'AREFU', gridRow: 1, gridCol: 6 },
    {
      name: 'Science',
      stat: 'science',
      boost: 10,
      location: 'VAULT 106 — LIVING QUARTERS',
      gridRow: 5,
      gridCol: 4,
    },
    {
      name: 'Small Guns',
      stat: 'small_guns',
      boost: 10,
      location: 'NATIONAL GUARD DEPOT — TRAINING WING',
      gridRow: 1,
      gridCol: 3,
    },
    {
      name: 'Sneak',
      stat: 'sneak',
      boost: 10,
      location: 'YAOGUAI TUNNELS',
      gridRow: 5,
      gridCol: 4,
    },
    {
      name: 'Speech',
      stat: 'speech',
      boost: 10,
      location: "PARADISE FALLS — EUOLOGY'S PAD",
      gridRow: 5,
      gridCol: 6,
    },
    {
      name: 'Unarmed',
      stat: 'unarmed',
      boost: 10,
      location: 'SEWERS — BENEATH TEPID SEWER',
      gridRow: 3,
      gridCol: 3,
    },
  ],

  // ── LINCOLN MEMORABILIA ─────────────────────────────────────────────────────
  // 9 artifacts for the "Head of State" quest (Museum of History, Washington DC).
  // buyers: which NPCs will purchase — hannibal=Hannibal Hamlin (Temple of the Union),
  //         leroy=Leroy Walker (Lincoln Memorial), washington=Abraham Washington (Rivet City).
  // Data source: https://fallout.wiki/wiki/Lincoln%27s_Profit_Margins
  lincolnMemorabilia: [
    {
      name: "Lincoln's Repeater",
      location: 'MUSEUM OFFICES — ARCHIVE ROOM DISPLAY CASE',
      buyers: ['hannibal', 'leroy', 'washington'],
      gridRow: 4,
      gridCol: 2,
    },
    {
      name: "Lincoln's Hat",
      location: 'MUSEUM 1ST FLOOR OFFICES — COLLAPSED-CEILING ROOM (ON FLOOR)',
      buyers: ['hannibal', 'leroy', 'washington'],
      gridRow: 4,
      gridCol: 2,
    },
    {
      name: "Lincoln's Voice",
      location: 'MUSEUM 2ND FLOOR OFFICES — 2ND DESK LEFT AT TOP OF STAIRS',
      buyers: ['hannibal', 'leroy', 'washington'],
      gridRow: 4,
      gridCol: 2,
    },
    {
      name: 'Action Abe Action Figure',
      location: 'MUSEUM OFFICES — VERY HARD LOCKED ARCHIVE DOOR, DESK SW CORNER',
      buyers: ['hannibal', 'leroy', 'washington'],
      gridRow: 4,
      gridCol: 2,
    },
    {
      name: 'Civil War Draft Poster',
      location: 'MUSEUM OFFICES — SE CORNER TOP SHELF (CAN FALL TO FLOOR)',
      buyers: ['hannibal', 'leroy', 'washington'],
      gridRow: 4,
      gridCol: 2,
    },
    {
      name: "Lincoln's Diary",
      location: 'MUSEUM LOWER HALLS — FIRST DISPLAY ROOM UP THE STEPS',
      buyers: ['hannibal', 'leroy', 'washington'],
      gridRow: 4,
      gridCol: 2,
    },
    {
      name: 'Antique Lincoln Coin Collection',
      location: 'MUSEUM 2ND FLOOR OFFICES — BOOKSHELF',
      buyers: ['hannibal', 'leroy', 'washington'],
      gridRow: 4,
      gridCol: 2,
    },
    {
      name: 'John Wilkes Booth Wanted Poster',
      location: 'MUSEUM OFFICES — SW CORNER, LAST BOOKSHELF 3RD SHELF',
      buyers: ['hannibal', 'leroy', 'washington'],
      gridRow: 4,
      gridCol: 2,
    },
    {
      name: 'Lincoln Memorial Poster',
      location: 'MUSEUM 2ND FLOOR — WALL BEHIND FIRST DESK (spawns after Head of State started)',
      buyers: ['leroy'],
      gridRow: 4,
      gridCol: 2,
    },
  ],

  // ── ZONES ───────────────────────────────────────────────────────────────────
  // 6×6 grid covering the Capital Wasteland. N→S = row 1→6. W→E = col 1→6.
  // locations[]: primary named map markers in that cell.
  zones: [
    // Row 1 — Far north
    {
      name: 'Vault 92',
      gridRow: 1,
      gridCol: 1,
      locations: ['Vault 92', 'National Guard Armory', 'Broadcast Tower KB5'],
    },
    {
      name: 'Republic of Dave',
      gridRow: 1,
      gridCol: 2,
      locations: ['Republic of Dave', 'Oasis', 'Broadcast Tower LP8'],
    },
    {
      name: 'National Guard Depot',
      gridRow: 1,
      gridCol: 3,
      locations: ['National Guard Depot', 'Fort Constantine', 'WKML Station'],
    },
    {
      name: 'Broadcast Tower',
      gridRow: 1,
      gridCol: 4,
      locations: ['Broadcast Tower', 'Vault 87', 'Capital Wasteland Hideout'],
    },
    {
      name: 'Canterbury Commons',
      gridRow: 1,
      gridCol: 5,
      locations: ['Canterbury Commons', 'Megaton', 'Minefield'],
    },
    { name: 'Minefield', gridRow: 1, gridCol: 6, locations: ['Minefield', 'Scrapyard', 'Arefu'] },
    // Row 2 — Upper mid
    {
      name: 'Big Town',
      gridRow: 2,
      gridCol: 1,
      locations: ['Big Town', 'Springvale', 'Springvale School'],
    },
    {
      name: 'Raven Rock',
      gridRow: 2,
      gridCol: 2,
      locations: ['Raven Rock', 'Deathclaw Sanctuary', 'Greener Pastures'],
    },
    {
      name: 'Megaton',
      gridRow: 2,
      gridCol: 3,
      locations: ['Megaton', 'Craterside Supply', "Moriarty's Saloon"],
    },
    {
      name: 'Vault 101',
      gridRow: 2,
      gridCol: 4,
      locations: ['Vault 101', 'Springvale Elementary', 'Super-Duper Mart'],
    },
    {
      name: "Kaelyn's Bed & Breakfast",
      gridRow: 2,
      gridCol: 5,
      locations: ["Kaelyn's Bed & Breakfast", 'Arefu Bridge', 'Meresti Trainyard'],
    },
    {
      name: 'Grayditch',
      gridRow: 2,
      gridCol: 6,
      locations: ['Grayditch', 'Corvega Factory', 'Jury Street Metro'],
    },
    // Row 3 — Western DC outskirts
    {
      name: 'Evergreen Mills',
      gridRow: 3,
      gridCol: 1,
      locations: ['Evergreen Mills', 'Evergreen Mills Bazaar', 'Jalbert Brothers Waste Disposal'],
    },
    {
      name: 'Roosevelt Academy',
      gridRow: 3,
      gridCol: 2,
      locations: ['Roosevelt Academy', 'Rockland Car Tunnel', 'Broadcast Tower Alpha'],
    },
    {
      name: 'Tepid Sewers',
      gridRow: 3,
      gridCol: 3,
      locations: ['Tepid Sewers', 'Friendship Heights', 'Arlington Wasteland'],
    },
    {
      name: 'Galaxy News Radio',
      gridRow: 3,
      gridCol: 4,
      locations: ['Galaxy News Radio', 'Chevy Chase', 'Talon Company Camp'],
    },
    {
      name: 'Rivet City',
      gridRow: 3,
      gridCol: 5,
      locations: ['Rivet City', 'Jefferson Memorial', 'Anchorage War Memorial'],
    },
    {
      name: 'Arlington Library',
      gridRow: 3,
      gridCol: 6,
      locations: ['Arlington Library', 'Arlington Cemetery', 'Arlington Cemetery North'],
    },
    // Row 4 — DC core
    {
      name: 'Georgetown',
      gridRow: 4,
      gridCol: 1,
      locations: ['Georgetown', 'Georgetown East', 'Georgetown West', 'Georgetown South'],
    },
    {
      name: 'Museum of History',
      gridRow: 4,
      gridCol: 2,
      locations: ['Museum of History', 'Underworld', 'Mall Northeast'],
    },
    {
      name: 'Washington Monument',
      gridRow: 4,
      gridCol: 3,
      locations: ['Washington Monument', 'The Mall', 'Lincoln Memorial'],
    },
    {
      name: 'Museum of Technology',
      gridRow: 4,
      gridCol: 4,
      locations: ['Museum of Technology', 'Museum of American History', 'Museum Station'],
    },
    {
      name: 'Capitol Building',
      gridRow: 4,
      gridCol: 5,
      locations: ['Capitol Building', 'Super-Mutant Stronghold', 'Seward Square'],
    },
    {
      name: 'Hubris Comics',
      gridRow: 4,
      gridCol: 6,
      locations: ['Hubris Comics', 'Irradiated Metro', 'Pennsylvania Ave'],
    },
    // Row 5 — Southern DC / outskirts
    {
      name: 'Fort Independence',
      gridRow: 5,
      gridCol: 1,
      locations: ['Fort Independence', 'Outcast Outpost', 'Relay Tower'],
    },
    {
      name: 'Tenpenny Tower',
      gridRow: 5,
      gridCol: 2,
      locations: ['Tenpenny Tower', 'Grisly Diner', 'Sewer Waystation'],
    },
    {
      name: 'Little Lamplight',
      gridRow: 5,
      gridCol: 3,
      locations: ['Little Lamplight', 'Murder Pass', 'Marigold Station'],
    },
    {
      name: 'Vault 87',
      gridRow: 5,
      gridCol: 4,
      locations: ['Vault 87', 'Lamplight Caverns', 'Yao Guai Tunnels'],
    },
    {
      name: 'Citadel',
      gridRow: 5,
      gridCol: 5,
      locations: ['Citadel', 'A-Ring', 'B-Ring', 'Labs', 'River Entrance'],
    },
    {
      name: 'Paradise Falls',
      gridRow: 5,
      gridCol: 6,
      locations: ['Paradise Falls', "Eulogy's Pad", 'Slave Quarters'],
    },
    // Row 6 — Far south
    {
      name: 'Deathclaw Sanctuary',
      gridRow: 6,
      gridCol: 1,
      locations: ['Deathclaw Sanctuary', 'Interstate 95 Ruins', 'Satellite Relay Station'],
    },
    {
      name: 'Nuka-Cola Plant',
      gridRow: 6,
      gridCol: 2,
      locations: ['Nuka-Cola Plant', 'Girdershade', 'Ronald Laren'],
    },
    {
      name: 'Dunwich Building',
      gridRow: 6,
      gridCol: 3,
      locations: ['Dunwich Building', 'Dunwich Company HQ', 'Forsaken Dunwich'],
    },
    {
      name: 'Vault 92',
      gridRow: 6,
      gridCol: 4,
      locations: ['Vault 92 South', 'Calverton', 'Bethesda Ruins'],
    },
    {
      name: 'Seneca Station',
      gridRow: 6,
      gridCol: 5,
      locations: ['Seneca Station', 'Sewer (South)'],
    },
    {
      name: 'Collapsed Car Fort',
      gridRow: 6,
      gridCol: 6,
      locations: ['Collapsed Car Fort', 'Rivet City South', 'Takoma Industrial'],
    },
  ],
};

// ── REGISTRY SEARCH ──────────────────────────────────────────────────────────
/**
 * Identical implementation to reg_nv.js. Searches FALLOUT_REGISTRY by category and query.
 * @param {string} category
 * @param {string} query
 * @returns {Array<Object>} Up to 7 results sorted by relevance.
 */
let _registrySearchCache = null;
function registrySearch(category, query) {
  if (!query || query.length < 2) return [];
  if (
    _registrySearchCache &&
    _registrySearchCache.category === category &&
    _registrySearchCache.query === query
  ) {
    return _registrySearchCache.results;
  }

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
      const words = nameLower.split(/[\s\-']+/);
      for (let w = 0; w < words.length; w++) {
        if (words[w].startsWith(q)) {
          score = 2;
          break;
        }
      }
      if (score === 0 && nameLower.includes(q)) {
        score = 1;
      }
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.entry.name || '').localeCompare(b.entry.name || '');
  });

  const results = scored.slice(0, 7).map(s => s.entry);
  _registrySearchCache = { category, query, results };
  return results;
}
