// Localized Database String — Fallout 3 canonical data (fallout.wiki, CC-BY-SA 4.0)
// v2.0.0: Base game weapons, armor, chems, enemies, recipes, quest items, vendors.
// databaseCSVs is injected via systemInstruction in api.js for guaranteed model attention.
// Same structure as db_nv.js — loaded in place of it when state.gameContext === 'FO3'.
const databaseCSVs = `
[WEAPONS.CSV]
Weapon_Name,Base_Damage,Crit_Damage,Crit_Multiplier,Attacks_Per_Second,Weight,Value,Req_Unarmed,Req_STR,Reach,Special_Attack_AP,Special_Rules,Ammo_Type
10mm Pistol,13,13,1.0,1.7,2,100,0,2,0,0,None,10mm
.32 Pistol,18,18,1.5,1.4,3,150,0,3,0,0,None,.32 Caliber
Scoped .44 Magnum,50,50,2.0,0.9,4,750,0,4,0,0,None,.44 Magnum
10mm Submachine Gun,15,15,1.0,4.5,5,250,0,3,0,0,Full Auto,10mm
Hunting Rifle,40,40,2.0,1.0,7,500,0,5,0,0,None,.32 Caliber
Combat Shotgun,60,60,1.0,1.0,8,600,0,4,0,0,None,Shotgun Shell
Assault Rifle,30,30,1.0,2.5,7,400,0,4,0,0,None,5.56mm
Sniper Rifle,55,55,2.0,0.9,10,3500,0,6,0,0,None,.308 Caliber
Chinese Assault Rifle,30,30,1.0,2.5,7,450,0,4,0,0,None,5.56mm
Lincoln's Repeater,50,50,2.0,0.9,4,4000,0,4,0,0,None,.44 Magnum
Sydney's 10mm Ultra SMG,20,20,1.0,5.0,5,3500,0,3,0,0,Full Auto,10mm
Xuanlong Assault Rifle,30,30,1.0,3.5,7,5000,0,4,0,0,None,5.56mm
Victory Rifle,55,55,2.5,0.9,10,5000,0,6,0,0,Silenced,.308 Caliber
Colonel Autumn's 10mm Pistol,13,13,2.0,1.7,2,1500,0,2,0,0,None,10mm
The Terrible Shotgun,80,80,1.0,1.0,8,7000,0,5,0,0,None,Shotgun Shell
Laser Pistol,12,24,2.0,1.5,2,400,0,2,0,0,None,Energy Cell
Laser Rifle,22,44,2.0,1.5,3,3500,0,2,0,0,None,Energy Cell
Plasma Pistol,25,50,2.0,1.3,3,1400,0,3,0,0,None,Microfusion Cell
Plasma Rifle,45,90,2.0,1.5,7,4000,0,5,0,0,None,Microfusion Cell
A3-21 Plasma Rifle,55,110,2.0,1.5,7,6500,0,5,0,0,None,Microfusion Cell
Gatling Laser,8,16,1.5,8.0,18,22500,0,6,0,0,Full Auto,Electron Charge Pack
Mesmetron,0,0,1.0,1.0,2,200,0,2,0,0,Paralyze/Confuse,None
Minigun,10,10,1.0,8.0,28,22500,0,7,0,0,Full Auto,5mm
Missile Launcher,100,100,1.0,0.5,15,4500,0,6,0,0,Splash,Missile
Fat Man,600,600,1.0,0.4,30,8500,0,8,0,0,Splash,Mini Nuke
Rock-It Launcher,25,25,1.0,1.5,10,250,0,5,0,0,Junk Ammo,Junk
Flamer,10,10,1.0,4.0,10,1500,0,8,0,0,Fire DoT,Flamer Fuel
Heavy Incinerator,12,12,1.0,3.5,12,5000,0,8,0,0,Fire DoT,Flamer Fuel
Frag Grenade,50,50,1.0,1.0,1,100,0,0,0,0,Splash,None
Plasma Grenade,80,80,1.0,1.0,1,200,0,0,0,0,Splash,None
Pulse Grenade,60,60,1.0,1.0,1,75,0,0,0,0,EMP/Splash,None
Bottlecap Mine,200,200,1.0,1.0,0,75,0,0,0,0,Triggered/Splash,None
Frag Mine,100,100,1.0,1.0,0.5,250,0,0,0,0,Triggered/Splash,None
Baseball Bat,15,15,1.0,1.8,3,100,0,3,1.0,20,None,None
Sledgehammer,30,30,1.0,0.9,10,100,0,7,1.2,40,Knockdown,None
Super Sledge,80,80,1.5,0.9,15,10000,0,8,1.2,55,Knockdown,None
Shishkebab,50,50,1.5,1.3,4,2000,0,5,0.9,30,Fire DoT,None
Combat Knife,20,20,2.0,2.5,1,75,0,0,0.6,20,None,None
Switchblade,9,9,1.5,2.5,0.5,25,0,0,0.5,15,None,None
Power Fist,60,60,1.0,1.1,5,2500,75,7,0.7,35,None,None
Brass Knuckles,8,8,1.0,2.7,1,25,25,4,0.5,15,None,None
Tire Iron,12,12,1.0,1.8,3,15,0,4,1.0,20,None,None
Lead Pipe,22,22,1.0,1.5,8,50,0,6,1.0,30,None,None
Chinese Officer's Sword,20,20,2.0,2.0,4,300,0,4,0.9,25,None,None
Bumper Sword,30,30,1.0,1.5,6,1500,0,6,1.0,30,None,None
Ripper,20,20,2.0,2.5,3,600,50,4,0.7,25,Chainsaw,None
Pool Cue,12,12,1.0,2.5,2,15,0,2,1.2,20,None,None
Rolling Pin,6,6,1.0,2.5,1,15,0,1,0.8,15,None,None
Golf Club,15,15,1.0,2.0,2,75,0,3,1.1,20,None,None
Nail Board,20,20,1.0,2.0,5,50,0,5,1.0,25,None,None
Board of Education,25,25,1.0,1.8,6,1500,0,6,1.0,30,None,None
Plunger,4,4,1.0,2.5,1,5,0,1,0.8,10,None,None
Blackhawk,60,60,2.0,0.9,4,8000,0,4,0,0,None,.44 Magnum
Alien Blaster,100,200,2.0,1.5,0.5,8000,0,0,0,0,None,Alien Power Cell
Firelance,90,180,2.0,1.5,2,10000,0,0,0,0,None,Alien Power Cell
Jingwei's Shocksword,20,40,2.0,2.0,4,3000,0,4,0.9,30,EMP,None
The Mauler,80,80,1.0,1.1,5,4000,75,7,0.7,40,None,None
O'cta Brain,25,25,1.0,1.3,4,1500,0,5,0.8,30,Knockback,None
Stabhappy,30,30,2.0,2.5,1,3500,0,0,0.6,25,None,None
Dart Gun,1,1,1.0,1.5,3,250,0,2,0,0,Cripple Legs,Dart
Deathclaw Gauntlet,60,60,1.0,1.1,1,5000,75,7,0.7,45,None,None
Nuka Grenade,500,500,1.0,1.0,1,200,0,0,0,0,Splash,None
Railway Rifle,20,40,2.0,1.5,15,500,0,5,0,0,None,Railway Spike
Tin Grenade,50,50,1.0,1.0,0.5,15,0,0,0,0,Splash,None
Chinese Pistol,4,4,1.0,6.0,2,190,0,0,0,0,None,10mm
Silenced 10mm Pistol,8,5,2.0,6.0,3,250,0,0,0,0,Suppressed,10mm
BB Gun,4,4,1.0,0.75,2,36,0,0,0,0,None,BB
Reservist's Rifle,40,40,5.0,1.607,10,500,0,0,0,0,None,.308 Caliber
Ol' Painless,30,30,1.0,1.125,6,250,0,0,0,0,None,.32 Caliber
Sawed-Off Shotgun,50,0,0.0,2.25,6,190,0,0,0,0,Splash,Shotgun Shell
Eugene,7,0,0.0,20.0,18,1500,0,0,0,0,Full Auto,5mm
Vengeance,11,12,1.0,20.0,18,2400,0,0,0,0,None,Electron Charge Pack
Burnmaster,24,1,4.0,8.0,15,500,0,0,0,0,Fire DoT,Flamer Fuel
Experimental MIRV,80,0,0.0,1.579,30,2498,0,0,0,0,Splash,Mini Nuke
Miss Launcher,20,0,0.0,1.579,15,400,0,0,0,0,Splash,Missile
Wazer Wifle,29,28,1.5,2.046,8,900,0,0,0,0,None,Microfusion Cell
Smuggler's End,18,18,1.5,6.0,2,450,0,0,0,0,None,Energy Cell
The Break,6,6,1.0,1.429,1,50,0,2,1.2,20,None,None
Jack,30,15,1.0,1.0,6,200,0,0,1.0,65,Limb Damage,None
Highwayman's Friend,10,10,1.0,2.308,5,75,0,0,1.0,27,None,None
Fisto!,25,25,1.5,1.091,6,100,25,0,0.7,25,None,None
The Tenderizer,30,15,1.0,1.429,12,230,0,0,1.2,20,None,None
Vampire's Edge,15,20,3.0,2.308,1,100,0,0,0.9,17,None,None
Occam's Razor,10,13,3.0,3.0,1,65,0,0,0.6,17,None,None
Ant's Sting,4,4,1.0,3.0,1,30,0,0,0.5,17,Poison DoT,None
Butch's Toothpick,10,13,2.5,3.0,1,50,0,0,0.5,17,None,None
Gauss Rifle,100,50,5.0,1.071,12,500,0,0,0,0,Knockdown,Microfusion Cell
Trench Knife,7,13,3.0,3.0,1,50,0,0,0.6,17,None,None
Auto Axe,35,0,0.0,1.0,20,200,0,0,1.2,65,Full Auto,None
Man Opener,35,0,0.0,1.0,20,200,0,0,1.2,65,Ignores DR,None
Steel Saw,16,0,0.0,1.0,20,200,0,0,1.2,65,Full Auto,None
Infiltrator,7,10,1.0,8.0,7,400,0,0,0,0,Suppressed,5.56mm
Perforator,10,14,2.0,6.0,7,600,0,0,0,0,Suppressed,5.56mm
Wild Bill's Sidearm,10,15,1.0,3.0,2,250,0,0,0,0,None,.32 Caliber
Metal Blaster,55,27,1.5,2.046,8,1000,0,0,0,0,None,Microfusion Cell
Tri-beam Laser Rifle,75,15,1.5,2.727,9,1000,0,0,0,0,None,Microfusion Cell
Callahan's Magnum,65,50,2.0,2.25,4,750,0,0,0,0,None,.44 Magnum
Precision Gatling Laser,8,6,4.0,20.0,18,3000,0,0,0,0,Full Auto,Electron Charge Pack
Lever-Action Rifle,40,40,5.0,0.75,8,200,0,0,0,0,None,10mm
Double-Barrel Shotgun,85,30,1.0,2.25,6,175,0,0,0,0,Splash,Shotgun Shell
Backwater Rifle,45,45,5.0,0.75,7,250,0,0,0,0,None,10mm
The Dismemberer,25,40,2.0,1.429,6,55,0,0,1.2,20,Limb Damage,None
Microwave Emitter,60,100,2.0,1.035,8,500,0,0,0,0,Ignores DR,Microfusion Cell
Axe,20,30,2.0,1.429,6,60,0,0,1.2,20,None,None
Fertilizer Shovel,15,30,3.0,1.429,3,55,0,0,1.2,20,Poison DoT,None
Ritual Knife,6,18,3.0,3.0,1,20,0,0,0.6,12,None,None
Alien Atomizer,35,40,1.0,3.0,2,500,0,0,0,0,None,Alien Power Module
Alien Disintegrator,65,50,2.0,2.0,7,300,0,0,0,0,None,Alien Power Module
Atomic Pulverizer,37,40,2.0,3.0,2,500,0,0,0,0,None,Alien Power Module
Captain's Sidearm,35,40,1.0,3.0,2,500,0,0,0,0,None,Alien Power Module
Destabilizer,30,20,2.0,4.5,7,1199,0,0,0,0,None,Alien Power Module
Drone Cannon,40,50,1.0,3.333,18,1999,0,0,0,0,Splash,Alien Power Module
Drone Cannon Ex-B,40,50,1.0,3.333,18,1999,0,0,0,0,Splash,Alien Power Module
Electro-Suppressor,25,4,1.0,2.308,2,70,0,0,1.0,25,Knockdown,None
Cryo Grenade,1,0,1.0,0.652,0.5,50,0,0,0,0,Cryo Stun,None
Cryo Mine,1,0,1.0,0.5,0.5,25,0,0,0,0,Cryo Stun,None

[AMMO.CSV]
Caliber,Subtype,DMG_Multiplier,DT_Modifier,Condition_Degradation,Weight_Per_Unit
10mm,Standard,1.0,0,1.0,0.004
10mm,Hollow Point,1.5,x3.0,1.0,0.004
.32 Caliber,Standard,1.0,0,1.0,0.006
.44 Magnum,Standard,1.0,0,1.0,0.005
5.56mm,Standard,1.0,0,1.0,0.003
.308 Caliber,Standard,1.0,0,1.0,0.006
Shotgun Shell,Standard,1.0,0,1.0,0.009
5mm,Standard,1.0,0,1.0,0.001
Energy Cell,Standard,1.0,0,1.0,0.0
Energy Cell,Optimized,1.15,0,1.0,0.0
Microfusion Cell,Standard,1.0,0,1.0,0.0
Microfusion Cell,Optimized,1.15,0,1.0,0.0
Electron Charge Pack,Standard,1.0,0,1.0,0.0
Electron Charge Pack,Optimized,1.15,0,1.0,0.0
Flamer Fuel,Standard,1.0,0,1.0,0.02
Missile,Standard,1.0,0,1.0,3.0
Mini Nuke,Standard,1.0,0,1.0,5.0
Alien Power Cell,Standard,1.5,0,0.5,0.0
Alien Power Module,Standard,1.0,0,0.5,0.0
Mesmetron Power Cell,Standard,1.0,0,1.0,0.01
Dart,Standard,1.0,0,1.5,0.0
Railway Spike,Standard,1.0,0,1.5,0.1
BB,Standard,1.0,0,0.5,0.0
Junk,,1.0,0,0.0,0.0

[ARMOR.CSV]
Name,Type,DT,Weight,Value,Effects,Min_CND_Threshold
Vault 101 Jumpsuit,Light,0,3,50,None,50%
Raider Armor,Light,10,15,100,None,50%
Leather Armor,Light,6,15,100,None,50%
Merc Adventurer Outfit,Light,0,3,75,None,50%
Armored Vault 101 Jumpsuit,Light,8,10,500,None,50%
Recon Armor,Light,12,20,3500,None,50%
Chinese Stealth Armor,Light,20,25,2000,+10 Sneak / Auto-Stealth,50%
Enclave Officer Uniform,Light,0,1,150,None,50%
Grimy Pre-War Businesswear,Light,0,1,50,None,50%
Metal Armor,Medium,15,30,700,None,50%
Combat Armor,Medium,20,25,900,None,50%
Talon Combat Armor,Medium,20,25,1000,None,50%
Merc Troublemaker Outfit,Light,0,3,90,None,50%
Outcast Power Armor,Heavy,38,45,11000,+1 STR / +25 Rad Resist,50%
T-45d Power Armor,Heavy,38,45,6000,+2 STR,50%
T-51b Power Armor,Heavy,50,45,11000,+2 STR / +25 Rad Resist,50%
Hellfire Power Armor,Heavy,60,50,12000,+3 STR / +10 Fire Resist,50%
Enclave Power Armor,Heavy,40,45,10000,+1 STR / +25 Rad Resist,50%
Tesla Armor,Heavy,40,40,8500,+15 Energy Resist,50%
Lyons' Pride Armor,Heavy,38,45,8000,+1 STR,50%
Ashur's Power Armor,Heavy,38,45,12000,+2 STR / +1 CHR,50%
Linden's Outcast Power Armor,Heavy,40,45,12000,+2 STR / +25 Rad Resist,50%
Winterized T-51b Power Armor,Heavy,50,45,12000,+2 STR / +25 Rad Resist / Cold Resist,50%
Surgical Mask,Light,0,0,35,None,50%
Authority Glasses,Light,0,0,15,+1 PER,50%
Naughty Nightwear,Light,0,1,175,+1 LCK / +10 Speech,50%
Professorial Attire,Light,0,1,100,+5 Science,50%
Pre-War Business Wear,Light,0,1,100,+5 Speech,50%
Point Lookout Tribal Outfit,Light,4,5,100,None,50%
Brotherhood Power Armor,Heavy,38,45,6000,+1 STR,50%
Advanced Radiation Suit,Light,0,4,350,+60 Rad Resist,50%
Ranger Battle Armor,Medium,39,27,430,None,50%
Rivet City Security Uniform,Medium,24,20,330,None,50%
Composite Recon Armor,Medium,28,20,180,None,50%
Winterized Combat Armor,Medium,32,25,390,None,50%
Samurai Armor,Medium,30,20,1000,None,50%
Tribal Power Armor,Heavy,35,40,740,+1 STR,50%
Metal Master Armor,Medium,36,15,160,None,50%
Leather Rebel,Light,30,15,160,None,50%
Bombshell Armor,Light,24,15,160,None,50%
Gamma Shield Armor,Heavy,36,45,520,+Rad Resistance,50%
Vault 101 Security Armor,Light,12,15,70,None,50%
Wanderer's Leather Armor,Light,24,15,160,None,50%
Prototype Medic Power Armor,Heavy,40,45,1000,Auto-heal stimpak pump,50%
Cross' Power Armor,Heavy,40,45,740,None,50%
Environment Suit,Light,6,5,100,+Rad Resistance,50%
Radiation Suit,Light,5,5,60,+Rad Resistance,50%
RobCo Jumpsuit,Light,2,1,6,None,50%
The Mechanist's Costume,Light,20,15,30,None,50%
Spacesuit,Light,1,5,60,None,50%
Enclave Scientist Outfit,Light,3,2,8,None,50%
Combat Helmet,Medium,5,3,50,None,50%
Composite Recon Helmet,Light,4,3,40,None,50%
T-51b Power Helmet,Heavy,10,4,120,None,50%
Enclave Hellfire Helmet,Heavy,10,4,120,None,50%
Outcast Power Helmet,Heavy,8,5,110,None,50%
Samurai Helmet,Light,5,3,300,None,50%
Ghoul Mask,Light,3,1,50,Feral Ghouls non-hostile,50%
Lincoln's Hat,Light,1,1,40,None,50%
Ledoux's Hockey Mask,Light,4,1,100,None,50%
Boogeyman's Hood,Light,8,3,110,None,50%

[BESTIARY.CSV]
Name,DT,HP,Perception,Speed_Factor,Base_Damage,Attack_Rate,Weakness_Weapon,Attack_Type,Resistances,XP_Yield
Radroach,0,5,2,1.0,2,1.0,None,Melee,Radiation,1
Bloatfly,0,10,5,1.5,4,2.0,None,Ranged,None,5
Giant Bloatfly,2,25,5,1.5,10,2.0,None,Ranged,None,10
Wild Dog,0,20,7,1.3,8,2.0,None,Melee,None,5
Feral Dog,0,25,7,1.3,12,2.0,None,Melee,None,8
Mole Rat,0,20,4,1.0,5,1.5,None,Melee,None,5
Albino Mole Rat,2,40,4,1.0,10,1.5,None,Melee,None,12
Feral Ghoul,0,50,3,1.3,18,2.0,None,Melee,Radiation,15
Feral Ghoul Roamer,4,100,3,1.3,30,2.0,None,Melee,Radiation,40
Feral Ghoul Reaver,10,200,4,1.3,50,1.5,None,Melee,Radiation,75
Glowing One,5,150,5,1.0,25,1.5,None,Hybrid,Radiation,50
Feral Ghoul Stalker,8,150,5,1.4,40,1.8,None,Melee,Radiation,60
Radscorpion,8,200,8,1.1,55,1.2,None,Melee,Poison,40
Albino Radscorpion,20,400,8,1.1,85,1.2,None,Melee,Poison,150
Giant Radscorpion,14,300,8,1.1,70,1.2,None,Melee,Poison,80
Mirelurk,10,150,4,0.8,40,1.0,None,Melee,Ballistic,50
Mirelurk Hunter,15,250,5,0.9,60,1.0,None,Melee,Ballistic,100
Mirelurk King,12,300,8,1.0,25,2.0,None,Hybrid,Sonic,100
Giant Mirelurk,20,500,4,0.7,80,0.8,None,Melee,Ballistic,200
Mirelurk Egg,0,25,0,0.0,0,0.0,None,None,None,1
Centaur,5,100,3,0.5,20,0.8,None,Hybrid,Acid,30
Centaur Hound,8,150,4,0.6,30,0.8,None,Hybrid,Acid,50
Yao Guai,10,300,8,1.3,70,1.2,None,Melee,None,100
Super Mutant,10,250,5,1.0,50,1.0,None,Hybrid,None,75
Super Mutant Brute,14,350,5,1.0,65,1.0,None,Hybrid,None,100
Super Mutant Master,16,450,6,1.0,75,1.0,None,Hybrid,None,125
Super Mutant Overlord,20,550,7,1.0,90,1.0,None,Hybrid,None,200
Behemoth,0,2500,6,0.8,200,0.5,None,Melee,None,1000
Ghoul,4,75,4,1.0,20,1.2,None,Hybrid,Radiation,25
Talon Company Merc,8,100,5,1.0,30,1.5,None,Ranged,None,50
Talon Company Commander,12,150,6,1.0,40,1.5,None,Ranged,None,100
Regulator,8,100,5,1.0,30,1.5,None,Ranged,None,50
Reilly's Rangers,10,120,6,1.0,35,1.5,None,Ranged,None,60
Enclave Soldier,15,150,6,1.0,60,1.5,None,Ranged,Energy,100
Enclave Officer,18,180,7,1.0,70,1.5,None,Ranged,Energy,150
Enclave Hellfire Trooper,25,200,7,1.0,80,1.5,None,Ranged,Fire+Energy,250
Brotherhood Initiate,12,100,5,1.0,40,1.5,None,Ranged,None,50
Brotherhood Knight,18,150,6,1.0,55,1.5,None,Ranged,None,75
Brotherhood Paladin,22,200,7,1.0,65,1.5,None,Ranged,None,100
Outcast Soldier,18,150,6,1.0,55,1.5,None,Ranged,None,75
Raider,4,60,4,1.0,20,1.5,None,Hybrid,None,20
Raider Badass,8,100,5,1.0,30,1.5,None,Hybrid,None,50
Deathclaw,15,500,8,1.5,125,1.5,None,Melee,None,50
Deathclaw Alpha,18,650,9,1.6,150,1.5,None,Melee,None,100
Baby Deathclaw,6,100,6,1.8,40,2.0,None,Melee,None,15
Chameleon Deathclaw,15,500,9,1.5,125,1.5,None,Melee,Stealth,50
Protectron,10,100,5,0.7,20,1.0,EMP,Ranged,Energy,40
Mister Gutsy,15,200,8,1.0,45,2.0,EMP,Ranged,Energy,60
Robobrain,12,150,8,0.8,35,1.5,EMP,Ranged,Energy,50
Sentry Bot,20,500,8,0.8,90,2.0,EMP,Ranged,Ballistic,150
Eyebot,5,50,10,1.5,12,2.0,EMP,Ranged,Energy,25
Mister Handy,10,100,6,0.8,20,1.0,EMP,Hybrid,Fire,35
Liberty Prime,0,50000,10,0.6,1000,1.5,None,Ranged,None,0
Ant,2,30,5,1.0,10,1.0,None,Melee,Acid,8
Fire Ant,4,50,5,1.0,15,1.0,None,Melee,Fire+Acid,15
Fire Ant Soldier,6,80,6,1.0,25,1.0,None,Hybrid,Fire+Acid,25
Fire Ant Queen,10,500,5,0.5,60,0.8,None,Ranged,Fire,500
Nuka-Cola Plant Robot,12,200,6,0.8,35,1.5,EMP,Ranged,Energy,50
Pinkerton's Guard,8,100,5,1.0,30,1.5,None,Ranged,None,30
Slavers,6,80,4,1.0,25,1.5,None,Hybrid,None,30
Paradise Falls Slaver,8,100,5,1.0,30,1.5,None,Hybrid,None,40
Rivet City Guard,10,120,5,1.0,35,1.5,None,Ranged,None,30
Wasteland Ghoul,4,75,4,1.0,20,1.2,None,Hybrid,Radiation,20
Crazed Protectron,10,120,5,0.7,25,1.0,EMP,Ranged,Energy,45
Chinese Gasser,5,80,4,1.0,20,1.5,None,Ranged,Gas,25
Chinese Ghoul Soldier,8,100,5,1.2,30,1.5,None,Ranged,Radiation,50

[CHEMS.CSV]
Name,Effect,Duration,Addiction_Risk,Addiction_Debuff,Chem_Family,Value,Weight
Stimpak,Restore 30 HP,0,0%,None,Medicine,25,0.5
Super Stimpak,Restore 100 HP / -1 STR (1m),1m,0%,None,Medicine,75,0.5
Med-X,+25 DR,4m,25%,-1 AGI,Med-X,25,0.5
Psycho,+25% DMG / +25 DR,4m,25%,-1 PER / -1 INT,Psycho,25,0.5
Buffout,+2 STR / +2 END / +60 Max HP,4m,25%,-1 STR / -1 END,Buffout,25,0.5
Mentats,+5 INT / +5 PER,1h,20%,-1 INT / -1 PER,Mentats,25,0.5
Jet,+40 AP,1m,30%,-1 PER,Jet,25,0.5
Rad-X,+25 Rad Resistance,4m,0%,None,Medicine,25,0.5
RadAway,Remove 150 Rads,0,0%,None,Medicine,25,0.5
Antidote,Remove Poison,0,0%,None,Medicine,50,0.5
Nuka-Cola,+10 HP / +1 RAD,0,0%,None,Food,5,0.5
Nuka-Cola Quantum,+400 AP / +16 HP / +32 RAD,0,10%,None,Food,1500,0.5
Purified Water,+20 HP,0,0%,None,Food,10,0.5
Dirty Water,+10 HP / +5 RAD,0,0%,None,Food,3,0.5
Brahmin Meat,+15 HP / +5 RAD,0,0%,None,Food,2,1.0
Dog Meat,+10 HP / +3 RAD,0,0%,None,Food,2,0.5
Squirrel Bits,+5 HP / +3 RAD,0,0%,None,Food,2,0.5
Fancy Lads Snack Cakes,+20 HP / +5 RAD,0,0%,None,Food,3,0.5
Cram,+10 HP / +5 RAD,0,0%,None,Food,2,0.5
Sugar Bombs,+10 HP / +5 RAD,0,0%,None,Food,5,0.5
Pork N' Beans,+5 HP / +3 RAD,0,0%,None,Food,3,0.5
InstaMash,+5 HP / +3 RAD,0,0%,None,Food,3,0.5
Dandy Boy Apples,+5 HP / +2 RAD,0,0%,None,Food,3,0.5
YumYum Deviled Eggs,+5 HP / +3 RAD,0,0%,None,Food,3,0.5
Beer,+1 CHR / -1 INT,1m,10%,-1 CHR,Alcohol,5,0.5
Wine,+1 CHR / -1 INT,1m,10%,-1 CHR,Alcohol,10,0.5
Scotch,+1 CHR / -1 INT,1m,10%,-1 CHR,Alcohol,15,0.5
Whiskey,+1 CHR / -1 INT,1m,10%,-1 CHR,Alcohol,8,0.5
Vodka,+1 CHR / -1 INT,1m,10%,-1 CHR,Alcohol,10,0.5
Blood Pack,+20 HP,0,0%,None,Medicine,30,0.5
Doctor's Bag,Heal limbs,0,0%,None,Medicine,200,2.0
Buffout Pill,+2 STR / +2 END,2m,10%,-1 STR / -1 END,Buffout,15,0.5
Stealth Boy,Invisibility,1m,0%,None,Tech,200,0.5

[MISC.CSV]
Name,Weight,Value,Category
Scrap Metal,1.0,1,Junk
Pre-War Money,0.0,10,Currency
Sensor Module,0.5,65,Electronics
Fission Battery,1.0,135,Electronics
Conductor,0.2,20,Electronics
Tin Can,0.5,1,Junk
Duct Tape,0.5,5,Adhesive
Wonderglue,1.0,10,Adhesive
Abraxo Cleaner,1.0,8,Cleaning
Surgical Tubing,0.1,15,Crafting
Empty Nuka-Cola Bottle,1.0,1,Container
Pilot Light,0.1,25,Electronics
Leather Belt,0.2,2,Junk
Coolant Cap,0.5,2,Junk
Bottle Cap,0.0,1,Currency
RadAway (empty),0.5,5,Junk
Scrap Electronics,0.5,25,Electronics

[RECIPES.CSV]
Recipe_Name,Skill_Req,Components,Output,Quarantine_Cap
Bottlecap Mine,Repair 25,1 Bottle Cap / 1 Sensor Module,1 Bottlecap Mine,5
Dart Gun,Repair 25,1 Surgical Tubing / 1 Toy Car / 1 Radscorpion Poison Gland,1 Dart Gun,3
Rock-It Launcher,Repair 25,1 Conductor / 1 Vacuum Cleaner / 1 Leaf Blower,1 Rock-It Launcher,2
Shishkebab,Repair 35,1 Lawnmower Blade / 1 Motorcycle Fuel Tank,1 Shishkebab,2
Deathclaw Gauntlet,Repair 45,1 Deathclaw Hand / 1 Leather Belt / 1 Medical Brace,1 Deathclaw Gauntlet,2
Nuka Grenade,Explosives 45,1 Nuka-Cola Quantum / 1 Tin Can,1 Nuka Grenade,5
Railway Rifle,Repair 35,1 Fission Battery / 1 Pressure Cooker / 1 Crutch,1 Railway Rifle,2
Abraxo Cleaner Bomb,Explosives 25,1 Tin Can / 1 Abraxo Cleaner,1 Tin Grenade,10

[QUEST_ITEMS.CSV]
Name,Associated_Quest,Tradeable,Special_Property,Weight
G.E.C.K.,Project Purity,No,Powers Project Purity — core main quest item,0.0
Modified FEV Virus,The Waters of Life / Take it Back,No,Variant FEV strain; determines ending based on player choice,0.0
Galaxy News Radio Distress Signal,Following in His Footsteps,No,Triggers radio signal and GNR quest line,0.0
The Water Chip,A Dream of Hope (Vault 112),No,Vault 112 component — required for simulation exit,0.0
Holotape: James's Message,Picking Up the Trail,No,Expository holotape left by James for the Lone Wanderer,0.0
Lincoln Memorial Poster,Lincoln Memorial / Lincoln's Profit Margins,Yes,Bounty item; sell to Hannibal or Paradise Falls,0.1
Miscellaneous Slave Ledger,Lincoln's Profit Margins,No,Evidence of Paradise Falls slave trafficking,0.0
The Declaration of Independence,Stealing Independence,Yes,Unique document item; turn in to Abraham Washington,0.0
Roy Phillips' Audio Tape,Tenpenny Tower,No,Evidence of Roy Phillips' plan; determines quest outcome,0.0
Maple's Holotape,Power of Atom / Following in His Footsteps,No,Confession holotape for Megaton bomb quest,0.0
Project Purity Password,The Waters of Life,No,Gives access to Jefferson Memorial reactor room,0.0
Vault 87 Keycard,Finding the Garden of Eden,No,Access key for Vault 87 decontamination chamber,0.0
Vault 101 Pip-Boy,Escape!,No,Tutorial item; equipped at game start,0.0
Dad's Terminal Password,Picking Up the Trail,No,Password to James's lab terminal in Rivet City,0.0
Colonel Autumn's Laser Pistol,Colonel Autumn encounters,Yes,Unique laser pistol dropped by Colonel Autumn,3.0
Steel Ingot,Into the Pitt,No,Collectible traded for unique Pitt weapons,1.0
Wernher's Holotape,Into the Pitt,No,Distress message that begins The Pitt,0.0
Ashur's Audio Diaries,Free Labor,No,Reveal Ashur's backstory and the cure,0.0
Krivbeknih,The Dark Heart of Blackhall,No,Forbidden tome sought by Obadiah Blackhall,1.0
Cryo Key,Among the Stars,No,Releases human captives aboard Mothership Zeta,0.0
Keller Family Transcripts,Bobblehead Hunt,No,Five recordings revealing the experimental MIRV cache,0.0
Punga Fruit,Walking with Spirits,Yes,Refined swamp fruit used in the Point Lookout ritual,0.5
Outcast Distress Signal,Aiding the Outcasts,No,Transmission that starts Operation: Anchorage,0.0
Lump of Brain Matter,Thought Control,No,Brain used in the Point Lookout rivalry,1.0
Replicated Man Holotape,The Replicated Man,No,Evidence used to track the android Harkness,0.0

[VENDORS.CSV]
Vendor_Name,Location,Base_Caps,Repair_Skill,Faction,Restock_Days,Accepted_Currencies
Moira Brown,Megaton (Craterside Supply),2000,50,Megaton,3,Caps
Rivet City Market (Bannon),Rivet City,3000,30,Independent,3,Caps
Flak 'n Shrapnel's,Rivet City,2500,70,Independent,3,Caps
Old Man Harris,Canterbury Commons,1000,20,Independent,3,Caps
Crow,Rivet City / Wandering,500,15,Independent,3,Caps
Ahzrukhal,Underworld (Chop Shop),1200,80,Underworld,4,Caps
Tulip,Underworld,1200,30,Underworld,3,Caps
Wernher,The Pitt (if DLC),2000,50,Independent,3,Caps
`;

