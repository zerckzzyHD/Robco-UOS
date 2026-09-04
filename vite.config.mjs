import { defineConfig } from 'vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE ROUTE TABLE — one origin, one port, one canonical path per thing.
 * ═══════════════════════════════════════════════════════════════════════════
 * ⛔⛤ OWNER RULING 2026-09-03, after a two-day regression. Two servers had come
 * to claim the root of one tailnet origin: this dev server, and a second one on
 * another port that a session mapped over `/` (moving the app to `:8443`). This
 * repo's own logon autostart then re-ran `tailscale serve --bg 5173` at the next
 * boot and took the root back. So the owner's pages vanished one evening and the
 * other server's pages vanished the next morning, and nobody had designed either
 * state. The ruling: ONE port, ONE server, everything on it, one path per thing,
 * redirects for every retired address, and no route that answers only because
 * Vite falls through to the app.
 *
 *   /             the landing page — links to everything below (was `/home`)
 *   /terminal/    the app itself. ⛔ It moved OFF the root so the root can be a
 *                 landing page; Vite's `base` does the moving, dev-only. The
 *                 trailing slash is load-bearing — see the redirect table.
 *   /queue        the build board, and only the board (was the top of `/reports`)
 *   /reports      the private report list, and only the list; /reports/<name>.md
 *   /view         the read-only control-plane projection, rendered by an EXTERNAL
 *                 program on every request (scripts/projection-view.js). Also
 *                 /view.json and /view.txt — the same projection, other formats.
 *   /status       the operational snapshot         (unchanged)
 *   /ledger       a window onto the append-only logs (unchanged)
 *   /sw.js        a service-worker KILL SWITCH for the root scope — see
 *                 scripts/sw-killswitch.js for why the app's move requires it
 *
 * ⭐ WHY THIS SURVIVES A REBOOT, WHICH IS THE ACCEPTANCE TEST. Everything above
 * is served by the one process the logon trigger starts, and the one Tailscale
 * mapping that trigger re-ensures (`/` → 5173) now reaches all of it. There is no
 * second process to keep alive and no second mapping to lose.
 */

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
 * Dev-only (`apply: 'serve'` on every route below), and the cost is re-parsing a
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
  // ⛔⛤ THE LEAVES WERE MISSING, AND THAT WAS THIS DEFECT ALREADY LIVE INSIDE
  // ITS OWN FIX (found 2026-09-01 by widening the guard). `queue-view.js` was
  // cleared and re-loaded on every request — and then resolved BOTH of these
  // through the ordinary cache, so a freshly-loaded parser closed over a stale
  // path resolver. That is the exact failure written up in the header above,
  // one level deeper than the list reached.
  //
  // ⚠ WHY IT HID: Suites 260.10/260.11 policed this by FILENAME — `*-view.js` —
  // so a data module that does not spell its name that way was outside the
  // guard entirely. The rule is now the dependency closure (Suite 260.12), which
  // cannot be escaped by what a file is called.
  './scripts/planning-paths.js', // path resolver — a leaf, so first
  './scripts/atomic-write.js', // write helper — a leaf
  './scripts/control-state.js', // operational state reader — deepest
  './scripts/queue-view.js', // markdown renderer — deepest
  // ⚠ ADDED 2026-09-01, AND IT WAS ALREADY A LIVE HOLE BEFORE THE LINE THAT
  // NEEDED IT. report-view.js has required this lazily for its closed-item rule
  // since that rule moved here — and a freshly-loaded report-view was resolving it
  // through the ORDINARY cache, so an edit to the rule was invisible on a server
  // that had already served one page. ⛔ That is precisely the defect this chain
  // exists to close, sitting inside it: a data reader left off the list means the
  // views above it close over a STALE copy while looking perfectly correct. The
  // landing route reads the board-currency rule from here too.
  './scripts/roadmap-generate.js', // board generator + the board-currency rule
  './scripts/report-view.js', // page shell + report + board rendering
  './scripts/home-view.js', // landing page
  './scripts/status-view.js', // operational snapshot
  './scripts/ledger-view.js', // append-only log window
  './scripts/projection-view.js', // runs the EXTERNAL projection renderer
  './scripts/sw-killswitch.js', // the root-scope service-worker kill switch
  './scripts/dev-env-marker.js', // the dev-server environment marker
  './scripts/dev-pwa-identity.js', // the dev app's own name + icon
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
 * The request path, decoded, without the query — or null when it cannot be
 * decoded, so a malformed escape falls through to Vite's 404 instead of throwing
 * inside a middleware.
 */
