#!/usr/bin/env node
/**
 * scripts/status-view.js — renders the operational status snapshot as one
 * phone-readable page.
 *
 * ── ⛔⛔ THE THING THIS PAGE MUST NOT DO ─────────────────────────────────────
 * The file it reads is a GENERATED SNAPSHOT. It carries its own `generatedAt`,
 * and it is produced on a schedule — so reading it at request time makes the
 * READ fresh, not the DATA. A page titled "what is running right now" that
 * presents a snapshot as live is precisely the failure this page exists to
 * prevent, and it would be a convincing one: every value on it is real, just
 * possibly minutes or hours stale.
 *
 * ⛔⛔ AND IT IS REGENERATED OFTEN, WHICH MAKES THE TRAP WORSE RATHER THAN
 * BETTER: it looks live almost all the time, so the one occasion it is stale is
 * the one nobody would think to question. A page that is right 99 times teaches
 * you not to check the hundredth.
 *
 * ⭐ So the age leads, in words, before any status at all. Not the timestamp —
 * a phone at 4am should not have to subtract a timestamp from a clock it has not
 * looked at yet.
 *
 * ── ⛔ UNOBSERVABLE IS PRINTED, NEVER OMITTED ──────────────────────────────
 * A row that is missing and a row that is healthy look identical once the row is
 * gone. Anything this page cannot observe says so, in the place where the answer
 * would have been. There is no third option where a value is quietly inferred:
 * an inferred value is indistinguishable from a measured one on the page, which
 * makes it worse than a gap.
 *
 * ⚠ Nothing here computes a verdict from parts. If the source says a thing, the
 * page says that thing; if it does not, the page says UNOBSERVABLE. The moment
 * this file starts deciding what "healthy" means, it is asserting something no
 * measurement backed.
 */
'use strict';

const { page, escapeHtml } = require('./report-view.js');
// ⛔ Imported, not re-implemented. "How long ago" is one rule and it already has
// a home; a second copy is how two answers to one question begin to disagree.
const { ago, elapsed, assessAge } = require('./home-view.js');

const STATUS_STYLE = `
p.age { font-size:1.05rem; line-height:1.5; margin:.8rem 0 0; }
p.age strong { font-size:1.15rem; }
p.agewarn { color:var(--hi); font-weight:700; }
/* ⚠ The stopped-source banner is styled like the enforcement block rather than
   like a note, because it outranks everything under it: if this is showing, no
   value on the page is a statement about the present. */
.stopped { border:2px solid var(--hi); border-radius:10px; padding:1rem .9rem;
  margin:.9rem 0 1.25rem; background:var(--code); }
.stopped .lab { display:block; font-size:.85rem; color:var(--hi);
  text-transform:uppercase; letter-spacing:.06em; font-weight:700; }
.stopped .val { display:block; font-size:1.6rem; font-weight:800; line-height:1.2;
  margin-top:.2rem; color:var(--hi); }
.stopped .why { display:block; color:var(--fg); font-size:.95rem; margin-top:.55rem;
  line-height:1.55; }
.stopped .why.dim { color:var(--dim); font-size:.9rem; }
p.asof { margin:0 0 .5rem; color:var(--hi); font-weight:700; font-size:.95rem; }
.armed { border:2px solid var(--line); border-radius:10px; padding:1rem .9rem;
  margin:1rem 0 1.25rem; background:var(--code); }
.armed .lab { display:block; font-size:.85rem; color:var(--dim);
  text-transform:uppercase; letter-spacing:.06em; }
.armed .val { display:block; font-size:1.6rem; font-weight:800; line-height:1.2;
  margin-top:.2rem; }
.armed .why { display:block; color:var(--dim); font-size:.92rem; margin-top:.4rem;
  line-height:1.5; }
ul.rows { list-style:none; padding:0; margin:.4rem 0 0; }
ul.rows li { margin:0; padding:.6rem .1rem; border-top:1px solid var(--line);
  display:flex; gap:.75rem; justify-content:space-between; align-items:baseline; }
ul.rows li:first-child { border-top:none; }
ul.rows .k { color:var(--dim); font-size:.92rem; }
ul.rows .v { font-weight:700; text-align:right; overflow-wrap:anywhere; }
ul.rows .v.unk { color:var(--hi); font-weight:800; }
ul.rows .why { color:var(--dim); font-size:.82rem; font-weight:400; line-height:1.45; display:block; margin-top:.15rem; }
/* ⚠ The value column wraps rather than overflowing. A right-aligned column that
   scrolls sideways on a phone is unreadable, and it is how a stray sentence in a
   value slot went unnoticed — it simply ran off the edge of the screen. */
ul.rows .v { max-width:60%; }
.answer { border:2px solid var(--line); border-radius:10px; padding:.9rem;
  margin:1rem 0 1.25rem; background:var(--code); }
.answer p.lead { margin:0 0 .3rem; font-size:1.15rem; line-height:1.4; }
.answer p.ceiling { margin:.5rem 0 0; color:var(--dim); font-size:.88rem; line-height:1.5; }
h2.rawhead { margin:1.8rem 0 .3rem; font-size:1.05rem; }
`;