// ── ITEM LOOKUP ──────────────────────────────────────────────────────────────
// Identical implementation to db_nv.js — searches all CSV tables by name.
// Lazy-initializes parsed cache on first call.
let _itemCache = null;

function _buildItemCache() {
  _itemCache = new Map();
  const tables = [
    ['[WEAPONS.CSV]', 'Weapon_Name', 'Weight', 'Value', 'weapon'],
    ['[AMMO.CSV]', 'Caliber', 'Weight_Per_Unit', null, 'ammo'],
    ['[ARMOR.CSV]', 'Name', 'Weight', 'Value', 'armor'],
    ['[CHEMS.CSV]', 'Name', 'Weight', 'Value', 'aid'],
    ['[MISC.CSV]', 'Name', 'Weight', 'Value', 'misc'],
    ['[QUEST_ITEMS.CSV]', 'Name', 'Weight', null, 'misc'],
  ];

  for (const [header, nameCol, wgtCol, valCol, type] of tables) {
    const start = databaseCSVs.indexOf(header);
    if (start === -1) continue;
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
      const key =
        type === 'ammo' && cols[1] ? `${name} ${cols[1].trim()}`.toLowerCase() : name.toLowerCase();
      _itemCache.set(key, {
        wgt: wgtIdx >= 0 ? parseFloat(cols[wgtIdx]) || 0 : 0,
        val: valIdx >= 0 ? parseFloat(cols[valIdx]) || 0 : 0,
        type: type,
      });
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
  const exact = _itemCache.get(key);
  if (exact) return exact;
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

// ── AMMO CALIBER LIST ─────────────────────────────────────────────────────────
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
