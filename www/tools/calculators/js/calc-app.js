/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* Electronics Calculators UI. Needs calc-logic.js (TMWBCalc). Mounts into #tmwb-calc. */
(function () {
  'use strict';
  var root = document.getElementById('tmwb-calc');
  if (!root || !window.TMWBCalc) return;
  var K = window.TMWBCalc, fmt = K.fmt, OHM = 'Ω';
  var HEADING = /^h[1-6]$/i.test(root.getAttribute('data-heading') || '') ? root.getAttribute('data-heading') : 'h1';
  var APP = {
    name: 'Electronics Calculators',
    tag: 'The everyday electronics math, with the working shown',
    intro: 'Twenty free calculators for makers: Ohm’s law, LED resistors, voltage dividers, series and parallel networks, filters, timers, regulators, op-amps, wire, buses, batteries, thermistors, decibels, and transistor and MOSFET switches. Type values with prefixes like 4.7k, 10u, or 330m, and the answers update as you type.',
    site: 'https://www.themakersworkbench.com',
    repo: 'https://github.com/MakersWorkbench/circuit-calculators',
    wiki: 'https://github.com/MakersWorkbench/circuit-calculators/wiki',
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
    if (f.options) return raw;
    var v = K.parse(raw);
    if (f.scale && isFinite(v) && plain.test(String(raw).trim())) v *= f.scale;
    return v;
  }

  /* ---------- SVG helpers ---------- */
  var S = 'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  function zigH(x1, x2, y) { var n = 6, w = (x2 - x1) / n, d = 'M' + x1 + ' ' + y, i; for (i = 0; i < n; i++) d += 'L' + (x1 + w * (i + 0.5)) + ' ' + (y + (i % 2 ? 7 : -7)); return '<path d="' + d + 'L' + x2 + ' ' + y + '" ' + S + '/>'; }
  function zigV(x, y1, y2) { var n = 6, h = (y2 - y1) / n, d = 'M' + x + ' ' + y1, i; for (i = 0; i < n; i++) d += 'L' + (x + (i % 2 ? 7 : -7)) + ' ' + (y1 + h * (i + 0.5)); return '<path d="' + d + 'L' + x + ' ' + y2 + '" ' + S + '/>'; }
  function txt(x, y, s, anchor, cls) { return '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '" class="' + (cls || 'svgt') + '">' + esc(s) + '</text>'; }
  function svgWrap(w, h, body, label) { return '<svg class="gfx calc-gfx" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '">' + body + '</svg>'; }

  function ledCircuit(r, o) {
    var b = '', y = 40, yb = 124, show = Math.min(r.n, 4), i, x;
    b += '<path d="M40 ' + (y + 18) + 'h0M28 ' + (y + 20) + 'h24M34 ' + (y + 30) + 'h12" ' + S + '/>';
    b += '<path d="M40 ' + y + 'v20M40 ' + (y + 30) + 'V' + yb + '" ' + S + '/>' + txt(62, y + 22, '+', 'start') + txt(62, y + 38, fmt(o.Vs, 'V'), 'start', 'svgt dim');
    if (r.mode === 'series') {
      b += '<path d="M40 ' + y + 'H80" ' + S + '/>' + zigH(80, 140, y) + txt(110, y - 14, fmt(r.Rstd, OHM));
      x = 140; b += '<path d="M140 ' + y + 'H' + (x + 14) + '" ' + S + '/>'; x += 14;
      for (i = 0; i < show; i++) {
        b += '<path d="M' + x + ' ' + (y - 10) + 'L' + x + ' ' + (y + 10) + 'L' + (x + 18) + ' ' + y + 'Z M' + (x + 18) + ' ' + (y - 10) + 'V' + (y + 10) + 'M' + (x + 18) + ' ' + y + 'H' + (x + 38) + '" ' + S + '/>';
        x += 38;
      }
      if (r.n > show) b += txt(x + 4, y + 4, '… ×' + r.n, 'start', 'svgt dim'), x += 54;
      b += '<path d="M' + x + ' ' + y + 'H' + (x + 20) + 'V' + yb + 'H40" ' + S + '/>' + txt((x + 20) / 2 + 20, yb + 18, r.n + ' LED' + (r.n > 1 ? 's' : '') + ' in series, ' + fmt(r.Iact, 'A') + ' through all', 'middle', 'svgt dim');
      return svgWrap(Math.max(x + 40, 420), 150, b, 'LED series circuit');
    }
    var xs = [], gap = 80, x0 = 120;
    for (i = 0; i < show; i++) xs.push(x0 + i * gap);
    var xe = xs[xs.length - 1] + 50;
    b += '<path d="M40 ' + y + 'H' + xe + 'M40 ' + yb + 'H' + xe + '" ' + S + '/>';
    xs.forEach(function (bx) {
      b += '<path d="M' + bx + ' ' + y + 'V52" ' + S + '/>' + zigV(bx, 52, 82);
      b += '<path d="M' + bx + ' 82V90M' + (bx - 9) + ' 90H' + (bx + 9) + 'L' + bx + ' 106Z M' + (bx - 9) + ' 106H' + (bx + 9) + 'M' + bx + ' 106V' + yb + '" ' + S + '/>';
      b += txt(bx + 14, 70, fmt(r.Rstd, OHM), 'start');
    });
    if (r.n > show) b += txt(xe - 20, yb + 18, '(' + r.n + ' branches in all)', 'end', 'svgt dim');
    b += txt(40, yb + 18, 'One resistor per LED, ' + fmt(r.Iact, 'A') + ' each, ' + fmt(r.totalI, 'A') + ' total', 'start', 'svgt dim');
    return svgWrap(xe + 40, 150, b, 'LED parallel circuit');
  }

  function dividerCircuit(s, Vin, hasLoad) {
    var b = '';
    b += txt(20, 24, 'Vin = ' + fmt(Vin, 'V'), 'start');
    b += '<path d="M24 34H100V50" ' + S + '/>' + zigV(100, 50, 100) + txt(116, 80, 'R1 = ' + fmt(s.R1, OHM), 'start');
    b += '<path d="M100 100V110H220" ' + S + '/><circle cx="100" cy="110" r="3" fill="currentColor"/>';
    b += '<path d="M100 110V120" ' + S + '/>' + zigV(100, 120, 170) + txt(116, 150, 'R2 = ' + fmt(s.R2, OHM), 'start');
    b += '<path d="M100 170V186M80 186H120M88 192H112M95 198H105" ' + S + '/>';
    b += '<circle cx="220" cy="110" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' + txt(232, 114, 'Vout = ' + fmt(s.Vout, 'V'), 'start');
    if (hasLoad && s.VoutLoaded !== undefined) b += txt(232, 134, 'with load: ' + fmt(s.VoutLoaded, 'V'), 'start', 'svgt dim');
    return svgWrap(420, 210, b, 'Voltage divider schematic');
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
        c = el('input'); c.type = 'text'; c.value = f.def == null ? '' : f.def; c.setAttribute('autocomplete', 'off'); c.setAttribute('inputmode', 'decimal'); c.setAttribute('spellcheck', 'false');
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

  /* ---------- the calculators ---------- */
  var TABS = [];

  /* Ohm's law: four fields, the two most recently edited drive the other two */
  TABS.push({ id: 'ohm', label: 'Ohm’s Law', build: function (pane) {
    pane.appendChild(el('p', 'calc-blurb', 'Enter <b>any two</b> of the four values and the other two are calculated. Whichever two you edited last are the inputs; the rest turn into answers. Add a prefix to type fast: <b>4.7k</b>, <b>20m</b>, <b>330</b>.'));
    var defs = [['V', 'Voltage (V)', 'e.g. 12'], ['I', 'Current (A)', 'e.g. 20m'], ['R', 'Resistance (' + OHM + ')', 'e.g. 4.7k'], ['P', 'Power (W)', 'e.g. 0.5']];
    var grid = el('div', 'fields ohm4'), boxes = {}, order = ['V', 'I'], out = el('div', 'calc-out');
    var units = { V: 'V', I: 'A', R: OHM, P: 'W' };
    defs.forEach(function (d) {
      var fw = el('div', 'field'), b = el('div', 'fbox'), inp = el('input');
      inp.type = 'text'; inp.placeholder = d[2]; inp.setAttribute('autocomplete', 'off'); inp.setAttribute('inputmode', 'decimal'); inp.setAttribute('spellcheck', 'false');
      b.appendChild(inp); fw.appendChild(el('label', null, d[1])); fw.appendChild(b); grid.appendChild(fw); boxes[d[0]] = { inp: inp, box: b };
      inp.addEventListener('input', function () {
        var k = d[0], i = order.indexOf(k);
        if (i >= 0) order.splice(i, 1);
        if (String(inp.value).trim() !== '') order.push(k);
        if (order.length > 2) order.shift();
        calc();
      });
    });
    boxes.V.inp.value = '12'; boxes.I.inp.value = '20m';
    var clear = el('button', 'calc-clear', 'Clear'); clear.type = 'button';
    clear.addEventListener('click', function () { order = []; Object.keys(boxes).forEach(function (k) { boxes[k].inp.value = ''; }); calc(); boxes.V.inp.focus(); });
    function calc() {
      var inp = { V: NaN, I: NaN, R: NaN, P: NaN };
      order.forEach(function (k) { inp[k] = K.parse(boxes[k].inp.value); });
      Object.keys(boxes).forEach(function (k) { boxes[k].box.classList.toggle('computed', order.indexOf(k) < 0); });
      if (order.length < 2) { Object.keys(boxes).forEach(function (k) { if (order.indexOf(k) < 0) boxes[k].inp.value = ''; }); out.innerHTML = '<p class="note">Enter two values to see the results.</p>'; return; }
      var r = K.ohm(inp);
      if (r.error) { out.innerHTML = '<div class="err">' + r.error + '</div>'; return; }
      Object.keys(boxes).forEach(function (k) { if (order.indexOf(k) < 0) boxes[k].inp.value = fmt(r[k], units[k]); });
      var rows = [['Voltage', fmt(r.V, 'V'), 1], ['Current', fmt(r.I, 'A'), 1], ['Resistance', fmt(r.R, OHM), 1], ['Power dissipated', fmt(r.P, 'W'), 1],
        ['Smallest rating that works', r.minLabel], ['Recommended resistor rating', r.rec.label + (r.rec.margin ? ' (' + (Math.round(r.rec.margin * 10) / 10) + '× safety margin)' : ''), 1]];
      out.innerHTML = renderRows({ rows: rows, notes: ['The recommended rating is the next standard size at least <b>2×</b> the actual dissipation (50 % derating), which keeps the resistor from running hot. A resistor sized exactly to its dissipation gets too hot to touch.'],
        steps: ['Voltage = Current × Resistance (V = I × R)', 'Power = Voltage × Current (P = V × I = I²R = V²/R)'] });
    }
    pane.appendChild(grid); pane.appendChild(clear); pane.appendChild(out); calc();
  } });

  TABS.push({ id: 'led', label: 'LED Resistor', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Finds the resistor that limits current to your LEDs. The formula is <b>R = (supply voltage − total LED voltage) ÷ LED current</b>. Typical forward voltages: red 1.8–2.0 V, green 2.0–2.2 V, yellow 2.0 V, blue/white 3.0–3.3 V.',
      fields: [
        { id: 'Vs', label: 'Supply voltage (V)', def: '5', hint: 'e.g. 5' }, { id: 'Vf', label: 'LED forward voltage (V)', def: '2', hint: 'e.g. 2.0' },
        { id: 'If', label: 'LED current (mA)', def: '20', scale: 1e-3, hint: 'e.g. 20' }, { id: 'n', label: 'Number of LEDs', def: '1', hint: '1' },
        { id: 'mode', label: 'Wiring', def: 'series', options: [['series', 'Series (one resistor)'], ['parallel', 'Parallel (resistor each)']] },
        { id: 'series', label: 'Standard values', def: 'E24', options: SERIES_OPTS }],
      run: function (v) {
        var r = K.led({ Vs: v.Vs, Vf: v.Vf, If: v.If, n: v.n, mode: v.mode, series: v.series });
        if (r.error) return r;
        var rows = [['Calculated resistor', fmt(r.R, OHM, 4)], ['Next standard value up (' + v.series + ')', fmt(r.Rstd, OHM), 1], ['Actual LED current', fmt(r.Iact, 'A'), 1],
          ['Resistor dissipation', fmt(r.P, 'W')], ['Recommended resistor rating', r.rec.label, 1]];
        if (r.mode === 'parallel') { rows.push(['Resistors needed', String(r.resistors)]); rows.push(['Total supply current', fmt(r.totalI, 'A')]); }
        var notes = ['Rounding <b>up</b> to the next standard value keeps the current at or below your target. The LED runs slightly dimmer instead of slightly over-driven.'];
        if (r.mode === 'parallel') notes.push('Parallel LEDs each get their own resistor. Sharing one resistor lets the LED with the lowest forward voltage hog the current, and LEDs of the same type still differ from one another.');
        if (r.mode === 'series') notes.push('In series, every LED carries the same current, so one resistor is enough. The supply must exceed the sum of all the forward voltages.');
        return { svg: ledCircuit(r, { Vs: v.Vs }), rows: rows, notes: notes,
          steps: ['Voltage left for the resistor = ' + fmt(v.Vs, 'V') + ' − ' + fmt(r.drop, 'V') + ' = ' + fmt(r.avail, 'V'),
            'R = ' + fmt(r.avail, 'V') + ' ÷ ' + fmt(v.If, 'A') + ' = ' + fmt(r.R, OHM, 4),
            'Power in the resistor = I² × R = ' + fmt(r.Iact, 'A') + '² × ' + fmt(r.Rstd, OHM) + ' = ' + fmt(r.P, 'W')] };
      }
    }));
  } });

  TABS.push({ id: 'divider', label: 'Voltage Divider', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Two resistors that scale a voltage down: <b>Vout = Vin × R2 ÷ (R1 + R2)</b>. R1 connects to Vin, R2 connects to ground, and Vout is taken from the middle. Pick a standard series and the calculator searches every pair for the closest match.',
      fields: [
        { id: 'Vin', label: 'Input voltage (V)', def: '5' }, { id: 'Vout', label: 'Desired output (V)', def: '3.3' },
        { id: 'series', label: 'Standard values', def: 'E24', options: SERIES_OPTS },
        { id: 'Rmin', label: 'Min R1 + R2 (' + OHM + ')', def: '1k' }, { id: 'Rmax', label: 'Max R1 + R2 (' + OHM + ')', def: '100k' },
        { id: 'Rload', label: 'Load resistance (optional)', def: '', hint: 'e.g. 10k' }],
      run: function (v) {
        var r = K.divider({ Vin: v.Vin, Vout: v.Vout, series: v.series, Rmin: v.Rmin, Rmax: v.Rmax, Rload: v.Rload });
        if (r.error) return r;
        var b = r.best, hasLoad = b.VoutLoaded !== undefined;
        var rows = [['R1 (top)', fmt(b.R1, OHM), 1], ['R2 (bottom)', fmt(b.R2, OHM), 1], ['Output voltage', fmt(b.Vout, 'V', 4), 1], ['Error from target', pct(b.errPct)],
          ['Divider current', fmt(b.I, 'A')], ['R1 dissipation', fmt(b.P1, 'W')], ['R2 dissipation', fmt(b.P2, 'W')], ['Output impedance', fmt(b.Zout, OHM)]];
        if (hasLoad) rows.splice(4, 0, ['Output with load', fmt(b.VoutLoaded, 'V', 4)]);
        var head = ['R1', 'R2', 'Vout', 'Error', 'Current'].concat(hasLoad ? ['Loaded Vout'] : []);
        var trows = r.list.map(function (s) { var row = [fmt(s.R1, OHM), fmt(s.R2, OHM), fmt(s.Vout, 'V', 4), pct(s.errPct), fmt(s.I, 'A')]; if (hasLoad) row.push(fmt(s.VoutLoaded, 'V', 4)); return row; });
        var notes = ['<b>Output impedance</b> is R1 in parallel with R2. Anything you connect to Vout pulls the voltage down unless its resistance is at least about 10× larger than this. Enter a load resistance above to see how far the output sags.',
          'A divider is for signals and reference voltages, not for powering things. For power, use a regulator.'];
        return { svg: dividerCircuit(b, v.Vin, hasLoad), rows: rows, table: { head: head, rows: trows }, notes: notes };
      }
    }));
  } });

  function spTab(id, label, cfg) {
    return { id: id, label: label, build: function (pane) {
      var list = el('section', 'calc-block'), unit = cfg.unit;
      list.appendChild(el('h3', 'calc-h', cfg.title1));
      list.appendChild(el('p', 'calc-blurb', cfg.blurb));
      var grid = el('div', 'fields'), fw = el('div', 'field wide'), fb = el('div', 'fbox'), inp = el('input');
      inp.type = 'text'; inp.value = cfg.listDef; inp.placeholder = cfg.hint; inp.setAttribute('autocomplete', 'off'); inp.setAttribute('spellcheck', 'false');
      fb.appendChild(inp); fw.appendChild(el('label', null, 'Values, separated by commas or spaces')); fw.appendChild(fb); grid.appendChild(fw);
      var out = el('div', 'calc-out'); list.appendChild(grid); list.appendChild(out);
      function go() {
        var parts = inp.value.split(/[\s,;]+/).filter(Boolean), vals = parts.map(K.parse);
        if (vals.length < 2 || vals.some(function (x) { return !(x > 0); })) { out.innerHTML = '<p class="note">Enter two or more positive values.</p>'; return; }
        var sum = K.sumList(vals), rec = K.recipList(vals);
        var rows = [[cfg.addName, fmt(cfg.addIsSum ? sum : rec, unit), 1], [cfg.recName, fmt(cfg.addIsSum ? rec : sum, unit), 1]];
        out.innerHTML = renderRows({ rows: rows, notes: [cfg.rule] });
      }
      inp.addEventListener('input', go); go(); pane.appendChild(list);

      var find = block({
        title: cfg.title2, blurb: cfg.blurb2,
        fields: [{ id: 'target', label: 'Target ' + cfg.what + ' (' + unit + ')', def: cfg.targetDef, hint: cfg.hint }, { id: 'series', label: 'Standard values', def: cfg.seriesDef, options: cfg.seriesOpts }],
        run: function (v) {
          var r = K.findCombo({ target: v.target, series: v.series });
          if (r.error) return r;
          var rows = r.list.map(function (c) {
            var how;
            if (c.parts === 1) how = 'Single ' + cfg.what;
            else how = fmt(c.desc[0], unit) + (c.kind === 'add' ? cfg.addSym : cfg.recSym) + fmt(c.desc[1], unit) + ' <span class="dim">(' + (c.kind === 'add' ? cfg.addWord : cfg.recWord) + ')</span>';
            return [how, fmt(c.value, unit, 4), pct(c.errPct)];
          });
          return { table: { head: ['Combination', 'Result', 'Error'], rows: rows }, notes: [cfg.note2] };
        }
      });
      pane.appendChild(find);
    } };
  }

  TABS.push(spTab('res', 'Resistors S/P', {
    title1: 'Series and parallel resistance', unit: OHM, what: 'resistor', addName: 'In series (total)', recName: 'In parallel (total)', addIsSum: true,
    blurb: 'Type as many resistor values as you like. Series resistors simply add. Parallel resistors combine as <b>1 ÷ (1/R1 + 1/R2 + …)</b>, which is always smaller than the smallest resistor.',
    listDef: '1.5k 1.8k', hint: 'e.g. 1k 2.2k 4.7k',
    rule: 'Series: R = R1 + R2 + …. Parallel: 1/R = 1/R1 + 1/R2 + …. For exactly two resistors in parallel the shortcut is R = (R1 × R2) ÷ (R1 + R2).',
    title2: 'Find a combination for a target', blurb2: 'Need a value you do not have? This searches single resistors, pairs in series, and pairs in parallel from a standard series and ranks them by how close they get.',
    targetDef: '3.3k', seriesDef: 'E12', seriesOpts: [['E6', 'E6'], ['E12', 'E12'], ['E24', 'E24'], ['E96', 'E96']], addSym: ' + ', recSym: ' ∥ ', addWord: 'in series', recWord: 'in parallel',
    note2: 'Two parts is a good trade for an exact value. Remember each resistor has its own tolerance, so the combined value can drift by about the same percentage.' }));

  TABS.push(spTab('cap', 'Capacitors S/P', {
    title1: 'Series and parallel capacitance', unit: 'F', what: 'capacitor', addName: 'In parallel (total)', recName: 'In series (total)', addIsSum: true,
    blurb: 'Capacitors work the opposite way to resistors. In <b>parallel</b> they add, giving more capacitance. In <b>series</b> they combine as 1 ÷ (1/C1 + 1/C2 + …), giving less capacitance but a higher combined voltage rating.',
    listDef: '10u 22u', hint: 'e.g. 100n 47n',
    rule: 'Parallel: C = C1 + C2 + …. Series: 1/C = 1/C1 + 1/C2 + …. Two equal capacitors in series give half the capacitance. Polarized capacitors in series need balancing resistors and care; check the datasheet.',
    title2: 'Find a combination for a target', blurb2: 'Searches single capacitors, pairs in parallel, and pairs in series from a standard series. Real capacitors have wide tolerances (often 10–20 %), so the series choice matters less than for resistors.',
    targetDef: '15u', seriesDef: 'E6', seriesOpts: [['E6', 'E6 (20 %)'], ['E12', 'E12 (10 %)'], ['E24', 'E24 (5 %)']], addSym: ' + ', recSym: ' ∥ ', addWord: 'in parallel', recWord: 'in series',
    note2: 'In the combination list, “+” is two capacitors in parallel and “∥” marks the series (reciprocal) pair.' }));

  TABS.push({ id: 'rc', label: 'RC Filter', build: function (pane) {
    pane.appendChild(block({
      blurb: 'A resistor and a capacitor together set a time constant, τ = R × C. It is how long the capacitor takes to charge to 63.2 % of the supply. The same pair also forms a simple low-pass or high-pass filter.',
      fields: [{ id: 'R', label: 'Resistance (' + OHM + ')', def: '10k' }, { id: 'C', label: 'Capacitance (F)', def: '1u', hint: 'e.g. 100n' }],
      run: function (v) {
        var r = K.rc(v); if (r.error) return r;
        return { rows: [['Time constant τ', fmt(r.tau, 's'), 1], ['Cutoff frequency', fmt(r.fc, 'Hz'), 1], ['Rise time (10–90 %)', fmt(r.rise, 's')], ['Charged to 95 % (3τ)', fmt(r.t95, 's')], ['Charged to 99.3 % (5τ)', fmt(r.settle, 's')]],
          notes: ['Cutoff frequency f = 1 ÷ (2πRC) is where a first-order filter passes half its power (−3 dB). A low-pass filter has the capacitor to ground; a high-pass has the capacitor in series with the signal.', 'After 1τ the capacitor is at 63.2 %, 2τ at 86.5 %, 3τ at 95 %, 5τ at 99.3 %. Discharging works the same way in reverse.'] };
      }
    }));
  } });

  (function () {
    var t = TABS[TABS.length - 1], orig = t.build;
    t.build = function (pane) {
      orig(pane);
      pane.appendChild(block({
        title: 'Design a filter for a cutoff', blurb: 'Know the cutoff you want? Enter it and <b>one</b> of R or C. Leave the other blank, and you get the missing part, rounded to a standard value, with the cutoff you will really get.',
        fields: [{ id: 'fc', label: 'Cutoff frequency (Hz)', def: '1k' }, { id: 'R', label: 'Resistance (' + OHM + ', or blank)', def: '10k' }, { id: 'C', label: 'Capacitance (F, or blank)', def: '' },
          { id: 'series', label: 'Standard values', def: 'E12', options: [['E6', 'E6'], ['E12', 'E12'], ['E24', 'E24'], ['E96', 'E96']] }],
        run: function (v) {
          var r = K.rcReverse(v); if (r.error) return r;
          var unit = r.solve === 'C' ? 'F' : OHM, name = r.solve === 'C' ? 'capacitor' : 'resistor';
          return { rows: [['Exact ' + name + ' value', fmt(r.exact, unit, 4)], ['Nearest standard value', fmt(r.std, unit), 1], ['Actual cutoff with it', fmt(r.fcActual, 'Hz'), 1], ['Error from target', pct(r.errPct)]],
            notes: ['C = 1 \u00f7 (2\u03c0 R fc), or R = 1 \u00f7 (2\u03c0 C fc). Capacitors are usually the looser part, so choose a standard capacitor first and then fine-tune R with a series or parallel pair.'] };
        }
      }));
    };
  })();

  TABS.push({ id: 'lc', label: 'LC & Reactance', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Coils and capacitors resist AC in proportion to frequency. A coil’s reactance X<sub>L</sub> = 2πfL grows with frequency; a capacitor’s X<sub>C</sub> = 1 ÷ (2πfC) shrinks. Where they are equal is the resonant frequency. Fill in whichever values you have; each answer appears when its inputs are present.',
      fields: [{ id: 'L', label: 'Inductance (H)', def: '1m', hint: 'e.g. 10u' }, { id: 'C', label: 'Capacitance (F)', def: '1u', hint: 'e.g. 100n' }, { id: 'f', label: 'Frequency (Hz)', def: '1k', hint: 'e.g. 455k' }, { id: 'R', label: 'Circuit resistance for Q (optional, ' + OHM + ')', def: '', hint: 'e.g. 10' }],
      run: function (v) {
        var r = K.reactance(v); if (r.error) return r;
        var rows = [];
        if (r.f0 !== undefined) { rows.push(['Resonant frequency', fmt(r.f0, 'Hz'), 1]); rows.push(['Characteristic impedance √(L/C)', fmt(r.Z0, OHM)]); }
        if (r.XL !== undefined) rows.push(['Inductive reactance X<sub>L</sub>', fmt(r.XL, OHM), 1]);
        if (r.XC !== undefined) rows.push(['Capacitive reactance X<sub>C</sub>', fmt(r.XC, OHM), 1]);
        if (r.Qseries !== undefined) {
          rows.push(['Q if R is in series with the coil', r.Qseries.toPrecision(3), 1]); rows.push(['Bandwidth (series)', fmt(r.BWseries, 'Hz')]);
          rows.push(['Q if R is in parallel across it', r.Qparallel.toPrecision(3), 1]); rows.push(['Bandwidth (parallel)', fmt(r.BWparallel, 'Hz')]);
        }
        return { rows: rows, notes: ['Resonant frequency f₀ = 1 ÷ (2π√(LC)). Real coils also have wire resistance and self-capacitance, so a built circuit lands a little off the calculated value.'] };
      }
    }));
  } });

  TABS.push({ id: '555', label: '555 Timer', build: function (pane) {
    var b = block({
      blurb: '<b>Astable</b> mode makes the 555 free-run as an oscillator (a blinker or clock). <b>Monostable</b> mode makes it fire a single pulse when triggered. Formulas are for the classic bipolar 555 and CMOS equivalents such as the 7555/TLC555.',
      fields: [
        { id: 'mode', label: 'Mode', def: 'astable', options: [['astable', 'Astable (oscillator)'], ['mono', 'Monostable (one pulse)']] },
        { id: 'R1', label: 'R1 (' + OHM + ')', def: '1k' }, { id: 'R2', label: 'R2 (' + OHM + ', astable only)', def: '10k' }, { id: 'C', label: 'Capacitor C (F)', def: '1u', hint: 'e.g. 10u' }],
      run: function (v) {
        var r = K.timer555(v); if (r.error) return r;
        if (v.mode === 'mono') return { rows: [['Output pulse length', fmt(r.T, 's'), 1]], notes: ['Pulse length T = 1.1 × R × C, where R is the resistor in the R1 box. Keep the trigger pulse shorter than T.'] };
        return { rows: [['Frequency', fmt(r.f, 'Hz'), 1], ['Period', fmt(r.T, 's')], ['High time', fmt(r.th, 's')], ['Low time', fmt(r.tl, 's')], ['Duty cycle', r.duty.toFixed(1) + ' %', 1]],
          notes: ['f = 1.44 ÷ ((R1 + 2×R2) × C). The output is high for 0.693×(R1+R2)×C and low for 0.693×R2×C, so the duty cycle is always above 50 % in this basic circuit. For a square wave, make R1 much smaller than R2, or add a diode across R2.'] };
      }
    });
    pane.appendChild(b);
  } });

  TABS.push({ id: '317', label: 'LM317', build: function (pane) {
    pane.appendChild(block({
      blurb: 'The LM317 is an adjustable linear regulator. A resistor R1 (usually 240 ' + OHM + ') sits between OUT and ADJ, and R2 from ADJ to ground sets the voltage: <b>Vout = 1.25 V × (1 + R2 ÷ R1) + I<sub>ADJ</sub> × R2</b>.',
      fields: [
        { id: 'mode', label: 'I want to', def: 'solve', options: [['solve', 'Find R2 for a target voltage'], ['calc', 'Find the voltage from R1 and R2'], ['cc', 'Constant-current source']] },
        { id: 'R1', label: 'R1 (' + OHM + ')', def: '240' }, { id: 'Vout', label: 'Target output (V)', def: '9' }, { id: 'R2', label: 'R2 (' + OHM + ')', def: '1.5k' }, { id: 'Icc', label: 'Target current (mA, current-source mode)', def: '20', scale: 1e-3 }],
      run: function (v) {
        if (v.mode === 'cc') {
          var c = K.lm317cc({ I: v.Icc }); if (c.error) return c;
          return { rows: [['Calculated resistor', fmt(c.R, OHM, 4)], ['Nearest E96 value', fmt(c.Rstd, OHM), 1], ['Actual current', fmt(c.Iact, 'A'), 1], ['Resistor dissipation', fmt(c.P, 'W')], ['Recommended resistor rating', c.rec.label]],
            notes: ['Wire the resistor between OUT and ADJ, and connect the load from ADJ to ground. The LM317 holds 1.25 V across the resistor, so the current is 1.25 V \u00f7 R. The input must be at least about 3 V above the load voltage plus 1.25 V. Good for charging and LED strings.'] };
        }
        var r = K.lm317(v); if (r.error) return r;
        if (v.mode === 'solve') return { rows: [['Calculated R2', fmt(r.R2, OHM, 4)], ['Nearest E96 value', fmt(r.R2std, OHM), 1], ['Actual output with that value', fmt(r.Vout, 'V', 4), 1], ['Minimum input voltage', fmt(r.minVin, 'V')]],
          notes: ['Uses the datasheet typical I<sub>ADJ</sub> of 50 µA (it adds only a few tens of millivolts). Real chips vary, so expect a few percent of error; use a trim pot for precision.', 'The LM317 needs about 3 V of headroom (input at least 3 V above the output) and wastes the difference as heat. Add a heatsink for loads over a few hundred milliamps.'] };
        return { rows: [['Output voltage', fmt(r.Vout, 'V', 4), 1], ['Minimum input voltage', fmt(r.minVin, 'V')]], notes: ['Uses the datasheet typical I<sub>ADJ</sub> of 50 µA. The input must stay about 3 V above the output.'] };
      }
    }));
  } });

  TABS.push({ id: 'wire', label: 'Wire Gauge', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Wire has resistance, so long runs lose voltage and waste power as heat. Enter the wire size (AWG; a <b>smaller number means a thicker wire</b>), the length, and the current. Solid copper at 20 °C.',
      fields: [
        { id: 'awg', label: 'Wire size (AWG, 0–40)', def: '22' }, { id: 'len', label: 'Length', def: '10' },
        { id: 'unit', label: 'Length unit', def: 'm', options: [['m', 'meters'], ['ft', 'feet']] }, { id: 'I', label: 'Current (A)', def: '2' },
        { id: 'round', label: 'Circuit', def: 'yes', options: [['yes', 'Round trip (out and back)'], ['no', 'One way only']] }, { id: 'Vs', label: 'Supply voltage (optional)', def: '12' }],
      run: function (v) {
        var r = K.wire({ awg: v.awg, len: v.len, unit: v.unit, I: v.I, round: v.round === 'yes', Vs: v.Vs }); if (r.error) return r;
        var rows = [['Wire diameter', r.d.toFixed(3) + ' mm'], ['Cross-section', r.area.toFixed(3) + ' mm²'], ['Resistance per meter', fmt(r.perM, OHM)], ['Resistance per foot', fmt(r.perFt, OHM)],
          ['Total wire length in the circuit', fmt(r.path, 'm')], ['Total wire resistance', fmt(r.R, OHM), 1], ['Voltage lost in the wire', fmt(r.drop, 'V'), 1]];
        if (r.dropPct !== undefined) rows.push(['Voltage drop of supply', r.dropPct.toFixed(1) + ' %', 1]);
        rows.push(['Power lost as heat', fmt(r.loss, 'W')]);
        return { rows: rows, notes: ['A common design target is under 3 % drop. This is a resistance calculator, not a safe-current (ampacity) chart. Safe current depends on insulation, bundling, and temperature, so check the wire’s datasheet or a code table for that.', 'Diameter follows ASTM B258: 0.127 mm × 92<sup>(36−n)/39</sup>. Copper resistivity 1.724×10⁻⁸ Ω·m. Stranded wire is slightly higher.'] };
      }
    }));
  } });

  TABS.push({ id: 'i2c', label: 'I²C Pull-up', build: function (pane) {
    pane.appendChild(block({
      blurb: 'I²C lines (SDA and SCL) need pull-up resistors to the supply. Too large and the signal rises too slowly for the bus speed; too small and the chips cannot pull the line low. This finds the allowed range from the I²C specification (NXP UM10204).',
      fields: [
        { id: 'Vdd', label: 'Bus supply (V)', def: '3.3' }, { id: 'mode', label: 'Bus speed', def: 'fast', options: [['std', 'Standard 100 kHz'], ['fast', 'Fast 400 kHz'], ['fmp', 'Fast-mode Plus 1 MHz']] },
        { id: 'Cb', label: 'Total bus capacitance (pF)', def: '100', scale: 1e-12, hint: 'wiring + each chip is about 10–20 pF' }],
      run: function (v) {
        var r = K.i2c(v); if (r.error) return r;
        var rows = [['Maximum pull-up (rise time)', fmt(r.rmax, OHM), 1], ['Minimum pull-up (sink current)', fmt(r.rmin, OHM), 1]];
        var notes = ['Maximum: R ≤ t<sub>r</sub> ÷ (0.8473 × C<sub>b</sub>), with t<sub>r</sub> = ' + fmt(r.mode.tr, 's') + ' for this speed. Minimum: R ≥ (Vdd − V<sub>OL</sub>) ÷ I<sub>OL</sub> = (' + fmt(v.Vdd, 'V') + ' − ' + fmt(r.vol, 'V') + ') ÷ ' + fmt(r.mode.iol, 'A') + '.'];
        if (r.pick !== undefined) { rows.push(['Suggested standard value (E24)', fmt(r.pick, OHM), 1]); notes.push('Pick a value inside the window, usually toward the middle. 4.7 kΩ is the common default at 100 kHz, and 2.2 kΩ is common at 400 kHz.'); }
        else notes.unshift('<b>No pull-up value satisfies both limits.</b> Reduce the bus capacitance (shorter wires, fewer devices), lower the bus speed, or use an I²C buffer or active pull-up.');
        if (r.over) notes.push('The spec limit for this speed is ' + fmt(r.mode.cmax, 'F') + ' total. You are over it.');
        if (v.mode === 'fmp') notes.push('Fast-mode Plus needs devices with 20 mA drive on their SDA/SCL pins. Check the datasheets.');
        return { rows: rows, notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'bat', label: 'Battery Life', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Estimates how long a battery lasts. If your project sleeps most of the time, fill in the sleep current and the percentage of time it is awake (the duty cycle) and the average is worked out for you.',
      fields: [
        { id: 'cap', label: 'Battery capacity (mAh)', def: '2000' }, { id: 'active', label: 'Active current (mA)', def: '80' },
        { id: 'sleep', label: 'Sleep current (µA)', def: '10', scale: 1e-3 }, { id: 'duty', label: 'Time awake (duty cycle, %)', def: '5' },
        { id: 'usable', label: 'Usable capacity (%)', def: '80' }],
      run: function (v) {
        var r = K.battery(v); if (r.error) return r;
        var d = r.days;
        return { rows: [['Average current', fmt(r.avg / 1000, 'A'), 1], ['Run time', r.hours < 48 ? r.hours.toFixed(1) + ' hours' : d.toFixed(1) + ' days', 1], ['Roughly', d >= 365 ? (d / 365).toFixed(2) + ' years' : (d / 30.4).toFixed(1) + ' months']],
          notes: ['Batteries rarely deliver their full printed capacity. Cold, high current draw, and cut-off voltage all reduce it, so 70–80 % usable is a sensible planning figure. Self-discharge is not included. Capacity figures are usually rated at a low current.'] };
      }
    }));
  } });

  TABS.push({ id: 'bjt', label: 'BJT Switch', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Using an NPN transistor (like a 2N2222 or BC547) as a switch for a LED strip, relay, or motor? Choose the <b>base resistor</b> so it saturates (turns fully on). The standard method is a <b>forced beta</b> of 10: feed the base one tenth of the load current.',
      fields: [
        { id: 'Ic', label: 'Load current (mA)', def: '100', scale: 1e-3 }, { id: 'Vdrive', label: 'Drive voltage from the pin (V)', def: '5' },
        { id: 'Vbe', label: 'Base-emitter drop (V)', def: '0.7' }, { id: 'beta', label: 'Forced beta', def: '10' }, { id: 'hfe', label: 'Transistor minimum hFE (optional)', def: '100' }],
      run: function (v) {
        var r = K.bjtSwitch(v); if (r.error) return r;
        var notes = ['Base current = load current ÷ forced beta. Rb = (Vdrive − Vbe) ÷ base current, then rounded <b>down</b> to a standard E24 value so there is a little extra base drive.',
          'Check the load current against the transistor’s rating, and add a flyback diode across any relay or motor.'];
        if (r.hfeOk === false) notes.unshift('<b>Warning:</b> the transistor’s minimum gain is below the forced beta, so it may not saturate. Use a lower forced beta, a transistor with more gain, or a Darlington or MOSFET.');
        return { rows: [['Base current needed', fmt(r.Ib, 'A'), 1], ['Calculated base resistor', fmt(r.Rb, OHM, 4)], ['Use this standard value (E24)', fmt(r.Rstd, OHM), 1], ['Actual base current', fmt(r.IbAct, 'A')], ['Base resistor dissipation', fmt(r.P, 'W')]], notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'mosfet', label: 'MOSFET Switch', build: function (pane) {
    pane.appendChild(block({
      blurb: 'A MOSFET switches big loads with almost no gate current. Use a <b>logic-level</b> MOSFET when a 3.3 V or 5 V pin drives the gate. This finds the heat the MOSFET makes, the voltage it drops, and a gate resistor.',
      fields: [
        { id: 'Id', label: 'Load current (A)', def: '10' }, { id: 'Vdrive', label: 'Gate drive voltage (V)', def: '5' },
        { id: 'Rds', label: 'Rds(on) at that voltage (m\u03a9)', def: '20', scale: 1e-3, hint: 'from the datasheet' }, { id: 'Vth', label: 'Gate threshold, max (V, optional)', def: '2' },
        { id: 'Qg', label: 'Total gate charge (nC, optional)', def: '30', scale: 1e-9 }, { id: 'f', label: 'Switching frequency (Hz, optional)', def: '20k' },
        { id: 'Ipk', label: 'Allowed gate peak current (mA, optional)', def: '20', scale: 1e-3 }],
      run: function (v) {
        var r = K.mosfet(v); if (r.error) return r;
        var rows = [['Voltage drop across the MOSFET', fmt(r.drop, 'V'), 1], ['Heat in the MOSFET (I\u00b2 \u00d7 Rds)', fmt(r.P, 'W'), 1], ['Rating to plan for', r.rec.label]];
        if (r.Igate !== undefined) rows.push(['Average gate drive current (Qg \u00d7 f)', fmt(r.Igate, 'A')]);
        if (r.RgStd !== undefined) { rows.push(['Gate resistor (calculated)', fmt(r.Rg, OHM)]); rows.push(['Use this standard value (E24)', fmt(r.RgStd, OHM), 1]); rows.push(['Gate peak current with it', fmt(r.IpkActual, 'A')]); }
        var notes = ['Use the Rds(on) the datasheet lists <b>at your gate voltage</b>. A part rated at 10 V can have much higher resistance at 3.3 V or 5 V.', 'Add a 10 k\u03a9 resistor from gate to ground so the MOSFET stays off while the microcontroller boots. Add a flyback diode across any motor or relay. For an N-channel MOSFET on the low side, connect the source to ground.'];
        if (r.vthOk === false) notes.unshift('<b>Warning:</b> the gate drive is not above the maximum threshold voltage, so the MOSFET will not turn on reliably.');
        return { rows: rows, notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'opamp', label: 'Op-Amp Gain', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Op-amp stages set their gain with two resistors. Pick the stage, enter Rf (the feedback resistor) and either the input resistor or the gain you want. Assumes an ideal op-amp, powered from a supply large enough that the output does not clip.',
      fields: [
        { id: 'mode', label: 'Stage', def: 'inv', options: [['inv', 'Inverting'], ['non', 'Non-inverting'], ['sum', 'Summing (two inputs, inverting)'], ['diff', 'Difference (matched resistors)']] },
        { id: 'Rf', label: 'Rf, feedback resistor (' + OHM + ')', def: '10k' }, { id: 'Rin', label: 'R1 or Rg, input resistor (' + OHM + ')', def: '1k' },
        { id: 'R2', label: 'R2, second input resistor (summing, ' + OHM + ')', def: '10k' }, { id: 'G', label: 'Or target gain (leave R1 blank)', def: '' },
        { id: 'V1', label: 'Input V1 (V, optional)', def: '0.5' }, { id: 'V2', label: 'Input V2 (V, optional)', def: '' }, { id: 'series', label: 'Standard values', def: 'E24', options: SERIES_OPTS }],
      run: function (v) {
        var r = K.opamp(v); if (r.error) return r;
        var rows = [];
        if (r.RinExact !== undefined) { rows.push(['Input resistor needed', fmt(r.RinExact, OHM)]); rows.push(['Nearest standard value', fmt(r.Rin, OHM), 1]); }
        if (r.gain !== undefined) rows.push(['Gain', (Math.round(r.gain * 1000) / 1000) + ' (' + (Math.round(20 * Math.log10(Math.abs(r.gain)) * 10) / 10) + ' dB)', 1]);
        if (r.g1 !== undefined) { rows.push(['Gain from V1', String(Math.round(r.g1 * 1000) / 1000), 1]); rows.push(['Gain from V2', String(Math.round(r.g2 * 1000) / 1000), 1]); }
        if (r.Vout !== undefined) rows.push(['Output voltage', fmt(r.Vout, 'V'), 1]);
        var f = { inv: 'Gain = \u2212Rf \u00f7 R1. The output is upside down. Input resistance is R1.', non: 'Gain = 1 + Rf \u00f7 Rg. The output follows the input, never below 1\u00d7.',
          sum: 'Vout = \u2212Rf \u00d7 (V1 \u00f7 R1 + V2 \u00f7 R2). With equal resistors it adds the inputs and inverts the sum.', diff: 'Gain = Rf \u00f7 R1 with R2 = R1 and the resistor to ground = Rf. Vout = gain \u00d7 (V2 \u2212 V1).' };
        return { rows: rows, notes: [f[v.mode], 'The output cannot go beyond the supply rails. Check that your op-amp works at your supply voltage and handles the frequency and gain (gain-bandwidth product).'] };
      }
    }));
  } });

  TABS.push({ id: 'zener', label: 'Zener Regulator', build: function (pane) {
    pane.appendChild(block({
      blurb: 'A zener diode and a series resistor give a simple fixed voltage. The resistor must pass the load current <b>plus</b> enough current to keep the zener in regulation. It is for small loads only; larger loads need a regulator.',
      fields: [{ id: 'Vin', label: 'Input voltage (V)', def: '12' }, { id: 'Vz', label: 'Zener voltage (V)', def: '5.1' },
        { id: 'Iload', label: 'Maximum load current (mA)', def: '20', scale: 1e-3 }, { id: 'Iz', label: 'Zener bias current (mA)', def: '5', scale: 1e-3, hint: 'check the datasheet test current' }],
      run: function (v) {
        var r = K.zener(v); if (r.error) return r;
        return { rows: [['Series resistor (calculated)', fmt(r.R, OHM, 4)], ['Use this standard value (E24)', fmt(r.Rstd, OHM), 1], ['Resistor dissipation', fmt(r.Pr, 'W')], ['Resistor rating', r.recR.label],
          ['Zener current at full load', fmt(r.Iz, 'A')], ['Zener power with no load (worst case)', fmt(r.PzNoLoad, 'W'), 1], ['Zener rating to use', r.recZ.label]],
          notes: ['R = (Vin \u2212 Vz) \u00f7 (Iz + Iload), rounded <b>down</b> so the zener always has enough current. With no load, all the current goes through the zener, so size it for that case.', 'The output varies with load and temperature, and real zeners are loose at low voltages. Check Vin droops: the regulator only works while Vin stays above Vz plus the resistor drop.'] };
      }
    }));
  } });

  TABS.push({ id: 'tol', label: 'Divider Tolerance', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Real resistors are never exact. This finds the lowest and highest output a voltage divider can give if each resistor is at the edge of its tolerance in the worst direction.',
      fields: [{ id: 'Vin', label: 'Input voltage (V)', def: '5' }, { id: 'R1', label: 'R1, top (' + OHM + ')', def: '4.7k' }, { id: 'R2', label: 'R2, bottom (' + OHM + ')', def: '9.1k' },
        { id: 'tol', label: 'Resistor tolerance (%)', def: '5', hint: '1, 2, 5, 10' }],
      run: function (v) {
        var r = K.tolerance(v); if (r.error) return r;
        return { rows: [['Nominal output', fmt(r.nom, 'V', 4), 1], ['Lowest possible output', fmt(r.min, 'V', 4) + ' (' + r.minPct.toFixed(1) + ' %)', 1], ['Highest possible output', fmt(r.max, 'V', 4) + ' (+' + r.maxPct.toFixed(1) + ' %)', 1]],
          notes: ['The worst case is R1 at one extreme and R2 at the other. Two 1 % resistors can still move the output by close to 2 %. If the output matters, use tighter parts or trim it.'] };
      }
    }));
  } });

  TABS.push({ id: 'shunt', label: 'Current Shunt', build: function (pane) {
    pane.appendChild(block({
      blurb: 'To measure current, put a tiny resistor (a shunt) in the path and measure the voltage across it. A bigger shunt gives a bigger signal but wastes more voltage and power.',
      fields: [{ id: 'I', label: 'Maximum current (A)', def: '5' }, { id: 'Vs', label: 'Sense voltage at that current (mV)', def: '100', scale: 1e-3 },
        { id: 'Vfs', label: 'ADC full-scale voltage (V, optional)', def: '3.3', hint: 'to find the amplifier gain' }],
      run: function (v) {
        var r = K.shunt(v); if (r.error) return r;
        var rows = [['Shunt resistor (calculated)', fmt(r.R, OHM, 4)], ['Standard value (E96, rounded down)', fmt(r.Rstd, OHM), 1], ['Sense voltage at full current', fmt(r.Vsense, 'V'), 1], ['Shunt dissipation', fmt(r.P, 'W'), 1], ['Rating to use', r.rec.label]];
        if (r.gain !== undefined) rows.push(['Amplifier gain to reach ADC full scale', (Math.round(r.gain * 10) / 10) + '\u00d7']);
        return { rows: rows, notes: ['R = Vsense \u00f7 I. Use a low-inductance, tight-tolerance, four-terminal (Kelvin) part for accuracy, and measure across the shunt\u2019s sense pads. A current-sense amplifier chip does the gain step.'] };
      }
    }));
  } });

  TABS.push({ id: 'ntc', label: 'NTC Thermistor', build: function (pane) {
    pane.appendChild(block({
      blurb: 'An NTC thermistor\u2019s resistance falls as it warms. The Beta equation turns a measured resistance into a temperature: <b>1/T = 1/T0 + (1/B) \u00d7 ln(R / R0)</b>, with temperatures in kelvin. Find R0, T0, and B on the thermistor\u2019s datasheet (a typical 10 k\u03a9 part is 10 k\u03a9 at 25 \u00b0C with B near 3950).',
      fields: [{ id: 'mode', label: 'I want to', def: 'R2T', options: [['R2T', 'Find temperature from resistance'], ['T2R', 'Find resistance at a temperature']] },
        { id: 'R0', label: 'Nominal resistance R0 (' + OHM + ')', def: '10k' }, { id: 'T0', label: 'Nominal temperature T0 (\u00b0C)', def: '25' }, { id: 'B', label: 'B value (K)', def: '3950' },
        { id: 'R', label: 'Measured resistance (' + OHM + ')', def: '6.5k' }, { id: 'T', label: 'Temperature (\u00b0C)', def: '40' }],
      run: function (v) {
        var r = K.ntc(v); if (r.error) return r;
        if (v.mode === 'T2R') return { rows: [['Resistance', fmt(r.R, OHM), 1]], notes: ['The Beta model is accurate near T0 and drifts over a wide range. For wide-range accuracy use the Steinhart\u2013Hart coefficients or the datasheet table.'] };
        return { rows: [['Temperature', r.T.toFixed(1) + ' \u00b0C', 1], ['In Fahrenheit', r.F.toFixed(1) + ' \u00b0F']], notes: ['The Beta model is accurate near T0 and drifts over a wide range. To read it with a microcontroller, put the thermistor in a voltage divider with a fixed resistor equal to R0 and convert the ADC reading to resistance first. See the Component Marking Decoder for reading thermistor markings.'] };
      }
    }));
  } });

  TABS.push({ id: 'db', label: 'Decibels', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Decibels compare two levels on a log scale. Voltage ratios use 20 \u00d7 log10 and power ratios use 10 \u00d7 log10. A <b>dBm</b> is power compared to 1 milliwatt, which radio people use constantly.',
      fields: [{ id: 'mode', label: 'Convert', def: 'v2db', options: [['v2db', 'Voltage ratio to dB'], ['p2db', 'Power ratio to dB'], ['db2v', 'dB to voltage ratio'], ['db2p', 'dB to power ratio'], ['dbm2w', 'dBm to watts'], ['w2dbm', 'Watts to dBm']] },
        { id: 'value', label: 'Value', def: '2', hint: 'ratio, dB, dBm, or watts' }],
      run: function (v) {
        var r = K.decibels(v); if (r.error) return r;
        var out = r.unit === 'W' ? fmt(r.out, 'W') : String(Number(r.out.toPrecision(5))) + ' ' + r.unit;
        return { rows: [['Result', out, 1]], notes: ['Handy anchors: +3 dB is double the power, +6 dB is double the voltage, +10 dB is ten times the power, +20 dB is ten times the voltage, and 0 dBm is 1 mW (30 dBm is 1 W).'] };
      }
    }));
  } });

  TABS.push({ id: 'about', label: 'About', build: function (pane) {
    var h = '<div class="about"><h3>What this is</h3><p>A set of free calculators for the math makers do all the time. Every result shows its formula or working, so you can learn the method as well as get the number.</p>' +
      '<h3>How to use it</h3><p>Pick a calculator. Type values using engineering prefixes: <b>p</b> pico, <b>n</b> nano, <b>u</b> micro, <b>m</b> milli, <b>k</b> kilo, <b>M</b> mega. For example <b>4.7k</b>, <b>100n</b>, <b>20m</b>, or <b>4k7</b>. Capital M is mega and lowercase m is milli. Results update as you type and are shown in engineering notation, so 0.0047 A reads 4.7 mA.</p>' +
      '<h3>Accuracy and limits</h3><p>The standard-value series are the IEC 60063 E6, E12, E24, E48, and E96 preferred numbers. Formulas are the usual textbook and datasheet ones (the 555 and LM317 use typical datasheet values; I²C follows NXP UM10204; wire follows ASTM B258). They describe ideal parts. Real components have tolerance, temperature drift, and parasitic effects, so always confirm anything critical with the datasheet and with a meter.</p>' +
      '<h3>License and source</h3><p>' + link(APP.license, APP.licenseName) + ': free for commercial and non-commercial use. You may modify it and add to it. Please keep the license, the NOTICE file, and the “Developed and Maintained by TheMakersWorkbench.com” footer intact.' +
      (APP.repo ? ' ' + link(APP.repo, 'View the Project on GitHub') + '.' : '') + '</p></div>';
    pane.appendChild(el('div', null, h));
  } });

  /* ---------- shell ---------- */
  var LOGO = '<svg class="dec-logo" viewBox="0 0 72 72" role="img" aria-label="Calculator"><rect x="2" y="2" width="68" height="68" rx="16" fill="#0a2147" stroke="rgba(255,255,255,.28)" stroke-width="2"/>' +
    '<rect x="16" y="12" width="40" height="48" rx="6" fill="#e3cb98"/><rect x="21" y="17" width="30" height="12" rx="2" fill="#1f2328"/><path d="M26 23h8M40 20v6M37 23h6" stroke="#4aa3ff" stroke-width="2" stroke-linecap="round"/>' +
    '<g fill="#7a3fb5"><rect x="21" y="34" width="8" height="6" rx="1.5"/><rect x="32" y="34" width="8" height="6" rx="1.5"/></g><g fill="#d62828"><rect x="43" y="34" width="8" height="6" rx="1.5"/><rect x="21" y="43" width="8" height="6" rx="1.5"/></g><g fill="#f6d90b"><rect x="32" y="43" width="8" height="6" rx="1.5"/><rect x="43" y="43" width="8" height="6" rx="1.5"/></g></svg>';
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
  show('ohm');
})();
