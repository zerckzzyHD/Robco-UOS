/**
 * tests/render-check.mjs — Optional Playwright render-check (Protocol 10)
 *
 * Loads index.html at 360px and 412px, opens the WORLD MAP panel, and asserts:
 *   1. No horizontal page overflow (scrollWidth <= innerWidth)
 *   2. Focus does not trigger auto-zoom (visualViewport.scale stays at 1)
 *
 * NOT part of the fast pre-commit gate — run manually (or in the full gate) after
 * map or mobile layout changes to catch real pixel/overflow regressions:
 *
 *   node --experimental-vm-modules tests/render-check.mjs
 *
 * Requires: npm install --save-dev playwright
 *           npx playwright install chromium
 */

import { acquireBrowser } from './browser-shared.mjs';
import { runRenderIntegrity } from './render-integrity.mjs';
import { installFailureCapture, trackBrowser } from './artifacts.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

installFailureCapture('render-check');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');

if (!fs.existsSync(INDEX)) {
  console.error('render-check: index.html not found at', INDEX);
  process.exit(1);
}

const VIEWPORTS = [
  { width: 360, height: 800, label: '360px (narrow mobile)' },
  { width: 412, height: 915, label: '412px (wide mobile)' },
];

let failed = 0;
function pass(msg) {
  console.log('  [PASS]', msg);
}
function fail(msg) {
  console.error('  [FAIL]', msg);
  failed++;
}

