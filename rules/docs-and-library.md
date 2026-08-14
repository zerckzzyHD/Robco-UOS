# Subsystem note — Docs, the Changelog & the Local-Only Library

> **Load this when touching:** `CHANGELOG.md` · `README.md` · `ARCHITECTURE.md` · `CLAUDE.md` ·
> anything under `rules/` · anything under `library/` or `planning/` · the **private** planning tree
> (`_RobCo-Archive/!PLANNING/` — `QUEUE.md` · `QUEUE_LOG.md` · `NORTH_STARS.md`) ·
> `skill/SKILL.md` · the in-app changelog viewer.
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
2. **Explicit repo file paths** (`js/…`, `css/…`, `tests/…`, `scripts/…`, `rules/…`, single-segment `name.ext`) → the file must exist on disk. A negative lookbehind rejects a path whose leading directory is really a file-extension tail (so a slash-joined prose list of several chained `.js` filenames never yields a phantom path). **Two extensions close the blind spots that let stale `api.js` ownership pass a green gate (R10 finding C):** _(2b)_ backticked **nested** repo paths (`js/services/api-import.js`, `css/NN-*.css` under a tracked top dir, wildcard-family `*` tokens excluded) must exist on disk; _(2c)_ backticked **exact bare code filenames** (`api.js`, `ui-core.js`, `99-mobile.css` — `.js`/`.mjs`/`.css` only, so gitignored `library/` docs and `planning/` `.html` mockups can never false-fail) must resolve to a real file in the tracked tree. On introduction 2c caught terminal.css (deliberately un-backticked here, because it no longer exists) — the pre-U-A2 monolithic stylesheet, split into `css/NN-*.css` — still named as a live file in `rules/ui-and-mobile.md` (fixed same commit, Protocol 42). _(2d)_ is their empty-parse self-integrity guard (both scanners must see a non-trivial count of backticked paths, so 2b/2c can never pass on a silent empty match). Still **not** a prose-truth / ownership checker — existence only.
3. **The load-order list** inside the `<!-- LOAD-ORDER-GUARD:BEGIN … END -->` markers in `rules/file-layout.md` and `ARCHITECTURE.md` → the numbered `js/….js` items (the subject before each `→`) must equal the **real boot order derived mechanically from `index.html`**: `idb.js` (first static tag) + the `GAME_FILES` manifest + the remaining static `<script>` tags, with per-game `db_*` / `reg_*` pairs normalized to one slot.
4. **Every `library/<file>` pointer** in the scanned docs → `<file>` must appear in the committed `library/MANIFEST.txt` (2.8.5 U-B2, Protocol 46 — see below for why this can't just be `fs.existsSync`).
5. **Every `Protocol N` reference** across the docs + `js/` + `tests/` → must resolve to a real protocol heading somewhere in the rulebook (`CLAUDE.md` + `rules/*.md`), or be an explicitly allowlisted forward-reference. Compound headings (29/30/31, 32/33/35) define each number inside them; sub-parts (36b, 2a) resolve by base number.
6. **Structural guards on the restructure itself** — every protocol number is defined exactly once across the whole rulebook (no duplicated heading drifting against its twin), and every note file named in `CLAUDE.md`'s retrieval map exists on disk (220.14). **Retrieval-map ⇄ note-header parity (220.15, R10 finding D):** the retrieval map is the **sole** scope authority, but each note also carries a "Load this when touching" header; 220.15 proves the two agree by requiring every concrete path a note's header claims to be **routed to that note by its map row** (header ⊆ row — a row may be a superset, since a surface can be co-governed). Locators ("the `GAME_DEFS` block in `js/core/state.js`") and parenthetical asides are stripped before extraction so only a note's own scope claims are checked. This closes the gap 220.14 left: _named_ in the map is not the same as _reachable_ — the audit found `firebase.json` (auth), `.github/workflows/` (testing) and `scripts/cf-staging-build.mjs` (deploy) each claimed by a header but missing from its row.

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

## Protocol 47 — Generated Test Catalog (the GENERATED class fulfilled)

**Shipped 2026-07-27 (QUEUE.md item D).** `library/TEST_CATALOG.md` is produced by
`scripts/generate-test-catalog.js` directly from the suite headers in
`tests/robco-diagnostics.js` — it is **never hand-maintained again**. This is the first real
instance of the GENERATED class the 3-class model below describes, and the "generate what a
script can compute" plumbing the Atlas (QUEUE.md item I) reuses.

**What it extracts.** Every `header('…')` call in the runner is a suite boundary. A suite whose
header is re-emitted later (a deferred async proof re-announcing itself before its result line,
e.g. Suites 76/137/196/207/220/228) is captured once, at its first occurrence. For that
occurrence, the nearest contiguous run of `//`-comment lines immediately above it — the
runner's own build narration, written when the suite landed — is captured **verbatim** as the
suite's description. A suite with no such comment gets an honest "no header comment on file"
note, never a fabricated one. **No test COUNT is generated or tracked** — only qualitative
per-suite content, consistent with Protocol 2a's retirement.

**Usage:** `npm run test-catalog` regenerates the file; `npm run test-catalog:check` verifies it's
current without writing (used by the gate). Regeneration is a **deliberate step**, never
automatic — the gate only checks and fails, asking the developer to re-run the generator, the
same "flag, never auto-fix" posture as Protocol 41's cleanup sweep.

**The gitignored-`library/` gate-diff, resolved.** `library/` is gitignored, so a naive
"diff against the committed copy" cannot run on a clean CI checkout — there is no committed copy;
`library/TEST_CATALOG.md` never existed in git at all (only `library/MANIFEST.txt` is the
committed exception, Protocol 46). The resolution mirrors Protocol 46's own fix for exactly this
tension: `--check` treats **absence** as success (nothing to diff against — a machine with no
local `library/` tree sees no difference at all, so CI can never fail here) and treats
**presence-and-drift** as a real failure. `scripts/gate.js` runs `test-catalog:check` on **both**
`gate:fast` and the full `gate` (pure Node, no external dependency, same placement as the A3
cloud-serialization guard) — harmless everywhere the file is absent, and load-bearing on the one
machine (the owner's) where it exists to drift.

**The stamp is compared against ITSELF, not a fresh one (found live, Protocol 42, at this
feature's own first push).** The generated file's commit/branch/date stamp legitimately changes
on every commit — including ones that never touch the runner — so diffing against a freshly
re-derived stamp meant any unrelated commit made the very next push's `--check` fail for a HEAD
that had simply moved. `--check` instead recovers the on-disk file's own stamp
(`extractMeta()`) and rebuilds against **that** for comparison — only an actual change to a
suite's title or narration is ever reported as drift; the stamp is free to lag until the next
deliberate `npm run test-catalog`.

**Regression coverage:** **Suite 247** requires the real extraction to parse a large,
de-duplicated suite list (both the numbered "Suite N —" convention and the suites that predate
it), proves de-duplication of a re-emitted header, proves a genuinely bare suite gets the honest
fallback rather than an invented one, proves an unrelated commit alone (stamp-only drift) is
never reported as staleness, and exercises the real `--check` CLI end-to-end (absent →
exit 0, current → exit 0, stale → exit 1) against a throwaway output path
(`ROBCO_TEST_CATALOG_OUTPUT`) so the developer's own local file is never touched by the test
itself.

**Suite 220's forward-reference retired in the same commit.** Protocol 47 was named by number in
this file's 3-class model (below) before this heading existed — Suite 220.9's `REF_ALLOW_220`
carried it as the one sanctioned forward-reference, and 220.10 proved the report disclosed it
honestly. Both are updated here: `REF_ALLOW_220` is now empty (Protocol 49 — retiring a
forward-reference removes its allowlist entry, not just its "reserved" prose), and 220.10 was
re-targeted to prove the reporting formatter's honesty against a **synthetic** allowlist hit
instead of a real one — the old version would otherwise have failed the moment this heading
landed, for having nothing left to allowlist, which is exactly the kind of flaw Protocol 42 says
to fix in the same commit it's found in rather than work around.

---

## Protocol 52 — Generated Architecture Table of Contents

**Shipped 2026-07-27 (QUEUE.md item U, candidate #1 — the audit's own headline win).**
`ARCHITECTURE.md`'s Table of Contents is produced by `scripts/generate-architecture-toc.js`
directly from the file's own `## ` headings and their preceding `<a id="…">` anchors — it is
**never hand-typed again**. Unlike Protocol 47's `library/TEST_CATALOG.md`, `ARCHITECTURE.md` is
a **committed** file (not gitignored), so this is the simpler, direct-assertion half of the same
GENERATE shape rather than the gitignored-`library/` variant.

**Why this candidate led the audit's ranked list.** The hand-typed 38-entry list had already
drifted for real once in this exact project — its own header comment recorded "previously 19
entries, drifted 20 headings out of date" before the R10 Step 3 manual fix
(`planning/2.8.5/audits/GENERATE_VS_MAINTAIN_AUDIT.md`, candidate #1). A structural twin of this
check — the `LOAD-ORDER-GUARD` marker convention, two sections later in the same file — already
proved the shape works.

**What it extracts.** Every line starting with exactly `## ` (not `### `) is a TOC-eligible
heading, except the "Table of Contents" heading itself. Its anchor is the nearest `<a
id="…"></a>` line found scanning upward, skipping only blank lines. The generated link text is
each heading's **full text verbatim**, including any parenthetical code/attribution suffix — the
only zero-false-positive source; no shortening or editorializing, the same "never hand-typed,
full fidelity" stance Protocol 47 takes for suite titles. This means some entries now read longer
than the previous hand-shortened titles (e.g. `Ambient Runtime (`js/core/runtime.js` — Step 2 ·
Phase 2 · A1)` instead of just `Ambient Runtime`) — an accepted trade for a TOC that can never
again silently drift from the real heading set.

**Usage:** `npm run architecture-toc` regenerates the block between the `<!-- TOC:BEGIN -->` /
`<!-- TOC:END -->` markers in place; `npm run architecture-toc:check` verifies it's current
without writing (wired into `scripts/gate.js`, both `gate:fast` and `gate`, pure Node with zero
external dependency). Regeneration is a **deliberate step**, never automatic — same "flag, never
auto-fix" posture as Protocol 41's cleanup sweep and Protocol 47's catalog check.

**No gitignored-absence tension.** `ARCHITECTURE.md` is committed and always present, so unlike
Protocol 47's `--check` there is no "absent → pass" fail-safe branch to reason about — a mismatch
is simply a fail, the same shape as Suite 220.3/220.4's `LOAD-ORDER-GUARD` assertion.

**Regression coverage:** Suite 250 (`tests/robco-diagnostics.js`) proves the extraction against
the real file (correct entry count, first/last entries match), that every entry generated is
correctly anchored, that `package.json` wires both commands, that `scripts/gate.js` runs the
check on both gates, and exercises the real `--check` CLI end-to-end (current → exit 0, stale →
exit 1) against a throwaway copy (`ROBCO_ARCHITECTURE_MD_PATH`) so the developer's own
`ARCHITECTURE.md` is never touched by the test itself.

---

## Protocol 53 — Generated Code Map Sections (a HYBRID doc, not a fully-generated one)

**Shipped 2026-07-27 (QUEUE.md item U, candidates #6/#7/#8).** `library/CODE_MAP.md` is mostly
**LIVE** (hand-written conceptual invariants — the Two-Store Boundary, the Registry, the
panel-wiring checklist, the Audio categorization, the Boot Lifecycle "why" notes — see the
3-class model below and the audit's own KEEP list), but three of its sub-sections are pure
mechanical transforms of a live source array/grep. `scripts/generate-code-map.js` regenerates
**only those three**, between committed marker pairs, and leaves everything else in the file
byte-identical — a **committed file can carry a GENERATED subsection without the whole file
needing to be gitignored OR fully generated**, the same "hybrid doc" shape Protocol 52 already
established in miniature for `ARCHITECTURE.md`'s Table of Contents, applied here to a doc that
is itself gitignored (`library/CODE_MAP.md`), so this protocol combines Protocol 47's
absent→pass / present-and-stale→fail gate-diff shape with Protocol 52's hybrid-section marker
convention:

1. **`DIAGNOSTIC_SHELL_TABLE`** — every `DIAGNOSTIC_SHELL_TOOLS` entry (`js/dev/test-console.js`),
   live vm-evaluated (the same technique Suite 212's `_evalRealTools()` already established for
   the Protocol 44 cross-reference guard — reused here rather than a second extractor, Protocol
   22), grouped by category, one markdown table per category with id/label/tier/destructive/
   triggers columns.
2. **`RENDER_PIPELINE_FILES`** — every top-level `function` in each of the nine
   `js/ui/ui-render-*.js` siblings, via `^function `. The panel-NAME mapping (e.g.
   `ui-render-inventory.js` → "Cargo Manifest & Ammo") is a small curated table inside the
   generator script itself (`RENDER_FILE_PANELS`) — a judgment call, not derivable from source —
   while the per-file **function list** is fully generated.
3. **`EVENT_BUS_NAMES`** — every `RobcoEvents.emit('<name>', …)` string literal across
   `js/**/*.js`, excluding `js/dev/test-console.js` (a replay surface that re-fires every event
   on demand for the Diagnostic Shell, per Protocol 44 — not a canonical emitter; counting its
   call sites would just echo the real list back, never add to it).

**Why these three and not the rest of the file.** The audit
(`planning/2.8.5/audits/GENERATE_VS_MAINTAIN_AUDIT.md`, candidates #6/#7/#8) judged each against
the same zero-false-positive bar every GENERATE candidate is held to: a live array or a stable
grep, with no human judgment needed to decide what belongs in the list. Everything else in
`library/CODE_MAP.md` — the Two-Store Boundary, the Registry, the panel-wiring checklist, the
Audio Model's start/stop-pair **categorization** (ambient loop vs. one-shot vs. haptic is a
judgment call even though the pairs themselves are grep-able), the Boot Lifecycle's "why" prose
— failed that bar on purpose and stays hand-maintained; forcing those into GENERATED-class would
be machinery in search of a problem (QUEUE.md item U's own stated principle).

**The gitignored-`library/` gate-diff, resolved exactly like Protocol 47.** `library/CODE_MAP.md`
does not exist on a clean CI checkout, so `--check` treats **absence** as success (nothing to
diff against) and **presence-and-drift** as a real failure — same fail-safe shape as Protocol 47's
`library/TEST_CATALOG.md` and Protocol 46's `library/MANIFEST.txt` before it.

**The missing-marker case is a structural error, distinct from ordinary drift.** Because this doc
is hybrid (not fully generated), the script can be pointed at a doc that has lost one of its three
marker pairs entirely (a hand-edit that deleted a marker comment, or a doc that predates this
protocol). That is a real authoring mistake, not routine staleness — the script refuses to write a
silently-partial doc and instead fails loudly, naming exactly which marker pair is missing.

**Usage:** `npm run code-map` regenerates the three blocks in place; `npm run code-map:check`
verifies they're current without writing (wired into `scripts/gate.js`, both `gate:fast` and
`gate`, pure Node with zero external dependency). Regeneration is a **deliberate step**, never
automatic — same "flag, never auto-fix" posture as Protocol 41's cleanup sweep and every other
GENERATED-class check in this file.

**Regression coverage:** Suite 251 (`tests/robco-diagnostics.js`) proves all three extractors
against the real source (the vm-eval'd tool array, the nine render-file function lists, the
event-name scan — including a source-level proof that `test-console.js` is excluded by name, not
merely coincidentally absent from the result), the three block builders' rendering shape
(destructive yes/no, the `_none_` fallback, backtick-joined lists), the marker-replace helper
(including the null-return path for an absent marker), that `package.json`/`scripts/gate.js` wire
the commands, and exercises the real `--check`/regenerate CLI end-to-end (absent → exit 0,
current → exit 0, stale → exit 1, missing-marker → exit 1 naming the marker) against a throwaway
3-marker skeleton (`ROBCO_CODE_MAP_OUTPUT`) so the developer's own `library/CODE_MAP.md` is never
touched by the test itself.

---

## The 3-class library maintenance model (2.8.5 U-B1)

Every doc under `library/` and `planning/` falls into exactly one of three classes, and the class dictates how it's kept current:

- **LIVE** — actively maintained, gate-guarded where possible: `library/BRAIN_DUMP.md`, `library/CODE_MAP.md`, `QUEUE.md`, the Reference Pointer Index in `CLAUDE.md`, and the `rules/*.md` subsystem notes. A stale LIVE doc is worse than no doc at all — it makes a session confidently wrong. Update in the same commit whenever something it describes stops being true.
- **GENERATED** — never hand-maintained; produced from source by a script and diffed against the on-disk copy in the gate. `library/TEST_CATALOG.md` **is** this class now (Protocol 47, above, shipped 2026-07-27) — it carries no test count (Protocol 2a is retired) and is regenerated by `npm run test-catalog`, never hand-edited. `ARCHITECTURE.md`'s Table of Contents is this class too, in miniature (Protocol 52, above, shipped 2026-07-27) — the surrounding file is otherwise LIVE, but the TOC block between the `<!-- TOC:BEGIN -->` / `<!-- TOC:END -->` markers is generated and gate-diffed like any other GENERATED artifact; a **committed** file can carry a GENERATED subsection without the whole file needing to be gitignored. **`ROADMAP.md` is this class too** (QR1 Phase 0, 2026-08-13) — produced from `QUEUE.md` by `npm run roadmap` (`scripts/roadmap-generate.js`) into the **private** planning tree, never hand-edited, and resolved through `planningWritePath()` rather than being read back as an input. It differs from the other two in one deliberate way worth knowing: **its generator is a reporter, not a gate.** The OUTPUT fails closed — a structural parse gap renders the whole document BLIND, with an enumerated reason and a plain statement of what the reader no longer knows, never a partial list and never the last good answer — but the PROCESS always exits 0 and can never fail a sync, commit, or push. `npm run roadmap:check` is the separate assertion that turns that refusal into a red, so it still gets noticed — **wired into the gate as step 4f since QR1 Phase 3 (2026-08-13)**, running on `gate:fast` and `gate` alike, and no-op where the private tree is absent. ⚠ Note what that step asserts: **presence + non-blindness + source freshness, but NOT full currency** — unlike Protocol 47/52/53 it cannot regenerate and byte-compare, because the board stamps the app repo's git HEAD and that changes on every unrelated commit (the 247.10 trap). It fails on four conditions in this order: **missing → blind → unverifiable → stale**. ⛔ **Two of those four were false greens until 2026-08-13**, found by reading the code rather than by any test: an absent board printed "nothing to verify" and exited 0 (a green-that-skipped inside the guard against greens that skipped — deleting the file made its own check pass), and a stale board passed because nothing compared the source sha256 it records against the live `QUEUE.md`. Both are locked red-then-green by Suite 248.7, together with the two false-positive guards that matter: no planning tree at all still exits 0 (the F04 public-clone case — an absent TREE and an absent BOARD are different facts), and a changed app-HEAD stamp is never treated as staleness. It is **not** in `PLANNING_FILES` — that list is the READ contract, and adding a written file to it would make every checkout that has not yet run the generator silently SKIP the queue suites.
- **ARCHIVE** — frozen point-in-time snapshots: the audits, plans, mockups, and slates under `planning/`, **plus the tracked root-level `QUEUE_LOG.md`** (the shipped-work reasoning archive split out of `QUEUE.md` at the 2026-07-21 restructure — append-only; a shipped item's full account moves there under a stable `<a id>` anchor while `QUEUE.md` keeps the one-liner + link). These carry a "snapshot as of DATE — not current truth" framing and are never updated to track current code; their reasoning is reused as historical input, never trusted as current fact. The pre-2.8.0 audits (`planning/2.8.0/audits/CODE_QUALITY_AUDIT.md`, `planning/2.8.0/audits/PERFORMANCE_AUDIT.md`, `planning/2.8.0/audits/ACCESSIBILITY_AUDIT.md`, `planning/2.8.0/audits/TEST_STRENGTH_AUDIT.md`, `planning/2.8.0/audits/TOKEN_USAGE_AUDIT.md`, `planning/2.8.0/audits/UI_CONSISTENCY_AUDIT.md`, `planning/2.8.0/audits/CLOUD_AUDIT.md`, `planning/2.8.0/audits/FILE_AUDIT.md`) are ARCHIVE-class — they audited a codebase roughly 30% smaller than today's; do not trust their measurements or reuse their proposals without re-verifying against current code. (They live under `2.8.0/` because they were the analysis phase that PRODUCED the 2.8.0 overhaul — the version whose work they were part of — even though they measure the earlier v2.6.0/v2.7.0 code.)

**Doc-maintenance rule (LIVE docs):**

- `library/BRAIN_DUMP.md` is the canonical reconstruction doc and future sessions trust it — the stale-LIVE-doc rule above applies in full (a stale dump makes sessions confidently wrong). Update it in the same commit whenever something in it stops being true: an architecture change, a new/changed protocol, a shipped roadmap item, a newly-learned recurring gotcha. **★ Hard exit condition:** the 2.8.5 code + test health phase restructures the whole file layout and invalidates large parts of the dump — that phase is **not complete** until the brain dump has been re-baselined against the restructured codebase.
- `QUEUE.md` is updated in the same commit as any change that actually moves the roadmap. It is the **queue** only — the lean, phone-readable list of what is still ahead. When an item ships, its full body moves to `QUEUE_LOG.md` (ARCHIVE-class, append-only) and `QUEUE.md` keeps a one-line record with a link. Do not let closed-work post-mortems accumulate back in `QUEUE.md` — that two-jobs-in-one-file bloat is exactly what the 2026-07-21 split fixed. `QUEUE_LOG.md` is in Suite 220's doc-reference-integrity scan set, so any `Protocol N` it names must still resolve.
- `library/CODE_MAP.md` (new, 2.8.5 U-B2) is updated in the same commit whenever a file is split/added/moved/removed or a major function relocates — see Protocol 46 above.
- A **portable brief for an external model** (Gemini/GPT) is NOT a standing doc — it is regenerated fresh from the current brain dump on request, so it is always accurate because it is always new. Never keep a second standing copy of the truth. The generation spec lives in the brain dump ("Generating a portable brief for an external model").

---

## Related notes

- Where the rulebook's own structure is defined: `CLAUDE.md` (the contract + retrieval map)
- Backing up `library/`, `planning/` and agent memory: **Protocol 48** — in `CLAUDE.md`.

**Where a standing tool lives — and the backup consequence (R4, 2026-07-20).** `library/PROMPT_LIBRARY/`
(the reusable prompt set + the engineering playbook) moved out of `planning/_standing/`. The reason is the
3-class model above: those two files are **standing tools that get re-aimed**, not frozen point-in-time
snapshots, so they were mis-filed under ARCHIVE-class `planning/`.

**Know what the move costs, because it is a real downgrade in backup guarantee.** Protocol 48's sync
mirrors `planning/` **additively** — once captured, a planning file is never removed from the archive even
if it disappears locally. `library/` is a **plain mirror**: a local deletion now propagates to the archive
working tree on the next sync. The content stays recoverable from the archive's git history, but the
"deleted locally is still sitting in the archive working copy" safety net no longer applies to these two
files. That is the accepted trade for filing them by what they actually are — recorded here rather than
discovered later.

- File moves that oblige a code-map update: `rules/file-layout.md`