function pathOf(req) {
  try {
    return decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    return null;
  }
}

/**
 * ── Shared response shape for every HTML page this file serves ──────────────
 * Never let an intermediary or the phone keep a copy of private prose, never
 * refer onward from it, never let a crawler index it. One helper, so a new route
 * cannot forget a header.
 */
function sendHtml(req, res, code, html) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(req.method === 'HEAD' ? '' : html);
}

function sendPlain(req, res, code, text, extraHeaders) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  for (const [k, v] of Object.entries(extraHeaders || {})) res.setHeader(k, v);
  res.end(req.method === 'HEAD' ? '' : text);
}

/**
 * ── Retired addresses → their canonical path ────────────────────────────────
 * ⭐ Every address that was ever open on the owner's phone keeps working; none of
 * them is a second copy of a page. `/home` was the landing page before it moved
 * to the root; `/mist-view` and `/report` were the other server's aliases for the
 * projection and for a report that now lives in the report list; `/terminal`
 * without its slash is what a person types, and Vite answers it with a hint page
 * rather than the app.
 *
 * ⛔ A redirect target is never itself a redirect, and never a path Vite would
 * fall through on. Suite 265 checks the table against the handlers.
 *
 * ⚠ One redirect is NOT in this table because Vite issues it, not us: `/index.html`
 * 302s to `/terminal/`. The landing handler takes `/` only, so a request for the
 * root's `index.html` falls through to Vite's base middleware, which sends any
 * off-base path to `base`. Harmless (it lands in the app), measured 2026-09-03.
 */
const REDIRECTS = Object.freeze({
  '/home': '/',
  '/home/': '/',
  '/mist-view': '/view',
  '/mist-view/': '/view',
  '/mist-view/report': '/reports',
  '/report': '/reports',
  '/report/': '/reports',
  '/terminal': '/terminal/',
});

function redirectsRoute() {
  return {
    name: 'robco-redirects',
    apply: 'serve', // ⛔ dev only — never part of any build output
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = pathOf(req);
        const to = p === null ? undefined : REDIRECTS[p];
        if (!to) return next();
        res.statusCode = 301;
        res.setHeader('Location', to);
        // ⚠ Browsers cache a 301 unless told not to. These ARE permanent, but a
        // cached redirect that outlives a later change of table is the kind of
        // machine state nobody can find; no-store keeps the table the only copy.
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.end();
      });
    },
  };
}

/**
 * The ENVIRONMENT MARKER — what makes the dev tools exist on this origin.
 *
 * Stamps <meta name="robco-env" content="staging"> into the HTML this server
 * serves, which is the signal `_isStagingEnv()` (js/ui/ui-core.js) already looks
 * for. Without it the Diagnostic Shell mounted at 127.0.0.1 and was invisible
 * over the tailnet, because the only other signal it had was a hostname list
 * written before this origin existed.
 *
 * ⛔ `apply: 'serve'` — dev only, never part of any build output, and the
 * on-disk index.html is untouched, so the PUBLIC site cannot inherit this. The
 * whole account, including why this is a marker rather than one more hostname:
 * scripts/dev-env-marker.js. Guarded by Suite 249.12.
 */
