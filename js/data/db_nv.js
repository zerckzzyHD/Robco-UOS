// Localized Database String — Fallout: New Vegas canonical data (fallout.wiki, CC-BY-SA 4.0)
// v1.6.7: Expanded to ~170 weapons, ~70 armors, ~45 chems.
// databaseCSVs is injected via systemInstruction in api.js for guaranteed model attention.
//
// LOAD ORDER: injected by the GAME_FILES boot manifest in index.html (before
// js/core/state.js, which defines GAME_DEFS) when the active game is FNV
// (the FNV fail-safe default); db_fo3.js loads instead for FO3. No other
// file dependency at parse time — this file only defines the databaseCSVs
// string + the lookup helpers below.
// EXPOSES: databaseCSVs (the raw CSV text, read by api.js's directive
// builder), lookupItemInDb(), getQuestItemDetail(), getChemsTable(),
// lookupWeaponStats(), lookupBestiaryEntry(), getBestiaryNames(),
// getVendors(), getTradeCatalog(), getAmmoCalibers().
// PROTOCOL 3 (WEAPONS.CSV): the combat + economy fields — Base_Damage,
// Crit_Damage, Crit_Multiplier, Attacks_Per_Second, Weight, Value — were
// re-verified row-by-row against the fallout.wiki "Fallout: New Vegas Weapons"
// master table on 2026-07-15 (thrown/placed/launched explosives' blast damage
// pulled from each weapon's own page; see planning/NV_DATA_PROVENANCE.md).
// Four non-FNV rows were removed — Rebound (a chem, not a weapon),
// Pump-Action Shotgun (a Fallout: Brotherhood of Steel weapon), Golf Club
// (a Fallout 76 weapon), and Vance's Lucky Hat Knife (no such weapon exists) —
// and "Rocket Launcher" was renamed to its real in-game name, Missile Launcher.
// The PARKED columns (Req_Unarmed/Req_STR/Reach/Special_Attack_AP) were NOT
// re-sourced. This file is a typist for wiki data, never an authority that
// invents or edits Fallout facts.
//
// PROTOCOL 3 (ARMOR.CSV + CHEMS.CSV): re-verified on 2026-07-15 against the
// fallout.wiki "Fallout: New Vegas Apparel", "Fallout: New Vegas headwear" and
// "Fallout: New Vegas Consumables" master tables (plus individual item pages for
// the outliers). ARMOR DT/Weight/Value are verified for 99 of the 103 rows —
// body armor, clothing AND headwear (the hats live on the separate headwear
// page; a follow-up pass sourced them). The remaining 4 are LEFT AT THEIR PRIOR
// VALUES and flagged UNVERIFIED, never guessed: "Wasteland Wanderer Outfit" (a
// Fallout 3 item, not FNV), "Vault Utility Suit" (no FNV item by that name — the
// real one is the Vault 3 utility jumpsuit), and "NCR Veteran Ranger Armor" +
// "Ranger Combat Armor" (duplicate names for the one canonical NCR Ranger combat
// armor, which is itself already present and verified). ARMOR Type and
// Min_CND_Threshold were NOT re-sourced (PARKED display columns); the Effects
// column was left as-authored EXCEPT Chinese Stealth Armor, corrected to the
// real FNV effect (Sneak +5 — the FNV set has no auto-Stealth-Boy, unlike the
// FO3 one). CHEMS Value + Weight were corrected against the consumables master
// (most FNV chems weigh 0, not the old 0.5 placeholder); the fabricated
// "Whiskey Rose" row was removed (a Cass companion PERK, not a consumable).
// CHEMS Effect/Duration/Addiction columns were NOT re-sourced.
//
// PROTOCOL 3 (BESTIARY.CSV): every creature/NPC name was confirmed a real FNV
// entity (no fakes, no wrong-game leaks), but the NUMERIC stats were NOT
// re-sourced and remain model-plausible approximations — most entries are
// level-scaled creatures or human NPCs whose HP/DT/damage vary by level and
// variant, so no single canonical wiki value exists to pin them to. Treat the
// bestiary numbers as UNVERIFIED.
//
// The remaining tables (AMMO/MISC/RECIPES/QUEST_ITEMS/VENDORS/WEAPON_MODS) are
// still NOT re-verified — do not read this note as vouching for them.
//
// ── RESERVED-COLUMN REGISTER (Step 2 Phase 0 U11 / FP-DATA-8) ──────────────
// Columns below are authored (fallout.wiki-sourced) but have no current code
// consumer — never read by any lookup*()/get*() accessor, or parsed but never
// rendered downstream. Each is tagged with its intended future consumer, or
// PARKED if none is scoped yet. Full evidence in ARCHITECTURE.md → "Per-Game
// Data Parity & Reserved-Column Ledger". These are reserved, not dead — do
// not delete as "unused" unless marked PARKED-FOR-REMOVAL.
//   WEAPONS.CSV      Crit_Damage/Crit_Multiplier      → PARKED (no crit calculator built)
//                     Req_Unarmed/Req_STR/Reach        → PARKED (VATS v2 melee/STR gating)
//                     Special_Attack_AP/Special_Rules  → PARKED (per-weapon VATS AP variance;
//                       same unsourceable-precision gap as WU-D4a-RANGED-GAP, Suite 104)
//   AMMO.CSV          DMG_Multiplier/DT_Modifier       → PARKED (per-subtype ammo effects)
//                     Condition_Degradation             → PARKED (weapon-condition system)
//   ARMOR.CSV         Type/DT/Effects/Min_CND_Threshold → PARKED — no lookupArmorStats()
//                       sibling to lookupWeaponStats()/lookupBestiaryEntry() exists; DT is
//                       the highest-priority target (armor DT is looked up nowhere today)
//   CHEMS.CSV         Duration                          → PARKED (BIO-SCAN expiry countdown)
//   RECIPES.CSV       ALL COLUMNS                        → PARKED-FOR-REMOVAL — doCraft/doScrap
//                       read reg_nv.js recipes[]/breakdowns[] instead; this table has zero
//                       consumers (not merely reserved — Protocol 22 duplicate-source flag)
//   QUEST_ITEMS.CSV   Tradeable                          → PARKED (TRADE v2 quest-item filter)
//   VENDORS.CSV       Repair_Skill                        → PARKED (vendor repair action)
//                     Restock_Days/Accepted_Currencies    → target: TRADE v2 (FP-DATA-8)
//   WEAPON_MODS.CSV   Effect                              → PARKED (mod effect readout)
//   BESTIARY.CSV      Perception/Speed_Factor              → target: v2.9.0 ENCOUNTER +
//                       BESTIARY BROWSER (FP-GP-4)
const databaseCSVs = `
[WEAPONS.CSV]
Weapon_Name,Base_Damage,Crit_Damage,Crit_Multiplier,Attacks_Per_Second,Weight,Value,Req_Unarmed,Req_STR,Reach,Special_Attack_AP,Special_Rules,Ammo_Type
Brass Knuckles,18,18,1.0,2.0526,1,120,25,4,0.5,20,None,None
Spiked Knuckles,25,25,1.0,2.3684,1,500,50,4,0.5,25,None,None
Love and Hate,30,30,1.0,2.5263,1,750,50,4,0.5,25,None,None
Power Fist,40,40,1.0,1.0909,6,800,75,7,0.7,35,None,None
Deathclaw Gauntlet,20,30,5.0,1.63,10,150,100,7,1.0,45,None,None
Saturnite Fist Super-Heated,55,55,1.0,1.65,4,2400,75,5,0.6,35,Fire Damage,None
Ballistic Fist,80,80,1.0,1.0909,6,7800,100,9,0.7,45,None,None
Industrial Hand,50,40,1.0,3.2,10,2500,75,5,0.7,40,Ignores DT,None
Combat Knife,15,15,2.0,3.2308,1,500,0,0,0.6,20,None,None
Machete,11,11,1.5,3,2,50,0,4,0.7,25,None,None
Ripper,50,5,1.0,1,6,1200,50,4,0.7,25,Chainsaw,None
Cattle Prod,5,5,2.0,2.3077,3,450,0,5,0.8,25,Stun,None
Fire Axe,55,27,1.0,1.5789,8,2500,0,6,1.0,30,None,None
Knock Knock,66,33,1.0,1.8,8,3200,0,7,1.0,40,None,None
9mm Pistol,16,16,1.0,3.125,1.5,100,0,2,0,0,None,9mm
10mm Pistol,22,22,1.0,2.75,3,750,0,2,0,0,None,10mm
.357 Magnum Revolver,26,26,1.0,1.75,2,110,0,3,0,0,None,.357 Magnum
.44 Magnum Revolver,36,36,1.0,1.875,3.5,2500,0,4,0,0,None,.44 Magnum
Lucky,30,30,2.5,2.75,2.5,1500,0,3,0,0,None,.357 Magnum
12.7mm Pistol,40,40,1.0,2.75,3.5,4000,0,3,0,0,None,12.7mm
Hunting Rifle,52,52,2.0,0.947369,6,2200,0,6,0,0,None,.308
Cowboy Repeater,32,32,1.25,1.6923,5,800,0,4,0,0,None,.357 Magnum
Service Rifle,18,18,1.0,4.2,8.5,540,0,3,0,0,None,5.56mm
Marksman Carbine,24,24,1.0,5.7,6,5200,0,5,0,0,None,5.56mm
All-American,26,26,1.0,6,6,5900,0,5,0,0,None,5.56mm
Trail Carbine,48,48,1.0,1.5385,5.5,3900,0,4,0,0,None,.44 Magnum
Brush Gun,75,75,1.0,1.23,5,4900,0,6,0,0,None,.45-70 Gov't
Sniper Rifle,45,45,2.0,1.9286,8,4100,0,6,0,0,None,.308
This Machine,55,55,1.0,2.1429,9.5,2800,0,5,0,0,None,.308
Gobi Campaign Scout Rifle,48,80,2.0,2.1429,4.5,6200,0,6,0,0,None,.308
Anti-Materiel Rifle,110,110,1.0,0.4478,20,5600,0,8,0,0,Armor Piercing,.50 MG
Hunting Shotgun,70,10,1.0,1.6667,7.5,3800,0,5,0,0,None,20 Gauge
Lever-Action Shotgun,48,7,1.0,1.7692,3,2000,0,5,0,0,None,20 Gauge
9mm Submachine Gun,14,14,1.0,11,4,850,0,3,0,0,Full Auto,9mm
.45 Auto Submachine Gun,26,26,1.0,11,11,3750,0,5,0,0,Full Auto,.45 Auto
12.7mm Submachine Gun,36,36,1.0,9,5,5100,0,6,0,0,Full Auto,12.7mm
Minigun,12,12,0.5,20,25,5500,0,7,0,0,Full Auto,5mm
Grenade Launcher,100,0,1.0,0.5556,12,4200,0,4,0,0,Splash,40mm Grenade
Missile Launcher,200,0,0.0,1.5789,20,3900,0,6,0,0,Splash,Missile
Fat Man,600,0,0.0,1.5789,30,6000,0,8,0,0,Splash,Mini Nuke
Flamer,16,1,4.0,8,15,2350,0,8,0,0,Fire DoT,Flamer Fuel
Laser Pistol,12,12,1.5,3.75,3,175,0,2,0,0,None,Energy Cell
Plasma Pistol,33,33,1.5,1.75,3,200,0,3,0,0,None,Microfusion Cell
Laser Rifle,22,22,1.5,3.0818,8,800,0,2,0,0,None,Microfusion Cell
Plasma Rifle,47,47,2.0,1.4,8,1300,0,5,0,0,None,Microfusion Cell
Tri-beam Laser Rifle,66,22,1.5,2.7273,9,4800,0,4,0,0,None,Microfusion Cell
Gauss Rifle,120,60,2.0,3,7,3000,0,7,0,0,Stagger,2mm EC
Tesla Cannon,80,40,2.0,1.342105,8,8700,0,7,0,0,EMP Burst,Electron Charge Pack
Frag Grenade,125,0,1.0,0.65,0.5,150,0,0,0,0,Splash,None
Plasma Grenade,225,0,1.0,0.6522,0.5,300,0,0,0,0,Splash,None
Incendiary Grenade,50,0,1.0,0.6522,0.5,200,0,0,0,0,Fire DoT,None
Bottlecap Mine,200,0,1.0,0.3261,0.5,150,0,0,0,0,Triggered/Splash,None
Bear Trap Fist,27,27,1.0,1.0909,6,800,50,5,0.7,30,Cripple,None
Corrosive Glove,21,5,1.0,1.0909,4,1500,50,4,0.6,25,Acid DoT,None
Cram Opener,28,44,2.0,1.6957,10,800,0,3,0.6,20,None,None
Displacer Glove,50,50,1.0,1.3636,6,3500,75,5,0.7,30,Knockback,None
Fist of Rawr,50,75,2.0,1.9565,10,6200,100,7,1.0,40,None,None
Mantis Gauntlet,30,30,3.0,2.0217,10,750,50,5,0.8,30,Poison,None
Pushy,60,60,1.0,1.4727,6,4200,75,6,0.7,35,Knockback,None
Saturnite Fist,35,35,1.0,1.8,4,1600,50,5,0.6,30,None,None
Zap Glove,35,35,1.0,1.6364,6,5200,50,4,0.6,25,EMP,None
Blade of the East,65,30,1.0,1.5,12,45,0,7,1.0,35,None,None
Bowie Knife,23,35,1.5,3.4615,1,1000,0,0,0.6,20,None,None
Broad Machete,15,15,2.0,3.2308,1,75,0,5,0.7,25,None,None
Chance's Knife,22,22,2.0,4.1538,1,900,0,0,0.6,25,None,None
Figaro,8,16,4.0,4.1538,1,400,0,0,0.5,20,None,None
Katana,22,22,2.0,3.2308,3,2500,0,5,0.9,30,None,None
Machete Gladius,28,28,1.5,3,2,1000,0,6,0.8,30,None,None
Shishkebab,40,20,2.0,2.3077,3,2500,0,5,0.9,30,Fire DoT,None
Straight Razor,5,10,2.0,3.6923,1,35,0,0,0.5,15,Bleed,None
Throwing Knife,15,15,2.0,3.2143,0.5,20,0,0,0.5,0,Thrown,None
Throwing Knife Spear,42,42,1.0,0.48,0.65,25,0,0,0.5,0,Thrown,None
Baseball Bat,22,22,1.0,1.65,3,250,0,4,1.0,25,None,None
Bumper Sword,32,32,1.0,1.4211,12,2500,0,7,1.0,30,None,None
Oh Baby!,80,40,1.0,1.7368,20,6200,0,8,1.2,45,None,None
Pool Cue,15,15,0.0,1.5789,1,15,0,2,1.2,20,None,None
Sledgehammer,24,24,1.0,1.8947,12,130,0,7,1.2,40,Knockdown,None
Super Sledge,70,35,1.0,1.5789,20,5800,0,8,1.2,55,Knockdown,None
Thermic Lance,100,10,1.0,1.0,20,5500,0,8,1.0,40,Fire DoT,None
Tire Iron,15,15,1.0,2.3077,3,40,0,4,1.0,25,None,None
Two-Step Goodbye,70,10,4.0,1.0909,6,20000,0,8,1.2,50,Explosion,None
War Club,19,19,1.0,3,3,75,0,6,1.1,35,None,None
Hunting Revolver,58,58,1.0,1.5,4,3500,0,5,0,0,None,.44 Magnum
.45 Auto Pistol,29,29,1.0,2.75,1.5,1750,0,4,0,0,None,.45 Auto
5.56mm Pistol,28,28,2.0,2.75,5,1200,0,3,0,0,None,5.56mm
A Light Shining in Darkness,33,33,2.0,4.375,1.2,4500,0,3,0,0,None,.45 Auto
Li'l Devil,45,45,2.0,3.25,3.2,16000,0,2,0,0,None,.357 Magnum
Maria,20,20,2.0,3.75,1.5,999,0,2,0,0,None,9mm
Police Pistol,30,45,1.0,2,3,1000,0,3,0,0,None,.38 Spl
Ranger Sequoia,62,62,1.5,1.6875,4,1200,0,6,0,0,None,.45-70 Gov't
Silenced .22 Pistol,9,18,3.0,3.5,3,80,0,2,0,0,Silenced,.22 LR
That Gun,30,30,2.5,3,5,1750,0,5,0,0,None,5.56mm
Weathered 10mm Pistol,24,24,1.0,2.75,3,1200,0,2,0,0,None,10mm
Abilene Kid LE BB Gun,4,70,1.5,1.5385,2,500,0,1,0,0,None,BB
Assault Carbine,13,13,1.0,12,6,3950,0,4,0,0,None,5mm
Automatic Rifle,40,40,1.5,6,16,4500,0,6,0,0,Full Auto,.30 Cal
Battle Rifle,48,48,1.0,1.9286,9.5,1500,0,6,0,0,None,.308
BB Gun,4,4,1.0,1.5385,2,36,0,1,0,0,None,BB
Bozar,19,19,1.0,15,15,20000,0,6,0,0,Full Auto,.308
Christine's COS Silencer Rifle,62,62,2.5,1.6071,5.5,6100,0,7,0,0,Silenced,.50 MG
La Longue Carabine,35,35,1.5,2.15,5,1500,0,5,0,0,None,.357 Magnum
Light Machine Gun,21,21,1.0,12,15,5200,0,6,0,0,Full Auto,5.56mm
Medicine Stick,78,78,1.0,1.3846,5.5,20000,0,7,0,0,None,.45-70 Gov't
Paciencia,55,110,2.0,1.184211,6.2,12000,0,7,0,0,None,.45-70 Gov't
Ratslayer,23,23,5.0,1.3026,4.5,2000,0,2,0,0,Silenced,.223
Survivalist's Rifle,48,48,1.0,3.9,8.5,5400,0,6,0,0,None,.45-70 Gov't
Varmint Rifle,18,18,1.0,1.2158,5.5,75,0,2,0,0,None,.22 LR
10mm Submachine Gun,19,19,1.0,9,5,2370,0,3,0,0,Full Auto,10mm
Vance's 9mm Submachine Gun,17,17,1.0,13,4,1500,0,3,0,0,Full Auto,9mm
H&H Tools Nail Gun,9,9,2.0,14,4,4996,0,2,0,0,None,2mm EC
Silenced .22 SMG,10,20,3.0,11,8,1850,0,2,0,0,Silenced,.22 LR
Sleepytyme,22,22,1.0,10,5,8250,0,5,0,0,Silenced,.45 Auto
Big Boomer,120,9,1.0,2.5781,4,2500,0,7,0,0,None,20 Gauge
Caravan Shotgun,45,6,1.0,3.2143,3,675,0,4,0,0,None,20 Gauge
Dinner Bell,75,11,1.0,1.6667,7.5,4800,0,5,0,0,None,20 Gauge
Riot Shotgun,67,10,1.0,4,5,5500,0,5,0,0,Full Auto,12 Gauge
Sawed-Off Shotgun,100,7,1.0,2.3438,4,1950,0,4,0,0,None,20 Gauge
Single Shotgun,50,7,1.0,2.5714,7,175,0,4,0,0,None,20 Gauge
Sturdy Caravan Shotgun,50,7,1.0,3.2143,3,875,0,4,0,0,None,20 Gauge
CZ57 Avenger,13,13,0.5,30,18,8500,0,7,0,0,Full Auto,5mm
FIDO,36,18,0.5,7,27,9500,0,6,0,0,Full Auto,5.56mm
K9000 Cyberdog Gun,26,13,0.5,7,27,7500,0,6,0,0,Full Auto,5.56mm
Shoulder Mounted Machine Gun,30,20,0.0,7,17,7500,0,6,0,0,Full Auto,5.56mm
Alien Blaster,75,50,100.0,1.75,2,4000,0,0,0,0,None,Alien Power Cell
Compliance Regulator,8,12,1.5,3.75,3,175,0,2,0,0,Paralysis,Energy Cell
MF Hyperbreeder Alpha,25,25,2.0,7,7,8900,0,2,0,0,Unlimited Charge,Microfusion Cell
Pew Pew,75,50,2.5,2,3,2500,0,3,0,0,None,Energy Cell
Recharger Pistol,18,18,1.2,5,7,2700,0,2,0,0,Unlimited Charge,Energy Cell
AER14 Prototype,35,35,2.0,3,8.5,2200,0,2,0,0,None,Energy Cell
Elijah's Advanced LAER,65,15,1.5,2.75,4,8500,0,6,0,0,None,Energy Cell
LAER,65,15,1.5,2.5,4,8000,0,5,0,0,None,Energy Cell
Laser RCW,15,15,0.5,9,4,2150,0,3,0,0,Full Auto,Energy Cell
Recharger Rifle,12,12,1.5,4.26,15,250,0,2,0,0,Unlimited Charge,Energy Cell
Plasma Defender,38,38,1.0,2.5,2,3000,0,4,0,0,None,Microfusion Cell
Q-35 Matter Modulator,40,62,2.0,2.4,7,3000,0,5,0,0,None,Microfusion Cell
YCS/186,140,70,2.0,3,8,3000,0,8,0,0,None,2mm EC
Heavy Incinerator,15,5,4.0,4,15,7200,0,8,0,0,Fire DoT,Flamer Fuel
Incinerator,1,1,4.0,2,12,1300,0,5,0,0,Fire DoT,Flamer Fuel
Multiplas Rifle,105,34,1.0,1.0,7,2500,0,7,0,0,Splash,Microfusion Cell
Tesla-Beaton Prototype,90,45,2.0,1.342105,8,12525,0,7,0,0,EMP Chain,Electron Charge Pack
Grenade Machinegun,50,0,1.0,3,15,5200,0,8,0,0,Full Auto/Splash,40mm Grenade
Grenade Rifle,100,1,1.0,2.1429,6,300,0,5,0,0,Splash,40mm Grenade
Red Glare,40,0,0.0,4,20,15000,0,7,0,0,Splash/Incendiary,Rocket
Annabelle,200,0,0.0,1.8947,15,5200,0,5,0,0,Splash,Missile
Mercy,100,0,50.0,3.1,15,5200,0,8,0,0,Full Auto/Splash,40mm Grenade
Pulse Grenade,10,0,1.0,0.6522,0.5,40,0,0,0,0,EMP/Splash,None
Holy Frag Grenade,800,0,1.0,0.6522,0.5,500,0,0,0,0,Splash,None
Frag Mine,100,0,1.0,0.5,0.5,75,0,0,0,0,Triggered/Splash,None
Plasma Mine,150,0,1.0,0.5,0.5,300,0,0,0,0,Triggered/Splash,None
Pulse Mine,10,0,1.0,0.5,0.5,40,0,0,0,0,Triggered/EMP,None
Tin Grenade,100,0,1.0,0.6522,0.5,25,0,0,0,0,Splash,None
Dynamite,75,0,1.0,0.4054,0.3,25,0,0,0,0,Timed/Splash,None
Euclid's C-Finder,0,0,50.0,0.2027,15,1,0,0,0,0,ARCHIMEDES II Strike,None
Lily's Vertibird Blade,24,24,1.0,1.8,12,130,0,7,1.0,40,None,None
Mysterious Magnum,42,42,1.0,2.4375,4,3200,0,3,0,0,Plays Harmonica,.357 Magnum
Esther,600,0,0.0,1.8947,40,18000,0,8,0,0,Splash,Mini Nuke
Sprtel-Wood 9700,16,16,1.0,20,15,20000,0,6,0,0,Full Auto,Electron Charge Pack
Cleansing Flame,15,1,1.0,7,22,9500,0,7,0,0,Fire DoT,Flamer Fuel
The Smitty Special,35,35,1.0,7,20,20000,0,8,0,0,Full Auto,Microfusion Cell
25mm Grenade APW,50,0,1.0,2.5,8,4200,0,5,0,25,Splash,25mm Grenade
Time Bomb,150,0,1.0,0.3261,0.5,750,0,1,0,0,Timed/Splash,None
Chopper,14,14,2.0,3.92,2,800,0,2,0.7,17,None,None
9 Iron,17,17,1.0,2.25,3,55,0,2,1.0,35,Knockdown,None
Dress Cane,22,35,1.0,2.3077,3,40,50,2,0.9,35,None,None
Chainsaw,80,8,1.0,1,20,2800,75,7,0.7,45,Chainsaw,None
Gehenna,42,21,2.0,2.7692,3,12000,75,6,0.6,22,Fire DoT,None
Nuka-Breaker,50,50,2.0,1.44,8,7800,50,9,1.2,42,None,None
Greased Lightning,32,32,1.0,3.0,6,15000,50,5,0.7,35,None,None
Embrace of the Mantis King!,42,64,3.0,1.5652,12,8500,75,4,0.8,25,None,None
Cosmic Knife,12,12,1.0,3.0,1,35,0,1,0.6,20,None,None
Cosmic Knife Clean,15,15,1.2,3.0,1,50,0,1,0.6,25,None,None
Cosmic Knife Super-Heated,14,14,5.0,3.0,1,50,0,1,0.6,25,Fire DoT,None
Knife Spear,20,20,1.0,1.8947,3,55,25,2,0.9,35,None,None
Knife Spear Clean,25,25,1.2,1.8947,3,55,25,2,0.9,35,None,None
Gas Bomb,80,0,1.0,0.3261,5,100,0,1,0,0,Fire DoT/Splash,None
Tomahawk,30,30,1.0,0.6585,0.5,75,50,3,0,23,Thrown,None
Yao Guai Gauntlet,20,30,2.5,1.6304,10,150,50,4,0.8,22,Ignores DT,None
Fire Bomb,20,0,1.0,0.4054,0.5,200,0,2,0,24,Fire DoT/Splash,None
Proton Axe,50,25,1.0,1.9105,8,3500,50,5,1.0,35,EMP/Robot,None
Protonic Inversal Axe,58,45,1.0,1.9105,8,4000,50,5,1.0,35,EMP/Robot,None
Sonic Emitter - Gabriel's Bark,55,25,1.0,1.0345,2,3500,0,2,0,30,Knockback,Energy Cell
Sonic Emitter - Revelation,31,18,1.0,1.0345,2,3500,0,2,0,30,Paralysis,Energy Cell
Sonic Emitter - Tarantula,60,30,1.0,1.0345,2,3500,0,2,0,30,Fire DoT,Energy Cell
Sonic Emitter - Robo-Scorpion,65,30,1.0,1.0345,2,3500,0,2,0,30,Explosion,Energy Cell
Old Glory,45,80,1.5,1.8947,8,2500,50,7,1.1,35,None,None
Arc Welder,9,1,4.0,8.0,15,3700,0,7,0,0,Full Auto,Electron Charge Pack
Flash Bang,1,0,1.0,0.6522,0.5,50,0,4,0,0,Blind,None
Satchel Charge,250,0,1.0,0.5,0.75,125,0,4,0,0,Triggered/Splash,None

[AMMO.CSV]
Caliber,Subtype,DMG_Multiplier,DT_Modifier,Condition_Degradation,Weight_Per_Unit
5.56mm,Standard,1.0,0,1.0,0.003
5.56mm,Armor Piercing,0.95,-15,1.0,0.003
5.56mm,Hollow Point,1.75,x3.0,1.0,0.003
5.56mm,Surplus,1.15,0,3.0,0.003
9mm,Standard,1.0,0,1.0,0.003
9mm,Hollow Point,1.5,x3.0,1.0,0.003
9mm,Armor Piercing,0.85,-15,1.0,0.003
.357 Magnum,Standard,1.0,0,1.0,0.004
.357 Magnum,Hollow Point,1.75,x3.0,1.0,0.004
.357 Magnum,JHP,1.5,x2.0,1.0,0.004
.44 Magnum,Standard,1.0,0,1.0,0.005
.44 Magnum,Hollow Point,1.75,x3.0,1.0,0.005
.44 Magnum,SWC,1.1,-2,1.0,0.005
.45 Auto,Standard,1.0,0,1.0,0.004
.45 Auto,Hollow Point,1.5,x3.0,1.0,0.004
.45 Auto,Armor Piercing,0.85,-15,1.0,0.004
.45-70 Gov't,Standard,1.0,0,1.0,0.005
.45-70 Gov't,Hollow Point,1.5,x3.0,1.0,0.005
.45-70 Gov't,JSP,1.3,-10,1.0,0.005
.50 MG,Standard,1.0,0,1.0,0.009
.50 MG,Armor Piercing,0.75,-35,1.0,0.009
.50 MG,Match,1.0,0,1.0,0.009
10mm,Standard,1.0,0,1.0,0.004
10mm,Hollow Point,1.5,x3.0,1.0,0.004
10mm,Armor Piercing,0.9,-10,1.0,0.004
12 Gauge,Buckshot,1.0,0,1.0,0.009
12 Gauge,Slug,1.5,-6,1.0,0.009
12 Gauge,Bean Bag,0.5,0,1.0,0.009
12.7mm,Standard,1.0,0,1.0,0.008
12.7mm,Hollow Point,1.5,x3.0,1.0,0.008
12.7mm,Armor Piercing,0.85,-15,1.0,0.008
.308,Standard,1.0,0,1.0,0.006
.308,Hollow Point,1.5,x3.0,1.0,0.006
.308,Armor Piercing,0.75,-25,1.0,0.006
.308,Match,1.0,0,1.0,0.006
5mm,Standard,1.0,0,1.0,0.001
5mm,Armor Piercing,0.75,-15,1.0,0.001
5mm,Hollow Point,1.5,x3.0,1.0,0.001
5mm,Surplus,1.15,0,3.0,0.001
Energy Cell,Standard,1.0,0,1.0,0.0
Energy Cell,Optimized,1.15,0,1.0,0.0
Energy Cell,Overcharged,1.5,0,2.0,0.0
Energy Cell,Bulk,0.75,0,0.75,0.0
Microfusion Cell,Standard,1.0,0,1.0,0.0
Microfusion Cell,Optimized,1.15,0,1.0,0.0
Microfusion Cell,Overcharged,1.5,0,2.0,0.0
Microfusion Cell,Bulk,0.75,0,0.75,0.0
Electron Charge Pack,Standard,1.0,0,1.0,0.0
Electron Charge Pack,Optimized,1.15,0,1.0,0.0
Electron Charge Pack,Overcharged,1.5,0,2.0,0.0
Electron Charge Pack,Bulk,0.75,0,0.75,0.0
2mm EC,Standard,1.0,0,1.0,0.0
25mm Grenade,Standard,1.0,0,1.0,0.3
40mm Grenade,Standard,1.0,0,1.0,0.5
Flamer Fuel,Standard,1.0,0,1.0,0.02
Missile,Standard,1.0,0,1.0,3.0

[ARMOR.CSV]
Name,Type,DT,Weight,Value,Effects,Min_CND_Threshold
Wasteland Wanderer Outfit,Light,0,2,15,None,50%
Vault Utility Suit,Light,0,3,50,None,50%
Leather Armor,Light,6,15,160,None,50%
NCR Trooper Armor,Light,10,26,300,None,50%
Gecko-Backed Leather Armor,Light,10,15,500,None,50%
NCR Ranger Patrol Armor,Light,15,25,390,None,50%
Stealth Suit Mk II,Light,14,25,7500,+10 Sneak / Auto-Stealth,50%
Metal Armor,Medium,12,30,1100,None,50%
Combat Armor,Medium,15,25,6500,None,50%
Combat Armor Reinforced,Medium,17,25,8000,None,50%
Legion Centurion Armor,Medium,18,35,800,None,50%
Desert Ranger Combat Armor,Medium,22,30,8000,None,50%
NCR Veteran Ranger Armor,Medium,22,30,9000,None,50%
Elite Riot Gear,Medium,22,23,12500,+1 PER / +1 CHR,50%
NCR Salvaged Power Armor,Heavy,20,40,3000,+1 STR,50%
Brotherhood T-45d Power Armor,Heavy,22,45,4500,+2 STR,50%
Ranger Combat Armor,Medium,20,30,7500,None,50%
T-51b Power Armor,Heavy,25,40,5200,+1 STR / +1 CHA / +25 Rad Resist,50%
Remnants Power Armor,Heavy,28,45,6500,+1 STR / +25 Rad Resist,50%
Enclave Power Armor,Heavy,32,45,780,+1 STR / +25 Rad Resist,50%
Gannon Family Tesla Armor,Heavy,26,35,8194,+10 Energy Resist / +25 Rad Resist,50%
Advanced Radiation Suit,Light,6,7,100,+60 Rad Resist,50%
Armored Vault 13 Jumpsuit,Light,8,15,70,+5 Barter / +5 Repair,50%
Armored Vault 21 Jumpsuit,Light,8,15,180,None,50%
Assassin Suit,Light,14,20,7500,+10 Sneak,50%
Caesar's Armor,Medium,5,3,1500,+5 Barter / Legion Fame,50%
Chinese Stealth Armor,Light,12,20,500,+5 Sneak,50%
Gecko-Backed Leather Armor Reinforced,Light,15,18,2000,None,50%
Gladiator Armor,Light,12,15,160,None,50%
Great Khan Armored Leather,Light,8,7,100,None,50%
Great Khan Simple Armor,Light,5,7,100,None,50%
Joshua Graham's Armor,Light,15,8,2000,+5 Guns,50%
Leather Armor Reinforced,Light,10,15,1200,None,50%
Lightweight Leather Armor,Light,8,10,160,None,50%
NCR Trooper Fatigues,Light,2,26,300,None,50%
Radiation Suit,Light,4,5,60,+40 Rad Resist,50%
Raider Badlands Armor,Light,4,15,180,None,50%
Raider Blastmaster Armor,Light,4,15,180,-1 AGL,50%
Raider Painspike Armor,Light,4,15,180,+5 Melee,50%
Raider Sadist Armor,Light,4,15,180,None,50%
Sierra Madre Armor,Light,16,15,400,+5 Sneak,50%
Sierra Madre Armor Reinforced,Light,18,17,1000,+5 Sneak / +5 Energy Weapons,50%
Space Suit,Light,10,7,800,+60 Rad Resist,50%
Tribal Raiding Armor,Light,4,15,180,None,50%
Advanced Riot Gear,Medium,21,25,8494,+1 PER / +1 AGL,50%
Combat Armor Reinforced Mark 2,Medium,20,25,8000,None,50%
Lightweight Metal Armor,Medium,12,20,460,None,50%
NCR Bandoleer Armor,Medium,10,26,300,None,50%
NCR Ranger Combat Armor,Medium,20,30,7500,None,50%
Recon Armor,Medium,17,20,7200,None,50%
Riot Gear,Medium,20,30,7994,+1 PER,50%
Van Graff Combat Armor,Medium,16,25,6500,None,50%
1st Recon Assault Armor,Heavy,15,0,300,+5 Guns,50%
1st Recon Survival Armor,Heavy,15,0,300,+5 Survival / +5 Medicine,50%
Brotherhood T-51b Power Armor,Heavy,25,40,5200,+1 STR / +25 Rad Resist,50%
Gecko-Backed Metal Armor,Medium,17,33,2000,None,50%
Legate's Armor,Heavy,15,45,250,+5 Melee / +5 Unarmed,50%
Metal Armor Reinforced,Medium,16,30,3500,None,50%
Remnants Tesla Armor,Heavy,25,45,8200,+10 Energy Resist / +25 Rad Resist,50%
Scorched Sierra Power Armor,Heavy,24,40,6500,+4 STR / Fire DoT Aura,50%
T-45d Power Armor,Heavy,22,45,4500,+2 STR,50%
Tesla Armor,Heavy,20,45,6600,+10 Energy Resist / +25 Rad Resist,50%
Boone's Beret,Headwear,0,0.1,40,None,—
Caleb McCaffery's Hat,Headwear,0,0,0,None,—
Chalk's Headdress,Headwear,1,3,150,Melee Weapons +5,—
Fedora,Headwear,0,1,30,None,—
Jessup's Bandana,Headwear,0,1,6,Perception +1,—
Lucky Shades,Headwear,0,1,40,Luck +1,—
Marked Beast Eyes Helmet,Headwear,3,3,800,Melee Weapons +3 / HP +10,50%
Marked Beast Face Helmet,Headwear,3,3,800,Melee Weapons +3 / Crit +2%,50%
Marked Beast Helmet,Headwear,3,3,800,Energy Resist +10 / Energy Weapons +2,50%
Marked Beast Tribal Helmet,Headwear,4,2,250,Melee Weapons +3 / Unarmed +3,50%
Motor-Runner's Helmet,Headwear,2,0,8,Melee Weapons +5 / Perception +1,50%
Party Hat,Headwear,0,1,5,None,—
Police Hat,Headwear,0,1,8,None,—
Salt-Upon-Wounds' Helmet,Headwear,4,3,300,Crit +2% / Sneak +5,50%
Suave Gambler Hat,Headwear,0,1,8,Perception +1,—
Tuxedo Hat,Headwear,0,1,8,Perception +1,—
Ulysses' Mask,Headwear,3,2,250,Radiation Resist +50,—
Vance's Lucky Hat,Headwear,0,1,8,Perception +1,—
Vikki's Bonnet,Headwear,0,1,8,Perception +1,—
Ambassador Crocker's Suit,Clothing,1,1,6,None,—
Arcade's Lab Coat,Clothing,0,2,8,Science +5,—
Benny's Suit,Clothing,1,3,390,Barter +5 / Speech +5,—
Brotherhood Elder's Robe,Clothing,1,2,8,None,—
Daniel's Outfit,Clothing,2,2,700,Barter +5 / Medicine +5,—
Dean's Tuxedo,Clothing,0,2,6,Speech +5,—
Father Elijah's Robes,Clothing,2,2,6,BOS Faction Disguise,—
Followers Lab Coat,Clothing,0,2,16,Medicine +10 / Science +10,—
General Oliver's Uniform,Clothing,0,1,0,Charisma +2 / AP +20,—
Mysterious Stranger Outfit,Clothing,0,3,40,None,—
Naughty Nightwear,Clothing,0,1,200,Speech +10 / Luck +1,—
President Kimball's Suit,Clothing,0,2,5,Speech +5,—
RobCo Jumpsuit,Clothing,0,1,6,Repair +5,—
Trenchcoat,Clothing,0,3,40,None,—
US Army General Outfit,Clothing,1,1,1500,Speech +10 / Guns +5,—
Vault Lab Uniform,Clothing,0,1,6,Science +5,—
Vera's Outfit,Clothing,2,2,250,Barter +5 / Speech +5 / Charisma +1,—
Viva Las Vegas,Clothing,5,1,6,None,—
Christine's COS Recon Armor,Medium,19,20,9500,Sneak +5,50%
Courier Duster,Light,13,3,1700,Effects vary by alignment,50%
Ulysses' Duster,Light,13,3,1700,Crit Chance +5% / Charisma +1,50%
Armor of the 87th Tribe,Heavy,22,35,6495,AP +10 / Crit +3% / Charisma +1,50%

[BESTIARY.CSV]
Name,DT,HP,Perception,Speed_Factor,Base_Damage,Attack_Rate,Weakness_Weapon,Attack_Type,Resistances,XP_Yield
Bloatfly,0,10,5,1.5,4,2.0,None,Ranged,None,5
Giant Bloatfly,2,25,5,1.5,10,2.0,None,Ranged,None,10
Radroach,0,5,1,1.0,2,1.0,None,Melee,None,1
Mole Rat,0,20,4,1.0,5,1.5,None,Melee,None,5
Coyote,0,20,8,1.3,8,2.0,None,Melee,None,5
Coyote Alpha,2,50,8,1.3,15,2.0,None,Melee,None,15
Jackal Gang Member,1,40,4,1.0,12,1.5,None,Hybrid,None,10
Jackal Gang Leader,4,80,5,1.0,20,1.5,None,Hybrid,None,25
Bark Scorpion,4,75,8,1.0,18,1.5,None,Melee,Poison,20
Giant Bark Scorpion,8,150,8,1.0,40,1.5,None,Melee,Poison,35
Radscorpion,8,200,8,1.1,55,1.2,None,Melee,Poison,40
Albino Radscorpion,20,400,8,1.1,85,1.2,None,Melee,Poison,150
Spore Plant,0,50,3,0.0,15,1.0,Fire,Ranged,Poison,15
Giant Mantis,5,100,6,1.2,35,1.5,None,Melee,None,25
Giant Mantis Nymph,2,40,5,1.3,15,2.0,None,Melee,None,10
Giant Ant,2,30,5,1.0,10,1.0,None,Melee,Acid,8
Giant Ant Soldier,5,60,6,1.0,20,1.0,None,Melee,Acid,15
Gecko,2,35,4,1.2,12,1.5,None,Melee,None,15
Golden Gecko,4,70,4,1.3,18,1.5,None,Melee,Fire,25
Fire Gecko,4,80,5,1.3,15,1.5,None,Hybrid,Fire,30
Lakelurk,10,175,7,1.0,60,1.0,None,Hybrid,Sonic,40
Lakelurk King,14,300,8,1.0,90,1.0,None,Hybrid,Sonic,100
Bighorner,8,200,5,1.2,45,0.8,None,Melee,None,20
Bighorner Bull,12,350,5,1.3,80,0.8,None,Melee,None,40
Cazador,4,90,10,2.0,25,1.5,None,Melee,Poison,35
Giant Cazador,8,200,10,2.0,50,1.5,None,Melee,Poison,75
Tunneler,6,100,8,1.5,30,1.5,None,Melee,None,30
Powder Ganger,2,60,5,1.0,15,1.5,None,Hybrid,None,15
Powder Ganger Leader,4,100,5,1.0,25,1.5,None,Hybrid,None,30
Viper Gunslinger,2,50,5,1.0,18,1.5,None,Ranged,None,15
Viper Leader,6,100,6,1.0,30,1.5,None,Ranged,None,35
Great Khan,4,80,5,1.0,25,1.5,None,Hybrid,None,25
Great Khan Enforcer,8,130,5,1.0,40,1.5,None,Hybrid,None,50
Fiend,2,75,3,1.0,15,2.0,None,Hybrid,None,15
Fiend Leader,6,200,4,1.0,40,1.5,None,Hybrid,None,100
Omerta Thug,6,90,5,1.0,25,1.5,None,Hybrid,None,30
Chairmen Thug,4,80,5,1.0,20,1.5,None,Hybrid,None,25
Feral Ghoul,0,50,3,1.3,18,2.0,None,Melee,Radiation,15
Feral Ghoul Roamer,4,100,3,1.3,30,2.0,None,Melee,Radiation,40
Feral Ghoul Reaver,10,200,4,1.3,50,1.5,None,Melee,Radiation,75
Glowing One,5,150,5,1.0,25,1.5,None,Hybrid,Radiation,50
Nightkin,12,220,5,1.2,60,1.2,None,Melee,None,50
Super Mutant,10,250,5,1.0,50,1.0,None,Hybrid,None,75
Super Mutant Brute,14,350,5,1.0,65,1.0,None,Hybrid,None,100
Super Mutant Master,16,450,6,1.0,75,1.0,None,Hybrid,None,125
Legion Mongrel,2,50,6,1.3,15,2.0,None,Melee,None,15
Legion Recruit,6,80,5,1.0,25,1.2,None,Melee,None,30
Legion Soldier,8,120,5,1.0,35,1.2,None,Hybrid,None,50
Legion Veteran,10,160,6,1.0,45,1.2,None,Hybrid,None,75
Legionary Assassin,10,150,7,1.2,45,1.5,None,Hybrid,None,65
Centurion,14,250,7,1.0,60,1.2,None,Hybrid,None,100
NCR Trooper,10,100,5,1.0,30,1.5,None,Ranged,None,40
NCR Ranger,15,150,7,1.0,50,1.5,None,Ranged,None,75
NCR Veteran Ranger,20,200,8,1.0,70,1.5,None,Ranged,None,125
White Leg,6,120,5,1.0,30,1.2,None,Ranged,None,40
Dead Horses,5,100,5,1.0,25,1.2,None,Melee,None,30
Deathclaw,15,500,8,1.5,125,1.5,Industrial Hand,Melee,None,50
Deathclaw Alpha Male,18,650,9,1.6,150,1.5,Industrial Hand,Melee,None,100
Deathclaw Mother,20,750,9,1.4,175,1.2,Industrial Hand,Melee,None,150
Protectron,10,100,5,0.7,20,1.0,EMP,Ranged,Energy,40
Mister Gutsy,15,200,8,1.0,45,2.0,EMP,Ranged,Energy,60
Mister Handy,10,100,6,0.8,20,1.0,EMP,Hybrid,Fire,35
Sentry Bot,20,500,8,0.8,90,2.0,EMP,Ranged,Ballistic,150
Eyebot,5,50,10,1.5,12,2.0,EMP,Ranged,Energy,25
Securitron Mk I,15,200,8,1.0,35,2.0,EMP,Ranged,Energy,50
Securitron Mk II,20,300,8,1.0,60,2.0,EMP,Ranged,Energy,100

[CHEMS.CSV]
Name,Effect,Duration,Addiction_Risk,Addiction_Debuff,Chem_Family,Value,Weight
Buffout,+2 STR / +2 END / +60 Max HP,4m,25%,-1 STR / -1 END,Buffout,20,0
Med-X,+25 DR,4m,25%,-1 AGI,Med-X,20,0
Psycho,+25% DMG,4m,25%,-1 PER / -1 END,Psycho,20,0
Stimpak,Restore HP,0,0%,None,Medicine,75,0
Super Stimpak,Restore 100 HP,0,0%,None,Medicine,150,0
RadAway,Remove 150 Rads,0,0%,None,Medicine,20,0
Rad-X,+25 Rad Resistance,4m,0%,None,Medicine,20,0
Antivenom,Remove Poison,0,0%,None,Medicine,25,0
Hydra,Restore crippled limb,0,0%,None,Medicine,55,0
Fixer,Remove addiction,0,0%,None,Medicine,20,0
Doctor's Bag,Restore all crippled limbs,0,0%,None,Medicine,55,1
Jet,+20 AP / +1 AGI,1m,25%,-1 PER / -1 END,Jet,20,0
Ultrajet,+30 AP / +1 AGI,2m,30%,-1 AGI / -1 STR,Jet,50,0
Turbo,Slow time / +30% AP,3s,15%,-2 PER,Turbo,20,0
Mentats,+2 INT / +2 PER,1m,10%,-1 INT / -1 PER,Mentats,20,0
Slasher,+3 STR / +3 END / +25% DMG,2m,20%,-1 STR / -1 END,Buffout,20,0
Nuka-Cola,Restore 20 HP / +5 RAD,0,0%,None,Food,20,1
Nuka-Cola Quartz,Restore 20 HP / Night Vision,5m,0%,None,Food,40,1
Atomic Cocktail,Restore 20 HP / +30 RAD,0,0%,None,Alcohol,25,1
Steady,+2 AGL / No weapon sway,2m,15%,-1 PER,Steady,20,0
Rocket,+25% Melee DMG / +25 AP,1m,20%,-1 AGL,Rocket,20,0
Cateye,Night Vision,2m,0%,None,Cateye,20,0
Dixon's Jet,+15 AP,30s,30%,-1 PER / -1 END,Jet,5,0
Party Time Mentats,+5 CHR / +2 INT,1m,15%,-1 INT / -1 PER,Mentats,20,0
Blood Shield,+50 Poison Resist,2m,0%,None,Medicine,50,0.5
Rushing Water,+50% Attack Speed,30s,15%,-1 AGL,Rushing Water,20,1
Ant Nectar,+4 STR / -3 INT / Fire Resist,2m,10%,-2 INT,Ant Nectar,20,0.25
Healing Powder,Restore 15 HP / -2 PER,0,0%,None,Medicine,5,0.03
Healing Poultice,Restore 20 HP / -2 PER,0,0%,None,Medicine,20,0.03
Purified Water,Restore 20 HP,0,0%,None,Food,20,1
Dirty Water,Restore 5 HP / +5 RAD,0,0%,None,Food,10,1
Beer,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,2,1
Scotch,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,10,1
Vodka,+1 END / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,20,1
Wine,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,10,1
Absinthe,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,20,1
Moonshine,+2 STR / -2 INT,4m,10%,-2 CHR,Alcohol,20,1
Gecko Steak,Restore 50 HP,0,0%,None,Food,5,1
Brahmin Steak,Restore 50 HP,0,0%,None,Food,5,0.8
Cram,Restore 15 HP,0,0%,None,Food,5,1
InstaMash,Restore 15 HP,0,0%,None,Food,5,1
Fancy Lads Snack Cakes,Restore 15 HP,0,0%,None,Food,5,1
Dandy Boy Apples,Restore 15 HP,0,0%,None,Food,5,1
YumYum Deviled Eggs,Restore 15 HP,0,0%,None,Food,5,1
Salisbury Steak,Restore 20 HP,0,0%,None,Food,5,1
Pre-War Steak,Restore 20 HP,0,0%,None,Food,5,1
MRE,Restore 30 HP,0,0%,None,Food,50,0.2
Junk Food,Restore 10 HP,0,0%,None,Food,5,1
Bighorner Steak,+2 HP/s for 10s,0,0%,None,Food,5,0.8
Iguana on a Stick,+1 HP/s for 12s,0,0%,None,Food,5,1
Trail Mix,+5 HP/s for 15s / +5 Max AP,0,0%,None,Food,5,3
Mole Rat Wonder Meat,Restore HP / +RAD,0,0%,None,Food,20,1
Wasteland Omelet,Restore HP / +Max HP,0,0%,None,Food,100,1
Cook-Cook's Fiend Stew,Restore HP / +STR,0,0%,None,Food,25,1
Caravan Lunch,Restore HP,0,0%,None,Food,5,2.5
Brahmin Wellington,Restore HP,0,0%,None,Food,5,0.8
Desert Salad,Restore HP,0,0%,None,Food,5,0.2
Grilled Mantis,Restore HP,0,0%,None,Food,8,1
Banana Yucca Fruit,Restore 5 HP,0,0%,None,Food,6,0.5
Barrel Cactus Fruit,Restore 5 HP,0,0%,None,Food,5,0.2
Pinyon Nuts,Restore HP,0,0%,None,Food,5,0.03
Broc Flower,Stimpak crafting ingredient,0,0%,None,Food,3,0.01
Xander Root,Stimpak crafting ingredient,0,0%,None,Food,0,0.02
Nightstalker Tail,Antivenom crafting ingredient,0,0%,None,Food,18,1
Sunset Sarsaparilla,Restore 20 HP,0,0%,None,Food,3,1
Nuka-Cola Victory,Restore HP / +AP,0,0%,None,Food,75,1
Nuka-Cola Quantum,Restore HP / +Max AP,0,0%,None,Food,30,1
Whiskey,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,10,1
Rum & Nuka,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,20,1
Wasteland Tequila,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,20,1
Sierra Madre Martini,+2 STR / Restore HP,2m,10%,-1 END,Alcohol,20,0
Battle Brew,Buffout + alcohol effects,4m,15%,-1 END,Alcohol,150,1
Rebound,+AP regeneration,2m,15%,-1 PER,Rebound,20,0
Sacred Datura Root,Chem crafting ingredient,0,0%,None,Medicine,10,0.02
Ant Queen Pheromones,+25% companion DMG,5m,0%,None,Medicine,75,1

[MISC.CSV]
Name,Weight,Value,Category
Scrap Metal,1.0,1,Junk
Scrap Electronics,0.5,25,Electronics
Sensor Module,0.5,65,Electronics
Fission Battery,1.0,135,Electronics
Conductors,0.2,20,Electronics
Pilot Light,0.1,25,Electronics
Wonderglue,1.0,10,Adhesive
Duct Tape,0.5,5,Adhesive
Surgical Tubing,0.1,15,Crafting
Tin Can,0.5,1,Junk
Leather Belt,0.2,2,Junk
Abraxo Cleaner,1.0,8,Cleaning
Empty Nuka-Cola Bottle,1.0,1,Container
Sunset Sarsaparilla Bottle,1.0,1,Container
Sunset Sarsaparilla Star Cap,0.0,25,Special
Caravan Deck,1.0,50,Game
Caravan Card (single),0.0,5,Game
Pre-War Money,0.0,10,Currency
NCR Money,0.0,40,Currency
Legion Coin,0.0,50,Currency
Vault 13 Canteen,1,2,Aid

[RECIPES.CSV]
Recipe_Name,Skill_Req,Components,Output,Quarantine_Cap
Weapon Repair Kit,Repair 50,1 Scrap Electronics / 1 Scrap Metal,1 Weapon Repair Kit,5
Doctor's Bag (crafted),Medicine 45,1 Surgical Tubing / 1 Wonderglue / 2 Stimpak,1 Doctor's Bag,3
Frag Grenade (crafted),Explosives 35,1 Tin Can / 1 Scrap Metal,1 Frag Grenade,10
Molotov Cocktail,Survival 25,1 Whiskey / 1 Duct Tape,1 Molotov Cocktail,10
Nuka Grenade,Repair 45,1 Empty Nuka-Cola Bottle / 1 Fission Battery / 1 Abraxo Cleaner,1 Nuka Grenade,5
Homemade Knife,Survival 25,1 Tin Can,1 Homemade Knife,3
Hand-Loaded .308,Repair 55,1 .308 Casing / Powder / Lead,10x .308 Standard,20
Hand-Loaded .44,Repair 55,1 .44 Casing / Powder / Lead,10x .44 Standard,20
Snakebite Tourniquet,Survival 45,1 Leather Belt / 1 Duct Tape,1 Snakebite Tourniquet,5
Wasteland Omelet,Survival 50,2 Brahmin Egg,1 Wasteland Omelet,3

[QUEST_ITEMS.CSV]
Name,Associated_Quest,Tradeable,Special_Property,Weight
Platinum Chip,The House Always Wins / Wild Card,No,Upgrades Securitron army to Mk II — core main quest item,0.0
Lucky 38 VIP Keycard,The House Always Wins,No,Grants access to Lucky 38 penthouse floors,0.0
Benny's Lighter,Ring-a-Ding-Ding,No,Quest evidence incriminating Benny; required for confrontation,0.0
Benny's Hat,Ring-a-Ding-Ding,Yes,+1 CHR cosmetic reward,0.5
NCR Dog Tags,Render Unto Caesar,No,Legion quest item; surrendered to Caesar for reputation,0.0
Remnants Passcard,For Auld Lang Syne,No,Opens Remnants bunker beneath Deathclaw promontory,0.0
Euclid's C-Finder,Sunshine Boogie / That Lucky Old Sun,Yes,Activates ARCHIMEDES II orbital strike once per day,0.5
ARCHIMEDES II Activation Holotape,That Lucky Old Sun,No,One-time unlock for ARCHIMEDES II at HELIOS One,0.0
Omertas Hit List,How Little We Know,No,Evidence of Omerta arms deal; used for quest resolution,0.0
Vault 3 Master Key,Hard Luck Blues,No,Access to Vault 3 — required for quest progression,0.0
Lucky 38 Presidential Suite Key,The House Always Wins,No,Player home key — reward from Mr. House,0.0
Snowglobe (set of 7),Various / Jane at Lucky 38,Yes,Trade each to Jane for 2000 caps; collectible set,0.5
Khans Disguise,Oh My Papa / Aba Daba Honeymoon,Yes,Faction disguise allowing passage through Khan territory,2.0
NCR Emergency Radio,Any NCR-aligned quest,No,Calls NCR emergency backup squad,0.5
Deathclaw Egg,Come Fly With Me,Yes,Quest/crafting item; handled with care,0.5
HELIOS One Power Chip,That Lucky Old Sun,No,Required to route HELIOS One power; determines faction outcome,0.0
Mysterious Magnum,Lonesome Road / Brahmin Roundup,Yes,Unique .357 revolver — found at Prospector Saloon,2.0
Joshua's Bible,Honest Hearts,No,Personal item belonging to Joshua Graham; story significance,0.5
Burned Man's Flag,Honest Hearts,No,Faction flag recovered during Dead Horses quest line,0.5

[VENDORS.CSV]
Vendor_Name,Location,Base_Caps,Repair_Skill,Faction,Restock_Days,Accepted_Currencies
Chet,Goodsprings,500,15,Independent,3,Caps
Vendortron,Gun Runners,8000,100,Independent,3,Caps / NCR / Legion
Alexander,188 Trading Post,1500,30,Independent,3,Caps
Michelle Kerr,188 Trading Post,800,15,Independent,3,Caps
Samuel,Mojave Outpost,1000,25,NCR,3,Caps / NCR
Camp McCarran Quartermaster,Camp McCarran,3000,50,NCR,3,Caps / NCR
Blake,Crimson Caravan,2500,30,Crimson Caravan,3,Caps
Dale Barton,The Fort,1200,20,Legion,4,Caps / Legion
Knight Torres,Hidden Valley Bunker,1500,100,Brotherhood of Steel,4,Caps
Mick,Freeside,1200,25,Independent,3,Caps
Ralph,Freeside,900,40,Independent,3,Caps
Old Lady Gibson,Gibson Scrap Yard,800,40,Independent,4,Caps
Cliff Briscoe,Novac,750,20,Independent,3,Caps
Jules,North Vegas Square,600,15,Independent,3,Caps
Trudy,Goodsprings,400,15,Independent,3,Caps
Johnson Nash,Goodsprings,500,20,Independent,3,Caps
Doc Mitchell,Goodsprings,300,10,Independent,3,Caps
Lacey,Mojave Outpost,700,20,Independent,3,Caps
Francine Garret,Atomic Wrangler,900,15,Independent,3,Caps
James Garret,Atomic Wrangler,900,15,Independent,3,Caps
Mister Holdout,The Strip,600,25,Independent,3,Caps / NCR / Legion
Gloria Van Graff,Silver Rush,3000,50,Van Graffs,4,Caps
Great Khan Armorer,Red Rock Canyon,1200,50,Great Khans,4,Caps
Jack,Red Rock Canyon,800,25,Great Khans,4,Caps
Doctor Usanagi,New Vegas Medical Clinic,800,10,Independent,3,Caps
Dr. Ada Straus,Old Mormon Fort,600,10,Followers of the Apocalypse,3,Caps
Julie Farkas,Old Mormon Fort,700,15,Followers of the Apocalypse,3,Caps
Quartermaster Bardon,Hoover Dam,3000,50,NCR,4,Caps / NCR
Sgt. Daniel Contreras,Camp McCarran,2000,40,NCR,3,Caps / NCR
Quartermaster Mayes,Camp Forlorn Hope,1500,40,NCR,4,Caps / NCR
Ike,NCR Correctional Facility,800,25,Powder Gangers,4,Caps
Dixon,Freeside,500,15,Independent,3,Caps
Jas Wilkins,Aerotech Office Park,400,10,Independent,3,Caps
Boomer Munitions Manager,Nellis Air Force Base,2000,40,Boomers,4,Caps
Joshua Graham,Zion Canyon,1500,50,New Canaanites,4,Caps
Sink Central Intelligence Unit,Big MT,1000,75,Think Tank,3,Caps
Commissary Terminal,Sierra Madre,2000,25,Automated,3,Sierra Madre Chips
Traveling Merchant,Mojave Wasteland,800,30,Independent,4,Caps
Street Vendor,Westside,400,10,Independent,3,Caps

[WEAPON_MODS.CSV]
Name,Weapon,Effect,Value,Weight
.357 Revolver Long Barrel,.357 Magnum Revolver,Increases damage,250,0
.357 Revolver HD Cylinder,.357 Magnum Revolver,Increases condition by 50%,450,0
.44 Revolver Scope,.44 Magnum Revolver,Adds short-range scope,1100,0
.44 Revolver Heavy Frame,.44 Magnum Revolver,Increases condition by 50%,1000,0
.45 AP HD Slide,.45 Auto Pistol,Increases condition by 50%,100,0
.45 AP Silencer,.45 Auto Pistol,Reduces weapon noise,100,0
9mm Pistol Extended Mags,9mm Pistol,Increases magazine capacity,250,0
9mm Pistol Scope,9mm Pistol,Adds short-range scope,150,0
10mm Pistol Silencer,10mm Pistol,Reduces weapon noise,750,0
10mm Pistol Extended Mags,10mm Pistol,Increases magazine capacity,750,0
10mm Pistol Laser Sight,10mm Pistol,Decreases spread,650,0
12.7mm Pistol Silencer,12.7mm Pistol,Reduces weapon noise,1750,0
Hunting Rev. 6-Shot Cylinder,Hunting Revolver,Increases cylinder capacity,1100,0
Hunting Rev. Match Barrel,Hunting Revolver,Decreases spread,1400,0
Anti-Mat. Rifle CF Parts,Anti-Materiel Rifle,Reduces weight,2200,0
Anti-Mat. Rifle Custom Bolt,Anti-Materiel Rifle,Increases rate of fire,3000,0
Anti-Mat. Rifle Suppressor,Anti-Materiel Rifle,Reduces weapon noise,2500,0
Assault Carbine Extended Magazines,Assault Carbine,Increases magazine capacity,1300,0
Assault Carb. Ext. Mags,Assault Carbine,Increases magazine capacity,1300,0
Assault Carb. Forged Receiver,Assault Carbine,Increases condition,1500,0
Assault Carb. Light Bolt,Assault Carbine,Increases rate of fire,1950,0
Auto. Rifle Upgr. Internals,Automatic Rifle,Increases rate of fire,250,0
Brush Gun Forged Receiver,Brush Gun,Increases condition,1750,0
Cby. Rep. Custom Action,Cowboy Repeater,Increases rate of fire,850,0
Cby. Rep. Long Tube,Cowboy Repeater,Increases magazine capacity,750,0
Cby. Rep. Maple Stock,Cowboy Repeater,Reduces weight,675,0
Hunting Rifle Extended Mag,Hunting Rifle,Increases magazine capacity,1600,0
Hunting Rifle Scope,Hunting Rifle,Adds high-powered scope,1300,0
Hunting Rifle Custom Action,Hunting Rifle,Increases rate of fire,1200,0
Light MG Expanded Drums,Light Machine Gun,Increases magazine capacity,3200,0
Sniper Rifle Carbon Fiber Parts,Sniper Rifle,Reduces weight,1500,0
Sniper Rifle Suppressor,Sniper Rifle,Reduces weapon noise,1800,0
Svc. Rifle Forged Receiver,Service Rifle,Increases condition,650,0
Svc. Rifle Upgraded Springs,Service Rifle,Increases rate of fire,850,0
Trail Carbine Scope,Trail Carbine,Adds mid-range scope,1500,0
Varmint Rifle Extended Mags,Varmint Rifle,Increases magazine capacity,75,0
Varmint Rifle Night Scope,Varmint Rifle,Adds night-vision scope,125,0
Varmint Rifle Silencer,Varmint Rifle,Reduces weapon noise,100,0
.45 Auto SMG Comp.,.45 Auto Submachine Gun,Reduces spread,250,0
.45 Auto SMG Drums,.45 Auto Submachine Gun,Increases magazine capacity,250,0
9mm SMG Drums,9mm Submachine Gun,Increases magazine capacity,800,0
9mm SMG Light Bolt,9mm Submachine Gun,Increases rate of fire,850,0
10mm SMG Extended Mags,10mm Submachine Gun,Increases magazine capacity,1000,0
10mm SMG Recoil Comp.,10mm Submachine Gun,Decreases spread,1100,0
12.7mm Submachine Gun Silencer,12.7mm Submachine Gun,Reduces weapon noise,2750,0
12.7mm SMG Laser Sight,12.7mm Submachine Gun,Decreases spread,2600,0
12.7mm SMG Stacked Magazine,12.7mm Submachine Gun,Increases magazine capacity,2200,0
12.7mm SMG Suppressor,12.7mm Submachine Gun,Reduces weapon noise,2800,0
Sil. .22 SMG Exp. Drums,Silenced .22 SMG,Increases magazine capacity,1100,0
Hunting Shotgun Long Tube,Hunting Shotgun,Increases magazine capacity,1750,0
Hunting Shotgun Choke,Hunting Shotgun,Decreases spread,1500,0
K9000 Mod - Resla Roil,K9000 Cyberdog Gun,Increases damage,3000,0
K9000 Mod - Mentat Chow,K9000 Cyberdog Gun,Increases rate of fire,3000,0
Minigun Damped Subframe,Minigun,Reduces spread,2000,0
Minigun High-Speed Motor,Minigun,Increases rate of fire,2750,0
SMMG Mechanical Upgrade,Shoulder Mounted Machine Gun,Increases condition,9750,0
SMMG Recoil Compensator,Shoulder Mounted Machine Gun,Reduces spread,9750,0
SMMG Extended Magazine,Shoulder Mounted Machine Gun,Increases magazine capacity,10750,0
Laser Pistol Combat Sights,Laser Pistol,Adds iron sights,125,0
Laser Pistol Focus Optics,Laser Pistol,Increases damage,200,0
Laser Pistol Recycler,Laser Pistol,Every 4th shot is free,275,0
Plasma Def. Hi-Cap Terminal,Plasma Defender,Increases ammo capacity,1600,0
Plasma Def. Scope,Plasma Defender,Adds short-range scope,1200,0
Plasma Def. Sheath Stabilizer,Plasma Defender,Decreases spread,1300,0
Plas. Pistol Hi-Energy Ionizer,Plasma Pistol,Increases damage,325,0
Plas. Pistol Mag. Accelerator,Plasma Pistol,Increases projectile speed,225,0
Plas. Pistol Recycler,Plasma Pistol,Every 4th shot is free,325,0
Holorifle Focus Optics,Holorifle,Increases damage,300,0
Holorifle Adv. Calibration,Holorifle,Decreases spread,200,0
Holorifle Reinf. Components,Holorifle,Improves weapon condition,150,0
LAER Mod - Auxiliary Recharger Clip,LAER,Every 4th shot is free,2498,0
LAER Mod - Prismatic Lens,LAER,Splits beam for increased damage,2998,0
Laser RCW Recycler,Laser RCW,Every 4th shot is free,1900,0
Laser Rifle Focus Optics,Laser Rifle,Increases damage,900,0
Laser Rifle Beam Splitter,Laser Rifle,Splits beam for increased damage,650,0
Laser Rifle Scope,Laser Rifle,Adds long-range scope,850,0
Plasma Rifle Mag. Accelerator,Plasma Rifle,Increases projectile speed,800,0
Tri-beam LR Focus Optics,Tri-beam Laser Rifle,Increases damage,1900,0
Tri-beam LR HD Caps,Tri-beam Laser Rifle,Increases condition,2100,0
Tri-beam LR Hi-Cap Terminal,Tri-beam Laser Rifle,Increases ammo capacity,1800,0
Flamer Expanded Tanks,Flamer,Increases magazine capacity,1300,0
Gat. Laser Focus Optics,Gatling Laser,Increases damage,3000,0
Gat. Laser CF Frame,Gatling Laser,Reduces weight,2200,0
Plasma Caster HS Electrode,Plasma Caster,Increases rate of fire,2500,0
25mm G. APW Exp. Drum,25mm Grenade APW,Increases magazine capacity,1200,0
25mm G. APW Long Barrel,25mm Grenade APW,Increases projectile speed,1300,0
25mm G. APW Upgraded Int.,25mm Grenade APW,Increases rate of fire,1900,0
Grenade Rifle Long Barrel,Grenade Rifle,Increases range,700,0
Fat Man Little Boy Kit,Fat Man,Reduces weight,2500,0
Grenade MG High-Speed Kit,Grenade Machinegun,Increases rate of fire,3500,0
Miss. Launcher Guidance Sys.,Missile Launcher,Increases accuracy,1500,0
Red Glare Alpha Strike,Red Glare,Increases rocket speed,10750,0
Red Glare Auto Launcher,Red Glare,Increases rate of fire,10250,0
Red Glare Far Sighting,Red Glare,Adds zoom,10500,0
Chainsaw Alloy Frame,Chainsaw,Reduces weight,1500,0
Chainsaw Carbide Teeth,Chainsaw,Increases damage,1800,0
Chainsaw HD Chain,Chainsaw,Increases condition,1200,0
Katana Authentic Blade,Katana,Increases damage,1000,0
Katana Balanced Grip,Katana,Increases attack speed,950,0
Katana Protective Sheath,Katana,Increases condition,849,0
Ripper Carbide Teeth,Ripper,Increases damage,1500,0
Ripper HD Chain,Ripper,Increases condition,1200,0
Baseball Bat Cork Core,Baseball Bat,Increases attack speed,350,0
Baseball Bat Maple Body,Baseball Bat,Increases condition,325,0
Baseball Bat Nails,Baseball Bat,Increases damage,315,0
War Club Casings,War Club,Increases damage,250,0
War Club Honors,War Club,Increases attack speed,250,0
Bear Trap Fist HD Springs,Bear Trap Fist,Increases damage,250,0
Power Fist Chromed Tubes,Power Fist,Increases condition,1200,0
Power Fist Hi-Cap Valves,Power Fist,Increases damage,1400,0
Power Fist Ported Chambers,Power Fist,Increases attack speed,1500,0
`;

