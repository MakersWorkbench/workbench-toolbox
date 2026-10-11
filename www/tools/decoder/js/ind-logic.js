/* Copyright 2026 TheMakersWorkbench.com. Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE. */
/* TMWB Inductor code logic. No dependencies. Values are carried in microhenries (µH). */
(function (root) {
  'use strict';

  var TOLL = { F: 1, G: 2, H: 3, J: 5, K: 10, M: 20 };
  /* Axial (color band) inductor convention, value in µH */
  var BAND = {
    digit: { black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5, blue: 6, violet: 7, grey: 8, white: 9 },
    mult: { black: 1, brown: 10, red: 100, orange: 1000, yellow: 10000, gold: 0.1, silver: 0.01 },
    tol: { brown: 1, red: 2, gold: 5, silver: 10 }
  };

  function trim(x) { return Number(x.toPrecision(6)).toString(); }
  function fmt(uh) {
    if (uh >= 1e6 * 0.9999999) return trim(uh / 1e6) + ' H';
    if (uh >= 1e3 * 0.9999999) return trim(uh / 1e3) + ' mH';
    if (uh >= 1 * 0.9999999) return trim(uh) + ' µH';
    return trim(uh * 1e3) + ' nH';
  }
  function conversions(uh) {
    return { nH: trim(uh * 1e3), uH: trim(uh), mH: trim(uh / 1e3), H: trim(uh / 1e6) };
  }
  function range(uh, pct) { return pct == null ? null : { min: uh * (1 - pct / 100), max: uh * (1 + pct / 100) }; }

  function decode(input) {
    var s = String(input || '').trim().replace(/\s+/g, ''), m, uh, steps = [], notes = [], tol = null, letter = null;
    if (!s) return { error: 'Type the marking on the inductor, for example 101, 4R7, 2N2, or 100K.' };
    if ((m = s.match(/^(\d+\.?\d*|\.\d+)(nh|uh|µh|μh|mh|h)$/i))) {
      var u = m[2].toLowerCase(), mul = u === 'nh' ? 1e-3 : u === 'mh' ? 1e3 : u === 'h' ? 1e6 : 1;
      uh = Number(m[1]) * mul; steps.push('Written out in full: ' + m[1] + ' ' + m[2].replace(/h$/i, 'H') + '.');
    } else if ((m = s.match(/^(\d*)([RNUrnu])(\d*)([FGHJKMfghjkm])?$/)) && (m[1] || m[3])) {
      var c = m[2].toUpperCase(), f = Number((m[1] || '0') + '.' + (m[3] || '0'));
      uh = c === 'N' ? f / 1e3 : f;
      steps.push('The letter ' + c + ' marks the decimal point' + (c === 'N' ? ' and the unit (nanohenries).' : ' (value in microhenries).'));
      steps.push((m[1] || '0') + '.' + (m[3] || '0') + (c === 'N' ? ' nH' : ' µH'));
      if (m[4]) letter = m[4].toUpperCase();
    } else if ((m = s.match(/^(\d{2})(\d)([FGHJKMfghjkm])?$/))) {
      uh = Number(m[1]) * Math.pow(10, Number(m[2]));
      steps.push('First two digits: ' + m[1] + ' (significant figures, in µH)');
      steps.push('Third digit: ' + m[2] + ' (×10^' + m[2] + ')');
      steps.push(m[1] + ' × 10^' + m[2] + ' = ' + trim(uh) + ' µH');
      if (m[3]) letter = m[3].toUpperCase();
    } else if ((m = s.match(/^(\d{3})(\d)([FGHJKMfghjkm])?$/))) {
      uh = Number(m[1]) * Math.pow(10, Number(m[2]));
      steps.push('First three digits: ' + m[1] + ', fourth digit ×10^' + m[2] + ' = ' + trim(uh) + ' µH');
      if (m[3]) letter = m[3].toUpperCase();
    } else {
      return { error: '"' + s + '" does not match a known inductor marking. Try a 3-digit code (101), R notation (4R7), N notation (2N2), or a value like 10uH.' };
    }
    if (letter) { tol = TOLL[letter]; steps.push('Tolerance letter ' + letter + ' = ±' + tol + '%'); }
    notes.push('Inductor codes are almost always in µH. Some RF chip inductors use nH, and the N notation (like 2N2 = 2.2 nH) signals that.');
    return { uh: uh, tol: tol, range: range(uh, tol), steps: steps, notes: notes };
  }

  function decodeBands(b) {
    if (b.length !== 4) return { error: 'Expected 4 bands.' };
    var d = BAND.digit[b[0]], e = BAND.digit[b[1]], mu = BAND.mult[b[2]], t = BAND.tol[b[3]];
    if (d == null || e == null || mu == null || t == null) return { error: 'Invalid color for that band position.' };
    var uh = Number(((d * 10 + e) * mu).toPrecision(10));
    return { uh: uh, tol: t, range: range(uh, t),
      steps: ['Digits: ' + d + e, 'Multiplier: ×' + mu + ' (value in µH)', d + e + ' × ' + mu + ' = ' + trim(uh) + ' µH', 'Tolerance: ±' + t + '%'],
      notes: ['Color bands on inductors follow the resistor digit colors, but the value is in µH. A part with no tolerance band is ±20%. A wider first band or a silver first band can mark a MIL-spec part.'] };
  }

  /* SMD / RF marking dots: 1st digit, 2nd digit, multiplier. Value is in nanohenries. */
  function decodeDots(b) {
    if (b.length !== 3) return { error: 'Expected 3 dots.' };
    var d = BAND.digit[b[0]], e = BAND.digit[b[1]], m = BAND.digit[b[2]];
    var mm = m != null ? Math.pow(10, m) : (b[2] === 'gold' ? 0.1 : b[2] === 'silver' ? 0.01 : null);
    if (d == null || e == null || mm == null) return { error: 'Invalid color for that dot.' };
    var nh = Number(((d * 10 + e) * mm).toPrecision(10)), uh = nh / 1000;
    return { uh: uh, tol: null, range: null,
      steps: ['Read clockwise from the identifier dot: 1st digit ' + d + ', 2nd digit ' + e, 'Multiplier dot = ×' + trim(mm) + ' (value in nH)', d + e + ' × ' + trim(mm) + ' = ' + trim(nh) + ' nH'],
      notes: ['Dot-coded inductors are read in nanohenries. The tolerance is not encoded in the dots, so check the datasheet (RF chip inductors are commonly ±5% or ±10%).'] };
  }

  var api = { decode: decode, decodeBands: decodeBands, decodeDots: decodeDots, format: fmt, conversions: conversions, BAND: BAND };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IndLogic = api;
})(this);
