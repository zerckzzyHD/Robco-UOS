#!/usr/bin/env node
/**
 * scripts/home-view.js — the landing page: one screen that reaches everything.
 *
 * ── ⭐ WHO THIS IS FOR, AND WHY THAT DECIDES EVERY CHOICE BELOW ──────────────
 * This is read on a phone, half awake, in the dark. That single fact rules out
 * most of what a "hub page" normally is. So:
 *
 *  · EVERY TILE SAYS WHAT THE THING IS, in ordinary words, on the tile. Not a
 *    short code, not a name only somebody who already knows the project could
 *    resolve. If a label needs prior knowledge to decode, it has failed the only
 *    test that matters here.
 *  · NOTHING IS BEHIND A TAP THAT DOESN'T HAVE TO BE. The destinations are the
 *    page. Anything supplementary is collapsed and starts CLOSED.
 *  · BIG TARGETS. A whole tile is the link, not the words inside it.
 *
 * ── ⛔ THE RULE THIS PAGE EXISTS TO KEEP: NO LINK TO SOMETHING THAT ISN'T THERE
 * A dead link on this page is worse than a missing one. A missing destination is
 * a thing not built yet; a dead link is the page lying, and it costs a tap plus
 * the confusion of not knowing whether the destination broke or never existed.
 *
 * ⚠ AND "IT RETURNED 200" IS NOT EVIDENCE A DESTINATION EXISTS. The dev server
 * answers unknown paths with the app's own index page — same status, same bytes.
 * Every destination below was checked by comparing its CONTENT against a
 * deliberate nonsense path on the same host, never by status code. Two of the
 * candidates for this page turned out to be nothing at all, and one turned out to
 * live somewhere entirely different from where it was first looked for.
 *
 * ── WHY THE UNBUILT ONES ARE LISTED AT ALL ──────────────────────────────────
 * Silently omitting them reads as an oversight, and invites the question "did it
 * break?" every time. They are named, plainly, as not built — and deliberately
 * rendered as PLAIN TEXT, never as anchors, so there is nothing to tap and
 * nothing to be disappointed by.
 *
 * Rendering reuses report-view.js's page shell and stylesheet rather than growing
 * a second one, so the two surfaces cannot drift apart in look or behaviour.
 */
'use strict';

const { page, escapeHtml } = require('./report-view.js');

/**
 * Tile styling, passed to the shared shell rather than added to its stylesheet.
 *
 * ⚠ Kept OUT of report-view.js's STYLE on purpose: that sheet is documented as
 * being aimed at long-form prose, and these rules are aimed at a menu. Mixing
 * them would leave dead selectors on every report page and blur what that sheet
 * is for. The shared shell supplies the palette, so the two pages still match.
 */