// ── ITEM LOOKUP ──────────────────────────────────────────────
// Searches all item CSV tables by name and returns { wgt, val, type }
// or null if the item isn't in any table. Case-insensitive.
// Lazy-initializes parsed cache on first call so the CSV is only parsed once.
let _itemCache = null;

function _buildItemCache() {
  _itemCache = new Map();
  const tables = [
    // [sectionHeader, nameCol, weightCol, valueCol, itemType]
    ['[WEAPONS.CSV]', 'Weapon_Name', 'Weight', 'Value', 'weapon'],
    ['[AMMO.CSV]', 'Caliber', 'Weight_Per_Unit', null, 'ammo'],
    ['[ARMOR.CSV]', 'Name', 'Weight', 'Value', 'armor'],
    ['[CHEMS.CSV]', 'Name', 'Weight', 'Value', 'aid'],
    ['[MISC.CSV]', 'Name', 'Weight', 'Value', 'misc'],
    ['[QUEST_ITEMS.CSV]', 'Name', 'Weight', null, 'misc'],
    ['[WEAPON_MODS.CSV]', 'Name', 'Weight', 'Value', 'mod'],
  ];

  for (const [header, nameCol, wgtCol, valCol, type] of tables) {
    const start = databaseCSVs.indexOf(header);
    if (start === -1) continue;
    // Find end: next section header or end of string
    const nextSection = databaseCSVs.indexOf('\n[', start + header.length);
    const block = databaseCSVs.substring(start, nextSection === -1 ? undefined : nextSection);
    const lines = block.split('\n').filter(l => l.trim() && !l.startsWith('['));
    if (lines.length < 2) continue;
    const headers = lines[0].split(',');
    const nameIdx = headers.indexOf(nameCol);
    const wgtIdx = headers.indexOf(wgtCol);
    const valIdx = valCol ? headers.indexOf(valCol) : -1;
    if (nameIdx === -1) continue;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const name = (cols[nameIdx] || '').trim();
      if (!name) continue;
      // For ammo, key is "Caliber Subtype" (e.g. "5.56mm Standard")
      const key =
        type === 'ammo' && cols[1] ? `${name} ${cols[1].trim()}`.toLowerCase() : name.toLowerCase();
      _itemCache.set(key, {
        wgt: wgtIdx >= 0 ? parseFloat(cols[wgtIdx]) || 0 : 0,
        val: valIdx >= 0 ? parseFloat(cols[valIdx]) || 0 : 0,
        type: type,
      });
      // For ammo, also index by caliber alone (first match wins)
      if (type === 'ammo' && !_itemCache.has(name.toLowerCase())) {
        _itemCache.set(name.toLowerCase(), {
          wgt: wgtIdx >= 0 ? parseFloat(cols[wgtIdx]) || 0 : 0,
          val: 0,
          type: 'ammo',
        });
      }
    }
  }
}

