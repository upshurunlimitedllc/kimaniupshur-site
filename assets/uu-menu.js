/* Upshur Unlimited - phone Menu bar (Variant A, owner pick 2026-10-28).
   Loaded synchronously just before the site header on every framed page.
   Adds .uu-js to <html> before the header paints - the collapse styles
   in assets/design.css are gated on that class, so with scripts off the
   Menu button stays hidden and the nav keeps its wrapped rows; nothing
   is ever hidden without JS. Taps are delegated from the document, so
   the one script serves every page unchanged. */
(function () {
  document.documentElement.classList.add('uu-js');
  function setState(btn, head, open) {
    head.classList.toggle('uu-menu-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var ico = btn.querySelector('.uu-mb-ico');
    var lbl = btn.querySelector('.uu-mb-label');
    if (ico) ico.textContent = open ? '\u2715' : '\u2630';
    if (lbl) lbl.textContent = open ? 'Close' : 'Menu';
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    var btn = t && t.closest ? t.closest('.uu-menubar') : null;
    if (!btn) return;
    var head = btn.closest('.uu-head');
    if (!head) return;
    setState(btn, head, !head.classList.contains('uu-menu-open'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.keyCode !== 27) return;
    var head = document.querySelector('.uu-head.uu-menu-open');
    if (!head) return;
    var btn = head.querySelector('.uu-menubar');
    if (btn) { setState(btn, head, false); btn.focus(); }
  });
})();

/* Cover lightbox (storefront corrections 2026-10-29): tap/click a product
   page cover to view it full-size. Self-contained; styles injected here so
   both page-template generations behave identically. */
(function () {
  var css = '.uu-lightbox{position:fixed;inset:0;background:rgba(10,16,24,.88);display:none;align-items:center;justify-content:center;z-index:9999;padding:2vh 2vw}'
    + '.uu-lightbox.open{display:flex}'
    + '.uu-lightbox img{max-width:min(92vw,560px);max-height:94vh;width:auto;height:auto;border-radius:.4rem;box-shadow:0 18px 60px rgba(0,0,0,.55)}'
    + '.uu-lightbox .uu-lb-close{position:absolute;top:14px;right:18px;background:#F2DFAE;color:#16283F;border:0;border-radius:2rem;font-size:1rem;font-weight:700;padding:.45rem 1rem;cursor:pointer}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var box = document.createElement('div'); box.className = 'uu-lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Book cover enlarged');
  box.innerHTML = '<button type="button" class="uu-lb-close" aria-label="Close">Close \u00d7</button><img alt="">';
  document.body.appendChild(box);
  var big = box.querySelector('img');
  function close() { box.classList.remove('open'); big.removeAttribute('src'); }
  box.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.closest && t.closest('.uu-book-cover')) {
      big.src = t.currentSrc || t.src; big.alt = t.alt || '';
      box.classList.add('open');
    }
  });
})();

/* Homeschool Resources nav item (owner ruling 2026-11-21): the site header
   markup is inline in every framed page, so the permanent "Homeschool
   Resources" entry is seated here — the one script every framed page loads —
   until the repo-wide native markup pass replaces it. Idempotent: if the
   nav ever carries the link natively, this block adds nothing. With scripts
   off the nav simply shows without the item, the same graceful degradation
   as the Menu collapse above. */
(function () {
  function seat() {
    var nav = document.querySelector('nav.uu-nav ul');
    if (!nav) return;
    if (nav.querySelector('a[href="/homeschool-resources/"]')) return;
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.setAttribute('href', '/homeschool-resources/');
    a.textContent = 'Homeschool Resources';
    li.appendChild(a);
    var books = nav.querySelector('a[href="/books/"]');
    if (books && books.parentNode && books.parentNode.nextSibling) {
      nav.insertBefore(li, books.parentNode.nextSibling);
      return;
    }
    var kids = nav.querySelector('a[href="/kids-teens/"]');
    if (kids && kids.parentNode && kids.parentNode.nextSibling) {
      nav.insertBefore(li, kids.parentNode.nextSibling);
      return;
    }
    var search = nav.querySelector('a[href="/search/"]');
    if (search && search.parentNode) {
      nav.insertBefore(li, search.parentNode);
      return;
    }
    nav.appendChild(li);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', seat);
  } else {
    seat();
  }
})();

/* Audio Bible nav item + footer link (Batch 505, owner order 2026-11-26): the site
   header/footer markup is inline in every framed page, so the permanent "Audio Bible"
   entries are seated here — the one script every framed page loads — until the
   repo-wide native markup pass replaces them. Idempotent: pages that carry the links
   natively (the /audio-bible/ section itself) are left untouched. */
(function () {
  function seatNav() {
    var nav = document.querySelector('nav.uu-nav ul');
    if (!nav) return;
    if (nav.querySelector('a[href="/audio-bible/"]')) return;
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.setAttribute('href', '/audio-bible/');
    a.textContent = 'Audio Bible';
    li.appendChild(a);
    var ab = nav.querySelector('a[href="/audiobooks/"]');
    if (ab && ab.parentNode && ab.parentNode.nextSibling) {
      nav.insertBefore(li, ab.parentNode.nextSibling);
      return;
    }
    nav.appendChild(li);
  }
  function seatFooter() {
    var fl = document.querySelector('.uu-flink');
    if (!fl) return;
    if (fl.querySelector('a[href="/audio-bible/"]')) return;
    var a = document.createElement('a');
    a.setAttribute('href', '/audio-bible/');
    a.textContent = 'Audio Bible';
    var contact = fl.querySelector('a[href="/contact.html"]');
    if (contact) { fl.insertBefore(a, contact); return; }
    fl.appendChild(a);
  }
  function seat() { seatNav(); seatFooter(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', seat);
  } else {
    seat();
  }
})();
