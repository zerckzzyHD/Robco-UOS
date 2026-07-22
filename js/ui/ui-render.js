// ── ui-render.js — RENDER PIPELINE HUB (2.8.5 U-A4 split) ──
// ui-render.js after the responsibility split: only _updateContextPanels()
// remains here — cross-panel visibility glue (toggles the FACTION/KARMA
// panel and the inventory MODS drawer button) that isn't owned by any single
// ui-render-*.js sibling. Every render*() panel function now lives in a
// sibling file — see library/CODE_MAP.md § Render Pipeline for the full
// family. Global scope, static <script> tag — loads first in the
// ui-render*.js family (see index.html load order).

function _updateContextPanels() {
  const usesKarmaCenter = _activeDef().usesKarmaCenter;
  const factionPanel = document.getElementById('factionPanel');
  if (factionPanel) {
    // Let the tab system control visibility via tab-visible; just toggle display
    factionPanel.style.display = usesKarmaCenter ? 'none' : '';
  }
  // BUS-09 KARMA ALIGNMENT (Phase 3 OPERATOR batch 3): the needle gauge +
  // stat_karma slider are UNIVERSAL — every game tracks karma — so the board
  // itself is no longer hidden per-game (Protocol 22, reskin only). Only the
  // nested FO3 KARMA CENTER appendix stays conditional on usesKarmaCenter;
  // renderKarmaCenter() owns that inner toggle.
  // U9-5: FO3 has no weapon-mod system/data — hide the MODS drawer so it never
  // advertises a category that can never have entries (Protocol 38 reverse leak).
  const hasWeaponMods = _activeDef().hasWeaponMods;
  const modsFilterBtn = document.getElementById('invFilterMods');
  if (modsFilterBtn) {
    modsFilterBtn.style.display = hasWeaponMods ? '' : 'none';
    if (!hasWeaponMods && typeof _invFilter !== 'undefined' && _invFilter === 'mod') {
      setInvFilter('weapon'); // the drawer bank has no "All" drawer to fall back to
    }
  }
}
