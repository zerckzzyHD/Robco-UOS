// ── ui-render-map.js — CARTOGRAPHY TABLE (split from ui-render.js, 2.8.5 U-A4) ──
// The Phosphor Cartography world-map SVG renderer (renderWorldMap), zone
// zoom/travel/visited-marking, and arrow-key node navigation. Global scope,
// static <script> tag — see index.html load order.

// ── BUS-16 · CARTOGRAPHY TABLE — "Phosphor Cartography" spatial node map ──
// (Phase 3 · Piece 3, replacing the boxed 6×6 CSS grid). One inline SVG built
// with map().join('') and assigned ONCE to #worldMapDisplay.innerHTML — a
// single bulk assignment, never repeated-innerHTML concatenation inside a
// loop (Prohibited Patterns). Nodes plot at each zone's REAL
// gridRow/gridCol (zero new data, registry stays read-only — Protocol 23);
// status classes reuse the existing --current/--visited/fog semantics. Same
// fog-of-war single-source (recordLocationVisit) and same zoomMapToZone/
// resetMapZoom/setMapView/markLocationVisited ids/handlers as before
// (Protocol 22) — only the presentation layer is rebuilt as vector graphics.
let _mapActiveZone = null;
// Last-rendered node list (index-aligned to FALLOUT_REGISTRY.zones), kept for
// arrow-key nearest-neighbor traversal (_mapNodeKeyNav) without re-deriving
// zone status on every keystroke.
let _mapLastNodes = [];
// The panel's viewport position captured right before zooming INTO a node,
// so resetMapZoom() can restore to that exact pre-zoom position (not just
// whatever the short sector-sheet's own scroll happened to be) — see the
// _rerenderMapPreservingScroll() comment for why this is needed.
let _mapPreZoomAnchor = null;

function setMapView(v) {
  state.mapView = v;
  saveState();
  renderWorldMap();
}

// Owner report fix: renderWorldMap() replaces #worldMapDisplay's entire
// innerHTML — going into or out of the zoomed sector sheet destroys whatever
// DOM node currently holds focus (the tapped node's <g>, or the
// "< SURVEY CHART" back button), and losing focus to <body> like that is a
// well-known trigger for browsers to auto-scroll the page to an unrelated
// position.
//
// Root cause of the "backing out shows only the top half" re-fix (Protocol
// 27, live-reproduced): the FIRST attempt captured/restored a raw scrollTop
// PIXEL VALUE. The full grid view (.table-frame + SVG + legend) and the
// zoomed sector sheet (.sheet) are very different heights — tapping a node
// CONDENSES the panel to the short sheet, so the captured scrollVal is small
// (clamped to the short document). Backing out re-expands the panel back to
// its full height, and blindly restoring that small pixel value lands the
// viewport far short of where the panel now sits (showing only its top
// portion) instead of where the user was actually looking.
//
// Fixed by anchoring on the PANEL's own viewport position instead of an
// absolute pixel offset: capture #worldMapPanel's getBoundingClientRect().top
// before the re-render, then nudge whichever element actually scrolls (the
// SAME _scrollElFor() lookup switchTab()'s per-subsystem scroll memory
// already uses — Protocol 22, no second scroll-detection path) by exactly
// the delta needed to put the panel back at that same viewport position.
// This is immune to the panel's own height changing (unlike a raw scrollTop)
// and still absorbs the browser's own focus-loss auto-scroll, since that
// shows up as the same before/after rect delta.
//
// One more real wrinkle (Protocol 27, live-reproduced): switching TO the
// short sector sheet SHRINKS the document, and the browser auto-clamps the
// current scroll position down to the new (smaller) max scroll — a side
// effect that happens BEFORE this function's own correction ever runs, and
// which the correction then can't undo (there's nowhere to scroll TO in a
// document that's still short). That clamp silently eats however much
// scroll the zoom-in used up. Fixed by having zoomMapToZone() capture the
// panel's PRE-ZOOM position into _mapPreZoomAnchor and passing it back in as
// `anchor` when resetMapZoom() zooms back OUT — restoring relative to the
// position from before the trip into the sheet, not the clamped position
// the sheet was left at.
function _rerenderMapPreservingScroll(anchor) {
  const el = typeof _scrollElFor === 'function' ? _scrollElFor('databank') : null;
  const panel = document.getElementById('worldMapPanel');
  const before = anchor != null ? anchor : panel ? panel.getBoundingClientRect().top : null;
  renderWorldMap();
  if (panel && before !== null) {
    const delta = panel.getBoundingClientRect().top - before;
    if (delta) {
      if (el) el.scrollTop += delta;
      else window.scrollTo(0, (window.scrollY || 0) + delta);
    }
  } else {
    // Fallback (panel not found — shouldn't happen on static markup): the
    // old absolute-offset behavior is still better than not restoring at all.
    const scrollVal = el ? el.scrollTop : window.scrollY || 0;
    if (el) el.scrollTop = scrollVal;
    else window.scrollTo(0, scrollVal);
  }
}

