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
  version: '1.0.0',

  // Quest entries: { name, type, dlc }
  //   type: 'main' | 'side' | 'companion' | 'unmarked'
  //   dlc:  null | 'dm' | 'hh' | 'owb' | 'lr'
  // Populated in Phase 2 (data population sprint).
  quests: [],

  // Item entries: { name, type }
  //   type: 'weapon' | 'armor' | 'aid' | 'ammo' | 'misc'
  // Populated in Phase 2.
  items: [],

  // Perk entries: { name, type, level }
  //   type:  'regular' | 'companion' | 'challenge' | 'special'
  //   level: minimum level requirement (0 for non-regular perks)
  // Populated in Phase 2.
  perks: [],

  // Location entries: { name, type }
  //   type: 'settlement' | 'landmark' | 'cave' | 'vault' | 'camp' | 'other'
  // Populated in Phase 2.
  locations: [],

  // Companion entries: { name, fullName, location }
  //   8 humanoid companions + Rex + ED-E
  // Populated in Phase 2.
  companions: [],
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
