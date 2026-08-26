import { defineConfig } from 'vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * `/reports` — the private overnight/morning reports, rendered to phone-readable
 * HTML on demand.
 *
 * ── ⛔ WHY THIS IS A ROUTE AND NOT A FOLDER ──────────────────────────────────
 * The reports are NOT publishable: they describe internal architecture and one of
 * them documents a live exposure in remediation detail. This repository is
 * PUBLIC. So the content is never placed in the checkout at all — not committed,
 * not staged, not dropped in a gitignored subdirectory. It is read from an
 * out-of-repo path at request time, rendered in memory, and written only into the
 * response body. There is no build step, no output directory and no cache: after
 * a request finishes, nothing of the report exists on this side.
 *
 * ⚠ "Gitignored subdirectory" is specifically rejected, not overlooked. A dev
 * server serves what is in its root regardless of what git thinks of it, so
 * ignoring a folder would hide the content from commits while leaving it fully
 * served — and the recent near-miss on this project was exactly an exclusion list
 * that had not been updated for a new folder. Outside the repo is a property
 * nothing has to remember.
 *
 * ── WHY IT RIDES THE EXISTING DEV SERVER RATHER THAN A SECOND ONE ────────────
 * The alternative was a small static server on its own port with its own
 * `tailscale serve` mapping. Rejected on durability of state: a second mapping is
 * PERSISTENT machine configuration that outlives the feature, and a stale one
 * pointing at a port that some later process reuses would proxy the tailnet to
 * whatever now answers there. This route leaves nothing behind — stop the dev
 * server and it ceases to exist. It also inherits the loopback bind and the
 * `allowedHosts` entry below, both of which took real debugging to get right; a
 * second server would have to re-earn them, and a localhost-only check would pass
 * while it was broken.
 *
 * ⚠ THE COST OF THAT CHOICE, NAMED: private content now shares an origin with the
 * app's dev server, so widening this server's bind would expose the reports too.
 * That is a real coupling, and it is why the bind is asserted by the gate rather
 * than left to the comment below to defend.
 */
function reportsRoute() {
  return {
    name: 'robco-reports',
    apply: 'serve', // ⛔ dev only — never part of any build output
    configureServer(server) {
      const paths = require('./scripts/planning-paths.js');
      const view = require('./scripts/report-view.js');
      server.middlewares.use('/reports', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const send = (code, html) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          // Never let an intermediary or the phone keep a copy of private prose.
          res.setHeader('Cache-Control', 'no-store, max-age=0');
          res.setHeader('Referrer-Policy', 'no-referrer');
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          res.end(req.method === 'HEAD' ? '' : html);
        };
        // `req.url` is already relative to the mount point.
        const raw = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
        if (!raw)
          // ⛔ Both read AT REQUEST TIME. The board is regenerated as work closes,
          // sometimes mid-read, so a cached copy would present a stale picture as
          // the current one -- which defeats the only thing the board is for.
          return send(
            200,
            view.renderIndex(paths.listReports(), paths.describeReports(), paths.readRoadmap())
          );
        // ⛔ The name is validated inside planning-paths (pattern + containment).
        // A rejected name is indistinguishable here from a missing one, on purpose.
        const md = paths.readReport(raw);
        if (md === null) return send(404, view.renderNotFound());
        return send(200, view.renderReport(raw, md));
      });
    },
  };
}

// Vite dev-server config. This file exists ONLY for local development -- the app
// itself is a static site with no build step (see README "Hosting & Release Flow"),
// so nothing here affects staging or production. Vite never builds this project.
export default defineConfig({
  plugins: [reportsRoute()],
  server: {
    // --- Real-device (phone) testing over Tailscale --------------------------
    //
    // BOTH SETTINGS BELOW ARE REQUIRED. They fix two different things, and removing
    // either one breaks phone testing in a way that looks confusingly like the other:
    //
    //   * `allowedHosts` satisfies the HOST-HEADER check. Without it the phone gets
    //     Vite's "Blocked request. This host (...) is not allowed." page.
    //   * `host` decides which ADDRESS is bound. Without it nothing is listening on
    //     IPv4 loopback and `tailscale serve` returns a bare HTTP 502.
    //
    // So the failure mode tells you which half is wrong: a 502 means the BIND is
    // wrong; a "Blocked request" page means the HOST LIST is. Fixing only one of the
    // two leaves it just as broken, with a different error.
    //
    // WHY ANY OF THIS EXISTS. Chrome only grants secure-context on https://, localhost
    // and 127.0.0.1. Over plain http:// navigator.serviceWorker does not exist at all
    // -- so the service worker never registers and the entire PWA layer (update
    // prompt, offline, install-to-home-screen) is untestable on a real phone. Running
    // `tailscale serve --bg 5173` puts a real HTTPS origin with a valid cert in front
    // of this dev server, which gets that secure context back.

    // HALF 1 -- the host-header check. Vite's DNS-rebinding guard rejects any Host it
    // was not told about, and there is no CLI flag for it: it is config-only.
    //
    // THE HOSTNAME IS TAILNET-ONLY. rog-ally.tail03c626.ts.net resolves only inside
    // this private tailnet (MagicDNS); it is not a public domain and does not resolve
    // on the open internet. Do not delete it as mystery config, and do NOT copy this
    // pattern for a public hostname.
    //
    // Keep this an EXPLICIT list. Never set `allowedHosts: true` (or add a wildcard):
    // that disables the DNS-rebinding protection entirely rather than naming what is
    // trusted.
    allowedHosts: ['rog-ally.tail03c626.ts.net'],

    // HALF 2 -- the bind address, named EXPLICITLY rather than left to the default.
    //
    // Vite's default is the bare string 'localhost', which Node hands to DNS. On this
    // machine that resolves to the IPv6 loopback first, so the server listens on
    // [::1]:5173 and NOTHING is on 127.0.0.1:5173 (measured with
    // `netstat -ano | findstr 5173`). `tailscale serve` proxies to
    // http://127.0.0.1:5173, finds nothing there, and returns HTTP 502. Naming the
    // address removes the DNS step, so the bind is deterministic.
    //
    // Must stay a LOOPBACK address. Never '0.0.0.0' and never `true`: those bind the
    // local Wi-Fi too. Keeping the dev server reachable ONLY through the tailnet proxy
    // is the property worth preserving here.
    host: '127.0.0.1',
  },
});