function zoomMapToZone(zoneName) {
  const panel = document.getElementById('worldMapPanel');
  _mapPreZoomAnchor = panel ? panel.getBoundingClientRect().top : null;
  _mapActiveZone = zoneName;
  _rerenderMapPreservingScroll();
}

function resetMapZoom() {
  _mapActiveZone = null;
  _rerenderMapPreservingScroll(_mapPreZoomAnchor);
  _mapPreZoomAnchor = null;
}

// WU-F11: native "mark visited" — flags a WORLD GRID location as discovered directly from
// the map, with NO AI (never routes to the Director). Add-only: routes through the single-
// source recordLocationVisit() helper (state.js), which is permanent + dedup'd, so the
// CURRENT / VISITED / UNKNOWN status can never desync — matching the fog-of-war model (there
// is no un-mark). Persists locally via saveState (cloud stays manual) and re-renders so the
// row flips [UNKNOWN] → [VISITED]. Game-agnostic (Protocol 38): operates on the loc string.
function markLocationVisited(loc) {
  if (!loc) return;
  recordLocationVisit(loc);
  if (typeof saveState === 'function') saveState();
  _rerenderMapPreservingScroll();
}

// Native "travel here" — sets a sector-sheet location as CURRENT (moves the [CURRENT]
// marker there), unlike markLocationVisited() above which only flags a place discovered
// without ever touching state.loc. Routes through the SAME shared onLocationChange
// (overrideLoc) setter the #stat_loc field itself uses (Protocol 22 — never a forked
// setter): it mirrors the new value into #stat_loc, syncs state, records BOTH the left
// and arrived location visited via recordLocationVisit(), saves, and re-renders. No AI,
// no transmitMessage — fully offline and player-authored (Protocol 24).
//
// onLocationChange() re-renders via its own bare renderWorldMap() call (it also fires
// from the unrelated #stat_loc onchange on OPERATOR, far from the map, where scroll-
// preserving would make no sense there), so calling it from inside the zoomed sector
// sheet hits the exact same innerHTML-replaces-the-focused-node scroll jump that
// _rerenderMapPreservingScroll() exists to fix (WU-F11 / Suite 196 / Suite 198). Since
// onLocationChange() already owns that one render call, this can't delegate to
// _rerenderMapPreservingScroll() itself (that would render the map twice) — instead it
// captures/restores the same panel-anchor delta around the call, reusing the identical
// _scrollElFor('databank') lookup (Protocol 22 — still one scroll-detection path).
function travelToLocation(loc) {
  if (!loc) return;
  const panel = document.getElementById('worldMapPanel');
  const before = panel ? panel.getBoundingClientRect().top : null;
  onLocationChange(loc);
  if (panel && before !== null) {
    const el = typeof _scrollElFor === 'function' ? _scrollElFor('databank') : null;
    const delta = panel.getBoundingClientRect().top - before;
    if (delta) {
      if (el) el.scrollTop += delta;
      else window.scrollTo(0, (window.scrollY || 0) + delta);
    }
  }
}

