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
const DIRS = ['css', 'js', 'docs'];
const rootPngs = readdirSync(ROOT).filter(f => f.toLowerCase().endsWith('.png'));

for (const f of [...FILES, ...rootPngs]) {
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

// 5. Point the page <link rel="icon"> at the dev icon (favicon/tab).
//    apple-touch-icon is left as the prod PNG (iOS ignores SVG touch icons); the
//    "[DEV]" label under the home-screen icon is what distinguishes the install.
//
//    Also inject the staging environment marker (WU-C11): the in-app changelog
//    viewer reads <meta name="robco-env" content="staging"> to render the
//    [Unreleased] section. Production (deploy.yml) never emits this marker, so
//    prod defaults to hiding [Unreleased]. CSP-safe (a meta tag, not a script).
const html = readFileSync(join(OUT, 'index.html'), 'utf8')
  .replace(
    '<link rel="icon" type="image/png" href="icon.png" />',
    '<link rel="icon" type="image/svg+xml" href="icon-dev.svg" />'
  )
  .replace(
    '<meta charset="UTF-8" />',
    '<meta charset="UTF-8" />\n    <meta name="robco-env" content="staging" />'
  );
writeFileSync(join(OUT, 'index.html'), html, 'utf8');

const count = readdirSync(OUT).length;
console.log(
  `[cf-staging-build] staged ${count} top-level entries into dist-staging/ — manifest → "${manifest.name}"`
);