function devEnvMarkerRoute() {
  return {
    name: 'robco-dev-env-marker',
    apply: 'serve', // ⛔ dev only — never part of any build output
    transformIndexHtml() {
      return [freshRequire('./scripts/dev-env-marker.js').devEnvMarkerTag()];
    },
  };
}

/**
 * THE DEV APP'S OWN IDENTITY — so it is not mistaken for the published one.
 *
 * Serves a DERIVED manifest at `/terminal/manifest.json` (dev name + dev icon,
 * every other field inherited from the real file) and the generated icon beside
 * it. Two installs of the same manifest render as two identical home-screen
 * icons, and opening the wrong one makes every conclusion after it wrong.
 *
 * ⛔ `apply: 'serve'` — dev only. The tracked manifest.json is untouched, so
 * production serves it from the repository exactly as before. The reasoning,
 * including why the icon is a generated SVG rather than a committed PNG:
 * scripts/dev-pwa-identity.js. Guarded by Suite 249.13.
 */
function devPwaIdentityRoute() {
  const BASE = '/terminal/';
  return {
    name: 'robco-dev-pwa-identity',
    apply: 'serve', // ⛔ dev only — never part of any build output
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = pathOf(req);
        const id = freshRequire('./scripts/dev-pwa-identity.js');
        if (p === BASE + 'manifest.json') {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next();
          const body = JSON.stringify(id.devManifest(), null, 2);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          return res.end(req.method === 'HEAD' ? '' : body);
        }
        if (p === BASE + id.DEV_ICON_FILE) {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          return res.end(req.method === 'HEAD' ? '' : id.devIconSvg());
        }
        return next();
      });
    },
  };
}

/**
 * `/sw.js` — the root-scope service-worker KILL SWITCH.
 *
 * ⛔ Root only. The app's real worker is `/terminal/sw.js`, served by Vite from
 * `sw.js` like any other file under the base; this route never touches it. See
 * scripts/sw-killswitch.js for the whole story.
 */
function killSwitchRoute() {
  return {
    name: 'robco-sw-killswitch',
    apply: 'serve', // ⛔ dev only — never part of any build output
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (pathOf(req) !== '/sw.js') return next();
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const ks = freshRequire('./scripts/sw-killswitch.js');
        res.statusCode = 200;
        for (const [k, v] of Object.entries(ks.SW_HEADERS)) res.setHeader(k, v);
        res.end(req.method === 'HEAD' ? '' : ks.SW_KILLSWITCH);
      });
    },
  };
}

/**
 * `/reports` — the private overnight/morning reports, rendered to phone-readable
 * HTML on demand. ⭐ The LIST and the individual reports, and nothing else — the
 * board that used to headline this page has its own path now (`/queue`).
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
 * whatever now answers there. ⛔⛤ That prediction came true on 2026-09-01, with
 * a second server rather than a static one — see the route table above. This
 * route leaves nothing behind — stop the dev server and it ceases to exist. It
 * also inherits the loopback bind and the `allowedHosts` entry below, both of
 * which took real debugging to get right.
 *
 * ⚠ THE COST OF THAT CHOICE, NAMED: private content shares an origin with the
 * app's dev server, so widening this server's bind would expose the reports too.
 * That is a real coupling, and it is why the bind is asserted by the gate rather
 * than left to the comment below to defend.
 */
