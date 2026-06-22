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
  // Populated in Phase 3 — keep empty for now; Phase 2 prioritises
  // quests, perks, locations, and companions as AI-context value is higher.
  // type: 'weapon' | 'armor' | 'aid' | 'ammo' | 'misc'
  items: [],

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