function lookupItemInDb(name) {
  if (!name) return null;
  if (!_itemCache) _buildItemCache();
  const key = name.toLowerCase().trim();
  // 1. Exact match
  const exact = _itemCache.get(key);
  if (exact) return exact;
  // 2. Fuzzy fallback: skip very short tokens; substring match (longest name wins)
  if (key.length < 3) return null;
  let best = null;
  let bestLen = 0;
  for (const [dbKey, entry] of _itemCache) {
    if (dbKey.includes(key) || key.includes(dbKey)) {
      if (dbKey.length > bestLen) {
        best = entry;
        bestLen = dbKey.length;
      }
    }
  }
  return best;
}

// ── U9-4: QUEST ITEM DETAIL (CONSULT reserved-column surfacing) ───────────
// Returns the QUEST_ITEMS.CSV columns that lookupItemInDb() does not expose
// (Associated_Quest / Special_Property) — authored data that previously had
// no consumer. Read-only, parsed once and cached. Game-agnostic: reads
// whatever databaseCSVs the active game loaded (Protocol 38); the same parse
// exists in db_fo3.js.
let _questItemCache = null;
function getQuestItemDetail(name) {
  if (!name) return null;
  if (!_questItemCache) {
    _questItemCache = new Map();
    const start = databaseCSVs.indexOf('[QUEST_ITEMS.CSV]');
    if (start !== -1) {
      const nextSection = databaseCSVs.indexOf('\n[', start + 18);
      const block = databaseCSVs.substring(start, nextSection === -1 ? undefined : nextSection);
      const lines = block.split('\n').filter(l => l.trim() && !l.startsWith('['));
      const h = (lines[0] || '').split(',');
      const ix = n => h.indexOf(n);
      const iName = ix('Name');
      const iQuest = ix('Associated_Quest');
      const iProp = ix('Special_Property');
      for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(',');
        const nm = (c[iName] || '').trim();
        if (!nm) continue;
        _questItemCache.set(nm.toLowerCase(), {
          name: nm,
          associatedQuest: iQuest >= 0 ? (c[iQuest] || '').trim() : '',
          specialProperty: iProp >= 0 ? (c[iProp] || '').trim() : '',
        });
      }
    }
  }
  return _questItemCache.get(name.toLowerCase().trim()) || null;
}