function reportsRoute() {
  return {
    name: 'robco-reports',
    apply: 'serve', // ⛔ dev only — never part of any build output
    configureServer(server) {
      server.middlewares.use('/reports', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        // ⛔ PER REQUEST, like the renderer below it. Hoisting this to setup pinned
        // the path resolver for the life of a days-long server — the same trap as a
        // hoisted renderer, on the module that decides WHICH FILES get read.
        const paths = freshRequire('./scripts/planning-paths.js');
        // ⛔ Per request, never hoisted to setup — see freshRequire's header. This
        // is the page read most, and it HAS served stale content from memory.
        const view = freshRequire('./scripts/report-view.js');
        // `req.url` is already relative to the mount point.
        const raw = (pathOf(req) || '/').replace(/^\/+/, '');
        if (!raw) {
          // ⛔ Read AT REQUEST TIME. The list changes as reports land.
          return sendHtml(
            req,
            res,
            200,
            view.renderReportsIndex(paths.listReports(), paths.describeReports())
          );
        }
        // ⛔ The name is validated inside planning-paths (pattern + containment).
        // A rejected name is indistinguishable here from a missing one, on purpose.
        const md = paths.readReport(raw);
        if (md === null) return sendHtml(req, res, 404, view.renderNotFound());
        return sendHtml(req, res, 200, view.renderReport(raw, md));
      });
    },
  };
}

/**
 * `/queue` — the build board, and only the board.
 *
 * ⭐ "What needs you" lives HERE, once: the Attention count in the strip and the
 * Attention band below it. It used to be the headline of `/reports`; the owner
 * ruled the two apart on 2026-09-03 so that each path is one thing.
 *
 * ⛔ Both inputs are read AT REQUEST TIME. The board is regenerated as work
 * closes, sometimes mid-read, so a cached copy would present a stale picture as
 * the current one — which defeats the only thing the board is for. The WHOLE
 * queue is read alongside it, so the honesty tile is never computed over a
 * subset and the currency line can say whether the board still matches.
 */
function queueRoute() {
  return {
    name: 'robco-queue',
    apply: 'serve', // ⛔ dev only — never part of any build output
    configureServer(server) {
      server.middlewares.use('/queue', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const rest = (pathOf(req) || '/').replace(/^\/+/, '');
        if (rest) return next(); // only the mount point; deeper paths are not this page
        const paths = freshRequire('./scripts/planning-paths.js');
        const view = freshRequire('./scripts/report-view.js');
        return sendHtml(
          req,
          res,
          200,
          view.renderQueue(
            paths.readRoadmap(),
            paths.readPlanningFile('QUEUE.md'),
            // The "need you" tile: the planning tree's own owner-decision census
            // (OD-RULE v1), run fresh per visit like the projection renderer —
            // never the ⚠️ band's size again.
            paths.readOwnerDecisionCensus()
          )
        );
      });
    },
  };
}

/**
 * `/view` — the read-only control-plane projection, rendered by an EXTERNAL
 * program on every request. Plus `/view.json` and `/view.txt`.
 *
 * ── ⛔⛔ WHAT CROSSES THE BOUNDARY, AND WHAT DOES NOT ─────────────────────────
 * The projection is built and owned by a separate, private repository. This
 * route does not import it. It runs a configured script (`ROBCO_VIEW_RENDERER`)
 * with a format flag and streams its stdout into the response — the whole
 * contract is one command line. Unconfigured means a plain-text 404 that says so.
 * ⛔ It NEVER falls through to the app, and it NEVER serves a previous render,
 * because there is none: a stale projection wearing a fresh timestamp is the
 * exact defect the projection exists to make impossible.
 *
 * ── ⛔ READ-ONLY, ENFORCED HERE AS WELL AS THERE ──────────────────────────────
 * Anything other than GET or HEAD is answered 405 and its body is never read.
 * The projection's own rule is that it renders and never acts; being served by
 * the app's dev server must not quietly give it a write path, so the refusal
 * lives on this side too. The response carries the projection's own headers: no
 * store, a policy that loads nothing and embeds nowhere, no referrer.
 */
const VIEW_FORMATS = Object.freeze({
  '/view': 'html',
  '/view/': 'html',
  '/view.json': 'json',
  '/view.txt': 'txt',
});

