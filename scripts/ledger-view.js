#!/usr/bin/env node
/**
 * scripts/ledger-view.js — a read-only window onto the append-only logs.
 *
 * ── ⛔⛔ IT IS A WINDOW, AND IT SAYS SO EVERYWHERE ──────────────────────────
 * Measured before this was designed: the log set is very large, and single files
 * run to tens of megabytes. Reading one whole file per request would allocate that
 * much on a personal machine that is also serving the app — one refresh could take
 * the server down. So this shows only the END of one file and states, on the page,
 * that it is doing so.
 *
 * ⚠ That statement is not politeness. A tail rendered without saying it is a tail
 * reads exactly like a complete file, and "the log contains no errors" is a very
 * different claim from "the end of the log contains no errors". The second is true and
 * useful; the first would be fabricated by omission.
 *
 * ── ⛔ READ-ONLY. These logs are append-only and hash-chained: each record binds
 *    to the one before it. A write from a viewer would not just corrupt a file,
 *    it would break every earlier record's verifiability. Nothing here opens a
 *    file for writing, and the reader it uses has no write capability to reach.
 *
 * ⛔ It also never reorders or de-duplicates. The order IS the evidence.
 */
'use strict';

const { page, escapeHtml } = require('./report-view.js');
const { ago } = require('./home-view.js');

const LEDGER_STYLE = `
ul.logs { list-style:none; padding:0; margin:.4rem 0 0; }
ul.logs li { margin:0; border-top:1px solid var(--line); }
ul.logs li:first-child { border-top:none; }
ul.logs a { display:flex; justify-content:space-between; gap:.75rem;
  align-items:baseline; padding:.85rem .1rem; min-height:44px;
  text-decoration:none; }
ul.logs .n { font-weight:700; overflow-wrap:anywhere; }
ul.logs .s { color:var(--dim); font-size:.9rem; white-space:nowrap; }
p.window { border:1px solid var(--hi); border-radius:8px; padding:.7rem .8rem;
  margin:1rem 0; color:var(--fg); font-size:.95rem; line-height:1.55; }
ol.recs { list-style:none; padding:0; margin:.5rem 0 0; counter-reset:r; }
ol.recs li { margin:0; padding:.6rem .1rem; border-top:1px solid var(--line);
  font-size:.9rem; line-height:1.5; overflow-wrap:anywhere; }
ol.recs li:first-child { border-top:none; }
ol.recs .t { color:var(--dim); }
ol.recs .k { font-weight:700; }
ol.recs pre { margin:.35rem 0 0; font-size:.82rem; }
`;

function mb(bytes) {
  if (!Number.isFinite(bytes)) return 'unknown size';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

/** The index: every log, newest first, with its size. Nothing is opened. */
function renderLedgerIndex(logs, note) {
  const total = logs.reduce((a, l) => a + (l.size || 0), 0);
  const body =
    `<style>${LEDGER_STYLE}</style>` +
    `<h1>Activity log</h1>` +
    (logs.length
      ? `<p class="note">${logs.length} files, ${escapeHtml(mb(total))} in total. ` +
        `Append-only and chained — this view never writes, trims or reorders them.</p>` +
        `<p class="window">⛔ Opening one shows only the <strong>end</strong> of it, not the whole file. ` +
        `The largest of these is far too big to load on a phone, and loading it would ` +
        `also be the fastest way to take this server down.</p>` +
        `<ul class="logs">${logs
          .map(
            l =>
              `<li><a href="/ledger/${encodeURIComponent(l.name)}">` +
              `<span class="n">${escapeHtml(l.name)}</span>` +
              `<span class="s">${escapeHtml(mb(l.size))}${l.mtime ? ' · ' + escapeHtml(ago(l.mtime) || '') : ''}</span>` +
              `</a></li>`
          )
          .join('')}</ul>`
      : `<div class="empty"><p><strong>No logs are reachable.</strong></p>` +
        `<p class="note">${escapeHtml(note || '')}</p></div>`);
  return page({ title: 'Activity log', crumb: '', body });
}

/**
 * One record, rendered without interpreting it.
 *
 * ⚠ A line that does not parse is shown AS THE RAW LINE rather than skipped. A
 * skipped record is an invisible gap in something whose whole value is that it
 * has no gaps — and an unparsable record is itself a finding worth seeing.
 */
function record(line) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    obj = null;
  }
  if (!obj || typeof obj !== 'object') {
    return (
      `<li><span class="k">⚠ unparsable record</span>` +
      `<pre><code>${escapeHtml(line.slice(0, 400))}</code></pre></li>`
    );
  }
  const when = obj.at || obj.t || obj.time || obj.ts || null;
  const kind = obj.type || obj.event || obj.kind || '(no type field)';
  const rest = { ...obj };
  delete rest.at;
  delete rest.t;
  delete rest.time;
  delete rest.ts;
  delete rest.type;
  delete rest.event;
  delete rest.kind;
  const detail = JSON.stringify(rest);
  return (
    `<li><span class="k">${escapeHtml(String(kind))}</span>` +
    (when ? ` <span class="t">${escapeHtml(String(when))}</span>` : '') +
    (detail && detail !== '{}'
      ? `<pre><code>${escapeHtml(detail.slice(0, 600))}${detail.length > 600 ? ' …' : ''}</code></pre>`
      : '') +
    `</li>`
  );
}

/** One log's tail. `tail` is `{name,size,fromOffset,lines,truncated}` or null. */
function renderLedgerTail(tail, note) {
  if (!tail) {
    return page({
      title: 'Activity log',
      crumb: '',
      nav: '<a href="/ledger">&#8592; All logs</a>',
      body:
        `<style>${LEDGER_STYLE}</style><h1>Not found</h1>` +
        `<div class="empty"><p>No log by that name.</p>` +
        `<p class="note">${escapeHtml(note || '')}</p></div>`,
    });
  }
  const shown = tail.lines.length;
  const body =
    `<style>${LEDGER_STYLE}</style>` +
    `<h1>${escapeHtml(tail.name)}</h1>` +
    `<p class="window">` +
    (tail.truncated
      ? `⛔ <strong>This is the end of the file, not the file.</strong> ` +
        `Showing the last ${escapeHtml(mb(tail.size - tail.fromOffset))} of ${escapeHtml(mb(tail.size))} — ` +
        `${shown} records. Everything before this point is real and is not shown here. ` +
        `The first partial record in the window was discarded, so what you see parses.`
      : `This file is small enough to show in full: ${escapeHtml(mb(tail.size))}, ${shown} records.`) +
    `</p>` +
    (shown
      ? `<details class="band"><summary>Records <span class="c">${shown}</span></summary>` +
        `<p class="note">Newest last, exactly as written. Nothing here is reordered or de-duplicated — the order is the evidence.</p>` +
        `<ol class="recs">${tail.lines.map(record).join('')}</ol></details>`
      : `<p class="note">The window contained no complete records. That is not the same as the file being empty — ` +
        `it can also mean one record is larger than the window.</p>`);
  return page({
    title: tail.name,
    crumb: tail.name,
    nav: '<a href="/ledger">&#8592; All logs</a>',
    body,
  });
}

module.exports = { renderLedgerIndex, renderLedgerTail, LEDGER_STYLE, mb, record };