const browser = await acquireBrowser();
trackBrowser(browser, 'render-check');

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();

  await page.goto(`file://${INDEX.replace(/\\/g, '/')}`);
  // Give boot sequence a moment to settle
  await page.waitForTimeout(800);

  // The world map lives on the DATA tab (hidden while STAT is active), so switch
  // to it before opening the map panel.
  await page.evaluate(() => {
    if (typeof switchTab === 'function') switchTab('data');
  });
  await page.waitForTimeout(150);

  // Open the World Map panel if it exists
  const mapSummary = page.locator('#worldMapPanel > summary');
  if ((await mapSummary.count()) > 0) {
    await mapSummary.click();
    await page.waitForTimeout(200);
  }

  // 1. No horizontal overflow
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  if (overflow.scrollWidth <= overflow.innerWidth) {
    pass(
      `${vp.label} — no horizontal overflow (scrollWidth ${overflow.scrollWidth} <= ${overflow.innerWidth})`
    );
  } else {
    fail(
      `${vp.label} — horizontal overflow! scrollWidth ${overflow.scrollWidth} > innerWidth ${overflow.innerWidth}`
    );
  }

  // 1b. Restored chat with a long unbroken token in a user/sys message must NOT
  //     stretch the shared 1fr main-grid track (r23 regression guard). scrollWidth
  //     alone does NOT catch this — assert the column widths directly.
  await page.evaluate(() => {
    localStorage.setItem(
      'robco_chat',
      JSON.stringify([
        { sender: 'sys', text: 'SYS' + 'x'.repeat(90) + 'INIT' },
        { sender: 'user', text: 'a'.repeat(100) },
        { sender: 'ai', text: 'A normal spaced reply that wraps fine.' },
      ])
    );
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  const cols = await page.evaluate(() => {
    const w = sel => {
      const e = document.querySelector(sel);
      return e ? Math.round(e.getBoundingClientRect().width) : -1;
    };
    return { iw: window.innerWidth, colLeft: w('.col-left'), colRight: w('.col-right') };
  });
  if (cols.colLeft <= cols.iw + 1 && cols.colRight <= cols.iw + 1) {
    pass(
      `${vp.label} — restored long-token chat does not stretch columns (colLeft ${cols.colLeft}, colRight ${cols.colRight} <= ${cols.iw})`
    );
  } else {
    fail(
      `${vp.label} — restored long-token chat stretched columns! colLeft ${cols.colLeft}, colRight ${cols.colRight} > innerWidth ${cols.iw}`
    );
  }
  await page.evaluate(() => localStorage.removeItem('robco_chat'));

  // 2. Focus does not trigger auto-zoom (input font-size >= 16px guard)
  const scaleAfterFocus = await page.evaluate(() => {
    const el = document.querySelector('input[type="text"], input[type="number"]');
    if (!el) return 1;
    const before = visualViewport ? visualViewport.scale : 1;
    el.focus();
    return visualViewport ? visualViewport.scale : 1;
  });
  if (scaleAfterFocus <= 1.01) {
    pass(`${vp.label} — focus does not trigger viewport zoom (scale ${scaleAfterFocus})`);
  } else {
    fail(
      `${vp.label} — focus triggered zoom! visualViewport.scale=${scaleAfterFocus} (input font-size < 16px?)`
    );
  }

  await ctx.close();
}

// ── Behavioral: Render Fan-out (P7-1) ─────────────────────────────────
// Verify that list-mutators call only their targeted render* function,
// NOT a full loadUI(). Also verifies persistence via localStorage.
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(`file://${INDEX.replace(/\\/g, '/')}`);
  await page.waitForTimeout(1000);

  // delItem: seed one inventory item, call delItem(0), assert targeted render only
  const delItemResult = await page.evaluate(() => {
    const trackedFns = [
      'renderInventory',
      'renderAmmo',
      'renderPerks',
      'renderQuests',
      'renderSquad',
      'renderStatus',
      'renderCampaignNotes',
      'renderCollectibles',
      'renderSessionStats',
      'updateMath',
      'renderWorldMap',
      'renderFactionRep',
    ];
    const counts = {};
    const originals = {};
    trackedFns.forEach(fn => {
      originals[fn] = window[fn];
      window[fn] = function (...args) {
        counts[fn] = (counts[fn] || 0) + 1;
        return originals[fn].apply(this, args);
      };
    });
    // Seed one inventory item then delete it
    state.inventory = [{ name: 'TestSword', qty: 1, wgt: 2, val: 50, type: 'weapon' }];
    delItem(0);
    // Restore originals
    trackedFns.forEach(fn => {
      window[fn] = originals[fn];
    });
    const savedStr = localStorage.getItem('robco_v8');
    return { counts, savedStr };
  });
  const dc = delItemResult.counts;
  if ((dc.renderInventory || 0) >= 1 && (dc.updateMath || 0) >= 1) {
    pass('delItem() calls renderInventory + updateMath (fan-out targeted)');
  } else {
    fail(`delItem() fan-out check failed: ${JSON.stringify(dc)}`);
  }
  if (!dc.renderWorldMap && !dc.renderFactionRep && !dc.renderQuests) {
    pass('delItem() does NOT call renderWorldMap / renderFactionRep / renderQuests');
  } else {
    fail(`delItem() called unexpected renders: ${JSON.stringify(dc)}`);
  }
  const savedAfterDel = delItemResult.savedStr || '';
  if (!savedAfterDel.includes('TestSword')) {
    pass('delItem() persisted: TestSword absent from localStorage after deletion');
  } else {
    fail('delItem() persistence failure: TestSword still in localStorage after deletion');
  }

  // addAmmo / removeAmmo: verify targeted ammo render only
  const ammoResult = await page.evaluate(() => {
    const trackedFns = [
      'renderInventory',
      'renderAmmo',
      'renderPerks',
      'renderQuests',
      'renderSquad',
      'renderStatus',
      'renderCampaignNotes',
      'renderCollectibles',
      'renderSessionStats',
      'updateMath',
      'renderWorldMap',
      'renderFactionRep',
    ];
    const counts = {};
    const originals = {};
    trackedFns.forEach(fn => {
      originals[fn] = window[fn];
      window[fn] = function (...args) {
        counts[fn] = (counts[fn] || 0) + 1;
        return originals[fn].apply(this, args);
      };
    });
    // Set ammo input values and add, then remove
    const typeEl = document.getElementById('newAmmoType');
    const countEl = document.getElementById('newAmmoCount');
    if (typeEl) typeEl.value = '5.56mm';
    if (countEl) countEl.value = '100';
    addAmmo();
    removeAmmo('5.56mm');
    trackedFns.forEach(fn => {
      window[fn] = originals[fn];
    });
    const savedStr = localStorage.getItem('robco_v8');
    return { counts, savedStr };
  });
  const ac = ammoResult.counts;
  if ((ac.renderAmmo || 0) >= 2 && (ac.updateMath || 0) >= 2) {
    pass('addAmmo()+removeAmmo() call renderAmmo + updateMath (fan-out targeted)');
  } else {
    fail(`addAmmo/removeAmmo fan-out check failed: ${JSON.stringify(ac)}`);
  }
  if (!ac.renderInventory && !ac.renderWorldMap && !ac.renderQuests) {
    pass('addAmmo()/removeAmmo() do NOT call renderInventory / renderWorldMap / renderQuests');
  } else {
    fail(`addAmmo/removeAmmo called unexpected renders: ${JSON.stringify(ac)}`);
  }
  const savedAfterAmmo = ammoResult.savedStr || '';
  if (!savedAfterAmmo.includes('"5.56mm"')) {
    pass('removeAmmo() persisted: 5.56mm absent from localStorage after removal');
  } else {
    fail('removeAmmo() persistence failure: 5.56mm still in localStorage after removal');
  }

  await ctx.close();
}

