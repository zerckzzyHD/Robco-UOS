// Localized Database String
const databaseCSVs = `
[WEAPONS.CSV]
Weapon_Name,Base_Damage,Crit_Damage,Crit_Multiplier,Attacks_Per_Second,Weight,Value,Req_Unarmed,Req_STR,Reach,Special_Attack_AP,Special_Rules,Ammo_Type
Spiked Knuckles,18,18,1.0,3.1,1,40,50,4,0.5,25,None,None
Love and Hate,30,30,1.0,3.1,3,1000,50,4,0.5,25,None,None
Saturnite Fist Super-Heated,55,55,1.0,1.6,2,1800,75,5,0.6,35,Fire Damage,None
Ballistic Fist,80,80,1.0,1.1,6,3500,100,9,0.7,45,None,None
Industrial Hand,50,50,2.0,2.5,4,2200,75,5,0.7,40,Ignores DT,None
Hunting Rifle,52,52,2.0,1.1,6,2200,0,6,0,0,None,.308

[AMMO.CSV]
Caliber,Subtype,DMG_Multiplier,DT_Modifier,Condition_Degradation
5.56mm,Standard,1.0,0,1.0
5.56mm,Armor Piercing,0.95,-15,1.0
5.56mm,Hollow Point,1.75,x3.0,1.0
5.56mm,Surplus,1.15,0,3.0
12 Gauge,Buckshot,1.0,0,1.0
.308,Standard,1.0,0,1.0
9mm,Standard,1.0,0,1.0

[ARMOR.CSV]
Name,Type,DT,Weight,Value,Effects,Min_CND_Threshold
Leather Armor,Light,6,15,150,None,50%
Combat Armor,Medium,15,25,3900,None,50%
T-51b Power Armor,Heavy,25,40,5200,+1 STR / +1 CHA / +25 Rad Resist,50%
Ranger Combat Armor,Medium,20,30,7500,None,50%

[BESTIARY.CSV]
Name,DT,HP,Perception,Speed_Factor,Base_Damage,Attack_Rate,Weakness_Weapon,Attack_Type,Resistances,XP_Yield
Deathclaw,15,500,8,1.5,125,1.5,Industrial Hand,Melee,None,50
Radroach,0,5,1,1.0,2,1.0,None,Melee,None,1
Fiend,2,75,3,1.0,15,2.0,None,Hybrid,None,15
Nightkin,12,220,5,1.2,60,1.2,None,Melee,None,50

[CHEMS.CSV]
Name,Effect,Duration,Addiction_Risk,Addiction_Debuff,Chem_Family,Value
Buffout,+2 STR / +2 END / +60 Max HP,4m,25%,-1 STR / -1 END,Buffout,20
Med-X,+25 DR,4m,25%,-1 AGI,Med-X,20
Psycho,+25% DMG,4m,25%,-1 PER / -1 END,Psycho,20
Stimpack,Heal HP,0,0%,None,Medicine,20

[MISC.CSV]
Name,Weight,Value,Category
Scrap Metal,1.0,1,Junk
Pre-War Money,0.0,10,Currency
NCR Money,0.0,40,Currency
Legion Coin,0.0,50,Currency

[RECIPES.CSV]
Recipe_Name,Skill_Req,Components,Output,Quarantine_Cap
Weapon Repair Kit,Repair 50,1 Scrap Electronics / 1 Scrap Metal,1 Weapon Repair Kit,5

[VENDORS.CSV]
Vendor_Name,Location,Base_Caps,Repair_Skill,Faction,Restock_Days,Accepted_Currencies
Chet,Goodsprings,500,15,Independent,3,Caps
Vendortron,Gun Runners,8000,100,Independent,3,Caps / NCR / Legion
`;

// TOKEN TRIAGE LOGIC: Only send the DB if the prompt demands math.
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