const HOME_STYLE = `
/* ⛔⤴ THE RETIRED-INSTALL NOTICE — CSS-ONLY, and hidden by default.
   The display-mode:standalone query is true ONLY when this page was opened from an
   INSTALLED app rather than a browser tab. That is exactly, and only, the person
   this notice is for: somebody whose home-screen icon used to open the terminal
   and now opens this page, because the app moved off this origin's root on
   2026-09-03 (commit 7a42e82). ⭐ A tab visitor never sees it, so it costs the normal
   reader nothing. No script — this page measures nothing and runs nothing. */
.retired { display:none; }
@media (display-mode: standalone) { .retired { display:block; } }
.retired { border:2px solid var(--hi); border-radius:10px; background:var(--code);
  padding:.85rem 1rem .95rem; margin:0 0 1.2rem; }
.retired h2 { margin:0 0 .4rem; font-size:1.05rem; color:var(--hi); }
.retired p { margin:.35rem 0 0; font-size:.97rem; line-height:1.5; }
.retired a { color:var(--acc); font-weight:700; }
.tiles { list-style:none; margin:1.2rem 0 0; padding:0; }
.tiles li { margin:0 0 .7rem; border:1px solid var(--line); border-radius:10px;
  background:var(--code); padding:.8rem 1rem .9rem; }
.tiles a.t { display:block; text-decoration:none; font-weight:700;
  font-size:1.12rem; color:var(--acc); padding:.35rem 0; min-height:44px; }
.tiles p.d { margin:.1rem 0 0; color:var(--fg); font-size:.97rem; line-height:1.5; }
.tiles p.m { margin:.35rem 0 0; color:var(--dim); font-size:.85rem; }
/* ⛔⛤ A WARNING IN THE DIM COLOUR IS NOT A WARNING. The freshness line lives in
   the tile's quietest slot, which is right for "6 reports" and wrong for the one
   sentence on this page that means STOP. Seen rendered: "⛔ OUT OF DATE — the
   queue has moved on" arrived in the same grey as every incidental fact around
   it, on a page read at a glance, in the dark — which is the whole population of
   readers this page has. The emphasis is the point of saying it at all. */
.tiles p.m.warn { color:var(--hi); font-weight:700; font-size:.9rem; }
.tiles a.away::after { content:" ↗"; font-weight:400; }
details.later { margin:1.6rem 0 0; border:1px solid var(--line);
  border-radius:10px; background:var(--code); padding:0 .9rem; }
details.later summary { cursor:pointer; padding:.85rem .1rem; font-weight:600;
  min-height:44px; display:flex; align-items:center; color:var(--dim); }
details.later ul { list-style:none; padding:0; margin:0 0 .8rem; }
details.later li { margin:0; padding:.65rem .1rem; border-top:1px solid var(--line); }
details.later p.t { margin:0; font-weight:700; color:var(--fg); font-size:.97rem; }
details.later p.d { margin:.15rem 0 0; color:var(--dim); font-size:.92rem;
  line-height:1.5; }
p.asof { color:var(--dim); font-size:.85rem; margin:1.6rem 0 0; }
`;

/**
 * "3 hours ago" — a phone at 4am wants elapsed time, not a timestamp it has to
 * subtract from a clock it hasn't looked at yet. Falls back to nothing rather
 * than guessing when the date is unusable.
 */