// ── Populated-save mobile overflow guard (Protocol 36 escape-ratchet r75) ──────
// Seeds a worst-case robco_v8 (long unbroken inventory/quest/note tokens) and
// asserts no unexpected inner-element overflow at 360px, 390px, and 412px.
// Excludes the known empty-boot baseline elements (SELECT, INPUT, SUMMARY [+]
// float, faction-card-name) — only flags NEW overflow introduced by save content.
{
  const WORST_CASE_SAVE = JSON.stringify({
    activeContext: 'FNV',
    campaigns: {
      FNV: {
        lvl: 10,
        xp: 5000,
        hpCur: 95,
        hpMax: 100,
        inventory: [
          {
            name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOP',
            qty: 1,
            wgt: 1,
            val: 1,
            type: 'misc',
          },
          {
            name: 'Anti-Materiel Rifle (Extended Magazine Modification)',
            qty: 1,
            wgt: 18,
            val: 8500,
            type: 'weapon',
          },
          {
            name: 'Brotherhood T-51b Power Armor (Fully Repaired)',
            qty: 1,
            wgt: 45,
            val: 6000,
            type: 'armor',
          },
        ],
        quests: [
          {
            name: 'Volare! (Boomers Main Quest: Restore the B-29 from Lake Mead)',
            status: 'active',
            objective:
              'Speak with Loyal about raising the B-29 from Lake Mead and restoring it to flight.',
          },
          {
            name: 'Wild Card: Side Bets (Independent New Vegas Route)',
            status: 'active',
            objective: 'Secure alliances without committing to any faction.',
          },
        ],
        campaign_notes: [
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOP',
        ],
        perks: [{ name: 'Old World Gourmet (Superior Survival Skill Enhancement Perk)', rank: 1 }],
        squad: [{ name: 'Veronica Santangelo (Brotherhood of Steel Scribe)' }],
        factions: {
          ncr: { fame: 500, infamy: 0 },
          legion: { fame: 0, infamy: 200 },
          house: { fame: 100, infamy: 0 },
          bos: { fame: 300, infamy: 0 },
          boomers: { fame: 150, infamy: 0 },
          khans: { fame: 50, infamy: 50 },
          followers: { fame: 200, infamy: 0 },
          powder: { fame: 0, infamy: 400 },
          kings: { fame: 100, infamy: 0 },
          strip: { fame: 200, infamy: 0 },
          freeside: { fame: 50, infamy: 0 },
        },
        gameContext: 'FNV',
        collectibles: [],
        campaignMode: 'standard',
        playthroughType: 'completionist',
        mapView: 'auto',
      },
    },
  });

  const SAVE_VIEWPORTS = [
    { width: 360, height: 800, label: '360px' },
    { width: 390, height: 844, label: '390px' },
    { width: 412, height: 915, label: '412px' },
  ];

  for (const vp of SAVE_VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp });
    await ctx.addInitScript(save => {
      localStorage.setItem('robco_v8', save);
    }, WORST_CASE_SAVE);
    const page = await ctx.newPage();
    await page.goto(`file://${INDEX.replace(/\\/g, '/')}`);
    try {
      await page.waitForFunction(
        () => {
          const bs = document.getElementById('bootScreen');
          return !bs || bs.style.display === 'none' || getComputedStyle(bs).display === 'none';
        },
        { timeout: 8000 }
      );
    } catch {
      /* boot timed out — continue to overflow check */
    }
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.querySelectorAll('details.panel').forEach(d => {
        d.open = true;
      });
    });
    await page.waitForTimeout(200);

    const result = await page.evaluate(() => {
      const offenders = [...document.querySelectorAll('*')]
        .filter(el => el.scrollWidth > el.clientWidth + 1)
        .filter(el => {
          if (el.tagName === 'SELECT' || el.tagName === 'INPUT') return false;
          if (el.tagName === 'SUMMARY') return false;
          const cls = (el.className || '').toString();
          if (cls.includes('faction-card-name') || cls.includes('phosphor-ghost')) return false;
          // OPERATOR reskin (Design Overhaul Phase-3): the BUS-01 CRT trace glow-dot
          // (::after on .hp-bar-fill / #opRadLine, positioned via a negative offset so
          // it visually bleeds past the trace's own tip) and the BUS-02 fader cap
          // (intentionally wider than its .fd-ladder track) are the same harmless
          // decorative-overflow category as .phosphor-ghost above — clipped visually
          // by their .crt-mon/.fd-ladder ancestor, no page-level overflow.
          if (el.closest && (el.closest('.crt-mon') || cls.includes('fd-ladder'))) return false;
          // Phase 3 OPERATOR batch 2 (BUS-05/08 ground-up reskin): .vu-label
          // (the skill-channel name) and .facon-strip-name (the reputation
          // console's per-faction mini-strip label) are the same
          // nowrap+overflow:hidden+text-overflow:ellipsis truncation pattern
          // as the retired .faction-card-name — a long name (e.g. "Energy
          // Weapons", "Followers of the Apocalypse") intentionally clips
          // inside its own fixed-width label, never causing page overflow.
          if (cls.includes('vu-label') || cls.includes('facon-strip-name')) return false;
          // The BUS-08 reputation console's pin markers (.facon-pin in the
          // wide meter, .facon-mini i in the all-faction strip) are
          // position:absolute + translateX(-50%) at a 0%/100% extreme (e.g.
          // a faction at pure fame or pure infamy) — a couple px of
          // decorative bleed past their own track, same harmless, visually-
          // contained category as the BUS-02 fader cap above. No page-level
          // overflow (the SAVE_VIEWPORTS page-overflow check already covers
          // that separately).
          if (cls.includes('facon-scale') || cls.includes('facon-mini')) return false;
          // CHASSIS LIVING CORE (Protocol UI-10): the ring/heart children are
          // positioned via percentage inset + a border, and at the mini
          // core's compact size that combination can round to a couple of
          // stray px past the shape's own box — the same harmless,
          // visually-contained decorative-bleed category as the entries
          // above (the shape already clips its own rendering via
          // overflow:hidden; this is purely a scrollWidth measurement
          // artifact, never a page-level overflow).
          if (cls.includes('chassis-core-shape')) return false;
          return true;
        })
        .map(
          el =>
            `${el.tagName} sw=${el.scrollWidth} cw=${el.clientWidth} "${(el.textContent || '').slice(0, 40).trim()}"`
        );
      return {
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
        offenders,
      };
    });

    if (!result.pageOverflow) {
      pass(`populated-save ${vp.label} — no page-level horizontal overflow`);
    } else {
      fail(`populated-save ${vp.label} — page-level overflow (scrollWidth > innerWidth)`);
    }

    if (result.offenders.length === 0) {
      pass(`populated-save ${vp.label} — no unexpected inner-element overflow`);
    } else {
      fail(
        `populated-save ${vp.label} — unexpected inner overflow: ${result.offenders.slice(0, 3).join('; ')}`
      );
    }

    await ctx.close();
  }
}

