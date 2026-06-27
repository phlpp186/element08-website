/* ELEMENT | 08 — lightweight client-side i18n for the static site.
 *
 * English is the source language, written directly in the HTML. Other languages
 * live in i18n/<lang>.json (key -> translated string) and are applied at runtime.
 * Elements opt in with data-i18n (textContent) or data-i18n-html (innerHTML, for
 * strings that contain inline markup like <strong>/<a>). The page <title> and
 * meta description use the meta.title / meta.description keys.
 *
 * Language choice: ?lang= in the URL, else a saved choice, else the browser
 * language, else English. The choice persists in localStorage.
 */
(function () {
  var SUPPORTED = ['en', 'de', 'fr', 'es', 'zh-Hans', 'zh-Hant', 'ko', 'ja', 'th'];
  var NAMES = {
    en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español',
    'zh-Hans': '简体中文', 'zh-Hant': '繁體中文', ko: '한국어', ja: '日本語', th: 'ไทย',
  };
  var KEY = 'element08.lang';
  var cache = {};

  function detect() {
    try {
      var s = localStorage.getItem(KEY);
      if (s && SUPPORTED.indexOf(s) >= 0) return s;
    } catch (e) { /* storage blocked */ }
    var q = new URLSearchParams(location.search).get('lang');
    if (q && SUPPORTED.indexOf(q) >= 0) return q;
    var navs = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < navs.length; i++) {
      var lc = String(navs[i]).toLowerCase();
      if (lc.indexOf('zh') === 0) {
        if (lc.indexOf('hant') >= 0 || lc.indexOf('tw') >= 0 || lc.indexOf('hk') >= 0 || lc.indexOf('mo') >= 0) return 'zh-Hant';
        return 'zh-Hans';
      }
      var base = lc.split('-')[0];
      for (var j = 0; j < SUPPORTED.length; j++) {
        if (SUPPORTED[j] === lc || SUPPORTED[j].split('-')[0] === base) return SUPPORTED[j];
      }
    }
    return 'en';
  }

  // Snapshot the English source from the DOM so we can restore it for 'en' and
  // fall back to it for any key a translation happens to be missing. The page
  // <title> uses data-i18n (textContent); the meta description uses
  // data-i18n-content (sets the content attribute) — so each page declares its
  // own keys even though all pages share one <lang>.json.
  var orig = { text: {}, html: {}, content: {} };
  function snapshot() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      orig.text[el.getAttribute('data-i18n')] = el.textContent;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      orig.html[el.getAttribute('data-i18n-html')] = el.innerHTML;
    });
    document.querySelectorAll('[data-i18n-content]').forEach(function (el) {
      orig.content[el.getAttribute('data-i18n-content')] = el.getAttribute('content');
    });
  }

  function apply(dict) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var v = (dict && dict[k] != null) ? dict[k] : orig.text[k];
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-html');
      var v = (dict && dict[k] != null) ? dict[k] : orig.html[k];
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-content]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-content');
      var v = (dict && dict[k] != null) ? dict[k] : orig.content[k];
      if (v != null) el.setAttribute('content', v);
    });
  }

  function setLang(lang, persist) {
    document.documentElement.setAttribute('lang', lang);
    var sel = document.getElementById('lang-select');
    if (sel) sel.value = lang;
    if (persist) {
      try { localStorage.setItem(KEY, lang); } catch (e) { /* storage blocked */ }
    }
    if (lang === 'en') { apply(null); return; }
    if (cache[lang]) { apply(cache[lang]); return; }
    fetch('i18n/' + lang + '.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) { cache[lang] = d; apply(d); } })
      .catch(function () { /* keep English on failure */ });
  }

  function buildSwitcher() {
    var sel = document.getElementById('lang-select');
    if (!sel) return;
    SUPPORTED.forEach(function (l) {
      var o = document.createElement('option');
      o.value = l;
      o.textContent = NAMES[l];
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { setLang(sel.value, true); });
  }

  function init() {
    snapshot();
    buildSwitcher();
    // An explicit ?lang= wins over a saved choice (shareable localized links)
    // and is persisted; otherwise fall back to saved choice / browser language.
    var url = new URLSearchParams(location.search).get('lang');
    if (url && SUPPORTED.indexOf(url) >= 0) {
      setLang(url, true);
    } else {
      setLang(detect(), false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
