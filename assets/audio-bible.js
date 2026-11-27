/* Audio Bible renderer + player (Batch 505).
   Availability law: a chapter/book renders as playable or downloadable ONLY when its unit
   is seated in UU_AUDIO_BIBLE.media / bookMedia with an MP3 URL (PUBLISHED units only).
   Everything else renders as plain text — never a dead control, never a placeholder. */
(function () {
  var D = window.UU_AUDIO_BIBLE;
  if (!D) return;

  var css = '.ab-track{margin:26px 0}'
    + '.ab-track h2{font-family:Georgia,serif;color:#303C4B;font-size:1.45rem;border-bottom:3px solid #D4AF63;display:inline-block;padding-bottom:5px}'
    + '.ab-track .ab-primary-note{color:#6b6250;font-size:.9rem;margin-left:8px}'
    + '.ab-testament{font-family:Georgia,serif;color:#303C4B;font-size:1.15rem;margin:20px 0 8px}'
    + '.ab-books{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin:0;padding:0;list-style:none}'
    + '.ab-books li{background:#FFFFFF;border:1px solid #D8DEE6;border-radius:8px;padding:11px 13px;font-size:.98rem}'
    + '.ab-books li a{color:#303C4B;text-decoration:none;font-weight:600}'
    + '.ab-books li a:hover{color:#8a6d2f;text-decoration:underline}'
    + '.ab-books .ab-chcount{display:block;color:#5A6570;font-size:.8rem;margin-top:2px}'
    + '.ab-tag{display:inline-block;background:#D4AF63;color:#303C4B;border-radius:999px;font-size:.72rem;font-weight:700;padding:2px 9px;margin-left:7px;vertical-align:middle}'
    + '.ab-note{color:#6b6250}'
    + '.ab-chapters{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin:0;padding:0;list-style:none}'
    + '.ab-chapters li{background:#FFFFFF;border:1px solid #D8DEE6;border-radius:8px;padding:11px 13px;text-align:center}'
    + '.ab-chapters li a{color:#303C4B;text-decoration:none;font-weight:600}'
    + '.ab-switch{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0;padding:0;list-style:none}'
    + '.ab-switch a,.ab-switch span{border:1px solid #D8DEE6;border-radius:999px;padding:6px 13px;font-size:.9rem;text-decoration:none;color:#303C4B;background:#fff}'
    + '.ab-switch span[aria-current="true"]{background:#303C4B;color:#F7F8FA;border-color:#303C4B}'
    + '.ab-player{background:#303C4B;color:#F7F8FA;border-radius:12px;padding:20px;margin:20px 0;border-bottom:4px solid #D4AF63}'
    + '.ab-player h2{color:#D4AF63;font-family:Georgia,serif;margin:0 0 10px;font-size:1.25rem}'
    + '.ab-player audio{width:100%;margin:6px 0 12px}'
    + '.ab-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}'
    + '.ab-ctl .ab-ctl-label{font-size:.85rem;color:#C7CEDA;margin-right:2px}'
    + '.ab-ctl button,.ab-ctl select{background:#F7F8FA;color:#252B32;border:1px solid #D4AF63;border-radius:8px;padding:7px 12px;font-size:.92rem;cursor:pointer}'
    + '.ab-ctl button[aria-pressed="true"]{background:#D4AF63;color:#303C4B;font-weight:700}'
    + '.ab-ctl a.ab-dl{background:#D4AF63;color:#303C4B;border-radius:8px;padding:8px 14px;text-decoration:none;font-weight:700;font-size:.92rem}'
    + '.ab-navrow{display:flex;justify-content:space-between;gap:10px;margin:16px 0;flex-wrap:wrap}'
    + '.ab-navrow a{color:#303C4B;font-weight:600}'
    + '.ab-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function langBy(code) { for (var i = 0; i < D.languages.length; i++) if (D.languages[i].code === code) return D.languages[i]; return null; }
  function bookBy(slug) { for (var i = 0; i < D.books.length; i++) if (D.books[i].slug === slug) return D.books[i]; return null; }
  function trackBy(lang, key) { for (var i = 0; i < lang.tracks.length; i++) if (lang.tracks[i].key === key) return lang.tracks[i]; return lang.tracks[0]; }
  function statusOf(track, slug) { var v = track.status && track.status[slug]; if (!v) return '\u2014'; return (typeof v === 'string') ? v : v.s; }
  function unit(lang, track, slug, ch) { var m = D.media && D.media[lang + '/' + track + '/' + slug + '/' + ch]; return (m && m.mp3) ? m : null; }
  function bookUnit(lang, track, slug) { var m = D.bookMedia && D.bookMedia[lang + '/' + track + '/' + slug]; return (m && m.mp3) ? m : null; }
  function publishedChapters(lang, track, book) { var out = []; for (var c = 1; c <= book.chapters; c++) if (unit(lang, track, book.slug, c)) out.push(c); return out; }
  function bookHref(lang, track, slug) { return '/audio-bible/book/?lang=' + encodeURIComponent(lang) + '&track=' + encodeURIComponent(track) + '&book=' + encodeURIComponent(slug); }
  function listenHref(lang, track, slug, ch) { return '/audio-bible/listen/?lang=' + encodeURIComponent(lang) + '&track=' + encodeURIComponent(track) + '&book=' + encodeURIComponent(slug) + '&ch=' + ch; }
  function params() { var q = {}; location.search.replace(/^\?/, '').split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); }); return q; }
  function crumbs(items) { return '<p class="bread">' + items.map(function (it, i) { return (i < items.length - 1 && it.href) ? '<a href="' + it.href + '">' + esc(it.label) + '</a>' : esc(it.label); }).join(' / ') + '</p>'; }

  /* ---------- player builder (shared by chapter + complete-book) ---------- */
  function buildPlayer(container, opts) {
    // opts: {title, mp3, dl, desc, nextHref, onEnded}
    var wrap = document.createElement('section');
    wrap.className = 'ab-player';
    wrap.setAttribute('aria-label', opts.title + ' player');
    var h = '<h2>' + esc(opts.title) + '</h2>';
    if (opts.desc) h += '<p>' + esc(opts.desc) + '</p>';
    h += '<audio controls preload="metadata" aria-label="' + esc(opts.title) + ' audio" src="' + esc(opts.mp3) + '"></audio>';
    h += '<div class="ab-ctl" role="group" aria-label="Playback speed"><span class="ab-ctl-label" id="ab-speed-label">Speed</span>'
      + [0.75, 1, 1.25, 1.5, 2].map(function (r) { return '<button type="button" data-rate="' + r + '" aria-pressed="' + (r === 1) + '" aria-describedby="ab-speed-label">' + r + '&times;</button>'; }).join('') + '</div>';
    h += '<div class="ab-ctl"><label class="ab-ctl-label" for="ab-sleep">Sleep timer</label>'
      + '<select id="ab-sleep"><option value="0">Off</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select>'
      + '<span class="ab-ctl-status" role="status" aria-live="polite"></span></div>';
    if (opts.dl !== false) h += '<div class="ab-ctl"><a class="ab-dl" href="' + esc(opts.mp3) + '" download>Download MP3 for offline listening</a></div>';
    wrap.innerHTML = h;
    container.appendChild(wrap);
    var audio = wrap.querySelector('audio');
    var status = wrap.querySelector('.ab-ctl-status');
    wrap.querySelectorAll('button[data-rate]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        audio.playbackRate = parseFloat(btn.getAttribute('data-rate'));
        wrap.querySelectorAll('button[data-rate]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      });
    });
    var timer = null;
    wrap.querySelector('#ab-sleep').addEventListener('change', function (e) {
      if (timer) { clearTimeout(timer); timer = null; }
      var mins = parseInt(e.target.value, 10);
      if (mins > 0) {
        status.textContent = 'Sleep timer set: playback will stop in ' + mins + ' minutes.';
        timer = setTimeout(function () { audio.pause(); status.textContent = 'Sleep timer stopped playback.'; }, mins * 60000);
      } else status.textContent = '';
    });
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: opts.title, artist: 'Upshur Unlimited LLC', album: 'The Audio Bible' }); } catch (e) {}
    }
    if (opts.onEnded) audio.addEventListener('ended', opts.onEnded);
    return audio;
  }

  /* ---------- language page ---------- */
  function renderLanguage(root, code) {
    var lang = langBy(code);
    if (!lang) { root.innerHTML = '<p class="ab-note">Language not found. <a href="/audio-bible/">Return to the Audio Bible home</a>.</p>'; return; }
    var out = '';
    lang.tracks.forEach(function (track) {
      var showTrackHead = lang.tracks.length > 1 || track.label;
      out += '<section class="ab-track" aria-label="' + esc(track.label || lang.native) + '">';
      if (showTrackHead) out += '<h2>' + esc(track.label || '') + '</h2>' + (track.primary && lang.tracks.length > 1 ? '<span class="ab-primary-note">Primary track</span>' : '');
      ['OT', 'NT'].forEach(function (tst) {
        out += '<h3 class="ab-testament">' + (tst === 'OT' ? 'Old Testament' : 'New Testament') + '</h3><ul class="ab-books">';
        D.books.forEach(function (book) {
          if (book.testament !== tst) return;
          var pub = publishedChapters(lang.code, track.key, book);
          var inProd = (statusOf(track, book.slug) === 'SAMPLE' && !track.status[book.slug].pending && pub.length === 0);
          var label = esc(book.name) + (inProd ? '<span class="ab-tag">In production</span>' : '')
            + '<span class="ab-chcount">' + book.chapters + (book.chapters === 1 ? ' chapter' : ' chapters') + (pub.length ? ' &middot; ' + pub.length + ' available' : '') + '</span>';
          out += '<li>' + (pub.length ? '<a href="' + bookHref(lang.code, track.key, book.slug) + '">' + label + '</a>' : label) + '</li>';
        });
        out += '</ul>';
      });
      out += '</section>';
    });
    out += '<p class="ab-note">Books become listening links as they are published. Only verified, published recordings appear here — nothing is listed as available before it truly is.</p>';
    root.innerHTML = out;
  }

  /* ---------- book page ---------- */
  function renderBook(root) {
    var q = params();
    var lang = langBy(q.lang || 'en');
    if (!lang) { root.innerHTML = '<p class="ab-note">Language not found. <a href="/audio-bible/">Return to the Audio Bible home</a>.</p>'; return; }
    var track = trackBy(lang, q.track || (lang.tracks[0] && lang.tracks[0].key));
    var book = bookBy(q.book || '');
    if (!book) { root.innerHTML = '<p class="ab-note">Book not found. <a href="/audio-bible/' + lang.code + '/">Return to ' + esc(lang.native) + '</a>.</p>'; return; }
    document.title = book.name + ' — Audio Bible in ' + lang.name + ' | Upshur Unlimited LLC';
    var pub = publishedChapters(lang.code, track.key, book);
    var bu = bookUnit(lang.code, track.key, book.slug);
    var out = crumbs([{ label: 'Home', href: '/' }, { label: 'Audio Bible', href: '/audio-bible/' }, { label: lang.native, href: '/audio-bible/' + lang.code + '/' }, { label: book.name }]);
    out += '<h1>' + esc(book.name) + '</h1>';
    out += '<p style="font-size:1.05rem"><strong>' + esc(lang.native) + (track.label ? ' &middot; ' + esc(track.label) : '') + '</strong> &middot; ' + (book.testament === 'OT' ? 'Old Testament' : 'New Testament') + ' &middot; ' + book.chapters + (book.chapters === 1 ? ' chapter' : ' chapters') + '</p>';
    if (lang.tracks.length > 1) {
      out += '<ul class="ab-switch" aria-label="Choose a translation">';
      lang.tracks.forEach(function (t) {
        out += '<li>' + (t.key === track.key ? '<span aria-current="true">' + esc(t.short || t.label) + '</span>' : '<a href="' + bookHref(lang.code, t.key, book.slug) + '">' + esc(t.short || t.label) + '</a>') + '</li>';
      });
      out += '</ul>';
    }
    out += '<div id="ab-book-player"></div>';
    if (!pub.length && !bu) {
      out += '<p class="ab-note">This book is not yet available in audio. Production has begun with the Gospel of Matthew in English and Spanish; published books appear here as listening links the moment they are released. <a href="/audio-bible/">About the Audio Bible project</a>.</p>';
    }
    out += '<h2 class="ab-testament">Chapters</h2><ul class="ab-chapters">';
    for (var c = 1; c <= book.chapters; c++) {
      var u = unit(lang.code, track.key, book.slug, c);
      out += '<li>' + (u ? '<a href="' + listenHref(lang.code, track.key, book.slug, c) + '" aria-label="' + esc(book.name) + ' chapter ' + c + ' — listen">Chapter ' + c + '</a>' : 'Chapter ' + c) + '</li>';
    }
    out += '</ul>';
    out += '<p class="ab-note"><a href="/audio-bible/' + lang.code + '/">All books in ' + esc(lang.native) + '</a></p>';
    root.innerHTML = out;
    var slot = document.getElementById('ab-book-player');
    if (bu) {
      buildPlayer(slot, { title: book.name + ' — Complete Book', mp3: bu.mp3, dl: bu.dl, desc: bu.desc });
    } else if (pub.length) {
      var p = document.createElement('p');
      p.innerHTML = '<a class="btn" href="' + listenHref(lang.code, track.key, book.slug, pub[0]) + '">Listen to the complete book — continuous playback from Chapter ' + pub[0] + '</a>';
      slot.appendChild(p);
    }
  }

  /* ---------- chapter (listen) page ---------- */
  function renderListen(root) {
    var q = params();
    var lang = langBy(q.lang || 'en');
    if (!lang) { root.innerHTML = '<p class="ab-note">Language not found. <a href="/audio-bible/">Return to the Audio Bible home</a>.</p>'; return; }
    var track = trackBy(lang, q.track || (lang.tracks[0] && lang.tracks[0].key));
    var book = bookBy(q.book || '');
    var ch = parseInt(q.ch, 10);
    if (!book || !(ch >= 1 && ch <= book.chapters)) { root.innerHTML = '<p class="ab-note">Chapter not found. <a href="/audio-bible/' + lang.code + '/">Return to ' + esc(lang.native) + '</a>.</p>'; return; }
    document.title = book.name + ' ' + ch + ' — Audio Bible in ' + lang.name + ' | Upshur Unlimited LLC';
    var u = unit(lang.code, track.key, book.slug, ch);
    var out = crumbs([{ label: 'Home', href: '/' }, { label: 'Audio Bible', href: '/audio-bible/' }, { label: lang.native, href: '/audio-bible/' + lang.code + '/' }, { label: book.name, href: bookHref(lang.code, track.key, book.slug) }, { label: 'Chapter ' + ch }]);
    out += '<h1>' + esc(book.name) + ' — Chapter ' + ch + '</h1>';
    out += '<p><strong>' + esc(lang.native) + (track.label ? ' &middot; ' + esc(track.label) : '') + '</strong></p>';
    out += '<div id="ab-listen-player"></div>';
    if (!u) {
      out += '<p class="ab-note">This chapter is not yet available in audio. Only verified, published recordings are posted here. <a href="' + bookHref(lang.code, track.key, book.slug) + '">Return to ' + esc(book.name) + '</a>.</p>';
    }
    var prev = ch > 1 && unit(lang.code, track.key, book.slug, ch - 1) ? ch - 1 : null;
    var next = ch < book.chapters && unit(lang.code, track.key, book.slug, ch + 1) ? ch + 1 : null;
    out += '<nav class="ab-navrow" aria-label="Chapter navigation">'
      + '<span>' + (prev ? '<a href="' + listenHref(lang.code, track.key, book.slug, prev) + '" rel="prev">&larr; Chapter ' + prev + '</a>' : '') + '</span>'
      + '<span><a href="' + bookHref(lang.code, track.key, book.slug) + '">All chapters of ' + esc(book.name) + '</a></span>'
      + '<span>' + (next ? '<a href="' + listenHref(lang.code, track.key, book.slug, next) + '" rel="next">Chapter ' + next + ' &rarr;</a>' : '') + '</span></nav>';
    root.innerHTML = out;
    if (u) {
      buildPlayer(document.getElementById('ab-listen-player'), {
        title: book.name + ' ' + ch, mp3: u.mp3, dl: u.dl, desc: u.desc,
        onEnded: function () {
          var cont = document.getElementById('ab-continuous');
          if (cont && cont.checked && next) location.href = listenHref(lang.code, track.key, book.slug, next) + '&play=1';
        }
      });
      var ctl = document.createElement('p');
      ctl.innerHTML = '<label><input type="checkbox" id="ab-continuous" checked> Play chapters continuously (advance to the next chapter automatically)</label>';
      document.getElementById('ab-listen-player').appendChild(ctl);
      if (q.play === '1') { var a = document.querySelector('#ab-listen-player audio'); if (a) { var pr = a.play(); if (pr && pr.catch) pr.catch(function () {}); } }
    }
  }

  var page = document.body.getAttribute('data-ab-page');
  if (page === 'language') { var r = document.getElementById('ab-language-root'); if (r) renderLanguage(r, document.body.getAttribute('data-lang')); }
  if (page === 'book') { var rb = document.getElementById('ab-book-root'); if (rb) renderBook(rb); }
  if (page === 'listen') { var rl = document.getElementById('ab-listen-root'); if (rl) renderListen(rl); }
})();
