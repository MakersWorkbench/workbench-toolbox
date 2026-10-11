/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* Embedded Systems Toolkit UI. Needs calc-logic.js (TMWBCalc). Mounts into #tmwb-calc. */
(function () {
  'use strict';
  var root = document.getElementById('tmwb-emb');
  if (!root || !window.TMWBEmb) return;
  var K = window.TMWBEmb, fmt = K.fmt, OHM = 'Ω';
  var HEADING = /^h[1-6]$/i.test(root.getAttribute('data-heading') || '') ? root.getAttribute('data-heading') : 'h1';
  var APP = {
    name: 'Embedded Systems Toolkit',
    tag: 'Calculators for Arduino, ESP32, and Pico projects',
    intro: 'Six free tools for microcontroller builders: ADC conversions, a divider designer that writes the code for you, PWM, a logic-level compatibility checker, UART baud rates, and AVR timer settings. Type values with prefixes like 4.7k or 16M, and the answers update as you type.',
    site: 'https://www.themakersworkbench.com',
    repo: 'https://github.com/MakersWorkbench/embedded-toolkit',
    wiki: 'https://github.com/MakersWorkbench/embedded-toolkit/wiki',
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
    if (res.code) h += '<div class="codewrap"><button type="button" class="copybtn">Copy</button><pre class="codebox">' + esc(res.code) + '</pre></div>';
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
      var cb = out.querySelector('.copybtn');
      if (cb) cb.addEventListener('click', function () { try { navigator.clipboard.writeText(out.querySelector('.codebox').textContent); cb.textContent = 'Copied'; setTimeout(function () { cb.textContent = 'Copy'; }, 1500); } catch (e) { cb.textContent = 'Select and copy'; } });
      if (def.after) def.after(res, v);
    }
    go();
    wrap.go = go; wrap.inputs = inputs;
    return wrap;
  }

  /* ---------- the tools ---------- */
  var TABS = [];

  var BITS = [['8', '8-bit'], ['10', '10-bit'], ['12', '12-bit'], ['14', '14-bit'], ['16', '16-bit']];

  TABS.push({ id: 'adc', label: 'ADC', build: function (pane) {
    pane.appendChild(block({
      blurb: 'An <b>ADC</b> (analog-to-digital converter) turns a voltage into a whole number called a <b>count</b>. An n-bit ADC has 2<sup>n</sup> steps spread across the reference voltage. Convert either way, and see how fine the steps are. Common setups: Arduino Uno 10-bit at 5 V, ESP32 and Pico 12-bit at 3.3 V.',
      fields: [
        { id: 'mode', label: 'Convert', def: 'c2v', options: [['c2v', 'Counts to volts'], ['v2c', 'Volts to counts']] },
        { id: 'bits', label: 'ADC resolution', def: '10', options: BITS }, { id: 'vref', label: 'Reference voltage (V)', def: '5' }, { id: 'value', label: 'Value (counts or volts)', def: '512' },
        { id: 'convention', label: 'Scaling', def: 'pow', options: [['pow', 'Divide by 2^n (Arduino)'], ['max', 'Divide by 2^n \u2212 1 (full scale = top code)']] }],
      run: function (v) {
        var r = K.adc({ mode: v.mode, bits: v.bits, vref: v.vref, value: v.value, convention: v.convention }); if (r.error) return r;
        var rows = [[v.mode === 'c2v' ? 'Voltage' : 'Counts', v.mode === 'c2v' ? fmt(r.out, 'V', 4) : String(r.out), 1], ['Volts per count (1 LSB)', fmt(r.lsb, 'V', 4), 1], ['Number of levels', String(r.levels)]];
        var notes = ['Voltage = counts \u00d7 Vref \u00f7 ' + (v.convention === 'max' ? '(2<sup>n</sup> \u2212 1)' : '2<sup>n</sup>') + '. Both scalings are used in the wild; the difference is under one count. On an Arduino, analogRead() gives 0 to 1023.',
          'Real ADCs add noise and error. The ESP32\u2019s built-in ADC is noticeably non-linear, so use analogReadMilliVolts() or an external ADC (ADS1115) when accuracy matters.'];
        if (r.clipped) notes.unshift('<b>Note:</b> that voltage is above the reference, so the reading is clipped at the top count.');
        return { rows: rows, notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'adcdiv', label: 'ADC Divider + Code', build: function (pane) {
    pane.appendChild(block({
      blurb: 'Want to read a voltage higher than your ADC allows, like a 12 V battery on a 3.3 V ESP32? A voltage divider scales it down. Enter the highest voltage you will measure and your ADC reference. You get the two resistors, and code that converts the reading back to the real voltage.',
      fields: [
        { id: 'Vmax', label: 'Highest voltage to measure (V)', def: '12' }, { id: 'Vref', label: 'ADC reference voltage (V)', def: '3.3' },
        { id: 'head', label: 'Headroom below the reference (%)', def: '5' }, { id: 'bits', label: 'ADC resolution', def: '12', options: BITS },
        { id: 'series', label: 'Standard values', def: 'E24', options: SERIES_OPTS },
        { id: 'Rmin', label: 'Min R1 + R2 (' + OHM + ')', def: '10k' }, { id: 'Rmax', label: 'Max R1 + R2 (' + OHM + ')', def: '200k' },
        { id: 'lang', label: 'Code for', def: 'arduino', options: [['arduino', 'Arduino (Uno, Nano, Mega)'], ['esp32', 'ESP32 (Arduino core)'], ['micropython', 'MicroPython (Pico, ESP32)']] }],
      run: function (v) {
        var r = K.adcDivider({ Vmax: v.Vmax, Vref: v.Vref, head: v.head, series: v.series, Rmin: v.Rmin, Rmax: v.Rmax, bits: v.bits }); if (r.error) return r;
        var b = r.best;
        var rows = [['R1 (top, to the voltage)', fmt(b.R1, OHM), 1], ['R2 (bottom, to ground)', fmt(b.R2, OHM), 1], ['Voltage at the ADC pin at maximum', fmt(b.VadcMax, 'V', 4), 1], ['Scale factor (R1 + R2) \u00f7 R2', b.ratio.toFixed(4)],
          ['Smallest step at the input', fmt(b.stepAtInput, 'V', 3)], ['Divider current at maximum', fmt(b.I, 'A')], ['Resistor dissipation (R1 / R2)', fmt(b.P1, 'W') + ' / ' + fmt(b.P2, 'W')], ['Source impedance seen by the ADC', fmt(b.Zsrc, OHM)]];
        var table = { head: ['R1', 'R2', 'At ADC', 'Step at input'], rows: r.list.map(function (s) { return [fmt(s.R1, OHM), fmt(s.R2, OHM), fmt(s.VadcMax, 'V', 4), fmt(s.stepAtInput, 'V', 3)]; }) };
        var notes = ['The pair is chosen so the highest voltage lands just under the reference, never over it. A small headroom protects the pin if the supply or resistors drift.',
          'ADCs like a low source impedance. Many (the AVR in an Arduino Uno recommends about 10 k\u03a9 or less) read wrong through a big divider. A 100 nF capacitor from the pin to ground helps.'];
        if (v.lang === 'esp32') notes.push('On the original ESP32 the ADC is only accurate over roughly 0.15 to 2.45 V at 11 dB attenuation. For best accuracy, set the reference to 2.4 and design for that.');
        return { rows: rows, table: table, code: K.adcCode({ lang: v.lang, R1: b.R1, R2: b.R2, Vref: v.Vref, bits: r.bits }), notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'pwm', label: 'PWM', build: function (pane) {
    pane.appendChild(block({
      blurb: '<b>PWM</b> (pulse-width modulation) switches a pin on and off quickly. The <b>duty cycle</b> is the percentage of each cycle spent on. Averaged out (by a filter, an LED\u2019s brightness, a motor\u2019s inertia), it acts like a lower voltage.',
      fields: [{ id: 'f', label: 'Frequency (Hz)', def: '1k' }, { id: 'duty', label: 'Duty cycle (%)', def: '25' }, { id: 'Vs', label: 'High-level voltage (V, optional)', def: '5' }],
      run: function (v) {
        var r = K.pwm(v); if (r.error) return r;
        var rows = [['Period', fmt(r.T, 's'), 1], ['On time', fmt(r.ton, 's')], ['Off time', fmt(r.toff, 's')]];
        if (r.avg !== undefined) rows.push(['Average voltage', fmt(r.avg, 'V'), 1]);
        rows.push(['Starting point for an RC smoothing filter cutoff', fmt(r.fcFilter, 'Hz')]);
        return { rows: rows, notes: ['Average voltage = high level \u00d7 duty. A simple RC filter with its cutoff about a tenth of the PWM frequency cuts the PWM ripple by roughly 20 dB (see the Embedded Systems Toolkit RC tab to pick R and C). Lower cutoff gives a smoother output but reacts more slowly.',
          'On an Arduino Uno, analogWrite() runs about 490 Hz (pins 5 and 6 about 980 Hz), and duty is set as 0 to 255. ESP32 PWM (LEDC) lets you choose frequency and resolution.'] };
      }
    }));
  } });

  TABS.push({ id: 'logic', label: 'Logic Levels', build: function (pane) {
    var opts = Object.keys(K.LOGIC).map(function (k) { return [k, K.LOGIC[k].name]; }).concat([['custom', 'Custom values']]);
    pane.appendChild(block({
      blurb: 'Can two chips talk directly? A <b>1</b> from the driver must be high enough for the receiver to read as a 1, and a <b>0</b> low enough to read as a 0. Also, the driver must never push the receiver\u2019s pin above what it tolerates. Choose the driver (A) and receiver (B), or enter your own values.',
      fields: [
        { id: 'a', label: 'Driver A (sends the signal)', def: 'avr5', options: opts }, { id: 'b', label: 'Receiver B (reads the signal)', def: 'esp32', options: opts },
        { id: 'aVOH', label: 'Custom A: output high min, VOH (V)', def: '' }, { id: 'aVOL', label: 'Custom A: output low max, VOL (V)', def: '' }, { id: 'aS', label: 'Custom A: supply voltage (V)', def: '' },
        { id: 'bVIH', label: 'Custom B: input high min, VIH (V)', def: '' }, { id: 'bVIL', label: 'Custom B: input low max, VIL (V)', def: '' }, { id: 'bAbs', label: 'Custom B: max input voltage (V)', def: '' }],
      run: function (v) {
        var A = v.a === 'custom' ? { id: 'custom', VOH: v.aVOH, VOL: v.aVOL, supply: v.aS } : { id: v.a };
        var B = v.b === 'custom' ? { id: 'custom', VIH: v.bVIH, VIL: v.bVIL, abs: v.bAbs } : { id: v.b };
        var r = K.logicLevels(A, B); if (r.error) return r;
        var label = { ok: 'Compatible', marginal: 'Marginal', shifter: 'Level shifting needed', danger: 'Do not connect directly' }[r.verdict];
        var rows = [['Verdict', '<span class="verdict v-' + r.verdict + '">' + label + '</span>', 1], ['High level margin (VOH \u2212 VIH)', fmt(r.highMargin, 'V')], ['Low level margin (VIL \u2212 VOL)', fmt(r.lowMargin, 'V')],
          ['Driver can reach / receiver tolerates', fmt(r.A.supply, 'V') + ' / ' + fmt(r.B.abs, 'V')]];
        var notes = r.advice.slice();
        notes.push('Values are typical datasheet figures at the stated supply and light load, so confirm them in the datasheet for your exact chip. A margin of at least a few tenths of a volt keeps noise from causing errors.');
        return { rows: rows, notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'uart', label: 'UART Baud', build: function (pane) {
    pane.appendChild(block({
      blurb: 'A <b>UART</b> (serial port) makes its baud rate by dividing the chip\u2019s clock. The divider must be a whole number, so the real baud rate is a little off. If it is off by too much, the two ends disagree and you see garbage. This is the AVR (ATmega) calculation.',
      fields: [{ id: 'fclk', label: 'Clock frequency (Hz)', def: '16M' }, { id: 'baud', label: 'Baud rate you want', def: '115200' },
        { id: 'mode', label: 'Mode', def: 'x16', options: [['x16', 'Normal (16 clocks per bit)'], ['x8', 'Double speed, U2X (8 clocks per bit)']] }],
      run: function (v) {
        var r = K.uart(v); if (r.error) return r;
        var bad = Math.abs(r.errPct) > 2, rows = [['UBRR register value', String(r.ubrr), 1], ['Actual baud rate', fmt(r.actual, '', 5).trim().replace(/\s/g, ''), 1], ['Error', (r.errPct >= 0 ? '+' : '\u2212') + Math.abs(r.errPct).toFixed(2) + ' %', 1]];
        var notes = ['UBRR = clock \u00f7 (' + (v.mode === 'x8' ? '8' : '16') + ' \u00d7 baud) \u2212 1, rounded. Keep the error under about 2 % (under 0.5 % is comfortable), and remember the other device has its own error too.'];
        if (bad) notes.unshift('<b>The error is high.</b> Try the other mode, a different baud rate, or a clock chosen for serial (such as 14.7456 MHz, which makes standard baud rates exact).');
        if (r.tooBig) notes.unshift('<b>The divider value does not fit</b> in the 12-bit UBRR register.');
        return { rows: rows, notes: notes };
      }
    }));
  } });

  TABS.push({ id: 'timer', label: 'AVR Timer', build: function (pane) {
    pane.appendChild(block({
      blurb: 'AVR timers count clock ticks, slowed by a <b>prescaler</b>. In CTC mode the timer counts up to a value you set (OCR) and fires an interrupt or toggles a pin, repeating at <b>f = clock \u00f7 (prescaler \u00d7 (OCR + 1))</b>. This lists every prescaler that works for the frequency you want.',
      fields: [{ id: 'fclk', label: 'Clock frequency (Hz)', def: '16M' }, { id: 'f', label: 'Interrupt frequency you want (Hz)', def: '1k' },
        { id: 'timer', label: 'Timer', def: 't1', options: Object.keys(K.AVR_TIMERS).map(function (k) { return [k, K.AVR_TIMERS[k].name]; }) }],
      run: function (v) {
        var r = K.timerAvr(v); if (r.error) return r;
        return { table: { head: ['Prescaler', 'OCR value', 'Actual frequency', 'Error'], rows: r.list.map(function (x) { return [String(x.prescaler), String(x.ocr), fmt(x.actual, 'Hz', 5), (x.errPct >= 0 ? '+' : '\u2212') + Math.abs(x.errPct).toFixed(3) + ' %']; }) },
          notes: ['The first row is the closest match, and among equals the one with the larger OCR (finer control). A pin toggled on each match makes a square wave at <b>half</b> this frequency. For an interrupt, set the prescaler bits in TCCRnB, load OCRnA, and enable the compare-match interrupt.',
            'This is for the ATmega328P family timers (Uno, Nano). Other chips have different timers and registers.'] };
      }
    }));
  } });

  TABS.push({ id: 'about', label: 'About', build: function (pane) {
    var h = '<div class="about"><h3>What this is</h3><p>A set of free tools for the math and settings that come up when building with Arduino, ESP32, and Raspberry Pi Pico boards, with the formula shown beside each answer.</p>' +
      '<h3>How to use it</h3><p>Pick a tool. Type values with prefixes: <b>k</b> kilo, <b>M</b> mega, <b>m</b> milli, <b>u</b> micro, <b>n</b> nano (capital M is mega, lowercase m is milli). For example <b>16M</b> is 16 megahertz and <b>4.7k</b> is 4,700 ohms.</p>' +
      '<h3>Accuracy and limits</h3><p>Formulas are the usual datasheet and textbook ones. The logic-level figures are typical datasheet values, and chip behavior differs between manufacturers and parts. The timer and UART tools follow the ATmega328P. Always confirm anything that matters in the datasheet for your exact part.</p>' +
      '<h3>License and source</h3><p>' + link(APP.license, APP.licenseName) + ': free for commercial and non-commercial use. You may modify it and add to it. Please keep the license, the NOTICE file, and the \u201cDeveloped and Maintained by TheMakersWorkbench.com\u201d footer intact.' +
      (APP.repo ? ' ' + link(APP.repo, 'View the Project on GitHub') + '.' : '') + '</p></div>';
    pane.appendChild(el('div', null, h));
  } });

  /* ---------- shell ---------- */
  var LOGO = '<svg class="dec-logo" viewBox="0 0 72 72" role="img" aria-label="Microcontroller chip"><rect x="2" y="2" width="68" height="68" rx="16" fill="#0a2147" stroke="rgba(255,255,255,.28)" stroke-width="2"/>' +
    '<g stroke="#9aa3ad" stroke-width="3" stroke-linecap="round"><path d="M26 14v8M36 14v8M46 14v8M26 50v8M36 50v8M46 50v8M14 26h8M14 36h8M14 46h8M50 26h8M50 36h8M50 46h8"/></g>' +
    '<rect x="22" y="22" width="28" height="28" rx="4" fill="#1f2328" stroke="#4aa3ff" stroke-width="2"/><circle cx="28" cy="28" r="2.2" fill="#4aa3ff"/><path d="M30 38h4l2-5 3 10 2-5h3" stroke="#7bd88f" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
  show('adc');
})();