// ── DATABANK CARTOGRAPHY TABLE — legend z-order + node-back scroll (owner
// re-fix, Protocol 27 root-cause). The existing Suite 196.30 static test only
// regexes the CSS text for position:relative+z-index:10000 — it can't catch a
// real paint-order regression (e.g. a future overlapping element). These are
// genuine behavioral proofs: elementFromPoint hit-testing for z-order, and a
// real tap-a-node-then-back flow for the scroll-preserve fix.
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`file://${INDEX.replace(/\\/g, '/')}`);
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    if (typeof switchTab === 'function') switchTab('data');
    const panel = document.getElementById('worldMapPanel');
    if (panel) panel.open = true;
  });
  await page.waitForTimeout(200);

  // z-order: the legend/hint text must paint ABOVE the app-wide CRT overlay,
  // at both a moderate and a deep scroll position (the overlay spans the
  // full scrollable glass-frame height, not just one screen).
  for (const scrollY of [0, 900, 3000]) {
    const hit = await page.evaluate(sy => {
      window.scrollTo(0, sy);
      const overlay = document.querySelector('.crt-overlay');
      const legend = document.querySelector('.survey-legend');
      const kbd = document.querySelector('.kbd-hint');
      if (!overlay || !legend || !kbd) return null;
      const wasPE = overlay.style.pointerEvents;
      overlay.style.pointerEvents = 'auto'; // probe only — CSS default is none
      const probe = el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return 'not-visible';
        const cx = r.left + r.width / 2,
          cy = r.top + r.height / 2;
        if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight)
          return 'off-screen';
        const el2 = document.elementFromPoint(cx, cy);
        return el2 === overlay ? 'COVERED-BY-OVERLAY' : 'ok';
      };
      const result = { legend: probe(legend), kbd: probe(kbd) };
      overlay.style.pointerEvents = wasPE;
      return result;
    }, scrollY);
    if (!hit) {
      pass(
        `map legend z-order @scrollY=${scrollY} — elements not present (game may lack a map), skipped`
      );
    } else if (hit.legend !== 'COVERED-BY-OVERLAY' && hit.kbd !== 'COVERED-BY-OVERLAY') {
      pass(
        `map legend z-order @scrollY=${scrollY} — legend/kbd-hint paint above .crt-overlay (${JSON.stringify(hit)})`
      );
    } else {
      fail(
        `map legend z-order @scrollY=${scrollY} — the CRT overlay covers the legend! (${JSON.stringify(hit)})`
      );
    }
  }

  // Owner re-fix (moving cyan line, confirmed on real mobile hardware — never
  // reproduced in headless desktop testing, but the mechanism was confirmed
  // live): .sweep-radar rotates via `transform` with no clipping ancestor, so
  // its rotated bounding box measurably grows past .table-frame's own edges
  // for most of its 8s rotation (a rotated square's bbox grows up to sqrt(2)x)
  // — geometrically reaching .survey-legend's own bounding box. Desktop-engine
  // z-index/DOM-order happened to still protect the text in every test run,
  // but mix-blend-mode:screen with no isolation:isolate boundary is a
  // documented class of cross-device/GPU compositing inconsistency this
  // couldn't rule out. Fixed defensively: .table-frame now clips
  // (overflow:hidden) so the sweep can never visually escape its own board
  // regardless of engine, and isolation:isolate gives the blend mode an
  // unambiguous compositing boundary. This proof forces the sweep to its
  // worst-case 45° bleed angle and asserts nothing paints outside the board.
  {
    const clipCheck = await page.evaluate(() => {
      const tf = document.querySelector('.table-frame');
      const sweep = document.querySelector('.sweep-radar');
      const legend = document.querySelector('.survey-legend');
      const kbd = document.querySelector('.kbd-hint');
      if (!tf || !sweep || !legend || !kbd) return null;
      const cs = getComputedStyle(tf);
      // legend/kbd must sit OUTSIDE the clipped container (later DOM siblings,
      // never descendants) — the clip alone is what keeps the sweep off them.
      const legendIsDescendant = tf.contains(legend);
      const kbdIsDescendant = tf.contains(kbd);

      sweep.style.animation = 'none';
      sweep.style.transform = 'rotate(45deg)'; // the measured worst-case bleed angle
      const wasPE = sweep.style.pointerEvents;
      sweep.style.pointerEvents = 'auto'; // probe only — CSS default is none
      const probe = el => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2,
          cy = r.top + r.height / 2;
        const el2 = document.elementFromPoint(cx, cy);
        return el2 === sweep ? 'COVERED-BY-SWEEP' : 'ok';
      };
      const result = { legend: probe(legend), kbd: probe(kbd) };
      sweep.style.pointerEvents = wasPE;
      sweep.style.animation = '';
      sweep.style.transform = '';
      return {
        overflow: cs.overflow,
        isolation: cs.isolation,
        legendIsDescendant,
        kbdIsDescendant,
        ...result,
      };
    });
    if (!clipCheck) {
      pass('map sweep-radar containment — elements not present (game may lack a map), skipped');
    } else {
      if (clipCheck.overflow === 'hidden') {
        pass('map sweep-radar containment — .table-frame clips (overflow:hidden)');
      } else {
        fail(
          `map sweep-radar containment — .table-frame overflow is "${clipCheck.overflow}", expected "hidden"`
        );
      }
      if (clipCheck.isolation === 'isolate') {
        pass(
          'map sweep-radar containment — .table-frame isolates blend-mode compositing (isolation:isolate)'
        );
      } else {
        fail(
          `map sweep-radar containment — .table-frame isolation is "${clipCheck.isolation}", expected "isolate"`
        );
      }
      if (!clipCheck.legendIsDescendant && !clipCheck.kbdIsDescendant) {
        pass(
          'map sweep-radar containment — .survey-legend/.kbd-hint sit outside the clipped .table-frame'
        );
      } else {
        fail(
          'map sweep-radar containment — .survey-legend/.kbd-hint are descendants of the clipped .table-frame (should be later siblings)'
        );
      }
      if (clipCheck.legend !== 'COVERED-BY-SWEEP' && clipCheck.kbd !== 'COVERED-BY-SWEEP') {
        pass(
          `map sweep-radar containment — at the worst-case 45° bleed angle, nothing paints over legend/kbd-hint (${JSON.stringify(clipCheck)})`
        );
      } else {
        fail(
          `map sweep-radar containment — the sweep covers the legend/kbd-hint at 45°! ${JSON.stringify(clipCheck)}`
        );
      }
    }
  }

  // node-back scroll preservation: tap a node deep in a long scroll, back out,
  // and assert the panel's own viewport position is unchanged (Protocol 27 —
  // a raw scrollTop restore breaks because the full-grid vs sector-sheet
  // views are very different heights).
  const scrollResult = await page.evaluate(() => {
    window.scrollTo(0, 0);
    const panel = document.getElementById('worldMapPanel');
    panel.scrollIntoView({ block: 'center' });
    const before = panel.getBoundingClientRect().top;
    const zone =
      typeof FALLOUT_REGISTRY !== 'undefined' && FALLOUT_REGISTRY.zones && FALLOUT_REGISTRY.zones[0]
        ? FALLOUT_REGISTRY.zones[0].name
        : null;
    if (!zone || typeof zoomMapToZone !== 'function') return null;
    zoomMapToZone(zone);
    resetMapZoom();
    const after = panel.getBoundingClientRect().top;
    return { before, after, delta: after - before };
  });
  if (!scrollResult) {
    pass('map node-back scroll preservation — zones/functions not present, skipped');
  } else if (Math.abs(scrollResult.delta) <= 2) {
    pass(
      `map node-back scroll preservation — panel stays at the same viewport position (delta ${scrollResult.delta}px)`
    );
  } else {
    fail(
      `map node-back scroll preservation — panel jumped ${scrollResult.delta}px after tapping a node then backing out! ${JSON.stringify(scrollResult)}`
    );
  }

  await ctx.close();
}

