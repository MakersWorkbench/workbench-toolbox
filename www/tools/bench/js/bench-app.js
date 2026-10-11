/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* Bench Tools UI. Needs calc-logic.js (TMWBCalc). Mounts into #tmwb-calc. */
(function () {
  'use strict';
  var root = document.getElementById('tmwb-bench');
  if (!root || !window.TMWBBench) return;
  var K = window.TMWBBench, fmt = K.fmt, OHM = 'Ω';
  var HEADING = /^h[1-6]$/i.test(root.getAttribute('data-heading') || '') ? root.getAttribute('data-heading') : 'h1';
  var APP = {
    name: 'Bench Tools',
    tag: 'Converters, finders, and cheat sheets for the workbench',
    intro: 'Quick tools to keep open while you build: a value converter, frequency and period, number bases, a standard-value finder, an I\u00b2C address book, and printable cheat sheets. Type values with prefixes like 4.7u or 2.2k, and the answers update as you type.',
    site: 'https://www.themakersworkbench.com',
    repo: 'https://github.com/MakersWorkbench/bench-tools',
    wiki: 'https://github.com/MakersWorkbench/bench-tools/wiki',
    license: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenseName: 'Apache License 2.0'
  };

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function link(href, text) { return '<a href="' + href + '" target="_blank" rel="noopener">' + text + '</a>'; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function pct(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + ' %'; }
  var SERIES_OPTS = [['E24', 'E24 (5 %)'], ['E12', 'E12 (10 %)'], ['E48', 'E48 (2 %)'], ['E96', 'E96 (1 %)']];
  var plain = /^[+-]?[\d.]+(e[+-]?\d+)?$/i;
  function readField(f, raw) {
    if (f.options || f.raw) return raw;
    var v = K.parse(raw);
    if (f.scale && isFinite(v) && plain.test(String(raw).trim())) v *= f.scale;
    return v;
  }

  /* ---------- generic calculator block ---------- */
  function renderRows(res) {
    var h = '';
    if (res.error) return '<div class="err">' + res.error + '</div>';
    if (res.svg) h += res.svg;
    if (res.rows) {
      h += '<div class="results">';
      res.rows.forEach(function (r) { h += '<div class="k">' + r[0] + '</div><div class="v' + (r[2] ? ' big' : '') + '">' + r[1] + '</div>'; });
      h += '</div>';
    }
    if (res.table) {
      h += '<div class="tblwrap"><table class="calc-table"><thead><tr>' + res.table.head.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
        res.table.rows.map(function (r, i) { return '<tr' + (i === 0 ? ' class="best"' : '') + '>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    }
    (res.notes || []).forEach(function (n) { h += '<p class="note">' + n + '</p>'; });
    if (res.steps) h += '<ol class="steps">' + res.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>';
    return h;
  }

  /** def: {title, blurb, fields:[{id,label,def,scale,options,hint}], run(values)->result} */
  function block(def) {
    var wrap = el('section', 'calc-block');
    if (def.title) wrap.appendChild(el('h3', 'calc-h', esc(def.title)));
    if (def.blurb) wrap.appendChild(el('p', 'calc-blurb', def.blurb));
    var grid = el('div', 'fields'), inputs = {}, out = el('div', 'calc-out');
    def.fields.forEach(function (f) {
      var fw = el('div', 'field' + (f.wide ? ' wide' : '')), lab = el('label', null, f.label), c;
      if (f.options) {
        c = el('select');
        f.options.forEach(function (o) { var op = el('option', null, esc(o[1])); op.value = o[0]; c.appendChild(op); });
        c.value = f.def;
        var sb = el('div', 'fbox'); sb.appendChild(c);
        fw.appendChild(lab); fw.appendChild(sb);
        c.addEventListener('change', go);
      } else {
        c = el('input'); c.type = 'text'; c.value = f.def == null ? '' : f.def; c.setAttribute('autocomplete', 'off'); if (!f.raw) c.setAttribute('inputmode', 'decimal'); c.setAttribute('spellcheck', 'false');
        if (f.hint) c.placeholder = f.hint;
        var tb = el('div', 'fbox'); tb.appendChild(c);
        fw.appendChild(lab); fw.appendChild(tb);
        c.addEventListener('input', go);
      }
      inputs[f.id] = c; grid.appendChild(fw);
    });
    wrap.appendChild(grid); wrap.appendChild(out);
    function go() {
      var v = {};
      def.fields.forEach(function (f) { v[f.id] = readField(f, inputs[f.id].value); });
      var res;
      try { res = def.run(v); } catch (e) { res = { error: 'Something went wrong with those values.' }; }
      out.innerHTML = renderRows(res);
      if (def.after) def.after(res, v);
    }
    go();
    wrap.go = go; wrap.inputs = inputs;
    return wrap;
  }

  /* ---------- the tools ---------- */
  var TABS = [];

  TABS.push({ id: 'conv', label: 'Value Converter', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Type a value with or without a prefix and see it in every common prefix. Handy for turning 0.0000047 F into 4.7 \u00b5F, or 4700000 \u03a9 into 4.7 M\u03a9.',
      fields: [{ id: 'value', label: 'Value', def: '0.0000047', hint: 'e.g. 4.7u, 2.2k, 0.0000047' },
        { id: 'unit', label: 'Unit', def: 'F', options: [['\u03a9', 'Ohms (\u03a9)'], ['F', 'Farads (F)'], ['H', 'Henries (H)'], ['V', 'Volts (V)'], ['A', 'Amps (A)'], ['W', 'Watts (W)'], ['Hz', 'Hertz (Hz)'], ['s', 'Seconds (s)']] }],
      run: function (v) {
        var r = K.convertValue(v.value, v.unit); if (r.error) return r;
        var rows = [['Engineering notation', r.eng, 1], ['Scientific notation', r.sci]].concat(r.rows);
        return { rows: rows, notes: ['Prefixes step by factors of 1000: pico (p) 10\u207b\u00b9\u00b2, nano (n) 10\u207b\u2079, micro (\u00b5) 10\u207b\u2076, milli (m) 10\u207b\u00b3, kilo (k) 10\u00b3, mega (M) 10\u2076, giga (G) 10\u2079. A capital M is mega and a lowercase m is milli.'] };
      }
    }));
  } });

  TABS.push({ id: 'freq', label: 'Freq / Period', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Frequency and period are two ways to say the same thing: <b>period = 1 \u00f7 frequency</b>. This also gives the wavelength of a radio signal, useful for antennas.',
      fields: [{ id: 'mode', label: 'I know the', def: 'f', options: [['f', 'Frequency (Hz)'], ['t', 'Period (s)']] }, { id: 'value', label: 'Value', def: '433.92M', hint: 'e.g. 1k, 20u' },
        { id: 'vf', label: 'Velocity factor (optional)', def: '', hint: '1 for free space, about 0.66 in coax' }],
      run: function (v) {
        var r = K.freqPeriod(v); if (r.error) return r;
        return { rows: [['Frequency', fmt(r.f, 'Hz'), 1], ['Period', fmt(r.t, 's'), 1], ['Wavelength', fmt(r.lambda, 'm'), 1], ['Half wave', fmt(r.half, 'm')], ['Quarter wave', fmt(r.quarter, 'm')]],
          notes: ['Wavelength = speed of light \u00d7 velocity factor \u00f7 frequency. A quarter-wave antenna is about 95 % of the quarter wavelength in practice, because of the end effect. For free space the velocity factor is 1, and in coaxial cable it is typically 0.66 to 0.85.'] };
      }
    }));
  } });

  TABS.push({ id: 'base', label: 'Number Bases', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Convert between decimal, hexadecimal, binary, and octal, and see how the same bits read as signed numbers. Underscores and spaces are ignored, and you can include a <b>0x</b> or <b>0b</b> prefix.',
      fields: [{ id: 'base', label: 'Number is in', def: 'hex', options: [['dec', 'Decimal'], ['hex', 'Hexadecimal'], ['bin', 'Binary'], ['oct', 'Octal']] }, { id: 'text', label: 'Value', def: 'FF', raw: true, hint: 'e.g. FF, 255, 1010_0101' }],
      run: function (v) {
        var r = K.numberBases(v); if (r.error) return r;
        var rows = [['Decimal', r.dec, 1], ['Hexadecimal', r.hex, 1], ['Binary', r.binGrouped, 1], ['Octal', r.oct], ['Bits needed', r.bits + ' (' + r.bytes + ' byte' + (r.bytes > 1 ? 's' : '') + ')']];
        if (r.int8 !== undefined) rows.push(['As a signed 8-bit number', r.int8]);
        if (r.int16 !== undefined) rows.push(['As a signed 16-bit number', r.int16]);
        if (r.int32 !== undefined) rows.push(['As a signed 32-bit number', r.int32]);
        if (r.ascii !== undefined) rows.push(['ASCII character', r.ascii]);
        return { rows: rows, notes: ['Signed numbers use two\u2019s complement: if the top bit is 1 the value is negative (0xFF is \u22121 in 8 bits and 255 as an unsigned byte). One hex digit is exactly four bits, which is why hex is the favorite for registers and addresses.'] };
      }
    }));
  } });

  TABS.push({ id: 'eser', label: 'E-Series Finder', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Resistors and capacitors only come in standard values. Type the value you need to see the nearest value in each standard series, and the best one- or two-part combinations from the series you own.',
      fields: [{ id: 'value', label: 'Value you need', def: '13.7k', hint: 'e.g. 13.7k, 4.3u' }, { id: 'series', label: 'Series for combinations', def: 'E24', options: [['E6', 'E6'], ['E12', 'E12'], ['E24', 'E24'], ['E96', 'E96']] }],
      run: function (v) {
        var r = K.eSeriesFinder({ value: v.value, series: v.series }); if (r.error) return r;
        var tbl = { head: ['Series', 'Next below', 'Nearest', 'Next above', 'Error'], rows: r.rows.map(function (x) { return [x.series, fmt(x.below, ''), fmt(x.nearest, ''), fmt(x.above, ''), (x.errPct >= 0 ? '+' : '\u2212') + Math.abs(x.errPct).toFixed(2) + ' %']; }) };
        var notes = ['E6, E12, E24, E48, and E96 have 6, 12, 24, 48, and 96 values per decade, and typical tolerances of 20, 10, 5, 2, and 1 percent.'];
        if (r.combos.length) {
          notes.push('<b>Combinations from ' + v.series + ':</b> ' + r.combos.slice(0, 4).map(function (c) {
            if (c.parts === 1) return fmt(c.value, '', 4) + ' (single part)';
            return fmt(c.desc[0], '') + (c.kind === 'add' ? ' + ' : ' \u2225 ') + fmt(c.desc[1], '') + ' = ' + fmt(c.value, '', 4) + ' (' + (c.errPct >= 0 ? '+' : '\u2212') + Math.abs(c.errPct).toFixed(2) + ' %)';
          }).join('; ') + '. A + means two parts in series (add), and \u2225 means two in parallel.');
        }
        return { table: tbl, notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'i2c', label: 'I\u00b2C Addresses', build: function (pane) {
    pane.appendChild(block({
      title: 'Find a device', blurb: 'Search by part name, type, or address. Leave it blank to list all. These are the 7-bit addresses most breakout boards use. Check your board, since jumpers and variants change them.',
      fields: [{ id: 'q', label: 'Search', def: '', raw: true, hint: 'e.g. BME280, OLED, 0x68' }],
      run: function (v) {
        var l = K.i2cSearch(v.q);
        if (!l.length) return { error: 'No match. Try a shorter name or an address like 0x3C.' };
        return { table: { head: ['Device', 'Type', 'Address', 'Notes'], rows: l.map(function (d) { return [d.name, d.type, d.addrText, d.notes || '']; }) } };
      }
    }));
    pane.appendChild(block({
      title: 'What is at these addresses?', blurb: 'Paste the addresses an I\u00b2C scanner sketch printed, and see the likely devices, including conflicts where two devices share one.',
      fields: [{ id: 'scan', label: 'Addresses found', def: '0x3C 0x68 0x76', raw: true, wide: 1 }],
      run: function (v) {
        var r = K.i2cByAddresses(v.scan); if (r.error) return r;
        var notes = r.bad.length ? ['Ignored (not valid): ' + r.bad.join(', ')] : [];
        return { table: { head: ['Address', 'Could be'], rows: r.list.map(function (x) { return [K.hex2(x.addr), x.devices.length ? x.devices.join('; ') : 'Nothing in the list. Check the board datasheet.']; }) }, notes: notes };
      }
    }));
  } });

  /* printable cheat sheets */
  function table(head, rows, cls) {
    return '<table class="' + (cls || '') + '"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
  }
  var SHEETS = {
    color: { name: 'Resistor color code', html: function () {
      return '<h3>Resistor Color Code</h3>' + table(['Color', 'Digit', 'Multiplier', 'Tolerance', 'Temp. coeff. (ppm/\u00b0C)'], K.COLORS.map(function (c) {
        return ['<span class="sw" style="background:' + c[1] + '"></span>' + c[0], String(c[2]), c[3], c[4], c[5]];
      })) + '<p>4 bands: digit, digit, multiplier, tolerance. 5 bands: three digits, multiplier, tolerance. 6 bands add the temperature coefficient. No tolerance band means \u00b120 %. Read from the end with the bands closest together.</p>';
    } },
    cap: { name: 'Capacitor codes', html: function () {
      return '<h3>Capacitor Codes</h3><div class="two">' + table(['Code', 'Value'], K.CAP_CODES) + table(['Letter', 'Tolerance'], K.CAP_TOL) + '</div><p>The first two digits are the value in picofarads and the third is the number of zeros: 104 is 10 followed by 4 zeros, 100000 pF, or 100 nF. A letter after the code is the tolerance (104K is 100 nF \u00b110 %).</p>';
    } },
    eser: { name: 'E-series values', html: function () {
      function row(s) { return K.SERIES[s].join('&nbsp; '); }
      return '<h3>Standard Values (one decade)</h3><p><b>E6 (20 %):</b> ' + row('E6') + '</p><p><b>E12 (10 %):</b> ' + row('E12') + '</p><p><b>E24 (5 %):</b> ' + row('E24') + '</p><p>Multiply by 10, 100, 1000, and so on for the other decades. E48 and E96 have 48 and 96 values with 2 % and 1 % tolerance.</p>';
    } },
    awg: { name: 'AWG wire table', html: function () {
      return '<h3>AWG Wire Sizes</h3>' + table(['AWG', 'Diameter (mm)', 'Area (mm\u00b2)', 'Resistance (\u03a9 per m)'], K.AWG_ROWS.map(function (r) { return [String(r.awg), r.d.toFixed(3), r.area.toFixed(3), r.perM.toFixed(4)]; })) + '<p>Solid copper at 20 \u00b0C. A smaller AWG number is a thicker wire, and every 3 steps roughly halves the resistance. This is not an ampacity (safe current) chart.</p>';
    } },
    logic: { name: 'Logic levels', html: function () {
      return '<h3>Logic Levels</h3>' + table(['Family', 'VOH min (V)', 'VOL max (V)', 'VIH min (V)', 'VIL max (V)', 'Max input (V)'], K.LOGIC_SHEET) + '<p>Typical datasheet values. A driver\u2019s VOH must be above the receiver\u2019s VIH, its VOL below the receiver\u2019s VIL, and its supply must not exceed the receiver\u2019s max input. Confirm with your part\u2019s datasheet.</p>';
    } },
    formula: { name: 'Basic formulas', html: function () {
      return '<h3>Basic Formulas</h3>' + table(['Name', 'Formula'], [['Ohm\u2019s law', 'V = I \u00d7 R'], ['Power', 'P = V \u00d7 I = I\u00b2R = V\u00b2 \u00f7 R'], ['Series resistors', 'R = R1 + R2 + ...'], ['Parallel resistors', '1 \u00f7 R = 1 \u00f7 R1 + 1 \u00f7 R2 + ...'], ['Voltage divider', 'Vout = Vin \u00d7 R2 \u00f7 (R1 + R2)'],
        ['LED resistor', 'R = (Vsupply \u2212 Vled) \u00f7 I'], ['RC time constant', '\u03c4 = R \u00d7 C'], ['RC cutoff', 'f = 1 \u00f7 (2\u03c0RC)'], ['Reactance', 'XL = 2\u03c0fL, XC = 1 \u00f7 (2\u03c0fC)'], ['Resonance', 'f0 = 1 \u00f7 (2\u03c0\u221a(LC))'], ['Frequency and period', 'f = 1 \u00f7 T']]);
    } }
  };
  TABS.push({ id: 'sheets', label: 'Cheat Sheets', build: function (pane) {
    pane.appendChild(el('p', 'calc-blurb', 'Pick a sheet and press <b>Print</b>. Only the sheet is printed (choose \u201cSave as PDF\u201d to keep a copy).'));
    var row = el('div', 'fields'), fw = el('div', 'field'), fb = el('div', 'fbox'), sel = el('select');
    Object.keys(SHEETS).forEach(function (k) { var o = el('option', null, esc(SHEETS[k].name)); o.value = k; sel.appendChild(o); });
    fb.appendChild(sel); fw.appendChild(el('label', null, 'Sheet')); fw.appendChild(fb); row.appendChild(fw); pane.appendChild(row);
    var btn = el('button', 'calc-clear', 'Print this sheet'); btn.type = 'button'; btn.addEventListener('click', function () { try { window.print(); } catch (e) { /* ignore */ } });
    pane.appendChild(btn);
    var sheet = el('div', 'sheet'); pane.appendChild(sheet);
    function go() { sheet.innerHTML = SHEETS[sel.value].html() + '<p class="credit">TheMakersWorkbench.com</p>'; }
    sel.addEventListener('change', go); go();
  } });

  TABS.push({ id: 'about', label: 'About', build: function (pane) {
    var h = '<div class="about"><h3>What this is</h3><p>Small tools to keep open on the bench: converters, a standard-value finder, an I\u00b2C address book, and printable reference sheets.</p>' +
      '<h3>Accuracy</h3><p>I\u00b2C addresses are the usual 7-bit addresses for common breakout boards. Many boards have jumpers or variants that change them, so check your board and run a scanner sketch to be sure. Reference tables follow the usual standards (IEC 60062 colors, IEC 60063 values). Confirm anything critical with the datasheet.</p>' +
      '<h3>License and source</h3><p>' + link(APP.license, APP.licenseName) + ': free for commercial and non-commercial use. You may modify it and add to it. Please keep the license, the NOTICE file, and the \u201cDeveloped and Maintained by TheMakersWorkbench.com\u201d footer intact.' +
      (APP.repo ? ' ' + link(APP.repo, 'View the Project on GitHub') + '.' : '') + '</p></div>';
    pane.appendChild(el('div', null, h));
  } });

  /* ---------- shell ---------- */
  var LOGO = '<svg class="dec-logo" viewBox="0 0 72 72" role="img" aria-label="Toolbox"><rect x="2" y="2" width="68" height="68" rx="16" fill="#0a2147" stroke="rgba(255,255,255,.28)" stroke-width="2"/>' +
    '<rect x="12" y="28" width="48" height="28" rx="4" fill="#e3cb98" stroke="#9aa3ad" stroke-width="2"/><path d="M28 28v-6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6" fill="none" stroke="#9aa3ad" stroke-width="3"/>' +
    '<rect x="12" y="38" width="48" height="4" fill="#cfa72a"/><rect x="32" y="35" width="8" height="10" rx="1.5" fill="#1f2328"/></svg>';
  var links = '';
  if (APP.wiki) links += link(APP.wiki, 'User Guide (Wiki)').replace('<a ', '<a class="dec-btn dec-btn-primary" ');
  if (APP.repo) links += link(APP.repo, 'GitHub').replace('<a ', '<a class="dec-btn" ');
  var foot = 'Developed and Maintained by ' + link(APP.site, 'TheMakersWorkbench.com') + ' &middot; ' + link(APP.license, APP.licenseName) + (APP.repo ? ' &middot; ' + link(APP.repo, 'View the Project on GitHub') : '');
  root.innerHTML = '<header class="dec-head"><div class="dec-hero">' + LOGO + '<div class="dec-titlewrap"><div class="dec-eyebrow">The Makers Workbench &middot; Free Tool</div><' + HEADING + ' class="dec-title">' + esc(APP.name) + '</' + HEADING + '>' +
    '<div class="dec-tag">' + esc(APP.tag) + '</div></div></div><p class="dec-intro">' + esc(APP.intro) + '</p>' + (links ? '<nav class="dec-links">' + links + '</nav>' : '') + '</header>' +
    '<div class="tabbar" role="tablist"></div><div class="pane" role="tabpanel"></div><footer class="dec-foot">' + foot + '</footer>';
  var bar = root.querySelector('.tabbar'), pane = root.querySelector('.pane'), btns = {};
  function show(id) {
    TABS.forEach(function (t) { btns[t.id].setAttribute('aria-selected', t.id === id ? 'true' : 'false'); });
    pane.innerHTML = '';
    TABS.filter(function (t) { return t.id === id; })[0].build(pane);
  }
  TABS.forEach(function (t) {
    var b = el('button', null, t.label); b.type = 'button'; b.setAttribute('role', 'tab');
    b.addEventListener('click', function () { show(t.id); });
    btns[t.id] = b; bar.appendChild(b);
  });
  show('conv');
})();