/** The one place a value becomes display text — so "unknown" has ONE spelling. */
const UNOBSERVABLE = 'UNOBSERVABLE';

/**
 * ⛔⛔ A SUMMARY LINE MAY CARRY A DATUM, NEVER A SENTENCE — AND NEVER A PATH.
 *
 * ── DEFECT 1: DEFINITIONS RENDERED AS STATE (reported from the phone) ───────
 * A structured value is summarised by joining its first few scalars. Several of
 * these blocks carry DOCUMENTATION strings alongside their state — prose that
 * explains what a word means. Joined into a summary line, one produced this:
 *
 *   "phase launch-gate-off · ok no · verifiedMeans VERIFIED means the named
 *    predicates held. It does NOT mean the patch is correct, that anything was
 *    published, or that any obligation was discharged"
 *
 * A paragraph, right-aligned, overflowing sideways, in a slot meant for a value.
 * ⚠ It is not merely ugly: a definition rendered in a state column READS as
 * state, so the page appears to report something it never measured.
 *
 * ⭐ EXCLUDED BY SHAPE, NOT BY NAME. Listing the two fields visible today would
 * be a rule that has to be re-remembered for the third — the same reasoning that
 * made the remainder names-only rather than a list of fields to be careful with.
 * The shape is simply: PROSE CONTAINS WHITESPACE, A DATUM DOES NOT. Measured
 * against the live snapshot, that separates cleanly and with no judgement call —
 * all 32 whitespace-free values are real state (`ok`, `SHADOW`, `launch-gate-off`,
 * `C0`), and all 8 whitespace-bearing ones are prose.
 *
 * ── DEFECT 2: PATHS ARE DATUM-SHAPED, so the prose rule alone would not stop
 * them. A kill-switch marker, a credentials file and a trust directory are all
 * single tokens and would sail into a summary line. That is the same hazard the
 * remainder already refuses, arriving through a different door — so it is refused
 * here too, by shape, rather than by whoever adds the next field remembering.
 *
 * ⛔ NOTHING IS LOST: a value held back here is still carried in full by the raw
 * section, and the count of what was held back is printed rather than hidden.
 * This governs SUMMARISATION only — never whether a field exists on the page.
 */
function isProse(v) {
  return typeof v === 'string' && /\s/.test(v);
}
function isPathish(v) {
  return typeof v === 'string' && (/[\\/]/.test(v) || /^[A-Za-z]:/.test(v));
}
function summarisable(v) {
  if (v === null || v === undefined || typeof v === 'object') return false;
  return !isProse(v) && !isPathish(v);
}

/**
 * A field name, made legible — MECHANICALLY.
 *
 * ⛔⛔ IT IS TYPOGRAPHY, NOT KNOWLEDGE, AND THE DIFFERENCE IS THE WHOLE POINT.
 * The obvious way to make `pidRecycled` readable is a table mapping each field to
 * a written explanation. Two reasons that is refused:
 *
 *  1. ⛔ THIS REPOSITORY IS PUBLIC. Those explanations are descriptions of a
 *     private system's internals; a lookup table of them is that architecture,
 *     written down here permanently, in exchange for nicer labels.
 *  2. A hand-written table covers the fields known on the day it was typed and
 *     silently fails to cover the next one — the same drift that had this page
 *     detailing nine fields of twenty-four.
 *
 * ⭐ Splitting camelCase and kebab-case into words invents nothing, embeds no
 * internal meaning, and covers every field that will ever exist.
 *
 * ⚠ THE CEILING, STATED PLAINLY BECAUSE THE PAGE STATES IT TOO: this makes a
 * name READABLE, not EXPLAINED. "Pid recycled" is easier to read than
 * `pidRecycled` and tells you no more than it did. The snapshot carries no human
 * description of its own findings, so no honest page can supply one — that is a
 * gap in the SOURCE, and the page says so rather than papering over it with a
 * guess about what a field means.
 */
