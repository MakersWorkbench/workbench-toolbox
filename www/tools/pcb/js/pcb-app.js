/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* PCB and Wiring Tools UI. Needs calc-logic.js (TMWBCalc). Mounts into #tmwb-calc. */
(function () {
  'use strict';
  var root = document.getElementById('tmwb-pcb');
  if (!root || !window.TMWBPcb) return;
  var K = window.TMWBPcb, fmt = K.fmt, OHM = 'Ω';
  var HEADING = /^h[1-6]$/i.test(root.getAttribute('data-heading') || '') ? root.getAttribute('data-heading') : 'h1';
  var APP = {
    name: 'PCB and Wiring Tools',
    tag: 'Calculators for PCB traces, vias, spacing, and wire gauge',
    intro: 'Five free tools for circuit board and wiring design: trace width for a current, trace resistance and drop, via current, conductor spacing for a voltage, and wire gauge conversion with voltage drop. Type values with prefixes, and the answers update as you type.',
    site: 'https://www.themakersworkbench.com',
    repo: 'https://github.com/MakersWorkbench/pcb-wiring',
    wiki: 'https://github.com/MakersWorkbench/pcb-wiring/wiki',
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

  /* ---------- the tools ---------- */
  var TABS = [];
  var OZ = [['0.5', '0.5 oz (17 \u00b5m)'], ['1', '1 oz (35 \u00b5m)'], ['2', '2 oz (70 \u00b5m)'], ['3', '3 oz (105 \u00b5m)']];

  TABS.push({ id: 'trace', label: 'Trace Width', build: function (pane) {
    pane.appendChild(block({
      blurb: 'How wide must a copper trace be to carry a current without getting too hot? This uses the IPC-2221 formula, <b>I = k \u00d7 \u0394T<sup>0.44</sup> \u00d7 A<sup>0.725</sup></b>, where A is the trace cross-section and \u0394T is the temperature rise above ambient you will accept.',
      fields: [{ id: 'I', label: 'Current (A)', def: '2' }, { id: 'oz', label: 'Copper weight', def: '1', options: OZ }, { id: 'dT', label: 'Allowed temperature rise (\u00b0C)', def: '10' },
        { id: 'layer', label: 'Layer', def: 'ext', options: [['ext', 'External (outer layer)'], ['int', 'Internal (inner layer)']] }],
      run: function (v) {
        var r = K.traceWidth({ I: v.I, oz: Number(v.oz), dT: v.dT, layer: v.layer }); if (r.error) return r;
        var notes = ['Copper thickness is ' + r.thickUm + ' \u00b5m (' + r.thickMil.toFixed(2) + ' mil). Internal traces must be about 2.6 times wider for the same current because they cannot shed heat into the air. A common starting point is a 10 \u00b0C rise; use a bigger width for headroom, or for long traces that must not drop voltage.',
          'IPC-2221 is the long-standing rule and is simple, but IPC-2152 (newer, based on measurements) shows real boards often run cooler than IPC-2221 predicts, depending on the board stack-up and copper planes. Treat the result as a safe starting point, not an exact figure. IPC-2221 data covers up to about 35 A.'];
        if (r.outOfRange) notes.unshift('<b>Warning:</b> this current is above the range the IPC-2221 curves cover. Use wide copper pours, thick copper, or bus bars, and verify with the standard.');
        return { rows: [['Minimum trace width', r.wMm.toFixed(2) + ' mm (' + r.wMil.toFixed(1) + ' mil)', 1], ['Cross-section', r.areaMil2.toFixed(1) + ' mil\u00b2'], ['Copper thickness', r.thickUm + ' \u00b5m']], notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'res', label: 'Trace Resistance', build: function (pane) {
    pane.appendChild(block({
      blurb: 'A copper trace is a long thin resistor: <b>R = \u03c1 \u00d7 length \u00f7 (width \u00d7 thickness)</b>. For power rails and sense lines it matters how much voltage the trace steals. Copper resistivity is 1.724\u00d710\u207b\u2078 \u03a9\u00b7m at 20 \u00b0C and rises about 0.393 % per \u00b0C.',
      fields: [{ id: 'len', label: 'Trace length (mm)', def: '100' }, { id: 'w', label: 'Trace width (mm)', def: '0.5' }, { id: 'oz', label: 'Copper weight', def: '1', options: OZ },
        { id: 'I', label: 'Current (A, optional)', def: '2' }, { id: 'T', label: 'Trace temperature (\u00b0C)', def: '20' }],
      run: function (v) {
        var r = K.traceResistance({ len: v.len, w: v.w, oz: Number(v.oz), I: v.I, T: v.T }); if (r.error) return r;
        var rows = [['Resistance at 20 \u00b0C', fmt(r.R20, OHM), 1], ['Resistance at ' + r.T + ' \u00b0C', fmt(r.R, OHM)]];
        if (r.drop !== undefined) { rows.push(['Voltage lost in the trace', fmt(r.drop, 'V'), 1]); rows.push(['Power lost as heat', fmt(r.P, 'W')]); }
        return { rows: rows, notes: ['Plated surface copper is a little thicker than the base copper weight, and etching makes real traces slightly narrower, so expect results within about 10 %. For current sensing with a trace, the temperature coefficient (0.39 %/\u00b0C) can matter a lot. A shunt resistor is steadier.'] };
      }
    }));
  } });

  TABS.push({ id: 'via', label: 'Via Current', build: function (pane) {
    pane.appendChild(block({
      blurb: 'A via is a plated hole carrying current between layers. Only the thin copper barrel carries it. This estimates the current by treating the barrel as a tiny trace of the same cross-section, using the IPC-2221 internal-conductor curve (a conservative choice).',
      fields: [{ id: 'drill', label: 'Finished hole diameter (mm)', def: '0.3' }, { id: 'plate', label: 'Plating thickness (\u00b5m)', def: '25', hint: '25 is typical' },
        { id: 'dT', label: 'Allowed temperature rise (\u00b0C)', def: '10' }, { id: 'len', label: 'Via length / board thickness (mm, optional)', def: '1.6' }],
      run: function (v) {
        var r = K.via(v); if (r.error) return r;
        var rows = [['Estimated safe current per via', fmt(r.I, 'A'), 1], ['Barrel copper cross-section', r.areaMil2.toFixed(1) + ' mil\u00b2']];
        if (r.R !== undefined) rows.push(['Resistance of one via', fmt(r.R, OHM)]);
        return { rows: rows, notes: ['This is an <b>estimate</b>. Published data for vias is thinner than for traces, so keep a healthy margin. Common practice is to use several vias in parallel for high current (they share it, but not perfectly) and to place extras rather than relying on one.'] };
      }
    }));
  } });

  TABS.push({ id: 'space', label: 'Trace Spacing', build: function (pane) {
    var opts = Object.keys(K.SPACING).map(function (k) { return [k, K.SPACING[k].name]; });
    pane.appendChild(block({
      blurb: 'Two conductors at different voltages must be far enough apart that electricity does not jump (arc) or creep across the surface. This looks up the minimum spacing from IPC-2221 Table 6-1 for DC or peak voltage up to 500 V.',
      fields: [{ id: 'V', label: 'Voltage between conductors (V, peak or DC)', def: '48' }, { id: 'kind', label: 'Where the conductors are', def: 'ext', options: opts }],
      run: function (v) {
        var r = K.spacing(v); if (r.error) return r;
        return { rows: [['Minimum spacing', r.mm.toFixed(2) + ' mm (' + r.mil.toFixed(1) + ' mil)', 1], ['Table row used', 'up to ' + r.upTo + ' V']],
          notes: ['A coating (solder mask is <b>not</b> enough, it needs a proper conformal or polymer coating) allows tighter spacing. Dust, humidity, and altitude push the numbers up.',
            '<b>Safety:</b> this table is for general board design. Mains-connected equipment must meet the safety standards for your product (for example IEC 62368-1 or IEC 60664) for creepage and clearance, which are stricter. Do not use this alone for mains work.'] };
      }
    }));
  } });

  TABS.push({ id: 'awg', label: 'Wire Gauge', build: function (pane) {
    pane.appendChild(block({
      title: 'AWG and metric sizes', blurb: 'Convert between AWG and the metric cross-section (mm\u00b2) and see the wire\u2019s diameter and resistance. A smaller AWG number means a thicker wire.',
      fields: [{ id: 'mode', label: 'Convert', def: 'a2m', options: [['a2m', 'AWG to mm\u00b2'], ['m2a', 'mm\u00b2 to AWG']] }, { id: 'value', label: 'Value (AWG number or mm\u00b2)', def: '22' }],
      run: function (v) {
        if (v.mode === 'a2m') { var a = K.awgToMetric(v.value); if (a.error) return a; return { rows: [['Cross-section', a.area.toFixed(3) + ' mm\u00b2', 1], ['Diameter', a.d.toFixed(3) + ' mm'], ['Resistance per meter (copper, 20 \u00b0C)', fmt(a.perM, OHM)]] }; }
        var m = K.metricToAwg(v.value); if (m.error) return m;
        return { rows: [['Nearest AWG', String(m.nearest), 1], ['Exact (fractional) AWG', m.awg.toFixed(2)], ['Diameter', m.d.toFixed(3) + ' mm']], notes: ['Metric wire is sold in sizes like 0.25, 0.5, 0.75, 1.0, 1.5, and 2.5 mm\u00b2. The nearest AWG is a guide only, so check that the wire is thick enough for your current.'] };
      }
    }));
    pane.appendChild(block({
      title: 'Voltage drop in a wire run', blurb: 'Wire has resistance, so long runs lose voltage and waste power as heat. Solid copper at 20 \u00b0C.',
      fields: [{ id: 'awg', label: 'Wire size (AWG, 0\u201340)', def: '22' }, { id: 'len', label: 'Length', def: '10' }, { id: 'unit', label: 'Length unit', def: 'm', options: [['m', 'meters'], ['ft', 'feet']] },
        { id: 'I', label: 'Current (A)', def: '2' }, { id: 'round', label: 'Circuit', def: 'yes', options: [['yes', 'Round trip (out and back)'], ['no', 'One way only']] }, { id: 'Vs', label: 'Supply voltage (optional)', def: '12' }],
      run: function (v) {
        var r = K.wire({ awg: v.awg, len: v.len, unit: v.unit, I: v.I, round: v.round === 'yes', Vs: v.Vs }); if (r.error) return r;
        var rows = [['Total wire resistance', fmt(r.R, OHM), 1], ['Voltage lost in the wire', fmt(r.drop, 'V'), 1]];
        if (r.dropPct !== undefined) rows.push(['Voltage drop of supply', r.dropPct.toFixed(1) + ' %', 1]);
        rows.push(['Power lost as heat', fmt(r.loss, 'W')]);
        return { rows: rows, notes: ['A common design target is under 3 % drop. This is a resistance calculator, not a safe-current (ampacity) chart. Safe current depends on insulation, bundling, and temperature, so check the wire\u2019s datasheet or a code table.'] };
      }
    }));
  } });

  TABS.push({ id: 'about', label: 'About', build: function (pane) {
    var h = '<div class="about"><h3>What this is</h3><p>A set of free tools for circuit board and wiring design, with the formula shown beside each answer.</p>' +
      '<h3>How to use it</h3><p>Pick a tool. Type values with prefixes if you like: <b>k</b> kilo, <b>m</b> milli, <b>u</b> micro. Sizes are in millimeters unless a label says otherwise (1 mil is 0.0254 mm).</p>' +
      '<h3>Accuracy and safety</h3><p>The trace and via formulas are the IPC-2221 curves, which are conservative for many boards and are a starting point. The newer IPC-2152 gives more detailed results, and your board stack-up matters. Spacing tables are for general use only. Mains and safety-critical designs must meet the applicable safety standards. Always confirm with the standards and your board maker\u2019s rules.</p>' +
      '<h3>License and source</h3><p>' + link(APP.license, APP.licenseName) + ': free for commercial and non-commercial use. You may modify it and add to it. Please keep the license, the NOTICE file, and the \u201cDeveloped and Maintained by TheMakersWorkbench.com\u201d footer intact.' +
      (APP.repo ? ' ' + link(APP.repo, 'View the Project on GitHub') + '.' : '') + '</p></div>';
    pane.appendChild(el('div', null, h));
  } });

  /* ---------- shell ---------- */
  var LOGO = '<svg class="dec-logo" viewBox="0 0 72 72" role="img" aria-label="Circuit board"><rect x="2" y="2" width="68" height="68" rx="16" fill="#0a2147" stroke="rgba(255,255,255,.28)" stroke-width="2"/>' +
    '<rect x="13" y="13" width="46" height="46" rx="5" fill="#0f5a3a" stroke="#7bd88f" stroke-width="2"/>' +
    '<path d="M20 28h14l6 6h12M20 44h10l5-5M40 20v8M32 52h20" stroke="#e3cb98" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="20" cy="28" r="3.2" fill="#e3cb98"/><circle cx="52" cy="34" r="3.2" fill="#e3cb98"/><circle cx="20" cy="44" r="3.2" fill="#e3cb98"/><circle cx="40" cy="20" r="3.2" fill="#e3cb98"/></svg>';
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
  show('trace');
})();
