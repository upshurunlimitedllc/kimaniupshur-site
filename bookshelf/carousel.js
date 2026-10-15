/* The Bookshelf — 3D rotating cover carousel (vanilla JS, no framework).
   Coverflow geometry: the centered cover faces the visitor; neighbours are
   angled away with rotateY + translateZ. Only a window of covers around the
   current position exists in the DOM / is ever requested (pool of 17 nodes
   recycled as the shelf moves), so a catalog of ~1,000 books costs ~17
   thumbnail downloads at a time, never hundreds of full-size covers.
   Flick physics: releasing a drag above a velocity threshold hands the
   shelf's release velocity to a momentum integrator (exponential friction);
   it coasts, decelerates, and eases into an exact centred stop. Touching
   the shelf grabs it dead. Reduced-motion settings disable spinning. */
(function () {
  "use strict";
  var DATA = window.BOOKSHELF_DATA;
  if (!DATA) return;
  var PAGE_BASE = DATA.pageBase || "";
  var POOL_R = 8;                 // covers rendered on each side of centre
  var POOL_N = POOL_R * 2 + 1;

  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), azBar = $("azBar"), catSel = $("catSel"),
      searchBox = $("searchBox"), searchResults = $("searchResults"),
      capTitle = $("capTitle"), capMeta = $("capMeta"),
      prevBtn = $("prevBtn"), nextBtn = $("nextBtn"),
      viewToggle = $("viewToggle"), motionToggle = $("motionToggle"),
      carouselWrap = $("carouselWrap"), simpleView = $("simpleView"),
      simpleGrid = $("simpleGrid"), moreBtn = $("moreBtn"), hud = $("hud");

  /* ---------- helpers ---------- */
  function sortKey(t) {
    var s = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    var arts = ["the ", "a ", "an "];
    for (var i = 0; i < arts.length; i++)
      if (s.indexOf(arts[i]) === 0) { s = s.slice(arts[i].length); break; }
    return s;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  /* ---------- display titles (render-time ONLY) ----------
     Owner correction #3 (2026-10-14): titles as DISPLAYED strip a leading
     "Made Simple:" / "MADE SIMPLE:" prefix, and HTML entities in the data
     strings (e.g. "&amp;", "&#x27;") are decoded so they read cleanly.
     The underlying data titles, sort keys/order, URLs, link targets and
     cover-image alt source data are NOT changed. */
  var _decEl = null;
  function displayTitle(t) {
    var out = String(t == null ? "" : t);
    if (out.indexOf("&") !== -1) {
      if (!_decEl) _decEl = document.createElement("textarea");
      _decEl.innerHTML = out;
      out = _decEl.value;
    }
    return out.replace(/^\s*made simple:\s*/i, "");
  }

  /* ---------- state ---------- */
  var state = {
    coll: "all",
    fullList: [],        // every slug in the collection (simple view)
    list: [],            // slugs with covers (the carousel shelf)
    position: 0,         // float index into list
    reduced: false,
    view: "carousel",
    simpleShown: 0
  };
  var slugColl = {};     // slug -> first collection id containing it
  DATA.collections.forEach(function (c) {
    (DATA.order[c.id] || []).forEach(function (s) {
      if (!(s in slugColl)) slugColl[s] = c.id;
    });
  });
  var totalBooks = Object.keys(DATA.books).length;
  var totalCovers = Object.keys(DATA.books).filter(function (s) { return DATA.books[s].img; }).length;

  /* ---------- pool of cover nodes ---------- */
  var pool = [];
  for (var i = 0; i < POOL_N; i++) {
    var d = document.createElement("div");
    d.className = "bk"; d._idx = -1;
    var im = document.createElement("img");
    im.alt = ""; im.draggable = false;
    d.appendChild(im);
    stage.appendChild(d);
    pool.push(d);
  }
  var loadedSrcs = new Set();
  pool.forEach(function (node) {
    node.firstChild.addEventListener("load", function () {
      var src = node.firstChild.getAttribute("src");
      if (src && !loadedSrcs.has(src)) { loadedSrcs.add(src); updateHud(); }
    });
  });

  function metrics() {
    var w = stage.clientWidth || window.innerWidth;
    var coverW = clamp(w * 0.56, 150, 300);
    return { coverW: coverW, spacing: coverW * 0.54, depth: coverW * 0.45, angle: 46 };
  }

  var lastCenter = -1;
  function render() {
    var m = metrics();
    stage.style.setProperty("--cover-w", m.coverW + "px");
    var n = state.list.length;
    var center = Math.round(state.position);
    for (var i = 0; i < POOL_N; i++) {
      var node = pool[i], idx = center + i - POOL_R;
      if (idx < 0 || idx >= n) { node.style.display = "none"; node._idx = -1; node._slug = null; node.classList.remove("is-center"); delete node.dataset.slug; continue; }
      var off = idx - state.position;
      var slugNow = state.list[idx];
      if (node._idx !== idx || node._slug !== slugNow) {
        /* keyed by SLUG as well as index: after a collection switch an
           index can coincide while the book changes — the node must take
           the new book's cover, never keep the previous collection's. */
        var slug = slugNow, b = DATA.books[slug];
        node._idx = idx; node._slug = slug; node.dataset.slug = slug;
        var img = node.firstChild;
        if (img.getAttribute("src") !== b.img) img.setAttribute("src", b.img);
        img.alt = b.t + " — book cover";
      }
      var ao = Math.abs(off);
      var rot = clamp(off * m.angle, -68, 68);
      node.style.display = "block";
      node.style.transform =
        "translate(-50%,-52%) translateX(" + (off * m.spacing).toFixed(1) + "px)" +
        " translateZ(" + (-ao * m.depth).toFixed(1) + "px) rotateY(" + rot.toFixed(1) + "deg)";
      node.style.zIndex = String(200 - Math.round(ao * 10));
      node.style.opacity = ao > 6.2 ? String(clamp(1 - (ao - 6.2) / 1.3, 0, 1)) : "1";
      if (idx === center) node.classList.add("is-center"); else node.classList.remove("is-center");
    }
    prevBtn.disabled = center <= 0;
    nextBtn.disabled = center >= n - 1;
    if (center !== lastCenter && n > 0) {
      lastCenter = center;
      var cb = DATA.books[state.list[center]];
      capTitle.textContent = displayTitle(cb.t);
      capTitle.setAttribute("href", PAGE_BASE + cb.u);
      var coll = DATA.collections.filter(function (c) { return c.id === state.coll; })[0];
      capMeta.textContent = "Book " + (center + 1) + " of " + n + " covers on the shelf · " +
        (coll ? coll.label : "") + ": " + state.fullList.length + " books · " + n + " with covers";
      markLetter();
    }
  }

  /* ---------- animation: eased tweens + physics momentum ----------
     Two drivers share one RAF loop and are mutually exclusive:
     · tween — eased moves for buttons / keyboard / search / A–Z, and the
       final settle that parks a spin on an exact book.
     · spin — velocity-based momentum after a flick. Velocity is measured in
       books/second; friction is an exponential decay (vel *= e^(−K·dt)), so
       a flick's coasting distance ≈ v/K books and even the hardest flick
       dies within a few seconds. When |vel| falls below SETTLE_VEL the
       shelf eases the remaining fraction of a book into a centred stop.
       Position is always an index into the (alphabetical) list, so order
       can never scramble, spin or not. */
  var SPIN_MIN = 4.0;      // books/sec at release required to enter a spin
  var SPIN_MAX = 34;       // books/sec cap on any flick
  var SPIN_K = 1.05;       // friction: exponential velocity decay per second
  var SETTLE_VEL = 0.85;   // books/sec where momentum hands over to the settle ease
  var anim = null, spin = null, rafId = null;
  function ensureRaf() { if (!rafId) rafId = requestAnimationFrame(frame); }
  function stopMotion() {
    anim = null; spin = null;
    capMeta.setAttribute("aria-live", "polite");
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function frame(now) {
    rafId = null;
    if (anim) {
      var t = (now - anim.start) / anim.dur;
      if (t >= 1) { state.position = anim.to; anim = null; render(); return; }
      var e = anim.ease(t);
      state.position = anim.from + (anim.to - anim.from) * e;
      render();
      rafId = requestAnimationFrame(frame);
      return;
    }
    if (spin) {
      var dt = Math.min(0.1, (now - spin.last) / 1000);   // clamp tab-switch gaps
      spin.last = now;
      if (dt > 0) {
        var n = state.list.length;
        state.position += spin.vel * dt;
        spin.vel *= Math.exp(-SPIN_K * dt);
        if (state.position <= 0) { state.position = 0; spin.vel = 0; }        // ends clamp:
        else if (state.position >= n - 1) { state.position = n - 1; spin.vel = 0; }
        render();
      }
      if (Math.abs(spin.vel) < SETTLE_VEL) {
        spin = null;
        capMeta.setAttribute("aria-live", "polite");
        tweenTo(Math.round(state.position));
      } else rafId = requestAnimationFrame(frame);
    }
  }
  function startSpin(v) {
    anim = null;
    spin = { vel: clamp(v, -SPIN_MAX, SPIN_MAX), last: performance.now() };
    /* mid-spin the caption would change many times a second; keep assistive
       tech from queueing dozens of stale announcements */
    capMeta.setAttribute("aria-live", "off");
    ensureRaf();
  }
  function tweenTo(target, opts) {
    opts = opts || {};
    target = clamp(target, 0, state.list.length - 1);
    spin = null;
    capMeta.setAttribute("aria-live", "polite");
    if (state.reduced) { anim = null; state.position = target; render(); return; }
    var dist = Math.abs(target - state.position);
    if (dist < 0.001) { state.position = target; render(); return; }
    var dur = opts.dur || clamp(240 + dist * 55, 240, 780);
    anim = { from: state.position, to: target, start: performance.now(), dur: dur,
             ease: opts.ease || easeOut };
    ensureRaf();
  }
  function jumpTo(target) {  // long-distance move (A-Z, search)
    stopMotion();
    var dist = Math.abs(target - state.position);
    if (dist > 30 && !state.reduced) {
      /* Fade-teleport: a rotating sweep across hundreds of titles would make
         the browser fetch every cover the window passes over. Past 30 titles
         the shelf fades, repositions, and fades back — only the destination
         window's covers are ever requested. */
      stage.style.transition = "opacity 140ms ease";
      stage.style.opacity = "0.12";
      window.setTimeout(function () {
        state.position = target; render();
        stage.style.opacity = "1";
        window.setTimeout(function () { stage.style.transition = ""; }, 180);
      }, 150);
      return;
    }
    tweenTo(target, { dur: clamp(280 + dist * 20, 280, 1150), ease: easeInOut });
  }

  /* ---------- pointer: drag / swipe / tap ---------- */
  var drag = null;
  stage.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button > 0) return;
    stopMotion();   // grab-to-stop: touching the shelf kills any spin/tween instantly
    var node = e.target.closest ? e.target.closest(".bk") : null;
    drag = { x0: e.clientX, t0: performance.now(), startPos: state.position,
             samples: [{ x: e.clientX, t: performance.now() }],
             nodeIdx: node ? node._idx : -1, moved: 0 };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var m = metrics();
    /* Browsers coalesce fast finger movement into one pointermove per frame;
       the raw positions ride along via getCoalescedEvents(). Recording every
       raw position keeps the drag tracking (and the travel that the release
       velocity is estimated from) truthful for fast flicks. Samples are
       stamped with handler time: event.timeStamp proved unreliable (a
       constant 0) for some injected-input pipelines. */
    var evs = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
    var dx = 0, now = performance.now();
    for (var i = 0; i < evs.length; i++) {
      dx = evs[i].clientX - drag.x0;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      drag.samples.push({ x: evs[i].clientX, t: now });
      if (drag.samples.length > 24) drag.samples.shift();
    }
    var pos = drag.startPos - dx / m.spacing;
    if (pos < 0) pos *= 0.35;                                  // rubber-band
    if (pos > state.list.length - 1) pos = state.list.length - 1 + (pos - (state.list.length - 1)) * 0.35;
    state.position = pos;
    render();
  });
  /* Release velocity of a finished drag, in books/second (signed, + = forward).
     Estimated from the last ~100 ms of movement only, and read as zero if the
     finger paused before lifting — a flick-and-hold must not spin. */
  var lastFling = { v: 0, samples: 0, spanMs: 0 };
  function dragVelocity(d, now) {
    var s = d.samples;
    if (s.length < 2) return 0;
    var last = s[s.length - 1];
    if (now - last.t > 60) return 0;
    var a = last;
    for (var i = s.length - 1; i >= 0; i--) {
      if (last.t - s[i].t <= 100) a = s[i]; else break;
    }
    d.winSpan = last.t - a.t;
    if (last.t - a.t < 16) return 0;
    return -((last.x - a.x) / (last.t - a.t)) * 1000 / metrics().spacing;
  }
  /* No-spin release: land on the nearest book — except that a deliberate
     gentle swipe (the finger clearly travelled, the shelf barely moved)
     still turns exactly one page. */
  function settleFromDrag(d) {
    var startIdx = Math.round(d.startPos);
    var target = Math.round(state.position);
    if (target === startIdx && Math.abs(state.position - d.startPos) >= 0.18)
      target = startIdx + (state.position > d.startPos ? 1 : -1);
    tweenTo(target);
  }
  function endDrag(e) {
    if (!drag) return;
    var d = drag; drag = null;
    var now = performance.now();
    if (d.moved < 9 && now - d.t0 < 500) {                      // tap
      if (d.nodeIdx >= 0) {
        if (d.nodeIdx === Math.round(state.position)) {
          var slug = state.list[d.nodeIdx];
          window.location.href = PAGE_BASE + DATA.books[slug].u;
        } else tweenTo(d.nodeIdx);
      }
      return;
    }
    if (!state.list.length) return;
    var v = dragVelocity(d, now);
    lastFling = { v: v, samples: d.samples.length, spanMs: Math.round(d.winSpan || 0) };
    if (!state.reduced && Math.abs(v) >= SPIN_MIN) { startSpin(v); return; }
    settleFromDrag(d);
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", function () { drag = null; stopMotion(); tweenTo(Math.round(state.position)); });

  /* ---------- buttons & keyboard ---------- */
  prevBtn.addEventListener("click", function () { tweenTo(Math.round(state.position) - 1); });
  nextBtn.addEventListener("click", function () { tweenTo(Math.round(state.position) + 1); });
  stage.addEventListener("keydown", function (e) {
    var c = Math.round(state.position), handled = true;
    if (e.key === "ArrowLeft") tweenTo(c - 1);
    else if (e.key === "ArrowRight") tweenTo(c + 1);
    else if (e.key === "PageDown") tweenTo(c + 5);
    else if (e.key === "PageUp") tweenTo(c - 5);
    else if (e.key === "Home") jumpTo(0);
    else if (e.key === "End") jumpTo(state.list.length - 1);
    else if (e.key === "Enter" && state.list.length) {
      var slug = state.list[c];
      window.location.href = PAGE_BASE + DATA.books[slug].u;
    } else handled = false;
    if (handled) e.preventDefault();
  });

  /* ---------- A-Z bar ---------- */
  var letterFirstIdx = {};
  function buildAz() {
    azBar.textContent = ""; letterFirstIdx = {};
    state.list.forEach(function (slug, i) {
      var L = (sortKey(DATA.books[slug].t).charAt(0) || "#").toUpperCase();
      if (!(L in letterFirstIdx)) letterFirstIdx[L] = i;
    });
    Object.keys(letterFirstIdx).sort().forEach(function (L) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = L; b.dataset.letter = L;
      b.setAttribute("aria-label", "Jump to titles starting with " + L);
      b.addEventListener("click", function () { jumpTo(letterFirstIdx[L]); });
      azBar.appendChild(b);
    });
  }
  function markLetter() {
    var c = Math.round(state.position);
    if (!state.list.length) return;
    var L = (sortKey(DATA.books[state.list[c]].t).charAt(0) || "#").toUpperCase();
    azBar.querySelectorAll("button").forEach(function (b) {
      if (b.dataset.letter === L) b.classList.add("cur"); else b.classList.remove("cur");
    });
  }

  /* ---------- collections ----------
     Fix #2 (Muse 3, 2026-10-14): a collection switch must never show the
     previous collection's covers under the new caption (or vice versa).
     The new collection's initial window is PRELOADED first; only then are
     state, covers and caption swapped together in one synchronous commit,
     so every painted frame is internally consistent. A token discards
     superseded switches. A timeout fallback commits anyway so a slow
     network can never wedge the shelf. */
  var switchToken = 0;
  function preloadWindow(list, pos) {
    var ps = [];
    for (var i = Math.max(0, pos - POOL_R); i <= Math.min(list.length - 1, pos + POOL_R); i++) {
      var src = DATA.books[list[i]].img;
      if (!src) continue;
      ps.push(new Promise(function (res) {
        var im = new Image(), done = false;
        function fin() { if (!done) { done = true; res(); } }
        im.onload = fin; im.onerror = fin;
        im.src = src;
        if (im.complete) fin();
        setTimeout(fin, 1800);
      }));
    }
    return Promise.race([Promise.all(ps),
      new Promise(function (r) { setTimeout(r, 2000); })]);
  }
  function setCollection(id, startIdx, after) {
    stopMotion();
    var token = ++switchToken;
    var newFull = DATA.order[id] || [];
    var newList = newFull.filter(function (s) { return DATA.books[s].img; });
    var pos = clamp(startIdx || 0, 0, Math.max(0, newList.length - 1));
    return preloadWindow(newList, pos).then(function () {
      if (token !== switchToken) return;   // a newer switch superseded this one
      state.coll = id;
      state.fullList = newFull;
      state.list = newList;
      state.position = pos;
      lastCenter = -1;
      buildAz(); render(); updateHud();
      if (state.view === "simple") renderSimple(false);
      if (after) after();
    });
  }
  DATA.collections.forEach(function (c) {
    var o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.label + " (" + c.count + " books · " + c.withCovers + " with covers)";
    catSel.appendChild(o);
  });
  catSel.addEventListener("change", function () { setCollection(catSel.value, 0); });

  /* ---------- search (across the whole catalog) ---------- */
  var allSlugs = Object.keys(DATA.books);
  function closeResults() { searchResults.hidden = true; searchBox.setAttribute("aria-expanded", "false"); }
  searchBox.addEventListener("input", function () {
    var q = sortKey(searchBox.value);
    if (!q) { closeResults(); return; }
    var hits = [];
    for (var i = 0; i < allSlugs.length && hits.length < 40; i++) {
      var s = allSlugs[i];
      if (sortKey(DATA.books[s].t).indexOf(q) !== -1) hits.push(s);
    }
    hits.sort(function (a, b) { return sortKey(DATA.books[a].t) < sortKey(DATA.books[b].t) ? -1 : 1; });
    hits = hits.slice(0, 8);
    searchResults.textContent = "";
    if (!hits.length) {
      var none = document.createElement("div");
      none.className = "r-none"; none.textContent = "No titles match — try another word.";
      searchResults.appendChild(none);
    }
    hits.forEach(function (s) {
      var b = DATA.books[s];
      var btn = document.createElement("button");
      btn.type = "button"; btn.setAttribute("role", "option");
      var left = document.createElement("span"); left.textContent = displayTitle(b.t) + (b.img ? "" : " (no cover yet)");
      var right = document.createElement("span"); right.className = "r-coll";
      var coll = DATA.collections.filter(function (c) { return c.id === slugColl[s]; })[0];
      right.textContent = coll ? coll.label : "";
      btn.appendChild(left); btn.appendChild(right);
      btn.addEventListener("click", function () { chooseSearch(s); });
      searchResults.appendChild(btn);
    });
    searchResults.hidden = false;
    searchBox.setAttribute("aria-expanded", "true");
  });
  searchBox.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeResults();
    if (e.key === "Enter") {
      var first = searchResults.querySelector("button");
      if (first && !searchResults.hidden) { e.preventDefault(); first.click(); }
    }
  });
  document.addEventListener("click", function (e) {
    if (!searchResults.contains(e.target) && e.target !== searchBox) closeResults();
  });
  function chooseSearch(slug) {
    closeResults(); searchBox.value = "";
    var b = DATA.books[slug];
    if (!b.img) { window.location.href = PAGE_BASE + b.u; return; }  // no cover: go straight to its page
    if (state.view === "simple") setView("carousel");
    if (state.list.indexOf(slug) === -1) {
      var targetColl = (DATA.order.all || []).indexOf(slug) !== -1 ? "all" : slugColl[slug];
      catSel.value = targetColl;
      setCollection(targetColl, 0, function () {
        jumpTo(state.list.indexOf(slug));
        stage.focus();
      });
      return;
    }
    jumpTo(state.list.indexOf(slug));
    stage.focus();
  }

  /* ---------- simple view ---------- */
  var SIMPLE_CHUNK = 48;
  function renderSimple(append) {
    if (!append) { simpleGrid.textContent = ""; state.simpleShown = 0; }
    var end = Math.min(state.simpleShown + SIMPLE_CHUNK, state.fullList.length);
    for (var i = state.simpleShown; i < end; i++) {
      var slug = state.fullList[i], b = DATA.books[slug];
      var a = document.createElement("a");
      a.className = "bs-cell"; a.href = PAGE_BASE + b.u;
      if (b.img) {
        var img = document.createElement("img");
        img.src = b.img; img.alt = b.t + " — book cover"; img.loading = "lazy";
        a.appendChild(img);
      } else {
        var tx = document.createElement("span");
        tx.className = "bs-cell-text"; tx.textContent = displayTitle(b.t);
        a.appendChild(tx);
      }
      var cap = document.createElement("span");
      cap.className = "c-title"; cap.textContent = displayTitle(b.t);
      a.appendChild(cap);
      simpleGrid.appendChild(a);
    }
    state.simpleShown = end;
    moreBtn.hidden = state.simpleShown >= state.fullList.length;
  }
  moreBtn.addEventListener("click", function () { renderSimple(true); });
  function setView(v) {
    state.view = v;
    var simple = v === "simple";
    viewToggle.setAttribute("aria-pressed", String(simple));
    viewToggle.textContent = simple ? "Carousel view" : "Simple view";
    carouselWrap.hidden = simple;
    azBar.style.display = simple ? "none" : "";
    simpleView.hidden = !simple;
    if (simple) renderSimple(false); else render();
  }
  viewToggle.addEventListener("click", function () {
    setView(state.view === "simple" ? "carousel" : "simple");
  });

  /* ---------- motion preference ---------- */
  function applyMotion() {
    state.reduced = motionToggle.checked;
    document.body.classList.toggle("reduced-motion", state.reduced);
    if (state.reduced && (anim || spin)) {
      state.position = anim ? anim.to : Math.round(state.position);
      stopMotion(); render();
    }
  }
  motionToggle.checked = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  motionToggle.addEventListener("change", applyMotion);

  /* ---------- HUD (preview instrumentation) ---------- */
  function statsText() {
    var coll = DATA.collections.filter(function (c) { return c.id === state.coll; })[0];
    var missing = state.fullList.length - state.list.length;
    return totalBooks + " books in the catalog · " + totalCovers + " with covers" +
      " — now showing " + (coll ? coll.label : "") + ": " + state.fullList.length +
      " books · " + state.list.length + " with covers on the shelf" +
      (missing > 0 ? " · " + missing + " without a cover (Simple view, as a text tile)" : "");
  }
  function updateHud() {
    var coll = DATA.collections.filter(function (c) { return c.id === state.coll; })[0];
    hud.textContent = "Preview stats · catalog: " + totalBooks + " books · " + totalCovers +
      " covers · shelf window: " + Math.min(POOL_N, state.list.length) + " of " +
      state.list.length + " in " + (coll ? coll.label : "") +
      " · cover images loaded so far: " + loadedSrcs.size;
    var st = $("bsStats");
    if (st) st.textContent = statsText();
  }

  /* ---------- init ---------- */
  var params = new URLSearchParams(window.location.search);
  var initColl = params.get("cat");
  if (!DATA.order[initColl]) initColl = "all";
  catSel.value = initColl;
  applyMotion();
  var initPos = parseFloat(params.get("pos") || "0");
  setCollection(initColl, isNaN(initPos) ? 0 : initPos);
  if (params.get("view") === "simple") setView("simple");
  window.addEventListener("resize", function () { render(); });
  window.__bookshelf = {
    state: state, jumpTo: jumpTo, tweenTo: tweenTo, setCollection: setCollection,
    stopMotion: stopMotion,
    velocity: function () { return spin ? spin.vel : 0; },
    spinning: function () { return !!spin; },
    lastFling: function () { return lastFling; },
    displayTitle: displayTitle,
    momentum: { MIN: SPIN_MIN, MAX: SPIN_MAX, K: SPIN_K, SETTLE: SETTLE_VEL }
  };
})();