// ── PATCH NOTES auto-open gate (owner report investigation — Protocol 42:
// verified harness-only, not a bug, locking the invariant with a permanent
// regression guard). _runBootSequenceAndBriefing() (ui-core.js) shows the
// changelog modal automatically after boot ONLY when
// MetaStore.get('robco_version') !== APP_VERSION, then immediately persists
// APP_VERSION via MetaStore.set() — an intentional, once-per-version "what's
// new" feature (WU-C11/Suite 62), not a per-boot popup. Confirmed live: with
// robco_version pre-seeded to the CURRENT APP_VERSION (simulating a device
// that has already seen this version's patch notes), the modal correctly
// stays closed through boot. This proof locks that gate so a future
// regression (e.g. the version stamp landing after the read, or a duplicate
// call site) can't silently turn this into an every-reload popup.
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`file://${INDEX.replace(/\\/g, '/')}`);
  await page.waitForTimeout(1000);
  const appVersion = await page.evaluate(() =>
    typeof APP_VERSION !== 'undefined' ? APP_VERSION : null
  );
  if (!appVersion) {
    pass('PATCH NOTES auto-open gate — APP_VERSION not present, skipped');
  } else {
    await page.evaluate(v => localStorage.setItem('robco_version', v), appVersion);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(4500); // past the ~3.9s post-boot changelog-fetch window
    const modalDisplay = await page.evaluate(() => {
      const m = document.getElementById('sysModal');
      return m ? getComputedStyle(m).display : 'no-element';
    });
    if (modalDisplay === 'none') {
      pass(
        `PATCH NOTES auto-open gate — with robco_version already matching APP_VERSION (${appVersion}), the modal stays closed through boot`
      );
    } else {
      fail(
        `PATCH NOTES auto-open gate — the changelog modal opened even though robco_version already matched APP_VERSION (${appVersion})! This would make it a per-reload popup instead of a once-per-version one.`
      );
    }
  }
  await ctx.close();
}

