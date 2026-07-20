# Subsystem note — Docs, the Changelog & the Local-Only Library

> **Load this when touching:** `CHANGELOG.md` · `README.md` · `ARCHITECTURE.md` · `CLAUDE.md` ·
> anything under `rules/` · anything under `library/` or `planning/` · the in-app changelog
> viewer.
>
> Universal rules live in `CLAUDE.md` — including **Protocol 2** (docs updated in the same
> commit) and **Protocol 48** (back up the local-only artifacts). This note carries the rest.

---

## Protocol 21 — Plain-English Changelog

Every `CHANGELOG.md` entry must be written in clear, plain English that a non-developer can understand — describe what changed and why it matters from the user's perspective, not in developer jargon — in one consistent, readable style across the whole file. Preserve structural markers (version headers, the `Tests`/cache header comment) while keeping the prose plain. Avoid internal implementation details unless they explain a user-visible change.

### Universal style

Every version block follows the same seven rules:

1. **Group entries under fixed headings**, in this order, skipping any that are empty: **Added** (new features), **Fixed** (bug fixes), **Changed** (behavior changes), **Improved** (refinements), and optionally **Under the Hood** (internal or dev-only changes — kept short and clearly separated so the user-facing part stays on top).
2. **Lead with user impact:** each entry starts with what the user can now do or what stopped breaking, in plain language. The "why" is optional and only if it helps.
3. **Consistent voice and tense:** past tense, the same throughout the whole file — "Added…", "Fixed…", "Improved…".
4. **No code identifiers in the prose:** no file names, function names, commit hashes, or cache revs in entry text — those belong only in the structural header comment, never the human-readable body.
5. **One entry per user-visible change, deduplicated:** merge related commits into a single readable line, not one entry per commit.
6. **Consistent granularity:** short, scannable sentences; do not mix terse fragments with long paragraphs.
7. **Preserve the structural markers exactly** (version number, date, the Tests/cache header comment) — only the prose changes.

Rule 7 governs only the rewrite of EXISTING entries; it does not restrict versioning. The user may always manually instruct a version bump (e.g. 'bump version' or 'make this 2.1.0'), which follows Protocol 2's semver rules and creates a new version block in the changelog.

### Environment-aware in-app changelog viewer (Protocol 43 dev/prod split)

The in-app changelog viewer is **environment-aware**, mirroring the dev/prod branch split (Protocol 43). This **supersedes** any earlier "the viewer never renders `[Unreleased]` anywhere" wording:

- **Production** (GitHub Pages — `zerckzzyhd.github.io/Robco-UOS/`, built from `main`): the viewer shows **only the latest RELEASED version** and **never renders the `[Unreleased]` section**. Public users must never see unreleased work.
- **Dev / staging** (Cloudflare Pages — `robco-uos-dev.pages.dev`, built from `dev`; plus local `localhost`/`127.0.0.1`): the viewer **does render `[Unreleased]`** so the owner can review unreleased work while testing the staging build.

**Detection is fail-safe — default to production.** The viewer treats production behavior (hide `[Unreleased]`) as the default and only reveals `[Unreleased]` when a **positive staging signal** is present. The robust signal is a **build-injected staging flag**: `scripts/cf-staging-build.mjs` stamps the staged `index.html` with an explicit staging marker (e.g. `<meta name="robco-env" content="staging">` or `window.__ROBCO_ENV__ = 'staging'`) that the production build (`deploy.yml`) never emits — so an absent, unknown, or stale-cached environment always falls back to hiding `[Unreleased]` and can never leak it to prod. Hostname (`*.pages.dev`, `localhost`) is an acceptable _secondary_ signal, but the injected flag is primary because it cannot be spoofed by a renamed host or a stale cache.

`[Unreleased]` always **stays in `CHANGELOG.md`** (the working draft); only its _rendering_ is gated. The implementation and a both-runners guard (assert prod-mode hides `[Unreleased]` **and** dev-mode shows it) ship in **WU-C11**, not as part of this rule.

---

## Protocol 45 — Documentation Reference Integrity (the enforcement arm of Protocol 2)

Protocol 2 already requires the docs to stay current — but they are **honor-system** rules, and the docs drifted anyway (the cloud push/pull globals `pushToCloud` / `pullFromCloud` were documented for months but never existed under those names; the script load-order list silently omitted `idb.js` / `ocr.js` / `runtime.js` / `test-console.js`). Per the escape-ratchet (Protocol 36b), a class of defect that escapes every layer gets a **gate guard** at the layer it escaped from. Doc drift escaped every layer, so it gets one. **Suite 220** (Node runner) **fails the build** when a load-bearing doc names code that does not exist.

