// Cloudflare Pages staging build for RobCo U.O.S.
//
// Cloudflare builds the `dev` branch and runs this script as its build command.
// Output dir (publish dir) = `dist-staging`.
//
// What it does:
//   1. Stages ONLY the served/public files (mirrors deploy.yml's prod stage list)
//      so private files (CLAUDE.md, tests/, scripts/, .github/, planning/) never
//      reach the staging site.
//   2. Rewrites manifest.json so the installed staging PWA is named "[DEV]" and
//      uses a distinct dev icon — this is the ONLY difference from prod, applied
//      at deploy time so it never touches the repo or the production build.
//   3. Writes a self-contained SVG dev icon (terminal-green, "DEV" badge).
//
// Staging lives on its own origin (robco-uos-dev.pages.dev), so the service
// worker, CACHE_NAME, localStorage, IndexedDB (Firebase auth) and CacheStorage
// are all fully isolated from production — no source change needed for that.

import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'dist-staging');

// 1. Clean output dir
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 2. Stage served files (mirrors .github/workflows/deploy.yml)
const FILES = ['index.html', 'sw.js', 'manifest.json', 'CHANGELOG.md'];
const DIRS = ['assets', 'css', 'js', 'docs'];

for (const f of FILES) {
  if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f));
}
for (const d of DIRS) {
  if (existsSync(join(ROOT, d))) cpSync(join(ROOT, d), join(OUT, d), { recursive: true });
}

// 3. Distinct dev icon (self-contained SVG — no raster tooling, no committed binary)
const DEV_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="RobCo DEV">
  <rect width="512" height="512" rx="96" fill="#010a07"/>
  <rect x="40" y="40" width="432" height="432" rx="64" fill="none" stroke="#14fdce" stroke-width="14" opacity="0.85"/>
  <text x="50%" y="44%" text-anchor="middle" font-family="'Courier New',monospace" font-size="150" font-weight="bold" fill="#14fdce">&gt;_</text>
  <text x="50%" y="74%" text-anchor="middle" font-family="'Courier New',monospace" font-size="120" font-weight="bold" letter-spacing="8" fill="#14fdce">DEV</text>
</svg>`;
writeFileSync(join(OUT, 'icon-dev.svg'), DEV_ICON, 'utf8');

// 4. Rewrite manifest: [DEV] name + dev icon
const manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
manifest.name = 'RobCo U.O.S. [DEV]';
manifest.short_name = 'RobCo DEV';
manifest.icons = [
  { src: 'icon-dev.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
];
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// 5. Rewrite the staged index.html (staging-only — never the repo/prod copy):
//    a) point <link rel="icon"> at the dev SVG icon (favicon/tab); apple-touch-icon
//       stays the prod PNG (iOS ignores SVG touch icons);
//    b) inject the WU-C11 staging marker <meta name="robco-env" content="staging">
//       so the in-app changelog viewer shows the [Unreleased] section (prod never
//       emits it, so prod hides [Unreleased]); CSP-safe (a meta tag, not a script);
//    c) stamp the visible on-screen "DEV BUILD" badge (fixed top-right, amber,
//       pointer-events:none) so a running staging build is unmistakable at a glance.
//       This is distinct from the "[DEV]" PWA name + dev icon (which only show on the
//       home screen / browser tab). Production NEVER gets this badge — it is injected
//       into the staged copy only, so the repo's index.html stays badge-free.
const DEV_BADGE =
  '<div style="position:fixed;top:0;right:0;z-index:2147483647;background:#ff9100;' +
  'color:#000;font:bold 11px ui-monospace,monospace;letter-spacing:1px;padding:3px 9px;' +
  'border-bottom-left-radius:7px;pointer-events:none;box-shadow:0 0 10px rgba(255,145,0,.7)">' +
  'DEV BUILD</div>';
let html = readFileSync(join(OUT, 'index.html'), 'utf8')
  .replace(
    '<link rel="icon" type="image/png" href="assets/icon.png" />',
    '<link rel="icon" type="image/svg+xml" href="icon-dev.svg" />'
  )
  .replace(
    '<meta charset="UTF-8" />',
    '<meta charset="UTF-8" />\n    <meta name="robco-env" content="staging" />'
  );
if (!html.includes('>DEV BUILD<')) {
  html = html.replace('</body>', DEV_BADGE + '\n  </body>');
}
writeFileSync(join(OUT, 'index.html'), html, 'utf8');

// 5b. Bump the STAGED CACHE_NAME with a -dev suffix so the badge (and any other
//     staging-only difference) reliably reaches already-cached devices: the SW is
//     cache-first, so an unchanged CACHE_NAME would keep serving the old, badge-less
//     shell. This edits only the staged copy — the repo's CACHE_NAME (Protocol 1) is
//     untouched, and production keeps the bare rev.
const swPath = join(OUT, 'sw.js');
let swSrc = readFileSync(swPath, 'utf8').replace(
  /const CACHE_NAME = '([^']+)';/,
  (m, name) => `const CACHE_NAME = '${name.includes('-dev') ? name : name + '-dev'}';`
);

// 5c. Drop './index.html' from the STAGED precache list (staging-only).
//     Cloudflare Pages 308-canonicalizes '/index.html' -> '/', and the Cache API
//     REJECTS a redirected response inside cache.addAll() (it throws when
//     response.redirected is true). Because the SW install precache is
//     all-or-nothing, that single redirected entry fails the ENTIRE install ->
//     the new service worker never activates -> the staging PWA freezes on the
//     old build and "REBOOT TERMINAL" does nothing (the exact r15-dev freeze).
//     './' already precaches the identical shell — Cloudflare serves '/' at a
//     direct 200 — so dropping the redundant './index.html' entry loses no
//     offline coverage. This edits only the staged copy; GitHub Pages (prod)
//     serves '/index.html' at 200, so the repo sw.js legitimately keeps it.
swSrc = swSrc.replace(/^\s*'\.\/index\.html',[ \t]*\r?\n/m, '');
writeFileSync(swPath, swSrc, 'utf8');

// 6. Cloudflare Pages _redirects — pin the service worker + PWA control files to a
//    DIRECT 200 serve so Cloudflare never returns them behind a 3xx redirect. A
//    service worker whose script fetch is redirected cannot be registered or
//    updated — the browser rejects it with "The script resource is behind a
//    redirect, which is disallowed", which breaks SW updates on the staging PWA.
//    Cloudflare Pages can 3xx-canonicalize root paths; an explicit `200` (rewrite)
//    rule overrides that and serves the asset directly at the same URL. GitHub
//    Pages (production) serves these directly and ignores _redirects, so this is
//    staging-only (emitted into dist-staging, never the repo served set).
const REDIRECTS = [
  '# Pin PWA control files to a direct 200 serve -- never behind a redirect.',
  '# A redirected service-worker script cannot be registered/updated (browsers',
  '# forbid it): "The script resource is behind a redirect, which is disallowed".',
  '/sw.js /sw.js 200',
  '/manifest.json /manifest.json 200',
  '# Also pin /index.html to a direct 200 so a direct hit serves the page instead',
  '# of Cloudflare 308-canonicalizing it to /. Defense-in-depth: the staged sw.js',
  "# no longer precaches './index.html' (see step 5c), so SW install is already",
  '# safe; this just keeps the deployed artifact serving /index.html cleanly.',
  '/index.html /index.html 200',
  '',
].join('\n');
writeFileSync(join(OUT, '_redirects'), REDIRECTS, 'utf8');

const count = readdirSync(OUT).length;
console.log(
  `[cf-staging-build] staged ${count} top-level entries into dist-staging/ — manifest → "${manifest.name}"`
);
