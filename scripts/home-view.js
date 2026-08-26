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
.tiles { list-style:none; margin:1.2rem 0 0; padding:0; }
.tiles li { margin:0 0 .7rem; border:1px solid var(--line); border-radius:10px;
  background:var(--code); padding:.8rem 1rem .9rem; }
.tiles a.t { display:block; text-decoration:none; font-weight:700;
  font-size:1.12rem; color:var(--acc); padding:.35rem 0; min-height:44px; }
.tiles p.d { margin:.1rem 0 0; color:var(--fg); font-size:.97rem; line-height:1.5; }
.tiles p.m { margin:.35rem 0 0; color:var(--dim); font-size:.85rem; }
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
function tile({ href, title, what, meta, away }) {
  const cls = away ? ' class="t away"' : ' class="t"';
  const rel = away ? ' rel="noreferrer noopener"' : '';
  return (
    `<li>` +
    `<a href="${escapeHtml(href)}"${cls}${rel}>${escapeHtml(title)}</a>` +
    `<p class="d">${escapeHtml(what)}</p>` +
    (meta ? `<p class="m">${escapeHtml(meta)}</p>` : '') +
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
 * @param {string} state.museumUrl         the public site's address.
 * @param {Date|null} state.statusGeneratedAt  the snapshot's OWN stamp — never
 *   the time it was read, which is a different and much more flattering number.
 * @param {boolean} state.statusReachable  whether a snapshot was read at all, so
 *   an unreadable one and an undated one are not collapsed into one message.
 * @param {number|null} state.logCount     how many log files are readable.
 * @param {Array<[string,string]>} state.unbuilt  destinations that do not exist
 *   yet, as [name, why]. ⛔ Handed in — see the note at its point of use.
 */
function renderHome(state) {
  const s = state || {};
  const hasReports = typeof s.reportCount === 'number';
  const hasBoard = s.boardUpdated instanceof Date;
  // ⚠ A stamp that is present but unreadable is NOT the same fact as no snapshot
  // at all, and the tile says which — "it does not say when" and "there is
  // nothing there" send you to different places.
  const hasStatusStamp =
    s.statusGeneratedAt instanceof Date && Number.isFinite(s.statusGeneratedAt.getTime());

  const tiles = [
    tile({
      href: '/',
      title: 'The terminal',
      what: 'The Fallout companion app itself, running from this machine right now.',
    }),
    tile({
      href: '/reports#roadmap',
      title: "What's next",
      what: 'The build board: what is ready to start, what is underway, what is waiting.',
      meta: hasBoard ? `Updated ${ago(s.boardUpdated)}` : 'No board on this machine yet.',
    }),
    tile({
      href: '/reports#reports',
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
    tile({
      href: '/status',
      title: 'Live status',
      what: 'What the control plane last reported: whether enforcement is armed, and what it found.',
      meta: hasStatusStamp
        ? `Snapshot taken ${ago(s.statusGeneratedAt)} — not a live reading`
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
      `<h1>Start here</h1>` +
      `<p>Everything below is checked each time this page loads.</p>` +
      `<ul class="tiles">${tiles.join('')}</ul>` +
      later +
      `<p class="asof">Nothing here is stored or cached — this page is built fresh on every visit.</p>`,
  });
}

module.exports = { renderHome, ago, HOME_STYLE };