function projectionRoute() {
  return {
    name: 'robco-projection',
    apply: 'serve', // ⛔ dev only — never part of any build output
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = pathOf(req);
        const format = p === null ? undefined : VIEW_FORMATS[p];
        if (!format) return next();
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          return sendPlain(
            req,
            res,
            405,
            'METHOD NOT ALLOWED.\n\n' +
              'The projection is read-only. It renders state; it never writes it.\n' +
              'There is no endpoint here that accepts anything, and this request body was not read.\n',
            { Allow: 'GET, HEAD' }
          );
        }
        // ⛔ Per request, like every other module here — see freshRequire's header.
        const projection = freshRequire('./scripts/projection-view.js');
        projection
          .render(format)
          .then(r => {
            res.statusCode = r.status;
            res.setHeader('Content-Type', r.type);
            res.setHeader('Cache-Control', 'no-store, max-age=0');
            res.setHeader(
              'Content-Security-Policy',
              "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
            );
            res.setHeader('Referrer-Policy', 'no-referrer');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Robots-Tag', 'noindex, nofollow');
            res.end(req.method === 'HEAD' ? '' : r.body);
          })
          .catch(err => {
            // ⛔ AN ERROR IS RENDERED AS AN ERROR, never as an empty page and never
            // as the app.
            sendPlain(
              req,
              res,
              500,
              'the projection could not be rendered.\n\n' + String((err && err.stack) || err) + '\n'
            );
          });
      });
    },
  };
}

/**
 * `/` — the landing page: one screen that reaches everything, plus the two
 * read-only operational views (`/status`, `/ledger`) that share its readers.
 *
 * ⭐ IT LIVES AT THE ROOT NOW. It could not before, because the app was the root;
 * the app is under `/terminal/` (Vite's `base`) precisely so this can be the
 * front door. `/home` redirects here.
 *
 * ⚠ EVERY DESTINATION ON THIS PAGE IS A HANDLER IN THIS FILE, not a path that
 * merely answers. Under `appType: 'mpa'` with a base path, a path with no handler
 * is a 404, so a dead tile fails loudly rather than rendering the app — which is
 * the trap the previous version of this page had to defend against by hashing
 * content against a nonsense path.
 *
 * Same response headers as the reports route, for the same reason: this page
 * names private destinations, so nothing may cache it or refer onward from it.
 */
