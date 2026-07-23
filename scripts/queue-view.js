#!/usr/bin/env node
/**
 * scripts/queue-view.js — the PRIVATE phone-readable QUEUE view (queue item L).
 *
 * The workflow review flagged that a ~2,700-line QUEUE.md is not actually
 * "phone-readable" — L is the fix. This generator parses QUEUE.md and emits a
 * single self-contained, offline, phone-first HTML page the owner can steer from:
 * a sticky status filter, collapsible items (tap to expand full reasoning), a
 * section jump-nav, and a "what's next" band surfacing the active/ready work.
 *
 * ── ONE SOURCE (L's ruling). QUEUE.md stays the single source of truth; this
 *    only RENDERS it, UNFILTERED / in full — the PRIVATE owner view. The
 *    player-facing opt-in view is deliberately NOT built here: L defers it until
 *    after the museum publication work (P2), because it needs the same
 *    name-substitution + fail-closed guard machinery P2 builds (Protocol 22).
 *
 * ── Generation over maintenance (the library/ discipline). The GENERATOR is
 *    tracked; the generated HTML is gitignored and regenerated on demand. Output
 *    goes to queue-view/ (gitignored), which is NOT served/precached — no cache
 *    concern.
 *
 * ── Deterministic. Same QUEUE.md → byte-identical HTML (no timestamps, no
 *    randomness; the source is fingerprinted with a content hash for provenance).
 *    The pure parser (parseQueue) is unit-tested in Suite 246.
 *
 * Constraints honored: no build step, no framework, vanilla inline HTML/CSS/JS
 * (the same constraints binding the app itself).
 *
 * Usage:  npm run queue-view   →   queue-view/queue-view.html
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

// The five real status glyphs (⭐/⛔/★ are emphasis, never statuses). Order is
// the display order in the filter bar; `key` drives the CSS/JS filter classes.
const STATUSES = [
  { key: 'ready', glyph: '⏭️', label: 'Ready' },
  { key: 'active', glyph: '🔄', label: 'Active' },
  { key: 'blocked', glyph: '⚠️', label: 'Attention' },
  { key: 'todo', glyph: '⬜', label: 'To-do' },
  { key: 'done', glyph: '✅', label: 'Done' },
];
// "What's next" surfaces the work actually in motion or ready to start.
const NEXT_STATUSES = new Set(['active', 'ready']);
// Shown by default; 'done' is hidden by default (surface the live work first).
const DEFAULT_ON = new Set(['ready', 'active', 'blocked', 'todo']);

// The first status glyph to appear in a heading wins (it sits right after the
// item ID). Returns the status key, or 'none'.
function detectStatus(text) {
  let best = null;
  let bestIdx = Infinity;
  for (const s of STATUSES) {
    const i = text.indexOf(s.glyph);
    if (i >= 0 && i < bestIdx) {
      bestIdx = i;
      best = s.key;
    }
  }
  return best || 'none';
}

// Parse a heading's content into {id, status, title}. The ID is a leading token
// like "A3.", "R10.", "P1.", "L.", "C1." (letters then optional digits, then a
// dot). Not every heading has one (e.g. "WASTELAND UPLINK") — id is then null.
function parseHeading(text) {
  const idM = text.match(/^([A-Za-z]+[0-9]*)\.\s+/);
  let id = null;
  let rest = text;
  if (idM) {
    id = idM[1];
    rest = text.slice(idM[0].length);
  }
  const status = detectStatus(text);
  // Strip a leading status/emphasis glyph so the title reads cleanly.
  const title = rest.replace(/^\s*(✅|🔄|⏭️|⚠️|⬜|⭐)\s*/, '').trim() || rest.trim();
  return { id, status, title };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[`*_[\]()#]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Strip inline markdown for a plain DISPLAY label (headings, nav options, item
// titles) so a heading that contains a link/code/bold doesn't show raw syntax.
function titleText(s) {
  return String(s)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/`+/g, '') // code ticks
    .replace(/\*\*/g, '') // bold markers
    .replace(/(^|\s)_([^_]+)_(?=\s|$)/g, '$1$2'); // simple italic
}

