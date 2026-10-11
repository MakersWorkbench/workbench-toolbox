/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* Power and Battery Tools UI. Needs calc-logic.js (TMWBCalc). Mounts into #tmwb-calc. */
(function () {
  'use strict';
  var root = document.getElementById('tmwb-pwr');
  if (!root || !window.TMWBPwr) return;
  var K = window.TMWBPwr, fmt = K.fmt, OHM = 'Ω';
  var HEADING = /^h[1-6]$/i.test(root.getAttribute('data-heading') || '') ? root.getAttribute('data-heading') : 'h1';
  var APP = {
    name: 'Power and Battery Tools',
    tag: 'Regulators, batteries, and power supplies',
    intro: 'Five free tools for powering your projects: a linear regulator heat check, capacitor discharge and bleeder resistors, battery pack designer, battery life with a regulator, and rectifier filter capacitors. Type values with prefixes like 470u or 2.2k, and the answers update as you type.',
    site: 'https://www.themakersworkbench.com',
    repo: 'https://github.com/MakersWorkbench/power-battery',
    wiki: 'https://github.com/MakersWorkbench/power-battery/wiki',
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

  function dur(s) {
    if (s < 1) return fmt(s, 's');
    if (s < 120) return s.toFixed(1) + ' s';
    if (s < 7200) return (s / 60).toFixed(1) + ' minutes';
    if (s < 172800) return (s / 3600).toFixed(1) + ' hours';
    return (s / 86400).toFixed(1) + ' days';
  }

  TABS.push({ id: 'reg', label: 'Regulator Heat', build: function (pane) {
    pane.appendChild(block({
      blurb: 'A linear regulator (7805, LM317, AMS1117) turns the extra voltage into heat: <b>power = (Vin \u2212 Vout) \u00d7 current</b>. This checks whether your regulator will survive and how big a heatsink it needs. Get the thermal resistance numbers from the regulator\u2019s datasheet.',
      fields: [
        { id: 'Vin', label: 'Input voltage (V)', def: '12' }, { id: 'Vout', label: 'Output voltage (V)', def: '5' }, { id: 'I', label: 'Load current (mA)', def: '500', scale: 1e-3 },
        { id: 'Iq', label: 'Regulator quiescent current (mA)', def: '5', scale: 1e-3 }, { id: 'thJA', label: 'Junction to ambient, no heatsink (\u00b0C/W)', def: '65' },
        { id: 'Ta', label: 'Ambient temperature (\u00b0C)', def: '25' }, { id: 'TjMax', label: 'Max junction temperature (\u00b0C)', def: '125' },
        { id: 'thJC', label: 'Junction to case (\u00b0C/W)', def: '5' }, { id: 'thCS', label: 'Case to heatsink (\u00b0C/W)', def: '1' }],
      run: function (v) {
        var r = K.linearReg(v); if (r.error) return r;
        var label = { ok: 'OK without a heatsink', marginal: 'Marginal: hot', sink: 'Needs a heatsink' }[r.verdict];
        var rows = [['Verdict', '<span class="verdict v-' + (r.verdict === 'ok' ? 'ok' : r.verdict === 'marginal' ? 'marginal' : 'danger') + '">' + label + '</span>', 1], ['Power turned into heat', fmt(r.P, 'W'), 1], ['Efficiency', r.eff.toFixed(0) + ' %'],
          ['Junction temperature, no heatsink', r.Tj.toFixed(0) + ' \u00b0C' + (r.ok ? '' : ' (over the limit)'), 1], ['Most heat it can shed with no heatsink', fmt(r.PmaxNoSink, 'W')]];
        var notes = ['Junction temperature = ambient + power \u00d7 thermal resistance. The datasheet rating (often 125 or 150 \u00b0C) is the limit, and staying well below it is wise. Typical junction-to-ambient figures are tens of \u00b0C/W (a bare TO-220 is roughly 50 to 65), and surface-mount packages depend on the copper area under them.'];
        if (!r.ok) {
          if (r.impossible) { rows.push(['Heatsink needed', 'Not possible with these numbers', 1]); notes.unshift('<b>Even a perfect heatsink cannot cool this.</b> Reduce the voltage drop (use a lower input voltage), the current, or switch to a buck (switching) regulator.'); }
          else { rows.push(['Heatsink needed (case to air)', '\u2264 ' + r.thSA.toFixed(1) + ' \u00b0C/W', 1]); notes.unshift('Choose a heatsink rated at or below this thermal resistance, mounted with a thermal pad or paste. Or lower the input voltage, share the heat with a series resistor, or use a switching regulator, which wastes far less.'); }
        }
        notes.push('The regulator also needs the dropout voltage (often 2 to 3 V for a 7805, under 1 V for an LDO) between input and output to regulate at all.');
        return { rows: rows, notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'dis', label: 'Capacitor Discharge', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Big capacitors in power supplies can hold a dangerous charge long after power is off. Find how long a resistor takes to discharge one, or the resistor needed to do it in a set time: <b>t = R \u00d7 C \u00d7 ln(V0 \u00f7 Vsafe)</b>.',
      fields: [
        { id: 'mode', label: 'I want to', def: 'time', options: [['time', 'Find the discharge time'], ['bleeder', 'Find the bleeder resistor']] },
        { id: 'C', label: 'Capacitance (F)', def: '470u' }, { id: 'V0', label: 'Starting voltage (V)', def: '400' }, { id: 'V', label: 'Safe voltage to reach (V)', def: '50' },
        { id: 'R', label: 'Discharge resistor (' + OHM + ', time mode)', def: '100k' }, { id: 't', label: 'Wanted time (s, bleeder mode)', def: '60' }],
      run: function (v) {
        var r = K.capDischarge(v); if (r.error) return r;
        var rows;
        if (v.mode === 'bleeder') rows = [['Bleeder resistor (calculated)', fmt(r.R, OHM, 4)], ['Use this standard value (E24, rounded down)', fmt(r.Rstd, OHM), 1], ['Discharge time with it', dur(r.tActual), 1],
          ['Starting power in the resistor', fmt(r.P0, 'W'), 1], ['Energy stored in the capacitor', fmt(r.energy, 'J')]];
        else rows = [['Time to fall to ' + fmt(v.V, 'V'), dur(r.t), 1], ['Time constant (RC)', dur(r.tau)], ['Time to nearly empty (5 \u00d7 RC)', dur(r.t5)], ['Starting power in the resistor', fmt(r.P0, 'W'), 1], ['Energy stored in the capacitor', fmt(r.energy, 'J')]];
        return { rows: rows, notes: ['The resistor power is highest at the start (V\u00b2 \u00f7 R) and falls fast. Use a resistor rated for the high voltage and the starting power, or one with a pulse rating.',
          '<b>Safety:</b> a bleeder is a backup, not a guarantee. Never rely on it. Always measure the capacitor with a multimeter before touching the circuit, and discharge large or high-voltage capacitors through a proper discharge tool.'] };
      }
    }));
  } });

  TABS.push({ id: 'pack', label: 'Battery Pack', build: function (pane) {
    var opts = Object.keys(K.CHEM).map(function (k) { return [k, K.CHEM[k].name]; });
    pane.appendChild(block({
      blurb: 'Cells in <b>series</b> (S) add their voltage. Cells in <b>parallel</b> (P) add their capacity. A <b>3S2P</b> pack is two parallel pairs of cells, three pairs in a chain: 6 cells in all. Pick the chemistry, the cell size, and the layout.',
      fields: [{ id: 'chem', label: 'Cell chemistry', def: 'liion', options: opts }, { id: 'cap', label: 'Capacity of one cell (mAh)', def: '2500' },
        { id: 's', label: 'Cells in series (S)', def: '3' }, { id: 'p', label: 'Cells in parallel (P)', def: '2' }, { id: 'crate', label: 'Max discharge rate (C, optional)', def: '', hint: 'from the cell datasheet' }],
      run: function (v) {
        var r = K.batteryPack(v); if (r.error) return r;
        var rows = [['Pack layout', r.s + 'S' + r.p + 'P (' + r.cells + ' cells)', 1], ['Nominal voltage', fmt(r.nom, 'V', 4), 1], ['Full charge voltage', fmt(r.max, 'V', 4)], ['Empty (cut-off) voltage', fmt(r.min, 'V', 4)],
          ['Capacity', r.capMah + ' mAh', 1], ['Stored energy', r.energy.toFixed(1) + ' Wh', 1]];
        if (r.maxI !== undefined) rows.push(['Max continuous current', fmt(r.maxI, 'A')]);
        return { rows: rows, notes: ['Voltages are typical per-cell figures (nominal, full charge, and cut-off). Check the cell datasheet for exact values. Energy = nominal volts \u00d7 amp-hours.',
          'Series packs of lithium cells need a <b>battery management system (BMS)</b> to balance the cells and protect against overcharge, over-discharge, and short circuits. Use matched cells (same type, age, and charge level) and never mix chemistries. Max current in C: a 2500 mAh cell at 2C can give 5 A.'] };
      }
    }));
  } });

  TABS.push({ id: 'life', label: 'Battery Life Pro', build: function (pane) {
    pane.appendChild(block({
      blurb: 'A better battery estimate for projects that wake up, work, and sleep. It also counts the <b>regulator</b>: a switching converter wastes some power, and a linear regulator draws the same current from the battery as the load.',
      fields: [
        { id: 'cap', label: 'Battery capacity (mAh)', def: '2500' }, { id: 'usable', label: 'Usable capacity (%)', def: '80' },
        { id: 'Ia', label: 'Active current (mA)', def: '120' }, { id: 'ta', label: 'Active time per cycle (s)', def: '5' },
        { id: 'Is', label: 'Sleep current (\u00b5A)', def: '20', scale: 1e-3 }, { id: 'ts', label: 'Sleep time per cycle (s)', def: '55' },
        { id: 'reg', label: 'Regulator', def: 'switch', options: [['none', 'None (runs from the battery)'], ['linear', 'Linear (LDO, 7805)'], ['switch', 'Switching (buck or boost)']] },
        { id: 'Vbat', label: 'Battery voltage (V)', def: '3.7' }, { id: 'Vout', label: 'Rail voltage (V)', def: '3.3' }, { id: 'eff', label: 'Switching efficiency (%)', def: '90' },
        { id: 'Iq', label: 'Regulator quiescent current (\u00b5A)', def: '', scale: 1e-3 }],
      run: function (v) {
        var r = K.batteryLifeAdv(v); if (r.error) return r;
        return { rows: [['Awake for', r.duty.toFixed(1) + ' % of the time'], ['Average current of the load', fmt(r.avgLoad / 1000, 'A'), 1], ['Average current from the battery', fmt(r.Ibat / 1000, 'A'), 1], ['Run time', dur(r.hours * 3600), 1]],
          notes: ['Average load = (active current \u00d7 active time + sleep current \u00d7 sleep time) \u00f7 cycle time. A switching regulator draws battery current = load current \u00d7 Vout \u00f7 (Vbat \u00d7 efficiency). A linear regulator draws the same current as the load plus its own quiescent current, whatever the voltage drop.',
            'Efficiency drops at very light loads, so a sleeping project can waste more than this shows. Self-discharge, temperature, and radio current spikes are not modeled. Plan with 70 to 80 % usable capacity.'] };
      }
    }));
  } });

  TABS.push({ id: 'rip', label: 'Filter Capacitor', build: function (pane) {
    pane.appendChild(block({
      blurb: 'After a rectifier, a big capacitor smooths the bumpy output. It supplies the load between peaks, and the voltage dips by about <b>ripple = current \u00f7 (ripple frequency \u00d7 capacitance)</b>. Leave the capacitor blank to find the size you need, or fill it in to check the ripple.',
      fields: [{ id: 'I', label: 'Load current (mA)', def: '500', scale: 1e-3 },
        { id: 'f', label: 'Rectifier', def: '120', options: [['100', 'Full-wave, 50 Hz mains (100 Hz ripple)'], ['120', 'Full-wave, 60 Hz mains (120 Hz ripple)'], ['50', 'Half-wave, 50 Hz mains'], ['60', 'Half-wave, 60 Hz mains']] },
        { id: 'dV', label: 'Allowed ripple (V peak to peak)', def: '1' }, { id: 'C', label: 'Capacitor to check (F, or blank)', def: '', hint: 'leave blank to find it' }],
      run: function (v) {
        var r = K.ripple({ I: v.I, f: Number(v.f), dV: v.dV, C: v.C }); if (r.error) return r;
        if (v.C > 0) return { rows: [['Ripple voltage', fmt(r.dV, 'V'), 1]], notes: ['Ripple = I \u00f7 (f \u00d7 C). Real capacitors also have ESR (internal resistance) that adds ripple, and the diodes add a pulse of charging current each cycle.'] };
        return { rows: [['Capacitor needed', fmt(r.C, 'F', 4), 1], ['Standard value (E12, rounded up)', fmt(r.Cstd, 'F'), 1], ['Ripple with that value', fmt(r.dVStd, 'V')]],
          notes: ['C = I \u00f7 (f \u00d7 ripple). Choose a capacitor rated well above the peak voltage (about 1.5\u00d7 or more) and with enough ripple-current rating. Electrolytics have wide tolerance (\u221220 to +80 %), so round up. A linear regulator after the filter can tolerate a few volts of ripple as long as the lowest dip stays above its dropout.'] };
      }
    }));
  } });

  TABS.push({ id: 'about', label: 'About', build: function (pane) {
    var h = '<div class="about"><h3>What this is</h3><p>A set of free tools for powering electronics projects, with the formula shown beside each answer.</p>' +
      '<h3>How to use it</h3><p>Pick a tool. Type values with prefixes: <b>k</b> kilo, <b>M</b> mega, <b>m</b> milli, <b>u</b> micro, <b>n</b> nano (capital M is mega, lowercase m is milli). For example <b>470u</b> is 470 microfarads and <b>100k</b> is 100,000 ohms.</p>' +
      '<h3>Accuracy and safety</h3><p>The formulas are the usual textbook and datasheet ones and describe ideal parts. Thermal figures, cell voltages, and tolerances vary by part, so confirm them in the datasheet. Never rely on a calculation alone when working with mains, high-voltage capacitors, or lithium batteries. Measure, and follow the safety guidance for the parts you use.</p>' +
      '<h3>License and source</h3><p>' + link(APP.license, APP.licenseName) + ': free for commercial and non-commercial use. You may modify it and add to it. Please keep the license, the NOTICE file, and the \u201cDeveloped and Maintained by TheMakersWorkbench.com\u201d footer intact.' +
      (APP.repo ? ' ' + link(APP.repo, 'View the Project on GitHub') + '.' : '') + '</p></div>';
    pane.appendChild(el('div', null, h));
  } });

  /* ---------- shell ---------- */
  var LOGO = '<svg class="dec-logo" viewBox="0 0 72 72" role="img" aria-label="Battery"><rect x="2" y="2" width="68" height="68" rx="16" fill="#0a2147" stroke="rgba(255,255,255,.28)" stroke-width="2"/>' +
    '<rect x="14" y="24" width="38" height="26" rx="4" fill="#1f2328" stroke="#9aa3ad" stroke-width="3"/><rect x="52" y="32" width="6" height="10" rx="1.5" fill="#9aa3ad"/>' +
    '<rect x="19" y="29" width="8" height="16" rx="1.5" fill="#7bd88f"/><rect x="29" y="29" width="8" height="16" rx="1.5" fill="#7bd88f"/><rect x="39" y="29" width="8" height="16" rx="1.5" fill="#f6d90b"/>' +
    '<path d="M38 12l-6 9h5l-3 8" stroke="#4aa3ff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
  show('reg');
})();