**The scanned set is the whole rulebook.** Suite 220 reads `CLAUDE.md`, `ARCHITECTURE.md`, `README.md` **and every `rules/*.md` subsystem note** — the R2 restructure moved rule text out of `CLAUDE.md`, and the guard moved with it in the same commit rather than losing coverage over the relocated content.

**What it checks (deliberately NARROW — precision over recall):**

1. **`window.<name>` references** in the scanned docs → `<name>` must appear in some `js/*.js` file or `index.html`. Catches documented-but-removed globals.
2. **Explicit repo file paths** (`js/…`, `css/…`, `tests/…`, `scripts/…`, `rules/…`, single-segment `name.ext`) → the file must exist on disk. A negative lookbehind rejects a path whose leading directory is really a file-extension tail (so a slash-joined prose list of several chained `.js` filenames never yields a phantom path); nested (`js/vendor/…`) and multi-dot filenames are intentionally out of scope to stay false-positive-free.
3. **The load-order list** inside the `<!-- LOAD-ORDER-GUARD:BEGIN … END -->` markers in `rules/file-layout.md` and `ARCHITECTURE.md` → the numbered `js/….js` items (the subject before each `→`) must equal the **real boot order derived mechanically from `index.html`**: `idb.js` (first static tag) + the `GAME_FILES` manifest + the remaining static `<script>` tags, with per-game `db_*` / `reg_*` pairs normalized to one slot.
4. **Every `library/<file>` pointer** in the scanned docs → `<file>` must appear in the committed `library/MANIFEST.txt` (2.8.5 U-B2, Protocol 46 — see below for why this can't just be `fs.existsSync`).
5. **Every `Protocol N` reference** across the docs + `js/` + `tests/` → must resolve to a real protocol heading somewhere in the rulebook (`CLAUDE.md` + `rules/*.md`), or be an explicitly allowlisted forward-reference. Compound headings (29/30/31, 32/33/35) define each number inside them; sub-parts (36b, 2a) resolve by base number.
6. **Structural guards on the restructure itself** — every protocol number is defined exactly once across the whole rulebook (no duplicated heading drifting against its twin), and every note file named in `CLAUDE.md`'s retrieval map exists on disk.

**Allowlists (small, explicit, commented WHY):** a doc that _correctly_ names something that must NOT exist is not drift. The window/path allowlists cover exactly that — platform globals (`window.innerWidth`, `window.location`, …) and the guarded MUST-NOT-EXIST file `js/ui.js` (retired in the ui-\* split, guarded by Suite 56). Keep these lists tiny; every entry needs a one-line reason.

**Scope decision — `library/BRAIN_DUMP.md` is NOT scanned for PROSE content.** It is gitignored (absent on a clean CI checkout, so the guard would have nothing to read there — and CI is the environment that matters most), and its own "Known documentation drift" ledger deliberately quotes retired/wrong names to warn sessions off them — scanning its prose would false-positive on its most valuable section. It stays governed by its own maintenance rule instead. (Its existence _as a pointer target_ — the fact that `CLAUDE.md` names `library/BRAIN_DUMP.md` — IS checked, via check 4 above / Protocol 46.)

**Ratchet intent:** start narrow and earn trust; tighten later. A greedy scanner that flags ordinary prose is worse than no scanner — it gets ignored, then weakened, then it is dead. Only add a new reference form (e.g. backticked architecture entry-point names) once it can be extracted with **zero false positives**; until then, leave it out and say so. It does **not** replace the honor-system Protocol 2 rules — those still stand; this guard just catches the class of drift they could not.

---

## Protocol 46 — Keep the Code Map + Pointer Index Current (the enforcement arm of the library model)

The Reference Pointer Index and `library/CODE_MAP.md` only stay trustworthy if they track the code — the same honor-system risk Protocol 45 catches for `window.*`/file-path/load-order drift. **When a file is split, added, moved, or removed, or a major function relocates, update `library/CODE_MAP.md` and `CLAUDE.md`'s Reference Pointer Index in the SAME commit.** These are high-trust surfaces — a session navigates by them instead of reading whole files — so letting them drift silently is strictly worse than not having them: a session would trust a stale map with no signal that it's wrong. An honor-system "keep it current" rule drifted once already (the `pushToCloud`/`pullFromCloud` incident), so the class of defect gets a Suite 220 gate guard.

**The gitignored-`library/` problem:** `library/` is gitignored (local-only Claude reference docs), so on a clean CI checkout `library/CODE_MAP.md` and `library/BRAIN_DUMP.md` simply don't exist. A guard that does `fs.existsSync('library/CODE_MAP.md')` would either fail every CI run forever (if it requires existence) or never run at all (if skipped whenever the directory is absent) — the latter is a guard that can never fail, which is worse than no guard because it creates false confidence.

**The fix — `library/MANIFEST.txt`:** a small filename-only list, **committed** as the one sanctioned exception to the `library/` gitignore (`library/*` + `!library/MANIFEST.txt`). Suite 220 uses it two ways: **220.7** (real on CI and locally, because the manifest is committed) — every `library/<file>` pointer named in the scanned docs must appear in the manifest, catching a pointer whose file was never manifested; **220.8** (local-only, a no-op on a clean CI checkout) — the manifest must exactly match `library/`'s real contents, the only check that can catch the manifest itself going stale. Neither can catch _content_ staleness inside a doc — only that the _filename_ a pointer names is real and manifested. See Suite 220 tests 220.7/220.8 for the full CI-vs-local reasoning.

**How to apply:** whenever `library/` gains or loses a file, update `library/MANIFEST.txt` in the same commit (add/remove one line). Whenever the pointer index gains a row naming a new `library/<file>`, that file must already be in the manifest — order matters: manifest first, pointer second, or 220.7 fails the build.

---

## The 3-class library maintenance model (2.8.5 U-B1)

Every doc under `library/` and `planning/` falls into exactly one of three classes, and the class dictates how it's kept current:

- **LIVE** — actively maintained, gate-guarded where possible: `library/BRAIN_DUMP.md`, `library/TEST_CATALOG.md` (today — see GENERATED below), `library/CODE_MAP.md`, `QUEUE.md`, the Reference Pointer Index in `CLAUDE.md`, and the `rules/*.md` subsystem notes. A stale LIVE doc is worse than no doc at all — it makes a session confidently wrong. Update in the same commit whenever something it describes stops being true.
- **GENERATED** — never hand-maintained; produced from source by a script and diffed against the committed copy in the gate (Protocol 47). `library/TEST_CATALOG.md` is GENERATED-class **in intent** but is still hand-maintained **today** — 2.8.5 U-B1 only relocated its content out of `CLAUDE.md`'s tail; the generator itself is a separate, later unit and is explicitly out of scope here. Until that unit lands, maintain its per-suite CONTENT by hand like a LIVE doc. It carries no test count — Protocol 2a is retired.
- **ARCHIVE** — frozen point-in-time snapshots: the audits, plans, mockups, and slates under `planning/`. These carry a "snapshot as of DATE — not current truth" framing and are never updated to track current code; their reasoning is reused as historical input, never trusted as current fact. The pre-2.8.0 audits (`planning/2.8.0/audits/CODE_QUALITY_AUDIT.md`, `planning/2.8.0/audits/PERFORMANCE_AUDIT.md`, `planning/2.8.0/audits/ACCESSIBILITY_AUDIT.md`, `planning/2.8.0/audits/TEST_STRENGTH_AUDIT.md`, `planning/2.8.0/audits/TOKEN_USAGE_AUDIT.md`, `planning/2.8.0/audits/UI_CONSISTENCY_AUDIT.md`, `planning/2.8.0/audits/CLOUD_AUDIT.md`, `planning/2.8.0/audits/FILE_AUDIT.md`) are ARCHIVE-class — they audited a codebase roughly 30% smaller than today's; do not trust their measurements or reuse their proposals without re-verifying against current code. (They live under `2.8.0/` because they were the analysis phase that PRODUCED the 2.8.0 overhaul — the version whose work they were part of — even though they measure the earlier v2.6.0/v2.7.0 code.)

**Doc-maintenance rule (LIVE docs):**

- `library/BRAIN_DUMP.md` is the canonical reconstruction doc and future sessions trust it — the stale-LIVE-doc rule above applies in full (a stale dump makes sessions confidently wrong). Update it in the same commit whenever something in it stops being true: an architecture change, a new/changed protocol, a shipped roadmap item, a newly-learned recurring gotcha. **★ Hard exit condition:** the 2.8.5 code + test health phase restructures the whole file layout and invalidates large parts of the dump — that phase is **not complete** until the brain dump has been re-baselined against the restructured codebase.
- `QUEUE.md` is updated in the same commit as any change that actually moves the roadmap.
- `library/CODE_MAP.md` (new, 2.8.5 U-B2) is updated in the same commit whenever a file is split/added/moved/removed or a major function relocates — see Protocol 46 above.
- A **portable brief for an external model** (Gemini/GPT) is NOT a standing doc — it is regenerated fresh from the current brain dump on request, so it is always accurate because it is always new. Never keep a second standing copy of the truth. The generation spec lives in the brain dump ("Generating a portable brief for an external model").

---

## Related notes

- Where the rulebook's own structure is defined: `CLAUDE.md` (the contract + retrieval map)
- Backing up `library/`, `planning/` and agent memory: **Protocol 48** — in `CLAUDE.md`.
- File moves that oblige a code-map update: `rules/file-layout.md`
