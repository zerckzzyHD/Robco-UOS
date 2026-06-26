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

import { chromium } from 'playwright';
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

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();

  await page.goto(`file://${INDEX.replace(/\\/g, '/')}`);
  // Give boot sequence a moment to settle
  await page.waitForTimeout(800);

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

await browser.close();

if (failed === 0) {
  console.log('\n  All render checks passed.\n');
  process.exit(0);
} else {
  console.error(`\n  ${failed} render check(s) FAILED.\n`);
  process.exit(1);
}
