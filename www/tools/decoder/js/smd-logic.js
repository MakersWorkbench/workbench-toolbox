/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* TMWB SMD Resistor Decoder logic. No dependencies. */
(function (root) {
  'use strict';

  var E96 = [100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158,
    162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267,
    274, 280, 287, 294, 301, 309, 316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453,
    464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768,
    787, 806, 825, 845, 866, 887, 909, 931, 953, 976];
  var E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];
  var EIA96_MULT = { Z: 0.001, Y: 0.01, R: 0.01, X: 0.1, S: 0.1, A: 1, B: 10, H: 10, C: 100, D: 1000, E: 10000, F: 100000 };

  function trim(x) { return Number(x.toPrecision(6)).toString(); }
  function fmt(v) {
    if (v === 0) return '0 Ω';
    var u = [[1e9, 'GΩ'], [1e6, 'MΩ'], [1e3, 'kΩ']];
    for (var i = 0; i < u.length; i++) if (v >= u[i][0] * 0.9999999) return trim(v / u[i][0]) + ' ' + u[i][1];
    return trim(v) + ' Ω';
  }
  function num(s) { return Number(s); }

  function zero(code) {
    return { type: 'Zero-ohm jumper', value: 0, tolPct: null, tolerance: 'Not applicable (it is a wire link)',
      steps: [code + ' is all zeros, so this part is a jumper: essentially a tiny piece of wire in resistor packaging.'],
      notes: ['Typical rating is 1 to 2 A depending on size. Measure it to confirm, it should read under 0.05 Ω.'] };
  }

  function threeDigit(c) {
    if (/^0+$/.test(c)) return zero(c);
    var sig = num(c.slice(0, 2)), exp = num(c[2]), v = sig * Math.pow(10, exp);
    var notes = [];
    if (E24.indexOf(sig) < 0) notes.push(sig + ' is not an E24 value, so a 3-digit code is unusual here. Check whether it is really a 1% part marked with 4 digits.');
    return { type: '3-digit code', value: v, tolPct: 5, tolerance: '±5% typical (E24 series)',
      steps: ['First two digits: ' + c.slice(0, 2) + ' (significant figures)', 'Third digit: ' + exp + ' (number of zeros, or ×10^' + exp + ')',
        c.slice(0, 2) + ' × 10^' + exp + ' = ' + fmt(v)], notes: notes };
  }

  function fourDigit(c) {
    if (/^0+$/.test(c)) return zero(c);
    var sig = num(c.slice(0, 3)), exp = num(c[3]), v = sig * Math.pow(10, exp);
    return { type: '4-digit code', value: v, tolPct: 1, tolerance: '±1% typical (can be ±0.5% or ±0.1% on precision parts)',
      steps: ['First three digits: ' + c.slice(0, 3) + ' (significant figures)', 'Fourth digit: ' + exp + ' (number of zeros, or ×10^' + exp + ')',
        c.slice(0, 3) + ' × 10^' + exp + ' = ' + fmt(v)], notes: [] };
  }

  function eia96(c) {
    var idx = num(c.slice(0, 2)), L = c[2];
    if (idx < 1 || idx > 96) return null;
    var base = E96[idx - 1], m = EIA96_MULT[L], v = Number((base * m).toPrecision(10));
    return { type: 'EIA-96 code', value: v, tolPct: 1, tolerance: '±1% (EIA-96 is the 1% series)',
      steps: ['Two digits ' + c.slice(0, 2) + ' look up in the EIA-96 table: ' + base,
        'Letter ' + L + ' is the multiplier: ×' + m, base + ' × ' + m + ' = ' + fmt(v)], notes: [] };
  }

  function rNotation(c) {
    var m = c.match(/^(\d*)([RKM])(\d*)$/);
    if (!m || (!m[1] && !m[3])) return null;
    var mult = m[2] === 'K' ? 1e3 : m[2] === 'M' ? 1e6 : 1;
    var v = Number(((m[1] || '0') + '.' + (m[3] || '0')) + 'e0') * mult;
    v = Number(v.toPrecision(10));
    var sigDigits = (m[1] + m[3]).replace(/^0+/, '').length;
    var tol = (m[1] + m[3]).length >= 3 ? 'Often ±1% on 3+ digit values, but not marked' : 'Not marked by this notation';
    return { type: m[2] + ' as decimal point', value: v, tolPct: null, tolerance: tol,
      steps: ['The letter ' + m[2] + ' stands in for the decimal point' + (m[2] === 'R' ? '' : ' and the ' + (m[2] === 'K' ? 'kilo' : 'mega') + ' multiplier') + '.',
        (m[1] || '0') + '.' + (m[3] || '0') + (mult > 1 ? ' × ' + mult : '') + ' = ' + fmt(v)],
      notes: sigDigits === 0 && v === 0 ? [] : [] };
  }

  /* Returns {ok, results:[...], error} */
  function decode(input) {
    var c = String(input || '').toUpperCase().replace(/[\s\-]/g, '').replace(/Ω/g, '');
    if (!c) return { error: 'Type the code printed on the resistor, for example 472, 1002, 01C, or 4R7.' };
    if (!/^[0-9A-Z]+$/.test(c)) return { error: 'Codes use only digits and letters.' };

    var out = [], r;
    if (/^0+$/.test(c) && c.length <= 4) { out.push(zero(c)); return { results: out }; }
    if (/^0R0*$/.test(c)) { out.push(zero(c)); return { results: out }; }
    if (/^\d{3}$/.test(c)) out.push(threeDigit(c));
    else if (/^\d{4}$/.test(c)) out.push(fourDigit(c));
    else if (/^\d{2}[ZYRXSABHCDEF]$/.test(c)) {
      r = eia96(c);
      if (r) out.push(r);
      else return { error: 'EIA-96 codes run from 01 to 96. "' + c.slice(0, 2) + '" is out of range.' };
      if (c[2] === 'R') {
        var alt = rNotation(c);
        if (alt) { alt.notes.push('Ambiguous: a trailing R can also mean ohms. If the part is not a 1% EIA-96 part, trust this reading, and when unsure measure it with a multimeter.'); out.push(alt); }
      }
    } else if ((r = rNotation(c))) out.push(r);

    if (!out.length) {
      return { error: '"' + c + '" does not match a 3-digit, 4-digit, EIA-96, or R-notation code. Some manufacturers use private codes (letter plus digit, for example EIA-98 "A1"), which need the datasheet.' };
    }
    return { results: out };
  }

  var api = { decode: decode, E96: E96, EIA96_MULT: EIA96_MULT, format: fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SMDLogic = api;
})(this);
