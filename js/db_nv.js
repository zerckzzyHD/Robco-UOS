// Localized Database String — Fallout: New Vegas canonical data (fallout.wiki, CC-BY-SA 4.0)
// v1.6.7: Expanded to ~170 weapons, ~70 armors, ~45 chems.
// databaseCSVs is injected via systemInstruction in api.js for guaranteed model attention.
const databaseCSVs = `
[WEAPONS.CSV]
Weapon_Name,Base_Damage,Crit_Damage,Crit_Multiplier,Attacks_Per_Second,Weight,Value,Req_Unarmed,Req_STR,Reach,Special_Attack_AP,Special_Rules,Ammo_Type
Brass Knuckles,15,15,1.0,3.1,1,25,25,4,0.5,20,None,None
Spiked Knuckles,18,18,1.0,3.1,1,40,50,4,0.5,25,None,None
Love and Hate,30,30,1.0,3.1,3,1000,50,4,0.5,25,None,None
Power Fist,60,60,1.0,1.1,5,2500,75,7,0.7,35,None,None
Deathclaw Gauntlet,52,52,2.0,1.1,1,5000,100,7,1.0,45,None,None
Saturnite Fist Super-Heated,55,55,1.0,1.6,2,1800,75,5,0.6,35,Fire Damage,None
Ballistic Fist,80,80,1.0,1.1,6,3500,100,9,0.7,45,None,None
Industrial Hand,50,50,2.0,2.5,4,2200,75,5,0.7,40,Ignores DT,None
Combat Knife,17,17,2.0,3.0,1,60,0,0,0.6,20,None,None
Machete,18,18,1.0,2.5,2,15,0,4,0.7,25,None,None
Ripper,20,20,2.0,3.0,2,600,50,4,0.7,25,Chainsaw,None
Cattle Prod,35,35,2.0,1.5,2,800,0,5,0.8,25,Stun,None
Fire Axe,70,70,1.0,1.5,8,250,0,6,1.0,30,None,None
Knock Knock,90,90,1.0,1.5,8,3500,0,7,1.0,40,None,None
9mm Pistol,14,14,1.0,2.3,1,100,0,2,0,0,None,9mm
10mm Pistol,18,18,1.0,1.8,2,100,0,2,0,0,None,10mm
.357 Magnum Revolver,28,28,1.5,1.6,2,250,0,3,0,0,None,.357 Magnum
.44 Magnum Revolver,48,48,1.5,1.1,2,650,0,4,0,0,None,.44 Magnum
Lucky,42,42,2.5,1.6,2,1200,0,3,0,0,None,.357 Magnum
12.7mm Pistol,36,36,1.5,1.3,2,750,0,3,0,0,None,12.7mm
Hunting Rifle,52,52,2.0,1.1,6,2200,0,6,0,0,None,.308
Cowboy Repeater,38,38,2.0,1.5,5,700,0,4,0,0,None,.357 Magnum
Service Rifle,26,26,1.0,3.0,6,1500,0,3,0,0,None,5.56mm
Marksman Carbine,32,32,2.0,2.1,6,5000,0,5,0,0,None,5.56mm
All-American,32,32,2.5,2.1,6,8000,0,5,0,0,None,5.56mm
Trail Carbine,45,45,2.0,1.5,5,2000,0,4,0,0,None,.44 Magnum
Brush Gun,62,62,2.0,1.1,7,5750,0,6,0,0,None,.45-70 Gov't
Sniper Rifle,62,62,2.0,0.9,9,3500,0,6,0,0,None,.308
This Machine,55,55,2.0,1.3,6,7500,0,5,0,0,None,.308
Gobi Campaign Scout Rifle,62,62,2.5,1.0,9,7500,0,6,0,0,None,.308
Anti-Materiel Rifle,110,110,2.0,0.9,18,15000,0,8,0,0,Armor Piercing,.50 MG
Pump-Action Shotgun,65,65,1.0,0.9,8,1200,0,4,0,0,None,20 Gauge
Hunting Shotgun,80,80,1.0,1.0,9,2800,0,5,0,0,None,20 Gauge
Lever-Action Shotgun,70,70,1.0,0.9,7,2000,0,5,0,0,None,20 Gauge
9mm SMG,12,12,1.0,5.0,4,3500,0,3,0,0,Full Auto,9mm
.45 Auto SMG,22,22,1.0,4.0,4,3500,0,5,0,0,Full Auto,.45 Auto
12.7mm SMG,30,30,1.0,4.0,7,7500,0,6,0,0,Full Auto,12.7mm
Minigun,12,12,1.0,8.0,28,22500,0,7,0,0,Full Auto,5mm
Grenade Launcher,110,110,1.0,0.9,2,2000,0,4,0,0,Splash,40mm Grenade
Rocket Launcher,200,200,1.0,0.5,15,8000,0,6,0,0,Splash,Missile
Fat Man,600,600,1.0,0.4,30,8500,0,8,0,0,Splash,Mini Nuke
Flamer,10,10,1.0,4.0,10,15000,0,8,0,0,Fire DoT,Flamer Fuel
Laser Pistol,12,24,2.0,1.5,1,400,0,2,0,0,None,EC
Plasma Pistol,26,52,2.0,1.3,1,1400,0,3,0,0,None,EC
Laser Rifle,24,48,2.0,1.5,3,3500,0,2,0,0,None,EC
Plasma Rifle,50,100,2.0,1.5,4,4000,0,5,0,0,None,EC
Tri-Beam Laser Rifle,54,108,2.0,1.3,3,7500,0,4,0,0,None,EC
Gauss Rifle,120,120,2.0,1.0,15,14000,0,7,0,0,Stagger,2mm EC
Tesla Cannon,120,120,2.0,0.7,15,10000,0,7,0,0,EMP Burst,EC
Frag Grenade,50,50,1.0,1.0,1,100,0,0,0,0,Splash,None
Plasma Grenade,80,80,1.0,1.0,1,200,0,0,0,0,Splash,None
Incendiary Grenade,15,15,1.0,1.0,1,150,0,0,0,0,Fire DoT,None
Bottlecap Mine,200,200,1.0,1.0,0,75,0,0,0,0,Triggered/Splash,None
Bear Trap Fist,28,28,1.0,1.4,1,1200,50,5,0.7,30,Cripple,None
Corrosive Glove,22,22,1.0,1.5,1,800,50,4,0.6,25,Acid DoT,None
Cram Opener,20,20,1.0,1.8,1,500,0,3,0.6,20,None,None
Displacer Glove,32,32,1.5,1.4,2,2000,75,5,0.7,30,Knockback,None
Fist of Rawr,60,60,2.0,1.2,4,3000,100,7,1.0,40,None,None
Mantis Gauntlet,28,28,1.0,1.3,1,1500,50,5,0.8,30,Poison,None
Pushy,45,45,1.0,1.6,3,3000,75,6,0.7,35,Knockback,None
Rebound,40,40,1.0,1.5,2,2500,75,5,0.7,35,None,None
Saturnite Fist,40,40,1.0,1.6,2,800,50,5,0.6,30,None,None
Zap Glove,20,20,1.5,1.5,1,600,50,4,0.6,25,EMP,None
Blade of the East,75,75,1.0,1.5,6,4000,0,7,1.0,35,None,None
Bowie Knife,18,18,2.0,2.8,1,100,0,0,0.6,20,None,None
Broad Machete,22,22,1.0,2.3,2,200,0,5,0.7,25,None,None
Chance's Knife,22,22,2.0,3.0,1,750,0,0,0.6,25,None,None
Figaro,20,20,2.0,3.5,0.5,2000,0,0,0.5,20,None,None
Katana,35,35,2.0,1.5,3,2000,0,5,0.9,30,None,None
Machete Gladius,36,36,1.0,1.5,3,1500,0,6,0.8,30,None,None
Shishkebab,45,45,1.5,1.5,3,2000,0,5,0.9,30,Fire DoT,None
Straight Razor,12,12,2.0,3.5,0.5,100,0,0,0.5,15,Bleed,None
Throwing Knife,6,6,1.0,1.0,0.5,15,0,0,0.5,0,Thrown,None
Throwing Knife Spear,22,22,1.0,1.0,2,35,0,0,0.5,0,Thrown,None
Baseball Bat,24,24,1.0,1.8,3,150,0,4,1.0,25,None,None
Bumper Sword,40,40,1.0,1.5,4,1500,0,7,1.0,30,None,None
Golf Club,18,18,1.0,2.0,2,75,0,3,1.1,20,None,None
Oh Baby!,80,80,1.0,1.0,12,10000,0,8,1.2,45,None,None
Pool Cue,12,12,1.0,2.5,2,15,0,2,1.2,20,None,None
Sledgehammer,36,36,1.0,1.0,8,100,0,7,1.2,40,Knockdown,None
Super Sledge,80,80,1.5,1.0,15,10000,0,8,1.2,55,Knockdown,None
Thermic Lance,80,80,1.0,1.0,6,5000,0,8,1.0,40,Fire DoT,None
Tire Iron,18,18,1.0,2.0,3,15,0,4,1.0,25,None,None
Two-Step Goodbye,75,75,1.5,1.0,10,8000,0,8,1.2,50,Explosion,None
War Club,42,42,1.0,1.3,5,1000,0,6,1.1,35,None,None
Hunting Revolver,50,55,2.0,1.0,4,750,0,5,0,0,None,.44 Magnum
.45 Auto Pistol,28,28,1.5,1.4,2,700,0,4,0,0,None,.45 Auto
5.56mm Pistol,20,20,1.0,1.5,2,850,0,3,0,0,None,5.56mm
A Light Shining in Darkness,30,30,1.5,2.0,2,5000,0,3,0,0,None,.45 Auto
Li'l Devil,32,32,2.0,1.8,1,6000,0,2,0,0,None,.357 Magnum
Maria,18,18,2.0,1.8,2,800,0,2,0,0,None,9mm
Police Pistol,30,30,1.5,1.4,2,600,0,3,0,0,None,.38 Spl
Ranger Sequoia,62,62,2.0,1.0,4,8000,0,6,0,0,None,.45-70 Gov't
Silenced .22 Pistol,8,16,2.0,2.0,1,600,0,2,0,0,Silenced,.22 LR
That Gun,50,50,2.0,0.9,2,450,0,5,0,0,None,5.56mm
Weathered 10mm Pistol,18,18,1.0,1.8,2,300,0,2,0,0,None,10mm
Abilene Kid LE BB Gun,4,8,2.0,2.0,2,8000,0,1,0,0,None,BB
Assault Carbine,20,20,1.0,3.0,5,3500,0,4,0,0,None,5mm
Automatic Rifle,35,35,1.0,2.0,12,5000,0,6,0,0,Full Auto,.30 Cal
Battle Rifle,50,50,2.0,1.3,6,3000,0,6,0,0,None,.308
BB Gun,4,8,2.0,2.0,2,35,0,1,0,0,None,BB
Bozar,30,30,1.0,4.0,16,75000,0,6,0,0,Full Auto,.308
Christine's COS Silencer Rifle,65,65,2.0,1.0,14,11000,0,7,0,0,Silenced,.50 MG
La Longue Carabine,55,55,2.0,1.2,5,3500,0,5,0,0,None,.357 Magnum
Light Machine Gun,22,22,1.0,3.5,10,4500,0,6,0,0,Full Auto,5.56mm
Medicine Stick,65,65,2.0,1.1,7,5000,0,7,0,0,None,.45-70 Gov't
Paciencia,80,80,2.0,0.8,7,8000,0,7,0,0,None,.45-70 Gov't
Ratslayer,22,44,2.0,1.5,6,5000,0,2,0,0,Silenced,.223
Survivalist's Rifle,52,52,2.0,1.0,6,6500,0,6,0,0,None,.45-70 Gov't
Varmint Rifle,12,24,2.0,1.5,5,400,0,2,0,0,None,.22 LR
10mm Submachine Gun,16,16,1.0,4.5,4,2500,0,3,0,0,Full Auto,10mm
Vance's 9mm Submachine Gun,14,14,1.0,5.0,4,5000,0,3,0,0,Full Auto,9mm
H&H Tools Nail Gun,5,5,1.0,3.0,3,300,0,2,0,0,None,2mm EC
Silenced .22 SMG,8,16,2.0,3.5,3,5000,0,2,0,0,Silenced,.22 LR
Sleepytyme,22,22,1.0,4.0,4,8500,0,5,0,0,Silenced,.45 Auto
Big Boomer,150,150,1.0,0.5,10,3500,0,7,0,0,None,20 Gauge
Caravan Shotgun,55,55,1.0,1.0,6,500,0,4,0,0,None,20 Gauge
Dinner Bell,80,80,1.5,1.0,9,4000,0,5,0,0,None,20 Gauge
Riot Shotgun,70,70,1.0,1.3,8,5500,0,5,0,0,Full Auto,12 Gauge
Sawed-Off Shotgun,75,75,1.0,0.7,4,750,0,4,0,0,None,20 Gauge
Single Shotgun,55,55,1.0,0.5,6,100,0,4,0,0,None,20 Gauge
Sturdy Caravan Shotgun,55,55,1.0,1.0,6,750,0,4,0,0,None,20 Gauge
CZ57 Avenger,14,14,1.5,8.5,15,62000,0,7,0,0,Full Auto,5mm
FIDO,22,22,1.0,3.5,10,7500,0,6,0,0,Full Auto,5.56mm
K9000 Cyberdog Gun,18,18,1.0,4.5,8,5000,0,6,0,0,Full Auto,5.56mm
Shoulder Mounted Machine Gun,22,22,1.0,4.5,10,4500,0,6,0,0,Full Auto,5.56mm
Alien Blaster,75,150,2.0,1.5,0.5,8000,0,0,0,0,None,Alien Power Cell
Compliance Regulator,8,16,2.0,1.5,2,6000,0,2,0,0,Paralysis,EC
MF Hyperbreeder Alpha,12,24,2.0,1.5,1,8000,0,2,0,0,Unlimited Charge,EC
Pew Pew,45,90,2.0,1.0,2,8000,0,3,0,0,None,EC
Recharger Pistol,8,16,2.0,1.5,1,1500,0,2,0,0,Unlimited Charge,EC
AER14 Prototype,24,48,2.0,1.5,3,8000,0,2,0,0,None,EC
Elijah's Advanced LAER,80,160,2.0,0.9,5,8000,0,6,0,0,None,EC
LAER,55,110,2.0,0.9,5,6000,0,5,0,0,None,EC
Laser RCW,12,24,1.0,4.0,5,5000,0,3,0,0,Full Auto,EC
Recharger Rifle,10,20,2.0,1.5,2,2500,0,2,0,0,Unlimited Charge,EC
Plasma Defender,30,60,2.0,1.5,2,3500,0,4,0,0,None,EC
Q-35 Matter Modulator,55,110,2.0,1.5,3,8000,0,5,0,0,None,EC
YCS/186,225,225,2.0,0.5,20,10000,0,8,0,0,None,2mm EC
Heavy Incinerator,12,12,1.0,3.5,12,5000,0,8,0,0,Fire DoT,Flamer Fuel
Incinerator,10,10,1.0,2.5,8,4500,0,5,0,0,Fire DoT,Flamer Fuel
Multiplas Rifle,50,100,1.0,1.0,4,8000,0,7,0,0,Splash,EC
Tesla-Beaton Prototype,120,120,2.0,0.7,15,10000,0,7,0,0,EMP Chain,EC
Grenade Machinegun,100,100,1.0,1.5,8,12000,0,8,0,0,Full Auto/Splash,40mm Grenade
Grenade Rifle,110,110,1.0,0.9,4,2000,0,5,0,0,Splash,40mm Grenade
Red Glare,150,150,1.0,1.5,10,15000,0,7,0,0,Splash/Incendiary,Rocket
Annabelle,200,200,1.0,1.0,10,10000,0,5,0,0,Splash,Missile
Mercy,100,100,1.0,1.5,4,10000,0,8,0,0,Full Auto/Splash,40mm Grenade
Pulse Grenade,60,60,1.0,1.0,1,75,0,0,0,0,EMP/Splash,None
Holy Frag Grenade,500,500,1.0,1.0,1,500,0,0,0,0,Splash,None
Frag Mine,100,100,1.0,1.0,0.5,250,0,0,0,0,Triggered/Splash,None
Plasma Mine,120,120,1.0,1.0,0.5,350,0,0,0,0,Triggered/Splash,None
Pulse Mine,80,80,1.0,1.0,0.5,200,0,0,0,0,Triggered/EMP,None
Tin Grenade,50,50,1.0,1.0,0.5,15,0,0,0,0,Splash,None
Dynamite,100,100,1.0,1.0,1,35,0,0,0,0,Timed/Splash,None

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
EC,Standard,1.0,0,1.0,0.0
EC,Optimized,1.15,0,1.0,0.0
EC,Overcharged,1.5,0,2.0,0.0
EC,Bulk,0.75,0,0.75,0.0
2mm EC,Standard,1.0,0,1.0,0.0
40mm Grenade,Standard,1.0,0,1.0,0.5
Flamer Fuel,Standard,1.0,0,1.0,0.02
Missile,Standard,1.0,0,1.0,3.0

[ARMOR.CSV]
Name,Type,DT,Weight,Value,Effects,Min_CND_Threshold
Wasteland Wanderer Outfit,Light,0,2,15,None,50%
Vault Utility Suit,Light,0,3,50,None,50%
Leather Armor,Light,6,15,150,None,50%
NCR Trooper Armor,Light,8,15,400,None,50%
Gecko-Backed Leather Armor,Light,8,18,300,None,50%
NCR Ranger Patrol Armor,Light,12,20,1000,None,50%
Stealth Suit Mk II,Light,16,20,8000,+10 Sneak / Auto-Stealth,50%
Metal Armor,Medium,12,30,700,None,50%
Combat Armor,Medium,15,25,3900,None,50%
Combat Armor Reinforced,Medium,18,28,6000,None,50%
Legion Centurion Armor,Medium,18,20,3500,None,50%
Desert Ranger Combat Armor,Medium,22,30,8000,None,50%
NCR Veteran Ranger Armor,Medium,22,30,9000,None,50%
Elite Riot Gear,Medium,22,30,9500,+1 PER / +1 CHR,50%
NCR Salvaged Power Armor,Heavy,20,35,8500,+1 STR,50%
Brotherhood T-45d Power Armor,Heavy,22,45,6000,+2 STR,50%
Ranger Combat Armor,Medium,20,30,7500,None,50%
T-51b Power Armor,Heavy,25,40,5200,+1 STR / +1 CHA / +25 Rad Resist,50%
Remnants Power Armor,Heavy,28,45,12000,+1 STR / +25 Rad Resist,50%
Enclave Power Armor,Heavy,28,45,12000,+1 STR / +25 Rad Resist,50%
Gannon Family Tesla Armor,Heavy,26,40,10000,+10 Energy Resist / +25 Rad Resist,50%
Advanced Radiation Suit,Light,0,4,350,+60 Rad Resist,50%
Armored Vault 13 Jumpsuit,Light,10,10,2000,+5 Barter / +5 Repair,50%
Armored Vault 21 Jumpsuit,Light,10,10,1000,None,50%
Assassin Suit,Light,14,18,3000,+10 Sneak,50%
Caesar's Armor,Medium,18,25,4000,+5 Barter / Legion Fame,50%
Chinese Stealth Armor,Light,16,25,7000,+10 Sneak / Auto-Stealth,50%
Gecko-Backed Leather Armor Reinforced,Light,10,20,500,None,50%
Gladiator Armor,Light,12,20,800,None,50%
Great Khan Armored Leather,Light,8,15,250,None,50%
Great Khan Simple Armor,Light,4,10,100,None,50%
Joshua Graham's Armor,Light,18,20,3500,+5 Guns,50%
Leather Armor Reinforced,Light,8,18,300,None,50%
Lightweight Leather Armor,Light,6,10,200,None,50%
NCR Trooper Fatigues,Light,4,5,100,None,50%
Radiation Suit,Light,0,3,200,+40 Rad Resist,50%
Raider Badlands Armor,Light,6,14,200,None,50%
Raider Blastmaster Armor,Light,8,16,250,-1 AGL,50%
Raider Painspike Armor,Light,8,16,250,+5 Melee,50%
Raider Sadist Armor,Light,10,18,300,None,50%
Sierra Madre Armor,Light,10,15,1000,+5 Sneak,50%
Sierra Madre Armor Reinforced,Light,14,18,2000,+5 Sneak / +5 Energy Weapons,50%
Space Suit,Light,0,5,500,+60 Rad Resist,50%
Tribal Raiding Armor,Light,6,12,150,None,50%
Advanced Riot Gear,Medium,20,28,7500,+1 PER / +1 AGL,50%
Combat Armor Reinforced Mark 2,Medium,20,30,7000,None,50%
Lightweight Metal Armor,Medium,10,20,450,None,50%
NCR Bandoleer Armor,Medium,14,20,500,None,50%
NCR Ranger Combat Armor,Medium,20,30,7500,None,50%
Recon Armor,Medium,15,20,3500,None,50%
Riot Gear,Medium,18,26,5000,+1 PER,50%
Van Graff Combat Armor,Medium,18,25,5000,None,50%
1st Recon Assault Armor,Heavy,22,30,5000,+5 Guns,50%
1st Recon Survival Armor,Heavy,22,30,5500,+5 Survival / +5 Medicine,50%
Brotherhood T-51b Power Armor,Heavy,25,40,5200,+1 STR / +25 Rad Resist,50%
Gecko-Backed Metal Armor,Medium,14,32,600,None,50%
Legate's Armor,Heavy,28,40,15000,+5 Melee / +5 Unarmed,50%
Metal Armor Reinforced,Medium,14,32,1200,None,50%
Remnants Tesla Armor,Heavy,24,42,10000,+10 Energy Resist / +25 Rad Resist,50%
Scorched Sierra Power Armor,Heavy,22,45,7000,+4 STR / Fire DoT Aura,50%
T-45d Power Armor,Heavy,22,45,5000,+2 STR,50%
Tesla Armor,Heavy,24,40,8500,+10 Energy Resist / +25 Rad Resist,50%

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
Buffout,+2 STR / +2 END / +60 Max HP,4m,25%,-1 STR / -1 END,Buffout,20,0.5
Med-X,+25 DR,4m,25%,-1 AGI,Med-X,20,0.5
Psycho,+25% DMG,4m,25%,-1 PER / -1 END,Psycho,20,0.5
Stimpak,Restore HP,0,0%,None,Medicine,20,0.5
Super Stimpak,Restore 100 HP,0,0%,None,Medicine,75,0.5
RadAway,Remove 150 Rads,0,0%,None,Medicine,20,0.5
Rad-X,+25 Rad Resistance,4m,0%,None,Medicine,20,0.5
Antivenom,Remove Poison,0,0%,None,Medicine,75,0.5
Hydra,Restore crippled limb,0,0%,None,Medicine,55,0.5
Fixer,Remove addiction,0,0%,None,Medicine,35,0.5
Doctor's Bag,Restore all crippled limbs,0,0%,None,Medicine,250,2.0
Jet,+20 AP / +1 AGI,1m,25%,-1 PER / -1 END,Jet,20,0.5
Ultrajet,+30 AP / +1 AGI,2m,30%,-1 AGI / -1 STR,Jet,150,0.5
Turbo,Slow time / +30% AP,3s,15%,-2 PER,Turbo,65,0.5
Mentats,+2 INT / +2 PER,1m,10%,-1 INT / -1 PER,Mentats,25,0.5
Slasher,+3 STR / +3 END / +25% DMG,2m,20%,-1 STR / -1 END,Buffout,75,0.5
Whiskey Rose,+1 STR / DT vs Energy,1m,10%,-1 CHR,Alcohol,20,0.5
Nuka-Cola,Restore 20 HP / +5 RAD,0,0%,None,Food,5,0.5
Nuka-Cola Quartz,Restore 20 HP / Night Vision,5m,0%,None,Food,50,0.5
Atomic Cocktail,Restore 20 HP / +30 RAD,0,0%,None,Alcohol,20,0.5
Steady,+2 AGL / No weapon sway,2m,15%,-1 PER,Steady,35,0.5
Rocket,+25% Melee DMG / +25 AP,1m,20%,-1 AGL,Rocket,35,0.5
Cateye,Night Vision,2m,0%,None,Cateye,25,0.5
Dixon's Jet,+15 AP,30s,30%,-1 PER / -1 END,Jet,20,0.5
Party Time Mentats,+5 CHR / +2 INT,1m,15%,-1 INT / -1 PER,Mentats,50,0.5
Blood Shield,+50 Poison Resist,2m,0%,None,Medicine,30,0.5
Rushing Water,+50% Attack Speed,30s,15%,-1 AGL,Rushing Water,50,0.5
Ant Nectar,+4 STR / -3 INT / Fire Resist,2m,10%,-2 INT,Ant Nectar,30,0.5
Healing Powder,Restore 15 HP / -2 PER,0,0%,None,Medicine,4,0.5
Healing Poultice,Restore 20 HP / -2 PER,0,0%,None,Medicine,12,0.5
Purified Water,Restore 20 HP,0,0%,None,Food,20,0.5
Dirty Water,Restore 5 HP / +5 RAD,0,0%,None,Food,5,0.5
Beer,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,5,0.5
Scotch,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,10,0.5
Vodka,+1 END / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,10,0.5
Wine,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,10,0.5
Absinthe,+1 STR / +1 CHR / -1 INT,4m,10%,-1 CHR,Alcohol,15,0.5
Moonshine,+2 STR / -2 INT,4m,10%,-2 CHR,Alcohol,10,0.5
Gecko Steak,Restore 50 HP,0,0%,None,Food,15,1.0
Brahmin Steak,Restore 50 HP,0,0%,None,Food,15,1.0

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
  // 2. Fuzzy fallback: substring match (longest name wins to avoid false positives)
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
