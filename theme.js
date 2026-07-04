/* ELEMENT | 08 — theme switching for the static site.
 *
 * Caribbean (light) is the default; Chalk Dark is the dark scheme. The choice
 * persists in localStorage; with no saved choice the OS preference wins.
 * Loaded synchronously in <head> so the correct palette paints first (no flash).
 */
(function () {
  var KEY = 'element08.theme';

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function preferred() {
    var s = saved();
    if (s === 'light' || s === 'dark') return s;
    try {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) { /* no matchMedia */ }
    return 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
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
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked */ }
    });
  });
})();