// ── OPERATOR TRAITS (FNV) — uniform chip size + full-row clickability
// (owner report). Every trait chip must render at the SAME width and the
// whole chip (not just its inner toggle glyph) must be clickable.
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`file://${INDEX.replace(/\\/g, '/')}`);
  await page.waitForTimeout(1000);
  const traitInfo = await page.evaluate(() => {
    if (typeof switchTab === 'function') switchTab('stat');
    document.querySelectorAll('details').forEach(d => (d.open = true));
    if (typeof renderTraits === 'function') renderTraits();
    const rows = Array.from(document.querySelectorAll('#traitsDisplay .tracker-row'));
    if (rows.length === 0) return null;
    const widths = rows.map(r => Math.round(r.getBoundingClientRect().width));
    // Click the far-right edge of an unselected row (away from the toggle
    // glyph) and confirm the trait toggles — proves whole-row clickability.
    const target = rows.find(r => !r.classList.contains('tracker-toggle--active'));
    let toggled = false;
    if (target) {
      const name = target.dataset.name;
      const before = Array.isArray(state.traits) ? state.traits.slice() : [];
      const rect = target.getBoundingClientRect();
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: rect.right - 4,
          clientY: rect.top + rect.height / 2,
        })
      );
      const after = Array.isArray(state.traits) ? state.traits.slice() : [];
      toggled = !before.includes(name) && after.includes(name);
      if (toggled) toggleTrait(name); // revert
    }
    return {
      widths,
      uniform: new Set(widths).size === 1,
      toggled,
      allButtons: rows.every(r => r.tagName === 'BUTTON'),
    };
  });
  if (!traitInfo) {
    pass('OPERATOR traits chip uniformity — no traits registry for this game, skipped');
  } else {
    if (traitInfo.uniform) {
      pass(
        `OPERATOR traits — every chip renders at the same width (${traitInfo.widths[0]}px, n=${traitInfo.widths.length})`
      );
    } else {
      fail(`OPERATOR traits — chip widths are NOT uniform: ${JSON.stringify(traitInfo.widths)}`);
    }
    if (traitInfo.allButtons) {
      pass('OPERATOR traits — every chip is a real <button> (Protocol UI-5)');
    } else {
      fail('OPERATOR traits — a chip is not a <button> element');
    }
    if (traitInfo.toggled) {
      pass('OPERATOR traits — clicking the far edge of a chip (not the toggle glyph) toggles it');
    } else {
      fail(
        'OPERATOR traits — clicking the far edge of a chip did NOT toggle it (not fully clickable)'
      );
    }
  }
  await ctx.close();
}