// Arrow-key traversal between rendered SVG nodes (nearest node in the pressed
// direction, by real grid coordinate) + Enter/Space pulls the sector sheet.
// Reads _mapLastNodes (set by renderWorldMap's strategic-view branch) so it
// never has to re-walk the registry on every keystroke.
function _mapNodeKeyNav(e, zoneName) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    zoomMapToZone(zoneName);
    return;
  }
  const dir = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[e.key];
  if (!dir) return;
  e.preventDefault();
  const from = _mapLastNodes.find(n => n.name === zoneName);
  if (!from) return;
  const cand = _mapLastNodes
    .map(n => ({ n, dx: n.gridCol - from.gridCol, dy: n.gridRow - from.gridRow }))
    .filter(o => o.n !== from && o.dx * dir[0] + o.dy * dir[1] > 0)
    .sort((a, b) => a.dx * a.dx + a.dy * a.dy - (b.dx * b.dx + b.dy * b.dy))[0];
  if (!cand) return;
  const el = document.getElementById('mapNode-' + cand.n.idx);
  if (el) el.focus();
}

function renderWorldMap() {
  const display = document.getElementById('worldMapDisplay');
  if (!display) return;

  const zones =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.zones ? FALLOUT_REGISTRY.zones : [];

  if (!zones.length) {
    display.innerHTML = '<span style="opacity:0.4;">[MAP DATA NOT LOADED]</span>';
    return;
  }

  // Build sets for quick lookups
  const visited = new Set((state.locationHistory || []).map(l => (l || '').toLowerCase()));
  const collected = new Set((state.collectibles || []).map(c => (c || '').toLowerCase()));
  const collectDefs =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.collectibles
      ? FALLOUT_REGISTRY.collectibles
      : [];

  const currentLoc = (state.loc || '').toLowerCase();

  // Helper: check if a zone has an uncollected collectible or Lincoln item by grid coord.
  function zoneHasUncollectedCollectible(zone) {
    const hasCollectible = collectDefs.some(def => {
      if (typeof def.gridRow !== 'number' || typeof def.gridCol !== 'number') return false;
      if (collected.has((def.name || '').toLowerCase())) return false;
      return def.gridRow === zone.gridRow && def.gridCol === zone.gridCol;
    });
    if (hasCollectible) return true;
    const lincolnDefs =
      typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.lincolnMemorabilia
        ? FALLOUT_REGISTRY.lincolnMemorabilia
        : [];
    const lincolnAcquired = state.lincolnItems || {};
    return lincolnDefs.some(def => {
      if (typeof def.gridRow !== 'number' || typeof def.gridCol !== 'number') return false;
      if (lincolnAcquired[def.name]) return false;
      return def.gridRow === zone.gridRow && def.gridCol === zone.gridCol;
    });
  }

  // Scores a zone against the current location string to pick ONE best-match cell.
  // 100 = exact string match, 50+len = whole-word token match, 10 = substring fallback.
  function scoreZoneForLoc(zone, loc) {
    const locLower = loc.toLowerCase();
    const searchIn = [zone.name, ...(zone.locations || [])].map(s => s.toLowerCase());
    let best = 0;
    for (const s of searchIn) {
      if (s === locLower) return 100;
      const locWords = locLower.split(/[ ,]+/).filter(w => w.length > 2);
      const sWords = s.split(/[ ,]+/).filter(w => w.length > 2);
      if (locWords.some(lw => sWords.some(sw => sw === lw))) {
        best = Math.max(best, 50 + s.length);
      } else if (
        locWords.some(lw => lw.length > 3 && sWords.some(sw => sw.includes(lw) || lw.includes(sw)))
      ) {
        best = Math.max(best, 10);
      }
    }
    return best;
  }

  function zoneVisited(zone) {
    const searchIn = [zone.name, ...(zone.locations || [])].map(s => s.toLowerCase());
    for (const v of visited) {
      if (searchIn.some(s => s.includes(v) || v.includes(s.split(' ')[0]))) return true;
    }
    return false;
  }

  function locVisited(locName) {
    const locLower = locName.toLowerCase();
    for (const v of visited) {
      if (locLower.includes(v) || v.includes(locLower.split(' ')[0])) return true;
    }
    return false;
  }

  // ── SECTOR SHEET — pulled by tapping/Entering a node ─────────────
  if (_mapActiveZone) {
    const activeZone = zones.find(z => z.name === _mapActiveZone);
    if (!activeZone) {
      _mapActiveZone = null;
      return renderWorldMap();
    }

    const zoneBadge = zoneHasUncollectedCollectible(activeZone)
      ? `<span class="map-collectible-badge badge">[?]</span>`
      : '';
    let html = `
      <div class="sheet">
        <div class="sheet-head">
          <button class="action-btn map-back-btn" onclick="resetMapZoom()">&#9668; SURVEY CHART</button>
          <span class="sheet-title">${escapeHtml(activeZone.name).toUpperCase()} REGION</span>${zoneBadge}
        </div>
    `;

    const locs = activeZone.locations || [];
    if (locs.length === 0) {
      html += `<div style="opacity:0.5; font-style:italic; padding:8px 4px;">No data</div>`;
    } else {
      // Single-winner: find the one best-matching location index (score ≥50 required).
      // Prevents "goodsprings" substring match from marking Bitter Springs as [CURRENT].
      let currentLocIdx = -1;
      if (currentLoc) {
        let bestLocScore = 0,
          bestLocLen = 0;
        locs.forEach((loc, i) => {
          const s = scoreZoneForLoc({ name: loc, locations: [] }, currentLoc);
          if (s > bestLocScore || (s > 0 && s === bestLocScore && loc.length > bestLocLen)) {
            bestLocScore = s;
            bestLocLen = loc.length;
            currentLocIdx = i;
          }
        });
        if (bestLocScore < 50) currentLocIdx = -1;
      }
      locs.forEach((loc, i) => {
        const isYou = i === currentLocIdx;
        const wasVisited = locVisited(loc);

        let statusText = '<span class="loc-st st-unk">UNSURVEYED</span>';
        let rowCls = 'loc-row';
        if (isYou) {
          statusText = '<span class="loc-st st-cur">&#9673; CURRENT</span>';
        } else if (wasVisited) {
          statusText = '<span class="loc-st st-vis">SURVEYED</span>';
        } else {
          rowCls += ' unknown';
        }

        // WU-F11: native "mark visited" affordance — only on undiscovered rows (not the
        // current location, not already visited). Add-only: tapping MARK SURVEYED flags the
        // place as discovered (permanent, no un-mark) directly, with NO AI.
        const markBtn =
          isYou || wasVisited
            ? ''
            : `<button class="mark" data-loc="${escapeHtml(
                loc
              )}" onclick="markLocationVisited(this.dataset.loc)" aria-label="Mark ${escapeHtml(
                loc
              )} as surveyed">&#9656; MARK SURVEYED</button>`;

        // Native "travel here" affordance — sets this location as CURRENT (moves the
        // [CURRENT] marker), distinct from MARK SURVEYED which only flags a place
        // discovered. Suppressed only on the already-current row (no-op there); shown on
        // both surveyed and unsurveyed rows, since fast-traveling to a known OR a freshly-
        // charted location is the whole point. No AI, no network — travelToLocation() routes
        // through the same shared onLocationChange(overrideLoc) setter the #stat_loc field
        // itself uses (Protocol 22).
        const travelBtn = isYou
          ? ''
          : `<button class="mark" data-loc="${escapeHtml(
              loc
            )}" onclick="travelToLocation(this.dataset.loc)" aria-label="Travel to ${escapeHtml(
              loc
            )} — set as current location">&#8594; TRAVEL HERE</button>`;

        html += `
          <div class="${rowCls}">
            <b>${escapeHtml(loc)}</b>
            ${statusText}
            ${markBtn}
            ${travelBtn}
          </div>
        `;
      });
    }

    html += `</div>`;
    display.innerHTML = html;
    return;
  }

  // ── PHOSPHOR CARTOGRAPHY — the spatial node map ──────────────────
  // 'full' state.mapView = STRATEGIC (whole chart); anything else = CORE, a
  // tighter viewBox CROP over the exact same node set — no zone is ever
  // excluded from the DOM, only the visible window changes (unlike the old
  // grid, which physically dropped off-crop zones). setMapView/state.mapView
  // unchanged (Protocol 22).
  const mv = state.mapView || 'auto';
  const useFull = mv === 'full';
  const MARGIN = 30;
  const STEP = 48;
  const nx = z => MARGIN + (z.gridCol - 1) * STEP;
  const ny = z => MARGIN + (z.gridRow - 1) * STEP;
  const maxRow = Math.max(...zones.map(z => z.gridRow));
  const maxCol = Math.max(...zones.map(z => z.gridCol));
  const fullSize = MARGIN * 2 + Math.max(maxRow - 1, maxCol - 1) * STEP;
  const CORE_LO = 2,
    CORE_HI = 5,
    CORE_PAD = 30;
  const coreOrigin = MARGIN + (CORE_LO - 1) * STEP - CORE_PAD;
  const coreSize = (CORE_HI - CORE_LO) * STEP + 2 * CORE_PAD;
  const viewBox = useFull
    ? `0 0 ${fullSize} ${fullSize}`
    : `${coreOrigin} ${coreOrigin} ${coreSize} ${coreSize}`;

  // Compute ONE winning current zone (unchanged fuzzy-match logic — a fixed
  // per-zone identity, not per-cell — Protocol 22).
  let currentZone = null;
  if (currentLoc) {
    let bestScore = 0,
      bestLen = 0;
    zones.forEach(zone => {
      const score = scoreZoneForLoc(zone, currentLoc);
      if (score > bestScore || (score > 0 && score === bestScore && zone.name.length > bestLen)) {
        bestScore = score;
        bestLen = zone.name.length;
        currentZone = score >= 50 ? zone : null;
      }
    });
    if (bestScore < 50) currentZone = null;
  }

  // Typed signal glyph — ★ this game's primary collectible (SNOW GLOBE/
  // BOBBLEHEAD, driven by the existing per-game collectibleLabel field, never
  // a hardcoded game literal — Protocol 38) or ▲ Lincoln memorabilia
  // (lincolnMemorabilia is simply empty for a game without tracksLincoln).
  const collectiblesLbl = String(_activeDef().collectibleLabel || 'SIGNAL').replace(/S$/, '');
  const sigGlyphChar = /BOBBLEHEAD/.test(String(_activeDef().collectibleLabel || '')) ? '◆' : '★';
  const lincolnDefs =
    typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.lincolnMemorabilia
      ? FALLOUT_REGISTRY.lincolnMemorabilia
      : [];
  const lincolnAcquired = state.lincolnItems || {};
  function zoneSignal(zone) {
    const hasCollectible = collectDefs.some(def => {
      if (typeof def.gridRow !== 'number' || typeof def.gridCol !== 'number') return false;
      if (collected.has((def.name || '').toLowerCase())) return false;
      return def.gridRow === zone.gridRow && def.gridCol === zone.gridCol;
    });
    if (hasCollectible) return { glyph: sigGlyphChar, label: collectiblesLbl + ' SIGNAL' };
    const hasLincoln = lincolnDefs.some(def => {
      if (typeof def.gridRow !== 'number' || typeof def.gridCol !== 'number') return false;
      if (lincolnAcquired[def.name]) return false;
      return def.gridRow === zone.gridRow && def.gridCol === zone.gridCol;
    });
    if (hasLincoln) return { glyph: '▲', label: 'LINCOLN SIGNAL' };
    return null;
  }

  // Known-route trail — turns state.locationHistory into a visible
  // exploration path: connect each CONSECUTIVE DISTINCT zone in actual
  // discovery order (self-loops within one zone collapse away). Capped at
  // the most recent 25 zone-transitions so a long campaign never clutters
  // the chart — the map stays fixed-size by construction (Protocol 17).
  const zoneByLoc = {};
  zones.forEach(z => {
    [z.name, ...(z.locations || [])].forEach(s => {
      zoneByLoc[String(s).toLowerCase()] = z;
    });
  });
  const trailZones = [];
  (state.locationHistory || []).forEach(loc => {
    const z = zoneByLoc[String(loc || '').toLowerCase()];
    if (z && trailZones[trailZones.length - 1] !== z) trailZones.push(z);
  });

  // FEEDBACK ANIMATION WAVE 1 (#26 SURVEY PING, §5 of the build plan) —
  // consumed ONLY here, on the WORLD GRID paint (never the zoomed sector
  // sheet, which returns early above) so the ping is always actually seen:
  // marking from the zoomed sheet waits until the user taps < WORLD GRID; an
  // AI discovery while off-map waits until the user next opens the map.
  // Moved ABOVE routeSegs (was built after it) so the route-line-draw fix
  // below can identify the newly-added segment using the SAME pingZone/
  // consumption gate the ping ring itself already uses.
  const pingZone = _pendingSurveyPing ? zoneByLoc[String(_pendingSurveyPing).toLowerCase()] : null;
  _pendingSurveyPing = null;

  const routeSegs = [];
  const seenSeg = new Set();
  trailZones.slice(-25).forEach((z, i, arr) => {
    if (i === 0) return;
    const a = arr[i - 1],
      b = z;
    if (a === b) return;
    const key = a.gridRow + ',' + a.gridCol + '-' + b.gridRow + ',' + b.gridCol;
    const keyRev = b.gridRow + ',' + b.gridCol + '-' + a.gridRow + ',' + a.gridCol;
    if (seenSeg.has(key) || seenSeg.has(keyRev)) return;
    seenSeg.add(key);
    routeSegs.push([a, b]);
  });

  // Owner report fix: the route segment leading to a freshly-surveyed node
  // used to render already fully drawn by the time the (correctly-deferred)
  // ping ring showed — the user never watched the line draw itself. Deferred
  // by the SAME pingZone/consumption gate as the ping ring (never a second
  // mechanism, Protocol 22): only the LAST segment arriving at pingZone (the
  // one just added to the trail) gets the one-shot stroke-dashoffset "draw
  // itself" reveal; every other segment, and this same one on any later
  // render, keeps the plain static dashed look.
  let newRouteSegIdx = -1;
  if (pingZone) {
    routeSegs.forEach(([, b], i) => {
      if (b === pingZone) newRouteSegIdx = i;
    });
  }

  const rings = [0.35, 0.68, 1]
    .map(
      k =>
        `<circle class="rangering" cx="${fullSize / 2}" cy="${fullSize / 2}" r="${(fullSize / 2 - MARGIN * 0.4) * k}"/>`
    )
    .join('');
  const routesSvg = routeSegs
    .map(([a, b], i) => {
      const x1 = nx(a),
        y1 = ny(a),
        x2 = nx(b),
        y2 = ny(b);
      if (i !== newRouteSegIdx) {
        return `<line class="route" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      }
      const len = Math.hypot(x2 - x1, y2 - y1).toFixed(2);
      return `<line class="route route-draw-in" style="--route-len:${len}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    })
    .join('');

  _mapLastNodes = [];
  let signalCount = 0;
  const nodesSvg = zones
    .map((z, i) => {
      const x = nx(z),
        y = ny(z);
      const isCur = z === currentZone;
      const isVisited = !isCur && zoneVisited(z);
      const fog = !isCur && !isVisited;
      _mapLastNodes.push({ idx: i, name: z.name, gridRow: z.gridRow, gridCol: z.gridCol, fog });
      const signal = zoneSignal(z);
      if (signal) signalCount++;
      const sigSvg = signal
        ? `<text class="sig-glyph" x="${x + 11}" y="${y - 7}">${signal.glyph}</text>`
        : '';
      const label = fog
        ? ''
        : `<text class="lbl" x="${x}" y="${y + 17}">${escapeHtml(z.name.toUpperCase())}</text>`;
      const statusWord = isCur
        ? 'current position'
        : fog
          ? 'unsurveyed signal return'
          : 'surveyed node';
      const safeName = escapeHtml(z.name.replace(/'/g, "\\'"));
      const isPingTarget = pingZone === z;
      const pingSvg = isPingTarget
        ? `<circle class="survey-ping-ring" cx="${x}" cy="${y}" r="8.5"/>`
        : '';
      return `<g class="node${fog ? ' fog' : ''}${isPingTarget ? ' survey-ping' : ''}" id="mapNode-${i}" tabindex="0" role="button"
        aria-label="${escapeHtml(z.name)} — ${statusWord}${signal ? ', ' + signal.label.toLowerCase() : ''}; Enter pulls the sector sheet"
        onclick="zoomMapToZone('${safeName}')"
        onkeydown="_mapNodeKeyNav(event, '${safeName}')">
        <circle class="hit" cx="${x}" cy="${y}" r="17"/>
        <circle class="focusring" cx="${x}" cy="${y}" r="13"/>
        <circle class="halo" cx="${x}" cy="${y}" r="8.5"/>
        <circle class="dot" cx="${x}" cy="${y}" r="${fog ? 4 : 4.4}"/>
        ${pingSvg}${label}${sigSvg}
      </g>`;
    })
    .join('');

  let youSvg = '';
  if (currentZone) {
    const cx = nx(currentZone),
      cy = ny(currentZone);
    youSvg = `<g class="you" aria-hidden="true">
      <circle cx="${cx}" cy="${cy}" r="9.5"/>
      <line x1="${cx - 15}" y1="${cy}" x2="${cx - 10}" y2="${cy}"/>
      <line x1="${cx + 10}" y1="${cy}" x2="${cx + 15}" y2="${cy}"/>
      <line x1="${cx}" y1="${cy - 15}" x2="${cx}" y2="${cy - 10}"/>
      <line x1="${cx}" y1="${cy + 10}" x2="${cx}" y2="${cy + 15}"/>
      <text x="${cx}" y="${cy - 19}">[YOU]</text>
    </g>`;
  }

  // Per-game map caption (identity.databank, Protocol 38 — a generic fallback
  // for a game that hasn't authored the facet yet).
  const dbId = (typeof getIdentity === 'function' ? getIdentity() : null) || {};
  const dbFacet = dbId.databank || {};
  const caption = escapeHtml(dbFacet.mapCaption || 'SURVEY GRID');
  const captionSub = escapeHtml(dbFacet.mapCaptionSub || 'SURVEY GRID');

  // Board 0i summary line (BUS-16's collapsed-state status row).
  const totalLocs = zones.reduce((a, z) => a + (z.locations || []).length, 0);
  const chartedLocs = Math.min((state.locationHistory || []).length, totalLocs);
  const fixLabel = currentZone ? currentZone.name.toUpperCase() + ' FIX' : 'NO FIX';
  const mapStatusEl = document.getElementById('dbMapStatus');
  if (mapStatusEl) {
    mapStatusEl.textContent =
      `${chartedLocs}/${totalLocs} CHARTED · ${fixLabel}` +
      (signalCount ? ` · ${signalCount} SIGNAL RETURN${signalCount === 1 ? '' : 'S'}` : '');
  }

  display.innerHTML = `
    <div class="map-caption">${caption}<span class="mc-sub">${captionSub}</span></div>
    <div class="chart-scale">
      <button class="${useFull ? 'cur' : ''}" onclick="setMapView('full')">&#9700; STRATEGIC</button>
      <button class="${!useFull ? 'cur' : ''}" onclick="setMapView('core')">&#9701; CORE</button>
      <span class="real-label" style="align-self:center">(setMapView &middot; state.mapView)</span>
    </div>
    <div class="table-frame">
      <span class="compass n">N</span><span class="compass s">S</span>
      <span class="compass w">W</span><span class="compass e">E</span>
      <div class="sweep-radar" aria-hidden="true"></div>
      <div class="map-svg-wrap">
        <svg viewBox="${viewBox}" role="application"
             aria-label="Survey chart — arrow keys traverse surveyed nodes, Enter pulls the sector sheet">
          ${rings}${routesSvg}${nodesSvg}${youSvg}
        </svg>
      </div>
    </div>
    <div class="survey-legend">
      <span>&#9673; [YOU] &mdash; PLOT FIX</span>
      <span>&#9679; SURVEYED &middot; KNOWN ROUTE</span>
      <span class="lg-fog">&#9711; UNSURVEYED RETURN</span>
      <span class="lg-sig">${sigGlyphChar} ${escapeHtml(collectiblesLbl)} SIGNAL${lincolnDefs.length ? ' &middot; &#9650; LINCOLN SIGNAL' : ''}</span>
    </div>
    <div class="kbd-hint">&#9668; &#9658; &#9650; &#9660; arrow keys traverse surveyed nodes &middot; ENTER pulls the sector sheet &middot; tap any node</div>
  `;
}