// ── WU-N5: CHEMS TABLE (BIO-SCAN advisory) ────────────────────────────────
// Returns the active game's CHEMS.CSV rows with the addiction columns that
// lookupItemInDb() does not expose (Addiction_Risk / Addiction_Debuff / Effect /
// Chem_Family). Read-only, parsed once and cached. Game-agnostic: reads whatever
// databaseCSVs the active game loaded (Protocol 38) — the same parse exists in
// db_fo3.js so the BIO-SCAN terminal works in either context with no logic change.
let _chemsTableCache = null;
function getChemsTable() {
  if (_chemsTableCache) return _chemsTableCache;
  _chemsTableCache = [];
  const start = databaseCSVs.indexOf('[CHEMS.CSV]');
  if (start === -1) return _chemsTableCache;
  const nextSection = databaseCSVs.indexOf('\n[', start + 11);
  const block = databaseCSVs.substring(start, nextSection === -1 ? undefined : nextSection);
  const lines = block.split('\n').filter(l => l.trim() && !l.startsWith('['));
  if (lines.length < 2) return _chemsTableCache;
  const headers = lines[0].split(',').map(h => h.trim());
  const ni = headers.indexOf('Name');
  const ei = headers.indexOf('Effect');
  const di = headers.indexOf('Duration');
  const ari = headers.indexOf('Addiction_Risk');
  const adi = headers.indexOf('Addiction_Debuff');
  const fi = headers.indexOf('Chem_Family');
  if (ni === -1) return _chemsTableCache;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const name = (cols[ni] || '').trim();
    if (!name) continue;
    _chemsTableCache.push({
      name,
      effect: ei >= 0 ? (cols[ei] || '').trim() : '',
      // Native USE (Part A): the raw Duration column ("4m"/"1h"/"30s"/"0"), needed to
      // decide whether a leftover modifier clause becomes a timed BUFF status effect
      // (see _durationToTicks() in ui-render.js). Previously unexposed — BIO-SCAN never
      // needed it, but the deterministic USE parser does (Protocol 3 — data authority).
      duration: di >= 0 ? (cols[di] || '').trim() : '',
      addictionRisk: ari >= 0 ? (cols[ari] || '').trim() : '',
      addictionDebuff: adi >= 0 ? (cols[adi] || '').trim() : '',
      family: fi >= 0 ? (cols[fi] || '').trim() : '',
    });
  }
  return _chemsTableCache;
}