/**
 * Parse QUEUE.md into a flat, ordered list of blocks:
 *   { type:'section', level:1|2, id, status, title, anchor, body:[lines] }
 *   { type:'item',    level:3,   id, status, title, anchor, body:[lines] }
 * plus the H1 document title. Body is the raw markdown lines until the next
 * heading (rendered lazily by renderHtml → mdToHtml).
 */
function parseQueue(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let title = 'Build Queue';
  const usedAnchors = new Set();
  const anchorFor = base => {
    let a = base || 'x';
    let n = 2;
    while (usedAnchors.has(a)) a = `${base}-${n++}`;
    usedAnchors.add(a);
    return a;
  };

  let cur = null; // current block collecting body lines
  const flush = () => {
    if (cur) blocks.push(cur);
    cur = null;
  };

  for (const line of lines) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const content = h[2].trim();
      if (level === 1 && title === 'Build Queue' && blocks.length === 0 && !cur) {
        // The very first H1 is the document title, not a section.
        title = content.replace(/^\s*(✅|🔄|⏭️|⚠️|⬜|⭐)\s*/, '').trim() || content;
        continue;
      }
      flush();
      const parsed = parseHeading(content);
      const type = level === 3 ? 'item' : 'section';
      const anchorBase = parsed.id
        ? 'id-' + slugify(parsed.id)
        : (type === 'item' ? 'item-' : 'sec-') + slugify(parsed.title);
      cur = {
        type,
        level,
        id: parsed.id,
        status: parsed.status,
        title: parsed.title,
        anchor: anchorFor(anchorBase),
        body: [],
      };
      continue;
    }
    if (cur) cur.body.push(line);
    // lines before any heading (there are none in practice) are dropped
  }
  flush();
  return { title, blocks };
}