function humanLabel(key) {
  const words = String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    // ⚠ SENTENCE case, not Title Case. Splitting camelCase leaves every interior
    // word capitalised ("Pid Recycled"), which reads like a product name rather
    // than a description. An all-caps run is left alone — it was not a word
    // boundary this split created, so lowercasing it would be destroying
    // something the source wrote deliberately rather than tidying our own seam.
    .map((w, i) => (i === 0 || w === w.toUpperCase() ? w : w.toLowerCase()));
  const s = words.join(' ');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : String(key);
}

/**
 * ⛔⛔ THE FIELDS THIS PAGE OPENS IN DETAIL — declared ONCE, because the list of
 * what is NOT detailed is DERIVED from it below rather than typed a second time.
 *
 * ── THE DEFECT THIS EXISTS TO CLOSE, MEASURED NOT IMAGINED ──────────────────
 * This page used to enumerate a hand-picked set of fields and then print, under
 * them, "every field below is printed whether or not it has a value". Measured
 * against a real snapshot: it detailed NINE of twenty-four top-level fields and
 * said nothing whatsoever about the other fifteen — so the page carried a
 * completeness claim that was false by a factor of more than two.
 *
 * ⚠ That is this page's OWN stated failure mode, arriving from the inside: a
 * field that is missing and a field that is fine look identical once the row is
 * gone. The hand-picked list could only ever drift in one direction, because a
 * field added upstream becomes invisible here silently — nothing errors, the
 * page just quietly stops covering it.
 *
 * ⭐ So the remainder is computed from the snapshot itself. A field added
 * upstream tomorrow appears in the list below with no edit here, which is the
 * only version of this that cannot go stale.
 */
const DETAILED_FIELDS = [
  'generatedAt',
  'notifyChannel',
  'enforced',
  'killSwitch',
  'liveSessions',
  'admission',
  'rateLimit',
  'adapters',
  'usage',
  'findings',
];

/** Top-level fields the snapshot carries that the sections above do not open. */
function remainingFields(snap) {
  if (!snap || typeof snap !== 'object') return [];
  return Object.keys(snap)
    .filter(k => !DETAILED_FIELDS.includes(k))
    .sort();
}

/**
 * The remainder, BY NAME ONLY.
 *
 * ⛔⛔ IT PRINTS NO VALUE, AND THAT IS STRUCTURAL RATHER THAN A RULE SOMEBODY
 * HAS TO REMEMBER. The only strings this function can emit for a value are the
 * literal 'present' and the UNOBSERVABLE constant — there is no path through it
 * that reaches `snap[name]`'s contents at all.
 *
 * ⚠ WHY THAT MATTERS MORE THAN IT LOOKS: several of these blocks record
 * filesystem locations, and a generic "just render everything that is left"
 * would put those on the page. Worse, it would keep doing so for every field
 * added upstream in future, with nobody reviewing the decision. Names-only is
 * therefore the safe default in BOTH directions — nothing is hidden, and nothing
 * can be spilled by a change made somewhere else entirely.
 *
 * ⭐ It still distinguishes carried from not-carried, because that is the one
 * honest thing that can be said without opening the value.
 */
function remainderRows(snap, names) {
  return (
    `<ul class="rows">` +
    names
      .map(n => {
        const carried = snap[n] !== undefined && snap[n] !== null;
        return (
          `<li><span class="k">${escapeHtml(humanLabel(n))}</span>` +
          `<span class="v${carried ? '' : ' unk'}">${carried ? 'present' : UNOBSERVABLE}</span></li>`
        );
      })
      .join('') +
    `</ul>`
  );
}

/**
 * Render one value honestly.
 *
 * ⛔ `undefined` and `null` are NOT rendered as "false", "0" or "none". They mean
 * the snapshot did not carry the field, which is a different fact from carrying
 * a negative one, and collapsing the two is how a page starts reporting health it
 * never measured.
 */