// ── WU-N1: WEAPON COMBAT-STAT LOOKUP ──────────────────────────────────────
// Returns the full WEAPONS.CSV combat row for a weapon name (fields beyond the
// {wgt,val,type} that lookupItemInDb() exposes) — used by the V.A.T.S. AP-strike
// optimizer (and later by THREAT/TTK). Exact match first, then longest-substring
// fuzzy fallback (mirrors lookupItemInDb). Returns null if the name isn't a weapon.
let _weaponStatCache = null;
function lookupWeaponStats(name) {
  if (!name) return null;
  if (!_weaponStatCache) {
    _weaponStatCache = new Map();
    const start = databaseCSVs.indexOf('[WEAPONS.CSV]');
    if (start !== -1) {
      const nextSection = databaseCSVs.indexOf('\n[', start + 13);
      const block = databaseCSVs.substring(start, nextSection === -1 ? undefined : nextSection);
      const lines = block.split('\n').filter(l => l.trim() && !l.startsWith('['));
      const h = (lines[0] || '').split(',');
      const ix = n => h.indexOf(n);
      const iName = ix('Weapon_Name');
      const cols = {
        baseDamage: ix('Base_Damage'),
        critDamage: ix('Crit_Damage'),
        critMult: ix('Crit_Multiplier'),
        aps: ix('Attacks_Per_Second'),
        reqUnarmed: ix('Req_Unarmed'),
        reqStr: ix('Req_STR'),
        reach: ix('Reach'),
        specialAttackAP: ix('Special_Attack_AP'),
      };
      const iRules = ix('Special_Rules');
      const iAmmo = ix('Ammo_Type');
      for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(',');
        const wn = (c[iName] || '').trim();
        if (!wn) continue;
        const entry = { name: wn };
        for (const [k, idx] of Object.entries(cols))
          entry[k] = idx >= 0 ? parseFloat(c[idx]) || 0 : 0;
        entry.specialRules = iRules >= 0 ? (c[iRules] || '').trim() : '';
        entry.ammoType = iAmmo >= 0 ? (c[iAmmo] || '').trim() : '';
        _weaponStatCache.set(wn.toLowerCase(), entry);
      }
    }
  }
  const key = name.toLowerCase().trim();
  const exact = _weaponStatCache.get(key);
  if (exact) return exact;
  if (key.length < 3) return null;
  let best = null;
  let bestLen = 0;
  for (const [k, v] of _weaponStatCache) {
    if ((k.includes(key) || key.includes(k)) && k.length > bestLen) {
      best = v;
      bestLen = k.length;
    }
  }
  return best;
}

