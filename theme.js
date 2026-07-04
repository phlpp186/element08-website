/* ELEMENT | 08 — theme switching for the static site.
 *
 * Three schemes, matching the app: Caribbean (light) · Misty (mid) · Chalk
 * Dark (dark). The toggle cycles light → mid → dark. With no saved choice the
 * OS preference picks light or dark (mid is an explicit choice only). The
 * choice persists in localStorage; loaded synchronously in <head> so the
 * correct palette paints first (no flash).
 */
(function () {
  var KEY = 'element08.theme';
  var ORDER = ['light', 'mid', 'dark'];

  function saved() {
    try {
      var s = localStorage.getItem(KEY);
      return ORDER.indexOf(s) >= 0 ? s : null;
    } catch (e) { return null; }
  }

  function preferred() {
    var s = saved();
    if (s) return s;
    try {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) { /* no matchMedia */ }
    return 'light';
  }

  function apply(theme) {
    // 'light' is the default :root palette, so it carries no data-theme.
    if (theme === 'light') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }

  apply(preferred());

  // Follow OS changes as long as the user hasn't picked explicitly.
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!saved()) apply(e.matches ? 'dark' : 'light');
    });
  } catch (e) { /* older browsers */ }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      var next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked */ }
    });
  });
})();
