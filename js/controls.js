/* Page controls shared by both pages: theme toggle, text size and the phone menu.
   The small script in <head> has already applied the saved choices before first paint. */
(function () {
  var root = document.documentElement;
  var SIZES = { sm: 'Small', md: 'Medium', lg: 'Large', xl: 'Extra large' };

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private mode: choice lasts for this page only */ } }

  function paintTheme() {
    var dark = root.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.js-theme').forEach(function (b) {
      b.setAttribute('aria-pressed', String(dark));
      b.setAttribute('aria-label', dark ? 'Dark theme is on. Switch to light theme' : 'Light theme is on. Switch to dark theme');
      var l = b.querySelector('.js-theme-label'); if (l) l.textContent = dark ? 'Light' : 'Dark';
    });
  }
  function paintSize() {
    var cur = root.getAttribute('data-font-size') || 'md';
    document.querySelectorAll('.js-size').forEach(function (b) {
      var on = b.getAttribute('data-size') === cur;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', 'Text size ' + SIZES[b.getAttribute('data-size')] + (on ? ', selected' : ''));
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.js-theme, .js-size, #burger, #menu a') : null;
    if (!t) return;
    if (t.classList.contains('js-theme')) {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next); store('pref-theme', next); paintTheme();
    } else if (t.classList.contains('js-size')) {
      var s = t.getAttribute('data-size');
      if (SIZES[s]) { root.setAttribute('data-font-size', s); store('pref-font-size', s); paintSize(); }
    } else {
      var menu = document.getElementById('menu'), burger = document.getElementById('burger');
      if (!menu || !burger) return;
      var open = t.id === 'burger' ? !menu.classList.contains('open') : false;
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  });

  paintTheme(); paintSize();
})();