// ── Minimal, safe markdown → HTML for QUEUE.md's actual constructs ────────────
// (bold, italic, inline code, links, bullet/numbered lists, blockquotes,
// sub-headings). No tables or HTML comments exist in the source. Everything is
// HTML-escaped first; code spans are extracted to placeholders so no inline rule
// touches their contents (and nothing user-authored can inject markup).
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(raw) {
  const codes = [];
  const stash = c => {
    codes.push(escapeHtml(c));
    return `@@C${codes.length - 1}@@`;
  };
  // DOUBLE-backtick code spans FIRST — QUEUE.md uses double-backtick spans to
  // show inline code that itself contains backticks; matching single-backticks
  // first would mis-pair and corrupt everything after it (swallowing later bold
  // into a broken code span). Trim one CommonMark padding space. THEN single.
  let s = raw.replace(/``\s?([\s\S]+?)\s?``/g, (_m, c) => stash(c));
  s = s.replace(/`([^`]+)`/g, (_m, c) => stash(c));
  s = escapeHtml(s);
  // links [text](url) — url is attribute-escaped; text keeps its (already escaped) content
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const href = u.replace(/"/g, '%22');
    return `<a href="${href}">${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic: conservative boundaries so identifiers/paths with _ aren't mangled
  s = s.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
  s = s.replace(/@@C(\d+)@@/g, (_m, i) => `<code>${codes[+i]}</code>`);
  return s;
}
function mdToHtml(bodyLines) {
  const out = [];
  let i = 0;
  const L = bodyLines;
  const isBlank = s => /^\s*$/.test(s);
  while (i < L.length) {
    const line = L[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    // sub-heading (#### and deeper) inside a body
    const sh = /^(#{4,6})\s+(.*)$/.exec(line);
    if (sh) {
      out.push(`<p class="subh">${inline(sh[2].trim())}</p>`);
      i++;
      continue;
    }
    // blockquote — accumulate ALL the quote lines and inline() ONCE (joined by
    // newlines), so a bold/code span that wraps across `>` lines is never split
    // (splitting it leaks a raw `**`); the newlines become <br> after inlining.
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < L.length && /^\s*>/.test(L[i])) {
        buf.push(L[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join('\n')).replace(/\n/g, '<br>')}</blockquote>`);
      continue;
    }
    // unordered list (with one level of nesting by indentation)
    if (/^\s*[-*]\s+/.test(line)) {
      out.push(renderList(L, i, 'ul'));
      i = renderList.lastIndex;
      continue;
    }
    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      out.push(renderList(L, i, 'ol'));
      i = renderList.lastIndex;
      continue;
    }
    // paragraph: gather consecutive plain lines
    const buf = [];
    while (i < L.length && !isBlank(L[i]) && !isSpecial(L[i])) {
      buf.push(L[i].trim());
      i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}
function isSpecial(s) {
  return /^\s*[-*]\s+/.test(s) || /^\s*\d+\.\s+/.test(s) || /^\s*>/.test(s) || /^#{1,6}\s+/.test(s);
}
// Render a list starting at index `start`; sets renderList.lastIndex to the line
// after the list. Handles one nesting level via leading-space depth. Each list
// item's full text (including WRAPPED continuation lines) is accumulated BEFORE
// inline() runs, so a bold/code/link span that wraps across lines is never split
// (splitting it would leak a raw `**` — the exact bug this shape prevents).
function renderList(L, start, tag) {
  const itemRe = tag === 'ul' ? /^(\s*)[-*]\s+(.*)$/ : /^(\s*)\d+\.\s+(.*)$/;
  const anyItemRe = /^(\s*)(?:[-*]|\d+\.)\s+/;
  const baseIndent = (L[start].match(/^(\s*)/) || ['', ''])[1].length;
  let i = start;
  const lis = []; // { raw:string, nested:string }
  let cur = null;
  const flush = () => {
    if (cur) {
      lis.push(cur);
      cur = null;
    }
  };
  while (i < L.length) {
    const line = L[i];
    if (/^\s*$/.test(line)) break; // a blank line ends the list
    const m = itemRe.exec(line);
    const any = anyItemRe.exec(line);
    if (m && m[1].length === baseIndent) {
      flush();
      cur = { raw: m[2], nested: '' };
      i++;
      continue;
    }
    if (any && any[1].length > baseIndent) {
      // a nested list belonging to the current item
      if (!cur) cur = { raw: '', nested: '' };
      const subTag = /^\s*\d+\.\s+/.test(line) ? 'ol' : 'ul';
      cur.nested += renderList(L, i, subTag);
      i = renderList.lastIndex;
      continue;
    }
    if (/^\s+\S/.test(line) && cur) {
      // a wrapped continuation line of the current item
      cur.raw += ' ' + line.trim();
      i++;
      continue;
    }
    break; // dedent or non-list line ends the list
  }
  flush();
  renderList.lastIndex = i;
  return (
    `<${tag}>` + lis.map(li => `<li>${inline(li.raw)}${li.nested}</li>`).join('') + `</${tag}>`
  );
}
renderList.lastIndex = 0;

function statusMeta(key) {
  return STATUSES.find(s => s.key === key) || null;
}

function renderHtml(model, sourceHash) {
  const { title, blocks } = model;

  // "What's next" — active/ready items, in document order.
  const nextItems = blocks.filter(b => b.type === 'item' && NEXT_STATUSES.has(b.status));

  const filterChips = STATUSES.map(
    s =>
      `<button class="chip" data-status="${s.key}" aria-pressed="${DEFAULT_ON.has(s.key)}">` +
      `<span class="g">${s.glyph}</span>${s.label}</button>`
  ).join('');

  const navOptions = blocks
    .filter(b => b.type === 'section')
    .map(b => `<option value="${b.anchor}">${escapeHtml(titleText(b.title)).slice(0, 60)}</option>`)
    .join('');

  const nextHtml = nextItems.length
    ? `<section class="whatsnext"><h2>▸ What's next</h2><ul>${nextItems
        .map(b => {
          const m = statusMeta(b.status);
          return `<li><a href="#${b.anchor}" data-jump="${b.anchor}"><span class="g">${m ? m.glyph : ''}</span>${b.id ? `<span class="idb">${escapeHtml(b.id)}</span>` : ''} ${escapeHtml(titleText(b.title))}</a></li>`;
        })
        .join('')}</ul></section>`
    : '';

  // Body: sections wrap their following items so a section with no visible items
  // can be hidden by the filter. Pure-intro sections (no items) stay visible.
  const bodyParts = [];
  let openSection = false;
  const closeSection = () => {
    if (openSection) {
      bodyParts.push('</div></section>');
      openSection = false;
    }
  };
  for (const b of blocks) {
    if (b.type === 'section') {
      closeSection();
      const m = statusMeta(b.status);
      const raw = b.body.join('\n').trim();
      // Long section prose is collapsed behind a "context" toggle so the page
      // stays scannable (headings + item cards) on a phone; short intros (a
      // one-line bucket note) render inline.
      let introBlock = '';
      if (raw) {
        const html = mdToHtml(b.body);
        introBlock =
          raw.length > 300
            ? `<details class="ctx"><summary>▸ context</summary><div class="sec-intro">${html}</div></details>`
            : `<div class="sec-intro">${html}</div>`;
      }
      bodyParts.push(
        `<section class="sec sec-l${b.level}" id="${b.anchor}" data-section="1">` +
          `<h${b.level === 1 ? 2 : 3} class="sec-h">${m ? `<span class="g">${m.glyph}</span>` : ''}${escapeHtml(titleText(b.title))}</h${b.level === 1 ? 2 : 3}>` +
          introBlock +
          `<div class="sec-items">`
      );
      openSection = true;
    } else {
      const m = statusMeta(b.status);
      const summary =
        `<summary data-status="${b.status}">` +
        `${b.id ? `<span class="idb">${escapeHtml(b.id)}</span>` : ''}` +
        `<span class="g">${m ? m.glyph : ''}</span>` +
        `<span class="it-title">${escapeHtml(titleText(b.title))}</span></summary>`;
      const card =
        `<details class="item" data-status="${b.status}" id="${b.anchor}">` +
        summary +
        `<div class="it-body">${mdToHtml(b.body)}</div></details>`;
      if (!openSection) {
        // item with no preceding section — wrap defensively
        bodyParts.push('<section class="sec" data-section="1"><div class="sec-items">');
        openSection = true;
      }
      bodyParts.push(card);
    }
  }
  closeSection();

  const defaultBodyClass = [...DEFAULT_ON].map(k => 'show-' + k).join(' ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark light">
<title>${escapeHtml(title)} — private view</title>
<style>
:root{
  --bg:#0c0f0d; --bg2:#121613; --card:#151b17; --card2:#1a221c;
  --ink:#d7e2da; --dim:#8fa295; --line:#26302a; --acc:#43e08a; --acc2:#7ad6ff;
  --ready:#7ad6ff; --active:#f5c451; --blocked:#ff8b6b; --todo:#9aa7a0; --done:#4fb477;
}
*{box-sizing:border-box}
html,body{margin:0}
body{
  background:var(--bg); color:var(--ink);
  font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;
  -webkit-text-size-adjust:100%; padding-bottom:40vh;
}
a{color:var(--acc2); text-decoration:none}
a:active{opacity:.6}
code{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; font-size:.88em;
  background:#0a0d0b; border:1px solid var(--line); border-radius:4px; padding:0 4px; color:#bfeecb; word-break:break-word}
.topbar{position:sticky; top:0; z-index:20; background:rgba(10,13,11,.94);
  backdrop-filter:blur(8px); border-bottom:1px solid var(--line); padding:8px 10px 6px}
.title{font-weight:700; font-size:15px; letter-spacing:.02em; display:flex; gap:8px; align-items:baseline; flex-wrap:wrap}
.title .hash{color:var(--dim); font-weight:400; font-size:11px; font-family:ui-monospace,monospace}
.filters{display:flex; gap:6px; overflow-x:auto; padding:8px 0 2px; -webkit-overflow-scrolling:touch}
.chip{flex:0 0 auto; min-height:34px; display:inline-flex; align-items:center; gap:5px;
  background:var(--card); color:var(--dim); border:1px solid var(--line); border-radius:999px;
  padding:4px 11px; font-size:12.5px; font-weight:600; cursor:pointer}
.chip .g{font-size:13px}
.chip[aria-pressed="true"]{color:var(--ink); border-color:var(--acc); background:#17241c}
.chip[aria-pressed="false"]{opacity:.5; text-decoration:line-through}
.jump{width:100%; margin-top:8px; min-height:38px; background:var(--card); color:var(--ink);
  border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-size:13px}
main{padding:10px}
.whatsnext{background:linear-gradient(180deg,#13251b,#101613); border:1px solid #1f5138;
  border-radius:12px; padding:10px 12px; margin:4px 0 14px}
.whatsnext h2{margin:0 0 6px; font-size:13px; color:var(--acc); letter-spacing:.04em; text-transform:uppercase}
.whatsnext ul{margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:4px}
.whatsnext a{display:flex; gap:7px; align-items:baseline; color:var(--ink); padding:5px 4px; border-radius:6px; font-size:14px}
.whatsnext a:active{background:#17241c}
.sec{margin:0 0 6px}
.sec-h{font-size:13px; letter-spacing:.04em; text-transform:uppercase; color:var(--dim);
  border-bottom:1px solid var(--line); padding:14px 0 5px; margin:6px 0 8px; display:flex; gap:7px; align-items:center}
.sec-l1>.sec-h{color:var(--acc); font-size:14px}
.sec-intro{color:var(--dim); font-size:13.5px; margin:0 0 10px}
.sec-intro p{margin:.4em 0}
.ctx{margin:0 0 10px}
.ctx>summary{list-style:none; cursor:pointer; color:var(--acc2); font-size:12px; font-weight:600;
  letter-spacing:.03em; padding:5px 0; min-height:30px; user-select:none}
.ctx>summary::-webkit-details-marker{display:none}
.ctx:not([open])>.sec-intro{display:none}
.ctx[open]>summary{color:var(--dim)}
.item{background:var(--card); border:1px solid var(--line); border-radius:11px; margin:0 0 8px; overflow:hidden}
.item[open]{border-color:#33443a; background:var(--card2)}
summary{list-style:none; cursor:pointer; display:flex; gap:8px; align-items:center;
  padding:11px 12px; min-height:46px; user-select:none}
summary::-webkit-details-marker{display:none}
summary:active{background:#17201a}
.idb{flex:0 0 auto; font-family:ui-monospace,monospace; font-weight:700; font-size:12px;
  background:#0a0d0b; border:1px solid var(--acc); color:var(--acc); border-radius:6px; padding:2px 7px; letter-spacing:.03em}
.g{flex:0 0 auto; font-size:15px; line-height:1}
.it-title{font-weight:600; font-size:14px; line-height:1.35}
.item[open] .it-title{color:#fff}
.it-body{padding:2px 13px 13px; font-size:13.5px; color:var(--ink); border-top:1px solid var(--line)}
/* Collapse the body explicitly when the item is closed — do not rely on UA
   details styling alone (some render paths keep ::details-content laid out).
   This is what makes "collapsed by default, tap to expand" actually hold. */
.item:not([open]) .it-body{display:none}
.it-body p{margin:.55em 0}
.it-body ul,.it-body ol{margin:.4em 0; padding-left:20px}
.it-body li{margin:.3em 0}
.it-body blockquote{margin:.5em 0; padding:.3em 0 .3em 11px; border-left:2px solid var(--line); color:var(--dim)}
.it-body .subh{font-weight:700; color:#cfe; margin:.7em 0 .2em}
.it-body strong{color:#fff}
/* status accents on the ID badge / glyph */
[data-status="ready"] .idb{border-color:var(--ready); color:var(--ready)}
[data-status="active"] .idb{border-color:var(--active); color:var(--active)}
[data-status="blocked"] .idb{border-color:var(--blocked); color:var(--blocked)}
[data-status="todo"] .idb{border-color:var(--todo); color:var(--todo)}
[data-status="done"] .idb{border-color:var(--done); color:var(--done); opacity:.85}
/* filter: hide a status unless its body class is present */
.item[data-status="ready"],.item[data-status="active"],.item[data-status="blocked"],
.item[data-status="todo"],.item[data-status="done"],.item[data-status="none"]{display:none}
body.show-ready .item[data-status="ready"]{display:block}
body.show-active .item[data-status="active"]{display:block}
body.show-blocked .item[data-status="blocked"]{display:block}
body.show-todo .item[data-status="todo"]{display:block}
body.show-done .item[data-status="done"]{display:block}
.item[data-status="none"]{display:block} /* un-tagged items always show */
.sec.is-empty{display:none}
@media (prefers-color-scheme:light){
  :root{--bg:#f4f1e8; --bg2:#fff; --card:#fffdf7; --card2:#fbf7ec; --ink:#22281f;
    --dim:#5d6b57; --line:#d9d2bf; --acc:#1f7a45; --acc2:#0b6a8f}
  code{background:#efeadd; color:#245}
  .item[open]{background:#fffdf7}
}
</style>
</head>
<body class="${defaultBodyClass}">
<div class="topbar">
  <div class="title">${escapeHtml(title)} <span class="hash">src ${sourceHash}</span></div>
  <div class="filters" role="group" aria-label="Filter by status">${filterChips}</div>
  <select class="jump" aria-label="Jump to section"><option value="">Jump to section…</option>${navOptions}</select>
</div>
<main>
${nextHtml}
${bodyParts.join('\n')}
</main>
<script>
(function(){
  var body=document.body;
  function recomputeEmpty(){
    document.querySelectorAll('section.sec[data-section]').forEach(function(sec){
      var itemsBox=sec.querySelector('.sec-items');
      if(!itemsBox) return; // pure-intro section — never hidden
      var vis=Array.prototype.some.call(itemsBox.querySelectorAll('.item'),function(it){
        return it.offsetParent!==null;
      });
      var hasItems=itemsBox.querySelector('.item');
      sec.classList.toggle('is-empty', !!hasItems && !vis);
    });
  }
  document.querySelectorAll('.chip').forEach(function(chip){
    chip.addEventListener('click',function(){
      var on=chip.getAttribute('aria-pressed')==='true';
      chip.setAttribute('aria-pressed', on?'false':'true');
      body.classList.toggle('show-'+chip.dataset.status, !on);
      recomputeEmpty();
    });
  });
  var jump=document.querySelector('.jump');
  if(jump) jump.addEventListener('change',function(){
    var id=jump.value; if(!id) return;
    var el=document.getElementById(id);
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    jump.value='';
  });
  // "What's next" links open the target item and scroll to it.
  document.querySelectorAll('[data-jump]').forEach(function(a){
    a.addEventListener('click',function(e){
      var el=document.getElementById(a.dataset.jump);
      if(el){ e.preventDefault(); if(el.tagName==='DETAILS') el.open=true;
        el.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });
  recomputeEmpty();
})();
</script>
</body>
</html>
`;
}

module.exports = {
  parseQueue,
  renderHtml,
  detectStatus,
  parseHeading,
  slugify,
  titleText,
  mdToHtml,
  STATUSES,
};

// ── CLI (only when run directly) ──────────────────────────────────────────────
if (require.main === module) {
  const src = fs.readFileSync(path.join(ROOT, 'QUEUE.md'), 'utf8');
  const hash = crypto.createHash('sha1').update(src).digest('hex').slice(0, 8);
  const model = parseQueue(src);
  const html = renderHtml(model, hash);
  const outDir = path.join(ROOT, 'queue-view');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'queue-view.html');
  fs.writeFileSync(outPath, html, 'utf8');
  const items = model.blocks.filter(b => b.type === 'item').length;
  const sections = model.blocks.filter(b => b.type === 'section').length;
  console.log(
    `[queue-view] Wrote ${path.relative(ROOT, outPath)} — ${sections} sections, ${items} items (src ${hash}).`
  );
}
