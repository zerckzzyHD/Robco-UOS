#!/usr/bin/env node
/**
 * scripts/dev-env-marker.js — the ONE definition of the environment marker the
 * dev server stamps into the HTML it serves. Dev only; nothing here ships.
 *
 * ── ⛔ THE BUG THIS FIXES ────────────────────────────────────────────────────
 * The Diagnostic Shell (js/dev/test-console.js) is gated by `_isStagingEnv()`
 * in js/ui/ui-core.js, which recognises exactly three signals:
 *
 *   1. <meta name="robco-env" content="staging">  — written ONLY by
 *      scripts/cf-staging-build.mjs, into the Cloudflare staging build;
 *   2. window.__ROBCO_ENV__ === 'staging'         — read, but set by NOTHING in
 *      this repository (measured: one reference, and it is the read);
 *   3. location.hostname being `localhost`, `127.0.0.1`, or `*.pages.dev`.
 *
 * The tailnet dev origin is `rog-ally.tail03c626.ts.net`. It is not any of those
 * hostnames, it is not the Cloudflare build, and nothing sets the global — so
 * `_isStagingEnv()` returned false and the shell never mounted. ⭐ The SAME dev
 * server, serving the SAME bytes, showed the shell at 127.0.0.1 and hid it over
 * the tailnet: measured byte-for-byte identical HTML on both origins, with
 * `_isStagingEnv()` true on one and false on the other. The panel was never
 * missing from the branch or stripped by a build — it was hidden by a hostname
 * test that predates this origin existing.
 *
 * ── ⭐ WHY A MARKER, AND NOT ONE MORE HOSTNAME ──────────────────────────────
 * Adding `rog-ally.tail03c626.ts.net` to that hostname list would work today and
 * be wrong in kind. A hostname list is a STRING SHIPPED IN PUBLIC APP CODE that
 * says "trust anything answering to this name": it grows every time a new origin
 * appears, it is read by production builds that have no business knowing the
 * name, and it fails OPEN if a host ever matches by accident.
 *
 * This is the inverse. The signal is emitted BY THE DEV SERVER, at serve time,
 * into the response — so the predicate is "this page was served by a dev server
 * somebody started on this machine", which is the actual question. It is
 * positive (a thing must be present, not absent), and it is host-agnostic, so it
 * already covers every future origin the dev server is reached on.
 *
 * ⛔⛤ IT CANNOT REACH A PUBLISHED SURFACE, AND THAT IS STRUCTURAL RATHER THAN
 * CAREFUL. This repo's remote is PUBLIC and the museum is generated from it, so
 * "not production" is not a good enough gate — the bar is "served by the dev
 * server" versus "published". Three independent reasons this clears that bar:
 *
 *   · The on-disk index.html is UNCHANGED. Production (GitHub Pages, from
 *     `main`) serves the file from the repository, and the repository has no
 *     marker in it. Suite 249.12 asserts that absence, so a later "helpful"
 *     hardcode of the marker into the source goes red.
 *   · The injecting plugin is `apply: 'serve'` — it exists only inside a running
 *     dev server and is not part of any build output. Vite never builds this
 *     project at all (vite.config.mjs's own header: the app is a static site
 *     with no build step), so there is no artifact for it to leak into.
 *   · The museum generator reads repository files from disk, never this server's
 *     responses.
 *
 * The marker itself is not new and not a second mechanism: it is the SAME meta
 * tag scripts/cf-staging-build.mjs already injects for Cloudflare staging, so
 * the dev origin and the staging origin now agree instead of one of them being
 * special. 249.12 asserts the two spellings stay identical, because a marker
 * with two definitions is a marker that eventually has two values.
 */
'use strict';

const ENV_META_NAME = 'robco-env';
const ENV_STAGING = 'staging';

/**
 * The Vite `transformIndexHtml` descriptor for the marker.
 *
 * `head-prepend` so the tag is parsed before any script that might read it —
 * `_isStagingEnv()` runs well after DOMContentLoaded today, but ordering that
 * depends on when a caller happens to run is ordering that breaks later.
 */
function devEnvMarkerTag() {
  return {
    tag: 'meta',
    attrs: { name: ENV_META_NAME, content: ENV_STAGING },
    injectTo: 'head-prepend',
  };
}

module.exports = { ENV_META_NAME, ENV_STAGING, devEnvMarkerTag };
