// Localized Database String — Fallout: New Vegas canonical data (fallout.wiki, CC-BY-SA 4.0)
// NOTE: getRelevantDbContext() is retained as a legacy utility.
// As of v1.6.6, databaseCSVs is injected via systemInstruction for guaranteed
// model attention. This function is no longer called from transmitMessage().
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
Stimpack,Restore HP,0,0%,None,Medicine,20,0.5
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

// TOKEN TRIAGE LOGIC: Legacy utility — no longer called from transmitMessage().
// Database is now always present via systemInstruction (see api.js).
// Retained for reference and potential future selective-injection use.
function getRelevantDbContext(userText) {
  const triggerWords = ['[THREAT]', '[TH]', '[VATS', '[TRADE]', '[CRAFT]', '[EXCESS]'];
  const textUpper = userText.toUpperCase();

  // If the user is asking a combat/trade command, inject the DB.
  if (triggerWords.some(word => textUpper.includes(word))) {
    return `\n[DATABASES_ATTACHED]:\n${databaseCSVs}\n`;
  }
  // Otherwise, return empty string to save 1,500+ tokens on narrative roleplay.
  return '\n[DATABASES_OMITTED_TO_SAVE_MEMORY_DUE_TO_NARRATIVE_PROMPT]\n';
}
