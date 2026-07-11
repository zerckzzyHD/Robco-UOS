/* exported registrySearch */
/* global FALLOUT_REGISTRY */
// Static <script> tag, global scope (index.html load-order slot 4 — after the
// per-game js/data/reg_nv.js / reg_fo3.js, which must already have set the
// global FALLOUT_REGISTRY this file searches). EXPOSES: registrySearch().
// Protocol 23: this is the read-only search ENGINE — it only reads
// FALLOUT_REGISTRY and never touches `state` or any campaign field; the
// per-game reg_*.js files own the actual data.
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
 *
 * Always loaded after the per-game reg_*.js, so FALLOUT_REGISTRY is already
 * set to the active game's registry. Works for FNV, FO3, and any future game
 * — no hardcoded game literals.
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
  const results = scored.slice(0, 7).map(s => s.entry);
  _registrySearchCache = { category, query, results };
  return results;
}