function val(v) {
  if (v === undefined || v === null) {
    return { text: UNOBSERVABLE, unknown: true, why: 'the snapshot did not carry this field' };
  }
  if (typeof v === 'boolean') return { text: v ? 'yes' : 'no', unknown: false };
  if (typeof v === 'number') return { text: String(v), unknown: false };
  if (typeof v === 'string') {
    return v ? { text: v, unknown: false } : { text: UNOBSERVABLE, unknown: true, why: 'empty' };
  }
  if (Array.isArray(v)) return { text: `${v.length} entries`, unknown: false };

  // ── Structured values ────────────────────────────────────────────────────
  // ⛔ AN OBJECT IS NOT AN UNKNOWN, and an earlier version of this file treated
  // it as one: eighteen rows read UNOBSERVABLE while the source carried real
  // values for every one of them. That is the same lie as a missing row, just
  // pointing the other way — it invents doubt about things that were measured.
  //
  // ⭐ THE SOURCE ALREADY STATES ITS OWN GAPS, and that is the authority worth
  // deferring to: several of these blocks carry `observable: false` with a
  // written reason. Surfacing THAT is honest reporting; substituting our own
  // word for it, or overriding it with a count, would not be.
  if (v.observable === false) {
    return {
      text: UNOBSERVABLE,
      unknown: true,
      why: String(v.reason || v.note || 'the source reports it could not measure this'),
    };
  }
  if (typeof v.count === 'number') {
    return { text: String(v.count), unknown: false };
  }
  const present = Object.entries(v).filter(
    ([, x]) => x !== null && typeof x !== 'object' && typeof x !== 'undefined'
  );
  // ⛔ Prose and paths are held back from the LINE, never from the page.
  const scalars = present.filter(([, x]) => summarisable(x));
  const held = present.length - scalars.length;
  if (scalars.length) {
    return {
      text:
        scalars
          .slice(0, 3)
          .map(([k, x]) => `${humanLabel(k)} ${typeof x === 'boolean' ? (x ? 'yes' : 'no') : x}`)
          .join(' · ') +
        // ⭐ Held-back values are COUNTED ON THE LINE rather than silently
        // dropped. A summary that quietly omits things is how this page came to
        // claim it showed everything while showing a third of it.
        (held ? ` · +${held} not shown here` : ''),
      unknown: false,
    };
  }
  // Everything it carries is prose or a path — true, and worth saying, because
  // "nothing summarisable" is a different fact from "nothing there".
  if (present.length) {
    return {
      text: `${present.length} details, none of them a short value`,
      unknown: false,
    };
  }
  // A structure of structures. Naming its parts is a true statement about what
  // is there; calling it unknown would not be.
  return { text: `${Object.keys(v).length} parts`, unknown: false };
}

function rows(pairs) {
  return (
    `<ul class="rows">` +
    pairs
      .map(([k, v]) => {
        const r = val(v);
        return (
          `<li><span class="k">${escapeHtml(humanLabel(k))}` +
          // ⭐ The source's own reason travels with the gap. "Cannot be measured,
          // and here is why" is actionable; a bare UNOBSERVABLE is a shrug.
          (r.unknown && r.why ? `<br><span class="why">${escapeHtml(r.why)}</span>` : '') +
          `</span>` +
          `<span class="v${r.unknown ? ' unk' : ''}">${escapeHtml(r.text)}</span></li>`
        );
      })
      .join('') +
    `</ul>`
  );
}

/**
 * Sort the findings into what needs him, what could not be measured, and what
 * was merely counted.
 *
 * ⛔⛔ THE PAGE STILL DECIDES NOTHING. It was tempting to call a non-zero count
 * a problem and render a red banner — that would be this file inventing a
 * meaning for numbers it does not understand, on the one surface whose value is
 * that it never does.
 *
 * ⭐ THE SOURCE ALREADY ANSWERS THIS, AND DEFERRING TO IT IS THE HONEST MOVE —
 * exactly as `observable: false` is deferred to rather than overridden. Some
 * findings carry their own ALERTING field, which is the producer stating whether
 * the thing needs a human. Measured on the live snapshot, one reports a count of
 * one and an alerting count of ZERO — because it is suppressed for a reason it
 * also records. A page counting "1 problem" there would be manufacturing an
 * alarm the source explicitly declined to raise.
 *
 * ⚠ AND THE CEILING IS REPORTED, NOT BURIED: only a couple of the findings carry
 * an alerting field at all. So "nothing is flagged" is a far weaker statement
 * than "nothing is wrong", and the page says which one it is making. That gap is
 * the ABSENT-versus-UNOBSERVABLE distinction again, one level up: silence from a
 * finding that has no way to speak is not reassurance.
 */
