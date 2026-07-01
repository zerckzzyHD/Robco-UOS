/**
 * tests/browser-shared.mjs — shared-Chromium acquisition helper (audit #8)
 *
 * The full gate runs four Playwright checks (boot-smoke, render-check, a11y,
 * test.html audit). Each used to cold-launch its own Chromium (~4 launches per
 * gate). This helper lets each check REUSE a single Chromium that the gate
 * launches once via tests/browser-server.mjs:
 *
 *   - If PW_WS_ENDPOINT is set (the gate launched a shared browser server),
 *     connect to it. Calling browser.close() on a connected browser only
 *     DISCONNECTS this client — the shared server keeps the browser alive for
 *     the next check (Playwright's documented connect() semantics).
 *   - If it is NOT set (a check run standalone, e.g. `npm run a11y`), fall back
 *     to launching a private Chromium exactly as before.
 *
 * Either way the caller gets a Browser and calls browser.close() when done —
 * the check code does not need to know which mode it is in. Same checks, same
 * assertions, same coverage; fewer browser process spawns.
 */

import { chromium } from 'playwright';

export async function acquireBrowser() {
  const endpoint = process.env.PW_WS_ENDPOINT;
  if (endpoint) {
    return chromium.connect(endpoint);
  }
  return chromium.launch();
}
