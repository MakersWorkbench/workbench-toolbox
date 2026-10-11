/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* TMWB Component Decoder UI. Layout inspired by VoxelCubes/ResistorDecoder (GPL-3, no code reused). */
(function () {
  'use strict';
  var R = ResistorLogic, S = SMDLogic, C = CapLogic, I = IndLogic, X = XtalLogic, PARTS = PartsData.PARTS;
  var root = document.getElementById('tmwb-dec');
  if (!root) return;   /* nothing to mount on (for example a page without the tool) */
  /* Optional embed settings on the mount element: data-heading="h2" (heading level of the title), data-hash="off" (do not read or write the URL hash), data-solo="on" */
  var HEADING = /^h[1-6]$/.test(root.getAttribute('data-heading') || '') ? root.getAttribute('data-heading') : 'h1';
  var USE_HASH = root.getAttribute('data-hash') !== 'off';

  /* ---------- helpers ---------- */
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function rows(list) {
    return '<div class="results">' + list.map(function (r) {
      return '<div class="k">' + esc(r[0]) + '</div><div class="v' + (r[2] ? ' big' : '') + '">' + esc(r[1]) + '</div>';
    }).join('') + '</div>';
  }
  function steps(list) { return list && list.length ? '<ol class="steps">' + list.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' : ''; }
  function notes(list) { return (list || []).filter(Boolean).map(function (n) { return '<p class="note">' + esc(n) + '</p>'; }).join(''); }
  function err(m) { return '<div class="err">' + esc(m) + '</div>'; }
  function pills(items, current, attr) {
    return '<div class="pills">' + items.map(function (it) { return '<button data-' + attr + '="' + it[0] + '" aria-pressed="' + (it[0] == current) + '">' + esc(it[1]) + '</button>'; }).join('') + '</div>';
  }
  function tryRow(list) {
    return '<div class="tryrow"><span>Try:</span>' + list.map(function (t) { return '<button class="chip" data-try="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>';
  }
  function inputRow(value, label, maxlen) {
    return '<div class="inputrow"><div class="box"><input type="text" id="q" value="' + esc(value) + '" autocomplete="off" spellcheck="false" aria-label="' + esc(label) + '"' + (maxlen ? ' maxlength="' + maxlen + '"' : '') + '></div></div>';
  }
  function wireInput(pane, fn) {
    var q = $('#q', pane);
    q.addEventListener('input', fn);
    pane.querySelectorAll('[data-try]').forEach(function (b) { b.onclick = function () { q.value = b.getAttribute('data-try'); fn(); q.focus(); }; });
  }

  /* ---------- graphics ---------- */
  var RES_BODY = 'M96 24 C70 24 62 38 62 50 L62 90 C62 102 70 116 96 116 L118 116 C140 116 140 98 168 98 L312 98 C340 98 340 116 362 116 L384 116 C410 116 418 102 418 90 L418 50 C418 38 410 24 384 24 L362 24 C340 24 340 42 312 42 L168 42 C140 42 140 24 118 24 Z';
  /* band x positions (left edge) per band count, following textbook layouts: digits and multiplier bunch left, tolerance (and tempco) set apart on the right */
  var RES_X = { 1: [233], 3: [132, 174, 216], 4: [132, 174, 216, 322], 5: [124, 164, 204, 244, 322], 6: [116, 150, 184, 218, 288, 340] };
  function resistorSVG(bands, bodyColor) {
    var n = bands.length, x = RES_X[n] || RES_X[4], i, bw = (n === 6 ? 14 : 16);
    var s = '<svg class="gfx" viewBox="0 -26 480 192" role="img" aria-label="Resistor with color bands"><defs><clipPath id="resclip"><path d="' + RES_BODY + '"/></clipPath>' +
      '<linearGradient id="resshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>' +
      '<rect x="6" y="64" width="468" height="12" rx="6" fill="#9aa3ad"/><rect x="6" y="64" width="468" height="5" rx="2" fill="#fff" opacity=".25"/>' +
      '<path d="' + RES_BODY + '" fill="' + (bodyColor || '#e3cb98') + '"/><g clip-path="url(#resclip)">';
    for (i = 0; i < n; i++) s += '<rect x="' + x[i] + '" y="20" width="' + bw + '" height="100" fill="' + R.HEX[bands[i]] + '"/>';
    s += '<rect x="60" y="20" width="360" height="100" fill="url(#resshade)"/></g><path d="' + RES_BODY + '" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>';
    if (n > 1) {
      var roles = R.ROLES[n], di = 0, ord = ['1st Band', '2nd Band', '3rd Band'], up = false;
      for (i = 0; i < n; i++) {
        var role = roles[i], text = role === 'digit' ? ord[di++] : role === 'mult' ? 'Multiplier' : role === 'tol' ? 'Tolerance' : 'Temp. Coeff.';
        var cx = x[i] + bw / 2;
        s += up ? '<line x1="' + cx + '" y1="44" x2="' + cx + '" y2="4" stroke="#8d97a6" stroke-width="1.5"/><text x="' + cx + '" y="-6" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="13" fill="#c3ccd8">' + text + '</text>'
          : '<line x1="' + cx + '" y1="96" x2="' + cx + '" y2="138" stroke="#8d97a6" stroke-width="1.5"/><text x="' + cx + '" y="156" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="13" fill="#c3ccd8">' + text + '</text>';
        up = !up;
      }
    }
    return s + '</svg>';
  }
  function smdChipSVG(text) {
    var fs = text.length > 4 ? 40 : 54;
    return '<svg class="gfx" viewBox="0 0 400 170" role="img" aria-label="SMD chip resistor marked ' + esc(text) + '">' +
      '<rect x="46" y="112" width="308" height="24" rx="5" fill="#0b0b0b"/><rect x="46" y="112" width="48" height="24" rx="5" fill="#8d9298"/><rect x="306" y="112" width="48" height="24" rx="5" fill="#8d9298"/>' +
      '<rect x="46" y="24" width="308" height="96" rx="6" fill="#121212" stroke="#2b2b2b"/>' +
      '<rect x="46" y="24" width="52" height="96" rx="6" fill="#d3d7dc"/><rect x="302" y="24" width="52" height="96" rx="6" fill="#d3d7dc"/>' +
      '<rect x="46" y="24" width="52" height="14" rx="6" fill="#fff" opacity=".35"/><rect x="302" y="24" width="52" height="14" rx="6" fill="#fff" opacity=".35"/>' +
      '<rect x="98" y="24" width="204" height="96" fill="#0d0d0d"/><rect x="98" y="24" width="204" height="7" fill="#fff" opacity=".07"/>' +
      '<text x="200" y="92" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + fs + '" fill="#f4f4f4">' + esc(text || '···') + '</text></svg>';
  }
  function mlccSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 170" role="img" aria-label="SMD ceramic capacitor (MLCC)' + (text ? ' marked ' + esc(text) : '') + '">' +
      '<rect x="56" y="112" width="288" height="24" rx="5" fill="#4a3220"/><rect x="56" y="112" width="52" height="24" rx="5" fill="#8d9298"/><rect x="292" y="112" width="52" height="24" rx="5" fill="#8d9298"/>' +
      '<rect x="56" y="30" width="288" height="90" rx="6" fill="#b88a5a" stroke="#8a6238"/><rect x="108" y="30" width="184" height="90" fill="#a97b4c"/>' +
      '<rect x="108" y="30" width="184" height="8" fill="#fff" opacity=".12"/>' +
      '<rect x="56" y="30" width="56" height="90" rx="6" fill="#d3d7dc"/><rect x="288" y="30" width="56" height="90" rx="6" fill="#d3d7dc"/>' +
      '<rect x="56" y="30" width="56" height="14" rx="6" fill="#fff" opacity=".35"/><rect x="288" y="30" width="56" height="14" rx="6" fill="#fff" opacity=".35"/>' +
      (text ? '<text x="200" y="88" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + (text.length > 4 ? 26 : 36) + '" fill="#3a2410" opacity=".85">' + esc(text) + '</text>' : '') + '</svg>';
  }
  function toLines(x) { return Array.isArray(x) ? x : [x || '']; }
  function textLines(lines, cx, y0, size, fill, step) {
    return lines.map(function (t, i) { return '<text x="' + cx + '" y="' + (y0 + i * step) + '" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + (String(t).length > 6 ? size - 6 : size) + '" font-weight="600" fill="' + fill + '">' + esc(t) + '</text>'; }).join('');
  }
  /* SMD aluminum electrolytic / polymer can: silver top with a tinted polarity segment over a black base */
  function elecSVG(text) {
    var L = toLines(text);
    return '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="SMD aluminum electrolytic capacitor' + (L[0] ? ' marked ' + esc(L.join(' ')) : '') + '"><defs><clipPath id="ecl"><ellipse cx="200" cy="66" rx="84" ry="34"/></clipPath></defs>' +
      '<rect x="92" y="138" width="216" height="26" rx="4" fill="#121212"/><rect x="80" y="150" width="22" height="9" fill="#c9cdd2"/><rect x="298" y="150" width="22" height="9" fill="#c9cdd2"/>' +
      '<rect x="116" y="66" width="168" height="72" fill="#b9bdc3"/><ellipse cx="200" cy="138" rx="84" ry="22" fill="#a4a8ae"/>' +
      '<rect x="116" y="66" width="168" height="72" fill="#fff" opacity=".12"/>' +
      '<ellipse cx="200" cy="66" rx="84" ry="34" fill="#dcdfe2"/><g clip-path="url(#ecl)"><rect x="110" y="20" width="62" height="90" fill="#6a4aa8"/></g>' +
      '<ellipse cx="200" cy="66" rx="84" ry="34" fill="none" stroke="rgba(0,0,0,.25)"/>' + textLines(L, 224, 62, 22, '#2b2d33', 22) + '</svg>';
  }
  /* radial aluminum electrolytic: tall dark can, silver negative stripe with oval cutouts, vertical print, shorter negative lead */
  function relecSVG(text) {
    var L = toLines(text), val = L[0] || '', volt = L[1] || '', i, cut = '', lab = 'font-family="Segoe UI,Arial,sans-serif" font-size="15" fill="#c3ccd8"';
    for (i = 0; i < 3; i++) cut += '<ellipse cx="170" cy="' + (48 + i * 36) + '" rx="6" ry="12" fill="#14161a"/><text x="170" y="' + (53 + i * 36) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#cfd4da">−</text>';
    var print = (val + (volt ? '   ' + volt : '')).trim() || '···';
    return '<svg class="gfx" viewBox="0 0 420 236" role="img" aria-label="Radial electrolytic capacitor' + (val ? ' marked ' + esc(L.join(' ')) : '') + '">' +
      '<defs><linearGradient id="rcan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient></defs>' +
      '<rect x="172" y="150" width="4" height="46" fill="#aeb4bb"/><rect x="224" y="150" width="4" height="62" fill="#aeb4bb"/>' +
      '<rect x="148" y="22" width="104" height="132" rx="9" fill="#1b1d22"/>' +
      '<rect x="148" y="22" width="26" height="132" rx="6" fill="#a5abb3"/>' + cut +
      '<rect x="148" y="22" width="104" height="10" rx="5" fill="#c8ccd2"/><rect x="148" y="146" width="104" height="8" rx="4" fill="#9aa0a8"/>' +
      '<rect x="148" y="22" width="104" height="132" rx="9" fill="url(#rcan)"/>' +
      '<text transform="translate(222 140) rotate(-90)" font-family="Segoe UI,Arial,sans-serif" font-size="' + (print.length > 13 ? 15 : 20) + '" font-weight="700" fill="#f4f6f9">' + esc(print) + '</text>' +
      '<line x1="148" y1="70" x2="96" y2="70" stroke="#8d97a6"/><text x="92" y="66" text-anchor="end" ' + lab + '>Capacitance (µF)</text>' +
      '<line x1="252" y1="90" x2="300" y2="90" stroke="#8d97a6"/><text x="304" y="86" ' + lab + '>Max voltage (V)</text>' +
      '<line x1="174" y1="192" x2="150" y2="214" stroke="#8d97a6"/><text x="146" y="228" text-anchor="end" ' + lab + '>Cathode (−)</text>' +
      '<line x1="226" y1="208" x2="250" y2="220" stroke="#8d97a6"/><text x="254" y="226" ' + lab + '>Anode (+)</text></svg>';
  }
  /* radial (dipped) tantalum: orange teardrop with value, voltage and a + beside the positive lead */
  function rtantSVG(text) {
    var L = toLines(text);
    return '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="Dipped radial tantalum capacitor' + (L[0] ? ' marked ' + esc(L.join(' ')) : '') + '">' +
      '<rect x="164" y="130" width="5" height="56" fill="#aeb4bb"/><rect x="232" y="130" width="5" height="56" fill="#aeb4bb"/>' +
      '<path d="M122 132 L122 82 Q122 20 200 20 Q278 20 278 82 L278 132 Z" fill="#e0952a"/><path d="M122 132 L122 82 Q122 20 200 20 Q278 20 278 82 L278 132 Z" fill="none" stroke="rgba(0,0,0,.25)"/>' +
      '<ellipse cx="160" cy="56" rx="18" ry="26" fill="#fff" opacity=".14"/>' + textLines(L, 200, 80, 30, '#3a2205', 34) + '</svg>';
  }
  function filmSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 170" role="img" aria-label="Film capacitor' + (text ? ' marked ' + esc(text) : '') + '"><rect x="140" y="130" width="6" height="36" fill="#aeb4bb"/><rect x="254" y="130" width="6" height="36" fill="#aeb4bb"/>' +
      '<rect x="100" y="24" width="200" height="110" rx="10" fill="#d9a21b"/><rect x="100" y="24" width="200" height="12" rx="6" fill="#fff" opacity=".18"/>' +
      '<text x="200" y="92" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + ((text || '').length > 5 ? 26 : 38) + '" font-weight="600" fill="#2f2005">' + esc(text || '···') + '</text></svg>';
  }
  function discSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 170" role="img" aria-label="Ceramic capacitor marked ' + esc(text) + '"><rect x="150" y="120" width="6" height="45" fill="#aeb4bb"/><rect x="244" y="120" width="6" height="45" fill="#aeb4bb"/>' +
      '<circle cx="200" cy="72" r="62" fill="#d98a2b"/><circle cx="178" cy="50" r="18" fill="#fff" opacity=".13"/>' +
      '<text x="200" y="84" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + (text.length > 4 ? 28 : 38) + '" font-weight="600" fill="#3a2205">' + esc(text || '···') + '</text></svg>';
  }
  function tantalumSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 170" role="img" aria-label="SMD tantalum capacitor' + (text ? ' marked ' + esc(text) : '') + '">' +
      '<rect x="64" y="124" width="272" height="22" rx="4" fill="#8a6a10"/><rect x="64" y="130" width="50" height="12" fill="#c9cdd2"/><rect x="286" y="130" width="50" height="12" fill="#c9cdd2"/>' +
      '<rect x="84" y="30" width="232" height="100" rx="10" fill="#e8b92d" stroke="#b58c14"/><rect x="84" y="30" width="232" height="12" rx="6" fill="#fff" opacity=".22"/>' +
      '<rect x="84" y="30" width="50" height="100" rx="10" fill="#6b4a10"/><rect x="116" y="30" width="18" height="100" fill="#6b4a10"/>' +
      '<text x="109" y="92" text-anchor="middle" font-size="30" font-weight="700" fill="#e8b92d">+</text>' +
      '<text x="228" y="88" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + ((text || '').length > 5 ? 28 : 38) + '" font-weight="600" fill="#2b1d03">' + esc(text || '···') + '</text></svg>';
  }
  function smdInductorSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 150" role="img" aria-label="SMD inductor marked ' + esc(text) + '"><rect x="90" y="20" width="220" height="110" rx="10" fill="#1b1b1e"/>' +
      '<rect x="90" y="20" width="26" height="110" rx="10" fill="#c9cdd2"/><rect x="284" y="20" width="26" height="110" rx="10" fill="#c9cdd2"/>' +
      '<text x="200" y="90" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="44" fill="#fff">' + esc(text || '···') + '</text></svg>';
  }
  function roundPowerSVG(text) {
    var turns = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300].map(function (x) { return '<line x1="' + x + '" y1="88" x2="' + x + '" y2="106" stroke="#7a4310" stroke-width="2"/>'; }).join('');
    return '<svg class="gfx" viewBox="0 0 400 170" role="img" aria-label="Round SMD power inductor' + (text ? ' marked ' + esc(text) : '') + '">' +
      '<rect x="70" y="118" width="60" height="14" rx="3" fill="#c9cdd2"/><rect x="270" y="118" width="60" height="14" rx="3" fill="#c9cdd2"/>' +
      '<ellipse cx="200" cy="112" rx="112" ry="26" fill="#1d1d20"/><rect x="88" y="70" width="224" height="42" fill="#27282c"/>' +
      '<rect x="88" y="88" width="224" height="18" fill="#c9792a"/>' + turns +
      '<ellipse cx="200" cy="70" rx="112" ry="34" fill="#3c3d43"/><ellipse cx="200" cy="66" rx="100" ry="27" fill="#45464d"/>' +
      '<text x="200" y="76" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + ((text || '').length > 5 ? 20 : 28) + '" font-weight="600" fill="#f1f1f1">' + esc(text || '···') + '</text></svg>';
  }
  function shieldedSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 170" role="img" aria-label="Shielded SMD inductor' + (text ? ' marked ' + esc(text) : '') + '">' +
      '<rect x="80" y="118" width="62" height="14" rx="3" fill="#d8b24a"/><rect x="258" y="118" width="62" height="14" rx="3" fill="#d8b24a"/>' +
      '<rect x="80" y="30" width="240" height="96" rx="8" fill="#55585e" stroke="#2b2d31"/><rect x="80" y="30" width="240" height="14" rx="6" fill="#fff" opacity=".16"/>' +
      '<rect x="92" y="42" width="216" height="72" rx="4" fill="#4a4d53"/>' +
      '<text x="200" y="92" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + ((text || '').length > 5 ? 28 : 40) + '" font-weight="600" fill="#f3f3f3">' + esc(text || '···') + '</text></svg>';
  }
  function dotsSVG(style, dots) {
    var lab = ['1st Digit', '2nd Digit', 'Multiplier'], s = '<svg class="gfx" viewBox="0 -4 400 190" role="img" aria-label="Inductor with marking dots">', i, pos, below = [];
    if (style === 'rf') {
      s += '<rect x="70" y="52" width="260" height="70" rx="6" fill="#2d55b3" stroke="#1d3a80"/><rect x="70" y="52" width="260" height="10" rx="5" fill="#fff" opacity=".18"/>' +
        '<rect x="70" y="52" width="34" height="70" rx="6" fill="#d3d7dc"/><rect x="296" y="52" width="34" height="70" rx="6" fill="#d3d7dc"/>' +
        '<circle cx="130" cy="87" r="9" fill="#f6d90b" stroke="rgba(0,0,0,.4)"/><text x="130" y="40" text-anchor="middle" font-size="13" fill="#c3ccd8">Identifier</text>' +
        '<line x1="130" y1="50" x2="130" y2="44" stroke="#8d97a6" stroke-width="1.2"/>';
      pos = [[175, 87], [220, 87], [265, 87]]; below = [true, true, true];
    } else {
      s += '<ellipse cx="200" cy="124" rx="110" ry="26" fill="#1d1d20"/><rect x="90" y="82" width="220" height="42" fill="#27282c"/><rect x="90" y="102" width="220" height="16" fill="#c9792a"/>' +
        '<ellipse cx="200" cy="82" rx="110" ry="36" fill="#3c3d43"/><ellipse cx="200" cy="78" rx="98" ry="29" fill="#45464d"/>' +
        '<circle cx="128" cy="80" r="8" fill="#f4f4f4" stroke="rgba(0,0,0,.4)"/><text x="100" y="40" text-anchor="middle" font-size="13" fill="#c3ccd8">Identifier</text>' +
        '<line x1="124" y1="73" x2="108" y2="46" stroke="#8d97a6" stroke-width="1.2"/>';
      pos = [[200, 98], [160, 68], [248, 68]]; below = [true, false, false];
    }
    for (i = 0; i < 3; i++) {
      var x = pos[i][0], y = pos[i][1];
      s += '<circle cx="' + x + '" cy="' + y + '" r="9" fill="' + R.HEX[dots[i]] + '" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>';
      s += below[i] ? '<line x1="' + x + '" y1="' + (y + 10) + '" x2="' + x + '" y2="152" stroke="#8d97a6" stroke-width="1.2"/><text x="' + x + '" y="168" text-anchor="middle" font-size="13" fill="#c3ccd8">' + lab[i] + '</text>'
        : '<line x1="' + x + '" y1="' + (y - 10) + '" x2="' + x + '" y2="46" stroke="#8d97a6" stroke-width="1.2"/><text x="' + x + '" y="38" text-anchor="middle" font-size="13" fill="#c3ccd8">' + lab[i] + '</text>';
    }
    return s + '</svg>';
  }
  function axialInductorSVG(bands) {
    var s = '<svg class="gfx" viewBox="0 0 480 140" role="img" aria-label="Axial inductor with color bands"><rect x="10" y="64" width="460" height="12" rx="6" fill="#9aa3ad"/>' +
      '<rect x="100" y="34" width="280" height="72" rx="30" fill="#4f7f9a"/><rect x="100" y="70" width="280" height="36" rx="18" fill="#000" opacity=".14"/>';
    var xs = [148, 182, 216, 290];
    bands.forEach(function (b, i) { s += '<rect x="' + xs[i] + '" y="36" width="18" height="68" fill="' + R.HEX[b] + '" stroke="rgba(0,0,0,.35)"/>'; });
    return s + '</svg>';
  }

  /* ---------- Tab: Resistor bands ---------- */
  var DEF = { 3: ['brown', 'black', 'red'], 4: ['brown', 'black', 'red', 'gold'], 5: ['brown', 'black', 'black', 'brown', 'brown'], 6: ['brown', 'black', 'black', 'brown', 'brown', 'brown'] };
  var LBL = { digit: ['1st Digit', '2nd Digit', '3rd Digit'] };
  function multLabel(v) { return v >= 0 ? '×' + (v === 0 ? '1' : '1' + new Array(v + 1).join('0')) : (v === -1 ? '×0.1' : '×0.01'); }

  function tabResistor(pane) {
    var st = { count: 4, mode: 'bands', bands: JSON.parse(JSON.stringify(DEF)), q: '4.7kΩ 1%', cnt: 'auto' };

    function head() {
      return pills([[3, '3 Band'], [4, '4 Band'], [5, '5 Band'], [6, '6 Band'], ['value', 'Value → Bands']], st.mode === 'value' ? 'value' : st.count, 'm');
    }
    function build() {
      var h = head();
      if (st.mode === 'bands') {
        h += '<div id="gfx"></div><div class="fields" id="fields"></div><div id="res"></div>';
      } else {
        h += inputRow(st.q, 'Resistor value, for example 4.7kΩ 1%') + tryRow(['4.7kΩ 1%', '220', '4k7', '0.47 5%', '100k 0.1% 25ppm']) +
          '<div class="fields"><div class="field"><label>Bands</label><div class="sel"><select id="cnt"><option value="auto">Auto</option><option>3</option><option>4</option><option>5</option><option>6</option></select></div></div></div>' +
          '<div id="gfx"></div><div id="res"></div>' +
          '<p class="note">Accepts 4.7k, 4k7, 4.7kΩ, 2.2M, an optional tolerance like 1%, and an optional 50ppm (forces 6 bands). With no tolerance, 5% is used (1% if the value needs 3 digits).</p>';
      }
      pane.innerHTML = h;
      pane.querySelectorAll('[data-m]').forEach(function (b) {
        b.onclick = function () { var m = b.getAttribute('data-m'); if (m === 'value') st.mode = 'value'; else { st.mode = 'bands'; st.count = +m; } build(); };
      });
      if (st.mode === 'bands') buildFields(); else { $('#cnt', pane).value = st.cnt; $('#cnt', pane).onchange = function () { st.cnt = this.value; updateValue(); }; wireInput(pane, updateValue); updateValue(); }
    }
    function buildFields() {
      var roles = R.ROLES[st.count], di = 0, box = $('#fields', pane);
      box.innerHTML = roles.map(function (role, i) {
        var tbl = role === 'digit' ? R.DIGIT : role === 'mult' ? R.MULT : role === 'tol' ? R.TOL : R.PPM;
        var label = role === 'digit' ? LBL.digit[di++] : role === 'mult' ? 'Multiplier' : role === 'tol' ? 'Tolerance' : 'Temp. coeff.';
        var opts = Object.keys(tbl).map(function (c) {
          var v = tbl[c], t = role === 'digit' ? v : role === 'mult' ? multLabel(v) : role === 'tol' ? '±' + v + '%' : v + ' ppm/°C';
          return '<option value="' + c + '"' + (st.bands[st.count][i] === c ? ' selected' : '') + ' style="background:' + R.HEX[c] + ';color:' + (c === 'yellow' || c === 'white' || c === 'gold' || c === 'silver' || c === 'orange' ? '#111' : '#fff') + '">' + cap(c) + ' (' + t + ')</option>';
        }).join('');
        return '<div class="field"><label>' + label + '</label><div class="sel"><i style="background:' + R.HEX[st.bands[st.count][i]] + '"></i><select data-i="' + i + '">' + opts + '</select></div></div>';
      }).join('');
      box.querySelectorAll('select').forEach(function (sel) {
        sel.onchange = function () { st.bands[st.count][+sel.getAttribute('data-i')] = sel.value; sel.previousSibling.style.background = R.HEX[sel.value]; updateBands(); };
      });
      updateBands();
    }
    function updateBands() {
      var b = st.bands[st.count], d = R.decode(b);
      $('#gfx', pane).innerHTML = resistorSVG(b);
      var l = [['Resistance', R.formatOhms(d.value) + (d.tol != null ? ' ±' + d.tol + '%' : ''), true]];
      if (d.tol != null) { l.push(['Minimum', R.formatOhms(d.min)]); l.push(['Maximum', R.formatOhms(d.max)]); }
      if (d.ppm != null) l.push(['Temp. coefficient', d.ppm + ' ppm/°C']);
      $('#res', pane).innerHTML = rows(l);
    }
    function updateValue() {
      st.q = $('#q', pane).value;
      var p = R.parseInput(st.q), g = $('#gfx', pane), out = $('#res', pane);
      if (p.error) { g.innerHTML = ''; out.innerHTML = err(p.error); return; }
      var e = R.encode({ value: p.value, tol: p.tol, ppm: p.ppm, count: st.cnt });
      if (e.error) { g.innerHTML = ''; out.innerHTML = err(e.error); return; }
      g.innerHTML = resistorSVG(e.bands);
      var roles = e.count === 1 ? ['digit'] : R.ROLES[e.count];
      var l = [['Resistance', R.formatOhms(e.value) + (e.tol != null ? ' ±' + e.tol + '%' : ''), true]];
      out.innerHTML = rows(l) + '<ul class="bandlist">' + e.bands.map(function (c, i) {
        var r = roles[i], t = r === 'digit' ? (e.count === 1 ? 'zero ohms' : 'digit ' + R.DIGIT[c]) : r === 'mult' ? 'multiplier ' + multLabel(R.MULT[c]) : r === 'tol' ? 'tolerance ±' + R.TOL[c] + '%' : R.PPM[c] + ' ppm/°C';
        return '<li><span class="dot" style="background:' + R.HEX[c] + '"></span><b>' + cap(c) + '</b>, ' + esc(t) + '</li>';
      }).join('') + '</ul>' + notes(e.notes);
    }
    build();
  }

  /* ---------- Tab: SMD resistor ---------- */
  function tabSMD(pane) {
    pane.innerHTML = '<div id="gfx"></div>' + inputRow('1002', 'SMD resistor marking', 6) +
      tryRow(['472', '1002', '01C', '68X', '4R7', 'R47', '000']) +
      '<div class="notice">Notice: the tolerance value is only an estimate.</div><div id="res"></div>' +
      '<details class="alt"><summary>EIA-96 reference tables</summary><p class="note">The two digits pick one of 96 values (tap one to decode), and the letter is the multiplier.</p>' +
      '<div class="results" id="mt" style="grid-template-columns:repeat(6,auto);gap:4px 8px"></div><div id="e96" class="tryrow" style="margin-top:10px"></div></details>';
    function run() {
      var v = $('#q', pane).value.toUpperCase();
      $('#gfx', pane).innerHTML = smdChipSVG(v.replace(/\s/g, ''));
      var r = S.decode(v), out = $('#res', pane);
      if (r.error) { out.innerHTML = err(r.error); return; }
      out.innerHTML = r.results.map(function (x, i) {
        var l = [['Resistance', S.format(x.value) + (x.tolPct != null ? ' ±' + x.tolPct + '%' : ''), true]];
        if (x.tolPct != null) { l.push(['Minimum', S.format(x.value * (1 - x.tolPct / 100))]); l.push(['Maximum', S.format(x.value * (1 + x.tolPct / 100))]); }
        l.push(['Type', x.type]); l.push(['Tolerance', x.tolerance]);
        return '<div class="' + (i ? 'alt' : '') + '">' + (i ? '<h4>Alternate reading</h4>' : '') + rows(l) + steps(x.steps) + notes(x.notes) + '</div>';
      }).join('');
    }
    var order = ['Z', 'Y', 'R', 'X', 'S', 'A', 'B', 'H', 'C', 'D', 'E', 'F'];
    $('#mt', pane).innerHTML = order.map(function (l) { return '<div class="k">' + l + '</div><div class="v">×' + S.EIA96_MULT[l] + '</div>'; }).join('');
    $('#e96', pane).innerHTML = S.E96.map(function (v, i) { var n = ('0' + (i + 1)).slice(-2); return '<button class="chip" data-n="' + n + '">' + n + ' = ' + v + '</button>'; }).join('');
    $('#e96', pane).onclick = function (e) { var b = e.target.closest('[data-n]'); if (b) { $('#q', pane).value = b.getAttribute('data-n') + 'A'; run(); window.scrollTo(0, 0); } };
    wireInput(pane, run); run();
  }

  /* ---------- Tab: Capacitor ---------- */
  var CAPTYPES = [['auto', 'Auto'], ['mlcc', 'SMD ceramic'], ['tant', 'SMD tantalum'], ['rtant', 'Radial tantalum'], ['elec', 'SMD electrolytic'], ['relec', 'Radial electrolytic'], ['disc', 'Ceramic disc'], ['film', 'Film']];
  var CAPINFO = {
    mlcc: 'SMD ceramic (MLCC): not polarized, so either way round works. Most are completely unmarked. When a code is printed it is a 2-character EIA-198 code (like S3) or a 3-digit code (104, 105K). Sizes: 0402, 0603, 0805, 1206.',
    tant: 'SMD tantalum: POLARIZED. The stripe or bevel marks the POSITIVE (anode) end, the opposite of an aluminum electrolytic. Two styles: a 3-digit pF-style code followed by a voltage letter (107C = 100 µF 16 V, 475A = 4.7 µF 10 V, 226V = 22 µF 35 V), or the voltage letter first (G475). A second line is a lot or date code, ignore it. Case sizes: A 3216, B 3528, C 6032, D 7343.',
    rtant: 'Dipped (radial) tantalum: POLARIZED. Printed in full: the capacitance in µF on the first line, the voltage on the second, and a + next to the positive lead (2.2 over 25+ = 2.2 µF, 25 V).',
    elec: 'SMD aluminum electrolytic or polymer: POLARIZED. The tinted segment or bar on the top marks the NEGATIVE (cathode) end. Capacitance and voltage are printed in full (100 over 16 = 100 µF, 16 V), often with a series code and a date code.',
    relec: 'Radial (through-hole) aluminum electrolytic: POLARIZED. The stripe with minus signs marks the NEGATIVE lead, which is also the shorter lead on a new part. Value in µF, voltage, and often a 105°C temperature rating are printed on the can.',
    disc: 'Ceramic disc (through-hole): not polarized. Usually a 3-digit code, often followed by a tolerance letter (104K), sometimes with a voltage code or printed voltage.',
    film: 'Film capacitor (through-hole): not polarized. Marked with a 3-digit code plus a tolerance letter and voltage (474K 250V), or a decimal in µF such as 0.1.'
  };
  function capReference() {
    var t = function (head, rowsArr) { return '<table><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr>' + rowsArr.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>'; };
    var tol = Object.keys(C.TOL).map(function (k) { return [k, C.TOL[k]]; });
    var volt = Object.keys(C.VOLT).map(function (k) { return [k, C.VOLT[k] + ' V']; });
    var tant = Object.keys(C.TANT).map(function (k) { return [k, C.TANT[k] + ' V']; });
    return '<div class="reftables">' +
      '<h4>Units</h4>' + t(['Unit', 'Symbol', 'In farads'], [['Picofarad', 'pF', '10⁻¹² F'], ['Nanofarad', 'nF', '10⁻⁹ F'], ['Microfarad', 'µF', '10⁻⁶ F'], ['Millifarad', 'mF', '10⁻³ F'], ['Farad', 'F', '1 F']]) +
      '<p class="note">1 µF = 1,000 nF = 1,000,000 pF</p>' +
      '<h4>3-digit code: third digit multiplier (result in pF)</h4>' + t(['3rd digit', '0', '1', '2', '3', '4', '5', '8', '9'], [['Multiplier', '×1', '×10', '×100', '×1k', '×10k', '×100k', '×0.01', '×0.1']]) +
      '<p class="note">Examples: 101 = 100 pF, 223 = 22 nF, 104 = 100 nF (0.1 µF), 474 = 470 nF, 105 = 1 µF. 229 = 2.2 pF.</p>' +
      '<h4>Tolerance letters</h4>' + t(['Code', 'Tolerance'], tol) +
      '<h4>Voltage codes (ceramic and film part numbers)</h4>' + t(['Code', 'Rating'], volt) +
      '<h4>Tantalum voltage letters</h4>' + t(['Letter', 'Rating'], tant) +
      '<p class="note"><b>Chip sizes</b> (inch code, mm): 0201 = 0.6×0.3, 0402 = 1.0×0.5, 0603 = 1.6×0.8, 0805 = 2.0×1.25, 1206 = 3.2×1.6, 1210 = 3.2×2.5. <b>Tantalum cases</b>: A 3.2×1.6, B 3.5×2.8, C 6.0×3.2, D 7.3×4.3 (mm).</p>' +
      '<p class="note"><b>EIA-198 letters</b> (value in pF with the digit as the power of ten): A 1.0, B 1.1, C 1.2, D 1.3, E 1.5, F 1.6, G 1.8, H 2.0, J 2.2, K 2.4, L 2.7, M 3.0, N 3.3, P 3.6, Q 3.9, R 4.3, S 4.7, T 5.1, U 5.6, V 6.2, W 6.8, X 7.5, Y 8.2, Z 9.1, and lowercase a 2.6, b 3.5, d 4.0, e 4.5, f 5.0, m 6.0, n 7.0, t 8.0, y 9.0.</p></div>';
  }
  function tabCapacitor(pane) {
    var st = { mode: 'decode', type: 'auto', q: '107C' };
    function build() {
      pane.innerHTML = pills([['decode', 'Code → Value'], ['encode', 'Value → Code']], st.mode, 'm') +
        '<div class="pills" id="types"></div><div id="gfx"></div>' +
        inputRow(st.q, st.mode === 'decode' ? 'Capacitor marking' : 'Capacitance with unit', 18) +
        tryRow(st.mode === 'decode' ? ['104K', '2A104J', '107C', '475A', 'G475', '2.2 25+', '100 16', '470uF 25V', 'S3', '4n7', '229', '0.1'] : ['100nF', '0.1uF', '4.7pF', '22pF', '10uF', '330pF']) +
        '<div id="res"></div><p class="note" id="tinfo"></p>' +
        '<details class="alt"><summary>Reference tables (units, multipliers, tolerance, voltage, sizes)</summary>' + capReference() + '</details>';
      $('#types', pane).innerHTML = CAPTYPES.map(function (t) { return '<button data-ty="' + t[0] + '" aria-pressed="' + (t[0] === st.type) + '">' + t[1] + '</button>'; }).join('');
      $('#types', pane).onclick = function (e) { var b = e.target.closest('[data-ty]'); if (!b) return; st.type = b.getAttribute('data-ty'); pane.querySelectorAll('#types button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); run(); };
      pane.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { st.mode = b.getAttribute('data-m'); st.q = st.mode === 'decode' ? '107C' : '100nF'; build(); }; });
      wireInput(pane, run); run();
    }
    function graphic(r, text) {
      var t = st.type;
      if (t === 'auto') t = r.kind === 'tantalum' ? 'tant' : r.kind === 'printed' ? (r.polar ? 'rtant' : 'elec') : 'mlcc';
      var lines = (r.printed && (t === 'elec' || t === 'relec' || t === 'rtant')) ? [r.printed[0] + ' µF', r.printed[1] + ' V' + (r.polar ? ' +' : '')] : text;
      return { svg: ({ mlcc: mlccSVG, tant: tantalumSVG, rtant: rtantSVG, elec: elecSVG, relec: relecSVG, disc: discSVG, film: filmSVG })[t](lines), type: t };
    }
    function run() {
      st.q = $('#q', pane).value;
      var g = $('#gfx', pane), out = $('#res', pane), raw = st.q.trim(), gf;
      var hint = (st.type === 'tant') ? 'tant' : (st.type === 'elec' || st.type === 'relec' || st.type === 'rtant') ? 'elec' : '';
      if (st.mode === 'encode') {
        var e = C.toCode(st.q);
        gf = graphic({ kind: '' }, e.error ? '' : e.codes[0].code); g.innerHTML = gf.svg; $('#tinfo', pane).textContent = CAPINFO[gf.type];
        if (e.error) { out.innerHTML = err(e.error); return; }
        out.innerHTML = rows([['Capacitance', C.format(e.pf), true]].concat(e.codes.map(function (c) { return [c.label, c.code]; }))) + notes(e.notes) +
          '<p class="note">Add a tolerance letter after a 3-digit code if you want to match a marking like 104K.</p>';
        return;
      }
      var r = C.decode(st.q, hint);
      gf = graphic(r.error ? { kind: '' } : r, r.kind === 'value' ? '' : raw.replace(/\+$/, '')); g.innerHTML = gf.svg;
      $('#tinfo', pane).textContent = CAPINFO[gf.type];
      if (r.error) { out.innerHTML = err(r.error); return; }
      var c = C.conversions(r.pf);
      var l = [['Capacitance', C.format(r.pf) + (r.tolText ? ' ' + r.tolText : ''), true], ['Picofarads', c.pF + ' pF'], ['Nanofarads', c.nF + ' nF'], ['Microfarads', c.uF + ' µF']];
      if (r.range) { l.push(['Minimum', C.format(r.range.min)]); l.push(['Maximum', C.format(r.range.max)]); }
      l.push(['Tolerance', r.tolText || 'Not marked']); l.push(['Voltage', r.voltage != null ? r.voltage + ' V' : 'Not marked']);
      if (r.polar) l.push(['Polarity', '+ marks the positive lead']);
      out.innerHTML = rows(l) + steps(r.steps) + notes(r.notes);
    }
    build();
  }

  /* ---------- Tab: Inductor ---------- */
  var INDSTYLES = [['round', 'SMD power (round)'], ['shield', 'SMD shielded (block)'], ['chip', 'Chip']];
  var INDHELP = {
    code: 'Number codes work like resistors: the first two digits are the value, the third is the multiplier, and the answer is in µH (473J = 47 × 10³ µH = 47 mH, tolerance J = ±5%). An R or N marks the decimal point: 3R3 = 3.3 µH, R22 = 0.22 µH, 2N2 = 2.2 nH.',
    bands: 'Axial (resistor-shaped) inductors use color bands: 1st digit, 2nd digit, multiplier, tolerance, with the answer in µH. Red, black, brown = 20 × 10 = 200 µH. A part with no tolerance band is ±20%.',
    dots: 'Small SMD and RF inductors can use colored dots instead of printed text. A differently colored identifier dot marks the start. Read the dots clockwise: 1st digit, 2nd digit, multiplier. The answer is in nH (yellow, blue, red = 46 × 10² = 4600 nH).'
  };
  function tabInductor(pane) {
    var st = { mode: 'code', style: 'round', dstyle: 'smd', q: '4R7', bands: ['red', 'black', 'brown', 'gold'], dots: ['yellow', 'blue', 'red'] };
    var TXT = ['yellow', 'white', 'gold', 'silver', 'orange'];
    function selHTML(label, table, cur, i, fmtFn) {
      return '<div class="field"><label>' + label + '</label><div class="sel"><i style="background:' + R.HEX[cur] + '"></i><select data-i="' + i + '">' + Object.keys(table).map(function (c) {
        return '<option value="' + c + '"' + (cur === c ? ' selected' : '') + ' style="background:' + R.HEX[c] + ';color:' + (TXT.indexOf(c) >= 0 ? '#111' : '#fff') + '">' + cap(c) + ' (' + fmtFn(table[c]) + ')</option>';
      }).join('') + '</select></div></div>';
    }
    function build() {
      var h = pills([['code', 'Number code'], ['bands', 'Color bands'], ['dots', 'Marking dots']], st.mode, 'm');
      if (st.mode === 'code') h += pills(INDSTYLES, st.style, 'st');
      if (st.mode === 'dots') h += pills([['smd', 'SMD (round)'], ['rf', 'RF chip']], st.dstyle, 'ds');
      h += '<div id="gfx"></div>';
      if (st.mode === 'code') h += inputRow(st.q, 'Inductor marking', 8) + tryRow(['473J', '3R3', 'R22', '220', '101', '100K', '2N2', '102', '10uH']);
      else h += '<div class="fields" id="fields"></div>';
      pane.innerHTML = h + '<div id="res"></div><p class="note">' + esc(INDHELP[st.mode]) + '</p>';
      pane.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { st.mode = b.getAttribute('data-m'); build(); }; });
      pane.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { st.style = b.getAttribute('data-st'); build(); }; });
      pane.querySelectorAll('[data-ds]').forEach(function (b) { b.onclick = function () { st.dstyle = b.getAttribute('data-ds'); build(); }; });
      if (st.mode === 'code') { wireInput(pane, run); run(); } else buildFields();
    }
    function buildFields() {
      var box = $('#fields', pane), html, arr, dm = {};
      if (st.mode === 'bands') {
        html = selHTML('1st Digit', I.BAND.digit, st.bands[0], 0, function (v) { return v; }) + selHTML('2nd Digit', I.BAND.digit, st.bands[1], 1, function (v) { return v; }) +
          selHTML('Multiplier', I.BAND.mult, st.bands[2], 2, function (v) { return '×' + v; }) + selHTML('Tolerance', I.BAND.tol, st.bands[3], 3, function (v) { return '±' + v + '%'; });
        arr = st.bands;
      } else {
        Object.keys(I.BAND.digit).forEach(function (c) { dm[c] = Math.pow(10, I.BAND.digit[c]); }); dm.gold = 0.1; dm.silver = 0.01;
        html = selHTML('1st Digit', I.BAND.digit, st.dots[0], 0, function (v) { return v; }) + selHTML('2nd Digit', I.BAND.digit, st.dots[1], 1, function (v) { return v; }) +
          selHTML('Multiplier', dm, st.dots[2], 2, function (v) { return '×' + v; });
        arr = st.dots;
      }
      box.innerHTML = html;
      box.querySelectorAll('select').forEach(function (sel) { sel.onchange = function () { arr[+sel.getAttribute('data-i')] = sel.value; sel.previousSibling.style.background = R.HEX[sel.value]; run(); }; });
      run();
    }
    function run() {
      var out = $('#res', pane), g = $('#gfx', pane), r;
      if (st.mode === 'code') {
        st.q = $('#q', pane).value;
        g.innerHTML = ({ round: roundPowerSVG, shield: shieldedSVG, chip: smdInductorSVG })[st.style](st.q.toUpperCase()); r = I.decode(st.q);
      } else if (st.mode === 'bands') { g.innerHTML = axialInductorSVG(st.bands); r = I.decodeBands(st.bands); }
      else { g.innerHTML = dotsSVG(st.dstyle, st.dots); r = I.decodeDots(st.dots); }
      if (r.error) { out.innerHTML = err(r.error); return; }
      var c = I.conversions(r.uh);
      var l = [['Inductance', I.format(r.uh) + (r.tol != null ? ' ±' + r.tol + '%' : ''), true], ['Nanohenries', c.nH + ' nH'], ['Microhenries', c.uH + ' µH'], ['Millihenries', c.mH + ' mH'], ['Henries', c.H + ' H']];
      if (r.range) { l.push(['Minimum', I.format(r.range.min)]); l.push(['Maximum', I.format(r.range.max)]); }
      l.push(['Tolerance', r.tol != null ? '±' + r.tol + '%' : 'Not marked']);
      out.innerHTML = rows(l) + steps(r.steps) + notes(r.notes);
    }
    build();
  }

  /* ---------- Tab: Semiconductors ---------- */
  var CATS = [['all', 'All'], ['diode', 'Diodes'], ['transistor', 'Transistors'], ['mosfet', 'MOSFETs'], ['regulator', 'Regulators'], ['ic', 'ICs']];
  function catOf(p) { var c = p.cat.toLowerCase(); return /diode/.test(c) ? 'diode' : c === 'transistor' ? 'transistor' : c === 'mosfet' ? 'mosfet' : c === 'regulator' ? 'regulator' : 'ic'; }
  function norm(s) { return String(s).toUpperCase().replace(/[\s\-_.]/g, ''); }
  function search(q, cat) {
    var n = norm(q), out = [];
    PARTS.forEach(function (p) {
      if (cat !== 'all' && catOf(p) !== cat) return;
      var score = 0, keys = [p.id].concat(p.aliases, p.marks || []).map(norm);
      if (!n) score = 1;
      else if (keys.indexOf(n) >= 0) score = 100;
      else if (keys.some(function (k) { return k.indexOf(n) === 0; })) score = 60;
      else if (keys.some(function (k) { return k.indexOf(n) >= 0; })) score = 30;
      else if (norm(p.title + p.cat).indexOf(n) >= 0) score = 10;
      if (score) out.push([score, p]);
    });
    out.sort(function (a, b) { return b[0] - a[0]; });
    return out.map(function (x) { return x[1]; });
  }
  function tabParts(pane) {
    var st = { q: '1N4148', cat: 'all', sel: null };
    pane.innerHTML = '<p class="note" style="margin:0 0 8px">Type a part number, or the code printed on an SMD part (like L4, A7, M7, 1AM). Examples: 1N4007, SS34, BAT54, BC547, IRF540N, 7805, LM317, 555.</p>' +
      inputRow(st.q, 'Part number', 20) + '<div class="pills" id="cats"></div><div class="plist" id="list"></div><div id="detail"></div>' +
      '<p class="note">Values are typical and rounded. Pinouts and ratings can vary between manufacturers, so confirm against the datasheet before building.</p>';
    $('#cats', pane).innerHTML = CATS.map(function (c) { return '<button data-c="' + c[0] + '" aria-pressed="' + (c[0] === st.cat) + '">' + c[1] + '</button>'; }).join('');
    function run(keepSel) {
      st.q = $('#q', pane).value;
      var hits = search(st.q, st.cat), shown = hits.slice(0, 12);
      if (!keepSel || !st.sel || hits.indexOf(st.sel) < 0) st.sel = hits[0] || null;
      $('#list', pane).innerHTML = shown.length ? shown.map(function (p) {
        return '<button data-id="' + esc(p.id) + '" aria-pressed="' + (p === st.sel) + '"><b>' + esc(p.id) + '</b><span>' + esc(p.title) + '</span></button>';
      }).join('') + (hits.length > shown.length ? '<p class="note">' + (hits.length - shown.length) + ' more. Type more of the part number to narrow it down.</p>' : '')
        : '<div class="err">No match for "' + esc(st.q) + '" in the database yet. Try the base part number without package or manufacturer suffixes.</div>';
      var p = st.sel, d = $('#detail', pane);
      if (!p) { d.innerHTML = ''; return; }
      var drows = [['Package', p.pkg]].concat(p.marks ? [['SMD marking', p.marks.join(', ') + ' (varies by manufacturer)']] : [], [ [p.polarity ? 'Polarity' : 'Pinout', p.polarity || p.pinout]]).concat(p.specs, [['Typical use', p.use]]);
      d.innerHTML = '<div class="detail"><span class="tag">' + esc(p.cat) + '</span><h3>' + esc(p.id) + ': ' + esc(p.title) + '</h3>' +
        (p.aliases.length ? '<p class="note">Also matches: ' + esc(p.aliases.join(', ')) + '</p>' : '') +
        '<dl>' + drows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' + (p.notes ? '<p class="note">' + esc(p.notes) + '</p>' : '') + '</div>';
    }
    $('#q', pane).addEventListener('input', function () { run(false); });
    $('#cats', pane).onclick = function (e) { var b = e.target.closest('[data-c]'); if (!b) return; st.cat = b.getAttribute('data-c'); pane.querySelectorAll('#cats button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); run(false); };
    $('#list', pane).onclick = function (e) { var b = e.target.closest('[data-id]'); if (!b) return; st.sel = PARTS.filter(function (p) { return p.id === b.getAttribute('data-id'); })[0]; run(true); };
    run(false);
  }

  /* ---------- Tab: Crystals, resonators, oscillators ---------- */
  var XTYPES = [['auto', 'Auto'], ['hc49', 'Crystal (through-hole)'], ['xsmd', 'Crystal (SMD)'], ['rlead', 'Resonator (leaded)'], ['rsmd', 'Resonator (SMD)'], ['xo', 'Oscillator (SMD)'], ['can', 'Oscillator (can)'], ['filter', 'Ceramic filter (lookup)']];
  var XINFO = {
    hc49: 'Crystal, through-hole (HC-49/U or HC-49/S): passive, 2 leads, NOT polarized (either way round). Needs an oscillator circuit and two load capacitors. The frequency is printed on the metal can, often with a load capacitance (like 20pF) and a tolerance. Typical accuracy is ±10 to ±50 ppm.',
    xsmd: 'Crystal, SMD (3225, 2520, 2016, or the tiny 3215 tuning fork for 32.768 kHz): passive, NOT polarized. 4-pad parts use the two diagonal pads (1 and 3), and the other two are case ground or no-connect. A dot marks pin 1 and the pins count counter-clockwise from it. Marking is usually a short frequency (16.0) or a manufacturer code.',
    rlead: 'Ceramic resonator, leaded: usually 3 pins with the MIDDLE pin ground (load capacitors are built in). The two outer pins go across the microcontroller oscillator pins and are interchangeable. Two-pin versions need external capacitors. Accuracy is about ±0.5%, so it is cheap and fine for non-critical timing but not for precise clocks like USB.',
    rsmd: 'Ceramic resonator, SMD chip (for example the Murata CSTCE style): 3 pads with the CENTER pad ground. The two outer pads are interchangeable. Built-in load capacitors, accuracy about ±0.5%.',
    xo: 'Oscillator, SMD (4-pad XO or MEMS): ACTIVE, the crystal and driver are inside, so it needs power. A dot marks pin 1, and pins count counter-clockwise from it. Common pinout: 1 enable (or NC), 2 GND, 3 output, 4 VDD. Pinouts vary between makers (some put the clock output on pin 1), so confirm with the datasheet. The first line is usually the frequency or a date code, the second a part code.',
    can: 'Oscillator can (full 14-pin or half 8-pin DIP): ACTIVE. A corner dot or notch marks pin 1. Full size: pin 1 NC or enable, 7 GND, 8 output, 14 VCC. Half size: pin 1 NC or enable, 4 GND, 5 output, 8 VCC. The frequency is printed on the metal lid.',
    filter: 'Ceramic filter (3-pin: input, ground, output): enter a part number such as SFE10.7MA5 or CFU455D, or just the nominal frequency. The lookup tells you the family (FM IF, AM IF, TV sound) and, where the maker uses a color dot to grade the center frequency (10.7 MHz filters), shows the dot table.'
  };
  var XFEEL = { hc49: 'frequency', xsmd: 'frequency', rlead: 'frequency', rsmd: 'frequency', xo: 'frequency', can: 'frequency' };

  function xLine(t, x, y, size, fill) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + size + '" font-weight="600" fill="' + fill + '">' + esc(t) + '</text>'; }
  function xtalSVG(type, lines, dot) {
    var a = lines[0] || '···', b = lines[1] || '', s = '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="' + esc(type) + ' graphic">', i;
    var fs = a.length > 9 ? 22 : 30;
    if (type === 'hc49') {
      s += '<rect x="150" y="116" width="4" height="66" fill="#aeb4bb"/><rect x="246" y="116" width="4" height="66" fill="#aeb4bb"/>' +
        '<rect x="96" y="34" width="208" height="84" rx="40" fill="#c4c8ce" stroke="#7e848c"/><rect x="96" y="34" width="208" height="14" rx="7" fill="#fff" opacity=".4"/>' +
        '<rect x="96" y="108" width="208" height="10" fill="#7e848c" opacity=".5"/>' + xLine(a, 200, 82, fs, '#23262b') + (b ? xLine(b, 200, 106, 16, '#23262b') : '');
    } else if (type === 'xsmd') {
      s += '<rect x="110" y="40" width="180" height="110" rx="6" fill="#c8ccd2" stroke="#7e848c"/><rect x="118" y="48" width="164" height="94" rx="4" fill="#dfe2e6"/>';
      [[110, 40], [262, 40], [110, 122], [262, 122]].forEach(function (p) { s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="28" height="28" fill="#d8b24a"/>'; });
      s += '<circle cx="132" cy="136" r="6" fill="#222"/>' + xLine(a, 200, 98, fs - 4, '#23262b') + (b ? xLine(b, 200, 122, 14, '#23262b') : '');
    } else if (type === 'rlead') {
      s += '<rect x="158" y="120" width="4" height="62" fill="#aeb4bb"/><rect x="198" y="120" width="4" height="62" fill="#aeb4bb"/><rect x="238" y="120" width="4" height="62" fill="#aeb4bb"/>' +
        '<rect x="120" y="24" width="160" height="100" rx="26" fill="#2a58b0" stroke="#1b3a78"/><rect x="120" y="24" width="160" height="12" rx="6" fill="#fff" opacity=".2"/>' +
        xLine(a, 200, 82, fs, '#e8efff') + (b ? xLine(b, 200, 108, 18, '#e8efff') : '');
    } else if (type === 'rsmd') {
      s += '<rect x="110" y="46" width="180" height="88" rx="5" fill="#d9ccaa" stroke="#9c8d66"/><rect x="110" y="46" width="180" height="10" fill="#fff" opacity=".25"/>' +
        '<rect x="116" y="122" width="40" height="18" fill="#c9cdd2"/><rect x="180" y="122" width="40" height="18" fill="#c9cdd2"/><rect x="244" y="122" width="40" height="18" fill="#c9cdd2"/>' +
        '<text x="136" y="158" text-anchor="middle" font-size="12" fill="#c3ccd8">1</text><text x="200" y="158" text-anchor="middle" font-size="12" fill="#c3ccd8">2 (GND)</text><text x="264" y="158" text-anchor="middle" font-size="12" fill="#c3ccd8">3</text>' +
        xLine(a, 200, 92, fs - 2, '#2b2410');
    } else if (type === 'xo') {
      s += '<rect x="110" y="30" width="180" height="110" rx="8" fill="#181818" stroke="#d8b24a" stroke-width="3"/>';
      [[110, 30, '#4'], [262, 30, '#3'], [110, 112, '#1'], [262, 112, '#2']].forEach(function (p) {
        s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="28" height="28" fill="#d8b24a" opacity=".9"/>' +
          '<text x="' + (p[0] + (p[0] < 200 ? -14 : 42)) + '" y="' + (p[1] + (p[1] < 80 ? 14 : 22)) + '" text-anchor="middle" font-size="13" fill="#c3ccd8">' + p[2] + '</text>';
      });
      s += '<circle cx="126" cy="126" r="6" fill="#f2f2f2"/>' + xLine(a, 205, 82, fs - 4, '#f4f4f4') + (b ? xLine(b, 205, 108, 17, '#f4f4f4') : '') +
        '<text x="126" y="166" text-anchor="middle" font-size="12" fill="#c3ccd8">Pin 1 dot</text>';
    } else if (type === 'can') {
      s += '<rect x="86" y="42" width="228" height="86" rx="4" fill="#bfc4ca" stroke="#7e848c"/><rect x="86" y="42" width="228" height="12" fill="#fff" opacity=".35"/>';
      for (i = 0; i < 7; i++) s += '<rect x="' + (96 + i * 32) + '" y="128" width="6" height="22" fill="#aeb4bb"/><rect x="' + (96 + i * 32) + '" y="20" width="6" height="22" fill="#aeb4bb"/>';
      s += '<circle cx="104" cy="114" r="5" fill="#222"/>' + xLine(a, 200, 96, fs - 2, '#23262b') + '<text x="104" y="172" text-anchor="middle" font-size="12" fill="#c3ccd8">Pin 1</text>';
    } else {
      s += '<rect x="158" y="124" width="4" height="58" fill="#aeb4bb"/><rect x="198" y="124" width="4" height="58" fill="#aeb4bb"/><rect x="238" y="124" width="4" height="58" fill="#aeb4bb"/>' +
        '<path d="M126 128 L126 56 Q126 26 156 26 L244 26 Q274 26 274 56 L274 128 Z" fill="#f08a2a" stroke="#b25f12"/><rect x="144" y="46" width="76" height="34" rx="4" fill="none" stroke="#3a2205" stroke-dasharray="4 3"/>' +
        '<text x="182" y="69" text-anchor="middle" font-size="15" fill="#3a2205">Marking</text>' + (dot ? '<circle cx="254" cy="48" r="11" fill="' + dot + '" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>' : '');
    }
    return s + '</svg>';
  }
  function xCompare() {
    return '<div class="reftables"><table><tr><th>Type</th><th>Passive or active</th><th>Accuracy</th><th>Cost</th><th>Needs</th></tr>' +
      '<tr><td>Crystal</td><td>Passive</td><td>High (about ±10 to ±50 ppm)</td><td>Low</td><td>Oscillator circuit and two load capacitors</td></tr>' +
      '<tr><td>Ceramic resonator</td><td>Passive</td><td>Lower (about ±0.5%)</td><td>Lowest</td><td>Often nothing extra (3-pin has built-in capacitors)</td></tr>' +
      '<tr><td>Oscillator (XO)</td><td>Active</td><td>Good</td><td>Higher</td><td>Power and ground only, output is a ready clock</td></tr>' +
      '<tr><td>MEMS oscillator</td><td>Active</td><td>Good</td><td>Moderate</td><td>Power and ground only, very shock and vibration resistant</td></tr></table>' +
      '<p class="note">Rule of thumb: use a crystal when timing matters (USB, UART at high speed, RTC), a ceramic resonator for cheap general clocks, and an oscillator when you want a ready-made clock with no tuning.</p></div>';
  }
  function tabCrystal(pane) {
    var st = { type: 'auto', q: '16.000MHz 20pF', fq: '10.7', dot: 'red' };
    function build() {
      pane.innerHTML = '<div class="pills" id="types"></div><div id="gfx"></div>' +
        '<div id="inputarea"></div><div id="res"></div><p class="note" id="tinfo"></p>' +
        '<details class="alt"><summary>Crystal vs resonator vs oscillator</summary>' + xCompare() + '</details>';
      $('#types', pane).innerHTML = XTYPES.map(function (t) { return '<button data-ty="' + t[0] + '" aria-pressed="' + (t[0] === st.type) + '">' + t[1] + '</button>'; }).join('');
      $('#types', pane).onclick = function (e) { var b = e.target.closest('[data-ty]'); if (!b) return; st.type = b.getAttribute('data-ty'); pane.querySelectorAll('#types button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); inputs(); };
      inputs();
    }
    function inputs() {
      var area = $('#inputarea', pane), f = st.type === 'filter';
      area.innerHTML = inputRow(f ? st.fq : st.q, f ? 'Filter part number or frequency' : 'Marking on the part', 40) +
        tryRow(f ? ['SFE10.7MA5', '10.7', 'CFU455D', '455kHz', '5.5MHz'] : ['16.000', '32.768', '16M0', '8.00MG', '16.00 MT', '455', '11.0592', '25.000MHz', '12.000 18pF ±30ppm', 'CSTLS16M0X53-B0']) +
        (f ? '<div id="dotarea"></div>' : '');
      wireInput(pane, run); run();
    }
    function pickType(r, raw) {
      if (st.type !== 'auto') return st.type;
      if (r && r.kind === 'partnumber') return /^CST(CE|CR|CC|NE|CW|CV|CS)/i.test(raw.replace(/\s+/g, '')) ? 'rsmd' : 'rlead';
      if (r && r.code) return 'rlead';
      return 'hc49';
    }
    function run() {
      var g = $('#gfx', pane), out = $('#res', pane), t, r;
      if (st.type === 'filter') {
        st.fq = $('#q', pane).value;
        var fr = X.filterLookup(st.fq), da = $('#dotarea', pane);
        $('#tinfo', pane).textContent = XINFO.filter;
        if (fr.error) { g.innerHTML = xtalSVG('filter', [], null); da.innerHTML = ''; out.innerHTML = err(fr.error); return; }
        var dotHex = null, fl = [['Family', fr.family], ['Nominal frequency', X.format(fr.hz), true]];
        if (fr.dots) {
          da.innerHTML = '<div class="fields"><div class="field"><label>Dot color</label><div class="sel"><i style="background:' + R.HEX[st.dot] + '"></i><select id="dotsel">' + Object.keys(fr.dots).map(function (c) {
            return '<option value="' + c + '"' + (c === st.dot ? ' selected' : '') + ' style="background:' + R.HEX[c] + ';color:' + (c === 'white' || c === 'orange' ? '#111' : '#fff') + '">' + cap(c) + '</option>';
          }).join('') + '</select></div></div></div>';
          $('#dotsel', pane).onchange = function () { st.dot = this.value; run(); };
          var chz = fr.dots[st.dot]; dotHex = R.HEX[st.dot];
          fl.push(['Center frequency', X.format(chz) + ' ±25 kHz']); fl.push(['Minimum', X.format(chz - 25e3)]); fl.push(['Maximum', X.format(chz + 25e3)]);
        } else da.innerHTML = '';
        g.innerHTML = xtalSVG('filter', [], dotHex);
        out.innerHTML = rows(fl) + steps(fr.steps) + notes(fr.notes);
        return;
      }
      st.q = $('#q', pane).value; var raw = st.q.trim();
      r = X.decode(st.q); t = pickType(r.error ? null : r, raw);
      var first = raw.split(/\s+/)[0] || '', second = '';
      if (r.kind === 'frequency' && /^\d/.test(first) && /^[A-Za-z]{1,3}$/.test(raw.split(/\s+/)[1] || '')) { second = raw.split(/\s+/)[1]; }
      g.innerHTML = xtalSVG(t, [first, second]);
      $('#tinfo', pane).textContent = XINFO[t];
      if (r.error) { out.innerHTML = err(r.error); return; }
      var l = [['Frequency', X.format(r.hz), true], ['Hertz', Number(r.hz.toPrecision(10)) + ' Hz'], ['Kilohertz', Number((r.hz / 1e3).toPrecision(10)) + ' kHz'], ['Megahertz', Number((r.hz / 1e6).toPrecision(10)) + ' MHz'], ['Period', X.formatTime(1 / r.hz)]];
      if (r.cl != null) l.push(['Load capacitance', r.cl + ' pF']);
      if (r.ppm != null) l.push(['Stability', '±' + r.ppm + ' ppm (±' + Number(r.drift.toPrecision(3)) + ' Hz)']);
      if (r.loadCaps) l.push(['Load caps (each)', r.loadCaps.nearest ? '≈' + Number(r.loadCaps.exact.toFixed(1)) + ' pF, use ' + r.loadCaps.nearest + ' pF (assumes ≈4 pF stray)' : 'Load is too small for the formula, check the datasheet']);
      if (r.common) l.push(['Typical use', r.common]);
      out.innerHTML = rows(l) + steps(r.steps) + notes(r.notes);
    }
    build();
  }

  /* ---------- Passive-part tabs: pots, networks, varistors, thermistors, fuses, ferrites, trimmer caps ---------- */
  var PL = PassiveLogic;
  function pTxt(t, x, y, size, fill) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="' + size + '" font-weight="600" fill="' + fill + '">' + esc(t) + '</text>'; }
  function potSVG(type, text) {
    if (type === 'trim') {
      return '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="Multi-turn trimmer potentiometer"><rect x="150" y="150" width="4" height="34" fill="#aeb4bb"/><rect x="198" y="150" width="4" height="34" fill="#aeb4bb"/><rect x="246" y="150" width="4" height="34" fill="#aeb4bb"/>' +
        '<rect x="110" y="40" width="180" height="112" rx="6" fill="#2a63b8" stroke="#1b4486"/><rect x="110" y="40" width="180" height="12" rx="6" fill="#fff" opacity=".2"/>' +
        '<circle cx="146" cy="76" r="14" fill="#c9a24a" stroke="#8a6d22"/><line x1="138" y1="76" x2="154" y2="76" stroke="#6b5214" stroke-width="3"/>' + pTxt(text || '···', 224, 118, 34, '#f1f5fb') + '</svg>';
    }
    return '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="Rotary potentiometer"><rect x="150" y="150" width="5" height="34" fill="#aeb4bb"/><rect x="198" y="150" width="5" height="34" fill="#aeb4bb"/><rect x="246" y="150" width="5" height="34" fill="#aeb4bb"/>' +
      '<rect x="176" y="8" width="48" height="52" rx="4" fill="#9aa0a8"/><rect x="176" y="8" width="16" height="52" fill="#fff" opacity=".25"/>' +
      '<rect x="120" y="56" width="160" height="96" rx="8" fill="#b9bdc3" stroke="#7e848c"/><rect x="120" y="56" width="160" height="12" rx="6" fill="#fff" opacity=".35"/>' + pTxt(text || '···', 200, 116, 34, '#23262b') + '</svg>';
  }
  function netSVG(pins, circuit, text) {
    var w = Math.min(300, 40 + pins * 26), x0 = 200 - w / 2, i, s = '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="Resistor network">';
    for (i = 0; i < pins; i++) s += '<rect x="' + (x0 + 12 + i * ((w - 24) / (pins - 1)) - 2) + '" y="120" width="4" height="46" fill="#aeb4bb"/>';
    s += '<rect x="' + x0 + '" y="46" width="' + w + '" height="76" rx="4" fill="#171717" stroke="#333"/><rect x="' + x0 + '" y="46" width="' + w + '" height="8" rx="3" fill="#fff" opacity=".08"/>' +
      '<circle cx="' + (x0 + 12) + '" cy="108" r="5" fill="#eee"/>' + pTxt(text || '···', 200, 92, 30, '#f4f4f4') + '<text x="' + (x0 + 12) + '" y="182" text-anchor="middle" font-size="13" fill="#c3ccd8">Pin 1' + (circuit === 'bussed' ? ' (common)' : '') + '</text>';
    return s + '</svg>';
  }
  function movSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="Metal oxide varistor"><rect x="168" y="130" width="5" height="54" fill="#aeb4bb"/><rect x="227" y="130" width="5" height="54" fill="#aeb4bb"/>' +
      '<circle cx="200" cy="78" r="64" fill="#2f6fd0" stroke="#1b4b97"/><ellipse cx="172" cy="52" rx="22" ry="14" fill="#fff" opacity=".18"/>' + pTxt(text || '···', 200, 86, (text || '').length > 7 ? 26 : 32, '#f3f7ff') + '</svg>';
  }
  function thermSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="Thermistor"><rect x="172" y="120" width="4" height="64" fill="#aeb4bb"/><rect x="224" y="120" width="4" height="64" fill="#aeb4bb"/>' +
      '<path d="M146 122 L146 70 Q146 22 200 22 Q254 22 254 70 L254 122 Z" fill="#c8402a" stroke="#8a2a1b"/><ellipse cx="176" cy="54" rx="14" ry="22" fill="#fff" opacity=".18"/>' + pTxt(text || '···', 200, 92, 30, '#fff1ec') + '</svg>';
  }
  function fuseSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="Fuse"><rect x="70" y="62" width="260" height="66" rx="8" fill="#cfe4ea" opacity=".55" stroke="#8aa5ae"/>' +
      '<path d="M120 95 L170 95 L180 80 L200 110 L220 80 L230 95 L280 95" fill="none" stroke="#6b7076" stroke-width="3"/>' +
      '<rect x="56" y="58" width="58" height="74" rx="8" fill="#b9bdc3" stroke="#7e848c"/><rect x="286" y="58" width="58" height="74" rx="8" fill="#b9bdc3" stroke="#7e848c"/>' + pTxt(text || '', 200, 160, 18, '#c3ccd8') + '</svg>';
  }
  function ferriteSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 170" role="img" aria-label="Ferrite bead"><rect x="96" y="122" width="208" height="20" rx="4" fill="#222"/>' +
      '<rect x="96" y="40" width="208" height="90" rx="6" fill="#33363b" stroke="#1d1f23"/><rect x="96" y="40" width="40" height="90" rx="6" fill="#c9cdd2"/><rect x="264" y="40" width="40" height="90" rx="6" fill="#c9cdd2"/>' +
      '<rect x="96" y="40" width="208" height="8" fill="#fff" opacity=".08"/>' + (text ? pTxt(text, 200, 98, 30, '#eee') : '') + '</svg>';
  }
  function trimCapSVG(text) {
    return '<svg class="gfx" viewBox="0 0 400 190" role="img" aria-label="Trimmer capacitor"><rect x="168" y="140" width="5" height="44" fill="#aeb4bb"/><rect x="227" y="140" width="5" height="44" fill="#aeb4bb"/>' +
      '<rect x="136" y="30" width="128" height="116" rx="10" fill="#e8d44a" stroke="#a89a1f"/><circle cx="200" cy="82" r="38" fill="#c9cdd2" stroke="#7e848c"/><line x1="176" y1="82" x2="224" y2="82" stroke="#5a5f66" stroke-width="6"/>' + pTxt(text || '', 200, 134, 18, '#3a330a') + '</svg>';
  }

  /* generic helper: option pills, one input, optional extra controls, result renderer */
  function simpleDecoder(pane, cfg) {
    var st = { q: cfg.q };
    (cfg.opts || []).forEach(function (o) { st[o.key] = o.def; });
    function build() {
      var h = (cfg.opts || []).map(function (o) { return '<div class="pills">' + o.items.map(function (it) { return '<button data-k="' + o.key + '" data-v="' + it[0] + '" aria-pressed="' + (String(st[o.key]) === String(it[0])) + '">' + esc(it[1]) + '</button>'; }).join('') + '</div>'; }).join('');
      pane.innerHTML = h + '<div id="gfx"></div>' + inputRow(st.q, cfg.label, cfg.maxlen || 24) + tryRow(cfg.tries) + (cfg.extra || '') + '<div id="res"></div><p class="note" id="tinfo"></p>' + (cfg.footer || '');
      pane.querySelectorAll('[data-k]').forEach(function (b) {
        b.onclick = function () { var k = b.getAttribute('data-k'), v = b.getAttribute('data-v'); st[k] = /^\d+$/.test(v) ? Number(v) : v; build(); };
      });
      var tp = $('#temp', pane); if (tp) tp.addEventListener('input', run);
      wireInput(pane, run); run();
    }
    function run() {
      st.q = $('#q', pane).value;
      var tp = $('#temp', pane); st.temp = tp && tp.value !== '' ? Number(tp.value) : null;
      var r = cfg.compute(st);
      $('#gfx', pane).innerHTML = cfg.gfx(st, r);
      $('#res', pane).innerHTML = r.error ? err(r.error) : cfg.render(r, st) + steps(r.steps) + notes(r.notes);
      $('#tinfo', pane).textContent = cfg.info ? cfg.info(st) : '';
    }
    build();
  }

  function tabPot(pane) {
    simpleDecoder(pane, { q: 'B103', label: 'Potentiometer marking', tries: ['B103', 'A504', '10KB', 'B50K', '103', '3296W-103'],
      opts: [{ key: 'type', def: 'pot', items: [['pot', 'Panel pot'], ['trim', 'Multi-turn trimmer']] }],
      compute: function (s) { return PL.pot(s.q); },
      gfx: function (s) { return potSVG(s.type, s.q.toUpperCase()); },
      render: function (r, s) {
        var tol = s.type === 'trim' ? 10 : 20, lo = r.ohms * (1 - tol / 100), hi = r.ohms * (1 + tol / 100);
        return rows([['Resistance', PL.fmtOhms(r.ohms) + ' ±' + tol + '%', true], ['Minimum', PL.fmtOhms(lo)], ['Maximum', PL.fmtOhms(hi)], ['Taper', r.taperName], ['What it means', r.taperUse || 'Taper not marked']]);
      },
      info: function (s) { return s.type === 'trim' ? 'Trimmer: a small preset potentiometer, adjusted with a screwdriver and then left alone. The marking is the total resistance (like 103 = 10 kΩ). Multi-turn types (3296 style) take about 25 turns for fine adjustment.' : 'Panel potentiometer: the 3-digit number is the total resistance end to end, and a letter shows the taper. The wiper (middle pin) is the adjustable output.'; } });
  }
  function tabNetwork(pane) {
    simpleDecoder(pane, { q: '103', label: 'Resistor network marking', tries: ['103', 'A103G', '472', '1002', '4.7K', '220'],
      opts: [{ key: 'circuit', def: 'bussed', items: [['bussed', 'Bussed (common pin)'], ['isolated', 'Isolated']] }, { key: 'pins', def: 9, items: [[6, '6 pins'], [8, '8 pins'], [9, '9 pins'], [10, '10 pins']] }],
      compute: function (s) { return PL.network(s.q, s.pins, s.circuit); },
      gfx: function (s) { return netSVG(s.pins, s.circuit, s.q.toUpperCase()); },
      render: function (r) {
        var l = [['Each resistor', PL.fmtOhms(r.ohms) + (r.tol != null ? ' ±' + r.tol + '%' : ''), true], ['Resistors in package', String(r.net.count)], ['Layout', r.net.common]];
        if (r.circuit === 'bussed') { l.push(['Pin 1 to any pin', PL.fmtOhms(r.net.p1)]); l.push(['Between two other pins', PL.fmtOhms(r.net.between)]); l.push(['Common to all in parallel', PL.fmtOhms(r.net.parallel)]); }
        return rows(l);
      },
      info: function () { return 'Resistor networks (arrays) pack several matching resistors into one package. SIP types are a single row of pins, DIP types are two rows, and SMD arrays have 4 to 8 resistors in one chip. Bussed means one end of every resistor shares the common pin 1, commonly used for pull-ups. Isolated means each resistor has its own two pins. Choose the type and pin count to match your part.'; } });
  }
  function tabVaristor(pane) {
    simpleDecoder(pane, { q: '14D471K', label: 'Varistor marking', tries: ['14D471K', '10D391K', '7N271K', '20D561K', 'S14K275'],
      compute: function (s) { return PL.varistor(s.q); },
      gfx: function (s) { return movSVG(s.q.toUpperCase()); },
      render: function (r) {
        return rows([['Varistor voltage', Math.round(r.v1) + ' V' + (r.tol ? ' ±' + r.tol + '%' : ''), true], ['Disc diameter', r.dia + ' mm'], ['Max AC working', '≈' + r.vac + ' V RMS'], ['Max DC working', '≈' + r.vdc + ' V'],
          ['Clamping at surge', '≈' + Math.round(r.clampLow / 10) * 10 + ' to ' + Math.round(r.clampHigh / 10) * 10 + ' V'], ['120 V mains', r.fits120 ? 'Suitable (rating is at least 150 V AC)' : 'Rating too low for 120 V mains'], ['230 V mains', r.fits230 ? 'Suitable (rating is at least 275 V AC)' : 'Rating too low for 230 V mains']]);
      },
      info: function () { return 'Varistor (MOV): a voltage-dependent resistor used as a surge protector across the mains or a supply rail. Common markings: 14D471K (14 mm disc, 470 V at 1 mA, ±10%) or the EPCOS style S14K275 (14 mm, ±10%, 275 V AC). Estimates use standard ratios, so confirm against the datasheet.'; } });
  }
  function tabThermistor(pane) {
    simpleDecoder(pane, { q: '103', label: 'Thermistor marking', tries: ['103', 'NTC 10K B3950', '103AT-2', '502 3435', '10D-9', 'PTC 120R'],
      extra: '<div class="fields"><div class="field"><label>Temperature (°C) for a lookup</label><div class="sel"><input type="number" id="temp" value="60" step="1" style="width:100%"></div></div></div>',
      compute: function (s) { return PL.thermistor(s.q, s.temp); },
      gfx: function (s) { return thermSVG(s.q.toUpperCase()); },
      render: function (r) {
        var l = [['Type', r.type], ['Resistance at 25 °C', PL.fmtOhms(r.r25), true]];
        if (r.b) l.push(['B value (beta)', r.b + ' K' + (r.assumed ? ' (assumed)' : '')]);
        if (r.at) l.push(['At ' + r.at.t + ' °C', PL.fmtOhms(r.at.r)]);
        if (r.table) r.table.forEach(function (t) { l.push([t[0] + ' °C', PL.fmtOhms(t[1])]); });
        return rows(l);
      },
      info: function () { return 'NTC thermistors lower their resistance as they warm and are used for temperature sensing and inrush limiting. PTC thermistors increase it sharply above a trip temperature and are used for overcurrent protection. A 3-digit marking like 103 is the resistance at 25 °C (10 kΩ).'; } });
  }
  function tabFuse(pane) {
    simpleDecoder(pane, { q: 'T2A 250V', label: 'Fuse marking', tries: ['T2A 250V', 'F500mA 250V', 'T2AL250V', 'FF1A 125V', 'MF-R110', '1812L110/16'], maxlen: 20,
      compute: function (s) { return PL.fuse(s.q); },
      gfx: function (s) { return fuseSVG(s.q.toUpperCase()); },
      render: function (r) {
        if (r.kind === 'ptc') return rows([['Type', 'Resettable PTC fuse', true], ['Hold current', r.hold + ' A'], ['Trip current', '≈' + Number(r.trip.toPrecision(3)) + ' A'], ['Max voltage', r.volt ? r.volt + ' V' : 'See datasheet']]);
        return rows([['Current rating', (r.amps < 1 ? Number((r.amps * 1000).toPrecision(4)) + ' mA' : Number(r.amps.toPrecision(4)) + ' A'), true], ['Speed', r.speed ? r.speed[1] : 'Not marked'], ['Meaning', r.speed ? r.speed[2] : ''], ['Voltage', r.volt != null ? r.volt + ' V' + (r.ac ? ' ' + r.ac : '') : 'Not marked'], ['Breaking capacity', r.br || 'Not marked']]);
      },
      info: function () { return 'Fuse markings follow IEC 60127: an optional speed letter (FF very fast, F fast, M medium, T time-lag or slow-blow, TT long time-lag), the current rating, an optional breaking-capacity letter (H high, E enhanced, L low), and the voltage rating. Common sizes: 5×20 mm and 6.3×32 mm glass tubes.'; } });
  }
  function tabFerrite(pane) {
    simpleDecoder(pane, { q: '601', label: 'Ferrite bead marking', tries: ['601', '121', '600R', '102', 'BLM18AG601SN1', 'BLM21PG221SN1'], maxlen: 20,
      compute: function (s) { return PL.ferrite(s.q); },
      gfx: function (s, r) { return ferriteSVG(r && !r.error && /^\d{3}$|R/.test(s.q.toUpperCase()) ? s.q.toUpperCase() : ''); },
      render: function (r) { var l = [['Impedance at 100 MHz', PL.fmtOhms(r.ohms), true]]; if (r.size) l.push(['Package size', r.size + ' (inch code)']); return rows(l); },
      info: function () { return 'Ferrite bead: a tiny inductor-like part that blocks high-frequency noise on power and signal lines. Rated by its impedance at 100 MHz. Most are unmarked, so this decodes printed codes and part numbers such as Murata BLM.'; } });
  }
  function tabTrimCap(pane) {
    simpleDecoder(pane, { q: '5-30', label: 'Printed capacitance range', tries: ['5-30', '2-10pF', '10~40', '3.5-20pF'], maxlen: 14,
      compute: function (s) { return PL.trimcap(s.q); },
      gfx: function (s) { return trimCapSVG(s.q); },
      render: function (r) { return rows([['Range', r.lo + ' to ' + r.hi + ' pF', true], ['Minimum', r.lo + ' pF'], ['Maximum', r.hi + ' pF'], ['Midpoint', Number(r.mid.toPrecision(4)) + ' pF']]); },
      info: function () { return 'Trimmer capacitor: a small variable capacitor adjusted with a screw, used to tune oscillators, filters, and antennas. The printed range is the capacitance you can set. Body color codes differ between makers, so identify the part by its printed range or datasheet.'; } });
  }

  /* ---------- Project info (change these in one place) ---------- */
  var APP = {
    name: 'Component Marking Decoder',
    intro: 'Pick the tab that matches the part in your hand, type the marking or choose the colors, and see the value, tolerance, rating, and polarity. Resistors, capacitors, and inductors also work in reverse: enter a value, get the marking to look for. Every tab shows a labeled picture of the part and the step-by-step working.',
    site: 'https://www.themakersworkbench.com',
    workbench: 'https://www.themakersworkbench.com/virtual-workbench',
    repo: 'https://github.com/MakersWorkbench/component-marking-decoder',
    wiki: 'https://github.com/MakersWorkbench/component-marking-decoder/wiki',
    license: 'https://github.com/MakersWorkbench/component-marking-decoder/blob/main/LICENSE',
    licenseName: 'Apache License 2.0'
  };
  function link(href, text) { return '<a href="' + href + '" target="_blank" rel="noopener">' + text + '</a>'; }

  /* ---------- Tab: About ---------- */
  function tabAbout(pane) {
    pane.innerHTML = '<div class="about">' +
      '<h3>How to use it</h3>' +
      '<p>1. Pick the tab for the part you have. 2. Type the marking printed on it, or choose the band colors. 3. Read the value, tolerance, and rating, and check the labeled picture and the step-by-step working. Most tabs have <b>Try</b> buttons with real examples. For the full walk-through, see the ' + link(APP.wiki, 'User Guide (Wiki)') + '.</p>' +
      '<h3>What is inside</h3>' +
      '<p><b>Resistor Bands</b> reads 3, 4, 5, and 6 band resistors and works in reverse from a value to bands. <b>SMD Resistor</b> handles 3-digit, 4-digit, EIA-96, and R-notation markings plus zero-ohm jumpers. <b>Pot / Trimmer</b> and <b>Res. Network</b> decode value codes and taper letters. <b>Capacitor</b> covers ceramic, film, SMD, tantalum, and electrolytic markings with tolerance and voltage codes and pF, nF, µF conversion, and <b>Trimmer Cap</b> reads printed ranges. <b>Inductor</b> reads number codes, R and N notation, color bands, and marking dots, and <b>Ferrite Bead</b> reads impedance codes. <b>Semiconductors</b> looks up diodes, transistors, MOSFETs, regulators, and ICs by part number or SMD marking code. <b>Crystal / Resonator</b> reads frequency markings and looks up ceramic filters. <b>Varistor</b>, <b>Thermistor</b>, and <b>Fuse</b> decode the safety and sensing parts.</p>' +
      '<h3>Accuracy</h3>' +
      '<p>Tables and values were checked against manufacturer datasheets, distributor references, and published standards, and the sources are listed in the ' + link(APP.repo + '/blob/main/SOURCES.md', 'sources file') + '. Marking codes, pinouts, and some ratings still differ between manufacturers, so the app says so wherever that matters. Tolerances read from SMD markings are estimates. For anything that matters, measure the part and confirm with the manufacturer datasheet.</p>' +
      '<h3>License</h3>' +
      '<p>' + link(APP.license, APP.licenseName) + ': free to use, copy, modify, and distribute, for commercial and non-commercial purposes, and it includes a patent grant. You may change it and add to it. The conditions: include a copy of the license, keep the copyright and attribution notices (listed in the ' + link(APP.repo + '/blob/main/NOTICE', 'NOTICE file') + '), and mark any files you changed. Please also keep the "Developed and Maintained by TheMakersWorkbench.com" footer and project links visible, so people can trace the tool back to its source.</p>' +
      '<h3>Developed and maintained by TheMakersWorkbench.com</h3>' +
      '<p>' + link(APP.repo, 'View the Project on GitHub') + ' (source code, issues, and contributions) &middot; ' + link(APP.wiki, 'User Guide (Wiki)') + '.</p>' +
      '<p class="note">The layout is inspired by the desktop app ' + link('https://github.com/VoxelCubes/ResistorDecoder', 'ResistorDecoder') + ' by VoxelCubes. This is an independent implementation, with no code copied.</p></div>';
  }

  /* ---------- tab shell ---------- */
  var TABS = [['res', 'Resistor Bands', tabResistor], ['smd', 'SMD Resistor', tabSMD], ['pot', 'Pot / Trimmer', tabPot], ['net', 'Res. Network', tabNetwork], ['cap', 'Capacitor', tabCapacitor], ['tcap', 'Trimmer Cap', tabTrimCap], ['ind', 'Inductor', tabInductor], ['ferr', 'Ferrite Bead', tabFerrite], ['semi', 'Semiconductors', tabParts], ['xtal', 'Crystal / Resonator', tabCrystal], ['mov', 'Varistor', tabVaristor], ['therm', 'Thermistor', tabThermistor], ['fuse', 'Fuse', tabFuse], ['about', 'About', tabAbout]];
  var LOGO = '<svg class="dec-logo" viewBox="0 0 72 72" role="img" aria-label="Resistor with color bands"><rect x="2" y="2" width="68" height="68" rx="16" fill="#0a2147" stroke="rgba(255,255,255,.28)" stroke-width="2"/>' +
    '<rect x="8" y="34" width="56" height="5" rx="2.5" fill="#9aa3ad"/>' +
    '<path d="M20 25 Q14 25 14 31 L14 42 Q14 48 20 48 L24 48 Q27 44 31 44 L41 44 Q45 44 48 48 L52 48 Q58 48 58 42 L58 31 Q58 25 52 25 L48 25 Q45 29 41 29 L31 29 Q27 29 24 25 Z" fill="#e3cb98"/>' +
    '<rect x="21" y="25" width="5" height="23" fill="#f6d90b"/><rect x="30" y="29" width="5" height="15" fill="#7a3fb5"/><rect x="39" y="29" width="5" height="15" fill="#d62828"/><rect x="50" y="25" width="5" height="23" fill="#cfa72a"/></svg>';
  root.innerHTML =
    '<header class="dec-head"><div class="dec-hero">' + LOGO +
    '<div class="dec-titlewrap"><div class="dec-eyebrow">The Makers Workbench &middot; Free Tool</div><' + HEADING + ' class="dec-title">' + esc(APP.name) + '</' + HEADING + '>' +
    '<div class="dec-tag">Decode the colors, numbers, and markings on electronic parts.</div></div></div>' +
    '<p class="dec-intro">' + esc(APP.intro) + '</p>' +
    '<nav class="dec-links">' + link(APP.wiki, 'User Guide (Wiki)').replace('<a ', '<a class="dec-btn dec-btn-primary" ') + link(APP.repo, 'GitHub').replace('<a ', '<a class="dec-btn" ') + '</nav></header>' +
    '<div class="tabbar" role="tablist"></div><div class="pane" role="tabpanel"></div>' +
    '<footer class="dec-foot">Developed and Maintained by ' + link(APP.site, 'TheMakersWorkbench.com') + ' &middot; ' + link(APP.license, APP.licenseName) + ' &middot; ' + link(APP.repo, 'View the Project on GitHub') + ' &middot; ' + link(APP.wiki, 'User Guide') + '</footer>';
  var bar = $('.tabbar'), pane = $('.pane');
  var solo = /[?&]solo/.test(location.search) || root.getAttribute('data-solo') === 'on';
  if (solo) { bar.hidden = true; ['.dec-intro', '.dec-links'].forEach(function (q) { $(q).hidden = true; }); }   /* the title and footer attribution always stay */
  bar.innerHTML = TABS.map(function (t) { return '<button role="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('');
  function show(id) {
    var t = TABS.filter(function (x) { return x[0] === id; })[0] || TABS[0];
    bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-t') === t[0]); });
    pane.innerHTML = ''; t[2](pane);
    if (USE_HASH) { try { history.replaceState(null, '', '#' + t[0]); } catch (e) { /* embedded or file context */ } }
  }
  bar.onclick = function (e) { var b = e.target.closest('[data-t]'); if (b) show(b.getAttribute('data-t')); };
  show(USE_HASH ? (location.hash || '').replace('#', '') : '');
})();