// ── WU-N3: BESTIARY COMBAT-STAT LOOKUP ────────────────────────────────────
// Returns the BESTIARY.CSV row for an enemy name (hp/dt/baseDamage/attackRate/
// weakness/resistances) — used by the native THREAT assessment (TTK + ammo-burn).
// Exact match first, then longest-substring fuzzy fallback (mirrors lookupItemInDb
// / lookupWeaponStats). Returns null if the name isn't a known foe (Protocol 3:
// the caller shows NO ENTRY IN BESTIARY rather than inventing stats).
let _bestiaryCache = null;
// Lazily builds _bestiaryCache from BESTIARY.CSV. Extracted from
// lookupBestiaryEntry() (behavior-preserving) so getBestiaryNames() — the
// content-aware quick-log autocomplete source, Step 2 Phase 2 B1 upgrade —
// can warm the same cache without a second CSV parse (Protocol 22).
function _ensureBestiaryCache() {
  if (_bestiaryCache) return;
  _bestiaryCache = new Map();
  const start = databaseCSVs.indexOf('[BESTIARY.CSV]');
  if (start !== -1) {
    const nextSection = databaseCSVs.indexOf('\n[', start + 14);
    const block = databaseCSVs.substring(start, nextSection === -1 ? undefined : nextSection);
    const lines = block.split('\n').filter(l => l.trim() && !l.startsWith('['));
    const h = (lines[0] || '').split(',');
    const ix = n => h.indexOf(n);
    const iName = ix('Name');
    const numCols = {
      dt: ix('DT'),
      hp: ix('HP'),
      baseDamage: ix('Base_Damage'),
      attackRate: ix('Attack_Rate'),
      xpYield: ix('XP_Yield'),
    };
    const iWeak = ix('Weakness_Weapon');
    const iResist = ix('Resistances');
    const iAttackType = ix('Attack_Type');
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(',');
      const nm = (c[iName] || '').trim();
      if (!nm) continue;
      const entry = { name: nm };
      for (const [k, idx] of Object.entries(numCols))
        entry[k] = idx >= 0 ? parseFloat(c[idx]) || 0 : 0;
      entry.weakness = iWeak >= 0 ? (c[iWeak] || '').trim() : '';
      entry.resistances = iResist >= 0 ? (c[iResist] || '').trim() : '';
      entry.attackType = iAttackType >= 0 ? (c[iAttackType] || '').trim() : '';
      _bestiaryCache.set(nm.toLowerCase(), entry);
    }
  }
}
function lookupBestiaryEntry(name) {
  if (!name) return null;
  _ensureBestiaryCache();
  const key = name.toLowerCase().trim();
  const exact = _bestiaryCache.get(key);
  if (exact) return exact;
  if (key.length < 3) return null;
  let best = null;
  let bestLen = 0;
  for (const [k, v] of _bestiaryCache) {
    if ((k.includes(key) || key.includes(k)) && k.length > bestLen) {
      best = v;
      bestLen = k.length;
    }
  }
  return best;
}