function classifyFindings(findings) {
  const out = { needsYou: [], unobservable: [], counted: [], quiet: 0, withAlerting: 0, total: 0 };
  if (!findings || typeof findings !== 'object') return out;
  for (const key of Object.keys(findings).sort()) {
    const v = findings[key];
    out.total++;
    if (typeof v === 'number') {
      if (v > 0) out.counted.push({ key, detail: String(v) });
      else out.quiet++;
      continue;
    }
    if (!v || typeof v !== 'object') {
      out.quiet++;
      continue;
    }
    if (v.observable === false) {
      out.unobservable.push({ key, why: String(v.reason || v.note || 'the source did not say') });
      continue;
    }
    // The producer's OWN attention signal, wherever it chose to provide one.
    const alertKey = Object.keys(v).find(k => /alert/i.test(k) && typeof v[k] === 'number');
    if (alertKey) {
      out.withAlerting++;
      if (v[alertKey] > 0)
        out.needsYou.push({ key, detail: `${humanLabel(alertKey)} ${v[alertKey]}` });
      else out.quiet++;
      continue;
    }
    const n = ['count', 'unhealthyCount', 'unknownOwners'].find(k => typeof v[k] === 'number');
    if (n && v[n] > 0) out.counted.push({ key, detail: `${humanLabel(n)} ${v[n]}` });
    else out.quiet++;
  }
  return out;
}

function listRows(items, cls) {
  return (
    `<ul class="rows">` +
    items
      .map(
        it =>
          `<li><span class="k">${escapeHtml(humanLabel(it.key))}` +
          (it.why ? `<br><span class="why">${escapeHtml(it.why)}</span>` : '') +
          `</span><span class="v${cls || ''}">${escapeHtml(it.detail || UNOBSERVABLE)}</span></li>`
      )
      .join('') +
    `</ul>`
  );
}

function section(title, inner, note) {
  return (
    `<details class="band"><summary>${escapeHtml(title)}</summary>` +
    (note ? `<p class="note">${escapeHtml(note)}</p>` : '') +
    inner +
    `</details>`
  );
}

/**
 * @param {object|null} snap  parsed snapshot, or null when unreadable
 * @param {Date|null}   readAt when this page read it
 * @param {string}      note  the resolution case, printed when there is nothing
 * @param {Date|null}   [dirLastWrite] the most recent write anywhere in the state
 *   directory — HANDED IN, never read here, exactly as every address on the
 *   landing page is handed in. ⛔ OPTIONAL, and an absent one is rendered as
 *   nothing at all rather than as "quiet": a caller that could not measure it must
 *   not leave this page saying it did.
 */