function landingRoute() {
  return {
    name: 'robco-landing',
    apply: 'serve', // ⛔ dev only — never part of any build output
    configureServer(server) {
      server.middlewares.use('/', (req, res, next) => {
        if (pathOf(req) !== '/') return next();
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        // ⛔ PER REQUEST — see the identical note on the /reports handler.
        const paths = freshRequire('./scripts/planning-paths.js');
        // ⛔ Read AT REQUEST TIME, never cached — the counts are the only thing
        // making this page's freshness claim true.
        const board = paths.readRoadmap();
        // ⭐⭐ CURRENCY, NOT MTIME — the tile used to report when the board FILE was
        // written, which is silent about whether it still matches the queue. It was
        // 59 items stale on 2026-09-01 while saying "Updated 44 minutes ago".
        // Costed: reading and hashing the whole queue is ~16 ms on the real 3.2 MB
        // document, once per visit to a page one person opens by hand.
        const boardQueue = board ? paths.readPlanningFile('QUEUE.md') : null;
        const boardCurrency = board
          ? freshRequire('./scripts/roadmap-generate.js').boardCurrency(board.text, boardQueue)
          : null;
        // ⛔ The SNAPSHOT'S OWN STAMP, not this read's clock. Reading the file now
        // makes the READ fresh, never the DATA, and the tile has to carry the
        // second fact rather than the first — which is why `generatedAt` is what
        // travels and the read time is discarded here.
        const control = freshRequire('./scripts/control-state.js');
        const snap = control.readStatus();
        const stamp = snap && snap.data ? new Date(snap.data.generatedAt) : null;
        // ⭐ Whether the external projection renderer is configured — asked of the
        // module that owns that question, never guessed from a path.
        const projection = freshRequire('./scripts/projection-view.js');
        const html = freshRequire('./scripts/home-view.js').renderHome({
          reportCount: paths.reportsDir() === null ? null : paths.listReports().length,
          boardUpdated: board ? board.mtime : null,
          // ⛔ null when it could not be established — never coerced to a boolean,
          // because "unknown" and "fine" are different facts.
          boardCurrent: boardCurrency && boardCurrency.known ? boardCurrency.current : null,
          statusReachable: snap !== null,
          statusGeneratedAt: stamp && Number.isFinite(stamp.getTime()) ? stamp : null,
          logCount: control.listLogs().length, // stat only — nothing is opened
          projectionAvailable: projection.available(),
          // ⛔ EMPTY, AND THAT IS A MEASURED CLAIM: every destination this page
          // names is a handler in this file. Anything genuinely absent belongs in
          // this array, where the renderer names it as absent — never as a literal
          // inside the renderer, which is how this page once insisted two live
          // pages did not exist.
          unbuilt: [],
          // The public companion site. Held here rather than in the renderer so
          // the renderer stays a pure function of what it is handed.
          museumUrl: 'https://robco-exhibit.pages.dev/',
        });
        return sendHtml(req, res, 200, html);
      });

      /**
       * `/status` — the operational snapshot.
       *
       * ⛔ The file read here is GENERATED ON A SCHEDULE. Reading it per request
       * makes the read fresh, not the data, and the renderer leads with how old
       * the data is for exactly that reason. Nothing is cached on this side
       * either, so the age shown is always the real one.
       *
       * ⭐⭐ THE FOURTH ARGUMENT IS THE ONE THAT ANSWERS "IS THE MACHINE OFF, OR IS
       * THIS ONE FILE DEAD?" — and it is measured HERE rather than inside the
       * renderer, because the renderer holds no filesystem of its own (the same
       * rule that moved every address off the landing page). Costed before adding:
       * one top-level stat sweep of one directory, on a page nobody loads in a loop.
       *
       * ⚠ A caller that skipped it would leave the page unable to tell those two
       * apart — precisely the state it was in while a four-day freeze went
       * unnoticed — so it is passed unconditionally, and a null is rendered as
       * silence rather than as reassurance.
       */
      server.middlewares.use('/status', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const rest = (pathOf(req) || '/').replace(/^\/+/, '');
        if (rest) return next(); // only the mount point; deeper paths are not this page
        const control = freshRequire('./scripts/control-state.js');
        const snap = control.readStatus();
        const html = freshRequire('./scripts/status-view.js').renderStatus(
          snap ? snap.data : null,
          new Date(),
          control.describeState(),
          control.newestWrite()
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
        const rest = (pathOf(req) || '/').replace(/^\/+/, '');
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
  // ⭐ THE APP LIVES UNDER `/terminal/` ON THE DEV ORIGIN, so the root can be the
  // landing page. Dev-only: `base` shapes what this server serves and nothing else
  // — production is a static site at its own origin's root, unchanged. The app's
  // own relative paths (`css/…`, `sw.js`, `manifest.json`, `start_url: "./"`) all
  // resolve under the base, and its service worker registers at scope
  // `/terminal/`. ⚠ Every path in this file that is NOT under the base is served
  // by the plugins above, BEFORE Vite's base middleware sees the request.
  base: '/terminal/',
  // ⛔ NO SPA FALLBACK. An unknown path is a 404, not the app's index page under a
  // different URL. The app has no client-side routing (its only history call
  // rewrites the current pathname), so nothing is lost — and "it returned 200"
  // becomes evidence again.
  appType: 'mpa',
  plugins: [
    devEnvMarkerRoute(),
    devPwaIdentityRoute(),
    redirectsRoute(),
    killSwitchRoute(),
    landingRoute(),
    queueRoute(),
    reportsRoute(),
    projectionRoute(),
  ],
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