// Enumerate every known bestiary name (content-aware quick-log autocomplete
// source — Step 2 Phase 2 B1 upgrade, api.js's _commandSuggestions()). Reuses
// the same lazy cache lookupBestiaryEntry() builds; never re-parses the CSV.
function getBestiaryNames() {
  _ensureBestiaryCache();
  return Array.from(_bestiaryCache.values()).map(e => e.name);
}

// ── WU-N2: VENDOR + TRADE-CATALOG LOOKUPS ─────────────────────────────────
// getVendors() — vendor roster from VENDORS.CSV ({name, location, baseCaps, faction}).
// baseCaps is the vendor's purse (caps cap for what it can pay when buying from you).
let _vendorCache = null;
function getVendors() {
  if (_vendorCache) return _vendorCache;
  _vendorCache = [];
  const start = databaseCSVs.indexOf('[VENDORS.CSV]');
  if (start !== -1) {
    const nextSection = databaseCSVs.indexOf('\n[', start + 13);
    const block = databaseCSVs.substring(start, nextSection === -1 ? undefined : nextSection);
    const lines = block.split('\n').filter(l => l.trim() && !l.startsWith('['));
    const h = (lines[0] || '').split(',');
    const ni = h.indexOf('Vendor_Name');
    const li = h.indexOf('Location');
    const ci = h.indexOf('Base_Caps');
    const fi = h.indexOf('Faction');
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(',');
      const name = (c[ni] || '').trim();
      if (!name) continue;
      _vendorCache.push({
        name,
        location: li >= 0 ? (c[li] || '').trim() : '',
        baseCaps: ci >= 0 ? parseInt(c[ci]) || 0 : 0,
        faction: fi >= 0 ? (c[fi] || '').trim() : '',
      });
    }
  }
  return _vendorCache;
}

