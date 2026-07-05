/**
 * tests/render-check.mjs — Optional Playwright render-check (Protocol 10)
 *
 * Loads index.html at 360px and 412px, opens the WORLD MAP panel, and asserts:
 *   1. No horizontal page overflow (scrollWidth <= innerWidth)
 *   2. Focus does not trigger auto-zoom (visualViewport.scale stays at 1)
 *
 * NOT part of the 243-test pre-commit gate — run manually after map or mobile
 * layout changes to catch real pixel/overflow regressions:
 *
 *   node --experimental-vm-modules tests/render-check.mjs
 *
 * Requires: npm install --save-dev playwright
 *           npx playwright install chromium
 */

import { acquireBrowser } from './browser-shared.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

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

await browser.close();

if (failed === 0) {
  console.log('\n  All render checks passed.\n');
  process.exit(0);
} else {
  console.error(`\n  ${failed} render check(s) FAILED.\n`);
  process.exit(1);
}
