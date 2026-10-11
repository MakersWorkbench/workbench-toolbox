/* Workbench Toolbox shell. Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. */
(function () {
  'use strict';
  var REG = window.TMWB_REGISTRY, TOOLS = REG.tools;
  var $ = function (id) { return document.getElementById(id); };
  var home = $('homeView'), host = $('toolHost'), about = $('aboutView'), body = $('homeBody'), search = $('search');
  var backBtn = $('backBtn'), topTitle = $('topTitle'), themeBtn = $('themeBtn'), loading = $('loading');
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- storage (every access guarded: it can throw in private windows) ---------- */
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem('tmwb.' + k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('tmwb.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  /* ---------- icons ---------- */
  var ICON = {
    decoder: '<path d="M2 12h4l2-5 3 10 3-10 2 5h6"/><path d="M9 4v3M15 17v3"/>',
    calculators: '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><rect x="8" y="5.5" width="8" height="4" rx="1"/><path d="M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 17h.01M12 17h.01M15.5 17h.01"/>',
    embedded: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><path d="M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21"/><rect x="10" y="10" width="4" height="4"/>',
    power: '<rect x="2.5" y="7" width="16" height="10" rx="2"/><path d="M21.5 10.5v3"/><path d="M11 9.5l-2.5 3h4l-2.5 3"/>',
    pcb: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h6l4 6h-9l-1 6h-3M17 12h3"/>',
    bench: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l1.5 1.5M13 7l2 2"/>'
  };
  function svgIcon(name) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICON[name] || ICON.bench; return s; }
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>';

  /* ---------- theme ---------- */
  var themePref = load('theme', 'system');          // system | light | dark
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  var THEME_LABEL = { system: 'Theme: follow system', light: 'Theme: light', dark: 'Theme: dark' };
  var THEME_ICON = {
    system: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/></svg>'
  };
  function applyTheme() {
    var t = themePref === 'system' ? (mq && mq.matches ? 'light' : 'dark') : themePref;
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'light' ? '#ffffff' : '#101216');
    themeBtn.innerHTML = THEME_ICON[themePref]; themeBtn.setAttribute('aria-label', THEME_LABEL[themePref] + '. Press to change.');
  }
  function cycleTheme() { themePref = { system: 'light', light: 'dark', dark: 'system' }[themePref]; save('theme', themePref); applyTheme(); }
  themeBtn.addEventListener('click', cycleTheme);
  if (mq) (mq.addEventListener ? mq.addEventListener('change', applyTheme) : mq.addListener(applyTheme));
  applyTheme();

  /* ---------- favorites and recents ---------- */
  var favs = load('fav', []), recents = load('recent', []);
  function toolById(id) { return TOOLS.filter(function (t) { return t.id === id; })[0]; }
  function toggleFav(id) { var i = favs.indexOf(id); if (i < 0) favs.push(id); else favs.splice(i, 1); save('fav', favs); renderHome(); }
  function pushRecent(id) { recents = [id].concat(recents.filter(function (x) { return x !== id; })).slice(0, 4); save('recent', recents); }

  /* ---------- home ---------- */
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function card(t, idx) {
    var wrap = el('div', 'cardwrap');
    var a = el('a', 'card'); a.href = '#/t/' + t.id;
    var tile = el('span', 'tile'); tile.appendChild(svgIcon(t.id)); a.appendChild(tile);
    var txt = el('span', 'txt');
    txt.appendChild(el('span', 'name', t.name)); txt.appendChild(el('span', 'desc', t.tagline));
    var meta = el('span', 'meta', t.tabs.length + ' tabs'); txt.appendChild(meta);
    if (idx != null && idx < 6) meta.appendChild(el('span', 'kbdhint', '  ·  press ' + (idx + 1)));
    a.appendChild(txt); wrap.appendChild(a);
    var f = el('button', 'fav'); f.type = 'button'; f.innerHTML = STAR;
    var on = favs.indexOf(t.id) >= 0; f.setAttribute('aria-pressed', on);
    f.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + t.name + (on ? ' from favorites' : ' to favorites'));
    f.addEventListener('click', function () { toggleFav(t.id); });
    wrap.appendChild(f);
    var links = el('div', 'cardlinks');
    [[t.wiki, 'User guide'], [t.repoUrl, 'GitHub']].forEach(function (l) { var x = el('a', null, l[1]); x.href = l[0]; x.target = '_blank'; x.rel = 'noopener'; links.appendChild(x); });
    wrap.appendChild(links); return wrap;
  }
  function section(title, tools) {
    var s = el('div'); s.appendChild(el('h2', 'sec', title));
    var g = el('div', 'grid'); tools.forEach(function (t) { g.appendChild(card(t, TOOLS.indexOf(t))); }); s.appendChild(g); return s;
  }
  function words(q) { return q.toLowerCase().split(/[^a-z0-9.µΩ+#]+/).filter(Boolean); }
  function hay(s) { return s.toLowerCase(); }
  function renderHome() {
    var q = search.value.trim(); body.textContent = '';
    if (!q) {
      var fv = favs.map(toolById).filter(Boolean), rc = recents.map(toolById).filter(Boolean);
      if (fv.length) body.appendChild(section('Favorites', fv));
      if (rc.length) body.appendChild(section('Recently used', rc));
      body.appendChild(section(fv.length || rc.length ? 'All tools' : 'Tools', TOOLS));
      return;
    }
    var ws = words(q), toolHits = [], tabHits = [];
    TOOLS.forEach(function (t) {
      var th = hay(t.name + ' ' + t.tagline);
      if (ws.every(function (w) { return th.indexOf(w) >= 0; })) toolHits.push(t);
      t.tabs.forEach(function (tab, i) {
        var h = hay(tab + ' ' + t.name);
        if (ws.every(function (w) { return h.indexOf(w) >= 0; }) && ws.some(function (w) { return tab.toLowerCase().indexOf(w) >= 0; })) tabHits.push([t, tab, i]);
      });
    });
    if (toolHits.length) body.appendChild(section('Tools', toolHits));
    if (tabHits.length) {
      body.appendChild(el('h2', 'sec', 'Tabs inside tools'));
      var ul = el('ul', 'tabhits');
      tabHits.forEach(function (h) {
        var li = el('li'), a = el('a'); a.href = '#/t/' + h[0].id + '?tab=' + encodeURIComponent(h[1]);
        a.appendChild(el('strong', null, h[1])); a.appendChild(el('small', null, 'in ' + h[0].name));
        li.appendChild(a); ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    if (!toolHits.length && !tabHits.length) body.appendChild(el('p', 'empty', 'Nothing matches "' + q + '". Try a part name, a unit, or a tool name.'));
  }
  search.addEventListener('input', renderHome);
  search.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var a = body.querySelector('.tabhits a, .card'); if (a) a.click(); }
    if (e.key === 'Escape' && search.value) { search.value = ''; renderHome(); e.stopPropagation(); }
  });

  /* ---------- tool mounting ---------- */
  var cssDone = {}, scriptP = {}, mounted = {};
  function loadCss(href) {
    if (cssDone[href]) return cssDone[href];
    return cssDone[href] = new Promise(function (res) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = l.onerror = res; document.head.appendChild(l); });
  }
  function loadScript(src) {
    if (scriptP[src]) return scriptP[src];
    return scriptP[src] = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { delete scriptP[src]; rej(new Error('Could not load ' + src)); }; document.body.appendChild(s); });
  }
  function mount(t) {
    if (mounted[t.id]) return Promise.resolve(mounted[t.id]);
    var base = 'tools/' + t.id + '/';
    return loadCss(base + t.css).then(function () {
      return t.scripts.reduce(function (p, s) { return p.then(function () { return loadScript(base + s); }); }, Promise.resolve());
    }).then(function () {
      var wrap = el('div', 'toolwrap'); wrap.hidden = true; wrap.dataset.tool = t.id;
      var root = el('div', t.rootClass); root.id = t.rootId;
      Object.keys(t.mountAttrs || {}).forEach(function (k) { root.setAttribute(k, t.mountAttrs[k]); });
      wrap.appendChild(root); host.appendChild(wrap);
      return loadScript(base + t.app).then(function () { mounted[t.id] = wrap; return wrap; });
    });
  }
  function selectTab(wrap, label) {
    if (!label) return;
    var btns = wrap.querySelectorAll('.tabbar button');
    for (var i = 0; i < btns.length; i++) if (btns[i].textContent.trim() === label) { btns[i].click(); return; }
  }

  /* ---------- about ---------- */
  var aboutBuilt = false;
  function buildAbout() {
    if (aboutBuilt) return; aboutBuilt = true;
    var d = el('div', 'about');
    d.appendChild(el('h1', null, 'About Workbench Toolbox'));
    d.appendChild(el('p', 'ver', 'Version ' + REG.version));
    d.appendChild(el('p', null, 'One free app with every browser tool from The Makers Workbench. Everything runs on your device, so it works with no internet once installed. There is no tracking, no analytics, no cookies, and no network calls while you use it.'));
    d.appendChild(el('p', null, 'Affiliate links: none in this app.'));
    var h = el('h2', null, 'The tools'); d.appendChild(h);
    var tb = el('table'), thead = el('thead'), hr = el('tr');
    ['Tool', 'Guide', 'Source'].forEach(function (x) { hr.appendChild(el('th', null, x)); }); thead.appendChild(hr); tb.appendChild(thead);
    var tbody = el('tbody');
    TOOLS.forEach(function (t) {
      var tr = el('tr'); tr.appendChild(el('td', null, t.name));
      [[t.wiki, 'User guide (wiki)'], [t.repoUrl, 'GitHub']].forEach(function (l) { var td = el('td'), a = el('a', null, l[1]); a.href = l[0]; a.target = '_blank'; a.rel = 'noopener'; td.appendChild(a); tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody); d.appendChild(tb);
    d.appendChild(el('h2', null, 'Install on your phone or computer'));
    d.appendChild(el('p', null, 'Windows, Mac, Android and iPhone: open this page in a browser and use the install option. Chrome and Edge show an install icon in the address bar. On iPhone, open it in Safari, tap Share, then Add to Home Screen. Installer files for Windows, Mac, Linux and Android are on the GitHub releases page.'));
    var a1 = el('a', 'btn primary', 'App source and releases on GitHub'); a1.href = 'https://github.com/MakersWorkbench/workbench-toolbox'; a1.target = '_blank'; a1.rel = 'noopener'; a1.style.display = 'inline-flex'; a1.style.alignItems = 'center'; a1.style.textDecoration = 'none';
    d.appendChild(a1);
    d.appendChild(el('h2', null, 'License and third-party notices'));
    d.appendChild(el('p', null, 'Workbench Toolbox and every tool inside it are free and open source under the Apache License, Version 2.0. Developed and maintained by TheMakersWorkbench.com.'));
    var det = el('details'); det.appendChild(el('summary', null, 'Show license and notices'));
    var pre = el('pre', null, 'Loading...'); det.appendChild(pre); d.appendChild(det);
    det.addEventListener('toggle', function () {
      if (!det.open || pre.dataset.done) return; pre.dataset.done = '1';
      fetch('legal/NOTICES.txt').then(function (r) { return r.text(); }).then(function (t) { pre.textContent = t; }).catch(function () { pre.textContent = 'Could not load the notices file. See the LICENSE and NOTICE files in the GitHub repository.'; });
    });
    d.appendChild(el('h2', null, 'Keyboard shortcuts'));
    var kb = el('button', 'btn', 'Show shortcuts'); kb.type = 'button'; kb.addEventListener('click', showKeys); d.appendChild(kb);
    d.appendChild(el('p', 'hack', 'Hack The World & Make Awesome!'));
    about.appendChild(d);
  }
  function showKeys() { var dl = $('keysDialog'); if (dl.showModal) dl.showModal(); }

  /* ---------- router ---------- */
  var depth = 0;
  function parse() {
    var h = location.hash.replace(/^#/, '') || '/', qi = h.indexOf('?'), path = qi >= 0 ? h.slice(0, qi) : h, qs = qi >= 0 ? h.slice(qi + 1) : '';
    var tab = null; qs.split('&').forEach(function (p) { if (p.indexOf('tab=') === 0) tab = decodeURIComponent(p.slice(4)); });
    var m = path.match(/^\/t\/([a-z]+)$/);
    if (m && toolById(m[1])) return { view: 'tool', tool: toolById(m[1]), tab: tab };
    if (path === '/about') return { view: 'about' };
    return { view: 'home' };
  }
  var token = 0;
  function route() {
    var r = parse(), my = ++token;
    home.hidden = r.view !== 'home'; about.hidden = r.view !== 'about'; host.hidden = r.view !== 'tool';
    backBtn.hidden = r.view === 'home';
    $('brand').querySelector('img').hidden = r.view !== 'home';
    Array.prototype.forEach.call(host.children, function (c) { c.hidden = true; });
    window.scrollTo(0, 0);
    if (r.view === 'home') { topTitle.textContent = 'Workbench Toolbox'; document.title = 'Workbench Toolbox'; renderHome(); }
    else if (r.view === 'about') { topTitle.textContent = 'About'; document.title = 'About | Workbench Toolbox'; buildAbout(); }
    else {
      var t = r.tool; topTitle.textContent = t.name; document.title = t.name + ' | Workbench Toolbox';
      loading.hidden = false;
      mount(t).then(function (wrap) {
        if (my !== token) return;
        loading.hidden = true; wrap.hidden = false; pushRecent(t.id); selectTab(wrap, r.tab);
      }).catch(function (e) { loading.hidden = true; host.appendChild(el('p', 'empty', 'Sorry, this tool could not load. ' + e.message)); });
    }
  }
  function goHome() { if (depth > 0) history.back(); else location.replace('#/'); }
  backBtn.addEventListener('click', goHome);
  window.addEventListener('hashchange', function () { depth = Math.max(0, parseInt((history.state && history.state.d) || 0, 10)); route(); });
  // count in-app navigations so the back button can use real history when there is some
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/"]'); if (!a) return;
    try { history.replaceState({ d: depth }, ''); } catch (x) { /* ignore */ }
    depth += 1; setTimeout(function () { try { history.replaceState({ d: depth }, ''); } catch (x) { /* ignore */ } }, 0);
  }, true);

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if (e.altKey && e.key === 'ArrowLeft') { if (parse().view !== 'home') { e.preventDefault(); goHome(); } return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    var v = parse().view;
    if (e.key === 'Escape') { if (v !== 'home') goHome(); }
    else if (e.key === '/') { if (v !== 'home') location.hash = '#/'; e.preventDefault(); setTimeout(function () { search.focus(); search.select(); }, 0); }
    else if (e.key === '?') showKeys();
    else if (e.key === 't' || e.key === 'T') cycleTheme();
    else if (v === 'home' && /^[1-9]$/.test(e.key) && TOOLS[+e.key - 1]) location.hash = '#/t/' + TOOLS[+e.key - 1].id;
  });

  /* ---------- offline support and update flow ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (refreshing) return; refreshing = true; location.reload(); });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      function offer(w) { $('updateBanner').hidden = false; $('reloadBtn').onclick = function () { w.postMessage('SKIP_WAITING'); }; }
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing; if (!w) return;
        w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
      });
      // look for a new version each time the app comes back to the foreground
      document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () { /* offline */ }); });
    }).catch(function () { /* the app still works online without the worker */ });
  }

  if (!location.hash) { try { history.replaceState({ d: 0 }, ''); } catch (x) { /* ignore */ } }
  route();
})();