function ago(when) {
  const t = when instanceof Date ? when.getTime() : NaN;
  if (!Number.isFinite(t)) return '';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 0) return '';
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs === 1 ? 'about an hour ago' : `about ${hrs} hours ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/**
 * The same span as `ago()`, worded as a DURATION rather than as a point in the
 * past — "4 days", not "4 days ago".
 *
 * ⛔ IT IS NOT `ago()` WITH THE WORD "AGO" TRIMMED, and that shortcut is exactly
 * why this exists: `ago()` legitimately answers "yesterday" for a one-day span,
 * and trimming a suffix that is not there yields "nothing new for yesterday".
 * ⚠ Two spellings of one span is a duplication risk, so both are derived from the
 * same minute count rather than one being rewritten out of the other's output.
 */
function elapsed(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m < 0) return '';
  // ⚠ Zero minutes is a real reading here — a directory written to seconds ago —
  // and "0 minutes ago" is not a sentence anybody says. It reads as a rendering
  // fault rather than as the freshest possible answer, which is what it is.
  if (m < 1) return 'under a minute';
  if (m < 60) return m === 1 ? '1 minute' : `${m} minutes`;
  const hrs = Math.round(m / 60);
  if (hrs < 24) return hrs === 1 ? 'about an hour' : `about ${hrs} hours`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'a day' : `${days} days`;
}

/**
 * ⭐⭐ HOW OLD IS TOO OLD — ONE RULE, IN THE SAME PLACE AS `ago()`, BECAUSE IT IS
 * THE SAME QUESTION ASKED FOR A DECISION INSTEAD OF FOR A SENTENCE.
 *
 * ── ⛔⛔ THE DEFECT THIS CLOSES, MEASURED ON THE LIVE SNAPSHOT ───────────────
 * The status page already led with the age in words, and the tile below already
 * printed it. Both were CORRECT and both were USELESS on 2026-09-01, when the
 * snapshot's own stamp read 2026-08-28T14:50:39Z — four days — and the surfaces
 * said, in full: "old enough to be worth double-checking before acting on it".
 *
 * ⚠ That sentence is calibrated for a reading that is slightly behind. Applied to
 * a producer that has emitted nothing for four days it is not merely weak, it
 * points the wrong way: it advises care about a VALUE when the fact is that the
 * SOURCE HAS STOPPED. Sixteen minutes and four days rendered identically, so
 * there was no age at which either surface said anything had gone wrong — and the
 * freeze went unnoticed for three days by a reader who was looking at the number.
 *
 * ⭐ A THRESHOLD, NOT A VERDICT — and the distinction is what makes this legal on
 * a page whose governing rule is that it decides nothing. The age of this page's
 * OWN INPUT is arithmetic on a stamp the input carries; it is measured here, not
 * inferred. Nothing below claims the control plane is unhealthy, broken, or
 * anything else — only that nothing has been heard from it, which is a fact about
 * this page's knowledge rather than about the system.
 *
 * ⚠ THE NUMBERS, AND WHY THEY CANNOT PLAUSIBLY FIRE EARLY. Sampled from the
 * project's own kept history, the snapshot's stamp trails the moment it is read by
 * SECONDS (11 s, 25 s, 25 s on three consecutive days). An hour is over a hundred
 * times the largest of those. ⛔ The cadence itself is deliberately NOT written
 * down here — this repository is public, and a threshold this loose needs no
 * knowledge of it.
 *
 * ⭐ AND A LONG GAP IS NOT AUTOMATICALLY A FAULT. A machine that was asleep has
 * genuinely not been heard from, and saying so is true and useful. Which of the
 * two it is gets answered by evidence, not by this function: see the state
 * directory's own last write, carried alongside on the status page.
 */
const AGEING_MINUTES = 15;
const STALE_MINUTES = 60;

/**
 * @param {Date|null} when the source's OWN stamp — never the read's clock.
 * @param {number} [nowMs] injectable so a test can drive a boundary exactly.
 * @returns {{known:boolean, minutes:number|null, phrase:string, tier:'unknown'|'fresh'|'ageing'|'stale'}}
 */
function assessAge(when, nowMs) {
  const t = when instanceof Date ? when.getTime() : NaN;
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  if (!Number.isFinite(t)) return { known: false, minutes: null, phrase: '', tier: 'unknown' };
  const minutes = Math.floor((now - t) / 60000);
  // ⛔ A stamp from the FUTURE is not fresh, it is unusable — a clock disagreement
  // somewhere, and the one thing that must not happen is reporting it as current.
  if (minutes < 0) return { known: false, minutes, phrase: '', tier: 'unknown' };
  const tier = minutes >= STALE_MINUTES ? 'stale' : minutes >= AGEING_MINUTES ? 'ageing' : 'fresh';
  return { known: true, minutes, phrase: ago(when), tier };
}

/**
 * One destination.
 *
 * ⛔ THE LINK TEXT IS THE TITLE AND NOTHING ELSE, and the description and freshness
 * line are SIBLINGS of the anchor rather than children of it. Both halves of that
 * were a real defect, reported from a phone:
 *
 *  1. Everything used to live inside the anchor, separated only by `display:block`
 *     on a set of spans. Structure that exists only in a stylesheet is not
 *     structure — the moment the CSS was not applied, every tile collapsed into
 *     one run-on sentence ("The terminalThe Fallout companion app itself…") with
 *     no separator anywhere. So the separation is now carried by ELEMENTS whose
 *     default rendering is already correct: a paragraph breaks the line with no
 *     stylesheet at all, a styled span does not.
 *  2. With the description inside the anchor, the link's accessible name was the
 *     whole paragraph — a screen reader announced three sentences as the name of
 *     one link. Now the name is "The terminal".
 *
 * ⚠ The tap target moves from the whole card to the title link, which is why that
 * link is a block with its own padding and a 44px floor. That is a deliberate
 * trade: a big target is worth less than a page that still reads when the styling
 * does not arrive, and the target stays comfortably above the minimum either way.
 */
function tile({ href, title, what, meta, metaWarn, away }) {
  const cls = away ? ' class="t away"' : ' class="t"';
  const rel = away ? ' rel="noreferrer noopener"' : '';
  return (
    `<li>` +
    `<a href="${escapeHtml(href)}"${cls}${rel}>${escapeHtml(title)}</a>` +
    `<p class="d">${escapeHtml(what)}</p>` +
    (meta ? `<p class="m${metaWarn ? ' warn' : ''}">${escapeHtml(meta)}</p>` : '') +
    `</li>`
  );
}

/**
 * Render the landing page.
 *
 * @param {object} state
 * @param {number|null} state.reportCount  how many reports are readable, or null
 *   when the private tree is not reachable at all (a plain checkout — normal).
 * @param {Date|null} state.boardUpdated   when the build board last changed, or
 *   null when there is no board to read.
 * @param {boolean|null} state.boardCurrent  whether the board still matches the
 *   queue it renders — TRUE, FALSE, or null for "could not be established".
 *   ⛔ Three states on purpose: null must not render as true. Measured, never
 *   inferred from boardUpdated, which is a write time and not a currency.
 * @param {string} state.museumUrl         the public site's address.
 * @param {Date|null} state.statusGeneratedAt  the snapshot's OWN stamp — never
 *   the time it was read, which is a different and much more flattering number.
 * @param {boolean} state.statusReachable  whether a snapshot was read at all, so
 *   an unreadable one and an undated one are not collapsed into one message.
 * @param {number|null} state.logCount     how many log files are readable.
 * @param {Array<[string,string]>} state.unbuilt  destinations that do not exist
 *   yet, as [name, why]. ⛔ Handed in — see the note at its point of use.
 * @param {boolean|null} state.projectionAvailable  whether the external
 *   projection renderer is configured on this machine — TRUE, FALSE, or null for
 *   "not checked". ⛔ Three states, like every other fact here.
 */
/**
 * ⛔ The notice an OLD home-screen icon lands on.
 *
 * Until 2026-09-03 the terminal was served at this origin's ROOT, so an install
 * made from here has `start_url` and `scope` of `/` — and `/` is this landing
 * page now. ⚠ A PWA install is BOUND to the start_url and scope it was created
 * with; there is no server-side way to move one. So the honest fix is to say so
 * and point at the new address, rather than leave a home-screen icon that opens
 * a page with no explanation of why the app is not there.
 */
const RETIRED_INSTALL_NOTICE =
  `<section class="retired">` +
  `<h2>This installed app is out of date</h2>` +
  `<p>You opened this from a home-screen icon that was installed when the terminal ` +
  `lived at this address. It moved on 3 September, so this icon now opens the index ` +
  `instead of the app.</p>` +
  `<p>Open <a href="/terminal/">the terminal</a>, then install it again from there. ` +
  `The new one is called <strong>RobCo DEV</strong> and has an amber icon, so you can ` +
  `tell it apart from the published app. You can delete this icon afterwards.</p>` +
  `</section>`;

function renderHome(state) {
  const s = state || {};
  const hasReports = typeof s.reportCount === 'number';
  const hasBoard = s.boardUpdated instanceof Date;
  // ⚠ A stamp that is present but unreadable is NOT the same fact as no snapshot
  // at all, and the tile says which — "it does not say when" and "there is
  // nothing there" send you to different places.
  const hasStatusStamp =
    s.statusGeneratedAt instanceof Date && Number.isFinite(s.statusGeneratedAt.getTime());
  // ⭐ ONE assessment, shared by the tile below — and the SAME function the status
  // page runs, so the two surfaces cannot disagree about what "stale" means.
  const statusAge = assessAge(hasStatusStamp ? s.statusGeneratedAt : null);

  const tiles = [
    // ⛔ THE TRAILING SLASH IS LOAD-BEARING. The app is served under a base path,
    // and Vite answers the slash-less form with a 404 hint page, not the app.
    tile({
      href: '/terminal/',
      title: 'The terminal',
      what: 'The Fallout companion app itself, running from this machine right now.',
    }),
    // ── ⛔⛤ "UPDATED 44 MINUTES AGO" WAS TRUE AND WAS NOT THE ANSWER ──────────
    // This tile reported the board FILE's modification time, which says when it was
    // written and nothing whatever about whether it still matches the queue it is a
    // view of. ⛔⛔ Measured 2026-09-01: the board was 59 items stale — 307 rendered
    // against 366 live — and this tile said "Updated <recently>", which reads as
    // reassurance. It is the same mistake as an age with no staleness tier, one tile
    // over: the age of an artifact is not its currency.
    //
    // ⭐ HANDED IN, like every other fact on this page — the renderer measures
    // nothing and reaches for no file. ⛔ And an UNKNOWN currency is printed as
    // unknown: a board whose match could not be established is not a board that is
    // fine, and collapsing the two is how this page would start reassuring again.
    tile({
      href: '/queue',
      title: 'The queue',
      what: 'The build board: what needs you, what is underway, what is ready to start, and what is parked.',
      // ⛔ ONLY the out-of-date case is emphasised. A tile that shouts on every
      // state teaches the reader to stop looking at it, which costs more than the
      // one warning it was built to deliver.
      metaWarn: hasBoard && s.boardCurrent === false,
      meta: !hasBoard
        ? 'No board on this machine yet.'
        : s.boardCurrent === false
          ? `⛔ OUT OF DATE — the queue has moved on since this was built ${ago(s.boardUpdated)}.`
          : s.boardCurrent === true
            ? `Updated ${ago(s.boardUpdated)} — and it matches the queue`
            : `Updated ${ago(s.boardUpdated)} — whether it still matches the queue is unknown`,
    }),
    tile({
      href: '/reports',
      title: 'Written reports',
      what: 'Full accounts of finished work, newest first.',
      meta: hasReports
        ? s.reportCount === 1
          ? '1 report'
          : `${s.reportCount} reports`
        : 'None readable from this machine.',
    }),
    // ⛔⛔ THE WORD "SNAPSHOT" IS ON THE TILE, NOT SAVED FOR THE PAGE. Someone
    // deciding at a glance whether to tap has already formed a belief about how
    // live this is by the time the page loads — so the tile that sets that
    // belief is where the qualification has to be, not one tap further on.
    //
    // ⭐ The age shown here is the snapshot's OWN stamp, read through the same
    // function the status page uses, at the same moment. The two cannot disagree
    // because there is one rule and no cached copy on either side.
    //
    // ── ⛔⛔ THE TITLE NO LONGER SAYS "LIVE", AND THAT WAS NOT A TIDY ──────────
    // It read "Live status" for as long as this page has existed, and on
    // 2026-09-01 it sat above the words "Snapshot taken 4 days ago". ⚠ The tile's
    // own governing rule is that a label must not need prior knowledge to decode
    // — but a label that asserts a property the code CANNOT HONOUR is worse than
    // one that is merely obscure, because it is not ambiguous, it is wrong. The
    // meta line beneath it was already carrying the correction, and a correction
    // underneath a claim is read second, if at all.
    //
    // ⚠ THE COST IS NAMED: the owner refers to this tile by its name, and the
    // name has changed. That is a real, small cost, accepted because the word
    // being removed is the single most misleading token on this page.
    // ⭐ THE PROJECTION IS RENDERED BY A SEPARATE PROGRAM, PER VISIT. This tile
    // says so, and says when that program is not there — handed in like every
    // other fact here, never probed from the renderer.
    tile({
      href: '/view',
      title: 'Control plane view',
      what: 'A read-only projection of the control plane, rendered fresh on every visit. Every value carries how old it is, and it can say it does not know.',
      meta:
        s.projectionAvailable === true
          ? 'Rendered on every visit — nothing is cached'
          : s.projectionAvailable === false
            ? 'No renderer is configured on this machine.'
            : 'Whether a renderer is configured was not checked.',
    }),
    tile({
      href: '/status',
      title: 'Control plane status',
      what: 'What the control plane last reported: whether enforcement is armed, and what it found.',
      // Same rule as the board tile: emphasis on the stopped-source case alone.
      metaWarn: hasStatusStamp && statusAge.tier === 'stale',
      // ⛔⛔ AT THE TOP TIER THE TILE STOPS DESCRIBING AN AGE AND STATES A FACT.
      // "Snapshot taken 4 days ago" is true, and it is a number the reader has to
      // interpret before it means anything. "Nothing new for 4 days" is the
      // interpretation, and it is the one the reader wanted — while still saying
      // nothing about whether the SYSTEM is well, only about what has been heard.
      meta: hasStatusStamp
        ? statusAge.tier === 'stale'
          ? `STALE — nothing new for ${elapsed(statusAge.minutes)}. This is the last snapshot, not a live reading.`
          : `Snapshot taken ${statusAge.phrase} — not a live reading`
        : s.statusReachable === true
          ? 'Readable, but it does not say when it was taken.'
          : 'Nothing readable from this machine.',
    }),
    tile({
      href: '/ledger',
      title: 'The record of runs',
      what: 'The kept history of what ran and when, in the order it happened.',
      // ⚠ "The end of each file" is stated HERE for the same reason as above: a
      // tile promising a history, opening onto a window of one, is a small lie
      // that only shows up as confusion later.
      meta:
        typeof s.logCount === 'number' && s.logCount > 0
          ? `${s.logCount} files — opening one shows the end of it, not all of it`
          : 'Nothing readable from this machine.',
    }),
  ];

  // ⛔ Only added because the address was confirmed to serve real, DISTINCT pages
  // — not merely to answer. That host returns its front page for unknown paths
  // too, so "it responded" would have proved nothing.
  if (s.museumUrl) {
    tiles.push(
      tile({
        href: s.museumUrl,
        title: 'The museum',
        what: 'The public site telling the story of how this was built.',
        meta: 'Opens the public web, outside this private network.',
        away: true,
      })
    );
  }

  // Named, not linked — see the header. Same element-not-stylesheet rule as the
  // tiles above: these were run-on too, for the same reason.
  //
  // ⛔⛔ HANDED IN, NEVER HELD HERE — AND THAT IS THE ROOT-CAUSE FIX, NOT A TIDY.
  // This list used to be a constant inside this function, naming two pages as
  // "not built yet". Both were then built, and this page went on announcing that
  // they did not exist — because building a page cannot reach inside a renderer
  // and update a literal. The page's own governing rule is that it must never
  // misrepresent what exists; a hardcoded list of absences guarantees it will,
  // eventually, in the one direction nobody checks. A dead link at least fails
  // loudly when tapped; "not built yet" about something that IS built fails
  // silently forever, because there is nothing there to tap and be wrong.
  //
  // ⚠ It is now a PARAMETER, which restores the property this file already
  // claimed for itself in its header — that the renderer holds no addresses of
  // its own. It held two.
  const unbuilt = Array.isArray(s.unbuilt) ? s.unbuilt : [];
  const later = unbuilt.length
    ? `<details class="later"><summary>Not built yet</summary><ul>` +
      unbuilt
        .map(
          ([name, why]) =>
            `<li><p class="t">${escapeHtml(name)}</p><p class="d">${escapeHtml(why)}</p></li>`
        )
        .join('') +
      `</ul></details>`
    : // ⛔ An empty "Not built yet" box is worse than none: it reads as a section
      // that failed to load rather than as nothing being outstanding.
      '';

  return page({
    title: 'Start here',
    crumb: '',
    // ⛔ The one page that must NOT offer a way to itself — a control that goes
    // nowhere costs a tap to find out. Flagged explicitly rather than inferred
    // from the title, which would break silently the day the title changed.
    atHome: true,
    style: HOME_STYLE,
    body:
      RETIRED_INSTALL_NOTICE +
      `<h1>Start here</h1>` +
      `<p>Everything below is checked each time this page loads.</p>` +
      `<ul class="tiles">${tiles.join('')}</ul>` +
      later +
      `<p class="asof">Nothing here is stored or cached — this page is built fresh on every visit.</p>`,
  });
}

module.exports = {
  renderHome,
  RETIRED_INSTALL_NOTICE,
  ago,
  elapsed,
  assessAge,
  AGEING_MINUTES,
  STALE_MINUTES,
  HOME_STYLE,
};