// getTradeCatalog() — the deterministic vendor catalog: every priced item in the DB
// ({name, value, type}), deduped + sorted. WU-N2 uses the FULL item DB as stock
// (per-vendor VENDOR_STOCK is deferred to Round 2 — WU-D4d).
let _tradeCatalogCache = null;
function getTradeCatalog() {
  if (_tradeCatalogCache) return _tradeCatalogCache;
  const tables = [
    ['[WEAPONS.CSV]', 'Weapon_Name', 'Value', 'weapon'],
    ['[ARMOR.CSV]', 'Name', 'Value', 'armor'],
    ['[CHEMS.CSV]', 'Name', 'Value', 'aid'],
    ['[MISC.CSV]', 'Name', 'Value', 'misc'],
  ];
  const out = [];
  const seen = new Set();
  for (const [header, nameCol, valCol, type] of tables) {
    const start = databaseCSVs.indexOf(header);
    if (start === -1) continue;
    const nextSection = databaseCSVs.indexOf('\n[', start + header.length);
    const block = databaseCSVs.substring(start, nextSection === -1 ? undefined : nextSection);
    const lines = block.split('\n').filter(l => l.trim() && !l.startsWith('['));
    const h = (lines[0] || '').split(',');
    const ni = h.indexOf(nameCol);
    const vi = h.indexOf(valCol);
    if (ni === -1) continue;
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(',');
      const name = (c[ni] || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name, value: vi >= 0 ? parseFloat(c[vi]) || 0 : 0, type });
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  _tradeCatalogCache = out;
  return out;
}

// ── AMMO CALIBER LIST ─────────────────────────────────────────────────────
// Returns a sorted, deduplicated array of caliber strings from AMMO.CSV.
// Used to populate the #ammoCalibers datalist for the Ammo Reserves panel.
function getAmmoCalibers() {
  const start = databaseCSVs.indexOf('[AMMO.CSV]');
  if (start === -1) return [];
  const nextSection = databaseCSVs.indexOf('\n[', start + 10);
  const block = databaseCSVs.substring(start, nextSection === -1 ? undefined : nextSection);
  const lines = block
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('[') && !l.startsWith('Caliber'));
  const seen = new Set();
  lines.forEach(line => {
    const caliber = (line.split(',')[0] || '').trim();
    if (caliber) seen.add(caliber);
  });
  return [...seen].sort((a, b) => a.localeCompare(b));
}