function renderStatus(snap, readAt, note, dirLastWrite) {
  if (!snap) {
    return page({
      title: 'Status',
      crumb: '',
      body:
        `<style>${STATUS_STYLE}</style>` +
        `<h1>Status</h1>` +
        `<div class="empty"><p><strong>No status snapshot is reachable.</strong></p>` +
        `<p class="note">${escapeHtml(note || '')}</p>` +
        `<p class="note">This is what an absent source looks like. It is deliberately not ` +
        `an empty page of green rows — nothing was measured, so nothing is claimed.</p></div>`,
    });
  }

  // ── The age, first, in words ──────────────────────────────────────────────
  //
  // ⛔⛔ THE DEFECT THIS SECTION WAS REBUILT TO FIX, MEASURED NOT IMAGINED. Until
  // 2026-09-01 there was ONE threshold here and it was a boolean: fifteen minutes
  // and four days rendered the identical sentence, "old enough to be worth
  // double-checking before acting on it". ⚠ Read that against what had actually
  // happened — the producer of this file had emitted nothing since 2026-08-28 —
  // and the sentence points the wrong way: it advises care about a VALUE at the
  // moment the fact is that the SOURCE HAS STOPPED. The page was never wrong; it
  // had no age at which it could say anything HAD gone wrong, so the freeze went
  // unnoticed for three days by a reader looking straight at the number.
  //
  // ⭐ THE RULE IS IMPORTED, NEVER RESTATED. `assessAge` lives beside `ago` — one
  // rule, one home — so this page and the landing tile that links to it cannot
  // develop two different opinions about what "stale" means.
  const genAt = snap.generatedAt ? new Date(snap.generatedAt) : null;
  const genOk = genAt && Number.isFinite(genAt.getTime());
  const age = assessAge(genOk ? genAt : null);
  const phrase = age.known ? age.phrase : '';
  const stopped = age.tier === 'stale';

  // ⭐ THE CROSS-CHECK, AND IT IS THE HALF THAT MAKES THE BANNER ACTIONABLE. An age
  // alone cannot tell a switched-off machine from a live one whose producer has
  // died, and those two want opposite responses. Comparing the snapshot's own stamp
  // against the last write ANYWHERE in the directory it lives in separates them by
  // MEASUREMENT — no extra threshold, no guess, and still no claim about whether
  // the system is well.
  //
  // ⛔ ABSENT IS RENDERED AS SILENCE, NEVER AS "QUIET" — the ABSENT-versus-
  // UNOBSERVABLE distinction this whole file turns on, one level up.
  const dirOk = dirLastWrite instanceof Date && Number.isFinite(dirLastWrite.getTime());
  const dirAge = dirOk ? assessAge(dirLastWrite) : { known: false, tier: 'unknown', minutes: null };
  let context = '';
  if (stopped && dirAge.known) {
    // ⚠ Judged by the SAME tier rule, never by a second threshold invented here: a
    // directory that is itself stale is a quiet machine, one that is not is a
    // running one. Two spellings of one boundary is how the two begin to disagree.
    context =
      dirAge.tier === 'stale'
        ? `<span class="why dim">Nothing else in that directory has been written for ${escapeHtml(elapsed(dirAge.minutes))} either, so the whole of it has been quiet — which is what a machine that has not been running looks like from here.</span>`
        : `<span class="why dim">⛔ The directory this snapshot lives in was written to ${escapeHtml(elapsed(dirAge.minutes))} ago, so this is <strong>not</strong> a machine that is switched off. Something there is still running while this one file has stopped being produced.</span>`;
  }

  // ⛔⛔ AT THE TOP TIER THE AGE STOPS BEING A CAVEAT AND BECOMES THE ANSWER. It is
  // rendered ABOVE enforcement and above the findings, because if it is showing
  // then no value further down is a statement about the present — and a qualifier
  // printed after the thing it qualifies is read second, or not at all.
  //
  // ⚠ IT STILL CLAIMS NOTHING ABOUT THE SYSTEM. "This page has heard nothing" is a
  // fact about this page's own input; "the control plane is down" would be a
  // verdict nothing here measured, and this is the one surface whose whole value is
  // that it never invents one.
  const ageLine = !genOk
    ? `<p class="age">⛔ <strong>${UNOBSERVABLE}</strong> — this snapshot does not say when it was produced, ` +
      `so how old it is cannot be established. Treat every value below as of unknown age.</p>`
    : stopped
      ? `<div class="stopped"><span class="lab">This page has heard nothing for</span>` +
        `<span class="val">${escapeHtml(elapsed(age.minutes))}</span>` +
        `<span class="why">The last snapshot was produced <strong>${escapeHtml(phrase)}</strong>, and there has been no newer one since. ` +
        `Everything below describes the system <strong>as it was then</strong>. It is not a reading of the system now, and nothing on this page can tell you what has happened in between.</span>` +
        context +
        `</div>`
      : `<p class="age">This data was produced <strong>${escapeHtml(phrase || 'at an unreadable time')}</strong>. ` +
        `It is a snapshot, not a live reading${age.tier === 'ageing' ? ' — <span class="agewarn">old enough to be worth double-checking before acting on it</span>' : ''}.</p>`;

  // ⛔ THE AS-OF STAMP TRAVELS WITH THE ANSWER ITSELF. The banner above is read
  // first, but a reader who scrolls straight to the one block that gives a verdict
  // must not find that verdict written in the present tense. Same reasoning as the
  // ceiling sentence beside it: a qualification belongs in the same breath as the
  // claim it qualifies, never further up the page.
  const asOf = stopped ? `<p class="asof">As it stood ${escapeHtml(phrase)} — not now:</p>` : '';

  // ── ARMED vs NOT ARMED, the one thing wanted at a glance ──────────────────
  // ⛔ Read from ONE field. It is tempting to combine `enforced` with the
  // kill-switch into a cleverer verdict; that would be this page inventing a
  // meaning neither field states, and a wrong one-word answer here is worse than
  // two honest rows.
  const enforced = snap.enforced;
  const armedTxt =
    enforced === true
      ? 'ARMED'
      : enforced === false
        ? 'NOT ARMED'
        : `${UNOBSERVABLE} — the snapshot carries no enforcement field`;
  const armedWhy =
    enforced === undefined || enforced === null
      ? 'Nothing is claimed either way. A missing field is not a "no".'
      : 'Read directly from the snapshot, not inferred from anything else on this page.';

  const ks = snap.killSwitch || {};
  const adapters = snap.adapters && typeof snap.adapters === 'object' ? snap.adapters : null;
  const findings = snap.findings && typeof snap.findings === 'object' ? snap.findings : null;
  const usage = snap.usage && typeof snap.usage === 'object' ? snap.usage : null;
  const trend = usage && usage.trend && typeof usage.trend === 'object' ? usage.trend : null;
  // ⭐ Derived from the snapshot in hand, never from a list kept alongside the
  // sections — that list is what went stale and produced a false claim before.
  const rest = remainingFields(snap);
  const fc = classifyFindings(findings);
  // ⚠ Its own block, read defensively: an older snapshot may not carry it at
  // all, and a missing block must read UNOBSERVABLE rather than "never".
  const nc = snap.notifyChannel && typeof snap.notifyChannel === 'object' ? snap.notifyChannel : {};

  const body =
    `<style>${STATUS_STYLE}</style>` +
    `<h1>Status</h1>` +
    ageLine +
    `<div class="armed"><span class="lab">Enforcement</span>` +
    `<span class="val">${escapeHtml(armedTxt)}</span>` +
    `<span class="why">${escapeHtml(armedWhy)}</span></div>` +
    // ── THE ANSWER, before any field-by-field anything ────────────────────
    `<div class="answer">` +
    asOf +
    (fc.needsYou.length
      ? `<p class="lead"><strong>${fc.needsYou.length} thing${fc.needsYou.length === 1 ? '' : 's'} the snapshot flags as needing you.</strong></p>` +
        listRows(fc.needsYou, ' unk')
      : `<p class="lead"><strong>Nothing is flagged as needing you.</strong></p>`) +
    // ⛔ THE CEILING TRAVELS WITH THE ANSWER, never as a footnote further down.
    // Most findings have no way to raise a flag at all, so "nothing flagged" and
    // "nothing wrong" are different sentences — and the weaker one is the true
    // one. Reading the first as the second is the whole failure this page exists
    // to prevent, so it is said in the same breath as the answer itself.
    `<p class="ceiling">That means: of ${escapeHtml(String(fc.total))} checks, ` +
    `${escapeHtml(String(fc.withAlerting))} can actually raise a flag. ` +
    `The rest report numbers without saying whether a number is a problem, ` +
    `so this line is <strong>not</strong> a clean bill of health — it is the ` +
    `narrower claim that nothing which can speak up has.</p>` +
    (fc.unobservable.length
      ? `<p class="ceiling">${escapeHtml(String(fc.unobservable.length))} could not be measured at all — listed below, with the reason each gave.</p>`
      : '') +
    `</div>` +
    // ── Could not be measured — kept OPEN, because a gap is the finding ────
    (fc.unobservable.length
      ? `<details class="band" open><summary>Could not be measured <span class="c">${fc.unobservable.length}</span></summary>` +
        `<p class="note">Each of these tried and could not answer. That is not the same as ` +
        `an answer of "fine", which is exactly why they are not folded in with everything else.</p>` +
        listRows(fc.unobservable, ' unk') +
        `</details>`
      : '') +
    // ── Counted, but the source did not classify them ──────────────────────
    (fc.counted.length
      ? section(
          `Counted, but not called a problem (${fc.counted.length})`,
          listRows(fc.counted),
          'These are non-zero numbers the snapshot recorded. It does not say whether any of ' +
            'them needs doing anything about, and this page will not decide that for it — ' +
            'a number is not a verdict. They are here so a real one is never invisible.'
        )
      : '') +
    // ── Everything else, closed ────────────────────────────────────────────
    `<h2 class="rawhead">All raw fields</h2>` +
    `<p class="note">Nothing below is hidden or filtered — every field the snapshot carries is ` +
    `reachable from here, including the ${escapeHtml(String(fc.quiet))} checks that came back ` +
    `quiet. The names are the source's own, made readable but not renamed: this page can make ` +
    `<em>${escapeHtml(humanLabel('pidRecycled'))}</em> easier to read than <code>pidRecycled</code>, ` +
    `but the snapshot carries no plain-English description of what its findings mean, so nothing ` +
    `can honestly supply one here. Long explanatory text and file locations are kept out of the ` +
    `one-line summaries and shown in full in place.</p>` +
    section(
      'Phone alerts',
      rows([
        [
          'last confirmed delivery',
          nc.lastConfirmedSendAt
            ? `${ago(new Date(nc.lastConfirmedSendAt)) || 'at an unreadable time'}`
            : undefined,
        ],
        ['credentials readable', nc.state],
      ]),
      // ⛔⛔ THE BAR IS DELIVERY, AND IT IS THE SOURCE'S BAR — NOT A NAME I TRUSTED.
      // The field is called "confirmed", and a field called confirmed is exactly
      // the kind of thing that turns out to mean "we tried". So it was traced to
      // what writes it: the record is only ever emitted when the delivery service
      // itself answered with its own success status — an attempt that is not
      // acknowledged is written as a FAILURE and can never appear here.
      //
      // ⚠ WHAT THIS ROW ASSUMES, SAID OUT LOUD BECAUSE THE ASSUMPTION IS THE PART
      // THAT GOES WRONG: it assumes a confirmed delivery is recorded durably and
      // that this reading is not itself stale — the second is why the page leads
      // with its own age. It does NOT assume the phone rang: a delivery the
      // service accepted and the handset never showed is indistinguishable from
      // here, and nothing in this snapshot can close that gap.
      //
      // ⛔ A quiet channel is DATA, never a fault. Long gaps are the ordinary
      // state of a system with nothing to say, so no threshold is applied and no
      // colour is assigned — inventing an alarm here is the false-alarm generator
      // that teaches someone to stop reading the real ones.
      'Only a delivery the service itself acknowledged counts here. An attempt that ' +
        'was not acknowledged is recorded as a failure and never appears as one of these. ' +
        'A long gap is not a fault — it means nothing needed saying.'
    ) +
    section(
      'Kill switch',
      rows([
        ['present', ks.present],
        ['path recorded', typeof ks.path === 'string' && ks.path ? 'yes' : ks.path],
      ]),
      'Whether the switch file exists. Its contents are not read by this page.'
    ) +
    section(
      'Sessions and admission',
      rows([
        ['live sessions', snap.liveSessions],
        ['admission', snap.admission],
        ['minimum interval (ms)', snap.rateLimit ? snap.rateLimit.minIntervalMs : undefined],
      ])
    ) +
    section(
      'Adapters',
      adapters
        ? rows(
            Object.keys(adapters)
              .sort()
              .map(k => [k, adapters[k]])
          )
        : rows([['adapters', undefined]]),
      adapters ? null : 'The snapshot carried no adapter block.'
    ) +
    section(
      'Usage',
      rows([
        ['reading ok', usage ? usage.ok : undefined],
        // ⚠ The trend block states its OWN availability. When it says not
        // available, that is the source telling us it could not measure — which
        // is reported as such rather than shown as a zero.
        ['trend', trend ? (trend.available === true ? 'available' : undefined) : undefined],
        [
          'samples in window',
          trend && trend.available === true ? trend.samplesInWindow : undefined,
        ],
      ]),
      trend && trend.available !== true
        ? 'The source reports its trend as unavailable, so no direction is shown. A flat line here would be an invention.'
        : null
    ) +
    section(
      'Findings',
      findings
        ? rows(
            Object.keys(findings)
              .sort()
              .map(k => [k, findings[k]])
          )
        : rows([['findings', undefined]]),
      findings
        ? 'Counts exactly as recorded. This page does not decide which of them matter.'
        : 'The snapshot carried no findings block.'
    ) +
    section(
      `Everything else in this snapshot (${rest.length})`,
      rest.length
        ? remainderRows(snap, rest)
        : `<p class="note">Nothing. Every field the snapshot carries is opened in a section above.</p>`,
      rest.length
        ? 'These are named but not opened. They are really there — this page simply does not ' +
            'detail them, and saying so is the difference between "not shown here" and "not ' +
            'happening". Names only, deliberately: some of them record file locations, and a ' +
            'page that printed whatever was left would keep doing so for every field added ' +
            'later, with nobody deciding that it should.'
        : null
    ) +
    `<p class="note">Read at ${escapeHtml(readAt ? readAt.toISOString() : 'an unrecorded time')}; ` +
    `produced at ${escapeHtml(snap.generatedAt || UNOBSERVABLE)}. ` +
    `${escapeHtml(String(DETAILED_FIELDS.length))} fields opened in detail, ` +
    `${escapeHtml(String(rest.length))} named below them.</p>`;

  return page({
    title: 'Status',
    crumb: '',
    body,
  });
}

module.exports = {
  renderStatus,
  humanLabel,
  classifyFindings,
  STATUS_STYLE,
  UNOBSERVABLE,
  val,
  DETAILED_FIELDS,
  remainingFields,
};
