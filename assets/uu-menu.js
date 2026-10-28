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
