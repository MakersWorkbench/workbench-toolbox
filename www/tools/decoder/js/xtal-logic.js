/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* TMWB Crystal / resonator / oscillator marking logic. No dependencies. Frequencies are carried in hertz. */
(function (root) {
  'use strict';

  function trim(x) { return Number(x.toPrecision(7)).toString(); }
  function fmt(hz) {
    if (hz >= 1e9) return trim(hz / 1e9) + ' GHz';
    if (hz >= 1e6) return trim(hz / 1e6) + ' MHz';
    if (hz >= 1e3) return trim(hz / 1e3) + ' kHz';
    return trim(hz) + ' Hz';
  }
  function fmtTime(s) {
    if (s >= 1) return trim(s) + ' s';
    if (s >= 1e-3) return trim(s * 1e3) + ' ms';
    if (s >= 1e-6) return trim(s * 1e6) + ' µs';
    return trim(s * 1e9) + ' ns';
  }

  /* Well-known frequencies and what they are used for */
  var COMMON = [
    [32768, '32.768 kHz watch crystal, the standard real-time-clock (RTC) crystal. 32,768 is 2^15, so a 15-stage divider gives exactly 1 Hz.'],
    [455e3, '455 kHz, the classic AM radio intermediate frequency (IF) and a common ceramic resonator.'],
    [3579545, '3.579545 MHz, the NTSC color-burst frequency. Cheap and plentiful because of old TVs.'],
    [4e6, '4 MHz, a general microcontroller clock (PIC, AVR, 8051).'],
    [8e6, '8 MHz, common on 3.3 V AVR boards such as the Arduino Pro Mini 3.3 V.'],
    [10e6, '10 MHz, a common reference and test-equipment frequency.'],
    [10.7e6, '10.7 MHz, the standard FM radio IF.'],
    [11059200, '11.0592 MHz, chosen so serial (UART) baud rates divide down with no error.'],
    [12e6, '12 MHz, used for USB full speed on many chips (via a PLL) and classic 8051 parts.'],
    [14318180, '14.31818 MHz, four times the NTSC color-burst frequency (old PC video).'],
    [16e6, '16 MHz, the Arduino Uno and Nano clock (ATmega328P).'],
    [18432e3, '18.432 MHz, another UART-friendly frequency.'],
    [20e6, '20 MHz, the top speed of many AVR parts.'],
    [24e6, '24 MHz, common for USB and STM32 boards.'],
    [25e6, '25 MHz, the standard Ethernet PHY reference crystal.'],
    [27e6, '27 MHz, used for video and some USB devices.'],
    [40e6, '40 MHz, the reference crystal on ESP32 modules.'],
    [48e6, '48 MHz, used for USB high-speed reference and some MCUs.'],
    [50e6, '50 MHz, a common Ethernet RMII clock.']
  ];
  function lookupCommon(hz) {
    for (var i = 0; i < COMMON.length; i++) if (Math.abs(hz - COMMON[i][0]) / COMMON[i][0] < 0.0005) return COMMON[i][1];
    return null;
  }

  var STD = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82, 100];
  function nearestStd(x) { return STD.reduce(function (a, b) { return Math.abs(b - x) < Math.abs(a - x) ? b : a; }); }

  /* Parse a frequency token. Returns {hz, note} or null */
  function parseFreq(tok) {
    var m, hz, note = null, code = null;
    if ((m = tok.match(/^(\d+(?:\.\d+)?)\s*(ghz|mhz|khz|hz)$/i))) {
      hz = Number(m[1]) * ({ ghz: 1e9, mhz: 1e6, khz: 1e3, hz: 1 })[m[2].toLowerCase()];
      return { hz: hz, note: null, code: null };
    }
    if ((m = tok.match(/^(\d*)([MKmk])(\d*)$/)) && (m[1] || m[3])) {          /* 16M0, 4M096, 32K768 */
      hz = Number((m[1] || '0') + '.' + (m[3] || '0')) * (m[2].toLowerCase() === 'm' ? 1e6 : 1e3);
      return { hz: hz, note: 'The letter ' + m[2] + ' marks the decimal point and the unit (' + (m[2].toLowerCase() === 'm' ? 'MHz' : 'kHz') + ').', code: null };
    }
    if ((m = tok.match(/^(\d+(?:\.\d+)?)([A-Za-z]{1,3})?$/))) {
      var v = Number(m[1]), suf = m[2] || '';
      if (suf && /^[MK]/i.test(suf) && suf.length === 1) { hz = v * (/m/i.test(suf) ? 1e6 : 1e3); return { hz: hz, note: null, code: null }; }
      if (suf && /^m/i.test(suf) && suf.length > 1) { code = suf.slice(1); hz = v * 1e6; note = 'Assumed MHz, with letters "' + code + '" as a series or tolerance code.'; return { hz: hz, note: note, code: code }; }
      if (suf) { code = suf; }
      if (v === 32.768) { hz = 32768; note = 'Read as 32.768 kHz (watch crystal).'; }
      else if (v < 100) { hz = v * 1e6; note = 'No unit printed, so read as MHz (normal for small numbers on crystals).'; }
      else if (v === 32768) { hz = 32768; note = 'Read as Hz (watch crystal).'; }
      else if (v < 1000) { hz = v * 1e3; note = 'No unit printed, so read as kHz (for example 455 kHz).'; }
      else if (v < 1e5) { hz = v * 1e3; note = 'No unit printed, so read as kHz (for example 16000 = 16 MHz).'; }
      else { hz = v; note = 'No unit printed, so read as Hz.'; }
      if (code) note = (note || '') + ' Trailing letters "' + code + '" are a series, tolerance, or temperature code that varies by manufacturer.';
      return { hz: hz, note: note, code: code };
    }
    return null;
  }

  /* Murata-style ceramic resonator part number, e.g. CSTLS16M0X53-B0 */
  function murata(pn) {
    var m = pn.toUpperCase().match(/^(CS[A-Z]{1,4})(\d+)M(\d+)([A-Z0-9]*)(?:-([A-Z0-9]+))?$/);
    if (!m) return null;
    var s = m[1], kind;
    if (/^CST(LS|LA)/.test(s)) kind = '3-terminal leaded (radial) resonator with built-in load capacitors';
    else if (/^CST(CE|CR|CC|NE|CW|CV|CS)/.test(s)) kind = '3-terminal SMD chip resonator with built-in load capacitors';
    else if (/^CST/.test(s)) kind = '3-terminal resonator with built-in load capacitors';
    else if (/^CSA/.test(s)) kind = '2-terminal resonator, needs external load capacitors';
    else kind = 'ceramic resonator family (check the datasheet)';
    var hz = Number(m[2] + '.' + m[3]) * 1e6;
    return { series: s, kind: kind, hz: hz, rest: m[4], pack: m[5] || null };
  }

  /* 10.7 MHz ceramic filter center-frequency dot colors */
  var FILTER_DOT = { black: 10.64e6, blue: 10.67e6, red: 10.70e6, orange: 10.73e6, white: 10.76e6 };

  /* Main entry: text like "16.000MHz 20pF ±30ppm" -> result */
  function decode(input) {
    var s = String(input || '').trim(), m, cl = null, ppm = null, steps = [], notes = [];
    if (!s) return { error: 'Type the marking on the part, for example 16.000, 32.768, 16M0, 8.00MG, or 16.000MHz 20pF.' };
    var mu = murata(s.replace(/\s+/g, ''));
    if (mu) {
      return { kind: 'partnumber', hz: mu.hz, cl: null, ppm: null, common: lookupCommon(mu.hz),
        steps: ['Series ' + mu.series + ': ' + mu.kind + '.', 'Frequency field: ' + mu.hz / 1e6 + ' MHz.', 'Remaining characters ' + (mu.rest || '(none)') + (mu.pack ? ' and packing ' + mu.pack : '') + ' encode tolerance, load capacitance, and packaging. Look them up in the manufacturer part-number guide.'],
        notes: ['Murata part numbers were recognized. Other makers (TDK, Kyocera, ECS, Abracon) use their own schemes.'] };
    }
    if ((m = s.match(/(\d+(?:\.\d+)?)\s*pF/i))) { cl = Number(m[1]); s = s.replace(m[0], ' '); }
    if ((m = s.match(/[±+-]?\s*(\d+(?:\.\d+)?)\s*ppm/i))) { ppm = Number(m[1]); s = s.replace(m[0], ' '); }
    s = s.replace(/[±,]/g, ' ').replace(/\b(hc-?49\/?[us]?|smd|crystal|xtal|osc|mhz?\s*$)/gi, function (t) { return /^mhz?$/i.test(t.trim()) ? t : ' '; });
    var tok = s.trim().split(/\s+/)[0];
    var tail = s.trim().split(/\s+/).slice(1).join(' ');
    if (/^\d+(\.\d+)?$/.test(tok) && /^(mhz|khz|hz)$/i.test(tail.split(/\s+/)[0] || '')) { tok += tail.split(/\s+/)[0]; tail = tail.split(/\s+/).slice(1).join(' '); }
    var f = parseFreq(tok);
    if (!f) return { error: '"' + tok + '" does not look like a frequency. Try 16.000, 32.768, 16M0, 8.00MG, or 4.096MHz.' };
    if (f.note) steps.push(f.note);
    steps.push('Frequency: ' + fmt(f.hz));
    if (cl != null) steps.push('Load capacitance printed: ' + cl + ' pF (the value the crystal was calibrated for).');
    if (ppm != null) steps.push('Stability printed: ±' + ppm + ' ppm.');
    var out = { kind: 'frequency', hz: f.hz, cl: cl, ppm: ppm, common: lookupCommon(f.hz), code: f.code, steps: steps, notes: notes };
    if (ppm != null) { out.drift = f.hz * ppm / 1e6; }
    if (cl != null) {
      var c = 2 * (cl - 4);
      out.loadCaps = { exact: c, nearest: c > 0 ? nearestStd(c) : null };
    }
    return out;
  }


  /* Ceramic filter lookup: part number or nominal frequency -> family, nominal frequency, what it is for */
  var FILTER_PREFIX = {
    SFE: 'FM radio IF filter (10.7 MHz)',
    SFU: 'AM radio IF filter (455 kHz)', CFU: 'AM radio IF filter (455 kHz)', CFW: 'AM radio IF filter (455 kHz)', CFK: 'AM radio IF filter (455 kHz)',
    SFL: 'Low-frequency ceramic filter', SFT: 'Ceramic filter (check the datasheet for the band)', SFP: 'Ceramic filter (check the datasheet for the band)'
  };
  function filterLookup(input) {
    var s = String(input || '').toUpperCase().replace(/[\s\-_]/g, ''), steps = [], notes = [], hz = null, family = null, m;
    if (!s) return { error: 'Type a part number (SFE10.7MA5, CFU455D) or a nominal frequency (10.7, 455kHz).' };
    if ((m = s.match(/^(SF[A-Z]|CF[A-Z]|TPS)([A-Z]*)(\d+(?:\.\d+)?)(M|K)?/))) {
      var pre = m[1], v = Number(m[3]);
      family = FILTER_PREFIX[pre] || (pre === 'TPS' ? 'TV sound trap or filter' : 'Ceramic filter');
      hz = v * (m[4] === 'K' ? 1e3 : m[4] === 'M' ? 1e6 : (v < 100 ? 1e6 : 1e3));
      steps.push('Prefix ' + pre + ': ' + family + '. The number ' + m[3] + ' is the nominal center frequency.');
      var rest = s.slice(m[0].length);
      if (rest) steps.push('The remaining characters (' + rest + ') give the bandwidth grade and other options. These differ by manufacturer, so look them up in the series datasheet.');
    } else {
      var f = parseFreq(s.replace(/MHZ$/, 'MHz').replace(/KHZ$/, 'kHz'));
      if (!f) return { error: '"' + input + '" is not a part number or frequency I recognize. Try SFE10.7MA5, CFU455, 10.7, or 455kHz.' };
      hz = f.hz; steps.push('Nominal center frequency ' + fmt(hz) + '.');
    }
    var out = { hz: hz, family: family, steps: steps, notes: notes, dots: null };
    if (Math.abs(hz - 10.7e6) < 1e4) {
      out.family = out.family || 'FM radio IF filter (10.7 MHz)';
      out.dots = FILTER_DOT;
      notes.push('10.7 MHz filters are graded by center frequency, shown by a colored dot, so you can pick the best match for your receiver. Pick the dot color to see the center frequency. The grades are 30 kHz apart (10.64, 10.67, 10.70, 10.73, 10.76 MHz, per Murata SFE10.7MA catalog data), and the exact tolerance per grade is listed in the maker datasheet.');
    } else if (Math.abs(hz - 455e3) < 5e3) {
      out.family = out.family || 'AM radio IF filter (455 kHz)';
      notes.push('455 kHz filters come in several bandwidth grades (wide for music, narrow for communication receivers), marked by a letter or color that differs between makers. Check the datasheet for the grade you have.');
    } else if (hz >= 4e6 && hz <= 6.6e6) {
      out.family = out.family || 'TV sound IF filter or trap range (4.5 to 6.5 MHz)';
      notes.push('Parts in this band are used for TV sound IF. Marking and grading differ by manufacturer, so rely on the datasheet.');
    } else {
      out.family = out.family || 'Ceramic filter';
      notes.push('Ceramic filters are 3-pin parts with input, ground, and output pins. The dot or letter marking is manufacturer specific, so check the datasheet for this frequency.');
    }
    notes.push('Pinout is normally input, ground (center), output. Do not confuse these with a ceramic resonator, which has similar-looking 3-pin packaging.');
    return out;
  }

  var api = { decode: decode, filterLookup: filterLookup, filterDots: FILTER_DOT, format: fmt, formatTime: fmtTime, parseFreq: parseFreq, murata: murata, common: lookupCommon };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.XtalLogic = api;
})(this);
