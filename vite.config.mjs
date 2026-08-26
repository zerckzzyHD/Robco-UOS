import { defineConfig } from 'vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * ⭐ RE-READ A RENDERER FROM DISK, RATHER THAN TRUSTING THE ONE IN MEMORY.
 *
 * ⛔ THE TRAP THIS CLOSES, MEASURED RATHER THAN IMAGINED. Node caches CommonJS
 * modules per PROCESS, and this dev server runs for DAYS — Vite's config restart
 * reuses the same process, so it does not clear them either. Once a renderer is
 * loaded, every later edit to it is invisible here while remaining perfectly
 * correct on disk.
 *
 * That failure mode is the worst available: the page keeps answering, at the same
 * status, with plausible content — so nothing anywhere reports a problem. It has
 * already cost this project twice: a defect was debugged after it had been fixed,
 * and a set of layout measurements was taken against a page that was not the page
 * in the repository. Neither was noticed by the person reading the page, because
 * there is nothing to notice.
 *
 * ⚠ THE ORDER MATTERS. Clearing only the entry point leaves its dependencies
 * cached, and a freshly-loaded module then closes over a STALE one — which looks
 * exactly like a partial fix. So the whole chain is cleared, deepest first, and
 * only then is the entry required.
 *
 * Dev-only (`apply: 'serve'` on both routes below), and the cost is re-parsing a
 * few small files per request on a personal server. That is not a trade worth
 * thinking about; being unable to trust what you are looking at is.
 */