// ── CROSS-GAME LOCAL-SLOT SWITCH — stale-registry regression (Protocol 13,
// owner report: "FO3 suggests NV locations"). Root cause: _applySlotEnvelope()
// (js/ui/ui-saves.js — the shared core behind LOAD SLOT and VERSION RESTORE)
// applied a cross-game slot IN PLACE (loadUI() only, no reload) even though it
// already detects and confirms the context mismatch. FALLOUT_REGISTRY and
// databaseCSVs are boot-time-only globals (index.html's GAME_FILES manifest
// loads exactly ONE of reg_nv.js/reg_fo3.js + db_nv.js/db_fo3.js) — an
// in-place apply left them stuck on the OLD game's data while state.gameContext
// silently flipped to the new game. Every registry-backed surface (location/
// item/quest/perk autocomplete, native LOOT/THREAT/CONSULT lookups, and the
// AI's own databaseCSVs system context) was affected, not just the location
// box the owner happened to notice. Fixed: the cross-game branch now persists
// robco_v8 and reloads, exactly like every other cross-game apply path
// (onGameContextChange, loadCloudSave, restoreCloudSaveVersion) already did.
// These are REAL end-to-end proofs (real reload, real reg_nv.js/reg_fo3.js) —
// a source-text grep cannot see a stale object surviving in memory, which is
// exactly how this bug shipped past all 3207 prior tests.
{
  const NV_ONLY_LOCATION = 'Novac';
  const FO3_ONLY_LOCATION = 'Megaton';

  async function waitBooted(page) {
    await page
      .waitForFunction(
        () => {
          const bs = document.getElementById('bootScreen');
          return !bs || bs.style.display === 'none' || getComputedStyle(bs).display === 'none';
        },
        { timeout: 8000 }
      )
      .catch(() => {});
    await page.waitForTimeout(500);
  }

  // Boots once (fresh/default), then — if seedFn is given — writes localStorage
  // in-page and does ONE controlled page.reload() so the boot loader picks up
  // the seed. This is deliberately NOT addInitScript: addInitScript re-runs on
  // every navigation in this context, which would silently re-clobber the
  // localStorage state the APP itself writes just before ITS OWN reload later
  // (the exact mechanism under test) and defeat the whole proof.
  async function seedAndBoot(browser, seedFn) {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await ctx.newPage();
    await page.goto(`file://${INDEX.replace(/\\/g, '/')}`);
    await waitBooted(page);
    if (seedFn) {
      await page.evaluate(seedFn);
      // The app's own beforeunload flush (js/ui/ui-core.js) re-derives
      // robco_v8.activeContext from the CURRENTLY RUNNING page's state.gameContext
      // (still whatever the first default boot loaded) and writes it back over
      // whatever we just seeded — unless window._loadingSave/_contextSwitching is
      // set first, exactly the guard every real reload path in the app sets before
      // its own reload (Suite 95.8/95.9 precedent). This is OUR harness triggering
      // a raw page.reload(), not the app's own guarded reload, so we must set the
      // same guard ourselves or the flush silently clobbers the seed we just wrote.
      await page.evaluate(() => {
        window._loadingSave = true;
      });
      await page.reload({ waitUntil: 'load' });
      await waitBooted(page);
    }
    return { ctx, page };
  }

  async function locationDatalistNames(page) {
    return page.evaluate(() =>
      Array.from(document.querySelectorAll('#locationOptions option')).map(o => o.value)
    );
  }

  async function registryVersion(page) {
    return page.evaluate(() =>
      typeof FALLOUT_REGISTRY !== 'undefined' ? FALLOUT_REGISTRY.version : null
    );
  }

  // 1. Fresh-boot baseline — NV (default, no seed). Proves the normal
  //    no-switch path is unaffected by this fix.
  {
    const { ctx, page } = await seedAndBoot(browser, null);
    const names = await locationDatalistNames(page);
    const version = await registryVersion(page);
    if (
      names.includes(NV_ONLY_LOCATION) &&
      !names.includes(FO3_ONLY_LOCATION) &&
      version === '2.0.0'
    ) {
      pass(
        'fresh-boot NV — #locationOptions/FALLOUT_REGISTRY carry NV data only (Novac present, Megaton absent, version 2.0.0)'
      );
    } else {
      fail(
        `fresh-boot NV — registry wrong: version=${version}, locations=${JSON.stringify(names)}`
      );
    }
    await ctx.close();
  }

  // 2. Fresh-boot baseline — FO3 (seeded activeContext, no slot switch
  //    involved). Proves a plain FO3 boot is unaffected by this fix.
  {
    const { ctx, page } = await seedAndBoot(browser, () => {
      localStorage.setItem(
        'robco_v8',
        JSON.stringify({ activeContext: 'FO3', campaigns: { FO3: { gameContext: 'FO3' } } })
      );
    });
    const names = await locationDatalistNames(page);
    const version = await registryVersion(page);
    if (
      names.includes(FO3_ONLY_LOCATION) &&
      !names.includes(NV_ONLY_LOCATION) &&
      version === '2.0.0-fo3'
    ) {
      pass(
        'fresh-boot FO3 — #locationOptions/FALLOUT_REGISTRY carry FO3 data only (Megaton present, Novac absent, version 2.0.0-fo3)'
      );
    } else {
      fail(
        `fresh-boot FO3 — registry wrong: version=${version}, locations=${JSON.stringify(names)}`
      );
    }
    await ctx.close();
  }

  // 3. THE BUG: boot NV, LOAD a FO3 slot — must reload and end up on FO3 data
  //    only (this is the exact owner-reported scenario).
  {
    const { ctx, page } = await seedAndBoot(browser, () => {
      localStorage.setItem(
        'robco_v8',
        JSON.stringify({ activeContext: 'FNV', campaigns: { FNV: { gameContext: 'FNV' } } })
      );
      localStorage.setItem(
        'robco_slot_1',
        JSON.stringify({
          version: '1.0.0',
          state: { gameContext: 'FO3' },
          chat: [],
          playstyle: 'any',
          savedAt: Date.now(),
          slotName: 'SLOT A',
          gameContext: 'FO3',
        })
      );
    });

    const beforeNames = await locationDatalistNames(page);
    const beforeOk =
      beforeNames.includes(NV_ONLY_LOCATION) && !beforeNames.includes(FO3_ONLY_LOCATION);
    if (beforeOk) {
      pass(
        'cross-game slot load (NV→FO3) — pre-load sanity: still showing NV-only locations before LOAD'
      );
    } else {
      fail(
        `cross-game slot load (NV→FO3) — pre-load sanity failed: ${JSON.stringify(beforeNames)}`
      );
    }

    await page.evaluate(() => {
      window.confirmAction = () => Promise.resolve(true); // auto-approve CONTEXT MISMATCH
    });
    const navPromise = page.waitForNavigation({ timeout: 10000 }).catch(() => null);
    await page.evaluate(() => {
      loadFromSlot(1);
    });
    await navPromise;
    await waitBooted(page);

    const afterCtx = await page.evaluate(() =>
      typeof state !== 'undefined' ? state.gameContext : null
    );
    const afterNames = await locationDatalistNames(page);
    const afterVersion = await registryVersion(page);
    const afterOk =
      afterNames.includes(FO3_ONLY_LOCATION) &&
      !afterNames.includes(NV_ONLY_LOCATION) &&
      afterVersion === '2.0.0-fo3';

    if (afterCtx === 'FO3') {
      pass('cross-game slot load (NV→FO3) — state.gameContext is FO3 after the reload');
    } else {
      fail(`cross-game slot load (NV→FO3) — state.gameContext is "${afterCtx}", expected "FO3"`);
    }
    if (afterOk) {
      pass(
        'cross-game slot load (NV→FO3) — FALLOUT_REGISTRY/#locationOptions now carry FO3-only data (Megaton present, Novac ABSENT) — the reported bug is fixed'
      );
    } else {
      fail(
        `cross-game slot load (NV→FO3) — [REGRESSION] registry still stale after the switch: version=${afterVersion}, locations=${JSON.stringify(afterNames)}`
      );
    }
    await ctx.close();
  }

  // 4. Reverse direction: boot FO3, LOAD an NV slot.
  {
    const { ctx, page } = await seedAndBoot(browser, () => {
      localStorage.setItem(
        'robco_v8',
        JSON.stringify({ activeContext: 'FO3', campaigns: { FO3: { gameContext: 'FO3' } } })
      );
      localStorage.setItem(
        'robco_slot_1',
        JSON.stringify({
          version: '1.0.0',
          state: { gameContext: 'FNV' },
          chat: [],
          playstyle: 'any',
          savedAt: Date.now(),
          slotName: 'SLOT A',
          gameContext: 'FNV',
        })
      );
    });

    await page.evaluate(() => {
      window.confirmAction = () => Promise.resolve(true);
    });
    const navPromise = page.waitForNavigation({ timeout: 10000 }).catch(() => null);
    await page.evaluate(() => {
      loadFromSlot(1);
    });
    await navPromise;
    await waitBooted(page);

    const afterCtx = await page.evaluate(() =>
      typeof state !== 'undefined' ? state.gameContext : null
    );
    const afterNames = await locationDatalistNames(page);
    const afterVersion = await registryVersion(page);
    const afterOk =
      afterNames.includes(NV_ONLY_LOCATION) &&
      !afterNames.includes(FO3_ONLY_LOCATION) &&
      afterVersion === '2.0.0';

    if (afterCtx === 'FNV') {
      pass('cross-game slot load (FO3→NV) — state.gameContext is FNV after the reload');
    } else {
      fail(`cross-game slot load (FO3→NV) — state.gameContext is "${afterCtx}", expected "FNV"`);
    }
    if (afterOk) {
      pass(
        'cross-game slot load (FO3→NV) — FALLOUT_REGISTRY/#locationOptions now carry NV-only data (Novac present, Megaton ABSENT)'
      );
    } else {
      fail(
        `cross-game slot load (FO3→NV) — [REGRESSION] registry still stale after the switch: version=${afterVersion}, locations=${JSON.stringify(afterNames)}`
      );
    }
    await ctx.close();
  }

  // 5. Same-game slot load must NOT reload (unchanged fast in-place path) —
  //    proves this fix didn't turn every LOAD into an unnecessary full reboot.
  {
    const { ctx, page } = await seedAndBoot(browser, () => {
      localStorage.setItem(
        'robco_v8',
        JSON.stringify({ activeContext: 'FNV', campaigns: { FNV: { gameContext: 'FNV' } } })
      );
      localStorage.setItem(
        'robco_slot_1',
        JSON.stringify({
          version: '1.0.0',
          state: { gameContext: 'FNV', lvl: 7 },
          chat: [],
          playstyle: 'any',
          savedAt: Date.now(),
          slotName: 'SLOT A',
          gameContext: 'FNV',
        })
      );
    });
    await page.evaluate(() => {
      window.confirmAction = () => Promise.resolve(true);
    });
    const result = await page.evaluate(async () => {
      window.__preLoadMarker = 'still-here';
      await window.loadFromSlot(1);
      return { lvl: state.lvl, markerRightAfter: window.__preLoadMarker };
    });
    // Give a would-be reload (the cross-game path's 2s setTimeout) time to fire
    // if this regressed — a real navigation would wipe window.__preLoadMarker.
    await page.waitForTimeout(2500);
    const markerAfterWait = await page
      .evaluate(() => window.__preLoadMarker)
      .catch(() => undefined);

    if (result.lvl === 7 && result.markerRightAfter === 'still-here') {
      pass(
        'same-game slot load — applies state in-place synchronously (lvl 7 from the slot, no reload yet)'
      );
    } else {
      fail(`same-game slot load — in-place apply failed: ${JSON.stringify(result)}`);
    }
    if (markerAfterWait === 'still-here') {
      pass('same-game slot load — does NOT reload the page (unchanged fast in-place path)');
    } else {
      fail('same-game slot load — [REGRESSION] the page reloaded even for a same-game slot');
    }
    await ctx.close();
  }
}

// U6 Strand 4 — render-integrity (Protocol 36b escape-ratchet for the class
// of defect U5 shipped with a fully-green gate: MANIFEST rendering
// completely invisible). Runs on the SAME shared Chromium (zero extra
// launches) — see tests/render-integrity.mjs for the six assertions (U9
// added #6, box-vs-figure limb alignment) and the demonstrate-red-then-green
// evidence in its own header.
{
  const { failed: integrityFailed, log } = await runRenderIntegrity(browser);
  console.log(
    '\n  -- render-integrity (12-load matrix: FO3 landscape/portrait/desktop + NV x3, populated/empty) --'
  );
  console.log(log.join('\n'));
  failed += integrityFailed;
}

await browser.close();

if (failed === 0) {
  console.log('\n  All render checks passed.\n');
  process.exit(0);
} else {
  console.error(`\n  ${failed} render check(s) FAILED.\n`);
  process.exit(1);
}
