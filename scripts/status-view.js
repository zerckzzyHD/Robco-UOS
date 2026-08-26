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
const { ago } = require('./home-view.js');

const STATUS_STYLE = `
p.age { font-size:1.05rem; line-height:1.5; margin:.8rem 0 0; }
p.age strong { font-size:1.15rem; }
p.agewarn { color:var(--hi); font-weight:700; }
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
`;

/** The one place a value becomes display text — so "unknown" has ONE spelling. */
const UNOBSERVABLE = 'UNOBSERVABLE';

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
  const scalars = Object.entries(v).filter(
    ([, x]) => x !== null && typeof x !== 'object' && typeof x !== 'undefined'
  );
  if (scalars.length) {
    return {
      text: scalars
        .slice(0, 3)
        .map(([k, x]) => `${k} ${typeof x === 'boolean' ? (x ? 'yes' : 'no') : x}`)
        .join(' · '),
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
          `<li><span class="k">${escapeHtml(k)}` +
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
 */
function renderStatus(snap, readAt, note) {
  if (!snap) {
    return page({
      title: 'Status',
      crumb: '',
      nav: '<a href="/home">&#8592; Home</a>',
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
  const genAt = snap.generatedAt ? new Date(snap.generatedAt) : null;
  const genOk = genAt && Number.isFinite(genAt.getTime());
  const phrase = genOk ? ago(genAt) : '';
  const ageMin = genOk ? Math.floor((Date.now() - genAt.getTime()) / 60000) : null;
  // ⚠ The threshold is a DISPLAY emphasis, not a verdict about the system. It
  // says the reader should be more careful, never that anything is wrong.
  const stale = ageMin !== null && ageMin >= 15;
  const ageLine = genOk
    ? `<p class="age">This data was produced <strong>${escapeHtml(phrase || 'at an unreadable time')}</strong>. ` +
      `It is a snapshot, not a live reading${stale ? ' — <span class="agewarn">old enough to be worth double-checking before acting on it</span>' : ''}.</p>`
    : `<p class="age">⛔ <strong>${UNOBSERVABLE}</strong> — this snapshot does not say when it was produced, ` +
      `so how old it is cannot be established. Treat every value below as of unknown age.</p>`;

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

  const body =
    `<style>${STATUS_STYLE}</style>` +
    `<h1>Status</h1>` +
    ageLine +
    `<div class="armed"><span class="lab">Enforcement</span>` +
    `<span class="val">${escapeHtml(armedTxt)}</span>` +
    `<span class="why">${escapeHtml(armedWhy)}</span></div>` +
    `<p class="note">Every field below is printed whether or not it has a value. ` +
    `A row reading ${UNOBSERVABLE} means the snapshot did not carry it — which is not the ` +
    `same as it being fine, and is why the row is still here.</p>` +
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
    `<p class="note">Read at ${escapeHtml(readAt ? readAt.toISOString() : 'an unrecorded time')}; ` +
    `produced at ${escapeHtml(snap.generatedAt || UNOBSERVABLE)}.</p>`;

  return page({
    title: 'Status',
    crumb: '',
    nav: '<a href="/home">&#8592; Home</a>',
    body,
  });
}

module.exports = { renderStatus, STATUS_STYLE, UNOBSERVABLE, val };