const VIEW_CHAIN = [
  // ⚠ DATA READERS BELONG IN THIS LIST TOO, and leaving one out is not a
  // half-measure — it is the whole defect, unchanged. A reader omitted here is
  // required through the ordinary cache and never cleared, so the freshly-loaded
  // views above it close over a STALE one and the page looks correct while
  // reporting from code that is no longer on disk. Caught exactly that way: a
  // resolver was edited to remove a fallback, the tests agreed it was gone, and
  // the running server kept resolving through the old copy for another hour.
  './scripts/control-state.js', // operational state reader — deepest
  './scripts/queue-view.js', // markdown renderer — deepest
  './scripts/report-view.js', // page shell + report rendering
  './scripts/home-view.js', // landing page
  './scripts/status-view.js', // operational snapshot
  './scripts/ledger-view.js', // append-only log window
];
function freshRequire(entry) {
  for (const id of VIEW_CHAIN) {
    try {
      delete require.cache[require.resolve(id)];
    } catch {
      // A module that cannot be resolved was never cached — nothing to clear.
    }
  }
  return require(entry);
}

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
      server.middlewares.use('/reports', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        // ⛔ Per request, never hoisted to setup — see freshRequire's header. This
        // is the page read most, and it HAS served stale content from memory.
        const view = freshRequire('./scripts/report-view.js');
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
            view.renderIndex(
              paths.listReports(),
              paths.describeReports(),
              paths.readRoadmap(),
              // ⛔ The WHOLE queue, so the honesty tile is never computed over a
              // subset. Read here, at request time, like everything else.
              paths.readPlanningFile('QUEUE.md')
            )
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

/**
 * `/home` — the landing page: one screen that reaches everything.
 *
 * ⛔ IT CANNOT LIVE AT `/`, because `/` is the app itself and the app is one of
 * the things this page has to reach. So it takes a path of its own, and the app
 * keeps the root it has always had.
 *
 * ⚠ EVERY DESTINATION ON THIS PAGE WAS VERIFIED BY CONTENT, NOT BY STATUS CODE.
 * A dev server answers unknown paths with the app's index page — identical
 * status, identical bytes — so "it returned 200" says nothing at all. Each
 * candidate was compared against a deliberate nonsense path on the same host, and
 * the ones that turned out to be the fallback are named on the page as not built
 * rather than linked. The renderer holds no addresses of its own except the one
 * passed in here.
 *
 * Same response headers as the reports route, for the same reason: this page
 * names private destinations, so nothing may cache it or refer onward from it.
 */
function homeRoute() {
  return {
    name: 'robco-home',
    apply: 'serve', // ⛔ dev only — never part of any build output
    configureServer(server) {
      const paths = require('./scripts/planning-paths.js');

      server.middlewares.use('/home', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        // Only the mount point itself. Anything deeper is not this page, and
        // falls through rather than being answered with it.
        const rest = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
        if (rest) return next();
        // ⛔ Read AT REQUEST TIME, never cached — the counts are the only thing
        // making this page's freshness claim true.
        const board = paths.readRoadmap();
        // ⛔ The SNAPSHOT'S OWN STAMP, not this read's clock. Reading the file now
        // makes the READ fresh, never the DATA, and the tile has to carry the
        // second fact rather than the first — which is why `generatedAt` is what
        // travels and the read time is discarded here.
        //
        // ⚠ Costed before adding, not assumed: this parses the snapshot on every
        // home load, measured at ~3ms. That buys the landing page an age it would
        // otherwise have to invent or omit, and an omitted age is what lets a
        // stale reading pass for a current one.
        const control = freshRequire('./scripts/control-state.js');
        const snap = control.readStatus();
        const stamp = snap && snap.data ? new Date(snap.data.generatedAt) : null;
        const html = freshRequire('./scripts/home-view.js').renderHome({
          reportCount: paths.reportsDir() === null ? null : paths.listReports().length,
          boardUpdated: board ? board.mtime : null,
          statusReachable: snap !== null,
          statusGeneratedAt: stamp && Number.isFinite(stamp.getTime()) ? stamp : null,
          logCount: control.listLogs().length, // stat only — nothing is opened
          // ⛔ EMPTY, AND THAT IS A MEASURED CLAIM RATHER THAN AN OVERSIGHT: every
          // destination this page names is now built and was verified by content
          // against a nonsense path, not by status code. Anything genuinely
          // absent belongs in this array, where the renderer will name it as
          // absent — it must never go back to being a literal inside the
          // renderer, which is exactly how this page came to insist that two
          // pages it can now link to did not exist.
          unbuilt: [],
          // The public companion site. Held here rather than in the renderer so
          // the renderer stays a pure function of what it is handed.
          museumUrl: 'https://robco-exhibit.pages.dev/',
        });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.end(req.method === 'HEAD' ? '' : html);
      });

      // ── Shared response shape for the two read-only operational views ──────
      const sendHtml = (req, res, code, html) => {
        res.statusCode = code;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.end(req.method === 'HEAD' ? '' : html);
      };

      /**
       * `/status` — the operational snapshot.
       *
       * ⛔ The file read here is GENERATED ON A SCHEDULE. Reading it per request
       * makes the read fresh, not the data, and the renderer leads with how old
       * the data is for exactly that reason. Nothing is cached on this side
       * either, so the age shown is always the real one.
       */
      server.middlewares.use('/status', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const rest = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
        if (rest) return next(); // only the mount point; deeper paths are not this page
        const control = freshRequire('./scripts/control-state.js');
        const snap = control.readStatus();
        const html = freshRequire('./scripts/status-view.js').renderStatus(
          snap ? snap.data : null,
          new Date(),
          control.describeState()
        );
        return sendHtml(req, res, snap ? 200 : 404, html);
      });

      /**
       * `/ledger` — a bounded window onto the append-only logs.
       *
       * ⛔⛔ TAIL ONLY, AND THAT IS A SAFETY PROPERTY, NOT A FEATURE CHOICE. The
       * largest of these files is tens of megabytes; a whole-file read per
       * request would allocate that much on a machine that is also serving the
       * app. The reader this calls has no whole-file mode to reach for.
       *
       * ⛔ Read-only throughout: the logs are chained, so a write from a viewer
       * would break the verifiability of every earlier record.
       */
      server.middlewares.use('/ledger', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const rest = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
        const control = freshRequire('./scripts/control-state.js');
        const view = freshRequire('./scripts/ledger-view.js');
        if (!rest) {
          return sendHtml(
            req,
            res,
            200,
            view.renderLedgerIndex(control.listLogs(), control.describeState())
          );
        }
        // ⛔ The name is validated inside the reader (pattern + containment).
        // A rejected name is indistinguishable here from a missing one.
        const tail = control.tailLog(rest);
        return sendHtml(
          req,
          res,
          tail ? 200 : 404,
          view.renderLedgerTail(tail, control.describeState())
        );
      });
    },
  };
}

// Vite dev-server config. This file exists ONLY for local development -- the app
// itself is a static site with no build step (see README "Hosting & Release Flow"),
// so nothing here affects staging or production. Vite never builds this project.
export default defineConfig({
  plugins: [homeRoute(), reportsRoute()],
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
